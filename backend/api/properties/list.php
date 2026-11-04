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
$developer    = $_GET['developer'] ?? null;
$district     = $_GET['district'] ?? null;
$searchQuery  = $_GET['q'] ?? null;
$localitiesParam = $_GET['localities'] ?? null; // Multi-level localities (e.g. "Porur,Ramapuram")
$sortBy       = $_GET['sort'] ?? 'featured';
$limit        = max(1, min(1000, (int)($_GET['limit'] ?? 20)));
$offset       = isset($_GET['offset']) ? max(0, (int)$_GET['offset']) : max(0, (max(1, (int)($_GET['page'] ?? 1)) - 1) * $limit);

// GPS Radius Parameters (Nearby Search Mode)
$userLat     = isset($_GET['lat']) ? (float)$_GET['lat'] : null;
$userLng     = isset($_GET['lng']) ? (float)$_GET['lng'] : (isset($_GET['lon']) ? (float)$_GET['lon'] : null);
$radiusKm    = isset($_GET['radius']) ? (float)$_GET['radius'] : null;
$isNearbyGps = ($userLat !== null && $userLng !== null && $userLat != 0.0 && $userLng != 0.0);

/**
 * Parses GPS coordinates from decimal format, DMS DDMMSS.S, or Google Maps URL
 */
function parseCadastralCoords(?string $str): ?array {
    if (!$str) return null;
    $str = trim(rtrim($str, ','));
    if (preg_match('/^([0-9\.\-]+)\s*,\s*([0-9\.\-]+)/', $str, $m)) {
        $lat = (float)$m[1];
        $lon = (float)$m[2];
        if ($lat >= 8.0 && $lat <= 14.5 && $lon >= 76.0 && $lon <= 81.5) {
            return ['lat' => $lat, 'lon' => $lon];
        }
        if ($lat > 1000 && $lon > 1000) {
            $dLat = floor($lat / 10000);
            $mLat = floor(($lat - $dLat * 10000) / 100);
            $sLat = $lat - $dLat * 10000 - $mLat * 100;
            $decLat = $dLat + ($mLat / 60) + ($sLat / 3600);

            $dLon = floor($lon / 10000);
            $mLon = floor(($lon - $dLon * 10000) / 100);
            $sLon = $lon - $dLon * 10000 - $mLon * 100;
            $decLon = $dLon + ($mLon / 60) + ($sLon / 3600);

            if ($decLat >= 8.0 && $decLat <= 14.5 && $decLon >= 76.0 && $decLon <= 81.5) {
                return ['lat' => $decLat, 'lon' => $decLon];
            }
        }
    }
    if (preg_match('/[?&](?:q|ll)=(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/i', $str, $m)) {
        return ['lat' => (float)$m[1], 'lon' => (float)$m[2]];
    }
    if (preg_match('/@(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/', $str, $m)) {
        return ['lat' => (float)$m[1], 'lon' => (float)$m[2]];
    }
    return null;
}

/**
 * Calculates Haversine distance in km between two coordinate pairs
 */
function haversineDistKm(float $lat1, float $lon1, float $lat2, float $lon2): float {
    $R = 6371.0;
    $dLat = deg2rad($lat2 - $lat1);
    $dLon = deg2rad($lon2 - $lon1);
    $a = sin($dLat / 2) * sin($dLat / 2) +
         cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
         sin($dLon / 2) * sin($dLon / 2);
    $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
    return round($R * $c, 2);
}

// Build Dynamic SQL Query with Prepared Statements
$whereClauses = [];
$params       = [];

// Multi-Level Locality / Area Filtering (like NoBroker multiple localities tag search)
if (!empty($localitiesParam)) {
    $locArray = is_array($localitiesParam) ? $localitiesParam : explode(',', (string)$localitiesParam);
    $locArray = array_values(array_filter(array_map('trim', $locArray)));
    if (!empty($locArray)) {
        $locOrClauses = [];
        foreach ($locArray as $lIdx => $locTerm) {
            $pLoc = ':m_loc_' . $lIdx;
            $locOrClauses[] = "(
                p.locality_name REGEXP {$pLoc}
                OR p.city_name REGEXP {$pLoc}
                OR pmd.village_locality REGEXP {$pLoc}
                OR pmd.area_location REGEXP {$pLoc}
                OR pmd.taluk REGEXP {$pLoc}
                OR pmd.district REGEXP {$pLoc}
                OR pmd.project_name REGEXP {$pLoc}
                OR p.title REGEXP {$pLoc}
            )";
            $params[$pLoc] = '[[:<:]]' . preg_quote($locTerm, '/');
        }
        $whereClauses[] = '(' . implode(' OR ', $locOrClauses) . ')';
    }
}

if (!empty($developer) && $developer !== 'all') {
    $whereClauses[] = 'pmd.developer = :developer';
    $params[':developer'] = trim($developer);
}

if (!empty($district) && $district !== 'all') {
    $variantDistricts = [
        'tiruvallur'      => ['Tiruvallur', 'Thiruvallur'],
        'tiruchirappalli' => ['Tiruchirappalli', 'Thiruchirapalli'],
        'tiruvarur'       => ['Tiruvarur', 'Thiruvarur'],
        'thoothukudi'     => ['Thoothukudi', 'Thoothukkudi'],
        'pudukkottai'     => ['Pudukkottai', 'Pudukottai'],
        'tenkasi'         => ['Tenkasi', 'Tenksai'],
        'kanyakumari'     => ['Kanyakumari', 'Kanniyakumari'],
    ];
    $dClean = strtolower(trim($district));
    $variants = $variantDistricts[$dClean] ?? [trim($district)];
    $dOr = [];
    foreach ($variants as $vIdx => $v) {
        $pKey = ':dist_' . $vIdx;
        $dOr[] = "(pmd.district LIKE {$pKey} OR p.city_name LIKE {$pKey})";
        $params[$pKey] = '%' . $v . '%';
    }
    $whereClauses[] = '(' . implode(' OR ', $dOr) . ')';
}

if (!empty($cityKey) && $cityKey !== 'all') {
    $whereClauses[] = '(c.city_key = :cityKey OR LOWER(p.city_name) = :cityKey OR LOWER(pmd.district) = :cityKey OR LOWER(pmd.taluk) = :cityKey)';
    $params[':cityKey'] = strtolower($cityKey);
}

if (!empty($localityName)) {
    $whereClauses[] = '(p.locality_name LIKE :locality OR pmd.village_locality LIKE :locality OR pmd.area_location LIKE :locality OR pmd.taluk LIKE :locality)';
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

// 99acres / NoBroker Style Multi-Token Intelligent Search Engine
if (!empty($searchQuery)) {
    $cleanQuery = trim($searchQuery);
    
    // Stopwords to ignore in tokenized search
    $stopwords = ['in', 'near', 'at', 'for', 'sale', 'the', 'and', 'of', 'to', 'with', 'by', 'from', 'a', 'an'];
    
    // Split into alphanumeric tokens
    $rawTokens = preg_split('/[\s,\-\/]+/', strtolower($cleanQuery), -1, PREG_SPLIT_NO_EMPTY);
    
    $meaningfulTokens = array_values(array_filter($rawTokens, function($t) use ($stopwords) {
        return strlen($t) >= 2 && !in_array($t, $stopwords, true);
    }));
    
    if (empty($meaningfulTokens)) {
        $meaningfulTokens = $rawTokens;
    }
    
    $tokenClauses = [];
    $tIdx = 0;
    foreach ($meaningfulTokens as $token) {
        // Specific property type intents (e.g. "plot", "villa", "apartment", "commercial")
        if (($token === 'plot' || $token === 'plots' || $token === 'land') && count($meaningfulTokens) > 1) {
            $tokenClauses[] = "(p.property_type LIKE '%Plot%' OR p.title LIKE '%Plot%' OR p.bhk_badge LIKE '%Plot%')";
            continue;
        }
        if (($token === 'villa' || $token === 'villas') && count($meaningfulTokens) > 1) {
            $tokenClauses[] = "(p.property_type LIKE '%Villa%' OR p.title LIKE '%Villa%')";
            continue;
        }
        if (($token === 'apartment' || $token === 'apartments' || $token === 'flat' || $token === 'flats') && count($meaningfulTokens) > 1) {
            $tokenClauses[] = "(p.property_type LIKE '%Apartment%' OR p.property_type LIKE '%Flat%' OR p.title LIKE '%Apartment%')";
            continue;
        }
        if ($token === 'commercial' && count($meaningfulTokens) > 1) {
            $tokenClauses[] = "(p.property_type LIKE '%Commercial%' OR pmd.land_use LIKE '%Commercial%')";
            continue;
        }
        
        $fields = [
            'p.title',
            'p.locality_name',
            'p.city_name',
            'p.id',
            'p.rera_number',
            'pmd.project_name',
            'pmd.developer',
            'pmd.village_locality',
            'pmd.area_location',
            'pmd.taluk',
            'pmd.district',
            'pmd.pincode',
            'pmd.corridor',
            'pmd.highway_name',
            'pmd.plot_no',
            'pmd.facing',
            'pmd.land_use',
            'pmd.patta_type',
            'pmd.dtcp_approval_no',
            'pmd.remarks'
        ];
        $subClauses = [];
        foreach ($fields as $fIdx => $field) {
            $pKey = ":stk_{$tIdx}_{$fIdx}";
            $subClauses[] = "{$field} REGEXP {$pKey}";
            $params[$pKey] = '[[:<:]]' . preg_quote($token, '/');
        }
        $tokenClauses[] = '(' . implode(' OR ', $subClauses) . ')';
        $tIdx++;
    }
    
    if (!empty($tokenClauses)) {
        $whereClauses[] = '(' . implode(' AND ', $tokenClauses) . ')';
    }
}

// Order by clause
$orderSql = 'p.is_featured DESC, p.created_at DESC';
if ($sortBy === 'price-asc') {
    $orderSql = 'pmd.total_price ASC, p.created_at DESC';
} elseif ($sortBy === 'price-desc') {
    $orderSql = 'pmd.total_price DESC, p.created_at DESC';
} elseif ($sortBy === 'rate-asc') {
    $orderSql = 'pmd.price_per_sqft ASC, p.created_at DESC';
} elseif ($sortBy === 'rate-desc') {
    $orderSql = 'pmd.price_per_sqft DESC, p.created_at DESC';
} elseif ($sortBy === 'newest') {
    $orderSql = 'p.created_at DESC';
}

// Only show published properties on the public marketplace
$whereClauses[] = "(p.status = 'published' OR p.status IS NULL)";

$whereSql = !empty($whereClauses) ? 'WHERE ' . implode(' AND ', $whereClauses) : '';

if ($isNearbyGps) {
    // -------------------------------------------------------------
    // HIGH-ACCURACY GPS PROXIMITY SEARCH (Under 5km / Sorted Closest First)
    // -------------------------------------------------------------
    $gpsQuery = $db->prepare("
        SELECT p.id, pmd.google_maps_link, p.interactive_map_url
        FROM properties p
        LEFT JOIN cities c ON p.city_id = c.id
        LEFT JOIN property_master_details pmd ON p.id = pmd.property_id
        {$whereSql}
    ");
    $gpsQuery->execute($params);
    $allGpsCandidates = $gpsQuery->fetchAll(PDO::FETCH_ASSOC);

    $matched = [];
    foreach ($allGpsCandidates as $cand) {
        $rawLink = $cand['google_maps_link'] ?? $cand['interactive_map_url'];
        $coords = parseCadastralCoords($rawLink);
        if ($coords !== null) {
            $dist = haversineDistKm($userLat, $userLng, $coords['lat'], $coords['lon']);
            $matched[] = [
                'id'       => $cand['id'],
                'distance' => $dist,
                'lat'      => $coords['lat'],
                'lon'      => $coords['lon']
            ];
        }
    }

    // Sort by distance ascending (closest first)
    usort($matched, fn($a, $b) => $a['distance'] <=> $b['distance']);

    // Filter by radius (default 5.0 km)
    $effectiveRadius = ($radiusKm !== null && $radiusKm > 0) ? $radiusKm : 5.0;
    $withinRadius = array_values(array_filter($matched, fn($item) => $item['distance'] <= $effectiveRadius));

    // If properties exist within radius, display them; if none <= 5km, fall back to nearest verified properties
    $targetSet = !empty($withinRadius) ? $withinRadius : $matched;
    $total = count($targetSet);

    $slicedTargets = array_slice($targetSet, $offset, $limit);
    $slicedIds = array_column($slicedTargets, 'id');
    $distMap = [];
    foreach ($slicedTargets as $st) {
        $distMap[$st['id']] = $st;
    }

    if (!empty($slicedIds)) {
        $inPlaceholders = implode(',', array_fill(0, count($slicedIds), '?'));
        $sql = "
            SELECT 
                p.id,
                p.title,
                p.property_type AS propertyType,
                p.listing_mode AS listingMode,
                p.locality_name AS locality,
                p.city_name AS city,
                COALESCE(c.city_key, LOWER(p.city_name), 'chennai') AS cityKey,
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
                p.interactive_map_url AS interactiveMapUrl,
                p.is_featured AS isFeatured,
                pmd.google_maps_link AS googleMapsLink,
                pmd.developer AS developerName,
                pmd.project_name AS projectName,
                pmd.plot_no AS plotNo,
                pmd.area_location AS areaLocation,
                pmd.village_locality AS villageLocality,
                pmd.district AS district,
                pmd.taluk AS taluk,
                pmd.corridor AS corridor,
                pmd.pincode AS pincode,
                pmd.plot_size_sqft AS plotSizeSqft,
                pmd.plot_size_cents AS plotSizeCents,
                pmd.facing AS facing,
                pmd.patta_type AS pattaType,
                pmd.dtcp_approved AS dtcpApproved,
                pmd.dtcp_approval_no AS dtcpApprovalNo,
                pmd.road_width_ft AS roadWidthFt,
                pmd.highway_name AS highwayName,
                COALESCE(dpc.dev_proj_count, 1) AS developerProjectsCount
            FROM properties p
            LEFT JOIN cities c ON p.city_id = c.id
            LEFT JOIN property_master_details pmd ON p.id = pmd.property_id
            LEFT JOIN (
                SELECT 
                    TRIM(developer) AS dev_key,
                    COUNT(DISTINCT CASE WHEN TRIM(COALESCE(project_name, '')) != '' THEN TRIM(project_name) ELSE property_id END) AS dev_proj_count
                FROM property_master_details
                WHERE developer IS NOT NULL AND TRIM(developer) != ''
                GROUP BY TRIM(developer)
            ) dpc ON TRIM(pmd.developer) = dpc.dev_key
            WHERE p.id IN ({$inPlaceholders})
            ORDER BY FIELD(p.id, {$inPlaceholders})
        ";
        $stmt = $db->prepare($sql);
        $bindAll = array_merge($slicedIds, $slicedIds);
        $stmt->execute($bindAll);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rows as &$r) {
            $pId = $r['id'];
            if (isset($distMap[$pId])) {
                $r['distanceKm'] = $distMap[$pId]['distance'];
                $r['latitude']   = $distMap[$pId]['lat'];
                $r['longitude']  = $distMap[$pId]['lon'];
                $r['isClosestProximity'] = ($distMap[$pId]['distance'] <= 5.0);
                $r['isGpsValid'] = true;
            }
        }
        unset($r);
    } else {
        $rows = [];
    }
} else {
    // -------------------------------------------------------------
    // STANDARD REGIONAL SEARCH
    // -------------------------------------------------------------
    // 1. Total Count Query
    $countStmt = $db->prepare("
        SELECT COUNT(*) as total 
        FROM properties p
        LEFT JOIN cities c ON p.city_id = c.id
        LEFT JOIN property_master_details pmd ON p.id = pmd.property_id
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
            COALESCE(c.city_key, LOWER(p.city_name), 'chennai') AS cityKey,
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
            p.interactive_map_url AS interactiveMapUrl,
            p.is_featured AS isFeatured,
            pmd.google_maps_link AS googleMapsLink,
            pmd.developer AS developerName,
            pmd.project_name AS projectName,
            pmd.plot_no AS plotNo,
            pmd.area_location AS areaLocation,
            pmd.village_locality AS villageLocality,
            pmd.district AS district,
            pmd.taluk AS taluk,
            pmd.corridor AS corridor,
            pmd.pincode AS pincode,
            pmd.plot_size_sqft AS plotSizeSqft,
            pmd.plot_size_cents AS plotSizeCents,
            pmd.facing AS facing,
            pmd.patta_type AS pattaType,
            pmd.dtcp_approved AS dtcpApproved,
            pmd.dtcp_approval_no AS dtcpApprovalNo,
            pmd.road_width_ft AS roadWidthFt,
            pmd.highway_name AS highwayName,
            COALESCE(dpc.dev_proj_count, 1) AS developerProjectsCount
        FROM properties p
        LEFT JOIN cities c ON p.city_id = c.id
        LEFT JOIN property_master_details pmd ON p.id = pmd.property_id
        LEFT JOIN (
            SELECT 
                TRIM(developer) AS dev_key,
                COUNT(DISTINCT CASE WHEN TRIM(COALESCE(project_name, '')) != '' THEN TRIM(project_name) ELSE property_id END) AS dev_proj_count
            FROM property_master_details
            WHERE developer IS NOT NULL AND TRIM(developer) != ''
            GROUP BY TRIM(developer)
        ) dpc ON TRIM(pmd.developer) = dpc.dev_key
        {$whereSql}
        ORDER BY {$orderSql}
        LIMIT {$limit} OFFSET {$offset}
    ";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();
}

$fallbackImages = [
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
    'https://www.gobroker.co.in/uploads/amenities_image/banner27.png',
    'https://images.unsplash.com/photo-1500076656116-558758c991c1?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1524813686514-a57563d77d61?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1592595896551-12b371d546d5?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'
];

function formatIndianPrice($price) {
    if (empty($price)) return $price;
    if (preg_match('/(Lakh|Cr|Crore)/i', (string)$price)) {
        return $price;
    }
    $num = (float)preg_replace('/[^\d.]/', '', (string)$price);
    if ($num <= 0) return $price;
    if ($num >= 10000000) {
        $cr = $num / 10000000;
        return '₹ ' . (round($cr, 2) == round($cr, 0) ? number_format($cr, 0) : number_format($cr, 2)) . ' Cr';
    }
    if ($num >= 100000) {
        $lakhs = $num / 100000;
        return '₹ ' . (round($lakhs, 2) == round($lakhs, 0) ? number_format($lakhs, 0) : number_format($lakhs, 2)) . ' Lakhs';
    }
    return '₹ ' . number_format($num);
}

// Format response to match Angular Property interface
$formatPropertyRow = function(array $row, int $index, PDO $db, array $fallbackImages): array {
    // Fetch highlights
    $hlStmt = $db->prepare("SELECT highlight_text FROM property_highlights WHERE property_id = ? ORDER BY sort_order ASC");
    $hlStmt->execute([$row['id']]);
    $highlights = $hlStmt->fetchAll(PDO::FETCH_COLUMN);

    // Fetch free photos
    $photoStmt = $db->prepare("SELECT url FROM property_media WHERE property_id = ? AND media_type = 'free_photo' ORDER BY sort_order ASC");
    $photoStmt->execute([$row['id']]);
    $freePhotos = $photoStmt->fetchAll(PDO::FETCH_COLUMN);

    $mainImg = (!empty($row['imageUrl']) && str_starts_with($row['imageUrl'], 'http'))
        ? $row['imageUrl']
        : $fallbackImages[$index % count($fallbackImages)];

    if (empty($freePhotos)) {
        $freePhotos = [$mainImg];
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
            'thumbnailUrl' => $pm['thumbnail_url'] ?? $mainImg,
            'duration'     => $pm['duration'] ?? '02:00 mins',
            'tag'          => $pm['tag'] ?? 'Ultra-HD'
        ];
    }

    $rawMap = $row['googleMapsLink'] ?? ($row['interactiveMapUrl'] ?? null);
    $coords = parseCadastralCoords($rawMap);

    $lat = isset($row['latitude']) ? (float)$row['latitude'] : ($coords ? $coords['lat'] : null);
    $lon = isset($row['longitude']) ? (float)$row['longitude'] : ($coords ? $coords['lon'] : null);

    if ($lat === null || $lon === null) {
        $locCheck = strtolower(trim(($row['villageLocality'] ?? '') . ' ' . ($row['locality'] ?? '') . ' ' . ($row['city'] ?? '')));
        static $phpKnownCoords = [
            'chennai' => [13.0827, 80.2707],
            'guduvanchery' => [12.8436, 80.0601],
            'nandivaram' => [12.8480, 80.0650],
            'tambaram' => [12.9249, 80.1000],
            'chromepet' => [12.9516, 80.1462],
            'velachery' => [12.9815, 80.2180],
            'omr' => [12.9010, 80.2279],
            'sholinganallur' => [12.8997, 80.2279],
            'thoraipakkam' => [12.9372, 80.2330],
            'perungudi' => [12.9654, 80.2461],
            'navalur' => [12.8458, 80.2265],
            'siruseri' => [12.8333, 80.2167],
            'kelambakkam' => [12.7845, 80.2223],
            'ecr' => [12.8399, 80.2483],
            'neelankarai' => [12.9493, 80.2570],
            'injambakkam' => [12.9213, 80.2530],
            'thiruvanmiyur' => [12.9830, 80.2594],
            'adyar' => [13.0012, 80.2565],
            'besant nagar' => [12.9991, 80.2694],
            'anna nagar' => [13.0850, 80.2101],
            'mogappair' => [13.0837, 80.1754],
            'porur' => [13.0382, 80.1565],
            'poonamallee' => [13.0489, 80.0934],
            'chengalpattu' => [12.6841, 79.9836],
            'kanchipuram' => [12.8342, 79.7036],
            'tiruvallur' => [13.1432, 79.9077],
            'avadi' => [13.1147, 80.1098],
            'ambattur' => [13.1143, 80.1548],
            'coimbatore' => [11.0168, 76.9558],
            'dindigul' => [10.3673, 77.9803],
            'tiruppur' => [11.1085, 77.3411],
            'namakkal' => [11.2189, 78.1674],
            'salem' => [11.6643, 78.1460],
            'madurai' => [9.9252, 78.1198],
            'tirunelveli' => [8.7139, 77.7567],
            'sivagangai' => [9.8433, 78.4809],
            'kanyakumari' => [8.0883, 77.5385],
            'villupuram' => [11.9401, 79.4861],
            'tiruchirappalli' => [10.7905, 78.7047],
            'trichy' => [10.7905, 78.7047],
            'tenkasi' => [8.9594, 77.3161],
            'dharmapuri' => [12.1211, 78.1582],
            'kallakurichi' => [11.7381, 78.9639],
            'erode' => [11.3410, 77.7172],
            'thanjavur' => [10.7870, 79.1378],
            'thoothukudi' => [8.7642, 78.1348],
            'krishnagiri' => [12.5186, 78.2137],
            'tiruvannamalai' => [12.2253, 79.0747],
            'mayiladuthurai' => [11.1075, 79.6524],
            'vellore' => [12.9165, 79.1325],
            'virudhunagar' => [9.5680, 77.9624],
            'pudukkottai' => [10.3797, 78.8208],
            'arasur' => [11.0863, 77.1173],
            'karanai' => [12.6841, 79.9836],
            'palur' => [12.7611, 79.9157],
            'bengaluru' => [12.9716, 77.5946],
            'whitefield' => [12.9698, 77.7499],
            'hyderabad' => [17.3850, 78.4867],
            'jubilee hills' => [17.4319, 78.4073],
            'mumbai' => [19.0760, 72.8777]
        ];
        foreach ($phpKnownCoords as $locK => $pt) {
            if (strpos($locCheck, $locK) !== false) {
                $lat = $pt[0];
                $lon = $pt[1];
                break;
            }
        }
    }

    $isGpsValid = true;
    if ($lat !== null && $lon !== null) {
        $isGpsValid = ($lat >= 8.0 && $lat <= 37.0 && $lon >= 68.0 && $lon <= 98.0);
    }

    // Compute clean plot address
    $addrParts = [];
    $pNo = trim((string)($row['plotNo'] ?? ''));
    if ((empty($pNo) || $pNo === '1') && !empty($row['title'])) {
        if (preg_match('/Plot\s*(?:No\.?|Number|#)?\s*([A-Za-z0-9\/-]+)/i', $row['title'], $pm)) {
            $pNo = trim($pm[1]);
        }
    }
    if (!empty($pNo)) {
        $addrParts[] = 'Plot ' . $pNo;
    }
    $pName = trim((string)($row['projectName'] ?? ''));
    if (empty($pName) && !empty($row['title'])) {
        $cleanT = trim(preg_replace('/[-–—|:,]?\s*Plot\s*(?:No\.?|Number|#)?\s*[A-Za-z0-9\/-]+/i', '', $row['title']));
        if (!empty($cleanT) && strtolower($cleanT) !== 'verified layout') {
            $pName = $cleanT;
        }
    }
    if (!empty($pName) && strtolower($pName) !== 'null' && !in_array($pName, $addrParts, true)) {
        $addrParts[] = $pName;
    }
    $vl = trim((string)($row['villageLocality'] ?? ''));
    if (!empty($vl) && $vl !== '1' && !is_numeric($vl) && !in_array($vl, $addrParts, true) && !str_contains($vl, '₹')) {
        $addrParts[] = $vl;
    }
    $tk = trim((string)($row['taluk'] ?? ''));
    if (!empty($tk) && $tk !== '1' && !is_numeric($tk) && !str_contains(strtolower($tk), 'sq.ft') && !str_contains(strtolower($tk), 'cents') && !in_array($tk, $addrParts, true)) {
        $addrParts[] = $tk;
    }
    $dt = trim((string)($row['district'] ?? ''));
    if (empty($dt) || $dt === '1' || is_numeric($dt)) {
        $dt = (!empty($row['city']) && $row['city'] !== '1' && !is_numeric($row['city'])) ? $row['city'] : 'Chennai';
    }
    if (!in_array($dt, $addrParts, true)) {
        $addrParts[] = $dt;
    }
    $pin = trim((string)($row['pincode'] ?? ''));
    if (preg_match('/^\d{6}$/', $pin)) {
        $addrParts[count($addrParts) - 1] .= ' - ' . $pin;
    }
    $plotAddress = !empty($addrParts) ? implode(', ', $addrParts) : 'Chennai, Tamil Nadu';

    return [
        'plotAddress'  => $plotAddress,
        'plotNo'       => $pNo,
        'areaLocation' => $row['areaLocation'] ?? '',
        'id'           => $row['id'],
        'title'        => $row['title'],
        'propertyType' => $row['propertyType'],
        'locality'     => $row['locality'],
        'city'         => $row['city'],
        'cityKey'      => $row['cityKey'],
        'price'        => formatIndianPrice($row['price']),
        'pricePerSqFt' => $row['pricePerSqFt'],
        'sqft'         => $row['sqft'],
        'bhkBadge'     => $row['bhkBadge'],
        'facingOrView' => $row['facingOrView'],
        'imageUrl'     => $mainImg,
        'badges'       => [
            'rera'       => $row['reraNumber'] ?? 'CMDA / DTCP Sanctioned',
            'brokerage'  => $row['brokerageBadge'] ?? '0% Direct SRO Deed',
            'points'     => (int)($row['pointsBadge'] ?? 4),
            'specialTag' => $row['specialTag'] ?? '',
        ],
        'highlights'      => !empty($highlights) ? $highlights : ['DTCP Sanctioned Layout', 'Clear Patta Title', '30 Ft Wide Bitumen Road'],
        'mediaPoints'     => (int)($row['mediaPoints'] ?? 4),
        'freePhotos'      => $freePhotos,
        'premiumMedia'    => $premiumMedia,
        'whatsappUrl'     => $row['whatsappUrl'] ?? ('https://wa.me/919444100000?text=' . urlencode("Hi Find a Plot, I am interested in {$row['title']} (REF: {$row['id']})")),
        'possessionDate'  => $row['possessionDate'] ?? 'Immediate',
        'projectStatus'   => $row['projectStatus'] ?? 'Ready to Register',
        'totalLandParcel' => $row['totalLandParcel'] ?? 'Approved Layout',
        'totalUnits'      => $row['totalUnits'] ?? 'Individual Plots',
        'googleMapsLink'  => $row['googleMapsLink'] ?? ($lat && $lon ? "https://www.google.com/maps?q={$lat},{$lon}" : null),
        'developerName'   => $row['developerName'] ?? '',
        'projectName'     => $row['projectName'] ?? '',
        'villageLocality' => $row['villageLocality'] ?? '',
        'district'        => $row['district'] ?? '',
        'taluk'           => $row['taluk'] ?? '',
        'corridor'        => $row['corridor'] ?? '',
        'pincode'         => $row['pincode'] ?? '',
        'plotSizeSqft'    => !empty($row['plotSizeSqft']) ? (float)$row['plotSizeSqft'] : null,
        'plotSizeCents'   => !empty($row['plotSizeCents']) ? (float)$row['plotSizeCents'] : null,
        'facing'          => $row['facing'] ?? '',
        'pattaType'       => $row['pattaType'] ?? '',
        'dtcpApproved'    => $row['dtcpApproved'] ?? '',
        'dtcpApprovalNo'  => $row['dtcpApprovalNo'] ?? '',
        'roadWidthFt'     => !empty($row['roadWidthFt']) ? (int)$row['roadWidthFt'] : null,
        'highwayName'     => $row['highwayName'] ?? '',
        'developerProjectsCount' => (int)($row['developerProjectsCount'] ?? 1),
        'distanceKm'      => isset($row['distanceKm']) ? (float)$row['distanceKm'] : null,
        'isClosestProximity' => !empty($row['isClosestProximity']),
        'isGpsValid'      => $isGpsValid,
        'latitude'        => $lat,
        'longitude'       => $lon,
    ];
};

$properties = [];
foreach ($rows as $index => $row) {
    $properties[] = $formatPropertyRow($row, $index, $db, $fallbackImages);
}

// When no items match, fetch top recommended suggested properties
$suggestedProperties = [];
if ($total === 0) {
    $sugSql = "
        SELECT 
            p.id,
            p.title,
            p.property_type AS propertyType,
            p.listing_mode AS listingMode,
            p.locality_name AS locality,
            p.city_name AS city,
            COALESCE(c.city_key, LOWER(p.city_name), 'chennai') AS cityKey,
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
            p.interactive_map_url AS interactiveMapUrl,
            p.is_featured AS isFeatured,
            pmd.google_maps_link AS googleMapsLink,
            pmd.developer AS developerName,
            pmd.project_name AS projectName,
            pmd.plot_no AS plotNo,
            pmd.area_location AS areaLocation,
            pmd.village_locality AS villageLocality,
            pmd.district AS district,
            pmd.taluk AS taluk,
            pmd.corridor AS corridor,
            pmd.pincode AS pincode,
            pmd.plot_size_sqft AS plotSizeSqft,
            pmd.plot_size_cents AS plotSizeCents,
            pmd.facing AS facing,
            pmd.patta_type AS pattaType,
            pmd.dtcp_approved AS dtcpApproved,
            pmd.dtcp_approval_no AS dtcpApprovalNo,
            pmd.road_width_ft AS roadWidthFt,
            pmd.highway_name AS highwayName
        FROM properties p
        LEFT JOIN cities c ON p.city_id = c.id
        LEFT JOIN property_master_details pmd ON p.id = pmd.property_id
        WHERE (p.status = 'published' OR p.status IS NULL)
        ORDER BY p.is_featured DESC, p.created_at DESC
        LIMIT 8
    ";
    $sugStmt = $db->prepare($sugSql);
    $sugStmt->execute();
    $sugRows = $sugStmt->fetchAll();
    foreach ($sugRows as $sIdx => $sRow) {
        $p = $formatPropertyRow($sRow, $sIdx, $db, $fallbackImages);
        $p['badges']['specialTag'] = 'Suggested For You';
        $p['isSuggested'] = true;
        $suggestedProperties[] = $p;
    }
}

Response::success([
    'total'      => $total,
    'offset'     => $offset,
    'limit'      => $limit,
    'count'      => count($properties),
    'hasMore'    => ($offset + count($properties)) < $total,
    'properties' => $properties,
    'suggested'  => $suggestedProperties
]);
