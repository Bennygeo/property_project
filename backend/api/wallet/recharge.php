<?php
/**
 * POST /api/wallet/recharge.php
 * Processes wallet points recharge and records transaction in MySQL.
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
if (empty($input)) {
    $input = $_POST;
}

$userId = (int)($input['userId'] ?? $_POST['userId'] ?? $_GET['userId'] ?? 1);
$points = (int)($input['points'] ?? $_POST['points'] ?? $_GET['points'] ?? 0);
$bonus = (int)($input['bonus'] ?? $_POST['bonus'] ?? $_GET['bonus'] ?? 0);
$amountRupees = (float)($input['amountRupees'] ?? $_POST['amountRupees'] ?? $_GET['amountRupees'] ?? 0.0);
$paymentMethod = trim((string)($input['paymentMethod'] ?? $_POST['paymentMethod'] ?? $_GET['paymentMethod'] ?? 'UPI / Razorpay'));
$razorpayPaymentId = trim((string)($input['razorpayPaymentId'] ?? $_POST['razorpayPaymentId'] ?? $_GET['razorpayPaymentId'] ?? 'pay_' . substr(bin2hex(random_bytes(6)), 0, 12)));

if ($userId <= 0) {
    Response::error('Invalid user identifier', 422);
}

$totalPointsCredited = $points + $bonus;
if ($totalPointsCredited <= 0) {
    Response::error('Invalid recharge points amount', 422);
}

$db = (new Database())->getConnection();

try {
    $db->beginTransaction();

    // 1. Verify user exists
    $uStmt = $db->prepare("SELECT id, name, email, points_balance FROM users WHERE id = ? FOR UPDATE");
    $uStmt->execute([$userId]);
    $user = $uStmt->fetch();

    if (!$user) {
        $db->rollBack();
        Response::error('User account not found', 404);
    }

    $currentBalance = (int)$user['points_balance'];
    $newBalance = $currentBalance + $totalPointsCredited;

    // 2. Update user points balance in users table
    $updateStmt = $db->prepare("UPDATE users SET points_balance = ? WHERE id = ?");
    $updateStmt->execute([$newBalance, $userId]);

    // 3. Insert transaction ledger entry
    $description = "Wallet Recharge: {$points} Pts" . ($bonus > 0 ? " + {$bonus} Bonus Pts" : "") . " via {$paymentMethod}";
    $txnStmt = $db->prepare("
        INSERT INTO wallet_transactions 
            (user_id, transaction_type, points, amount_rupees, payment_method, razorpay_payment_id, description, status, created_at)
        VALUES 
            (?, 'credit_purchase', ?, ?, ?, ?, ?, 'success', NOW())
    ");
    $txnStmt->execute([$userId, $totalPointsCredited, $amountRupees, $paymentMethod, $razorpayPaymentId, $description]);
    $txnId = (int)$db->lastInsertId();

    $db->commit();

    Response::success([
        'transactionId'       => $txnId,
        'userId'              => $userId,
        'pointsPurchased'     => $points,
        'bonusPoints'         => $bonus,
        'totalPointsCredited' => $totalPointsCredited,
        'amountRupees'        => $amountRupees,
        'previousBalance'     => $currentBalance,
        'newBalance'          => $newBalance,
        'paymentMethod'       => $paymentMethod,
        'razorpayPaymentId'   => $razorpayPaymentId,
        'timestamp'           => date('Y-m-d H:i:s'),
    ], "Wallet successfully credited with {$totalPointsCredited} points.");

} catch (\Throwable $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    Response::error('Failed to process wallet recharge: ' . $e->getMessage(), 500);
}
