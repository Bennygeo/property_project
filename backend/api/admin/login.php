<?php
/**
 * POST /api/admin/login.php
 * Authenticates administrators (Ezhil, Ram, Benny) into the compliance portal.
 * Features automated self-healing & credential synchronization.
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

// Authorized administrator personas registry
$adminPersonas = [
    'benny' => [
        'id'             => 103,
        'name'           => 'Benny',
        'email'          => 'benny@mannidam.com',
        'phone'          => '+91 94440 00003',
        'title'          => 'Web Development & Online Customer Handling',
        'department'     => 'Technology & Online Customer Operations',
        'responsibility' => 'Web development and online customer handling',
        'passwords'      => ['benny@2026', 'Benny@2026', 'benny123', '1111'],
        'aliases'        => ['benny', 'benny@mannidam.com', 'bennygeo@gmail.com']
    ],
    'ezhil' => [
        'id'             => 101,
        'name'           => 'Ezhil',
        'email'          => 'ezhil@mannidam.com',
        'phone'          => '+91 94440 10001',
        'title'          => 'Photography & Marketing',
        'department'     => 'Media Production & Visual Marketing',
        'responsibility' => 'Photography and marketing',
        'passwords'      => ['ezhil@2026', 'Ezhil@2026', 'ezhil123', '1111'],
        'aliases'        => ['ezhil', 'ezhil@mannidam.com']
    ],
    'ram' => [
        'id'             => 102,
        'name'           => 'Ram',
        'email'          => 'ram@mannidam.com',
        'phone'          => '+91 94440 10002',
        'title'          => 'Marketing, Broker Relations & Site Promotion',
        'department'     => 'Broker Network & Site Promotion',
        'responsibility' => 'Marketing and site promotion',
        'passwords'      => ['ram@2026', 'Ram@2026', 'ram123', '1111'],
        'aliases'        => ['ram', 'ram@mannidam.com']
    ]
];

// Identify persona if matching by alias
$matchedPersona = null;
foreach ($adminPersonas as $p) {
    if (in_array($loginId, $p['aliases'], true)) {
        $matchedPersona = $p;
        break;
    }
}

$db = null;
try {
    $db = (new Database())->getConnection();
} catch (\Throwable $e) {
    // Database connection failed
}

$admin = null;

if ($db !== null) {
    // 1. Ensure `password_hash` column exists in `users`
    try {
        $db->exec("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) DEFAULT NULL AFTER phone");
    } catch (\Throwable $e) {
        // Ignore if already exists
    }

    // 2. Query admin user from database
    try {
        $stmt = $db->prepare("
            SELECT id, name, email, phone, role, password_hash, points_balance, created_at 
            FROM users 
            WHERE (LOWER(email) = :login1 OR LOWER(name) = :login2) 
              AND role = 'admin'
            LIMIT 1
        ");
        $stmt->execute([':login1' => $loginId, ':login2' => $loginId]);
        $admin = $stmt->fetch(PDO::FETCH_ASSOC);
    } catch (\Throwable $e) {
        $admin = null;
    }
}

// 3. Self-healing: If admin not found in DB or DB not yet seeded, but login is an authorized persona:
if (!$admin && $matchedPersona !== null) {
    // Verify password against persona authorized passwords
    if (!in_array($password, $matchedPersona['passwords'], true)) {
        Response::error("Invalid administrative password for {$matchedPersona['name']}. Please check your credentials.", 401);
    }

    // Automatically seed or promote user in database
    if ($db !== null) {
        try {
            $bcrypt = password_hash($password, PASSWORD_BCRYPT);
            
            // Check if user exists by email or name (e.g. role was buyer)
            $checkStmt = $db->prepare("SELECT id FROM users WHERE LOWER(email) = :e OR LOWER(name) = :n LIMIT 1");
            $checkStmt->execute([':e' => $matchedPersona['email'], ':n' => strtolower($matchedPersona['name'])]);
            $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);

            if ($existing) {
                $upStmt = $db->prepare("
                    UPDATE users 
                    SET role = 'admin', password_hash = :h, email = :e, name = :n 
                    WHERE id = :id
                ");
                $upStmt->execute([
                    ':h'  => $bcrypt,
                    ':e'  => $matchedPersona['email'],
                    ':n'  => $matchedPersona['name'],
                    ':id' => $existing['id']
                ]);
                $finalId = (int)$existing['id'];
            } else {
                $inStmt = $db->prepare("
                    INSERT INTO users (id, name, email, phone, role, password_hash, points_balance)
                    VALUES (:id, :n, :e, :p, 'admin', :h, 5000)
                    ON DUPLICATE KEY UPDATE role = 'admin', password_hash = VALUES(password_hash)
                ");
                $inStmt->execute([
                    ':id' => $matchedPersona['id'],
                    ':n'  => $matchedPersona['name'],
                    ':e'  => $matchedPersona['email'],
                    ':p'  => $matchedPersona['phone'],
                    ':h'  => $bcrypt
                ]);
                $finalId = $matchedPersona['id'];
            }

            // Fetch newly updated admin record
            $fStmt = $db->prepare("SELECT id, name, email, phone, role, password_hash, points_balance, created_at FROM users WHERE id = :id LIMIT 1");
            $fStmt->execute([':id' => $finalId]);
            $admin = $fStmt->fetch(PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            // Fallback object if SQL write fails
        }
    }

    if (!$admin) {
        $admin = [
            'id'             => $matchedPersona['id'],
            'name'           => $matchedPersona['name'],
            'email'          => $matchedPersona['email'],
            'phone'          => $matchedPersona['phone'],
            'role'           => 'admin',
            'points_balance' => 5000,
            'created_at'     => date('Y-m-d H:i:s')
        ];
    }
}

// 4. If still no admin record, reject unauthorized access
if (!$admin) {
    Response::error('Invalid credentials or unauthorized administrative access', 401);
}

// 5. Password Validation
$isPasswordValid = false;

// Universal pre-production passkey
if ($password === '1111') {
    $isPasswordValid = true;
}
// Check bcrypt hash
elseif (!empty($admin['password_hash']) && password_verify($password, $admin['password_hash'])) {
    $isPasswordValid = true;
}
// Check persona known passwords
elseif ($matchedPersona !== null && in_array($password, $matchedPersona['passwords'], true)) {
    $isPasswordValid = true;
    if ($db !== null && !empty($admin['id'])) {
        try {
            $newHash = password_hash($password, PASSWORD_BCRYPT);
            $upStmt = $db->prepare("UPDATE users SET password_hash = :h WHERE id = :id");
            $upStmt->execute([':h' => $newHash, ':id' => $admin['id']]);
        } catch (\Throwable $t) {}
    }
}

if (!$isPasswordValid) {
    Response::error("Invalid administrative password for {$admin['name']}. Please check your credentials.", 401);
}

// Custom titles & departments
$adminName = $admin['name'];
$matched = $adminPersonas[strtolower($adminName)] ?? $matchedPersona;

$title          = $matched['title'] ?? 'Platform Administrator';
$department     = $matched['department'] ?? 'Operations';
$responsibility = $matched['responsibility'] ?? 'Administrative Operations';

$token = 'adm_' . bin2hex(random_bytes(16));

Response::success([
    'admin' => [
        'id'             => (int)$admin['id'],
        'name'           => $admin['name'],
        'email'          => $admin['email'],
        'phone'          => $admin['phone'] ?? '+91 94440 00000',
        'role'           => $admin['role'],
        'title'          => $title,
        'department'     => $department,
        'responsibility' => $responsibility,
        'avatarInitials' => strtoupper(substr($admin['name'], 0, 2)),
        'token'          => $token,
        'authenticatedAt'=> date('Y-m-d H:i:s')
    ]
], "Welcome back, {$admin['name']}. Administrative session authorized.");
