<?php

require_once __DIR__ . '/../bootstrap.php';

use FlowSync\Utils\HODMiddleware;
use FlowSync\Config\Database;
use FlowSync\Utils\AuditLogger;

$session = HODMiddleware::check();
$db = Database::getInstance()->getConnection();
$logger = new AuditLogger();

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        throw new Exception("Method not allowed");
    }

    $stmt = $db->prepare("SELECT id FROM departments WHERE hod_id = :hod_id LIMIT 1");
    $stmt->execute(['hod_id' => $session['user_id']]);
    $dept = $stmt->fetch();
    if (!$dept) {
        http_response_code(403);
        throw new Exception("Unauthorized. No department assigned.");
    }
    $departmentId = $dept['id'];

    // Handle multipart/form-data
    $title = $_POST['title'] ?? '';
    $message = $_POST['message'] ?? '';
    $points = (int)($_POST['points'] ?? 0);
    $targetType = $_POST['targetType'] ?? 'ALL';
    $selectedFaculties = isset($_POST['selectedFaculties']) ? json_decode($_POST['selectedFaculties'], true) : [];

    if (empty($title) || empty($message)) {
        throw new Exception("Title and details are required.");
    }

    if ($points < 0 || $points > 5) {
        throw new Exception("Points must be between 0 and 5.");
    }

    // Handle file upload
    $attachmentUrl = null;
    if (isset($_FILES['attachment']) && $_FILES['attachment']['error'] === UPLOAD_ERR_OK) {
        $uploadDir = __DIR__ . '/../uploads/push_notices/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        $fileExtension = pathinfo($_FILES['attachment']['name'], PATHINFO_EXTENSION);
        $fileName = uniqid('push_') . '.' . $fileExtension;
        
        if (move_uploaded_file($_FILES['attachment']['tmp_name'], $uploadDir . $fileName)) {
            $attachmentUrl = '/uploads/push_notices/' . $fileName;
        } else {
            throw new Exception("Failed to upload attachment.");
        }
    }

    $targetFacultyIds = [];

    if ($targetType === 'ALL') {
        $stmt = $db->prepare("
            SELECT u.id 
            FROM users u
            JOIN faculty_departments fd ON u.id = fd.user_id
            WHERE u.role_id = 3 AND fd.department_id = :dept_id
        ");
        $stmt->execute(['dept_id' => $departmentId]);
        $targetFacultyIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
    } else {
        if (empty($selectedFaculties)) {
            throw new Exception("Please select at least one faculty member.");
        }
        $inQuery = implode(',', array_fill(0, count($selectedFaculties), '?'));
        $stmt = $db->prepare("
            SELECT u.id 
            FROM users u
            JOIN faculty_departments fd ON u.id = fd.user_id
            WHERE u.role_id = 3 AND fd.department_id = ? AND u.id IN ($inQuery)
        ");
        $params = array_merge([$departmentId], $selectedFaculties);
        $stmt->execute($params);
        $targetFacultyIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
    }

    if (empty($targetFacultyIds)) {
        throw new Exception("No eligible faculties found to receive the notification.");
    }

    $db->beginTransaction();

    // Insert into push_notices table
    $insertPushStmt = $db->prepare("
        INSERT INTO push_notices (hod_id, department_id, title, message, points, attachment_url, target_type)
        VALUES (:hod_id, :department_id, :title, :message, :points, :attachment_url, :target_type)
    ");
    $insertPushStmt->execute([
        'hod_id' => $session['user_id'],
        'department_id' => $departmentId,
        'title' => $title,
        'message' => $message,
        'points' => $points,
        'attachment_url' => $attachmentUrl,
        'target_type' => $targetType
    ]);
    
    $pushNoticeId = $db->lastInsertId();

    $insertStmt = $db->prepare("
        INSERT INTO notifications (user_id, type, title, message, points, trigger_user_id, is_read, is_actioned, push_notice_id, attachment_url)
        VALUES (:user_id, 'HOD_PUSH', :title, :message, :points, :trigger_user_id, 0, 0, :push_notice_id, :attachment_url)
    ");

    foreach ($targetFacultyIds as $facultyId) {
        $insertStmt->execute([
            'user_id' => $facultyId,
            'title' => $title,
            'message' => $message,
            'points' => $points,
            'trigger_user_id' => $session['user_id'],
            'push_notice_id' => $pushNoticeId,
            'attachment_url' => $attachmentUrl
        ]);
    }

    $db->commit();

    $logger->log($session['user_id'], 'HOD_PUSH_NOTIFICATION', 'SYSTEM', null, [
        'title' => $title,
        'points' => $points,
        'recipients_count' => count($targetFacultyIds),
        'push_notice_id' => $pushNoticeId
    ]);

    echo json_encode([
        'status' => 'success',
        'message' => 'Push notification sent to ' . count($targetFacultyIds) . ' faculties.'
    ]);

} catch (Throwable $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}

