<?php

require_once __DIR__ . '/../bootstrap.php';

use FlowSync\Utils\AdminMiddleware;
use FlowSync\Config\Database;

AdminMiddleware::check();

$db = Database::getInstance()->getConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            $collegeId = $_GET['college_id'] ?? null;
            if (!$collegeId) {
                throw new Exception("College ID is required");
            }

            // 1. Fetch college details
            $stmt = $db->prepare("SELECT id, name, short_name, address, is_enabled, auto_accept_tasks, allow_task_decline FROM colleges WHERE id = :id");
            $stmt->execute(['id' => $collegeId]);
            $college = $stmt->fetch();

            if (!$college) {
                throw new Exception("College not found");
            }

            // 2. Fetch departments
            $stmt = $db->prepare("
                SELECT d.id, d.name, d.is_enabled, d.hod_id, u.name as hod_name
                FROM departments d
                LEFT JOIN users u ON d.hod_id = u.id
                WHERE d.college_id = :id
                ORDER BY d.name ASC
            ");
            $stmt->execute(['id' => $collegeId]);
            $departments = $stmt->fetchAll();

            // 3. Fetch college features settings
            $stmt = $db->prepare("SELECT feature_key, is_enabled FROM college_features WHERE college_id = :id");
            $stmt->execute(['id' => $collegeId]);
            $features = $stmt->fetchAll();

            echo json_encode([
                'status' => 'success',
                'college' => $college,
                'departments' => $departments,
                'features' => $features
            ]);
            break;

        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            $action = $data['action'] ?? 'save_settings';

            if ($action === 'broadcast_notice') {
                $collegeId = $data['college_id'] ?? null;
                $target = $data['target'] ?? 'both'; // 'hod', 'faculty', 'both'
                $title = $data['title'] ?? 'Notice';
                $message = $data['message'] ?? '';

                if (!$collegeId || empty($message)) {
                    throw new Exception("College ID and Message are required for broadcast");
                }

                // Get matching users in the college
                $roleFilter = "";
                $params = ['college_id' => $collegeId];
                if ($target === 'hod') {
                    $roleFilter = "AND role_id = 2";
                } elseif ($target === 'faculty') {
                    $roleFilter = "AND role_id = 3";
                } else {
                    $roleFilter = "AND role_id IN (2, 3)";
                }

                $stmt = $db->prepare("SELECT id FROM users WHERE college_id = :college_id $roleFilter");
                $stmt->execute($params);
                $users = $stmt->fetchAll(PDO::FETCH_COLUMN);

                if (count($users) > 0) {
                    $db->beginTransaction();
                    $insertStmt = $db->prepare("
                        INSERT INTO notifications (user_id, type, title, message, is_read, is_actioned)
                        VALUES (:user_id, 'POPUP', :title, :message, 0, 0)
                    ");
                    foreach ($users as $uid) {
                        $insertStmt->execute([
                            'user_id' => $uid,
                            'title' => $title,
                            'message' => $message
                        ]);
                    }
                    $db->commit();
                }

                echo json_encode(['status' => 'success', 'message' => 'Popup notification broadcasted to ' . count($users) . ' users']);
                break;
            }

            // Default Action: save settings
            $collegeId = $data['college_id'] ?? null;
            if (!$collegeId) {
                throw new Exception("College ID is required");
            }

            $db->beginTransaction();

            // 1. Update college toggles
            if (isset($data['is_enabled']) || isset($data['auto_accept_tasks']) || isset($data['allow_task_decline'])) {
                $checkStmt = $db->prepare("SELECT is_enabled, auto_accept_tasks, allow_task_decline FROM colleges WHERE id = :id");
                $checkStmt->execute(['id' => $collegeId]);
                $currentCollege = $checkStmt->fetch(PDO::FETCH_ASSOC);

                if ($currentCollege) {
                    $isEnabled = isset($data['is_enabled']) ? ($data['is_enabled'] ? 1 : 0) : (int)$currentCollege['is_enabled'];
                    $autoAccept = isset($data['auto_accept_tasks']) ? ($data['auto_accept_tasks'] ? 1 : 0) : (int)$currentCollege['auto_accept_tasks'];
                    $allowDecline = isset($data['allow_task_decline']) ? ($data['allow_task_decline'] ? 1 : 0) : (int)$currentCollege['allow_task_decline'];

                    $stmt = $db->prepare("
                        UPDATE colleges 
                        SET is_enabled = :is_enabled, auto_accept_tasks = :auto_accept_tasks, allow_task_decline = :allow_task_decline
                        WHERE id = :id
                    ");
                    $stmt->execute([
                        'is_enabled' => $isEnabled,
                        'auto_accept_tasks' => $autoAccept,
                        'allow_task_decline' => $allowDecline,
                        'id' => $collegeId
                    ]);
                }
            }

            // 2. Update department toggles
            if (isset($data['departments_status']) && is_array($data['departments_status'])) {
                $stmt = $db->prepare("UPDATE departments SET is_enabled = :is_enabled WHERE id = :id AND college_id = :college_id");
                foreach ($data['departments_status'] as $deptId => $isEnabled) {
                    $stmt->execute([
                        'is_enabled' => $isEnabled ? 1 : 0,
                        'id' => $deptId,
                        'college_id' => $collegeId
                    ]);
                }
            }

            // 3. Update feature toggles
            if (isset($data['features']) && is_array($data['features'])) {
                $stmt = $db->prepare("
                    INSERT INTO college_features (college_id, feature_key, is_enabled) 
                    VALUES (:college_id, :feature_key, :is_enabled)
                    ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled)
                ");
                foreach ($data['features'] as $key => $isEnabled) {
                    $stmt->execute([
                        'college_id' => $collegeId,
                        'feature_key' => $key,
                        'is_enabled' => $isEnabled ? 1 : 0
                    ]);
                }
            }

            $db->commit();

            echo json_encode(['status' => 'success', 'message' => 'Settings saved successfully']);
            break;

        default:
            http_response_code(405);
            echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    }
} catch (\Exception $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
