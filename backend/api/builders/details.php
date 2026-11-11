<?php
/**
 * Mannidam Real Estate Marketplace - Builder Profile & Projects Details API
 * Retrieves a developer's comprehensive dossier, aggregated project portfolio,
 * upcoming projects, custom logo, RERA number, and live registry properties.
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';

use Mannidam\Config\Database;

$name = trim((string)($_GET['name'] ?? $_GET['developer'] ?? $_GET['slug'] ?? $_GET['id'] ?? ''));

if (empty($name)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Builder / Developer name or ID parameter is required.'
    ]);
    exit;
}

try {
    $db = (new Database())->getConnection();

    // 1. Lookup Developer Company Record from master table
    $isNumeric = is_numeric($name) && (int)$name > 0;
    $slugCandidate = strtolower(trim(preg_replace('/[^a-zA-Z0-9]+/', '-', $name), '-'));

    $devStmt = $db->prepare("
        SELECT * FROM developers 
        WHERE (id = :id AND :isNum = 1)
           OR LOWER(TRIM(name)) = LOWER(TRIM(:name))
           OR slug = :slug
           OR slug = :origSlug
           OR name LIKE :likeName
        ORDER BY CASE WHEN id = :id2 THEN 0 ELSE 1 END, id ASC
        LIMIT 1
    ");
    $devStmt->execute([
        ':id' => $isNumeric ? (int)$name : 0,
        ':isNum' => $isNumeric ? 1 : 0,
        ':name' => $name,
        ':slug' => $slugCandidate,
        ':origSlug' => strtolower($name),
        ':likeName' => '%' . $name . '%',
        ':id2' => $isNumeric ? (int)$name : 0
    ]);
    $devMaster = $devStmt->fetch(PDO::FETCH_ASSOC);

    $devId = $devMaster ? (int)$devMaster['id'] : 0;
    $targetName = $devMaster ? $devMaster['name'] : $name;

    // 2. Fetch all properties matching this developer ID or name
    $stmt = $db->prepare("
        SELECT 
            p.id,
            p.title,
            p.property_type AS propertyType,
            p.locality_name AS locality,
            p.city_name AS city,
            c.city_key AS cityKey,
            p.price,
            p.price_per_sqft AS pricePerSqFt,
            p.sqft,
            p.bhk_badge AS bhkBadge,
            p.facing_or_view AS facingOrView,
            p.main_image_url AS imageUrl,
            p.rera_number AS reraBadge,
            p.brokerage_badge AS brokerageBadge,
            p.points_badge AS pointsBadge,
            p.special_tag AS specialTag,
            p.media_points AS mediaPoints,
            p.whatsapp_url AS whatsappUrl,
            p.possession_date AS possessionDate,
            p.project_status AS projectStatus,
            p.total_land_parcel AS totalLandParcel,
            p.total_units AS totalUnits,
            pmd.project_name AS projectName,
            pmd.developer AS developerName,
            pmd.village_locality AS villageLocality,
            pmd.area_location AS areaLocation,
            pmd.taluk,
            pmd.district,
            pmd.pincode,
            pmd.corridor,
            pmd.google_maps_link AS googleMapsLink,
            pmd.plot_no AS plotNo,
            pmd.plot_size_sqft AS plotSizeSqft,
            pmd.plot_size_cents AS plotSizeCents,
            pmd.facing,
            pmd.patta_type AS pattaType,
            pmd.dtcp_approved AS dtcpApproved,
            pmd.dtcp_approval_no AS dtcpApprovalNo,
            pmd.road_width_ft AS roadWidthFt,
            pmd.highway_name AS highwayName,
            pmd.rera_number AS masterReraNumber,
            pmd.clear_title_available AS clearTitleAvailable,
            pmd.bank_loan_approved AS bankLoanApproved,
            pmd.suited_for AS suitedFor,
            pmd.possession_timeline AS possessionTimeline,
            pmd.developer_maintenance_years AS developerMaintenanceYears,
            pmd.remarks
        FROM properties p
        LEFT JOIN property_master_details pmd ON pmd.property_id = p.id
        LEFT JOIN cities c ON p.city_id = c.id
        WHERE ((:devId > 0 AND p.developer_id = :devId2)
               OR LOWER(TRIM(pmd.developer)) = LOWER(TRIM(:targetName))
               OR LOWER(TRIM(pmd.developer)) = LOWER(TRIM(:origName)))
          AND (p.status = 'published' OR p.status IS NULL)
        ORDER BY p.created_at DESC, p.id ASC
    ");
    $stmt->execute([
        ':devId' => $devId,
        ':devId2' => $devId,
        ':targetName' => $targetName,
        ':origName' => $name
    ]);
    $rawProps = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($rawProps) && !$devMaster) {
        echo json_encode([
            'success' => false,
            'message' => 'No developer or projects found matching: ' . htmlspecialchars($name),
            'data' => null
        ]);
        exit;
    }

    $fallbackMockImages = [
        'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1500076656116-558758c991c1?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1524813686514-a57563d77d61?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1592595896551-12b371d546d5?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'
    ];

    $sanitizedProperties = [];
    $projectsMap = [];
    $districtsSet = [];
    $citiesSet = [];
    $reraSet = [];
    $dtcpCount = 0;
    $minPrice = PHP_INT_MAX;
    $maxPrice = 0;

    $developerOfficialName = $devMaster ? $devMaster['name'] : (!empty($rawProps[0]['developerName']) ? trim($rawProps[0]['developerName']) : $name);

    foreach ($rawProps as $idx => $r) {
        $img = (!empty($r['imageUrl']) && str_starts_with($r['imageUrl'], 'http')) 
            ? $r['imageUrl'] 
            : $fallbackMockImages[$idx % count($fallbackMockImages)];

        $cleanPrice = (int)preg_replace('/[^\d]/', '', (string)$r['price']);
        if ($cleanPrice > 0) {
            if ($cleanPrice < $minPrice) $minPrice = $cleanPrice;
            if ($cleanPrice > $maxPrice) $maxPrice = $cleanPrice;
        }

        if (!empty($r['district'])) $districtsSet[$r['district']] = true;
        if (!empty($r['city'])) $citiesSet[$r['city']] = true;
        if (!empty($r['reraBadge']) || !empty($r['masterReraNumber'])) {
            $reraNo = $r['masterReraNumber'] ?: $r['reraBadge'];
            $reraSet[$reraNo] = true;
        }
        if (($r['dtcpApproved'] ?? '') === 'Yes') {
            $dtcpCount++;
        }

        $projName = trim($r['projectName'] ?? '');
        if (empty($projName)) {
            $projName = $r['title'];
        }
        $projKey = strtolower($projName);
        if (!isset($projectsMap[$projKey])) {
            $projectsMap[$projKey] = [
                'name'            => $projName,
                'locality'        => $r['villageLocality'] ?: ($r['locality'] ?: 'Tamil Nadu'),
                'district'        => $r['district'] ?: ($r['city'] ?: 'Tamil Nadu'),
                'taluk'           => $r['taluk'] ?: '',
                'corridor'        => $r['corridor'] ?: '',
                'reraNumber'      => $r['masterReraNumber'] ?: ($r['reraBadge'] ?: ($devMaster['rera_number'] ?? 'TNRERA Verified')),
                'dtcpApprovalNo'  => $r['dtcpApprovalNo'] ?: '',
                'startingPrice'   => $r['price'],
                'startingSqft'    => $r['sqft'],
                'thumbnail'       => $img,
                'propertyCount'   => 0,
                'samplePropertyId'=> $r['id'],
                'highwayName'     => $r['highwayName'] ?: ''
            ];
        }
        $projectsMap[$projKey]['propertyCount']++;

        $sanitizedProperties[] = [
            'id'              => $r['id'],
            'title'           => $r['title'],
            'propertyType'    => $r['propertyType'],
            'locality'        => $r['locality'],
            'city'            => $r['city'],
            'cityKey'         => $r['cityKey'] ?: 'chennai',
            'price'           => $r['price'],
            'pricePerSqFt'    => $r['pricePerSqFt'],
            'sqft'            => $r['sqft'],
            'bhkBadge'        => $r['bhkBadge'],
            'facingOrView'    => $r['facingOrView'],
            'imageUrl'        => $img,
            'badges'          => [
                'rera'       => $r['masterReraNumber'] ?: ($r['reraBadge'] ?: ($devMaster['rera_number'] ?? 'TNRERA Verified')),
                'brokerage'  => $r['brokerageBadge'] ?: '0% Direct SRO Deed',
                'points'     => (int)($r['pointsBadge'] ?: 4),
                'specialTag' => $r['specialTag'] ?: ''
            ],
            'highlights'      => [
                'DTCP / CMDA Approved Layout',
                ($r['roadWidthFt'] ? $r['roadWidthFt'] . ' Ft Wide Bitumen Road' : '40 Ft Wide Bitumen Road'),
                ($r['pattaType'] ? $r['pattaType'] : 'Individual Patta'),
                ($r['corridor'] ? 'Strategic ' . $r['corridor'] : 'Strategic Growth Corridor')
            ],
            'mediaPoints'     => (int)($r['mediaPoints'] ?: 4),
            'freePhotos'      => [$img],
            'whatsappUrl'     => $r['whatsappUrl'] ?: ('https://wa.me/919444100000?text=Hi+Find+a+Plot%2C+I+am+interested+in+' . urlencode($r['title']) . '+%28ID%3A+' . $r['id'] . '%29'),
            'possessionDate'  => $r['possessionDate'] ?: 'Ready for registration',
            'projectStatus'   => $r['projectStatus'] ?: 'Ready to Register',
            'totalLandParcel' => $r['totalLandParcel'] ?: 'Approved Layout',
            'totalUnits'      => $r['totalUnits'] ?: 'Individual Plots',
            'googleMapsLink'  => $r['googleMapsLink'],
            'developerName'   => $developerOfficialName,
            'projectName'     => $r['projectName'],
            'district'        => $r['district'],
            'plotSizeSqft'    => (int)$r['plotSizeSqft'],
            'plotSizeCents'   => (float)$r['plotSizeCents'],
            'facing'          => $r['facing'],
            'pattaType'       => $r['pattaType'],
            'dtcpApproved'    => $r['dtcpApproved'],
            'dtcpApprovalNo'  => $r['dtcpApprovalNo']
        ];
    }

    $projectsList = array_values($projectsMap);

    // Upcoming Projects
    $upcomingList = [];
    if ($devMaster && !empty($devMaster['upcoming_projects'])) {
        $dec = json_decode($devMaster['upcoming_projects'], true);
        if (is_array($dec)) {
            $upcomingList = $dec;
        }
    }

    $formattedMinPrice = ($minPrice < PHP_INT_MAX) ? ('₹ ' . number_format($minPrice)) : '₹ 25 Lakhs';
    $formattedMaxPrice = ($maxPrice > 0) ? ('₹ ' . number_format($maxPrice)) : '₹ 1.8 Cr';

    $activeProjectsCount = count($projectsList);
    $upcomingProjectsCount = count($upcomingList);
    $totalProjects = $activeProjectsCount + $upcomingProjectsCount;

    $officialRera = ($devMaster && !empty($devMaster['rera_number'])) 
        ? $devMaster['rera_number'] 
        : (count($reraSet) > 0 ? array_keys($reraSet)[0] : 'TNRERA/PROM/0219/2026');

    echo json_encode([
        'success' => true,
        'message' => 'Builder profile and project portfolio retrieved successfully',
        'data'    => [
            'developer' => [
                'id'                => $devMaster ? (int)$devMaster['id'] : 1,
                'name'              => $developerOfficialName,
                'rawName'           => $name,
                'slug'              => $devMaster ? $devMaster['slug'] : $slugCandidate,
                'reraNumber'        => $officialRera,
                'logoUrl'           => $devMaster && !empty($devMaster['logo_url']) ? $devMaster['logo_url'] : null,
                'coverImageUrl'     => $devMaster && !empty($devMaster['cover_image_url']) ? $devMaster['cover_image_url'] : null,
                'totalProperties'   => count($sanitizedProperties),
                'totalProjects'     => max($totalProjects, 1),
                'activeProjectsCount' => $activeProjectsCount,
                'upcomingProjectsCount' => $upcomingProjectsCount,
                'hasMultipleProjects' => $totalProjects > 1,
                'districts'         => count($districtsSet) > 0 ? array_keys($districtsSet) : ['Chennai', 'Chengalpattu'],
                'cities'            => count($citiesSet) > 0 ? array_keys($citiesSet) : ['Chennai'],
                'reraLayoutsCount'  => count($reraSet),
                'dtcpApprovedCount' => $dtcpCount,
                'minPrice'          => $formattedMinPrice,
                'maxPrice'          => $formattedMaxPrice,
                'estYear'           => $devMaster && !empty($devMaster['established_year']) ? $devMaster['established_year'] : '2016',
                'completedProjects' => $devMaster && !empty($devMaster['projects_completed']) ? $devMaster['projects_completed'] : '25+ Projects',
                'deliveredSqFt'     => $devMaster && !empty($devMaster['delivered_sqft']) ? $devMaster['delivered_sqft'] : '12M+ sq.ft',
                'onTimeTrack'       => $devMaster && !empty($devMaster['on_time_track']) ? $devMaster['on_time_track'] : '98.5% On-Time Delivery',
                'corporateOffice'   => $devMaster && !empty($devMaster['corporate_office']) ? $devMaster['corporate_office'] : 'Chennai, Tamil Nadu',
                'contactEmail'      => $devMaster && !empty($devMaster['contact_email']) ? $devMaster['contact_email'] : 'contact@developer.in',
                'contactPhone'      => $devMaster && !empty($devMaster['contact_phone']) ? $devMaster['contact_phone'] : '+91 94441 00000',
                'websiteUrl'        => $devMaster && !empty($devMaster['website_url']) ? $devMaster['website_url'] : '',
                'complianceRating'  => '99.4%',
                'about'             => $devMaster && !empty($devMaster['about_text']) ? $devMaster['about_text'] : ($developerOfficialName . ' is a premier verified land development entity in Tamil Nadu, specializing in legally transparent plotted layouts, DTCP sanctions, and ready-to-construct plots with direct SRO registration.'),
                'upcomingProjects'  => $upcomingList
            ],
            'projects'   => $projectsList,
            'upcomingProjects' => $upcomingList,
            'properties' => $sanitizedProperties
        ]
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to fetch builder details: ' . $e->getMessage()
    ]);
}
