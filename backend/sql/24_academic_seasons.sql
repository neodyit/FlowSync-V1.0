-- Create academic_seasons table
CREATE TABLE IF NOT EXISTS academic_seasons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    college_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    type ENUM('Semester', 'Academic Year', 'Custom') NOT NULL,
    description TEXT,
    status ENUM('Active', 'Inactive', 'Archived') NOT NULL DEFAULT 'Inactive',
    is_default TINYINT(1) DEFAULT 0,
    is_locked TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Alter tasks table to support season_id mapping
ALTER TABLE tasks ADD COLUMN season_id INT NULL AFTER department_id;
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_season FOREIGN KEY (season_id) REFERENCES academic_seasons(id) ON DELETE SET NULL;

-- Alter leaderboard_points table to support season isolation
ALTER TABLE leaderboard_points DROP INDEX user_id;
ALTER TABLE leaderboard_points ADD COLUMN season_id INT NOT NULL AFTER user_id;
ALTER TABLE leaderboard_points ADD CONSTRAINT fk_leaderboard_season FOREIGN KEY (season_id) REFERENCES academic_seasons(id) ON DELETE CASCADE;
ALTER TABLE leaderboard_points ADD UNIQUE KEY uq_user_season (user_id, season_id);
