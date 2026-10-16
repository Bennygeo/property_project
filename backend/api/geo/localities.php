<?php
/**
 * GET /api/geo/localities.php?cityKey={chennai}
 * Fetches localities and cadastral benchmarks for a given city.
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

use Mannidam\Config\Database;
use Mannidam\Helpers\Response;

Response::initCors();

$cityKey = $_GET['cityKey'] ?? null;

$db = (new Database())->getConnection();

if (!empty($cityKey)) {
    $stmt = $db->prepare("
        SELECT 
            l.id,
            l.name,
            l.pin_code AS pinCode,
            l.avg_sqft_rate AS avgSqftRate,
            l.growth_yoy AS growthYoY,
            l.deed_count AS deedCount,
            c.city_key AS cityKey,
            c.name AS cityName
        FROM localities l
        JOIN cities c ON l.city_id = c.id
        WHERE c.city_key = ?
        ORDER BY l.name ASC
    ");
    $stmt->execute([$cityKey]);
} else {
    $stmt = $db->query("
        SELECT 
            l.id,
            l.name,
            l.pin_code AS pinCode,
            l.avg_sqft_rate AS avgSqftRate,
            l.growth_yoy AS growthYoY,
            l.deed_count AS deedCount,
            c.city_key AS cityKey,
            c.name AS cityName
        FROM localities l
        JOIN cities c ON l.city_id = c.id
        ORDER BY c.name ASC, l.name ASC
    ");
}

$localities = $stmt->fetchAll();

Response::success($localities, 'Localities retrieved');
