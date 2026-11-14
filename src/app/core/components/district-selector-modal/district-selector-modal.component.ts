import { Component, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LocationService, TamilNaduDistrict } from '../../services/location.service';

@Component({
  selector: 'app-district-selector-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (locationService.isModalOpen()) {
      <div class="district-modal-backdrop" (click)="onBackdropClick($event)">
        <div class="district-modal-card" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-labelledby="district-modal-title">
          
          <!-- Modal Header -->
          <div class="district-modal-header">
            <div class="header-texts">
              <p class="district-modal-subtitle">
                Find a Plot currently operates across Tamil Nadu. Select your district to explore verified plots, layouts &amp; registered deeds.
              </p>
            </div>

            <button 
              type="button" 
              class="btn-close-modal" 
              (click)="locationService.closeDistrictModal()" 
              aria-label="Close district selector">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <!-- Location Blocked Banner (If browser denied permission) -->
          @if (locationService.isBlocked()) {
            <div class="location-blocked-banner">
              <div class="blocked-icon-circle">
                <span class="material-symbols-outlined">location_off</span>
              </div>
              <div class="blocked-text">
                <span class="blocked-title">Location Access Blocked</span>
                <span class="blocked-desc">
                  Your browser blocked location access. Please choose your district from the list below.
                </span>
              </div>
            </div>
          }

          <!-- GPS Detect Quick Action -->
          <div class="gps-detect-bar">
            <button 
              type="button" 
              class="btn-gps-detect" 
              [class.detecting]="locationService.isDetecting()" 
              [disabled]="locationService.isDetecting()"
              (click)="locationService.detectLocation({ autoPromptOnBlock: false })">
              <span class="material-symbols-outlined gps-icon" [class.spin]="locationService.isDetecting()">
                {{ locationService.isDetecting() ? 'progress_activity' : 'my_location' }}
              </span>
              <span>{{ locationService.isDetecting() ? 'Detecting Your Location...' : 'Detect My Location' }}</span>
            </button>
          </div>

          <!-- Typeahead Search Input -->
          <div class="district-search-bar">
            <span class="material-symbols-outlined search-icon">search</span>
            <input 
              #searchInput
              type="text" 
              class="district-search-input" 
              [value]="locationService.searchQuery()" 
              (input)="onSearchInput($event)"
              placeholder="Search by district name (e.g., Chennai, Coimbatore, Madurai, Dharmapuri...)" 
              autocomplete="off"
              spellcheck="false"
              aria-label="Filter districts">
            
            @if (locationService.searchQuery()) {
              <button 
                type="button" 
                class="btn-clear-search" 
                (click)="clearSearch()" 
                aria-label="Clear filter">
                <span class="material-symbols-outlined">close</span>
              </button>
            }
          </div>

          <!-- Popular Districts Quick Chips (Only shown when not actively filtering) -->
          @if (!locationService.searchQuery()) {
            <div class="popular-chips-section">
              <span class="chips-label">Major Real Estate Hubs:</span>
              <div class="chips-grid">
                @for (d of locationService.popularDistricts(); track d.id) {
                  <button 
                    type="button" 
                    class="popular-chip-btn" 
                    [class.active]="locationService.selectedDistrict() === d.name"
                    (click)="selectDistrict(d.name)">
                    <span class="chip-name">{{ d.name }}</span>
                    @if (locationService.selectedDistrict() === d.name) {
                      <span class="material-symbols-outlined chip-check">check</span>
                    }
                  </button>
                }
              </div>
            </div>
          }

          <!-- Full Districts List -->
          <div class="districts-container">
            <div class="districts-header-row">
              <span class="section-title">
                {{ locationService.searchQuery() ? 'Matching Districts' : 'All Tamil Nadu Districts' }}
                ({{ locationService.filteredDistricts().length }})
              </span>
              <span class="region-hint">Click any district to view local registry</span>
            </div>

            @if (locationService.filteredDistricts().length > 0) {
              <div class="districts-grid">
                @for (d of locationService.filteredDistricts(); track d.id) {
                  <button 
                    type="button" 
                    class="district-card" 
                    [class.selected]="locationService.selectedDistrict() === d.name"
                    (click)="selectDistrict(d.name)">
                    <div class="district-card-left">
                      <div class="district-indicator" aria-hidden="true">
                        @if (locationService.selectedDistrict() === d.name) {
                          <span class="material-symbols-outlined">check_circle</span>
                        } @else {
                          <span class="material-symbols-outlined">location_on</span>
                        }
                      </div>
                      <div class="district-names">
                        <span class="district-title">{{ d.name }}</span>
                        @if (d.altNames && d.altNames.length > 0) {
                          <span class="district-alt">({{ d.altNames.join(', ') }})</span>
                        }
                      </div>
                    </div>

                    <div class="district-card-right">
                      <span class="region-badge" [attr.data-region]="d.region">{{ d.region }}</span>
                    </div>
                  </button>
                }
              </div>
            } @else {
              <!-- Empty Search Results -->
              <div class="empty-districts">
                <span class="material-symbols-outlined empty-icon">map</span>
                <p class="empty-title">No district found matching "{{ locationService.searchQuery() }}"</p>
                <p class="empty-desc">
                  Find a Plot exclusively serves all 38 districts of Tamil Nadu.
                </p>
                <button type="button" class="btn-reset-filter" (click)="clearSearch()">
                  View All 38 Tamil Nadu Districts
                </button>
              </div>
            }
          </div>

          <!-- Modal Footer -->
          <div class="district-modal-footer">
            <div class="footer-state-note">
              <span class="material-symbols-outlined">verified</span>
              <span>Currently selected: <strong>{{ locationService.selectedDistrict() }}</strong>, Tamil Nadu</span>
            </div>

            <button 
              type="button" 
              class="btn-footer-close" 
              (click)="locationService.closeDistrictModal()">
              Done
            </button>
          </div>

        </div>
      </div>
    }
  `,
  styles: [`
    .district-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.25rem;
      z-index: 99999;
      animation: modalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @keyframes modalFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .district-modal-card {
      background: #ffffff;
      border-radius: 9px;
      width: 100%;
      max-width: 860px;
      max-height: 88vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05);
      overflow: hidden;
      animation: modalSlideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @keyframes modalSlideUp {
      from {
        opacity: 0;
        transform: translateY(14px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    /* Modal Header */
    .district-modal-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      padding: 1.5rem 1.5rem 1rem 1.5rem;
      border-bottom: 1px solid #f1f5f9;
      background: #fafaf9;
    }

    .header-badge-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      flex-wrap: wrap;
    }

    .state-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 10px;
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
      border-radius: 9999px;
      font-size: 11.5px;
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    .state-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
      display: inline-block;
    }

    .district-count-pill {
      padding: 3px 9px;
      background: #f1f5f9;
      color: #475569;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
    }

    .district-modal-subtitle {
      font-size: 13px;
      color: #64748b;
      line-height: 1.45;
      margin: 0;
      max-width: 540px;
    }

    .btn-close-modal {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      color: #64748b;
      cursor: pointer;
      transition: all 0.15s ease;
      flex-shrink: 0;

      &:hover {
        background: #f1f5f9;
        color: #0f172a;
        border-color: #cbd5e1;
      }

      .material-symbols-outlined {
        font-size: 18px;
      }
    }

    /* Location Blocked Alert Banner */
    .location-blocked-banner {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin: 1rem 1.5rem 0 1.5rem;
      padding: 11px 14px;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 10px;
    }

    .blocked-icon-circle {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #fef3c7;
      color: #b45309;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      .material-symbols-outlined {
        font-size: 16px;
      }
    }

    .blocked-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .blocked-title {
      font-size: 12.5px;
      font-weight: 700;
      color: #92400e;
    }

    .blocked-desc {
      font-size: 12px;
      color: #b45309;
      line-height: 1.4;
    }

    /* GPS Detect Action Bar */
    .gps-detect-bar {
      padding: 1rem 1.5rem 0.5rem 1.5rem;
    }

    .btn-gps-detect {
      width: 100%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 16px;
      background: #f8fafc;
      border: 1.5px dashed #cbd5e1;
      border-radius: 10px;
      color: #334155;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover:not(:disabled) {
        background: #f0fdf4;
        border-color: #86efac;
        color: #166534;
      }

      &.detecting {
        background: #f0fdf4;
        border-color: #86efac;
        color: #166534;
        cursor: wait;
      }

      .gps-icon {
        font-size: 18px;
        color: #5e8f72;

        &.spin {
          animation: spin 1s linear infinite;
        }
      }
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    /* Typeahead Search Bar */
    .district-search-bar {
      position: relative;
      margin: 0.5rem 1.5rem 0.75rem 1.5rem;
      display: flex;
      align-items: center;
    }

    .district-search-bar .search-icon {
      position: absolute;
      left: 14px;
      font-size: 19px;
      color: #94a3b8;
      pointer-events: none;
    }

    .district-search-input {
      width: 100%;
      height: 44px;
      padding: 0 42px 0 42px;
      font-size: 13.5px;
      color: #0f172a;
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      outline: none;
      transition: all 0.15s ease;
      box-sizing: border-box;

      &:focus {
        background: #ffffff;
        border-color: #5e8f72;
        box-shadow: 0 0 0 3px rgba(94, 143, 114, 0.15);
      }

      &::placeholder {
        color: #94a3b8;
      }
    }

    .btn-clear-search {
      position: absolute;
      right: 10px;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      border: none;
      background: #e2e8f0;
      color: #475569;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.15s ease;

      &:hover {
        background: #cbd5e1;
      }

      .material-symbols-outlined {
        font-size: 15px;
      }
    }

    /* Popular Quick Chips */
    .popular-chips-section {
      padding: 0 1.5rem 0.75rem 1.5rem;
      border-bottom: 1px solid #f1f5f9;
    }

    .chips-label {
      display: block;
      font-size: 11.5px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 0.45rem;
    }

    .chips-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .popular-chip-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 5px 11px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      color: #334155;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        background: #f8fafc;
        border-color: #cbd5e1;
        color: #0f172a;
      }

      &.active {
        background: #f0fdf4;
        border-color: #86efac;
        color: #166534;
        font-weight: 600;
      }

      .chip-check {
        font-size: 14px;
        color: #166534;
      }
    }

    /* Districts Container */
    .districts-container {
      flex: 1 1 auto;
      overflow-y: auto;
      padding: 0.75rem 1.5rem 1rem 1.5rem;
      max-height: 420px;
    }

    .districts-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.65rem;
    }

    .section-title {
      font-size: 12px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .region-hint {
      font-size: 11px;
      color: #94a3b8;
    }

    .districts-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 7px;

      @media (max-width: 580px) {
        grid-template-columns: 1fr;
      }
    }

    .district-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 9px 12px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      text-align: left;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        background: #f8fafc;
        border-color: #cbd5e1;
        transform: translateY(-1px);
      }

      &.selected {
        background: #f0fdf4;
        border-color: #86efac;
        box-shadow: 0 0 0 1px #86efac;

        .district-title {
          color: #166534;
          font-weight: 700;
        }

        .district-indicator .material-symbols-outlined {
          color: #166534;
        }
      }
    }

    .district-card-left {
      display: flex;
      align-items: center;
      gap: 9px;
      min-width: 0;
    }

    .district-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      color: #94a3b8;

      .material-symbols-outlined {
        font-size: 18px;
      }
    }

    .district-names {
      display: flex;
      align-items: baseline;
      gap: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .district-title {
      font-size: 13px;
      font-weight: 600;
      color: #1e293b;
    }

    .district-alt {
      font-size: 11px;
      color: #64748b;
      font-weight: 400;
    }

    .region-badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 10.5px;
      font-weight: 500;
      background: #f1f5f9;
      color: #475569;
      flex-shrink: 0;

      &[data-region="Northern"] {
        background: #eff6ff;
        color: #1e40af;
      }
      &[data-region="Western"] {
        background: #faf5ff;
        color: #6b21a8;
      }
      &[data-region="Cauvery Delta"] {
        background: #ecfdf5;
        color: #065f46;
      }
      &[data-region="Southern"] {
        background: #fff7ed;
        color: #9a3412;
      }
      &[data-region="Central"] {
        background: #fefce8;
        color: #854d0e;
      }
    }

    /* Empty state */
    .empty-districts {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2.5rem 1rem;
      text-align: center;
    }

    .empty-icon {
      font-size: 40px;
      color: #cbd5e1;
      margin-bottom: 0.5rem;
    }

    .empty-title {
      font-size: 14px;
      font-weight: 600;
      color: #1e293b;
      margin: 0 0 0.25rem 0;
    }

    .empty-desc {
      font-size: 12px;
      color: #64748b;
      margin: 0 0 1rem 0;
    }

    .btn-reset-filter {
      padding: 8px 14px;
      background: #5e8f72;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease;

      &:hover {
        background: #497259;
      }
    }

    /* Modal Footer */
    .district-modal-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid #f1f5f9;
      background: #fafaf9;
    }

    .footer-state-note {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #475569;

      .material-symbols-outlined {
        font-size: 16px;
        color: #10b981;
      }

      strong {
        color: #0f172a;
      }
    }

    .btn-footer-close {
      padding: 8px 20px;
      background: #5e8f72;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease;

      &:hover {
        background: #497259;
      }
    }
  `]
})
export class DistrictSelectorModalComponent {
  locationService = inject(LocationService);

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.locationService.isModalOpen()) {
      this.locationService.closeDistrictModal();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    this.locationService.closeDistrictModal();
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.locationService.setSearchQuery(input.value);
  }

  clearSearch(): void {
    this.locationService.setSearchQuery('');
  }

  selectDistrict(districtName: string): void {
    this.locationService.setDistrict(districtName, 'manual');
  }
}

