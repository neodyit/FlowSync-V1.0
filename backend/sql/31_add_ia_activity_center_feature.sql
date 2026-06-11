-- Migration: Add ia_audit_log_visibility feature to all existing colleges
INSERT IGNORE INTO college_features (college_id, feature_key, is_enabled)
SELECT id, 'ia_audit_log_visibility', 1 FROM colleges;
