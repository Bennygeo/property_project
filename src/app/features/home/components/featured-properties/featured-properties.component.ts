import { Component, inject, OnInit } from '@angular/core';
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
        <div>
          <span class="editorial-tag text-red">Verified Deed Registry</span>
          <h2 class="section-title">Featured No-Brokerage Properties</h2>
          <p class="section-subtitle">
            Survey-audited titles, genuine owner contacts, and direct negotiation with zero broker fee.
          </p>
        </div>
        <div class="header-meta">
          <span class="meta-count">Showing {{ propertyService.properties().length }} Active Dossiers</span>
          <a class="meta-link" routerLink="/search">View Full Search Registry &rarr;</a>
        </div>
      </div>

      <!-- Quick Filter Pills -->
      <div class="filter-pills-bar">
        <button 
          type="button" 
          class="filter-chip"
          [class.active]="propertyService.activeCategoryFilter() === 'all'"
          (click)="propertyService.setCategoryFilter('all')">
          <span class="material-symbols-outlined chip-icon">grid_view</span>
          <span>All Asset Classes</span>
        </button>

        <button 
          type="button" 
          class="filter-chip"
          [class.active]="propertyService.activeCategoryFilter() === 'apartments'"
          (click)="propertyService.setCategoryFilter('apartments')">
          <span class="material-symbols-outlined chip-icon">apartment</span>
          <span>Apartments &amp; Flats</span>
        </button>

        <button 
          type="button" 
          class="filter-chip"
          [class.active]="propertyService.activeCategoryFilter() === 'plots'"
          (click)="propertyService.setCategoryFilter('plots')">
          <span class="material-symbols-outlined chip-icon">terrain</span>
          <span>Plots &amp; Land</span>
        </button>

        <button 
          type="button" 
          class="filter-chip"
          [class.active]="propertyService.activeCategoryFilter() === 'villas'"
          (click)="propertyService.setCategoryFilter('villas')">
          <span class="material-symbols-outlined chip-icon">villa</span>
          <span>Villas &amp; Penthouses</span>
        </button>

        <button 
          type="button" 
          class="filter-chip"
          [class.active]="propertyService.activeCategoryFilter() === 'commercial'"
          (click)="propertyService.setCategoryFilter('commercial')">
          <span class="material-symbols-outlined chip-icon">domain</span>
          <span>Commercial Spaces</span>
        </button>
      </div>

      <!-- Properties Grid -->
      @if (propertyService.properties().length > 0) {
        <div class="cards-grid">
          @for (prop of propertyService.properties(); track prop.id) {
            <app-property-card [property]="prop" />
          }
        </div>
      } @else {
        <div class="empty-results-box">
          <div class="empty-icon-wrap">
            <span class="material-symbols-outlined empty-icon">apartment</span>
          </div>
          <h3 class="empty-title">No verified properties match "{{ propertyService.searchQuery() }}"</h3>
          <p class="empty-desc">
            No published listings were found matching your current search criteria. Try searching by city name, project title, or reset your filters.
          </p>
          <button type="button" class="btn-reset-search" (click)="resetSearch()">
            <span class="material-symbols-outlined">restart_alt</span>
            <span>Reset Search &amp; Show All Properties</span>
          </button>
        </div>
      }
    </section>
  `,
  styles: [`
    .featured-section {
      padding-top: 4rem;
      padding-bottom: 4rem;
      background: #ffffff;
    }
    .section-header-row {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--hairline-border);
    }
    @media (min-width: 768px) {
      .section-header-row {
        flex-direction: row;
        align-items: flex-end;
        justify-content: space-between;
      }
    }
    .text-red {
      color: var(--brand-red);
    }
    .section-title {
      font-size: 1.875rem;
      font-weight: 800;
      color: var(--text-slate-950);
      letter-spacing: -0.02em;
      margin-top: 0.25rem;
    }
    @media (min-width: 640px) {
      .section-title {
        font-size: 2.25rem;
      }
    }
    .section-subtitle {
      color: var(--text-slate-600);
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }
    .header-meta {
      display: flex;
      align-items: center;
      gap: 1rem;
      font-size: 12px;
    }
    .meta-count {
      font-family: ui-monospace, monospace;
      color: var(--text-slate-500);
      font-weight: 600;
    }
    .meta-link {
      font-weight: 700;
      color: var(--brand-red);
      text-decoration: none;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      cursor: pointer;
    }
    .meta-link:hover {
      text-decoration: underline;
    }

    /* Filter Pills Bar */
    .filter-pills-bar {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      overflow-x: auto;
      padding-top: 1.5rem;
      padding-bottom: 0.5rem;
      scrollbar-width: none;
    }
    .filter-pills-bar::-webkit-scrollbar {
      display: none;
    }
    .filter-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-slate-600);
      background: #f8fafc;
      border: 1px solid var(--hairline-border);
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .filter-chip:hover {
      background: #f1f5f9;
      color: var(--text-slate-950);
      border-color: #cbd5e1;
    }
    .filter-chip.active {
      background: var(--brand-red);
      color: #ffffff;
      border-color: var(--brand-red);
      box-shadow: 0 2px 6px rgba(199, 52, 52, 0.25);
    }
    .filter-chip.active .chip-icon {
      color: #ffffff;
    }
    .chip-icon {
      font-size: 18px;
      color: var(--text-slate-500);
    }

    .cards-grid {
      display: grid;
      grid-template-columns: 1fr;
      align-items: stretch;
      gap: 2rem;
      padding-top: 1.5rem;
    }
    @media (min-width: 768px) {
      .cards-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    @media (min-width: 1024px) {
      .cards-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    .empty-results-box {
      margin-top: 2rem;
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 1rem;
      padding: 3rem 1.5rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
    }
    .empty-icon-wrap {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #fee2e2;
      color: var(--brand-red);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 0.5rem;
    }
    .empty-icon {
      font-size: 28px;
    }
    .empty-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-slate-900);
      margin: 0;
    }
    .empty-desc {
      font-size: 0.875rem;
      color: var(--text-slate-600);
      max-width: 28rem;
      margin: 0;
      line-height: 1.5;
    }
    .btn-reset-search {
      margin-top: 0.75rem;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1.25rem;
      background: var(--brand-red);
      color: #ffffff;
      border: none;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .btn-reset-search:hover {
      background: var(--brand-red-dark, #a82828);
    }
    .btn-reset-search .material-symbols-outlined {
      font-size: 18px;
    }
  `]
})
export class FeaturedPropertiesComponent implements OnInit {
  readonly propertyService = inject(PropertyService);

  ngOnInit(): void {
    this.propertyService.loadPropertiesFromApi();
  }

  resetSearch(): void {
    this.propertyService.searchQuery.set('');
    this.propertyService.setCategoryFilter('all');
  }
}
