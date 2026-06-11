<?php

namespace FlowSync\Utils;

use FlowSync\Config\Database;
use PDO;

class SystemSettings {
    public static function get($key, $default = null) {
        try {
            $db = Database::getInstance()->getConnection();
            $stmt = $db->prepare("SELECT setting_value FROM system_settings WHERE setting_key = :k");
            $stmt->execute(['k' => $key]);
            $res = $stmt->fetchColumn();
            if ($res !== false) {
                return $res;
            }
        } catch (\Exception $e) {}
        
        return $default;
    }

    public static function set($key, $value, $userId = null) {
        try {
            $db = Database::getInstance()->getConnection();
            $stmt = $db->prepare("
                INSERT INTO system_settings (setting_key, setting_value, updated_by)
                VALUES (:k, :v, :u)
                ON DUPLICATE KEY UPDATE setting_value = :v2, updated_by = :u2
            ");
            $stmt->execute([
                'k' => $key,
                'v' => $value,
                'u' => $userId,
                'v2' => $value,
                'u2' => $userId
            ]);
            return true;
        } catch (\Exception $e) {
            return false;
        }
    }
}
