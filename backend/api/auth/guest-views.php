<?php
/**
 * Mannidam Real Estate Marketplace
 * GET / POST / DELETE  /api/auth/guest-views.php
 * Restricts multiple property views across different browsers on the same computer for unauthenticated guests.
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

use Mannidam\Config\Database;
use Mannidam\Helpers\Response;

Response::initCors();

/**
 * Resolve client IP address reliably through reverse proxies and load balancers
 */
function resolveClientIp(): string {
    $headers = [
        'HTTP_CF_CONNECTING_IP',
        'HTTP_X_FORWARDED_FOR',
        'HTTP_CLIENT_IP',
        'REMOTE_ADDR'
    ];
    foreach ($headers as $header) {
        if (!empty($_SERVER[$header])) {
            $parts = explode(',', (string)$_SERVER[$header]);
            $ip = trim($parts[0]);
            if (filter_var($ip, FILTER_VALIDATE_IP)) {
                return $ip;
            }
        }
    }
    return (string)($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$clientIp = resolveClientIp();

// Ensure the table exists
$db = (new Database())->getConnection();
$db->exec("
    CREATE TABLE IF NOT EXISTS `guest_device_views` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `ip_address` VARCHAR(45) NOT NULL,
        `device_hash` VARCHAR(64) NOT NULL,
        `property_id` VARCHAR(50) NOT NULL,
        `viewed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `last_active_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY `idx_guest_view` (`ip_address`, `device_hash`, `property_id`),
        KEY `idx_ip` (`ip_address`),
        KEY `idx_device` (`device_hash`),
        KEY `idx_viewed_at` (`viewed_at`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");

if ($method === 'GET') {
    $deviceHash = trim((string)($_GET['deviceHash'] ?? ''));
    $propertyId = trim((string)($_GET['propertyId'] ?? ''));

    // Fetch distinct properties previously viewed from this IP or device hash
    $stmt = $db->prepare("
        SELECT DISTINCT property_id
        FROM guest_device_views
        WHERE ip_address = ? OR (device_hash = ? AND device_hash != '')
    ");
    $stmt->execute([$clientIp, $deviceHash]);
    $viewedRows = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $viewedPropertyIds = array_values(array_filter(array_unique($viewedRows)));
    $viewCount = count($viewedPropertyIds);

    // If a specific propertyId is being checked
    if (!empty($propertyId)) {
        // Allowed if user hasn't used their 1 free view yet, OR if this is the exact same property they already viewed
        $isAllowed = ($viewCount === 0) || in_array($propertyId, $viewedPropertyIds, true);
        Response::success([
            'allowed'           => $isAllowed,
            'isFirstView'       => ($viewCount === 0),
            'viewCount'         => $viewCount,
            'maxAllowed'        => 1,
            'viewedPropertyIds' => $viewedPropertyIds,
            'clientIp'          => $clientIp,
            'reason'            => $isAllowed ? null : 'guest_limit_reached'
        ], 'Guest view permission check completed');
    }

    // General status check
    Response::success([
        'viewCount'         => $viewCount,
        'maxAllowed'        => 1,
        'viewedPropertyIds' => $viewedPropertyIds,
        'clientIp'          => $clientIp,
        'limitReached'      => ($viewCount >= 1)
    ], 'Guest views retrieved');
}

if ($method === 'POST') {
    $input = Response::getJsonInput();
    $propertyId = trim((string)($input['propertyId'] ?? $_POST['propertyId'] ?? ''));
    $deviceHash = trim((string)($input['deviceHash'] ?? $_POST['deviceHash'] ?? ''));

    if (empty($propertyId)) {
        Response::error('Property ID is required', 422);
    }

    // Check existing viewed properties for this IP/device
    $stmt = $db->prepare("
        SELECT DISTINCT property_id
        FROM guest_device_views
        WHERE ip_address = ? OR (device_hash = ? AND device_hash != '')
    ");
    $stmt->execute([$clientIp, $deviceHash]);
    $viewedRows = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $viewedPropertyIds = array_values(array_filter(array_unique($viewedRows)));

    // Case 1: Already unlocked this exact property
    if (in_array($propertyId, $viewedPropertyIds, true)) {
        // Refresh last active timestamp
        $updateStmt = $db->prepare("
            UPDATE guest_device_views 
            SET last_active_at = NOW() 
            WHERE property_id = ? AND (ip_address = ? OR device_hash = ?)
        ");
        $updateStmt->execute([$propertyId, $clientIp, $deviceHash]);

        Response::success([
            'allowed'           => true,
            'viewedPropertyIds' => $viewedPropertyIds,
            'viewCount'         => count($viewedPropertyIds),
            'clientIp'          => $clientIp
        ], 'Guest view already registered');
    }

    // Case 2: Guest already used their 1 free view on a different property
    if (count($viewedPropertyIds) >= 1) {
        Response::success([
            'allowed'           => false,
            'reason'            => 'guest_limit_reached',
            'viewedPropertyIds' => $viewedPropertyIds,
            'viewCount'         => count($viewedPropertyIds),
            'clientIp'          => $clientIp
        ], 'Guest free view limit of 1 property reached for this device/IP');
    }

    // Case 3: First free property view -> Record it
    $insertStmt = $db->prepare("
        INSERT INTO guest_device_views (ip_address, device_hash, property_id, viewed_at, last_active_at)
        VALUES (?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE last_active_at = NOW()
    ");
    $insertStmt->execute([$clientIp, $deviceHash, $propertyId]);

    $viewedPropertyIds[] = $propertyId;

    Response::success([
        'allowed'           => true,
        'viewedPropertyIds' => array_values(array_unique($viewedPropertyIds)),
        'viewCount'         => 1,
        'clientIp'          => $clientIp
    ], 'First free guest property view registered successfully');
}

if ($method === 'DELETE') {
    // Clear device views (e.g., when resetting or testing)
    $stmt = $db->prepare("DELETE FROM guest_device_views WHERE ip_address = ?");
    $stmt->execute([$clientIp]);

    Response::success([
        'cleared'  => true,
        'clientIp' => $clientIp
    ], 'Guest device view history cleared');
}

Response::error('Method not allowed', 405);
