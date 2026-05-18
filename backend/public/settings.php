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

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $stmt = $db->prepare("
            SELECT notification_settings, quiet_hours_start, quiet_hours_end, 
                   expertise_tags, office_hours, availability_status, merit_goal, profile_pic
            FROM users WHERE id = :user_id
        ");
        $stmt->execute(['user_id' => $userId]);
        $settings = $stmt->fetch();

        // Fetch active sessions
        $session_stmt = $db->prepare("SELECT id, token_id, ip_address, user_agent, created_at, expires_at FROM sessions WHERE user_id = :user_id AND expires_at > NOW()");
        $session_stmt->execute(['user_id' => $userId]);
        $sessions = $session_stmt->fetchAll();

        // Fetch current month points for the user
        $points_stmt = $db->prepare("
            SELECT SUM(points + bonus_points) as current_month_points
            FROM tasks 
            WHERE assigned_to_id = :user_id
            AND status IN ('Completed', 'Approved')
            AND COALESCE(completed_at, updated_at) >= DATE_FORMAT(NOW() ,'%Y-%m-01')
        ");
        $points_stmt->execute(['user_id' => $userId]);
        $points_data = $points_stmt->fetch();
        $currentMonthPoints = (int)($points_data['current_month_points'] ?? 0);

        echo json_encode([
            'status' => 'success',
            'data' => [
                'settings' => $settings,
                'sessions' => $sessions,
                'current_token' => $session['jti'] ?? null,
                'current_points' => $currentMonthPoints
            ]
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $allowed_fields = [
        'notification_settings', 'quiet_hours_start', 'quiet_hours_end', 
        'expertise_tags', 'office_hours', 'availability_status', 'merit_goal'
    ];

    $updates = [];
    $values = [];

    foreach ($data as $key => $value) {
        if (in_array($key, $allowed_fields)) {
            if ($key === 'notification_settings' && is_array($value)) {
                $value = json_encode($value);
            }
            $updates[] = "$key = :$key";
            $values[$key] = $value;
        }
    }

    if (empty($updates)) {
        echo json_encode(['status' => 'error', 'message' => 'No valid fields provided']);
        exit;
    }

    $values['user_id'] = $userId;

    try {
        $sql = "UPDATE users SET " . implode(", ", $updates) . " WHERE id = :user_id";
        $stmt = $db->prepare($sql);
        
        if ($stmt->execute($values)) {
            echo json_encode(['status' => 'success', 'message' => 'Settings updated successfully']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Update failed']);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $session_id = $_GET['id'] ?? null;
    $all = $_GET['all'] ?? null;

    try {
        if ($all) {
            $stmt = $db->prepare("DELETE FROM sessions WHERE user_id = :user_id AND token_id != :current_token");
            $token = $session['jti'] ?? '';
            $stmt->execute(['user_id' => $userId, 'current_token' => $token]);
        } else if ($session_id) {
            $stmt = $db->prepare("DELETE FROM sessions WHERE id = :id AND user_id = :user_id");
            $stmt->execute(['id' => $session_id, 'user_id' => $userId]);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Session ID required']);
            exit;
        }

        echo json_encode(['status' => 'success', 'message' => 'Session(s) invalidated']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
}
