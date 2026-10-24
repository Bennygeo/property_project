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

          <!-- Simple Options List (No boxes, no grid) -->
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

          <!-- Other Custom Purpose Input (Expands when 'other' is chosen) -->
          @if (selectedKey() === 'other') {
            <div class="other-input-block">
              <input 
                id="other-note-input"
                type="text" 
                class="other-input-field" 
                placeholder="Specify your requirement (e.g., commercial, NRI, JV)..." 
                [ngModel]="noteInput()" 
                (ngModelChange)="noteInput.set($event)"
                (keydown.enter)="onConfirm()" />
            </div>
          }

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
      border-radius: 18px;
      max-width: 480px;
      width: 100%;
      box-shadow: 0 20px 45px -12px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(226, 232, 240, 0.9);
      position: relative;
      overflow: hidden;
      padding: 1.5rem 1.6rem 1.35rem;
      display: flex;
      flex-direction: column;
      gap: 1.15rem;
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
      font-size: 1.3rem;
      font-weight: 600;
      color: #0f172a;
      letter-spacing: -0.02em;
      margin: 0;
      line-height: 1.25;
    }

    .modal-subheading {
      font-size: 12.5px;
      color: #64748b;
      margin: 0;
      line-height: 1.4;
    }

    .btn-close-modal {
      width: 30px;
      height: 30px;
      border-radius: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #64748b;
      cursor: pointer;
      font-size: 20px;
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

    /* Simple List (No box, no grid) */
    .purposes-list {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .purpose-item {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.7rem 0.85rem;
      border-radius: 10px;
      cursor: pointer;
      background: transparent;
      transition: background-color 0.15s ease;
    }

    .purpose-item:hover {
      background: #f8fafc;
    }

    .purpose-item.selected {
      background: var(--brand-green-subtle, #e5f7ec);
    }

    .radio-indicator {
      width: 18px;
      height: 18px;
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
      border-color: var(--brand-green, #5e8f72);
      background: var(--brand-green, #5e8f72);
    }

    .radio-dot {
      width: 6px;
      height: 6px;
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
      gap: 2px;
    }

    .purpose-title {
      font-size: 0.92rem;
      font-weight: 600;
      color: #0f172a;
      margin: 0;
      letter-spacing: -0.01em;
      line-height: 1.25;
    }

    .purpose-item.selected .purpose-title {
      color: var(--brand-green-dark, #2c4938);
    }

    .purpose-tagline {
      font-size: 12px;
      color: #64748b;
      margin: 0;
      line-height: 1.35;
    }

    /* Other Note Input */
    .other-input-block {
      animation: fadeIn 0.18s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-3px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .other-input-field {
      width: 100%;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 9px 12px;
      font-size: 12.5px;
      color: #0f172a;
      outline: none;
      transition: all 0.15s ease;
      font-family: inherit;
    }

    .other-input-field:focus {
      background: #ffffff;
      border-color: var(--brand-green, #5e8f72);
      box-shadow: 0 0 0 3px rgba(94, 143, 114, 0.15);
    }

    /* Modal Footer */
    .modal-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding-top: 0.65rem;
      border-top: 1px solid #f1f5f9;
      margin-top: 0.25rem;
    }

    .btn-skip {
      background: transparent;
      border: none;
      font-size: 13px;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      padding: 6px 8px;
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
      background: var(--brand-green, #5e8f72);
      color: #ffffff;
      font-size: 13px;
      font-weight: 600;
      padding: 9px 20px;
      border-radius: 10px;
      border: none;
      cursor: pointer;
      transition: all 0.18s ease;
    }

    .btn-continue:hover:not(:disabled) {
      background: var(--brand-green-hover, #497259);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(94, 143, 114, 0.28);
    }

    .btn-continue:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    @media (max-width: 500px) {
      .intent-modal-container {
        padding: 1.25rem 1rem 1rem;
        border-radius: 16px;
        gap: 0.95rem;
      }
      .modal-heading {
        font-size: 1.2rem;
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
        return 'Explore Plots';
      case 'investment':
        return 'Explore Investments';
      case 'farm_land':
        return 'Explore Farmland';
      case 'other':
        return 'Continue';
      default:
        return 'Continue';
    }
  }

  onConfirm(): void {
    const key = this.selectedKey();
    if (!key) return;
    const note = key === 'other' ? this.noteInput() : undefined;
    this.visitorService.savePurpose(key, note);
  }
}
