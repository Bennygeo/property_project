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

    // 1. If propertyId or locality given, locate its taluk and district from DB
    if (!empty($propId) && (empty($targetDistrict) || empty($targetTaluk))) {
        $pStmt = $db->prepare("
            SELECT p.locality_name, p.city_name, pmd.village_locality, pmd.district, pmd.taluk
            FROM properties p
            LEFT JOIN property_master_details pmd ON p.id = pmd.property_id
            WHERE p.id = ?
            LIMIT 1
        ");
        $pStmt->execute([$propId]);
        $row = $pStmt->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            $targetLocality = $targetLocality ?: ($row['village_locality'] ?: $row['locality_name']);
            $targetDistrict = $row['district'] ?: ($row['city_name'] ?: '');
            $targetTaluk    = $row['taluk'] ?: '';
            $targetCity     = $row['city_name'] ?: '';
        }
    } elseif (!empty($localityParam) && (empty($targetDistrict) || empty($targetTaluk))) {
        $locStmt = $db->prepare("
            SELECT p.city_name, pmd.district, pmd.taluk, pmd.village_locality, p.locality_name
            FROM properties p
            LEFT JOIN property_master_details pmd ON p.id = pmd.property_id
            WHERE p.locality_name LIKE :q 
               OR pmd.village_locality LIKE :q 
               OR pmd.area_location LIKE :q
               OR pmd.taluk LIKE :q
               OR p.city_name LIKE :q
               OR pmd.district LIKE :q
            LIMIT 1
        ");
        $locStmt->execute([':q' => "%{$localityParam}%"]);
        $target = $locStmt->fetch(PDO::FETCH_ASSOC);
        if ($target) {
            $targetDistrict = $target['district'] ?: ($target['city_name'] ?: '');
            $targetTaluk    = $target['taluk'] ?: '';
            $targetCity     = $target['city_name'] ?: '';
        }
    }

    $nearby = [];
    $seen = [];

    // 2. Fetch nearby sister localities
    if (!empty($targetDistrict) || !empty($targetTaluk)) {
        $sql = "
            SELECT 
                COALESCE(NULLIF(TRIM(pmd.village_locality), ''), p.locality_name) AS name,
                p.city_name AS city,
                pmd.taluk,
                pmd.district,
                COUNT(DISTINCT p.id) AS propertyCount,
                MIN(p.price) AS minPrice
            FROM properties p
            INNER JOIN property_master_details pmd ON p.id = pmd.property_id
            WHERE (p.status = 'published' OR p.status IS NULL)
              AND (
                  (:taluk != '' AND pmd.taluk = :taluk)
                  OR (:district != '' AND pmd.district = :district)
                  OR (:city != '' AND p.city_name = :city)
              )
        ";

        $params = [
            ':taluk'    => $targetTaluk,
            ':district' => $targetDistrict,
            ':city'     => $targetCity
        ];

        if (!empty($targetLocality)) {
            $sql .= " AND p.locality_name NOT LIKE :targetLoc AND pmd.village_locality NOT LIKE :targetLoc ";
            $params[':targetLoc'] = "%{$targetLocality}%";
        }

        $sql .= "
            GROUP BY name, city, taluk, district
            HAVING propertyCount > 0
            ORDER BY 
                CASE WHEN :taluk != '' AND pmd.taluk = :taluk THEN 1 ELSE 2 END ASC,
                propertyCount DESC
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
                $isSameTaluk = !empty($targetTaluk) && strcasecmp((string)$r['taluk'], $targetTaluk) === 0;
                $distanceTag = $isSameTaluk 
                    ? ("Nearby • " . ($r['taluk'] ?: $r['district'])) 
                    : ("Nearby District • " . ($r['district'] ?: $r['city']));

                $nearby[] = [
                    'name'          => $cleanName,
                    'city'          => $r['city'],
                    'taluk'         => $r['taluk'] ?: '',
                    'district'      => $r['district'] ?: '',
                    'propertyCount' => (int)$r['propertyCount'],
                    'minPrice'      => $r['minPrice'] ?: '₹ 25 Lakhs',
                    'distanceTag'   => $distanceTag,
                    'isSameTaluk'   => $isSameTaluk
                ];
            }
        }
    }

    // 3. Fallback: If not enough nearby results found, backfill with top active real estate pockets
    if (count($nearby) < 8) {
        $popStmt = $db->query("
            SELECT 
                COALESCE(NULLIF(TRIM(pmd.village_locality), ''), p.locality_name) AS name,
                p.city_name AS city,
                pmd.taluk,
                pmd.district,
                COUNT(DISTINCT p.id) AS propertyCount,
                MIN(p.price) AS minPrice
            FROM properties p
            INNER JOIN property_master_details pmd ON p.id = pmd.property_id
            WHERE (p.status = 'published' OR p.status IS NULL)
            GROUP BY name, city, taluk, district
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
                    'taluk'         => $r['taluk'] ?: '',
                    'district'      => $r['district'] ?: '',
                    'propertyCount' => (int)$r['propertyCount'],
                    'minPrice'      => $r['minPrice'] ?: '₹ 25 Lakhs',
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

