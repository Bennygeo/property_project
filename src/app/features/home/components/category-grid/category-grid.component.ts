import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MetroService } from '../../../../core/services/metro.service';
import { PropertyService } from '../../../../core/services/property.service';
import { ArchitecturalCategory } from '../../../../core/models/category.model';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-category-grid',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="max-w-content categories-section" id="categories">
      <div class="section-header-row">
        <div>
          <span class="editorial-tag text-red">Browse by Asset Class</span>
          <h2 class="section-title">Explore Architectural Categories</h2>
        </div>
        <a class="view-all-link" routerLink="/search">
          <span>View All Classifications</span>
          <span class="material-symbols-outlined">arrow_forward</span>
        </a>
      </div>

      <div class="categories-grid">
        @for (cat of metroService.categories; track cat.id) {
          <div class="category-tile" (click)="onSelectCategory(cat)">
            <div class="icon-circle">
              <span class="material-symbols-outlined">{{ cat.icon }}</span>
            </div>
            <span class="cat-name">{{ cat.name }}</span>
            <span class="cat-count">{{ cat.count }}</span>
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    .categories-section {
      padding-top: 4rem;
      padding-bottom: 3rem;
      background: #ffffff;
    }
    .section-header-row {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--hairline-border);
    }
    @media (min-width: 640px) {
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
      font-size: 1.5rem;
      font-weight: 800;
      color: var(--text-slate-950);
      letter-spacing: -0.02em;
      margin-top: 0.25rem;
    }
    @media (min-width: 640px) {
      .section-title {
        font-size: 1.875rem;
      }
    }
    .view-all-link {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-slate-800);
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      transition: color 0.15s;
    }
    .view-all-link:hover {
      color: var(--brand-red);
    }
    .view-all-link span.material-symbols-outlined {
      font-size: 16px;
    }
    .categories-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }
    @media (min-width: 768px) {
      .categories-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }
    @media (min-width: 1024px) {
      .categories-grid {
        grid-template-columns: repeat(6, 1fr);
      }
    }
    .category-tile {
      padding: 1rem;
      border-radius: 0.75rem;
      border: 1px solid var(--hairline-border);
      background: #ffffff;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      transition: all 0.2s;
    }
    .category-tile:hover {
      border-color: #0f172a;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.08);
      transform: translateY(-2px);
    }
    .icon-circle {
      width: 3.5rem;
      height: 3.5rem;
      border-radius: 9999px;
      background: #f1f5f9;
      color: var(--text-slate-800);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 0.75rem;
      transition: all 0.2s;
    }
    .icon-circle span {
      font-size: 28px;
    }
    .category-tile:hover .icon-circle {
      background: #fef2f2;
      color: var(--brand-red);
    }
    .cat-name {
      font-size: 0.875rem;
      font-weight: 700;
      color: var(--text-slate-950);
      transition: color 0.15s;
    }
    .category-tile:hover .cat-name {
      color: var(--brand-red);
    }
    .cat-count {
      font-size: 11px;
      font-weight: 500;
      color: var(--text-slate-500);
      margin-top: 0.25rem;
    }
  `]
})
export class CategoryGridComponent {
  private readonly router = inject(Router);
  readonly metroService = inject(MetroService);
  readonly propertyService = inject(PropertyService);
  readonly notificationService = inject(NotificationService);

  onSelectCategory(cat: ArchitecturalCategory): void {
    let typeParam = 'all';
    if (cat.name === 'Luxury Flats') {
      typeParam = 'Apartments & Flats';
    } else if (cat.name === 'Gated Villas') {
      typeParam = 'Independent Villas';
    } else if (cat.name === 'Penthouses') {
      typeParam = 'Luxury Penthouses';
    } else if (cat.name === 'CMDA Plots' || cat.name === 'Farm Retreats') {
      typeParam = 'Gated CMDA Plots';
    } else if (cat.name === 'Commercial') {
      typeParam = 'Commercial Spaces';
    }

    this.router.navigate(['/search'], {
      queryParams: {
        type: typeParam !== 'all' ? typeParam : null
      }
    });
  }
}
