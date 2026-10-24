<?php
/**
 * GET /api/analytics/user-mindset.php
 * Retrieve synthesized user mindset brief & browsing statistics from MySQL database.
 * Query params: ?phone=9486140936 (or ?phone=all for admin CRM lead list)
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

$phoneParam = trim($_GET['phone'] ?? '9486140936');

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

function computeMindsetForPhone(PDO $db, string $phone): ?array {
    $metricsStmt = $db->prepare("
        SELECT 
            COUNT(DISTINCT property_id) as total_viewed,
            SUM(CASE WHEN property_type LIKE '%Plot%' THEN 1 ELSE 0 END) as plots_viewed,
            SUM(CASE WHEN property_type LIKE '%Flat%' OR property_type LIKE '%Apartment%' THEN 1 ELSE 0 END) as flats_viewed,
            MIN(price_inr) as min_price,
            MAX(price_inr) as max_price,
            AVG(price_inr) as avg_price,
            MAX(viewed_at) as last_active
        FROM user_browsing_analytics
        WHERE user_phone = ?
    ");
    $metricsStmt->execute([$phone]);
    $m = $metricsStmt->fetch();

    $totalViewed = (int)($m['total_viewed'] ?? 0);
    if ($totalViewed === 0) {
        return null;
    }

    $plotsCount  = (int)($m['plots_viewed'] ?? 0);
    $flatsCount  = (int)($m['flats_viewed'] ?? 0);
    $minPrice    = (int)($m['min_price'] ?? 0);
    $maxPrice    = (int)($m['max_price'] ?? 0);
    $avgPrice    = (int)($m['avg_price'] ?? 0);

    $typeTotal = max(1, $plotsCount + $flatsCount);
    $plotsPct  = round(($plotsCount / $typeTotal) * 100);
    $flatsPct  = round(($flatsCount / $typeTotal) * 100);

    // Top localities
    $locStmt = $db->prepare("
        SELECT locality, COUNT(*) as cnt 
        FROM user_browsing_analytics 
        WHERE user_phone = ? AND locality IS NOT NULL AND locality != ''
        GROUP BY locality 
        ORDER BY cnt DESC 
        LIMIT 3
    ");
    $locStmt->execute([$phone]);
    $topLocalities = $locStmt->fetchAll(PDO::FETCH_COLUMN);
    $topLocalityStr = !empty($topLocalities) ? implode(', ', $topLocalities) : 'South Chennai';

    $priceRangeStr = formatINR($minPrice) . " to " . formatINR($maxPrice);

    if ($plotsCount > $flatsCount) {
        $mindsetBrief = "{$phone} user viewed between {$priceRangeStr}, He viewed {$plotsCount} plots and {$flatsCount} flat" . ($flatsCount === 1 ? '' : 's') . ", so the {$plotsPct}% of interest towards plots and optionally viewed flats.";
        $archetype = "Strategic Land Investor";
        $urgency = $totalViewed >= 4 ? "High Intent (Ready Buyer)" : "Early Exploration";
        $recommendation = "Pitch CMDA/DTCP registered plots in {$topLocalityStr} within " . formatINR($minPrice) . " - " . formatINR($maxPrice) . " with clear Patta and instant registration.";
    } elseif ($flatsCount > $plotsCount) {
        $mindsetBrief = "{$phone} user viewed between {$priceRangeStr}, He viewed {$flatsCount} flats and {$plotsCount} plot" . ($plotsCount === 1 ? '' : 's') . ", so the {$flatsPct}% of interest towards flats and optionally viewed plots.";
        $archetype = "Ready Residential Homebuyer";
        $urgency = $totalViewed >= 4 ? "High Intent (Ready Buyer)" : "Early Exploration";
        $recommendation = "Showcase 2BHK/3BHK ready-to-move apartments in {$topLocalityStr} within " . formatINR($minPrice) . " - " . formatINR($maxPrice) . " with bank pre-approval.";
    } else {
        $mindsetBrief = "{$phone} user viewed between {$priceRangeStr}, He viewed {$plotsCount} plots and {$flatsCount} flats, showing balanced 50% interest between plots and apartments.";
        $archetype = "Comparative Explorer (Plot vs Flat ROI)";
        $urgency = "Moderate Comparison";
        $recommendation = "Present comparative ROI presentation comparing land capital appreciation vs rental yields in {$topLocalityStr}.";
    }

    // Recent properties viewed
    $recentStmt = $db->prepare("
        SELECT property_id, property_title, property_type, price, locality, city, action_type, viewed_at
        FROM user_browsing_analytics
        WHERE user_phone = ?
        ORDER BY viewed_at DESC
        LIMIT 6
    ");
    $recentStmt->execute([$phone]);
    $recentViews = $recentStmt->fetchAll(PDO::FETCH_ASSOC);

    return [
        'userPhone'        => $phone,
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
        'urgency'          => $urgency,
        'recommendation'   => $recommendation,
        'lastActive'       => $m['last_active'],
        'recentViews'      => $recentViews
    ];
}

if ($phoneParam === 'all') {
    // Return all users who have browsing activity
    $usersStmt = $db->query("
        SELECT DISTINCT user_phone 
        FROM user_browsing_analytics 
        ORDER BY MAX(viewed_at) DESC
    ");
    $phones = $db->query("SELECT DISTINCT user_phone FROM user_browsing_analytics")->fetchAll(PDO::FETCH_COLUMN);
    $allMindsets = [];
    foreach ($phones as $p) {
        $data = computeMindsetForPhone($db, $p);
        if ($data) $allMindsets[] = $data;
    }
    Response::success($allMindsets, 'All user mindset records retrieved');
}

$userData = computeMindsetForPhone($db, $phoneParam);

// If no views recorded yet for this phone, return an initial template for 9486140936
if (!$userData) {
    $userData = [
        'userPhone'        => $phoneParam,
        'totalViewed'      => 0,
        'plotsCount'       => 0,
        'flatsCount'       => 0,
        'plotsPercentage'  => 0,
        'flatsPercentage'  => 0,
        'minPrice'         => 0,
        'maxPrice'         => 0,
        'priceRange'       => 'Not yet recorded',
        'avgPrice'         => 0,
        'avgPriceFormatted'=> '₹0',
        'topLocalities'    => [],
        'mindsetBrief'     => "{$phoneParam} user has visited our site. Start browsing plots and flats to generate live mindset intelligence.",
        'buyerArchetype'   => 'New Visitor',
        'urgency'          => 'Initial Session',
        'recommendation'   => 'Track first 3 property interactions to identify investment interest bracket.',
        'lastActive'       => date('Y-m-d H:i:s'),
        'recentViews'      => []
    ];
}

Response::success($userData, 'User mindset brief generated successfully');
