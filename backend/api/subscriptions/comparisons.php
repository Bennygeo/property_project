<?php
/**
 * GET /api/subscriptions/comparisons.php
 * Retrieve user's comparison history, compared pairs, and compared property IDs from MySQL DB.
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

$db = (new Database())->getConnection();

// Ensure user_property_comparisons table exists
$db->exec("
    CREATE TABLE IF NOT EXISTS `user_property_comparisons` (
      `id` INT AUTO_INCREMENT PRIMARY KEY,
      `user_id` INT NOT NULL,
      `property_id_1` VARCHAR(50) NOT NULL,
      `property_id_2` VARCHAR(50) NOT NULL,
      `pair_key` VARCHAR(110) NOT NULL,
      `compared_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY `uk_user_pair` (`user_id`, `pair_key`),
      KEY `idx_user_prop1` (`user_id`, `property_id_1`),
      KEY `idx_user_prop2` (`user_id`, `property_id_2`),
      FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");

$userId = isset($_GET['userId']) ? (int)$_GET['userId'] : 0;
if ($userId <= 0 && isset($_GET['user_id'])) {
    $userId = (int)$_GET['user_id'];
}

if ($userId <= 0) {
    Response::success([
        'pairs'       => [],
        'propertyIds' => [],
        'comparisons' => [],
        'used'        => 0,
        'limit'       => 0,
        'remaining'   => 0,
        'planId'      => 'explorer'
    ], 'Guest comparison state');
    exit;
}

// Fetch active subscription & entitlements
$entStmt = $db->prepare("
    SELECT 
        e.plan_id,
        e.comparisons_used,
        e.comparison_limit,
        COALESCE(s.status, 'none') AS sub_status
    FROM user_entitlements e
    LEFT JOIN user_subscriptions s ON s.id = e.active_subscription_id
    WHERE e.user_id = ?
");
$entStmt->execute([$userId]);
$ent = $entStmt->fetch(PDO::FETCH_ASSOC);

$planComparisonMap = [
    'explorer'       => 0,
    'smart_buyer'    => 2,
    'priority_buyer' => 5,
    'vip_concierge'  => 20
];

$planId = $ent['plan_id'] ?? 'explorer';
$limit  = $planComparisonMap[$planId] ?? (int)($ent['comparison_limit'] ?? 0);
$used   = (int)($ent['comparisons_used'] ?? 0);

// Fetch all tracked comparisons for this user
$stmt = $db->prepare("
    SELECT 
        c.id,
        c.property_id_1,
        c.property_id_2,
        c.pair_key,
        c.compared_at,
        p1.title AS title_1,
        p1.price AS price_1,
        p1.main_image_url AS image_1,
        p2.title AS title_2,
        p2.price AS price_2,
        p2.main_image_url AS image_2
    FROM user_property_comparisons c
    LEFT JOIN properties p1 ON UPPER(TRIM(p1.id)) = UPPER(TRIM(c.property_id_1))
    LEFT JOIN properties p2 ON UPPER(TRIM(p2.id)) = UPPER(TRIM(c.property_id_2))
    WHERE c.user_id = ?
    ORDER BY c.compared_at DESC
");
$stmt->execute([$userId]);
$comparisons = $stmt->fetchAll(PDO::FETCH_ASSOC);

$pairs = [];
$propertyIds = [];

foreach ($comparisons as $row) {
    if (!empty($row['pair_key'])) {
        $pairs[] = strtoupper(trim($row['pair_key']));
    }
    if (!empty($row['property_id_1'])) {
        $propertyIds[] = strtoupper(trim($row['property_id_1']));
    }
    if (!empty($row['property_id_2'])) {
        $propertyIds[] = strtoupper(trim($row['property_id_2']));
    }
}

$pairs = array_values(array_unique($pairs));
$propertyIds = array_values(array_unique($propertyIds));

Response::success([
    'userId'      => $userId,
    'planId'      => $planId,
    'used'        => $used,
    'limit'       => $limit,
    'remaining'   => max(0, $limit - $used),
    'pairs'       => $pairs,
    'propertyIds' => $propertyIds,
    'comparisons' => $comparisons
], 'User comparison history loaded');
