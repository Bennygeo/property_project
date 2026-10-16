-- =====================================================================
-- MANNIDAM PROPERTY REGISTRY & MARKETPLACE SEED DATA
-- Pre-populates Cities, Developers, Properties, Floor Plans,
-- Factsheets, Media, and Media Economy Packages
-- =====================================================================

USE `mannidam_property_db`;

-- 1. CITIES
INSERT INTO `cities` (`id`, `city_key`, `name`, `state`, `avg_rate_sqft`, `yoy_growth`, `deed_count`) VALUES
(1, 'chennai', 'Chennai', 'Tamil Nadu', 'Avg ₹8,250/sq.ft', '+11.2% YoY', '4,820 Deeds'),
(2, 'bengaluru', 'Bengaluru', 'Karnataka', 'Avg ₹9,450/sq.ft', '+13.8% YoY', '6,140 Deeds'),
(3, 'hyderabad', 'Hyderabad', 'Telangana', 'Avg ₹7,100/sq.ft', '+16.5% YoY', '3,980 Deeds'),
(4, 'mumbai', 'Mumbai', 'Maharashtra', 'Avg ₹19,200/sq.ft', '+7.4% YoY', '5,410 Deeds'),
(5, 'ncr', 'Delhi NCR', 'Delhi / Haryana', 'Avg ₹7,800/sq.ft', '+12.4% YoY', '8,060 Deeds');

-- 2. LOCALITIES
INSERT INTO `localities` (`id`, `city_id`, `name`, `pin_code`, `avg_sqft_rate`, `growth_yoy`, `deed_count`) VALUES
(1, 3, 'Jubilee Hills Road No. 45', '500033', '₹11,250/sq.ft', '+18.4% YoY', '420 Deeds'),
(2, 1, 'Boat Club Road, RA Puram', '600028', '₹18,400/sq.ft', '+14.1% YoY', '180 Deeds'),
(3, 2, 'Lavelle Road / UB City', '560001', '₹15,600/sq.ft', '+12.9% YoY', '240 Deeds'),
(4, 1, 'East Coast Road (ECR Corridor)', '600115', '₹8,900/sq.ft', '+15.2% YoY', '610 Deeds'),
(5, 5, 'Golf Course Road, Sector 42', '122002', '₹22,500/sq.ft', '+19.6% YoY', '890 Deeds');

-- 3. DEVELOPERS
INSERT INTO `developers` (`id`, `name`, `slug`, `established_year`, `projects_completed`, `delivered_sqft`, `on_time_track`, `corporate_office`, `about_text`, `logo_url`) VALUES
(1, 'Experion Developers & Infrastructure', 'experion-developers', '2006', '38+ Landmarks', '18.4M+ sq.ft', '99.2% Delivery Precision', 'Golf Course Ext. Road, Gurugram', 'Experion is a 100% FDI funded real estate developer backed by Experion Holdings Pte. Ltd, Singapore. Renowned for architectural precision, ecological luxury, and legally transparent clear-title deliveries.', '/logo.svg'),
(2, 'Prestige Estates Projects Ltd', 'prestige-group', '1986', '280+ Landmarks', '150M+ sq.ft', '98.5% Delivery Record', 'The Falcon House, Bangalore', 'Over three decades of architectural excellence, shaping the skylines of Bengaluru, Chennai, Hyderabad, and Mumbai with zero litigation and strict RERA compliance.', '/logo.svg'),
(3, 'Godrej Properties Ltd', 'godrej-properties', '1990', '140+ Landmarks', '85M+ sq.ft', '99.0% Delivery Record', 'Godrej One, Vikhroli East, Mumbai', 'Each Godrej development combines a 125-year legacy of excellence and trust with commitment to cutting-edge design and sustainability.', '/logo.svg');

-- 4. MASTER PROPERTIES
INSERT INTO `properties` (
  `id`, `developer_id`, `city_id`, `locality_id`, `title`, `property_type`, `listing_mode`,
  `locality_name`, `city_name`, `price`, `price_per_sqft`, `sqft`, `bhk_badge`, `facing_or_view`,
  `main_image_url`, `rera_number`, `brokerage_badge`, `special_tag`, `points_badge`,
  `possession_date`, `project_status`, `total_land_parcel`, `total_units`, `media_points`, `whatsapp_url`, `is_featured`
) VALUES
(
  'p-1', 1, 3, 1,
  'Contemporary Minimalist Villa with Infinity Pool',
  'Independent Villas', 'buy',
  'Jubilee Hills Road No. 45', 'Hyderabad',
  '₹5.40 Cr', '₹11,250 /sq.ft', '4,800 sq.ft',
  '5 Bed, 6 Bath', 'West Facing • Hill Crest',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
  'RERA-TS-2024-HYD-0419', '0% Direct Owner SRO Deed', 'Private Hilltop Pool', 4,
  'Ready to Move (Immediate)', 'Ready to Occupy', '9.6 Acres Gated Enclave', '32 Exclusive Residences', 4,
  'https://wa.me/919444100000', 1
),
(
  'p-2', 2, 1, 2,
  'Sea-Facing Sky Penthouse with Private Plunge Pool',
  'Luxury Penthouses', 'buy',
  'Boat Club Road, RA Puram', 'Chennai',
  '₹8.20 Cr', '₹14,900 /sq.ft', '5,500 sq.ft',
  '4 BHK Penthouse', 'East Facing • Bay Panoramic',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
  'TN/29/Building/0488/2023', '0% Direct Builder SRO Deed', 'Bespoke Italian Marble', 6,
  'Q4 2026', 'Under Construction', '4.2 Acres Reserve', '48 Signature Residences', 6,
  'https://wa.me/919444100000', 1
),
(
  'p-3', 2, 2, 3,
  'Brutalist Glass & Cantilever Architectural Mansion',
  'Apartments & Flats', 'buy',
  'Lavelle Road / UB City', 'Bengaluru',
  '₹12.50 Cr', '₹19,230 /sq.ft', '6,500 sq.ft',
  '5 Bed, 7 Bath', 'North-East • Cubbon Park Canopy',
  'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80',
  'PRM/KA/RERA/1251/310/PR/210423/004122', '0% Direct Owner SRO Deed', 'Private Penthouse Elevator', 6,
  'Ready to Move', 'Ready to Occupy', '2.8 Acres High-Street Enclave', '18 Bespoke Mansions', 6,
  'https://wa.me/919444100000', 1
),
(
  'p-4', 3, 1, 4,
  'Gated Beachside Residential Villa Plot Enclave',
  'Gated CMDA Plots', 'plots',
  'East Coast Road (ECR Corridor)', 'Chennai',
  '₹1.85 Cr', '₹7,700 /sq.ft', '2,400 sq.ft',
  'Corner Plot (40x60)', 'North Facing • 40ft CMDA Blacktop',
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
  'TN/01/Layout/0291/2024', 'CMDA & RERA Approved Plot', 'Clear Title 30-Yr Nil EC', 2,
  'Immediate Registration', 'Ready for Construction', '18.5 Acres Master Layout', '124 Sanctioned Plots', 2,
  'https://wa.me/919444100000', 1
);

-- 5. PROPERTY HIGHLIGHTS
INSERT INTO `property_highlights` (`property_id`, `highlight_text`, `sort_order`) VALUES
('p-1', 'Heated private infinity edge swimming pool overlooking Jubilee Hills ridge', 1),
('p-1', 'Triple-height central living pavilion with Belgian floor-to-ceiling double-glazed sliding glass', 2),
('p-1', 'Imported Italian Statuario marble slabs across formal foyers & master suites', 3),
('p-1', 'Sub-Zero & Wolf integrated designer show kitchen + secondary spice prep utility', 4),
('p-1', 'Schneider KNX smart home automation with biometric keyless entry', 5),
('p-1', 'Dedicated staff quarters with separate service elevator & independent entry', 6),

('p-2', 'Private cantilevered sea-view plunge pool on the 28th floor sky terrace', 1),
('p-2', 'Direct private biometric high-speed elevator opening into personal foyer', 2),
('p-2', 'Bespoke Poggenpohl kitchen with Miele smart built-in appliances', 3),

('p-4', 'CMDA Sanctioned Layout with individual unencumbered Revenue Patta', 1),
('p-4', '40-feet wide bitumen approach roads with underground storm water drains', 2),
('p-4', 'Dedicated 11kV independent electrical substation & street LED grid', 3);

-- 6. CADASTRAL AUDIT & TITLE RECORDS
INSERT INTO `property_cadastral_audits` (`property_id`, `survey_number`, `sro_jurisdiction`, `ec_status`, `patta_verification`, `rera_reg_no`, `circle_rate`) VALUES
('p-1', 'Cadastral Survey No. 412/2A, Jubilee Hills Village', 'SRO Banjara Hills, Hyderabad Jurisdiction', '30-Year Nil Encumbrance Certificate Verified (Form 15/16)', 'Direct Individual T-S Patta Deed (Verified by Bar Council Advocate)', 'RERA-TS-2024-HYD-0419', '₹8,500/sq.ft Guideline Value'),
('p-2', 'T.S. No. 48/1, Block No. 12, RA Puram', 'SRO Mylapore, Chennai South', 'Nil Encumbrance Certificate Verified for 32 Years', 'CMDA Planning Permit No. B/NHRB/142/2023', 'TN/29/Building/0488/2023', '₹13,500/sq.ft Guideline Value'),
('p-3', 'Sy. No. 94/1B, Sampangi Rama Nagar', 'SRO Shivajinagar, Bengaluru Urban', '30-Year Clear Title with Title Guarantee Indemnity', 'BBMP A-Khata Certificate & Occupancy Certificate Sanctioned', 'PRM/KA/RERA/1251/310/PR/210423/004122', '₹14,200/sq.ft Guideline Value'),
('p-4', 'Cadastral Survey No. 89/1, 89/2, Uthandi Village', 'SRO Neelankarai, Chennai Jurisdiction', 'Nil Encumbrance Certificate Verified for 35 Years', 'CMDA Layout Sanction No. 48/2023 & Individual Computerized Patta', 'TN/01/Layout/0291/2024', '₹5,800/sq.ft Guideline Value');

-- 7. VILLA DETAILS (for p-1)
INSERT INTO `property_villa_details` (`property_id`, `land_extent`, `built_up_area`, `carpet_area`, `private_pool`, `courtyard_garden`, `solar_microgrid`, `water_autonomy`, `vastu_orientation`, `private_elevator`, `car_portico`) VALUES
('p-1', '600 Sq. Yards (5,400 sq.ft plot)', '4,800 sq.ft', '4,150 sq.ft RERA Carpet', 'Heated 36ft Private Infinity Edge Pool', '3,200 sq.ft Landscaped Zen Courtyard', '12 kW Rooftop Solar Hybrid Array', 'Dual 25,000L Rainwater Harvest Sumps', '100% Vastu Compliant (Ishan Corner Waterbody)', 'Schindler 3-Stop Hydraulic Glass Elevator', '3 Covered SUV Bays + EV Fast Charger');

-- 8. APARTMENT DETAILS (for p-3)
INSERT INTO `property_apartment_details` (`property_id`, `tower_count`, `total_floors`, `units_per_core`, `ceiling_height`, `balcony_deck`, `hvac_system`, `flooring_specs`, `kitchen_fittings`, `parking_bays`, `clubhouse_size`, `maintenance_fee`) VALUES
('p-3', '2 Iconic Glass Monolith Towers', 'G + 28 Floors', 'Exclusive 1 Unit per Core (Direct Elevator Access)', '11.5 Feet Clear Slab-to-Slab Height', '10-Foot Deep Cantilevered Sunset Deck', 'Daikin VRV Central Chilled-Water AC', 'Imported Greek Thassos White Marble', 'Poggenpohl Kitchens with Miele Appliances', '4 Dedicated Covered Basement Bays with 22kW EV Chargers', '45,000 sq.ft Private Clubhouse', '₹6.50 /sq.ft /month');

-- 9. PLOT DETAILS (for p-4)
INSERT INTO `property_plot_details` (`property_id`, `layout_sanction_no`, `rera_layout_no`, `frontage_road_width`, `water_table_depth`, `soil_bearing_capacity`, `fsi_permissible`, `eb_substation`, `boundary_wall`, `drainage_system`, `patta_status`, `dimension_ranges`) VALUES
('p-4', 'CMDA Sanctioned Layout PPD/LO No. 48/2023', 'TN/01/Layout/0291/2024', '40 Feet Wide Bitumen Road', 'Sweet Potable Water at 18–24 Feet', 'Certified 220 kN/sq.m (Tested by IIT Madras)', '2.0 FSI (G+3 Floors Permissible)', 'Dedicated 11kV Substation Commissioned', '6-Foot Reinforced Perimeter Wall with Gated Security', 'Underground Stormwater & Sewerage Grid Ready', 'Individual Computerized Patta Issued', '40 ft x 60 ft (2,400 sq.ft standard corner)');

-- 10. PROPERTY MEDIA
INSERT INTO `property_media` (`property_id`, `media_type`, `title`, `url`, `thumbnail_url`, `duration`, `tag`, `sort_order`) VALUES
('p-1', 'free_photo', 'Master Villa Elevation & Pool', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=300&q=80', NULL, 'Free Gallery', 1),
('p-1', 'free_photo', 'Double Height Living Pavilion', 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=300&q=80', NULL, 'Free Gallery', 2),
('p-1', 'free_photo', 'Chef Kitchen & Dining Area', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=300&q=80', NULL, 'Free Gallery', 3),
('p-1', 'free_photo', 'Master Penthouse Suite', 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=300&q=80', NULL, 'Free Gallery', 4),
('p-1', 'cinematic_4k', '4K Cinematic Architectural Walkthrough', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80', '03:42 mins', '4K HDR Walkthrough', 5),
('p-1', 'drone_survey', '360° Cadastral Drone Boundary & Approach Road Survey', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80', '02:15 mins', '360° Drone Survey', 6);

-- 11. FLOOR PLANS
INSERT INTO `property_floor_plans` (`id`, `property_id`, `name`, `type`, `super_area`, `carpet_area`, `price_estimate`, `image_url`, `dimensions_json`) VALUES
('fp-1-a', 'p-1', 'Ground Level: Grand Living, Heated Pool & Chef Kitchen', 'Level 0 - Entertainment Suite', '2,400 sq.ft', '2,100 sq.ft', '₹2.70 Cr Base Component', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80', JSON_OBJECT('Grand Foyer', '18 ft x 14 ft', 'Formal Living', '28 ft x 20 ft', 'Show Kitchen', '16 ft x 14 ft', 'Pool Deck', '36 ft x 15 ft')),
('fp-1-b', 'p-1', 'First Level: Master Suite, Junior En-Suites & Sky Lounge', 'Level 1 - Private Family Quarters', '2,400 sq.ft', '2,050 sq.ft', '₹2.70 Cr Base Component', 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=800&q=80', JSON_OBJECT('Master Bedroom', '24 ft x 18 ft', 'Walk-in Wardrobe', '14 ft x 12 ft', 'Master Bath', '16 ft x 11 ft', 'Bedrooms 2 & 3', '18 ft x 15 ft each'));

-- 12. AMENITIES
INSERT INTO `property_amenities` (`property_id`, `name`, `icon`, `category`, `description`) VALUES
('p-1', 'Heated Private Infinity Pool', 'pool', 'leisure', '36ft infinity pool with automated ozone filtration'),
('p-1', 'Biometric & Smart KNX Automation', 'home_iot_device', 'security', 'Keyless entry and scene control on smartphones'),
('p-1', 'Private Hydraulic Glass Elevator', 'elevator', 'leisure', '3-stop Schindler elevator serving all levels'),
('p-1', 'Private Solar Microgrid Array', 'solar_power', 'eco', '12kW on-grid solar system reducing power bills by 85%'),
('p-1', 'EV High-Output Charging Bay', 'ev_station', 'eco', '22kW fast charger installed in covered portico'),
('p-1', '24x7 Armed Perimeter Security', 'shield_lock', 'security', 'CCTV coverage with motion sensors and response team');

-- 13. CONNECTIVITY
INSERT INTO `property_connectivity` (`property_id`, `title`, `distance`, `duration`, `category`, `icon`) VALUES
('p-1', 'Jubilee Hills Metro Station (Blue Line)', '1.4 km', '4 mins drive', 'transit', 'train'),
('p-1', 'Hitec City Mindspace Cyberabad Tech Corridor', '5.2 km', '12 mins drive', 'business', 'domain'),
('p-1', 'Apollo Hospitals International Health City', '2.1 km', '6 mins drive', 'healthcare', 'local_hospital'),
('p-1', 'Oakridge & Hyderabad Public School', '3.8 km', '9 mins drive', 'education', 'school'),
('p-1', 'Rajiv Gandhi International Airport (RGIA)', '31 km', '35 mins via PVNR Expressway', 'transit', 'flight');

-- 14. NEIGHBORHOOD SCORES
INSERT INTO `property_neighborhood_scores` (`property_id`, `overall`, `connectivity`, `lifestyle`, `schools_health`, `green_cover`) VALUES
('p-1', 9.5, 9.8, 9.6, 9.4, 9.2);

-- 15. FAQS
INSERT INTO `property_faqs` (`property_id`, `question`, `answer`, `sort_order`) VALUES
('p-1', 'Is there any brokerage or intermediary commission on this villa?', 'None whatsoever. Mannidam operates on a 100% direct owner/promoter model with verified Sub-Registrar Office deeds.', 1),
('p-1', 'Are the 4K video walkthrough and drone cadastral surveys authentic?', 'Yes. Every premium media file is recorded by certified drone pilots and architectural film teams with zero CGI enhancements.', 2),
('p-1', 'Has the title been verified with 30-year Encumbrance records?', 'Yes. An unbroken 30-year Nil Encumbrance Certificate (Form 15) and Sanctioned Mutation records are in file.', 3);

-- 16. USERS (Buyers, Sellers & Administrative Personnel)
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password_hash`, `role`, `points_balance`) VALUES
(1, 'Demo Real Estate Investor', 'investor@mannidam.com', '+91 94441 00000', NULL, 'buyer', 40),
(2, 'Verified Property Seller', 'seller@mannidam.com', '+91 98400 11111', NULL, 'seller', 10),
(101, 'Ezhil', 'ezhil@mannidam.com', '+91 94440 00001', '$2y$10$s8batNschbmVOPeuKPmAQO2fe3UfDbJ8qm.VvHaI74k.K7zuVAu8y', 'admin', 5000),
(102, 'Ram', 'ram@mannidam.com', '+91 94440 00002', '$2y$10$tN1.taAgnIhI/0Z94zyp6Ojb2h1sKAFx9IuXLeZi5swSWTwBLkZ1G', 'admin', 5000),
(103, 'Benny', 'benny@mannidam.com', '+91 94440 00003', '$2y$10$FiDMFPcOMyjptraT5aqkYe.pvJaXj0mwqId8Jd2M8PnZq5HsWKwM6', 'admin', 5000);

-- 17. RECHARGE PACKAGES
INSERT INTO `recharge_packages` (`id`, `name`, `category`, `points`, `bonus_points`, `price_in_rupees`, `subtitle`, `unlock_estimate`, `is_popular`, `is_recommended`, `features_json`) VALUES
('pack-1000', 'Value Pack', 'Investor Value', 20, 2, 1000, 'Deep research tier for serious property investors examining luxury real estate.', 'Unlocks 10–12 Properties', 0, 0, JSON_ARRAY('22 Total Media Points (2 Bonus Points Free)', 'Full Unrestricted Video & Drone Access', 'Direct Owner Legal Deed Access', 'Pre-Scheduled SRO Document Verification')),
('pack-2000', 'Pro Pack', 'Most Popular', 40, 5, 2000, 'Comprehensive multi-property due diligence for active investors.', 'Unlocks 20–25 Properties', 1, 0, JSON_ARRAY('45 Total Media Points (5 Bonus Points Free)', 'Full HD & 4K HDR Video Walkthroughs', 'Cadastral Boundary Topo Scans', 'Direct Owner WhatsApp Chat Access', 'Priority Concierge Support')),
('pack-5000', 'Institutional Vault', 'Best Value', 100, 15, 5000, 'For developers, NRI wealth advisors, and portfolio syndicates.', 'Unlocks 50+ Properties', 0, 1, JSON_ARRAY('115 Total Media Points (15 Bonus Points Free)', 'Full Pan-India Commercial & SCO 4K Tours', 'High-Resolution Drone Boundary Geo-mapping', 'Points Never Expire • Lifetime Access', 'Executive Concierge & Legal SRO Assistance'));


-- 18. ADMIN & PEER ACTIVITY AUDIT LOGS (Maker-Checker / Four-Eyes Ledger)
INSERT INTO `admin_activity_logs` 
  (`admin_id`, `admin_name`, `action_type`, `property_id`, `property_title`, `notes`, `target_user_id`, `target_user_name`, `created_at`) 
VALUES
(103, 'Benny', 'admin_login', NULL, NULL, 'Authenticated via Administrative Security Gateway (IP: 192.168.1.10)', NULL, NULL, '2026-10-15 09:15:00'),
(103, 'Benny', 'post_property', 'p-1', 'Contemporary Minimalist Villa with Infinity Pool', 'Created new property listing. Flagged for Co-Admin peer approval.', NULL, NULL, '2026-10-15 09:30:00'),
(101, 'Ezhil', 'approve_peer_review', 'p-1', 'Contemporary Minimalist Villa with Infinity Pool', 'Co-Admin Peer Approved. 30-year SRO Form 15 Encumbrance & Patta certified.', 103, 'Benny', '2026-10-15 10:15:00'),
(102, 'Ram', 'post_property', 'p-2', 'Sea-Facing Sky Penthouse with Private Plunge Pool', 'Created new property listing. Flagged for Co-Admin peer approval.', NULL, NULL, '2026-10-15 11:00:00'),
(103, 'Benny', 'approve_peer_review', 'p-2', 'Sea-Facing Sky Penthouse with Private Plunge Pool', 'Co-Admin Peer Approved. CMDA architectural sanction and RERA filing verified.', 102, 'Ram', '2026-10-15 11:45:00'),
(102, 'Ram', 'approve_user_review', 'p-3', 'Greenfield Organic Farmland Plots', 'User Listing Verified. Cadastral survey map and soil report verified.', 2, 'Verified Property Seller', '2026-10-15 13:20:00'),
(103, 'Benny', 'request_revision', 'p-4', 'Lakeview Twin Luxury Villas', 'Changes Requested: Please attach updated 4K drone video and mutation deed certificate.', 2, 'Verified Property Seller', '2026-10-15 14:10:00'),
(101, 'Ezhil', 'approve_peer_review', 'p-5', 'Horizon Commercial Tech Plaza', 'Co-Admin Peer Approved. Fire NOC, Lift compliance, and DTCP sanction approved.', 103, 'Benny', '2026-10-15 15:45:00');
