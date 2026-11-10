<?php
/**
 * GET /api/subscriptions/current.php
 * Returns user's active subscription, real-time entitlement balances, and recent invoices.
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

use Mannidam\Config\Database;
use Mannidam\Helpers\Response;

Response::initCors();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    Response::error('Method not allowed', 405);
}

$userId = max(1, (int)($_GET['userId'] ?? 1));
$db = (new Database())->getConnection();

try {
    // 1. Fetch user active subscription
    $subStmt = $db->prepare("
        SELECT 
            s.id,
            s.user_id AS userId,
            s.plan_id AS planId,
            s.status,
            s.amount_paid AS amountPaid,
            s.razorpay_order_id AS razorpayOrderId,
            s.razorpay_payment_id AS razorpayPaymentId,
            s.starts_at AS startsAt,
            s.expires_at AS expiresAt,
            s.created_at AS createdAt,
            p.name AS planName,
            p.badge_text AS badgeText,
            p.duration_days AS durationDays
        FROM user_subscriptions s
        JOIN subscription_plans p ON s.plan_id = p.id
        WHERE s.user_id = ? AND s.status = 'active' AND s.expires_at > NOW()
        ORDER BY s.id DESC
        LIMIT 1
    ");
    $subStmt->execute([$userId]);
    $activeSub = $subStmt->fetch(PDO::FETCH_ASSOC);

    // 2. Fetch or initialize user entitlements
    $entStmt = $db->prepare("
        SELECT 
            e.id,
            e.user_id AS userId,
            e.active_subscription_id AS activeSubscriptionId,
            e.plan_id AS planId,
            e.project_views_used AS projectViewsUsed,
            e.project_view_limit AS projectViewLimit,
            e.comparisons_used AS comparisonsUsed,
            e.comparison_limit AS comparisonLimit,
            e.advisory_sessions_used AS advisorySessionsUsed,
            e.advisory_session_limit AS advisorySessionLimit,
            e.site_visits_used AS siteVisitsUsed,
            e.site_visit_limit AS siteVisitLimit,
            e.has_location_report AS hasLocationReport,
            e.has_dedicated_advisor AS hasDedicatedAdvisor,
            e.has_priority_advisor AS hasPriorityAdvisor,
            e.expires_at AS expiresAt,
            p.name AS planName
        FROM user_entitlements e
        LEFT JOIN subscription_plans p ON e.plan_id = p.id
        WHERE e.user_id = ?
        LIMIT 1
    ");
    $entStmt->execute([$userId]);
    $entitlement = $entStmt->fetch(PDO::FETCH_ASSOC);

    if (!$entitlement) {
        // Create baseline explorer entitlement
        $ins = $db->prepare("
            INSERT INTO user_entitlements (
                user_id, plan_id, project_views_used, project_view_limit,
                comparisons_used, comparison_limit, advisory_sessions_used,
                advisory_session_limit, site_visits_used, site_visit_limit,
                has_location_report, has_dedicated_advisor, has_priority_advisor,
                expires_at
            ) VALUES (
                ?, 'explorer', 0, 2, 0, 1, 0, 1, 0, 0, 0, 0, 0, DATE_ADD(NOW(), INTERVAL 365 DAY)
            )
        ");
        $ins->execute([$userId]);

        $entStmt->execute([$userId]);
        $entitlement = $entStmt->fetch(PDO::FETCH_ASSOC);
    }

    // 3. Unique Project Views count & list
    $viewsStmt = $db->prepare("
        SELECT property_id, viewed_at 
        FROM user_project_views 
        WHERE user_id = ? 
        ORDER BY viewed_at DESC
    ");
    $viewsStmt->execute([$userId]);
    $unlockedProjectViews = $viewsStmt->fetchAll(PDO::FETCH_ASSOC);

    // 4. Invoices
    $invStmt = $db->prepare("
        SELECT 
            id,
            invoice_number AS invoiceNumber,
            plan_id AS planId,
            plan_name AS planName,
            base_amount AS baseAmount,
            gst_rate AS gstRate,
            gst_amount AS gstAmount,
            total_amount AS totalAmount,
            sac_code AS sacCode,
            gstin,
            payment_method AS paymentMethod,
            payment_id AS paymentId,
            status,
            created_at AS createdAt
        FROM subscription_invoices
        WHERE user_id = ?
        ORDER BY id DESC
        LIMIT 20
    ");
    $invStmt->execute([$userId]);
    $invoices = $invStmt->fetchAll(PDO::FETCH_ASSOC);

    $daysRemaining = 0;
    if ($activeSub && !empty($activeSub['expiresAt'])) {
        $diff = strtotime($activeSub['expiresAt']) - time();
        $daysRemaining = max(0, (int)ceil($diff / 86400));
    }

    Response::success([
        'hasActiveSubscription' => !empty($activeSub),
        'subscription'          => $activeSub ?: null,
        'daysRemaining'         => $daysRemaining,
        'entitlements'          => [
            'planId'               => $entitlement['planId'] ?? 'explorer',
            'planName'             => $entitlement['planName'] ?? 'Explorer',
            'projectViewsUsed'     => (int)($entitlement['projectViewsUsed'] ?? 0),
            'projectViewLimit'     => (int)($entitlement['projectViewLimit'] ?? 2),
            'projectViewsRemaining'=> max(0, (int)($entitlement['projectViewLimit'] ?? 2) - (int)($entitlement['projectViewsUsed'] ?? 0)),
            'comparisonsUsed'      => (int)($entitlement['comparisonsUsed'] ?? 0),
            'comparisonLimit'      => (int)($entitlement['comparisonLimit'] ?? 1),
            'comparisonsRemaining' => max(0, (int)($entitlement['comparisonLimit'] ?? 1) - (int)($entitlement['comparisonsUsed'] ?? 0)),
            'advisorySessionsUsed' => (int)($entitlement['advisorySessionsUsed'] ?? 0),
            'advisorySessionLimit' => (int)($entitlement['advisorySessionLimit'] ?? 1),
            'advisorySessionsRemaining' => max(0, (int)($entitlement['advisorySessionLimit'] ?? 1) - (int)($entitlement['advisorySessionsUsed'] ?? 0)),
            'siteVisitsUsed'       => (int)($entitlement['siteVisitsUsed'] ?? 0),
            'siteVisitLimit'       => (int)($entitlement['siteVisitLimit'] ?? 0),
            'siteVisitsRemaining'  => max(0, (int)($entitlement['siteVisitLimit'] ?? 0) - (int)($entitlement['siteVisitsUsed'] ?? 0)),
            'hasLocationReport'    => (bool)($entitlement['hasLocationReport'] ?? false),
            'hasDedicatedAdvisor'  => (bool)($entitlement['hasDedicatedAdvisor'] ?? false),
            'hasPriorityAdvisor'   => (bool)($entitlement['hasPriorityAdvisor'] ?? false),
            'expiresAt'            => $entitlement['expiresAt'] ?? null
        ],
        'unlockedProjectIds'    => array_column($unlockedProjectViews, 'property_id'),
        'invoices'             => $invoices
    ], 'Current subscription and entitlements retrieved successfully');
} catch (\Throwable $e) {
    Response::error('Failed to retrieve current subscription: ' . $e->getMessage(), 500);
}

