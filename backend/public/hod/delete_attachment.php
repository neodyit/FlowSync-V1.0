<?php

require_once __DIR__ . '/../bootstrap.php';

use FlowSync\Utils\HODMiddleware;
use FlowSync\Config\Database;
use FlowSync\Utils\AuditLogger;

$session = HODMiddleware::check();
$db = Database::getInstance()->getConnection();
$logger = new AuditLogger();

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
        throw new Exception("Method not allowed.");
    }

    $id = $_GET['id'] ?? null;
    if (!$id) {
        throw new Exception("Attachment ID is required.");
    }

    // 1. Get attachment info and verify ownership (via entity_id task)
    $stmt = $db->prepare("
        SELECT a.*, t.department_id 
        FROM attachments a
        JOIN tasks t ON a.entity_id = t.id AND a.entity_type = 'Task'
        WHERE a.id = :id
    ");
    $stmt->execute(['id' => $id]);
    $attachment = $stmt->fetch();

    if (!$attachment) {
        throw new Exception("Attachment not found.");
    }

    // 2. Verify HOD belongs to the same department
    $deptStmt = $db->prepare("SELECT id FROM departments WHERE hod_id = :hod_id AND id = :dept_id");
    $deptStmt->execute(['hod_id' => $session['user_id'], 'dept_id' => $attachment['department_id']]);
    if (!$deptStmt->fetch()) {
        throw new Exception("Access denied.");
    }

    // 3. Delete physical file
    $filePath = __DIR__ . '/../' . $attachment['file_path'];
    if (file_exists($filePath)) {
        unlink($filePath);
    }

    // 4. Delete from database
    $delStmt = $db->prepare("DELETE FROM attachments WHERE id = :id");
    $delStmt->execute(['id' => $id]);

    $logger->log($session['user_id'], 'HOD_DELETE_ATTACHMENT', 'ATTACHMENT', $id, ['file_name' => $attachment['file_name']]);

    echo json_encode(['status' => 'success', 'message' => 'Attachment deleted successfully']);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
