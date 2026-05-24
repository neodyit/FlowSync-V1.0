<?php
require_once __DIR__ . '/bootstrap.php';

use FlowSync\Config\Database;
use FlowSync\Auth\AuthService;

$db = Database::getInstance()->getConnection();
$auth = new AuthService();
$session = $auth->validateSession();

if (!$session) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit;
}

$userId = $session['user_id'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $batchId = $data['batch_id'] ?? null;
    $sessions = $data['sessions'] ?? [];

    if (!$batchId || !is_array($sessions)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Invalid payload']);
        exit;
    }

    try {
        $db->beginTransaction();

        // 1. Check if batch_id already exists to ensure idempotency
        $stmt = $db->prepare("SELECT id FROM engagement_batches WHERE batch_id = :batch_id LIMIT 1");
        $stmt->execute(['batch_id' => $batchId]);
        if ($stmt->fetch()) {
            // Batch already processed, just acknowledge
            $db->rollBack();
            echo json_encode(['status' => 'success', 'batch_id' => $batchId, 'message' => 'Batch already processed']);
            exit;
        }

        // 2. Insert batch record
        $stmt = $db->prepare("INSERT INTO engagement_batches (batch_id, user_id) VALUES (:batch_id, :user_id)");
        $stmt->execute(['batch_id' => $batchId, 'user_id' => $userId]);

        // 3. Insert session records
        if (!empty($sessions)) {
            $insertSql = "INSERT INTO engagement_sessions (batch_id, user_id, page_url, active_time_seconds, interaction_count, device_info, timestamp) 
                          VALUES (:batch_id, :user_id, :page_url, :active_time, :interactions, :device_info, :ts)";
            $stmt = $db->prepare($insertSql);

            foreach ($sessions as $s) {
                $stmt->execute([
                    'batch_id' => $batchId,
                    'user_id' => $userId,
                    'page_url' => $s['page_url'] ?? '/',
                    'active_time' => (int)($s['active_time'] ?? 0),
                    'interactions' => (int)($s['interactions'] ?? 0),
                    'device_info' => isset($s['device_info']) ? json_encode($s['device_info']) : null,
                    'ts' => isset($s['timestamp']) ? date('Y-m-d H:i:s', strtotime($s['timestamp'])) : date('Y-m-d H:i:s')
                ]);
            }
        }

        $db->commit();
        echo json_encode(['status' => 'success', 'batch_id' => $batchId]);
    } catch (Exception $e) {
        $db->rollBack();
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method Not Allowed']);
}
