-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: mannidam_property_db
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `admin_activity_logs`
--

DROP TABLE IF EXISTS `admin_activity_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `admin_activity_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `admin_id` int(11) NOT NULL,
  `admin_name` varchar(120) NOT NULL,
  `action_type` enum('post_property','approve_peer_review','approve_user_review','reject_property','request_revision','admin_login') NOT NULL,
  `property_id` varchar(50) DEFAULT NULL,
  `property_title` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `target_user_id` int(11) DEFAULT NULL,
  `target_user_name` varchar(120) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_admin_id` (`admin_id`),
  KEY `idx_action_type` (`action_type`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_activity_logs`
--

LOCK TABLES `admin_activity_logs` WRITE;
/*!40000 ALTER TABLE `admin_activity_logs` DISABLE KEYS */;
INSERT INTO `admin_activity_logs` VALUES (1,101,'Ezhil','approve_user_review','prop-user-rev-01','Emerald Green 3BHK Penthouse','Verified Encumbrance Certificate (30-year Nil EC) and building plan sanction.',1,'Demo Real Estate Investor','2026-10-15 10:15:10'),(2,101,'Ezhil','post_property','prop-admin-peer-01','Veda Serenity Coastal Villa 4BHK','Created high-value luxury coastal villa listing. Submitted for Co-Admin peer verification.',NULL,NULL,'2026-10-15 08:45:22'),(3,101,'Ezhil','admin_login',NULL,NULL,'Administrative login authenticated via IP: 127.0.0.1 (Chennai Central)',NULL,NULL,'2026-10-15 07:30:00'),(4,102,'Ram','approve_peer_review','prop-eae62ab2c982','Coromandel Horizon Villa','Independent Maker-Checker Peer Review: Verified coastal CRZ clearance and SRO Patta deed.',103,'Benny','2026-10-15 10:44:27'),(5,102,'Ram','request_revision','p-4','Gated Beachside Residential Villa Plot Enclave','Requested updated CMDA DTCP layout sketch with street lighting grid specifications.',1,'Demo Real Estate Investor','2026-10-15 06:50:15'),(6,102,'Ram','admin_login',NULL,NULL,'Administrative login authenticated via IP: 127.0.0.1 (OMR Office)',NULL,NULL,'2026-10-15 06:00:00'),(7,103,'Benny','post_property','prop-eae62ab2c982','Coromandel Horizon Villa','Initiated new luxury coastal property submission for architectural review.',NULL,NULL,'2026-10-15 10:40:43'),(8,103,'Benny','approve_peer_review','prop-admin-peer-01','Veda Serenity Coastal Villa 4BHK','Four-Eyes Audit: Verified Ezhil\'s cadastral plot boundary survey and RERA TN/29 deed.',101,'Ezhil','2026-10-15 10:25:00'),(9,103,'Benny','admin_login',NULL,NULL,'Administrative login authenticated via IP: 127.0.0.1 (Director Console)',NULL,NULL,'2026-10-15 04:30:00'),(10,103,'Benny','post_property','prop-9cc975114629','Skyline Terrace Penthouse','Created new property listing. Flagged for Co-Admin peer approval.',NULL,NULL,'2026-10-15 15:24:29'),(11,101,'Ezhil','post_property','prop-d17891879d64','Ezhil test','Created new property listing. Flagged for Co-Admin peer approval.',NULL,NULL,'2026-10-15 15:38:19'),(12,101,'Ezhil','post_property','prop-9adac35cd419','Test Villa for Upload Verification','Created new property listing. Flagged for Co-Admin peer approval.',NULL,NULL,'2026-10-16 09:43:46'),(13,103,'Benny','post_property','prop-159d3e28fe4c','Benny test','Created new property listing. Flagged for Co-Admin peer approval.',NULL,NULL,'2026-10-16 09:46:57'),(14,101,'Ezhil','approve_peer_review','prop-159d3e28fe4c','Benny test','',103,'Benny','2026-10-16 09:47:22');
/*!40000 ALTER TABLE `admin_activity_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cities`
--

DROP TABLE IF EXISTS `cities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cities` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `city_key` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `state` varchar(100) NOT NULL,
  `avg_rate_sqft` varchar(50) DEFAULT 'Avg ₹8,000/sq.ft',
  `yoy_growth` varchar(30) DEFAULT '+12.0% YoY',
  `deed_count` varchar(50) DEFAULT '5,000+ Deeds',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `city_key` (`city_key`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cities`
--

LOCK TABLES `cities` WRITE;
/*!40000 ALTER TABLE `cities` DISABLE KEYS */;
INSERT INTO `cities` VALUES (1,'chennai','Chennai','Tamil Nadu','Avg ₹8,250/sq.ft','+11.2% YoY','4,820 Deeds',1,'2026-10-15 11:31:48'),(2,'bengaluru','Bengaluru','Karnataka','Avg ₹9,450/sq.ft','+13.8% YoY','6,140 Deeds',1,'2026-10-15 11:31:48'),(3,'hyderabad','Hyderabad','Telangana','Avg ₹7,100/sq.ft','+16.5% YoY','3,980 Deeds',1,'2026-10-15 11:31:48'),(4,'mumbai','Mumbai','Maharashtra','Avg ₹19,200/sq.ft','+7.4% YoY','5,410 Deeds',1,'2026-10-15 11:31:48'),(5,'ncr','Delhi NCR','Delhi / Haryana','Avg ₹7,800/sq.ft','+12.4% YoY','8,060 Deeds',1,'2026-10-15 11:31:48');
/*!40000 ALTER TABLE `cities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `developers`
--

DROP TABLE IF EXISTS `developers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `developers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `slug` varchar(150) DEFAULT NULL,
  `established_year` varchar(20) DEFAULT '2005',
  `projects_completed` varchar(50) DEFAULT '25+ Projects',
  `delivered_sqft` varchar(50) DEFAULT '12M+ sq.ft',
  `on_time_track` varchar(50) DEFAULT '98.5% On-Time Delivery',
  `corporate_office` varchar(255) DEFAULT NULL,
  `about_text` text DEFAULT NULL,
  `logo_url` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `developers`
--

LOCK TABLES `developers` WRITE;
/*!40000 ALTER TABLE `developers` DISABLE KEYS */;
INSERT INTO `developers` VALUES (1,'Experion Developers & Infrastructure','experion-developers','2006','38+ Landmarks','18.4M+ sq.ft','99.2% Delivery Precision','Golf Course Ext. Road, Gurugram','Experion is a 100% FDI funded real estate developer backed by Experion Holdings Pte. Ltd, Singapore. Renowned for architectural precision, ecological luxury, and legally transparent clear-title deliveries.','/logo.svg','2026-10-15 11:31:48'),(2,'Prestige Estates Projects Ltd','prestige-group','1986','280+ Landmarks','150M+ sq.ft','98.5% Delivery Record','The Falcon House, Bangalore','Over three decades of architectural excellence, shaping the skylines of Bengaluru, Chennai, Hyderabad, and Mumbai with zero litigation and strict RERA compliance.','/logo.svg','2026-10-15 11:31:48'),(3,'Godrej Properties Ltd','godrej-properties','1990','140+ Landmarks','85M+ sq.ft','99.0% Delivery Record','Godrej One, Vikhroli East, Mumbai','Each Godrej development combines a 125-year legacy of excellence and trust with commitment to cutting-edge design and sustainability.','/logo.svg','2026-10-15 11:31:48');
/*!40000 ALTER TABLE `developers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inquiries_and_visits`
--

DROP TABLE IF EXISTS `inquiries_and_visits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `inquiries_and_visits` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `property_id` varchar(50) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `lead_type` enum('site_visit','brochure_download','whatsapp_concierge','callback_request') NOT NULL,
  `contact_name` varchar(120) NOT NULL,
  `contact_phone` varchar(25) NOT NULL,
  `contact_email` varchar(150) DEFAULT NULL,
  `preferred_date` date DEFAULT NULL,
  `visit_slot` varchar(100) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `status` enum('new','contacted','scheduled','completed','cancelled') DEFAULT 'new',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `idx_inq_prop` (`property_id`),
  KEY `idx_inq_status` (`status`),
  CONSTRAINT `inquiries_and_visits_ibfk_1` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE,
  CONSTRAINT `inquiries_and_visits_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inquiries_and_visits`
--

LOCK TABLES `inquiries_and_visits` WRITE;
/*!40000 ALTER TABLE `inquiries_and_visits` DISABLE KEYS */;
INSERT INTO `inquiries_and_visits` VALUES (1,'p-1',NULL,'site_visit','Arun Kumar','+91 98840 99999',NULL,'2026-10-25','Morning 10 AM - 1 PM','Cadastral site visit scheduled via web app','scheduled','2026-10-15 11:39:46');
/*!40000 ALTER TABLE `inquiries_and_visits` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `localities`
--

DROP TABLE IF EXISTS `localities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `localities` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `city_id` int(11) NOT NULL,
  `name` varchar(120) NOT NULL,
  `pin_code` varchar(20) DEFAULT NULL,
  `avg_sqft_rate` varchar(50) DEFAULT NULL,
  `growth_yoy` varchar(30) DEFAULT NULL,
  `deed_count` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_locality_city` (`city_id`),
  KEY `idx_locality_name` (`name`),
  CONSTRAINT `localities_ibfk_1` FOREIGN KEY (`city_id`) REFERENCES `cities` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `localities`
--

LOCK TABLES `localities` WRITE;
/*!40000 ALTER TABLE `localities` DISABLE KEYS */;
INSERT INTO `localities` VALUES (1,3,'Jubilee Hills Road No. 45','500033','₹11,250/sq.ft','+18.4% YoY','420 Deeds','2026-10-15 11:31:48'),(2,1,'Boat Club Road, RA Puram','600028','₹18,400/sq.ft','+14.1% YoY','180 Deeds','2026-10-15 11:31:48'),(3,2,'Lavelle Road / UB City','560001','₹15,600/sq.ft','+12.9% YoY','240 Deeds','2026-10-15 11:31:48'),(4,1,'East Coast Road (ECR Corridor)','600115','₹8,900/sq.ft','+15.2% YoY','610 Deeds','2026-10-15 11:31:48'),(5,5,'Golf Course Road, Sector 42','122002','₹22,500/sq.ft','+19.6% YoY','890 Deeds','2026-10-15 11:31:48');
/*!40000 ALTER TABLE `localities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `properties`
--

DROP TABLE IF EXISTS `properties`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `properties` (
  `id` varchar(50) NOT NULL,
  `developer_id` int(11) DEFAULT NULL,
  `city_id` int(11) NOT NULL,
  `locality_id` int(11) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `property_type` enum('Apartments & Flats','Independent Villas','Luxury Penthouses','Gated CMDA Plots','Commercial Spaces') NOT NULL,
  `listing_mode` enum('buy','rent','plots','commercial') NOT NULL DEFAULT 'buy',
  `locality_name` varchar(150) NOT NULL,
  `city_name` varchar(100) NOT NULL,
  `price` varchar(50) NOT NULL,
  `price_per_sqft` varchar(50) NOT NULL,
  `sqft` varchar(50) NOT NULL,
  `bhk_badge` varchar(50) NOT NULL,
  `facing_or_view` varchar(100) NOT NULL,
  `main_image_url` varchar(500) NOT NULL,
  `rera_number` varchar(100) NOT NULL,
  `brokerage_badge` varchar(100) DEFAULT '0% Direct SRO Deed',
  `special_tag` varchar(100) DEFAULT NULL,
  `points_badge` int(11) DEFAULT 4,
  `possession_date` varchar(100) DEFAULT NULL,
  `project_status` varchar(100) DEFAULT 'Under Construction',
  `total_land_parcel` varchar(100) DEFAULT '9.6 Acres Gated Enclave',
  `total_units` varchar(100) DEFAULT '32 Exclusive Residences',
  `media_points` int(11) DEFAULT 4,
  `whatsapp_url` varchar(500) DEFAULT NULL,
  `is_featured` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `status` enum('published','pending_review','pending_peer_review','rejected','revision_requested','draft') NOT NULL DEFAULT 'published',
  `submitted_by_user_id` int(11) DEFAULT NULL,
  `submitted_by_name` varchar(150) DEFAULT NULL,
  `submitted_by_role` varchar(50) DEFAULT 'admin',
  `reviewed_by_user_id` int(11) DEFAULT NULL,
  `reviewed_by_name` varchar(150) DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `review_notes` text DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `developer_id` (`developer_id`),
  KEY `locality_id` (`locality_id`),
  KEY `idx_prop_type` (`property_type`),
  KEY `idx_prop_mode` (`listing_mode`),
  KEY `idx_prop_city` (`city_id`),
  KEY `idx_prop_featured` (`is_featured`),
  CONSTRAINT `properties_ibfk_1` FOREIGN KEY (`developer_id`) REFERENCES `developers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `properties_ibfk_2` FOREIGN KEY (`city_id`) REFERENCES `cities` (`id`),
  CONSTRAINT `properties_ibfk_3` FOREIGN KEY (`locality_id`) REFERENCES `localities` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `properties`
--

LOCK TABLES `properties` WRITE;
/*!40000 ALTER TABLE `properties` DISABLE KEYS */;
INSERT INTO `properties` VALUES ('p-1',1,3,1,'Contemporary Minimalist Villa with Infinity Pool','Independent Villas','buy','Jubilee Hills Road No. 45','Hyderabad','₹5.40 Cr','₹11,250 /sq.ft','4,800 sq.ft','5 Bed, 6 Bath','West Facing • Hill Crest','https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80','RERA-TS-2024-HYD-0419','0% Direct Owner SRO Deed','Private Hilltop Pool',4,'Ready to Move (Immediate)','Ready to Occupy','9.6 Acres Gated Enclave','32 Exclusive Residences',4,'https://wa.me/919444100000',1,'2026-10-15 11:31:48','2026-10-15 13:48:44','published',101,'Kavitha Rajan','admin',NULL,NULL,NULL,NULL,NULL),('p-2',2,1,2,'Sea-Facing Sky Penthouse with Private Plunge Pool','Luxury Penthouses','buy','Boat Club Road, RA Puram','Chennai','₹8.20 Cr','₹14,900 /sq.ft','5,500 sq.ft','4 BHK Penthouse','East Facing • Bay Panoramic','https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80','TN/29/Building/0488/2023','0% Direct Builder SRO Deed','Bespoke Italian Marble',6,'Q4 2026','Under Construction','4.2 Acres Reserve','48 Signature Residences',6,'https://wa.me/919444100000',1,'2026-10-15 11:31:48','2026-10-15 13:48:44','published',101,'Kavitha Rajan','admin',NULL,NULL,NULL,NULL,NULL),('p-3',2,2,3,'Brutalist Glass & Cantilever Architectural Mansion','Apartments & Flats','buy','Lavelle Road / UB City','Bengaluru','₹12.50 Cr','₹19,230 /sq.ft','6,500 sq.ft','5 Bed, 7 Bath','North-East • Cubbon Park Canopy','https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80','PRM/KA/RERA/1251/310/PR/210423/004122','0% Direct Owner SRO Deed','Private Penthouse Elevator',6,'Ready to Move','Ready to Occupy','2.8 Acres High-Street Enclave','18 Bespoke Mansions',6,'https://wa.me/919444100000',1,'2026-10-15 11:31:48','2026-10-15 13:48:44','published',101,'Kavitha Rajan','admin',NULL,NULL,NULL,NULL,NULL),('p-4',3,1,4,'Gated Beachside Residential Villa Plot Enclave','Gated CMDA Plots','plots','East Coast Road (ECR Corridor)','Chennai','₹1.85 Cr','₹7,700 /sq.ft','2,400 sq.ft','Corner Plot (40x60)','North Facing • 40ft CMDA Blacktop','https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80','TN/01/Layout/0291/2024','CMDA & RERA Approved Plot','Clear Title 30-Yr Nil EC',2,'Immediate Registration','Ready for Construction','18.5 Acres Master Layout','124 Sanctioned Plots',2,'https://wa.me/919444100000',1,'2026-10-15 11:31:48','2026-10-15 13:48:44','published',101,'Kavitha Rajan','admin',NULL,NULL,NULL,NULL,NULL),('prop-159d3e28fe4c',NULL,1,1,'Benny test','Gated CMDA Plots','buy','Anna Nagar','Chennai','₹ 1.85 Cr','₹ 10,500/sq.ft','1,760 sq.ft','3 BHK','North-East Facing','http://localhost:8000/uploads/properties/prop_20261016_114651_4567c68287c1.jpg','TN/29/Building/0811/2026','0% Direct SRO Deed',NULL,4,NULL,'Under Construction','9.6 Acres Gated Enclave','32 Exclusive Residences',4,NULL,0,'2026-10-16 09:46:57','2026-10-16 09:47:22','published',103,'Benny','admin',101,'Ezhil','2026-10-16 15:17:22','Listing verified and approved by Ezhil (Title deed, RERA, and cadastral survey check completed).',NULL),('prop-9cc975114629',NULL,1,1,'Skyline Terrace Penthouse','Luxury Penthouses','buy','Boat Club Road','Chennai','₹ 8.50 Cr','₹ 15,000/sq.ft','5,500 sq.ft','4 BHK','East Facing','https://images.unsplash.com/photo-1600585154340-be6161a56a0c','TN/29/Building/0512/2026','0% Direct SRO Deed',NULL,4,NULL,'Under Construction','9.6 Acres Gated Enclave','32 Exclusive Residences',4,NULL,0,'2026-10-15 15:24:29','2026-10-15 15:24:29','pending_peer_review',103,'Benny','admin',NULL,NULL,NULL,NULL,NULL),('prop-admin-peer-01',NULL,1,2,'Veda Serenity Coastal Villa 4BHK','Independent Villas','buy','ECR (East Coast Road)','Chennai','??? 4.80 Cr','??? 14,500/sq.ft','3,310 sq.ft','4 BHK','Sea Facing','https://images.unsplash.com/photo-1613977257363-707ba9348227','TN/29/Building/0944/2026','0% Direct SRO Deed',NULL,4,NULL,'Under Construction','9.6 Acres Gated Enclave','32 Exclusive Residences',4,NULL,0,'2026-10-15 13:48:44','2026-10-15 14:09:45','pending_peer_review',101,'Ezhil','admin',102,'Arunachalam S.','2026-10-15 19:20:53','Verified coastal CRZ clearance and title deed.',NULL),('prop-d17891879d64',NULL,1,1,'Ezhil test','Apartments & Flats','plots','Porur','Chennai','₹ 1.5 Cr','₹ 10,000/sq.ft','1,160 sq.ft','','North-East Facing','https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80','TN/27/Building/0811/2026','0% Direct SRO Deed',NULL,4,NULL,'Under Construction','9.6 Acres Gated Enclave','32 Exclusive Residences',4,NULL,0,'2026-10-15 15:38:19','2026-10-15 15:38:19','pending_peer_review',101,'Ezhil','admin',NULL,NULL,NULL,NULL,NULL),('prop-eae62ab2c982',NULL,1,1,'Coromandel Horizon Villa','Independent Villas','buy','ECR','Chennai','? 7.20 Cr','₹ 8,500/sq.ft','1,450 sq.ft','3 BHK','East Facing','https://images.unsplash.com/photo-1600585154340-be6161a56a0c','TN/29/Building/0512/2026','0% Direct SRO Deed',NULL,4,NULL,'Under Construction','9.6 Acres Gated Enclave','32 Exclusive Residences',4,NULL,0,'2026-10-15 14:14:11','2026-10-15 14:14:27','published',103,'Benny','admin',102,'Ram','2026-10-15 19:44:27','Verified coastal CRZ clearance and SRO Patta.',NULL),('prop-user-rev-01',NULL,1,1,'Emerald Green 3BHK Penthouse','Luxury Penthouses','buy','Anna Nagar','Chennai','??? 2.45 Cr','??? 11,200/sq.ft','2,188 sq.ft','3 BHK','East Facing','https://images.unsplash.com/photo-1600596542815-ffad4c1539a9','TN/29/Building/0122/2026','0% Direct SRO Deed',NULL,4,NULL,'Under Construction','9.6 Acres Gated Enclave','32 Exclusive Residences',4,NULL,0,'2026-10-15 13:48:44','2026-10-15 13:48:44','pending_review',1,'Demo Real Estate Investor','user',NULL,NULL,NULL,NULL,NULL),('prop-usr-3ad39859',NULL,1,1,'Benny sample house','Apartments & Flats','buy','Anna Nagar','Chennai','1cr','4000','2600','2 BHK','East Facing','https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80','T/26/4545','0% Direct SRO Deed',NULL,4,NULL,'Under Construction','9.6 Acres Gated Enclave','32 Exclusive Residences',4,NULL,0,'2026-10-15 14:06:30','2026-10-15 14:07:04','published',3,'Benny','user',101,'Kavitha Rajan','2026-10-15 19:37:04','Listing verified and approved by Kavitha Rajan (Title deed, RERA, and cadastral survey check completed).',NULL),('prop-usr-ee30356f',NULL,1,1,'Skyline Garden 4BHK Penthouse','Luxury Penthouses','buy','Poes Garden','Chennai','? 6.50 Cr','? 18,000/sq.ft','3,600 sq.ft','4 BHK','North Facing','https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80','TN/29/Building/0991/2026','0% Direct SRO Deed',NULL,4,NULL,'Under Construction','9.6 Acres Gated Enclave','32 Exclusive Residences',4,NULL,0,'2026-10-15 14:04:06','2026-10-15 14:04:06','pending_review',1,'Demo Real Estate Investor','user',NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `properties` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `property_amenities`
--

DROP TABLE IF EXISTS `property_amenities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `property_amenities` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `property_id` varchar(50) NOT NULL,
  `name` varchar(150) NOT NULL,
  `icon` varchar(100) NOT NULL DEFAULT 'check_circle',
  `category` enum('sports','leisure','eco','security') NOT NULL DEFAULT 'leisure',
  `description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_amenities_prop` (`property_id`),
  CONSTRAINT `property_amenities_ibfk_1` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `property_amenities`
--

LOCK TABLES `property_amenities` WRITE;
/*!40000 ALTER TABLE `property_amenities` DISABLE KEYS */;
INSERT INTO `property_amenities` VALUES (1,'p-1','Heated Private Infinity Pool','pool','leisure','36ft infinity pool with automated ozone filtration'),(2,'p-1','Biometric & Smart KNX Automation','home_iot_device','security','Keyless entry and scene control on smartphones'),(3,'p-1','Private Hydraulic Glass Elevator','elevator','leisure','3-stop Schindler elevator serving all levels'),(4,'p-1','Private Solar Microgrid Array','solar_power','eco','12kW on-grid solar system reducing power bills by 85%'),(5,'p-1','EV High-Output Charging Bay','ev_station','eco','22kW fast charger installed in covered portico'),(6,'p-1','24x7 Armed Perimeter Security','shield_lock','security','CCTV coverage with motion sensors and response team');
/*!40000 ALTER TABLE `property_amenities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `property_apartment_details`
--

DROP TABLE IF EXISTS `property_apartment_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `property_apartment_details` (
  `property_id` varchar(50) NOT NULL,
  `tower_count` varchar(100) DEFAULT NULL,
  `total_floors` varchar(100) DEFAULT NULL,
  `units_per_core` varchar(100) DEFAULT NULL,
  `ceiling_height` varchar(100) DEFAULT NULL,
  `balcony_deck` varchar(100) DEFAULT NULL,
  `hvac_system` varchar(150) DEFAULT NULL,
  `flooring_specs` varchar(255) DEFAULT NULL,
  `kitchen_fittings` varchar(255) DEFAULT NULL,
  `parking_bays` varchar(100) DEFAULT NULL,
  `clubhouse_size` varchar(100) DEFAULT NULL,
  `maintenance_fee` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`property_id`),
  CONSTRAINT `property_apartment_details_ibfk_1` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `property_apartment_details`
--

LOCK TABLES `property_apartment_details` WRITE;
/*!40000 ALTER TABLE `property_apartment_details` DISABLE KEYS */;
INSERT INTO `property_apartment_details` VALUES ('p-3','2 Iconic Glass Monolith Towers','G + 28 Floors','Exclusive 1 Unit per Core (Direct Elevator Access)','11.5 Feet Clear Slab-to-Slab Height','10-Foot Deep Cantilevered Sunset Deck','Daikin VRV Central Chilled-Water AC','Imported Greek Thassos White Marble','Poggenpohl Kitchens with Miele Appliances','4 Dedicated Covered Basement Bays with 22kW EV Chargers','45,000 sq.ft Private Clubhouse','₹6.50 /sq.ft /month');
/*!40000 ALTER TABLE `property_apartment_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `property_cadastral_audits`
--

DROP TABLE IF EXISTS `property_cadastral_audits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `property_cadastral_audits` (
  `property_id` varchar(50) NOT NULL,
  `survey_number` varchar(100) NOT NULL,
  `sro_jurisdiction` varchar(150) NOT NULL,
  `ec_status` varchar(150) NOT NULL,
  `patta_verification` varchar(150) NOT NULL,
  `rera_reg_no` varchar(150) NOT NULL,
  `circle_rate` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`property_id`),
  CONSTRAINT `property_cadastral_audits_ibfk_1` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `property_cadastral_audits`
--

LOCK TABLES `property_cadastral_audits` WRITE;
/*!40000 ALTER TABLE `property_cadastral_audits` DISABLE KEYS */;
INSERT INTO `property_cadastral_audits` VALUES ('p-1','Cadastral Survey No. 412/2A, Jubilee Hills Village','SRO Banjara Hills, Hyderabad Jurisdiction','30-Year Nil Encumbrance Certificate Verified (Form 15/16)','Direct Individual T-S Patta Deed (Verified by Bar Council Advocate)','RERA-TS-2024-HYD-0419','₹8,500/sq.ft Guideline Value','2026-10-15 11:31:48'),('p-2','T.S. No. 48/1, Block No. 12, RA Puram','SRO Mylapore, Chennai South','Nil Encumbrance Certificate Verified for 32 Years','CMDA Planning Permit No. B/NHRB/142/2023','TN/29/Building/0488/2023','₹13,500/sq.ft Guideline Value','2026-10-15 11:31:48'),('p-3','Sy. No. 94/1B, Sampangi Rama Nagar','SRO Shivajinagar, Bengaluru Urban','30-Year Clear Title with Title Guarantee Indemnity','BBMP A-Khata Certificate & Occupancy Certificate Sanctioned','PRM/KA/RERA/1251/310/PR/210423/004122','₹14,200/sq.ft Guideline Value','2026-10-15 11:31:48'),('p-4','Cadastral Survey No. 89/1, 89/2, Uthandi Village','SRO Neelankarai, Chennai Jurisdiction','Nil Encumbrance Certificate Verified for 35 Years','CMDA Layout Sanction No. 48/2023 & Individual Computerized Patta','TN/01/Layout/0291/2024','₹5,800/sq.ft Guideline Value','2026-10-15 11:31:48');
/*!40000 ALTER TABLE `property_cadastral_audits` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `property_commercial_details`
--

DROP TABLE IF EXISTS `property_commercial_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `property_commercial_details` (
  `property_id` varchar(50) NOT NULL,
  `efficiency_ratio` varchar(100) DEFAULT NULL,
  `rental_yield` varchar(100) DEFAULT NULL,
  `lease_terms` varchar(150) DEFAULT NULL,
  `monthly_rental` varchar(100) DEFAULT NULL,
  `power_redundancy` varchar(150) DEFAULT NULL,
  `elevators` varchar(100) DEFAULT NULL,
  `hvac_specs` varchar(150) DEFAULT NULL,
  `floor_plate_size` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`property_id`),
  CONSTRAINT `property_commercial_details_ibfk_1` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `property_commercial_details`
--

LOCK TABLES `property_commercial_details` WRITE;
/*!40000 ALTER TABLE `property_commercial_details` DISABLE KEYS */;
/*!40000 ALTER TABLE `property_commercial_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `property_connectivity`
--

DROP TABLE IF EXISTS `property_connectivity`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `property_connectivity` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `property_id` varchar(50) NOT NULL,
  `title` varchar(150) NOT NULL,
  `distance` varchar(50) NOT NULL,
  `duration` varchar(50) NOT NULL,
  `category` enum('transit','business','lifestyle','education','healthcare') NOT NULL,
  `icon` varchar(100) NOT NULL DEFAULT 'near_me',
  PRIMARY KEY (`id`),
  KEY `property_id` (`property_id`),
  CONSTRAINT `property_connectivity_ibfk_1` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `property_connectivity`
--

LOCK TABLES `property_connectivity` WRITE;
/*!40000 ALTER TABLE `property_connectivity` DISABLE KEYS */;
INSERT INTO `property_connectivity` VALUES (1,'p-1','Jubilee Hills Metro Station (Blue Line)','1.4 km','4 mins drive','transit','train'),(2,'p-1','Hitec City Mindspace Cyberabad Tech Corridor','5.2 km','12 mins drive','business','domain'),(3,'p-1','Apollo Hospitals International Health City','2.1 km','6 mins drive','healthcare','local_hospital'),(4,'p-1','Oakridge & Hyderabad Public School','3.8 km','9 mins drive','education','school'),(5,'p-1','Rajiv Gandhi International Airport (RGIA)','31 km','35 mins via PVNR Expressway','transit','flight');
/*!40000 ALTER TABLE `property_connectivity` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `property_faqs`
--

DROP TABLE IF EXISTS `property_faqs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `property_faqs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `property_id` varchar(50) NOT NULL,
  `question` text NOT NULL,
  `answer` text NOT NULL,
  `sort_order` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `property_id` (`property_id`),
  CONSTRAINT `property_faqs_ibfk_1` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `property_faqs`
--

LOCK TABLES `property_faqs` WRITE;
/*!40000 ALTER TABLE `property_faqs` DISABLE KEYS */;
INSERT INTO `property_faqs` VALUES (1,'p-1','Is there any brokerage or intermediary commission on this villa?','None whatsoever. Mannidam operates on a 100% direct owner/promoter model with verified Sub-Registrar Office deeds.',1),(2,'p-1','Are the 4K video walkthrough and drone cadastral surveys authentic?','Yes. Every premium media file is recorded by certified drone pilots and architectural film teams with zero CGI enhancements.',2),(3,'p-1','Has the title been verified with 30-year Encumbrance records?','Yes. An unbroken 30-year Nil Encumbrance Certificate (Form 15) and Sanctioned Mutation records are in file.',3);
/*!40000 ALTER TABLE `property_faqs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `property_floor_plans`
--

DROP TABLE IF EXISTS `property_floor_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `property_floor_plans` (
  `id` varchar(50) NOT NULL,
  `property_id` varchar(50) NOT NULL,
  `name` varchar(150) NOT NULL,
  `type` varchar(100) NOT NULL,
  `super_area` varchar(100) NOT NULL,
  `carpet_area` varchar(100) NOT NULL,
  `price_estimate` varchar(100) NOT NULL,
  `image_url` varchar(500) NOT NULL,
  `dimensions_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`dimensions_json`)),
  PRIMARY KEY (`id`),
  KEY `property_id` (`property_id`),
  CONSTRAINT `property_floor_plans_ibfk_1` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `property_floor_plans`
--

LOCK TABLES `property_floor_plans` WRITE;
/*!40000 ALTER TABLE `property_floor_plans` DISABLE KEYS */;
INSERT INTO `property_floor_plans` VALUES ('fp-1-a','p-1','Ground Level: Grand Living, Heated Pool & Chef Kitchen','Level 0 - Entertainment Suite','2,400 sq.ft','2,100 sq.ft','₹2.70 Cr Base Component','https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80','{\"Grand Foyer\": \"18 ft x 14 ft\", \"Formal Living\": \"28 ft x 20 ft\", \"Show Kitchen\": \"16 ft x 14 ft\", \"Pool Deck\": \"36 ft x 15 ft\"}'),('fp-1-b','p-1','First Level: Master Suite, Junior En-Suites & Sky Lounge','Level 1 - Private Family Quarters','2,400 sq.ft','2,050 sq.ft','₹2.70 Cr Base Component','https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=800&q=80','{\"Master Bedroom\": \"24 ft x 18 ft\", \"Walk-in Wardrobe\": \"14 ft x 12 ft\", \"Master Bath\": \"16 ft x 11 ft\", \"Bedrooms 2 & 3\": \"18 ft x 15 ft each\"}');
/*!40000 ALTER TABLE `property_floor_plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `property_highlights`
--

DROP TABLE IF EXISTS `property_highlights`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `property_highlights` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `property_id` varchar(50) NOT NULL,
  `highlight_text` varchar(255) NOT NULL,
  `sort_order` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `property_id` (`property_id`),
  CONSTRAINT `property_highlights_ibfk_1` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `property_highlights`
--

LOCK TABLES `property_highlights` WRITE;
/*!40000 ALTER TABLE `property_highlights` DISABLE KEYS */;
INSERT INTO `property_highlights` VALUES (1,'p-1','Heated private infinity edge swimming pool overlooking Jubilee Hills ridge',1),(2,'p-1','Triple-height central living pavilion with Belgian floor-to-ceiling double-glazed sliding glass',2),(3,'p-1','Imported Italian Statuario marble slabs across formal foyers & master suites',3),(4,'p-1','Sub-Zero & Wolf integrated designer show kitchen + secondary spice prep utility',4),(5,'p-1','Schneider KNX smart home automation with biometric keyless entry',5),(6,'p-1','Dedicated staff quarters with separate service elevator & independent entry',6),(7,'p-2','Private cantilevered sea-view plunge pool on the 28th floor sky terrace',1),(8,'p-2','Direct private biometric high-speed elevator opening into personal foyer',2),(9,'p-2','Bespoke Poggenpohl kitchen with Miele smart built-in appliances',3),(10,'p-4','CMDA Sanctioned Layout with individual unencumbered Revenue Patta',1),(11,'p-4','40-feet wide bitumen approach roads with underground storm water drains',2),(12,'p-4','Dedicated 11kV independent electrical substation & street LED grid',3),(13,'p-3','Panoramic floor-to-ceiling glass monolith facing Cubbon Park canopy',1),(14,'p-3','Double-height 24ft cantilevered sunset sky deck with imported Thassos marble',2),(15,'p-3','Private high-speed biometric elevator opening directly into residence foyer',3);
/*!40000 ALTER TABLE `property_highlights` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `property_media`
--

DROP TABLE IF EXISTS `property_media`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `property_media` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `property_id` varchar(50) NOT NULL,
  `media_type` enum('free_photo','cinematic_4k','drone_survey') NOT NULL,
  `title` varchar(255) NOT NULL,
  `url` varchar(500) NOT NULL,
  `thumbnail_url` varchar(500) DEFAULT NULL,
  `duration` varchar(50) DEFAULT NULL,
  `tag` varchar(100) DEFAULT 'Ultra HD',
  `sort_order` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_media_prop_type` (`property_id`,`media_type`),
  CONSTRAINT `property_media_ibfk_1` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `property_media`
--

LOCK TABLES `property_media` WRITE;
/*!40000 ALTER TABLE `property_media` DISABLE KEYS */;
INSERT INTO `property_media` VALUES (1,'p-1','free_photo','Master Villa Elevation & Pool','https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80','https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=300&q=80',NULL,'Free Gallery',1),(2,'p-1','free_photo','Double Height Living Pavilion','https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80','https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=300&q=80',NULL,'Free Gallery',2),(3,'p-1','free_photo','Chef Kitchen & Dining Area','https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80','https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=300&q=80',NULL,'Free Gallery',3),(4,'p-1','free_photo','Master Penthouse Suite','https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80','https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=300&q=80',NULL,'Free Gallery',4),(5,'p-1','cinematic_4k','4K Cinematic Architectural Walkthrough','https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4','https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80','03:42 mins','4K HDR Walkthrough',5),(6,'p-1','drone_survey','360° Cadastral Drone Boundary & Approach Road Survey','https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4','https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80','02:15 mins','360° Drone Survey',6);
/*!40000 ALTER TABLE `property_media` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `property_media_unlocks`
--

DROP TABLE IF EXISTS `property_media_unlocks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `property_media_unlocks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `property_id` varchar(50) NOT NULL,
  `points_spent` int(11) NOT NULL,
  `unlocked_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_property_unlock` (`user_id`,`property_id`),
  KEY `property_id` (`property_id`),
  CONSTRAINT `property_media_unlocks_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `property_media_unlocks_ibfk_2` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `property_media_unlocks`
--

LOCK TABLES `property_media_unlocks` WRITE;
/*!40000 ALTER TABLE `property_media_unlocks` DISABLE KEYS */;
INSERT INTO `property_media_unlocks` VALUES (1,1,'prop-159d3e28fe4c',4,'2026-10-16 11:30:18');
/*!40000 ALTER TABLE `property_media_unlocks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `property_neighborhood_scores`
--

DROP TABLE IF EXISTS `property_neighborhood_scores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `property_neighborhood_scores` (
  `property_id` varchar(50) NOT NULL,
  `overall` decimal(3,1) NOT NULL DEFAULT 9.0,
  `connectivity` decimal(3,1) NOT NULL DEFAULT 9.0,
  `lifestyle` decimal(3,1) NOT NULL DEFAULT 9.0,
  `schools_health` decimal(3,1) NOT NULL DEFAULT 9.0,
  `green_cover` decimal(3,1) NOT NULL DEFAULT 9.0,
  PRIMARY KEY (`property_id`),
  CONSTRAINT `property_neighborhood_scores_ibfk_1` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `property_neighborhood_scores`
--

LOCK TABLES `property_neighborhood_scores` WRITE;
/*!40000 ALTER TABLE `property_neighborhood_scores` DISABLE KEYS */;
INSERT INTO `property_neighborhood_scores` VALUES ('p-1',9.5,9.8,9.6,9.4,9.2);
/*!40000 ALTER TABLE `property_neighborhood_scores` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `property_plot_details`
--

DROP TABLE IF EXISTS `property_plot_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `property_plot_details` (
  `property_id` varchar(50) NOT NULL,
  `layout_sanction_no` varchar(150) DEFAULT NULL,
  `rera_layout_no` varchar(150) DEFAULT NULL,
  `frontage_road_width` varchar(100) DEFAULT NULL,
  `water_table_depth` varchar(100) DEFAULT NULL,
  `soil_bearing_capacity` varchar(100) DEFAULT NULL,
  `fsi_permissible` varchar(100) DEFAULT NULL,
  `eb_substation` varchar(150) DEFAULT NULL,
  `boundary_wall` varchar(100) DEFAULT NULL,
  `drainage_system` varchar(150) DEFAULT NULL,
  `patta_status` varchar(150) DEFAULT NULL,
  `dimension_ranges` varchar(150) DEFAULT NULL,
  PRIMARY KEY (`property_id`),
  CONSTRAINT `property_plot_details_ibfk_1` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `property_plot_details`
--

LOCK TABLES `property_plot_details` WRITE;
/*!40000 ALTER TABLE `property_plot_details` DISABLE KEYS */;
INSERT INTO `property_plot_details` VALUES ('p-4','CMDA Sanctioned Layout PPD/LO No. 48/2023','TN/01/Layout/0291/2024','40 Feet Wide Bitumen Road','Sweet Potable Water at 18–24 Feet','Certified 220 kN/sq.m (Tested by IIT Madras)','2.0 FSI (G+3 Floors Permissible)','Dedicated 11kV Substation Commissioned','6-Foot Reinforced Perimeter Wall with Gated Security','Underground Stormwater & Sewerage Grid Ready','Individual Computerized Patta Issued','40 ft x 60 ft (2,400 sq.ft standard corner)');
/*!40000 ALTER TABLE `property_plot_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `property_villa_details`
--

DROP TABLE IF EXISTS `property_villa_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `property_villa_details` (
  `property_id` varchar(50) NOT NULL,
  `land_extent` varchar(100) DEFAULT NULL,
  `built_up_area` varchar(100) DEFAULT NULL,
  `carpet_area` varchar(100) DEFAULT NULL,
  `private_pool` varchar(150) DEFAULT NULL,
  `courtyard_garden` varchar(150) DEFAULT NULL,
  `solar_microgrid` varchar(150) DEFAULT NULL,
  `water_autonomy` varchar(150) DEFAULT NULL,
  `vastu_orientation` varchar(100) DEFAULT NULL,
  `private_elevator` varchar(100) DEFAULT NULL,
  `car_portico` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`property_id`),
  CONSTRAINT `property_villa_details_ibfk_1` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `property_villa_details`
--

LOCK TABLES `property_villa_details` WRITE;
/*!40000 ALTER TABLE `property_villa_details` DISABLE KEYS */;
INSERT INTO `property_villa_details` VALUES ('p-1','600 Sq. Yards (5,400 sq.ft plot)','4,800 sq.ft','4,150 sq.ft RERA Carpet','Heated 36ft Private Infinity Edge Pool','3,200 sq.ft Landscaped Zen Courtyard','12 kW Rooftop Solar Hybrid Array','Dual 25,000L Rainwater Harvest Sumps','100% Vastu Compliant (Ishan Corner Waterbody)','Schindler 3-Stop Hydraulic Glass Elevator','3 Covered SUV Bays + EV Fast Charger');
/*!40000 ALTER TABLE `property_villa_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `recharge_packages`
--

DROP TABLE IF EXISTS `recharge_packages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `recharge_packages` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `category` varchar(100) NOT NULL,
  `points` int(11) NOT NULL,
  `bonus_points` int(11) DEFAULT 0,
  `price_in_rupees` int(11) NOT NULL,
  `subtitle` varchar(255) DEFAULT NULL,
  `unlock_estimate` varchar(100) DEFAULT NULL,
  `is_popular` tinyint(1) DEFAULT 0,
  `is_recommended` tinyint(1) DEFAULT 0,
  `features_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`features_json`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `recharge_packages`
--

LOCK TABLES `recharge_packages` WRITE;
/*!40000 ALTER TABLE `recharge_packages` DISABLE KEYS */;
INSERT INTO `recharge_packages` VALUES ('pack-1000','Value Pack','Investor Value',20,2,1000,'Deep research tier for serious property investors examining luxury real estate.','Unlocks 10–12 Properties',0,0,'[\"22 Total Media Points (2 Bonus Points Free)\",\"Full Unrestricted Video & Drone Access\",\"Direct Owner Legal Deed Access\",\"Pre-Scheduled SRO Document Verification\"]','2026-10-16 11:15:45'),('pack-2000','Pro Pack','Most Popular',40,5,2000,'Comprehensive multi-property due diligence for active investors.','Unlocks 20–25 Properties',1,0,'[\"45 Total Media Points (5 Bonus Points Free)\",\"Full HD & 4K HDR Video Walkthroughs\",\"Cadastral Boundary Topo Scans\",\"Direct Owner WhatsApp Chat Access\",\"Priority Concierge Support\"]','2026-10-16 11:15:45'),('pack-5000','Institutional Vault','Best Value',100,15,5000,'For developers, NRI wealth advisors, and portfolio syndicates.','Unlocks 50+ Properties',0,1,'[\"115 Total Media Points (15 Bonus Points Free)\",\"Full Pan-India Commercial & SCO 4K Tours\",\"High-Resolution Drone Boundary Geo-mapping\",\"Points Never Expire \\u2022 Lifetime Access\",\"Executive Concierge & Legal SRO Assistance\"]','2026-10-16 11:15:45');
/*!40000 ALTER TABLE `recharge_packages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_shortlists`
--

DROP TABLE IF EXISTS `user_shortlists`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_shortlists` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `property_id` varchar(50) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_property_shortlist` (`user_id`,`property_id`),
  KEY `property_id` (`property_id`),
  CONSTRAINT `user_shortlists_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_shortlists_ibfk_2` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_shortlists`
--

LOCK TABLES `user_shortlists` WRITE;
/*!40000 ALTER TABLE `user_shortlists` DISABLE KEYS */;
INSERT INTO `user_shortlists` VALUES (1,1,'p-3','2026-10-15 12:45:28');
/*!40000 ALTER TABLE `user_shortlists` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_view_history`
--

DROP TABLE IF EXISTS `user_view_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_view_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `property_id` varchar(50) NOT NULL,
  `viewed_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_user_property_view` (`user_id`,`property_id`),
  KEY `property_id` (`property_id`),
  KEY `idx_view_user` (`user_id`,`viewed_at`),
  CONSTRAINT `user_view_history_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_view_history_ibfk_2` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_view_history`
--

LOCK TABLES `user_view_history` WRITE;
/*!40000 ALTER TABLE `user_view_history` DISABLE KEYS */;
INSERT INTO `user_view_history` VALUES (4,1,'p-2','2026-10-15 12:56:31'),(5,1,'p-1','2026-10-15 12:56:31'),(6,3,'prop-159d3e28fe4c','2026-10-16 12:05:40');
/*!40000 ALTER TABLE `user_view_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `email` varchar(150) NOT NULL,
  `phone` varchar(25) DEFAULT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `role` enum('buyer','seller','developer','admin') DEFAULT 'buyer',
  `points_balance` int(11) DEFAULT 40,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=104 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Demo Real Estate Investor','investor@mannidam.com','+91 94441 00000',NULL,'buyer',88,'2026-10-15 11:31:48'),(2,'Verified Property Seller','seller@mannidam.com','+91 98400 11111',NULL,'seller',10,'2026-10-15 11:31:48'),(3,'Benny','bennygeo@gmail.com','9444100000',NULL,'buyer',128,'2026-10-15 12:27:01'),(101,'Ezhil','ezhil@mannidam.com','+91 94440 10001','$2y$10$s8batNschbmVOPeuKPmAQO2fe3UfDbJ8qm.VvHaI74k.K7zuVAu8y','admin',1000,'2026-10-15 13:48:44'),(102,'Ram','ram@mannidam.com','+91 94440 10002','$2y$10$tN1.taAgnIhI/0Z94zyp6Ojb2h1sKAFx9IuXLeZi5swSWTwBLkZ1G','admin',1000,'2026-10-15 13:48:44'),(103,'Benny','benny@mannidam.com','+91 94440 00003','$2y$10$FiDMFPcOMyjptraT5aqkYe.pvJaXj0mwqId8Jd2M8PnZq5HsWKwM6','admin',5000,'2026-10-15 14:09:45');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wallet_transactions`
--

DROP TABLE IF EXISTS `wallet_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `wallet_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `transaction_type` enum('credit_purchase','debit_unlock','bonus_credit') NOT NULL,
  `points` int(11) NOT NULL,
  `amount_rupees` decimal(10,2) DEFAULT 0.00,
  `payment_method` varchar(100) DEFAULT 'Razorpay Gateway',
  `razorpay_order_id` varchar(100) DEFAULT NULL,
  `razorpay_payment_id` varchar(100) DEFAULT NULL,
  `description` varchar(255) NOT NULL,
  `status` enum('pending','success','failed') DEFAULT 'success',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_wallet_user` (`user_id`),
  KEY `idx_wallet_payment_method` (`payment_method`),
  CONSTRAINT `wallet_transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wallet_transactions`
--

LOCK TABLES `wallet_transactions` WRITE;
/*!40000 ALTER TABLE `wallet_transactions` DISABLE KEYS */;
INSERT INTO `wallet_transactions` VALUES (1,3,'bonus_credit',40,0.00,'Promotional Credit',NULL,NULL,'Welcome Bonus: 40 Complimentary Media Points','success','2026-10-15 12:27:01'),(2,1,'credit_purchase',10,500.00,'Instant UPI',NULL,'pay_77f243c59bf9','Wallet Recharge: 10 Pts via UPI','success','2026-10-15 13:03:23'),(3,1,'credit_purchase',22,1000.00,'Net Banking (HDFC/SBI)',NULL,'pay_17d8fcdbbadf','Wallet Recharge: 20 Pts + 2 Bonus Pts via Net Banking (HDFC)','success','2026-10-15 13:10:24'),(4,1,'credit_purchase',10,500.00,'Razorpay Sandbox Direct',NULL,'pay_862725d4dbf4','Wallet Recharge: 10 Pts via Razorpay Sandbox Direct','success','2026-10-15 13:11:29'),(5,3,'credit_purchase',10,500.00,'Credit / Debit Card',NULL,'pay_38e393156b14','Wallet Recharge: 10 Pts via Credit / Debit Card (Visa/Mastercard)','success','2026-10-15 13:19:52'),(6,3,'credit_purchase',22,1000.00,'Razorpay Gateway',NULL,'pay_rzp_test_251479BB1UEM00','Wallet Recharge: 20 Pts + 2 Bonus Pts via Razorpay Gateway (Demo Account)','success','2026-10-15 13:34:12'),(7,3,'credit_purchase',22,1000.00,'Razorpay Gateway',NULL,'pay_rzp_test_2626719FQV2YMY','Wallet Recharge: 20 Pts + 2 Bonus Pts via Razorpay Gateway (Demo Account)','success','2026-10-15 13:34:23'),(8,3,'credit_purchase',2,100.00,'Razorpay Gateway',NULL,'pay_rzp_test_837086A48C0KQJ','Wallet Recharge: 2 Pts via Razorpay Gateway (Demo Account)','success','2026-10-15 13:43:57'),(9,1,'credit_purchase',10,500.00,'Instant UPI',NULL,'pay_ce0e5ff72f71','Wallet Recharge: 10 Pts via UPI','success','2026-10-16 11:07:53'),(10,3,'credit_purchase',22,1000.00,'Razorpay Gateway',NULL,'pay_rzp_test_9813714PBCNPO1','Wallet Recharge: 20 Pts + 2 Bonus Pts via Razorpay Gateway (Demo Account)','success','2026-10-16 11:09:42'),(11,3,'credit_purchase',10,500.00,'Razorpay Gateway',NULL,'pay_rzp_test_756650ZQPOFKZ8','Wallet Recharge: 10 Pts via Razorpay Gateway (Demo Account)','success','2026-10-16 11:22:37'),(12,1,'debit_unlock',-4,0.00,'Direct Credit',NULL,NULL,'Unlocked 4K Tour & Drone Survey for: Benny test','success','2026-10-16 11:30:18');
/*!40000 ALTER TABLE `wallet_transactions` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-16 18:58:51
