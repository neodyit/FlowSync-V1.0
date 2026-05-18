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
    // 1. Get Top 10 Performers
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
        LEFT JOIN faculty_departments fd ON u.id = fd.user_id
        LEFT JOIN departments d ON fd.department_id = d.id
        WHERE u.role_id = 3 -- Faculty only
        ORDER BY lp.total_points DESC
        LIMIT 10
    ");
    $stmt->execute();
    $topPerformers = $stmt->fetchAll();

    // 2. Get Current User's Global Standing
    $stmt = $db->prepare("
        SELECT user_id, total_points as total_score
        FROM leaderboard_points
        ORDER BY total_points DESC
    ");
    $stmt->execute();
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
