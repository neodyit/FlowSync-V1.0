<?php

require_once __DIR__ . '/bootstrap.php';

// Basic authentication check
$auth = new \FlowSync\Auth\AuthService();
$session = $auth->validateSession();

if (!$session) {
    http_response_code(401);
    die("Unauthorized");
}

$file = $_GET['file'] ?? null;
if (!$file) {
    http_response_code(400);
    die("Missing file parameter");
}

// Security: Prevent directory traversal
$baseDir = realpath(__DIR__ . DIRECTORY_SEPARATOR . 'uploads');
if (!$baseDir) {
    http_response_code(500);
    die("Server Error: Uploads directory not found");
}
$baseDir .= DIRECTORY_SEPARATOR;
$requestedPath = __DIR__ . DIRECTORY_SEPARATOR . $file;
$filePath = realpath($requestedPath);

if (!$filePath || !file_exists($filePath)) {
    http_response_code(404);
    die("File not found");
}

if (strpos($filePath, $baseDir) !== 0) {
    http_response_code(403);
    die("Forbidden: Access denied to this directory");
}

$fileName = basename($filePath);
$mimeType = mime_content_type($filePath);

// Force download headers
header('Content-Description: File Transfer');
header('Content-Type: ' . $mimeType);
header('Content-Disposition: attachment; filename="' . $fileName . '"');
header('Expires: 0');
header('Cache-Control: must-revalidate');
header('Pragma: public');
header('Content-Length: ' . filesize($filePath));

readfile($filePath);
exit;
