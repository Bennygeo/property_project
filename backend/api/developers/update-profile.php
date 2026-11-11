<?php
/**
 * Developer Profile & Company Customization API
 * Allows authorized developer to customize company branding, logo, RERA number, upcoming projects, etc.
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
use Mannidam\Helpers\Response;

try {
    $db = (new Database())->getConnection();
    $input = json_decode(file_get_contents('php://input'), true) ?? [];

    $userId = (int)($input['userId'] ?? 0);
    $developerId = (int)($input['developerId'] ?? $input['id'] ?? 0);

    if ($developerId <= 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Developer company ID is required.'
        ]);
        exit;
    }

    // 1. Authorisation Check
    if ($userId > 0) {
        $uStmt = $db->prepare("SELECT id, role, developer_id FROM users WHERE id = ?");
        $uStmt->execute([$userId]);
        $user = $uStmt->fetch(PDO::FETCH_ASSOC);

        if ($user) {
            $role = $user['role'] ?? 'buyer';
            $userDevId = (int)($user['developer_id'] ?? 0);

            // If role is developer, they can ONLY update their assigned developer_id
            if ($role === 'developer' && $userDevId !== $developerId) {
                http_response_code(403);
                echo json_encode([
                    'success' => false,
                    'message' => 'Security Violation: You are not authorized to modify another developer company.'
                ]);
                exit;
            }
        }
    }

    // 2. Fetch Existing Developer Record
    $checkStmt = $db->prepare("SELECT * FROM developers WHERE id = ?");
    $checkStmt->execute([$developerId]);
    $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);

    if (!$existing) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Developer company not found.'
        ]);
        exit;
    }

    // 3. Prepare Updates
    $name = trim((string)($input['name'] ?? $existing['name']));
    $reraNumber = trim((string)($input['reraNumber'] ?? $input['rera_number'] ?? $existing['rera_number']));
    $logoUrl = trim((string)($input['logoUrl'] ?? $input['logo_url'] ?? $existing['logo_url']));
    $coverImageUrl = trim((string)($input['coverImageUrl'] ?? $input['cover_image_url'] ?? $existing['cover_image_url']));
    $corporateOffice = trim((string)($input['corporateOffice'] ?? $input['corporate_office'] ?? $existing['corporate_office']));
    $contactEmail = trim((string)($input['contactEmail'] ?? $input['contact_email'] ?? $existing['contact_email']));
    $contactPhone = trim((string)($input['contactPhone'] ?? $input['contact_phone'] ?? $existing['contact_phone']));
    $websiteUrl = trim((string)($input['websiteUrl'] ?? $input['website_url'] ?? $existing['website_url']));
    $aboutText = trim((string)($input['about'] ?? $input['about_text'] ?? $existing['about_text']));
    $establishedYear = trim((string)($input['establishedYear'] ?? $input['established_year'] ?? $existing['established_year']));
    $projectsCompleted = trim((string)($input['projectsCompleted'] ?? $input['projects_completed'] ?? $existing['projects_completed']));
    $deliveredSqFt = trim((string)($input['deliveredSqFt'] ?? $input['delivered_sqft'] ?? $existing['delivered_sqft']));

    // Handle upcoming_projects JSON
    $upcomingJson = $existing['upcoming_projects'];
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

    // If company name was updated, keep property_master_details.developer in sync
    if (!empty($name) && $name !== $existing['name']) {
        $db->prepare("UPDATE property_master_details SET developer = ? WHERE developer = ?")->execute([$name, $existing['name']]);
    }

    echo json_encode([
        'success' => true,
        'message' => 'Developer company profile customized successfully',
        'data' => [
            'id' => $developerId,
            'name' => $name,
            'reraNumber' => $reraNumber,
            'logoUrl' => $logoUrl,
            'coverImageUrl' => $coverImageUrl,
            'corporateOffice' => $corporateOffice,
            'contactEmail' => $contactEmail,
            'contactPhone' => $contactPhone,
            'websiteUrl' => $websiteUrl,
            'about' => $aboutText,
            'establishedYear' => $establishedYear,
            'projectsCompleted' => $projectsCompleted,
            'deliveredSqFt' => $deliveredSqFt,
            'upcomingProjects' => !empty($upcomingJson) ? json_decode($upcomingJson, true) : []
        ]
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to update developer profile: ' . $e->getMessage()
    ]);
}

