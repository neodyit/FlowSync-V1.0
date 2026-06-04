<?php

require_once __DIR__ . '/../bootstrap.php';

use FlowSync\Utils\AdminMiddleware;
use FlowSync\Config\Database;

$session = AdminMiddleware::check();
$db = Database::getInstance()->getConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        $stmt = $db->prepare("
            SELECT lp.total_points, lp.bonus_points, lp.tasks_completed,
                   u.id, u.name, u.email, u.profile_pic,
                   c.name as college_name, d.name as department_name
            FROM leaderboard_points lp
            JOIN users u ON lp.user_id = u.id
            LEFT JOIN faculty_departments fd ON u.id = fd.user_id
            LEFT JOIN departments d ON fd.department_id = d.id
            LEFT JOIN colleges c ON d.college_id = c.id
            WHERE lp.season_id = :season_id
            ORDER BY lp.total_points DESC, lp.tasks_completed DESC, lp.bonus_points DESC, lp.updated_at ASC
            LIMIT 100
        ");
        $stmt->execute(['season_id' => $currentSeasonId]);
        $leaderboard = $stmt->fetchAll();

        echo json_encode(['status' => 'success', 'data' => $leaderboard]);
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
