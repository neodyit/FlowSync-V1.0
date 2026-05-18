<?php
require_once __DIR__ . '/bootstrap.php';

use FlowSync\Auth\AuthService;
use FlowSync\Config\Database;
use FlowSync\Utils\NotificationService;

$auth = new AuthService();
$session = $auth->validateSession();
$db = Database::getInstance()->getConnection();
$notifier = new NotificationService();

if (!$session) {
    http_response_code(401);
    die(json_encode(['status' => 'error', 'message' => 'Unauthorized']));
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $taskId = $data['task_id'] ?? null;
        $comment = $data['comment'] ?? null;

        if (!$taskId || !$comment) {
            throw new Exception("Task ID and comment are required.");
        }

        // Insert comment
        $stmt = $db->prepare("INSERT INTO task_comments (task_id, user_id, comment) VALUES (:task_id, :user_id, :comment)");
        $stmt->execute([
            'task_id' => $taskId,
            'user_id' => $session['user_id'],
            'comment' => $comment
        ]);

        // Get task info for notification
        $taskStmt = $db->prepare("SELECT title, assigned_by_id, department_id FROM tasks WHERE id = :id");
        $taskStmt->execute(['id' => $taskId]);
        $task = $taskStmt->fetch();

        // Notify relevant parties
        $userName = $session['name'] ?? 'Someone';
        
        // If it's a faculty commenting, notify HOD
        if ($session['role'] === 'Faculty') {
            $notifier->notifyHOD($task['department_id'], 'TASK_COMMENT', "$userName commented on: " . $task['title'], $taskId, $session['user_id']);
        } 
        // If it's an HOD commenting, notify all assigned faculties
        else if ($session['role'] === 'HOD') {
            $stmt = $db->prepare("SELECT user_id FROM task_assignments WHERE task_id = :task_id");
            $stmt->execute(['task_id' => $taskId]);
            $assignments = $stmt->fetchAll();
            foreach ($assignments as $assign) {
                $notifier->send($assign['user_id'], 'TASK_COMMENT', "HOD $userName commented on: " . $task['title'], $taskId, $session['user_id']);
            }
        }

        echo json_encode(['status' => 'success', 'message' => 'Comment added']);
    } else {
        throw new Exception("Method not allowed");
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
