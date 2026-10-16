import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VisitorPurposeService } from '../../../../core/services/visitor-purpose.service';

@Component({
  selector: 'app-top-concierge-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside class="concierge-bar">
      <div class="max-w-content bar-content">
        <div class="bar-left">
          <span class="live-pill">
            <span class="pulse-dot"></span>
            Live Cadastre
          </span>
          <span class="text-white hidden-sm">100% Direct Owner Deeds &amp; RERA Sanctioned Audits</span>

          <!-- Visitor Purpose Indicator & Switcher Button -->
          <button 
            type="button" 
            class="goal-pill-btn" 
            (click)="visitorService.openModal()"
            title="Click to personalize or change your visit purpose">
            <span class="material-symbols-outlined goal-icon">
              {{ visitorService.getSelectedOption()?.icon || 'explore' }}
            </span>
            <span>Goal: {{ visitorService.getSelectedOption()?.title || 'Personalize' }}</span>
            <span class="material-symbols-outlined goal-arrow">tune</span>
          </button>
        </div>
        
        <div class="bar-right">
          <a class="wa-link" href="https://wa.me/919444100000" target="_blank" rel="noopener">
            <span class="material-symbols-outlined icon-small">chat</span>
            <span>WhatsApp</span>
          </a>
          <span class="divider">|</span>
          <a class="phone-link" href="tel:18004196266">
            <span class="material-symbols-outlined icon-small">call</span>
            <span>TOLL-FREE: 1800-419-MANNIDAM</span>
          </a>
        </div>
      </div>
    </aside>
  `,
  styles: [`
    .concierge-bar {
      width: 100%;
      background-color: #020617;
      color: #cbd5e1;
      padding: 0.5rem 0;
      font-size: 12px;
      border-bottom: 1px solid #1e293b;
    }
    .bar-content {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }
    .bar-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .live-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 2px 8px;
      border-radius: 4px;
      background-color: rgba(16, 185, 129, 0.2);
      color: #6ee7b7;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 9999px;
      background-color: #34d399;
      animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(1.2); }
    }
    .text-white {
      color: #f1f5f9;
      font-weight: 500;
    }
    .text-slate {
      color: #94a3b8;
    }
    .divider {
      color: #334155;
    }
    .bar-right {
      display: flex;
      align-items: center;
      gap: 1rem;
      font-size: 11px;
      font-weight: 500;
      margin-left: auto;
    }
    .wa-link {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #34d399;
      text-decoration: none;
      transition: color 0.15s;
    }
    .wa-link:hover {
      color: #6ee7b7;
    }
    .phone-link {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #e2e8f0;
      font-weight: 700;
      text-decoration: none;
      transition: color 0.15s;
    }
    .phone-link:hover {
      color: #ffffff;
    }
    .icon-small {
      font-size: 14px;
    }
    .goal-pill-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2px 10px;
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.16);
      color: #f1f5f9;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .goal-pill-btn:hover {
      background: rgba(255, 255, 255, 0.18);
      border-color: rgba(255, 255, 255, 0.35);
      color: #ffffff;
      transform: translateY(-1px);
    }
    .goal-icon {
      font-size: 13px;
      color: #38bdf8;
    }
    .goal-arrow {
      font-size: 13px;
      color: #94a3b8;
    }
    @media (max-width: 640px) {
      .hidden-sm { display: none; }
    }
    @media (max-width: 768px) {
      .hidden-md { display: none; }
    }
    @media (max-width: 1024px) {
      .hidden-lg { display: none; }
    }
  `]
})
export class TopConciergeBarComponent {
  readonly visitorService = inject(VisitorPurposeService);
}
