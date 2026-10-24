-- =====================================================================
-- FIND A PLOT / PROPERTY PROJECT - LIVE DATABASE MIGRATION SCRIPT
-- Target Database: `onenesgw_property_project`
-- Usage: Run directly in phpMyAdmin (SQL tab) or via MySQL CLI.
-- Safe / Idempotent: Does not drop existing user data or properties.
-- =====================================================================

USE `onenesgw_property_project`;

-- ---------------------------------------------------------------------
-- 1. ADD `interactive_map_url` COLUMN TO `properties` (IF NOT PRESENT)
-- ---------------------------------------------------------------------
SET @dbname = DATABASE();
SET @tablename = "properties";
SET @columnname = "interactive_map_url";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1 AS `column_already_exists`",
  "ALTER TABLE `properties` ADD COLUMN `interactive_map_url` VARCHAR(500) DEFAULT NULL AFTER `whatsapp_url`;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ---------------------------------------------------------------------
-- 2. CREATE `guest_device_views` TABLE (CROSS-BROWSER SINGLE PREVIEW)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `guest_device_views` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `ip_address` VARCHAR(45) NOT NULL,
  `device_hash` VARCHAR(64) NOT NULL,
  `property_id` VARCHAR(50) NOT NULL,
  `viewed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_active_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `idx_guest_view` (`ip_address`, `device_hash`, `property_id`),
  KEY `idx_ip` (`ip_address`),
  KEY `idx_device` (`device_hash`),
  KEY `idx_viewed_at` (`viewed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 3. INSERT / UPDATE RECENT PROPERTY: SECURA (prop-secura-9)
-- ---------------------------------------------------------------------
INSERT INTO `properties` (
  `id`, `developer_id`, `city_id`, `locality_id`,
  `title`, `property_type`, `listing_mode`,
  `locality_name`, `city_name`,
  `price`, `price_per_sqft`, `sqft`,
  `bhk_badge`, `facing_or_view`,
  `main_image_url`,
  `rera_number`, `brokerage_badge`, `special_tag`, `points_badge`,
  `possession_date`, `project_status`, `total_land_parcel`, `total_units`, `media_points`,
  `whatsapp_url`, `interactive_map_url`, `is_featured`, `status`
) VALUES (
  'prop-secura-9', 2, 1, 4,
  'SECURA - Premium Gated Community Villa Plots',
  'Gated CMDA Plots', 'plots',
  'Poonamallee (Outer Ring Road)', 'Chennai',
  '₹56.0 Lakhs', '₹4,947 /sq.ft', '1,132 - 1,922 sq.ft',
  '29 Villa Plots', 'North & East Facing • ORR Corridor',
  'https://www.gobroker.co.in/uploads/amenities_image/banner27.png',
  'TNRERA/29/LO/3195/2025', '0% Direct SRO Deed', 'Outer Ring Road Plotted Community', 4,
  '2026', 'Ready to Construct', '1.18 Acres Plotted Community', '29 Exclusive Villa Plots', 4,
  'https://wa.me/919444100000', 'assets/secura-masterplan-3d.html', 1, 'published'
) ON DUPLICATE KEY UPDATE
  `title` = VALUES(`title`),
  `property_type` = VALUES(`property_type`),
  `listing_mode` = VALUES(`listing_mode`),
  `locality_name` = VALUES(`locality_name`),
  `city_name` = VALUES(`city_name`),
  `price` = VALUES(`price`),
  `price_per_sqft` = VALUES(`price_per_sqft`),
  `sqft` = VALUES(`sqft`),
  `bhk_badge` = VALUES(`bhk_badge`),
  `facing_or_view` = VALUES(`facing_or_view`),
  `main_image_url` = VALUES(`main_image_url`),
  `rera_number` = VALUES(`rera_number`),
  `brokerage_badge` = VALUES(`brokerage_badge`),
  `special_tag` = VALUES(`special_tag`),
  `points_badge` = VALUES(`points_badge`),
  `possession_date` = VALUES(`possession_date`),
  `project_status` = VALUES(`project_status`),
  `total_land_parcel` = VALUES(`total_land_parcel`),
  `total_units` = VALUES(`total_units`),
  `interactive_map_url` = VALUES(`interactive_map_url`),
  `status` = 'published';

-- ---------------------------------------------------------------------
-- 4. HIGHLIGHTS FOR SECURA (prop-secura-9)
-- ---------------------------------------------------------------------
DELETE FROM `property_highlights` WHERE `property_id` = 'prop-secura-9';
INSERT INTO `property_highlights` (`property_id`, `highlight_text`, `sort_order`) VALUES
  ('prop-secura-9', 'CMDA & TNRERA Approved Gated Layout (TNRERA/29/LO/3195/2025)', 1),
  ('prop-secura-9', 'Strategically Located off 400ft Outer Ring Road (ORR) Corridor', 2),
  ('prop-secura-9', '29 Premium Villa Plots with 30ft Blacktop Tar Roads', 3),
  ('prop-secura-9', 'Clear 30-Year SRO Title Deed with Nil Encumbrance Certificate', 4),
  ('prop-secura-9', 'Walkable to Transit Hubs, CBSE Schools, and Hospitals', 5),
  ('prop-secura-9', 'Potable Sweet Drinking Water with Compound Gated Security', 6);

-- ---------------------------------------------------------------------
-- 5. OPTIONAL: ENABLE INTERACTIVE MAP ON DEMO PROPERTY (p-1)
-- ---------------------------------------------------------------------
UPDATE `properties` 
SET `interactive_map_url` = 'assets/secura-masterplan-3d.html'
WHERE `id` = 'p-1' AND (`interactive_map_url` IS NULL OR `interactive_map_url` = '');

-- End of migration
