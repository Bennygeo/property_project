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
      z-index: 2000;
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
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.875rem 1rem;
      background: #0f172a;
      color: #ffffff;
      border-radius: 0.75rem;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
      border: 1px solid #334155;
      animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .toast-item.success {
      border-left: 4px solid #10b981;
    }
    .toast-item.success .toast-icon {
      color: #34d399;
    }
    .toast-item.warning {
      border-left: 4px solid #f59e0b;
    }
    .toast-item.warning .toast-icon {
      color: #fbbf24;
    }
    .toast-item.info {
      border-left: 4px solid #3b82f6;
    }
    .toast-item.info .toast-icon {
      color: #60a5fa;
    }
    .toast-icon {
      flex-shrink: 0;
      margin-top: 1px;
    }
    .toast-body {
      flex: 1;
      min-width: 0;
    }
    .toast-title {
      font-size: 0.8125rem;
      font-weight: 700;
      color: #ffffff;
      line-height: 1.3;
    }
    .toast-message {
      font-size: 0.75rem;
      color: #94a3b8;
      margin-top: 0.25rem;
      line-height: 1.4;
    }
    .toast-close {
      background: transparent;
      border: none;
      color: #64748b;
      cursor: pointer;
      padding: 2px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: color 0.15s;
    }
    .toast-close:hover {
      color: #ffffff;
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
      default: return 'notifications';
    }
  }
}
