<?php

namespace FlowSync\Utils;

use FlowSync\Config\Database;
use PDO;
use Exception;
use DateTime;

class SubscriptionService
{
    private $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    // ==========================================
    // Plan Management (CRUD)
    // ==========================================

    public static function formatPlan($plan)
    {
        if (!$plan) return null;
        
        $durationMonths = (int)$plan['duration_months'];
        $bonusDays = (int)$plan['bonus_days'];
        
        $formattedBonus = '';
        $formattedTotal = "{$durationMonths} Months";
        
        if ($bonusDays > 0) {
            if ($bonusDays % 30 === 0) {
                $bonusMonths = $bonusDays / 30;
                $formattedBonus = "+ {$bonusMonths} Month" . ($bonusMonths > 1 ? 's' : '') . " FREE";
                $totalMonths = $durationMonths + $bonusMonths;
                $formattedTotal = "{$durationMonths} Months + {$bonusMonths} Month" . ($bonusMonths > 1 ? 's' : '') . " FREE (Total Access: {$totalMonths} Months)";
            } else {
                $formattedBonus = "+ {$bonusDays} Days FREE";
                $formattedTotal = "{$durationMonths} Months + {$bonusDays} Days FREE";
            }
        }
        
        $plan['formatted_bonus_text'] = $formattedBonus;
        $plan['formatted_total_duration'] = $formattedTotal;
        $plan['total_days'] = ($durationMonths * 30) + $bonusDays;
        
        return $plan;
    }

    public function getAllPlans()
    {
        $stmt = $this->db->query("SELECT * FROM subscription_plans ORDER BY id DESC");
        $plans = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return array_map([self::class, 'formatPlan'], $plans);
    }

    public function getActivePlans()
    {
        $stmt = $this->db->query("SELECT * FROM subscription_plans WHERE status = 'active' ORDER BY price ASC");
        $plans = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return array_map([self::class, 'formatPlan'], $plans);
    }

    public function getPlanById($id)
    {
        $stmt = $this->db->prepare("SELECT * FROM subscription_plans WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $id]);
        $plan = $stmt->fetch(PDO::FETCH_ASSOC);
        return $plan ? self::formatPlan($plan) : null;
    }

    public function createPlan($data)
    {
        if (empty($data['name']) || !isset($data['price']) || !isset($data['duration_months'])) {
            throw new Exception("Name, price, and duration are required.");
        }

        $stmt = $this->db->prepare("
            INSERT INTO subscription_plans (name, price, duration_months, bonus_days, gateway_percentage, description, status)
            VALUES (:name, :price, :duration_months, :bonus_days, :gateway_percentage, :description, :status)
        ");
        $stmt->execute([
            'name' => $data['name'],
            'price' => $data['price'],
            'duration_months' => $data['duration_months'],
            'bonus_days' => $data['bonus_days'] ?? 0,
            'gateway_percentage' => $data['gateway_percentage'] ?? 0.00,
            'description' => $data['description'] ?? null,
            'status' => $data['status'] ?? 'active'
        ]);

        return $this->db->lastInsertId();
    }

    public function updatePlan($id, $data)
    {
        $plan = $this->getPlanById($id);
        if (!$plan) {
            throw new Exception("Plan not found.");
        }

        $stmt = $this->db->prepare("
            UPDATE subscription_plans
            SET name = :name,
                price = :price,
                duration_months = :duration_months,
                bonus_days = :bonus_days,
                gateway_percentage = :gateway_percentage,
                description = :description,
                status = :status
            WHERE id = :id
        ");
        $stmt->execute([
            'id' => $id,
            'name' => $data['name'] ?? $plan['name'],
            'price' => $data['price'] ?? $plan['price'],
            'duration_months' => $data['duration_months'] ?? $plan['duration_months'],
            'bonus_days' => isset($data['bonus_days']) ? $data['bonus_days'] : $plan['bonus_days'],
            'gateway_percentage' => isset($data['gateway_percentage']) ? $data['gateway_percentage'] : $plan['gateway_percentage'],
            'description' => isset($data['description']) ? $data['description'] : $plan['description'],
            'status' => $data['status'] ?? $plan['status']
        ]);

        return true;
    }

    public function deletePlan($id)
    {
        $stmt = $this->db->prepare("DELETE FROM subscription_plans WHERE id = :id");
        $stmt->execute(['id' => $id]);
        return true;
    }

    // ==========================================
    // Institution Subscription Status Calculation
    // ==========================================

    public function getSubscriptionStatus($collegeId)
    {
        $stmt = $this->db->prepare("
            SELECT isub.*, sp.name as plan_name, sp.price as plan_price
            FROM institution_subscriptions isub
            LEFT JOIN subscription_plans sp ON isub.plan_id = sp.id
            WHERE isub.institution_id = :college_id
            LIMIT 1
        ");
        $stmt->execute(['college_id' => $collegeId]);
        $sub = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$sub) {
            // Default fallback if no row is seeded
            return [
                'status' => 'trial',
                'plan_id' => null,
                'plan_name' => 'Trial Period',
                'start_date' => null,
                'expiry_date' => null,
                'bonus_days' => 0,
                'final_expiry_date' => null,
                'is_lifetime' => false,
                'remaining_days' => 0,
                'raw_status' => 'trial'
            ];
        }

        $computedStatus = $sub['status'];
        $remainingDays = 0;

        if ($sub['is_lifetime'] || $sub['status'] === 'lifetime') {
            $computedStatus = 'lifetime';
            $remainingDays = 9999;
        } elseif ($sub['status'] === 'free') {
            $computedStatus = 'free';
            $remainingDays = 9999;
        } elseif ($sub['status'] === 'suspended') {
            $computedStatus = 'suspended';
            $remainingDays = 0;
        } else {
            // Calculate remaining days based on final_expiry_date
            if (!empty($sub['final_expiry_date'])) {
                $today = new DateTime('today');
                $expiry = new DateTime($sub['final_expiry_date']);
                $diff = $today->diff($expiry);
                $remainingDays = (int)$diff->format('%r%a');

                if ($remainingDays < 0) {
                    $computedStatus = 'expired';
                }
            } else {
                $computedStatus = 'expired';
            }
        }

        return [
            'id' => $sub['id'],
            'institution_id' => (int)$sub['institution_id'],
            'plan_id' => $sub['plan_id'] ? (int)$sub['plan_id'] : null,
            'plan_name' => $sub['plan_name'] ?: ($sub['is_lifetime'] ? 'Lifetime' : ($sub['status'] === 'free' ? 'Free' : 'N/A')),
            'status' => $computedStatus,
            'raw_status' => $sub['status'],
            'start_date' => $sub['start_date'],
            'expiry_date' => $sub['expiry_date'],
            'bonus_days' => (int)$sub['bonus_days'],
            'final_expiry_date' => $sub['final_expiry_date'],
            'is_lifetime' => (bool)$sub['is_lifetime'],
            'remaining_days' => $remainingDays
        ];
    }

    // ==========================================
    // Subscription Assignment & Management Actions
    // ==========================================

    public function assignSubscription($collegeId, $planId, $startDate = null, $customBonusDays = null, $createTransaction = true)
    {
        $plan = $this->getPlanById($planId);
        if (!$plan) {
            throw new Exception("Selected plan does not exist.");
        }

        $startDateStr = $startDate ?: date('Y-m-d');
        $startDateTime = new DateTime($startDateStr);

        // Calculate expiry date: add duration_months
        $expiryDateTime = clone $startDateTime;
        $expiryDateTime->modify("+{$plan['duration_months']} months");
        $expiryDateStr = $expiryDateTime->format('Y-m-d');

        // Bonus days logic
        $bonusDays = ($customBonusDays !== null) ? (int)$customBonusDays : (int)$plan['bonus_days'];

        // Calculate final expiry date
        $finalExpiryDateTime = clone $expiryDateTime;
        if ($bonusDays > 0) {
            $finalExpiryDateTime->modify("+{$bonusDays} days");
        }
        $finalExpiryDateStr = $finalExpiryDateTime->format('Y-m-d');

        // Check if there is an existing record to UPSERT
        $stmtCheck = $this->db->prepare("SELECT id FROM institution_subscriptions WHERE institution_id = :college_id LIMIT 1");
        $stmtCheck->execute(['college_id' => $collegeId]);
        $existingId = $stmtCheck->fetchColumn();

        if ($existingId) {
            $stmt = $this->db->prepare("
                UPDATE institution_subscriptions
                SET plan_id = :plan_id,
                    status = 'active',
                    start_date = :start_date,
                    expiry_date = :expiry_date,
                    bonus_days = :bonus_days,
                    final_expiry_date = :final_expiry_date,
                    is_lifetime = 0
                WHERE institution_id = :college_id
            ");
        } else {
            $stmt = $this->db->prepare("
                INSERT INTO institution_subscriptions (institution_id, plan_id, status, start_date, expiry_date, bonus_days, final_expiry_date, is_lifetime)
                VALUES (:college_id, :plan_id, 'active', :start_date, :expiry_date, :bonus_days, :final_expiry_date, 0)
            ");
        }

        $stmt->execute([
            'college_id' => $collegeId,
            'plan_id' => $planId,
            'start_date' => $startDateStr,
            'expiry_date' => $expiryDateStr,
            'bonus_days' => $bonusDays,
            'final_expiry_date' => $finalExpiryDateStr
        ]);

        if ($createTransaction) {
            // Create transaction record
            $stmtTx = $this->db->prepare("
                INSERT INTO subscription_transactions (institution_id, plan_id, amount, payment_status, paid_at)
                VALUES (:college_id, :plan_id, :amount, 'completed', CURRENT_TIMESTAMP)
            ");
            $stmtTx->execute([
                'college_id' => $collegeId,
                'plan_id' => $planId,
                'amount' => $plan['price']
            ]);
        }

        return true;
    }

    public function updateSubscriptionStatus($collegeId, $status, $options = [])
    {
        $allowedStatuses = ['free', 'trial', 'active', 'expired', 'suspended', 'lifetime'];
        if (!in_array($status, $allowedStatuses)) {
            throw new Exception("Invalid status specified.");
        }

        // Fetch existing subscription
        $stmtCheck = $this->db->prepare("SELECT * FROM institution_subscriptions WHERE institution_id = :college_id LIMIT 1");
        $stmtCheck->execute(['college_id' => $collegeId]);
        $sub = $stmtCheck->fetch(PDO::FETCH_ASSOC);

        $isLifetime = ($status === 'lifetime') ? 1 : 0;
        
        $startDate = $options['start_date'] ?? ($sub['start_date'] ?? date('Y-m-d'));
        $bonusDays = isset($options['bonus_days']) ? (int)$options['bonus_days'] : ($sub['bonus_days'] ?? 0);
        
        // Calculate new expiry date if provided
        $expiryDate = $options['expiry_date'] ?? ($sub['expiry_date'] ?? null);
        
        if ($status === 'active' && empty($expiryDate)) {
            // Default to 1 month from start date if active and no expiry is known
            $dt = new DateTime($startDate);
            $dt->modify('+1 month');
            $expiryDate = $dt->format('Y-m-d');
        }

        $finalExpiryDate = null;
        if (!empty($expiryDate)) {
            $dtFinal = new DateTime($expiryDate);
            if ($bonusDays > 0) {
                $dtFinal->modify("+{$bonusDays} days");
            }
            $finalExpiryDate = $dtFinal->format('Y-m-d');
        }

        if ($sub) {
            $stmt = $this->db->prepare("
                UPDATE institution_subscriptions
                SET status = :status,
                    is_lifetime = :is_lifetime,
                    start_date = :start_date,
                    expiry_date = :expiry_date,
                    bonus_days = :bonus_days,
                    final_expiry_date = :final_expiry_date
                WHERE institution_id = :college_id
            ");
        } else {
            $stmt = $this->db->prepare("
                INSERT INTO institution_subscriptions (institution_id, status, is_lifetime, start_date, expiry_date, bonus_days, final_expiry_date)
                VALUES (:college_id, :status, :is_lifetime, :start_date, :expiry_date, :bonus_days, :final_expiry_date)
            ");
        }

        $stmt->execute([
            'college_id' => $collegeId,
            'status' => $status,
            'is_lifetime' => $isLifetime,
            'start_date' => $startDate,
            'expiry_date' => $expiryDate,
            'bonus_days' => $bonusDays,
            'final_expiry_date' => $finalExpiryDate
        ]);

        return true;
    }

    public function getDashboardMetrics()
    {
        $today = new DateTime('today');

        // Fetch all colleges and their current subscription data
        $stmt = $this->db->query("
            SELECT c.id as college_id, c.name as college_name, isub.id as sub_id, isub.plan_id, isub.status, isub.start_date, isub.expiry_date, isub.bonus_days, isub.final_expiry_date, isub.is_lifetime, sp.name as plan_name
            FROM colleges c
            LEFT JOIN institution_subscriptions isub ON c.id = isub.institution_id
            LEFT JOIN subscription_plans sp ON isub.plan_id = sp.id
        ");
        $institutions = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $counts = [
            'total' => count($institutions),
            'active' => 0,
            'trial' => 0,
            'expired' => 0,
            'suspended' => 0,
            'lifetime' => 0,
            'free' => 0
        ];

        $expiring30 = [];
        $expiring15 = [];
        $expiring7 = [];
        $expiredList = [];
        $planDistribution = [];

        foreach ($institutions as $inst) {
            $status = $inst['status'] ?? 'trial';
            $isLifetime = (bool)($inst['is_lifetime'] ?? false);
            $finalExpiryDate = $inst['final_expiry_date'] ?? null;
            $remainingDays = 0;

            if ($isLifetime || $status === 'lifetime') {
                $computedStatus = 'lifetime';
                $remainingDays = 9999;
            } elseif ($status === 'free') {
                $computedStatus = 'free';
                $remainingDays = 9999;
            } elseif ($status === 'suspended') {
                $computedStatus = 'suspended';
                $remainingDays = 0;
            } else {
                if (!empty($finalExpiryDate)) {
                    $expiry = new DateTime($finalExpiryDate);
                    $diff = $today->diff($expiry);
                    $remainingDays = (int)$diff->format('%r%a');

                    if ($remainingDays < 0) {
                        $computedStatus = 'expired';
                    } else {
                        $computedStatus = $status; // 'active' or 'trial'
                    }
                } else {
                    // If trial has no expiry set, let's treat it as active trial with 14 days remaining from creation if created_at is available, or expired
                    $computedStatus = 'expired';
                }
            }

            // Increment status count
            if (array_key_exists($computedStatus, $counts)) {
                $counts[$computedStatus]++;
            }

            $instInfo = [
                'id' => $inst['college_id'],
                'name' => $inst['college_name'],
                'plan_name' => $inst['plan_name'] ?: ($computedStatus === 'lifetime' ? 'Lifetime' : ($computedStatus === 'free' ? 'Free' : 'Trial')),
                'remaining_days' => $remainingDays,
                'final_expiry_date' => $finalExpiryDate
            ];

            // Expiry Monitoring
            if ($computedStatus === 'expired') {
                $expiredList[] = $instInfo;
            } elseif (in_array($computedStatus, ['active', 'trial']) && $remainingDays >= 0) {
                if ($remainingDays <= 7) {
                    $expiring7[] = $instInfo;
                    $expiring15[] = $instInfo;
                    $expiring30[] = $instInfo;
                } elseif ($remainingDays <= 15) {
                    $expiring15[] = $instInfo;
                    $expiring30[] = $instInfo;
                } elseif ($remainingDays <= 30) {
                    $expiring30[] = $instInfo;
                }
            }

            // Plan distribution (only for active plans)
            if (in_array($computedStatus, ['active', 'lifetime', 'free'])) {
                $pName = $instInfo['plan_name'];
                $planDistribution[$pName] = ($planDistribution[$pName] ?? 0) + 1;
            }
        }

        // Fetch Revenue: Current Month
        $stmtRevMonth = $this->db->query("
            SELECT SUM(amount) as total FROM subscription_transactions
            WHERE payment_status = 'completed' AND MONTH(paid_at) = MONTH(CURRENT_DATE()) AND YEAR(paid_at) = YEAR(CURRENT_DATE())
        ");
        $revenueMonth = (float)($stmtRevMonth->fetchColumn() ?? 0);

        // Fetch Revenue: Current Year
        $stmtRevYear = $this->db->query("
            SELECT SUM(amount) as total FROM subscription_transactions
            WHERE payment_status = 'completed' AND YEAR(paid_at) = YEAR(CURRENT_DATE())
        ");
        $revenueYear = (float)($stmtRevYear->fetchColumn() ?? 0);

        // Fetch Monthly Revenue (last 12 months)
        $stmtMonthly = $this->db->query("
            SELECT DATE_FORMAT(paid_at, '%Y-%m') as month, SUM(amount) as total
            FROM subscription_transactions
            WHERE payment_status = 'completed'
            GROUP BY DATE_FORMAT(paid_at, '%Y-%m')
            ORDER BY month DESC
            LIMIT 12
        ");
        $monthlyRevenue = $stmtMonthly->fetchAll(PDO::FETCH_ASSOC);

        // Fetch Yearly Revenue
        $stmtYearly = $this->db->query("
            SELECT YEAR(paid_at) as year, SUM(amount) as total
            FROM subscription_transactions
            WHERE payment_status = 'completed'
            GROUP BY YEAR(paid_at)
            ORDER BY year DESC
        ");
        $yearlyRevenue = $stmtYearly->fetchAll(PDO::FETCH_ASSOC);

        // Renewal Rate Calculation
        $stmtPaying = $this->db->query("
            SELECT COUNT(DISTINCT institution_id) as paying_count, COUNT(*) as total_count 
            FROM subscription_transactions 
            WHERE payment_status = 'completed'
        ");
        $txStats = $stmtPaying->fetch(PDO::FETCH_ASSOC);
        $payingCount = (int)($txStats['paying_count'] ?? 0);
        $totalCount = (int)($txStats['total_count'] ?? 0);
        $renewalRate = 0.0;
        if ($payingCount > 0) {
            $renewalRate = (($totalCount - $payingCount) / $payingCount) * 100;
        }

        return [
            'metrics' => [
                'total_institutions' => $counts['total'],
                'active_institutions' => $counts['active'],
                'trial_institutions' => $counts['trial'],
                'expired_institutions' => $counts['expired'],
                'lifetime_institutions' => $counts['lifetime'],
                'free_institutions' => $counts['free'],
                'suspended_institutions' => $counts['suspended'],
                'revenue_this_month' => $revenueMonth,
                'revenue_this_year' => $revenueYear
            ],
            'expiry_monitoring' => [
                'expiring_30_days' => $expiring30,
                'expiring_15_days' => $expiring15,
                'expiring_7_days' => $expiring7,
                'expired_list' => $expiredList
            ],
            'revenue_insights' => [
                'monthly_revenue' => $monthlyRevenue,
                'yearly_revenue' => $yearlyRevenue,
                'plan_distribution' => $planDistribution,
                'renewal_rate' => round($renewalRate, 2)
            ]
        ];
    }

    public function sendExpiryReminders()
    {
        $metrics = $this->getDashboardMetrics();
        $notifService = new NotificationService();
        
        $notificationsSent = 0;

        // Group lists of colleges to inspect
        $monitoringGroups = [
            '30' => $metrics['expiry_monitoring']['expiring_30_days'],
            '15' => $metrics['expiry_monitoring']['expiring_15_days'],
            '7' => $metrics['expiry_monitoring']['expiring_7_days'],
            '0' => $metrics['expiry_monitoring']['expired_list']
        ];

        foreach ($monitoringGroups as $dayKey => $list) {
            foreach ($list as $college) {
                $rem = (int)$college['remaining_days'];
                
                // Pinpoint matching days to avoid duplicate spamming
                if ($dayKey === '30' && $rem !== 30) continue;
                if ($dayKey === '15' && $rem !== 15) continue;
                if ($dayKey === '7' && $rem !== 7) continue;
                if ($dayKey === '0' && $rem !== 0 && $rem !== -7) continue;

                // Message logic
                if ($rem === 30) {
                    $msg = "Subscription Alert: Your FlowSync subscription for {$college['name']} will expire in 30 days.";
                } elseif ($rem === 15) {
                    $msg = "Subscription Alert: Your FlowSync subscription for {$college['name']} will expire in 15 days. Renew now to avoid service interruption.";
                } elseif ($rem === 7) {
                    $msg = "Urgent: Your FlowSync subscription for {$college['name']} will expire in 7 days.";
                } elseif ($rem === 0) {
                    $msg = "Subscription Expired: Your FlowSync subscription for {$college['name']} has expired today.";
                } elseif ($rem === -7) {
                    $msg = "Subscription Blocked: Your grace period has ended. {$college['name']} is now locked in Read-Only Mode.";
                } else {
                    continue;
                }

                // Fetch Institution Admins (role_id = 4 or role_name is INSTITUTION_ADMIN)
                $stmtIA = $this->db->prepare("
                    SELECT id FROM users 
                    WHERE college_id = :cid AND (role_id = 4 OR role_id IN (SELECT id FROM roles WHERE name IN ('INSTITUTION_ADMIN', 'Institution Admin')))
                ");
                $stmtIA->execute(['cid' => $college['id']]);
                $admins = $stmtIA->fetchAll(PDO::FETCH_COLUMN);

                foreach ($admins as $adminId) {
                    $notifService->send($adminId, 'SUBSCRIPTION_ALERT', $msg);
                    $notificationsSent++;
                }
            }
        }
        
        return $notificationsSent;
    }
}

