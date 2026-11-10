<?php
/**
 * POST /api/subscriptions/consume-entitlement.php
 * Configurable Backend Entitlement Engine.
 * 
 * Enforces limits on project_view_limit, comparison_limit, advisory_session_limit, site_visit_limit.
 * Tracks unique project views in user_project_views so repeat visits to the same project
 * DO NOT burn multiple credits.
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

$userId     = max(1, (int)($input['userId'] ?? 1));
$action     = trim((string)($input['action'] ?? 'project_view')); // 'project_view' | 'comparison' | 'advisory_session' | 'site_visit'
$propertyId = trim((string)($input['propertyId'] ?? ''));

$validActions = ['project_view', 'comparison', 'advisory_session', 'site_visit'];
if (!in_array($action, $validActions, true)) {
    Response::error('Invalid entitlement action: ' . $action, 422);
}

$db = (new Database())->getConnection();

try {
    $db->beginTransaction();

    // 1. Fetch current entitlements for user
    $entStmt = $db->prepare("
        SELECT * 
        FROM user_entitlements 
        WHERE user_id = ? 
        FOR UPDATE
    ");
    $entStmt->execute([$userId]);
    $ent = $entStmt->fetch(PDO::FETCH_ASSOC);

    if (!$ent) {
        // Initialize baseline explorer entitlement
        $ins = $db->prepare("
            INSERT INTO user_entitlements (
                user_id, plan_id, project_views_used, project_view_limit,
                comparisons_used, comparison_limit, advisory_sessions_used,
                advisory_session_limit, site_visits_used, site_visit_limit,
                expires_at
            ) VALUES (
                ?, 'explorer', 0, 2, 0, 1, 0, 1, 0, 0, DATE_ADD(NOW(), INTERVAL 365 DAY)
            )
        ");
        $ins->execute([$userId]);
        $entStmt->execute([$userId]);
        $ent = $entStmt->fetch(PDO::FETCH_ASSOC);
    }

    // 2. Process Action
    if ($action === 'project_view') {
        if (empty($propertyId)) {
            $db->rollBack();
            Response::error('Property ID is required to verify project view entitlement', 422);
        }

        // Check if user has ALREADY viewed this specific property
        $checkViewStmt = $db->prepare("
            SELECT id, viewed_at 
            FROM user_project_views 
            WHERE user_id = ? AND UPPER(TRIM(property_id)) = UPPER(TRIM(?))
        ");
        $checkViewStmt->execute([$userId, $propertyId]);
        $existingView = $checkViewStmt->fetch(PDO::FETCH_ASSOC);

        if ($existingView) {
            // Repeat view! Allowed without burning credits
            $db->commit();
            Response::success([
                'allowed'               => true,
                'isRepeatView'          => true,
                'creditsBurned'         => 0,
                'projectViewsUsed'      => (int)$ent['project_views_used'],
                'projectViewLimit'      => (int)$ent['project_view_limit'],
                'projectViewsRemaining' => max(0, (int)$ent['project_view_limit'] - (int)$ent['project_views_used']),
                'message'               => 'Project already unlocked in private dossier. 0 credits burned.'
            ], 'Repeat project view authorized without credit deduction');
            exit;
        }

        // First time viewing this property: verify limit
        $used  = (int)$ent['project_views_used'];
        $limit = (int)$ent['project_view_limit'];

        if ($used >= $limit) {
            $db->rollBack();
            Response::error('Project view limit reached for your ' . ucfirst($ent['plan_id']) . ' plan. Upgrade your subscription to unlock additional project dossiers.', 403, [
                'allowed'               => false,
                'limitReached'          => true,
                'action'                => 'project_view',
                'planId'                => $ent['plan_id'],
                'used'                  => $used,
                'limit'                 => $limit,
                'upgradeRequired'       => true
            ]);
            exit;
        }

        // Consume 1 project view credit & record unique view
        $recView = $db->prepare("
            INSERT INTO user_project_views (user_id, property_id, viewed_at)
            VALUES (?, ?, NOW())
        ");
        $recView->execute([$userId, $propertyId]);

        $updEnt = $db->prepare("
            UPDATE user_entitlements 
            SET project_views_used = project_views_used + 1 
            WHERE user_id = ?
        ");
        $updEnt->execute([$userId]);

        $db->commit();

        $newUsed = $used + 1;
        Response::success([
            'allowed'               => true,
            'isRepeatView'          => false,
            'creditsBurned'         => 1,
            'projectViewsUsed'      => $newUsed,
            'projectViewLimit'      => $limit,
            'projectViewsRemaining' => max(0, $limit - $newUsed),
            'message'               => 'Project view credit consumed successfully'
        ], 'Project view credit consumed');
        exit;
    }

    if ($action === 'comparison') {
        $used  = (int)$ent['comparisons_used'];
        $limit = (int)$ent['comparison_limit'];

        if ($used >= $limit) {
            $db->rollBack();
            Response::error('Comparison limit reached for your plan. Upgrade your subscription to compare more projects.', 403, [
                'allowed'         => false,
                'limitReached'    => true,
                'action'          => 'comparison',
                'planId'          => $ent['plan_id'],
                'used'            => $used,
                'limit'           => $limit,
                'upgradeRequired' => true
            ]);
            exit;
        }

        $updEnt = $db->prepare("UPDATE user_entitlements SET comparisons_used = comparisons_used + 1 WHERE user_id = ?");
        $updEnt->execute([$userId]);
        $db->commit();

        $newUsed = $used + 1;
        Response::success([
            'allowed'              => true,
            'creditsBurned'        => 1,
            'comparisonsUsed'      => $newUsed,
            'comparisonLimit'      => $limit,
            'comparisonsRemaining' => max(0, $limit - $newUsed)
        ], 'Comparison credit consumed');
        exit;
    }

    if ($action === 'advisory_session') {
        $used  = (int)$ent['advisory_sessions_used'];
        $limit = (int)$ent['advisory_session_limit'];

        if ($used >= $limit) {
            $db->rollBack();
            Response::error('Advisory session limit reached for your plan. Upgrade your subscription to book more consultation sessions.', 403, [
                'allowed'         => false,
                'limitReached'    => true,
                'action'          => 'advisory_session',
                'planId'          => $ent['plan_id'],
                'used'            => $used,
                'limit'           => $limit,
                'upgradeRequired' => true
            ]);
            exit;
        }

        $updEnt = $db->prepare("UPDATE user_entitlements SET advisory_sessions_used = advisory_sessions_used + 1 WHERE user_id = ?");
        $updEnt->execute([$userId]);
        $db->commit();

        $newUsed = $used + 1;
        Response::success([
            'allowed'                   => true,
            'creditsBurned'             => 1,
            'advisorySessionsUsed'      => $newUsed,
            'advisorySessionLimit'      => $limit,
            'advisorySessionsRemaining' => max(0, $limit - $newUsed)
        ], 'Advisory session credit consumed');
        exit;
    }

    if ($action === 'site_visit') {
        $used  = (int)$ent['site_visits_used'];
        $limit = (int)$ent['site_visit_limit'];

        if ($used >= $limit) {
            $db->rollBack();
            Response::error('Site visit limit reached. Upgrade to Priority Buyer or VIP Concierge to request chauffeured site visits.', 403, [
                'allowed'         => false,
                'limitReached'    => true,
                'action'          => 'site_visit',
                'planId'          => $ent['plan_id'],
                'used'            => $used,
                'limit'           => $limit,
                'upgradeRequired' => true
            ]);
            exit;
        }

        $updEnt = $db->prepare("UPDATE user_entitlements SET site_visits_used = site_visits_used + 1 WHERE user_id = ?");
        $updEnt->execute([$userId]);
        $db->commit();

        $newUsed = $used + 1;
        Response::success([
            'allowed'             => true,
            'creditsBurned'       => 1,
            'siteVisitsUsed'      => $newUsed,
            'siteVisitLimit'      => $limit,
            'siteVisitsRemaining' => max(0, $limit - $newUsed)
        ], 'Site visit credit consumed');
        exit;
    }

} catch (\Throwable $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    Response::error('Entitlement verification failed: ' . $e->getMessage(), 500);
}

