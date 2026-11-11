<?php
/**
 * /api/analytics/heartbeat.php
 * Real-time visitor presence & online heartbeat tracking.
 * Receives ping from active client browsers every 45-60 seconds or on page load.
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

use Mannidam\Config\Database;
use Mannidam\Helpers\Response;

Response::initCors();

function resolveClientIp(): string {
    $headers = [
        'HTTP_CF_CONNECTING_IP',
        'HTTP_X_FORWARDED_FOR',
        'HTTP_X_REAL_IP',
        'REMOTE_ADDR'
    ];
    foreach ($headers as $header) {
        if (!empty($_SERVER[$header])) {
            $parts = explode(',', (string)$_SERVER[$header]);
            $ip = trim($parts[0]);
            if (filter_var($ip, FILTER_VALIDATE_IP)) {
                return $ip;
            }
        }
    }
    return (string)($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');
}

$clientIp = resolveClientIp();
$userAgent = substr((string)($_SERVER['HTTP_USER_AGENT'] ?? 'Unknown Browser'), 0, 250);

$raw = file_get_contents('php://input');
$input = !empty($raw) ? json_decode($raw, true) : [];

$sessionId = trim((string)($input['sessionId'] ?? $_GET['sessionId'] ?? ''));
if (empty($sessionId)) {
    $sessionId = 'sess_' . bin2hex(random_bytes(16));
}

$userPhone = trim((string)($input['userPhone'] ?? $_GET['userPhone'] ?? ''));
$pageUrl = trim((string)($input['pageUrl'] ?? $_GET['pageUrl'] ?? '/'));
if (empty($pageUrl)) {
    $pageUrl = '/';
}

$db = (new Database())->getConnection();

// Upsert active visitor session
$stmt = $db->prepare("
    INSERT INTO active_visitor_sessions (session_id, ip_address, user_phone, page_url, user_agent, created_at, last_heartbeat)
    VALUES (?, ?, ?, ?, ?, NOW(), NOW())
    ON DUPLICATE KEY UPDATE
        last_heartbeat = NOW(),
        page_url = VALUES(page_url),
        user_phone = CASE WHEN VALUES(user_phone) != '' THEN VALUES(user_phone) ELSE user_phone END,
        ip_address = VALUES(ip_address)
");
$stmt->execute([$sessionId, $clientIp, $userPhone ?: null, $pageUrl, $userAgent]);

// Optional housekeeping: delete sessions dead for more than 24 hours
if (random_int(1, 100) <= 5) {
    $db->query("DELETE FROM active_visitor_sessions WHERE last_heartbeat < (NOW() - INTERVAL 24 HOUR)");
}

// Calculate true online users (active in the last 3 minutes)
$onlineStmt = $db->query("
    SELECT COUNT(DISTINCT session_id) AS online_count
    FROM active_visitor_sessions
    WHERE last_heartbeat >= (NOW() - INTERVAL 3 MINUTE)
");
$onlineCount = (int)($onlineStmt->fetchColumn() ?: 1);

Response::success([
    'sessionId'   => $sessionId,
    'onlineUsers' => $onlineCount,
    'timestamp'   => date('Y-m-d H:i:s')
], 'Heartbeat received');
