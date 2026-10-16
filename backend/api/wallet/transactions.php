<?php
/**
 * GET /api/wallet/transactions.php
 * Fetches transaction history and financial summary for the wallet page.
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

use Mannidam\Config\Database;
use Mannidam\Helpers\Response;

Response::initCors();

$userId = (int)($_GET['userId'] ?? 1);
$type = trim((string)($_GET['type'] ?? '')); // optional filter: 'all', 'credit_purchase', 'debit_unlock', 'bonus_credit'

if ($userId <= 0) {
    Response::error('Invalid user identifier', 422);
}

$db = (new Database())->getConnection();

// 1. Fetch user current points balance
$uStmt = $db->prepare("SELECT id, name, email, phone, points_balance FROM users WHERE id = ?");
$uStmt->execute([$userId]);
$user = $uStmt->fetch();

if (!$user) {
    Response::error('User account not found', 404);
}

// 2. Fetch transactions
$query = "
    SELECT 
        id,
        user_id AS userId,
        transaction_type AS transactionType,
        points,
        amount_rupees AS amountRupees,
        razorpay_order_id AS razorpayOrderId,
        razorpay_payment_id AS razorpayPaymentId,
        description,
        status,
        created_at AS createdAt
    FROM wallet_transactions
    WHERE user_id = ?
";
$params = [$userId];

if (!empty($type) && in_array($type, ['credit_purchase', 'debit_unlock', 'bonus_credit'], true)) {
    $query .= " AND transaction_type = ?";
    $params[] = $type;
}

$query .= " ORDER BY id DESC LIMIT 100";

$stmt = $db->prepare($query);
$stmt->execute($params);
$rows = $stmt->fetchAll();

$transactions = [];
$totalSpentRupees = 0.0;
$totalPointsPurchased = 0;
$totalPointsUnlocked = 0;

foreach ($rows as $r) {
    $txPoints = (int)$r['points'];
    $txAmount = (float)$r['amountRupees'];
    $txType = (string)$r['transactionType'];

    if ($txType === 'credit_purchase' || $txType === 'bonus_credit') {
        $totalPointsPurchased += $txPoints;
        $totalSpentRupees += $txAmount;
    } elseif ($txType === 'debit_unlock') {
        $totalPointsUnlocked += abs($txPoints);
    }

    $transactions[] = [
        'id'                => (int)$r['id'],
        'userId'            => (int)$r['userId'],
        'transactionType'   => $txType,
        'points'            => $txPoints,
        'amountRupees'      => $txAmount,
        'razorpayOrderId'   => $r['razorpayOrderId'],
        'razorpayPaymentId' => $r['razorpayPaymentId'] ?? 'pay_sim_' . $r['id'],
        'description'       => (string)$r['description'],
        'status'            => (string)$r['status'],
        'createdAt'         => (string)$r['createdAt'],
    ];
}

// 3. Fetch count of unlocked 4K properties
$unlockStmt = $db->prepare("SELECT COUNT(*) FROM property_media_unlocks WHERE user_id = ?");
$unlockStmt->execute([$userId]);
$unlockedToursCount = (int)$unlockStmt->fetchColumn();

Response::success([
    'balance'              => (int)$user['points_balance'],
    'balanceRupeesValue'   => (int)$user['points_balance'] * 50,
    'totalSpentRupees'     => $totalSpentRupees,
    'totalPointsPurchased' => $totalPointsPurchased,
    'totalPointsUnlocked'  => $totalPointsUnlocked,
    'unlockedToursCount'   => $unlockedToursCount,
    'transactions'         => $transactions,
], 'Wallet transactions retrieved successfully');
