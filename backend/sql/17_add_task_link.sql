-- Migration file to add task_link column to tasks table to support HOD adding external resource/reference links
ALTER TABLE tasks ADD COLUMN task_link VARCHAR(512) NULL;
