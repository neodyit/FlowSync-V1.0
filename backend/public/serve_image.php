<?php
/**
 * Lightweight image serving endpoint.

 * Usage: serve_image.php?file=profiles/filename.jpg
 */

// Minimal env loading for CORS only
function loadEnvMinimal($path) {
    if (!file_exists($path)) return;
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        $parts = explode('=', $line, 2);
        if (count($parts) === 2) {
            putenv(trim($parts[0]) . '=' . trim($parts[1]));
        }
    }
}

loadEnvMinimal(__DIR__ . '/../.env');

// Minimal CORS handling for image requests
$allowedOriginsStr = getenv('ALLOWED_ORIGINS') ?: 'https://flowsync.neodyit.in';
$allowedOrigins = array_map('trim', explode(',', $allowedOriginsStr));
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

$isAllowed = in_array($origin, $allowedOrigins);
$appEnv = getenv('APP_ENV') ?: 'development';

if (!$isAllowed && !empty($origin) && !in_array($appEnv, ['production', 'testing'])) {
    $parsedUrl = parse_url($origin);
    if (isset($parsedUrl['host'])) {
        $host = $parsedUrl['host'];
        if ($host === 'localhost' || $host === '127.0.0.1' || $host === '::1') {
            $isAllowed = true;
        } elseif (filter_var($host, FILTER_VALIDATE_IP)) {
            $isPrivate = !filter_var(
                $host,
                FILTER_VALIDATE_IP,
                FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
            );
            if ($isPrivate) {
                $isAllowed = true;
            }
        }
    }
}

if ($isAllowed) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Validate input
$file = $_GET['file'] ?? null;
if (!$file) {
    http_response_code(400);
    die("Missing file parameter");
}

// Only allow serving from profiles/ and push_notices/ directories
$fileName = basename($file);
if (strpos($file, 'profiles/') === 0) {
    $filePath = __DIR__ . '/../storage/profiles/' . $fileName;
} elseif (strpos($file, 'push_notices/') === 0) {
    $filePath = __DIR__ . '/../storage/push_notices/' . $fileName;
} else {
    http_response_code(403);
    die("Forbidden");
}

// Prevent path traversal
$realStorageRoot = realpath(__DIR__ . '/../storage');
$realFilePath = realpath($filePath);

if ($realFilePath === false || strpos($realFilePath, $realStorageRoot) !== 0) {
    http_response_code(403);
    die("Forbidden");
}

if (!file_exists($filePath)) {
    http_response_code(404);
    die("Not found");
}

// Serve with strong caching headers (images rarely change)
$mimeType = mime_content_type($filePath);
$lastModified = filemtime($filePath);
$etag = md5($filePath . $lastModified);

// Handle conditional requests (304 Not Modified)
if (isset($_SERVER['HTTP_IF_NONE_MATCH']) && trim($_SERVER['HTTP_IF_NONE_MATCH']) === $etag) {
    http_response_code(304);
    exit;
}

if (isset($_SERVER['HTTP_IF_MODIFIED_SINCE']) && strtotime($_SERVER['HTTP_IF_MODIFIED_SINCE']) >= $lastModified) {
    http_response_code(304);
    exit;
}

header('Content-Type: ' . $mimeType);
header('Content-Length: ' . filesize($filePath));
header('Cache-Control: public, max-age=86400, immutable');
header('ETag: ' . $etag);
header('Last-Modified: ' . gmdate('D, d M Y H:i:s', $lastModified) . ' GMT');
header('Expires: ' . gmdate('D, d M Y H:i:s', time() + 86400) . ' GMT');

readfile($filePath);
exit;
