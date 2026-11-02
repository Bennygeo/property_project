-- =====================================================================
-- ADMIN USERS SEED / MIGRATION (Ezhil, Ram, Benny)
-- Safe / Idempotent: Operates on active database in phpMyAdmin or CLI
-- =====================================================================

-- Ensure password_hash column exists
SET @dbname = DATABASE();
SET @tablename = 'users';
SET @columnname = 'password_hash';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT 1 AS column_already_exists',
  'ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) DEFAULT NULL AFTER phone;'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Insert or update Admin credentials for Ezhil, Ram, and Benny
-- Designated Passwords:
--   Ezhil: ezhil@mannidam.com / ezhil@2026
--   Ram:   ram@mannidam.com   / ram@2026
--   Benny: benny@mannidam.com / benny@2026
INSERT INTO users (id, name, email, phone, password_hash, role, points_balance)
VALUES 
  (101, 'Ezhil', 'ezhil@mannidam.com', '+91 94440 10001', '$2y$10$s8batNschbmVOPeuKPmAQO2fe3UfDbJ8qm.VvHaI74k.K7zuVAu8y', 'admin', 5000),
  (102, 'Ram', 'ram@mannidam.com', '+91 94440 10002', '$2y$10$tN1.taAgnIhI/0Z94zyp6Ojb2h1sKAFx9IuXLeZi5swSWTwBLkZ1G', 'admin', 5000),
  (103, 'Benny', 'benny@mannidam.com', '+91 94440 00003', '$2y$10$FiDMFPcOMyjptraT5aqkYe.pvJaXj0mwqId8Jd2M8PnZq5HsWKwM6', 'admin', 5000)
ON DUPLICATE KEY UPDATE 
  name = VALUES(name),
  role = 'admin',
  email = VALUES(email),
  password_hash = VALUES(password_hash);
