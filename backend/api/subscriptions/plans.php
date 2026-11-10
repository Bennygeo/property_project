<?php
/**
 * GET /api/subscriptions/plans.php
 * Returns active 4-tier membership subscription plans from MySQL.
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

$db = (new Database())->getConnection();

try {
    $stmt = $db->query("
        SELECT 
            id,
            name,
            badge_text AS badgeText,
            price_inr AS priceInr,
            duration_days AS durationDays,
            project_view_limit AS projectViewLimit,
            comparison_limit AS comparisonLimit,
            advisory_session_limit AS advisorySessionLimit,
            site_visit_limit AS siteVisitLimit,
            has_location_report AS hasLocationReport,
            has_dedicated_advisor AS hasDedicatedAdvisor,
            has_priority_advisor AS hasPriorityAdvisor,
            description,
            features_json AS featuresJson,
            sort_order AS sortOrder
        FROM subscription_plans
        WHERE is_active = 1
        ORDER BY sort_order ASC
    ");
    $plans = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $formatted = array_map(function ($plan) {
        $features = json_decode($plan['featuresJson'] ?? '[]', true) ?: [];
        return [
            'id'                   => (string)$plan['id'],
            'name'                 => (string)$plan['name'],
            'badgeText'            => $plan['badgeText'],
            'priceInr'             => (float)$plan['priceInr'],
            'durationDays'         => (int)$plan['durationDays'],
            'projectViewLimit'     => (int)$plan['projectViewLimit'],
            'comparisonLimit'      => (int)$plan['comparisonLimit'],
            'advisorySessionLimit' => (int)$plan['advisorySessionLimit'],
            'siteVisitLimit'       => (int)$plan['siteVisitLimit'],
            'hasLocationReport'    => (bool)$plan['hasLocationReport'],
            'hasDedicatedAdvisor'  => (bool)$plan['hasDedicatedAdvisor'],
            'hasPriorityAdvisor'   => (bool)$plan['hasPriorityAdvisor'],
            'description'          => (string)$plan['description'],
            'features'             => $features,
            'sortOrder'            => (int)$plan['sortOrder']
        ];
    }, $plans);

    Response::success([
        'plans' => $formatted,
        'count' => count($formatted)
    ], 'Subscription plans retrieved successfully');
} catch (\Throwable $e) {
    Response::error('Failed to retrieve subscription plans: ' . $e->getMessage(), 500);
}

