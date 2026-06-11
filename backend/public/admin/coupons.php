<?php

require_once __DIR__ . '/../bootstrap.php';

use FlowSync\Utils\AdminMiddleware;
use FlowSync\Config\Database;

AdminMiddleware::check();

$db = Database::getInstance()->getConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            $stmt = $db->query("SELECT * FROM coupons ORDER BY created_at DESC");
            echo json_encode(['status' => 'success', 'data' => $stmt->fetchAll()]);
            break;

        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            if (empty($data['code']) || empty($data['discount_type']) || !isset($data['discount_value'])) {
                throw new Exception("Code, discount_type, and discount_value are required");
            }
            $stmt = $db->prepare("
                INSERT INTO coupons (code, discount_type, discount_value, expiry_date, status) 
                VALUES (:code, :discount_type, :discount_value, :expiry_date, :status)
            ");
            $stmt->execute([
                'code' => strtoupper(trim($data['code'])),
                'discount_type' => $data['discount_type'],
                'discount_value' => $data['discount_value'],
                'expiry_date' => $data['expiry_date'] ?? null,
                'status' => $data['status'] ?? 'active'
            ]);
            $couponId = $db->lastInsertId();

            $logger = new \FlowSync\Utils\AuditLogger();
            $logger->log($session['user_id'] ?? null, 'CREATE_COUPON', 'COUPON', $couponId, ['code' => $data['code']]);

            echo json_encode(['status' => 'success', 'message' => 'Coupon created successfully', 'id' => (int)$couponId]);
            break;

        case 'PUT':
            $data = json_decode(file_get_contents('php://input'), true);
            $id = $data['id'] ?? null;
            if (!$id) {
                throw new Exception("Coupon ID is required");
            }

            $stmt = $db->prepare("
                UPDATE coupons 
                SET code = :code, discount_type = :discount_type, discount_value = :discount_value, expiry_date = :expiry_date, status = :status
                WHERE id = :id
            ");
            $stmt->execute([
                'id' => $id,
                'code' => strtoupper(trim($data['code'])),
                'discount_type' => $data['discount_type'],
                'discount_value' => $data['discount_value'],
                'expiry_date' => $data['expiry_date'] ?? null,
                'status' => $data['status'] ?? 'active'
            ]);

            $logger = new \FlowSync\Utils\AuditLogger();
            $logger->log($session['user_id'] ?? null, 'UPDATE_COUPON', 'COUPON', $id, ['code' => $data['code']]);

            echo json_encode(['status' => 'success', 'message' => 'Coupon updated successfully']);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) {
                throw new Exception("Coupon ID is required");
            }
            $stmt = $db->prepare("DELETE FROM coupons WHERE id = :id");
            $stmt->execute(['id' => $id]);

            $logger = new \FlowSync\Utils\AuditLogger();
            $logger->log($session['user_id'] ?? null, 'DELETE_COUPON', 'COUPON', $id);

            echo json_encode(['status' => 'success', 'message' => 'Coupon deleted successfully']);
            break;

        default:
            http_response_code(405);
            echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    }
} catch (Exception $e) {
    $code = $e->getCode();
    if ($code >= 400 && $code < 600) {
        http_response_code($code);
    } else {
        http_response_code(500);
    }
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
