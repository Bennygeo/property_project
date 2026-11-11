<?php
/**
 * /api/leads/whatsapp-inquiry.php
 * Logs WhatsApp concierge inquiry and returns direct wa.me link with prefilled text.
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

use Mannidam\Config\Database;
use Mannidam\Helpers\Response;

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
            // Find a valid fallback property if an invalid ID was passed
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

    $insStmt = $db->prepare("
        INSERT INTO inquiries_and_visits 
        (property_id, user_id, lead_type, contact_name, contact_phone, contact_email, notes, status, created_at)
        VALUES (?, ?, 'whatsapp_concierge', ?, ?, ?, ?, 'new', NOW())
    ");
    $insStmt->execute([
        $propertyId,
        $userId,
        $contactName,
        $contactPhone,
        $contactEmail ?: null,
        $message
    ]);
    $leadId = (int)$db->lastInsertId();

    $businessPhone = '919486140936';
    $waText = urlencode("Hi Find a Plot, I am interested in {$propTitle} (Ref: {$propertyId}). Please share the verified Patta & TNRERA dossier.");
    $waUrl = "https://wa.me/{$businessPhone}?text={$waText}";

    Response::success([
        'leadId'        => $leadId,
        'propertyId'    => $propertyId,
        'propertyTitle' => $propTitle,
        'whatsappUrl'   => $waUrl,
        'status'        => 'new',
        'createdAt'     => date('Y-m-d H:i:s')
    ], 'WhatsApp inquiry recorded successfully');
}

