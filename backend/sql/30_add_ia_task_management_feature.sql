-- Migration: Add allow_ia_task_management feature to all existing colleges
INSERT IGNORE INTO college_features (college_id, feature_key, is_enabled)
SELECT id, 'allow_ia_task_management', 1 FROM colleges;
