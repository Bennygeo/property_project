import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VisitorPurposeService, VisitorPurposeKey, VisitorPurposeOption } from '../../services/visitor-purpose.service';

@Component({
  selector: 'app-visitor-intent-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (visitorService.isModalOpen()) {
      <div class="intent-modal-backdrop" (click)="onBackdropClick($event)">
        <div class="intent-modal-container" (click)="$event.stopPropagation()">
          
          <!-- Top Decorative Accent Bar -->
          <div class="top-accent-line"></div>

          <!-- Modal Header -->
          <div class="modal-header">
            <div class="header-brand-badge">
              <span class="badge-dot"></span>
              <span class="badge-text">WELCOME TO MANNIDAM • ARCHITECTURAL REAL ESTATE</span>
            </div>

            <button 
              type="button" 
              class="btn-close-modal" 
              (click)="visitorService.closeModal()" 
              aria-label="Dismiss welcome popup">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div class="header-titles">
            <h2 class="modal-heading">What is the purpose of your visit today?</h2>
            <p class="modal-subheading">
              Select your primary goal to help us tailor verified no-brokerage listings, 4K architectural walkthroughs, and cadastral maps.
            </p>
          </div>

          <!-- Purpose Cards 2x2 Grid -->
          <div class="purposes-grid">
            @for (opt of visitorService.options; track opt.key) {
              <div 
                class="purpose-card" 
                [class.selected]="selectedKey() === opt.key"
                [style.--theme-color]="opt.themeColor"
                [style.--theme-light-bg]="opt.lightBg"
                (click)="onSelect(opt.key)">
                
                <div class="card-top-row">
                  <div class="icon-avatar" [style.background]="opt.lightBg" [style.color]="opt.themeColor">
                    <span class="material-symbols-outlined">{{ opt.icon }}</span>
                  </div>
                  
                  <div class="selection-indicator">
                    <span class="material-symbols-outlined check-icon">
                      {{ selectedKey() === opt.key ? 'check_circle' : 'radio_button_unchecked' }}
                    </span>
                  </div>
                </div>

                <div class="card-content">
                  <div class="card-badge-row">
                    <span class="option-badge">{{ opt.badge }}</span>
                  </div>
                  <h3 class="purpose-title">{{ opt.title }}</h3>
                  <p class="purpose-tagline">{{ opt.tagline }}</p>
                </div>
              </div>
            }
          </div>

          <!-- Other Custom Purpose Input (Expands when 'other' is chosen) -->
          @if (selectedKey() === 'other') {
            <div class="other-input-block">
              <label for="other-note-input" class="other-label">
                <span class="material-symbols-outlined">edit_note</span>
                <span>Tell us a bit more about what you're looking for (optional):</span>
              </label>
              <input 
                id="other-note-input"
                type="text" 
                class="other-input-field" 
                placeholder="e.g. NRI relocation, commercial warehouse, JV development..." 
                [ngModel]="noteInput()" 
                (ngModelChange)="noteInput.set($event)"
                (keydown.enter)="onConfirm()" />
            </div>
          }

          <!-- Footer Actions Strip -->
          <div class="modal-footer">
            <button 
              type="button" 
              class="btn-skip" 
              (click)="visitorService.closeModal()">
              <span>Skip for now</span>
            </button>

            <button 
              type="button" 
              class="btn-continue" 
              [disabled]="!selectedKey()"
              (click)="onConfirm()">
              <span>{{ getActionLabel() }}</span>
              <span class="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>

          <!-- Trust Strip at the Bottom -->
          <div class="bottom-trust-strip">
            <div class="trust-badge">
              <span class="material-symbols-outlined">verified</span>
              <span>100% Direct Owner</span>
            </div>
            <div class="trust-dot">•</div>
            <div class="trust-badge">
              <span class="material-symbols-outlined">videocam</span>
              <span>4K Architectural Walkthroughs</span>
            </div>
            <div class="trust-dot">•</div>
            <div class="trust-badge">
              <span class="material-symbols-outlined">map</span>
              <span>Cadastral Boundary Scans</span>
            </div>
          </div>

        </div>
      </div>
    }
  `,
  styles: [`
    .intent-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.72);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.25rem;
      z-index: 99999;
      animation: backdropFadeIn 0.25s ease-out forwards;
    }

    @keyframes backdropFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .intent-modal-container {
      background: #ffffff;
      border-radius: 24px;
      max-width: 680px;
      width: 100%;
      box-shadow: 0 25px 60px -15px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(226, 232, 240, 0.8);
      position: relative;
      overflow: hidden;
      padding: 2rem 2.25rem 1.75rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      animation: modalPopIn 0.32s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }

    @keyframes modalPopIn {
      from {
        opacity: 0;
        transform: scale(0.94) translateY(12px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    .top-accent-line {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #b91c1c 0%, #ea580c 35%, #059669 70%, #7c3aed 100%);
    }

    /* Modal Header */
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .header-brand-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 9999px;
      background: #fef2f2;
      border: 1px solid #fee2e2;
    }

    .badge-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #b91c1c;
      box-shadow: 0 0 8px rgba(185, 28, 28, 0.6);
    }

    .badge-text {
      font-size: 10.5px;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #991b1b;
    }

    .btn-close-modal {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: #f1f5f9;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #64748b;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-close-modal:hover {
      background: #e2e8f0;
      color: #0f172a;
    }

    .btn-close-modal .material-symbols-outlined {
      font-size: 18px;
    }

    .header-titles {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .modal-heading {
      font-size: 1.55rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.025em;
      margin: 0;
      line-height: 1.25;
    }

    @media (min-width: 640px) {
      .modal-heading {
        font-size: 1.75rem;
      }
    }

    .modal-subheading {
      font-size: 13.5px;
      color: #64748b;
      margin: 0;
      line-height: 1.5;
    }

    /* Purpose Grid */
    .purposes-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.85rem;
    }

    @media (min-width: 580px) {
      .purposes-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    .purpose-card {
      background: #ffffff;
      border: 2px solid #e2e8f0;
      border-radius: 16px;
      padding: 1.15rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      cursor: pointer;
      position: relative;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
    }

    .purpose-card:hover {
      border-color: var(--theme-color);
      transform: translateY(-2px);
      box-shadow: 0 8px 18px -4px rgba(0, 0, 0, 0.08);
    }

    .purpose-card.selected {
      border-color: var(--theme-color);
      background: var(--theme-light-bg);
      box-shadow: 0 10px 22px -4px rgba(0, 0, 0, 0.1);
    }

    .card-top-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .icon-avatar {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: transform 0.2s ease;
    }

    .purpose-card:hover .icon-avatar {
      transform: scale(1.08);
    }

    .icon-avatar .material-symbols-outlined {
      font-size: 24px;
    }

    .selection-indicator .check-icon {
      font-size: 22px;
      color: #cbd5e1;
      transition: all 0.2s ease;
    }

    .purpose-card.selected .selection-indicator .check-icon {
      color: var(--theme-color);
    }

    .card-content {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .card-badge-row {
      display: flex;
    }

    .option-badge {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
    }

    .purpose-card.selected .option-badge {
      color: var(--theme-color);
    }

    .purpose-title {
      font-size: 1.05rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
      letter-spacing: -0.01em;
    }

    .purpose-tagline {
      font-size: 12px;
      color: #64748b;
      margin: 0;
      line-height: 1.4;
    }

    /* Other Note Input */
    .other-input-block {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 0.85rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 6px;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .other-label {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      font-weight: 700;
      color: #475569;
    }

    .other-label .material-symbols-outlined {
      font-size: 16px;
      color: #7c3aed;
    }

    .other-input-field {
      width: 100%;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 13px;
      color: #0f172a;
      outline: none;
      transition: all 0.15s ease;
    }

    .other-input-field:focus {
      border-color: #7c3aed;
      box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15);
    }

    /* Modal Footer */
    .modal-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding-top: 0.5rem;
      border-top: 1px solid #f1f5f9;
    }

    .btn-skip {
      background: transparent;
      border: none;
      font-size: 13px;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      padding: 8px 12px;
      border-radius: 8px;
      transition: all 0.15s ease;
    }

    .btn-skip:hover {
      color: #0f172a;
      background: #f1f5f9;
    }

    .btn-continue {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #b91c1c;
      color: #ffffff;
      font-size: 13.5px;
      font-weight: 700;
      padding: 10px 20px;
      border-radius: 12px;
      border: none;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 4px 12px rgba(185, 28, 28, 0.25);
    }

    .btn-continue:hover:not(:disabled) {
      background: #991b1b;
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(185, 28, 28, 0.35);
    }

    .btn-continue:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      box-shadow: none;
    }

    .btn-continue .material-symbols-outlined {
      font-size: 18px;
      transition: transform 0.15s ease;
    }

    .btn-continue:hover:not(:disabled) .material-symbols-outlined {
      transform: translateX(2px);
    }

    /* Bottom Trust Strip */
    .bottom-trust-strip {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 11.5px;
      color: #64748b;
      padding-top: 0.25rem;
    }

    .trust-badge {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .trust-badge .material-symbols-outlined {
      font-size: 14px;
      color: #10b981;
    }

    .trust-dot {
      color: #cbd5e1;
    }

    @media (max-width: 500px) {
      .intent-modal-container {
        padding: 1.5rem 1.25rem 1.25rem;
        border-radius: 20px;
      }
      .bottom-trust-strip {
        font-size: 10.5px;
        flex-wrap: wrap;
      }
    }
  `]
})
export class VisitorIntentModalComponent {
  readonly visitorService = inject(VisitorPurposeService);

  readonly selectedKey = signal<VisitorPurposeKey>('build_home');
  readonly noteInput = signal<string>('');

  constructor() {
    const existing = this.visitorService.currentPurpose();
    if (existing) {
      this.selectedKey.set(existing);
    }
    const note = this.visitorService.currentNote();
    if (note) {
      this.noteInput.set(note);
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
        return 'Explore Plots to Build a Home';
      case 'investment':
        return 'Explore High-Yield Investments';
      case 'farm_land':
        return 'Explore Farmland Enclaves';
      case 'other':
        return 'Continue Exploring';
      default:
        return 'Confirm & Explore';
    }
  }

  onConfirm(): void {
    const key = this.selectedKey();
    if (!key) return;
    const note = key === 'other' ? this.noteInput() : undefined;
    this.visitorService.savePurpose(key, note);
  }
}
