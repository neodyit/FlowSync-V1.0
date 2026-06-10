<?php

require_once __DIR__ . '/../bootstrap.php';

use FlowSync\Utils\InstitutionAdminMiddleware;
use FlowSync\Config\Database;

// Verify user is Institution Admin
$session = InstitutionAdminMiddleware::check();
$collegeId = (int)$session['college_id'];
$seasonId = $currentSeasonId;

$db = Database::getInstance()->getConnection();
$logger = new \FlowSync\Utils\AuditLogger();
$notifier = new \FlowSync\Utils\NotificationService();
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            // Fetch all tasks for this college
            $stmt = $db->prepare("
                SELECT t.*, u.name as assigned_to_name, u.profile_pic as assigned_to_pic, d.name as department_name,
                       (SELECT COALESCE(SUM(points), 0) FROM task_assignments WHERE task_id = t.id) as aggregated_points,
                       (SELECT COALESCE(SUM(bonus_points), 0) FROM task_assignments WHERE task_id = t.id) as aggregated_bonus_points
                FROM tasks t
                LEFT JOIN users u ON t.assigned_to_id = u.id
                LEFT JOIN departments d ON t.department_id = d.id
                WHERE t.college_id = :cid AND t.season_id = :sid
                ORDER BY t.created_at DESC
            ");
            $stmt->execute(['cid' => $collegeId, 'sid' => $seasonId]);
            $tasks = $stmt->fetchAll();

            // Fetch assignments, attachments, and comments for each task
            foreach ($tasks as &$task) {
                // Fetch assignments
                $assignStmt = $db->prepare("
                    SELECT ta.*, u.name as faculty_name, u.email as faculty_email, u.profile_pic as faculty_pic, u.designation,
                           d.name as department_name,
                           CASE WHEN ta.submitted_at IS NOT NULL AND DATE(ta.submitted_at) > t.deadline THEN 1 ELSE 0 END as is_delayed,
                           (SELECT COUNT(*) FROM task_reminders WHERE task_id = ta.task_id AND user_id = ta.user_id) as reminder_count
                    FROM task_assignments ta
                    JOIN users u ON ta.user_id = u.id
                    JOIN tasks t ON ta.task_id = t.id
                    LEFT JOIN faculty_departments fd ON u.id = fd.user_id
                    LEFT JOIN departments d ON fd.department_id = d.id
                    WHERE ta.task_id = :task_id
                ");
                $assignStmt->execute(['task_id' => $task['id']]);
                $task['assignments'] = $assignStmt->fetchAll();

                // Fetch attachments
                $attStmt = $db->prepare("
                    SELECT a.id, a.original_name AS file_name, 
                           CONCAT('tasks_data/', c.short_name, '/task_', a.task_id, '/', a.stored_name) AS file_path, 
                           a.entity_type, a.created_at, CAST(a.uploader_id AS UNSIGNED) as uploader_id 
                    FROM attachments a
                    JOIN colleges c ON a.institution_id = c.id
                    WHERE a.task_id = :task_id AND (a.entity_type = 'Task' OR a.entity_type = 'Task_Submission')
                ");
                $attStmt->execute(['task_id' => $task['id']]);
                $task['attachments'] = $attStmt->fetchAll(PDO::FETCH_ASSOC);
                
                foreach ($task['attachments'] as &$att) {
                    $att['uploader_id'] = (int)$att['uploader_id'];
                }
                $task['attachment_count'] = count($task['attachments']);

                // Fetch comments
                $commentStmt = $db->prepare("
                    SELECT tc.*, u.name as user_name, u.profile_pic as user_pic
                    FROM task_comments tc
                    JOIN users u ON tc.user_id = u.id
                    WHERE tc.task_id = :task_id
                    ORDER BY tc.created_at ASC
                ");
                $commentStmt->execute(['task_id' => $task['id']]);
                $task['comments'] = $commentStmt->fetchAll();
            }

            // Fetch departments and active HODs/Faculty to assist in task creation
            $stmtD = $db->prepare("SELECT id, name FROM departments WHERE college_id = :cid");
            $stmtD->execute(['cid' => $collegeId]);
            $departments = $stmtD->fetchAll();

            $stmtU = $db->prepare("
                SELECT u.id, u.name, u.role_id, r.name as role_name, fd.department_id, d.name as department_name
                FROM users u
                JOIN roles r ON u.role_id = r.id
                LEFT JOIN faculty_departments fd ON u.id = fd.user_id
                LEFT JOIN departments d ON fd.department_id = d.id
                WHERE u.college_id = :cid AND u.role_id IN (2, 3) AND u.is_active = 1
            ");
            $stmtU->execute(['cid' => $collegeId]);
            $users = $stmtU->fetchAll();

            echo json_encode([
                'status' => 'success',
                'data' => [
                    'tasks' => $tasks,
                    'departments' => $departments,
                    'users' => $users
                ]
            ]);
            break;

        case 'POST':
            $isMultipart = strpos($_SERVER['CONTENT_TYPE'] ?? '', 'multipart/form-data') !== false;
            $data = $isMultipart ? $_POST : json_decode(file_get_contents('php://input'), true);

            $taskId = $data['id'] ?? null;
            $isDraft = filter_var($data['is_draft'] ?? false, FILTER_VALIDATE_BOOLEAN);

            if (empty($data['title']) || empty($data['deadline']) || empty($data['priority']) || empty($data['task_type']) || empty($data['department_id'])) {
                throw new Exception("Title, department, deadline, priority, and task type are required.");
            }

            $isBroadcast = ($data['assignment_mode'] ?? 'individual') === 'broadcast';
            
            $assignedToIds = [];
            if (!$isBroadcast) {
                if (isset($data['assigned_to_ids']) && is_array($data['assigned_to_ids'])) {
                    $assignedToIds = $data['assigned_to_ids'];
                } elseif (!empty($data['assigned_to_id'])) {
                    $assignedToIds = [$data['assigned_to_id']];
                }
            }

            $isGroup = count($assignedToIds) > 1 || ($data['assignment_mode'] ?? '') === 'group';
            $assignmentMode = $isBroadcast ? 'broadcast' : ($isGroup ? 'group' : 'individual');
            $assignedToId = ($assignmentMode === 'individual' && count($assignedToIds) === 1) ? $assignedToIds[0] : null;

            if ($taskId) {
                $stmtCheck = $db->prepare("SELECT status FROM tasks WHERE id = :id AND college_id = :cid");
                $stmtCheck->execute(['id' => $taskId, 'cid' => $collegeId]);
                $oldTask = $stmtCheck->fetch();
                if (!$oldTask) throw new Exception("Task not found.");
                
                $wasDraft = ($oldTask['status'] === 'Draft');
                $newStatus = $isDraft ? 'Draft' : ($isBroadcast ? 'Broadcasted' : (!empty($assignedToIds) ? 'Assigned' : 'Draft'));
                
                $stmt = $db->prepare("
                    UPDATE tasks 
                    SET title = :title, description = :description, deadline = :deadline, 
                        priority = :priority, task_type = :task_type, category = :category, 
                        assigned_to_id = :assigned_to, assignment_mode = :assignment_mode, 
                        task_link = :task_link, status = :status, department_id = :dept_id
                    WHERE id = :id AND college_id = :cid
                ");
                $stmt->execute([
                    'title' => $data['title'], 'description' => $data['description'] ?? '',
                    'deadline' => $data['deadline'], 'priority' => $data['priority'],
                    'task_type' => $data['task_type'], 'category' => $data['category'] ?? 'General', 
                    'assigned_to' => $assignedToId, 'assignment_mode' => $assignmentMode, 'task_link' => $data['task_link'] ?? null,
                    'status' => $newStatus, 'id' => $taskId, 'dept_id' => $data['department_id'], 'cid' => $collegeId
                ]);
            } else {
                $wasDraft = false;
                $status = $isDraft ? 'Draft' : ($isBroadcast ? 'Broadcasted' : 'Assigned');
                
                $stmt = $db->prepare("
                    INSERT INTO tasks (college_id, department_id, assigned_by_id, assigned_to_id, assignment_mode, title, description, deadline, priority, task_type, category, status, assigned_at, task_link, season_id)
                    VALUES (:college_id, :dept_id, :assigned_by, :assigned_to, :assignment_mode, :title, :description, :deadline, :priority, :task_type, :category, :status, NOW(), :task_link, :season_id)
                ");
                $stmt->execute([
                    'college_id' => $collegeId, 'dept_id' => $data['department_id'], 'assigned_by' => $session['user_id'],
                    'assigned_to' => $assignedToId, 'assignment_mode' => $assignmentMode, 'title' => $data['title'], 'description' => $data['description'] ?? '',
                    'deadline' => $data['deadline'], 'priority' => $data['priority'], 
                    'task_type' => $data['task_type'], 'category' => $data['category'] ?? 'General',
                    'status' => $status, 'task_link' => $data['task_link'] ?? null, 'season_id' => $seasonId
                ]);
                $taskId = $db->lastInsertId();
            }

            // Create assignments if not draft
            if (!$isDraft && !$isBroadcast && !empty($assignedToIds)) {
                $stmtCol = $db->prepare("SELECT auto_accept_tasks FROM colleges WHERE id = :cid LIMIT 1");
                $stmtCol->execute(['cid' => $collegeId]);
                $col = $stmtCol->fetch();
                $autoAccept = $col ? ($col['auto_accept_tasks'] == 1) : true;
                $assignmentStatus = $autoAccept ? 'Accepted' : 'Assigned';

                $stmt = $db->prepare("
                    INSERT INTO task_assignments (task_id, user_id, status) 
                    VALUES (:tid, :uid, :status) 
                    ON DUPLICATE KEY UPDATE status = VALUES(status)
                ");
                foreach ($assignedToIds as $uid) {
                    $stmt->execute(['tid' => $taskId, 'uid' => $uid, 'status' => $assignmentStatus]);
                }
            }

            // File Uploads
            if (!empty($_FILES['attachments'])) {
                $collegeStmt = $db->prepare("SELECT short_name FROM colleges WHERE id = :cid LIMIT 1");
                $collegeStmt->execute(['cid' => $collegeId]);
                $shortName = trim($collegeStmt->fetchColumn());

                $taskDir = __DIR__ . '/../../storage/tasks_data/' . $shortName . '/task_' . $taskId . '/';
                if (!is_dir($taskDir)) {
                    mkdir($taskDir, 0777, true);
                }

                $files = $_FILES['attachments'];
                foreach ($files['name'] as $key => $name) {
                    if ($files['error'][$key] === UPLOAD_ERR_OK) {
                        $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
                        $storedName = 'task_' . $taskId . '_' . uniqid() . '.' . $ext;
                        if (move_uploaded_file($files['tmp_name'][$key], $taskDir . $storedName)) {
                            $db->prepare("
                                INSERT INTO attachments (entity_type, task_id, institution_id, uploader_id, original_name, stored_name, file_size, file_type) 
                                VALUES ('Task', :tid, :inst_id, :uid, :orig_name, :stored_name, :size, :mime)
                            ")->execute([
                                'tid' => $taskId, 'inst_id' => $collegeId, 'uid' => $session['user_id'], 
                                'orig_name' => $name, 'stored_name' => $storedName, 'size' => $files['size'][$key], 'mime' => $files['type'][$key]
                            ]);
                        }
                    }
                }
            }

            // Notifications
            if (!$isDraft) {
                if ($isBroadcast) {
                    // Send to all faculty in department
                    $stmt = $db->prepare("
                        SELECT u.id FROM users u
                        JOIN faculty_departments fd ON u.id = fd.user_id
                        WHERE fd.department_id = :dept_id AND u.role_id = 3 AND u.is_active = 1
                    ");
                    $stmt->execute(['dept_id' => $data['department_id']]);
                    $faculties = $stmt->fetchAll();
                    foreach ($faculties as $fac) {
                        $notifier->send($fac['id'], 'TASK_ASSIGNED', "New department broadcast task: '{$data['title']}'", $taskId, $session['user_id']);
                    }
                } else if (!empty($assignedToIds)) {
                    foreach ($assignedToIds as $uid) {
                        $notifier->send($uid, 'TASK_ASSIGNED', "New task assigned: '{$data['title']}'", $taskId, $session['user_id']);
                    }
                }
            }

            echo json_encode(['status' => 'success', 'message' => $isDraft ? 'Task saved as draft' : 'Task processed', 'id' => $taskId]);
            break;

        case 'PUT':
            $data = json_decode(file_get_contents('php://input'), true);
            $taskId = $data['id'] ?? null;
            $assignmentUserIds = $data['user_ids'] ?? [];
            if (!empty($data['user_id'])) {
                $assignmentUserIds[] = $data['user_id'];
            }
            $assignmentUserIds = array_unique($assignmentUserIds);

            if (!$taskId) throw new Exception("Task ID is required.");

            $db->beginTransaction();

            $check = $db->prepare("SELECT id, title, season_id FROM tasks WHERE id = :id AND college_id = :cid");
            $check->execute(['id' => $taskId, 'cid' => $collegeId]);
            $task = $check->fetch();
            if (!$task) throw new Exception("Task not found or access denied.");

            if (!empty($assignmentUserIds)) {
                foreach ($assignmentUserIds as $assignmentUserId) {
                    $stmt = $db->prepare("SELECT * FROM task_assignments WHERE task_id = :tid AND user_id = :uid");
                    $stmt->execute(['tid' => $taskId, 'uid' => $assignmentUserId]);
                    $assignment = $stmt->fetch();
                    if (!$assignment) continue;

                    $newStatus = $data['status'] ?? $assignment['status'];
                    $newPoints = isset($data['points']) ? (int)$data['points'] : (int)($assignment['points'] ?? 0);
                    $newBonus = isset($data['bonus_points']) ? (int)$data['bonus_points'] : (int)($assignment['bonus_points'] ?? 0);
                    $newRemarks = $data['remarks'] ?? $assignment['remarks'] ?? '';

                    if ($newStatus === 'Rework Required') {
                        $newPoints = 0;
                        $newBonus = 0;
                    }

                    $progressVal = 0;
                    if ($newStatus === 'Approved') {
                        $progressVal = 100;
                    } elseif ($newPoints > 0) {
                        $progressVal = 99;
                    } elseif ($newStatus === 'Submitted') {
                        $progressVal = 98;
                    } elseif ($newStatus === 'Rework Required') {
                        $progressVal = 40;
                    } else {
                        $progressVal = (int)($assignment['progress'] ?? 0);
                    }

                    // Update Assignment
                    $stmt = $db->prepare("
                        UPDATE task_assignments 
                        SET status = :status_val, points = :pts, bonus_points = :bn, remarks = :rem, progress = :prog, reviewed_at = NOW(),
                            completed_at = CASE WHEN :status_val_2 IN ('Approved') THEN NOW() ELSE completed_at END
                        WHERE id = :id
                    ");
                    $stmt->execute([
                        'status_val' => $newStatus, 'status_val_2' => $newStatus,
                        'pts' => $newPoints, 'bn' => $newBonus, 'rem' => $newRemarks, 'prog' => $progressVal, 'id' => $assignment['id']
                    ]);

                    // Update Leaderboard
                    $oldTotal = (int)($assignment['points'] ?? 0) + (int)($assignment['bonus_points'] ?? 0);
                    $newTotal = $newPoints + $newBonus;
                    $wasCompleted = ($assignment['status'] === 'Approved');
                    $isCompleted = ($newStatus === 'Approved');

                    if (!$wasCompleted && $isCompleted) {
                        $stmt = $db->prepare("
                            INSERT INTO leaderboard_points (user_id, season_id, total_points, tasks_completed) 
                            VALUES (:uid, :season_id, :pts, 1) 
                            ON DUPLICATE KEY UPDATE total_points = total_points + :pts_inc, tasks_completed = tasks_completed + 1
                        ");
                        $stmt->execute(['uid' => $assignmentUserId, 'season_id' => $task['season_id'], 'pts' => $newTotal, 'pts_inc' => $newTotal]);
                    } else if ($wasCompleted && $isCompleted) {
                        $delta = $newTotal - $oldTotal;
                        if ($delta !== 0) {
                            $stmt = $db->prepare("UPDATE leaderboard_points SET total_points = total_points + :delta WHERE user_id = :uid AND season_id = :season_id");
                            $stmt->execute(['uid' => $assignmentUserId, 'delta' => $delta, 'season_id' => $task['season_id']]);
                        }
                    } else if ($wasCompleted && !$isCompleted) {
                        $stmt = $db->prepare("UPDATE leaderboard_points SET total_points = GREATEST(0, total_points - :pts), tasks_completed = GREATEST(0, tasks_completed - 1) WHERE user_id = :uid AND season_id = :season_id");
                        $stmt->execute(['uid' => $assignmentUserId, 'pts' => $oldTotal, 'season_id' => $task['season_id']]);
                    }

                    // Save review
                    if ($isCompleted || $newStatus === 'Rework Required' || $newStatus === 'Rejected') {
                        $stmt = $db->prepare("INSERT INTO task_reviews (task_id, reviewer_id, remarks, points, bonus_points, status) VALUES (:tid, :rid, :rem, :pts, :bn, :st)");
                        $stmt->execute(['tid' => $taskId, 'rid' => $session['user_id'], 'rem' => $newRemarks, 'pts' => $newPoints, 'bn' => $newBonus, 'st' => $newStatus]);
                    }

                    // Notify
                    if ($newStatus !== $assignment['status'] && in_array($newStatus, ['Approved', 'Rework Required', 'Rejected'])) {
                        $notifier->send($assignmentUserId, 'TASK_REVIEWED', "Your task '{$task['title']}' review updated to {$newStatus}", $taskId);
                    }
                }

                // Sync main task
                $syncStmt = $db->prepare("
                    UPDATE tasks t 
                    SET 
                        t.points = (SELECT COALESCE(SUM(points), 0) FROM task_assignments WHERE task_id = t.id),
                        t.bonus_points = (SELECT COALESCE(SUM(bonus_points), 0) FROM task_assignments WHERE task_id = t.id),
                        t.status = CASE 
                            WHEN t.assignment_mode = 'individual' THEN (SELECT status FROM task_assignments WHERE task_id = t.id LIMIT 1)
                            ELSE t.status 
                        END
                    WHERE t.id = :tid
                ");
                $syncStmt->execute(['tid' => $taskId]);
            } else {
                if (isset($data['status'])) {
                    $stmt = $db->prepare("UPDATE tasks SET status = :st WHERE id = :id");
                    $stmt->execute(['st' => $data['status'], 'id' => $taskId]);
                }
            }

            $logger->log($session['user_id'], 'IA_UPDATE_TASK', 'TASK', $taskId, ['status' => $data['status'] ?? 'Updated']);
            $db->commit();
            echo json_encode(['status' => 'success', 'message' => 'Task evaluated successfully.']);
            break;

        case 'DELETE':
            $taskId = $_GET['id'] ?? null;
            $userId = $_GET['user_id'] ?? null;

            $check = $db->prepare("SELECT id FROM tasks WHERE id = :id AND college_id = :cid");
            $check->execute(['id' => $taskId, 'cid' => $collegeId]);
            if (!$check->fetch()) {
                throw new Exception("Task not found or access denied.");
            }

            if ($userId) {
                $stmt = $db->prepare("DELETE FROM task_assignments WHERE task_id = :task_id AND user_id = :user_id");
                $stmt->execute(['task_id' => $taskId, 'user_id' => $userId]);
                echo json_encode(['status' => 'success', 'message' => 'Faculty member removed from task']);
            } else {
                $stmt = $db->prepare("DELETE FROM tasks WHERE id = :id AND college_id = :cid");
                $stmt->execute(['id' => $taskId, 'cid' => $collegeId]);
                echo json_encode(['status' => 'success', 'message' => 'Task deleted successfully']);
            }
            break;
    }
} catch (Exception $e) {
    if ($db && $db->inTransaction()) $db->rollBack();
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
