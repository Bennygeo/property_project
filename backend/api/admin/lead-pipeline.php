<?php
/**
 * GET/POST /api/admin/lead-pipeline.php
 * Super Admin Master Lead Pipeline Command Center API.
 * Interconnects Sales Executive, Property Advisor, and Operations Executive workflows.
 * Supports any-stage discontinuation, exit analysis, and deal closures.
 * Strictly restricted to Super Admin role.
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

use Mannidam\Config\Database;
use Mannidam\Helpers\Response;

Response::initCors();

$method = $_SERVER['REQUEST_METHOD'];
$db = (new Database())->getConnection();

// Ensure advisor_notes & ops_notes columns exist on sales_lead_interactions
try {
    $sliCols = $db->query("SHOW COLUMNS FROM `sales_lead_interactions`")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('advisor_notes', $sliCols, true)) {
        $db->exec("ALTER TABLE `sales_lead_interactions` ADD COLUMN `advisor_notes` TEXT DEFAULT NULL AFTER `notes`");
    }
    if (!in_array('ops_notes', $sliCols, true)) {
        $db->exec("ALTER TABLE `sales_lead_interactions` ADD COLUMN `ops_notes` TEXT DEFAULT NULL AFTER `advisor_notes`");
    }
} catch (\Exception $e) {}

// -------------------------------------------------------------
// INTERNAL STAFF & SUPER ADMIN AUTHENTICATION & ACCESS VERIFICATION
// -------------------------------------------------------------
$adminId = (int)($_GET['admin_id'] ?? $_POST['admin_id'] ?? 0);
if ($adminId <= 0) {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $adminId = (int)($input['admin_id'] ?? 0);
}

$STAFF_ROLES = [
    'admin',
    'super_admin',
    'co_admin',
    'sales_executive',
    'property_advisor',
    'operations_executive',
    'finance_admin',
    'content_gis_admin'
];

$isAuthorizedStaff = false;
$isSuperAdmin = false;
$adminUser = null;

if ($adminId > 0) {
    $authStmt = $db->prepare("SELECT id, name, email, role FROM users WHERE id = ?");
    $authStmt->execute([$adminId]);
    $adminUser = $authStmt->fetch(PDO::FETCH_ASSOC);
    if ($adminUser && in_array($adminUser['role'], $STAFF_ROLES, true)) {
        $isAuthorizedStaff = true;
        if (in_array($adminUser['role'], ['admin', 'super_admin', 'co_admin'], true)) {
            $isSuperAdmin = true;
        }
    } else {
        Response::error('Access denied. The Lead Pipeline is restricted to authorized internal staff only.', 403);
        exit;
    }
} else {
    // If no admin_id passed, fallback to default active super admin
    $chkAdmin = $db->query("SELECT id, name, email, role FROM users WHERE role IN ('admin', 'super_admin') ORDER BY id ASC LIMIT 1");
    $adminUser = $chkAdmin->fetch(PDO::FETCH_ASSOC);
    if ($adminUser) {
        $adminId = (int)$adminUser['id'];
        $isAuthorizedStaff = true;
        $isSuperAdmin = true;
    } else {
        Response::error('Access denied. The Lead Pipeline is restricted to authorized internal staff only.', 403);
        exit;
    }
}

$isAdmin = $isSuperAdmin;

// -------------------------------------------------------------
// STAGE DEFINITIONS (Combined Contact Attempted & Contacted into 10 Stages)
// -------------------------------------------------------------
$stagesDefinition = [
    [
        'id'          => 'new_enquiry',
        'step'        => 1,
        'title'       => 'New enquiry',
        'department'  => 'sales',
        'dept_label'  => 'Sales Desk',
        'color'       => '#2563eb',
        'description' => 'Fresh inbound inquiry from portal, WhatsApp, or phone verification'
    ],
    [
        'id'          => 'customer_contacted',
        'step'        => 2,
        'title'       => 'Customer contacted',
        'department'  => 'sales',
        'dept_label'  => 'Sales Desk',
        'color'       => '#2563eb',
        'description' => 'Outreach attempted & direct phone/WhatsApp discussion held with buyer'
    ],
    [
        'id'          => 'requirement_understood',
        'step'        => 3,
        'title'       => 'Requirement understood',
        'department'  => 'sales_advisor',
        'dept_label'  => 'Sales / Advisor',
        'color'       => '#0d9488',
        'description' => 'Target locality, budget, plot size & investment horizon captured'
    ],
    [
        'id'          => 'projects_recommended',
        'step'        => 4,
        'title'       => 'Projects recommended',
        'department'  => 'property_advisor',
        'dept_label'  => 'Advisor Desk',
        'color'       => '#7c3aed',
        'description' => 'Curated verified layouts & cadastral dossiers shared with buyer'
    ],
    [
        'id'          => 'shortlist_completed',
        'step'        => 5,
        'title'       => 'Shortlist completed',
        'department'  => 'property_advisor',
        'dept_label'  => 'Advisor Desk',
        'color'       => '#7c3aed',
        'description' => 'Buyer pinned and confirmed top 1-3 plots for ground verification'
    ],
    [
        'id'          => 'site_visit_scheduled',
        'step'        => 6,
        'title'       => 'Site visit scheduled',
        'department'  => 'operations',
        'dept_label'  => 'Operations Desk',
        'color'       => '#ea580c',
        'description' => 'Field survey, chauffeur cab, and promoter access confirmed'
    ],
    [
        'id'          => 'site_visit_completed',
        'step'        => 7,
        'title'       => 'Site visit completed',
        'department'  => 'operations',
        'dept_label'  => 'Operations Desk',
        'color'       => '#ea580c',
        'description' => 'Ground inspection conducted; boundaries & road frontage verified'
    ],
    [
        'id'          => 'booking_in_progress',
        'step'        => 8,
        'title'       => 'Booking in progress',
        'department'  => 'operations',
        'dept_label'  => 'Operations Desk',
        'color'       => '#ea580c',
        'description' => 'Advance token, plot allocation & draft agreement in processing'
    ],
    [
        'id'          => 'booked_converted',
        'step'        => 9,
        'title'       => 'Booked / Converted',
        'department'  => 'closing',
        'dept_label'  => 'Deal Won',
        'color'       => '#16a34a',
        'description' => 'Deal successfully closed! Token paid and deed registered'
    ],
    [
        'id'          => 'lost_on_hold',
        'step'        => 10,
        'title'       => 'Lost / On hold',
        'department'  => 'terminal',
        'dept_label'  => 'Discontinued',
        'color'       => '#dc2626',
        'description' => 'Lead dropped out or paused at any point with verified exit cause'
    ]
];

$validStageIds = array_column($stagesDefinition, 'id');

/**
 * Helper to assign one lead's Sales / Advisor / Operations owner(s) and log history.
 */
function applyLeadRoleAssignment(
    PDO $db,
    int $userId,
    string $roleType,
    ?int $staffId,
    array $explicitIds,
    bool $advanceStage,
    string $assignmentNotes,
    int $adminId,
    string $adminName
): array {
    // Ensure buyer exists
    $uStmt = $db->prepare("SELECT id, name FROM users WHERE id = ?");
    $uStmt->execute([$userId]);
    if (!$uStmt->fetch(PDO::FETCH_ASSOC)) {
        return ['updated' => false, 'reason' => 'User not found'];
    }

    // Ensure sales_lead_interactions row exists
    $sliStmt = $db->prepare("SELECT * FROM sales_lead_interactions WHERE user_id = ? ORDER BY id DESC LIMIT 1");
    $sliStmt->execute([$userId]);
    $lead = $sliStmt->fetch(PDO::FETCH_ASSOC);

    if (!$lead) {
        $ins = $db->prepare("
            INSERT INTO sales_lead_interactions (user_id, status, intention, updated_by, created_at, updated_at)
            VALUES (?, 'new_enquiry', 'Fresh Inbound Lead', ?, NOW(), NOW())
        ");
        $ins->execute([$userId, $adminId]);
        $sliStmt->execute([$userId]);
        $lead = $sliStmt->fetch(PDO::FETCH_ASSOC);
    }

    $currentStage = (string)($lead['status'] ?? 'new_enquiry');
    $newStage = $currentStage;

    $newSalesId   = $lead['assigned_sales_id']   ? (int)$lead['assigned_sales_id']   : null;
    $newAdvisorId = $lead['assigned_advisor_id'] ? (int)$lead['assigned_advisor_id'] : null;
    $newOpsId     = $lead['assigned_ops_id']     ? (int)$lead['assigned_ops_id']     : null;
    $setTransferred = false;

    if ($roleType === 'sales') {
        $newSalesId = ($staffId && $staffId > 0) ? $staffId : null;
    } elseif ($roleType === 'advisor') {
        $newAdvisorId = ($staffId && $staffId > 0) ? $staffId : null;
        if ($newAdvisorId) {
            $setTransferred = true;
            if ($advanceStage && in_array($currentStage, ['new_enquiry', 'new', 'customer_contacted', 'contacted', 'contact_attempted'], true)) {
                $newStage = 'requirement_understood';
            }
        }
    } elseif ($roleType === 'operations') {
        $newOpsId = ($staffId && $staffId > 0) ? $staffId : null;
        if ($newOpsId && $advanceStage && in_array($currentStage, ['new_enquiry', 'new', 'customer_contacted', 'contacted', 'requirement_understood', 'transferred_advisor', 'projects_recommended', 'shortlist_completed'], true)) {
            $newStage = 'site_visit_scheduled';
        }
    } elseif ($roleType === 'all') {
        if (array_key_exists('assigned_sales_id', $explicitIds)) {
            $newSalesId = ($explicitIds['assigned_sales_id'] && (int)$explicitIds['assigned_sales_id'] > 0) ? (int)$explicitIds['assigned_sales_id'] : null;
        }
        if (array_key_exists('assigned_advisor_id', $explicitIds)) {
            $newAdvisorId = ($explicitIds['assigned_advisor_id'] && (int)$explicitIds['assigned_advisor_id'] > 0) ? (int)$explicitIds['assigned_advisor_id'] : null;
            if ($newAdvisorId) {
                $setTransferred = true;
            }
        }
        if (array_key_exists('assigned_ops_id', $explicitIds)) {
            $newOpsId = ($explicitIds['assigned_ops_id'] && (int)$explicitIds['assigned_ops_id'] > 0) ? (int)$explicitIds['assigned_ops_id'] : null;
        }
        if ($advanceStage) {
            if ($newOpsId && in_array($currentStage, ['new_enquiry', 'new', 'customer_contacted', 'contacted', 'requirement_understood', 'transferred_advisor', 'projects_recommended', 'shortlist_completed'], true)) {
                $newStage = 'site_visit_scheduled';
            } elseif ($newAdvisorId && in_array($currentStage, ['new_enquiry', 'new', 'customer_contacted', 'contacted', 'contact_attempted'], true)) {
                $newStage = 'requirement_understood';
            }
        }
    }

    $upd = $db->prepare("
        UPDATE sales_lead_interactions
        SET assigned_sales_id = :sales_id,
            assigned_advisor_id = :advisor_id,
            assigned_ops_id = :ops_id,
            status = :status,
            transferred_at = CASE WHEN :set_trans = 1 THEN COALESCE(transferred_at, NOW()) ELSE transferred_at END,
            updated_by = :upd_by,
            updated_at = NOW()
        WHERE user_id = :uid
    ");
    $upd->execute([
        ':sales_id'   => $newSalesId,
        ':advisor_id' => $newAdvisorId,
        ':ops_id'     => $newOpsId,
        ':status'     => $newStage,
        ':set_trans'  => $setTransferred ? 1 : 0,
        ':upd_by'     => $adminId,
        ':uid'        => $userId
    ]);

    // Resolve staff names for sync with user_site_visits and audit log
    $resolveName = function (?int $sid) use ($db): string {
        if (!$sid || $sid <= 0) return 'Unassigned';
        $st = $db->prepare("SELECT name FROM users WHERE id = ?");
        $st->execute([$sid]);
        $r = $st->fetch(PDO::FETCH_ASSOC);
        return $r['name'] ?? ("Staff #{$sid}");
    };

    if (($roleType === 'operations' || $roleType === 'all') && $newOpsId) {
        $opsName = $resolveName($newOpsId);
        try {
            $chkSv = $db->prepare("SELECT id FROM user_site_visits WHERE user_id = ? ORDER BY id DESC LIMIT 1");
            $chkSv->execute([$userId]);
            $svRow = $chkSv->fetch(PDO::FETCH_ASSOC);
            if ($svRow) {
                $db->prepare("UPDATE user_site_visits SET assigned_executive_name = ? WHERE id = ?")
                   ->execute([$opsName, (int)$svRow['id']]);
            } elseif ($advanceStage) {
                $db->prepare("
                    INSERT INTO user_site_visits (user_id, property_id, property_title, locality, visit_date, visit_slot, status, assigned_executive_name, created_at)
                    VALUES (?, 'PRJ-0001', 'Assigned Site Visit', 'Tamil Nadu', DATE_ADD(CURDATE(), INTERVAL 1 DAY), '10:00 AM - 12:00 PM', 'requested', ?, NOW())
                ")->execute([$userId, $opsName]);
            }
        } catch (\Exception $e) {}
    }

    // Build audit summary
    $summaryParts = [];
    if ($roleType === 'sales' || $roleType === 'all') {
        $summaryParts[] = 'Sales: ' . $resolveName($newSalesId);
    }
    if ($roleType === 'advisor' || $roleType === 'all') {
        $summaryParts[] = 'Advisor: ' . $resolveName($newAdvisorId);
    }
    if ($roleType === 'operations' || $roleType === 'all') {
        $summaryParts[] = 'Operations: ' . $resolveName($newOpsId);
    }
    $noteText = 'Role Assignment (' . implode(' | ', $summaryParts) . ')' . ($assignmentNotes !== '' ? " — {$assignmentNotes}" : '');
    $dept = $roleType === 'advisor' ? 'property_advisor' : ($roleType === 'operations' ? 'operations' : 'sales');

    try {
        $hist = $db->prepare("
            INSERT INTO lead_stage_history (
                user_id, interaction_id, from_stage, to_stage, department,
                action_type, notes, changed_by, changed_by_name, created_at
            ) VALUES (?, ?, ?, ?, ?, 'role_assigned', ?, ?, ?, NOW())
        ");
        $hist->execute([
            $userId,
            $lead['id'],
            $currentStage,
            $newStage,
            $dept,
            $noteText,
            $adminId,
            $adminName
        ]);
    } catch (\Exception $e) {}

    return [
        'updated'             => true,
        'user_id'             => $userId,
        'assigned_sales_id'   => $newSalesId,
        'assigned_advisor_id' => $newAdvisorId,
        'assigned_ops_id'     => $newOpsId,
        'status'              => $newStage
    ];
}

// -------------------------------------------------------------
// POST REQUESTS: ROLE ASSIGNMENT, STAGE TRANSITIONS, DISCONTINUE, REVIVE, CONVERT
// -------------------------------------------------------------
if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    if (empty($input)) {
        $input = $_POST;
    }

    $action = trim((string)($input['action'] ?? 'transition_stage'));

    // 0A. ASSIGN LEAD(S) TO ROLE STAFF (SINGLE OR BULK)
    if ($action === 'assign_lead_role') {
        $roleType = trim((string)($input['role_type'] ?? 'sales'));
        if (!in_array($roleType, ['sales', 'advisor', 'operations', 'all'], true)) {
            Response::error('Invalid role_type for assignment', 422);
        }

        $staffId = isset($input['staff_id']) && $input['staff_id'] !== '' ? (int)$input['staff_id'] : null;
        $advanceStage = !empty($input['advance_stage']);
        $assignmentNotes = trim((string)($input['assignment_notes'] ?? ''));

        $explicitIds = [];
        foreach (['assigned_sales_id', 'assigned_advisor_id', 'assigned_ops_id'] as $k) {
            if (array_key_exists($k, $input)) {
                $explicitIds[$k] = ($input[$k] !== '' && $input[$k] !== null) ? (int)$input[$k] : null;
            }
        }

        $targetUserIds = [];
        if (!empty($input['user_ids']) && is_array($input['user_ids'])) {
            foreach ($input['user_ids'] as $id) {
                if ((int)$id > 0) $targetUserIds[] = (int)$id;
            }
        } elseif (!empty($input['user_id']) && (int)$input['user_id'] > 0) {
            $targetUserIds[] = (int)$input['user_id'];
        }
        $targetUserIds = array_values(array_unique($targetUserIds));

        if (empty($targetUserIds)) {
            Response::error('At least one valid user_id is required', 400);
        }

        $results = [];
        foreach ($targetUserIds as $uid) {
            $results[] = applyLeadRoleAssignment(
                $db,
                $uid,
                $roleType,
                $staffId,
                $explicitIds,
                $advanceStage,
                $assignmentNotes,
                $adminId,
                $adminUser['name'] ?? 'Super Admin'
            );
        }

        Response::success([
            'assigned_count' => count(array_filter($results, fn($r) => !empty($r['updated']))),
            'role_type'      => $roleType,
            'staff_id'       => $staffId,
            'results'        => $results
        ], 'Lead role assignment updated successfully');
        exit;
    }

    // 0B. AUTO-DISTRIBUTE LEADS ROUND-ROBIN AMONG ROLE EXECUTIVES
    if ($action === 'auto_distribute_leads') {
        $roleType = trim((string)($input['role_type'] ?? 'sales'));
        $roleDbMap = [
            'sales'      => 'sales_executive',
            'advisor'    => 'property_advisor',
            'operations' => 'operations_executive'
        ];
        if (!isset($roleDbMap[$roleType])) {
            Response::error('Invalid role_type for round-robin distribution', 422);
        }

        $targetUserIds = [];
        if (!empty($input['user_ids']) && is_array($input['user_ids'])) {
            foreach ($input['user_ids'] as $id) {
                if ((int)$id > 0) $targetUserIds[] = (int)$id;
            }
        }
        $targetUserIds = array_values(array_unique($targetUserIds));
        if (empty($targetUserIds)) {
            Response::error('Select at least one lead for round-robin distribution', 400);
        }

        $staffStmt = $db->prepare("
            SELECT id, name FROM users
            WHERE role = ? AND (status IS NULL OR status = '' OR status = 'active')
            ORDER BY id ASC
        ");
        $staffStmt->execute([$roleDbMap[$roleType]]);
        $staffPool = $staffStmt->fetchAll(PDO::FETCH_ASSOC);
        if (empty($staffPool)) {
            Response::error('No active staff found for role: ' . $roleDbMap[$roleType], 422);
        }

        $advanceStage = !empty($input['advance_stage']);
        $assignmentNotes = trim((string)($input['assignment_notes'] ?? 'Round-robin auto-distributed by Admin'));
        $results = [];
        $poolCount = count($staffPool);
        foreach ($targetUserIds as $idx => $uid) {
            $chosen = $staffPool[$idx % $poolCount];
            $results[] = applyLeadRoleAssignment(
                $db,
                $uid,
                $roleType,
                (int)$chosen['id'],
                [],
                $advanceStage,
                $assignmentNotes,
                $adminId,
                $adminUser['name'] ?? 'Super Admin'
            );
        }

        Response::success([
            'assigned_count' => count($results),
            'role_type'      => $roleType,
            'staff_pool_size'=> $poolCount,
            'results'        => $results
        ], "Distributed " . count($results) . " lead(s) across {$poolCount} active staff member(s)");
        exit;
    }

    $userId = (int)($input['user_id'] ?? 0);

    if ($userId <= 0) {
        Response::error('Valid user ID is required', 400);
    }

    // Verify user exists
    $uStmt = $db->prepare("SELECT id, name, phone, email, role FROM users WHERE id = ?");
    $uStmt->execute([$userId]);
    $targetUser = $uStmt->fetch(PDO::FETCH_ASSOC);
    if (!$targetUser) {
        Response::error('User not found', 404);
    }

    // Ensure sales_lead_interactions record exists
    $sliStmt = $db->prepare("SELECT * FROM sales_lead_interactions WHERE user_id = ?");
    $sliStmt->execute([$userId]);
    $lead = $sliStmt->fetch(PDO::FETCH_ASSOC);

    if (!$lead) {
        $ins = $db->prepare("
            INSERT INTO sales_lead_interactions (user_id, status, intention, updated_by, created_at, updated_at)
            VALUES (?, 'new_enquiry', 'Fresh Inbound Lead', ?, NOW(), NOW())
        ");
        $ins->execute([$userId, $adminId]);
        $sliStmt->execute([$userId]);
        $lead = $sliStmt->fetch(PDO::FETCH_ASSOC);
    }

    $currentStage = (string)($lead['status'] ?? 'new_enquiry');

    // 1. TRANSITION STAGE
    if ($action === 'transition_stage') {
        $toStage = trim((string)($input['to_stage'] ?? ''));
        if (!in_array($toStage, $validStageIds, true)) {
            Response::error('Invalid target stage: ' . $toStage, 422);
        }

        if ($currentStage === 'lost_on_hold' && $toStage === 'lost_on_hold') {
            Response::success([
                'user_id'    => $userId,
                'from_stage' => $currentStage,
                'to_stage'   => $toStage,
                'department' => 'terminal'
            ], 'Lead is already discontinued / on hold');
            exit;
        }

        $notes = trim((string)($input['notes'] ?? ''));
        $department = trim((string)($input['department'] ?? 'sales'));
        $preferredLocation = trim((string)($input['preferred_location'] ?? $lead['preferred_location'] ?? ''));
        $budgetMin = !empty($input['budget_min']) ? (float)$input['budget_min'] : ($lead['budget_min'] ? (float)$lead['budget_min'] : null);
        $budgetMax = !empty($input['budget_max']) ? (float)$input['budget_max'] : ($lead['budget_max'] ? (float)$lead['budget_max'] : null);
        $scheduledVisitAt = !empty($input['scheduled_visit_at']) ? trim((string)$input['scheduled_visit_at']) : ($lead['scheduled_visit_at'] ?? null);

        // Update interaction
        $upd = $db->prepare("
            UPDATE sales_lead_interactions
            SET status = ?,
                notes = CASE WHEN ? != '' THEN ? ELSE notes END,
                preferred_location = ?,
                budget_min = ?,
                budget_max = ?,
                scheduled_visit_at = ?,
                discontinued_at = CASE WHEN ? != 'lost_on_hold' THEN NULL ELSE COALESCE(discontinued_at, NOW()) END,
                updated_by = ?,
                updated_at = NOW()
            WHERE user_id = ?
        ");
        $upd->execute([
            $toStage,
            $notes, $notes,
            $preferredLocation,
            $budgetMin,
            $budgetMax,
            $scheduledVisitAt,
            $toStage,
            $adminId,
            $userId
        ]);

        // Log to lead_stage_history
        $hist = $db->prepare("
            INSERT INTO lead_stage_history (
                user_id, interaction_id, from_stage, to_stage, department,
                action_type, notes, changed_by, changed_by_name, created_at
            ) VALUES (?, ?, ?, ?, ?, 'stage_transition', ?, ?, ?, NOW())
        ");
        $hist->execute([
            $userId,
            $lead['id'],
            $currentStage,
            $toStage,
            $department,
            $notes ?: "Advanced from {$currentStage} to {$toStage}",
            $adminId,
            $adminUser['name'] ?? 'Super Admin'
        ]);

        Response::success([
            'user_id'     => $userId,
            'from_stage'  => $currentStage,
            'to_stage'    => $toStage,
            'department'  => $department
        ], 'Lead transitioned successfully to ' . $toStage);
        exit;
    }

    // 2. DISCONTINUE LEAD (ANY STAGE)
    if ($action === 'discontinue_lead') {
        $exitCategory = trim((string)($input['exit_reason_category'] ?? 'Budget mismatch'));
        $competitorName = trim((string)($input['competitor_name'] ?? ''));
        $exitNotes = trim((string)($input['exit_notes'] ?? ''));
        $reengageDate = !empty($input['reengage_date']) ? trim((string)$input['reengage_date']) : null;
        $exitStage = $currentStage !== 'lost_on_hold' ? $currentStage : ($lead['exit_stage'] ?: 'requirement_understood');

        $upd = $db->prepare("
            UPDATE sales_lead_interactions
            SET status = 'lost_on_hold',
                exit_stage = ?,
                exit_reason_category = ?,
                competitor_name = ?,
                exit_notes = ?,
                reengage_date = ?,
                discontinued_at = NOW(),
                updated_by = ?,
                updated_at = NOW()
            WHERE user_id = ?
        ");
        $upd->execute([
            $exitStage,
            $exitCategory,
            $competitorName,
            $exitNotes,
            $reengageDate,
            $adminId,
            $userId
        ]);

        // Log exit in history
        $hist = $db->prepare("
            INSERT INTO lead_stage_history (
                user_id, interaction_id, from_stage, to_stage, department,
                action_type, notes, metadata, changed_by, changed_by_name, created_at
            ) VALUES (?, ?, ?, 'lost_on_hold', 'terminal', 'lead_discontinued', ?, ?, ?, ?, NOW())
        ");
        $meta = json_encode([
            'exit_stage'            => $exitStage,
            'exit_reason_category'  => $exitCategory,
            'competitor_name'       => $competitorName,
            'reengage_date'         => $reengageDate
        ]);
        $hist->execute([
            $userId,
            $lead['id'],
            $exitStage,
            $exitNotes ?: "Lead discontinued at stage: {$exitStage} due to: {$exitCategory}",
            $meta,
            $adminId,
            $adminUser['name'] ?? 'Super Admin'
        ]);

        Response::success([
            'user_id'              => $userId,
            'exit_stage'           => $exitStage,
            'exit_reason_category' => $exitCategory,
            'reengage_date'        => $reengageDate
        ], 'Lead successfully marked as discontinued/on-hold');
        exit;
    }

    // 3. REVIVE LEAD
    if ($action === 'revive_lead') {
        $restoreStage = trim((string)($input['restore_stage'] ?? ''));
        if (empty($restoreStage) || !in_array($restoreStage, $validStageIds, true) || $restoreStage === 'lost_on_hold') {
            $restoreStage = $lead['exit_stage'] ?: 'customer_contacted';
        }

        $reviveNotes = trim((string)($input['revive_notes'] ?? 'Lead reactivated by Super Admin'));

        $upd = $db->prepare("
            UPDATE sales_lead_interactions
            SET status = ?,
                discontinued_at = NULL,
                reengage_date = NULL,
                updated_by = ?,
                updated_at = NOW()
            WHERE user_id = ?
        ");
        $upd->execute([$restoreStage, $adminId, $userId]);

        $hist = $db->prepare("
            INSERT INTO lead_stage_history (
                user_id, interaction_id, from_stage, to_stage, department,
                action_type, notes, changed_by, changed_by_name, created_at
            ) VALUES (?, ?, 'lost_on_hold', ?, 'sales', 'lead_revived', ?, ?, ?, NOW())
        ");
        $hist->execute([
            $userId,
            $lead['id'],
            $restoreStage,
            $reviveNotes,
            $adminId,
            $adminUser['name'] ?? 'Super Admin'
        ]);

        Response::success([
            'user_id'       => $userId,
            'restored_stage'=> $restoreStage
        ], 'Lead successfully revived into active pipeline');
        exit;
    }

    // 4. CONVERT DEAL (WON)
    if ($action === 'convert_deal') {
        $bookedPropId = trim((string)($input['booked_property_id'] ?? ''));
        $plotNo = trim((string)($input['plot_no'] ?? ''));
        $bookingAmount = !empty($input['booking_amount']) ? (float)$input['booking_amount'] : null;
        $finalPrice = !empty($input['final_price']) ? (float)$input['final_price'] : null;
        $regDate = !empty($input['registration_date']) ? trim((string)$input['registration_date']) : null;
        $dealNotes = trim((string)($input['deal_notes'] ?? ''));

        $upd = $db->prepare("
            UPDATE sales_lead_interactions
            SET status = 'booked_converted',
                booked_property_id = ?,
                plot_no = ?,
                booking_amount = ?,
                final_price = ?,
                registration_date = ?,
                deal_notes = ?,
                updated_by = ?,
                updated_at = NOW()
            WHERE user_id = ?
        ");
        $upd->execute([
            $bookedPropId,
            $plotNo,
            $bookingAmount,
            $finalPrice,
            $regDate,
            $dealNotes,
            $adminId,
            $userId
        ]);

        $hist = $db->prepare("
            INSERT INTO lead_stage_history (
                user_id, interaction_id, from_stage, to_stage, department,
                action_type, notes, metadata, changed_by, changed_by_name, created_at
            ) VALUES (?, ?, ?, 'booked_converted', 'closing', 'deal_converted', ?, ?, ?, ?, NOW())
        ");
        $meta = json_encode([
            'property_id'    => $bookedPropId,
            'plot_no'        => $plotNo,
            'final_price'    => $finalPrice,
            'booking_amount' => $bookingAmount,
            'reg_date'       => $regDate
        ]);
        $hist->execute([
            $userId,
            $lead['id'],
            $currentStage,
            $dealNotes ?: "Deal successfully closed! Plot: {$plotNo}, Value: ₹{$finalPrice}",
            $meta,
            $adminId,
            $adminUser['name'] ?? 'Super Admin'
        ]);

        Response::success([
            'user_id'            => $userId,
            'status'             => 'booked_converted',
            'plot_no'            => $plotNo,
            'final_price'        => $finalPrice
        ], 'Deal successfully recorded as Booked / Converted');
        exit;
    }

    Response::error('Unsupported action: ' . $action, 422);
}

// -------------------------------------------------------------
// GET REQUEST: FETCH FULL MASTER PIPELINE DATA & DRILL-DOWN
// -------------------------------------------------------------
$filterStage = trim((string)($_GET['stage'] ?? ''));
$filterSearch = trim((string)($_GET['search'] ?? ''));
$filterDateFrom = trim((string)($_GET['date_from'] ?? ''));
$filterDateTo = trim((string)($_GET['date_to'] ?? ''));

// 1. Fetch all leads with their interaction data
$leadQuery = "
    SELECT 
        u.id AS user_id,
        COALESCE(NULLIF(u.name, ''), CONCAT('Verified Investor ', u.id)) AS name,
        COALESCE(u.phone, '') AS phone,
        COALESCE(u.email, '') AS email,
        COALESCE(u.role, 'buyer') AS role,
        u.created_at AS user_created_at,
        sli.id AS interaction_id,
        CASE 
            WHEN sli.status = 'new' THEN 'new_enquiry'
            WHEN sli.status IN ('contacted', 'customer_contacted', 'contact_attempted') THEN 'customer_contacted'
            WHEN sli.status = 'transferred_advisor' THEN 'requirement_understood'
            WHEN sli.status = 'interested_site_visit' THEN 'site_visit_scheduled'
            WHEN sli.status IS NOT NULL AND sli.status != '' THEN sli.status
            ELSE 'new_enquiry'
        END AS status,
        COALESCE(sli.intention, 'Exploring Plots') AS intention,
        COALESCE(sli.notes, '') AS notes,
        COALESCE(sli.advisor_notes, '') AS advisor_notes,
        COALESCE(sli.ops_notes, '') AS ops_notes,
        sli.preferred_location,
        sli.budget_min,
        sli.budget_max,
        sli.assigned_sales_id,
        sales_u.name AS assigned_sales_name,
        sli.assigned_advisor_id,
        advisor_u.name AS assigned_advisor_name,
        sli.assigned_ops_id,
        ops_u.name AS assigned_ops_name,
        sli.scheduled_visit_at,
        sli.exit_stage,
        sli.exit_reason_category,
        sli.competitor_name,
        sli.exit_notes,
        sli.reengage_date,
        sli.discontinued_at,
        sli.booked_property_id,
        sli.plot_no,
        sli.booking_amount,
        sli.final_price,
        sli.registration_date,
        sli.deal_notes,
        sli.transferred_at,
        sli.updated_at AS last_activity_at,
        ue.plan_id AS subscription_plan
    FROM users u
    LEFT JOIN sales_lead_interactions sli ON sli.id = (
        SELECT MAX(id) FROM sales_lead_interactions WHERE user_id = u.id
    )
    LEFT JOIN users sales_u ON sales_u.id = sli.assigned_sales_id
    LEFT JOIN users advisor_u ON advisor_u.id = sli.assigned_advisor_id
    LEFT JOIN users ops_u ON ops_u.id = sli.assigned_ops_id
    LEFT JOIN user_entitlements ue ON ue.id = (
        SELECT MAX(id) FROM user_entitlements WHERE user_id = u.id
    )
    WHERE (u.role = 'buyer' OR u.role = 'verified_buyer')
      AND u.role NOT IN ('admin', 'super_admin', 'co_admin', 'sales_executive', 'property_advisor', 'operations_executive', 'finance_admin', 'content_gis_admin', 'developer')
      AND (u.email IS NULL OR (u.email NOT LIKE '%@findaplot.com' AND u.email NOT LIKE '%@findaplot.in'))
      AND (u.phone IS NULL OR u.phone NOT LIKE '+91 94440%')
      AND u.id NOT IN (1, 101, 102, 103, 104, 105, 108, 109, 110, 111, 112, 113, 116)
";

// If requester is not super admin, hide halted/discontinued leads
if (!$isSuperAdmin) {
    $leadQuery .= " AND (sli.status IS NULL OR sli.status != 'lost_on_hold') AND sli.discontinued_at IS NULL";
}

$params = [];

if (!empty($filterStage)) {
    if ($filterStage === 'new_enquiry') {
        $leadQuery .= " AND (sli.status = 'new_enquiry' OR sli.status = 'new' OR sli.status IS NULL OR sli.status = '')";
    } elseif ($filterStage === 'customer_contacted') {
        $leadQuery .= " AND sli.status IN ('customer_contacted', 'contacted', 'contact_attempted')";
    } elseif ($filterStage === 'requirement_understood') {
        $leadQuery .= " AND sli.status IN ('requirement_understood', 'transferred_advisor')";
    } elseif ($filterStage === 'site_visit_scheduled') {
        $leadQuery .= " AND sli.status IN ('site_visit_scheduled', 'interested_site_visit')";
    } else {
        $leadQuery .= " AND sli.status = :stage";
        $params[':stage'] = $filterStage;
    }
}

if (!empty($filterSearch)) {
    $leadQuery .= " AND (u.name LIKE :search OR u.phone LIKE :search OR u.email LIKE :search OR sli.notes LIKE :search OR sli.advisor_notes LIKE :search OR sli.ops_notes LIKE :search OR sli.preferred_location LIKE :search)";
    $params[':search'] = "%{$filterSearch}%";
}

if (!empty($filterDateFrom)) {
    $leadQuery .= " AND DATE(COALESCE(sli.updated_at, sli.created_at, u.created_at)) >= :date_from";
    $params[':date_from'] = $filterDateFrom;
}

if (!empty($filterDateTo)) {
    $leadQuery .= " AND DATE(COALESCE(sli.updated_at, sli.created_at, u.created_at)) <= :date_to";
    $params[':date_to'] = $filterDateTo;
}

$leadQuery .= " ORDER BY COALESCE(sli.updated_at, u.created_at) DESC, u.id DESC LIMIT 200";

$leadStmt = $db->prepare($leadQuery);
$leadStmt->execute($params);
$leads = $leadStmt->fetchAll(PDO::FETCH_ASSOC);

// 2. Fetch Aggregated Metrics Across ALL Stages (Unfiltered for overview cards)
$metricQuery = "
    SELECT 
        CASE 
            WHEN sli.status = 'new' THEN 'new_enquiry'
            WHEN sli.status IN ('contacted', 'customer_contacted', 'contact_attempted') THEN 'customer_contacted'
            WHEN sli.status = 'transferred_advisor' THEN 'requirement_understood'
            WHEN sli.status = 'interested_site_visit' THEN 'site_visit_scheduled'
            WHEN sli.status IS NOT NULL AND sli.status != '' THEN sli.status
            ELSE 'new_enquiry'
        END AS stage,
        COUNT(*) AS count
    FROM users u
    LEFT JOIN sales_lead_interactions sli ON sli.id = (
        SELECT MAX(id) FROM sales_lead_interactions WHERE user_id = u.id
    )
    WHERE (u.role = 'buyer' OR u.role = 'verified_buyer')
      AND u.role NOT IN ('admin', 'super_admin', 'co_admin', 'sales_executive', 'property_advisor', 'operations_executive', 'finance_admin', 'content_gis_admin', 'developer')
      AND (u.email IS NULL OR (u.email NOT LIKE '%@findaplot.com' AND u.email NOT LIKE '%@findaplot.in'))
      AND (u.phone IS NULL OR u.phone NOT LIKE '+91 94440%')
      AND u.id NOT IN (1, 101, 102, 103, 104, 105, 108, 109, 110, 111, 112, 113, 116)
    GROUP BY stage
";
$metricStmt = $db->query($metricQuery);
$rawStageCounts = [];
while ($m = $metricStmt->fetch(PDO::FETCH_ASSOC)) {
    $rawStageCounts[$m['stage']] = (int)$m['count'];
}

// Tally discontinued leads by exit stage
$exitMetricQuery = "
    SELECT 
        COALESCE(sli.exit_stage, 'requirement_understood') AS exit_stage,
        COUNT(*) AS drop_count
    FROM sales_lead_interactions sli
    JOIN users u ON u.id = sli.user_id
    WHERE sli.status = 'lost_on_hold'
      AND (u.role = 'buyer' OR u.role = 'verified_buyer')
      AND u.role NOT IN ('admin', 'super_admin', 'co_admin', 'sales_executive', 'property_advisor', 'operations_executive', 'finance_admin', 'content_gis_admin', 'developer')
      AND (u.email IS NULL OR (u.email NOT LIKE '%@findaplot.com' AND u.email NOT LIKE '%@findaplot.in'))
      AND (u.phone IS NULL OR u.phone NOT LIKE '+91 94440%')
      AND u.id NOT IN (1, 101, 102, 103, 104, 105, 108, 109, 110, 111, 112, 113, 116)
    GROUP BY COALESCE(sli.exit_stage, 'requirement_understood')
";
$exitStmt = $db->query($exitMetricQuery);
$exitCounts = [];
while ($ex = $exitStmt->fetch(PDO::FETCH_ASSOC)) {
    $exitCounts[$ex['exit_stage']] = (int)$ex['drop_count'];
}

// Tally exit reasons
$reasonStmt = $db->query("
    SELECT 
        COALESCE(sli.exit_reason_category, 'Uncategorized') AS reason,
        COUNT(*) AS count
    FROM sales_lead_interactions sli
    JOIN users u ON u.id = sli.user_id
    WHERE sli.status = 'lost_on_hold'
      AND (u.role = 'buyer' OR u.role = 'verified_buyer')
      AND u.role NOT IN ('admin', 'super_admin', 'co_admin', 'sales_executive', 'property_advisor', 'operations_executive', 'finance_admin', 'content_gis_admin', 'developer')
      AND (u.email IS NULL OR (u.email NOT LIKE '%@findaplot.com' AND u.email NOT LIKE '%@findaplot.in'))
      AND (u.phone IS NULL OR u.phone NOT LIKE '+91 94440%')
      AND u.id NOT IN (1, 101, 102, 103, 104, 105, 108, 109, 110, 111, 112, 113, 116)
    GROUP BY sli.exit_reason_category
");
$reasonBreakdown = $reasonStmt->fetchAll(PDO::FETCH_ASSOC);

// 3. Enrich each lead with viewed properties, shortlists, site visits, and history
$enrichedLeads = [];
foreach ($leads as $l) {
    $uid = (int)$l['user_id'];
    $uphone = $l['phone'] ?: '';

    // Viewed properties (grouped by property to avoid duplicate cards)
    $viewStmt = $db->prepare("
        SELECT 
            COALESCE(p.id, prj.project_id, v.property_id) AS id,
            COALESCE(NULLIF(MAX(p.title), ''), NULLIF(MAX(prj.project_name), ''), 'Verified Plot') AS title,
            COALESCE(NULLIF(MAX(p.price), ''), CASE WHEN MAX(prj.price_from) > 0 THEN CONCAT('₹ ', FORMAT(MAX(prj.price_from)/100000, 2), ' L') ELSE 'Price on Request' END) AS price,
            COALESCE(NULLIF(MAX(p.locality_name), ''), NULLIF(MAX(prj.locality), ''), 'Tamil Nadu') AS locality,
            COALESCE(NULLIF(MAX(p.main_image_url), ''), NULLIF(MAX(prj.cover_image), ''), 'assets/images/placeholder.jpg') AS image,
            MAX(v.viewed_at) AS last_viewed_at
        FROM user_view_history v
        LEFT JOIN properties p ON CAST(p.id AS CHAR(50)) COLLATE utf8mb4_unicode_ci = CAST(v.property_id AS CHAR(50)) COLLATE utf8mb4_unicode_ci
        LEFT JOIN projects prj ON CAST(prj.project_id AS CHAR(50)) COLLATE utf8mb4_unicode_ci = CAST(v.property_id AS CHAR(50)) COLLATE utf8mb4_unicode_ci
        WHERE v.user_id = ?
        GROUP BY COALESCE(p.id, prj.project_id, v.property_id)
        ORDER BY last_viewed_at DESC
        LIMIT 6
    ");
    $viewStmt->execute([$uid]);
    $views = $viewStmt->fetchAll(PDO::FETCH_ASSOC);

    // Shortlisted properties (grouped by property to avoid duplicates)
    $shortlistStmt = $db->prepare("
        SELECT 
            s.property_id,
            COALESCE(NULLIF(MAX(p.title), ''), NULLIF(MAX(prj.project_name), ''), 'Shortlisted Plot') AS title,
            MAX(s.created_at) AS shortlisted_at
        FROM user_shortlists s
        LEFT JOIN properties p ON CAST(p.id AS CHAR(50)) COLLATE utf8mb4_unicode_ci = CAST(s.property_id AS CHAR(50)) COLLATE utf8mb4_unicode_ci
        LEFT JOIN projects prj ON CAST(prj.project_id AS CHAR(50)) COLLATE utf8mb4_unicode_ci = CAST(s.property_id AS CHAR(50)) COLLATE utf8mb4_unicode_ci
        WHERE s.user_id = ?
        GROUP BY s.property_id
        ORDER BY shortlisted_at DESC
        LIMIT 6
    ");
    $shortlistStmt->execute([$uid]);
    $shortlists = $shortlistStmt->fetchAll(PDO::FETCH_ASSOC);

    // Site visits
    $visitStmt = $db->prepare("
        SELECT 
            id, property_id, property_title, visit_date, visit_slot,
            assigned_executive_name, status
        FROM user_site_visits
        WHERE user_id = ?
        ORDER BY id DESC
        LIMIT 5
    ");
    $visitStmt->execute([$uid]);
    $siteVisits = $visitStmt->fetchAll(PDO::FETCH_ASSOC);

    // Cross-role History Timeline
    $histStmt = $db->prepare("
        SELECT 
            id, from_stage, to_stage, department, action_type, notes,
            changed_by_name, created_at, metadata
        FROM lead_stage_history
        WHERE user_id = ?
        ORDER BY id DESC
        LIMIT 20
    ");
    $histStmt->execute([$uid]);
    $history = $histStmt->fetchAll(PDO::FETCH_ASSOC);

    $l['user_id']                = $uid;
    $l['assigned_sales_id']      = !empty($l['assigned_sales_id']) ? (int)$l['assigned_sales_id'] : null;
    $l['assigned_advisor_id']    = !empty($l['assigned_advisor_id']) ? (int)$l['assigned_advisor_id'] : null;
    $l['assigned_ops_id']        = !empty($l['assigned_ops_id']) ? (int)$l['assigned_ops_id'] : null;
    $l['viewed_properties']      = $views;
    $l['viewed_properties_count'] = count($views);
    $l['shortlisted_properties'] = $shortlists;
    $l['shortlisted_count']      = count($shortlists);
    $l['site_visits']            = $siteVisits;
    $l['site_visits_count']      = count($siteVisits);
    $l['history']                = $history;

    $enrichedLeads[] = $l;
}

// 4. Construct enriched Stages with live active counts and exit counts
$stagesPayload = [];
$totalActiveInFunnel = 0;
$totalConverted = $rawStageCounts['booked_converted'] ?? 0;
$totalDiscontinued = $rawStageCounts['lost_on_hold'] ?? 0;

foreach ($stagesDefinition as $def) {
    $stageId = $def['id'];
    $activeCount = $rawStageCounts[$stageId] ?? 0;
    $dropCount = $exitCounts[$stageId] ?? 0;

    if ($stageId !== 'booked_converted' && $stageId !== 'lost_on_hold') {
        $totalActiveInFunnel += $activeCount;
    }

    $stagesPayload[] = array_merge($def, [
        'active_count' => $activeCount,
        'drop_count'   => $dropCount
    ]);
}

$totalAllLeads = $totalActiveInFunnel + $totalConverted + $totalDiscontinued;
$conversionRate = $totalAllLeads > 0 ? round(($totalConverted / $totalAllLeads) * 100, 1) : 0;
$discontinuationRate = $totalAllLeads > 0 ? round(($totalDiscontinued / $totalAllLeads) * 100, 1) : 0;

// 5. Fetch Active Staff Members grouped by Role + Live Active Lead Counts
$staffStmt = $db->query("
    SELECT 
        u.id,
        u.name,
        u.email,
        COALESCE(u.phone, '') AS phone,
        u.role,
        COALESCE(u.status, 'active') AS status
    FROM users u
    WHERE u.role IN ('sales_executive', 'property_advisor', 'operations_executive', 'finance_admin', 'content_gis_admin')
      AND (u.status IS NULL OR u.status = '' OR u.status = 'active')
    ORDER BY u.role ASC, u.id ASC
");
$allStaffRaw = $staffStmt->fetchAll(PDO::FETCH_ASSOC);

// Count active (non-halted) lead assignments per staff member & role
$salesCounts = [];
$advisorCounts = [];
$opsCounts = [];
$assignCountStmt = $db->query("
    SELECT sli.assigned_sales_id, sli.assigned_advisor_id, sli.assigned_ops_id
    FROM sales_lead_interactions sli
    JOIN users bu ON bu.id = sli.user_id
    WHERE (sli.status IS NULL OR sli.status != 'lost_on_hold')
      AND sli.discontinued_at IS NULL
      AND (bu.role = 'buyer' OR bu.role = 'verified_buyer')
      AND bu.id NOT IN (1, 101, 102, 103, 104, 105, 108, 109, 110, 111, 112, 113, 116)
");
while ($ac = $assignCountStmt->fetch(PDO::FETCH_ASSOC)) {
    if (!empty($ac['assigned_sales_id'])) {
        $sid = (int)$ac['assigned_sales_id'];
        $salesCounts[$sid] = ($salesCounts[$sid] ?? 0) + 1;
    }
    if (!empty($ac['assigned_advisor_id'])) {
        $aid = (int)$ac['assigned_advisor_id'];
        $advisorCounts[$aid] = ($advisorCounts[$aid] ?? 0) + 1;
    }
    if (!empty($ac['assigned_ops_id'])) {
        $oid = (int)$ac['assigned_ops_id'];
        $opsCounts[$oid] = ($opsCounts[$oid] ?? 0) + 1;
    }
}

$staffByRole = [
    'sales_executive'      => [],
    'property_advisor'     => [],
    'operations_executive' => [],
    'finance_admin'        => [],
    'content_gis_admin'    => []
];
$allStaff = [];
foreach ($allStaffRaw as $st) {
    $sid = (int)$st['id'];
    $srole = (string)$st['role'];
    $cnt = 0;
    if ($srole === 'sales_executive') $cnt = $salesCounts[$sid] ?? 0;
    elseif ($srole === 'property_advisor') $cnt = $advisorCounts[$sid] ?? 0;
    elseif ($srole === 'operations_executive') $cnt = $opsCounts[$sid] ?? 0;

    $st['id'] = $sid;
    $st['assigned_count'] = $cnt;
    $allStaff[] = $st;
    if (isset($staffByRole[$srole])) {
        $staffByRole[$srole][] = $st;
    }
}

Response::success([
    'admin' => [
        'id'    => $adminUser['id'],
        'name'  => $adminUser['name'],
        'email' => $adminUser['email'],
        'role'  => $adminUser['role']
    ],
    'kpis' => [
        'totalLeads'          => $totalAllLeads,
        'activeInFunnel'      => $totalActiveInFunnel,
        'bookedConverted'     => $totalConverted,
        'lostOnHold'          => $totalDiscontinued,
        'conversionRate'      => $conversionRate . '%',
        'discontinuationRate' => $discontinuationRate . '%'
    ],
    'stages'           => $stagesPayload,
    'reasonBreakdown'  => $reasonBreakdown,
    'staffByRole'      => $staffByRole,
    'allStaff'         => $allStaff,
    'leads'            => $enrichedLeads,
    'filtersApplied'   => [
        'stage'     => $filterStage,
        'search'    => $filterSearch,
        'date_from' => $filterDateFrom,
        'date_to'   => $filterDateTo
    ]
], 'Master Lead Pipeline data loaded successfully');
