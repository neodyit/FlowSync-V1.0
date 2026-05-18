<?php

use FlowSync\Config\Database;

try {
    require_once __DIR__ . '/bootstrap.php';

    // validateSession is already called in bootstrap.php
    if (!$session) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
        exit;
    }

    $db = Database::getInstance()->getConnection();
    $userId = $session['user_id'];

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $type = $data['type'] ?? 'feedback';
        $subject = $data['subject'] ?? '';
        $message = $data['message'] ?? '';

        if (empty($subject) || empty($message)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Subject and message are required']);
            exit;
        }

        $stmt = $db->prepare("INSERT INTO feedbacks (user_id, type, subject, message) VALUES (:user_id, :type, :subject, :message)");
        $stmt->execute([
            'user_id' => $userId,
            'type' => $type,
            'subject' => $subject,
            'message' => $message
        ]);

        echo json_encode([
            'status' => 'success',
            'message' => 'Feedback submitted successfully'
        ]);
    } else {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
