<?php
/**
 * Developer Profile & Company Creation / Customization API
 * - Creating a new developer entity (even with 0 projects) is strictly restricted to Super Admin.
 * - Authorized Developers and Admins can customize existing developer branding, RERA, etc.
 * - Optionally link existing master projects via linkProjectIds.
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if (($_SERVER['REQUEST_METHOD'] ?? 'POST') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

use Mannidam\Config\Database;

function generateUniqueDeveloperSlug(PDO $db, string $name): string {
    $baseSlug = strtolower(trim(preg_replace('/[^a-zA-Z0-9]+/', '-', $name), '-'));
    if (empty($baseSlug)) {
        $baseSlug = 'developer';
    }
    $slug = $baseSlug;
    $counter = 2;
    $check = $db->prepare("SELECT id FROM developers WHERE slug = ? LIMIT 1");
    while (true) {
        $check->execute([$slug]);
        if (!$check->fetch()) {
            return $slug;
        }
        $slug = $baseSlug . '-' . $counter;
        $counter++;
    }
}

try {
    $db = (new Database())->getConnection();
    $input = json_decode(file_get_contents('php://input'), true) ?? [];

    $userId = (int)($input['userId'] ?? 0);
    $developerId = (int)($input['developerId'] ?? $input['id'] ?? 0);
    $createNew = !empty($input['createNew']) || $developerId === 0;
    $inputName = trim((string)($input['name'] ?? ''));
    $userRole = strtolower(trim((string)($input['userRole'] ?? '')));
    $isSuperAdmin = in_array($userRole, ['admin', 'super_admin'], true)
        || (!empty($input['isAdmin']) && empty($userRole));
    $isAdmin = $isSuperAdmin || in_array($userRole, ['co_admin', 'content_gis_admin'], true);
    $isDeveloperRole = $userRole === 'developer';

    // 1. Authorization Check (verify database users.role when $userId > 0 so developer users cannot spoof Super Admin)
    if ($userId > 0) {
        $uStmt = $db->prepare("SELECT id, role, developer_id FROM users WHERE id = ?");
        $uStmt->execute([$userId]);
        $user = $uStmt->fetch(PDO::FETCH_ASSOC);

        if ($user) {
            $dbRole = strtolower(trim((string)($user['role'] ?? 'buyer')));
            if (in_array($dbRole, ['admin', 'super_admin'], true)) {
                $isSuperAdmin = true;
                $isAdmin = true;
                $isDeveloperRole = false;
            } elseif (in_array($dbRole, ['co_admin', 'content_gis_admin'], true)) {
                $isSuperAdmin = false;
                $isAdmin = true;
                $isDeveloperRole = false;
            } elseif ($dbRole === 'developer') {
                $isSuperAdmin = false;
                $isAdmin = false;
                $isDeveloperRole = true;
                $userDevId = (int)($user['developer_id'] ?? 0);
                // Ensure developer can only update their assigned company
                if (!$createNew && $userDevId > 0 && $developerId > 0 && $userDevId !== $developerId) {
                    http_response_code(403);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Security Violation: You are not authorized to modify another developer company.'
                    ]);
                    exit;
                }
            } else {
                $isSuperAdmin = false;
                $isAdmin = false;
            }
        }
    }

    if (!empty($input['createNew']) && !$isSuperAdmin) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'Access Denied: Only Super Admin can create new developers.'
        ]);
        exit;
    }

    // 2. Fetch Existing Developer Record or Create New
    $existing = null;
    if ($developerId > 0 && empty($input['createNew'])) {
        $checkStmt = $db->prepare("SELECT * FROM developers WHERE id = ?");
        $checkStmt->execute([$developerId]);
        $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);
    }

    if (!$existing && !empty($inputName)) {
        $checkNameStmt = $db->prepare("SELECT * FROM developers WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1");
        $checkNameStmt->execute([$inputName]);
        $nameMatch = $checkNameStmt->fetch(PDO::FETCH_ASSOC);

        if ($nameMatch && !empty($input['createNew'])) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'A developer company with this name already exists.'
            ]);
            exit;
        }
        if ($nameMatch) {
            $existing = $nameMatch;
            $developerId = (int)$existing['id'];
        }
    }

    $wasCreated = false;
    if (!$existing) {
        if (!$isSuperAdmin) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'Access Denied: Only Super Admin can create new developers.'
            ]);
            exit;
        }
        if (empty($inputName)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Developer company name is required.'
            ]);
            exit;
        }

        $newSlug = generateUniqueDeveloperSlug($db, $inputName);
        $insStmt = $db->prepare("INSERT INTO developers (name, slug) VALUES (?, ?)");
        $insStmt->execute([$inputName, $newSlug]);
        $developerId = (int)$db->lastInsertId();
        $wasCreated = true;

        $checkStmt = $db->prepare("SELECT * FROM developers WHERE id = ?");
        $checkStmt->execute([$developerId]);
        $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);

        // Link newly created developer to the creating developer user session if applicable
        if ($isDeveloperRole && $userId > 0) {
            try {
                $db->prepare("UPDATE users SET developer_id = ? WHERE id = ?")->execute([$developerId, $userId]);
            } catch (\Throwable $ignore) {}
        }
    }

    // 3. Prepare Updates
    $name = trim((string)($input['name'] ?? $existing['name']));
    $reraNumber = trim((string)($input['reraNumber'] ?? $input['rera_number'] ?? ($existing['rera_number'] ?? '')));
    $logoUrl = trim((string)($input['logoUrl'] ?? $input['logo_url'] ?? ($existing['logo_url'] ?? '')));
    $coverImageUrl = trim((string)($input['coverImageUrl'] ?? $input['cover_image_url'] ?? ($existing['cover_image_url'] ?? '')));
    $corporateOffice = trim((string)($input['corporateOffice'] ?? $input['corporate_office'] ?? ($existing['corporate_office'] ?? '')));
    $contactEmail = trim((string)($input['contactEmail'] ?? $input['contact_email'] ?? ($existing['contact_email'] ?? '')));
    $contactPhone = trim((string)($input['contactPhone'] ?? $input['contact_phone'] ?? ($existing['contact_phone'] ?? '')));
    $websiteUrl = trim((string)($input['websiteUrl'] ?? $input['website_url'] ?? ($existing['website_url'] ?? '')));
    $aboutText = trim((string)($input['about'] ?? $input['about_text'] ?? ($existing['about_text'] ?? '')));
    $establishedYear = trim((string)($input['establishedYear'] ?? $input['established_year'] ?? ($existing['established_year'] ?? '')));
    $projectsCompleted = trim((string)($input['projectsCompleted'] ?? $input['projects_completed'] ?? ($existing['projects_completed'] ?? '')));
    $deliveredSqFt = trim((string)($input['deliveredSqFt'] ?? $input['delivered_sqft'] ?? ($existing['delivered_sqft'] ?? '')));
    $bgGradient = trim((string)($input['bgGradient'] ?? $input['bg_gradient'] ?? ($existing['bg_gradient'] ?? '')));

    // Handle upcoming_projects JSON
    $upcomingJson = $existing['upcoming_projects'] ?? '[]';
    if (isset($input['upcomingProjects']) || isset($input['upcoming_projects'])) {
        $rawUpcoming = $input['upcomingProjects'] ?? $input['upcoming_projects'];
        if (is_array($rawUpcoming)) {
            $upcomingJson = json_encode($rawUpcoming, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        } elseif (is_string($rawUpcoming)) {
            $upcomingJson = $rawUpcoming;
        }
    }

    $updateStmt = $db->prepare("
        UPDATE developers SET
            name = ?,
            rera_number = ?,
            logo_url = ?,
            cover_image_url = ?,
            bg_gradient = ?,
            corporate_office = ?,
            contact_email = ?,
            contact_phone = ?,
            website_url = ?,
            about_text = ?,
            established_year = ?,
            projects_completed = ?,
            delivered_sqft = ?,
            upcoming_projects = ?
        WHERE id = ?
    ");

    $updateStmt->execute([
        $name,
        $reraNumber,
        $logoUrl,
        $coverImageUrl,
        $bgGradient,
        $corporateOffice,
        $contactEmail,
        $contactPhone,
        $websiteUrl,
        $aboutText,
        $establishedYear,
        $projectsCompleted,
        $deliveredSqFt,
        $upcomingJson,
        $developerId
    ]);

    // Keep projects and master details in sync for existing projects
    if ($developerId > 0) {
        $db->prepare("UPDATE projects SET developer_name = ?, developer_id = ? WHERE developer_id = ? OR LOWER(TRIM(developer_name)) = LOWER(TRIM(?))")
           ->execute([$name, $developerId, $developerId, $existing['name']]);
    }
    if (!empty($name) && $name !== $existing['name']) {
        try {
            $db->prepare("UPDATE property_master_details SET developer = ? WHERE developer = ?")->execute([$name, $existing['name']]);
        } catch (\Throwable $ignore) {}
    }

    // 4. Optional initial project linking (linkProjectIds)
    $linkedCount = 0;
    $linkProjectIds = $input['linkProjectIds'] ?? $input['link_project_ids'] ?? [];
    if (is_array($linkProjectIds) && count($linkProjectIds) > 0 && $developerId > 0) {
        $cleanIds = array_values(array_filter(array_map('strval', $linkProjectIds), fn($v) => trim($v) !== ''));
        if (count($cleanIds) > 0) {
            $inClause = implode(',', array_fill(0, count($cleanIds), '?'));
            $upLink = $db->prepare("
                UPDATE projects
                SET developer_id = ?, developer_name = ?
                WHERE project_id IN ($inClause)
            ");
            $upLink->execute(array_merge([$developerId, $name], $cleanIds));
            $linkedCount = $upLink->rowCount();

            try {
                $upMaster = $db->prepare("
                    UPDATE property_master_details
                    SET developer = ?
                    WHERE property_id IN ($inClause)
                ");
                $upMaster->execute(array_merge([$name], $cleanIds));
            } catch (\Throwable $ignore) {}
        }
    }

    echo json_encode([
        'success' => true,
        'message' => $wasCreated
            ? 'Developer company created successfully'
            : 'Developer company profile customized successfully',
        'created' => $wasCreated,
        'linkedCount' => $linkedCount,
        'data' => [
            'id' => $developerId,
            'name' => $name,
            'slug' => $existing['slug'] ?? '',
            'reraNumber' => $reraNumber,
            'logoUrl' => $logoUrl,
            'coverImageUrl' => $coverImageUrl,
            'bgGradient' => $bgGradient,
            'corporateOffice' => $corporateOffice,
            'contactEmail' => $contactEmail,
            'contactPhone' => $contactPhone,
            'websiteUrl' => $websiteUrl,
            'about' => $aboutText,
            'establishedYear' => $establishedYear,
            'projectsCompleted' => $projectsCompleted,
            'deliveredSqFt' => $deliveredSqFt,
            'upcomingProjects' => !empty($upcomingJson) ? json_decode((string)$upcomingJson, true) : []
        ]
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to update developer profile: ' . $e->getMessage()
    ]);
}
