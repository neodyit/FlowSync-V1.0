-- Alter colleges table to add enabled status and auto-accept settings
ALTER TABLE colleges 
ADD COLUMN is_enabled TINYINT(1) DEFAULT 1,
ADD COLUMN auto_accept_tasks TINYINT(1) DEFAULT 1;

-- Alter departments table to add enabled status
ALTER TABLE departments
ADD COLUMN is_enabled TINYINT(1) DEFAULT 1;

-- Create college_features table
CREATE TABLE IF NOT EXISTS college_features (
    college_id INT NOT NULL,
    feature_key VARCHAR(100) NOT NULL,
    is_enabled TINYINT(1) DEFAULT 1,
    PRIMARY KEY (college_id, feature_key),
    FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed default features for all existing colleges
-- Reporting Features
INSERT IGNORE INTO college_features (college_id, feature_key, is_enabled)
SELECT id, 'reporting_personalized_faculty', 1 FROM colleges;
INSERT IGNORE INTO college_features (college_id, feature_key, is_enabled)
SELECT id, 'reporting_department', 1 FROM colleges;
INSERT IGNORE INTO college_features (college_id, feature_key, is_enabled)
SELECT id, 'reporting_institution', 1 FROM colleges;
INSERT IGNORE INTO college_features (college_id, feature_key, is_enabled)
SELECT id, 'reporting_historical', 1 FROM colleges;
INSERT IGNORE INTO college_features (college_id, feature_key, is_enabled)
SELECT id, 'reporting_performance_analytics', 1 FROM colleges;

-- Season Features
INSERT IGNORE INTO college_features (college_id, feature_key, is_enabled)
SELECT id, 'season_management', 1 FROM colleges;
INSERT IGNORE INTO college_features (college_id, feature_key, is_enabled)
SELECT id, 'season_comparison_reports', 1 FROM colleges;
INSERT IGNORE INTO college_features (college_id, feature_key, is_enabled)
SELECT id, 'season_historical_analytics', 1 FROM colleges;
INSERT IGNORE INTO college_features (college_id, feature_key, is_enabled)
SELECT id, 'season_locking', 1 FROM colleges;

-- Leaderboard Features
INSERT IGNORE INTO college_features (college_id, feature_key, is_enabled)
SELECT id, 'leaderboard_faculty', 1 FROM colleges;
INSERT IGNORE INTO college_features (college_id, feature_key, is_enabled)
SELECT id, 'leaderboard_department', 1 FROM colleges;
INSERT IGNORE INTO college_features (college_id, feature_key, is_enabled)
SELECT id, 'leaderboard_institution_rankings', 1 FROM colleges;
INSERT IGNORE INTO college_features (college_id, feature_key, is_enabled)
SELECT id, 'leaderboard_performance_awards', 1 FROM colleges;

-- Task Management Features
INSERT IGNORE INTO college_features (college_id, feature_key, is_enabled)
SELECT id, 'task_group', 1 FROM colleges;
INSERT IGNORE INTO college_features (college_id, feature_key, is_enabled)
SELECT id, 'task_broadcast', 1 FROM colleges;
INSERT IGNORE INTO college_features (college_id, feature_key, is_enabled)
SELECT id, 'task_acceptance_workflow', 1 FROM colleges;
INSERT IGNORE INTO college_features (college_id, feature_key, is_enabled)
SELECT id, 'task_auto_accept', 1 FROM colleges;
INSERT IGNORE INTO college_features (college_id, feature_key, is_enabled)
SELECT id, 'task_reminder_system', 1 FROM colleges;
INSERT IGNORE INTO college_features (college_id, feature_key, is_enabled)
SELECT id, 'task_deadline_tracking', 1 FROM colleges;

-- Collaboration Features
INSERT IGNORE INTO college_features (college_id, feature_key, is_enabled)
SELECT id, 'collab_member_visibility', 1 FROM colleges;
INSERT IGNORE INTO college_features (college_id, feature_key, is_enabled)
SELECT id, 'collab_profile_access', 1 FROM colleges;
INSERT IGNORE INTO college_features (college_id, feature_key, is_enabled)
SELECT id, 'collab_tools', 1 FROM colleges;

-- Notification Features
INSERT IGNORE INTO college_features (college_id, feature_key, is_enabled)
SELECT id, 'notice_popups', 1 FROM colleges;
INSERT IGNORE INTO college_features (college_id, feature_key, is_enabled)
SELECT id, 'notice_banners', 1 FROM colleges;
INSERT IGNORE INTO college_features (college_id, feature_key, is_enabled)
SELECT id, 'notice_broadcasts', 1 FROM colleges;

-- Expand task_assignments.status enum to support 'Assigned' and 'Declined' statuses
ALTER TABLE task_assignments MODIFY COLUMN status ENUM('Assigned', 'Accepted', 'In Progress', 'Submitted', 'Approved', 'Rejected', 'Rework Required', 'Declined') COLLATE utf8mb4_general_ci DEFAULT 'Assigned';

-- Alter colleges table to add allow_task_decline setting
ALTER TABLE colleges ADD COLUMN allow_task_decline TINYINT(1) DEFAULT 1;

