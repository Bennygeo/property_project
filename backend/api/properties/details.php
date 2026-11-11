<?php
/**
 * GET /api/properties/details.php?id={id}
 * Returns comprehensive 100acress-style property dossier with all relations:
 * - Floor Plans, Typologies & Dimensions
 * - Specific Factsheets (Villa, Apartment, Plot, Commercial)
 * - Free Photos, 4K Walkthrough & Drone Surveys
 * - Cadastral Audit & Legal Title
 * - Amenities & Connectivity Benchmarks
 * - Developer Profile & FAQs
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

$id = $_GET['id'] ?? null;
if (empty($id)) {
    Response::error('Property ID is required', 400);
}

$db = (new Database())->getConnection();

// 1. Fetch Core Property Record
$propStmt = $db->prepare("
    SELECT 
        p.*,
        COALESCE(c.city_key, LOWER(p.city_name), 'chennai') AS cityKey,
        d.id AS dev_id,
        d.name AS dev_name,
        d.established_year AS dev_est_year,
        d.projects_completed AS dev_projects_completed,
        d.delivered_sqft AS dev_delivered_sqft,
        d.on_time_track AS dev_on_time,
        d.corporate_office AS dev_office,
        d.about_text AS dev_about,
        d.logo_url AS dev_logo
    FROM properties p
    LEFT JOIN cities c ON p.city_id = c.id
    LEFT JOIN developers d ON p.developer_id = d.id
    WHERE p.id = ?
    LIMIT 1
");
$propStmt->execute([$id]);
$prop = $propStmt->fetch();

if (!$prop) {
    Response::error('Property not found', 404);
}

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

// =========================================================================
// PRD M06 / VIEW LIMITER & ENTITLEMENT ENGINE
// Limits:
// - Free user (Explorer) / Guest: 2 project details
// - Smart Buyer: 5 project details
// - Priority Buyer: 25 project details
// - VIP Concierge: 50 project details
// Repeat views of previously viewed/unlocked projects do not burn credits.
// When limit is exceeded, details below the banner ARE NOT DOWNLOADED from DB.
// =========================================================================

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

$userId = isset($_GET['userId']) ? max(0, (int)$_GET['userId']) : 0;
$deviceHash = trim((string)($_GET['deviceHash'] ?? ''));
$clientIp = resolveClientIp();

$isViewRestricted = false;
$activePlanId = 'explorer';
$activePlanName = 'Free Explorer';
$projectViewsUsed = 0;
$projectViewLimit = 2; // Default for Free
$upgradeMessage = '';

if ($userId > 0) {
    // 1. Authenticated User flow
    $entStmt = $db->prepare("SELECT * FROM user_entitlements WHERE user_id = ?");
    $entStmt->execute([$userId]);
    $ent = $entStmt->fetch(PDO::FETCH_ASSOC);

    if (!$ent) {
        // Initialize Free (Explorer) with 2 views
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

    // Enforce canonical tier limits
    $planLimitsMap = [
        'explorer'       => 2,
        'smart_buyer'    => 5,
        'priority_buyer' => 25,
        'vip_concierge'  => 50
    ];
    $projectViewLimit = $planLimitsMap[$activePlanId] ?? (int)($ent['project_view_limit'] ?: 2);
    $projectViewsUsed = (int)($ent['project_views_used'] ?? 0);

    // Check if user has already viewed this property
    $checkView = $db->prepare("
        SELECT id FROM user_project_views 
        WHERE user_id = ? AND UPPER(TRIM(property_id)) = UPPER(TRIM(?))
        LIMIT 1
    ");
    $checkView->execute([$userId, $id]);
    $existingView = $checkView->fetch(PDO::FETCH_ASSOC);

    if ($existingView) {
        // Already unlocked in private dossier: repeat view permitted at zero credit cost
        $isViewRestricted = false;
    } else {
        if ($projectViewsUsed < $projectViewLimit) {
            // Credit available: consume 1 view & record in user_project_views
            $isViewRestricted = false;
            try {
                $insView = $db->prepare("INSERT INTO user_project_views (user_id, property_id, viewed_at) VALUES (?, ?, NOW())");
                $insView->execute([$userId, $id]);

                $updEnt = $db->prepare("UPDATE user_entitlements SET project_views_used = project_views_used + 1 WHERE user_id = ?");
                $updEnt->execute([$userId]);
                $projectViewsUsed++;
            } catch (\Throwable $e) {}
        } else {
            // Limit reached!
            $isViewRestricted = true;
            $upgradeMessage = "You have reached your limit of {$projectViewLimit} project views on the {$activePlanName} plan. Upgrade to view full project specifications, cadastral audit, layout plots, and legal documents.";
        }
    }
} else {
    // 2. Unauthenticated Guest flow (tracked by IP and device fingerprint)
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
    $projectViewLimit = 2; // Free user gets 2 project details

    $stmt = $db->prepare("
        SELECT DISTINCT property_id 
        FROM guest_device_views 
        WHERE ip_address = ? OR (device_hash = ? AND device_hash != '')
    ");
    $stmt->execute([$clientIp, $deviceHash]);
    $viewedRows = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $viewedPropertyIds = array_values(array_filter(array_unique($viewedRows)));

    if (in_array($id, $viewedPropertyIds, true)) {
        // Repeat view of unlocked property
        $isViewRestricted = false;
        $projectViewsUsed = count($viewedPropertyIds);
    } else {
        if (count($viewedPropertyIds) < $projectViewLimit) {
            // Under free limit: record view
            $isViewRestricted = false;
            try {
                $insGuest = $db->prepare("INSERT IGNORE INTO guest_device_views (ip_address, device_hash, property_id, viewed_at) VALUES (?, ?, ?, NOW())");
                $insGuest->execute([$clientIp, $deviceHash, $id]);
            } catch (\Throwable $e) {}
            $projectViewsUsed = count($viewedPropertyIds) + 1;
        } else {
            // Free limit (2) reached!
            $isViewRestricted = true;
            $projectViewsUsed = count($viewedPropertyIds);
            $upgradeMessage = "You have reached your free limit of {$projectViewLimit} project views. Sign in or upgrade your membership to unlock full project specifications, cadastral audit, layout plots, and documents.";
        }
    }
}

// IF VIEW IS RESTRICTED: RETURN ONLY HERO BANNER INFO
// CRITICAL: NO DETAILS BELOW BANNER ARE QUERIED OR DOWNLOADED FROM DB
if ($isViewRestricted) {
    $freePhotos = [$prop['main_image_url']];
    $response = [
        'id'                     => $prop['id'],
        'title'                  => $prop['title'],
        'propertyType'           => $prop['property_type'],
        'locality'               => $prop['locality_name'],
        'city'                   => $prop['city_name'],
        'cityKey'                => $prop['cityKey'],
        'price'                  => formatIndianPrice($prop['price']),
        'pricePerSqFt'           => $prop['price_per_sqft'],
        'sqft'                   => $prop['sqft'],
        'bhkBadge'               => $prop['bhk_badge'],
        'facingOrView'           => $prop['facing_or_view'],
        'imageUrl'               => $prop['main_image_url'],
        'badges'                 => [
            'rera'               => $prop['rera_number'],
            'brokerage'          => $prop['brokerage_badge'],
            'points'             => (int)$prop['points_badge'],
            'specialTag'         => $prop['special_tag'],
        ],
        'highlights'             => [],
        'mediaPoints'            => (int)$prop['media_points'],
        'isMediaUnlocked'        => false,
        'freePhotos'             => $freePhotos,
        'premiumMedia'           => [],
        'whatsappUrl'            => $prop['whatsapp_url'],
        'interactiveMapUrl'      => null,
        'possessionDate'         => $prop['possession_date'],
        'projectStatus'          => $prop['project_status'],
        'totalLandParcel'        => $prop['total_land_parcel'],
        'totalUnits'             => $prop['total_units'],
        'floorPlans'             => [],
        'amenitiesList'          => [],
        'connectivity'           => [],
        'neighborhoodScore'      => null,
        'cadastralAudit'         => null,
        'faqs'                   => [],
        'developer'              => null,
        'developerName'          => $prop['dev_name'] ?? null,
        'developerProjectsCount' => 1,
        'masterDetails'          => null,
        'subdividedPlots'        => [],
        // Restriction & Paywall Metadata
        'isViewRestricted'       => true,
        'isMasked'               => true,
        'restrictionReason'      => 'view_limit_reached',
        'activePlanId'           => $activePlanId,
        'activePlanName'         => $activePlanName,
        'projectViewsUsed'       => $projectViewsUsed,
        'projectViewLimit'       => $projectViewLimit,
        'upgradeMessage'         => $upgradeMessage
    ];
    Response::success($response, 'Property banner retrieved (full dossier restricted per membership plan)');
    exit;
}

// 2. Highlights
$hlStmt = $db->prepare("SELECT highlight_text FROM property_highlights WHERE property_id = ? ORDER BY sort_order ASC");
$hlStmt->execute([$id]);
$highlights = $hlStmt->fetchAll(PDO::FETCH_COLUMN);

// 3. Media: Free Photos, 4K Walkthrough & Drone Surveys
$mediaStmt = $db->prepare("SELECT * FROM property_media WHERE property_id = ? ORDER BY sort_order ASC");
$mediaStmt->execute([$id]);
$mediaItems = $mediaStmt->fetchAll();

$freePhotos   = [];
$premiumMedia = [];

foreach ($mediaItems as $m) {
    if ($m['media_type'] === 'free_photo') {
        $freePhotos[] = $m['url'];
    } else {
        $premiumMedia[] = [
            'id'           => (string)$m['id'],
            'type'         => $m['media_type'] === 'drone_survey' ? 'drone' : 'video',
            'title'        => $m['title'],
            'url'          => $m['url'],
            'thumbnailUrl' => $m['thumbnail_url'] ?? $prop['main_image_url'],
            'duration'     => $m['duration'] ?? '02:00 mins',
            'tag'          => $m['tag'] ?? 'Ultra-HD'
        ];
    }
}
if (empty($freePhotos)) {
    $freePhotos = [$prop['main_image_url']];
}

// 4. Floor Plans
$fpStmt = $db->prepare("SELECT * FROM property_floor_plans WHERE property_id = ?");
$fpStmt->execute([$id]);
$fpRows = $fpStmt->fetchAll();
$floorPlans = [];
foreach ($fpRows as $fp) {
    $dimensions = !empty($fp['dimensions_json']) ? json_decode($fp['dimensions_json'], true) : [];
    $floorPlans[] = [
        'id'            => $fp['id'],
        'name'          => $fp['name'],
        'type'          => $fp['type'],
        'superArea'     => $fp['super_area'],
        'carpetArea'    => $fp['carpet_area'],
        'priceEstimate' => $fp['price_estimate'],
        'imageUrl'      => $fp['image_url'],
        'dimensions'    => $dimensions,
    ];
}

// 5. Cadastral Audit
$cadStmt = $db->prepare("SELECT * FROM property_cadastral_audits WHERE property_id = ? LIMIT 1");
$cadStmt->execute([$id]);
$cad = $cadStmt->fetch();
$cadastralAudit = $cad ? [
    'surveyNumber'      => $cad['survey_number'],
    'sroJurisdiction'   => $cad['sro_jurisdiction'],
    'ecStatus'          => $cad['ec_status'],
    'pattaVerification' => $cad['patta_verification'],
    'reraRegNo'         => $cad['rera_reg_no'],
    'circleRate'        => $cad['circle_rate'],
] : null;

// 6. Type-Specific Details Factsheet
$typeFactsheet = [];
if ($prop['property_type'] === 'Independent Villas') {
    $villaStmt = $db->prepare("SELECT * FROM property_villa_details WHERE property_id = ? LIMIT 1");
    $villaStmt->execute([$id]);
    $v = $villaStmt->fetch();
    if ($v) {
        $typeFactsheet['villaDetails'] = [
            'landExtent'       => $v['land_extent'],
            'builtUpArea'      => $v['built_up_area'],
            'carpetArea'       => $v['carpet_area'],
            'privatePool'      => $v['private_pool'],
            'courtyardGarden'  => $v['courtyard_garden'],
            'solarMicrogrid'   => $v['solar_microgrid'],
            'waterAutonomy'    => $v['water_autonomy'],
            'vastuOrientation' => $v['vastu_orientation'],
            'privateElevator'  => $v['private_elevator'],
            'carPortico'       => $v['car_portico'],
        ];
    }
} elseif ($prop['property_type'] === 'Apartments & Flats' || $prop['property_type'] === 'Luxury Penthouses') {
    $aptStmt = $db->prepare("SELECT * FROM property_apartment_details WHERE property_id = ? LIMIT 1");
    $aptStmt->execute([$id]);
    $a = $aptStmt->fetch();
    if ($a) {
        $typeFactsheet['apartmentDetails'] = [
            'towerCount'      => $a['tower_count'],
            'totalFloors'     => $a['total_floors'],
            'unitsPerCore'    => $a['units_per_core'],
            'ceilingHeight'   => $a['ceiling_height'],
            'balconyDeck'     => $a['balcony_deck'],
            'hvacSystem'      => $a['hvac_system'],
            'flooringSpecs'   => $a['flooring_specs'],
            'kitchenFittings' => $a['kitchen_fittings'],
            'parkingBays'     => $a['parking_bays'],
            'clubhouseSize'   => $a['clubhouse_size'],
            'maintenanceFee'  => $a['maintenance_fee'],
        ];
    }
} elseif ($prop['property_type'] === 'Gated CMDA Plots') {
    $plotStmt = $db->prepare("SELECT * FROM property_plot_details WHERE property_id = ? LIMIT 1");
    $plotStmt->execute([$id]);
    $p = $plotStmt->fetch();
    if ($p) {
        $typeFactsheet['plotDetails'] = [
            'layoutSanctionNo'     => $p['layout_sanction_no'],
            'reraLayoutNo'         => $p['rera_layout_no'],
            'frontageRoadWidth'    => $p['frontage_road_width'],
            'waterTableDepth'      => $p['water_table_depth'],
            'soilBearingCapacity'  => $p['soil_bearing_capacity'],
            'fsiPermissible'       => $p['fsi_permissible'],
            'ebSubstation'         => $p['eb_substation'],
            'boundaryWall'         => $p['boundary_wall'],
            'drainageSystem'       => $p['drainage_system'],
            'pattaStatus'          => $p['patta_status'],
            'dimensionRanges'      => $p['dimension_ranges'],
        ];
    }
} elseif ($prop['property_type'] === 'Commercial Spaces') {
    $commStmt = $db->prepare("SELECT * FROM property_commercial_details WHERE property_id = ? LIMIT 1");
    $commStmt->execute([$id]);
    $c = $commStmt->fetch();
    if ($c) {
        $typeFactsheet['commercialDetails'] = [
            'efficiencyRatio' => $c['efficiency_ratio'],
            'rentalYield'     => $c['rental_yield'],
            'leaseTerms'      => $c['lease_terms'],
            'monthlyRental'   => $c['monthly_rental'],
            'powerRedundancy' => $c['power_redundancy'],
            'elevators'       => $c['elevators'],
            'hvacSpecs'       => $c['hvac_specs'],
            'floorPlateSize'  => $c['floor_plate_size'],
        ];
    }
}

// 6B. Subdivided Partitioned Plots
$subdividedPlots = [];
try {
    $subStmt = $db->prepare("SELECT * FROM property_subdivided_plots WHERE property_id = ? ORDER BY id ASC");
    $subStmt->execute([$id]);
    $subRows = $subStmt->fetchAll();
    foreach ($subRows as $row) {
        $subdividedPlots[] = [
            'id'               => (int)$row['id'],
            'plotNo'           => $row['plot_no'],
            'status'           => $row['status'],
            'superBuiltUpYds'  => (float)$row['super_built_up_yds'],
            'netPlotAreaYds'   => (float)$row['net_plot_area_yds'],
            'superBuiltUpSqft' => (int)$row['super_built_up_sqft'],
            'widthMeters'      => (float)$row['width_meters'],
            'lengthMeters'     => (float)$row['length_meters'],
            'widthFeet'        => (float)$row['width_feet'],
            'lengthFeet'       => (float)$row['length_feet'],
            'facing'           => $row['facing'],
            'priceInLakhs'     => (float)$row['price_in_lakhs'],
            'formattedPrice'   => $row['formatted_price'],
            'isCorner'         => (bool)$row['is_corner'],
            'hasTrees'         => (bool)$row['has_trees'],
            'x'                => (float)$row['pos_x'],
            'y'                => (abs((float)$row['pos_y']) < 9.0) 
                                    ? (str_contains(strtolower($row['facing'] ?? ''), 'south') ? -15.0 : 15.0) 
                                    : (float)$row['pos_y'],
            'w'                => (float)$row['size_w'],
            'h'                => (float)$row['size_h']
        ];
    }
} catch (\Throwable $e) {
    // Silently continue if table not yet populated
}

// 7. Amenities
$amenStmt = $db->prepare("SELECT name, icon, category, description AS `desc` FROM property_amenities WHERE property_id = ?");
$amenStmt->execute([$id]);
$amenitiesList = $amenStmt->fetchAll();

// 8. Connectivity
$connStmt = $db->prepare("SELECT title, distance, duration, category, icon FROM property_connectivity WHERE property_id = ?");
$connStmt->execute([$id]);
$connectivity = $connStmt->fetchAll();

// 9. Neighborhood Score
$scoreStmt = $db->prepare("SELECT overall, connectivity, lifestyle, schools_health AS schoolsHealth, green_cover AS greenCover FROM property_neighborhood_scores WHERE property_id = ? LIMIT 1");
$scoreStmt->execute([$id]);
$neighborhoodScore = $scoreStmt->fetch();

// 10. FAQs
$faqStmt = $db->prepare("SELECT question AS q, answer AS a FROM property_faqs WHERE property_id = ? ORDER BY sort_order ASC");
$faqStmt->execute([$id]);
$faqs = $faqStmt->fetchAll();

// Assemble Developer
$developer = !empty($prop['dev_id']) ? [
    'name'              => $prop['dev_name'],
    'establishedYear'   => $prop['dev_est_year'],
    'projectsCompleted' => $prop['dev_projects_completed'],
    'deliveredSqFt'     => $prop['dev_delivered_sqft'],
    'onTimeTrack'       => $prop['dev_on_time'],
    'corporateOffice'   => $prop['dev_office'],
    'aboutText'         => $prop['dev_about'],
] : null;

// 11. Property Master Details from Excel Schema
$masterStmt = $db->prepare("SELECT * FROM property_master_details WHERE property_id = ? LIMIT 1");
$masterStmt->execute([$id]);
$masterRow = $masterStmt->fetch();
$masterDetails = null;
if ($masterRow) {
    $masterDetails = [
        'propertyId'                => $masterRow['property_id'],
        'projectName'               => $masterRow['project_name'],
        'developer'                 => $masterRow['developer'],
        'reraNumber'                => $masterRow['rera_number'],
        'dtcpApproved'              => $masterRow['dtcp_approved'],
        'dtcpApprovalNo'            => $masterRow['dtcp_approval_no'],
        'pattaType'                 => $masterRow['patta_type'],
        'clearTitleAvailable'       => $masterRow['clear_title_available'],
        'bankLoanApproved'          => $masterRow['bank_loan_approved'],
        'areaLocation'              => $masterRow['area_location'],
        'villageLocality'           => $masterRow['village_locality'],
        'taluk'                     => $masterRow['taluk'],
        'district'                  => $masterRow['district'],
        'pincode'                   => $masterRow['pincode'],
        'googleMapsLink'            => $masterRow['google_maps_link'],
        'plotNo'                    => $masterRow['plot_no'],
        'plotSizeSqft'              => (float)$masterRow['plot_size_sqft'],
        'plotSizeCents'             => (float)$masterRow['plot_size_cents'],
        'dimension'                 => $masterRow['dimension'],
        'facing'                    => $masterRow['facing'],
        'cornerPlot'                => $masterRow['corner_plot'],
        'landUse'                   => $masterRow['land_use'],
        'pricePerSqft'              => (float)$masterRow['price_per_sqft'],
        'totalPrice'                => (float)$masterRow['total_price'],
        'availability'              => $masterRow['availability'],
        'petrolBunkDistance'        => $masterRow['petrol_bunk_distance'] !== null ? (float)$masterRow['petrol_bunk_distance'] : null,
        'schoolsNearby'             => $masterRow['schools_nearby'],
        'collegesNearby'            => $masterRow['colleges_nearby'],
        'hospitalNearby'            => $masterRow['hospital_nearby'],
        'corridor'                  => $masterRow['corridor'],
        'busStopDistance'           => $masterRow['bus_stop_distance'] !== null ? (float)$masterRow['bus_stop_distance'] : null,
        'railwayStationNearby'      => $masterRow['railway_station_nearby'],
        'highwayName'               => $masterRow['highway_name'],
        'highwayDistance'           => $masterRow['highway_distance'] !== null ? (float)$masterRow['highway_distance'] : null,
        'airportDistance'           => $masterRow['airport_distance'] !== null ? (float)$masterRow['airport_distance'] : null,
        'suitedFor'                 => $masterRow['suited_for'],
        'possessionTimeline'        => $masterRow['possession_timeline'],
        'electricity'               => $masterRow['electricity'],
        'waterConnection'           => $masterRow['water_connection'],
        'drainageFacility'          => $masterRow['drainage_facility'],
        'roadWidthFt'               => $masterRow['road_width_ft'] !== null ? (int)$masterRow['road_width_ft'] : null,
        'roadType'                  => $masterRow['road_type'],
        'streetLights'              => $masterRow['street_lights'],
        'compoundWallGated'         => $masterRow['compound_wall_gated'],
        'park'                      => $masterRow['park'],
        'otherAmenities'            => $masterRow['other_amenities'],
        'developerMaintenanceYears' => $masterRow['developer_maintenance_years'] !== null ? (int)$masterRow['developer_maintenance_years'] : null,
        'floodZone'                 => $masterRow['flood_zone'],
        'waterloggingHistory'       => $masterRow['waterlogging_history'],
        'contactPersonPhone'        => $masterRow['contact_person_phone'],
        'remarks'                   => $masterRow['remarks'],
    ];
}

// Determine developer projects count (to hide dedicated builder page if only 1 project)
$devName = $masterRow['developer'] ?? ($prop['dev_name'] ?? null);
$developerProjectsCount = 1;
if (!empty($devName)) {
    try {
        $devCountStmt = $db->prepare("
            SELECT COUNT(DISTINCT CASE WHEN TRIM(COALESCE(project_name, '')) != '' THEN TRIM(project_name) ELSE property_id END)
            FROM property_master_details
            WHERE TRIM(developer) = ?
        ");
        $devCountStmt->execute([trim((string)$devName)]);
        $cnt = (int)$devCountStmt->fetchColumn();
        if ($cnt > 0) {
            $developerProjectsCount = $cnt;
        }
    } catch (\Throwable $e) {}
}

// Assemble Final Property Response Payload
$response = array_merge([
    'id'                => $prop['id'],
    'title'             => $prop['title'],
    'propertyType'      => $prop['property_type'],
    'locality'          => $prop['locality_name'],
    'city'              => $prop['city_name'],
    'cityKey'           => $prop['cityKey'],
    'price'             => formatIndianPrice($prop['price']),
    'pricePerSqFt'      => $prop['price_per_sqft'],
    'sqft'              => $prop['sqft'],
    'bhkBadge'          => $prop['bhk_badge'],
    'facingOrView'      => $prop['facing_or_view'],
    'imageUrl'          => $prop['main_image_url'],
    'badges'            => [
        'rera'          => $prop['rera_number'],
        'brokerage'     => $prop['brokerage_badge'],
        'points'        => (int)$prop['points_badge'],
        'specialTag'    => $prop['special_tag'],
    ],
    'highlights'        => $highlights,
    'mediaPoints'       => (int)$prop['media_points'],
    'isMediaUnlocked'   => false,
    'freePhotos'        => $freePhotos,
    'premiumMedia'      => $premiumMedia,
    'whatsappUrl'       => $prop['whatsapp_url'],
    'interactiveMapUrl' => $prop['interactive_map_url'] ?? null,
    'possessionDate'    => $prop['possession_date'],
    'projectStatus'     => $prop['project_status'],
    'totalLandParcel'   => $prop['total_land_parcel'],
    'totalUnits'        => $prop['total_units'],
    'floorPlans'        => $floorPlans,
    'amenitiesList'     => $amenitiesList,
    'connectivity'      => $connectivity,
    'neighborhoodScore' => $neighborhoodScore,
    'cadastralAudit'    => $cadastralAudit,
    'faqs'              => $faqs,
    'developer'         => $developer,
    'developerName'     => $devName,
    'developerProjectsCount' => $developerProjectsCount,
    'masterDetails'     => $masterDetails,
    'subdividedPlots'   => $subdividedPlots,
    // Entitlement & View Metadata
    'isViewRestricted'  => false,
    'isMasked'          => false,
    'restrictionReason' => null,
    'activePlanId'      => $activePlanId,
    'activePlanName'    => $activePlanName,
    'projectViewsUsed'  => $projectViewsUsed,
    'projectViewLimit'  => $projectViewLimit,
    'upgradeMessage'    => null
], $typeFactsheet);

Response::success($response, 'Property details retrieved successfully');
