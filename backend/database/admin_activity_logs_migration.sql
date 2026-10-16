USE mannidam_property_db;

-- 1. Create admin_activity_logs table
CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  admin_id INT(11) NOT NULL,
  admin_name VARCHAR(120) NOT NULL,
  action_type ENUM('post_property', 'approve_peer_review', 'approve_user_review', 'reject_property', 'request_revision', 'admin_login') NOT NULL,
  property_id VARCHAR(50) NULL,
  property_title VARCHAR(255) NULL,
  notes TEXT NULL,
  target_user_id INT(11) NULL,
  target_user_name VARCHAR(120) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_admin_id (admin_id),
  INDEX idx_action_type (action_type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Populate historical logs for Ezhil, Ram, and Benny
INSERT INTO admin_activity_logs 
  (admin_id, admin_name, action_type, property_id, property_title, notes, target_user_id, target_user_name, created_at)
VALUES
  -- Ezhil's historical activities
  (101, 'Ezhil', 'approve_user_review', 'prop-user-rev-01', 'Emerald Green 3BHK Penthouse', 'Verified Encumbrance Certificate (30-year Nil EC) and building plan sanction.', 1, 'Demo Real Estate Investor', '2026-10-15 15:45:10'),
  (101, 'Ezhil', 'post_property', 'prop-admin-peer-01', 'Veda Serenity Coastal Villa 4BHK', 'Created high-value luxury coastal villa listing. Submitted for Co-Admin peer verification.', NULL, NULL, '2026-10-15 14:15:22'),
  (101, 'Ezhil', 'admin_login', NULL, NULL, 'Administrative login authenticated via IP: 127.0.0.1 (Chennai Central)', NULL, NULL, '2026-10-15 13:00:00'),

  -- Ram's historical activities
  (102, 'Ram', 'approve_peer_review', 'prop-eae62ab2c982', 'Coromandel Horizon Villa', 'Independent Maker-Checker Peer Review: Verified coastal CRZ clearance and SRO Patta deed.', 103, 'Benny', '2026-10-15 16:14:27'),
  (102, 'Ram', 'request_revision', 'p-4', 'Gated Beachside Residential Villa Plot Enclave', 'Requested updated CMDA DTCP layout sketch with street lighting grid specifications.', 1, 'Demo Real Estate Investor', '2026-10-15 12:20:15'),
  (102, 'Ram', 'admin_login', NULL, NULL, 'Administrative login authenticated via IP: 127.0.0.1 (OMR Office)', NULL, NULL, '2026-10-15 11:30:00'),

  -- Benny's historical activities
  (103, 'Benny', 'post_property', 'prop-eae62ab2c982', 'Coromandel Horizon Villa', 'Initiated new luxury coastal property submission for architectural review.', NULL, NULL, '2026-10-15 16:10:43'),
  (103, 'Benny', 'approve_peer_review', 'prop-admin-peer-01', 'Veda Serenity Coastal Villa 4BHK', 'Four-Eyes Audit: Verified Ezhil''s cadastral plot boundary survey and RERA TN/29 deed.', 101, 'Ezhil', '2026-10-15 15:55:00'),
  (103, 'Benny', 'admin_login', NULL, NULL, 'Administrative login authenticated via IP: 127.0.0.1 (Director Console)', NULL, NULL, '2026-10-15 10:00:00');
