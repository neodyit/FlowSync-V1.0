<?php

require_once __DIR__ . '/../bootstrap.php';

use FlowSync\Utils\HODMiddleware;
use FlowSync\Config\Database;

$session = HODMiddleware::check();
$db = Database::getInstance()->getConnection();

try {
    // Get HOD's department context
    $stmt = $db->prepare("SELECT d.id as department_id FROM departments d WHERE d.hod_id = :user_id LIMIT 1");
    $stmt->execute(['user_id' => $session['user_id']]);
    $hodDept = $stmt->fetch();

    if (!$hodDept) throw new Exception("You are not assigned as an HOD to any department.");
    $deptId = $hodDept['department_id'];

    $taskId = $_GET['task_id'] ?? null;

    if (!$taskId) {
        // Return list of tasks for dropdown
        $tasksStmt = $db->prepare("
            SELECT id, title, status, deadline 
            FROM tasks 
            WHERE department_id = :dept_id 
            ORDER BY created_at DESC
        ");
        $tasksStmt->execute(['dept_id' => $deptId]);
        $tasks = $tasksStmt->fetchAll();

        echo json_encode(['status' => 'success', 'data' => ['tasks' => $tasks]]);
        exit;
    }

    // Return detailed advanced tracking data for specific task
    $taskStmt = $db->prepare("SELECT id, title, description, status, deadline, points, bonus_points FROM tasks WHERE id = :id AND department_id = :dept_id");
    $taskStmt->execute(['id' => $taskId, 'dept_id' => $deptId]);
    $task = $taskStmt->fetch();

    if (!$task) throw new Exception("Task not found.");

    // Fetch faculty assignments
    $assignmentsStmt = $db->prepare("
        SELECT 
            u.id as user_id, u.name as faculty_name, u.email as faculty_email, u.profile_pic,
            ta.status, ta.progress, ta.submitted_at, ta.completed_at, ta.points, ta.bonus_points,
            0 as reminder_count, 0 as warning_count,
            CASE WHEN ta.completed_at IS NOT NULL AND ta.completed_at > :deadline THEN 1 
                 WHEN ta.completed_at IS NULL AND ta.submitted_at IS NOT NULL AND ta.submitted_at > :deadline2 THEN 1
                 ELSE 0 END as is_late,
            CASE WHEN ta.completed_at IS NOT NULL THEN DATEDIFF(ta.completed_at, :deadline3) 
                 WHEN ta.submitted_at IS NOT NULL THEN DATEDIFF(ta.submitted_at, :deadline4) 
                 ELSE DATEDIFF(NOW(), :deadline5) END as days_late
        FROM task_assignments ta
        JOIN users u ON ta.user_id = u.id
        WHERE ta.task_id = :task_id
        ORDER BY u.name ASC
    ");
    $assignmentsStmt->execute([
        'task_id' => $taskId, 
        'deadline' => $task['deadline'],
        'deadline2' => $task['deadline'],
        'deadline3' => $task['deadline'],
        'deadline4' => $task['deadline'],
        'deadline5' => $task['deadline']
    ]);
    $assignments = $assignmentsStmt->fetchAll();

    // Calculate metrics
    $totalAssigned = count($assignments);
    $completedCount = 0;
    $lateSubmissions = 0;
    $totalReminders = 0;
    $totalWarnings = 0;
    
    foreach ($assignments as $a) {
        if (in_array($a['status'], ['Approved', 'Completed'])) {
            $completedCount++;
        }
        if ($a['is_late'] == 1 && in_array($a['status'], ['Submitted', 'Under Review', 'Approved', 'Completed'])) {
            $lateSubmissions++;
        }
        $totalReminders += (int)$a['reminder_count'];
        $totalWarnings += (int)$a['warning_count'];
    }

    $completionRate = $totalAssigned > 0 ? round(($completedCount / $totalAssigned) * 100) : 0;

    echo json_encode([
        'status' => 'success',
        'data' => [
            'task' => $task,
            'assignments' => $assignments,
            'kpis' => [
                'total_assigned' => $totalAssigned,
                'completed_count' => $completedCount,
                'completion_rate' => $completionRate,
                'late_submissions' => $lateSubmissions,
                'total_reminders' => $totalReminders,
                'total_warnings' => $totalWarnings
            ]
        ]
    ]);

} catch (Throwable $e) {
    file_put_contents(__DIR__ . '/error_log.txt', $e->getMessage() . "\n" . $e->getTraceAsString(), FILE_APPEND);
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
