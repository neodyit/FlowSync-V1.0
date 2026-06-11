<?php

// Check if running from CLI or Admin session
$isCli = (php_sapi_name() === 'cli');

if ($isCli) {
    // Bootstrap without checking session for automated CLI cron execution
    require_once __DIR__ . '/../../src/Config/Database.php';
    require_once __DIR__ . '/../../src/Auth/JWT.php';
    require_once __DIR__ . '/../../src/Auth/AuthService.php';
    require_once __DIR__ . '/../../src/Utils/AdminMiddleware.php';
    
    spl_autoload_register(function ($class) {
        $prefix = 'FlowSync\\';
        $base_dir = __DIR__ . '/../../src/';
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
    loadEnv(__DIR__ . '/../../.env');
} else {
    require_once __DIR__ . '/../bootstrap.php';
    \FlowSync\Utils\AdminMiddleware::check();
}

use FlowSync\Utils\SubscriptionService;

try {
    $subscriptionService = new SubscriptionService();
    $sentCount = $subscriptionService->sendExpiryReminders();
    
    $msg = "Subscription reminders daemon ran successfully. Notifications sent: " . $sentCount;
    if ($isCli) {
        echo $msg . "\n";
    } else {
        echo json_encode(['status' => 'success', 'message' => $msg]);
    }
} catch (Exception $e) {
    if ($isCli) {
        echo "Error: " . $e->getMessage() . "\n";
    } else {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
}
