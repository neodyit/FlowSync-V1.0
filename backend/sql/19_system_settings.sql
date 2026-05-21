CREATE TABLE IF NOT EXISTS system_settings (
    setting_key VARCHAR(50) PRIMARY KEY,
    setting_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT NULL,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed default settings
INSERT IGNORE INTO system_settings (setting_key, setting_value) VALUES 
('maintenance_mode', 'false'),
('pause_new_tasks', 'false'),
('global_multiplier', '1.0'),
('max_bonus_points', '5');
