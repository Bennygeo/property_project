<?php
/**
 * /api/properties/draft.php
 * Progressive 7-Stage Property Listing Draft Persistence API.
 * Saves every stage to MySQL so users never lose progress on refresh/offline
 * and operations/sales teams have basic lead information for follow-up.
 *
 * Methods:
 *   GET  ?userId=...&sessionKey=...&draftId=...  -> Fetch latest in_progress draft
 *   POST { action: 'save' | 'mark_submitted' | 'discard', ... } -> Upsert / update draft
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

use Mannidam\Config\Database;
use Mannidam\Helpers\Response;

Response::initCors();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if (!in_array($method, ['GET', 'POST'], true)) {
    Response::error('Method not allowed', 405);
}

$db = (new Database())->getConnection();

// Ensure table exists automatically in both local and production databases
try {
    $db->exec("
        CREATE TABLE IF NOT EXISTS `property_submission_drafts` (
            `id` VARCHAR(64) NOT NULL,
            `user_id` INT(11) NULL DEFAULT NULL,
            `session_key` VARCHAR(100) NULL DEFAULT NULL,
            `user_name` VARCHAR(150) NULL DEFAULT NULL,
            `user_phone` VARCHAR(40) NULL DEFAULT NULL,
            `user_email` VARCHAR(150) NULL DEFAULT NULL,
            `project_name` VARCHAR(255) NULL DEFAULT NULL,
            `developer_name` VARCHAR(255) NULL DEFAULT NULL,
            `district` VARCHAR(120) NULL DEFAULT NULL,
            `locality` VARCHAR(150) NULL DEFAULT NULL,
            `contact_person_phone` VARCHAR(150) NULL DEFAULT NULL,
            `current_stage` TINYINT(2) NOT NULL DEFAULT 1,
            `highest_stage_reached` TINYINT(2) NOT NULL DEFAULT 1,
            `completion_percent` TINYINT(3) NOT NULL DEFAULT 0,
            `status` ENUM('in_progress', 'submitted', 'discarded') NOT NULL DEFAULT 'in_progress',
            `submitted_property_id` VARCHAR(64) NULL DEFAULT NULL,
            `payload_json` LONGTEXT NOT NULL,
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            KEY `idx_draft_user_status` (`user_id`, `status`, `updated_at`),
            KEY `idx_draft_session_status` (`session_key`, `status`, `updated_at`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
} catch (\Throwable $e) {
    error_log('property_submission_drafts table init error: ' . $e->getMessage());
    Response::error('Failed to initialize draft storage', 500);
}

if ($method === 'GET') {
    $draftId    = trim((string)($_GET['draftId'] ?? ''));
    $userId     = isset($_GET['userId']) ? (int)$_GET['userId'] : 0;
    $sessionKey = trim((string)($_GET['sessionKey'] ?? ''));

    $row = null;

    if ($draftId !== '') {
        $stmt = $db->prepare("
            SELECT * FROM property_submission_drafts
            WHERE id = :id AND status = 'in_progress'
            LIMIT 1
        ");
        $stmt->execute([':id' => $draftId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    if (!$row && $userId > 0) {
        $stmt = $db->prepare("
            SELECT * FROM property_submission_drafts
            WHERE user_id = :uid AND status = 'in_progress'
            ORDER BY updated_at DESC
            LIMIT 1
        ");
        $stmt->execute([':uid' => $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    if (!$row && $sessionKey !== '') {
        $stmt = $db->prepare("
            SELECT * FROM property_submission_drafts
            WHERE session_key = :sk AND status = 'in_progress'
            ORDER BY updated_at DESC
            LIMIT 1
        ");
        $stmt->execute([':sk' => $sessionKey]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    if (!$row) {
        Response::success(['draft' => null], 'No active draft found');
    }

    $payload = json_decode((string)$row['payload_json'], true);
    Response::success([
        'draft' => [
            'draftId'             => $row['id'],
            'userId'              => $row['user_id'] ? (int)$row['user_id'] : null,
            'sessionKey'          => $row['session_key'],
            'projectName'         => $row['project_name'],
            'developerName'       => $row['developer_name'],
            'district'            => $row['district'],
            'locality'            => $row['locality'],
            'contactPersonPhone'  => $row['contact_person_phone'],
            'currentStage'        => (int)$row['current_stage'],
            'highestStageReached' => (int)$row['highest_stage_reached'],
            'completionPercent'   => (int)$row['completion_percent'],
            'status'              => $row['status'],
            'updatedAt'           => $row['updated_at'],
            'payload'             => is_array($payload) ? $payload : null
        ]
    ], 'Active draft retrieved');
}

// POST handling (supports both application/json and navigator.sendBeacon text/plain JSON)
$rawBody = file_get_contents('php://input');
$input = json_decode($rawBody ?: '', true);
if (!is_array($input)) {
    Response::error('Invalid JSON payload', 400);
}

$action = trim((string)($input['action'] ?? 'save'));

if ($action === 'mark_submitted' || $action === 'discard') {
    $draftId = trim((string)($input['draftId'] ?? ''));
    if ($draftId === '') {
        Response::error('draftId is required', 400);
    }

    $stmt = $db->prepare("DELETE FROM property_submission_drafts WHERE id = :id");
    $stmt->execute([':id' => $draftId]);

    Response::success([
        'draftId' => $draftId,
        'deleted' => true,
        'action'  => $action
    ], 'Draft entry permanently removed');
}

// Default action: save / upsert stage progress
$draftId = trim((string)($input['draftId'] ?? ''));
if ($draftId === '') {
    $draftId = 'draft-' . bin2hex(random_bytes(6));
}

$userId              = isset($input['userId']) && (int)$input['userId'] > 0 ? (int)$input['userId'] : null;
$sessionKey          = trim((string)($input['sessionKey'] ?? '')) ?: null;
$userName            = trim((string)($input['userName'] ?? '')) ?: null;
$userPhone           = trim((string)($input['userPhone'] ?? '')) ?: null;
$userEmail           = trim((string)($input['userEmail'] ?? '')) ?: null;
$currentStage        = max(1, min(7, (int)($input['currentStage'] ?? 1)));
$highestStageReached = max($currentStage, min(7, (int)($input['highestStageReached'] ?? $currentStage)));
$completionPercent   = max(0, min(100, (int)($input['completionPercent'] ?? 0)));

$payloadData = $input['payload'] ?? [];
if (!is_array($payloadData)) {
    $payloadData = [];
}

$master = is_array($payloadData['master'] ?? null) ? $payloadData['master'] : [];
$form   = is_array($payloadData['form'] ?? null) ? $payloadData['form'] : [];

// Extract basic follow-up lead metadata so operations/sales can follow up easily
$projectName        = trim((string)($master['projectName'] ?? $form['title'] ?? '')) ?: null;
$developerName      = trim((string)($master['developer'] ?? '')) ?: null;
$district           = trim((string)($master['district'] ?? $master['city'] ?? $form['cityName'] ?? '')) ?: null;
$locality           = trim((string)($master['areaLocation'] ?? $master['villageLocality'] ?? $form['localityName'] ?? '')) ?: null;
$contactPersonPhone = trim((string)($master['contactPersonPhone'] ?? $master['whatsappNumber'] ?? $userPhone ?? '')) ?: null;

$payloadJson = json_encode($payloadData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if ($payloadJson === false) {
    $payloadJson = '{}';
}

$sql = "
    INSERT INTO property_submission_drafts (
        id, user_id, session_key, user_name, user_phone, user_email,
        project_name, developer_name, district, locality, contact_person_phone,
        current_stage, highest_stage_reached, completion_percent, status, payload_json
    ) VALUES (
        :id, :userId, :sessionKey, :userName, :userPhone, :userEmail,
        :projectName, :developerName, :district, :locality, :contactPersonPhone,
        :currentStage, :highestStageReached, :completionPercent, 'in_progress', :payloadJson
    ) ON DUPLICATE KEY UPDATE
        user_id               = COALESCE(VALUES(user_id), user_id),
        session_key           = COALESCE(VALUES(session_key), session_key),
        user_name             = COALESCE(VALUES(user_name), user_name),
        user_phone            = COALESCE(VALUES(user_phone), user_phone),
        user_email            = COALESCE(VALUES(user_email), user_email),
        project_name          = COALESCE(VALUES(project_name), project_name),
        developer_name        = COALESCE(VALUES(developer_name), developer_name),
        district              = COALESCE(VALUES(district), district),
        locality              = COALESCE(VALUES(locality), locality),
        contact_person_phone  = COALESCE(VALUES(contact_person_phone), contact_person_phone),
        current_stage         = VALUES(current_stage),
        highest_stage_reached = GREATEST(highest_stage_reached, VALUES(highest_stage_reached)),
        completion_percent    = VALUES(completion_percent),
        payload_json          = VALUES(payload_json),
        updated_at            = CURRENT_TIMESTAMP
";

$stmt = $db->prepare($sql);
$stmt->execute([
    ':id'                  => $draftId,
    ':userId'              => $userId,
    ':sessionKey'          => $sessionKey,
    ':userName'            => $userName,
    ':userPhone'           => $userPhone,
    ':userEmail'           => $userEmail,
    ':projectName'         => $projectName,
    ':developerName'       => $developerName,
    ':district'            => $district,
    ':locality'            => $locality,
    ':contactPersonPhone'  => $contactPersonPhone,
    ':currentStage'        => $currentStage,
    ':highestStageReached' => $highestStageReached,
    ':completionPercent'   => $completionPercent,
    ':payloadJson'         => $payloadJson
]);

Response::success([
    'draftId'           => $draftId,
    'currentStage'      => $currentStage,
    'completionPercent' => $completionPercent,
    'updatedAt'         => date('Y-m-d H:i:s')
], 'Property draft stage saved');
