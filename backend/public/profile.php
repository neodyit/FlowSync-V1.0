<?php

require_once __DIR__ . '/bootstrap.php';

use FlowSync\Config\Database;
use FlowSync\Auth\AuthService;
use FlowSync\Utils\AuditLogger;

$auth = new AuthService();
$session = $auth->validateSession();

if (!$session) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized.']);
    exit;
}

$db = Database::getInstance()->getConnection();
$logger = new AuditLogger();
$userId = $session['user_id'];

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // If an ID is provided, fetch that user (if public), otherwise fetch own profile
    $targetId = $_GET['id'] ?? $userId;
    
    $stmt = $db->prepare("
        SELECT u.id, u.name, u.email, u.role_id, u.phone, u.bio, u.achievements, u.profile_pic, u.is_public, u.designation,
               u.created_at, u.is_active,
               r.name as role_name, d.name as department_name, c.name as college_name, u.college_id
        FROM users u
        JOIN roles r ON u.role_id = r.id
        LEFT JOIN colleges c ON u.college_id = c.id
        LEFT JOIN departments d ON (u.role_id = 2 AND d.hod_id = u.id) 
                            OR (u.role_id = 3 AND EXISTS(SELECT 1 FROM faculty_departments fd WHERE fd.user_id = u.id AND fd.department_id = d.id))
        WHERE u.id = :id
        LIMIT 1
    ");
    
    $stmt->execute(['id' => $targetId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'User not found.']);
        exit;
    }

    // Get active season ID
    $activeSeasonId = $GLOBALS['currentSeasonId'] ?? null;
    if (!$activeSeasonId) {
        require_once __DIR__ . '/../src/Utils/AcademicSeasonManager.php';
        $activeSeasonId = \FlowSync\Utils\AcademicSeasonManager::getCurrentSeasonId($targetId);
    }

    $totalPoints = 0;
    $tasksCompleted = 0;
    $leaderboardRank = 'N/A';
    $adherenceRate = 0; // Default

    if ($activeSeasonId) {
        $isHOD = ((int)$user['role_id'] === 2);

        if ($isHOD) {
            // Get HOD's department ID
            $deptStmt = $db->prepare("
                SELECT d.id 
                FROM departments d 
                WHERE d.hod_id = :id 
                LIMIT 1
            ");
            $deptStmt->execute(['id' => $targetId]);
            $deptId = $deptStmt->fetchColumn();

            if ($deptId) {
                // 1. Department Points (Total points sum of all department faculty)
                $ptsStmt = $db->prepare("
                    SELECT SUM(lp.total_points) 
                    FROM leaderboard_points lp
                    JOIN users u ON lp.user_id = u.id
                    JOIN faculty_departments fd ON u.id = fd.user_id
                    WHERE fd.department_id = :dept_id
                    AND u.role_id = 3
                    AND lp.season_id = :season_id
                ");
                $ptsStmt->execute(['dept_id' => $deptId, 'season_id' => $activeSeasonId]);
                $totalPoints = (int)$ptsStmt->fetchColumn() ?: 0;

                // 2. Pending Reviews
                $revStmt = $db->prepare("
                    SELECT COUNT(*) 
                    FROM tasks 
                    WHERE department_id = :dept_id AND season_id = :season_id
                    AND status = 'Under Review'
                ");
                $revStmt->execute(['dept_id' => $deptId, 'season_id' => $activeSeasonId]);
                $tasksCompleted = (int)$revStmt->fetchColumn() ?: 0;

                // 3. Department Completion Rate
                $compStmt = $db->prepare("SELECT COUNT(*) FROM tasks WHERE department_id = :dept_id AND season_id = :season_id AND status = 'Completed'");
                $compStmt->execute(['dept_id' => $deptId, 'season_id' => $activeSeasonId]);
                $compCount = $compStmt->fetchColumn();

                $totStmt = $db->prepare("SELECT COUNT(*) FROM tasks WHERE department_id = :dept_id AND season_id = :season_id AND status != 'Draft'");
                $totStmt->execute(['dept_id' => $deptId, 'season_id' => $activeSeasonId]);
                $totCount = $totStmt->fetchColumn();

                $leaderboardRank = ($totCount > 0) ? round(($compCount / $totCount) * 100) . '%' : '0%';

                // 4. Active Department Load
                $actStmt = $db->prepare("
                    SELECT COUNT(*) 
                    FROM tasks 
                    WHERE department_id = :dept_id AND season_id = :season_id
                    AND CAST(status AS CHAR) IN ('Assigned', 'Accepted', 'In Progress', 'Submitted', 'Under Review', 'Rework Required')
                ");
                $actStmt->execute(['dept_id' => $deptId, 'season_id' => $activeSeasonId]);
                $adherenceRate = (int)$actStmt->fetchColumn() ?: 0;
            }
        } else {
            // Fetch points and completed tasks
            $lpStmt = $db->prepare("
                SELECT total_points, tasks_completed 
                FROM leaderboard_points 
                WHERE user_id = :uid AND season_id = :sid
                LIMIT 1
            ");
            $lpStmt->execute(['uid' => $targetId, 'sid' => $activeSeasonId]);
            $lpData = $lpStmt->fetch(PDO::FETCH_ASSOC);
            if ($lpData) {
                $totalPoints = (int)$lpData['total_points'];
                $tasksCompleted = (int)$lpData['tasks_completed'];
            }

            // Calculate rank in department if role is Faculty (3)
            if ((int)$user['role_id'] === 3) {
                // Get department first
                $deptStmt = $db->prepare("SELECT department_id FROM faculty_departments WHERE user_id = :uid LIMIT 1");
                $deptStmt->execute(['uid' => $targetId]);
                $deptId = $deptStmt->fetchColumn();

                if ($deptId) {
                    $rankStmt = $db->prepare("
                        SELECT lp.user_id
                        FROM leaderboard_points lp
                        JOIN users u ON lp.user_id = u.id
                        JOIN faculty_departments fd ON u.id = fd.user_id
                        WHERE u.role_id = 3
                          AND fd.department_id = :dept_id
                          AND lp.season_id = :season_id
                        ORDER BY lp.total_points DESC, lp.tasks_completed DESC, lp.bonus_points DESC, lp.updated_at ASC
                    ");
                    $rankStmt->execute(['dept_id' => $deptId, 'season_id' => $activeSeasonId]);
                    $rankings = $rankStmt->fetchAll(PDO::FETCH_COLUMN);
                    
                    $foundRank = array_search($targetId, $rankings);
                    if ($foundRank !== false) {
                        $leaderboardRank = $foundRank + 1;
                    }
                }
            }

            // Calculate adherence rate based on task reviews (approved vs rejected or submitted within deadline)
            $adherenceStmt = $db->prepare("
                SELECT 
                    COUNT(*) as total_tasks,
                    SUM(CASE WHEN t.deadline >= COALESCE(ta.submitted_at, NOW()) OR ta.status = 'approved' THEN 1 ELSE 0 END) as timely_tasks
                FROM task_assignments ta
                JOIN tasks t ON ta.task_id = t.id
                JOIN users u ON ta.user_id = u.id
                WHERE ta.user_id = :uid AND t.season_id = :sid
                AND (t.created_at >= u.created_at OR ta.is_manually_included = 1)
            ");
            $adherenceStmt->execute(['uid' => $targetId, 'sid' => $activeSeasonId]);
            $adherenceData = $adherenceStmt->fetch(PDO::FETCH_ASSOC);
            if ($adherenceData && (int)$adherenceData['total_tasks'] > 0) {
                $adherenceRate = round(((int)$adherenceData['timely_tasks'] / (int)$adherenceData['total_tasks']) * 100);
            }
        }
    }

    $user['total_points'] = $totalPoints;
    $user['tasks_completed'] = $tasksCompleted;
    $user['leaderboard_rank'] = $leaderboardRank;
    $user['adherence_rate'] = $adherenceRate;

    // Privacy check
    if ($targetId != $userId && $user['is_public'] == 0) {
        $canAccessPrivate = false;
        
        // Check if requester is HOD
        $roleCheck = $db->prepare("SELECT role_id FROM users WHERE id = :uid");
        $roleCheck->execute(['uid' => $userId]);
        $reqUser = $roleCheck->fetch();
        $viewerRole = $reqUser ? intval($reqUser['role_id']) : 3;
        
        if ($viewerRole === 2 || $viewerRole === 1) {
            $canAccessPrivate = true;
        } else {
            // Check if teammate (share at least one task)
            $collabCheck = $db->prepare("
                SELECT 1 
                FROM task_assignments ta1 
                JOIN task_assignments ta2 ON ta1.task_id = ta2.task_id 
                WHERE ta1.user_id = :viewer_id AND ta2.user_id = :target_id 
                LIMIT 1
            ");
            $collabCheck->execute(['viewer_id' => $userId, 'target_id' => $targetId]);
            if ($collabCheck->fetch()) {
                $canAccessPrivate = true;
            }
        }

        if (!$canAccessPrivate) {
            http_response_code(403);
            echo json_encode(['status' => 'error', 'message' => 'This profile is private.']);
            exit;
        }

        // Mask contact details for peers (non-HOD / non-Admin)
        if ($viewerRole !== 2 && $viewerRole !== 1) {
            $user['email'] = 'Locked (Private Profile)';
            $user['phone'] = 'Locked (Private Profile)';
        }
    }

    // Parse achievements
    $user['achievements'] = $user['achievements'] ? json_decode($user['achievements'], true) : [];

    echo json_encode(['status' => 'success', 'data' => $user]);

} else if ($method === 'POST' || $method === 'PUT') {
    // Update profile
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Handle multipart if it's a file upload (POST)
    if (isset($_FILES['profile_pic'])) {
        $file = $_FILES['profile_pic'];
        $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
        $fileName = 'profile_' . $userId . '_' . time() . '.' . $ext;
        $uploadDir = __DIR__ . '/uploads/profiles/';
        
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }
        
        if (move_uploaded_file($file['tmp_name'], $uploadDir . $fileName)) {
            $profilePicUrl = 'uploads/profiles/' . $fileName;
            $stmt = $db->prepare("UPDATE users SET profile_pic = :pic WHERE id = :id");
            $stmt->execute(['pic' => $profilePicUrl, 'id' => $userId]);
            echo json_encode(['status' => 'success', 'message' => 'Profile picture updated.', 'url' => $profilePicUrl]);
            exit;
        } else {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Failed to upload profile picture.']);
            exit;
        }
    }

    // Standard field updates
    $updates = [];
    $params = ['id' => $userId];

    $allowedFields = ['name', 'phone', 'bio', 'achievements', 'is_public', 'designation'];
    
    foreach ($allowedFields as $field) {
        if (isset($data[$field])) {
            $val = $data[$field];
            if ($field === 'achievements') $val = json_encode($val);
            if ($field === 'is_public') $val = $val ? 1 : 0;
            
            $updates[] = "$field = :$field";
            $params[$field] = $val;
        }
    }

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'No fields to update.']);
        exit;
    }

    $sql = "UPDATE users SET " . implode(', ', $updates) . " WHERE id = :id";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    $logger->log($userId, 'UPDATE', 'USER', $userId, ['fields' => array_keys($data)]);

    echo json_encode(['status' => 'success', 'message' => 'Profile updated successfully.']);
}
