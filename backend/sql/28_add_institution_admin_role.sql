-- Migration to add INSTITUTION_ADMIN role to the database
-- Avoids duplicate insertion if run multiple times

INSERT INTO roles (name) 
SELECT 'INSTITUTION_ADMIN' FROM DUAL 
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'INSTITUTION_ADMIN');
