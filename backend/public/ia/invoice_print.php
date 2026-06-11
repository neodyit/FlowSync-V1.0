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

    $subtotal = $invoice['amount'] - $invoice['gst_amount'];
    
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
    <style>
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #333;
            background-color: #f9f9f9;
            margin: 0;
            padding: 40px;
        }
        .invoice-card {
            max-width: 800px;
            margin: 0 auto;
            background: #fff;
            padding: 50px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            border: 1px solid #eaeaea;
            position: relative;
        }
        .invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #f2f2f2;
            padding-bottom: 30px;
            margin-bottom: 30px;
        }
        .company-logo {
            font-size: 28px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: -0.5px;
        }
        .company-logo span {
            color: #3b82f6;
        }
        .invoice-title {
            text-align: right;
        }
        .invoice-title h2 {
            margin: 0 0 10px 0;
            font-size: 24px;
            font-weight: 700;
            color: #0f172a;
        }
        .invoice-title p {
            margin: 0;
            font-size: 14px;
            color: #64748b;
        }
        .details-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-bottom: 40px;
        }
        .details-block h4 {
            margin: 0 0 12px 0;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #94a3b8;
            font-weight: 600;
        }
        .details-block p {
            margin: 0 0 6px 0;
            font-size: 15px;
            line-height: 1.5;
            color: #334155;
        }
        .details-block p strong {
            color: #0f172a;
        }
        .table-items {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 40px;
        }
        .table-items th {
            text-align: left;
            padding: 14px;
            background-color: #f8fafc;
            border-bottom: 2px solid #e2e8f0;
            font-size: 13px;
            font-weight: 600;
            color: #475569;
            text-transform: uppercase;
        }
        .table-items td {
            padding: 18px 14px;
            border-bottom: 1px solid #f1f5f9;
            font-size: 15px;
            color: #334155;
        }
        .text-right {
            text-align: right !important;
        }
        .summary-container {
            width: 50%;
            margin-left: auto;
            margin-bottom: 40px;
        }
        .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            font-size: 15px;
            color: #475569;
        }
        .summary-row.total-row {
            border-top: 2px solid #f1f5f9;
            padding-top: 15px;
            margin-top: 10px;
            font-size: 19px;
            font-weight: 700;
            color: #0f172a;
        }
        .paid-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 9999px;
            background-color: #dcfce7;
            color: #15803d;
            font-weight: 600;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .footer-note {
            border-top: 1px solid #f1f5f9;
            padding-top: 30px;
            text-align: center;
            color: #94a3b8;
            font-size: 13px;
        }
        .actions-bar {
            max-width: 800px;
            margin: 0 auto 20px auto;
            display: flex;
            justify-content: flex-end;
            gap: 12px;
        }
        .btn {
            background-color: #3b82f6;
            color: #fff;
            padding: 10px 20px;
            font-size: 14px;
            font-weight: 600;
            border-radius: 6px;
            border: none;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            text-decoration: none;
            transition: background-color 0.2s;
        }
        .btn:hover {
            background-color: #2563eb;
        }
        .btn-secondary {
            background-color: #fff;
            color: #475569;
            border: 1px solid #e2e8f0;
        }
        .btn-secondary:hover {
            background-color: #f8fafc;
            color: #0f172a;
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
            }
            .actions-bar {
                display: none;
            }
        }
    </style>
</head>
<body>

    <div class="actions-bar">
        <button onclick="window.close();" class="btn btn-secondary">Close</button>
        <button onclick="window.print();" class="btn">Print / Save as PDF</button>
    </div>

    <div class="invoice-card">
        <div class="invoice-header">
            <div class="company-logo">Flow<span>Sync</span></div>
            <div class="invoice-title">
                <h2>INVOICE</h2>
                <p>#<?php echo htmlspecialchars($invoice['invoice_number']); ?></p>
            </div>
        </div>

        <div class="details-container">
            <div class="details-block">
                <h4>Bill To:</h4>
                <p><strong><?php echo htmlspecialchars($invoice['college_name']); ?></strong></p>
                <?php if (!empty($invoice['college_address'])): ?>
                    <p><?php echo nl2br(htmlspecialchars($invoice['college_address'])); ?></p>
                <?php endif; ?>
            </div>
            <div class="details-block" style="text-align: right;">
                <h4>Invoice Details:</h4>
                <p>Date: <strong><?php echo date('d M Y', strtotime($invoice['generated_at'])); ?></strong></p>
                <p>Payment Status: <span class="paid-badge">Paid</span></p>
                <p>Payment Method: <strong><?php echo htmlspecialchars(ucfirst($invoice['payment_gateway'])); ?></strong></p>
                <p>Ref ID: <strong><?php echo htmlspecialchars($invoice['pg_order_id']); ?></strong></p>
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
                        <strong>FlowSync Subscription Plan - <?php echo htmlspecialchars($invoice['plan_name']); ?></strong><br>
                        <span style="font-size: 13px; color: #64748b;">Duration: <?php echo (int)$invoice['duration_months']; ?> Months</span>
                    </td>
                    <td class="text-right">₹<?php echo number_format($subtotal, 2); ?></td>
                    <td class="text-right">
                        <?php 
                        $bonusDays = (int)$invoice['bonus_days'];
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
                    <td class="text-right">₹<?php echo number_format($subtotal, 2); ?></td>
                </tr>
            </tbody>
        </table>

        <div class="summary-container">
            <div class="summary-row">
                <span>Subtotal</span>
                <span>₹<?php echo number_format($subtotal, 2); ?></span>
            </div>
            <?php if ((float)$invoice['gateway_charge'] > 0): ?>
                <div class="summary-row">
                    <span>Gateway Charges</span>
                    <span>₹<?php echo number_format((float)$invoice['gateway_charge'], 2); ?></span>
                </div>
            <?php endif; ?>
            <div class="summary-row">
                <span>GST (Tax)</span>
                <span>₹<?php echo number_format((float)$invoice['gst_amount'], 2); ?></span>
            </div>
            <div class="summary-row total-row">
                <span>Total Paid</span>
                <span>₹<?php echo number_format((float)$invoice['amount'], 2); ?></span>
            </div>
        </div>

        <div class="footer-note">
            <p>Thank you for choosing FlowSync. If you have any billing queries, contact support@flowsync.in</p>
            <p style="font-size: 11px; margin-top: 15px; color: #cbd5e1;">This is a computer-generated invoice and does not require a signature.</p>
        </div>
    </div>

</body>
</html>
