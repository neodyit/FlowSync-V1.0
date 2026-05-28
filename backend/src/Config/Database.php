<?php

namespace FlowSync\Config;

use PDO;
use PDOException;

class Database
{
    private static $instance = null;
    private $connection;

    private function __construct()
    {
        $host = getenv('DB_HOST') ?: 'localhost';
        $db = getenv('DB_NAME') ?: 'flowsync';
        $user = getenv('DB_USER') ?: 'root';
        $pass = getenv('DB_PASS') ?: '';
        $charset = 'utf8mb4';

        $dsn = "mysql:host=$host;dbname=$db;charset=$charset";
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
        ];

        try {
            $this->connection = new PDO($dsn, $user, $pass, $options);
            $this->connection->exec("SET time_zone = '+05:30'");
        } catch (PDOException $e) {
            throw new PDOException($e->getMessage(), (int) $e->getCode());
        }
    }

    public static function getInstance()
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getConnection()
    {
        return $this->connection;
    }

    public static function handleCORS()
    {
        $allowedOriginsStr = getenv('ALLOWED_ORIGINS') ?: 'https://flowsync.neodyit.in';
        $allowedOrigins = array_map('trim', explode(',', $allowedOriginsStr));
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

        $isAllowed = in_array($origin, $allowedOrigins);
        $appEnv = getenv('APP_ENV') ?: 'development';

        // Only allow localhost/LAN fallback if we are NOT in production or testing environments
        if (!$isAllowed && !empty($origin) && !in_array($appEnv, ['production', 'testing'])) {
            $parsedUrl = parse_url($origin);
            if (isset($parsedUrl['host'])) {
                $host = $parsedUrl['host'];
                if ($host === 'localhost' || $host === '127.0.0.1' || $host === '::1') {
                    $isAllowed = true;
                } elseif (filter_var($host, FILTER_VALIDATE_IP)) {
                    $isPrivate = !filter_var(
                        $host,
                        FILTER_VALIDATE_IP,
                        FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
                    );
                    if ($isPrivate) {
                        $isAllowed = true;
                    }
                }
            }
        }

        if ($isAllowed) {
            header("Access-Control-Allow-Origin: $origin");
            header("Access-Control-Allow-Credentials: true");
            header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
            header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
        }

        if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
            exit();
        }
    }
}
