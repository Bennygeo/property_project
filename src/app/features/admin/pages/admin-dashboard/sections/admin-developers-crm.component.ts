import { Component, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UserMindsetBarComponent } from '../../../../../shared/components/user-mindset-bar/user-mindset-bar.component';
import { ADMIN_DASHBOARD_HOST } from './admin-dashboard-host.token';
import type { AdminDashboardComponent } from '../admin-dashboard.component';

export interface AdminDevelopersCrmComponent extends AdminDashboardComponent { }

@Component({
  selector: 'app-admin-developers-crm',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    UserMindsetBarComponent
  ],
  templateUrl: './admin-developers-crm.component.html',
  styles: [`
    .admin-modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 99999;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(3px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.25rem;
    }
    .developer-edit-modal {
      max-width: 720px;
      width: 100%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      background: #ffffff;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      box-shadow: none !important;
      overflow: hidden;
    }
    .admin-modal-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      padding: 1rem 1.5rem;
      background: #0f3b4a;
      color: #ffffff;
      border-bottom: 1px solid #1e4d58;
    }
    .modal-header-title {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    .modal-header-icon {
      font-size: 24px;
      color: #82c341;
      background: rgba(255, 255, 255, 0.12);
      padding: 8px;
      border-radius: 6px;
    }
    .modal-header-title h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 700;
      color: #ffffff;
    }
    .modal-header-title p {
      margin: 3px 0 0;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.82);
    }
    .btn-modal-close {
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #ffffff;
      width: 32px;
      height: 32px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
    }
    .modal-form-section {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .section-badge-title {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 700;
      color: #0f3b4a;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .section-lead-text {
      margin: 0;
      font-size: 12px;
      color: #64748b;
      line-height: 1.45;
    }
    .admin-modal-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      padding: 0.9rem 1.5rem;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
    }
    .btn-modal-cancel {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #475569;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-modal-save {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #0f3b4a;
      border: 1px solid #0f3b4a;
      color: #ffffff;
      padding: 8px 18px;
      border-radius: 6px;
      font-size: 12.5px;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-modal-save:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `],
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' }
})
export class AdminDevelopersCrmComponent {
  constructor() {
    const parent = inject(ADMIN_DASHBOARD_HOST);
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (typeof prop === 'symbol' || String(prop).startsWith('__')) {
          return Reflect.get(target, prop, receiver);
        }
        const val = (parent as any)[prop];
        if (typeof val === 'function' && !Object.prototype.hasOwnProperty.call(parent, prop)) {
          return val.bind(parent);
        }
        return val;
      },
      set(target, prop, value, receiver) {
        if (typeof prop === 'symbol' || String(prop).startsWith('__')) {
          return Reflect.set(target, prop, value, receiver);
        }
        (parent as any)[prop] = value;
        return true;
      }
    });
  }
}