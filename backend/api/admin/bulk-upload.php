<?php
/**
 * POST /api/admin/bulk-upload.php
 * Handles bulk property import and enrichment for consolidated schema:
 * 1. projects (Primary Property Card, Catalog & Search Table)
 * 2. project_details (Full Specifications, Approvals, Infrastructure & Media Dossiers)
 * 3. developers (Auto-creates and links missing developers)
 * 4. properties (Mirrored for legacy compatibility)
 *
 * Fully supports all 78 fields matching the projects and project_details database tables.
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

// Check if legacy properties table exists
$hasPropertiesTable = false;
try {
    $tblCheck = $db->query("SHOW TABLES LIKE 'properties'");
    $hasPropertiesTable = ($tblCheck && $tblCheck->rowCount() > 0);
} catch (\Throwable $e) {
    $hasPropertiesTable = false;
}

// 1. ACTION: CLEAR ALL DATABASE PROPERTY DATA
if ($action === 'clear_all' || $clearExisting) {
    try {
        $db->exec("SET FOREIGN_KEY_CHECKS = 0;");
        $db->exec("DELETE FROM `project_details`;");
        $db->exec("DELETE FROM `projects`;");
        if ($hasPropertiesTable) {
            $db->exec("DELETE FROM `properties`;");
        }
        $db->exec("SET FOREIGN_KEY_CHECKS = 1;");

        if ($action === 'clear_all') {
            Response::success([
                'cleared' => true,
                'message' => 'All projects, project_details, and property records have been cleared successfully from the database.'
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

$findOrCreateDeveloper = function(string $rawName, ?int $explicitId = null) use ($db, &$developerCache): ?int {
    if ($explicitId && $explicitId > 0) {
        $chk = $db->prepare("SELECT id FROM developers WHERE id = ? LIMIT 1");
        $chk->execute([$explicitId]);
        if ($chk->fetch(PDO::FETCH_ASSOC)) {
            return $explicitId;
        }
    }

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
            VALUES (?, ?, 'Tamil Nadu', '2018', '10+ Projects', '500,000 sq.ft', '98% Delivery Precision')
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
            // Normalize keys by stripping BOM, quotes and whitespace
            $cleanItem = [];
            foreach ($item as $k => $v) {
                $cleanKey = preg_replace('/^\xEF\xBB\xBF/', '', (string)$k);
                $cleanKey = trim($cleanKey, " \t\n\r\0\x0B\"'");
                $cleanItem[$cleanKey] = $v;
            }
            $item = array_merge($item, $cleanItem);

            // =========================================================================
            // EXTRACT & NORMALIZE COLUMN VALUES FROM SPREADSHEET PAYLOAD
            // =========================================================================

            // --- 1. Project Identification (projects) ---
            $rawId = trim((string)($item['projectId'] ?? $item['project_id'] ?? $item['propertyId'] ?? $item['Property ID'] ?? $item['Project ID'] ?? ''));
            $rawProjectName = trim((string)($item['projectName'] ?? $item['project_name'] ?? $item['Project Name'] ?? $item['title'] ?? ''));
            $rawPlotNo = trim((string)($item['plotNo'] ?? $item['plot_no'] ?? $item['Plot No.'] ?? $item['Plot No'] ?? ''));
            $rawDeveloper = trim((string)($item['developerName'] ?? $item['developer_name'] ?? $item['developer'] ?? $item['Developer Name'] ?? $item['Developer'] ?? ''));
            $rawDevId = !empty($item['developerId'] ?? $item['developer_id'] ?? $item['Developer ID']) ? (int)($item['developerId'] ?? $item['developer_id'] ?? $item['Developer ID']) : null;

            $rawDistrict = trim((string)($item['district'] ?? $item['District'] ?? ''));
            $rawCity = trim((string)($item['city'] ?? $item['cityName'] ?? $item['city_name'] ?? $item['City'] ?? ''));
            $rawLocality = trim((string)($item['locality'] ?? $item['localityName'] ?? $item['locality_name'] ?? $item['villageLocality'] ?? $item['Locality'] ?? ''));
            $rawPincode = trim((string)($item['pincode'] ?? $item['Pincode'] ?? ''));
            $rawCategory = trim((string)($item['category'] ?? $item['Category'] ?? ''));
            $rawType = trim((string)($item['type'] ?? $item['propertyType'] ?? $item['Property Type'] ?? ''));
            $rawLandType = trim((string)($item['landType'] ?? $item['land_type'] ?? $item['Land Type'] ?? $item['landUse'] ?? 'Residential'));

            // --- 2. Pricing & Sizing (projects) ---
            $rawPriceFrom = (float)($item['priceFrom'] ?? $item['price_from'] ?? $item['Price From (₹)'] ?? $item['totalPrice'] ?? $item['Total Price (₹)'] ?? 0);
            $rawPriceTo = (float)($item['priceTo'] ?? $item['price_to'] ?? $item['Price To (₹)'] ?? 0);
            $rawSqftRate = (float)($item['sqftRate'] ?? $item['sqft_rate'] ?? $item['pricePerSqft'] ?? $item['Price per sq.ft (₹)'] ?? 0);
            $rawMinPlotSize = (int)($item['minPlotSize'] ?? $item['min_plot_size'] ?? $item['Min Plot Size (sq.ft)'] ?? $item['plotSizeSqft'] ?? 0);
            $rawMaxPlotSize = (int)($item['maxPlotSize'] ?? $item['max_plot_size'] ?? $item['Max Plot Size (sq.ft)'] ?? 0);

            // Price & Size Fallbacks
            if ($rawPriceFrom <= 0 && $rawMinPlotSize > 0 && $rawSqftRate > 0) {
                $rawPriceFrom = round($rawMinPlotSize * $rawSqftRate);
            }
            if ($rawSqftRate <= 0 && $rawMinPlotSize > 0 && $rawPriceFrom > 0) {
                $rawSqftRate = round($rawPriceFrom / $rawMinPlotSize);
            }
            if ($rawPriceTo <= 0 && $rawPriceFrom > 0) {
                $rawPriceTo = round($rawPriceFrom * 1.45);
            }
            if ($rawMaxPlotSize <= 0 && $rawMinPlotSize > 0) {
                $rawMaxPlotSize = (int)round($rawMinPlotSize * 1.5);
            }
            if ($rawMinPlotSize <= 0) {
                $rawMinPlotSize = 1200;
            }
            if ($rawMaxPlotSize <= 0) {
                $rawMaxPlotSize = 2400;
            }

            // --- 3. Project Stage, Status & Legal (projects) ---
            $rawProjectStage = trim((string)($item['projectStage'] ?? $item['project_stage'] ?? $item['Project Stage'] ?? 'Ready to Register'));
            $rawProjectStatus = trim((string)($item['projectStatus'] ?? $item['project_status'] ?? $item['Project Status'] ?? 'Active'));
            $rawStatus = trim((string)($item['status'] ?? $item['listingStatus'] ?? $item['Listing Status'] ?? 'published'));
            $validStatuses = ['published', 'pending_review', 'pending_peer_review', 'revision_requested', 'rejected'];
            if (!in_array($rawStatus, $validStatuses, true)) {
                $rawStatus = 'published';
            }

            $rawLaunchDate = !empty($item['launchDate'] ?? $item['launch_date'] ?? $item['Launch Date']) ? trim((string)($item['launchDate'] ?? $item['launch_date'] ?? $item['Launch Date'])) : null;
            if ($rawLaunchDate && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $rawLaunchDate)) {
                $time = strtotime($rawLaunchDate);
                $rawLaunchDate = $time ? date('Y-m-d', $time) : null;
            }

            $rawPossessionDate = trim((string)($item['possessionDate'] ?? $item['possession_date'] ?? $item['Possession Date'] ?? $item['possessionTimeline'] ?? 'Immediate'));
            $rawReraNo = trim((string)($item['reraNumber'] ?? $item['rera_no'] ?? $item['RERA Number'] ?? $item['rera'] ?? ''));
            $rawBrokerage = trim((string)($item['brokerage'] ?? $item['Brokerage'] ?? '0% Direct SRO Deed'));

            $boolVal = function($val, bool $default = false): int {
                if ($val === null || $val === '') return $default ? 1 : 0;
                $str = strtolower(trim((string)$val));
                return in_array($str, ['1', 'yes', 'true', 'approved', 'available']) ? 1 : 0;
            };

            $rawNoBrokerage = $boolVal($item['noBrokerage'] ?? $item['no_brokerage'] ?? $item['No Brokerage (Yes/No)'] ?? null, true);
            $rawFeatured = $boolVal($item['featured'] ?? $item['Featured (Yes/No)'] ?? null, false);
            $rawFreeAccess = $boolVal($item['freeAccess'] ?? $item['free_access'] ?? $item['Free Access (Yes/No)'] ?? null, false);

            $rawPhone = trim((string)($item['whatsappNumber'] ?? $item['whatsapp_number'] ?? $item['WhatsApp Number'] ?? $item['contactPersonPhone'] ?? ''));
            $cleanPhone = preg_replace('/[^0-9]/', '', $rawPhone);
            if (strlen($cleanPhone) === 10) {
                $cleanPhone = '91' . $cleanPhone;
            }
            $whatsappNumber = (!empty($cleanPhone) && strlen($cleanPhone) >= 10) ? $cleanPhone : '9486140936';

            $rawCoverImage = trim((string)($item['coverImage'] ?? $item['cover_image'] ?? $item['Cover Image URL'] ?? ''));
            if (empty($rawCoverImage)) {
                $rawCoverImage = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80';
            }
            $rawInteractiveMap = trim((string)($item['interactiveMap'] ?? $item['interactive_map'] ?? $item['Interactive Map URL'] ?? 'assets/secura-masterplan-3d.html'));
            $rawTotalUnits = trim((string)($item['totalUnits'] ?? $item['total_units'] ?? $item['Total Units'] ?? ''));
            $rawUnitsSold = trim((string)($item['unitsSold'] ?? $item['units_sold'] ?? $item['Units Sold'] ?? ''));
            $rawSubmittedBy = trim((string)($item['submittedBy'] ?? $item['submitted_by'] ?? $item['Submitted By'] ?? $rawDeveloper));
            $rawReviewedBy = trim((string)($item['reviewedBy'] ?? $item['reviewed_by'] ?? $item['Reviewed By'] ?? 'Registry Officer'));
            $rawReviewNotes = trim((string)($item['reviewNotes'] ?? $item['review_notes'] ?? $item['Review Notes'] ?? 'Verified'));
            $rawRejectionReason = trim((string)($item['rejectionReason'] ?? $item['rejection_reason'] ?? $item['Rejection Reason'] ?? ''));
            $rawReviewedAt = !empty($item['reviewedAt'] ?? $item['reviewed_at'] ?? $item['Reviewed At']) ? trim((string)($item['reviewedAt'] ?? $item['reviewed_at'] ?? $item['Reviewed At'])) : date('Y-m-d H:i:s');

            // --- 4. Layout Specifications & Infrastructure (project_details) ---
            $rawTotalLayoutArea = trim((string)($item['totalLayoutArea'] ?? $item['total_layout_area'] ?? $item['Total Layout Area'] ?? 'Approved Layout'));
            $rawTotalPlots = (int)($item['totalPlots'] ?? $item['total_plots'] ?? $item['Total Plots'] ?? 24);
            $rawAvailablePlotSizes = trim((string)($item['availablePlotSizes'] ?? $item['available_plot_sizes'] ?? $item['Available Plot Sizes'] ?? ''));
            if (empty($rawAvailablePlotSizes) && $rawMinPlotSize > 0) {
                $rawAvailablePlotSizes = $rawMinPlotSize . ($rawMaxPlotSize > $rawMinPlotSize ? " - {$rawMaxPlotSize} sq.ft" : " sq.ft");
            }
            $rawDimensions = trim((string)($item['dimensions'] ?? $item['dimension'] ?? $item['Dimensions'] ?? ''));
            if (empty($rawDimensions) && $rawMinPlotSize > 0) {
                $side = (int)round(sqrt($rawMinPlotSize));
                $rawDimensions = "{$side} x {$side}";
            }
            $rawRoadWidth = trim((string)($item['roadWidth'] ?? $item['road_width'] ?? $item['roadWidthFt'] ?? $item['Road Width'] ?? '30ft & 40ft Blacktop Roads'));
            if (is_numeric($rawRoadWidth)) {
                $rawRoadWidth = $rawRoadWidth . 'ft Road';
            }
            $rawCornerPlot = $boolVal($item['cornerPlot'] ?? $item['corner_plot'] ?? $item['Corner Plot (Yes/No)'] ?? null, false);

            $rawApprovalAuthority = trim((string)($item['approvalAuthority'] ?? $item['approval_authority'] ?? $item['Approval Authority'] ?? $item['dtcpApproved'] ?? 'DTCP / CMDA'));
            $rawApprovalReference = trim((string)($item['approvalReference'] ?? $item['approval_reference'] ?? $item['Approval Reference / LP No.'] ?? $item['dtcpApprovalNo'] ?? ''));
            $rawApprovalDate = !empty($item['approvalDate'] ?? $item['approval_date'] ?? $item['Approval Date']) ? trim((string)($item['approvalDate'] ?? $item['approval_date'] ?? $item['Approval Date'])) : null;
            if ($rawApprovalDate && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $rawApprovalDate)) {
                $time = strtotime($rawApprovalDate);
                $rawApprovalDate = $time ? date('Y-m-d', $time) : null;
            }
            $rawReraDetails = trim((string)($item['reraDetails'] ?? $item['rera_details'] ?? $item['RERA Details'] ?? ''));

            $rawInternalRoads = trim((string)($item['internalRoads'] ?? $item['internal_roads'] ?? $item['Internal Roads'] ?? $item['roadType'] ?? '40ft & 30ft Blacktop Tar'));
            $rawStreetLights = trim((string)($item['streetLights'] ?? $item['street_lights'] ?? $item['Street Lights'] ?? 'LED Avenue Lighting'));
            $rawDrainage = trim((string)($item['drainage'] ?? $item['drainageFacility'] ?? $item['Drainage Facility'] ?? 'Underground Stormwater Drainage'));
            $rawWater = trim((string)($item['water'] ?? $item['waterConnection'] ?? $item['Water Connection'] ?? 'Individual OHT Water Supply'));
            $rawElectricity = trim((string)($item['electricity'] ?? $item['Electricity'] ?? 'EB 3-Phase Underground Cabling'));
            $rawParks = trim((string)($item['parks'] ?? $item['park'] ?? $item['Parks & Play Area'] ?? 'Landscaped Children Park & Walkway'));
            $rawSecurity = trim((string)($item['security'] ?? $item['compoundWallGated'] ?? $item['Compound Wall / Gated Security'] ?? '24x7 Boom Barrier Security & CCTV'));
            $rawOtherFacilities = trim((string)($item['otherFacilities'] ?? $item['other_facilities'] ?? $item['otherAmenities'] ?? $item['Other Facilities & Amenities'] ?? ''));

            $rawGps = trim((string)($item['gps'] ?? $item['googleMapsLink'] ?? $item['GPS Coordinates / Map Link'] ?? ''));
            if (empty($rawGps)) {
                $rawGps = '12.8423, 80.0612';
            }
            $rawNearbyRoads = trim((string)($item['nearbyRoads'] ?? $item['nearby_roads'] ?? $item['highwayName'] ?? $item['Nearby Roads / Highway Name'] ?? 'GST Road (NH 45)'));
            $rawRailwayStation = trim((string)($item['railwayStation'] ?? $item['railway_station'] ?? $item['railwayStationNearby'] ?? $item['Railway Station (Name & km)'] ?? ''));
            $rawSchools = trim((string)($item['schools'] ?? $item['schoolsNearby'] ?? $item['Schools (Name & km)'] ?? ''));
            $rawHospitals = trim((string)($item['hospitals'] ?? $item['hospitalNearby'] ?? $item['Hospitals (Name & km)'] ?? ''));
            $rawEmploymentHubs = trim((string)($item['employmentHubs'] ?? $item['employment_hubs'] ?? $item['Employment Hubs'] ?? ''));
            $rawResidentialDevelopment = trim((string)($item['residentialDevelopment'] ?? $item['residential_development'] ?? $item['Residential Development Surrounding'] ?? ''));
            $rawInfrastructureProjects = trim((string)($item['infrastructureProjects'] ?? $item['infrastructure_projects'] ?? $item['Infrastructure Projects'] ?? ''));

            $rawGallery = trim((string)($item['gallery'] ?? $item['galleryUrls'] ?? $item['Gallery Image URLs'] ?? ''));
            $rawVideos = trim((string)($item['videos'] ?? $item['videoUrls'] ?? $item['Video URLs'] ?? ''));
            $rawDroneVideos = trim((string)($item['droneVideos'] ?? $item['drone_videos'] ?? $item['droneVideoUrls'] ?? $item['Drone Video URLs'] ?? ''));
            $rawLayoutPdf = trim((string)($item['layoutPdf'] ?? $item['layout_pdf'] ?? $item['Layout PDF URL'] ?? ''));
            $rawBrochure = trim((string)($item['brochure'] ?? $item['Brochure PDF URL'] ?? ''));

            // Clean & Link Developer
            $devId = $findOrCreateDeveloper($rawDeveloper, $rawDevId);
            if ($devId) {
                $developersLinkedCount++;
            }

            // Project Name Normalization
            $projectName = $rawProjectName;
            if (empty($projectName) && !empty($item['title'])) {
                $projectName = trim((string)$item['title']);
            }
            if (empty($projectName)) {
                $projectName = 'Verified Cadastral Layout';
            }

            // Category & Type inference
            $isCommercial = (stripos($rawLandType, 'commercial') !== false || stripos($rawLandType, 'industrial') !== false);
            $isAgri = (stripos($rawLandType, 'agri') !== false || stripos($rawLandType, 'farm') !== false);
            if (empty($rawCategory)) {
                $rawCategory = $isCommercial ? 'Commercial Spaces' : ($isAgri ? 'Farm Land & Estates' : 'Gated CMDA Plots');
            }
            if (empty($rawType)) {
                $rawType = $isCommercial ? 'commercial' : ($isAgri ? 'agricultural' : 'plots');
            }

            // Locality, City, District Resolution
            $locality = !empty($rawLocality) ? $rawLocality : 'OMR';
            $city = !empty($rawCity) ? $rawCity : (!empty($rawDistrict) ? $rawDistrict : 'Chennai');
            $district = !empty($rawDistrict) ? $rawDistrict : $city;

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

            // =========================================================================
            // CASE A: PROJECT EXISTS IN DB -> ENRICH / UPDATE ALL COLUMNS
            // =========================================================================
            if ($existingProj) {
                $targetId = $existingProj['project_id'];

                $updProjSql = "
                    UPDATE projects SET
                        project_name    = CASE WHEN :pName != '' THEN :pName ELSE project_name END,
                        developer_id    = CASE WHEN :devId IS NOT NULL THEN :devId ELSE developer_id END,
                        developer_name  = CASE WHEN :devName != '' THEN :devName ELSE developer_name END,
                        district        = CASE WHEN :district != '' THEN :district ELSE district END,
                        city            = CASE WHEN :city != '' THEN :city ELSE city END,
                        locality        = CASE WHEN :locality != '' THEN :locality ELSE locality END,
                        category        = CASE WHEN :category != '' THEN :category ELSE category END,
                        type            = CASE WHEN :pType != '' THEN :pType ELSE type END,
                        land_type       = CASE WHEN :landType != '' THEN :landType ELSE land_type END,
                        price_from      = CASE WHEN :priceFrom > 0 THEN :priceFrom ELSE price_from END,
                        price_to        = CASE WHEN :priceTo > 0 THEN :priceTo ELSE price_to END,
                        sqft_rate       = CASE WHEN :sqftRate > 0 THEN :sqftRate ELSE sqft_rate END,
                        min_plot_size   = CASE WHEN :minSize > 0 THEN :minSize ELSE min_plot_size END,
                        max_plot_size   = CASE WHEN :maxSize > 0 THEN :maxSize ELSE max_plot_size END,
                        project_stage   = CASE WHEN :pStage != '' THEN :pStage ELSE project_stage END,
                        launch_date     = CASE WHEN :launchDate IS NOT NULL THEN :launchDate ELSE launch_date END,
                        possession_date = CASE WHEN :possDate != '' THEN :possDate ELSE possession_date END,
                        rera_no         = CASE WHEN :rera != '' THEN :rera ELSE rera_no END,
                        brokerage       = CASE WHEN :brokerage != '' THEN :brokerage ELSE brokerage END,
                        no_brokerage    = :noBrokerage,
                        featured        = :featured,
                        free_access     = :freeAccess,
                        whatsapp_number = CASE WHEN :waNum != '' THEN :waNum ELSE whatsapp_number END,
                        cover_image     = CASE WHEN :coverImg != '' THEN :coverImg ELSE cover_image END,
                        interactive_map = CASE WHEN :mapUrl != '' THEN :mapUrl ELSE interactive_map END,
                        total_units     = CASE WHEN :totalUnits != '' THEN :totalUnits ELSE total_units END,
                        units_sold      = CASE WHEN :unitsSold != '' THEN :unitsSold ELSE units_sold END,
                        project_status  = CASE WHEN :pStatus != '' THEN :pStatus ELSE project_status END,
                        submitted_by    = CASE WHEN :subBy != '' THEN :subBy ELSE submitted_by END,
                        reviewed_by     = CASE WHEN :revBy != '' THEN :revBy ELSE reviewed_by END,
                        review_notes    = CASE WHEN :revNotes != '' THEN :revNotes ELSE review_notes END,
                        rejection_reason= CASE WHEN :rejReason != '' THEN :rejReason ELSE rejection_reason END,
                        status          = :status,
                        updated_at      = NOW()
                    WHERE project_id = :pId
                ";
                $updProj = $db->prepare($updProjSql);
                $updProj->execute([
                    ':pName'       => $projectName,
                    ':devId'       => $devId,
                    ':devName'     => $rawDeveloper,
                    ':district'    => $district,
                    ':city'        => $city,
                    ':locality'    => $locality,
                    ':category'    => $rawCategory,
                    ':pType'       => $rawType,
                    ':landType'    => $rawLandType,
                    ':priceFrom'   => $rawPriceFrom,
                    ':priceTo'     => $rawPriceTo,
                    ':sqftRate'    => $rawSqftRate,
                    ':minSize'     => $rawMinPlotSize,
                    ':maxSize'     => $rawMaxPlotSize,
                    ':pStage'      => $rawProjectStage,
                    ':launchDate'  => $rawLaunchDate,
                    ':possDate'    => $rawPossessionDate,
                    ':rera'        => $rawReraNo,
                    ':brokerage'   => $rawBrokerage,
                    ':noBrokerage' => $rawNoBrokerage,
                    ':featured'    => $rawFeatured,
                    ':freeAccess'  => $rawFreeAccess,
                    ':waNum'       => $whatsappNumber,
                    ':coverImg'    => $rawCoverImage,
                    ':mapUrl'      => $rawInteractiveMap,
                    ':totalUnits'  => $rawTotalUnits,
                    ':unitsSold'   => $rawUnitsSold,
                    ':pStatus'     => $rawProjectStatus,
                    ':subBy'       => $rawSubmittedBy,
                    ':revBy'       => $rawReviewedBy,
                    ':revNotes'    => $rawReviewNotes,
                    ':rejReason'   => $rawRejectionReason,
                    ':status'      => $rawStatus,
                    ':pId'         => $targetId
                ]);

                // Ensure project_details record exists and update
                $findDetailStmt->execute([$targetId]);
                $existingDetail = $findDetailStmt->fetch(PDO::FETCH_ASSOC);

                if (!$existingDetail) {
                    $insDetail = $db->prepare("
                        INSERT INTO project_details (
                            project_id, total_layout_area, total_plots, available_plot_sizes,
                            dimensions, road_width, corner_plot, land_type, approval_authority, approval_reference,
                            approval_date, rera_details, internal_roads, street_lights, drainage, water, electricity,
                            parks, security, other_facilities, gps, nearby_roads, railway_station, schools, hospitals,
                            employment_hubs, residential_development, infrastructure_projects, gallery, videos, drone_videos,
                            layout_pdf, brochure, created_at, updated_at
                        ) VALUES (
                            :pId, :totArea, :totPlots, :availSizes, :dim, :roadW, :corner, :landType,
                            :appAuth, :appRef, :appDate, :reraDet, :intRoads, :sLights, :drainage, :water, :elec,
                            :parks, :sec, :otherFac, :gps, :nearbyRds, :railway, :schools, :hosps,
                            :empHubs, :resDev, :infraProj, :gallery, :videos, :droneVideos,
                            :layoutPdf, :brochure, NOW(), NOW()
                        )
                    ");
                    $insDetail->execute([
                        ':pId'        => $targetId,
                        ':totArea'    => $rawTotalLayoutArea,
                        ':totPlots'   => $rawTotalPlots,
                        ':availSizes' => $rawAvailablePlotSizes,
                        ':dim'        => $rawDimensions,
                        ':roadW'      => $rawRoadWidth,
                        ':corner'     => $rawCornerPlot,
                        ':landType'   => $rawLandType,
                        ':appAuth'    => $rawApprovalAuthority,
                        ':appRef'     => $rawApprovalReference,
                        ':appDate'    => $rawApprovalDate,
                        ':reraDet'    => $rawReraDetails,
                        ':intRoads'   => $rawInternalRoads,
                        ':sLights'    => $rawStreetLights,
                        ':drainage'   => $rawDrainage,
                        ':water'      => $rawWater,
                        ':elec'       => $rawElectricity,
                        ':parks'      => $rawParks,
                        ':sec'        => $rawSecurity,
                        ':otherFac'   => $rawOtherFacilities,
                        ':gps'        => $rawGps,
                        ':nearbyRds'  => $rawNearbyRoads,
                        ':railway'    => $rawRailwayStation,
                        ':schools'    => $rawSchools,
                        ':hosps'      => $rawHospitals,
                        ':empHubs'    => $rawEmploymentHubs,
                        ':resDev'     => $rawResidentialDevelopment,
                        ':infraProj'  => $rawInfrastructureProjects,
                        ':gallery'    => $rawGallery,
                        ':videos'     => $rawVideos,
                        ':droneVideos'=> $rawDroneVideos,
                        ':layoutPdf'  => $rawLayoutPdf ?: "https://onenewstory.in/p_demo_5/backend/uploads/layout_{$targetId}.pdf",
                        ':brochure'   => $rawBrochure ?: "https://onenewstory.in/p_demo_5/backend/uploads/brochure_{$targetId}.pdf"
                    ]);
                } else {
                    $updDetailSql = "
                        UPDATE project_details SET
                            total_layout_area        = CASE WHEN :totArea != '' THEN :totArea ELSE total_layout_area END,
                            total_plots              = CASE WHEN :totPlots > 0 THEN :totPlots ELSE total_plots END,
                            available_plot_sizes     = CASE WHEN :availSizes != '' THEN :availSizes ELSE available_plot_sizes END,
                            dimensions               = CASE WHEN :dim != '' THEN :dim ELSE dimensions END,
                            road_width               = CASE WHEN :roadW != '' THEN :roadW ELSE road_width END,
                            corner_plot              = :corner,
                            land_type                = CASE WHEN :landType != '' THEN :landType ELSE land_type END,
                            approval_authority       = CASE WHEN :appAuth != '' THEN :appAuth ELSE approval_authority END,
                            approval_reference       = CASE WHEN :appRef != '' THEN :appRef ELSE approval_reference END,
                            approval_date            = CASE WHEN :appDate IS NOT NULL THEN :appDate ELSE approval_date END,
                            rera_details             = CASE WHEN :reraDet != '' THEN :reraDet ELSE rera_details END,
                            internal_roads           = CASE WHEN :intRoads != '' THEN :intRoads ELSE internal_roads END,
                            street_lights            = CASE WHEN :sLights != '' THEN :sLights ELSE street_lights END,
                            drainage                 = CASE WHEN :drainage != '' THEN :drainage ELSE drainage END,
                            water                    = CASE WHEN :water != '' THEN :water ELSE water END,
                            electricity              = CASE WHEN :elec != '' THEN :elec ELSE electricity END,
                            parks                    = CASE WHEN :parks != '' THEN :parks ELSE parks END,
                            security                 = CASE WHEN :sec != '' THEN :sec ELSE security END,
                            other_facilities         = CASE WHEN :otherFac != '' THEN :otherFac ELSE other_facilities END,
                            gps                      = CASE WHEN :gps != '' THEN :gps ELSE gps END,
                            nearby_roads             = CASE WHEN :nearbyRds != '' THEN :nearbyRds ELSE nearby_roads END,
                            railway_station          = CASE WHEN :railway != '' THEN :railway ELSE railway_station END,
                            schools                  = CASE WHEN :schools != '' THEN :schools ELSE schools END,
                            hospitals                = CASE WHEN :hosps != '' THEN :hosps ELSE hospitals END,
                            employment_hubs          = CASE WHEN :empHubs != '' THEN :empHubs ELSE employment_hubs END,
                            residential_development  = CASE WHEN :resDev != '' THEN :resDev ELSE residential_development END,
                            infrastructure_projects  = CASE WHEN :infraProj != '' THEN :infraProj ELSE infrastructure_projects END,
                            gallery                  = CASE WHEN :gallery != '' THEN :gallery ELSE gallery END,
                            videos                   = CASE WHEN :videos != '' THEN :videos ELSE videos END,
                            drone_videos             = CASE WHEN :droneVideos != '' THEN :droneVideos ELSE drone_videos END,
                            layout_pdf               = CASE WHEN :layoutPdf != '' THEN :layoutPdf ELSE layout_pdf END,
                            brochure                 = CASE WHEN :brochure != '' THEN :brochure ELSE brochure END,
                            updated_at               = NOW()
                        WHERE project_id = :pId
                    ";
                    $updDetail = $db->prepare($updDetailSql);
                    $updDetail->execute([
                        ':totArea'    => $rawTotalLayoutArea,
                        ':totPlots'   => $rawTotalPlots,
                        ':availSizes' => $rawAvailablePlotSizes,
                        ':dim'        => $rawDimensions,
                        ':roadW'      => $rawRoadWidth,
                        ':corner'     => $rawCornerPlot,
                        ':landType'   => $rawLandType,
                        ':appAuth'    => $rawApprovalAuthority,
                        ':appRef'     => $rawApprovalReference,
                        ':appDate'    => $rawApprovalDate,
                        ':reraDet'    => $rawReraDetails,
                        ':intRoads'   => $rawInternalRoads,
                        ':sLights'    => $rawStreetLights,
                        ':drainage'   => $rawDrainage,
                        ':water'      => $rawWater,
                        ':elec'       => $rawElectricity,
                        ':parks'      => $rawParks,
                        ':sec'        => $rawSecurity,
                        ':otherFac'   => $rawOtherFacilities,
                        ':gps'        => $rawGps,
                        ':nearbyRds'  => $rawNearbyRoads,
                        ':railway'    => $rawRailwayStation,
                        ':schools'    => $rawSchools,
                        ':hosps'      => $rawHospitals,
                        ':empHubs'    => $rawEmploymentHubs,
                        ':resDev'     => $rawResidentialDevelopment,
                        ':infraProj'  => $rawInfrastructureProjects,
                        ':gallery'    => $rawGallery,
                        ':videos'     => $rawVideos,
                        ':droneVideos'=> $rawDroneVideos,
                        ':layoutPdf'  => $rawLayoutPdf,
                        ':brochure'   => $rawBrochure,
                        ':pId'        => $targetId
                    ]);
                }

                // Mirror to legacy properties table if present
                if ($hasPropertiesTable) {
                    try {
                        $updProp = $db->prepare("
                            UPDATE properties SET
                                title = :title,
                                developer_id = :devId,
                                property_type = :cat,
                                listing_mode = :mode,
                                locality_name = :loc,
                                city_name = :city,
                                price = :price,
                                price_per_sqft = :sqftRate,
                                sqft = :sqft,
                                main_image_url = :img,
                                rera_number = :rera,
                                interactive_map_url = :mapUrl,
                                is_featured = :feat,
                                status = :stat,
                                updated_at = NOW()
                            WHERE id = :id
                        ");
                        $updProp->execute([
                            ':title'    => $projectName,
                            ':devId'    => $devId,
                            ':cat'      => $rawCategory,
                            ':mode'     => substr($rawType, 0, 5),
                            ':loc'      => $locality,
                            ':city'     => $city,
                            ':price'    => '₹ ' . number_format($rawPriceFrom, 0),
                            ':sqftRate' => '₹ ' . number_format($rawSqftRate, 0) . ' / sq.ft',
                            ':sqft'     => (string)$rawMinPlotSize,
                            ':img'      => $rawCoverImage,
                            ':rera'     => $rawReraNo,
                            ':mapUrl'   => $rawInteractiveMap,
                            ':feat'     => $rawFeatured,
                            ':stat'     => $rawStatus,
                            ':id'       => $targetId
                        ]);
                    } catch (\Throwable $legacyErr) {
                        // Non-blocking
                    }
                }

                $updatedExistingCount++;
            } else {
                // =========================================================================
                // CASE B: NEW RECORD -> INSERT INTO projects & project_details
                // =========================================================================
                $newId = !empty($rawId) ? $rawId : ('PRJ-' . str_pad((string)(2001 + $index), 4, '0', STR_PAD_LEFT));
                $plotSuffix = (!empty($rawPlotNo) && stripos($projectName, 'plot') === false) ? (stripos($rawPlotNo, 'plot') !== false ? " - {$rawPlotNo}" : " - Plot {$rawPlotNo}") : '';
                $titleDisplay = $projectName . $plotSuffix;

                $insProj = $db->prepare("
                    INSERT INTO projects (
                        project_id, project_name, developer_id, developer_name, district, city, locality,
                        category, type, land_type, price_from, price_to, sqft_rate, min_plot_size, max_plot_size,
                        project_stage, launch_date, possession_date, rera_no, brokerage, no_brokerage, featured,
                        free_access, whatsapp_number, cover_image, interactive_map, total_units, units_sold,
                        project_status, submitted_by, reviewed_by, review_notes, rejection_reason, reviewed_at,
                        status, created_at, updated_at
                    ) VALUES (
                        :pId, :pName, :devId, :devName, :district, :city, :locality,
                        :projCategory, :projType, :landType, :priceFrom, :priceTo, :sqftRate, :minSize, :maxSize,
                        :pStage, :launchDate, :possDate, :rera, :brokerage, :noBrokerage, :featured,
                        :freeAccess, :waNum, :coverImg, :mapUrl, :totalUnits, :unitsSold,
                        :pStatus, :subBy, :revBy, :revNotes, :rejReason, :revAt,
                        :status, NOW(), NOW()
                    )
                ");
                $insProj->execute([
                    ':pId'          => $newId,
                    ':pName'        => $titleDisplay,
                    ':devId'        => $devId,
                    ':devName'      => $rawDeveloper ?: 'Registry Admin',
                    ':district'     => $district,
                    ':city'         => $city,
                    ':locality'     => $locality,
                    ':projCategory' => $rawCategory,
                    ':projType'     => $rawType,
                    ':landType'     => $rawLandType,
                    ':priceFrom'    => $rawPriceFrom > 0 ? $rawPriceFrom : 2800000.00,
                    ':priceTo'      => $rawPriceTo > 0 ? $rawPriceTo : 4500000.00,
                    ':sqftRate'     => $rawSqftRate > 0 ? $rawSqftRate : 2400.00,
                    ':minSize'      => $rawMinPlotSize > 0 ? $rawMinPlotSize : 1200,
                    ':maxSize'      => $rawMaxPlotSize > 0 ? $rawMaxPlotSize : 2400,
                    ':pStage'       => $rawProjectStage,
                    ':launchDate'   => $rawLaunchDate,
                    ':possDate'     => $rawPossessionDate,
                    ':rera'         => $rawReraNo ?: 'TNRERA Registered',
                    ':brokerage'    => $rawBrokerage,
                    ':noBrokerage'  => $rawNoBrokerage,
                    ':featured'     => $rawFeatured,
                    ':freeAccess'   => $rawFreeAccess,
                    ':waNum'        => $whatsappNumber,
                    ':coverImg'     => $rawCoverImage,
                    ':mapUrl'       => $rawInteractiveMap,
                    ':totalUnits'   => $rawTotalUnits ?: '24 Plots',
                    ':unitsSold'    => $rawUnitsSold ?: '8 Sold',
                    ':pStatus'      => $rawProjectStatus,
                    ':subBy'        => $rawSubmittedBy ?: ($rawDeveloper ?: 'Registry Admin'),
                    ':revBy'        => $rawReviewedBy,
                    ':revNotes'     => $rawReviewNotes,
                    ':rejReason'    => $rawRejectionReason,
                    ':revAt'        => $rawReviewedAt,
                    ':status'       => $rawStatus
                ]);

                $insDetail = $db->prepare("
                    INSERT INTO project_details (
                        project_id, total_layout_area, total_plots, available_plot_sizes,
                        dimensions, road_width, corner_plot, land_type, approval_authority, approval_reference,
                        approval_date, rera_details, internal_roads, street_lights, drainage, water, electricity,
                        parks, security, other_facilities, gps, nearby_roads, railway_station, schools, hospitals,
                        employment_hubs, residential_development, infrastructure_projects, gallery, videos, drone_videos,
                        layout_pdf, brochure, created_at, updated_at
                    ) VALUES (
                        :pId, :totArea, :totPlots, :availSizes, :dim, :roadW, :corner, :landType,
                        :appAuth, :appRef, :appDate, :reraDet, :intRoads, :sLights, :drainage, :water, :elec,
                        :parks, :sec, :otherFac, :gps, :nearbyRds, :railway, :schools, :hosps,
                        :empHubs, :resDev, :infraProj, :gallery, :videos, :droneVideos,
                        :layoutPdf, :brochure, NOW(), NOW()
                    )
                ");
                $insDetail->execute([
                    ':pId'        => $newId,
                    ':totArea'    => $rawTotalLayoutArea,
                    ':totPlots'   => $rawTotalPlots,
                    ':availSizes' => $rawAvailablePlotSizes,
                    ':dim'        => $rawDimensions,
                    ':roadW'      => $rawRoadWidth,
                    ':corner'     => $rawCornerPlot,
                    ':landType'   => $rawLandType,
                    ':appAuth'    => $rawApprovalAuthority,
                    ':appRef'     => $rawApprovalReference,
                    ':appDate'    => $rawApprovalDate,
                    ':reraDet'    => $rawReraDetails,
                    ':intRoads'   => $rawInternalRoads,
                    ':sLights'    => $rawStreetLights,
                    ':drainage'   => $rawDrainage,
                    ':water'      => $rawWater,
                    ':elec'       => $rawElectricity,
                    ':parks'      => $rawParks,
                    ':sec'        => $rawSecurity,
                    ':otherFac'   => $rawOtherFacilities,
                    ':gps'        => $rawGps,
                    ':nearbyRds'  => $rawNearbyRoads,
                    ':railway'    => $rawRailwayStation,
                    ':schools'    => $rawSchools,
                    ':hosps'      => $rawHospitals,
                    ':empHubs'    => $rawEmploymentHubs,
                    ':resDev'     => $rawResidentialDevelopment,
                    ':infraProj'  => $rawInfrastructureProjects,
                    ':gallery'    => $rawGallery,
                    ':videos'     => $rawVideos,
                    ':droneVideos'=> $rawDroneVideos,
                    ':layoutPdf'  => $rawLayoutPdf ?: "https://onenewstory.in/p_demo_5/backend/uploads/layout_{$newId}.pdf",
                    ':brochure'   => $rawBrochure ?: "https://onenewstory.in/p_demo_5/backend/uploads/brochure_{$newId}.pdf"
                ]);

                // Mirror to properties table if present
                if ($hasPropertiesTable) {
                    try {
                        $insProp = $db->prepare("
                            INSERT INTO properties (
                                id, developer_id, city_id, locality_id, title, property_type, listing_mode,
                                locality_name, city_name, price, price_per_sqft, sqft, bhk_badge, facing_or_view,
                                main_image_url, rera_number, brokerage_badge, possession_date, project_status,
                                total_units, interactive_map_url, is_featured, status, submitted_by_name,
                                reviewed_by_name, created_at, updated_at
                            ) VALUES (
                                :id, :devId, 1, 1, :title, :cat, :mode,
                                :loc, :city, :price, :sqftRate, :sqft, 'Approved Plots', :facing,
                                :img, :rera, :brokerage, :possDate, :pStatus,
                                :totUnits, :mapUrl, :feat, :stat, :subByName,
                                :revByName, NOW(), NOW()
                            )
                        ");
                        $insProp->execute([
                            ':id'         => $newId,
                            ':devId'      => $devId,
                            ':title'      => $titleDisplay,
                            ':cat'        => $rawCategory,
                            ':mode'       => substr($rawType, 0, 5),
                            ':loc'        => $locality,
                            ':city'       => $city,
                            ':price'      => '₹ ' . number_format($rawPriceFrom, 0),
                            ':sqftRate'   => '₹ ' . number_format($rawSqftRate, 0) . ' / sq.ft',
                            ':sqft'       => (string)$rawMinPlotSize,
                            ':facing'     => $rawFacing ?: 'East Facing',
                            ':img'        => $rawCoverImage,
                            ':rera'       => $rawReraNo,
                            ':brokerage'  => $rawBrokerage,
                            ':possDate'   => $rawPossessionDate,
                            ':pStatus'    => $rawProjectStatus,
                            ':totUnits'   => $rawTotalUnits ?: '24 Plots',
                            ':mapUrl'     => $rawInteractiveMap,
                            ':feat'       => $rawFeatured,
                            ':stat'       => $rawStatus,
                            ':subByName'  => $rawSubmittedBy ?: ($rawDeveloper ?: 'Registry Admin'),
                            ':revByName'  => $rawReviewedBy
                        ]);
                    } catch (\Throwable $legacyErr) {
                        // Non-blocking
                    }
                }

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
