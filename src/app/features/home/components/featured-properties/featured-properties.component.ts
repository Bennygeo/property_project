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
          <p class="section-subtitle">
            Audited legal titles, genuine owner contacts, and verified site dimensions.
          </p>
        </div>
        <div class="header-right">
          <span class="meta-count">{{ propertyService.properties().length }} Properties</span>
          <a class="meta-link" routerLink="/search">
            <span>Explore all</span>
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

      <!-- Properties Grid -->
      @if (propertyService.properties().length > 0) {
        <div class="cards-grid">
          @for (prop of propertyService.properties(); track prop.id) {
            <app-property-card [property]="prop" />
          }
        </div>
        <!-- Progressive API Scroll Loader & Skeletons -->
        @if (propertyService.isFetchingApi()) {
          <div class="scroll-skeleton-grid">
            <div class="skeleton-card" *ngFor="let s of [1, 2, 3]">
              <div class="skeleton-thumb-frame shimmer-bg">
                <div class="skeleton-badge shimmer-bg"></div>
              </div>
              <div class="skeleton-content-frame">
                <div class="skeleton-line shimmer-bg line-title"></div>
                <div class="skeleton-line shimmer-bg line-sub"></div>
                <div class="skeleton-meta-row">
                  <div class="skeleton-tag shimmer-bg"></div>
                  <div class="skeleton-tag shimmer-bg"></div>
                </div>
                <div class="skeleton-foot-row">
                  <div class="skeleton-price-line shimmer-bg"></div>
                  <div class="skeleton-btn shimmer-bg"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="api-scroll-loader-banner">
            <div class="loader-spinner-circle"></div>
            <div class="loader-info">
              <span class="loader-main-text">Loading verified properties...</span>
              <span class="loader-sub-text">Fetching next 10 plots from registry database</span>
            </div>
            <div class="loader-pulsing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        }

        @if (!propertyService.isFetchingApi() && propertyService.hasMoreApiProperties()) {
          <div class="infinite-scroll-container">
            <button type="button" class="btn-infinite-expand" (click)="loadMore()">
              <span class="material-symbols-outlined expand-icon">expand_more</span>
              <span>Showing {{ propertyService.properties().length }} of {{ propertyService.totalApiProperties() }} properties • Scroll down for next 10</span>
            </button>
          </div>
        } @else if (!propertyService.isFetchingApi() && propertyService.properties().length > 0 && propertyService.totalApiProperties() > 0) {
          <div class="infinite-scroll-container">
            <div class="all-loaded-badge">
              <span class="material-symbols-outlined">verified</span>
              <span>All {{ propertyService.properties().length }} verified properties loaded</span>
            </div>
          </div>
        }
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
      font-size: 1.4rem;
      font-weight: 600;
      color: #0f172a;
      letter-spacing: -0.025em;
      margin: 0;
    }
    @media (min-width: 640px) {
      .section-title {
        font-size: 1.5rem;
      }
    }

    .section-subtitle {
      color: #64748b;
      font-size: 0.9rem;
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
      font-weight: 600;
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
      gap: 0.5rem;
      overflow-x: auto;
      padding-top: 1.5rem;
      padding-bottom: 0.5rem;
      scrollbar-width: none;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
    }
    .filter-pills-bar::-webkit-scrollbar {
      display: none;
    }

    .filter-chip {
      display: inline-flex;
      align-items: center;
      padding: 0.45rem 1rem;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 500;
      color: #475569;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      cursor: pointer;
      white-space: nowrap;
      box-shadow: none;
      transition: all 0.15s ease;
    }

    .filter-chip:hover {
      background: #f8fafc;
      color: #0f172a;
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
  `]
})
export class FeaturedPropertiesComponent implements OnInit {
  readonly propertyService = inject(PropertyService);

  // Infinite Scroll: Initially show 20, load next 10 on scroll
  readonly displayedCount = signal<number>(20);
  readonly displayedProperties = computed(() => {
    return this.propertyService.properties().slice(0, this.displayedCount());
  });
  readonly hasMore = computed<boolean>(() => {
    return this.displayedCount() < this.propertyService.properties().length;
  });

  private isScrollThrottled = false;

  loadMore(): void {
    if (this.propertyService.hasMoreApiProperties() && !this.propertyService.isFetchingApi()) {
      this.propertyService.loadNextBatch(10, {
        propertyType: this.propertyService.activeCategoryFilter() !== 'all' ? this.propertyService.activeCategoryFilter() : undefined
      });
    }
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (!this.propertyService.hasMoreApiProperties() || this.propertyService.isFetchingApi() || this.isScrollThrottled) return;
    const scrollPosition = window.innerHeight + window.scrollY;
    const threshold = document.documentElement.scrollHeight - 700;
    if (scrollPosition >= threshold) {
      this.isScrollThrottled = true;
      this.loadMore();
      setTimeout(() => {
        this.isScrollThrottled = false;
      }, 400);
    }
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
    this.propertyService.loadPropertiesFromApi();
  }

  resetSearch(): void {
    this.propertyService.searchQuery.set('');
    this.setCategory('all');
  }
}
