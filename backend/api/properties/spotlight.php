<?php
/**
 * GET /api/properties/spotlight.php
 * Fetches featured & spotlight properties for homepage showcase.
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

use Mannidam\Config\Database;
use Mannidam\Helpers\Response;

Response::initCors();

$db = (new Database())->getConnection();

$stmt = $db->query("
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
        p.rera_number AS reraNumber,
        p.brokerage_badge AS brokerageBadge,
        p.special_tag AS specialTag,
        p.points_badge AS pointsBadge,
        p.media_points AS mediaPoints,
        p.whatsapp_url AS whatsappUrl
    FROM properties p
    JOIN cities c ON p.city_id = c.id
    WHERE p.is_featured = 1
    ORDER BY p.created_at DESC
    LIMIT 6
");

$rows = $stmt->fetchAll();
$spotlight = [];

foreach ($rows as $row) {
    // Highlights
    $hlStmt = $db->prepare("SELECT highlight_text FROM property_highlights WHERE property_id = ? ORDER BY sort_order ASC LIMIT 4");
    $hlStmt->execute([$row['id']]);
    $highlights = $hlStmt->fetchAll(PDO::FETCH_COLUMN);

    $spotlight[] = [
        'id'           => $row['id'],
        'title'        => $row['title'],
        'propertyType' => $row['propertyType'],
        'locality'     => $row['locality'],
        'city'         => $row['city'],
        'cityKey'      => $row['cityKey'],
        'price'        => $row['price'],
        'pricePerSqFt' => $row['pricePerSqFt'],
        'sqft'         => $row['sqft'],
        'bhkBadge'     => $row['bhkBadge'],
        'facingOrView' => $row['facingOrView'],
        'imageUrl'     => $row['imageUrl'],
        'badges'       => [
            'rera'       => $row['reraNumber'],
            'brokerage'  => $row['brokerageBadge'],
            'points'     => (int)$row['pointsBadge'],
            'specialTag' => $row['specialTag'],
        ],
        'highlights'   => $highlights,
        'mediaPoints'  => (int)$row['mediaPoints'],
        'freePhotos'   => [$row['imageUrl']],
        'whatsappUrl'  => $row['whatsappUrl'],
    ];
}

Response::success($spotlight, 'Spotlight properties retrieved');
