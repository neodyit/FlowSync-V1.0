<?php

try {
    require_once __DIR__ . '/../bootstrap.php';

    $session = FlowSync\Utils\HODMiddleware::check();
    $db = FlowSync\Config\Database::getInstance()->getConnection();
    $logger = new FlowSync\Utils\AuditLogger();
    $notifier = new FlowSync\Utils\NotificationService();

    // 1. Get HOD's department ID and college ID
    $stmt = $db->prepare("SELECT id, college_id FROM departments WHERE hod_id = :hod_id LIMIT 1");
    $stmt->execute(['hod_id' => $session['user_id']]);
    $dept = $stmt->fetch();

    if (!$dept) {
        throw new Exception("Unauthorized. No department assigned.");
    }
    $deptId = $dept['id'];
    $collegeId = $dept['college_id'];

    $method = $_SERVER['REQUEST_METHOD'];

    switch ($method) {
        case 'GET':
            // Fetch tasks for this department
            $stmt = $db->prepare("
                SELECT t.*, u.name as assigned_to_name, u.profile_pic as assigned_to_pic,
                       (SELECT COALESCE(SUM(points), 0) FROM task_assignments WHERE task_id = t.id) as aggregated_points,
                       (SELECT COALESCE(SUM(bonus_points), 0) FROM task_assignments WHERE task_id = t.id) as aggregated_bonus_points
                FROM tasks t
                LEFT JOIN users u ON t.assigned_to_id = u.id
                WHERE t.department_id = :dept_id AND t.season_id = :season_id
                ORDER BY t.created_at DESC
            ");
            $stmt->execute(['dept_id' => $deptId, 'season_id' => $currentSeasonId]);
            $tasks = $stmt->fetchAll();

            // Fetch assignments and attachments for each task
            foreach ($tasks as &$task) {
                // Fetch all assignments for this task
                $assignStmt = $db->prepare("
                    SELECT ta.*, u.name as faculty_name, u.email as faculty_email, u.profile_pic as faculty_pic, u.designation, u.is_public, u.phone, u.bio,
                           d.name as department_name,
                           CASE WHEN ta.submitted_at IS NOT NULL AND DATE(ta.submitted_at) > t.deadline THEN 1 ELSE 0 END as is_delayed,
                           (SELECT COUNT(*) FROM task_reminders WHERE task_id = ta.task_id AND user_id = ta.user_id) as reminder_count,
                           (SELECT COUNT(*) FROM task_reminders WHERE task_id = ta.task_id AND user_id = ta.user_id AND type = 'Warning') as warning_count
                    FROM task_assignments ta
                    JOIN users u ON ta.user_id = u.id
                    JOIN tasks t ON ta.task_id = t.id
                    LEFT JOIN departments d ON EXISTS(SELECT 1 FROM faculty_departments fd WHERE fd.user_id = u.id AND fd.department_id = d.id)
                    WHERE ta.task_id = :task_id
                ");
                $assignStmt->execute(['task_id' => $task['id']]);
                $task['assignments'] = $assignStmt->fetchAll();
                
                // Fetch all attachments
                $attStmt = $db->prepare("
                    SELECT a.id, a.original_name AS file_name, 
                           CONCAT('tasks_data/', c.short_name, '/task_', a.task_id, '/', a.stored_name) AS file_path, 
                           a.entity_type, a.created_at, CAST(a.uploader_id AS UNSIGNED) as uploader_id 
                    FROM attachments a
                    JOIN colleges c ON a.institution_id = c.id
                    WHERE (a.entity_type = 'Task' OR a.entity_type = 'Task_Submission') 
                    AND a.task_id = :task_id
                ");
                $attStmt->execute(['task_id' => $task['id']]);
                $task['attachments'] = $attStmt->fetchAll(PDO::FETCH_ASSOC);
                
                // Ensure uploader_id is int
                foreach ($task['attachments'] as &$att) {
                    $att['uploader_id'] = (int)$att['uploader_id'];
                }
                
                $task['attachment_count'] = count($task['attachments']);

                // Fetch comments chain
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

            // Include system settings in response so frontend knows if task creation is paused
            $settingsStmt = $db->query("SELECT setting_key, setting_value FROM system_settings WHERE setting_key = 'pause_new_tasks'");
            $settings = [];
            while ($row = $settingsStmt->fetch()) {
                $settings[$row['setting_key']] = $row['setting_value'];
            }

            echo json_encode(['status' => 'success', 'data' => $tasks, 'settings' => $settings]);
            break;

        case 'POST':
            $isMultipart = strpos($_SERVER['CONTENT_TYPE'] ?? '', 'multipart/form-data') !== false;
            $data = $isMultipart ? $_POST : json_decode(file_get_contents('php://input'), true);
            
            $taskId = $data['id'] ?? null;
            $isDraft = filter_var($data['is_draft'] ?? false, FILTER_VALIDATE_BOOLEAN);

            // Season Lock Check
            if ($taskId) {
                $stmtCheck = $db->prepare("SELECT season_id FROM tasks WHERE id = :id");
                $stmtCheck->execute(['id' => $taskId]);
                $oldTaskSeason = $stmtCheck->fetchColumn();
                if ($oldTaskSeason && FlowSync\Utils\AcademicSeasonManager::isSeasonLocked($oldTaskSeason)) {
                    throw new Exception("This task belongs to a locked academic season and cannot be modified.");
                }
            } else {
                if (FlowSync\Utils\AcademicSeasonManager::isSeasonLocked($currentSeasonId)) {
                    throw new Exception("The current academic season is locked. You cannot create new tasks.");
                }
            }
            
            if (!$isDraft && !$taskId && FlowSync\Utils\SystemSettings::get('pause_new_tasks') === 'true') {
                throw new Exception("New task creation is currently paused by the system administrator.");
            }
            if (!$isDraft && $taskId) {
                // Check if old status was draft and task posting is paused
                $stmtCheck = $db->prepare("SELECT status FROM tasks WHERE id = :id");
                $stmtCheck->execute(['id' => $taskId]);
                $oldTask = $stmtCheck->fetch();
                if ($oldTask && $oldTask['status'] === 'Draft' && FlowSync\Utils\SystemSettings::get('pause_new_tasks') === 'true') {
                    throw new Exception("Task publishing is currently paused by the system administrator.");
                }
            }
            
            if (empty($data['title']) || empty($data['deadline']) || empty($data['priority']) || empty($data['task_type'])) {
                throw new Exception("Title, deadline, priority, and task type are required.");
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
                $stmtCheck = $db->prepare("SELECT status FROM tasks WHERE id = :id");
                $stmtCheck->execute(['id' => $taskId]);
                $oldTask = $stmtCheck->fetch();
                $wasDraft = ($oldTask && $oldTask['status'] === 'Draft');
                
                $newStatus = $isDraft ? 'Draft' : ($isBroadcast ? 'Broadcasted' : (!empty($assignedToIds) ? 'Assigned' : 'Draft'));
                $stmt = $db->prepare("
                    UPDATE tasks 
                    SET title = :title, description = :description, deadline = :deadline, 
                        priority = :priority, task_type = :task_type, category = :category, 
                        assigned_to_id = :assigned_to, assignment_mode = :assignment_mode, task_link = :task_link, status = :status
                    WHERE id = :id AND department_id = :dept_id
                ");
                $stmt->execute([
                    'title' => $data['title'], 'description' => $data['description'] ?? '',
                    'deadline' => $data['deadline'], 'priority' => $data['priority'],
                    'task_type' => $data['task_type'], 'category' => $data['category'] ?? 'General', 
                    'assigned_to' => $assignedToId, 'assignment_mode' => $assignmentMode, 'task_link' => $data['task_link'] ?? null,
                    'status' => $newStatus, 'id' => $taskId, 'dept_id' => $deptId
                ]);
            } else {
                $wasDraft = false;
                $status = $isDraft ? 'Draft' : ($isBroadcast ? 'Broadcasted' : 'Assigned');
                $stmt = $db->prepare("
                    INSERT INTO tasks (college_id, department_id, assigned_by_id, assigned_to_id, assignment_mode, title, description, deadline, priority, task_type, category, status, assigned_at, task_link, season_id)
                    VALUES (:college_id, :dept_id, :assigned_by, :assigned_to, :assignment_mode, :title, :description, :deadline, :priority, :task_type, :category, :status, NOW(), :task_link, :season_id)
                ");
                $stmt->execute([
                    'college_id' => $collegeId, 'dept_id' => $deptId, 'assigned_by' => $session['user_id'],
                    'assigned_to' => $assignedToId, 'assignment_mode' => $assignmentMode, 'title' => $data['title'], 'description' => $data['description'] ?? '',
                    'deadline' => $data['deadline'], 'priority' => $data['priority'], 
                    'task_type' => $data['task_type'], 'category' => $data['category'] ?? 'General',
                    'status' => $status, 'task_link' => $data['task_link'] ?? null,
                    'season_id' => $currentSeasonId
                ]);
                $taskId = $db->lastInsertId();
            }

            // Create assignment record for individual and group tasks only if not draft
            if (!$isDraft && !$isBroadcast && !empty($assignedToIds)) {
                // Fetch college auto_accept_tasks setting
                $stmtCol = $db->prepare("SELECT auto_accept_tasks FROM colleges WHERE id = :cid LIMIT 1");
                $stmtCol->execute(['cid' => $collegeId]);
                $col = $stmtCol->fetch();
                $autoAccept = $col ? ($col['auto_accept_tasks'] == 1) : true;
                $assignmentStatus = $autoAccept ? 'Accepted' : 'Assigned';

                // Fetch task created_at
                $taskCreatedAtVal = date('Y-m-d H:i:s');
                if ($taskId) {
                    $stmtTaskTime = $db->prepare("SELECT created_at FROM tasks WHERE id = :id LIMIT 1");
                    $stmtTaskTime->execute(['id' => $taskId]);
                    $dbTaskTime = $stmtTaskTime->fetchColumn();
                    if ($dbTaskTime) {
                        $taskCreatedAtVal = $dbTaskTime;
                    }
                }

                $stmtUser = $db->prepare("SELECT created_at FROM users WHERE id = :uid LIMIT 1");
                $stmt = $db->prepare("
                    INSERT INTO task_assignments (task_id, user_id, status, is_manually_included) 
                    VALUES (:tid, :uid, :status, :is_manually) 
                    ON DUPLICATE KEY UPDATE status = VALUES(status), is_manually_included = VALUES(is_manually_included)
                ");
                foreach ($assignedToIds as $uid) {
                    $stmtUser->execute(['uid' => $uid]);
                    $userCreatedAtVal = $stmtUser->fetchColumn();
                    
                    $isManuallyIncludedVal = 0;
                    if ($userCreatedAtVal && strtotime($userCreatedAtVal) > strtotime($taskCreatedAtVal)) {
                        $isManuallyIncludedVal = 1;
                    }
                    
                    $stmt->execute([
                        'tid' => $taskId, 
                        'uid' => $uid, 
                        'status' => $assignmentStatus,
                        'is_manually' => $isManuallyIncludedVal
                    ]);
                }
            }

            // Handle File Uploads
            if (!empty($_FILES['attachments'])) {
                $collegeStmt = $db->prepare("
                    SELECT c.id, c.short_name 
                    FROM colleges c
                    JOIN users u ON u.college_id = c.id
                    WHERE u.id = :uid
                    LIMIT 1
                ");
                $collegeStmt->execute(['uid' => $session['user_id']]);
                $college = $collegeStmt->fetch(PDO::FETCH_ASSOC);
                $institutionId = $college['id'];
                $shortName = trim($college['short_name']);

                $taskDir = __DIR__ . '/../../storage/tasks_data/' . $shortName . '/task_' . $taskId . '/';
                if (!is_dir($taskDir)) {
                    mkdir($taskDir, 0777, true);
                }

                $files = $_FILES['attachments'];
                foreach ($files['name'] as $key => $name) {
                    if ($files['error'][$key] === UPLOAD_ERR_OK) {
                        if ($files['size'][$key] > 35 * 1024 * 1024) {
                            throw new Exception("File '{$name}' exceeds the maximum allowed size of 35 MB.");
                        }
                        $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
                        $blockedExtensions = ['zip', 'mp4', 'mkv', 'avi', 'mov', 'flv', 'webm', 'wmv', '3gp', 'mpeg', 'mpg', 'ogg'];
                        if (in_array($ext, $blockedExtensions)) {
                            throw new Exception("File '{$name}' has an invalid format. Zip and video files are not allowed.");
                        }
                        $mime = $files['type'][$key];
                        if (strpos($mime, 'video/') === 0 || strpos($mime, 'zip') !== false) {
                            throw new Exception("File '{$name}' has a blocked format (video or zip).");
                        }
                        $storedName = 'task_' . $taskId . '_' . uniqid() . '.' . $ext;
                        if (move_uploaded_file($files['tmp_name'][$key], $taskDir . $storedName)) {
                            $db->prepare("
                                INSERT INTO attachments (entity_type, task_id, institution_id, uploader_id, original_name, stored_name, file_size, file_type) 
                                VALUES ('Task', :tid, :inst_id, :uid, :orig_name, :stored_name, :size, :mime)
                            ")->execute([
                                'tid' => $taskId, 
                                'inst_id' => $institutionId,
                                'uid' => $session['user_id'], 
                                'orig_name' => $name, 
                                'stored_name' => $storedName, 
                                'size' => $files['size'][$key], 
                                'mime' => $files['type'][$key]
                            ]);
                        }
                    }
                }
            }

            // Dispatch notifications to assigned faculties only if not draft
            if (!$isDraft) {
                if ($isBroadcast) {
                    // Fetch all active faculty members in this department
                    $stmt = $db->prepare("
                        SELECT u.id 
                        FROM users u
                        JOIN faculty_departments fd ON u.id = fd.user_id
                        WHERE fd.department_id = :dept_id 
                        AND u.role_id = 3 
                        AND u.is_active = 1
                    ");
                    $stmt->execute(['dept_id' => $deptId]);
                    $faculties = $stmt->fetchAll();

                    $notifMsg = ($data['id'] ?? null) && !$wasDraft ? "Update on broadcast task: '{$data['title']}'" : "New department broadcast task: '{$data['title']}'";
                    foreach ($faculties as $fac) {
                        $notifier->send($fac['id'], 'TASK_ASSIGNED', $notifMsg, $taskId, $session['user_id']);
                    }
                } else if (!empty($assignedToIds)) {
                    $notifMsg = ($data['id'] ?? null) && !$wasDraft ? "Update on assigned task: '{$data['title']}'" : "You have been assigned a new task: '{$data['title']}'";
                    foreach ($assignedToIds as $uid) {
                        $notifier->send($uid, 'TASK_ASSIGNED', $notifMsg, $taskId, $session['user_id']);
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

            // Fetch task to verify ownership
            $check = $db->prepare("SELECT id, title, assigned_to_id, status, season_id FROM tasks WHERE id = :id AND department_id = :dept_id");
            $check->execute(['id' => $taskId, 'dept_id' => $deptId]);
            $task = $check->fetch();
            if (!$task) throw new Exception("Task not found or access denied.");

            if ($task['season_id'] && FlowSync\Utils\AcademicSeasonManager::isSeasonLocked($task['season_id'])) {
                throw new Exception("This task belongs to a locked academic season and cannot be modified or evaluated.");
            }

            // If reviewing specific assignments
            if (!empty($assignmentUserIds)) {
                foreach ($assignmentUserIds as $assignmentUserId) {
                    $stmt = $db->prepare("SELECT * FROM task_assignments WHERE task_id = :tid AND user_id = :uid");
                    $stmt->execute(['tid' => $taskId, 'uid' => $assignmentUserId]);
                    $assignment = $stmt->fetch();
                    if (!$assignment) continue; // Skip if not found

                    $newStatus = $data['status'] ?? $assignment['status'];
                    $newPoints = isset($data['points']) ? (int)$data['points'] : (int)($assignment['points'] ?? 0);
                    $newBonus = isset($data['bonus_points']) ? (int)$data['bonus_points'] : (int)($assignment['bonus_points'] ?? 0);
                    
                    $maxBonus = (int)(FlowSync\Utils\SystemSettings::get('max_bonus_points', 5));
                    if ($newBonus > $maxBonus) {
                        $newBonus = $maxBonus;
                    }

                    $multiplier = (float)(FlowSync\Utils\SystemSettings::get('global_multiplier', 1.0));
                    // Only apply multiplier if the points are newly set from the frontend (meaning $data['points'] was provided)
                    if (isset($data['points'])) {
                        $newPoints = (int)round($newPoints * $multiplier);
                    }
                    if (isset($data['bonus_points'])) {
                        $newBonus = (int)round($newBonus * $multiplier);
                    }

                    if ($newStatus === 'Rework Required') {
                        $newPoints = 0;
                        $newBonus = 0; 
                    }
                    
                    $newRemarks = $data['remarks'] ?? $assignment['remarks'] ?? '';

                    // Update Assignment
                    $stmt = $db->prepare("
                        UPDATE task_assignments 
                        SET status = :status_val, 
                            points = :pts, 
                            bonus_points = :bn, 
                            remarks = :rem,
                            reviewed_at = NOW(),
                            completed_at = CASE 
                                WHEN :status_val_2 IN ('Approved') THEN NOW() 
                                ELSE completed_at 
                            END
                        WHERE id = :id
                    ");
                    $stmt->execute([
                        'status_val' => $newStatus, 
                        'status_val_2' => $newStatus,
                        'pts' => $newPoints, 
                        'bn' => $newBonus, 
                        'rem' => $newRemarks,
                        'id' => $assignment['id']
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

                    // Log history
                    if ($isCompleted || $newStatus === 'Rework Required' || $newStatus === 'Rejected') {
                        $stmt = $db->prepare("INSERT INTO task_reviews (task_id, reviewer_id, remarks, points, bonus_points, status) VALUES (:tid, :rid, :rem, :pts, :bn, :st)");
                        $stmt->execute([
                            'tid' => $taskId, 'rid' => $session['user_id'], 'rem' => $newRemarks, 
                            'pts' => $newPoints, 'bn' => $newBonus, 'st' => $newStatus
                        ]);
                    }

                    // Only send notification if the status has actually transitioned to a critical state (Approved, Rework Required, Rejected)
                    if ($newStatus !== $assignment['status'] && in_array($newStatus, ['Approved', 'Rework Required', 'Rejected'])) {
                        $notifier->send($assignmentUserId, 'TASK_REVIEWED', "Your contribution to '{$task['title']}' has been updated to {$newStatus}", $taskId);
                    }
                }
                
                // Always sync the main task points and status
                // For broadcast tasks, check if all faculty in department have completed it
                $syncStmt = $db->prepare("
                    UPDATE tasks t 
                    SET 
                        t.points = (SELECT COALESCE(SUM(points), 0) FROM task_assignments WHERE task_id = t.id),
                        t.bonus_points = (SELECT COALESCE(SUM(bonus_points), 0) FROM task_assignments WHERE task_id = t.id),
                        t.status = CASE 
                            WHEN t.assignment_mode = 'individual' THEN (SELECT status FROM task_assignments WHERE task_id = t.id LIMIT 1)
                            WHEN t.assignment_mode = 'group' THEN (
                                SELECT CASE 
                                    WHEN (SELECT COUNT(*) FROM task_assignments WHERE task_id = t.id AND status = 'Approved') >= 
                                         (SELECT COUNT(*) FROM task_assignments WHERE task_id = t.id)
                                    THEN 'Completed'
                                    ELSE t.status 
                                END
                            )
                            ELSE (
                                SELECT CASE 
                                    WHEN (SELECT COUNT(*) FROM task_assignments WHERE task_id = t.id AND status = 'Approved') >= 
                                         (SELECT COUNT(*) FROM users u JOIN faculty_departments fd ON u.id = fd.user_id WHERE fd.department_id = t.department_id AND u.role_id = 3 AND u.is_active = 1)
                                    THEN 'Completed'
                                    ELSE t.status 
                                END
                            )
                        END
                    WHERE t.id = :tid
                ");
                $syncStmt->execute(['tid' => $taskId]);

            } else {
                // Bulk update or non-specific review (e.g. updating task details or status)
                if (isset($data['status'])) {
                    $stmt = $db->prepare("UPDATE tasks SET status = :st WHERE id = :id");
                    $stmt->execute(['st' => $data['status'], 'id' => $taskId]);
                }
                if (isset($data['flag_color'])) {
                    $stmt = $db->prepare("UPDATE tasks SET flag_color = :flag WHERE id = :id");
                    $stmt->execute(['flag' => $data['flag_color'], 'id' => $taskId]);
                }
            }

            $logger->log($session['user_id'], 'HOD_UPDATE_TASK', 'TASK', $taskId, ['status' => $data['status'] ?? 'Updated']);
            $db->commit();
            echo json_encode(['status' => 'success', 'message' => 'Task review updated.']);
            break;

        case 'DELETE':
            $taskId = $_GET['id'] ?? null;
            $userId = $_GET['user_id'] ?? null;
            
            // Verify task ownership by HOD
            $check = $db->prepare("SELECT id FROM tasks WHERE id = :id AND department_id = :dept_id");
            $check->execute(['id' => $taskId, 'dept_id' => $deptId]);
            if (!$check->fetch()) {
                throw new Exception("Task not found or access denied.");
            }
            
            if ($userId) {
                // Delete specific assignment
                $stmt = $db->prepare("DELETE FROM task_assignments WHERE task_id = :task_id AND user_id = :user_id");
                $stmt->execute(['task_id' => $taskId, 'user_id' => $userId]);
                
                // Recalculate task aggregated points
                $syncStmt = $db->prepare("
                    UPDATE tasks t 
                    SET 
                        t.points = (SELECT COALESCE(SUM(points), 0) FROM task_assignments WHERE task_id = t.id),
                        t.bonus_points = (SELECT COALESCE(SUM(bonus_points), 0) FROM task_assignments WHERE task_id = t.id)
                    WHERE t.id = :tid
                ");
                $syncStmt->execute(['tid' => $taskId]);
                
                echo json_encode(['status' => 'success', 'message' => 'Faculty member removed from task']);
            } else {
                // Delete entire task
                $stmt = $db->prepare("DELETE FROM tasks WHERE id = :id AND department_id = :dept_id");
                $stmt->execute(['id' => $taskId, 'dept_id' => $deptId]);
                echo json_encode(['status' => 'success', 'message' => 'Task deleted']);
            }
            break;
    }
} catch (Exception $e) {
    if ($db && $db->inTransaction()) $db->rollBack();
    error_log("HOD Tasks API Error: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine());
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
