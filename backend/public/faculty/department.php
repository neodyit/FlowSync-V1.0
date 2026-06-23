<?php

require_once __DIR__ . '/../bootstrap.php';

use FlowSync\Utils\FacultyMiddleware;
use FlowSync\Config\Database;

$session = FacultyMiddleware::check();
$db = Database::getInstance()->getConnection();

try {
    $userId = $session['user_id'];

    // 1. Fetch Department & College Info
    $stmt = $db->prepare("
        SELECT d.id as dept_id, d.name as dept_name, c.name as college_name, d.hod_id
        FROM faculty_departments fd
        JOIN departments d ON fd.department_id = d.id
        JOIN colleges c ON d.college_id = c.id
        WHERE fd.user_id = :user_id
        LIMIT 1
    ");
    $stmt->execute(['user_id' => $userId]);
    $deptInfo = $stmt->fetch();

    if (!$deptInfo) {
        throw new Exception("No department found for this faculty member.");
    }

    $deptId = $deptInfo['dept_id'];

    // 2. Fetch HOD Details
    $hod = null;
    if (!empty($deptInfo['hod_id'])) {
        $stmt = $db->prepare("SELECT id, name, email, profile_pic, is_public FROM users WHERE id = :hod_id");
        $stmt->execute(['hod_id' => $deptInfo['hod_id']]);
        $hod = $stmt->fetch() ?: null;
    }

    // 3. Calculate Faculty Stats (Points, Bonus, Completed)
    $stmt = $db->prepare("
        SELECT 
            COUNT(*) as total_tasks,
            SUM(CASE WHEN status IN ('Completed', 'Approved') THEN 1 ELSE 0 END) as completed_tasks
        FROM tasks
        WHERE assigned_to_id = :user_id AND department_id = :dept_id
    ");
    $stmt->execute(['user_id' => $userId, 'dept_id' => $deptId]);
    $stats = $stmt->fetch();

    $stmt = $db->prepare("SELECT SUM(total_points) FROM leaderboard_points WHERE user_id = :user_id");
    $stmt->execute(['user_id' => $userId]);
    $totalPoints = $stmt->fetchColumn() ?: 0;

    // 4. Calculate Department Rank (based on points + bonus)
    $stmt = $db->prepare("
        SELECT lp.user_id, SUM(lp.total_points) as total_score
        FROM leaderboard_points lp
        JOIN faculty_departments fd ON lp.user_id = fd.user_id
        WHERE fd.department_id = :dept_id
        GROUP BY lp.user_id
        ORDER BY total_score DESC
    ");
    $stmt->execute(['dept_id' => $deptId]);
    $leaderboard = $stmt->fetchAll();

    $rank = 0;
    foreach ($leaderboard as $idx => $row) {
        if ($row['user_id'] == $userId) {
            $rank = $idx + 1;
            break;
        }
    }

    // 5. Fetch Team Members
    $stmt = $db->prepare("
        SELECT u.id, u.name, u.email, u.profile_pic, u.is_public 
        FROM faculty_departments fd
        JOIN users u ON fd.user_id = u.id
        WHERE fd.department_id = :dept_id AND fd.user_id != :user_id
    ");
    $stmt->execute(['dept_id' => $deptId, 'user_id' => $userId]);
    $team = $stmt->fetchAll();

    echo json_encode([
        'status' => 'success',
        'data' => [
            'department' => $deptInfo['dept_name'],
            'college' => $deptInfo['college_name'],
            'hod' => [
                'id' => $hod ? ($hod['id'] ?? null) : null,
                'name' => $hod ? ($hod['name'] ?? 'Not Assigned') : 'Not Assigned',
                'email' => $hod ? ($hod['email'] ?? 'N/A') : 'N/A',
                'profile_pic' => $hod ? ($hod['profile_pic'] ?? null) : null,
                'is_public' => $hod ? (isset($hod['is_public']) ? (int)$hod['is_public'] : 0) : 0
            ],
            'stats' => [
                'rank' => $rank ?: 'N/A',
                'points' => (int)$totalPoints,
                'bonus' => 0, // Simplified or query if needed
                'completed' => (int)($stats['completed_tasks'] ?? 0),
                'total' => (int)($stats['total_tasks'] ?? 0)
            ],
            'team' => $team
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
