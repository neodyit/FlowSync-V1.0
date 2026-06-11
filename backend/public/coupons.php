<?php

require_once __DIR__ . '/bootstrap.php';

use FlowSync\Utils\PaymentService;
use FlowSync\Utils\SubscriptionService;

if (!$session) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit;
}

$paymentService = new PaymentService();
$subscriptionService = new SubscriptionService();
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method !== 'GET') {
        http_response_code(405);
        throw new Exception("Method not allowed. Use GET.");
    }

    $planId = $_GET['plan_id'] ?? null;
    $code = $_GET['code'] ?? null;

    if (!$planId) {
        throw new Exception("plan_id parameter is required.");
    }

    $plan = $subscriptionService->getPlanById($planId);
    if (!$plan) {
        throw new Exception("Invalid plan specified.");
    }

    $coupon = null;
    if (!empty($code)) {
        $coupon = $paymentService->validateCoupon($code);
        if (!$coupon) {
            throw new Exception("Invalid, expired, or inactive coupon code.");
        }
    }

    $amounts = $paymentService->calculateAmounts($plan['price'], $code, $planId);

    echo json_encode([
        'status' => 'success',
        'coupon' => $coupon ? [
            'code' => $coupon['code'],
            'discount_type' => $coupon['discount_type'],
            'discount_value' => (float)$coupon['discount_value']
        ] : null,
        'amounts' => $amounts
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
