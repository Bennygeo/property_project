# Mannidam Real Estate Marketplace - PHP & MySQL Backend

## 1. Quick Setup Guide

### Step 1: Start MySQL in XAMPP
1. Open **XAMPP Control Panel**.
2. Click **Start** on **Apache** and **MySQL**.
3. Ensure MySQL port is running on `3306` (default).

### Step 2: Import Database Schema & Seed Data
You can import the database using either **phpMyAdmin** or the **Windows Command Line**:

#### Option A: Using Command Prompt / PowerShell
Run the following commands in PowerShell from the project root:
```powershell
# 1. Create database and tables
Get-Content backend\sql\schema.sql | & "C:\xampp\mysql\bin\mysql.exe" -u root

# 2. Populate initial seed data (Cities, Properties, Floor Plans, Media)
Get-Content backend\sql\seed.sql | & "C:\xampp\mysql\bin\mysql.exe" -u root
```

#### Option B: Using phpMyAdmin
1. Navigate to `http://localhost/phpmyadmin/` in your browser.
2. Click on the **Import** tab.
3. Import `backend/sql/schema.sql`.
4. Import `backend/sql/seed.sql`.

---

## 2. Testing the Backend

### Verify Connection via CLI:
```powershell
& "C:\xampp\php\php.exe" backend\test_connection.php
```

### Run Local PHP Built-in Server (Alternative to Apache):
From the project root:
```powershell
& "C:\xampp\php\php.exe" -S localhost:8000 -t backend
```

Once running, you can test the REST API endpoints directly in your browser or Postman:
- **Properties List**: `http://localhost:8000/api/properties/list.php`
- **Property Details**: `http://localhost:8000/api/properties/details.php?id=p-1`
- **Spotlight Launches**: `http://localhost:8000/api/properties/spotlight.php`
- **Metro Cities**: `http://localhost:8000/api/geo/cities.php`
- **Localities**: `http://localhost:8000/api/geo/localities.php?cityKey=chennai`
- **Media Packages**: `http://localhost:8000/api/wallet/packages.php`
- **Wallet Balance**: `http://localhost:8000/api/wallet/balance.php?userId=1`

---

## 3. Directory Layout
```
backend/
├── config/
│   └── database.php          # PDO connection with UTF8mb4 & prepared statements
├── helpers/
│   └── response.php          # JSON envelope & CORS headers for Angular (:4200)
├── api/
│   ├── properties/
│   │   ├── list.php          # Search, filter, pagination
│   │   ├── details.php       # Full 100acress-style property dossier
│   │   └── spotlight.php     # Homepage featured showcase
│   ├── geo/
│   │   ├── cities.php        # Metro city hubs & statistics
│   │   └── localities.php    # Localities & micro-market rates
│   ├── wallet/
│   │   ├── balance.php       # User points balance & unlocked media IDs
│   │   └── packages.php      # Recharge packs (₹100, ₹500, etc.)
│   ├── media/
│   │   └── unlock.php        # Atomic point deduction & media unlock
│   └── leads/
│       ├── book-visit.php    # Cadastral site visit booking
│       └── brochure.php      # PDF brochure request & lead logging
├── sql/
│   ├── schema.sql            # Complete DDL script with foreign keys & indexes
│   └── seed.sql              # Pre-populated mock data for immediate testing
└── test_connection.php       # Diagnostic script
```
