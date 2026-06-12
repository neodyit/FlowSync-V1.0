<?php

require_once __DIR__ . '/bootstrap.php';

use FlowSync\Utils\PaymentService;

$paymentService = new PaymentService();
$method = $_SERVER['REQUEST_METHOD'];

// Extract order_id securely from POST or GET
$orderId = $_POST['orderId'] ?? ($_POST['order_id'] ?? ($_GET['order_id'] ?? ($_GET['orderId'] ?? null)));
$redirectTo = $_GET['redirect_to'] ?? ($_POST['redirect_to'] ?? null);

// Debug logging for redirection request
$logPath = __DIR__ . '/../storage/payment_debug.log';
$incomingLog = [
    'timestamp' => date('Y-m-d H:i:s'),
    'type' => 'REDIRECT_INCOMING',
    'method' => $method,
    'GET' => $_GET,
    'POST' => $_POST,
    'orderId_extracted' => $orderId,
    'redirectTo_extracted' => $redirectTo
];
file_put_contents($logPath, json_encode($incomingLog, JSON_PRETTY_PRINT) . "\n", FILE_APPEND);

// Verify session
if (empty($session) || empty($session['user_id'])) {
    http_response_code(401);
    exit("Unauthorized. Please login first.");
}

$db = FlowSync\Config\Database::getInstance()->getConnection();
$stmtUser = $db->prepare("SELECT college_id FROM users WHERE id = :id LIMIT 1");
$stmtUser->execute(['id' => $session['user_id']]);
$user = $stmtUser->fetch(PDO::FETCH_ASSOC);

if (!$user || !$user['college_id']) {
    http_response_code(401);
    exit("Unauthorized. College details not found.");
}

// If Cashfree appended ?order_id=... to a URL containing query parameters,
// it might have become swallowed inside the redirect_to parameter value.
if (!$orderId && !empty($redirectTo)) {
    $parsedUrl = parse_url($redirectTo);
    if (!empty($parsedUrl['query'])) {
        parse_str($parsedUrl['query'], $subParams);
        $orderId = $subParams['order_id'] ?? ($subParams['orderId'] ?? null);
        
        // Clean up the swallowed parameter from redirect_to so it doesn't cause query pollution
        unset($subParams['order_id'], $subParams['orderId']);
        $newQuery = http_build_query($subParams);
        
        $scheme = isset($parsedUrl['scheme']) ? $parsedUrl['scheme'] . '://' : '';
        $host = $parsedUrl['host'] ?? '';
        $port = isset($parsedUrl['port']) ? ':' . $parsedUrl['port'] : '';
        $path = $parsedUrl['path'] ?? '';
        
        $redirectTo = $scheme . $host . $port . $path;
        if ($newQuery) {
            $redirectTo .= '?' . $newQuery;
        }
    }
}

// Verify transaction ownership if orderId is set
if ($orderId) {
    $stmtTx = $db->prepare("SELECT institution_id FROM subscription_transactions WHERE transaction_id = :tx_id LIMIT 1");
    $stmtTx->execute(['tx_id' => $orderId]);
    $tx = $stmtTx->fetch(PDO::FETCH_ASSOC);
    
    if (!$tx || (int)$tx['institution_id'] !== (int)$user['college_id']) {
        http_response_code(403);
        exit("Forbidden. You do not own this transaction.");
    }
}

// Validate redirect_to against ALLOWED_ORIGINS to prevent Open Redirect vulnerability
$allowedOriginsStr = getenv('ALLOWED_ORIGINS') ?: 'http://localhost:5173';
$allowedOrigins = array_map('trim', explode(',', $allowedOriginsStr));
$isRedirectValid = false;

if (!empty($redirectTo)) {
    $parsedRedirect = parse_url($redirectTo);
    if (isset($parsedRedirect['host'])) {
        $redirectOrigin = ($parsedRedirect['scheme'] ?? 'http') . '://' . $parsedRedirect['host'] . (isset($parsedRedirect['port']) ? ':' . $parsedRedirect['port'] : '');
        foreach ($allowedOrigins as $origin) {
            $parsedOrigin = parse_url($origin);
            $originStr = ($parsedOrigin['scheme'] ?? 'http') . '://' . $parsedOrigin['host'] . (isset($parsedOrigin['port']) ? ':' . $parsedOrigin['port'] : '');
            if (strcasecmp($redirectOrigin, $originStr) === 0) {
                $isRedirectValid = true;
                break;
            }
        }
    } else {
        // Relative paths are always safe
        $isRedirectValid = true;
    }
}

if (!$isRedirectValid) {
    // Default to the first allowed origin
    $firstOrigin = reset($allowedOrigins);
    $redirectTo = rtrim($firstOrigin, '/') . '/ia/billing';
}

$isSuccess = false;
$maxRetries = 3;
$retryDelayMicroseconds = 800000; // 800ms

for ($i = 0; $i < $maxRetries; $i++) {
    try {
        if ($orderId) {
            $isSuccess = $paymentService->verifyCashfreePayment($orderId);
            if ($isSuccess) {
                break;
            }
        }
    } catch (Exception $e) {
        $logPath = __DIR__ . '/../storage/payment_debug.log';
        file_put_contents($logPath, "VERIFY ATTEMPT " . ($i + 1) . " EXCEPTION: " . $e->getMessage() . "\n", FILE_APPEND);
    }
    
    // Only sleep if we're going to try again
    if (!$isSuccess && $i < ($maxRetries - 1)) {
        usleep($retryDelayMicroseconds);
    }
}

// Redirect back to frontend
$redirectUrl = $redirectTo ?: 'http://localhost:5173/ia/billing';
$separator = (strpos($redirectUrl, '?') === false) ? '?' : '&';
$finalUrl = $redirectUrl . $separator . 'payment_status=' . ($isSuccess ? 'success' : 'failed') . '&order_id=' . urlencode($orderId ?? '');

header("Location: " . $finalUrl);
exit;
