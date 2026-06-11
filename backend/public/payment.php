<?php

require_once __DIR__ . '/bootstrap.php';

use FlowSync\Utils\PaymentService;
use FlowSync\Config\Database;

$db = Database::getInstance()->getConnection();
$paymentService = new PaymentService();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? null;

try {
    if ($method !== 'POST' && $action !== 'verify_redirect') {
        http_response_code(405);
        throw new Exception("Method not allowed. Use POST.");
    }

    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true) ?: [];

    // Extract order ID robustly
    $orderId = $data['order_id'] ?? ($data['orderId'] ?? ($_POST['order_id'] ?? ($_POST['orderId'] ?? ($_GET['order_id'] ?? null))));

    switch ($action) {
        case 'create':
            // Creation requires active user session
            if (empty($session) || empty($session['user_id'])) {
                http_response_code(401);
                throw new Exception("Unauthorized. Please login.");
            }

            $planId = $data['plan_id'] ?? null;
            $couponCode = $data['coupon_code'] ?? null;
            $returnUrl = $data['return_url'] ?? null;

            if (!$planId || !$returnUrl) {
                throw new Exception("plan_id and return_url are required.");
            }

            // Fetch user info for Cashfree checkout customer parameters
            $stmtUser = $db->prepare("SELECT email, phone, college_id FROM users WHERE id = :id LIMIT 1");
            $stmtUser->execute(['id' => $session['user_id']]);
            $user = $stmtUser->fetch(PDO::FETCH_ASSOC);

            if (!$user || !$user['college_id']) {
                throw new Exception("User institution details not found.");
            }

            $orderPayload = $paymentService->createCashfreeOrder(
                $user['college_id'],
                $planId,
                $user['email'],
                $user['phone'] ?? '9999999999',
                $returnUrl,
                $couponCode
            );

            echo json_encode([
                'status' => 'success',
                'data' => $orderPayload
            ]);
            break;

        case 'verify':
            if (!$orderId) {
                throw new Exception("order_id is required.");
            }

            $isSuccess = $paymentService->verifyCashfreePayment($orderId);

            if ($isSuccess) {
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Payment completed and subscription activated successfully.'
                ]);
            } else {
                echo json_encode([
                    'status' => 'failed',
                    'message' => 'Payment has failed or is still pending verification.'
                ]);
            }
            break;

        case 'verify_redirect':
            $isSuccess = false;
            try {
                if ($orderId) {
                    $isSuccess = $paymentService->verifyCashfreePayment($orderId);
                }
            } catch (Exception $e) {
                // Keep isSuccess as false if it threw an error
            }

            $redirectTo = $_GET['redirect_to'] ?? ($_POST['redirect_to'] ?? null);
            $redirectUrl = $redirectTo ?: 'http://localhost:5173/ia/billing';
            $separator = (strpos($redirectUrl, '?') === false) ? '?' : '&';
            $finalUrl = $redirectUrl . $separator . 'payment_status=' . ($isSuccess ? 'success' : 'failed') . '&order_id=' . urlencode($orderId ?? '');

            header("Location: " . $finalUrl);
            exit;

        default:
            http_response_code(400);
            throw new Exception("Invalid action. Use create or verify.");
    }
} catch (Exception $e) {
    $code = $e->getCode();
    if ($code >= 400 && $code < 600) {
        http_response_code($code);
    } else {
        http_response_code(500);
    }
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
