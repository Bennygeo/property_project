<?php
/**
 * GET /api/auth/profile.php
 * Fetches user profile, scheduled visits, shortlisted properties, unlocked media, and wallet ledger.
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

use Mannidam\Config\Database;
use Mannidam\Helpers\Response;

Response::initCors();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    Response::error('Method not allowed', 405);
}

$userId = max(1, (int)($_GET['userId'] ?? 1));

$db = (new Database())->getConnection();

// 1. Fetch User Record
$userStmt = $db->prepare("SELECT id, name, email, phone, role, points_balance AS pointsBalance, created_at AS createdAt FROM users WHERE id = ?");
$userStmt->execute([$userId]);
$user = $userStmt->fetch();

if (!$user) {
    Response::error('User profile not found', 404);
}

// 2. Fetch Scheduled Site Visits & Inspections
$visitsStmt = $db->prepare("
    SELECT 
        v.id,
        v.property_id AS propertyId,
        p.title AS propertyTitle,
        p.locality_name AS locality,
        p.city_name AS city,
        p.price,
        p.main_image_url AS imageUrl,
        v.lead_type AS leadType,
        v.contact_name AS contactName,
        v.contact_phone AS contactPhone,
        v.preferred_date AS preferredDate,
        v.visit_slot AS visitSlot,
        v.notes,
        v.status,
        v.created_at AS createdAt
    FROM inquiries_and_visits v
    LEFT JOIN properties p ON v.property_id = p.id
    WHERE v.user_id = ? OR v.contact_phone = ?
    ORDER BY v.created_at DESC
");
$visitsStmt->execute([$userId, $user['phone']]);
$visits = $visitsStmt->fetchAll();

// 3. Fetch Unlocked 4K & Drone Media
$unlocksStmt = $db->prepare("
    SELECT 
        u.id,
        u.property_id AS propertyId,
        p.title AS propertyTitle,
        p.locality_name AS locality,
        p.city_name AS city,
        p.price,
        p.main_image_url AS imageUrl,
        p.property_type AS propertyType,
        u.points_spent AS pointsSpent,
        u.unlocked_at AS unlockedAt
    FROM property_media_unlocks u
    LEFT JOIN properties p ON u.property_id = p.id
    WHERE u.user_id = ?
    ORDER BY u.unlocked_at DESC
");
$unlocksStmt->execute([$userId]);
$unlocks = $unlocksStmt->fetchAll();

// 4. Fetch Wallet Transactions
$txnStmt = $db->prepare("
    SELECT 
        id,
        transaction_type AS transactionType,
        points,
        amount_rupees AS amountRupees,
        description,
        status,
        created_at AS createdAt
    FROM wallet_transactions
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 20
");
$txnStmt->execute([$userId]);
$transactions = $txnStmt->fetchAll();

// 5. Fetch Shortlisted Properties
$shortlistsStmt = $db->prepare("
    SELECT 
        s.id,
        s.property_id AS propertyId,
        p.title,
        p.locality_name AS locality,
        p.city_name AS city,
        p.price,
        p.price_per_sqft AS pricePerSqFt,
        p.sqft,
        p.bhk_badge AS bhkBadge,
        p.facing_or_view AS facingOrView,
        p.main_image_url AS imageUrl,
        p.property_type AS propertyType,
        s.created_at AS savedAt
    FROM user_shortlists s
    JOIN properties p ON s.property_id = p.id
    WHERE s.user_id = ?
    ORDER BY s.created_at DESC
");
$shortlistsStmt->execute([$userId]);
$shortlists = $shortlistsStmt->fetchAll();

// 6. Fetch Viewed Properties History
$viewsStmt = $db->prepare("
    SELECT 
        v.id,
        v.property_id AS propertyId,
        p.title,
        p.locality_name AS locality,
        p.city_name AS city,
        p.price,
        p.price_per_sqft AS pricePerSqFt,
        p.sqft,
        p.bhk_badge AS bhkBadge,
        p.facing_or_view AS facingOrView,
        p.main_image_url AS imageUrl,
        p.property_type AS propertyType,
        v.viewed_at AS viewedAt
    FROM user_view_history v
    JOIN properties p ON v.property_id = p.id
    WHERE v.user_id = ?
    ORDER BY v.viewed_at DESC
    LIMIT 30
");
$viewsStmt->execute([$userId]);
$viewHistory = $viewsStmt->fetchAll();

// 7. Filter Downloaded Brochures from Inquiries
$brochures = array_values(array_filter($visits, fn($item) => ($item['leadType'] ?? '') === 'brochure_download'));
$scheduledVisits = array_values(array_filter($visits, fn($item) => ($item['leadType'] ?? '') !== 'brochure_download'));

Response::success([
    'user'         => $user,
    'visits'       => $scheduledVisits,
    'brochures'    => $brochures,
    'unlocks'      => $unlocks,
    'transactions' => $transactions,
    'shortlists'   => $shortlists,
    'viewHistory'  => $viewHistory,
    'summary'      => [
        'pointsBalance'    => (int)$user['pointsBalance'],
        'visitsCount'      => count($scheduledVisits),
        'brochuresCount'   => count($brochures),
        'unlocksCount'     => count($unlocks),
        'shortlistsCount'  => count($shortlists),
        'viewsCount'       => count($viewHistory),
    ]
], 'User profile retrieved successfully');
