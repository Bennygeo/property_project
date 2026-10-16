<?php
/**
 * POST /api/properties/upload.php
 * Handles direct image uploads for property listings.
 * Validates mime-types, file size, generates secure unique filenames,
 * and returns the relative asset URL.
 */

declare(strict_types=1);

require_once __DIR__ . '/../../helpers/response.php';

use Mannidam\Helpers\Response;

Response::initCors();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Method not allowed', 405);
}

// Target directory for uploaded property images
$uploadBaseDir = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'properties';
if (!is_dir($uploadBaseDir)) {
    if (!mkdir($uploadBaseDir, 0777, true) && !is_dir($uploadBaseDir)) {
        Response::error('Failed to create server upload directory', 500);
    }
}

// Check if any file was uploaded
$fileField = null;
if (isset($_FILES['file']) && is_array($_FILES['file'])) {
    $fileField = 'file';
} elseif (isset($_FILES['image']) && is_array($_FILES['image'])) {
    $fileField = 'image';
}

if (!$fileField) {
    Response::error('No file was uploaded in payload. Provide "file" or "image" field.', 400);
}

$uploadedFile = $_FILES[$fileField];

// If multiple files were uploaded in single key
if (is_array($uploadedFile['name'])) {
    $results = [];
    $count = count($uploadedFile['name']);
    
    for ($i = 0; $i < $count; $i++) {
        if ($uploadedFile['error'][$i] !== UPLOAD_ERR_OK) {
            continue;
        }

        $res = processSingleUpload(
            $uploadedFile['name'][$i],
            $uploadedFile['tmp_name'][$i],
            $uploadedFile['size'][$i],
            $uploadBaseDir
        );

        if ($res['success']) {
            $results[] = $res['data'];
        }
    }

    if (empty($results)) {
        Response::error('Failed to upload images or invalid format/size', 400);
    }

    Response::success([
        'images' => $results,
        'count'  => count($results)
    ], 'Images uploaded successfully');
} else {
    // Single file upload
    if ($uploadedFile['error'] !== UPLOAD_ERR_OK) {
        $errorCode = $uploadedFile['error'];
        $message = match ($errorCode) {
            UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'File exceeds maximum upload size limit',
            UPLOAD_ERR_PARTIAL => 'File was only partially uploaded',
            UPLOAD_ERR_NO_FILE => 'No file was uploaded',
            default => 'Server upload error code: ' . $errorCode
        };
        Response::error($message, 400);
    }

    $res = processSingleUpload(
        $uploadedFile['name'],
        $uploadedFile['tmp_name'],
        $uploadedFile['size'],
        $uploadBaseDir
    );

    if (!$res['success']) {
        Response::error($res['error'], 400);
    }

    Response::success($res['data'], 'Image uploaded successfully');
}

/**
 * Validate and save a single uploaded file
 */
function processSingleUpload(string $originalName, string $tmpPath, int $size, string $destDir): array {
    $maxBytes = 15 * 1024 * 1024; // 15MB max
    if ($size > $maxBytes) {
        return ['success' => false, 'error' => "File '{$originalName}' exceeds 15MB limit"];
    }

    if (!is_uploaded_file($tmpPath)) {
        return ['success' => false, 'error' => "Invalid uploaded file source"];
    }

    // Verify MIME type using finfo
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = $finfo->file($tmpPath);

    $allowedMimes = [
        'image/jpeg' => 'jpg',
        'image/jpg'  => 'jpg',
        'image/png'  => 'png',
        'image/webp' => 'webp',
        'image/gif'  => 'gif',
        'image/heic' => 'heic',
        'image/avif' => 'avif'
    ];

    if (!isset($allowedMimes[$mimeType])) {
        // Also check extension fallback for cameras that report octet-stream
        $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'avif'])) {
            return ['success' => false, 'error' => "File '{$originalName}' is not a supported image format. Allowed: JPG, PNG, WEBP, GIF, AVIF, HEIC."];
        }
    } else {
        $ext = $allowedMimes[$mimeType];
    }

    // Generate secure random filename
    $filename = 'prop_' . date('Ymd_His') . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
    $targetFilePath = $destDir . DIRECTORY_SEPARATOR . $filename;

    if (!move_uploaded_file($tmpPath, $targetFilePath)) {
        return ['success' => false, 'error' => "Failed to save uploaded file to disk"];
    }

    $relativeUrl = '/uploads/properties/' . $filename;
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost:8000';
    $fullUrl = $scheme . $host . $relativeUrl;

    return [
        'success' => true,
        'data' => [
            'url'          => $fullUrl,
            'relativeUrl'  => $relativeUrl,
            'fullUrl'      => $fullUrl,
            'filename'     => $filename,
            'originalName' => $originalName,
            'size'         => $size,
            'mimeType'     => $mimeType
        ]
    ];
}
