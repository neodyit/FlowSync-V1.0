<?php
require_once __DIR__ . '/../bootstrap.php';

use FlowSync\Utils\FacultyMiddleware;
use FlowSync\Config\Database;
use FlowSync\Utils\AuditLogger;
use FlowSync\Utils\NotificationService;

$session = FacultyMiddleware::check();
$db = Database::getInstance()->getConnection();
$logger = new AuditLogger();
$notifier = new NotificationService();

try {
    // Get Faculty's department ID from faculty_departments table
    $stmt = $db->prepare("SELECT department_id FROM faculty_departments WHERE user_id = :user_id LIMIT 1");
    $stmt->execute(['user_id' => $session['user_id']]);
    $userDept = $stmt->fetch();

    if (!$userDept) {
        throw new Exception("You are not assigned to any department.");
    }
    $deptId = $userDept['department_id'];

    $method = $_SERVER['REQUEST_METHOD'];

    switch ($method) {
        case 'GET':

            // Fetch user creation date
            $userStmt = $db->prepare("SELECT created_at FROM users WHERE id = :uid LIMIT 1");
            $userStmt->execute(['uid' => $session['user_id']]);
            $userCreatedAt = $userStmt->fetchColumn();

            // Fetch BROADCASTED tasks for this department that the user hasn't accepted yet
            $stmt = $db->prepare("
                SELECT t.*, u.name as assigned_by_name, u.profile_pic as assigned_by_pic,
                       (SELECT COUNT(*) FROM task_assignments ta WHERE ta.task_id = t.id) as participant_count
                FROM tasks t
                JOIN users u ON t.assigned_by_id = u.id
                WHERE t.department_id = :dept_id 
                AND t.status = 'Broadcasted'
                AND t.id NOT IN (SELECT task_id FROM task_assignments WHERE user_id = :user_id)
                AND t.created_at >= :user_created_at
                ORDER BY t.created_at DESC
            ");
            $stmt->execute(['dept_id' => $deptId, 'user_id' => $session['user_id'], 'user_created_at' => $userCreatedAt]);
            $tasks = $stmt->fetchAll();

            // Fetch attachments for broadcasted tasks
            foreach ($tasks as &$task) {
                $attStmt = $db->prepare("SELECT id, file_name, file_path FROM attachments WHERE entity_type = 'Task' AND entity_id = :task_id");
                $attStmt->execute(['task_id' => $task['id']]);
                $task['attachments'] = $attStmt->fetchAll();
                $task['attachment_count'] = count($task['attachments']);
            }

            // Fetch assigned tasks that are pending acceptance (status = 'Assigned')
            $stmtPending = $db->prepare("
                SELECT t.*, u.name as assigned_by_name, u.profile_pic as assigned_by_pic,
                       ta.status as my_status,
                       (SELECT COUNT(*) FROM task_assignments WHERE task_id = t.id) as participant_count
                FROM tasks t
                JOIN users u ON t.assigned_by_id = u.id
                JOIN task_assignments ta ON t.id = ta.task_id
                WHERE ta.user_id = :user_id 
                AND ta.status = 'Assigned'
                AND t.season_id = :season_id
                AND (t.created_at >= :user_created_at OR ta.is_manually_included = 1)
                ORDER BY t.created_at DESC
            ");
            $stmtPending->execute(['user_id' => $session['user_id'], 'season_id' => $currentSeasonId, 'user_created_at' => $userCreatedAt]);
            $pending = $stmtPending->fetchAll();

            // Fetch attachments for pending tasks
            foreach ($pending as &$task) {
                $attStmt = $db->prepare("SELECT id, file_name, file_path FROM attachments WHERE entity_type = 'Task' AND entity_id = :task_id");
                $attStmt->execute(['task_id' => $task['id']]);
                $task['attachments'] = $attStmt->fetchAll();
                $task['attachment_count'] = count($task['attachments']);
            }

            echo json_encode([
                'status' => 'success', 
                'data' => $tasks,
                'pending' => $pending
            ]);
            break;

        case 'POST':
            // ACTION: Accept Task
            $data = json_decode(file_get_contents('php://input'), true);
            $taskId = $data['task_id'] ?? null;
            $action = $data['action'] ?? '';

            if ($action === 'accept' && $taskId) {
                // Check if task is broadcasted and user hasn't already accepted it
                $checkStmt = $db->prepare("SELECT id, status FROM tasks WHERE id = :id AND status = 'Broadcasted'");
                $checkStmt->execute(['id' => $taskId]);
                $taskCheck = $checkStmt->fetch();
                if (!$taskCheck) {
                    throw new Exception("Task is no longer available or not broadcasted.");
                }

                // Check if already accepted
                $dupStmt = $db->prepare("SELECT id FROM task_assignments WHERE task_id = :tid AND user_id = :uid");
                $dupStmt->execute(['tid' => $taskId, 'uid' => $session['user_id']]);
                if ($dupStmt->fetch()) {
                    throw new Exception("You have already accepted this task.");
                }

                // Accept Task (Add to assignments)
                $stmt = $db->prepare("
                    INSERT INTO task_assignments (task_id, user_id, status, accepted_at)
                    VALUES (:task_id, :user_id, 'Accepted', NOW())
                ");
                $stmt->execute([
                    'task_id' => $taskId,
                    'user_id' => $session['user_id']
                ]);

                $logger->log($session['user_id'], 'FACULTY_ACCEPT_TASK', 'TASK', $taskId);
                
                // Notify HOD
                $facultyName = $session['name'] ?? 'A faculty member';
                $stmt = $db->prepare("SELECT title FROM tasks WHERE id = :id");
                $stmt->execute(['id' => $taskId]);
                $task = $stmt->fetch();
                $taskTitle = $task['title'] ?? 'Task';
                
                $notifier->notifyHOD($deptId, 'TASK_ACCEPTED', "$facultyName has accepted the broadcasted task: $taskTitle", $taskId, $session['user_id']);

                echo json_encode(['status' => 'success', 'message' => 'Task accepted successfully']);
            } else {
                throw new Exception("Invalid action or missing Task ID.");
            }
            break;

        default:
            http_response_code(405);
            echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
