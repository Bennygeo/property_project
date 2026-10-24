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
import { 
  AdminFinancialTransaction, 
  AdminFinancialSummary, 
  AdminChannelItem 
} from '../../../../core/services/admin.service';

export type AdminActiveTab = 'review_queue' | 'post_property' | 'plot_studio' | 'all_directory' | 'financials' | 'user_mindset';

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
      if (params['tab'] && ['review_queue', 'post_property', 'plot_studio', 'all_directory', 'financials'].includes(params['tab'])) {
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
}
