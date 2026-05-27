-- Migration Script for Faculty Groups / Broadcast Lists

-- Create faculty_groups table
CREATE TABLE IF NOT EXISTS faculty_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hod_id INT NOT NULL,
    department_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (hod_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create faculty_group_members table
CREATE TABLE IF NOT EXISTS faculty_group_members (
    group_id INT NOT NULL,
    faculty_id INT NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, faculty_id),
    FOREIGN KEY (group_id) REFERENCES faculty_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
