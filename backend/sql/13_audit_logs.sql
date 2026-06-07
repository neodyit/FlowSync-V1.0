CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(255) NOT NULL,
    resource VARCHAR(255) NULL,
    resource_id VARCHAR(50) NULL,
    details LONGTEXT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    request_method VARCHAR(10) NULL,
    request_uri TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    KEY idx_user_id (user_id),
    KEY idx_action (action),
    KEY idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
