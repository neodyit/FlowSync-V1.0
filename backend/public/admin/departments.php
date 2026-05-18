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
            $college_id = $_GET['college_id'] ?? null;
            $sql = "
                SELECT d.*, c.name as college_name, u.name as hod_name 
                FROM departments d
                JOIN colleges c ON d.college_id = c.id
                LEFT JOIN users u ON d.hod_id = u.id
            ";
            if ($college_id) {
                $sql .= " WHERE d.college_id = :college_id";
                $stmt = $db->prepare($sql);
                $stmt->execute(['college_id' => $college_id]);
            } else {
                $stmt = $db->query($sql);
            }
            echo json_encode(['status' => 'success', 'data' => $stmt->fetchAll()]);
            break;

        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            if (empty($data['college_id']) || empty($data['name'])) {
                throw new Exception("College ID and Department name are required");
            }
            $stmt = $db->prepare("
                INSERT INTO departments (college_id, name, hod_id) 
                VALUES (:college_id, :name, :hod_id)
            ");
            $stmt->execute([
                'college_id' => $data['college_id'],
                'name' => $data['name'],
                'hod_id' => !empty($data['hod_id']) ? $data['hod_id'] : null
            ]);
            $deptId = $db->lastInsertId();

            $logger = new \FlowSync\Utils\AuditLogger();
            $logger->log($session['user_id'] ?? null, 'CREATE_DEPT', 'DEPARTMENT', $deptId, ['name' => $data['name'], 'college_id' => $data['college_id']]);

            echo json_encode(['status' => 'success', 'message' => 'Department created', 'id' => $deptId]);
            break;

        case 'PUT':
            $data = json_decode(file_get_contents('php://input'), true);
            if (empty($data['id']) || empty($data['name'])) {
                throw new Exception("ID and name are required");
            }
            $stmt = $db->prepare("
                UPDATE departments 
                SET name = :name, hod_id = :hod_id, updated_at = CURRENT_TIMESTAMP
                WHERE id = :id
            ");
            $stmt->execute([
                'id' => $data['id'],
                'name' => $data['name'],
                'hod_id' => !empty($data['hod_id']) ? $data['hod_id'] : null
            ]);

            $logger = new \FlowSync\Utils\AuditLogger();
            $logger->log($session['user_id'] ?? null, 'UPDATE_DEPT', 'DEPARTMENT', $data['id'], ['name' => $data['name']]);

            echo json_encode(['status' => 'success', 'message' => 'Department updated']);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) {
                throw new Exception("Department ID is required");
            }
            // Check for dependent faculty or tasks
            $check = $db->prepare("SELECT COUNT(*) FROM tasks WHERE department_id = :id");
            $check->execute(['id' => $id]);
            if ($check->fetchColumn() > 0) {
                throw new Exception("Cannot delete department with existing tasks");
            }

            $stmt = $db->prepare("DELETE FROM departments WHERE id = :id");
            $stmt->execute(['id' => $id]);

            $logger = new \FlowSync\Utils\AuditLogger();
            $logger->log($session['user_id'] ?? null, 'DELETE_DEPT', 'DEPARTMENT', $id);

            echo json_encode(['status' => 'success', 'message' => 'Department deleted']);
            break;

        default:
            http_response_code(405);
            echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    }
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
