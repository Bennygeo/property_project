<?php
/**
 * /api/admin/whatsapp-chat.php
 * Manages full multi-turn threaded WhatsApp conversations between users and Admin/AI Agents.
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
    $leadId = !empty($_GET['lead_id']) ? (int)$_GET['lead_id'] : 0;
    $userPhone = trim((string)($_GET['user_phone'] ?? ''));

    if ($leadId > 0 && empty($userPhone)) {
        $stmt = $db->prepare("SELECT contact_phone FROM inquiries_and_visits WHERE id = ?");
        $stmt->execute([$leadId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            $userPhone = $row['contact_phone'];
        }
    }

    $cleanPhone = preg_replace('/[^\d]/', '', $userPhone);
    $businessNumber = Settings::getWhatsAppFullNumber();

    // If no valid phone is specified, return empty thread (no mock fallback)
    if (empty($cleanPhone) || strlen($cleanPhone) < 7) {
        Response::success([
            'userPhone'      => $userPhone,
            'businessPhone'  => $businessNumber,
            'lead'           => null,
            'totalMessages'  => 0,
            'thread'         => []
        ], 'No phone specified');
    }

    $last10 = substr($cleanPhone, -10);

    // Fetch real conversation thread strictly matching this buyer's phone
    $sql = "
        SELECT 
            m.id,
            m.lead_id AS leadId,
            m.property_id AS propertyId,
            m.user_phone AS userPhone,
            m.business_phone AS businessPhone,
            m.sender_type AS senderType,
            m.sender_name AS senderName,
            m.message_text AS messageText,
            m.is_auto_reply AS isAutoReply,
            m.created_at AS createdAt,
            p.project_name AS propertyTitle,
            p.locality AS localityName,
            p.price_from AS price
        FROM whatsapp_chat_messages m
        LEFT JOIN projects p ON m.property_id = p.project_id
        WHERE m.user_phone = ? 
           OR m.user_phone LIKE ?
           OR REPLACE(REPLACE(REPLACE(m.user_phone, ' ', ''), '-', ''), '+', '') LIKE ?
        ORDER BY m.created_at ASC, m.id ASC
    ";
    $stmt = $db->prepare($sql);
    $stmt->execute([$userPhone, "%{$last10}", "%{$last10}"]);
    $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Also get lead record if available
    $lead = null;
    if (!empty($userPhone) || $leadId > 0) {
        $lStmt = $db->prepare("
            SELECT iv.*, p.project_name AS property_title, p.locality AS locality_name, p.price_from AS property_price 
            FROM inquiries_and_visits iv 
            LEFT JOIN projects p ON iv.property_id = p.project_id 
            WHERE iv.id = ? OR iv.contact_phone = ? 
            ORDER BY iv.id DESC LIMIT 1
        ");
        $lStmt->execute([$leadId, $userPhone]);
        $lead = $lStmt->fetch(PDO::FETCH_ASSOC);
    }

    $businessNumber = Settings::getWhatsAppFullNumber();

    Response::success([
        'userPhone'      => $userPhone,
        'businessPhone'  => $businessNumber,
        'lead'           => $lead,
        'totalMessages'  => count($messages),
        'thread'         => $messages
    ], 'Conversation thread loaded successfully');
}

if ($method === 'POST') {
    $raw = file_get_contents('php://input');
    $input = !empty($raw) ? json_decode($raw, true) : [];
    $action = $input['action'] ?? 'send_admin_reply';

    $businessNumber = Settings::getWhatsAppFullNumber();

    // 1. ADMIN OR AI AGENT SENDS A REPLY
    if ($action === 'send_admin_reply') {
        $leadId       = !empty($input['leadId']) ? (int)$input['leadId'] : null;
        $userPhone    = trim((string)($input['userPhone'] ?? ''));
        $propertyId   = trim((string)($input['propertyId'] ?? ''));
        $messageText  = trim((string)($input['messageText'] ?? ''));
        $senderType   = trim((string)($input['senderType'] ?? 'admin')); // 'admin' or 'ai_agent'
        $senderName   = trim((string)($input['senderName'] ?? 'Admin (9486140936)'));
        $isAutoReply  = !empty($input['isAutoReply']) ? 1 : 0;

        if (empty($userPhone) || empty($messageText)) {
            Response::error('User phone and message text are required');
        }

        if (empty($propertyId) && $leadId) {
            $lStmt = $db->prepare("SELECT property_id FROM inquiries_and_visits WHERE id = ?");
            $lStmt->execute([$leadId]);
            $propertyId = $lStmt->fetchColumn() ?: null;
        }

        $ins = $db->prepare("
            INSERT INTO whatsapp_chat_messages 
            (lead_id, property_id, user_phone, business_phone, sender_type, sender_name, message_text, is_auto_reply, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $ins->execute([$leadId, $propertyId, $userPhone, $businessNumber, $senderType, $senderName, $messageText, $isAutoReply]);
        $msgId = (int)$db->lastInsertId();

        // Update inquiry status to 'contacted'
        if ($leadId) {
            $db->prepare("UPDATE inquiries_and_visits SET status = 'contacted' WHERE id = ?")->execute([$leadId]);
        }

        $cleanPhone = preg_replace('/[^\d]/', '', $userPhone);
        $waDirectUrl = "https://wa.me/{$cleanPhone}?text=" . urlencode($messageText);

        // Attempt live dispatch via Meta WhatsApp Cloud API if configured
        $metaSent = false;
        $metaError = null;
        if (MetaWhatsApp::isConfigured()) {
            $metaRes = MetaWhatsApp::sendTextMessage($userPhone, $messageText);
            $metaSent = !empty($metaRes['success']);
            $metaError = $metaRes['error'] ?? null;
        }

        Response::success([
            'id'          => $msgId,
            'whatsappUrl' => $waDirectUrl,
            'senderType'  => $senderType,
            'metaSent'    => $metaSent,
            'metaError'   => $metaError,
            'createdAt'   => date('Y-m-d H:i:s')
        ], $metaSent ? 'Reply sent to buyer WhatsApp via Meta Cloud API!' : 'Reply message logged to WhatsApp thread');
    }

    // 2. LOG INCOMING USER MESSAGE (E.g. "User requested additional info")
    if ($action === 'log_user_message') {
        $leadId      = !empty($input['leadId']) ? (int)$input['leadId'] : null;
        $userPhone   = trim((string)($input['userPhone'] ?? ''));
        $userName    = trim((string)($input['userName'] ?? 'Buyer'));
        $propertyId  = trim((string)($input['propertyId'] ?? ''));
        $messageText = trim((string)($input['messageText'] ?? ''));

        if (empty($userPhone) || empty($messageText)) {
            Response::error('User phone and message text are required');
        }

        // If no lead exists yet, create one
        if (!$leadId) {
            $propToUse = !empty($propertyId) ? $propertyId : 'PRJ-0059';
            $cStmt = $db->prepare("
                INSERT INTO inquiries_and_visits (property_id, user_id, lead_type, contact_name, contact_phone, notes, status, created_at)
                VALUES (?, 104, 'whatsapp_concierge', ?, ?, ?, 'new', NOW())
            ");
            $cStmt->execute([$propToUse, $userName, $userPhone, $messageText]);
            $leadId = (int)$db->lastInsertId();
        }

        $ins = $db->prepare("
            INSERT INTO whatsapp_chat_messages 
            (lead_id, property_id, user_phone, business_phone, sender_type, sender_name, message_text, is_auto_reply, created_at)
            VALUES (?, ?, ?, ?, 'user', ?, ?, 0, NOW())
        ");
        $ins->execute([$leadId, $propertyId, $userPhone, $businessNumber, $userName, $messageText]);
        $userMsgId = (int)$db->lastInsertId();

        // Optional AI auto-reply trigger
        $autoReplyMsg = null;
        if (!empty($input['triggerAutoReply']) || Settings::get('whatsapp_auto_reply_enabled', '1') === '1') {
            $agentRes = FreeAgentReply::generate([
                'name'       => $userName,
                'phone'      => $userPhone,
                'message'    => $messageText,
                'propertyId' => $propertyId
            ]);
            $replyText = $agentRes['reply'] ?? '';
            if (!empty($replyText)) {
                $insReply = $db->prepare("
                    INSERT INTO whatsapp_chat_messages 
                    (lead_id, property_id, user_phone, business_phone, sender_type, sender_name, message_text, is_auto_reply, created_at)
                    VALUES (?, ?, ?, ?, 'ai_agent', ?, ?, 1, DATE_ADD(NOW(), INTERVAL 2 SECOND))
                ");
                $insReply->execute([$leadId, $propertyId, $userPhone, $businessNumber, $agentRes['agentName'], $replyText]);
                $autoReplyMsg = [
                    'id'          => (int)$db->lastInsertId(),
                    'replyText'   => $replyText,
                    'agentName'   => $agentRes['agentName']
                ];
            }
        }

        Response::success([
            'userMessageId' => $userMsgId,
            'leadId'        => $leadId,
            'autoReply'     => $autoReplyMsg
        ], 'User message logged successfully');
    }

    // 3. SEED THE USER'S REQUESTED CONVERSATION (9498400967 <-> 9486140936)
    if ($action === 'seed_sample_thread') {
        $userPhone = '9498400967';
        $userName  = 'Kavitha M. (Buyer)';
        $propId    = 'PRJ-0059';

        // Check if lead exists
        $lead = $db->query("SELECT id FROM inquiries_and_visits WHERE contact_phone = '9498400967' LIMIT 1")->fetch(PDO::FETCH_ASSOC);
        if (!$lead) {
            $db->prepare("
                INSERT INTO inquiries_and_visits (property_id, user_id, lead_type, contact_name, contact_phone, notes, status, created_at)
                VALUES (?, 104, 'whatsapp_concierge', ?, ?, 'Initial inquiry for DTCP plot', 'contacted', DATE_SUB(NOW(), INTERVAL 2 HOUR))
            ")->execute([$propId, $userName, $userPhone]);
            $leadId = (int)$db->lastInsertId();
        } else {
            $leadId = (int)$lead['id'];
        }

        // Clear previous test chat for this phone to ensure clean demonstration
        $db->prepare("DELETE FROM whatsapp_chat_messages WHERE user_phone = ?")->execute([$userPhone]);

        // Turn 1: User sends message
        $db->prepare("
            INSERT INTO whatsapp_chat_messages (lead_id, property_id, user_phone, business_phone, sender_type, sender_name, message_text, is_auto_reply, created_at)
            VALUES (?, ?, ?, ?, 'user', ?, 'Hi Find a Plot, I am interested in Verified Cadastral Layout - Plot 1 (PRJ-0059). Can you share the verified legal Patta & TNRERA dossier?', 0, DATE_SUB(NOW(), INTERVAL 110 MINUTE))
        ")->execute([$leadId, $propId, $userPhone, '9486140936', $userName]);

        // Turn 2: Admin / Free AI Concierge replies
        $db->prepare("
            INSERT INTO whatsapp_chat_messages (lead_id, property_id, user_phone, business_phone, sender_type, sender_name, message_text, is_auto_reply, created_at)
            VALUES (?, ?, ?, ?, 'ai_agent', 'Find a Plot Cadastral & Legal AI', 'Hello *Kavitha*! 🏛️ *Find a Plot Legal Concierge* here.\n\nThank you for reaching out regarding *Verified Cadastral Layout - Plot 1* (Dharmapuri).\n✅ *Title & Approvals*: Clear title verified, DTCP approved & registered under TNRERA/9/LO/0108/2026.\n✅ *Cadastral Audit*: 0% encumbrance, verified FMB sketch boundaries.\n\nWould you like our advocate team to send you the verified Patta & FMB sketch PDF directly on this chat? 📄', 1, DATE_SUB(NOW(), INTERVAL 105 MINUTE))
        ")->execute([$leadId, $propId, $userPhone, '9486140936']);

        // Turn 3: User requests additional info
        $db->prepare("
            INSERT INTO whatsapp_chat_messages (lead_id, property_id, user_phone, business_phone, sender_type, sender_name, message_text, is_auto_reply, created_at)
            VALUES (?, ?, ?, ?, 'user', ?, 'Thank you! What is the exact road width facing this plot and are bank loans pre-approved with SBI or HDFC?', 0, DATE_SUB(NOW(), INTERVAL 45 MINUTE))
        ")->execute([$leadId, $propId, $userPhone, '9486140936', $userName]);

        // Turn 4: Admin replies with specifics
        $db->prepare("
            INSERT INTO whatsapp_chat_messages (lead_id, property_id, user_phone, business_phone, sender_type, sender_name, message_text, is_auto_reply, created_at)
            VALUES (?, ?, ?, ?, 'admin', 'Admin Benny (9486140936)', 'The layout features a 40-foot wide blacktop approach road with avenue plantation and LED street lighting. Yes, pre-approved bank loans up to 75% are available with both SBI and HDFC with immediate doorstep sanction assistance. Would you like to schedule an on-site visit this Saturday?', 0, DATE_SUB(NOW(), INTERVAL 20 MINUTE))
        ")->execute([$leadId, $propId, $userPhone, '9486140936']);

        Response::success([
            'leadId'    => $leadId,
            'userPhone' => $userPhone,
            'turns'     => 4
        ], 'Sample conversation thread seeded successfully');
    }

    Response::error('Invalid action');
}

