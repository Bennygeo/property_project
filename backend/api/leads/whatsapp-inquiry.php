<?php
/**
 * /api/leads/whatsapp-inquiry.php
 * Logs WhatsApp concierge inquiry and returns direct wa.me link with prefilled text.
 * Integrates Free Agent Auto-Reply engine and dynamic business WhatsApp number.
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/settings.php';
require_once __DIR__ . '/../../helpers/free_agent_reply.php';

use Mannidam\Config\Database;
use Mannidam\Helpers\Response;
use Mannidam\Helpers\Settings;
use Mannidam\Helpers\FreeAgentReply;

Response::initCors();

$method = $_SERVER['REQUEST_METHOD'];
$db = (new Database())->getConnection();

if ($method === 'POST') {
    $raw = file_get_contents('php://input');
    $input = !empty($raw) ? json_decode($raw, true) : [];

    $propertyId   = trim((string)($input['propertyId'] ?? ''));
    $contactName  = trim((string)($input['contactName'] ?? 'Verified Buyer'));
    $contactPhone = trim((string)($input['contactPhone'] ?? '9486140936'));
    $contactEmail = trim((string)($input['contactEmail'] ?? ''));
    $message      = trim((string)($input['message'] ?? 'Inquiry initiated via website WhatsApp button'));
    $userId       = !empty($input['userId']) ? (int)$input['userId'] : null;

    // Check if property exists
    $propTitle = 'Direct Marketplace Inquiry';
    if (!empty($propertyId)) {
        $stmt = $db->prepare("SELECT id, title, locality_name, city_name, price FROM properties WHERE id = ?");
        $stmt->execute([$propertyId]);
        $prop = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($prop) {
            $propTitle = $prop['title'];
        } else {
            $fallback = $db->query("SELECT id, title FROM properties LIMIT 1")->fetch(PDO::FETCH_ASSOC);
            if ($fallback) {
                $propertyId = $fallback['id'];
                $propTitle = $fallback['title'];
            }
        }
    } else {
        $fallback = $db->query("SELECT id, title FROM properties LIMIT 1")->fetch(PDO::FETCH_ASSOC);
        if ($fallback) {
            $propertyId = $fallback['id'];
            $propTitle = $fallback['title'];
        }
    }

    // Check if Free Agent Auto-reply is enabled
    $autoReplyText = null;
    $autoReplySentAt = null;
    $isAutoReplyOn = Settings::get('whatsapp_auto_reply_enabled', '1') === '1';

    if ($isAutoReplyOn) {
        $agentRes = FreeAgentReply::generate([
            'name'       => $contactName,
            'phone'      => $contactPhone,
            'message'    => $message,
            'propertyId' => $propertyId
        ]);
        $autoReplyText = $agentRes['reply'] ?? null;
        if ($autoReplyText) {
            $autoReplySentAt = date('Y-m-d H:i:s');
        }
    }

    $insStmt = $db->prepare("
        INSERT INTO inquiries_and_visits 
        (property_id, user_id, lead_type, contact_name, contact_phone, contact_email, notes, auto_reply_text, auto_reply_sent_at, status, created_at)
        VALUES (?, ?, 'whatsapp_concierge', ?, ?, ?, ?, ?, ?, 'new', NOW())
    ");
    $insStmt->execute([
        $propertyId,
        $userId,
        $contactName,
        $contactPhone,
        $contactEmail ?: null,
        $message,
        $autoReplyText,
        $autoReplySentAt
    ]);
    $leadId = (int)$db->lastInsertId();

    // Log initial messages to whatsapp_chat_messages thread
    $businessPhone = Settings::getWhatsAppFullNumber();
    try {
        $db->prepare("
            INSERT INTO whatsapp_chat_messages (lead_id, property_id, user_phone, business_phone, sender_type, sender_name, message_text, is_auto_reply, created_at)
            VALUES (?, ?, ?, ?, 'user', ?, ?, 0, NOW())
        ")->execute([$leadId, $propertyId, $contactPhone, $businessPhone, $contactName, $message]);

        if (!empty($autoReplyText)) {
            $db->prepare("
                INSERT INTO whatsapp_chat_messages (lead_id, property_id, user_phone, business_phone, sender_type, sender_name, message_text, is_auto_reply, created_at)
                VALUES (?, ?, ?, ?, 'ai_agent', 'Find a Plot AI Concierge', ?, 1, DATE_ADD(NOW(), INTERVAL 2 SECOND))
            ")->execute([$leadId, $propertyId, $contactPhone, $businessPhone, $autoReplyText]);
        }
    } catch (\Throwable $e) {}

    $waText = urlencode("Hi Find a Plot, I am interested in {$propTitle} (Ref: {$propertyId}). Please share the verified Patta & TNRERA dossier.");
    $waUrl = "https://wa.me/{$businessPhone}?text={$waText}";

    Response::success([
        'leadId'        => $leadId,
        'propertyId'    => $propertyId,
        'propertyTitle' => $propTitle,
        'whatsappUrl'   => $waUrl,
        'autoReplyText' => $autoReplyText,
        'status'        => 'new',
        'createdAt'     => date('Y-m-d H:i:s')
    ], 'WhatsApp inquiry recorded successfully');
}
