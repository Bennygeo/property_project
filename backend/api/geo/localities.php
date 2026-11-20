<?php
/**
 * GET /api/geo/localities.php?district={Chengalpattu}
 * Fetches localities directly from the `projects` table (no dependency on `cities`).
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

use Mannidam\Config\Database;
use Mannidam\Helpers\Response;

Response::initCors();

$district = trim((string)($_GET['district'] ?? $_GET['cityKey'] ?? ''));

$db = (new Database())->getConnection();

if ($district !== '') {
    $stmt = $db->prepare("
        SELECT
            MIN(project_id) AS id,
            TRIM(locality) AS name,
            '' AS pinCode,
            ROUND(AVG(NULLIF(sqft_rate, 0))) AS avgSqftRate,
            COUNT(*) AS deedCount,
            MAX(district) AS districtName
        FROM projects
        WHERE locality IS NOT NULL AND TRIM(locality) <> ''
          AND (LOWER(TRIM(district)) = LOWER(?) OR LOWER(TRIM(city)) = LOWER(?))
          AND (status = 'published' OR status IS NULL)
        GROUP BY TRIM(locality)
        ORDER BY deedCount DESC, name ASC
    ");
    $stmt->execute([$district, $district]);
} else {
    $stmt = $db->query("
        SELECT
            MIN(project_id) AS id,
            TRIM(locality) AS name,
            '' AS pinCode,
            ROUND(AVG(NULLIF(sqft_rate, 0))) AS avgSqftRate,
            COUNT(*) AS deedCount,
            MAX(district) AS districtName
        FROM projects
        WHERE locality IS NOT NULL AND TRIM(locality) <> ''
          AND (status = 'published' OR status IS NULL)
        GROUP BY TRIM(locality)
        ORDER BY deedCount DESC, name ASC
    ");
}

$localities = $stmt->fetchAll();

Response::success($localities, 'Localities retrieved');
