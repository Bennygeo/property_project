const fs = require('fs');
const path = require('path');

const completeSql = `-- =====================================================================
-- FIND A PLOT / PROPERTY PROJECT - COMPLETE PRODUCTION DATABASE SCHEMA
-- Engine: MySQL 8.0+ / MariaDB 10.4+ InnoDB
-- Character Set: utf8mb4 / Collation: utf8mb4_unicode_ci
-- Safe Import: Can be imported into phpMyAdmin or MySQL CLI without errors
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- ---------------------------------------------------------------------
-- 1. CITIES (Metro Hub Jurisdictions)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`cities\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`city_key\` VARCHAR(50) NOT NULL UNIQUE,
  \`name\` VARCHAR(100) NOT NULL,
  \`state\` VARCHAR(100) NOT NULL,
  \`avg_rate_sqft\` VARCHAR(50) DEFAULT 'Avg ₹8,000/sq.ft',
  \`yoy_growth\` VARCHAR(30) DEFAULT '+12.0% YoY',
  \`deed_count\` VARCHAR(50) DEFAULT '5,000+ Deeds',
  \`is_active\` TINYINT(1) DEFAULT 1,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 2. LOCALITIES (Cadastral Micro-Markets)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`localities\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`city_id\` INT NOT NULL,
  \`name\` VARCHAR(120) NOT NULL,
  \`pin_code\` VARCHAR(20) DEFAULT NULL,
  \`avg_sqft_rate\` VARCHAR(50) DEFAULT NULL,
  \`growth_yoy\` VARCHAR(30) DEFAULT NULL,
  \`deed_count\` VARCHAR(50) DEFAULT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`city_id\`) REFERENCES \`cities\`(\`id\`) ON DELETE CASCADE,
  INDEX \`idx_locality_city\` (\`city_id\`),
  INDEX \`idx_locality_name\` (\`name\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 3. DEVELOPERS (Master Builders & Promoters)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`developers\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`name\` VARCHAR(150) NOT NULL,
  \`slug\` VARCHAR(150) DEFAULT NULL,
  \`established_year\` VARCHAR(20) DEFAULT '2005',
  \`projects_completed\` VARCHAR(50) DEFAULT '25+ Projects',
  \`delivered_sqft\` VARCHAR(50) DEFAULT '12M+ sq.ft',
  \`on_time_track\` VARCHAR(50) DEFAULT '98.5% On-Time Delivery',
  \`corporate_office\` VARCHAR(255) DEFAULT NULL,
  \`about_text\` TEXT DEFAULT NULL,
  \`logo_url\` VARCHAR(500) DEFAULT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 4. MASTER PROPERTIES REGISTRY
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`properties\` (
  \`id\` VARCHAR(50) PRIMARY KEY,
  \`developer_id\` INT DEFAULT NULL,
  \`city_id\` INT NOT NULL,
  \`locality_id\` INT DEFAULT NULL,
  \`title\` VARCHAR(255) NOT NULL,
  \`property_type\` ENUM(
    'Apartments & Flats',
    'Independent Villas',
    'Luxury Penthouses',
    'Gated CMDA Plots',
    'Commercial Spaces'
  ) NOT NULL,
  \`listing_mode\` ENUM('buy', 'rent', 'plots', 'commercial') NOT NULL DEFAULT 'buy',
  \`locality_name\` VARCHAR(150) NOT NULL,
  \`city_name\` VARCHAR(100) NOT NULL,
  \`price\` VARCHAR(50) NOT NULL,
  \`price_per_sqft\` VARCHAR(50) NOT NULL,
  \`sqft\` VARCHAR(50) NOT NULL,
  \`bhk_badge\` VARCHAR(50) NOT NULL,
  \`facing_or_view\` VARCHAR(100) NOT NULL,
  \`main_image_url\` VARCHAR(500) NOT NULL,
  \`rera_number\` VARCHAR(100) NOT NULL,
  \`brokerage_badge\` VARCHAR(100) DEFAULT '0% Direct SRO Deed',
  \`special_tag\` VARCHAR(100) DEFAULT NULL,
  \`points_badge\` INT DEFAULT 4,
  \`possession_date\` VARCHAR(100) DEFAULT NULL,
  \`project_status\` VARCHAR(100) DEFAULT 'Under Construction',
  \`total_land_parcel\` VARCHAR(100) DEFAULT '9.6 Acres Gated Enclave',
  \`total_units\` VARCHAR(100) DEFAULT '32 Exclusive Residences',
  \`media_points\` INT DEFAULT 4,
  \`whatsapp_url\` VARCHAR(500) DEFAULT NULL,
  \`interactive_map_url\` VARCHAR(500) DEFAULT NULL,
  \`is_featured\` TINYINT(1) DEFAULT 0,
  \`status\` ENUM('published', 'pending_review', 'pending_peer_review', 'revision_requested', 'rejected') DEFAULT 'published',
  \`submitted_by_user_id\` INT DEFAULT NULL,
  \`submitted_by_name\` VARCHAR(150) DEFAULT NULL,
  \`submitted_by_role\` ENUM('buyer', 'seller', 'agent', 'admin', 'co_admin') DEFAULT 'admin',
  \`reviewed_by_user_id\` INT DEFAULT NULL,
  \`reviewed_by_name\` VARCHAR(150) DEFAULT NULL,
  \`reviewed_at\` DATETIME DEFAULT NULL,
  \`review_notes\` TEXT DEFAULT NULL,
  \`rejection_reason\` TEXT DEFAULT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (\`developer_id\`) REFERENCES \`developers\`(\`id\`) ON DELETE SET NULL,
  FOREIGN KEY (\`city_id\`) REFERENCES \`cities\`(\`id\`) ON DELETE RESTRICT,
  FOREIGN KEY (\`locality_id\`) REFERENCES \`localities\`(\`id\`) ON DELETE SET NULL,
  INDEX \`idx_prop_type\` (\`property_type\`),
  INDEX \`idx_prop_mode\` (\`listing_mode\`),
  INDEX \`idx_prop_city\` (\`city_id\`),
  INDEX \`idx_prop_status\` (\`status\`),
  INDEX \`idx_prop_featured\` (\`is_featured\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 5. PROPERTY HIGHLIGHTS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`property_highlights\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`property_id\` VARCHAR(50) NOT NULL,
  \`highlight_text\` VARCHAR(255) NOT NULL,
  \`sort_order\` INT DEFAULT 0,
  FOREIGN KEY (\`property_id\`) REFERENCES \`properties\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 6. CADASTRAL AUDIT & TITLE VERIFICATION
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`property_cadastral_audits\` (
  \`property_id\` VARCHAR(50) PRIMARY KEY,
  \`survey_number\` VARCHAR(100) NOT NULL,
  \`sro_jurisdiction\` VARCHAR(150) NOT NULL,
  \`ec_status\` VARCHAR(150) NOT NULL,
  \`patta_verification\` VARCHAR(150) NOT NULL,
  \`rera_reg_no\` VARCHAR(150) NOT NULL,
  \`circle_rate\` VARCHAR(100) NOT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`property_id\`) REFERENCES \`properties\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 7. APARTMENT DETAILS FACTSHEET
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`property_apartment_details\` (
  \`property_id\` VARCHAR(50) PRIMARY KEY,
  \`tower_count\` VARCHAR(100) DEFAULT NULL,
  \`total_floors\` VARCHAR(100) DEFAULT NULL,
  \`units_per_core\` VARCHAR(100) DEFAULT NULL,
  \`ceiling_height\` VARCHAR(100) DEFAULT NULL,
  \`balcony_deck\` VARCHAR(100) DEFAULT NULL,
  \`hvac_system\` VARCHAR(150) DEFAULT NULL,
  \`flooring_specs\` VARCHAR(255) DEFAULT NULL,
  \`kitchen_fittings\` VARCHAR(255) DEFAULT NULL,
  \`parking_bays\` VARCHAR(100) DEFAULT NULL,
  \`clubhouse_size\` VARCHAR(100) DEFAULT NULL,
  \`maintenance_fee\` VARCHAR(100) DEFAULT NULL,
  FOREIGN KEY (\`property_id\`) REFERENCES \`properties\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 8. PLOT DETAILS FACTSHEET
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`property_plot_details\` (
  \`property_id\` VARCHAR(50) PRIMARY KEY,
  \`layout_sanction_no\` VARCHAR(150) DEFAULT NULL,
  \`rera_layout_no\` VARCHAR(150) DEFAULT NULL,
  \`frontage_road_width\` VARCHAR(100) DEFAULT NULL,
  \`water_table_depth\` VARCHAR(100) DEFAULT NULL,
  \`soil_bearing_capacity\` VARCHAR(100) DEFAULT NULL,
  \`fsi_permissible\` VARCHAR(100) DEFAULT NULL,
  \`eb_substation\` VARCHAR(150) DEFAULT NULL,
  \`boundary_wall\` VARCHAR(100) DEFAULT NULL,
  \`drainage_system\` VARCHAR(150) DEFAULT NULL,
  \`patta_status\` VARCHAR(150) DEFAULT NULL,
  \`dimension_ranges\` VARCHAR(150) DEFAULT NULL,
  FOREIGN KEY (\`property_id\`) REFERENCES \`properties\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 8B. SUBDIVIDED PARTITIONED PLOTS (3D & 2D Units)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`property_subdivided_plots\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`property_id\` VARCHAR(50) NOT NULL,
  \`plot_no\` VARCHAR(50) NOT NULL,
  \`status\` ENUM('available', 'sold', 'reserved') NOT NULL DEFAULT 'available',
  \`super_built_up_yds\` DECIMAL(10,2) NOT NULL DEFAULT 150.00,
  \`net_plot_area_yds\` DECIMAL(10,2) NOT NULL DEFAULT 100.00,
  \`super_built_up_sqft\` INT NOT NULL DEFAULT 1350,
  \`width_meters\` DECIMAL(8,2) NOT NULL DEFAULT 11.00,
  \`length_meters\` DECIMAL(8,2) NOT NULL DEFAULT 7.80,
  \`width_feet\` DECIMAL(8,2) NOT NULL DEFAULT 36.00,
  \`length_feet\` DECIMAL(8,2) NOT NULL DEFAULT 25.60,
  \`facing\` VARCHAR(100) NOT NULL DEFAULT 'North Facing',
  \`price_in_lakhs\` DECIMAL(10,2) NOT NULL DEFAULT 40.00,
  \`formatted_price\` VARCHAR(50) NOT NULL DEFAULT '₹40.00 L',
  \`is_corner\` TINYINT(1) NOT NULL DEFAULT 0,
  \`has_trees\` TINYINT(1) NOT NULL DEFAULT 0,
  \`pos_x\` DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  \`pos_y\` DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  \`size_w\` DECIMAL(8,2) NOT NULL DEFAULT 13.00,
  \`size_h\` DECIMAL(8,2) NOT NULL DEFAULT 11.00,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`property_id\`) REFERENCES \`properties\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 9. VILLA DETAILS FACTSHEET
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`property_villa_details\` (
  \`property_id\` VARCHAR(50) PRIMARY KEY,
  \`land_extent\` VARCHAR(100) DEFAULT NULL,
  \`built_up_area\` VARCHAR(100) DEFAULT NULL,
  \`carpet_area\` VARCHAR(100) DEFAULT NULL,
  \`private_pool\` VARCHAR(150) DEFAULT NULL,
  \`courtyard_garden\` VARCHAR(150) DEFAULT NULL,
  \`solar_microgrid\` VARCHAR(150) DEFAULT NULL,
  \`water_autonomy\` VARCHAR(150) DEFAULT NULL,
  \`vastu_orientation\` VARCHAR(100) DEFAULT NULL,
  \`private_elevator\` VARCHAR(100) DEFAULT NULL,
  \`car_portico\` VARCHAR(100) DEFAULT NULL,
  FOREIGN KEY (\`property_id\`) REFERENCES \`properties\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 10. COMMERCIAL DETAILS FACTSHEET
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`property_commercial_details\` (
  \`property_id\` VARCHAR(50) PRIMARY KEY,
  \`efficiency_ratio\` VARCHAR(100) DEFAULT NULL,
  \`rental_yield\` VARCHAR(100) DEFAULT NULL,
  \`lease_terms\` VARCHAR(150) DEFAULT NULL,
  \`monthly_rental\` VARCHAR(100) DEFAULT NULL,
  \`power_redundancy\` VARCHAR(150) DEFAULT NULL,
  \`elevators\` VARCHAR(100) DEFAULT NULL,
  \`hvac_specs\` VARCHAR(150) DEFAULT NULL,
  \`floor_plate_size\` VARCHAR(100) DEFAULT NULL,
  FOREIGN KEY (\`property_id\`) REFERENCES \`properties\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 11. PROPERTY MEDIA (Free Photos, 4K Walkthrough & 360° Drone Surveys)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`property_media\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`property_id\` VARCHAR(50) NOT NULL,
  \`media_type\` ENUM('free_photo', 'cinematic_4k', 'drone_survey') NOT NULL,
  \`title\` VARCHAR(255) NOT NULL,
  \`url\` VARCHAR(500) NOT NULL,
  \`thumbnail_url\` VARCHAR(500) DEFAULT NULL,
  \`duration\` VARCHAR(50) DEFAULT NULL,
  \`tag\` VARCHAR(100) DEFAULT 'Ultra HD',
  \`sort_order\` INT DEFAULT 0,
  FOREIGN KEY (\`property_id\`) REFERENCES \`properties\`(\`id\`) ON DELETE CASCADE,
  INDEX \`idx_media_prop_type\` (\`property_id\`, \`media_type\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 12. FLOOR PLANS (Typology Plans & Dimensions)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`property_floor_plans\` (
  \`id\` VARCHAR(50) PRIMARY KEY,
  \`property_id\` VARCHAR(50) NOT NULL,
  \`name\` VARCHAR(150) NOT NULL,
  \`type\` VARCHAR(100) NOT NULL,
  \`super_area\` VARCHAR(100) NOT NULL,
  \`carpet_area\` VARCHAR(100) NOT NULL,
  \`price_estimate\` VARCHAR(100) NOT NULL,
  \`image_url\` VARCHAR(500) NOT NULL,
  \`dimensions_json\` JSON DEFAULT NULL,
  FOREIGN KEY (\`property_id\`) REFERENCES \`properties\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 13. AMENITIES
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`property_amenities\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`property_id\` VARCHAR(50) NOT NULL,
  \`name\` VARCHAR(150) NOT NULL,
  \`icon\` VARCHAR(100) NOT NULL DEFAULT 'check_circle',
  \`category\` ENUM('sports', 'leisure', 'eco', 'security') NOT NULL DEFAULT 'leisure',
  \`description\` VARCHAR(255) DEFAULT NULL,
  FOREIGN KEY (\`property_id\`) REFERENCES \`properties\`(\`id\`) ON DELETE CASCADE,
  INDEX \`idx_amenities_prop\` (\`property_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 14. CONNECTIVITY & TRANSIT BENCHMARKS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`property_connectivity\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`property_id\` VARCHAR(50) NOT NULL,
  \`title\` VARCHAR(150) NOT NULL,
  \`distance\` VARCHAR(50) NOT NULL,
  \`duration\` VARCHAR(50) NOT NULL,
  \`category\` ENUM('transit', 'business', 'lifestyle', 'education', 'healthcare') NOT NULL,
  \`icon\` VARCHAR(100) NOT NULL DEFAULT 'near_me',
  FOREIGN KEY (\`property_id\`) REFERENCES \`properties\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 15. NEIGHBORHOOD SCORES (Radar Metrics)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`property_neighborhood_scores\` (
  \`property_id\` VARCHAR(50) PRIMARY KEY,
  \`overall\` DECIMAL(3,1) NOT NULL DEFAULT 9.0,
  \`connectivity\` DECIMAL(3,1) NOT NULL DEFAULT 9.0,
  \`lifestyle\` DECIMAL(3,1) NOT NULL DEFAULT 9.0,
  \`schools_health\` DECIMAL(3,1) NOT NULL DEFAULT 9.0,
  \`green_cover\` DECIMAL(3,1) NOT NULL DEFAULT 9.0,
  FOREIGN KEY (\`property_id\`) REFERENCES \`properties\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 16. FREQUENTLY ASKED QUESTIONS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`property_faqs\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`property_id\` VARCHAR(50) NOT NULL,
  \`question\` TEXT NOT NULL,
  \`answer\` TEXT NOT NULL,
  \`sort_order\` INT DEFAULT 0,
  FOREIGN KEY (\`property_id\`) REFERENCES \`properties\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 17. MASTER PROPERTY INFRASTRUCTURE & CIVIC SPECIFICATIONS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`property_master_details\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`property_id\` VARCHAR(50) NOT NULL UNIQUE,
  \`project_name\` VARCHAR(255) DEFAULT '',
  \`developer\` VARCHAR(255) DEFAULT '',
  \`rera_number\` VARCHAR(150) DEFAULT '',
  \`dtcp_approved\` VARCHAR(10) DEFAULT 'Yes',
  \`dtcp_approval_no\` VARCHAR(150) DEFAULT '',
  \`patta_type\` VARCHAR(100) DEFAULT 'Individual Patta',
  \`clear_title_available\` VARCHAR(10) DEFAULT 'Yes',
  \`bank_loan_approved\` VARCHAR(10) DEFAULT 'Yes',
  \`area_location\` VARCHAR(150) DEFAULT '',
  \`village_locality\` VARCHAR(150) DEFAULT '',
  \`taluk\` VARCHAR(100) DEFAULT '',
  \`district\` VARCHAR(100) DEFAULT '',
  \`pincode\` VARCHAR(20) DEFAULT '',
  \`google_maps_link\` TEXT,
  \`plot_no\` VARCHAR(50) DEFAULT '',
  \`plot_size_sqft\` DECIMAL(12,2) DEFAULT 0,
  \`plot_size_cents\` DECIMAL(10,2) DEFAULT 0,
  \`dimension\` VARCHAR(100) DEFAULT '',
  \`facing\` VARCHAR(50) DEFAULT 'East',
  \`corner_plot\` VARCHAR(10) DEFAULT 'No',
  \`land_use\` VARCHAR(100) DEFAULT 'Residential',
  \`price_per_sqft\` DECIMAL(12,2) DEFAULT 0,
  \`total_price\` DECIMAL(15,2) DEFAULT 0,
  \`availability\` VARCHAR(50) DEFAULT 'Available',
  \`petrol_bunk_distance\` DECIMAL(6,2) DEFAULT NULL,
  \`schools_nearby\` VARCHAR(255) DEFAULT '',
  \`colleges_nearby\` VARCHAR(255) DEFAULT '',
  \`hospital_nearby\` VARCHAR(255) DEFAULT '',
  \`corridor\` VARCHAR(100) DEFAULT 'IT Corridor',
  \`bus_stop_distance\` DECIMAL(6,2) DEFAULT NULL,
  \`railway_station_nearby\` VARCHAR(255) DEFAULT '',
  \`highway_name\` VARCHAR(150) DEFAULT '',
  \`highway_distance\` DECIMAL(6,2) DEFAULT NULL,
  \`airport_distance\` DECIMAL(6,2) DEFAULT NULL,
  \`suited_for\` VARCHAR(100) DEFAULT 'Both',
  \`possession_timeline\` VARCHAR(100) DEFAULT 'Immediate',
  \`electricity\` VARCHAR(50) DEFAULT 'Available',
  \`water_connection\` VARCHAR(50) DEFAULT 'Available',
  \`drainage_facility\` VARCHAR(100) DEFAULT 'Underground',
  \`road_width_ft\` INT DEFAULT 30,
  \`road_type\` VARCHAR(100) DEFAULT 'Tar Road',
  \`street_lights\` VARCHAR(10) DEFAULT 'Yes',
  \`compound_wall_gated\` VARCHAR(10) DEFAULT 'Yes',
  \`park\` VARCHAR(10) DEFAULT 'Yes',
  \`other_amenities\` TEXT,
  \`developer_maintenance_years\` INT DEFAULT 2,
  \`flood_zone\` VARCHAR(50) DEFAULT 'No',
  \`waterlogging_history\` VARCHAR(10) DEFAULT 'No',
  \`contact_person_phone\` VARCHAR(150) DEFAULT '',
  \`remarks\` TEXT,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX \`idx_pm_prop\` (\`property_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 18. USERS & ADMINISTRATORS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`users\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`name\` VARCHAR(120) NOT NULL,
  \`email\` VARCHAR(150) NOT NULL UNIQUE,
  \`phone\` VARCHAR(25) DEFAULT NULL,
  \`password_hash\` VARCHAR(255) DEFAULT NULL,
  \`role\` ENUM('buyer', 'seller', 'developer', 'admin', 'co_admin') DEFAULT 'buyer',
  \`points_balance\` INT DEFAULT 40,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX \`idx_user_email\` (\`email\`),
  INDEX \`idx_user_phone\` (\`phone\`),
  INDEX \`idx_user_role\` (\`role\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 19. RECHARGE PACKAGES (Media Points Economy)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`recharge_packages\` (
  \`id\` VARCHAR(50) PRIMARY KEY,
  \`name\` VARCHAR(100) NOT NULL,
  \`category\` VARCHAR(100) NOT NULL,
  \`points\` INT NOT NULL,
  \`bonus_points\` INT DEFAULT 0,
  \`price_in_rupees\` INT NOT NULL,
  \`subtitle\` VARCHAR(255) DEFAULT NULL,
  \`unlock_estimate\` VARCHAR(100) DEFAULT NULL,
  \`is_popular\` TINYINT(1) DEFAULT 0,
  \`is_recommended\` TINYINT(1) DEFAULT 0,
  \`features_json\` JSON DEFAULT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 20. WALLET & PAYMENT TRANSACTIONS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`wallet_transactions\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`user_id\` INT NOT NULL,
  \`transaction_type\` ENUM('credit_purchase', 'debit_unlock', 'bonus_credit') NOT NULL,
  \`points\` INT NOT NULL,
  \`amount_rupees\` DECIMAL(10,2) DEFAULT 0.00,
  \`razorpay_order_id\` VARCHAR(100) DEFAULT NULL,
  \`razorpay_payment_id\` VARCHAR(100) DEFAULT NULL,
  \`payment_method\` VARCHAR(100) DEFAULT NULL,
  \`description\` VARCHAR(255) NOT NULL,
  \`status\` ENUM('pending', 'success', 'failed') DEFAULT 'success',
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
  INDEX \`idx_wallet_user\` (\`user_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 21. MEDIA UNLOCKS (Audited Consumption of 4K/Drone Media)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`property_media_unlocks\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`user_id\` INT NOT NULL,
  \`property_id\` VARCHAR(50) NOT NULL,
  \`points_spent\` INT NOT NULL,
  \`unlocked_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
  FOREIGN KEY (\`property_id\`) REFERENCES \`properties\`(\`id\`) ON DELETE CASCADE,
  UNIQUE KEY \`uk_user_property_unlock\` (\`user_id\`, \`property_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 22. USER SHORTLISTS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`user_shortlists\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`user_id\` INT NOT NULL,
  \`property_id\` VARCHAR(50) NOT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
  FOREIGN KEY (\`property_id\`) REFERENCES \`properties\`(\`id\`) ON DELETE CASCADE,
  UNIQUE KEY \`uk_user_property_shortlist\` (\`user_id\`, \`property_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 23. CONCIERGE LEADS, SITE VISITS & BROCHURE REQUESTS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`inquiries_and_visits\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`property_id\` VARCHAR(50) NOT NULL,
  \`user_id\` INT DEFAULT NULL,
  \`lead_type\` ENUM('site_visit', 'brochure_download', 'whatsapp_concierge', 'callback_request') NOT NULL,
  \`contact_name\` VARCHAR(120) NOT NULL,
  \`contact_phone\` VARCHAR(25) NOT NULL,
  \`contact_email\` VARCHAR(150) DEFAULT NULL,
  \`preferred_date\` DATE DEFAULT NULL,
  \`visit_slot\` VARCHAR(100) DEFAULT NULL,
  \`notes\` TEXT DEFAULT NULL,
  \`status\` ENUM('new', 'contacted', 'scheduled', 'completed', 'cancelled') DEFAULT 'new',
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`property_id\`) REFERENCES \`properties\`(\`id\`) ON DELETE CASCADE,
  FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL,
  INDEX \`idx_inq_prop\` (\`property_id\`),
  INDEX \`idx_inq_status\` (\`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 24. ADMIN & PEER ACTIVITY AUDIT LOGS (Maker-Checker / Four-Eyes Ledger)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`admin_activity_logs\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`admin_id\` INT NOT NULL,
  \`admin_name\` VARCHAR(120) NOT NULL,
  \`action_type\` ENUM('post_property', 'approve_peer_review', 'approve_user_review', 'reject_property', 'request_revision', 'admin_login') NOT NULL,
  \`property_id\` VARCHAR(50) DEFAULT NULL,
  \`property_title\` VARCHAR(255) DEFAULT NULL,
  \`notes\` TEXT DEFAULT NULL,
  \`target_user_id\` INT DEFAULT NULL,
  \`target_user_name\` VARCHAR(120) DEFAULT NULL,
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX \`idx_admin_id\` (\`admin_id\`),
  INDEX \`idx_action_type\` (\`action_type\`),
  INDEX \`idx_created_at\` (\`created_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 25. GUEST / UNREGISTERED DEVICE VIEW RESTRICTIONS (Cross-Browser Limit)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`guest_device_views\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`ip_address\` VARCHAR(45) NOT NULL,
  \`device_hash\` VARCHAR(64) NOT NULL,
  \`property_id\` VARCHAR(50) NOT NULL,
  \`viewed_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`last_active_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY \`idx_guest_view\` (\`ip_address\`, \`device_hash\`, \`property_id\`),
  KEY \`idx_ip\` (\`ip_address\`),
  KEY \`idx_device\` (\`device_hash\`),
  KEY \`idx_viewed_at\` (\`viewed_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- INITIAL SEED DATA (ESSENTIAL RECHARGE PACKAGES & ADMIN PERSONAS)
-- =====================================================================

-- 1. Recharge Packages
INSERT INTO \`recharge_packages\` (\`id\`, \`name\`, \`category\`, \`points\`, \`bonus_points\`, \`price_in_rupees\`, \`subtitle\`, \`unlock_estimate\`, \`is_popular\`, \`is_recommended\`, \`features_json\`)
VALUES
  ('pack_starter', 'Discovery Pack', 'Individual', 10, 0, 500, 'Perfect for exploring 2-3 shortlisted properties', '2-3 Media Unlocks', 0, 0, '["Unlock 2 Full 4K Drone Surveys","High-Res Typology Layouts","Valid for 90 Days"]'),
  ('pack_investor', 'Investor Pack', 'Popular', 20, 2, 1000, 'Best value for active property hunters', '5-6 Media Unlocks', 1, 1, '["Unlock 5 Full 4K Drone Surveys","2 Bonus Media Credits included","Priority Concierge Line","Valid for 180 Days"]'),
  ('pack_hnipremium', 'HNIPack Premium', 'VIP', 50, 10, 2500, 'Complete portfolio inspection suite', '15+ Media Unlocks', 0, 0, '["Unlock 15 Full Drone Surveys","10 Bonus Media Credits","Direct SRO Lawyer Title Check","Dedicated RM Support","Never Expires"]')
ON DUPLICATE KEY UPDATE \`name\` = VALUES(\`name\`);

-- 2. Master Administrators (Ezhil, Ram, Benny)
-- Pre-encrypted passwords using standard bcrypt:
--   Ezhil: ezhil@2026
--   Ram:   ram@2026
--   Benny: benny@2026
INSERT INTO \`users\` (\`id\`, \`name\`, \`email\`, \`phone\`, \`password_hash\`, \`role\`, \`points_balance\`)
VALUES 
  (101, 'Ezhil', 'ezhil@mannidam.com', '+91 94440 10001', '$2y$10$s8batNschbmVOPeuKPmAQO2fe3UfDbJ8qm.VvHaI74k.K7zuVAu8y', 'admin', 5000),
  (102, 'Ram', 'ram@mannidam.com', '+91 94440 10002', '$2y$10$tN1.taAgnIhI/0Z94zyp6Ojb2h1sKAFx9IuXLeZi5swSWTwBLkZ1G', 'admin', 5000),
  (103, 'Benny', 'benny@mannidam.com', '+91 94440 00003', '$2y$10$FiDMFPcOMyjptraT5aqkYe.pvJaXj0mwqId8Jd2M8PnZq5HsWKwM6', 'admin', 5000)
ON DUPLICATE KEY UPDATE 
  \`name\` = VALUES(\`name\`),
  \`role\` = 'admin',
  \`email\` = VALUES(\`email\`),
  \`password_hash\` = VALUES(\`password_hash\`);

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- COMPLETE DATABASE SCHEMA READY
-- =====================================================================
`;

// Save to backend/sql
fs.writeFileSync('backend/sql/01_COMPLETE_DATABASE_SCHEMA.sql', completeSql, 'utf8');
console.log('Saved: backend/sql/01_COMPLETE_DATABASE_SCHEMA.sql');

// Save to final_package/database
if (fs.existsSync('final_package/database')) {
  fs.writeFileSync('final_package/database/01_COMPLETE_DATABASE_SCHEMA.sql', completeSql, 'utf8');
  console.log('Saved: final_package/database/01_COMPLETE_DATABASE_SCHEMA.sql');
}

// Save to final/database
if (fs.existsSync('final/database')) {
  fs.writeFileSync('final/database/01_COMPLETE_DATABASE_SCHEMA.sql', completeSql, 'utf8');
  console.log('Saved: final/database/01_COMPLETE_DATABASE_SCHEMA.sql');
}

