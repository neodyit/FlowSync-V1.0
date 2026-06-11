<?php

namespace FlowSync\Utils;

use FlowSync\Auth\AuthService;

class InstitutionAdminMiddleware {
    public static function check() {
        $auth = new AuthService();
        $session = $auth->validateSession();

        if (!$session) {
            http_response_code(401);
            $cookieName = getenv('COOKIE_NAME');
            $hasCookie = isset($_COOKIE[$cookieName]) ? 'yes' : 'no';
            echo json_encode([
                'status' => 'error', 
                'message' => 'Unauthorized', 
                'debug' => [
                    'cookie_name' => $cookieName,
                    'has_cookie' => $hasCookie,
                    'cookies_present' => array_keys($_COOKIE)
                ]
            ]);
            exit();
        }

        $role = $session['role'] ?? '';
        $roleId = isset($session['role_id']) ? (int)$session['role_id'] : 0;

        // Accept name "INSTITUTION_ADMIN" or whatever is in roles table (or ID 4 fallback)
        if ($role !== 'INSTITUTION_ADMIN' && $role !== 'Institution Admin' && $roleId !== 4) {
            http_response_code(403);
            echo json_encode(['status' => 'error', 'message' => 'Forbidden: Institution Admin access required']);
            exit();
        }

        return $session;
    }
}
