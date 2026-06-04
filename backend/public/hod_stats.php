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
 
    // Get HOD's department ID
    $stmt = $db->prepare("SELECT id FROM departments WHERE hod_id = :id LIMIT 1");
    $stmt->execute(['id' => $userId]);
    $dept = $stmt->fetch();

    if (!$dept) {
        // Fallback to faculty_departments if not a primary HOD
        $stmt = $db->prepare("SELECT department_id FROM faculty_departments WHERE user_id = :id LIMIT 1");
        $stmt->execute(['id' => $userId]);
        $dept = $stmt->fetch();
    }

    if (!$dept) {
        echo json_encode([
            'status' => 'success',
            'data' => [
                'stats' => [
                    'total_faculty' => 0,
                    'active_tasks' => 0,
                    'pending_reviews' => 0,
                    'dept_points' => 0,
                    'task_completion_rate' => 0,
                    'research_output_rate' => 0
                ],
                'recent_activity' => []
            ]
        ]);
        exit;
    }

    $deptId = $dept['id'] ?? $dept['department_id'];

    // 1. Total Faculty in Department
    $stmt = $db->prepare("SELECT COUNT(*) FROM users u JOIN faculty_departments fd ON u.id = fd.user_id WHERE fd.department_id = :dept_id AND u.role_id = 3 AND u.is_active = 1");
    $stmt->execute(['dept_id' => $deptId]);
    $totalFaculty = $stmt->fetchColumn() ?: 0;

    // 2. Active Tasks (Assigned, Accepted, In Progress, Submitted, Under Review, Rework Required)
    $stmt = $db->prepare("
        SELECT COUNT(*) 
        FROM tasks 
        WHERE department_id = :dept_id AND season_id = :season_id
        AND CAST(status AS CHAR) IN ('Assigned', 'Accepted', 'In Progress', 'Submitted', 'Under Review', 'Rework Required')
    ");
    $stmt->execute(['dept_id' => $deptId, 'season_id' => $currentSeasonId]);
    $activeTasks = $stmt->fetchColumn() ?: 0;

    // 3. Pending Reviews
    $stmt = $db->prepare("
        SELECT COUNT(*) 
        FROM tasks 
        WHERE department_id = :dept_id AND season_id = :season_id
        AND status = 'Under Review'
    ");
    $stmt->execute(['dept_id' => $deptId, 'season_id' => $currentSeasonId]);
    $pendingReviews = $stmt->fetchColumn() ?: 0;

    // 4. Department Points (Sum of all faculty points)
    $stmt = $db->prepare("
        SELECT SUM(lp.total_points) 
        FROM leaderboard_points lp
        JOIN users u ON lp.user_id = u.id
        JOIN faculty_departments fd ON u.id = fd.user_id
        WHERE fd.department_id = :dept_id
        AND u.role_id = 3
        AND lp.season_id = :season_id
    ");
    $stmt->execute(['dept_id' => $deptId, 'season_id' => $currentSeasonId]);
    $deptPoints = $stmt->fetchColumn() ?: 0;

    // 5. Institutional Excellence Metrics
    // Task Completion Rate
    $stmt = $db->prepare("SELECT COUNT(*) FROM tasks WHERE department_id = :dept_id AND season_id = :season_id AND status = 'Completed'");
    $stmt->execute(['dept_id' => $deptId, 'season_id' => $currentSeasonId]);
    $completedTasksCount = $stmt->fetchColumn();

    $stmt = $db->prepare("SELECT COUNT(*) FROM tasks WHERE department_id = :dept_id AND season_id = :season_id AND status != 'Draft'");
    $stmt->execute(['dept_id' => $deptId, 'season_id' => $currentSeasonId]);
    $totalTasksCount = $stmt->fetchColumn();

    $taskCompletionRate = ($totalTasksCount > 0) ? round(($completedTasksCount / $totalTasksCount) * 100) : 0;

    // Research Output (Research tasks completed vs total research tasks)
    $stmt = $db->prepare("SELECT COUNT(*) FROM tasks WHERE department_id = :dept_id AND season_id = :season_id AND task_type = 'Research' AND status = 'Completed'");
    $stmt->execute(['dept_id' => $deptId, 'season_id' => $currentSeasonId]);
    $completedResearchCount = $stmt->fetchColumn();

    $stmt = $db->prepare("SELECT COUNT(*) FROM tasks WHERE department_id = :dept_id AND season_id = :season_id AND task_type = 'Research' AND status != 'Draft'");
    $stmt->execute(['dept_id' => $deptId, 'season_id' => $currentSeasonId]);
    $totalResearchCount = $stmt->fetchColumn();

    $researchOutputRate = ($totalResearchCount > 0) ? round(($completedResearchCount / $totalResearchCount) * 100) : 0;

    // 6. Recent Activity
    $stmt = $db->prepare("
        SELECT t.title, t.status, t.updated_at, u.name as assigned_to
        FROM tasks t
        LEFT JOIN users u ON t.assigned_to_id = u.id
        WHERE t.department_id = :dept_id AND t.season_id = :season_id
        ORDER BY t.updated_at DESC
        LIMIT 5
    ");
    $stmt->execute(['dept_id' => $deptId, 'season_id' => $currentSeasonId]);
    $recentActivity = $stmt->fetchAll();

    echo json_encode([
        'status' => 'success',
        'data' => [
            'stats' => [
                'total_faculty' => (int)$totalFaculty,
                'active_tasks' => (int)$activeTasks,
                'pending_reviews' => (int)$pendingReviews,
                'dept_points' => (int)$deptPoints,
                'task_completion_rate' => $taskCompletionRate,
                'research_output_rate' => $researchOutputRate
            ],
            'recent_activity' => $recentActivity
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
