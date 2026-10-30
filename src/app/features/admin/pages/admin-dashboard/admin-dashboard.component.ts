
export const CANONICAL_BULK_HEADERS = [
  'Property ID',
  'Developer',
  'Project Name',
  'RERA Number',
  'DTCP Approved',
  'DTCP / LP Approval No.',
  'Patta Type',
  'Clear Title / EC Available',
  'Bank Loan Approved',
  'Area / Location',
  'Village / Locality',
  'Taluk',
  'District',
  'Pincode',
  'Google Maps Link',
  'Plot No.',
  'Plot Size (sq.ft)',
  'Facing',
  'Corner Plot',
  'Land Use',
  'Price per sq.ft (₹)',
  'Total Price (₹)',
  'Availability',
  'Petrol Bunk Distance (km)',
  'Schools (Name & km)',
  'Colleges (Name & km)',
  'Hospital (Name & km)',
  'Corridor',
  'Bus Stop Distance (km)',
  'Railway Station (Name & km)',
  'Highway Name',
  'Highway Access Distance (km)',
  'Airport Distance (km)',
  'Suited For',
  'Possession Timeline',
  'Electricity',
  'Water Connection',
  'Drainage Facility',
  'Road Width (ft)',
  'Road Type',
  'Street Lights',
  'Compound Wall / Gated',
  'Park',
  'Other Amenities',
  'Developer Maintenance after Handover (yrs)',
  'Flood Zone',
  'Waterlogging History',
  'Contact Person / Phone',
  'Remarks'
] as const;

import {
  PropertyMasterData,
  createBlankMasterData,
  createDefaultMasterData,
  calculateCents,
  calculateTotalPrice,
  MASTER_YES_NO_OPTIONS,
  MASTER_FACING_OPTIONS,
  MASTER_PATTA_OPTIONS,
  MASTER_LAND_USE_OPTIONS,
  MASTER_AVAILABILITY_OPTIONS,
  MASTER_CORRIDOR_OPTIONS,
  MASTER_SUITED_FOR_OPTIONS,
  MASTER_UTILITY_OPTIONS,
  MASTER_DRAINAGE_OPTIONS,
  MASTER_ROAD_TYPE_OPTIONS,
  MASTER_FLOOD_ZONE_OPTIONS
} from '../../../../core/models/property-master.model';
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule, Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { UserBehaviorService } from '../../../../core/services/user-behavior.service';
import { AdminService, ADMIN_PERSONAS } from '../../../../core/services/admin.service';
import { PropertyService } from '../../../../core/services/property.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AdminPropertyItem } from '../../../../core/models/admin.model';
import { ToastComponent } from '../../../home/components/toast/toast.component';
import { SubdividedPlot } from '../../../../core/models/subdivided-plot.model';
import { PlotDetails } from '../../../../core/models/property.model';
import { PlotexViewerComponent } from '../../../../shared/components/plotex-viewer/plotex-viewer.component';
import { InteractivePlotLayoutComponent } from '../../../../shared/components/interactive-plot-layout/interactive-plot-layout.component';

import { ActivatedRoute } from '@angular/router';
import * as XLSX from 'xlsx';
import { validateGpsData, GpsValidationResult } from '../../../../core/utils/gps-helper';
import { 
  AdminFinancialTransaction, 
  AdminFinancialSummary, 
  AdminChannelItem 
} from '../../../../core/services/admin.service';

export type AdminActiveTab = 'review_queue' | 'post_property' | 'plot_studio' | 'all_directory' | 'financials' | 'user_mindset' | 'bulk_upload';

export interface UploadedImageItem {
  id: string;
  file: File;
  previewUrl: string;
  serverUrl?: string;
  name: string;
  sizeFormatted: string;
  isCover: boolean;
  isUploading: boolean;
  error?: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ToastComponent,
    PlotexViewerComponent,
    InteractivePlotLayoutComponent
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent {
  // Comprehensive Property Master Data from Excel Schema
  adminMaster: PropertyMasterData = createDefaultMasterData();

  readonly adminYesNoOptions = MASTER_YES_NO_OPTIONS;
  readonly adminFacingOptions = MASTER_FACING_OPTIONS;
  readonly adminPattaOptions = MASTER_PATTA_OPTIONS;
  readonly adminLandUseOptions = MASTER_LAND_USE_OPTIONS;
  readonly adminAvailabilityOptions = MASTER_AVAILABILITY_OPTIONS;
  readonly adminCorridorOptions = MASTER_CORRIDOR_OPTIONS;
  readonly adminSuitedForOptions = MASTER_SUITED_FOR_OPTIONS;
  readonly adminUtilityOptions = MASTER_UTILITY_OPTIONS;
  readonly adminDrainageOptions = MASTER_DRAINAGE_OPTIONS;
  readonly adminRoadTypeOptions = MASTER_ROAD_TYPE_OPTIONS;
  readonly adminFloodZoneOptions = MASTER_FLOOD_ZONE_OPTIONS;

  onAdminPlotSizeSqftChange(): void {
    this.adminMaster.plotSizeCents = calculateCents(this.adminMaster.plotSizeSqft);
    this.adminMaster.totalPrice = calculateTotalPrice(this.adminMaster.plotSizeSqft, this.adminMaster.pricePerSqft);
  }

  onAdminPricePerSqftChange(): void {
    this.adminMaster.totalPrice = calculateTotalPrice(this.adminMaster.plotSizeSqft, this.adminMaster.pricePerSqft);
  }

  getAdminFormattedTotalPrice(): string {
    const total = this.adminMaster.totalPrice;
    if (!total || total <= 0) return '₹ 0';
    if (total >= 10000000) {
      return `₹ ${(total / 10000000).toFixed(2)} Cr`;
    }
    if (total >= 100000) {
      return `₹ ${(total / 100000).toFixed(2)} Lakhs`;
    }
    return `₹ ${total.toLocaleString('en-IN')}`;
  }

  readonly adminService = inject(AdminService);
  readonly propertyService = inject(PropertyService);
  readonly notificationService = inject(NotificationService);
  readonly userBehaviorService = inject(UserBehaviorService);
  private readonly http = inject(HttpClient);
  readonly router = inject(Router);
  readonly route = inject(ActivatedRoute);
  readonly personas = ADMIN_PERSONAS;

  ngOnInit(): void {
    if (!this.adminService.isAuthenticated()) {
      this.router.navigate(['/admin/login']);
      return;
    }

    this.route.queryParams.subscribe(params => {
      if (params['tab'] && ['review_queue', 'post_property', 'plot_studio', 'all_directory', 'financials', 'user_mindset', 'bulk_upload'].includes(params['tab'])) {
        this.setTab(params['tab'] as AdminActiveTab);
      }
    });
  }

  onSignOut(): void {
    this.adminService.logout();
    this.router.navigate(['/admin/login']);
  }

  // Active Tab View
  readonly activeTab = signal<AdminActiveTab>('review_queue');

  setTab(tab: AdminActiveTab): void {
    this.activeTab.set(tab);
    if (tab === 'financials') {
      this.adminService.loadFinancials(this.financialGateway(), this.financialStatus(), this.financialTimeframe(), this.financialSearch());
    }
    if (tab === 'plot_studio') {
      if (this.adminSubdividedPlots().length === 0) {
        this.autoPopulateDefaultPlots();
      }
    }
    if (tab === 'user_mindset') {
      this.loadMindsetLeads();
    }
  }

  // Buyer Mindset Leads State
  readonly mindsetLeads = signal<any[]>([]);

  loadMindsetLeads(): void {
    this.http.get<{ success: boolean; data: any[] }>('http://localhost:8000/api/analytics/user-mindset.php?phone=all').pipe(
      catchError(() => this.http.get<{ success: boolean; data: any[] }>('/api/analytics/user-mindset.php?phone=all')),
      catchError(() => of({
        success: true,
        data: [{
          userPhone: '9486140936',
          totalViewed: 5,
          plotsCount: 4,
          flatsCount: 1,
          plotsPercentage: 80,
          flatsPercentage: 20,
          priceRange: '22 Lakhs to 35 Lakhs',
          avgPriceFormatted: '29.2 Lakhs',
          topLocalities: ['Tambaram', 'Vandalur', 'Perungalathur'],
          mindsetBrief: '9486140936 user viewed between 22 Lakhs to 35 Lakhs, He viewed 4 plots and 1 flat, so the 80% of interest towards plots and optionally viewed flats.',
          buyerArchetype: 'Strategic Land Investor',
          urgency: 'High Intent (Ready Buyer)',
          recommendation: 'Pitch CMDA/DTCP registered plots in Tambaram, Vandalur, Perungalathur within 22 Lakhs - 35 Lakhs with clear Patta and instant registration.'
        }]
      }))
    ).subscribe(res => {
      if (res && res.data) {
        this.mindsetLeads.set(Array.isArray(res.data) ? res.data : [res.data]);
      }
    });
  }

  // Financial Filters & State
  readonly financialGateway = signal<string>('all');
  readonly financialStatus = signal<string>('all');
  readonly financialTimeframe = signal<string>('all');
  readonly financialSearch = signal<string>('');
  readonly copiedRef = signal<string | null>(null);

  readonly inspectingTransaction = signal<AdminFinancialTransaction | null>(null);
  readonly isTxnModalOpen = signal<boolean>(false);

  // Manual Credit Modal
  readonly isManualCreditModalOpen = signal<boolean>(false);
  readonly manualCreditForm = signal({
    userId: 1,
    points: 20,
    amountRupees: 1000,
    paymentMethod: 'Direct Bank Wire (NEFT/RTGS)',
    notes: ''
  });

  // Directory filter & search
  readonly directoryFilter = signal<string>('all');
  readonly searchQuery = signal<string>('');

  // Selected Property for Review Modal
  readonly inspectingProperty = signal<AdminPropertyItem | null>(null);
  readonly isReviewModalOpen = signal<boolean>(false);
  readonly reviewNotes = signal<string>('');

  // Media Tab & Upload State for Admin Post Property
  readonly adminMediaTab = signal<'upload' | 'url' | 'presets'>('upload');
  readonly adminUploadedImages = signal<UploadedImageItem[]>([]);
  readonly adminIsDragging = signal<boolean>(false);
  readonly adminIsUploadingAny = computed(() => this.adminUploadedImages().some(img => img.isUploading));

  // Sample quick presets
  sampleImages = [
    { label: 'Modern Villa', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Sky Penthouse', url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Architectural Mansion', url: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Green Plot', url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80' }
  ];

  // Property Type Visual Selector Definitions
  readonly propertyTypes = [
    { id: 'Apartments & Flats', label: 'Apartments & Flats', icon: 'apartment', desc: 'Flats & High-Rise' },
    { id: 'Independent Villas', label: 'Independent Villas', icon: 'villa', desc: 'Villas & Mansions' },
    { id: 'Luxury Penthouses', label: 'Luxury Penthouses', icon: 'balcony', desc: 'Sky Duplex & Terraces' },
    { id: 'Gated CMDA Plots', label: 'Plots & Land', icon: 'terrain', desc: 'CMDA / DTCP Layouts' },
    { id: 'Commercial Spaces', label: 'Commercial Spaces', icon: 'domain', desc: 'Offices & Retail' },
    { id: 'Farm Land & Estates', label: 'Farm Land & Estates', icon: 'yard', desc: 'Agricultural Acreage' }
  ];

  // Form State for Posting Property
  readonly newProp = signal({
    title: '',
    propertyType: 'Apartments & Flats',
    listingMode: 'buy',
    cityName: 'Chennai',
    localityName: 'Anna Nagar',
    price: '₹ 1.85 Cr',
    pricePerSqft: '₹ 10,500/sq.ft',
    sqft: '1,760 sq.ft',
    bhkBadge: '3 BHK',
    facingOrView: 'North-East Facing',
    mainImageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    reraNumber: 'TN/29/Building/0811/2026',
    // Dynamic Plot & Specialized Fields
    plotApproval: 'CMDA Approved',
    roadWidth: '30 Feet Road',
    plotDimensions: '',
    boundaryWall: 'Gated & Compounded',
    commercialType: 'Commercial Office Space',
    powerBackup: '100% DG Redundancy',
    waterSource: 'Dedicated Borewell & Canal',
    farmBoundary: 'Solar Fenced Perimeter',
    interactiveMapUrl: 'assets/secura-masterplan-3d.html'
  });

  isAdminPlot(): boolean {
    return this.newProp().propertyType === 'Gated CMDA Plots';
  }

  // Master Layout Factsheet (Rendered when property is a Plot)
  readonly plotFactsheet = signal<PlotDetails>({
    layoutSanctionNo: 'CMDA Sanctioned Layout PPD/LO No. 48/2023',
    reraLayoutNo: 'TN/01/Layout/0291/2024',
    frontageRoadWidth: '40 Feet Wide Bitumen Road',
    waterTableDepth: 'Sweet Potable Water at 18–24 Feet',
    soilBearingCapacity: 'Certified 220 kN/sq.m (Tested by IIT Madras)',
    fsiPermissible: '2.0 FSI (G+3 Floors Permissible)',
    ebSubstation: 'Dedicated 11kV Substation Commissioned',
    boundaryWall: '6-Foot Reinforced Perimeter Wall with Gated Security',
    drainageSystem: 'Underground Stormwater & Sewerage Grid Ready',
    pattaStatus: 'Individual Computerized Patta Issued',
    dimensionRanges: '40 ft x 60 ft (2,400 sq.ft standard corner)'
  });

  // Standard 8-Plot Flagship Template
  readonly defaultMasterPlots: SubdividedPlot[] = [
    {
      id: 248,
      plotNo: '248',
      status: 'sold',
      superBuiltUpYds: 172.50,
      netPlotAreaYds: 118.20,
      superBuiltUpSqft: 1552,
      widthMeters: 12.50,
      lengthMeters: 7.80,
      widthFeet: 41.0,
      lengthFeet: 25.6,
      facing: 'South Facing (Corner)',
      priceInLakhs: 44.0,
      formattedPrice: '₹44.00 L',
      isCorner: true,
      hasTrees: true,
      x: -28,
      y: -15,
      w: 13,
      h: 11
    },
    {
      id: 247,
      plotNo: '247',
      status: 'sold',
      superBuiltUpYds: 165.20,
      netPlotAreaYds: 110.50,
      superBuiltUpSqft: 1487,
      widthMeters: 11.80,
      lengthMeters: 7.80,
      widthFeet: 38.7,
      lengthFeet: 25.6,
      facing: 'South Facing',
      priceInLakhs: 41.5,
      formattedPrice: '₹41.50 L',
      isCorner: false,
      hasTrees: false,
      x: -12,
      y: -15,
      w: 13,
      h: 11
    },
    {
      id: 221,
      plotNo: '221',
      status: 'sold',
      superBuiltUpYds: 158.40,
      netPlotAreaYds: 106.00,
      superBuiltUpSqft: 1425,
      widthMeters: 11.20,
      lengthMeters: 7.80,
      widthFeet: 36.7,
      lengthFeet: 25.6,
      facing: 'South Facing',
      priceInLakhs: 39.8,
      formattedPrice: '₹39.80 L',
      isCorner: false,
      hasTrees: true,
      x: 12,
      y: -15,
      w: 13,
      h: 11
    },
    {
      id: 222,
      plotNo: '222',
      status: 'sold',
      superBuiltUpYds: 180.00,
      netPlotAreaYds: 124.00,
      superBuiltUpSqft: 1620,
      widthMeters: 12.80,
      lengthMeters: 7.80,
      widthFeet: 42.0,
      lengthFeet: 25.6,
      facing: 'South Facing (Corner)',
      priceInLakhs: 46.5,
      formattedPrice: '₹46.50 L',
      isCorner: true,
      hasTrees: false,
      x: 28,
      y: -15,
      w: 13,
      h: 11
    },
    {
      id: 249,
      plotNo: '249',
      status: 'sold',
      superBuiltUpYds: 175.00,
      netPlotAreaYds: 120.00,
      superBuiltUpSqft: 1575,
      widthMeters: 12.50,
      lengthMeters: 7.59,
      widthFeet: 41.0,
      lengthFeet: 24.9,
      facing: 'North Facing (Corner)',
      priceInLakhs: 45.0,
      formattedPrice: '₹45.00 L',
      isCorner: true,
      hasTrees: false,
      x: -28,
      y: 15,
      w: 13,
      h: 11
    },
    {
      id: 246,
      plotNo: '246',
      status: 'available',
      superBuiltUpYds: 168.00,
      netPlotAreaYds: 114.20,
      superBuiltUpSqft: 1512,
      widthMeters: 12.00,
      lengthMeters: 7.59,
      widthFeet: 39.4,
      lengthFeet: 24.9,
      facing: 'North Facing',
      priceInLakhs: 42.0,
      formattedPrice: '₹42.00 L',
      isCorner: false,
      hasTrees: true,
      x: -12,
      y: 15,
      w: 13,
      h: 11
    },
    {
      id: 245,
      plotNo: '245',
      status: 'available',
      superBuiltUpYds: 156.00,
      netPlotAreaYds: 104.50,
      superBuiltUpSqft: 1404,
      widthMeters: 11.20,
      lengthMeters: 7.59,
      widthFeet: 36.7,
      lengthFeet: 24.9,
      facing: 'North Facing',
      priceInLakhs: 39.0,
      formattedPrice: '₹39.00 L',
      isCorner: false,
      hasTrees: false,
      x: 12,
      y: 15,
      w: 13,
      h: 11
    },
    {
      id: 250,
      plotNo: '250',
      status: 'available',
      superBuiltUpYds: 162.00,
      netPlotAreaYds: 109.20,
      superBuiltUpSqft: 1458,
      widthMeters: 11.80,
      lengthMeters: 7.59,
      widthFeet: 38.7,
      lengthFeet: 24.9,
      facing: 'North Facing (Corner)',
      priceInLakhs: 40.5,
      formattedPrice: '₹40.50 L',
      isCorner: true,
      hasTrees: false,
      x: 28,
      y: 15,
      w: 13,
      h: 11
    }
  ];

  // Subdivided Partitioned Plots List Signal
  readonly adminSubdividedPlots = signal<SubdividedPlot[]>([...this.defaultMasterPlots]);

  // Computed summary metrics
  readonly adminTotalPlotsCount = computed(() => this.adminSubdividedPlots().length);
  readonly adminAvailablePlotsCount = computed(() => this.adminSubdividedPlots().filter(p => p.status === 'available').length);
  readonly adminSoldPlotsCount = computed(() => this.adminSubdividedPlots().filter(p => p.status === 'sold').length);
  readonly adminReservedPlotsCount = computed(() => this.adminSubdividedPlots().filter(p => p.status === 'reserved').length);
  readonly adminTotalPlotAreaYards = computed(() => this.adminSubdividedPlots().reduce((acc, p) => acc + (p.superBuiltUpYds || 0), 0));
  readonly adminTotalPlotAreaSqft = computed(() => this.adminSubdividedPlots().reduce((acc, p) => acc + (p.superBuiltUpSqft || 0), 0));
  readonly adminTotalProjectValueLakhs = computed(() => this.adminSubdividedPlots().reduce((acc, p) => acc + (p.priceInLakhs || 0), 0));

  // Plot Modal & Form State
  readonly isPlotModalOpen = signal<boolean>(false);
  readonly editingPlotIndex = signal<number | null>(null);
  readonly plotModalForm = signal<SubdividedPlot>({
    id: Date.now(),
    plotNo: 'Plot 101',
    status: 'available',
    superBuiltUpYds: 160.00,
    netPlotAreaYds: 110.00,
    superBuiltUpSqft: 1440,
    widthMeters: 11.50,
    lengthMeters: 7.80,
    widthFeet: 37.7,
    lengthFeet: 25.6,
    facing: 'North Facing',
    priceInLakhs: 40.0,
    formattedPrice: '₹40.00 L',
    isCorner: false,
    hasTrees: false,
    x: 0,
    y: 0,
    w: 13,
    h: 11
  });

  openAddPlotModal(): void {
    const count = this.adminSubdividedPlots().length;
    const nextPlotNo = `${250 + count + 1}`;
    this.editingPlotIndex.set(null);
    this.plotModalForm.set({
      id: Date.now(),
      plotNo: nextPlotNo,
      status: 'available',
      superBuiltUpYds: 160.00,
      netPlotAreaYds: 110.00,
      superBuiltUpSqft: 1440,
      widthMeters: 11.50,
      lengthMeters: 7.80,
      widthFeet: 37.7,
      lengthFeet: 25.6,
      facing: 'North Facing',
      priceInLakhs: 40.0,
      formattedPrice: '₹40.00 L',
      isCorner: false,
      hasTrees: false,
      x: 0,
      y: 15,
      w: 13,
      h: 11
    });
    this.isPlotModalOpen.set(true);
  }

  openEditPlotModal(index: number): void {
    const target = this.adminSubdividedPlots()[index];
    if (target) {
      this.editingPlotIndex.set(index);
      this.plotModalForm.set({ ...target });
      this.isPlotModalOpen.set(true);
    }
  }

  closePlotModal(): void {
    this.isPlotModalOpen.set(false);
    this.editingPlotIndex.set(null);
  }

  savePlotModal(): void {
    const rawPlot = this.plotModalForm();
    if (!rawPlot.plotNo.trim()) {
      alert('Please specify a Plot Number (e.g. 248 or Plot 101)');
      return;
    }

    const plot = { ...rawPlot };
    // Road safety clearance: Plots must not be placed on the central 9M road (Z in [-9, 9])
    const facingLower = (plot.facing || '').toLowerCase();
    const safeY = facingLower.includes('south') ? -15 : 15;
    if (plot.y === undefined || Math.abs(plot.y) < 9) {
      plot.y = safeY;
    }

    const currentList = this.adminSubdividedPlots();
    const idx = this.editingPlotIndex();
    if (idx !== null && idx >= 0 && idx < currentList.length) {
      this.adminSubdividedPlots.update(list => {
        const copy = [...list];
        copy[idx] = { ...plot };
        return copy;
      });
      this.notificationService.show({
        type: 'success',
        title: 'Plot Updated',
        message: `Plot ${plot.plotNo} configuration updated successfully.`,
        icon: 'check_circle'
      });
    } else {
      this.adminSubdividedPlots.update(list => [...list, { ...plot, id: Date.now() }]);
      this.notificationService.show({
        type: 'success',
        title: 'Partitioned Plot Added',
        message: `Plot ${plot.plotNo} added to layout grid.`,
        icon: 'add_location_alt'
      });
    }

    this.closePlotModal();
  }

  deletePlotItem(index: number): void {
    const plot = this.adminSubdividedPlots()[index];
    if (confirm(`Remove Plot ${plot?.plotNo || index + 1} from this layout?`)) {
      this.adminSubdividedPlots.update(list => list.filter((_, i) => i !== index));
    }
  }

  duplicatePlotItem(index: number): void {
    const original = this.adminSubdividedPlots()[index];
    if (original) {
      const copy: SubdividedPlot = {
        ...original,
        id: Date.now(),
        plotNo: `${original.plotNo}-B`,
        x: original.x + 4
      };
      this.adminSubdividedPlots.update(list => [...list, copy]);
      this.notificationService.show({
        type: 'info',
        title: 'Plot Duplicated',
        message: `Created copy as ${copy.plotNo}`,
        icon: 'content_copy'
      });
    }
  }

  togglePlotStatus(index: number): void {
    this.adminSubdividedPlots.update(list => {
      const copy = [...list];
      const p = copy[index];
      if (p) {
        p.status = p.status === 'available' ? 'sold' : (p.status === 'sold' ? 'reserved' : 'available');
      }
      return copy;
    });
  }

  autoPopulateDefaultPlots(): void {
    this.adminSubdividedPlots.set([...this.defaultMasterPlots]);
    this.notificationService.show({
      type: 'info',
      title: 'Layout Standard Initialized',
      message: 'Populated 8 standard partitioned parcels along the central avenue.',
      icon: 'grid_view'
    });
  }

  clearAllPlots(): void {
    if (confirm('Are you sure you want to clear all partitioned plots for this property?')) {
      this.adminSubdividedPlots.set([]);
    }
  }

  onPlotSqYdsChange(yds: number): void {
    this.plotModalForm.update(f => ({
      ...f,
      superBuiltUpYds: yds,
      superBuiltUpSqft: Math.round(yds * 9)
    }));
  }

  onPlotMetersChange(wM: number, lM: number): void {
    this.plotModalForm.update(f => ({
      ...f,
      widthMeters: wM,
      lengthMeters: lM,
      widthFeet: Math.round(wM * 3.28084 * 10) / 10,
      lengthFeet: Math.round(lM * 3.28084 * 10) / 10
    }));
  }

  onPlotPriceLakhsChange(lakhs: number): void {
    this.plotModalForm.update(f => ({
      ...f,
      priceInLakhs: lakhs,
      formattedPrice: `₹${lakhs.toFixed(2)} L`
    }));
  }

  // Dedicated Plot Partition Studio Signals & Methods
  readonly studioSelectedPropId = signal<string>('new');
  readonly studioPreviewMode = signal<'schematic' | 'plotex3d' | 'plan2d'>('schematic');
  readonly isSavingStudio = signal<boolean>(false);

  readonly studioPlotProperties = computed(() => {
    return this.adminService.properties().filter(p => p.propertyType === 'Gated CMDA Plots');
  });

  onSelectStudioProperty(propId: string): void {
    this.studioSelectedPropId.set(propId);
    if (propId === 'new') {
      this.autoPopulateDefaultPlots();
      return;
    }

    const syncProp = this.propertyService.getPropertyById(propId);
    if (syncProp) {
      if (syncProp.plotDetails) {
        this.plotFactsheet.set({ ...syncProp.plotDetails });
      }
      if (syncProp.subdividedPlots && syncProp.subdividedPlots.length > 0) {
        this.adminSubdividedPlots.set([...syncProp.subdividedPlots]);
      }
    }

    this.propertyService.fetchPropertyDetails(propId).subscribe({
      next: (prop) => {
        if (prop) {
          if (prop.plotDetails) {
            this.plotFactsheet.set({ ...prop.plotDetails });
          }
          if (prop.subdividedPlots && prop.subdividedPlots.length > 0) {
            this.adminSubdividedPlots.set([...prop.subdividedPlots]);
          } else if (!syncProp || !syncProp.subdividedPlots || syncProp.subdividedPlots.length === 0) {
            this.autoPopulateDefaultPlots();
          }
          this.notificationService.show({
            type: 'info',
            title: 'Project Loaded',
            message: `Loaded ${prop.title} with ${this.adminSubdividedPlots().length} parcels.`,
            icon: 'folder_open'
          });
        }
      },
      error: () => {
        this.notificationService.show({
          type: 'error',
          title: 'Load Failed',
          message: 'Could not load property details.',
          icon: 'error'
        });
      }
    });
  }

  savePlotStudioChanges(): void {
    const propId = this.studioSelectedPropId();
    if (propId === 'new') {
      this.setTab('post_property');
      this.newProp.update(prev => ({
        ...prev,
        propertyType: 'Gated CMDA Plots',
        listingMode: 'plots'
      }));
      this.notificationService.show({
        type: 'info',
        title: 'New Plot Project',
        message: 'Your plot details and parcels are loaded. Specify title and location to submit.',
        icon: 'edit_note'
      });
      return;
    }

    this.isSavingStudio.set(true);
    this.adminService.savePlotDetails(propId, this.plotFactsheet(), this.adminSubdividedPlots()).subscribe({
      next: () => {
        this.isSavingStudio.set(false);
      },
      error: () => {
        this.isSavingStudio.set(false);
      }
    });
  }

  isAdminCommercial(): boolean {
    return this.newProp().propertyType === 'Commercial Spaces';
  }

  isAdminFarmLand(): boolean {
    return this.newProp().propertyType === 'Farm Land & Estates';
  }

  isAdminResidential(): boolean {
    return !this.isAdminPlot() && !this.isAdminCommercial() && !this.isAdminFarmLand();
  }

  selectAdminPropertyType(typeId: string): void {
    this.newProp.update(p => {
      let bhk = p.bhkBadge;
      let mode = p.listingMode;

      if (typeId === 'Gated CMDA Plots') {
        bhk = 'Sanctioned Plot';
        mode = 'plots';
      } else if (typeId === 'Commercial Spaces') {
        bhk = 'Commercial Space';
        mode = 'commercial';
      } else if (typeId === 'Farm Land & Estates') {
        bhk = 'Agricultural Land';
        mode = 'plots';
      } else {
        if (['Sanctioned Plot', 'Commercial Space', 'Agricultural Land'].includes(bhk)) {
          bhk = '3 BHK';
        }
        if (mode === 'plots' || mode === 'commercial') {
          mode = 'buy';
        }
      }

      return {
        ...p,
        propertyType: typeId,
        bhkBadge: bhk,
        listingMode: mode
      };
    });
  }

  getAdminAreaLabel(): string {
    if (this.isAdminPlot()) return 'Plot Extent / Land Area *';
    if (this.isAdminFarmLand()) return 'Land Extent (Acres / Cents) *';
    if (this.isAdminCommercial()) return 'Super Built-up Area *';
    return 'Built-up Area / Super Area *';
  }

  getAdminAreaPlaceholder(): string {
    if (this.isAdminPlot()) return 'e.g. 2,400 sq.ft or 2.5 Cents';
    if (this.isAdminFarmLand()) return 'e.g. 2.5 Acres or 60 Cents';
    if (this.isAdminCommercial()) return 'e.g. 4,500 sq.ft';
    return 'e.g. 1,760 sq.ft';
  }

  getAdminPricePerUnitLabel(): string {
    if (this.isAdminPlot()) return 'Rate per Sq.Ft or Cent';
    if (this.isAdminFarmLand()) return 'Rate per Acre or Cent';
    return 'Price per Sq.Ft';
  }

  getAdminPricePerUnitPlaceholder(): string {
    if (this.isAdminPlot()) return 'e.g. ₹ 4,200/sq.ft or ₹ 18 Lakhs/Cent';
    if (this.isAdminFarmLand()) return 'e.g. ₹ 45 Lakhs / Acre';
    return 'e.g. ₹ 10,500/sq.ft';
  }

  // Active cover preview computed from uploaded cover image, or direct URL
  readonly adminActiveCoverPreview = computed(() => {
    if (this.adminMediaTab() === 'upload') {
      const cover = this.adminUploadedImages().find(img => img.isCover);
      if (cover) {
        return cover.previewUrl || cover.serverUrl;
      }
    }
    return this.newProp().mainImageUrl || this.sampleImages[0].url;
  });

  setAdminMediaTab(tab: 'upload' | 'url' | 'presets'): void {
    this.adminMediaTab.set(tab);
    if (tab === 'upload') {
      const cover = this.adminUploadedImages().find(img => img.isCover);
      if (cover) {
        this.newProp.update(p => ({ ...p, mainImageUrl: cover.serverUrl || cover.previewUrl }));
      }
    } else if (tab === 'presets' && !this.newProp().mainImageUrl) {
      this.newProp.update(p => ({ ...p, mainImageUrl: this.sampleImages[0].url }));
    }
  }

  // Drag and drop event handlers
  onAdminDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.adminIsDragging.set(true);
  }

  onAdminDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.adminIsDragging.set(false);
  }

  onAdminDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.adminIsDragging.set(false);

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.handleAdminFiles(event.dataTransfer.files);
    }
  }

  onAdminFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleAdminFiles(input.files);
      input.value = '';
    }
  }

  handleAdminFiles(fileList: FileList | File[]): void {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/avif'];
    const maxSizeBytes = 15 * 1024 * 1024; // 15MB
    const files = Array.from(fileList);
    const validFiles: File[] = [];

    for (const file of files) {
      if (!file.type.startsWith('image/') && !allowedTypes.includes(file.type.toLowerCase())) {
        this.notificationService.show({
          type: 'error',
          title: 'Unsupported Image',
          message: `"${file.name}" is not a supported image format.`,
          icon: 'image_not_supported'
        });
        continue;
      }

      if (file.size > maxSizeBytes) {
        this.notificationService.show({
          type: 'error',
          title: 'File Too Large',
          message: `"${file.name}" exceeds 15MB limit.`,
          icon: 'warning'
        });
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    validFiles.forEach((file) => {
      const id = 'img_adm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const isFirst = this.adminUploadedImages().length === 0;

      const reader = new FileReader();
      reader.onload = (e) => {
        const previewUrl = e.target?.result as string;
        const item: UploadedImageItem = {
          id,
          file,
          previewUrl,
          name: file.name,
          sizeFormatted: this.formatBytes(file.size),
          isCover: isFirst,
          isUploading: true
        };

        this.adminUploadedImages.update(list => [...list, item]);

        if (isFirst) {
          this.newProp.update(p => ({ ...p, mainImageUrl: previewUrl }));
        }

        // Upload to backend API
        this.uploadAdminImageFile(item);
      };

      reader.readAsDataURL(file);
    });

    this.adminMediaTab.set('upload');
  }

  private uploadAdminImageFile(item: UploadedImageItem): void {
    this.propertyService.uploadPropertyImage(item.file).subscribe({
      next: (res) => {
        this.adminUploadedImages.update(list =>
          list.map(img => {
            if (img.id === item.id) {
              return {
                ...img,
                isUploading: false,
                serverUrl: res.success ? res.url : undefined,
                error: res.success ? undefined : (res.message || 'Upload failed')
              };
            }
            return img;
          })
        );

        if (res.success && res.url) {
          const currentImg = this.adminUploadedImages().find(img => img.id === item.id);
          if (currentImg?.isCover) {
            this.newProp.update(p => ({ ...p, mainImageUrl: res.url! }));
          }
          this.notificationService.show({
            type: 'success',
            title: 'Image Uploaded',
            message: `"${item.name}" uploaded to registry media server.`,
            icon: 'cloud_done'
          });
        }
      },
      error: () => {
        this.adminUploadedImages.update(list =>
          list.map(img => (img.id === item.id ? { ...img, isUploading: false, error: 'Network error' } : img))
        );
      }
    });
  }

  setAdminCoverImage(targetImg: UploadedImageItem): void {
    this.adminUploadedImages.update(list =>
      list.map(img => ({
        ...img,
        isCover: img.id === targetImg.id
      }))
    );

    this.newProp.update(p => ({ ...p, mainImageUrl: targetImg.serverUrl || targetImg.previewUrl }));
    this.notificationService.show({
      type: 'info',
      title: 'Cover Image Selected',
      message: `"${targetImg.name}" set as main cover photograph.`,
      icon: 'photo_camera'
    });
  }

  removeAdminImage(imageId: string): void {
    const list = this.adminUploadedImages();
    const removed = list.find(img => img.id === imageId);
    const updated = list.filter(img => img.id !== imageId);

    if (removed?.isCover && updated.length > 0) {
      updated[0].isCover = true;
      this.newProp.update(p => ({ ...p, mainImageUrl: updated[0].serverUrl || updated[0].previewUrl }));
    } else if (updated.length === 0) {
      this.newProp.update(p => ({ ...p, mainImageUrl: this.sampleImages[0].url }));
    }

    this.adminUploadedImages.set(updated);
  }

  selectAdminPreset(url: string): void {
    this.newProp.update(p => ({ ...p, mainImageUrl: url }));
    this.adminUploadedImages.update(list => list.map(img => ({ ...img, isCover: false })));
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // Switch Admin persona
  onSelectPersona(personaId: number): void {
    this.adminService.switchPersona(personaId);
  }

  // Open inspection / review modal
  openReviewModal(prop: AdminPropertyItem): void {
    this.inspectingProperty.set(prop);
    this.reviewNotes.set('');
    this.isReviewModalOpen.set(true);
  }

  closeReviewModal(): void {
    this.isReviewModalOpen.set(false);
    this.inspectingProperty.set(null);
    this.reviewNotes.set('');
  }

  // Maker-Checker approval action
  onApprove(prop: AdminPropertyItem): void {
    const check = this.adminService.canApprove(prop);
    if (!check.allowed) {
      alert(check.reason);
      return;
    }

    this.adminService.submitReview(prop.id, 'approve', this.reviewNotes()).subscribe(success => {
      if (success) {
        this.closeReviewModal();
      }
    });
  }

  // Reject action
  onReject(prop: AdminPropertyItem): void {
    const notes = this.reviewNotes() || 'Does not meet architectural quality standards or deed verification requirements.';
    this.adminService.submitReview(prop.id, 'reject', notes).subscribe(success => {
      if (success) {
        this.closeReviewModal();
      }
    });
  }

  // Request revision action
  onRequestRevision(prop: AdminPropertyItem): void {
    const notes = this.reviewNotes() || 'Please re-upload high-resolution floor plans and RERA compliance deed.';
    this.adminService.submitReview(prop.id, 'request_revision', notes).subscribe(success => {
      if (success) {
        this.closeReviewModal();
      }
    });
  }

  // Post property form submission
  onSubmitNewProperty(): void {
    const data = this.newProp();
    if (!data.title.trim()) {
      alert('Please enter a property title');
      return;
    }

    let finalMainImageUrl = data.mainImageUrl;
    const coverUploaded = this.adminUploadedImages().find(img => img.isCover);
    if (this.adminMediaTab() === 'upload' && coverUploaded) {
      if (coverUploaded.serverUrl) {
        finalMainImageUrl = coverUploaded.serverUrl;
      } else if (coverUploaded.isUploading) {
        this.notificationService.show({
          type: 'warning',
          title: 'Upload in Progress',
          message: 'Please wait for your property photo to finish uploading.',
          icon: 'hourglass_top'
        });
        return;
      } else {
        this.notificationService.show({
          type: 'error',
          title: 'Upload Incomplete',
          message: coverUploaded.error || 'Photo upload failed. Please try re-uploading.',
          icon: 'cloud_off'
        });
        return;
      }
    }

    const galleryImages = this.adminUploadedImages()
      .map(img => img.serverUrl)
      .filter((url): url is string => !!url && url !== finalMainImageUrl);

    // Compute appropriate badge for specialized non-residential properties without bedrooms
    let finalBhkBadge = data.bhkBadge;
    if (this.isAdminPlot()) {
      finalBhkBadge = data.plotApproval || 'Sanctioned Plot';
    } else if (this.isAdminCommercial()) {
      finalBhkBadge = data.commercialType || 'Commercial Space';
    } else if (this.isAdminFarmLand()) {
      finalBhkBadge = 'Agricultural Land';
    }

    const customHighlights: string[] = [];
    if (this.isAdminPlot()) {
      if (data.plotApproval) customHighlights.push(data.plotApproval);
      if (data.roadWidth) customHighlights.push(`Frontage: ${data.roadWidth}`);
      if (data.plotDimensions) customHighlights.push(`Dimensions: ${data.plotDimensions}`);
      if (data.boundaryWall) customHighlights.push(`Perimeter: ${data.boundaryWall}`);
    } else if (this.isAdminCommercial()) {
      if (data.commercialType) customHighlights.push(data.commercialType);
      if (data.powerBackup) customHighlights.push(data.powerBackup);
    } else if (this.isAdminFarmLand()) {
      if (data.waterSource) customHighlights.push(data.waterSource);
      if (data.farmBoundary) customHighlights.push(data.farmBoundary);
    }

    const payload: any = {
      ...data,
      bhkBadge: finalBhkBadge,
      highlights: customHighlights,
      mainImageUrl: finalMainImageUrl,
      galleryImages
    };

    if (this.isAdminPlot()) {
      payload.plotFactsheet = this.plotFactsheet();
      payload.subdividedPlots = this.adminSubdividedPlots();
    }

    this.adminService.postProperty(payload).subscribe(success => {
      if (success) {
        // Reset form & upload state
        this.adminUploadedImages.set([]);
        this.adminMaster = createBlankMasterData();
        this.newProp.set({
          title: '',
          propertyType: 'Apartments & Flats',
          listingMode: 'buy',
          cityName: 'Chennai',
          localityName: 'Anna Nagar',
          price: '₹ 1.85 Cr',
          pricePerSqft: '₹ 10,500/sq.ft',
          sqft: '1,760 sq.ft',
          bhkBadge: '3 BHK',
          facingOrView: 'North-East Facing',
          mainImageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
          reraNumber: 'TN/29/Building/0811/2026',
          plotApproval: 'CMDA Approved',
          roadWidth: '30 Feet Road',
          plotDimensions: '',
          boundaryWall: 'Gated & Compounded',
          commercialType: 'Commercial Office Space',
          powerBackup: '100% DG Redundancy',
          waterSource: 'Dedicated Borewell & Canal',
          farmBoundary: 'Solar Fenced Perimeter',
          interactiveMapUrl: 'assets/secura-masterplan-3d.html'
        });
        // Switch to Review Queue tab to see the pending peer review listing
        this.activeTab.set('review_queue');
      }
    });
  }

  // Quick filter for directory
  applyFilter(status: string): void {
    this.directoryFilter.set(status);
    this.adminService.loadAdminData(status, this.searchQuery());
  }

  // Search trigger
  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.adminService.loadAdminData(this.directoryFilter(), query);
  }

  // ----------------------------------------------------
  // Financial Dashboard Handlers (Razorpay & Credits)
  // ----------------------------------------------------
  filterFinancialsByGateway(gw: string): void {
    this.financialGateway.set(gw);
    this.adminService.loadFinancials(gw, this.financialStatus(), this.financialTimeframe(), this.financialSearch());
  }

  filterFinancialsByTimeframe(tf: string): void {
    this.financialTimeframe.set(tf);
    this.adminService.loadFinancials(this.financialGateway(), this.financialStatus(), tf, this.financialSearch());
  }

  onFinancialSearch(query: string): void {
    this.financialSearch.set(query);
    this.adminService.loadFinancials(this.financialGateway(), this.financialStatus(), this.financialTimeframe(), query);
  }

  copyReference(ref: string): void {
    if (!ref || ref === '—') return;
    navigator.clipboard.writeText(ref);
    this.copiedRef.set(ref);
    setTimeout(() => {
      if (this.copiedRef() === ref) this.copiedRef.set(null);
    }, 2000);
  }

  openTxnModal(txn: AdminFinancialTransaction): void {
    this.inspectingTransaction.set(txn);
    this.isTxnModalOpen.set(true);
  }

  closeTxnModal(): void {
    this.isTxnModalOpen.set(false);
    this.inspectingTransaction.set(null);
  }

  openManualCreditModal(): void {
    this.isManualCreditModalOpen.set(true);
  }

  closeManualCreditModal(): void {
    this.isManualCreditModalOpen.set(false);
  }

  submitManualCredit(): void {
    const form = this.manualCreditForm();
    if (!form.userId || form.userId <= 0) {
      this.notificationService.show({ type: 'warning', title: 'User ID Required', message: 'Please enter a valid investor account ID' });
      return;
    }
    if (!form.points || form.points <= 0) {
      this.notificationService.show({ type: 'warning', title: 'Points Required', message: 'Please specify media points to credit' });
      return;
    }

    this.adminService.submitManualCredit(form).subscribe(success => {
      if (success) {
        this.closeManualCreditModal();
        this.manualCreditForm.set({
          userId: 1,
          points: 20,
          amountRupees: 1000,
          paymentMethod: 'Direct Bank Wire (NEFT/RTGS)',
          notes: ''
        });
      }
    });
  }

  exportFinancialsCsv(): void {
    const data = this.adminService.financialData();
    if (!data || !data.transactions.length) return;

    const headers = ['Txn ID', 'Customer Name', 'Email', 'Phone', 'Amount (INR)', 'Points', 'Gateway / Method', 'Razorpay Payment ID', 'Status', 'Date'];
    const rows = data.transactions.map(t => [
      t.id,
      `"${t.userName.replace(/"/g, '""')}"`,
      `"${t.userEmail}"`,
      `"${t.userPhone}"`,
      t.amountRupees,
      t.points,
      `"${t.paymentMethod}"`,
      `"${t.razorpayPaymentId}"`,
      t.status,
      `"${t.formattedDate}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `mannidam_financial_credits_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // =========================================================================
  // BULK EXCEL UPLOAD STATE & BUSINESS LOGIC
  // =========================================================================
  readonly isUploadingBulk = signal<boolean>(false);
  readonly isClearingDb = signal<boolean>(false);
  readonly bulkClearExisting = signal<boolean>(true); // User requirement: "Remove all the existing DB property data"
  readonly bulkParsedRows = signal<any[]>([]);
  readonly bulkFileName = signal<string>('');
  readonly bulkUploadStats = signal<{ total: number; validGps: number; invalidGps: number } | null>(null);
  readonly bulkUploadSuccess = signal<string>('');
  readonly bulkUploadError = signal<string>('');
  readonly isDragOverBulk = signal<boolean>(false);

  onBulkDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOverBulk.set(true);
  }

  onBulkDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOverBulk.set(false);
  }

  onBulkFileDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOverBulk.set(false);
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processSelectedExcelFile(files[0]);
    }
  }

  onBulkFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processSelectedExcelFile(input.files[0]);
      input.value = ''; // Reset input to allow re-upload
    }
  }

  processSelectedExcelFile(file: File): void {
    this.bulkUploadError.set('');
    this.bulkUploadSuccess.set('');
    this.bulkFileName.set(file.name);

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const buffer = e.target.result;
        const workbook = XLSX.read(buffer, { type: 'array' });
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          this.bulkUploadError.set('The uploaded Excel spreadsheet contains no visible sheets.');
          return;
        }

        // Select the appropriate data sheet
        let sheetName = workbook.SheetNames[0];
        const nonInstructionSheets = workbook.SheetNames.filter(name => {
          const n = name.trim().toLowerCase();
          return !n.includes('instruction') && !n.includes('list') && !n.includes('guide') && !n.includes('readme');
        });
        if (nonInstructionSheets.length > 0) {
          const preferred = nonInstructionSheets.find(name => {
            const n = name.toLowerCase();
            return n.includes('master') || n.includes('property') || n.includes('plot') || n.includes('data');
          });
          sheetName = preferred || nonInstructionSheets[0];
        }
        const activeSheet = workbook.Sheets[sheetName];
        const sheet2d: any[][] = XLSX.utils.sheet_to_json(activeSheet, { header: 1, defval: '' });

        if (!sheet2d || sheet2d.length === 0) {
          this.bulkUploadError.set(`No data found in sheet "${sheetName}".`);
          return;
        }

        // Detect header row by matching property keywords
        const headerKeywords = [
          'property', 'project', 'developer', 'rera', 'dtcp', 'patta', 'location', 'locality', 
          'area', 'plot', 'sqft', 'cents', 'dimension', 'facing', 'price', 'rate', 'road', 
          'electricity', 'water', 'drainage', 'remarks', 'amenities', 'corridor', 'pincode'
        ];

        let headerRowIdx = 0;
        let maxScore = 0;
        for (let r = 0; r < Math.min(10, sheet2d.length); r++) {
          const rowCells = sheet2d[r] || [];
          const normalizedJoined = rowCells.map(c => String(c || '').toLowerCase().replace(/[^a-z0-9]/g, '')).join(' ');
          const score = headerKeywords.filter(kw => normalizedJoined.includes(kw)).length;
          if (score > maxScore) {
            maxScore = score;
            headerRowIdx = r;
          }
        }

        const headers = (sheet2d[headerRowIdx] || []).map((h, i) => {
          const str = String(h || '').trim();
          return str !== '' ? str : `_col_${i}`;
        });

        const rawDataRows = sheet2d.slice(headerRowIdx + 1);
        const validDataRows = rawDataRows.filter(r => {
          if (!r || r.length === 0) return false;
          return r.some(cell => cell !== '' && cell !== null && cell !== undefined);
        });

        if (validDataRows.length === 0) {
          this.bulkUploadError.set(`No valid property rows found below the header row in sheet "${sheetName}".`);
          return;
        }

        // Map flexible headers to standard PropertyMasterData keys
        let validGpsCount = 0;
        let invalidGpsCount = 0;
        const seenIds = new Set<string>();

        const isInvalidIdValue = (val: string): boolean => {
          if (!val || val.length === 0) return true;
          const lower = val.toLowerCase().trim();
          const nonIdWords = [
            'individual patta', 'promoter patta', 'chitta', 'panchayat', 'not available',
            'yes', 'no', 'available', 'booked', 'sold', 'residential', 'commercial',
            'east', 'west', 'north', 'south', 'it corridor', 'gst road', 'omr'
          ];
          return nonIdWords.includes(lower);
        };

        const mappedRows = validDataRows.map((r, idx) => {
          // Prepare cell lookup table with column headers and normalized keys
          const cells = headers.map((hdr, cIdx) => {
            const val = r[cIdx] !== undefined && r[cIdx] !== null ? r[cIdx] : '';
            const norm = hdr.toLowerCase().replace(/[^a-z0-9]/g, '');
            return { header: hdr, norm, value: val, colIdx: cIdx };
          });

          // Helper to fetch text value by alias patterns or exact column index
          const getCol = (colIdx: number, ...aliasPatterns: string[]): any => {
            const normAliases = aliasPatterns.map(a => a.toLowerCase().replace(/[^a-z0-9]/g, ''));
            // 1. Exact normalized match on header name (Highest priority)
            for (const alias of normAliases) {
              const match = cells.find(c => c.norm === alias && c.value !== '' && c.value !== null && c.value !== undefined);
              if (match) return match.value;
            }
            // 2. StartsWith match on header name (only if alias is at least 4 characters long)
            for (const alias of normAliases) {
              if (alias.length >= 4) {
                const match = cells.find(c => c.norm.startsWith(alias) && c.value !== '' && c.value !== null && c.value !== undefined);
                if (match) return match.value;
              }
            }
            // 3. Fallback to column index position (0-48)
            if (r[colIdx] !== undefined && r[colIdx] !== null && String(r[colIdx]).trim() !== '') {
              return r[colIdx];
            }
            return '';
          };

          // Helper to fetch numeric value by alias patterns or exact column index
          const getNumCol = (colIdx: number, ...aliasPatterns: string[]): number | null => {
            const normAliases = aliasPatterns.map(a => a.toLowerCase().replace(/[^a-z0-9]/g, ''));
            const matchingCells = cells.filter(c => {
              if (c.value === '' || c.value === null || c.value === undefined) return false;
              return normAliases.some(alias => c.norm === alias || (alias.length >= 4 && c.norm.startsWith(alias)));
            });

            // Priority 1: Check for clean single numbers in matching header cells
            for (const mc of matchingCells) {
              const str = String(mc.value).trim();
              if (typeof mc.value === 'number') return mc.value;
              if (!str.includes('-')) {
                const parsed = parseFloat(str.replace(/[^0-9.-]/g, ''));
                if (!isNaN(parsed) && parsed > 0) return parsed;
              }
            }

            // Priority 2: Fall back to parsing any header match
            for (const mc of matchingCells) {
              const parsed = parseFloat(String(mc.value).replace(/[^0-9.-]/g, ''));
              if (!isNaN(parsed)) return parsed;
            }

            // Priority 3: Fall back to direct column index cell
            if (r[colIdx] !== undefined && r[colIdx] !== null && String(r[colIdx]).trim() !== '') {
              if (typeof r[colIdx] === 'number') return r[colIdx];
              const parsed = parseFloat(String(r[colIdx]).replace(/[^0-9.-]/g, ''));
              if (!isNaN(parsed)) return parsed;
            }

            return null;
          };

          // 49 Canonical Headers Extraction (0-48):
          // 0: Property ID (Ensure unique ID for every single row)
          let rawPId = String(getCol(0, 'propertyid', 'propid', 'refid', 'pid') || '').trim();
          if (isInvalidIdValue(rawPId) || seenIds.has(rawPId)) {
            rawPId = `PRJ-${String(1001 + idx).padStart(4, '0')}`;
          }
          seenIds.add(rawPId);
          const pId = rawPId;

          // 1: Developer
          const developer = String(getCol(1, 'developer', 'builder', 'promoter', 'company') || 'Mannidam Verified Developer').trim();
          // 2: Project Name
          const projectName = String(getCol(2, 'projectname', 'layoutname', 'communityname', 'project') || 'Verified Cadastral Layout').trim();
          // 3: RERA Number
          const reraNo = String(getCol(3, 'reranumber', 'rerano', 'rera', 'reraregno') || 'CMDA / DTCP Sanctioned').trim();
          // 4: DTCP Approved
          const dtcpApproved = String(getCol(4, 'dtcpapproved', 'cmdaapproved', 'approved') || 'Yes').trim();
          // 5: DTCP / LP Approval No.
          const dtcpApprovalNo = String(getCol(5, 'dtcplpapprovalno', 'dtcpapprovalno', 'lpapprovalno', 'dtcpno', 'approvalno', 'sanctionno') || '').trim();
          // 6: Patta Type
          const pattaType = String(getCol(6, 'pattatype', 'patta') || 'Individual Patta').trim();
          // 7: Clear Title / EC Available
          const clearTitleAvailable = String(getCol(7, 'cleartitleecavailable', 'cleartitleavailable', 'cleartitle') || 'Yes').trim();
          // 8: Bank Loan Approved
          const bankLoanApproved = String(getCol(8, 'bankloanapproved', 'bankloan', 'bankapproval') || 'Yes').trim();
          // 9: Area / Location
          const areaLocation = String(getCol(9, 'arealocation', 'area', 'location') || 'Guduvanchery').trim();
          // 10: Village / Locality
          const villageLocality = String(getCol(10, 'villagelocality', 'locality', 'village', 'neighborhood') || areaLocation).trim();
          // 11: Taluk
          const taluk = String(getCol(11, 'taluk', 'tehsil') || 'Vandalur').trim();
          // 12: District
          const district = String(getCol(12, 'district', 'city') || 'Chengalpattu').trim();
          // 13: Pincode
          const pincode = String(getCol(13, 'pincode', 'pin', 'postalcode') || '603202').trim();
          // 14: Google Maps Link
          const googleMapsLink = String(getCol(14, 'googlemapslink', 'mapslink', 'gpslink', 'gps', 'locationlink', 'maplink', 'coordinates', 'latlong') || '').trim();
          // 15: Plot No.
          let rawPlotNo = String(getCol(15, 'plotno', 'plotnumber', 'siteno', 'surveyno') || '').trim();
          if (!rawPlotNo || rawPlotNo.toLowerCase().includes('.com') || rawPlotNo.toLowerCase().includes('http')) {
            rawPlotNo = String(idx + 1);
          }
          const plotNo = rawPlotNo;

          // 16: Plot Size (sq.ft)
          let sqft = getNumCol(16, 'plotsizesqft', 'sqft', 'plotsize', 'areainsqft', 'extent');
          let cents = sqft && sqft > 0 ? Math.round((sqft / 435.6) * 100) / 100 : 2.75;
          const dimension = sqft ? `${Math.round(Math.sqrt(sqft))} x ${Math.round(Math.sqrt(sqft))}` : '30 x 40';

          // 17: Facing
          const facing = String(getCol(17, 'facing', 'direction', 'plotfacing') || 'East').trim();
          // 18: Corner Plot
          const cornerPlot = String(getCol(18, 'cornerplot', 'corner') || 'No').trim();
          // 19: Land Use
          const landUse = String(getCol(19, 'landuse', 'purpose', 'zoning') || 'Residential').trim();

          // 20: Price per sq.ft (₹)
          let rateSqft = getNumCol(20, 'pricepersqft', 'ratepersqft', 'rate', 'ratesqft', 'pricesqft', 'sqftrate');
          // 21: Total Price (₹)
          let totalPrice = getNumCol(21, 'totalprice', 'price', 'totalcost', 'totalamount', 'cost', 'amount', 'value');
          if ((!totalPrice || totalPrice <= 0) && sqft && rateSqft) {
            totalPrice = Math.round(sqft * rateSqft);
          }
          if ((!rateSqft || rateSqft <= 0) && sqft && totalPrice) {
            rateSqft = Math.round(totalPrice / sqft);
          }

          // 22: Availability
          const availability = String(getCol(22, 'availability', 'status', 'plotstatus') || 'Available').trim();
          // 23: Petrol Bunk Distance (km)
          const petrolBunkDistance = getNumCol(23, 'petrolbunkdistancekm', 'petrolbunkdistance', 'petrolbunk');
          // 24: Schools (Name & km)
          const schoolsNearby = String(getCol(24, 'schoolsnamekm', 'schoolsnearby', 'schools') || '').trim();
          // 25: Colleges (Name & km)
          const collegesNearby = String(getCol(25, 'collegesnamekm', 'collegesnearby', 'colleges') || '').trim();
          // 26: Hospital (Name & km)
          const hospitalNearby = String(getCol(26, 'hospitalnamekm', 'hospitalnearby', 'hospital', 'hospitals') || '').trim();
          // 27: Corridor
          const corridor = String(getCol(27, 'corridor', 'growthcorridor') || 'GST Road').trim();
          // 28: Bus Stop Distance (km)
          const busStopDistance = getNumCol(28, 'busstopdistancekm', 'busstopdistance', 'busstop');
          // 29: Railway Station (Name & km)
          const railwayStationNearby = String(getCol(29, 'railwaystationnamekm', 'railwaystationnearby', 'railwaystation') || '').trim();
          // 30: Highway Name
          const highwayName = String(getCol(30, 'highwayname', 'highway', 'mainroad') || '').trim();
          // 31: Highway Access Distance (km)
          const highwayDistance = getNumCol(31, 'highwayaccessdistancekm', 'highwaydistancekm', 'highwaydistance', 'highwayaccessdistance');
          // 32: Airport Distance (km)
          const airportDistance = getNumCol(32, 'airportdistancekm', 'airportdistance', 'airport');
          // 33: Suited For
          const suitedFor = String(getCol(33, 'suitedfor', 'suitability') || 'Both').trim();
          // 34: Possession Timeline
          const possessionTimeline = String(getCol(34, 'possessiontimeline', 'possession') || 'Immediate').trim();
          // 35: Electricity
          const electricity = String(getCol(35, 'electricity', 'power', 'eb') || 'Available').trim();
          // 36: Water Connection
          const waterConnection = String(getCol(36, 'waterconnection', 'water') || 'Available').trim();
          // 37: Drainage Facility
          const drainageFacility = String(getCol(37, 'drainagefacility', 'drainage') || 'Underground').trim();
          // 38: Road Width (ft)
          const roadWidthFt = getNumCol(38, 'roadwidthft', 'roadwidth', 'roadsize') || 30;
          // 39: Road Type
          const roadType = String(getCol(39, 'roadtype', 'road', 'roadsurface') || 'Tar Road').trim();
          // 40: Street Lights
          const streetLights = String(getCol(40, 'streetlights', 'streetlight') || 'Yes').trim();
          // 41: Compound Wall / Gated
          const compoundWallGated = String(getCol(41, 'compoundwallgated', 'compoundwall', 'gated') || 'Yes').trim();
          // 42: Park
          const park = String(getCol(42, 'park', 'garden') || 'Yes').trim();
          // 43: Other Amenities
          const otherAmenities = String(getCol(43, 'otheramenities', 'amenities', 'facilities') || '').trim();
          // 44: Developer Maintenance after Handover (yrs)
          const developerMaintenanceYears = getNumCol(44, 'developermaintenanceafterhandoveryrs', 'developermaintenanceyears', 'developermaintenance') || 2;
          // 45: Flood Zone
          const floodZone = String(getCol(45, 'floodzone', 'floodrisk') || 'No').trim();
          // 46: Waterlogging History
          const waterloggingHistory = String(getCol(46, 'waterlogginghistory', 'waterlogging') || 'No').trim();
          // 47: Contact Person / Phone
          const contactPersonPhone = String(getCol(47, 'contactpersonphone', 'contactperson', 'phone', 'contact', 'mobile') || '+91 94441 00000').trim();
          // 48: Remarks
          const remarks = String(getCol(48, 'remarks', 'notes', 'comments', 'description') || '').trim();

          // Validate GPS for red highlighting
          const gpsAudit = validateGpsData(googleMapsLink);
          if (gpsAudit.isValid) {
            validGpsCount++;
          } else {
            invalidGpsCount++;
          }

          return {
            propertyId: pId,
            projectName,
            plotNo,
            developer,
            reraNumber: reraNo,
            dtcpApproved: dtcpApproved === 'No' ? 'No' : 'Yes',
            dtcpApprovalNo,
            pattaType,
            clearTitleAvailable: clearTitleAvailable === 'No' ? 'No' : 'Yes',
            bankLoanApproved: bankLoanApproved === 'No' ? 'No' : 'Yes',
            areaLocation,
            villageLocality,
            taluk,
            district,
            pincode,
            googleMapsLink,
            plotSizeSqft: sqft || 1200,
            plotSizeCents: cents || 2.75,
            dimension,
            facing,
            cornerPlot: cornerPlot === 'Yes' ? 'Yes' : 'No',
            landUse,
            pricePerSqft: rateSqft || 3200,
            totalPrice: totalPrice || 3840000,
            availability,
            petrolBunkDistance,
            schoolsNearby,
            collegesNearby,
            hospitalNearby,
            corridor,
            busStopDistance,
            railwayStationNearby,
            highwayName,
            highwayDistance,
            airportDistance,
            suitedFor,
            possessionTimeline,
            electricity,
            waterConnection,
            drainageFacility,
            roadWidthFt,
            roadType,
            streetLights,
            compoundWallGated,
            park,
            otherAmenities,
            developerMaintenanceYears,
            floodZone,
            waterloggingHistory,
            contactPersonPhone,
            remarks,
            _gpsAudit: gpsAudit
          };
        });

        this.bulkParsedRows.set(mappedRows);
        this.bulkUploadStats.set({
          total: mappedRows.length,
          validGps: validGpsCount,
          invalidGps: invalidGpsCount
        });

        this.notificationService.show({
          type: 'success',
          title: 'Excel File Parsed',
          message: `Successfully loaded ${mappedRows.length} property rows from ${file.name}.`,
          icon: 'table_chart'
        });
      } catch (err: any) {
        console.error('Error parsing Excel spreadsheet:', err);
        this.bulkUploadError.set('Failed to parse file: ' + (err.message || 'Invalid format'));
      }
    };

    reader.readAsArrayBuffer(file);
  }

  executeBulkImport(): void {
    const rows = this.bulkParsedRows();
    if (!rows || rows.length === 0) {
      this.bulkUploadError.set('Please select and parse an Excel spreadsheet first.');
      return;
    }

    this.isUploadingBulk.set(true);
    this.bulkUploadError.set('');
    this.bulkUploadSuccess.set('');

    const clearExisting = this.bulkClearExisting();

    this.propertyService.bulkUploadProperties(rows, clearExisting).subscribe({
      next: (res) => {
        this.isUploadingBulk.set(false);
        if (res && res.success) {
          const count = res.importedCount || rows.length;
          this.bulkUploadSuccess.set(`Import successful! ${count} properties were inserted into the live database${clearExisting ? ' (existing DB data was cleared)' : ''}.`);
          this.notificationService.show({
            type: 'success',
            title: 'Bulk Properties Imported',
            message: `${count} properties imported successfully.`,
            icon: 'cloud_done'
          });
          // Refresh property registry
          this.propertyService.loadPropertiesFromApi();
        } else {
          this.bulkUploadError.set(res?.message || 'Bulk upload failed on the server.');
        }
      },
      error: (err) => {
        this.isUploadingBulk.set(false);
        this.bulkUploadError.set('Server error during bulk upload: ' + (err.message || 'Check PHP connection'));
      }
    });
  }

  clearAllDatabaseProperties(): void {
    if (!confirm('Are you sure you want to delete ALL property records from the database? This action cannot be undone.')) {
      return;
    }

    this.isClearingDb.set(true);
    this.propertyService.clearAllProperties().subscribe({
      next: (res) => {
        this.isClearingDb.set(false);
        if (res && res.success) {
          this.bulkParsedRows.set([]);
          this.bulkUploadStats.set(null);
          this.bulkUploadSuccess.set('All database properties have been permanently removed.');
          this.notificationService.show({
            type: 'info',
            title: 'Database Wiped',
            message: 'All properties removed from registry database.',
            icon: 'delete_sweep'
          });
          this.propertyService.loadPropertiesFromApi();
        } else {
          this.bulkUploadError.set(res?.message || 'Failed to wipe database');
        }
      },
      error: (err) => {
        this.isClearingDb.set(false);
        this.bulkUploadError.set('Error clearing database: ' + err.message);
      }
    });
  }

  downloadExcelTemplate(): void {
    const templateHeaders = [...CANONICAL_BULK_HEADERS];

    const sampleRow1 = [
      'PRJ-1001',                                       // Property ID
      'Greenfield Housing Ltd',                         // Developer
      'Greenfield Royal Palms',                         // Project Name
      'TN/01/Layout/1234/2026',                         // RERA Number
      'Yes',                                            // DTCP Approved
      'DTCP/LP/89/2026',                                // DTCP / LP Approval No.
      'Individual Patta',                               // Patta Type
      'Yes',                                            // Clear Title / EC Available
      'Yes',                                            // Bank Loan Approved
      'Guduvanchery',                                   // Area / Location
      'Nandivaram',                                     // Village / Locality
      'Vandalur',                                       // Taluk
      'Chengalpattu',                                   // District
      '603202',                                         // Pincode
      'https://www.google.com/maps?q=12.8436,80.0601',   // Google Maps Link
      '12',                                             // Plot No.
      1200,                                             // Plot Size (sq.ft)
      'East',                                           // Facing
      'No',                                             // Corner Plot
      'Residential',                                    // Land Use
      3200,                                             // Price per sq.ft (₹)
      3840000,                                          // Total Price (₹)
      'Available',                                      // Availability
      1.2,                                              // Petrol Bunk Distance (km)
      'SSM School (1.5 km)',                            // Schools (Name & km)
      'SRM University (6 km)',                          // Colleges (Name & km)
      'SRM Global Hospital (6 km)',                     // Hospital (Name & km)
      'GST Road',                                       // Corridor
      0.8,                                              // Bus Stop Distance (km)
      'Guduvanchery Railway Station (2.5 km)',          // Railway Station (Name & km)
      'GST Road (NH 45)',                               // Highway Name
      2.0,                                              // Highway Access Distance (km)
      28.0,                                             // Airport Distance (km)
      'Both',                                           // Suited For
      'Immediate',                                      // Possession Timeline
      'Available',                                      // Electricity
      'Available',                                      // Water Connection
      'Underground',                                    // Drainage Facility
      30,                                               // Road Width (ft)
      'Tar Road',                                       // Road Type
      'Yes',                                            // Street Lights
      'Yes',                                            // Compound Wall / Gated
      'Yes',                                            // Park
      'Clubhouse, Solar Street Lights, Avenue Trees',   // Other Amenities
      2,                                                // Developer Maintenance after Handover (yrs)
      'No',                                             // Flood Zone
      'No',                                             // Waterlogging History
      '+91 94441 00000',                                // Contact Person / Phone
      'Clear patta freehold land ready for immediate registration' // Remarks
    ];

    const sampleRow2 = [
      'PRJ-1002',                                       // Property ID
      'Prestige Developers',                            // Developer
      'Serene Emerald Enclave',                         // Project Name
      'TN/01/Layout/1235/2026',                         // RERA Number
      'Yes',                                            // DTCP Approved
      'DTCP/LP/90/2026',                                // DTCP / LP Approval No.
      'Individual Patta',                               // Patta Type
      'Yes',                                            // Clear Title / EC Available
      'Yes',                                            // Bank Loan Approved
      'Kelambakkam',                                    // Area / Location
      'Kelambakkam Town',                               // Village / Locality
      'Thiruporur',                                     // Taluk
      'Chengalpattu',                                   // District
      '603103',                                         // Pincode
      '12.7845, 80.2223',                               // Google Maps Link
      '24',                                             // Plot No.
      1500,                                             // Plot Size (sq.ft)
      'North',                                          // Facing
      'Yes',                                            // Corner Plot
      'Residential',                                    // Land Use
      3500,                                             // Price per sq.ft (₹)
      5250000,                                          // Total Price (₹)
      'Available',                                      // Availability
      0.8,                                              // Petrol Bunk Distance (km)
      'Hiranandani Upscale School (4 km)',              // Schools (Name & km)
      'Chettinad Medical College (2 km)',               // Colleges (Name & km)
      'Chettinad Super Speciality (2 km)',              // Hospital (Name & km)
      'OMR',                                            // Corridor
      0.4,                                              // Bus Stop Distance (km)
      'Vandalur Railway Station (14 km)',               // Railway Station (Name & km)
      'Old Mahabalipuram Road (SH 49A)',                // Highway Name
      0.5,                                              // Highway Access Distance (km)
      32.0,                                             // Airport Distance (km)
      'Both',                                           // Suited For
      'Immediate',                                      // Possession Timeline
      'Available',                                      // Electricity
      'Available',                                      // Water Connection
      'Underground',                                    // Drainage Facility
      40,                                               // Road Width (ft)
      'Tar Road',                                       // Road Type
      'Yes',                                            // Street Lights
      'Yes',                                            // Compound Wall / Gated
      'Yes',                                            // Park
      '24x7 Security, Blacktop Roads, Compound Wall',   // Other Amenities
      3,                                                // Developer Maintenance after Handover (yrs)
      'No',                                             // Flood Zone
      'No',                                             // Waterlogging History
      '+91 94441 11111',                                // Contact Person / Phone
      'Corner plot with dual road access and DTCP sanction.' // Remarks
    ];

    const wsData = [templateHeaders, sampleRow1, sampleRow2];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Auto-fit column widths
    ws['!cols'] = templateHeaders.map(h => ({ wch: Math.max(h.length + 3, 14) }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Property Master Template');

    XLSX.writeFile(wb, 'Property_Master_Data_Bulk_Template.xlsx');

    this.notificationService.show({
      type: 'info',
      title: 'Template Downloaded',
      message: 'Property Master Bulk Upload template downloaded with the 49 canonical fields.',
      icon: 'download'
    });
  }

}
