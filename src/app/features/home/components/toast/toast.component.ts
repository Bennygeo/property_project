import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container" aria-live="polite">
      @for (toast of notificationService.toasts(); track toast.id) {
        <div class="toast-item" [ngClass]="toast.type">
          <div class="toast-icon">
            <span class="material-symbols-outlined">{{ toast.icon || getFallbackIcon(toast.type) }}</span>
          </div>
          <div class="toast-body">
            <div class="toast-title">{{ toast.title }}</div>
            <div class="toast-message">{{ toast.message }}</div>
          </div>
          <button class="toast-close" (click)="notificationService.dismiss(toast.id)" aria-label="Dismiss">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-width: 420px;
      width: calc(100vw - 3rem);
      pointer-events: none;
    }
    .toast-item {
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.875rem 1rem;
      background: #ffffff;
      color: #0f172a;
      border-radius: 8px;
      box-shadow: none !important;
      border: 1px solid rgba(94, 143, 114, 0.3);
      animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .toast-item.success {
      border: 1px solid rgba(94, 143, 114, 0.35);
    }
    .toast-item.success .toast-icon {
      color: #5e8f72;
    }
    .toast-item.warning {
      border: 1px solid rgba(217, 119, 6, 0.3);
    }
    .toast-item.warning .toast-icon {
      color: #d97706;
    }
    .toast-item.info {
      border: 1px solid rgba(15, 59, 74, 0.25);
    }
    .toast-item.info .toast-icon {
      color: #0f3b4a;
    }
    .toast-item.error {
      border: 1px solid rgba(220, 38, 38, 0.3);
    }
    .toast-item.error .toast-icon {
      color: #dc2626;
    }
    .toast-icon {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .toast-icon span {
      font-size: 20px;
    }
    .toast-body {
      flex: 1;
      min-width: 0;
    }
    .toast-title {
      font-size: 0.8125rem;
      font-weight: 600;
      color: #0f172a;
      line-height: 1.3;
    }
    .toast-message {
      font-size: 0.75rem;
      color: #64748b;
      margin-top: 0.15rem;
      line-height: 1.4;
    }
    .toast-close {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: color 0.15s, background-color 0.15s;
    }
    .toast-close:hover {
      color: #0f172a;
      background: #f1f5f9;
    }
    .toast-close span {
      font-size: 16px;
    }
    @keyframes slideIn {
      from {
        transform: translateY(100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
  `]
})
export class ToastComponent {
  readonly notificationService = inject(NotificationService);

  getFallbackIcon(type: string): string {
    switch (type) {
      case 'success': return 'check_circle';
      case 'warning': return 'warning';
      case 'info': return 'info';
      case 'error': return 'error';
      default: return 'notifications';
    }
  }
}
