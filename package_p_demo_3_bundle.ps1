# Load .NET Compression
Add-Type -AssemblyName "System.IO.Compression.FileSystem"

$baseDir = "c:\Users\Benny\Desktop\the property project"
$bundlesDir = "$baseDir\bundles"
$stageDir = "$bundlesDir\_staging_p_demo_3"
$desktopZip = "C:\Users\Benny\Desktop\p_demo_3.zip"
$bundlesZip = "$bundlesDir\p_demo_3.zip"
$xamppHtdocsTarget = "C:\xampp\htdocs\p_demo_3"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "   PACKAGING FIND A PLOT FOR /p_demo_3/  " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Run production Angular build with base-href /p_demo_3/
Write-Host "`n[Step 1/5] Building Angular app with base-href /p_demo_3/..." -ForegroundColor Yellow
Set-Location $baseDir
npx ng build --configuration production --base-href /p_demo_3/

if ($LASTEXITCODE -ne 0) {
    Write-Error "Angular build failed!"
    exit 1
}

# 2. Prepare staging directory
Write-Host "`n[Step 2/5] Preparing staging directory at $stageDir..." -ForegroundColor Yellow
if (Test-Path $stageDir) { Remove-Item -Recurse -Force $stageDir }
New-Item -ItemType Directory -Path $stageDir -Force | Out-Null
New-Item -ItemType Directory -Path "$stageDir\backend" -Force | Out-Null
New-Item -ItemType Directory -Path "$stageDir\database_schemas" -Force | Out-Null

# 3. Copy frontend distribution files directly into root of package
Write-Host "`n[Step 3/5] Copying compiled frontend, .htaccess, and assets..." -ForegroundColor Yellow
Copy-Item -Recurse -Force "$baseDir\dist\property-registry\browser\*" "$stageDir\"

# Ensure .htaccess has RewriteBase /p_demo_3/
$htaccessContent = @"
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /p_demo_3/

  # If an existing asset or directory is requested, serve directly
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # All other routes go to index.html for Angular SPA client routing
  RewriteRule ^ index.html [L]
</IfModule>
"@
Set-Content -Path "$stageDir\.htaccess" -Value $htaccessContent -Encoding UTF8

# Copy backend PHP and SQL
Write-Host "Copying backend PHP code and database files..." -ForegroundColor Yellow
Copy-Item -Recurse -Force "$baseDir\backend\*" "$stageDir\backend\"
Copy-Item -Force "$baseDir\backend\sql\schema.sql" "$stageDir\database_schemas\"
Copy-Item -Force "$baseDir\backend\sql\seed.sql" "$stageDir\database_schemas\"
Copy-Item -Force "$baseDir\backend\sql\full_live_dump.sql" "$stageDir\database_schemas\"
if (Test-Path "$baseDir\backend\database") {
    Copy-Item -Recurse -Force "$baseDir\backend\database\*" "$stageDir\database_schemas\"
}

# Add Deployment Guide
$readmeContent = @"
# Find a Plot - /p_demo_3/ Deployment Guide
======================================================
Generated on: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

## Target Configuration:
- Base Href: `<base href="/p_demo_3/">`
- Apache RewriteBase: `RewriteBase /p_demo_3/`
- API Endpoint: `/p_demo_3/backend/api/...`

## How to deploy:
1. In your web server root (public_html/ or htdocs/), create or open the `p_demo_3` folder.
2. Extract all contents of this package directly into `p_demo_3/`.
   - Result:
     `p_demo_3/index.html`
     `p_demo_3/.htaccess`
     `p_demo_3/main-*.js`
     `p_demo_3/backend/`
     `p_demo_3/assets/`
3. Database Setup:
   - In MySQL/phpMyAdmin, import `database_schemas/full_live_dump.sql`.
   - Update `backend/config/database.php` with your database credentials.
4. Access:
   - Navigate to `http://<your-domain>/p_demo_3/` in your browser.
"@
Set-Content -Path "$stageDir\P_DEMO_3_DEPLOYMENT_GUIDE.md" -Value $readmeContent -Encoding UTF8

# 4. Create ZIP archives
Write-Host "`n[Step 4/5] Creating ZIP packages..." -ForegroundColor Yellow
if (Test-Path $bundlesZip) { Remove-Item -Force $bundlesZip }
[System.IO.Compression.ZipFile]::CreateFromDirectory($stageDir, $bundlesZip, [System.IO.Compression.CompressionLevel]::Optimal, $false)
Write-Host "Created bundle: $bundlesZip" -ForegroundColor Green

if (Test-Path $desktopZip) { Remove-Item -Force $desktopZip }
Copy-Item -Force $bundlesZip $desktopZip
Write-Host "Copied to Desktop: $desktopZip" -ForegroundColor Green

# 5. Deploy to local XAMPP if available
if (Test-Path "C:\xampp\htdocs") {
    Write-Host "`n[Step 5/5] Deploying directly to local XAMPP ($xamppHtdocsTarget)..." -ForegroundColor Yellow
    if (Test-Path $xamppHtdocsTarget) { Remove-Item -Recurse -Force $xamppHtdocsTarget }
    New-Item -ItemType Directory -Path $xamppHtdocsTarget -Force | Out-Null
    Copy-Item -Recurse -Force "$stageDir\*" "$xamppHtdocsTarget\"
    Write-Host "Successfully deployed to local XAMPP at $xamppHtdocsTarget!" -ForegroundColor Green
    Write-Host "You can test locally at: http://localhost/p_demo_3/" -ForegroundColor Cyan
}

# Clean up staging directory
Remove-Item -Recurse -Force $stageDir

Write-Host "`nPackaging completed successfully!" -ForegroundColor Green
Get-Item $desktopZip | Select-Object Name, @{Name="Size (MB)";Expression={[math]::Round($_.Length/1MB,2)}}, LastWriteTime | Format-Table -AutoSize
