<?php
/**
 * POST /api/auth/delete-account.php
 * Permanently removes user account and cascades data deletion across shortlists, visits, and wallet.
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
$confirmation = strtoupper(trim((string)($input['confirmation'] ?? $_POST['confirmation'] ?? $_GET['confirmation'] ?? '')));

if ($userId <= 0) {
    Response::error('Invalid user identifier', 422);
}

if ($confirmation !== 'DELETE') {
    Response::error('Please type "DELETE" to confirm account termination', 400);
}

$db = (new Database())->getConnection();

// Verify user exists
$checkStmt = $db->prepare("SELECT id, name, phone FROM users WHERE id = ?");
$checkStmt->execute([$userId]);
$user = $checkStmt->fetch();

if (!$user) {
    Response::error('User account does not exist or has already been deleted', 404);
}

// Cascade delete user
$deleteStmt = $db->prepare("DELETE FROM users WHERE id = ?");
$deleteStmt->execute([$userId]);

Response::success([
    'deletedUserId' => $userId,
    'userName'      => $user['name'],
], 'Account and all associated registry records have been permanently deleted.');
