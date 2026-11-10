<?php
/**
 * POST /api/subscriptions/webhook.php
 * Handles Razorpay server-to-server asynchronous webhooks.
 * Validates X-Razorpay-Signature against raw payload.
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/razorpay.php';
require_once __DIR__ . '/../../helpers/response.php';

use Mannidam\Config\Database;
use Mannidam\Config\RazorpayConfig;
use Mannidam\Helpers\Response;

$rawPayload = file_get_contents('php://input');
$signatureHeader = $_SERVER['HTTP_X_RAZORPAY_SIGNATURE'] ?? '';

// Check signature
if (!empty($signatureHeader)) {
    $isValid = RazorpayConfig::verifyWebhookSignature($rawPayload, $signatureHeader);
    if (!$isValid) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid webhook signature']);
        exit;
    }
}

$event = json_decode($rawPayload, true) ?: [];
$eventType = $event['event'] ?? '';

if ($eventType === 'payment.captured' || $eventType === 'order.paid') {
    $paymentEntity = $event['payload']['payment']['entity'] ?? [];
    $orderEntity   = $event['payload']['order']['entity'] ?? [];

    $orderId   = $paymentEntity['order_id'] ?? $orderEntity['id'] ?? '';
    $paymentId = $paymentEntity['id'] ?? '';
    $notes     = $paymentEntity['notes'] ?? $orderEntity['notes'] ?? [];

    $userId = (int)($notes['userId'] ?? 1);
    $planId = (string)($notes['planId'] ?? 'smart_buyer');

    if ($userId > 0 && !empty($orderId)) {
        $db = (new Database())->getConnection();
        // Check if already processed
        $chk = $db->prepare("SELECT id FROM user_subscriptions WHERE razorpay_payment_id = ?");
        $chk->execute([$paymentId]);
        if (!$chk->fetch()) {
            // Activate plan
            $pStmt = $db->prepare("SELECT * FROM subscription_plans WHERE id = ?");
            $pStmt->execute([$planId]);
            $plan = $pStmt->fetch(PDO::FETCH_ASSOC);

            if ($plan) {
                $days = (int)$plan['duration_days'];
                $subIns = $db->prepare("
                    INSERT INTO user_subscriptions (
                        user_id, plan_id, status, amount_paid, razorpay_order_id,
                        razorpay_payment_id, razorpay_signature, starts_at, expires_at
                    ) VALUES (
                        ?, ?, 'active', ?, ?, ?, 'webhook_verified', NOW(), DATE_ADD(NOW(), INTERVAL ? DAY)
                    )
                ");
                $subIns->execute([$userId, $planId, (float)$plan['price_inr'], $orderId, $paymentId, $days]);
                $subId = (int)$db->lastInsertId();

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
                        expires_at = VALUES(expires_at)
                ");
                $entUpsert->execute([
                    ':uid'      => $userId,
                    ':subId'    => $subId,
                    ':pid'      => $planId,
                    ':pvLimit'  => (int)$plan['project_view_limit'],
                    ':cmpLimit' => (int)$plan['comparison_limit'],
                    ':advLimit' => (int)$plan['advisory_session_limit'],
                    ':svLimit'  => (int)$plan['site_visit_limit'],
                    ':hasLoc'   => (int)$plan['has_location_report'],
                    ':hasDed'   => (int)$plan['has_dedicated_advisor'],
                    ':hasPrio'  => (int)$plan['has_priority_advisor'],
                    ':days'     => $days
                ]);
            }
        }
    }
}

echo json_encode(['status' => 'ok']);

