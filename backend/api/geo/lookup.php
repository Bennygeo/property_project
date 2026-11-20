<?php
/**
 * GET /api/geo/lookup.php
 * Real-time Geographic Auto-population API for Pincode and Locality/Area lookup.
 * Powers Stage 2 of Post Property hybrid auto-fill.
 *
 * Actions:
 *   1. ?action=pincode&pincode=603202
 *      Resolves City, District, Taluk and list of Post Offices / Localities.
 *   2. ?action=locality&q=Gudu
 *      Resolves matching localities with their City, District, Taluk and Pincode.
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

use Mannidam\Config\Database;
use Mannidam\Helpers\Response;

Response::initCors();

$action = trim((string)($_GET['action'] ?? ''));
if ($action === '') {
    // Infer action from query params
    if (!empty($_GET['pincode'])) {
        $action = 'pincode';
    } elseif (!empty($_GET['q']) || !empty($_GET['query'])) {
        $action = 'locality';
    } else {
        $action = 'pincode';
    }
}

// Curated Tamil Nadu postal reference table (for instant 0ms response and offline resilience)
$curatedPostalHubs = [
    // Chengalpattu & South Suburbs
    '603202' => ['district' => 'Chengalpattu', 'city' => 'Chengalpattu', 'taluk' => 'Chengalpattu', 'localities' => ['Guduvanchery', 'Nandivaram', 'Kannivakkam', 'Karanaipuduchery', 'Kayarambedu', 'Madambakkam']],
    '603210' => ['district' => 'Chengalpattu', 'city' => 'Chengalpattu', 'taluk' => 'Chengalpattu', 'localities' => ['Urapakkam', 'Karanai']],
    '603209' => ['district' => 'Chengalpattu', 'city' => 'Chengalpattu', 'taluk' => 'Chengalpattu', 'localities' => ['Maraimalai Nagar', 'Kattankulathur']],
    '603204' => ['district' => 'Chengalpattu', 'city' => 'Chengalpattu', 'taluk' => 'Chengalpattu', 'localities' => ['Singaperumal Koil', 'Anjur', 'Chettipunyam']],
    '603001' => ['district' => 'Chengalpattu', 'city' => 'Chengalpattu', 'taluk' => 'Chengalpattu', 'localities' => ['Chengalpattu HO', 'Alapakkam', 'Melamaiyur', 'Gundu']],
    '603103' => ['district' => 'Chengalpattu', 'city' => 'Chengalpattu', 'taluk' => 'Thiruporur', 'localities' => ['Kelambakkam', 'Navalur', 'Siruseri', 'Padur', 'Pudupakkam']],
    '603110' => ['district' => 'Chengalpattu', 'city' => 'Chengalpattu', 'taluk' => 'Thiruporur', 'localities' => ['Thiruporur', 'Kalavakkam', 'Illalur']],
    '603104' => ['district' => 'Chengalpattu', 'city' => 'Chengalpattu', 'taluk' => 'Thirukalukundram', 'localities' => ['Mamallapuram', 'Mahabalipuram', 'Poonjeri']],
    '600045' => ['district' => 'Chengalpattu', 'city' => 'Chennai', 'taluk' => 'Tambaram', 'localities' => ['Tambaram', 'West Tambaram', 'East Tambaram', 'Irumbuliyur']],
    '600047' => ['district' => 'Chengalpattu', 'city' => 'Chennai', 'taluk' => 'Tambaram', 'localities' => ['Tambaram Sanatorium', 'Chitlapakkam']],
    '600048' => ['district' => 'Chengalpattu', 'city' => 'Chennai', 'taluk' => 'Vandalur', 'localities' => ['Vandalur', 'Otteri', 'Kolapakkam']],
    '600063' => ['district' => 'Chengalpattu', 'city' => 'Chennai', 'taluk' => 'Tambaram', 'localities' => ['Perungalathur', 'Peerkankaranai']],
    '600073' => ['district' => 'Chengalpattu', 'city' => 'Chennai', 'taluk' => 'Tambaram', 'localities' => ['Selaiyur', 'Rajakilpakkam', 'Sembakkam', 'Camp Road']],
    '600100' => ['district' => 'Chengalpattu', 'city' => 'Chennai', 'taluk' => 'Tambaram', 'localities' => ['Medavakkam', 'Perumbakkam', 'Kovilambakkam']],
    '600044' => ['district' => 'Chengalpattu', 'city' => 'Chennai', 'taluk' => 'Pallavaram', 'localities' => ['Chromepet', 'Hasthinapuram', 'Nemilichery']],
    '600043' => ['district' => 'Chengalpattu', 'city' => 'Chennai', 'taluk' => 'Pallavaram', 'localities' => ['Pallavaram', 'Old Pallavaram', 'Keelkattalai']],

    // Chennai Central & IT Corridor
    '600050' => ['district' => 'Chennai', 'city' => 'Chennai', 'taluk' => 'Ambattur', 'localities' => ['Padi', 'Korattur', 'Mannurpet', 'Jagadambigainagar', 'Padi Pudur']],
    '600053' => ['district' => 'Chennai', 'city' => 'Chennai', 'taluk' => 'Ambattur', 'localities' => ['Ambattur OT', 'Menambedu', 'Venkatapuram']],
    '600058' => ['district' => 'Chennai', 'city' => 'Chennai', 'taluk' => 'Ambattur', 'localities' => ['Ambattur Industrial Estate', 'Pattaravakkam']],
    '600049' => ['district' => 'Chennai', 'city' => 'Chennai', 'taluk' => 'Ayanavaram', 'localities' => ['Villivakkam', 'Konnur', 'Agatheeswarar Nagar']],
    '600080' => ['district' => 'Chennai', 'city' => 'Chennai', 'taluk' => 'Ambattur', 'localities' => ['Korattur', 'Korattur RS', 'Central Avenue']],
    '600099' => ['district' => 'Chennai', 'city' => 'Chennai', 'taluk' => 'Kolathur', 'localities' => ['Kolathur', 'Puthagaram', 'Periyar Nagar']],
    '600107' => ['district' => 'Chennai', 'city' => 'Chennai', 'taluk' => 'Aminjikarai', 'localities' => ['Koyambedu', 'CMBT', 'Nerkundram']],
    '600095' => ['district' => 'Chennai', 'city' => 'Chennai', 'taluk' => 'Maduravoyal', 'localities' => ['Maduravoyal', 'Alapakkam', 'Porur Link Road']],
    '600077' => ['district' => 'Tiruvallur', 'city' => 'Chennai', 'taluk' => 'Poonamallee', 'localities' => ['Thiruverkadu', 'Ayappakkam', 'Koladi']],
    '600087' => ['district' => 'Chennai', 'city' => 'Chennai', 'taluk' => 'Alandur', 'localities' => ['Valasaravakkam', 'Alwarthirunagar', 'Kesavardhini']],
    '600089' => ['district' => 'Chennai', 'city' => 'Chennai', 'taluk' => 'Maduravoyal', 'localities' => ['Ramapuram', 'Manapakkam', 'Nandambakkam']],
    '600037' => ['district' => 'Chennai', 'city' => 'Chennai', 'taluk' => 'Ambattur', 'localities' => ['Mogappair East', 'Golden Flats', 'Pari Salai']],
    '600028' => ['district' => 'Chennai', 'city' => 'Chennai', 'taluk' => 'Mylapore', 'localities' => ['Raja Annamalaipuram', 'Mylapore', 'Mandaveli']],
    '600004' => ['district' => 'Chennai', 'city' => 'Chennai', 'taluk' => 'Mylapore', 'localities' => ['Mylapore', 'Santhome', 'Luz']],
    '600017' => ['district' => 'Chennai', 'city' => 'Chennai', 'taluk' => 'Egmore', 'localities' => ['T. Nagar', 'Pondy Bazaar', 'Panagal Park']],
    '600040' => ['district' => 'Chennai', 'city' => 'Chennai', 'taluk' => 'Aminjikarai', 'localities' => ['Anna Nagar West', 'Anna Nagar East', 'Shanthi Colony']],
    '600042' => ['district' => 'Chennai', 'city' => 'Chennai', 'taluk' => 'Velachery', 'localities' => ['Velachery', 'Vijayanagar', 'Dhandeeswaram']],
    '600119' => ['district' => 'Chennai', 'city' => 'Chennai', 'taluk' => 'Sholinganallur', 'localities' => ['Sholinganallur', 'Semmancheri', 'Arasankalani']],
    '600096' => ['district' => 'Chennai', 'city' => 'Chennai', 'taluk' => 'Sholinganallur', 'localities' => ['Perungudi', 'Kandanchavadi', 'Seevaram']],
    '600097' => ['district' => 'Chennai', 'city' => 'Chennai', 'taluk' => 'Sholinganallur', 'localities' => ['Thoraipakkam', 'Okkiyam Thoraipakkam']],
    '600116' => ['district' => 'Chennai', 'city' => 'Chennai', 'taluk' => 'Maduravoyal', 'localities' => ['Porur', 'Mugalivakkam', 'Ramapuram', 'Gerugambakkam']],
    '600032' => ['district' => 'Chennai', 'city' => 'Chennai', 'taluk' => 'Guindy', 'localities' => ['Guindy', 'Ekkattuthangal', 'CIPET']],
    '600020' => ['district' => 'Chennai', 'city' => 'Chennai', 'taluk' => 'Velachery', 'localities' => ['Adyar', 'Kasturibai Nagar', 'Gandhi Nagar']],
    '600041' => ['district' => 'Chennai', 'city' => 'Chennai', 'taluk' => 'Velachery', 'localities' => ['Thiruvanmiyur', 'Valmiki Nagar', 'Kottivakkam']],

    // Tiruvallur & West
    '600054' => ['district' => 'Tiruvallur', 'city' => 'Tiruvallur', 'taluk' => 'Avadi', 'localities' => ['Avadi', 'HVF Estate', 'Pattabiram']],
    '600056' => ['district' => 'Tiruvallur', 'city' => 'Tiruvallur', 'taluk' => 'Poonamallee', 'localities' => ['Poonamallee', 'Kattupakkam', 'Karayanchavadi']],
    '602001' => ['district' => 'Tiruvallur', 'city' => 'Tiruvallur', 'taluk' => 'Tiruvallur', 'localities' => ['Tiruvallur HO', 'Manavalanagar', 'Sevvapet']],

    // Kanchipuram
    '602105' => ['district' => 'Kanchipuram', 'city' => 'Kanchipuram', 'taluk' => 'Sriperumbudur', 'localities' => ['Sriperumbudur', 'Mambakkam', 'Irungattukottai']],
    '631501' => ['district' => 'Kanchipuram', 'city' => 'Kanchipuram', 'taluk' => 'Kanchipuram', 'localities' => ['Kanchipuram HO', 'Orikkai', 'Chinna Kanchipuram']],

    // Coimbatore
    '641001' => ['district' => 'Coimbatore', 'city' => 'Coimbatore', 'taluk' => 'Coimbatore South', 'localities' => ['Town Hall', 'Gandhipuram', 'RS Puram']],
    '641035' => ['district' => 'Coimbatore', 'city' => 'Coimbatore', 'taluk' => 'Coimbatore North', 'localities' => ['Saravanampatti', 'Keeranatham', 'CHIL SEZ IT Park']],
    '641014' => ['district' => 'Coimbatore', 'city' => 'Coimbatore', 'taluk' => 'Coimbatore South', 'localities' => ['Peelamedu', 'Hope College', 'Tidel Park Coimbatore']],
    '641062' => ['district' => 'Coimbatore', 'city' => 'Coimbatore', 'taluk' => 'Sulur', 'localities' => ['Sulur', 'Arasur', 'Kalangal']],

    // Madurai
    '625001' => ['district' => 'Madurai', 'city' => 'Madurai', 'taluk' => 'Madurai North', 'localities' => ['Madurai HO', 'Meenakshi Temple Zone', 'Simmakkal']],
    '625020' => ['district' => 'Madurai', 'city' => 'Madurai', 'taluk' => 'Madurai North', 'localities' => ['KK Nagar', 'Anna Nagar Madurai', 'Mattuthavani']],

    // Tiruchirappalli
    '620001' => ['district' => 'Tiruchirappalli', 'city' => 'Tiruchirappalli', 'taluk' => 'Tiruchirappalli', 'localities' => ['Tiruchirappalli HO', 'Cantonment', 'Central Bus Stand']],
    '620018' => ['district' => 'Tiruchirappalli', 'city' => 'Tiruchirappalli', 'taluk' => 'Tiruchirappalli', 'localities' => ['Thillai Nagar', 'Tennur', 'Woraiyur']],

    // Salem
    '636001' => ['district' => 'Salem', 'city' => 'Salem', 'taluk' => 'Salem', 'localities' => ['Salem HO', 'Four Roads', 'Shevapet']],
    '636007' => ['district' => 'Salem', 'city' => 'Salem', 'taluk' => 'Salem', 'localities' => ['Fairlands', 'Alagapuram', 'Suramangalam']],

    // Erode
    '638001' => ['district' => 'Erode', 'city' => 'Erode', 'taluk' => 'Erode', 'localities' => ['Erode HO', 'Brough Road', 'Railway Colony']],
    '638011' => ['district' => 'Erode', 'city' => 'Erode', 'taluk' => 'Perundurai', 'localities' => ['Perundurai', 'SIPCOT Industrial Complex', 'Ingur']],

    // Tirunelveli
    '627001' => ['district' => 'Tirunelveli', 'city' => 'Tirunelveli', 'taluk' => 'Tirunelveli', 'localities' => ['Tirunelveli Town', 'Nellaippar Temple', 'Pettai']],
    '627002' => ['district' => 'Tirunelveli', 'city' => 'Tirunelveli', 'taluk' => 'Palayamkottai', 'localities' => ['Palayamkottai', 'Samathanapuram', 'KTC Nagar']],

    // Kanyakumari
    '629001' => ['district' => 'Kanyakumari', 'city' => 'Kanyakumari', 'taluk' => 'Agastheeswaram', 'localities' => ['Nagercoil HO', 'Vadasery', 'Kottar']],
    '629702' => ['district' => 'Kanyakumari', 'city' => 'Kanyakumari', 'taluk' => 'Agastheeswaram', 'localities' => ['Kanyakumari', 'Vivekanandapuram', 'Kovalam Beach']]
];

// Curated prominent localities mapped to District, City, and Pincode
$curatedLocalityDirectory = [
    'padi'             => ['locality' => 'Padi', 'city' => 'Chennai', 'district' => 'Chennai', 'taluk' => 'Ambattur', 'pincode' => '600050'],
    'korattur'         => ['locality' => 'Korattur', 'city' => 'Chennai', 'district' => 'Chennai', 'taluk' => 'Ambattur', 'pincode' => '600050'],
    'mannurpet'        => ['locality' => 'Mannurpet', 'city' => 'Chennai', 'district' => 'Chennai', 'taluk' => 'Ambattur', 'pincode' => '600050'],
    'ambattur'         => ['locality' => 'Ambattur', 'city' => 'Chennai', 'district' => 'Chennai', 'taluk' => 'Ambattur', 'pincode' => '600053'],
    'villivakkam'      => ['locality' => 'Villivakkam', 'city' => 'Chennai', 'district' => 'Chennai', 'taluk' => 'Ayanavaram', 'pincode' => '600049'],
    'kolathur'         => ['locality' => 'Kolathur', 'city' => 'Chennai', 'district' => 'Chennai', 'taluk' => 'Kolathur', 'pincode' => '600099'],
    'koyambedu'        => ['locality' => 'Koyambedu', 'city' => 'Chennai', 'district' => 'Chennai', 'taluk' => 'Aminjikarai', 'pincode' => '600107'],
    'maduravoyal'      => ['locality' => 'Maduravoyal', 'city' => 'Chennai', 'district' => 'Chennai', 'taluk' => 'Maduravoyal', 'pincode' => '600095'],
    'valasaravakkam'   => ['locality' => 'Valasaravakkam', 'city' => 'Chennai', 'district' => 'Chennai', 'taluk' => 'Alandur', 'pincode' => '600087'],
    'ramapuram'        => ['locality' => 'Ramapuram', 'city' => 'Chennai', 'district' => 'Chennai', 'taluk' => 'Maduravoyal', 'pincode' => '600089'],
    'mogappair'        => ['locality' => 'Mogappair', 'city' => 'Chennai', 'district' => 'Chennai', 'taluk' => 'Ambattur', 'pincode' => '600037'],
    'guduvanchery'     => ['locality' => 'Guduvanchery', 'city' => 'Chengalpattu', 'district' => 'Chengalpattu', 'taluk' => 'Chengalpattu', 'pincode' => '603202'],
    'nandivaram'       => ['locality' => 'Nandivaram', 'city' => 'Chengalpattu', 'district' => 'Chengalpattu', 'taluk' => 'Chengalpattu', 'pincode' => '603202'],
    'urapakkam'        => ['locality' => 'Urapakkam', 'city' => 'Chengalpattu', 'district' => 'Chengalpattu', 'taluk' => 'Chengalpattu', 'pincode' => '603210'],
    'maraimalai nagar' => ['locality' => 'Maraimalai Nagar', 'city' => 'Chengalpattu', 'district' => 'Chengalpattu', 'taluk' => 'Chengalpattu', 'pincode' => '603209'],
    'singaperumal koil'=> ['locality' => 'Singaperumal Koil', 'city' => 'Chengalpattu', 'district' => 'Chengalpattu', 'taluk' => 'Chengalpattu', 'pincode' => '603204'],
    'chengalpattu'     => ['locality' => 'Chengalpattu Town', 'city' => 'Chengalpattu', 'district' => 'Chengalpattu', 'taluk' => 'Chengalpattu', 'pincode' => '603001'],
    'kelambakkam'      => ['locality' => 'Kelambakkam', 'city' => 'Chengalpattu', 'district' => 'Chengalpattu', 'taluk' => 'Thiruporur', 'pincode' => '603103'],
    'thiruporur'       => ['locality' => 'Thiruporur', 'city' => 'Chengalpattu', 'district' => 'Chengalpattu', 'taluk' => 'Thiruporur', 'pincode' => '603110'],
    'mamallapuram'     => ['locality' => 'Mamallapuram', 'city' => 'Chengalpattu', 'district' => 'Chengalpattu', 'taluk' => 'Thirukalukundram', 'pincode' => '603104'],
    'mahabalipuram'    => ['locality' => 'Mahabalipuram', 'city' => 'Chengalpattu', 'district' => 'Chengalpattu', 'taluk' => 'Thirukalukundram', 'pincode' => '603104'],
    'navalur'          => ['locality' => 'Navalur', 'city' => 'Chengalpattu', 'district' => 'Chengalpattu', 'taluk' => 'Thiruporur', 'pincode' => '603103'],
    'siruseri'         => ['locality' => 'Siruseri', 'city' => 'Chengalpattu', 'district' => 'Chengalpattu', 'taluk' => 'Thiruporur', 'pincode' => '603103'],
    'tambaram'         => ['locality' => 'Tambaram', 'city' => 'Chennai', 'district' => 'Chengalpattu', 'taluk' => 'Tambaram', 'pincode' => '600045'],
    'west tambaram'    => ['locality' => 'West Tambaram', 'city' => 'Chennai', 'district' => 'Chengalpattu', 'taluk' => 'Tambaram', 'pincode' => '600045'],
    'east tambaram'    => ['locality' => 'East Tambaram', 'city' => 'Chennai', 'district' => 'Chengalpattu', 'taluk' => 'Tambaram', 'pincode' => '600045'],
    'vandalur'         => ['locality' => 'Vandalur', 'city' => 'Chennai', 'district' => 'Chengalpattu', 'taluk' => 'Vandalur', 'pincode' => '600048'],
    'perungalathur'    => ['locality' => 'Perungalathur', 'city' => 'Chennai', 'district' => 'Chengalpattu', 'taluk' => 'Tambaram', 'pincode' => '600063'],
    'selaiyur'         => ['locality' => 'Selaiyur', 'city' => 'Chennai', 'district' => 'Chengalpattu', 'taluk' => 'Tambaram', 'pincode' => '600073'],
    'medavakkam'       => ['locality' => 'Medavakkam', 'city' => 'Chennai', 'district' => 'Chengalpattu', 'taluk' => 'Tambaram', 'pincode' => '600100'],
    'perumbakkam'      => ['locality' => 'Perumbakkam', 'city' => 'Chennai', 'district' => 'Chengalpattu', 'taluk' => 'Tambaram', 'pincode' => '600100'],
    'chromepet'        => ['locality' => 'Chromepet', 'city' => 'Chennai', 'district' => 'Chengalpattu', 'taluk' => 'Pallavaram', 'pincode' => '600044'],
    'pallavaram'       => ['locality' => 'Pallavaram', 'city' => 'Chennai', 'district' => 'Chengalpattu', 'taluk' => 'Pallavaram', 'pincode' => '600043'],
    'velachery'        => ['locality' => 'Velachery', 'city' => 'Chennai', 'district' => 'Chennai', 'taluk' => 'Velachery', 'pincode' => '600042'],
    'sholinganallur'   => ['locality' => 'Sholinganallur', 'city' => 'Chennai', 'district' => 'Chennai', 'taluk' => 'Sholinganallur', 'pincode' => '600119'],
    'porur'            => ['locality' => 'Porur', 'city' => 'Chennai', 'district' => 'Chennai', 'taluk' => 'Maduravoyal', 'pincode' => '600116'],
    'guindy'           => ['locality' => 'Guindy', 'city' => 'Chennai', 'district' => 'Chennai', 'taluk' => 'Guindy', 'pincode' => '600032'],
    'adyar'            => ['locality' => 'Adyar', 'city' => 'Chennai', 'district' => 'Chennai', 'taluk' => 'Velachery', 'pincode' => '600020'],
    'thiruvanmiyur'    => ['locality' => 'Thiruvanmiyur', 'city' => 'Chennai', 'district' => 'Chennai', 'taluk' => 'Velachery', 'pincode' => '600041'],
    'anna nagar'       => ['locality' => 'Anna Nagar', 'city' => 'Chennai', 'district' => 'Chennai', 'taluk' => 'Aminjikarai', 'pincode' => '600040'],
    't nagar'          => ['locality' => 'T. Nagar', 'city' => 'Chennai', 'district' => 'Chennai', 'taluk' => 'Egmore', 'pincode' => '600017'],
    'mylapore'         => ['locality' => 'Mylapore', 'city' => 'Chennai', 'district' => 'Chennai', 'taluk' => 'Mylapore', 'pincode' => '600004'],
    'avadi'            => ['locality' => 'Avadi', 'city' => 'Tiruvallur', 'district' => 'Tiruvallur', 'taluk' => 'Avadi', 'pincode' => '600054'],
    'poonamallee'      => ['locality' => 'Poonamallee', 'city' => 'Tiruvallur', 'district' => 'Tiruvallur', 'taluk' => 'Poonamallee', 'pincode' => '600056'],
    'sriperumbudur'    => ['locality' => 'Sriperumbudur', 'city' => 'Kanchipuram', 'district' => 'Kanchipuram', 'taluk' => 'Sriperumbudur', 'pincode' => '602105'],
    'saravanampatti'   => ['locality' => 'Saravanampatti', 'city' => 'Coimbatore', 'district' => 'Coimbatore', 'taluk' => 'Coimbatore North', 'pincode' => '641035'],
    'gandhipuram'      => ['locality' => 'Gandhipuram', 'city' => 'Coimbatore', 'district' => 'Coimbatore', 'taluk' => 'Coimbatore South', 'pincode' => '641012'],
    'rs puram'         => ['locality' => 'R.S. Puram', 'city' => 'Coimbatore', 'district' => 'Coimbatore', 'taluk' => 'Coimbatore South', 'pincode' => '641002'],
    'nagercoil'        => ['locality' => 'Nagercoil', 'city' => 'Kanyakumari', 'district' => 'Kanyakumari', 'taluk' => 'Agastheeswaram', 'pincode' => '629001'],
    'thillai nagar'    => ['locality' => 'Thillai Nagar', 'city' => 'Tiruchirappalli', 'district' => 'Tiruchirappalli', 'taluk' => 'Tiruchirappalli', 'pincode' => '620018'],
    'kk nagar madurai' => ['locality' => 'KK Nagar', 'city' => 'Madurai', 'district' => 'Madurai', 'taluk' => 'Madurai North', 'pincode' => '625020'],
    'fairlands'        => ['locality' => 'Fairlands', 'city' => 'Salem', 'district' => 'Salem', 'taluk' => 'Salem', 'pincode' => '636016'],
    'perundurai'       => ['locality' => 'Perundurai', 'city' => 'Erode', 'district' => 'Erode', 'taluk' => 'Perundurai', 'pincode' => '638011']
];

// Helper to sanitize and normalize Tamil Nadu district names
function normalizeDistrictName(string $rawDistrict, string $division = '', string $pincode = ''): string {
    $clean = trim($rawDistrict);
    $divClean = trim($division);

    // Bifurcated district special-case for Chengalpattu / Kanchipuram
    if (strcasecmp($clean, 'Kanchipuram') === 0 || strcasecmp($clean, 'Kancheepuram') === 0) {
        if (strcasecmp($divClean, 'Chengalpattu') === 0 || strcasecmp($divClean, 'Tambaram') === 0) {
            return 'Chengalpattu';
        }
        $pinNum = (int)$pincode;
        if ($pinNum >= 603001 && $pinNum <= 603406) {
            return 'Chengalpattu';
        }
    }

    if (strcasecmp($clean, 'Kancheepuram') === 0) return 'Kanchipuram';
    if (strcasecmp($clean, 'Kanniyakumari') === 0) return 'Kanyakumari';
    if (strcasecmp($clean, 'Thoothukkudi') === 0) return 'Thoothukudi';
    if (strcasecmp($clean, 'Villuppuram') === 0) return 'Villupuram';
    if (strcasecmp($clean, 'Thiruvallur') === 0) return 'Tiruvallur';
    if (strcasecmp($clean, 'Thiruvarur') === 0) return 'Tiruvarur';

    return $clean;
}

// =============================================================================
// ACTION 1: PINCODE LOOKUP
// =============================================================================
if ($action === 'pincode') {
    $rawPin = trim((string)($_GET['pincode'] ?? ''));
    $pincode = preg_replace('/\D/', '', $rawPin);

    if (strlen($pincode) !== 6) {
        Response::success(null, 'Pincode must be exactly 6 digits');
    }

    // 1. Check instant curated reference first
    if (isset($curatedPostalHubs[$pincode])) {
        $curated = $curatedPostalHubs[$pincode];
        Response::success([
            'pincode'    => $pincode,
            'district'   => $curated['district'],
            'city'       => $curated['city'],
            'taluk'      => $curated['taluk'],
            'state'      => 'Tamil Nadu',
            'localities' => $curated['localities'],
            'source'     => 'curated_master'
        ], 'Pincode resolved');
    }

    // 2. Query India Post Public API with fallback
    $apiRes = false;
    $apiUrl = "https://api.postalpincode.in/pincode/{$pincode}";

    try {
        if (function_exists('curl_init')) {
            $ch = curl_init($apiUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 3);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 2);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_USERAGENT, 'MannidamPostalResolver/1.0');
            $apiRes = curl_exec($ch);
            curl_close($ch);
        } else {
            $ctx = stream_context_create([
                'http' => [
                    'method' => 'GET',
                    'timeout' => 3,
                    'header' => "User-Agent: MannidamPostalResolver/1.0\r\n"
                ],
                'ssl' => [
                    'verify_peer' => false,
                    'verify_peer_name' => false
                ]
            ]);
            $apiRes = @file_get_contents($apiUrl, false, $ctx);
        }
    } catch (\Throwable $e) {
        $apiRes = false;
    }

    if ($apiRes) {
        $decoded = json_decode((string)$apiRes, true);
        if (is_array($decoded) && isset($decoded[0]['Status']) && $decoded[0]['Status'] === 'Success' && !empty($decoded[0]['PostOffice'])) {
            $postOffices = $decoded[0]['PostOffice'];
            $first = $postOffices[0];

            $rawDistrict = trim((string)($first['District'] ?? ''));
            $division = trim((string)($first['Division'] ?? ''));
            $block = trim((string)($first['Block'] ?? ''));
            $state = trim((string)($first['State'] ?? 'Tamil Nadu'));

            $district = normalizeDistrictName($rawDistrict, $division, $pincode);
            $taluk = $block !== '' && strcasecmp($block, 'NA') !== 0 ? $block : ($division !== '' ? $division : $district);

            // Determine City
            $city = $district;
            if (str_starts_with($pincode, '600')) {
                $city = 'Chennai';
            } elseif (str_starts_with($pincode, '603')) {
                $city = $district === 'Chennai' ? 'Chennai' : 'Chengalpattu';
            }

            // Extract all post offices / localities
            $localities = [];
            foreach ($postOffices as $po) {
                $name = trim((string)($po['Name'] ?? ''));
                if ($name !== '' && !in_array($name, $localities, true)) {
                    $localities[] = $name;
                }
            }

            Response::success([
                'pincode'    => $pincode,
                'district'   => $district,
                'city'       => $city,
                'taluk'      => $taluk,
                'state'      => $state,
                'localities' => $localities,
                'source'     => 'india_post_live'
            ], 'Pincode resolved');
        }
    }

    // 3. Fallback based on Tamil Nadu postal prefix heuristics
    $prefix = substr($pincode, 0, 3);
    $heuristicMap = [
        '600' => ['district' => 'Chennai', 'city' => 'Chennai', 'taluk' => 'Chennai'],
        '601' => ['district' => 'Tiruvallur', 'city' => 'Tiruvallur', 'taluk' => 'Ponneri'],
        '602' => ['district' => 'Tiruvallur', 'city' => 'Tiruvallur', 'taluk' => 'Tiruvallur'],
        '603' => ['district' => 'Chengalpattu', 'city' => 'Chengalpattu', 'taluk' => 'Chengalpattu'],
        '604' => ['district' => 'Villupuram', 'city' => 'Villupuram', 'taluk' => 'Tindivanam'],
        '605' => ['district' => 'Villupuram', 'city' => 'Villupuram', 'taluk' => 'Villupuram'],
        '606' => ['district' => 'Tiruvannamalai', 'city' => 'Tiruvannamalai', 'taluk' => 'Tiruvannamalai'],
        '607' => ['district' => 'Cuddalore', 'city' => 'Cuddalore', 'taluk' => 'Cuddalore'],
        '608' => ['district' => 'Cuddalore', 'city' => 'Cuddalore', 'taluk' => 'Chidambaram'],
        '613' => ['district' => 'Thanjavur', 'city' => 'Thanjavur', 'taluk' => 'Thanjavur'],
        '620' => ['district' => 'Tiruchirappalli', 'city' => 'Tiruchirappalli', 'taluk' => 'Tiruchirappalli'],
        '621' => ['district' => 'Perambalur', 'city' => 'Perambalur', 'taluk' => 'Perambalur'],
        '622' => ['district' => 'Pudukkottai', 'city' => 'Pudukkottai', 'taluk' => 'Pudukkottai'],
        '624' => ['district' => 'Dindigul', 'city' => 'Dindigul', 'taluk' => 'Dindigul'],
        '625' => ['district' => 'Madurai', 'city' => 'Madurai', 'taluk' => 'Madurai'],
        '626' => ['district' => 'Virudhunagar', 'city' => 'Virudhunagar', 'taluk' => 'Virudhunagar'],
        '627' => ['district' => 'Tirunelveli', 'city' => 'Tirunelveli', 'taluk' => 'Tirunelveli'],
        '628' => ['district' => 'Thoothukudi', 'city' => 'Thoothukudi', 'taluk' => 'Thoothukudi'],
        '629' => ['district' => 'Kanyakumari', 'city' => 'Kanyakumari', 'taluk' => 'Agastheeswaram'],
        '630' => ['district' => 'Sivagangai', 'city' => 'Sivagangai', 'taluk' => 'Karaikudi'],
        '631' => ['district' => 'Kanchipuram', 'city' => 'Kanchipuram', 'taluk' => 'Kanchipuram'],
        '632' => ['district' => 'Vellore', 'city' => 'Vellore', 'taluk' => 'Vellore'],
        '635' => ['district' => 'Krishnagiri', 'city' => 'Krishnagiri', 'taluk' => 'Hosur'],
        '636' => ['district' => 'Salem', 'city' => 'Salem', 'taluk' => 'Salem'],
        '637' => ['district' => 'Namakkal', 'city' => 'Namakkal', 'taluk' => 'Namakkal'],
        '638' => ['district' => 'Erode', 'city' => 'Erode', 'taluk' => 'Erode'],
        '641' => ['district' => 'Coimbatore', 'city' => 'Coimbatore', 'taluk' => 'Coimbatore South'],
        '642' => ['district' => 'Coimbatore', 'city' => 'Coimbatore', 'taluk' => 'Pollachi']
    ];

    if (isset($heuristicMap[$prefix])) {
        $heu = $heuristicMap[$prefix];
        Response::success([
            'pincode'    => $pincode,
            'district'   => $heu['district'],
            'city'       => $heu['city'],
            'taluk'      => $heu['taluk'],
            'state'      => 'Tamil Nadu',
            'localities' => [],
            'source'     => 'regional_prefix'
        ], 'Pincode resolved');
    }

    Response::success(null, 'Pincode not found');
}

// =============================================================================
// ACTION 2: LOCALITY / AREA LOOKUP
// =============================================================================
if ($action === 'locality') {
    $q = trim((string)($_GET['q'] ?? $_GET['query'] ?? ''));
    $filterPin = preg_replace('/\D/', '', trim((string)($_GET['pincode'] ?? '')));
    $filterDist = trim((string)($_GET['district'] ?? ''));

    if (strlen($q) < 2) {
        Response::success([], 'Query too short');
    }

    $results = [];
    $seen = [];
    $lowerQ = strtolower($q);

    // =========================================================================
    // BRANCH A: PINCODE-SPECIFIC LOOKUP (STRICT PIN CONFINEMENT)
    // When a 6-digit PIN is provided, only return localities that belong to that PIN.
    // =========================================================================
    if (strlen($filterPin) === 6) {
        $pinLocalities = [];
        $pinDistrict = 'Chennai';
        $pinCity = 'Chennai';
        $pinTaluk = 'Chennai';

        // 1. Check curated master
        if (isset($curatedPostalHubs[$filterPin])) {
            $hub = $curatedPostalHubs[$filterPin];
            $pinLocalities = $hub['localities'];
            $pinDistrict = $hub['district'];
            $pinCity = $hub['city'];
            $pinTaluk = $hub['taluk'];
        } else {
            // 2. Fallback to India Post API for dynamic postal lookup
            $apiUrl = "https://api.postalpincode.in/pincode/{$filterPin}";
            $apiRes = false;
            try {
                if (function_exists('curl_init')) {
                    $ch = curl_init($apiUrl);
                    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                    curl_setopt($ch, CURLOPT_TIMEOUT, 3);
                    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                    curl_setopt($ch, CURLOPT_USERAGENT, 'MannidamPostalResolver/1.0');
                    $apiRes = curl_exec($ch);
                    curl_close($ch);
                } else {
                    $ctx = stream_context_create([
                        'http' => ['method' => 'GET', 'timeout' => 3, 'header' => "User-Agent: MannidamPostalResolver/1.0\r\n"],
                        'ssl' => ['verify_peer' => false, 'verify_peer_name' => false]
                    ]);
                    $apiRes = @file_get_contents($apiUrl, false, $ctx);
                }
            } catch (\Throwable $e) {}

            if ($apiRes) {
                $dec = json_decode((string)$apiRes, true);
                if (is_array($dec) && isset($dec[0]['Status']) && $dec[0]['Status'] === 'Success' && !empty($dec[0]['PostOffice'])) {
                    $first = $dec[0]['PostOffice'][0];
                    $pinDistrict = normalizeDistrictName((string)($first['District'] ?? ''), (string)($first['Division'] ?? ''), $filterPin);
                    $pinCity = $pinDistrict === 'Tiruvallur' && str_starts_with($filterPin, '600') ? 'Chennai' : $pinDistrict;
                    $pinTaluk = (string)($first['Block'] ?? $pinDistrict);
                    foreach ($dec[0]['PostOffice'] as $po) {
                        $nm = trim((string)($po['Name'] ?? ''));
                        if ($nm !== '' && !in_array($nm, $pinLocalities, true)) {
                            $pinLocalities[] = $nm;
                        }
                    }
                }
            }
        }

        // Filter localities matching $q strictly under this PIN
        foreach ($pinLocalities as $pLoc) {
            if ($q === '' || str_contains(strtolower($pLoc), $lowerQ)) {
                $results[] = [
                    'locality' => $pLoc,
                    'district' => $pinDistrict,
                    'city'     => $pinCity,
                    'taluk'    => $pinTaluk,
                    'pincode'  => $filterPin,
                    'source'   => 'pin_strict'
                ];
            }
        }

        Response::success($results, 'Pincode-filtered localities');
    }

    // =========================================================================
    // BRANCH B: GENERAL LOCALITY SEARCH (Optionally filtered by District)
    // =========================================================================
    // 1. Check curated directory first (prioritize exact and prefix matches)
    foreach ($curatedLocalityDirectory as $key => $info) {
        if ($filterDist !== '' && strcasecmp($info['district'], $filterDist) !== 0 && strcasecmp($info['city'], $filterDist) !== 0) {
            continue;
        }

        // Match exact or starts_with first
        if (str_starts_with($key, $lowerQ) || str_starts_with(strtolower($info['locality']), $lowerQ) || str_contains($key, $lowerQ)) {
            $dedupKey = strtolower($info['locality'] . '|' . $info['district']);
            if (!isset($seen[$dedupKey])) {
                $seen[$dedupKey] = true;
                $results[] = [
                    'locality' => $info['locality'],
                    'district' => $info['district'],
                    'city'     => $info['city'],
                    'taluk'    => $info['taluk'] ?? $info['district'],
                    'pincode'  => $info['pincode'],
                    'source'   => 'curated'
                ];
            }
        }
    }

    // 2. Query distinct localities from MySQL `projects` table (filtered by district if specified)
    try {
        $db = (new Database())->getConnection();
        if ($filterDist !== '') {
            $stmt = $db->prepare("
                SELECT
                    TRIM(locality) AS locality,
                    MAX(city) AS city,
                    MAX(district) AS district,
                    COUNT(*) AS projectCount
                FROM projects
                WHERE locality IS NOT NULL AND TRIM(locality) <> ''
                  AND (LOWER(TRIM(district)) = LOWER(?) OR LOWER(TRIM(city)) = LOWER(?))
                  AND (LOWER(locality) = LOWER(?) OR LOWER(locality) LIKE LOWER(?) OR LOWER(locality) LIKE LOWER(?))
                  AND (status = 'published' OR status IS NULL)
                GROUP BY TRIM(locality)
                ORDER BY
                    (CASE 
                        WHEN LOWER(TRIM(locality)) = LOWER(?) THEN 0
                        WHEN LOWER(TRIM(locality)) LIKE LOWER(?) THEN 1
                        WHEN LOWER(TRIM(locality)) LIKE LOWER(?) THEN 2
                        ELSE 3
                     END),
                    projectCount DESC,
                    locality ASC
                LIMIT 15
            ");
            $exactPrefix = $q . '%';
            $likeWord = '% ' . $q . '%';
            $stmt->execute([$filterDist, $filterDist, $q, $exactPrefix, $likeWord, $q, $exactPrefix, $likeWord]);
        } else {
            $stmt = $db->prepare("
                SELECT
                    TRIM(locality) AS locality,
                    MAX(city) AS city,
                    MAX(district) AS district,
                    COUNT(*) AS projectCount
                FROM projects
                WHERE locality IS NOT NULL AND TRIM(locality) <> ''
                  AND (LOWER(locality) = LOWER(?) OR LOWER(locality) LIKE LOWER(?) OR LOWER(locality) LIKE LOWER(?))
                  AND (status = 'published' OR status IS NULL)
                GROUP BY TRIM(locality)
                ORDER BY
                    (CASE 
                        WHEN LOWER(TRIM(locality)) = LOWER(?) THEN 0
                        WHEN LOWER(TRIM(locality)) LIKE LOWER(?) THEN 1
                        WHEN LOWER(TRIM(locality)) LIKE LOWER(?) THEN 2
                        ELSE 3
                     END),
                    projectCount DESC,
                    locality ASC
                LIMIT 15
            ");
            $exactPrefix = $q . '%';
            $likeWord = '% ' . $q . '%';
            $stmt->execute([$q, $exactPrefix, $likeWord, $q, $exactPrefix, $likeWord]);
        }

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rows as $r) {
            $loc = trim((string)$r['locality']);
            $dist = trim((string)($r['district'] ?: 'Chengalpattu'));
            $city = trim((string)($r['city'] ?: $dist));
            $dedupKey = strtolower($loc . '|' . $dist);

            if (!isset($seen[$dedupKey])) {
                $seen[$dedupKey] = true;

                // Attempt to resolve known pincode from curated directory only if district matches or exact locality
                $matchedPin = '';
                $cleanKey = strtolower($loc);
                foreach ($curatedLocalityDirectory as $ck => $cv) {
                    if (strcasecmp($cleanKey, $ck) === 0 || (str_starts_with($cleanKey, $ck) && strcasecmp($dist, $cv['district']) === 0)) {
                        $matchedPin = $cv['pincode'];
                        break;
                    }
                }

                $results[] = [
                    'locality'     => $loc,
                    'district'     => $dist,
                    'city'         => $city,
                    'taluk'        => $dist,
                    'pincode'      => $matchedPin,
                    'projectCount' => (int)$r['projectCount'],
                    'source'       => 'projects_db'
                ];
            }
        }
    } catch (\Throwable $e) {
        // Continue with whatever matches we have
    }

    Response::success(array_slice($results, 0, 12), 'Locality suggestions retrieved');
}

Response::error('Invalid action requested', 400);
