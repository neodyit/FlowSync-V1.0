<?php

require_once __DIR__ . '/../bootstrap.php';

use FlowSync\Utils\AdminMiddleware;
use FlowSync\Config\Database;

$session = AdminMiddleware::check();
$db = Database::getInstance()->getConnection();

try {
    $stmt = $db->query("
        SELECT u.id, u.name, u.email, r.name as role_name, c.name as college_name, d.name as department_name, u.is_active, u.created_at
        FROM users u 
        JOIN roles r ON u.role_id = r.id 
        LEFT JOIN colleges c ON u.college_id = c.id
        LEFT JOIN faculty_departments fd ON u.id = fd.user_id
        LEFT JOIN departments d ON fd.department_id = d.id
        ORDER BY u.created_at DESC
    ");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename=flowsync_users_export_' . date('Y-m-d') . '.csv');

    $output = fopen('php://output', 'w');
    
    if (count($users) > 0) {
        fputcsv($output, array_keys($users[0]));
        foreach ($users as $user) {
            fputcsv($output, $user);
        }
    } else {
        fputcsv($output, ['No data found']);
    }

    $logger = new \FlowSync\Utils\AuditLogger();
    $logger->log($session['user_id'] ?? null, 'EXPORT_USERS', 'USER', null);

    fclose($output);
    exit;

} catch (\Exception $e) {
    http_response_code(500);
    echo "Error generating export: " . $e->getMessage();
}
