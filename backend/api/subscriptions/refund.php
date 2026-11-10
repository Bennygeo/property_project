<?php
/**
 * POST /api/subscriptions/refund.php
 * Handles refund tracking and processing under statutory customer protection.
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

$userId    = max(1, (int)($input['userId'] ?? 1));
$invoiceId = (int)($input['invoiceId'] ?? 0);
$reason    = trim((string)($input['reason'] ?? 'User cancellation within cooling-off period'));

if ($invoiceId <= 0) {
    Response::error('Invoice ID is required', 422);
}

$db = (new Database())->getConnection();

try {
    $db->beginTransaction();

    $invStmt = $db->prepare("SELECT * FROM subscription_invoices WHERE id = ? AND user_id = ? FOR UPDATE");
    $invStmt->execute([$invoiceId, $userId]);
    $invoice = $invStmt->fetch(PDO::FETCH_ASSOC);

    if (!$invoice) {
        $db->rollBack();
        Response::error('Invoice not found or unauthorized', 404);
    }

    if ($invoice['status'] === 'refunded') {
        $db->rollBack();
        Response::error('Invoice has already been refunded', 400);
    }

    $refundAmt = (float)$invoice['total_amount'];

    // 1. Log in subscription_refunds
    $refIns = $db->prepare("
        INSERT INTO subscription_refunds (
            invoice_id, subscription_id, user_id, refund_amount, refund_reason,
            status, razorpay_refund_id, processed_at
        ) VALUES (
            :invId, :subId, :uid, :amt, :reason,
            'processed', :rzpRef, NOW()
        )
    ");
    $refIns->execute([
        ':invId'  => $invoiceId,
        ':subId'  => (int)$invoice['subscription_id'],
        ':uid'    => $userId,
        ':amt'    => $refundAmt,
        ':reason' => $reason,
        ':rzpRef' => 'rfnd_' . substr(bin2hex(random_bytes(6)), 0, 12)
    ]);

    // 2. Update invoice status
    $updInv = $db->prepare("UPDATE subscription_invoices SET status = 'refunded' WHERE id = ?");
    $updInv->execute([$invoiceId]);

    // 3. Revert user subscription & entitlements to Explorer
    $updSub = $db->prepare("UPDATE user_subscriptions SET status = 'cancelled' WHERE id = ?");
    $updSub->execute([(int)$invoice['subscription_id']]);

    $updEnt = $db->prepare("
        UPDATE user_entitlements 
        SET plan_id = 'explorer',
            project_view_limit = 2,
            comparison_limit = 1,
            advisory_session_limit = 1,
            site_visit_limit = 0,
            has_location_report = 0,
            has_dedicated_advisor = 0,
            has_priority_advisor = 0
        WHERE user_id = ?
    ");
    $updEnt->execute([$userId]);

    $db->commit();

    Response::success([
        'refundAmount' => $refundAmt,
        'invoiceNumber'=> $invoice['invoice_number'],
        'status'       => 'processed',
        'message'      => 'Refund registered. Plan reverted to Explorer tier.'
    ], 'Refund successfully processed');

} catch (\Throwable $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    Response::error('Failed to process refund: ' . $e->getMessage(), 500);
}

