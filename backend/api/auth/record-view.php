<?php
/**
 * POST /api/auth/record-view.php
 * Records when an authenticated or guest user views a property dossier.
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

use Mannidam\Config\Database;
use Mannidam\Helpers\Response;

Response::initCors();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Method not allowed', 405);
}

$input = Response::getJsonInput();
$userId = (int)($input['userId'] ?? $_POST['userId'] ?? $_GET['userId'] ?? 1);
$propertyId = trim((string)($input['propertyId'] ?? $_POST['propertyId'] ?? $_GET['propertyId'] ?? ''));

if ($userId <= 0 || empty($propertyId)) {
    Response::error('Invalid user or property ID', 422);
}

$db = (new Database())->getConnection();

// Upsert view timestamp
$stmt = $db->prepare("
    INSERT INTO user_view_history (user_id, property_id, viewed_at)
    VALUES (?, ?, NOW())
    ON DUPLICATE KEY UPDATE viewed_at = NOW()
");
$stmt->execute([$userId, $propertyId]);

Response::success([
    'userId'     => $userId,
    'propertyId' => $propertyId,
    'viewedAt'   => date('Y-m-d H:i:s'),
], 'View history recorded successfully');
