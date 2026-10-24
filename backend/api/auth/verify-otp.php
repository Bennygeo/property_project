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

// Check if user already exists
$stmt = $db->prepare("SELECT * FROM users WHERE phone LIKE ? OR phone LIKE ? LIMIT 1");
$stmt->execute(["%{$last10}", "%{$cleanPhone}%"]);
$user = $stmt->fetch();

if (!$user) {
    // Register new user with 40 starter points
    $defaultName = !empty($name) ? $name : 'Verified Investor ' . substr($last10, -4);
    $defaultEmail = 'investor_' . $last10 . '@mannidam.com';
    
    $insertStmt = $db->prepare("
        INSERT INTO users (name, email, phone, role, points_balance)
        VALUES (?, ?, ?, 'buyer', 40)
    ");
    $insertStmt->execute([$defaultName, $defaultEmail, $cleanPhone]);
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
}

// Mock auth token
$token = 'mannidam_token_' . bin2hex(random_bytes(16));

Response::success([
    'user' => [
        'id'            => (int)$user['id'],
        'name'          => $user['name'],
        'email'         => $user['email'],
        'phone'         => $user['phone'],
        'role'          => $user['role'],
        'pointsBalance' => (int)$user['points_balance'],
        'createdAt'     => $user['created_at'],
    ],
    'token' => $token,
], "Welcome back, {$user['name']}! OTP verified successfully.");
