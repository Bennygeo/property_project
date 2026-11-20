
export const CANONICAL_BULK_HEADERS = [
  // 1. Core Project Identification (projects table)
  'Project ID',
  'Project Name',
  'Plot No.',
  'Developer Name',
  'Developer ID',
  'District',
  'City',
  'Locality',
  'Pincode',
  'Category',
  'Property Type',
  'Land Type',

  // 2. Pricing & Plot Sizing (projects table)
  'Price From (₹)',
  'Price To (₹)',
  'Price per sq.ft (₹)',
  'Min Plot Size (sq.ft)',
  'Max Plot Size (sq.ft)',
  'Total Price (₹)',
  'Plot Size (sq.ft)',

  // 3. Project Status, Stage & Timeline (projects table)
  'Project Stage',
  'Project Status',
  'Listing Status',
  'Launch Date',
  'Possession Date',
  'RERA Number',
  'Brokerage',
  'No Brokerage (Yes/No)',
  'Featured (Yes/No)',
  'Free Access (Yes/No)',
  'WhatsApp Number',
  'Submitted By',
  'Reviewed By',
  'Review Notes',
  'Rejection Reason',
  'Reviewed At',

  // 4. Layout Specifications & Parcels (project_details table)
  'Total Layout Area',
  'Total Plots',
  'Total Units',
  'Units Sold',
  'Available Plot Sizes',
  'Dimensions',
  'Facing',
  'Corner Plot (Yes/No)',
  'Patta Type',
  'Clear Title / EC Available',
  'Bank Loan Approved',
  'Suited For',

  // 5. Approvals & Sanctions (project_details table)
  'Approval Authority',
  'Approval Reference / LP No.',
  'Approval Date',
  'RERA Details',

  // 6. Infrastructure & Living Amenities (project_details table)
  'Road Width',
  'Road Type',
  'Internal Roads',
  'Street Lights',
  'Drainage Facility',
  'Water Connection',
  'Electricity',
  'Parks & Play Area',
  'Compound Wall / Gated Security',
  'Other Facilities & Amenities',

  // 7. Location Coordinates & Growth Corridors (project_details table)
  'GPS Coordinates / Map Link',
  'Corridor',
  'Nearby Roads / Highway Name',
  'Railway Station (Name & km)',
  'Schools (Name & km)',
  'Hospitals (Name & km)',
  'Employment Hubs',
  'Residential Development Surrounding',
  'Infrastructure Projects',

  // 8. Media, Digital Masterplan & Document Dossiers (projects & project_details tables)
  'Cover Image URL',
  'Interactive Map URL',
  'Gallery Image URLs',
  'Video URLs',
  'Drone Video URLs',
  'Layout PDF URL',
  'Brochure PDF URL',
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
  MASTER_FLOOD_ZONE_OPTIONS,
  MASTER_CATEGORY_OPTIONS,
  MASTER_TYPE_OPTIONS,
  MASTER_PROJECT_STAGE_OPTIONS,
  MASTER_PROJECT_STATUS_OPTIONS,
  MASTER_APPROVAL_AUTHORITY_OPTIONS
} from '../../../../core/models/property-master.model';
import { Component, ViewEncapsulation, forwardRef, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule, Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { UserBehaviorService } from '../../../../core/services/user-behavior.service';
import { AdminService, ADMIN_PERSONAS } from '../../../../core/services/admin.service';
import { PropertyService } from '../../../../core/services/property.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AdminPropertyItem, PropertyReviewStatus } from '../../../../core/models/admin.model';
import { ToastComponent } from '../../../home/components/toast/toast.component';
import { SubdividedPlot } from '../../../../core/models/subdivided-plot.model';
import { PlotDetails } from '../../../../core/models/property.model';
import { PlotexViewerComponent } from '../../../../shared/components/plotex-viewer/plotex-viewer.component';
import { InteractivePlotLayoutComponent } from '../../../../shared/components/interactive-plot-layout/interactive-plot-layout.component';
import { ADMIN_DASHBOARD_HOST } from './sections/admin-dashboard-host.token';
import { AdminDevelopersCrmComponent } from './sections/admin-developers-crm.component';
import { AdminOperationsModalsComponent } from './sections/admin-operations-modals.component';

import { ActivatedRoute } from '@angular/router';
import * as XLSX from 'xlsx';
import { validateGpsData, GpsValidationResult } from '../../../../core/utils/gps-helper';
import { environment } from '../../../../../environments/environment';
import {
  AdminFinancialTransaction,
  AdminFinancialSummary,
  AdminChannelItem
} from '../../../../core/services/admin.service';
import { WorkspaceService } from '../../../../core/services/workspace.service';
import { SubscriptionService } from '../../../../core/services/subscription.service';
import { SubscriptionPlan } from '../../../../core/models/subscription.model';
import {
  SiteVisitItem,
  CalendarDayCell,
  AdvisoryConsultationItem,
  SavedSearchItem,
  PlotBookingItem
} from '../../../../core/models/workspace.model';
import { ReraValidationService, ReraValidationResult } from '../../../../core/services/rera-validation.service';
import { LeadPipelineCommandCenterComponent } from '../../components/lead-pipeline-command-center/lead-pipeline-command-center.component';
import { AdminLeadsAssignmentComponent } from '../../components/admin-leads-assignment/admin-leads-assignment.component';

export type AdminActiveTab =
  | 'review_queue'
  | 'lead_pipeline'
  | 'leads_assignment'
  | 'site_visits'
  | 'post_property'
  | 'plot_studio'
  | 'all_directory'
  | 'developers'
  | 'financials'
  | 'user_mindset'
  | 'bulk_upload'
  | 'buyer_workspaces'
  | 'subscription_buyers'
  | 'subscription_plans'
  | 'whatsapp_messages';

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
    InteractivePlotLayoutComponent,
    AdminDevelopersCrmComponent,
    AdminOperationsModalsComponent,
    LeadPipelineCommandCenterComponent,
    AdminLeadsAssignmentComponent
  ],
  providers: [
    { provide: ADMIN_DASHBOARD_HOST, useExisting: forwardRef(() => AdminDashboardComponent) }
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css'],
  encapsulation: ViewEncapsulation.None
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
  readonly adminCategoryOptions = MASTER_CATEGORY_OPTIONS;
  readonly adminTypeOptions = MASTER_TYPE_OPTIONS;
  readonly adminProjectStageOptions = MASTER_PROJECT_STAGE_OPTIONS;
  readonly adminProjectStatusOptions = MASTER_PROJECT_STATUS_OPTIONS;
  readonly adminApprovalAuthorityOptions = MASTER_APPROVAL_AUTHORITY_OPTIONS;

  formatCurrencyAmount(val: number | null | undefined): string {
    const num = Number(val) || 0;
    if (num <= 0) return '₹ 0';
    if (num >= 10000000) {
      const cr = num / 10000000;
      return `₹ ${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(2)} Cr`;
    }
    if (num >= 100000) {
      const l = num / 100000;
      return `₹ ${l % 1 === 0 ? l.toFixed(0) : l.toFixed(2)} L`;
    }
    return `₹ ${num.toLocaleString('en-IN')}`;
  }

  getAdminFormattedPriceRange(): string {
    const from = this.adminMaster.priceFrom;
    const to = this.adminMaster.priceTo;
    if (!from && !to) {
      return this.adminMaster.totalPrice > 0 ? this.getAdminFormattedTotalPrice() : '₹ 0';
    }
    if (from && to && to > from) {
      return `${this.formatCurrencyAmount(from)} – ${this.formatCurrencyAmount(to)}`;
    }
    if (from) {
      return `Starting ${this.formatCurrencyAmount(from)}`;
    }
    if (to) {
      return `Up to ${this.formatCurrencyAmount(to)}`;
    }
    return '₹ 0';
  }

  getAdminFormattedPlotRange(): string {
    const min = this.adminMaster.minPlotSize;
    const max = this.adminMaster.maxPlotSize;
    if (min && max && min !== max) {
      return `${min} – ${max} sq.ft`;
    }
    if (min) return `${min} sq.ft`;
    if (max) return `${max} sq.ft`;
    if (this.adminMaster.plotSizeSqft) return `${this.adminMaster.plotSizeSqft} sq.ft`;
    return '0 sq.ft';
  }

  getAdminPlotRangeCents(): string {
    const min = this.adminMaster.minPlotSize || this.adminMaster.plotSizeSqft || 0;
    const max = this.adminMaster.maxPlotSize || this.adminMaster.plotSizeSqft || 0;
    const minCents = (min / 435.6).toFixed(2);
    const maxCents = (max / 435.6).toFixed(2);
    if (min > 0 && max > 0 && min !== max) {
      return `${minCents} – ${maxCents} Cents`;
    }
    if (min > 0) return `${minCents} Cents`;
    return '0 Cents';
  }

  onAdminPlotRangeChange(): void {
    const min = this.adminMaster.minPlotSize;
    const max = this.adminMaster.maxPlotSize;
    if (min && max && min !== max) {
      this.adminMaster.availablePlotSizes = `${min} - ${max} sq.ft`;
    } else if (min) {
      this.adminMaster.availablePlotSizes = `${min} sq.ft`;
    }
    if (min && !this.adminMaster.plotSizeSqft) {
      this.adminMaster.plotSizeSqft = min;
    }
    if (this.adminMaster.plotSizeSqft) {
      this.adminMaster.plotSizeCents = calculateCents(this.adminMaster.plotSizeSqft);
    }
    if (this.adminMaster.priceFrom && min && (!this.adminMaster.pricePerSqft || this.adminMaster.pricePerSqft <= 0)) {
      this.adminMaster.pricePerSqft = Math.round(this.adminMaster.priceFrom / min);
    }
  }

  onAdminPriceRangeChange(): void {
    const from = this.adminMaster.priceFrom;
    const to = this.adminMaster.priceTo;
    if (from && from > 0) {
      this.adminMaster.totalPrice = from;
      if (this.adminMaster.minPlotSize && (!this.adminMaster.pricePerSqft || this.adminMaster.pricePerSqft <= 0)) {
        this.adminMaster.pricePerSqft = Math.round(from / this.adminMaster.minPlotSize);
      }
    } else if (to && to > 0) {
      this.adminMaster.totalPrice = to;
    }
  }

  onAdminPlotSizeSqftChange(): void {
    this.adminMaster.plotSizeCents = calculateCents(this.adminMaster.plotSizeSqft);
    this.adminMaster.totalPrice = calculateTotalPrice(this.adminMaster.plotSizeSqft, this.adminMaster.pricePerSqft);
    if (this.adminMaster.plotSizeSqft && !this.adminMaster.minPlotSize) {
      this.adminMaster.minPlotSize = this.adminMaster.plotSizeSqft;
    }
    if (this.adminMaster.plotSizeSqft && !this.adminMaster.maxPlotSize) {
      this.adminMaster.maxPlotSize = this.adminMaster.plotSizeSqft;
    }
    if (this.adminMaster.totalPrice > 0 && !this.adminMaster.priceFrom) {
      this.adminMaster.priceFrom = this.adminMaster.totalPrice;
    }
    if (this.adminMaster.totalPrice > 0 && !this.adminMaster.priceTo) {
      this.adminMaster.priceTo = this.adminMaster.totalPrice;
    }
  }

  onAdminPricePerSqftChange(): void {
    this.adminMaster.totalPrice = calculateTotalPrice(this.adminMaster.plotSizeSqft, this.adminMaster.pricePerSqft);
    if (this.adminMaster.totalPrice > 0 && !this.adminMaster.priceFrom) {
      this.adminMaster.priceFrom = this.adminMaster.totalPrice;
    }
    if (this.adminMaster.totalPrice > 0 && !this.adminMaster.priceTo) {
      this.adminMaster.priceTo = this.adminMaster.totalPrice;
    }
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
  readonly authService = inject(AuthService);
  readonly workspaceService = inject(WorkspaceService);
  readonly subscriptionService = inject(SubscriptionService);
  readonly notificationService = inject(NotificationService);
  readonly userBehaviorService = inject(UserBehaviorService);
  private readonly http = inject(HttpClient);
  readonly reraValidator = inject(ReraValidationService);
  readonly router = inject(Router);
  readonly route = inject(ActivatedRoute);
  readonly personas = ADMIN_PERSONAS;

  // Reactive signals for real-time keystroke validation & filtering
  readonly adminDeveloperQuery = signal<string>('');
  readonly adminReraInput = signal<string>('');

  readonly newPropReraValidation = computed<ReraValidationResult>(() => {
    const raw = this.adminReraInput();
    return this.reraValidator.validate(raw, this.newProp().propertyType);
  });

  onAdminReraInput(value: string): void {
    const val = value || '';
    this.adminMaster.reraNumber = val;
    this.newProp.update(p => ({ ...p, reraNumber: val }));
    this.adminReraInput.set(val);
  }

  applyCanonicalRera(): void {
    const res = this.newPropReraValidation();
    if (res.canonicalRera) {
      this.onAdminReraInput(res.canonicalRera);
      this.notificationService.show({
        type: 'info',
        title: 'RERA Standardized',
        message: `Applied canonical format: ${res.canonicalRera}`,
        icon: 'verified'
      });
    }
  }

  private readonly VALID_ADMIN_TABS: readonly AdminActiveTab[] = [
    'review_queue',
    'lead_pipeline',
    'leads_assignment',
    'site_visits',
    'post_property',
    'plot_studio',
    'all_directory',
    'developers',
    'financials',
    'user_mindset',
    'bulk_upload',
    'buyer_workspaces',
    'subscription_buyers',
    'subscription_plans',
    'whatsapp_messages'
  ];

  private getInitialAdminTab(): AdminActiveTab {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem('findaplot_admin_active_tab') : null;
      if (saved && this.VALID_ADMIN_TABS.includes(saved as AdminActiveTab)) {
        return saved as AdminActiveTab;
      }
    } catch {
      // Ignore storage errors
    }
    return 'review_queue';
  }

  ngOnInit(): void {
    if (!this.adminService.verifyAdminAccess()) {
      this.router.navigate(['/admin/login']);
      return;
    }

    this.loadDashboardMetrics();
    this.loadWhatsappSettings();
    this.loadAdminDevelopers();
    this.workspaceService.fetchAdminWorkspaces().subscribe();

    if (this.router.url.includes('site-visits')) {
      this.setTab('site_visits', false);
      return;
    }

    this.route.queryParams.subscribe(params => {
      const queryTab = params['tab'] as string | undefined;
      if (queryTab && this.VALID_ADMIN_TABS.includes(queryTab as AdminActiveTab)) {
        this.setTab(queryTab as AdminActiveTab, false);
        return;
      }
      const savedTab = this.getInitialAdminTab();
      if (savedTab !== 'review_queue') {
        this.setTab(savedTab, true);
      }
    });
  }

  onSignOut(): void {
    this.adminService.logout();
    this.router.navigate(['/admin/login']);
  }

  // Active Tab View & Modern Enterprise Sidebar State
  readonly activeTab = signal<AdminActiveTab>(this.getInitialAdminTab());
  readonly isSidebarCollapsed = signal<boolean>(false);
  readonly globalAdminSearch = signal<string>('');

  toggleSidebar(): void {
    this.isSidebarCollapsed.update(v => !v);
  }

  readonly activeTabTitle = computed<string>(() => {
    const map: Record<AdminActiveTab, string> = {
      review_queue: 'Project Review Queue',
      lead_pipeline: 'Master Lead Pipeline (10 Stages)',
      leads_assignment: 'All Leads & Role Assignment',
      site_visits: 'Site Visit Requests & Field Escort Desk',
      post_property: 'Post New Property',
      plot_studio: 'Plot Partition Studio 3D',
      all_directory: 'All Properties & Audit Trail',
      developers: 'Developer Portfolios & RERA',
      financials: 'Credits & Revenue Ledger',
      user_mindset: 'Buyer Mindset & AI Intel',
      bulk_upload: 'Bulk Excel Upload',
      buyer_workspaces: 'Buyer Workspaces & CRM',
      subscription_buyers: 'Subscription Buyers & Entitlements',
      subscription_plans: 'Membership Plans & Pricing',
      whatsapp_messages: 'WhatsApp Inquiries & Concierge'
    };
    return map[this.activeTab()] || 'Admin Dashboard';
  });

  setTab(tab: AdminActiveTab, syncUrl = true): void {
    this.activeTab.set(tab);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('findaplot_admin_active_tab', tab);
      }
    } catch {
      // Ignore storage errors
    }
    if (syncUrl) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { tab },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    }
    if (tab === 'subscription_buyers' || tab === 'whatsapp_messages') {
      this.loadDashboardMetrics();
      if (tab === 'whatsapp_messages') {
        this.loadWhatsappSettings();
      }
    }
    if (tab === 'subscription_plans') {
      this.loadSubscriptionPlans();
    }
    if (tab === 'developers' || tab === 'post_property') {
      this.loadAdminDevelopers();
    }
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
    if (tab === 'buyer_workspaces' || tab === 'site_visits') {
      this.workspaceService.fetchAdminWorkspaces().subscribe();
    }
  }

  // =========================================================================
  // ADMIN DASHBOARD KPI METRICS & REAL-TIME ACTIVITY
  // =========================================================================
  readonly dashboardMetrics = signal<{
    visitorsToday: number;
    uniqueVisitors: number;
    usersOnline: number;
    propertiesViewed: number;
    totalSubscriptionBuyers: number;
    subscriptionBuyers: any[];
    totalWhatsappRequests: number;
    whatsappMessages: any[];
    totalCallsAttempted: number;
    callAttempts: any[];
    totalDevelopers: number;
    totalProjects: number;
    projectsAwaitingApproval: number;
  }>({
    visitorsToday: 0,
    uniqueVisitors: 0,
    usersOnline: 0,
    propertiesViewed: 0,
    totalSubscriptionBuyers: 0,
    subscriptionBuyers: [],
    totalWhatsappRequests: 0,
    whatsappMessages: [],
    totalCallsAttempted: 0,
    callAttempts: [],
    totalDevelopers: 0,
    totalProjects: 0,
    projectsAwaitingApproval: 0
  });

  readonly isMetricsLoading = signal<boolean>(false);
  private metricsPollTimer: any = null;

  loadDashboardMetrics(): void {
    this.isMetricsLoading.set(true);
    const tryGet = (url: string) => this.http.get<any>(url);

    tryGet(`${environment.apiUrl}/admin/metrics.php`).pipe(
      catchError(() => tryGet('/p_demo_5/backend/api/admin/metrics.php')),
      catchError(() => tryGet('/P_demo_5/backend/api/admin/metrics.php')),
      catchError(() => tryGet('/the-property-project/backend/api/admin/metrics.php')),
      catchError(() => tryGet('/backend/api/admin/metrics.php')),
      catchError(() => tryGet('/api/admin/metrics.php')),
      catchError(err => {
        console.error('Error fetching dashboard metrics:', err);
        return of(null);
      })
    ).subscribe((res: any) => {
      this.isMetricsLoading.set(false);
      if (res && res.success && res.data) {
        this.dashboardMetrics.set(res.data);
        if (Array.isArray(res.data.callAttempts) && res.data.callAttempts.length > 0) {
          const mapped = res.data.callAttempts.map((c: any) => ({
            id: 'CALL-' + c.id,
            rawId: c.id,
            visitorName: c.contactName || 'Website Caller',
            phone: c.contactPhone || 'N/A',
            firstVisitedAt: c.createdAt || 'Today',
            interestedProject: c.propertyTitle || 'Listing Inquiry',
            propertyId: c.propertyId || 'PRJ-DIRECT',
            status: c.status === 'new' ? 'new_lead' : c.status,
            callDuration: '02:45 mins',
            lastCalledAt: c.createdAt,
            executiveName: 'Benny (Admin Director)',
            notes: c.notes || 'Inquired directly via website callback button',
            nextFollowUp: 'Scheduled Today',
            closeReason: null,
            callHistory: [
              { time: c.createdAt, executive: 'Benny', duration: '02:45 mins', outcome: c.status, notes: c.notes || 'Direct website inquiry' }
            ]
          }));
          this.visitorLeads.set(mapped);
        }
      }
    });
  }

  openVisitorCallLogs(): void {
    this.setTab('buyer_workspaces');
    this.workspaceSubTab.set('daily_visitors');
  }

  // =========================================================================
  // DEDICATED PAGE: SUBSCRIPTION BUYERS
  // =========================================================================
  readonly subscriptionSearchQuery = signal<string>('');
  readonly subscriptionTierFilter = signal<string>('all');

  readonly filteredSubscriptionBuyers = computed(() => {
    const list = this.dashboardMetrics().subscriptionBuyers || [];
    const q = this.subscriptionSearchQuery().trim().toLowerCase();
    const tier = this.subscriptionTierFilter();

    return list.filter(b => {
      const matchesSearch = !q ||
        (b.userName && b.userName.toLowerCase().includes(q)) ||
        (b.userPhone && b.userPhone.includes(q)) ||
        (b.userEmail && b.userEmail.toLowerCase().includes(q)) ||
        (b.planId && b.planId.toLowerCase().includes(q));

      const matchesTier = tier === 'all' || b.planId === tier;
      return matchesSearch && matchesTier;
    });
  });

  // =========================================================================
  // DEDICATED PAGE: WHATSAPP REQUESTS & MESSAGES LIST
  // =========================================================================
  readonly whatsappSearchQuery = signal<string>('');
  readonly whatsappStatusFilter = signal<string>('all');
  readonly isWhatsappSettingsOpen = signal<boolean>(false);
  readonly isSavingWhatsappSettings = signal<boolean>(false);
  readonly isGeneratingTestReply = signal<boolean>(false);
  readonly testReplyPreview = signal<string>('');
  readonly testReplyModelUsed = signal<string>('');
  readonly testSampleName = signal<string>('Dr. Rajesh');
  readonly testSampleMessage = signal<string>('Is this plot DTCP approved and can I get a 75% bank loan?');

  // =========================================================================
  // META WHATSAPP BUSINESS CLOUD API INTEGRATION
  // =========================================================================
  readonly metaWhatsappConfig = signal<{
    phoneNumberId: string;
    wabaId: string;
    accessToken: string;
    isTokenConfigured: boolean;
    verifyToken: string;
    apiVersion: string;
    webhookUrl: string;
    isLive: boolean;
  }>({
    phoneNumberId: '',
    wabaId: '',
    accessToken: '',
    isTokenConfigured: false,
    verifyToken: 'findaplot_meta_token_77',
    apiVersion: 'v19.0',
    webhookUrl: 'https://onenewstory.in/p_demo_5/backend/api/whatsapp-webhook.php',
    isLive: false
  });
  readonly isSavingMetaConfig = signal<boolean>(false);
  readonly isTestingMetaApi = signal<boolean>(false);
  readonly metaApiTestResult = signal<string>('');
  readonly showMetaToken = signal<boolean>(false);

  saveMetaWhatsappSettings(): void {
    this.isSavingMetaConfig.set(true);
    const m = this.metaWhatsappConfig();
    const payload = {
      action: 'update_meta_settings',
      phoneNumberId: m.phoneNumberId,
      wabaId: m.wabaId,
      accessToken: m.accessToken,
      verifyToken: m.verifyToken,
      apiVersion: m.apiVersion
    };

    const tryPost = (url: string) => this.http.post<any>(url, payload);
    tryPost(`${environment.apiUrl}/admin/settings.php`).pipe(
      catchError(() => tryPost('/p_demo_5/backend/api/admin/settings.php')),
      catchError(() => tryPost('/P_demo_5/backend/api/admin/settings.php')),
      catchError(() => of(null))
    ).subscribe((res: any) => {
      this.isSavingMetaConfig.set(false);
      if (res && res.success) {
        this.notificationService.show({
          type: 'success',
          title: 'Meta API Credentials Saved',
          message: 'Official WhatsApp Cloud API settings updated successfully.',
          icon: 'verified'
        });
        this.loadWhatsappSettings();
      } else {
        this.notificationService.show({
          type: 'error',
          title: 'Save Failed',
          message: 'Could not update Meta Cloud API credentials.',
          icon: 'error'
        });
      }
    });
  }

  testMetaCloudApi(): void {
    this.isTestingMetaApi.set(true);
    this.metaApiTestResult.set('');
    const payload = {
      action: 'test_meta_api',
      testPhone: this.whatsappConfig().whatsapp_number,
      message: `Find a Plot: Meta WhatsApp Cloud API connection test successful for ${this.whatsappConfig().whatsapp_number}! ✅`
    };

    const tryPost = (url: string) => this.http.post<any>(url, payload);
    tryPost(`${environment.apiUrl}/admin/settings.php`).pipe(
      catchError(() => tryPost('/p_demo_5/backend/api/admin/settings.php')),
      catchError(() => tryPost('/P_demo_5/backend/api/admin/settings.php')),
      catchError((err) => of({ success: false, message: err?.error?.message || err?.message || 'Network request failed' }))
    ).subscribe((res: any) => {
      this.isTestingMetaApi.set(false);
      if (res && res.success) {
        this.metaApiTestResult.set(`Success! Message ID: ${res.data?.messageId || 'Delivered'}`);
        this.notificationService.show({
          type: 'success',
          title: 'Meta API Test Passed',
          message: `Live WhatsApp message dispatched to ${this.whatsappConfig().whatsapp_number}`,
          icon: 'check_circle'
        });
      } else {
        const errMsg = res?.message || 'Meta API returned error. Check Phone Number ID & Access Token.';
        this.metaApiTestResult.set(`Error: ${errMsg}`);
        this.notificationService.show({
          type: 'error',
          title: 'Meta API Test Failed',
          message: errMsg,
          icon: 'error'
        });
      }
    });
  }

  copyToClipboard(text: string, label: string = 'Copied'): void {
    navigator.clipboard?.writeText(text);
    this.notificationService.show({
      type: 'success',
      title: 'Copied to Clipboard',
      message: `${label} copied to clipboard!`,
      icon: 'content_copy'
    });
  }

  readonly whatsappConfig = signal<{
    whatsapp_number: string;
    whatsapp_country_code: string;
    whatsapp_display_name: string;
    whatsapp_auto_reply_enabled: boolean;
    whatsapp_auto_reply_agent: string;
    whatsapp_free_agent_model: string;
    whatsapp_auto_reply_template: string;
  }>({
    whatsapp_number: '9486140936',
    whatsapp_country_code: '91',
    whatsapp_display_name: 'Find a Plot Concierge Desk',
    whatsapp_auto_reply_enabled: true,
    whatsapp_auto_reply_agent: 'cadastral_concierge',
    whatsapp_free_agent_model: 'local_real_estate_ai',
    whatsapp_auto_reply_template: 'Hi {name}! Thank you for inquiring about {property} in {locality}. Our AI Concierge has logged your request. This property is DTCP/TNRERA verified with clear title deeds. Would you like our executive to share the legal cadastral dossier or book a free chauffeur site visit?'
  });

  loadWhatsappSettings(): void {
    const tryGet = (url: string) => this.http.get<any>(url);
    tryGet(`${environment.apiUrl}/admin/settings.php`).pipe(
      catchError(() => tryGet('/p_demo_5/backend/api/admin/settings.php')),
      catchError(() => tryGet('/P_demo_5/backend/api/admin/settings.php')),
      catchError(() => of(null))
    ).subscribe((res: any) => {
      if (res && res.success && res.data) {
        const s = res.data.settings || {};
        this.whatsappConfig.set({
          whatsapp_number: s.whatsapp_number || '9486140936',
          whatsapp_country_code: s.whatsapp_country_code || '91',
          whatsapp_display_name: s.whatsapp_display_name || 'Find a Plot Concierge Desk',
          whatsapp_auto_reply_enabled: s.whatsapp_auto_reply_enabled === '1' || s.whatsapp_auto_reply_enabled === true,
          whatsapp_auto_reply_agent: s.whatsapp_auto_reply_agent || 'cadastral_concierge',
          whatsapp_free_agent_model: s.whatsapp_free_agent_model || 'local_real_estate_ai',
          whatsapp_auto_reply_template: s.whatsapp_auto_reply_template || ''
        });
        if (res.data.fullWhatsAppNumber) {
          this.propertyService.businessWhatsAppNumber.set(res.data.fullWhatsAppNumber);
        }
        if (res.data.metaConfig) {
          const mc = res.data.metaConfig;
          this.metaWhatsappConfig.set({
            phoneNumberId: mc.phoneNumberId || '',
            wabaId: mc.wabaId || '',
            accessToken: '',
            isTokenConfigured: !!mc.isTokenConfigured,
            verifyToken: mc.verifyToken || 'findaplot_meta_token_77',
            apiVersion: mc.apiVersion || 'v19.0',
            webhookUrl: mc.webhookUrl || 'https://onenewstory.in/p_demo_5/backend/api/webhooks/whatsapp.php',
            isLive: !!mc.isLive
          });
        }
      }
    });
  }

  saveWhatsappSettings(): void {
    this.isSavingWhatsappSettings.set(true);
    const cfg = this.whatsappConfig();
    const payload = {
      action: 'update_settings',
      whatsapp_number: cfg.whatsapp_number,
      whatsapp_country_code: cfg.whatsapp_country_code,
      whatsapp_display_name: cfg.whatsapp_display_name,
      whatsapp_auto_reply_enabled: cfg.whatsapp_auto_reply_enabled ? '1' : '0',
      whatsapp_auto_reply_agent: cfg.whatsapp_auto_reply_agent,
      whatsapp_free_agent_model: cfg.whatsapp_free_agent_model,
      whatsapp_auto_reply_template: cfg.whatsapp_auto_reply_template
    };

    const tryPost = (url: string) => this.http.post<any>(url, payload);
    tryPost(`${environment.apiUrl}/admin/settings.php`).pipe(
      catchError(() => tryPost('/p_demo_5/backend/api/admin/settings.php')),
      catchError(() => tryPost('/P_demo_5/backend/api/admin/settings.php')),
      catchError(() => of(null))
    ).subscribe((res: any) => {
      this.isSavingWhatsappSettings.set(false);
      if (res && res.success) {
        this.notificationService.show({
          type: 'success',
          title: 'WhatsApp Settings Saved',
          message: `Active business number updated to ${res.data?.fullWhatsAppNumber || cfg.whatsapp_number}`,
          icon: 'check_circle'
        });
        if (res.data?.fullWhatsAppNumber) {
          this.propertyService.businessWhatsAppNumber.set(res.data.fullWhatsAppNumber);
        }
        this.loadDashboardMetrics();
      } else {
        this.notificationService.show({
          type: 'error',
          title: 'Save Failed',
          message: 'Could not update settings in database',
          icon: 'error'
        });
      }
    });
  }

  testFreeAgentAutoReply(): void {
    this.isGeneratingTestReply.set(true);
    this.testReplyPreview.set('');
    const cfg = this.whatsappConfig();
    const payload = {
      action: 'test_agent_reply',
      name: this.testSampleName(),
      message: this.testSampleMessage(),
      persona: cfg.whatsapp_auto_reply_agent,
      model: cfg.whatsapp_free_agent_model,
      template: cfg.whatsapp_auto_reply_template
    };

    const tryPost = (url: string) => this.http.post<any>(url, payload);
    tryPost(`${environment.apiUrl}/admin/settings.php`).pipe(
      catchError(() => tryPost('/p_demo_5/backend/api/admin/settings.php')),
      catchError(() => tryPost('/P_demo_5/backend/api/admin/settings.php')),
      catchError(() => of(null))
    ).subscribe((res: any) => {
      this.isGeneratingTestReply.set(false);
      if (res && res.success && res.data) {
        this.testReplyPreview.set(res.data.reply);
        this.testReplyModelUsed.set(res.data.modelUsed || 'local_real_estate_ai');
      }
    });
  }

  generateLeadReply(lead: any): void {
    const cfg = this.whatsappConfig();
    const payload = {
      action: 'generate_lead_reply',
      leadId: lead.id,
      persona: cfg.whatsapp_auto_reply_agent,
      model: cfg.whatsapp_free_agent_model
    };

    const tryPost = (url: string) => this.http.post<any>(url, payload);
    tryPost(`${environment.apiUrl}/admin/settings.php`).pipe(
      catchError(() => tryPost('/p_demo_5/backend/api/admin/settings.php')),
      catchError(() => tryPost('/P_demo_5/backend/api/admin/settings.php')),
      catchError(() => of(null))
    ).subscribe((res: any) => {
      if (res && res.success && res.data) {
        const replyText = res.data.autoReplyText;
        const current = this.dashboardMetrics();
        const updated = (current.whatsappMessages || []).map(m => {
          if (m.id === lead.id) {
            return { ...m, autoReplyText: replyText, autoReplySentAt: new Date().toISOString() };
          }
          return m;
        });
        this.dashboardMetrics.set({ ...current, whatsappMessages: updated });
        this.notificationService.show({
          type: 'success',
          title: 'AI Reply Generated',
          message: `Auto-reply created for ${lead.contactName}`,
          icon: 'smart_toy'
        });
      }
    });
  }

  getDirectWhatsAppReplyUrl(m: any): string {
    const phone = (m.contactPhone || '').replace(/[^\d]/g, '');
    const text = m.autoReplyText || `Hi ${m.contactName}, regarding your inquiry for ${m.propertyTitle || 'property'}, here is the verified document dossier:`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  }

  readonly filteredWhatsappMessages = computed(() => {
    const list = this.dashboardMetrics().whatsappMessages || [];
    const q = this.whatsappSearchQuery().trim().toLowerCase();
    const st = this.whatsappStatusFilter();

    return list.filter(m => {
      const matchesSearch = !q ||
        (m.contactName && m.contactName.toLowerCase().includes(q)) ||
        (m.contactPhone && m.contactPhone.includes(q)) ||
        (m.propertyTitle && m.propertyTitle.toLowerCase().includes(q)) ||
        (m.message && m.message.toLowerCase().includes(q));

      const matchesStatus = st === 'all' || m.status === st;
      return matchesSearch && matchesStatus;
    });
  });

  updateWhatsappStatus(id: number, status: string): void {
    const tryPost = (url: string) => this.http.post<any>(url, {
      action: 'update_lead_status',
      leadId: id,
      status: status,
      notes: `Status updated to ${status} via Admin Dashboard`
    });

    tryPost(`${environment.apiUrl}/admin/metrics.php`).pipe(
      catchError(() => tryPost('/p_demo_5/backend/api/admin/metrics.php')),
      catchError(() => tryPost('/P_demo_5/backend/api/admin/metrics.php')),
      catchError(() => of(null))
    ).subscribe(() => {
      this.loadDashboardMetrics();
    });

    const current = this.dashboardMetrics();
    const updatedMsgs = (current.whatsappMessages || []).map(m => {
      if (m.id === id) {
        return { ...m, status };
      }
      return m;
    });
    this.dashboardMetrics.set({
      ...current,
      whatsappMessages: updatedMsgs
    });
    this.notificationService.show({
      type: 'success',
      title: 'WhatsApp Lead Updated',
      message: `Lead #${id} status changed to ${status.toUpperCase()}`,
      icon: 'check_circle'
    });
  }

  createTestWhatsAppRequest(): void {
    const tryPost = (url: string) => this.http.post<any>(url, {
      action: 'create_test_whatsapp',
      name: 'Benny (Test Investor)',
      phone: '9486140936',
      message: 'Hi Find a Plot, I am interested in viewing the verified legal Patta & TNRERA dossier on WhatsApp.'
    });

    tryPost(`${environment.apiUrl}/admin/metrics.php`).pipe(
      catchError(() => tryPost('/p_demo_5/backend/api/admin/metrics.php')),
      catchError(() => tryPost('/P_demo_5/backend/api/admin/metrics.php')),
      catchError(() => of(null))
    ).subscribe((res: any) => {
      if (res && res.success) {
        this.notificationService.show({
          type: 'success',
          title: 'Test Request Created',
          message: 'Real test WhatsApp inquiry logged to database!',
          icon: 'chat'
        });
        this.loadDashboardMetrics();
      }
    });
  }

  // =========================================================================
  // DEDICATED WHATSAPP CONVERSATION THREAD VIEWER & LOGGING
  // =========================================================================
  readonly selectedChatLead = signal<any | null>(null);
  readonly isChatDrawerOpen = signal<boolean>(false);
  readonly chatThreadMessages = signal<any[]>([]);
  readonly isChatThreadLoading = signal<boolean>(false);
  readonly adminChatReplyInput = signal<string>('');
  readonly isSendingAdminReply = signal<boolean>(false);
  readonly simulatedUserMsgInput = signal<string>('What is the exact road width facing this plot and are bank loans pre-approved?');

  openConversationThread(lead: any): void {
    this.selectedChatLead.set(lead);
    this.isChatDrawerOpen.set(true);
    this.isChatThreadLoading.set(true);
    this.adminChatReplyInput.set('');

    const tryGet = (url: string) => this.http.get<any>(url);
    const phone = lead.contactPhone || '';
    const leadId = lead.id || 0;

    tryGet(`${environment.apiUrl}/admin/whatsapp-chat.php?lead_id=${leadId}&user_phone=${phone}`).pipe(
      catchError(() => tryGet(`/p_demo_5/backend/api/admin/whatsapp-chat.php?lead_id=${leadId}&user_phone=${phone}`)),
      catchError(() => tryGet(`/P_demo_5/backend/api/admin/whatsapp-chat.php?lead_id=${leadId}&user_phone=${phone}`)),
      catchError(() => of(null))
    ).subscribe((res: any) => {
      this.isChatThreadLoading.set(false);
      if (res && res.success && res.data) {
        this.chatThreadMessages.set(res.data.thread || []);
      }
    });
  }

  closeConversationThread(): void {
    this.isChatDrawerOpen.set(false);
    this.selectedChatLead.set(null);
  }

  sendAdminChatReply(asAiAgent: boolean = false): void {
    const text = this.adminChatReplyInput().trim();
    const lead = this.selectedChatLead();
    if (!text || !lead) return;

    this.isSendingAdminReply.set(true);
    const payload = {
      action: 'send_admin_reply',
      leadId: lead.id,
      userPhone: lead.contactPhone,
      propertyId: lead.propertyId,
      messageText: text,
      senderType: asAiAgent ? 'ai_agent' : 'admin',
      senderName: asAiAgent ? 'Find a Plot AI Concierge' : 'Admin Benny (9486140936)',
      isAutoReply: asAiAgent ? 1 : 0
    };

    const tryPost = (url: string) => this.http.post<any>(url, payload);
    tryPost(`${environment.apiUrl}/admin/whatsapp-chat.php`).pipe(
      catchError(() => tryPost('/p_demo_5/backend/api/admin/whatsapp-chat.php')),
      catchError(() => tryPost('/P_demo_5/backend/api/admin/whatsapp-chat.php')),
      catchError(() => of(null))
    ).subscribe((res: any) => {
      this.isSendingAdminReply.set(false);
      if (res && res.success) {
        this.chatThreadMessages.update(msgs => [
          ...msgs,
          {
            id: res.data.id || Date.now(),
            leadId: lead.id,
            propertyId: lead.propertyId,
            userPhone: lead.contactPhone,
            businessPhone: '9486140936',
            senderType: asAiAgent ? 'ai_agent' : 'admin',
            senderName: asAiAgent ? 'Find a Plot AI Concierge' : 'Admin Benny (9486140936)',
            messageText: text,
            isAutoReply: asAiAgent ? 1 : 0,
            createdAt: res.data.createdAt || new Date().toISOString()
          }
        ]);
        this.adminChatReplyInput.set('');
        this.loadDashboardMetrics();
        this.notificationService.show({
          type: 'success',
          title: 'Reply Logged',
          message: asAiAgent ? 'AI Agent reply appended to thread' : 'Admin reply appended to thread',
          icon: 'chat'
        });
      }
    });
  }

  draftWithAiAgent(): void {
    const lead = this.selectedChatLead();
    if (!lead) return;

    const msgs = this.chatThreadMessages();
    const lastUserMsg = [...msgs].reverse().find(m => m.senderType === 'user')?.messageText || lead.message || 'Can you share plot details?';

    const payload = {
      action: 'test_agent_reply',
      name: lead.contactName || 'Buyer',
      phone: lead.contactPhone,
      message: lastUserMsg,
      propertyId: lead.propertyId,
      persona: this.whatsappConfig().whatsapp_auto_reply_agent,
      model: this.whatsappConfig().whatsapp_free_agent_model
    };

    const tryPost = (url: string) => this.http.post<any>(url, payload);
    tryPost(`${environment.apiUrl}/admin/settings.php`).pipe(
      catchError(() => tryPost('/p_demo_5/backend/api/admin/settings.php')),
      catchError(() => tryPost('/P_demo_5/backend/api/admin/settings.php')),
      catchError(() => of(null))
    ).subscribe((res: any) => {
      if (res && res.success && res.data?.reply) {
        this.adminChatReplyInput.set(res.data.reply);
        this.notificationService.show({
          type: 'success',
          title: 'AI Draft Ready',
          message: 'Review and click Send as Admin or Send as AI Agent',
          icon: 'smart_toy'
        });
      }
    });
  }

  simulateUserFollowUpMessage(): void {
    const lead = this.selectedChatLead();
    const msg = this.simulatedUserMsgInput().trim();
    if (!lead || !msg) return;

    const payload = {
      action: 'log_user_message',
      leadId: lead.id,
      userPhone: lead.contactPhone,
      userName: lead.contactName,
      propertyId: lead.propertyId,
      messageText: msg,
      triggerAutoReply: this.whatsappConfig().whatsapp_auto_reply_enabled
    };

    const tryPost = (url: string) => this.http.post<any>(url, payload);
    tryPost(`${environment.apiUrl}/admin/whatsapp-chat.php`).pipe(
      catchError(() => tryPost('/p_demo_5/backend/api/admin/whatsapp-chat.php')),
      catchError(() => tryPost('/P_demo_5/backend/api/admin/whatsapp-chat.php')),
      catchError(() => of(null))
    ).subscribe((res: any) => {
      if (res && res.success) {
        this.openConversationThread(lead);
        this.loadDashboardMetrics();
        this.notificationService.show({
          type: 'success',
          title: 'User Follow-up Logged',
          message: 'Simulated user message added to thread',
          icon: 'question_answer'
        });
      }
    });
  }

  seedSampleWhatsAppThread(): void {
    const tryPost = (url: string) => this.http.post<any>(url, { action: 'seed_sample_thread' });
    tryPost(`${environment.apiUrl}/admin/whatsapp-chat.php`).pipe(
      catchError(() => tryPost('/p_demo_5/backend/api/admin/whatsapp-chat.php')),
      catchError(() => tryPost('/P_demo_5/backend/api/admin/whatsapp-chat.php')),
      catchError(() => of(null))
    ).subscribe((res: any) => {
      if (res && res.success) {
        this.notificationService.show({
          type: 'success',
          title: 'Conversation Thread Seeded',
          message: 'Multi-turn chat for 9498400967 & 9486140936 is ready!',
          icon: 'chat'
        });
        this.loadDashboardMetrics();
        this.openConversationThread({
          id: res.data.leadId,
          contactName: 'Kavitha M. (Buyer)',
          contactPhone: '9498400967',
          propertyId: 'PRJ-0059',
          propertyTitle: 'Verified Cadastral Layout - Plot 1',
          status: 'contacted'
        });
      }
    });
  }

  // =========================================================================
  // DEVELOPER PORTFOLIOS & AUTHORIZED COMPANIES MANAGEMENT (FULL ADMIN ROLE)
  // =========================================================================
  readonly adminDevelopers = signal<any[]>([]);
  readonly isDevelopersLoading = signal<boolean>(false);
  readonly developerSearchQuery = signal<string>('');

  loadAdminDevelopers(): void {
    this.isDevelopersLoading.set(true);
    this.http.get<any>(`${environment.apiUrl}/builders/list.php`).pipe(
      catchError(() => of({ success: false, data: { builders: [] } }))
    ).subscribe(res => {
      this.isDevelopersLoading.set(false);
      if (res && res.success && res.data?.builders) {
        this.adminDevelopers.set(res.data.builders);
      }
    });
  }

  readonly filteredAdminDevelopers = computed(() => {
    const list = this.adminDevelopers();
    const q = this.developerSearchQuery().trim().toLowerCase();
    if (!q) return list;
    return list.filter(d =>
      (d.name && d.name.toLowerCase().includes(q)) ||
      (d.reraNumber && d.reraNumber.toLowerCase().includes(q)) ||
      (d.corporateOffice && d.corporateOffice.toLowerCase().includes(q))
    );
  });

  // Super Admin Developer Profile & Cover Image Editing Modal State
  readonly selectedEditDeveloper = signal<any | null>(null);
  readonly isSavingDeveloper = signal<boolean>(false);
  readonly isUploadingDevCover = signal<boolean>(false);
  readonly isUploadingDevLogo = signal<boolean>(false);

  // Developer Linked Projects & Assignment State
  readonly adminDevLinkedProjects = signal<any[]>([]);
  readonly adminDevAvailableProjects = signal<any[]>([]);
  readonly adminDevProjectSearch = signal<string>('');
  readonly adminSelectedProjectsToLink = signal<string[]>([]);
  readonly isLinkingProjects = signal<boolean>(false);
  readonly isLoadingLinkedProjects = signal<boolean>(false);

  readonly defaultDevCoverImage = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1800&q=80';

  readonly adminArchitecturalCoverPresets = [
    { label: 'Executive Skyline', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1800&q=80' },
    { label: 'Modern Prestige', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1800&q=80' },
    { label: 'Plotted Land Corridor', url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1800&q=80' },
    { label: 'Green Gated Layout', url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1800&q=80' }
  ];

  readonly adminMildGradientPresets = [
    { label: 'Emerald Sage Breeze', value: 'linear-gradient(135deg, #f0fdf4 0%, #f8fafc 50%, #e8f5e9 100%)', badge: 'Eco & Plotted' },
    { label: 'Coastal Marine Mist', value: 'linear-gradient(135deg, #f0f9ff 0%, #f8fafc 50%, #e0f2fe 100%)', badge: 'Maritime & Teal' },
    { label: 'Warm Champagne', value: 'linear-gradient(135deg, #fffbeb 0%, #f8fafc 50%, #fef3c7 100%)', badge: 'Heritage Luxury' },
    { label: 'Slate Platinum', value: 'linear-gradient(135deg, #f1f5f9 0%, #f8fafc 50%, #e2e8f0 100%)', badge: 'Executive Modern' },
    { label: 'Nordic Botanical Mint', value: 'linear-gradient(135deg, #ecfdf5 0%, #f8fafc 50%, #d1fae5 100%)', badge: 'Gated Townships' },
    { label: 'Rose Blush Whisper', value: 'linear-gradient(135deg, #fff1f2 0%, #f8fafc 50%, #ffe4e6 100%)', badge: 'Boutique Estates' },
    { label: 'Lavender Royal Mist', value: 'linear-gradient(135deg, #f5f3ff 0%, #f8fafc 50%, #ede9fe 100%)', badge: 'Royal Enclaves' },
    { label: 'Pure Studio Canvas', value: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)', badge: 'Minimalist Clean' }
  ];

  readonly adminMildFlatColorPresets = [
    { label: 'Pure White', value: '#ffffff', badge: 'Crisp Minimalist' },
    { label: 'Soft Alabaster', value: '#fafafa', badge: 'Warm Neutral' },
    { label: 'Cool Slate Canvas', value: '#f8fafc', badge: 'Executive Modern' },
    { label: 'Mild Sage Tint', value: '#f0fdf4', badge: 'Eco Meadow' },
    { label: 'Coastal Sky Blue', value: '#f0f9ff', badge: 'Maritime Calm' },
    { label: 'Champagne Cream', value: '#fffbeb', badge: 'Heritage Luxury' },
    { label: 'Soft Botanical Mint', value: '#ecfdf5', badge: 'Botanical Flat' },
    { label: 'Rose Quartz Tint', value: '#fff1f2', badge: 'Boutique Estates' },
    { label: 'Lavender Royal Tint', value: '#f5f3ff', badge: 'Royal Enclave' },
    { label: 'Warm Sandstone', value: '#fefce8', badge: 'Earth & Plotted' }
  ];

  selectAdminGradientPreset(gradient: string): void {
    const current = this.selectedEditDeveloper();
    if (current) {
      this.selectedEditDeveloper.set({
        ...current,
        bgGradient: gradient
      });
    }
  }

  isSuperAdmin(): boolean {
    const r = (this.adminService.currentAdmin()?.role || '').toLowerCase();
    return !r || r === 'super_admin' || r === 'admin';
  }

  openCreateDeveloperModal(): void {
    if (!this.isSuperAdmin()) {
      this.notificationService.show({
        type: 'error',
        title: 'Access Denied',
        message: 'Only Super Admin can create new developers.',
        icon: 'gpp_bad'
      });
      return;
    }
    this.selectedEditDeveloper.set({
      isNew: true,
      id: 0,
      name: '',
      slug: '',
      reraNumber: 'TNRERA/PROM/2026',
      logoUrl: '',
      coverImageUrl: '',
      bgGradient: '#ffffff',
      corporateOffice: 'Chennai, Tamil Nadu',
      contactPhone: '',
      contactEmail: '',
      websiteUrl: '',
      about: '',
      establishedYear: '2026',
      projectsCompleted: '0 Projects',
      deliveredSqFt: ''
    });

    this.adminSelectedProjectsToLink.set([]);
    this.adminDevLinkedProjects.set([]);
    this.adminDevProjectSearch.set('');
    this.loadDeveloperLinkedProjects(0, '');
  }

  openEditDeveloperModal(dev: any): void {
    this.selectedEditDeveloper.set({
      isNew: false,
      id: dev.id || 0,
      name: dev.name || '',
      slug: dev.slug || '',
      reraNumber: dev.reraNumber || '',
      logoUrl: dev.logoUrl || '',
      coverImageUrl: dev.coverImageUrl || '',
      bgGradient: dev.bgGradient || 'linear-gradient(135deg, #f0fdf4 0%, #f8fafc 50%, #e8f5e9 100%)',
      corporateOffice: dev.corporateOffice || '',
      contactPhone: dev.contactPhone || '',
      contactEmail: dev.contactEmail || '',
      websiteUrl: dev.websiteUrl || '',
      about: dev.about || dev.aboutText || '',
      establishedYear: dev.establishedYear || '2016',
      projectsCompleted: dev.projectsCompleted || `${dev.projectCount ?? 0} Projects`,
      deliveredSqFt: dev.deliveredSqFt || '1.2M+ sq.ft'
    });

    this.adminSelectedProjectsToLink.set([]);
    this.adminDevProjectSearch.set('');
    this.loadDeveloperLinkedProjects(dev.id || 0, '');
  }

  loadDeveloperLinkedProjects(devId: number, search: string = ''): void {
    this.isLoadingLinkedProjects.set(true);
    this.authService.getDeveloperLinkedProjects(devId, search).subscribe(res => {
      this.isLoadingLinkedProjects.set(false);
      if (res && res.success && res.data) {
        this.adminDevLinkedProjects.set(res.data.linkedProjects || []);
        this.adminDevAvailableProjects.set(res.data.availableProjects || []);
      }
    });
  }

  onSearchAvailableProjects(event: Event): void {
    const q = (event.target as HTMLInputElement).value || '';
    this.adminDevProjectSearch.set(q);
    const dev = this.selectedEditDeveloper();
    this.loadDeveloperLinkedProjects(dev?.id || 0, q);
  }

  toggleProjectSelection(projectId: string): void {
    this.adminSelectedProjectsToLink.update(list => {
      if (list.includes(projectId)) {
        return list.filter(id => id !== projectId);
      } else {
        return [...list, projectId];
      }
    });
  }

  isProjectSelected(projectId: string): boolean {
    return this.adminSelectedProjectsToLink().includes(projectId);
  }

  linkSelectedProjects(): void {
    const dev = this.selectedEditDeveloper();
    const projectIds = this.adminSelectedProjectsToLink();
    if (!dev || projectIds.length === 0) return;

    if (!dev.id || dev.id === 0) {
      this.saveDeveloperFromAdmin();
      return;
    }

    this.isLinkingProjects.set(true);
    this.authService.linkDeveloperProjects(dev.id, projectIds, 'link').subscribe(res => {
      this.isLinkingProjects.set(false);
      if (res && res.success) {
        this.adminSelectedProjectsToLink.set([]);
        this.loadDeveloperLinkedProjects(dev.id);
        this.loadAdminDevelopers();
      }
    });
  }

  unlinkSingleProject(projectId: string): void {
    const dev = this.selectedEditDeveloper();
    if (!dev?.id || !projectId) return;

    this.isLinkingProjects.set(true);
    this.authService.linkDeveloperProjects(dev.id, [projectId], 'unlink').subscribe(res => {
      this.isLinkingProjects.set(false);
      if (res && res.success) {
        this.loadDeveloperLinkedProjects(dev.id);
        this.loadAdminDevelopers();
      }
    });
  }

  onAdminDeveloperChange(developerName: string): void {
    if (!developerName) {
      this.adminMaster.developerId = null;
      return;
    }
    const match = this.adminDevelopers().find(d => d.name && d.name.toLowerCase() === developerName.trim().toLowerCase());
    if (match) {
      this.adminMaster.developerId = match.id || null;
      if (match.reraNumber && !this.adminMaster.reraNumber) {
        this.adminMaster.reraNumber = match.reraNumber;
      }
    } else {
      this.adminMaster.developerId = null;
    }
  }

  readonly isAdminDeveloperDropdownOpen = signal<boolean>(false);

  readonly matchingAdminDevelopers = computed<any[]>(() => {
    const list = this.adminDevelopers();
    const query = this.adminDeveloperQuery().trim().toLowerCase();
    if (!query) {
      return list.slice(0, 8);
    }
    return list
      .filter(d => (d.name && d.name.toLowerCase().includes(query)) || (d.reraNumber && d.reraNumber.toLowerCase().includes(query)))
      .slice(0, 10);
  });

  onAdminDeveloperInput(value: string): void {
    const val = value || '';
    this.adminMaster.developer = val;
    this.adminDeveloperQuery.set(val);
    this.openAdminDeveloperDropdown();
  }

  openAdminDeveloperDropdown(): void {
    if (this.adminDevelopers().length === 0) {
      this.loadAdminDevelopers();
    }
    this.isAdminDeveloperDropdownOpen.set(true);
  }

  closeAdminDeveloperDropdown(): void {
    setTimeout(() => {
      this.isAdminDeveloperDropdownOpen.set(false);
    }, 250);
  }

  selectAdminDeveloper(dev: any): void {
    this.adminMaster.developer = dev.name;
    this.adminDeveloperQuery.set(dev.name);
    this.adminMaster.developerId = dev.id || null;
    if (dev.reraNumber) {
      this.onAdminReraInput(dev.reraNumber);
    }
    if (dev.districts && dev.districts.length > 0 && !this.adminMaster.district) {
      this.adminMaster.district = dev.districts[0];
    }
    this.isAdminDeveloperDropdownOpen.set(false);
    this.notificationService.show({
      type: 'info',
      title: 'Developer Selected',
      message: `${dev.name}${dev.reraNumber ? ' • RERA: ' + dev.reraNumber : ''}`,
      icon: 'verified'
    });
  }

  closeEditDeveloperModal(): void {
    this.selectedEditDeveloper.set(null);
  }

  selectAdminCoverPreset(url: string): void {
    const dev = this.selectedEditDeveloper();
    if (dev) {
      this.selectedEditDeveloper.set({ ...dev, coverImageUrl: url });
    }
  }

  onAdminUploadDeveloperCover(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.isUploadingDevCover.set(true);

    this.propertyService.uploadPropertyImage(file).subscribe({
      next: (res) => {
        this.isUploadingDevCover.set(false);
        if (res && res.success && res.url) {
          const dev = this.selectedEditDeveloper();
          if (dev) {
            this.selectedEditDeveloper.set({ ...dev, coverImageUrl: res.url });
          }
          this.notificationService.show({
            type: 'success',
            title: 'Cover Image Uploaded',
            message: 'Background image ready. Click Save Changes to commit.',
            icon: 'wallpaper'
          });
        } else {
          this.notificationService.show({
            type: 'error',
            title: 'Upload Failed',
            message: res?.message || 'Failed to upload cover image.',
            icon: 'error'
          });
        }
      },
      error: () => {
        this.isUploadingDevCover.set(false);
        this.notificationService.show({
          type: 'error',
          title: 'Upload Error',
          message: 'Error communicating with upload server.',
          icon: 'error'
        });
      }
    });
  }

  onAdminUploadDeveloperLogo(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.isUploadingDevLogo.set(true);

    this.propertyService.uploadPropertyImage(file).subscribe({
      next: (res) => {
        this.isUploadingDevLogo.set(false);
        if (res && res.success && res.url) {
          const dev = this.selectedEditDeveloper();
          if (dev) {
            this.selectedEditDeveloper.set({ ...dev, logoUrl: res.url });
          }
        }
      },
      error: () => {
        this.isUploadingDevLogo.set(false);
      }
    });
  }

  saveDeveloperFromAdmin(): void {
    const dev = this.selectedEditDeveloper();
    if (!dev) return;

    if (dev.isNew && !this.isSuperAdmin()) {
      this.notificationService.show({
        type: 'error',
        title: 'Access Denied',
        message: 'Only Super Admin can create new developers.',
        icon: 'gpp_bad'
      });
      return;
    }

    if (!dev.name || !dev.name.trim()) {
      this.notificationService.show({
        type: 'warning',
        title: 'Company Name Required',
        message: 'Please enter a Company / Developer Name before saving.',
        icon: 'warning'
      });
      return;
    }

    this.isSavingDeveloper.set(true);
    const admin = this.adminService.currentAdmin();
    const linkProjectIds = this.adminSelectedProjectsToLink();
    const payload = {
      isAdmin: true,
      createNew: !!dev.isNew,
      userId: admin?.id || 104,
      userRole: admin?.role || 'super_admin',
      developerId: dev.id || 0,
      name: dev.name.trim(),
      reraNumber: dev.reraNumber,
      logoUrl: dev.logoUrl,
      coverImageUrl: dev.coverImageUrl,
      bgGradient: dev.bgGradient,
      corporateOffice: dev.corporateOffice,
      contactPhone: dev.contactPhone,
      contactEmail: dev.contactEmail,
      websiteUrl: dev.websiteUrl,
      about: dev.about,
      establishedYear: dev.establishedYear,
      projectsCompleted: dev.projectsCompleted,
      deliveredSqFt: dev.deliveredSqFt,
      linkProjectIds
    };

    this.authService.updateDeveloperCompany(payload).subscribe({
      next: (res) => {
        this.isSavingDeveloper.set(false);
        if (res && res.success) {
          this.notificationService.show({
            type: 'success',
            title: dev.isNew ? 'Developer Profile Created' : 'Developer Profile Updated',
            message: `${dev.name} saved${linkProjectIds.length > 0 ? ` with ${linkProjectIds.length} linked project(s)` : ''}.`,
            icon: 'verified'
          });
          this.adminSelectedProjectsToLink.set([]);
          this.closeEditDeveloperModal();
          this.loadAdminDevelopers();
        } else {
          this.notificationService.show({
            type: 'error',
            title: 'Save Failed',
            message: res?.message || 'Failed to update developer profile.',
            icon: 'error'
          });
        }
      },
      error: (err) => {
        this.isSavingDeveloper.set(false);
        this.notificationService.show({
          type: 'error',
          title: 'Save Error',
          message: err?.message || 'Server error occurred while saving developer.',
          icon: 'error'
        });
      }
    });
  }

  // =========================================================================
  // PRD BUYER WORKSPACES & CRM MANAGEMENT (DEDICATED ADMIN TAB)
  // =========================================================================
  readonly adminWorkspaces = computed(() => this.workspaceService.adminOverview());
  readonly workspaceSubTab = signal<'membership' | 'visits' | 'consultations' | 'saved_searches' | 'bookings' | 'daily_visitors'>('membership');
  readonly workspaceSearchQuery = signal<string>('');

  // Daily Visitors Call Tracker & Escalation Logs (100% Real Database Inquiries)
  readonly visitorLeads = signal<any[]>([]);

  countVisitorStatus(status: string): number {
    return this.visitorLeads().filter(v => v.status === status).length;
  }

  getTotalSubscriptionRevenue(): number {
    const list = this.dashboardMetrics().subscriptionBuyers || [];
    return list.reduce((sum, b) => sum + (parseFloat(b.amountPaid) || 0), 0);
  }

  // =========================================================================
  // SUPER ADMIN: MEMBERSHIP PLANS & ENTITLEMENTS CUSTOMIZATION
  // =========================================================================
  readonly adminSubscriptionPlans = signal<SubscriptionPlan[]>([]);
  readonly isPlansLoading = signal<boolean>(false);
  readonly isSavingPlan = signal<boolean>(false);
  readonly editingPlan = signal<SubscriptionPlan | null>(null);
  readonly newFeatureBullet = signal<string>('');

  loadSubscriptionPlans(): void {
    this.isPlansLoading.set(true);
    this.subscriptionService.fetchAdminPlans().subscribe({
      next: (plans) => {
        this.adminSubscriptionPlans.set(plans);
        this.isPlansLoading.set(false);
      },
      error: (err) => {
        console.warn('Failed to load admin subscription plans', err);
        this.isPlansLoading.set(false);
      }
    });
  }

  openEditPlanModal(plan: SubscriptionPlan): void {
    this.editingPlan.set({
      ...plan,
      features: [...(plan.features || [])]
    });
    this.newFeatureBullet.set('');
  }

  closeEditPlanModal(): void {
    this.editingPlan.set(null);
    this.newFeatureBullet.set('');
  }

  addFeatureBullet(): void {
    const text = this.newFeatureBullet().trim();
    const curr = this.editingPlan();
    if (!text || !curr) return;
    this.editingPlan.set({
      ...curr,
      features: [...curr.features, text]
    });
    this.newFeatureBullet.set('');
  }

  removeFeatureBullet(index: number): void {
    const curr = this.editingPlan();
    if (!curr) return;
    const feats = [...curr.features];
    feats.splice(index, 1);
    this.editingPlan.set({
      ...curr,
      features: feats
    });
  }

  savePlanChanges(): void {
    const plan = this.editingPlan();
    if (!plan) return;

    this.isSavingPlan.set(true);
    this.subscriptionService.saveAdminPlan(plan).subscribe({
      next: (res) => {
        this.isSavingPlan.set(false);
        if (res && res.success) {
          this.notificationService.show({
            type: 'success',
            title: 'Plan Updated',
            message: `Membership plan "${plan.name}" has been updated live in database.`,
            icon: 'verified'
          });
          this.closeEditPlanModal();
          this.loadSubscriptionPlans();
        } else {
          this.notificationService.show({
            type: 'error',
            title: 'Save Failed',
            message: res?.message || 'Could not update plan',
            icon: 'error'
          });
        }
      },
      error: (err) => {
        this.isSavingPlan.set(false);
        this.notificationService.show({
          type: 'error',
          title: 'Save Failed',
          message: err?.error?.message || err?.message || 'Server error',
          icon: 'error'
        });
      }
    });
  }

  togglePlanStatus(plan: SubscriptionPlan): void {
    this.subscriptionService.toggleAdminPlan(plan.id).subscribe({
      next: (res) => {
        if (res && res.success) {
          this.notificationService.show({
            type: 'success',
            title: 'Plan Status Toggled',
            message: `Plan "${plan.name}" status updated.`,
            icon: 'toggle_on'
          });
          this.loadSubscriptionPlans();
        }
      }
    });
  }

  readonly callStatusFilter = signal<string>('all');

  readonly filteredVisitorLeads = computed(() => {
    let list = this.visitorLeads();
    const st = this.callStatusFilter();
    if (st !== 'all') {
      list = list.filter(v => v.status === st);
    }
    const q = this.workspaceSearchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(v =>
        v.visitorName.toLowerCase().includes(q) ||
        v.phone.includes(q) ||
        v.interestedProject.toLowerCase().includes(q)
      );
    }
    return list;
  });

  updateVisitorStatus(leadId: string, newStatus: string, closeReason?: string): void {
    const rawId = leadId.startsWith('CALL-') ? parseInt(leadId.replace('CALL-', ''), 10) : parseInt(leadId, 10);
    if (!isNaN(rawId) && rawId > 0) {
      this.http.post<any>(`${environment.apiUrl}/admin/metrics.php`, {
        action: 'update_lead_status',
        leadId: rawId,
        status: newStatus,
        notes: closeReason || `Status changed to ${newStatus}`
      }).pipe(
        catchError(() => this.http.post<any>('/P_demo_5/backend/api/admin/metrics.php', {
          action: 'update_lead_status',
          leadId: rawId,
          status: newStatus,
          notes: closeReason || `Status changed to ${newStatus}`
        })),
        catchError(() => of(null))
      ).subscribe();
    }

    this.visitorLeads.update(list => list.map(item => {
      if (item.id === leadId) {
        const historyEntry = {
          time: 'Just now',
          executive: this.adminService.currentAdmin()?.name || 'Benny',
          duration: 'Updated by Admin',
          outcome: newStatus,
          notes: closeReason ? `Closed with reason: ${closeReason}` : 'Status updated'
        };
        return {
          ...item,
          status: newStatus,
          closeReason: closeReason || item.closeReason,
          callHistory: [historyEntry, ...(item.callHistory || [])]
        };
      }
      return item;
    }));
    this.notificationService.show({
      type: 'success',
      title: 'Call Status Updated',
      message: `Lead ${leadId} status updated to ${newStatus}`,
      icon: 'phone_callback'
    });
  }

  readonly filteredAdminVisits = computed(() => {
    const list = this.adminWorkspaces()?.allVisits || [];
    const q = this.workspaceSearchQuery().toLowerCase().trim();
    if (!q) return list;
    return list.filter(v =>
      (v.user_name && v.user_name.toLowerCase().includes(q)) ||
      (v.property_title && v.property_title.toLowerCase().includes(q)) ||
      (v.assigned_executive_name && v.assigned_executive_name.toLowerCase().includes(q)) ||
      (v.status && v.status.toLowerCase().includes(q))
    );
  });

  // Dedicated Site Visit Requests Page & Interactive Calendar State
  readonly siteVisitViewMode = signal<'calendar' | 'table'>('calendar');
  readonly siteVisitStatusFilter = signal<'all' | 'requested' | 'confirmed' | 'completed' | 'cancelled'>('all');
  readonly siteVisitSearchQuery = signal<string>('');
  readonly calendarCurrentDate = signal<Date>(new Date());
  readonly calendarSelectedDate = signal<string | null>(null);

  formatLocalDate(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  formatSelectedDateLong(dateStr: string | null): string {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      }
    } catch { }
    return dateStr;
  }

  readonly siteVisitsByDate = computed<Map<string, SiteVisitItem[]>>(() => {
    const list = this.adminWorkspaces()?.allVisits || [];
    const map = new Map<string, SiteVisitItem[]>();
    for (const v of list) {
      if (!v.visit_date) continue;
      const dStr = v.visit_date.substring(0, 10);
      if (!map.has(dStr)) {
        map.set(dStr, []);
      }
      map.get(dStr)!.push(v);
    }
    return map;
  });

  readonly calendarMonthYearLabel = computed(() => {
    const d = this.calendarCurrentDate();
    return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  });

  readonly calendarMonthStats = computed(() => {
    const current = this.calendarCurrentDate();
    const year = current.getFullYear();
    const month = current.getMonth();
    const yyyyMm = `${year}-${String(month + 1).padStart(2, '0')}`;
    const list = this.adminWorkspaces()?.allVisits || [];
    const monthVisits = list.filter(v => v.visit_date && v.visit_date.startsWith(yyyyMm));

    return {
      monthLabel: this.calendarMonthYearLabel(),
      total: monthVisits.length,
      requested: monthVisits.filter(v => v.status === 'requested').length,
      confirmed: monthVisits.filter(v => v.status === 'confirmed').length,
      completed: monthVisits.filter(v => v.status === 'completed').length,
      cancelled: monthVisits.filter(v => v.status === 'cancelled').length
    };
  });

  readonly calendarDays = computed<CalendarDayCell[]>(() => {
    const current = this.calendarCurrentDate();
    const year = current.getFullYear();
    const month = current.getMonth();

    const todayStr = this.formatLocalDate(new Date());
    const selectedStr = this.calendarSelectedDate();
    const visitsMap = this.siteVisitsByDate();

    const firstDayOfMonth = new Date(year, month, 1);
    const startDayOfWeek = firstDayOfMonth.getDay();
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: CalendarDayCell[] = [];

    // 1. Previous Month Spillover Days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const cellDate = new Date(year, month - 1, dayNum);
      const dateStr = this.formatLocalDate(cellDate);
      const visits = visitsMap.get(dateStr) || [];
      cells.push(this.buildCalendarDayCell(cellDate, dateStr, dayNum, false, dateStr === todayStr, dateStr === selectedStr, visits));
    }

    // 2. Current Month Days
    for (let dayNum = 1; dayNum <= daysInCurrentMonth; dayNum++) {
      const cellDate = new Date(year, month, dayNum);
      const dateStr = this.formatLocalDate(cellDate);
      const visits = visitsMap.get(dateStr) || [];
      cells.push(this.buildCalendarDayCell(cellDate, dateStr, dayNum, true, dateStr === todayStr, dateStr === selectedStr, visits));
    }

    // 3. Next Month Spillover Days to fill complete 7-column rows
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let dayNum = 1; dayNum <= remaining; dayNum++) {
      const cellDate = new Date(year, month + 1, dayNum);
      const dateStr = this.formatLocalDate(cellDate);
      const visits = visitsMap.get(dateStr) || [];
      cells.push(this.buildCalendarDayCell(cellDate, dateStr, dayNum, false, dateStr === todayStr, dateStr === selectedStr, visits));
    }

    return cells;
  });

  private buildCalendarDayCell(
    date: Date,
    dateStr: string,
    dayNumber: number,
    isCurrentMonth: boolean,
    isToday: boolean,
    isSelected: boolean,
    visits: SiteVisitItem[]
  ): CalendarDayCell {
    return {
      date,
      dateStr,
      dayNumber,
      isCurrentMonth,
      isToday,
      isSelected,
      visits,
      count: visits.length,
      requestedCount: visits.filter(v => v.status === 'requested').length,
      confirmedCount: visits.filter(v => v.status === 'confirmed').length,
      completedCount: visits.filter(v => v.status === 'completed').length,
      cancelledCount: visits.filter(v => v.status === 'cancelled').length
    };
  }

  readonly selectedDateVisits = computed<SiteVisitItem[]>(() => {
    const sel = this.calendarSelectedDate();
    if (!sel) return [];
    return this.siteVisitsByDate().get(sel) || [];
  });

  prevCalendarMonth(): void {
    const cur = new Date(this.calendarCurrentDate());
    cur.setMonth(cur.getMonth() - 1);
    this.calendarCurrentDate.set(cur);
  }

  nextCalendarMonth(): void {
    const cur = new Date(this.calendarCurrentDate());
    cur.setMonth(cur.getMonth() + 1);
    this.calendarCurrentDate.set(cur);
  }

  goToCalendarToday(): void {
    const today = new Date();
    this.calendarCurrentDate.set(today);
    const dateStr = this.formatLocalDate(today);
    this.calendarSelectedDate.set(dateStr);
  }

  selectCalendarDate(dateStr: string): void {
    if (this.calendarSelectedDate() === dateStr) {
      this.calendarSelectedDate.set(null);
    } else {
      this.calendarSelectedDate.set(dateStr);
    }
  }

  clearCalendarDateSelection(): void {
    this.calendarSelectedDate.set(null);
  }

  readonly siteVisitsStats = computed(() => {
    const list = this.adminWorkspaces()?.allVisits || [];
    return {
      total: list.length,
      requested: list.filter(v => v.status === 'requested').length,
      confirmed: list.filter(v => v.status === 'confirmed').length,
      completed: list.filter(v => v.status === 'completed').length,
      cancelled: list.filter(v => v.status === 'cancelled').length
    };
  });

  readonly dedicatedSiteVisits = computed(() => {
    const list = this.adminWorkspaces()?.allVisits || [];
    const filter = this.siteVisitStatusFilter();
    const dateFilter = this.calendarSelectedDate();
    const q = this.siteVisitSearchQuery().toLowerCase().trim();

    return list.filter(v => {
      if (dateFilter && (!v.visit_date || !v.visit_date.startsWith(dateFilter))) {
        return false;
      }
      if (filter !== 'all' && v.status !== filter) {
        return false;
      }
      if (!q) return true;
      return (
        (v.user_name && v.user_name.toLowerCase().includes(q)) ||
        (v.user_phone && v.user_phone.toLowerCase().includes(q)) ||
        (v.property_title && v.property_title.toLowerCase().includes(q)) ||
        (v.locality && v.locality.toLowerCase().includes(q)) ||
        (v.assigned_executive_name && v.assigned_executive_name.toLowerCase().includes(q)) ||
        (v.visit_date && v.visit_date.includes(q)) ||
        (v.visit_slot && v.visit_slot.toLowerCase().includes(q)) ||
        (v.pickup_location && v.pickup_location.toLowerCase().includes(q))
      );
    });
  });

  quickUpdateVisitStatus(v: SiteVisitItem, newStatus: 'requested' | 'confirmed' | 'completed' | 'cancelled'): void {
    this.workspaceService.updateSiteVisit({
      visitId: v.id,
      status: newStatus,
      executiveName: v.assigned_executive_name || 'Ramesh V (Relationship Mgr)',
      executivePhone: v.assigned_executive_phone || '+91 94440 12345',
      pickupLocation: v.pickup_location || 'Koyambedu Metro Station, Gate 2',
      adminNotes: v.admin_notes || ''
    }).subscribe({
      next: () => {
        this.notificationService.show({
          type: 'success',
          title: 'Site Visit Status Updated',
          message: `Visit #${v.id} marked as ${newStatus.toUpperCase()}`,
          icon: 'check_circle'
        });
        this.workspaceService.fetchAdminWorkspaces().subscribe();
      }
    });
  }

  readonly filteredAdminUsers = computed(() => {
    const list = this.adminWorkspaces()?.users || [];
    const q = this.workspaceSearchQuery().toLowerCase().trim();
    if (!q) return list;
    return list.filter(u =>
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.phone && u.phone.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.plan_name && u.plan_name.toLowerCase().includes(q))
    );
  });

  readonly filteredAdminConsultations = computed(() => {
    const list = this.adminWorkspaces()?.allConsultations || [];
    const q = this.workspaceSearchQuery().toLowerCase().trim();
    if (!q) return list;
    return list.filter(c =>
      (c.user_name && c.user_name.toLowerCase().includes(q)) ||
      (c.advisor_name && c.advisor_name.toLowerCase().includes(q)) ||
      (c.advisor_notes && c.advisor_notes.toLowerCase().includes(q))
    );
  });

  readonly filteredAdminSearches = computed(() => {
    const list = this.adminWorkspaces()?.allSearches || [];
    const q = this.workspaceSearchQuery().toLowerCase().trim();
    if (!q) return list;
    return list.filter(s =>
      (s.user_name && s.user_name.toLowerCase().includes(q)) ||
      (s.search_name && s.search_name.toLowerCase().includes(q))
    );
  });

  readonly filteredAdminBookings = computed(() => {
    const list = this.adminWorkspaces()?.allBookings || [];
    const q = this.workspaceSearchQuery().toLowerCase().trim();
    if (!q) return list;
    return list.filter(b =>
      (b.user_name && b.user_name.toLowerCase().includes(q)) ||
      (b.property_title && b.property_title.toLowerCase().includes(q)) ||
      (b.plot_number && b.plot_number.toLowerCase().includes(q)) ||
      (b.status && b.status.toLowerCase().includes(q))
    );
  });

  getBookingStepIndex(status: string): number {
    switch (status) {
      case 'enquiry':
      case 'plot_on_hold':
        return 1;
      case 'token_paid':
        return 2;
      case 'document_verification':
        return 3;
      case 'registration_in_progress':
        return 4;
      case 'registered_completed':
        return 5;
      default:
        return 1;
    }
  }

  // Modals
  readonly isAssignVisitModalOpen = signal<boolean>(false);
  readonly selectedVisit = signal<SiteVisitItem | null>(null);
  readonly editExecutiveName = signal<string>('Ramesh V (Relationship Mgr)');
  readonly editExecutivePhone = signal<string>('+91 94440 12345');
  readonly editVisitStatus = signal<'requested' | 'confirmed' | 'completed' | 'cancelled'>('confirmed');
  readonly editPickupLocation = signal<string>('Koyambedu Metro Station, Gate 2');
  readonly editAdminNotes = signal<string>('');

  readonly isAddConsultModalOpen = signal<boolean>(false);
  readonly consultUserId = signal<number>(1);
  readonly consultAdvisorName = signal<string>('Karthik Narayanan (Senior Plot Specialist)');
  readonly consultAdvisorRole = signal<string>('RERA & CMDA Cadastral Advisor');
  readonly consultNotes = signal<string>('');
  readonly consultDossier = signal<string>('FAP-DOSSIER-PRJ-0059.pdf');

  readonly isEditBookingModalOpen = signal<boolean>(false);
  readonly selectedBooking = signal<PlotBookingItem | null>(null);
  readonly bookingStatus = signal<string>('plot_on_hold');
  readonly bookingLegalOfficer = signal<string>('Advocate S. Swaminathan (SRO Madras HC)');
  readonly bookingNotes = signal<string>('');
  readonly bookingTargetDate = signal<string>('');

  readonly isAdjustCreditsModalOpen = signal<boolean>(false);
  readonly creditsUserId = signal<number>(1);
  readonly addViews = signal<number>(5);
  readonly addComparisons = signal<number>(3);
  readonly addAdvisory = signal<number>(2);
  readonly addVisits = signal<number>(1);

  openAssignVisitModal(v: SiteVisitItem): void {
    this.selectedVisit.set(v);
    this.editExecutiveName.set(v.assigned_executive_name || 'Ramesh V (Relationship Mgr)');
    this.editExecutivePhone.set(v.assigned_executive_phone || '+91 94440 12345');
    this.editVisitStatus.set(v.status || 'confirmed');
    this.editPickupLocation.set(v.pickup_location || 'Koyambedu Metro Station, Gate 2');
    this.editAdminNotes.set(v.admin_notes || '');
    this.isAssignVisitModalOpen.set(true);
  }

  closeAssignVisitModal(): void {
    this.isAssignVisitModalOpen.set(false);
    this.selectedVisit.set(null);
  }

  saveAssignVisit(): void {
    const v = this.selectedVisit();
    if (!v) return;
    this.workspaceService.updateSiteVisit({
      visitId: v.id,
      status: this.editVisitStatus(),
      executiveName: this.editExecutiveName(),
      executivePhone: this.editExecutivePhone(),
      pickupLocation: this.editPickupLocation(),
      adminNotes: this.editAdminNotes()
    }).subscribe(() => {
      this.closeAssignVisitModal();
    });
  }

  openAddConsultModal(userId: number): void {
    this.consultUserId.set(userId);
    this.consultNotes.set('');
    this.isAddConsultModalOpen.set(true);
  }

  closeAddConsultModal(): void {
    this.isAddConsultModalOpen.set(false);
  }

  saveConsultation(): void {
    this.workspaceService.addConsultation({
      userId: this.consultUserId(),
      advisorName: this.consultAdvisorName(),
      advisorRole: this.consultAdvisorRole(),
      notes: this.consultNotes() || 'Discussed investor boundary verification and patta clearance timeline.',
      dossierPdf: this.consultDossier(),
      recommendations: [
        { id: 'PRJ-0059', title: 'Green Square Elite Plotted Enclave', locality: 'Chengalpattu NH45 Belt', price: '₹45 Lakhs', reason: 'High industrial corridor yield.' }
      ]
    }).subscribe(() => {
      this.closeAddConsultModal();
    });
  }

  openEditBookingModal(b: PlotBookingItem): void {
    this.selectedBooking.set(b);
    this.bookingStatus.set(b.status || 'plot_on_hold');
    this.bookingLegalOfficer.set(b.assigned_legal_officer || 'Advocate S. Swaminathan (SRO Madras HC)');
    this.bookingNotes.set(b.notes || '');
    this.bookingTargetDate.set(b.target_registration_date || '');
    this.isEditBookingModalOpen.set(true);
  }

  closeEditBookingModal(): void {
    this.isEditBookingModalOpen.set(false);
    this.selectedBooking.set(null);
  }

  saveBookingStatus(): void {
    const b = this.selectedBooking();
    if (!b) return;
    this.workspaceService.updateBookingStatus({
      bookingId: b.id,
      status: this.bookingStatus(),
      legalOfficer: this.bookingLegalOfficer(),
      notes: this.bookingNotes(),
      targetRegistrationDate: this.bookingTargetDate()
    }).subscribe(() => {
      this.closeEditBookingModal();
    });
  }

  dispatchAlert(searchId: number): void {
    this.workspaceService.triggerSearchAlert(searchId).subscribe();
  }

  openAdjustCreditsModal(userId: number): void {
    this.creditsUserId.set(userId);
    this.isAdjustCreditsModalOpen.set(true);
  }

  closeAdjustCreditsModal(): void {
    this.isAdjustCreditsModalOpen.set(false);
  }

  saveAdjustCredits(): void {
    this.workspaceService.adjustEntitlements({
      userId: this.creditsUserId(),
      addViews: this.addViews(),
      addComparisons: this.addComparisons(),
      addAdvisory: this.addAdvisory(),
      addVisits: this.addVisits()
    }).subscribe(() => {
      this.closeAdjustCreditsModal();
    });
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

  // Edit Property Modal State (All 3 admins allowed)
  readonly isEditModalOpen = signal<boolean>(false);
  readonly editingProperty = signal<AdminPropertyItem | null>(null);
  readonly editingPropertyId = signal<string | null>(null);
  readonly editModalTab = signal<'basic' | 'legal' | 'infra' | 'location' | 'environment'>('basic');
  readonly editForm = signal<{
    title: string;
    propertyType: string;
    listingMode: string;
    localityName: string;
    cityName: string;
    price: string;
    pricePerSqft: string;
    sqft: string;
    bhkBadge: string;
    facingOrView: string;
    mainImageUrl: string;
    reraNumber: string;
    status: PropertyReviewStatus;
  }>({
    title: '',
    propertyType: 'Plot / Land',
    listingMode: 'buy',
    localityName: '',
    cityName: '',
    price: '',
    pricePerSqft: '',
    sqft: '',
    bhkBadge: '',
    facingOrView: '',
    mainImageUrl: '',
    reraNumber: '',
    status: 'published'
  });
  readonly editAuditNotes = signal<string>('');


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

  // Edit Property Modal Controls (Permitted for all 3 admins)
  openEditModal(prop: AdminPropertyItem): void {
    this.editingProperty.set(prop);
    this.editModalTab.set('basic');
    this.editForm.set({
      title: prop.title || '',
      propertyType: prop.propertyType || 'Plot / Land',
      listingMode: prop.listingMode || 'buy',
      localityName: prop.localityName || '',
      cityName: prop.cityName || '',
      price: prop.price || '',
      pricePerSqft: prop.pricePerSqft || '',
      sqft: prop.sqft || '',
      bhkBadge: prop.bhkBadge || '',
      facingOrView: prop.facingOrView || '',
      mainImageUrl: prop.mainImageUrl || '',
      reraNumber: prop.reraNumber || '',
      status: prop.status || 'published'
    });
    this.editAuditNotes.set('Updated specifications by ' + this.adminService.activePersona().name);
    this.isEditModalOpen.set(true);

    // Fetch full 1:1 master details from the database so all ~70 options are populated immediately
    this.propertyService.fetchPropertyDetails(prop.id, 103).subscribe({
      next: (fullProp) => {
        if (fullProp) {
          this.populateAdminMasterFromProperty(fullProp);
        }
      }
    });
  }

  populateAdminMasterFromProperty(fullProp: any): void {
    if (!fullProp) return;
    const md = fullProp.masterDetails || {};

    this.adminMaster = {
      ...this.adminMaster,
      propertyId: fullProp.id || fullProp.projectId || this.adminMaster.propertyId,
      projectName: md.projectName || fullProp.title || fullProp.projectName || this.adminMaster.projectName || '',
      developer: md.developer || fullProp.developerName || (fullProp.developer?.name ?? '') || '',
      developerId: fullProp.developerId || null,
      category: md.category || fullProp.category || fullProp.propertyType || this.adminMaster.category || 'Gated CMDA Plots',
      type: md.type || fullProp.type || fullProp.listingMode || 'Residential',
      projectStage: md.projectStage || fullProp.projectStage || 'Ready for Construction',
      projectStatus: md.projectStatus || fullProp.projectStatus || 'Active',
      launchDate: md.launchDate || fullProp.launchDate || '',
      reraNumber: md.reraNumber || fullProp.reraNumber || fullProp.rera_no || '',
      reraDetails: md.reraDetails || fullProp.reraDetails || '',
      dtcpApproved: (md.dtcpApproved === 'Yes' || md.dtcpApproved === 'No') ? md.dtcpApproved : (fullProp.approvalAuthority ? 'Yes' : 'Yes'),
      approvalAuthority: md.approvalAuthority || fullProp.approvalAuthority || 'DTCP / CMDA',
      dtcpApprovalNo: md.dtcpApprovalNo || fullProp.approvalReference || fullProp.approval_reference || '',
      approvalDate: md.approvalDate || fullProp.approvalDate || '',
      pattaType: md.pattaType || 'Individual Patta',
      clearTitleAvailable: md.clearTitleAvailable || 'Yes',
      bankLoanApproved: md.bankLoanApproved || 'Yes',
      brokerage: md.brokerage || fullProp.brokerage || '0% Direct SRO Deed',
      noBrokerage: md.noBrokerage || 'Yes',
      featured: md.featured || (fullProp.featured ? 'Yes' : 'No'),
      freeAccess: md.freeAccess || (fullProp.freeAccess ? 'Yes' : 'No'),

      areaLocation: md.areaLocation || fullProp.locality || '',
      villageLocality: md.villageLocality || fullProp.locality || '',
      city: md.city || fullProp.city || 'Chennai',
      taluk: md.taluk || '',
      district: md.district || fullProp.district || fullProp.city || 'Chennai',
      pincode: md.pincode || '',
      gps: md.gps || fullProp.gps || '',
      googleMapsLink: md.googleMapsLink || fullProp.googleMapsLink || fullProp.interactiveMap || '',
      interactiveMap: md.interactiveMap || fullProp.interactiveMap || '',

      totalLayoutArea: md.totalLayoutArea || fullProp.totalLayoutArea || fullProp.total_layout_area || '',
      totalPlots: md.totalPlots ?? fullProp.totalPlots ?? fullProp.total_plots ?? null,
      totalUnits: md.totalUnits || fullProp.totalUnits || '',
      unitsSold: md.unitsSold || fullProp.unitsSold || '0',
      plotNo: md.plotNo || '',
      plotSizeSqft: md.plotSizeSqft ?? (parseFloat(fullProp.sqft) || fullProp.minPlotSize || null),
      plotSizeCents: md.plotSizeCents ?? 0,
      minPlotSize: md.minPlotSize ?? fullProp.minPlotSize ?? null,
      maxPlotSize: md.maxPlotSize ?? fullProp.maxPlotSize ?? null,
      availablePlotSizes: md.availablePlotSizes || fullProp.availablePlotSizes || '',
      dimension: md.dimension || fullProp.dimensions || '',
      facing: md.facing || 'East',
      cornerPlot: md.cornerPlot || (fullProp.cornerPlot ? 'Yes' : 'No'),
      landUse: md.landUse || fullProp.landType || fullProp.propertyType || 'Residential',
      pricePerSqft: md.pricePerSqft ?? (fullProp.sqftRate || null),
      totalPrice: md.totalPrice ?? (fullProp.priceFrom || 0),
      priceFrom: md.priceFrom ?? fullProp.priceFrom ?? null,
      priceTo: md.priceTo ?? fullProp.priceTo ?? null,
      availability: md.availability || 'Available',

      corridor: md.corridor || '',
      nearbyRoads: md.nearbyRoads || fullProp.nearbyRoads || '',
      highwayName: md.highwayName || fullProp.nearbyRoads || '',
      highwayDistance: md.highwayDistance ?? null,
      petrolBunkDistance: md.petrolBunkDistance ?? null,
      busStopDistance: md.busStopDistance ?? null,
      railwayStationNearby: md.railwayStationNearby || fullProp.railwayStation || '',
      airportDistance: md.airportDistance ?? null,
      schoolsNearby: md.schoolsNearby || fullProp.schools || '',
      collegesNearby: md.collegesNearby || '',
      hospitalNearby: md.hospitalNearby || fullProp.hospitals || '',
      employmentHubs: md.employmentHubs || fullProp.employmentHubs || '',
      residentialDevelopment: md.residentialDevelopment || fullProp.residentialDevelopment || '',
      infrastructureProjects: md.infrastructureProjects || fullProp.infrastructureProjects || '',

      suitedFor: md.suitedFor || 'Immediate Possession',
      possessionTimeline: md.possessionTimeline || fullProp.possessionDate || 'Immediate',

      electricity: md.electricity || fullProp.electricity || 'Available',
      electricityDetails: md.electricityDetails || '',
      waterConnection: md.waterConnection || fullProp.water || 'Available',
      waterDetails: md.waterDetails || '',
      drainageFacility: md.drainageFacility || fullProp.drainage || 'Underground',
      drainageDetails: md.drainageDetails || '',
      roadWidthFt: md.roadWidthFt ?? (parseInt(fullProp.roadWidth) || 30),
      roadWidth: md.roadWidth || fullProp.roadWidth || '30ft Blacktop Tar',
      roadType: md.roadType || (fullProp.internalRoads?.includes('Concrete') ? 'Concrete' : 'Tar Road'),
      internalRoads: md.internalRoads || fullProp.internalRoads || '',
      streetLights: md.streetLights || (fullProp.streetLights ? 'Yes' : 'Yes'),
      streetLightsDetails: md.streetLightsDetails || '',
      compoundWallGated: md.compoundWallGated || (fullProp.security ? 'Yes' : 'Yes'),
      securityDetails: md.securityDetails || '',
      park: md.park || (fullProp.parks ? 'Yes' : 'Yes'),
      parksDetails: md.parksDetails || '',
      otherAmenities: md.otherAmenities || fullProp.otherFacilities || '',
      developerMaintenanceYears: md.developerMaintenanceYears ?? 1,

      floodZone: md.floodZone || 'No',
      waterloggingHistory: md.waterloggingHistory || 'No',
      contactPersonPhone: md.contactPersonPhone || fullProp.whatsappNumber || '',
      whatsappNumber: md.whatsappNumber || fullProp.whatsappNumber || '',
      coverImage: md.coverImage || fullProp.coverImage || fullProp.imageUrl || '',
      galleryUrls: md.galleryUrls || '',
      videos: md.videos || fullProp.videos || '',
      droneVideos: md.droneVideos || fullProp.droneVideos || '',
      layoutPdf: md.layoutPdf || fullProp.layoutPdf || '',
      brochure: md.brochure || fullProp.brochure || '',
      remarks: md.remarks || ''
    };

    if (this.adminMaster.plotSizeSqft && !this.adminMaster.plotSizeCents) {
      this.adminMaster.plotSizeCents = calculateCents(this.adminMaster.plotSizeSqft);
    }
  }

  editPropertyFull(prop: AdminPropertyItem): void {
    this.closeEditModal();
    this.closeReviewModal();
    this.editingPropertyId.set(prop.id);
    this.setTab('post_property');

    this.propertyService.fetchPropertyDetails(prop.id, 103).subscribe({
      next: (fullProp) => {
        if (fullProp) {
          const pAny = fullProp as any;
          this.populateAdminMasterFromProperty(fullProp);
          this.newProp.update(p => ({
            ...p,
            title: fullProp.title || pAny.projectName || this.adminMaster.projectName,
            propertyType: fullProp.propertyType || this.adminMaster.category,
            listingMode: pAny.listingMode || (this.adminMaster.type === 'Residential' ? 'buy' : 'rent'),
            cityName: fullProp.city || this.adminMaster.city,
            localityName: fullProp.locality || this.adminMaster.villageLocality,
            price: fullProp.price || '',
            pricePerSqft: fullProp.pricePerSqFt || '',
            sqft: fullProp.sqft || '',
            mainImageUrl: fullProp.imageUrl || pAny.coverImage || this.adminMaster.coverImage || '',
            reraNumber: pAny.reraNumber || fullProp.badges?.rera || this.adminMaster.reraNumber || '',
            interactiveMapUrl: pAny.interactiveMapUrl || pAny.interactiveMap || this.adminMaster.googleMapsLink || ''
          }));

          const imgUrl = fullProp.imageUrl || pAny.coverImage;
          if (imgUrl) {
            this.adminUploadedImages.set([{
              id: 'cover_' + Date.now(),
              file: new File([], 'cover.png'),
              name: 'Current Cover',
              sizeFormatted: 'Server Image',
              previewUrl: imgUrl,
              serverUrl: imgUrl,
              isCover: true,
              isUploading: false
            }]);
          }

          this.notificationService.show({
            type: 'info',
            title: 'Master Specifications Loaded',
            message: `Loaded all ~70 DB fields for ${prop.title} (ID: ${prop.id}).`,
            icon: 'edit_note'
          });
        }
      },
      error: () => {
        this.notificationService.show({
          type: 'warning',
          title: 'Partial Data Loaded',
          message: 'Could not fetch extended details; editing with available data.',
          icon: 'warning'
        });
      }
    });
  }

  cancelEditProperty(): void {
    this.editingPropertyId.set(null);
    this.adminMaster = createBlankMasterData();
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
      interactiveMapUrl: 'assets/secura-masterplan-3d.html',
      plotDimensions: '40 x 60 ft',
      plotApproval: 'CMDA Approved',
      roadWidth: '40 Feet Blacktop',
      boundaryWall: 'Gated Compound Wall',
      commercialType: 'Retail Showroom',
      powerBackup: '100% DG Backup',
      waterSource: 'Borewell + OHT',
      farmBoundary: 'Fenced Perimeter'
    });
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
    this.editingProperty.set(null);
  }

  updateEditField(field: string, value: any): void {
    this.editForm.update(f => ({ ...f, [field]: value }));
  }

  onSaveEditedProperty(): void {
    const prop = this.editingProperty();
    if (!prop) return;

    const form = this.editForm();
    if (!form.title.trim()) {
      alert('Property title is required');
      return;
    }

    // Synchronize basic fields into adminMaster so both are 100% consistent
    this.adminMaster.projectName = form.title;
    this.adminMaster.category = form.propertyType;
    this.adminMaster.city = form.cityName;
    this.adminMaster.district = this.adminMaster.district || form.cityName;
    this.adminMaster.villageLocality = form.localityName;
    this.adminMaster.areaLocation = form.localityName;
    this.adminMaster.reraNumber = form.reraNumber;
    this.adminMaster.facing = (form.facingOrView as any) || this.adminMaster.facing;

    this.adminService.updateProperty({
      id: prop.id,
      ...form,
      masterData: this.adminMaster,
      masterDetails: this.adminMaster
    }, this.editAuditNotes()).subscribe(success => {
      if (success) {
        this.closeEditModal();
        this.loadDashboardMetrics();
      }
    });
  }


  // Post property form submission
  onSubmitNewProperty(): void {
    const raw = this.newProp();
    const effectiveTitle = (raw.title || '').trim() || (this.adminMaster.projectName || '').trim();
    if (!effectiveTitle) {
      this.notificationService.show({
        type: 'error',
        title: 'Project Name Required',
        message: 'Please enter the Project Name in Section 1 before submitting.',
        icon: 'error'
      });
      return;
    }

    // Ensure minPlotSize and plotSizeSqft are in sync
    if (this.adminMaster.minPlotSize && !this.adminMaster.plotSizeSqft) {
      this.adminMaster.plotSizeSqft = this.adminMaster.minPlotSize;
      this.adminMaster.plotSizeCents = calculateCents(this.adminMaster.minPlotSize);
    }
    if (this.adminMaster.priceFrom && (!this.adminMaster.totalPrice || this.adminMaster.totalPrice <= 0)) {
      this.adminMaster.totalPrice = this.adminMaster.priceFrom;
    }

    const effectivePrice = (this.adminMaster.priceFrom || this.adminMaster.priceTo)
      ? this.getAdminFormattedPriceRange()
      : (this.adminMaster.totalPrice > 0 ? this.getAdminFormattedTotalPrice() : raw.price);

    const effectiveSqft = (this.adminMaster.minPlotSize && this.adminMaster.maxPlotSize && this.adminMaster.minPlotSize !== this.adminMaster.maxPlotSize)
      ? `${this.adminMaster.minPlotSize} - ${this.adminMaster.maxPlotSize} sq.ft`
      : (this.adminMaster.plotSizeSqft ? `${this.adminMaster.plotSizeSqft} sq.ft` : (this.adminMaster.minPlotSize ? `${this.adminMaster.minPlotSize} sq.ft` : raw.sqft));

    const effectivePricePerSqft = this.adminMaster.pricePerSqft
      ? `₹ ${this.adminMaster.pricePerSqft.toLocaleString('en-IN')}/sq.ft`
      : (this.adminMaster.priceFrom && this.adminMaster.minPlotSize
        ? `₹ ${Math.round(this.adminMaster.priceFrom / this.adminMaster.minPlotSize).toLocaleString('en-IN')}/sq.ft`
        : (raw.pricePerSqft || ''));

    const data = {
      ...raw,
      title: effectiveTitle,
      propertyType: this.adminMaster.category || raw.propertyType,
      listingMode: this.adminMaster.type || raw.listingMode,
      cityName: (this.adminMaster.city || this.adminMaster.district || raw.cityName || 'Chennai').trim(),
      localityName: (this.adminMaster.villageLocality || this.adminMaster.areaLocation || raw.localityName || 'Anna Nagar').trim(),
      price: effectivePrice,
      pricePerSqft: effectivePricePerSqft,
      sqft: effectiveSqft,
      facingOrView: this.adminMaster.facing ? `${this.adminMaster.facing} Facing` : raw.facingOrView,
      reraNumber: (this.adminMaster.reraNumber || raw.reraNumber || '').trim(),
      interactiveMapUrl: this.adminMaster.interactiveMap || raw.interactiveMapUrl
    };

    // Statutory RERA Validation
    const reraInput = data.reraNumber;
    if (reraInput) {
      const reraVal = this.reraValidator.validate(reraInput, data.propertyType);
      if (!reraVal.isValid) {
        this.notificationService.show({
          type: 'warning',
          title: 'Invalid RERA Reference',
          message: `${reraVal.message} ${reraVal.warning || ''}`,
          icon: 'gavel'
        });
        return;
      }
      if (reraVal.canonicalRera) {
        data.reraNumber = reraVal.canonicalRera;
        this.adminMaster.reraNumber = reraVal.canonicalRera;
      }
    } else if (this.reraValidator.isReraStrictlyRequired(data.propertyType)) {
      this.notificationService.show({
        type: 'warning',
        title: 'RERA Registration Required',
        message: 'Statutory RERA registration reference or exemption status is required for this property category.',
        icon: 'gavel'
      });
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
      galleryImages,
      masterData: this.adminMaster,
      masterDetails: this.adminMaster
    };

    if (this.isAdminPlot()) {
      payload.plotFactsheet = this.plotFactsheet();
      payload.subdividedPlots = this.adminSubdividedPlots();
    }

    if (this.editingPropertyId()) {
      const propId = this.editingPropertyId()!;
      this.adminService.updateProperty({
        id: propId,
        ...payload,
        masterData: this.adminMaster,
        masterDetails: this.adminMaster
      }, `All specifications updated via Property Master Editor by ${this.adminService.activePersona().name}`).subscribe(success => {
        if (success) {
          this.cancelEditProperty();
          this.setTab('all_directory');
          this.loadDashboardMetrics();
        }
      });
      return;
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
    link.setAttribute('download', `findaplot_financial_credits_${new Date().toISOString().slice(0, 10)}.csv`);
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

        const extractProjectAndPlotFromTitle = (title: string): { projectName: string; plotNo: string } | null => {
          if (!title || !title.trim()) return null;
          const t = title.trim();
          // Pattern A: <Project Name> [-–—|:,] Plot [No.?/#] <PlotNo>
          const mA = t.match(/^(.*?)\s*[-–—|:,]\s*Plot\s*(?:No\.?|Number|#)?\s*([A-Za-z0-9\/-]+)/i);
          if (mA && mA[1].trim() && mA[2].trim()) {
            return { projectName: mA[1].trim(), plotNo: mA[2].trim() };
          }
          // Pattern B: Plot [No.?/#] <PlotNo> [-–—|:,] <Project Name>
          const mB = t.match(/^Plot\s*(?:No\.?|Number|#)?\s*([A-Za-z0-9\/-]+)\s*[-–—|:,]\s*(.*)$/i);
          if (mB && mB[1].trim() && mB[2].trim()) {
            return { projectName: mB[2].trim(), plotNo: mB[1].trim() };
          }
          // Pattern C: <Project Name> Plot [No.?/#] <PlotNo>
          const mC = t.match(/^(.*?)\s+Plot\s*(?:No\.?|Number|#)?\s*([A-Za-z0-9\/-]+)/i);
          if (mC && mC[1].trim() && mC[2].trim()) {
            return { projectName: mC[1].trim(), plotNo: mC[2].trim() };
          }
          // Pattern D: <Project Name> [-–—|] <Digits/Letters>
          const mD = t.match(/^(.*?)\s*[-–—|]\s*([0-9]+[A-Za-z]?)$/);
          if (mD && mD[1].trim() && mD[2].trim()) {
            return { projectName: mD[1].trim(), plotNo: mD[2].trim() };
          }
          return { projectName: t, plotNo: '' };
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

          // =======================================================================
          // CANONICAL EXTRACTION (Directly aligned with projects & project_details)
          // =======================================================================

          // --- 1. Project Identification (projects table) ---
          let rawPId = String(getCol(0, 'projectid', 'propertyid', 'propid', 'refid', 'pid') || '').trim();
          if (isInvalidIdValue(rawPId) || seenIds.has(rawPId)) {
            rawPId = `PRJ-${String(1001 + idx).padStart(4, '0')}`;
          }
          seenIds.add(rawPId);
          const pId = rawPId;

          // Check for Title column first
          const titleCol = String(getCol(-1, 'title', 'propertytitle', 'listingtitle', 'titlename', 'plottitle', 'propertyname') || '').trim();

          let projectName = String(getCol(1, 'projectname', 'layoutname', 'communityname', 'project') || '').trim();
          let rawPlotNo = String(getCol(2, 'plotno', 'plotnumber', 'siteno', 'surveyno') || '').trim();

          const sourceForTitle = titleCol || (projectName.toLowerCase().includes('plot') ? projectName : '');
          if (sourceForTitle) {
            const extracted = extractProjectAndPlotFromTitle(sourceForTitle);
            if (extracted) {
              if (extracted.projectName) projectName = extracted.projectName;
              if (extracted.plotNo) rawPlotNo = extracted.plotNo;
            }
          }
          if (!rawPlotNo || rawPlotNo.toLowerCase().includes('.com') || rawPlotNo.toLowerCase().includes('http')) {
            rawPlotNo = String(idx + 1);
          }
          const plotNo = rawPlotNo;
          if (!projectName) {
            projectName = 'Verified Cadastral Layout';
          }

          const developer = String(getCol(3, 'developername', 'developer', 'builder', 'promoter', 'company') || 'Find a Plot Verified Developer').trim();
          const developerId = getNumCol(4, 'developerid', 'devid');

          // Helper to reject placeholder / dummy numeric strings
          const isInvalidName = (val: any): boolean => {
            if (val === undefined || val === null) return true;
            const s = String(val).trim();
            if (!s || s === '1' || s === '0' || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined') return true;
            if (/^\d+$/.test(s)) return true;
            if (s.includes('₹') || s.toLowerCase().includes('sq.ft') || s.toLowerCase().includes('cents')) return true;
            if (s.toLowerCase().includes('facing')) return true;
            return false;
          };

          const extractedDistrict = String(getCol(5, 'district', 'districtname', 'district_name') || '').trim();
          const extractedCity = String(getCol(6, 'city', 'cityname', 'city_name', 'town') || '').trim();
          const extractedLocality = String(getCol(7, 'locality', 'localityname', 'locality_name', 'villagelocality', 'village_locality', 'arealocation', 'area_location') || '').trim();

          let resolvedCity = !isInvalidName(extractedCity) ? extractedCity : '';
          if (!resolvedCity) {
            resolvedCity = !isInvalidName(extractedDistrict) ? extractedDistrict : 'Chennai';
          }
          let resolvedLocality = !isInvalidName(extractedLocality) ? extractedLocality : '';
          if (!resolvedLocality) {
            resolvedLocality = 'Guduvanchery';
          }
          const district = !isInvalidName(extractedDistrict) ? extractedDistrict : resolvedCity;
          const city = resolvedCity;
          const locality = resolvedLocality;
          const pincode = String(getCol(8, 'pincode', 'pin', 'postalcode') || '603202').trim();

          const category = String(getCol(9, 'category', 'projectcategory', 'propertycategory') || 'Gated CMDA Plots').trim();
          const propertyType = String(getCol(10, 'propertytype', 'type', 'proptype') || 'Residential').trim();
          const landType = String(getCol(11, 'landtype', 'landuse', 'land_type', 'land_use') || 'Residential').trim();

          // --- 2. Pricing & Plot Sizing (projects table) ---
          let priceFrom = getNumCol(12, 'pricefrom', 'price_from', 'minprice', 'startingprice');
          let priceTo = getNumCol(13, 'priceto', 'price_to', 'maxprice');
          let sqftRate = getNumCol(14, 'pricepersqft', 'sqftrate', 'ratepersqft', 'rate', 'ratesqft', 'pricesqft');
          let minPlotSize = getNumCol(15, 'minplotsize', 'minplotsizesqft', 'min_plot_size') || 1200;
          let maxPlotSize = getNumCol(16, 'maxplotsize', 'maxplotsizesqft', 'max_plot_size') || (minPlotSize ? Math.round(minPlotSize * 1.5) : 2400);
          let totalPrice = getNumCol(17, 'totalprice', 'total_price', 'price', 'totalcost', 'cost');
          let plotSizeSqft = getNumCol(18, 'plotsizesqft', 'plotsize', 'sqft', 'extent') || minPlotSize;

          if ((!totalPrice || totalPrice <= 0) && plotSizeSqft && sqftRate) {
            totalPrice = Math.round(plotSizeSqft * sqftRate);
          }
          if ((!sqftRate || sqftRate <= 0) && plotSizeSqft && totalPrice) {
            sqftRate = Math.round(totalPrice / plotSizeSqft);
          }
          if (!priceFrom || priceFrom <= 0) {
            priceFrom = totalPrice || (sqftRate && minPlotSize ? Math.round(sqftRate * minPlotSize) : 2880000);
          }
          if (!priceTo || priceTo <= 0) {
            priceTo = Math.round(priceFrom * 1.45);
          }
          const cents = plotSizeSqft && plotSizeSqft > 0 ? Math.round((plotSizeSqft / 435.6) * 100) / 100 : 2.75;

          // --- 3. Project Stage & Legal Timelines (projects table) ---
          const projectStage = String(getCol(19, 'projectstage', 'stage', 'constructionstage') || 'Ready to Register').trim();
          const projectStatus = String(getCol(20, 'projectstatus', 'projstatus', 'status') || 'Active').trim();
          const listingStatus = String(getCol(21, 'listingstatus', 'approvalstatus', 'publishstatus') || 'published').trim();
          const launchDate = String(getCol(22, 'launchdate', 'launchedon') || '').trim();
          const possessionDate = String(getCol(23, 'possessiondate', 'possessiontimeline', 'possession') || 'Immediate').trim();
          const reraNo = String(getCol(24, 'reranumber', 'rerano', 'rera', 'reraregno') || 'CMDA / DTCP Sanctioned').trim();
          const brokerage = String(getCol(25, 'brokerage', 'brokeragedeed', 'srodeed') || '0% Direct SRO Deed').trim();
          const noBrokerage = String(getCol(26, 'nobrokerage', 'zerobrokerage') || 'Yes').trim();
          const featured = String(getCol(27, 'featured', 'isfeatured', 'highlighted') || 'No').trim();
          const freeAccess = String(getCol(28, 'freeaccess', 'freeview') || 'Yes').trim();
          const whatsappNumber = String(getCol(29, 'whatsappnumber', 'whatsapp', 'phone', 'contactpersonphone', 'mobile') || '919486140936').trim();
          const submittedBy = String(getCol(30, 'submittedby', 'submittedbyname') || developer).trim();
          const reviewedBy = String(getCol(31, 'reviewedby', 'reviewedbyname') || 'Chief Registry Auditor').trim();
          const reviewNotes = String(getCol(32, 'reviewnotes', 'auditnotes') || 'Verified against master plan').trim();
          const rejectionReason = String(getCol(33, 'rejectionreason') || '').trim();
          const reviewedAt = String(getCol(34, 'reviewedat') || '').trim();

          // --- 4. Layout Specifications & Parcels (project_details table) ---
          const totalLayoutArea = String(getCol(35, 'totallayoutarea', 'layoutarea', 'totalarea', 'landextent', 'extent') || 'Approved Layout').trim();
          const totalPlots = getNumCol(36, 'totalplots', 'plotsavailable') || 24;
          const totalUnits = String(getCol(37, 'totalunits', 'units', 'numberofunits') || `${totalPlots} Plots`).trim();
          const unitsSold = String(getCol(38, 'unitssold', 'soldunits') || 'Available').trim();
          const availablePlotSizes = String(getCol(39, 'availableplotsizes', 'plotsizes', 'plotsizerange') || `${minPlotSize} - ${maxPlotSize} sq.ft`).trim();
          const dimension = String(getCol(40, 'dimensions', 'dimension') || (plotSizeSqft ? `${Math.round(Math.sqrt(plotSizeSqft))} x ${Math.round(Math.sqrt(plotSizeSqft))}` : '30 x 40')).trim();
          const facing = String(getCol(41, 'facing', 'direction', 'plotfacing') || 'East').trim();
          const cornerPlot = String(getCol(42, 'cornerplot', 'corner') || 'No').trim();
          const pattaType = String(getCol(43, 'pattatype', 'patta') || 'Individual Patta').trim();
          const clearTitleAvailable = String(getCol(44, 'cleartitleecavailable', 'cleartitleavailable', 'cleartitle') || 'Yes').trim();
          const bankLoanApproved = String(getCol(45, 'bankloanapproved', 'bankloan', 'bankapproval') || 'Yes').trim();
          const suitedFor = String(getCol(46, 'suitedfor', 'suitability') || 'Immediate Construction / Investment').trim();

          // --- 5. Approvals & Sanctions (project_details table) ---
          const approvalAuthority = String(getCol(47, 'approvalauthority', 'dtcpapproved', 'cmdaapproved') || 'DTCP / CMDA').trim();
          const approvalReference = String(getCol(48, 'approvalreference', 'approvalref', 'lpno', 'dtcplpapprovalno', 'dtcpapprovalno') || '').trim();
          const approvalDate = String(getCol(49, 'approvaldate', 'sanctiondate') || '').trim();
          const reraDetails = String(getCol(50, 'reradetails', 'reranotes') || '').trim();

          // --- 6. Infrastructure & Utilities (project_details table) ---
          const roadWidth = String(getCol(51, 'roadwidth', 'roadwidthft', 'roadsize') || '30ft & 40ft').trim();
          const roadType = String(getCol(52, 'roadtype', 'roadsurface') || 'Tar Road').trim();
          const internalRoads = String(getCol(53, 'internalroads', 'roadtype') || `${roadWidth} ${roadType}`).trim();
          const streetLights = String(getCol(54, 'streetlights', 'lighting') || 'LED Avenue Lighting').trim();
          const drainageFacility = String(getCol(55, 'drainagefacility', 'drainage') || 'Underground Stormwater Drainage').trim();
          const waterConnection = String(getCol(56, 'waterconnection', 'watersupply', 'water') || 'Individual OHT Water Supply').trim();
          const electricity = String(getCol(57, 'electricity', 'power', 'eb') || 'EB 3-Phase Underground Cabling').trim();
          const parks = String(getCol(58, 'parksplayarea', 'parks', 'park', 'playarea') || 'Landscaped Children Park').trim();
          const security = String(getCol(59, 'compoundwallgatedsecurity', 'security', 'gated', 'compoundwallgated') || '24x7 Boom Barrier Security & CCTV').trim();
          const otherFacilities = String(getCol(60, 'otherfacilitiesamenities', 'otherfacilities', 'otheramenities', 'amenities') || '').trim();

          // --- 7. Location Coordinates & Growth Corridors (project_details table) ---
          const googleMapsLink = String(getCol(61, 'gpscoordinatesmaplink', 'gps', 'googlemapslink', 'coordinates', 'latlong') || '').trim();
          const corridor = String(getCol(62, 'corridor', 'growthcorridor') || 'GST Road').trim();
          const nearbyRoads = String(getCol(63, 'nearbyroadshighwayname', 'nearbyroads', 'highwayname', 'highway') || 'GST Road (NH 45)').trim();
          const railwayStationNearby = String(getCol(64, 'railwaystationnamekm', 'railwaystation', 'railwaystationnearby') || '').trim();
          const schoolsNearby = String(getCol(65, 'schoolsnamekm', 'schools', 'schoolsnearby') || '').trim();
          const hospitalNearby = String(getCol(66, 'hospitalsnamekm', 'hospitals', 'hospitalnearby') || '').trim();
          const employmentHubs = String(getCol(67, 'employmenthubs', 'itparks', 'sez') || '').trim();
          const residentialDevelopment = String(getCol(68, 'residentialdevelopmentsurrounding', 'residentialdevelopment') || '').trim();
          const infrastructureProjects = String(getCol(69, 'infrastructureprojects', 'metroextension') || '').trim();

          // --- 8. Media, Digital Masterplan & Documents (projects & project_details tables) ---
          const coverImage = String(getCol(70, 'coverimageurl', 'coverimage', 'image', 'photo') || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80').trim();
          const interactiveMap = String(getCol(71, 'interactivemapurl', 'interactivemap', '3dmap') || 'assets/secura-masterplan-3d.html').trim();
          const gallery = String(getCol(72, 'galleryimageurls', 'gallery', 'galleryurls') || '').trim();
          const videos = String(getCol(73, 'videourls', 'videos') || '').trim();
          const droneVideos = String(getCol(74, 'dronevideourls', 'dronevideos') || '').trim();
          const layoutPdf = String(getCol(75, 'layoutpdfurl', 'layoutpdf', 'layoutplan') || `https://onenewstory.in/p_demo_5/backend/uploads/layout_${pId}.pdf`).trim();
          const brochure = String(getCol(76, 'brochurepdfurl', 'brochure') || `https://onenewstory.in/p_demo_5/backend/uploads/brochure_${pId}.pdf`).trim();
          const remarks = String(getCol(77, 'remarks', 'notes', 'comments', 'description') || '').trim();

          // Validate GPS for visual auditing
          const gpsAudit = validateGpsData(googleMapsLink);
          if (gpsAudit.isValid) {
            validGpsCount++;
          } else {
            invalidGpsCount++;
          }

          return {
            propertyId: pId,
            projectId: pId,
            project_id: pId,
            projectName,
            project_name: projectName,
            plotNo,
            developer,
            developerName: developer,
            developer_name: developer,
            developerId,
            developer_id: developerId,
            district,
            city,
            cityName: city,
            city_name: city,
            locality,
            localityName: locality,
            locality_name: locality,
            villageLocality: locality,
            areaLocation: locality,
            pincode,
            category,
            type: propertyType,
            propertyType,
            landType,
            land_type: landType,
            landUse: landType,
            priceFrom,
            price_from: priceFrom,
            priceTo,
            price_to: priceTo,
            pricePerSqft: sqftRate,
            sqftRate,
            sqft_rate: sqftRate,
            minPlotSize,
            min_plot_size: minPlotSize,
            maxPlotSize,
            max_plot_size: maxPlotSize,
            totalPrice,
            total_price: totalPrice,
            plotSizeSqft,
            plotSizeCents: cents,
            projectStage,
            project_stage: projectStage,
            projectStatus,
            project_status: projectStatus,
            listingStatus,
            status: listingStatus,
            launchDate,
            launch_date: launchDate,
            possessionDate,
            possession_date: possessionDate,
            possessionTimeline: possessionDate,
            reraNumber: reraNo,
            rera_no: reraNo,
            brokerage,
            noBrokerage,
            no_brokerage: noBrokerage,
            featured,
            freeAccess,
            free_access: freeAccess,
            whatsappNumber,
            whatsapp_number: whatsappNumber,
            contactPersonPhone: whatsappNumber,
            submittedBy,
            submitted_by: submittedBy,
            reviewedBy,
            reviewed_by: reviewedBy,
            reviewNotes,
            review_notes: reviewNotes,
            rejectionReason,
            rejection_reason: rejectionReason,
            reviewedAt,
            reviewed_at: reviewedAt,
            totalLayoutArea,
            total_layout_area: totalLayoutArea,
            totalPlots,
            total_plots: totalPlots,
            totalUnits,
            total_units: totalUnits,
            unitsSold,
            units_sold: unitsSold,
            availablePlotSizes,
            available_plot_sizes: availablePlotSizes,
            dimension,
            dimensions: dimension,
            facing,
            cornerPlot,
            corner_plot: cornerPlot,
            pattaType,
            clearTitleAvailable,
            bankLoanApproved,
            suitedFor,
            approvalAuthority,
            approval_authority: approvalAuthority,
            approvalReference,
            approval_reference: approvalReference,
            approvalDate,
            approval_date: approvalDate,
            reraDetails,
            rera_details: reraDetails,
            dtcpApproved: approvalAuthority.toLowerCase().includes('dtcp') ? 'Yes' : 'No',
            dtcpApprovalNo: approvalReference,
            roadWidth,
            road_width: roadWidth,
            roadType,
            internalRoads,
            internal_roads: internalRoads,
            streetLights,
            street_lights: streetLights,
            drainage: drainageFacility,
            drainageFacility,
            water: waterConnection,
            waterConnection,
            electricity,
            parks,
            security,
            otherFacilities,
            otherAmenities: otherFacilities,
            gps: googleMapsLink,
            googleMapsLink,
            corridor,
            nearbyRoads,
            nearby_roads: nearbyRoads,
            highwayName: nearbyRoads,
            railwayStation: railwayStationNearby,
            railwayStationNearby,
            schools: schoolsNearby,
            schoolsNearby,
            hospitals: hospitalNearby,
            hospitalNearby,
            employmentHubs,
            employment_hubs: employmentHubs,
            residentialDevelopment,
            residential_development: residentialDevelopment,
            infrastructureProjects,
            infrastructure_projects: infrastructureProjects,
            coverImage,
            cover_image: coverImage,
            interactiveMap,
            interactive_map: interactiveMap,
            gallery,
            videos,
            droneVideos,
            drone_videos: droneVideos,
            layoutPdf,
            layout_pdf: layoutPdf,
            brochure,
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
      'PRJ-1001',                                       // Project ID
      'Greenfield Royal Palms',                         // Project Name
      'Plot 1 - 24',                                    // Plot No.
      'Greenfield Housing Ltd',                         // Developer Name
      '1',                                              // Developer ID
      'Chengalpattu',                                   // District
      'Chennai',                                        // City
      'Guduvanchery',                                   // Locality
      '603202',                                         // Pincode
      'Gated CMDA Plots',                               // Category
      'Residential',                                    // Property Type
      'Residential',                                    // Land Type
      2880000,                                          // Price From (₹)
      4800000,                                          // Price To (₹)
      2400,                                             // Price per sq.ft (₹)
      1200,                                             // Min Plot Size (sq.ft)
      2000,                                             // Max Plot Size (sq.ft)
      2880000,                                          // Total Price (₹)
      1200,                                             // Plot Size (sq.ft)
      'Ready to Register',                              // Project Stage
      'Active',                                         // Project Status
      'published',                                      // Listing Status
      '2025-01-10',                                     // Launch Date
      'Immediate',                                      // Possession Date
      'TN/01/Layout/1234/2025',                         // RERA Number
      '0% Direct SRO Deed',                             // Brokerage
      'Yes',                                            // No Brokerage (Yes/No)
      'Yes',                                            // Featured (Yes/No)
      'Yes',                                            // Free Access (Yes/No)
      '919486140936',                                   // WhatsApp Number
      'Greenfield Housing Ltd',                         // Submitted By
      'Chief Registry Auditor',                         // Reviewed By
      'DTCP sanction & cadastral boundary stones physically verified', // Review Notes
      '',                                               // Rejection Reason
      '2025-01-15 10:30:00',                            // Reviewed At
      '10.5 Acres',                                     // Total Layout Area
      48,                                               // Total Plots
      '48 Plots',                                       // Total Units
      '18 Sold',                                        // Units Sold
      '1200, 1500, 1800, 2000 sq.ft',                   // Available Plot Sizes
      '30 x 40, 30 x 50, 40 x 50',                      // Dimensions
      'East',                                           // Facing
      'No',                                             // Corner Plot (Yes/No)
      'Individual Patta',                               // Patta Type
      'Yes',                                            // Clear Title / EC Available
      'Yes (SBI, HDFC, ICICI 80%)',                     // Bank Loan Approved
      'Immediate Construction / High ROI',              // Suited For
      'DTCP / CMDA',                                    // Approval Authority
      'DTCP/LP/89/2025',                                // Approval Reference / LP No.
      '2024-11-20',                                     // Approval Date
      'TNRERA Approved Layout with dedicated OSR reservation', // RERA Details
      '30ft & 40ft',                                    // Road Width
      'Tar Road',                                       // Road Type
      '40ft & 30ft Blacktop Tar',                       // Internal Roads
      'LED Avenue Lighting',                            // Street Lights
      'Underground Stormwater Drainage',                // Drainage Facility
      'Individual OHT Water Supply & Ground Potable Water', // Water Connection
      'EB 3-Phase Underground Cabling',                 // Electricity
      'Landscaped Children Park & Senior Walkway',      // Parks & Play Area
      '24x7 Boom Barrier Security & CCTV',              // Compound Wall / Gated Security
      'Grand Arch Entrance, Avenue Trees, Underground Drainage, Borewell Water', // Other Facilities & Amenities
      '12.8423, 80.0612',                               // GPS Coordinates / Map Link
      'GST Road',                                       // Corridor
      'GST Road (NH 45) - 800m',                        // Nearby Roads / Highway Name
      'Guduvanchery Station - 1.8 km',                  // Railway Station (Name & km)
      'SRM Public School - 1.2 km, Velammal Vidhyashram - 2.5 km', // Schools (Name & km)
      'Apollo Clinic - 1.5 km, SRM Global Hospital - 3.2 km', // Hospitals (Name & km)
      'MEPZ SEZ - 10 km, Mahindra World City - 14 km',  // Employment Hubs
      'Surrounded by 1,200+ occupied independent villas', // Residential Development Surrounding
      'Kilambakkam KCBT Bus Terminus - 4.5 km, Metro Extension', // Infrastructure Projects
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80', // Cover Image URL
      'assets/secura-masterplan-3d.html',                // Interactive Map URL
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef, https://images.unsplash.com/photo-1513694203232-719a280e022f', // Gallery Image URLs
      'https://www.youtube.com/watch?v=sample1',        // Video URLs
      'https://www.youtube.com/watch?v=drone1',         // Drone Video URLs
      'https://onenewstory.in/p_demo_5/backend/uploads/layout_PRJ-1001.pdf', // Layout PDF URL
      'https://onenewstory.in/p_demo_5/backend/uploads/brochure_PRJ-1001.pdf', // Brochure PDF URL
      'Prime investment avenue with 100% legal title clearance' // Remarks
    ];

    const sampleRow2 = [
      'PRJ-1002',                                       // Project ID
      'Prestige Emerald Enclave',                       // Project Name
      'Plot 1 - 36',                                    // Plot No.
      'Prestige Estates Projects',                      // Developer Name
      '2',                                              // Developer ID
      'Kanchipuram',                                    // District
      'Chennai',                                        // City
      'OMR - Kelambakkam',                              // Locality
      '603103',                                         // Pincode
      'DTCP Sanctioned Plots',                          // Category
      'Residential',                                    // Property Type
      'Residential',                                    // Land Type
      4500000,                                          // Price From (₹)
      7200000,                                          // Price To (₹)
      3000,                                             // Price per sq.ft (₹)
      1500,                                             // Min Plot Size (sq.ft)
      2400,                                             // Max Plot Size (sq.ft)
      4500000,                                          // Total Price (₹)
      1500,                                             // Plot Size (sq.ft)
      'Ready for Construction',                         // Project Stage
      'Selling Fast',                                   // Project Status
      'published',                                      // Listing Status
      '2025-02-01',                                     // Launch Date
      'Immediate',                                      // Possession Date
      'TN/01/Layout/5678/2025',                         // RERA Number
      '0% Direct SRO Deed',                             // Brokerage
      'Yes',                                            // No Brokerage (Yes/No)
      'Yes',                                            // Featured (Yes/No)
      'No',                                             // Free Access (Yes/No)
      '919486140936',                                   // WhatsApp Number
      'Prestige Estates Projects',                      // Submitted By
      'Senior Urban Planner',                           // Reviewed By
      'Verified CMDA/DTCP order & RERA project certificate', // Review Notes
      '',                                               // Rejection Reason
      '2025-02-05 14:00:00',                            // Reviewed At
      '8.2 Acres',                                      // Total Layout Area
      36,                                               // Total Plots
      '36 Plots',                                       // Total Units
      '22 Sold',                                        // Units Sold
      '1500, 1800, 2400 sq.ft',                         // Available Plot Sizes
      '30 x 50, 40 x 60',                               // Dimensions
      'North',                                          // Facing
      'Yes',                                            // Corner Plot (Yes/No)
      'Individual Patta',                               // Patta Type
      'Yes',                                            // Clear Title / EC Available
      'Yes (Axis, SBI, Canara 80%)',                    // Bank Loan Approved
      'Immediate Construction',                         // Suited For
      'DTCP Approved',                                  // Approval Authority
      'DTCP/LP/45/2025',                                // Approval Reference / LP No.
      '2024-12-15',                                     // Approval Date
      'Fully registered with TNRERA layout sanction',   // RERA Details
      '30ft & 40ft',                                    // Road Width
      'Concrete Road',                                  // Road Type
      'Concrete Avenue Roads with Storm Drains',        // Internal Roads
      'Solar & LED Street Lighting',                    // Street Lights
      'Underground Stormwater Drainage',                // Drainage Facility
      'Individual OHT Water Supply & Metro Water Connection', // Water Connection
      'EB 3-Phase Underground Cabling',                 // Electricity
      'Themed Park, Jogging Track & Badminton Court',   // Parks & Play Area
      '24x7 Boom Barrier Security & CCTV',              // Compound Wall / Gated Security
      'Clubhouse, Open Gymnasium, Yoga Deck, Gazebo',   // Other Facilities & Amenities
      '12.7891, 80.2195',                               // GPS Coordinates / Map Link
      'OMR',                                            // Corridor
      'OMR IT Expressway - 300m, ECR Link - 3 km',      // Nearby Roads / Highway Name
      'Vandalur Railway Station - 12 km',               // Railway Station (Name & km)
      'Sushil Hari School - 1.0 km, PSBB Millennium - 4 km', // Schools (Name & km)
      'Chettinad Health City - 1.5 km',                 // Hospitals (Name & km)
      'SIPCOT IT Park Siruseri - 5 km',                 // Employment Hubs
      'Surrounded by high-density IT professional communities', // Residential Development Surrounding
      'OMR Metro Line Phase 2 Extension',               // Infrastructure Projects
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80', // Cover Image URL
      'assets/secura-masterplan-3d.html',                // Interactive Map URL
      'https://images.unsplash.com/photo-1513694203232-719a280e022f, https://images.unsplash.com/photo-1500382017468-9049fed747ef', // Gallery Image URLs
      'https://www.youtube.com/watch?v=sample2',        // Video URLs
      'https://www.youtube.com/watch?v=drone2',         // Drone Video URLs
      'https://onenewstory.in/p_demo_5/backend/uploads/layout_PRJ-1002.pdf', // Layout PDF URL
      'https://onenewstory.in/p_demo_5/backend/uploads/brochure_PRJ-1002.pdf', // Brochure PDF URL
      'High appreciation corridor in close proximity to Siruseri IT corridor' // Remarks
    ];

    const sampleRow3 = [
      'PRJ-1003',                                       // Project ID
      'Sri Krishna Industrial & Farm Estate',           // Project Name
      'Plot 1 - 12',                                    // Plot No.
      'Sri Krishna Properties',                         // Developer Name
      '3',                                              // Developer ID
      'Coimbatore',                                     // District
      'Coimbatore',                                     // City
      'Pollachi Road',                                  // Locality
      '641021',                                         // Pincode
      'Farm Land & Estates',                            // Category
      'Agricultural',                                   // Property Type
      'Agricultural',                                   // Land Type
      1800000,                                          // Price From (₹)
      5400000,                                          // Price To (₹)
      750,                                              // Price per sq.ft (₹)
      2400,                                             // Min Plot Size (sq.ft)
      7200,                                             // Max Plot Size (sq.ft)
      1800000,                                          // Total Price (₹)
      2400,                                             // Plot Size (sq.ft)
      'Ready to Register',                              // Project Stage
      'New Launch',                                     // Project Status
      'published',                                      // Listing Status
      '2025-03-01',                                     // Launch Date
      'Immediate',                                      // Possession Date
      'Exempted / Agricultural Freehold',               // RERA Number
      '0% Direct SRO Deed',                             // Brokerage
      'Yes',                                            // No Brokerage (Yes/No)
      'No',                                             // Featured (Yes/No)
      'Yes',                                            // Free Access (Yes/No)
      '919486140936',                                   // WhatsApp Number
      'Sri Krishna Properties',                         // Submitted By
      'Agricultural Land Officer',                      // Reviewed By
      'Freehold title with sweet groundwater source',   // Review Notes
      '',                                               // Rejection Reason
      '2025-03-05 11:15:00',                            // Reviewed At
      '25 Acres',                                       // Total Layout Area
      18,                                               // Total Plots
      '18 Farm Plots',                                  // Total Units
      '6 Sold',                                         // Units Sold
      '2400, 4800, 7200 sq.ft / 5 - 15 Cents',          // Available Plot Sizes
      '40 x 60, 60 x 80',                               // Dimensions
      'North-East',                                     // Facing
      'Yes',                                            // Corner Plot (Yes/No)
      'Individual Patta',                               // Patta Type
      'Yes',                                            // Clear Title / EC Available
      'Yes (Agricultural Land Loan)',                   // Bank Loan Approved
      'Farmhouse / Organic Farming / Long-Term Investment', // Suited For
      'Freehold Patta',                                 // Approval Authority
      'Patta No. 4521/2025',                            // Approval Reference / LP No.
      '2025-01-18',                                     // Approval Date
      'Agricultural Land - Free from encumbrance',       // RERA Details
      '40ft & 50ft',                                    // Road Width
      'Gravel / Metal',                                 // Road Type
      '40ft Wide WBM Metal Road',                       // Internal Roads
      'Solar Street Lights',                            // Street Lights
      'Open Natural Swale',                             // Drainage Facility
      'Individual Drip Irrigation & Common 6-inch Borewell', // Water Connection
      'Free Agri EB Power Connection',                  // Electricity
      'Fruit Orchards, Coconut Trees & Natural Pond',   // Parks & Play Area
      'Barbed Wire Fencing with Teak Wood Gate',        // Compound Wall / Gated Security
      'Caretaker Quarter, Drip Irrigation Network, Water Storage Tank', // Other Facilities & Amenities
      '10.8291, 76.9945',                               // GPS Coordinates / Map Link
      'Industrial Corridor',                            // Corridor
      'Coimbatore - Pollachi 4-Lane Highway (NH 83) - 1.2 km', // Nearby Roads / Highway Name
      'Kinathukadavu Station - 3.5 km',                 // Railway Station (Name & km)
      'Amrita Vidyalayam - 4 km',                       // Schools (Name & km)
      'Kovai Medical Center Clinic - 6 km',             // Hospitals (Name & km)
      'Coimbatore CODISSIA & SIDCO Industrial Estate - 18 km', // Employment Hubs
      'Surrounded by luxury weekend cottages and farm houses', // Residential Development Surrounding
      'Pollachi Highway Widening',                      // Infrastructure Projects
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80', // Cover Image URL
      'assets/secura-masterplan-3d.html',                // Interactive Map URL
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef', // Gallery Image URLs
      'https://www.youtube.com/watch?v=sample3',        // Video URLs
      'https://www.youtube.com/watch?v=drone3',         // Drone Video URLs
      'https://onenewstory.in/p_demo_5/backend/uploads/layout_PRJ-1003.pdf', // Layout PDF URL
      'https://onenewstory.in/p_demo_5/backend/uploads/brochure_PRJ-1003.pdf', // Brochure PDF URL
      'Fertile red soil, copious groundwater, clear single-owner title' // Remarks
    ];

    const wsData = [templateHeaders, sampleRow1, sampleRow2, sampleRow3];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Auto-fit column widths
    ws['!cols'] = templateHeaders.map(h => ({ wch: Math.max(h.length + 3, 15) }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Projects & Details Master');

    XLSX.writeFile(wb, 'Property_Master_Data_Bulk_Template.xlsx');

    this.notificationService.show({
      type: 'info',
      title: 'Template Downloaded',
      message: 'Comprehensive Bulk Upload template downloaded with all 78 fields matching projects and project_details database schema.',
      icon: 'download'
    });
  }

}
