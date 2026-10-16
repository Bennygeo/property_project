<?php
/**
 * POST /api/leads/book-visit.php
 * Schedules a cadastral site visit with slot selection.
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

use Mannidam\Config\Database;
use Mannidam\Helpers\Response;

Response::initCors();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Method not allowed', 405);
}

$input         = Response::getJsonInput();
$propertyId    = $input['propertyId'] ?? null;
$contactName   = trim($input['name'] ?? '');
$contactPhone  = trim($input['phone'] ?? '');
$contactEmail  = trim($input['email'] ?? '');
$preferredDate = $input['date'] ?? null;
$visitSlot     = $input['slot'] ?? 'Morning 10 AM - 1 PM';
$notes         = trim($input['notes'] ?? '');

if (empty($propertyId) || empty($contactName) || empty($contactPhone)) {
    Response::error('Property ID, Name, and Phone Number are required', 400);
}

$db = (new Database())->getConnection();

// Verify property exists
$pStmt = $db->prepare("SELECT id, title, locality_name, city_name FROM properties WHERE id = ?");
$pStmt->execute([$propertyId]);
$prop = $pStmt->fetch();

if (!$prop) {
    Response::error('Property not found', 404);
}

$stmt = $db->prepare("
    INSERT INTO inquiries_and_visits 
    (property_id, lead_type, contact_name, contact_phone, contact_email, preferred_date, visit_slot, notes, status)
    VALUES (?, 'site_visit', ?, ?, ?, ?, ?, ?, 'scheduled')
");

$stmt->execute([
    $propertyId,
    $contactName,
    $contactPhone,
    !empty($contactEmail) ? $contactEmail : null,
    !empty($preferredDate) ? $preferredDate : date('Y-m-d', strtotime('+2 days')),
    $visitSlot,
    !empty($notes) ? $notes : 'Cadastral site visit scheduled via web app'
]);

$bookingId = (int)$db->lastInsertId();

Response::success([
    'bookingId'     => $bookingId,
    'propertyId'    => $propertyId,
    'propertyTitle' => $prop['title'],
    'status'        => 'confirmed',
    'scheduledSlot' => $visitSlot,
    'conciergePhone'=> '+91 94441 00000',
], 'Site visit request registered! Our jurisdictional concierge will contact you via WhatsApp & Call.');
