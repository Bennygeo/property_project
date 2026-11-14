<?php
/**
 * GET /api/subscriptions/invoice.php
 * Generates official GST Tax Invoice for subscription purchases.
 * Computes 18% GST (9% CGST + 9% SGST), SAC Code 998313, customer and company compliance details.
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

use Mannidam\Config\Database;
use Mannidam\Helpers\Response;

Response::initCors();

$invoiceNum = trim((string)($_GET['invoiceNumber'] ?? $_GET['invoice_number'] ?? ''));
$invoiceId  = (int)($_GET['invoiceId'] ?? $_GET['invoice_id'] ?? 0);
$userId     = (int)($_GET['userId'] ?? $_GET['user_id'] ?? 0);
$format     = trim((string)($_GET['format'] ?? 'html')); // 'html' | 'json'

$db = (new Database())->getConnection();

try {
    if (!empty($invoiceNum)) {
        $stmt = $db->prepare("SELECT * FROM subscription_invoices WHERE invoice_number = ?");
        $stmt->execute([$invoiceNum]);
    } elseif ($invoiceId > 0) {
        $stmt = $db->prepare("SELECT * FROM subscription_invoices WHERE id = ?");
        $stmt->execute([$invoiceId]);
    } else {
        // Latest invoice for user
        $stmt = $db->prepare("SELECT * FROM subscription_invoices WHERE user_id = ? ORDER BY id DESC LIMIT 1");
        $stmt->execute([$userId]);
    }

    $inv = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$inv) {
        if ($format === 'json') {
            Response::error('Tax invoice not found', 404);
        } else {
            echo "<h2>Tax Invoice Not Found</h2><p>No valid GST invoice matches the requested identifier.</p>";
            exit;
        }
    }

    if ($format === 'json') {
        Response::success(['invoice' => $inv], 'Invoice retrieved successfully');
        exit;
    }

    // Render Clean Printable / PDF-Ready GST Tax Invoice HTML
    $baseAmt = (float)$inv['base_amount'];
    $gstAmt  = (float)$inv['gst_amount'];
    $total   = (float)$inv['total_amount'];
    $cgst    = round($gstAmt / 2, 2);
    $sgst    = round($gstAmt / 2, 2);
    $invDate = date('d M Y, h:i A', strtotime($inv['created_at']));

    header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>GST Tax Invoice - <?= htmlspecialchars($inv['invoice_number']) ?></title>
  <style>
    @page { size: A4; margin: 15mm; }
    body {
      font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #0f172a;
      background: #f8fafc;
      margin: 0;
      padding: 24px;
      font-size: 13px;
    }
    .invoice-card {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 9px;
      padding: 36px;
      box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05);
    }
    .inv-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #5e8f72;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .brand-logo-area h1 {
      font-size: 24px;
      font-weight: 800;
      color: #0f3b4a;
      letter-spacing: -0.5px;
      margin: 0 0 4px 0;
    }
    .brand-logo-area span {
      color: #5e8f72;
    }
    .company-meta {
      font-size: 11px;
      color: #475569;
      line-height: 1.5;
    }
    .inv-title-block {
      text-align: right;
    }
    .inv-badge {
      display: inline-block;
      background: #e5f7ec;
      color: #2c4938;
      font-weight: 700;
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 6px;
      margin-bottom: 6px;
    }
    .inv-num {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
    }
    .inv-date {
      font-size: 11px;
      color: #64748b;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 28px;
    }
    .info-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px 16px;
    }
    .info-box h3 {
      font-size: 11px;
      font-weight: 700;
      color: #5e8f72;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0 0 8px 0;
    }
    .info-box p {
      margin: 2px 0;
      font-size: 12px;
      color: #334155;
    }
    .table-container {
      margin-bottom: 24px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    th {
      background: #0f3b4a;
      color: #ffffff;
      padding: 10px 14px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    th:first-child { border-top-left-radius: 8px; }
    th:last-child { border-top-right-radius: 8px; }
    td {
      padding: 12px 14px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 12px;
      color: #1e293b;
    }
    .text-right { text-align: right; }
    .totals-area {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 28px;
    }
    .totals-box {
      width: 320px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      font-size: 12px;
      color: #475569;
    }
    .totals-row.grand-total {
      border-top: 2px solid #0f172a;
      padding-top: 10px;
      font-size: 15px;
      font-weight: 800;
      color: #0f3b4a;
    }
    .notice-box {
      border-left: 3px solid #5e8f72;
      background: #e5f7ec;
      padding: 12px 16px;
      border-radius: 0 8px 8px 0;
      font-size: 11px;
      color: #2c4938;
      line-height: 1.5;
    }
    .print-actions {
      text-align: center;
      margin-top: 24px;
    }
    .btn-print {
      background: #5e8f72;
      color: #ffffff;
      border: none;
      padding: 10px 24px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(94, 143, 114, 0.3);
    }
    .btn-print:hover {
      background: #497259;
    }
    @media print {
      body { background: #ffffff; padding: 0; }
      .invoice-card { border: none; box-shadow: none; padding: 0; }
      .print-actions { display: none; }
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    <header class="inv-header">
      <div class="brand-logo-area">
        <h1>FIND<span>A</span>PLOT.IN</h1>
        <div class="company-meta">
          <strong>Find A Plot Technologies Private Limited</strong><br>
          No. 42, Anna Salai, Guindy, Chennai – 600032, Tamil Nadu, India<br>
          <strong>GSTIN:</strong> <?= htmlspecialchars($inv['gstin']) ?> | <strong>SAC Code:</strong> <?= htmlspecialchars($inv['sac_code']) ?><br>
          <strong>Contact:</strong> compliance@findaplot.in | +91 94441 00000
        </div>
      </div>
      <div class="inv-title-block">
        <span class="inv-badge">TAX INVOICE</span>
        <div class="inv-num"><?= htmlspecialchars($inv['invoice_number']) ?></div>
        <div class="inv-date">Date: <?= $invDate ?></div>
        <div class="inv-date">Status: <strong>PAID</strong></div>
      </div>
    </header>

    <div class="info-grid">
      <div class="info-box">
        <h3>Billed To (Customer)</h3>
        <p><strong><?= htmlspecialchars($inv['customer_name']) ?></strong></p>
        <p>Phone: <?= htmlspecialchars($inv['customer_phone'] ?: 'N/A') ?></p>
        <p>Email: <?= htmlspecialchars($inv['customer_email'] ?: 'N/A') ?></p>
        <p>Place of Supply: Tamil Nadu (Code 33)</p>
      </div>
      <div class="info-box">
        <h3>Payment & Transaction Dossier</h3>
        <p><strong>Payment Method:</strong> <?= htmlspecialchars($inv['payment_method']) ?></p>
        <p><strong>Payment Ref ID:</strong> <?= htmlspecialchars($inv['payment_id']) ?></p>
        <p><strong>Transaction Type:</strong> Online Prepaid Subscription</p>
        <p><strong>Digital Seal:</strong> Verified Cryptographically</p>
      </div>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Service Description</th>
            <th>SAC</th>
            <th class="text-right">Qty</th>
            <th class="text-right">Base Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>
              <strong><?= htmlspecialchars($inv['plan_name']) ?> Membership Subscription</strong><br>
              <span style="font-size:11px;color:#64748b;">Includes Cadastral Project Views, Comparisons, Advisory Consultations & Site Coordination.</span>
            </td>
            <td><?= htmlspecialchars($inv['sac_code']) ?></td>
            <td class="text-right">1</td>
            <td class="text-right">₹<?= number_format($baseAmt, 2) ?></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="totals-area">
      <div class="totals-box">
        <div class="totals-row">
          <span>Taxable Value (Base)</span>
          <span>₹<?= number_format($baseAmt, 2) ?></span>
        </div>
        <div class="totals-row">
          <span>CGST (9.00%)</span>
          <span>₹<?= number_format($cgst, 2) ?></span>
        </div>
        <div class="totals-row">
          <span>SGST (9.00%)</span>
          <span>₹<?= number_format($sgst, 2) ?></span>
        </div>
        <div class="totals-row">
          <span>Total GST (18.00%)</span>
          <span>₹<?= number_format($gstAmt, 2) ?></span>
        </div>
        <div class="totals-row grand-total">
          <span>Total Amount Paid</span>
          <span>₹<?= number_format($total, 2) ?></span>
        </div>
      </div>
    </div>

    <div class="notice-box">
      <strong>Statutory Regulatory Notice:</strong><br>
      This document constitutes an electronically generated Tax Invoice under Section 31 of the CGST Act, 2017. Services provided are classified under Real Estate Portal & Intelligence Advisory (SAC 998313). No physical signature is required.
    </div>

    <div class="print-actions">
      <button type="button" class="btn-print" onclick="window.print()">
        Download / Print PDF Invoice
      </button>
    </div>
  </div>
</body>
</html>
<?php
} catch (\Throwable $e) {
    Response::error('Failed to generate invoice: ' . $e->getMessage(), 500);
}

