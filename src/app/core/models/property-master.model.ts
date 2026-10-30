export interface PropertyMasterData {
  // GROUP 1: PROJECT & LEGAL
  propertyId: string;
  projectName: string;
  developer: string;
  reraNumber: string;
  dtcpApproved: 'Yes' | 'No' | '';
  dtcpApprovalNo: string;
  pattaType: 'Individual Patta' | 'Chitta' | 'Promoter Patta' | 'Panchayat' | 'Not Available' | '';
  clearTitleAvailable: 'Yes' | 'No' | '';
  bankLoanApproved: 'Yes' | 'No' | '';

  // GROUP 2: LOCATION
  areaLocation: string;
  villageLocality: string;
  taluk: string;
  district: string;
  pincode: string;
  googleMapsLink: string;

  // GROUP 3: PLOT DETAILS
  plotNo: string;
  plotSizeSqft: number | null;
  plotSizeCents: number; // Auto-calculated (sq.ft / 435.6)
  dimension: string; // e.g. 30 x 40
  facing: 'North' | 'South' | 'East' | 'West' | 'North-East' | 'North-West' | 'South-East' | 'South-West' | '';
  cornerPlot: 'Yes' | 'No' | '';
  landUse: 'Residential' | 'Commercial' | 'Agricultural' | 'Mixed Use' | 'Industrial' | '';
  pricePerSqft: number | null;
  totalPrice: number; // Auto-calculated (plotSizeSqft * pricePerSqft)
  availability: 'Available' | 'Booked' | 'Sold' | 'Hold' | '';

  // GROUP 4: NEARBY FACILITIES
  petrolBunkDistance: number | null;
  schoolsNearby: string;
  collegesNearby: string;
  hospitalNearby: string;
  corridor: 'IT Corridor' | 'OMR' | 'GST Road' | 'ECR' | 'Metro Corridor' | 'Industrial Corridor' | 'Highway Corridor' | 'None' | '';
  busStopDistance: number | null;
  railwayStationNearby: string;
  highwayName: string;
  highwayDistance: number | null;
  airportDistance: number | null;

  // GROUP 5: SUITABILITY
  suitedFor: 'Immediate Possession' | 'Investment' | 'Both' | '';
  possessionTimeline: string;

  // GROUP 6: INFRASTRUCTURE
  electricity: 'Available' | 'Nearby' | 'Not Available' | 'Applied' | '';
  waterConnection: 'Available' | 'Nearby' | 'Not Available' | 'Applied' | '';
  drainageFacility: 'Underground' | 'Open Drain' | 'Septic Tank' | 'Not Available' | '';
  roadWidthFt: number | null;
  roadType: 'Tar Road' | 'Concrete' | 'Gravel / Metal' | 'Mud Road' | '';
  streetLights: 'Yes' | 'No' | '';
  compoundWallGated: 'Yes' | 'No' | '';
  park: 'Yes' | 'No' | '';
  otherAmenities: string;
  developerMaintenanceYears: number | null;

  // GROUP 7: RISK & REMARKS
  floodZone: 'No' | 'Low Risk' | 'Moderate' | 'High Risk' | '';
  waterloggingHistory: 'Yes' | 'No' | '';
  contactPersonPhone: string;
  remarks: string;
}

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
    reraNumber: '',
    dtcpApproved: '',
    dtcpApprovalNo: '',
    pattaType: '',
    clearTitleAvailable: '',
    bankLoanApproved: '',

    areaLocation: '',
    villageLocality: '',
    taluk: '',
    district: '',
    pincode: '',
    googleMapsLink: '',

    plotNo: '',
    plotSizeSqft: null,
    plotSizeCents: 0,
    dimension: '',
    facing: '',
    cornerPlot: '',
    landUse: '',
    pricePerSqft: null,
    totalPrice: 0,
    availability: 'Available',

    petrolBunkDistance: null,
    schoolsNearby: '',
    collegesNearby: '',
    hospitalNearby: '',
    corridor: '',
    busStopDistance: null,
    railwayStationNearby: '',
    highwayName: '',
    highwayDistance: null,
    airportDistance: null,

    suitedFor: '',
    possessionTimeline: '',

    electricity: '',
    waterConnection: '',
    drainageFacility: '',
    roadWidthFt: null,
    roadType: '',
    streetLights: '',
    compoundWallGated: '',
    park: '',
    otherAmenities: '',
    developerMaintenanceYears: null,

    floodZone: '',
    waterloggingHistory: '',
    contactPersonPhone: '',
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
  return {
    propertyId: id,
    projectName: 'Green Meadows Phase 2',
    developer: 'ABC Promoters Pvt Ltd',
    reraNumber: 'TN/29/Layout/0123/2025',
    dtcpApproved: 'Yes',
    dtcpApprovalNo: 'LP/No.123/2025',
    pattaType: 'Individual Patta',
    clearTitleAvailable: 'Yes',
    bankLoanApproved: 'Yes',

    areaLocation: 'Guduvanchery',
    villageLocality: 'Nandivaram',
    taluk: 'Chengalpattu',
    district: 'Chengalpattu',
    pincode: '603202',
    googleMapsLink: 'https://maps.google.com/?q=12.8436,80.0601',

    plotNo: 'A-12',
    plotSizeSqft: plotSqft,
    plotSizeCents: calculateCents(plotSqft),
    dimension: '30 x 40',
    facing: 'East',
    cornerPlot: 'No',
    landUse: 'Residential',
    pricePerSqft: rate,
    totalPrice: calculateTotalPrice(plotSqft, rate),
    availability: 'Available',

    petrolBunkDistance: 1.2,
    schoolsNearby: 'DAV School - 1.5 km',
    collegesNearby: 'SRM University - 6 km',
    hospitalNearby: 'Apollo Clinic - 3 km',
    corridor: 'IT Corridor',
    busStopDistance: 0.8,
    railwayStationNearby: 'Guduvanchery - 2.5 km',
    highwayName: 'GST Road (NH45)',
    highwayDistance: 1,
    airportDistance: 28,

    suitedFor: 'Both',
    possessionTimeline: 'Immediate',

    electricity: 'Available',
    waterConnection: 'Available',
    drainageFacility: 'Underground',
    roadWidthFt: 30,
    roadType: 'Tar Road',
    streetLights: 'Yes',
    compoundWallGated: 'Yes',
    park: 'Yes',
    otherAmenities: 'Temple, play area, CCTV',
    developerMaintenanceYears: 2,

    floodZone: 'No',
    waterloggingHistory: 'No',
    contactPersonPhone: 'Mr. Kumar - 9876543210',
    remarks: 'Near upcoming metro extension'
  };
}
