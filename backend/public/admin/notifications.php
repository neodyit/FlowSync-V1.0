<?php

require_once __DIR__ . '/../bootstrap.php';

use FlowSync\Utils\AdminMiddleware;
use FlowSync\Config\Database;
use FlowSync\Utils\NotificationService;

$session = AdminMiddleware::check();
$db = Database::getInstance()->getConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $message = trim($data['message'] ?? '');
        $audience = $data['audience'] ?? 'All';

        if (empty($message)) {
            throw new Exception("Message cannot be empty.");
        }

        // Determine target role
        $roleCondition = "";
        $params = [];
        if ($audience === 'HODs') {
            $roleCondition = "WHERE role_id = 2 AND is_active = 1";
        } else if ($audience === 'Faculty') {
            $roleCondition = "WHERE role_id = 3 AND is_active = 1";
        } else {
            // All active users except admin
            $roleCondition = "WHERE role_id IN (2, 3) AND is_active = 1";
        }

        $stmt = $db->query("SELECT id FROM users $roleCondition");
        $users = $stmt->fetchAll(PDO::FETCH_COLUMN);

        if (empty($users)) {
            throw new Exception("No users found matching the selected audience.");
        }

        $db->beginTransaction();

        $notifService = new NotificationService();

        foreach ($users as $userId) {
            $notifService->send($userId, 'System Announcement', $message, null, $session['user_id'] ?? null);
        }

        $db->commit();

        $logger = new \FlowSync\Utils\AuditLogger();
        $logger->log($session['user_id'] ?? null, 'GLOBAL_BROADCAST', 'NOTIFICATION', null, [
            'audience' => $audience,
            'message' => $message,
            'user_count' => count($users)
        ]);

        echo json_encode(['status' => 'success', 'message' => "Broadcast sent successfully to " . count($users) . " users."]);
    } else {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    }
} catch (\Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
