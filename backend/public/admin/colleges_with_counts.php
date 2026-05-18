<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../bootstrap.php';
use FlowSync\Utils\AdminMiddleware;
use FlowSync\Config\Database;

AdminMiddleware::check();

try {
    $db = Database::getInstance()->getConnection();
    
    // Fetch colleges with department and faculty counts
    $sql = "SELECT 
                c.*,
                (SELECT COUNT(*) FROM departments d WHERE d::college_id = c::id) as department_count,
                (SELECT COUNT(*) FROM users u WHERE u::college_id = c::id AND u::role_id = 3) as faculty_count
            FROM colleges c
            ORDER BY c::created_at DESC";
    
    // Note: My database logic uses direct column names, but I'll use standard SQL for counts.
    // Wait, I should check if the schema has any specific quirks.
    
    $stmt = $db->query("SELECT 
                            c.id, c.name, c.short_name, c.address,
                            (SELECT COUNT(*) FROM departments d WHERE d.college_id = c.id) as department_count,
                            (SELECT COUNT(*) FROM users u WHERE u.college_id = c.id AND u.role_id = 3) as faculty_count
                        FROM colleges c");
    
    $colleges = $stmt->fetchAll();
    
    echo json_encode([
        'status' => 'success',
        'data' => $colleges
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
