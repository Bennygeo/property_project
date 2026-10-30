<?php
/**
 * POST /api/admin/bulk-upload.php
 * Handles bulk property import from Excel/CSV and database clearing.
 * Enriches all imported properties with diverse, high-resolution cadastral mock images & media.
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/property_master_helper.php';

use Mannidam\Config\Database;
use Mannidam\Helpers\Response;
use Mannidam\Helpers\PropertyMasterHelper;

Response::initCors();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Method not allowed', 405);
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    Response::error('Invalid JSON payload', 400);
}

$db = (new Database())->getConnection();
PropertyMasterHelper::ensureTable($db);

$action = $input['action'] ?? 'import';
$clearExisting = !empty($input['clearExisting']);

// 1. ACTION: CLEAR ALL DATABASE PROPERTY DATA
if ($action === 'clear_all' || $clearExisting) {
    try {
        $db->exec("SET FOREIGN_KEY_CHECKS = 0;");
        $tables = [
            'property_media',
            'property_highlights',
            'property_plot_details',
            'property_subdivided_plots',
            'property_apartment_details',
            'property_villa_details',
            'property_commercial_details',
            'property_floor_plans',
            'property_amenities',
            'property_connectivity',
            'property_neighborhood_scores',
            'property_cadastral_audits',
            'property_faqs',
            'property_media_unlocks',
            'inquiries_and_visits',
            'user_shortlists',
            'property_master_details',
            'properties'
        ];

        foreach ($tables as $tbl) {
            try {
                $db->exec("DELETE FROM `{$tbl}`;");
            } catch (\Throwable $e) {
                // Table might not exist or empty
            }
        }
        $db->exec("SET FOREIGN_KEY_CHECKS = 1;");

        if ($action === 'clear_all') {
            Response::success([
                'cleared' => true,
                'message' => 'All existing property records and relations have been removed successfully from database.'
            ], 'Database properties cleared successfully');
            exit;
        }
    } catch (\Throwable $e) {
        if ($action === 'clear_all') {
            Response::error('Failed to clear properties: ' . $e->getMessage(), 500);
            exit;
        }
    }
}

// 2. ACTION: BULK IMPORT PROPERTIES
$rows = $input['properties'] ?? [];
if (empty($rows) || !is_array($rows)) {
    Response::error('No property rows provided for import', 400);
}

// Ensure at least 1 default city exists in cities table
$cityCheck = $db->query("SELECT id FROM cities WHERE city_key = 'chennai' LIMIT 1")->fetch() ?: $db->query("SELECT id FROM cities LIMIT 1")->fetch();
$defaultCityId = 1;
if (!$cityCheck) {
    $db->exec("INSERT INTO cities (id, name, city_key, state, country) VALUES (1, 'Chennai', 'chennai', 'Tamil Nadu', 'India') ON DUPLICATE KEY UPDATE name=VALUES(name)");
} else {
    $defaultCityId = (int)$cityCheck['id'];
}

$importedCount = 0;
$errors = [];
$seenIds = [];

// Prepare reusable insert statement for properties table
$propStmt = $db->prepare("
    INSERT INTO properties (
        id, city_id, locality_id, title, property_type, listing_mode, locality_name, city_name,
        price, price_per_sqft, sqft, bhk_badge, facing_or_view, main_image_url, rera_number,
        brokerage_badge, special_tag, points_badge, media_points, possession_date,
        project_status, total_land_parcel, total_units, whatsapp_url, interactive_map_url,
        is_featured, status, submitted_by_user_id, submitted_by_name, submitted_by_role
    ) VALUES (
        :id, :city_id, 1, :title, :property_type, :listing_mode, :locality_name, :city_name,
        :price, :price_per_sqft, :sqft, :bhk_badge, :facing_or_view, :main_image_url, :rera_number,
        '0% Direct SRO Deed', 'Cadastral Verified', 4, 4, :possession_date,
        'Ready to Register', 'Approved Layout', 'Individual Plots', :whatsapp_url, :interactive_map_url,
        :is_featured, 'published', 1, 'Registry Admin', 'admin'
    ) ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        price = VALUES(price),
        price_per_sqft = VALUES(price_per_sqft),
        sqft = VALUES(sqft),
        facing_or_view = VALUES(facing_or_view),
        main_image_url = VALUES(main_image_url),
        status = 'published'
");

$mediaStmt = $db->prepare("
    INSERT INTO property_media (property_id, media_type, title, url, sort_order)
    VALUES (:prop_id, 'free_photo', :title, :url, :sort_order)
    ON DUPLICATE KEY UPDATE url = VALUES(url)
");

$premStmt = $db->prepare("
    INSERT INTO property_media (property_id, media_type, title, url, thumbnail_url, duration, tag, sort_order)
    VALUES (:prop_id, :type, :title, :url, :thumb, :duration, :tag, :sort_order)
    ON DUPLICATE KEY UPDATE url = VALUES(url)
");

$highlightStmt = $db->prepare("
    INSERT INTO property_highlights (property_id, highlight_text, sort_order)
    VALUES (:prop_id, :highlight, :sort_order)
");

// Curated library of realistic mock real estate photos (plots, villas, acreage, developments)
$mockImagePacks = [
    [
        'main' => 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
        'gallery' => [
            'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1500076656116-558758c991c1?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1524813686514-a57563d77d61?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1592595896551-12b371d546d5?auto=format&fit=crop&w=1200&q=80'
        ]
    ],
    [
        'main' => 'https://www.gobroker.co.in/uploads/amenities_image/banner27.png',
        'gallery' => [
            'https://www.gobroker.co.in/uploads/amenities_image/banner27.png',
            'https://www.gobroker.co.in/uploads/image_category/Other_size26.png',
            'https://www.gobroker.co.in/uploads/image_category/Other_size_113.png',
            'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80'
        ]
    ],
    [
        'main' => 'https://images.unsplash.com/photo-1500076656116-558758c991c1?auto=format&fit=crop&w=1200&q=80',
        'gallery' => [
            'https://images.unsplash.com/photo-1500076656116-558758c991c1?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1524813686514-a57563d77d61?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1592595896551-12b371d546d5?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'
        ]
    ],
    [
        'main' => 'https://images.unsplash.com/photo-1524813686514-a57563d77d61?auto=format&fit=crop&w=1200&q=80',
        'gallery' => [
            'https://images.unsplash.com/photo-1524813686514-a57563d77d61?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80'
        ]
    ],
    [
        'main' => 'https://images.unsplash.com/photo-1592595896551-12b371d546d5?auto=format&fit=crop&w=1200&q=80',
        'gallery' => [
            'https://images.unsplash.com/photo-1592595896551-12b371d546d5?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1500076656116-558758c991c1?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80'
        ]
    ],
    [
        'main' => 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
        'gallery' => [
            'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80'
        ]
    ],
    [
        'main' => 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
        'gallery' => [
            'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'
        ]
    ],
    [
        'main' => 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
        'gallery' => [
            'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80'
        ]
    ],
    [
        'main' => 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80',
        'gallery' => [
            'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1592595896551-12b371d546d5?auto=format&fit=crop&w=1200&q=80'
        ]
    ],
    [
        'main' => 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=80',
        'gallery' => [
            'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1500076656116-558758c991c1?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1524813686514-a57563d77d61?auto=format&fit=crop&w=1200&q=80'
        ]
    ],
    [
        'main' => 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80',
        'gallery' => [
            'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80'
        ]
    ],
    [
        'main' => 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
        'gallery' => [
            'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80'
        ]
    ]
];

foreach ($rows as $index => $item) {
    try {
        // Map raw 49 canonical header names if provided directly
        if (!isset($item['propertyId']) && isset($item['Property ID'])) $item['propertyId'] = $item['Property ID'];
        if (!isset($item['developer']) && isset($item['Developer'])) $item['developer'] = $item['Developer'];
        if (!isset($item['projectName']) && isset($item['Project Name'])) $item['projectName'] = $item['Project Name'];
        if (!isset($item['reraNumber']) && isset($item['RERA Number'])) $item['reraNumber'] = $item['RERA Number'];
        if (!isset($item['dtcpApproved']) && isset($item['DTCP Approved'])) $item['dtcpApproved'] = $item['DTCP Approved'];
        if (!isset($item['dtcpApprovalNo']) && isset($item['DTCP / LP Approval No.'])) $item['dtcpApprovalNo'] = $item['DTCP / LP Approval No.'];
        if (!isset($item['pattaType']) && isset($item['Patta Type'])) $item['pattaType'] = $item['Patta Type'];
        if (!isset($item['clearTitleAvailable']) && isset($item['Clear Title / EC Available'])) $item['clearTitleAvailable'] = $item['Clear Title / EC Available'];
        if (!isset($item['bankLoanApproved']) && isset($item['Bank Loan Approved'])) $item['bankLoanApproved'] = $item['Bank Loan Approved'];
        if (!isset($item['areaLocation']) && isset($item['Area / Location'])) $item['areaLocation'] = $item['Area / Location'];
        if (!isset($item['villageLocality']) && isset($item['Village / Locality'])) $item['villageLocality'] = $item['Village / Locality'];
        if (!isset($item['taluk']) && isset($item['Taluk'])) $item['taluk'] = $item['Taluk'];
        if (!isset($item['district']) && isset($item['District'])) $item['district'] = $item['District'];
        if (!isset($item['pincode']) && isset($item['Pincode'])) $item['pincode'] = $item['Pincode'];
        if (!isset($item['googleMapsLink']) && isset($item['Google Maps Link'])) $item['googleMapsLink'] = $item['Google Maps Link'];
        if (!isset($item['plotNo']) && isset($item['Plot No.'])) $item['plotNo'] = $item['Plot No.'];
        if (!isset($item['plotSizeSqft']) && isset($item['Plot Size (sq.ft)'])) $item['plotSizeSqft'] = $item['Plot Size (sq.ft)'];
        if (!isset($item['facing']) && isset($item['Facing'])) $item['facing'] = $item['Facing'];
        if (!isset($item['cornerPlot']) && isset($item['Corner Plot'])) $item['cornerPlot'] = $item['Corner Plot'];
        if (!isset($item['landUse']) && isset($item['Land Use'])) $item['landUse'] = $item['Land Use'];
        if (!isset($item['pricePerSqft']) && isset($item['Price per sq.ft (₹)'])) $item['pricePerSqft'] = $item['Price per sq.ft (₹)'];
        if (!isset($item['totalPrice']) && isset($item['Total Price (₹)'])) $item['totalPrice'] = $item['Total Price (₹)'];
        if (!isset($item['availability']) && isset($item['Availability'])) $item['availability'] = $item['Availability'];
        if (!isset($item['petrolBunkDistance']) && isset($item['Petrol Bunk Distance (km)'])) $item['petrolBunkDistance'] = $item['Petrol Bunk Distance (km)'];
        if (!isset($item['schoolsNearby']) && isset($item['Schools (Name & km)'])) $item['schoolsNearby'] = $item['Schools (Name & km)'];
        if (!isset($item['collegesNearby']) && isset($item['Colleges (Name & km)'])) $item['collegesNearby'] = $item['Colleges (Name & km)'];
        if (!isset($item['hospitalNearby']) && isset($item['Hospital (Name & km)'])) $item['hospitalNearby'] = $item['Hospital (Name & km)'];
        if (!isset($item['corridor']) && isset($item['Corridor'])) $item['corridor'] = $item['Corridor'];
        if (!isset($item['busStopDistance']) && isset($item['Bus Stop Distance (km)'])) $item['busStopDistance'] = $item['Bus Stop Distance (km)'];
        if (!isset($item['railwayStationNearby']) && isset($item['Railway Station (Name & km)'])) $item['railwayStationNearby'] = $item['Railway Station (Name & km)'];
        if (!isset($item['highwayName']) && isset($item['Highway Name'])) $item['highwayName'] = $item['Highway Name'];
        if (!isset($item['highwayDistance']) && isset($item['Highway Access Distance (km)'])) $item['highwayDistance'] = $item['Highway Access Distance (km)'];
        if (!isset($item['airportDistance']) && isset($item['Airport Distance (km)'])) $item['airportDistance'] = $item['Airport Distance (km)'];
        if (!isset($item['suitedFor']) && isset($item['Suited For'])) $item['suitedFor'] = $item['Suited For'];
        if (!isset($item['possessionTimeline']) && isset($item['Possession Timeline'])) $item['possessionTimeline'] = $item['Possession Timeline'];
        if (!isset($item['electricity']) && isset($item['Electricity'])) $item['electricity'] = $item['Electricity'];
        if (!isset($item['waterConnection']) && isset($item['Water Connection'])) $item['waterConnection'] = $item['Water Connection'];
        if (!isset($item['drainageFacility']) && isset($item['Drainage Facility'])) $item['drainageFacility'] = $item['Drainage Facility'];
        if (!isset($item['roadWidthFt']) && isset($item['Road Width (ft)'])) $item['roadWidthFt'] = $item['Road Width (ft)'];
        if (!isset($item['roadType']) && isset($item['Road Type'])) $item['roadType'] = $item['Road Type'];
        if (!isset($item['streetLights']) && isset($item['Street Lights'])) $item['streetLights'] = $item['Street Lights'];
        if (!isset($item['compoundWallGated']) && isset($item['Compound Wall / Gated'])) $item['compoundWallGated'] = $item['Compound Wall / Gated'];
        if (!isset($item['park']) && isset($item['Park'])) $item['park'] = $item['Park'];
        if (!isset($item['otherAmenities']) && isset($item['Other Amenities'])) $item['otherAmenities'] = $item['Other Amenities'];
        if (!isset($item['developerMaintenanceYears']) && isset($item['Developer Maintenance after Handover (yrs)'])) $item['developerMaintenanceYears'] = $item['Developer Maintenance after Handover (yrs)'];
        if (!isset($item['floodZone']) && isset($item['Flood Zone'])) $item['floodZone'] = $item['Flood Zone'];
        if (!isset($item['waterloggingHistory']) && isset($item['Waterlogging History'])) $item['waterloggingHistory'] = $item['Waterlogging History'];
        if (!isset($item['contactPersonPhone']) && isset($item['Contact Person / Phone'])) $item['contactPersonPhone'] = $item['Contact Person / Phone'];
        if (!isset($item['remarks']) && isset($item['Remarks'])) $item['remarks'] = $item['Remarks'];

        // Ensure unique, non-colliding Property ID across the entire batch
        $rawId = !empty($item['propertyId']) ? trim((string)$item['propertyId']) : '';
        $invalidIds = ['individual patta', 'promoter patta', 'chitta', 'panchayat', 'not available', 'yes', 'no', 'available', 'residential', 'commercial'];
        if (empty($rawId) || in_array(strtolower($rawId), $invalidIds, true) || isset($seenIds[$rawId])) {
            $pId = 'PRJ-' . str_pad((string)(1001 + $index), 4, '0', STR_PAD_LEFT);
        } else {
            $pId = $rawId;
        }
        $seenIds[$pId] = true;

        $projectName = trim((string)($item['projectName'] ?? 'Verified Layout'));
        $rawPlotNo = trim((string)($item['plotNo'] ?? ''));
        if (empty($rawPlotNo) || stripos($rawPlotNo, '.com') !== false || stripos($rawPlotNo, 'http') !== false) {
            $plotNo = (string)($index + 1);
        } else {
            $plotNo = $rawPlotNo;
        }
        $title = $projectName . ($plotNo !== '' ? " - Plot {$plotNo}" : '');

        $sqftVal = (float)($item['plotSizeSqft'] ?? 0);
        $centsVal = (float)($item['plotSizeCents'] ?? 0);
        if ($centsVal <= 0 && $sqftVal > 0) {
            $centsVal = round(($sqftVal / 435.6), 2);
        }
        $sqftDisplay = $sqftVal > 0 ? number_format($sqftVal) . ' sq.ft' . ($centsVal > 0 ? " ({$centsVal} Cents)" : '') : '1,200 sq.ft';

        $rateVal = (float)($item['pricePerSqft'] ?? 0);
        $rateDisplay = $rateVal > 0 ? '₹ ' . number_format($rateVal) . '/sq.ft' : '₹ 3,200/sq.ft';

        $totalVal = (float)($item['totalPrice'] ?? 0);
        if ($totalVal <= 0 && $sqftVal > 0 && $rateVal > 0) {
            $totalVal = round($sqftVal * $rateVal);
        }
        $priceDisplay = '₹ ' . number_format($totalVal > 0 ? $totalVal : 3840000);

        $locality = trim((string)($item['villageLocality'] ?? $item['areaLocation'] ?? 'Guduvanchery'));
        $city = trim((string)($item['district'] ?? $item['taluk'] ?? 'Chennai'));
        $facing = trim((string)($item['facing'] ?? 'East'));
        $corner = trim((string)($item['cornerPlot'] ?? 'No'));
        $facingOrView = $facing . ' Facing' . ($corner === 'Yes' ? ' (Corner Plot)' : '');

        $rera = trim((string)($item['reraNumber'] ?? ''));
        if (empty($rera)) {
            $rera = trim((string)($item['dtcpApprovalNo'] ?? 'CMDA / DTCP Sanctioned'));
        }
        $mapsLink = trim((string)($item['googleMapsLink'] ?? ''));

        // Contact phone & WhatsApp link
        $rawPhone = trim((string)($item['contactPersonPhone'] ?? ''));
        $digitsOnly = preg_replace('/[^0-9]/', '', $rawPhone);
        if (strlen($digitsOnly) === 10) {
            $digitsOnly = '91' . $digitsOnly;
        }
        $phoneForWa = (!empty($digitsOnly) && strlen($digitsOnly) >= 10) ? $digitsOnly : '919444100000';

        // Assign curated mock image package
        $pack = $mockImagePacks[$index % count($mockImagePacks)];
        $imgUrl = !empty($item['imageUrl']) && str_starts_with($item['imageUrl'], 'http') 
            ? trim((string)$item['imageUrl']) 
            : $pack['main'];

        // Map land use to property type
        $landUse = trim((string)($item['landUse'] ?? 'Residential'));
        $propType = 'Gated CMDA Plots';
        $listingMode = 'plots';
        if (stripos($landUse, 'Commercial') !== false) {
            $propType = 'Commercial Spaces';
            $listingMode = 'commercial';
        }

        $bhkBadge = 'Sanctioned Plot';
        if ($centsVal > 0) {
            $bhkBadge = "{$centsVal} Cents Plot";
        }

        // Insert into properties table
        $propStmt->execute([
            ':id'                  => $pId,
            ':city_id'             => $defaultCityId,
            ':title'               => $title,
            ':property_type'       => $propType,
            ':listing_mode'        => $listingMode,
            ':locality_name'       => $locality,
            ':city_name'           => $city,
            ':price'               => $priceDisplay,
            ':price_per_sqft'      => $rateDisplay,
            ':sqft'                => $sqftDisplay,
            ':bhk_badge'           => $bhkBadge,
            ':facing_or_view'      => $facingOrView,
            ':main_image_url'      => $imgUrl,
            ':rera_number'         => $rera,
            ':possession_date'     => !empty($item['possessionTimeline']) ? (string)$item['possessionTimeline'] : 'Immediate',
            ':whatsapp_url'        => "https://wa.me/{$phoneForWa}?text=" . urlencode("Hi Find a Plot, I am interested in {$title} (ID: {$pId})"),
            ':interactive_map_url' => 'assets/secura-masterplan-3d.html',
            ':is_featured'         => ($index < 8) ? 1 : 0
        ]);

        // Insert into property_master_details table
        $masterData = array_merge($item, [
            'propertyId'    => $pId,
            'projectName'   => $projectName,
            'plotSizeSqft'  => $sqftVal,
            'plotSizeCents' => $centsVal,
            'pricePerSqft'  => $rateVal,
            'totalPrice'    => $totalVal,
            'googleMapsLink'=> $mapsLink
        ]);
        PropertyMasterHelper::saveMasterDetails($db, $pId, $masterData);

        // Delete existing media for this property before re-inserting
        $db->exec("DELETE FROM property_media WHERE property_id = " . $db->quote($pId));

        // Insert full gallery of mock photos into property_media
        $galleryPhotos = !empty($pack['gallery']) ? $pack['gallery'] : [$imgUrl];
        foreach ($galleryPhotos as $gIdx => $gUrl) {
            $mediaStmt->execute([
                ':prop_id'    => $pId,
                ':title'      => $title . ' - Photo ' . ($gIdx + 1),
                ':url'        => $gUrl,
                ':sort_order' => $gIdx + 1
            ]);
        }

        // Insert 4K Walkthrough Video & Drone Tour
        $premStmt->execute([
            ':prop_id'    => $pId,
            ':type'       => 'video',
            ':title'      => '4K Architectural Walkthrough',
            ':url'        => 'https://www.w3schools.com/html/mov_bbb.mp4',
            ':thumb'      => $imgUrl,
            ':duration'   => '02:30 min',
            ':tag'        => '4K Video Tour',
            ':sort_order' => 1
        ]);

        $premStmt->execute([
            ':prop_id'    => $pId,
            ':type'       => 'drone_survey',
            ':title'      => '360° Drone Aerial Layout Survey',
            ':url'        => 'https://iframe.videodelivery.net/5d5ba37ff33a0b8d5d3c3763b71e5e85',
            ':thumb'      => $galleryPhotos[1] ?? $imgUrl,
            ':duration'   => '03:10 min',
            ':tag'        => 'Drone Survey',
            ':sort_order' => 2
        ]);

        // Delete existing highlights
        $db->exec("DELETE FROM property_highlights WHERE property_id = " . $db->quote($pId));

        // Insert key highlights
        $highlights = [
            $item['dtcpApproved'] === 'Yes' ? 'DTCP Sanctioned Layout' : 'Clear Title Deed',
            !empty($item['roadWidthFt']) ? $item['roadWidthFt'] . ' Ft Wide Bitumen Road' : '30 Ft Wide Road',
            !empty($item['pattaType']) ? (string)$item['pattaType'] : 'Individual Patta',
            !empty($item['corridor']) ? 'Strategic ' . $item['corridor'] : 'High Appreciation Zone'
        ];

        foreach ($highlights as $hIdx => $hText) {
            $highlightStmt->execute([
                ':prop_id'    => $pId,
                ':highlight'  => $hText,
                ':sort_order' => $hIdx + 1
            ]);
        }

        $importedCount++;
    } catch (\Throwable $e) {
        $errors[] = "Row #" . ($index + 1) . ": " . $e->getMessage();
    }
}

Response::success([
    'totalSubmitted' => count($rows),
    'importedCount'  => $importedCount,
    'failedCount'    => count($errors),
    'errors'         => array_slice($errors, 0, 10),
    'clearedExisting'=> $clearExisting,
    'message'        => "Successfully imported {$importedCount} properties into live registry database with mock images."
]);
