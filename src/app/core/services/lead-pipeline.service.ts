import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, catchError } from 'rxjs';
import * as XLSX from 'xlsx';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import {
  PipelineDataResponse,
  PipelineLead,
  PipelineStageDefinition,
  PipelineStageId,
  PipelineKpis,
  PipelineStaffByRole,
  PipelineStaffMember
} from '../models/lead-pipeline.model';

@Injectable({
  providedIn: 'root'
})
export class LeadPipelineService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private readonly API_URL = `${environment.apiUrl}/admin/lead-pipeline.php`;
  private readonly FALLBACK_API_URL = 'http://localhost:8000/api/admin/lead-pipeline.php';

  // State Signals
  public readonly isLoading = signal<boolean>(false);
  public readonly loadError = signal<string | null>(null);
  public readonly pipelineData = signal<PipelineDataResponse | null>(null);
  public readonly selectedLead = signal<PipelineLead | null>(null);
  public readonly selectedStageId = signal<PipelineStageId | null>(null);
  public readonly searchQuery = signal<string>('');
  public readonly dateFromFilter = signal<string>('');
  public readonly dateToFilter = signal<string>('');

  // Computed signals
  public readonly stages = computed<PipelineStageDefinition[]>(() => {
    return this.pipelineData()?.stages ?? [];
  });

  public readonly leads = computed<PipelineLead[]>(() => {
    return this.pipelineData()?.leads ?? [];
  });

  public readonly kpis = computed<PipelineKpis | null>(() => {
    return this.pipelineData()?.kpis ?? null;
  });

  public readonly reasonBreakdown = computed<Array<{ reason: string; count: number }>>(() => {
    return this.pipelineData()?.reasonBreakdown ?? [];
  });

  public readonly staffByRole = computed<PipelineStaffByRole>(() => {
    return this.pipelineData()?.staffByRole ?? {
      sales_executive: [],
      property_advisor: [],
      operations_executive: []
    };
  });

  public readonly allStaff = computed<PipelineStaffMember[]>(() => {
    return this.pipelineData()?.allStaff ?? [];
  });

  public readonly currentAdmin = computed(() => {
    return this.authService.currentUser();
  });

  public readonly isSuperAdmin = computed<boolean>(() => {
    return this.authService.isAdmin();
  });

  /**
   * Load master pipeline data with active filters
   */
  public loadPipeline(): Observable<{ success: boolean; data: PipelineDataResponse }> {
    this.isLoading.set(true);
    this.loadError.set(null);

    const adminId = this.authService.currentUser()?.id || 103;
    let params = new HttpParams().set('admin_id', adminId.toString());

    if (this.selectedStageId()) {
      params = params.set('stage', this.selectedStageId()!);
    }
    if (this.searchQuery().trim()) {
      params = params.set('search', this.searchQuery().trim());
    }
    if (this.dateFromFilter()) {
      params = params.set('date_from', this.dateFromFilter());
    }
    if (this.dateToFilter()) {
      params = params.set('date_to', this.dateToFilter());
    }

    const tryGet = (url: string) => this.http.get<{ success: boolean; data: PipelineDataResponse }>(url, { params });

    return tryGet(`${environment.apiUrl}/admin/lead-pipeline.php`).pipe(
      catchError(() => tryGet('/P_demo_5/backend/api/admin/lead-pipeline.php')),
      catchError(() => tryGet('/p_demo_5/backend/api/admin/lead-pipeline.php')),
      catchError(() => tryGet('/api/admin/lead-pipeline.php')),
      catchError(() => tryGet(`${environment.apacheApiUrl}/admin/lead-pipeline.php`)),
      catchError(() => tryGet(this.FALLBACK_API_URL)),
      tap({
        next: (res) => {
          this.isLoading.set(false);
          if (res?.data) {
            this.loadError.set(null);
            this.pipelineData.set(res.data);
            // If a lead was previously selected, refresh its details from new list
            if (this.selectedLead()) {
              const updated = res.data.leads.find(l => l.user_id === this.selectedLead()!.user_id);
              if (updated) {
                this.selectedLead.set(updated);
              }
            }
          } else {
            this.loadError.set('Pipeline response was empty. Click retry to reload.');
          }
        },
        error: (err) => {
          this.isLoading.set(false);
          this.loadError.set('Failed to load lead pipeline. Please check connection and retry.');
          console.error('[LeadPipelineService] Failed to load pipeline:', err);
        }
      })
    );
  }

  /**
   * Transition lead to a new stage
   */
  public transitionStage(
    userId: number,
    toStage: PipelineStageId,
    options: {
      notes?: string;
      department?: string;
      preferred_location?: string;
      budget_min?: number;
      budget_max?: number;
      scheduled_visit_at?: string;
    } = {}
  ): Observable<any> {
    const adminId = this.authService.currentUser()?.id || 103;
    const payload = {
      admin_id: adminId,
      action: 'transition_stage',
      user_id: userId,
      to_stage: toStage,
      notes: options.notes || '',
      department: options.department || 'sales',
      preferred_location: options.preferred_location,
      budget_min: options.budget_min,
      budget_max: options.budget_max,
      scheduled_visit_at: options.scheduled_visit_at
    };

    return this.postPipelineAction(payload);
  }

  /**
   * Mark lead as discontinued / on-hold at any stage
   */
  public discontinueLead(
    userId: number,
    exitCategory: string,
    options: {
      competitor_name?: string;
      exit_notes?: string;
      reengage_date?: string;
    } = {}
  ): Observable<any> {
    const adminId = this.authService.currentUser()?.id || 103;
    const payload = {
      admin_id: adminId,
      action: 'discontinue_lead',
      user_id: userId,
      exit_reason_category: exitCategory,
      competitor_name: options.competitor_name || '',
      exit_notes: options.exit_notes || '',
      reengage_date: options.reengage_date || null
    };

    return this.postPipelineAction(payload);
  }

  /**
   * Revive lead back into the active funnel
   */
  public reviveLead(
    userId: number,
    restoreStage?: PipelineStageId,
    reviveNotes?: string
  ): Observable<any> {
    const adminId = this.authService.currentUser()?.id || 103;
    const payload = {
      admin_id: adminId,
      action: 'revive_lead',
      user_id: userId,
      restore_stage: restoreStage || null,
      revive_notes: reviveNotes || 'Lead reactivated by Super Admin'
    };

    return this.postPipelineAction(payload);
  }

  /**
   * Record deal as booked / converted (Won)
   */
  public convertDeal(
    userId: number,
    deal: {
      booked_property_id: string;
      plot_no: string;
      booking_amount?: number;
      final_price?: number;
      registration_date?: string;
      deal_notes?: string;
    }
  ): Observable<any> {
    const adminId = this.authService.currentUser()?.id || 103;
    const payload = {
      admin_id: adminId,
      action: 'convert_deal',
      user_id: userId,
      booked_property_id: deal.booked_property_id,
      plot_no: deal.plot_no,
      booking_amount: deal.booking_amount || null,
      final_price: deal.final_price || null,
      registration_date: deal.registration_date || null,
      deal_notes: deal.deal_notes || ''
    };

    return this.postPipelineAction(payload);
  }

  private postPipelineAction(payload: Record<string, any>): Observable<any> {
    const tryPost = (url: string) => this.http.post<any>(url, payload);

    return tryPost(`${environment.apiUrl}/admin/lead-pipeline.php`).pipe(
      catchError(() => tryPost('/P_demo_5/backend/api/admin/lead-pipeline.php')),
      catchError(() => tryPost('/p_demo_5/backend/api/admin/lead-pipeline.php')),
      catchError(() => tryPost('/api/admin/lead-pipeline.php')),
      catchError(() => tryPost(`${environment.apacheApiUrl}/admin/lead-pipeline.php`)),
      catchError(() => tryPost(this.FALLBACK_API_URL)),
      tap(() => this.loadPipeline().subscribe())
    );
  }

  /**
   * Assign or reassign a single lead or batch of leads to specific role staff
   */
  public assignLeadRole(payload: {
    user_id?: number;
    user_ids?: number[];
    role_type: 'sales' | 'advisor' | 'operations' | 'all';
    staff_id?: number | null;
    assigned_sales_id?: number | null;
    assigned_advisor_id?: number | null;
    assigned_ops_id?: number | null;
    advance_stage?: boolean;
    assignment_notes?: string;
  }): Observable<any> {
    const adminId = this.authService.currentUser()?.id || 103;
    return this.postPipelineAction({
      admin_id: adminId,
      action: 'assign_lead_role',
      ...payload
    });
  }

  /**
   * Auto-distribute selected leads round-robin across active staff in a role
   */
  public autoDistributeLeads(
    roleType: 'sales' | 'advisor' | 'operations',
    userIds: number[],
    advanceStage = false,
    assignmentNotes = ''
  ): Observable<any> {
    const adminId = this.authService.currentUser()?.id || 103;
    return this.postPipelineAction({
      admin_id: adminId,
      action: 'auto_distribute_leads',
      role_type: roleType,
      user_ids: userIds,
      advance_stage: advanceStage,
      assignment_notes: assignmentNotes
    });
  }

  /**
   * Schedule a specific callback date & time for a lead
   */
  public scheduleCallback(payload: {
    user_id: number;
    callback_date: string;
    callback_time: string;
    notes?: string;
    assigned_to?: number;
  }): Observable<any> {
    const adminId = this.authService.currentUser()?.id || 103;
    return this.postPipelineAction({
      admin_id: adminId,
      action: 'schedule_callback',
      ...payload
    });
  }

  /**
   * Mark a scheduled callback as completed
   */
  public completeCallback(userId: number, notes = ''): Observable<any> {
    const adminId = this.authService.currentUser()?.id || 103;
    return this.postPipelineAction({
      admin_id: adminId,
      action: 'complete_callback',
      user_id: userId,
      notes
    });
  }

  /**
   * Select a stage to filter leads or view step drill-down
   */
  public setStageFilter(stageId: PipelineStageId | null): void {
    this.selectedStageId.set(stageId);
    this.loadPipeline().subscribe();
  }

  /**
   * Helper to format budget in Lakhs or Crores for spreadsheet output
   */
  public formatBudgetDisplay(min: number | null, max: number | null): string {
    const minVal = Number(min) || 0;
    const maxVal = Number(max) || 0;
    const fmt = (v: number) => v >= 10000000 ? `₹${(v / 10000000).toFixed(2)} Cr` : (v >= 100000 ? `₹${(v / 100000).toFixed(1)} L` : `₹${v.toLocaleString('en-IN')}`);
    if (minVal > 0 && maxVal > 0 && maxVal !== minVal) return `${fmt(minVal)} – ${fmt(maxVal)}`;
    if (maxVal > 0) return `Up to ${fmt(maxVal)}`;
    if (minVal > 0) return `From ${fmt(minVal)}`;
    return 'Not Specified';
  }

  /**
   * Get 1-10 sequence number for a stage ID
   */
  public getStageStepNumber(stageId: string): number {
    switch (stageId) {
      case 'new_enquiry': return 1;
      case 'contact_attempted':
      case 'customer_contacted': return 2;
      case 'requirement_understood': return 3;
      case 'projects_recommended': return 4;
      case 'shortlist_completed': return 5;
      case 'site_visit_scheduled': return 6;
      case 'site_visit_completed': return 7;
      case 'booking_in_progress': return 8;
      case 'booked_converted': return 9;
      case 'lost_on_hold': return 10;
      default: return 1;
    }
  }

  /**
   * Get human readable stage title
   */
  public getStageTitleById(stageId: string): string {
    const map: Record<string, string> = {
      new_enquiry: '1. New Enquiry',
      contact_attempted: '2. Customer Contacted',
      customer_contacted: '2. Customer Contacted',
      requirement_understood: '3. Requirement Understood',
      projects_recommended: '4. Projects Recommended',
      shortlist_completed: '5. Shortlist Completed',
      site_visit_scheduled: '6. Site Visit Scheduled',
      site_visit_completed: '7. Site Visit Completed',
      booking_in_progress: '8. Booking in Progress',
      booked_converted: '9. Booked / Converted (Deal Won)',
      lost_on_hold: '10. Lost / On Hold (Discontinued)'
    };
    return map[stageId] || stageId;
  }

  /**
   * Export comprehensive pipeline process and leads to an Excel workbook (.xlsx)
   */
  public exportPipelineToExcel(
    customLeads?: PipelineLead[],
    options?: { filenamePrefix?: string; title?: string }
  ): { success: boolean; rowCount: number; filename: string } {
    const leadsToExport = customLeads && customLeads.length > 0 ? customLeads : this.leads();
    const stages = this.stages();
    const kpis = this.kpis();
    const staff = this.allStaff();
    const adminUser = this.authService.currentUser();

    // 1. Sheet 1: Master Lead Pipeline Process
    const leadRows = leadsToExport.map(l => {
      const step = this.getStageStepNumber(l.status);
      const stageTitle = this.getStageTitleById(l.status);
      let lifecycleStatus = 'Active in Funnel';
      if (l.status === 'booked_converted') {
        lifecycleStatus = 'Won / Converted';
      } else if (l.status === 'lost_on_hold' || l.discontinued_at) {
        lifecycleStatus = 'Discontinued / On Hold';
      }

      return {
        'Lead ID': l.user_id,
        'Customer Name': l.name || 'Unnamed',
        'Phone Number': l.phone || '',
        'Email Address': l.email || '',
        'User Role': l.role || 'Investor',
        'Current Stage Step': step,
        'Current Stage Title': stageTitle,
        'Lifecycle Status': lifecycleStatus,
        'Intention': l.intention || 'Investment / Buy Plot',
        'Preferred Location': l.preferred_location || 'Not Specified',
        'Min Budget (₹)': l.budget_min ? Number(l.budget_min) : '',
        'Max Budget (₹)': l.budget_max ? Number(l.budget_max) : '',
        'Budget Range': this.formatBudgetDisplay(l.budget_min, l.budget_max),
        'Assigned Sales Executive': l.assigned_sales_name || 'Unassigned',
        'Assigned Property Advisor': l.assigned_advisor_name || 'Unassigned',
        'Assigned Operations Executive': l.assigned_ops_name || 'Unassigned',
        'Plots Viewed': Number(l.viewed_properties_count) || 0,
        'Plots Shortlisted': Number(l.shortlisted_count) || 0,
        'Site Visits Count': Number(l.site_visits_count) || 0,
        'Scheduled Visit Date': l.scheduled_visit_at || '',
        'Allocated Plot No': l.plot_no || '',
        'Booking Token Amount (₹)': l.booking_amount ? Number(l.booking_amount) : '',
        'Final Deal Price (₹)': l.final_price ? Number(l.final_price) : '',
        'Registration Date': l.registration_date || '',
        'Sales Handover Notes': l.notes || '',
        'Advisor Consultation Notes': l.advisor_notes || '',
        'Operations Field Notes': l.ops_notes || '',
        'Deal Closure Notes': l.deal_notes || '',
        'Discontinuation Stage': l.exit_stage || '',
        'Discontinuation Category': l.exit_reason_category || '',
        'Competitor Name': l.competitor_name || '',
        'Discontinuation Notes': l.exit_notes || '',
        'Re-engage Follow-up Date': l.reengage_date || '',
        'Discontinued At': l.discontinued_at || '',
        'Enquiry Created At': l.user_created_at || '',
        'Last Activity At': l.last_activity_at || ''
      };
    });

    // 2. Sheet 2: 10-Stage Pipeline Process Definition & Metrics
    const stageRows = (stages.length > 0 ? stages : [
      { id: 'new_enquiry', step: 1, title: 'New enquiry', dept_label: 'Sales Desk', active_count: 0, drop_count: 0, description: 'Direct website/portal enquiries logged' },
      { id: 'customer_contacted', step: 2, title: 'Customer contacted', dept_label: 'Sales Desk', active_count: 0, drop_count: 0, description: 'Initial contact made, investor interest validated' },
      { id: 'requirement_understood', step: 3, title: 'Requirement understood', dept_label: 'Sales / Advisor', active_count: 0, drop_count: 0, description: 'Budget, location, timeline, and layout preferences recorded' },
      { id: 'projects_recommended', step: 4, title: 'Projects recommended', dept_label: 'Advisor Desk', active_count: 0, drop_count: 0, description: 'Curated DTCP approved plot projects recommended to buyer' },
      { id: 'shortlist_completed', step: 5, title: 'Shortlist completed', dept_label: 'Advisor Desk', active_count: 0, drop_count: 0, description: 'Customer confirmed top plot shortlist for ground verification' },
      { id: 'site_visit_scheduled', step: 6, title: 'Site visit scheduled', dept_label: 'Operations', active_count: 0, drop_count: 0, description: 'Field executive dispatched; cab, driver, and site timing confirmed' },
      { id: 'site_visit_completed', step: 7, title: 'Site visit completed', dept_label: 'Operations', active_count: 0, drop_count: 0, description: 'Ground visit executed, boundary pinned, feedback gathered' },
      { id: 'booking_in_progress', step: 8, title: 'Booking in progress', dept_label: 'Operations', active_count: 0, drop_count: 0, description: 'Plot held, advance token discussion and agreement drafting underway' },
      { id: 'booked_converted', step: 9, title: 'Booked / Converted', dept_label: 'Deal Won', active_count: 0, drop_count: 0, description: 'Sale deed executed, final price and booking amount confirmed' },
      { id: 'lost_on_hold', step: 10, title: 'Lost / On hold', dept_label: 'Discontinued', active_count: 0, drop_count: 0, description: 'Lead paused or discontinued with structured exit audit' }
    ]).map((s, idx) => ({
      'Step #': idx + 1,
      'Stage Name': s.title,
      'Stage Identifier': s.id,
      'Department Owner': s.dept_label || (s as any).department || '',
      'Active Leads in Stage': s.active_count ?? 0,
      'Drop-offs Recorded': s.drop_count ?? 0,
      'Process Description': s.description || ''
    }));

    // 3. Sheet 3: Funnel Overview & KPIs
    const kpiRows = [
      { 'Metric': 'Total Platform Enquiries', 'Value': kpis?.totalLeads ?? leadsToExport.length, 'Notes': 'All buyer enquiries in master pipeline' },
      { 'Metric': 'Active Leads in Funnel', 'Value': kpis?.activeInFunnel ?? 0, 'Notes': 'Currently moving through stages 1 to 8' },
      { 'Metric': 'Won Deals (Booked / Converted)', 'Value': kpis?.bookedConverted ?? 0, 'Notes': 'Successfully closed property plot transactions' },
      { 'Metric': 'Lost / On Hold Leads', 'Value': kpis?.lostOnHold ?? 0, 'Notes': 'Leads discontinued or paused with reason logged' },
      { 'Metric': 'Funnel Conversion Rate', 'Value': kpis?.conversionRate ?? '0%', 'Notes': 'Ratio of deals converted vs total leads' },
      { 'Metric': 'Discontinuation Rate', 'Value': kpis?.discontinuationRate ?? '0%', 'Notes': 'Percentage of enquiries halted/dropped' },
      { 'Metric': 'Export Generated At', 'Value': new Date().toLocaleString('en-IN'), 'Notes': 'System wall-clock timestamp' },
      { 'Metric': 'Generated By', 'Value': adminUser ? `${adminUser.name} (${adminUser.email})` : 'Super Admin', 'Notes': 'Admin authorization credentials' }
    ];

    // 4. Sheet 4: Staff Workload & Roster
    const staffRows = (staff.length > 0 ? staff : []).map(sm => {
      let roleLabel = 'Role Staff';
      if (sm.role === 'sales_executive') roleLabel = 'Sales Executive';
      else if (sm.role === 'property_advisor') roleLabel = 'Property Advisor';
      else if (sm.role === 'operations_executive') roleLabel = 'Operations Executive';
      else if (sm.role === 'admin') roleLabel = 'Administrator';

      return {
        'Role / Desk': roleLabel,
        'Staff ID': sm.id,
        'Executive Name': sm.name,
        'Email Address': sm.email,
        'Phone Number': sm.phone || '',
        'Status': sm.status || 'active',
        'Active Assigned Leads': sm.assigned_count ?? 0
      };
    });

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Sheet 1: Master Leads
    const wsLeads = XLSX.utils.json_to_sheet(leadRows.length > 0 ? leadRows : [{ 'Message': 'No leads match the selected criteria' }]);
    if (leadRows.length > 0) {
      wsLeads['!cols'] = Object.keys(leadRows[0]).map(k => ({
        wch: Math.max(k.length + 3, 14)
      }));
    }
    XLSX.utils.book_append_sheet(wb, wsLeads, 'Lead Pipeline Process');

    // Sheet 2: 10 Stages
    const wsStages = XLSX.utils.json_to_sheet(stageRows);
    wsStages['!cols'] = [
      { wch: 8 },
      { wch: 28 },
      { wch: 24 },
      { wch: 22 },
      { wch: 22 },
      { wch: 20 },
      { wch: 55 }
    ];
    XLSX.utils.book_append_sheet(wb, wsStages, '10-Step Funnel Stages');

    // Sheet 3: KPIs
    const wsKpis = XLSX.utils.json_to_sheet(kpiRows);
    wsKpis['!cols'] = [
      { wch: 32 },
      { wch: 28 },
      { wch: 45 }
    ];
    XLSX.utils.book_append_sheet(wb, wsKpis, 'Pipeline KPIs');

    // Sheet 4: Staff
    if (staffRows.length > 0) {
      const wsStaff = XLSX.utils.json_to_sheet(staffRows);
      wsStaff['!cols'] = [
        { wch: 24 },
        { wch: 10 },
        { wch: 26 },
        { wch: 30 },
        { wch: 18 },
        { wch: 12 },
        { wch: 22 }
      ];
      XLSX.utils.book_append_sheet(wb, wsStaff, 'Staff Workload');
    }

    const prefix = options?.filenamePrefix || 'FindAPlot_CRM_Lead_Pipeline_Process';
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `${prefix}_${dateStr}.xlsx`;

    XLSX.writeFile(wb, filename);

    return {
      success: true,
      rowCount: leadRows.length,
      filename
    };
  }

  /**
   * Clear all filters
   */
  public resetFilters(): void {
    this.selectedStageId.set(null);
    this.searchQuery.set('');
    this.dateFromFilter.set('');
    this.dateToFilter.set('');
    this.loadPipeline().subscribe();
  }
}
