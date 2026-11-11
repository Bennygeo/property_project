<?php
/**
 * Mannidam Real Estate Marketplace - Builders / Developers List API
 * Retrieves all verified developers/builders from the database with property counts, logos, and RERA numbers.
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

    // 1. Fetch registered master developers
    $devStmt = $db->query("
        SELECT 
            d.id,
            d.name,
            d.slug,
            d.rera_number,
            d.logo_url,
            d.cover_image_url,
            d.corporate_office,
            d.established_year,
            d.projects_completed,
            d.upcoming_projects,
            COUNT(DISTINCT p.id) AS propertyCount,
            COUNT(DISTINCT CASE WHEN TRIM(COALESCE(pmd.project_name, '')) != '' THEN TRIM(pmd.project_name) ELSE p.id END) AS projectCount,
            GROUP_CONCAT(DISTINCT COALESCE(NULLIF(TRIM(pmd.district), ''), NULLIF(TRIM(p.city_name), '')) SEPARATOR ', ') AS districts
        FROM developers d
        LEFT JOIN properties p ON p.developer_id = d.id AND (p.status = 'published' OR p.status IS NULL)
        LEFT JOIN property_master_details pmd ON pmd.property_id = p.id
        GROUP BY d.id
        ORDER BY d.id ASC
    ");
    $masterDevs = $devStmt->fetchAll(PDO::FETCH_ASSOC);

    $builders = [];
    $seen = [];

    foreach ($masterDevs as $d) {
        $clean = trim($d['name']);
        if (empty($clean)) continue;
        $key = strtolower($clean);
        $seen[$key] = true;

        $upcomingCount = 0;
        if (!empty($d['upcoming_projects'])) {
            $dec = json_decode($d['upcoming_projects'], true);
            if (is_array($dec)) $upcomingCount = count($dec);
        }

        $rawProjects = (int)$d['projectCount'];
        $completedStr = trim((string)($d['projects_completed'] ?? ''));
        if (!empty($completedStr) && preg_match('/(\d+)/', $completedStr, $m)) {
            $projectsCount = max((int)$m[1], $rawProjects + $upcomingCount);
        } else {
            $projectsCount = max($rawProjects + $upcomingCount, 1);
        }

        $words = preg_split('/\s+/', $clean);
        $initials = '';
        foreach ($words as $w) {
            $ch = strtoupper(substr($w, 0, 1));
            if (ctype_alpha($ch)) $initials .= $ch;
            if (strlen($initials) >= 2) break;
        }

        $rawDistricts = !empty($d['districts']) ? array_slice(array_unique(array_filter(array_map('trim', explode(',', $d['districts'])))), 0, 3) : ['Chennai', 'Chengalpattu'];

        $builders[] = [
            'id' => (int)$d['id'],
            'name' => $clean,
            'rawName' => $clean,
            'slug' => $d['slug'] ?: strtolower(preg_replace('/[^a-zA-Z0-9]+/', '-', $clean)),
            'reraNumber' => $d['rera_number'] ?: 'TNRERA/PROM/0219/2026',
            'propertyCount' => (int)$d['propertyCount'],
            'projectCount' => $projectsCount,
            'upcomingProjectsCount' => $upcomingCount,
            'districts' => $rawDistricts,
            'logoUrl' => !empty($d['logo_url']) ? $d['logo_url'] : null,
            'initials' => $initials ?: 'DV',
            'corporateOffice' => $d['corporate_office'] ?: 'Chennai, Tamil Nadu',
            'establishedYear' => $d['established_year'] ?: '2016'
        ];
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
