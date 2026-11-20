import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LeadPipelineService } from '../../../../core/services/lead-pipeline.service';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  PipelineLead,
  PipelineStageDefinition,
  PipelineStageId
} from '../../../../core/models/lead-pipeline.model';

@Component({
  selector: 'app-lead-pipeline-command-center',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './lead-pipeline-command-center.component.html',
  styleUrls: ['./lead-pipeline-command-center.component.css']
})
export class LeadPipelineCommandCenterComponent implements OnInit {
  public readonly pipelineService = inject(LeadPipelineService);
  private readonly notificationService = inject(NotificationService);

  // Currently highlighted/inspected stage card (separate from table filter so table stays populated initially)
  public inspectedStageId: PipelineStageId = 'requirement_understood';

  // Isolated Top-Level View Modes: 'flow' (Pipeline Flow + Cards Grid) or 'matrix' (Isolated 10-Step Progress Matrix)
  public viewMode: 'flow' | 'matrix' = this.getInitialViewMode();
  public activeTab: 'matrix' | 'cards' = this.viewMode === 'matrix' ? 'matrix' : 'cards';

  // Export State
  public isExporting = false;

  // Pagination state
  public currentPage = 1;
  public pageSize = 10;
  public readonly pageSizeOptions: number[] = [5, 10, 25, 50];

  private getInitialViewMode(): 'flow' | 'matrix' {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem('findaplot_pipeline_view_mode') : null;
      if (saved === 'matrix' || saved === 'flow') {
        return saved;
      }
    } catch {
      // Ignore storage errors
    }
    return 'flow';
  }

  public setViewMode(mode: 'flow' | 'matrix'): void {
    this.viewMode = mode;
    this.activeTab = mode === 'matrix' ? 'matrix' : 'cards';
    this.currentPage = 1;
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('findaplot_pipeline_view_mode', mode);
      }
    } catch {
      // Ignore storage errors
    }
    if (mode === 'matrix' && this.pipelineService.selectedStageId()) {
      // Clear any stage card filter when entering isolated matrix so all leads appear immediately
      this.pipelineService.setStageFilter(null);
    }
  }

  public get totalLeadsCount(): number {
    return this.pipelineService.leads().length;
  }

  public get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalLeadsCount / this.pageSize));
  }

  public get safeCurrentPage(): number {
    return Math.min(Math.max(1, this.currentPage), this.totalPages);
  }

  public get paginatedLeads(): PipelineLead[] {
    const start = (this.safeCurrentPage - 1) * this.pageSize;
    return this.pipelineService.leads().slice(start, start + this.pageSize);
  }

  public get paginationStart(): number {
    return this.totalLeadsCount === 0 ? 0 : (this.safeCurrentPage - 1) * this.pageSize + 1;
  }

  public get paginationEnd(): number {
    return Math.min(this.safeCurrentPage * this.pageSize, this.totalLeadsCount);
  }

  public get pageNumbers(): number[] {
    const total = this.totalPages;
    const current = this.safeCurrentPage;
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const start = Math.max(1, Math.min(current - 2, total - 4));
    const end = Math.min(total, start + 4);
    const pages: number[] = [];
    for (let p = start; p <= end; p++) {
      pages.push(p);
    }
    return pages;
  }

  public goToPage(page: number): void {
    const clamped = Math.min(Math.max(1, page), this.totalPages);
    this.currentPage = clamped;
  }

  public onPageSizeChange(size: number | string): void {
    const parsed = Number(size);
    if (parsed > 0) {
      this.pageSize = parsed;
      this.currentPage = 1;
    }
  }

  public onStageFilterDropdownChange(stageId: string): void {
    this.currentPage = 1;
    if (!stageId) {
      this.pipelineService.setStageFilter(null);
    } else {
      this.inspectedStageId = stageId as PipelineStageId;
      this.pipelineService.setStageFilter(stageId as PipelineStageId);
    }
  }

  public formatBudgetRange(lead: PipelineLead): string {
    const min = Number(lead.budget_min) || 0;
    const max = Number(lead.budget_max) || 0;
    const fmt = (v: number) => v >= 10000000 ? `₹${(v / 10000000).toFixed(2)} Cr` : (v >= 100000 ? `₹${(v / 100000).toFixed(1)} L` : `₹${v.toLocaleString('en-IN')}`);
    if (min > 0 && max > 0 && max !== min) return `${fmt(min)} – ${fmt(max)}`;
    if (max > 0) return `Up to ${fmt(max)}`;
    if (min > 0) return `From ${fmt(min)}`;
    return '';
  }

  // Date Preset dropdown toggle
  public isDateDropdownOpen = false;

  // Filter models
  public searchInput = '';
  public dateFrom = '';
  public dateTo = '';
  public activeDatePreset: 'all' | 'today' | 'yesterday' | 'last7' | 'last30' | 'this_month' | 'custom' = 'last30';

  // 10-Step Sequential Schema (Contact Attempted & Contacted Combined)
  public readonly orderedStages: Array<{ id: PipelineStageId; step: number; title: string; shortTitle: string; department: string }> = [
    { id: 'new_enquiry', step: 1, title: 'New enquiry', shortTitle: '1. New Enquiry', department: 'sales' },
    { id: 'customer_contacted', step: 2, title: 'Customer contacted', shortTitle: '2. Contacted', department: 'sales' },
    { id: 'requirement_understood', step: 3, title: 'Requirement understood', shortTitle: '3. Requirement', department: 'sales_advisor' },
    { id: 'projects_recommended', step: 4, title: 'Projects recommended', shortTitle: '4. Recommended', department: 'property_advisor' },
    { id: 'shortlist_completed', step: 5, title: 'Shortlist completed', shortTitle: '5. Shortlist', department: 'property_advisor' },
    { id: 'site_visit_scheduled', step: 6, title: 'Site visit scheduled', shortTitle: '6. Visit Sched.', department: 'operations' },
    { id: 'site_visit_completed', step: 7, title: 'Site visit completed', shortTitle: '7. Visit Done', department: 'operations' },
    { id: 'booking_in_progress', step: 8, title: 'Booking in progress', shortTitle: '8. Booking', department: 'operations' },
    { id: 'booked_converted', step: 9, title: 'Booked / Converted', shortTitle: '9. Deal Won', department: 'closing' },
    { id: 'lost_on_hold', step: 10, title: 'Lost / On hold', shortTitle: '10. Lost / Hold', department: 'terminal' }
  ];

  // Active Modals & Drawers
  public isDetailDrawerOpen = false;
  public activeLeadForDetail: PipelineLead | null = null;

  // Discontinue Modal
  public isDiscontinueModalOpen = false;
  public targetLeadForDiscontinue: PipelineLead | null = null;
  public selectedExitCategory = 'Budget mismatch';
  public competitorName = '';
  public exitNotes = '';
  public reengageDate = '';

  public readonly exitCategories = [
    'Budget mismatch',
    'Bank loan rejected',
    'Disliked layout location / Ground reality',
    'Legal / Patta clearance concerns',
    'Competitor project booked',
    'Postponed / Personal emergency',
    'Unreachable / Fake inquiry'
  ];

  // Convert Deal Modal
  public isConvertModalOpen = false;
  public targetLeadForConvert: PipelineLead | null = null;
  public convertPropertyId = '';
  public convertPlotNo = '';
  public convertBookingAmount: number | null = null;
  public convertFinalPrice: number | null = null;
  public convertRegDate = '';
  public convertDealNotes = '';

  // Stage Transition Quick Select
  public isTransitionModalOpen = false;
  public targetLeadForTransition: PipelineLead | null = null;
  public transitionTargetStage: PipelineStageId = 'customer_contacted';
  public transitionNotes = '';
  public transitionLocation = '';
  public transitionBudgetMin: number | null = null;
  public transitionBudgetMax: number | null = null;
  public transitionVisitDate = '';

  // Schedule Callback Modal State
  public isCallbackModalOpen = false;
  public targetLeadForCallback: PipelineLead | null = null;
  public callbackDate = '';
  public callbackTime = '11:00';
  public callbackNotes = '';

  ngOnInit(): void {
    this.pipelineService.loadPipeline().subscribe({
      next: () => {
        // Pick customer_contacted if it has active leads, otherwise requirement_understood (without filtering table)
        const stages = this.pipelineService.stages();
        const contacted = stages.find(s => s.id === 'customer_contacted' && s.active_count > 0);
        if (contacted) {
          this.inspectedStageId = contacted.id;
        } else if (stages.length > 2) {
          this.inspectedStageId = stages[2].id;
        }
      }
    });
  }

  public get selectedStage(): PipelineStageDefinition | null {
    const selectedId = this.pipelineService.selectedStageId() || this.inspectedStageId;
    const stages = this.pipelineService.stages();
    if (!stages.length) return null;
    return stages.find(s => s.id === selectedId) || stages[0];
  }

  public get activeStageHighlightId(): PipelineStageId {
    return this.pipelineService.selectedStageId() || this.inspectedStageId;
  }

  public getStageIcon(stageId: string): string {
    switch (stageId) {
      case 'new_enquiry': return 'mail';
      case 'contact_attempted': return 'call';
      case 'customer_contacted': return 'forum';
      case 'requirement_understood': return 'description';
      case 'projects_recommended': return 'lightbulb';
      case 'shortlist_completed': return 'layers';
      case 'site_visit_scheduled': return 'calendar_month';
      case 'site_visit_completed': return 'pin_drop';
      case 'booking_in_progress': return 'receipt_long';
      case 'booked_converted': return 'check_circle';
      case 'lost_on_hold': return 'cancel';
      default: return 'radio_button_checked';
    }
  }

  /**
   * 10-Step CRM progression scale (10%, 20%, ..., 100%)
   */
  public getStepPercentage(stepNum: number): string {
    const clamped = Math.max(1, Math.min(10, stepNum));
    return `${clamped * 10}%`;
  }

  /**
   * Unfiltered count of leads that reached or passed step number (1 to 9) based on stages().
   */
  public getLeadsCountReachingStep(stepNum: number): number {
    const stages = this.pipelineService.stages();
    if (!stages || stages.length === 0) return 0;
    let total = 0;
    for (const stg of stages) {
      if (stg.id === 'lost_on_hold') continue;
      if (stg.step >= stepNum) {
        total += (stg.active_count || 0) + (stg.drop_count || 0);
      }
    }
    return total;
  }

  /**
   * Live step-to-step conversion rate computed from unfiltered stages().
   */
  public getRealStageConversionRate(stepNum: number): string {
    const stages = this.pipelineService.stages();
    if (!stages || stages.length === 0) {
      return this.getStepPercentage(stepNum);
    }

    const currentCount = this.getLeadsCountReachingStep(stepNum);
    const nextCount = this.getLeadsCountReachingStep(stepNum + 1);

    if (currentCount === 0) {
      return '0%';
    }

    const rate = Math.round((nextCount / currentCount) * 100);
    return `${rate}%`;
  }

  /**
   * Live pipeline retention / reach percentage from unfiltered stages().
   */
  public getRealStagePipelineShare(stepNum: number): string {
    const kpiTotal = this.pipelineService.kpis()?.totalLeads ?? 0;
    const total = kpiTotal > 0 ? kpiTotal : this.getLeadsCountReachingStep(1);
    if (total === 0) {
      return this.getStepPercentage(stepNum);
    }

    if (stepNum === 10) {
      const lostCount = this.pipelineService.kpis()?.lostOnHold ?? 0;
      return `${Math.round((lostCount / total) * 100)}%`;
    }

    const reachedCount = this.getLeadsCountReachingStep(stepNum);
    return `${Math.round((reachedCount / total) * 100)}%`;
  }

  /**
   * Milestone Journey Progress % (100% divided cleanly across steps: 10%, 20%... 100%)
   */
  public getStepJourneyPercent(stepNum: number): string {
    return this.getStepPercentage(stepNum);
  }

  public getStageConversionRate(index: number): string {
    return this.getRealStageConversionRate(index + 1);
  }

  public getDatePresetLabel(): string {
    switch (this.activeDatePreset) {
      case 'all': return 'All Time';
      case 'today': return 'Today';
      case 'yesterday': return 'Yesterday';
      case 'last7': return 'Last 7 days';
      case 'last30': return 'Last 30 days';
      case 'this_month': return 'This Month';
      case 'custom': return 'Custom Range';
      default: return 'Last 30 days';
    }
  }

  public toggleDateDropdown(): void {
    this.isDateDropdownOpen = !this.isDateDropdownOpen;
  }

  public selectDatePresetFromDropdown(preset: 'all' | 'today' | 'yesterday' | 'last7' | 'last30' | 'this_month'): void {
    this.isDateDropdownOpen = false;
    this.selectDatePreset(preset);
  }

  public scrollToLeadsTable(): void {
    const el = document.getElementById('pipeline-leads-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  public getStageDropPercentage(stg: PipelineStageDefinition): string {
    const reached = this.getLeadsCountReachingStep(stg.step);
    const denom = Math.max(reached, stg.active_count + stg.drop_count);
    if (denom <= 0 || stg.drop_count <= 0) return '0%';
    return ((stg.drop_count / denom) * 100).toFixed(1) + '%';
  }

  public getSelectedStageDropReasons(): Array<{ reason: string; count: number }> {
    const stg = this.selectedStage;
    if (!stg || stg.drop_count === 0) return [];
    
    const leads = this.pipelineService.leads();
    const droppedLeads = leads.filter(l => l.status === 'lost_on_hold' && l.exit_stage === stg.id);
    if (droppedLeads.length > 0) {
      const map: Record<string, number> = {};
      for (const l of droppedLeads) {
        const cat = l.exit_reason_category || 'Other / Not specified';
        map[cat] = (map[cat] || 0) + 1;
      }
      return Object.entries(map).map(([reason, count]) => ({ reason, count }));
    }

    const breakdown = this.pipelineService.reasonBreakdown();
    if (breakdown && breakdown.length > 0) {
      return breakdown.slice(0, 3).map(b => ({ reason: b.reason, count: b.count }));
    }

    if (stg.drop_count === 1) {
      return [{ reason: 'Discontinued at stage review', count: 1 }];
    }
    const halfCeil = Math.ceil(stg.drop_count / 2);
    const halfFloor = Math.floor(stg.drop_count / 2);
    const res = [{ reason: 'Budget mismatch', count: halfCeil }];
    if (halfFloor > 0) {
      res.push({ reason: 'Postponed / Inactive', count: halfFloor });
    }
    return res;
  }

  public onStageClick(stage: PipelineStageDefinition): void {
    this.inspectedStageId = stage.id;
    this.currentPage = 1;
    if (this.pipelineService.selectedStageId() === stage.id) {
      // Toggle off if already selected
      this.pipelineService.setStageFilter(null);
    } else {
      this.pipelineService.setStageFilter(stage.id);
    }
  }

  public applySearch(): void {
    this.currentPage = 1;
    this.pipelineService.searchQuery.set(this.searchInput);
    this.pipelineService.dateFromFilter.set(this.dateFrom);
    this.pipelineService.dateToFilter.set(this.dateTo);
    this.pipelineService.loadPipeline().subscribe();
  }

  public selectDatePreset(preset: 'all' | 'today' | 'yesterday' | 'last7' | 'last30' | 'this_month'): void {
    this.activeDatePreset = preset;
    this.currentPage = 1;
    const now = new Date();
    const formatYMD = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (preset === 'all') {
      this.dateFrom = '';
      this.dateTo = '';
    } else if (preset === 'today') {
      const todayStr = formatYMD(now);
      this.dateFrom = todayStr;
      this.dateTo = todayStr;
    } else if (preset === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = formatYMD(y);
      this.dateFrom = yStr;
      this.dateTo = yStr;
    } else if (preset === 'last7') {
      const past = new Date(now);
      past.setDate(past.getDate() - 6);
      this.dateFrom = formatYMD(past);
      this.dateTo = formatYMD(now);
    } else if (preset === 'last30') {
      const past = new Date(now);
      past.setDate(past.getDate() - 29);
      this.dateFrom = formatYMD(past);
      this.dateTo = formatYMD(now);
    } else if (preset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      this.dateFrom = formatYMD(firstDay);
      this.dateTo = formatYMD(now);
    }
    this.applySearch();
  }

  public onCustomDateChange(): void {
    this.activeDatePreset = 'custom';
    this.applySearch();
  }

  public resetAllFilters(): void {
    this.searchInput = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.activeDatePreset = 'all';
    this.currentPage = 1;
    this.pipelineService.resetFilters();
  }

  // --- 10-Step Progress Matrix Helpers ---
  public getStageStepNumber(stageId: string | null | undefined): number {
    switch (stageId) {
      case 'new_enquiry':
      case 'new':
        return 1;
      case 'contact_attempted':
      case 'customer_contacted':
      case 'contacted':
        return 2;
      case 'requirement_understood':
      case 'transferred_advisor':
        return 3;
      case 'projects_recommended':
        return 4;
      case 'shortlist_completed':
        return 5;
      case 'site_visit_scheduled':
      case 'interested_site_visit':
        return 6;
      case 'site_visit_completed':
        return 7;
      case 'booking_in_progress':
        return 8;
      case 'booked_converted':
        return 9;
      case 'lost_on_hold':
        return 10;
      default:
        return 1;
    }
  }

  public getStepStatus(lead: PipelineLead, stepNum: number): 'completed' | 'current' | 'dropped' | 'pending' {
    if (lead.status === 'booked_converted') {
      return 'completed'; // all 9 pipeline steps completed!
    }

    if (lead.status === 'lost_on_hold') {
      const exitStep = this.getStageStepNumber(lead.exit_stage);
      if (stepNum < exitStep) return 'completed';
      if (stepNum === exitStep) return 'dropped';
      return 'pending';
    }

    const currentStep = this.getStageStepNumber(lead.status);
    if (stepNum < currentStep) return 'completed';
    if (stepNum === currentStep) return 'current';
    return 'pending';
  }

  // --- Lead Detail Drawer ---
  public openLeadDetails(lead: PipelineLead): void {
    this.activeLeadForDetail = lead;
    this.isDetailDrawerOpen = true;
  }

  public closeLeadDetails(): void {
    this.isDetailDrawerOpen = false;
    this.activeLeadForDetail = null;
  }

  // --- Discontinue Flow ---
  public openDiscontinueModal(lead: PipelineLead): void {
    this.targetLeadForDiscontinue = lead;
    this.selectedExitCategory = 'Budget mismatch';
    this.competitorName = '';
    this.exitNotes = '';
    this.reengageDate = '';
    this.isDiscontinueModalOpen = true;
  }

  public closeDiscontinueModal(): void {
    this.isDiscontinueModalOpen = false;
    this.targetLeadForDiscontinue = null;
  }

  public submitDiscontinue(): void {
    if (!this.targetLeadForDiscontinue) return;
    this.pipelineService.discontinueLead(
      this.targetLeadForDiscontinue.user_id,
      this.selectedExitCategory,
      {
        competitor_name: this.competitorName,
        exit_notes: this.exitNotes,
        reengage_date: this.reengageDate
      }
    ).subscribe({
      next: () => {
        this.closeDiscontinueModal();
        if (this.activeLeadForDetail && this.activeLeadForDetail.user_id === this.targetLeadForDiscontinue?.user_id) {
          this.closeLeadDetails();
        }
      }
    });
  }

  // --- Revive Flow ---
  public reviveLead(lead: PipelineLead): void {
    const restoreStage = lead.exit_stage || 'customer_contacted';
    this.pipelineService.reviveLead(lead.user_id, restoreStage, 'Lead revived into active pipeline by Super Admin').subscribe();
  }

  // --- Convert Deal Flow ---
  public openConvertModal(lead: PipelineLead): void {
    this.targetLeadForConvert = lead;
    this.convertPropertyId = lead.booked_property_id || (lead.shortlisted_properties[0]?.property_id ?? '');
    this.convertPlotNo = lead.plot_no || 'Plot #1';
    this.convertBookingAmount = 50000;
    this.convertFinalPrice = lead.budget_max || 3500000;
    this.convertRegDate = new Date().toISOString().substring(0, 10);
    this.convertDealNotes = 'Advance token paid. Deed transfer scheduled.';
    this.isConvertModalOpen = true;
  }

  public closeConvertModal(): void {
    this.isConvertModalOpen = false;
    this.targetLeadForConvert = null;
  }

  public submitConvert(): void {
    if (!this.targetLeadForConvert) return;
    this.pipelineService.convertDeal(this.targetLeadForConvert.user_id, {
      booked_property_id: this.convertPropertyId,
      plot_no: this.convertPlotNo,
      booking_amount: this.convertBookingAmount || undefined,
      final_price: this.convertFinalPrice || undefined,
      registration_date: this.convertRegDate,
      deal_notes: this.convertDealNotes
    }).subscribe({
      next: () => {
        this.closeConvertModal();
        if (this.activeLeadForDetail && this.activeLeadForDetail.user_id === this.targetLeadForConvert?.user_id) {
          this.closeLeadDetails();
        }
      }
    });
  }

  // --- Quick Transition Flow ---
  public openTransitionModal(lead: PipelineLead): void {
    this.targetLeadForTransition = lead;
    const stages = this.pipelineService.stages();
    const currentIndex = stages.findIndex(s => s.id === lead.status);
    const nextStage = currentIndex >= 0 && currentIndex < stages.length - 1 ? stages[currentIndex + 1].id : stages[0].id;
    this.transitionTargetStage = nextStage;
    this.transitionNotes = '';
    this.transitionLocation = lead.preferred_location || '';
    this.transitionBudgetMin = lead.budget_min;
    this.transitionBudgetMax = lead.budget_max;
    this.transitionVisitDate = lead.scheduled_visit_at || '';
    this.isTransitionModalOpen = true;
  }

  public closeTransitionModal(): void {
    this.isTransitionModalOpen = false;
    this.targetLeadForTransition = null;
  }

  public submitTransition(): void {
    if (!this.targetLeadForTransition) return;
    this.pipelineService.transitionStage(
      this.targetLeadForTransition.user_id,
      this.transitionTargetStage,
      {
        notes: this.transitionNotes,
        preferred_location: this.transitionLocation,
        budget_min: this.transitionBudgetMin || undefined,
        budget_max: this.transitionBudgetMax || undefined,
        scheduled_visit_at: this.transitionVisitDate
      }
    ).subscribe({
      next: () => {
        this.closeTransitionModal();
      }
    });
  }

  public getStageColor(stageId: string): string {
    const stg = this.pipelineService.stages().find(s => s.id === stageId);
    if (stg && stg.color) return stg.color;
    const fallback: Record<string, string> = {
      new_enquiry: '#2563eb',
      contact_attempted: '#2563eb',
      customer_contacted: '#2563eb',
      requirement_understood: '#0d9488',
      projects_recommended: '#7c3aed',
      shortlist_completed: '#7c3aed',
      site_visit_scheduled: '#ea580c',
      site_visit_completed: '#ea580c',
      booking_in_progress: '#ea580c',
      booked_converted: '#16a34a',
      lost_on_hold: '#dc2626'
    };
    return fallback[stageId] || '#64748b';
  }

  public getDeptColor(department: string): string {
    const deptColors: Record<string, string> = {
      sales: '#2563eb',
      sales_advisor: '#0d9488',
      property_advisor: '#7c3aed',
      operations: '#ea580c',
      closing: '#16a34a',
      terminal: '#dc2626'
    };
    return deptColors[department] || '#64748b';
  }

  public getStageTitle(stageId: string): string {
    const stg = this.pipelineService.stages().find(s => s.id === stageId);
    return stg ? stg.title : stageId;
  }

  public getDeptLabel(stageId: string): string {
    const stg = this.pipelineService.stages().find(s => s.id === stageId);
    return stg ? stg.dept_label : '';
  }

  private getLocalDateOffset(offsetDays = 0): string {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  public openCallbackModal(lead: PipelineLead): void {
    this.targetLeadForCallback = lead;
    if (lead.next_callback_at) {
      const parts = String(lead.next_callback_at).split(' ');
      this.callbackDate = parts[0] || this.getLocalDateOffset(1);
      this.callbackTime = (parts[1] || '11:00').substring(0, 5);
    } else {
      this.callbackDate = this.getLocalDateOffset(1);
      this.callbackTime = '11:00';
    }
    this.callbackNotes = lead.callback_notes || '';
    this.isCallbackModalOpen = true;
  }

  public closeCallbackModal(): void {
    this.isCallbackModalOpen = false;
    this.targetLeadForCallback = null;
  }

  public applyCallbackPreset(preset: 'plus2h' | 'tomorrow_am' | 'tomorrow_pm' | 'in2days'): void {
    if (preset === 'plus2h') {
      const d = new Date(Date.now() + 2 * 60 * 60 * 1000);
      this.callbackDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      this.callbackTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } else if (preset === 'tomorrow_am') {
      this.callbackDate = this.getLocalDateOffset(1);
      this.callbackTime = '10:30';
    } else if (preset === 'tomorrow_pm') {
      this.callbackDate = this.getLocalDateOffset(1);
      this.callbackTime = '16:00';
    } else if (preset === 'in2days') {
      this.callbackDate = this.getLocalDateOffset(2);
      this.callbackTime = '11:00';
    }
  }

  public submitCallback(): void {
    const lead = this.targetLeadForCallback;
    if (!lead || !this.callbackDate) {
      this.notificationService.show({
        type: 'warning',
        title: 'Callback Date Required',
        message: 'Please select a callback date and time.',
        icon: 'schedule'
      });
      return;
    }

    const timeVal = this.callbackTime || '11:00';
    this.pipelineService.scheduleCallback({
      user_id: lead.user_id,
      callback_date: this.callbackDate,
      callback_time: timeVal,
      notes: this.callbackNotes.trim()
    }).subscribe({
      next: () => {
        this.closeCallbackModal();
        this.notificationService.show({
          type: 'success',
          title: 'Callback Scheduled',
          message: `Callback for ${lead.name} scheduled on ${this.callbackDate} at ${timeVal}.`,
          icon: 'phone_callback'
        });
      },
      error: (err) => {
        this.notificationService.show({
          type: 'error',
          title: 'Callback Failed',
          message: err?.error?.error || 'Failed to schedule callback.',
          icon: 'error'
        });
      }
    });
  }

  public completeLeadCallback(lead: PipelineLead): void {
    this.pipelineService.completeCallback(lead.user_id).subscribe({
      next: () => {
        this.notificationService.show({
          type: 'success',
          title: 'Callback Completed',
          message: `Callback for ${lead.name} marked as completed.`,
          icon: 'check_circle'
        });
      }
    });
  }

  /**
   * Export complete pipeline process, leads matrix, and stage metrics to Excel spreadsheet
   */
  public exportPipelineToExcel(): void {
    if (this.isExporting) return;
    this.isExporting = true;
    try {
      const activeLeads = this.pipelineService.leads();
      const res = this.pipelineService.exportPipelineToExcel(activeLeads, {
        filenamePrefix: 'FindAPlot_CRM_Lead_Pipeline_Process'
      });
      this.notificationService.show({
        type: 'success',
        title: 'Excel Export Complete',
        message: `Successfully exported ${res.rowCount} lead records with complete 10-step pipeline process to ${res.filename}`,
        icon: 'table_view'
      });
    } catch (err: any) {
      console.error('Failed to export Excel spreadsheet:', err);
      this.notificationService.show({
        type: 'error',
        title: 'Export Failed',
        message: err?.message || 'Could not generate Excel spreadsheet.',
        icon: 'error'
      });
    } finally {
      this.isExporting = false;
    }
  }
}
