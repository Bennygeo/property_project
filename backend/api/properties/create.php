<?php
/**
 * POST /api/properties/create.php
 * Allows verified users to submit properties for zero-brokerage listing.
 * Automatically flags listing as 'pending_review' for administrative audit.
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

use Mannidam\Config\Database;
use Mannidam\Helpers\Response;

Response::initCors();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Method not allowed', 405);
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    Response::error('Invalid JSON payload', 400);
}

$title        = trim($input['title'] ?? '');
$propertyType = trim($input['propertyType'] ?? 'Apartments & Flats');
$listingMode  = trim($input['listingMode'] ?? 'buy');
$cityName     = trim($input['cityName'] ?? 'Chennai');
$localityName = trim($input['localityName'] ?? 'Anna Nagar');
$price        = trim($input['price'] ?? '');
$pricePerSqft = trim($input['pricePerSqft'] ?? '');
$sqft         = trim($input['sqft'] ?? '');
$bhkBadge     = trim($input['bhkBadge'] ?? '2 BHK');
$facingOrView = trim($input['facingOrView'] ?? 'East Facing');
$mainImageUrl = trim($input['mainImageUrl'] ?? '');
$reraNumber   = trim($input['reraNumber'] ?? 'Applied / SRO Sanctioned');
$userId       = (int)($input['userId'] ?? 1);
$userName     = trim($input['userName'] ?? 'Verified Investor');

if (empty($title)) {
    Response::error('Property title is mandatory', 400);
}

if (empty($price)) {
    Response::error('Price is required', 400);
}

if (empty($mainImageUrl)) {
    // Default architectural placeholder if none provided
    $mainImageUrl = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80';
}

$db = (new Database())->getConnection();

// Generate unique property ID
$propId = 'prop-usr-' . bin2hex(random_bytes(4));

$sql = "
    INSERT INTO properties (
        id, city_id, locality_id, title, property_type, listing_mode, locality_name, city_name,
        price, price_per_sqft, sqft, bhk_badge, facing_or_view, main_image_url, rera_number,
        status, submitted_by_user_id, submitted_by_name, submitted_by_role
    ) VALUES (
        :id, 1, 1, :title, :propertyType, :listingMode, :localityName, :cityName,
        :price, :pricePerSqft, :sqft, :bhkBadge, :facingOrView, :mainImageUrl, :reraNumber,
        'pending_review', :userId, :userName, 'user'
    )
";

$stmt = $db->prepare($sql);
$stmt->execute([
    ':id'           => $propId,
    ':title'        => $title,
    ':propertyType' => $propertyType,
    ':listingMode'  => $listingMode,
    ':localityName' => $localityName,
    ':cityName'     => $cityName,
    ':price'        => $price,
    ':pricePerSqft' => !empty($pricePerSqft) ? $pricePerSqft : 'Market Standard',
    ':sqft'         => !empty($sqft) ? $sqft : 'Standard',
    ':bhkBadge'     => $bhkBadge,
    ':facingOrView' => $facingOrView,
    ':mainImageUrl' => $mainImageUrl,
    ':reraNumber'   => $reraNumber,
    ':userId'       => $userId,
    ':userName'     => $userName
]);

// Also save additional uploaded gallery photos if provided
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
        // Log non-fatal media insertion error
        error_log('Property media insert error: ' . $e->getMessage());
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
            error_log('User plot factsheet/subdivided plots insert error: ' . $e->getMessage());
        }
    }


Response::success([
    'propertyId' => $propId,
    'status'     => 'pending_review',
    'title'      => $title,
    'submittedAt'=> date('Y-m-d H:i:s'),
    'message'    => 'Property posted successfully! Our compliance desk has received your listing for deed and survey verification. You can track its live status in your profile.'
], 'Property submitted for admin review successfully');
