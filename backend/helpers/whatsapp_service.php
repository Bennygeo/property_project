<?php
/**
 * WhatsApp Cloud API Service Helper
 * Dispatches automated outbound OTP messages to users via Meta Graph API.
 */

declare(strict_types=1);

namespace Mannidam\Helpers;

require_once __DIR__ . '/../config/whatsapp.php';

use Mannidam\Config\WhatsAppConfig;

class WhatsAppService {
    /**
     * Send OTP to recipient mobile number via Meta WhatsApp Cloud API
     *
     * @param string $recipientPhone 10-digit or international format phone number
     * @param string $otp 4-digit verification code
     * @return array [ 'success' => bool, 'isConfigured' => bool, 'message' => string, 'details' => mixed ]
     */
    public static function sendOtp(string $recipientPhone, string $otp): array {
        $token = WhatsAppConfig::getAccessToken();
        $phoneId = WhatsAppConfig::getPhoneNumberId();
        $version = WhatsAppConfig::getApiVersion();

        // Format recipient to international format without + or spaces (e.g. 919444100000)
        $clean = preg_replace('/[^\d]/', '', $recipientPhone);
        if (strlen($clean) === 10) {
            $to = '91' . $clean;
        } else {
            $to = $clean;
        }

        // If credentials not yet configured, return informative state
        if (empty($token) || empty($phoneId)) {
            return [
                'success'      => false,
                'isConfigured' => false,
                'message'      => 'Meta WhatsApp credentials pending configuration in backend/config/whatsapp.php',
                'devOtp'       => $otp,
            ];
        }

        $url = "https://graph.facebook.com/{$version}/{$phoneId}/messages";

        $templateName = WhatsAppConfig::getTemplateName();

        if (!empty($templateName)) {
            // Send via approved Meta Template
            $payload = [
                'messaging_product' => 'whatsapp',
                'recipient_type'    => 'individual',
                'to'                => $to,
                'type'              => 'template',
                'template'          => [
                    'name'     => $templateName,
                    'language' => [
                        'code' => 'en_US'
                    ],
                    'components' => [
                        [
                            'type'       => 'body',
                            'parameters' => [
                                ['type' => 'text', 'text' => $otp]
                            ]
                        ],
                        [
                            'type'       => 'button',
                            'sub_type'   => 'url',
                            'index'      => '0',
                            'parameters' => [
                                ['type' => 'text', 'text' => $otp]
                            ]
                        ]
                    ]
                ]
            ];
        } else {
            // Direct text message notification
            $messageBody = "Your Find a Plot verification code is: *{$otp}*\n\nValid for 10 minutes. Please enter this code on the website to complete your sign in.\n\nDo not share this code with anyone.";
            $payload = [
                'messaging_product' => 'whatsapp',
                'recipient_type'    => 'individual',
                'to'                => $to,
                'type'              => 'text',
                'text'              => [
                    'preview_url' => false,
                    'body'        => $messageBody
                ]
            ];
        }

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $token,
            'Content-Type: application/json'
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr  = curl_error($ch);
        curl_close($ch);

        if ($curlErr) {
            return [
                'success'      => false,
                'isConfigured' => true,
                'message'      => 'cURL error connecting to Meta WhatsApp API: ' . $curlErr,
                'devOtp'       => $otp,
            ];
        }

        $json = json_decode((string)$response, true);

        if ($httpCode >= 200 && $httpCode < 300 && !empty($json['messages'][0]['id'])) {
            return [
                'success'      => true,
                'isConfigured' => true,
                'messageId'    => $json['messages'][0]['id'],
                'message'      => "Verification code sent to WhatsApp number (+{$to})"
            ];
        }

        $errorMsg = $json['error']['message'] ?? ('HTTP ' . $httpCode);
        return [
            'success'      => false,
            'isConfigured' => true,
            'message'      => 'Meta WhatsApp API error: ' . $errorMsg,
            'details'      => $json,
            'devOtp'       => $otp,
        ];
    }
}

