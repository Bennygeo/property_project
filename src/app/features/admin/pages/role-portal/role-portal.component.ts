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

  // Filtered Visitors for Sales Executive
  readonly filteredVisitors = computed<any[]>(() => {
    const data = this.dashboardData();
    if (!data?.visitors || !Array.isArray(data.visitors)) return [];
    const query = this.searchQuery().trim().toLowerCase();
    const filter = this.statusFilter();

    return data.visitors.filter((v: any) => {
      const matchesQuery = !query ||
        (v.name && v.name.toLowerCase().includes(query)) ||
        (v.phone && v.phone.toLowerCase().includes(query)) ||
        (v.intention && v.intention.toLowerCase().includes(query)) ||
        (v.notes && v.notes.toLowerCase().includes(query));

      const matchesFilter = filter === 'all' || v.interaction_status === filter;
      return matchesQuery && matchesFilter;
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

    const firstProp = visitor.viewed_properties?.[0]?.title || 'our featured verified plots';
    const totalProps = visitor.viewed_properties_count || visitor.viewed_properties?.length || 0;

    const message = `Hello ${visitor.name || 'Valued Investor'}, this is the FindAPlot team. We noticed you recently explored ${totalProps > 0 ? totalProps + ' plot listing(s) including ' + firstProp : 'plots on our portal'}. Would you like to schedule an assisted site visit or receive the complete legal clearance dossier?`;

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');

    this.notificationService.show({
      type: 'success',
      title: 'WhatsApp Concierge Opened',
      message: `Chat link generated for ${visitor.name}`,
      icon: 'chat'
    });
  }

  updateVisitorStatus(visitor: any, newStatus: string): void {
    visitor.interaction_status = newStatus;
    this.saveLeadInteraction(visitor, 'Status updated');
  }

  updateVisitorIntention(visitor: any, newIntention: string): void {
    visitor.intention = newIntention;
    this.saveLeadInteraction(visitor, 'Intention updated');
  }

  saveVisitorNotes(visitor: any): void {
    this.saveLeadInteraction(visitor, 'Call feedback & notes saved');
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

