<?php
/**
 * POST /api/analytics/track.php
 * Track user browsing behavior (property view, shortlist, brochure, site visit)
 * and calculate live buyer mindset brief.
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

use Mannidam\Config\Database;
use Mannidam\Helpers\Response;

Response::initCors();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Method not allowed', 405);
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    Response::error('Invalid JSON body');
}

$userPhone     = trim($input['phone'] ?? '9486140936');
$propertyId    = trim($input['propertyId'] ?? '');
$propertyTitle = trim($input['propertyTitle'] ?? '');
$propertyType  = trim($input['propertyType'] ?? 'Gated CMDA Plots');
$priceStr      = trim($input['price'] ?? '₹ 25.0 Lakhs');
$locality      = trim($input['locality'] ?? '');
$city          = trim($input['city'] ?? 'Chennai');
$actionType    = trim($input['actionType'] ?? 'view');

if (empty($propertyId)) {
    Response::error('propertyId is required');
}

// Convert price string to numeric INR
function parsePriceToNumber(string $priceStr): int {
    $clean = strtolower(str_replace(['₹', ',', ' '], '', $priceStr));
    if (strpos($clean, 'cr') !== false) {
        $num = (float)str_replace('cr', '', $clean);
        return (int)round($num * 10000000);
    }
    if (strpos($clean, 'lakh') !== false || strpos($clean, 'l') !== false) {
        $num = (float)str_replace(['lakhs', 'lakh', 'l'], '', $clean);
        return (int)round($num * 100000);
    }
    return (int)$clean;
}

$priceInr = parsePriceToNumber($priceStr);

$db = (new Database())->getConnection();

// Ensure table exists
$db->exec("
CREATE TABLE IF NOT EXISTS `user_browsing_analytics` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_phone` VARCHAR(20) NOT NULL,
    `property_id` VARCHAR(50) NOT NULL,
    `property_title` VARCHAR(255) NULL,
    `property_type` VARCHAR(100) NOT NULL,
    `price` VARCHAR(50) NOT NULL,
    `price_inr` BIGINT NOT NULL,
    `locality` VARCHAR(150) NULL,
    `city` VARCHAR(100) NULL,
    `action_type` VARCHAR(50) DEFAULT 'view',
    `viewed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY `idx_phone` (`user_phone`),
    KEY `idx_property` (`property_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
");

// Insert activity log
$stmt = $db->prepare("
    INSERT INTO user_browsing_analytics 
    (user_phone, property_id, property_title, property_type, price, price_inr, locality, city, action_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
");
$stmt->execute([
    $userPhone,
    $propertyId,
    $propertyTitle,
    $propertyType,
    $priceStr,
    $priceInr,
    $locality,
    $city,
    $actionType
]);

// Helper for formatting INR display
function formatINR(int $val): string {
    if ($val >= 10000000) {
        $cr = round($val / 10000000, 2);
        return $cr . ' Cr';
    }
    if ($val >= 100000) {
        $lakh = round($val / 100000, 1);
        return $lakh . ' Lakhs';
    }
    return '₹' . number_format($val);
}

// Compute aggregate metrics for this phone
$metricsStmt = $db->prepare("
    SELECT 
        COUNT(DISTINCT property_id) as total_viewed,
        SUM(CASE WHEN property_type LIKE '%Plot%' THEN 1 ELSE 0 END) as plots_viewed,
        SUM(CASE WHEN property_type LIKE '%Flat%' OR property_type LIKE '%Apartment%' THEN 1 ELSE 0 END) as flats_viewed,
        MIN(price_inr) as min_price,
        MAX(price_inr) as max_price,
        AVG(price_inr) as avg_price
    FROM user_browsing_analytics
    WHERE user_phone = ?
");
$metricsStmt->execute([$userPhone]);
$m = $metricsStmt->fetch();

$totalViewed = (int)($m['total_viewed'] ?? 1);
$plotsCount  = (int)($m['plots_viewed'] ?? 0);
$flatsCount  = (int)($m['flats_viewed'] ?? 0);
$minPrice    = (int)($m['min_price'] ?? $priceInr);
$maxPrice    = (int)($m['max_price'] ?? $priceInr);
$avgPrice    = (int)($m['avg_price'] ?? $priceInr);

$typeTotal = max(1, $plotsCount + $flatsCount);
$plotsPct  = round(($plotsCount / $typeTotal) * 100);
$flatsPct  = round(($flatsCount / $typeTotal) * 100);

// Fetch top localities viewed
$locStmt = $db->prepare("
    SELECT locality, COUNT(*) as cnt 
    FROM user_browsing_analytics 
    WHERE user_phone = ? AND locality IS NOT NULL AND locality != ''
    GROUP BY locality 
    ORDER BY cnt DESC 
    LIMIT 3
");
$locStmt->execute([$userPhone]);
$topLocalities = $locStmt->fetchAll(PDO::FETCH_COLUMN);
$topLocalityStr = !empty($topLocalities) ? implode(', ', $topLocalities) : $locality;

// Generate User Mindset Brief
$priceRangeStr = formatINR($minPrice) . " to " . formatINR($maxPrice);

if ($plotsCount > $flatsCount) {
    $mindsetBrief = "{$userPhone} user viewed between {$priceRangeStr}, He viewed {$plotsCount} plots and {$flatsCount} flat" . ($flatsCount === 1 ? '' : 's') . ", so the {$plotsPct}% of interest towards plots and optionally viewed flats.";
    $archetype = "Strategic Land Investor";
    $recommendation = "Pitch CMDA/DTCP registered plots in {$topLocalityStr} within " . formatINR($minPrice) . " - " . formatINR($maxPrice) . " with clear Patta and instant registration.";
} elseif ($flatsCount > $plotsCount) {
    $mindsetBrief = "{$userPhone} user viewed between {$priceRangeStr}, He viewed {$flatsCount} flats and {$plotsCount} plot" . ($plotsCount === 1 ? '' : 's') . ", so the {$flatsPct}% of interest towards flats and optionally viewed plots.";
    $archetype = "Ready Residential Homebuyer";
    $recommendation = "Showcase 2BHK/3BHK ready-to-move apartments in {$topLocalityStr} within " . formatINR($minPrice) . " - " . formatINR($maxPrice) . " with bank pre-approval.";
} else {
    $mindsetBrief = "{$userPhone} user viewed between {$priceRangeStr}, He viewed {$plotsCount} plots and {$flatsCount} flats, showing balanced 50% interest between plots and apartments.";
    $archetype = "Comparative Explorer (Plot vs Flat ROI)";
    $recommendation = "Present comparative ROI presentation comparing land capital appreciation vs rental yields in {$topLocalityStr}.";
}

Response::success([
    'userPhone'        => $userPhone,
    'totalViewed'      => $totalViewed,
    'plotsCount'       => $plotsCount,
    'flatsCount'       => $flatsCount,
    'plotsPercentage'  => $plotsPct,
    'flatsPercentage'  => $flatsPct,
    'minPrice'         => $minPrice,
    'maxPrice'         => $maxPrice,
    'priceRange'       => $priceRangeStr,
    'avgPrice'         => $avgPrice,
    'avgPriceFormatted'=> formatINR($avgPrice),
    'topLocalities'    => $topLocalities,
    'mindsetBrief'     => $mindsetBrief,
    'buyerArchetype'   => $archetype,
    'recommendation'   => $recommendation,
    'lastTrackedId'    => $propertyId
], 'User activity tracked successfully');
