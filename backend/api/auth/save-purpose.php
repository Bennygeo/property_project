<?php
/**
 * POST /api/auth/save-purpose.php
 * Saves user's primary goal / visitor purpose to MySQL database.
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
$userId  = (int)($input['userId'] ?? $input['id'] ?? 0);
$purpose = trim((string)($input['purpose'] ?? $input['primaryGoal'] ?? ''));
$phone   = trim((string)($input['phone'] ?? ''));

if (empty($purpose)) {
    Response::error('Purpose is required', 422);
}

$db = (new Database())->getConnection();

// Ensure primary_goal column exists
try {
    $db->exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_goal VARCHAR(100) NULL AFTER role");
} catch (\Throwable $e) {}

$updated = false;

if ($userId > 0) {
    $stmt = $db->prepare("UPDATE users SET primary_goal = ? WHERE id = ?");
    $stmt->execute([$purpose, $userId]);
    $updated = ($stmt->rowCount() > 0);
} else if (!empty($phone)) {
    $cleanPhone = preg_replace('/[^\d+]/', '', $phone);
    $last10 = substr(preg_replace('/[^\d]/', '', $cleanPhone), -10);
    $stmt = $db->prepare("UPDATE users SET primary_goal = ? WHERE phone LIKE ? OR phone LIKE ?");
    $stmt->execute([$purpose, "%{$last10}", "%{$cleanPhone}%"]);
    $updated = ($stmt->rowCount() > 0);
}

Response::success([
    'saved'   => true,
    'purpose' => $purpose,
    'userId'  => $userId
], 'Primary goal saved successfully');
