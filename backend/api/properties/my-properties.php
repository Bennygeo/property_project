<?php
/**
 * GET /api/properties/my-properties.php?user_id={id}
 * Returns properties/projects submitted by a particular user/admin.
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

$userId = (int)($_GET['user_id'] ?? 0);
if ($userId <= 0) {
    Response::success([
        'total'      => 0,
        'properties' => []
    ], 'User properties retrieved successfully');
}

$db = (new Database())->getConnection();

$uStmt = $db->prepare("SELECT id, name, role, developer_id FROM users WHERE id = :id LIMIT 1");
$uStmt->execute([':id' => $userId]);
$user = $uStmt->fetch(PDO::FETCH_ASSOC);

if (!$user || ($user['role'] ?? '') === 'public_visitor') {
    Response::success([
        'total'      => 0,
        'properties' => []
    ], 'User properties retrieved successfully');
}

$role = $user['role'] ?? 'buyer';
$userName = trim((string)($user['name'] ?? ''));
$developerId = (int)($user['developer_id'] ?? 0);

// Query projects directly from `projects` base table
$query = "
    SELECT
        p.project_id AS id,
        p.project_id AS projectId,
        p.project_name AS title,
        p.project_name AS projectName,
        COALESCE(p.developer_name, p.submitted_by, 'Independent Owner') AS developerName,
        p.category AS propertyType,
        p.type AS listingMode,
        p.locality AS localityName,
        p.city AS cityName,
        p.district,
        p.price_from AS price,
        p.sqft_rate AS pricePerSqft,
        p.min_plot_size AS sqft,
        'Approved Plot' AS bhkBadge,
        'Direct SRO Deed' AS facingOrView,
        COALESCE(p.cover_image, 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80') AS mainImageUrl,
        p.rera_no AS reraNumber,
        COALESCE(p.status, 'pending_review') AS status,
        p.submitted_by AS submittedByName,
        p.submitted_by_user_id AS submittedByUserId,
        p.reviewed_by AS reviewedByName,
        p.reviewed_at AS reviewedAt,
        p.review_notes AS reviewNotes,
        p.rejection_reason AS rejectionReason,
        p.created_at AS createdAt,
        p.updated_at AS updatedAt
    FROM projects p
    WHERE (
        p.submitted_by_user_id = :userId
        OR (p.submitted_by IS NOT NULL AND LOWER(TRIM(p.submitted_by)) = LOWER(TRIM(:userName)))
        " . ($role === 'developer' && $developerId > 0 ? " OR p.developer_id = :devId " : "") . "
    )
    ORDER BY p.created_at DESC
";

$stmt = $db->prepare($query);
$params = [
    ':userId'   => $userId,
    ':userName' => $userName
];
if ($role === 'developer' && $developerId > 0) {
    $params[':devId'] = $developerId;
}

$stmt->execute($params);
$properties = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Format price & sqft for display if raw numbers
foreach ($properties as &$p) {
    if (is_numeric($p['price']) && (float)$p['price'] > 0) {
        $num = (float)$p['price'];
        if ($num >= 10000000) {
            $p['price'] = '₹ ' . round($num / 10000000, 2) . ' Cr';
        } elseif ($num >= 100000) {
            $p['price'] = '₹ ' . round($num / 100000, 2) . ' L';
        } else {
            $p['price'] = '₹ ' . number_format($num);
        }
    }
    if (is_numeric($p['sqft']) && (int)$p['sqft'] > 0) {
        $p['sqft'] = $p['sqft'] . ' sq.ft';
    }
}
unset($p);

Response::success([
    'total'      => count($properties),
    'properties' => $properties
], 'User properties retrieved successfully');
