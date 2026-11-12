import { PropertyMasterData } from './property-master.model';
import { SubdividedPlot } from './subdivided-plot.model';

export type PropertyType = 'Apartments & Flats' | 'Independent Villas' | 'Luxury Penthouses' | 'Gated CMDA Plots' | 'Commercial Spaces' | 'Agricultural Lands';
export type ListingMode = 'buy' | 'rent' | 'plots' | 'commercial' | 'agricultural';

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
  description?: string;
  amenities?: string[];

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
  plotAddress?: string;
  plotNo?: string;
  areaLocation?: string;
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

  // PRD M06 Entitlement & Plan Limit Restriction Metadata
  isViewRestricted?: boolean;
  isMasked?: boolean;
  restrictionReason?: string;
  activePlanId?: string;
  activePlanName?: string;
  projectViewsUsed?: number;
  projectViewLimit?: number;
  upgradeMessage?: string;

  // Exact 2-Table Consolidated Schema Mappings (projects & project_details)
  projectId?: string;
  project_id?: string;
  project_name?: string;
  developerId?: number;
  developer_id?: number;
  category?: string;
  type?: string;
  land_type?: string;
  landType?: string;
  priceFrom?: number;
  priceTo?: number;
  price_from?: number;
  price_to?: number;
  sqftRate?: number;
  sqft_rate?: number;
  minPlotSize?: number;
  maxPlotSize?: number;
  min_plot_size?: number;
  max_plot_size?: number;
  projectStage?: string;
  project_stage?: string;
  launchDate?: string;
  launch_date?: string;
  possession_date?: string;
  rera_no?: string;
  noBrokerage?: boolean;
  no_brokerage?: boolean;
  featured?: boolean;
  freeAccess?: boolean;
  free_access?: boolean;
  whatsappNumber?: string;
  whatsapp_number?: string;
  coverImage?: string;
  cover_image?: string;
  interactiveMap?: string;
  total_units?: string;
  unitsSold?: string;
  units_sold?: string;
  project_status?: string;
  submittedBy?: string;
  submitted_by?: string;
  status?: string;

  // 1:1 project_details fields
  detailId?: number;
  detail_id?: number;
  totalLayoutArea?: string;
  total_layout_area?: string;
  totalPlots?: number;
  total_plots?: number;
  availablePlotSizes?: string;
  available_plot_sizes?: string;
  dimensions?: string;
  roadWidth?: string;
  road_width?: string;
  cornerPlot?: boolean;
  corner_plot?: boolean;
  approvalAuthority?: string;
  approval_authority?: string;
  approvalReference?: string;
  approval_reference?: string;
  approvalDate?: string;
  approval_date?: string;
  reraDetails?: string;
  rera_details?: string;
  internalRoads?: string;
  internal_roads?: string;
  streetLights?: string;
  street_lights?: string;
  drainage?: string;
  water?: string;
  electricity?: string;
  parks?: string;
  security?: string;
  otherFacilities?: string;
  other_facilities?: string;
  gps?: string;
  nearbyRoads?: string;
  nearby_roads?: string;
  railwayStation?: string;
  railway_station?: string;
  schools?: string;
  hospitals?: string;
  employmentHubs?: string;
  employment_hubs?: string;
  residentialDevelopment?: string;
  residential_development?: string;
  infrastructureProjects?: string;
  infrastructure_projects?: string;
  gallery?: string[] | string;
  videos?: string[] | string;
  droneVideos?: string[] | string;
  drone_videos?: string[] | string;
  layoutPdf?: string;
  layout_pdf?: string;
  brochure?: string;
}

export interface ProjectRecord {
  project_id: string;
  project_name: string;
  developer_id?: number;
  district: string;
  city: string;
  locality: string;
  category: string;
  type: string;
  land_type?: string;
  price_from?: number;
  price_to?: number;
  sqft_rate?: number;
  min_plot_size?: number;
  max_plot_size?: number;
  project_stage?: string;
  launch_date?: string;
  possession_date?: string;
  rera_no?: string;
  brokerage?: string;
  no_brokerage?: boolean;
  featured?: boolean;
  free_access?: boolean;
  whatsapp_number?: string;
  cover_image?: string;
  interactive_map?: string;
  total_units?: string;
  units_sold?: string;
  project_status?: string;
  submitted_by?: string;
  reviewed_by?: string;
  review_notes?: string;
  rejection_reason?: string;
  reviewed_at?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectDetailRecord {
  detail_id?: number;
  project_id: string;
  total_layout_area?: string;
  total_plots?: number;
  available_plot_sizes?: string;
  dimensions?: string;
  road_width?: string;
  corner_plot?: boolean;
  land_type?: string;
  approval_authority?: string;
  approval_reference?: string;
  approval_date?: string;
  rera_details?: string;
  internal_roads?: string;
  street_lights?: string;
  drainage?: string;
  water?: string;
  electricity?: string;
  parks?: string;
  security?: string;
  other_facilities?: string;
  gps?: string;
  nearby_roads?: string;
  railway_station?: string;
  schools?: string;
  hospitals?: string;
  employment_hubs?: string;
  residential_development?: string;
  infrastructure_projects?: string;
  gallery?: string[] | string;
  videos?: string[] | string;
  drone_videos?: string[] | string;
  layout_pdf?: string;
  brochure?: string;
  created_at?: string;
  updated_at?: string;
}

export * from './property-master.model';
