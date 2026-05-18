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
    echo json_encode(['status' => 'success', 'session' => $session]);
} else {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
}
