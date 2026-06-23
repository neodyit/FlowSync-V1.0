<?php
// test_push.php
error_reporting(E_ALL);
ini_set('display_errors', 1);

set_error_handler(function($errno, $errstr, $errfile, $errline) {
    echo "<b>Error:</b> [$errno] $errstr in $errfile on line $errline<br>";
});
set_exception_handler(function($exception) {
    echo "<b>Exception:</b> " . $exception->getMessage() . "<br>";
});

echo "Starting test...<br>";

// We need to figure out where we are.
$baseDir = __DIR__;
if (file_exists($baseDir . '/public/bootstrap.php')) {
    // If test_push is inside backend/
    $baseDir = $baseDir;
} else if (file_exists($baseDir . '/backend/public/bootstrap.php')) {
    // If test_push is in root
    $baseDir = $baseDir . '/backend';
} else if (file_exists($baseDir . '/../public/bootstrap.php')) {
    // If test_push is in backend/public/
    $baseDir = $baseDir . '/..';
}

echo "Using base directory: $baseDir<br>";

require_once $baseDir . '/public/bootstrap.php';
require_once $baseDir . '/src/Utils/FCMSender.php';

use FlowSync\Config\Database;

$db = Database::getInstance()->getConnection();
echo "Database connected.<br>";

$stmt = $db->query("SELECT id, name, fcm_token FROM users WHERE fcm_token IS NOT NULL AND fcm_token != '' LIMIT 1");
$user = $stmt->fetch();

if (!$user) {
    die("No user with an FCM token found in the database. Please log into the app first!<br>");
}

echo "Found user: {$user['name']} with token: {$user['fcm_token']}<br>";

$credPath = $baseDir . '/src/Utils/firebase_credentials.json';
if (!file_exists($credPath)) {
    die("Credentials file NOT FOUND at: $credPath<br>");
}

$sender = new \FlowSync\FCMSender($credPath);
$result = $sender->sendPushNotification(
    $user['fcm_token'], 
    "Test Push Notification", 
    "This is a manual test from FlowSync!",
    ['type' => 'TEST']
);

if ($result) {
    echo "SUCCESS! Push notification sent to Firebase.<br>";
} else {
    echo "FAILED to send push notification. Check the apache error.log for details.<br>";
}
