<?php

namespace FlowSync\Auth;

use FlowSync\Config\Database;
use PDO;

class AuthService {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function login($email, $password, $fingerprint = '') {
        try {
            $ipAddress = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';

            // Check if there is an active ban for this IP or fingerprint
            $banCheck = $this->db->prepare("
                SELECT COUNT(*) FROM banned_clients 
                WHERE status = 'active' AND (ip_address = :ip OR (device_fingerprint = :fp AND device_fingerprint <> ''))
            ");
            $banCheck->execute(['ip' => $ipAddress, 'fp' => $fingerprint]);
            if ($banCheck->fetchColumn() > 0) {
                return ['status' => 'error', 'message' => 'Access blocked: This IP or device has been banned due to excessive failed attempts.'];
            }

            $stmt = $this->db->prepare("
                SELECT u.*, r.name as role_name, c.is_enabled as college_enabled, c.auto_accept_tasks, c.allow_task_decline
                FROM users u 
                JOIN roles r ON u.role_id = r.id 
                JOIN colleges c ON u.college_id = c.id
                WHERE u.email = :email AND u.is_active = 1
            ");
            $stmt->execute(['email' => $email]);
            $user = $stmt->fetch();

            if (!$user) {
                // Log failed attempt (user not found or inactive)
                $logAttempt = $this->db->prepare("
                    INSERT INTO login_attempts (ip_address, device_fingerprint, email, is_successful) 
                    VALUES (:ip, :fp, :email, 0)
                ");
                $logAttempt->execute(['ip' => $ipAddress, 'fp' => $fingerprint, 'email' => $email]);

                // Evaluate brute force limit
                $this->checkBruteForceThreshold($ipAddress, $fingerprint);

                return ['status' => 'error', 'message' => 'User not found or inactive'];
            }

            if ($user['college_enabled'] == 0 && (int)$user['role_id'] !== 1) {
                return ['status' => 'error', 'message' => 'Access blocked: Your institution has been deactivated.'];
            }

            // Check if department is disabled
            if ($user['role_id'] == 2) {
                $stmtDept = $this->db->prepare("SELECT is_enabled FROM departments WHERE hod_id = :uid LIMIT 1");
                $stmtDept->execute(['uid' => $user['id']]);
                $deptStatus = $stmtDept->fetch();
                if ($deptStatus && $deptStatus['is_enabled'] == 0) {
                    return ['status' => 'error', 'message' => 'Access blocked: Your department has been deactivated.'];
                }
            } elseif ($user['role_id'] == 3) {
                $stmtDept = $this->db->prepare("
                    SELECT d.is_enabled 
                    FROM faculty_departments fd 
                    JOIN departments d ON fd.department_id = d.id 
                    WHERE fd.user_id = :uid
                ");
                $stmtDept->execute(['uid' => $user['id']]);
                $depts = $stmtDept->fetchAll(PDO::FETCH_COLUMN);
                if (count($depts) > 0) {
                    $allDisabled = true;
                    foreach ($depts as $enabled) {
                        if ($enabled == 1) { $allDisabled = false; break; }
                    }
                    if ($allDisabled) {
                        return ['status' => 'error', 'message' => 'Access blocked: Your department has been deactivated.'];
                    }
                }
            }

            if (password_verify($password, $user['password_hash'])) {
                $sessionId = bin2hex(random_bytes(16));
                $expiryTime = time() + (int)(getenv('JWT_EXPIRY') ?: 86400);

                // Save session to database
                $stmt = $this->db->prepare("
                    INSERT INTO sessions (user_id, token_id, ip_address, user_agent, expires_at) 
                    VALUES (:user_id, :token_id, :ip_address, :user_agent, FROM_UNIXTIME(:expires_at))
                ");
                $stmt->execute([
                    'user_id' => $user['id'],
                    'token_id' => $sessionId,
                    'ip_address' => $ipAddress,
                    'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
                    'expires_at' => $expiryTime
                ]);

                $payload = [
                    'jti'        => $sessionId,
                    'user_id'    => $user['id'],
                    'email'      => $user['email'],
                    'role'       => $user['role_name'],
                    'role_id'    => (int)$user['role_id'],
                    'college_id' => (int)$user['college_id'],
                    'iat'        => time(),
                    'exp'        => $expiryTime
                ];

                JWT::setSecret(getenv('JWT_SECRET') ?: 'flowsync_neodyit_2026');
                $token = JWT::encode($payload);

                $cookieName = getenv('COOKIE_NAME') ?: 'flowsync_session';
                $isSecure = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') || 
                            (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
                setcookie(
                    $cookieName,
                    $token,
                    [
                        'expires' => $expiryTime,
                        'path' => '/',
                        'httponly' => true,
                        'secure' => $isSecure,
                        'samesite' => $isSecure ? 'None' : 'Lax'
                    ]
                );

                // Log successful attempt
                $logAttempt = $this->db->prepare("
                    INSERT INTO login_attempts (ip_address, device_fingerprint, email, is_successful) 
                    VALUES (:ip, :fp, :email, 1)
                ");
                $logAttempt->execute(['ip' => $ipAddress, 'fp' => $fingerprint, 'email' => $email]);

                $logger = new \FlowSync\Utils\AuditLogger();
                $logger->log($user['id'], 'LOGIN', 'USER', $user['id'], ['email' => $user['email']]);

                // Fetch college feature flags
                $stmtF = $this->db->prepare("SELECT feature_key, is_enabled FROM college_features WHERE college_id = :cid");
                $stmtF->execute(['cid' => $user['college_id']]);
                $rows = $stmtF->fetchAll();
                $features = [];
                $features['task_auto_accept'] = ($user['auto_accept_tasks'] == 1);
                $features['allow_task_decline'] = ($user['allow_task_decline'] == 1);
                foreach ($rows as $r) {
                    $features[$r['feature_key']] = ($r['is_enabled'] == 1);
                }

                return [
                    'status' => 'success',
                    'user' => [
                        'id' => $user['id'],
                        'name' => $user['name'],
                        'email' => $user['email'],
                        'role' => $user['role_name'],
                        'role_id' => (int)$user['role_id'],
                        'college_id' => (int)$user['college_id'],
                        'profile_pic' => $user['profile_pic'],
                        'features' => $features
                    ]
                ];
            }

            // FAILED ATTEMPT (incorrect password)
            $logAttempt = $this->db->prepare("
                INSERT INTO login_attempts (ip_address, device_fingerprint, email, is_successful) 
                VALUES (:ip, :fp, :email, 0)
            ");
            $logAttempt->execute(['ip' => $ipAddress, 'fp' => $fingerprint, 'email' => $email]);

            // Check brute force limit and return remaining attempts count
            $remaining = $this->checkBruteForceThreshold($ipAddress, $fingerprint);

            return ['status' => 'error', 'message' => "Invalid password. (Attempts remaining: $remaining)"];
        } catch (\Exception $e) {
            return ['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()];
        }
    }

    private function checkBruteForceThreshold($ip, $fp) {
        // Count failed attempts from this IP or device fingerprint in the last 5 minutes
        $failedAttempts = $this->db->prepare("
            SELECT COUNT(*) FROM login_attempts 
            WHERE is_successful = 0 
              AND attempted_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
              AND (ip_address = :ip OR (device_fingerprint = :fp AND device_fingerprint <> ''))
        ");
        $failedAttempts->execute(['ip' => $ip, 'fp' => $fp]);
        $failedCount = (int)$failedAttempts->fetchColumn();

        if ($failedCount >= 5) {
            // Trigger Ban!
            $triggerBan = $this->db->prepare("
                INSERT INTO banned_clients (ip_address, device_fingerprint, reason) 
                VALUES (:ip, :fp, 'Brute-force lockout triggered (5 consecutive failures)')
            ");
            $triggerBan->execute(['ip' => $ip, 'fp' => $fp]);

            throw new \Exception('Access blocked: This IP or device has been banned due to excessive failed attempts.');
        }

        return max(0, 5 - $failedCount);
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
            SELECT s.*, u.is_active, c.is_enabled as college_enabled, u.role_id, u.id as user_real_id
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            JOIN colleges c ON u.college_id = c.id
            WHERE s.token_id = :jti AND s.expires_at > FROM_UNIXTIME(:now_minus_grace) AND u.is_active = 1
        ");
        $stmt->execute([
            'jti' => $payload['jti'],
            'now_minus_grace' => time() - 60 // 1 minute grace period from web-server time
        ]);
        $dbSession = $stmt->fetch();

        if (!$dbSession || ($dbSession['college_enabled'] == 0 && (int)$dbSession['role_id'] !== 1)) {
            $this->logout();
            return false;
        }

        // Validate User Agent to prevent session hijacking / cookie copying
        // (We do not strictly check IP address to avoid logging out users when switching networks or waking from sleep)
        $currentUserAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
        $dbUserAgent = $dbSession['user_agent'] ?? '';

        if ($dbUserAgent !== $currentUserAgent) {
            // Clear local cookie for the current client, but do not delete the session from DB
            // so the legitimate user on Browser A remains logged in.
            $isSecure = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') || 
                        (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
            setcookie($cookieName, '', [
                'expires' => time() - 3600,
                'path' => '/',
                'httponly' => true,
                'secure' => $isSecure,
                'samesite' => $isSecure ? 'None' : 'Lax'
            ]);
            return false;
        }

        // Check if department is disabled
        if ($dbSession['role_id'] == 2) {
            $stmtDept = $this->db->prepare("SELECT is_enabled FROM departments WHERE hod_id = :uid LIMIT 1");
            $stmtDept->execute(['uid' => $dbSession['user_real_id']]);
            $deptStatus = $stmtDept->fetch();
            if ($deptStatus && $deptStatus['is_enabled'] == 0) {
                $this->logout();
                return false;
            }
        } elseif ($dbSession['role_id'] == 3) {
            $stmtDept = $this->db->prepare("
                SELECT d.is_enabled 
                FROM faculty_departments fd 
                JOIN departments d ON fd.department_id = d.id 
                WHERE fd.user_id = :uid
            ");
            $stmtDept->execute(['uid' => $dbSession['user_real_id']]);
            $depts = $stmtDept->fetchAll(PDO::FETCH_COLUMN);
            if (count($depts) > 0) {
                $allDisabled = true;
                foreach ($depts as $enabled) {
                    if ($enabled == 1) { $allDisabled = false; break; }
                }
                if ($allDisabled) {
                    $this->logout();
                    return false;
                }
            }
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
        
        $isSecure = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') || 
                    (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
        setcookie($cookieName, '', [
            'expires' => time() - 3600,
            'path' => '/',
            'httponly' => true,
            'secure' => $isSecure,
            'samesite' => $isSecure ? 'None' : 'Lax'
        ]);

        if ($payload && isset($payload['user_id'])) {
            $logger = new \FlowSync\Utils\AuditLogger();
            $logger->log($payload['user_id'], 'LOGOUT', 'USER', $payload['user_id']);
        }
        
        return true;
    }
}
