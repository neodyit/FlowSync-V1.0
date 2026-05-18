<?php

namespace FlowSync\Utils;

use FlowSync\Auth\AuthService;

class FacultyMiddleware {
    public static function check() {
        $auth = new AuthService();
        $session = $auth->validateSession();

        if (!$session || $session['role_id'] !== 3) {
            http_response_code(403);
            echo json_encode(['status' => 'error', 'message' => 'Unauthorized. Faculty access required.']);
            exit;
        }

        return $session;
    }
}
