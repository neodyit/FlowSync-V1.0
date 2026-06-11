<?php

require_once __DIR__ . '/../bootstrap.php';

use FlowSync\Utils\AdminMiddleware;
use FlowSync\Config\Database;

$session = AdminMiddleware::check();

$db = Database::getInstance()->getConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            $stmt = $db->query("SELECT setting_key, setting_value FROM system_settings");
            $settings = [];
            while ($row = $stmt->fetch()) {
                $settings[$row['setting_key']] = $row['setting_value'];
            }
            echo json_encode(['status' => 'success', 'data' => $settings]);
            break;

        case 'PUT':
            $data = json_decode(file_get_contents('php://input'), true);
            if (!is_array($data)) {
                throw new Exception("Invalid data format");
            }
            
            $db->beginTransaction();
            $stmt = $db->prepare("
                INSERT INTO system_settings (setting_key, setting_value, updated_by, updated_at)
                VALUES (:key, :val, :uid, CURRENT_TIMESTAMP)
                ON DUPLICATE KEY UPDATE 
                    setting_value = :val, 
                    updated_by = :uid, 
                    updated_at = CURRENT_TIMESTAMP
            ");
            
            foreach ($data as $key => $val) {
                $stmt->execute([
                    'key' => $key,
                    'val' => (string)$val,
                    'uid' => $session['user_id'] ?? null
                ]);
            }
            
            $db->commit();
            
            $logger = new \FlowSync\Utils\AuditLogger();
            $logger->log($session['user_id'] ?? null, 'UPDATE_SETTINGS', 'SYSTEM_SETTINGS', null, $data);

            echo json_encode(['status' => 'success', 'message' => 'Settings updated successfully']);
            break;

        default:
            http_response_code(405);
            echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    }
} catch (\Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
