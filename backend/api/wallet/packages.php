<?php
/**
 * GET /api/wallet/packages.php
 * Fetches available media point recharge packages.
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

use Mannidam\Config\Database;
use Mannidam\Helpers\Response;

Response::initCors();

$db = (new Database())->getConnection();

$stmt = $db->query("
    SELECT 
        id,
        name,
        category,
        points,
        bonus_points AS bonus,
        price_in_rupees AS rupees,
        subtitle,
        unlock_estimate AS unlockEstimate,
        is_popular AS popular,
        is_recommended AS isRecommended,
        features_json AS features
    FROM recharge_packages
    ORDER BY price_in_rupees ASC
");

$rows = $stmt->fetchAll();
$packages = [];

foreach ($rows as $r) {
    $features = !empty($r['features']) ? json_decode($r['features'], true) : [];
    $packages[] = [
        'id'             => $r['id'],
        'name'           => $r['name'],
        'category'       => $r['category'],
        'points'         => (int)$r['points'],
        'bonus'          => (int)$r['bonus'],
        'rupees'         => (int)$r['rupees'],
        'label'          => $r['name'] . ($r['bonus'] > 0 ? " (+{$r['bonus']} Bonus)" : ''),
        'popular'        => (bool)$r['popular'],
        'isRecommended'  => (bool)$r['isRecommended'],
        'subtitle'       => $r['subtitle'],
        'unlockEstimate' => $r['unlockEstimate'],
        'features'       => $features,
    ];
}

Response::success($packages, 'Recharge packages retrieved');
