<?php

require_once __DIR__ . '/../bootstrap.php';

use FlowSync\Utils\AdminMiddleware;
use FlowSync\Utils\PaymentService;
use FlowSync\Utils\SystemSettings;

AdminMiddleware::check();

$paymentService = new PaymentService();
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            $config = $paymentService->getPaymentConfig();
            // Redact secret key for safety
            if (!empty($config['cashfree_secret_key'])) {
                $config['cashfree_secret_key'] = substr($config['cashfree_secret_key'], 0, 4) . '...' . substr($config['cashfree_secret_key'], -4);
            }
            echo json_encode(['status' => 'success', 'data' => $config]);
            break;

        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            if (empty($data)) {
                throw new Exception("Request body cannot be empty");
            }

            $userId = $session['user_id'] ?? null;

            // Map frontend inputs to system settings keys
            $mappings = [
                'gateway_name' => 'payment_gateway_name',
                'gateway_charge_pct' => 'payment_gateway_charge_pct',
                'absorb_charges' => 'payment_gateway_absorb_charges',
                'tax_rate' => 'payment_tax_rate',
                'invoice_prefix' => 'payment_invoice_prefix',
                'cashfree_app_id' => 'cashfree_app_id',
                'cashfree_secret_key' => 'cashfree_secret_key',
                'cashfree_env' => 'cashfree_env'
            ];

            foreach ($mappings as $postKey => $settingsKey) {
                if (isset($data[$postKey])) {
                    $val = $data[$postKey];
                    // Keep boolean string representation
                    if (is_bool($val)) {
                        $val = $val ? 'true' : 'false';
                    }
                    // Avoid saving masked values
                    if ($postKey === 'cashfree_secret_key' && strpos($val, '...') !== false) {
                        continue;
                    }
                    SystemSettings::set($settingsKey, (string)$val, $userId);
                }
            }

            $logger = new \FlowSync\Utils\AuditLogger();
            $logger->log($userId, 'UPDATE_PAYMENT_SETTINGS', 'SYSTEM', null);

            echo json_encode([
                'status' => 'success',
                'message' => 'Payment settings updated successfully'
            ]);
            break;

        default:
            http_response_code(405);
            echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
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
