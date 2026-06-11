-- Migration to add code and description columns to departments table
-- Standard SQL syntax (use this if IF NOT EXISTS is not supported by your MySQL version)

ALTER TABLE departments ADD COLUMN code VARCHAR(50) NULL AFTER name;
ALTER TABLE departments ADD COLUMN description TEXT NULL AFTER code;
