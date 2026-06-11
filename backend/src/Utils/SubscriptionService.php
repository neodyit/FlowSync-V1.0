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

    public function getAllPlans()
    {
        $stmt = $this->db->query("SELECT * FROM subscription_plans ORDER BY id DESC");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getActivePlans()
    {
        $stmt = $this->db->query("SELECT * FROM subscription_plans WHERE status = 'active' ORDER BY price ASC");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getPlanById($id)
    {
        $stmt = $this->db->prepare("SELECT * FROM subscription_plans WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $id]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
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

    public function assignSubscription($collegeId, $planId, $startDate = null, $customBonusDays = null)
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
}
