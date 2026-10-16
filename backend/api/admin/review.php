<?php
/**
 * /api/admin/review.php
 * Handles approval, rejection, and revision requests for properties.
 * Enforces the Four-Eyes / Maker-Checker rule:
 * An admin cannot self-approve a property they submitted!
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

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    Response::error('Invalid JSON payload', 400);
}

$propertyId   = trim($input['propertyId'] ?? '');
$reviewerId   = (int)($input['reviewerId'] ?? 0);
$reviewerName = trim($input['reviewerName'] ?? 'Co-Admin');
$action       = trim($input['action'] ?? ''); // 'approve', 'reject', 'request_revision'
$notes        = trim($input['notes'] ?? '');

if (empty($propertyId) || empty($reviewerId) || empty($action)) {
    Response::error('Missing required parameters: propertyId, reviewerId, and action are mandatory.', 400);
}

$db = (new Database())->getConnection();

// 1. Fetch current property state
$stmt = $db->prepare("
    SELECT id, title, status, submitted_by_user_id, submitted_by_name, submitted_by_role 
    FROM properties 
    WHERE id = :id
");
$stmt->execute([':id' => $propertyId]);
$prop = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$prop) {
    Response::error('Property not found', 404);
}

// 2. CRITICAL MAKER-CHECKER (FOUR-EYES) RULE ENFORCEMENT:
// If property was submitted by an admin/co-admin, the author CANNOT approve their own submission!
// (Revisions or rejections are permitted so that authors can flag issues or withhold drafts)
if ($action === 'approve' && (int)$prop['submitted_by_user_id'] === $reviewerId && in_array($prop['submitted_by_role'], ['admin', 'co_admin'])) {
    Response::error(
        "Maker-Checker Security Violation: You cannot approve your own listing ('{$prop['title']}'). Independent peer review by a Co-Admin is strictly required.",
        403
    );
}

// 3. Process the review action
$newStatus = 'published';
$logMessage = '';

if ($action === 'approve') {
    $newStatus = 'published';
    $logMessage = "Property approved and published live by {$reviewerName}";
    $updateStmt = $db->prepare("
        UPDATE properties 
        SET status = 'published',
            reviewed_by_user_id = :revId,
            reviewed_by_name = :revName,
            reviewed_at = NOW(),
            review_notes = :notes,
            rejection_reason = NULL
        WHERE id = :id
    ");
    $updateStmt->execute([
        ':revId'   => $reviewerId,
        ':revName' => $reviewerName,
        ':notes'   => !empty($notes) ? $notes : "Listing verified and approved by {$reviewerName} (Title deed, RERA, and cadastral survey check completed).",
        ':id'      => $propertyId
    ]);
} elseif ($action === 'reject') {
    $newStatus = 'rejected';
    $logMessage = "Property rejected by {$reviewerName}";
    $updateStmt = $db->prepare("
        UPDATE properties 
        SET status = 'rejected',
            reviewed_by_user_id = :revId,
            reviewed_by_name = :revName,
            reviewed_at = NOW(),
            rejection_reason = :reason,
            review_notes = :notes
        WHERE id = :id
    ");
    $updateStmt->execute([
        ':revId'   => $reviewerId,
        ':revName' => $reviewerName,
        ':reason'  => !empty($notes) ? $notes : "Listing details or documentation could not be verified.",
        ':notes'   => $notes,
        ':id'      => $propertyId
    ]);
} elseif ($action === 'request_revision') {
    $newStatus = 'revision_requested';
    $logMessage = "Changes requested by {$reviewerName}";
    $updateStmt = $db->prepare("
        UPDATE properties 
        SET status = 'revision_requested',
            reviewed_by_user_id = :revId,
            reviewed_by_name = :revName,
            reviewed_at = NOW(),
            review_notes = :notes
        WHERE id = :id
    ");
    $updateStmt->execute([
        ':revId'   => $reviewerId,
        ':revName' => $reviewerName,
        ':notes'   => !empty($notes) ? $notes : "Please update RERA certificate and high-resolution media before resubmission.",
        ':id'      => $propertyId
    ]);
} else {
    Response::error("Unsupported review action: {$action}", 400);
}

// Log this action to admin_activity_logs
try {
    $isPeerReview = in_array($prop['submitted_by_role'], ['admin', 'co_admin']);
    $actionType = $action === 'approve' 
        ? ($isPeerReview ? 'approve_peer_review' : 'approve_user_review')
        : ($action === 'reject' ? 'reject_property' : 'request_revision');

    $logStmt = $db->prepare("
        INSERT INTO admin_activity_logs 
          (admin_id, admin_name, action_type, property_id, property_title, notes, target_user_id, target_user_name)
        VALUES 
          (:aid, :aname, :atype, :pid, :ptitle, :notes, :tuid, :tuname)
    ");
    $logStmt->execute([
        ':aid'    => $reviewerId,
        ':aname'  => $reviewerName,
        ':atype'  => $actionType,
        ':pid'    => $propertyId,
        ':ptitle' => $prop['title'],
        ':notes'  => $notes,
        ':tuid'   => $prop['submitted_by_user_id'],
        ':tuname' => $prop['submitted_by_name']
    ]);
} catch (Exception $e) {
    // Activity log failure should not break response
}

Response::success([
    'propertyId' => $propertyId,
    'newStatus'  => $newStatus,
    'reviewedBy' => $reviewerName,
    'timestamp'  => date('Y-m-d H:i:s'),
    'message'    => $logMessage
], 'Review decision recorded successfully');
