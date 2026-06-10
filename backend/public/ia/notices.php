<?php

require_once __DIR__ . '/../bootstrap.php';

use FlowSync\Utils\InstitutionAdminMiddleware;
use FlowSync\Config\Database;

// Verify user is Institution Admin
$session = InstitutionAdminMiddleware::check();
$collegeId = (int)$session['college_id'];
$seasonId = $currentSeasonId;

$db = Database::getInstance()->getConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            // Fetch push notices for this college
            $stmt = $db->prepare("
                SELECT p.*, d.name as department_name, u.name as sender_name
                FROM push_notices p
                LEFT JOIN departments d ON p.department_id = d.id
                JOIN users u ON p.hod_id = u.id
                WHERE u.college_id = :cid
                ORDER BY p.created_at DESC
            ");
            $stmt->execute(['cid' => $collegeId]);
            $notices = $stmt->fetchAll();

            // Fetch departments for dropdown
            $stmtD = $db->prepare("SELECT id, name FROM departments WHERE college_id = :cid");
            $stmtD->execute(['cid' => $collegeId]);
            $departments = $stmtD->fetchAll();

            echo json_encode([
                'status' => 'success',
                'data' => [
                    'notices' => $notices,
                    'departments' => $departments
                ]
            ]);
            break;

        case 'POST':
            $isMultipart = strpos($_SERVER['CONTENT_TYPE'] ?? '', 'multipart/form-data') !== false;
            $data = $isMultipart ? $_POST : json_decode(file_get_contents('php://input'), true);

            $title = $data['title'] ?? '';
            $message = $data['message'] ?? '';
            $points = (int)($data['points'] ?? 0);
            $targetType = $data['target_type'] ?? 'ALL'; // ALL, DEPARTMENT, ROLE_HOD, ROLE_FACULTY
            $deptId = !empty($data['department_id']) ? (int)$data['department_id'] : null;

            if (empty($title) || empty($message)) {
                throw new Exception("Title and details are required.");
            }

            if ($points < 0 || $points > 5) {
                throw new Exception("Points must be between 0 and 5.");
            }

            // File Upload
            $attachmentUrl = null;
            if (isset($_FILES['attachment']) && $_FILES['attachment']['error'] === UPLOAD_ERR_OK) {
                $file = $_FILES['attachment'];
                if ($file['size'] > 35 * 1024 * 1024) {
                    throw new Exception("Attachment exceeds maximum allowed size of 35 MB.");
                }
                $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
                $fileName = uniqid('push_') . '.' . $ext;
                $uploadDir = __DIR__ . '/../../storage/push_notices/';
                if (!is_dir($uploadDir)) {
                    mkdir($uploadDir, 0775, true);
                }
                if (move_uploaded_file($file['tmp_name'], $uploadDir . $fileName)) {
                    $attachmentUrl = '/download.php?file=push_notices/' . $fileName;
                }
            }

            // Resolve target users in this college
            $targetUserIds = [];
            if ($targetType === 'ALL') {
                $stmt = $db->prepare("SELECT id FROM users WHERE college_id = :cid AND role_id IN (2, 3) AND is_active = 1");
                $stmt->execute(['cid' => $collegeId]);
                $targetUserIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
            } elseif ($targetType === 'ROLE_HOD') {
                $stmt = $db->prepare("SELECT id FROM users WHERE college_id = :cid AND role_id = 2 AND is_active = 1");
                $stmt->execute(['cid' => $collegeId]);
                $targetUserIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
            } elseif ($targetType === 'ROLE_FACULTY') {
                $stmt = $db->prepare("SELECT id FROM users WHERE college_id = :cid AND role_id = 3 AND is_active = 1");
                $stmt->execute(['cid' => $collegeId]);
                $targetUserIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
            } elseif ($targetType === 'DEPARTMENT' && $deptId) {
                // HOD and Faculty belonging to selected department
                $stmt = $db->prepare("
                    SELECT u.id FROM users u
                    LEFT JOIN faculty_departments fd ON u.id = fd.user_id
                    LEFT JOIN departments d ON u.id = d.hod_id
                    WHERE u.college_id = :cid AND u.is_active = 1 
                    AND (fd.department_id = :did OR d.id = :did)
                ");
                $stmt->execute(['cid' => $collegeId, 'did' => $deptId]);
                $targetUserIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
            }

            if (empty($targetUserIds)) {
                throw new Exception("No matching active users found to receive this notice.");
            }

            $db->beginTransaction();

            // Default department fallback if null (push_notices table dept is NOT NULL)
            if (!$deptId) {
                $stmtD = $db->prepare("SELECT id FROM departments WHERE college_id = :cid LIMIT 1");
                $stmtD->execute(['cid' => $collegeId]);
                $deptId = (int)$stmtD->fetchColumn();
            }

            // Insert Push Notice record
            $stmtInsert = $db->prepare("
                INSERT INTO push_notices (hod_id, department_id, title, message, points, attachment_url, target_type)
                VALUES (:hod_id, :dept_id, :title, :message, :points, :attachment_url, :target_type)
            ");
            $stmtInsert->execute([
                'hod_id' => $session['user_id'],
                'dept_id' => $deptId,
                'title' => $title,
                'message' => $message,
                'points' => $points,
                'attachment_url' => $attachmentUrl,
                'target_type' => $targetType
            ]);
            $pushNoticeId = $db->lastInsertId();

            // Insert into notifications
            $stmtNotif = $db->prepare("
                INSERT INTO notifications (user_id, type, title, message, points, trigger_user_id, is_read, is_actioned, push_notice_id, attachment_url)
                VALUES (:user_id, 'HOD_PUSH', :title, :message, :points, :trigger_user_id, 0, 0, :push_notice_id, :attachment_url)
            ");

            foreach ($targetUserIds as $uid) {
                $stmtNotif->execute([
                    'user_id' => $uid,
                    'title' => $title,
                    'message' => $message,
                    'points' => $points,
                    'trigger_user_id' => $session['user_id'],
                    'push_notice_id' => $pushNoticeId,
                    'attachment_url' => $attachmentUrl
                ]);
            }

            $db->commit();

            // Audit Log
            $logger = new \FlowSync\Utils\AuditLogger();
            $logger->log($session['user_id'], 'IA_PUSH_NOTIFICATION', 'SYSTEM', null, ['title' => $title, 'recipients' => count($targetUserIds)]);

            echo json_encode([
                'status' => 'success',
                'message' => 'Announcement successfully broadcasted to ' . count($targetUserIds) . ' users.'
            ]);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) throw new Exception("Announcement ID is required.");
            $noticeId = (int)$id;

            // Security check
            $stmtVerify = $db->prepare("
                SELECT p.id FROM push_notices p 
                JOIN users u ON p.hod_id = u.id 
                WHERE p.id = :id AND u.college_id = :cid LIMIT 1
            ");
            $stmtVerify->execute(['id' => $noticeId, 'cid' => $collegeId]);
            if (!$stmtVerify->fetchColumn()) {
                throw new Exception("Access Denied: Cannot delete this announcement.");
            }

            $stmt = $db->prepare("DELETE FROM push_notices WHERE id = :id");
            $stmt->execute(['id' => $noticeId]);

            echo json_encode(['status' => 'success', 'message' => 'Announcement deleted successfully']);
            break;

        default:
            http_response_code(405);
            echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    }
} catch (\PDOException $e) {
    if (isset($db) && $db->inTransaction()) $db->rollBack();
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
} catch (\Exception $e) {
    if (isset($db) && $db->inTransaction()) $db->rollBack();
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
