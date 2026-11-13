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

function isValidSuggestDeveloper(string $name): bool {
    $clean = trim($name);
    if (strlen($clean) < 2) return false;
    $lower = strtolower($clean);
    return !in_array($lower, ['admin', 'developer portal', 'registry admin', 'null', 'undefined', 'n/a'], true);
}

// Known prominent localities across Tamil Nadu districts
$curatedDistrictLocalities = [
    'Chennai' => [
        ['label' => 'Porur', 'sub' => 'West Chennai Hub', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Porur'],
        ['label' => 'Velachery', 'sub' => 'South Chennai Hub', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Velachery'],
        ['label' => 'Guindy', 'sub' => 'Industrial & Transit Corridor', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Guindy'],
        ['label' => 'Sholinganallur', 'sub' => 'OMR IT Expressway Corridor', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Sholinganallur'],
        ['label' => 'Perumbakkam', 'sub' => 'Residential Corridor', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Perumbakkam'],
        ['label' => 'Anna Nagar', 'sub' => 'North-West Chennai Prime', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Anna Nagar']
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
        ['label' => 'Avadi', 'sub' => 'Western Rail & Growth Corridor', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Avadi'],
        ['label' => 'Kadambathur', 'sub' => 'Arakkonam Rail Corridor', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Kadambathur'],
        ['label' => 'Ponneri', 'sub' => 'North Smart City Corridor', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Ponneri'],
        ['label' => 'Gummidipoondi', 'sub' => 'Industrial SIPCOT Corridor', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Gummidipoondi']
    ],
    'Kanchipuram' => [
        ['label' => 'Sriperumbudur', 'sub' => 'Automobile & Electronics Hub', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Sriperumbudur'],
        ['label' => 'Oragadam', 'sub' => 'Industrial & SIPCOT Belt', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Oragadam'],
        ['label' => 'Walajabad', 'sub' => 'Kanchipuram Growth Belt', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Walajabad'],
        ['label' => 'Manimangalam', 'sub' => 'Kundrathur Taluk', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Manimangalam'],
        ['label' => 'Vattambakkam', 'sub' => 'Walajabad Taluk', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Vattambakkam'],
        ['label' => 'Vaipoor', 'sub' => 'Kanchipuram Taluk', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Vaipoor']
    ],
    'Kanyakumari' => [
        ['label' => 'Nagercoil', 'sub' => 'Kanyakumari District Capital', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Nagercoil'],
        ['label' => 'Marthandam', 'sub' => 'Commercial & Transit Hub', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Marthandam'],
        ['label' => 'Thuckalay', 'sub' => 'NH47B Corridor', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Thuckalay'],
        ['label' => 'Kuzhithurai', 'sub' => 'Western Kanyakumari Belt', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Kuzhithurai'],
        ['label' => 'Colachel', 'sub' => 'Coastal & Port Corridor', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Colachel']
    ],
    'Coimbatore' => [
        ['label' => 'Saravanampatti', 'sub' => 'Coimbatore IT & Education Hub', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Saravanampatti'],
        ['label' => 'Peelamedu', 'sub' => 'Airport & Avinashi Road Corridor', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Peelamedu'],
        ['label' => 'Neelambur', 'sub' => 'L&T Bypass & NH544 Belt', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Neelambur'],
        ['label' => 'Vadavalli', 'sub' => 'West Coimbatore Residential', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Vadavalli'],
        ['label' => 'Pollachi', 'sub' => 'Southern Coimbatore Belt', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Pollachi']
    ],
    'Madurai' => [
        ['label' => 'Mattuthavani', 'sub' => 'Madurai IT & Bus Terminus Belt', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Mattuthavani'],
        ['label' => 'Thiruparankundram', 'sub' => 'South Madurai Corridor', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Thiruparankundram'],
        ['label' => 'Othakadai', 'sub' => 'Ring Road & NH44 Hub', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Othakadai'],
        ['label' => 'Melur', 'sub' => 'East Madurai Growth Hub', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Melur']
    ],
    'Tiruchirappalli' => [
        ['label' => 'Srirangam', 'sub' => 'Heritage & Residential Island', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Srirangam'],
        ['label' => 'Thillai Nagar', 'sub' => 'Central Trichy Commercial', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Thillai Nagar'],
        ['label' => 'KK Nagar', 'sub' => 'Airport & Panjapur Belt', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'KK Nagar'],
        ['label' => 'Panjapur', 'sub' => 'Integrated Terminus & IT Belt', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Panjapur']
    ],
    'Salem' => [
        ['label' => 'Fairlands', 'sub' => 'Central Salem Residential', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Fairlands'],
        ['label' => 'Omalur', 'sub' => 'Airport & NH44 Belt', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Omalur'],
        ['label' => 'Attur', 'sub' => 'Salem-Chennai Highway Belt', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Attur']
    ],
    'Tirunelveli' => [
        ['label' => 'Palayamkottai', 'sub' => 'Tirunelveli Education & Residential', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Palayamkottai'],
        ['label' => 'Vannarpettai', 'sub' => 'Commercial & Transit Core', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Vannarpettai'],
        ['label' => 'KTC Nagar', 'sub' => 'NH44 Highway Hub', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'KTC Nagar']
    ],
    'Erode' => [
        ['label' => 'Perundurai', 'sub' => 'SIPCOT & NH544 Industrial Belt', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Perundurai'],
        ['label' => 'Thindal', 'sub' => 'Ring Road Residential Corridor', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Thindal'],
        ['label' => 'Gobichettipalayam', 'sub' => 'West Erode Growth Hub', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Gobichettipalayam']
    ],
    'Tiruppur' => [
        ['label' => 'Avinashi', 'sub' => 'NH544 Textile & Residential', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Avinashi'],
        ['label' => 'Palladam', 'sub' => 'Coimbatore-Trichy Highway', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Palladam']
    ],
    'Vellore' => [
        ['label' => 'Katpadi', 'sub' => 'VIT & Rail Junction Corridor', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Katpadi'],
        ['label' => 'Sathuvachari', 'sub' => 'NH48 Growth Belt', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Sathuvachari']
    ],
    'Thanjavur' => [
        ['label' => 'Kumbakonam', 'sub' => 'Delta Heritage & Residential', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Kumbakonam'],
        ['label' => 'Medical College Road', 'sub' => 'South Thanjavur Corridor', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Medical College Road']
    ],
    'Krishnagiri' => [
        ['label' => 'Hosur', 'sub' => 'EV & IT Industrial Corridor', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Hosur'],
        ['label' => 'Bagalur', 'sub' => 'Bengaluru Border Growth Hub', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Bagalur']
    ],
    'Dindigul' => [
        ['label' => 'Palani', 'sub' => 'Western Corridor', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Palani'],
        ['label' => 'Kodaikanal', 'sub' => 'Hill Station & Retreat Plots', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Kodaikanal']
    ],
    'Thoothukudi' => [
        ['label' => 'Millerpuram', 'sub' => 'Port & Commercial Belt', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Millerpuram'],
        ['label' => 'Kovilpatti', 'sub' => 'NH44 Industrial Corridor', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Kovilpatti']
    ],
    'Tiruvannamalai' => [
        ['label' => 'Girivalam Corridor', 'sub' => 'Heritage Residential Belt', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Tiruvannamalai'],
        ['label' => 'Cheyyar', 'sub' => 'SIPCOT Industrial Corridor', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Cheyyar']
    ],
    'Cuddalore' => [
        ['label' => 'Chidambaram', 'sub' => 'ECR & University Belt', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Chidambaram'],
        ['label' => 'Neyveli', 'sub' => 'Industrial Township Corridor', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Neyveli']
    ],
    'Viluppuram' => [
        ['label' => 'Tindivanam', 'sub' => 'GST Road NH45 Hub', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Tindivanam'],
        ['label' => 'Auroville Belt', 'sub' => 'ECR Coastal Corridor', 'type' => 'locality', 'icon' => 'location_on', 'query' => 'Vanur']
    ]
];
$curatedDistrictLocalities['Kancheepuram'] = $curatedDistrictLocalities['Kanchipuram'];

$variantDistricts = [
    'tiruvallur'      => ['Tiruvallur', 'Thiruvallur'],
    'thiruvallur'     => ['Tiruvallur', 'Thiruvallur'],
    'tiruchirappalli' => ['Tiruchirappalli', 'Thiruchirapalli', 'Trichy'],
    'trichy'          => ['Tiruchirappalli', 'Thiruchirapalli', 'Trichy'],
    'tiruvarur'       => ['Tiruvarur', 'Thiruvarur'],
    'thiruvarur'      => ['Tiruvarur', 'Thiruvarur'],
    'thoothukudi'     => ['Thoothukudi', 'Thoothukkudi', 'Tuticorin'],
    'pudukkottai'     => ['Pudukkottai', 'Pudukottai'],
    'tenkasi'         => ['Tenkasi', 'Tenksai'],
    'kanyakumari'     => ['Kanyakumari', 'Kanniyakumari', 'Nagercoil'],
    'kanniyakumari'   => ['Kanyakumari', 'Kanniyakumari', 'Nagercoil'],
    'kanchipuram'     => ['Kanchipuram', 'Kancheepuram'],
    'kancheepuram'    => ['Kanchipuram', 'Kancheepuram'],
    'viluppuram'      => ['Viluppuram', 'Villupuram'],
    'villupuram'      => ['Viluppuram', 'Villupuram'],
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
                $dClauses[] = "p.district LIKE :dv{$idx} OR p.city LIKE :dv{$idx}";
                $dParams[":dv{$idx}"] = '%' . $v . '%';
            }
            $dWhere = '(' . implode(' OR ', $dClauses) . ')';

            $topStmt = $db->prepare("
                SELECT 
                    p.locality AS loc_name,
                    p.district,
                    p.city,
                    COUNT(DISTINCT p.project_id) AS prop_count
                FROM projects p
                WHERE (p.status = 'published' OR p.status IS NULL)
                  AND {$dWhere}
                GROUP BY loc_name, p.district, p.city
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
                    $sub = $district . ' (' . $r['prop_count'] . ' Verified Plots)';
                    $topList[] = [
                        'label' => $cleanLoc,
                        'sub'   => $sub,
                        'type'  => 'locality',
                        'icon'  => 'location_on',
                        'query' => $cleanLoc
                    ];
                }
            }

            $curatedMatch = null;
            foreach ($curatedDistrictLocalities as $cKey => $cItems) {
                if (strcasecmp($cKey, $district) === 0) {
                    $curatedMatch = $cItems;
                    break;
                }
            }

            if (count($topList) < 6 && $curatedMatch !== null) {
                foreach ($curatedMatch as $cItem) {
                    $k = strtolower($cItem['label']);
                    if (!isset($seenTop[$k]) && count($topList) < 8) {
                        $seenTop[$k] = true;
                        $topList[] = $cItem;
                    }
                }
            }

            // Append up to 3 top verified developers in this district (or fallback top developers)
            $devTopAdded = 0;
            $seenTopDevs = [];
            try {
                $dOfficeClauses = [];
                $devDistParams = [];
                foreach ($variants as $idx => $v) {
                    $dOfficeClauses[] = "p.district LIKE :dv{$idx} OR p.city LIKE :dv{$idx} OR d.corporate_office LIKE :dv{$idx}";
                    $devDistParams[":dv{$idx}"] = '%' . $v . '%';
                }
                $devDistWhere = '(' . implode(' OR ', $dOfficeClauses) . ')';
                $devTopStmt = $db->prepare("
                    SELECT d.name AS dev_name, COUNT(DISTINCT p.project_id) AS proj_count
                    FROM developers d
                    LEFT JOIN projects p
                        ON (p.developer_id = d.id OR LOWER(TRIM(p.developer_name)) = LOWER(TRIM(d.name)))
                        AND (p.status = 'published' OR p.status IS NULL)
                    WHERE NULLIF(TRIM(d.name), '') IS NOT NULL
                      AND {$devDistWhere}
                    GROUP BY d.id, d.name
                    ORDER BY proj_count DESC, d.name ASC
                    LIMIT 3
                ");
                $devTopStmt->execute($devDistParams);
                foreach ($devTopStmt->fetchAll(PDO::FETCH_ASSOC) as $dr) {
                    $cleanDev = trim((string)($dr['dev_name'] ?? ''));
                    if (!isValidSuggestDeveloper($cleanDev)) continue;
                    $dk = strtolower($cleanDev);
                    if (!isset($seenTopDevs[$dk]) && $devTopAdded < 3) {
                        $seenTopDevs[$dk] = true;
                        $devTopAdded++;
                        $projCount = (int)($dr['proj_count'] ?? 0);
                        $topList[] = [
                            'label' => $cleanDev,
                            'sub'   => $projCount > 0 ? "Verified Developer • {$projCount} Projects" : 'Verified Developer • View Profile',
                            'type'  => 'developer',
                            'icon'  => 'apartment',
                            'query' => $cleanDev
                        ];
                    }
                }

                if ($devTopAdded < 3) {
                    $projDevStmt = $db->prepare("
                        SELECT TRIM(p.developer_name) AS dev_name, COUNT(DISTINCT p.project_id) AS proj_count
                        FROM projects p
                        WHERE (p.status = 'published' OR p.status IS NULL)
                          AND NULLIF(TRIM(p.developer_name), '') IS NOT NULL
                          AND {$dWhere}
                        GROUP BY TRIM(p.developer_name)
                        ORDER BY proj_count DESC
                        LIMIT 3
                    ");
                    $projDevStmt->execute($dParams);
                    foreach ($projDevStmt->fetchAll(PDO::FETCH_ASSOC) as $dr) {
                        $cleanDev = trim((string)($dr['dev_name'] ?? ''));
                        if (!isValidSuggestDeveloper($cleanDev)) continue;
                        $dk = strtolower($cleanDev);
                        if (!isset($seenTopDevs[$dk]) && $devTopAdded < 3) {
                            $seenTopDevs[$dk] = true;
                            $devTopAdded++;
                            $projCount = (int)($dr['proj_count'] ?? 0);
                            $topList[] = [
                                'label' => $cleanDev,
                                'sub'   => $projCount > 0 ? "Verified Developer • {$projCount} Projects" : 'Verified Developer • View Profile',
                                'type'  => 'developer',
                                'icon'  => 'apartment',
                                'query' => $cleanDev
                            ];
                        }
                    }
                }

                if ($devTopAdded === 0) {
                    $fallbackDevStmt = $db->query("
                        SELECT d.name AS dev_name, COUNT(DISTINCT p.project_id) AS proj_count
                        FROM developers d
                        LEFT JOIN projects p
                            ON (p.developer_id = d.id OR LOWER(TRIM(p.developer_name)) = LOWER(TRIM(d.name)))
                            AND (p.status = 'published' OR p.status IS NULL)
                        WHERE NULLIF(TRIM(d.name), '') IS NOT NULL
                        GROUP BY d.id, d.name
                        ORDER BY proj_count DESC, d.name ASC
                        LIMIT 3
                    ");
                    foreach ($fallbackDevStmt->fetchAll(PDO::FETCH_ASSOC) as $dr) {
                        $cleanDev = trim((string)($dr['dev_name'] ?? ''));
                        if (!isValidSuggestDeveloper($cleanDev)) continue;
                        $dk = strtolower($cleanDev);
                        if (!isset($seenTopDevs[$dk]) && $devTopAdded < 3) {
                            $seenTopDevs[$dk] = true;
                            $devTopAdded++;
                            $projCount = (int)($dr['proj_count'] ?? 0);
                            $topList[] = [
                                'label' => $cleanDev,
                                'sub'   => $projCount > 0 ? "Verified Developer • {$projCount} Projects" : 'Verified Developer • View Profile',
                                'type'  => 'developer',
                                'icon'  => 'apartment',
                                'query' => $cleanDev
                            ];
                        }
                    }
                }
            } catch (Throwable $e) {
                // Non-fatal: continue with locality suggestions
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

    // No district selected and query is empty: return popular verified search items
    $popularList = [];
    try {
        $db = (new Database())->getConnection();
        $popStmt = $db->query("
            SELECT 
                p.locality AS loc_name,
                COALESCE(NULLIF(p.district, ''), NULLIF(p.city, ''), 'Tamil Nadu') AS region_name,
                COUNT(DISTINCT p.project_id) AS prop_count
            FROM projects p
            WHERE (p.status = 'published' OR p.status IS NULL)
              AND p.locality IS NOT NULL
              AND TRIM(p.locality) != ''
            GROUP BY loc_name, region_name
            ORDER BY prop_count DESC
            LIMIT 6
        ");
        $seenPop = [];
        foreach ($popStmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $cleanLoc = trim(preg_replace('/[^\x20-\x7E]/', '', (string)$r['loc_name']));
            if (empty($cleanLoc) || strlen($cleanLoc) < 2) continue;
            $k = strtolower($cleanLoc);
            if (!isset($seenPop[$k])) {
                $seenPop[$k] = true;
                $popularList[] = [
                    'label' => $cleanLoc,
                    'sub'   => 'Popular Search • ' . $r['region_name'] . ' (' . $r['prop_count'] . ' Projects)',
                    'type'  => 'locality',
                    'icon'  => 'trending_up',
                    'query' => $cleanLoc
                ];
            }
        }
    } catch (Throwable $e) {
        // Fallback below
    }

    if (empty($popularList)) {
        $popularList = [
            ['label' => 'OMR IT Corridor', 'sub' => 'Popular Search • Chengalpattu & Chennai', 'type' => 'corridor', 'icon' => 'trending_up', 'query' => 'OMR'],
            ['label' => 'GST Road (NH45)', 'sub' => 'Popular Search • Tambaram to Chengalpattu', 'type' => 'corridor', 'icon' => 'trending_up', 'query' => 'GST Road'],
            ['label' => 'Coimbatore', 'sub' => 'Popular Search • Western Real Estate Hub', 'type' => 'city', 'icon' => 'location_city', 'query' => 'Coimbatore'],
            ['label' => 'Hosur', 'sub' => 'Popular Search • IT & EV Industrial Hub', 'type' => 'locality', 'icon' => 'trending_up', 'query' => 'Hosur'],
            ['label' => 'Sriperumbudur', 'sub' => 'Popular Search • Kancheepuram Hub', 'type' => 'locality', 'icon' => 'trending_up', 'query' => 'Sriperumbudur']
        ];
    }

    // Append up to 3 popular verified developers
    try {
        $db = $db ?? (new Database())->getConnection();
        $popDevStmt = $db->query("
            SELECT d.name AS dev_name, COUNT(DISTINCT p.project_id) AS proj_count
            FROM developers d
            LEFT JOIN projects p
                ON (p.developer_id = d.id OR LOWER(TRIM(p.developer_name)) = LOWER(TRIM(d.name)))
                AND (p.status = 'published' OR p.status IS NULL)
            WHERE NULLIF(TRIM(d.name), '') IS NOT NULL
            GROUP BY d.id, d.name
            ORDER BY proj_count DESC, d.name ASC
            LIMIT 3
        ");
        $seenPopDevs = [];
        $popDevsAdded = 0;
        foreach ($popDevStmt->fetchAll(PDO::FETCH_ASSOC) as $dr) {
            $cleanDev = trim((string)($dr['dev_name'] ?? ''));
            if (!isValidSuggestDeveloper($cleanDev)) continue;
            $dk = strtolower($cleanDev);
            if (!isset($seenPopDevs[$dk]) && $popDevsAdded < 3) {
                $seenPopDevs[$dk] = true;
                $popDevsAdded++;
                $projCount = (int)($dr['proj_count'] ?? 0);
                $popularList[] = [
                    'label' => $cleanDev,
                    'sub'   => $projCount > 0 ? "Verified Developer • {$projCount} Projects" : 'Verified Developer • View Profile',
                    'type'  => 'developer',
                    'icon'  => 'apartment',
                    'query' => $cleanDev
                ];
            }
        }
        if ($popDevsAdded < 3) {
            $projPopDevStmt = $db->query("
                SELECT TRIM(p.developer_name) AS dev_name, COUNT(DISTINCT p.project_id) AS proj_count
                FROM projects p
                WHERE (p.status = 'published' OR p.status IS NULL)
                  AND NULLIF(TRIM(p.developer_name), '') IS NOT NULL
                GROUP BY TRIM(p.developer_name)
                ORDER BY proj_count DESC
                LIMIT 3
            ");
            foreach ($projPopDevStmt->fetchAll(PDO::FETCH_ASSOC) as $dr) {
                $cleanDev = trim((string)($dr['dev_name'] ?? ''));
                if (!isValidSuggestDeveloper($cleanDev)) continue;
                $dk = strtolower($cleanDev);
                if (!isset($seenPopDevs[$dk]) && $popDevsAdded < 3) {
                    $seenPopDevs[$dk] = true;
                    $popDevsAdded++;
                    $projCount = (int)($dr['proj_count'] ?? 0);
                    $popularList[] = [
                        'label' => $cleanDev,
                        'sub'   => $projCount > 0 ? "Verified Developer • {$projCount} Projects" : 'Verified Developer • View Profile',
                        'type'  => 'developer',
                        'icon'  => 'apartment',
                        'query' => $cleanDev
                    ];
                }
            }
        }
    } catch (Throwable $e) {
        // Ignore non-fatal developer lookup failure
    }

    echo json_encode([
        'success' => true,
        'message' => 'Popular search items',
        'data' => [
            'total' => count($popularList),
            'suggestions' => $popularList
        ]
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
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
        if (!isset($seen[$key]) && count($suggestions) < 18) {
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

    // 0. Verified Developers matching query
    try {
        $devSearchStmt = $db->prepare("
            SELECT d.name AS dev_name, COUNT(DISTINCT p.project_id) AS proj_count
            FROM developers d
            LEFT JOIN projects p
                ON (p.developer_id = d.id OR LOWER(TRIM(p.developer_name)) = LOWER(TRIM(d.name)))
                AND (p.status = 'published' OR p.status IS NULL)
            WHERE d.name LIKE :q AND NULLIF(TRIM(d.name), '') IS NOT NULL
            GROUP BY d.id, d.name
            ORDER BY proj_count DESC, d.name ASC
            LIMIT 5
        ");
        $devSearchStmt->execute([':q' => $param]);
        foreach ($devSearchStmt->fetchAll(PDO::FETCH_ASSOC) as $dr) {
            $cleanDev = trim((string)($dr['dev_name'] ?? ''));
            if (!isValidSuggestDeveloper($cleanDev)) continue;
            $projCount = (int)($dr['proj_count'] ?? 0);
            $sub = $projCount > 0 ? "Verified Developer • {$projCount} Projects" : 'Verified Developer • View Profile';
            $add($cleanDev, $sub, 'developer', 'apartment', $cleanDev);
        }

        $projDevSearchSql = "
            SELECT TRIM(p.developer_name) AS dev_name, COUNT(DISTINCT p.project_id) AS proj_count
            FROM projects p
            WHERE (p.status = 'published' OR p.status IS NULL)
              AND p.developer_name LIKE :q
              AND NULLIF(TRIM(p.developer_name), '') IS NOT NULL
        ";
        $projDevSearchParams = [':q' => $param];
        if (!empty($district)) {
            $projDevSearchSql .= " AND (p.district LIKE :d OR p.city LIKE :d) ";
            $projDevSearchParams[':d'] = $dParam;
        }
        $projDevSearchSql .= " GROUP BY TRIM(p.developer_name) ORDER BY proj_count DESC LIMIT 5 ";
        $projDevSearchStmt = $db->prepare($projDevSearchSql);
        $projDevSearchStmt->execute($projDevSearchParams);
        foreach ($projDevSearchStmt->fetchAll(PDO::FETCH_ASSOC) as $dr) {
            $cleanDev = trim((string)($dr['dev_name'] ?? ''));
            if (!isValidSuggestDeveloper($cleanDev)) continue;
            $projCount = (int)($dr['proj_count'] ?? 0);
            $sub = $projCount > 0 ? "Verified Developer • {$projCount} Projects" : 'Verified Developer • View Profile';
            $add($cleanDev, $sub, 'developer', 'apartment', $cleanDev);
        }
    } catch (Throwable $e) {
        // Continue with locality and project suggestions
    }

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
            p.locality AS loc_name,
            p.city,
            p.district,
            COUNT(p.project_id) as prop_count
        FROM projects p
        WHERE (p.locality LIKE :q OR p.city LIKE :q OR p.district LIKE :q)
    ";
    $locParams = [':q' => $param];
    if (!empty($district)) {
        $locSql .= " AND (p.district LIKE :d OR p.city LIKE :d) ";
        $locParams[':d'] = $dParam;
    }
    $locSql .= " GROUP BY loc_name, p.city, p.district ORDER BY prop_count DESC LIMIT 8 ";

    $locStmt = $db->prepare($locSql);
    $locStmt->execute($locParams);
    foreach ($locStmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $sub = 'Locality in ' . ($r['district'] ?: $r['city'] ?: 'Tamil Nadu');
        $add($r['loc_name'], $sub, 'locality', 'location_on', $r['loc_name']);
    }

    // 2. Projects matching query in District
    $projSql = "
        SELECT DISTINCT p.project_name, p.developer_name, p.locality, p.district
        FROM projects p
        WHERE p.project_name LIKE :q AND p.project_name IS NOT NULL
    ";
    $projParams = [':q' => $param];
    if (!empty($district)) {
        $projSql .= " AND (p.district LIKE :d OR p.city LIKE :d) ";
        $projParams[':d'] = $dParam;
    }
    $projSql .= " LIMIT 4 ";
    $stmt3 = $db->prepare($projSql);
    $stmt3->execute($projParams);
    foreach ($stmt3->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $dev = !empty($r['developer_name']) ? 'By ' . substr($r['developer_name'], 0, 25) : 'Cadastral Layout';
        $sub = "Project • {$dev}";
        $add($r['project_name'], $sub, 'project', 'domain', $r['project_name']);
    }

    // 3. Cities & Districts Jurisdiction
    if (empty($district)) {
        $stmtDist = $db->prepare("SELECT DISTINCT district FROM projects WHERE district LIKE :q AND district IS NOT NULL LIMIT 4");
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
