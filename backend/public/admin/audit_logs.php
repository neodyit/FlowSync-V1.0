<?php

require_once __DIR__ . '/../bootstrap.php';

use FlowSync\Utils\AdminMiddleware;
use FlowSync\Config\Database;

AdminMiddleware::check();

$db = Database::getInstance()->getConnection();

try {
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;
    
    // Get logs with user info
    $stmt = $db->prepare("
        SELECT a.*, u.name as user_name, u.email as user_email
        FROM audit_logs a
        LEFT JOIN users u ON a.user_id = u.id
        ORDER BY a.created_at DESC
        LIMIT :limit
    ");
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    $logs = $stmt->fetchAll();
    
    // Count totals directly from DB
    $totalCount = (int)($db->query("SELECT COUNT(*) FROM audit_logs")->fetchColumn() ?: 0);
    $deleteCount = (int)($db->query("SELECT COUNT(*) FROM audit_logs WHERE action LIKE '%DELETE%'")->fetchColumn() ?: 0);
    $loginCount = (int)($db->query("SELECT COUNT(*) FROM audit_logs WHERE action = 'LOGIN'")->fetchColumn() ?: 0);
    $hitCount = (int)($db->query("SELECT COUNT(*) FROM audit_logs WHERE action = 'API_HIT' OR action LIKE '%SYNC%'")->fetchColumn() ?: 0);
    
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
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
