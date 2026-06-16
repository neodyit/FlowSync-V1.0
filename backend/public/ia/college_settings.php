<?php

require_once __DIR__ . '/../bootstrap.php';

use FlowSync\Utils\InstitutionAdminMiddleware;
use FlowSync\Config\Database;

// Verify user is Institution Admin
$session = InstitutionAdminMiddleware::check();
$collegeId = (int)$session['college_id'];

$db = Database::getInstance()->getConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            // 1. Fetch college details
            $stmt = $db->prepare("SELECT id, name, short_name, address, is_enabled, auto_accept_tasks, allow_task_decline FROM colleges WHERE id = :id");
            $stmt->execute(['id' => $collegeId]);
            $college = $stmt->fetch();

            if (!$college) {
                throw new Exception("College not found");
            }

            // 2. Fetch departments
            $stmt = $db->prepare("SELECT id, name, is_enabled FROM departments WHERE college_id = :id ORDER BY name ASC");
            $stmt->execute(['id' => $collegeId]);
            $departments = $stmt->fetchAll();

            // 3. Fetch college features settings
            $stmt = $db->prepare("SELECT feature_key, is_enabled FROM college_features WHERE college_id = :id");
            $stmt->execute(['id' => $collegeId]);
            $features = $stmt->fetchAll();

            // 4. Fetch subscription features list
            $allowedFeatures = null;
            $subService = new \FlowSync\Utils\SubscriptionService();
            $subStatus = $subService->getSubscriptionStatus($collegeId);
            if ($subStatus && in_array($subStatus['status'], ['active', 'trial']) && !empty($subStatus['plan_id'])) {
                $plan = $subService->getPlanById($subStatus['plan_id']);
                if ($plan && isset($plan['features'])) {
                    $allowedFeatures = $plan['features'];
                }
            }

            echo json_encode([
                'status' => 'success',
                'college' => $college,
                'departments' => $departments,
                'features' => $features,
                'allowed_features' => $allowedFeatures
            ]);
            break;

        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);

            $db->beginTransaction();

            // 1. Update college configs (Auto accept tasks, Allow decline)
            if (isset($data['auto_accept_tasks']) || isset($data['allow_task_decline'])) {
                $checkStmt = $db->prepare("SELECT auto_accept_tasks, allow_task_decline FROM colleges WHERE id = :id");
                $checkStmt->execute(['id' => $collegeId]);
                $currentCollege = $checkStmt->fetch(PDO::FETCH_ASSOC);

                if ($currentCollege) {
                    $autoAccept = isset($data['auto_accept_tasks']) ? ($data['auto_accept_tasks'] ? 1 : 0) : (int)$currentCollege['auto_accept_tasks'];
                    $allowDecline = isset($data['allow_task_decline']) ? ($data['allow_task_decline'] ? 1 : 0) : (int)$currentCollege['allow_task_decline'];

                    $stmt = $db->prepare("
                        UPDATE colleges 
                        SET auto_accept_tasks = :auto_accept_tasks, allow_task_decline = :allow_task_decline
                        WHERE id = :id
                    ");
                    $stmt->execute([
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

            // Audit Log
            $logger = new \FlowSync\Utils\AuditLogger();
            $logger->log($session['user_id'], 'IA_UPDATE_COLLEGE_SETTINGS', 'COLLEGE', $collegeId, ['updated_features' => array_keys($data['features'] ?? [])]);

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
