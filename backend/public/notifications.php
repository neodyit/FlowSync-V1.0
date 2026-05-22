<?php

use FlowSync\Config\Database;

try {
    require_once __DIR__ . '/bootstrap.php';

    $db = Database::getInstance()->getConnection();
    $auth = new \FlowSync\Auth\AuthService();
    $session = $auth->validateSession();

    if (!$session) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
        exit;
    }

    $userId = $session['user_id'];

    // Update user's last active timestamp
    $stmt = $db->prepare("UPDATE users SET last_active_at = NOW() WHERE id = :uid");
    $stmt->execute(['uid' => $userId]);

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Fetch notifications: BOTH READ AND UNREAD and ONLY LATEST 3 DAYS
        $stmt = $db->prepare("
            SELECT n.*, u.name as trigger_user_name, t.title as task_title, n.title, n.points, n.is_actioned
            FROM notifications n
            LEFT JOIN users u ON n.trigger_user_id = u.id
            LEFT JOIN tasks t ON n.task_id = t.id
            WHERE n.user_id = :user_id 
            AND n.created_at >= DATE_SUB(NOW(), INTERVAL 3 DAY)
            ORDER BY n.created_at DESC
            LIMIT 50
        ");
        $stmt->execute(['user_id' => $userId]);
        $notifications = $stmt->fetchAll();

        // Count unread
        $stmt = $db->prepare("SELECT COUNT(*) as unread FROM notifications WHERE user_id = :user_id AND is_read = 0 AND created_at >= DATE_SUB(NOW(), INTERVAL 3 DAY)");
        $stmt->execute(['user_id' => $userId]);
        $unreadCount = $stmt->fetch()['unread'];

        // Fetch User Info for Role and Dept (supporting both faculty_departments and departments tables)
        $stmt = $db->prepare("
            SELECT COALESCE(fd.department_id, d.id) as department_id, u.role_id 
            FROM users u 
            LEFT JOIN faculty_departments fd ON u.id = fd.user_id 
            LEFT JOIN departments d ON u.id = d.hod_id
            WHERE u.id = :user_id
            LIMIT 1
        ");
        $stmt->execute(['user_id' => $userId]);
        $user = $stmt->fetch();

        // Fetch Most Urgent Active Task
        $activeTask = null;
        if ($user) {
            $taskQuery = "";
            $params = [];
            
            if ($user['role_id'] == 2) { // HOD
                $taskQuery = "
                    SELECT title, status, deadline 
                    FROM tasks 
                    WHERE department_id = :dept_id 
                    AND status NOT IN ('Completed', 'Approved', 'Rejected', 'Expired', 'Draft')
                    ORDER BY deadline ASC 
                    LIMIT 1
                ";
                $params = ['dept_id' => $user['department_id']];
            } else if ($user['role_id'] == 3) { // Faculty
                $taskQuery = "
                    SELECT title, status, deadline 
                    FROM tasks 
                    WHERE assigned_to_id = :user_id 
                    AND status NOT IN ('Completed', 'Approved', 'Rejected', 'Expired', 'Draft')
                    ORDER BY deadline ASC 
                    LIMIT 1
                ";
                $params = ['user_id' => $userId];
            }

            if ($taskQuery) {
                $stmt = $db->prepare($taskQuery);
                $stmt->execute($params);
                $activeTask = $stmt->fetch();
            }
        }

        // Fetch User settings for notifications
        $stmt = $db->prepare("
            SELECT notification_settings, quiet_hours_start, quiet_hours_end
            FROM users 
            WHERE id = :user_id
        ");
        $stmt->execute(['user_id' => $userId]);
        $userSettings = $stmt->fetch();

        echo json_encode([
            'status' => 'success',
            'data' => [
                'notifications' => $notifications,
                'unread_count' => (int)$unreadCount,
                'active_task' => $activeTask,
                'settings' => $userSettings
            ]
        ]);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        // Toggle read/unread or mark all read
        $json = file_get_contents('php://input');
        $data = json_decode($json, true);
        $notifId = $data['id'] ?? null;
        $isRead = $data['is_read'] ?? 1;

        if ($notifId) {
            $claimPoints = $data['claim_points'] ?? false;
            if ($claimPoints) {
                // Check if notification is HOD_PUSH and points can be claimed
                $checkStmt = $db->prepare("SELECT type, points, is_actioned FROM notifications WHERE id = :id AND user_id = :user_id");
                $checkStmt->execute(['id' => $notifId, 'user_id' => $userId]);
                $notif = $checkStmt->fetch();

                if ($notif && $notif['type'] === 'HOD_PUSH' && $notif['is_actioned'] == 0 && $notif['points'] > 0) {
                    $db->beginTransaction();
                    try {
                        // Mark actioned and read
                        $updateStmt = $db->prepare("UPDATE notifications SET is_read = 1, is_actioned = 1 WHERE id = :id");
                        $updateStmt->execute(['id' => $notifId]);

                        // Add points
                        $pointsStmt = $db->prepare("UPDATE leaderboard_points SET total_points = total_points + :points WHERE user_id = :user_id");
                        $pointsStmt->execute(['points' => $notif['points'], 'user_id' => $userId]);
                        
                        $db->commit();
                        echo json_encode(['status' => 'success', 'message' => 'Points claimed successfully!', 'points_awarded' => $notif['points']]);
                        exit;
                    } catch (Exception $e) {
                        $db->rollBack();
                        throw $e;
                    }
                }
            }

            $stmt = $db->prepare("UPDATE notifications SET is_read = :is_read WHERE id = :id AND user_id = :user_id");
            $stmt->execute(['id' => $notifId, 'user_id' => $userId, 'is_read' => $isRead]);
        } else {
            // Mark all as read
            $stmt = $db->prepare("UPDATE notifications SET is_read = 1 WHERE user_id = :user_id");
            $stmt->execute(['user_id' => $userId]);
        }
        echo json_encode(['status' => 'success', 'message' => 'Notification status updated']);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        // Delete a specific notification or all notifications
        $notifId = $_GET['id'] ?? null;

        if ($notifId) {
            $stmt = $db->prepare("DELETE FROM notifications WHERE id = :id AND user_id = :user_id");
            $stmt->execute(['id' => $notifId, 'user_id' => $userId]);
        } else {
            // Delete all for this user
            $stmt = $db->prepare("DELETE FROM notifications WHERE user_id = :user_id");
            $stmt->execute(['user_id' => $userId]);
        }
        echo json_encode(['status' => 'success', 'message' => 'Notification(s) deleted']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
