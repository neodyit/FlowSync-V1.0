<?php

require_once __DIR__ . '/../bootstrap.php';

use FlowSync\Config\Database;

try {
    $db = Database::getInstance()->getConnection();
    $auth = new \FlowSync\Auth\AuthService();
    $session = $auth->validateSession();

    if (!$session || $session['role'] !== 'HOD') {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Unauthorized or Not an HOD']);
        exit;
    }

    $hodId = $session['user_id'];

    // 1. Get HOD's College and Department context
    $stmt = $db->prepare("
        SELECT d.id as department_id, u.college_id 
        FROM users u
        LEFT JOIN departments d ON u.id = d.hod_id
        WHERE u.id = :id
    ");
    $stmt->execute(['id' => $hodId]);
    $context = $stmt->fetch();

    if (!$context) {
        throw new Exception("HOD context not found");
    }

    $collegeId = $context['college_id'];
    $myDeptId = $context['department_id'];

    // 2. Departmental Comparison (Within the same College)
    $stmt = $db->prepare("
        SELECT 
            d.id,
            d.name as dept_name,
            COUNT(DISTINCT fd.user_id) as total_faculty,
            SUM(COALESCE(lp.total_points, 0)) as total_score,
            SUM(COALESCE(lp.tasks_completed, 0)) as completed_tasks
        FROM departments d
        LEFT JOIN faculty_departments fd ON d.id = fd.department_id
        LEFT JOIN leaderboard_points lp ON fd.user_id = lp.user_id AND lp.season_id = :season_id
        WHERE d.college_id = :college_id
        GROUP BY d.id
        ORDER BY total_score DESC
    ");
    $stmt->execute(['college_id' => $collegeId, 'season_id' => $currentSeasonId]);
    $deptRankings = $stmt->fetchAll();

    // 3. Faculty Leaderboard (Within the HOD's Department)
    $stmt = $db->prepare("
        SELECT 
            u.id, 
            u.name, 
            u.profile_pic,
            d.name as dept_name,
            COALESCE(lp.total_points, 0) as total_score,
            fd.department_id
        FROM users u
        JOIN leaderboard_points lp ON u.id = lp.user_id AND lp.season_id = :season_id
        LEFT JOIN faculty_departments fd ON u.id = fd.user_id
        LEFT JOIN departments d ON fd.department_id = d.id
        WHERE u.role_id = 3
          AND fd.department_id = :dept_id
        ORDER BY total_score DESC, COALESCE(lp.tasks_completed, 0) DESC, COALESCE(lp.bonus_points, 0) DESC, lp.updated_at ASC
        LIMIT 20
    ");
    $stmt->execute(['dept_id' => $myDeptId, 'season_id' => $currentSeasonId]);
    $facultyLeaderboard = $stmt->fetchAll();

    echo json_encode([
        'status' => 'success',
        'data' => [
            'college_rankings' => $deptRankings,
            'faculty_leaderboard' => $facultyLeaderboard,
            'my_dept_id' => (int)$myDeptId
        ]
    ]);

} catch (Exception $e) {
    file_put_contents(__DIR__ . '/../debug_error.log', date('Y-m-d H:i:s') . ' - Leaderboard Error: ' . $e->getMessage() . "\n" . $e->getTraceAsString() . "\n\n", FILE_APPEND);
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
