-- backend/sql/20_user_engagement.sql

-- Stores the batch IDs to prevent duplicate processing if network retries happen
CREATE TABLE IF NOT EXISTS `engagement_batches` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `batch_id` VARCHAR(100) NOT NULL UNIQUE,
    `user_id` INT NOT NULL,
    `uploaded_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Stores the actual engagement sessions/data
CREATE TABLE IF NOT EXISTS `engagement_sessions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `batch_id` VARCHAR(100) NOT NULL,
    `user_id` INT NOT NULL,
    `page_url` VARCHAR(255) NOT NULL,
    `active_time_seconds` INT DEFAULT 0,
    `interaction_count` INT DEFAULT 0,
    `device_info` JSON NULL,
    `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`batch_id`) REFERENCES `engagement_batches`(`batch_id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add index to speed up admin analytics
CREATE INDEX `idx_engagement_sessions_date` ON `engagement_sessions` (`timestamp`);
CREATE INDEX `idx_engagement_sessions_user` ON `engagement_sessions` (`user_id`);
