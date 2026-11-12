<?php
/**
 * POST /api/admin/bulk-upload.php
 * Handles bulk property import and enrichment for consolidated schema:
 * 1. projects (Property Card & Catalog)
 * 2. project_details (Full Specifications, Approvals, Infrastructure & Media)
 * 3. developers (Auto-creates and links missing developers)
 *
 * Fills all missing details in existing database records from the uploaded spreadsheet,
 * or inserts new projects if not already present.
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/settings.php';

use Mannidam\Config\Database;
use Mannidam\Helpers\Response;
use Mannidam\Helpers\Settings;

Response::initCors();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Method not allowed', 405);
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    Response::error('Invalid JSON payload', 400);
}

$db = (new Database())->getConnection();

$action = $input['action'] ?? 'import';
$clearExisting = !empty($input['clearExisting']);

// 1. ACTION: CLEAR ALL DATABASE PROPERTY DATA
if ($action === 'clear_all' || $clearExisting) {
    try {
        $db->exec("SET FOREIGN_KEY_CHECKS = 0;");
        $db->exec("DELETE FROM `project_details`;");
        $db->exec("DELETE FROM `projects`;");
        $db->exec("SET FOREIGN_KEY_CHECKS = 1;");

        if ($action === 'clear_all') {
            Response::success([
                'cleared' => true,
                'message' => 'All projects and project_details records have been cleared successfully from the database.'
            ], 'Database projects cleared successfully');
            exit;
        }
    } catch (\Throwable $e) {
        if ($action === 'clear_all') {
            Response::error('Failed to clear projects: ' . $e->getMessage(), 500);
            exit;
        }
    }
}

// 2. ACTION: BULK IMPORT / ENRICH MISSING DETAILS
$rows = $input['properties'] ?? [];
if (empty($rows) || !is_array($rows)) {
    Response::error('No property rows provided for import', 400);
}

// Helper: Slugify string
function slugify(string $text): string {
    $text = preg_replace('~[^\pL\d]+~u', '-', $text);
    $text = iconv('utf-8', 'us-ascii//TRANSLIT', $text);
    $text = preg_replace('~[^-\w]+~', '', $text);
    $text = trim($text, '-');
    $text = preg_replace('~-+~', '-', $text);
    $text = strtolower($text);
    return empty($text) ? 'dev-' . uniqid() : $text;
}

// Cache of developers to avoid redundant SELECT queries
$developerCache = [];
$devStmt = $db->query("SELECT id, name FROM developers");
while ($d = $devStmt->fetch(PDO::FETCH_ASSOC)) {
    $developerCache[strtolower(trim($d['name']))] = (int)$d['id'];
}

$findOrCreateDeveloper = function(string $rawName) use ($db, &$developerCache): ?int {
    $name = trim($rawName);
    if (empty($name)) return null;
    $lower = strtolower($name);
    $ignoreList = ['null', 'undefined', 'n/a', 'none', 'admin', 'registry admin', 'unknown', '1', '0'];
    if (in_array($lower, $ignoreList, true)) return null;

    if (isset($developerCache[$lower])) {
        return $developerCache[$lower];
    }

    // Check in database case-insensitively
    $chk = $db->prepare("SELECT id FROM developers WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1");
    $chk->execute([$name]);
    $found = $chk->fetch(PDO::FETCH_ASSOC);
    if ($found) {
        $developerCache[$lower] = (int)$found['id'];
        return (int)$found['id'];
    }

    // Auto-create developer profile
    try {
        $slug = slugify($name);
        $ins = $db->prepare("
            INSERT INTO developers (name, slug, corporate_office, established_year, projects_completed, delivered_sqft, on_time_track)
            VALUES (?, ?, 'Tamil Nadu', '2015', '10+ Projects', '500,000 sq.ft', '98% Delivery Precision')
        ");
        $ins->execute([$name, $slug]);
        $newId = (int)$db->lastInsertId();
        $developerCache[$lower] = $newId;
        return $newId;
    } catch (\Throwable $e) {
        return null;
    }
};

$updatedExistingCount = 0;
$insertedNewCount = 0;
$developersLinkedCount = 0;
$errors = [];

// Prepare Statements for projects and project_details
$findProjectByIdStmt = $db->prepare("SELECT * FROM projects WHERE project_id = ? LIMIT 1");
$findProjectByNameStmt = $db->prepare("SELECT * FROM projects WHERE LOWER(TRIM(project_name)) = LOWER(TRIM(?)) LIMIT 1");
$findDetailStmt = $db->prepare("SELECT * FROM project_details WHERE project_id = ? LIMIT 1");

$db->beginTransaction();

try {
    foreach ($rows as $index => $item) {
        try {
            // Extract & Normalize Column Values from spreadsheet payload
            $rawId = trim((string)($item['propertyId'] ?? $item['project_id'] ?? $item['Property ID'] ?? ''));
            $rawProjectName = trim((string)($item['projectName'] ?? $item['project_name'] ?? $item['Project Name'] ?? $item['title'] ?? $item['Title'] ?? ''));
            $rawPlotNo = trim((string)($item['plotNo'] ?? $item['Plot No.'] ?? $item['Plot No'] ?? ''));
            $rawDeveloper = trim((string)($item['developer'] ?? $item['Developer'] ?? $item['developerName'] ?? $item['developer_name'] ?? ''));
            $rawRera = trim((string)($item['reraNumber'] ?? $item['rera_no'] ?? $item['RERA Number'] ?? $item['rera'] ?? ''));
            $rawDtcpApproved = trim((string)($item['dtcpApproved'] ?? $item['DTCP Approved'] ?? ''));
            $rawDtcpApprovalNo = trim((string)($item['dtcpApprovalNo'] ?? $item['DTCP / LP Approval No.'] ?? $item['approval_reference'] ?? ''));
            $rawPattaType = trim((string)($item['pattaType'] ?? $item['Patta Type'] ?? ''));
            $rawAreaLocation = trim((string)($item['areaLocation'] ?? $item['Area / Location'] ?? ''));
            $rawVillageLocality = trim((string)($item['villageLocality'] ?? $item['Village / Locality'] ?? $item['locality_name'] ?? $item['locality'] ?? ''));
            $rawTaluk = trim((string)($item['taluk'] ?? $item['Taluk'] ?? ''));
            $rawDistrict = trim((string)($item['district'] ?? $item['District'] ?? ''));
            $rawCity = trim((string)($item['city_name'] ?? $item['city'] ?? $item['City Name'] ?? $item['City'] ?? ''));
            $rawGoogleMaps = trim((string)($item['googleMapsLink'] ?? $item['Google Maps Link'] ?? $item['gps'] ?? ''));
            $rawPlotSizeSqft = (float)($item['plotSizeSqft'] ?? $item['Plot Size (sq.ft)'] ?? $item['min_plot_size'] ?? 0);
            $rawDimension = trim((string)($item['dimension'] ?? $item['dimensions'] ?? ''));
            $rawFacing = trim((string)($item['facing'] ?? $item['Facing'] ?? ''));
            $rawCornerPlot = trim((string)($item['cornerPlot'] ?? $item['Corner Plot'] ?? ''));
            $rawPricePerSqft = (float)($item['pricePerSqft'] ?? $item['Price per sq.ft (₹)'] ?? $item['sqft_rate'] ?? 0);
            $rawTotalPrice = (float)($item['totalPrice'] ?? $item['Total Price (₹)'] ?? $item['price_from'] ?? 0);
            if ($rawTotalPrice < 100000 && $rawPricePerSqft > 0) {
                $plotSz = $rawPlotSizeSqft > 0 ? $rawPlotSizeSqft : 800;
                $rawTotalPrice = $rawPricePerSqft * $plotSz;
            }
            $rawSchools = trim((string)($item['schoolsNearby'] ?? $item['Schools (Name & km)'] ?? $item['schools'] ?? ''));
            $rawHospitals = trim((string)($item['hospitalNearby'] ?? $item['Hospital (Name & km)'] ?? $item['hospitals'] ?? ''));
            $rawRailway = trim((string)($item['railwayStationNearby'] ?? $item['Railway Station (Name & km)'] ?? $item['railway_station'] ?? ''));
            $rawHighwayName = trim((string)($item['highwayName'] ?? $item['Highway Name'] ?? $item['nearby_roads'] ?? ''));
            $rawElectricity = trim((string)($item['electricity'] ?? $item['Electricity'] ?? ''));
            $rawWater = trim((string)($item['waterConnection'] ?? $item['Water Connection'] ?? $item['water'] ?? ''));
            $rawDrainage = trim((string)($item['drainageFacility'] ?? $item['Drainage Facility'] ?? $item['drainage'] ?? ''));
            $rawRoadWidth = trim((string)($item['roadWidthFt'] ?? $item['Road Width (ft)'] ?? $item['road_width'] ?? ''));
            $rawRoadType = trim((string)($item['roadType'] ?? $item['Road Type'] ?? $item['internal_roads'] ?? ''));
            $rawStreetLights = trim((string)($item['streetLights'] ?? $item['Street Lights'] ?? ''));
            $rawSecurity = trim((string)($item['compoundWallGated'] ?? $item['Compound Wall / Gated'] ?? $item['security'] ?? ''));
            $rawParks = trim((string)($item['park'] ?? $item['Park'] ?? $item['parks'] ?? ''));
            $rawOtherAmenities = trim((string)($item['otherAmenities'] ?? $item['Other Amenities'] ?? $item['other_facilities'] ?? ''));
            $rawPhone = trim((string)($item['contactPersonPhone'] ?? $item['Contact Person / Phone'] ?? $item['whatsapp_number'] ?? ''));
            $rawRemarks = trim((string)($item['remarks'] ?? $item['Remarks'] ?? ''));

            // Clean & Link Developer
            $devId = null;
            if (!empty($rawDeveloper)) {
                $devId = $findOrCreateDeveloper($rawDeveloper);
                if ($devId) {
                    $developersLinkedCount++;
                }
            }

            // Clean Project Name
            $projectName = $rawProjectName;
            if (empty($projectName) && !empty($item['title'])) {
                $projectName = trim((string)$item['title']);
            }
            if (empty($projectName)) {
                $projectName = 'Verified Cadastral Layout';
            }

            // Find existing project in DB (First by ID, then by Name)
            $existingProj = null;
            if (!empty($rawId)) {
                $findProjectByIdStmt->execute([$rawId]);
                $existingProj = $findProjectByIdStmt->fetch(PDO::FETCH_ASSOC);
            }
            if (!$existingProj && !empty($projectName) && strtolower($projectName) !== 'verified cadastral layout') {
                $findProjectByNameStmt->execute([$projectName]);
                $existingProj = $findProjectByNameStmt->fetch(PDO::FETCH_ASSOC);
            }

            // Calculate Price & Rate
            if ($rawTotalPrice <= 0 && $rawPlotSizeSqft > 0 && $rawPricePerSqft > 0) {
                $rawTotalPrice = round($rawPlotSizeSqft * $rawPricePerSqft);
            }
            if ($rawPricePerSqft <= 0 && $rawPlotSizeSqft > 0 && $rawTotalPrice > 0) {
                $rawPricePerSqft = round($rawTotalPrice / $rawPlotSizeSqft);
            }

            // Clean Locality, City, District
            $locality = !empty($rawVillageLocality) ? $rawVillageLocality : (!empty($rawAreaLocation) ? $rawAreaLocation : '');
            $city = !empty($rawCity) ? $rawCity : (!empty($rawDistrict) ? $rawDistrict : 'Chennai');
            $district = !empty($rawDistrict) ? $rawDistrict : $city;

            // Clean Phone
            $cleanPhone = preg_replace('/[^0-9]/', '', $rawPhone);
            if (strlen($cleanPhone) === 10) {
                $cleanPhone = '91' . $cleanPhone;
            }
            $whatsappNumber = (!empty($cleanPhone) && strlen($cleanPhone) >= 10) ? $cleanPhone : '9486140936';

            // Case A: Project Exists in DB -> Enrich / Fill Missing Fields
            if ($existingProj) {
                $targetId = $existingProj['project_id'];

                // Update projects table with missing/enriched fields
                $updProjSql = "
                    UPDATE projects SET
                        developer_id   = CASE WHEN :devId IS NOT NULL THEN :devId ELSE developer_id END,
                        developer_name = CASE WHEN :devName != '' THEN :devName ELSE developer_name END,
                        submitted_by   = CASE WHEN :devName != '' THEN :devName ELSE submitted_by END,
                        project_name   = CASE WHEN project_name = 'Verified Cadastral Layout' AND :pName != '' THEN :pName ELSE project_name END,
                        district       = CASE WHEN (district = '' OR district = 'Chennai') AND :district != '' THEN :district ELSE district END,
                        city           = CASE WHEN (city = '' OR city = 'Chennai') AND :city != '' THEN :city ELSE city END,
                        locality       = CASE WHEN locality = '' AND :locality != '' THEN :locality ELSE locality END,
                        price_from     = CASE WHEN (price_from = 0.00 OR price_from < 1000) AND :priceFrom > 0 THEN :priceFrom ELSE price_from END,
                        price_to       = CASE WHEN (price_to = 0.00 OR price_to < 1000) AND :priceTo > 0 THEN :priceTo ELSE price_to END,
                        sqft_rate      = CASE WHEN sqft_rate = 0.00 AND :sqftRate > 0 THEN :sqftRate ELSE sqft_rate END,
                        min_plot_size  = CASE WHEN min_plot_size = 1200 AND :plotSize > 0 THEN :plotSize ELSE min_plot_size END,
                        rera_no        = CASE WHEN (rera_no IS NULL OR rera_no = '' OR rera_no LIKE 'TNRERA Approved%') AND :rera != '' THEN :rera ELSE rera_no END,
                        whatsapp_number= CASE WHEN (whatsapp_number IS NULL OR whatsapp_number = '') AND :waNum != '' THEN :waNum ELSE whatsapp_number END,
                        updated_at     = NOW()
                    WHERE project_id = :pId
                ";
                $updProj = $db->prepare($updProjSql);
                $updProj->execute([
                    ':devId'     => $devId,
                    ':devName'   => $rawDeveloper,
                    ':pName'     => $projectName,
                    ':district'  => $district,
                    ':city'      => $city,
                    ':locality'  => $locality,
                    ':priceFrom' => $rawTotalPrice > 0 ? $rawTotalPrice : 0.00,
                    ':priceTo'   => $rawTotalPrice > 0 ? round($rawTotalPrice * 1.4) : 0.00,
                    ':sqftRate'  => $rawPricePerSqft > 0 ? $rawPricePerSqft : 0.00,
                    ':plotSize'  => $rawPlotSizeSqft > 0 ? (int)$rawPlotSizeSqft : 1200,
                    ':rera'      => $rawRera,
                    ':waNum'     => $whatsappNumber,
                    ':pId'       => $targetId
                ]);

                // Ensure project_details record exists and update with enriched details
                $findDetailStmt->execute([$targetId]);
                $existingDetail = $findDetailStmt->fetch(PDO::FETCH_ASSOC);

                if (!$existingDetail) {
                    $insDetail = $db->prepare("
                        INSERT INTO project_details (
                            project_id, total_layout_area, total_plots, available_plot_sizes,
                            dimensions, road_width, corner_plot, approval_authority, approval_reference,
                            internal_roads, street_lights, drainage, water, electricity, parks, security,
                            other_facilities, gps, nearby_roads, railway_station, schools, hospitals,
                            layout_pdf, brochure, created_at, updated_at
                        ) VALUES (
                            :pId, 'Approved Layout', 24, :plotSizeStr, :dim, :roadW, :corner,
                            :appAuth, :appRef, :intRoads, :sLights, :drainage, :water, :elec,
                            :parks, :sec, :otherFac, :gps, :nearbyRds, :railway, :schools, :hosps,
                            CONCAT('https://onenewstory.in/p_demo_5/backend/uploads/layout_', :pId, '.pdf'),
                            CONCAT('https://onenewstory.in/p_demo_5/backend/uploads/brochure_', :pId, '.pdf'),
                            NOW(), NOW()
                        )
                    ");
                    $insDetail->execute([
                        ':pId'        => $targetId,
                        ':plotSizeStr'=> $rawPlotSizeSqft > 0 ? ($rawPlotSizeSqft . ' sq.ft') : '1,200 sq.ft',
                        ':dim'        => $rawDimension ?: 'Standard Layout',
                        ':roadW'      => $rawRoadWidth ? ($rawRoadWidth . 'ft Road') : '30ft Tar Road',
                        ':corner'     => (strtolower($rawCornerPlot) === 'yes' || $rawCornerPlot === '1') ? 1 : 0,
                        ':appAuth'    => $rawDtcpApproved ?: 'DTCP Approved',
                        ':appRef'     => $rawDtcpApprovalNo ?: $rawRera,
                        ':intRoads'   => $rawRoadType ?: 'Tar Road',
                        ':sLights'    => $rawStreetLights ?: 'Yes',
                        ':drainage'   => $rawDrainage ?: 'Underground Stormwater Drainage',
                        ':water'      => $rawWater ?: 'Potable Groundwater Connection',
                        ':elec'       => $rawElectricity ?: '3-Phase EB Line Active',
                        ':parks'      => $rawParks ?: 'Landscaped Park',
                        ':sec'        => $rawSecurity ?: 'Gated Community Perimeter',
                        ':otherFac'   => $rawOtherAmenities,
                        ':gps'        => $rawGoogleMaps ?: '12.9716, 80.2184',
                        ':nearbyRds'  => $rawHighwayName ?: 'GST Road Link',
                        ':railway'    => $rawRailway ?: 'Nearby Railway Junction',
                        ':schools'    => $rawSchools,
                        ':hosps'      => $rawHospitals
                    ]);
                } else {
                    $updDetailSql = "
                        UPDATE project_details SET
                            dimensions         = CASE WHEN (dimensions IS NULL OR dimensions = '' OR dimensions = '28 x 28') AND :dim != '' THEN :dim ELSE dimensions END,
                            road_width         = CASE WHEN (road_width IS NULL OR road_width = '') AND :roadW != '' THEN :roadW ELSE road_width END,
                            corner_plot        = CASE WHEN :corner IS NOT NULL THEN :corner ELSE corner_plot END,
                            approval_authority = CASE WHEN (approval_authority IS NULL OR approval_authority = '') AND :appAuth != '' THEN :appAuth ELSE approval_authority END,
                            approval_reference = CASE WHEN (approval_reference IS NULL OR approval_reference = '') AND :appRef != '' THEN :appRef ELSE approval_reference END,
                            internal_roads     = CASE WHEN (internal_roads IS NULL OR internal_roads = '') AND :intRoads != '' THEN :intRoads ELSE internal_roads END,
                            street_lights      = CASE WHEN (street_lights IS NULL OR street_lights = '') AND :sLights != '' THEN :sLights ELSE street_lights END,
                            drainage           = CASE WHEN (drainage IS NULL OR drainage = '') AND :drainage != '' THEN :drainage ELSE drainage END,
                            water              = CASE WHEN (water IS NULL OR water = '') AND :water != '' THEN :water ELSE water END,
                            electricity        = CASE WHEN (electricity IS NULL OR electricity = '') AND :elec != '' THEN :elec ELSE electricity END,
                            parks              = CASE WHEN (parks IS NULL OR parks = '') AND :parks != '' THEN :parks ELSE parks END,
                            security           = CASE WHEN (security IS NULL OR security = '') AND :sec != '' THEN :sec ELSE security END,
                            other_facilities   = CASE WHEN (other_facilities IS NULL OR other_facilities = '') AND :otherFac != '' THEN :otherFac ELSE other_facilities END,
                            gps                = CASE WHEN (gps IS NULL OR gps = '' OR gps = '12.9716, 80.2184') AND :gps != '' THEN :gps ELSE gps END,
                            nearby_roads       = CASE WHEN (nearby_roads IS NULL OR nearby_roads = '') AND :nearbyRds != '' THEN :nearbyRds ELSE nearby_roads END,
                            railway_station    = CASE WHEN (railway_station IS NULL OR railway_station = '') AND :railway != '' THEN :railway ELSE railway_station END,
                            schools            = CASE WHEN (schools IS NULL OR schools = '' OR schools = '[]') AND :schools != '' THEN :schools ELSE schools END,
                            hospitals          = CASE WHEN (hospitals IS NULL OR hospitals = '' OR hospitals = '[]') AND :hosps != '' THEN :hosps ELSE hospitals END,
                            updated_at         = NOW()
                        WHERE project_id = :pId
                    ";
                    $updDetail = $db->prepare($updDetailSql);
                    $updDetail->execute([
                        ':dim'        => $rawDimension,
                        ':roadW'      => $rawRoadWidth ? ($rawRoadWidth . 'ft Road') : '',
                        ':corner'     => (strtolower($rawCornerPlot) === 'yes' || $rawCornerPlot === '1') ? 1 : 0,
                        ':appAuth'    => $rawDtcpApproved,
                        ':appRef'     => $rawDtcpApprovalNo,
                        ':intRoads'   => $rawRoadType,
                        ':sLights'    => $rawStreetLights,
                        ':drainage'   => $rawDrainage,
                        ':water'      => $rawWater,
                        ':elec'       => $rawElectricity,
                        ':parks'      => $rawParks,
                        ':sec'        => $rawSecurity,
                        ':otherFac'   => $rawOtherAmenities,
                        ':gps'        => $rawGoogleMaps,
                        ':nearbyRds'  => $rawHighwayName,
                        ':railway'    => $rawRailway,
                        ':schools'    => $rawSchools,
                        ':hosps'      => $rawHospitals,
                        ':pId'        => $targetId
                    ]);
                }

                $updatedExistingCount++;
            } else {
                // Case B: Project does not exist -> Insert new project and project_details
                $newId = !empty($rawId) ? $rawId : ('PRJ-' . str_pad((string)(2001 + $index), 4, '0', STR_PAD_LEFT));
                $titleDisplay = $projectName . (!empty($rawPlotNo) ? " - Plot {$rawPlotNo}" : '');

                $insProj = $db->prepare("
                    INSERT INTO projects (
                        project_id, project_name, developer_id, developer_name, district, city, locality,
                        category, type, price_from, price_to, sqft_rate, min_plot_size, max_plot_size,
                        project_stage, possession_date, rera_no, brokerage, no_brokerage, featured,
                        whatsapp_number, cover_image, interactive_map, total_units, project_status,
                        submitted_by, status, created_at, updated_at
                    ) VALUES (
                        :pId, :pName, :devId, :devName, :district, :city, :locality,
                        'Gated CMDA Plots', 'plots', :priceFrom, :priceTo, :sqftRate, :minSize, :maxSize,
                        'Ready to Register', 'Immediate', :rera, '0% Direct SRO Deed', 1, 0,
                        :waNum, 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
                        'assets/secura-masterplan-3d.html', 'Individual Plots', 'Ready to Register',
                        :submittedBy, 'published', NOW(), NOW()
                    )
                ");
                $insProj->execute([
                    ':pId'        => $newId,
                    ':pName'      => $titleDisplay,
                    ':devId'      => $devId,
                    ':devName'    => $rawDeveloper ?: 'Registry Admin',
                    ':district'   => $district,
                    ':city'       => $city,
                    ':locality'   => $locality,
                    ':priceFrom'  => $rawTotalPrice > 0 ? $rawTotalPrice : 3800000.00,
                    ':priceTo'    => $rawTotalPrice > 0 ? round($rawTotalPrice * 1.4) : 5500000.00,
                    ':sqftRate'   => $rawPricePerSqft > 0 ? $rawPricePerSqft : 3200.00,
                    ':minSize'    => $rawPlotSizeSqft > 0 ? (int)$rawPlotSizeSqft : 1200,
                    ':maxSize'    => $rawPlotSizeSqft > 0 ? (int)round($rawPlotSizeSqft * 1.5) : 2400,
                    ':rera'       => $rawRera ?: 'TNRERA Approved',
                    ':waNum'      => $whatsappNumber,
                    ':submittedBy'=> $rawDeveloper ?: 'Registry Admin'
                ]);

                $insDetail = $db->prepare("
                    INSERT INTO project_details (
                        project_id, total_layout_area, total_plots, available_plot_sizes,
                        dimensions, road_width, corner_plot, approval_authority, approval_reference,
                        internal_roads, street_lights, drainage, water, electricity, parks, security,
                        other_facilities, gps, nearby_roads, railway_station, schools, hospitals,
                        layout_pdf, brochure, created_at, updated_at
                    ) VALUES (
                        :pId, 'Approved Layout', 24, :plotSizeStr, :dim, :roadW, :corner,
                        :appAuth, :appRef, :intRoads, :sLights, :drainage, :water, :elec,
                        :parks, :sec, :otherFac, :gps, :nearbyRds, :railway, :schools, :hosps,
                        CONCAT('https://onenewstory.in/p_demo_5/backend/uploads/layout_', :pId, '.pdf'),
                        CONCAT('https://onenewstory.in/p_demo_5/backend/uploads/brochure_', :pId, '.pdf'),
                        NOW(), NOW()
                    )
                ");
                $insDetail->execute([
                    ':pId'        => $newId,
                    ':plotSizeStr'=> $rawPlotSizeSqft > 0 ? ($rawPlotSizeSqft . ' sq.ft') : '1,200 sq.ft',
                    ':dim'        => $rawDimension ?: 'Standard Layout Dimensions',
                    ':roadW'      => $rawRoadWidth ? ($rawRoadWidth . 'ft Road') : '30ft Tar Road',
                    ':corner'     => (strtolower($rawCornerPlot) === 'yes' || $rawCornerPlot === '1') ? 1 : 0,
                    ':appAuth'    => $rawDtcpApproved ?: 'DTCP Approved',
                    ':appRef'     => $rawDtcpApprovalNo ?: $rawRera,
                    ':intRoads'   => $rawRoadType ?: 'Tar Road',
                    ':sLights'    => $rawStreetLights ?: 'Yes',
                    ':drainage'   => $rawDrainage ?: 'Underground Stormwater Drainage',
                    ':water'      => $rawWater ?: 'Potable Groundwater Connection',
                    ':elec'       => $rawElectricity ?: '3-Phase EB Line Active',
                    ':parks'      => $rawParks ?: 'Landscaped Children Park',
                    ':sec'        => $rawSecurity ?: 'Gated Community Perimeter',
                    ':otherFac'   => $rawOtherAmenities,
                    ':gps'        => $rawGoogleMaps ?: '12.9716, 80.2184',
                    ':nearbyRds'  => $rawHighwayName ?: 'GST Road Link',
                    ':railway'    => $rawRailway ?: 'Nearby Railway Station',
                    ':schools'    => $rawSchools,
                    ':hosps'      => $rawHospitals
                ]);

                $insertedNewCount++;
            }
        } catch (\Throwable $e) {
            $errors[] = "Row #" . ($index + 1) . ": " . $e->getMessage();
        }
    }

    if ($db->inTransaction()) {
        $db->commit();
    }
} catch (\Throwable $trxErr) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    Response::error('Database transaction failed during bulk processing: ' . $trxErr->getMessage(), 500);
}

$totalProcessed = $updatedExistingCount + $insertedNewCount;

Response::success([
    'totalSubmitted'        => count($rows),
    'importedCount'         => $totalProcessed,
    'updatedExistingCount'  => $updatedExistingCount,
    'insertedNewCount'      => $insertedNewCount,
    'developersLinkedCount' => $developersLinkedCount,
    'failedCount'           => count($errors),
    'errors'                => array_slice($errors, 0, 10),
    'clearedExisting'       => $clearExisting,
    'message'               => "Successfully processed {$totalProcessed} properties: {$updatedExistingCount} existing records enriched with missing details, {$insertedNewCount} new records created, and {$developersLinkedCount} developer profiles linked."
]);
