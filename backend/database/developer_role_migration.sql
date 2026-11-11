-- =====================================================================
-- DEVELOPER ROLE & AUTHORISED COMPANY PORTAL MIGRATION
-- =====================================================================

-- 1. Extend developers table with RERA, upcoming projects, logo, and contact info
ALTER TABLE `developers` 
  ADD COLUMN IF NOT EXISTS `rera_number` VARCHAR(150) DEFAULT 'TNRERA/PROM/0219/2026' AFTER `slug`,
  ADD COLUMN IF NOT EXISTS `upcoming_projects` LONGTEXT DEFAULT NULL AFTER `about_text`,
  ADD COLUMN IF NOT EXISTS `cover_image_url` VARCHAR(500) DEFAULT NULL AFTER `logo_url`,
  ADD COLUMN IF NOT EXISTS `contact_email` VARCHAR(150) DEFAULT NULL AFTER `corporate_office`,
  ADD COLUMN IF NOT EXISTS `contact_phone` VARCHAR(50) DEFAULT NULL AFTER `contact_email`,
  ADD COLUMN IF NOT EXISTS `website_url` VARCHAR(255) DEFAULT NULL AFTER `contact_phone`;

-- 2. Extend users table with developer_id referencing their authorised company
ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `developer_id` INT DEFAULT NULL AFTER `role`,
  ADD INDEX IF NOT EXISTS `idx_users_developer_id` (`developer_id`);

-- 3. Extend properties submitted_by_role enum to support developer role
ALTER TABLE `properties` 
  MODIFY COLUMN `submitted_by_role` ENUM('buyer', 'seller', 'agent', 'admin', 'co_admin', 'developer') DEFAULT 'buyer';

