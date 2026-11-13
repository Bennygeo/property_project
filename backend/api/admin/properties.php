<?php
/**
 * /api/admin/properties.php
 * Admin management endpoint to fetch all properties (with review statuses)
 * and post/update properties with Maker-Checker attribution.
 * Supports consolidated 'projects' table (997 verified properties) and legacy 'properties' table.
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/property_master_helper.php';

use Mannidam\Config\Database;
use Mannidam\Helpers\Response;
use Mannidam\Helpers\PropertyMasterHelper;

Response::initCors();

$method = $_SERVER['REQUEST_METHOD'];
$db = (new Database())->getConnection();

// Determine which table to use
$useProjectsTable = true;
try {
    $chkProjects = $db->query("SHOW TABLES LIKE 'projects'");
    $hasProjects = (bool)($chkProjects && $chkProjects->fetch());
    
    $chkProps = $db->query("SHOW TABLES LIKE 'properties'");
    $hasProps = (bool)($chkProps && $chkProps->fetch());

    // If projects table exists and has rows, prioritize it
    if ($hasProjects) {
        $cStmt = $db->query("SELECT COUNT(*) AS c FROM projects");
        $c = (int)($cStmt->fetch(PDO::FETCH_ASSOC)['c'] ?? 0);
        if ($c > 0) {
            $useProjectsTable = true;
        } else if ($hasProps) {
            $useProjectsTable = false;
        }
    } else {
        $useProjectsTable = false;
    }
} catch (\Throwable $e) {
    $useProjectsTable = true;
}

if ($method === 'GET') {
    if ($useProjectsTable) {
        // 1. Fetch KPI metrics from projects
        $stats = [
            'total_count'          => 0,
            'pending_user_reviews' => 0,
            'pending_peer_reviews' => 0,
            'published_count'      => 0,
            'rejected_count'       => 0,
        ];

        try {
            $statsStmt = $db->query("
                SELECT 
                    COUNT(*) AS total_count,
                    SUM(CASE WHEN status = 'pending_review' THEN 1 ELSE 0 END) AS pending_user_reviews,
                    SUM(CASE WHEN status = 'pending_peer_review' THEN 1 ELSE 0 END) AS pending_peer_reviews,
                    SUM(CASE WHEN status = 'published' OR status IS NULL OR status = '' THEN 1 ELSE 0 END) AS published_count,
                    SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected_count
                FROM projects
            ");
            if ($statsStmt) {
                $stats = $statsStmt->fetch(PDO::FETCH_ASSOC) ?: $stats;
            }
        } catch (\Throwable $e) {}

        // 2. Filter properties
        $statusFilter = $_GET['status'] ?? 'all';
        $searchQuery  = trim($_GET['q'] ?? '');
        $limit        = isset($_GET['limit']) ? max(1, min(1000, (int)$_GET['limit'])) : 200;

        $where = [];
        $params = [];

        if (!empty($statusFilter) && $statusFilter !== 'all') {
            if ($statusFilter === 'published') {
                $where[] = "(p.status = 'published' OR p.status IS NULL OR p.status = '')";
            } else {
                $where[] = 'p.status = :status';
                $params[':status'] = $statusFilter;
            }
        }

        if (!empty($searchQuery)) {
            $where[] = '(p.project_name LIKE :q OR p.locality LIKE :q OR p.city LIKE :q OR p.district LIKE :q OR p.developer_name LIKE :q OR p.submitted_by LIKE :q)';
            $params[':q'] = "%{$searchQuery}%";
        }

        $whereSql = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

        $sql = "
            SELECT 
                p.project_id AS id,
                p.project_name AS title,
                COALESCE(p.land_type, p.type, p.category, 'Gated CMDA Plots') AS propertyType,
                'plots' AS listingMode,
                COALESCE(p.locality, 'Chennai') AS localityName,
                COALESCE(p.city, p.district, 'Chennai') AS cityName,
                p.district,
                p.developer_name AS developerName,
                p.developer_id AS developerId,
                CASE 
                    WHEN p.price_from > 0 THEN CONCAT('₹', ROUND(p.price_from / 100000, 2), ' L')
                    ELSE 'Price on Request'
                END AS price,
                CASE 
                    WHEN p.sqft_rate > 0 THEN CONCAT('₹', ROUND(p.sqft_rate, 0), '/sq.ft')
                    ELSE 'Competitive'
                END AS pricePerSqft,
                CASE 
                    WHEN p.min_plot_size > 0 AND p.max_plot_size > 0 THEN CONCAT(p.min_plot_size, ' - ', p.max_plot_size, ' sq.ft')
                    WHEN p.min_plot_size > 0 THEN CONCAT(p.min_plot_size, ' sq.ft')
                    ELSE 'Plots from 1,200 sq.ft'
                END AS sqft,
                COALESCE(p.category, 'Gated CMDA Plots') AS bhkBadge,
                'East Facing • Clear Title' AS facingOrView,
                COALESCE(NULLIF(p.cover_image, ''), 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80') AS mainImageUrl,
                COALESCE(NULLIF(p.rera_no, ''), 'TNRERA Approved') AS reraNumber,
                COALESCE(NULLIF(p.status, ''), 'published') AS status,
                1 AS submittedByUserId,
                COALESCE(NULLIF(p.submitted_by, ''), 'System / Bulk Upload') AS submittedByName,
                'admin' AS submittedByRole,
                NULL AS reviewedByUserId,
                p.reviewed_by AS reviewedByName,
                p.reviewed_at AS reviewedAt,
                p.review_notes AS reviewNotes,
                p.rejection_reason AS rejectionReason,
                p.featured AS isFeatured,
                p.created_at AS createdAt,
                p.updated_at AS updatedAt
            FROM projects p
            {$whereSql}
            ORDER BY 
                CASE 
                    WHEN p.status = 'pending_peer_review' THEN 1
                    WHEN p.status = 'pending_review' THEN 2
                    WHEN p.status = 'revision_requested' THEN 3
                    ELSE 4
                END,
                p.updated_at DESC
            LIMIT {$limit}
        ";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $properties = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($properties as &$item) {
            $item['submittedByUserId'] = (int)($item['submittedByUserId'] ?? 1);
            $item['isFeatured'] = !empty($item['isFeatured']);
        }
        unset($item);

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
        exit;
    }

    // Fallback: Query properties table if projects is not used
    $stats = [
        'total_count'          => 0,
        'pending_user_reviews' => 0,
        'pending_peer_reviews' => 0,
        'published_count'      => 0,
        'rejected_count'       => 0,
    ];

    try {
        $statsStmt = $db->query("
            SELECT 
                COUNT(*) AS total_count,
                SUM(CASE WHEN status = 'pending_review' THEN 1 ELSE 0 END) AS pending_user_reviews,
                SUM(CASE WHEN status = 'pending_peer_review' THEN 1 ELSE 0 END) AS pending_peer_reviews,
                SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published_count,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected_count
            FROM properties
        ");
        if ($statsStmt) {
            $stats = $statsStmt->fetch(PDO::FETCH_ASSOC) ?: $stats;
        }
    } catch (\Throwable $e) {}

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
        LIMIT 200
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

        $prop = null;
        if ($useProjectsTable) {
            $checkStmt = $db->prepare("SELECT project_id AS id, project_name AS title, COALESCE(land_type, type, category) AS property_type FROM projects WHERE project_id = ?");
            $checkStmt->execute([$propId]);
            $prop = $checkStmt->fetch(PDO::FETCH_ASSOC);
        } else {
            $checkStmt = $db->prepare("SELECT id, title, property_type FROM properties WHERE id = ?");
            $checkStmt->execute([$propId]);
            $prop = $checkStmt->fetch(PDO::FETCH_ASSOC);
        }

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

    if ($action === 'delete_property') {
        $propId = trim($input['propertyId'] ?? '');
        if (empty($propId)) {
            Response::error('Property ID is required', 400);
        }

        $adminId   = (int)($input['adminId'] ?? 101);
        $adminName = trim($input['adminName'] ?? 'Admin');

        $existing = null;
        if ($useProjectsTable) {
            $checkStmt = $db->prepare("SELECT project_id AS id, project_name AS title FROM projects WHERE project_id = ?");
            $checkStmt->execute([$propId]);
            $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);
        } else {
            $checkStmt = $db->prepare("SELECT id, title FROM properties WHERE id = ?");
            $checkStmt->execute([$propId]);
            $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);
        }

        if (!$existing) {
            Response::error('Property not found', 404);
        }

        // Clean up from user_shortlists explicitly
        try {
            $cleanShortlists = $db->prepare("DELETE FROM user_shortlists WHERE property_id = ?");
            $cleanShortlists->execute([$propId]);
        } catch (\Throwable $e) {}

        if ($useProjectsTable) {
            try { $db->prepare("DELETE FROM project_details WHERE project_id = ?")->execute([$propId]); } catch (\Throwable $e) {}
            try { $db->prepare("DELETE FROM property_master_details WHERE property_id = ?")->execute([$propId]); } catch (\Throwable $e) {}
            try { $db->prepare("DELETE FROM property_plot_details WHERE property_id = ?")->execute([$propId]); } catch (\Throwable $e) {}
            try { $db->prepare("DELETE FROM property_subdivided_plots WHERE property_id = ?")->execute([$propId]); } catch (\Throwable $e) {}
            $delStmt = $db->prepare("DELETE FROM projects WHERE project_id = ?");
            $delStmt->execute([$propId]);
        } else {
            $delStmt = $db->prepare("DELETE FROM properties WHERE id = ?");
            $delStmt->execute([$propId]);
        }

        // Log audit trail
        try {
            $logStmt = $db->prepare("
                INSERT INTO admin_activity_logs 
                    (admin_id, admin_name, action_type, property_id, property_title, notes)
                VALUES 
                    (:aid, :aname, 'delete_property', :pid, :ptitle, :notes)
            ");
            $logStmt->execute([
                ':aid'    => $adminId,
                ':aname'  => $adminName,
                ':pid'    => $propId,
                ':ptitle' => $existing['title'],
                ':notes'  => "Deleted property from marketplace and purged all associated records."
            ]);
        } catch (\Throwable $e) {}

        Response::success([
            'propertyId' => $propId,
            'title'      => $existing['title']
        ], "Property '{$existing['title']}' permanently deleted.");
    }

    if ($action === 'update_property') {
        $propId = trim($input['propertyId'] ?? '');
        if (empty($propId)) {
            Response::error('Property ID is required', 400);
        }

        $adminId    = (int)($input['adminId'] ?? 101);
        $adminName  = trim($input['adminName'] ?? 'Admin');
        $auditNotes = trim($input['auditNotes'] ?? 'Updated property details');

        if ($useProjectsTable) {
            $checkStmt = $db->prepare("SELECT * FROM projects WHERE project_id = ?");
            $checkStmt->execute([$propId]);
            $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);
            if (!$existing) {
                Response::error('Property not found', 404);
            }

            $title        = trim($input['title'] ?? $existing['project_name']);
            $cityName     = trim($input['cityName'] ?? $existing['city']);
            $localityName = trim($input['localityName'] ?? $existing['locality']);
            $status       = trim($input['status'] ?? $existing['status']);
            $mainImageUrl = trim($input['mainImageUrl'] ?? ($existing['cover_image'] ?? ''));
            $reraNumber   = trim($input['reraNumber'] ?? ($existing['rera_no'] ?? ''));
            $landType     = trim($input['landType'] ?? ($input['propertyType'] ?? ($existing['land_type'] ?? 'Residential')));

            $masterData = $input['masterData'] ?? $input['masterDetails'] ?? [];
            if (!empty($masterData) && is_array($masterData)) {
                PropertyMasterHelper::saveProjectAndDetails($db, $propId, $input, $masterData, [
                    'status'       => $status,
                    'submitted_by' => $existing['submitted_by'] ?: $adminName
                ]);
            } else {
                $updateSql = "
                    UPDATE projects SET
                        project_name = :title,
                        city = :city,
                        locality = :locality,
                        land_type = :land_type,
                        cover_image = :cover_image,
                        rera_no = :rera_no,
                        status = :status,
                        updated_at = NOW()
                    WHERE project_id = :id
                ";
                $stmt = $db->prepare($updateSql);
                $stmt->execute([
                    ':title'       => $title,
                    ':city'        => $cityName,
                    ':locality'    => $localityName,
                    ':land_type'   => $landType,
                    ':cover_image' => $mainImageUrl,
                    ':rera_no'     => $reraNumber,
                    ':status'      => $status,
                    ':id'          => $propId
                ]);
            }

            try {
                $logStmt = $db->prepare("
                    INSERT INTO admin_activity_logs 
                        (admin_id, admin_name, action_type, property_id, property_title, notes)
                    VALUES 
                        (:aid, :aname, 'post_property', :pid, :ptitle, :notes)
                ");
                $logStmt->execute([
                    ':aid'    => $adminId,
                    ':aname'  => $adminName,
                    ':pid'    => $propId,
                    ':ptitle' => $title,
                    ':notes'  => "Edited & updated by {$adminName}: {$auditNotes}"
                ]);
            } catch (\Throwable $e) {}

            Response::success([
                'propertyId' => $propId,
                'title'      => $title,
                'status'     => $status,
                'updatedBy'  => $adminName
            ], "Property updated successfully by {$adminName}");
            exit;
        }

        // Fallback for base properties table
        $checkStmt = $db->prepare("SELECT * FROM properties WHERE id = ?");
        $checkStmt->execute([$propId]);
        $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);
        if (!$existing) {
            Response::error('Property not found', 404);
        }

        $title        = trim($input['title'] ?? $existing['title']);
        $propertyType = trim($input['propertyType'] ?? $existing['property_type']);
        $listingMode  = trim($input['listingMode'] ?? $existing['listing_mode']);
        $cityName     = trim($input['cityName'] ?? $existing['city_name']);
        $localityName = trim($input['localityName'] ?? $existing['locality_name']);
        $price        = trim($input['price'] ?? $existing['price']);
        $pricePerSqft = trim($input['pricePerSqft'] ?? $existing['price_per_sqft']);
        $sqft         = trim($input['sqft'] ?? $existing['sqft']);
        $bhkBadge     = trim($input['bhkBadge'] ?? $existing['bhk_badge']);
        $facingOrView = trim($input['facingOrView'] ?? $existing['facing_or_view']);
        $mainImageUrl = trim($input['mainImageUrl'] ?? $existing['main_image_url']);
        $reraNumber   = trim($input['reraNumber'] ?? $existing['rera_number']);
        $status       = trim($input['status'] ?? $existing['status']);

        $updateSql = "
            UPDATE properties SET
                title = :title,
                property_type = :property_type,
                listing_mode = :listing_mode,
                city_name = :city_name,
                locality_name = :locality_name,
                price = :price,
                price_per_sqft = :price_per_sqft,
                sqft = :sqft,
                bhk_badge = :bhk_badge,
                facing_or_view = :facing_or_view,
                main_image_url = :main_image_url,
                rera_number = :rera_number,
                status = :status,
                updated_at = NOW()
            WHERE id = :id
        ";
        $stmt = $db->prepare($updateSql);
        $stmt->execute([
            ':title'          => $title,
            ':property_type'  => $propertyType,
            ':listing_mode'   => $listingMode,
            ':city_name'      => $cityName,
            ':locality_name'  => $localityName,
            ':price'          => $price,
            ':price_per_sqft' => $pricePerSqft,
            ':sqft'           => $sqft,
            ':bhk_badge'      => $bhkBadge,
            ':facing_or_view' => $facingOrView,
            ':main_image_url' => $mainImageUrl,
            ':rera_number'    => $reraNumber,
            ':status'         => $status,
            ':id'             => $propId
        ]);

        try {
            $logStmt = $db->prepare("
                INSERT INTO admin_activity_logs 
                    (admin_id, admin_name, action_type, property_id, property_title, notes)
                VALUES 
                    (:aid, :aname, 'post_property', :pid, :ptitle, :notes)
            ");
            $logStmt->execute([
                ':aid'    => $adminId,
                ':aname'  => $adminName,
                ':pid'    => $propId,
                ':ptitle' => $title,
                ':notes'  => "Edited & updated by {$adminName}: {$auditNotes}"
            ]);
        } catch (\Throwable $e) {}

        Response::success([
            'propertyId' => $propId,
            'title'      => $title,
            'status'     => $status,
            'updatedBy'  => $adminName
        ], "Property updated successfully by {$adminName}");
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
    $authorName   = trim($input['authorName'] ?? 'Admin');
    $authorRole   = trim($input['authorRole'] ?? 'admin');

    if (empty($title)) {
        Response::error('Property title is required', 400);
    }

    $status = ($authorRole === 'admin' || $authorRole === 'co_admin') 
        ? 'pending_peer_review' 
        : 'pending_review';

    if ($useProjectsTable) {
        $masterData = $input['masterData'] ?? $input['masterDetails'] ?? [];
        $propId = trim((string)($masterData['propertyId'] ?? $input['propertyId'] ?? ''));
        if (empty($propId)) {
            $propId = 'PRJ-' . strtoupper(bin2hex(random_bytes(3)));
        } else {
            // Ensure unique project_id if already used
            $idChk = $db->prepare("SELECT project_id FROM projects WHERE project_id = ?");
            $idChk->execute([$propId]);
            if ($idChk->fetch()) {
                $propId = 'PRJ-' . strtoupper(bin2hex(random_bytes(3)));
            }
        }

        $devName = trim((string)($masterData['developer'] ?? $input['developerName'] ?? $input['developer'] ?? ''));
        $devId = (int)($masterData['developerId'] ?? $input['developerId'] ?? 0);
        if ($devId <= 0 && !empty($devName)) {
            $devLookup = $db->prepare("SELECT id, name FROM developers WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1");
            $devLookup->execute([$devName]);
            $devRow = $devLookup->fetch(PDO::FETCH_ASSOC);
            if ($devRow) {
                $devId = (int)$devRow['id'];
                $devName = $devRow['name'];
            }
        }

        $saved = PropertyMasterHelper::saveProjectAndDetails($db, $propId, $input, is_array($masterData) ? $masterData : [], [
            'status'         => $status,
            'submitted_by'   => $authorName,
            'developer_id'   => $devId > 0 ? $devId : null,
            'developer_name' => $devName
        ]);

        if (!$saved) {
            Response::error('Failed to persist project and detail records', 500);
        }

        // Also store plot factsheet & subdivided plots if provided
        $plotFactsheet = $input['plotFactsheet'] ?? null;
        $subdividedPlots = $input['subdividedPlots'] ?? [];
        if ($propertyType === 'Gated CMDA Plots' || !empty($plotFactsheet) || !empty($subdividedPlots)) {
            try {
                if (!empty($plotFactsheet) && is_array($plotFactsheet)) {
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
                        ':sanction' => $plotFactsheet['layoutSanctionNo'] ?? '',
                        ':rera'     => $plotFactsheet['reraLayoutNo'] ?? $reraNumber,
                        ':road'     => $plotFactsheet['frontageRoadWidth'] ?? '40 Feet Wide Bitumen Road',
                        ':water'    => $plotFactsheet['waterTableDepth'] ?? 'Sweet Potable Water at 18–24 Feet',
                        ':soil'     => $plotFactsheet['soilBearingCapacity'] ?? 'Certified 220 kN/sq.m',
                        ':fsi'      => $plotFactsheet['fsiPermissible'] ?? '2.0 FSI',
                        ':eb'       => $plotFactsheet['ebSubstation'] ?? 'Dedicated 11kV Substation',
                        ':wall'     => $plotFactsheet['boundaryWall'] ?? 'Gated & Compounded Perimeter',
                        ':drain'    => $plotFactsheet['drainageSystem'] ?? 'Underground Stormwater Grid',
                        ':patta'    => $plotFactsheet['pattaStatus'] ?? 'Individual Computerized Patta Issued',
                        ':dims'     => $plotFactsheet['dimensionRanges'] ?? '30x40 to 40x60 standard'
                    ]);
                }

                if (!empty($subdividedPlots) && is_array($subdividedPlots)) {
                    $delPlots = $db->prepare("DELETE FROM property_subdivided_plots WHERE property_id = ?");
                    $delPlots->execute([$propId]);
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
            } catch (\Throwable $pe) {
                error_log('Admin plot details insert warning: ' . $pe->getMessage());
            }
        }

        Response::success([
            'propertyId' => $propId,
            'status'     => $status,
            'makerCheckerNotice' => ($status === 'pending_peer_review')
                ? "Submission recorded. Since you submitted as an Admin, peer review by another Co-Admin is mandatory before publishing."
                : "Submission recorded. Awaiting review and approval by an Admin."
        ], 'Property submitted for review successfully');
        exit;
    }

    // Fallback insertion into properties base table
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

    Response::success([
        'propertyId' => $propId,
        'status'     => $status,
        'makerCheckerNotice' => ($status === 'pending_peer_review')
            ? "Submission recorded. Since you submitted as an Admin, peer review by another Co-Admin is mandatory before publishing."
            : "Submission recorded. Awaiting review and approval by an Admin."
    ], 'Property submitted for review successfully');
}

Response::error('Method not allowed', 405);
