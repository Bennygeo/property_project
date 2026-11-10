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

// Ensure system default user exists
try {
    $db->exec("
        INSERT IGNORE INTO users (id, name, email, phone, role, points_balance)
        VALUES (1, 'Guest / Verified Investor', 'guest@findaplot.in', '+91 94440 00001', 'buyer', 100)
    ");
} catch (\Throwable $e) {}

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

    return 1;
}

if ($method === 'GET') {
    $userId = resolveUserId($db);
    $localIdsParam = trim((string)($_GET['localIds'] ?? ''));
    $localIds = array_values(array_filter(array_map('trim', explode(',', $localIdsParam))));

    $purgedPropertyIds = [];
    $validLocalIds = [];

    if (!empty($localIds)) {
        // Separate database IDs (PRJ-*) from client mock IDs (p-*)
        $dbCandidateIds = [];
        foreach ($localIds as $lid) {
            if (stripos($lid, 'PRJ-') === 0 || stripos($lid, 'prop-') === 0) {
                $dbCandidateIds[] = $lid;
            } else {
                // Client mock property (e.g. p-1, p-2) is always valid locally
                $validLocalIds[] = $lid;
            }
        }

        if (!empty($dbCandidateIds)) {
            $placeholders = implode(',', array_fill(0, count($dbCandidateIds), '?'));
            $checkStmt = $db->prepare("
                SELECT id, status 
                FROM properties 
                WHERE UPPER(TRIM(id)) IN ($placeholders)
            ");
            $upperCandidates = array_map(function($id) { return strtoupper(trim($id)); }, $dbCandidateIds);
            $checkStmt->execute($upperCandidates);
            $found = $checkStmt->fetchAll(PDO::FETCH_ASSOC);

            $existingMap = [];
            foreach ($found as $row) {
                if (($row['status'] ?? '') !== 'archived') {
                    $existingMap[strtoupper(trim($row['id']))] = (string)$row['id'];
                    $validLocalIds[] = (string)$row['id'];
                }
            }

            foreach ($dbCandidateIds as $cid) {
                $upper = strtoupper(trim($cid));
                if (!isset($existingMap[$upper])) {
                    // Property starts with PRJ- but doesn't exist in properties table -> deleted by admin!
                    $purgedPropertyIds[] = $cid;
                    try {
                        $delStmt = $db->prepare("DELETE FROM user_shortlists WHERE UPPER(TRIM(property_id)) = ?");
                        $delStmt->execute([$upper]);
                    } catch (\Throwable $e) {}
                }
            }
        }

        // Auto-save valid local IDs into user_shortlists in database
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
        JOIN properties p ON UPPER(TRIM(s.property_id)) = UPPER(TRIM(p.id))
        WHERE s.user_id = ?
          AND (p.status IS NULL OR p.status != 'archived')
        ORDER BY s.created_at DESC
    ");
    $stmt->execute([$userId]);
    $shortlists = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $dbPropertyIds = array_values(array_unique(array_map(function ($row) {
        return (string)$row['propertyId'];
    }, $shortlists)));

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

    // Check if property exists in properties table (case-insensitive)
    $checkPropStmt = $db->prepare("SELECT id, title, status FROM properties WHERE UPPER(TRIM(id)) = UPPER(TRIM(?))");
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
        $delStmt = $db->prepare("DELETE FROM user_shortlists WHERE user_id = ? AND UPPER(TRIM(property_id)) = UPPER(TRIM(?))");
        $delStmt->execute([$userId, $canonicalId]);

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
}

Response::error('Method not allowed', 405);
