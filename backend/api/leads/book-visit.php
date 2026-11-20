<?php
/**
 * POST /api/leads/book-visit.php
 * Schedules a cadastral site visit with slot selection.
 * Syncs with both `inquiries_and_visits` and `user_site_visits` (User PRD Workspace).
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
$propertyId    = trim((string)($input['propertyId'] ?? $input['property_id'] ?? ''));
$contactName   = trim((string)($input['name'] ?? $input['contact_name'] ?? ''));
$contactPhone  = trim((string)($input['phone'] ?? $input['contact_phone'] ?? ''));
$contactEmail  = trim((string)($input['email'] ?? $input['contact_email'] ?? ''));
$preferredDate = trim((string)($input['date'] ?? $input['preferred_date'] ?? ''));
$visitSlot     = trim((string)($input['slot'] ?? $input['visit_slot'] ?? 'morning'));
$notes         = trim((string)($input['notes'] ?? ''));
$userId        = (int)($input['userId'] ?? $input['user_id'] ?? 0);

if (empty($propertyId) || empty($contactName) || empty($contactPhone)) {
    Response::error('Property ID, Name, and Phone Number are required', 400);
}

$db = (new Database())->getConnection();

// 1. Resolve user ID if not passed directly
if ($userId <= 0 && (!empty($contactPhone) || !empty($contactEmail))) {
    $cleanPhone = preg_replace('/\D/', '', $contactPhone);
    $uStmt = $db->prepare("
        SELECT id, name, phone, email FROM users 
        WHERE (phone IS NOT NULL AND phone <> '' AND (phone = ? OR REPLACE(phone, ' ', '') LIKE ?))
           OR (email IS NOT NULL AND email <> '' AND email = ?)
        LIMIT 1
    ");
    $uStmt->execute([$contactPhone, '%' . $cleanPhone, $contactEmail]);
    $foundUser = $uStmt->fetch(PDO::FETCH_ASSOC);
    if ($foundUser) {
        $userId = (int)$foundUser['id'];
    }
}

// 2. Resolve property information from `projects` (primary) or `properties` (fallback)
$pStmt = $db->prepare("
    SELECT project_id AS id, project_name AS title, locality, city, district
    FROM projects 
    WHERE project_id = ?
    LIMIT 1
");
$pStmt->execute([$propertyId]);
$prop = $pStmt->fetch(PDO::FETCH_ASSOC);

if (!$prop) {
    $pStmt2 = $db->prepare("
        SELECT id, title, locality_name AS locality, city_name AS city, city_name AS district
        FROM properties 
        WHERE id = ? 
        LIMIT 1
    ");
    $pStmt2->execute([$propertyId]);
    $prop = $pStmt2->fetch(PDO::FETCH_ASSOC);
}

$propTitle = !empty($prop['title']) ? $prop['title'] : 'Plot Investment';
$locality  = !empty($prop['locality']) ? $prop['locality'] : (!empty($prop['city']) ? $prop['city'] : 'Tamil Nadu');
if (!empty($prop['district']) && strcasecmp($prop['district'], $locality) !== 0) {
    $locality .= ', ' . $prop['district'];
}

$finalDate = !empty($preferredDate) ? $preferredDate : date('Y-m-d', strtotime('+1 day'));

// Format slot nicely for user display
$slotDisplay = $visitSlot;
if (strcasecmp($visitSlot, 'morning') === 0) {
    $slotDisplay = 'Morning (10:00 AM - 1:00 PM)';
} elseif (strcasecmp($visitSlot, 'afternoon') === 0) {
    $slotDisplay = 'Afternoon (1:00 PM - 4:00 PM)';
} elseif (strcasecmp($visitSlot, 'evening') === 0) {
    $slotDisplay = 'Evening (4:00 PM - 6:00 PM)';
}

// 3. Record in `inquiries_and_visits`
$stmt = $db->prepare("
    INSERT INTO inquiries_and_visits 
    (property_id, user_id, lead_type, contact_name, contact_phone, contact_email, preferred_date, visit_slot, notes, status)
    VALUES (?, ?, 'site_visit', ?, ?, ?, ?, ?, ?, 'scheduled')
");
$stmt->execute([
    $propertyId,
    $userId > 0 ? $userId : null,
    $contactName,
    $contactPhone,
    !empty($contactEmail) ? $contactEmail : null,
    $finalDate,
    $slotDisplay,
    !empty($notes) ? $notes : 'Cadastral site visit scheduled via web app'
]);
$bookingId = (int)$db->lastInsertId();

// 4. Record in `user_site_visits` so it appears immediately on user's dashboard
$siteVisitId = 0;
if ($userId > 0) {
    $svStmt = $db->prepare("
        INSERT INTO user_site_visits (
            user_id, property_id, property_title, locality, visit_date, visit_slot, status,
            assigned_executive_name, assigned_executive_phone, pickup_location, admin_notes, created_at
        ) VALUES (
            ?, ?, ?, ?, ?, ?, 'requested',
            'Ramesh V (Relationship Mgr)', '+91 94440 12345', 'Koyambedu Metro Station, Gate 2', ?, NOW()
        )
    ");
    $svStmt->execute([
        $userId,
        $propertyId,
        $propTitle,
        $locality,
        $finalDate,
        $slotDisplay,
        !empty($notes) ? $notes : 'Cadastral site visit scheduled via web app'
    ]);
    $siteVisitId = (int)$db->lastInsertId();

    // 5. Update user entitlements (increment visits used)
    try {
        $db->prepare("
            UPDATE user_entitlements 
            SET site_visits_used = site_visits_used + 1 
            WHERE user_id = ?
        ")->execute([$userId]);
    } catch (\Throwable $e) {}
}

Response::success([
    'bookingId'     => $bookingId,
    'siteVisitId'   => $siteVisitId,
    'userId'        => $userId,
    'propertyId'    => $propertyId,
    'propertyTitle' => $propTitle,
    'locality'      => $locality,
    'status'        => 'confirmed',
    'scheduledDate' => $finalDate,
    'scheduledSlot' => $slotDisplay,
    'conciergePhone'=> '+91 94441 00000',
], 'Site visit request registered! Our jurisdictional concierge will contact you via WhatsApp & Call.');
