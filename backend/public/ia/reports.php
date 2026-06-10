<?php

require_once __DIR__ . '/../bootstrap.php';

use FlowSync\Utils\InstitutionAdminMiddleware;
use FlowSync\Config\Database;
use FlowSync\Utils\FeatureService;

// Verify user is Institution Admin
$session = InstitutionAdminMiddleware::check();
$collegeId = (int)$session['college_id'];
$seasonId = $currentSeasonId;

$db = Database::getInstance()->getConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method !== 'GET') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
        exit;
    }

    if (!FeatureService::isEnabled($collegeId, 'reporting_department')) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Reporting features are disabled for your institution.']);
        exit;
    }

    if (!$seasonId) {
        throw new Exception("No active academic season found.");
    }

    // 1. Department Reports
    $deptStmt = $db->prepare("
        SELECT 
            d.id, d.name, d.code,
            (SELECT COUNT(*) FROM tasks t WHERE t.department_id = d.id AND t.season_id = :sid1 AND t.status != 'Draft') as total_tasks,
            (SELECT COUNT(*) FROM tasks t WHERE t.department_id = d.id AND t.season_id = :sid2 AND t.status = 'Completed') as completed_tasks,
            (SELECT COUNT(*) FROM tasks t WHERE t.department_id = d.id AND t.season_id = :sid3 AND t.status IN ('Assigned', 'Accepted', 'In Progress', 'Rework Required', 'Under Review')) as pending_tasks,
            (
                SELECT IFNULL(SUM(lp.total_points), 0) 
                FROM leaderboard_points lp
                JOIN users usr ON lp.user_id = usr.id
                JOIN faculty_departments fd ON usr.id = fd.user_id
                WHERE fd.department_id = d.id AND lp.season_id = :sid4
            ) as engagement_score
        FROM departments d
        WHERE d.college_id = :cid
        ORDER BY d.name ASC
    ");
    $deptStmt->execute([
        'cid' => $collegeId,
        'sid1' => $seasonId,
        'sid2' => $seasonId,
        'sid3' => $seasonId,
        'sid4' => $seasonId
    ]);
    $departmentsReport = $deptStmt->fetchAll();

    // 2. Faculty Reports
    $facultyStmt = $db->prepare("
        SELECT 
            u.id, u.name, u.email,
            d.name as department_name,
            (SELECT COUNT(*) FROM task_assignments ta JOIN tasks t ON ta.task_id = t.id WHERE ta.user_id = u.id AND t.season_id = :sid1) as assigned_tasks,
            IFNULL(ROUND((
                (SELECT COUNT(*) FROM task_assignments ta JOIN tasks t ON ta.task_id = t.id WHERE ta.user_id = u.id AND ta.status IN ('Approved', 'Completed') AND t.season_id = :sid2) / 
                NULLIF((SELECT COUNT(*) FROM task_assignments ta JOIN tasks t ON ta.task_id = t.id WHERE ta.user_id = u.id AND t.season_id = :sid3), 0)
            ) * 100), 0) as completion_rate,
            (
                SELECT COUNT(*) 
                FROM task_reviews tr 
                JOIN tasks t ON tr.task_id = t.id 
                JOIN task_assignments ta ON ta.task_id = t.id 
                WHERE ta.user_id = u.id AND tr.status = 'Rework Required' AND t.season_id = :sid4
            ) as rework_count,
            IFNULL(lp.total_points, 0) as points_earned
        FROM users u
        LEFT JOIN faculty_departments fd ON u.id = fd.user_id
        LEFT JOIN departments d ON fd.department_id = d.id
        LEFT JOIN leaderboard_points lp ON u.id = lp.user_id AND lp.season_id = :sid5
        WHERE u.college_id = :cid AND u.role_id = 3 AND u.is_active = 1
        ORDER BY points_earned DESC, u.name ASC
    ");
    $facultyStmt->execute([
        'cid' => $collegeId,
        'sid1' => $seasonId,
        'sid2' => $seasonId,
        'sid3' => $seasonId,
        'sid4' => $seasonId,
        'sid5' => $seasonId
    ]);
    $facultyReport = $facultyStmt->fetchAll();

    // 3. HOD Reports
    $hodStmt = $db->prepare("
        SELECT 
            u.id, u.name, u.email,
            d.name as department_name,
            IFNULL(ROUND((
                (SELECT COUNT(*) FROM tasks t WHERE t.department_id = d.id AND t.status = 'Completed' AND t.season_id = :sid1) / 
                NULLIF((SELECT COUNT(*) FROM tasks t WHERE t.department_id = d.id AND t.status != 'Draft' AND t.season_id = :sid2), 0)
            ) * 100), 0) as department_performance,
            (
                SELECT IFNULL(SUM(lp.total_points), 0) 
                FROM leaderboard_points lp
                JOIN users usr ON lp.user_id = usr.id
                JOIN faculty_departments fd ON usr.id = fd.user_id
                WHERE fd.department_id = d.id AND lp.season_id = :sid3
            ) as team_productivity,
            (
                SELECT COUNT(*) 
                FROM task_reviews tr
                JOIN tasks t ON tr.task_id = t.id
                WHERE tr.reviewer_id = u.id AND t.season_id = :sid4
            ) as approval_metrics
        FROM users u
        LEFT JOIN departments d ON d.hod_id = u.id
        WHERE u.college_id = :cid AND u.role_id = 2 AND u.is_active = 1
        ORDER BY u.name ASC
    ");
    $hodStmt->execute([
        'cid' => $collegeId,
        'sid1' => $seasonId,
        'sid2' => $seasonId,
        'sid3' => $seasonId,
        'sid4' => $seasonId
    ]);
    $hodReport = $hodStmt->fetchAll();

    echo json_encode([
        'status' => 'success',
        'data' => [
            'departments' => $departmentsReport,
            'faculty' => $facultyReport,
            'hods' => $hodReport
        ]
    ]);

} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
