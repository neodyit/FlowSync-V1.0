<?php
require_once __DIR__ . '/../bootstrap.php';

use FlowSync\Config\Database;
use FlowSync\Auth\AuthService;

$db = Database::getInstance()->getConnection();
$auth = new AuthService();
$session = $auth->validateSession();

if (!$session) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit;
}

// Ensure the user is an admin
$userId = $session['user_id'];
$stmt = $db->prepare("SELECT r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = :user_id");
$stmt->execute(['user_id' => $userId]);
$user = $stmt->fetch();

if (!$user || $user['role_name'] !== 'Admin') {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Forbidden']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        // Stats: Total Users Tracked
        $totalUsersStmt = $db->query("SELECT COUNT(DISTINCT user_id) as total FROM engagement_sessions");
        $totalUsers = $totalUsersStmt->fetch()['total'];

        // Stats: Total Active Time (seconds)
        $totalTimeStmt = $db->query("SELECT SUM(active_time_seconds) as total FROM engagement_sessions");
        $totalTime = $totalTimeStmt->fetch()['total'];

        // Stats: Top Pages by Active Time
        $topPagesStmt = $db->query("
            SELECT page_url, SUM(active_time_seconds) as total_time, SUM(interaction_count) as total_interactions
            FROM engagement_sessions 
            GROUP BY page_url 
            ORDER BY total_time DESC 
            LIMIT 10
        ");
        $topPages = $topPagesStmt->fetchAll();

        // Stats: Recent Activity (last 7 days, group by day)
        $dailyActivityStmt = $db->query("
            SELECT DATE(timestamp) as date, SUM(active_time_seconds) as total_time, COUNT(DISTINCT user_id) as active_users
            FROM engagement_sessions
            WHERE timestamp >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY DATE(timestamp)
            ORDER BY date ASC
        ");
        $dailyActivity = $dailyActivityStmt->fetchAll();

        echo json_encode([
            'status' => 'success',
            'data' => [
                'total_users_tracked' => (int)$totalUsers,
                'total_active_time_seconds' => (int)$totalTime,
                'top_pages' => $topPages,
                'daily_activity' => $dailyActivity
            ]
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method Not Allowed']);
}
