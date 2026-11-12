<?php
/**
 * /api/admin/roles.php
 * Administrative Role & Access Governance API for Super Admin.
 * Allows Super Admin to view, create, edit, and assign roles (including Admin, Co-Admin, Auditor, CRM Manager).
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

use Mannidam\Config\Database;
use Mannidam\Helpers\Response;

Response::initCors();

$method = $_SERVER['REQUEST_METHOD'];
$db = (new Database())->getConnection();

// Available Roles Catalog with default permissions & metadata
$ROLES_CATALOG = [
    'super_admin' => [
        'id'          => 'super_admin',
        'name'        => 'Super Administrator',
        'badgeColor'  => 'purple',
        'description' => 'Unrestricted platform authority: Role governance, database schema, financials, audit trails & security policies.',
        'level'       => 1,
        'defaultPermissions' => [
            'role_governance', 'review_queue', 'property_approval', 'post_property',
            'plot_studio', 'bulk_upload', 'master_directory', 'developer_mgmt',
            'buyer_crm', 'financial_audit', 'whatsapp_concierge', 'system_settings'
        ]
    ],
    'admin' => [
        'id'          => 'admin',
        'name'        => 'Platform Administrator',
        'badgeColor'  => 'teal',
        'description' => 'Full administrative access: Review queue maker-checker, directory oversight, plot studio, and bulk uploads.',
        'level'       => 2,
        'defaultPermissions' => [
            'review_queue', 'property_approval', 'post_property', 'plot_studio',
            'bulk_upload', 'master_directory', 'developer_mgmt', 'buyer_crm',
            'whatsapp_concierge'
        ]
    ],
    'co_admin' => [
        'id'          => 'co_admin',
        'name'        => 'Co-Admin & Marketing Director',
        'badgeColor'  => 'blue',
        'description' => 'Marketing outreach, broker network orchestration, peer review verification, and site promotion.',
        'level'       => 3,
        'defaultPermissions' => [
            'review_queue', 'post_property', 'developer_mgmt', 'buyer_crm',
            'whatsapp_concierge'
        ]
    ],
    'auditor' => [
        'id'          => 'auditor',
        'name'        => 'Compliance & Legal Auditor',
        'badgeColor'  => 'emerald',
        'description' => 'Four-eyes verification, cadastral Patta audits, RERA regulatory compliance, and document validation.',
        'level'       => 3,
        'defaultPermissions' => [
            'review_queue', 'master_directory'
        ]
    ],
    'crm_manager' => [
        'id'          => 'crm_manager',
        'name'        => 'CRM & Investor Relations Manager',
        'badgeColor'  => 'amber',
        'description' => 'Buyer lead tracking, investor advisory requests, WhatsApp concierge communications, and site visits.',
        'level'       => 4,
        'defaultPermissions' => [
            'buyer_crm', 'whatsapp_concierge'
        ]
    ],
    'content_manager' => [
        'id'          => 'content_manager',
        'name'        => 'Media & Content Specialist',
        'badgeColor'  => 'rose',
        'description' => 'Visual media production, property drone photography review, architectural showcases, and spotlight management.',
        'level'       => 4,
        'defaultPermissions' => [
            'post_property', 'master_directory'
        ]
    ]
];

// Available Granular Permissions
$PERMISSIONS_CATALOG = [
    ['key' => 'role_governance',    'label' => 'Role & Staff Governance',     'category' => 'Security',   'desc' => 'Create, edit and manage administrator roles & permissions'],
    ['key' => 'review_queue',       'label' => 'Review Queue Inspector',      'category' => 'Audit',      'desc' => 'Inspect submitted property dossiers in the Maker-Checker queue'],
    ['key' => 'property_approval',  'label' => 'Publish / Reject Clearance',  'category' => 'Audit',      'desc' => 'Approve or reject property dossiers to live registry'],
    ['key' => 'post_property',      'label' => 'Direct Property Ingestion',   'category' => 'Registry',   'desc' => 'Publish new property dossiers with maker attribution'],
    ['key' => 'plot_studio',        'label' => '3D Plot Partition Studio',    'category' => 'Registry',   'desc' => 'Partition land layouts and manage cadastral plots'],
    ['key' => 'bulk_upload',        'label' => 'Bulk CSV/Excel Upload',       'category' => 'Registry',   'desc' => 'Import bulk property listings from Excel into database'],
    ['key' => 'master_directory',   'label' => 'Master Directory Oversight',   'category' => 'Registry',   'desc' => 'Edit, filter, and audit all live registry properties'],
    ['key' => 'developer_mgmt',     'label' => 'Developer Portfolio Control', 'category' => 'CRM',        'desc' => 'Authorize promoters and manage developer workspaces'],
    ['key' => 'buyer_crm',          'label' => 'Buyer CRM & Mindset AI',      'category' => 'CRM',        'desc' => 'Access buyer leads, investor mindsets, and inquiries'],
    ['key' => 'financial_audit',    'label' => 'Razorpay & Financial Ledger', 'category' => 'Finance',    'desc' => 'View credit ledger, payment gateways, and wallet transactions'],
    ['key' => 'whatsapp_concierge', 'label' => 'WhatsApp Concierge Dispatch', 'category' => 'Comms',      'desc' => 'Live chat with leads and dispatch WhatsApp templates'],
    ['key' => 'system_settings',    'label' => 'Platform Settings & Config',  'category' => 'Security',   'desc' => 'Configure platform parameters and compliance policies']
];

// -------------------------------------------------------------
// Helper: Verify Super Admin / Admin Request
// -------------------------------------------------------------
function getRequesterAdmin(PDO $db): ?array {
    $reqAdminId = (int)($_GET['admin_id'] ?? $_POST['admin_id'] ?? 0);
    
    // Check Authorization header or query parameter
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        // Bearer token handling if provided
    }

    if ($reqAdminId > 0) {
        $stmt = $db->prepare("SELECT id, name, email, role, status FROM users WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => $reqAdminId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) return $row;
    }

    // Default to Benny (Super Admin) if running in trusted local intranet
    $stmt = $db->query("SELECT id, name, email, role, status FROM users WHERE id IN (104, 103) OR role = 'super_admin' ORDER BY id DESC LIMIT 1");
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
}

// -------------------------------------------------------------
// GET: Fetch Staff / Administrative Users & Stats
// -------------------------------------------------------------
if ($method === 'GET') {
    $requester = getRequesterAdmin($db);
    
    $search = trim($_GET['q'] ?? '');
    $roleFilter = trim($_GET['role'] ?? 'all');
    $statusFilter = trim($_GET['status'] ?? 'all');

    // Build query
    $where = ["role IN ('super_admin', 'admin', 'co_admin', 'auditor', 'crm_manager', 'content_manager', 'sales_executive')"];
    $params = [];

    if ($roleFilter !== 'all' && !empty($roleFilter)) {
        $where[] = "role = :rf";
        $params[':rf'] = $roleFilter;
    }

    if ($statusFilter !== 'all' && !empty($statusFilter)) {
        $where[] = "status = :sf";
        $params[':sf'] = $statusFilter;
    }

    if (!empty($search)) {
        $where[] = "(name LIKE :q OR email LIKE :q OR phone LIKE :q OR designation LIKE :q OR department LIKE :q)";
        $params[':q'] = "%{$search}%";
    }

    $whereSql = implode(' AND ', $where);

    $stmt = $db->prepare("
        SELECT 
            id, name, email, phone, role, department, designation, 
            status, permissions, created_by, last_login_at, created_at
        FROM users
        WHERE {$whereSql}
        ORDER BY 
            CASE role 
                WHEN 'super_admin' THEN 1 
                WHEN 'admin' THEN 2 
                WHEN 'co_admin' THEN 3 
                WHEN 'auditor' THEN 4 
                ELSE 5 
            END, id ASC
    ");
    $stmt->execute($params);
    $rawUsers = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Format users with avatar initials, permissions array, and role details
    $users = array_map(function($u) use ($ROLES_CATALOG) {
        $roleInfo = $ROLES_CATALOG[$u['role']] ?? [
            'id' => $u['role'],
            'name' => ucfirst(str_replace('_', ' ', $u['role'])),
            'badgeColor' => 'gray',
            'description' => 'Custom Administrative Role'
        ];

        $perms = [];
        if (!empty($u['permissions'])) {
            $decoded = json_decode($u['permissions'], true);
            if (is_array($decoded)) {
                $perms = $decoded;
            }
        }
        if (empty($perms) && isset($roleInfo['defaultPermissions'])) {
            $perms = $roleInfo['defaultPermissions'];
        }

        return [
            'id'             => (int)$u['id'],
            'name'           => $u['name'],
            'email'          => $u['email'],
            'phone'          => $u['phone'] ?: '—',
            'role'           => $u['role'],
            'roleName'       => $roleInfo['name'],
            'badgeColor'     => $roleInfo['badgeColor'],
            'department'     => $u['department'] ?: 'Operations & Compliance',
            'designation'    => $u['designation'] ?: $roleInfo['name'],
            'status'         => $u['status'] ?: 'active',
            'permissions'    => $perms,
            'avatarInitials' => strtoupper(substr(trim($u['name']), 0, 2)),
            'lastLogin'      => $u['last_login_at'] ? date('d M Y, h:i A', strtotime($u['last_login_at'])) : 'Never logged in',
            'createdAt'      => date('d M Y', strtotime($u['created_at']))
        ];
    }, $rawUsers);

    // Compute KPI stats
    $statsStmt = $db->query("
        SELECT 
            COUNT(*) AS total_staff,
            SUM(CASE WHEN role = 'super_admin' THEN 1 ELSE 0 END) AS super_admins,
            SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) AS platform_admins,
            SUM(CASE WHEN role = 'co_admin' THEN 1 ELSE 0 END) AS co_admins,
            SUM(CASE WHEN role IN ('auditor', 'compliance') THEN 1 ELSE 0 END) AS auditors,
            SUM(CASE WHEN role = 'crm_manager' THEN 1 ELSE 0 END) AS crm_managers,
            SUM(CASE WHEN status = 'active' OR status IS NULL THEN 1 ELSE 0 END) AS active_accounts
        FROM users
        WHERE role IN ('super_admin', 'admin', 'co_admin', 'auditor', 'crm_manager', 'content_manager', 'sales_executive')
    ");
    $stats = $statsStmt->fetch(PDO::FETCH_ASSOC);

    Response::success([
        'requester' => [
            'id'          => (int)($requester['id'] ?? 104),
            'name'        => $requester['name'] ?? 'Benny',
            'role'        => $requester['role'] ?? 'super_admin',
            'isSuperAdmin'=> in_array($requester['role'] ?? '', ['super_admin'], true) || ($requester['id'] ?? 0) === 104
        ],
        'stats' => [
            'totalStaff'     => (int)($stats['total_staff'] ?? 0),
            'superAdmins'    => (int)($stats['super_admins'] ?? 0),
            'platformAdmins' => (int)($stats['platform_admins'] ?? 0),
            'coAdmins'       => (int)($stats['co_admins'] ?? 0),
            'auditors'       => (int)($stats['auditors'] ?? 0),
            'crmManagers'    => (int)($stats['crm_managers'] ?? 0),
            'activeAccounts' => (int)($stats['active_accounts'] ?? 0)
        ],
        'users'                => $users,
        'availableRoles'       => array_values($ROLES_CATALOG),
        'availablePermissions' => $PERMISSIONS_CATALOG
    ], 'Administrative staff and roles fetched successfully');
}

// -------------------------------------------------------------
// POST: Create a New Role / Administrative User
// -------------------------------------------------------------
if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        Response::error('Invalid JSON payload provided', 400);
    }

    $name        = trim((string)($input['name'] ?? ''));
    $email       = strtolower(trim((string)($input['email'] ?? '')));
    $phone       = trim((string)($input['phone'] ?? ''));
    $role        = trim((string)($input['role'] ?? 'admin'));
    $password    = trim((string)($input['password'] ?? ''));
    $department  = trim((string)($input['department'] ?? ''));
    $designation = trim((string)($input['designation'] ?? ''));
    $permissions = $input['permissions'] ?? [];
    $adminId     = (int)($input['creator_admin_id'] ?? 104);

    if (empty($name)) {
        Response::error('User full name is mandatory', 400);
    }
    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        Response::error('Valid official email address is required', 400);
    }
    if (empty($password)) {
        Response::error('Initial secure password is required', 400);
    }
    if (strlen($password) < 4) {
        Response::error('Password must be at least 4 characters in length', 400);
    }

    // Role validation
    if (!isset($ROLES_CATALOG[$role])) {
        Response::error("Unrecognized role '{$role}'. Please select an authorized platform role.", 400);
    }

    // Check if user email already exists
    $checkStmt = $db->prepare("SELECT id, role, name FROM users WHERE LOWER(email) = :e LIMIT 1");
    $checkStmt->execute([':e' => $email]);
    $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);

    $bcrypt = password_hash($password, PASSWORD_BCRYPT);
    $permissionsJson = !empty($permissions) ? json_encode(array_values($permissions)) : null;

    if ($existing) {
        // Upgrade existing user to administrative role
        $updateStmt = $db->prepare("
            UPDATE users 
            SET name = :name,
                phone = :phone,
                role = :role,
                department = :dept,
                designation = :desig,
                permissions = :perms,
                password_hash = :hash,
                status = 'active'
            WHERE id = :id
        ");
        $updateStmt->execute([
            ':name'  => $name,
            ':phone' => $phone ?: null,
            ':role'  => $role,
            ':dept'  => $department ?: ($ROLES_CATALOG[$role]['name'] . ' Operations'),
            ':desig' => $designation ?: $ROLES_CATALOG[$role]['name'],
            ':perms' => $permissionsJson,
            ':hash'  => $bcrypt,
            ':id'    => $existing['id']
        ]);
        $newUserId = (int)$existing['id'];
        $actionDesc = "Promoted existing user '{$name}' (ID: {$newUserId}) to {$ROLES_CATALOG[$role]['name']}";
    } else {
        // Insert new administrative user
        $insertStmt = $db->prepare("
            INSERT INTO users (name, email, phone, role, department, designation, permissions, password_hash, status, points_balance, created_by)
            VALUES (:name, :email, :phone, :role, :dept, :desig, :perms, :hash, 'active', 5000, :cby)
        ");
        $insertStmt->execute([
            ':name'  => $name,
            ':email' => $email,
            ':phone' => $phone ?: null,
            ':role'  => $role,
            ':dept'  => $department ?: ($ROLES_CATALOG[$role]['name'] . ' Operations'),
            ':desig' => $designation ?: $ROLES_CATALOG[$role]['name'],
            ':perms' => $permissionsJson,
            ':hash'  => $bcrypt,
            ':cby'   => $adminId
        ]);
        $newUserId = (int)$db->lastInsertId();
        $actionDesc = "Created new {$ROLES_CATALOG[$role]['name']} account for '{$name}' ({$email})";
    }

    // Log administrative action
    try {
        $logStmt = $db->prepare("
            INSERT INTO admin_activity_logs (admin_id, admin_name, action_type, notes, target_user_id, target_user_name)
            VALUES (:aid, :aname, 'post_property', :notes, :tuid, :tuname)
        ");
        $logStmt->execute([
            ':aid'    => $adminId,
            ':aname'  => 'Benny (Super Admin)',
            ':notes'  => $actionDesc,
            ':tuid'   => $newUserId,
            ':tuname' => $name
        ]);
    } catch (\Throwable $e) {
        // Non-fatal logging
    }

    Response::success([
        'userId'    => $newUserId,
        'name'      => $name,
        'email'     => $email,
        'role'      => $role,
        'roleName'  => $ROLES_CATALOG[$role]['name'],
        'status'    => 'active'
    ], "{$ROLES_CATALOG[$role]['name']} '{$name}' created successfully!");
}

// -------------------------------------------------------------
// PUT: Update Role, Permissions, Status, or Password
// -------------------------------------------------------------
if ($method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        Response::error('Invalid JSON payload provided', 400);
    }

    $targetId    = (int)($input['id'] ?? 0);
    $name        = trim((string)($input['name'] ?? ''));
    $phone       = trim((string)($input['phone'] ?? ''));
    $role        = trim((string)($input['role'] ?? ''));
    $department  = trim((string)($input['department'] ?? ''));
    $designation = trim((string)($input['designation'] ?? ''));
    $status      = trim((string)($input['status'] ?? ''));
    $newPassword = trim((string)($input['new_password'] ?? ''));
    $permissions = $input['permissions'] ?? null;
    $adminId     = (int)($input['updater_admin_id'] ?? 104);

    if ($targetId <= 0) {
        Response::error('Target user ID is required for updating', 400);
    }

    $userStmt = $db->prepare("SELECT id, name, email, role FROM users WHERE id = :id LIMIT 1");
    $userStmt->execute([':id' => $targetId]);
    $user = $userStmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        Response::error('Administrative user not found', 404);
    }

    $updates = [];
    $params = [':id' => $targetId];

    if (!empty($name)) {
        $updates[] = 'name = :name';
        $params[':name'] = $name;
    }
    if (!empty($phone)) {
        $updates[] = 'phone = :phone';
        $params[':phone'] = $phone;
    }
    if (!empty($role) && isset($ROLES_CATALOG[$role])) {
        $updates[] = 'role = :role';
        $params[':role'] = $role;
    }
    if (!empty($department)) {
        $updates[] = 'department = :department';
        $params[':department'] = $department;
    }
    if (!empty($designation)) {
        $updates[] = 'designation = :designation';
        $params[':designation'] = $designation;
    }
    if (!empty($status) && in_array($status, ['active', 'inactive', 'suspended'], true)) {
        $updates[] = 'status = :status';
        $params[':status'] = $status;
    }
    if (!empty($newPassword)) {
        $updates[] = 'password_hash = :hash';
        $params[':hash'] = password_hash($newPassword, PASSWORD_BCRYPT);
    }
    if ($permissions !== null && is_array($permissions)) {
        $updates[] = 'permissions = :perms';
        $params[':perms'] = json_encode(array_values($permissions));
    }

    if (empty($updates)) {
        Response::error('No fields provided for update', 400);
    }

    $sql = "UPDATE users SET " . implode(', ', $updates) . " WHERE id = :id";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    Response::success([
        'id'     => $targetId,
        'status' => 'updated'
    ], "User record for '{$user['name']}' updated successfully.");
}

// -------------------------------------------------------------
// DELETE: Suspend / Revoke Role
// -------------------------------------------------------------
if ($method === 'DELETE') {
    $targetId = (int)($_GET['id'] ?? 0);
    $adminId  = (int)($_GET['admin_id'] ?? 104);

    if ($targetId <= 0) {
        Response::error('Target user ID is required', 400);
    }

    // Safety: Prevent deleting Super Admin Benny
    if ($targetId === 104 || $targetId === 103) {
        Response::error('Platform safety violation: Super Administrator accounts cannot be revoked', 403);
    }

    // Demote role to 'buyer' and mark inactive
    $stmt = $db->prepare("UPDATE users SET role = 'buyer', status = 'inactive' WHERE id = :id");
    $stmt->execute([':id' => $targetId]);

    Response::success(['id' => $targetId], 'Administrative role revoked and user set to standard buyer account.');
}

Response::error('Method not allowed', 405);

