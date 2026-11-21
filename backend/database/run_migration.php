<?php
/**
 * Mannidam Real Estate Registry - Database Migration Runner
 * 
 * Executes `latest_prod_migration_20261121.sql` on the configured MySQL database.
 * 
 * Usage via CLI:
 *   php backend/database/run_migration.php
 * 
 * Usage via Browser:
 *   http://localhost/backend/database/run_migration.php?token=prod_migrate_2026
 */

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

use Mannidam\Config\Database;
use Mannidam\Helpers\Response;

Response::initCors();

// Security token for web execution
$token = $_GET['token'] ?? '';
$isCli = (php_sapi_name() === 'cli');

if (!$isCli && $token !== 'prod_migrate_2026') {
    Response::error('Unauthorized: Pass ?token=prod_migrate_2026 to execute migration', 403);
    exit;
}

try {
    $db = (new Database())->getConnection();
    $sqlFile = __DIR__ . '/latest_prod_migration_20261121.sql';

    if (!file_exists($sqlFile)) {
        throw new \Exception("Migration SQL file not found at: {$sqlFile}");
    }

    $sqlContent = file_get_contents($sqlFile);
    if (empty($sqlContent)) {
        throw new \Exception("Migration SQL file is empty.");
    }

    // Execute the SQL multi-statement block
    $db->setAttribute(PDO::ATTR_EMULATE_PREPARES, true);
    $db->exec($sqlContent);

    // Verify presence of updated tables
    $tables = [
        'lead_callbacks',
        'sales_lead_interactions',
        'lead_stage_history',
        'user_site_visits',
        'guest_device_views',
        'user_view_history'
    ];

    $status = [];
    foreach ($tables as $table) {
        $check = $db->query("SHOW TABLES LIKE '{$table}'")->fetchColumn();
        if ($check) {
            $count = (int)$db->query("SELECT COUNT(*) FROM `{$table}`")->fetchColumn();
            $status[$table] = "PRESENT ({$count} rows)";
        } else {
            $status[$table] = "MISSING";
        }
    }

    $msg = "Latest database migration (November 2026 delta) executed successfully.";
    if ($isCli) {
        echo "====================================================\n";
        echo " [SUCCESS] {$msg}\n";
        echo "====================================================\n";
        foreach ($status as $tbl => $st) {
            echo " - {$tbl}: {$st}\n";
        }
        echo "\n";
    } else {
        Response::success([
            'message' => $msg,
            'tableStatus' => $status
        ], $msg);
    }
} catch (\Throwable $e) {
    if ($isCli) {
        echo "====================================================\n";
        echo " [ERROR] Migration failed: " . $e->getMessage() . "\n";
        echo "====================================================\n";
        exit(1);
    } else {
        Response::error('Migration execution failed', 500, $e->getMessage());
    }
}
