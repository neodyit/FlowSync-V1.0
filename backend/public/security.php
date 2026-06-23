<?php
require_once __DIR__ . '/bootstrap.php';

use FlowSync\Config\Database;

$db = Database::getInstance()->getConnection();
$auth = new \FlowSync\Auth\AuthService();
$session = $auth->validateSession();

if (!$session) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit;
}

$userId = $session['user_id'];

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true);
    $current_password = $data['current_password'] ?? '';
    $new_password = $data['new_password'] ?? '';

    if (empty($current_password) || empty($new_password)) {
        echo json_encode(['status' => 'error', 'message' => 'Both passwords are required']);
        exit;
    }

    try {
        // Verify current password
        $stmt = $db->prepare("SELECT password_hash FROM users WHERE id = :user_id");
        $stmt->execute(['user_id' => $userId]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($current_password, $user['password_hash'])) {
            echo json_encode(['status' => 'error', 'message' => 'Incorrect current password']);
            exit;
        }

        // Validate new password strength
        if (strlen($new_password) < 8) {
            echo json_encode(['status' => 'error', 'message' => 'New password must be at least 8 characters']);
            exit;
        }

        // Update password
        $hashed_password = password_hash($new_password, PASSWORD_BCRYPT);
        $update_stmt = $db->prepare("UPDATE users SET password_hash = :password WHERE id = :user_id");
        
        if ($update_stmt->execute(['password' => $hashed_password, 'user_id' => $userId])) {
            $logger = new \FlowSync\Utils\AuditLogger();
            $logger->log($userId, 'UPDATE_PASSWORD', 'USER', $userId, []);
            echo json_encode(['status' => 'success', 'message' => 'Password updated successfully']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Failed to update password']);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
}
