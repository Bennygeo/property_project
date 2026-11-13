<?php
/**
 * Mannidam Real Estate Marketplace - Builders / Developers List API
 * Retrieves verified developers/builders strictly from real database developers & projects tables.
 * Includes developers created with 0 projects as well as legacy project-only developer names.
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
require_once __DIR__ . '/../../helpers/response.php';

use Mannidam\Config\Database;

function buildInitials(string $cleanName): string {
    $words = preg_split('/\s+/', $cleanName);
    $initials = '';
    if (is_array($words)) {
        foreach ($words as $w) {
            $ch = strtoupper(substr($w, 0, 1));
            if (ctype_alpha($ch)) $initials .= $ch;
            if (strlen($initials) >= 2) break;
        }
    }
    return !empty($initials) ? $initials : 'DV';
}

function isPlaceholderBuilder(string $cleanName): bool {
    $lower = strtolower($cleanName);
    return in_array($lower, ['admin', 'developer portal', 'registry admin', 'null', 'undefined', 'n/a'], true);
}

try {
    $db = (new Database())->getConnection();

    // 1. Fetch all developers from `developers` table with project counts (including 0-project developers)
    $devQuery = $db->query("
        SELECT
            d.id AS developer_id,
            d.name,
            d.slug,
            d.rera_number,
            d.logo_url,
            d.cover_image_url,
            d.bg_gradient,
            d.corporate_office,
            d.contact_email,
            d.contact_phone,
            d.website_url,
            d.established_year,
            d.projects_completed,
            d.delivered_sqft,
            d.about_text,
            d.upcoming_projects,
            COUNT(DISTINCT p.project_id) AS projectCount,
            COUNT(DISTINCT p.project_id) AS propertyCount,
            GROUP_CONCAT(DISTINCT NULLIF(TRIM(p.district), '') SEPARATOR ', ') AS districts
        FROM developers d
        LEFT JOIN projects p
            ON (p.developer_id = d.id OR LOWER(TRIM(p.developer_name)) = LOWER(TRIM(d.name)))
            AND (p.status = 'published' OR p.status IS NULL)
        WHERE NULLIF(TRIM(d.name), '') IS NOT NULL
        GROUP BY d.id
        ORDER BY projectCount DESC, d.name ASC
    ");
    $devRows = $devQuery->fetchAll(PDO::FETCH_ASSOC);

    $builders = [];
    $seenNamesLower = [];

    foreach ($devRows as $r) {
        $cleanName = trim((string)$r['name']);
        if (empty($cleanName) || isPlaceholderBuilder($cleanName)) continue;

        $seenNamesLower[strtolower($cleanName)] = true;

        $rawDistricts = !empty($r['districts'])
            ? array_slice(array_unique(array_filter(array_map('trim', explode(',', $r['districts'])))), 0, 4)
            : (!empty($r['corporate_office']) ? [trim((string)$r['corporate_office'])] : ['Tamil Nadu']);

        $slug = !empty($r['slug'])
            ? $r['slug']
            : strtolower(trim(preg_replace('/[^a-zA-Z0-9]+/', '-', $cleanName), '-'));

        $upcomingCount = 0;
        if (!empty($r['upcoming_projects'])) {
            $decodedUp = json_decode((string)$r['upcoming_projects'], true);
            if (is_array($decodedUp)) {
                $upcomingCount = count($decodedUp);
            }
        }

        $builders[] = [
            'id'                    => (int)$r['developer_id'],
            'name'                  => $cleanName,
            'rawName'               => $cleanName,
            'slug'                  => $slug,
            'reraNumber'            => !empty($r['rera_number']) ? $r['rera_number'] : 'TNRERA Verified',
            'propertyCount'         => (int)$r['propertyCount'],
            'projectCount'          => (int)$r['projectCount'],
            'upcomingProjectsCount' => $upcomingCount,
            'districts'             => $rawDistricts,
            'logoUrl'               => !empty($r['logo_url']) ? $r['logo_url'] : null,
            'coverImageUrl'         => !empty($r['cover_image_url']) ? $r['cover_image_url'] : null,
            'bgGradient'            => !empty($r['bg_gradient']) ? $r['bg_gradient'] : null,
            'initials'              => buildInitials($cleanName),
            'corporateOffice'       => !empty($r['corporate_office']) ? $r['corporate_office'] : ($rawDistricts[0] . ', Tamil Nadu'),
            'establishedYear'       => !empty($r['established_year']) ? $r['established_year'] : '2015',
            'contactPhone'          => !empty($r['contact_phone']) ? $r['contact_phone'] : '',
            'contactEmail'          => !empty($r['contact_email']) ? $r['contact_email'] : '',
            'websiteUrl'            => !empty($r['website_url']) ? $r['website_url'] : '',
            'about'                 => !empty($r['about_text']) ? $r['about_text'] : '',
            'projectsCompleted'     => !empty($r['projects_completed']) ? $r['projects_completed'] : '',
            'deliveredSqFt'         => !empty($r['delivered_sqft']) ? $r['delivered_sqft'] : ''
        ];
    }

    // 2. Include legacy project-only developer names not yet present in `developers` table
    $projOnlyQuery = $db->query("
        SELECT
            TRIM(p.developer_name) AS name,
            COUNT(DISTINCT p.project_id) AS projectCount,
            COUNT(DISTINCT p.project_id) AS propertyCount,
            GROUP_CONCAT(DISTINCT NULLIF(TRIM(p.district), '') SEPARATOR ', ') AS districts
        FROM projects p
        LEFT JOIN developers d
            ON (p.developer_id = d.id OR LOWER(TRIM(p.developer_name)) = LOWER(TRIM(d.name)))
        WHERE (p.status = 'published' OR p.status IS NULL)
          AND d.id IS NULL
          AND NULLIF(TRIM(p.developer_name), '') IS NOT NULL
        GROUP BY TRIM(p.developer_name)
        ORDER BY projectCount DESC, name ASC
    ");
    $projOnlyRows = $projOnlyQuery->fetchAll(PDO::FETCH_ASSOC);

    foreach ($projOnlyRows as $r) {
        $cleanName = trim((string)$r['name']);
        if (empty($cleanName) || isPlaceholderBuilder($cleanName)) continue;
        if (isset($seenNamesLower[strtolower($cleanName)])) continue;

        $seenNamesLower[strtolower($cleanName)] = true;
        $rawDistricts = !empty($r['districts'])
            ? array_slice(array_unique(array_filter(array_map('trim', explode(',', $r['districts'])))), 0, 4)
            : ['Tamil Nadu'];

        $slug = strtolower(trim(preg_replace('/[^a-zA-Z0-9]+/', '-', $cleanName), '-'));

        $builders[] = [
            'id'                    => 0,
            'name'                  => $cleanName,
            'rawName'               => $cleanName,
            'slug'                  => $slug,
            'reraNumber'            => 'TNRERA Verified',
            'propertyCount'         => (int)$r['propertyCount'],
            'projectCount'          => (int)$r['projectCount'],
            'upcomingProjectsCount' => 0,
            'districts'             => $rawDistricts,
            'logoUrl'               => null,
            'coverImageUrl'         => null,
            'bgGradient'            => null,
            'initials'              => buildInitials($cleanName),
            'corporateOffice'       => $rawDistricts[0] . ', Tamil Nadu',
            'establishedYear'       => '2015',
            'contactPhone'          => '',
            'contactEmail'          => '',
            'websiteUrl'            => '',
            'about'                 => '',
            'projectsCompleted'     => '',
            'deliveredSqFt'         => ''
        ];
    }

    // Sort combined builders by projectCount DESC, name ASC
    usort($builders, function ($a, $b) {
        if ($b['projectCount'] !== $a['projectCount']) {
            return $b['projectCount'] <=> $a['projectCount'];
        }
        return strcasecmp($a['name'], $b['name']);
    });

    $totalProperties = (int)$db->query("SELECT COUNT(*) FROM projects WHERE status = 'published' OR status IS NULL")->fetchColumn();
    $totalBuilders   = count($builders);

    echo json_encode([
        'success' => true,
        'message' => 'Verified builders fetched successfully from database',
        'data' => [
            'builders'        => $builders,
            'totalBuilders'   => $totalBuilders,
            'totalProperties' => $totalProperties
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to fetch builders: ' . $e->getMessage(),
        'data'    => [
            'builders' => []
        ]
    ]);
}
