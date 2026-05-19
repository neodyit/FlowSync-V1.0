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
            // 1. Fetch user's settings and email
            $stmt = $this->db->prepare("
                SELECT email, name, notification_settings 
                FROM users 
                WHERE id = :user_id LIMIT 1
            ");
            $stmt->execute(['user_id' => $userId]);
            $recipient = $stmt->fetch();

            // 2. Insert notification row into database
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

            // 3. If recipient exists, simulate dynamic SMTP dispatching based on preferences
            if ($recipient) {
                $email = $recipient['email'];
                $name = $recipient['name'];
                $notifSettings = $recipient['notification_settings'];
                
                if (is_string($notifSettings)) {
                    $notifSettings = json_decode($notifSettings, true);
                }
                
                if (!is_array($notifSettings)) {
                    $notifSettings = [
                        'email_assignments' => true,
                        'email_evaluations' => true,
                        'browser_alerts' => true,
                        'broadcast_alerts' => true
                    ];
                }

                $shouldSendEmail = false;
                $subject = "FlowSync Notification Update";
                
                if ($type === 'TASK_REVIEWED') {
                    if (!isset($notifSettings['email_evaluations']) || $notifSettings['email_evaluations'] === true) {
                        $shouldSendEmail = true;
                        $subject = "FlowSync Alert: Task Submission Evaluated";
                    }
                } elseif ($type === 'TASK_COMMENT') {
                    if (!isset($notifSettings['email_assignments']) || $notifSettings['email_assignments'] === true) {
                        $shouldSendEmail = true;
                        $subject = "FlowSync Alert: New Comment on Task";
                    }
                } else {
                    if (!isset($notifSettings['email_assignments']) || $notifSettings['email_assignments'] === true) {
                        $shouldSendEmail = true;
                        $subject = "FlowSync Alert: Task priority Update";
                    }
                }

                if ($shouldSendEmail) {
                    $this->logSimulatedEmail($email, $name, $subject, $message, $type);
                }
            }

            return true;
        } catch (\Exception $e) {
            error_log("Notification failed: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Log a beautifully formatted simulated transaction email
     */
    private function logSimulatedEmail($toEmail, $toName, $subject, $message, $type) {
        $logDir = __DIR__ . '/../../logs';
        if (!file_exists($logDir)) {
            mkdir($logDir, 0777, true);
        }
        
        $logFile = $logDir . '/mail.log';
        $timestamp = date('Y-m-d H:i:s');
        
        $emailBody = "
================================================================================
[SIMULATED SMTP EMAIL DISPATCH - SYSTEM ACTIVE]
Timestamp: $timestamp
To: \"$toName\" <$toEmail>
Subject: $subject
Notification Category: $type
--------------------------------------------------------------------------------
Dear $toName,

This is a dynamic transactional notification from FlowSync.

Alert Details:
\"$message\"

Regards,
FlowSync Notification Daemon
Created and Managed by Neody IT
Powered by ReadyNest Corp.
================================================================================
\n";
        
        file_put_contents($logFile, $emailBody, FILE_APPEND);
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
