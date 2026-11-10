<?php
/**
 * GET & POST /api/workspace/admin-manage.php
 * Administrative management interface for PRD Buyer Workspaces:
 * - List all buyer workspaces with overview metrics
 * - Update site visit (assign executive, change status, set pickup)
 * - Add/update advisory consultation (notes, recommendation dossier)
 * - Update plot booking stage (hold -> token paid -> verification -> registration in progress -> completed)
 * - Trigger simulated instant WhatsApp / Email alert for saved search
 * - Adjust user entitlements
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

use Mannidam\Config\Database;
use Mannidam\Helpers\Response;

Response::initCors();

$db = (new Database())->getConnection();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        // Overview of all users with active workspaces
        $usersStmt = $db->query("
            SELECT u.id, u.name, u.phone, u.email, u.created_at,
                   ue.plan_id, sp.name AS plan_name,
                   (SELECT COUNT(*) FROM user_site_visits WHERE user_id = u.id) AS total_visits,
                   (SELECT COUNT(*) FROM user_advisory_consultations WHERE user_id = u.id) AS total_consultations,
                   (SELECT COUNT(*) FROM user_saved_searches WHERE user_id = u.id) AS total_saved_searches,
                   (SELECT COUNT(*) FROM user_plot_bookings WHERE user_id = u.id) AS total_bookings
            FROM users u
            LEFT JOIN user_entitlements ue ON u.id = ue.user_id
            LEFT JOIN subscription_plans sp ON ue.plan_id = sp.id
            ORDER BY u.id ASC
        ");
        $users = $usersStmt->fetchAll(PDO::FETCH_ASSOC);

        // All site visits across platform
        $visitsStmt = $db->query("
            SELECT sv.*, u.name AS user_name, u.phone AS user_phone
            FROM user_site_visits sv
            JOIN users u ON sv.user_id = u.id
            ORDER BY sv.visit_date DESC, sv.id DESC
        ");
        $allVisits = $visitsStmt->fetchAll(PDO::FETCH_ASSOC);

        // All consultations across platform
        $consultStmt = $db->query("
            SELECT ac.*, u.name AS user_name, u.phone AS user_phone
            FROM user_advisory_consultations ac
            JOIN users u ON ac.user_id = u.id
            ORDER BY ac.consultation_date DESC, ac.id DESC
        ");
        $allConsultations = array_map(function($c) {
            $c['recommendations'] = !empty($c['recommendations_json']) ? json_decode($c['recommendations_json'], true) : [];
            unset($c['recommendations_json']);
            return $c;
        }, $consultStmt->fetchAll(PDO::FETCH_ASSOC));

        // All saved searches
        $searchesStmt = $db->query("
            SELECT ss.*, u.name AS user_name, u.phone AS user_phone
            FROM user_saved_searches ss
            JOIN users u ON ss.user_id = u.id
            ORDER BY ss.id DESC
        ");
        $allSearches = array_map(function($s) {
            $s['filters'] = !empty($s['filters_json']) ? json_decode($s['filters_json'], true) : [];
            unset($s['filters_json']);
            return $s;
        }, $searchesStmt->fetchAll(PDO::FETCH_ASSOC));

        // All plot bookings
        $bookingsStmt = $db->query("
            SELECT pb.*, u.name AS user_name, u.phone AS user_phone
            FROM user_plot_bookings pb
            JOIN users u ON pb.user_id = u.id
            ORDER BY pb.id DESC
        ");
        $allBookings = $bookingsStmt->fetchAll(PDO::FETCH_ASSOC);

        Response::success([
            'users' => $users,
            'allVisits' => $allVisits,
            'allConsultations' => $allConsultations,
            'allSearches' => $allSearches,
            'allBookings' => $allBookings
        ], 'Admin buyer workspaces loaded');
    } catch (\Throwable $e) {
        Response::error('Failed to load admin workspaces: ' . $e->getMessage(), 500);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = Response::getJsonInput();
    if (empty($input)) {
        $input = $_POST;
    }

    $action = trim((string)($input['action'] ?? ''));

    try {
        switch ($action) {
            case 'update_site_visit':
                $visitId = (int)($input['visitId'] ?? 0);
                $status = trim((string)($input['status'] ?? 'confirmed'));
                $execName = trim((string)($input['executiveName'] ?? 'Ramesh V (Relationship Mgr)'));
                $execPhone = trim((string)($input['executivePhone'] ?? '+91 94440 12345'));
                $pickupLoc = trim((string)($input['pickupLocation'] ?? ''));
                $notes = trim((string)($input['adminNotes'] ?? ''));

                $stmt = $db->prepare("
                    UPDATE user_site_visits 
                    SET status = ?, assigned_executive_name = ?, assigned_executive_phone = ?, pickup_location = ?, admin_notes = ?
                    WHERE id = ?
                ");
                $stmt->execute([$status, $execName, $execPhone, $pickupLoc, $notes, $visitId]);
                Response::success(['visitId' => $visitId], 'Site visit assignment updated successfully');
                break;

            case 'add_consultation':
                $userId = max(1, (int)($input['userId'] ?? 1));
                $advisorName = trim((string)($input['advisorName'] ?? 'Karthik Narayanan'));
                $advisorRole = trim((string)($input['advisorRole'] ?? 'Senior Cadastral Specialist'));
                $notes = trim((string)($input['notes'] ?? ''));
                $recomms = !empty($input['recommendations']) ? json_encode($input['recommendations']) : '[]';
                $dossier = trim((string)($input['dossierPdf'] ?? 'FAP-DOSSIER-PRJ-0059.pdf'));

                $stmt = $db->prepare("
                    INSERT INTO user_advisory_consultations 
                    (user_id, advisor_name, advisor_role, consultation_date, duration_minutes, status, advisor_notes, recommendations_json, dossier_pdf_url)
                    VALUES (?, ?, ?, NOW(), 45, 'completed', ?, ?, ?)
                ");
                $stmt->execute([$userId, $advisorName, $advisorRole, $notes, $recomms, $dossier]);
                Response::success(['consultationId' => $db->lastInsertId()], 'Advisory consultation notes saved successfully');
                break;

            case 'update_booking_status':
                $bookingId = (int)($input['bookingId'] ?? 0);
                $status = trim((string)($input['status'] ?? 'plot_on_hold'));
                $legalOfficer = trim((string)($input['legalOfficer'] ?? ''));
                $notes = trim((string)($input['notes'] ?? ''));
                $targetRegDate = !empty($input['targetRegistrationDate']) ? $input['targetRegistrationDate'] : null;

                $stmt = $db->prepare("
                    UPDATE user_plot_bookings 
                    SET status = ?, assigned_legal_officer = ?, notes = ?, target_registration_date = ?
                    WHERE id = ?
                ");
                $stmt->execute([$status, $legalOfficer, $notes, $targetRegDate, $bookingId]);
                Response::success(['bookingId' => $bookingId, 'status' => $status], 'Plot booking workflow status updated');
                break;

            case 'trigger_search_alert':
                $searchId = (int)($input['searchId'] ?? 0);
                $stmt = $db->prepare("UPDATE user_saved_searches SET last_notified_at = NOW(), matches_count = matches_count + 1 WHERE id = ?");
                $stmt->execute([$searchId]);
                Response::success(['searchId' => $searchId], 'Simulated WhatsApp & Email alert dispatched to customer');
                break;

            case 'adjust_entitlements':
                $userId = max(1, (int)($input['userId'] ?? 1));
                $addViews = (int)($input['addViews'] ?? 0);
                $addComparisons = (int)($input['addComparisons'] ?? 0);
                $addAdvisory = (int)($input['addAdvisory'] ?? 0);
                $addVisits = (int)($input['addVisits'] ?? 0);

                $stmt = $db->prepare("
                    UPDATE user_entitlements 
                    SET project_view_limit = project_view_limit + ?,
                        comparison_limit = comparison_limit + ?,
                        advisory_session_limit = advisory_session_limit + ?,
                        site_visit_limit = site_visit_limit + ?
                    WHERE user_id = ?
                ");
                $stmt->execute([$addViews, $addComparisons, $addAdvisory, $addVisits, $userId]);
                Response::success(['userId' => $userId], 'Entitlement credits updated successfully');
                break;

            default:
                Response::error('Invalid action specified', 400);
        }
    } catch (\Throwable $e) {
        Response::error('Admin workspace update error: ' . $e->getMessage(), 500);
    }
}

