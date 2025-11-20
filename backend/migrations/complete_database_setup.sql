DROP DATABASE IF EXISTS password_manager_app;

CREATE DATABASE password_manager_app;

USE password_manager_app;

-- USERS TABLE (with encryption_salt)
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100),
    pswd VARCHAR(100),
    grp JSON,
    question_id INT,
    answers TEXT(100),
    encryption_salt VARBINARY(32) NULL
);

-- QUESTIONS
CREATE TABLE questions(
    question_id INT PRIMARY KEY,
    question_text TEXT 
);

-- ADMINS
CREATE TABLE admins(
    admin_id INT PRIMARY KEY,
    admin_username VARCHAR(100),
    pswd_admin VARCHAR(100)
);

-- FAQ
CREATE TABLE faqs(
    faq_id INT PRIMARY KEY,
    question TEXT,
    answer TEXT
);

-- PASSWORDS TABLE (with AUTO_INCREMENT)
CREATE TABLE passwords(
    password_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    application_name TEXT,
    application_type TEXT,
    account_user_name TEXT,
    application_password VARCHAR(100),
    datetime_added DATETIME DEFAULT CURRENT_TIMESTAMP,
    pswd_strength INT, 
    year1 VARCHAR(100) DEFAULT NULL,
    year2 VARCHAR(100) DEFAULT NULL,
    year3 VARCHAR(100) DEFAULT NULL,
    year4 VARCHAR(100) DEFAULT NULL,
    year5 VARCHAR(100) DEFAULT NULL,
    FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE 
);

-- GROUP MEMBERS
CREATE TABLE group_members(
    group_name VARCHAR(500),
    user_id INT,
    admin_status BOOL,
    password_id INT,
    PRIMARY KEY(group_name, user_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (password_id) REFERENCES passwords(password_id) ON DELETE CASCADE
);

-- PASSWORD SHARES (for multiple password sharing fix)
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

-- INSERT QUESTIONS
INSERT INTO questions (question_id, question_text) VALUES
(1,  'What was the name of your first pet?'),
(2,  'What is your mother\'s maiden name?'),
(3,  'In what city were you born?'),
(4,  'What was the name of your elementary school?'),
(5,  'What is your favorite book?'),
(6,  'What is your favorite food?'),
(7,  'What was the make of your first car?'),
(8,  'What is your father\'s middle name?'),
(9,  'What street did you grow up on?'),
(10, 'What is the name of your childhood best friend?'),
(11, 'What was your first employer?'),
(12, 'What is your favorite color?'),
(13, 'Where did you go on your first vacation?'),
(14, 'What was the name of your first teacher?'),
(15, 'What was the name of your high school mascot?');

-- INSERT USERS
INSERT INTO users (user_id, username, pswd, grp, question_id, answers) VALUES
(1,  'alice',     'sha256$3a7bd3f2c1e4b8d9a6f4b2c1e9d0f7a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e', '[{"group_id":1,"name":"tech_club","role":"member"},{"group_id":3,"name":"book_club","role":"admin"}]', 1,  'mittens'),
(2,  'bob',       'sha256$9f2e1d3c4b5a6f7890a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f89012345678', '[{"group_id":2,"name":"dev_team","role":"admin"}]', 2,  'kumar'),
(3,  'charlie',   'sha256$a1b2c3d4e5f6978877665544332211aa99bb88cc77dd66ee55ff44aa33bb22cc', '[{"group_id":1,"name":"tech_club","role":"admin"},{"group_id":4,"name":"sports","role":"member"}]', 3,  'mumbai'),
(4,  'diana',     'sha256$b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8901234567890abcdef1234567890ab', '[{"group_id":5,"name":"design","role":"member"}]', 4,  'willow_elementary'),
(5,  'akshat',    'sha256$c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8901234567890abcdef1234567890abcd', '[{"group_id":2,"name":"dev_team","role":"member"},{"group_id":6,"name":"club_admins","role":"admin"}]', 5,  'the_alchemist'),
(6,  'eve',       'sha256$d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8901234567890abcdef1234567890abcde', '[{"group_id":3,"name":"book_club","role":"member"}]', 6,  'pizza'),
(7,  'frank',     'sha256$e5f6a7b8c9d0e1f2a3b4c5d6e7f8901234567890abcdef1234567890abcdef', '[{"group_id":4,"name":"sports","role":"admin"}]', 7,  'honda'),
(8,  'grace',     'sha256$f6a7b8c9d0e1f2a3b4c5d6e7f8901234567890abcdef1234567890abcdef01', '[{"group_id":5,"name":"design","role":"admin"},{"group_id":1,"name":"tech_club","role":"member"}]', 8,  'rajesh'),
(9,  'henry',     'sha256$07a8b9c0d1e2f3a4b5c6d7e8f90123456789abcdef0123456789abcdef012345', '[{"group_id":6,"name":"club_admins","role":"member"}]', 9,  'oak_street'),
(10, 'ivy',       'sha256$18b9c0d1e2f3a4b5c6d7e8f90123456789abcdef0123456789abcdef01234567', '[{"group_id":7,"name":"interns","role":"member"},{"group_id":2,"name":"dev_team","role":"member"}]', 10, 'samir'),
(11, 'jack',      'sha256$29c0d1e2f3a4b5c6d7e8f90123456789abcdef0123456789abcdef0123456789', '[{"group_id":7,"name":"interns","role":"admin"}]', 11, 'startup_inc'),
(12, 'karen',     'sha256$3ad1e2f3a4b5c6d7e8f90123456789abcdef0123456789abcdef0123456789a', '[{"group_id":8,"name":"hr","role":"member"}]', 12, 'blue'),
(13, 'liam',      'sha256$4be2f3a4b5c6d7e8f90123456789abcdef0123456789abcdef0123456789ab', '[{"group_id":9,"name":"travel","role":"member"}]', 13, 'goa'),
(14, 'maria',     'sha256$5cf3a4b5c6d7e8f90123456789abcdef0123456789abcdef0123456789abc', '[{"group_id":5,"name":"design","role":"member"},{"group_id":9,"name":"travel","role":"admin"}]', 14, 'mrs_singh'),
(15, 'nathan',    'sha256$6d04b5c6d7e8f90123456789abcdef0123456789abcdef0123456789abcd012', '[{"group_id":4,"name":"sports","role":"member"}]', 15, 'tigers');

-- INSERT ADMINS
INSERT INTO admins (admin_id, admin_username, pswd_admin) VALUES
(1, 'superadmin', 'sha256$9d8f7c6b5a4a392817263544132415263748596a1b2c3d4e5f6a7b8c9d0e1f2'),
(2, 'akshat_admin', 'sha256$2b4c6d8e9f0a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5061728394a'),
(3, 'grace_admin', 'sha256$1a2b3c4d5e6f7081928374655647382910abcdeffedcba0123456789abcdef12'),
(4, 'tech_admin', 'sha256$0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1908273645546372819abcdef0'),
(5, 'security_admin', 'sha256$abcdef9876543210fedcba0192837465546372810a9b8c7d6e5f4a3b2c1d0e9'),
(6, 'system_admin', 'sha256$f0e1d2c3b4a5968778695a4b3c2d1e0f9a8b7c6d5e4f3a291817263544132415'),
(7, 'backup_admin', 'sha256$1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'),
(8, 'dev_admin', 'sha256$abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd'),
(9, 'hr_admin', 'sha256$9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef'),
(10, 'design_admin', 'sha256$fedcba0123456789fedcba0123456789fedcba0123456789fedcba0123456789'),
(11, 'network_admin', 'sha256$aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899'),
(12, 'ops_admin', 'sha256$ffeeddccbbaa99887766554433221100ffeeddccbbaa99887766554433221100'),
(13, 'data_admin', 'sha256$abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd'),
(14, 'app_admin', 'sha256$a1b2c3d4e5f6978877665544332211aa99bb88cc77dd66ee55ff44aa33bb22cc'),
(15, 'book_admin', 'sha256$c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8901234567890abcdef1234567890abcd');

-- INSERT FAQS
INSERT INTO faqs (faq_id, question, answer) VALUES
(1, 'How do I reset my password?', 'Go to Settings > Account > Reset Password.'),
(2, 'How can I share passwords with my group?', 'Navigate to the group page and click "Share Password".'),
(3, 'Is my data encrypted?', 'Yes, all data is AES-256 encrypted before storage.'),
(4, 'How do I delete my account?', 'Contact admin or go to Account Settings > Delete Account.'),
(5, 'Can I view my password history?', 'Yes, under each password entry, previous versions are visible.'),
(6, 'How can I recover a deleted password?', 'Deleted passwords can be restored within 7 days from Trash.'),
(7, 'Can I have multiple admins in a group?', 'Yes, multiple members can have admin privileges.'),
(8, 'How do I add a new group?', 'Go to Groups > Create New Group.'),
(9, 'What is password strength score?', 'It indicates how secure your password is (0–100).'),
(10, 'How often should I change passwords?', 'It\'s recommended every 90 days.'),
(11, 'Can admins see my personal passwords?', 'No, only shared passwords are visible to admins.'),
(12, 'How to enable two-factor authentication?', 'Go to Settings > Security > Enable 2FA.'),
(13, 'Why is my password marked weak?', 'It may be too short or similar to previous passwords.'),
(14, 'Can I import passwords from browsers?', 'Yes, import from Chrome or Firefox via Settings > Import.'),
(15, 'What happens when a user leaves a group?', 'Access to shared passwords is automatically revoked.');

