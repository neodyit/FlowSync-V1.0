<?php

namespace FlowSync\Utils;

use FlowSync\Config\Database;
use FlowSync\Utils\SystemSettings;
use FlowSync\Utils\SubscriptionService;
use PDO;
use Exception;

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
            'tax_rate' => (float)SystemSettings::get('payment_tax_rate', 18.0),
            'invoice_prefix' => SystemSettings::get('payment_invoice_prefix', 'FS'),
            'cashfree_app_id' => SystemSettings::get('cashfree_app_id', ''),
            'cashfree_secret_key' => SystemSettings::get('cashfree_secret_key', ''),
            'cashfree_env' => SystemSettings::get('cashfree_env', 'sandbox')
        ];
    }

    public function calculateAmounts($planPrice)
    {
        $config = $this->getPaymentConfig();
        
        $subtotal = (float)$planPrice;
        $gatewayCharge = 0.0;
        
        if (!$config['absorb_charges']) {
            $gatewayCharge = round($subtotal * ($config['gateway_charge_pct'] / 100), 2);
        }

        $taxableAmount = $subtotal + $gatewayCharge;
        $taxAmount = round($taxableAmount * ($config['tax_rate'] / 100), 2);
        $total = $taxableAmount + $taxAmount;

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

        $amounts = $this->calculateAmounts($plan['price']);
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

        // Cashfree API endpoint
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

        // Record a pending transaction
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
            'cf_order' => $resData
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

        // Cashfree API endpoint
        $baseUrl = ($config['cashfree_env'] === 'production') 
            ? 'https://api.cashfree.com/pg' 
            : 'https://sandbox.cashfree.com/pg';

        $ch = curl_init($baseUrl . '/orders/' . $orderId);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'x-api-version: 2023-08-01',
            'x-client-id: ' . $config['cashfree_app_id'],
            'x-client-secret: ' . $config['cashfree_secret_key']
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            throw new Exception("Failed to fetch order status from Cashfree.");
        }

        $resData = json_decode($response, true);
        $orderStatus = $resData['order_status'] ?? 'PENDING';

        if ($orderStatus === 'PAID') {
            $this->db->beginTransaction();
            try {
                // Update transaction
                $upTx = $this->db->prepare("
                    UPDATE subscription_transactions 
                    SET payment_status = 'completed', paid_at = CURRENT_TIMESTAMP
                    WHERE id = :id
                ");
                $upTx->execute(['id' => $tx['id']]);

                // Activate subscription for the college
                $subService = new SubscriptionService();
                $subService->assignSubscription($tx['institution_id'], $tx['plan_id']);

                // Generate Invoice
                $invoiceNumber = $config['invoice_prefix'] . '-INV-' . time() . '-' . rand(100, 999);
                $amounts = $this->calculateAmounts($resData['order_amount']); // Recalculate tax
                
                $stmtInv = $this->db->prepare("
                    INSERT INTO invoices (invoice_number, institution_id, transaction_id, amount, gst_amount)
                    VALUES (:inv_num, :inst_id, :tx_id, :amt, :gst)
                ");
                $stmtInv->execute([
                    'inv_num' => $invoiceNumber,
                    'inst_id' => $tx['institution_id'],
                    'tx_id' => $tx['id'],
                    'amt' => $tx['amount'],
                    'gst' => $tx['amount'] - ($tx['amount'] / (1 + ($config['tax_rate'] / 100))) // GST component in final price
                ]);

                $this->db->commit();
                return true;
            } catch (Exception $e) {
                $this->db->rollBack();
                throw $e;
            }
        } elseif (in_array($orderStatus, ['FAILED', 'CANCELLED'])) {
            $upTx = $this->db->prepare("
                UPDATE subscription_transactions 
                SET payment_status = 'failed'
                WHERE id = :id
            ");
            $upTx->execute(['id' => $tx['id']]);
            return false;
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

    public function getInvoiceDetails($invoiceIdOrNumber)
    {
        $stmt = $this->db->prepare("
            SELECT inv.*, tx.gateway_charge, tx.payment_gateway, tx.paid_at, tx.transaction_id as pg_order_id,
                   c.name as college_name, c.address as college_address, sp.name as plan_name, sp.duration_months
            FROM invoices inv
            JOIN subscription_transactions tx ON inv.transaction_id = tx.id
            JOIN colleges c ON inv.institution_id = c.id
            LEFT JOIN subscription_plans sp ON tx.plan_id = sp.id
            WHERE inv.id = :id OR inv.invoice_number = :inv_num
            LIMIT 1
        ");
        $stmt->execute([
            'id' => is_numeric($invoiceIdOrNumber) ? $invoiceIdOrNumber : null,
            'inv_num' => $invoiceIdOrNumber
        ]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }
}
