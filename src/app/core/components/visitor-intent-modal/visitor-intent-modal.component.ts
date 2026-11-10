import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VisitorPurposeService, VisitorPurposeKey } from '../../services/visitor-purpose.service';

@Component({
  selector: 'app-visitor-intent-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (visitorService.isModalOpen()) {
      <div class="intent-modal-backdrop" (click)="onBackdropClick($event)">
        <div class="intent-modal-container" (click)="$event.stopPropagation()">
          
          <!-- Clean Minimal Header -->
          <div class="modal-header">
            <div class="header-titles">
              <h2 class="modal-heading">What is your primary goal?</h2>
              <p class="modal-subheading">Personalize your verified listings and architectural survey views</p>
            </div>

            <button 
              type="button" 
              class="btn-close-modal" 
              (click)="visitorService.closeModal()" 
              aria-label="Close modal">
              &times;
            </button>
          </div>

          <!-- Options List -->
          <div class="purposes-list">
            @for (opt of visitorService.options; track opt.key) {
              <div 
                class="purpose-item" 
                [class.selected]="selectedKey() === opt.key"
                (click)="onSelect(opt.key)">
                <div class="radio-indicator" aria-hidden="true">
                  <div class="radio-dot"></div>
                </div>
                <div class="item-text">
                  <span class="purpose-title">{{ opt.title }}</span>
                  <span class="purpose-tagline">{{ opt.tagline }}</span>
                </div>
              </div>
            }
          </div>

          <!-- Minimal Footer Actions -->
          <div class="modal-footer">
            <button 
              type="button" 
              class="btn-skip" 
              (click)="visitorService.closeModal()">
              Skip for now
            </button>

            <button 
              type="button" 
              class="btn-continue" 
              [disabled]="!selectedKey()"
              (click)="onConfirm()">
              {{ getActionLabel() }}
            </button>
          </div>

        </div>
      </div>
    }
  `,
  styles: [`
    .intent-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      z-index: 99999;
      animation: backdropFadeIn 0.2s ease-out forwards;
    }

    @keyframes backdropFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .intent-modal-container {
      background: #ffffff;
      border-radius: 9px;
      max-width: 520px;
      width: 100%;
      box-shadow: 0 20px 45px -12px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(226, 232, 240, 0.9);
      position: relative;
      overflow: hidden;
      padding: 1.35rem 1.45rem 1.15rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      animation: modalPopIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      font-family: inherit;
    }

    @keyframes modalPopIn {
      from {
        opacity: 0;
        transform: scale(0.96) translateY(8px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    /* Modal Header */
    .modal-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
    }

    .header-titles {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .modal-heading {
      font-size: 0.9rem;
      font-weight: 500;
      color: #0f172a;
      letter-spacing: -0.02em;
      margin: 0;
      line-height: 1.25;
    }

    .modal-subheading {
      font-size: 12px;
      color: #64748b;
      margin: 0;
      line-height: 1.4;
    }

    .btn-close-modal {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #64748b;
      cursor: pointer;
      font-size: 18px;
      line-height: 1;
      font-weight: 400;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }

    .btn-close-modal:hover {
      background: #f1f5f9;
      color: #0f172a;
      border-color: #cbd5e1;
    }

    /* Options List */
    .purposes-list {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      max-height: 56vh;
      overflow-y: auto;
      padding-right: 4px;
    }

    .purposes-list::-webkit-scrollbar {
      width: 5px;
    }

    .purposes-list::-webkit-scrollbar-track {
      background: #f8fafc;
      border-radius: 4px;
    }

    .purposes-list::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 4px;
    }

    .purpose-item {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.55rem 0.75rem;
      border-radius: 8px;
      cursor: pointer;
      background: transparent;
      border: 1px solid transparent;
      transition: all 0.15s ease;
    }

    .purpose-item:hover {
      background: #f8fafc;
      border-color: #f1f5f9;
    }

    .purpose-item.selected {
      background: #e5f7ec;
      border-color: rgba(94, 143, 114, 0.35);
    }

    .radio-indicator {
      width: 17px;
      height: 17px;
      border-radius: 50%;
      border: 1.5px solid #cbd5e1;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 2px;
      transition: all 0.15s ease;
    }

    .purpose-item.selected .radio-indicator {
      border-color: #5e8f72;
      background: #5e8f72;
    }

    .radio-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: transparent;
      transition: background 0.15s ease;
    }

    .purpose-item.selected .radio-dot {
      background: #ffffff;
    }

    .item-text {
      display: flex;
      flex-direction: column;
      gap: 1.5px;
    }

    .purpose-title {
      font-size: 0.88rem;
      font-weight: 500;
      color: #0f172a;
      margin: 0;
      letter-spacing: -0.01em;
      line-height: 1.25;
    }

    .purpose-item.selected .purpose-title {
      color: #2c4938;
    }

    .purpose-tagline {
      font-size: 11px;
      color: #64748b;
      margin: 0;
      line-height: 1.35;
    }

    /* Modal Footer */
    .modal-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding-top: 0.65rem;
      border-top: 1px solid #f1f5f9;
      margin-top: 0.15rem;
    }

    .btn-skip {
      background: transparent;
      border: none;
      font-size: 12px;
      font-weight: 500;
      color: #64748b;
      cursor: pointer;
      padding: 5px 8px;
      border-radius: 6px;
      transition: color 0.15s ease;
    }

    .btn-skip:hover {
      color: #0f172a;
    }

    .btn-continue {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: #5e8f72;
      color: #ffffff;
      font-size: 12px;
      font-weight: 500;
      padding: 8px 18px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      transition: all 0.18s ease;
    }

    .btn-continue:hover:not(:disabled) {
      background: #497259;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(94, 143, 114, 0.25);
    }

    .btn-continue:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    @media (max-width: 500px) {
      .intent-modal-container {
        padding: 1.15rem 1rem 0.95rem;
        border-radius: 8px;
        gap: 0.85rem;
      }
      .modal-heading {
        font-size: 1rem;
      }
    }
  `]
})
export class VisitorIntentModalComponent {
  readonly visitorService = inject(VisitorPurposeService);

  readonly selectedKey = signal<VisitorPurposeKey>('build_home');

  constructor() {
    const existing = this.visitorService.currentPurpose();
    if (existing) {
      this.selectedKey.set(existing);
    }
  }

  onSelect(key: VisitorPurposeKey): void {
    this.selectedKey.set(key);
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.visitorService.closeModal();
    }
  }

  getActionLabel(): string {
    const key = this.selectedKey();
    switch (key) {
      case 'build_home':
        return 'Explore Plots to Build';
      case 'investment':
        return 'Explore Long-Term Investments';
      case 'premium_plots':
        return 'Explore Premium Plots';
      case 'growth_locations':
        return 'Explore Growth Locations';
      case 'budget_plots':
        return 'Explore Budget Plots';
      case 'large_land':
        return 'Explore Land Investments';
      case 'exploring':
      default:
        return 'Start Exploring';
    }
  }

  onConfirm(): void {
    const key = this.selectedKey();
    if (!key) return;
    this.visitorService.savePurpose(key);
  }
}
