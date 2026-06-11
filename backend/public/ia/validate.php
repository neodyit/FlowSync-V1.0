<?php

require_once __DIR__ . '/../bootstrap.php';

use FlowSync\Utils\InstitutionAdminMiddleware;
use FlowSync\Config\Database;

// This will block access and exit if not an Institution Admin
$session = InstitutionAdminMiddleware::check();

$db = Database::getInstance()->getConnection();

try {
    // Fetch features and college info
    $collegeId = (int)$session['college_id'];
    $stmtCol = $db->prepare("SELECT is_enabled, auto_accept_tasks, allow_task_decline FROM colleges WHERE id = :cid LIMIT 1");
    $stmtCol->execute(['cid' => $collegeId]);
    $col = $stmtCol->fetch();

    $features = [];
    $collegeEnabled = 1;
    if ($col) {
        $collegeEnabled = (int)$col['is_enabled'];
        $features['task_auto_accept'] = ($col['auto_accept_tasks'] == 1);
        $features['allow_task_decline'] = ($col['allow_task_decline'] == 1);
    }

    if ($collegeEnabled == 0) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Your institution has been deactivated.']);
        exit;
    }

    $stmtF = $db->prepare("SELECT feature_key, is_enabled FROM college_features WHERE college_id = :cid");
    $stmtF->execute(['cid' => $collegeId]);
    $rows = $stmtF->fetchAll();
    foreach ($rows as $r) {
        $features[$r['feature_key']] = ($r['is_enabled'] == 1);
    }

    echo json_encode([
        'status' => 'success',
        'session' => $session,
        'features' => $features
    ]);
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
}
