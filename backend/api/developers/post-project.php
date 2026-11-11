<?php
/**
 * Developer Post New Project Details API
 * Allows authorized developer to post new project details (similar to the free post property option)
 * automatically linking to their authorized company and marking developer role.
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if (($_SERVER['REQUEST_METHOD'] ?? 'POST') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

use Mannidam\Config\Database;

try {
    $db = (new Database())->getConnection();
    $input = json_decode(file_get_contents('php://input'), true) ?? [];

    $userId = (int)($input['userId'] ?? 0);
    $developerId = (int)($input['developerId'] ?? 0);

    // 1. Authorisation & Developer Validation
    $user = null;
    if ($userId > 0) {
        $uStmt = $db->prepare("SELECT id, name, email, phone, role, developer_id FROM users WHERE id = ?");
        $uStmt->execute([$userId]);
        $user = $uStmt->fetch(PDO::FETCH_ASSOC);
    }

    if ($user) {
        $role = $user['role'] ?? 'buyer';
        $userDevId = (int)($user['developer_id'] ?? 0);

        if ($role === 'developer') {
            if ($userDevId <= 0) {
                $userDevId = 1; // Default
            }
            // Strict authorization check: Developer can ONLY post for their assigned company
            if ($developerId > 0 && $developerId !== $userDevId) {
                http_response_code(403);
                echo json_encode([
                    'success' => false,
                    'message' => 'Security Error: You are only permitted to post projects for your authorized company.'
                ]);
                exit;
            }
            $developerId = $userDevId;
        } else {
            // For admin or demo, use passed developerId or 1
            if ($developerId <= 0) $developerId = 1;
        }
    } else {
        if ($developerId <= 0) $developerId = 1;
    }

    // Fetch Developer Company
    $dStmt = $db->prepare("SELECT id, name, rera_number, logo_url FROM developers WHERE id = ?");
    $dStmt->execute([$developerId]);
    $developer = $dStmt->fetch(PDO::FETCH_ASSOC);

    if (!$developer) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Associated developer entity not found.'
        ]);
        exit;
    }

    // 2. Validate Project Inputs
    $title = trim((string)($input['title'] ?? ''));
    if (empty($title)) {
        http_response_code(422);
        echo json_encode([
            'success' => false,
            'message' => 'Project title is required.'
        ]);
        exit;
    }

    $propertyType = trim((string)($input['propertyType'] ?? 'Gated CMDA Plots'));
    $listingMode = trim((string)($input['listingMode'] ?? 'plots'));
    $cityName = trim((string)($input['cityName'] ?? 'Chennai'));
    $localityName = trim((string)($input['localityName'] ?? 'Tambaram Corridor'));
    $district = trim((string)($input['district'] ?? $cityName));
    $taluk = trim((string)($input['taluk'] ?? ''));
    $corridor = trim((string)($input['corridor'] ?? ''));
    $price = trim((string)($input['price'] ?? '₹ 45.00 Lakhs'));
    $pricePerSqft = trim((string)($input['pricePerSqft'] ?? '₹ 3,750/sq.ft'));
    $sqft = trim((string)($input['sqft'] ?? '1200 sq.ft'));
    $bhkBadge = trim((string)($input['bhkBadge'] ?? 'DTCP Sanctioned Plot'));
    $facingOrView = trim((string)($input['facingOrView'] ?? 'East Facing'));
    $possessionDate = trim((string)($input['possessionDate'] ?? 'Ready to Register'));
    $projectStatus = trim((string)($input['projectStatus'] ?? 'Ready to Register'));
    $totalLandParcel = trim((string)($input['totalLandParcel'] ?? 'Approved Layout'));
    $totalUnits = trim((string)($input['totalUnits'] ?? '24 Plotted Units'));
    $reraNumber = trim((string)($input['reraNumber'] ?? $developer['rera_number'] ?: 'TNRERA Verified'));
    $mainImageUrl = trim((string)($input['mainImageUrl'] ?? ''));

    if (empty($mainImageUrl)) {
        $mainImageUrl = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80';
    }

    // Resolve city_id
    $cityStmt = $db->prepare("SELECT id FROM cities WHERE LOWER(name) = LOWER(?) LIMIT 1");
    $cityStmt->execute([$cityName]);
    $cityId = (int)$cityStmt->fetchColumn();
    if ($cityId <= 0) $cityId = 1;

    // Generate unique ID
    $prefix = 'PRJ-';
    $randNum = rand(1000, 9999);
    $propId = $prefix . $randNum;
    $idCheck = $db->prepare("SELECT id FROM properties WHERE id = ?");
    $idCheck->execute([$propId]);
    while ($idCheck->fetch()) {
        $randNum = rand(1000, 9999);
        $propId = $prefix . $randNum;
        $idCheck->execute([$propId]);
    }

    $db->beginTransaction();

    // 3. Insert into properties
    $propInsert = $db->prepare("
        INSERT INTO properties (
            id, developer_id, city_id, title, property_type, listing_mode,
            locality_name, city_name, price, price_per_sqft, sqft,
            bhk_badge, facing_or_view, main_image_url, rera_number,
            brokerage_badge, special_tag, points_badge, possession_date,
            project_status, total_land_parcel, total_units, media_points,
            is_featured, status, submitted_by_user_id, submitted_by_name, submitted_by_role
        ) VALUES (
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            '0% Direct SRO Deed', 'Developer Verified', 4, ?,
            ?, ?, ?, 4,
            1, 'published', ?, ?, 'developer'
        )
    ");

    $propInsert->execute([
        $propId,
        $developerId,
        $cityId,
        $title,
        $propertyType,
        $listingMode,
        $localityName,
        $cityName,
        $price,
        $pricePerSqft,
        $sqft,
        $bhkBadge,
        $facingOrView,
        $mainImageUrl,
        $reraNumber,
        $possessionDate,
        $projectStatus,
        $totalLandParcel,
        $totalUnits,
        $userId > 0 ? $userId : 105,
        $user ? $user['name'] : $developer['name']
    ]);

    // 4. Insert into property_master_details
    $pmdInsert = $db->prepare("
        INSERT INTO property_master_details (
            property_id, project_name, developer, village_locality, area_location,
            taluk, district, corridor, pincode, rera_number,
            plot_no, plot_size_sqft, plot_size_cents, facing,
            patta_type, dtcp_approved, dtcp_approval_no, road_width_ft,
            clear_title_available, bank_loan_approved, suited_for, possession_timeline
        ) VALUES (
            ?, ?, ?, ?, ?,
            ?, ?, ?, '600001', ?,
            'Plot 1', ?, 2.75, ?,
            'Individual Patta', 'Yes', ?, ?,
            'Yes', 'Yes', 'Residential Villa Construction', ?
        )
    ");

    $cleanSqft = (int)preg_replace('/[^\d]/', '', $sqft);
    if ($cleanSqft <= 0) $cleanSqft = 1200;
    $roadWidth = (int)preg_replace('/[^\d]/', '', (string)($input['roadWidth'] ?? '40'));
    if ($roadWidth <= 0) $roadWidth = 40;
    $dtcpApprovalNo = trim((string)($input['dtcpApprovalNo'] ?? $input['plotApproval'] ?? 'DTCP/2026/L-042'));

    $pmdInsert->execute([
        $propId,
        $title,
        $developer['name'],
        $localityName,
        $cityName,
        $taluk ?: $cityName,
        $district ?: $cityName,
        $corridor ?: 'State Highway Corridor',
        $reraNumber,
        $cleanSqft,
        $facingOrView,
        $dtcpApprovalNo,
        $roadWidth,
        $possessionDate
    ]);

    // 5. Insert highlights
    $highlights = $input['highlights'] ?? [];
    if (empty($highlights) || !is_array($highlights)) {
        $highlights = [
            '100% Clear Title Patta Guarantee',
            'DTCP / CMDA Approved Master Layout',
            $roadWidth . ' Ft Wide Bitumen Access Road',
            'Pre-Approved Bank Loans (SBI, HDFC, ICICI)'
        ];
    }

    $hlStmt = $db->prepare("INSERT INTO property_highlights (property_id, highlight_text, sort_order) VALUES (?, ?, ?)");
    foreach ($highlights as $idx => $hl) {
        $hlStmt->execute([$propId, (string)$hl, $idx + 1]);
    }

    // 6. Subdivided Plots (if provided)
    $subdividedPlots = $input['subdividedPlots'] ?? [];
    if (!empty($subdividedPlots) && is_array($subdividedPlots)) {
        $spStmt = $db->prepare("
            INSERT INTO property_subdivided_plots (
                property_id, plot_number, plot_size_sqft, plot_size_cents,
                facing, total_price, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        foreach ($subdividedPlots as $sp) {
            $spStmt->execute([
                $propId,
                $sp['plotNumber'] ?? $sp['plot_number'] ?? 'P-1',
                (int)($sp['plotSizeSqft'] ?? $sp['plot_size_sqft'] ?? 1200),
                (float)($sp['plotSizeCents'] ?? $sp['plot_size_cents'] ?? 2.75),
                $sp['facing'] ?? 'East',
                $sp['totalPrice'] ?? $sp['total_price'] ?? $price,
                $sp['status'] ?? 'available'
            ]);
        }
    }

    $db->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Project posted successfully under ' . $developer['name'],
        'data' => [
            'propertyId' => $propId,
            'title' => $title,
            'developerId' => $developerId,
            'developerName' => $developer['name'],
            'price' => $price,
            'reraNumber' => $reraNumber,
            'status' => 'published',
            'viewUrl' => '/property/' . $propId
        ]
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Throwable $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to post developer project: ' . $e->getMessage()
    ]);
}

