<?php

require_once __DIR__ . '/../src/Config/Database.php';
require_once __DIR__ . '/../src/Auth/JWT.php';
require_once __DIR__ . '/../src/Auth/AuthService.php';

spl_autoload_register(function ($class) {
    $prefix = 'FlowSync\\';
    $base_dir = __DIR__ . '/../src/';
    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) return;
    $relative_class = substr($class, $len);
    $file = $base_dir . str_replace('\\', '/', $relative_class) . '.php';
    if (file_exists($file)) require $file;
});

function loadEnv($path) {
    if (!file_exists($path)) return;
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        list($name, $value) = explode('=', $line, 2);
        putenv(trim($name) . '=' . trim($value));
    }
}

loadEnv(__DIR__ . '/../.env');

\FlowSync\Config\Database::handleCORS();

header('Content-Type: application/json');

$auth = new \FlowSync\Auth\AuthService();
$session = $auth->validateSession();

if ($session) {
    // Update user's last active timestamp (except for Super Admin user_id = 1)
    // Fetch user profile info
    $db = \FlowSync\Config\Database::getInstance()->getConnection();
    $stmtUser = $db->prepare("SELECT name, profile_pic, last_active_at FROM users WHERE id = :uid LIMIT 1");
    $stmtUser->execute(['uid' => $session['user_id']]);
    $uRow = $stmtUser->fetch();

    // Update user's last active timestamp (except for Super Admin user_id = 1) if it's older than 5 minutes (300s)
    if ((int)$session['user_id'] !== 1) {
        $lastActive = $uRow['last_active_at'] ?? null;
        if (!$lastActive || (time() - strtotime($lastActive)) > 300) {
            $stmtActive = $db->prepare("UPDATE users SET last_active_at = NOW() WHERE id = :uid");
            $stmtActive->execute(['uid' => $session['user_id']]);
        }
    }

    require_once __DIR__ . '/../src/Utils/SystemSettings.php';
    $isMaintenance = \FlowSync\Utils\SystemSettings::get('maintenance_mode') === 'true';
    
    if ($isMaintenance && in_array((int)$session['role_id'], [2, 3])) {
        echo json_encode(['status' => 'maintenance', 'session' => $session]);
        exit;
    }

    // Query enabled features for the user's college
    // Fetch user details including college_id
    $stmt = $db->prepare("SELECT college_id FROM users WHERE id = :uid LIMIT 1");
    $stmt->execute(['uid' => $session['user_id']]);
    $userRow = $stmt->fetch();
    
    $features = [];
    $collegeEnabled = 1;
    if ($userRow) {
        // Fetch college enabled and auto_accept_tasks
        $stmtCol = $db->prepare("SELECT is_enabled, auto_accept_tasks, allow_task_decline FROM colleges WHERE id = :cid LIMIT 1");
        $stmtCol->execute(['cid' => $userRow['college_id']]);
        $col = $stmtCol->fetch();
        if ($col) {
            $collegeEnabled = (int)$col['is_enabled'];
            $features['task_auto_accept'] = ($col['auto_accept_tasks'] == 1);
            $features['allow_task_decline'] = ($col['allow_task_decline'] == 1);
        }

        // Fetch features
        $stmtF = $db->prepare("SELECT feature_key, is_enabled FROM college_features WHERE college_id = :cid");
        $stmtF->execute(['cid' => $userRow['college_id']]);
        $rows = $stmtF->fetchAll();
        foreach ($rows as $r) {
            $features[$r['feature_key']] = ($r['is_enabled'] == 1);
        }
    }

    if ($collegeEnabled == 0 && (int)$session['role_id'] !== 1) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Your institution has been deactivated.']);
        exit;
    }

    $userObj = [
        'id' => (int)$session['user_id'],
        'name' => $uRow['name'] ?? '',
        'email' => $session['email'] ?? '',
        'role' => $session['role'] ?? '',
        'role_id' => (int)$session['role_id'],
        'college_id' => (int)$session['college_id'],
        'profile_pic' => $uRow['profile_pic'] ?? null,
        'features' => $features
    ];

    echo json_encode([
        'status' => 'success', 
        'session' => $session,
        'features' => $features,
        'user' => $userObj
    ]);
} else {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
}
