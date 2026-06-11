<?php

require_once __DIR__ . '/../bootstrap.php';

use FlowSync\Utils\InstitutionAdminMiddleware;
use FlowSync\Config\Database;

// Verify user is Institution Admin
$session = InstitutionAdminMiddleware::check();
$collegeId = (int)$session['college_id'];

require_once __DIR__ . '/../../src/Utils/FeatureService.php';
if (!\FlowSync\Utils\FeatureService::isEnabled($collegeId, 'ia_audit_log_visibility')) {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Activity Center is disabled.']);
    exit;
}

$db = Database::getInstance()->getConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method !== 'GET') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
        exit;
    }

    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 250;

    // Fetch Audit Logs scoped to this college with operator info and resolved department
    $stmt = $db->prepare("
        SELECT 
            a.*, 
            u.name as user_name, 
            u.email as user_email,
            COALESCE(d1.name, d2.name) as department_name,
            COALESCE(d1.id, d2.id) as department_id
        FROM audit_logs a
        JOIN users u ON a.user_id = u.id
        LEFT JOIN faculty_departments fd ON u.id = fd.user_id
        LEFT JOIN departments d1 ON fd.department_id = d1.id
        LEFT JOIN departments d2 ON u.id = d2.hod_id
        WHERE u.college_id = :cid
        ORDER BY a.created_at DESC
        LIMIT :limit
    ");
    $stmt->bindValue(':cid', $collegeId, PDO::PARAM_INT);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    $logs = $stmt->fetchAll();

    // Stats calculations for this college
    // Total Logs
    $stmtTotal = $db->prepare("
        SELECT COUNT(*) 
        FROM audit_logs a 
        JOIN users u ON a.user_id = u.id 
        WHERE u.college_id = :cid
    ");
    $stmtTotal->execute(['cid' => $collegeId]);
    $totalCount = (int)$stmtTotal->fetchColumn();

    // Deletes/Purges
    $stmtDeletes = $db->prepare("
        SELECT COUNT(*) 
        FROM audit_logs a 
        JOIN users u ON a.user_id = u.id 
        WHERE u.college_id = :cid AND a.action LIKE '%DELETE%'
    ");
    $stmtDeletes->execute(['cid' => $collegeId]);
    $deleteCount = (int)$stmtDeletes->fetchColumn();

    // Logins
    $stmtLogins = $db->prepare("
        SELECT COUNT(*) 
        FROM audit_logs a 
        JOIN users u ON a.user_id = u.id 
        WHERE u.college_id = :cid AND (a.action = 'LOGIN' OR a.action = 'IA_LOGIN')
    ");
    $stmtLogins->execute(['cid' => $collegeId]);
    $loginCount = (int)$stmtLogins->fetchColumn();

    // Updates
    $stmtUpdates = $db->prepare("
        SELECT COUNT(*) 
        FROM audit_logs a 
        JOIN users u ON a.user_id = u.id 
        WHERE u.college_id = :cid AND a.action LIKE '%UPDATE%'
    ");
    $stmtUpdates->execute(['cid' => $collegeId]);
    $updateCount = (int)$stmtUpdates->fetchColumn();

    // Fetch all departments in this college for filters
    $stmtDepts = $db->prepare("
        SELECT id, name, code 
        FROM departments 
        WHERE college_id = :cid 
        ORDER BY name ASC
    ");
    $stmtDepts->execute(['cid' => $collegeId]);
    $departments = $stmtDepts->fetchAll();

    // Fetch all users in this college for filters
    $stmtUsers = $db->prepare("
        SELECT id, name, email, role_id 
        FROM users 
        WHERE college_id = :cid AND is_active = 1 
        ORDER BY name ASC
    ");
    $stmtUsers->execute(['cid' => $collegeId]);
    $users = $stmtUsers->fetchAll();

    echo json_encode([
        'status' => 'success',
        'data' => [
            'logs' => $logs,
            'departments' => $departments,
            'users' => $users,
            'stats' => [
                'total' => $totalCount,
                'deletes' => $deleteCount,
                'logins' => $loginCount,
                'updates' => $updateCount
            ]
        ]
    ]);

} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
