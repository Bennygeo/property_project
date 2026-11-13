-- =====================================================================
-- DEVELOPER PAGE UNIQUE MILD GRADIENT THEME MIGRATION
-- Enables Admin and Authorized Developers to customize unique mild gradient
-- background per developer profile.
-- =====================================================================

ALTER TABLE `developers` 
  ADD COLUMN IF NOT EXISTS `bg_gradient` VARCHAR(500) DEFAULT NULL AFTER `cover_image_url`;

