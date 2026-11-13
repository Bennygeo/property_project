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
if ($userId <= 1) {
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
$developerId = (int)($user['developer_id'] ?? 0);

if ($role === 'developer' && $developerId > 0) {
    // Developers see projects linked to their assigned developer company ID (or direct property submissions)
    $stmt = $db->prepare("
        SELECT
            p.project_id AS id,
            p.project_id AS projectId,
            p.project_name AS title,
            p.project_name AS projectName,
            p.developer_name AS developerName,
            p.developer_name,
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
            p.cover_image AS mainImageUrl,
            p.rera_no AS reraNumber,
            p.status,
            p.submitted_by AS submittedByName,
            p.reviewed_by AS reviewedByName,
            p.reviewed_at AS reviewedAt,
            p.review_notes AS reviewNotes,
            p.rejection_reason AS rejectionReason,
            p.created_at AS createdAt,
            p.updated_at AS updatedAt
        FROM projects p
        LEFT JOIN properties prop ON UPPER(TRIM(prop.id)) = UPPER(TRIM(p.project_id))
        WHERE p.developer_id = :devId
           OR prop.submitted_by_user_id = :userId
        ORDER BY p.created_at DESC
    ");
    $stmt->execute([
        ':devId'  => $developerId,
        ':userId' => $userId
    ]);
    $properties = $stmt->fetchAll(PDO::FETCH_ASSOC);
} else {
    // Standard buyers/users ONLY see properties they personally submitted via Create Property
    $stmt = $db->prepare("
        SELECT
            prop.id AS id,
            prop.id AS projectId,
            prop.title AS title,
            COALESCE(p.project_name, prop.title) AS projectName,
            COALESCE(p.developer_name, prop.submitted_by_name) AS developerName,
            prop.property_type AS propertyType,
            prop.listing_mode AS listingMode,
            prop.locality_name AS localityName,
            prop.city_name AS cityName,
            COALESCE(p.district, prop.city_name) AS district,
            prop.price AS price,
            prop.price_per_sqft AS pricePerSqft,
            prop.sqft AS sqft,
            prop.bhk_badge AS bhkBadge,
            prop.facing_or_view AS facingOrView,
            prop.main_image_url AS mainImageUrl,
            prop.rera_number AS reraNumber,
            prop.status AS status,
            prop.submitted_by_name AS submittedByName,
            prop.reviewed_by_name AS reviewedByName,
            prop.reviewed_at AS reviewedAt,
            prop.review_notes AS reviewNotes,
            prop.rejection_reason AS rejectionReason,
            prop.created_at AS createdAt,
            prop.updated_at AS updatedAt
        FROM properties prop
        LEFT JOIN projects p ON UPPER(TRIM(p.project_id)) = UPPER(TRIM(prop.id))
        WHERE prop.submitted_by_user_id = :userId
          AND prop.submitted_by_role = 'user'
        ORDER BY prop.created_at DESC
    ");
    $stmt->execute([':userId' => $userId]);
    $properties = $stmt->fetchAll(PDO::FETCH_ASSOC);
}

Response::success([
    'total'      => count($properties),
    'properties' => $properties
], 'User properties retrieved successfully');
