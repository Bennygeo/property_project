<?php
/**
 * GET & POST /api/admin/financials.php
 * Administrative Financial & Wallet Credit Dashboard
 * Tracks Razorpay collections, UPI, Cards, NetBanking, and other payment channels.
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

use Mannidam\Config\Database;
use Mannidam\Helpers\Response;

Response::initCors();

$db = (new Database())->getConnection();

// =========================================================================
// POST: Process Manual / Offline Administrative Credit Adjustment
// =========================================================================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        Response::error('Invalid JSON payload', 400);
    }

    $targetUserId = (int)($input['userId'] ?? 0);
    $points       = (int)($input['points'] ?? 0);
    $amountRupees = (float)($input['amountRupees'] ?? 0.0);
    $method       = trim((string)($input['paymentMethod'] ?? 'Direct Bank Wire (NEFT/RTGS)'));
    $notes        = trim((string)($input['notes'] ?? ''));
    $adminId      = (int)($input['adminId'] ?? 103);
    $adminName    = trim((string)($input['adminName'] ?? 'Administrator'));

    if ($targetUserId <= 0) {
        Response::error('Target customer user ID is required', 400);
    }

    if ($points <= 0) {
        Response::error('Points to credit must be greater than 0', 400);
    }

    try {
        $db->beginTransaction();

        // 1. Fetch user
        $uStmt = $db->prepare("SELECT id, name, email, points_balance FROM users WHERE id = ? FOR UPDATE");
        $uStmt->execute([$targetUserId]);
        $user = $uStmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            $db->rollBack();
            Response::error('Customer account not found', 404);
        }

        $oldBalance = (int)$user['points_balance'];
        $newBalance = $oldBalance + $points;

        // 2. Update user balance
        $upStmt = $db->prepare("UPDATE users SET points_balance = ? WHERE id = ?");
        $upStmt->execute([$newBalance, $targetUserId]);

        // 3. Create wallet transaction
        $refId = 'adm_man_' . bin2hex(random_bytes(6));
        $desc = "Administrative Credit: {$points} Pts (₹{$amountRupees}) via {$method}" . ($notes ? " [Note: {$notes}]" : "") . " (Approved by {$adminName})";

        $txnStmt = $db->prepare("
            INSERT INTO wallet_transactions 
                (user_id, transaction_type, points, amount_rupees, payment_method, razorpay_payment_id, description, status, created_at)
            VALUES 
                (?, 'credit_purchase', ?, ?, ?, ?, ?, 'success', NOW())
        ");
        $txnStmt->execute([$targetUserId, $points, $amountRupees, $method, $refId, $desc]);
        $txnId = (int)$db->lastInsertId();

        // 4. Log in admin activity logs
        try {
            $logStmt = $db->prepare("
                INSERT INTO admin_activity_logs 
                    (admin_id, admin_name, action_type, property_id, property_title, notes, target_user_id, target_user_name, created_at)
                VALUES 
                    (?, ?, 'approve_user_review', NULL, NULL, ?, ?, ?, NOW())
            ");
            $logStmt->execute([$adminId, $adminName, "Manual wallet credit issued: {$points} Pts (₹{$amountRupees}) via {$method}", $targetUserId, $user['name']]);
        } catch (\Throwable $t) {}

        $db->commit();

        Response::success([
            'transactionId' => $txnId,
            'userId'        => $targetUserId,
            'customerName'  => $user['name'],
            'pointsCredited'=> $points,
            'amountRupees'  => $amountRupees,
            'newBalance'    => $newBalance,
            'referenceId'   => $refId,
            'paymentMethod' => $method
        ], "Successfully credited {$points} points to {$user['name']}.");

    } catch (\Throwable $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        Response::error('Failed to process manual credit: ' . $e->getMessage(), 500);
    }
}

// =========================================================================
// GET: Financial Metrics & Ledger Query
// =========================================================================
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    Response::error('Method not allowed', 405);
}

$gatewayFilter = strtolower(trim((string)($_GET['gateway'] ?? 'all')));
$statusFilter  = strtolower(trim((string)($_GET['status'] ?? 'all')));
$timeframe     = strtolower(trim((string)($_GET['timeframe'] ?? 'all')));
$search        = trim((string)($_GET['q'] ?? ''));

// 1. Overall Aggregates (All successful credit transactions)
$aggStmt = $db->query("
    SELECT 
        COUNT(*) AS total_txns,
        COALESCE(SUM(amount_rupees), 0) AS total_revenue,
        COALESCE(SUM(points), 0) AS total_points,
        COUNT(DISTINCT user_id) AS total_users,
        
        -- Razorpay Specifics
        COALESCE(SUM(CASE 
            WHEN LOWER(payment_method) LIKE '%razorpay%' OR LOWER(description) LIKE '%razorpay%' OR razorpay_payment_id LIKE 'pay_rzp_%' 
            THEN amount_rupees ELSE 0 END), 0) AS razorpay_revenue,
            
        COALESCE(SUM(CASE 
            WHEN LOWER(payment_method) LIKE '%razorpay%' OR LOWER(description) LIKE '%razorpay%' OR razorpay_payment_id LIKE 'pay_rzp_%' 
            THEN points ELSE 0 END), 0) AS razorpay_points,
            
        COUNT(CASE 
            WHEN LOWER(payment_method) LIKE '%razorpay%' OR LOWER(description) LIKE '%razorpay%' OR razorpay_payment_id LIKE 'pay_rzp_%' 
            THEN 1 END) AS razorpay_txns,

        -- Other Gateways / Channels
        COALESCE(SUM(CASE 
            WHEN NOT (LOWER(payment_method) LIKE '%razorpay%' OR LOWER(description) LIKE '%razorpay%' OR razorpay_payment_id LIKE 'pay_rzp_%')
            THEN amount_rupees ELSE 0 END), 0) AS other_revenue,
            
        COALESCE(SUM(CASE 
            WHEN NOT (LOWER(payment_method) LIKE '%razorpay%' OR LOWER(description) LIKE '%razorpay%' OR razorpay_payment_id LIKE 'pay_rzp_%')
            THEN points ELSE 0 END), 0) AS other_points,
            
        COUNT(CASE 
            WHEN NOT (LOWER(payment_method) LIKE '%razorpay%' OR LOWER(description) LIKE '%razorpay%' OR razorpay_payment_id LIKE 'pay_rzp_%')
            THEN 1 END) AS other_txns
            
    FROM wallet_transactions
    WHERE transaction_type IN ('credit_purchase', 'bonus_credit')
      AND status = 'success'
");

$agg = $aggStmt->fetch(PDO::FETCH_ASSOC);

$totalRev = (float)$agg['total_revenue'];
$rzpRev   = (float)$agg['razorpay_revenue'];
$othRev   = (float)$agg['other_revenue'];
$totalTxn = (int)$agg['total_txns'];

$rzpPct = $totalRev > 0 ? round(($rzpRev / $totalRev) * 100, 1) : 0;
$othPct = $totalRev > 0 ? round(($othRev / $totalRev) * 100, 1) : 0;
$aov    = $totalTxn > 0 ? round($totalRev / $totalTxn, 2) : 0;

$kpiSummary = [
    'totalRevenueRupees'    => $totalRev,
    'razorpayRevenueRupees' => $rzpRev,
    'otherRevenueRupees'    => $othRev,
    'razorpayPercentage'    => $rzpPct,
    'otherPercentage'       => $othPct,
    'totalPointsCredited'   => (int)$agg['total_points'],
    'razorpayPoints'        => (int)$agg['razorpay_points'],
    'otherPoints'           => (int)$agg['other_points'],
    'totalOrdersCount'      => $totalTxn,
    'razorpayOrdersCount'   => (int)$agg['razorpay_txns'],
    'otherOrdersCount'      => (int)$agg['other_txns'],
    'averageOrderValue'     => $aov,
    'uniqueInvestorsCount'  => (int)$agg['total_users']
];

// 2. Channel & Gateway Breakdown
$chanStmt = $db->query("
    SELECT 
        COALESCE(payment_method, 'Direct Credit') AS channel_name,
        COUNT(*) AS txn_count,
        COALESCE(SUM(amount_rupees), 0) AS channel_revenue,
        COALESCE(SUM(points), 0) AS channel_points
    FROM wallet_transactions
    WHERE transaction_type IN ('credit_purchase', 'bonus_credit')
      AND status = 'success'
    GROUP BY channel_name
    ORDER BY channel_revenue DESC
");

$channelRows = $chanStmt->fetchAll(PDO::FETCH_ASSOC);
$channels = [];

foreach ($channelRows as $c) {
    $cRev = (float)$c['channel_revenue'];
    $cPct = $totalRev > 0 ? round(($cRev / $totalRev) * 100, 1) : 0;
    $isRzp = str_contains(strtolower($c['channel_name']), 'razorpay');

    $channels[] = [
        'name'         => $c['channel_name'],
        'isRazorpay'   => $isRzp,
        'count'        => (int)$c['txn_count'],
        'amountRupees' => $cRev,
        'points'       => (int)$c['channel_points'],
        'percentage'   => $cPct,
        'badgeTheme'   => $isRzp ? 'blue' : (str_contains(strtolower($c['channel_name']), 'upi') ? 'emerald' : 'purple')
    ];
}

// 3. Filtered Transactions Ledger
$whereClauses = ["t.transaction_type IN ('credit_purchase', 'bonus_credit')"];
$params = [];

// Gateway filter
if ($gatewayFilter === 'razorpay') {
    $whereClauses[] = "(LOWER(t.payment_method) LIKE '%razorpay%' OR LOWER(t.description) LIKE '%razorpay%' OR t.razorpay_payment_id LIKE 'pay_rzp_%')";
} elseif ($gatewayFilter === 'others') {
    $whereClauses[] = "(NOT (LOWER(t.payment_method) LIKE '%razorpay%' OR LOWER(t.description) LIKE '%razorpay%' OR t.razorpay_payment_id LIKE 'pay_rzp_%'))";
} elseif ($gatewayFilter === 'upi') {
    $whereClauses[] = "LOWER(t.payment_method) LIKE '%upi%'";
} elseif ($gatewayFilter === 'cards') {
    $whereClauses[] = "(LOWER(t.payment_method) LIKE '%card%' OR LOWER(t.payment_method) LIKE '%visa%' OR LOWER(t.payment_method) LIKE '%mastercard%')";
} elseif ($gatewayFilter === 'netbanking') {
    $whereClauses[] = "LOWER(t.payment_method) LIKE '%banking%'";
}

// Status filter
if ($statusFilter !== 'all' && in_array($statusFilter, ['success', 'pending', 'failed'], true)) {
    $whereClauses[] = "t.status = :status";
    $params[':status'] = $statusFilter;
}

// Timeframe filter
if ($timeframe === 'today') {
    $whereClauses[] = "DATE(t.created_at) = CURDATE()";
} elseif ($timeframe === '7days') {
    $whereClauses[] = "t.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
} elseif ($timeframe === '30days') {
    $whereClauses[] = "t.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
}

// Search filter
if (!empty($search)) {
    $whereClauses[] = "(
        u.name LIKE :q1 
        OR u.email LIKE :q2 
        OR u.phone LIKE :q3 
        OR t.razorpay_payment_id LIKE :q4 
        OR t.description LIKE :q5 
        OR CAST(t.id AS CHAR) = :q6
    )";
    $likeSearch = "%{$search}%";
    $params[':q1'] = $likeSearch;
    $params[':q2'] = $likeSearch;
    $params[':q3'] = $likeSearch;
    $params[':q4'] = $likeSearch;
    $params[':q5'] = $likeSearch;
    $params[':q6'] = $search;
}

$whereSql = implode(' AND ', $whereClauses);

$listQuery = "
    SELECT 
        t.id,
        t.user_id,
        t.transaction_type,
        t.points,
        t.amount_rupees,
        COALESCE(t.payment_method, 'Razorpay Gateway') AS payment_method,
        t.razorpay_payment_id,
        t.razorpay_order_id,
        t.description,
        t.status,
        t.created_at,
        u.name  AS user_name,
        u.email AS user_email,
        u.phone AS user_phone,
        u.role  AS user_role
    FROM wallet_transactions t
    LEFT JOIN users u ON t.user_id = u.id
    WHERE {$whereSql}
    ORDER BY t.created_at DESC
    LIMIT 100
";

$listStmt = $db->prepare($listQuery);
$listStmt->execute($params);
$txnRows = $listStmt->fetchAll(PDO::FETCH_ASSOC);

$transactions = [];
foreach ($txnRows as $r) {
    $method = $r['payment_method'];
    $isRzp = str_contains(strtolower($method), 'razorpay') || str_starts_with((string)$r['razorpay_payment_id'], 'pay_rzp_');

    $transactions[] = [
        'id'                => (int)$r['id'],
        'userId'            => (int)$r['user_id'],
        'userName'          => $r['user_name'] ?? 'Guest Buyer',
        'userEmail'         => $r['user_email'] ?? '—',
        'userPhone'         => $r['user_phone'] ?? '—',
        'userRole'          => $r['user_role'] ?? 'buyer',
        'transactionType'   => $r['transaction_type'],
        'points'            => (int)$r['points'],
        'amountRupees'      => (float)$r['amount_rupees'],
        'paymentMethod'     => $method,
        'isRazorpay'        => $isRzp,
        'razorpayPaymentId' => $r['razorpay_payment_id'] ?: '—',
        'razorpayOrderId'   => $r['razorpay_order_id'] ?: '—',
        'description'       => $r['description'],
        'status'            => $r['status'] ?: 'success',
        'createdAt'         => $r['created_at'],
        'formattedDate'     => date('d M Y, h:i A', strtotime($r['created_at']))
    ];
}

Response::success([
    'summary'      => $kpiSummary,
    'channels'     => $channels,
    'transactions' => $transactions,
    'filterMeta'   => [
        'gateway'   => $gatewayFilter,
        'status'    => $statusFilter,
        'timeframe' => $timeframe,
        'totalRows' => count($transactions)
    ]
], 'Admin financial credit data retrieved successfully.');
