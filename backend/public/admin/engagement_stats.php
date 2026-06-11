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
        $whereClauses = [];
        $params = [];

        if (!empty($_GET['college_id']) && $_GET['college_id'] !== 'all') {
            $whereClauses[] = "u.college_id = :college_id";
            $params['college_id'] = $_GET['college_id'];
        }
        if (!empty($_GET['department_id']) && $_GET['department_id'] !== 'all') {
            $whereClauses[] = "u.department_id = :department_id";
            $params['department_id'] = $_GET['department_id'];
        }
        if (!empty($_GET['role_id']) && $_GET['role_id'] !== 'all') {
            $whereClauses[] = "u.role_id = :role_id";
            $params['role_id'] = $_GET['role_id'];
        }
        if (!empty($_GET['filter_user_id']) && $_GET['filter_user_id'] !== 'all') {
            $whereClauses[] = "es.user_id = :filter_user_id";
            $params['filter_user_id'] = $_GET['filter_user_id'];
        }

        $whereSql = "";
        if (!empty($whereClauses)) {
            $whereSql = "WHERE " . implode(" AND ", $whereClauses);
        }

        // Stats: Total Users Tracked
        $totalUsersStmt = $db->prepare("SELECT COUNT(DISTINCT es.user_id) as total FROM engagement_sessions es JOIN users u ON es.user_id = u.id $whereSql");
        $totalUsersStmt->execute($params);
        $totalUsers = $totalUsersStmt->fetch()['total'];

        // Stats: Total Active Time (seconds)
        $totalTimeStmt = $db->prepare("SELECT SUM(es.active_time_seconds) as total FROM engagement_sessions es JOIN users u ON es.user_id = u.id $whereSql");
        $totalTimeStmt->execute($params);
        $totalTime = $totalTimeStmt->fetch()['total'];

        // Stats: Total Interactions
        $totalInteractionsStmt = $db->prepare("SELECT SUM(es.interaction_count) as total FROM engagement_sessions es JOIN users u ON es.user_id = u.id $whereSql");
        $totalInteractionsStmt->execute($params);
        $totalInteractions = $totalInteractionsStmt->fetch()['total'];

        // Stats: Top Pages by Active Time
        $topPagesStmt = $db->prepare("
            SELECT es.page_url, SUM(es.active_time_seconds) as total_time, SUM(es.interaction_count) as total_interactions
            FROM engagement_sessions es 
            JOIN users u ON es.user_id = u.id 
            $whereSql 
            GROUP BY es.page_url 
            ORDER BY total_time DESC 
            LIMIT 10
        ");
        $topPagesStmt->execute($params);
        $topPages = $topPagesStmt->fetchAll();

        // Stats: Recent Activity (last 7 days, group by day)
        $dailyActivityWhere = empty($whereClauses) 
            ? "WHERE es.timestamp >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)" 
            : "WHERE es.timestamp >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND " . implode(" AND ", $whereClauses);

        $dailyActivityStmt = $db->prepare("
            SELECT DATE(es.timestamp) as date, SUM(es.active_time_seconds) as total_time, COUNT(DISTINCT es.user_id) as active_users
            FROM engagement_sessions es
            JOIN users u ON es.user_id = u.id
            $dailyActivityWhere
            GROUP BY DATE(es.timestamp)
            ORDER BY date ASC
        ");
        $dailyActivityStmt->execute($params);
        $dailyActivity = $dailyActivityStmt->fetchAll();

        // Stats: Top 10 Most Active Users by Timeframe
        $timeframes = [
            'all' => '',
            'today' => "es.timestamp >= CURDATE()",
            'yesterday' => "es.timestamp >= DATE_SUB(CURDATE(), INTERVAL 1 DAY) AND es.timestamp < CURDATE()",
            '7days' => "es.timestamp >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)",
            '30days' => "es.timestamp >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)"
        ];

        $topUsersByTimeframe = [];

        foreach ($timeframes as $key => $timeCondition) {
            $tempClauses = $whereClauses;
            if (!empty($timeCondition)) {
                $tempClauses[] = $timeCondition;
            }
            
            $tempWhereSql = "";
            if (!empty($tempClauses)) {
                $tempWhereSql = "WHERE " . implode(" AND ", $tempClauses);
            }
            
            $topUsersStmt = $db->prepare("
                SELECT 
                    u.id, 
                    u.name, 
                    u.email, 
                    r.name as role_name,
                    COALESCE(SUM(es.active_time_seconds), 0) as total_time,
                    COALESCE(SUM(es.interaction_count), 0) as total_interactions
                FROM users u
                JOIN roles r ON u.role_id = r.id
                JOIN engagement_sessions es ON es.user_id = u.id
                $tempWhereSql
                GROUP BY u.id
                HAVING total_time > 0
                ORDER BY total_time DESC
            ");
            $topUsersStmt->execute($params);
            $rows = $topUsersStmt->fetchAll();
            
            foreach ($rows as &$u_data) {
                $u_data['id'] = (int)$u_data['id'];
                $u_data['total_time'] = (int)$u_data['total_time'];
                $u_data['total_interactions'] = (int)$u_data['total_interactions'];
            }
            
            $topUsersByTimeframe[$key] = $rows;
        }

        echo json_encode([
            'status' => 'success',
            'data' => [
                'total_users_tracked' => (int)$totalUsers,
                'total_active_time_seconds' => (int)$totalTime,
                'total_interactions' => (int)$totalInteractions,
                'top_pages' => $topPages,
                'daily_activity' => $dailyActivity,
                'top_users' => $topUsersByTimeframe
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
