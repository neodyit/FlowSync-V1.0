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
            // Fetch users of role HOD (2) and Faculty (3) for this college
            $stmt = $db->prepare("
                SELECT u.id, u.name, u.email, u.is_active, u.profile_pic, r.name as role_name, c.name as college_name, u.college_id, u.role_id,
                       fd.department_id, d.name as department_name,
                       (SELECT COUNT(*) FROM departments WHERE hod_id = u.id) as is_current_hod,
                       (u.id <> 1 AND u.last_active_at IS NOT NULL AND u.last_active_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)) as is_online
                FROM users u 
                JOIN roles r ON u.role_id = r.id 
                LEFT JOIN colleges c ON u.college_id = c.id
                LEFT JOIN faculty_departments fd ON u.id = fd.user_id
                LEFT JOIN departments d ON fd.department_id = d.id
                WHERE u.college_id = :cid AND u.role_id IN (2, 3)
                ORDER BY u.created_at DESC
            ");
            $stmt->execute(['cid' => $collegeId]);
            $users = $stmt->fetchAll();

            // Fetch departments for this college to populate select list
            $stmtD = $db->prepare("SELECT id, name, college_id FROM departments WHERE college_id = :cid");
            $stmtD->execute(['cid' => $collegeId]);
            $departments = $stmtD->fetchAll();

            echo json_encode([
                'status' => 'success',
                'data' => [
                    'users' => $users,
                    'departments' => $departments
                ]
            ]);
            break;

        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            if (empty($data['email']) || empty($data['password'])) {
                throw new Exception("Email and password are required");
            }

            // Validation: role_id must be 2 or 3
            $roleId = (int)$data['role_id'];
            if ($roleId !== 2 && $roleId !== 3) {
                throw new Exception("Unauthorized role assignment");
            }

            // Create user
            $stmt = $db->prepare("
                INSERT INTO users (college_id, role_id, name, email, password_hash) 
                VALUES (:college_id, :role_id, :name, :email, :password_hash)
            ");
            $stmt->execute([
                'college_id' => $collegeId, // Enforced IA college scope
                'role_id' => $roleId,
                'name' => $data['name'],
                'email' => $data['email'],
                'password_hash' => password_hash($data['password'], PASSWORD_BCRYPT)
            ]);
            $userId = $db->lastInsertId();

            // Audit Log
            $logger = new \FlowSync\Utils\AuditLogger();
            $logger->log($session['user_id'], 'CREATE_USER', 'USER', $userId, ['email' => $data['email'], 'role_id' => $roleId]);

            // Department Assignment
            if (!empty($data['department_id'])) {
                // Ensure department belongs to this college
                $stmtCheck = $db->prepare("SELECT id FROM departments WHERE id = :did AND college_id = :cid");
                $stmtCheck->execute(['did' => $data['department_id'], 'cid' => $collegeId]);
                if ($stmtCheck->fetchColumn()) {
                    $fdStmt = $db->prepare("INSERT INTO faculty_departments (user_id, department_id) VALUES (:user_id, :department_id)");
                    $fdStmt->execute(['user_id' => $userId, 'department_id' => $data['department_id']]);
                }
            }

            echo json_encode(['status' => 'success', 'message' => 'User created successfully', 'id' => $userId]);
            break;

        case 'PUT':
            $data = json_decode(file_get_contents('php://input'), true);
            if (empty($data['id'])) {
                throw new Exception("User ID is required");
            }
            $targetUserId = (int)$data['id'];

            // Security check: Verify user belongs to this college and is not Admin/Super Admin/IA
            $stmtVerify = $db->prepare("SELECT role_id, college_id FROM users WHERE id = :uid LIMIT 1");
            $stmtVerify->execute(['uid' => $targetUserId]);
            $targetUser = $stmtVerify->fetch();

            if (!$targetUser || (int)$targetUser['college_id'] !== $collegeId || !in_array((int)$targetUser['role_id'], [2, 3])) {
                throw new Exception("Access Denied: Cannot modify this user");
            }

            // Role assignment check
            $roleId = (int)$data['role_id'];
            if ($roleId !== 2 && $roleId !== 3) {
                throw new Exception("Unauthorized role assignment");
            }

            $fields = ["name = :name", "email = :email", "role_id = :role_id", "is_active = :is_active", "updated_at = CURRENT_TIMESTAMP"];
            $params = [
                'id' => $targetUserId,
                'name' => $data['name'],
                'email' => $data['email'],
                'role_id' => $roleId,
                'is_active' => $data['is_active'] ?? 1
            ];

            if (!empty($data['password'])) {
                $fields[] = "password_hash = :password_hash";
                $params['password_hash'] = password_hash($data['password'], PASSWORD_BCRYPT);
            }

            $sql = "UPDATE users SET " . implode(", ", $fields) . " WHERE id = :id";
            $stmt = $db->prepare($sql);
            $stmt->execute($params);

            // Audit Log
            $logger = new \FlowSync\Utils\AuditLogger();
            $logger->log($session['user_id'], 'UPDATE_USER', 'USER', $targetUserId, ['updates' => array_keys($params)]);

            // Department Assignment
            if (isset($data['department_id'])) {
                $db->prepare("DELETE FROM faculty_departments WHERE user_id = :id")->execute(['id' => $targetUserId]);
                
                if (!empty($data['department_id'])) {
                    // Verify department belongs to this college
                    $stmtCheck = $db->prepare("SELECT id FROM departments WHERE id = :did AND college_id = :cid");
                    $stmtCheck->execute(['did' => $data['department_id'], 'cid' => $collegeId]);
                    if ($stmtCheck->fetchColumn()) {
                        $db->prepare("INSERT INTO faculty_departments (user_id, department_id) VALUES (:id, :department_id)")
                           ->execute(['id' => $targetUserId, 'department_id' => $data['department_id']]);
                    }
                }
            }

            echo json_encode(['status' => 'success', 'message' => 'User updated successfully']);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) {
                throw new Exception("User ID is required");
            }
            $targetUserId = (int)$id;

            // Security check
            $stmtVerify = $db->prepare("SELECT role_id, college_id FROM users WHERE id = :uid LIMIT 1");
            $stmtVerify->execute(['uid' => $targetUserId]);
            $targetUser = $stmtVerify->fetch();

            if (!$targetUser || (int)$targetUser['college_id'] !== $collegeId || !in_array((int)$targetUser['role_id'], [2, 3])) {
                throw new Exception("Access Denied: Cannot delete this user");
            }

            // Deactivate and delete mapping (or full delete depending on preferences; standard Admin deletes user)
            $stmt = $db->prepare("DELETE FROM users WHERE id = :id");
            $stmt->execute(['id' => $targetUserId]);

            // Audit Log
            $logger = new \FlowSync\Utils\AuditLogger();
            $logger->log($session['user_id'], 'DELETE_USER', 'USER', $targetUserId);

            echo json_encode(['status' => 'success', 'message' => 'User deleted successfully']);
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
