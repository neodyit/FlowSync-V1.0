<?php

require_once __DIR__ . '/../bootstrap.php';

use FlowSync\Utils\FacultyMiddleware;
use FlowSync\Config\Database;
use FlowSync\Utils\AuditLogger;
use FlowSync\Utils\NotificationService;

$session = FacultyMiddleware::check();
$db = Database::getInstance()->getConnection();
$logger = new AuditLogger();
$notifier = new NotificationService();

try {
    // Get Faculty's department ID (needed for notifications)
    $stmt = $db->prepare("SELECT department_id FROM faculty_departments WHERE user_id = :user_id LIMIT 1");
    $stmt->execute(['user_id' => $session['user_id']]);
    $userDept = $stmt->fetch();
    $deptId = $userDept['department_id'] ?? null;

    $method = $_SERVER['REQUEST_METHOD'];

    switch ($method) {
        case 'GET':
            // Fetch tasks assigned to this faculty member (including broadcasted ones they accepted)
            $stmt = $db->prepare("
                 SELECT t.*, t.status AS overall_status, t.completed_at AS overall_completed_at,
                       (SELECT tr.remarks FROM task_reviews tr WHERE tr.task_id = t.id AND tr.status = 'Approved' ORDER BY tr.created_at DESC LIMIT 1) AS completion_reason,
                       CASE WHEN (SELECT COUNT(*) FROM task_reviews tr WHERE tr.task_id = t.id AND tr.status = 'Rework Required') > 0 OR ta.status = 'Rework Required' THEN 'Rework' ELSE 'Regular' END AS flow_type,
                       u.name as assigned_by_name, u.profile_pic as assigned_by_pic, u.role_id as assigned_by_role_id,
                        ta.status as my_status, ta.progress, 
                       ta.points as my_points, ta.bonus_points as my_bonus, 
                       ta.remarks as my_remarks, ta.public_remarks, ta.private_remarks, ta.submission_link, ta.submitted_at as my_submitted_at,
                       CASE WHEN ta.submitted_at IS NOT NULL AND DATE(ta.submitted_at) > t.deadline THEN 1 ELSE 0 END as is_delayed
                FROM tasks t
                JOIN users u ON t.assigned_by_id = u.id
                JOIN task_assignments ta ON t.id = ta.task_id
                JOIN users target_u ON ta.user_id = target_u.id
                WHERE ta.user_id = :user_id AND t.season_id = :season_id
                  AND (t.created_at >= target_u.created_at OR ta.is_manually_included = 1)
                ORDER BY t.created_at DESC
            ");
            $stmt->execute(['user_id' => $session['user_id'], 'season_id' => $currentSeasonId]);
            $tasks = $stmt->fetchAll();

            // Fetch attachments, teammate remarks, team members, and comments in bulk to avoid N+1 queries
            if (!empty($tasks)) {
                $taskIds = array_column($tasks, 'id');
                $placeholders = implode(',', array_fill(0, count($taskIds), '?'));

                // 1. Fetch attachments
                $attStmt = $db->prepare("
                    SELECT a.id, a.task_id, a.original_name AS file_name, 
                           CONCAT('tasks_data/', c.short_name, '/task_', a.task_id, '/', a.stored_name) AS file_path, 
                           a.entity_type, a.created_at, a.uploader_id
                    FROM attachments a
                    JOIN colleges c ON a.institution_id = c.id
                    WHERE (a.entity_type = 'Task' OR a.entity_type = 'Task_Submission') 
                    AND a.task_id IN ($placeholders)
                ");
                $attStmt->execute($taskIds);
                $attachments = $attStmt->fetchAll();
                
                $attachmentsByTask = [];
                foreach ($attachments as $att) {
                    $attachmentsByTask[$att['task_id']][] = $att;
                }

                // 2. Fetch teammate public remarks
                $teamStmt = $db->prepare("
                    SELECT ta.task_id, ta.public_remarks, u.name as faculty_name, u.profile_pic as faculty_pic, ta.status, ta.progress
                    FROM task_assignments ta
                    JOIN users u ON ta.user_id = u.id
                    WHERE ta.task_id IN ($placeholders) AND ta.user_id != ? AND ta.public_remarks IS NOT NULL
                ");
                $teamParams = array_merge($taskIds, [$session['user_id']]);
                $teamStmt->execute($teamParams);
                $teammates = $teamStmt->fetchAll();

                $teammatesByTask = [];
                foreach ($teammates as $t) {
                    $teammatesByTask[$t['task_id']][] = $t;
                }

                // 3. Fetch all team members assigned to these tasks
                $teamMembersStmt = $db->prepare("
                    SELECT ta.task_id, ta.user_id, ta.status, ta.progress,
                           u.name as faculty_name, u.profile_pic as faculty_pic, u.email as faculty_email, u.designation, u.is_public,
                           d.name as department_name
                    FROM task_assignments ta
                    JOIN users u ON ta.user_id = u.id
                    LEFT JOIN departments d ON EXISTS(SELECT 1 FROM faculty_departments fd WHERE fd.user_id = u.id AND fd.department_id = d.id)
                    WHERE ta.task_id IN ($placeholders)
                ");
                $teamMembersStmt->execute($taskIds);
                $teamMembers = $teamMembersStmt->fetchAll();

                $teamMembersByTask = [];
                foreach ($teamMembers as $tm) {
                    $teamMembersByTask[$tm['task_id']][] = $tm;
                }

                // 4. Fetch comments chain
                $commentStmt = $db->prepare("
                    SELECT tc.*, u.name as user_name, u.profile_pic as user_pic
                    FROM task_comments tc
                    JOIN users u ON tc.user_id = u.id
                    WHERE tc.task_id IN ($placeholders)
                    ORDER BY tc.created_at ASC
                ");
                $commentStmt->execute($taskIds);
                $comments = $commentStmt->fetchAll();

                $commentsByTask = [];
                foreach ($comments as $c) {
                    $commentsByTask[$c['task_id']][] = $c;
                }

                // Map to tasks
                foreach ($tasks as &$task) {
                    $tid = $task['id'];

                    // Use assignment status for UI
                    $task['status'] = $task['my_status'];
                    $task['submitted_at'] = $task['my_submitted_at'];
                    $task['points'] = $task['my_points'];
                    $task['bonus_points'] = $task['my_bonus'];
                    $task['remarks'] = $task['my_remarks'];

                    $task['attachments'] = $attachmentsByTask[$tid] ?? [];
                    $task['attachment_count'] = count($task['attachments']);
                    
                    // Fetch numeric fields
                    $task['points'] = (int)($task['points'] ?? 0);
                    $task['bonus_points'] = (int)($task['bonus_points'] ?? 0);

                    $task['teammate_remarks'] = $teammatesByTask[$tid] ?? [];
                    $task['team_members'] = $teamMembersByTask[$tid] ?? [];
                    $task['comments'] = $commentsByTask[$tid] ?? [];
                }
            }

            echo json_encode(['status' => 'success', 'data' => $tasks]);
            break;

        case 'POST':
            // ACTION: Submit Task for Review (with files)
            $taskId = $_POST['task_id'] ?? null;
            if (!$taskId) throw new Exception("Task ID is required.");

            // Season Lock Check
            $seasonStmt = $db->prepare("SELECT season_id FROM tasks WHERE id = :id");
            $seasonStmt->execute(['id' => $taskId]);
            $taskSeasonId = $seasonStmt->fetchColumn();
            if ($taskSeasonId && FlowSync\Utils\AcademicSeasonManager::isSeasonLocked($taskSeasonId)) {
                throw new Exception("This task belongs to a locked academic season and cannot be modified or submitted.");
            }

            // Verify ownership in assignments
            $checkStmt = $db->prepare("SELECT ta.id, t.title FROM task_assignments ta JOIN tasks t ON ta.task_id = t.id WHERE ta.task_id = :tid AND ta.user_id = :uid");
            $checkStmt->execute(['tid' => $taskId, 'uid' => $session['user_id']]);
            $assignment = $checkStmt->fetch();
            if (!$assignment) throw new Exception("Unauthorized or task not found.");

            // Update assignment status and remarks
            $publicRemarks = $_POST['public_remarks'] ?? null;
            $privateRemarks = $_POST['private_remarks'] ?? null;
            $submissionLink = $_POST['submission_link'] ?? null;

            $stmt = $db->prepare("
                UPDATE task_assignments 
                SET status = 'Submitted', 
                    submitted_at = NOW(), 
                    progress = 98,
                    public_remarks = :pub,
                    private_remarks = :priv,
                    submission_link = :sub_link
                WHERE task_id = :tid AND user_id = :uid
            ");
            $stmt->execute([
                'tid' => $taskId, 
                'uid' => $session['user_id'],
                'pub' => $publicRemarks,
                'priv' => $privateRemarks,
                'sub_link' => $submissionLink
            ]);

            // Handle uploads
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
                        $tmpName = $files['tmp_name'][$key];
                        $storedName = 'faculty_task_' . $taskId . '_' . uniqid() . '.' . $ext;
                        if (move_uploaded_file($tmpName, $taskDir . $storedName)) {
                            $attStmt = $db->prepare("
                                INSERT INTO attachments (entity_type, task_id, institution_id, uploader_id, original_name, stored_name, file_size, file_type)
                                VALUES ('Task_Submission', :task_id, :inst_id, :uploader_id, :name, :stored_name, :size, :mime)
                            ");
                            $attStmt->execute([
                                'task_id' => $taskId,
                                'inst_id' => $institutionId,
                                'uploader_id' => $session['user_id'],
                                'name' => $name,
                                'stored_name' => $storedName,
                                'size' => $files['size'][$key],
                                'mime' => $files['type'][$key]
                            ]);
                        } else {
                            throw new Exception("Failed to save uploaded file: " . $name);
                        }
                    }
                }
            }

            $logger->log($session['user_id'], 'FACULTY_SUBMIT_TASK', 'TASK', $taskId);
            $facultyName = $session['name'] ?? 'Faculty';
            $notifier->notifyHOD($deptId, 'TASK_SUBMITTED', "$facultyName has submitted the task for review: " . $assignment['title'], $taskId, $session['user_id']);

            echo json_encode(['status' => 'success', 'message' => 'Task submitted for review']);
            break;

        case 'PUT':
            // ACTION: Update Task Status (Accept, Decline, In Progress)
            $data = json_decode(file_get_contents('php://input'), true);
            $taskId = $data['task_id'] ?? null;
            $newStatus = $data['status'] ?? '';

            if (!$taskId || !$newStatus) {
                throw new Exception("Task ID and new status are required.");
            }

            // Season Lock Check
            $seasonStmt = $db->prepare("SELECT season_id FROM tasks WHERE id = :id");
            $seasonStmt->execute(['id' => $taskId]);
            $taskSeasonId = $seasonStmt->fetchColumn();
            if ($taskSeasonId && FlowSync\Utils\AcademicSeasonManager::isSeasonLocked($taskSeasonId)) {
                throw new Exception("This task belongs to a locked academic season and its status cannot be changed.");
            }

            // Verify ownership in assignments
            $checkStmt = $db->prepare("SELECT ta.id, t.title FROM task_assignments ta JOIN tasks t ON ta.task_id = t.id WHERE ta.task_id = :tid AND ta.user_id = :uid");
            $checkStmt->execute(['tid' => $taskId, 'uid' => $session['user_id']]);
            $assignment = $checkStmt->fetch();
            if (!$assignment) {
                throw new Exception("Unauthorized. Task not assigned to you.");
            }

            $updateFields = ["status = :status"];
            $params = ['status' => $newStatus, 'tid' => $taskId, 'uid' => $session['user_id']];

            if ($newStatus === 'Accepted' || $newStatus === 'In Progress') {
                $updateFields[] = "accepted_at = COALESCE(accepted_at, NOW())";
            }
            
            // Add progress and remarks update if provided
            if (isset($data['progress'])) {
                $updateFields[] = "progress = :progress";
                $params['progress'] = (int)$data['progress'];
            }

            if (isset($data['public_remarks'])) {
                $updateFields[] = "public_remarks = :pub";
                $params['pub'] = $data['public_remarks'];
            }

            if (isset($data['private_remarks'])) {
                $updateFields[] = "private_remarks = :priv";
                $params['priv'] = $data['private_remarks'];
            }

            // Update Assignment
            $stmt = $db->prepare("UPDATE task_assignments SET " . implode(', ', $updateFields) . " WHERE task_id = :tid AND user_id = :uid");
            $stmt->execute($params);

            $logger->log($session['user_id'], 'FACULTY_UPDATE_TASK_STATUS', 'TASK', $taskId, ['status' => $newStatus, 'progress' => $data['progress'] ?? null]);
            
            $facultyName = $session['name'] ?? 'Faculty';
            if ($newStatus === 'Accepted') {
                $notifier->notifyHOD($deptId, 'TASK_ACCEPTED', "$facultyName has accepted the task: " . $assignment['title'], $taskId, $session['user_id']);
            } elseif ($newStatus === 'Declined') {
                $notifier->notifyHOD($deptId, 'TASK_DECLINED', "$facultyName has declined the task: " . $assignment['title'], $taskId, $session['user_id']);
            }

            echo json_encode(['status' => 'success', 'message' => "Task status updated to $newStatus"]);
            break;

        default:
            http_response_code(405);
            echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    }

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
