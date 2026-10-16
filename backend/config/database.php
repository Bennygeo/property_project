<?php
/**
 * Mannidam Real Estate Marketplace - Database Connection Manager
 * Utilizes PDO with UTF-8 support and prepared statements.
 */

declare(strict_types=1);

namespace Mannidam\Config;

use PDO;
use PDOException;

class Database {
    // Default XAMPP settings (User can override via environment variables or edits)
    private string $host;
    private string $dbName;
    private string $username;
    private string $password;
    private string $charset;
    private ?PDO $connection = null;

    public function __construct() {
        $this->host     = $_ENV['DB_HOST'] ?? '127.0.0.1';
        $this->dbName   = $_ENV['DB_NAME'] ?? 'mannidam_property_db';
        $this->username = $_ENV['DB_USER'] ?? 'root';
        $this->password = $_ENV['DB_PASS'] ?? '';
        $this->charset  = 'utf8mb4';
    }

    /**
     * Get a singleton PDO connection instance.
     */
    public function getConnection(): PDO {
        if ($this->connection !== null) {
            return $this->connection;
        }

        $dsn = "mysql:host={$this->host};dbname={$this->dbName};charset={$this->charset}";

        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES {$this->charset} COLLATE utf8mb4_unicode_ci",
        ];

        try {
            $this->connection = new PDO($dsn, $this->username, $this->password, $options);
            return $this->connection;
        } catch (PDOException $e) {
            http_response_code(500);
            header('Content-Type: application/json; charset=UTF-8');
            echo json_encode([
                'success' => false,
                'error'   => 'Database connection failed. Please ensure MySQL is running.',
                'details' => $e->getMessage()
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
            exit;
        }
    }
}
