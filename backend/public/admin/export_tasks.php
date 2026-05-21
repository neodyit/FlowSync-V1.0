<?php

require_once __DIR__ . '/../bootstrap.php';

use FlowSync\Utils\AdminMiddleware;
use FlowSync\Config\Database;

$session = AdminMiddleware::check();
$db = Database::getInstance()->getConnection();

try {
    $stmt = $db->query("
        SELECT t.id, t.title, t.task_type, t.priority, t.status, 
               u1.name as assigned_by, u2.name as assigned_to, 
               c.name as college_name, d.name as department_name, 
               t.deadline, t.created_at
        FROM tasks t
        LEFT JOIN users u1 ON t.assigned_by_id = u1.id
        LEFT JOIN users u2 ON t.assigned_to_id = u2.id
        LEFT JOIN colleges c ON t.college_id = c.id
        LEFT JOIN departments d ON t.department_id = d.id
        ORDER BY t.created_at DESC
    ");
    $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);

    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename=flowsync_tasks_export_' . date('Y-m-d') . '.csv');

    $output = fopen('php://output', 'w');
    
    if (count($tasks) > 0) {
        fputcsv($output, array_keys($tasks[0]));
        foreach ($tasks as $task) {
            fputcsv($output, $task);
        }
    } else {
        fputcsv($output, ['No data found']);
    }

    $logger = new \FlowSync\Utils\AuditLogger();
    $logger->log($session['user_id'] ?? null, 'EXPORT_TASKS', 'TASK', null);

    fclose($output);
    exit;

} catch (\Exception $e) {
    http_response_code(500);
    echo "Error generating export: " . $e->getMessage();
}
