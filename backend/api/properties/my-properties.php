<?php
/**
 * GET /api/properties/my-properties.php?user_id=1
 * Returns properties submitted by the logged-in user with their review status.
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
        p.id,
        p.title,
        p.property_type AS propertyType,
        p.listing_mode AS listingMode,
        p.locality_name AS localityName,
        p.city_name AS cityName,
        p.price,
        p.price_per_sqft AS pricePerSqft,
        p.sqft,
        p.bhk_badge AS bhkBadge,
        p.facing_or_view AS facingOrView,
        p.main_image_url AS mainImageUrl,
        p.rera_number AS reraNumber,
        p.status,
        p.submitted_by_user_id AS submittedByUserId,
        p.submitted_by_name AS submittedByName,
        p.submitted_by_role AS submittedByRole,
        p.reviewed_by_user_id AS reviewedByUserId,
        p.reviewed_by_name AS reviewedByName,
        p.reviewed_at AS reviewedAt,
        p.review_notes AS reviewNotes,
        p.rejection_reason AS rejectionReason,
        p.created_at AS createdAt,
        p.updated_at AS updatedAt
    FROM properties p
    WHERE p.submitted_by_user_id = :userId
    ORDER BY p.created_at DESC
");
$stmt->execute([':userId' => $userId]);
$properties = $stmt->fetchAll(PDO::FETCH_ASSOC);

Response::success([
    'total'      => count($properties),
    'properties' => $properties
], 'User properties retrieved successfully');
