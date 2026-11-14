<?php
/**
 * Mannidam Real Estate Marketplace - Google Places Autocomplete & Details Proxy
 * Uses Google Places API (New) with resilient Nominatim / Tamil Nadu geocoding fallback
 * so autocomplete localities always populate even during Google API quota exhaustion or rate limits.
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$apiKey = $_GET['apiKey'] ?? ($_SERVER['HTTP_X_GOOG_API_KEY'] ?? 'AIzaSyDVb2t2T8hRHrH-sOnFohmtrcwCRsvkbcw');
$action = $_GET['action'] ?? 'autocomplete';

// Curated prominent Tamil Nadu localities, hubs, and corridors with coordinates
$tnCuratedLocalities = [
    // Chennai & Central
    ['label' => 'Tambaram', 'sub' => 'South Chennai & Chengalpattu Gateway', 'district' => 'Chengalpattu', 'lat' => 12.9249, 'lng' => 80.1000],
    ['label' => 'East Tambaram', 'sub' => 'Residential & Transit Hub', 'district' => 'Chengalpattu', 'lat' => 12.9200, 'lng' => 80.1250],
    ['label' => 'West Tambaram', 'sub' => 'Commercial & Bus Terminus Corridor', 'district' => 'Chengalpattu', 'lat' => 12.9280, 'lng' => 80.1100],
    ['label' => 'Tambaram Sanatorium', 'sub' => 'GST Road Transit & Health Belt', 'district' => 'Chengalpattu', 'lat' => 12.9420, 'lng' => 80.1320],
    ['label' => 'Velachery', 'sub' => 'South Chennai Transit & Retail Hub', 'district' => 'Chennai', 'lat' => 12.9815, 'lng' => 80.2180],
    ['label' => 'Porur', 'sub' => 'West Chennai IT & Healthcare Hub', 'district' => 'Chennai', 'lat' => 13.0382, 'lng' => 80.1565],
    ['label' => 'Guindy', 'sub' => 'Industrial & Transit Corridor', 'district' => 'Chennai', 'lat' => 13.0067, 'lng' => 80.2021],
    ['label' => 'Adyar', 'sub' => 'South Chennai Premium Coastal Locality', 'district' => 'Chennai', 'lat' => 13.0012, 'lng' => 80.2565],
    ['label' => 'Besant Nagar', 'sub' => 'Coastal Residential & Beach Belt', 'district' => 'Chennai', 'lat' => 12.9998, 'lng' => 80.2707],
    ['label' => 'T. Nagar', 'sub' => 'Commercial & Retail Capital of Chennai', 'district' => 'Chennai', 'lat' => 13.0418, 'lng' => 80.2341],
    ['label' => 'Anna Nagar', 'sub' => 'North-West Chennai Prime Residential', 'district' => 'Chennai', 'lat' => 13.0850, 'lng' => 80.2101],
    ['label' => 'Mylapore', 'sub' => 'Cultural & Heritage Corridor', 'district' => 'Chennai', 'lat' => 13.0368, 'lng' => 80.2676],
    ['label' => 'Alwarpet', 'sub' => 'Central Chennai Luxury Zone', 'district' => 'Chennai', 'lat' => 13.0336, 'lng' => 80.2505],
    ['label' => 'Nungambakkam', 'sub' => 'Central Business & Diplomatic Hub', 'district' => 'Chennai', 'lat' => 13.0569, 'lng' => 80.2425],
    ['label' => 'Kilpauk', 'sub' => 'Central Chennai Medical & Residential', 'district' => 'Chennai', 'lat' => 13.0784, 'lng' => 80.2412],
    ['label' => 'Thiruvanmiyur', 'sub' => 'ECR Starting Junction & Coastal Belt', 'district' => 'Chennai', 'lat' => 12.9830, 'lng' => 80.2594],
    ['label' => 'Perungudi', 'sub' => 'OMR IT Corridor & Express Highway', 'district' => 'Chennai', 'lat' => 12.9654, 'lng' => 80.2461],
    ['label' => 'Sholinganallur', 'sub' => 'OMR IT Expressway Major Junction', 'district' => 'Chennai', 'lat' => 12.9010, 'lng' => 80.2279],
    ['label' => 'Thoraipakkam', 'sub' => 'OMR Radial Road Junction', 'district' => 'Chennai', 'lat' => 12.9427, 'lng' => 80.2376],
    ['label' => 'Navalur', 'sub' => 'OMR IT Hub & Marina Mall Corridor', 'district' => 'Chengalpattu', 'lat' => 12.8450, 'lng' => 80.2260],
    ['label' => 'Siruseri', 'sub' => 'SIPCOT IT Park & Residential Belt', 'district' => 'Chengalpattu', 'lat' => 12.8250, 'lng' => 80.2180],
    ['label' => 'Kelambakkam', 'sub' => 'OMR - Vandalur Link Road Hub', 'district' => 'Chengalpattu', 'lat' => 12.7844, 'lng' => 80.2201],
    ['label' => 'Thiruporur', 'sub' => 'OMR Southern Growth Hub', 'district' => 'Chengalpattu', 'lat' => 12.7230, 'lng' => 80.1900],
    ['label' => 'Medavakkam', 'sub' => 'Tambaram - Velachery Link Junction', 'district' => 'Chengalpattu', 'lat' => 12.9190, 'lng' => 80.1910],
    ['label' => 'Perumbakkam', 'sub' => 'OMR Link Road Growth Corridor', 'district' => 'Chengalpattu', 'lat' => 12.8990, 'lng' => 80.1940],
    ['label' => 'Chromepet', 'sub' => 'GST Road Commercial & Transit Hub', 'district' => 'Chengalpattu', 'lat' => 12.9516, 'lng' => 80.1462],
    ['label' => 'Pallavaram', 'sub' => 'Airport Proximity & GST Highway', 'district' => 'Chengalpattu', 'lat' => 12.9675, 'lng' => 80.1491],
    ['label' => 'Selaiyur', 'sub' => 'Tambaram East Residential Corridor', 'district' => 'Chengalpattu', 'lat' => 12.9160, 'lng' => 80.1430],
    ['label' => 'Chitlapakkam', 'sub' => 'Lake View Residential Belt', 'district' => 'Chengalpattu', 'lat' => 12.9360, 'lng' => 80.1420],
    ['label' => 'Madambakkam', 'sub' => 'Heritage Temple & Residential Zone', 'district' => 'Chengalpattu', 'lat' => 12.9020, 'lng' => 80.1600],
    ['label' => 'Sembakkam', 'sub' => 'Velachery - Tambaram Road Belt', 'district' => 'Chengalpattu', 'lat' => 12.9230, 'lng' => 80.1620],
    ['label' => 'Mudichur', 'sub' => 'Tambaram - Sriperumbudur Link Road', 'district' => 'Chengalpattu', 'lat' => 12.9100, 'lng' => 80.0700],
    ['label' => 'Perungalathur', 'sub' => 'New Kilambakkam Bus Terminus Gateway', 'district' => 'Chengalpattu', 'lat' => 12.9050, 'lng' => 80.0880],
    ['label' => 'Vandalur', 'sub' => 'Zoological Park & Outer Ring Road Interchange', 'district' => 'Chengalpattu', 'lat' => 12.8900, 'lng' => 80.0810],
    ['label' => 'Urapakkam', 'sub' => 'GST Road Fast-Growing Residential', 'district' => 'Chengalpattu', 'lat' => 12.8680, 'lng' => 80.0720],
    ['label' => 'Guduvanchery', 'sub' => 'GST Road Industrial & Township Hub', 'district' => 'Chengalpattu', 'lat' => 12.8440, 'lng' => 80.0630],
    ['label' => 'Maraimalai Nagar', 'sub' => 'Automotive & Industrial Corridor', 'district' => 'Chengalpattu', 'lat' => 12.7980, 'lng' => 80.0240],
    ['label' => 'Singaperumal Koil', 'sub' => 'Mahindra World City Belt', 'district' => 'Chengalpattu', 'lat' => 12.7630, 'lng' => 80.0030],
    ['label' => 'Chengalpattu Town', 'sub' => 'District Headquarters & Rail Junction', 'district' => 'Chengalpattu', 'lat' => 12.6841, 'lng' => 79.9836],
    ['label' => 'Poonamallee', 'sub' => 'Metro Phase 2 Line 4 Western Hub', 'district' => 'Tiruvallur', 'lat' => 13.0489, 'lng' => 80.0964],
    ['label' => 'Avadi', 'sub' => 'Western Rail Corridor & Municipal Hub', 'district' => 'Tiruvallur', 'lat' => 13.1147, 'lng' => 80.1018],
    ['label' => 'Ambattur', 'sub' => 'Industrial Estate & IT Parks', 'district' => 'Tiruvallur', 'lat' => 13.1143, 'lng' => 80.1548],
    ['label' => 'Mogappair', 'sub' => 'West Chennai Premier Residential', 'district' => 'Chennai', 'lat' => 13.0837, 'lng' => 80.1743],
    ['label' => 'Maduravoyal', 'sub' => 'Elevated Expressway & Bypass Junction', 'district' => 'Chennai', 'lat' => 13.0645, 'lng' => 80.1650],
    ['label' => 'Koyambedu', 'sub' => 'Transit Hub & Metro Interchange', 'district' => 'Chennai', 'lat' => 13.0732, 'lng' => 80.1937],
    ['label' => 'Vadapalani', 'sub' => 'Film City, Metro & Hospital Hub', 'district' => 'Chennai', 'lat' => 13.0500, 'lng' => 80.2121],
    ['label' => 'Sriperumbudur', 'sub' => 'Automobile & Electronics SEZ Corridor', 'district' => 'Kancheepuram', 'lat' => 12.9675, 'lng' => 79.9430],
    ['label' => 'Oragadam', 'sub' => 'Industrial Corridor & SIPCOT Belt', 'district' => 'Kancheepuram', 'lat' => 12.8350, 'lng' => 79.9200],
    ['label' => 'Kancheepuram', 'sub' => 'Silk City & Heritage Capital', 'district' => 'Kancheepuram', 'lat' => 12.8342, 'lng' => 79.7036],
    ['label' => 'Tiruvallur', 'sub' => 'District Headquarters & Western Hub', 'district' => 'Tiruvallur', 'lat' => 13.1433, 'lng' => 79.9079],
    ['label' => 'Coimbatore', 'sub' => 'Manchester of South India • Industrial Hub', 'district' => 'Coimbatore', 'lat' => 11.0168, 'lng' => 76.9558],
    ['label' => 'Madurai', 'sub' => 'Cultural Capital & South Central Hub', 'district' => 'Madurai', 'lat' => 9.9252, 'lng' => 78.1198],
    ['label' => 'Tiruchirappalli', 'sub' => 'Central Hub & Educational Corridor', 'district' => 'Tiruchirappalli', 'lat' => 10.7905, 'lng' => 78.7047],
    ['label' => 'Salem', 'sub' => 'Steel City & Western Express Corridor', 'district' => 'Salem', 'lat' => 11.6643, 'lng' => 78.1460],
    ['label' => 'Hosur', 'sub' => 'EV & Industrial Tech Corridor • Krishnagiri', 'district' => 'Krishnagiri', 'lat' => 12.7409, 'lng' => 77.8253]
];

/**
 * Fallback resolver using curated catalog and Nominatim OpenStreetMap
 */
function fetchFallbackLocalities(string $input, string $district, array $tnCuratedLocalities): array {
    $qLower = strtolower($input);
    $dLower = strtolower($district);
    $results = [];
    $seen = [];

    // 1. First, search curated prominent Tamil Nadu localities
    foreach ($tnCuratedLocalities as $item) {
        $lbl = $item['label'];
        $dist = $item['district'];
        $sub = $item['sub'];
        $matches = str_starts_with(strtolower($lbl), $qLower) || str_contains(strtolower($lbl), $qLower) || str_contains(strtolower($sub), $qLower);

        if ($matches) {
            // Apply district boost if provided
            if (!empty($dLower) && !str_contains(strtolower($dist), $dLower) && !str_contains($dLower, strtolower($dist))) {
                // If query is very specific to the label, keep it even if across district
                if (!str_starts_with(strtolower($lbl), $qLower)) {
                    continue;
                }
            }

            $key = strtolower($lbl);
            if (!isset($seen[$key])) {
                $seen[$key] = true;
                $results[] = [
                    'placeId' => 'cur_' . md5($lbl),
                    'label' => $lbl,
                    'sub' => $sub . ' • ' . $dist,
                    'fullText' => "{$lbl}, {$dist}, Tamil Nadu, India",
                    'types' => ['locality', 'political'],
                    'type' => 'google_place',
                    'icon' => 'explore',
                    'query' => $lbl,
                    'latitude' => $item['lat'],
                    'longitude' => $item['lng']
                ];
            }
        }
    }

    // 2. Second, query OpenStreetMap Nominatim for real-time live geocoded localities
    $nomQuery = urlencode($input . ($district ? ", {$district}" : "") . ", Tamil Nadu, India");
    $url = "https://nominatim.openstreetmap.org/search?q={$nomQuery}&format=json&addressdetails=1&accept-language=en&limit=6";

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_USERAGENT, 'FindAPlotRealEstateMarketplace/2.0 (info@findaplot.in)');
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 3);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200 && $response) {
        $data = json_decode($response, true);
        if (is_array($data)) {
            foreach ($data as $item) {
                $name = $item['name'] ?? '';
                $addr = $item['address'] ?? [];
                $cleanLabel = $name ?: ($addr['suburb'] ?? ($addr['neighbourhood'] ?? ($addr['city_district'] ?? ($addr['town'] ?? ($addr['village'] ?? '')))));
                if (empty($cleanLabel)) continue;

                $key = strtolower($cleanLabel);
                if (isset($seen[$key])) continue;
                $seen[$key] = true;

                $cityOrDist = $addr['city'] ?? ($addr['state_district'] ?? ($addr['county'] ?? ($addr['town'] ?? 'Tamil Nadu')));
                $pincode = $addr['postcode'] ?? '';
                $sub = trim("{$cityOrDist}, Tamil Nadu " . ($pincode ? "• {$pincode}" : ""));

                $results[] = [
                    'placeId' => 'osm_' . ($item['place_id'] ?? uniqid()),
                    'label' => $cleanLabel,
                    'sub' => $sub ?: 'Google Maps Location',
                    'fullText' => $item['display_name'] ?? $cleanLabel,
                    'types' => ['sublocality', 'political', 'geocode'],
                    'type' => 'google_place',
                    'icon' => 'explore',
                    'query' => $cleanLabel,
                    'latitude' => (float)$item['lat'],
                    'longitude' => (float)$item['lon']
                ];
            }
        }
    }

    // 3. Fallback to Photon if Nominatim yielded few results
    if (count($results) < 3) {
        $photonUrl = "https://photon.komoot.io/api/?q=" . urlencode($input) . "&limit=5";
        $ch2 = curl_init($photonUrl);
        curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch2, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch2, CURLOPT_TIMEOUT, 2);
        $photonRes = curl_exec($ch2);
        $httpCode2 = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
        curl_close($ch2);

        if ($httpCode2 === 200 && $photonRes) {
            $pData = json_decode($photonRes, true);
            $features = $pData['features'] ?? [];
            foreach ($features as $f) {
                $props = $f['properties'] ?? [];
                $pName = $props['name'] ?? '';
                if (!$pName) continue;
                $pState = $props['state'] ?? '';
                $pCountry = $props['country'] ?? '';
                if ($pCountry && $pCountry !== 'India') continue;

                $key = strtolower($pName);
                if (isset($seen[$key])) continue;
                $seen[$key] = true;

                $pCity = $props['city'] ?? ($props['district'] ?? ($pState ?: 'Tamil Nadu'));
                $coords = $f['geometry']['coordinates'] ?? [0, 0];

                $results[] = [
                    'placeId' => 'photon_' . ($props['osm_id'] ?? uniqid()),
                    'label' => $pName,
                    'sub' => "{$pCity}, India",
                    'fullText' => "{$pName}, {$pCity}, {$pState}, India",
                    'types' => ['locality', 'political'],
                    'type' => 'google_place',
                    'icon' => 'explore',
                    'query' => $pName,
                    'latitude' => (float)($coords[1] ?? 0),
                    'longitude' => (float)($coords[0] ?? 0)
                ];
            }
        }
    }

    return array_slice($results, 0, 10);
}

if ($action === 'autocomplete') {
    $input = trim($_GET['input'] ?? $_GET['q'] ?? '');
    $district = strtolower(trim($_GET['district'] ?? ''));

    if (mb_strlen($input) < 2) {
        echo json_encode([
            'success' => true,
            'suggestions' => []
        ]);
        exit;
    }

    $url = 'https://places.googleapis.com/v1/places:autocomplete';
    $payload = [
        'input' => $input,
        'includedRegionCodes' => ['in']
    ];

    $districtCoords = [
        'chennai'      => ['latitude' => 13.0827, 'longitude' => 80.2707],
        'chengalpattu' => ['latitude' => 12.6841, 'longitude' => 79.9836],
        'tiruvallur'   => ['latitude' => 13.1433, 'longitude' => 79.9079],
        'kancheepuram' => ['latitude' => 12.8342, 'longitude' => 79.7036]
    ];

    if (!empty($district) && isset($districtCoords[$district])) {
        $payload['locationBias'] = [
            'circle' => [
                'center' => $districtCoords[$district],
                'radius' => 45000.0
            ]
        ];
    }

    $formatted = [];
    $usedSource = 'google_places';

    // Try Google Places API (New) first
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'X-Goog-Api-Key: ' . $apiKey
    ]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 3);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200 && $response) {
        $data = json_decode($response, true);
        $rawSuggestions = $data['suggestions'] ?? [];

        foreach ($rawSuggestions as $s) {
            $pred = $s['placePrediction'] ?? null;
            if (!$pred) continue;

            $placeId = $pred['placeId'] ?? '';
            $mainText = $pred['structuredFormat']['mainText']['text'] ?? ($pred['text']['text'] ?? '');
            $secondaryText = $pred['structuredFormat']['secondaryText']['text'] ?? '';
            $types = $pred['types'] ?? '';

            $formatted[] = [
                'placeId' => $placeId,
                'label' => $mainText,
                'sub' => $secondaryText ?: 'Google Maps Location',
                'fullText' => $pred['text']['text'] ?? $mainText,
                'types' => $types,
                'type' => 'google_place',
                'icon' => 'explore',
                'query' => $mainText
            ];
        }
    }

    // If Google Places API is quota-limited (429), errored, or returned 0 results, fall back seamlessly
    if (empty($formatted)) {
        $formatted = fetchFallbackLocalities($input, $district, $tnCuratedLocalities);
        $usedSource = 'geocoded_places_fallback';
    }

    echo json_encode([
        'success' => true,
        'source' => $usedSource,
        'total' => count($formatted),
        'suggestions' => $formatted
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'details') {
    $placeId = trim($_GET['placeId'] ?? '');
    if (empty($placeId)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'placeId is required']);
        exit;
    }

    // Check if placeId is from our curated or OSM fallback
    if (str_starts_with($placeId, 'cur_') || str_starts_with($placeId, 'osm_') || str_starts_with($placeId, 'photon_')) {
        $query = trim($_GET['query'] ?? $_GET['q'] ?? '');
        // Search curated list
        foreach ($tnCuratedLocalities as $item) {
            if ($placeId === 'cur_' . md5($item['label']) || (strtolower($query) === strtolower($item['label']))) {
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'placeId' => $placeId,
                        'formattedAddress' => "{$item['label']}, {$item['district']}, Tamil Nadu, India",
                        'displayName' => $item['label'],
                        'latitude' => $item['lat'],
                        'longitude' => $item['lng']
                    ]
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }
        }

        // If OSM, fetch coordinates via Nominatim
        if (str_starts_with($placeId, 'osm_')) {
            $osmNumericId = substr($placeId, 4);
            if (is_numeric($osmNumericId)) {
                $nomUrl = "https://nominatim.openstreetmap.org/details?place_id={$osmNumericId}&format=json";
                $ch = curl_init($nomUrl);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_USERAGENT, 'FindAPlotMarketplace/2.0');
                curl_setopt($ch, CURLOPT_TIMEOUT, 3);
                $nomRes = curl_exec($ch);
                curl_close($ch);
                if ($nomRes) {
                    $nd = json_decode($nomRes, true);
                    if (isset($nd['geometry']['coordinates'])) {
                        echo json_encode([
                            'success' => true,
                            'data' => [
                                'placeId' => $placeId,
                                'formattedAddress' => $nd['localname'] ?? 'Tamil Nadu, India',
                                'displayName' => $nd['localname'] ?? '',
                                'latitude' => (float)$nd['geometry']['coordinates'][1],
                                'longitude' => (float)$nd['geometry']['coordinates'][0]
                            ]
                        ], JSON_UNESCAPED_UNICODE);
                        exit;
                    }
                }
            }
        }
    }

    // Try Google Places Details API
    $url = 'https://places.googleapis.com/v1/places/' . urlencode($placeId);
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'X-Goog-Api-Key: ' . $apiKey,
        'X-Goog-FieldMask: id,displayName,location,addressComponents,formattedAddress'
    ]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 4);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200 && $response) {
        $data = json_decode($response, true);
        $loc = $data['location'] ?? null;

        echo json_encode([
            'success' => true,
            'data' => [
                'placeId' => $data['id'] ?? $placeId,
                'formattedAddress' => $data['formattedAddress'] ?? '',
                'displayName' => $data['displayName']['text'] ?? '',
                'latitude' => $loc['latitude'] ?? null,
                'longitude' => $loc['longitude'] ?? null,
                'addressComponents' => $data['addressComponents'] ?? []
            ]
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Graceful fallback for details
    echo json_encode([
        'success' => true,
        'data' => [
            'placeId' => $placeId,
            'formattedAddress' => 'Tamil Nadu, India',
            'displayName' => $_GET['query'] ?? 'Selected Locality',
            'latitude' => 13.0827,
            'longitude' => 80.2707
        ]
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(400);
echo json_encode(['success' => false, 'message' => 'Invalid action']);
