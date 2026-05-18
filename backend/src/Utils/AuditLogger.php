<?php

namespace FlowSync\Utils;

use FlowSync\Config\Database;
use PDO;

class AuditLogger {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    /**
     * Log a system action
     * 
     * @param int|null $userId ID of the user performing the action
     * @param string $action Name of the action (e.g., 'LOGIN', 'CREATE_USER')
     * @param string|null $resource Type of resource (e.g., 'USER', 'COLLEGE')
     * @param string|null $resourceId ID of the resource affected
     * @param array|null $details Additional metadata
     */
    public function log($userId, $action, $resource = null, $resourceId = null, $details = null) {
        try {
            $stmt = $this->db->prepare("
                INSERT INTO audit_logs (
                    user_id, action, resource, resource_id, details, 
                    ip_address, user_agent, request_method, request_uri
                ) VALUES (
                    :user_id, :action, :resource, :resource_id, :details, 
                    :ip_address, :user_agent, :request_method, :request_uri
                )
            ");

            $stmt->execute([
                'user_id' => $userId,
                'action' => $action,
                'resource' => $resource,
                'resource_id' => $resourceId,
                'details' => $details ? json_encode($details) : null,
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
                'request_method' => $_SERVER['REQUEST_METHOD'] ?? null,
                'request_uri' => $_SERVER['REQUEST_URI'] ?? null
            ]);
        } catch (\Exception $e) {
            // Silently fail to not break the main application flow
            error_log("Audit logging failed: " . $e->getMessage());
        }
    }

    /**
     * Helper for logging generic API hits
     */
    public static function logApiHit($userId = null) {
        $logger = new self();
        $logger->log($userId, 'API_HIT');
    }
}
