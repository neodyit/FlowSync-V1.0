-- Migration: Add features column to subscription_plans table
ALTER TABLE subscription_plans ADD COLUMN features TEXT DEFAULT NULL;

-- Seed default features for the existing plans
-- Starter: limited features (leaderboard_faculty, task_reminder_system, task_deadline_tracking)
UPDATE subscription_plans 
SET features = '["leaderboard_faculty", "task_reminder_system", "task_deadline_tracking", "profile_completion", "profile_completion_strict"]' 
WHERE name = 'FlowSync Starter';

-- Growth: medium features (adds department reporting & leaderboard, task groups, collab visibility)
UPDATE subscription_plans 
SET features = '["reporting_department", "leaderboard_faculty", "leaderboard_department", "task_group", "task_reminder_system", "task_deadline_tracking", "collab_member_visibility", "collab_profile_access", "notice_popups", "profile_completion", "profile_completion_strict"]' 
WHERE name = 'FlowSync Growth';

-- Professional: advanced features (adds performance analytics, comparison reports, collaboration tools, banners)
UPDATE subscription_plans 
SET features = '["reporting_department", "reporting_performance_analytics", "season_management", "season_comparison_reports", "leaderboard_faculty", "leaderboard_department", "task_group", "task_broadcast", "task_reminder_system", "task_deadline_tracking", "collab_member_visibility", "collab_profile_access", "collab_tools", "notice_popups", "notice_banners", "allow_ia_task_management", "profile_completion", "profile_completion_strict"]' 
WHERE name = 'FlowSync Professional';

-- Enterprise: all features enabled
UPDATE subscription_plans 
SET features = '["reporting_personalized_faculty", "reporting_department", "reporting_institution", "reporting_historical", "reporting_performance_analytics", "season_management", "season_comparison_reports", "season_historical_analytics", "season_locking", "leaderboard_faculty", "leaderboard_department", "leaderboard_institution_rankings", "leaderboard_performance_awards", "task_group", "task_broadcast", "task_acceptance_workflow", "task_auto_accept", "task_reminder_system", "task_deadline_tracking", "collab_member_visibility", "collab_profile_access", "collab_tools", "notice_popups", "notice_banners", "notice_broadcasts", "allow_ia_task_management", "ia_audit_log_visibility", "profile_completion", "profile_completion_strict"]' 
WHERE name = 'FlowSync Enterprise';
