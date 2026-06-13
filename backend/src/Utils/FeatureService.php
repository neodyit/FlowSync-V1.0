<?php

namespace FlowSync\Utils;

use FlowSync\Config\Database;
use PDO;

class FeatureService {
    private static $featuresCache = [];

    public static function isEnabled($collegeId, $featureKey) {
        if (!$collegeId) return false;
        
        $cacheKey = "{$collegeId}_{$featureKey}";
        if (isset(self::$featuresCache[$cacheKey])) {
            return self::$featuresCache[$cacheKey];
        }

        $db = Database::getInstance()->getConnection();
        
        // First check if the college itself is enabled
        $stmt = $db->prepare("SELECT is_enabled, auto_accept_tasks FROM colleges WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $collegeId]);
        $college = $stmt->fetch();
        
        if (!$college || $college['is_enabled'] == 0) {
            self::$featuresCache[$cacheKey] = false;
            return false;
        }

        // Special check: task_auto_accept is tied to the auto_accept_tasks column
        if ($featureKey === 'task_auto_accept') {
            $val = ($college['auto_accept_tasks'] == 1);
            self::$featuresCache[$cacheKey] = $val;
            return $val;
        }

        // Check features table
        $stmt = $db->prepare("SELECT is_enabled FROM college_features WHERE college_id = :cid AND feature_key = :fkey LIMIT 1");
        $stmt->execute(['cid' => $collegeId, 'fkey' => $featureKey]);
        $row = $stmt->fetch();

        // If not seeded yet, assume enabled by default (except for specific opt-in flags)
        if (!$row && $featureKey === 'grace_period_penalties') {
            $val = false;
        } else {
            $val = $row ? ($row['is_enabled'] == 1) : true;
        }
        self::$featuresCache[$cacheKey] = $val;
        return $val;
    }
}
