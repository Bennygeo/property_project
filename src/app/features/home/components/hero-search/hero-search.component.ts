import { Component, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PropertyService } from '../../../../core/services/property.service';
import { ListingMode, Property } from '../../../../core/models/property.model';
import { NotificationService } from '../../../../core/services/notification.service';

export interface LocationSuggestion {
  name: string;
  city: string;
  tag: string;
  sub: string;
}

export interface PropertyTypeOption {
  value: string;
  label: string;
  icon: string;
  desc: string;
}

@Component({
  selector: 'app-hero-search',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="hero-section" id="search-section">
      <!-- Architectural Landscape & Skyline Background Overlay -->
      <div class="blueprint-bg">
        <img 
          alt="Architectural Lake & Skyline Landscape" 
          class="bg-hero-img" 
          src="/hero-bg.jpg">
        <div class="overlay-gradient-vertical"></div>
        <div class="overlay-gradient-horizontal"></div>
      </div>

      <div class="max-w-content hero-content">
        <!-- Title & Subtitle -->
        <div class="hero-text-center">
          <div class="badge-hero-verified">
            <span class="material-symbols-outlined icon-verified">verified_user</span>
            <span>Zero Brokerage • 100% Survey-Verified Deeds</span>
          </div>
          <h1 class="hero-headline">
            Find verified architectural homes, flats &amp; plots 
            <span class="highlight-red">with zero brokerage.</span>
          </h1>
          <p class="hero-subline">
            Direct owner properties, CMDA/DTCP sanctioned land, and RERA certified residences across Chennai, Bengaluru, and Southern high-growth metros.
          </p>
        </div>

        <!-- Comprehensive 100acress-Style Search Console Box -->
        <div class="search-console-box">
          <!-- 1. Expanded Asset Class Ribbon Tabs -->
          <div class="hero-tabs-bar">
            @for (tab of assetRibbonTabs; track tab.id) {
              <button 
                type="button" 
                class="tab-btn" 
                [class.active]="activeRibbonTab() === tab.id"
                (click)="onSelectRibbonTab(tab.id)">
                <span class="material-symbols-outlined">{{ tab.icon }}</span>
                <span>{{ tab.label }}</span>
                @if (tab.badge) {
                  <span class="tab-badge">{{ tab.badge }}</span>
                }
              </button>
            }
          </div>

          <!-- 2. Possession & Project Status Sub-strip -->
          <div class="possession-strip">
            <span class="possession-label">Project Status:</span>
            <div class="possession-chips">
              <button 
                type="button" 
                class="possession-chip"
                [class.active]="selectedStatus() === 'all'"
                (click)="setStatus('all')">
                All Properties
              </button>
              <button 
                type="button" 
                class="possession-chip"
                [class.active]="selectedStatus() === 'ready'"
                (click)="setStatus('ready')">
                <span class="material-symbols-outlined">key</span>
                Ready to Move / Clear Patta
              </button>
              <button 
                type="button" 
                class="possession-chip"
                [class.active]="selectedStatus() === 'under-construction'"
                (click)="setStatus('under-construction')">
                <span class="material-symbols-outlined">construction</span>
                Under Construction
              </button>
              <button 
                type="button" 
                class="possession-chip"
                [class.active]="selectedStatus() === 'new-launch'"
                (click)="setStatus('new-launch')">
                <span class="material-symbols-outlined">rocket_launch</span>
                New Launch
              </button>
            </div>
          </div>

          <!-- 3. Console Main Inputs Grid -->
          <div class="console-body">
            <div class="console-grid">
              
              <!-- Field 1: Locality / Project with Auto-Suggest & Voice Search -->
              <div class="mat-field-outlined col-locality" (click)="$event.stopPropagation()">
                <label class="mat-field-label" for="hero-locality-input">Locality / Project / Landmark</label>
                <div class="mat-field-control-row">
                  <span class="material-symbols-outlined mat-leading-icon">location_on</span>
                  <input 
                    id="hero-locality-input"
                    type="text" 
                    class="mat-input-text" 
                    [value]="propertyService.searchQuery()"
                    (focus)="openLocationSuggest()"
                    (input)="onSearchInput($event)"
                    (keydown.enter)="onInputEnter($event)"
                    placeholder="Search city, locality (e.g. OMR, Whitefield, Powai) or project...">
                  
                  <!-- Clear Input Button -->
                  @if (propertyService.searchQuery()) {
                    <button type="button" class="btn-input-clear" (click)="clearSearchInput()" aria-label="Clear location input">
                      <span class="material-symbols-outlined">close</span>
                    </button>
                  }

                  <!-- Voice Search Microphone Button -->
                  <button 
                    type="button" 
                    class="btn-voice-search" 
                    [class.listening]="isListening()"
                    (click)="startVoiceSearch()"
                    title="Voice Search">
                    <span class="material-symbols-outlined">{{ isListening() ? 'graphic_eq' : 'mic' }}</span>
                  </button>
                </div>

                <!-- Trending & Auto-Suggest Dropdown Panel -->
                @if (isLocationSuggestOpen()) {
                  <div class="suggest-dropdown-panel" (click)="$event.stopPropagation()">
                    
                    <!-- 1. Matched Real-Time Properties Section -->
                    @if (matchedProperties().length > 0) {
                      <div class="suggest-section">
                        <div class="suggest-header suggest-header-props">
                          <span class="material-symbols-outlined">home_work</span>
                          <span>Verified Properties &amp; Projects ({{ matchedProperties().length }})</span>
                        </div>
                        <div class="suggest-list suggest-list-props">
                          @for (prop of matchedProperties(); track prop.id) {
                            <div class="suggest-prop-item" (click)="selectProperty(prop)">
                              <div class="prop-thumb-wrap">
                                <img 
                                  [src]="prop.imageUrl || '/hero-bg.jpg'" 
                                  [alt]="prop.title" 
                                  class="prop-thumb"
                                  (error)="onThumbError($event)">
                                @if (prop.bhkBadge) {
                                  <span class="prop-bhk-tag">{{ prop.bhkBadge }}</span>
                                }
                              </div>
                              <div class="prop-info">
                                <div class="prop-title-row">
                                  <span class="prop-title" [title]="prop.title">{{ prop.title }}</span>
                                  <span class="prop-price">{{ prop.price }}</span>
                                </div>
                                <div class="prop-meta-row">
                                  <span class="prop-loc">
                                    <span class="material-symbols-outlined">location_on</span>
                                    {{ prop.locality }}, {{ prop.city }}
                                  </span>
                                  <span class="prop-type-pill">{{ prop.propertyType }}</span>
                                </div>
                              </div>
                              <span class="material-symbols-outlined arrow-icon">chevron_right</span>
                            </div>
                          }
                        </div>
                      </div>
                    }

                    <!-- 2. Corridors & Localities Section -->
                    @if (filteredTrendingLocations().length > 0) {
                      <div class="suggest-section">
                        <div class="suggest-header">
                          <span class="material-symbols-outlined">trending_up</span>
                          <span>{{ propertyService.searchQuery() ? 'Matching Corridors & Localities' : 'Trending High-Growth Corridors' }}</span>
                        </div>
                        <div class="suggest-list">
                          @for (loc of filteredTrendingLocations(); track loc.name) {
                            <div class="suggest-item" (click)="selectLocation(loc)">
                              <div class="suggest-item-left">
                                <span class="material-symbols-outlined loc-pin">location_on</span>
                                <div class="suggest-item-texts">
                                  <span class="suggest-name">{{ loc.name }}</span>
                                  <span class="suggest-sub">{{ loc.sub }} • {{ loc.city }}</span>
                                </div>
                              </div>
                              <span class="suggest-tag">{{ loc.tag }}</span>
                            </div>
                          }
                        </div>
                      </div>
                    }

                    <!-- 3. Empty State when query matches neither property nor corridor -->
                    @if (propertyService.searchQuery() && matchedProperties().length === 0 && filteredTrendingLocations().length === 0) {
                      <div class="suggest-empty-state">
                        <span class="material-symbols-outlined empty-icon">search_off</span>
                        <div class="empty-texts">
                          <p class="empty-title">No matching properties for "{{ propertyService.searchQuery() }}"</p>
                          <p class="empty-sub">Press SEARCH or Enter to check the entire registry, or try searching by city or area name.</p>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>

              <!-- Field 2: Multi-Select Property Type Popover -->
              <div 
                class="mat-dropdown-container col-type"
                [class.is-open]="isTypeDropdownOpen()"
                (click)="$event.stopPropagation()">
                <div 
                  class="mat-field-outlined mat-dropdown-trigger"
                  role="combobox"
                  [attr.aria-expanded]="isTypeDropdownOpen()"
                  aria-haspopup="listbox"
                  aria-label="Select Property Type"
                  tabindex="0"
                  (click)="toggleTypeDropdown()"
                  (keydown.enter)="toggleTypeDropdown()"
                  (keydown.space)="toggleTypeDropdown(); $event.preventDefault()">
                  <label class="mat-field-label">Property Types</label>
                  <div class="mat-field-control-row">
                    <span class="material-symbols-outlined mat-leading-icon">{{ getSelectedTypeIcon() }}</span>
                    <span class="mat-selected-value">{{ getSelectedTypeDisplay() }}</span>
                    @if (selectedTypes().length > 1) {
                      <span class="type-count-badge">+{{ selectedTypes().length - 1 }}</span>
                    }
                    <span class="material-symbols-outlined mat-chevron-icon" [class.rotated]="isTypeDropdownOpen()">expand_more</span>
                  </div>
                </div>

                <!-- Multi-Select Popover Panel (100acress Style) -->
                @if (isTypeDropdownOpen()) {
                  <div class="mat-dropdown-panel type-popover-panel" role="listbox" aria-label="Property Types">
                    <div class="popover-panel-header">
                      <span class="popover-title">Select Property Classes</span>
                      <div class="popover-header-actions">
                        <button type="button" class="btn-text-action" (click)="selectAllTypes()">All</button>
                        <span class="divider">|</span>
                        <button type="button" class="btn-text-action" (click)="clearAllTypes()">Clear</button>
                      </div>
                    </div>

                    <div class="popover-checklist">
                      @for (item of propertyTypes; track item.value) {
                        <div 
                          class="popover-check-row"
                          (click)="toggleTypeSelection(item.value)">
                          <div class="custom-chkbox" [class.checked]="isTypeChecked(item.value)">
                            @if (isTypeChecked(item.value)) {
                              <span class="material-symbols-outlined check-mark">check</span>
                            }
                          </div>
                          <span class="material-symbols-outlined item-icon">{{ item.icon }}</span>
                          <div class="check-texts">
                            <span class="check-label">{{ item.label }}</span>
                            <span class="check-sub">{{ item.desc }}</span>
                          </div>
                        </div>
                      }
                    </div>

                    <div class="popover-footer">
                      <span class="selection-summary">{{ selectedTypes().length }} Classes Selected</span>
                      <button type="button" class="btn-apply-popover" (click)="applyTypeDropdown()">
                        Apply
                      </button>
                    </div>
                  </div>
                }
              </div>

              <!-- Field 3: Flexible Budget Popover (Tiered + Min/Max) -->
              <div 
                class="mat-dropdown-container col-budget"
                [class.is-open]="isBudgetDropdownOpen()"
                (click)="$event.stopPropagation()">
                <div 
                  class="mat-field-outlined mat-dropdown-trigger"
                  role="combobox"
                  [attr.aria-expanded]="isBudgetDropdownOpen()"
                  aria-haspopup="listbox"
                  aria-label="Select Budget Range"
                  tabindex="0"
                  (click)="toggleBudgetDropdown()"
                  (keydown.enter)="toggleBudgetDropdown()"
                  (keydown.space)="toggleBudgetDropdown(); $event.preventDefault()">
                  <label class="mat-field-label">Budget Range</label>
                  <div class="mat-field-control-row">
                    <span class="material-symbols-outlined mat-leading-icon">payments</span>
                    <span class="mat-selected-value">{{ propertyService.selectedBudget() }}</span>
                    <span class="material-symbols-outlined mat-chevron-icon" [class.rotated]="isBudgetDropdownOpen()">expand_more</span>
                  </div>
                </div>

                <!-- Budget Popover Panel -->
                @if (isBudgetDropdownOpen()) {
                  <div class="mat-dropdown-panel budget-popover-panel" role="listbox" aria-label="Budget Ranges">
                    <div class="popover-panel-header">
                      <span class="popover-title">Choose Budget Bracket</span>
                    </div>

                    <!-- Quick Tiered Brackets Grid -->
                    <div class="budget-tiers-grid">
                      @for (item of budgetRanges; track item.value) {
                        <button 
                          type="button" 
                          class="tier-pill"
                          [class.selected]="propertyService.selectedBudget() === item.value"
                          (click)="selectBudget(item.value)">
                          <span class="tier-label">{{ item.label }}</span>
                        </button>
                      }
                    </div>

                    <!-- Custom Min / Max Selectors -->
                    <div class="custom-minmax-section">
                      <span class="minmax-title">Custom Range (Min – Max)</span>
                      <div class="minmax-row">
                        <div class="minmax-field">
                          <label>Min</label>
                          <select [value]="customMinBudget()" (change)="onMinBudgetChange($any($event.target).value)">
                            <option value="any">Min Price</option>
                            <option value="25l">₹25 Lakh</option>
                            <option value="50l">₹50 Lakh</option>
                            <option value="1cr">₹1.00 Cr</option>
                            <option value="2cr">₹2.00 Cr</option>
                            <option value="3cr">₹3.00 Cr</option>
                            <option value="5cr">₹5.00 Cr</option>
                          </select>
                        </div>
                        <span class="minmax-divider">to</span>
                        <div class="minmax-field">
                          <label>Max</label>
                          <select [value]="customMaxBudget()" (change)="onMaxBudgetChange($any($event.target).value)">
                            <option value="any">Max Price</option>
                            <option value="50l">₹50 Lakh</option>
                            <option value="1cr">₹1.00 Cr</option>
                            <option value="1.5cr">₹1.50 Cr</option>
                            <option value="3cr">₹3.00 Cr</option>
                            <option value="5cr">₹5.00 Cr</option>
                            <option value="10cr">₹10.00 Cr+</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div class="popover-footer">
                      <button type="button" class="btn-text-action" (click)="resetBudget()">Reset</button>
                      <button type="button" class="btn-apply-popover" (click)="applyCustomBudget()">
                        Apply
                      </button>
                    </div>
                  </div>
                }
              </div>

              <!-- Field 4: Search Action CTA Button -->
              <div class="col-action">
                <button type="button" class="btn-hero-search" (click)="executeSearch()">
                  <span class="material-symbols-outlined">search</span>
                  <span>SEARCH</span>
                </button>
              </div>

            </div>
          </div>
        </div>

        <!-- Sanctioned Structural Skyline Silhouette -->
        <div class="skyline-wrapper">
          <div class="skyline-label">
            <span>Sanctioned Structural &amp; Cadastral Registry Skyline</span>
          </div>
          <div class="skyline-img-container">
            <img 
              alt="Sanctioned Structural & Cadastral Registry Skyline" 
              class="skyline-img" 
              src="/skyline.svg">
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    :host {
      display: block;
      position: relative;
      z-index: 50;
    }
    .hero-section {
      position: relative;
      z-index: 50;
      background-color: #ffffff;
      padding-top: 3rem;
      padding-bottom: 3.5rem;
      border-bottom: 1px solid var(--hairline-border);
    }
    .blueprint-bg {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
      z-index: 0;
    }
    @keyframes heroImageFadeIn {
      0% {
        opacity: 0;
        transform: scale(1.04);
        filter: blur(4px);
      }
      100% {
        opacity: 0.3;
        transform: scale(1);
        filter: blur(0px);
      }
    }
    .bg-hero-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center 35%;
      opacity: 0.3;
      animation: heroImageFadeIn 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      will-change: opacity, transform, filter;
    }
    .overlay-gradient-vertical {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        to bottom,
        rgba(255, 255, 255, 0.6) 0%,
        rgba(255, 255, 255, 0.35) 45%,
        rgba(255, 255, 255, 0.85) 75%,
        #ffffff 100%
      );
      pointer-events: none;
    }
    .overlay-gradient-horizontal {
      position: absolute;
      inset: 0;
      background: radial-gradient(
        ellipse 90% 70% at 50% 25%,
        rgba(255, 255, 255, 0.05) 0%,
        rgba(255, 255, 255, 0.65) 70%,
        #ffffff 100%
      );
      pointer-events: none;
    }
    .hero-content {
      position: relative;
      z-index: 10;
    }
    .hero-text-center {
      text-align: center;
      max-width: 56rem;
      margin-left: auto;
      margin-right: auto;
      margin-bottom: 2.5rem;
    }
    .badge-hero-verified {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      background: var(--brand-red-subtle);
      border: 1px solid var(--brand-red-border);
      color: var(--brand-red);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 1rem;
    }
    .icon-verified {
      font-size: 16px;
    }
    .hero-headline {
      font-size: 2rem;
      font-weight: 800;
      color: var(--text-slate-950);
      letter-spacing: -0.025em;
      line-height: 1.15;
    }
    @media (min-width: 640px) {
      .hero-headline {
        font-size: 3rem;
      }
    }
    @media (min-width: 1024px) {
      .hero-headline {
        font-size: 3.25rem;
      }
    }
    .highlight-red {
      color: var(--brand-red);
    }
    .hero-subline {
      color: var(--text-slate-600);
      font-size: 1rem;
      margin-top: 0.75rem;
      font-weight: 400;
      max-width: 48rem;
      margin-left: auto;
      margin-right: auto;
      line-height: 1.6;
    }
    @media (min-width: 640px) {
      .hero-subline {
        font-size: 1.125rem;
      }
    }

    /* Search Console Box */
    .search-console-box {
      width: 100%;
      background: rgba(255, 255, 255, 0.98);
      backdrop-filter: blur(12px);
      border-radius: 1.25rem;
      border: 1px solid rgba(203, 213, 225, 0.85);
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      position: relative;
      z-index: 30;
    }

    /* 1. Asset Ribbon Tabs */
    .hero-tabs-bar {
      display: flex;
      align-items: center;
      overflow-x: auto;
      border-bottom: 1px solid var(--hairline-border);
      background: #f8fafc;
      padding: 0.625rem 1.25rem;
      gap: 0.5rem;
      border-top-left-radius: 1.25rem;
      border-top-right-radius: 1.25rem;
      scrollbar-width: none;
    }
    .hero-tabs-bar::-webkit-scrollbar {
      display: none;
    }
    .tab-btn {
      padding: 0.5rem 1rem;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.01em;
      color: var(--text-slate-600);
      border: 1px solid transparent;
      background: transparent;
      border-radius: 9999px;
      display: flex;
      align-items: center;
      gap: 0.375rem;
      cursor: pointer;
      flex-shrink: 0;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .tab-btn:hover {
      color: var(--text-slate-950);
      background: #f1f5f9;
    }
    .tab-btn.active {
      color: var(--brand-red);
      font-weight: 700;
      background: #ffffff;
      border-color: #cbd5e1;
      /* box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06); */
    }
    .tab-btn span.material-symbols-outlined {
      font-size: 18px;
    }
    .tab-badge {
      font-size: 9px;
      font-weight: 900;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      background: #fef2f2;
      color: var(--brand-red);
      padding: 1px 5px;
      border-radius: 4px;
      border: 1px solid #fecaca;
    }

    /* 2. Possession & Project Status Sub-strip */
    .possession-strip {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 1.5rem;
      background: #ffffff;
      border-bottom: 1px solid #f1f5f9;
      overflow-x: auto;
      scrollbar-width: none;
    }
    .possession-strip::-webkit-scrollbar {
      display: none;
    }
    .possession-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-slate-400);
      white-space: nowrap;
    }
    .possession-chips {
      display: flex;
      align-items: center;
      gap: 0.375rem;
    }
    .possession-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 0.25rem 0.625rem;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-slate-600);
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s;
    }
    .possession-chip:hover {
      background: #f1f5f9;
      color: var(--text-slate-900);
    }
    .possession-chip.active {
      background: #0f172a;
      border-color: #0f172a;
      color: #ffffff;
    }
    .possession-chip span.material-symbols-outlined {
      font-size: 14px;
    }

    /* 3. Console Main Inputs Grid */
    .console-body {
      padding: 1.25rem 1.5rem 1.5rem;
    }
    .console-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
      align-items: center;
    }
    @media (min-width: 768px) {
      .console-grid {
        grid-template-columns: repeat(12, 1fr);
      }
      .col-locality { grid-column: span 5; }
      .col-type { grid-column: span 3; }
      .col-budget { grid-column: span 2; }
      .col-action { grid-column: span 2; }
    }

    /* Field Inputs */
    .mat-field-control-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      position: relative;
    }
    .mat-leading-icon {
      font-size: 20px;
      color: var(--brand-red);
      flex-shrink: 0;
    }
    .mat-input-text {
      width: 100%;
      border: none;
      background: transparent;
      outline: none;
      font-size: 14px;
      font-weight: 600;
      color: var(--text-slate-950);
      font-family: inherit;
    }
    .mat-input-text::placeholder {
      color: #94a3b8;
      font-weight: 400;
    }
    .btn-input-clear {
      background: transparent;
      border: none;
      color: var(--text-slate-400);
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 2px;
      border-radius: 9999px;
    }
    .btn-input-clear:hover {
      color: var(--text-slate-900);
    }
    .btn-input-clear span {
      font-size: 16px;
    }

    /* Voice Search Button */
    .btn-voice-search {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      color: var(--text-slate-600);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s;
      flex-shrink: 0;
    }
    .btn-voice-search:hover {
      background: #fef2f2;
      color: var(--brand-red);
      border-color: #fca5a5;
    }
    .btn-voice-search.listening {
      background: var(--brand-red);
      color: #ffffff;
      border-color: var(--brand-red);
      animation: pulseMic 1.2s infinite;
    }
    @keyframes pulseMic {
      0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(199, 52, 52, 0.4); }
      70% { transform: scale(1.08); box-shadow: 0 0 0 6px rgba(199, 52, 52, 0); }
      100% { transform: scale(1); }
    }
    .btn-voice-search span {
      font-size: 18px;
    }

    /* Trending Auto-Suggest Dropdown */
    .suggest-dropdown-panel {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      width: 100%;
      min-width: 340px;
      max-height: 440px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      z-index: 100;
      overflow-y: auto;
      animation: fadeInDown 0.15s ease-out;
      scrollbar-width: thin;
      scrollbar-color: #cbd5e1 #f8fafc;
    }
    .suggest-dropdown-panel::-webkit-scrollbar {
      width: 6px;
    }
    .suggest-dropdown-panel::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 4px;
    }
    .suggest-section {
      border-bottom: 1px solid #f1f5f9;
    }
    .suggest-section:last-child {
      border-bottom: none;
    }
    .suggest-header {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 0.625rem 1rem;
      background: #f8fafc;
      border-bottom: 1px solid #f1f5f9;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-slate-700);
      position: sticky;
      top: 0;
      z-index: 2;
    }
    .suggest-header.suggest-header-props {
      background: #fef2f2;
      color: var(--brand-red);
      border-bottom: 1px solid #fee2e2;
    }
    .suggest-header span.material-symbols-outlined {
      font-size: 16px;
    }
    .suggest-list {
      max-height: 260px;
      overflow-y: auto;
    }
    .suggest-list-props {
      max-height: 320px;
    }
    .suggest-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      cursor: pointer;
      border-bottom: 1px solid #f8fafc;
      transition: background 0.15s;
    }
    .suggest-item:hover {
      background: #f1f5f9;
    }
    .suggest-item-left {
      display: flex;
      align-items: center;
      gap: 0.625rem;
    }
    .loc-pin {
      font-size: 18px;
      color: var(--brand-red);
    }
    .suggest-item-texts {
      display: flex;
      flex-direction: column;
    }
    .suggest-name {
      font-size: 13px;
      font-weight: 700;
      color: var(--text-slate-900);
    }
    .suggest-sub {
      font-size: 11px;
      color: var(--text-slate-500);
    }
    .suggest-tag {
      font-size: 10px;
      font-weight: 700;
      color: #047857;
      background: #ecfdf5;
      padding: 2px 6px;
      border-radius: 4px;
      white-space: nowrap;
    }

    /* Matched Property Suggest Item */
    .suggest-prop-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.625rem 1rem;
      cursor: pointer;
      border-bottom: 1px solid #f1f5f9;
      transition: background 0.15s ease;
    }
    .suggest-prop-item:hover {
      background: #fef2f2;
    }
    .suggest-prop-item:last-child {
      border-bottom: none;
    }
    .prop-thumb-wrap {
      position: relative;
      width: 52px;
      height: 52px;
      border-radius: 8px;
      overflow: hidden;
      flex-shrink: 0;
      background: #e2e8f0;
    }
    .prop-thumb {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .prop-bhk-tag {
      position: absolute;
      bottom: 2px;
      left: 2px;
      background: rgba(15, 23, 42, 0.85);
      color: #ffffff;
      font-size: 9px;
      font-weight: 700;
      padding: 1px 4px;
      border-radius: 3px;
      line-height: 1.1;
      max-width: calc(100% - 4px);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .prop-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .prop-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .prop-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--text-slate-900);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .prop-price {
      font-size: 13px;
      font-weight: 800;
      color: var(--brand-red);
      white-space: nowrap;
      font-family: ui-monospace, monospace;
    }
    .prop-meta-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      font-size: 11px;
    }
    .prop-loc {
      display: flex;
      align-items: center;
      gap: 2px;
      color: var(--text-slate-500);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .prop-loc .material-symbols-outlined {
      font-size: 13px;
      color: var(--text-slate-400);
    }
    .prop-type-pill {
      font-size: 10px;
      font-weight: 600;
      color: var(--text-slate-600);
      background: #f1f5f9;
      padding: 1px 6px;
      border-radius: 4px;
      white-space: nowrap;
    }
    .arrow-icon {
      font-size: 18px;
      color: #94a3b8;
      flex-shrink: 0;
      transition: transform 0.15s;
    }
    .suggest-prop-item:hover .arrow-icon {
      transform: translateX(2px);
      color: var(--brand-red);
    }

    /* Suggest Empty State */
    .suggest-empty-state {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem 1rem;
      background: #f8fafc;
    }
    .suggest-empty-state .empty-icon {
      font-size: 28px;
      color: #94a3b8;
      flex-shrink: 0;
    }
    .empty-texts {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .empty-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--text-slate-800);
      margin: 0;
    }
    .empty-sub {
      font-size: 11px;
      color: var(--text-slate-500);
      margin: 0;
      line-height: 1.4;
    }

    /* Popover Panels (Multi-Select & Budget) */
    .type-popover-panel, .budget-popover-panel {
      min-width: 320px;
      padding: 1rem;
    }
    .popover-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid #f1f5f9;
      margin-bottom: 0.75rem;
    }
    .popover-title {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-slate-800);
    }
    .popover-header-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .btn-text-action {
      background: transparent;
      border: none;
      font-size: 11px;
      font-weight: 700;
      color: var(--brand-red);
      cursor: pointer;
      padding: 2px 4px;
    }
    .btn-text-action:hover {
      text-decoration: underline;
    }
    .divider {
      color: #cbd5e1;
      font-size: 11px;
    }
    .popover-checklist {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-height: 240px;
      overflow-y: auto;
    }
    .popover-check-row {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 0.5rem 0.625rem;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .popover-check-row:hover {
      background: #f8fafc;
    }
    .custom-chkbox {
      width: 18px;
      height: 18px;
      border-radius: 4px;
      border: 1.5px solid #cbd5e1;
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.15s;
    }
    .custom-chkbox.checked {
      background: var(--brand-red);
      border-color: var(--brand-red);
      color: #ffffff;
    }
    .check-mark {
      font-size: 14px;
    }
    .check-texts {
      display: flex;
      flex-direction: column;
    }
    .check-label {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-slate-900);
    }
    .check-sub {
      font-size: 10px;
      color: var(--text-slate-500);
    }
    .type-count-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 1px 6px;
      border-radius: 9999px;
      background: #fef2f2;
      color: var(--brand-red);
      font-size: 10px;
      font-weight: 800;
      margin-left: auto;
      margin-right: 4px;
    }
    .popover-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 0.75rem;
      border-top: 1px solid #f1f5f9;
      margin-top: 0.75rem;
    }
    .selection-summary {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-slate-500);
    }
    .btn-apply-popover {
      padding: 0.375rem 1rem;
      border-radius: 6px;
      background: var(--brand-red);
      color: #ffffff;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border: none;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-apply-popover:hover {
      background: var(--brand-red-hover);
    }

    /* Budget Tiers Grid */
    .budget-tiers-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.375rem;
      margin-bottom: 0.75rem;
    }
    .tier-pill {
      padding: 0.5rem 0.5rem;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      color: var(--text-slate-700);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      text-align: center;
      transition: all 0.15s;
    }
    .tier-pill:hover {
      background: #f8fafc;
      border-color: #cbd5e1;
    }
    .tier-pill.selected {
      background: #0f172a;
      border-color: #0f172a;
      color: #ffffff;
      font-weight: 700;
    }

    /* Custom Min-Max Section */
    .custom-minmax-section {
      padding-top: 0.625rem;
      border-top: 1px solid #f1f5f9;
    }
    .minmax-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-slate-500);
      margin-bottom: 0.375rem;
      display: block;
    }
    .minmax-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .minmax-field {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .minmax-field label {
      font-size: 9px;
      font-weight: 700;
      color: var(--text-slate-400);
      text-transform: uppercase;
    }
    .minmax-field select {
      width: 100%;
      height: 32px;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      font-size: 11px;
      font-weight: 600;
      padding: 0 4px;
      color: var(--text-slate-800);
      outline: none;
    }
    .minmax-divider {
      font-size: 11px;
      color: #94a3b8;
      margin-top: 12px;
    }

    /* Field 4 CTA Button */
    .btn-hero-search {
      width: 100%;
      height: 56px;
      padding: 0.875rem 1.5rem;
      background-color: var(--brand-red);
      color: #ffffff;
      font-weight: 800;
      font-size: 14px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      border: none;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(199, 52, 52, 0.25), 0 4px 10px rgba(199, 52, 52, 0.2);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .btn-hero-search:hover {
      background-color: var(--brand-red-hover);
      box-shadow: 0 4px 14px rgba(199, 52, 52, 0.4), 0 8px 22px rgba(199, 52, 52, 0.25);
      transform: translateY(-1px);
    }
    .btn-hero-search:active {
      transform: scale(0.98);
      box-shadow: 0 1px 2px rgba(199, 52, 52, 0.3);
    }

    /* Skyline Footer */
    .skyline-wrapper {
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid #f1f5f9;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .skyline-label {
      font-size: 10px;
      font-family: ui-monospace, monospace;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: #94a3b8;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }
    .skyline-img-container {
      width: 100%;
      max-width: 56rem;
      height: 6rem;
      overflow: hidden;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }
    .skyline-img {
      width: 100%;
      max-width: 60rem;
      margin: 0 auto;
      height: 7rem;
      object-fit: contain;
      opacity: 0.75;
    }

    @keyframes fadeInDown {
      from { opacity: 0; transform: translateY(-6px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class HeroSearchComponent {
  private readonly router = inject(Router);
  readonly propertyService = inject(PropertyService);
  readonly notificationService = inject(NotificationService);

  // 1. Expanded Ribbon Tabs (100acress Style)
  readonly assetRibbonTabs = [
    { id: 'all', label: 'All Assets', icon: 'grid_view', badge: '' },
    { id: 'apartments', label: 'Apartments & Flats', icon: 'apartment', badge: 'Hot' },
    { id: 'plots', label: 'Plots & Land', icon: 'terrain', badge: 'CMDA' },
    { id: 'villas', label: 'Luxury Villas', icon: 'villa', badge: '' },
    { id: 'commercial', label: 'Commercial & SCO', icon: 'domain', badge: 'High Yield' },
    { id: 'farmland', label: 'Farmland Retreats', icon: 'yard', badge: '' },
    { id: 'new-launches', label: 'New Launches', icon: 'rocket_launch', badge: 'Exclusive' }
  ];
  readonly activeRibbonTab = signal<string>('all');

  // 2. Project Status / Possession
  readonly selectedStatus = signal<string>('all');

  // 3. Multi-Select Property Classes (100acress style)
  readonly propertyTypes: PropertyTypeOption[] = [
    { value: 'Apartments & Flats', label: 'Flat / High-Rise Apartment', icon: 'apartment', desc: 'Gated societies & high-rises' },
    { value: 'Independent Villas', label: 'Independent Villa / House', icon: 'villa', desc: 'Private plots & courtyards' },
    { value: 'Gated CMDA Plots', label: 'Gated CMDA / DTCP Plots', icon: 'terrain', desc: 'Sanctioned residential land' },
    { value: 'Commercial Spaces', label: 'Commercial Office & SCO', icon: 'domain', desc: 'Grade-A retail & office parks' }
  ];
  readonly selectedTypes = signal<string[]>(['Apartments & Flats']);
  readonly isTypeDropdownOpen = signal<boolean>(false);

  // 4. Budget Selector
  readonly budgetRanges = [
    { value: 'Select Budget', label: 'Any Budget' },
    { value: '< ₹50 Lakh', label: '< ₹50 Lakh' },
    { value: '₹50L – 1.5 Cr', label: '₹50L – 1.5 Cr' },
    { value: '₹1.5 – 3.0 Cr', label: '₹1.5 – 3.0 Cr' },
    { value: '₹3.0 – 5.0 Cr', label: '₹3.0 – 5.0 Cr' },
    { value: '₹5.0 Cr+', label: '₹5.0 Cr+' }
  ];
  readonly customMinBudget = signal<string>('any');
  readonly customMaxBudget = signal<string>('any');
  readonly isBudgetDropdownOpen = signal<boolean>(false);

  // 5. Trending & Auto-Suggest
  readonly isLocationSuggestOpen = signal<boolean>(false);
  readonly trendingLocations: LocationSuggestion[] = [
    { name: 'OMR IT Corridor', city: 'Chennai', tag: 'High Rental Yield', sub: 'Thoraipakkam to Siruseri' },
    { name: 'Whitefield & ITPL', city: 'Bengaluru', tag: 'Tech Hub', sub: 'Hope Farm to Kadugodi' },
    { name: 'Gachibowli Financial District', city: 'Hyderabad', tag: 'High Growth', sub: 'Nanakramguda Ring' },
    { name: 'Powai Lakefront', city: 'Mumbai', tag: 'Lake Facing', sub: 'Hiranandani Gardens' },
    { name: 'Golf Course Extension Road', city: 'Delhi NCR', tag: 'Ultra Luxury', sub: 'Sector 58 to 67' },
    { name: 'ECR Beach Corridor', city: 'Chennai', tag: 'Coastal Villas & Plots', sub: 'Palavakkam to Kovalam' },
    { name: 'Sarjapur Road Corridor', city: 'Bengaluru', tag: 'Gated Townships', sub: 'Carmelaram' }
  ];

  readonly filteredTrendingLocations = computed(() => {
    const q = this.propertyService.searchQuery().toLowerCase().trim();
    if (!q) return this.trendingLocations;
    return this.trendingLocations.filter(loc =>
      loc.name.toLowerCase().includes(q) ||
      loc.city.toLowerCase().includes(q) ||
      loc.sub.toLowerCase().includes(q)
    );
  });

  // Matched Properties Signal (real-time from MySQL/PropertyService)
  readonly matchedProperties = computed(() => {
    const rawQ = this.propertyService.searchQuery();
    if (!rawQ) return [];
    const q = rawQ.toLowerCase().trim();
    if (!q) return [];
    const words = q.split(/\s+/).filter(Boolean);
    const all = this.propertyService.allProperties();
    return all.filter(p => {
      const fullText = `${p.title || ''} ${p.locality || ''} ${p.city || ''} ${p.propertyType || ''} ${p.bhkBadge || ''} ${p.badges?.rera || ''}`.toLowerCase();
      return words.every(w => fullText.includes(w));
    });
  });

  selectProperty(prop: Property): void {
    this.isLocationSuggestOpen.set(false);
    this.router.navigate(['/property', prop.id]);
  }

  onThumbError(event: Event): void {
    (event.target as HTMLImageElement).src = '/hero-bg.jpg';
  }

  onInputEnter(event: Event): void {
    event.preventDefault();
    const matched = this.matchedProperties();
    if (matched.length === 1) {
      this.selectProperty(matched[0]);
    } else {
      this.executeSearch();
    }
  }

  // 6. Voice Search State
  readonly isListening = signal<boolean>(false);

  // Ribbon Tab Action
  onSelectRibbonTab(tabId: string): void {
    this.activeRibbonTab.set(tabId);
    if (tabId === 'plots') {
      this.selectedTypes.set(['Gated CMDA Plots']);
      this.propertyService.selectedPropertyType.set('Gated CMDA Plots');
      this.propertyService.setCategoryFilter('plots');
    } else if (tabId === 'commercial') {
      this.selectedTypes.set(['Commercial Spaces']);
      this.propertyService.selectedPropertyType.set('Commercial Spaces');
      this.propertyService.setCategoryFilter('commercial');
    } else if (tabId === 'villas') {
      this.selectedTypes.set(['Independent Villas']);
      this.propertyService.selectedPropertyType.set('Independent Villas');
      this.propertyService.setCategoryFilter('villas');
    } else if (tabId === 'penthouses') {
      this.selectedTypes.set(['Luxury Penthouses']);
      this.propertyService.selectedPropertyType.set('Luxury Penthouses');
      this.propertyService.setCategoryFilter('villas');
    } else if (tabId === 'apartments') {
      this.selectedTypes.set(['Apartments & Flats']);
      this.propertyService.selectedPropertyType.set('Apartments & Flats');
      this.propertyService.setCategoryFilter('apartments');
    } else {
      this.selectedTypes.set(['Apartments & Flats', 'Independent Villas', 'Gated CMDA Plots']);
      this.propertyService.setCategoryFilter('all');
    }
  }

  // Status Action
  setStatus(status: string): void {
    this.selectedStatus.set(status);
  }

  // Location Autocomplete Actions
  openLocationSuggest(): void {
    this.isLocationSuggestOpen.set(true);
    this.isTypeDropdownOpen.set(false);
    this.isBudgetDropdownOpen.set(false);
  }

  selectLocation(loc: LocationSuggestion): void {
    this.propertyService.searchQuery.set(`${loc.name}, ${loc.city}`);
    this.isLocationSuggestOpen.set(false);
  }

  clearSearchInput(): void {
    this.propertyService.searchQuery.set('');
  }

  onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.propertyService.searchQuery.set(val);
    this.isLocationSuggestOpen.set(true);
  }

  // Voice Search (Speech Recognition)
  startVoiceSearch(): void {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.notificationService.show({
        type: 'info',
        title: 'Voice Search',
        message: 'Speech recognition is not supported in this browser. Please type your search.',
        icon: 'mic_off'
      });
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.interimResults = false;
      this.isListening.set(true);

      recognition.onstart = () => {
        this.notificationService.show({
          type: 'info',
          title: 'Listening...',
          message: 'Speak now (e.g. "Beach plots in Chennai" or "Villas in Bengaluru")',
          icon: 'mic'
        });
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        this.propertyService.searchQuery.set(transcript);
        this.isListening.set(false);
        this.notificationService.show({
          type: 'success',
          title: 'Voice Captured',
          message: `Searching for: "${transcript}"`,
          icon: 'mic'
        });
        this.executeSearch();
      };

      recognition.onerror = () => {
        this.isListening.set(false);
      };

      recognition.onend = () => {
        this.isListening.set(false);
      };

      recognition.start();
    } catch {
      this.isListening.set(false);
    }
  }

  // Multi-Select Property Type Actions
  toggleTypeDropdown(): void {
    const next = !this.isTypeDropdownOpen();
    this.isTypeDropdownOpen.set(next);
    if (next) {
      this.isLocationSuggestOpen.set(false);
      this.isBudgetDropdownOpen.set(false);
    }
  }

  isTypeChecked(val: string): boolean {
    return this.selectedTypes().includes(val);
  }

  toggleTypeSelection(val: string): void {
    this.selectedTypes.update(current => {
      if (current.includes(val)) {
        if (current.length === 1) return current; // Keep at least one
        return current.filter(t => t !== val);
      } else {
        return [...current, val];
      }
    });
  }

  selectAllTypes(): void {
    this.selectedTypes.set(this.propertyTypes.map(t => t.value));
  }

  clearAllTypes(): void {
    this.selectedTypes.set(['Apartments & Flats']);
  }

  applyTypeDropdown(): void {
    this.isTypeDropdownOpen.set(false);
  }

  getSelectedTypeDisplay(): string {
    const types = this.selectedTypes();
    if (types.length === 0 || types.length === this.propertyTypes.length) {
      return 'All Property Types';
    }
    if (types.length === 1) {
      const found = this.propertyTypes.find(t => t.value === types[0]);
      return found ? found.label.split('/')[0].trim() : types[0];
    }
    const firstFound = this.propertyTypes.find(t => t.value === types[0]);
    const firstLabel = firstFound ? firstFound.label.split('/')[0].trim() : types[0];
    return `${firstLabel}`;
  }

  getSelectedTypeIcon(): string {
    const types = this.selectedTypes();
    if (types.length === 1) {
      const found = this.propertyTypes.find(t => t.value === types[0]);
      return found ? found.icon : 'apartment';
    }
    return 'category';
  }

  // Budget Actions
  toggleBudgetDropdown(): void {
    const next = !this.isBudgetDropdownOpen();
    this.isBudgetDropdownOpen.set(next);
    if (next) {
      this.isLocationSuggestOpen.set(false);
      this.isTypeDropdownOpen.set(false);
    }
  }

  selectBudget(val: string): void {
    this.propertyService.selectedBudget.set(val);
    this.isBudgetDropdownOpen.set(false);
  }

  onMinBudgetChange(val: string): void {
    this.customMinBudget.set(val);
  }

  onMaxBudgetChange(val: string): void {
    this.customMaxBudget.set(val);
  }

  applyCustomBudget(): void {
    const min = this.customMinBudget();
    const max = this.customMaxBudget();
    if (min === 'any' && max === 'any') {
      this.propertyService.selectedBudget.set('Select Budget');
    } else {
      const minLabel = min !== 'any' ? `Min ₹${min.toUpperCase()}` : '';
      const maxLabel = max !== 'any' ? `Max ₹${max.toUpperCase()}` : '';
      this.propertyService.selectedBudget.set([minLabel, maxLabel].filter(Boolean).join(' – '));
    }
    this.isBudgetDropdownOpen.set(false);
  }

  resetBudget(): void {
    this.propertyService.selectedBudget.set('Select Budget');
    this.customMinBudget.set('any');
    this.customMaxBudget.set('any');
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.isLocationSuggestOpen.set(false);
    this.isTypeDropdownOpen.set(false);
    this.isBudgetDropdownOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.isLocationSuggestOpen.set(false);
    this.isTypeDropdownOpen.set(false);
    this.isBudgetDropdownOpen.set(false);
  }

  // Execute Search -> Navigates to /search with rich query parameters
  executeSearch(): void {
    const rawBudget = this.propertyService.selectedBudget();
    let budgetParam: string | null = null;
    if (rawBudget.includes('< ₹50') || rawBudget.includes('25L')) budgetParam = 'under-50l';
    else if (rawBudget.includes('50L – 1.5') || rawBudget.includes('50L')) budgetParam = '50l-1.5cr';
    else if (rawBudget.includes('1.5 – 3.0')) budgetParam = '1.5cr-3cr';
    else if (rawBudget.includes('3.0 – 5.0')) budgetParam = '3cr-5cr';
    else if (rawBudget.includes('5.0 Cr+') || rawBudget.includes('10CR')) budgetParam = 'above-5cr';

    const typesParam = this.selectedTypes().join(',');

    this.router.navigate(['/search'], {
      queryParams: {
        q: this.propertyService.searchQuery() || null,
        type: typesParam,
        budget: budgetParam,
        status: this.selectedStatus() !== 'all' ? this.selectedStatus() : null,
        ready: this.selectedStatus() === 'ready' ? 'true' : null
      }
    });
  }
}
