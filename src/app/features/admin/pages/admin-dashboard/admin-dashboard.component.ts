
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
  AdvisoryConsultationItem,
  SavedSearchItem,
  PlotBookingItem
} from '../../../../core/models/workspace.model';

export type AdminActiveTab =
  | 'review_queue'
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
    AdminOperationsModalsComponent
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
  readonly router = inject(Router);
  readonly route = inject(ActivatedRoute);
  readonly personas = ADMIN_PERSONAS;

  ngOnInit(): void {
      if (!this.adminService.verifyAdminAccess()) {
        this.router.navigate(['/admin/login']);
        return;
      }

      this.loadDashboardMetrics();
      this.loadWhatsappSettings();

      this.route.queryParams.subscribe(params => {
        if (params['tab'] && ['review_queue', 'post_property', 'plot_studio', 'all_directory', 'developers', 'financials', 'user_mindset', 'bulk_upload', 'buyer_workspaces', 'subscription_buyers', 'subscription_plans', 'whatsapp_messages'].includes(params['tab'])) {
          this.setTab(params['tab'] as AdminActiveTab);
        }
      });
    }

    onSignOut(): void {
      this.adminService.logout();
      this.router.navigate(['/admin/login']);
    }

  // Active Tab View & Modern Enterprise Sidebar State
  readonly activeTab = signal<AdminActiveTab>('review_queue');
  readonly isSidebarCollapsed = signal<boolean>(false);
  readonly globalAdminSearch = signal<string>('');

  toggleSidebar(): void {
    this.isSidebarCollapsed.update(v => !v);
  }

  readonly activeTabTitle = computed<string>(() => {
    const map: Record<AdminActiveTab, string> = {
      review_queue: 'Project Review Queue',
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

  setTab(tab: AdminActiveTab): void {
    this.activeTab.set(tab);
    if (tab === 'subscription_buyers' || tab === 'whatsapp_messages') {
      this.loadDashboardMetrics();
      if (tab === 'whatsapp_messages') {
        this.loadWhatsappSettings();
      }
    }
    if (tab === 'subscription_plans') {
      this.loadSubscriptionPlans();
    }
    if (tab === 'developers') {
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
    if (tab === 'buyer_workspaces') {
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

    this.adminService.updateProperty({
      id: prop.id,
      ...form
    }, this.editAuditNotes()).subscribe(success => {
      if (success) {
        this.closeEditModal();
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

    const data = {
      ...raw,
      title: effectiveTitle,
      propertyType: this.adminMaster.category || raw.propertyType,
      listingMode: this.adminMaster.type || raw.listingMode,
      cityName: (this.adminMaster.city || this.adminMaster.district || raw.cityName || 'Chennai').trim(),
      localityName: (this.adminMaster.villageLocality || this.adminMaster.areaLocation || raw.localityName || 'Anna Nagar').trim(),
      price: this.adminMaster.totalPrice > 0 ? this.getAdminFormattedTotalPrice() : raw.price,
      pricePerSqft: this.adminMaster.pricePerSqft ? `₹ ${this.adminMaster.pricePerSqft.toLocaleString('en-IN')}/sq.ft` : raw.pricePerSqft,
      sqft: this.adminMaster.plotSizeSqft ? `${this.adminMaster.plotSizeSqft} sq.ft` : raw.sqft,
      facingOrView: this.adminMaster.facing ? `${this.adminMaster.facing} Facing` : raw.facingOrView,
      reraNumber: this.adminMaster.reraNumber || raw.reraNumber,
      interactiveMapUrl: this.adminMaster.interactiveMap || raw.interactiveMapUrl
    };

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

          // 49 Canonical Headers Extraction (0-48):
          // 0: Property ID (Ensure unique ID for every single row)
          let rawPId = String(getCol(0, 'propertyid', 'propid', 'refid', 'pid') || '').trim();
          if (isInvalidIdValue(rawPId) || seenIds.has(rawPId)) {
            rawPId = `PRJ-${String(1001 + idx).padStart(4, '0')}`;
          }
          seenIds.add(rawPId);
          const pId = rawPId;

          // 1: Developer
          const developer = String(getCol(1, 'developer', 'builder', 'promoter', 'company') || 'Find a Plot Verified Developer').trim();
          // Check for Title column first (Priority: Project Name & Plot fetched from Title column)
          const titleCol = String(getCol(-1, 'title', 'propertytitle', 'listingtitle', 'titlename', 'plottitle', 'propertyname') || '').trim();

          // 2: Project Name
          let projectName = String(getCol(2, 'projectname', 'layoutname', 'communityname', 'project') || '').trim();
          // 15: Plot No.
          let rawPlotNo = String(getCol(15, 'plotno', 'plotnumber', 'siteno', 'surveyno') || '').trim();

          // Extract Project Name & Plot from Title column or from projectName if it contains "Plot"
          const sourceForTitle = titleCol || (projectName.toLowerCase().includes('plot') ? projectName : '');
          if (sourceForTitle) {
            const extracted = extractProjectAndPlotFromTitle(sourceForTitle);
            if (extracted) {
              if (extracted.projectName) {
                projectName = extracted.projectName;
              }
              if (extracted.plotNo) {
                rawPlotNo = extracted.plotNo;
              }
            }
          }

          if (!rawPlotNo || rawPlotNo.toLowerCase().includes('.com') || rawPlotNo.toLowerCase().includes('http')) {
            rawPlotNo = String(idx + 1);
          }
          const plotNo = rawPlotNo;

          if (!projectName) {
            projectName = 'Verified Cadastral Layout';
          }
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
          // Helper to reject placeholder / dummy numeric strings
          const isInvalidName = (val: any): boolean => {
            if (val === undefined || val === null) return true;
            const s = String(val).trim();
            if (!s || s === '1' || s === '0' || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined') return true;
            if (/^\d+$/.test(s)) return true; // Single digits or numbers
            if (s.includes('₹') || s.toLowerCase().includes('sq.ft') || s.toLowerCase().includes('cents')) return true;
            if (s.toLowerCase().includes('facing')) return true;
            return false;
          };

          // 9 & 10: Locality Name (Priority: explicit column header search)
          const extractedLocality = String(getCol(-1,
            'localityname', 'locality_name', 'localitynamename', 'locality_name_name',
            'locality', 'villagelocality', 'village_locality', 'village',
            'arealocation', 'area_location', 'area', 'location'
          ) || '').trim();

          let resolvedLocality = !isInvalidName(extractedLocality) ? extractedLocality : '';
          if (!resolvedLocality) {
            const col10 = r[10] !== undefined && r[10] !== null ? String(r[10]).trim() : '';
            if (!isInvalidName(col10)) {
              resolvedLocality = col10;
            }
          }
          if (!resolvedLocality) {
            const col9 = r[9] !== undefined && r[9] !== null ? String(r[9]).trim() : '';
            if (!isInvalidName(col9)) {
              resolvedLocality = col9;
            }
          }
          if (!resolvedLocality) {
            resolvedLocality = 'Guduvanchery';
          }

          // 11 & 12: City Name & District (Priority: explicit column header search)
          const extractedCity = String(getCol(-1,
            'cityname', 'city_name', 'citynamename', 'city_name_name',
            'city', 'district', 'districtname', 'district_name', 'taluk', 'town'
          ) || '').trim();

          let resolvedCity = !isInvalidName(extractedCity) ? extractedCity : '';
          if (!resolvedCity) {
            const col12 = r[12] !== undefined && r[12] !== null ? String(r[12]).trim() : '';
            if (!isInvalidName(col12)) {
              resolvedCity = col12;
            }
          }
          if (!resolvedCity) {
            resolvedCity = 'Chennai';
          }

          const areaLocation = resolvedLocality;
          const villageLocality = resolvedLocality;
          const talukRaw = String(getCol(-1, 'taluk', 'tehsil') || '').trim();
          const taluk = !isInvalidName(talukRaw) ? talukRaw : resolvedCity;
          const district = resolvedCity;
          // 13: Pincode
          const pincode = String(getCol(13, 'pincode', 'pin', 'postalcode') || '603202').trim();
          // 14: Google Maps Link
          const googleMapsLink = String(getCol(14, 'googlemapslink', 'mapslink', 'gpslink', 'gps', 'locationlink', 'maplink', 'coordinates', 'latlong') || '').trim();
          // (Plot No already extracted and resolved)

          // 16: Plot Size (sq.ft)
          let sqft = getNumCol(16, 'plotsizesqft', 'sqft', 'plotsize', 'areainsqft', 'extent');
          let cents = sqft && sqft > 0 ? Math.round((sqft / 435.6) * 100) / 100 : 2.75;
          const dimension = sqft ? `${Math.round(Math.sqrt(sqft))} x ${Math.round(Math.sqrt(sqft))}` : '30 x 40';

          // 17: Facing
          const facing = String(getCol(17, 'facing', 'direction', 'plotfacing') || 'East').trim();
          // 18: Corner Plot
          const cornerPlot = String(getCol(18, 'cornerplot', 'corner') || 'No').trim();
          // 19: Land Use
          const landUse = String(getCol(19, 'landuse', 'landtype', 'land_use', 'land_type', 'purpose', 'zoning') || 'Residential').trim();

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
            locality_name: resolvedLocality,
            city_name: resolvedCity,
            localityName: resolvedLocality,
            cityName: resolvedCity,
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
            landType: landUse,
            land_type: landUse,
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
