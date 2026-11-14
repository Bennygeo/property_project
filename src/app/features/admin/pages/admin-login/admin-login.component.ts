import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, ADMIN_PERSONAS } from '../../../../core/services/admin.service';
import { ToastComponent } from '../../../home/components/toast/toast.component';

export interface AdminCredentialInfo {
  id: number;
  name: string;
  role: string;
  roleLabel: string;
  title: string;
  avatarInitials: string;
  badgeColor: string;
  email: string;
  defaultPassword: string;
  department?: string;
  responsibility?: string;
  dashboardRoute: string;
}

export const ADMIN_CREDENTIALS: AdminCredentialInfo[] = [
  {
    id: 103,
    name: 'Benny',
    role: 'super_admin',
    roleLabel: 'Super Admin',
    title: 'Super Administrator & Technology Director',
    avatarInitials: 'BE',
    badgeColor: 'purple',
    email: 'benny@findaplot.com',
    defaultPassword: 'benny@2026',
    department: 'Platform Governance & Technology',
    responsibility: 'Full platform access & role management',
    dashboardRoute: '/admin'
  },
  {
    id: 108,
    name: 'Casagrand Partner Director',
    role: 'developer',
    roleLabel: 'Developer',
    title: 'Authorized Builder Promoter',
    avatarInitials: 'CB',
    badgeColor: 'cyan',
    email: 'developer@casagrand.com',
    defaultPassword: 'developer@2026',
    department: 'Casagrand Premier Builder Workspace',
    responsibility: 'Access only authorized company and projects',
    dashboardRoute: '/developer'
  },
  {
    id: 109,
    name: 'Suresh',
    role: 'sales_executive',
    roleLabel: 'Sales Executive',
    title: 'Senior Sales & Lead Acquisition Specialist',
    avatarInitials: 'SE',
    badgeColor: 'indigo',
    email: 'sales@findaplot.in',
    defaultPassword: 'sales@2026',
    department: 'Investor Relations & Direct Sales',
    responsibility: 'Manage assigned leads and customer follow-ups',
    dashboardRoute: '/portal/sales'
  },
  {
    id: 110,
    name: 'Dr. Ananya',
    role: 'property_advisor',
    roleLabel: 'Property Advisor',
    title: 'Principal Land & Property Advisor',
    avatarInitials: 'PA',
    badgeColor: 'emerald',
    email: 'advisor@findaplot.in',
    defaultPassword: 'advisor@2026',
    department: 'Cadastral & Investment Advisory',
    responsibility: 'Manage advisory sessions and recommendations',
    dashboardRoute: '/portal/advisor'
  },
  {
    id: 111,
    name: 'Karthik',
    role: 'operations_executive',
    roleLabel: 'Operations Executive',
    title: 'Site Visit Coordinator & Field Officer',
    avatarInitials: 'OE',
    badgeColor: 'amber',
    email: 'operations@findaplot.in',
    defaultPassword: 'operations@2026',
    department: 'Field Operations & Verification',
    responsibility: 'Manage site visits and coordination',
    dashboardRoute: '/portal/operations'
  },
  {
    id: 112,
    name: 'Lakshmi',
    role: 'finance_admin',
    roleLabel: 'Finance Admin',
    title: 'Finance Controller & Ledger Auditor',
    avatarInitials: 'FA',
    badgeColor: 'green',
    email: 'finance@findaplot.in',
    defaultPassword: 'finance@2026',
    department: 'Corporate Accounts & Settlements',
    responsibility: 'Payments, subscriptions and commissions',
    dashboardRoute: '/portal/finance'
  },
  {
    id: 113,
    name: 'Venkatesh',
    role: 'content_gis_admin',
    roleLabel: 'Content / GIS Admin',
    title: 'GIS Surveyor & Digital Content Administrator',
    avatarInitials: 'GA',
    badgeColor: 'rose',
    email: 'gis@findaplot.in',
    defaultPassword: 'gis@2026',
    department: 'Spatial Data, GIS & Media Production',
    responsibility: 'Localities, maps, media and project information',
    dashboardRoute: '/portal/gis'
  }
];

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ToastComponent
  ],
  templateUrl: './admin-login.component.html',
  styleUrls: ['./admin-login.component.css']
})
export class AdminLoginComponent {
  readonly adminService = inject(AdminService);
  readonly router = inject(Router);

  readonly credentials = ADMIN_CREDENTIALS;

  loginId = signal<string>('');
  password = signal<string>('');
  errorMessage = signal<string>('');

  quickSelect(cred: AdminCredentialInfo): void {
    this.loginId.set(cred.email);
    this.password.set(cred.defaultPassword);
    this.errorMessage.set('');
    this.onSubmit();
  }

  onSubmit(): void {
    if (!this.loginId().trim()) {
      this.errorMessage.set('Please enter your administrator email or username');
      return;
    }

    if (!this.password().trim()) {
      this.errorMessage.set('Please enter your password');
      return;
    }

    this.errorMessage.set('');
    this.adminService.login(this.loginId(), this.password()).subscribe(res => {
      if (res.success) {
        const dest = res.dashboardRoute || (res.admin as any)?.dashboardRoute || '/admin';
        this.router.navigateByUrl(dest);
      } else {
        this.errorMessage.set(res.message || 'Invalid credentials');
      }
    });
  }
}

