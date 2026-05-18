<?php

require_once __DIR__ . '/bootstrap.php';

use FlowSync\Config\Database;
use FlowSync\Auth\AuthService;
use FlowSync\Utils\AuditLogger;

$auth = new AuthService();
$session = $auth->validateSession();

if (!$session) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized.']);
    exit;
}

$db = Database::getInstance()->getConnection();
$logger = new AuditLogger();
$userId = $session['user_id'];

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // If an ID is provided, fetch that user (if public), otherwise fetch own profile
    $targetId = $_GET['id'] ?? $userId;
    
    $stmt = $db->prepare("
        SELECT u.id, u.name, u.email, u.role_id, u.phone, u.bio, u.achievements, u.profile_pic, u.is_public, u.designation,
               r.name as role_name, d.name as department_name
        FROM users u
        JOIN roles r ON u.role_id = r.id
        LEFT JOIN departments d ON (u.role_id = 2 AND d.hod_id = u.id) 
                            OR (u.role_id = 3 AND EXISTS(SELECT 1 FROM faculty_departments fd WHERE fd.user_id = u.id AND fd.department_id = d.id))
        WHERE u.id = :id
        LIMIT 1
    ");
    // Note: The department join for faculty is a bit complex, might need refinement
    
    $stmt->execute(['id' => $targetId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'User not found.']);
        exit;
    }

    // Privacy check
    if ($targetId != $userId && $user['is_public'] == 0) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'This profile is private.']);
        exit;
    }

    // Parse achievements
    $user['achievements'] = $user['achievements'] ? json_decode($user['achievements'], true) : [];

    echo json_encode(['status' => 'success', 'data' => $user]);

} else if ($method === 'POST' || $method === 'PUT') {
    // Update profile
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Handle multipart if it's a file upload (POST)
    if (isset($_FILES['profile_pic'])) {
        $file = $_FILES['profile_pic'];
        $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
        $fileName = 'profile_' . $userId . '_' . time() . '.' . $ext;
        $uploadDir = __DIR__ . '/uploads/profiles/';
        
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }
        
        if (move_uploaded_file($file['tmp_name'], $uploadDir . $fileName)) {
            $profilePicUrl = 'uploads/profiles/' . $fileName;
            $stmt = $db->prepare("UPDATE users SET profile_pic = :pic WHERE id = :id");
            $stmt->execute(['pic' => $profilePicUrl, 'id' => $userId]);
            echo json_encode(['status' => 'success', 'message' => 'Profile picture updated.', 'url' => $profilePicUrl]);
            exit;
        } else {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Failed to upload profile picture.']);
            exit;
        }
    }

    // Standard field updates
    $updates = [];
    $params = ['id' => $userId];

    $allowedFields = ['name', 'phone', 'bio', 'achievements', 'is_public', 'designation'];
    
    foreach ($allowedFields as $field) {
        if (isset($data[$field])) {
            $val = $data[$field];
            if ($field === 'achievements') $val = json_encode($val);
            if ($field === 'is_public') $val = $val ? 1 : 0;
            
            $updates[] = "$field = :$field";
            $params[$field] = $val;
        }
    }

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'No fields to update.']);
        exit;
    }

    $sql = "UPDATE users SET " . implode(', ', $updates) . " WHERE id = :id";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    $logger->log($userId, 'UPDATE', 'USER', $userId, ['fields' => array_keys($data)]);

    echo json_encode(['status' => 'success', 'message' => 'Profile updated successfully.']);
}
