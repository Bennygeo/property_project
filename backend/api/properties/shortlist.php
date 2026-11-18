<?php
/**
 * GET/POST/DELETE /api/properties/shortlist.php
 * Robust, case-insensitive user property shortlist persistence and synchronization.
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

use Mannidam\Config\Database;
use Mannidam\Helpers\Response;

Response::initCors();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$db = (new Database())->getConnection();

// User ID resolution: 0 if unauthenticated / guest (no default guest user)
function resolveUserId(PDO $db, array $body = []): int {
    $cand = 0;
    if (!empty($body['userId'])) {
        $cand = (int)$body['userId'];
    } elseif (!empty($_GET['userId'])) {
        $cand = (int)$_GET['userId'];
    }

    if ($cand > 0) {
        $checkStmt = $db->prepare("SELECT id FROM users WHERE id = ?");
        $checkStmt->execute([$cand]);
        if ($checkStmt->fetch()) {
            return $cand;
        }
    }

    return 0;
}

if ($method === 'GET') {
    $userId = resolveUserId($db);

    // If unauthenticated / logged out, return completely empty shortlists
    if ($userId <= 0) {
        Response::success([
            'userId'             => 0,
            'propertyIds'        => [],
            'purgedPropertyIds'  => [],
            'shortlists'         => [],
            'count'              => 0
        ], 'No active authenticated user');
        exit;
    }

    // If user is admin, developer or internal staff, they do not have personal buyer shortlists
    $roleCheck = $db->prepare("SELECT role FROM users WHERE id = ? LIMIT 1");
    $roleCheck->execute([$userId]);
    $userRole = (string)$roleCheck->fetchColumn();
    $adminRoles = ['admin', 'super_admin', 'co_admin', 'sales_executive', 'property_advisor', 'operations_executive', 'finance_admin', 'content_gis_admin', 'developer'];
    if (in_array($userRole, $adminRoles, true)) {
        Response::success([
            'userId'             => $userId,
            'propertyIds'        => [],
            'purgedPropertyIds'  => [],
            'shortlists'         => [],
            'count'              => 0
        ], 'Staff and administrator accounts do not have buyer shortlists');
        exit;
    }

    // Fetch all shortlisted properties joined with both properties and projects tables
    $stmt = $db->prepare("
        SELECT 
            s.id AS shortlistId,
            s.property_id AS propertyId,
            s.created_at AS shortlistedAt,
            COALESCE(p.id, prj.project_id, s.property_id) AS id,
            COALESCE(NULLIF(p.title, ''), NULLIF(prj.project_name, ''), 'Verified Plot') AS title,
            COALESCE(NULLIF(p.locality_name, ''), NULLIF(prj.locality, ''), 'Tamil Nadu') AS locality,
            COALESCE(NULLIF(p.city_name, ''), NULLIF(prj.city, ''), 'Tamil Nadu') AS city,
            COALESCE(NULLIF(p.price, ''), CASE WHEN prj.price_from > 0 THEN CONCAT('₹ ', FORMAT(prj.price_from/100000, 2), ' L') ELSE 'Price on Request' END) AS price,
            COALESCE(NULLIF(p.price_per_sqft, ''), CONCAT('₹ ', FORMAT(prj.sqft_rate, 0), '/sq.ft'), '₹ 4,500/sq.ft') AS pricePerSqFt,
            COALESCE(NULLIF(p.sqft, ''), CONCAT(prj.min_plot_size, ' sq.ft'), '1,200 sq.ft') AS sqft,
            'Approved Plot' AS bhkBadge,
            'Direct SRO Deed' AS facingOrView,
            COALESCE(NULLIF(p.main_image_url, ''), NULLIF(prj.cover_image, ''), 'assets/images/placeholder.jpg') AS imageUrl,
            COALESCE(NULLIF(p.property_type, ''), NULLIF(prj.category, ''), 'Gated CMDA Plots') AS propertyType,
            COALESCE(p.status, prj.status, 'published') AS status
        FROM user_shortlists s
        LEFT JOIN properties p ON CAST(p.id AS CHAR(50)) COLLATE utf8mb4_unicode_ci = CAST(s.property_id AS CHAR(50)) COLLATE utf8mb4_unicode_ci
        LEFT JOIN projects prj ON CAST(prj.project_id AS CHAR(50)) COLLATE utf8mb4_unicode_ci = CAST(s.property_id AS CHAR(50)) COLLATE utf8mb4_unicode_ci
        WHERE s.user_id = ?
        ORDER BY s.created_at DESC
    ");
    $stmt->execute([$userId]);
    $shortlists = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $dbPropertyIds = array_values(array_unique(array_map(function ($row) {
        return (string)$row['propertyId'];
    }, $shortlists)));

    // Return the actual MySQL shortlist IDs
    $activeIds = $dbPropertyIds;

    Response::success([
        'userId'             => $userId,
        'propertyIds'        => $activeIds,
        'purgedPropertyIds'  => [],
        'shortlists'         => $shortlists,
        'count'              => count($activeIds)
    ], 'User shortlists retrieved successfully');
    exit;
}

if ($method === 'POST' || $method === 'DELETE') {
    try {
        $rawInput = file_get_contents('php://input');
        $body = json_decode($rawInput, true) ?? [];

        $propertyId = trim((string)($body['propertyId'] ?? $_GET['propertyId'] ?? ''));
        $action = strtolower(trim((string)($body['action'] ?? ($method === 'DELETE' ? 'remove' : 'toggle'))));
        $userId = resolveUserId($db, $body);

        if ($userId <= 0) {
            Response::error('Please sign in to manage your shortlisted properties.', 401);
            exit;
        }

        if (empty($propertyId)) {
            Response::error('Property ID is required', 400);
            exit;
        }

        // Check if property exists in projects table (case-insensitive)
        $checkPropStmt = $db->prepare("SELECT project_id AS id, project_name AS title, status FROM projects WHERE UPPER(TRIM(project_id)) = UPPER(TRIM(?))");
        $checkPropStmt->execute([$propertyId]);
        $prop = $checkPropStmt->fetch(PDO::FETCH_ASSOC);

        $canonicalId = $prop ? (string)$prop['id'] : $propertyId;

        if ($prop && ($prop['status'] ?? '') === 'archived') {
            $cleanStmt = $db->prepare("DELETE FROM user_shortlists WHERE UPPER(TRIM(property_id)) = UPPER(TRIM(?))");
            $cleanStmt->execute([$propertyId]);

            Response::error('Property has been archived by administrator', 404);
            exit;
        }

        // Check if shortlist entry exists
        $checkShortlistStmt = $db->prepare("SELECT id FROM user_shortlists WHERE user_id = ? AND UPPER(TRIM(property_id)) = UPPER(TRIM(?))");
        $checkShortlistStmt->execute([$userId, $canonicalId]);
        $existing = $checkShortlistStmt->fetch();

        $shouldRemove = ($action === 'remove') || ($action === 'toggle' && $existing);

        if ($shouldRemove) {
            $delStmt = $db->prepare("DELETE FROM user_shortlists WHERE user_id = ? AND (UPPER(TRIM(property_id)) = UPPER(TRIM(?)) OR UPPER(TRIM(property_id)) = UPPER(TRIM(?)))");
            $delStmt->execute([$userId, $canonicalId, $propertyId]);

            Response::success([
                'propertyId'    => $canonicalId,
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
            $insStmt->execute([$userId, $canonicalId]);

            Response::success([
                'propertyId'    => $canonicalId,
                'isShortlisted' => true,
                'action'        => 'added',
                'userId'        => $userId
            ], 'Property saved to shortlist');
        }
        exit;
    } catch (\Throwable $e) {
        Response::error('Unable to update shortlist: ' . $e->getMessage(), 500);
        exit;
    }
}

Response::error('Method not allowed', 405);
