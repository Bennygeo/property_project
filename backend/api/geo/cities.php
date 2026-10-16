<?php
/**
 * GET /api/geo/cities.php
 * Fetches active metro hubs with benchmark stats.
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
        city_key AS cityKey,
        name,
        state,
        avg_rate_sqft AS avgRate,
        yoy_growth AS yoyGrowth,
        deed_count AS deedCount
    FROM cities 
    WHERE is_active = 1
    ORDER BY id ASC
");

$cities = $stmt->fetchAll();

Response::success($cities, 'Metro cities retrieved');
