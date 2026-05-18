CREATE TABLE IF NOT EXISTS task_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    reviewer_id INT NOT NULL,
    remarks TEXT,
    points INT DEFAULT 0,
    bonus_points INT DEFAULT 0,
    status ENUM('Approved', 'Rejected', 'Rework Required') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
