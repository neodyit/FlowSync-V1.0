<?php

namespace FlowSync\Utils;

use FlowSync\Auth\AuthService;

class AdminMiddleware {
    public static function check() {
        // Setup autoloader and env if not already done
        // (Assuming the calling script handles base setup or we do it here)
        
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

        if ($session['role'] !== 'Admin' && $session['role'] !== 'Super Admin' && (int)$session['role_id'] !== 1) {
            http_response_code(403);
            echo json_encode(['status' => 'error', 'message' => 'Forbidden: Admin access required']);
            exit();
        }

        return $session;
    }
}
