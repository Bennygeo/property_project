<?php
/**
 * Developer Projects Association API
 * Allows Super Admin and Authorized Developers to:
 * 1. View currently linked projects for a developer
 * 2. Search available unlinked master projects in the registry
 * 3. Link existing master projects to the developer (Method B)
 * 4. Unlink projects from the developer
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

use Mannidam\Config\Database;
use Mannidam\Helpers\Response;

try {
    $db = (new Database())->getConnection();
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    // -------------------------------------------------------------------------
    // GET: Query Linked and Available Projects for Developer
    // -------------------------------------------------------------------------
    if ($method === 'GET') {
        $devId = (int)($_GET['developer_id'] ?? $_GET['id'] ?? 0);
        $search = trim((string)($_GET['search'] ?? ''));

        if ($devId <= 0) {
            $availSql = "
                SELECT 
                    p.project_id,
                    p.project_name,
                    p.developer_id,
                    p.developer_name,
                    p.district,
                    p.city,
                    p.locality,
                    p.price_from,
                    p.status,
                    p.created_at
                FROM projects p
                WHERE 1=1
            ";
            $params = [];
            if (!empty($search)) {
                $availSql .= " AND (
                    LOWER(p.project_name) LIKE :q 
                    OR LOWER(p.project_id) LIKE :q 
                    OR LOWER(p.district) LIKE :q 
                    OR LOWER(p.city) LIKE :q 
                    OR LOWER(p.locality) LIKE :q
                )";
                $params[':q'] = '%' . strtolower($search) . '%';
            }
            $availSql .= " ORDER BY p.created_at DESC LIMIT 50";
            $availStmt = $db->prepare($availSql);
            $availStmt->execute($params);
            $availableProjects = $availStmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'data' => [
                    'developer'         => null,
                    'linkedCount'       => 0,
                    'linkedProjects'    => [],
                    'availableProjects' => $availableProjects
                ]
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // 1. Fetch Developer Name
        $devStmt = $db->prepare("SELECT id, name, slug FROM developers WHERE id = ?");
        $devStmt->execute([$devId]);
        $dev = $devStmt->fetch(PDO::FETCH_ASSOC);

        if (!$dev) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'Developer not found.'
            ]);
            exit;
        }

        $devName = trim($dev['name']);

        // 2. Fetch Linked Projects (linked by developer_id or exact developer_name)
        $linkedStmt = $db->prepare("
            SELECT 
                p.project_id,
                p.project_name,
                p.developer_id,
                p.developer_name,
                p.district,
                p.city,
                p.locality,
                p.category,
                p.type,
                p.price_from,
                p.price_to,
                p.sqft_rate,
                p.cover_image,
                p.status,
                p.created_at
            FROM projects p
            WHERE p.developer_id = :devId 
               OR (LOWER(TRIM(p.developer_name)) = LOWER(TRIM(:devName)) AND (p.developer_id IS NULL OR p.developer_id = 0))
            ORDER BY p.created_at DESC
        ");
        $linkedStmt->execute([
            ':devId'   => $devId,
            ':devName' => $devName
        ]);
        $linkedProjects = $linkedStmt->fetchAll(PDO::FETCH_ASSOC);

        // 3. Fetch Available Projects (unlinked or from other developers to reassign)
        $availSql = "
            SELECT 
                p.project_id,
                p.project_name,
                p.developer_id,
                p.developer_name,
                p.district,
                p.city,
                p.locality,
                p.price_from,
                p.status,
                p.created_at
            FROM projects p
            WHERE (p.developer_id != :devId OR p.developer_id IS NULL OR p.developer_id = 0)
              AND (p.developer_name != :devName OR p.developer_name IS NULL)
        ";

        $params = [
            ':devId'   => $devId,
            ':devName' => $devName
        ];

        if (!empty($search)) {
            $availSql .= " AND (
                LOWER(p.project_name) LIKE :q 
                OR LOWER(p.project_id) LIKE :q 
                OR LOWER(p.district) LIKE :q 
                OR LOWER(p.city) LIKE :q 
                OR LOWER(p.locality) LIKE :q
            )";
            $params[':q'] = '%' . strtolower($search) . '%';
        }

        $availSql .= " ORDER BY p.created_at DESC LIMIT 50";

        $availStmt = $db->prepare($availSql);
        $availStmt->execute($params);
        $availableProjects = $availStmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'data' => [
                'developer'          => $dev,
                'linkedCount'        => count($linkedProjects),
                'linkedProjects'     => $linkedProjects,
                'availableProjects'  => $availableProjects
            ]
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // -------------------------------------------------------------------------
    // POST: Link or Unlink Master Projects
    // -------------------------------------------------------------------------
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $action = trim((string)($input['action'] ?? 'link')); // 'link' or 'unlink'
        $devId = (int)($input['developerId'] ?? $input['developer_id'] ?? 0);
        $projectIds = $input['projectIds'] ?? $input['project_ids'] ?? [];

        if (!is_array($projectIds)) {
            $projectIds = !empty($projectIds) ? [$projectIds] : [];
        }

        if ($devId <= 0 || empty($projectIds)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'developerId and at least one project_id are required.'
            ]);
            exit;
        }

        // Fetch Developer Name
        $devStmt = $db->prepare("SELECT id, name FROM developers WHERE id = ?");
        $devStmt->execute([$devId]);
        $dev = $devStmt->fetch(PDO::FETCH_ASSOC);

        if (!$dev) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'Developer company not found.'
            ]);
            exit;
        }

        $devName = $dev['name'];

        if ($action === 'link') {
            $inClause = implode(',', array_fill(0, count($projectIds), '?'));
            
            // 1. Update projects table
            $upProj = $db->prepare("
                UPDATE projects 
                SET developer_id = ?, developer_name = ? 
                WHERE project_id IN ($inClause)
            ");
            $upProj->execute(array_merge([$devId, $devName], $projectIds));
            $affected = $upProj->rowCount();

            // 2. Keep property_master_details table in sync
            try {
                $upMaster = $db->prepare("
                    UPDATE property_master_details 
                    SET developer = ? 
                    WHERE property_id IN ($inClause)
                ");
                $upMaster->execute(array_merge([$devName], $projectIds));
            } catch (\Throwable $ignore) {}

            echo json_encode([
                'success'  => true,
                'message'  => "Successfully linked {$affected} project(s) to {$devName}.",
                'affected' => $affected
            ]);
            exit;
        }

        if ($action === 'unlink') {
            $inClause = implode(',', array_fill(0, count($projectIds), '?'));

            // Set developer_id to NULL and clear developer_name for these projects
            $upProj = $db->prepare("
                UPDATE projects 
                SET developer_id = NULL, developer_name = NULL 
                WHERE developer_id = ? AND project_id IN ($inClause)
            ");
            $upProj->execute(array_merge([$devId], $projectIds));
            $affected = $upProj->rowCount();

            // Clear in property_master_details
            try {
                $upMaster = $db->prepare("
                    UPDATE property_master_details 
                    SET developer = NULL 
                    WHERE property_id IN ($inClause)
                ");
                $upMaster->execute($projectIds);
            } catch (\Throwable $ignore) {}

            echo json_encode([
                'success'  => true,
                'message'  => "Successfully unlinked {$affected} project(s) from {$devName}.",
                'affected' => $affected
            ]);
            exit;
        }

        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => "Unknown action '{$action}'. Use 'link' or 'unlink'."
        ]);
        exit;
    }

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to process project linkage: ' . $e->getMessage()
    ]);
}

