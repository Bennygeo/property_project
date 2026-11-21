-- ============================================================================
-- FIND A PLOT / MANNIDAM REAL ESTATE REGISTRY
-- COMPREHENSIVE LIVE PRODUCTION DATABASE MIGRATION SCRIPT
-- ============================================================================
-- Safe & Idempotent: Can be imported directly into phpMyAdmin / MySQL CLI
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- 1. USERS TABLE ENHANCEMENTS (Visitor Purpose & Developer Linkage)
-- ----------------------------------------------------------------------------
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `primary_goal` VARCHAR(100) NULL AFTER `role`;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `developer_id` INT(11) NULL AFTER `primary_goal`;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `department` VARCHAR(120) NULL AFTER `developer_id`;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `designation` VARCHAR(150) NULL AFTER `department`;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `points_balance` INT(11) DEFAULT 40 AFTER `last_login_at`;

-- ----------------------------------------------------------------------------
-- 2. PROJECTS TABLE (Consolidated Property & Project Master - 37 Columns)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `projects` (
  `project_id` VARCHAR(50) NOT NULL,
  `project_name` VARCHAR(255) NOT NULL,
  `developer_id` INT(11) DEFAULT NULL,
  `developer_name` VARCHAR(255) DEFAULT NULL,
  `district` VARCHAR(100) NOT NULL DEFAULT 'Chennai',
  `city` VARCHAR(100) NOT NULL DEFAULT 'Chennai',
  `locality` VARCHAR(150) NOT NULL DEFAULT 'OMR',
  `category` VARCHAR(100) NOT NULL DEFAULT 'Gated CMDA Plots',
  `type` VARCHAR(100) NOT NULL DEFAULT 'Residential',
  `land_type` VARCHAR(100) DEFAULT 'Residential',
  `price_from` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `price_to` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `sqft_rate` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `min_plot_size` INT(11) NOT NULL DEFAULT 600,
  `max_plot_size` INT(11) NOT NULL DEFAULT 2400,
  `project_stage` VARCHAR(100) DEFAULT 'Ready for Construction',
  `launch_date` DATE DEFAULT NULL,
  `possession_date` VARCHAR(100) DEFAULT 'Immediate',
  `rera_no` VARCHAR(150) DEFAULT NULL,
  `brokerage` VARCHAR(100) DEFAULT '0% Direct SRO Deed',
  `no_brokerage` TINYINT(1) DEFAULT 1,
  `featured` TINYINT(1) DEFAULT 0,
  `free_access` TINYINT(1) DEFAULT 0,
  `whatsapp_number` VARCHAR(30) DEFAULT '9486140936',
  `cover_image` VARCHAR(500) DEFAULT NULL,
  `interactive_map` VARCHAR(500) DEFAULT NULL,
  `total_units` VARCHAR(100) DEFAULT NULL,
  `units_sold` VARCHAR(100) DEFAULT NULL,
  `project_status` VARCHAR(100) DEFAULT 'Active',
  `submitted_by` VARCHAR(150) DEFAULT NULL,
  `reviewed_by` VARCHAR(150) DEFAULT NULL,
  `review_notes` TEXT DEFAULT NULL,
  `rejection_reason` TEXT DEFAULT NULL,
  `reviewed_at` DATETIME DEFAULT NULL,
  `status` ENUM('published','pending_review','pending_peer_review','revision_requested','rejected') DEFAULT 'published',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`project_id`),
  KEY `idx_proj_city` (`city`),
  KEY `idx_proj_locality` (`locality`),
  KEY `idx_proj_featured` (`featured`),
  KEY `idx_proj_developer` (`developer_id`),
  KEY `idx_proj_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `projects` ADD COLUMN IF NOT EXISTS `developer_name` VARCHAR(255) NULL AFTER `developer_id`;
ALTER TABLE `projects` ADD COLUMN IF NOT EXISTS `land_type` VARCHAR(100) DEFAULT 'Residential' AFTER `type`;

-- ----------------------------------------------------------------------------
-- 3. PROJECT DETAILS TABLE (1:1 Architectural Dossier, Approvals & Media - 35 Columns)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `project_details` (
  `detail_id` INT(11) NOT NULL AUTO_INCREMENT,
  `project_id` VARCHAR(50) NOT NULL,
  `total_layout_area` VARCHAR(100) DEFAULT NULL,
  `total_plots` INT(11) DEFAULT 0,
  `available_plot_sizes` VARCHAR(255) DEFAULT NULL,
  `dimensions` VARCHAR(255) DEFAULT NULL,
  `road_width` VARCHAR(100) DEFAULT '30ft & 40ft Blacktop Roads',
  `corner_plot` TINYINT(1) DEFAULT 0,
  `land_type` VARCHAR(100) DEFAULT 'Residential',
  `approval_authority` VARCHAR(100) DEFAULT 'DTCP / CMDA',
  `approval_reference` VARCHAR(150) DEFAULT NULL,
  `approval_date` DATE DEFAULT NULL,
  `rera_details` TEXT DEFAULT NULL,
  `internal_roads` VARCHAR(100) DEFAULT '40ft & 30ft Blacktop Tar',
  `street_lights` VARCHAR(100) DEFAULT 'LED Avenue Lighting',
  `drainage` VARCHAR(100) DEFAULT 'Underground Stormwater Drainage',
  `water` VARCHAR(100) DEFAULT 'Individual OHT Water Supply',
  `electricity` VARCHAR(100) DEFAULT 'EB 3-Phase Underground Cabling',
  `parks` VARCHAR(100) DEFAULT 'Landscaped Children Park & Walkway',
  `security` VARCHAR(100) DEFAULT '24x7 Boom Barrier Security',
  `other_facilities` TEXT DEFAULT NULL,
  `gps` VARCHAR(100) DEFAULT NULL,
  `nearby_roads` TEXT DEFAULT NULL,
  `railway_station` VARCHAR(150) DEFAULT NULL,
  `schools` TEXT DEFAULT NULL,
  `hospitals` TEXT DEFAULT NULL,
  `employment_hubs` TEXT DEFAULT NULL,
  `residential_development` TEXT DEFAULT NULL,
  `infrastructure_projects` TEXT DEFAULT NULL,
  `gallery` LONGTEXT DEFAULT NULL,
  `videos` LONGTEXT DEFAULT NULL,
  `drone_videos` LONGTEXT DEFAULT NULL,
  `layout_pdf` VARCHAR(500) DEFAULT NULL,
  `brochure` VARCHAR(500) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`detail_id`),
  UNIQUE KEY `idx_details_project` (`project_id`),
  CONSTRAINT `fk_details_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`project_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. UNIFIED 'properties' VIEW (Search & Listing Catalog API)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW `properties` AS 
SELECT 
  `p`.`project_id` AS `id`,
  `p`.`developer_id` AS `developer_id`,
  1 AS `city_id`,
  1 AS `locality_id`,
  `p`.`project_name` AS `title`,
  COALESCE(`p`.`land_type`, `p`.`type`, `p`.`category`, 'Gated CMDA Plots') AS `property_type`,
  'plots' AS `listing_mode`,
  COALESCE(`p`.`locality`, 'Chennai') AS `locality_name`,
  COALESCE(`p`.`city`, `p`.`district`, 'Chennai') AS `city_name`,
  CASE 
    WHEN `p`.`price_from` > 0 THEN CONCAT('₹', ROUND(`p`.`price_from` / 100000, 2), ' Lakhs')
    ELSE 'Price on Request'
  END AS `price`,
  CASE 
    WHEN `p`.`sqft_rate` > 0 THEN CONCAT('₹', ROUND(`p`.`sqft_rate`, 0), '/sq.ft')
    ELSE 'Competitive'
  END AS `price_per_sqft`,
  CASE 
    WHEN `p`.`min_plot_size` > 0 AND `p`.`max_plot_size` > 0 THEN CONCAT(`p`.`min_plot_size`, ' - ', `p`.`max_plot_size`, ' sq.ft')
    WHEN `p`.`min_plot_size` > 0 THEN CONCAT(`p`.`min_plot_size`, ' sq.ft')
    ELSE 'Plots from 1,200 sq.ft'
  END AS `sqft`,
  COALESCE(`p`.`category`, 'Gated CMDA Plots') AS `bhk_badge`,
  'East Facing • Clear Title' AS `facing_or_view`,
  COALESCE(NULLIF(`p`.`cover_image`, ''), 'https://images.unsplash.com/photo-1500382017468-9049fed747ef') AS `main_image_url`,
  COALESCE(NULLIF(`p`.`rera_no`, ''), 'TNRERA Approved') AS `rera_number`,
  COALESCE(`p`.`brokerage`, '0% Direct SRO Deed') AS `brokerage_badge`,
  NULL AS `special_tag`,
  4 AS `points_badge`,
  `p`.`possession_date` AS `possession_date`,
  `p`.`project_stage` AS `project_status`,
  'Gated Enclave' AS `total_land_parcel`,
  `p`.`total_units` AS `total_units`,
  4 AS `media_points`,
  NULL AS `whatsapp_url`,
  `p`.`interactive_map` AS `interactive_map_url`,
  `p`.`featured` AS `is_featured`,
  COALESCE(NULLIF(`p`.`status`, ''), 'published') AS `status`,
  1 AS `submitted_by_user_id`,
  COALESCE(NULLIF(`p`.`submitted_by`, ''), 'System / Bulk Upload') AS `submitted_by_name`,
  'admin' AS `submitted_by_role`,
  NULL AS `reviewed_by_user_id`,
  `p`.`reviewed_by` AS `reviewed_by_name`,
  `p`.`reviewed_at` AS `reviewed_at`,
  `p`.`review_notes` AS `review_notes`,
  `p`.`rejection_reason` AS `rejection_reason`,
  `p`.`created_at` AS `created_at`,
  `p`.`updated_at` AS `updated_at`
FROM `projects` `p`;

-- ----------------------------------------------------------------------------
-- 5. DEVELOPERS TABLE (Gradient Themes & Profile Logos)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `developers` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `slug` VARCHAR(150) DEFAULT NULL,
  `rera_number` VARCHAR(150) DEFAULT 'TNRERA/PROM/0219/2026',
  `established_year` VARCHAR(20) DEFAULT '2005',
  `projects_completed` VARCHAR(50) DEFAULT '25+ Projects',
  `delivered_sqft` VARCHAR(50) DEFAULT '12M+ sq.ft',
  `on_time_track` VARCHAR(50) DEFAULT '98.5% On-Time Delivery',
  `corporate_office` VARCHAR(255) DEFAULT NULL,
  `contact_email` VARCHAR(150) DEFAULT NULL,
  `contact_phone` VARCHAR(50) DEFAULT NULL,
  `website_url` VARCHAR(255) DEFAULT NULL,
  `about_text` TEXT DEFAULT NULL,
  `upcoming_projects` LONGTEXT DEFAULT NULL,
  `logo_url` VARCHAR(500) DEFAULT NULL,
  `cover_image_url` VARCHAR(500) DEFAULT NULL,
  `bg_gradient` VARCHAR(500) DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_dev_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `developers` ADD COLUMN IF NOT EXISTS `bg_gradient` VARCHAR(500) NULL AFTER `cover_image_url`;

-- ----------------------------------------------------------------------------
-- 6. SUBSCRIPTION PLANS & USER SUBSCRIPTIONS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `subscription_plans` (
  `id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `badge_text` VARCHAR(50) DEFAULT NULL,
  `price_inr` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `duration_days` INT(11) NOT NULL DEFAULT 30,
  `project_view_limit` INT(11) NOT NULL DEFAULT 2,
  `comparison_limit` INT(11) NOT NULL DEFAULT 1,
  `advisory_session_limit` INT(11) NOT NULL DEFAULT 1,
  `site_visit_limit` INT(11) NOT NULL DEFAULT 0,
  `has_location_report` TINYINT(1) NOT NULL DEFAULT 0,
  `has_dedicated_advisor` TINYINT(1) NOT NULL DEFAULT 0,
  `has_priority_advisor` TINYINT(1) NOT NULL DEFAULT 0,
  `description` TEXT DEFAULT NULL,
  `features_json` TEXT DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order` INT(11) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `subscription_plans` (`id`, `name`, `badge_text`, `price_inr`, `duration_days`, `project_view_limit`, `comparison_limit`, `advisory_session_limit`, `site_visit_limit`, `has_location_report`, `has_dedicated_advisor`, `has_priority_advisor`, `description`, `features_json`, `is_active`, `sort_order`)
VALUES
  ('explorer', 'Explorer', 'Free Forever', 0.00, 365, 2, 0, 1, 0, 0, 0, 0, 'Ideal for initial discovery of plotted developments, layouts and emerging locations across Tamil Nadu.', '[\"2 Detailed Project Views\",\"1 Intro Advisory Session\",\"Direct SRO Regulatory Checklist\",\"Community Support\"]', 1, 1),
  ('smart_buyer', 'Smart Buyer', 'Most Popular', 750.00, 30, 5, 2, 2, 0, 1, 0, 0, 'For active buyers shortlisting plots in high-growth corridors with location intelligence.', '[\"5 Detailed Project Views\",\"2 Side-by-Side Comparisons\",\"2 Advisory Sessions\",\"Location & Corridor Growth Report\",\"RERA Document Verification Extract\",\"WhatsApp Concierge Desk\"]', 1, 2),
  ('priority_buyer', 'Priority Buyer', 'Best Value', 7500.00, 60, 25, 5, 4, 1, 1, 1, 0, 'Comprehensive advisory with dedicated expert and field visit coordination.', '[\"25 Detailed Project Views\",\"5 Side-by-Side Comparisons\",\"4 Comprehensive Advisory Sessions\",\"1 Chauffeured Physical Site Visit\",\"Dedicated Property Advisor\",\"Patta & Cadastral Verification Dossier\",\"Land Appreciation Intelligence\"]', 1, 3),
  ('vip_concierge', 'VIP Concierge', 'Executive', 20000.00, 90, 50, 20, 8, 3, 1, 1, 1, 'White-glove advisory, multiple site visits and legal title clearance for high-net-worth investors.', '[\"50 Detailed Project Views\",\"20 Side-by-Side Comparisons\",\"8 In-Depth Advisory Sessions\",\"3 Chauffeured Physical Site Visits\",\"Priority Advisory Partner (Direct Line)\",\"Full Legal & SRO Title Check Assistance\",\"Custom Layout & Subdivision Analysis\",\"Negotiation & Booking Escort\"]', 1, 4)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `price_inr` = VALUES(`price_inr`);

CREATE TABLE IF NOT EXISTS `user_subscriptions` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL,
  `plan_id` VARCHAR(50) NOT NULL,
  `status` ENUM('active','expired','cancelled','upgraded') NOT NULL DEFAULT 'active',
  `amount_paid` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `razorpay_order_id` VARCHAR(100) DEFAULT NULL,
  `razorpay_payment_id` VARCHAR(100) DEFAULT NULL,
  `razorpay_signature` VARCHAR(255) DEFAULT NULL,
  `starts_at` DATETIME NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 7. RECHARGE PACKAGES & WALLET TRANSACTIONS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `recharge_packages` (
  `id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `points` INT(11) NOT NULL,
  `bonus_points` INT(11) DEFAULT 0,
  `price_in_rupees` INT(11) NOT NULL,
  `subtitle` VARCHAR(255) DEFAULT NULL,
  `unlock_estimate` VARCHAR(100) DEFAULT NULL,
  `is_popular` TINYINT(1) DEFAULT 0,
  `is_recommended` TINYINT(1) DEFAULT 0,
  `features_json` LONGTEXT DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `recharge_packages` (`id`, `name`, `category`, `points`, `bonus_points`, `price_in_rupees`, `subtitle`, `unlock_estimate`, `is_popular`, `is_recommended`, `features_json`)
VALUES
  ('pkg_starter', 'Starter Pack', 'Individual', 20, 0, 1000, 'Ideal for quick plot shortlisting & drone views', '5 Complete 4K Video Walkthroughs', 0, 0, '[\"Instant Points Activation\",\"Valid on all verified layouts\",\"Lifetime media access\"]'),
  ('pkg_value', 'Value Pack', 'Investor', 50, 5, 2500, 'Most popular among serious land buyers', '13 Complete 4K Video Walkthroughs', 1, 0, '[\"+5 Free Bonus Points included\",\"Priority customer support desk\",\"Downloadable high-res factsheets\"]'),
  ('pkg_pro', 'Pro Investor', 'Syndicate', 120, 15, 5000, 'For developers, wealth advisors & syndicates', '33 Complete 4K Video Walkthroughs', 0, 1, '[\"+15 Free Bonus Points included\",\"Dedicated Property Advisor call\",\"Cadastral comparison report\"]')
ON DUPLICATE KEY UPDATE `price_in_rupees` = VALUES(`price_in_rupees`);

CREATE TABLE IF NOT EXISTS `wallet_transactions` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL,
  `type` ENUM('credit','debit') NOT NULL,
  `points` INT(11) NOT NULL,
  `bonus_points` INT(11) DEFAULT 0,
  `amount_paid_rupees` DECIMAL(10,2) DEFAULT 0.00,
  `payment_method` VARCHAR(100) DEFAULT 'UPI / Razorpay',
  `razorpay_payment_id` VARCHAR(100) DEFAULT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `property_id` VARCHAR(50) DEFAULT NULL,
  `balance_after` INT(11) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_wallet_user` (`user_id`),
  KEY `idx_wallet_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 8. SALES PIPELINE & CRM TABLES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sales_lead_interactions` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'new_enquiry',
  `intention` VARCHAR(255) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `advisor_notes` TEXT DEFAULT NULL,
  `ops_notes` TEXT DEFAULT NULL,
  `preferred_location` VARCHAR(150) DEFAULT NULL,
  `budget_min` DECIMAL(15,2) DEFAULT NULL,
  `budget_max` DECIMAL(15,2) DEFAULT NULL,
  `assigned_sales_id` INT(11) DEFAULT NULL,
  `assigned_advisor_id` INT(11) DEFAULT NULL,
  `assigned_ops_id` INT(11) DEFAULT NULL,
  `scheduled_visit_at` DATETIME DEFAULT NULL,
  `exit_stage` VARCHAR(50) DEFAULT NULL,
  `exit_reason_category` VARCHAR(100) DEFAULT NULL,
  `competitor_name` VARCHAR(150) DEFAULT NULL,
  `exit_notes` TEXT DEFAULT NULL,
  `reengage_date` DATE DEFAULT NULL,
  `discontinued_at` DATETIME DEFAULT NULL,
  `booked_property_id` VARCHAR(50) DEFAULT NULL,
  `plot_no` VARCHAR(50) DEFAULT NULL,
  `booking_amount` DECIMAL(12,2) DEFAULT NULL,
  `final_price` DECIMAL(14,2) DEFAULT NULL,
  `registration_date` DATE DEFAULT NULL,
  `deal_notes` TEXT DEFAULT NULL,
  `updated_by` INT(11) DEFAULT NULL,
  `transferred_at` DATETIME DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `dtcp_marker_status` VARCHAR(100) DEFAULT 'Pending Survey',
  `gps_coords` VARCHAR(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_interaction` (`user_id`),
  KEY `idx_lead_status` (`status`),
  KEY `idx_lead_sales` (`assigned_sales_id`),
  KEY `idx_lead_advisor` (`assigned_advisor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `lead_stage_history` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL,
  `interaction_id` INT(11) DEFAULT NULL,
  `from_stage` VARCHAR(50) DEFAULT NULL,
  `to_stage` VARCHAR(50) NOT NULL,
  `department` VARCHAR(50) DEFAULT 'sales',
  `action_type` VARCHAR(50) DEFAULT 'stage_transition',
  `notes` TEXT DEFAULT NULL,
  `metadata` LONGTEXT DEFAULT NULL,
  `changed_by` INT(11) DEFAULT NULL,
  `changed_by_name` VARCHAR(100) DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_hist_user` (`user_id`),
  KEY `idx_hist_stage` (`to_stage`),
  KEY `idx_hist_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
-- 9. USER INTERACTION & ENGAGEMENT TRACKING
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_view_history` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL,
  `property_id` VARCHAR(50) NOT NULL,
  `viewed_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_view_user` (`user_id`),
  KEY `idx_view_property` (`property_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_shortlists` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL,
  `property_id` VARCHAR(50) NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_prop` (`user_id`, `property_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

SET FOREIGN_KEY_CHECKS = 1;
