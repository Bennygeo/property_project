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
    'price'             => $prop['price'],
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
], $typeFactsheet);

Response::success($response, 'Property details retrieved successfully');
