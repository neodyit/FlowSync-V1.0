<?php
require_once __DIR__ . '/../bootstrap.php';
use FlowSync\Utils\HODMiddleware;
use FlowSync\Config\Database;

$session = HODMiddleware::check();
$db = Database::getInstance()->getConnection();

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        throw new Exception("Method not allowed");
    }

    $stmt = $db->prepare("SELECT id FROM departments WHERE hod_id = :hod_id LIMIT 1");
    $stmt->execute(['hod_id' => $session['user_id']]);
    $dept = $stmt->fetch();
    if (!$dept) {
        http_response_code(403);
        throw new Exception("Unauthorized. No department assigned.");
    }

    // Get all push notices for this HOD
    $stmt = $db->prepare("
        SELECT * FROM push_notices 
        WHERE hod_id = :hod_id 
        ORDER BY created_at DESC
    ");
    $stmt->execute(['hod_id' => $session['user_id']]);
    $pushNotices = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get stats for each push notice
    foreach ($pushNotices as &$notice) {
        $statsStmt = $db->prepare("
            SELECT u.id, u.name, n.is_read 
            FROM notifications n
            JOIN users u ON n.user_id = u.id
            WHERE n.push_notice_id = :push_notice_id
        ");
        $statsStmt->execute(['push_notice_id' => $notice['id']]);
        $recipients = $statsStmt->fetchAll(PDO::FETCH_ASSOC);
        
        $readCount = 0;
        $totalCount = count($recipients);
        foreach ($recipients as $recipient) {
            if ($recipient['is_read']) {
                $readCount++;
            }
        }

        $notice['recipients'] = $recipients;
        $notice['read_count'] = $readCount;
        $notice['total_count'] = $totalCount;
    }

    echo json_encode([
        'status' => 'success',
        'data' => $pushNotices
    ]);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
