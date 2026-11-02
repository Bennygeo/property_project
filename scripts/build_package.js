const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== Step 1: Preparing Directory Structure ===');
const packageDir = path.resolve('final_package');
if (fs.existsSync(packageDir)) {
  fs.rmSync(packageDir, { recursive: true, force: true });
}
fs.mkdirSync(packageDir, { recursive: true });

const publicHtmlDir = path.join(packageDir, 'public_html');
const dbDir = path.join(packageDir, 'database');
fs.mkdirSync(publicHtmlDir, { recursive: true });
fs.mkdirSync(dbDir, { recursive: true });

// Helper to copy directory recursively
function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('=== Step 2: Copying Angular Frontend Build ===');
const distBrowserDir = path.resolve('dist/property-registry/browser');
if (fs.existsSync(distBrowserDir)) {
  copyDirRecursive(distBrowserDir, publicHtmlDir);
  console.log('Frontend files copied to public_html.');
} else {
  console.error('ERROR: dist/property-registry/browser does not exist! Please run npm run build first.');
  process.exit(1);
}

console.log('=== Step 3: Copying PHP Backend ===');
const backendSrc = path.resolve('backend');
const backendDest = path.join(publicHtmlDir, 'backend');
copyDirRecursive(backendSrc, backendDest);

// Ensure uploads directories exist inside backend
const uploadsDirs = [
  path.join(backendDest, 'uploads'),
  path.join(backendDest, 'uploads', 'properties'),
  path.join(backendDest, 'uploads', 'tts')
];
for (const u of uploadsDirs) {
  if (!fs.existsSync(u)) {
    fs.mkdirSync(u, { recursive: true });
  }
}
console.log('Backend files and upload directories prepared.');

console.log('=== Step 4: Consolidating Database Schemas ===');
// 1. Copy individual SQL files
fs.copyFileSync(path.resolve('backend/sql/full_live_dump.sql'), path.join(dbDir, '02_FULL_LIVE_DATA_DUMP.sql'));
fs.copyFileSync(path.resolve('backend/sql/recent_changes_live_migration.sql'), path.join(dbDir, '03_RECENT_CHANGES_MIGRATION.sql'));

// 2. Build 01_COMPLETE_DATABASE_SCHEMA.sql
const schemaContent = fs.readFileSync('backend/sql/schema.sql', 'utf8');
const adminUsersContent = fs.readFileSync('backend/database/admin_users_migration.sql', 'utf8');
const adminLogsContent = fs.readFileSync('backend/database/admin_activity_logs_migration.sql', 'utf8');

const masterTableSql = `
-- ---------------------------------------------------------
-- Table: property_master_details (DTCP / Infrastructure / Civic Specifications)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS property_master_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id VARCHAR(50) NOT NULL UNIQUE,
    project_name VARCHAR(255) DEFAULT '',
    developer VARCHAR(255) DEFAULT '',
    rera_number VARCHAR(150) DEFAULT '',
    dtcp_approved VARCHAR(10) DEFAULT 'Yes',
    dtcp_approval_no VARCHAR(150) DEFAULT '',
    patta_type VARCHAR(100) DEFAULT 'Individual Patta',
    clear_title_available VARCHAR(10) DEFAULT 'Yes',
    bank_loan_approved VARCHAR(10) DEFAULT 'Yes',
    area_location VARCHAR(150) DEFAULT '',
    village_locality VARCHAR(150) DEFAULT '',
    taluk VARCHAR(100) DEFAULT '',
    district VARCHAR(100) DEFAULT '',
    pincode VARCHAR(20) DEFAULT '',
    google_maps_link TEXT,
    plot_no VARCHAR(50) DEFAULT '',
    plot_size_sqft DECIMAL(12,2) DEFAULT 0,
    plot_size_cents DECIMAL(10,2) DEFAULT 0,
    dimension VARCHAR(100) DEFAULT '',
    facing VARCHAR(50) DEFAULT 'East',
    corner_plot VARCHAR(10) DEFAULT 'No',
    land_use VARCHAR(100) DEFAULT 'Residential',
    price_per_sqft DECIMAL(12,2) DEFAULT 0,
    total_price DECIMAL(15,2) DEFAULT 0,
    availability VARCHAR(50) DEFAULT 'Available',
    petrol_bunk_distance DECIMAL(6,2) DEFAULT NULL,
    schools_nearby VARCHAR(255) DEFAULT '',
    colleges_nearby VARCHAR(255) DEFAULT '',
    hospital_nearby VARCHAR(255) DEFAULT '',
    corridor VARCHAR(100) DEFAULT 'IT Corridor',
    bus_stop_distance DECIMAL(6,2) DEFAULT NULL,
    railway_station_nearby VARCHAR(255) DEFAULT '',
    highway_name VARCHAR(150) DEFAULT '',
    highway_distance DECIMAL(6,2) DEFAULT NULL,
    airport_distance DECIMAL(6,2) DEFAULT NULL,
    suited_for VARCHAR(100) DEFAULT 'Both',
    possession_timeline VARCHAR(100) DEFAULT 'Immediate',
    electricity VARCHAR(50) DEFAULT 'Available',
    water_connection VARCHAR(50) DEFAULT 'Available',
    drainage_facility VARCHAR(100) DEFAULT 'Underground',
    road_width_ft INT DEFAULT 30,
    road_type VARCHAR(100) DEFAULT 'Tar Road',
    street_lights VARCHAR(10) DEFAULT 'Yes',
    compound_wall_gated VARCHAR(10) DEFAULT 'Yes',
    park VARCHAR(10) DEFAULT 'Yes',
    other_amenities TEXT,
    developer_maintenance_years INT DEFAULT 2,
    flood_zone VARCHAR(50) DEFAULT 'No',
    waterlogging_history VARCHAR(10) DEFAULT 'No',
    contact_person_phone VARCHAR(150) DEFAULT '',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (property_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const completeConsolidatedSql = `-- =====================================================================
-- FIND A PLOT / MANNIDAM PROPERTY PLATFORM - COMPLETE PRODUCTION DATABASE
-- Consolidated Schema, Infrastructure Specifications, Admin Accounts & Seed Data
-- Character Set: utf8mb4 | Collation: utf8mb4_unicode_ci
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

${schemaContent}

${masterTableSql}

${adminUsersContent}

${adminLogsContent}

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;
`;

fs.writeFileSync(path.join(dbDir, '01_COMPLETE_DATABASE_SCHEMA.sql'), completeConsolidatedSql, 'utf8');
console.log('Database schemas consolidated in database/.');

console.log('=== Step 5: Generating Deployment Guide ===');
const deploymentGuide = `# Production Deployment & Server Configuration Guide

This archive contains the complete production-ready build for **Find a Plot / Mannidam Real Estate Marketplace**:
- **\`public_html/\`**: Complete web root containing the compiled Angular Single-Page Application (HTML/JS/CSS/Assets) and the PHP REST API (\`/backend/\`).
- **\`database/\`**: Complete MySQL database schemas, data dumps, and admin configurations.

---

## 1. Database Setup (phpMyAdmin or MySQL CLI)

1. Create a new MySQL database on your host (e.g., \`mannidam_property_db\` or \`onenesgw_property_project\`).
   - Character set: \`utf8mb4\`
   - Collation: \`utf8mb4_unicode_ci\`
2. Import the schema:
   - For a fresh installation with all 25+ tables, master specifications, admin accounts, and seed properties:
     **Import \`database/01_COMPLETE_DATABASE_SCHEMA.sql\`**
   - Alternatively, if you want the full live data dump with all sample properties:
     **Import \`database/02_FULL_LIVE_DATA_DUMP.sql\`**

---

## 2. Backend Configuration (\`public_html/backend/config/\`)

1. Open \`public_html/backend/config/database.php\` and update with your live database credentials:
   \`\`\`php
   $this->host     = $_ENV['DB_HOST'] ?? '127.0.0.1';
   $this->dbName   = $_ENV['DB_NAME'] ?? 'your_database_name';
   $this->username = $_ENV['DB_USER'] ?? 'your_database_user';
   $this->password = $_ENV['DB_PASS'] ?? 'your_database_password';
   \`\`\`
2. (Optional) In \`public_html/backend/config/elevenlabs.php\`, you can set your \`ELEVENLABS_API_KEY\` and \`ELEVENLABS_VOICE_ID\` for the Virtual AI Property Presenter.

---

## 3. Web Server Deployment (\`public_html/\`)

1. Upload all contents of \`public_html/\` directly into your web hosting root (e.g., \`/var/www/html/\`, \`public_html/\`, or your custom domain folder).
2. Ensure write permissions for file uploads:
   \`\`\`bash
   chmod -R 775 backend/uploads
   \`\`\`
3. Verify Apache \`mod_rewrite\` is enabled (already handled by the included \`.htaccess\` which routes Angular SPA client-side routes to \`index.html\` while allowing \`/backend/api/\` requests to execute directly).

---

## 4. Default Admin Credentials

Three administrative personas are pre-configured in the database:
- **Ezhil** (Lead Reviewer): \`ezhil@mannidam.com\` / \`ezhil@2026\`
- **Ram** (Peer Reviewer): \`ram@mannidam.com\` / \`ram@2026\`
- **Benny** (Director Console): \`benny@mannidam.com\` / \`benny@2026\`

Admin portal URL: \`/admin/login\`
`;

fs.writeFileSync(path.join(packageDir, 'DEPLOYMENT_GUIDE.md'), deploymentGuide, 'utf8');
console.log('DEPLOYMENT_GUIDE.md written.');

console.log('=== Step 6: Creating Final Production ZIP Archive ===');
const zipOutput = path.resolve('property_portal_final_release.zip');
if (fs.existsSync(zipOutput)) {
  fs.unlinkSync(zipOutput);
}

// Compress using PowerShell Compress-Archive
const psCommand = `powershell -Command "Compress-Archive -Path '${packageDir}/*' -DestinationPath '${zipOutput}' -CompressionLevel Optimal -Force"`;
console.log('Running compression...');
execSync(psCommand, { stdio: 'inherit' });

const zipStats = fs.statSync(zipOutput);
console.log('=================================================================');
console.log('SUCCESS! Final production archive created:');
console.log('Path: ' + zipOutput);
console.log('Size: ' + (zipStats.size / (1024 * 1024)).toFixed(2) + ' MB');
console.log('=================================================================');

