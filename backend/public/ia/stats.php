<?php

require_once __DIR__ . '/../bootstrap.php';

use FlowSync\Utils\InstitutionAdminMiddleware;
use FlowSync\Config\Database;

// Verify that user is Institution Admin
$session = InstitutionAdminMiddleware::check();
$collegeId = (int)$session['college_id'];
$seasonId = $currentSeasonId;

try {
    $db = Database::getInstance()->getConnection();

    // 1. Core Overview Counts
    // Count departments
    $stmt = $db->prepare("SELECT COUNT(*) FROM departments WHERE college_id = :cid");
    $stmt->execute(['cid' => $collegeId]);
    $totalDepartments = (int)$stmt->fetchColumn();

    // Count HODs
    $stmt = $db->prepare("SELECT COUNT(*) FROM users WHERE role_id = 2 AND college_id = :cid AND is_active = 1");
    $stmt->execute(['cid' => $collegeId]);
    $totalHODs = (int)$stmt->fetchColumn();

    // Count Faculty
    $stmt = $db->prepare("SELECT COUNT(*) FROM users WHERE role_id = 3 AND college_id = :cid AND is_active = 1");
    $stmt->execute(['cid' => $collegeId]);
    $totalFaculty = (int)$stmt->fetchColumn();

    // Count Tasks (Active, Completed, Pending)
    $activeTasksCount = 0;
    $completedTasksCount = 0;
    $pendingTasksCount = 0;

    if ($seasonId) {
        // Active Tasks (not completed, draft, archived, declined)
        $stmt = $db->prepare("
            SELECT COUNT(*) FROM tasks 
            WHERE college_id = :cid AND season_id = :sid 
            AND status NOT IN ('Completed', 'Draft', 'Expired', 'Declined')
        ");
        $stmt->execute(['cid' => $collegeId, 'sid' => $seasonId]);
        $activeTasksCount = (int)$stmt->fetchColumn();

        // Completed Tasks
        $stmt = $db->prepare("
            SELECT COUNT(*) FROM tasks 
            WHERE college_id = :cid AND season_id = :sid AND status = 'Completed'
        ");
        $stmt->execute(['cid' => $collegeId, 'sid' => $seasonId]);
        $completedTasksCount = (int)$stmt->fetchColumn();

        // Pending Tasks (Assigned, Accepted, In Progress, Rework Required)
        $stmt = $db->prepare("
            SELECT COUNT(*) FROM tasks 
            WHERE college_id = :cid AND season_id = :sid 
            AND status IN ('Assigned', 'Accepted', 'In Progress', 'Rework Required', 'Under Review')
        ");
        $stmt->execute(['cid' => $collegeId, 'sid' => $seasonId]);
        $pendingTasksCount = (int)$stmt->fetchColumn();
    }

    // 2. Task Insights (due today, due tomorrow, overdue)
    $dueToday = 0;
    $dueTomorrow = 0;
    $overdue = 0;

    if ($seasonId) {
        // Due Today
        $stmt = $db->prepare("
            SELECT COUNT(*) FROM tasks 
            WHERE college_id = :cid AND season_id = :sid 
            AND status NOT IN ('Completed', 'Draft', 'Expired', 'Declined') 
            AND DATE(deadline) = CURDATE()
        ");
        $stmt->execute(['cid' => $collegeId, 'sid' => $seasonId]);
        $dueToday = (int)$stmt->fetchColumn();

        // Due Tomorrow
        $stmt = $db->prepare("
            SELECT COUNT(*) FROM tasks 
            WHERE college_id = :cid AND season_id = :sid 
            AND status NOT IN ('Completed', 'Draft', 'Expired', 'Declined') 
            AND DATE(deadline) = DATE_ADD(CURDATE(), INTERVAL 1 DAY)
        ");
        $stmt->execute(['cid' => $collegeId, 'sid' => $seasonId]);
        $dueTomorrow = (int)$stmt->fetchColumn();

        // Overdue
        $stmt = $db->prepare("
            SELECT COUNT(*) FROM tasks 
            WHERE college_id = :cid AND season_id = :sid 
            AND status NOT IN ('Completed', 'Draft', 'Expired', 'Declined') 
            AND deadline < NOW()
        ");
        $stmt->execute(['cid' => $collegeId, 'sid' => $seasonId]);
        $overdue = (int)$stmt->fetchColumn();
    }

    // 3. Engagement Insights (Most/Least active departments, Top Faculty, Top HOD)
    $mostActiveDept = null;
    $leastActiveDept = null;
    $topFaculty = null;
    $topHOD = null;

    if ($seasonId) {
        // Fetch departments ordered by task completion rate
        $stmt = $db->prepare("
            SELECT 
                d.name,
                COUNT(t.id) as total_tasks,
                SUM(CASE WHEN t.status = 'Completed' THEN 1 ELSE 0 END) as completed_tasks,
                IFNULL(ROUND((SUM(CASE WHEN t.status = 'Completed' THEN 1 ELSE 0 END) / COUNT(t.id)) * 100), 0) as completion_rate
            FROM departments d
            LEFT JOIN tasks t ON d.id = t.department_id AND t.season_id = :sid
            WHERE d.college_id = :cid
            GROUP BY d.id, d.name
            ORDER BY completion_rate DESC, total_tasks DESC
        ");
        $stmt->execute(['cid' => $collegeId, 'sid' => $seasonId]);
        $deptsEngagement = $stmt->fetchAll();

        if (count($deptsEngagement) > 0) {
            $mostActiveDept = $deptsEngagement[0]['name'] . ' (' . $deptsEngagement[0]['completion_rate'] . '%)';
            $leastActiveDept = $deptsEngagement[count($deptsEngagement) - 1]['name'] . ' (' . $deptsEngagement[count($deptsEngagement) - 1]['completion_rate'] . '%)';
        }

        // Top Faculty
        $stmt = $db->prepare("
            SELECT u.name, IFNULL(lp.total_points, 0) as points
            FROM users u
            LEFT JOIN leaderboard_points lp ON u.id = lp.user_id AND lp.season_id = :sid
            WHERE u.college_id = :cid AND u.role_id = 3
            ORDER BY points DESC
            LIMIT 1
        ");
        $stmt->execute(['cid' => $collegeId, 'sid' => $seasonId]);
        $topFacultyRow = $stmt->fetch();
        if ($topFacultyRow && $topFacultyRow['points'] > 0) {
            $topFaculty = $topFacultyRow['name'] . ' (' . $topFacultyRow['points'] . ' pts)';
        }

        // Top HOD
        $stmt = $db->prepare("
            SELECT u.name, IFNULL(lp.total_points, 0) as points
            FROM users u
            LEFT JOIN leaderboard_points lp ON u.id = lp.user_id AND lp.season_id = :sid
            WHERE u.college_id = :cid AND u.role_id = 2
            ORDER BY points DESC
            LIMIT 1
        ");
        $stmt->execute(['cid' => $collegeId, 'sid' => $seasonId]);
        $topHODRow = $stmt->fetch();
        if ($topHODRow && $topHODRow['points'] > 0) {
            $topHOD = $topHODRow['name'] . ' (' . $topHODRow['points'] . ' pts)';
        }
    }

    // 4. Recent Activity
    $stmt = $db->prepare("
        SELECT a.action, a.resource, a.created_at, u.name as user_name 
        FROM audit_logs a 
        JOIN users u ON a.user_id = u.id 
        WHERE u.college_id = :cid 
        ORDER BY a.created_at DESC 
        LIMIT 10
    ");
    $stmt->execute(['cid' => $collegeId]);
    $recentActivity = $stmt->fetchAll();

    echo json_encode([
        'status' => 'success',
        'data' => [
            'overview' => [
                'total_departments' => $totalDepartments,
                'total_hods' => $totalHODs,
                'total_faculty' => $totalFaculty,
                'active_tasks' => $activeTasksCount,
                'completed_tasks' => $completedTasksCount,
                'pending_tasks' => $pendingTasksCount
            ],
            'insights' => [
                'due_today' => $dueToday,
                'due_tomorrow' => $dueTomorrow,
                'overdue' => $overdue
            ],
            'engagement' => [
                'most_active_dept' => $mostActiveDept ?: 'N/A',
                'least_active_dept' => $leastActiveDept ?: 'N/A',
                'top_faculty' => $topFaculty ?: 'N/A',
                'top_hod' => $topHOD ?: 'N/A'
            ],
            'recent_activity' => $recentActivity
        ]
    ]);

} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
}
