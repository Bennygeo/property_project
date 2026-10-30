import { Component, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PropertyService } from '../../../../core/services/property.service';
import { ListingMode, Property } from '../../../../core/models/property.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { DealsScrollingBannerComponent } from '../deals-scrolling-banner/deals-scrolling-banner.component';
import { LandIntentStripComponent } from '../land-intent-strip/land-intent-strip.component';

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
  imports: [CommonModule, DealsScrollingBannerComponent, LandIntentStripComponent],
  template: `
    <section class="hero-section" id="search-section">
      <!-- Creative Architectural Clean Background -->
      <div class="blueprint-bg" aria-hidden="true">
        <!-- 1. Creative Duo-tone Architectural Color Grading (Soft Warm/Cool Balance) -->
        <div class="hero-bg-tint"></div>

        <!-- 3. Creative Subtle Drafting Coordinate Linework (Hairline Blueprint Grid) -->
        <div class="hero-bg-drafting-grid"></div>

        <!-- 4. Multi-Stop Vertical Vignette (Seamless header to white transition) -->
        <div class="overlay-gradient-vertical"></div>

        <!-- 5. Radial Focus Spotlight (Crystal-Clear Contrast for Search Console) -->
        <div class="overlay-gradient-horizontal"></div>

        <!-- 6. Bottom Seamless Melt into Content -->
        <div class="hero-bg-bottom-melt"></div>
      </div>

      <!-- Docked Header Banner (Directly below header) -->
      <app-deals-scrolling-banner />

      <!-- Direct Registry Gateway & Buyer Matchmaking Cards (Below Banner, Above Search Console) -->
      <!-- <app-land-intent-strip /> -->

      <div class="max-w-content hero-content">
        <!-- Title & Subtitle -->
        <div class="hero-text-center">
          <h1 class="hero-headline">
            See Every Detail. 
            <span class="highlight-red">Choose with Confidence.</span>
          </h1>
          <p class="hero-subline">
            Explore survey-verified plots and homes through stunning 4K drone views and authenticated cadastral deeds.
          </p>
        </div>

        <!-- Sleek Minimalist Floating Search Pill -->
        <div class="search-pill-wrapper">
          <div class="search-pill-bar">
            
            <!-- Segment 1: Locality / Project -->
            <div class="pill-segment segment-locality" (click)="$event.stopPropagation()">
              <div class="segment-input-wrap">
                <label class="segment-label" for="hero-locality-input">Location / Project</label>
                <input 
                  id="hero-locality-input"
                  name="hero-locality-search"
                  type="text" 
                  class="pill-input-text" 
                  [value]="propertyService.searchQuery()"
                  (focus)="openLocationSuggest()"
                  (input)="onSearchInput($event)"
                  (keydown.enter)="onInputEnter($event)"
                  autocomplete="off"
                  role="combobox"
                  aria-autocomplete="list"
                  [attr.aria-expanded]="isLocationSuggestOpen()"
                  placeholder="City, locality or project...">
              </div>

              <!-- Clear Input Button -->
              @if (propertyService.searchQuery()) {
                <button type="button" class="btn-pill-clear" (click)="clearSearchInput()" aria-label="Clear location input">
                  <span class="clear-cross">&times;</span>
                </button>
              }

              <!-- Trending & Auto-Suggest Dropdown Panel -->
              @if (isLocationSuggestOpen()) {
                <div class="suggest-dropdown-panel" (click)="$event.stopPropagation()">
                  <!-- 1. Matched Real-Time Properties Section -->
                  @if (matchedProperties().length > 0) {
                    <div class="suggest-section">
                      <div class="suggest-header suggest-header-props">
                        <span>Verified Properties &amp; Projects ({{ matchedProperties().length }})</span>
                      </div>
                      <div class="suggest-list suggest-list-props">
                        @for (prop of matchedProperties(); track prop.id) {
                          <div class="suggest-prop-item" (click)="selectProperty(prop)">
                            <div class="prop-thumb-wrap">
                              <img 
                                [src]="prop.imageUrl || 'hero-bg.jpg'" 
                                [alt]="prop.title" 
                                class="prop-thumb"
                                loading="lazy"
                                decoding="async"
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
                                  {{ prop.locality }}, {{ prop.city }}
                                </span>
                                <span class="prop-type-pill">{{ prop.propertyType }}</span>
                              </div>
                            </div>
                          </div>
                        }
                      </div>
                    </div>
                  }

                  <!-- 2. Google Places & Geocoded Locations Section -->
                  @if (googlePlacesList().length > 0) {
                    <div class="suggest-section">
                      <div class="suggest-header suggest-header-places">
                        <span>Google Places Verified Locations ({{ googlePlacesList().length }})</span>
                      </div>
                      <div class="suggest-list">
                        @for (place of googlePlacesList(); track place.placeId || place.label) {
                          <div class="suggest-item suggest-item-google" (click)="selectGooglePlace(place)">
                            <div class="suggest-item-left">
                              <span class="material-symbols-outlined loc-pin google-pin">explore</span>
                              <div class="suggest-item-texts">
                                <div class="suggest-title-flex">
                                  <span class="suggest-name">{{ place.label }}</span>
                                  <span class="google-badge-tag">Google Place</span>
                                </div>
                                <span class="suggest-sub">{{ place.sub }}</span>
                              </div>
                            </div>
                            <span class="suggest-tag-add">+ Select</span>
                          </div>
                        }
                      </div>
                    </div>
                  }

                  <!-- 3. Corridors & Localities Section -->
                  @if (filteredTrendingLocations().length > 0) {
                    <div class="suggest-section">
                      <div class="suggest-header">
                        <span>{{ propertyService.searchQuery() ? 'Matching Corridors & Localities' : 'Trending High-Growth Corridors' }}</span>
                      </div>
                      <div class="suggest-list">
                        @for (loc of filteredTrendingLocations(); track loc.name) {
                          <div class="suggest-item" (click)="selectLocation(loc)">
                            <div class="suggest-item-left">
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

                  <!-- 3. Empty State -->
                  @if (propertyService.searchQuery() && matchedProperties().length === 0 && filteredTrendingLocations().length === 0) {
                    <div class="suggest-empty-state">
                      <div class="empty-texts">
                        <p class="empty-title">No matching properties for "{{ propertyService.searchQuery() }}"</p>
                        <p class="empty-sub">Press SEARCH or Enter to check the entire registry.</p>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Vertical Hairline Divider -->
            <div class="pill-divider"></div>

            <!-- Segment 2: Property Type -->
            <div 
              class="pill-segment segment-dropdown" 
              [class.is-open]="isTypeDropdownOpen()"
              (click)="$event.stopPropagation()">
              <div 
                class="segment-trigger"
                (click)="toggleTypeDropdown()"
                role="button"
                tabindex="0">
                <div class="segment-texts">
                  <span class="segment-label">Property Type</span>
                  <span class="segment-value">{{ getSelectedTypeDisplay() }}</span>
                </div>
              </div>

              <!-- Multi-Select Popover Panel -->
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
                            <span class="chkbox-mark">✓</span>
                          }
                        </div>
                        <div class="check-texts">
                          <span class="check-label">{{ item.label }}</span>
                          <span class="check-sub">{{ item.desc }}</span>
                        </div>
                      </div>
                    }
                  </div>

                  <div class="popover-footer">
                    <span class="selection-summary">{{ selectedTypes().length }} Selected</span>
                    <button type="button" class="btn-apply-popover" (click)="applyTypeDropdown()">
                      Apply
                    </button>
                  </div>
                </div>
              }
            </div>

            <!-- Vertical Hairline Divider -->
            <div class="pill-divider"></div>

            <!-- Segment 3: Budget Range -->
            <div 
              class="pill-segment segment-dropdown" 
              [class.is-open]="isBudgetDropdownOpen()"
              (click)="$event.stopPropagation()">
              <div 
                class="segment-trigger"
                (click)="toggleBudgetDropdown()"
                role="button"
                tabindex="0">
                <div class="segment-texts">
                  <span class="segment-label">Budget</span>
                  <span class="segment-value">{{ propertyService.selectedBudget() }}</span>
                </div>
              </div>

              <!-- Budget Popover Panel -->
              @if (isBudgetDropdownOpen()) {
                <div class="mat-dropdown-panel budget-popover-panel" role="listbox" aria-label="Budget Ranges">
                  <div class="popover-panel-header">
                    <span class="popover-title">Choose Budget Bracket</span>
                  </div>

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

            <!-- Segment 4: Search Button -->
            <div class="pill-action-wrap">
              <button type="button" class="btn-pill-search" (click)="executeSearch()" id="hero-search-btn">
                <span class="search-btn-text">Search</span>
              </button>
            </div>

          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    :host {
      display: block;
      position: relative;
      z-index: 10;
    }
    .hero-section {
      position: relative;
      z-index: 10;
      background-color: #ffffff;
      padding-top: 0;
      margin-top: 0;
      border-bottom: none;
    }
    app-deals-scrolling-banner {
      display: block;
      width: 100%;
      margin: 0;
      padding: 0;
    }
    app-land-intent-strip {
      display: block;
      width: 100%;
      margin: 0;
      padding: 0;
      position: relative;
      z-index: 15;
    }
    /* Creative Architectural Image View with Opacity (Static • High Contrast) */
    .blueprint-bg {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
      z-index: 0;
      background-color: #f8fafc;
    }

    .bg-hero-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center 30%;
      opacity: 0.38;
      filter: saturate(1.12) contrast(1.05);
      will-change: opacity;
    }

    /* Architectural Duo-tone Color Tint */
    .hero-bg-tint {
      position: absolute;
      inset: 0;
      background: 
        radial-gradient(circle at 12% 20%, rgba(199, 52, 52, 0.04) 0%, transparent 45%),
        radial-gradient(circle at 88% 20%, rgba(15, 23, 42, 0.035) 0%, transparent 45%);
      pointer-events: none;
    }

    /* Subtle Hairline Blueprint Drafting Grid (Creative Architectural Motif) */
    .hero-bg-drafting-grid {
      position: absolute;
      inset: 0;
      background-image: 
        linear-gradient(to right, rgba(148, 163, 184, 0.08) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(148, 163, 184, 0.08) 1px, transparent 1px);
      background-size: 48px 48px;
      pointer-events: none;
      opacity: 0.65;
    }

    /* Multi-Stop Vertical Vignette (Seamless Header to Crisp Base) */
    .overlay-gradient-vertical {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        to bottom,
        rgba(255, 255, 255, 0.35) 0%,
        rgba(255, 255, 255, 0.15) 30%,
        rgba(255, 255, 255, 0.70) 65%,
        #ffffff 100%
      );
      pointer-events: none;
    }

    /* Radial Focus Spotlight (Clean, Crisp Foreground Readability) */
    .overlay-gradient-horizontal {
      position: absolute;
      inset: 0;
      background: radial-gradient(
        ellipse 75% 65% at 50% 48%,
        rgba(255, 255, 255, 0.94) 0%,
        rgba(255, 255, 255, 0.65) 55%,
        transparent 100%
      );
      pointer-events: none;
    }

    /* Bottom Seamless Gradient Melt */
    .hero-bg-bottom-melt {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 120px;
      background: linear-gradient(to bottom, transparent 0%, #ffffff 100%);
      pointer-events: none;
    }
    .hero-content {
      position: relative;
      z-index: 10;
    }
    .hero-text-center {
      text-align: center;
      /* max-width: 56rem; */
      margin-left: auto;
      margin-right: auto;
      margin-bottom: 2.5rem;
      margin-top: 4.5rem;
    }
    .badge-hero-verified {
      display: inline-flex;
      align-items: center;
      gap: 0.625rem;
      padding: 0.3rem 0.85rem 0.3rem 0.35rem;
      border-radius: 9999px;
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      /* box-shadow: 0 2px 10px -2px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(15, 23, 42, 0.04); */
      margin-bottom: 1.25rem;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      cursor: default;
    }
    .badge-hero-verified:hover {
      border-color: #cbd5e1;
      box-shadow: 0 4px 16px -2px rgba(15, 23, 42, 0.12);
      transform: translateY(-1px);
    }
    .badge-tag-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.25rem 0.65rem;
      background: #0f172a;
      color: #ffffff;
      border-radius: 9999px;
      font-size: 10.5px;
      font-weight: 600;
      letter-spacing: 0.06em;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.2);
    }
    .badge-camera-icon {
      font-size: 13px;
      color: #f87171;
    }
    .badge-main-text {
      font-size: 12.5px;
      font-weight: 600;
      color: #1e293b;
      letter-spacing: -0.01em;
    }
    .badge-arrow-icon {
      font-size: 14px;
      color: #94a3b8;
      transition: transform 0.2s ease, color 0.2s ease;
    }
    .badge-hero-verified:hover .badge-arrow-icon {
      color: var(--brand-red);
      transform: translateX(2px);
    }
    @media (max-width: 640px) {
      .badge-hero-verified {
        padding: 0.25rem 0.65rem 0.25rem 0.3rem;
        gap: 0.4rem;
        max-width: 100%;
      }
      .badge-tag-pill {
        padding: 0.2rem 0.5rem;
        font-size: 9.5px;
      }
      .badge-main-text {
        font-size: 11px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .badge-arrow-icon {
        display: none;
      }
    }
    .hero-headline {
      font-size: clamp(1.4rem, 5.5vw, 1.65rem);
      font-weight: 600;
      color: var(--text-slate-950);
      letter-spacing: -0.025em;
      line-height: 1.22;
      word-break: break-word;
    }
    @media (min-width: 640px) {
      .hero-headline {
        font-size: 2rem;
        line-height: 1.15;
      }
    }
    @media (min-width: 1024px) {
      .hero-headline {
        font-size: 2rem;
      }
    }
    .highlight-red {
      color: var(--brand-red);
    }
    .hero-subline {
      color: var(--text-slate-600);
      font-size: 0.95rem;
      margin-top: 0.65rem;
      font-weight: 400;
      /* max-width: 46rem; */
      margin-left: auto;
      margin-right: auto;
      line-height: 1.65;
      letter-spacing: -0.01em;
    }
    @media (min-width: 640px) {
      .hero-subline {
        font-size: 1rem;
        margin-top: 0.75rem;
        line-height: 1.65;
      }
    }
    @media (max-width: 640px) {
      .hero-section {
        padding-top: 1.25rem;
      }
      .hero-text-center {
        margin-bottom: 1.25rem;
        padding: 0 0.25rem;
      }
      .hero-subline {
        font-size: 0.88rem;
        line-height: 1.55;
        margin-top: 0.5rem;
      }
      .badge-hero-verified {
        font-size: 10px;
        padding: 0.2rem 0.6rem;
        margin-bottom: 0.75rem;
      }
    }

    /* Sleek Minimalist Floating Search Pill */
    .search-pill-wrapper {
      width: 100%;
      max-width: 58rem;
      margin: 0 auto;
      position: relative;
      z-index: 30;
    }

    .search-pill-bar {
      display: flex;
      align-items: center;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 9999px;
      padding: 0.35rem 0.5rem 0.35rem 1.25rem;
      box-shadow: 0 16px 36px -12px rgba(15, 23, 42, 0.10), 0 2px 8px -2px rgba(15, 23, 42, 0.04);
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .search-pill-bar:hover {
      border-color: #cbd5e1;
      box-shadow: 0 20px 40px -10px rgba(15, 23, 42, 0.14), 0 4px 12px -2px rgba(15, 23, 42, 0.06);
    }

    .pill-segment {
      position: relative;
      display: flex;
      align-items: center;
      padding: 0.45rem 1rem;
      border-radius: 9999px;
      transition: background 0.15s ease;
      cursor: pointer;
    }
    .pill-segment:hover {
      background: #f8fafc;
    }

    .segment-locality {
      flex: 2.2;
      min-width: 0;
      cursor: text;
    }
    .segment-dropdown {
      flex: 1.4;
      min-width: 0;
    }

    .segment-icon {
      font-size: 1.25rem;
      color: var(--brand-green, #5e8f72);
      margin-right: 0.65rem;
      flex-shrink: 0;
    }

    .segment-input-wrap,
    .segment-texts {
      display: flex;
      flex-direction: column;
      min-width: 0;
      flex: 1;
    }

    .segment-label {
      font-size: 0.68rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 0.1rem;
      white-space: nowrap;
    }

    .pill-input-text {
      width: 100%;
      border: none;
      background: transparent;
      outline: none;
      font-size: 0.88rem;
      font-weight: 600;
      color: #0f172a;
      font-family: inherit;
      padding: 0;
    }
    .pill-input-text::placeholder {
      color: #94a3b8;
      font-weight: 400;
    }

    .segment-value {
      font-size: 0.88rem;
      font-weight: 600;
      color: #0f172a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .chevron-icon {
      font-size: 1.15rem;
      color: #94a3b8;
      margin-left: 0.35rem;
      transition: transform 0.2s ease;
      flex-shrink: 0;
    }
    .chevron-icon.rotated {
      transform: rotate(180deg);
    }

    .segment-trigger {
      display: flex;
      align-items: center;
      width: 100%;
      min-width: 0;
    }

    .pill-divider {
      width: 1px;
      height: 32px;
      background: #e2e8f0;
      margin: 0 0.25rem;
      flex-shrink: 0;
    }

    .btn-pill-clear {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 2px 6px;
      border-radius: 9999px;
      margin-right: 0.25rem;
    }
    .btn-pill-clear:hover {
      color: #0f172a;
    }
    .clear-cross {
      font-size: 1.15rem;
      line-height: 1;
      font-weight: 600;
    }

    .pill-action-wrap {
      flex-shrink: 0;
      margin-left: 0.35rem;
    }

    .btn-pill-search {
      margin-right: 9px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 38px;
      padding: 0 1.5rem;
      border-radius: 9999px;
      font-size: 13.5px;
      font-weight: 600;
      letter-spacing: 0.02em;
      color: var(--brand-green);
      background: #ffffff;
      border: 2px solid var(--brand-green);
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .btn-pill-search:hover {
      /* background: #fef2f2; */
      border-color: var(--brand-green);
      color: var(--brand-green);
      transform: translateY(-1px);
    }
    .btn-pill-search:active {
      transform: translateY(0);
      background: var(--brand-green-subtle, #e5f7ec);
    }

    /* Popover Panels Base */
    .mat-dropdown-panel {
      position: absolute;
      top: calc(100% + 12px);
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 16px;
      box-shadow: 0 20px 35px -8px rgba(15, 23, 42, 0.18), 0 6px 12px -2px rgba(15, 23, 42, 0.06);
      z-index: 100;
      animation: fadeInDown 0.18s ease-out;
    }
    .type-popover-panel {
      left: 0;
      min-width: 340px;
    }
    .budget-popover-panel {
      right: 0;
      min-width: 340px;
    }

    /* Mobile Responsive Pill Stack */
    @media (max-width: 768px) {
      .search-pill-bar {
        flex-direction: column;
        border-radius: 18px;
        padding: 0.75rem;
        gap: 0.625rem;
        box-sizing: border-box;
      }
      .pill-segment {
        width: 100%;
        border-radius: 12px;
        background: #f8fafc;
        border: 1px solid #f1f5f9;
        padding: 0.65rem 0.85rem;
        box-sizing: border-box;
      }
      .type-popover-panel,
      .budget-popover-panel {
        position: absolute;
        left: 0 !important;
        right: 0 !important;
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
        top: calc(100% + 4px) !important;
        z-index: 150 !important;
      }
      .pill-divider {
        display: none;
      }
      .pill-action-wrap {
        width: 100%;
        margin-left: 0;
        display: flex;
        justify-content: left;
      }
      .btn-pill-search {
        width: auto;
        min-width: 130px;
        justify-content: center;
        padding: 0 1.5rem;
        height: 38px;
        font-size: 13px;
        font-weight: 600;
        border: 1.5px solid var(--brand-green, #5e8f72);
        border-radius: 9999px;
      }
    }

    /* Trending Auto-Suggest Dropdown */
    .suggest-dropdown-panel {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      width: 100%;
      min-width: 0;
      max-width: 100%;
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
    @media (max-width: 640px) {
      .suggest-dropdown-panel {
        max-height: 340px;
      }
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
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-slate-700);
      position: sticky;
      top: 0;
      z-index: 2;
    }
    .suggest-header.suggest-header-props {
      background: var(--brand-green-subtle, #e5f7ec);
      color: var(--brand-green-dark, #2c4938);
      border-bottom: 1px solid rgba(61, 104, 78, 0.2);
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
      color: var(--brand-green, #5e8f72);
    }
    .suggest-item-texts {
      display: flex;
      flex-direction: column;
    }
    .suggest-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-slate-900);
    }
    .suggest-sub {
      font-size: 11px;
      color: var(--text-slate-500);
    }
    .suggest-tag {
      font-size: 10px;
      font-weight: 600;
      color: var(--brand-green, #5e8f72);
      background: var(--brand-green-subtle, #e5f7ec);
      border: 1px solid rgba(94, 143, 114, 0.25);
      padding: 2px 6px;
      border-radius: 4px;
      white-space: nowrap;
    }

    .suggest-item-google:hover {
      background: #f0fdfa !important;
    }
    .google-pin {
      color: #0d9488 !important;
    }
    .suggest-title-flex {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .google-badge-tag {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      background: #e0f2fe;
      color: #0284c7;
      padding: 1px 5px;
      border-radius: 3px;
    }
    .suggest-tag-add {
      font-size: 11px;
      font-weight: 600;
      color: #0d9488;
      background: #ccfbf1;
      padding: 2px 7px;
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
      background: var(--brand-green-subtle, #e5f7ec);
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
      font-weight: 600;
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
      font-weight: 600;
      color: var(--text-slate-900);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .prop-price {
      font-size: 13px;
      font-weight: 600;
      color: var(--brand-green, #5e8f72);
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
      color: var(--brand-green, #5e8f72);
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
      font-weight: 600;
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
      max-width: 100%;
      padding: 1rem;
    }
    @media (max-width: 640px) {
      .type-popover-panel, .budget-popover-panel {
        min-width: 0;
        width: 100%;
        left: 0;
        right: 0;
        padding: 0.75rem;
      }
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
      font-weight: 600;
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
      font-weight: 600;
      color: var(--brand-green, #5e8f72);
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
      background: var(--brand-green, #5e8f72);
      border-color: var(--brand-green, #5e8f72);
      color: #ffffff;
    }
    .chkbox-mark {
      font-size: 11px;
      line-height: 1;
      font-weight: 600;
      color: #ffffff;
    }
    .check-texts {
      display: flex;
      flex-direction: column;
    }
    .check-label {
      font-size: 12px;
      font-weight: 600;
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
      background: var(--brand-green-subtle, #e5f7ec);
      color: var(--brand-green-dark, #2c4938);
      font-size: 10px;
      font-weight: 600;
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
      background: var(--brand-green, #5e8f72);
      color: #ffffff;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border: none;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-apply-popover:hover {
      background: var(--brand-green-hover, #497259);
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
      background: var(--brand-green, #5e8f72);
      border-color: var(--brand-green, #5e8f72);
      color: #ffffff;
      font-weight: 600;
    }

    /* Custom Min-Max Section */
    .custom-minmax-section {
      padding-top: 0.625rem;
      border-top: 1px solid #f1f5f9;
    }
    .minmax-title {
      font-size: 10px;
      font-weight: 600;
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
      font-weight: 600;
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
      background-color: var(--brand-green, #5e8f72);
      color: #ffffff;
      font-weight: 600;
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
      /* box-shadow: 0 2px 4px rgba(94, 143, 114, 0.25), 0 4px 10px rgba(94, 143, 114, 0.2); */
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .btn-hero-search:hover {
      background-color: var(--brand-green-hover, #497259);
      box-shadow: 0 4px 14px rgba(94, 143, 114, 0.4), 0 8px 22px rgba(94, 143, 114, 0.25);
      transform: translateY(-1px);
    }
    .btn-hero-search:active {
      transform: scale(0.98);
      box-shadow: 0 1px 2px rgba(94, 143, 114, 0.3);
    }
    @media (max-width: 640px) {
      .btn-hero-search {
        height: 48px;
        font-size: 13px;
        border-radius: 10px;
      }
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
  readonly selectedTypes = signal<string[]>([]);
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
  readonly googlePlacesList = signal<any[]>([]);
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
    (event.target as HTMLImageElement).src = 'hero-bg.jpg';
  }

  onInputEnter(event: Event): void {
    event.preventDefault();
    this.executeSearch();
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

  selectGooglePlace(place: any): void {
    const text = place.label || place.query || place.fullText;
    this.propertyService.searchQuery.set(text);
    this.isLocationSuggestOpen.set(false);
  }

  clearSearchInput(): void {
    this.propertyService.searchQuery.set('');
    this.googlePlacesList.set([]);
  }

  private heroDebounceTimer: any = null;

  onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.propertyService.searchQuery.set(val);
    this.isLocationSuggestOpen.set(true);

    if (this.heroDebounceTimer) {
      clearTimeout(this.heroDebounceTimer);
    }
    this.heroDebounceTimer = setTimeout(() => {
      const trimmed = val.trim();
      if (trimmed.length >= 2) {
        this.propertyService.fetchGooglePlaces(trimmed).subscribe(places => {
          this.googlePlacesList.set(places || []);
        });
        this.propertyService.loadPropertiesFromApi({
          q: trimmed,
          limit: 10,
          append: false
        });
      } else {
        this.googlePlacesList.set([]);
      }
    }, 280);
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

    const typesParam = this.selectedTypes().length > 0 ? this.selectedTypes().join(',') : null;

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
