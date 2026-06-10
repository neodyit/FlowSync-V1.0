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
            $taskId = $_GET['id'] ?? null;

            if ($taskId) {
                // Fetch single task details
                $stmt = $db->prepare("
                    SELECT t.*, 
                           c.name as college_name, 
                           d.name as department_name, 
                           u_to.name as assigned_to_name,
                           u_to.email as assigned_to_email,
                           u_by.name as assigned_by_name,
                           u_by.email as assigned_by_email,
                           COALESCE((SELECT ROUND(AVG(progress)) FROM task_assignments WHERE task_id = t.id), 0) as progress
                    FROM tasks t
                    JOIN colleges c ON t.college_id = c.id
                    JOIN departments d ON t.department_id = d.id
                    LEFT JOIN users u_to ON t.assigned_to_id = u_to.id
                    LEFT JOIN users u_by ON t.assigned_by_id = u_by.id
                    WHERE t.id = :task_id
                ");
                $stmt->execute(['task_id' => $taskId]);
                $task = $stmt->fetch();

                if (!$task) {
                    throw new Exception("Task not found.");
                }

                // Fetch engaged members
                $memberStmt = $db->prepare("
                    SELECT ta.*, u.name as faculty_name, u.email as faculty_email, u.profile_pic as faculty_pic, u.designation,
                           d.name as department_name
                    FROM task_assignments ta
                    JOIN users u ON ta.user_id = u.id
                    LEFT JOIN departments d ON EXISTS(SELECT 1 FROM faculty_departments fd WHERE fd.user_id = u.id AND fd.department_id = d.id)
                    WHERE ta.task_id = :task_id
                ");
                $memberStmt->execute(['task_id' => $taskId]);
                $task['assignments'] = $memberStmt->fetchAll();

                // Fetch attachments
                $attStmt = $db->prepare("
                    SELECT a.id, a.original_name AS file_name, 
                           CONCAT('tasks_data/', c.short_name, '/task_', a.task_id, '/', a.stored_name) AS file_path, 
                           a.entity_type, a.created_at, a.file_size, a.file_type, u.name as uploader_name
                    FROM attachments a
                    JOIN colleges c ON a.institution_id = c.id
                    LEFT JOIN users u ON a.uploader_id = u.id
                    WHERE a.task_id = :task_id AND (a.entity_type = 'Task' OR a.entity_type = 'Task_Submission')
                ");
                $attStmt->execute(['task_id' => $taskId]);
                $task['attachments'] = $attStmt->fetchAll();

                // Fetch reviews/remarks
                $revStmt = $db->prepare("
                    SELECT tr.*, u.name as reviewer_name
                    FROM task_reviews tr
                    JOIN users u ON tr.reviewer_id = u.id
                    WHERE tr.task_id = :task_id
                    ORDER BY tr.created_at DESC
                ");
                $revStmt->execute(['task_id' => $taskId]);
                $task['reviews'] = $revStmt->fetchAll();

                // Fetch comments
                $commentStmt = $db->prepare("
                    SELECT tc.*, u.name as user_name, u.profile_pic as user_pic
                    FROM task_comments tc
                    JOIN users u ON tc.user_id = u.id
                    WHERE tc.task_id = :task_id
                    ORDER BY tc.created_at ASC
                ");
                $commentStmt->execute(['task_id' => $taskId]);
                $task['comments'] = $commentStmt->fetchAll();

                // Fetch audit logs
                $logStmt = $db->prepare("
                    SELECT al.id, 
                           al.action AS action_type, 
                           al.resource AS target_type, 
                           al.resource_id AS target_id, 
                           COALESCE(al.details, al.action) AS description, 
                           al.created_at,
                           u.name as user_name, u.email as user_email
                    FROM audit_logs al
                    LEFT JOIN users u ON al.user_id = u.id
                    WHERE al.resource = 'TASK' AND al.resource_id = :task_id
                    ORDER BY al.created_at DESC
                ");
                $logStmt->execute(['task_id' => $taskId]);
                $task['audit_logs'] = $logStmt->fetchAll();

                echo json_encode(['status' => 'success', 'data' => $task]);
                break;
            }

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
                       u_by.email as assigned_by_email,
                       COALESCE((SELECT ROUND(AVG(progress)) FROM task_assignments WHERE task_id = t.id), 0) as progress
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
                    SELECT a.id, a.original_name AS file_name, 
                           CONCAT('tasks_data/', c.short_name, '/task_', a.task_id, '/', a.stored_name) AS file_path, 
                           a.entity_type, a.created_at 
                    FROM attachments a
                    JOIN colleges c ON a.institution_id = c.id
                    WHERE a.task_id = :task_id AND (a.entity_type = 'Task' OR a.entity_type = 'Task_Submission')
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