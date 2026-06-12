-- FlowSync Subscription & Billing Tables

CREATE TABLE IF NOT EXISTS subscription_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    duration_months INT NOT NULL,
    bonus_days INT DEFAULT 0,
    gateway_percentage DECIMAL(5, 2) DEFAULT 0.00,
    description TEXT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS institution_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    institution_id INT NOT NULL UNIQUE,
    plan_id INT DEFAULT NULL,
    status ENUM('free', 'trial', 'active', 'expired', 'suspended', 'lifetime') NOT NULL DEFAULT 'trial',
    start_date DATE NULL,
    expiry_date DATE NULL,
    bonus_days INT DEFAULT 0,
    final_expiry_date DATE NULL,
    is_lifetime TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (institution_id) REFERENCES colleges(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS subscription_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    institution_id INT NOT NULL,
    plan_id INT DEFAULT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    gateway_charge DECIMAL(10, 2) DEFAULT 0.00,
    transaction_id VARCHAR(255) NULL,
    payment_gateway VARCHAR(100) DEFAULT 'manual',
    payment_status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    paid_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (institution_id) REFERENCES colleges(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    institution_id INT NOT NULL,
    transaction_id INT DEFAULT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    gst_amount DECIMAL(10, 2) DEFAULT 0.00,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (institution_id) REFERENCES colleges(id) ON DELETE CASCADE,
    FOREIGN KEY (transaction_id) REFERENCES subscription_transactions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
