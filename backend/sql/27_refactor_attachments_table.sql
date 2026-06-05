-- Refactor attachments table to store metadata and remove public path references
ALTER TABLE attachments CHANGE COLUMN file_name original_name VARCHAR(255) NOT NULL;
ALTER TABLE attachments ADD COLUMN stored_name VARCHAR(255) NOT NULL AFTER original_name;
ALTER TABLE attachments CHANGE COLUMN mime_type file_type VARCHAR(100) NOT NULL;
ALTER TABLE attachments CHANGE COLUMN entity_id task_id INT NOT NULL;

-- Add institution_id as NULL first to avoid foreign key failures on existing records
ALTER TABLE attachments ADD COLUMN institution_id INT NULL AFTER task_id;

-- Clean up any orphaned attachments that point to tasks that do not exist (prevents foreign key failure #1452)
DELETE FROM attachments WHERE task_id NOT IN (SELECT id FROM tasks);

-- Populate institution_id from tasks table for any existing records
UPDATE attachments a 
JOIN tasks t ON a.task_id = t.id 
SET a.institution_id = t.college_id;

-- Now make it NOT NULL and add the foreign key constraint
ALTER TABLE attachments MODIFY COLUMN institution_id INT NOT NULL;
ALTER TABLE attachments ADD CONSTRAINT fk_attachments_institution FOREIGN KEY (institution_id) REFERENCES colleges(id) ON DELETE CASCADE;
ALTER TABLE attachments DROP COLUMN file_path;

-- File Download Audit Logging table
CREATE TABLE IF NOT EXISTS file_downloads_audit (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    institution_id INT NOT NULL,
    task_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    download_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (institution_id) REFERENCES colleges(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
