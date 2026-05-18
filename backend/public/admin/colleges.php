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
            $stmt = $db->query("SELECT * FROM colleges ORDER BY name ASC");
            echo json_encode(['status' => 'success', 'data' => $stmt->fetchAll()]);
            break;

        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            if (empty($data['name'])) {
                throw new Exception("College name is required");
            }
            $stmt = $db->prepare("
                INSERT INTO colleges (name, short_name, address) 
                VALUES (:name, :short_name, :address)
            ");
            $stmt->execute([
                'name' => $data['name'],
                'short_name' => $data['short_name'] ?? null,
                'address' => $data['address'] ?? null
            ]);
            $collegeId = $db->lastInsertId();
            
            $logger = new \FlowSync\Utils\AuditLogger();
            $logger->log($session['user_id'] ?? null, 'CREATE_COLLEGE', 'COLLEGE', $collegeId, ['name' => $data['name']]);

            echo json_encode(['status' => 'success', 'message' => 'College created', 'id' => $collegeId]);
            break;

        case 'PUT':
            $data = json_decode(file_get_contents('php://input'), true);
            if (empty($data['id']) || empty($data['name'])) {
                throw new Exception("ID and name are required");
            }
            $stmt = $db->prepare("
                UPDATE colleges 
                SET name = :name, short_name = :short_name, address = :address, updated_at = CURRENT_TIMESTAMP
                WHERE id = :id
            ");
            $stmt->execute([
                'id' => $data['id'],
                'name' => $data['name'],
                'short_name' => $data['short_name'] ?? null,
                'address' => $data['address'] ?? null
            ]);

            $logger = new \FlowSync\Utils\AuditLogger();
            $logger->log($session['user_id'] ?? null, 'UPDATE_COLLEGE', 'COLLEGE', $data['id'], ['name' => $data['name']]);

            echo json_encode(['status' => 'success', 'message' => 'College updated']);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) {
                throw new Exception("College ID is required");
            }
            // Check for dependent departments
            $check = $db->prepare("SELECT COUNT(*) FROM departments WHERE college_id = :id");
            $check->execute(['id' => $id]);
            if ($check->fetchColumn() > 0) {
                throw new Exception("Cannot delete college with existing departments");
            }

            $stmt = $db->prepare("DELETE FROM colleges WHERE id = :id");
            $stmt->execute(['id' => $id]);

            $logger = new \FlowSync\Utils\AuditLogger();
            $logger->log($session['user_id'] ?? null, 'DELETE_COLLEGE', 'COLLEGE', $id);

            echo json_encode(['status' => 'success', 'message' => 'College deleted']);
            break;

        default:
            http_response_code(405);
            echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    }
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
