-- Migration to add task_link column to tasks table
ALTER TABLE tasks ADD COLUMN task_link VARCHAR(512) NULL AFTER status;
