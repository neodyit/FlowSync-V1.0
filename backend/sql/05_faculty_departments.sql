CREATE TABLE IF NOT EXISTS faculty_departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    department_id INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    UNIQUE KEY (user_id, department_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
