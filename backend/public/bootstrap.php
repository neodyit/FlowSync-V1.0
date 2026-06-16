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
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
header("Expires: Mon, 26 Jul 1997 05:00:00 GMT");

try {
    $auth = new \FlowSync\Auth\AuthService();
    $session = $auth->validateSession();
    
    // Update user's last active timestamp (except for Super Admin user_id = 1) if it's older than 3 minutes (180s)
    if ($session && (int)$session['user_id'] !== 1) {
        $db = \FlowSync\Config\Database::getInstance()->getConnection();
        $stmtUser = $db->prepare("SELECT last_active_at FROM users WHERE id = :uid LIMIT 1");
        $stmtUser->execute(['uid' => $session['user_id']]);
        $lastActive = $stmtUser->fetchColumn();
        
        if (!$lastActive || (time() - strtotime($lastActive)) > 180) {
            $stmtActive = $db->prepare("UPDATE users SET last_active_at = NOW() WHERE id = :uid");
            $stmtActive->execute(['uid' => $session['user_id']]);
        }
    }
} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Server initialization error.']);
    exit;
}

// Global Subscription and Grace Period Enforcement
if ($session && (int)$session['role_id'] !== 1) {
    $collegeId = $session['college_id'] ?? null;
    if ($collegeId) {
        $subService = new \FlowSync\Utils\SubscriptionService();
        $subStatus = $subService->getSubscriptionStatus($collegeId);
        
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $isMutating = in_array($method, ['POST', 'PUT', 'DELETE', 'PATCH']);
        
        if ($isMutating) {
            $scriptName = basename($_SERVER['SCRIPT_NAME'] ?? '');
            
            // Exempt payment.php from blocking so that payment verification can proceed and unlock the account
            if ($scriptName !== 'payment.php') {
                $status = $subStatus['status'];
                $remainingDays = $subStatus['remaining_days'];
                
                // 1. Suspension or Expiration -> Read-Only Mode
                if ($status === 'suspended' || $status === 'expired' || $remainingDays < 0) {
                    http_response_code(403);
                    echo json_encode([
                        'status' => 'error',
                        'message' => 'Subscription Blocked: Your institution has entered Read-Only Mode. Please contact your administrator or renew your subscription.'
                    ]);
                    exit;
                }
            }
        }
    }
}

// Ensure storage directories exist outside public folder
$storageRoot = __DIR__ . '/../storage';
$storageDirs = [
    $storageRoot,
    $storageRoot . '/profiles',
    $storageRoot . '/push_notices',
    $storageRoot . '/tasks_data'
];
foreach ($storageDirs as $dir) {
    if (!file_exists($dir)) {
        mkdir($dir, 0777, true);
    }
}

// Global Academic Season Context
$currentSeasonId = null;
if ($session) {
    $currentSeasonId = \FlowSync\Utils\AcademicSeasonManager::getCurrentSeasonId($session['user_id']);
}

// Register a global fallback logger for mutating requests (POST, PUT, DELETE, PATCH)
register_shutdown_function(function() use (&$session) {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (in_array($method, ['POST', 'PUT', 'DELETE', 'PATCH'])) {
        // If not already logged explicitly
        if (empty($GLOBALS['audit_log_explicit_logged'])) {
            $userId = $session['user_id'] ?? null;
            
            // Extract resource name from URI
            $path = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
            $basename = basename($path, '.php');
            if ($basename === 'track_engagement' || ($basename === 'notifications' && $method === 'PUT')) {
                return;
            }
            $resource = strtoupper($basename ?: 'API');
            $action = 'API_' . $method;

            // Capture request details
            $details = [];
            $details['response_code'] = http_response_code();
            
            // Handle JSON body
            $input = file_get_contents('php://input');
            if ($input) {
                $json = json_decode($input, true);
                if (is_array($json)) {
                    foreach (['password', 'old_password', 'new_password', 'token', 'jwt'] as $sensitive) {
                        if (isset($json[$sensitive])) {
                            $json[$sensitive] = '[REDACTED]';
                        }
                    }
                    $details['payload'] = $json;
                } else {
                    $details['raw_input'] = substr($input, 0, 500);
                }
            }

            // Capture POST fields
            if (!empty($_POST)) {
                $postData = $_POST;
                foreach (['password', 'old_password', 'new_password', 'token', 'jwt'] as $sensitive) {
                    if (isset($postData[$sensitive])) {
                        $postData[$sensitive] = '[REDACTED]';
                    }
                }
                $details['post'] = $postData;
            }

            // Capture GET fields
            if (!empty($_GET)) {
                $details['query'] = $_GET;
            }

            try {
                $logger = new \FlowSync\Utils\AuditLogger();
                $logger->log($userId, $action, $resource, null, $details);
            } catch (\Throwable $e) {
                error_log("Global audit logging failed: " . $e->getMessage());
            }
        }
    }
});
