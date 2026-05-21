<?php

namespace FlowSync\Utils;

use FlowSync\Auth\AuthService;
use FlowSync\Utils\SystemSettings;

class HODMiddleware {
    public static function check() {
        $auth = new AuthService();
        $session = $auth->validateSession();

        if (!$session || $session['role_id'] !== 2) {
            http_response_code(403);
            echo json_encode(['status' => 'error', 'message' => 'Unauthorized. HOD access required.']);
            exit;
        }

        if (SystemSettings::get('maintenance_mode') === 'true') {
            http_response_code(503);
            echo json_encode(['status' => 'error', 'message' => 'System is under maintenance. Please try again later.']);
            exit;
        }

        return $session;
    }
}
