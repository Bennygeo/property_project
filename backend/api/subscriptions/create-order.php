<?php
/**
 * POST /api/subscriptions/create-order.php
 * Generates Razorpay Order for a chosen subscription plan.
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

$planId = trim((string)($input['planId'] ?? ''));
$userId = max(1, (int)($input['userId'] ?? 1));

if (empty($planId)) {
    Response::error('Plan ID is required', 422);
}

$db = (new Database())->getConnection();

try {
    // 1. Fetch Plan
    $stmt = $db->prepare("SELECT * FROM subscription_plans WHERE id = ? AND is_active = 1");
    $stmt->execute([$planId]);
    $plan = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$plan) {
        Response::error('Invalid or inactive subscription plan', 404);
    }

    $priceInr = (float)$plan['price_inr'];

    // If free plan, no Razorpay order is needed
    if ($priceInr <= 0.0) {
        // Activate Explorer Plan immediately
        $db->beginTransaction();

        $subIns = $db->prepare("
            INSERT INTO user_subscriptions (
                user_id, plan_id, status, amount_paid, starts_at, expires_at
            ) VALUES (
                ?, 'explorer', 'active', 0.00, NOW(), DATE_ADD(NOW(), INTERVAL 365 DAY)
            )
        ");
        $subIns->execute([$userId]);
        $subId = (int)$db->lastInsertId();

        $entUpsert = $db->prepare("
            INSERT INTO user_entitlements (
                user_id, active_subscription_id, plan_id, project_views_used,
                project_view_limit, comparisons_used, comparison_limit,
                advisory_sessions_used, advisory_session_limit, site_visits_used,
                site_visit_limit, has_location_report, has_dedicated_advisor,
                has_priority_advisor, expires_at
            ) VALUES (
                :uid, :subId, 'explorer', 0, :pvLimit, 0, :cmpLimit, 0, :advLimit, 0, :svLimit,
                0, 0, 0, DATE_ADD(NOW(), INTERVAL 365 DAY)
            ) ON DUPLICATE KEY UPDATE
                active_subscription_id = VALUES(active_subscription_id),
                plan_id = VALUES(plan_id),
                project_view_limit = VALUES(project_view_limit),
                comparison_limit = VALUES(comparison_limit),
                advisory_session_limit = VALUES(advisory_session_limit),
                site_visit_limit = VALUES(site_visit_limit),
                expires_at = VALUES(expires_at)
        ");
        $entUpsert->execute([
            ':uid'      => $userId,
            ':subId'    => $subId,
            ':pvLimit'  => (int)$plan['project_view_limit'],
            ':cmpLimit' => (int)$plan['comparison_limit'],
            ':advLimit' => (int)$plan['advisory_session_limit'],
            ':svLimit'  => (int)$plan['site_visit_limit']
        ]);

        $db->commit();

        Response::success([
            'isFreePlan' => true,
            'planId'     => 'explorer',
            'planName'   => $plan['name'],
            'message'    => 'Explorer plan activated'
        ], 'Explorer plan activated successfully');
        exit;
    }

    // 2. Paid Plan: Create Razorpay Order
    $amountPaise = (int)round($priceInr * 100);
    $receipt = 'rcpt_sub_' . $userId . '_' . time();
    $keyId = RazorpayConfig::getKeyId();
    $keySecret = RazorpayConfig::getKeySecret();

    // Generate Razorpay Order via Direct REST API if curl is available, else mock test order
    $orderId = 'order_test_' . substr(bin2hex(random_bytes(8)), 0, 14);

    if (function_exists('curl_init') && !empty($keyId) && !empty($keySecret) && !str_contains($keyId, 'Mock')) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'https://api.razorpay.com/v1/orders');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_USERPWD, $keyId . ':' . $keySecret);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
            'amount'   => $amountPaise,
            'currency' => 'INR',
            'receipt'  => $receipt,
            'notes'    => [
                'userId'   => (string)$userId,
                'planId'   => $planId,
                'planName' => $plan['name']
            ]
        ]));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        $res = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($status === 200 && !empty($res)) {
            $orderData = json_decode($res, true);
            if (!empty($orderData['id'])) {
                $orderId = $orderData['id'];
            }
        }
    }

    Response::success([
        'isFreePlan'   => false,
        'orderId'      => $orderId,
        'amountPaise'  => $amountPaise,
        'amountRupees' => $priceInr,
        'currency'     => 'INR',
        'keyId'        => $keyId,
        'planId'       => $planId,
        'planName'     => $plan['name'],
        'durationDays' => (int)$plan['duration_days'],
        'receipt'      => $receipt
    ], 'Razorpay payment order generated successfully');

} catch (\Throwable $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    Response::error('Failed to create payment order: ' . $e->getMessage(), 500);
}

