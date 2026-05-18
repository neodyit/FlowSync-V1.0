<?php

namespace FlowSync\Utils;

use FlowSync\Auth\AuthService;

class HODMiddleware {
    public static function check() {
        $auth = new AuthService();
        $session = $auth->validateSession();

        if (!$session || $session['role_id'] !== 2) {
            http_response_code(403);
            echo json_encode(['status' => 'error', 'message' => 'Unauthorized. HOD access required.']);
            exit;
        }

        return $session;
    }
}
