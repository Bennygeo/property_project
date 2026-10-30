import { PropertyMasterData } from './property-master.model';
import { SubdividedPlot } from './subdivided-plot.model';

export type PropertyType = 'Apartments & Flats' | 'Independent Villas' | 'Luxury Penthouses' | 'Gated CMDA Plots' | 'Commercial Spaces';
export type ListingMode = 'buy' | 'rent' | 'plots' | 'commercial';

export interface PremiumMediaItem {
  id: string;
  type: 'video' | 'photo';
  title: string;
  url: string;
  thumbnailUrl: string;
  duration?: string;
  tag: string;
  cloudflareStreamId?: string;
}

export interface FloorPlanItem {
  id: string;
  name: string;
  type: string;
  superArea: string;
  carpetArea: string;
  priceEstimate: string;
  imageUrl: string;
  dimensions?: { [key: string]: string };
}

export interface ApartmentDetails {
  towerCount: string;
  totalFloors: string;
  unitsPerCore: string;
  ceilingHeight: string;
  balconyDeck: string;
  hvacSystem: string;
  flooringSpecs: string;
  kitchenFittings: string;
  parkingBays: string;
  clubhouseSize: string;
  maintenanceFee: string;
}

export interface PlotDetails {
  layoutSanctionNo: string;
  reraLayoutNo: string;
  frontageRoadWidth: string;
  waterTableDepth: string;
  soilBearingCapacity: string;
  fsiPermissible: string;
  ebSubstation: string;
  boundaryWall: string;
  drainageSystem: string;
  pattaStatus: string;
  dimensionRanges: string;
}

export interface VillaDetails {
  landExtent: string;
  builtUpArea: string;
  carpetArea: string;
  privatePool: string;
  courtyardGarden: string;
  solarMicrogrid: string;
  waterAutonomy: string;
  vastuOrientation: string;
  privateElevator: string;
  carPortico: string;
}

export interface CommercialDetails {
  efficiencyRatio: string;
  rentalYield: string;
  leaseTerms: string;
  monthlyRental: string;
  powerRedundancy: string;
  elevators: string;
  hvacSpecs: string;
  floorPlateSize: string;
}

export interface ConnectivityItem {
  title: string;
  distance: string;
  duration: string;
  category: 'transit' | 'business' | 'lifestyle' | 'education' | 'healthcare';
  icon: string;
}

export interface NeighborhoodScore {
  overall: number;
  connectivity: number;
  lifestyle: number;
  schoolsHealth: number;
  greenCover: number;
}

export interface DeveloperProfile {
  name: string;
  establishedYear: string;
  projectsCompleted: string;
  deliveredSqFt: string;
  onTimeTrack: string;
  aboutText: string;
  corporateOffice: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface CadastralAudit {
  surveyNumber: string;
  sroJurisdiction: string;
  ecStatus: string;
  pattaVerification: string;
  reraRegNo: string;
  circleRate: string;
}

export interface AmenityItem {
  name: string;
  icon: string;
  category: 'sports' | 'leisure' | 'eco' | 'security';
  desc?: string;
}

export interface Property {
  id: string;
  title: string;
  propertyType: PropertyType;
  locality: string;
  city: string;
  cityKey: 'chennai' | 'bengaluru' | 'hyderabad' | 'mumbai' | 'delhi-ncr';
  price: string;
  pricePerSqFt: string;
  sqft: string;
  bhkBadge: string;
  facingOrView: string;
  imageUrl: string;
  badges: {
    rera: string;
    brokerage: string;
    points: number;
    specialTag?: string;
  };
  highlights: string[];
  mediaPoints: number;
  isMediaUnlocked?: boolean;
  isShortlisted?: boolean;
  freePhotos: string[];
  premiumMedia: PremiumMediaItem[];
  whatsappUrl?: string;

  // Rich 100acress-style specifications & mock metadata
  developer?: DeveloperProfile;
  possessionDate?: string;
  projectStatus?: string;
  totalLandParcel?: string;
  totalUnits?: string;
  floorPlans?: FloorPlanItem[];
  apartmentDetails?: ApartmentDetails;
  plotDetails?: PlotDetails;
  villaDetails?: VillaDetails;
  commercialDetails?: CommercialDetails;
  amenitiesList?: AmenityItem[];
  connectivity?: ConnectivityItem[];
  neighborhoodScore?: NeighborhoodScore;
  cadastralAudit?: CadastralAudit;
  faqs?: FaqItem[];
  subdividedPlots?: SubdividedPlot[];
  interactiveMapUrl?: string;
  masterDetails?: PropertyMasterData;
  googleMapsLink?: string;
  latitude?: number;
  longitude?: number;
  isGpsValid?: boolean;
  gpsErrorReason?: string;
  gpsFormatted?: string;
  distanceKm?: number;

  // Master property factsheet fields from bulk upload
  developerName?: string;
  projectName?: string;
  villageLocality?: string;
  district?: string;
  taluk?: string;
  corridor?: string;
  pincode?: string;
  plotSizeSqft?: number;
  plotSizeCents?: number;
  facing?: string;
  pattaType?: string;
  dtcpApproved?: string;
  dtcpApprovalNo?: string;
  roadWidthFt?: number;
  highwayName?: string;
  developerProjectsCount?: number;
  isRadiusSuggestion?: boolean;
  isClosestProximity?: boolean;
  isSuggested?: boolean;
  closestNeighborDistanceKm?: number;
  closestNeighborLocality?: string;
  closestNeighborId?: string;
}

export * from './property-master.model';
