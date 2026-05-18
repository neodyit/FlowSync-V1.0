<?php

try {
    require_once __DIR__ . '/bootstrap.php';

    $db = FlowSync\Config\Database::getInstance()->getConnection();
    $notifier = new FlowSync\Utils\NotificationService();

    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (empty($data['task_id']) || empty($data['user_id']) || empty($data['requested_deadline']) || empty($data['reason'])) {
            throw new Exception("Missing required fields");
        }

        // Get task details and uploader name
        $stmt = $db->prepare("SELECT t.title, t.assigned_by_id, u.name as faculty_name FROM tasks t JOIN users u ON u.id = ? WHERE t.id = ?");
        $stmt->execute([$data['user_id'], $data['task_id']]);
        $task = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$task) throw new Exception("Task not found");

        $stmt = $db->prepare("SELECT deadline FROM tasks WHERE id = ?");
        $stmt->execute([$data['task_id']]);
        $currentDeadline = $stmt->fetchColumn();

        $stmt = $db->prepare("
            INSERT INTO deadline_extensions (task_id, user_id, current_deadline, requested_deadline, reason)
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $data['task_id'],
            $data['user_id'],
            $currentDeadline,
            $data['requested_deadline'],
            $data['reason']
        ]);

        // Notify HOD
        $notifier->send(
            $task['assigned_by_id'],
            'EXTENSION_REQUESTED',
            "{$task['faculty_name']} requested a deadline extension for '{$task['title']}' to " . date('d/m/Y', strtotime($data['requested_deadline'])),
            $data['task_id'],
            $data['user_id']
        );

        echo json_encode(["message" => "Extension request submitted successfully"]);
    } 
    elseif ($method === 'GET') {
        $taskId = $_GET['task_id'] ?? null;
        $userId = $_GET['user_id'] ?? null;
        $role = $_GET['role'] ?? 'Faculty';

        if ($role === 'HOD') {
            // HOD sees all pending requests for their department tasks
            $stmt = $db->prepare("
                SELECT de.*, t.title as task_title, t.description as task_desc, u.name as faculty_name 
                FROM deadline_extensions de
                JOIN tasks t ON de.task_id = t.id
                JOIN users u ON de.user_id = u.id
                WHERE t.assigned_by_id = ?
                ORDER BY de.requested_at DESC
            ");
            $stmt->execute([$session['user_id']]);
        } else {
            // Faculty sees their own requests
            $stmt = $db->prepare("
                SELECT de.*, t.title as task_title 
                FROM deadline_extensions de
                JOIN tasks t ON de.task_id = t.id
                WHERE de.user_id = ?
                ORDER BY de.requested_at DESC
            ");
            $stmt->execute([$userId]);
        }
        
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
    elseif ($method === 'PUT') {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (empty($data['request_id']) || empty($data['status'])) {
            throw new Exception("Missing request ID or status");
        }

        $db->beginTransaction();

        // Get request details before updating
        $stmt = $db->prepare("SELECT de.*, t.title FROM deadline_extensions de JOIN tasks t ON de.task_id = t.id WHERE de.id = ?");
        $stmt->execute([$data['request_id']]);
        $request = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$request) throw new Exception("Request not found");

        $stmt = $db->prepare("UPDATE deadline_extensions SET status = ?, hod_remarks = ?, reviewed_at = NOW() WHERE id = ?");
        $stmt->execute([$data['status'], $data['hod_remarks'] ?? null, $data['request_id']]);

        if ($data['status'] === 'Approved') {
            // Update the task deadline
            $stmt = $db->prepare("UPDATE tasks SET deadline = ? WHERE id = ?");
            $stmt->execute([$request['requested_deadline'], $request['task_id']]);
        }

        // Notify Faculty
        $statusMsg = $data['status'] === 'Approved' ? "approved" : "rejected";
        $notifier->send(
            $request['user_id'],
            $data['status'] === 'Approved' ? 'EXTENSION_APPROVED' : 'EXTENSION_REJECTED',
            "Your extension request for '{$request['title']}' was {$statusMsg}.",
            $request['task_id'],
            $session['user_id']
        );

        $db->commit();
        echo json_encode(["message" => "Extension request " . strtolower($data['status'])]);
    }
} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) $db->rollBack();
    http_response_code(400);
    echo json_encode(["error" => $e->getMessage()]);
}

