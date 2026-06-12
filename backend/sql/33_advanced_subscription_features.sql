-- FlowSync Advanced Subscription Features

CREATE TABLE IF NOT EXISTS coupons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_type ENUM('percentage', 'flat') NOT NULL,
    discount_value DECIMAL(10, 2) NOT NULL,
    expiry_date DATE NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed default coupons
INSERT IGNORE INTO coupons (code, discount_type, discount_value, expiry_date, status) VALUES
('WELCOME10', 'percentage', 10.00, NULL, 'active'),
('SUMMER25', 'percentage', 25.00, NULL, 'active'),
('EARLYBIRD', 'flat', 500.00, NULL, 'active');

-- Alter institution_subscriptions to support auto-renew and referral credits
ALTER TABLE institution_subscriptions 
ADD COLUMN auto_renew TINYINT(1) DEFAULT 0 AFTER is_lifetime,
ADD COLUMN referred_by_institution_id INT NULL AFTER auto_renew,
ADD FOREIGN KEY (referred_by_institution_id) REFERENCES colleges(id) ON DELETE SET NULL;
