<?php
/**
 * GET /api/wallet/balance.php
 * Fetches user's current points balance and list of unlocked property IDs.
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

use Mannidam\Config\Database;
use Mannidam\Helpers\Response;

Response::initCors();

$db = (new Database())->getConnection();

// Default demo user ID = 1 (can be substituted with session/JWT in production)
$userId = (int)($_GET['userId'] ?? 1);

// 1. Fetch User Points Balance
$uStmt = $db->prepare("SELECT id, name, email, points_balance AS balance FROM users WHERE id = ?");
$uStmt->execute([$userId]);
$user = $uStmt->fetch();

if (!$user) {
    Response::error('User not found', 404);
}

// 2. Fetch All Unlocked Property IDs for this User
$unlockStmt = $db->prepare("SELECT property_id FROM property_media_unlocks WHERE user_id = ?");
$unlockStmt->execute([$userId]);
$unlockedPropertyIds = $unlockStmt->fetchAll(PDO::FETCH_COLUMN);

Response::success([
    'userId'             => (int)$user['id'],
    'userName'           => $user['name'],
    'balance'            => (int)$user['balance'],
    'unlockedProperties' => $unlockedPropertyIds,
], 'Wallet balance retrieved');
