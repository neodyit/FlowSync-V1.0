<?php

require_once __DIR__ . '/../bootstrap.php';

use FlowSync\Utils\HODMiddleware;
use FlowSync\Config\Database;

$session = HODMiddleware::check();
$db = Database::getInstance()->getConnection();

// Auto-migration for category column
try {
    $check = $db->query("SHOW COLUMNS FROM tasks LIKE 'category'");
    if ($check->rowCount() == 0) {
        $db->exec("ALTER TABLE tasks ADD COLUMN category VARCHAR(50) DEFAULT 'General' AFTER task_type");
    }
} catch (Exception $e) {
    // Ignore if already exists or other issues, main queries will fail later if critical
}

try {
    // Get HOD's department context
    $stmt = $db->prepare("
        SELECT d.id as department_id
        FROM departments d
        WHERE d.hod_id = :user_id
        LIMIT 1
    ");
    $stmt->execute(['user_id' => $session['user_id']]);
    $hodDept = $stmt->fetch();

    if (!$hodDept) {
        throw new Exception("You are not assigned as an HOD to any department.");
    }
    $deptId = $hodDept['department_id'];

    // 1. Task Stats Summary
    $statsStmt = $db->prepare("
        SELECT 
            COUNT(*) as total_tasks,
            SUM(CASE WHEN status IN ('Completed', 'Approved') THEN 1 ELSE 0 END) as completed_tasks,
            SUM(CASE WHEN status IN ('Assigned', 'Accepted', 'In Progress', 'Broadcasted') THEN 1 ELSE 0 END) as active_tasks,
            SUM(CASE WHEN deadline < NOW() AND status NOT IN ('Completed', 'Approved') THEN 1 ELSE 0 END) as overdue_tasks,
            SUM(CASE WHEN status IN ('Submitted', 'Under Review') THEN 1 ELSE 0 END) as pending_review
        FROM tasks 
        WHERE department_id = :dept_id
    ");
    $statsStmt->execute(['dept_id' => $deptId]);
    $stats = $statsStmt->fetch();

    // 2. Faculty Performance & Workload
    $facultyStmt = $db->prepare("
        SELECT 
            u.id, u.name, u.email, u.profile_pic,
            lp.total_points, lp.tasks_completed,
            (SELECT COUNT(*) FROM task_assignments ta JOIN tasks t ON ta.task_id = t.id WHERE ta.user_id = u.id AND ta.status IN ('Accepted', 'In Progress', 'Rework Required')) as active_load,
            (SELECT COUNT(*) FROM task_assignments ta JOIN tasks t ON ta.task_id = t.id WHERE ta.user_id = u.id AND ta.status = 'Approved' AND ta.completed_at <= t.deadline) as on_time_count,
            (SELECT COUNT(*) FROM task_assignments ta JOIN tasks t ON ta.task_id = t.id WHERE ta.user_id = u.id AND ta.status = 'Approved' AND ta.completed_at > t.deadline) as late_count
        FROM users u
        JOIN faculty_departments fd ON u.id = fd.user_id
        LEFT JOIN leaderboard_points lp ON u.id = lp.user_id
        WHERE fd.department_id = :dept_id AND u.role_id = 3
        ORDER BY lp.total_points DESC
    ");
    $facultyStmt->execute(['dept_id' => $deptId]);
    $facultyPerformance = $facultyStmt->fetchAll();

    // 3. Category Distribution
    $categoryStmt = $db->prepare("
        SELECT category as name, COUNT(*) as value
        FROM tasks 
        WHERE department_id = :dept_id
        GROUP BY category
    ");
    $categoryStmt->execute(['dept_id' => $deptId]);
    $categoryDist = $categoryStmt->fetchAll();

    // 4. Rework Analysis
    $reworkStmt = $db->prepare("
        SELECT 
            COUNT(*) as total_reviews,
            SUM(CASE WHEN tr.status = 'Rework Required' THEN 1 ELSE 0 END) as rework_count
        FROM task_reviews tr
        JOIN tasks t ON tr.task_id = t.id
        WHERE t.department_id = :dept_id
    ");
    $reworkStmt->execute(['dept_id' => $deptId]);
    $reworkStats = $reworkStmt->fetch();

    // 5. Monthly Completion Trend
    $trendStmt = $db->prepare("
        SELECT 
            DATE_FORMAT(ta.completed_at, '%b %Y') as month,
            COUNT(DISTINCT ta.task_id) as count
        FROM task_assignments ta
        JOIN tasks t ON ta.task_id = t.id
        WHERE t.department_id = :dept_id 
        AND ta.status = 'Approved'
        AND ta.completed_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        GROUP BY YEAR(ta.completed_at), MONTH(ta.completed_at), month
        ORDER BY YEAR(ta.completed_at) ASC, MONTH(ta.completed_at) ASC
    ");
    $trendStmt->execute(['dept_id' => $deptId]);
    $completionTrend = $trendStmt->fetchAll();

    // 6. Detailed Pending Work List
    $pendingListStmt = $db->prepare("
        SELECT 
            u.name as faculty_name, u.profile_pic,
            t.title as task_title, t.category, t.priority, t.deadline,
            ta.status as assignment_status, ta.progress
        FROM task_assignments ta
        JOIN tasks t ON ta.task_id = t.id
        JOIN users u ON ta.user_id = u.id
        WHERE t.department_id = :dept_id 
        AND ta.status IN ('Accepted', 'In Progress', 'Rework Required', 'Submitted')
        ORDER BY t.deadline ASC
    ");
    $pendingListStmt->execute(['dept_id' => $deptId]);
    $pendingWorkList = $pendingListStmt->fetchAll();

    echo json_encode([
        'status' => 'success',
        'data' => [
            'stats' => $stats,
            'faculty_performance' => $facultyPerformance,
            'category_distribution' => $categoryDist,
            'rework_stats' => $reworkStats,
            'trend' => $completionTrend,
            'pending_list' => $pendingWorkList
        ]
    ]);

} catch (Throwable $e) {
    file_put_contents(__DIR__ . '/error_log.txt', $e->getMessage() . "\n" . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
