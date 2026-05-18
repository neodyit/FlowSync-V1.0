<?php

namespace FlowSync\Utils;

use FlowSync\Config\Database;
use PDO;

class NotificationService {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    /**
     * Send a notification to a specific user
     */
    public function send($userId, $type, $message, $taskId = null, $triggerUserId = null) {
        try {
            $stmt = $this->db->prepare("
                INSERT INTO notifications (user_id, type, message, task_id, trigger_user_id, is_read) 
                VALUES (:user_id, :type, :message, :task_id, :trigger_id, 0)
            ");
            $stmt->execute([
                'user_id' => $userId,
                'type' => $type,
                'message' => $message,
                'task_id' => $taskId,
                'trigger_id' => $triggerUserId
            ]);
            return true;
        } catch (\Exception $e) {
            error_log("Notification failed: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Notify HOD of a department
     */
    public function notifyHOD($departmentId, $type, $message, $taskId = null, $triggerUserId = null) {
        // Find HOD for this department
        $stmt = $this->db->prepare("SELECT hod_id FROM departments WHERE id = :dept_id LIMIT 1");
        $stmt->execute(['dept_id' => $departmentId]);
        $dept = $stmt->fetch();

        if ($dept && $dept['hod_id']) {
            return $this->send($dept['hod_id'], $type, $message, $taskId, $triggerUserId);
        }
        return false;
    }
}
