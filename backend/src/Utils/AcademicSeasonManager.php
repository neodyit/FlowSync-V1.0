<?php

namespace FlowSync\Utils;

use FlowSync\Config\Database;
use PDO;

class AcademicSeasonManager {
    private static $cachedSeasonId = null;

    /**
     * Get the active season ID for the given user ID.
     */
    public static function getCurrentSeasonId($userId) {
        if (self::$cachedSeasonId !== null) {
            return self::$cachedSeasonId;
        }

        $db = Database::getInstance()->getConnection();

        // 1. Get college_id of the user
        $userStmt = $db->prepare("SELECT college_id FROM users WHERE id = :uid");
        $userStmt->execute(['uid' => $userId]);
        $collegeId = $userStmt->fetchColumn();

        if (!$collegeId) {
            return null;
        }

        // 2. Check if active_season_id cookie is present
        $cookieName = 'active_season_id';
        if (isset($_COOKIE[$cookieName])) {
            $cookieSeasonId = (int)$_COOKIE[$cookieName];
            
            // Validate if this season ID is valid and belongs to the user's college
            $validateStmt = $db->prepare("
                SELECT id FROM academic_seasons 
                WHERE id = :sid AND college_id = :cid
            ");
            $validateStmt->execute(['sid' => $cookieSeasonId, 'cid' => $collegeId]);
            $validId = $validateStmt->fetchColumn();

            if ($validId) {
                self::$cachedSeasonId = (int)$validId;
                return self::$cachedSeasonId;
            }
        }

        // 3. Fallback: get the default season for the user's college
        $defaultStmt = $db->prepare("
            SELECT id FROM academic_seasons 
            WHERE college_id = :cid AND is_default = 1
            LIMIT 1
        ");
        $defaultStmt->execute(['cid' => $collegeId]);
        $defaultId = $defaultStmt->fetchColumn();

        if ($defaultId) {
            self::$cachedSeasonId = (int)$defaultId;
            return self::$cachedSeasonId;
        }

        // 4. Extreme fallback: get any season for the college
        $anyStmt = $db->prepare("
            SELECT id FROM academic_seasons 
            WHERE college_id = :cid
            ORDER BY id DESC
            LIMIT 1
        ");
        $anyStmt->execute(['cid' => $collegeId]);
        $anyId = $anyStmt->fetchColumn();

        if ($anyId) {
            self::$cachedSeasonId = (int)$anyId;
            return self::$cachedSeasonId;
        }

        return null;
    }

    /**
     * Check if a season is locked.
     */
    public static function isSeasonLocked($seasonId) {
        if (!$seasonId) {
            return false;
        }
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare("SELECT is_locked FROM academic_seasons WHERE id = :sid");
        $stmt->execute(['sid' => $seasonId]);
        return (bool)$stmt->fetchColumn();
    }

    /**
     * Map historical tasks in the college that fall within the start and end dates to this season.
     * Also unmaps tasks that no longer fall in the date range, and recalibrates leaderboards.
     */
    public static function mapHistoricalTasks($db, $seasonId, $collegeId, $startDate, $endDate) {
        // 1. Get other seasons that will lose tasks to this season
        $stmt = $db->prepare("
            SELECT DISTINCT season_id 
            FROM tasks 
            WHERE college_id = :college_id 
              AND DATE(created_at) BETWEEN :start_date AND :end_date
              AND season_id IS NOT NULL 
              AND season_id != :season_id
        ");
        $stmt->execute([
            'college_id' => $collegeId,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'season_id' => $seasonId
        ]);
        $affectedSeasons = $stmt->fetchAll(PDO::FETCH_COLUMN);

        // 2. Unmap tasks that were previously mapped to this season but now fall outside the range
        $unmapStmt = $db->prepare("
            UPDATE tasks 
            SET season_id = NULL 
            WHERE season_id = :season_id 
              AND (DATE(created_at) < :start_date OR DATE(created_at) > :end_date)
        ");
        $unmapStmt->execute([
            'season_id' => $seasonId,
            'start_date' => $startDate,
            'end_date' => $endDate
        ]);

        // 3. Map tasks in the date range to this season
        $mapStmt = $db->prepare("
            UPDATE tasks
            SET season_id = :season_id
            WHERE college_id = :college_id
              AND DATE(created_at) BETWEEN :start_date AND :end_date
              AND (season_id IS NULL OR season_id != :season_id_check)
        ");
        $mapStmt->execute([
            'season_id' => $seasonId,
            'college_id' => $collegeId,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'season_id_check' => $seasonId
        ]);

        // 4. Recalculate leaderboard points for this season
        self::recalculateLeaderboard($db, $seasonId);

        // 5. Recalculate leaderboard points for all other affected seasons
        foreach ($affectedSeasons as $affSeasonId) {
            self::recalculateLeaderboard($db, $affSeasonId);
        }
    }

    /**
     * Recalculates leaderboard_points for a specific season from scratch.
     */
    public static function recalculateLeaderboard($db, $seasonId) {
        if (!$seasonId) return;

        // Delete existing points for this season
        $delStmt = $db->prepare("DELETE FROM leaderboard_points WHERE season_id = :sid");
        $delStmt->execute(['sid' => $seasonId]);

        // Re-aggregate points and tasks completed for approved assignments in this season
        $aggStmt = $db->prepare("
            SELECT 
                ta.user_id,
                SUM(COALESCE(ta.points, 0) + COALESCE(ta.bonus_points, 0)) as total_points,
                SUM(COALESCE(ta.bonus_points, 0)) as bonus_points,
                COUNT(*) as tasks_completed
            FROM task_assignments ta
            JOIN tasks t ON ta.task_id = t.id
            WHERE t.season_id = :season_id AND ta.status = 'Approved'
            GROUP BY ta.user_id
        ");
        $aggStmt->execute(['season_id' => $seasonId]);
        $aggregates = $aggStmt->fetchAll(PDO::FETCH_ASSOC);

        if (!empty($aggregates)) {
            $insStmt = $db->prepare("
                INSERT INTO leaderboard_points (user_id, season_id, total_points, bonus_points, tasks_completed)
                VALUES (:uid, :season_id, :tot, :bn, :tc)
            ");
            foreach ($aggregates as $row) {
                $insStmt->execute([
                    'uid' => $row['user_id'],
                    'season_id' => $seasonId,
                    'tot' => $row['total_points'],
                    'bn' => $row['bonus_points'],
                    'tc' => $row['tasks_completed']
                ]);
            }
        }
    }
}

