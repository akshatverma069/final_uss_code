-- Migration script to add encryption_salt column to users table
-- Run this script on your MySQL database

USE password_manager_app;

-- Check if column exists, if not add it
SET @dbname = DATABASE();
SET @tablename = "users";
SET @columnname = "encryption_salt";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 'Column already exists.' AS result;",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " VARBINARY(32) NULL;")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- For existing users without encryption_salt, generate a random salt
-- Note: This will be handled by the application code when they next login
-- But we can set a placeholder if needed (application will regenerate on login)

SELECT 'Migration completed. encryption_salt column added to users table.' AS result;

