<?php

require_once __DIR__ . '/bootstrap.php';

use FlowSync\Utils\PaymentService;
use FlowSync\Config\Database;

if (!$session) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized. Please login.']);
    exit;
}

$db = Database::getInstance()->getConnection();
$paymentService = new PaymentService();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? null;

try {
    if ($method !== 'POST') {
        http_response_code(405);
        throw new Exception("Method not allowed. Use POST.");
    }

    $data = json_decode(file_get_contents('php://input'), true);

    switch ($action) {
        case 'create':
            $planId = $data['plan_id'] ?? null;
            $returnUrl = $data['return_url'] ?? null;

            if (!$planId || !$returnUrl) {
                throw new Exception("plan_id and return_url are required.");
            }

            // Fetch current user details for the Cashfree customer payload
            $stmtUser = $db->prepare("SELECT email, phone, college_id FROM users WHERE id = :id LIMIT 1");
            $stmtUser->execute(['id' => $session['user_id']]);
            $user = $stmtUser->fetch();

            if (!$user || !$user['college_id']) {
                throw new Exception("User institution details not found.");
            }

            $orderPayload = $paymentService->createCashfreeOrder(
                $user['college_id'],
                $planId,
                $user['email'],
                $user['phone'] ?? '9999999999',
                $returnUrl
            );

            echo json_encode([
                'status' => 'success',
                'data' => $orderPayload
            ]);
            break;

        case 'verify':
            $orderId = $data['order_id'] ?? null;
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
                    'message' => 'Payment has failed or is still pending.'
                ]);
            }
            break;

        default:
            http_response_code(400);
            throw new Exception("Invalid or missing action. Use create or verify.");
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
