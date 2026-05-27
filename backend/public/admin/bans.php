<?php

require_once __DIR__ . '/../bootstrap.php';

use FlowSync\Utils\AdminMiddleware;
use FlowSync\Config\Database;

$session = AdminMiddleware::check();

$db = Database::getInstance()->getConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            // Fetch bans
            $bansStmt = $db->query("SELECT * FROM banned_clients ORDER BY banned_at DESC");
            $bans = $bansStmt->fetchAll();

            // Fetch failed attempts
            $attemptsStmt = $db->query("SELECT * FROM login_attempts WHERE is_successful = 0 ORDER BY attempted_at DESC LIMIT 100");
            $attempts = $attemptsStmt->fetchAll();

            echo json_encode([
                'status' => 'success',
                'data' => [
                    'bans' => $bans,
                    'attempts' => $attempts
                ]
            ]);
            break;

        case 'PUT':
            $data = json_decode(file_get_contents('php://input'), true);
            if (empty($data['id'])) {
                throw new Exception("Ban ID is required");
            }
            
            $stmt = $db->prepare("
                UPDATE banned_clients 
                SET status = 'unbanned', unbanned_at = CURRENT_TIMESTAMP 
                WHERE id = :id
            ");
            $stmt->execute(['id' => $data['id']]);

            $logger = new \FlowSync\Utils\AuditLogger();
            $logger->log($session['user_id'] ?? null, 'UNBAN_CLIENT', 'SECURITY', $data['id'], ['ban_id' => $data['id']]);

            echo json_encode(['status' => 'success', 'message' => 'Client unbanned successfully']);
            break;

        case 'DELETE':
            $type = $_GET['type'] ?? '';
            $id = $_GET['id'] ?? null;

            $logger = new \FlowSync\Utils\AuditLogger();

            if ($type === 'all_attempts') {
                $db->exec("DELETE FROM login_attempts");
                $logger->log($session['user_id'] ?? null, 'CLEAR_LOGIN_ATTEMPTS', 'SECURITY');
                echo json_encode(['status' => 'success', 'message' => 'All security attempts logged have been purged.']);
            } elseif ($type === 'all_bans') {
                $db->exec("DELETE FROM banned_clients");
                $logger->log($session['user_id'] ?? null, 'CLEAR_IP_BANS', 'SECURITY');
                echo json_encode(['status' => 'success', 'message' => 'All IP and device bans have been purged.']);
            } elseif ($type === 'attempt' && $id) {
                $stmt = $db->prepare("DELETE FROM login_attempts WHERE id = :id");
                $stmt->execute(['id' => $id]);
                echo json_encode(['status' => 'success', 'message' => 'Specific attempt log purged successfully.']);
            } elseif ($type === 'ban' && $id) {
                $stmt = $db->prepare("DELETE FROM banned_clients WHERE id = :id");
                $stmt->execute(['id' => $id]);
                echo json_encode(['status' => 'success', 'message' => 'Specific ban record purged successfully.']);
            } else {
                throw new Exception("Invalid deletion parameters provided.");
            }
            break;

        default:
            http_response_code(405);
            echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    }
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
