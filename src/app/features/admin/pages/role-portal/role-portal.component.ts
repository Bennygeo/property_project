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

