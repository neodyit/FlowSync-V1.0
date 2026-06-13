<?php

require_once __DIR__ . '/../bootstrap.php';

use FlowSync\Utils\AdminMiddleware;
use FlowSync\Config\Database;

$session = AdminMiddleware::check();
$db = Database::getInstance()->getConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        $collegeId = $_GET['college_id'] ?? null;
        $deptId = $_GET['department_id'] ?? null;
        $seasonId = $_GET['season_id'] ?? null;
        $overview = $_GET['overview'] ?? null;

        if (!$seasonId) {
            if ($collegeId) {
                // Get default season for this college
                $seasonStmt = $db->prepare("SELECT id FROM academic_seasons WHERE college_id = :cid AND is_default = 1 LIMIT 1");
                $seasonStmt->execute(['cid' => $collegeId]);
                $seasonId = $seasonStmt->fetchColumn();
                if (!$seasonId) {
                    // Get latest season for this college
                    $seasonStmt = $db->prepare("SELECT id FROM academic_seasons WHERE college_id = :cid ORDER BY id DESC LIMIT 1");
                    $seasonStmt->execute(['cid' => $collegeId]);
                    $seasonId = $seasonStmt->fetchColumn();
                }
            }

            if (!$seasonId) {
                $seasonId = $currentSeasonId;
            }

            if (!$seasonId) {
                // Get any default active season in the system
                $seasonStmt = $db->query("SELECT id FROM academic_seasons WHERE is_default = 1 LIMIT 1");
                $seasonId = $seasonStmt->fetchColumn();
                if (!$seasonId) {
                    $seasonId = $db->query("SELECT id FROM academic_seasons ORDER BY id DESC LIMIT 1")->fetchColumn();
                }
            }
        }

        if ($overview) {
            // Get colleges and their points
            $collegeQuery = "
                SELECT 
                    c.id AS college_id,
                    c.name AS college_name,
                    c.short_name AS college_short_name,
                    COALESCE(SUM(lp.total_points), 0) AS total_points,
                    COALESCE(SUM(lp.tasks_completed), 0) AS tasks_completed
                FROM colleges c
                LEFT JOIN users u ON u.college_id = c.id AND u.role_id = 3
                LEFT JOIN (
                    SELECT s1.id, s1.college_id
                    FROM academic_seasons s1
                    WHERE s1.id = (
                        SELECT s2.id 
                        FROM academic_seasons s2 
                        WHERE s2.college_id = s1.college_id 
                        ORDER BY s2.is_default DESC, s2.end_date DESC, s2.id DESC 
                        LIMIT 1
                    )
                ) as_season ON as_season.college_id = c.id
                LEFT JOIN leaderboard_points lp ON lp.user_id = u.id AND lp.season_id = as_season.id
                GROUP BY c.id
                ORDER BY total_points DESC, c.name ASC
            ";
            $stmt = $db->prepare($collegeQuery);
            $stmt->execute();
            $colData = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get departments and their points
            $deptQuery = "
                SELECT 
                    d.id AS department_id,
                    d.name AS department_name,
                    d.code AS department_code,
                    d.college_id,
                    COALESCE(SUM(lp.total_points), 0) AS total_points,
                    COALESCE(SUM(lp.tasks_completed), 0) AS tasks_completed
                FROM departments d
                LEFT JOIN faculty_departments fd ON fd.department_id = d.id
                LEFT JOIN users u ON u.id = fd.user_id AND u.role_id = 3
                LEFT JOIN (
                    SELECT s1.id, s1.college_id
                    FROM academic_seasons s1
                    WHERE s1.id = (
                        SELECT s2.id 
                        FROM academic_seasons s2 
                        WHERE s2.college_id = s1.college_id 
                        ORDER BY s2.is_default DESC, s2.end_date DESC, s2.id DESC 
                        LIMIT 1
                    )
                ) as_season ON as_season.college_id = d.college_id
                LEFT JOIN leaderboard_points lp ON lp.user_id = u.id AND lp.season_id = as_season.id
                GROUP BY d.id
                ORDER BY total_points DESC, d.name ASC
            ";
            $stmt = $db->prepare($deptQuery);
            $stmt->execute();
            $deptData = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Group departments by college
            $collegesMap = [];
            foreach ($colData as $col) {
                $col['departments'] = [];
                $collegesMap[$col['college_id']] = $col;
            }

            foreach ($deptData as $dept) {
                $cId = $dept['college_id'];
                if (isset($collegesMap[$cId])) {
                    $collegesMap[$cId]['departments'][] = $dept;
                }
            }

            echo json_encode([
                'status' => 'success',
                'data' => array_values($collegesMap)
            ]);
            exit;
        }

        // Fetch leaderboard data
        $query = "
            SELECT lp.total_points, lp.bonus_points, lp.tasks_completed,
                   u.id, u.name, u.email, u.profile_pic,
                   c.name as college_name, d.name as department_name
            FROM leaderboard_points lp
            JOIN users u ON lp.user_id = u.id
            LEFT JOIN faculty_departments fd ON u.id = fd.user_id
            LEFT JOIN departments d ON fd.department_id = d.id
            LEFT JOIN colleges c ON u.college_id = c.id
            WHERE lp.season_id = :season_id AND u.role_id = 3
        ";
        $params = ['season_id' => $seasonId];

        if ($collegeId) {
            $query .= " AND u.college_id = :college_id";
            $params['college_id'] = $collegeId;
        }

        if ($deptId) {
            $query .= " AND fd.department_id = :dept_id AND lp.total_points > 0";
            $params['dept_id'] = $deptId;
        }

        $query .= " ORDER BY lp.total_points DESC, lp.tasks_completed DESC, lp.bonus_points DESC, lp.updated_at ASC";

        if (!$deptId) {
            $query .= " LIMIT 20";
        }

        $stmt = $db->prepare($query);
        $stmt->execute($params);
        $leaderboard = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch departments and seasons for the filters
        $depts = [];
        $seasons = [];
        if ($collegeId) {
            $deptStmt = $db->prepare("SELECT id, name, code FROM departments WHERE college_id = :cid AND is_enabled = 1 ORDER BY name ASC");
            $deptStmt->execute(['cid' => $collegeId]);
            $depts = $deptStmt->fetchAll(PDO::FETCH_ASSOC);

            $seasonStmt = $db->prepare("SELECT id, name, is_default, is_locked FROM academic_seasons WHERE college_id = :cid ORDER BY start_date DESC");
            $seasonStmt->execute(['cid' => $collegeId]);
            $seasons = $seasonStmt->fetchAll(PDO::FETCH_ASSOC);
        }

        echo json_encode([
            'status' => 'success',
            'data' => $leaderboard,
            'departments' => $depts,
            'seasons' => $seasons,
            'active_season_id' => $seasonId ? (int)$seasonId : null
        ]);
    } else if ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        if (isset($data['action']) && $data['action'] === 'reset_season') {
            
            $db->beginTransaction();
            $stmt = $db->prepare("DELETE FROM leaderboard_points WHERE season_id = :season_id");
            $stmt->execute(['season_id' => $currentSeasonId]);
            $db->commit();

            $logger = new \FlowSync\Utils\AuditLogger();
            $logger->log($session['user_id'] ?? null, 'LEADERBOARD_RESET', 'LEADERBOARD_POINTS', null, ['action' => 'Reset current season', 'season_id' => $currentSeasonId]);

            echo json_encode(['status' => 'success', 'message' => 'Current season leaderboard has been reset.']);
        } else {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Invalid action.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    }
} catch (\Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
