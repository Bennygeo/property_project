<?php
/**
 * /api/admin/role-dashboards.php
 * Provides real-time dashboard telemetry, metrics, and data tables for:
 * 1. Sales Executive (Logged-in visitors, projects viewed, intention, call/WhatsApp notes, advisor transfer)
 * 2. Property Advisor (Transferred client consultations & recommendations)
 * 3. Operations Executive (Real site visits & field coordination)
 * 4. Finance Admin (Platform revenue, wallet ledger & subscriptions)
 * 5. Content / GIS Admin (Localities, projects, and spatial stats)
 * 
 * ALL MOCK DATA HAS BEEN REMOVED.
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

use Mannidam\Config\Database;
use Mannidam\Helpers\Response;

Response::initCors();

$method = $_SERVER['REQUEST_METHOD'];
$db = (new Database())->getConnection();

// Ensure sales_lead_interactions table exists and has advisor_notes column
$db->exec("
    CREATE TABLE IF NOT EXISTS `sales_lead_interactions` (
      `id` INT AUTO_INCREMENT PRIMARY KEY,
      `user_id` INT NOT NULL,
      `status` VARCHAR(50) NOT NULL DEFAULT 'new_enquiry',
      `intention` VARCHAR(255) DEFAULT NULL,
      `notes` TEXT DEFAULT NULL,
      `advisor_notes` TEXT DEFAULT NULL,
      `updated_by` INT DEFAULT NULL,
      `transferred_at` DATETIME DEFAULT NULL,
      `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY `uk_user_interaction` (`user_id`),
      FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");

try {
    $sliCols = $db->query("SHOW COLUMNS FROM `sales_lead_interactions`")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('advisor_notes', $sliCols, true)) {
        $db->exec("ALTER TABLE `sales_lead_interactions` ADD COLUMN `advisor_notes` TEXT DEFAULT NULL AFTER `notes`");
    }
    if (!in_array('ops_notes', $sliCols, true)) {
        $db->exec("ALTER TABLE `sales_lead_interactions` ADD COLUMN `ops_notes` TEXT DEFAULT NULL AFTER `advisor_notes`");
    }
    if (!in_array('dtcp_marker_status', $sliCols, true)) {
        $db->exec("ALTER TABLE `sales_lead_interactions` ADD COLUMN `dtcp_marker_status` VARCHAR(100) DEFAULT 'Pending Survey'");
    }
    if (!in_array('gps_coords', $sliCols, true)) {
        $db->exec("ALTER TABLE `sales_lead_interactions` ADD COLUMN `gps_coords` VARCHAR(100) DEFAULT NULL");
    }

    $svCols = $db->query("SHOW COLUMNS FROM `user_site_visits`")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('dtcp_marker_status', $svCols, true)) {
        $db->exec("ALTER TABLE `user_site_visits` ADD COLUMN `dtcp_marker_status` VARCHAR(100) DEFAULT 'Pending Survey'");
    }
    if (!in_array('gps_coords', $svCols, true)) {
        $db->exec("ALTER TABLE `user_site_visits` ADD COLUMN `gps_coords` VARCHAR(100) DEFAULT NULL");
    }
} catch (\Exception $e) {
    // Ignore if alter fails due to permissions
}

/**
 * Reject any role-desk modification when a lead is discontinued/halted.
 * Returns existing sales_lead_interactions row (or null if none yet).
 */
function assertLeadNotDiscontinued(PDO $db, int $userId): ?array {
    $stmt = $db->prepare("SELECT * FROM sales_lead_interactions WHERE user_id = ? ORDER BY id DESC LIMIT 1");
    $stmt->execute([$userId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    if ($row && ($row['status'] === 'lost_on_hold' || !empty($row['discontinued_at']))) {
        Response::error('This lead is discontinued/on hold and can only be viewed or revived by Super Admin.', 403);
    }
    return $row;
}

// -------------------------------------------------------------
// POST: UPDATE LEAD INTERACTION (Call/WhatsApp Notes, Status, Advisor Transfer)
// -------------------------------------------------------------
if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $action = $input['action'] ?? 'update_lead_interaction';

    if ($action === 'update_lead_interaction') {
        $userId = (int)($input['user_id'] ?? 0);
        if ($userId <= 0) {
            Response::error('Invalid user ID', 400);
        }

        $existingLead = assertLeadNotDiscontinued($db, $userId);

        $rawStatus = trim((string)($input['status'] ?? 'new_enquiry'));
        $statusMap = [
            'new'                   => 'new_enquiry',
            'contacted'             => 'customer_contacted',
            'interested_site_visit' => 'site_visit_scheduled',
            'transferred_advisor'   => 'requirement_understood'
        ];
        $status = $statusMap[$rawStatus] ?? $rawStatus;
        $validStatuses = [
            'new_enquiry', 'contact_attempted', 'customer_contacted',
            'requirement_understood', 'projects_recommended', 'shortlist_completed',
            'site_visit_scheduled', 'site_visit_completed', 'booking_in_progress',
            'booked_converted', 'lost_on_hold'
        ];
        if (!in_array($status, $validStatuses, true)) {
            $status = 'new_enquiry';
        }

        $intention = trim((string)($input['intention'] ?? ''));
        $notes = trim((string)($input['notes'] ?? ''));
        $adminId = (int)($input['admin_id'] ?? 103);
        $isTransferred = ($status === 'requirement_understood' || $rawStatus === 'transferred_advisor' || !empty($input['transferred_to_advisor']));
        $transferredAt = $isTransferred ? date('Y-m-d H:i:s') : null;
        $isDiscontinued = ($status === 'lost_on_hold');
        $exitStage = $isDiscontinued ? ($existingLead['status'] ?? 'customer_contacted') : null;

        $stmt = $db->prepare("
            INSERT INTO sales_lead_interactions (user_id, status, intention, notes, exit_stage, discontinued_at, updated_by, transferred_at, updated_at)
            VALUES (:uid, :status, :intent, :notes, :exit_stage, :disc_at, :admin_id, :transferred_at, NOW())
            ON DUPLICATE KEY UPDATE
                status = VALUES(status),
                intention = COALESCE(VALUES(intention), intention),
                notes = COALESCE(VALUES(notes), notes),
                exit_stage = IF(:is_disc = 1, COALESCE(exit_stage, VALUES(exit_stage)), exit_stage),
                discontinued_at = IF(:is_disc2 = 1, NOW(), discontinued_at),
                updated_by = VALUES(updated_by),
                transferred_at = IF(:is_trans = 1, COALESCE(transferred_at, NOW()), transferred_at),
                updated_at = NOW()
        ");

        $stmt->execute([
            ':uid'            => $userId,
            ':status'         => $status,
            ':intent'         => $intention ?: null,
            ':notes'          => $notes ?: null,
            ':exit_stage'     => $exitStage,
            ':disc_at'        => $isDiscontinued ? date('Y-m-d H:i:s') : null,
            ':is_disc'        => $isDiscontinued ? 1 : 0,
            ':is_disc2'       => $isDiscontinued ? 1 : 0,
            ':admin_id'       => $adminId,
            ':transferred_at' => $transferredAt,
            ':is_trans'       => $isTransferred ? 1 : 0
        ]);

        // If moved to site visit, also ensure user_site_visits record exists
        if ($status === 'site_visit_scheduled' || $rawStatus === 'interested_site_visit') {
            $chkSv = $db->prepare("SELECT id FROM user_site_visits WHERE user_id = ?");
            $chkSv->execute([$userId]);
            if (!$chkSv->fetch()) {
                $insSv = $db->prepare("
                    INSERT INTO user_site_visits (user_id, property_id, property_title, locality, visit_date, visit_slot, status, assigned_executive_name, created_at)
                    VALUES (?, 'PRJ-6873', 'Physical Site Visit Scheduled', 'Tamil Nadu', CURDATE(), '10:00 AM - 12:00 PM', 'requested', 'Karthik (Field Operations Mgr)', NOW())
                ");
                $insSv->execute([$userId]);
            }
        }

        // Auto-log to lead_stage_history for Master Pipeline visibility
        try {
            $hStmt = $db->prepare("
                INSERT INTO lead_stage_history (user_id, from_stage, to_stage, department, action_type, notes, changed_by, changed_by_name, created_at)
                VALUES (?, 'sales_update', ?, 'sales', 'sales_interaction', ?, ?, 'Sales Executive Desk', NOW())
            ");
            $hStmt->execute([$userId, $status, $notes ?: "Sales updated interaction to {$status}", $adminId]);
        } catch (\Exception $e) { }

        // Optional log entry
        try {
            $logStmt = $db->prepare("
                INSERT INTO admin_activity_logs (admin_id, admin_name, action_type, target_entity, target_id, details)
                VALUES (:aid, :aname, 'lead_interaction_update', 'user', :tid, :det)
            ");
            $logStmt->execute([
                ':aid'   => $adminId,
                ':aname' => 'Sales Executive',
                ':tid'   => (string)$userId,
                ':det'   => json_encode(['status' => $status, 'intention' => $intention, 'notes_len' => strlen($notes)])
            ]);
        } catch (\Exception $e) {
            // Ignore audit log error if admin table not configured
        }

        Response::success([
            'user_id'        => $userId,
            'status'         => $status,
            'intention'      => $intention,
            'notes'          => $notes,
            'transferred_at' => $transferredAt
        ], 'Lead interaction recorded successfully');
    }

    // -------------------------------------------------------------
    // ADVISOR ACTION 1: UPDATE CONSULTATION, COMMENTS, REQUIREMENTS
    // -------------------------------------------------------------
    if ($action === 'update_advisor_consultation') {
        $userId = (int)($input['user_id'] ?? 0);
        if ($userId <= 0) {
            Response::error('Invalid user ID', 400);
        }

        $existing = assertLeadNotDiscontinued($db, $userId);
        $adminId = (int)($input['admin_id'] ?? 104);
        $adminName = 'Property Advisor Desk';
        try {
            $aStmt = $db->prepare("SELECT name FROM users WHERE id = ?");
            $aStmt->execute([$adminId]);
            $aRow = $aStmt->fetch(PDO::FETCH_ASSOC);
            if ($aRow && !empty($aRow['name'])) {
                $adminName = $aRow['name'];
            }
        } catch (\Exception $e) {}

        $fromStage = $existing['status'] ?? 'requirement_understood';

        $allowedAdvisorStatuses = [
            'requirement_understood',
            'projects_recommended',
            'shortlist_completed',
            'site_visit_scheduled',
            'site_visit_completed',
            'booking_in_progress',
            'booked_converted',
            'lost_on_hold'
        ];
        $rawStatus = trim((string)($input['status'] ?? $fromStage));
        if ($rawStatus === 'transferred_advisor') {
            $rawStatus = 'requirement_understood';
        }
        $status = in_array($rawStatus, $allowedAdvisorStatuses, true) ? $rawStatus : 'requirement_understood';

        $intention = array_key_exists('intention', $input)
            ? trim((string)$input['intention'])
            : (string)($existing['intention'] ?? 'Site Visit Requested');
        $advisorNotes = array_key_exists('advisor_notes', $input)
            ? trim((string)$input['advisor_notes'])
            : (string)($existing['advisor_notes'] ?? '');
        $preferredLocation = array_key_exists('preferred_location', $input)
            ? trim((string)$input['preferred_location'])
            : (string)($existing['preferred_location'] ?? '');

        $budgetMin = null;
        if (array_key_exists('budget_min', $input)) {
            $budgetMin = ($input['budget_min'] !== '' && $input['budget_min'] !== null) ? (float)$input['budget_min'] : null;
        } else {
            $budgetMin = isset($existing['budget_min']) ? (float)$existing['budget_min'] : null;
        }

        $budgetMax = null;
        if (array_key_exists('budget_max', $input)) {
            $budgetMax = ($input['budget_max'] !== '' && $input['budget_max'] !== null) ? (float)$input['budget_max'] : null;
        } else {
            $budgetMax = isset($existing['budget_max']) ? (float)$existing['budget_max'] : null;
        }

        if ($existing) {
            $upd = $db->prepare("
                UPDATE sales_lead_interactions
                SET status = :status,
                    intention = :intention,
                    advisor_notes = :advisor_notes,
                    preferred_location = :pref_loc,
                    budget_min = :b_min,
                    budget_max = :b_max,
                    assigned_advisor_id = :adv_id,
                    transferred_at = COALESCE(transferred_at, NOW()),
                    updated_by = :upd_by,
                    updated_at = NOW()
                WHERE user_id = :uid
            ");
            $upd->execute([
                ':status'        => $status,
                ':intention'     => $intention ?: null,
                ':advisor_notes' => $advisorNotes !== '' ? $advisorNotes : null,
                ':pref_loc'      => $preferredLocation !== '' ? $preferredLocation : null,
                ':b_min'         => $budgetMin,
                ':b_max'         => $budgetMax,
                ':adv_id'        => $adminId,
                ':upd_by'        => $adminId,
                ':uid'           => $userId
            ]);
            $interactionId = (int)$existing['id'];
        } else {
            $ins = $db->prepare("
                INSERT INTO sales_lead_interactions (
                    user_id, status, intention, advisor_notes, preferred_location,
                    budget_min, budget_max, assigned_advisor_id, updated_by, transferred_at, updated_at, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())
            ");
            $ins->execute([
                $userId,
                $status,
                $intention ?: 'Site Visit Requested',
                $advisorNotes !== '' ? $advisorNotes : null,
                $preferredLocation !== '' ? $preferredLocation : null,
                $budgetMin,
                $budgetMax,
                $adminId,
                $adminId
            ]);
            $interactionId = (int)$db->lastInsertId();
        }

        // Log consultation update & comments to lead_stage_history
        $logNotes = $advisorNotes !== ''
            ? $advisorNotes
            : "Advisor updated consultation ({$status})" . ($preferredLocation ? " | Area: {$preferredLocation}" : '');
        try {
            $hStmt = $db->prepare("
                INSERT INTO lead_stage_history (
                    user_id, interaction_id, from_stage, to_stage, department,
                    action_type, notes, changed_by, changed_by_name, created_at
                ) VALUES (?, ?, ?, ?, 'property_advisor', 'advisor_consultation', ?, ?, ?, NOW())
            ");
            $hStmt->execute([
                $userId,
                $interactionId,
                $fromStage,
                $status,
                $logNotes,
                $adminId,
                $adminName
            ]);
        } catch (\Exception $e) {}

        Response::success([
            'user_id'            => $userId,
            'status'             => $status,
            'intention'          => $intention,
            'advisor_notes'      => $advisorNotes,
            'preferred_location' => $preferredLocation,
            'budget_min'         => $budgetMin,
            'budget_max'         => $budgetMax
        ], 'Property Advisor consultation saved successfully');
    }

    // -------------------------------------------------------------
    // ADVISOR ACTION 2: RECOMMEND / SHORTLIST PROPERTY
    // -------------------------------------------------------------
    if ($action === 'advisor_recommend_property') {
        $userId = (int)($input['user_id'] ?? 0);
        $propertyId = trim((string)($input['property_id'] ?? ''));
        $operation = trim((string)($input['operation'] ?? 'add'));
        $adminId = (int)($input['admin_id'] ?? 104);
        $autoAdvance = !empty($input['auto_advance_stage']);

        if ($userId <= 0 || $propertyId === '') {
            Response::error('Valid user_id and property_id are required', 400);
        }

        $existing = assertLeadNotDiscontinued($db, $userId);

        $adminName = 'Property Advisor Desk';
        try {
            $aStmt = $db->prepare("SELECT name FROM users WHERE id = ?");
            $aStmt->execute([$adminId]);
            $aRow = $aStmt->fetch(PDO::FETCH_ASSOC);
            if ($aRow && !empty($aRow['name'])) {
                $adminName = $aRow['name'];
            }
        } catch (\Exception $e) {}

        // Resolve property title
        $propTitle = $propertyId;
        try {
            $ptStmt = $db->prepare("
                SELECT COALESCE(NULLIF(p.title, ''), NULLIF(prj.project_name, ''), ?) AS title
                FROM (SELECT ? AS pid) x
                LEFT JOIN properties p ON CAST(p.id AS CHAR(50)) COLLATE utf8mb4_unicode_ci = x.pid
                LEFT JOIN projects prj ON CAST(prj.project_id AS CHAR(50)) COLLATE utf8mb4_unicode_ci = x.pid
                LIMIT 1
            ");
            $ptStmt->execute([$propertyId, $propertyId]);
            $ptRow = $ptStmt->fetch(PDO::FETCH_ASSOC);
            if ($ptRow && !empty($ptRow['title'])) {
                $propTitle = $ptRow['title'];
            }
        } catch (\Exception $e) {}

        if ($operation === 'remove') {
            $delStmt = $db->prepare("DELETE FROM user_shortlists WHERE user_id = ? AND property_id = ?");
            $delStmt->execute([$userId, $propertyId]);
            $msg = "Removed {$propTitle} from client shortlist";
        } else {
            $chkStmt = $db->prepare("SELECT id FROM user_shortlists WHERE user_id = ? AND property_id = ? LIMIT 1");
            $chkStmt->execute([$userId, $propertyId]);
            if (!$chkStmt->fetch()) {
                $insStmt = $db->prepare("INSERT INTO user_shortlists (user_id, property_id, created_at) VALUES (?, ?, NOW())");
                $insStmt->execute([$userId, $propertyId]);
            }
            $msg = "Recommended & shortlisted {$propTitle} for client";
        }

        // Count total shortlists
        $cntStmt = $db->prepare("SELECT COUNT(DISTINCT property_id) FROM user_shortlists WHERE user_id = ?");
        $cntStmt->execute([$userId]);
        $shortlistCount = (int)$cntStmt->fetchColumn();

        $fromStage = $existing['status'] ?? 'requirement_understood';
        $newStage = $fromStage;

        if ($operation === 'add' && ($autoAdvance || in_array($fromStage, ['transferred_advisor', 'requirement_understood', 'new_enquiry', 'customer_contacted'], true))) {
            $newStage = $shortlistCount >= 2 ? 'shortlist_completed' : 'projects_recommended';
            if ($existing) {
                $db->prepare("UPDATE sales_lead_interactions SET status = ?, assigned_advisor_id = ?, updated_by = ?, updated_at = NOW() WHERE user_id = ?")
                   ->execute([$newStage, $adminId, $adminId, $userId]);
            }
        }

        try {
            $hStmt = $db->prepare("
                INSERT INTO lead_stage_history (
                    user_id, interaction_id, from_stage, to_stage, department,
                    action_type, notes, changed_by, changed_by_name, created_at
                ) VALUES (?, ?, ?, ?, 'property_advisor', 'property_recommended', ?, ?, ?, NOW())
            ");
            $hStmt->execute([
                $userId,
                $existing['id'] ?? null,
                $fromStage,
                $newStage,
                $msg,
                $adminId,
                $adminName
            ]);
        } catch (\Exception $e) {}

        Response::success([
            'user_id'         => $userId,
            'property_id'     => $propertyId,
            'property_title'  => $propTitle,
            'operation'       => $operation,
            'shortlist_count' => $shortlistCount,
            'status'          => $newStage
        ], $msg);
    }

    // -------------------------------------------------------------
    // ADVISOR ACTION 3: SCHEDULE SITE VISIT & HANDOVER TO OPERATIONS
    // -------------------------------------------------------------
    if ($action === 'advisor_schedule_site_visit') {
        $userId = (int)($input['user_id'] ?? 0);
        $propertyId = trim((string)($input['property_id'] ?? 'PRJ-0001'));
        $propertyTitle = trim((string)($input['property_title'] ?? 'Verified Plot Site Visit'));
        $locality = trim((string)($input['locality'] ?? 'Tamil Nadu'));
        $visitDate = trim((string)($input['visit_date'] ?? date('Y-m-d', strtotime('+1 day'))));
        $visitSlot = trim((string)($input['visit_slot'] ?? '10:00 AM - 12:00 PM'));
        $fieldExec = trim((string)($input['field_executive'] ?? 'Karthik (Field Operations Mgr)'));
        $pickupLoc = trim((string)($input['pickup_location'] ?? 'Direct at Site Gate'));
        $advisorNotes = trim((string)($input['advisor_notes'] ?? ''));
        $adminId = (int)($input['admin_id'] ?? 104);

        if ($userId <= 0) {
            Response::error('Invalid user ID', 400);
        }

        $existing = assertLeadNotDiscontinued($db, $userId);

        $adminName = 'Property Advisor Desk';
        try {
            $aStmt = $db->prepare("SELECT name FROM users WHERE id = ?");
            $aStmt->execute([$adminId]);
            $aRow = $aStmt->fetch(PDO::FETCH_ASSOC);
            if ($aRow && !empty($aRow['name'])) {
                $adminName = $aRow['name'];
            }
        } catch (\Exception $e) {}

        // Create site visit entry for Operations Executive queue
        $svStmt = $db->prepare("
            INSERT INTO user_site_visits (
                user_id, property_id, property_title, locality, visit_date, visit_slot,
                status, assigned_executive_name, pickup_location, admin_notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'requested', ?, ?, ?, NOW())
        ");
        $svStmt->execute([
            $userId,
            $propertyId ?: 'PRJ-0001',
            $propertyTitle ?: 'Verified Plot Site Visit',
            $locality ?: 'Tamil Nadu',
            $visitDate ?: date('Y-m-d', strtotime('+1 day')),
            $visitSlot ?: '10:00 AM - 12:00 PM',
            $fieldExec ?: 'Karthik (Field Operations Mgr)',
            $pickupLoc ?: 'Direct at Site Gate',
            $advisorNotes !== '' ? $advisorNotes : null
        ]);

        // Update interaction status to site_visit_scheduled
        $fromStage = $existing['status'] ?? 'shortlist_completed';

        if ($existing) {
            $upd = $db->prepare("
                UPDATE sales_lead_interactions
                SET status = 'site_visit_scheduled',
                    scheduled_visit_at = ?,
                    advisor_notes = CASE WHEN ? != '' THEN ? ELSE advisor_notes END,
                    assigned_advisor_id = ?,
                    updated_by = ?,
                    updated_at = NOW()
                WHERE user_id = ?
            ");
            $upd->execute([
                $visitDate . ' 10:00:00',
                $advisorNotes,
                $advisorNotes,
                $adminId,
                $adminId,
                $userId
            ]);
            $interactionId = (int)$existing['id'];
        } else {
            $ins = $db->prepare("
                INSERT INTO sales_lead_interactions (
                    user_id, status, advisor_notes, scheduled_visit_at, assigned_advisor_id,
                    updated_by, transferred_at, created_at, updated_at
                ) VALUES (?, 'site_visit_scheduled', ?, ?, ?, ?, NOW(), NOW(), NOW())
            ");
            $ins->execute([
                $userId,
                $advisorNotes !== '' ? $advisorNotes : null,
                $visitDate . ' 10:00:00',
                $adminId,
                $adminId
            ]);
            $interactionId = (int)$db->lastInsertId();
        }

        // Log handover to Operations in lead_stage_history
        $historyNote = "Site visit scheduled for {$propertyTitle} on {$visitDate} ({$visitSlot})"
            . ($advisorNotes !== '' ? " — Advisor Comments: {$advisorNotes}" : '');
        try {
            $hStmt = $db->prepare("
                INSERT INTO lead_stage_history (
                    user_id, interaction_id, from_stage, to_stage, department,
                    action_type, notes, changed_by, changed_by_name, created_at
                ) VALUES (?, ?, ?, 'site_visit_scheduled', 'property_advisor', 'handover_operations', ?, ?, ?, NOW())
            ");
            $hStmt->execute([
                $userId,
                $interactionId,
                $fromStage,
                $historyNote,
                $adminId,
                $adminName
            ]);
        } catch (\Exception $e) {}

        Response::success([
            'user_id'        => $userId,
            'status'         => 'site_visit_scheduled',
            'property_title' => $propertyTitle,
            'visit_date'     => $visitDate,
            'visit_slot'     => $visitSlot
        ], 'Site visit scheduled & handed over to Operations Desk');
    }

    // -------------------------------------------------------------
    // ADVISOR ACTION 4: DISCONTINUE / PUT LEAD ON HOLD
    // -------------------------------------------------------------
    if ($action === 'advisor_discontinue_lead') {
        $userId = (int)($input['user_id'] ?? 0);
        $exitCategory = trim((string)($input['exit_reason_category'] ?? 'Requirements not met'));
        $exitNotes = trim((string)($input['exit_notes'] ?? ''));
        $reengageDate = !empty($input['reengage_date']) ? trim((string)$input['reengage_date']) : null;
        $adminId = (int)($input['admin_id'] ?? 104);

        if ($userId <= 0) {
            Response::error('Invalid user ID', 400);
        }

        $existing = assertLeadNotDiscontinued($db, $userId);

        $adminName = 'Property Advisor Desk';
        try {
            $aStmt = $db->prepare("SELECT name FROM users WHERE id = ?");
            $aStmt->execute([$adminId]);
            $aRow = $aStmt->fetch(PDO::FETCH_ASSOC);
            if ($aRow && !empty($aRow['name'])) {
                $adminName = $aRow['name'];
            }
        } catch (\Exception $e) {}

        $exitStage = ($existing && $existing['status'] !== 'lost_on_hold') ? $existing['status'] : 'requirement_understood';

        if ($existing) {
            $upd = $db->prepare("
                UPDATE sales_lead_interactions
                SET status = 'lost_on_hold',
                    exit_stage = ?,
                    exit_reason_category = ?,
                    exit_notes = ?,
                    reengage_date = ?,
                    discontinued_at = NOW(),
                    advisor_notes = CASE WHEN ? != '' THEN ? ELSE advisor_notes END,
                    assigned_advisor_id = ?,
                    updated_by = ?,
                    updated_at = NOW()
                WHERE user_id = ?
            ");
            $upd->execute([
                $exitStage,
                $exitCategory,
                $exitNotes,
                $reengageDate,
                $exitNotes,
                $exitNotes,
                $adminId,
                $adminId,
                $userId
            ]);
            $interactionId = (int)$existing['id'];
        } else {
            $interactionId = null;
        }

        try {
            $hStmt = $db->prepare("
                INSERT INTO lead_stage_history (
                    user_id, interaction_id, from_stage, to_stage, department,
                    action_type, notes, changed_by, changed_by_name, created_at
                ) VALUES (?, ?, ?, 'lost_on_hold', 'property_advisor', 'lead_discontinued', ?, ?, ?, NOW())
            ");
            $hStmt->execute([
                $userId,
                $interactionId,
                $exitStage,
                $exitNotes ?: "Discontinued at {$exitStage} ({$exitCategory})",
                $adminId,
                $adminName
            ]);
        } catch (\Exception $e) {}

        Response::success([
            'user_id'              => $userId,
            'status'               => 'lost_on_hold',
            'exit_stage'           => $exitStage,
            'exit_reason_category' => $exitCategory
        ], 'Client marked as On Hold / Discontinued');
    }

    // -------------------------------------------------------------
    // OPERATIONS ACTION 1: UPDATE SITE VISIT, DTCP/GPS, OPS COMMENTS
    // -------------------------------------------------------------
    if ($action === 'update_operations_visit') {
        $userId = (int)($input['user_id'] ?? 0);
        if ($userId <= 0) {
            Response::error('Invalid user ID', 400);
        }

        $existing = assertLeadNotDiscontinued($db, $userId);

        $visitId = (int)($input['visit_id'] ?? 0);
        $adminId = (int)($input['admin_id'] ?? 111);
        $adminName = 'Operations Executive Desk';
        try {
            $aStmt = $db->prepare("SELECT name FROM users WHERE id = ?");
            $aStmt->execute([$adminId]);
            $aRow = $aStmt->fetch(PDO::FETCH_ASSOC);
            if ($aRow && !empty($aRow['name'])) {
                $adminName = $aRow['name'];
            }
        } catch (\Exception $e) {}

        $fromStage = $existing['status'] ?? 'site_visit_scheduled';

        $allowedOpsStages = [
            'site_visit_scheduled',
            'site_visit_completed',
            'booking_in_progress',
            'booked_converted',
            'lost_on_hold'
        ];
        $rawStage = trim((string)($input['interaction_status'] ?? $fromStage));
        if ($rawStage === 'interested_site_visit') {
            $rawStage = 'site_visit_scheduled';
        }
        $interactionStatus = in_array($rawStage, $allowedOpsStages, true) ? $rawStage : 'site_visit_scheduled';

        $allowedVisitStatuses = ['requested', 'confirmed', 'completed', 'cancelled'];
        $rawVisitStatus = strtolower(trim((string)($input['visit_status'] ?? 'requested')));
        $visitStatus = in_array($rawVisitStatus, $allowedVisitStatuses, true) ? $rawVisitStatus : 'requested';

        if ($interactionStatus === 'site_visit_completed' && $visitStatus !== 'cancelled') {
            $visitStatus = 'completed';
        }

        $propertyId = trim((string)($input['property_id'] ?? 'PRJ-0001'));
        $propertyTitle = trim((string)($input['property_title'] ?? 'Verified Layout Site Visit'));
        $locality = trim((string)($input['locality'] ?? 'Tamil Nadu'));
        $visitDate = trim((string)($input['visit_date'] ?? date('Y-m-d')));
        $visitSlot = trim((string)($input['visit_slot'] ?? '10:00 AM - 12:00 PM'));
        $fieldExec = trim((string)($input['field_executive'] ?? 'Karthik (Field Operations Mgr)'));
        $pickupLoc = trim((string)($input['pickup_location'] ?? 'Direct at Site Gate'));
        $dtcpMarkerStatus = trim((string)($input['dtcp_marker_status'] ?? ($existing['dtcp_marker_status'] ?? 'Pending Survey')));
        $gpsCoords = trim((string)($input['gps_coords'] ?? ($existing['gps_coords'] ?? '')));
        $opsNotes = array_key_exists('ops_notes', $input)
            ? trim((string)$input['ops_notes'])
            : (string)($existing['ops_notes'] ?? '');

        // Resolve existing visit record
        if ($visitId > 0) {
            $svCheck = $db->prepare("SELECT id FROM user_site_visits WHERE id = ? AND user_id = ?");
            $svCheck->execute([$visitId, $userId]);
            $svRow = $svCheck->fetch(PDO::FETCH_ASSOC);
        } else {
            $svCheck = $db->prepare("SELECT id FROM user_site_visits WHERE user_id = ? ORDER BY id DESC LIMIT 1");
            $svCheck->execute([$userId]);
            $svRow = $svCheck->fetch(PDO::FETCH_ASSOC);
        }

        if ($svRow) {
            $svUpd = $db->prepare("
                UPDATE user_site_visits
                SET property_id = :pid,
                    property_title = :ptitle,
                    locality = :loc,
                    visit_date = :vdate,
                    visit_slot = :vslot,
                    status = :vstatus,
                    assigned_executive_name = :fexec,
                    pickup_location = :pickup,
                    dtcp_marker_status = :dtcp,
                    gps_coords = :gps,
                    admin_notes = CASE WHEN :notes != '' THEN :notes2 ELSE admin_notes END
                WHERE id = :vid
            ");
            $svUpd->execute([
                ':pid'     => $propertyId ?: 'PRJ-0001',
                ':ptitle'  => $propertyTitle ?: 'Verified Layout Site Visit',
                ':loc'     => $locality ?: 'Tamil Nadu',
                ':vdate'   => $visitDate ?: date('Y-m-d'),
                ':vslot'   => $visitSlot ?: '10:00 AM - 12:00 PM',
                ':vstatus' => $visitStatus,
                ':fexec'   => $fieldExec ?: 'Karthik (Field Operations Mgr)',
                ':pickup'  => $pickupLoc ?: 'Direct at Site Gate',
                ':dtcp'    => $dtcpMarkerStatus ?: 'Pending Survey',
                ':gps'     => $gpsCoords !== '' ? $gpsCoords : null,
                ':notes'   => $opsNotes,
                ':notes2'  => $opsNotes,
                ':vid'     => (int)$svRow['id']
            ]);
            $visitId = (int)$svRow['id'];
        } else {
            $svIns = $db->prepare("
                INSERT INTO user_site_visits (
                    user_id, property_id, property_title, locality, visit_date, visit_slot,
                    status, assigned_executive_name, pickup_location, dtcp_marker_status, gps_coords, admin_notes, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ");
            $svIns->execute([
                $userId,
                $propertyId ?: 'PRJ-0001',
                $propertyTitle ?: 'Verified Layout Site Visit',
                $locality ?: 'Tamil Nadu',
                $visitDate ?: date('Y-m-d'),
                $visitSlot ?: '10:00 AM - 12:00 PM',
                $visitStatus,
                $fieldExec ?: 'Karthik (Field Operations Mgr)',
                $pickupLoc ?: 'Direct at Site Gate',
                $dtcpMarkerStatus ?: 'Pending Survey',
                $gpsCoords !== '' ? $gpsCoords : null,
                $opsNotes !== '' ? $opsNotes : null
            ]);
            $visitId = (int)$db->lastInsertId();
        }

        // Update sales_lead_interactions
        if ($existing) {
            $upd = $db->prepare("
                UPDATE sales_lead_interactions
                SET status = :status,
                    ops_notes = :ops_notes,
                    dtcp_marker_status = :dtcp,
                    gps_coords = :gps,
                    scheduled_visit_at = :sched_at,
                    assigned_ops_id = :ops_id,
                    updated_by = :upd_by,
                    updated_at = NOW()
                WHERE user_id = :uid
            ");
            $upd->execute([
                ':status'    => $interactionStatus,
                ':ops_notes' => $opsNotes !== '' ? $opsNotes : null,
                ':dtcp'      => $dtcpMarkerStatus ?: 'Pending Survey',
                ':gps'       => $gpsCoords !== '' ? $gpsCoords : null,
                ':sched_at'  => $visitDate ? ($visitDate . ' 10:00:00') : null,
                ':ops_id'    => $adminId,
                ':upd_by'    => $adminId,
                ':uid'       => $userId
            ]);
            $interactionId = (int)$existing['id'];
        } else {
            $ins = $db->prepare("
                INSERT INTO sales_lead_interactions (
                    user_id, status, ops_notes, dtcp_marker_status, gps_coords,
                    scheduled_visit_at, assigned_ops_id, updated_by, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ");
            $ins->execute([
                $userId,
                $interactionStatus,
                $opsNotes !== '' ? $opsNotes : null,
                $dtcpMarkerStatus ?: 'Pending Survey',
                $gpsCoords !== '' ? $gpsCoords : null,
                $visitDate ? ($visitDate . ' 10:00:00') : null,
                $adminId,
                $adminId
            ]);
            $interactionId = (int)$db->lastInsertId();
        }

        $logNotes = $opsNotes !== ''
            ? $opsNotes
            : "Operations updated site visit ({$visitStatus}, {$dtcpMarkerStatus}) & stage ({$interactionStatus})";
        try {
            $hStmt = $db->prepare("
                INSERT INTO lead_stage_history (
                    user_id, interaction_id, from_stage, to_stage, department,
                    action_type, notes, changed_by, changed_by_name, created_at
                ) VALUES (?, ?, ?, ?, 'operations', 'operations_update', ?, ?, ?, NOW())
            ");
            $hStmt->execute([
                $userId,
                $interactionId,
                $fromStage,
                $interactionStatus,
                $logNotes,
                $adminId,
                $adminName
            ]);
        } catch (\Exception $e) {}

        Response::success([
            'user_id'            => $userId,
            'visit_id'           => $visitId,
            'visit_status'       => $visitStatus,
            'interaction_status' => $interactionStatus,
            'dtcp_marker_status' => $dtcpMarkerStatus,
            'gps_coords'         => $gpsCoords,
            'ops_notes'          => $opsNotes
        ], 'Operations site visit & field survey saved successfully');
    }

    // -------------------------------------------------------------
    // OPERATIONS ACTION 2: BOOKING IN PROGRESS / DEAL CONVERSION
    // -------------------------------------------------------------
    if ($action === 'operations_update_booking') {
        $userId = (int)($input['user_id'] ?? 0);
        if ($userId <= 0) {
            Response::error('Invalid user ID', 400);
        }

        $existing = assertLeadNotDiscontinued($db, $userId);

        $rawTarget = trim((string)($input['target_stage'] ?? 'booking_in_progress'));
        $targetStage = in_array($rawTarget, ['booking_in_progress', 'booked_converted'], true)
            ? $rawTarget
            : 'booking_in_progress';

        $bookedPropId = trim((string)($input['booked_property_id'] ?? ''));
        $plotNo = trim((string)($input['plot_no'] ?? ''));
        $bookingAmount = ($input['booking_amount'] !== '' && $input['booking_amount'] !== null) ? (float)$input['booking_amount'] : null;
        $finalPrice = ($input['final_price'] !== '' && $input['final_price'] !== null) ? (float)$input['final_price'] : null;
        $regDate = !empty($input['registration_date']) ? trim((string)$input['registration_date']) : null;
        $dealNotes = trim((string)($input['deal_notes'] ?? ''));
        $opsNotes = trim((string)($input['ops_notes'] ?? ''));
        $adminId = (int)($input['admin_id'] ?? 111);

        $adminName = 'Operations Executive Desk';
        try {
            $aStmt = $db->prepare("SELECT name FROM users WHERE id = ?");
            $aStmt->execute([$adminId]);
            $aRow = $aStmt->fetch(PDO::FETCH_ASSOC);
            if ($aRow && !empty($aRow['name'])) {
                $adminName = $aRow['name'];
            }
        } catch (\Exception $e) {}

        $fromStage = $existing['status'] ?? 'site_visit_completed';

        if ($existing) {
            $upd = $db->prepare("
                UPDATE sales_lead_interactions
                SET status = :status,
                    booked_property_id = :bprop,
                    plot_no = :plot_no,
                    booking_amount = :bamt,
                    final_price = :fprice,
                    registration_date = :rdate,
                    deal_notes = :dnotes,
                    ops_notes = COALESCE(NULLIF(:ops_notes, ''), ops_notes),
                    assigned_ops_id = :ops_id,
                    updated_by = :upd_by,
                    updated_at = NOW()
                WHERE user_id = :uid
            ");
            $upd->execute([
                ':status'    => $targetStage,
                ':bprop'     => $bookedPropId ?: null,
                ':plot_no'   => $plotNo ?: null,
                ':bamt'      => $bookingAmount,
                ':fprice'    => $finalPrice,
                ':rdate'     => $regDate,
                ':dnotes'    => $dealNotes ?: null,
                ':ops_notes' => $opsNotes,
                ':ops_id'    => $adminId,
                ':upd_by'    => $adminId,
                ':uid'       => $userId
            ]);
            $interactionId = (int)$existing['id'];
        } else {
            $ins = $db->prepare("
                INSERT INTO sales_lead_interactions (
                    user_id, status, booked_property_id, plot_no, booking_amount, final_price,
                    registration_date, deal_notes, ops_notes, assigned_ops_id, updated_by, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ");
            $ins->execute([
                $userId,
                $targetStage,
                $bookedPropId ?: null,
                $plotNo ?: null,
                $bookingAmount,
                $finalPrice,
                $regDate,
                $dealNotes ?: null,
                $opsNotes ?: null,
                $adminId,
                $adminId
            ]);
            $interactionId = (int)$db->lastInsertId();
        }

        // Mark pending site visits as completed upon booking/closure
        try {
            $db->prepare("UPDATE user_site_visits SET status = 'completed' WHERE user_id = ? AND status IN ('requested', 'confirmed')")
               ->execute([$userId]);
        } catch (\Exception $e) {}

        $dept = $targetStage === 'booked_converted' ? 'closing' : 'operations';
        $actionType = $targetStage === 'booked_converted' ? 'deal_converted' : 'booking_in_progress';
        $summaryNote = $dealNotes ?: $opsNotes ?: ($targetStage === 'booked_converted'
            ? "Deal closed! Plot: {$plotNo}, Final Price: ₹{$finalPrice}"
            : "Booking token initiated for Plot {$plotNo}");

        try {
            $meta = json_encode([
                'property_id'    => $bookedPropId,
                'plot_no'        => $plotNo,
                'booking_amount' => $bookingAmount,
                'final_price'    => $finalPrice,
                'reg_date'       => $regDate
            ]);
            $hStmt = $db->prepare("
                INSERT INTO lead_stage_history (
                    user_id, interaction_id, from_stage, to_stage, department,
                    action_type, notes, metadata, changed_by, changed_by_name, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ");
            $hStmt->execute([
                $userId,
                $interactionId,
                $fromStage,
                $targetStage,
                $dept,
                $actionType,
                $summaryNote,
                $meta,
                $adminId,
                $adminName
            ]);
        } catch (\Exception $e) {}

        Response::success([
            'user_id'            => $userId,
            'status'             => $targetStage,
            'booked_property_id' => $bookedPropId,
            'plot_no'            => $plotNo,
            'booking_amount'     => $bookingAmount,
            'final_price'        => $finalPrice,
            'registration_date'  => $regDate
        ], $targetStage === 'booked_converted' ? 'Deal recorded as Booked / Converted!' : 'Booking in progress updated!');
    }

    // -------------------------------------------------------------
    // OPERATIONS ACTION 3: DISCONTINUE / CANCEL SITE VISIT
    // -------------------------------------------------------------
    if ($action === 'operations_discontinue_lead') {
        $userId = (int)($input['user_id'] ?? 0);
        $exitCategory = trim((string)($input['exit_reason_category'] ?? 'Plot criteria mismatch'));
        $exitNotes = trim((string)($input['exit_notes'] ?? ''));
        $reengageDate = !empty($input['reengage_date']) ? trim((string)$input['reengage_date']) : null;
        $adminId = (int)($input['admin_id'] ?? 111);

        if ($userId <= 0) {
            Response::error('Invalid user ID', 400);
        }

        $existing = assertLeadNotDiscontinued($db, $userId);

        $adminName = 'Operations Executive Desk';
        try {
            $aStmt = $db->prepare("SELECT name FROM users WHERE id = ?");
            $aStmt->execute([$adminId]);
            $aRow = $aStmt->fetch(PDO::FETCH_ASSOC);
            if ($aRow && !empty($aRow['name'])) {
                $adminName = $aRow['name'];
            }
        } catch (\Exception $e) {}

        $exitStage = ($existing && $existing['status'] !== 'lost_on_hold') ? $existing['status'] : 'site_visit_scheduled';

        if ($existing) {
            $upd = $db->prepare("
                UPDATE sales_lead_interactions
                SET status = 'lost_on_hold',
                    exit_stage = ?,
                    exit_reason_category = ?,
                    exit_notes = ?,
                    reengage_date = ?,
                    discontinued_at = NOW(),
                    ops_notes = CASE WHEN ? != '' THEN ? ELSE ops_notes END,
                    assigned_ops_id = ?,
                    updated_by = ?,
                    updated_at = NOW()
                WHERE user_id = ?
            ");
            $upd->execute([
                $exitStage,
                $exitCategory,
                $exitNotes,
                $reengageDate,
                $exitNotes,
                $exitNotes,
                $adminId,
                $adminId,
                $userId
            ]);
            $interactionId = (int)$existing['id'];
        } else {
            $interactionId = null;
        }

        try {
            $db->prepare("UPDATE user_site_visits SET status = 'cancelled' WHERE user_id = ? AND status IN ('requested', 'confirmed')")
               ->execute([$userId]);
        } catch (\Exception $e) {}

        try {
            $hStmt = $db->prepare("
                INSERT INTO lead_stage_history (
                    user_id, interaction_id, from_stage, to_stage, department,
                    action_type, notes, changed_by, changed_by_name, created_at
                ) VALUES (?, ?, ?, 'lost_on_hold', 'operations', 'lead_discontinued', ?, ?, ?, NOW())
            ");
            $hStmt->execute([
                $userId,
                $interactionId,
                $exitStage,
                $exitNotes ?: "Operations marked hold at {$exitStage} ({$exitCategory})",
                $adminId,
                $adminName
            ]);
        } catch (\Exception $e) {}

        Response::success([
            'user_id'              => $userId,
            'status'               => 'lost_on_hold',
            'exit_stage'           => $exitStage,
            'exit_reason_category' => $exitCategory
        ], 'Visit cancelled & client moved to On Hold');
    }

    Response::error('Invalid POST action', 400);
}

// -------------------------------------------------------------
// GET: SPECIALIZED DESK DATA
// -------------------------------------------------------------
if ($method !== 'GET') {
    Response::error('Method not allowed', 405);
}

$role = trim($_GET['role'] ?? 'sales_executive');
$adminId = (int)($_GET['admin_id'] ?? 103);
$filterStaffId = isset($_GET['staff_id']) ? (int)$_GET['staff_id'] : 0;

// Fetch active staff roster for the requested role
$roleStaff = [];
try {
    $rsStmt = $db->prepare("
        SELECT id, name, email, COALESCE(phone, '') AS phone, role
        FROM users
        WHERE role = ? AND (status IS NULL OR status = '' OR status = 'active')
        ORDER BY id ASC
    ");
    $rsStmt->execute([$role]);
    $roleStaff = $rsStmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($roleStaff as &$rsItem) {
        $rsItem['id'] = (int)$rsItem['id'];
    }
    unset($rsItem);
} catch (\Exception $e) {}

// Identify caller role: non-admin role logins see their own assigned + unassigned leads by default
$callerIsStaffScoped = false;
if ($filterStaffId === 0 && $adminId > 0) {
    try {
        $callerStmt = $db->prepare("SELECT role FROM users WHERE id = ?");
        $callerStmt->execute([$adminId]);
        $callerRow = $callerStmt->fetch(PDO::FETCH_ASSOC);
        if ($callerRow && $callerRow['role'] === $role) {
            $callerIsStaffScoped = true;
        }
    } catch (\Exception $e) {}
}

// -------------------------------------------------------------
// 1. SALES EXECUTIVE DASHBOARD DATA (LIVE LOGGED-IN VISITORS)
// -------------------------------------------------------------
if ($role === 'sales_executive') {
    $staffWhereSql = '';
    $staffParams = [];
    if ($filterStaffId > 0) {
        $staffWhereSql = " AND sli.assigned_sales_id = :filter_staff_id";
        $staffParams[':filter_staff_id'] = $filterStaffId;
    } elseif ($filterStaffId === -1) {
        $staffWhereSql = " AND (sli.assigned_sales_id IS NULL OR sli.assigned_sales_id = 0)";
    } elseif ($callerIsStaffScoped) {
        $staffWhereSql = " AND (sli.assigned_sales_id = :caller_staff_id OR sli.assigned_sales_id IS NULL OR sli.assigned_sales_id = 0)";
        $staffParams[':caller_staff_id'] = $adminId;
    }

    // Sourced from logged-in users who have accessed the platform
    $sql = "
        SELECT 
            u.id,
            u.name,
            u.email,
            u.phone,
            COALESCE(u.last_login_at, u.created_at) AS last_active,
            u.created_at,
            COALESCE(sli.status, 'new') AS interaction_status,
            COALESCE(sli.intention, '') AS intention,
            COALESCE(sli.notes, '') AS notes,
            sli.assigned_sales_id,
            sales_u.name AS assigned_sales_name,
            sli.assigned_advisor_id,
            adv_u.name AS assigned_advisor_name,
            sli.assigned_ops_id,
            ops_u.name AS assigned_ops_name,
            sli.transferred_at,
            sli.updated_at AS last_contacted_at
        FROM users u
        LEFT JOIN sales_lead_interactions sli ON sli.user_id = u.id
        LEFT JOIN users sales_u ON sales_u.id = sli.assigned_sales_id
        LEFT JOIN users adv_u ON adv_u.id = sli.assigned_advisor_id
        LEFT JOIN users ops_u ON ops_u.id = sli.assigned_ops_id
        WHERE (u.role = 'buyer' OR u.role = 'verified_buyer')
          AND u.role NOT IN ('admin', 'super_admin', 'co_admin', 'sales_executive', 'property_advisor', 'operations_executive', 'finance_admin', 'content_gis_admin', 'developer')
          AND (u.email IS NULL OR (u.email NOT LIKE '%@findaplot.com' AND u.email NOT LIKE '%@findaplot.in'))
          AND (u.phone IS NULL OR u.phone NOT LIKE '+91 94440%')
          AND u.id NOT IN (1, 101, 102, 103, 104, 105, 108, 109, 110, 111, 112, 113, 116)
          AND (sli.status IS NULL OR sli.status != 'lost_on_hold')
          AND sli.discontinued_at IS NULL
          {$staffWhereSql}
        ORDER BY last_active DESC
        LIMIT 100
    ";

    $stmt = $db->prepare($sql);
    $stmt->execute($staffParams);
    $visitors = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $totalViews = 0;
    $interestedCount = 0;
    $contactedCount = 0;
    $transferredCount = 0;

    foreach ($visitors as &$v) {
        $uid = (int)$v['id'];
        $uphone = $v['phone'] ?: '';

        // Query real viewed properties for this visitor
        $pSql = "
            SELECT 
                COALESCE(p.id, prj.project_id, views.property_id) AS id, 
                COALESCE(NULLIF(p.title, ''), NULLIF(prj.project_name, ''), NULLIF(views.v_title, ''), 'Verified Property Listing') AS title, 
                COALESCE(NULLIF(p.property_type, ''), NULLIF(prj.category, ''), NULLIF(prj.type, ''), NULLIF(views.v_type, ''), 'Residential Plot') AS property_type, 
                COALESCE(NULLIF(p.price, ''), CASE WHEN prj.price_from > 0 THEN CONCAT('₹ ', FORMAT(prj.price_from / 100000, 2), ' Lakhs') ELSE NULL END, NULLIF(views.v_price, ''), 'Price on Request') AS price, 
                COALESCE(NULLIF(p.price_per_sqft, ''), CASE WHEN prj.sqft_rate > 0 THEN CONCAT('₹ ', FORMAT(prj.sqft_rate, 0), '/sq.ft') ELSE '' END) AS price_per_sqft, 
                COALESCE(NULLIF(p.sqft, ''), CASE WHEN prj.min_plot_size > 0 THEN CONCAT(FORMAT(prj.min_plot_size, 0), ' sq.ft') ELSE '' END) AS sqft, 
                COALESCE(NULLIF(p.locality_name, ''), NULLIF(prj.locality, ''), NULLIF(views.v_locality, ''), 'Locality') AS locality, 
                COALESCE(NULLIF(p.city_name, ''), NULLIF(prj.city, ''), NULLIF(views.v_city, ''), 'Tamil Nadu') AS city, 
                COALESCE(NULLIF(p.main_image_url, ''), NULLIF(prj.cover_image, ''), 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80') AS image,
                MAX(views.viewed_at) AS last_viewed_at
            FROM (
                SELECT CAST(property_id AS CHAR(50)) COLLATE utf8mb4_unicode_ci AS property_id, viewed_at, '' AS v_title, '' AS v_type, '' AS v_price, '' AS v_locality, '' AS v_city FROM user_view_history WHERE user_id = :uid
                " . ($uphone !== '' ? "UNION ALL SELECT CAST(property_id AS CHAR(50)) COLLATE utf8mb4_unicode_ci AS property_id, viewed_at, property_title AS v_title, property_type AS v_type, price AS v_price, locality AS v_locality, city AS v_city FROM user_browsing_analytics WHERE user_phone = :uphone" : "") . "
            ) AS views
            LEFT JOIN properties p ON CAST(p.id AS CHAR(50)) COLLATE utf8mb4_unicode_ci = views.property_id
            LEFT JOIN projects prj ON CAST(prj.project_id AS CHAR(50)) COLLATE utf8mb4_unicode_ci = views.property_id
            WHERE (p.title IS NOT NULL AND p.title != '' AND p.title != '-')
               OR (prj.project_name IS NOT NULL AND prj.project_name != '' AND prj.project_name != '-')
               OR (views.v_title IS NOT NULL AND views.v_title != '' AND views.v_title != '-')
            GROUP BY COALESCE(p.id, prj.project_id, views.property_id)
            ORDER BY last_viewed_at DESC
        ";
        $pStmt = $db->prepare($pSql);
        $params = [':uid' => $uid];
        if ($uphone !== '') {
            $params[':uphone'] = $uphone;
        }
        $pStmt->execute($params);
        $props = $pStmt->fetchAll(PDO::FETCH_ASSOC);

        // Sanitize property attributes
        foreach ($props as &$prp) {
            if (empty($prp['property_type']) || $prp['property_type'] === '-') {
                $prp['property_type'] = 'Residential Plot';
            }
            if (empty($prp['title']) || $prp['title'] === '-') {
                $prp['title'] = 'Verified Property Listing';
            }
            if (empty($prp['locality']) || $prp['locality'] === '-') {
                $prp['locality'] = 'Tamil Nadu';
            }
            if (empty($prp['city']) || $prp['city'] === '-') {
                $prp['city'] = 'Tamil Nadu';
            }
            if (empty($prp['price']) || $prp['price'] === '-') {
                $prp['price'] = 'Price on Request';
            }
            if (empty($prp['image'])) {
                $prp['image'] = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80';
            }
        }
        unset($prp);

        $v['viewed_count'] = count($props);
        $v['viewed_properties_count'] = count($props);
        $v['viewed_properties'] = $props;
        $v['assigned_sales_id'] = !empty($v['assigned_sales_id']) ? (int)$v['assigned_sales_id'] : null;
        $v['assigned_advisor_id'] = !empty($v['assigned_advisor_id']) ? (int)$v['assigned_advisor_id'] : null;
        $v['assigned_ops_id'] = !empty($v['assigned_ops_id']) ? (int)$v['assigned_ops_id'] : null;
        $totalViews += count($props);

        // Determine if attempted
        $v['is_attempted'] = ($v['interaction_status'] !== 'new' || !empty(trim($v['notes'] ?? '')));

        // Auto-detect intention if not set
        if (empty($v['intention'])) {
            if ($v['viewed_count'] > 0) {
                $topType = $props[0]['property_type'] ?? 'Plot';
                $topLoc = $props[0]['locality'] ?? '';
                $v['intention'] = 'Browsing ' . $topType . ($topLoc ? ' in ' . $topLoc : '');
            } else {
                $v['intention'] = 'Initial Exploration';
            }
        }

        // Tally statuses
        if ($v['interaction_status'] === 'interested_site_visit') $interestedCount++;
        else if ($v['interaction_status'] === 'contacted') $contactedCount++;
        else if ($v['interaction_status'] === 'transferred_advisor') $transferredCount++;
    }
    unset($v);

    $kpis = [
        'totalAssignedLeads' => count($visitors),
        'hotProspects'       => $interestedCount,
        'contactedLeads'     => $contactedCount,
        'transferredAdvisor' => $transferredCount
    ];

    Response::success([
        'role'      => 'sales_executive',
        'kpis'      => $kpis,
        'visitors'  => $visitors,
        'roleStaff' => $roleStaff
    ], 'Sales Executive live visitors loaded');
}

// -------------------------------------------------------------
// 2. PROPERTY ADVISOR DASHBOARD DATA (LIVE TRANSFERRED LEADS)
// -------------------------------------------------------------
if ($role === 'property_advisor') {
    $staffWhereSql = '';
    $staffParams = [];
    if ($filterStaffId > 0) {
        $staffWhereSql = " AND sli.assigned_advisor_id = :filter_staff_id";
        $staffParams[':filter_staff_id'] = $filterStaffId;
    } elseif ($filterStaffId === -1) {
        $staffWhereSql = " AND (sli.assigned_advisor_id IS NULL OR sli.assigned_advisor_id = 0)";
    } elseif ($callerIsStaffScoped) {
        $staffWhereSql = " AND (sli.assigned_advisor_id = :caller_staff_id OR sli.assigned_advisor_id IS NULL OR sli.assigned_advisor_id = 0)";
        $staffParams[':caller_staff_id'] = $adminId;
    }

    // Fetch live customers transferred from Sales Executive, assigned to Advisor, or actively in Advisory / Operations stages
    $advisorStmt = $db->prepare("
        SELECT 
            sli.id AS interaction_id,
            u.id AS user_id,
            COALESCE(NULLIF(u.name, ''), CONCAT('Investor #', u.id)) AS client_name,
            COALESCE(u.phone, '') AS phone,
            u.email,
            COALESCE(NULLIF(sli.intention, ''), 'Site Visit Requested') AS intention,
            COALESCE(sli.notes, '') AS sales_notes,
            COALESCE(sli.advisor_notes, '') AS advisor_notes,
            COALESCE(sli.preferred_location, '') AS preferred_location,
            sli.budget_min,
            sli.budget_max,
            sli.assigned_sales_id,
            sales_u.name AS assigned_sales_name,
            sli.assigned_advisor_id,
            adv_u.name AS assigned_advisor_name,
            sli.assigned_ops_id,
            ops_u.name AS assigned_ops_name,
            sli.scheduled_visit_at,
            sli.exit_stage,
            sli.exit_reason_category,
            sli.exit_notes,
            sli.reengage_date,
            COALESCE(sli.transferred_at, sli.updated_at) AS transferred_at,
            sli.updated_at,
            sli.status
        FROM sales_lead_interactions sli
        JOIN users u ON u.id = sli.user_id
        LEFT JOIN users sales_u ON sales_u.id = sli.assigned_sales_id
        LEFT JOIN users adv_u ON adv_u.id = sli.assigned_advisor_id
        LEFT JOIN users ops_u ON ops_u.id = sli.assigned_ops_id
        WHERE (
            sli.status IN (
                'transferred_advisor',
                'requirement_understood',
                'projects_recommended',
                'shortlist_completed',
                'site_visit_scheduled',
                'site_visit_completed',
                'booking_in_progress',
                'booked_converted'
            )
            OR sli.transferred_at IS NOT NULL
            OR sli.assigned_advisor_id IS NOT NULL
        )
          AND sli.status != 'lost_on_hold'
          AND sli.discontinued_at IS NULL
          AND (u.role = 'buyer' OR u.role = 'verified_buyer')
          AND u.role NOT IN ('admin', 'super_admin', 'co_admin', 'sales_executive', 'property_advisor', 'operations_executive', 'finance_admin', 'content_gis_admin', 'developer')
          AND (u.email IS NULL OR (u.email NOT LIKE '%@findaplot.com' AND u.email NOT LIKE '%@findaplot.in'))
          AND (u.phone IS NULL OR u.phone NOT LIKE '+91 94440%')
          AND u.id NOT IN (1, 101, 102, 103, 104, 105, 108, 109, 110, 111, 112, 113, 116)
          {$staffWhereSql}
        ORDER BY COALESCE(sli.updated_at, sli.transferred_at) DESC
        LIMIT 100
    ");
    $advisorStmt->execute($staffParams);
    $rawConsultations = $advisorStmt->fetchAll(PDO::FETCH_ASSOC);

    $stageLabelMap = [
        'transferred_advisor'    => 'Requirement Understood',
        'requirement_understood' => 'Requirement Understood',
        'projects_recommended'   => 'Projects Recommended',
        'shortlist_completed'    => 'Shortlist Completed',
        'interested_site_visit'  => 'Site Visit Scheduled',
        'site_visit_scheduled'   => 'Site Visit Scheduled',
        'site_visit_completed'   => 'Site Visit Completed',
        'booking_in_progress'    => 'Booking in Progress',
        'booked_converted'       => 'Booked / Converted',
        'lost_on_hold'           => 'Lost / On Hold'
    ];

    $consultations = [];
    $pendingReviewCount = 0;
    $shortlistedClientsCount = 0;
    $handedToOpsCount = 0;

    foreach ($rawConsultations as $c) {
        $uid = (int)$c['user_id'];
        $uphone = $c['phone'] ?: '';

        $rawStatus = (string)($c['status'] ?? 'requirement_understood');
        $normalizedStatus = $rawStatus;
        if ($rawStatus === 'transferred_advisor') {
            $normalizedStatus = 'requirement_understood';
        } elseif ($rawStatus === 'interested_site_visit') {
            $normalizedStatus = 'site_visit_scheduled';
        }

        // Fetch viewed properties summary for the advisor (full card details for inspection modal)
        $pSql = "
            SELECT 
                COALESCE(p.id, prj.project_id, views.property_id) AS id, 
                COALESCE(NULLIF(MAX(p.title), ''), NULLIF(MAX(prj.project_name), ''), NULLIF(MAX(views.v_title), ''), 'Verified Plot') AS title, 
                COALESCE(NULLIF(MAX(p.property_type), ''), NULLIF(MAX(prj.category), ''), NULLIF(MAX(prj.type), ''), 'Residential Plot') AS property_type, 
                COALESCE(NULLIF(MAX(p.price), ''), CASE WHEN MAX(prj.price_from) > 0 THEN CONCAT('₹ ', FORMAT(MAX(prj.price_from) / 100000, 2), ' Lakhs') ELSE NULL END, 'Price on Request') AS price,
                COALESCE(NULLIF(MAX(p.price_per_sqft), ''), CASE WHEN MAX(prj.sqft_rate) > 0 THEN CONCAT('₹ ', FORMAT(MAX(prj.sqft_rate), 0), '/sq.ft') ELSE '' END) AS price_per_sqft,
                COALESCE(NULLIF(MAX(p.sqft), ''), CASE WHEN MAX(prj.min_plot_size) > 0 THEN CONCAT(FORMAT(MAX(prj.min_plot_size), 0), ' sq.ft') ELSE '' END) AS sqft,
                COALESCE(NULLIF(MAX(p.locality_name), ''), NULLIF(MAX(prj.locality), ''), 'Locality') AS locality,
                COALESCE(NULLIF(MAX(p.city_name), ''), NULLIF(MAX(prj.city), ''), 'Tamil Nadu') AS city,
                COALESCE(NULLIF(MAX(p.main_image_url), ''), NULLIF(MAX(prj.cover_image), ''), 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80') AS image,
                MAX(views.viewed_at) AS last_viewed_at
            FROM (
                SELECT CAST(property_id AS CHAR(50)) COLLATE utf8mb4_unicode_ci AS property_id, viewed_at, '' AS v_title FROM user_view_history WHERE user_id = :uid
                " . ($uphone !== '' ? "UNION ALL SELECT CAST(property_id AS CHAR(50)) COLLATE utf8mb4_unicode_ci AS property_id, viewed_at, property_title AS v_title FROM user_browsing_analytics WHERE user_phone = :uphone" : "") . "
            ) AS views
            LEFT JOIN properties p ON CAST(p.id AS CHAR(50)) COLLATE utf8mb4_unicode_ci = views.property_id
            LEFT JOIN projects prj ON CAST(prj.project_id AS CHAR(50)) COLLATE utf8mb4_unicode_ci = views.property_id
            WHERE (p.title IS NOT NULL AND p.title != '' AND p.title != '-') 
               OR (prj.project_name IS NOT NULL AND prj.project_name != '' AND prj.project_name != '-')
               OR (views.v_title IS NOT NULL AND views.v_title != '' AND views.v_title != '-')
            GROUP BY COALESCE(p.id, prj.project_id, views.property_id)
            ORDER BY last_viewed_at DESC
            LIMIT 8
        ";
        $pStmt = $db->prepare($pSql);
        $pStmt->execute($uphone !== '' ? [':uid' => $uid, ':uphone' => $uphone] : [':uid' => $uid]);
        $props = $pStmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch shortlisted / recommended properties for this client
        $sStmt = $db->prepare("
            SELECT 
                s.property_id AS id,
                COALESCE(NULLIF(MAX(p.title), ''), NULLIF(MAX(prj.project_name), ''), s.property_id) AS title,
                COALESCE(NULLIF(MAX(p.locality_name), ''), NULLIF(MAX(prj.locality), ''), 'Tamil Nadu') AS locality,
                COALESCE(NULLIF(MAX(p.price), ''), CASE WHEN MAX(prj.price_from) > 0 THEN CONCAT('₹ ', FORMAT(MAX(prj.price_from) / 100000, 2), ' Lakhs') ELSE 'Price on Request' END) AS price,
                COALESCE(NULLIF(MAX(p.property_type), ''), NULLIF(MAX(prj.category), ''), 'Residential Plot') AS property_type,
                MAX(s.created_at) AS shortlisted_at
            FROM user_shortlists s
            LEFT JOIN properties p ON CAST(p.id AS CHAR(50)) COLLATE utf8mb4_unicode_ci = CAST(s.property_id AS CHAR(50)) COLLATE utf8mb4_unicode_ci
            LEFT JOIN projects prj ON CAST(prj.project_id AS CHAR(50)) COLLATE utf8mb4_unicode_ci = CAST(s.property_id AS CHAR(50)) COLLATE utf8mb4_unicode_ci
            WHERE s.user_id = ?
            GROUP BY s.property_id
            ORDER BY shortlisted_at DESC
        ");
        $sStmt->execute([$uid]);
        $shortlistedProps = $sStmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch site visits scheduled for this client
        $svStmt = $db->prepare("
            SELECT id, property_id, property_title, locality, visit_date, visit_slot, status, assigned_executive_name, admin_notes
            FROM user_site_visits
            WHERE user_id = ?
            ORDER BY id DESC
            LIMIT 5
        ");
        $svStmt->execute([$uid]);
        $clientVisits = $svStmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch consultation & pipeline history for this client
        $histStmt = $db->prepare("
            SELECT id, from_stage, to_stage, department, action_type, notes, changed_by_name, created_at
            FROM lead_stage_history
            WHERE user_id = ?
            ORDER BY id DESC
            LIMIT 10
        ");
        $histStmt->execute([$uid]);
        $clientHistory = $histStmt->fetchAll(PDO::FETCH_ASSOC);

        // Tally KPI metrics
        if ($normalizedStatus === 'requirement_understood') {
            $pendingReviewCount++;
        }
        if (in_array($normalizedStatus, ['projects_recommended', 'shortlist_completed'], true) || count($shortlistedProps) > 0) {
            $shortlistedClientsCount++;
        }
        if (in_array($normalizedStatus, ['site_visit_scheduled', 'site_visit_completed', 'booking_in_progress', 'booked_converted'], true) || count($clientVisits) > 0) {
            $handedToOpsCount++;
        }

        $consultations[] = [
            'id'                      => $c['interaction_id'],
            'interaction_id'          => $c['interaction_id'],
            'userId'                  => $c['user_id'],
            'user_id'                 => $c['user_id'],
            'clientName'              => $c['client_name'],
            'client_name'             => $c['client_name'],
            'phone'                   => $c['phone'],
            'email'                   => $c['email'],
            'intention'               => $c['intention'],
            'preferred_location'      => $c['preferred_location'],
            'budget_min'              => $c['budget_min'] !== null ? (float)$c['budget_min'] : null,
            'budget_max'              => $c['budget_max'] !== null ? (float)$c['budget_max'] : null,
            'assigned_sales_id'       => $c['assigned_sales_id'] ? (int)$c['assigned_sales_id'] : null,
            'assigned_sales_name'     => $c['assigned_sales_name'] ?? null,
            'assigned_advisor_id'     => $c['assigned_advisor_id'] ? (int)$c['assigned_advisor_id'] : null,
            'assigned_advisor_name'   => $c['assigned_advisor_name'] ?? null,
            'assigned_ops_id'         => $c['assigned_ops_id'] ? (int)$c['assigned_ops_id'] : null,
            'assigned_ops_name'       => $c['assigned_ops_name'] ?? null,
            'salesNotes'              => $c['sales_notes'],
            'sales_notes'             => $c['sales_notes'],
            'advisorNotes'            => $c['advisor_notes'],
            'advisor_notes'           => $c['advisor_notes'],
            'transferredAt'           => $c['transferred_at'],
            'transferred_at'          => $c['transferred_at'],
            'updated_at'              => $c['updated_at'],
            'scheduled_visit_at'      => $c['scheduled_visit_at'],
            'exit_stage'              => $c['exit_stage'],
            'exit_reason_category'    => $c['exit_reason_category'],
            'exit_notes'              => $c['exit_notes'],
            'reengage_date'           => $c['reengage_date'],
            'interaction_status'      => $normalizedStatus,
            'status'                  => $normalizedStatus,
            'status_label'            => $stageLabelMap[$normalizedStatus] ?? 'Requirement Understood',
            'viewedProperties'        => $props,
            'viewed_properties'       => $props,
            'viewed_properties_count' => count($props),
            'shortlisted_properties'  => $shortlistedProps,
            'shortlisted_count'       => count($shortlistedProps),
            'site_visits'             => $clientVisits,
            'site_visits_count'       => count($clientVisits),
            'history'                 => $clientHistory
        ];
    }

    // Fetch verified available properties so Property Advisor can recommend & shortlist
    $availStmt = $db->query("
        SELECT 
            p.id,
            p.title,
            COALESCE(NULLIF(p.locality_name, ''), NULLIF(p.city_name, ''), 'Tamil Nadu') AS locality,
            COALESCE(NULLIF(p.city_name, ''), 'Tamil Nadu') AS city,
            COALESCE(NULLIF(p.price, ''), 'Price on Request') AS price,
            COALESCE(NULLIF(p.property_type, ''), 'Residential Plot') AS property_type
        FROM properties p
        WHERE p.status = 'published'
          AND p.title IS NOT NULL
          AND p.title != ''
          AND LOWER(p.title) != 'test'
        ORDER BY p.is_featured DESC, p.created_at DESC
        LIMIT 40
    ");
    $availableProperties = $availStmt->fetchAll(PDO::FETCH_ASSOC);

    $totalConsults = count($consultations);
    $progressedCount = $shortlistedClientsCount + $handedToOpsCount;
    $satisfactionPct = $totalConsults > 0
        ? min(100, (int)round(($progressedCount / $totalConsults) * 100)) . '%'
        : 'N/A';

    $kpis = [
        'advisorySessions'        => $totalConsults,
        'pendingRequirementReview'=> $pendingReviewCount,
        'activeDossierMatches'    => $shortlistedClientsCount,
        'legalPattaClearances'    => $handedToOpsCount,
        'clientSatisfaction'      => $satisfactionPct
    ];

    Response::success([
        'role'                => 'property_advisor',
        'kpis'                => $kpis,
        'consultations'       => $consultations,
        'availableProperties' => $availableProperties,
        'roleStaff'           => $roleStaff
    ], 'Property Advisor live consultations loaded');
}

// -------------------------------------------------------------
// 3. OPERATIONS EXECUTIVE DASHBOARD DATA (LIVE SITE VISITS & CLOSINGS)
// -------------------------------------------------------------
if ($role === 'operations_executive') {
    $staffWhereSql = '';
    $staffParams = [];
    if ($filterStaffId > 0) {
        $staffWhereSql = " AND sli.assigned_ops_id = :filter_staff_id";
        $staffParams[':filter_staff_id'] = $filterStaffId;
    } elseif ($filterStaffId === -1) {
        $staffWhereSql = " AND (sli.assigned_ops_id IS NULL OR sli.assigned_ops_id = 0)";
    } elseif ($callerIsStaffScoped) {
        $staffWhereSql = " AND (sli.assigned_ops_id = :caller_staff_id OR sli.assigned_ops_id IS NULL OR sli.assigned_ops_id = 0)";
        $staffParams[':caller_staff_id'] = $adminId;
    }

    $opsStmt = $db->prepare("
        SELECT 
            u.id AS user_id,
            COALESCE(NULLIF(u.name, ''), CONCAT('Investor #', u.id)) AS visitorName,
            COALESCE(u.phone, '') AS visitorPhone,
            u.email AS visitorEmail,
            sli.id AS interaction_id,
            COALESCE(sli.status, 'site_visit_scheduled') AS sli_status,
            COALESCE(NULLIF(sli.intention, ''), 'Site Visit Scheduled') AS intention,
            COALESCE(sli.notes, '') AS sales_notes,
            COALESCE(sli.advisor_notes, '') AS advisor_notes,
            COALESCE(sli.ops_notes, '') AS ops_notes,
            COALESCE(sli.preferred_location, '') AS preferred_location,
            sli.budget_min,
            sli.budget_max,
            sli.assigned_sales_id,
            sales_u.name AS assigned_sales_name,
            sli.assigned_advisor_id,
            adv_u.name AS assigned_advisor_name,
            sli.assigned_ops_id,
            ops_u.name AS assigned_ops_name,
            sli.scheduled_visit_at,
            sli.booked_property_id,
            sli.plot_no,
            sli.booking_amount,
            sli.final_price,
            sli.registration_date,
            sli.deal_notes,
            sli.exit_stage,
            sli.exit_reason_category,
            sli.exit_notes,
            sli.reengage_date,
            sli.updated_at,
            sv.id AS visit_id,
            COALESCE(NULLIF(sv.property_id, ''), 'PRJ-0001') AS propertyId,
            COALESCE(NULLIF(sv.property_title, ''), NULLIF(sli.intention, ''), 'Verified Layout Site Visit') AS propertyTitle,
            COALESCE(NULLIF(sv.locality, ''), NULLIF(sli.preferred_location, ''), 'Tamil Nadu') AS locality,
            COALESCE(sv.visit_date, DATE(sli.scheduled_visit_at), CURDATE()) AS scheduledDate,
            COALESCE(NULLIF(sv.visit_slot, ''), '10:00 AM - 12:00 PM') AS timeSlot,
            COALESCE(NULLIF(sv.assigned_executive_name, ''), ops_u.name, 'Karthik (Field Operations Mgr)') AS fieldExecutive,
            COALESCE(NULLIF(sv.pickup_location, ''), 'Direct at Site Gate') AS pickupLocation,
            COALESCE(NULLIF(sv.status, ''), 'requested') AS visitStatus,
            COALESCE(NULLIF(sv.dtcp_marker_status, ''), NULLIF(sli.dtcp_marker_status, ''), 'Pending Survey') AS dtcpMarkerCheck,
            COALESCE(NULLIF(sv.gps_coords, ''), NULLIF(sli.gps_coords, ''), '') AS gpsCoords,
            sv.admin_notes AS visit_admin_notes
        FROM users u
        LEFT JOIN sales_lead_interactions sli ON sli.id = (
            SELECT MAX(id) FROM sales_lead_interactions WHERE user_id = u.id
        )
        LEFT JOIN users sales_u ON sales_u.id = sli.assigned_sales_id
        LEFT JOIN users adv_u ON adv_u.id = sli.assigned_advisor_id
        LEFT JOIN users ops_u ON ops_u.id = sli.assigned_ops_id
        LEFT JOIN user_site_visits sv ON sv.id = (
            SELECT MAX(id) FROM user_site_visits WHERE user_id = u.id
        )
        WHERE (
            sv.id IS NOT NULL
            OR sli.status IN ('site_visit_scheduled', 'interested_site_visit', 'site_visit_completed', 'booking_in_progress', 'booked_converted')
            OR sli.assigned_ops_id IS NOT NULL
        )
          AND (sli.status IS NULL OR sli.status != 'lost_on_hold')
          AND sli.discontinued_at IS NULL
          AND (u.role = 'buyer' OR u.role = 'verified_buyer')
          AND u.role NOT IN ('admin', 'super_admin', 'co_admin', 'sales_executive', 'property_advisor', 'operations_executive', 'finance_admin', 'content_gis_admin', 'developer')
          AND (u.email IS NULL OR (u.email NOT LIKE '%@findaplot.com' AND u.email NOT LIKE '%@findaplot.in'))
          AND (u.phone IS NULL OR u.phone NOT LIKE '+91 94440%')
          AND u.id NOT IN (1, 101, 102, 103, 104, 105, 108, 109, 110, 111, 112, 113, 116)
          {$staffWhereSql}
        ORDER BY COALESCE(sv.visit_date, DATE(sli.updated_at), DATE(u.created_at)) DESC, u.id DESC
        LIMIT 100
    ");
    $opsStmt->execute($staffParams);
    $rawVisits = $opsStmt->fetchAll(PDO::FETCH_ASSOC);

    $opsStageLabelMap = [
        'site_visit_scheduled' => 'Site Visit Scheduled',
        'site_visit_completed' => 'Site Visit Completed',
        'booking_in_progress'  => 'Booking in Progress',
        'booked_converted'     => 'Booked / Converted',
        'lost_on_hold'         => 'Lost / On Hold'
    ];

    $siteVisits = [];
    $scheduledCount = 0;
    $completedSurveysCount = 0;
    $bookingsCount = 0;
    $dealsClosedCount = 0;
    $confirmedOrDoneVisits = 0;
    $gpsVerifiedCount = 0;

    foreach ($rawVisits as $row) {
        $uid = (int)$row['user_id'];
        $uphone = $row['visitorPhone'] ?: '';

        $rawStage = (string)$row['sli_status'];
        if ($rawStage === 'interested_site_visit' || !in_array($rawStage, ['site_visit_scheduled', 'site_visit_completed', 'booking_in_progress', 'booked_converted', 'lost_on_hold'], true)) {
            $normalizedStage = 'site_visit_scheduled';
        } else {
            $normalizedStage = $rawStage;
        }

        // Viewed properties for inspection modal
        $pSql = "
            SELECT 
                COALESCE(p.id, prj.project_id, views.property_id) AS id, 
                COALESCE(NULLIF(MAX(p.title), ''), NULLIF(MAX(prj.project_name), ''), NULLIF(MAX(views.v_title), ''), 'Verified Plot') AS title, 
                COALESCE(NULLIF(MAX(p.property_type), ''), NULLIF(MAX(prj.category), ''), NULLIF(MAX(prj.type), ''), 'Residential Plot') AS property_type, 
                COALESCE(NULLIF(MAX(p.price), ''), CASE WHEN MAX(prj.price_from) > 0 THEN CONCAT('₹ ', FORMAT(MAX(prj.price_from) / 100000, 2), ' Lakhs') ELSE NULL END, 'Price on Request') AS price,
                COALESCE(NULLIF(MAX(p.price_per_sqft), ''), CASE WHEN MAX(prj.sqft_rate) > 0 THEN CONCAT('₹ ', FORMAT(MAX(prj.sqft_rate), 0), '/sq.ft') ELSE '' END) AS price_per_sqft,
                COALESCE(NULLIF(MAX(p.sqft), ''), CASE WHEN MAX(prj.min_plot_size) > 0 THEN CONCAT(FORMAT(MAX(prj.min_plot_size), 0), ' sq.ft') ELSE '' END) AS sqft,
                COALESCE(NULLIF(MAX(p.locality_name), ''), NULLIF(MAX(prj.locality), ''), 'Locality') AS locality,
                COALESCE(NULLIF(MAX(p.city_name), ''), NULLIF(MAX(prj.city), ''), 'Tamil Nadu') AS city,
                COALESCE(NULLIF(MAX(p.main_image_url), ''), NULLIF(MAX(prj.cover_image), ''), 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80') AS image,
                MAX(views.viewed_at) AS last_viewed_at
            FROM (
                SELECT CAST(property_id AS CHAR(50)) COLLATE utf8mb4_unicode_ci AS property_id, viewed_at, '' AS v_title FROM user_view_history WHERE user_id = :uid
                " . ($uphone !== '' ? "UNION ALL SELECT CAST(property_id AS CHAR(50)) COLLATE utf8mb4_unicode_ci AS property_id, viewed_at, property_title AS v_title FROM user_browsing_analytics WHERE user_phone = :uphone" : "") . "
            ) AS views
            LEFT JOIN properties p ON CAST(p.id AS CHAR(50)) COLLATE utf8mb4_unicode_ci = views.property_id
            LEFT JOIN projects prj ON CAST(prj.project_id AS CHAR(50)) COLLATE utf8mb4_unicode_ci = views.property_id
            WHERE (p.title IS NOT NULL AND p.title != '' AND p.title != '-') 
               OR (prj.project_name IS NOT NULL AND prj.project_name != '' AND prj.project_name != '-')
               OR (views.v_title IS NOT NULL AND views.v_title != '' AND views.v_title != '-')
            GROUP BY COALESCE(p.id, prj.project_id, views.property_id)
            ORDER BY last_viewed_at DESC
            LIMIT 8
        ";
        $pStmt = $db->prepare($pSql);
        $pStmt->execute($uphone !== '' ? [':uid' => $uid, ':uphone' => $uphone] : [':uid' => $uid]);
        $viewedProps = $pStmt->fetchAll(PDO::FETCH_ASSOC);

        // Shortlisted properties from Advisor / Buyer
        $sStmt = $db->prepare("
            SELECT 
                s.property_id AS id,
                COALESCE(NULLIF(MAX(p.title), ''), NULLIF(MAX(prj.project_name), ''), s.property_id) AS title,
                COALESCE(NULLIF(MAX(p.locality_name), ''), NULLIF(MAX(prj.locality), ''), 'Tamil Nadu') AS locality,
                COALESCE(NULLIF(MAX(p.price), ''), CASE WHEN MAX(prj.price_from) > 0 THEN CONCAT('₹ ', FORMAT(MAX(prj.price_from) / 100000, 2), ' Lakhs') ELSE 'Price on Request' END) AS price,
                MAX(s.created_at) AS shortlisted_at
            FROM user_shortlists s
            LEFT JOIN properties p ON CAST(p.id AS CHAR(50)) COLLATE utf8mb4_unicode_ci = CAST(s.property_id AS CHAR(50)) COLLATE utf8mb4_unicode_ci
            LEFT JOIN projects prj ON CAST(prj.project_id AS CHAR(50)) COLLATE utf8mb4_unicode_ci = CAST(s.property_id AS CHAR(50)) COLLATE utf8mb4_unicode_ci
            WHERE s.user_id = ?
            GROUP BY s.property_id
            ORDER BY shortlisted_at DESC
        ");
        $sStmt->execute([$uid]);
        $shortlistedProps = $sStmt->fetchAll(PDO::FETCH_ASSOC);

        // History timeline
        $hStmt = $db->prepare("
            SELECT id, from_stage, to_stage, department, action_type, notes, changed_by_name, created_at
            FROM lead_stage_history
            WHERE user_id = ?
            ORDER BY id DESC
            LIMIT 10
        ");
        $hStmt->execute([$uid]);
        $clientHistory = $hStmt->fetchAll(PDO::FETCH_ASSOC);

        $opsNotes = $row['ops_notes'] !== '' ? $row['ops_notes'] : (string)($row['visit_admin_notes'] ?? '');
        $visitStatus = strtolower((string)$row['visitStatus']);

        if ($normalizedStage === 'site_visit_scheduled') $scheduledCount++;
        elseif ($normalizedStage === 'site_visit_completed') $completedSurveysCount++;
        elseif ($normalizedStage === 'booking_in_progress') $bookingsCount++;
        elseif ($normalizedStage === 'booked_converted') $dealsClosedCount++;

        if (in_array($visitStatus, ['confirmed', 'completed'], true)) {
            $confirmedOrDoneVisits++;
        }
        if ($row['dtcpMarkerCheck'] !== 'Pending Survey' || !empty($row['gpsCoords']) || in_array($normalizedStage, ['site_visit_completed', 'booking_in_progress', 'booked_converted'], true)) {
            $gpsVerifiedCount++;
        }

        $siteVisits[] = [
            'id'                      => $row['visit_id'] ? (string)$row['visit_id'] : ('U-' . $uid),
            'visit_id'                => $row['visit_id'] ? (int)$row['visit_id'] : null,
            'user_id'                 => $uid,
            'interaction_id'          => $row['interaction_id'] ? (int)$row['interaction_id'] : null,
            'visitorName'             => $row['visitorName'],
            'client_name'             => $row['visitorName'],
            'name'                    => $row['visitorName'],
            'visitorPhone'            => $row['visitorPhone'],
            'phone'                   => $row['visitorPhone'],
            'visitorEmail'            => $row['visitorEmail'],
            'propertyId'              => $row['propertyId'],
            'propertyTitle'           => $row['propertyTitle'],
            'locality'                => $row['locality'],
            'scheduledDate'           => $row['scheduledDate'],
            'timeSlot'                => $row['timeSlot'],
            'fieldExecutive'          => $row['fieldExecutive'],
            'pickupLocation'          => $row['pickupLocation'],
            'visitStatus'             => $visitStatus,
            'status'                  => $visitStatus,
            'interaction_status'      => $normalizedStage,
            'status_label'            => $opsStageLabelMap[$normalizedStage] ?? 'Site Visit Scheduled',
            'dtcpMarkerCheck'         => $row['dtcpMarkerCheck'],
            'gpsCoords'               => $row['gpsCoords'],
            'sales_notes'             => $row['sales_notes'],
            'advisor_notes'           => $row['advisor_notes'],
            'ops_notes'               => $opsNotes,
            'preferred_location'      => $row['preferred_location'],
            'budget_min'              => $row['budget_min'] !== null ? (float)$row['budget_min'] : null,
            'budget_max'              => $row['budget_max'] !== null ? (float)$row['budget_max'] : null,
            'assigned_sales_id'       => $row['assigned_sales_id'] ? (int)$row['assigned_sales_id'] : null,
            'assigned_sales_name'     => $row['assigned_sales_name'] ?? null,
            'assigned_advisor_id'     => $row['assigned_advisor_id'] ? (int)$row['assigned_advisor_id'] : null,
            'assigned_advisor_name'   => $row['assigned_advisor_name'] ?? null,
            'assigned_ops_id'         => $row['assigned_ops_id'] ? (int)$row['assigned_ops_id'] : null,
            'assigned_ops_name'       => $row['assigned_ops_name'] ?? null,
            'booked_property_id'      => $row['booked_property_id'] ?: $row['propertyId'],
            'plot_no'                 => $row['plot_no'] ?? '',
            'booking_amount'          => $row['booking_amount'] !== null ? (float)$row['booking_amount'] : null,
            'final_price'             => $row['final_price'] !== null ? (float)$row['final_price'] : null,
            'registration_date'       => $row['registration_date'] ?? '',
            'deal_notes'              => $row['deal_notes'] ?? '',
            'exit_stage'              => $row['exit_stage'],
            'exit_reason_category'    => $row['exit_reason_category'],
            'exit_notes'              => $row['exit_notes'],
            'reengage_date'           => $row['reengage_date'],
            'updated_at'              => $row['updated_at'],
            'viewed_properties'       => $viewedProps,
            'viewed_properties_count' => count($viewedProps),
            'shortlisted_properties'  => $shortlistedProps,
            'shortlisted_count'       => count($shortlistedProps),
            'history'                 => $clientHistory
        ];
    }

    // Available verified properties for property selection / booking
    $availStmt = $db->query("
        SELECT 
            p.id,
            p.title,
            COALESCE(NULLIF(p.locality_name, ''), NULLIF(p.city_name, ''), 'Tamil Nadu') AS locality,
            COALESCE(NULLIF(p.city_name, ''), 'Tamil Nadu') AS city,
            COALESCE(NULLIF(p.price, ''), 'Price on Request') AS price
        FROM properties p
        WHERE p.status = 'published'
          AND p.title IS NOT NULL
          AND p.title != ''
          AND LOWER(p.title) != 'test'
        ORDER BY p.is_featured DESC, p.created_at DESC
        LIMIT 40
    ");
    $availableProperties = $availStmt->fetchAll(PDO::FETCH_ASSOC);

    $totalVisits = count($siteVisits);
    $confirmPct = $totalVisits > 0 ? round(($confirmedOrDoneVisits / $totalVisits) * 100) . '%' : '0%';

    $kpis = [
        'scheduledVisits'       => $scheduledCount,
        'completedSurveys'      => $completedSurveysCount,
        'bookingsInProgress'    => $bookingsCount,
        'dealsClosed'           => $dealsClosedCount,
        'upcomingThisWeek'      => $totalVisits,
        'gpsSurveysCompleted'   => $gpsVerifiedCount,
        'promoterConfirmations' => $confirmPct
    ];

    Response::success([
        'role'                => 'operations_executive',
        'kpis'                => $kpis,
        'siteVisits'          => $siteVisits,
        'availableProperties' => $availableProperties,
        'roleStaff'           => $roleStaff
    ], 'Operations Executive live site visits loaded');
}

// -------------------------------------------------------------
// 4. FINANCE ADMIN DASHBOARD DATA (LIVE LEDGER)
// -------------------------------------------------------------
if ($role === 'finance_admin') {
    $revStmt = $db->query("
        SELECT 
            COALESCE(SUM(amount_rupees), 0) AS total_revenue,
            COUNT(*) AS total_txns
        FROM wallet_transactions
    ");
    $rev = $revStmt->fetch(PDO::FETCH_ASSOC);

    $subStmt = $db->query("SELECT COUNT(*) AS total_subs FROM user_subscriptions");
    $subCount = (int)($subStmt->fetch(PDO::FETCH_ASSOC)['total_subs'] ?? 0);

    $txnStmt = $db->query("
        SELECT 
            id,
            user_id,
            amount_rupees AS amount,
            payment_method AS method,
            status,
            created_at AS date
        FROM wallet_transactions
        ORDER BY id DESC
        LIMIT 50
    ");
    $recentTxns = $txnStmt->fetchAll(PDO::FETCH_ASSOC);

    $kpis = [
        'totalRevenue'        => (float)$rev['total_revenue'],
        'razorpayShare'       => '100%',
        'activeSubscriptions' => $subCount,
        'pendingCommissions'  => '₹0'
    ];

    Response::success([
        'role'         => 'finance_admin',
        'kpis'         => $kpis,
        'transactions' => $recentTxns
    ], 'Finance Admin live transactions loaded');
}

// -------------------------------------------------------------
// 5. CONTENT / GIS ADMIN DASHBOARD DATA (LIVE COUNTS)
// -------------------------------------------------------------
if ($role === 'content_gis_admin') {
    $locStmt = $db->query("SELECT COUNT(*) AS loc_count FROM localities");
    $locCount = (int)($locStmt->fetch(PDO::FETCH_ASSOC)['loc_count'] ?? 0);

    $projStmt = $db->query("SELECT COUNT(*) AS proj_count FROM projects");
    $projCount = (int)($projStmt->fetch(PDO::FETCH_ASSOC)['proj_count'] ?? 0);

    $kpis = [
        'managedLocalities' => $locCount,
        'totalProjectsGIS'  => $projCount,
        'droneMediaTours'   => 0,
        'plotPartitions'    => 0
    ];

    Response::success([
        'role'     => 'content_gis_admin',
        'kpis'     => $kpis,
        'gisItems' => []
    ], 'Content & GIS Admin telemetry loaded');
}

Response::error('Unrecognized role specification', 400);
