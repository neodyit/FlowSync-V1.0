<?php

require_once __DIR__ . '/../bootstrap.php';

use FlowSync\Config\Database;
use FlowSync\Utils\HODMiddleware;
use FlowSync\Utils\NotificationService;

$session = HODMiddleware::check();
$db = Database::getInstance()->getConnection();
$notifier = new NotificationService();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $taskId = $data['task_id'] ?? null;
    $userId = $data['user_id'] ?? null; // Faculty ID
    $type = $data['type'] ?? 'Gentle Reminder';

    if (!$taskId || !$userId) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Task ID and User ID are required.']);
        exit;
    }

    try {
        // 0. Get HOD's department ID
        $stmtDept = $db->prepare("SELECT id FROM departments WHERE hod_id = :hod_id LIMIT 1");
        $stmtDept->execute(['hod_id' => $session['user_id']]);
        $dept = $stmtDept->fetch();

        if (!$dept) {
            throw new Exception("Unauthorized. No department assigned.");
        }
        $deptId = $dept['id'];

        // 1. Verify task exists and belongs to HOD's department
        $check = $db->prepare("SELECT id, title, assignment_mode FROM tasks WHERE id = :id AND department_id = :dept_id");
        $check->execute(['id' => $taskId, 'dept_id' => $deptId]);
        $task = $check->fetch();

        if (!$task) {
            throw new Exception("Task not found or access denied.");
        }

        $isBroadcast = ($task['assignment_mode'] === 'broadcast');

        // 2. Check assignment status
        $checkAssign = $db->prepare("SELECT status FROM task_assignments WHERE task_id = :tid AND user_id = :uid");
        $checkAssign->execute(['tid' => $taskId, 'uid' => $userId]);
        $assign = $checkAssign->fetch();

        if (!$assign && !$isBroadcast) {
            throw new Exception("Faculty is not assigned to this task.");
        }

        if ($assign && in_array($assign['status'], ['Submitted', 'Under Review', 'Approved', 'Completed'])) {
            throw new Exception("Cannot send reminder: Work has already been submitted or completed.");
        }

        // 3. Record the reminder
        $stmt = $db->prepare("
            INSERT INTO task_reminders (task_id, user_id, sender_id, type) 
            VALUES (:tid, :uid, :sid, :type)
        ");
        $stmt->execute([
            'tid' => $taskId,
            'uid' => $userId,
            'sid' => $session['user_id'],
            'type' => $type
        ]);

        // 4. Send Notification
        $notifType = 'TASK_REMINDER';
        if ($type === 'Warning') $notifType = 'TASK_WARNING';
        
        if ($isBroadcast && !$assign) {
            $notifier->send($userId, 'TASK_ASSIGNED', "Reminder: New department broadcast task '{$task['title']}' is available. Please accept it now.", $taskId);
        } else {
            $notifier->send($userId, $notifType, "[$type] For mission '{$task['title']}': Please prioritize this task.", $taskId);
        }

        echo json_encode(['status' => 'success', 'message' => "$type sent successfully."]);

    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
} else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Fetch reminder history for a task/user
    $taskId = $_GET['task_id'] ?? null;
    $userId = $_GET['user_id'] ?? null;

    $query = "SELECT type, created_at FROM task_reminders WHERE 1=1";
    $params = [];

    if ($taskId) {
        $query .= " AND task_id = :tid";
        $params['tid'] = $taskId;
    }
    if ($userId) {
        $query .= " AND user_id = :uid";
        $params['uid'] = $userId;
    }

    $query .= " ORDER BY created_at DESC";
    
    $stmt = $db->prepare($query);
    $stmt->execute($params);
    echo json_encode(['status' => 'success', 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
}
