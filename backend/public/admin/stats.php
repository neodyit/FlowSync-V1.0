<?php

require_once __DIR__ . '/../bootstrap.php';

use FlowSync\Utils\AdminMiddleware;
use FlowSync\Config\Database;

AdminMiddleware::check();

try {
    $db = Database::getInstance()->getConnection();
    
    // Count colleges
    $stmt = $db->query("SELECT COUNT(*) as count FROM colleges");
    $colleges = $stmt->fetch()['count'] ?? 0;
    
    // Count departments
    $stmt = $db->query("SELECT COUNT(*) as count FROM departments");
    $departments = $stmt->fetch()['count'] ?? 0;
    
    // Count HODs (role_id = 2)
    $stmt = $db->query("SELECT COUNT(*) as count FROM users WHERE role_id = 2");
    $hods = $stmt->fetch()['count'] ?? 0;
    
    // Count Faculty (role_id = 3)
    $stmt = $db->query("SELECT COUNT(*) as count FROM users WHERE role_id = 3");
    $faculty = $stmt->fetch()['count'] ?? 0;
    
    // Count active and completed tasks
    $stmt = $db->query("SELECT COUNT(*) as count FROM tasks WHERE status NOT IN ('Completed', 'Archived', 'Declined')");
    $activeTasks = $stmt->fetch()['count'] ?? 0;
    
    $stmt = $db->query("SELECT COUNT(*) as count FROM tasks WHERE status = 'Completed'");
    $completedTasks = $stmt->fetch()['count'] ?? 0;

    // Get recent activity (last 10 audit logs)
    $stmt = $db->query("
        SELECT a.*, u.name as user_name 
        FROM audit_logs a 
        LEFT JOIN users u ON a.user_id = u.id 
        ORDER BY a.created_at DESC 
        LIMIT 10
    ");
    $recentActivity = $stmt->fetchAll();

    echo json_encode([
        'status' => 'success',
        'data' => [
            'colleges' => (int)$colleges,
            'departments' => (int)$departments,
            'hods' => (int)$hods,
            'faculty' => (int)$faculty,
            'active_tasks' => (int)$activeTasks,
            'completed_tasks' => (int)$completedTasks,
            'recent_activity' => $recentActivity
        ]
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
