import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PropertyService } from '../../../../core/services/property.service';
import { Property } from '../../../../core/models/property.model';
import { formatPriceIndian } from '../../../../core/utils/price-helper';

@Component({
  selector: 'app-recent-sites',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <!-- Separator Between Search Section & Recently Added Sites -->
    <div class="section-separator-wrap" aria-hidden="true">
      <div class="max-w-content">
        <div class="section-separator-line"></div>
      </div>
    </div>

    <section class="max-w-content recent-sites-section" id="recent-sites-section">
      <!-- Section Header -->
      <div class="section-header-row">
        <div class="header-left">
          <h2 class="section-title">Recently Added Sites</h2>
          <div class="header-spectrum-rule" aria-hidden="true"></div>
          <p class="section-subtitle">
            Freshly surveyed layouts, authenticated direct owner deeds, and verified DTCP/RERA sanctioned plots.
          </p>
        </div>
        <div class="header-right">
          <a class="meta-link" routerLink="/search" [queryParams]="{ sort: 'newest' }">
            <span>View all recent additions</span>
            <span class="material-symbols-outlined link-arrow">arrow_forward</span>
          </a>
        </div>
      </div>

      <!-- Two Columns in a Row -->
      @if (recentSites().length > 0) {
        <div class="recent-sites-grid">
          @for (prop of recentSites(); track prop.id; let idx = $index) {
          <article class="recent-site-card" [routerLink]="['/property', prop.id]">
            <!-- Full Bleed Image Background -->
            <img 
              [src]="prop.imageUrl" 
              [alt]="prop.title" 
              (error)="onImgError($event)"
              class="recent-site-bg-img" 
              loading="lazy"
              decoding="async">

            <!-- Cinematic Architectural Overlay (High Contrast & Legibility) -->
            <div class="recent-site-overlay"></div>

            <!-- Top Badges & Quick Action Row -->
            <div class="card-top-bar">
              <div class="top-left-badges">
                <!-- RERA Approved Badge -->
                @if (isRera(prop)) {
                  <img 
                    src="assets/badge/rera_approved_60x60.png" 
                    alt="RERA Approved" 
                    class="card-badge-rera" 
                    [title]="getReraText(prop)"
                    loading="lazy">
                }

                <!-- No Brokerage Badge -->
                <img 
                  src="assets/badge/no-brokerage.png" 
                  alt="0% Brokerage" 
                  class="card-badge-no-brokerage" 
                  title="0% Brokerage - Direct Deed"
                  loading="lazy">

                <!-- Recently Added Badge (placed after the badges) -->
                <span class="badge-freshness">
                  <span class="badge-sparkle material-symbols-outlined">auto_awesome</span>
                  <span>Recently Added</span>
                </span>
              </div>

              <!-- Top Right Floating Actions -->
              <div class="top-right-actions">
                <a 
                  class="btn-action-icon btn-action-wa" 
                  [href]="prop.whatsappUrl || 'https://wa.me/919486140936'" 
                  target="_blank" 
                  rel="noopener"
                  (click)="$event.stopPropagation()"
                  title="Message on WhatsApp"
                  aria-label="Message on WhatsApp">
                  <span class="material-symbols-outlined">chat</span>
                </a>

                <button 
                  type="button" 
                  class="btn-action-icon btn-action-fav" 
                  [class.is-shortlisted]="prop.isShortlisted || propertyService.isShortlisted(prop.id)"
                  (click)="$event.stopPropagation(); propertyService.toggleShortlist(prop.id)"
                  [title]="(prop.isShortlisted || propertyService.isShortlisted(prop.id)) ? 'Remove from shortlist' : 'Save site to shortlist'">
                  <span class="material-symbols-outlined">
                    {{ (prop.isShortlisted || propertyService.isShortlisted(prop.id)) ? 'favorite' : 'favorite_border' }}
                  </span>
                </button>
              </div>
            </div>

            <!-- Main Content Overlay Details -->
            <div class="card-details-overlay">
              <div class="details-main-col">
                <!-- Title (Property Name in Bold) -->
                <h3 class="site-title" [title]="prop.title">
                  {{ prop.title }}
                </h3>

                <!-- Price Row (Bold Price and Rate) -->
                <div class="price-rate-row">
                  <span class="site-price">{{ formatPriceIndian(prop.price) }}</span>
                  <span class="price-sep">·</span>
                  <span class="site-unit-price">{{ prop.pricePerSqFt }}</span>
                  @if (prop.sqft) {
                    <span class="site-sqft">({{ formatSqft(prop.sqft) }})</span>
                  }
                </div>

                <!-- Builder / Developer Name -->
                @if (getDeveloper(prop)) {
                  <div class="site-builder-row">
                    <span class="material-symbols-outlined builder-icon">corporate_fare</span>
                    <span class="builder-text">By {{ getDeveloper(prop) }}</span>
                  </div>
                }

                <!-- Address of the Plot -->
                <div class="site-address-row" [title]="getPlotAddress(prop)">
                  <span class="material-symbols-outlined address-icon">place</span>
                  <span class="address-text">{{ getPlotAddress(prop) }}</span>
                </div>
              </div>

              <!-- Bottom Action Cue -->
              <div class="details-cta-col">
                <span class="cta-helper-text">
                  <span class="material-symbols-outlined helper-icon">verified_user</span>
                  <span>Direct Deed</span>
                </span>
                <span class="btn-explore-site">
                  <span>Explore</span>
                  <span class="material-symbols-outlined cta-arrow">arrow_forward</span>
                </span>
              </div>
            </div>
          </article>
        }
      </div>
      } @else {
        <!-- Shimmer Skeleton Loading State (Prevents layout shift / jerk when initializing) -->
        <div class="recent-sites-grid skeleton-grid" aria-busy="true" aria-label="Loading recent sites">
          @for (s of [1, 2]; track s) {
            <article class="recent-site-card skeleton-recent-card shimmer-effect"></article>
          }
        </div>
      }
    </section>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      background: #ffffff;
      position: relative;
      z-index: 2;
    }

    /* Section Separator Line */
    .section-separator-wrap {
      width: 100%;
      background: #ffffff;
      padding-top: 0.25rem;
      padding-bottom: 1.5rem;
      box-sizing: border-box;
    }

    .section-separator-line {
      height: 1px;
      width: 100%;
      background: linear-gradient(
        90deg,
        rgba(226, 232, 240, 0.25) 0%,
        var(--hairline-border, #e2e8f0) 10%,
        var(--hairline-border, #e2e8f0) 90%,
        rgba(226, 232, 240, 0.25) 100%
      );
    }

    .recent-sites-section {
      width: 100%;
      padding-top: 0.5rem;
      padding-bottom: 2.5rem;
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

    .live-pulse-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--brand-green, #5e8f72);
      margin-bottom: 2px;
    }

    .live-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--brand-green, #5e8f72);
      box-shadow: 0 0 0 0 rgba(94, 143, 114, 0.7);
      animation: livePulse 1.8s infinite;
    }

    @keyframes livePulse {
      0% {
        box-shadow: 0 0 0 0 rgba(94, 143, 114, 0.7);
      }
      70% {
        box-shadow: 0 0 0 7px rgba(94, 143, 114, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(94, 143, 114, 0);
      }
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

    /* Two Columns in a Row */
    .recent-sites-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.25rem;
      width: 100%;
    }
    @media (min-width: 768px) {
      .recent-sites-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 1.5rem;
      }
    }

    /* Card with Full-Bleed Image Background */
    .recent-site-card {
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 260px;
      width: 100%;
      border-radius: 6px 20px 20px 20px !important;
      overflow: hidden;
      border: 1px solid #eeeeee;
      cursor: pointer;
      text-decoration: none;
      box-sizing: border-box;
      padding: 1.25rem 1.35rem;
      transition: border-color 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
    }

    .recent-site-card:hover {
      border-color: var(--brand-green, #5e8f72);
      transform: translateY(-1px);
      box-shadow: 0 10px 25px -5px rgba(15, 59, 74, 0.2);
    }

    /* Background Image */
    .recent-site-bg-img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
      z-index: 1;
      transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .recent-site-card:hover .recent-site-bg-img {
      transform: scale(1.035);
    }

    /* Architectural Cinematic Gradient Overlay (Vertical High Contrast) */
    .recent-site-overlay {
      position: absolute;
      inset: 0;
      z-index: 2;
      background: linear-gradient(
        180deg, 
        rgba(15, 59, 74, 0.72) 0%, 
        rgba(15, 23, 42, 0.38) 32%, 
        rgba(15, 23, 42, 0.82) 65%, 
        rgba(2, 6, 23, 0.98) 100%
      );
      transition: background 0.3s ease;
    }

    .recent-site-card:hover .recent-site-overlay {
      background: linear-gradient(
        180deg, 
        rgba(15, 59, 74, 0.6) 0%, 
        rgba(15, 23, 42, 0.28) 32%, 
        rgba(15, 23, 42, 0.88) 65%, 
        rgba(2, 6, 23, 0.98) 100%
      );
    }

    @media (max-width: 768px) {
      .recent-site-card {
        min-height: 330px;
        padding: 1.15rem;
      }
    }

    /* Top Bar: Badges on Left, Actions on Right */
    .card-top-bar {
      position: relative;
      z-index: 3;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      width: 100%;
    }

    .top-left-badges {
      display: flex;
      align-items: flex-start;
      gap: 0.65rem;
      flex-wrap: wrap;
    }

    .badge-freshness {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: var(--brand-sold, #5e8f72);
      color: #ffffff;
      padding: 4px 10px;
      border-radius: 3px !important;
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      line-height:18px;
    }

    .badge-sparkle {
      font-size: 14px;
    }

    .card-badge-rera {
      width: 44px;
      height: 44px;
      object-fit: contain;
      background: rgba(255, 255, 255, 0.5);
      border-radius: none;
      padding: 3px;
      box-sizing: border-box;
      display: block;
    }

    .card-badge-no-brokerage {
      height: 44px;
      width: auto;
      max-width: 110px;
      object-fit: contain;
      display: block;
      background: rgba(255, 255, 255, 0.5);
      padding: 2px 6px;
      border-radius: none;
    }

    /* Top Right Floating Actions */
    .top-right-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-action-icon {
      width: 38px;
      height: 38px;
      border-radius: 50% !important;
      background: rgba(15, 59, 74, 0.65);
      backdrop-filter: blur(4px);
      border: 1px solid rgba(255, 255, 255, 0.25);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s ease;
    }

    .btn-action-icon:hover {
      background: rgba(255, 255, 255, 0.95);
      color: var(--brand-teal, #0f3b4a);
      transform: scale(1.08);
    }

    .btn-action-wa:hover {
      color: #25d366 !important;
    }

    .btn-action-fav.is-shortlisted {
      color: #ef4444;
      background: rgba(255, 255, 255, 0.95);
    }

    .btn-action-icon span {
      font-size: 20px;
    }

    /* Main Content Overlay */
    .card-details-overlay {
      position: relative;
      z-index: 3;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      margin-top: auto;
      padding-top: 1.25rem;
    }

    .details-main-col {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
      width: 100%;
    }

    /* Title - Bold Property Name */
    .site-title {
      font-size: 14px;
      font-weight: 500;
      color: #ffffff;
      line-height: 1.35;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    @media (min-width: 640px) {
      .site-title {
        font-size: 0.9rem;
      }
    }

    /* Price & Rate Row - Bold */
    .price-rate-row {
      display: flex;
      align-items: baseline;
      gap: 8px;
      flex-wrap: wrap;
    }

    .site-price {
      font-size: 1rem;
      font-weight: 700;
      color: var(--brand-green-subtle, #e5f7ec);
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
    }

    .price-sep {
      color: var(--text-slate-400, #94a3b8);
      font-size: 14px;
    }

    .site-unit-price {
      font-size: 13.5px;
      font-weight: 600;
      color: var(--surface-slate-100, #f1f5f9);
    }

    .site-sqft {
      font-size: 13px;
      color: var(--text-slate-300, #cbd5e1);
    }

    /* Builder Row */
    .site-builder-row {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 400;
      color: var(--surface-slate-200, #e2e8f0);
    }

    .builder-icon {
      font-size: 15px;
      color: var(--brand-green, #5e8f72);
    }

    /* Address Row */
    .site-address-row {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 400;
      color: var(--text-slate-300, #cbd5e1);
    }

    .address-icon {
      font-size: 15px;
      color: var(--brand-green, #5e8f72);
      flex-shrink: 0;
    }

    .address-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }

    /* CTA Row */
    .details-cta-col {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding-top: 0.65rem;
      border-top: 1px solid rgba(255, 255, 255, 0.15);
    }

    .cta-helper-text {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      font-weight: 500;
      color: var(--surface-slate-200, #e2e8f0);
    }

    .helper-icon {
      font-size: 16px;
      color: var(--brand-green, #5e8f72);
    }

    .btn-explore-site {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--brand-booked, #5e8f72);
      /* border: 1px solid var(--brand-green-border, #3d684e); */
      color: #ffffff;
      padding: 0.5rem 0.95rem;
      border-radius: 3px !important;
      font-size: 12.5px;
      font-weight: 600;
      letter-spacing: 0.02em;
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .recent-site-card:hover .btn-explore-site {
      background: var(--brand-green-hover, #497259);
      border-color: var(--brand-green-hover, #497259);
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(94, 143, 114, 0.35);
    }

    .cta-arrow {
      font-size: 16px;
      transition: transform 0.2s ease;
    }

    .recent-site-card:hover .cta-arrow {
      transform: translateX(4px);
    }
  `]
})
export class RecentSitesComponent {
  readonly propertyService = inject(PropertyService);
  readonly formatPriceIndian = formatPriceIndian;

  // The 2 most recently added properties
  readonly recentSites = computed(() => {
    const list = this.propertyService.properties();
    if (list && list.length >= 2) {
      return list.slice(0, 2);
    }
    const all = this.propertyService.allProperties();
    return all && all.length >= 2 ? all.slice(0, 2) : list.slice(0, 2);
  });

  onImgError(event: Event): void {
    const el = event.target as HTMLImageElement;
    el.src = 'plot-banner.jpg';
  }

  formatSqft(sqft: string): string {
    if (!sqft) return '';
    const clean = sqft.trim();
    return clean.toLowerCase().includes('sq') ? clean : `${clean} sq.ft`;
  }

  isRera(p: Property): boolean {
    const r = p.badges?.rera || p.masterDetails?.reraNumber || (p as any)?.reraNumber || '';
    if (!r) return true;
    const lower = String(r).toLowerCase().trim();
    return !['no', 'none', 'false', '0', 'unapproved'].includes(lower);
  }

  getReraText(p: Property): string {
    const r = p.badges?.rera || p.masterDetails?.reraNumber || (p as any)?.reraNumber || '';
    return r ? `RERA Approved: ${r}` : 'RERA Approved Layout';
  }

  getDeveloper(p: Property): string {
    const raw = p.developerName || p.masterDetails?.developer || p.developer?.name || (p as any)?.developer_name || '';
    const clean = raw ? raw.replace(/[–—]/g, '-').trim() : '';
    if (clean && clean.toLowerCase() !== 'null' && clean.toLowerCase() !== 'undefined' && clean.toLowerCase() !== 'none') {
      return clean;
    }
    return '';
  }

  getPlotAddress(p: Property): string {
    if ((p as any).plotAddress && String((p as any).plotAddress).trim() !== '') {
      return (p as any).plotAddress;
    }

    const m = p.masterDetails;
    let plotNo = (m?.plotNo || (p as any).plotNo || '').trim();
    if (!plotNo || plotNo === '1') {
      if (p.title) {
        const match = p.title.match(/Plot\s*(?:No\.?|Number|#)?\s*([A-Za-z0-9\/-]+)/i);
        if (match) {
          plotNo = match[1].trim();
        }
      }
    }

    let projectName = (p.projectName || m?.projectName || '').trim();
    if (!projectName || projectName.toLowerCase() === 'null' || projectName.toLowerCase() === 'undefined') {
      if (p.title) {
        const titleClean = p.title.replace(/[-–—|:,]?\s*Plot\s*(?:No\.?|Number|#)?\s*[A-Za-z0-9\/-]+/i, '').trim();
        if (titleClean && !titleClean.toLowerCase().includes('verified cadastral layout')) {
          projectName = titleClean;
        }
      }
    }

    const isValidLoc = (txt: any): boolean => {
      if (!txt) return false;
      const s = String(txt).trim();
      if (!s || s === '1' || s === '0' || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined') return false;
      if (/^\d+$/.test(s)) return false;
      if (s.includes('₹') || s.toLowerCase().includes('sq.ft') || s.toLowerCase().includes('cents')) return false;
      return true;
    };

    const village = [(p as any).locality_name, p.locality, m?.villageLocality, p.villageLocality, (p as any).areaLocation]
      .find(v => isValidLoc(v));
    const taluk = [m?.taluk, p.taluk].find(t => isValidLoc(t));
    let district = [(p as any).city_name, p.city, m?.district, p.district].find(d => isValidLoc(d));

    const parts: string[] = [];
    if (plotNo) parts.push(`Plot ${plotNo}`);
    if (projectName && !parts.includes(projectName)) parts.push(projectName);
    if (village && !parts.some(x => x.toLowerCase() === village.toLowerCase())) parts.push(village);
    if (taluk && !parts.some(x => x.toLowerCase() === taluk.toLowerCase()) && taluk !== village) parts.push(taluk);
    if (district && !parts.some(x => x.toLowerCase() === district.toLowerCase())) parts.push(district);
    else if (!district) parts.push('Chennai');

    return parts.length > 0 ? parts.join(', ') : 'Chennai, Tamil Nadu';
  }
}

