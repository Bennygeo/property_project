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
$userId = (int)($input['userId'] ?? $_POST['userId'] ?? $_GET['userId'] ?? 0);
$propertyId = trim((string)($input['propertyId'] ?? $_POST['propertyId'] ?? $_GET['propertyId'] ?? ''));

if ($userId <= 0 || empty($propertyId)) {
    Response::success(['recorded' => false], 'Unauthenticated view ignored');
    exit;
}

$db = (new Database())->getConnection();

// Upsert view timestamp
$stmt = $db->prepare("
    INSERT INTO user_view_history (user_id, property_id, viewed_at)
    VALUES (?, ?, NOW())
    ON DUPLICATE KEY UPDATE viewed_at = NOW()
");
$stmt->execute([$userId, $propertyId]);

// Immediately generate a new lead in sales_lead_interactions if not already tracked
try {
    $uChk = $db->prepare("SELECT role FROM users WHERE id = ? LIMIT 1");
    $uChk->execute([$userId]);
    $uRole = (string)($uChk->fetchColumn() ?: 'buyer');
    if (in_array($uRole, ['buyer', 'verified_buyer'], true)) {
        // Resolve property title for richer initial intention
        $pTitle = '';
        $pStmt = $db->prepare("SELECT project_name FROM projects WHERE project_id = ? LIMIT 1");
        $pStmt->execute([$propertyId]);
        $pTitle = trim((string)($pStmt->fetchColumn() ?: ''));

        $intention = $pTitle !== '' ? "Viewed {$pTitle}" : 'Viewed Property Listing';
        $leadIns = $db->prepare("
            INSERT IGNORE INTO sales_lead_interactions (user_id, status, intention, updated_at)
            VALUES (?, 'new_enquiry', ?, NOW())
        ");
        $leadIns->execute([$userId, $intention]);

        $db->prepare("UPDATE users SET last_login_at = NOW() WHERE id = ?")->execute([$userId]);
    }
} catch (\Throwable $e) {
    // Non-blocking: do not fail property view recording
}

Response::success([
    'userId'     => $userId,
    'propertyId' => $propertyId,
    'viewedAt'   => date('Y-m-d H:i:s'),
], 'View history recorded successfully');
