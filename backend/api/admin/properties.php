<?php
/**
 * /api/admin/properties.php
 * Admin management endpoint to fetch all properties (with review statuses)
 * and post/update properties with Maker-Checker attribution.
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

use Mannidam\Config\Database;
use Mannidam\Helpers\Response;

Response::initCors();

$method = $_SERVER['REQUEST_METHOD'];
$db = (new Database())->getConnection();

if ($method === 'GET') {
    // 1. Fetch KPI metrics for Admin Dashboard
    $statsStmt = $db->query("
        SELECT 
            COUNT(*) AS total_count,
            SUM(CASE WHEN status = 'pending_review' THEN 1 ELSE 0 END) AS pending_user_reviews,
            SUM(CASE WHEN status = 'pending_peer_review' THEN 1 ELSE 0 END) AS pending_peer_reviews,
            SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published_count,
            SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected_count
        FROM properties
    ");
    $stats = $statsStmt->fetch(PDO::FETCH_ASSOC);

    // 2. Filter properties
    $statusFilter = $_GET['status'] ?? 'all';
    $searchQuery  = trim($_GET['q'] ?? '');
    
    $where = [];
    $params = [];

    if (!empty($statusFilter) && $statusFilter !== 'all') {
        $where[] = 'p.status = :status';
        $params[':status'] = $statusFilter;
    }

    if (!empty($searchQuery)) {
        $where[] = '(p.title LIKE :q OR p.locality_name LIKE :q OR p.city_name LIKE :q OR p.submitted_by_name LIKE :q)';
        $params[':q'] = "%{$searchQuery}%";
    }

    $whereSql = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

    $sql = "
        SELECT 
            p.id,
            p.title,
            p.property_type AS propertyType,
            p.listing_mode AS listingMode,
            p.locality_name AS localityName,
            p.city_name AS cityName,
            p.price,
            p.price_per_sqft AS pricePerSqft,
            p.sqft,
            p.bhk_badge AS bhkBadge,
            p.facing_or_view AS facingOrView,
            p.main_image_url AS mainImageUrl,
            p.rera_number AS reraNumber,
            p.status,
            p.submitted_by_user_id AS submittedByUserId,
            p.submitted_by_name AS submittedByName,
            p.submitted_by_role AS submittedByRole,
            p.reviewed_by_user_id AS reviewedByUserId,
            p.reviewed_by_name AS reviewedByName,
            p.reviewed_at AS reviewedAt,
            p.review_notes AS reviewNotes,
            p.rejection_reason AS rejectionReason,
            p.created_at AS createdAt,
            p.updated_at AS updatedAt
        FROM properties p
        {$whereSql}
        ORDER BY 
            CASE 
                WHEN p.status = 'pending_peer_review' THEN 1
                WHEN p.status = 'pending_review' THEN 2
                WHEN p.status = 'revision_requested' THEN 3
                ELSE 4
            END,
            p.updated_at DESC
        LIMIT 100
    ";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $properties = $stmt->fetchAll(PDO::FETCH_ASSOC);

    Response::success([
        'stats' => [
            'total'               => (int)($stats['total_count'] ?? 0),
            'pendingUserReviews'  => (int)($stats['pending_user_reviews'] ?? 0),
            'pendingPeerReviews'  => (int)($stats['pending_peer_reviews'] ?? 0),
            'published'           => (int)($stats['published_count'] ?? 0),
            'rejected'            => (int)($stats['rejected_count'] ?? 0),
        ],
        'properties' => $properties
    ], 'Admin properties retrieved successfully');
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        Response::error('Invalid JSON payload', 400);
    }

    $action = $input['action'] ?? '';
    if ($action === 'save_plot_details') {
        $propId = trim($input['propertyId'] ?? '');
        if (empty($propId)) {
            Response::error('Property ID is required', 400);
        }

        $checkStmt = $db->prepare("SELECT id, title, property_type FROM properties WHERE id = ?");
        $checkStmt->execute([$propId]);
        $prop = $checkStmt->fetch(PDO::FETCH_ASSOC);
        if (!$prop) {
            Response::error('Property not found', 404);
        }

        $factsheet = $input['plotFactsheet'] ?? null;
        $subdividedPlots = $input['subdividedPlots'] ?? [];

        // Ensure tables exist
        $db->exec("
            CREATE TABLE IF NOT EXISTS property_plot_details (
                id INT AUTO_INCREMENT PRIMARY KEY,
                property_id VARCHAR(50) NOT NULL,
                layout_sanction_no VARCHAR(150) DEFAULT '',
                rera_layout_no VARCHAR(150) DEFAULT '',
                frontage_road_width VARCHAR(100) DEFAULT '',
                water_table_depth VARCHAR(100) DEFAULT '',
                soil_bearing_capacity VARCHAR(100) DEFAULT '',
                fsi_permissible VARCHAR(100) DEFAULT '',
                eb_substation VARCHAR(100) DEFAULT '',
                boundary_wall VARCHAR(100) DEFAULT '',
                drainage_system VARCHAR(100) DEFAULT '',
                patta_status VARCHAR(100) DEFAULT '',
                dimension_ranges VARCHAR(100) DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY (property_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE IF NOT EXISTS property_subdivided_plots (
                id INT AUTO_INCREMENT PRIMARY KEY,
                property_id VARCHAR(50) NOT NULL,
                plot_no VARCHAR(50) NOT NULL,
                status VARCHAR(20) DEFAULT 'available',
                super_built_up_yds DECIMAL(8,2) DEFAULT 0,
                net_plot_area_yds DECIMAL(8,2) DEFAULT 0,
                super_built_up_sqft INT DEFAULT 0,
                width_meters DECIMAL(6,2) DEFAULT 0,
                length_meters DECIMAL(6,2) DEFAULT 0,
                width_feet DECIMAL(6,2) DEFAULT 0,
                length_feet DECIMAL(6,2) DEFAULT 0,
                facing VARCHAR(50) DEFAULT 'North Facing',
                price_in_lakhs DECIMAL(8,2) DEFAULT 0,
                formatted_price VARCHAR(50) DEFAULT '',
                is_corner TINYINT(1) DEFAULT 0,
                has_trees TINYINT(1) DEFAULT 0,
                pos_x DECIMAL(6,2) DEFAULT 0,
                pos_y DECIMAL(6,2) DEFAULT 0,
                size_w DECIMAL(6,2) DEFAULT 13,
                size_h DECIMAL(6,2) DEFAULT 11,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX (property_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");

        // Save / update factsheet
        if (!empty($factsheet)) {
            $delFact = $db->prepare("DELETE FROM property_plot_details WHERE property_id = ?");
            $delFact->execute([$propId]);

            $plotDetailStmt = $db->prepare("
                INSERT INTO property_plot_details (
                    property_id, layout_sanction_no, rera_layout_no, frontage_road_width,
                    water_table_depth, soil_bearing_capacity, fsi_permissible, eb_substation,
                    boundary_wall, drainage_system, patta_status, dimension_ranges
                ) VALUES (
                    :pid, :sanction, :rera, :road, :water, :soil, :fsi, :eb, :wall, :drain, :patta, :dims
                )
            ");
            $plotDetailStmt->execute([
                ':pid'      => $propId,
                ':sanction' => $factsheet['layoutSanctionNo'] ?? '',
                ':rera'     => $factsheet['reraLayoutNo'] ?? '',
                ':road'     => $factsheet['frontageRoadWidth'] ?? '40 Feet Wide Bitumen Road',
                ':water'    => $factsheet['waterTableDepth'] ?? 'Sweet Potable Water at 18–24 Feet',
                ':soil'     => $factsheet['soilBearingCapacity'] ?? 'Certified 220 kN/sq.m',
                ':fsi'      => $factsheet['fsiPermissible'] ?? '2.0 FSI',
                ':eb'       => $factsheet['ebSubstation'] ?? 'Dedicated 11kV Substation',
                ':wall'     => $factsheet['boundaryWall'] ?? 'Gated & Compounded Perimeter',
                ':drain'    => $factsheet['drainageSystem'] ?? 'Underground Stormwater Grid',
                ':patta'    => $factsheet['pattaStatus'] ?? 'Individual Computerized Patta Issued',
                ':dims'     => $factsheet['dimensionRanges'] ?? '30x40 to 40x60 standard'
            ]);
        }

        // Save / update subdivided plots
        $delPlots = $db->prepare("DELETE FROM property_subdivided_plots WHERE property_id = ?");
        $delPlots->execute([$propId]);

        if (!empty($subdividedPlots) && is_array($subdividedPlots)) {
            $subStmt = $db->prepare("
                INSERT INTO property_subdivided_plots (
                    property_id, plot_no, status, super_built_up_yds, net_plot_area_yds,
                    super_built_up_sqft, width_meters, length_meters, width_feet, length_feet,
                    facing, price_in_lakhs, formatted_price, is_corner, has_trees,
                    pos_x, pos_y, size_w, size_h
                ) VALUES (
                    :pid, :plot_no, :status, :super_yds, :net_yds,
                    :super_sqft, :w_m, :l_m, :w_ft, :l_ft,
                    :facing, :price_lakhs, :formatted_price, :is_corner, :has_trees,
                    :pos_x, :pos_y, :size_w, :size_h
                )
            ");

            foreach ($subdividedPlots as $p) {
                $facingLower = strtolower((string)($p['facing'] ?? ''));
                $safeY = str_contains($facingLower, 'south') ? -15.0 : 15.0;
                $posY = (float)($p['y'] ?? 0);
                if (abs($posY) < 9.0) {
                    $posY = $safeY;
                }

                $posX = (float)($p['x'] ?? 0);
                if (abs($posX) < 5.0 && $posX != 0) {
                    $posX = $posX < 0 ? -12.0 : 12.0;
                }

                $subStmt->execute([
                    ':pid'             => $propId,
                    ':plot_no'         => (string)($p['plotNo'] ?? '101'),
                    ':status'          => in_array($p['status'] ?? '', ['available', 'sold', 'reserved']) ? $p['status'] : 'available',
                    ':super_yds'       => (float)($p['superBuiltUpYds'] ?? 150),
                    ':net_yds'         => (float)($p['netPlotAreaYds'] ?? 100),
                    ':super_sqft'      => (int)($p['superBuiltUpSqft'] ?? 1350),
                    ':w_m'             => (float)($p['widthMeters'] ?? 11),
                    ':l_m'             => (float)($p['lengthMeters'] ?? 7.8),
                    ':w_ft'            => (float)($p['widthFeet'] ?? 36),
                    ':l_ft'            => (float)($p['lengthFeet'] ?? 25.6),
                    ':facing'          => (string)($p['facing'] ?? 'North Facing'),
                    ':price_lakhs'     => (float)($p['priceInLakhs'] ?? 40),
                    ':formatted_price' => (string)($p['formattedPrice'] ?? '₹40.00 L'),
                    ':is_corner'       => !empty($p['isCorner']) ? 1 : 0,
                    ':has_trees'       => !empty($p['hasTrees']) ? 1 : 0,
                    ':pos_x'           => $posX,
                    ':pos_y'           => $posY,
                    ':size_w'          => (float)($p['w'] ?? 13),
                    ':size_h'          => (float)($p['h'] ?? 11)
                ]);
            }
        }

        Response::success([
            'propertyId' => $propId,
            'plotsCount' => count($subdividedPlots)
        ], 'Plot masterplan factsheet and subdivided parcels saved successfully');
    }

    $title        = trim($input['title'] ?? '');
    $propertyType = trim($input['propertyType'] ?? 'Apartments & Flats');
    $listingMode  = trim($input['listingMode'] ?? 'buy');
    $cityName     = trim($input['cityName'] ?? 'Chennai');
    $localityName = trim($input['localityName'] ?? 'Anna Nagar');
    $price        = trim($input['price'] ?? '₹ 1.25 Cr');
    $pricePerSqft = trim($input['pricePerSqft'] ?? '₹ 8,500/sq.ft');
    $sqft         = trim($input['sqft'] ?? '1,450 sq.ft');
    $bhkBadge     = trim($input['bhkBadge'] ?? '3 BHK');
    $facingOrView = trim($input['facingOrView'] ?? 'East Facing');
    $mainImageUrl = trim($input['mainImageUrl'] ?? 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c');
    $reraNumber   = trim($input['reraNumber'] ?? 'TN/29/Building/0512/2026');
    $authorId     = (int)($input['authorId'] ?? 101);
    $authorName   = trim($input['authorName'] ?? 'Kavitha Rajan');
    $authorRole   = trim($input['authorRole'] ?? 'admin'); // 'user' or 'admin'

    if (empty($title)) {
        Response::error('Property title is required', 400);
    }

    // Determine initial review status according to Maker-Checker 4-eyes rule:
    // If submitted by Admin -> MUST be reviewed by Co-Admin ('pending_peer_review')
    // If submitted by User -> Reviewed by ANY Admin ('pending_review')
    $status = ($authorRole === 'admin' || $authorRole === 'co_admin') 
        ? 'pending_peer_review' 
        : 'pending_review';

    $propId = 'prop-' . bin2hex(random_bytes(6));

    $sql = "
        INSERT INTO properties (
            id, city_id, locality_id, title, property_type, listing_mode, locality_name, city_name,
            price, price_per_sqft, sqft, bhk_badge, facing_or_view, main_image_url, rera_number,
            status, submitted_by_user_id, submitted_by_name, submitted_by_role
        ) VALUES (
            :id, 1, 1, :title, :propertyType, :listingMode, :localityName, :cityName,
            :price, :pricePerSqft, :sqft, :bhkBadge, :facingOrView, :mainImageUrl, :reraNumber,
            :status, :submittedByUserId, :submittedByName, :submittedByRole
        )
    ";

    $stmt = $db->prepare($sql);
    $stmt->execute([
        ':id'                 => $propId,
        ':title'              => $title,
        ':propertyType'       => $propertyType,
        ':listingMode'        => $listingMode,
        ':localityName'       => $localityName,
        ':cityName'           => $cityName,
        ':price'              => $price,
        ':pricePerSqft'       => $pricePerSqft,
        ':sqft'               => $sqft,
        ':bhkBadge'           => $bhkBadge,
        ':facingOrView'       => $facingOrView,
        ':mainImageUrl'       => $mainImageUrl,
        ':reraNumber'         => $reraNumber,
        ':status'             => $status,
        ':submittedByUserId'  => $authorId,
        ':submittedByName'    => $authorName,
        ':submittedByRole'    => $authorRole
    ]);

    // Insert additional gallery images if provided
    $galleryImages = $input['galleryImages'] ?? $input['images'] ?? [];
    if (!empty($galleryImages) && is_array($galleryImages)) {
        try {
            $mediaStmt = $db->prepare("
                INSERT INTO property_media (property_id, media_type, title, url, sort_order)
                VALUES (:propId, 'free_photo', :title, :url, :sortOrder)
            ");
            $order = 1;
            foreach ($galleryImages as $imgUrl) {
                $imgUrl = trim((string)$imgUrl);
                if (!empty($imgUrl) && $imgUrl !== $mainImageUrl) {
                    $mediaStmt->execute([
                        ':propId'    => $propId,
                        ':title'     => $title . ' - Photo ' . $order,
                        ':url'       => $imgUrl,
                        ':sortOrder' => $order
                    ]);
                    $order++;
                }
            }
        } catch (\Throwable $e) {
            error_log('Admin property media insert error: ' . $e->getMessage());
        }
    }

    // Insert property highlights if provided
    $highlights = $input['highlights'] ?? [];
    if (!empty($highlights) && is_array($highlights)) {
        try {
            $hlStmt = $db->prepare("
                INSERT INTO property_highlights (property_id, highlight_text, sort_order)
                VALUES (:propId, :text, :sortOrder)
            ");
            $hlOrder = 1;
            foreach ($highlights as $hlText) {
                $hlText = trim((string)$hlText);
                if (!empty($hlText)) {
                    $hlStmt->execute([
                        ':propId'    => $propId,
                        ':text'      => $hlText,
                        ':sortOrder' => $hlOrder
                    ]);
                    $hlOrder++;
                }
            }
        } catch (\Throwable $e) {
            error_log('Admin property highlights insert error: ' . $e->getMessage());
        }
    }

    // Save Master Plot Factsheet & Subdivided Plots if property is a Plot
    $plotFactsheet = $input['plotFactsheet'] ?? null;
    $subdividedPlots = $input['subdividedPlots'] ?? [];

    if ($propertyType === 'Gated CMDA Plots' || !empty($plotFactsheet) || !empty($subdividedPlots)) {
        try {
            if ($plotFactsheet && is_array($plotFactsheet)) {
                $plotStmt = $db->prepare("
                    INSERT INTO property_plot_details (
                        property_id, layout_sanction_no, rera_layout_no, frontage_road_width,
                        water_table_depth, soil_bearing_capacity, fsi_permissible, eb_substation,
                        boundary_wall, drainage_system, patta_status, dimension_ranges
                    ) VALUES (
                        :pid, :sanction, :rera, :road, :water, :soil, :fsi, :eb, :wall, :drain, :patta, :dim
                    ) ON DUPLICATE KEY UPDATE
                        layout_sanction_no = VALUES(layout_sanction_no),
                        rera_layout_no = VALUES(rera_layout_no),
                        frontage_road_width = VALUES(frontage_road_width),
                        water_table_depth = VALUES(water_table_depth),
                        soil_bearing_capacity = VALUES(soil_bearing_capacity),
                        fsi_permissible = VALUES(fsi_permissible),
                        eb_substation = VALUES(eb_substation),
                        boundary_wall = VALUES(boundary_wall),
                        drainage_system = VALUES(drainage_system),
                        patta_status = VALUES(patta_status),
                        dimension_ranges = VALUES(dimension_ranges)
                ");
                $plotStmt->execute([
                    ':pid'      => $propId,
                    ':sanction' => $plotFactsheet['layoutSanctionNo'] ?? 'CMDA Sanctioned Layout',
                    ':rera'     => $plotFactsheet['reraLayoutNo'] ?? $reraNumber,
                    ':road'     => $plotFactsheet['frontageRoadWidth'] ?? '40 Feet Wide Road',
                    ':water'    => $plotFactsheet['waterTableDepth'] ?? 'Sweet Potable Water at 18-24 Feet',
                    ':soil'     => $plotFactsheet['soilBearingCapacity'] ?? 'Certified 220 kN/sq.m',
                    ':fsi'      => $plotFactsheet['fsiPermissible'] ?? '2.0 FSI (G+3 Floors Permissible)',
                    ':eb'       => $plotFactsheet['ebSubstation'] ?? 'Dedicated 11kV Substation Commissioned',
                    ':wall'     => $plotFactsheet['boundaryWall'] ?? '6-Foot Reinforced Perimeter Wall',
                    ':drain'    => $plotFactsheet['drainageSystem'] ?? 'Underground Stormwater Grid Ready',
                    ':patta'    => $plotFactsheet['pattaStatus'] ?? 'Individual Computerized Patta Issued',
                    ':dim'      => $plotFactsheet['dimensionRanges'] ?? 'Standard Corner & Avenue Plots'
                ]);
            }

            // Ensure property_subdivided_plots table exists
            $db->exec("
                CREATE TABLE IF NOT EXISTS `property_subdivided_plots` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `property_id` VARCHAR(50) NOT NULL,
                    `plot_no` VARCHAR(50) NOT NULL,
                    `status` ENUM('available', 'sold', 'reserved') NOT NULL DEFAULT 'available',
                    `super_built_up_yds` DECIMAL(10,2) NOT NULL DEFAULT 150.00,
                    `net_plot_area_yds` DECIMAL(10,2) NOT NULL DEFAULT 100.00,
                    `super_built_up_sqft` INT NOT NULL DEFAULT 1350,
                    `width_meters` DECIMAL(8,2) NOT NULL DEFAULT 11.00,
                    `length_meters` DECIMAL(8,2) NOT NULL DEFAULT 7.80,
                    `width_feet` DECIMAL(8,2) NOT NULL DEFAULT 36.00,
                    `length_feet` DECIMAL(8,2) NOT NULL DEFAULT 25.60,
                    `facing` VARCHAR(100) NOT NULL DEFAULT 'North Facing',
                    `price_in_lakhs` DECIMAL(10,2) NOT NULL DEFAULT 40.00,
                    `formatted_price` VARCHAR(50) NOT NULL DEFAULT '₹40.00 L',
                    `is_corner` TINYINT(1) NOT NULL DEFAULT 0,
                    `has_trees` TINYINT(1) NOT NULL DEFAULT 0,
                    `pos_x` DECIMAL(8,2) NOT NULL DEFAULT 0.00,
                    `pos_y` DECIMAL(8,2) NOT NULL DEFAULT 0.00,
                    `size_w` DECIMAL(8,2) NOT NULL DEFAULT 13.00,
                    `size_h` DECIMAL(8,2) NOT NULL DEFAULT 11.00,
                    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ");

            if (!empty($subdividedPlots) && is_array($subdividedPlots)) {
                $subStmt = $db->prepare("
                    INSERT INTO property_subdivided_plots (
                        property_id, plot_no, status, super_built_up_yds, net_plot_area_yds,
                        super_built_up_sqft, width_meters, length_meters, width_feet, length_feet,
                        facing, price_in_lakhs, formatted_price, is_corner, has_trees,
                        pos_x, pos_y, size_w, size_h
                    ) VALUES (
                        :pid, :plot_no, :status, :super_yds, :net_yds,
                        :super_sqft, :w_m, :l_m, :w_ft, :l_ft,
                        :facing, :price_lakhs, :formatted_price, :is_corner, :has_trees,
                        :pos_x, :pos_y, :size_w, :size_h
                    )
                ");

                foreach ($subdividedPlots as $p) {
                    $subStmt->execute([
                        ':pid'             => $propId,
                        ':plot_no'         => (string)($p['plotNo'] ?? '101'),
                        ':status'          => in_array($p['status'] ?? '', ['available', 'sold', 'reserved']) ? $p['status'] : 'available',
                        ':super_yds'       => (float)($p['superBuiltUpYds'] ?? 150),
                        ':net_yds'         => (float)($p['netPlotAreaYds'] ?? 100),
                        ':super_sqft'      => (int)($p['superBuiltUpSqft'] ?? 1350),
                        ':w_m'             => (float)($p['widthMeters'] ?? 11),
                        ':l_m'             => (float)($p['lengthMeters'] ?? 7.8),
                        ':w_ft'            => (float)($p['widthFeet'] ?? 36),
                        ':l_ft'            => (float)($p['lengthFeet'] ?? 25.6),
                        ':facing'          => (string)($p['facing'] ?? 'North Facing'),
                        ':price_lakhs'     => (float)($p['priceInLakhs'] ?? 40),
                        ':formatted_price' => (string)($p['formattedPrice'] ?? '₹40.00 L'),
                        ':is_corner'       => !empty($p['isCorner']) ? 1 : 0,
                        ':has_trees'       => !empty($p['hasTrees']) ? 1 : 0,
                        ':pos_x'           => (float)($p['x'] ?? 0),
                        ':pos_y'           => (float)($p['y'] ?? 0),
                        ':size_w'          => (float)($p['w'] ?? 13),
                        ':size_h'          => (float)($p['h'] ?? 11)
                    ]);
                }
            }
        } catch (\Throwable $e) {
            error_log('Admin plot factsheet/subdivided plots insert error: ' . $e->getMessage());
        }
    }

    // Log to admin_activity_logs
    try {
        $logStmt = $db->prepare("
            INSERT INTO admin_activity_logs 
              (admin_id, admin_name, action_type, property_id, property_title, notes)
            VALUES 
              (:aid, :aname, 'post_property', :pid, :ptitle, 'Created new property listing. Flagged for Co-Admin peer approval.')
        ");
        $logStmt->execute([
            ':aid'    => $authorId,
            ':aname'  => $authorName,
            ':pid'    => $propId,
            ':ptitle' => $title
        ]);
    } catch (Exception $e) {
        // Continue
    }

    Response::success([
        'propertyId' => $propId,
        'status'     => $status,
        'makerCheckerNotice' => ($status === 'pending_peer_review')
            ? "Submission recorded. Since you submitted as an Admin, peer review by another Co-Admin is mandatory before publishing."
            : "Submission recorded. Awaiting review and approval by an Admin."
    ], 'Property submitted for review successfully');
}

Response::error('Method not allowed', 405);
