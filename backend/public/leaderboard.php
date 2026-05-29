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

$currentUserId = $session['user_id'];

try {
    // Get current user's department ID first
    $stmt = $db->prepare("
        SELECT department_id 
        FROM faculty_departments 
        WHERE user_id = :user_id
    ");
    $stmt->execute(['user_id' => $currentUserId]);
    $myDeptId = $stmt->fetchColumn();

    // 1. Get Top 10 Performers within the same department
    $stmt = $db->prepare("
        SELECT 
            u.id, 
            u.name, 
            u.email,
            u.profile_pic,
            d.name as dept_name,
            c.name as college_name,
            lp.total_points as total_score
        FROM leaderboard_points lp
        JOIN users u ON lp.user_id = u.id
        LEFT JOIN colleges c ON u.college_id = c.id
        JOIN faculty_departments fd ON u.id = fd.user_id
        LEFT JOIN departments d ON fd.department_id = d.id
        WHERE u.role_id = 3 -- Faculty only
          AND fd.department_id = :dept_id
        ORDER BY lp.total_points DESC, lp.tasks_completed DESC, lp.bonus_points DESC, lp.updated_at ASC
        LIMIT 10
    ");
    $stmt->execute(['dept_id' => $myDeptId]);
    $topPerformers = $stmt->fetchAll();

    // 2. Get Current User's Standing within their department
    $stmt = $db->prepare("
        SELECT lp.user_id, lp.total_points as total_score
        FROM leaderboard_points lp
        JOIN users u ON lp.user_id = u.id
        JOIN faculty_departments fd ON u.id = fd.user_id
        WHERE u.role_id = 3
          AND fd.department_id = :dept_id
        ORDER BY lp.total_points DESC, lp.tasks_completed DESC, lp.bonus_points DESC, lp.updated_at ASC
    ");
    $stmt->execute(['dept_id' => $myDeptId]);
    $rankings = $stmt->fetchAll();

    $myStanding = [
        'rank' => 'N/A',
        'score' => 0
    ];

    foreach ($rankings as $index => $row) {
        if ($row['user_id'] == $currentUserId) {
            $myStanding['rank'] = $index + 1;
            $myStanding['score'] = (int)$row['total_score'];
            break;
        }
    }

    echo json_encode([ 
        'status' => 'success',
        'data' => [
            'top_performers' => $topPerformers,
            'my_standing' => $myStanding
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
