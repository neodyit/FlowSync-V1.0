-- Seed new profile completion feature flags for all colleges
INSERT IGNORE INTO college_features (college_id, feature_key, is_enabled)
SELECT id, 'profile_completion', 1 FROM colleges;

INSERT IGNORE INTO college_features (college_id, feature_key, is_enabled)
SELECT id, 'profile_completion_strict', 0 FROM colleges;
