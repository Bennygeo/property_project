<?php
/**
 * POST /api/leads/brochure.php
 * Records brochure download lead and returns authenticated dossier download URL.
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

$input        = Response::getJsonInput();
$propertyId   = $input['propertyId'] ?? null;
$contactName  = trim($input['name'] ?? 'Guest Buyer');
$contactPhone = trim($input['phone'] ?? '+91 94441 00000');
$contactEmail = trim($input['email'] ?? '');

if (empty($propertyId)) {
    Response::error('Property ID is required', 400);
}

$db = (new Database())->getConnection();

$pStmt = $db->prepare("SELECT id, title FROM properties WHERE id = ?");
$pStmt->execute([$propertyId]);
$prop = $pStmt->fetch();

if (!$prop) {
    Response::error('Property not found', 404);
}

// Log lead
$stmt = $db->prepare("
    INSERT INTO inquiries_and_visits 
    (property_id, lead_type, contact_name, contact_phone, contact_email, notes, status)
    VALUES (?, 'brochure_download', ?, ?, ?, 'Official Brochure Downloaded', 'new')
");
$stmt->execute([
    $propertyId,
    $contactName,
    $contactPhone,
    !empty($contactEmail) ? $contactEmail : null
]);

Response::success([
    'propertyId'   => $propertyId,
    'downloadUrl'  => '/assets/brochures/' . $propertyId . '-official-dossier.pdf',
    'filename'     => preg_replace('/[^a-zA-Z0-9_-]/', '_', $prop['title']) . '_Brochure.pdf',
    'fileSizeBytes'=> 4823400
], 'Official cadastral brochure download generated');
