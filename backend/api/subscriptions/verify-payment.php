<?php
/**
 * POST /api/subscriptions/verify-payment.php
 * Strictly verifies Razorpay HMAC SHA256 payment signature, activates plan in MySQL,
 * initializes entitlements, and generates automated GST tax invoice.
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/razorpay.php';
require_once __DIR__ . '/../../helpers/response.php';

use Mannidam\Config\Database;
use Mannidam\Config\RazorpayConfig;
use Mannidam\Helpers\Response;

Response::initCors();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Method not allowed', 405);
}

$input = Response::getJsonInput();
if (empty($input)) {
    $input = $_POST;
}

$orderId   = trim((string)($input['razorpay_order_id'] ?? $input['razorpayOrderId'] ?? $input['orderId'] ?? ''));
$paymentId = trim((string)($input['razorpay_payment_id'] ?? $input['razorpayPaymentId'] ?? $input['paymentId'] ?? ''));
$signature = trim((string)($input['razorpay_signature'] ?? $input['razorpaySignature'] ?? $input['signature'] ?? ''));
$planId    = trim((string)($input['planId'] ?? ''));
$userId    = max(1, (int)($input['userId'] ?? 1));

if (empty($orderId) || empty($paymentId) || empty($signature) || empty($planId)) {
    Response::error('Missing required Razorpay payment credentials or plan ID', 422);
}

// 1. Cryptographic Signature Verification
$isValid = RazorpayConfig::verifySignature($orderId, $paymentId, $signature);
if (!$isValid) {
    Response::error('Invalid Razorpay signature. Potential tampering detected — plan activation denied.', 403);
}

$db = (new Database())->getConnection();

try {
    $db->beginTransaction();

    // 2. Fetch Plan Specifications
    $pStmt = $db->prepare("SELECT * FROM subscription_plans WHERE id = ? AND is_active = 1");
    $pStmt->execute([$planId]);
    $plan = $pStmt->fetch(PDO::FETCH_ASSOC);

    if (!$plan) {
        throw new \Exception('Invalid subscription plan: ' . $planId);
    }

    // Downgrade Prevention: Check if user already holds an active higher plan
    $curStmt = $db->prepare("
        SELECT s.plan_id, p.name AS current_plan_name, p.price_inr, p.sort_order 
        FROM user_subscriptions s
        JOIN subscription_plans p ON s.plan_id = p.id
        WHERE s.user_id = ? AND s.status = 'active' AND (s.expires_at IS NULL OR s.expires_at > NOW())
        ORDER BY p.price_inr DESC LIMIT 1
    ");
    $curStmt->execute([$userId]);
    $currentActive = $curStmt->fetch(PDO::FETCH_ASSOC);

    if ($currentActive) {
        $curPrice = (float)$currentActive['price_inr'];
        $curOrder = (int)($currentActive['sort_order'] ?? 1);
        $newPrice = (float)$plan['price_inr'];
        $newOrder = (int)($plan['sort_order'] ?? 1);

        if ($newPrice < $curPrice || $newOrder < $curOrder) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            Response::error("Downgrading from your active {$currentActive['current_plan_name']} tier is not permitted.", 400);
        }
    }

    $priceInr = (float)$plan['price_inr'];
    $durationDays = (int)$plan['duration_days'];

    // 3. Fetch User Details for Invoice
    $uStmt = $db->prepare("SELECT id, name, email, phone FROM users WHERE id = ? FOR UPDATE");
    $uStmt->execute([$userId]);
    $user = $uStmt->fetch(PDO::FETCH_ASSOC);

    $customerName  = !empty($user['name']) ? $user['name'] : 'Verified Investor ' . $userId;
    $customerEmail = !empty($user['email']) ? $user['email'] : "investor_{$userId}@findaplot.in";
    $customerPhone = !empty($user['phone']) ? $user['phone'] : '+91 94440 00001';

    // 4. Retire any existing active subscriptions for this user
    $retireStmt = $db->prepare("
        UPDATE user_subscriptions 
        SET status = 'upgraded' 
        WHERE user_id = ? AND status = 'active'
    ");
    $retireStmt->execute([$userId]);

    // 5. Insert new active subscription record
    $subIns = $db->prepare("
        INSERT INTO user_subscriptions (
            user_id, plan_id, status, amount_paid, razorpay_order_id,
            razorpay_payment_id, razorpay_signature, starts_at, expires_at
        ) VALUES (
            :uid, :pid, 'active', :amt, :oid, :payid, :sig, NOW(), DATE_ADD(NOW(), INTERVAL :days DAY)
        )
    ");
    $subIns->execute([
        ':uid'   => $userId,
        ':pid'   => $planId,
        ':amt'   => $priceInr,
        ':oid'   => $orderId,
        ':payid' => $paymentId,
        ':sig'   => $signature,
        ':days'  => $durationDays
    ]);
    $subscriptionId = (int)$db->lastInsertId();

    // 6. Update user entitlements with fresh limits & reset counters
    $entUpsert = $db->prepare("
        INSERT INTO user_entitlements (
            user_id, active_subscription_id, plan_id, project_views_used,
            project_view_limit, comparisons_used, comparison_limit,
            advisory_sessions_used, advisory_session_limit, site_visits_used,
            site_visit_limit, has_location_report, has_dedicated_advisor,
            has_priority_advisor, expires_at
        ) VALUES (
            :uid, :subId, :pid, 0, :pvLimit, 0, :cmpLimit, 0, :advLimit, 0, :svLimit,
            :hasLoc, :hasDed, :hasPrio, DATE_ADD(NOW(), INTERVAL :days DAY)
        ) ON DUPLICATE KEY UPDATE
            active_subscription_id = VALUES(active_subscription_id),
            plan_id = VALUES(plan_id),
            project_views_used = 0,
            project_view_limit = VALUES(project_view_limit),
            comparisons_used = 0,
            comparison_limit = VALUES(comparison_limit),
            advisory_sessions_used = 0,
            advisory_session_limit = VALUES(advisory_session_limit),
            site_visits_used = 0,
            site_visit_limit = VALUES(site_visit_limit),
            has_location_report = VALUES(has_location_report),
            has_dedicated_advisor = VALUES(has_dedicated_advisor),
            has_priority_advisor = VALUES(has_priority_advisor),
            expires_at = VALUES(expires_at)
    ");
    $entUpsert->execute([
        ':uid'      => $userId,
        ':subId'    => $subscriptionId,
        ':pid'      => $planId,
        ':pvLimit'  => (int)$plan['project_view_limit'],
        ':cmpLimit' => (int)$plan['comparison_limit'],
        ':advLimit' => (int)$plan['advisory_session_limit'],
        ':svLimit'  => (int)$plan['site_visit_limit'],
        ':hasLoc'   => (int)$plan['has_location_report'],
        ':hasDed'   => (int)$plan['has_dedicated_advisor'],
        ':hasPrio'  => (int)$plan['has_priority_advisor'],
        ':days'     => $durationDays
    ]);

    // 7. Generate Automated GST Tax Invoice
    // Calculation: Total price is inclusive of 18% GST
    // Base = Total / 1.18; GST = Total - Base
    $gstRate = 18.00;
    $baseAmount = round($priceInr / (1 + ($gstRate / 100)), 2);
    $gstAmount  = round($priceInr - $baseAmount, 2);
    $invoiceNumber = 'FAP-INV-' . date('Ymd') . '-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 6));

    $invIns = $db->prepare("
        INSERT INTO subscription_invoices (
            invoice_number, user_id, subscription_id, plan_id, plan_name,
            base_amount, gst_rate, gst_amount, total_amount, sac_code,
            gstin, customer_name, customer_email, customer_phone,
            payment_method, payment_id, status
        ) VALUES (
            :invNum, :uid, :subId, :pid, :pName, :base, :gstRate, :gstAmt,
            :total, '998313', '33AABCF9812K1Z9', :cName, :cEmail, :cPhone,
            'Razorpay Gateway', :payId, 'paid'
        )
    ");
    $invIns->execute([
        ':invNum'  => $invoiceNumber,
        ':uid'     => $userId,
        ':subId'   => $subscriptionId,
        ':pid'     => $planId,
        ':pName'   => $plan['name'],
        ':base'    => $baseAmount,
        ':gstRate' => $gstRate,
        ':gstAmt'  => $gstAmount,
        ':total'   => $priceInr,
        ':cName'   => $customerName,
        ':cEmail'  => $customerEmail,
        ':cPhone'  => $customerPhone,
        ':payId'   => $paymentId
    ]);
    $invoiceId = (int)$db->lastInsertId();

    // 8. Log into wallet transactions audit ledger as well
    $txnIns = $db->prepare("
        INSERT INTO wallet_transactions (
            user_id, transaction_type, points, amount_rupees, description, status, created_at
        ) VALUES (
            ?, 'membership_purchase', 0, ?, ?, 'success', NOW()
        )
    ");
    $txnIns->execute([
        $userId,
        $priceInr,
        "Purchased {$plan['name']} Membership ({$durationDays} Days) via Razorpay [Txn: {$paymentId}]"
    ]);

    $db->commit();

    Response::success([
        'subscriptionId' => $subscriptionId,
        'planId'         => $planId,
        'planName'       => $plan['name'],
        'amountPaid'     => $priceInr,
        'paymentId'      => $paymentId,
        'invoiceNumber'  => $invoiceNumber,
        'invoiceId'      => $invoiceId,
        'expiresAt'      => date('Y-m-d H:i:s', strtotime("+{$durationDays} days")),
        'entitlements'   => [
            'projectViewLimit'     => (int)$plan['project_view_limit'],
            'comparisonLimit'      => (int)$plan['comparison_limit'],
            'advisorySessionLimit' => (int)$plan['advisory_session_limit'],
            'siteVisitLimit'       => (int)$plan['site_visit_limit'],
            'hasLocationReport'    => (bool)$plan['has_location_report'],
            'hasDedicatedAdvisor'  => (bool)$plan['has_dedicated_advisor'],
            'hasPriorityAdvisor'   => (bool)$plan['has_priority_advisor']
        ]
    ], "Payment verified successfully. You are now subscribed to {$plan['name']}!");

} catch (\Throwable $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    error_log("Payment verification error: " . $e->getMessage());
    $code = ($e->getCode() >= 400 && $e->getCode() < 600) ? (int)$e->getCode() : 400;
    Response::error('Payment verification failed: ' . $e->getMessage(), $code);
}

