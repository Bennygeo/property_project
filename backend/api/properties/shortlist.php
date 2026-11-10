<?php
/**
 * GET/POST/DELETE /api/properties/shortlist.php
 * Manages user property shortlists with database persistence, guest support, and automatic admin cascade sync.
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

use Mannidam\Config\Database;
use Mannidam\Helpers\Response;

Response::initCors();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$db = (new Database())->getConnection();

// Ensure default fallback user exists for guest/visitor sessions
try {
    $db->exec("
        INSERT IGNORE INTO users (id, name, email, phone, role, points_balance)
        VALUES (1, 'Guest / Verified Investor', 'guest@findaplot.in', '+91 94440 00001', 'buyer', 100)
    ");
} catch (\Throwable $e) {
    // Continue
}

/**
 * Helper to get User ID from request (Query param, JSON body, or default demo user)
 */
function resolveUserId(PDO $db, array $body = []): int {
    $cand = 0;
    if (!empty($body['userId'])) {
        $cand = (int)$body['userId'];
    } elseif (!empty($_GET['userId'])) {
        $cand = (int)$_GET['userId'];
    }

    if ($cand > 0) {
        // Validate user actually exists in users table to prevent FK constraint failure
        $checkStmt = $db->prepare("SELECT id FROM users WHERE id = ?");
        $checkStmt->execute([$cand]);
        if ($checkStmt->fetch()) {
            return $cand;
        }
    }

    // Default to system user 1
    return 1;
}

if ($method === 'GET') {
    $userId = resolveUserId($db);
    $localIdsParam = trim((string)($_GET['localIds'] ?? ''));
    $localIds = array_filter(array_map('trim', explode(',', $localIdsParam)));

    $purgedPropertyIds = [];
    $validLocalIds = [];

    // If client supplied localIds from localStorage, verify each against properties table
    if (!empty($localIds)) {
        // Check which localIds actually exist in published properties
        $placeholders = implode(',', array_fill(0, count($localIds), '?'));
        $checkStmt = $db->prepare("
            SELECT id, status 
            FROM properties 
            WHERE id IN ($placeholders)
        ");
        $checkStmt->execute($localIds);
        $found = $checkStmt->fetchAll(PDO::FETCH_ASSOC);

        $existingMap = [];
        foreach ($found as $row) {
            if (($row['status'] ?? '') !== 'archived') {
                $existingMap[$row['id']] = true;
                $validLocalIds[] = (string)$row['id'];
            }
        }

        // Any local ID not in existing published properties was deleted by admin
        foreach ($localIds as $lid) {
            if (!isset($existingMap[$lid])) {
                $purgedPropertyIds[] = $lid;
                // Delete any orphaned row from user_shortlists
                try {
                    $delStmt = $db->prepare("DELETE FROM user_shortlists WHERE property_id = ?");
                    $delStmt->execute([$lid]);
                } catch (\Throwable $e) {}
            }
        }

        // Auto-sync valid local IDs into user_shortlists for this user
        if (!empty($validLocalIds) && $userId > 0) {
            $syncIns = $db->prepare("
                INSERT IGNORE INTO user_shortlists (user_id, property_id, created_at)
                VALUES (?, ?, NOW())
            ");
            foreach ($validLocalIds as $vlId) {
                try {
                    $syncIns->execute([$userId, $vlId]);
                } catch (\Throwable $e) {}
            }
        }
    }

    // Fetch all shortlisted properties joined with properties table
    // Properties removed by admin or archived will be automatically excluded
    $stmt = $db->prepare("
        SELECT 
            s.id AS shortlistId,
            s.property_id AS propertyId,
            s.created_at AS shortlistedAt,
            p.id,
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
            p.status
        FROM user_shortlists s
        JOIN properties p ON s.property_id = p.id
        WHERE s.user_id = ?
          AND (p.status IS NULL OR p.status != 'archived')
        ORDER BY s.created_at DESC
    ");
    $stmt->execute([$userId]);
    $shortlists = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $dbPropertyIds = array_values(array_unique(array_map(function ($row) {
        return (string)$row['propertyId'];
    }, $shortlists)));

    // Combined unique list of confirmed active property IDs
    $allActiveIds = array_values(array_unique(array_merge($dbPropertyIds, $validLocalIds)));

    Response::success([
        'userId'             => $userId,
        'propertyIds'        => $allActiveIds,
        'purgedPropertyIds'  => array_values(array_unique($purgedPropertyIds)),
        'shortlists'         => $shortlists,
        'count'              => count($allActiveIds)
    ], 'User shortlists retrieved successfully');
    exit;
}

if ($method === 'POST' || $method === 'DELETE') {
    $rawInput = file_get_contents('php://input');
    $body = json_decode($rawInput, true) ?? [];

    $propertyId = trim((string)($body['propertyId'] ?? $_GET['propertyId'] ?? ''));
    $action = strtolower(trim((string)($body['action'] ?? ($method === 'DELETE' ? 'remove' : 'toggle'))));
    $userId = resolveUserId($db, $body);

    if (empty($propertyId)) {
        Response::error('Property ID is required', 400);
        exit;
    }

    // 1. Verify that property actually exists in the database and is not archived/deleted
    $checkPropStmt = $db->prepare("SELECT id, title, status FROM properties WHERE id = ?");
    $checkPropStmt->execute([$propertyId]);
    $prop = $checkPropStmt->fetch();

    if (!$prop || ($prop['status'] ?? '') === 'archived') {
        // If property was deleted or archived by admin, prune any lingering shortlist records
        $cleanStmt = $db->prepare("DELETE FROM user_shortlists WHERE property_id = ?");
        $cleanStmt->execute([$propertyId]);

        Response::error('Property does not exist or has been removed from the database by an administrator', 404);
        exit;
    }

    // 2. Check if shortlist entry exists
    $checkShortlistStmt = $db->prepare("SELECT id FROM user_shortlists WHERE user_id = ? AND property_id = ?");
    $checkShortlistStmt->execute([$userId, $propertyId]);
    $existing = $checkShortlistStmt->fetch();

    $shouldRemove = ($action === 'remove') || ($action === 'toggle' && $existing);

    if ($shouldRemove) {
        $delStmt = $db->prepare("DELETE FROM user_shortlists WHERE user_id = ? AND property_id = ?");
        $delStmt->execute([$userId, $propertyId]);

        Response::success([
            'propertyId'    => $propertyId,
            'isShortlisted' => false,
            'action'        => 'removed',
            'userId'        => $userId
        ], 'Property removed from shortlist');
    } else {
        $insStmt = $db->prepare("
            INSERT INTO user_shortlists (user_id, property_id, created_at)
            VALUES (?, ?, NOW())
            ON DUPLICATE KEY UPDATE created_at = NOW()
        ");
        $insStmt->execute([$userId, $propertyId]);

        Response::success([
            'propertyId'    => $propertyId,
            'isShortlisted' => true,
            'action'        => 'added',
            'userId'        => $userId
        ], 'Property saved to shortlist');
    }
    exit;
}

Response::error('Method not allowed', 405);
