<?php

require_once __DIR__ . '/../bootstrap.php';

use FlowSync\Utils\AdminMiddleware;
use FlowSync\Utils\SubscriptionService;

AdminMiddleware::check();

$subscriptionService = new SubscriptionService();
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            $id = $_GET['id'] ?? null;
            if ($id) {
                $plan = $subscriptionService->getPlanById($id);
                if (!$plan) {
                    throw new Exception("Plan not found", 404);
                }
                echo json_encode(['status' => 'success', 'data' => $plan]);
            } else {
                $plans = $subscriptionService->getAllPlans();
                echo json_encode(['status' => 'success', 'data' => $plans]);
            }
            break;

        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            if (empty($data)) {
                throw new Exception("Request body cannot be empty");
            }
            $planId = $subscriptionService->createPlan($data);

            $logger = new \FlowSync\Utils\AuditLogger();
            $logger->log($session['user_id'] ?? null, 'CREATE_PLAN', 'PLAN', $planId, ['name' => $data['name'] ?? '']);

            echo json_encode([
                'status' => 'success',
                'message' => 'Subscription plan created successfully',
                'id' => (int)$planId
            ]);
            break;

        case 'PUT':
            $data = json_decode(file_get_contents('php://input'), true);
            $id = $_GET['id'] ?? ($data['id'] ?? null);
            if (!$id) {
                throw new Exception("Plan ID is required");
            }
            $subscriptionService->updatePlan($id, $data);

            $logger = new \FlowSync\Utils\AuditLogger();
            $logger->log($session['user_id'] ?? null, 'UPDATE_PLAN', 'PLAN', $id, $data);

            echo json_encode([
                'status' => 'success',
                'message' => 'Subscription plan updated successfully'
            ]);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) {
                throw new Exception("Plan ID is required");
            }
            $subscriptionService->deletePlan($id);

            $logger = new \FlowSync\Utils\AuditLogger();
            $logger->log($session['user_id'] ?? null, 'DELETE_PLAN', 'PLAN', $id);

            echo json_encode([
                'status' => 'success',
                'message' => 'Subscription plan deleted successfully'
            ]);
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
