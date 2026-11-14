<?php
/**
 * GET /api/properties/check-limit.php?id={id}&userId={userId}&deviceHash={deviceHash}
 * Pre-flight entitlement and view quota verification.
 * Checks whether the user is authorized to download full property details
 * BEFORE details.php is ever queried or downloaded from the database.
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/settings.php';

use Mannidam\Config\Database;
use Mannidam\Helpers\Response;
use Mannidam\Helpers\Settings;

Response::initCors();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    Response::error('Method not allowed', 405);
}

$id = trim((string)($_GET['id'] ?? ''));
if (empty($id)) {
    Response::error('Property / Project ID is required', 400);
}

$userId = isset($_GET['userId']) ? max(0, (int)$_GET['userId']) : 0;
$deviceHash = trim((string)($_GET['deviceHash'] ?? ''));

function resolveClientIp(): string {
    $headers = ['HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_CLIENT_IP', 'REMOTE_ADDR'];
    foreach ($headers as $header) {
        if (!empty($_SERVER[$header])) {
            $parts = explode(',', (string)$_SERVER[$header]);
            $ip = trim($parts[0]);
            if (filter_var($ip, FILTER_VALIDATE_IP)) {
                return $ip;
            }
        }
    }
    return (string)($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');
}

$clientIp = resolveClientIp();
$db = (new Database())->getConnection();

// Quick existence check and basic info on projects (WITHOUT joining project_details)
$projCheck = $db->prepare("
    SELECT project_id, project_name, city, district, locality, type, price_from, price_to, sqft_rate, min_plot_size, max_plot_size, cover_image 
    FROM projects 
    WHERE project_id = ? 
    LIMIT 1
");
$projCheck->execute([$id]);
$projectRow = $projCheck->fetch(PDO::FETCH_ASSOC);

if (!$projectRow) {
    Response::error('Property dossier not found in registry', 404);
}

function formatBasicAmount(float $num): string {
    if ($num <= 0) return '';
    if ($num >= 10000000) {
        $cr = $num / 10000000;
        return '₹ ' . (round($cr, 2) == round($cr, 0) ? number_format($cr, 0) : number_format($cr, 2)) . ' Cr';
    }
    if ($num >= 100000) {
        $lakhs = $num / 100000;
        $val = round($lakhs, 2);
        return '₹ ' . ($val == round($lakhs, 0) ? number_format($val, 0) : number_format($val, 2)) . ' L';
    }
    return '₹ ' . number_format($num);
}

$priceFrom = (float)($projectRow['price_from'] ?? 0);
$sqftRate = (float)($projectRow['sqft_rate'] ?? 0);
$minPlot = (int)($projectRow['min_plot_size'] ?? 800);
if ($priceFrom < 100000 && $sqftRate > 0) {
    $priceFrom = $sqftRate * $minPlot;
}
$basicPrice = $priceFrom > 0 ? ('Starting ' . formatBasicAmount($priceFrom)) : 'Price on Request';
$basicCover = (!empty($projectRow['cover_image']) && str_starts_with($projectRow['cover_image'], 'http'))
    ? $projectRow['cover_image']
    : 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80';

$basicProperty = [
    'id'               => $projectRow['project_id'],
    'title'            => $projectRow['project_name'],
    'locality'         => $projectRow['locality'] ?? '',
    'city'             => $projectRow['city'] ?? '',
    'district'         => $projectRow['district'] ?? '',
    'state'            => 'Tamil Nadu',
    'propertyType'     => $projectRow['type'] ?: 'Gated CMDA Plots',
    'price'            => $basicPrice,
    'pricePerSqFt'     => $sqftRate > 0 ? ('₹ ' . number_format($sqftRate, 0) . ' / sq.ft') : '',
    'imageUrl'         => $basicCover,
    'coverImage'       => $basicCover,
    'freePhotos'       => [$basicCover],
    'isViewRestricted' => true,
    'isMasked'         => true
];

$canDownload = true;
$limitReached = false;
$isAlreadyUnlocked = false;
$activePlanId = 'explorer';
$activePlanName = 'Free Explorer';
$projectViewsUsed = 0;
$projectViewLimit = 2;
$upgradeMessage = '';

if ($userId > 0) {
    // Authenticated user check
    $entStmt = $db->prepare("SELECT * FROM user_entitlements WHERE user_id = ? LIMIT 1");
    $entStmt->execute([$userId]);
    $ent = $entStmt->fetch(PDO::FETCH_ASSOC);

    if (!$ent) {
        $ins = $db->prepare("
            INSERT INTO user_entitlements (
                user_id, plan_id, project_views_used, project_view_limit,
                comparisons_used, comparison_limit, advisory_sessions_used,
                advisory_session_limit, site_visits_used, site_visit_limit,
                expires_at
            ) VALUES (
                ?, 'explorer', 0, 2, 0, 1, 0, 1, 0, 0, DATE_ADD(NOW(), INTERVAL 365 DAY)
            )
        ");
        $ins->execute([$userId]);
        $entStmt->execute([$userId]);
        $ent = $entStmt->fetch(PDO::FETCH_ASSOC);
    }

    $activePlanId = (string)($ent['plan_id'] ?? 'explorer');
    $planNameMap = [
        'explorer'       => 'Free Explorer',
        'smart_buyer'    => 'Smart Buyer',
        'priority_buyer' => 'Priority Buyer',
        'vip_concierge'  => 'VIP Concierge'
    ];
    $activePlanName = $planNameMap[$activePlanId] ?? ucfirst($activePlanId);

    $planLimitsMap = [
        'explorer'       => 2,
        'smart_buyer'    => 5,
        'priority_buyer' => 25,
        'vip_concierge'  => 50
    ];
    $projectViewLimit = $planLimitsMap[$activePlanId] ?? (int)($ent['project_view_limit'] ?: 2);
    $projectViewsUsed = (int)($ent['project_views_used'] ?? 0);

    // Check if user has already unlocked/viewed this project
    $checkView = $db->prepare("
        SELECT id FROM user_project_views 
        WHERE user_id = ? AND UPPER(TRIM(property_id)) = UPPER(TRIM(?))
        LIMIT 1
    ");
    $checkView->execute([$userId, $id]);
    $existingView = $checkView->fetch(PDO::FETCH_ASSOC);

    if ($existingView) {
        // Already unlocked in past, can download anytime at zero quota penalty
        $canDownload = true;
        $isAlreadyUnlocked = true;
        $limitReached = false;
    } else {
        // New project view: check quota
        if ($projectViewsUsed >= $projectViewLimit) {
            $canDownload = false;
            $limitReached = true;
            $isAlreadyUnlocked = false;
            $upgradeMessage = "You have reached your limit of {$projectViewLimit} project views on the {$activePlanName} plan. Upgrade to view full project specifications, cadastral audit, layout plots, and legal documents.";
        } else {
            $canDownload = true;
            $limitReached = false;
            $isAlreadyUnlocked = false;
        }
    }
} else {
    // Unauthenticated Guest flow
    $db->exec("
        CREATE TABLE IF NOT EXISTS `guest_device_views` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `ip_address` VARCHAR(45) NOT NULL,
            `device_hash` VARCHAR(64) NOT NULL,
            `property_id` VARCHAR(50) NOT NULL,
            `viewed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `last_active_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY `idx_guest_view` (`ip_address`, `device_hash`, `property_id`),
            KEY `idx_ip` (`ip_address`),
            KEY `idx_device` (`device_hash`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    $activePlanId = 'explorer';
    $activePlanName = 'Free User';
    $projectViewLimit = 2;

    $stmtViews = $db->prepare("
        SELECT DISTINCT property_id 
        FROM guest_device_views 
        WHERE ip_address = ? OR (device_hash = ? AND device_hash != '')
    ");
    $stmtViews->execute([$clientIp, $deviceHash]);
    $viewedRows = $stmtViews->fetchAll(PDO::FETCH_COLUMN);
    $viewedPropertyIds = array_values(array_filter(array_unique($viewedRows)));

    if (in_array($id, $viewedPropertyIds, true)) {
        $canDownload = true;
        $isAlreadyUnlocked = true;
        $limitReached = false;
        $projectViewsUsed = count($viewedPropertyIds);
    } else {
        $projectViewsUsed = count($viewedPropertyIds);
        if ($projectViewsUsed >= $projectViewLimit) {
            $canDownload = false;
            $limitReached = true;
            $isAlreadyUnlocked = false;
            $upgradeMessage = "You have reached your free limit of {$projectViewLimit} project views. Sign in or upgrade your membership to unlock full project specifications, cadastral audit, layout plots, and documents.";
        } else {
            $canDownload = true;
            $limitReached = false;
            $isAlreadyUnlocked = false;
        }
    }
}

Response::success([
    'propertyId'        => $id,
    'canDownload'       => $canDownload,
    'limitReached'      => $limitReached,
    'isAlreadyUnlocked' => $isAlreadyUnlocked,
    'activePlanId'      => $activePlanId,
    'activePlanName'    => $activePlanName,
    'projectViewsUsed'  => $projectViewsUsed,
    'projectViewLimit'  => $projectViewLimit,
    'upgradeMessage'    => $upgradeMessage,
    'basicProperty'     => $basicProperty
], 'Entitlement check completed');
