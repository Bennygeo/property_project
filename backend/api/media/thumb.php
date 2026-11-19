<?php
/**
 * GET /api/media/thumb.php?f=properties/filename.png&w=400
 * On-the-fly cached WebP image resizer for uploaded property & developer images.
 * Cuts 1.6MB–2.7MB PNGs down to ~5–30KB WebP with 1-year immutable caching.
 */

declare(strict_types=1);

$rawFile = (string)($_GET['f'] ?? '');
$reqWidth = (int)($_GET['w'] ?? 640);
$reqWidth = max(64, min(1600, $reqWidth));

// Strict path sanitization: disallow traversal, null bytes, or weird characters
$cleanFile = ltrim(str_replace(['\\', "\0"], '/', $rawFile), '/');
if ($cleanFile === '' || strpos($cleanFile, '..') !== false || !preg_match('/^[a-zA-Z0-9_\-\/\.]+$/', $cleanFile)) {
    http_response_code(400);
    exit('Invalid file parameter');
}

$uploadsRoot = realpath(__DIR__ . '/../../uploads');
if ($uploadsRoot === false) {
    http_response_code(404);
    exit('Uploads root not found');
}

$srcPath = realpath($uploadsRoot . DIRECTORY_SEPARATOR . $cleanFile);
if ($srcPath === false || strpos($srcPath, $uploadsRoot) !== 0 || !is_file($srcPath)) {
    http_response_code(404);
    exit('Image not found');
}

$ext = strtolower(pathinfo($srcPath, PATHINFO_EXTENSION));
$mimeMap = [
    'png'  => 'image/png',
    'jpg'  => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'webp' => 'image/webp',
    'gif'  => 'image/gif',
];

if (!isset($mimeMap[$ext])) {
    http_response_code(415);
    exit('Unsupported image type');
}

// Long-lived immutable cache headers
header('Cache-Control: public, max-age=31536000, immutable');
header('Vary: Accept');

// If GD is not available on this server, stream the original image cleanly
if (!extension_loaded('gd')) {
    header('Content-Type: ' . $mimeMap[$ext]);
    header('Content-Length: ' . filesize($srcPath));
    readfile($srcPath);
    exit;
}

$supportsWebp = function_exists('imagewebp') && strpos((string)($_SERVER['HTTP_ACCEPT'] ?? ''), 'image/webp') !== false;
$outExt = $supportsWebp ? 'webp' : ($ext === 'png' ? 'png' : 'jpg');
$outMime = $supportsWebp ? 'image/webp' : ($outExt === 'png' ? 'image/png' : 'image/jpeg');

$cacheDir = $uploadsRoot . DIRECTORY_SEPARATOR . '_cache';
if (!is_dir($cacheDir)) {
    @mkdir($cacheDir, 0755, true);
}

$cacheKey = md5($srcPath . '|' . filemtime($srcPath) . '|' . $reqWidth . '|' . $outExt);
$cachePath = $cacheDir . DIRECTORY_SEPARATOR . $cacheKey . '.' . $outExt;

if (is_file($cachePath)) {
    header('Content-Type: ' . $outMime);
    header('Content-Length: ' . filesize($cachePath));
    readfile($cachePath);
    exit;
}

// Load source image
$srcImg = null;
if ($ext === 'png') {
    $srcImg = @imagecreatefrompng($srcPath);
} elseif ($ext === 'jpg' || $ext === 'jpeg') {
    $srcImg = @imagecreatefromjpeg($srcPath);
} elseif ($ext === 'webp' && function_exists('imagecreatefromwebp')) {
    $srcImg = @imagecreatefromwebp($srcPath);
} elseif ($ext === 'gif') {
    $srcImg = @imagecreatefromgif($srcPath);
}

if (!$srcImg) {
    header('Content-Type: ' . $mimeMap[$ext]);
    header('Content-Length: ' . filesize($srcPath));
    readfile($srcPath);
    exit;
}

$origW = imagesx($srcImg);
$origH = imagesy($srcImg);
$targetW = ($origW > $reqWidth) ? $reqWidth : $origW;
$targetH = (int)max(1, round($origH * ($targetW / max(1, $origW))));

$dstImg = imagecreatetruecolor($targetW, $targetH);
imagealphablending($dstImg, false);
imagesavealpha($dstImg, true);
$transparent = imagecolorallocatealpha($dstImg, 0, 0, 0, 127);
imagefilledrectangle($dstImg, 0, 0, $targetW, $targetH, $transparent);

imagecopyresampled($dstImg, $srcImg, 0, 0, 0, 0, $targetW, $targetH, $origW, $origH);
imagedestroy($srcImg);

$saved = false;
if ($supportsWebp) {
    $saved = @imagewebp($dstImg, $cachePath, 78);
} elseif ($outExt === 'png') {
    $saved = @imagepng($dstImg, $cachePath, 8);
} else {
    $saved = @imagejpeg($dstImg, $cachePath, 78);
}

if ($saved && is_file($cachePath)) {
    imagedestroy($dstImg);
    header('Content-Type: ' . $outMime);
    header('Content-Length: ' . filesize($cachePath));
    readfile($cachePath);
    exit;
}

// Fallback: output directly if cache directory isn't writable
header('Content-Type: ' . $outMime);
if ($supportsWebp) {
    imagewebp($dstImg, null, 78);
} elseif ($outExt === 'png') {
    imagepng($dstImg, null, 8);
} else {
    imagejpeg($dstImg, null, 78);
}
imagedestroy($dstImg);
