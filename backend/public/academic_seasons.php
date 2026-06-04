<?php

require_once __DIR__ . '/bootstrap.php';

use FlowSync\Config\Database;
use FlowSync\Utils\AdminMiddleware;
use FlowSync\Utils\AcademicSeasonManager;

// All logged in users can view seasons list, but only admins can modify/CRUD.
if (!$session) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized.']);
    exit;
}

$userId = $session['user_id'];
$roleId = (int)$session['role_id'];

$db = Database::getInstance()->getConnection();

// Fetch college_id of the logged in user
$userStmt = $db->prepare("SELECT college_id FROM users WHERE id = :uid");
$userStmt->execute(['uid' => $userId]);
$userCollegeId = $userStmt->fetchColumn();

// If admin, we allow overriding collegeId via request param/body
$collegeId = $userCollegeId;
if ($roleId === 1) {
    if (in_array($_SERVER['REQUEST_METHOD'], ['GET', 'DELETE']) && !empty($_GET['college_id'])) {
        $collegeId = (int)$_GET['college_id'];
    } elseif (in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT'])) {
        $inputData = json_decode(file_get_contents('php://input'), true);
        if (!empty($inputData['college_id'])) {
            $collegeId = (int)$inputData['college_id'];
        }
    }
}

if (!$collegeId) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'College ID is required.']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        $includeStats = isset($_GET['stats']) && $_GET['stats'] == 1;

        if ($includeStats) {
            // Fetch seasons with simple statistics
            $stmt = $db->prepare("
                SELECT s.*,
                       (SELECT COUNT(*) FROM tasks WHERE season_id = s.id) as total_tasks,
                       (SELECT COUNT(*) FROM tasks WHERE season_id = s.id AND status IN ('Submitted', 'Reviewed')) as completed_tasks,
                       (SELECT ROUND(AVG(TIMESTAMPDIFF(HOUR, assigned_at, updated_at)), 1) 
                        FROM tasks 
                        WHERE season_id = s.id AND status IN ('Submitted', 'Reviewed')) as avg_response_hours
                FROM academic_seasons s
                WHERE s.college_id = :cid
                ORDER BY s.start_date DESC
            ");
            $stmt->execute(['cid' => $collegeId]);
        } else {
            // Standard fetch
            $stmt = $db->prepare("
                SELECT * FROM academic_seasons 
                WHERE college_id = :cid
                ORDER BY start_date DESC
            ");
            $stmt->execute(['cid' => $collegeId]);
        }

        echo json_encode(['status' => 'success', 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        exit;
    }

    // Beyond GET, only Admin is allowed
    AdminMiddleware::check();

    if ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);

        if (empty($data['name']) || empty($data['start_date']) || empty($data['end_date']) || empty($data['type'])) {
            throw new Exception("Name, start date, end date, and type are required.");
        }

        // Check for date range overlap with existing seasons of the same college
        $overlapStmt = $db->prepare("
            SELECT COUNT(*) FROM academic_seasons
            WHERE college_id = :college_id
              AND start_date <= :end_date
              AND end_date >= :start_date
        ");
        $overlapStmt->execute([
            'college_id' => $collegeId,
            'start_date' => $data['start_date'],
            'end_date' => $data['end_date']
        ]);
        if ($overlapStmt->fetchColumn() > 0) {
            throw new Exception("The season dates overlap with an existing season for this college.");
        }

        $isDefault = !empty($data['is_default']) ? 1 : 0;
        $isLocked = !empty($data['is_locked']) ? 1 : 0;
        $status = $data['status'] ?? 'Inactive';

        $db->beginTransaction();

        // If this is set as default, reset other seasons of the college
        if ($isDefault === 1) {
            $resetStmt = $db->prepare("UPDATE academic_seasons SET is_default = 0 WHERE college_id = :cid");
            $resetStmt->execute(['cid' => $collegeId]);
        }

        $stmt = $db->prepare("
            INSERT INTO academic_seasons (college_id, name, start_date, end_date, type, description, status, is_default, is_locked)
            VALUES (:college_id, :name, :start_date, :end_date, :type, :description, :status, :is_default, :is_locked)
        ");
        $stmt->execute([
            'college_id' => $collegeId,
            'name' => $data['name'],
            'start_date' => $data['start_date'],
            'end_date' => $data['end_date'],
            'type' => $data['type'],
            'description' => $data['description'] ?? null,
            'status' => $status,
            'is_default' => $isDefault,
            'is_locked' => $isLocked
        ]);
        $newSeasonId = $db->lastInsertId();

        // Auto-map historical tasks and calculate initial leaderboard points
        AcademicSeasonManager::mapHistoricalTasks($db, $newSeasonId, $collegeId, $data['start_date'], $data['end_date']);

        // Cloning option support
        if (!empty($data['clone_from']) && !empty($data['clone_tasks'])) {
            $cloneFromId = (int)$data['clone_from'];
            
            // Clone tasks from source season as 'Draft' templates
            $tasksStmt = $db->prepare("
                SELECT department_id, assigned_by_id, assigned_to_id, assignment_mode, title, description, priority, task_type, category, task_link
                FROM tasks
                WHERE season_id = :src_id
            ");
            $tasksStmt->execute(['src_id' => $cloneFromId]);
            $tasksToClone = $tasksStmt->fetchAll(PDO::FETCH_ASSOC);

            if (!empty($tasksToClone)) {
                $insertTask = $db->prepare("
                    INSERT INTO tasks (college_id, department_id, assigned_by_id, assigned_to_id, assignment_mode, title, description, deadline, priority, task_type, category, status, assigned_at, task_link, season_id)
                    VALUES (:college_id, :department_id, :assigned_by_id, :assigned_to_id, :assignment_mode, :title, :description, :deadline, :priority, :task_type, :category, 'Draft', NOW(), :task_link, :season_id)
                ");

                // Target deadline: set to the end date of the new season, or keep it null/empty for Draft tasks
                $newDeadline = $data['end_date'];

                foreach ($tasksToClone as $task) {
                    $insertTask->execute([
                        'college_id' => $collegeId,
                        'department_id' => $task['department_id'],
                        'assigned_by_id' => $task['assigned_by_id'],
                        'assigned_to_id' => $task['assigned_to_id'],
                        'assignment_mode' => $task['assignment_mode'],
                        'title' => $task['title'],
                        'description' => $task['description'],
                        'deadline' => $newDeadline,
                        'priority' => $task['priority'],
                        'task_type' => $task['task_type'],
                        'category' => $task['category'],
                        'task_link' => $task['task_link'],
                        'season_id' => $newSeasonId
                    ]);
                }
            }
        }

        $logger = new \FlowSync\Utils\AuditLogger();
        $logger->log($userId, 'CREATE_SEASON', 'SEASON', $newSeasonId, ['name' => $data['name']]);

        $db->commit();

        echo json_encode(['status' => 'success', 'message' => 'Academic season created successfully.', 'id' => $newSeasonId]);
        exit;
    }

    if ($method === 'PUT') {
        $data = json_decode(file_get_contents('php://input'), true);

        if (empty($data['id'])) {
            throw new Exception("Academic Season ID is required.");
        }

        $seasonId = (int)$data['id'];

        // Validate that this season belongs to the user's college
        $chk = $db->prepare("SELECT COUNT(*) FROM academic_seasons WHERE id = :id AND college_id = :cid");
        $chk->execute(['id' => $seasonId, 'cid' => $collegeId]);
        if ($chk->fetchColumn() == 0) {
            throw new Exception("Unauthorized or invalid academic season.");
        }

        if (empty($data['start_date']) || empty($data['end_date'])) {
            throw new Exception("Start date and end date are required.");
        }

        // Check for date range overlap with other existing seasons of the same college
        $overlapStmt = $db->prepare("
            SELECT COUNT(*) FROM academic_seasons
            WHERE college_id = :college_id
              AND id != :id
              AND start_date <= :end_date
              AND end_date >= :start_date
        ");
        $overlapStmt->execute([
            'college_id' => $collegeId,
            'id' => $seasonId,
            'start_date' => $data['start_date'],
            'end_date' => $data['end_date']
        ]);
        if ($overlapStmt->fetchColumn() > 0) {
            throw new Exception("The updated dates overlap with an existing season for this college.");
        }

        $db->beginTransaction();

        $isDefault = !empty($data['is_default']) ? 1 : 0;
        if ($isDefault === 1) {
            // Reset other defaults
            $resetStmt = $db->prepare("UPDATE academic_seasons SET is_default = 0 WHERE college_id = :cid");
            $resetStmt->execute(['cid' => $collegeId]);
        }

        $isLocked = !empty($data['is_locked']) ? 1 : 0;
        $status = $data['status'] ?? 'Inactive';

        $stmt = $db->prepare("
            UPDATE academic_seasons 
            SET name = :name, start_date = :start_date, end_date = :end_date, 
                type = :type, description = :description, status = :status, 
                is_default = :is_default, is_locked = :is_locked
            WHERE id = :id AND college_id = :cid
        ");
        $stmt->execute([
            'name' => $data['name'],
            'start_date' => $data['start_date'],
            'end_date' => $data['end_date'],
            'type' => $data['type'],
            'description' => $data['description'] ?? null,
            'status' => $status,
            'is_default' => $isDefault,
            'is_locked' => $isLocked,
            'id' => $seasonId,
            'cid' => $collegeId
        ]);

        // Recalculate historical task mappings and leaderboard points
        AcademicSeasonManager::mapHistoricalTasks($db, $seasonId, $collegeId, $data['start_date'], $data['end_date']);

        $logger = new \FlowSync\Utils\AuditLogger();
        $logger->log($userId, 'UPDATE_SEASON', 'SEASON', $seasonId, ['name' => $data['name']]);

        $db->commit();

        echo json_encode(['status' => 'success', 'message' => 'Academic season updated successfully.']);
        exit;
    }

    if ($method === 'DELETE') {
        $seasonId = isset($_GET['id']) ? (int)$_GET['id'] : null;

        if (!$seasonId) {
            throw new Exception("Academic Season ID is required.");
        }

        // Validate that this season belongs to the user's college
        $chk = $db->prepare("SELECT COUNT(*) FROM academic_seasons WHERE id = :id AND college_id = :cid");
        $chk->execute(['id' => $seasonId, 'cid' => $collegeId]);
        if ($chk->fetchColumn() == 0) {
            throw new Exception("Unauthorized or invalid academic season.");
        }

        // Prevent deletion of the default season
        $chkDefault = $db->prepare("SELECT is_default FROM academic_seasons WHERE id = :id");
        $chkDefault->execute(['id' => $seasonId]);
        if ($chkDefault->fetchColumn() == 1) {
            throw new Exception("Cannot delete the default active academic season.");
        }

        $stmt = $db->prepare("DELETE FROM academic_seasons WHERE id = :id AND college_id = :cid");
        $stmt->execute(['id' => $seasonId, 'cid' => $collegeId]);

        $logger = new \FlowSync\Utils\AuditLogger();
        $logger->log($userId, 'DELETE_SEASON', 'SEASON', $seasonId);

        echo json_encode(['status' => 'success', 'message' => 'Academic season deleted successfully.']);
        exit;
    }

    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed.']);

} catch (\PDOException $e) {
    if ($db && $db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
} catch (\Exception $e) {
    if ($db && $db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
