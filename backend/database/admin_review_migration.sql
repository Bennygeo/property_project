USE mannidam_property_db;

-- 1. Add review workflow columns to properties table if they do not exist
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS status ENUM('published', 'pending_review', 'pending_peer_review', 'rejected', 'revision_requested', 'draft') NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS submitted_by_user_id INT(11) NULL,
  ADD COLUMN IF NOT EXISTS submitted_by_name VARCHAR(150) NULL,
  ADD COLUMN IF NOT EXISTS submitted_by_role VARCHAR(50) DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS reviewed_by_user_id INT(11) NULL,
  ADD COLUMN IF NOT EXISTS reviewed_by_name VARCHAR(150) NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS review_notes TEXT NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT NULL;

-- 2. Insert or update Admin 1 (Lead Admin) and Admin 2 (Co-Admin)
INSERT INTO users (id, name, email, phone, role, points_balance)
VALUES 
  (101, 'Kavitha Rajan', 'lead.admin@mannidam.com', '+91 94440 10001', 'admin', 1000),
  (102, 'Arunachalam S.', 'co.admin@mannidam.com', '+91 94440 10002', 'admin', 1000)
ON DUPLICATE KEY UPDATE 
  name = VALUES(name),
  role = 'admin';

-- 3. Set existing properties as published with lead admin attribution
UPDATE properties 
SET status = 'published', 
    submitted_by_user_id = 101, 
    submitted_by_name = 'Kavitha Rajan', 
    submitted_by_role = 'admin' 
WHERE status IS NULL OR status = 'published';

-- 4. Insert 2 sample pending properties to immediately demonstrate both review workflows:
-- (A) One submitted by a regular user (pending_review -> can be approved by ANY admin)
-- (B) One submitted by Admin 1 (pending_peer_review -> can ONLY be approved by Admin 2!)
INSERT INTO properties (
  id, city_id, locality_id, title, property_type, listing_mode, locality_name, city_name,
  price, price_per_sqft, sqft, bhk_badge, facing_or_view, main_image_url, rera_number,
  status, submitted_by_user_id, submitted_by_name, submitted_by_role
) VALUES (
  'prop-user-rev-01', 1, 1,
  'Emerald Green 3BHK Penthouse',
  'Luxury Penthouses', 'buy', 'Anna Nagar', 'Chennai',
  '₹ 2.45 Cr', '₹ 11,200/sq.ft', '2,188 sq.ft', '3 BHK', 'East Facing',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9',
  'TN/29/Building/0122/2026',
  'pending_review', 1, 'Demo Real Estate Investor', 'user'
), (
  'prop-admin-peer-01', 1, 2,
  'Veda Serenity Coastal Villa 4BHK',
  'Independent Villas', 'buy', 'ECR (East Coast Road)', 'Chennai',
  '₹ 4.80 Cr', '₹ 14,500/sq.ft', '3,310 sq.ft', '4 BHK', 'Sea Facing',
  'https://images.unsplash.com/photo-1613977257363-707ba9348227',
  'TN/29/Building/0944/2026',
  'pending_peer_review', 101, 'Kavitha Rajan', 'admin'
) ON DUPLICATE KEY UPDATE 
  title = VALUES(title),
  status = VALUES(status),
  submitted_by_user_id = VALUES(submitted_by_user_id),
  submitted_by_name = VALUES(submitted_by_name),
  submitted_by_role = VALUES(submitted_by_role);
