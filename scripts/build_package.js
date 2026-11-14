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
fs.copyFileSync(path.resolve('backend/sql/01_COMPLETE_DATABASE_SCHEMA.sql'), path.join(dbDir, '01_COMPLETE_DATABASE_SCHEMA.sql'));
fs.copyFileSync(path.resolve('backend/sql/full_live_dump.sql'), path.join(dbDir, '02_FULL_LIVE_DATA_DUMP.sql'));
fs.copyFileSync(path.resolve('backend/sql/recent_changes_live_migration.sql'), path.join(dbDir, '03_RECENT_CHANGES_MIGRATION.sql'));
console.log('Database schemas consolidated in database/.');

console.log('=== Step 5: Generating Deployment Guide ===');
const deploymentGuide = `# Production Deployment & Server Configuration Guide

This archive contains the complete production-ready build for **Find a Plot Real Estate Marketplace**:
- **\`public_html/\`**: Complete web root containing the compiled Angular Single-Page Application (HTML/JS/CSS/Assets) and the PHP REST API (\`/backend/\`).
- **\`database/\`**: Complete MySQL database schemas, data dumps, and admin configurations.

---

## 1. Database Setup (phpMyAdmin or MySQL CLI)

1. Create a new MySQL database on your host (e.g., \`findaplot_property_db\` or \`onenesgw_property_project\`).
   - Character set: \`utf8mb4\`
   - Collation: \`utf8mb4_unicode_ci\`
2. Import the schema:
   - For a fresh installation with all 25+ tables, master specifications, admin accounts, and seed properties:
     **Import \`database/01_COMPLETE_DATABASE_SCHEMA.sql\`**
   - Alternatively, if you want the full live data dump with all sample properties:
     **Import \`database/02_FULL_LIVE_DATA_DUMP.sql\`**
   - If your database already exists and you only want the recent migration tables:
     **Import \`database/03_RECENT_CHANGES_MIGRATION.sql\`**

---

## 2. Backend Configuration (\`public_html/backend/config/\`)

1. Open \`public_html/backend/config/database.php\` and update with your live database credentials:
   \`\`\`php
   $this->host     = $_ENV['DB_HOST'] ?? '127.0.0.1';
   $this->dbName   = $_ENV['DB_NAME'] ?? 'your_database_name';
   $this->username = $_ENV['DB_USER'] ?? 'your_database_user';
   $this->password = $_ENV['DB_PASS'] ?? 'your_database_password';
   \`\`\`

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
- **Ezhil** (Lead Reviewer): \`ezhil@findaplot.com\` / \`ezhil@2026\`
- **Ram** (Peer Reviewer): \`ram@findaplot.com\` / \`ram@2026\`
- **Benny** (Platform Administrator): \`benny@findaplot.com\` / \`benny@2026\`
`;

fs.writeFileSync(path.join(packageDir, 'DEPLOYMENT_GUIDE.md'), deploymentGuide, 'utf8');
console.log('DEPLOYMENT_GUIDE.md written.');

console.log('=== Step 6: Creating Final Production ZIP Archive ===');
const zipFile = path.resolve('property_portal_final_release.zip');
if (fs.existsSync(zipFile)) {
  fs.unlinkSync(zipFile);
}

// Check for 7-Zip or PowerShell Compress-Archive
console.log('Running compression...');
try {
  // Use PowerShell Compress-Archive for standard Windows zip
  const psCommand = 'powershell -Command "Compress-Archive -Path \'' + packageDir + '\\*\' -DestinationPath \'' + zipFile + '\' -CompressionLevel Optimal -Force"';
  execSync(psCommand, { stdio: 'inherit' });
  const stats = fs.statSync(zipFile);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
  console.log('=================================================================');
  console.log('SUCCESS! Final production archive created:');
  console.log('Path: ' + zipFile);
  console.log('Size: ' + sizeMb + ' MB');
  console.log('=================================================================');
} catch (err) {
  console.error('Error creating ZIP archive:', err);
  process.exit(1);
}
