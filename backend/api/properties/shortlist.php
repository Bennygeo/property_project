<?php
/**
 * GET/POST/DELETE /api/properties/shortlist.php
 * Manages user property shortlists with database persistence and automatic cascade sync.
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

use Mannidam\Config\Database;
use Mannidam\Helpers\Response;

Response::initCors();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$db = (new Database())->getConnection();

/**
 * Helper to get User ID from request (Query param, JSON body, or default demo user)
 */
function resolveUserId(array $body = []): int {
    if (!empty($body['userId'])) {
        return max(1, (int)$body['userId']);
    }
    if (!empty($_GET['userId'])) {
        return max(1, (int)$_GET['userId']);
    }
    // Default to registered user 1 for development/demo sessions
    return 1;
}

if ($method === 'GET') {
    $userId = resolveUserId();

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
    $shortlists = $stmt->fetchAll();

    $propertyIds = array_values(array_unique(array_map(function ($row) {
        return (string)$row['propertyId'];
    }, $shortlists)));

    Response::success([
        'userId'      => $userId,
        'propertyIds' => $propertyIds,
        'shortlists'  => $shortlists,
        'count'       => count($propertyIds)
    ], 'User shortlists retrieved successfully');
    exit;
}

if ($method === 'POST' || $method === 'DELETE') {
    $rawInput = file_get_contents('php://input');
    $body = json_decode($rawInput, true) ?? [];

    $propertyId = trim((string)($body['propertyId'] ?? $_GET['propertyId'] ?? ''));
    $action = strtolower(trim((string)($body['action'] ?? ($method === 'DELETE' ? 'remove' : 'toggle'))));
    $userId = resolveUserId($body);

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

