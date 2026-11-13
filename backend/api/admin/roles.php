<?php
/**
 * /api/admin/roles.php
 * Administrative Role & Access Governance API for Super Admin.
 * Strictly maintains ONLY the authorized platform roles:
 * 1. Super admin - Full platform access
 * 2. Developer - Access only their authorised company and projects
 * 3. Sales executive - Manage assigned leads and customer follow-ups
 * 4. Property advisor - Manage advisory sessions and recommendations
 * 5. Operations executive - Manage site visits and coordination
 * 6. Finance admin - Payments, subscriptions and commissions
 * 7. Content / GIS admin - Localities, maps, media and project information
 * 8. Public visitor - Browse permitted public project information
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

use Mannidam\Config\Database;
use Mannidam\Helpers\Response;

Response::initCors();

$method = $_SERVER['REQUEST_METHOD'];
$db = (new Database())->getConnection();

// Explicit Platform Roles Catalog
$ROLES_CATALOG = [
    'super_admin' => [
        'id'          => 'super_admin',
        'name'        => 'Super admin',
        'badgeColor'  => 'purple',
        'description' => 'Full platform access: Total governance, user provisioning, database, projects, financials & settings.',
        'level'       => 1,
        'dashboardRoute' => '/admin',
        'defaultPermissions' => [
            'all_access', 'role_governance', 'developer_access', 'sales_leads',
            'advisory_sessions', 'site_visits', 'finance_payments', 'gis_content'
        ]
    ],
    'developer' => [
        'id'          => 'developer',
        'name'        => 'Developer',
        'badgeColor'  => 'indigo',
        'description' => 'Access only their authorised company and projects.',
        'level'       => 2,
        'dashboardRoute' => '/portal/developer',
        'defaultPermissions' => [
            'developer_access', 'company_projects', 'developer_inventory'
        ]
    ],
    'sales_executive' => [
        'id'          => 'sales_executive',
        'name'        => 'Sales executive',
        'badgeColor'  => 'blue',
        'description' => 'Manage assigned leads and customer follow-ups.',
        'level'       => 3,
        'dashboardRoute' => '/portal/sales',
        'defaultPermissions' => [
            'sales_leads', 'lead_followups', 'customer_communication'
        ]
    ],
    'property_advisor' => [
        'id'          => 'property_advisor',
        'name'        => 'Property advisor',
        'badgeColor'  => 'emerald',
        'description' => 'Manage advisory sessions and recommendations.',
        'level'       => 3,
        'dashboardRoute' => '/portal/advisor',
        'defaultPermissions' => [
            'advisory_sessions', 'property_recommendations', 'buyer_consultation'
        ]
    ],
    'operations_executive' => [
        'id'          => 'operations_executive',
        'name'        => 'Operations executive',
        'badgeColor'  => 'amber',
        'description' => 'Manage site visits and coordination.',
        'level'       => 3,
        'dashboardRoute' => '/portal/operations',
        'defaultPermissions' => [
            'site_visits', 'field_coordination', 'visit_verification'
        ]
    ],
    'finance_admin' => [
        'id'          => 'finance_admin',
        'name'        => 'Finance admin',
        'badgeColor'  => 'teal',
        'description' => 'Payments, subscriptions and commissions.',
        'level'       => 2,
        'dashboardRoute' => '/portal/finance',
        'defaultPermissions' => [
            'finance_payments', 'subscription_ledger', 'commission_payouts'
        ]
    ],
    'content_gis_admin' => [
        'id'          => 'content_gis_admin',
        'name'        => 'Content / GIS admin',
        'badgeColor'  => 'rose',
        'description' => 'Localities, maps, media and project information.',
        'level'       => 2,
        'dashboardRoute' => '/portal/gis',
        'defaultPermissions' => [
            'gis_content', 'localities_maps', 'media_assets', 'project_information'
        ]
    ],
    'buyer' => [
        'id'          => 'buyer',
        'name'        => 'Registered User / Buyer',
        'badgeColor'  => 'slate',
        'description' => 'Standard registered user: view properties, edit profile, history, share, search and message.',
        'level'       => 4,
        'dashboardRoute' => '/profile',
        'defaultPermissions' => [
            'view_properties', 'edit_profile', 'view_history', 'share_property', 'search_properties', 'send_messages'
        ]
    ],
    'public_visitor' => [
        'id'          => 'public_visitor',
        'name'        => 'Public visitor',
        'badgeColor'  => 'slate',
        'description' => 'Browse permitted public project information.',
        'level'       => 4,
        'dashboardRoute' => '/home',
        'defaultPermissions' => [
            'public_browse'
        ]
    ]
];

// Explicit Granular Permissions Catalog
$PERMISSIONS_CATALOG = [
    ['key' => 'all_access',         'label' => 'Full Platform Access',             'category' => 'Governance', 'desc' => 'Unrestricted super admin authority across entire system'],
    ['key' => 'role_governance',    'label' => 'User & Role Provisioning',         'category' => 'Governance', 'desc' => 'Create, edit, authorize and revoke team member roles'],
    ['key' => 'developer_access',   'label' => 'Developer Company & Projects',     'category' => 'Developer',  'desc' => 'Access only authorised company portfolio and inventory'],
    ['key' => 'sales_leads',        'label' => 'Assigned Leads & Follow-ups',      'category' => 'Sales',      'desc' => 'Manage assigned buyer leads and customer follow-ups'],
    ['key' => 'advisory_sessions',  'label' => 'Advisory Sessions & Advice',       'category' => 'Advisory',   'desc' => 'Manage buyer advisory sessions and recommendations'],
    ['key' => 'site_visits',        'label' => 'Site Visits & Coordination',       'category' => 'Operations', 'desc' => 'Manage scheduled property site visits and field coordination'],
    ['key' => 'finance_payments',   'label' => 'Payments, Subscriptions & Comm',   'category' => 'Finance',    'desc' => 'Manage payments, subscription plans, and commission payouts'],
    ['key' => 'gis_content',        'label' => 'Localities, Maps & Media',         'category' => 'GIS/Media',  'desc' => 'Manage localities, GIS maps, media assets, and project info'],
    ['key' => 'view_properties',    'label' => 'View Properties',                  'category' => 'User',       'desc' => 'Browse and inspect property listings and details'],
    ['key' => 'edit_profile',       'label' => 'Edit Own Profile',                 'category' => 'User',       'desc' => 'Update own name, email, phone and preferences'],
    ['key' => 'view_history',       'label' => 'View Browsing History',            'category' => 'User',       'desc' => 'View and clear own property view history'],
    ['key' => 'share_property',     'label' => 'Share Properties',                 'category' => 'User',       'desc' => 'Share property dossiers and links'],
    ['key' => 'search_properties',  'label' => 'Search Properties',                'category' => 'User',       'desc' => 'Use search bar, filters, and save searches'],
    ['key' => 'send_messages',      'label' => 'Send Inquiries & Messages',        'category' => 'User',       'desc' => 'Message developers/concierge or request callbacks'],
    ['key' => 'public_browse',      'label' => 'Permitted Public Information',      'category' => 'Public',     'desc' => 'Browse verified public marketplace dossiers']
];

// -------------------------------------------------------------
// Helper: Verify Super Admin Request
// -------------------------------------------------------------
function getRequesterAdmin(PDO $db): ?array {
    $reqAdminId = (int)($_GET['admin_id'] ?? $_POST['admin_id'] ?? 0);

    if ($reqAdminId > 0) {
        $stmt = $db->prepare("SELECT id, name, email, role, status FROM users WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => $reqAdminId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) return $row;
    }

    $stmt = $db->query("SELECT id, name, email, role, status FROM users WHERE id = 104 OR role = 'super_admin' ORDER BY id DESC LIMIT 1");
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
}

// -------------------------------------------------------------
// GET: Fetch Staff / Users by Specified Roles
// -------------------------------------------------------------
if ($method === 'GET') {
    $requester = getRequesterAdmin($db);
    
    $search = trim($_GET['q'] ?? '');
    $roleFilter = trim($_GET['role'] ?? 'all');
    $statusFilter = trim($_GET['status'] ?? 'all');

    $validRoles = array_keys($ROLES_CATALOG);

    $where = ["role IN ('" . implode("','", $validRoles) . "')"];
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
                WHEN 'developer' THEN 2 
                WHEN 'sales_executive' THEN 3 
                WHEN 'property_advisor' THEN 4 
                WHEN 'operations_executive' THEN 5 
                WHEN 'finance_admin' THEN 6 
                WHEN 'content_gis_admin' THEN 7 
                ELSE 8 
            END, id ASC
    ");
    $stmt->execute($params);
    $rawUsers = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $users = array_map(function($u) use ($ROLES_CATALOG) {
        $roleInfo = $ROLES_CATALOG[$u['role']] ?? [
            'id' => $u['role'],
            'name' => ucfirst(str_replace('_', ' ', $u['role'])),
            'badgeColor' => 'slate',
            'description' => 'Platform Role'
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
            'department'     => $u['department'] ?: 'FindAPlot.in Workspace',
            'designation'    => $u['designation'] ?: $roleInfo['name'],
            'status'         => $u['status'] ?: 'active',
            'permissions'    => $perms,
            'avatarInitials' => strtoupper(substr(trim($u['name']), 0, 2)),
            'lastLogin'      => $u['last_login_at'] ? date('d M Y, h:i A', strtotime($u['last_login_at'])) : 'Active workspace',
            'createdAt'      => date('d M Y', strtotime($u['created_at']))
        ];
    }, $rawUsers);

    // Compute KPI stats
    $statsStmt = $db->query("
        SELECT 
            COUNT(*) AS total_staff,
            SUM(CASE WHEN role = 'super_admin' THEN 1 ELSE 0 END) AS super_admins,
            SUM(CASE WHEN role = 'developer' THEN 1 ELSE 0 END) AS developers,
            SUM(CASE WHEN role = 'sales_executive' THEN 1 ELSE 0 END) AS sales_executives,
            SUM(CASE WHEN role = 'property_advisor' THEN 1 ELSE 0 END) AS property_advisors,
            SUM(CASE WHEN role = 'operations_executive' THEN 1 ELSE 0 END) AS operations_executives,
            SUM(CASE WHEN role = 'finance_admin' THEN 1 ELSE 0 END) AS finance_admins,
            SUM(CASE WHEN role = 'content_gis_admin' THEN 1 ELSE 0 END) AS content_gis_admins,
            SUM(CASE WHEN role = 'public_visitor' THEN 1 ELSE 0 END) AS public_visitors,
            SUM(CASE WHEN status = 'active' OR status IS NULL THEN 1 ELSE 0 END) AS active_accounts
        FROM users
        WHERE role IN ('" . implode("','", $validRoles) . "')
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
            'totalStaff'           => (int)($stats['total_staff'] ?? 0),
            'superAdmins'          => (int)($stats['super_admins'] ?? 0),
            'developers'           => (int)($stats['developers'] ?? 0),
            'salesExecutives'      => (int)($stats['sales_executives'] ?? 0),
            'propertyAdvisors'     => (int)($stats['property_advisors'] ?? 0),
            'operationsExecutives' => (int)($stats['operations_executives'] ?? 0),
            'financeAdmins'        => (int)($stats['finance_admins'] ?? 0),
            'contentGisAdmins'     => (int)($stats['content_gis_admins'] ?? 0),
            'publicVisitors'       => (int)($stats['public_visitors'] ?? 0),
            'activeAccounts'       => (int)($stats['active_accounts'] ?? 0)
        ],
        'users'                => $users,
        'availableRoles'       => array_values($ROLES_CATALOG),
        'availablePermissions' => $PERMISSIONS_CATALOG
    ], 'Administrative staff and roles fetched successfully');
}

// -------------------------------------------------------------
// POST: Provision New User with Specified Role
// -------------------------------------------------------------
if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        Response::error('Invalid JSON payload provided', 400);
    }

    $name        = trim((string)($input['name'] ?? ''));
    $email       = strtolower(trim((string)($input['email'] ?? '')));
    $phone       = trim((string)($input['phone'] ?? ''));
    $role        = trim((string)($input['role'] ?? 'sales_executive'));
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
        // Upgrade existing user to role
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
            ':dept'  => $department ?: ($ROLES_CATALOG[$role]['name'] . ' Department'),
            ':desig' => $designation ?: $ROLES_CATALOG[$role]['name'],
            ':perms' => $permissionsJson,
            ':hash'  => $bcrypt,
            ':id'    => $existing['id']
        ]);
        $newUserId = (int)$existing['id'];
        $actionDesc = "Provisioned user '{$name}' (ID: {$newUserId}) with role {$ROLES_CATALOG[$role]['name']}";
    } else {
        // Insert new user
        $insertStmt = $db->prepare("
            INSERT INTO users (name, email, phone, role, department, designation, permissions, password_hash, status, points_balance, created_by)
            VALUES (:name, :email, :phone, :role, :dept, :desig, :perms, :hash, 'active', 5000, :cby)
        ");
        $insertStmt->execute([
            ':name'  => $name,
            ':email' => $email,
            ':phone' => $phone ?: null,
            ':role'  => $role,
            ':dept'  => $department ?: ($ROLES_CATALOG[$role]['name'] . ' Department'),
            ':desig' => $designation ?: $ROLES_CATALOG[$role]['name'],
            ':perms' => $permissionsJson,
            ':hash'  => $bcrypt,
            ':cby'   => $adminId
        ]);
        $newUserId = (int)$db->lastInsertId();
        $actionDesc = "Provisioned new {$ROLES_CATALOG[$role]['name']} account for '{$name}' ({$email})";
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
    } catch (\Throwable $e) {}

    Response::success([
        'userId'    => $newUserId,
        'name'      => $name,
        'email'     => $email,
        'role'      => $role,
        'roleName'  => $ROLES_CATALOG[$role]['name'],
        'status'    => 'active'
    ], "{$ROLES_CATALOG[$role]['name']} '{$name}' provisioned successfully!");
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
        Response::error('User not found', 404);
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

    // Mark user inactive
    $stmt = $db->prepare("UPDATE users SET status = 'inactive' WHERE id = :id");
    $stmt->execute([':id' => $targetId]);

    Response::success(['id' => $targetId], 'User access has been suspended/deactivated.');
}

Response::error('Method not allowed', 405);
