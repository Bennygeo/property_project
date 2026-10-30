<?php
/**
 * Mannidam Real Estate Marketplace - Reverse Geocoding API (OpenStreetMap Nominatim)
 * Resolves GPS coordinates (lat, lon) into human-readable street, locality, city and pincode addresses.
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

$action = $_GET['action'] ?? 'reverse';

if ($action === 'search') {
    // Geocode an entered text query (e.g. "Porur, Chennai")
    $query = trim($_GET['q'] ?? '');
    if (empty($query)) {
        echo json_encode(['success' => false, 'message' => 'Empty query parameter']);
        exit;
    }

    $url = "https://nominatim.openstreetmap.org/search?q=" . urlencode($query . ', Tamil Nadu, India') . "&format=json&addressdetails=1&limit=5";
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_USERAGENT, 'MannidamMarketplace/1.0 (contact@mannidam.in)');
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    $response = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($code === 200 && $response) {
        $results = json_decode($response, true);
        $formatted = [];
        if (is_array($results)) {
            foreach ($results as $item) {
                $addr = $item['address'] ?? [];
                $loc = $addr['suburb'] ?? ($addr['neighbourhood'] ?? ($addr['city'] ?? ($addr['town'] ?? ($addr['village'] ?? ''))));
                $formatted[] = [
                    'displayName' => $item['display_name'] ?? '',
                    'name'        => $item['name'] ?? $loc,
                    'locality'    => $loc,
                    'city'        => $addr['city'] ?? ($addr['town'] ?? ($addr['state_district'] ?? '')),
                    'district'    => $addr['state_district'] ?? ($addr['county'] ?? ''),
                    'postcode'    => $addr['postcode'] ?? '',
                    'latitude'    => (float)$item['lat'],
                    'longitude'   => (float)$item['lon']
                ];
            }
        }
        echo json_encode(['success' => true, 'results' => $formatted]);
        exit;
    }

    echo json_encode(['success' => false, 'results' => []]);
    exit;
}

// Default: Reverse Geocode (lat, lon)
$lat = isset($_GET['lat']) ? (float)$_GET['lat'] : 0.0;
$lon = isset($_GET['lon']) ? (float)$_GET['lon'] : (isset($_GET['lng']) ? (float)$_GET['lng'] : 0.0);

if ($lat === 0.0 || $lon === 0.0) {
    echo json_encode([
        'success' => false,
        'message' => 'Valid latitude and longitude required'
    ]);
    exit;
}

$url = "https://nominatim.openstreetmap.org/reverse?lat={$lat}&lon={$lon}&format=json&addressdetails=1";

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_USERAGENT, 'MannidamMarketplace/1.0 (contact@mannidam.in)');
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_TIMEOUT, 5);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 200 && $response) {
    $data = json_decode($response, true);
    if (!empty($data) && isset($data['display_name'])) {
        $addr = $data['address'] ?? [];
        $loc = $addr['suburb'] ?? ($addr['neighbourhood'] ?? ($addr['village'] ?? ($addr['city_district'] ?? ($addr['town'] ?? ''))));
        $city = $addr['city'] ?? ($addr['town'] ?? ($addr['state_district'] ?? 'Chennai'));
        $district = $addr['state_district'] ?? ($addr['county'] ?? '');
        $postcode = $addr['postcode'] ?? '';

        // Form clean compact title (e.g., "Evening Bazaar, Zone 5 Royapuram, Chennai - 600001")
        $parts = array_filter([$data['name'] ?? null, $loc ?: null, $city ?: null, $postcode ?: null]);
        $compactTitle = implode(', ', array_unique($parts));

        echo json_encode([
            'success' => true,
            'data' => [
                'displayName'   => $data['display_name'],
                'compactTitle'  => $compactTitle,
                'name'          => $data['name'] ?? $loc,
                'road'          => $addr['road'] ?? '',
                'locality'      => $loc,
                'city'          => $city,
                'district'      => $district,
                'state'         => $addr['state'] ?? 'Tamil Nadu',
                'postcode'      => $postcode,
                'latitude'      => $lat,
                'longitude'     => $lon
            ]
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// Fallback if Nominatim timeout or error
echo json_encode([
    'success' => true,
    'data' => [
        'displayName'  => 'Current Detected Location',
        'compactTitle' => "Coordinates ({$lat}, {$lon})",
        'locality'     => 'Detected Area',
        'city'         => 'Tamil Nadu',
        'latitude'     => $lat,
        'longitude'    => $lon
    ]
]);

