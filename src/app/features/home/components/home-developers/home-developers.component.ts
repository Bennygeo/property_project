import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PropertyService, DeveloperSummary } from '../../../../core/services/property.service';

@Component({
  selector: 'app-home-developers',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="max-w-content home-developers-section" *ngIf="isLoading() || topDevelopers().length > 0">
      <!-- Section Header -->
      <div class="section-header-row">
        <div class="header-left">
          <h2 class="section-title">Discover Developers</h2>
          <div class="header-spectrum-rule" aria-hidden="true"></div>
          <p class="section-subtitle">Award-winning developers crafting exceptional living spaces</p>
        </div>

        <div class="header-right">
          <a routerLink="/developers" class="meta-link" title="View all verified developers">
            <span>View all developers</span>
            <span class="material-symbols-outlined link-arrow">arrow_forward</span>
          </a>
        </div>
      </div>

      <!-- Shimmer Skeleton Loading State: 8 Cards (Zero Layout Shift / Anti-Jerk) -->
      <div *ngIf="isLoading()" class="developers-row-grid skeleton-grid" aria-busy="true" aria-label="Loading verified developers">
        <div *ngFor="let i of skeletonCards" class="developer-card skeleton-card">
          <div class="developer-logo-frame skeleton-logo-box shimmer-effect"></div>
          <div class="skeleton-line skeleton-name shimmer-effect"></div>
          <div class="skeleton-line skeleton-metric shimmer-effect"></div>
        </div>
      </div>

      <!-- Real Loaded Data: Single Row of 8 Developer Cards -->
      <div *ngIf="!isLoading()" class="developers-row-grid developers-loaded-grid">
        <article *ngFor="let dev of topDevelopers()" class="developer-card">
          <a [routerLink]="['/builder', dev.name]" class="card-main-link"
            [title]="'View projects developed by ' + dev.name">
            <div class="developer-logo-frame">
              <img [src]="getDeveloperLogo(dev)" [alt]="dev.name + ' Logo'" class="logo-image" loading="lazy"
                (error)="onLogoError($event, dev)">
            </div>
            <h3 class="developer-name" [title]="dev.name">{{ dev.name }}</h3>
            <div class="project-metric-row">
              <span class="material-symbols-outlined metric-icon">apartment</span>
              <span class="project-count-num">{{ dev.projectCount }}</span>
            </div>
          </a>
        </article>
      </div>
    </section>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .home-developers-section {
      padding-top: 1.5rem;
      padding-bottom: 2.25rem;
      background: #ffffff;
      box-sizing: border-box;
    }

    /* Section Header */
    .section-header-row {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
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

    .section-title {
      font-size: 1rem;
      font-weight: 500;
      color: var(--text-slate-900, #0f172a);
      letter-spacing: -0.02em;
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

    .section-subtitle {
      color: var(--text-slate-500, #64748b);
      font-size: 14px;
      margin: 0;
      line-height: 1.5;
      max-width: 48rem;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .meta-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13.5px;
      font-weight: 500;
      color: var(--brand-teal, #0f3b4a);
      text-decoration: none;
      transition: color 0.15s ease, transform 0.15s ease;
      cursor: pointer;
      white-space: nowrap;
    }

    .meta-link:hover {
      color: var(--brand-green, #5e8f72);
      transform: translateX(2px);
    }

    .link-arrow {
      font-size: 17px;
    }

    /* Single Row of 8 Developer Cards */
    .developers-row-grid {
      display: grid;
      grid-template-columns: repeat(8, minmax(0, 1fr));
      gap: 14px;
    }

    .developer-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      position: relative;
      overflow: hidden;
      transition: border-color 0.15s ease, background-color 0.15s ease;
      box-shadow: none !important;
    }

    .developer-card:hover {
      border-color: #0066ff;
      background-color: #fafcff;
      box-shadow: none !important;
    }

    .card-main-link {
      text-decoration: none;
      color: inherit;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 14px 10px 12px;
      height: 100%;
      box-sizing: border-box;
    }

    .developer-logo-frame {
      width: 100%;
      height: 80px;
      border-radius: 6px;
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 10px;
      padding: 6px;
      overflow: hidden;
      box-shadow: none !important;
    }

    .logo-image {
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
      object-fit: contain;
      border-radius: 4px;
      display: block;
    }

    .developer-name {
      width: 100%;
      font-size: 12.5px;
      font-weight: 600;
      color: #0f172a;
      line-height: 1.35;
      margin: 0 0 4px 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .project-metric-row {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      font-size: 11.5px;
      font-weight: 500;
      color: #64748b;
      line-height: 1;
    }

    .metric-icon {
      font-size: 13px;
      color: #64748b;
    }

    .project-count-num {
      font-size: 11.5px;
      color: #64748b;
    }

    @media (max-width: 1023px) {
      .developers-row-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }
    }

    @media (max-width: 639px) {
      .developers-row-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }
    }

    /* Shimmer Skeleton Styles */
    .skeleton-card {
      pointer-events: none;
      user-select: none;
      padding: 14px 10px 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      box-sizing: border-box;
      height: 148px;
    }

    .skeleton-logo-box {
      width: 100%;
      height: 80px;
      border-radius: 6px;
      margin-bottom: 10px;
      padding: 0;
    }

    .skeleton-line {
      border-radius: 4px;
    }

    .skeleton-name {
      width: 68%;
      height: 12px;
      margin-bottom: 6px;
    }

    .skeleton-metric {
      width: 36%;
      height: 10px;
      border-radius: 3px;
    }

    .developers-loaded-grid {
      animation: fadeInContent 0.35s ease-out;
    }

    @keyframes fadeInContent {
      from {
        opacity: 0.35;
      }
      to {
        opacity: 1;
      }
    }
  `]
})
export class HomeDevelopersComponent implements OnInit {
  private readonly propertyService = inject(PropertyService);

  readonly skeletonCards: number[] = [1, 2, 3, 4, 5, 6, 7, 8];
  readonly allDevelopers = signal<DeveloperSummary[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly topDevelopers = computed<DeveloperSummary[]>(() => this.allDevelopers().slice(0, 8));

  private readonly failedLogos = new Set<string>();

  private readonly dummyLogos: string[] = [
    'https://placehold.co/240x160/ffffff/0f172a/png?text=TRIBE+GROUP&font=montserrat',
    'https://placehold.co/240x160/3d5a45/ffffff/png?text=ZENVIAN&font=playfair-display',
    'https://api.dicebear.com/9.x/shapes/svg?seed=TMCGroup&backgroundColor=ffffff',
    'https://placehold.co/240x160/ffffff/9a8446/png?text=ORIGEN+REALTY&font=lato',
    'https://placehold.co/240x160/ffffff/3b1d75/png?text=ASBL&font=raleway',
    'https://ui-avatars.com/api/?name=T&background=1d70e8&color=ffffff&size=200&bold=true&font-size=0.55',
    'https://placehold.co/240x160/ffffff/1e293b/png?text=TRISHALA&font=poppins',
    'https://placehold.co/240x160/f1f5f9/0f172a/png?text=ASSETZ&font=oswald',
    'https://placehold.co/240x160/ffffff/b45309/png?text=EMBASSY&font=montserrat',
    'https://placehold.co/240x160/ffffff/475569/png?text=VISHUDDH&font=playfair-display',
    'https://api.dicebear.com/9.x/icons/svg?seed=HorizonEstates&backgroundColor=eff6ff',
    'https://placehold.co/240x160/0f172a/f8fafc/png?text=CREST+HOMES&font=raleway',
    'https://api.dicebear.com/9.x/shapes/svg?seed=ApexPromoters&backgroundColor=f8fafc',
    'https://placehold.co/240x160/ffffff/047857/png?text=VERDANT&font=poppins',
    'https://ui-avatars.com/api/?name=SD&background=0f766e&color=ffffff&size=200&bold=true',
    'https://placehold.co/240x160/1e293b/fbbf24/png?text=CROWN+LAND&font=lato'
  ];

  ngOnInit(): void {
    this.propertyService.fetchBuilders().subscribe({
      next: (builders) => {
        this.isLoading.set(false);
        this.allDevelopers.set(builders || []);
      },
      error: () => {
        this.isLoading.set(false);
        this.allDevelopers.set([]);
      }
    });
  }

  getDeveloperLogo(dev: DeveloperSummary): string {
    if (dev.logoUrl && !this.failedLogos.has(dev.name)) {
      return dev.logoUrl;
    }
    const idx = this.hashName(dev.name) % this.dummyLogos.length;
    return this.dummyLogos[idx];
  }

  onLogoError(event: Event, dev: DeveloperSummary): void {
    const img = event.target as HTMLImageElement | null;
    if (!img) return;
    if (dev.logoUrl && !this.failedLogos.has(dev.name)) {
      this.failedLogos.add(dev.name);
      const idx = this.hashName(dev.name) % this.dummyLogos.length;
      img.src = this.dummyLogos[idx];
      return;
    }
    const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(dev.name)}&background=0066ff&color=fff&size=200&bold=true&rounded=false`;
    if (img.src !== fallbackUrl) {
      img.src = fallbackUrl;
    }
  }

  private hashName(name: string): number {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash << 5) - hash + name.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}

