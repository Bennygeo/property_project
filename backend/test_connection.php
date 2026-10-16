<?php
/**
 * Test Database Connection & Count Records
 * Run directly in CLI: "C:\xampp\php\php.exe backend/test_connection.php"
 * Or in browser: http://localhost/the-property-project/backend/test_connection.php
 */

declare(strict_types=1);

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/helpers/response.php';

use Mannidam\Config\Database;
use Mannidam\Helpers\Response;

Response::initCors();

try {
    $db = (new Database())->getConnection();
    
    // Check tables
    $tablesStmt = $db->query("SHOW TABLES");
    $tables = $tablesStmt->fetchAll(PDO::FETCH_COLUMN);

    $counts = [];
    foreach (['properties', 'cities', 'localities', 'property_media', 'users', 'recharge_packages'] as $t) {
        if (in_array($t, $tables, true)) {
            $c = $db->query("SELECT COUNT(*) FROM `{$t}`")->fetchColumn();
            $counts[$t] = (int)$c;
        } else {
            $counts[$t] = 'Table not created yet';
        }
    }

    Response::success([
        'connection' => 'SUCCESS',
        'database'   => 'mannidam_property_db',
        'tables'     => $tables,
        'recordCounts' => $counts
    ], 'MySQL database connection verified successfully');
} catch (\Throwable $e) {
    Response::error('Connection test failed', 500, $e->getMessage());
}
