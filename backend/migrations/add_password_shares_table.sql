-- Migration script to add password_shares table
-- This fixes the bug where only one password can be shared per user per group
-- Run this script on your MySQL database

USE password_manager_app;

-- Create password_shares table to support multiple password shares per user per group
CREATE TABLE IF NOT EXISTS password_shares (
    share_id INT AUTO_INCREMENT PRIMARY KEY,
    group_name VARCHAR(500) NOT NULL,
    user_id INT NOT NULL,
    password_id INT NOT NULL,
    INDEX idx_group_name (group_name),
    INDEX idx_user_id (user_id),
    INDEX idx_password_id (password_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (password_id) REFERENCES passwords(password_id) ON DELETE CASCADE,
    UNIQUE KEY unique_share (group_name, user_id, password_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Migrate existing data from group_members.password_id to password_shares
-- This preserves any existing password shares
INSERT INTO password_shares (group_name, user_id, password_id)
SELECT group_name, user_id, password_id
FROM group_members
WHERE password_id IS NOT NULL
ON DUPLICATE KEY UPDATE password_id = password_id;

SELECT 'Migration completed. password_shares table created and existing data migrated.' AS result;

