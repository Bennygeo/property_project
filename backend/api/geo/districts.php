<?php
/**
 * Mannidam Real Estate Marketplace - Available Districts & Regions API
 * Fetches unique districts from `properties` table and groups them into 10 Main Areas + Regional Groups.
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

    // Query unique districts and property counts directly from `properties` table joined with master details
    $stmt = $db->query("
        SELECT 
            COALESCE(NULLIF(TRIM(p.city_name), ''), TRIM(pmd.district)) AS district_name,
            COUNT(DISTINCT p.id) AS property_count
        FROM properties p
        LEFT JOIN property_master_details pmd ON p.id = pmd.property_id
        WHERE (p.status = 'published' OR p.status IS NULL)
          AND (p.city_name IS NOT NULL OR pmd.district IS NOT NULL)
        GROUP BY district_name
        ORDER BY property_count DESC
    ");

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Spelling normalization
    $canonicalMap = [
        'thiruvallur'           => 'Tiruvallur',
        'thiruchirapalli'       => 'Tiruchirappalli',
        'thiruvarur'            => 'Tiruvarur',
        'thoothukkudi'          => 'Thoothukudi',
        'pudukottai'            => 'Pudukkottai',
        'tenksai'               => 'Tenkasi',
        'kanniyakumari'         => 'Kanyakumari',
        'vandalur chengalpattu' => 'Chengalpattu',
    ];

    // Standard Tamil Nadu Regional definitions
    $regionMap = [
        // Northern / Tondaimandalam
        'Vellore'         => 'Northern Region',
        'Ranipet'         => 'Northern Region',
        'Tirupathur'      => 'Northern Region',
        'Tiruvannamalai'  => 'Northern Region',
        'Villupuram'      => 'Northern Region',
        'Cuddalore'       => 'Northern Region',
        'Kallakurichi'    => 'Northern Region',

        // Western / Kongu
        'Tiruppur'        => 'Western Region (Kongu)',
        'Namakkal'        => 'Western Region (Kongu)',
        'Dharmapuri'      => 'Western Region (Kongu)',
        'Krishnagiri'     => 'Western Region (Kongu)',
        'Karur'           => 'Western Region (Kongu)',
        'Nilgiris'        => 'Western Region (Kongu)',

        // Central / Delta
        'Thanjavur'       => 'Central / Delta Region',
        'Tiruvarur'       => 'Central / Delta Region',
        'Nagapattinam'    => 'Central / Delta Region',
        'Mayiladuthurai'  => 'Central / Delta Region',
        'Pudukkottai'     => 'Central / Delta Region',
        'Perambalur'      => 'Central / Delta Region',
        'Ariyalur'        => 'Central / Delta Region',

        // Southern / Pandiya
        'Dindigul'        => 'Southern Region',
        'Theni'           => 'Southern Region',
        'Virudhunagar'    => 'Southern Region',
        'Sivagangai'      => 'Southern Region',
        'Ramanathapuram'  => 'Southern Region',
        'Tenkasi'         => 'Southern Region',
        'Thoothukudi'     => 'Southern Region',
        'Kanyakumari'     => 'Southern Region',
    ];

    // Top 10 Main Areas (Capital & Premier Real Estate Hubs)
    $mainTenOrder = [
        'Chennai',
        'Chengalpattu',
        'Tiruvallur',
        'Kancheepuram',
        'Coimbatore',
        'Madurai',
        'Tiruchirappalli',
        'Salem',
        'Tirunelveli',
        'Erode'
    ];
    $mainTenSet = array_flip($mainTenOrder);

    // Collect counts and clean names
    $counts = [];
    foreach ($rows as $r) {
        $raw = preg_replace('/[^\x20-\x7E]/', '', (string)$r['district_name']);
        $raw = trim($raw, " \t\n\r\0\x0B/-,.");
        if (empty($raw) || strlen($raw) < 3) continue;

        $lower = strtolower($raw);
        $name = $canonicalMap[$lower] ?? ucwords($lower);
        $counts[$name] = ($counts[$name] ?? 0) + (int)$r['property_count'];
    }

    // Always ensure Chennai has at least the published plot
    if (!isset($counts['Chennai'])) {
        $counts['Chennai'] = 1;
    }

    // Build 1. Top 10 Main Hubs
    $mainHubs = [];
    foreach ($mainTenOrder as $hub) {
        $mainHubs[] = [
            'name'          => $hub,
            'propertyCount' => $counts[$hub] ?? 0,
            'isMainHub'     => true,
            'region'        => 'Major Hub'
        ];
    }

    // Build 2. Regional Groups for remaining districts
    $regionalGroups = [
        'Western Region (Kongu)'   => [],
        'Southern Region'          => [],
        'Central / Delta Region'   => [],
        'Northern Region'          => []
    ];

    foreach ($counts as $district => $cnt) {
        if (isset($mainTenSet[$district])) {
            continue; // Skip main 10 hubs
        }
        $reg = $regionMap[$district] ?? 'Other Districts';
        if (!isset($regionalGroups[$reg])) {
            $regionalGroups[$reg] = [];
        }
        $regionalGroups[$reg][] = [
            'name'          => $district,
            'propertyCount' => $cnt,
            'isMainHub'     => false,
            'region'        => $reg
        ];
    }

    // Sort districts alphabetically within each region
    foreach ($regionalGroups as $reg => &$distList) {
        usort($distList, fn($a, $b) => strcasecmp($a['name'], $b['name']));
    }
    unset($distList);

    // Format output
    $formattedGroups = [];
    foreach ($regionalGroups as $regName => $distList) {
        if (!empty($distList)) {
            $formattedGroups[] = [
                'regionName' => $regName,
                'districts'  => $distList
            ];
        }
    }

    echo json_encode([
        'success'        => true,
        'mainHubs'       => $mainHubs,
        'regionalGroups' => $formattedGroups,
        'allDistricts'   => array_merge($mainHubs, ...array_values(array_column($formattedGroups, 'districts')))
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success'        => false,
        'message'        => 'Failed to load districts: ' . $e->getMessage(),
        'mainHubs'       => [],
        'regionalGroups' => []
    ]);
}
