-- ============================================================================
-- FIND A PLOT / MANNIDAM REAL ESTATE REGISTRY
-- LATEST PRODUCTION DATABASE DELTA MIGRATION SCRIPT (November 21, 2026)
-- Target Database: `onenesgw_property_project`
-- ============================================================================
-- SAFE & IDEMPOTENT: Uses `IF NOT EXISTS` for tables, columns, and indexes.
-- Can be imported directly via phpMyAdmin -> Import / SQL tab, or MySQL CLI.
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- 1. SCHEDULED CALLBACKS TABLE (Lead Pipeline Callback Management)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `lead_callbacks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `assigned_to` INT DEFAULT NULL,
  `scheduled_at` DATETIME NOT NULL,
  `status` VARCHAR(30) DEFAULT 'scheduled',
  `notes` TEXT DEFAULT NULL,
  `completed_at` DATETIME DEFAULT NULL,
  `created_by` INT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_exec_due` (`assigned_to`, `status`, `scheduled_at`),
  INDEX `idx_lead_cb` (`user_id`, `scheduled_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. SALES LEAD INTERACTIONS ENHANCEMENTS (11 Pipeline Stages & Deal Tracking)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sales_lead_interactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'new_enquiry',
  `intention` VARCHAR(255) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `preferred_location` VARCHAR(150) NULL,
  `budget_min` DECIMAL(15,2) NULL,
  `budget_max` DECIMAL(15,2) NULL,
  `assigned_sales_id` INT NULL,
  `assigned_advisor_id` INT NULL,
  `assigned_ops_id` INT NULL,
  `scheduled_visit_at` DATETIME NULL,
  `exit_stage` VARCHAR(50) NULL,
  `exit_reason_category` VARCHAR(100) NULL,
  `competitor_name` VARCHAR(150) NULL,
  `exit_notes` TEXT NULL,
  `reengage_date` DATE NULL,
  `discontinued_at` DATETIME NULL,
  `booked_property_id` VARCHAR(50) NULL,
  `plot_no` VARCHAR(50) NULL,
  `booking_amount` DECIMAL(12,2) NULL,
  `final_price` DECIMAL(14,2) NULL,
  `registration_date` DATE NULL,
  `deal_notes` TEXT NULL,
  `updated_by` INT DEFAULT NULL,
  `transferred_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_user_interaction` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add new columns safely if table already existed with older schema
ALTER TABLE `sales_lead_interactions` ADD COLUMN IF NOT EXISTS `preferred_location` VARCHAR(150) NULL AFTER `notes`;
ALTER TABLE `sales_lead_interactions` ADD COLUMN IF NOT EXISTS `budget_min` DECIMAL(15,2) NULL AFTER `preferred_location`;
ALTER TABLE `sales_lead_interactions` ADD COLUMN IF NOT EXISTS `budget_max` DECIMAL(15,2) NULL AFTER `budget_min`;
ALTER TABLE `sales_lead_interactions` ADD COLUMN IF NOT EXISTS `assigned_sales_id` INT NULL AFTER `budget_max`;
ALTER TABLE `sales_lead_interactions` ADD COLUMN IF NOT EXISTS `assigned_advisor_id` INT NULL AFTER `assigned_sales_id`;
ALTER TABLE `sales_lead_interactions` ADD COLUMN IF NOT EXISTS `assigned_ops_id` INT NULL AFTER `assigned_advisor_id`;
ALTER TABLE `sales_lead_interactions` ADD COLUMN IF NOT EXISTS `scheduled_visit_at` DATETIME NULL AFTER `assigned_ops_id`;
ALTER TABLE `sales_lead_interactions` ADD COLUMN IF NOT EXISTS `exit_stage` VARCHAR(50) NULL AFTER `scheduled_visit_at`;
ALTER TABLE `sales_lead_interactions` ADD COLUMN IF NOT EXISTS `exit_reason_category` VARCHAR(100) NULL AFTER `exit_stage`;
ALTER TABLE `sales_lead_interactions` ADD COLUMN IF NOT EXISTS `competitor_name` VARCHAR(150) NULL AFTER `exit_reason_category`;
ALTER TABLE `sales_lead_interactions` ADD COLUMN IF NOT EXISTS `exit_notes` TEXT NULL AFTER `competitor_name`;
ALTER TABLE `sales_lead_interactions` ADD COLUMN IF NOT EXISTS `reengage_date` DATE NULL AFTER `exit_notes`;
ALTER TABLE `sales_lead_interactions` ADD COLUMN IF NOT EXISTS `discontinued_at` DATETIME NULL AFTER `reengage_date`;
ALTER TABLE `sales_lead_interactions` ADD COLUMN IF NOT EXISTS `booked_property_id` VARCHAR(50) NULL AFTER `discontinued_at`;
ALTER TABLE `sales_lead_interactions` ADD COLUMN IF NOT EXISTS `plot_no` VARCHAR(50) NULL AFTER `booked_property_id`;
ALTER TABLE `sales_lead_interactions` ADD COLUMN IF NOT EXISTS `booking_amount` DECIMAL(12,2) NULL AFTER `plot_no`;
ALTER TABLE `sales_lead_interactions` ADD COLUMN IF NOT EXISTS `final_price` DECIMAL(14,2) NULL AFTER `booking_amount`;
ALTER TABLE `sales_lead_interactions` ADD COLUMN IF NOT EXISTS `registration_date` DATE NULL AFTER `final_price`;
ALTER TABLE `sales_lead_interactions` ADD COLUMN IF NOT EXISTS `deal_notes` TEXT NULL AFTER `registration_date`;
ALTER TABLE `sales_lead_interactions` ADD COLUMN IF NOT EXISTS `updated_by` INT DEFAULT NULL AFTER `deal_notes`;
ALTER TABLE `sales_lead_interactions` ADD COLUMN IF NOT EXISTS `transferred_at` DATETIME DEFAULT NULL AFTER `updated_by`;
ALTER TABLE `sales_lead_interactions` MODIFY COLUMN `status` VARCHAR(50) NOT NULL DEFAULT 'new_enquiry';

-- ----------------------------------------------------------------------------
-- 3. LEAD STAGE HISTORY AUDIT LOGS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `lead_stage_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `interaction_id` INT NULL,
  `from_stage` VARCHAR(50) NULL,
  `to_stage` VARCHAR(50) NOT NULL,
  `department` VARCHAR(50) DEFAULT 'sales',
  `action_type` VARCHAR(50) DEFAULT 'stage_transition',
  `notes` TEXT NULL,
  `metadata` LONGTEXT NULL,
  `changed_by` INT NULL,
  `changed_by_name` VARCHAR(100) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_hist_user` (`user_id`),
  INDEX `idx_hist_stage` (`to_stage`),
  INDEX `idx_hist_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. USER SITE VISITS (Field Operations & Calendar Bookings)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_site_visits` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `property_id` VARCHAR(50) DEFAULT NULL,
  `property_title` VARCHAR(255) DEFAULT NULL,
  `locality` VARCHAR(150) DEFAULT NULL,
  `visit_date` DATE NOT NULL,
  `visit_slot` VARCHAR(50) DEFAULT '10:00 AM - 12:00 PM',
  `status` VARCHAR(50) DEFAULT 'requested',
  `assigned_executive_name` VARCHAR(100) DEFAULT NULL,
  `assigned_executive_phone` VARCHAR(30) DEFAULT NULL,
  `pickup_location` VARCHAR(255) DEFAULT NULL,
  `admin_notes` TEXT DEFAULT NULL,
  `dtcp_marker_status` VARCHAR(100) DEFAULT 'Pending Survey',
  `gps_coords` VARCHAR(100) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_usv_user` (`user_id`),
  INDEX `idx_usv_date` (`visit_date`),
  INDEX `idx_usv_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `user_site_visits` ADD COLUMN IF NOT EXISTS `dtcp_marker_status` VARCHAR(100) DEFAULT 'Pending Survey';
ALTER TABLE `user_site_visits` ADD COLUMN IF NOT EXISTS `gps_coords` VARCHAR(100) DEFAULT NULL;

-- ----------------------------------------------------------------------------
-- 5. PROJECT PINCODE & WORKFLOW STATUS COLUMNS
-- Note: `properties` is a VIEW over `projects`. Base table columns live on `projects`.
-- ----------------------------------------------------------------------------
ALTER TABLE `projects` ADD COLUMN IF NOT EXISTS `pincode` VARCHAR(10) NULL;
ALTER TABLE `project_details` ADD COLUMN IF NOT EXISTS `pincode` VARCHAR(10) NULL;

-- ----------------------------------------------------------------------------
-- 6. GUEST & BROWSING ENGAGEMENT TRACKING
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `guest_device_views` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `device_hash` VARCHAR(64) NOT NULL,
  `property_id` VARCHAR(50) NOT NULL,
  `view_count` INT(11) DEFAULT 1,
  `first_viewed_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `last_viewed_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_device_prop` (`device_hash`, `property_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_view_history` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL,
  `property_id` VARCHAR(50) NOT NULL,
  `viewed_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_view_user` (`user_id`),
  KEY `idx_view_property` (`property_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- VERIFICATION CHECK QUERY (Run to verify all tables are present)
-- ============================================================================
SELECT TABLE_NAME, TABLE_ROWS 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME IN ('lead_callbacks', 'sales_lead_interactions', 'lead_stage_history', 'user_site_visits', 'guest_device_views', 'user_view_history');
