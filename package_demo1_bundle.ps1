# Load .NET Compression
Add-Type -AssemblyName "System.IO.Compression.FileSystem"

$baseDir = "c:\Users\Benny\Desktop\the property project"
$bundlesDir = "$baseDir\bundles"
$tempDemo1 = "$bundlesDir\_temp_demo1"
$tempRoot = "$bundlesDir\_temp_root"
$stageDir = "$bundlesDir\_staging_demo1"

# 1. Save current demo1 build
if (Test-Path $tempDemo1) { Remove-Item -Recurse -Force $tempDemo1 }
New-Item -ItemType Directory -Path $tempDemo1 -Force | Out-Null
Copy-Item -Recurse -Force "$baseDir\dist\property-registry\*" $tempDemo1

# 2. Package demo1 frontend bundle
if (Test-Path "$bundlesDir\frontend_dist_demo1_bundle.zip") { Remove-Item -Force "$bundlesDir\frontend_dist_demo1_bundle.zip" }
Write-Host "Creating frontend_dist_demo1_bundle.zip..."
[System.IO.Compression.ZipFile]::CreateFromDirectory("$tempDemo1\browser", "$bundlesDir\frontend_dist_demo1_bundle.zip", [System.IO.Compression.CompressionLevel]::Optimal, $false)

# 3. Create Full Demo1 Package with README
if (Test-Path $stageDir) { Remove-Item -Recurse -Force $stageDir }
New-Item -ItemType Directory -Path "$stageDir\frontend_demo1" -Force | Out-Null
New-Item -ItemType Directory -Path "$stageDir\backend" -Force | Out-Null
New-Item -ItemType Directory -Path "$stageDir\database_schemas" -Force | Out-Null

Copy-Item -Recurse -Force "$tempDemo1\browser\*" "$stageDir\frontend_demo1\"
Copy-Item -Recurse -Force "$baseDir\backend\*" "$stageDir\backend\"
Copy-Item -Force "$baseDir\backend\sql\schema.sql" "$stageDir\database_schemas\"
Copy-Item -Force "$baseDir\backend\sql\seed.sql" "$stageDir\database_schemas\"
Copy-Item -Force "$baseDir\backend\sql\full_live_dump.sql" "$stageDir\database_schemas\"
Copy-Item -Recurse -Force "$baseDir\backend\database\*" "$stageDir\database_schemas\"

$readmeContent = @"
# Mannidam Deployment Guide for /demo1 Subfolder
======================================================
Generated on: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

## Why the Standard Build Does Not Work Under /demo1:
By default, Angular compiles with `<base href="/">`. When deployed inside `example.com/demo1/`:
1. The browser attempts to load JavaScript and CSS bundles from the root domain:
   - Request: `example.com/main-xxxx.js` (Returns 404 Not Found)
   - Required: `example.com/demo1/main-xxxx.js`
2. Angular router fails because route paths (e.g., `/admin`, `/wallet`) do not know they are inside `/demo1`.
3. Page refreshes (deep linking) fail unless Apache/Nginx rewrite rules route `/demo1/*` back to `/demo1/index.html`.
4. API calls to `/api/...` go to `example.com/api/...` instead of `example.com/demo1/backend/api/...`.

## What has been configured in this package:
1. Base Href is set to `<base href="/demo1/">`.
2. `.htaccess` is included in `frontend_demo1/` with Apache RewriteBase `/demo1/` so page refreshes and deep links never 404.
3. API endpoints dynamically detect `/demo1` location and route calls to `/demo1/backend/api/...` automatically.

## How to deploy on cPanel / Apache / XAMPP:
1. In your `public_html/` (or `htdocs/`), create a directory called `demo1`.
2. Copy all files from `frontend_demo1/` directly into your server's `demo1/` folder.
   (Make sure `.htaccess` is also uploaded, enabling hidden dot-files in your FTP/file manager).
3. Copy the `backend/` folder into `demo1/backend/`.
4. In MySQL/phpMyAdmin, import `database_schemas/full_live_dump.sql`.
5. Update `demo1/backend/config/Database.php` with your production DB host, username, and password.

## Nginx Configuration (if using Nginx instead of Apache):
location /demo1/ {
    alias /var/www/html/demo1/;
    try_files `$uri `$uri/ /demo1/index.html;
}
location /demo1/backend/api/ {
    alias /var/www/html/demo1/backend/api/;
    try_files `$uri `$uri/ =404;
    location ~ \.php$ {
        include fastcgi_params;
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock; # or 127.0.0.1:9000
        fastcgi_param SCRIPT_FILENAME `$request_filename;
    }
}
"@
Set-Content -Path "$stageDir\DEMO1_DEPLOYMENT_GUIDE.md" -Value $readmeContent -Encoding UTF8

if (Test-Path "$bundlesDir\mannidam_demo1_full_package.zip") { Remove-Item -Force "$bundlesDir\mannidam_demo1_full_package.zip" }
Write-Host "Creating mannidam_demo1_full_package.zip..."
[System.IO.Compression.ZipFile]::CreateFromDirectory($stageDir, "$bundlesDir\mannidam_demo1_full_package.zip", [System.IO.Compression.CompressionLevel]::Optimal, $false)

# Clean up staging
Remove-Item -Recurse -Force $tempDemo1
Remove-Item -Recurse -Force $stageDir

Write-Host "`nDemo1 bundles ready at: $bundlesDir`n"
Get-ChildItem $bundlesDir | Select-Object Name, @{Name="Size (KB)";Expression={[math]::Round($_.Length/1KB,2)}}, LastWriteTime | Format-Table -AutoSize
