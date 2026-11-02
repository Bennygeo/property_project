import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Property } from '../../../../core/models/property.model';
import { PropertyService } from '../../../../core/services/property.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UserBehaviorService } from '../../../../core/services/user-behavior.service';
import { CompareService } from '../../../../core/services/compare.service';
import { formatPriceIndian } from '../../../../core/utils/price-helper';

@Component({
  selector: 'app-property-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <article class="property-card" [class.is-in-compare]="showCompare && compareService.isInCompare(property.id)" (click)="onCardClick()">
      <!-- Media Frame (Links to Details) -->
      <div class="card-media" [routerLink]="['/property', property.id]">
        <img 
          [src]="property.imageUrl" 
          [alt]="property.title" 
          (error)="onImgError($event)"
          class="card-img"
          loading="lazy"
          decoding="async">

        <!-- Top Badges Group -->
        <div class="badges-overlay">
          @if (showCompare && compareService.isInCompare(property.id)) {
            <span class="badge-in-compare">
              <span class="material-symbols-outlined badge-icon" style="font-size:12px;margin-right:2px;">compare_arrows</span>
              <span>In Compare</span>
            </span>
          }



          @if (property.badges.specialTag && !property.badges.specialTag.toLowerCase().includes('cadastral')) {
            <span class="badge-verified">
              <span>{{ property.badges.specialTag }}</span>
            </span>
          }

          @if (property.isGpsValid === false && property.gpsErrorReason) {
            <span class="badge-gps-red" title="GPS coordinates unverified or inaccurate">
              <span class="material-symbols-outlined badge-icon" style="font-size:12px;margin-right:2px;">error</span>
              <span>GPS Inaccurate</span>
            </span>
          }

          @if (!property.isRadiusSuggestion && property.distanceKm !== undefined && property.distanceKm !== null && property.distanceKm > 5.0) {
            <span class="badge-proximity" title="GPS Distance">
              <span class="material-symbols-outlined badge-icon" style="font-size:12px;margin-right:2px;">near_me</span>
              <span>{{ property.distanceKm }} km away</span>
            </span>
          }

          @if (property.isMediaUnlocked) {
            <span class="badge-tour">
              <span>4K Unlocked</span>
            </span>
          }
        </div>

        <!-- Top Action Buttons (Compare & Shortlist) -->
        <div class="card-top-actions">
          @if (showCompare) {
          <button 
            type="button"
            class="btn-card-compare" 
            [class.comparing]="compareService.isInCompare(property.id)"
            [title]="compareService.isInCompare(property.id) ? 'Remove from comparison' : 'Compare property (max 2)'"
            (click)="$event.stopPropagation(); compareService.toggleCompare(property)">
            <span class="material-symbols-outlined">compare_arrows</span>
          </button>
          }

          <button 
            type="button"
            class="btn-shortlist" 
            [class.shortlisted]="property.isShortlisted"
            [attr.aria-label]="property.isShortlisted ? 'Remove from shortlist' : 'Add to shortlist'"
            (click)="$event.stopPropagation(); propertyService.toggleShortlist(property.id)">
            <span class="material-symbols-outlined">
              {{ property.isShortlisted ? 'favorite' : 'favorite_border' }}
            </span>
          </button>
        </div>
      </div>

      <!-- Card Content -->
      <div class="card-content">
        @if (reraDisplayName) {
          <div class="card-rera-row">
            <span class="material-symbols-outlined card-rera-icon">verified</span>
            <span class="card-rera-text font-mono">{{ reraDisplayName }}</span>
          </div>
        }

        <!-- Title (Property Name First) -->
        <h3 class="property-title" [title]="property.title">
          <a [routerLink]="['/property', property.id]" class="title-link">{{ property.title }}</a>
        </h3>

        <!-- Price Row (Then Price) -->
        <div class="price-row">
          <span class="main-price">{{ formatPriceIndian(property.price) }}</span>
          <span class="unit-price">{{ property.pricePerSqFt }}</span>
        </div>

        <!-- Builder / Developer Details -->
        @if (developerDisplayName) {
          <a [routerLink]="['/builder', developerDisplayName]"
             (click)="$event.stopPropagation()"
             class="card-builder-row" 
             [title]="'Explore Builder: ' + developerDisplayName">
            <span class="material-symbols-outlined card-builder-icon">corporate_fare</span>
            <span class="card-builder-text">By {{ developerDisplayName }}</span>
            <span class="material-symbols-outlined" style="font-size: 13px; margin-left: auto; color: var(--brand-teal, #0f3b4a);">chevron_right</span>
          </a>
        }

        <!-- Locality -->
        <p class="locality-row" [title]="property.locality + ', ' + property.city">
          <span class="material-symbols-outlined loc-icon" [style.color]="property.isGpsValid === false && property.gpsErrorReason ? '#c76f56' : ''">location_on</span>
          <span class="locality-text" [style.color]="property.isGpsValid === false && property.gpsErrorReason ? '#a8523b' : ''">{{ property.locality }}, {{ property.city }}</span>
          @if (property.isGpsValid === false && property.gpsErrorReason) {
            <span class="pill-gps-error" title="GPS data is inaccurate or missing">GPS Inaccurate</span>
          }
          @if (property.distanceKm !== undefined && property.distanceKm !== null) {
            <span class="pill-distance">{{ property.distanceKm }} km away</span>
          }
        </p>

        <!-- Minimalist Action Buttons -->
        <div class="actions-row">
          <a 
            class="btn-action-primary"
            [routerLink]="['/property', property.id]"
            title="View property details dossier">
            <span>View Details</span>
          </a>

          @if (showCompare) {
          <button 
            type="button"
            class="btn-action-compare"
            [class.comparing]="compareService.isInCompare(property.id)"
            [title]="compareService.isInCompare(property.id) ? 'Remove from comparison' : 'Compare property (max 2)'"
            (click)="$event.stopPropagation(); compareService.toggleCompare(property)">
            <span class="material-symbols-outlined btn-icon">compare_arrows</span>
            <span class="btn-compare-txt">{{ compareService.isInCompare(property.id) ? 'In Compare' : 'Compare' }}</span>
          </button>
          }

          <a 
            class="btn-action-wa" 
            [href]="property.whatsappUrl || 'https://wa.me/919444100000'" 
            target="_blank" 
            rel="noopener"
            title="Chat on WhatsApp"
            aria-label="Chat on WhatsApp">
            <span class="material-symbols-outlined btn-icon">chat</span>
          </a>
        </div>
      </div>
    </article>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-width: 0;
      width: 100%;
    }

    :host,
    :host * {
      border-radius: 0 !important;
      box-shadow: none !important;
    }

    .property-card {
      background: #ffffff;
      border-radius: 0 !important;
      border: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
      box-shadow: none !important;
      transition: border-color 0.2s ease;
    }

    .property-card:hover {
      border-color: rgba(15, 59, 74, 0.3);
      box-shadow: none !important;
    }

    /* Media Frame - Strictly Uniform Height Across All Properties */
    .card-media {
      position: relative;
      width: 100%;
      height: 200px;
      min-height: 200px;
      max-height: 200px;
      flex-shrink: 0;
      overflow: hidden;
      background: #f1f5f9;
      cursor: pointer;
    }

    .card-img {
      width: 100%;
      height: 200px;
      min-height: 200px;
      max-height: 200px;
      object-fit: cover;
      object-position: center;
      display: block;
      transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .property-card:hover .card-img {
      transform: scale(1.03);
    }

    /* Minimalist Badges Overlay */
    .badge-gps-red {
      background: var(--brand-sold, #c76f56);
      color: #ffffff;
      font-size: 10.5px;
      font-weight: 700;
      padding: 3px 7px;
      border-radius: 0 !important;
      letter-spacing: 0.3px;
      display: inline-flex;
      align-items: center;
      box-shadow: none !important;
    }
    .badge-proximity {
      background: var(--brand-teal, #0f3b4a);
      color: #ffffff;
      font-size: 10.5px;
      font-weight: 700;
      padding: 3px 7px;
      border-radius: 0 !important;
      letter-spacing: 0.3px;
      display: inline-flex;
      align-items: center;
    }
    .pill-gps-error {
      background: #fbf0ee;
      color: var(--brand-sold, #c76f56);
      border: 1px solid rgba(199, 111, 86, 0.4);
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 0 !important;
      margin-left: 6px;
      display: inline-flex;
      align-items: center;
    }
    .pill-distance {
      background: #eef3f5;
      color: var(--brand-teal, #0f3b4a);
      border: 1px solid rgba(15, 59, 74, 0.25);
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 0 !important;
      margin-left: 6px;
      display: inline-flex;
      align-items: center;
    }
    .loc-icon.text-red {
      color: var(--brand-sold, #c76f56) !important;
    }
    .badge-closest-proximity {
      background: var(--brand-teal, #0f3b4a);
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      padding: 0.25rem 0.55rem;
      border-radius: 0 !important;
      letter-spacing: 0.02em;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      border: 1px solid rgba(255, 255, 255, 0.45);
      box-shadow: none !important;
      animation: pulseRadiusGlow 2.5s infinite ease-in-out;
    }
    .badge-closest-proximity .badge-icon {
      font-size: 13px;
      color: var(--brand-green, #5e8f72);
    }
    .pill-closest-proximity {
      background: #eef3f5;
      color: var(--brand-teal, #0f3b4a);
      border: 1px solid rgba(15, 59, 74, 0.25);
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 0 !important;
      margin-left: 6px;
      display: inline-flex;
      align-items: center;
      gap: 2px;
    }
    @keyframes pulseRadiusGlow {
      0%, 100% {
        box-shadow: none !important;
      }
      50% {
        box-shadow: none !important;
      }
    }
    .badges-overlay {
      position: absolute;
      top: 0.75rem;
      left: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.375rem;
      flex-wrap: wrap;
      max-width: calc(100% - 3.5rem);
      z-index: 2;
    }

    .badge-verified {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 0.25rem 0.55rem;
      border-radius: 0 !important;
      background: var(--brand-green);
      /* backdrop-filter: blur(6px); */
      color: #ffffff;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.02em;
      border: 1px solid var(--brand-green);
    }

    .badge-verified .badge-icon {
      font-size: 13px;
      color: #ffffff;
    }

    .badge-tour {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 0.25rem 0.55rem;
      border-radius: 0 !important;
      background: var(--brand-green, #5e8f72);
      backdrop-filter: blur(6px);
      color: #ffffff;
      font-size: 11px;
      font-weight: 600;
    }

    .badge-tour .badge-icon {
      font-size: 13px;
    }



    .badge-in-compare {
      background: var(--brand-teal, #0f3b4a);
      color: #ffffff;
      font-size: 10.5px;
      font-weight: 700;
      padding: 3px 7px;
      border-radius: 0 !important;
      letter-spacing: 0.3px;
      display: inline-flex;
      align-items: center;
      box-shadow: none !important;
    }

    .property-card.is-in-compare {
      border-color: var(--brand-teal, #0f3b4a);
      box-shadow: none !important;
    }

    /* Top Action Buttons (Compare & Shortlist) */
    .card-top-actions {
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.375rem;
      z-index: 2;
    }

    .btn-card-compare {
      width: 2.125rem;
      height: 2.125rem;
      border-radius: 0 !important;
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(4px);
      color: #64748b;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(0, 0, 0, 0.08);
      cursor: pointer;
      box-shadow: none !important;
      transition: all 0.15s ease;
    }

    .btn-card-compare:hover {
      background: #ffffff;
      color: var(--brand-teal, #0f3b4a);
      transform: scale(1.06);
    }

    .btn-card-compare.comparing {
      background: var(--brand-teal, #0f3b4a);
      color: #ffffff;
      border-color: var(--brand-teal, #0f3b4a);
      box-shadow: none !important;
    }

    .btn-card-compare span {
      font-size: 18px;
    }

    /* Shortlist Button */
    .btn-shortlist {
      position: relative;
      width: 2.125rem;
      height: 2.125rem;
      border-radius: 0 !important;
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(4px);
      color: #64748b;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(0, 0, 0, 0.06);
      cursor: pointer;
      box-shadow: none !important;
      transition: all 0.15s ease;
    }

    .btn-shortlist:hover {
      background: #ffffff;
      color: var(--brand-green, #5e8f72);
      transform: scale(1.06);
    }

    .btn-shortlist.shortlisted {
      color: var(--brand-green, #5e8f72);
      background: #ffffff;
    }

    .btn-shortlist span {
      font-size: 18px;
    }

    /* Card Content */
    .card-content {
      padding: 0.8rem 0.8rem;
      display: flex;
      flex-direction: column;
      flex: 1;
      gap: 0.55rem;
    }

    /* Price Row */
    .price-row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .main-price {
      font-size: 1.25rem;
      font-weight: 600;
      color: #0f172a;
      letter-spacing: -0.02em;
    }

    .unit-price {
      font-size: 12px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #64748b;
      font-weight: 500;
    }

    /* Title */
    .card-rera-row {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 10px;
      font-weight: 700;
      color: #0f3b4a;
      background: #f0fdf4;
      border: 1px solid #86efac;
      padding: 1px 6px;
      width: fit-content;
      letter-spacing: 0.03em;
    }

    .card-rera-icon {
      font-size: 12px;
      color: #5e8f72;
    }

    .card-rera-text {
      letter-spacing: 0.03em;
    }

    .property-title {
      font-size: 0.975rem;
      font-weight: 600;
      color: #0f172a;
      line-height: 1.45;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      margin: 0;
    }

    .card-builder-row {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11.5px;
      color: var(--brand-teal, #0f3b4a);
      background: #f8fafc;
      border: 1px solid #e0f2fe;
      border-radius: 0 !important;
      padding: 2px 6px;
      margin-top: 4px;
      margin-bottom: 4px;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .card-builder-row:hover {
      background: #eef3f5;
      border-color: #7dd3fc;
    }

    .card-builder-icon {
      font-size: 13px;
      flex-shrink: 0;
      color: var(--brand-teal, #0f3b4a);
    }

    .card-builder-text {
      font-weight: 600;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .title-link {
      color: inherit;
      text-decoration: none;
      transition: color 0.15s ease;
    }

    .property-card:hover .title-link,
    .title-link:hover {
      color: var(--brand-green, #5e8f72);
    }

    /* Locality */
    .locality-row {
      color: #64748b;
      font-size: 12.5px;
      font-weight: 400;
      display: flex;
      align-items: center;
      gap: 4px;
      margin: 0;
    }

    .loc-icon {
      font-size: 15px;
      color: #94a3b8;
      flex-shrink: 0;
    }

    .locality-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Minimalist Inline Specs */
    .specs-inline {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.625rem 0;
      border-top: 1px solid #f1f5f9;
      border-bottom: 1px solid #f1f5f9;
      font-size: 12px;
      color: #475569;
      white-space: nowrap;
      overflow: hidden;
    }

    .spec-item {
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .spec-dot {
      color: #cbd5e1;
      font-weight: 600;
    }

    /* Action Buttons Row */
    .actions-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: auto;
      padding-top: 0.25rem;
    }

    .btn-action-primary {
      flex: 1;
      height: 38px;
      border-radius: 0 !important;
      background: white;
      color: var(--brand-teal, #0f3b4a);
      font-size: 12.5px;
      font-weight: 600;
      border: 2px solid var(--brand-teal, #0f3b4a);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-action-primary:hover {
      /* background: var(--brand-teal-hover, #144f63); */
      border-color: var(--brand-teal-hover, #144f63);
    }

    .btn-action-primary .btn-icon {
      font-size: 16px;
    }

    .btn-action-wa {
      width: 38px;
      height: 38px;
      border-radius: 0 !important;
      background: #ffffff;
      color: var(--brand-green, #5e8f72);
      border: 1px solid #e2e8f0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
      cursor: pointer;
      box-shadow: none !important;
      flex-shrink: 0;
      transition: all 0.15s ease;
    }

    .btn-action-wa:hover {
      background: #eef5f1;
      border-color: var(--brand-green, #5e8f72);
      color: var(--brand-green, #5e8f72);
    }

    .btn-action-wa .btn-icon {
      font-size: 18px;
    }

    .btn-action-compare {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 0 10px;
      height: 38px;
      border-radius: 0 !important;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      color: #475569;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }

    .btn-action-compare:hover {
      border-color: var(--brand-teal, #0f3b4a);
      color: var(--brand-teal, #0f3b4a);
      background: #f8fafc;
    }

    .btn-action-compare.comparing {
      background: #eef3f5;
      border-color: var(--brand-teal, #0f3b4a);
      color: var(--brand-teal, #0f3b4a);
      font-weight: 700;
    }

    .btn-action-compare .btn-icon {
      font-size: 16px;
    }

    @media (max-width: 640px) {
      .card-content {
        padding: 0.875rem;
        gap: 0.5rem;
      }
      .main-price {
        font-size: 1.25rem;
      }
      .property-title {
        min-height: auto;
        font-size: 0.95rem;
      }
      .btn-action-primary {
        height: 42px;
        font-size: 13px;
      }
      .btn-action-compare {
        height: 42px;
        padding: 0 8px;
      }
      .btn-action-wa {
        height: 42px;
        width: 42px;
      }
      .specs-inline {
        white-space: normal;
        flex-wrap: wrap;
        gap: 3px 6px;
      }
    }
  `]
})
export class PropertyCardComponent {
  get reraDisplayName(): string {
    return this.property?.badges?.rera || 
           this.property?.masterDetails?.reraNumber || 
           (this.property as any)?.reraNumber || 
           '';
  }


  get developerDisplayName(): string {
    const raw = this.property?.developerName || 
                this.property?.masterDetails?.developer || 
                this.property?.developer?.name || 
                (this.property as any)?.developer_name ||
                (this.property as any)?.promoterName || 
                (this.property as any)?.submittedByName ||
                (this.property as any)?.builder ||
                '';
    const clean = raw ? raw.replace(/â\x80\x93|â\x80\x94|â/g, '–').trim() : '';
    if (clean) return clean;
    if (this.property?.title?.toLowerCase().includes('cadastral') || this.property?.title?.toLowerCase().includes('layout')) {
      return 'Executive Engineer – Tamil Nadu Housing Board';
    }
    return 'Tamil Nadu Housing Board';
  }

  @Input({ required: true }) property!: Property;
  @Input() showCompare: boolean = false;
  readonly formatPriceIndian = formatPriceIndian;
  readonly propertyService = inject(PropertyService);
  readonly authService = inject(AuthService);
  readonly userBehaviorService = inject(UserBehaviorService);
  readonly compareService = inject(CompareService);

  onCardClick(): void {
    if (this.property) {
      this.userBehaviorService.trackPropertyView(this.property, 'view');
    }
  }

  getCardHighlights(): string[] {
    if (this.property.highlights && this.property.highlights.length > 0) {
      return this.property.highlights.slice(0, 2);
    }
    return [
      this.property.badges.brokerage || 'Direct Owner SRO Deed',
      this.property.badges.specialTag || 'Clear 30-Year Encumbrance Nil Title'
    ];
  }

  onImgError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target && !target.src.includes('property-placeholder.svg')) {
      target.src = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80';
    }
  }
}
