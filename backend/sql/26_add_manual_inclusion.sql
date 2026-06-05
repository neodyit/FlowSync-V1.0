-- Migration: Add is_manually_included column to task_assignments table
ALTER TABLE task_assignments ADD COLUMN is_manually_included BOOLEAN DEFAULT FALSE;
