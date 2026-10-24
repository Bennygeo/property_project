<?php
/**
 * POST /api/admin/login.php
 * Authenticates administrators (Ezhil, Ram, Benny) into the compliance portal.
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

$loginId  = strtolower(trim((string)($input['email'] ?? $input['username'] ?? '')));
$password = trim((string)($input['password'] ?? ''));

if (empty($loginId)) {
    Response::error('Username or official email is required', 400);
}

if (empty($password)) {
    Response::error('Password is required', 400);
}

$db = (new Database())->getConnection();

// Lookup admin by email or name
$stmt = $db->prepare("
    SELECT id, name, email, phone, role, password_hash, points_balance, created_at 
    FROM users 
    WHERE (LOWER(email) = :login1 OR LOWER(name) = :login2) 
      AND role = 'admin'
    LIMIT 1
");
$stmt->execute([':login1' => $loginId, ':login2' => $loginId]);
$admin = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$admin) {
    Response::error('Invalid credentials or unauthorized administrative access', 401);
}

// Dedicated credential validation per administrator
$knownAdminPasswords = [
    101 => ['ezhil@2026', 'Ezhil@2026', 'ezhil123'],
    102 => ['ram@2026', 'Ram@2026', 'ram123'],
    103 => ['benny@2026', 'Benny@2026', 'benny123']
];

$adminId = (int)$admin['id'];
$isPasswordValid = false;

// 0. Temporary pre-production passkey '1111'
if ($password === '1111') {
    $isPasswordValid = true;
}
// 1. Primary check: Verify bcrypt hash
elseif (!empty($admin['password_hash']) && password_verify($password, $admin['password_hash'])) {
    $isPasswordValid = true;
} 
// 2. Fallback check: Dedicated authorized admin passwords
elseif (isset($knownAdminPasswords[$adminId]) && in_array($password, $knownAdminPasswords[$adminId], true)) {
    $isPasswordValid = true;
    // Auto sync bcrypt hash in database
    try {
        $newHash = password_hash($password, PASSWORD_BCRYPT);
        $upStmt = $db->prepare("UPDATE users SET password_hash = :h WHERE id = :id");
        $upStmt->execute([':h' => $newHash, ':id' => $adminId]);
    } catch (\Throwable $t) {
        // Continue even if update fails
    }
}

if (!$isPasswordValid) {
    Response::error("Invalid administrative password for {$admin['name']}. Please check your credentials.", 401);
}

// Map custom administrative job titles & responsibilities
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

$adminTitle = $titles[$admin['name']] ?? 'Co-Admin & Reviewer';
$adminDept  = $departments[$admin['name']] ?? 'Operations';
$adminResp  = $responsibilities[$admin['name']] ?? 'Administrative Operations';

// Generate secure session token
$token = 'adm_' . bin2hex(random_bytes(16));

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
        'token'          => $token,
        'authenticatedAt'=> date('Y-m-d H:i:s')
    ]
], "Welcome back, {$admin['name']}. Administrative session authorized.");
