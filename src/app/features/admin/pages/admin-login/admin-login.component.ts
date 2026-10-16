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
  title: string;
  avatarInitials: string;
  email: string;
  defaultPassword: string;
  department?: string;
  responsibility?: string;
}

export const ADMIN_CREDENTIALS: AdminCredentialInfo[] = [
  {
    id: 101,
    name: 'Ezhil',
    role: 'admin',
    title: 'Photography & Marketing',
    avatarInitials: 'EZ',
    email: 'ezhil@mannidam.com',
    defaultPassword: 'ezhil@2026',
    department: 'Media Production & Visual Marketing',
    responsibility: 'Photography and marketing'
  },
  {
    id: 102,
    name: 'Ram',
    role: 'co_admin',
    title: 'Marketing, Broker Relations & Site Promotion',
    avatarInitials: 'RA',
    email: 'ram@mannidam.com',
    defaultPassword: 'ram@2026',
    department: 'Broker Network & Site Promotion',
    responsibility: 'Marketing and site promotion'
  },
  {
    id: 103,
    name: 'Benny',
    role: 'admin',
    title: 'Web Development & Online Customer Handling',
    avatarInitials: 'BE',
    email: 'benny@mannidam.com',
    defaultPassword: 'benny@2026',
    department: 'Technology & Online Customer Operations',
    responsibility: 'Web development and online customer handling'
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

  readonly adminAccounts = ADMIN_CREDENTIALS;

  loginId = signal<string>('ezhil@mannidam.com');
  password = signal<string>('ezhil@2026');
  errorMessage = signal<string>('');

  // Select admin and populate their distinct credentials
  selectAdmin(admin: AdminCredentialInfo): void {
    this.loginId.set(admin.email);
    this.password.set(admin.defaultPassword);
    this.errorMessage.set('');
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
        this.router.navigate(['/admin']);
      } else {
        this.errorMessage.set(res.message || 'Invalid credentials');
      }
    });
  }
}

