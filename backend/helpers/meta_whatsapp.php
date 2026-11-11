<?php
/**
 * Mannidam Real Estate Marketplace - Meta WhatsApp Business Cloud API Helper
 * Handles official outbound message delivery and API interactions.
 */

declare(strict_types=1);

namespace Mannidam\Helpers;

class MetaWhatsApp {
    /**
     * Check if Meta WhatsApp Cloud API credentials are configured.
     */
    public static function isConfigured(): bool {
        $phoneId = trim(Settings::get('meta_whatsapp_phone_number_id', ''));
        $token   = trim(Settings::get('meta_whatsapp_access_token', ''));
        return !empty($phoneId) && !empty($token);
    }

    /**
     * Send a direct text message to a WhatsApp user via Meta Cloud API.
     */
    public static function sendTextMessage(string $toPhone, string $message): array {
        $phoneId = trim(Settings::get('meta_whatsapp_phone_number_id', ''));
        $token   = trim(Settings::get('meta_whatsapp_access_token', ''));
        $version = trim(Settings::get('meta_whatsapp_api_version', 'v19.0')) ?: 'v19.0';

        if (empty($phoneId) || empty($token)) {
            return [
                'success' => false,
                'error'   => 'Meta WhatsApp Cloud API credentials not configured (Phone Number ID or Access Token missing).'
            ];
        }

        // Clean phone number (format to E.164 without plus sign)
        $cleanPhone = preg_replace('/[^\d]/', '', $toPhone);
        if (strlen($cleanPhone) === 10) {
            $defaultCc = preg_replace('/[^\d]/', '', Settings::get('whatsapp_country_code', '91'));
            $cleanPhone = $defaultCc . $cleanPhone;
        }

        $url = "https://graph.facebook.com/{$version}/{$phoneId}/messages";
        $payload = [
            'messaging_product' => 'whatsapp',
            'recipient_type'    => 'individual',
            'to'                => $cleanPhone,
            'type'              => 'text',
            'text'              => [
                'preview_url' => false,
                'body'        => $message
            ]
        ];

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Authorization: Bearer {$token}",
            "Content-Type: application/json"
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

        $responseRaw = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($responseRaw === false) {
            return [
                'success' => false,
                'error'   => "Curl request failed: {$curlError}"
            ];
        }

        $data = json_decode($responseRaw, true);

        if ($httpCode >= 200 && $httpCode < 300 && !empty($data['messages'][0]['id'])) {
            return [
                'success'   => true,
                'messageId' => $data['messages'][0]['id'],
                'data'      => $data
            ];
        }

        $metaErrorMsg = $data['error']['message'] ?? "Meta API returned HTTP {$httpCode}";
        return [
            'success'   => false,
            'httpCode'  => $httpCode,
            'error'     => $metaErrorMsg,
            'details'   => $data['error'] ?? null
        ];
    }
}

