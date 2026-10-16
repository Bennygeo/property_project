<?php
/**
 * Mannidam Real Estate Marketplace - API Response & CORS Helper
 */

declare(strict_types=1);

namespace Mannidam\Helpers;

class Response {
    /**
     * Set standard CORS and content headers for JSON API.
     */
    public static function initCors(): void {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
        header('Content-Type: application/json; charset=UTF-8');

        // Handle preflight OPTIONS request
        if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
            http_response_code(200);
            exit;
        }
    }

    /**
     * Send standard success JSON payload.
     */
    public static function success(mixed $data = null, string $message = 'Success', array $meta = [], int $statusCode = 200): void {
        http_response_code($statusCode);
        $payload = [
            'success' => true,
            'message' => $message,
            'data'    => $data,
        ];
        if (!empty($meta)) {
            $payload['meta'] = $meta;
        }
        echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    /**
     * Send standard error JSON payload.
     */
    public static function error(string $message = 'An error occurred', int $statusCode = 400, mixed $details = null): void {
        http_response_code($statusCode);
        $payload = [
            'success' => false,
            'error'   => $message,
        ];
        if ($details !== null) {
            $payload['details'] = $details;
        }
        echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    /**
     * Parse incoming JSON body for POST/PUT requests.
     */
    public static function getJsonInput(): array {
        $raw = file_get_contents('php://input');
        if (empty($raw)) {
            return [];
        }
        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }
}
