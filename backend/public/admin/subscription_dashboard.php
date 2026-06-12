<?php

require_once __DIR__ . '/../bootstrap.php';

use FlowSync\Utils\AdminMiddleware;
use FlowSync\Utils\SubscriptionService;

AdminMiddleware::check();

$subscriptionService = new SubscriptionService();
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method !== 'GET') {
        http_response_code(405);
        throw new Exception("Method not allowed");
    }

    $dashboardData = $subscriptionService->getDashboardMetrics();
    echo json_encode(['status' => 'success', 'data' => $dashboardData]);

} catch (Exception $e) {
    $code = $e->getCode();
    if ($code >= 400 && $code < 600) {
        http_response_code($code);
    } else {
        http_response_code(500);
    }
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
