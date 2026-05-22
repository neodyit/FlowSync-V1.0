<?php

require_once __DIR__ . '/../bootstrap.php';

use FlowSync\Utils\HODMiddleware;
use FlowSync\Config\Database;
use FlowSync\Utils\AuditLogger;

$session = HODMiddleware::check();
$db = Database::getInstance()->getConnection();
$logger = new AuditLogger();

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
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
    $departmentId = $dept['id'];

    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    $title = $data['title'] ?? '';
    $message = $data['message'] ?? '';
    $points = (int)($data['points'] ?? 0);
    $targetType = $data['targetType'] ?? 'ALL';
    $selectedFaculties = $data['selectedFaculties'] ?? [];

    if (empty($title) || empty($message)) {
        throw new Exception("Title and details are required.");
    }

    if ($points < 1 || $points > 5) {
        throw new Exception("Points must be between 1 and 5.");
    }

    $targetFacultyIds = [];

    if ($targetType === 'ALL') {
        // Fetch all faculties in this HOD's department
        // A user is a faculty if they have role_id = 3 and are in the HOD's department
        $stmt = $db->prepare("
            SELECT u.id 
            FROM users u
            JOIN faculty_departments fd ON u.id = fd.user_id
            WHERE u.role_id = 3 AND fd.department_id = :dept_id
        ");
        $stmt->execute(['dept_id' => $departmentId]);
        $targetFacultyIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
    } else {
        // Validate that provided IDs belong to the HOD's department
        if (empty($selectedFaculties)) {
            throw new Exception("Please select at least one faculty member.");
        }
        $inQuery = implode(',', array_fill(0, count($selectedFaculties), '?'));
        $stmt = $db->prepare("
            SELECT u.id 
            FROM users u
            JOIN faculty_departments fd ON u.id = fd.user_id
            WHERE u.role_id = 3 AND fd.department_id = ? AND u.id IN ($inQuery)
        ");
        $params = array_merge([$departmentId], $selectedFaculties);
        $stmt->execute($params);
        $targetFacultyIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
    }

    if (empty($targetFacultyIds)) {
        throw new Exception("No eligible faculties found to receive the notification.");
    }

    $db->beginTransaction();

    $insertStmt = $db->prepare("
        INSERT INTO notifications (user_id, type, title, message, points, trigger_user_id, is_read, is_actioned)
        VALUES (:user_id, 'HOD_PUSH', :title, :message, :points, :trigger_user_id, 0, 0)
    ");

    foreach ($targetFacultyIds as $facultyId) {
        $insertStmt->execute([
            'user_id' => $facultyId,
            'title' => $title,
            'message' => $message,
            'points' => $points,
            'trigger_user_id' => $session['user_id']
        ]);
    }

    $db->commit();

    $logger->log($session['user_id'], 'HOD_PUSH_NOTIFICATION', 'SYSTEM', null, [
        'title' => $title,
        'points' => $points,
        'recipients_count' => count($targetFacultyIds)
    ]);

    echo json_encode([
        'status' => 'success',
        'message' => 'Push notification sent to ' . count($targetFacultyIds) . ' faculties.'
    ]);

} catch (Throwable $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
