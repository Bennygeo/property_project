<?php
/**
 * Mannidam Real Estate Marketplace - Google Places Autocomplete & Details Proxy
 * Uses the latest Google Places API (New) to provide autocomplete suggestions and geocoded coordinates.
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

$apiKey = 'AIzaSyDVb2t2T8hRHrH-sOnFohmtrcwCRsvkbcw';
$action = $_GET['action'] ?? 'autocomplete';

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
                'radius' => 40000.0
            ]
        ];
    }

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'X-Goog-Api-Key: ' . $apiKey
    ]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 4);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200 || !$response) {
        echo json_encode([
            'success' => false,
            'message' => 'Places API error or timeout',
            'suggestions' => []
        ]);
        exit;
    }

    $data = json_decode($response, true);
    $rawSuggestions = $data['suggestions'] ?? [];
    $formatted = [];

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

    echo json_encode([
        'success' => true,
        'source' => 'google_places',
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

    if ($httpCode !== 200 || !$response) {
        echo json_encode(['success' => false, 'message' => 'Failed to fetch place details']);
        exit;
    }

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

http_response_code(400);
echo json_encode(['success' => false, 'message' => 'Invalid action']);

