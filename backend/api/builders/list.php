<?php
/**
 * Mannidam Real Estate Marketplace - Builders / Developers List API
 * Retrieves all unique verified developers/builders from the database with property counts.
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';

use Mannidam\Config\Database;

try {
    $db = (new Database())->getConnection();

    $stmt = $db->query("
        SELECT 
            TRIM(pmd.developer) AS raw_name,
            COUNT(DISTINCT p.id) AS propertyCount
        FROM property_master_details pmd
        INNER JOIN properties p ON pmd.property_id = p.id
        WHERE pmd.developer IS NOT NULL 
          AND TRIM(pmd.developer) != ''
          AND (p.status = 'published' OR p.status IS NULL)
        GROUP BY TRIM(pmd.developer)
        HAVING propertyCount > 0
        ORDER BY propertyCount DESC, raw_name ASC
    ");

    $rawBuilders = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $builders = [];
    $seen = [];

    foreach ($rawBuilders as $r) {
        $raw = trim($r['raw_name']);
        // Clean out corrupt characters, question mark sequences, and unwanted symbols
        $clean = preg_replace('/[^\x20-\x7E\xA0-\xFF]/u', '', $raw);
        $clean = preg_replace('/[â\?]{2,}/', '', $clean);
        $clean = trim($clean, " -:;,");

        // Clean up prefixes like "M/s.", "Mr.", "Mrs." for neat display if desired, or keep legible
        $clean = preg_replace('/\s+/', ' ', $clean);

        if (empty($clean) || strlen($clean) < 2) continue;

        $key = strtolower($clean);
        if (!isset($seen[$key])) {
            $seen[$key] = true;
            $builders[] = [
                'name' => $clean,
                'rawName' => $raw,
                'propertyCount' => (int)$r['propertyCount']
            ];
        }
    }

    $totalProperties = (int)$db->query("SELECT COUNT(*) FROM properties WHERE status = 'published' OR status IS NULL")->fetchColumn();

    echo json_encode([
        'success' => true,
        'message' => 'Builders retrieved successfully',
        'data' => [
            'total' => count($builders),
            'totalProperties' => $totalProperties,
            'builders' => $builders
        ]
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to fetch builders: ' . $e->getMessage()
    ]);
}

