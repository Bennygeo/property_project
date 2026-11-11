<?php
/**
 * /api/admin/settings.php
 * Platform settings management (WhatsApp Business number, Free AI Agent auto-reply configuration).
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/settings.php';
require_once __DIR__ . '/../../helpers/free_agent_reply.php';
require_once __DIR__ . '/../../helpers/meta_whatsapp.php';

use Mannidam\Config\Database;
use Mannidam\Helpers\Response;
use Mannidam\Helpers\Settings;
use Mannidam\Helpers\FreeAgentReply;
use Mannidam\Helpers\MetaWhatsApp;

Response::initCors();

$method = $_SERVER['REQUEST_METHOD'];
$db = (new Database())->getConnection();

if ($method === 'GET') {
    $settings = Settings::getAll();
    $fullNumber = Settings::getWhatsAppFullNumber();

    $host = $_SERVER['HTTP_HOST'] ?? 'onenewstory.in';
    $scheme = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https' : 'https';
    $webhookUrl = "{$scheme}://{$host}/p_demo_5/backend/api/webhooks/whatsapp.php";

    Response::success([
        'settings'          => $settings,
        'fullWhatsAppNumber'=> $fullNumber,
        'metaConfig'        => [
            'phoneNumberId'   => Settings::get('meta_whatsapp_phone_number_id', ''),
            'wabaId'          => Settings::get('meta_whatsapp_waba_id', ''),
            'isTokenConfigured'=> !empty(Settings::get('meta_whatsapp_access_token', '')),
            'verifyToken'     => Settings::get('meta_whatsapp_verify_token', 'findaplot_meta_token_77'),
            'apiVersion'      => Settings::get('meta_whatsapp_api_version', 'v19.0'),
            'webhookUrl'      => $webhookUrl,
            'isLive'          => MetaWhatsApp::isConfigured()
        ],
        'availableAgents'   => [
            [
                'id'          => 'cadastral_concierge',
                'name'        => 'Cadastral & Legal Concierge Agent',
                'description' => 'Focuses on DTCP/RERA approvals, clear Patta title deeds, survey boundaries & nil encumbrance.',
                'badge'       => 'Legal & Due Diligence'
            ],
            [
                'id'          => 'investment_advisor',
                'name'        => 'Land Investment & ROI Advisor',
                'description' => 'Highlights price per sq.ft., projected appreciation, infrastructure corridor growth & plot liquidity.',
                'badge'       => 'Wealth & ROI'
            ],
            [
                'id'          => 'fast_concierge',
                'name'        => 'Express Concierge & Visit Scheduler',
                'description' => 'Immediate warm response offering free chauffeur cab booking for on-site plot visits.',
                'badge'       => 'Instant Response'
            ]
        ],
        'availableModels'   => [
            [
                'id'          => 'local_real_estate_ai',
                'name'        => 'Local Real Estate Agent AI',
                'description' => 'Instant deterministic land advisor with zero network latency & 100% uptime. Zero API key required.',
                'isFree'      => true
            ],
            [
                'id'          => 'pollinations_free',
                'name'        => 'Pollinations Open-Source LLM',
                'description' => 'Free conversational AI agent running open-source LLMs without API key or usage limits.',
                'isFree'      => true
            ]
        ]
    ], 'Settings retrieved successfully');
}

if ($method === 'POST') {
    $raw = file_get_contents('php://input');
    $input = !empty($raw) ? json_decode($raw, true) : [];
    $action = $input['action'] ?? 'update_settings';

    // 1. UPDATE SETTINGS
    if ($action === 'update_settings') {
        $whatsappNumber = preg_replace('/[^\d]/', '', (string)($input['whatsapp_number'] ?? ''));
        $countryCode    = preg_replace('/[^\d]/', '', (string)($input['whatsapp_country_code'] ?? '91'));
        $displayName    = trim((string)($input['whatsapp_display_name'] ?? 'Find a Plot Concierge Desk'));
        $agentPersona   = trim((string)($input['whatsapp_auto_reply_agent'] ?? 'cadastral_concierge'));
        $agentModel     = trim((string)($input['whatsapp_free_agent_model'] ?? 'local_real_estate_ai'));
        $template       = trim((string)($input['whatsapp_auto_reply_template'] ?? ''));

        if (!empty($whatsappNumber)) {
            Settings::set('whatsapp_number', $whatsappNumber, 'whatsapp', 'Primary business WhatsApp mobile number');
        }
        if (!empty($countryCode)) {
            Settings::set('whatsapp_country_code', $countryCode, 'whatsapp', 'Country dialing code');
        }
        if (!empty($displayName)) {
            Settings::set('whatsapp_display_name', $displayName, 'whatsapp', 'Display title on WhatsApp interactions');
        }

        if (array_key_exists('whatsapp_auto_reply_enabled', $input)) {
            $val = $input['whatsapp_auto_reply_enabled'];
            $autoReplyOn = ($val === true || $val === '1' || $val === 1 || $val === 'true') ? '1' : '0';
            Settings::set('whatsapp_auto_reply_enabled', $autoReplyOn, 'whatsapp', 'AI free agent auto-reply toggle');
        }

        if (!empty($agentPersona)) {
            Settings::set('whatsapp_auto_reply_agent', $agentPersona, 'whatsapp', 'Active agent persona');
        }
        if (!empty($agentModel)) {
            Settings::set('whatsapp_free_agent_model', $agentModel, 'whatsapp', 'Free AI model engine');
        }
        if (!empty($template)) {
            Settings::set('whatsapp_auto_reply_template', $template, 'whatsapp', 'Default auto-reply template');
        }

        // Synchronize default whatsapp_url in properties table if number changed
        $fullNumber = Settings::getWhatsAppFullNumber();
        if (!empty($fullNumber)) {
            try {
                $db->query("
                    UPDATE properties 
                    SET whatsapp_url = CONCAT('https://wa.me/{$fullNumber}?text=', urlencode(CONCAT('Hi Find a Plot, I am interested in ', title)))
                    WHERE whatsapp_url LIKE 'https://wa.me/%' OR whatsapp_url IS NULL OR whatsapp_url = ''
                ");
            } catch (\Throwable $e) {}
        }

        Response::success([
            'settings'          => Settings::getAll(),
            'fullWhatsAppNumber'=> Settings::getWhatsAppFullNumber()
        ], 'WhatsApp configuration and Free Agent settings saved successfully');
    }

    // 2. TEST AGENT AUTO-REPLY
    if ($action === 'test_agent_reply') {
        $result = FreeAgentReply::generate([
            'name'       => $input['name'] ?? 'Investor Preview',
            'phone'      => $input['phone'] ?? '9486140936',
            'message'    => $input['message'] ?? 'Can you share the DTCP approval and road width for this plot?',
            'propertyId' => $input['propertyId'] ?? 'PRJ-0059',
            'persona'    => $input['persona'] ?? Settings::get('whatsapp_auto_reply_agent', 'cadastral_concierge'),
            'model'      => $input['model'] ?? Settings::get('whatsapp_free_agent_model', 'local_real_estate_ai'),
            'template'   => $input['template'] ?? null
        ]);

        Response::success($result, 'Agent auto-reply preview generated');
    }

    // 3. GENERATE & SAVE AUTO-REPLY FOR A SPECIFIC LEAD
    if ($action === 'generate_lead_reply') {
        $leadId = (int)($input['leadId'] ?? 0);
        if ($leadId <= 0) {
            Response::error('Invalid leadId');
        }

        $stmt = $db->prepare("SELECT * FROM inquiries_and_visits WHERE id = ?");
        $stmt->execute([$leadId]);
        $lead = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$lead) {
            Response::error('Lead not found');
        }

        $result = FreeAgentReply::generate([
            'name'       => $lead['contact_name'],
            'phone'      => $lead['contact_phone'],
            'message'    => $lead['notes'] ?? 'Interested in plot details',
            'propertyId' => $lead['property_id'],
            'persona'    => $input['persona'] ?? Settings::get('whatsapp_auto_reply_agent', 'cadastral_concierge'),
            'model'      => $input['model'] ?? Settings::get('whatsapp_free_agent_model', 'local_real_estate_ai')
        ]);

        // Save auto-reply to database
        $upStmt = $db->prepare("UPDATE inquiries_and_visits SET auto_reply_text = ?, auto_reply_sent_at = NOW() WHERE id = ?");
        $upStmt->execute([$result['reply'], $leadId]);

        $cleanPhone = preg_replace('/[^\d]/', '', $lead['contact_phone']);
        $encodedText = urlencode($result['reply']);
        $waDirectUrl = "https://wa.me/{$cleanPhone}?text={$encodedText}";

        Response::success([
            'leadId'        => $leadId,
            'autoReplyText' => $result['reply'],
            'whatsappUrl'   => $waDirectUrl,
            'agentName'     => $result['agentName'],
            'modelUsed'     => $result['modelUsed']
        ], 'AI Auto-reply generated and attached to inquiry');
    }

    // 4. UPDATE META WHATSAPP CLOUD API CREDENTIALS
    if ($action === 'update_meta_settings') {
        $phoneId = trim((string)($input['phoneNumberId'] ?? ''));
        $wabaId  = trim((string)($input['wabaId'] ?? ''));
        $token   = trim((string)($input['accessToken'] ?? ''));
        $vToken  = trim((string)($input['verifyToken'] ?? ''));
        $version = trim((string)($input['apiVersion'] ?? 'v19.0'));

        if (!empty($phoneId)) {
            Settings::set('meta_whatsapp_phone_number_id', $phoneId, 'whatsapp_meta', 'Meta Phone Number ID');
        }
        if (!empty($wabaId)) {
            Settings::set('meta_whatsapp_waba_id', $wabaId, 'whatsapp_meta', 'Meta WABA ID');
        }
        if (!empty($token)) {
            Settings::set('meta_whatsapp_access_token', $token, 'whatsapp_meta', 'Meta System User Access Token');
        }
        if (!empty($vToken)) {
            Settings::set('meta_whatsapp_verify_token', $vToken, 'whatsapp_meta', 'Meta Webhook Verify Token');
        }
        if (!empty($version)) {
            Settings::set('meta_whatsapp_api_version', $version, 'whatsapp_meta', 'Meta Graph API version');
        }

        Response::success([
            'phoneNumberId'   => Settings::get('meta_whatsapp_phone_number_id'),
            'wabaId'          => Settings::get('meta_whatsapp_waba_id'),
            'isTokenConfigured'=> !empty(Settings::get('meta_whatsapp_access_token')),
            'verifyToken'     => Settings::get('meta_whatsapp_verify_token', 'findaplot_meta_token_77'),
            'apiVersion'      => Settings::get('meta_whatsapp_api_version', 'v19.0'),
            'isLive'          => MetaWhatsApp::isConfigured()
        ], 'Meta WhatsApp Business Cloud API settings saved successfully');
    }

    // 5. TEST META WHATSAPP OUTBOUND MESSAGE
    if ($action === 'test_meta_api') {
        $testPhone = trim((string)($input['testPhone'] ?? '9486140936'));
        $testMsg   = trim((string)($input['message'] ?? 'Find a Plot: Meta WhatsApp Cloud API connection test successful! ✅'));

        if (!MetaWhatsApp::isConfigured()) {
            Response::error('Meta credentials incomplete. Please configure Phone Number ID and Access Token.');
        }

        $res = MetaWhatsApp::sendTextMessage($testPhone, $testMsg);
        if ($res['success']) {
            Response::success($res, 'Test WhatsApp message sent successfully via Meta Cloud API!');
        } else {
            Response::error('Meta Cloud API test failed: ' . ($res['error'] ?? 'Unknown error'), 400, $res);
        }
    }

    Response::error('Invalid action');
}
