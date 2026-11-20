<?php
/**
 * GET /api/workspace/user-workspace.php
 * Fetches all PRD workspace resources for a user:
 * - Membership & Entitlements
 * - Scheduled Site Visits
 * - Advisory Consultations
 * - Saved Searches & Alert Triggers
 * - Bookings & Enquiries
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

use Mannidam\Config\Database;
use Mannidam\Helpers\Response;

Response::initCors();

$userId = (int)($_GET['userId'] ?? $_GET['user_id'] ?? 0);
if ($userId <= 0) {
    Response::success([
        'userId' => 0,
        'membership' => null,
        'siteVisits' => [],
        'consultations' => [],
        'savedSearches' => [],
        'bookings' => []
    ], 'No authenticated user');
    exit;
}
$db = (new Database())->getConnection();

try {
    // 1. Membership & Entitlements
    $subStmt = $db->prepare("
        SELECT us.*, sp.name AS plan_name, sp.badge_text, sp.duration_days, sp.price_inr
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.user_id = ? AND us.status = 'active'
        ORDER BY us.id DESC LIMIT 1
    ");
    $subStmt->execute([$userId]);
    $subscription = $subStmt->fetch(PDO::FETCH_ASSOC);

    $entStmt = $db->prepare("SELECT * FROM user_entitlements WHERE user_id = ? ORDER BY id DESC LIMIT 1");
    $entStmt->execute([$userId]);
    $entitlements = $entStmt->fetch(PDO::FETCH_ASSOC);

    // Days remaining
    $daysRemaining = 0;
    if ($subscription && !empty($subscription['expires_at'])) {
        $exp = new DateTime($subscription['expires_at']);
        $now = new DateTime();
        if ($exp > $now) {
            $daysRemaining = $now->diff($exp)->days;
        }
    }

    // 2. Scheduled Site Visits (with auto-sync from inquiries_and_visits)
    $uInfoStmt = $db->prepare("SELECT id, name, phone, email FROM users WHERE id = ? LIMIT 1");
    $uInfoStmt->execute([$userId]);
    $currentUser = $uInfoStmt->fetch(PDO::FETCH_ASSOC);
    $userPhone = trim((string)($currentUser['phone'] ?? ''));
    $cleanPhone = preg_replace('/\D/', '', $userPhone);

    if ($userId > 0) {
        $inqStmt = $db->prepare("
            SELECT iv.*, 
                   COALESCE(p.project_name, prop.title, 'Plot Investment') AS prop_title,
                   COALESCE(p.locality, prop.locality_name, 'Tamil Nadu') AS prop_loc,
                   p.city, p.district
            FROM inquiries_and_visits iv
            LEFT JOIN projects p ON p.project_id = iv.property_id
            LEFT JOIN properties prop ON prop.id = iv.property_id
            WHERE iv.lead_type = 'site_visit'
              AND (
                  iv.user_id = :uid 
                  OR (:cleanPhone <> '' AND REPLACE(REPLACE(iv.contact_phone, ' ', ''), '+91', '') = :cleanPhone)
              )
            ORDER BY iv.id DESC
        ");
        $inqStmt->execute([
            ':uid'        => $userId,
            ':cleanPhone' => $cleanPhone
        ]);
        $inqVisits = $inqStmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($inqVisits as $iv) {
            $cStmt = $db->prepare("SELECT id FROM user_site_visits WHERE user_id = ? AND property_id = ?");
            $cStmt->execute([$userId, $iv['property_id']]);
            if (!$cStmt->fetch()) {
                $propLoc = $iv['prop_loc'];
                if (!empty($iv['district']) && strcasecmp($iv['district'], $propLoc) !== 0) {
                    $propLoc .= ', ' . $iv['district'];
                }
                $insSv = $db->prepare("
                    INSERT INTO user_site_visits (
                        user_id, property_id, property_title, locality, visit_date, visit_slot, status,
                        assigned_executive_name, assigned_executive_phone, pickup_location, admin_notes, created_at
                    ) VALUES (
                        ?, ?, ?, ?, ?, ?, 'requested',
                        'Ramesh V (Relationship Mgr)', '+91 94440 12345', 'Koyambedu Metro Station, Gate 2', ?, ?
                    )
                ");
                $insSv->execute([
                    $userId,
                    $iv['property_id'],
                    $iv['prop_title'],
                    $propLoc,
                    $iv['preferred_date'] ?: date('Y-m-d', strtotime('+1 day')),
                    $iv['visit_slot'] ?: 'Morning (10:00 AM - 1:00 PM)',
                    $iv['notes'],
                    $iv['created_at'] ?: date('Y-m-d H:i:s')
                ]);
                $db->prepare("UPDATE inquiries_and_visits SET user_id = ? WHERE id = ?")->execute([$userId, $iv['id']]);
            }
        }
    }

    $visitsStmt = $db->prepare("
        SELECT * FROM user_site_visits 
        WHERE user_id = ? 
        ORDER BY visit_date DESC, id DESC
    ");
    $visitsStmt->execute([$userId]);
    $siteVisits = $visitsStmt->fetchAll(PDO::FETCH_ASSOC);

    // 3. Advisory Consultations
    $consultStmt = $db->prepare("
        SELECT * FROM user_advisory_consultations 
        WHERE user_id = ? 
        ORDER BY consultation_date DESC, id DESC
    ");
    $consultStmt->execute([$userId]);
    $consultationsRaw = $consultStmt->fetchAll(PDO::FETCH_ASSOC);
    $consultations = array_map(function($c) {
        $c['recommendations'] = !empty($c['recommendations_json']) ? json_decode($c['recommendations_json'], true) : [];
        unset($c['recommendations_json']);
        return $c;
    }, $consultationsRaw);

    // 4. Saved Searches
    $searchStmt = $db->prepare("
        SELECT * FROM user_saved_searches 
        WHERE user_id = ? 
        ORDER BY id DESC
    ");
    $searchStmt->execute([$userId]);
    $savedSearchesRaw = $searchStmt->fetchAll(PDO::FETCH_ASSOC);
    $savedSearches = array_map(function($s) {
        $s['filters'] = !empty($s['filters_json']) ? json_decode($s['filters_json'], true) : [];
        unset($s['filters_json']);
        return $s;
    }, $savedSearchesRaw);

    // 5. Bookings & Enquiries
    $bookingStmt = $db->prepare("
        SELECT * FROM user_plot_bookings 
        WHERE user_id = ? 
        ORDER BY id DESC
    ");
    $bookingStmt->execute([$userId]);
    $plotBookings = $bookingStmt->fetchAll(PDO::FETCH_ASSOC);

    Response::success([
        'userId' => $userId,
        'membership' => [
            'subscription' => $subscription ?: [
                'plan_id' => 'explorer',
                'plan_name' => 'Explorer Tier',
                'badge_text' => 'Free Forever',
                'status' => 'active',
                'price_inr' => 0
            ],
            'entitlements' => $entitlements ?: [
                'plan_id' => 'explorer',
                'project_views_used' => 0,
                'project_view_limit' => 2,
                'comparisons_used' => 0,
                'comparison_limit' => 0,
                'advisory_sessions_used' => 0,
                'advisory_session_limit' => 1,
                'site_visits_used' => 0,
                'site_visit_limit' => 0
            ],
            'daysRemaining' => $daysRemaining
        ],
        'siteVisits' => $siteVisits,
        'consultations' => $consultations,
        'savedSearches' => $savedSearches,
        'plotBookings' => $plotBookings
    ], 'User workspace loaded successfully');

} catch (\Throwable $e) {
    Response::error('Failed to load user workspace: ' . $e->getMessage(), 500);
}

