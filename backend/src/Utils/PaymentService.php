<?php

namespace FlowSync\Utils;

use FlowSync\Config\Database;
use FlowSync\Utils\SystemSettings;
use FlowSync\Utils\SubscriptionService;
use PDO;
use Exception;
use DateTime;

class PaymentService
{
    private $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    public function getPaymentConfig()
    {
        return [
            'gateway_name' => SystemSettings::get('payment_gateway_name', 'Cashfree'),
            'gateway_charge_pct' => (float)SystemSettings::get('payment_gateway_charge_pct', 2.0),
            'absorb_charges' => SystemSettings::get('payment_gateway_absorb_charges', 'false') === 'true',
            'tax_rate' => (float)SystemSettings::get('payment_tax_rate', 0.0),
            'invoice_prefix' => SystemSettings::get('payment_invoice_prefix', 'FS'),
            'cashfree_app_id' => SystemSettings::get('cashfree_app_id', ''),
            'cashfree_secret_key' => SystemSettings::get('cashfree_secret_key', ''),
            'cashfree_env' => SystemSettings::get('cashfree_env', 'sandbox')
        ];
    }

    public function calculateAmounts($planId)
    {
        $config = $this->getPaymentConfig();
        
        $stmt = $this->db->prepare("SELECT price, gateway_percentage FROM subscription_plans WHERE id = :id AND status = 'active' LIMIT 1");
        $stmt->execute(['id' => $planId]);
        $plan = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$plan) {
            throw new Exception("Active plan not found.");
        }
        
        $subtotal = (float)$plan['price'];
        $gatewayChargePct = ($plan['gateway_percentage'] !== null) ? (float)$plan['gateway_percentage'] : $config['gateway_charge_pct'];
        
        $gatewayCharge = 0.0;
        if (!$config['absorb_charges']) {
            $gatewayCharge = round($subtotal * ($gatewayChargePct / 100), 2);
        }

        $taxableAmount = $subtotal + $gatewayCharge;
        $taxAmount = round($taxableAmount * ($config['tax_rate'] / 100), 2);
        $total = round($taxableAmount + $taxAmount, 2);

        return [
            'subtotal' => $subtotal,
            'gateway_charge' => $gatewayCharge,
            'taxable_amount' => $taxableAmount,
            'tax_amount' => $taxAmount,
            'total' => $total
        ];
    }

    public function createCashfreeOrder($institutionId, $planId, $customerEmail, $customerPhone, $returnUrl)
    {
        $subService = new SubscriptionService();
        $plan = $subService->getPlanById($planId);
        if (!$plan) {
            throw new Exception("Plan not found.");
        }

        $config = $this->getPaymentConfig();
        if (empty($config['cashfree_app_id']) || empty($config['cashfree_secret_key'])) {
            throw new Exception("Payment gateway keys are not configured.");
        }

        // Securely calculate checkout amounts solely on server side
        $amounts = $this->calculateAmounts($planId);
        $orderId = $config['invoice_prefix'] . '-SUB-' . time() . '-' . rand(1000, 9999);

        // Payload for Cashfree
        $payload = [
            'order_id' => $orderId,
            'order_amount' => $amounts['total'],
            'order_currency' => 'INR',
            'customer_details' => [
                'customer_id' => 'inst_' . $institutionId,
                'customer_email' => $customerEmail ?: 'billing@flowsync.in',
                'customer_phone' => $customerPhone ?: '9999999999'
            ],
            'order_meta' => [
                'return_url' => $returnUrl
            ]
        ];

        $baseUrl = ($config['cashfree_env'] === 'production') 
            ? 'https://api.cashfree.com/pg' 
            : 'https://sandbox.cashfree.com/pg';

        $ch = curl_init($baseUrl . '/orders');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'x-api-version: 2023-08-01',
            'x-client-id: ' . $config['cashfree_app_id'],
            'x-client-secret: ' . $config['cashfree_secret_key']
        ]);

        if (getenv('APP_ENV') === 'development' || $config['cashfree_env'] === 'sandbox') {
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            throw new Exception("Cashfree order creation failed: " . $response);
        }

        $resData = json_decode($response, true);
        if (empty($resData['payment_session_id'])) {
            throw new Exception("Cashfree did not return a payment session ID.");
        }

        // Record a pending transaction with the securely calculated amount
        $stmt = $this->db->prepare("
            INSERT INTO subscription_transactions (institution_id, plan_id, amount, gateway_charge, transaction_id, payment_gateway, payment_status)
            VALUES (:inst_id, :plan_id, :amount, :gw, :tx_id, 'cashfree', 'pending')
        ");
        $stmt->execute([
            'inst_id' => $institutionId,
            'plan_id' => $planId,
            'amount' => $amounts['total'],
            'gw' => $amounts['gateway_charge'],
            'tx_id' => $orderId
        ]);

        return [
            'order_id' => $orderId,
            'payment_session_id' => $resData['payment_session_id'],
            'amount' => $amounts['total'],
            'cf_order' => $resData,
            'environment' => $config['cashfree_env']
        ];
    }

    public function verifyCashfreePayment($orderId)
    {
        // Fetch transaction details
        $stmtCheck = $this->db->prepare("
            SELECT * FROM subscription_transactions 
            WHERE transaction_id = :tx_id AND payment_gateway = 'cashfree'
            LIMIT 1
        ");
        $stmtCheck->execute(['tx_id' => $orderId]);
        $tx = $stmtCheck->fetch(PDO::FETCH_ASSOC);

        if (!$tx) {
            throw new Exception("Transaction not found.");
        }

        if ($tx['payment_status'] === 'completed') {
            return true;
        }

        $config = $this->getPaymentConfig();
        if (empty($config['cashfree_app_id']) || empty($config['cashfree_secret_key'])) {
            throw new Exception("Payment gateway keys are not configured.");
        }

        $baseUrl = ($config['cashfree_env'] === 'production') 
            ? 'https://api.cashfree.com/pg' 
            : 'https://sandbox.cashfree.com/pg';

        $ch = curl_init($baseUrl . '/orders/' . $orderId);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        if (getenv('APP_ENV') === 'development' || $config['cashfree_env'] === 'sandbox') {
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        }
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'x-api-version: 2023-08-01',
            'x-client-id: ' . $config['cashfree_app_id'],
            'x-client-secret: ' . $config['cashfree_secret_key']
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        $logPath = __DIR__ . '/../../storage/payment_debug.log';
        $logData = [
            'timestamp' => date('Y-m-d H:i:s'),
            'order_id' => $orderId,
            'http_code' => $httpCode,
            'curl_error' => $curlError,
            'response' => json_decode($response, true) ?: $response
        ];
        file_put_contents($logPath, json_encode($logData, JSON_PRETTY_PRINT) . "\n", FILE_APPEND);

        if ($httpCode !== 200) {
            throw new Exception("Failed to fetch order status from Cashfree. HTTP: " . $httpCode);
        }

        $resData = json_decode($response, true);
        $orderStatus = $resData['order_status'] ?? 'PENDING';
        $isPaid = ($orderStatus === 'PAID');

        if (!$isPaid) {
            // Check payments endpoint fallback
            $chPay = curl_init($baseUrl . '/orders/' . $orderId . '/payments');
            curl_setopt($chPay, CURLOPT_RETURNTRANSFER, true);
            if (getenv('APP_ENV') === 'development' || $config['cashfree_env'] === 'sandbox') {
                curl_setopt($chPay, CURLOPT_SSL_VERIFYPEER, false);
                curl_setopt($chPay, CURLOPT_SSL_VERIFYHOST, false);
            }
            curl_setopt($chPay, CURLOPT_HTTPHEADER, [
                'x-api-version: 2023-08-01',
                'x-client-id: ' . $config['cashfree_app_id'],
                'x-client-secret: ' . $config['cashfree_secret_key']
            ]);
            $payResponse = curl_exec($chPay);
            $payHttpCode = curl_getinfo($chPay, CURLINFO_HTTP_CODE);
            curl_close($chPay);

            if ($payHttpCode === 200) {
                $payments = json_decode($payResponse, true);
                if (is_array($payments)) {
                    foreach ($payments as $payment) {
                        if (isset($payment['payment_status']) && $payment['payment_status'] === 'SUCCESS') {
                            $isPaid = true;
                            $resData['order_amount'] = $payment['payment_amount'] ?? $resData['order_amount'];
                            break;
                        }
                    }
                }
            }
        }

        if ($isPaid) {
            // SECURITY CHECK: Verify Cashfree actual paid amount matches database transaction record
            $expectedAmount = (float)$tx['amount'];
            $paidAmount = (float)($resData['order_amount'] ?? 0.0);
            
            if (abs($paidAmount - $expectedAmount) > 0.05) {
                file_put_contents($logPath, "SECURITY ALERT: Amount mismatch! Expected: {$expectedAmount}, Paid: {$paidAmount}\n", FILE_APPEND);
                throw new Exception("Security verification failed. Paid amount mismatch.");
            }

            $this->db->beginTransaction();
            try {
                // Update transaction
                $upTx = $this->db->prepare("
                    UPDATE subscription_transactions 
                    SET payment_status = 'completed', paid_at = CURRENT_TIMESTAMP
                    WHERE id = :id
                ");
                $upTx->execute(['id' => $tx['id']]);

                // Activate subscription
                $subService = new SubscriptionService();
                $subService->assignSubscription($tx['institution_id'], $tx['plan_id'], null, null, false);

                // Generate Invoice
                $invoiceNumber = $config['invoice_prefix'] . '-INV-' . time() . '-' . rand(100, 999);
                
                $stmtInv = $this->db->prepare("
                    INSERT INTO invoices (invoice_number, institution_id, transaction_id, amount, gst_amount)
                    VALUES (:inv_num, :inst_id, :tx_id, :amt, :gst)
                ");
                $stmtInv->execute([
                    'inv_num' => $invoiceNumber,
                    'inst_id' => $tx['institution_id'],
                    'tx_id' => $tx['id'],
                    'amt' => $tx['amount'],
                    'gst' => $tx['amount'] - ($tx['amount'] / (1 + ($config['tax_rate'] / 100)))
                ]);

                $this->db->commit();
                file_put_contents($logPath, "SUCCESS: Order ID verified and activated securely.\n", FILE_APPEND);
                return true;
            } catch (Exception $e) {
                $this->db->rollBack();
                throw $e;
            }
        }

        return false;
    }

    public function getAllTransactions()
    {
        $stmt = $this->db->query("
            SELECT tx.*, c.name as college_name, sp.name as plan_name
            FROM subscription_transactions tx
            LEFT JOIN colleges c ON tx.institution_id = c.id
            LEFT JOIN subscription_plans sp ON tx.plan_id = sp.id
            ORDER BY tx.created_at DESC
        ");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getInstitutionTransactions($collegeId)
    {
        $stmt = $this->db->prepare("
            SELECT tx.*, sp.name as plan_name, inv.invoice_number
            FROM subscription_transactions tx
            LEFT JOIN subscription_plans sp ON tx.plan_id = sp.id
            LEFT JOIN invoices inv ON tx.id = inv.transaction_id
            WHERE tx.institution_id = :college_id
            ORDER BY tx.created_at DESC
        ");
        $stmt->execute(['college_id' => $collegeId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getInvoiceDetails($invoiceNum)
    {
        $stmt = $this->db->prepare("
            SELECT inv.*, 
                   tx.transaction_id as tx_ref, 
                   tx.created_at as tx_date, 
                   tx.payment_gateway, 
                   tx.transaction_id as pg_order_id, 
                   tx.gateway_charge,
                   sp.name as plan_name, 
                   sp.duration_months, 
                   sp.price as plan_price,
                   c.name as college_name
            FROM invoices inv
            LEFT JOIN subscription_transactions tx ON inv.transaction_id = tx.id
            LEFT JOIN subscription_plans sp ON tx.plan_id = sp.id
            LEFT JOIN colleges c ON inv.institution_id = c.id
            WHERE inv.invoice_number = :inv_num
            LIMIT 1
        ");
        $stmt->execute(['inv_num' => $invoiceNum]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }
}
