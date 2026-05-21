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
}
