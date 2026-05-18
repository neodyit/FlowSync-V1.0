<?php

require_once __DIR__ . '/../bootstrap.php';

use FlowSync\Utils\AdminMiddleware;
use FlowSync\Config\Database;

$session = AdminMiddleware::check();
$db = Database::getInstance()->getConnection();

try {
    $method = $_SERVER['REQUEST_METHOD'];

    switch ($method) {
        case 'GET':
            $collegeId = $_GET['college_id'] ?? null;
            $deptId = $_GET['department_id'] ?? null;
            $status = $_GET['status'] ?? null;

            $query = "
                SELECT t.*, 
                       c.name as college_name, 
                       d.name as department_name, 
                       u_to.name as assigned_to_name,
                       u_to.email as assigned_to_email,
                       u_by.name as assigned_by_name,
                       u_by.email as assigned_by_email
                FROM tasks t
                JOIN colleges c ON t.college_id = c.id
                JOIN departments d ON t.department_id = d.id
                LEFT JOIN users u_to ON t.assigned_to_id = u_to.id
                LEFT JOIN users u_by ON t.assigned_by_id = u_by.id
                WHERE 1=1
            ";

            $params = [];
            if ($collegeId) {
                $query .= " AND t.college_id = :college_id";
                $params['college_id'] = $collegeId;
            }
            if ($deptId) {
                $query .= " AND t.department_id = :dept_id";
                $params['dept_id'] = $deptId;
            }
            if ($status) {
                $query .= " AND t.status = :status";
                $params['status'] = $status;
            }

            $query .= " ORDER BY t.created_at DESC";

            $stmt = $db->prepare($query);
            $stmt->execute($params);
            $tasks = $stmt->fetchAll();

            // Enrich tasks with attachments and reviews
            foreach ($tasks as &$task) {
                // Fetch attachments
                $attStmt = $db->prepare("
                    SELECT id, file_name, file_path, entity_type, created_at 
                    FROM attachments 
                    WHERE entity_id = :task_id AND (entity_type = 'Task' OR entity_type = 'Task_Submission')
                ");
                $attStmt->execute(['task_id' => $task['id']]);
                $task['attachments'] = $attStmt->fetchAll();

                // Fetch reviews/remarks
                $revStmt = $db->prepare("
                    SELECT tr.*, u.name as reviewer_name
                    FROM task_reviews tr
                    JOIN users u ON tr.reviewer_id = u.id
                    WHERE tr.task_id = :task_id
                    ORDER BY tr.created_at DESC
                ");
                $revStmt->execute(['task_id' => $task['id']]);
                $task['reviews'] = $revStmt->fetchAll();
            }

            echo json_encode(['status' => 'success', 'data' => $tasks]);
            break;

        case 'DELETE':
            $taskId = $_GET['id'] ?? null;
            if (!$taskId) throw new Exception("Task ID is required.");

            $stmt = $db->prepare("DELETE FROM tasks WHERE id = :id");
            $stmt->execute(['id' => $taskId]);

            echo json_encode(['status' => 'success', 'message' => 'Task deleted by Admin']);
            break;

        default:
            http_response_code(405);
            echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
