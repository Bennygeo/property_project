<?php
/**
 * /api/admin/subscription-plans.php
 * Super Administrator Subscription Plans & Entitlements Customization Engine.
 * Allows Super Admin to view, update, configure limits, pricing, and feature bullets
 * for all membership subscription plans in MySQL.
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

use Mannidam\Config\Database;
use Mannidam\Helpers\Response;

Response::initCors();

$method = $_SERVER['REQUEST_METHOD'];
$db = (new Database())->getConnection();

// -----------------------------------------------------------------------------
// GET: Fetch All Subscription Plans (with active subscriber stats)
// -----------------------------------------------------------------------------
if ($method === 'GET') {
    try {
        $stmt = $db->query("
            SELECT 
                p.id,
                p.name,
                p.badge_text AS badgeText,
                p.price_inr AS priceInr,
                p.duration_days AS durationDays,
                p.project_view_limit AS projectViewLimit,
                p.comparison_limit AS comparisonLimit,
                p.advisory_session_limit AS advisorySessionLimit,
                p.site_visit_limit AS siteVisitLimit,
                p.has_location_report AS hasLocationReport,
                p.has_dedicated_advisor AS hasDedicatedAdvisor,
                p.has_priority_advisor AS hasPriorityAdvisor,
                p.description,
                p.features_json AS featuresJson,
                p.is_active AS isActive,
                p.sort_order AS sortOrder,
                p.created_at AS createdAt,
                (
                    SELECT COUNT(*) 
                    FROM user_subscriptions s 
                    WHERE s.plan_id = p.id AND s.status = 'active'
                ) AS activeSubscribers,
                (
                    SELECT COALESCE(SUM(s.amount_paid), 0)
                    FROM user_subscriptions s
                    WHERE s.plan_id = p.id AND s.status = 'active'
                ) AS totalRevenueInr
            FROM subscription_plans p
            ORDER BY p.sort_order ASC
        ");

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $plans = array_map(function ($plan) {
            $features = json_decode($plan['featuresJson'] ?? '[]', true) ?: [];
            return [
                'id'                   => (string)$plan['id'],
                'name'                 => (string)$plan['name'],
                'badgeText'            => $plan['badgeText'] ? (string)$plan['badgeText'] : null,
                'priceInr'             => (float)$plan['priceInr'],
                'durationDays'         => (int)$plan['durationDays'],
                'projectViewLimit'     => (int)$plan['projectViewLimit'],
                'comparisonLimit'      => (int)$plan['comparisonLimit'],
                'advisorySessionLimit' => (int)$plan['advisorySessionLimit'],
                'siteVisitLimit'       => (int)$plan['siteVisitLimit'],
                'hasLocationReport'    => (bool)$plan['hasLocationReport'],
                'hasDedicatedAdvisor'  => (bool)$plan['hasDedicatedAdvisor'],
                'hasPriorityAdvisor'   => (bool)$plan['hasPriorityAdvisor'],
                'description'          => (string)($plan['description'] ?? ''),
                'features'             => $features,
                'isActive'             => (bool)$plan['isActive'],
                'sortOrder'            => (int)$plan['sortOrder'],
                'activeSubscribers'    => (int)$plan['activeSubscribers'],
                'totalRevenueInr'      => (float)$plan['totalRevenueInr'],
                'createdAt'            => $plan['createdAt']
            ];
        }, $rows);

        Response::success([
            'plans' => $plans,
            'count' => count($plans)
        ], 'All subscription plans retrieved successfully');
    } catch (\Throwable $e) {
        Response::error('Failed to load plans: ' . $e->getMessage(), 500);
    }
}

// -----------------------------------------------------------------------------
// POST / PUT: Update or Create a Subscription Plan
// -----------------------------------------------------------------------------
if ($method === 'POST' || $method === 'PUT') {
    $input = Response::getJsonInput();
    if (empty($input)) {
        $input = $_POST;
    }

    $planId = trim((string)($input['id'] ?? ''));
    if (empty($planId)) {
        Response::error('Plan ID is required', 422);
    }

    $name = trim((string)($input['name'] ?? ''));
    if (empty($name)) {
        Response::error('Plan name is required', 422);
    }

    $badgeText = isset($input['badgeText']) && trim((string)$input['badgeText']) !== '' ? trim((string)$input['badgeText']) : null;
    $priceInr = max(0.0, (float)($input['priceInr'] ?? 0));
    $durationDays = max(1, (int)($input['durationDays'] ?? 30));
    $projectViewLimit = max(0, (int)($input['projectViewLimit'] ?? 0));
    $comparisonLimit = max(0, (int)($input['comparisonLimit'] ?? 0));
    $advisorySessionLimit = max(0, (int)($input['advisorySessionLimit'] ?? 0));
    $siteVisitLimit = max(0, (int)($input['siteVisitLimit'] ?? 0));
    $hasLocationReport = !empty($input['hasLocationReport']) ? 1 : 0;
    $hasDedicatedAdvisor = !empty($input['hasDedicatedAdvisor']) ? 1 : 0;
    $hasPriorityAdvisor = !empty($input['hasPriorityAdvisor']) ? 1 : 0;
    $description = trim((string)($input['description'] ?? ''));
    $isActive = isset($input['isActive']) ? (!empty($input['isActive']) ? 1 : 0) : 1;
    $sortOrder = (int)($input['sortOrder'] ?? 1);

    // Features array
    $features = $input['features'] ?? [];
    if (!is_array($features)) {
        $features = [];
    }
    // Filter and sanitize feature bullet strings
    $cleanFeatures = [];
    foreach ($features as $f) {
        $fStr = trim((string)$f);
        if ($fStr !== '') {
            $cleanFeatures[] = $fStr;
        }
    }
    $featuresJson = json_encode($cleanFeatures, JSON_UNESCAPED_UNICODE);

    try {
        // Upsert into subscription_plans
        $stmt = $db->prepare("
            INSERT INTO subscription_plans (
                id,
                name,
                badge_text,
                price_inr,
                duration_days,
                project_view_limit,
                comparison_limit,
                advisory_session_limit,
                site_visit_limit,
                has_location_report,
                has_dedicated_advisor,
                has_priority_advisor,
                description,
                features_json,
                is_active,
                sort_order
            ) VALUES (
                :id,
                :name,
                :badge_text,
                :price_inr,
                :duration_days,
                :project_view_limit,
                :comparison_limit,
                :advisory_session_limit,
                :site_visit_limit,
                :has_location_report,
                :has_dedicated_advisor,
                :has_priority_advisor,
                :description,
                :features_json,
                :is_active,
                :sort_order
            )
            ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                badge_text = VALUES(badge_text),
                price_inr = VALUES(price_inr),
                duration_days = VALUES(duration_days),
                project_view_limit = VALUES(project_view_limit),
                comparison_limit = VALUES(comparison_limit),
                advisory_session_limit = VALUES(advisory_session_limit),
                site_visit_limit = VALUES(site_visit_limit),
                has_location_report = VALUES(has_location_report),
                has_dedicated_advisor = VALUES(has_dedicated_advisor),
                has_priority_advisor = VALUES(has_priority_advisor),
                description = VALUES(description),
                features_json = VALUES(features_json),
                is_active = VALUES(is_active),
                sort_order = VALUES(sort_order)
        ");

        $stmt->execute([
            ':id'                     => $planId,
            ':name'                   => $name,
            ':badge_text'             => $badgeText,
            ':price_inr'              => $priceInr,
            ':duration_days'          => $durationDays,
            ':project_view_limit'     => $projectViewLimit,
            ':comparison_limit'       => $comparisonLimit,
            ':advisory_session_limit' => $advisorySessionLimit,
            ':site_visit_limit'       => $siteVisitLimit,
            ':has_location_report'    => $hasLocationReport,
            ':has_dedicated_advisor'  => $hasDedicatedAdvisor,
            ':has_priority_advisor'   => $hasPriorityAdvisor,
            ':description'            => $description,
            ':features_json'          => $featuresJson,
            ':is_active'              => $isActive,
            ':sort_order'             => $sortOrder
        ]);

        Response::success([
            'plan' => [
                'id'                   => $planId,
                'name'                 => $name,
                'badgeText'            => $badgeText,
                'priceInr'             => $priceInr,
                'durationDays'         => $durationDays,
                'projectViewLimit'     => $projectViewLimit,
                'comparisonLimit'      => $comparisonLimit,
                'advisorySessionLimit' => $advisorySessionLimit,
                'siteVisitLimit'       => $siteVisitLimit,
                'hasLocationReport'    => (bool)$hasLocationReport,
                'hasDedicatedAdvisor'  => (bool)$hasDedicatedAdvisor,
                'hasPriorityAdvisor'   => (bool)$hasPriorityAdvisor,
                'description'          => $description,
                'features'             => $cleanFeatures,
                'isActive'             => (bool)$isActive,
                'sortOrder'            => $sortOrder
            ]
        ], 'Subscription plan updated successfully');
    } catch (\Throwable $e) {
        Response::error('Failed to save plan: ' . $e->getMessage(), 500);
    }
}

// -----------------------------------------------------------------------------
// DELETE / TOGGLE: Deactivate Plan
// -----------------------------------------------------------------------------
if ($method === 'DELETE') {
    $planId = trim((string)($_GET['id'] ?? ''));
    if (empty($planId)) {
        Response::error('Plan ID is required', 422);
    }

    try {
        // Toggle or deactivate
        $stmt = $db->prepare("UPDATE subscription_plans SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?");
        $stmt->execute([$planId]);

        Response::success(['id' => $planId], 'Plan status toggled successfully');
    } catch (\Throwable $e) {
        Response::error('Failed to toggle plan: ' . $e->getMessage(), 500);
    }
}

Response::error('Method not allowed', 405);

