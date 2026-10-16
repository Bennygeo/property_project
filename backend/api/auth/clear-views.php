<?php
/**
 * POST /api/auth/clear-views.php
 * Clears browsing/view history for a user.
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

use Mannidam\Config\Database;
use Mannidam\Helpers\Response;

Response::initCors();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Method not allowed', 405);
}

$input = Response::getJsonInput();
$userId = (int)($input['userId'] ?? $_POST['userId'] ?? $_GET['userId'] ?? 1);

if ($userId <= 0) {
    Response::error('Invalid user ID', 422);
}

$db = (new Database())->getConnection();

$stmt = $db->prepare("DELETE FROM user_view_history WHERE user_id = ?");
$stmt->execute([$userId]);

Response::success([
    'userId'  => $userId,
    'cleared' => true
], 'Browsing history cleared successfully');
