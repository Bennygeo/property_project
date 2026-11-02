-- =====================================================================
-- ADMIN PEER REVIEW COLUMNS MIGRATION
-- Safe / Idempotent: Operates on active database
-- =====================================================================

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
