-- Migration: Add user settings and profile columns
ALTER TABLE users 
ADD COLUMN notification_settings JSON DEFAULT NULL,
ADD COLUMN quiet_hours_start TIME DEFAULT NULL,
ADD COLUMN quiet_hours_end TIME DEFAULT NULL,
ADD COLUMN expertise_tags TEXT DEFAULT NULL,
ADD COLUMN office_hours VARCHAR(255) DEFAULT NULL,
ADD COLUMN availability_status VARCHAR(50) DEFAULT 'Ready',
ADD COLUMN merit_goal INT DEFAULT 100;
