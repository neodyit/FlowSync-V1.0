CREATE TABLE IF NOT EXISTS push_notices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hod_id INT NOT NULL,
    department_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    points INT DEFAULT 0,
    attachment_url VARCHAR(255) NULL,
    target_type VARCHAR(50) DEFAULT 'ALL',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hod_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE notifications ADD COLUMN push_notice_id INT NULL;
ALTER TABLE notifications ADD COLUMN attachment_url VARCHAR(255) NULL;
ALTER TABLE notifications ADD CONSTRAINT fk_notifications_push_notice FOREIGN KEY (push_notice_id) REFERENCES push_notices(id) ON DELETE CASCADE;
