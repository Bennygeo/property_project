<?php
/**
 * ElevenLabs Human-Like TTS & Voice Cloning Endpoint with Lip-Sync Timestamps
 * POST /backend/api/tts/elevenlabs.php
 */

declare(strict_types=1);

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/elevenlabs.php';

use Mannidam\Helpers\Response;
use Mannidam\Config\ElevenLabsConfig;

Response::initCors();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    Response::error('Method not allowed. Use POST.', 405);
}

$input = Response::getJsonInput();
$text = trim((string)($input['text'] ?? ''));
$voiceId = trim((string)($input['voiceId'] ?? '')) ?: ElevenLabsConfig::getDefaultVoiceId();
$modelId = trim((string)($input['modelId'] ?? '')) ?: ElevenLabsConfig::getDefaultModelId();
$clientApiKey = trim((string)($input['apiKey'] ?? ''));
$apiKey = $clientApiKey !== '' ? $clientApiKey : ElevenLabsConfig::getApiKey();

if ($text === '') {
    Response::error('Text script is required for speech generation.', 400);
}

// Limit text length to reasonable 10-30 second narration (~750 chars max)
if (mb_strlen($text) > 900) {
    $text = mb_substr($text, 0, 900);
}

if ($apiKey === '') {
    Response::error('ElevenLabs API key is not configured on server or client.', 400, [
        'fallbackRequired' => true
    ]);
}

// Check server-side disk cache so we don't re-bill identical property scripts
$cacheDir = __DIR__ . '/../../uploads/tts';
if (!is_dir($cacheDir)) {
    @mkdir($cacheDir, 0775, true);
}

$cacheKey = md5($voiceId . '|' . $modelId . '|' . $text);
$cacheFile = $cacheDir . '/tts_' . $cacheKey . '.json';

if (is_file($cacheFile)) {
    $cachedRaw = @file_get_contents($cacheFile);
    if ($cachedRaw !== false) {
        $cachedData = json_decode($cachedRaw, true);
        if (is_array($cachedData) && !empty($cachedData['audioBase64'])) {
            Response::success([
                'audioBase64' => $cachedData['audioBase64'],
                'alignment'   => $cachedData['alignment'] ?? null,
                'voiceId'     => $voiceId,
                'cached'      => true
            ], 'Loaded from TTS cache');
        }
    }
}

// Call ElevenLabs with-timestamps endpoint for accurate lip-sync
$endpoint = "https://api.elevenlabs.io/v1/text-to-speech/" . rawurlencode($voiceId) . "/with-timestamps";

$payload = json_encode([
    'text' => $text,
    'model_id' => $modelId,
    'voice_settings' => [
        'stability' => 0.50,
        'similarity_boost' => 0.80,
        'style' => 0.35,
        'use_speaker_boost' => true
    ]
]);

$ch = curl_init($endpoint);
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 25,
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'Accept: application/json',
        'xi-api-key: ' . $apiKey
    ]
]);

$responseBody = curl_exec($ch);
$httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr = curl_error($ch);
curl_close($ch);

if ($responseBody === false || $httpCode >= 400) {
    Response::error(
        'ElevenLabs TTS request failed (HTTP ' . $httpCode . ')',
        $httpCode >= 400 ? $httpCode : 502,
        [
            'curlError' => $curlErr,
            'providerResponse' => $responseBody ? json_decode($responseBody, true) : null,
            'fallbackRequired' => true
        ]
    );
}

$decoded = json_decode($responseBody, true);
if (!is_array($decoded) || empty($decoded['audio_base64'])) {
    Response::error('Unexpected response format from ElevenLabs.', 502, [
        'fallbackRequired' => true
    ]);
}

$resultData = [
    'audioBase64' => $decoded['audio_base64'],
    'alignment'   => $decoded['alignment'] ?? ($decoded['normalized_alignment'] ?? null),
    'voiceId'     => $voiceId,
    'cached'      => false
];

// Save to cache
@file_put_contents($cacheFile, json_encode($resultData, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));

Response::success($resultData, 'Generated speech via ElevenLabs');

