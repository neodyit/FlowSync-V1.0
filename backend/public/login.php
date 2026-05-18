<?php

require_once __DIR__ . '/../src/Config/Database.php';
require_once __DIR__ . '/../src/Auth/JWT.php';
require_once __DIR__ . '/../src/Auth/AuthService.php';

// Simple manual autoloader for now
spl_autoload_register(function ($class) {
    $prefix = 'FlowSync\\';
    $base_dir = __DIR__ . '/../src/';
    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) return;
    $relative_class = substr($class, $len);
    $file = $base_dir . str_replace('\\', '/', $relative_class) . '.php';
    if (file_exists($file)) require $file;
});

// Load .env manually if needed or just use getenv from system
// For now, I'll define a simple loader
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

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $email = $data['email'] ?? '';
        $password = $data['password'] ?? '';

        $auth = new \FlowSync\Auth\AuthService();
        $result = $auth->login($email, $password);

        if ($result['status'] === 'success') {
            echo json_encode($result);
        } else {
            http_response_code(401);
            echo json_encode($result);
        }
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
}
