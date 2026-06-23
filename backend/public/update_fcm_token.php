<?php
// backend/public/update_fcm_token.php
require_once __DIR__ . '/bootstrap.php';

use FlowSync\Config\Database;
use FlowSync\Auth\AuthService;

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    error_log("update_fcm_token.php: Invalid request method " . $_SERVER['REQUEST_METHOD']);
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method']);
    exit;
}

$auth = new AuthService();
$session = $auth->validateSession();

if (!$session) {
    http_response_code(401);
    error_log("update_fcm_token.php: Unauthorized. Cookie: " . ($_SERVER['HTTP_COOKIE'] ?? 'None'));
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized.']);
    exit;
}

$user_id = $session['user_id'];
$fcm_token = $_POST['fcm_token'] ?? '';

if (empty($fcm_token)) {
    http_response_code(400);
    error_log("update_fcm_token.php: FCM token is required. POST Data: " . print_r($_POST, true));
    echo json_encode(['status' => 'error', 'message' => 'FCM token is required']);
    exit;
}

$db = Database::getInstance()->getConnection();
$stmt = $db->prepare("UPDATE users SET fcm_token = :token WHERE id = :id");

if ($stmt->execute(['token' => $fcm_token, 'id' => $user_id])) {
    error_log("update_fcm_token.php: Token saved successfully for user $user_id");
    echo json_encode(['status' => 'success', 'message' => 'FCM token updated successfully']);
} else {
    http_response_code(500);
    error_log("update_fcm_token.php: DB Error: " . implode(" ", $stmt->errorInfo()));
    echo json_encode(['status' => 'error', 'message' => 'Database update failed']);
}
?>
