<?php

require_once __DIR__ . '/bootstrap.php';

use FlowSync\Utils\PaymentService;
use FlowSync\Config\Database;

$db = Database::getInstance()->getConnection();
$paymentService = new PaymentService();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? null;

try {
    if ($method !== 'POST') {
        http_response_code(405);
        throw new Exception("Method not allowed. Use POST.");
    }

    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true) ?: [];
    $orderId = $data['order_id'] ?? ($data['orderId'] ?? null);

    switch ($action) {
        case 'create':
            if (empty($session) || empty($session['user_id'])) {
                http_response_code(401);
                throw new Exception("Unauthorized. Please login.");
            }

            $planId = $data['plan_id'] ?? null;
            $returnUrl = $data['return_url'] ?? null;

            if (!$planId || !$returnUrl) {
                throw new Exception("plan_id and return_url are required.");
            }

            $stmtUser = $db->prepare("SELECT email, phone, college_id FROM users WHERE id = :id LIMIT 1");
            $stmtUser->execute(['id' => $session['user_id']]);
            $user = $stmtUser->fetch(PDO::FETCH_ASSOC);

            if (!$user || !$user['college_id']) {
                throw new Exception("User details not found.");
            }

            // Create order securely using server-calculated values
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
            if (empty($session) || empty($session['user_id'])) {
                http_response_code(401);
                throw new Exception("Unauthorized. Please login first.");
            }
            if (!$orderId) {
                throw new Exception("order_id is required.");
            }

            // Verify logged-in user details
            $stmtUser = $db->prepare("SELECT college_id FROM users WHERE id = :id LIMIT 1");
            $stmtUser->execute(['id' => $session['user_id']]);
            $user = $stmtUser->fetch(PDO::FETCH_ASSOC);

            if (!$user || !$user['college_id']) {
                http_response_code(401);
                throw new Exception("Unauthorized. College details not found.");
            }

            // Verify transaction ownership
            $stmtTx = $db->prepare("SELECT institution_id FROM subscription_transactions WHERE transaction_id = :tx_id LIMIT 1");
            $stmtTx->execute(['tx_id' => $orderId]);
            $tx = $stmtTx->fetch(PDO::FETCH_ASSOC);

            if (!$tx || (int)$tx['institution_id'] !== (int)$user['college_id']) {
                http_response_code(403);
                throw new Exception("Forbidden. You do not own this transaction.");
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
                    'message' => 'Payment verification returned pending or failed status.'
                ]);
            }
            break;

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
