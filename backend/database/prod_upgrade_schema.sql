-- ============================================================================
-- FIND A PLOT / MANNIDAM REAL ESTATE MARKETPLACE
-- PRODUCTION DATABASE UPGRADE MIGRATION SCRIPT
-- ============================================================================
-- Purpose:
-- 1. WhatsApp Dynamic Number & Free AI Agent Auto-Reply System (platform_settings)
-- 2. Multi-Turn Threaded WhatsApp Conversation Logs (whatsapp_chat_messages)
-- 3. Lead Inquiries Auto-Reply Tracking (inquiries_and_visits alterations)
-- 4. Real Visitor Heartbeat Sessions & Browsing Analytics (active_visitor_sessions, user_browsing_analytics)
-- 5. Tiered Subscription Entitlements & View Masking (user_entitlements, user_view_history, guest_device_views)
-- 6. User Profile PRD Workspace Tabs (site visits, advisory, saved searches, plot bookings)
-- 7. Developer Portal Role & Portfolio Linkage (users.role, developer_id)
-- 8. Business WhatsApp Contact Sync & Database Cleanup
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- 1. PLATFORM SETTINGS (Dynamic WhatsApp Number & AI Free Agent Config)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `platform_settings` (
  `setting_key` VARCHAR(100) NOT NULL,
  `setting_value` TEXT NOT NULL,
  `setting_group` VARCHAR(50) DEFAULT 'general',
  `description` VARCHAR(255) DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `platform_settings` (`setting_key`, `setting_value`, `setting_group`, `description`)
VALUES 
  ('whatsapp_number', '9486140936', 'whatsapp', 'Primary business WhatsApp mobile number'),
  ('whatsapp_country_code', '91', 'whatsapp', 'Default country dialing code (91 for India)'),
  ('whatsapp_display_name', 'Find a Plot Concierge Desk', 'whatsapp', 'Display title on WhatsApp interactions'),
  ('whatsapp_auto_reply_enabled', '1', 'whatsapp', 'Whether AI free agent auto-replies are active (1/0)'),
  ('whatsapp_auto_reply_agent', 'cadastral_concierge', 'whatsapp', 'Active agent persona (cadastral_concierge, investment_advisor, fast_concierge)'),
  ('whatsapp_free_agent_model', 'local_real_estate_ai', 'whatsapp', 'Free AI agent engine (local_real_estate_ai, pollinations_free)'),
  ('whatsapp_auto_reply_template', 'Hi {name}! Thank you for inquiring about {property} in {locality}. Our AI Concierge has logged your request. This property is DTCP/TNRERA verified with clear title deeds. Would you like our executive to share the legal cadastral dossier or book a free chauffeur site visit?', 'whatsapp', 'Default AI reply prompt template'),
  ('meta_whatsapp_phone_number_id', '', 'whatsapp', 'Official Meta WhatsApp Business Phone Number ID'),
  ('meta_whatsapp_waba_id', '', 'whatsapp', 'Meta WhatsApp Business Account ID (WABA ID)'),
  ('meta_whatsapp_access_token', '', 'whatsapp', 'Permanent System User Access Token'),
  ('meta_whatsapp_verify_token', 'findaplot_meta_token_77', 'whatsapp', 'Meta Webhook Verify Token'),
  ('meta_whatsapp_api_version', 'v19.0', 'whatsapp', 'Meta Graph API Version')
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;


-- ----------------------------------------------------------------------------
-- 2. MULTI-TURN THREADED WHATSAPP CONVERSATION LOGS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `whatsapp_chat_messages` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `lead_id` INT(11) DEFAULT NULL,
  `property_id` VARCHAR(50) DEFAULT NULL,
  `user_phone` VARCHAR(25) NOT NULL,
  `business_phone` VARCHAR(25) NOT NULL DEFAULT '9486140936',
  `sender_type` ENUM('user','admin','ai_agent') NOT NULL,
  `sender_name` VARCHAR(120) NOT NULL,
  `message_text` TEXT NOT NULL,
  `is_auto_reply` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_phone` (`user_phone`),
  KEY `idx_lead_id` (`lead_id`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ----------------------------------------------------------------------------
-- 3. INQUIRIES & VISITS ENHANCEMENTS (Auto-Reply Tracking)
-- ----------------------------------------------------------------------------
-- Add auto_reply_text and auto_reply_sent_at if they don't already exist
DROP PROCEDURE IF EXISTS `AddInquiriesColumns`;
DELIMITER //
CREATE PROCEDURE `AddInquiriesColumns`()
BEGIN
  IF NOT EXISTS (
    SELECT * FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inquiries_and_visits' AND COLUMN_NAME = 'auto_reply_text'
  ) THEN
    ALTER TABLE `inquiries_and_visits` ADD COLUMN `auto_reply_text` TEXT NULL AFTER `notes`;
  END IF;

  IF NOT EXISTS (
    SELECT * FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inquiries_and_visits' AND COLUMN_NAME = 'auto_reply_sent_at'
  ) THEN
    ALTER TABLE `inquiries_and_visits` ADD COLUMN `auto_reply_sent_at` TIMESTAMP NULL AFTER `auto_reply_text`;
  END IF;
END //
DELIMITER ;
CALL `AddInquiriesColumns`();
DROP PROCEDURE `AddInquiriesColumns`;


-- ----------------------------------------------------------------------------
-- 4. REAL VISITOR ANALYTICS & ONLINE HEARTBEATS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `active_visitor_sessions` (
  `session_id` VARCHAR(64) NOT NULL,
  `ip_address` VARCHAR(45) NOT NULL,
  `user_phone` VARCHAR(30) DEFAULT NULL,
  `page_url` VARCHAR(255) DEFAULT '/',
  `user_agent` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_heartbeat` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`session_id`),
  KEY `idx_heartbeat` (`last_heartbeat`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_browsing_analytics` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_phone` VARCHAR(20) NOT NULL,
  `property_id` VARCHAR(50) NOT NULL,
  `property_title` VARCHAR(255) DEFAULT NULL,
  `property_type` VARCHAR(100) NOT NULL,
  `price` VARCHAR(50) NOT NULL,
  `price_inr` BIGINT(20) NOT NULL,
  `locality` VARCHAR(150) DEFAULT NULL,
  `city` VARCHAR(100) DEFAULT NULL,
  `action_type` VARCHAR(50) DEFAULT 'view',
  `viewed_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_phone` (`user_phone`),
  KEY `idx_property` (`property_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `guest_device_views` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `ip_address` VARCHAR(45) NOT NULL,
  `device_hash` VARCHAR(64) NOT NULL,
  `property_id` VARCHAR(50) NOT NULL,
  `viewed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_active_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_guest_view` (`ip_address`,`device_hash`,`property_id`),
  KEY `idx_ip` (`ip_address`),
  KEY `idx_device` (`device_hash`),
  KEY `idx_viewed_at` (`viewed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ----------------------------------------------------------------------------
-- 5. SUBSCRIPTION PLANS, ENTITLEMENTS & FREEMIUM GATING
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
('explorer', 'Explorer', 'Free Forever', 0.00, 365, 2, 1, 1, 0, 0, 0, 0, 'Ideal for initial discovery of plotted developments, layouts and emerging locations across Tamil Nadu.', '["2 Detailed Project Views","1 Side-by-Side Comparison","1 Intro Advisory Session","Direct SRO Regulatory Checklist","Community Support"]', 1, 1),
('smart_buyer', 'Smart Buyer', 'Most Popular', 750.00, 30, 5, 3, 2, 0, 1, 0, 0, 'For active buyers shortlisting plots in high-growth corridors with location intelligence.', '["5 Detailed Project Views","3 Side-by-Side Comparisons","2 Advisory Sessions","Location & Corridor Growth Report","RERA Document Verification Extract","WhatsApp Concierge Desk"]', 1, 2),
('priority_buyer', 'Priority Buyer', 'Best Value', 7500.00, 60, 25, 10, 4, 1, 1, 1, 0, 'Comprehensive advisory with dedicated expert and field visit coordination.', '["25 Detailed Project Views","10 Side-by-Side Comparisons","4 Comprehensive Advisory Sessions","1 Chauffeured Physical Site Visit","Dedicated Property Advisor","Patta & Cadastral Verification Dossier","Land Appreciation Intelligence"]', 1, 3),
('vip_concierge', 'VIP Concierge', 'Executive', 20000.00, 90, 50, 20, 8, 3, 1, 1, 1, 'White-glove advisory, multiple site visits and legal title clearance for high-net-worth investors.', '["50 Detailed Project Views","20 Side-by-Side Comparisons","8 In-Depth Advisory Sessions","3 Chauffeured Physical Site Visits","Priority Advisory Partner (Direct Line)","Full Legal & SRO Title Check Assistance","Custom Layout & Subdivision Analysis","Negotiation & Booking Escort"]', 1, 4)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `price_inr` = VALUES(`price_inr`), `description` = VALUES(`description`);

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

CREATE TABLE IF NOT EXISTS `subscription_invoices` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `invoice_number` VARCHAR(50) NOT NULL,
  `user_id` INT(11) NOT NULL,
  `subscription_id` INT(11) NOT NULL,
  `plan_id` VARCHAR(50) NOT NULL,
  `plan_name` VARCHAR(100) NOT NULL,
  `base_amount` DECIMAL(10,2) NOT NULL,
  `gst_rate` DECIMAL(5,2) NOT NULL DEFAULT 18.00,
  `gst_amount` DECIMAL(10,2) NOT NULL,
  `total_amount` DECIMAL(10,2) NOT NULL,
  `sac_code` VARCHAR(20) NOT NULL DEFAULT '998313',
  `gstin` VARCHAR(30) NOT NULL DEFAULT '33AABCF9812K1Z9',
  `customer_name` VARCHAR(150) NOT NULL,
  `customer_email` VARCHAR(150) DEFAULT NULL,
  `customer_phone` VARCHAR(30) DEFAULT NULL,
  `payment_method` VARCHAR(50) DEFAULT 'Razorpay',
  `payment_id` VARCHAR(100) DEFAULT NULL,
  `status` ENUM('paid','refunded','void') NOT NULL DEFAULT 'paid',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoice_number` (`invoice_number`),
  KEY `idx_user` (`user_id`),
  KEY `idx_invoice` (`invoice_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `subscription_refunds` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `invoice_id` INT(11) NOT NULL,
  `subscription_id` INT(11) NOT NULL,
  `user_id` INT(11) NOT NULL,
  `refund_amount` DECIMAL(10,2) NOT NULL,
  `refund_reason` TEXT DEFAULT NULL,
  `status` ENUM('requested','processed','rejected') NOT NULL DEFAULT 'processed',
  `razorpay_refund_id` VARCHAR(100) DEFAULT NULL,
  `processed_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_invoice` (`invoice_id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_entitlements` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL,
  `active_subscription_id` INT(11) DEFAULT NULL,
  `plan_id` VARCHAR(50) NOT NULL DEFAULT 'explorer',
  `project_views_used` INT(11) NOT NULL DEFAULT 0,
  `project_view_limit` INT(11) NOT NULL DEFAULT 2,
  `comparisons_used` INT(11) NOT NULL DEFAULT 0,
  `comparison_limit` INT(11) NOT NULL DEFAULT 1,
  `advisory_sessions_used` INT(11) NOT NULL DEFAULT 0,
  `advisory_session_limit` INT(11) NOT NULL DEFAULT 1,
  `site_visits_used` INT(11) NOT NULL DEFAULT 0,
  `site_visit_limit` INT(11) NOT NULL DEFAULT 0,
  `has_location_report` TINYINT(1) NOT NULL DEFAULT 0,
  `has_dedicated_advisor` TINYINT(1) NOT NULL DEFAULT 0,
  `has_priority_advisor` TINYINT(1) NOT NULL DEFAULT 0,
  `expires_at` DATETIME DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_view_history` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL,
  `property_id` VARCHAR(50) NOT NULL,
  `viewed_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `property_id` (`property_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ----------------------------------------------------------------------------
-- 6. USER PROFILE PRD WORKSPACE TABS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_site_visits` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL DEFAULT 1,
  `property_id` VARCHAR(50) NOT NULL,
  `property_title` VARCHAR(255) NOT NULL,
  `locality` VARCHAR(150) NOT NULL,
  `visit_date` DATE NOT NULL,
  `visit_slot` VARCHAR(50) NOT NULL DEFAULT '10:00 AM - 12:00 PM',
  `status` ENUM('requested','confirmed','completed','cancelled') NOT NULL DEFAULT 'requested',
  `assigned_executive_name` VARCHAR(100) DEFAULT 'Ramesh V (Relationship Mgr)',
  `assigned_executive_phone` VARCHAR(30) DEFAULT '+91 94440 12345',
  `pickup_location` VARCHAR(255) DEFAULT 'Koyambedu Metro Station, Gate 2',
  `admin_notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_visits` (`user_id`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_advisory_consultations` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL DEFAULT 1,
  `advisor_name` VARCHAR(100) NOT NULL DEFAULT 'Karthik Narayanan (Senior Plot Specialist)',
  `advisor_role` VARCHAR(100) NOT NULL DEFAULT 'RERA & CMDA Cadastral Advisor',
  `consultation_date` DATETIME NOT NULL,
  `duration_minutes` INT(11) NOT NULL DEFAULT 45,
  `status` ENUM('scheduled','completed','rescheduled') NOT NULL DEFAULT 'completed',
  `advisor_notes` TEXT NOT NULL,
  `recommendations_json` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`recommendations_json`)),
  `dossier_pdf_url` VARCHAR(255) DEFAULT 'FAP-DOSSIER-PRJ-0059.pdf',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_consult` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_saved_searches` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL DEFAULT 1,
  `search_name` VARCHAR(150) NOT NULL,
  `filters_json` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`filters_json`)),
  `email_alerts_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `whatsapp_alerts_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `matches_count` INT(11) NOT NULL DEFAULT 8,
  `last_notified_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_searches` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_plot_bookings` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL DEFAULT 1,
  `property_id` VARCHAR(50) NOT NULL,
  `property_title` VARCHAR(255) NOT NULL,
  `plot_number` VARCHAR(50) NOT NULL DEFAULT 'Plot #42',
  `plot_extent_sqft` INT(11) NOT NULL DEFAULT 1200,
  `total_price` DECIMAL(12,2) NOT NULL DEFAULT 3500000.00,
  `token_advance_paid` DECIMAL(12,2) NOT NULL DEFAULT 50000.00,
  `status` ENUM('enquiry','plot_on_hold','token_paid','document_verification','registration_in_progress','registered_completed','cancelled') NOT NULL DEFAULT 'plot_on_hold',
  `assigned_legal_officer` VARCHAR(100) DEFAULT 'Advocate S. Swaminathan (SRO Madras HC)',
  `target_registration_date` DATE DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_bookings` (`user_id`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ----------------------------------------------------------------------------
-- 7. DEVELOPER PORTAL ROLES & SUBMISSION ATTRIBUTES
-- ----------------------------------------------------------------------------
-- Update users.role to include 'developer' and 'co_admin'
ALTER TABLE `users` 
  MODIFY COLUMN `role` ENUM('buyer','seller','developer','admin','co_admin') DEFAULT 'buyer';

-- Add developer_id to users if missing
DROP PROCEDURE IF EXISTS `AddUserDeveloperId`;
DELIMITER //
CREATE PROCEDURE `AddUserDeveloperId`()
BEGIN
  IF NOT EXISTS (
    SELECT * FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'developer_id'
  ) THEN
    ALTER TABLE `users` ADD COLUMN `developer_id` INT(11) NULL AFTER `role`;
    ALTER TABLE `users` ADD KEY `idx_users_developer_id` (`developer_id`);
  END IF;
END //
DELIMITER ;
CALL `AddUserDeveloperId`();
DROP PROCEDURE `AddUserDeveloperId`;

-- Ensure 9486140936 has super admin access
UPDATE `users` 
SET `role` = 'admin', `name` = 'Benny (Super Admin & Developer Director)' 
WHERE `phone` = '9486140936' OR `phone` = '+91 9486140936' OR `phone` = '919486140936';

-- Update properties submitted_by_role to include 'developer'
ALTER TABLE `properties`
  MODIFY COLUMN `submitted_by_role` ENUM('buyer','seller','agent','admin','co_admin','developer') DEFAULT 'buyer';


-- ----------------------------------------------------------------------------
-- 8. BUSINESS WHATSAPP CONTACT NUMBER & DATA PURGE
-- ----------------------------------------------------------------------------
-- Ensure whatsapp_url column exists on properties
DROP PROCEDURE IF EXISTS `AddPropertyWhatsappColumn`;
DELIMITER //
CREATE PROCEDURE `AddPropertyWhatsappColumn`()
BEGIN
  IF NOT EXISTS (
    SELECT * FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'properties' AND COLUMN_NAME = 'whatsapp_url'
  ) THEN
    ALTER TABLE `properties` ADD COLUMN `whatsapp_url` VARCHAR(500) NULL AFTER `media_points`;
  END IF;
END //
DELIMITER ;
CALL `AddPropertyWhatsappColumn`();
DROP PROCEDURE `AddPropertyWhatsappColumn`;

-- Purge any inadvertent CSV header row & mock conversation threads
DELETE FROM `inquiries_and_visits` WHERE `property_id` = 'id';
DELETE FROM `properties` WHERE `id` = 'id';

-- Purge mock/test conversation threads so Admin Panel only shows 100% real conversations
DELETE FROM `whatsapp_chat_messages` 
WHERE `sender_name` LIKE '%Kavitha%' 
   OR `message_text` LIKE '%Verified Cadastral Layout%' 
   OR `message_text` LIKE '%Initial inquiry%'
   OR `sender_name` LIKE '%Sample%';

-- Update all existing properties to point to the official business WhatsApp number (919486140936)
UPDATE `properties`
SET `whatsapp_url` = CONCAT('https://wa.me/919486140936?text=Hi%20Find%20a%20Plot%2C%20I%20am%20interested%20in%20', REPLACE(REPLACE(REPLACE(title, ' ', '%20'), '&', '%26'), '#', '%23'))
WHERE `whatsapp_url` LIKE '%wa.me%' OR `whatsapp_url` IS NULL OR `whatsapp_url` = '';

SET FOREIGN_KEY_CHECKS = 1;
