<?php
/**
 * POST /api/analytics/clear.php
 * Clear browsing history for a specific phone number or all users.
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

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$phone = trim($input['phone'] ?? '');

$db = (new Database())->getConnection();

// Ensure table exists
$db->exec("
CREATE TABLE IF NOT EXISTS `user_browsing_analytics` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_phone` VARCHAR(20) NOT NULL,
    `property_id` VARCHAR(64) NOT NULL,
    `property_title` VARCHAR(255) NOT NULL,
    `property_type` VARCHAR(64) NOT NULL,
    `price` VARCHAR(32) NOT NULL,
    `price_inr` BIGINT NOT NULL DEFAULT 0,
    `locality` VARCHAR(128) NOT NULL,
    `city` VARCHAR(64) NOT NULL DEFAULT 'Chennai',
    `action_type` VARCHAR(32) NOT NULL DEFAULT 'view',
    `viewed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_user_phone` (`user_phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");

if (!empty($phone) && $phone !== 'all') {
    $stmt = $db->prepare("DELETE FROM `user_browsing_analytics` WHERE `user_phone` = :phone");
    $stmt->execute([':phone' => $phone]);
    $deleted = $stmt->rowCount();
} else {
    $stmt = $db->prepare("DELETE FROM `user_browsing_analytics`");
    $stmt->execute();
    $deleted = $stmt->rowCount();
}

Response::success([
    'cleared' => true,
    'deletedRows' => $deleted,
    'phone' => $phone ?: 'all',
    'message' => 'Browsing history cleared successfully'
]);
