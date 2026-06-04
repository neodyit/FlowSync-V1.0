<?php
date_default_timezone_set('Asia/Kolkata');

require_once __DIR__ . '/../src/Config/Database.php';
require_once __DIR__ . '/../src/Auth/JWT.php';
require_once __DIR__ . '/../src/Auth/AuthService.php';
require_once __DIR__ . '/../src/Utils/AdminMiddleware.php';

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

// Session validation for global access
try {
    $auth = new \FlowSync\Auth\AuthService();
    $session = $auth->validateSession();
} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Server initialization error.']);
    exit;
}

// Ensure uploads directory exists
$uploadDir = __DIR__ . '/uploads';
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

// Global Academic Season Context
$currentSeasonId = null;
if ($session) {
    $currentSeasonId = \FlowSync\Utils\AcademicSeasonManager::getCurrentSeasonId($session['user_id']);
}
