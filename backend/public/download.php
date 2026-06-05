<?php

require_once __DIR__ . '/bootstrap.php';

// Basic authentication check
$auth = new \FlowSync\Auth\AuthService();
$session = $auth->validateSession();

if (!$session) {
    http_response_code(401);
    die("Unauthorized");
}

use FlowSync\Config\Database;
$db = Database::getInstance()->getConnection();

// Query user information
$userQuery = $db->prepare("SELECT college_id, role_id FROM users WHERE id = :uid LIMIT 1");
$userQuery->execute(['uid' => $session['user_id']]);
$userRow = $userQuery->fetch(PDO::FETCH_ASSOC);

if (!$userRow) {
    http_response_code(401);
    die("User not found");
}

$userCollegeId = (int)$userRow['college_id'];
$userRoleId = (int)$userRow['role_id'];

$file = $_GET['file'] ?? null;
$fileId = $_GET['id'] ?? $_GET['file_id'] ?? null;

$attachment = null;

// Unwrap potential nested download.php?file= URLs from frontend string manipulation
if ($file && preg_match('/download\.php\?file=(.+)$/i', $file, $matches)) {
    $file = urldecode($matches[1]);
}

if ($fileId) {
    // Lookup by ID
    $stmt = $db->prepare("
        SELECT a.id as attachment_id, a.original_name, a.stored_name, a.task_id, a.institution_id, 
               t.assigned_by_id, t.department_id, t.college_id
        FROM attachments a
        JOIN tasks t ON a.task_id = t.id
        WHERE a.id = :id
        LIMIT 1
    ");
    $stmt->execute(['id' => $fileId]);
    $attachment = $stmt->fetch(PDO::FETCH_ASSOC);
} elseif ($file && strpos($file, 'tasks_data/') === 0) {
    // Lookup task attachment by stored name
    $storedName = basename($file);
    $stmt = $db->prepare("
        SELECT a.id as attachment_id, a.original_name, a.stored_name, a.task_id, a.institution_id, 
               t.assigned_by_id, t.department_id, t.college_id
        FROM attachments a
        JOIN tasks t ON a.task_id = t.id
        WHERE a.stored_name = :stored_name
        LIMIT 1
    ");
    $stmt->execute(['stored_name' => $storedName]);
    $attachment = $stmt->fetch(PDO::FETCH_ASSOC);
}

// 1. Handle Task Attachment Downloads
if ($attachment) {
    // Institutional boundaries validation
    if ($userCollegeId !== (int)$attachment['institution_id']) {
        http_response_code(403);
        die("Forbidden: Access denied to other colleges' files.");
    }

    // Role-based access validation
    if ($userRoleId === 1) {
        // Admin: Allow access
    } elseif ($userRoleId === 2) {
        // HOD: Verify HOD belongs to the same department as the task
        $deptStmt = $db->prepare("SELECT id FROM departments WHERE hod_id = :hod_id AND id = :dept_id LIMIT 1");
        $deptStmt->execute(['hod_id' => $session['user_id'], 'dept_id' => $attachment['department_id']]);
        if (!$deptStmt->fetch()) {
            http_response_code(403);
            die("Forbidden: Access denied to tasks outside your department.");
        }
    } elseif ($userRoleId === 3) {
        // Faculty: Verify faculty is assigned to the task, or created the task
        $assignedStmt = $db->prepare("
            SELECT status FROM task_assignments 
            WHERE task_id = :tid AND user_id = :uid 
            LIMIT 1
        ");
        $assignedStmt->execute(['tid' => $attachment['task_id'], 'uid' => $session['user_id']]);
        $isAssigned = $assignedStmt->fetch();

        $isCreator = ((int)$attachment['assigned_by_id'] === $session['user_id']);

        if (!$isAssigned && !$isCreator) {
            http_response_code(403);
            die("Forbidden: Access denied to unassigned tasks.");
        }
    } else {
        http_response_code(403);
        die("Forbidden: Unknown role.");
    }

    // Get College short_name for path resolution
    $shortNameStmt = $db->prepare("SELECT short_name FROM colleges WHERE id = :cid LIMIT 1");
    $shortNameStmt->execute(['cid' => $attachment['institution_id']]);
    $shortName = trim($shortNameStmt->fetchColumn());

    $filePath = __DIR__ . '/../storage/tasks_data/' . $shortName . '/task_' . $attachment['task_id'] . '/' . $attachment['stored_name'];
    $fileName = $attachment['original_name'];

    if (!file_exists($filePath)) {
        http_response_code(404);
        die("File not found on disk");
    }

    // Audit Log every attachment access
    $logStmt = $db->prepare("
        INSERT INTO file_downloads_audit (user_id, institution_id, task_id, file_name, ip_address)
        VALUES (:uid, :inst_id, :tid, :fname, :ip)
    ");
    $logStmt->execute([
        'uid' => $session['user_id'],
        'inst_id' => $attachment['institution_id'],
        'tid' => $attachment['task_id'],
        'fname' => $fileName,
        'ip' => $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'
    ]);

} else {
    // 2. Handle Non-Task File Access (Profiles or Push Notices)
    if (!$file) {
        http_response_code(400);
        die("Missing file parameter");
    }

    $fileName = basename($file);
    if (strpos($file, 'profiles/') === 0) {
        $filePath = __DIR__ . '/../storage/profiles/' . $fileName;
    } elseif (strpos($file, 'push_notices/') === 0) {
        $filePath = __DIR__ . '/../storage/push_notices/' . $fileName;
    } else {
        http_response_code(403);
        die("Forbidden: Invalid file path request");
    }

    if (!file_exists($filePath)) {
        http_response_code(404);
        die("File not found");
    }
}
// Stream the file with matching headers
$mimeType = mime_content_type($filePath);
$disposition = isset($_GET['inline']) ? 'inline' : 'attachment';

header('Content-Description: File Transfer');
header('Content-Type: ' . $mimeType);
header('Content-Disposition: ' . $disposition . '; filename="' . $fileName . '"');
header('Expires: 0');
header('Cache-Control: must-revalidate');
header('Pragma: public');
header('Content-Length: ' . filesize($filePath));

readfile($filePath);
exit;
