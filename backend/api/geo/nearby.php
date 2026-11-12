<?php
/**
 * Mannidam Real Estate Marketplace - Nearby Locality Areas API
 * Returns nearby localities, layouts, and sub-markets based on taluk, district, or GPS proximity.
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

try {
    $db = (new Database())->getConnection();

    $localityParam = trim($_GET['locality'] ?? $_GET['localities'] ?? $_GET['q'] ?? '');
    $districtParam = trim($_GET['district'] ?? '');
    $talukParam    = trim($_GET['taluk'] ?? '');
    $cityParam     = trim($_GET['city'] ?? $_GET['cityKey'] ?? '');
    $propId        = trim($_GET['propertyId'] ?? $_GET['id'] ?? '');

    // Take the first locality if comma separated
    if (!empty($localityParam)) {
        $parts = explode(',', $localityParam);
        $localityParam = trim($parts[0]);
    }

    $targetLocality = $localityParam;
    $targetDistrict = $districtParam;
    $targetTaluk    = $talukParam;
    $targetCity     = $cityParam;

    // 1. If propertyId or locality given, locate its district and city from DB
    if (!empty($propId) && empty($targetDistrict)) {
        $pStmt = $db->prepare("
            SELECT p.locality, p.city, p.district
            FROM projects p
            WHERE p.project_id = ?
            LIMIT 1
        ");
        $pStmt->execute([$propId]);
        $row = $pStmt->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            $targetLocality = $targetLocality ?: $row['locality'];
            $targetDistrict = $row['district'] ?: ($row['city'] ?: '');
            $targetCity     = $row['city'] ?: '';
        }
    } elseif (!empty($localityParam) && empty($targetDistrict)) {
        $locStmt = $db->prepare("
            SELECT p.city, p.district, p.locality
            FROM projects p
            WHERE p.locality LIKE :q 
               OR p.city LIKE :q
               OR p.district LIKE :q
            LIMIT 1
        ");
        $locStmt->execute([':q' => "%{$localityParam}%"]);
        $target = $locStmt->fetch(PDO::FETCH_ASSOC);
        if ($target) {
            $targetDistrict = $target['district'] ?: ($target['city'] ?: '');
            $targetCity     = $target['city'] ?: '';
        }
    }

    $nearby = [];
    $seen = [];

    // 2. Fetch nearby sister localities in same District / City
    if (!empty($targetDistrict) || !empty($targetCity)) {
        $sql = "
            SELECT 
                p.locality AS name,
                p.city,
                p.district,
                COUNT(DISTINCT p.project_id) AS propertyCount,
                MIN(p.price_from) AS minPrice
            FROM projects p
            WHERE (p.status = 'published' OR p.status IS NULL)
              AND (
                  (:district != '' AND p.district = :district)
                  OR (:city != '' AND p.city = :city)
              )
        ";

        $params = [
            ':district' => $targetDistrict,
            ':city'     => $targetCity
        ];

        if (!empty($targetLocality)) {
            $sql .= " AND p.locality NOT LIKE :targetLoc ";
            $params[':targetLoc'] = "%{$targetLocality}%";
        }

        $sql .= "
            GROUP BY name, p.city, p.district
            HAVING propertyCount > 0
            ORDER BY propertyCount DESC
            LIMIT 12
        ";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $raw = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($raw as $r) {
            $cleanName = trim(preg_replace('/[^\x20-\x7E\xA0-\xFF]/u', '', (string)$r['name']));
            $cleanName = trim(preg_replace('/[â\?]{2,}/', '', $cleanName));
            if (empty($cleanName) || strlen($cleanName) < 3) continue;

            $key = strtolower($cleanName);
            if (!isset($seen[$key])) {
                $seen[$key] = true;
                $distanceTag = "Nearby • " . ($r['district'] ?: $r['city']);

                $nearby[] = [
                    'name'          => $cleanName,
                    'city'          => $r['city'],
                    'taluk'         => '',
                    'district'      => $r['district'] ?: '',
                    'propertyCount' => (int)$r['propertyCount'],
                    'minPrice'      => !empty($r['minPrice']) ? '₹ ' . number_format((float)$r['minPrice']) : 'Price on Request',
                    'distanceTag'   => $distanceTag,
                    'isSameTaluk'   => false
                ];
            }
        }
    }

    // 3. Fallback: If not enough nearby results found, backfill with top active real estate pockets
    if (count($nearby) < 8) {
        $popStmt = $db->query("
            SELECT 
                p.locality AS name,
                p.city,
                p.district,
                COUNT(DISTINCT p.project_id) AS propertyCount,
                MIN(p.price_from) AS minPrice
            FROM projects p
            WHERE (p.status = 'published' OR p.status IS NULL)
            GROUP BY name, p.city, p.district
            HAVING propertyCount > 0
            ORDER BY propertyCount DESC
            LIMIT 15
        ");
        $pop = $popStmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($pop as $r) {
            if (count($nearby) >= 10) break;
            $cleanName = trim(preg_replace('/[^\x20-\x7E\xA0-\xFF]/u', '', (string)$r['name']));
            $cleanName = trim(preg_replace('/[â\?]{2,}/', '', $cleanName));
            if (empty($cleanName) || strlen($cleanName) < 3) continue;

            $key = strtolower($cleanName);
            if (!isset($seen[$key])) {
                $seen[$key] = true;
                $nearby[] = [
                    'name'          => $cleanName,
                    'city'          => $r['city'],
                    'taluk'         => '',
                    'district'      => $r['district'] ?: '',
                    'propertyCount' => (int)$r['propertyCount'],
                    'minPrice'      => !empty($r['minPrice']) ? '₹ ' . number_format((float)$r['minPrice']) : 'Price on Request',
                    'distanceTag'   => 'Prominent Area • ' . ($r['district'] ?: $r['city']),
                    'isSameTaluk'   => false
                ];
            }
        }
    }

    echo json_encode([
        'success'        => true,
        'targetLocality' => $targetLocality,
        'targetDistrict' => $targetDistrict,
        'targetTaluk'    => $targetTaluk,
        'targetCity'     => $targetCity,
        'total'          => count($nearby),
        'nearbyLocalities' => $nearby
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to retrieve nearby localities: ' . $e->getMessage()
    ]);
}

