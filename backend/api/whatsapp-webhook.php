<?php
/**
 * /api/whatsapp-webhook.php
 * Official Meta WhatsApp Business Cloud API Webhook.
 * Handles challenge verification (GET) and real-time incoming messages & auto-replies (POST).
 */

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/settings.php';
require_once __DIR__ . '/../helpers/free_agent_reply.php';
require_once __DIR__ . '/../helpers/meta_whatsapp.php';

use Mannidam\Config\Database;
use Mannidam\Helpers\Settings;
use Mannidam\Helpers\FreeAgentReply;
use Mannidam\Helpers\MetaWhatsApp;

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// ============================================================================
// 1. WEBHOOK VERIFICATION (GET) - Initiated by Meta App Dashboard
// ============================================================================
if ($method === 'GET') {
    // Meta sends hub.mode, hub.verify_token, hub.challenge
    // In PHP, dots in query params are converted to underscores in $_GET
    $mode        = $_GET['hub_mode'] ?? $_GET['hub.mode'] ?? $_REQUEST['hub_mode'] ?? $_REQUEST['hub.mode'] ?? '';
    $verifyToken = $_GET['hub_verify_token'] ?? $_GET['hub.verify_token'] ?? $_REQUEST['hub_verify_token'] ?? $_REQUEST['hub.verify_token'] ?? '';
    $challenge   = $_GET['hub_challenge'] ?? $_GET['hub.challenge'] ?? $_REQUEST['hub_challenge'] ?? $_REQUEST['hub.challenge'] ?? '';

    $expectedToken = Settings::get('meta_whatsapp_verify_token', 'findaplot_meta_token_77');

    // Accept if matching expected token or default token
    $isValid = ($mode === 'subscribe') && !empty($verifyToken) && (
        $verifyToken === $expectedToken ||
        $verifyToken === 'findaplot_meta_token_77'
    );

    if ($isValid && !empty($challenge)) {
        http_response_code(200);
        header('Content-Type: text/plain; charset=utf-8');
        echo $challenge;
        exit;
    }

    http_response_code(403);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Forbidden: Invalid verification token';
    exit;
}

// ============================================================================
// 2. INCOMING WHATSAPP MESSAGES & EVENTS (POST)
// ============================================================================
if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = !empty($rawInput) ? json_decode($rawInput, true) : null;

    // Immediately acknowledge Meta with 200 OK
    http_response_code(200);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'EVENT_RECEIVED';

    if (!$data || empty($data['entry'])) {
        exit;
    }

    try {
        $db = (new Database())->getConnection();
        $businessNumber = Settings::getWhatsAppFullNumber();
        $isAutoReplyOn = Settings::get('whatsapp_auto_reply_enabled', '1') === '1';

        foreach ($data['entry'] as $entry) {
            $changes = $entry['changes'] ?? [];
            foreach ($changes as $change) {
                $value = $change['value'] ?? [];
                
                // Process incoming messages
                if (!empty($value['messages'])) {
                    $contact = $value['contacts'][0] ?? [];
                    $senderName = $contact['profile']['name'] ?? 'WhatsApp Buyer';

                    foreach ($value['messages'] as $msg) {
                        $senderPhone = $msg['from'] ?? '';
                        $msgType     = $msg['type'] ?? 'text';
                        $msgText     = '';

                        if ($msgType === 'text') {
                            $msgText = trim($msg['text']['body'] ?? '');
                        } elseif ($msgType === 'interactive') {
                            $msgText = $msg['interactive']['button_reply']['title'] 
                                    ?? $msg['interactive']['list_reply']['title'] 
                                    ?? 'Interactive response';
                        } elseif ($msgType === 'button') {
                            $msgText = $msg['button']['text'] ?? 'Button click';
                        } else {
                            $msgText = "[{$msgType} message received]";
                        }

                        if (empty($senderPhone) || empty($msgText)) {
                            continue;
                        }

                        // Clean phone number
                        $cleanPhone = preg_replace('/[^\d]/', '', $senderPhone);

                        // Find or create lead in inquiries_and_visits
                        $stmt = $db->prepare("SELECT id, property_id FROM inquiries_and_visits WHERE contact_phone = ? OR contact_phone LIKE ? ORDER BY id DESC LIMIT 1");
                        $stmt->execute([$cleanPhone, "%" . substr($cleanPhone, -10) . "%"]);
                        $lead = $stmt->fetch(PDO::FETCH_ASSOC);

                        $leadId = null;
                        $propertyId = null;

                        if ($lead) {
                            $leadId = (int)$lead['id'];
                            $propertyId = $lead['property_id'];
                        } else {
                            // Find fallback property
                            $fallback = $db->query("SELECT id FROM properties LIMIT 1")->fetch(PDO::FETCH_ASSOC);
                            $propertyId = $fallback['id'] ?? 'PRJ-0059';

                            $cStmt = $db->prepare("
                                INSERT INTO inquiries_and_visits (property_id, user_id, lead_type, contact_name, contact_phone, notes, status, created_at)
                                VALUES (?, 104, 'whatsapp_concierge', ?, ?, ?, 'new', NOW())
                            ");
                            $cStmt->execute([$propertyId, $senderName, $cleanPhone, $msgText]);
                            $leadId = (int)$db->lastInsertId();
                        }

                        // Log incoming user message into whatsapp_chat_messages
                        $ins = $db->prepare("
                            INSERT INTO whatsapp_chat_messages 
                            (lead_id, property_id, user_phone, business_phone, sender_type, sender_name, message_text, is_auto_reply, created_at)
                            VALUES (?, ?, ?, ?, 'user', ?, ?, 0, NOW())
                        ");
                        $ins->execute([$leadId, $propertyId, $cleanPhone, $businessNumber, $senderName, $msgText]);

                        // Free AI Agent Auto-Reply (if enabled)
                        if ($isAutoReplyOn) {
                            $agentRes = FreeAgentReply::generate([
                                'name'       => $senderName,
                                'phone'      => $cleanPhone,
                                'message'    => $msgText,
                                'propertyId' => $propertyId
                            ]);
                            $autoReplyText = $agentRes['reply'] ?? '';
                            $agentName     = $agentRes['agentName'] ?? 'Find a Plot AI Concierge';

                            if (!empty($autoReplyText)) {
                                // Send back via Meta WhatsApp Cloud API
                                if (MetaWhatsApp::isConfigured()) {
                                    MetaWhatsApp::sendTextMessage($cleanPhone, $autoReplyText);
                                }

                                // Log auto-reply to thread
                                $db->prepare("
                                    INSERT INTO whatsapp_chat_messages 
                                    (lead_id, property_id, user_phone, business_phone, sender_type, sender_name, message_text, is_auto_reply, created_at)
                                    VALUES (?, ?, ?, ?, 'ai_agent', ?, ?, 1, DATE_ADD(NOW(), INTERVAL 1 SECOND))
                                ")->execute([$leadId, $propertyId, $cleanPhone, $businessNumber, $agentName, $autoReplyText]);

                                // Update lead record
                                $db->prepare("
                                    UPDATE inquiries_and_visits 
                                    SET auto_reply_text = ?, auto_reply_sent_at = NOW(), status = 'contacted'
                                    WHERE id = ?
                                ")->execute([$autoReplyText, $leadId]);
                            }
                        }
                    }
                }
            }
        }
    } catch (\Throwable $e) {
        error_log("WhatsApp Webhook Error: " . $e->getMessage());
    }

    exit;
}

