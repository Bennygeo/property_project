<?php
/**
 * GET /api/admin/profile.php?admin_id=103
 * Returns administrative profile data, personal activity audit logs,
 * and peer activity logs conducted by other administrators.
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

use Mannidam\Config\Database;
use Mannidam\Helpers\Response;

Response::initCors();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    Response::error('Method not allowed', 405);
}

$adminId = (int)($_GET['admin_id'] ?? 103);
$filterOtherAdminId = !empty($_GET['other_admin_id']) ? (int)$_GET['other_admin_id'] : null;

$db = (new Database())->getConnection();

// 1. Fetch Admin User Record
$stmt = $db->prepare("SELECT id, name, email, phone, role, points_balance, created_at FROM users WHERE id = :id AND role = 'admin' LIMIT 1");
$stmt->execute([':id' => $adminId]);
$admin = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$admin) {
    Response::error('Administrator not found', 404);
}

// Map Titles, Departments, and Operational Mandates
$titles = [
    'Ezhil' => 'Photography & Marketing',
    'Ram'   => 'Marketing, Broker Relations & Site Promotion',
    'Benny' => 'Web Development & Online Customer Handling'
];

$departments = [
    'Ezhil' => 'Media Production & Visual Marketing',
    'Ram'   => 'Broker Network & Site Promotion',
    'Benny' => 'Technology & Online Customer Operations'
];

$responsibilities = [
    'Ezhil' => 'Photography and marketing',
    'Ram'   => 'Marketing and site promotion',
    'Benny' => 'Web development and online customer handling'
];

$clearanceLevels = [
    'Ezhil' => 'Level 3 — Visual Media & Architectural Showcase Authority',
    'Ram'   => 'Level 3 — Institutional Broker Network & Field Outreach',
    'Benny' => 'Level 3 — Digital Infrastructure & Platform Administrator'
];

$adminTitle = $titles[$admin['name']] ?? 'Co-Admin & Reviewer';
$adminDept  = $departments[$admin['name']] ?? 'Operations';
$adminResp  = $responsibilities[$admin['name']] ?? 'Administrative Operations';
$adminClear = $clearanceLevels[$admin['name']] ?? 'Level 3 — SRO Patta & Peer Signature Authority';

// 2. Fetch Activity Metrics
$statsStmt = $db->prepare("
    SELECT
        COUNT(*) AS total_my_actions,
        SUM(CASE WHEN action_type = 'post_property' THEN 1 ELSE 0 END) AS my_posts,
        SUM(CASE WHEN action_type = 'approve_peer_review' THEN 1 ELSE 0 END) AS my_peer_approvals,
        SUM(CASE WHEN action_type = 'approve_user_review' THEN 1 ELSE 0 END) AS my_user_approvals,
        SUM(CASE WHEN action_type IN ('reject_property', 'request_revision') THEN 1 ELSE 0 END) AS my_rejections
    FROM admin_activity_logs
    WHERE admin_id = :aid
");
$statsStmt->execute([':aid' => $adminId]);
$myStats = $statsStmt->fetch(PDO::FETCH_ASSOC);

// Co-admin actions total
$otherStatsStmt = $db->prepare("SELECT COUNT(*) FROM admin_activity_logs WHERE admin_id != :aid");
$otherStatsStmt->execute([':aid' => $adminId]);
$coAdminTotal = (int)$otherStatsStmt->fetchColumn();

// 3. Fetch My Activities (Stream A)
$myStmt = $db->prepare("
    SELECT id, admin_id AS adminId, admin_name AS adminName, action_type AS actionType,
           property_id AS propertyId, property_title AS propertyTitle, notes,
           target_user_id AS targetUserId, target_user_name AS targetUserName,
           created_at AS createdAt
    FROM admin_activity_logs
    WHERE admin_id = :aid
    ORDER BY created_at DESC
    LIMIT 50
");
$myStmt->execute([':aid' => $adminId]);
$myActivities = $myStmt->fetchAll(PDO::FETCH_ASSOC);

// 4. Fetch Other Admins' Activities (Stream B)
$whereOther = ['admin_id != :aid'];
$paramsOther = [':aid' => $adminId];

if ($filterOtherAdminId) {
    $whereOther[] = 'admin_id = :fid';
    $paramsOther[':fid'] = $filterOtherAdminId;
}

$whereOtherSql = implode(' AND ', $whereOther);

$otherStmt = $db->prepare("
    SELECT id, admin_id AS adminId, admin_name AS adminName, action_type AS actionType,
           property_id AS propertyId, property_title AS propertyTitle, notes,
           target_user_id AS targetUserId, target_user_name AS targetUserName,
           created_at AS createdAt
    FROM admin_activity_logs
    WHERE {$whereOtherSql}
    ORDER BY created_at DESC
    LIMIT 50
");
$otherStmt->execute($paramsOther);
$otherActivities = $otherStmt->fetchAll(PDO::FETCH_ASSOC);

Response::success([
    'admin' => [
        'id'             => (int)$admin['id'],
        'name'           => $admin['name'],
        'email'          => $admin['email'],
        'phone'          => $admin['phone'],
        'role'           => $admin['role'],
        'title'          => $adminTitle,
        'department'     => $adminDept,
        'responsibility' => $adminResp,
        'avatarInitials' => strtoupper(substr($admin['name'], 0, 2)),
        'clearanceLevel' => $adminClear,
        'createdAt'      => $admin['created_at']
    ],
    'summary' => [
        'totalMyActions'     => (int)($myStats['total_my_actions'] ?? 0),
        'myPosts'            => (int)($myStats['my_posts'] ?? 0),
        'myPeerApprovals'    => (int)($myStats['my_peer_approvals'] ?? 0),
        'myUserApprovals'    => (int)($myStats['my_user_approvals'] ?? 0),
        'myRejections'       => (int)($myStats['my_rejections'] ?? 0),
        'coAdminTotalActions'=> $coAdminTotal
    ],
    'myActivities'        => $myActivities,
    'otherAdminActivities'=> $otherActivities
], 'Admin profile and audit logs retrieved successfully');
