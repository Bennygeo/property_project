<?php
/**
 * POST /api/media/unlock.php
 * Unlocks 4K Walkthrough & Drone Surveys for a property using media points.
 * Uses atomic DB transaction to deduct points and record unlock.
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

$input      = Response::getJsonInput();
$propertyId = $input['propertyId'] ?? null;
$userId     = (int)($input['userId'] ?? 1); // Default demo user

if (empty($propertyId)) {
    Response::error('Property ID is required', 400);
}

$db = (new Database())->getConnection();

try {
    $db->beginTransaction();

    // 1. Check if already unlocked
    $checkStmt = $db->prepare("SELECT id FROM property_media_unlocks WHERE user_id = ? AND property_id = ?");
    $checkStmt->execute([$userId, $propertyId]);
    if ($checkStmt->fetch()) {
        $db->rollBack();
        Response::success([
            'alreadyUnlocked' => true,
            'propertyId'      => $propertyId
        ], 'Media for this property is already unlocked');
    }

    // 2. Fetch property media points requirement
    $propStmt = $db->prepare("SELECT id, title, media_points FROM properties WHERE id = ?");
    $propStmt->execute([$propertyId]);
    $prop = $propStmt->fetch();

    if (!$prop) {
        $db->rollBack();
        Response::error('Property not found', 404);
    }
    $pointsRequired = (int)$prop['media_points'];

    // 3. Check user balance with row-level lock (FOR UPDATE)
    $userStmt = $db->prepare("SELECT id, points_balance FROM users WHERE id = ? FOR UPDATE");
    $userStmt->execute([$userId]);
    $user = $userStmt->fetch();

    if (!$user) {
        $db->rollBack();
        Response::error('User not found', 404);
    }

    $currentBalance = (int)$user['points_balance'];
    if ($currentBalance < $pointsRequired) {
        $db->rollBack();
        Response::error("Insufficient media points. You have {$currentBalance} points but {$pointsRequired} are required.", 402, [
            'currentBalance' => $currentBalance,
            'required'       => $pointsRequired,
            'shortfall'      => $pointsRequired - $currentBalance
        ]);
    }

    // 4. Deduct points from user
    $newBalance = $currentBalance - $pointsRequired;
    $updateStmt = $db->prepare("UPDATE users SET points_balance = ? WHERE id = ?");
    $updateStmt->execute([$newBalance, $userId]);

    // 5. Record unlock entry
    $unlockStmt = $db->prepare("INSERT INTO property_media_unlocks (user_id, property_id, points_spent) VALUES (?, ?, ?)");
    $unlockStmt->execute([$userId, $propertyId, $pointsRequired]);

    // 6. Record wallet audit ledger entry
    $ledgerStmt = $db->prepare("
        INSERT INTO wallet_transactions (user_id, transaction_type, points, description, status) 
        VALUES (?, 'debit_unlock', ?, ?, 'success')
    ");
    $desc = "Unlocked 4K Tour & Drone Survey for: " . $prop['title'];
    $ledgerStmt->execute([$userId, -$pointsRequired, $desc]);

    $db->commit();

    Response::success([
        'propertyId' => $propertyId,
        'deducted'   => $pointsRequired,
        'newBalance' => $newBalance,
        'isUnlocked' => true,
    ], '4K Walkthrough & Drone Survey successfully unlocked!');

} catch (\Throwable $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    Response::error('Failed to unlock media: ' . $e->getMessage(), 500);
}
