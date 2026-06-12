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
            $collegeId = $_GET['college_id'] ?? ($_GET['institution_id'] ?? null);
            if (!$collegeId) {
                throw new Exception("College (Institution) ID is required");
            }
            $statusInfo = $subscriptionService->getSubscriptionStatus($collegeId);
            echo json_encode(['status' => 'success', 'data' => $statusInfo]);
            break;

        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            $collegeId = $data['college_id'] ?? ($data['institution_id'] ?? null);
            $planId = $data['plan_id'] ?? null;
            
            if (!$collegeId || !$planId) {
                throw new Exception("college_id and plan_id are required");
            }

            $startDate = $data['start_date'] ?? null;
            $bonusDays = isset($data['bonus_days']) ? (int)$data['bonus_days'] : null;

            $subscriptionService->assignSubscription($collegeId, $planId, $startDate, $bonusDays);

            $logger = new \FlowSync\Utils\AuditLogger();
            $logger->log($session['user_id'] ?? null, 'ASSIGN_SUBSCRIPTION', 'COLLEGE', $collegeId, [
                'plan_id' => $planId,
                'start_date' => $startDate,
                'bonus_days' => $bonusDays
            ]);

            echo json_encode([
                'status' => 'success',
                'message' => 'Subscription plan assigned to college successfully'
            ]);
            break;

        case 'PUT':
            $data = json_decode(file_get_contents('php://input'), true);
            $collegeId = $data['college_id'] ?? ($data['institution_id'] ?? null);
            $status = $data['status'] ?? null;

            if (!$collegeId || !$status) {
                throw new Exception("college_id and status are required");
            }

            $options = [];
            if (isset($data['start_date'])) $options['start_date'] = $data['start_date'];
            if (isset($data['expiry_date'])) $options['expiry_date'] = $data['expiry_date'];
            if (isset($data['bonus_days'])) $options['bonus_days'] = $data['bonus_days'];

            $subscriptionService->updateSubscriptionStatus($collegeId, $status, $options);

            $logger = new \FlowSync\Utils\AuditLogger();
            $logger->log($session['user_id'] ?? null, 'OVERRIDE_SUBSCRIPTION', 'COLLEGE', $collegeId, [
                'status' => $status,
                'options' => $options
            ]);

            echo json_encode([
                'status' => 'success',
                'message' => 'Subscription status updated successfully'
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
