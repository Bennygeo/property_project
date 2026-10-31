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

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
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
            COUNT(DISTINCT p.id) AS propertyCount,
            COUNT(DISTINCT CASE WHEN TRIM(COALESCE(pmd.project_name, '')) != '' THEN TRIM(pmd.project_name) ELSE p.id END) AS projectCount,
            GROUP_CONCAT(DISTINCT COALESCE(NULLIF(TRIM(pmd.district), ''), NULLIF(TRIM(p.city_name), '')) SEPARATOR ', ') AS districts,
            MAX(d.logo_url) AS dev_logo,
            MAX(d.projects_completed) AS dev_completed_str,
            MAX(d.established_year) AS dev_est_year
        FROM property_master_details pmd
        INNER JOIN properties p ON pmd.property_id = p.id
        LEFT JOIN developers d ON LOWER(TRIM(d.name)) = LOWER(TRIM(pmd.developer))
        WHERE pmd.developer IS NOT NULL 
          AND TRIM(pmd.developer) != ''
          AND (p.status = 'published' OR p.status IS NULL)
        GROUP BY TRIM(pmd.developer)
        HAVING propertyCount > 0
        ORDER BY projectCount DESC, propertyCount DESC, raw_name ASC
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

            $rawProjects = (int)($r['projectCount'] ?? 1);
            $completedStr = trim((string)($r['dev_completed_str'] ?? ''));
            if (!empty($completedStr) && preg_match('/(\d+)/', $completedStr, $m)) {
                $projectsCount = max((int)$m[1], $rawProjects);
            } else {
                $projectsCount = max($rawProjects, 1);
            }

            // Generate clean initials for logo badge
            $words = preg_split('/\s+/', $clean);
            $initials = '';
            foreach ($words as $w) {
                $ch = strtoupper(substr($w, 0, 1));
                if (ctype_alpha($ch)) {
                    $initials .= $ch;
                }
                if (strlen($initials) >= 2) break;
            }

            $rawDistricts = !empty($r['districts']) ? array_slice(array_unique(array_filter(array_map('trim', explode(',', $r['districts'])))), 0, 3) : ['Tamil Nadu'];

            $builders[] = [
                'name' => $clean,
                'rawName' => $raw,
                'propertyCount' => (int)$r['propertyCount'],
                'projectCount' => $projectsCount,
                'districts' => $rawDistricts,
                'logoUrl' => !empty($r['dev_logo']) ? $r['dev_logo'] : null,
                'initials' => $initials ?: 'DV'
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

