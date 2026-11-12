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

$defaultPlans = [
    [
        'id'                   => 'explorer',
        'name'                 => 'Explorer',
        'badgeText'            => 'Free Forever',
        'priceInr'             => 0.0,
        'durationDays'         => 365,
        'projectViewLimit'     => 2,
        'comparisonLimit'      => 1,
        'advisorySessionLimit' => 1,
        'siteVisitLimit'       => 0,
        'hasLocationReport'    => false,
        'hasDedicatedAdvisor'  => false,
        'hasPriorityAdvisor'   => false,
        'description'          => 'Ideal for initial discovery of plotted developments, layouts and emerging locations across Tamil Nadu.',
        'features'             => [
            '2 Detailed Project Views',
            '1 Side-by-Side Comparison',
            '1 Intro Advisory Session',
            'Direct SRO Regulatory Checklist',
            'Community Support'
        ],
        'sortOrder'            => 1
    ],
    [
        'id'                   => 'smart_buyer',
        'name'                 => 'Smart Buyer',
        'badgeText'            => 'Most Popular',
        'priceInr'             => 750.0,
        'durationDays'         => 30,
        'projectViewLimit'     => 5,
        'comparisonLimit'      => 3,
        'advisorySessionLimit' => 2,
        'siteVisitLimit'       => 0,
        'hasLocationReport'    => true,
        'hasDedicatedAdvisor'  => false,
        'hasPriorityAdvisor'   => false,
        'description'          => 'For active buyers shortlisting plots in high-growth corridors with location intelligence.',
        'features'             => [
            '5 Detailed Project Views',
            '3 Side-by-Side Comparisons',
            '2 Advisory Sessions',
            'Location & Corridor Growth Report',
            'RERA Document Verification Extract',
            'WhatsApp Concierge Desk'
        ],
        'sortOrder'            => 2
    ],
    [
        'id'                   => 'priority_buyer',
        'name'                 => 'Priority Buyer',
        'badgeText'            => 'Best Value',
        'priceInr'             => 7500.0,
        'durationDays'         => 60,
        'projectViewLimit'     => 25,
        'comparisonLimit'      => 10,
        'advisorySessionLimit' => 4,
        'siteVisitLimit'       => 1,
        'hasLocationReport'    => true,
        'hasDedicatedAdvisor'  => true,
        'hasPriorityAdvisor'   => false,
        'description'          => 'Comprehensive advisory with dedicated expert and field visit coordination.',
        'features'             => [
            '25 Detailed Project Views',
            '10 Side-by-Side Comparisons',
            '4 Comprehensive Advisory Sessions',
            '1 Chauffeured Physical Site Visit',
            'Dedicated Property Advisor',
            'Patta & Cadastral Verification Dossier',
            'Land Appreciation Intelligence'
        ],
        'sortOrder'            => 3
    ],
    [
        'id'                   => 'vip_concierge',
        'name'                 => 'VIP Concierge',
        'badgeText'            => 'Executive',
        'priceInr'             => 20000.0,
        'durationDays'         => 90,
        'projectViewLimit'     => 50,
        'comparisonLimit'      => 20,
        'advisorySessionLimit' => 8,
        'siteVisitLimit'       => 3,
        'hasLocationReport'    => true,
        'hasDedicatedAdvisor'  => true,
        'hasPriorityAdvisor'   => true,
        'description'          => 'White-glove advisory, multiple site visits and legal title clearance for high-net-worth investors.',
        'features'             => [
            '50 Detailed Project Views',
            '20 Side-by-Side Comparisons',
            '8 In-Depth Advisory Sessions',
            '3 Chauffeured Physical Site Visits',
            'Priority Advisory Partner (Direct Line)',
            'Full Legal & SRO Title Check Assistance',
            'Custom Layout & Subdivision Analysis',
            'Negotiation & Booking Escort'
        ],
        'sortOrder'            => 4
    ]
];

try {
    $db = (new Database())->getConnection();
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
    $plans = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];

    if (!empty($plans)) {
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
    }
} catch (\Throwable $e) {
    error_log("Subscription plans db error: " . $e->getMessage());
}

// Fallback to static default plans if db table is missing or empty
Response::success([
    'plans' => $defaultPlans,
    'count' => count($defaultPlans)
], 'Subscription plans retrieved successfully (fallback default)');

