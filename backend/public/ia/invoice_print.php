<?php

require_once __DIR__ . '/../bootstrap.php';

use FlowSync\Utils\InstitutionAdminMiddleware;
use FlowSync\Utils\PaymentService;

// Verify user is Institution Admin
$session = InstitutionAdminMiddleware::check();
$collegeId = (int)$session['college_id'];

$paymentService = new PaymentService();
$invoiceNum = $_GET['invoice_number'] ?? null;

if (!$invoiceNum) {
    http_response_code(400);
    echo "<h1>Error: Invoice number is required.</h1>";
    exit;
}

try {
    $invoice = $paymentService->getInvoiceDetails($invoiceNum);

    if (!$invoice) {
        http_response_code(404);
        echo "<h1>Error: Invoice not found.</h1>";
        exit;
    }

    // Security Check: Enforce college scope
    if ((int)$invoice['institution_id'] !== $collegeId) {
        http_response_code(403);
        echo "<h1>Access Denied: You do not have permission to view this invoice.</h1>";
        exit;
    }

    // Original plan price
    $originalPrice = isset($invoice['plan_price']) ? (float)$invoice['plan_price'] : (float)$invoice['amount'];
    
    // Gateway charges / processing fees
    $gatewayCharge = isset($invoice['gateway_charge']) ? (float)$invoice['gateway_charge'] : 0.0;
    
    // GST
    $gstAmount = isset($invoice['gst_amount']) ? (float)$invoice['gst_amount'] : 0.0;
    
    // Total amount paid
    $totalPaid = (float)$invoice['amount'];
    
    // Net plan price paid = Total - Gateway Charge - GST
    $netPaid = $totalPaid - $gatewayCharge - $gstAmount;
    
    // Discount = Original plan price - Net paid
    $discount = max(0.0, $originalPrice - $netPaid);
    
} catch (Exception $e) {
    http_response_code(500);
    echo "<h1>Error: " . htmlspecialchars($e->getMessage()) . "</h1>";
    exit;
}

// Set header to HTML for rendering
header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice - <?php echo htmlspecialchars($invoice['invoice_number']); ?></title>
    <!-- Google Fonts for premium typography -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #1e293b;
            background-color: #f8fafc;
            line-height: 1.5;
            padding: 40px 20px;
        }
        .actions-bar {
            max-width: 850px;
            margin: 0 auto 24px auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .back-link {
            font-size: 13px;
            font-weight: 700;
            color: #64748b;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: color 0.2s;
        }
        .back-link:hover {
            color: #7c3aed;
        }
        .btn-group {
            display: flex;
            gap: 12px;
        }
        .btn {
            font-family: inherit;
            background-color: #7c3aed;
            color: #fff;
            padding: 10px 20px;
            font-size: 13px;
            font-weight: 700;
            border-radius: 12px;
            border: none;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            text-decoration: none;
            box-shadow: 0 4px 12px rgba(124, 58, 237, 0.15);
            transition: all 0.2s ease;
        }
        .btn:hover {
            background-color: #6d28d9;
            transform: translateY(-1px);
            box-shadow: 0 6px 16px rgba(124, 58, 237, 0.25);
        }
        .btn-secondary {
            background-color: #fff;
            color: #475569;
            border: 1px solid #e2e8f0;
            box-shadow: none;
        }
        .btn-secondary:hover {
            background-color: #f8fafc;
            color: #0f172a;
            transform: none;
            box-shadow: none;
        }
        .invoice-card {
            max-width: 850px;
            margin: 0 auto;
            background: #fff;
            padding: 60px;
            border-radius: 24px;
            box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);
            border: 1px solid #f1f5f9;
            position: relative;
            overflow: hidden;
        }
        .invoice-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 8px;
            background: linear-gradient(90deg, #7c3aed 0%, #a78bfa 100%);
        }
        .invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 48px;
        }
        .brand-section {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .company-logo {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 28px;
            font-weight: 700;
            color: #0f172a;
            letter-spacing: -1px;
            display: flex;
            align-items: center;
            gap: 2px;
        }
        .company-logo span {
            color: #7c3aed;
        }
        .company-subtext {
            font-size: 11px;
            font-weight: 700;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 1.5px;
        }
        .invoice-title-block {
            text-align: right;
        }
        .invoice-title-block h2 {
            font-family: 'Space Grotesk', sans-serif;
            margin: 0 0 4px 0;
            font-size: 32px;
            font-weight: 700;
            color: #0f172a;
            letter-spacing: -0.5px;
        }
        .invoice-number {
            font-family: monospace;
            font-size: 14px;
            color: #64748b;
            background-color: #f1f5f9;
            padding: 4px 10px;
            border-radius: 6px;
            display: inline-block;
        }
        .details-grid {
            display: grid;
            grid-template-columns: 1.2fr 0.8fr;
            gap: 60px;
            margin-bottom: 48px;
            padding-bottom: 36px;
            border-bottom: 1px solid #f1f5f9;
        }
        .details-block h4 {
            margin: 0 0 16px 0;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #94a3b8;
            font-weight: 700;
        }
        .details-block p {
            margin: 0 0 6px 0;
            font-size: 14px;
            line-height: 1.6;
            color: #475569;
        }
        .details-block p strong {
            color: #0f172a;
            font-weight: 700;
        }
        .meta-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .meta-item {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            color: #475569;
        }
        .meta-label {
            color: #94a3b8;
        }
        .meta-val {
            font-weight: 600;
            color: #0f172a;
        }
        .paid-badge {
            display: inline-flex;
            align-items: center;
            padding: 4px 12px;
            border-radius: 8px;
            background-color: #dcfce7;
            color: #15803d;
            font-weight: 700;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .table-items {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 40px;
        }
        .table-items th {
            text-align: left;
            padding: 16px 20px;
            background-color: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
            font-size: 11px;
            font-weight: 700;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .table-items td {
            padding: 24px 20px;
            border-bottom: 1px solid #f1f5f9;
            font-size: 14px;
            color: #334155;
            vertical-align: top;
        }
        .plan-main {
            font-size: 15px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 4px;
        }
        .plan-sub {
            font-size: 12px;
            color: #64748b;
        }
        .text-right {
            text-align: right !important;
        }
        .summary-wrapper {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 48px;
        }
        .summary-container {
            width: 380px;
            background-color: #f8fafc;
            padding: 24px;
            border-radius: 16px;
            border: 1px solid #f1f5f9;
        }
        .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 13px;
            color: #475569;
        }
        .summary-row.total-row {
            border-top: 1px solid #e2e8f0;
            padding-top: 16px;
            margin-top: 12px;
            font-size: 18px;
            font-weight: 800;
            color: #7c3aed;
        }
        .footer-note {
            border-top: 1px solid #f1f5f9;
            padding-top: 40px;
            text-align: center;
            color: #94a3b8;
            font-size: 12px;
            line-height: 1.6;
        }
        .footer-note p strong {
            color: #64748b;
        }
        
        @media print {
            body {
                background-color: #fff;
                padding: 0;
            }
            .invoice-card {
                box-shadow: none;
                border: none;
                padding: 0;
                border-radius: 0;
            }
            .invoice-card::before {
                display: none;
            }
            .actions-bar {
                display: none;
            }
            .summary-container {
                background-color: #fff;
                border: 1px solid #e2e8f0;
            }
        }
    </style>
</head>
<body>

    <div class="actions-bar">
        <a href="javascript:window.close();" class="back-link">
            &larr; Back to Billing
        </a>
        <div class="btn-group">
            <button onclick="window.close();" class="btn btn-secondary">Close</button>
            <button onclick="window.print();" class="btn">Print Invoice</button>
        </div>
    </div>

    <div class="invoice-card">
        <div class="invoice-header">
            <div class="brand-section">
                <div class="company-logo">Flow<span>Sync</span></div>
                <div class="company-subtext">Faculty Task Management & Workflow System</div>
            </div>
            <div class="invoice-title-block">
                <h2>INVOICE</h2>
                <div class="invoice-number">#<?php echo htmlspecialchars($invoice['invoice_number']); ?></div>
            </div>
        </div>

        <div class="details-grid">
            <div class="details-block">
                <h4>Bill To:</h4>
                <p><strong><?php echo htmlspecialchars($invoice['college_name']); ?></strong></p>
                <?php if (!empty($invoice['college_address'])): ?>
                    <p style="margin-top: 6px; white-space: pre-line; color: #64748b; font-size: 13px;"><?php echo htmlspecialchars($invoice['college_address']); ?></p>
                <?php endif; ?>
            </div>
            <div class="details-block">
                <h4>Invoice Details:</h4>
                <div class="meta-list">
                    <div class="meta-item">
                        <span class="meta-label">Date Issued</span>
                        <span class="meta-val"><?php echo date('d M Y', strtotime($invoice['generated_at'])); ?></span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Payment Status</span>
                        <span class="meta-val"><span class="paid-badge">Paid</span></span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Method</span>
                        <span class="meta-val"><?php echo htmlspecialchars(ucfirst($invoice['payment_gateway'])); ?></span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Ref ID</span>
                        <span class="meta-val" style="font-family: monospace; font-size: 12px;"><?php echo htmlspecialchars($invoice['pg_order_id']); ?></span>
                    </div>
                </div>
            </div>
        </div>

        <table class="table-items">
            <thead>
                <tr>
                    <th>Description</th>
                    <th class="text-right">Price</th>
                    <th class="text-right">Bonus Duration</th>
                    <th class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>
                        <div class="plan-main">FlowSync Subscription Plan - <?php echo htmlspecialchars($invoice['plan_name']); ?></div>
                        <div class="plan-sub">Licensing Period: <?php echo (int)$invoice['duration_months']; ?> Months</div>
                    </td>
                    <td class="text-right" style="font-weight: 500;">₹<?php echo number_format($originalPrice, 2); ?></td>
                    <td class="text-right" style="color: #64748b;">
                        <?php 
                        $bonusDays = isset($invoice['bonus_days']) ? (int)$invoice['bonus_days'] : 0;
                        if ($bonusDays > 0) {
                            if ($bonusDays % 30 === 0) {
                                echo ($bonusDays / 30) . " Months FREE";
                            } else {
                                echo $bonusDays . " Days FREE";
                            }
                        } else {
                            echo "-";
                        }
                        ?>
                    </td>
                    <td class="text-right" style="font-weight: 600;">₹<?php echo number_format($netPaid, 2); ?></td>
                </tr>
            </tbody>
        </table>

        <div class="summary-wrapper">
            <div class="summary-container">
                <div class="summary-row">
                    <span>Licensing Subtotal</span>
                    <span style="font-weight: 600;">₹<?php echo number_format($originalPrice, 2); ?></span>
                </div>
                <?php if ($discount > 0.001): ?>
                    <div class="summary-row" style="color: #16a34a;">
                        <span>Discount Applied</span>
                        <span>-₹<?php echo number_format($discount, 2); ?></span>
                    </div>
                    <div class="summary-row" style="border-top: 1px dashed #cbd5e1; padding-top: 8px; margin-top: 4px;">
                        <span>Net Subtotal</span>
                        <span>₹<?php echo number_format($netPaid, 2); ?></span>
                    </div>
                <?php endif; ?>
                <?php if ($gatewayCharge > 0.001): ?>
                    <div class="summary-row">
                        <span>Tax & Processing fee</span>
                        <span>₹<?php echo number_format($gatewayCharge, 2); ?></span>
                    </div>
                <?php endif; ?>
                <?php if ($gstAmount > 0.001): ?>
                    <div class="summary-row">
                        <span>GST (Tax Rate)</span>
                        <span>₹<?php echo number_format($gstAmount, 2); ?></span>
                    </div>
                <?php endif; ?>
                <div class="summary-row total-row">
                    <span>Total Paid</span>
                    <span>₹<?php echo number_format($totalPaid, 2); ?></span>
                </div>
            </div>
        </div>

        <div class="footer-note">
            <p>Thank you for choosing FlowSync. If you have any questions regarding this invoice, please reach out to <strong>support@flowsync.in</strong></p>
            <p style="font-size: 10px; margin-top: 16px; color: #cbd5e1; font-weight: 500; letter-spacing: 0.5px; text-transform: uppercase;">This is a computer-generated invoice and does not require a physical signature.</p>
        </div>
    </div>
</body>
</html>
