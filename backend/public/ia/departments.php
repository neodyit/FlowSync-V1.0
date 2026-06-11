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
            // Fetch all departments in this college with analytics
            $stmt = $db->prepare("
                SELECT 
                    d.id, d.name, d.code, d.description, d.hod_id, d.is_enabled,
                    u.name as hod_name,
                    (SELECT COUNT(*) FROM faculty_departments WHERE department_id = d.id) as faculty_count,
                    (SELECT COUNT(*) FROM tasks WHERE department_id = d.id AND season_id = :sid1 AND status = 'Completed') as completed_tasks,
                    (SELECT COUNT(*) FROM tasks WHERE department_id = d.id AND season_id = :sid2 AND status != 'Draft') as total_tasks,
                    (
                        SELECT IFNULL(SUM(lp.total_points), 0) 
                        FROM leaderboard_points lp
                        JOIN users usr ON lp.user_id = usr.id
                        JOIN faculty_departments fd ON usr.id = fd.user_id
                        WHERE fd.department_id = d.id AND lp.season_id = :sid3
                    ) as engagement_score
                FROM departments d
                LEFT JOIN users u ON d.hod_id = u.id
                WHERE d.college_id = :cid
                ORDER BY d.created_at DESC
            ");
            $stmt->execute(['cid' => $collegeId, 'sid1' => $seasonId, 'sid2' => $seasonId, 'sid3' => $seasonId]);
            $departments = $stmt->fetchAll();

            // Fetch eligible HODs (role_id = 2) for this college to assign
            $stmtH = $db->prepare("SELECT id, name FROM users WHERE role_id = 2 AND college_id = :cid AND is_active = 1");
            $stmtH->execute(['cid' => $collegeId]);
            $hods = $stmtH->fetchAll();

            echo json_encode([
                'status' => 'success',
                'data' => [
                    'departments' => $departments,
                    'hods' => $hods
                ]
            ]);
            break;

        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            if (empty($data['name'])) {
                throw new Exception("Department Name is required");
            }

            // Insert new department
            $stmt = $db->prepare("
                INSERT INTO departments (college_id, name, code, description, hod_id) 
                VALUES (:college_id, :name, :code, :description, :hod_id)
            ");
            $stmt->execute([
                'college_id' => $collegeId,
                'name' => $data['name'],
                'code' => $data['code'] ?? null,
                'description' => $data['description'] ?? null,
                'hod_id' => !empty($data['hod_id']) ? $data['hod_id'] : null
            ]);
            $deptId = $db->lastInsertId();

            // Audit Log
            $logger = new \FlowSync\Utils\AuditLogger();
            $logger->log($session['user_id'], 'CREATE_DEPT', 'DEPARTMENT', $deptId, ['name' => $data['name']]);

            echo json_encode(['status' => 'success', 'message' => 'Department created successfully', 'id' => $deptId]);
            break;

        case 'PUT':
            $data = json_decode(file_get_contents('php://input'), true);
            if (empty($data['id']) || empty($data['name'])) {
                throw new Exception("ID and Department Name are required");
            }
            $deptId = (int)$data['id'];

            // Security check: Verify department belongs to this college
            $stmtVerify = $db->prepare("SELECT college_id FROM departments WHERE id = :id LIMIT 1");
            $stmtVerify->execute(['id' => $deptId]);
            if ($stmtVerify->fetchColumn() != $collegeId) {
                throw new Exception("Access Denied: Cannot modify this department");
            }

            // Update department
            $stmt = $db->prepare("
                UPDATE departments 
                SET name = :name, code = :code, description = :description, hod_id = :hod_id, updated_at = CURRENT_TIMESTAMP
                WHERE id = :id
            ");
            $stmt->execute([
                'id' => $deptId,
                'name' => $data['name'],
                'code' => $data['code'] ?? null,
                'description' => $data['description'] ?? null,
                'hod_id' => !empty($data['hod_id']) ? $data['hod_id'] : null
            ]);

            // Audit Log
            $logger = new \FlowSync\Utils\AuditLogger();
            $logger->log($session['user_id'], 'UPDATE_DEPT', 'DEPARTMENT', $deptId, ['name' => $data['name']]);

            echo json_encode(['status' => 'success', 'message' => 'Department updated successfully']);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) {
                throw new Exception("Department ID is required");
            }
            $deptId = (int)$id;

            // Security check: Verify department belongs to this college
            $stmtVerify = $db->prepare("SELECT college_id FROM departments WHERE id = :id LIMIT 1");
            $stmtVerify->execute(['id' => $deptId]);
            if ($stmtVerify->fetchColumn() != $collegeId) {
                throw new Exception("Access Denied: Cannot delete this department");
            }

            // Check for existing tasks
            $check = $db->prepare("SELECT COUNT(*) FROM tasks WHERE department_id = :id");
            $check->execute(['id' => $deptId]);
            if ($check->fetchColumn() > 0) {
                throw new Exception("Cannot delete department with existing tasks assigned to it.");
            }

            // Delete department
            $stmt = $db->prepare("DELETE FROM departments WHERE id = :id");
            $stmt->execute(['id' => $deptId]);

            // Audit Log
            $logger = new \FlowSync\Utils\AuditLogger();
            $logger->log($session['user_id'], 'DELETE_DEPT', 'DEPARTMENT', $deptId);

            echo json_encode(['status' => 'success', 'message' => 'Department deleted successfully']);
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
