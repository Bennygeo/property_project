export interface PropertyMasterData {
  // GROUP 1: PROJECT & LEGAL
  propertyId: string;
  projectName: string;
  developer: string;
  developerId: number | null;
  category: string;
  type: string;
  projectStage: string;
  projectStatus: string;
  launchDate: string;
  reraNumber: string;
  reraDetails: string;
  dtcpApproved: 'Yes' | 'No' | '';
  approvalAuthority: string;
  dtcpApprovalNo: string;
  approvalDate: string;
  pattaType: 'Individual Patta' | 'Chitta' | 'Promoter Patta' | 'Panchayat' | 'Not Available' | '';
  clearTitleAvailable: 'Yes' | 'No' | '';
  bankLoanApproved: 'Yes' | 'No' | '';
  brokerage: string;
  noBrokerage: 'Yes' | 'No' | '';
  featured: 'Yes' | 'No' | '';
  freeAccess: 'Yes' | 'No' | '';

  // GROUP 2: LOCATION
  areaLocation: string;
  villageLocality: string;
  city: string;
  taluk: string;
  district: string;
  pincode: string;
  gps: string;
  googleMapsLink: string;
  interactiveMap: string;

  // GROUP 3: PLOT DETAILS & MASTER EXTENT
  totalLayoutArea: string;
  totalPlots: number | null;
  totalUnits: string;
  unitsSold: string;
  plotNo: string;
  plotSizeSqft: number | null;
  plotSizeCents: number; // Auto-calculated (sq.ft / 435.6)
  minPlotSize: number | null;
  maxPlotSize: number | null;
  availablePlotSizes: string;
  dimension: string; // e.g. 30 x 40
  facing: 'North' | 'South' | 'East' | 'West' | 'North-East' | 'North-West' | 'South-East' | 'South-West' | '';
  cornerPlot: 'Yes' | 'No' | '';
  landUse: 'Residential' | 'Commercial' | 'Agricultural' | 'Mixed Use' | 'Industrial' | '';
  land_type?: string;
  landType?: string;
  pricePerSqft: number | null;
  totalPrice: number; // Auto-calculated (plotSizeSqft * pricePerSqft)
  priceFrom: number | null;
  priceTo: number | null;
  availability: 'Available' | 'Booked' | 'Sold' | 'Hold' | '';

  // GROUP 4: NEARBY FACILITIES & GROWTH HUBS
  corridor: 'IT Corridor' | 'OMR' | 'GST Road' | 'ECR' | 'Metro Corridor' | 'Industrial Corridor' | 'Highway Corridor' | 'None' | '';
  nearbyRoads: string;
  highwayName: string;
  highwayDistance: number | null;
  petrolBunkDistance: number | null;
  busStopDistance: number | null;
  railwayStationNearby: string;
  airportDistance: number | null;
  schoolsNearby: string;
  collegesNearby: string;
  hospitalNearby: string;
  employmentHubs: string;
  residentialDevelopment: string;
  infrastructureProjects: string;

  // GROUP 5: SUITABILITY
  suitedFor: 'Immediate Possession' | 'Investment' | 'Both' | '';
  possessionTimeline: string;

  // GROUP 6: INFRASTRUCTURE
  electricity: 'Available' | 'Nearby' | 'Not Available' | 'Applied' | '';
  electricityDetails: string;
  waterConnection: 'Available' | 'Nearby' | 'Not Available' | 'Applied' | '';
  waterDetails: string;
  drainageFacility: 'Underground' | 'Open Drain' | 'Septic Tank' | 'Not Available' | '';
  drainageDetails: string;
  roadWidthFt: number | null;
  roadWidth: string;
  roadType: 'Tar Road' | 'Concrete' | 'Gravel / Metal' | 'Mud Road' | '';
  internalRoads: string;
  streetLights: 'Yes' | 'No' | '';
  streetLightsDetails: string;
  compoundWallGated: 'Yes' | 'No' | '';
  securityDetails: string;
  park: 'Yes' | 'No' | '';
  parksDetails: string;
  otherAmenities: string;
  developerMaintenanceYears: number | null;

  // GROUP 7: RISK, CONTACT & MEDIA DOSSIER
  floodZone: 'No' | 'Low Risk' | 'Moderate' | 'High Risk' | '';
  waterloggingHistory: 'Yes' | 'No' | '';
  contactPersonPhone: string;
  whatsappNumber: string;
  coverImage: string;
  galleryUrls: string;
  videos: string;
  droneVideos: string;
  layoutPdf: string;
  brochure: string;
  remarks: string;
}

export const MASTER_CATEGORY_OPTIONS = [
  'Gated CMDA Plots',
  'DTCP Sanctioned Plots',
  'Commercial Spaces',
  'Farm Land & Estates',
  'Apartments & Flats',
  'Independent Villas'
] as const;

export const MASTER_TYPE_OPTIONS = [
  'Residential',
  'Commercial',
  'Agricultural',
  'Mixed Use',
  'Industrial'
] as const;

export const MASTER_PROJECT_STAGE_OPTIONS = [
  'Ready for Construction',
  'Ready to Register',
  'Under Development',
  'Pre-Launch',
  'Completed'
] as const;

export const MASTER_PROJECT_STATUS_OPTIONS = [
  'Active',
  'Selling Fast',
  'New Launch',
  'Sold Out'
] as const;

export const MASTER_APPROVAL_AUTHORITY_OPTIONS = [
  'DTCP / CMDA',
  'CMDA Approved',
  'DTCP Approved',
  'TNRERA Registered',
  'Panchayat Approved',
  'Freehold Patta'
] as const;

export const MASTER_YES_NO_OPTIONS = ['Yes', 'No'] as const;
export const MASTER_FACING_OPTIONS = [
  'North',
  'South',
  'East',
  'West',
  'North-East',
  'North-West',
  'South-East',
  'South-West'
] as const;

export const MASTER_PATTA_OPTIONS = [
  'Individual Patta',
  'Chitta',
  'Promoter Patta',
  'Panchayat',
  'Not Available'
] as const;

export const MASTER_LAND_USE_OPTIONS = [
  'Residential',
  'Commercial',
  'Agricultural',
  'Mixed Use',
  'Industrial'
] as const;

export const MASTER_AVAILABILITY_OPTIONS = [
  'Available',
  'Booked',
  'Sold',
  'Hold'
] as const;

export const MASTER_CORRIDOR_OPTIONS = [
  'IT Corridor',
  'OMR',
  'GST Road',
  'ECR',
  'Metro Corridor',
  'Industrial Corridor',
  'Highway Corridor',
  'None'
] as const;

export const MASTER_SUITED_FOR_OPTIONS = [
  'Immediate Possession',
  'Investment',
  'Both'
] as const;

export const MASTER_UTILITY_OPTIONS = [
  'Available',
  'Nearby',
  'Not Available',
  'Applied'
] as const;

export const MASTER_DRAINAGE_OPTIONS = [
  'Underground',
  'Open Drain',
  'Septic Tank',
  'Not Available'
] as const;

export const MASTER_ROAD_TYPE_OPTIONS = [
  'Tar Road',
  'Concrete',
  'Gravel / Metal',
  'Mud Road'
] as const;

export const MASTER_FLOOD_ZONE_OPTIONS = [
  'No',
  'Low Risk',
  'Moderate',
  'High Risk'
] as const;

export function generatePropertyId(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `PRJ-${num}`;
}

export function calculateCents(sqft: number | null): number {
  if (!sqft || sqft <= 0) return 0;
  return Math.round((sqft / 435.6) * 100) / 100;
}

export function calculateTotalPrice(sqft: number | null, ratePerSqft: number | null): number {
  if (!sqft || !ratePerSqft || sqft <= 0 || ratePerSqft <= 0) return 0;
  return Math.round(sqft * ratePerSqft);
}

export function createBlankMasterData(): PropertyMasterData {
  return {
    propertyId: generatePropertyId(),
    projectName: '',
    developer: '',
    developerId: null,
    category: 'Gated CMDA Plots',
    type: 'Residential',
    projectStage: 'Ready for Construction',
    projectStatus: 'Active',
    launchDate: '',
    reraNumber: '',
    reraDetails: '',
    dtcpApproved: '',
    approvalAuthority: 'DTCP / CMDA',
    dtcpApprovalNo: '',
    approvalDate: '',
    pattaType: '',
    clearTitleAvailable: '',
    bankLoanApproved: '',
    brokerage: '0% Direct SRO Deed',
    noBrokerage: 'Yes',
    featured: 'No',
    freeAccess: 'No',

    areaLocation: '',
    villageLocality: '',
    city: '',
    taluk: '',
    district: '',
    pincode: '',
    gps: '',
    googleMapsLink: '',
    interactiveMap: '',

    totalLayoutArea: '',
    totalPlots: null,
    totalUnits: '',
    unitsSold: '',
    plotNo: '',
    plotSizeSqft: null,
    plotSizeCents: 0,
    minPlotSize: null,
    maxPlotSize: null,
    availablePlotSizes: '',
    dimension: '',
    facing: '',
    cornerPlot: '',
    landUse: '',
    pricePerSqft: null,
    totalPrice: 0,
    priceFrom: null,
    priceTo: null,
    availability: 'Available',

    corridor: '',
    nearbyRoads: '',
    highwayName: '',
    highwayDistance: null,
    petrolBunkDistance: null,
    busStopDistance: null,
    railwayStationNearby: '',
    airportDistance: null,
    schoolsNearby: '',
    collegesNearby: '',
    hospitalNearby: '',
    employmentHubs: '',
    residentialDevelopment: '',
    infrastructureProjects: '',

    suitedFor: '',
    possessionTimeline: '',

    electricity: '',
    electricityDetails: 'EB 3-Phase Underground Cabling',
    waterConnection: '',
    waterDetails: 'Individual OHT Water Supply',
    drainageFacility: '',
    drainageDetails: 'Underground Stormwater Drainage',
    roadWidthFt: null,
    roadWidth: '30ft & 40ft Blacktop Roads',
    roadType: '',
    internalRoads: '40ft & 30ft Blacktop Tar',
    streetLights: '',
    streetLightsDetails: 'LED Avenue Lighting',
    compoundWallGated: '',
    securityDetails: '24x7 Boom Barrier Security',
    park: '',
    parksDetails: 'Landscaped Children Park & Walkway',
    otherAmenities: '',
    developerMaintenanceYears: null,

    floodZone: '',
    waterloggingHistory: '',
    contactPersonPhone: '',
    whatsappNumber: '9486140936',
    coverImage: '',
    galleryUrls: '',
    videos: '',
    droneVideos: '',
    layoutPdf: '',
    brochure: '',
    remarks: ''
  };
}

// Default master data starts blank so user/admin enters fresh project details
export function createDefaultMasterData(): PropertyMasterData {
  return createBlankMasterData();
}

export function createSampleMasterData(): PropertyMasterData {
  const id = generatePropertyId();
  const plotSqft = 1200;
  const rate = 3200;
  const total = calculateTotalPrice(plotSqft, rate);
  return {
    propertyId: id,
    projectName: 'Green Meadows Phase 2',
    developer: 'ABC Promoters Pvt Ltd',
    developerId: 1,
    category: 'Gated CMDA Plots',
    type: 'Residential',
    projectStage: 'Ready for Construction',
    projectStatus: 'Active',
    launchDate: '2026-01-15',
    reraNumber: 'TN/29/Layout/0123/2025',
    reraDetails: 'TNRERA Approved Phase 2 Layout',
    dtcpApproved: 'Yes',
    approvalAuthority: 'DTCP / CMDA',
    dtcpApprovalNo: 'LP/No.123/2025',
    approvalDate: '2025-11-20',
    pattaType: 'Individual Patta',
    clearTitleAvailable: 'Yes',
    bankLoanApproved: 'Yes',
    brokerage: '0% Direct SRO Deed',
    noBrokerage: 'Yes',
    featured: 'Yes',
    freeAccess: 'No',

    areaLocation: 'Guduvanchery',
    villageLocality: 'Nandivaram',
    city: 'Chennai',
    taluk: 'Chengalpattu',
    district: 'Chengalpattu',
    pincode: '603202',
    gps: '12.8436, 80.0601',
    googleMapsLink: 'https://maps.google.com/?q=12.8436,80.0601',
    interactiveMap: 'assets/secura-masterplan-3d.html',

    totalLayoutArea: '14.5 Acres',
    totalPlots: 120,
    totalUnits: '120 Plots',
    unitsSold: '42',
    plotNo: 'A-12',
    plotSizeSqft: plotSqft,
    plotSizeCents: calculateCents(plotSqft),
    minPlotSize: 800,
    maxPlotSize: 2400,
    availablePlotSizes: '800 - 2400 sq.ft',
    dimension: '30 x 40',
    facing: 'East',
    cornerPlot: 'No',
    landUse: 'Residential',
    pricePerSqft: rate,
    totalPrice: total,
    priceFrom: total,
    priceTo: Math.round(2400 * rate),
    availability: 'Available',

    corridor: 'IT Corridor',
    nearbyRoads: 'GST Road (NH45), Outer Ring Road',
    highwayName: 'GST Road (NH45)',
    highwayDistance: 1,
    petrolBunkDistance: 1.2,
    busStopDistance: 0.8,
    railwayStationNearby: 'Guduvanchery - 2.5 km',
    airportDistance: 28,
    schoolsNearby: 'DAV School - 1.5 km',
    collegesNearby: 'SRM University - 6 km',
    hospitalNearby: 'Apollo Clinic - 3 km',
    employmentHubs: 'Estancia IT Park, Mahindra World City',
    residentialDevelopment: 'High-density villa & residential enclave zone',
    infrastructureProjects: 'Kilambakkam Bus Terminus & Metro Phase 2 Extension',

    suitedFor: 'Both',
    possessionTimeline: 'Immediate',

    electricity: 'Available',
    electricityDetails: 'EB 3-Phase Underground Cabling',
    waterConnection: 'Available',
    waterDetails: 'Individual OHT Water Supply',
    drainageFacility: 'Underground',
    drainageDetails: 'Underground Stormwater Drainage',
    roadWidthFt: 30,
    roadWidth: '30ft & 40ft Blacktop Roads',
    roadType: 'Tar Road',
    internalRoads: '40ft & 30ft Blacktop Tar',
    streetLights: 'Yes',
    streetLightsDetails: 'LED Avenue Lighting',
    compoundWallGated: 'Yes',
    securityDetails: '24x7 Boom Barrier Security',
    park: 'Yes',
    parksDetails: 'Landscaped Children Park & Walkway',
    otherAmenities: 'Temple, play area, CCTV',
    developerMaintenanceYears: 2,

    floodZone: 'No',
    waterloggingHistory: 'No',
    contactPersonPhone: 'Mr. Kumar - 9876543210',
    whatsappNumber: '9486140936',
    coverImage: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
    galleryUrls: '',
    videos: '',
    droneVideos: '',
    layoutPdf: '',
    brochure: '',
    remarks: 'Near upcoming metro extension'
  };
}
