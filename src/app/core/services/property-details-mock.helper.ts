import { 
  Property, 
  ApartmentDetails, 
  PlotDetails, 
  VillaDetails, 
  CommercialDetails, 
  FloorPlanItem, 
  AmenityItem, 
  ConnectivityItem, 
  NeighborhoodScore, 
  DeveloperProfile, 
  CadastralAudit, 
  FaqItem 
} from '../models/property.model';

export function enrichPropertyWithMockDetails(prop: Property): Property {
  // If already populated, return as is
  if (prop.developer && prop.floorPlans && prop.floorPlans.length) {
    return prop;
  }

  const isPlot = prop.propertyType === 'Gated CMDA Plots';
  const isVilla = prop.propertyType === 'Independent Villas';
  const isPenthouse = prop.propertyType === 'Luxury Penthouses';
  const isCommercial = prop.propertyType === 'Commercial Spaces';
  const isApartment = prop.propertyType === 'Apartments & Flats' || isPenthouse;

  // 1. Developer Profile
  let devProfile: DeveloperProfile;
  if (prop.cityKey === 'delhi-ncr') {
    devProfile = {
      name: 'Experion Developers',
      establishedYear: '2006',
      projectsCompleted: '14 Landmark Developments',
      deliveredSqFt: '9.2 Million sq.ft Delivered',
      onTimeTrack: '98.5% On-Time Delivery Record',
      aboutText: 'Experion is a 100% FDI funded real estate developer backed by Experion Holdings Pte. Ltd, Singapore. With iconic projects along Golf Course Road, Dwarka Expressway, and Southern Peripheral Road, Experion stands for Singaporean engineering precision, IGBC Platinum architectural standards, and transparent cadastral governance.',
      corporateOffice: 'Experion Centre, Sector 32, Gurugram, Haryana'
    };
  } else if (prop.cityKey === 'chennai') {
    devProfile = {
      name: 'Mannidam Architectural Enclaves',
      establishedYear: '2011',
      projectsCompleted: '28 CMDA/RERA Communities',
      deliveredSqFt: '5.8 Million sq.ft Delivered',
      onTimeTrack: '99.1% On-Time Cadastral Delivery',
      aboutText: 'Mannidam is South India’s premier architectural real estate collective. Pioneering 0% brokerage direct transactions and drone-verified cadastral deeds across Chennai, ECR, and OMR corridors, Mannidam curates heritage courtyards, CMDA sanctioned enclaves, and sustainable coastal sanctuaries.',
      corporateOffice: 'Mannidam Chambers, Cenotaph Road, Teynampet, Chennai'
    };
  } else if (prop.cityKey === 'bengaluru') {
    devProfile = {
      name: 'Sovereign Terra Infrastructure',
      establishedYear: '2008',
      projectsCompleted: '22 Tech Corridor Estates',
      deliveredSqFt: '7.4 Million sq.ft Delivered',
      onTimeTrack: '97.8% On-Time Completion',
      aboutText: 'Sovereign Terra specializes in biophilic luxury estates, courtyard villas, and low-density luxury high-rises along Sarjapur, Whitefield, and Hebbal economic corridors, combining private forest retreats with global smart-home automation.',
      corporateOffice: 'Terra Towers, Outer Ring Road, Bellandur, Bengaluru'
    };
  } else {
    devProfile = {
      name: 'Vanguard Realty & Heritage Trust',
      establishedYear: '2004',
      projectsCompleted: '31 Flagship Assets',
      deliveredSqFt: '11.2 Million sq.ft Delivered',
      onTimeTrack: '98.9% On-Time Completion',
      aboutText: 'Vanguard is a trusted institution in high-value metropolitan assets, certified zero-brokerage registries, and sustainable grade-A engineering across Mumbai, Hyderabad, and Tier-1 growth corridors.',
      corporateOffice: 'Vanguard Financial Centre, BKC, Mumbai'
    };
  }

  // 2. Project Status & Timelines
  const possessionDate = isPlot 
    ? 'Immediate Registration & Patta Handover' 
    : isVilla 
      ? 'Ready to Move • Immediate SRO Registry' 
      : isCommercial
        ? 'Pre-Leased Operational • Immediate Yield'
        : 'Ready for Fitouts / Q4 2026';

  const projectStatus = isPlot ? 'Ready to Register' : (prop.highlights.some(h => h.includes('Ready')) ? 'Ready to Move' : 'Under Construction (85% Completed)');
  const totalLandParcel = isPlot ? '18.4 Acres Master Enclave' : isVilla ? '9.6 Acres Gated Enclave' : isCommercial ? '4.2 Acres Tech Park' : '12.5 Acres Luxury Enclave';
  const totalUnits = isPlot ? '142 Sanctioned Villa Plots' : isVilla ? '48 Exclusive Courtyard Villas' : isCommercial ? '18 Corporate Strata Units' : '240 Bespoke Sky Mansions';

  // 3. Dynamic Type-Specific Factsheets
  let apartmentDetails: ApartmentDetails | undefined;
  let plotDetails: PlotDetails | undefined;
  let villaDetails: VillaDetails | undefined;
  let commercialDetails: CommercialDetails | undefined;

  if (isPlot) {
    plotDetails = {
      layoutSanctionNo: 'CMDA / PPD / L.O. No. 54/2024 & DTCP Approved',
      reraLayoutNo: 'TN/01/Layout/0284/2024 (State Certified)',
      frontageRoadWidth: '60 ft Primary Boulevard & 40 ft Tree-Lined Avenues',
      waterTableDepth: '28 ft Depth Sweet Potable Water (Tested TDS: 140 ppm)',
      soilBearingCapacity: 'SBC 240 kN/m² Hard Gravelly Red Soil (Safe G+3 Load)',
      fsiPermissible: 'FSI 2.0 (Permissible built-up up to 2× plot extent under Master Plan)',
      ebSubstation: 'Dedicated 11 kV Underground Transformer with 3-Phase Cabling',
      boundaryWall: '8 ft Reinforced Perimeter Compound Wall with Solar Security Fencing',
      drainageSystem: 'Subsurface Storm Water Culverts + Sewage Treatment Plant (STP) Mains',
      pattaStatus: 'Clear Sub-Divided Revenue Patta Ready for Direct Deed Execution',
      dimensionRanges: '30×40 (1,200 sq.ft), 40×60 (2,400 sq.ft) & 50×72 (3,600 sq.ft)'
    };
  } else if (isVilla) {
    villaDetails = {
      landExtent: '3,600 sq.ft (40 ft × 90 ft Freehold Deed)',
      builtUpArea: '4,800 sq.ft (G+2 Reinforced Structural Slab)',
      carpetArea: '3,920 sq.ft (Exclusive Usable Indoor Extent)',
      privatePool: '28 ft × 12 ft Glass-Edge Mosaic Infinity Lap Pool with Wooden Deck',
      courtyardGarden: '1,400 sq.ft Open-to-Sky Central Traditional Courtyard & Zen Pond',
      solarMicrogrid: '7.5 kW Rooftop On-Grid Solar Photovoltaic Plant with Net-Metering',
      waterAutonomy: '15,000L Underground RCC Sump + Rainwater Percolation Bore Recharge',
      vastuOrientation: '100% East-Facing Main Gateway with North-East Dhyana/Pooja Alcove',
      privateElevator: 'Hydraulic Glass Panoramic Elevator Serving Ground, First & Terrace',
      carPortico: 'Triple-Car Covered Automated Garage with 2× 11kW EV Wallbox Fast-Chargers'
    };
  } else if (isCommercial) {
    commercialDetails = {
      efficiencyRatio: '82% Super-to-Carpet Area Efficiency (Grade-A Standard)',
      rentalYield: '8.4% Net Annual ROI with 9-Year Corporate Registered Lease',
      leaseTerms: '3-Year Minimum Lock-In with 15% Escalation Every 3 Years',
      monthlyRental: '₹14.50 Lakh / Month Direct Bank Escrow Credit',
      powerRedundancy: '100% DG Power Backup with N+1 Redundancy & Dual 33 kV Feeders',
      elevators: '6 High-Speed Mitsubishi Elevators (2.5 m/s) with Destination Dispatch',
      hvacSpecs: 'Centralized Water-Cooled Chiller Plant with Individual Floor AHUs',
      floorPlateSize: '18,500 sq.ft Contiguous Grade-A Floor Plate'
    };
  } else {
    // Default: Apartment / Flat / Penthouse
    apartmentDetails = {
      towerCount: '4 Iconic High-Rise Towers (G+32 Floors)',
      totalFloors: 'Ground + 32 Storeys with Double-Height Grand Stilt Lobby',
      unitsPerCore: 'Ultra-Low Density: Only 2 Bespoke Apartments Per Core with Private Elevators',
      ceilingHeight: '11.5 ft Clear Slab-to-Slab Height with Acoustic Double-Glazed Fenestration',
      balconyDeck: '8 ft Continuous Wraparound Running Sundeck with Frameless Toughened Glass',
      hvacSystem: 'Daikin VRV/VRF Central Ducted Inverter AC with MERV-13 Fresh Air Filters',
      flooringSpecs: 'Imported Italian Statuario Marble in Living/Dining; Engineered German Oak in Bedrooms',
      kitchenFittings: 'German Poggenpohl/Häfele Modular Kitchen with Piped Gas & Quartz Island',
      parkingBays: '2 Covered Reserved Basement Stilt Parking Bays with Dedicated 11 kW EV Charger',
      clubhouseSize: '50,000 sq.ft Clubhouse with Heated Indoor Pool, Bowling Alley & Sky Lounge',
      maintenanceFee: '₹4.50 / sq.ft / Month (Managed by Global Facilities Audit)'
    };
  }

  // 4. Floor Plans (100acress Style)
  let floorPlans: FloorPlanItem[] = [];
  if (isPlot) {
    floorPlans = [
      {
        id: 'fp-plot-1',
        name: 'Standard Villa Plot (30×40)',
        type: 'Plot Layout',
        superArea: '1,200 sq.ft',
        carpetArea: '1,200 sq.ft (100% Boundary Extent)',
        priceEstimate: '₹42.50 Lakh',
        imageUrl: 'https://images.unsplash.com/photo-1524813686514-a57563d77d66?auto=format&fit=crop&w=1200&q=80',
        dimensions: {
          'Frontage Width': '30 Feet',
          'Plot Depth': '40 Feet',
          'Facing Road': '40 ft Tree-Lined Avenue',
          'Permissible Built-up': 'Up to 2,400 sq.ft (G+2)',
          'Orientation': 'North / East Facing Available'
        }
      },
      {
        id: 'fp-plot-2',
        name: 'Executive Corner Plot (40×60)',
        type: 'Plot Layout',
        superArea: '2,400 sq.ft',
        carpetArea: '2,400 sq.ft (Dual Road Corner)',
        priceEstimate: '₹85.00 Lakh',
        imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
        dimensions: {
          'Frontage Width': '40 Feet',
          'Plot Depth': '60 Feet',
          'Facing Road': '60 ft Main Boulevard Corner',
          'Permissible Built-up': 'Up to 4,800 sq.ft (Stilt + 3)',
          'Orientation': 'East & North Dual Corner'
        }
      },
      {
        id: 'fp-plot-3',
        name: 'Grand Estate Plot (50×72)',
        type: 'Plot Layout',
        superArea: '3,600 sq.ft',
        carpetArea: '3,600 sq.ft (Luxury Enclave)',
        priceEstimate: '₹1.28 Cr',
        imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
        dimensions: {
          'Frontage Width': '50 Feet',
          'Plot Depth': '72 Feet',
          'Facing Road': '60 ft Avenue with Central Median',
          'Permissible Built-up': 'Up to 7,200 sq.ft Luxury Mansion',
          'Orientation': '100% East Facing'
        }
      }
    ];
  } else if (isVilla) {
    floorPlans = [
      {
        id: 'fp-villa-ground',
        name: 'Ground Floor Plan • Living & Pool Courtyard',
        type: 'Independent Villa',
        superArea: '2,400 sq.ft (Level 0)',
        carpetArea: '1,980 sq.ft Indoor + 800 sq.ft Garden Deck',
        priceEstimate: '₹1.45 Cr (Included in Villa Valuation)',
        imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
        dimensions: {
          'Grand Living & Dining': '26 ft × 18 ft (Double Height)',
          'Showcase Italian Kitchen': '16 ft × 12 ft',
          'Guest Suite 1': '16 ft × 14 ft + Ensuite',
          'Private Lap Pool': '28 ft × 12 ft',
          'Central Green Courtyard': '20 ft × 18 ft',
          'Covered Car Garage': '20 ft × 18 ft (2-3 Cars)'
        }
      },
      {
        id: 'fp-villa-first',
        name: 'First Floor Plan • Family Lounge & Master Suites',
        type: 'Independent Villa',
        superArea: '1,800 sq.ft (Level 1)',
        carpetArea: '1,490 sq.ft Indoor',
        priceEstimate: 'Part of G+2 Master Deed',
        imageUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
        dimensions: {
          'Presidential Master Suite': '22 ft × 16 ft + Walk-in Wardrobe',
          'Master Spa Bathroom': '14 ft × 10 ft with Freestanding Tub',
          'Bedrooms 2 & 3': '15 ft × 14 ft with Private Balconies',
          'Bridge Walkway / Lounge': '18 ft × 12 ft Overlooking Courtyard'
        }
      },
      {
        id: 'fp-villa-terrace',
        name: 'Terrace Level • Sky Lounge & Solar Deck',
        type: 'Independent Villa',
        superArea: '600 sq.ft Enclosed + 1,200 sq.ft Open Sky Terrace',
        carpetArea: '520 sq.ft',
        priceEstimate: 'Part of G+2 Master Deed',
        imageUrl: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80',
        dimensions: {
          'Entertainment Sky Room': '18 ft × 14 ft',
          'Barbeque Gazebo': '16 ft × 14 ft Timber Deck',
          'Solar Canopy': '7.5 kW Rooftop Solar Array'
        }
      }
    ];
  } else if (isCommercial) {
    floorPlans = [
      {
        id: 'fp-comm-1',
        name: 'Typical Grade-A High-Efficiency Core Floorplate',
        type: 'Commercial Office',
        superArea: '18,500 sq.ft',
        carpetArea: '15,170 sq.ft (82% Efficiency)',
        priceEstimate: '₹14.50 Cr',
        imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
        dimensions: {
          'Central Elevator Core': '6 High-Speed Passenger + 2 Service Lifts',
          'Open Workstation Bays': 'Accommodates 180–220 Tech Seats',
          'Executive Boardrooms': '2 Large 24-Seater AV Suites',
          'Column Grid': '11m × 11m Wide Span Column Spacing'
        }
      }
    ];
  } else {
    // Apartments & Penthouses (Experion One 42 style)
    floorPlans = [
      {
        id: 'fp-apt-3bhk',
        name: '3 BHK + Lounge + Servant Residence',
        type: 'Luxury Apartment',
        superArea: '2,450 sq.ft',
        carpetArea: '1,820 sq.ft + 280 sq.ft Running Deck',
        priceEstimate: '₹1.85 Cr',
        imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
        dimensions: {
          'Living & Dining Room': '24 ft × 16 ft with Floor-to-Ceiling Glazing',
          'Continuous Balcony Deck': '8 ft Deep × 32 ft Running Panoramic Deck',
          'Master Bedroom Suite': '18 ft × 14 ft + Walk-in Dresser',
          'Bedrooms 2 & 3': '15 ft × 13 ft with Ensuite Bathrooms',
          'Gourmet Kitchen': '14 ft × 11 ft + Separate Utility Balcony',
          'Staff Quarters': 'Dedicated Room with Separate Service Entry'
        }
      },
      {
        id: 'fp-apt-4bhk',
        name: '4 BHK + Family Lounge + Double Deck Mansion',
        type: 'Ultra-Luxury Apartment',
        superArea: '3,200 sq.ft',
        carpetArea: '2,420 sq.ft + 380 sq.ft Double Sundeck',
        priceEstimate: '₹2.45 Cr',
        imageUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
        dimensions: {
          'Grand Formal Living': '28 ft × 18 ft Corner Aspect',
          'Informal Family Lounge': '16 ft × 14 ft',
          'Presidential Master Suite': '20 ft × 16 ft + Private Sundeck',
          'Junior Master Suites': '3 Bedrooms (16×14 ft each)',
          'Dry & Wet Kitchen': 'Separate Chef Kitchen + Scullery',
          'Private Elevator Foyer': 'Exclusive Lift Landing Directly into Apartment'
        }
      },
      {
        id: 'fp-apt-penthouse',
        name: 'Duplex Sky Villa Penthouse with Private Jacuzzi',
        type: 'Duplex Penthouse',
        superArea: '5,400 sq.ft',
        carpetArea: '4,150 sq.ft + 900 sq.ft Terrace Deck',
        priceEstimate: '₹4.90 Cr',
        imageUrl: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80',
        dimensions: {
          'Double-Height Great Room': '34 ft × 20 ft (22 ft Clear Ceiling)',
          'Private Terrace Jacuzzi Deck': '30 ft × 24 ft with Skyline Views',
          '5 En-suite Bedrooms': 'Complete Luxury Specifications',
          'Private Glass Elevator': 'Internal Hydraulic Lift Between Duplex Floors'
        }
      }
    ];
  }

  // 5. World-Class Amenities
  const amenitiesList: AmenityItem[] = isPlot
    ? [
        { name: '60 ft & 40 ft Blacktop Avenues', icon: 'add_road', category: 'sports', desc: 'Tree-lined wide arterial boulevards with storm water gutters' },
        { name: 'Underground EB & Utilities', icon: 'electrical_services', category: 'eco', desc: 'Concealed 3-phase cabling, no dangling wires, LED solar lighting' },
        { name: '24/7 Gated Security & Boom Barrier', icon: 'security', category: 'security', desc: 'CCTV surveillance, RFID boom barriers and security guards' },
        { name: 'Landscaped Botanical Park', icon: 'park', category: 'leisure', desc: '2 Acres themed garden, outdoor amphitheater and kids play zone' },
        { name: 'Potable Sweet Water Bore', icon: 'water_drop', category: 'eco', desc: 'Abundant ground water at 28 ft depth tested sweet drinking water' },
        { name: 'Open Air Fitness & Jogging Loop', icon: 'directions_run', category: 'sports', desc: '1.2 km synthetic walking track around perimeter green buffer' },
        { name: 'Rainwater Recharge Pits', icon: 'rainy', category: 'eco', desc: 'Percolation pits at every 50 meters preserving ground water table' },
        { name: 'Community Clubhouse & Sports Court', icon: 'sports_tennis', category: 'sports', desc: 'Multi-purpose clubhouse, badminton court and children pavilion' }
      ]
    : isVilla
    ? [
        { name: 'Private Infinity Lap Pool', icon: 'pool', category: 'leisure', desc: '28 ft glass-tile lap pool with mosaic waterfall and timber sundeck' },
        { name: 'Open-to-Sky Zen Courtyard', icon: 'yard', category: 'eco', desc: 'Traditional Chettinad-inspired central open courtyard with lily pond' },
        { name: '7.5 kW Solar Rooftop Microgrid', icon: 'solar_power', category: 'eco', desc: 'Zero-electricity bill solar net-metering on RCC terrace' },
        { name: 'In-Villa Glass Elevator', icon: 'elevator', category: 'leisure', desc: 'Private hydraulic elevator connecting all floors up to the terrace lounge' },
        { name: 'Triple Car Automated Garage', icon: 'garage', category: 'security', desc: 'Covered portico with motorized rolling shutter and 2× EV chargers' },
        { name: '15,000L Underground Water Sump', icon: 'water_bottle', category: 'eco', desc: 'Dedicated municipal water storage + dual booster pressure pumps' },
        { name: 'Smart Home Automation', icon: 'settings_remote', category: 'security', desc: 'Biometric locks, video door intercom and motorized curtain controls' },
        { name: 'Gated Township Club & Concierge', icon: 'hotel', category: 'leisure', desc: 'Access to 40,000 sq.ft township clubhouse, tennis and spa facilities' }
      ]
    : isCommercial
    ? [
        { name: '100% N+1 DG Power Backup', icon: 'power', category: 'eco', desc: 'Dual 33 kV substation feeders with automated uninterrupted backup' },
        { name: '6 High-Speed Destination Lifts', icon: 'elevator', category: 'sports', desc: 'Mitsubishi 2.5 m/s intelligent passenger elevators' },
        { name: 'Centralized Water-Cooled VRV', icon: 'mode_fan', category: 'eco', desc: 'Air handling units with MERV-13 air filtration and low decibel noise' },
        { name: 'NFPA 13 Fire Sprinkler Grid', icon: 'local_fire_department', category: 'security', desc: 'Addressable smoke detectors, pressurized fire exits and wet risers' },
        { name: 'Multi-Level Covered Parking', icon: 'local_parking', category: 'security', desc: 'Automated RFID visitor parking with 80+ reserved corporate bays' },
        { name: '24/7 Command Centre & Access Control', icon: 'security', category: 'security', desc: 'Baggage scanners, turnstiles, CCTV matrix and security staff' }
      ]
    : [
        { name: '50,000 sq.ft Grand Clubhouse', icon: 'roofing', category: 'leisure', desc: 'Multi-level experiential social hub with banquet hall, spa and private theater' },
        { name: 'Temperature-Controlled Indoor Pool', icon: 'pool', category: 'sports', desc: 'Olympic-size heated indoor lap pool plus rooftop infinity sky pool' },
        { name: 'Squash & Badminton Courts', icon: 'sports_tennis', category: 'sports', desc: 'Dual maple-wood indoor squash courts and floodlit tennis pavilion' },
        { name: 'Daikin VRV Air-Conditioning', icon: 'ac_unit', category: 'eco', desc: 'Central ducted air system with individual temperature zone controls' },
        { name: '82% Landscaped Open Forest Greens', icon: 'forest', category: 'eco', desc: 'Themed Japanese Zen garden, reflexology pathway and sensory park' },
        { name: 'Biometric Access & 5-Tier Security', icon: 'fingerprint', category: 'security', desc: 'Smart video door phone, smart card lift access and 24/7 security patrol' },
        { name: 'Dual EV Fast-Charging Bays', icon: 'ev_station', category: 'eco', desc: 'Dedicated 11 kW AC charging wallboxes at each covered car bay' },
        { name: 'High-Altitude Sky Lounge & Deck', icon: 'balcony', category: 'leisure', desc: '32nd floor observation deck with panoramic city skyline and star gazing lounge' }
      ];

  // 6. Strategic Connectivity (100acress Style)
  const connectivity: ConnectivityItem[] = [
    { title: 'Rapid Metro / Mass Transit Station', distance: '1.2 km', duration: '3 mins', category: 'transit', icon: 'subway' },
    { title: 'Expressway & Major Arterial Highway', distance: '800 m', duration: '2 mins', category: 'transit', icon: 'traffic' },
    { title: 'International Airport Hub', distance: '16.5 km', duration: '22 mins', category: 'transit', icon: 'flight' },
    { title: 'Cyber City & Grade-A IT SEZ Corridors', distance: '3.4 km', duration: '8 mins', category: 'business', icon: 'corporate_fare' },
    { title: 'Top-Tier International Schools', distance: '2.1 km', duration: '5 mins', category: 'education', icon: 'school' },
    { title: 'Multi-Speciality JCI Accredited Hospital', distance: '1.8 km', duration: '4 mins', category: 'healthcare', icon: 'local_hospital' },
    { title: 'Luxury Retail & Fine Dining Promenade', distance: '1.5 km', duration: '4 mins', category: 'lifestyle', icon: 'shopping_bag' }
  ];

  // 7. Neighborhood Scorecard (100acress Style)
  const neighborhoodScore: NeighborhoodScore = {
    overall: 9.4,
    connectivity: 9.8,
    lifestyle: 9.3,
    schoolsHealth: 9.6,
    greenCover: 9.1
  };

  // 8. Cadastral Due Diligence Audit
  const cadastralAudit: CadastralAudit = {
    surveyNumber: `Survey No. ${Math.floor(Math.random() * 400 + 100)}/${Math.floor(Math.random() * 8 + 1)}A`,
    sroJurisdiction: `${prop.locality} SRO (Sub-Registrar District Registry)`,
    ecStatus: 'Nil Encumbrance • 30-Year Continuous Clean Chain Title',
    pattaVerification: 'Revenue Department Digitized Patta #48102 (Clear & Verified)',
    reraRegNo: prop.badges.rera || 'RERA/REG/2024/991',
    circleRate: prop.pricePerSqFt
  };

  // 9. Frequently Asked Questions
  const faqs: FaqItem[] = [
    {
      q: `What is the exact regulatory sanction and RERA status of ${prop.title}?`,
      a: `This development is fully registered with State Regulatory authorities (RERA Registration: ${prop.badges.rera}) and sanctioned by municipal authorities (CMDA/DTCP/GHMC/DTCP/HARERA as applicable). The cadastral chain has been audited for 30 years with Nil Encumbrance.`
    },
    {
      q: 'How does the Zero Brokerage policy work on Mannidam?',
      a: 'Mannidam is a direct verified architectural registry. Buyers and investors pay ₹0 in brokerage fees. All inquiries, site visits, and coordinate surveys connect directly with authorized ownership dossiers without middleman markups.'
    },
    {
      q: 'How do the 4K Cinematic Walkthrough and Drone Media Points work?',
      a: `Standard high-resolution photos and verified cadastral factsheets are 100% free for everyone. To watch the full cinematic 4K interior walkthrough or aerial drone boundary scan, you can unlock lifetime access using ${prop.mediaPoints} Media Points (available via Razorpay from ₹100 for 2 points). Once unlocked, access remains permanent in your account.`
    },
    {
      q: `Are bank home loans and project approvals available for ${prop.title}?`,
      a: 'Yes, this property is pre-approved for mortgage and APF clearance by all premier lending institutions including SBI, HDFC Bank, ICICI Bank, Axis Bank, and Kotak Mahindra Bank with interest rates starting at 8.40%.'
    },
    {
      q: 'Can I schedule a physical on-site cadastral inspection?',
      a: 'Absolutely. You can request a physical survey visit directly through the concierge booking console on this page. Our surveyor desk will assign a relationship manager to guide you through boundary coordinates, structural fixtures, and revenue records.'
    }
  ];

  return {
    ...prop,
    developer: devProfile,
    possessionDate,
    projectStatus,
    totalLandParcel,
    totalUnits,
    apartmentDetails,
    plotDetails,
    villaDetails,
    commercialDetails,
    floorPlans,
    amenitiesList,
    connectivity,
    neighborhoodScore,
    cadastralAudit,
    faqs
  };
}
