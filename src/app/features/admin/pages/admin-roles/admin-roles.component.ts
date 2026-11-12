import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AdminService, AdminRoleData, AdminStaffUser, AdminRoleItem, AdminPermissionItem } from '../../../../core/services/admin.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-admin-roles',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-roles.component.html',
  styleUrl: './admin-roles.component.css'
})
export class AdminRolesComponent implements OnInit {
  readonly adminService = inject(AdminService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  // Layout & Sidebar
  readonly isSidebarCollapsed = signal<boolean>(false);

  // Page Data
  readonly roleData = signal<AdminRoleData | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly isSubmitting = signal<boolean>(false);

  // Filters & Omnibox
  readonly searchQuery = signal<string>('');
  readonly selectedRoleFilter = signal<string>('all');
  readonly selectedStatusFilter = signal<string>('all');

  // Modals
  readonly isCreateModalOpen = signal<boolean>(false);
  readonly isEditModalOpen = signal<boolean>(false);
  readonly selectedUserForEdit = signal<AdminStaffUser | null>(null);

  // Create Form State
  createForm = {
    name: '',
    email: '',
    phone: '',
    role: 'sales_executive',
    department: '',
    designation: '',
    password: '',
    permissions: [] as string[]
  };

  // Edit Form State
  editForm = {
    id: 0,
    name: '',
    email: '',
    phone: '',
    role: '',
    department: '',
    designation: '',
    status: 'active',
    newPassword: '',
    permissions: [] as string[]
  };

  // Password visibility
  readonly showPassword = signal<boolean>(false);
  readonly showEditPassword = signal<boolean>(false);

  // Filtered Users Computed
  readonly filteredUsers = computed<AdminStaffUser[]>(() => {
    const data = this.roleData();
    if (!data || !data.users) return [];

    const q = this.searchQuery().toLowerCase().trim();
    const roleF = this.selectedRoleFilter();
    const statusF = this.selectedStatusFilter();

    return data.users.filter(u => {
      const matchQuery = !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q) ||
        u.designation.toLowerCase().includes(q) ||
        u.department.toLowerCase().includes(q) ||
        u.roleName.toLowerCase().includes(q);

      const matchRole = roleF === 'all' || u.role === roleF;
      const matchStatus = statusF === 'all' || u.status === statusF;

      return matchQuery && matchRole && matchStatus;
    });
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.adminService.fetchRolesAndStaff(
      this.searchQuery(),
      this.selectedRoleFilter(),
      this.selectedStatusFilter()
    ).subscribe({
      next: (data) => {
        this.roleData.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed.update(prev => !prev);
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
  }

  setRoleFilter(role: string): void {
    this.selectedRoleFilter.set(role);
  }

  setStatusFilter(status: string): void {
    this.selectedStatusFilter.set(status);
  }

  // -----------------------------------------------------------------
  // Create Modal Actions
  // -----------------------------------------------------------------
  openCreateModal(): void {
    const defaultRole = 'sales_executive';
    const catalog = this.roleData()?.availableRoles || [];
    const roleMeta = catalog.find(r => r.id === defaultRole);

    this.createForm = {
      name: '',
      email: '',
      phone: '',
      role: defaultRole,
      department: 'Sales & Lead Acquisition',
      designation: roleMeta?.name || 'Sales executive',
      password: this.generateRandomPassword(),
      permissions: [...(roleMeta?.defaultPermissions || [])]
    };
    this.showPassword.set(true);
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  onRoleSelectionChange(newRole: string): void {
    this.createForm.role = newRole;
    const catalog = this.roleData()?.availableRoles || [];
    const roleMeta = catalog.find(r => r.id === newRole);
    if (roleMeta) {
      this.createForm.designation = roleMeta.name;
      this.createForm.permissions = [...roleMeta.defaultPermissions];
    }
  }

  togglePermission(permKey: string, isEdit: boolean = false): void {
    const list = isEdit ? this.editForm.permissions : this.createForm.permissions;
    const idx = list.indexOf(permKey);
    if (idx > -1) {
      list.splice(idx, 1);
    } else {
      list.push(permKey);
    }
  }

  hasPermission(permKey: string, isEdit: boolean = false): boolean {
    const list = isEdit ? this.editForm.permissions : this.createForm.permissions;
    return list.includes(permKey);
  }

  submitCreate(): void {
    if (!this.createForm.name.trim()) {
      this.notificationService.show({
        type: 'error',
        title: 'Validation Error',
        message: 'Please enter the full legal name of the administrator',
        icon: 'error'
      });
      return;
    }
    if (!this.createForm.email.trim() || !this.createForm.email.includes('@')) {
      this.notificationService.show({
        type: 'error',
        title: 'Validation Error',
        message: 'Please enter a valid official email address',
        icon: 'error'
      });
      return;
    }
    if (!this.createForm.password.trim() || this.createForm.password.length < 4) {
      this.notificationService.show({
        type: 'error',
        title: 'Validation Error',
        message: 'Password must be at least 4 characters long',
        icon: 'error'
      });
      return;
    }

    this.isSubmitting.set(true);
    this.adminService.createStaffRole({
      name: this.createForm.name.trim(),
      email: this.createForm.email.trim(),
      phone: this.createForm.phone.trim(),
      role: this.createForm.role,
      department: this.createForm.department.trim(),
      designation: this.createForm.designation.trim(),
      password: this.createForm.password.trim(),
      permissions: this.createForm.permissions
    }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeCreateModal();
        this.loadData();
      },
      error: () => {
        this.isSubmitting.set(false);
      }
    });
  }

  // -----------------------------------------------------------------
  // Edit Modal Actions
  // -----------------------------------------------------------------
  openEditModal(user: AdminStaffUser): void {
    this.selectedUserForEdit.set(user);
    this.editForm = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone === '—' ? '' : user.phone,
      role: user.role,
      department: user.department,
      designation: user.designation,
      status: user.status,
      newPassword: '',
      permissions: [...user.permissions]
    };
    this.showEditPassword.set(false);
    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
    this.selectedUserForEdit.set(null);
  }

  submitEdit(): void {
    const user = this.selectedUserForEdit();
    if (!user) return;

    this.isSubmitting.set(true);
    this.adminService.updateStaffRole({
      id: user.id,
      name: this.editForm.name.trim(),
      phone: this.editForm.phone.trim(),
      role: this.editForm.role,
      department: this.editForm.department.trim(),
      designation: this.editForm.designation.trim(),
      status: this.editForm.status,
      new_password: this.editForm.newPassword.trim() || undefined,
      permissions: this.editForm.permissions
    }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeEditModal();
        this.loadData();
      },
      error: () => {
        this.isSubmitting.set(false);
      }
    });
  }

  // -----------------------------------------------------------------
  // Revoke / Delete Actions
  // -----------------------------------------------------------------
  confirmRevoke(user: AdminStaffUser): void {
    if (user.id === 104 || user.id === 103) {
      this.notificationService.show({
        type: 'warning',
        title: 'Action Restricted',
        message: 'Primary Super Administrator account cannot be revoked',
        icon: 'security'
      });
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to revoke administrative access for "${user.name}" (${user.email})?\n\nThis will demote the account to a standard user.`
    );
    if (!confirmed) return;

    this.adminService.revokeStaffRole(user.id).subscribe({
      next: () => {
        this.loadData();
      }
    });
  }

  quickStatusToggle(user: AdminStaffUser): void {
    if (user.id === 104 || user.id === 103) return;
    const nextStatus = user.status === 'active' ? 'suspended' : 'active';
    this.adminService.updateStaffRole({
      id: user.id,
      status: nextStatus
    }).subscribe({
      next: () => {
        this.loadData();
      }
    });
  }

  // -----------------------------------------------------------------
  // Utilities & Helpers
  // -----------------------------------------------------------------
  generateRandomPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let result = '';
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  copyPassword(text: string): void {
    navigator.clipboard.writeText(text);
    this.notificationService.show({
      type: 'info',
      title: 'Copied to Clipboard',
      message: 'Password copied to clipboard',
      icon: 'content_copy'
    });
  }

  getInitialsBg(initials: string): string {
    switch (initials) {
      case 'BE': return '#0F766E';
      case 'EZ': return '#2563EB';
      case 'RA': return '#7C3AED';
      default: return '#334155';
    }
  }

  signOut(): void {
    this.adminService.logout();
    this.router.navigate(['/admin/login']);
  }
}

