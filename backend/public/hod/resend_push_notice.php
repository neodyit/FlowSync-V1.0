<?php
require_once __DIR__ . '/../bootstrap.php';
use FlowSync\Utils\HODMiddleware;
use FlowSync\Config\Database;

$session = HODMiddleware::check();
$db = Database::getInstance()->getConnection();

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        throw new Exception("Method not allowed");
    }

    $json = file_get_contents('php://input');
    $data = json_decode($json, true);
    
    $pushNoticeId = $data['push_notice_id'] ?? null;
    $userIds = $data['user_ids'] ?? [];

    // Ensure logs directory exists
    $logDir = __DIR__ . '/../../logs';
    if (!is_dir($logDir)) {
        mkdir($logDir, 0777, true);
    }
    $logFile = $logDir . '/ping.log';
    $logData = date('[Y-m-d H:i:s] ') . "Request: push_notice_id=$pushNoticeId, user_ids=" . json_encode($userIds) . "\n";
    file_put_contents($logFile, $logData, FILE_APPEND);

    if (!$pushNoticeId || empty($userIds)) {
        throw new Exception("Push notice ID and user IDs are required.");
    }

    $db->beginTransaction();

    // Verify ownership
    $stmt = $db->prepare("SELECT id FROM push_notices WHERE id = :id AND hod_id = :hod_id");
    $stmt->execute(['id' => $pushNoticeId, 'hod_id' => $session['user_id']]);
    if (!$stmt->fetch()) {
        throw new Exception("Unauthorized to modify this notice.");
    }

    // Get the details of the original notifications
    $inQuery = implode(',', array_fill(0, count($userIds), '?'));
    $selectStmt = $db->prepare("
        SELECT * FROM notifications 
        WHERE push_notice_id = ? AND user_id IN ($inQuery)
    ");
    $params = array_merge([$pushNoticeId], $userIds);
    
    $selectStmt->execute($params);
    $oldNotifs = $selectStmt->fetchAll(PDO::FETCH_ASSOC);

    file_put_contents($logFile, "Found " . count($oldNotifs) . " notifications to resend: " . json_encode($oldNotifs) . "\n", FILE_APPEND);

    if (empty($oldNotifs)) {
        // If not found, let's see if there are any notifications with this push_notice_id at all
        $checkStmt = $db->prepare("SELECT id, user_id, is_read FROM notifications WHERE push_notice_id = ?");
        $checkStmt->execute([$pushNoticeId]);
        $allNotifs = $checkStmt->fetchAll(PDO::FETCH_ASSOC);
        file_put_contents($logFile, "Fallback Check (all notifications for notice $pushNoticeId): " . json_encode($allNotifs) . "\n", FILE_APPEND);
    }

    // Delete them
    $deleteStmt = $db->prepare("
        DELETE FROM notifications 
        WHERE push_notice_id = ? AND user_id IN ($inQuery)
    ");
    $deleteStmt->execute($params);

    // Re-insert them
    $insertStmt = $db->prepare("
        INSERT INTO notifications (user_id, type, title, message, points, trigger_user_id, is_read, is_actioned, push_notice_id, attachment_url)
        VALUES (:user_id, :type, :title, :message, :points, :trigger_user_id, 0, 0, :push_notice_id, :attachment_url)
    ");

    foreach ($oldNotifs as $notif) {
        $insertStmt->execute([
            'user_id' => $notif['user_id'],
            'type' => $notif['type'],
            'title' => $notif['title'],
            'message' => $notif['message'],
            'points' => $notif['points'],
            'trigger_user_id' => $notif['trigger_user_id'],
            'push_notice_id' => $notif['push_notice_id'],
            'attachment_url' => $notif['attachment_url']
        ]);
    }

    $db->commit();

    file_put_contents($logFile, "Transaction committed successfully.\n\n", FILE_APPEND);

    echo json_encode([
        'status' => 'success',
        'message' => 'Successfully pinged pending users.'
    ]);

} catch (Throwable $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    $logDir = __DIR__ . '/../../logs';
    $logFile = $logDir . '/ping.log';
    file_put_contents($logFile, "Error: " . $e->getMessage() . "\n\n", FILE_APPEND);
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
