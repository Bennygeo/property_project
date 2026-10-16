USE mannidam_property_db;

-- Insert or update Admin credentials for Ezhil, Ram, and Benny
-- Designated Passwords:
--   Ezhil: ezhil@mannidam.com / ezhil@2026
--   Ram:   ram@mannidam.com   / ram@2026
--   Benny: benny@mannidam.com / benny@2026
INSERT INTO users (id, name, email, phone, password_hash, role, points_balance)
VALUES 
  (101, 'Ezhil', 'ezhil@mannidam.com', '+91 94440 00001', '$2y$10$s8batNschbmVOPeuKPmAQO2fe3UfDbJ8qm.VvHaI74k.K7zuVAu8y', 'admin', 5000),
  (102, 'Ram', 'ram@mannidam.com', '+91 94440 00002', '$2y$10$tN1.taAgnIhI/0Z94zyp6Ojb2h1sKAFx9IuXLeZi5swSWTwBLkZ1G', 'admin', 5000),
  (103, 'Benny', 'benny@mannidam.com', '+91 94440 00003', '$2y$10$FiDMFPcOMyjptraT5aqkYe.pvJaXj0mwqId8Jd2M8PnZq5HsWKwM6', 'admin', 5000)
ON DUPLICATE KEY UPDATE 
  name = VALUES(name),
  role = 'admin',
  email = VALUES(email),
  password_hash = VALUES(password_hash);

-- Update sample properties so they have attribution to these new admin names:
UPDATE properties 
SET submitted_by_user_id = 101, 
    submitted_by_name = 'Ezhil', 
    submitted_by_role = 'admin' 
WHERE id = 'prop-admin-peer-01';
