<?php

namespace FlowSync\Auth;

use FlowSync\Config\Database;
use PDO;

class AuthService {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function login($email, $password) {
        try {
            $stmt = $this->db->prepare("
                SELECT u.*, r.name as role_name 
                FROM users u 
                JOIN roles r ON u.role_id = r.id 
                WHERE u.email = :email AND u.is_active = 1
            ");
            $stmt->execute(['email' => $email]);
            $user = $stmt->fetch();

            if (!$user) {
                return ['status' => 'error', 'message' => 'User not found or inactive'];
            }

            if (password_verify($password, $user['password_hash'])) {
                $sessionId = bin2hex(random_bytes(16));
                $expiryTime = time() + (int)getenv('JWT_EXPIRY');

                // Save session to database
                $stmt = $this->db->prepare("
                    INSERT INTO sessions (user_id, token_id, ip_address, user_agent, expires_at) 
                    VALUES (:user_id, :token_id, :ip_address, :user_agent, FROM_UNIXTIME(:expires_at))
                ");
                $stmt->execute([
                    'user_id' => $user['id'],
                    'token_id' => $sessionId,
                    'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
                    'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
                    'expires_at' => $expiryTime
                ]);

                $payload = [
                    'jti'     => $sessionId,
                    'user_id' => $user['id'],
                    'email'   => $user['email'],
                    'role'    => $user['role_name'],
                    'role_id' => (int)$user['role_id'],
                    'iat'     => time(),
                    'exp'     => $expiryTime
                ];

                JWT::setSecret(getenv('JWT_SECRET') ?: 'flowsync_neodyit_2026');
                $token = JWT::encode($payload);

                $cookieName = getenv('COOKIE_NAME') ?: 'flowsync_session';
                setcookie(
                    $cookieName,
                    $token,
                    [
                        'expires' => $expiryTime,
                        'path' => '/',
                        'httponly' => true,
                        'secure' => true,
                        'samesite' => 'None'
                    ]
                );

                $logger = new \FlowSync\Utils\AuditLogger();
                $logger->log($user['id'], 'LOGIN', 'USER', $user['id'], ['email' => $user['email']]);

                return [
                    'status' => 'success',
                    'user' => [
                        'id' => $user['id'],
                        'name' => $user['name'],
                        'email' => $user['email'],
                        'role' => $user['role_name'],
                        'role_id' => (int)$user['role_id'],
                        'profile_pic' => $user['profile_pic']
                    ]
                ];
            }

            return ['status' => 'error', 'message' => 'Invalid password'];
        } catch (\Exception $e) {
            return ['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()];
        }
    }

    public function validateSession() {
        $cookieName = getenv('COOKIE_NAME') ?: 'flowsync_session';
        if (!isset($_COOKIE[$cookieName])) return false;

        JWT::setSecret(getenv('JWT_SECRET') ?: 'flowsync_neodyit_2026');
        $payload = JWT::decode($_COOKIE[$cookieName]);

        if (!$payload || !isset($payload['jti'])) {
            $this->logout();
            return false;
        }

        $stmt = $this->db->prepare("
            SELECT s.*, u.is_active 
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.token_id = :jti AND s.expires_at > DATE_SUB(NOW(), INTERVAL 1 MINUTE) AND u.is_active = 1
        ");
        $stmt->execute(['jti' => $payload['jti']]);
        $dbSession = $stmt->fetch();

        if (!$dbSession) {
            $this->logout();
            return false;
        }

        return $payload;
    }

    public function logout() {
        $cookieName = getenv('COOKIE_NAME') ?: 'flowsync_session';
        $payload = null;

        if (isset($_COOKIE[$cookieName])) {
            JWT::setSecret(getenv('JWT_SECRET') ?: 'flowsync_neodyit_2026');
            $payload = JWT::decode($_COOKIE[$cookieName]);
            
            if ($payload && isset($payload['jti'])) {
                $stmt = $this->db->prepare("DELETE FROM sessions WHERE token_id = :jti");
                $stmt->execute(['jti' => $payload['jti']]);
            }
        }
        
        setcookie($cookieName, '', [
            'expires' => time() - 3600,
            'path' => '/',
            'httponly' => true,
            'secure' => true,
            'samesite' => 'None'
        ]);

        if ($payload && isset($payload['user_id'])) {
            $logger = new \FlowSync\Utils\AuditLogger();
            $logger->log($payload['user_id'], 'LOGOUT', 'USER', $payload['user_id']);
        }
        
        return true;
    }
}
