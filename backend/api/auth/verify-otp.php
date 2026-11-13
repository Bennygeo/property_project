<?php
/**
 * POST /api/auth/verify-otp.php
 * Verifies OTP and logs in / registers the user in MySQL database.
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
$phone = trim((string)($input['phone'] ?? ''));
$otp   = trim((string)($input['otp'] ?? ''));
$name  = trim((string)($input['name'] ?? ''));

if (empty($phone)) {
    Response::error('Mobile number is required', 422);
}

if (empty($otp)) {
    Response::error('OTP verification code is required', 422);
}

// Verification code kept as 1111 until production
if ($otp !== '1111') {
    Response::error('Invalid verification code. Please enter 1111', 400);
}

$cleanPhone = preg_replace('/[^\d+]/', '', $phone);
$last10 = substr(preg_replace('/[^\d]/', '', $cleanPhone), -10);

$db = (new Database())->getConnection();

// Standard permissions for new registered users (buyers)
$defaultBuyerPermissionsList = [
    'view_properties',
    'edit_profile',
    'view_history',
    'share_property',
    'search_properties',
    'send_messages'
];
$defaultBuyerPermissionsJson = json_encode($defaultBuyerPermissionsList);

// Ensure role_definitions table exists with clear distinction between Admin, Developer, and User roles
try {
    $db->exec("
        CREATE TABLE IF NOT EXISTS `role_definitions` (
            `role_key` varchar(50) NOT NULL,
            `role_name` varchar(100) NOT NULL,
            `role_category` enum('admin','developer','user','guest') NOT NULL DEFAULT 'user',
            `access_level` int(11) NOT NULL DEFAULT 4,
            `portal_access` varchar(100) NOT NULL DEFAULT '/profile',
            `is_admin_portal_allowed` tinyint(1) NOT NULL DEFAULT 0,
            `is_developer_portal_allowed` tinyint(1) NOT NULL DEFAULT 0,
            `default_permissions` longtext NOT NULL,
            `description` varchar(255) DEFAULT NULL,
            `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
            PRIMARY KEY (`role_key`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
} catch (\Throwable $e) {
    // Non-fatal if already initialized
}

// Check if user already exists
$stmt = $db->prepare("SELECT * FROM users WHERE phone LIKE ? OR phone LIKE ? LIMIT 1");
$stmt->execute(["%{$last10}", "%{$cleanPhone}%"]);
$user = $stmt->fetch();

if (!$user) {
    // Register new user as standard 'buyer' with restricted user-only permissions and 40 starter points
    $defaultName = !empty($name) ? $name : 'Verified Investor ' . substr($last10, -4);
    $defaultEmail = 'investor_' . $last10 . '@mannidam.com';
    
    $insertStmt = $db->prepare("
        INSERT INTO users (name, email, phone, role, developer_id, department, designation, status, permissions, points_balance)
        VALUES (?, ?, ?, 'buyer', NULL, 'Registered User', 'Verified Buyer / Investor', 'active', ?, 40)
    ");
    $insertStmt->execute([$defaultName, $defaultEmail, $cleanPhone, $defaultBuyerPermissionsJson]);
    $userId = (int)$db->lastInsertId();

    // Log welcome bonus points
    $txnStmt = $db->prepare("
        INSERT INTO wallet_transactions (user_id, transaction_type, points, amount_rupees, description, status)
        VALUES (?, 'bonus_credit', 40, 0, 'Welcome Bonus: 40 Complimentary Media Points', 'success')
    ");
    $txnStmt->execute([$userId]);

    $stmt = $db->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
} else if (($user['role'] ?? 'buyer') === 'buyer' && empty($user['permissions'])) {
    // Ensure existing buyer rows have explicit user permissions populated
    $db->prepare("UPDATE users SET permissions = ?, department = COALESCE(department, 'Registered User'), designation = COALESCE(designation, 'Verified Buyer / Investor') WHERE id = ?")
       ->execute([$defaultBuyerPermissionsJson, (int)$user['id']]);
    $user['permissions'] = $defaultBuyerPermissionsJson;
}

// If phone is 9486140936, ensure full admin role with developer access
if ($last10 === '9486140936') {
    $db->prepare("UPDATE users SET role = 'admin', developer_id = 1, points_balance = 10000 WHERE id = ?")->execute([(int)$user['id']]);
    $user['role'] = 'admin';
    $user['developer_id'] = 1;
    $user['points_balance'] = 10000;
}

$decodedPermissions = [];
if (!empty($user['permissions'])) {
    $tmp = json_decode((string)$user['permissions'], true);
    if (is_array($tmp)) {
        $decodedPermissions = $tmp;
    }
}
if (empty($decodedPermissions) && ($user['role'] ?? 'buyer') === 'buyer') {
    $decodedPermissions = $defaultBuyerPermissionsList;
}

// Mock auth token
$token = 'mannidam_token_' . bin2hex(random_bytes(16));

Response::success([
    'user' => [
        'id'            => (int)$user['id'],
        'name'          => $user['name'],
        'email'         => $user['email'],
        'phone'         => $user['phone'],
        'role'          => $user['role'] ?: 'buyer',
        'permissions'   => $decodedPermissions,
        'developerId'   => !empty($user['developer_id']) ? (int)$user['developer_id'] : null,
        'companyName'   => (!empty($user['developer_id'])) ? 'Experion Developers & Infrastructure' : null,
        'pointsBalance' => (int)$user['points_balance'],
        'createdAt'     => $user['created_at'],
    ],
    'token' => $token,
], "Welcome back, {$user['name']}! OTP verified successfully.");
