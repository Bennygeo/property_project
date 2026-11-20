<?php
/**
 * Property Master Data Helper
 * Manages database schema and insertion for the comprehensive Property Master Data sheet
 */

declare(strict_types=1);

namespace Mannidam\Helpers;

use PDO;

class PropertyMasterHelper {
    /**
     * Save or update all combined project fields across `projects` and `project_details` tables.
     */
    public static function saveProjectAndDetails(PDO $db, string $projectId, array $input, array $masterData, array $options = []): bool {
        $d = is_array($masterData) ? $masterData : [];

        // Helper closure to pick first non-empty value across masterData, input, and fallback
        $pick = function (array $keys, $default = '') use ($d, $input) {
            foreach ($keys as $k) {
                if (isset($d[$k]) && $d[$k] !== '' && $d[$k] !== null) {
                    return $d[$k];
                }
                if (isset($input[$k]) && $input[$k] !== '' && $input[$k] !== null) {
                    return $input[$k];
                }
            }
            return $default;
        };

        $toBoolInt = function ($val, int $default = 0): int {
            if (is_bool($val)) return $val ? 1 : 0;
            if (is_numeric($val)) return ((int)$val) > 0 ? 1 : 0;
            $s = strtolower(trim((string)$val));
            if (in_array($s, ['yes', 'true', '1', 'y'], true)) return 1;
            if (in_array($s, ['no', 'false', '0', 'n'], true)) return 0;
            return $default;
        };

        $parseNumber = function ($val, float $default = 0.0): float {
            if (is_numeric($val)) return (float)$val;
            $str = str_replace(',', '', (string)$val);
            if (preg_match('/([\d\.]+)/', $str, $m)) {
                $num = (float)$m[1];
                if (stripos($str, 'cr') !== false) return $num * 10000000;
                if (stripos($str, 'l') !== false) return $num * 100000;
                return $num;
            }
            return $default;
        };

        $nullDate = function ($val): ?string {
            $s = trim((string)$val);
            if ($s === '' || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $s)) {
                return null;
            }
            return $s;
        };

        $projectName = trim((string)$pick(['projectName', 'title', 'project_name'], ''));
        if ($projectName === '') {
            return false;
        }

        // Developer resolution
        $devName = trim((string)($options['developer_name'] ?? $pick(['developer', 'developerName', 'developer_name'], '')));
        $devId = isset($options['developer_id']) && (int)$options['developer_id'] > 0
            ? (int)$options['developer_id']
            : (int)$pick(['developerId', 'developer_id'], 0);

        if ($devId <= 0 && $devName !== '') {
            try {
                $devStmt = $db->prepare("SELECT id, name FROM developers WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1");
                $devStmt->execute([$devName]);
                $devRow = $devStmt->fetch(PDO::FETCH_ASSOC);
                if ($devRow) {
                    $devId = (int)$devRow['id'];
                    $devName = (string)$devRow['name'];
                }
            } catch (\Throwable $e) {}
        }

        $district = trim((string)$pick(['district', 'city', 'cityName'], 'Chennai'));
        $city = trim((string)$pick(['city', 'cityName', 'district'], 'Chennai'));
        $locality = trim((string)$pick(['villageLocality', 'areaLocation', 'localityName', 'locality'], 'OMR'));
        $category = trim((string)$pick(['category', 'propertyType'], 'Gated CMDA Plots'));
        $type = trim((string)$pick(['type', 'listingMode'], 'Residential'));
        $landType = trim((string)$pick(['landUse', 'landType', 'land_type', 'type'], 'Residential'));

        $totalPrice = $parseNumber($pick(['totalPrice', 'priceFrom', 'price_from', 'price'], 0));
        $priceFrom = $parseNumber($pick(['priceFrom', 'price_from', 'totalPrice', 'price'], $totalPrice), $totalPrice);
        $priceTo = $parseNumber($pick(['priceTo', 'price_to', 'totalPrice', 'priceFrom'], $priceFrom), $priceFrom);
        $sqftRate = $parseNumber($pick(['pricePerSqft', 'sqftRate', 'sqft_rate'], 0));

        $plotSqft = (int)round($parseNumber($pick(['plotSizeSqft', 'minPlotSize', 'min_plot_size', 'sqft'], 600), 600));
        if ($plotSqft <= 0) $plotSqft = 600;
        $minPlotSize = (int)round($parseNumber($pick(['minPlotSize', 'min_plot_size', 'plotSizeSqft'], $plotSqft), $plotSqft));
        $maxPlotSize = (int)round($parseNumber($pick(['maxPlotSize', 'max_plot_size', 'plotSizeSqft'], max($minPlotSize, 2400)), max($minPlotSize, 2400)));

        $projectStage = trim((string)$pick(['projectStage', 'project_stage'], 'Ready for Construction'));
        $launchDate = $nullDate($pick(['launchDate', 'launch_date'], ''));
        $possessionDate = trim((string)$pick(['possessionTimeline', 'possessionDate', 'possession_date'], 'Immediate'));
        $reraNo = trim((string)$pick(['reraNumber', 'reraNo', 'rera_no'], ''));
        $brokerage = trim((string)$pick(['brokerage', 'brokerageBadge'], '0% Direct SRO Deed'));
        $noBrokerage = $toBoolInt($pick(['noBrokerage', 'no_brokerage'], 'Yes'), 1);
        $featured = $toBoolInt($pick(['featured', 'isFeatured'], 'No'), 0);
        $freeAccess = $toBoolInt($pick(['freeAccess', 'free_access'], 'No'), 0);
        $whatsappNumber = trim((string)$pick(['whatsappNumber', 'whatsapp_number', 'contactPersonPhone'], '9486140936'));
        $coverImage = trim((string)$pick(['coverImage', 'cover_image', 'mainImageUrl'], ''));
        $interactiveMap = trim((string)$pick(['interactiveMap', 'interactive_map', 'interactiveMapUrl', 'googleMapsLink'], ''));
        $totalUnits = trim((string)$pick(['totalUnits', 'total_units'], ''));
        $unitsSold = trim((string)$pick(['unitsSold', 'units_sold'], '0'));
        $projectStatus = trim((string)$pick(['projectStatus', 'project_status'], 'Active'));
        $submittedBy = trim((string)($options['submitted_by'] ?? $pick(['submittedBy', 'submitted_by', 'authorName', 'userName'], 'Admin')));
        $submittedByUserId = isset($options['submitted_by_user_id']) ? (int)$options['submitted_by_user_id'] : (int)$pick(['submittedByUserId', 'submitted_by_user_id', 'userId', 'user_id'], 0);
        if ($submittedByUserId <= 0) {
            $submittedByUserId = null;
        }
        $status = trim((string)($options['status'] ?? $pick(['status'], 'pending_review')));
        $validStatuses = ['published', 'pending_review', 'pending_peer_review', 'revision_requested', 'rejected'];
        if (!in_array($status, $validStatuses, true)) {
            $status = 'pending_review';
        }

        // Insert / Update `projects`
        $projSql = "
            INSERT INTO projects (
                project_id, project_name, developer_id, developer_name, district, city, locality,
                category, type, land_type, price_from, price_to, sqft_rate, min_plot_size, max_plot_size,
                project_stage, launch_date, possession_date, rera_no, brokerage, no_brokerage,
                featured, free_access, whatsapp_number, cover_image, interactive_map,
                total_units, units_sold, project_status, submitted_by, submitted_by_user_id, status
            ) VALUES (
                :project_id, :project_name, :developer_id, :developer_name, :district, :city, :locality,
                :category, :type, :land_type, :price_from, :price_to, :sqft_rate, :min_plot_size, :max_plot_size,
                :project_stage, :launch_date, :possession_date, :rera_no, :brokerage, :no_brokerage,
                :featured, :free_access, :whatsapp_number, :cover_image, :interactive_map,
                :total_units, :units_sold, :project_status, :submitted_by, :submitted_by_user_id, :status
            ) ON DUPLICATE KEY UPDATE
                project_name = VALUES(project_name),
                developer_id = VALUES(developer_id),
                developer_name = VALUES(developer_name),
                district = VALUES(district),
                city = VALUES(city),
                locality = VALUES(locality),
                category = VALUES(category),
                type = VALUES(type),
                land_type = VALUES(land_type),
                price_from = VALUES(price_from),
                price_to = VALUES(price_to),
                sqft_rate = VALUES(sqft_rate),
                min_plot_size = VALUES(min_plot_size),
                max_plot_size = VALUES(max_plot_size),
                project_stage = VALUES(project_stage),
                launch_date = VALUES(launch_date),
                possession_date = VALUES(possession_date),
                rera_no = VALUES(rera_no),
                brokerage = VALUES(brokerage),
                no_brokerage = VALUES(no_brokerage),
                featured = VALUES(featured),
                free_access = VALUES(free_access),
                whatsapp_number = VALUES(whatsapp_number),
                cover_image = VALUES(cover_image),
                interactive_map = VALUES(interactive_map),
                total_units = VALUES(total_units),
                units_sold = VALUES(units_sold),
                project_status = VALUES(project_status),
                submitted_by_user_id = COALESCE(VALUES(submitted_by_user_id), submitted_by_user_id),
                status = VALUES(status)
        ";

        try {
            $pStmt = $db->prepare($projSql);
            $pStmt->execute([
                ':project_id'           => $projectId,
                ':project_name'         => $projectName,
                ':developer_id'         => $devId > 0 ? $devId : null,
                ':developer_name'       => $devName !== '' ? $devName : null,
                ':district'             => $district !== '' ? $district : 'Chennai',
                ':city'                 => $city !== '' ? $city : 'Chennai',
                ':locality'             => $locality !== '' ? $locality : 'OMR',
                ':category'             => $category !== '' ? $category : 'Gated CMDA Plots',
                ':type'                 => $type !== '' ? $type : 'Residential',
                ':land_type'            => $landType !== '' ? $landType : 'Residential',
                ':price_from'           => $priceFrom,
                ':price_to'             => $priceTo,
                ':sqft_rate'            => $sqftRate,
                ':min_plot_size'        => $minPlotSize,
                ':max_plot_size'        => $maxPlotSize,
                ':project_stage'        => $projectStage !== '' ? $projectStage : 'Ready for Construction',
                ':launch_date'          => $launchDate,
                ':possession_date'      => $possessionDate !== '' ? $possessionDate : 'Immediate',
                ':rera_no'              => $reraNo !== '' ? $reraNo : null,
                ':brokerage'            => $brokerage !== '' ? $brokerage : '0% Direct SRO Deed',
                ':no_brokerage'         => $noBrokerage,
                ':featured'             => $featured,
                ':free_access'          => $freeAccess,
                ':whatsapp_number'      => $whatsappNumber !== '' ? $whatsappNumber : '9486140936',
                ':cover_image'          => $coverImage !== '' ? $coverImage : null,
                ':interactive_map'      => $interactiveMap !== '' ? $interactiveMap : null,
                ':total_units'          => $totalUnits !== '' ? $totalUnits : null,
                ':units_sold'           => $unitsSold !== '' ? $unitsSold : null,
                ':project_status'       => $projectStatus !== '' ? $projectStatus : 'Active',
                ':submitted_by'         => $submittedBy !== '' ? $submittedBy : null,
                ':submitted_by_user_id' => $submittedByUserId,
                ':status'               => $status
            ]);

            // Insert / Update `project_details`
            $totalLayoutArea = trim((string)$pick(['totalLayoutArea', 'total_layout_area', 'totalLandParcel'], ''));
            $totalPlots = (int)$parseNumber($pick(['totalPlots', 'total_plots', 'totalUnits'], 0), 0);
            $availablePlotSizes = trim((string)$pick(['availablePlotSizes', 'available_plot_sizes'], ''));
            if ($availablePlotSizes === '' && $minPlotSize > 0) {
                $availablePlotSizes = $minPlotSize === $maxPlotSize
                    ? "{$minPlotSize} sq.ft"
                    : "{$minPlotSize} - {$maxPlotSize} sq.ft";
            }
            $dimensions = trim((string)$pick(['dimension', 'dimensions', 'plotDimensions'], ''));
            $roadWidthFt = $pick(['roadWidthFt'], '');
            $roadWidth = trim((string)$pick(['roadWidth', 'road_width'], $roadWidthFt !== '' ? "{$roadWidthFt}ft Blacktop Roads" : '30ft & 40ft Blacktop Roads'));
            $cornerPlot = $toBoolInt($pick(['cornerPlot', 'corner_plot'], 'No'), 0);
            $approvalAuthority = trim((string)$pick(['approvalAuthority', 'approval_authority', 'plotApproval'], 'DTCP / CMDA'));
            $approvalReference = trim((string)$pick(['dtcpApprovalNo', 'approvalReference', 'approval_reference'], ''));
            $approvalDate = $nullDate($pick(['approvalDate', 'approval_date'], ''));
            $reraDetails = trim((string)$pick(['reraDetails', 'rera_details', 'reraNumber'], $reraNo));
            $internalRoads = trim((string)$pick(['internalRoads', 'internal_roads', 'roadType'], '40ft & 30ft Blacktop Tar'));
            $streetLights = trim((string)$pick(['streetLightsDetails', 'streetLights', 'street_lights'], 'LED Avenue Lighting'));
            $drainage = trim((string)$pick(['drainageDetails', 'drainageFacility', 'drainage'], 'Underground Stormwater Drainage'));
            $water = trim((string)$pick(['waterDetails', 'waterConnection', 'water'], 'Individual OHT Water Supply'));
            $electricity = trim((string)$pick(['electricityDetails', 'electricity'], 'EB 3-Phase Underground Cabling'));
            $parks = trim((string)$pick(['parksDetails', 'park', 'parks'], 'Landscaped Children Park & Walkway'));
            $security = trim((string)$pick(['securityDetails', 'compoundWallGated', 'security'], '24x7 Boom Barrier Security'));
            $otherFacilities = trim((string)$pick(['otherAmenities', 'otherFacilities', 'other_facilities'], ''));
            $gps = trim((string)$pick(['gps', 'googleMapsLink'], ''));
            $nearbyRoads = trim((string)$pick(['nearbyRoads', 'nearby_roads', 'highwayName'], ''));
            $railwayStation = trim((string)$pick(['railwayStationNearby', 'railwayStation', 'railway_station'], ''));
            $schools = trim((string)$pick(['schoolsNearby', 'schools'], ''));
            $hospitals = trim((string)$pick(['hospitalNearby', 'hospitals'], ''));
            $employmentHubs = trim((string)$pick(['employmentHubs', 'employment_hubs', 'corridor'], ''));
            $residentialDev = trim((string)$pick(['residentialDevelopment', 'residential_development', 'suitedFor'], ''));
            $infraProjects = trim((string)$pick(['infrastructureProjects', 'infrastructure_projects', 'remarks'], ''));

            // Gallery array merge (galleryImages array + galleryUrls comma/newline separated)
            $galleryArr = [];
            if (!empty($input['galleryImages']) && is_array($input['galleryImages'])) {
                foreach ($input['galleryImages'] as $gu) {
                    $gu = trim((string)$gu);
                    if ($gu !== '') $galleryArr[] = $gu;
                }
            }
            $galleryUrlsRaw = trim((string)$pick(['galleryUrls', 'gallery'], ''));
            if ($galleryUrlsRaw !== '') {
                if (str_starts_with($galleryUrlsRaw, '[')) {
                    $dec = json_decode($galleryUrlsRaw, true);
                    if (is_array($dec)) {
                        foreach ($dec as $gu) {
                            $gu = trim((string)$gu);
                            if ($gu !== '') $galleryArr[] = $gu;
                        }
                    }
                } else {
                    foreach (preg_split('/[\r\n,]+/', $galleryUrlsRaw) as $gu) {
                        $gu = trim($gu);
                        if ($gu !== '') $galleryArr[] = $gu;
                    }
                }
            }
            $galleryJson = !empty($galleryArr) ? json_encode(array_values(array_unique($galleryArr))) : null;

            $videos = trim((string)$pick(['videos'], ''));
            $droneVideos = trim((string)$pick(['droneVideos', 'drone_videos'], ''));
            $layoutPdf = trim((string)$pick(['layoutPdf', 'layout_pdf'], ''));
            $brochure = trim((string)$pick(['brochure'], ''));

            $detSql = "
                INSERT INTO project_details (
                    project_id, total_layout_area, total_plots, available_plot_sizes, dimensions,
                    road_width, corner_plot, land_type, approval_authority, approval_reference,
                    approval_date, rera_details, internal_roads, street_lights, drainage,
                    water, electricity, parks, security, other_facilities,
                    gps, nearby_roads, railway_station, schools, hospitals,
                    employment_hubs, residential_development, infrastructure_projects,
                    gallery, videos, drone_videos, layout_pdf, brochure
                ) VALUES (
                    :project_id, :total_layout_area, :total_plots, :available_plot_sizes, :dimensions,
                    :road_width, :corner_plot, :land_type, :approval_authority, :approval_reference,
                    :approval_date, :rera_details, :internal_roads, :street_lights, :drainage,
                    :water, :electricity, :parks, :security, :other_facilities,
                    :gps, :nearby_roads, :railway_station, :schools, :hospitals,
                    :employment_hubs, :residential_development, :infrastructure_projects,
                    :gallery, :videos, :drone_videos, :layout_pdf, :brochure
                ) ON DUPLICATE KEY UPDATE
                    total_layout_area = VALUES(total_layout_area),
                    total_plots = VALUES(total_plots),
                    available_plot_sizes = VALUES(available_plot_sizes),
                    dimensions = VALUES(dimensions),
                    road_width = VALUES(road_width),
                    corner_plot = VALUES(corner_plot),
                    land_type = VALUES(land_type),
                    approval_authority = VALUES(approval_authority),
                    approval_reference = VALUES(approval_reference),
                    approval_date = VALUES(approval_date),
                    rera_details = VALUES(rera_details),
                    internal_roads = VALUES(internal_roads),
                    street_lights = VALUES(street_lights),
                    drainage = VALUES(drainage),
                    water = VALUES(water),
                    electricity = VALUES(electricity),
                    parks = VALUES(parks),
                    security = VALUES(security),
                    other_facilities = VALUES(other_facilities),
                    gps = VALUES(gps),
                    nearby_roads = VALUES(nearby_roads),
                    railway_station = VALUES(railway_station),
                    schools = VALUES(schools),
                    hospitals = VALUES(hospitals),
                    employment_hubs = VALUES(employment_hubs),
                    residential_development = VALUES(residential_development),
                    infrastructure_projects = VALUES(infrastructure_projects),
                    gallery = VALUES(gallery),
                    videos = VALUES(videos),
                    drone_videos = VALUES(drone_videos),
                    layout_pdf = VALUES(layout_pdf),
                    brochure = VALUES(brochure)
            ";

            $dStmt = $db->prepare($detSql);
            $dStmt->execute([
                ':project_id'              => $projectId,
                ':total_layout_area'       => $totalLayoutArea !== '' ? $totalLayoutArea : null,
                ':total_plots'             => $totalPlots,
                ':available_plot_sizes'    => $availablePlotSizes !== '' ? $availablePlotSizes : null,
                ':dimensions'              => $dimensions !== '' ? $dimensions : null,
                ':road_width'              => $roadWidth !== '' ? $roadWidth : null,
                ':corner_plot'             => $cornerPlot,
                ':land_type'               => $landType !== '' ? $landType : 'Residential',
                ':approval_authority'      => $approvalAuthority !== '' ? $approvalAuthority : 'DTCP / CMDA',
                ':approval_reference'      => $approvalReference !== '' ? $approvalReference : null,
                ':approval_date'           => $approvalDate,
                ':rera_details'            => $reraDetails !== '' ? $reraDetails : null,
                ':internal_roads'          => $internalRoads !== '' ? $internalRoads : null,
                ':street_lights'           => $streetLights !== '' ? $streetLights : null,
                ':drainage'                => $drainage !== '' ? $drainage : null,
                ':water'                   => $water !== '' ? $water : null,
                ':electricity'             => $electricity !== '' ? $electricity : null,
                ':parks'                   => $parks !== '' ? $parks : null,
                ':security'                => $security !== '' ? $security : null,
                ':other_facilities'        => $otherFacilities !== '' ? $otherFacilities : null,
                ':gps'                     => $gps !== '' ? $gps : null,
                ':nearby_roads'            => $nearbyRoads !== '' ? $nearbyRoads : null,
                ':railway_station'         => $railwayStation !== '' ? $railwayStation : null,
                ':schools'                 => $schools !== '' ? $schools : null,
                ':hospitals'               => $hospitals !== '' ? $hospitals : null,
                ':employment_hubs'         => $employmentHubs !== '' ? $employmentHubs : null,
                ':residential_development' => $residentialDev !== '' ? $residentialDev : null,
                ':infrastructure_projects' => $infraProjects !== '' ? $infraProjects : null,
                ':gallery'                 => $galleryJson,
                ':videos'                  => $videos !== '' ? $videos : null,
                ':drone_videos'            => $droneVideos !== '' ? $droneVideos : null,
                ':layout_pdf'              => $layoutPdf !== '' ? $layoutPdf : null,
                ':brochure'                => $brochure !== '' ? $brochure : null
            ]);

            // Sync into `properties` table so unified search, role dashboards, and legacy queries stay 100% in sync
            try {
                $propPriceStr = '';
                if ($priceFrom > 0 && $priceTo > $priceFrom) {
                    $propPriceStr = '₹ ' . ($priceFrom >= 10000000 ? number_format($priceFrom/10000000, 2) . ' Cr' : number_format($priceFrom/100000, 2) . ' L')
                                  . ' - '
                                  . ($priceTo >= 10000000 ? number_format($priceTo/10000000, 2) . ' Cr' : number_format($priceTo/100000, 2) . ' L');
                } elseif ($priceFrom > 0) {
                    $propPriceStr = '₹ ' . ($priceFrom >= 10000000 ? number_format($priceFrom/10000000, 2) . ' Cr' : number_format($priceFrom/100000, 2) . ' L');
                }
                $propRateStr = $sqftRate > 0 ? ('₹ ' . number_format($sqftRate, 0) . '/sq.ft') : '';
                $propSqftStr = $minPlotSize > 0 ? (number_format($minPlotSize, 0) . ' sq.ft') : '';

                $syncPropSql = "
                    INSERT INTO properties (
                        id, city_id, locality_id, title, property_type, listing_mode, locality_name, city_name,
                        price, price_per_sqft, sqft, bhk_badge, facing_or_view, main_image_url, rera_number,
                        status, submitted_by_user_id, submitted_by_name, submitted_by_role
                    ) VALUES (
                        :id, 1, 1, :title, :propertyType, :listingMode, :localityName, :cityName,
                        :price, :pricePerSqft, :sqft, :bhkBadge, :facingOrView, :mainImageUrl, :reraNumber,
                        :status, 101, :submittedByName, 'admin'
                    ) ON DUPLICATE KEY UPDATE
                        title = VALUES(title),
                        property_type = VALUES(property_type),
                        listing_mode = VALUES(listing_mode),
                        locality_name = VALUES(locality_name),
                        city_name = VALUES(city_name),
                        price = VALUES(price),
                        price_per_sqft = VALUES(price_per_sqft),
                        sqft = VALUES(sqft),
                        main_image_url = VALUES(main_image_url),
                        rera_number = VALUES(rera_number),
                        status = VALUES(status)
                ";
                $syncStmt = $db->prepare($syncPropSql);
                $syncStmt->execute([
                    ':id'               => $projectId,
                    ':title'            => $projectName,
                    ':propertyType'     => $category ?: 'Gated CMDA Plots',
                    ':listingMode'      => $type ?: 'plots',
                    ':localityName'     => $locality,
                    ':cityName'         => $city,
                    ':price'            => $propPriceStr,
                    ':pricePerSqft'     => $propRateStr,
                    ':sqft'             => $propSqftStr,
                    ':bhkBadge'         => $category,
                    ':facingOrView'     => 'East Facing',
                    ':mainImageUrl'     => $coverImage,
                    ':reraNumber'       => $reraNo,
                    ':status'           => $status,
                    ':submittedByName'  => $submittedBy ?: 'Admin'
                ]);
            } catch (\Throwable $pe) {
                error_log('Sync properties table notice: ' . $pe->getMessage());
            }

            return true;
        } catch (\Throwable $e) {
            error_log('Failed to save project and details: ' . $e->getMessage());
            return false;
        }
    }
}

