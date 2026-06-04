<?php

use FlowSync\Config\Database;

try {
    require_once __DIR__ . '/bootstrap.php';

    $db = Database::getInstance()->getConnection();
    $auth = new \FlowSync\Auth\AuthService();
    $session = $auth->validateSession();

    if (!$session) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
        exit;
    }

    $userId = $session['user_id'];

    // 1. Merit Points (Total and Current Month)
    // 1. Merit Points (Total and Current Month)
    $stmt = $db->prepare("SELECT total_points FROM leaderboard_points WHERE user_id = :user_id AND season_id = :season_id");
    $stmt->execute(['user_id' => $userId, 'season_id' => $currentSeasonId]);
    $totalPoints = $stmt->fetchColumn() ?: 0;

    $stmt = $db->prepare("
        SELECT SUM(COALESCE(ta.points, t.points, 0) + COALESCE(ta.bonus_points, t.bonus_points, 0)) as month_points 
        FROM tasks t
        LEFT JOIN task_assignments ta ON t.id = ta.task_id AND ta.user_id = :uid1
        WHERE (t.assigned_to_id = :uid2 OR ta.user_id = :uid3)
        AND CAST(COALESCE(ta.status, t.status) AS CHAR) IN ('Completed', 'Approved')
        AND COALESCE(ta.completed_at, t.completed_at, t.updated_at) >= DATE_FORMAT(NOW() ,'%Y-%m-01')
        AND t.season_id = :season_id
    ");
    $stmt->execute(['uid1' => $userId, 'uid2' => $userId, 'uid3' => $userId, 'season_id' => $currentSeasonId]);
    $monthPoints = $stmt->fetchColumn() ?: 0;

    // 2. Active Missions
    $stmt = $db->prepare("
        SELECT COUNT(*) as total 
        FROM tasks t
        LEFT JOIN task_assignments ta ON t.id = ta.task_id AND ta.user_id = :uid1
        WHERE (t.assigned_to_id = :uid2 OR ta.user_id = :uid3)
        AND CAST(COALESCE(ta.status, t.status) AS CHAR) IN ('Assigned', 'Accepted', 'In Progress', 'Submitted', 'Under Review', 'Rework Required')
        AND t.season_id = :season_id
    ");
    $stmt->execute(['uid1' => $userId, 'uid2' => $userId, 'uid3' => $userId, 'season_id' => $currentSeasonId]);
    $activeTasks = $stmt->fetchColumn();
    
    // 3. Completed Missions
    $stmt = $db->prepare("
        SELECT COUNT(*) as total 
        FROM tasks t
        LEFT JOIN task_assignments ta ON t.id = ta.task_id AND ta.user_id = :uid1
        WHERE (t.assigned_to_id = :uid2 OR ta.user_id = :uid3)
        AND CAST(COALESCE(ta.status, t.status) AS CHAR) IN ('Completed', 'Approved')
        AND t.season_id = :season_id
    ");
    $stmt->execute(['uid1' => $userId, 'uid2' => $userId, 'uid3' => $userId, 'season_id' => $currentSeasonId]);
    $completedTasks = $stmt->fetchColumn();

    // 4. Pending Reviews
    $stmt = $db->prepare("
        SELECT COUNT(*) as total 
        FROM tasks t
        LEFT JOIN task_assignments ta ON t.id = ta.task_id AND ta.user_id = :uid1
        WHERE (t.assigned_to_id = :uid2 OR ta.user_id = :uid3)
        AND CAST(COALESCE(ta.status, t.status) AS CHAR) IN ('Submitted', 'Under Review')
        AND t.season_id = :season_id
    ");
    $stmt->execute(['uid1' => $userId, 'uid2' => $userId, 'uid3' => $userId, 'season_id' => $currentSeasonId]);
    $pendingReviews = $stmt->fetchColumn();

    // 5. Merit Goal Progress
    $meritGoal = 100;
    try {
        $stmt = $db->prepare("SELECT merit_goal FROM users WHERE id = :id");
        $stmt->execute(['id' => $userId]);
        $val = $stmt->fetchColumn();
        if ($val !== false) $meritGoal = $val;
    } catch (Exception $e) {
        $meritGoal = 100;
    }
    
    $goalProgress = ($meritGoal > 0) ? round(($monthPoints / $meritGoal) * 100) : 0;

    // 6. Recent Activity
    $stmt = $db->prepare("
        SELECT t.title, COALESCE(ta.status, t.status) as status, 
               COALESCE(ta.reviewed_at, ta.completed_at, ta.accepted_at, t.updated_at) as updated_at
        FROM tasks t
        LEFT JOIN task_assignments ta ON t.id = ta.task_id AND ta.user_id = :uid1
        WHERE (t.assigned_to_id = :uid2 OR ta.user_id = :uid3) AND t.season_id = :season_id
        ORDER BY updated_at DESC
        LIMIT 5
    ");
    $stmt->execute(['uid1' => $userId, 'uid2' => $userId, 'uid3' => $userId, 'season_id' => $currentSeasonId]);
    $recentActivity = $stmt->fetchAll();

    echo json_encode([
        'status' => 'success',
        'data' => [
            'stats' => [
                'total_points' => (int)$totalPoints,
                'month_points' => (int)$monthPoints,
                'active_tasks' => (int)$activeTasks,
                'completed_tasks' => (int)$completedTasks,
                'pending_reviews' => (int)$pendingReviews,
                'merit_goal' => (int)$meritGoal,
                'goal_progress' => $goalProgress
            ],
            'recent_activity' => $recentActivity
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error', 
        'message' => $e->getMessage()
    ]);
}
