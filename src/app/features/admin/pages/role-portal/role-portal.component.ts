import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AdminService } from '../../../../core/services/admin.service';
import { NotificationService } from '../../../../core/services/notification.service';

export interface RoleMeta {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  icon: string;
  title: string;
  description: string;
  route: string;
}

export const ROLE_CATALOG: Record<string, RoleMeta> = {
  sales_executive: {
    id: 'sales_executive',
    name: 'Sales Executive',
    badge: 'SALES EXECUTIVE DESK',
    badgeColor: 'indigo',
    icon: 'point_of_sale',
    title: 'Sales & Client Acquisition Workspace',
    description: 'Manage assigned buyer leads, pipeline progression, and customer follow-up schedules.',
    route: '/portal/sales'
  },
  property_advisor: {
    id: 'property_advisor',
    name: 'Property Advisor',
    badge: 'PROPERTY ADVISOR DESK',
    badgeColor: 'emerald',
    icon: 'psychology',
    title: 'Cadastral & Investment Advisory Desk',
    description: 'Manage client advisory sessions, investor risk profile matching, and legal Patta recommendations.',
    route: '/portal/advisor'
  },
  operations_executive: {
    id: 'operations_executive',
    name: 'Operations Executive',
    badge: 'OPERATIONS DESK',
    badgeColor: 'amber',
    icon: 'commute',
    title: 'Site Visit Logistics & Field Coordination',
    description: 'Coordinate physical site visits, DTCP stone marker checks, GPS surveys, and promoter scheduling.',
    route: '/portal/operations'
  },
  finance_admin: {
    id: 'finance_admin',
    name: 'Finance Admin',
    badge: 'FINANCE CONTROLLER DESK',
    badgeColor: 'teal',
    icon: 'account_balance',
    title: 'Financial Operations & Settlement Terminal',
    description: 'Audit platform revenue, Razorpay settlement streams, paid subscriptions, and broker commissions.',
    route: '/portal/finance'
  },
  content_gis_admin: {
    id: 'content_gis_admin',
    name: 'Content / GIS Admin',
    badge: 'CONTENT & GIS DESK',
    badgeColor: 'rose',
    icon: 'map',
    title: 'Spatial GIS & Visual Media Production Studio',
    description: 'Maintain locality spatial boundaries, cadastral deeds, 3D Plot Studio partitioning, and aerial drone media.',
    route: '/portal/gis'
  }
};

@Component({
  selector: 'app-role-portal',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './role-portal.component.html',
  styleUrl: './role-portal.component.css'
})
export class RolePortalComponent implements OnInit {
  readonly adminService = inject(AdminService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Active Role State
  readonly activeRole = signal<string>('sales_executive');
  readonly isSidebarCollapsed = signal<boolean>(false);
  readonly isLoading = signal<boolean>(true);

  // Telemetry data
  readonly dashboardData = signal<any>(null);
  readonly searchQuery = signal<string>('');
  readonly statusFilter = signal<string>('all');
  readonly selectedVisitorForModal = signal<any | null>(null);
  readonly isSaving = signal<boolean>(false);

  // Sales Executive Pipeline Tabs: 'unattempted' vs 'attempted'
  readonly salesActiveTab = signal<'unattempted' | 'attempted'>('unattempted');

  // Property Advisor Workspace State
  readonly advisorActiveTab = signal<'all' | 'needs_review' | 'recommended' | 'site_visit' | 'discontinued'>('all');
  readonly advisorSubView = signal<'consultations' | 'requirements' | 'patta_legal'>('consultations');
  readonly selectedConsultationForShortlist = signal<any | null>(null);
  readonly selectedConsultationForVisit = signal<any | null>(null);
  readonly selectedConsultationForDiscontinue = signal<any | null>(null);
  readonly selectedConsultationForHistory = signal<any | null>(null);
  readonly selectedRecommendPropertyId = signal<string>('');
  readonly shortlistModalSearch = signal<string>('');

  // Visit Scheduling Modal Model
  readonly visitForm = signal<{
    property_id: string;
    property_title: string;
    locality: string;
    visit_date: string;
    visit_slot: string;
    field_executive: string;
    pickup_location: string;
    advisor_notes: string;
  }>({
    property_id: '',
    property_title: '',
    locality: '',
    visit_date: '',
    visit_slot: '10:00 AM - 12:00 PM',
    field_executive: 'Karthik (Field Operations Mgr)',
    pickup_location: 'Direct at Site Gate',
    advisor_notes: ''
  });

  // Discontinue Lead Modal Model
  readonly discontinueForm = signal<{
    exit_reason_category: string;
    exit_notes: string;
    reengage_date: string;
  }>({
    exit_reason_category: 'Budget mismatch',
    exit_notes: '',
    reengage_date: ''
  });

  // Operations Executive Workspace State
  readonly opsActiveTab = signal<'all' | 'scheduled' | 'completed' | 'booking' | 'won' | 'discontinued'>('all');
  readonly opsSubView = signal<'visits' | 'gps_survey' | 'bookings'>('visits');
  readonly selectedVisitForBooking = signal<any | null>(null);
  readonly selectedVisitForDiscontinue = signal<any | null>(null);
  readonly bookingForm = signal<{
    target_stage: 'booking_in_progress' | 'booked_converted';
    booked_property_id: string;
    plot_no: string;
    booking_amount: number | null;
    final_price: number | null;
    registration_date: string;
    deal_notes: string;
    ops_notes: string;
  }>({
    target_stage: 'booking_in_progress',
    booked_property_id: '',
    plot_no: '',
    booking_amount: null,
    final_price: null,
    registration_date: '',
    deal_notes: '',
    ops_notes: ''
  });

  // Date Filter State
  readonly dateFilterPreset = signal<string>('all'); // 'all', 'today', 'yesterday', '7days', '30days', 'custom'
  readonly customFromDate = signal<string>('');
  readonly customToDate = signal<string>('');
  readonly selectedStaffFilter = signal<string>('all'); // 'all', 'unassigned', or '<staff_id>'

  // Unattempted and Attempted Counts
  readonly unattemptedCount = computed<number>(() => {
    const data = this.dashboardData();
    if (!data?.visitors || !Array.isArray(data.visitors)) return 0;
    return data.visitors.filter((v: any) => this.isVisitorUnattempted(v)).length;
  });

  readonly attemptedCount = computed<number>(() => {
    const data = this.dashboardData();
    if (!data?.visitors || !Array.isArray(data.visitors)) return 0;
    return data.visitors.filter((v: any) => !this.isVisitorUnattempted(v)).length;
  });

  readonly availableProperties = computed<any[]>(() => {
    const props = this.dashboardData()?.availableProperties || [];
    const search = this.shortlistModalSearch().trim().toLowerCase();
    if (!search) return props;
    return props.filter((p: any) =>
      (p.title && p.title.toLowerCase().includes(search)) ||
      (p.locality && p.locality.toLowerCase().includes(search)) ||
      (p.city && p.city.toLowerCase().includes(search))
    );
  });

  readonly visitPropertyOptions = computed<any[]>(() => {
    const c = this.selectedConsultationForVisit();
    const seen = new Set<string>();
    const options: any[] = [];
    const addList = (arr: any[], sourceTag: string) => {
      for (const item of arr || []) {
        const key = String(item.id || '');
        if (!key || seen.has(key)) continue;
        seen.add(key);
        options.push({ ...item, sourceTag });
      }
    };
    addList(c?.shortlisted_properties, 'Shortlisted');
    addList(c?.viewed_properties, 'Explored');
    addList(this.dashboardData()?.availableProperties, 'Verified Layout');
    return options;
  });

  readonly advisorTabCounts = computed(() => {
    const list: any[] = this.dashboardData()?.consultations || [];
    return {
      all: list.length,
      needs_review: list.filter(c => c.interaction_status === 'requirement_understood' || !c.interaction_status).length,
      recommended: list.filter(c => c.interaction_status === 'projects_recommended' || c.interaction_status === 'shortlist_completed').length,
      site_visit: list.filter(c => ['site_visit_scheduled', 'site_visit_completed', 'booking_in_progress', 'booked_converted'].includes(c.interaction_status)).length,
      discontinued: list.filter(c => c.interaction_status === 'lost_on_hold').length
    };
  });

  readonly opsTabCounts = computed(() => {
    const list: any[] = this.dashboardData()?.siteVisits || [];
    return {
      all: list.length,
      scheduled: list.filter(v => v.interaction_status === 'site_visit_scheduled' || !v.interaction_status).length,
      completed: list.filter(v => v.interaction_status === 'site_visit_completed').length,
      booking: list.filter(v => v.interaction_status === 'booking_in_progress').length,
      won: list.filter(v => v.interaction_status === 'booked_converted').length,
      discontinued: list.filter(v => v.interaction_status === 'lost_on_hold').length
    };
  });

  readonly bookingPropertyOptions = computed<any[]>(() => {
    const v = this.selectedVisitForBooking();
    const seen = new Set<string>();
    const options: any[] = [];
    const addList = (arr: any[], sourceTag: string) => {
      for (const item of arr || []) {
        const key = String(item.id || '');
        if (!key || seen.has(key)) continue;
        seen.add(key);
        options.push({ ...item, sourceTag });
      }
    };
    addList(v?.shortlisted_properties, 'Shortlisted');
    addList(v?.viewed_properties, 'Explored');
    addList(this.dashboardData()?.availableProperties, 'Verified Layout');
    return options;
  });

  isVisitorUnattempted(v: any): boolean {
    const isNew = !v.interaction_status || v.interaction_status === 'new' || v.interaction_status === 'new_enquiry';
    const noNotes = !v.notes || v.notes.trim() === '';
    return isNew && noNotes;
  }

  isTransferredToAdvisor(v: any): boolean {
    return v.interaction_status === 'transferred_advisor' ||
      v.interaction_status === 'requirement_understood' ||
      v.interaction_status === 'projects_recommended' ||
      v.interaction_status === 'shortlist_completed' ||
      !!v.transferred_at;
  }

  setDatePreset(preset: string): void {
    this.dateFilterPreset.set(preset);
    if (preset !== 'custom') {
      this.customFromDate.set('');
      this.customToDate.set('');
    }
  }

  clearCustomDates(): void {
    this.customFromDate.set('');
    this.customToDate.set('');
    this.dateFilterPreset.set('all');
  }

  private matchesDateFilter(dateStr: string | null | undefined): boolean {
    const preset = this.dateFilterPreset();
    if (preset === 'all' || !dateStr) return true;

    const itemDate = new Date(dateStr);
    if (isNaN(itemDate.getTime())) return true;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (preset === 'today') return itemDate >= todayStart;
    if (preset === 'yesterday') return itemDate >= yesterdayStart && itemDate < todayStart;
    if (preset === '7days') return itemDate >= sevenDaysAgo;
    if (preset === '30days') return itemDate >= thirtyDaysAgo;
    if (preset === 'custom') {
      const fromDate = this.customFromDate();
      const toDate = this.customToDate();
      if (fromDate && itemDate < new Date(fromDate + 'T00:00:00')) return false;
      if (toDate && itemDate > new Date(toDate + 'T23:59:59')) return false;
    }
    return true;
  }

  private matchesStaffFilter(assignedId: number | null | undefined): boolean {
    const sf = this.selectedStaffFilter();
    if (sf === 'all') return true;
    if (sf === 'unassigned') return !assignedId;
    return Number(assignedId) === Number(sf);
  }

  // Filtered Visitors for Sales Executive
  readonly filteredVisitors = computed<any[]>(() => {
    const data = this.dashboardData();
    if (!data?.visitors || !Array.isArray(data.visitors)) return [];
    const query = this.searchQuery().trim().toLowerCase();
    const activeTab = this.salesActiveTab();

    return data.visitors.filter((v: any) => {
      if (v.interaction_status === 'lost_on_hold' || v.discontinued_at) return false;
      if (!this.matchesStaffFilter(v.assigned_sales_id)) return false;
      const isUnattempted = this.isVisitorUnattempted(v);
      if (activeTab === 'unattempted' && !isUnattempted) return false;
      if (activeTab === 'attempted' && isUnattempted) return false;

      if (query) {
        const matchesQuery =
          (v.name && v.name.toLowerCase().includes(query)) ||
          (v.phone && v.phone.toLowerCase().includes(query)) ||
          (v.intention && v.intention.toLowerCase().includes(query)) ||
          (v.notes && v.notes.toLowerCase().includes(query));
        if (!matchesQuery) return false;
      }

      return this.matchesDateFilter(v.last_active);
    });
  });

  // Filtered Consultations for Property Advisor
  readonly filteredConsultations = computed<any[]>(() => {
    const list: any[] = this.dashboardData()?.consultations || [];
    const tab = this.advisorActiveTab();
    const subView = this.advisorSubView();
    const query = this.searchQuery().trim().toLowerCase();

    return list.filter((c: any) => {
      const st = c.interaction_status || 'requirement_understood';
      if (st === 'lost_on_hold' || c.discontinued_at) return false;
      if (!this.matchesStaffFilter(c.assigned_advisor_id)) return false;
      if (tab === 'needs_review' && st !== 'requirement_understood') return false;
      if (tab === 'recommended' && !['projects_recommended', 'shortlist_completed'].includes(st)) return false;
      if (tab === 'site_visit' && !['site_visit_scheduled', 'site_visit_completed', 'booking_in_progress', 'booked_converted'].includes(st)) return false;
      if (tab === 'discontinued' && st !== 'lost_on_hold') return false;

      if (subView === 'patta_legal' && st === 'lost_on_hold') return false;

      if (query) {
        const matchesQuery =
          (c.client_name && c.client_name.toLowerCase().includes(query)) ||
          (c.phone && c.phone.toLowerCase().includes(query)) ||
          (c.email && c.email.toLowerCase().includes(query)) ||
          (c.intention && c.intention.toLowerCase().includes(query)) ||
          (c.preferred_location && c.preferred_location.toLowerCase().includes(query)) ||
          (c.sales_notes && c.sales_notes.toLowerCase().includes(query)) ||
          (c.advisor_notes && c.advisor_notes.toLowerCase().includes(query));
        if (!matchesQuery) return false;
      }

      return this.matchesDateFilter(c.transferred_at || c.updated_at);
    });
  });

  // Filtered Site Visits for Operations Executive
  readonly filteredSiteVisits = computed<any[]>(() => {
    const list: any[] = this.dashboardData()?.siteVisits || [];
    const tab = this.opsActiveTab();
    const subView = this.opsSubView();
    const query = this.searchQuery().trim().toLowerCase();

    return list.filter((v: any) => {
      const st = v.interaction_status || 'site_visit_scheduled';
      if (st === 'lost_on_hold' || v.discontinued_at) return false;
      if (!this.matchesStaffFilter(v.assigned_ops_id)) return false;
      if (tab === 'scheduled' && st !== 'site_visit_scheduled') return false;
      if (tab === 'completed' && st !== 'site_visit_completed') return false;
      if (tab === 'booking' && st !== 'booking_in_progress') return false;
      if (tab === 'won' && st !== 'booked_converted') return false;
      if (tab === 'discontinued' && st !== 'lost_on_hold') return false;

      if (subView === 'bookings' && !['site_visit_completed', 'booking_in_progress', 'booked_converted'].includes(st)) {
        return false;
      }
      if (subView === 'gps_survey' && st === 'lost_on_hold') {
        return false;
      }

      if (query) {
        const matchesQuery =
          (v.visitorName && v.visitorName.toLowerCase().includes(query)) ||
          (v.visitorPhone && v.visitorPhone.toLowerCase().includes(query)) ||
          (v.propertyTitle && v.propertyTitle.toLowerCase().includes(query)) ||
          (v.locality && v.locality.toLowerCase().includes(query)) ||
          (v.fieldExecutive && v.fieldExecutive.toLowerCase().includes(query)) ||
          (v.ops_notes && v.ops_notes.toLowerCase().includes(query)) ||
          (v.advisor_notes && v.advisor_notes.toLowerCase().includes(query));
        if (!matchesQuery) return false;
      }

      return this.matchesDateFilter(v.scheduledDate || v.updated_at);
    });
  });

  // Super Admin Check
  readonly isSuperAdmin = computed<boolean>(() => {
    const admin = this.adminService.currentAdmin();
    return admin?.role === 'super_admin' || admin?.id === 104 || admin?.id === 103;
  });

  // Role Metadata Computed
  readonly currentRoleMeta = computed<RoleMeta>(() => {
    return ROLE_CATALOG[this.activeRole()] || ROLE_CATALOG['sales_executive'];
  });

  readonly allRoleOptions = Object.values(ROLE_CATALOG);

  ngOnInit(): void {
    if (!this.adminService.verifyAdminAccess()) {
      this.router.navigate(['/admin/login']);
      return;
    }
    // Determine active role from route data or URL path
    this.route.data.subscribe(data => {
      if (data && data['role']) {
        this.activeRole.set(data['role']);
      } else {
        const path = this.router.url;
        if (path.includes('/sales')) this.activeRole.set('sales_executive');
        else if (path.includes('/advisor')) this.activeRole.set('property_advisor');
        else if (path.includes('/operations')) this.activeRole.set('operations_executive');
        else if (path.includes('/finance')) this.activeRole.set('finance_admin');
        else if (path.includes('/gis')) this.activeRole.set('content_gis_admin');
        else {
          const userRole = this.adminService.currentAdmin()?.role;
          if (userRole && ROLE_CATALOG[userRole]) {
            this.activeRole.set(userRole);
          }
        }
      }
      this.selectedStaffFilter.set('all');
      this.loadDashboardData();
    });
  }

  loadDashboardData(): void {
    this.isLoading.set(true);
    this.adminService.fetchRoleDashboard(this.activeRole()).subscribe({
      next: (data) => {
        this.dashboardData.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  switchRoleView(roleId: string): void {
    const targetMeta = ROLE_CATALOG[roleId];
    if (targetMeta) {
      this.selectedStaffFilter.set('all');
      this.activeRole.set(roleId);
      this.router.navigateByUrl(targetMeta.route);
    }
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed.update(prev => !prev);
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
  }

  // Sales Executive Interactive Handlers
  openViewedPropertiesModal(visitor: any): void {
    this.selectedVisitorForModal.set(visitor);
  }

  closeViewedPropertiesModal(): void {
    this.selectedVisitorForModal.set(null);
  }

  openPhone(visitor: any): void {
    if (!visitor.phone) {
      this.notificationService.show({
        type: 'warning',
        title: 'No Phone Number',
        message: 'This user does not have a registered contact phone.',
        icon: 'phone_disabled'
      });
      return;
    }
    window.location.href = `tel:${visitor.phone}`;
    this.logOutreachAction(visitor, 'call');
  }

  openWhatsApp(visitor: any): void {
    if (!visitor.phone) {
      this.notificationService.show({
        type: 'warning',
        title: 'No Phone Number',
        message: 'Cannot launch WhatsApp without a phone number.',
        icon: 'phone_disabled'
      });
      return;
    }

    let cleanPhone = visitor.phone.replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone;
    }

    const displayName = visitor.name || visitor.client_name || 'Valued Investor';
    const firstProp = visitor.shortlisted_properties?.[0]?.title || visitor.viewed_properties?.[0]?.title || 'our featured verified plots';
    const totalProps = visitor.viewed_properties_count || visitor.viewed_properties?.length || 0;

    const message = `Hello ${displayName}, this is the FindAPlot team. We noticed you recently explored ${totalProps > 0 ? totalProps + ' plot listing(s) including ' + firstProp : 'plots on our portal'}. Would you like to schedule an assisted site visit or receive the complete legal clearance dossier?`;

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');

    this.notificationService.show({
      type: 'success',
      title: 'WhatsApp Concierge Opened',
      message: `Chat link generated for ${displayName}`,
      icon: 'chat'
    });
    this.logOutreachAction(visitor, 'whatsapp');
  }

  logOutreachAction(visitor: any, type: 'call' | 'whatsapp'): void {
    if (this.activeRole() !== 'sales_executive') {
      return;
    }
    if (!visitor.interaction_status || visitor.interaction_status === 'new') {
      visitor.interaction_status = 'contacted';
      if (!visitor.notes || visitor.notes.trim() === '') {
        visitor.notes = `${type === 'call' ? 'Phone call initiated' : 'WhatsApp concierge opened'} on ${new Date().toLocaleDateString('en-IN')}`;
      }
      this.saveLeadInteraction(visitor, `${type === 'call' ? 'Call' : 'WhatsApp'} logged - moved to Attempted`);
    }
  }

  updateVisitorStatus(visitor: any, newStatus: string): void {
    visitor.interaction_status = newStatus;
    const msg = newStatus === 'new' ? 'Status reset to New' : 'Status updated - moved to Attempted';
    this.saveLeadInteraction(visitor, msg);
  }

  updateVisitorIntention(visitor: any, newIntention: string): void {
    visitor.intention = newIntention;
    this.saveLeadInteraction(visitor, 'Intention updated');
  }

  saveVisitorNotes(visitor: any): void {
    if (!visitor.interaction_status || visitor.interaction_status === 'new') {
      visitor.interaction_status = 'contacted';
    }
    this.saveLeadInteraction(visitor, 'Call feedback & notes saved - moved to Attempted');
  }

  transferToAdvisor(visitor: any): void {
    if (!visitor.notes || visitor.notes.trim().length === 0) {
      this.notificationService.show({
        type: 'warning',
        title: 'Comments Required',
        message: 'Please add feedback/comments before moving customer to the Property Advisor team.',
        icon: 'edit_note'
      });
      return;
    }

    visitor.interaction_status = 'transferred_advisor';
    if (!visitor.intention || visitor.intention === 'Initial Exploration') {
      visitor.intention = 'Site Visit Requested';
    }

    this.isSaving.set(true);
    this.adminService.updateLeadInteraction({
      user_id: visitor.id,
      status: 'transferred_advisor',
      intention: visitor.intention,
      notes: visitor.notes
    }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.notificationService.show({
          type: 'success',
          title: 'Transferred to Property Advisor',
          message: `${visitor.name} has been moved to the Property Advisor queue with complete dossier.`,
          icon: 'transfer_within_a_station'
        });
        // Reload dashboard data so KPIs and lists update
        this.loadDashboardData();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.notificationService.show({
          type: 'error',
          title: 'Handover Failed',
          message: err?.message || 'Could not transfer customer.',
          icon: 'error'
        });
      }
    });
  }

  private saveLeadInteraction(visitor: any, successMsg: string): void {
    this.isSaving.set(true);
    this.adminService.updateLeadInteraction({
      user_id: visitor.id,
      status: visitor.interaction_status,
      intention: visitor.intention,
      notes: visitor.notes
    }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.notificationService.show({
          type: 'success',
          title: 'Lead Updated',
          message: successMsg,
          icon: 'check_circle'
        });
      },
      error: (err) => {
        this.isSaving.set(false);
        this.notificationService.show({
          type: 'error',
          title: 'Update Failed',
          message: err?.message || 'Could not update lead interaction.',
          icon: 'error'
        });
      }
    });
  }

  // =========================================================================
  // PROPERTY ADVISOR INTERACTIVE WORKSPACE HANDLERS
  // =========================================================================

  saveAdvisorConsultation(c: any, customMsg?: string, reloadAfter = false): void {
    const uid = Number(c.user_id || c.userId || c.id);
    if (!uid) return;

    this.isSaving.set(true);
    this.adminService.postRoleDashboardAction({
      action: 'update_advisor_consultation',
      user_id: uid,
      status: c.interaction_status || 'requirement_understood',
      intention: c.intention || 'Site Visit Requested',
      advisor_notes: c.advisor_notes || '',
      preferred_location: c.preferred_location || '',
      budget_min: c.budget_min !== null && c.budget_min !== undefined && c.budget_min !== '' ? Number(c.budget_min) : null,
      budget_max: c.budget_max !== null && c.budget_max !== undefined && c.budget_max !== '' ? Number(c.budget_max) : null
    }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.notificationService.show({
          type: 'success',
          title: 'Advisor Dossier Saved',
          message: customMsg || `Advisory comments & client requirements saved for ${c.client_name}.`,
          icon: 'check_circle'
        });
        if (reloadAfter) {
          this.loadDashboardData();
        } else {
          // Refresh silently to pick up new history entry and KPI counts
          this.adminService.fetchRoleDashboard(this.activeRole()).subscribe({
            next: (data) => this.dashboardData.set(data)
          });
        }
      },
      error: (err) => {
        this.isSaving.set(false);
        this.notificationService.show({
          type: 'error',
          title: 'Save Failed',
          message: err?.error?.error || err?.message || 'Could not save advisory comments.',
          icon: 'error'
        });
      }
    });
  }

  appendQuickAdvisorNote(c: any, snippet: string): void {
    const existing = (c.advisor_notes || '').trim();
    if (existing.toLowerCase().includes(snippet.toLowerCase())) return;
    c.advisor_notes = existing ? `${existing}; ${snippet}` : snippet;
  }

  updateAdvisorStage(c: any, newStage: string): void {
    if (newStage === 'lost_on_hold') {
      this.openDiscontinueModal(c);
      return;
    }
    if (newStage === 'site_visit_scheduled' && !this.isOperationsHandoverComplete(c)) {
      this.openScheduleVisitModal(c);
      return;
    }
    c.interaction_status = newStage;
    this.saveAdvisorConsultation(c, `Stage updated to ${newStage.replace(/_/g, ' ')}`, true);
  }

  updateAdvisorIntention(c: any, newIntention: string): void {
    c.intention = newIntention;
    this.saveAdvisorConsultation(c, 'Visit intention updated');
  }

  isOperationsHandoverComplete(c: any): boolean {
    const st = c.interaction_status || '';
    return ['site_visit_scheduled', 'site_visit_completed', 'booking_in_progress', 'booked_converted'].includes(st);
  }

  getAdvisorStageBadgeClass(status: string): string {
    switch (status) {
      case 'projects_recommended':
      case 'shortlist_completed':
        return 'stage-pill-advisor';
      case 'site_visit_scheduled':
      case 'site_visit_completed':
      case 'booking_in_progress':
        return 'stage-pill-ops';
      case 'booked_converted':
        return 'stage-pill-won';
      case 'lost_on_hold':
        return 'stage-pill-lost';
      default:
        return 'stage-pill-review';
    }
  }

  // Shortlist / Recommend Projects Modal
  openAdvisorShortlistModal(c: any): void {
    this.selectedConsultationForShortlist.set(c);
    this.shortlistModalSearch.set('');
    const avail = this.dashboardData()?.availableProperties || [];
    this.selectedRecommendPropertyId.set(avail.length > 0 ? String(avail[0].id) : '');
  }

  closeAdvisorShortlistModal(): void {
    this.selectedConsultationForShortlist.set(null);
  }

  isPropertyShortlisted(c: any, propertyId: string): boolean {
    const list: any[] = c?.shortlisted_properties || [];
    return list.some(item => String(item.id) === String(propertyId));
  }

  recommendPropertyForClient(c: any, propertyId: string): void {
    const pid = String(propertyId || '').trim();
    if (!pid) return;
    const uid = Number(c.user_id || c.userId || c.id);
    this.isSaving.set(true);
    this.adminService.postRoleDashboardAction({
      action: 'advisor_recommend_property',
      user_id: uid,
      property_id: pid,
      operation: 'add',
      auto_advance_stage: true
    }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.notificationService.show({
          type: 'success',
          title: 'Project Shortlisted',
          message: `Recommended plot added to ${c.client_name}'s shortlist.`,
          icon: 'bookmark_added'
        });
        this.adminService.fetchRoleDashboard(this.activeRole()).subscribe({
          next: (data) => {
            this.dashboardData.set(data);
            const updated = (data?.consultations || []).find((x: any) => Number(x.user_id) === uid);
            if (updated && this.selectedConsultationForShortlist()) {
              this.selectedConsultationForShortlist.set(updated);
            }
          }
        });
      },
      error: (err) => {
        this.isSaving.set(false);
        this.notificationService.show({
          type: 'error',
          title: 'Recommendation Failed',
          message: err?.error?.error || err?.message || 'Could not shortlist project.',
          icon: 'error'
        });
      }
    });
  }

  removeShortlistedProperty(c: any, propertyId: string): void {
    const uid = Number(c.user_id || c.userId || c.id);
    this.isSaving.set(true);
    this.adminService.postRoleDashboardAction({
      action: 'advisor_recommend_property',
      user_id: uid,
      property_id: String(propertyId),
      operation: 'remove'
    }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.notificationService.show({
          type: 'info',
          title: 'Removed from Shortlist',
          message: `Removed property from ${c.client_name}'s shortlist.`,
          icon: 'bookmark_remove'
        });
        this.adminService.fetchRoleDashboard(this.activeRole()).subscribe({
          next: (data) => {
            this.dashboardData.set(data);
            const updated = (data?.consultations || []).find((x: any) => Number(x.user_id) === uid);
            if (updated && this.selectedConsultationForShortlist()) {
              this.selectedConsultationForShortlist.set(updated);
            }
          }
        });
      },
      error: () => this.isSaving.set(false)
    });
  }

  // Schedule Site Visit & Handover to Operations Modal
  openScheduleVisitModal(c: any): void {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const defaultProp =
      c.shortlisted_properties?.[0] ||
      c.viewed_properties?.[0] ||
      this.dashboardData()?.availableProperties?.[0] ||
      { id: 'PRJ-0001', title: 'Verified Plot Inspection', locality: c.preferred_location || 'Tamil Nadu' };

    this.visitForm.set({
      property_id: String(defaultProp.id || 'PRJ-0001'),
      property_title: String(defaultProp.title || 'Verified Plot Inspection'),
      locality: String(defaultProp.locality || c.preferred_location || 'Tamil Nadu'),
      visit_date: tomorrow,
      visit_slot: '10:00 AM - 12:00 PM',
      field_executive: 'Karthik (Field Operations Mgr)',
      pickup_location: 'Direct at Site Gate',
      advisor_notes: c.advisor_notes || ''
    });
    this.selectedConsultationForVisit.set(c);
  }

  closeScheduleVisitModal(): void {
    this.selectedConsultationForVisit.set(null);
  }

  onVisitPropertySelect(propertyId: string): void {
    const c = this.selectedConsultationForVisit();
    const candidates: any[] = [
      ...(c?.shortlisted_properties || []),
      ...(c?.viewed_properties || []),
      ...(this.dashboardData()?.availableProperties || [])
    ];
    const found = candidates.find(p => String(p.id) === String(propertyId));
    this.visitForm.update(curr => ({
      ...curr,
      property_id: propertyId,
      property_title: found?.title || curr.property_title,
      locality: found?.locality || curr.locality
    }));
  }

  updateVisitFormField(field: string, value: string): void {
    this.visitForm.update(curr => ({ ...curr, [field]: value }));
  }

  submitScheduleSiteVisit(): void {
    const c = this.selectedConsultationForVisit();
    if (!c) return;

    const form = this.visitForm();
    const notesToSave = (form.advisor_notes || c.advisor_notes || '').trim();
    if (!notesToSave) {
      this.notificationService.show({
        type: 'warning',
        title: 'Advisor Comments Required',
        message: 'Please enter advisory comments or field briefing notes before handing over to Operations.',
        icon: 'edit_note'
      });
      return;
    }

    const uid = Number(c.user_id || c.userId || c.id);
    this.isSaving.set(true);
    this.adminService.postRoleDashboardAction({
      action: 'advisor_schedule_site_visit',
      user_id: uid,
      property_id: form.property_id,
      property_title: form.property_title,
      locality: form.locality,
      visit_date: form.visit_date,
      visit_slot: form.visit_slot,
      field_executive: form.field_executive,
      pickup_location: form.pickup_location,
      advisor_notes: notesToSave
    }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.selectedConsultationForVisit.set(null);
        this.notificationService.show({
          type: 'success',
          title: 'Handed Over to Operations',
          message: `Site visit scheduled for ${c.client_name} (${form.property_title} on ${form.visit_date}).`,
          icon: 'commute'
        });
        this.loadDashboardData();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.notificationService.show({
          type: 'error',
          title: 'Scheduling Failed',
          message: err?.error?.error || err?.message || 'Could not schedule site visit.',
          icon: 'error'
        });
      }
    });
  }

  // Discontinue / On-Hold Modal
  openDiscontinueModal(c: any): void {
    this.discontinueForm.set({
      exit_reason_category: c.exit_reason_category || 'Budget mismatch',
      exit_notes: c.exit_notes || c.advisor_notes || '',
      reengage_date: c.reengage_date || ''
    });
    this.selectedConsultationForDiscontinue.set(c);
  }

  closeDiscontinueModal(): void {
    this.selectedConsultationForDiscontinue.set(null);
  }

  updateDiscontinueField(field: string, value: string): void {
    this.discontinueForm.update(curr => ({ ...curr, [field]: value }));
  }

  submitDiscontinueLead(): void {
    const c = this.selectedConsultationForDiscontinue();
    if (!c) return;
    const form = this.discontinueForm();
    if (!form.exit_notes.trim()) {
      this.notificationService.show({
        type: 'warning',
        title: 'Comments Required',
        message: 'Please provide specific advisor remarks explaining why this client is on hold or lost.',
        icon: 'edit_note'
      });
      return;
    }

    const uid = Number(c.user_id || c.userId || c.id);
    this.isSaving.set(true);
    this.adminService.postRoleDashboardAction({
      action: 'advisor_discontinue_lead',
      user_id: uid,
      exit_reason_category: form.exit_reason_category,
      exit_notes: form.exit_notes.trim(),
      reengage_date: form.reengage_date || null
    }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.selectedConsultationForDiscontinue.set(null);
        this.notificationService.show({
          type: 'info',
          title: 'Client Discontinued & Moved to Admin Pipeline',
          message: `${c.client_name} is now marked On Hold / Discontinued and hidden from role queues (visible to Super Admin only).`,
          icon: 'pause_circle'
        });
        this.loadDashboardData();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.notificationService.show({
          type: 'error',
          title: 'Action Failed',
          message: err?.error?.error || err?.message || 'Could not update client status.',
          icon: 'error'
        });
      }
    });
  }

  // History Timeline Modal
  openHistoryModal(c: any): void {
    this.selectedConsultationForHistory.set(c);
  }

  closeHistoryModal(): void {
    this.selectedConsultationForHistory.set(null);
  }

  // =========================================================================
  // OPERATIONS EXECUTIVE INTERACTIVE WORKSPACE HANDLERS
  // =========================================================================

  saveOperationsVisit(v: any, customMsg?: string, reloadAfter = false): void {
    const uid = Number(v.user_id || v.userId || 0);
    if (!uid) return;

    this.isSaving.set(true);
    this.adminService.postRoleDashboardAction({
      action: 'update_operations_visit',
      user_id: uid,
      visit_id: v.visit_id || null,
      property_id: v.propertyId || 'PRJ-0001',
      property_title: v.propertyTitle || 'Verified Layout Site Visit',
      locality: v.locality || 'Tamil Nadu',
      visit_date: v.scheduledDate,
      visit_slot: v.timeSlot || '10:00 AM - 12:00 PM',
      field_executive: v.fieldExecutive || 'Karthik (Field Operations Mgr)',
      pickup_location: v.pickupLocation || 'Direct at Site Gate',
      visit_status: v.visitStatus || 'requested',
      interaction_status: v.interaction_status || 'site_visit_scheduled',
      dtcp_marker_status: v.dtcpMarkerCheck || 'Pending Survey',
      gps_coords: v.gpsCoords || '',
      ops_notes: v.ops_notes || ''
    }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.notificationService.show({
          type: 'success',
          title: 'Operations Updated',
          message: customMsg || `Site visit logistics & field comments saved for ${v.visitorName}.`,
          icon: 'check_circle'
        });
        if (reloadAfter) {
          this.loadDashboardData();
        } else {
          this.adminService.fetchRoleDashboard(this.activeRole()).subscribe({
            next: (data) => this.dashboardData.set(data)
          });
        }
      },
      error: (err) => {
        this.isSaving.set(false);
        this.notificationService.show({
          type: 'error',
          title: 'Update Failed',
          message: err?.error?.error || err?.message || 'Could not save operations update.',
          icon: 'error'
        });
      }
    });
  }

  appendQuickOpsNote(v: any, snippet: string): void {
    const existing = (v.ops_notes || '').trim();
    if (existing.toLowerCase().includes(snippet.toLowerCase())) return;
    v.ops_notes = existing ? `${existing}; ${snippet}` : snippet;
  }

  confirmSiteVisit(v: any): void {
    v.visitStatus = 'confirmed';
    v.status = 'confirmed';
    if (!v.ops_notes || v.ops_notes.trim() === '') {
      v.ops_notes = `Visit confirmed for ${v.scheduledDate} (${v.timeSlot}) with ${v.fieldExecutive}`;
    }
    this.saveOperationsVisit(v, `Visit confirmed with promoter for ${v.visitorName}`, true);
  }

  completeSiteVisit(v: any): void {
    v.visitStatus = 'completed';
    v.status = 'completed';
    v.interaction_status = 'site_visit_completed';
    if (!v.dtcpMarkerCheck || v.dtcpMarkerCheck === 'Pending Survey') {
      v.dtcpMarkerCheck = 'DTCP Stones Verified';
    }
    if (!v.ops_notes || v.ops_notes.trim() === '') {
      v.ops_notes = `Site visit completed on ${new Date().toLocaleDateString('en-IN')}; boundary stones & road access verified.`;
    }
    this.saveOperationsVisit(v, `Site visit marked Completed for ${v.visitorName}`, true);
  }

  autoFillGpsCoords(v: any): void {
    if (v.gpsCoords && v.gpsCoords.trim() !== '') return;
    v.gpsCoords = '12.8342° N, 79.7036° E';
    if (!v.dtcpMarkerCheck || v.dtcpMarkerCheck === 'Pending Survey') {
      v.dtcpMarkerCheck = 'DTCP Stones Verified';
    }
  }

  updateOpsStage(v: any, newStage: string): void {
    if (newStage === 'lost_on_hold') {
      this.openOpsDiscontinueModal(v);
      return;
    }
    if (newStage === 'booking_in_progress' || newStage === 'booked_converted') {
      this.openBookingModal(v, newStage);
      return;
    }
    v.interaction_status = newStage;
    if (newStage === 'site_visit_completed') {
      v.visitStatus = 'completed';
    }
    this.saveOperationsVisit(v, `Stage updated to ${newStage.replace(/_/g, ' ')}`, true);
  }

  getOpsStageBadgeClass(status: string): string {
    switch (status) {
      case 'site_visit_scheduled':
      case 'site_visit_completed':
      case 'booking_in_progress':
        return 'stage-pill-ops';
      case 'booked_converted':
        return 'stage-pill-won';
      case 'lost_on_hold':
        return 'stage-pill-lost';
      default:
        return 'stage-pill-ops';
    }
  }

  openBookingModal(v: any, defaultStage: 'booking_in_progress' | 'booked_converted' = 'booking_in_progress'): void {
    const today = new Date().toISOString().split('T')[0];
    this.bookingForm.set({
      target_stage: defaultStage,
      booked_property_id: String(v.booked_property_id || v.propertyId || this.dashboardData()?.availableProperties?.[0]?.id || 'PRJ-0001'),
      plot_no: v.plot_no || '',
      booking_amount: v.booking_amount ?? null,
      final_price: v.final_price ?? null,
      registration_date: v.registration_date || today,
      deal_notes: v.deal_notes || '',
      ops_notes: v.ops_notes || ''
    });
    this.selectedVisitForBooking.set(v);
  }

  closeBookingModal(): void {
    this.selectedVisitForBooking.set(null);
  }

  updateBookingField(field: string, value: any): void {
    this.bookingForm.update(curr => ({ ...curr, [field]: value }));
  }

  submitOperationsBooking(): void {
    const v = this.selectedVisitForBooking();
    if (!v) return;
    const form = this.bookingForm();
    if (!form.plot_no.trim() && !form.deal_notes.trim() && !form.ops_notes.trim()) {
      this.notificationService.show({
        type: 'warning',
        title: 'Plot or Deal Details Required',
        message: 'Enter a plot number or deal remarks before saving booking/closure.',
        icon: 'edit_note'
      });
      return;
    }

    const uid = Number(v.user_id || v.userId || 0);
    this.isSaving.set(true);
    this.adminService.postRoleDashboardAction({
      action: 'operations_update_booking',
      user_id: uid,
      target_stage: form.target_stage,
      booked_property_id: form.booked_property_id,
      plot_no: form.plot_no.trim(),
      booking_amount: form.booking_amount,
      final_price: form.final_price,
      registration_date: form.registration_date || null,
      deal_notes: form.deal_notes.trim(),
      ops_notes: form.ops_notes.trim()
    }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.selectedVisitForBooking.set(null);
        this.notificationService.show({
          type: 'success',
          title: form.target_stage === 'booked_converted' ? 'Deal Closed (Won)!' : 'Booking in Progress',
          message: `${v.visitorName} updated in Operations & Master Pipeline.`,
          icon: form.target_stage === 'booked_converted' ? 'verified' : 'handshake'
        });
        this.loadDashboardData();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.notificationService.show({
          type: 'error',
          title: 'Booking Update Failed',
          message: err?.error?.error || err?.message || 'Could not record booking/closure.',
          icon: 'error'
        });
      }
    });
  }

  openOpsDiscontinueModal(v: any): void {
    this.discontinueForm.set({
      exit_reason_category: v.exit_reason_category || 'Plot criteria mismatch',
      exit_notes: v.exit_notes || v.ops_notes || '',
      reengage_date: v.reengage_date || ''
    });
    this.selectedVisitForDiscontinue.set(v);
  }

  closeOpsDiscontinueModal(): void {
    this.selectedVisitForDiscontinue.set(null);
  }

  submitOpsDiscontinue(): void {
    const v = this.selectedVisitForDiscontinue();
    if (!v) return;
    const form = this.discontinueForm();
    if (!form.exit_notes.trim()) {
      this.notificationService.show({
        type: 'warning',
        title: 'Comments Required',
        message: 'Please provide field observations explaining why the visit/deal is on hold.',
        icon: 'edit_note'
      });
      return;
    }

    const uid = Number(v.user_id || v.userId || 0);
    this.isSaving.set(true);
    this.adminService.postRoleDashboardAction({
      action: 'operations_discontinue_lead',
      user_id: uid,
      exit_reason_category: form.exit_reason_category,
      exit_notes: form.exit_notes.trim(),
      reengage_date: form.reengage_date || null
    }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.selectedVisitForDiscontinue.set(null);
        this.notificationService.show({
          type: 'info',
          title: 'Visit Cancelled & Moved to Admin Pipeline',
          message: `${v.visitorName} is now marked On Hold / Discontinued and hidden from role queues (visible to Super Admin only).`,
          icon: 'pause_circle'
        });
        this.loadDashboardData();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.notificationService.show({
          type: 'error',
          title: 'Action Failed',
          message: err?.error?.error || err?.message || 'Could not update lead status.',
          icon: 'error'
        });
      }
    });
  }

  // Quick Action Handlers
  triggerQuickAction(actionName: string, item: any): void {
    switch (actionName) {
      case 'call':
        this.notificationService.show({
          type: 'info',
          title: 'Outbound Call Initiated',
          message: `Dialing ${item.name || item.visitorName || item.clientName} at ${item.phone || item.visitorPhone}...`,
          icon: 'call'
        });
        break;
      case 'whatsapp':
        this.notificationService.show({
          type: 'success',
          title: 'WhatsApp Concierge Dispatched',
          message: `Dossier link and message template sent to ${item.name || item.visitorName || item.clientName}`,
          icon: 'chat'
        });
        break;
      case 'confirm_visit':
        item.status = 'Confirmed';
        this.notificationService.show({
          type: 'success',
          title: 'Site Visit Confirmed',
          message: `Site visit for ${item.propertyTitle} confirmed with promoter`,
          icon: 'task_alt'
        });
        break;
      case 'verify_patta':
        this.notificationService.show({
          type: 'info',
          title: 'Patta Verification Loaded',
          message: `Cadastral survey dossier loaded for ${item.targetArea || item.name}`,
          icon: 'verified'
        });
        break;
      case 'settle_commission':
        item.status = 'Paid Out';
        this.notificationService.show({
          type: 'success',
          title: 'Commission Settled',
          message: `Settlement transaction completed for ${item.client}`,
          icon: 'payments'
        });
        break;
    }
  }

  signOut(): void {
    this.adminService.logout();
    this.router.navigate(['/admin/login']);
  }
}

