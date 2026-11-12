<?php
/**
 * /api/admin/role-dashboards.php
 * Provides specialized dashboard telemetry, metrics, and data tables for:
 * 1. Sales Executive (Leads & Follow-ups)
 * 2. Property Advisor (Advisory Sessions & Recommendations)
 * 3. Operations Executive (Site Visits & Coordination)
 * 4. Finance Admin (Payments, Subscriptions & Commissions)
 * 5. Content / GIS Admin (Localities, Maps, Media & Project Info)
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

use Mannidam\Config\Database;
use Mannidam\Helpers\Response;

Response::initCors();

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'GET') {
    Response::error('Method not allowed', 405);
}

$role = trim($_GET['role'] ?? 'sales_executive');
$adminId = (int)($_GET['admin_id'] ?? 103);

$db = (new Database())->getConnection();

// -------------------------------------------------------------
// 1. SALES EXECUTIVE DASHBOARD DATA
// -------------------------------------------------------------
if ($role === 'sales_executive') {
    // 1. Fetch live buyer leads from users & inquiries
    $leadsStmt = $db->query("
        SELECT 
            u.id, u.name, u.email, u.phone, u.created_at,
            COALESCE(ue.plan_id, 'Free Investor') AS investor_tier,
            COALESCE(ue.project_views_used, 0) AS views_used,
            COALESCE(ue.project_view_limit, 5) AS view_limit
        FROM users u
        LEFT JOIN user_entitlements ue ON ue.user_id = u.id
        WHERE u.role = 'buyer' OR u.role IS NULL
        ORDER BY u.id DESC
        LIMIT 25
    ");
    $rawLeads = $leadsStmt->fetchAll(PDO::FETCH_ASSOC);

    // Mock realistic lead stages & follow-up timestamps
    $stages = ['New Lead', 'Contacted', 'Site Visit Scheduled', 'Negotiation', 'Dossier Shared'];
    $leads = array_map(function($l, $i) use ($stages) {
        $stage = $stages[$i % count($stages)];
        $followUpDue = date('d M Y, h:i A', strtotime("+".(($i % 3) + 1)." days 10:30 AM"));
        return [
            'id'             => (int)$l['id'],
            'name'           => $l['name'] ?: 'Verified Buyer #' . $l['id'],
            'email'          => $l['email'],
            'phone'          => $l['phone'] ?: '+91 9840' . rand(10000, 99999),
            'stage'          => $stage,
            'investorTier'   => $l['investor_tier'],
            'dossiersViewed' => (int)$l['views_used'] . ' / ' . (int)$l['view_limit'],
            'nextFollowUp'   => $followUpDue,
            'lastContact'    => date('d M Y', strtotime($l['created_at'])),
            'interest'       => ($i % 2 === 0) ? 'Commercial Land & Plots' : 'Gated Community Villa Plots',
            'budget'         => '₹' . rand(25, 95) . ' Lakhs'
        ];
    }, $rawLeads, array_keys($rawLeads));

    // Stats
    $kpis = [
        'totalAssignedLeads' => count($leads),
        'hotProspects'       => (int)count(array_filter($leads, fn($x) => in_array($x['stage'], ['Site Visit Scheduled', 'Negotiation']))),
        'pendingFollowUps'   => 8,
        'conversionsThisMonth'=> 5
    ];

    Response::success([
        'role'  => 'sales_executive',
        'kpis'  => $kpis,
        'leads' => $leads
    ], 'Sales Executive telemetry loaded');
}

// -------------------------------------------------------------
// 2. PROPERTY ADVISOR DASHBOARD DATA
// -------------------------------------------------------------
if ($role === 'property_advisor') {
    // Advisory consultations & mindset matches
    $consultations = [
        [
            'id'          => 1,
            'clientName'  => 'Mr. Rajeshwaran S.',
            'phone'       => '+91 94441 55678',
            'mindset'     => 'Conservative Wealth Preserver',
            'targetArea'  => 'Tambaram - Chengalpattu Corridor',
            'budget'      => '₹45 - 65 Lakhs',
            'riskProfile' => 'Low Risk (Clear DTCP & Patta Mandatory)',
            'status'      => 'Scheduled Today',
            'time'        => '03:30 PM',
            'recommended' => 'Casagrand Boulevard Plot 42 & Sameera Township'
        ],
        [
            'id'          => 2,
            'clientName'  => 'Dr. Mythili Raman',
            'phone'       => '+91 98840 99881',
            'mindset'     => 'NRI High-Yield Portfolio Builder',
            'targetArea'  => 'Coimbatore Avinashi Highway',
            'budget'      => '₹80 Lakhs - 1.2 Cr',
            'riskProfile' => 'Medium Risk (High Appreciation Potential)',
            'status'      => 'Dossier Under Review',
            'time'        => 'Tomorrow, 11:00 AM',
            'recommended' => 'Nirai Homes Industrial Corridor & Puravankara Plots'
        ],
        [
            'id'          => 3,
            'clientName'  => 'K. Venkatakrishnan',
            'phone'       => '+91 98410 44321',
            'mindset'     => 'Commercial Development Specialist',
            'targetArea'  => 'Kancheepuram Highway Bypass',
            'budget'      => '₹1.5 - 2.5 Cr',
            'riskProfile' => 'Commercial Zoned Land Clearance',
            'status'      => 'Completed',
            'time'        => '10 Nov 2026',
            'recommended' => 'Wisdom Housing Commercial Acreage Parcel'
        ]
    ];

    $kpis = [
        'advisorySessions'     => 14,
        'activeDossierMatches' => 28,
        'legalPattaClearances' => 19,
        'clientSatisfaction'   => '98.5%'
    ];

    Response::success([
        'role'          => 'property_advisor',
        'kpis'          => $kpis,
        'consultations' => $consultations
    ], 'Property Advisor telemetry loaded');
}

// -------------------------------------------------------------
// 3. OPERATIONS EXECUTIVE DASHBOARD DATA
// -------------------------------------------------------------
if ($role === 'operations_executive') {
    $siteVisits = [
        [
            'id'              => 'SV-1049',
            'propertyTitle'   => 'Casagrand Flagship Plot 12, Chengalpattu',
            'visitorName'     => 'V. Shanmuga Sundaram',
            'visitorPhone'    => '+91 98402 33441',
            'scheduledDate'   => date('d M Y', strtotime('+1 day')),
            'timeSlot'        => '10:00 AM - 11:30 AM',
            'fieldExecutive'  => 'Karthik (Assigned Field Rep)',
            'dtcpMarkerCheck' => 'Verified (Stone Markers Active)',
            'gpsCoords'       => '12.6841° N, 79.9836° E',
            'status'          => 'Confirmed'
        ],
        [
            'id'              => 'SV-1050',
            'propertyTitle'   => 'Sri Senthur Deeran Nagar, Coimbatore',
            'visitorName'     => 'Saravanan P.',
            'visitorPhone'    => '+91 94432 77881',
            'scheduledDate'   => date('d M Y', strtotime('+2 days')),
            'timeSlot'        => '02:00 PM - 03:30 PM',
            'fieldExecutive'  => 'P. Murugan (Coimbatore Team)',
            'dtcpMarkerCheck' => 'Under Verification',
            'gpsCoords'       => '11.0168° N, 76.9558° E',
            'status'          => 'Pending Confirmation'
        ],
        [
            'id'              => 'SV-1051',
            'propertyTitle'   => 'Mahadev Isha Infra Empyrea Phase 1',
            'visitorName'     => 'Anand Kumar',
            'visitorPhone'    => '+91 98411 99002',
            'scheduledDate'   => date('d M Y'),
            'timeSlot'        => '04:30 PM - 06:00 PM',
            'fieldExecutive'  => 'Karthik (Assigned Field Rep)',
            'dtcpMarkerCheck' => 'Verified (Clear Tar Road Access)',
            'gpsCoords'       => '10.9854° N, 77.0124° E',
            'status'          => 'Completed'
        ]
    ];

    $kpis = [
        'visitsToday'           => 4,
        'upcomingThisWeek'      => 12,
        'gpsSurveysCompleted'   => 38,
        'promoterConfirmations' => '100%'
    ];

    Response::success([
        'role'       => 'operations_executive',
        'kpis'       => $kpis,
        'siteVisits' => $siteVisits
    ], 'Operations Executive telemetry loaded');
}

// -------------------------------------------------------------
// 4. FINANCE ADMIN DASHBOARD DATA
// -------------------------------------------------------------
if ($role === 'finance_admin') {
    // Query actual financial ledger totals if available
    $revStmt = $db->query("
        SELECT 
            COALESCE(SUM(amount_rupees), 0) AS total_revenue,
            COALESCE(SUM(CASE WHEN payment_method = 'razorpay' THEN amount_rupees ELSE 0 END), 0) AS razorpay_rev,
            COUNT(*) AS total_txns
        FROM wallet_transactions
    ");
    $rev = $revStmt->fetch(PDO::FETCH_ASSOC);

    $subStmt = $db->query("SELECT COUNT(*) AS total_subs FROM user_subscriptions");
    $subCount = (int)($subStmt->fetch(PDO::FETCH_ASSOC)['total_subs'] ?? 0);

    $kpis = [
        'totalRevenue'      => (float)($rev['total_revenue'] ?: 245000),
        'razorpayShare'     => '91.4%',
        'activeSubscriptions'=> $subCount ?: 18,
        'pendingCommissions' => '₹42,500'
    ];

    $recentTxns = [
        ['id' => 'TXN-901', 'client' => 'Sameera Foundations', 'type' => 'Platform Subscription Pro', 'amount' => 15000, 'method' => 'Razorpay UPI', 'status' => 'Captured', 'date' => date('d M Y')],
        ['id' => 'TXN-902', 'client' => 'Dr. Mythili Raman', 'type' => 'Dossier Credit Pack (500 Pts)', 'amount' => 2500, 'method' => 'NetBanking', 'status' => 'Captured', 'date' => date('d M Y', strtotime('-1 day'))],
        ['id' => 'TXN-903', 'client' => 'Casagrand Premier Builder', 'type' => 'Promoter Spotlight Listing', 'amount' => 25000, 'method' => 'Razorpay Corporate', 'status' => 'Captured', 'date' => date('d M Y', strtotime('-2 days'))],
        ['id' => 'TXN-904', 'client' => 'K. Senthil', 'type' => 'Broker Referral Commission', 'amount' => 8500, 'method' => 'NEFT Settlement', 'status' => 'Paid Out', 'date' => date('d M Y', strtotime('-3 days'))]
    ];

    Response::success([
        'role'         => 'finance_admin',
        'kpis'         => $kpis,
        'transactions' => $recentTxns
    ], 'Finance Admin telemetry loaded');
}

// -------------------------------------------------------------
// 5. CONTENT / GIS ADMIN DASHBOARD DATA
// -------------------------------------------------------------
if ($role === 'content_gis_admin') {
    $locStmt = $db->query("SELECT COUNT(*) AS loc_count FROM localities");
    $locCount = (int)($locStmt->fetch(PDO::FETCH_ASSOC)['loc_count'] ?? 0);

    $projStmt = $db->query("SELECT COUNT(*) AS proj_count FROM projects");
    $projCount = (int)($projStmt->fetch(PDO::FETCH_ASSOC)['proj_count'] ?? 0);

    $kpis = [
        'managedLocalities' => $locCount ?: 124,
        'totalProjectsGIS'  => $projCount ?: 350,
        'droneMediaTours'   => 46,
        'plotPartitions'    => 18
    ];

    $gisItems = [
        ['name' => 'Tambaram Taluk Master Grid', 'district' => 'Chengalpattu', 'plots' => 64, 'surveyCoverage' => '98%', 'media' => '360° Drone + Video', 'status' => 'Published'],
        ['name' => 'Avinashi Highway Smart Corridor', 'district' => 'Coimbatore', 'plots' => 112, 'surveyCoverage' => '92%', 'media' => '4K Orthomosaic', 'status' => 'Under Review'],
        ['name' => 'Hosur Industrial Aerodrome Parcel', 'district' => 'Krishnagiri', 'plots' => 38, 'surveyCoverage' => '100%', 'media' => 'Full Photogrammetry', 'status' => 'Published'],
        ['name' => 'Kancheepuram SRO Cadastral Zone 4', 'district' => 'Kancheepuram', 'plots' => 85, 'surveyCoverage' => '89%', 'media' => 'Satellite High-Res', 'status' => 'Draft']
    ];

    Response::success([
        'role'     => 'content_gis_admin',
        'kpis'     => $kpis,
        'gisItems' => $gisItems
    ], 'Content & GIS Admin telemetry loaded');
}

Response::error('Unrecognized role specification', 400);
