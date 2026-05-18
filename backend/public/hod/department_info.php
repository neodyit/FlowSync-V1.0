<?php

require_once __DIR__ . '/../bootstrap.php';

use FlowSync\Utils\HODMiddleware;
use FlowSync\Config\Database;

$session = HODMiddleware::check();
$db = Database::getInstance()->getConnection();

try {
    $stmt = $db->prepare("
        SELECT d.id, d.name, c.name as college_name, d.college_id
        FROM departments d
        JOIN colleges c ON d.college_id = c.id
        WHERE d.hod_id = :hod_id
        LIMIT 1
    ");
    $stmt->execute(['hod_id' => $session['user_id']]);
    $dept = $stmt->fetch();

    if (!$dept) {
        throw new Exception("You are not currently assigned as an HOD to any department.");
    }

    echo json_encode(['status' => 'success', 'data' => $dept]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
