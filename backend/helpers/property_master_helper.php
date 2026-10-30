<?php
/**
 * Property Master Data Helper
 * Manages database schema and insertion for the comprehensive Property Master Data sheet
 */

declare(strict_types=1);

namespace Mannidam\Helpers;

use PDO;

class PropertyMasterHelper {
    public static function ensureTable(PDO $db): void {
        $sql = "
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
        ";
        try {
            $db->exec($sql);
        } catch (\Throwable $e) {
            error_log('Error creating property_master_details table: ' . $e->getMessage());
        }
    }

    public static function saveMasterDetails(PDO $db, string $propId, array $d): bool {
        self::ensureTable($db);

        $sql = "
            INSERT INTO property_master_details (
                property_id, project_name, developer, rera_number, dtcp_approved, dtcp_approval_no,
                patta_type, clear_title_available, bank_loan_approved, area_location, village_locality,
                taluk, district, pincode, google_maps_link, plot_no, plot_size_sqft, plot_size_cents,
                dimension, facing, corner_plot, land_use, price_per_sqft, total_price, availability,
                petrol_bunk_distance, schools_nearby, colleges_nearby, hospital_nearby, corridor,
                bus_stop_distance, railway_station_nearby, highway_name, highway_distance, airport_distance,
                suited_for, possession_timeline, electricity, water_connection, drainage_facility,
                road_width_ft, road_type, street_lights, compound_wall_gated, park, other_amenities,
                developer_maintenance_years, flood_zone, waterlogging_history, contact_person_phone, remarks
            ) VALUES (
                :property_id, :project_name, :developer, :rera_number, :dtcp_approved, :dtcp_approval_no,
                :patta_type, :clear_title_available, :bank_loan_approved, :area_location, :village_locality,
                :taluk, :district, :pincode, :google_maps_link, :plot_no, :plot_size_sqft, :plot_size_cents,
                :dimension, :facing, :corner_plot, :land_use, :price_per_sqft, :total_price, :availability,
                :petrol_bunk_distance, :schools_nearby, :colleges_nearby, :hospital_nearby, :corridor,
                :bus_stop_distance, :railway_station_nearby, :highway_name, :highway_distance, :airport_distance,
                :suited_for, :possession_timeline, :electricity, :water_connection, :drainage_facility,
                :road_width_ft, :road_type, :street_lights, :compound_wall_gated, :park, :other_amenities,
                :developer_maintenance_years, :flood_zone, :waterlogging_history, :contact_person_phone, :remarks
            ) ON DUPLICATE KEY UPDATE
                project_name = VALUES(project_name),
                developer = VALUES(developer),
                rera_number = VALUES(rera_number),
                dtcp_approved = VALUES(dtcp_approved),
                dtcp_approval_no = VALUES(dtcp_approval_no),
                patta_type = VALUES(patta_type),
                clear_title_available = VALUES(clear_title_available),
                bank_loan_approved = VALUES(bank_loan_approved),
                area_location = VALUES(area_location),
                village_locality = VALUES(village_locality),
                taluk = VALUES(taluk),
                district = VALUES(district),
                pincode = VALUES(pincode),
                google_maps_link = VALUES(google_maps_link),
                plot_no = VALUES(plot_no),
                plot_size_sqft = VALUES(plot_size_sqft),
                plot_size_cents = VALUES(plot_size_cents),
                dimension = VALUES(dimension),
                facing = VALUES(facing),
                corner_plot = VALUES(corner_plot),
                land_use = VALUES(land_use),
                price_per_sqft = VALUES(price_per_sqft),
                total_price = VALUES(total_price),
                availability = VALUES(availability),
                petrol_bunk_distance = VALUES(petrol_bunk_distance),
                schools_nearby = VALUES(schools_nearby),
                colleges_nearby = VALUES(colleges_nearby),
                hospital_nearby = VALUES(hospital_nearby),
                corridor = VALUES(corridor),
                bus_stop_distance = VALUES(bus_stop_distance),
                railway_station_nearby = VALUES(railway_station_nearby),
                highway_name = VALUES(highway_name),
                highway_distance = VALUES(highway_distance),
                airport_distance = VALUES(airport_distance),
                suited_for = VALUES(suited_for),
                possession_timeline = VALUES(possession_timeline),
                electricity = VALUES(electricity),
                water_connection = VALUES(water_connection),
                drainage_facility = VALUES(drainage_facility),
                road_width_ft = VALUES(road_width_ft),
                road_type = VALUES(road_type),
                street_lights = VALUES(street_lights),
                compound_wall_gated = VALUES(compound_wall_gated),
                park = VALUES(park),
                other_amenities = VALUES(other_amenities),
                developer_maintenance_years = VALUES(developer_maintenance_years),
                flood_zone = VALUES(flood_zone),
                waterlogging_history = VALUES(waterlogging_history),
                contact_person_phone = VALUES(contact_person_phone),
                remarks = VALUES(remarks)
        ";

        try {
            $stmt = $db->prepare($sql);
            return $stmt->execute([
                ':property_id'                => $propId,
                ':project_name'               => trim((string)($d['projectName'] ?? '')),
                ':developer'                  => trim((string)($d['developer'] ?? '')),
                ':rera_number'                => trim((string)($d['reraNumber'] ?? '')),
                ':dtcp_approved'              => trim((string)($d['dtcpApproved'] ?? 'Yes')),
                ':dtcp_approval_no'           => trim((string)($d['dtcpApprovalNo'] ?? '')),
                ':patta_type'                 => trim((string)($d['pattaType'] ?? 'Individual Patta')),
                ':clear_title_available'      => trim((string)($d['clearTitleAvailable'] ?? 'Yes')),
                ':bank_loan_approved'         => trim((string)($d['bankLoanApproved'] ?? 'Yes')),
                ':area_location'              => trim((string)($d['areaLocation'] ?? '')),
                ':village_locality'           => trim((string)($d['villageLocality'] ?? '')),
                ':taluk'                      => trim((string)($d['taluk'] ?? '')),
                ':district'                   => trim((string)($d['district'] ?? '')),
                ':pincode'                    => trim((string)($d['pincode'] ?? '')),
                ':google_maps_link'           => trim((string)($d['googleMapsLink'] ?? '')),
                ':plot_no'                    => trim((string)($d['plotNo'] ?? '')),
                ':plot_size_sqft'             => (float)($d['plotSizeSqft'] ?? 0),
                ':plot_size_cents'            => (float)($d['plotSizeCents'] ?? 0),
                ':dimension'                  => trim((string)($d['dimension'] ?? '')),
                ':facing'                     => trim((string)($d['facing'] ?? 'East')),
                ':corner_plot'                => trim((string)($d['cornerPlot'] ?? 'No')),
                ':land_use'                   => trim((string)($d['landUse'] ?? 'Residential')),
                ':price_per_sqft'             => (float)($d['pricePerSqft'] ?? 0),
                ':total_price'                => (float)($d['totalPrice'] ?? 0),
                ':availability'               => trim((string)($d['availability'] ?? 'Available')),
                ':petrol_bunk_distance'       => isset($d['petrolBunkDistance']) && is_numeric($d['petrolBunkDistance']) ? (float)$d['petrolBunkDistance'] : null,
                ':schools_nearby'             => trim((string)($d['schoolsNearby'] ?? '')),
                ':colleges_nearby'            => trim((string)($d['collegesNearby'] ?? '')),
                ':hospital_nearby'            => trim((string)($d['hospitalNearby'] ?? '')),
                ':corridor'                   => trim((string)($d['corridor'] ?? 'IT Corridor')),
                ':bus_stop_distance'          => isset($d['busStopDistance']) && is_numeric($d['busStopDistance']) ? (float)$d['busStopDistance'] : null,
                ':railway_station_nearby'     => trim((string)($d['railwayStationNearby'] ?? '')),
                ':highway_name'               => trim((string)($d['highwayName'] ?? '')),
                ':highway_distance'           => isset($d['highwayDistance']) && is_numeric($d['highwayDistance']) ? (float)$d['highwayDistance'] : null,
                ':airport_distance'           => isset($d['airportDistance']) && is_numeric($d['airportDistance']) ? (float)$d['airportDistance'] : null,
                ':suited_for'                 => trim((string)($d['suitedFor'] ?? 'Both')),
                ':possession_timeline'        => trim((string)($d['possessionTimeline'] ?? 'Immediate')),
                ':electricity'                => trim((string)($d['electricity'] ?? 'Available')),
                ':water_connection'           => trim((string)($d['waterConnection'] ?? 'Available')),
                ':drainage_facility'          => trim((string)($d['drainageFacility'] ?? 'Underground')),
                ':road_width_ft'              => isset($d['roadWidthFt']) && is_numeric($d['roadWidthFt']) ? (int)$d['roadWidthFt'] : 30,
                ':road_type'                  => trim((string)($d['roadType'] ?? 'Tar Road')),
                ':street_lights'              => trim((string)($d['streetLights'] ?? 'Yes')),
                ':compound_wall_gated'        => trim((string)($d['compoundWallGated'] ?? 'Yes')),
                ':park'                       => trim((string)($d['park'] ?? 'Yes')),
                ':other_amenities'            => trim((string)($d['otherAmenities'] ?? '')),
                ':developer_maintenance_years'=> isset($d['developerMaintenanceYears']) && is_numeric($d['developerMaintenanceYears']) ? (int)$d['developerMaintenanceYears'] : 2,
                ':flood_zone'                 => trim((string)($d['floodZone'] ?? 'No')),
                ':waterlogging_history'       => trim((string)($d['waterloggingHistory'] ?? 'No')),
                ':contact_person_phone'       => trim((string)($d['contactPersonPhone'] ?? '')),
                ':remarks'                    => trim((string)($d['remarks'] ?? ''))
            ]);
        } catch (\Throwable $e) {
            error_log('Failed to save master details: ' . $e->getMessage());
            return false;
        }
    }
}

