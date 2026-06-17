<?php

require_once __DIR__ . '/../bootstrap.php';

use FlowSync\Utils\AdminMiddleware;
use FlowSync\Config\Database;

$session = AdminMiddleware::check();

$db = Database::getInstance()->getConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 300;
        $userId = isset($_GET['user_id']) && $_GET['user_id'] !== '' ? (int) $_GET['user_id'] : null;
        $search = isset($_GET['search']) ? trim($_GET['search']) : '';
        $action = isset($_GET['action']) && $_GET['action'] !== 'all' ? trim($_GET['action']) : '';
        $timeframe = isset($_GET['timeframe']) ? trim($_GET['timeframe']) : '';

        $whereClauses = [];
        $params = [];

        if ($userId !== null) {
            $whereClauses[] = "a.user_id = :user_id";
            $params['user_id'] = $userId;
        }

        if ($action !== '') {
            $whereClauses[] = "a.action = :action";
            $params['action'] = $action;
        }

        if ($search !== '') {
            $whereClauses[] = "(u.name LIKE :search OR u.email LIKE :search OR a.action LIKE :search OR a.resource LIKE :search OR a.details LIKE :search)";
            $params['search'] = "%$search%";
        }

        if ($timeframe === 'today') {
            $whereClauses[] = "DATE(a.created_at) = CURDATE()";
        } elseif ($timeframe === 'week') {
            $whereClauses[] = "a.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
        }

        $whereSql = '';
        if (!empty($whereClauses)) {
            $whereSql = 'WHERE ' . implode(' AND ', $whereClauses);
        }

        // Get logs with user info
        $sql = "
            SELECT a.*, u.name as user_name, u.email as user_email
            FROM audit_logs a
            LEFT JOIN users u ON a.user_id = u.id
            $whereSql
            ORDER BY a.created_at DESC
            LIMIT :limit
        ";

        $stmt = $db->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        foreach ($params as $key => $val) {
            $stmt->bindValue(":$key", $val);
        }
        $stmt->execute();
        $logs = $stmt->fetchAll();

        // Count totals directly from DB
        $totalCount = (int) ($db->query("SELECT COUNT(*) FROM audit_logs")->fetchColumn() ?: 0);
        $deleteCount = (int) ($db->query("SELECT COUNT(*) FROM audit_logs WHERE action LIKE '%DELETE%'")->fetchColumn() ?: 0);
        $loginCount = (int) ($db->query("SELECT COUNT(*) FROM audit_logs WHERE action = 'LOGIN'")->fetchColumn() ?: 0);
        $hitCount = (int) ($db->query("SELECT COUNT(*) FROM audit_logs WHERE action = 'API_HIT' OR action LIKE '%SYNC%'")->fetchColumn() ?: 0);

        echo json_encode([
            'status' => 'success',
            'data' => $logs,
            'stats' => [
                'total' => $totalCount,
                'deletes' => $deleteCount,
                'logins' => $loginCount,
                'hits' => $hitCount
            ]
        ]);
    } elseif ($method === 'DELETE') {
        $data = json_decode(file_get_contents('php://input'), true);
        $ids = [];
        if (isset($_GET['id'])) {
            $ids[] = (int) $_GET['id'];
        } elseif (isset($data['ids']) && is_array($data['ids'])) {
            $ids = array_map('intval', $data['ids']);
        }

        if (empty($ids)) {
            throw new Exception("Log ID(s) are required for deletion.");
        }

        // Perform deletion
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $db->prepare("DELETE FROM audit_logs WHERE id IN ($placeholders)");
        $stmt->execute($ids);

        // Audit log the action (log that an admin deleted audit logs)
        $logger = new \FlowSync\Utils\AuditLogger();
        $logger->log($session['user_id'] ?? null, 'DELETE_AUDIT_LOGS', 'AUDIT_LOGS', implode(',', $ids), ['deleted_count' => count($ids)]);

        echo json_encode([
            'status' => 'success',
            'message' => count($ids) . ' audit log(s) deleted successfully.'
        ]);
    } else {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
