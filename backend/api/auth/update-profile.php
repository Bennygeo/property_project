<?php
/**
 * POST /api/auth/update-profile.php
 * Updates user profile name, email, and preferences in MySQL database.
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
$userId = (int)($input['id'] ?? 1);
$name   = trim((string)($input['name'] ?? ''));
$email  = trim((string)($input['email'] ?? ''));
$phone  = trim((string)($input['phone'] ?? ''));

if ($userId <= 0) {
    Response::error('Invalid user ID', 422);
}

if (empty($name)) {
    Response::error('Full name is required', 422);
}

if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    Response::error('A valid email address is required', 422);
}

$db = (new Database())->getConnection();

// Check if email already in use by another user
$checkStmt = $db->prepare("SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1");
$checkStmt->execute([$email, $userId]);
if ($checkStmt->fetch()) {
    Response::error('Email address is already in use by another account', 409);
}

$updateStmt = $db->prepare("
    UPDATE users 
    SET name = ?, email = ?, phone = COALESCE(NULLIF(?, ''), phone)
    WHERE id = ?
");
$updateStmt->execute([$name, $email, $phone, $userId]);

$userStmt = $db->prepare("SELECT id, name, email, phone, role, points_balance AS pointsBalance, created_at AS createdAt FROM users WHERE id = ?");
$userStmt->execute([$userId]);
$updatedUser = $userStmt->fetch();

Response::success($updatedUser, 'Profile updated successfully');
