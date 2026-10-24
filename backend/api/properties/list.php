<?php
/**
 * GET /api/properties/list.php
 * Filter & search properties across types, cities, localities, budgets, and modes.
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

// Parse Query Parameters
$cityKey      = $_GET['cityKey'] ?? null;
$localityName = $_GET['locality'] ?? null;
$propertyType = $_GET['propertyType'] ?? null;
$listingMode  = $_GET['mode'] ?? null;
$searchQuery  = $_GET['q'] ?? null;
$page         = max(1, (int)($_GET['page'] ?? 1));
$limit        = max(1, min(100, (int)($_GET['limit'] ?? 100)));
$offset       = ($page - 1) * $limit;

// Build Dynamic SQL Query with Prepared Statements
$whereClauses = [];
$params       = [];

if (!empty($cityKey)) {
    $whereClauses[] = 'c.city_key = :cityKey';
    $params[':cityKey'] = $cityKey;
}

if (!empty($localityName)) {
    $whereClauses[] = 'p.locality_name LIKE :locality';
    $params[':locality'] = '%' . $localityName . '%';
}

if (!empty($propertyType) && $propertyType !== 'all') {
    $whereClauses[] = 'p.property_type = :propertyType';
    $params[':propertyType'] = $propertyType;
}

if (!empty($listingMode) && $listingMode !== 'all') {
    $whereClauses[] = 'p.listing_mode = :listingMode';
    $params[':listingMode'] = $listingMode;
}

if (!empty($searchQuery)) {
    $whereClauses[] = '(p.title LIKE :search OR p.locality_name LIKE :search OR p.city_name LIKE :search)';
    $params[':search'] = '%' . $searchQuery . '%';
}

// Only show published properties on the public marketplace
$whereClauses[] = "(p.status = 'published' OR p.status IS NULL)";

$whereSql = !empty($whereClauses) ? 'WHERE ' . implode(' AND ', $whereClauses) : '';

// 1. Total Count Query
$countStmt = $db->prepare("
    SELECT COUNT(*) as total 
    FROM properties p 
    JOIN cities c ON p.city_id = c.id
    {$whereSql}
");
$countStmt->execute($params);
$total = (int)$countStmt->fetchColumn();

// 2. Fetch Properties Page
$sql = "
    SELECT 
        p.id,
        p.title,
        p.property_type AS propertyType,
        p.listing_mode AS listingMode,
        p.locality_name AS locality,
        p.city_name AS city,
        c.city_key AS cityKey,
        p.price,
        p.price_per_sqft AS pricePerSqFt,
        p.sqft,
        p.bhk_badge AS bhkBadge,
        p.facing_or_view AS facingOrView,
        p.main_image_url AS imageUrl,
        p.rera_number AS reraNumber,
        p.brokerage_badge AS brokerageBadge,
        p.special_tag AS specialTag,
        p.points_badge AS pointsBadge,
        p.media_points AS mediaPoints,
        p.possession_date AS possessionDate,
        p.project_status AS projectStatus,
        p.total_land_parcel AS totalLandParcel,
        p.total_units AS totalUnits,
        p.whatsapp_url AS whatsappUrl,
        p.is_featured AS isFeatured
    FROM properties p
    JOIN cities c ON p.city_id = c.id
    {$whereSql}
    ORDER BY p.is_featured DESC, p.created_at DESC
    LIMIT {$limit} OFFSET {$offset}
";

$stmt = $db->prepare($sql);
$stmt->execute($params);
$rows = $stmt->fetchAll();

// Format response to match Angular Property interface
$properties = [];
foreach ($rows as $row) {
    // Fetch highlights
    $hlStmt = $db->prepare("SELECT highlight_text FROM property_highlights WHERE property_id = ? ORDER BY sort_order ASC");
    $hlStmt->execute([$row['id']]);
    $highlights = $hlStmt->fetchAll(PDO::FETCH_COLUMN);

    // Fetch free photos
    $photoStmt = $db->prepare("SELECT url FROM property_media WHERE property_id = ? AND media_type = 'free_photo' ORDER BY sort_order ASC");
    $photoStmt->execute([$row['id']]);
    $freePhotos = $photoStmt->fetchAll(PDO::FETCH_COLUMN);
    if (empty($freePhotos)) {
        $freePhotos = [$row['imageUrl']];
    }

    // Fetch premium media
    $premStmt = $db->prepare("SELECT id, media_type, title, url, thumbnail_url, duration, tag FROM property_media WHERE property_id = ? AND media_type != 'free_photo' ORDER BY sort_order ASC");
    $premStmt->execute([$row['id']]);
    $premRows = $premStmt->fetchAll();
    $premiumMedia = [];
    foreach ($premRows as $pm) {
        $premiumMedia[] = [
            'id'           => (string)$pm['id'],
            'type'         => $pm['media_type'] === 'drone_survey' ? 'drone' : 'video',
            'title'        => $pm['title'],
            'url'          => $pm['url'],
            'thumbnailUrl' => $pm['thumbnail_url'] ?? $row['imageUrl'],
            'duration'     => $pm['duration'] ?? '02:00 mins',
            'tag'          => $pm['tag'] ?? 'Ultra-HD'
        ];
    }

    $properties[] = [
        'id'           => $row['id'],
        'title'        => $row['title'],
        'propertyType' => $row['propertyType'],
        'locality'     => $row['locality'],
        'city'         => $row['city'],
        'cityKey'      => $row['cityKey'],
        'price'        => $row['price'],
        'pricePerSqFt' => $row['pricePerSqFt'],
        'sqft'         => $row['sqft'],
        'bhkBadge'     => $row['bhkBadge'],
        'facingOrView' => $row['facingOrView'],
        'imageUrl'     => $row['imageUrl'],
        'badges'       => [
            'rera'       => $row['reraNumber'],
            'brokerage'  => $row['brokerageBadge'],
            'points'     => (int)$row['pointsBadge'],
            'specialTag' => $row['specialTag'],
        ],
        'highlights'      => $highlights,
        'mediaPoints'     => (int)$row['mediaPoints'],
        'freePhotos'      => $freePhotos,
        'premiumMedia'    => $premiumMedia,
        'whatsappUrl'     => $row['whatsappUrl'],
        'possessionDate'  => $row['possessionDate'] ?? null,
        'projectStatus'   => $row['projectStatus'] ?? null,
        'totalLandParcel' => $row['totalLandParcel'] ?? null,
        'totalUnits'      => $row['totalUnits'] ?? null,
    ];
}

Response::success($properties, 'Properties retrieved successfully', [
    'total'  => $total,
    'page'   => $page,
    'limit'  => $limit,
    'pages'  => (int)ceil($total / $limit),
]);
