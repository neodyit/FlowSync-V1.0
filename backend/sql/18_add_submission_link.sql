-- Migration file to add submission_link column to task_assignments table to support Faculty submitting external resource/reference links
ALTER TABLE task_assignments ADD COLUMN submission_link VARCHAR(512) NULL;
