<?php

require_once __DIR__ . '/../bootstrap.php';

use FlowSync\Utils\HODMiddleware;
use FlowSync\Config\Database;

$session = HODMiddleware::check();
$db = Database::getInstance()->getConnection();

try {
    // 1. Get HOD's department ID
    $stmt = $db->prepare("SELECT id FROM departments WHERE hod_id = :hod_id LIMIT 1");
    $stmt->execute(['hod_id' => $session['user_id']]);
    $dept = $stmt->fetch();

    if (!$dept) {
        throw new Exception("Unauthorized. No department assigned.");
    }
    $deptId = $dept['id'];

    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        // Fetch all faculty in this department
        $stmt = $db->prepare("
            SELECT u.id, u.name, u.email, u.is_active, u.profile_pic,
                   (SELECT COALESCE(SUM(points + bonus_points), 0) FROM task_assignments WHERE user_id = u.id) as total_points
            FROM users u
            JOIN faculty_departments fd ON u.id = fd.user_id
            WHERE fd.department_id = :dept_id AND u.role_id = 3
        ");
        $stmt->execute(['dept_id' => $deptId]);
        $faculty = $stmt->fetchAll();

        foreach ($faculty as &$member) {
            // Fetch their tasks
            $taskStmt = $db->prepare("
                SELECT 
                    t.id, 
                    t.title, 
                    COALESCE(ta.status, t.status) as status, 
                    t.priority, 
                    t.deadline, 
                    COALESCE(ta.accepted_at, t.accepted_at) as accepted_at, 
                    COALESCE(ta.submitted_at, t.submitted_at) as submitted_at, 
                    COALESCE(ta.completed_at, t.completed_at) as completed_at,
                    t.declined_at, 
                    t.created_at,
                    COALESCE(ta.points, 0) as points,
                    COALESCE(ta.bonus_points, 0) as bonus_points
                FROM tasks t
                LEFT JOIN task_assignments ta ON t.id = ta.task_id AND ta.user_id = :uid1
                WHERE t.assigned_to_id = :uid2 
                   OR ta.user_id = :uid3 
                   OR (t.status = 'Broadcasted' AND t.department_id = :dept_id)
                ORDER BY t.created_at DESC
            ");
            $taskStmt->execute([
                'uid1' => $member['id'],
                'uid2' => $member['id'],
                'uid3' => $member['id'],
                'dept_id' => $deptId
            ]);
            $member['tasks'] = $taskStmt->fetchAll();
            $member['task_count'] = count($member['tasks']);
            
            // Calculate progress stats
            $member['completed_count'] = count(array_filter($member['tasks'], fn($t) => $t['status'] === 'Approved' || $t['status'] === 'Completed'));
            $member['active_count'] = count(array_filter($member['tasks'], fn($t) => in_array($t['status'], ['Accepted', 'In Progress', 'Rework Required'])));
        }

        echo json_encode(['status' => 'success', 'data' => $faculty]);
    } else {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
