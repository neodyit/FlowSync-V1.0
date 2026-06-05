<?php
/**
 * FlowSync Storage & Database Data Migration Script
 * Run this script BEFORE running the SQL migration script on Production to migrate files and database fields safely.
 */

require_once __DIR__ . '/public/bootstrap.php';

use FlowSync\Config\Database;
$db = Database::getInstance()->getConnection();

echo "Starting FlowSync Storage Migration...\n";

// Set base paths
$publicUploadsDir = __DIR__ . '/public/uploads';
$storageDir = __DIR__ . '/storage';

// Ensure new storage directories exist
$storageDirs = [
    $storageDir,
    $storageDir . '/profiles',
    $storageDir . '/push_notices',
    $storageDir . '/tasks_data'
];
foreach ($storageDirs as $dir) {
    if (!file_exists($dir)) {
        mkdir($dir, 0777, true);
        echo "Created directory: {$dir}\n";
    }
}

$db->beginTransaction();

try {
    // -------------------------------------------------------------
    // 1. Migrate Task Attachments
    // -------------------------------------------------------------
    echo "\nMigrating Task Attachments...\n";
    
    // Check if the old columns exist to migrate them
    $columnsCheck = $db->query("SHOW COLUMNS FROM attachments");
    $columns = $columnsCheck->fetchAll(PDO::FETCH_COLUMN);
    
    $hasFilePath = in_array('file_path', $columns);
    $hasFileName = in_array('file_name', $columns);
    $hasEntityId = in_array('entity_id', $columns);
    
    if ($hasFilePath) {
        // Prepare temporary columns if they do not exist yet on target DB
        if (!in_array('stored_name', $columns)) {
            $db->exec("ALTER TABLE attachments ADD COLUMN stored_name VARCHAR(255) NULL AFTER " . ($hasFileName ? "file_name" : "original_name"));
            echo "Added temporary stored_name column to attachments table.\n";
        }
        if (!in_array('institution_id', $columns)) {
            $db->exec("ALTER TABLE attachments ADD COLUMN institution_id INT NULL AFTER " . ($hasEntityId ? "entity_id" : "task_id"));
            echo "Added temporary institution_id column to attachments table.\n";
        }
        
        $taskIdCol = $hasEntityId ? 'entity_id' : 'task_id';
        $fileNameCol = $hasFileName ? 'file_name' : 'original_name';
        
        $stmt = $db->query("SELECT id, {$fileNameCol} as file_name, file_path, {$taskIdCol} as task_id FROM attachments WHERE file_path IS NOT NULL");
        $attachments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo "Found " . count($attachments) . " task attachments to migrate.\n";
        
        foreach ($attachments as $att) {
            $oldFilePath = __DIR__ . '/public/' . $att['file_path'];
            $taskId = $att['task_id'];
            
            // Get Task's College/Institution info
            $taskStmt = $db->prepare("
                SELECT t.college_id, c.short_name 
                FROM tasks t 
                JOIN colleges c ON t.college_id = c.id 
                WHERE t.id = :tid 
                LIMIT 1
            ");
            $taskStmt->execute(['tid' => $taskId]);
            $task = $taskStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$task) {
                echo "Warning: Task ID {$taskId} for Attachment ID {$att['id']} not found. Skipping file move.\n";
                continue;
            }
            
            $collegeId = $task['college_id'];
            $shortName = trim($task['short_name']);
            $storedName = basename($att['file_path']);
            
            // Build new path
            $targetDir = $storageDir . '/tasks_data/' . $shortName . '/task_' . $taskId;
            if (!file_exists($targetDir)) {
                mkdir($targetDir, 0777, true);
            }
            $newFilePath = $targetDir . '/' . $storedName;
            
            if (file_exists($oldFilePath)) {
                if (rename($oldFilePath, $newFilePath)) {
                    echo "Moved attachment: {$storedName} -> {$shortName}/task_{$taskId}/\n";
                } else {
                    echo "Error: Failed to move attachment file: {$oldFilePath}\n";
                }
            } else {
                echo "Notice: Physical file not found at {$oldFilePath}. Only updating database.\n";
            }
            
            // Update the record with metadata
            $updateStmt = $db->prepare("UPDATE attachments SET stored_name = :sname, institution_id = :inst_id WHERE id = :id");
            $updateStmt->execute([
                'sname' => $storedName,
                'inst_id' => $collegeId,
                'id' => $att['id']
            ]);
        }
    } else {
        echo "No 'file_path' column found. Task attachments already migrated.\n";
    }

    // -------------------------------------------------------------
    // 2. Migrate User Profile Pictures
    // -------------------------------------------------------------
    echo "\nMigrating User Profile Pictures...\n";
    
    $userStmt = $db->query("SELECT id, profile_pic FROM users WHERE profile_pic LIKE 'uploads/profiles/%'");
    $users = $userStmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Found " . count($users) . " profile pictures to migrate.\n";
    
    foreach ($users as $user) {
        $oldPicPath = __DIR__ . '/public/' . $user['profile_pic'];
        $fileName = basename($user['profile_pic']);
        $newPicPath = $storageDir . '/profiles/' . $fileName;
        
        if (file_exists($oldPicPath)) {
            if (rename($oldPicPath, $newPicPath)) {
                echo "Moved profile pic: {$fileName}\n";
            } else {
                echo "Error: Failed to move profile pic: {$oldPicPath}\n";
            }
        }
        
        // Update database to route through download.php
        $newDbPic = 'download.php?file=profiles/' . $fileName;
        $upUserStmt = $db->prepare("UPDATE users SET profile_pic = :pic WHERE id = :id");
        $upUserStmt->execute(['pic' => $newDbPic, 'id' => $user['id']]);
    }

    // -------------------------------------------------------------
    // 3. Migrate Push Notification Attachments
    // -------------------------------------------------------------
    echo "\nMigrating Push Notification Attachments...\n";
    
    // Check push_notices
    $noticeStmt = $db->query("SELECT id, attachment_url FROM push_notices WHERE attachment_url LIKE '%/uploads/push_notices/%' OR attachment_url LIKE 'uploads/push_notices/%'");
    $notices = $noticeStmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Found " . count($notices) . " push notice attachments to migrate.\n";
    
    foreach ($notices as $notice) {
        $oldUrlPath = ltrim($notice['attachment_url'], '/');
        $oldFilePath = __DIR__ . '/public/' . $oldUrlPath;
        $fileName = basename($notice['attachment_url']);
        $newFilePath = $storageDir . '/push_notices/' . $fileName;
        
        if (file_exists($oldFilePath)) {
            if (rename($oldFilePath, $newFilePath)) {
                echo "Moved push notice attachment: {$fileName}\n";
            } else {
                echo "Error: Failed to move push notice attachment: {$oldFilePath}\n";
            }
        }
        
        $newUrl = '/download.php?file=push_notices/' . $fileName;
        $upNotice = $db->prepare("UPDATE push_notices SET attachment_url = :url WHERE id = :id");
        $upNotice->execute(['url' => $newUrl, 'id' => $notice['id']]);
    }
    
    // Check notifications table as well
    $notifStmt = $db->query("SELECT id, attachment_url FROM notifications WHERE attachment_url LIKE '%/uploads/push_notices/%' OR attachment_url LIKE 'uploads/push_notices/%'");
    $notifications = $notifStmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($notifications as $n) {
        $fileName = basename($n['attachment_url']);
        $newUrl = '/download.php?file=push_notices/' . $fileName;
        $upNotif = $db->prepare("UPDATE notifications SET attachment_url = :url WHERE id = :id");
        $upNotif->execute(['url' => $newUrl, 'id' => $n['id']]);
    }

    $db->commit();
    echo "\nMigration completed successfully!\n";
    
} catch (Throwable $e) {
    $db->rollBack();
    echo "\nMigration failed: " . $e->getMessage() . "\n";
    exit(1);
}
