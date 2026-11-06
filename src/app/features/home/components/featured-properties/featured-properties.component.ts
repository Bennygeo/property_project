import { Component, inject, OnInit, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PropertyService } from '../../../../core/services/property.service';
import { PropertyCardComponent } from '../property-card/property-card.component';

@Component({
  selector: 'app-featured-properties',
  standalone: true,
  imports: [CommonModule, RouterModule, PropertyCardComponent],
  template: `
    <section class="max-w-content featured-section" id="featured-section">
      <!-- Section Header -->
      <div class="section-header-row">
        <div class="header-left">
          <h2 class="section-title">Featured Verified Properties</h2>
          <div class="header-spectrum-rule" aria-hidden="true"></div>
          <p class="section-subtitle">
            Audited legal titles, genuine owner contacts, and verified site dimensions.
          </p>
        </div>
        <div class="header-right">
          <span class="meta-count">Showing {{ displayedProperties().length }} of {{ propertyService.totalApiProperties() || propertyService.properties().length }}</span>
          <a class="meta-link" routerLink="/search" [queryParams]="getSearchQueryParams()">
            <span>Search all properties</span>
            <span class="material-symbols-outlined link-arrow">arrow_forward</span>
          </a>
        </div>
      </div>

      <!-- Minimalist Filter Pills Bar -->
      <div class="filter-pills-bar">
        <button 
          type="button" 
          class="filter-chip"
          [class.active]="propertyService.activeCategoryFilter() === 'all'"
          (click)="setCategory('all')">
          <span>All Properties</span>
        </button>

        <button 
          type="button" 
          class="filter-chip"
          [class.active]="propertyService.activeCategoryFilter() === 'apartments'"
          (click)="setCategory('apartments')">
          <span>Apartments &amp; Flats</span>
        </button>

        <button 
          type="button" 
          class="filter-chip"
          [class.active]="propertyService.activeCategoryFilter() === 'plots'"
          (click)="setCategory('plots')">
          <span>Plots &amp; Land</span>
        </button>

        <button 
          type="button" 
          class="filter-chip"
          [class.active]="propertyService.activeCategoryFilter() === 'villas'"
          (click)="setCategory('villas')">
          <span>Villas &amp; Penthouses</span>
        </button>

        <button 
          type="button" 
          class="filter-chip"
          [class.active]="propertyService.activeCategoryFilter() === 'commercial'"
          (click)="setCategory('commercial')">
          <span>Commercial</span>
        </button>
      </div>

      <!-- Properties Grid (Capped to 20 on Home Page) -->
      @if (displayedProperties().length > 0) {
        <div class="cards-grid">
          @for (prop of displayedProperties(); track prop.id) {
            <app-property-card [property]="prop" />
          }
        </div>

        <!-- Prominent Insist Banner Directing to Full Search Page -->
        <div class="search-insist-banner">
          <div class="insist-left">
            <div class="insist-badge">
              <span>20 Curated Highlights Shown</span>
            </div>
            <h3 class="insist-title">Looking for specific localities, budgets, or plot directions?</h3>
            <p class="insist-desc">
              The Home page displays a curated sample of 20 featured plots. Head to our comprehensive Search Engine to filter by price/sq.ft, DTCP/RERA sanctions, direction, and live satellite coordinates.
            </p>
          </div>
          <div class="insist-right">
            <a class="btn-insist-search" routerLink="/search" [queryParams]="getSearchQueryParams()">
              <span>Go to Advanced Search Page</span>
              <span class="material-symbols-outlined btn-arrow">arrow_forward</span>
            </a>
          </div>
        </div>
      } @else {
        <div class="empty-results-box">
          <div class="empty-icon-wrap">
            <span class="material-symbols-outlined empty-icon">domain_disabled</span>
          </div>
          <h3 class="empty-title">No properties match your current filter</h3>
          <p class="empty-desc">
            Try adjusting your asset class filter or clear the current search query.
          </p>
          <button type="button" class="btn-reset-search" (click)="resetSearch()">
            <span class="material-symbols-outlined">restart_alt</span>
            <span>Reset Filters</span>
          </button>
        </div>
      }
    </section>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .featured-section {
      width: 100%;
      padding-top: 1rem;
      padding-bottom: 2.5rem;
      background: #ffffff;
      box-sizing: border-box;
    }

    /* Section Header */
    .section-header-row {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid #f1f5f9;
    }
    @media (min-width: 768px) {
      .section-header-row {
        flex-direction: row;
        align-items: flex-end;
        justify-content: space-between;
      }
    }

    .header-left {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .section-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #64748b;
    }

    .badge-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
    }

    .section-title {
      font-size: 1rem;
      font-weight: 500;
      color: #0f172a;
      letter-spacing: -0.025em;
      margin: 0;
    }

    .header-spectrum-rule {
      height: 3.5px;
      width: 140px;
      border-radius: 2px;
      margin: 0;
      background: linear-gradient(
        90deg,
        #dc3522 0%, #dc3522 16.66%,
        #f59e0b 16.66%, #f59e0b 33.33%,
        #84cc16 33.33%, #84cc16 50%,
        #0ea5e9 50%, #0ea5e9 66.66%,
        #94a3b8 66.66%, #94a3b8 83.33%,
        #334155 83.33%, #334155 100%
      );
    }
    @media (min-width: 640px) {
      .section-title {
        font-size: 1rem;
      }
    }

    .section-subtitle {
      color: #64748b;
      font-size: 14px;
      margin: 0;
      line-height: 1.5;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .meta-count {
      font-size: 13px;
      color: #64748b;
      font-weight: 500;
      padding: 0.3rem 0.75rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 9999px;
    }

    .meta-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      font-weight: 500;
      color: #0f172a;
      text-decoration: none;
      transition: color 0.15s ease;
      cursor: pointer;
    }

    .meta-link:hover {
      color: var(--brand-green, #5e8f72);
    }

    .link-arrow {
      font-size: 16px;
      transition: transform 0.15s ease;
    }

    .meta-link:hover .link-arrow {
      transform: translateX(3px);
    }

    /* Minimalist Filter Pills Bar */
    .filter-pills-bar {
      display: flex;
      align-items: center;
      overflow-x: auto;
      padding-top: 1.5rem;
      padding-bottom: 0.5rem;
      scrollbar-width: none;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
    }
    .filter-pills-bar :last-child {
      border: none;
    }
    .filter-pills-bar::-webkit-scrollbar {
      display: none;
    }

    .filter-chip {
      display: inline-flex;
      align-items: center;
      padding: 0.45rem 1rem;
      font-size: 13px;
      font-weight: 500;
      color: #475569;
      background: #ffffff;
      border: none;
      border-right: 1px solid #ccc;
      border-radius: none !important;
      cursor: pointer;
      white-space: nowrap;
      box-shadow: none;
      transition: all 0.15s ease;
    }

    .filter-chip:hover {
      background: var(--brand-teal);
      color: #ffffffff;
      border-color: #cbd5e1;
    }

    .filter-chip.active {
      background: var(--brand-teal);
      color: #ffffff;
      border-color: var(--brand-teal);
      font-weight: 600;
    }

    /* Properties Grid - 4 Columns */
    .cards-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      align-items: stretch;
      gap: 1.25rem;
      padding-top: 1.5rem;
      width: 100%;
      box-sizing: border-box;
    }
    @media (min-width: 600px) {
      .cards-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (min-width: 900px) {
      .cards-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }
    @media (min-width: 1180px) {
      .cards-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 1.25rem;
      }
    }

    /* Empty State */
    .empty-results-box {
      margin-top: 2rem;
      background: #fafafa;
      border: 1px dashed #e2e8f0;
      border-radius: 12px;
      padding: 3rem 1.5rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
    }

    .empty-icon-wrap {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #f1f5f9;
      color: #64748b;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .empty-icon {
      font-size: 24px;
    }

    .empty-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: #0f172a;
      margin: 0;
    }

    .empty-desc {
      font-size: 0.875rem;
      color: #64748b;
      max-width: 26rem;
      margin: 0;
      line-height: 1.5;
    }

    .btn-reset-search {
      margin-top: 0.5rem;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.5rem 1rem;
      background: #0f172a;
      color: #ffffff;
      border: 1px solid #0f172a;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      box-shadow: none;
      transition: background 0.15s ease;
    }

    .btn-reset-search:hover {
      background: #1e293b;
    }

    .btn-reset-search .material-symbols-outlined {
      font-size: 16px;
    }

    /* Search Insist Banner (Directs user to Search page after 20 properties) */
    .search-insist-banner {
      margin-top: 2.25rem;
      background: var(--brand-teal);
      border-radius: 6px 20px 20px 20px !important;
      border: none;
      padding: 1.75rem 2rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      position: relative;
      overflow: hidden;
    }
    @media (min-width: 860px) {
      .search-insist-banner {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        padding: 2rem 2.5rem;
      }
    }

    .search-insist-banner::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(
        90deg,
        #dc3522 0%, #dc3522 16.66%,
        #f59e0b 16.66%, #f59e0b 33.33%,
        #84cc16 33.33%, #84cc16 50%,
        #0ea5e9 50%, #0ea5e9 66.66%,
        #94a3b8 66.66%, #94a3b8 83.33%,
        #334155 83.33%, #334155 100%
      );
    }

    .insist-left {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-width: 44rem;
    }

    .insist-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      color: var(--brand-booked);
      width: fit-content;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      
    }

    .insist-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.7);
    }

    .insist-title {
      font-size: 1rem;
      font-weight: 500;
      color: #ffffff;
      margin: 0;
      letter-spacing: -0.015em;
      line-height: 1.35;
    }
    @media (min-width: 640px) {
      .insist-title {
        font-size: 1rem;
      }
    }

    .insist-desc {
      font-size: 12px;
      color: #cbd5e1;
      margin: 0;
      line-height: 1.7;
    }

    .insist-right {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
      flex-shrink: 0;
    }
    @media (min-width: 860px) {
      .insist-right {
        align-items: flex-end;
      }
    }

    .btn-insist-search {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: #ffffff;
      color: #0f3b4a;
      font-size: 14px;
      font-weight: 600;
      padding: 0.55rem 1.2rem;
      border-radius: 6px 14px 14px 14px;
      text-decoration: none;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      white-space: nowrap;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    .btn-insist-search:hover {
      background: #f1f5f9;
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
    }
    .btn-insist-search .btn-arrow {
      font-size: 18px;
      transition: transform 0.2s ease;
    }
    .btn-insist-search:hover .btn-arrow {
      transform: translateX(3px);
    }

    .insist-subtext {
      font-size: 11px;
      color: #94a3b8;
    }
  `]
})
export class FeaturedPropertiesComponent implements OnInit {
  readonly propertyService = inject(PropertyService);

  // Strictly load and display only 20 properties on Home page
  readonly displayedProperties = computed(() => {
    return this.propertyService.properties().slice(0, 20);
  });

  getSearchQueryParams(): Record<string, string> {
    const cat = this.propertyService.activeCategoryFilter();
    if (cat && cat !== 'all') {
      return { type: cat };
    }
    return {};
  }

  setCategory(cat: string): void {
    this.propertyService.setCategoryFilter(cat);
    this.propertyService.loadPropertiesFromApi({
      offset: 0,
      limit: 20,
      append: false,
      propertyType: cat !== 'all' ? cat : undefined
    });
  }

  ngOnInit(): void {
    this.propertyService.loadPropertiesFromApi({
      offset: 0,
      limit: 20,
      append: false
    });
  }

  resetSearch(): void {
    this.propertyService.searchQuery.set('');
    this.setCategory('all');
  }
}
