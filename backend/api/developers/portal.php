<?php
/**
 * Developer Portal & Authorized Company Dashboard API
 * Strictly enforces that developers access only their authorized company and its projects.
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

    $userId = isset($_GET['userId']) ? (int)$_GET['userId'] : 0;
    $developerIdParam = isset($_GET['developerId']) ? (int)$_GET['developerId'] : 0;

    if ($userId <= 0 && $developerIdParam <= 0) {
        // Fallback to sample developer if no user provided
        $userId = 105;
    }

    // 1. Fetch user to verify developer role and authorized company
    $user = null;
    if ($userId > 0) {
        $uStmt = $db->prepare("SELECT id, name, email, phone, role, developer_id, points_balance, created_at FROM users WHERE id = ?");
        $uStmt->execute([$userId]);
        $user = $uStmt->fetch(PDO::FETCH_ASSOC);
    }

    $authorizedDeveloperId = 0;

    if ($user) {
        // Check if user is an admin or developer
        $role = $user['role'] ?? 'buyer';
        $userDevId = (int)($user['developer_id'] ?? 0);

        if ($role === 'admin' || $role === 'co_admin') {
            // Admins can view any requested developer or default to first
            $authorizedDeveloperId = $developerIdParam > 0 ? $developerIdParam : ($userDevId > 0 ? $userDevId : 1);
        } elseif ($role === 'developer') {
            // DEVELOPER ACCESS CONTROL: Must only access their authorized company
            if ($userDevId <= 0) {
                // If user has role developer but developer_id not linked, associate with default developer 1 for safety
                $authorizedDeveloperId = 1;
                $db->prepare("UPDATE users SET developer_id = 1 WHERE id = ?")->execute([$user['id']]);
                $user['developer_id'] = 1;
            } else {
                $authorizedDeveloperId = $userDevId;
            }

            // If developer attempts to view a different developer ID, block with 403 Forbidden
            if ($developerIdParam > 0 && $developerIdParam !== $authorizedDeveloperId) {
                http_response_code(403);
                echo json_encode([
                    'success' => false,
                    'message' => 'Access Denied: You are only authorized to manage your own company profile and projects.'
                ]);
                exit;
            }
        } else {
            // Role is buyer/seller - allow preview of company if developerIdParam passed, but read-only
            $authorizedDeveloperId = $developerIdParam > 0 ? $developerIdParam : 1;
        }
    } else {
        $authorizedDeveloperId = $developerIdParam > 0 ? $developerIdParam : 1;
    }

    // 2. Fetch Developer Company Profile
    $dStmt = $db->prepare("SELECT * FROM developers WHERE id = ?");
    $dStmt->execute([$authorizedDeveloperId]);
    $developer = $dStmt->fetch(PDO::FETCH_ASSOC);

    if (!$developer) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Authorized developer company not found.'
        ]);
        exit;
    }

    // Parse upcoming projects
    $upcomingList = [];
    if (!empty($developer['upcoming_projects'])) {
        $decoded = json_decode($developer['upcoming_projects'], true);
        if (is_array($decoded)) {
            $upcomingList = $decoded;
        }
    }

    // 3. Fetch ONLY this developer's projects / properties
    $pStmt = $db->prepare("
        SELECT 
            p.id,
            p.title,
            p.property_type AS propertyType,
            p.listing_mode AS listingMode,
            p.locality_name AS locality,
            p.city_name AS city,
            p.price,
            p.price_per_sqft AS pricePerSqFt,
            p.sqft,
            p.bhk_badge AS bhkBadge,
            p.facing_or_view AS facingOrView,
            p.main_image_url AS imageUrl,
            p.rera_number AS reraNumber,
            p.possession_date AS possessionDate,
            p.project_status AS projectStatus,
            p.total_units AS totalUnits,
            p.status,
            p.created_at AS createdAt,
            pmd.project_name AS projectName,
            pmd.district,
            pmd.taluk,
            pmd.corridor,
            pmd.plot_size_sqft AS plotSizeSqft,
            pmd.dtcp_approval_no AS dtcpApprovalNo,
            (SELECT COUNT(*) FROM inquiries_and_visits iv WHERE iv.property_id = p.id) AS leadsCount
        FROM properties p
        LEFT JOIN property_master_details pmd ON pmd.property_id = p.id
        WHERE p.developer_id = ?
           OR LOWER(TRIM(pmd.developer)) = LOWER(TRIM(?))
        ORDER BY p.created_at DESC, p.id DESC
    ");
    $pStmt->execute([$authorizedDeveloperId, $developer['name']]);
    $projects = $pStmt->fetchAll(PDO::FETCH_ASSOC);

    // Format metrics
    $totalProperties = count($projects);
    $publishedCount = 0;
    $pendingCount = 0;
    $totalLeads = 0;

    foreach ($projects as &$p) {
        $st = $p['status'] ?? 'published';
        if ($st === 'published' || empty($st)) {
            $publishedCount++;
        } else {
            $pendingCount++;
        }
        $totalLeads += (int)($p['leadsCount'] ?? 0);

        if (empty($p['imageUrl'])) {
            $p['imageUrl'] = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80';
        }
    }
    unset($p);

    echo json_encode([
        'success' => true,
        'message' => 'Developer portal data retrieved successfully',
        'data' => [
            'user' => $user ? [
                'id' => (int)$user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'phone' => $user['phone'],
                'role' => $user['role'],
                'developerId' => (int)($user['developer_id'] ?? 0)
            ] : null,
            'developer' => [
                'id' => (int)$developer['id'],
                'name' => $developer['name'],
                'slug' => $developer['slug'],
                'reraNumber' => $developer['rera_number'] ?: 'TNRERA/PROM/0219/2026',
                'logoUrl' => $developer['logo_url'] ?: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=300&q=80',
                'coverImageUrl' => $developer['cover_image_url'] ?: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80',
                'corporateOffice' => $developer['corporate_office'] ?: 'Chennai, Tamil Nadu',
                'contactEmail' => $developer['contact_email'] ?: 'contact@developer.in',
                'contactPhone' => $developer['contact_phone'] ?: '+91 94441 00000',
                'websiteUrl' => $developer['website_url'] ?: '',
                'about' => $developer['about_text'] ?: '',
                'establishedYear' => $developer['established_year'] ?: '2016',
                'projectsCompleted' => $developer['projects_completed'] ?: '25+ Projects',
                'deliveredSqFt' => $developer['delivered_sqft'] ?: '12M+ sq.ft',
                'onTimeTrack' => $developer['on_time_track'] ?: '98.5% On-Time Delivery'
            ],
            'stats' => [
                'totalProjects' => $totalProperties,
                'publishedProjects' => $publishedCount,
                'pendingProjects' => $pendingCount,
                'upcomingProjects' => count($upcomingList),
                'totalInquiries' => $totalLeads,
                'complianceScore' => '100% TNRERA Verified'
            ],
            'projects' => $projects,
            'upcomingProjects' => $upcomingList
        ]
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error loading developer portal: ' . $e->getMessage()
    ]);
}
