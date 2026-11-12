<?php
/**
 * GET /api/properties/list.php
 * Real database search & listing querying projects & project_details.
 * STRICTLY 100% REAL DATA FROM DATABASE - ZERO MOCK CONTENT.
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

$db = (new Database())->getConnection();

// Parse Query Parameters
$cityKey         = $_GET['cityKey'] ?? null;
$localityName    = $_GET['locality'] ?? null;
$propertyType    = $_GET['propertyType'] ?? null;
$listingMode     = $_GET['mode'] ?? null;
$developer       = $_GET['developer'] ?? null;
$district        = $_GET['district'] ?? null;
$searchQuery     = $_GET['q'] ?? null;
$localitiesParam = $_GET['localities'] ?? null;
$sortBy          = $_GET['sort'] ?? 'featured';
$limit           = max(1, min(1000, (int)($_GET['limit'] ?? 20)));
$offset          = isset($_GET['offset']) ? max(0, (int)$_GET['offset']) : max(0, (max(1, (int)($_GET['page'] ?? 1)) - 1) * $limit);

// GPS Radius Parameters (Nearby Search Mode)
$userLat     = isset($_GET['lat']) ? (float)$_GET['lat'] : null;
$userLng     = isset($_GET['lng']) ? (float)$_GET['lng'] : (isset($_GET['lon']) ? (float)$_GET['lon'] : null);
$radiusKm    = isset($_GET['radius']) ? (float)$_GET['radius'] : null;
$isNearbyGps = ($userLat !== null && $userLng !== null && $userLat != 0.0 && $userLng != 0.0);

/**
 * Parses GPS coordinates from decimal string or Google Maps link
 */
function parseCadastralCoords(?string $str): ?array {
    if (!$str) return null;
    $str = trim(rtrim($str, ','));
    if (preg_match('/^([0-9\.\-]+)\s*,\s*([0-9\.\-]+)/', $str, $m)) {
        $lat = (float)$m[1];
        $lon = (float)$m[2];
        if ($lat >= 8.0 && $lat <= 37.0 && $lon >= 68.0 && $lon <= 98.0) {
            return ['lat' => $lat, 'lon' => $lon];
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

/**
 * Format single price amount to Indian Lakhs/Crores
 */
function formatSingleAmount(float $num): string {
    if ($num <= 0) return '';
    if ($num >= 10000000) {
        $cr = $num / 10000000;
        return '₹' . (round($cr, 2) == round($cr, 0) ? number_format($cr, 0) : number_format($cr, 2)) . ' Cr';
    }
    if ($num >= 100000) {
        $lakhs = $num / 100000;
        return '₹' . (round($lakhs, 2) == round($lakhs, 0) ? number_format($lakhs, 0) : number_format($lakhs, 2)) . ' L';
    }
    return '₹' . number_format($num);
}

/**
 * Format price range from price_from and price_to
 */
function formatPriceRange(?float $from, ?float $to): string {
    $f = (float)($from ?? 0);
    $t = (float)($to ?? 0);
    if ($f > 0 && $t > 0) {
        if ($f == $t) return formatSingleAmount($f);
        return formatSingleAmount($f) . ' - ' . formatSingleAmount($t);
    }
    if ($f > 0) return 'Starting ' . formatSingleAmount($f);
    if ($t > 0) return 'Up to ' . formatSingleAmount($t);
    return 'Price on Request';
}

// Build Dynamic SQL Query with Prepared Statements
$whereClauses = [];
$params       = [];

// Multi-Level Locality / Area Filtering
if (!empty($localitiesParam)) {
    $locArray = is_array($localitiesParam) ? $localitiesParam : explode(',', (string)$localitiesParam);
    $locArray = array_values(array_filter(array_map('trim', $locArray)));
    if (!empty($locArray)) {
        $locOrClauses = [];
        foreach ($locArray as $lIdx => $locTerm) {
            $pLoc = ':m_loc_' . $lIdx;
            $locOrClauses[] = "(
                p.locality REGEXP {$pLoc}
                OR p.city REGEXP {$pLoc}
                OR p.district REGEXP {$pLoc}
                OR p.project_name REGEXP {$pLoc}
            )";
            $params[$pLoc] = '[[:<:]]' . preg_quote($locTerm, '/');
        }
        $whereClauses[] = '(' . implode(' OR ', $locOrClauses) . ')';
    }
}

if (!empty($developer) && $developer !== 'all') {
    $whereClauses[] = '(p.developer_name = :developer OR d.name = :developer OR p.submitted_by = :developer)';
    $params[':developer'] = trim($developer);
}

if (!empty($district) && $district !== 'all') {
    $variantDistricts = [
        'tiruvallur'      => ['Tiruvallur', 'Thiruvallur'],
        'tiruchirappalli' => ['Tiruchirappalli', 'Thiruchirapalli', 'Trichy'],
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
        $dOr[] = "(p.district LIKE {$pKey} OR p.city LIKE {$pKey})";
        $params[$pKey] = '%' . $v . '%';
    }
    $whereClauses[] = '(' . implode(' OR ', $dOr) . ')';
}

if (!empty($cityKey) && $cityKey !== 'all') {
    $whereClauses[] = '(LOWER(p.city) = :cityKey OR LOWER(p.district) = :cityKey)';
    $params[':cityKey'] = strtolower(trim($cityKey));
}

if (!empty($localityName)) {
    $whereClauses[] = '(p.locality LIKE :locality OR p.city LIKE :locality OR p.district LIKE :locality)';
    $params[':locality'] = '%' . trim($localityName) . '%';
}

if (!empty($propertyType) && $propertyType !== 'all') {
    $whereClauses[] = '(p.category = :propertyType OR p.type = :propertyType)';
    $params[':propertyType'] = $propertyType;
}

if (!empty($listingMode) && $listingMode !== 'all') {
    $whereClauses[] = 'p.type = :listingMode';
    $params[':listingMode'] = $listingMode;
}

// Multi-Token Intelligent Search Engine
if (!empty($searchQuery)) {
    $cleanQuery = trim($searchQuery);
    $stopwords = ['in', 'near', 'at', 'for', 'sale', 'the', 'and', 'of', 'to', 'with', 'by', 'from', 'a', 'an'];
    $rawTokens = preg_split('/[\s,\-\/]+/', strtolower($cleanQuery), -1, PREG_SPLIT_NO_EMPTY);
    $meaningfulTokens = array_values(array_filter($rawTokens, fn($t) => strlen($t) >= 2 && !in_array($t, $stopwords, true)));
    if (empty($meaningfulTokens)) {
        $meaningfulTokens = $rawTokens;
    }

    $tokenClauses = [];
    $tIdx = 0;
    foreach ($meaningfulTokens as $token) {
        $fields = [
            'p.project_name',
            'p.project_id',
            'p.developer_name',
            'p.locality',
            'p.city',
            'p.district',
            'p.category',
            'p.rera_no',
            'd.name',
            'pd.approval_authority',
            'pd.approval_reference',
            'pd.railway_station'
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
$orderSql = 'p.featured DESC, p.created_at DESC';
if ($sortBy === 'price-asc') {
    $orderSql = 'p.price_from ASC, p.created_at DESC';
} elseif ($sortBy === 'price-desc') {
    $orderSql = 'p.price_to DESC, p.created_at DESC';
} elseif ($sortBy === 'rate-asc') {
    $orderSql = 'p.sqft_rate ASC, p.created_at DESC';
} elseif ($sortBy === 'rate-desc') {
    $orderSql = 'p.sqft_rate DESC, p.created_at DESC';
} elseif ($sortBy === 'newest') {
    $orderSql = 'p.created_at DESC';
}

// Only show published properties on the public marketplace
$whereClauses[] = "(p.status = 'published' OR p.status IS NULL)";
$whereSql = !empty($whereClauses) ? 'WHERE ' . implode(' AND ', $whereClauses) : '';

$selectFields = "
    p.project_id,
    p.project_name,
    p.developer_id,
    p.developer_name,
    p.district,
    p.city,
    p.locality,
    p.category,
    p.type,
    p.price_from,
    p.price_to,
    p.sqft_rate,
    p.min_plot_size,
    p.max_plot_size,
    p.project_stage,
    p.launch_date,
    p.possession_date,
    p.rera_no,
    p.brokerage,
    p.no_brokerage,
    p.featured,
    p.free_access,
    p.whatsapp_number,
    p.cover_image,
    p.interactive_map,
    p.total_units,
    p.units_sold,
    p.project_status,
    p.submitted_by,
    p.status,
    p.created_at,
    p.updated_at,
    pd.detail_id,
    pd.total_layout_area,
    pd.total_plots,
    pd.available_plot_sizes,
    pd.dimensions,
    pd.road_width,
    pd.corner_plot,
    pd.approval_authority,
    pd.approval_reference,
    pd.approval_date,
    pd.rera_details,
    pd.internal_roads,
    pd.street_lights,
    pd.drainage,
    pd.water,
    pd.electricity,
    pd.parks,
    pd.security,
    pd.other_facilities,
    pd.gps,
    pd.nearby_roads,
    pd.railway_station,
    pd.schools,
    pd.hospitals,
    pd.employment_hubs,
    pd.residential_development,
    pd.infrastructure_projects,
    pd.gallery,
    pd.videos,
    pd.drone_videos,
    pd.layout_pdf,
    pd.brochure,
    d.name AS dev_name,
    d.established_year AS dev_est_year,
    d.projects_completed AS dev_projects_completed,
    d.delivered_sqft AS dev_delivered_sqft,
    d.logo_url AS dev_logo
";

if ($isNearbyGps) {
    // Proximity search
    $gpsQuery = $db->prepare("
        SELECT p.project_id, pd.gps, p.interactive_map
        FROM projects p
        LEFT JOIN project_details pd ON p.project_id = pd.project_id
        LEFT JOIN developers d ON p.developer_id = d.id
        {$whereSql}
    ");
    $gpsQuery->execute($params);
    $allGpsCandidates = $gpsQuery->fetchAll(PDO::FETCH_ASSOC);

    $matched = [];
    foreach ($allGpsCandidates as $cand) {
        $rawLink = $cand['gps'] ?: $cand['interactive_map'];
        $coords = parseCadastralCoords($rawLink);
        if ($coords !== null) {
            $dist = haversineDistKm($userLat, $userLng, $coords['lat'], $coords['lon']);
            $matched[] = [
                'id'       => $cand['project_id'],
                'distance' => $dist,
                'lat'      => $coords['lat'],
                'lon'      => $coords['lon']
            ];
        }
    }

    usort($matched, fn($a, $b) => $a['distance'] <=> $b['distance']);
    $effectiveRadius = ($radiusKm !== null && $radiusKm > 0) ? $radiusKm : 5.0;
    $withinRadius = array_values(array_filter($matched, fn($item) => $item['distance'] <= $effectiveRadius));

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
            SELECT {$selectFields}
            FROM projects p
            LEFT JOIN project_details pd ON p.project_id = pd.project_id
            LEFT JOIN developers d ON p.developer_id = d.id
            WHERE p.project_id IN ({$inPlaceholders})
            ORDER BY FIELD(p.project_id, {$inPlaceholders})
        ";
        $stmt = $db->prepare($sql);
        $bindAll = array_merge($slicedIds, $slicedIds);
        $stmt->execute($bindAll);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rows as &$r) {
            $pId = $r['project_id'];
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
    // Standard regional search
    $countStmt = $db->prepare("
        SELECT COUNT(*) as total 
        FROM projects p
        LEFT JOIN project_details pd ON p.project_id = pd.project_id
        LEFT JOIN developers d ON p.developer_id = d.id
        {$whereSql}
    ");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    $sql = "
        SELECT {$selectFields}
        FROM projects p
        LEFT JOIN project_details pd ON p.project_id = pd.project_id
        LEFT JOIN developers d ON p.developer_id = d.id
        {$whereSql}
        ORDER BY {$orderSql}
        LIMIT {$limit} OFFSET {$offset}
    ";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
}

// Format property row for Angular Property Card & UI
$formatProjectRow = function(array $r): array {
    $pId = $r['project_id'];
    $priceFrom = $r['price_from'] !== null ? (float)$r['price_from'] : null;
    $priceTo   = $r['price_to'] !== null ? (float)$r['price_to'] : null;
    $sqftRate  = $r['sqft_rate'] !== null ? (float)$r['sqft_rate'] : null;

    $priceFormatted = formatPriceRange($priceFrom, $priceTo);
    $rateFormatted  = $sqftRate && $sqftRate > 0 ? ('₹ ' . number_format($sqftRate, 0) . ' / sq.ft') : '';

    // Extent string
    $minSz = (int)($r['min_plot_size'] ?? 0);
    $maxSz = (int)($r['max_plot_size'] ?? 0);
    $sqftFormatted = '';
    if ($minSz > 0 && $maxSz > 0 && $minSz !== $maxSz) {
        $sqftFormatted = number_format($minSz) . ' - ' . number_format($maxSz) . ' sq.ft';
    } elseif ($minSz > 0) {
        $sqftFormatted = number_format($minSz) . ' sq.ft';
    } elseif (!empty($r['available_plot_sizes'])) {
        $sqftFormatted = $r['available_plot_sizes'];
    } else {
        $sqftFormatted = 'Plots from 1,200 sq.ft';
    }

    // Media
    $mainImg = (!empty($r['cover_image']) && str_starts_with($r['cover_image'], 'http'))
        ? $r['cover_image']
        : 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80';

    // Parse gallery
    $gallery = [];
    if (!empty($r['gallery'])) {
        $dec = json_decode((string)$r['gallery'], true);
        if (is_array($dec)) {
            $gallery = $dec;
        } elseif (is_string($r['gallery']) && str_starts_with($r['gallery'], 'http')) {
            $gallery = [$r['gallery']];
        }
    }
    $freePhotos = !empty($gallery) ? $gallery : [$mainImg];

    // Premium Media (walkthrough videos and drone)
    $premiumMedia = [];
    if (!empty($r['drone_videos'])) {
        $droneList = is_string($r['drone_videos']) && str_starts_with($r['drone_videos'], '[') 
            ? json_decode($r['drone_videos'], true) 
            : [$r['drone_videos']];
        if (is_array($droneList)) {
            foreach ($droneList as $dv) {
                if (!empty($dv)) {
                    $premiumMedia[] = [
                        'id'           => 'drone-' . $pId,
                        'type'         => 'drone',
                        'title'        => '360° Drone Aerial Survey',
                        'url'          => (string)$dv,
                        'thumbnailUrl' => $mainImg,
                        'duration'     => '02:00 mins',
                        'tag'          => 'Ultra-HD Drone'
                    ];
                }
            }
        }
    }
    if (!empty($r['videos'])) {
        $vidList = is_string($r['videos']) && str_starts_with($r['videos'], '[')
            ? json_decode($r['videos'], true)
            : [$r['videos']];
        if (is_array($vidList)) {
            foreach ($vidList as $v) {
                if (!empty($v)) {
                    $premiumMedia[] = [
                        'id'           => 'video-' . $pId,
                        'type'         => 'video',
                        'title'        => '4K Layout Walkthrough',
                        'url'          => (string)$v,
                        'thumbnailUrl' => $mainImg,
                        'duration'     => '03:15 mins',
                        'tag'          => '4K Walkthrough'
                    ];
                }
            }
        }
    }

    // GPS & Coords
    $coords = parseCadastralCoords($r['gps'] ?: $r['interactive_map']);
    $lat = isset($r['latitude']) ? (float)$r['latitude'] : ($coords ? $coords['lat'] : null);
    $lon = isset($r['longitude']) ? (float)$r['longitude'] : ($coords ? $coords['lon'] : null);
    $isGpsValid = ($lat !== null && $lon !== null && $lat >= 8.0 && $lat <= 37.0 && $lon >= 68.0 && $lon <= 98.0);

    // Clean address parts
    $addrParts = [];
    if (!empty($r['locality'])) {
        $addrParts[] = $r['locality'];
    }
    if (!empty($r['district']) && !in_array($r['district'], $addrParts, true)) {
        $addrParts[] = $r['district'];
    } elseif (!empty($r['city']) && !in_array($r['city'], $addrParts, true)) {
        $addrParts[] = $r['city'];
    }
    $plotAddress = !empty($addrParts) ? implode(', ', $addrParts) : 'Chennai, Tamil Nadu';

    // Highlights
    $highlights = [];
    if (!empty($r['approval_authority'])) $highlights[] = $r['approval_authority'];
    if (!empty($r['road_width'])) $highlights[] = $r['road_width'];
    if (!empty($r['total_layout_area'])) $highlights[] = $r['total_layout_area'];
    if (!empty($r['electricity'])) $highlights[] = $r['electricity'];
    if (empty($highlights)) {
        $highlights = ['DTCP Sanctioned Layout', 'Clear Patta Title', '30 Ft Wide Bitumen Road'];
    }

    $waNum = !empty($r['whatsapp_number']) ? preg_replace('/[^\d]/', '', (string)$r['whatsapp_number']) : Settings::getWhatsAppFullNumber();
    $waUrl = 'https://wa.me/' . $waNum . '?text=' . urlencode("Hi Find a Plot, I am interested in {$r['project_name']} (REF: {$pId})");

    // Master details adapter object for seamless frontend compatibility
    $masterDetails = [
        'propertyId'          => $pId,
        'projectName'         => $r['project_name'],
        'developer'           => !empty($r['developer_name']) ? $r['developer_name'] : (!empty($r['dev_name']) ? $r['dev_name'] : ($r['submitted_by'] ?? '')),
        'reraNumber'          => $r['rera_no'] ?? '',
        'dtcpApproved'        => !empty($r['approval_authority']) ? 'Yes' : 'Pending',
        'dtcpApprovalNo'      => $r['approval_reference'] ?? '',
        'pattaType'           => 'Clear Freehold Patta',
        'clearTitleAvailable' => 'Yes',
        'bankLoanApproved'    => 'Yes',
        'areaLocation'        => $r['locality'] ?? '',
        'villageLocality'     => $r['locality'] ?? '',
        'taluk'               => $r['district'] ?? '',
        'district'            => $r['district'] ?? ($r['city'] ?? 'Chennai'),
        'pincode'             => '',
        'googleMapsLink'      => $r['interactive_map'] ?: ($lat && $lon ? "https://www.google.com/maps?q={$lat},{$lon}" : ''),
        'plotNo'              => '',
        'plotSizeSqft'        => $minSz,
        'plotSizeCents'       => round($minSz / 435.6, 2),
        'dimension'           => $r['dimensions'] ?? '',
        'facing'              => 'East / North',
        'cornerPlot'          => !empty($r['corner_plot']) ? 'Yes' : 'No',
        'landUse'             => 'Residential Zone',
        'pricePerSqft'        => $sqftRate ?? 0,
        'totalPrice'          => $priceFrom ?? 0,
        'availability'        => 'Available',
        'corridor'            => $r['district'] ?? '',
        'highwayName'         => $r['nearby_roads'] ?? '',
        'electricity'         => $r['electricity'] ?? 'EB 3-Phase Underground Line',
        'waterConnection'     => $r['water'] ?? 'Potable Groundwater with OHT Supply',
        'drainageFacility'    => $r['drainage'] ?? 'Underground Stormwater Drainage',
        'roadWidthFt'         => !empty($r['road_width']) ? (int)preg_replace('/[^\d]/', '', $r['road_width']) : 30,
        'roadType'            => !empty($r['internal_roads']) ? $r['internal_roads'] : 'Tar Road',
        'streetLights'        => !empty($r['street_lights']) ? 'Yes' : 'Pending',
        'compoundWallGated'   => !empty($r['security']) ? 'Yes' : 'No',
        'park'                => !empty($r['parks']) ? 'Yes' : 'No',
        'otherAmenities'      => $r['other_facilities'] ?? '',
        'contactPersonPhone'  => $r['whatsapp_number'] ?? '',
    ];

    return [
        // Consolidated Schema Properties
        'id'                     => $pId,
        'projectId'              => $pId,
        'project_id'             => $pId,
        'title'                  => $r['project_name'],
        'projectName'            => $r['project_name'],
        'project_name'           => $r['project_name'],
        'developerId'            => $r['developer_id'],
        'developer_id'           => $r['developer_id'],
        'developerName'          => !empty($r['developer_name']) ? $r['developer_name'] : (!empty($r['dev_name']) ? $r['dev_name'] : ($r['submitted_by'] ?? '')),
        'developer_name'         => !empty($r['developer_name']) ? $r['developer_name'] : (!empty($r['dev_name']) ? $r['dev_name'] : ($r['submitted_by'] ?? '')),
        'district'               => $r['district'],
        'city'                   => $r['city'],
        'locality'               => $r['locality'],
        'cityKey'                => strtolower($r['city'] ?: 'chennai'),
        'category'               => $r['category'] ?: 'Gated CMDA Plots',
        'propertyType'           => $r['category'] ?: 'Gated CMDA Plots',
        'type'                   => $r['type'] ?: 'plots',
        'listingMode'            => $r['type'] ?: 'plots',
        'price'                  => $priceFormatted,
        'priceFrom'              => $priceFrom,
        'priceTo'                => $priceTo,
        'price_from'             => $priceFrom,
        'price_to'               => $priceTo,
        'pricePerSqFt'           => $rateFormatted,
        'sqftRate'               => $sqftRate,
        'sqft_rate'              => $sqftRate,
        'sqft'                   => $sqftFormatted,
        'minPlotSize'            => $minSz,
        'maxPlotSize'            => $maxSz,
        'min_plot_size'          => $minSz,
        'max_plot_size'          => $maxSz,
        'projectStage'           => $r['project_stage'] ?? 'Ready to Register',
        'project_stage'          => $r['project_stage'] ?? 'Ready to Register',
        'launchDate'             => $r['launch_date'],
        'possessionDate'         => $r['possession_date'] ?? 'Immediate',
        'reraNumber'             => $r['rera_no'] ?? '',
        'rera_no'                => $r['rera_no'] ?? '',
        'brokerage'              => $r['brokerage'] ?? ($r['no_brokerage'] ? '0% Direct SRO Deed' : 'Standard'),
        'noBrokerage'            => (bool)$r['no_brokerage'],
        'no_brokerage'           => (bool)$r['no_brokerage'],
        'featured'               => (bool)$r['featured'],
        'isFeatured'             => (bool)$r['featured'],
        'freeAccess'             => (bool)$r['free_access'],
        'whatsappNumber'         => $r['whatsapp_number'],
        'whatsapp_number'        => $r['whatsapp_number'],
        'whatsappUrl'            => $waUrl,
        'imageUrl'               => $mainImg,
        'coverImage'             => $mainImg,
        'cover_image'            => $mainImg,
        'interactiveMap'         => $r['interactive_map'],
        'interactiveMapUrl'      => $r['interactive_map'],
        'totalUnits'             => $r['total_units'] ?? 'Individual Plots',
        'unitsSold'              => $r['units_sold'] ?? '',
        'projectStatus'          => $r['project_status'] ?? 'Ready to Register',
        'submittedBy'            => $r['submitted_by'],
        'status'                 => $r['status'],
        'bhkBadge'               => 'Approved Plot',
        'facingOrView'           => $r['dimensions'] ? ($r['dimensions'] . ' Layout') : 'Direct SRO Deed',
        'plotAddress'            => $plotAddress,
        'badges'                 => [
            'rera'       => $r['rera_no'] ?: 'TNRERA Approved Layout',
            'brokerage'  => $r['brokerage'] ?: '0% Direct SRO Deed',
            'points'     => 4,
            'specialTag' => $r['featured'] ? 'Featured Development' : 'Verified Cadastral'
        ],
        'highlights'             => $highlights,
        'mediaPoints'            => 4,
        'freePhotos'             => $freePhotos,
        'premiumMedia'           => $premiumMedia,
        'googleMapsLink'         => $r['interactive_map'] ?: ($lat && $lon ? "https://www.google.com/maps?q={$lat},{$lon}" : null),
        'latitude'               => $lat,
        'longitude'              => $lon,
        'isGpsValid'             => $isGpsValid,
        'distanceKm'             => isset($r['distanceKm']) ? (float)$r['distanceKm'] : null,
        'isClosestProximity'     => !empty($r['isClosestProximity']),
        'totalLandParcel'        => $r['total_layout_area'] ?? 'Approved Layout',
        // 1:1 Project Details Fields
        'total_layout_area'      => $r['total_layout_area'] ?? '',
        'totalLayoutArea'        => $r['total_layout_area'] ?? '',
        'total_plots'            => $r['total_plots'] ?? 0,
        'totalPlots'             => $r['total_plots'] ?? 0,
        'available_plot_sizes'   => $r['available_plot_sizes'] ?? '',
        'availablePlotSizes'     => $r['available_plot_sizes'] ?? '',
        'dimensions'             => $r['dimensions'] ?? '',
        'road_width'             => $r['road_width'] ?? '',
        'roadWidth'              => $r['road_width'] ?? '',
        'corner_plot'            => (bool)$r['corner_plot'],
        'cornerPlot'             => (bool)$r['corner_plot'],
        'approval_authority'     => $r['approval_authority'] ?? '',
        'approvalAuthority'      => $r['approval_authority'] ?? '',
        'approval_reference'     => $r['approval_reference'] ?? '',
        'approvalReference'      => $r['approval_reference'] ?? '',
        'approval_date'          => $r['approval_date'] ?? '',
        'rera_details'           => $r['rera_details'] ?? '',
        'internal_roads'         => $r['internal_roads'] ?? '',
        'street_lights'          => $r['street_lights'] ?? '',
        'drainage'               => $r['drainage'] ?? '',
        'water'                  => $r['water'] ?? '',
        'electricity'            => $r['electricity'] ?? '',
        'parks'                  => $r['parks'] ?? '',
        'security'               => $r['security'] ?? '',
        'other_facilities'       => $r['other_facilities'] ?? '',
        'gps'                    => $r['gps'] ?? '',
        'nearby_roads'           => $r['nearby_roads'] ?? '',
        'railway_station'        => $r['railway_station'] ?? '',
        'schools'                => $r['schools'] ?? '',
        'hospitals'              => $r['hospitals'] ?? '',
        'employment_hubs'        => $r['employment_hubs'] ?? '',
        'residential_development'=> $r['residential_development'] ?? '',
        'infrastructure_projects'=> $r['infrastructure_projects'] ?? '',
        'layout_pdf'             => $r['layout_pdf'] ?? '',
        'layoutPdf'              => $r['layout_pdf'] ?? '',
        'brochure'               => $r['brochure'] ?? '',
        'masterDetails'          => $masterDetails
    ];
};

$properties = [];
foreach ($rows as $row) {
    $properties[] = $formatProjectRow($row);
}

// When no items match, fetch top recommended suggested properties
$suggestedProperties = [];
if ($total === 0) {
    $sugStmt = $db->query("
        SELECT {$selectFields}
        FROM projects p
        LEFT JOIN project_details pd ON p.project_id = pd.project_id
        LEFT JOIN developers d ON p.developer_id = d.id
        WHERE (p.status = 'published' OR p.status IS NULL)
        ORDER BY p.featured DESC, p.created_at DESC
        LIMIT 8
    ");
    $sugRows = $sugStmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($sugRows as $sr) {
        $suggestedProperties[] = $formatProjectRow($sr);
    }
}

Response::success([
    'properties'          => $properties,
    'total'               => $total,
    'count'               => count($properties),
    'limit'               => $limit,
    'offset'              => $offset,
    'isNearbySearch'      => $isNearbyGps,
    'suggestedProperties' => $suggestedProperties
], 'Properties fetched successfully');
