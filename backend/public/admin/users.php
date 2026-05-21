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
            $stmt = $db->query("
                SELECT u.id, u.name, u.email, u.is_active, u.profile_pic, r.name as role_name, c.name as college_name, u.college_id, u.role_id,
                       fd.department_id, d.name as department_name,
                       (SELECT COUNT(*) FROM departments WHERE hod_id = u.id) as is_current_hod
                FROM users u 
                JOIN roles r ON u.role_id = r.id 
                JOIN colleges c ON u.college_id = c.id
                LEFT JOIN faculty_departments fd ON u.id = fd.user_id
                LEFT JOIN departments d ON fd.department_id = d.id
                ORDER BY u.created_at DESC
            ");
            echo json_encode(['status' => 'success', 'data' => $stmt->fetchAll()]);
            break;

        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            if (empty($data['email']) || empty($data['password'])) {
                throw new Exception("Email and password are required");
            }
            $stmt = $db->prepare("
                INSERT INTO users (college_id, role_id, name, email, password_hash) 
                VALUES (:college_id, :role_id, :name, :email, :password_hash)
            ");
            $stmt->execute([
                'college_id' => !empty($data['college_id']) ? $data['college_id'] : null,
                'role_id' => $data['role_id'],
                'name' => $data['name'],
                'email' => $data['email'],
                'password_hash' => password_hash($data['password'], PASSWORD_BCRYPT)
            ]);
            $userId = $db->lastInsertId();

            $logger = new \FlowSync\Utils\AuditLogger();
            $logger->log($session['user_id'] ?? null, 'CREATE_USER', 'USER', $userId, ['email' => $data['email'], 'role_id' => $data['role_id']]);

            if (!empty($data['department_id'])) {
                $fdStmt = $db->prepare("INSERT INTO faculty_departments (user_id, department_id) VALUES (:user_id, :department_id)");
                $fdStmt->execute(['user_id' => $userId, 'department_id' => $data['department_id']]);
            }

            echo json_encode(['status' => 'success', 'message' => 'User created', 'id' => $userId]);
            break;

        case 'PUT':
            $data = json_decode(file_get_contents('php://input'), true);
            if (empty($data['id'])) {
                throw new Exception("User ID is required");
            }
            
            $fields = ["name = :name", "email = :email", "role_id = :role_id", "college_id = :college_id", "is_active = :is_active", "updated_at = CURRENT_TIMESTAMP"];
            $params = [
                'id' => $data['id'],
                'name' => $data['name'],
                'email' => $data['email'],
                'role_id' => $data['role_id'],
                'college_id' => !empty($data['college_id']) ? $data['college_id'] : null,
                'is_active' => $data['is_active'] ?? 1
            ];

            if (!empty($data['password'])) {
                $fields[] = "password_hash = :password_hash";
                $params['password_hash'] = password_hash($data['password'], PASSWORD_BCRYPT);
            }

            $sql = "UPDATE users SET " . implode(", ", $fields) . " WHERE id = :id";
            $stmt = $db->prepare($sql);
            $stmt->execute($params);

            $logger = new \FlowSync\Utils\AuditLogger();
            $logger->log($session['user_id'] ?? null, 'UPDATE_USER', 'USER', $data['id'], ['updates' => array_keys($params)]);

            if (!empty($data['department_id'])) {
                $db->prepare("DELETE FROM faculty_departments WHERE user_id = :id")->execute(['id' => $data['id']]);
                $db->prepare("INSERT INTO faculty_departments (user_id, department_id) VALUES (:id, :department_id)")
                   ->execute(['id' => $data['id'], 'department_id' => $data['department_id']]);
            }

            echo json_encode(['status' => 'success', 'message' => 'User updated']);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            $deptId = $_GET['unassign_dept_id'] ?? null;

            if (!$id) {
                throw new Exception("User ID is required");
            }

            if ($deptId) {
                // Just remove from department mapping
                $stmt = $db->prepare("DELETE FROM faculty_departments WHERE user_id = :id AND department_id = :dept_id");
                $stmt->execute(['id' => $id, 'dept_id' => $deptId]);
                
                $logger = new \FlowSync\Utils\AuditLogger();
                $logger->log($session['user_id'] ?? null, 'UNASSIGN_USER_DEPT', 'USER', $id, ['department_id' => $deptId]);

                echo json_encode(['status' => 'success', 'message' => 'User removed from department']);
            } else {
                // Full account deletion
                $stmt = $db->prepare("DELETE FROM users WHERE id = :id");
                $stmt->execute(['id' => $id]);

                $logger = new \FlowSync\Utils\AuditLogger();
                $logger->log($session['user_id'] ?? null, 'DELETE_USER', 'USER', $id);

                echo json_encode(['status' => 'success', 'message' => 'User deleted']);
            }
            break;

        default:
            http_response_code(405);
            echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    }
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
