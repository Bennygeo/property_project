import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, ADMIN_PERSONAS } from '../../../../core/services/admin.service';
import { AdminProfileData, AdminPersona } from '../../../../core/models/admin.model';
import { ToastComponent } from '../../../home/components/toast/toast.component';

export type ActivityTab = 'my_activities' | 'co_admin_activities';

@Component({
  selector: 'app-admin-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ToastComponent
  ],
  templateUrl: './admin-profile.component.html',
  styleUrls: ['./admin-profile.component.css']
})
export class AdminProfileComponent implements OnInit {
  readonly adminService = inject(AdminService);
  readonly router = inject(Router);
  readonly personas = ADMIN_PERSONAS;

  // Active activity tab
  readonly activeTab = signal<ActivityTab>('my_activities');

  // Filter for other admin activities
  readonly selectedCoAdminFilter = signal<number | null>(null);

  // Profile and Audit State
  readonly profileData = signal<AdminProfileData | null>(null);
  readonly isLoading = signal<boolean>(true);

  ngOnInit(): void {
    if (!this.adminService.isAuthenticated()) {
      this.router.navigate(['/admin/login']);
      return;
    }
    this.loadProfileDetails();
  }

  loadProfileDetails(): void {
    this.isLoading.set(true);
    const activeAdmin = this.adminService.activePersona();
    const filterId = this.selectedCoAdminFilter() || undefined;

    this.adminService.fetchAdminProfile(activeAdmin.id, filterId).subscribe(data => {
      this.isLoading.set(false);
      if (data) {
        this.profileData.set(data);
      }
    });
  }

  onSelectPersona(personaId: number): void {
    this.adminService.switchPersona(personaId);
    this.loadProfileDetails();
  }

  filterByCoAdmin(coAdminId: number | null): void {
    this.selectedCoAdminFilter.set(coAdminId);
    this.loadProfileDetails();
  }

  onSignOut(): void {
    this.adminService.logout();
    this.router.navigate(['/admin/login']);
  }

  getActionBadgeClass(actionType: string): string {
    switch (actionType) {
      case 'approve_peer_review': return 'badge-peer-approve';
      case 'approve_user_review': return 'badge-user-approve';
      case 'post_property': return 'badge-post';
      case 'reject_property': return 'badge-reject';
      case 'request_revision': return 'badge-revision';
      case 'admin_login': return 'badge-login';
      default: return 'badge-default';
    }
  }

  getActionIcon(actionType: string): string {
    switch (actionType) {
      case 'approve_peer_review': return 'verified_user';
      case 'approve_user_review': return 'check_circle';
      case 'post_property': return 'add_home_work';
      case 'reject_property': return 'cancel';
      case 'request_revision': return 'edit_note';
      case 'admin_login': return 'vpn_key';
      default: return 'info';
    }
  }

  getActionLabel(actionType: string): string {
    switch (actionType) {
      case 'approve_peer_review': return 'Co-Admin Peer Approved';
      case 'approve_user_review': return 'User Listing Verified';
      case 'post_property': return 'Property Submitted';
      case 'reject_property': return 'Listing Rejected';
      case 'request_revision': return 'Changes Requested';
      case 'admin_login': return 'Admin Authenticated';
      default: return actionType.replace('_', ' ').toUpperCase();
    }
  }
}
