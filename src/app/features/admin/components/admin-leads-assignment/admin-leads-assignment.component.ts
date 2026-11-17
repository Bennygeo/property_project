import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LeadPipelineService } from '../../../../core/services/lead-pipeline.service';
import { AdminService } from '../../../../core/services/admin.service';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  PipelineLead,
  PipelineStageDefinition,
  PipelineStaffMember
} from '../../../../core/models/lead-pipeline.model';

export type AssignmentFilterTab =
  | 'all'
  | 'unassigned'
  | 'sales_assigned'
  | 'advisor_assigned'
  | 'ops_assigned'
  | 'discontinued';

@Component({
  selector: 'app-admin-leads-assignment',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-leads-assignment.component.html',
  styleUrl: './admin-leads-assignment.component.css'
})
export class AdminLeadsAssignmentComponent implements OnInit {
  public readonly pipelineService = inject(LeadPipelineService);
  private readonly adminService = inject(AdminService);
  private readonly notificationService = inject(NotificationService);

  // Filter Signals
  readonly activeAssignmentTab = signal<AssignmentFilterTab>('all');
  readonly searchText = signal<string>('');
  readonly selectedStaffFilter = signal<string>('all'); // 'all' or '<id>'
  readonly selectedStageFilter = signal<string>('all');

  // Pagination Signals
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(10);
  readonly pageSizeOptions: number[] = [5, 10, 25, 50];

  // Saving & Selection State
  readonly isAssigning = signal<boolean>(false);
  readonly selectedUserIds = signal<number[]>([]);

  // Bulk Assignment Controls
  readonly bulkRoleType = signal<'sales' | 'advisor' | 'operations'>('sales');
  readonly bulkTargetStaff = signal<string>('round_robin'); // 'round_robin' | '0' (unassign) | '<staff_id>'
  readonly bulkAdvanceStage = signal<boolean>(true);

  // Full Assignment & Briefing Modal
  readonly modalLead = signal<PipelineLead | null>(null);
  readonly modalForm = signal<{
    assigned_sales_id: number;
    assigned_advisor_id: number;
    assigned_ops_id: number;
    advance_stage: boolean;
    assignment_notes: string;
  }>({
    assigned_sales_id: 0,
    assigned_advisor_id: 0,
    assigned_ops_id: 0,
    advance_stage: true,
    assignment_notes: ''
  });

  // Quick Add Role Staff Modal
  readonly isAddStaffModalOpen = signal<boolean>(false);
  readonly newStaffForm = signal<{
    name: string;
    email: string;
    phone: string;
    role: 'sales_executive' | 'property_advisor' | 'operations_executive';
    designation: string;
    password: string;
  }>({
    name: '',
    email: '',
    phone: '',
    role: 'sales_executive',
    designation: '',
    password: ''
  });

  ngOnInit(): void {
    // Load full unfiltered leads + active staff roster from backend
    this.pipelineService.selectedStageId.set(null);
    this.pipelineService.searchQuery.set('');
    this.pipelineService.loadPipeline().subscribe();
  }

  refreshLeads(): void {
    this.pipelineService.loadPipeline().subscribe();
  }

  // Staff Lists Computed
  readonly salesStaff = computed<PipelineStaffMember[]>(() => {
    return this.pipelineService.staffByRole()?.sales_executive ?? [];
  });

  readonly advisorStaff = computed<PipelineStaffMember[]>(() => {
    return this.pipelineService.staffByRole()?.property_advisor ?? [];
  });

  readonly opsStaff = computed<PipelineStaffMember[]>(() => {
    return this.pipelineService.staffByRole()?.operations_executive ?? [];
  });

  readonly bulkStaffPool = computed<PipelineStaffMember[]>(() => {
    const role = this.bulkRoleType();
    if (role === 'sales') return this.salesStaff();
    if (role === 'advisor') return this.advisorStaff();
    return this.opsStaff();
  });

  readonly tabCounts = computed(() => {
    const all = this.pipelineService.leads();
    return {
      all: all.length,
      unassigned: all.filter(l => !l.assigned_sales_id && l.status !== 'lost_on_hold').length,
      sales_assigned: all.filter(l => !!l.assigned_sales_id).length,
      advisor_assigned: all.filter(l => !!l.assigned_advisor_id).length,
      ops_assigned: all.filter(l => !!l.assigned_ops_id).length,
      discontinued: all.filter(l => l.status === 'lost_on_hold').length
    };
  });

  readonly filteredLeads = computed<PipelineLead[]>(() => {
    const leads = this.pipelineService.leads();
    const tab = this.activeAssignmentTab();
    const q = this.searchText().trim().toLowerCase();
    const staffIdFilter = this.selectedStaffFilter();
    const stageFilter = this.selectedStageFilter();

    return leads.filter(lead => {
      if (tab === 'unassigned' && (!!lead.assigned_sales_id || lead.status === 'lost_on_hold')) return false;
      if (tab === 'sales_assigned' && !lead.assigned_sales_id) return false;
      if (tab === 'advisor_assigned' && !lead.assigned_advisor_id) return false;
      if (tab === 'ops_assigned' && !lead.assigned_ops_id) return false;
      if (tab === 'discontinued' && lead.status !== 'lost_on_hold') return false;

      if (stageFilter !== 'all' && lead.status !== stageFilter) return false;

      if (staffIdFilter !== 'all') {
        const sid = Number(staffIdFilter);
        const matchesStaff =
          lead.assigned_sales_id === sid ||
          lead.assigned_advisor_id === sid ||
          lead.assigned_ops_id === sid;
        if (!matchesStaff) return false;
      }

      if (q) {
        const matches =
          (lead.name && lead.name.toLowerCase().includes(q)) ||
          (lead.phone && lead.phone.toLowerCase().includes(q)) ||
          (lead.email && lead.email.toLowerCase().includes(q)) ||
          (lead.preferred_location && lead.preferred_location.toLowerCase().includes(q)) ||
          (lead.assigned_sales_name && lead.assigned_sales_name.toLowerCase().includes(q)) ||
          (lead.assigned_advisor_name && lead.assigned_advisor_name.toLowerCase().includes(q)) ||
          (lead.assigned_ops_name && lead.assigned_ops_name.toLowerCase().includes(q)) ||
          (lead.notes && lead.notes.toLowerCase().includes(q)) ||
          (lead.advisor_notes && lead.advisor_notes.toLowerCase().includes(q)) ||
          (lead.ops_notes && lead.ops_notes.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  });

  readonly totalPages = computed<number>(() => {
    return Math.max(1, Math.ceil(this.filteredLeads().length / this.pageSize()));
  });

  readonly safeCurrentPage = computed<number>(() => {
    return Math.min(Math.max(1, this.currentPage()), this.totalPages());
  });

  readonly paginatedLeads = computed<PipelineLead[]>(() => {
    const start = (this.safeCurrentPage() - 1) * this.pageSize();
    return this.filteredLeads().slice(start, start + this.pageSize());
  });

  readonly pageNumbers = computed<number[]>(() => {
    const total = this.totalPages();
    const cur = this.safeCurrentPage();
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const start = Math.max(1, Math.min(cur - 2, total - 4));
    const end = Math.min(total, start + 4);
    const pages: number[] = [];
    for (let p = start; p <= end; p++) pages.push(p);
    return pages;
  });

  // Tab & Filter Helpers
  setAssignmentTab(tab: AssignmentFilterTab): void {
    this.activeAssignmentTab.set(tab);
    this.currentPage.set(1);
  }

  filterByStaffChip(staffId: number): void {
    const current = this.selectedStaffFilter();
    if (current === String(staffId)) {
      this.selectedStaffFilter.set('all');
    } else {
      this.selectedStaffFilter.set(String(staffId));
      this.activeAssignmentTab.set('all');
    }
    this.currentPage.set(1);
  }

  clearFilters(): void {
    this.activeAssignmentTab.set('all');
    this.searchText.set('');
    this.selectedStaffFilter.set('all');
    this.selectedStageFilter.set('all');
    this.currentPage.set(1);
  }

  onPageSizeChange(size: number | string): void {
    const n = Number(size);
    if (n > 0) {
      this.pageSize.set(n);
      this.currentPage.set(1);
    }
  }

  // Selection Helpers
  isSelected(userId: number): boolean {
    return this.selectedUserIds().includes(userId);
  }

  areAllOnPageSelected(): boolean {
    const page = this.paginatedLeads();
    if (page.length === 0) return false;
    const sel = this.selectedUserIds();
    return page.every(l => sel.includes(l.user_id));
  }

  toggleSelectOne(userId: number): void {
    this.selectedUserIds.update(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  }

  toggleSelectAllOnPage(): void {
    const pageIds = this.paginatedLeads().map(l => l.user_id);
    if (this.areAllOnPageSelected()) {
      this.selectedUserIds.update(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      this.selectedUserIds.update(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  }

  clearSelection(): void {
    this.selectedUserIds.set([]);
  }

  // Inline Instant Single-Role Assignment
  onQuickAssign(lead: PipelineLead, roleType: 'sales' | 'advisor' | 'operations', rawStaffId: any): void {
    const staffId = Number(rawStaffId) || 0;
    const staffPool =
      roleType === 'sales' ? this.salesStaff()
      : roleType === 'advisor' ? this.advisorStaff()
      : this.opsStaff();
    const chosenStaff = staffPool.find(s => s.id === staffId);

    this.isAssigning.set(true);
    this.pipelineService.assignLeadRole({
      user_id: lead.user_id,
      role_type: roleType,
      staff_id: staffId > 0 ? staffId : null,
      advance_stage: false
    }).subscribe({
      next: () => {
        this.isAssigning.set(false);
        this.notificationService.show({
          type: 'success',
          title: 'Lead Assigned',
          message: chosenStaff
            ? `${lead.name} assigned to ${chosenStaff.name}.`
            : `${roleType.toUpperCase()} assignment cleared for ${lead.name}.`,
          icon: 'assignment_ind'
        });
      },
      error: (err) => {
        this.isAssigning.set(false);
        this.notificationService.show({
          type: 'error',
          title: 'Assignment Failed',
          message: err?.error?.error || err?.message || 'Could not update role assignment.',
          icon: 'error'
        });
      }
    });
  }

  // Bulk Assignment / Auto Round-Robin
  onBulkRoleChange(role: 'sales' | 'advisor' | 'operations'): void {
    this.bulkRoleType.set(role);
    this.bulkTargetStaff.set('round_robin');
  }

  executeBulkAssign(): void {
    const ids = this.selectedUserIds();
    if (ids.length === 0) return;

    const roleType = this.bulkRoleType();
    const target = this.bulkTargetStaff();
    const advanceStage = this.bulkAdvanceStage();

    this.isAssigning.set(true);

    if (target === 'round_robin') {
      this.pipelineService.autoDistributeLeads(roleType, ids, advanceStage).subscribe({
        next: (res) => {
          this.isAssigning.set(false);
          this.selectedUserIds.set([]);
          this.notificationService.show({
            type: 'success',
            title: 'Round-Robin Distribution Complete',
            message: res?.message || `Distributed ${ids.length} lead(s) evenly across active ${roleType} staff.`,
            icon: 'hub'
          });
        },
        error: (err) => {
          this.isAssigning.set(false);
          this.notificationService.show({
            type: 'error',
            title: 'Distribution Failed',
            message: err?.error?.error || err?.message || 'Could not distribute leads.',
            icon: 'error'
          });
        }
      });
      return;
    }

    const staffId = Number(target) || 0;
    this.pipelineService.assignLeadRole({
      user_ids: ids,
      role_type: roleType,
      staff_id: staffId > 0 ? staffId : null,
      advance_stage: advanceStage
    }).subscribe({
      next: () => {
        this.isAssigning.set(false);
        this.selectedUserIds.set([]);
        this.notificationService.show({
          type: 'success',
          title: 'Bulk Assignment Saved',
          message: `Updated ${ids.length} lead(s) successfully.`,
          icon: 'check_circle'
        });
      },
      error: (err) => {
        this.isAssigning.set(false);
        this.notificationService.show({
          type: 'error',
          title: 'Bulk Assignment Failed',
          message: err?.error?.error || err?.message || 'Could not assign selected leads.',
          icon: 'error'
        });
      }
    });
  }

  // Full Assignment & Briefing Modal
  openAssignModal(lead: PipelineLead): void {
    this.modalForm.set({
      assigned_sales_id: lead.assigned_sales_id || 0,
      assigned_advisor_id: lead.assigned_advisor_id || 0,
      assigned_ops_id: lead.assigned_ops_id || 0,
      advance_stage: lead.status !== 'lost_on_hold',
      assignment_notes: ''
    });
    this.modalLead.set(lead);
  }

  closeAssignModal(): void {
    this.modalLead.set(null);
  }

  updateModalField(field: string, value: any): void {
    this.modalForm.update(curr => ({ ...curr, [field]: value }));
  }

  submitAssignModal(): void {
    const lead = this.modalLead();
    if (!lead) return;
    const form = this.modalForm();

    this.isAssigning.set(true);
    this.pipelineService.assignLeadRole({
      user_id: lead.user_id,
      role_type: 'all',
      assigned_sales_id: Number(form.assigned_sales_id) || null,
      assigned_advisor_id: Number(form.assigned_advisor_id) || null,
      assigned_ops_id: Number(form.assigned_ops_id) || null,
      advance_stage: form.advance_stage && lead.status !== 'lost_on_hold',
      assignment_notes: form.assignment_notes.trim()
    }).subscribe({
      next: () => {
        this.isAssigning.set(false);
        this.modalLead.set(null);
        this.notificationService.show({
          type: 'success',
          title: 'Role Assignments Updated',
          message: `Saved role owners & briefing notes for ${lead.name}.`,
          icon: 'assignment_turned_in'
        });
      },
      error: (err) => {
        this.isAssigning.set(false);
        this.notificationService.show({
          type: 'error',
          title: 'Update Failed',
          message: err?.error?.error || err?.message || 'Could not save role assignments.',
          icon: 'error'
        });
      }
    });
  }

  // Quick Add Role Staff Modal
  openAddStaffModal(): void {
    this.newStaffForm.set({
      name: '',
      email: '',
      phone: '',
      role: 'sales_executive',
      designation: 'Sales Executive',
      password: ''
    });
    this.isAddStaffModalOpen.set(true);
  }

  closeAddStaffModal(): void {
    this.isAddStaffModalOpen.set(false);
  }

  updateNewStaffField(field: string, value: string): void {
    this.newStaffForm.update(curr => {
      const next = { ...curr, [field]: value };
      if (field === 'role') {
        const desMap: Record<string, string> = {
          sales_executive: 'Sales Executive',
          property_advisor: 'Property Advisor',
          operations_executive: 'Operations Executive'
        };
        next.designation = desMap[value] || '';
      }
      return next;
    });
  }

  submitAddStaff(): void {
    const f = this.newStaffForm();
    if (!f.name.trim() || !f.email.trim() || !f.password.trim()) {
      this.notificationService.show({
        type: 'warning',
        title: 'Missing Fields',
        message: 'Name, email, and initial password are required.',
        icon: 'warning'
      });
      return;
    }

    this.isAssigning.set(true);
    this.adminService.createStaffRole({
      name: f.name.trim(),
      email: f.email.trim(),
      phone: f.phone.trim(),
      role: f.role,
      designation: f.designation.trim(),
      password: f.password
    }).subscribe({
      next: () => {
        this.isAssigning.set(false);
        this.isAddStaffModalOpen.set(false);
        this.pipelineService.loadPipeline().subscribe();
      },
      error: () => {
        this.isAssigning.set(false);
      }
    });
  }

  // Display Helpers
  getStageMeta(stageId: string): PipelineStageDefinition | undefined {
    return this.pipelineService.stages().find(s => s.id === stageId);
  }

  formatBudgetRange(lead: PipelineLead): string {
    const min = Number(lead.budget_min) || 0;
    const max = Number(lead.budget_max) || 0;
    const fmt = (v: number) => `₹${v}L`;
    if (min > 0 && max > 0 && min !== max) return `${fmt(min)} – ${fmt(max)}`;
    if (max > 0) return `Up to ${fmt(max)}`;
    if (min > 0) return `From ${fmt(min)}`;
    return '';
  }

  getLatestLeadComment(lead: PipelineLead): { label: string; text: string } | null {
    if (lead.ops_notes && lead.ops_notes.trim()) {
      return { label: 'Ops', text: lead.ops_notes };
    }
    if (lead.advisor_notes && lead.advisor_notes.trim()) {
      return { label: 'Advisor', text: lead.advisor_notes };
    }
    if (lead.notes && lead.notes.trim()) {
      return { label: 'Sales', text: lead.notes };
    }
    return null;
  }

  openWhatsApp(lead: PipelineLead): void {
    if (!lead.phone) return;
    let clean = lead.phone.replace(/\D/g, '');
    if (clean.length === 10) clean = '91' + clean;
    const msg = `Hello ${lead.name}, thank you for exploring verified plots on FindAPlot. Our specialist will connect with you shortly.`;
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  exportLeadsToExcel(): void {
    const leads = this.filteredLeads();
    const result = this.pipelineService.exportPipelineToExcel(leads, {
      filenamePrefix: 'FindAPlot_CRM_Leads_Assignment_Report'
    });
    this.notificationService.show({
      type: 'success',
      title: 'Excel Export Complete',
      message: `Exported ${result.rowCount} leads with role assignments to ${result.filename}`,
      icon: 'table_view'
    });
  }
}
