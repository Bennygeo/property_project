<?php
/**
 * Mannidam Real Estate Marketplace - Real-Time Geographic & Project Suggestions API
 * Powers NoBroker-style multi-level autocomplete with clean names and categorizations.
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

$query    = trim($_GET['q'] ?? '');
$district = trim($_GET['district'] ?? '');

// Known prominent localities for the 4 core capital region districts
$curatedDistrictLocalities = [
    'Chennai' => [
        ['label' => 'Porur', 'sub' => 'West Chennai Hub', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Porur'],
        ['label' => 'Velachery', 'sub' => 'South Chennai Hub', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Velachery'],
        ['label' => 'Guindy', 'sub' => 'Industrial & Transit Corridor', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Guindy'],
        ['label' => 'Sholinganallur', 'sub' => 'OMR IT Expressway Corridor', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Sholinganallur'],
        ['label' => 'Perumbakkam', 'sub' => 'Residential Corridor', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Perumbakkam'],
        ['label' => 'Ariyapakkam Garden', 'sub' => 'Chennai Cadastral Layout', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Ariyapakkam Garden']
    ],
    'Chengalpattu' => [
        ['label' => 'Venbedu', 'sub' => 'Chengalpattu High-Growth Zone', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Venbedu'],
        ['label' => 'Thaiyur', 'sub' => 'OMR Extension Corridor', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Thaiyur'],
        ['label' => 'Thiruvidanthai', 'sub' => 'ECR Coastal Corridor', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Thiruvidanthai'],
        ['label' => 'Guduvanchery', 'sub' => 'GST Road Growth Hub', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Guduvanchery'],
        ['label' => 'Maraimalai Nagar', 'sub' => 'Industrial & Residential Belt', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Maraimalai Nagar'],
        ['label' => 'Sirukundram', 'sub' => 'Chengalpattu Taluk', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Sirukundram']
    ],
    'Tiruvallur' => [
        ['label' => 'Sholavaram', 'sub' => 'NH16 North Corridor', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Sholavaram'],
        ['label' => 'Poonamallee', 'sub' => 'Metro Line 4 Junction', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Poonamallee'],
        ['label' => 'Kadambathur', 'sub' => 'Arakkonam Rail Corridor', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Kadambathur'],
        ['label' => 'Nemam', 'sub' => 'Bangalore Highway Belt', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Nemam'],
        ['label' => 'Padur', 'sub' => 'Poonamallee Taluk', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Padur'],
        ['label' => 'Melakondaiyur', 'sub' => 'Tiruvallur Taluk', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Melakondaiyur']
    ],
    'Kancheepuram' => [
        ['label' => 'Sriperumbudur', 'sub' => 'Automobile & Electronics Hub', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Sriperumbudur'],
        ['label' => 'Walajabad', 'sub' => 'Kancheepuram Growth Belt', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Walajabad'],
        ['label' => 'Azhakur', 'sub' => 'Sriperumbudur Taluk', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Azhakur'],
        ['label' => 'Manimangalam', 'sub' => 'Kundrathur Taluk', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Manimangalam'],
        ['label' => 'Vattambakkam', 'sub' => 'Walajabad Taluk', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Vattambakkam'],
        ['label' => 'Vaipoor', 'sub' => 'Kancheepuram Taluk', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Vaipoor']
    ]
];

$variantDistricts = [
    'tiruvallur'      => ['Tiruvallur', 'Thiruvallur'],
    'tiruchirappalli' => ['Tiruchirappalli', 'Thiruchirapalli'],
    'tiruvarur'       => ['Tiruvarur', 'Thiruvarur'],
    'thoothukudi'     => ['Thoothukudi', 'Thoothukkudi'],
    'pudukkottai'     => ['Pudukkottai', 'Pudukottai'],
    'tenkasi'         => ['Tenkasi', 'Tenksai'],
    'kanyakumari'     => ['Kanyakumari', 'Kanniyakumari'],
];

if (strlen($query) === 0) {
    if (!empty($district)) {
        try {
            $db = (new Database())->getConnection();
            $dKey = strtolower($district);
            $variants = $variantDistricts[$dKey] ?? [$district];
            $dClauses = [];
            $dParams = [];
            foreach ($variants as $idx => $v) {
                $dClauses[] = "pmd.district LIKE :dv{$idx} OR p.city_name LIKE :dv{$idx}";
                $dParams[":dv{$idx}"] = '%' . $v . '%';
            }
            $dWhere = '(' . implode(' OR ', $dClauses) . ')';

            $topStmt = $db->prepare("
                SELECT 
                    COALESCE(NULLIF(TRIM(pmd.village_locality), ''), p.locality_name) AS loc_name,
                    pmd.taluk,
                    pmd.district,
                    p.city_name,
                    COUNT(DISTINCT p.id) AS prop_count
                FROM properties p
                LEFT JOIN property_master_details pmd ON p.id = pmd.property_id
                WHERE (p.status = 'published' OR p.status IS NULL)
                  AND {$dWhere}
                GROUP BY loc_name, pmd.taluk, pmd.district, p.city_name
                ORDER BY prop_count DESC
                LIMIT 8
            ");
            $topStmt->execute($dParams);
            $dbRows = $topStmt->fetchAll(PDO::FETCH_ASSOC);

            $topList = [];
            $seenTop = [];
            foreach ($dbRows as $r) {
                $cleanLoc = trim(preg_replace('/[^\x20-\x7E]/', '', (string)$r['loc_name']));
                if (empty($cleanLoc) || strlen($cleanLoc) < 2) continue;
                $k = strtolower($cleanLoc);
                if (!isset($seenTop[$k])) {
                    $seenTop[$k] = true;
                    $sub = ($r['taluk'] ? $r['taluk'] . ' Taluk • ' : '') . $district . ' (' . $r['prop_count'] . ' Verified Plots)';
                    $topList[] = [
                        'label' => $cleanLoc,
                        'sub'   => $sub,
                        'type'  => 'locality',
                        'icon'  => 'location_on',
                        'query' => $cleanLoc
                    ];
                }
            }

            if (count($topList) < 6 && isset($curatedDistrictLocalities[$district])) {
                foreach ($curatedDistrictLocalities[$district] as $cItem) {
                    $k = strtolower($cItem['label']);
                    if (!isset($seenTop[$k]) && count($topList) < 8) {
                        $seenTop[$k] = true;
                        $topList[] = $cItem;
                    }
                }
            }

            echo json_encode([
                'success' => true,
                'message' => "Top verified localities in {$district}",
                'data' => [
                    'total' => count($topList),
                    'suggestions' => $topList
                ]
            ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
            exit;
        } catch (Throwable $e) {
            // Fall through to curated or default
        }
    }

    echo json_encode([
        'success' => true,
        'message' => 'Empty query',
        'data' => [
            'total' => 5,
            'suggestions' => [
                ['label' => 'Porur', 'sub' => 'Chennai Locality', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Porur'],
                ['label' => 'Ramapuram', 'sub' => 'Chennai Locality', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Ramapuram'],
                ['label' => 'Venbedu', 'sub' => 'Chengalpattu Growth Hub', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Venbedu'],
                ['label' => 'Sholavaram', 'sub' => 'Tiruvallur Corridor', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Sholavaram'],
                ['label' => 'Sriperumbudur', 'sub' => 'Kancheepuram Industrial Hub', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Sriperumbudur']
            ]
        ]
    ]);
    exit;
}

try {
    $db = (new Database())->getConnection();
    $suggestions = [];
    $seen = [];

    $add = function(string $label, string $sub, string $type, string $icon, string $queryTarget) use (&$suggestions, &$seen, $query) {
        $cleanLabel = trim(preg_replace('/[^\x20-\x7E\xA0-\xFF]/u', '', $label));
        $cleanLabel = trim(preg_replace('/[â\?]{2,}/', '', $cleanLabel));
        if ($type === 'project') {
            $cleanLabel = preg_replace('/Registration of layout[\s\S]*/i', '', $cleanLabel);
            $cleanLabel = trim($cleanLabel, " -:,");
            if (stripos($cleanLabel, $query) === false && stripos($sub, $query) === false) {
                return;
            }
        }
        if (empty($cleanLabel) || strlen($cleanLabel) < 2) return;

        $key = strtolower($type . ':' . $cleanLabel);
        if (!isset($seen[$key]) && count($suggestions) < 14) {
            $seen[$key] = true;
            $suggestions[] = [
                'label' => $cleanLabel,
                'sub' => $sub,
                'type' => $type,
                'icon' => $icon,
                'query' => $cleanLabel
            ];
        }
    };

    $param = '%' . $query . '%';
    $dParam = !empty($district) ? '%' . $district . '%' : null;

    // Check curated district list for match first when district is selected
    if (!empty($district) && isset($curatedDistrictLocalities[$district])) {
        foreach ($curatedDistrictLocalities[$district] as $cl) {
            if (stripos($cl['label'], $query) !== false || stripos($cl['sub'], $query) !== false) {
                $add($cl['label'], $cl['sub'] . " • {$district}", $cl['type'], $cl['icon'], $cl['query']);
            }
        }
    }

    // 1. Localities in Selected District (Highest Priority)
    $locSql = "
        SELECT DISTINCT 
            COALESCE(NULLIF(TRIM(pmd.village_locality), ''), p.locality_name) AS loc_name,
            p.city_name,
            pmd.district,
            pmd.taluk,
            COUNT(p.id) as prop_count
        FROM properties p
        LEFT JOIN property_master_details pmd ON p.id = pmd.property_id
        WHERE (p.locality_name LIKE :q OR pmd.village_locality LIKE :q OR pmd.taluk LIKE :q)
    ";
    $locParams = [':q' => $param];
    if (!empty($district)) {
        $locSql .= " AND (pmd.district LIKE :d OR p.city_name LIKE :d) ";
        $locParams[':d'] = $dParam;
    }
    $locSql .= " GROUP BY loc_name, p.city_name, pmd.district, pmd.taluk ORDER BY prop_count DESC LIMIT 8 ";

    $locStmt = $db->prepare($locSql);
    $locStmt->execute($locParams);
    foreach ($locStmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $sub = 'Locality in ' . ($r['taluk'] ? $r['taluk'] . ', ' : '') . ($r['district'] ?: $r['city_name'] ?: 'Tamil Nadu');
        $add($r['loc_name'], $sub, 'locality', 'location_on', $r['loc_name']);
    }

    // 2. Taluks matching query
    $talukSql = "
        SELECT DISTINCT pmd.taluk, p.city_name, pmd.district
        FROM property_master_details pmd
        LEFT JOIN properties p ON pmd.property_id = p.id
        WHERE pmd.taluk LIKE :q AND pmd.taluk IS NOT NULL
    ";
    $talukParams = [':q' => $param];
    if (!empty($district)) {
        $talukSql .= " AND (pmd.district LIKE :d OR p.city_name LIKE :d) ";
        $talukParams[':d'] = $dParam;
    }
    $talukSql .= " LIMIT 4 ";
    $stmtTaluk = $db->prepare($talukSql);
    $stmtTaluk->execute($talukParams);
    foreach ($stmtTaluk->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $sub = 'Taluk in ' . ($r['district'] ?: ($r['city_name'] ?: 'Tamil Nadu'));
        $add($r['taluk'], $sub, 'locality', 'location_on', $r['taluk']);
    }

    // 3. Projects matching query in District
    $projSql = "
        SELECT DISTINCT pmd.project_name, pmd.developer, p.locality_name, pmd.district
        FROM property_master_details pmd
        LEFT JOIN properties p ON pmd.property_id = p.id
        WHERE pmd.project_name LIKE :q AND pmd.project_name IS NOT NULL
    ";
    $projParams = [':q' => $param];
    if (!empty($district)) {
        $projSql .= " AND (pmd.district LIKE :d OR p.city_name LIKE :d) ";
        $projParams[':d'] = $dParam;
    }
    $projSql .= " LIMIT 4 ";
    $stmt3 = $db->prepare($projSql);
    $stmt3->execute($projParams);
    foreach ($stmt3->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $dev = !empty($r['developer']) ? 'By ' . substr($r['developer'], 0, 25) : 'Cadastral Layout';
        $sub = "Project • {$dev}";
        $add($r['project_name'], $sub, 'project', 'domain', $r['project_name']);
    }

    // 4. Cities & Districts Jurisdiction
    if (empty($district)) {
        $stmtDist = $db->prepare("SELECT DISTINCT district FROM property_master_details WHERE district LIKE :q AND district IS NOT NULL LIMIT 3");
        $stmtDist->execute([':q' => $param]);
        foreach ($stmtDist->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $add($r['district'], 'District Jurisdiction', 'city', 'location_city', $r['district']);
        }
    }

    echo json_encode([
        'success' => true,
        'message' => 'Suggestions retrieved',
        'data' => [
            'total' => count($suggestions),
            'suggestions' => $suggestions
        ]
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to fetch suggestions: ' . $e->getMessage()
    ]);
}
