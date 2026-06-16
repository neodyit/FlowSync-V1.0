<?php

require_once __DIR__ . '/../bootstrap.php';

use FlowSync\Utils\InstitutionAdminMiddleware;
use FlowSync\Config\Database;

// Verify user is Institution Admin
$session = InstitutionAdminMiddleware::check();
$collegeId = (int)$session['college_id'];

$db = Database::getInstance()->getConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method !== 'GET') {
        http_response_code(405);
        throw new Exception("Method not allowed");
    }

    // Always resolve active season ID for the current college/user context
    require_once __DIR__ . '/../../src/Utils/AcademicSeasonManager.php';
    $seasonId = \FlowSync\Utils\AcademicSeasonManager::getCurrentSeasonId($session['user_id']);

    if (!$seasonId) {
        throw new Exception("No active academic season defined");
    }

    // 1. Get Performers from ALL departments (no SQL limit so frontend can filter department-wise standings)
    $stmt = $db->prepare("
        SELECT 
            u.id, 
            u.name, 
            u.email,
            u.profile_pic,
            d.id as dept_id,
            d.name as dept_name,
            lp.total_points as total_score,
            lp.tasks_completed,
            lp.bonus_points
        FROM leaderboard_points lp
        JOIN users u ON lp.user_id = u.id
        LEFT JOIN faculty_departments fd ON u.id = fd.user_id
        LEFT JOIN departments d ON fd.department_id = d.id
        WHERE u.college_id = :college_id
          AND u.role_id = 3 -- Faculty only
          AND lp.season_id = :season_id
        ORDER BY lp.total_points DESC, lp.tasks_completed DESC, lp.bonus_points DESC, lp.updated_at ASC
    ");
    $stmt->execute(['college_id' => $collegeId, 'season_id' => $seasonId]);
    $top20 = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 2. Get Department-wise metrics report
    $stmt = $db->prepare("
        SELECT 
            d.id as dept_id,
            d.name as dept_name,
            COUNT(fd.user_id) as faculty_count,
            SUM(COALESCE(lp.total_points, 0)) as total_score,
            ROUND(AVG(COALESCE(lp.total_points, 0)), 1) as avg_score,
            SUM(COALESCE(lp.tasks_completed, 0)) as total_tasks_completed
        FROM departments d
        LEFT JOIN faculty_departments fd ON d.id = fd.department_id
        LEFT JOIN leaderboard_points lp ON fd.user_id = lp.user_id AND lp.season_id = :season_id
        WHERE d.college_id = :college_id
        GROUP BY d.id, d.name
        ORDER BY total_score DESC
    ");
    $stmt->execute(['college_id' => $collegeId, 'season_id' => $seasonId]);
    $deptReport = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'status' => 'success',
        'data' => [
            'top_performers' => $top20,
            'departments_report' => $deptReport
        ]
    ]);

} catch (Exception $e) {
    $code = $e->getCode();
    if ($code >= 400 && $code < 600) {
        http_response_code($code);
    } else {
        http_response_code(500);
    }
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
