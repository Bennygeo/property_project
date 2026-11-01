<?php
/**
 * Mannidam Real Estate Marketplace - High-Growth Corridors API
 * Dynamically aggregates verified growth corridors from property_master_details and properties tables.
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

    $stmt = $db->query("
        SELECT 
            CASE 
                WHEN LOWER(pmd.corridor) = 'gst road' OR LOWER(pmd.highway_name) LIKE '%gst road%' THEN 'GST Road (NH45)'
                WHEN LOWER(pmd.corridor) = 'omr' OR LOWER(pmd.corridor) = 'it corridor' THEN 'OMR IT Corridor'
                WHEN LOWER(pmd.corridor) = 'ecr' OR LOWER(pmd.highway_name) LIKE '%east coast road%' THEN 'East Coast Road (ECR)'
                WHEN LOWER(pmd.highway_name) LIKE '%chennai%bengaluru%' OR LOWER(pmd.highway_name) LIKE '%nh48%' THEN 'Chennai–Bengaluru Highway (NH48)'
                WHEN LOWER(pmd.highway_name) LIKE '%salem%kochi%' OR LOWER(pmd.highway_name) LIKE '%nh544%' THEN 'Salem–Kochi Highway (NH544)'
                WHEN LOWER(pmd.highway_name) LIKE '%avinashi road%' THEN 'Avinashi Road Industrial Belt (NH381)'
                WHEN LOWER(pmd.highway_name) LIKE '%madurai%kanyakumari%' THEN 'Madurai–Kanyakumari Highway (NH44)'
                WHEN LOWER(pmd.highway_name) LIKE '%chennai%kolkata%' OR LOWER(pmd.highway_name) LIKE '%nh16%' THEN 'Chennai–Kolkata Highway (NH16)'
                WHEN LOWER(pmd.highway_name) LIKE '%tiruvannamalai%villupuram%' OR LOWER(pmd.highway_name) LIKE '%nh77%' THEN 'Tiruvannamalai–Villupuram Road (NH77)'
                WHEN LOWER(pmd.highway_name) LIKE '%salem%chennai%' OR LOWER(pmd.highway_name) LIKE '%nh79%' THEN 'Salem–Chennai Highway (NH79)'
                WHEN LOWER(pmd.highway_name) LIKE '%trichy%chennai%' OR LOWER(pmd.highway_name) LIKE '%nh38%' THEN 'Trichy–Chennai Highway (NH38)'
                WHEN LOWER(pmd.highway_name) LIKE '%salem%karur%' THEN 'Salem–Karur Highway (NH44)'
                WHEN LOWER(pmd.highway_name) LIKE '%thoothukudi%madurai%' THEN 'Thoothukudi–Madurai Highway (NH138)'
                WHEN LOWER(pmd.district) = 'krishnagiri' OR LOWER(pmd.taluk) = 'hosur' THEN 'Hosur–Bengaluru Corridor (NH44)'
                ELSE NULL
            END AS corridor_name,
            COUNT(DISTINCT p.id) as property_count,
            GROUP_CONCAT(DISTINCT COALESCE(NULLIF(TRIM(pmd.district), ''), NULLIF(TRIM(p.city_name), '')) SEPARATOR ', ') AS districts,
            GROUP_CONCAT(DISTINCT NULLIF(TRIM(pmd.taluk), '') SEPARATOR ', ') AS taluks
        FROM properties p
        JOIN property_master_details pmd ON p.id = pmd.property_id
        WHERE (p.status = 'published' OR p.status IS NULL)
        GROUP BY corridor_name
        HAVING corridor_name IS NOT NULL
        ORDER BY property_count DESC
    ");

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Profile metadata for each corridor to display clear contextual subtitles & tags
    $profiles = [
        'GST Road (NH45)' => [
            'primaryCity' => 'Chengalpattu',
            'sub' => 'Vandalur, Tambaram & Madurantakam',
            'tag' => '300+ Verified Plots',
            'searchQuery' => 'GST Road'
        ],
        'Chennai–Bengaluru Highway (NH48)' => [
            'primaryCity' => 'Kancheepuram',
            'sub' => 'Sriperumbudur, Walajabad & Ranipet',
            'tag' => 'Industrial & Electronics Hub',
            'searchQuery' => 'NH48'
        ],
        'Salem–Kochi Highway (NH544)' => [
            'primaryCity' => 'Coimbatore',
            'sub' => 'Avinashi Road, Sulur & Erode Belt',
            'tag' => 'High Capital Appreciation',
            'searchQuery' => 'NH544'
        ],
        'Madurai–Kanyakumari Highway (NH44)' => [
            'primaryCity' => 'Madurai',
            'sub' => 'Madurai South, Virudhunagar & Tirunelveli',
            'tag' => 'Southern Transit Corridor',
            'searchQuery' => 'NH44'
        ],
        'Tiruvannamalai–Villupuram Road (NH77)' => [
            'primaryCity' => 'Tiruvannamalai',
            'sub' => 'Tindivanam, Gingee & Tiruvannamalai',
            'tag' => 'High Demand Layouts',
            'searchQuery' => 'NH77'
        ],
        'Salem–Chennai Highway (NH79)' => [
            'primaryCity' => 'Salem',
            'sub' => 'Salem, Attur & Kallakurichi Hub',
            'tag' => 'Rapid Infrastructure Belt',
            'searchQuery' => 'NH79'
        ],
        'Trichy–Chennai Highway (NH38)' => [
            'primaryCity' => 'Tiruchirappalli',
            'sub' => 'Tiruchirappalli East, Srirangam & Perambalur',
            'tag' => 'Central Transit Hub',
            'searchQuery' => 'NH38'
        ],
        'Salem–Karur Highway (NH44)' => [
            'primaryCity' => 'Namakkal',
            'sub' => 'Namakkal, Rasipuram & Paramathi Velur',
            'tag' => 'High Rental Yield',
            'searchQuery' => 'Salem Karur'
        ],
        'Thoothukudi–Madurai Highway (NH138)' => [
            'primaryCity' => 'Thoothukudi',
            'sub' => 'Thoothukudi Port, Kovilpatti & Ottapidaram',
            'tag' => 'Port & Logistics Corridor',
            'searchQuery' => 'Thoothukudi'
        ],
        'OMR IT Corridor' => [
            'primaryCity' => 'Chengalpattu',
            'sub' => 'Thiruporur, Kelambakkam & Siruseri IT Belt',
            'tag' => 'IT & Gated Townships',
            'searchQuery' => 'OMR'
        ],
        'East Coast Road (ECR)' => [
            'primaryCity' => 'Chengalpattu',
            'sub' => 'Kovalam, Mahabalipuram & Cuddalore Coast',
            'tag' => 'Coastal Villas & Plots',
            'searchQuery' => 'East Coast Road'
        ],
        'Avinashi Road Industrial Belt (NH381)' => [
            'primaryCity' => 'Tiruppur',
            'sub' => 'Avinashi, Palladam & Tiruppur Hub',
            'tag' => 'Textile & Commercial Hub',
            'searchQuery' => 'Avinashi Road'
        ],
        'Chennai–Kolkata Highway (NH16)' => [
            'primaryCity' => 'Tiruvallur',
            'sub' => 'Ponneri Smart City & Gummidipoondi',
            'tag' => 'Port & Smart City Belt',
            'searchQuery' => 'NH16'
        ],
        'Hosur–Bengaluru Corridor (NH44)' => [
            'primaryCity' => 'Krishnagiri',
            'sub' => 'Hosur Electronics & EV Auto Hub',
            'tag' => 'EV & Electronics Boom',
            'searchQuery' => 'Hosur'
        ]
    ];

    $corridors = [];
    foreach ($rows as $r) {
        $cName = $r['corridor_name'];
        $count = (int)$r['property_count'];
        $meta = $profiles[$cName] ?? null;

        $city = $meta['primaryCity'] ?? 'Tamil Nadu';
        $sub = $meta['sub'] ?? '';
        if (empty($sub) && !empty($r['taluks'])) {
            $tArr = array_slice(array_unique(array_filter(array_map('trim', explode(',', $r['taluks'])))), 0, 3);
            $sub = implode(', ', $tArr);
        }

        $tag = $meta['tag'] ?? "{$count} Verified Plots";
        $searchQuery = $meta['searchQuery'] ?? $cName;

        $corridors[] = [
            'name' => $cName,
            'city' => $city,
            'tag' => $tag,
            'sub' => $sub,
            'query' => $searchQuery,
            'propertyCount' => $count
        ];
    }

    echo json_encode([
        'success' => true,
        'message' => 'Trending High-Growth Corridors retrieved successfully',
        'data' => [
            'total' => count($corridors),
            'corridors' => $corridors
        ]
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to fetch corridors: ' . $e->getMessage()
    ]);
}

