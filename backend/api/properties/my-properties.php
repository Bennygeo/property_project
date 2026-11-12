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

$userId = (int)($_GET['user_id'] ?? 1);
$db = (new Database())->getConnection();

$stmt = $db->prepare("
    SELECT 
        p.project_id AS id,
        p.project_id AS projectId,
        p.project_name AS title,
        p.project_name AS projectName,
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
    WHERE p.developer_id = :userId OR p.submitted_by = :userIdStr
    ORDER BY p.created_at DESC
");
$stmt->execute([':userId' => $userId, ':userIdStr' => (string)$userId]);
$properties = $stmt->fetchAll(PDO::FETCH_ASSOC);

Response::success([
    'total'      => count($properties),
    'properties' => $properties
], 'User properties retrieved successfully');
