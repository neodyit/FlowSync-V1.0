-- Migration file to convert deadline extension columns to DATETIME to support time-level accuracy
ALTER TABLE deadline_extensions MODIFY current_deadline DATETIME NOT NULL;
ALTER TABLE deadline_extensions MODIFY requested_deadline DATETIME NOT NULL;
