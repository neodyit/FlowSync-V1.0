<?php

require_once __DIR__ . '/../bootstrap.php';

use FlowSync\Utils\AdminMiddleware;
use FlowSync\Config\Database;

$session = AdminMiddleware::check();

$db = Database::getInstance()->getConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            // Fetch all feedbacks with user details
            $stmt = $db->query("
                SELECT f.id, f.type, f.subject, f.message, f.status, f.created_at, f.updated_at,
                       u.name as user_name, u.email as user_email, u.profile_pic as user_profile_pic,
                       r.name as role_name
                FROM feedbacks f
                LEFT JOIN users u ON f.user_id = u.id
                LEFT JOIN roles r ON u.role_id = r.id
                ORDER BY f.created_at DESC
            ");
            echo json_encode(['status' => 'success', 'data' => $stmt->fetchAll()]);
            break;

        case 'PUT':
            // Update feedback status
            $data = json_decode(file_get_contents('php://input'), true);
            if (empty($data['id']) || empty($data['status'])) {
                throw new Exception("Feedback ID and Status are required");
            }
            
            $stmt = $db->prepare("UPDATE feedbacks SET status = :status, updated_at = CURRENT_TIMESTAMP WHERE id = :id");
            $stmt->execute([
                'id' => $data['id'],
                'status' => $data['status']
            ]);

            $logger = new \FlowSync\Utils\AuditLogger();
            $logger->log($session['user_id'] ?? null, 'UPDATE_FEEDBACK_STATUS', 'FEEDBACK', $data['id'], ['status' => $data['status']]);

            echo json_encode(['status' => 'success', 'message' => 'Feedback status updated']);
            break;

        case 'DELETE':
            // Delete feedback
            $id = $_GET['id'] ?? null;
            if (!$id) {
                throw new Exception("Feedback ID is required");
            }
            
            $stmt = $db->prepare("DELETE FROM feedbacks WHERE id = :id");
            $stmt->execute(['id' => $id]);

            $logger = new \FlowSync\Utils\AuditLogger();
            $logger->log($session['user_id'] ?? null, 'DELETE_FEEDBACK', 'FEEDBACK', $id);

            echo json_encode(['status' => 'success', 'message' => 'Feedback deleted']);
            break;

        default:
            http_response_code(405);
            echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    }
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
