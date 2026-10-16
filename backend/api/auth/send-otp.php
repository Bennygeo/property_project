<?php
/**
 * POST /api/auth/send-otp.php
 * Generates dummy OTP for phone number authentication.
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

use Mannidam\Helpers\Response;

Response::initCors();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Method not allowed', 405);
}

$input = Response::getJsonInput();
$phone = trim((string)($input['phone'] ?? ''));

if (empty($phone)) {
    Response::error('Mobile number is required to receive OTP', 422);
}

// Normalize phone number: remove spaces and hyphens
$cleanPhone = preg_replace('/[^\d+]/', '', $phone);
if (strlen(preg_replace('/[^\d]/', '', $cleanPhone)) < 10) {
    Response::error('Please enter a valid 10-digit mobile number', 422);
}

// Dummy OTP for test / development mode
$dummyOtp = '1234';

Response::success([
    'phone'      => $cleanPhone,
    'dummyOtp'   => $dummyOtp,
    'expiresIn'  => 300, // seconds
    'isDemo'     => true,
], "OTP sent successfully to {$cleanPhone}. For demo testing, use code: {$dummyOtp}");
