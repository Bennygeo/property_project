import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Property } from '../../../../core/models/property.model';
import { PropertyService } from '../../../../core/services/property.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UserBehaviorService } from '../../../../core/services/user-behavior.service';

@Component({
  selector: 'app-property-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <article class="property-card" (click)="onCardClick()">
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
          <span class="badge-verified">
            <span>{{ property.badges.specialTag || property.badges.rera || 'Verified' }}</span>
          </span>

          @if (property.isMediaUnlocked) {
            <span class="badge-tour">
              <span>4K Unlocked</span>
            </span>
          }

          @if (property.interactiveMapUrl || property.propertyType === 'Gated CMDA Plots') {
            <span class="badge-3dmap">
              <span class="material-symbols-outlined badge-icon">view_in_ar</span>
              <span>3D Map</span>
            </span>
          }
        </div>

        <!-- Shortlist Heart Button -->
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

      <!-- Card Content -->
      <div class="card-content">
        <!-- Price Row -->
        <div class="price-row">
          <span class="main-price">{{ property.price }}</span>
          <span class="unit-price">{{ property.pricePerSqFt }}</span>
        </div>

        <!-- Title -->
        <h3 class="property-title" [title]="property.title">
          <a [routerLink]="['/property', property.id]" class="title-link">{{ property.title }}</a>
        </h3>

        <!-- Locality -->
        <p class="locality-row" [title]="property.locality + ', ' + property.city">
          <span class="material-symbols-outlined loc-icon">location_on</span>
          <span class="locality-text">{{ property.locality }}, {{ property.city }}</span>
        </p>

        <!-- Minimalist Inline Specifications Strip -->
        <div class="specs-inline">
          <span class="spec-item">{{ property.bhkBadge }}</span>
          <span class="spec-dot">·</span>
          <span class="spec-item">{{ property.sqft }}</span>
          <span class="spec-dot">·</span>
          <span class="spec-item">{{ property.facingOrView }}</span>
        </div>

        <!-- Minimalist Action Buttons -->
        <div class="actions-row">
          <button 
            type="button" 
            class="btn-action-primary"
            (click)="propertyService.openMediaModal(property, property.isMediaUnlocked ? 'premium' : 'free')">
            @if (property.isMediaUnlocked) {
              <span class="material-symbols-outlined btn-icon">smart_display</span>
            }
            <span>{{ property.isMediaUnlocked ? 'Watch 4K Tour' : 'View Details' }}</span>
          </button>

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

    .property-card {
      background: #ffffff;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
      box-shadow: none;
      transition: border-color 0.2s ease;
    }

    .property-card:hover {
      border-color: rgba(15, 59, 74, 0.3);
      box-shadow: none;
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
    .badges-overlay {
      position: absolute;
      top: 0.75rem;
      left: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.375rem;
      z-index: 2;
    }

    .badge-verified {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 0.25rem 0.55rem;
      border-radius: 6px;
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
      color: #34d399;
    }

    .badge-tour {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 0.25rem 0.55rem;
      border-radius: 6px;
      background: rgba(16, 185, 129, 0.9);
      backdrop-filter: blur(6px);
      color: #ffffff;
      font-size: 11px;
      font-weight: 600;
    }

    .badge-tour .badge-icon {
      font-size: 13px;
    }

    .badge-3dmap {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 0.25rem 0.55rem;
      border-radius: 6px;
      background: rgba(14, 165, 233, 0.95);
      backdrop-filter: blur(6px);
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      box-shadow: 0 2px 6px rgba(14, 165, 233, 0.35);
    }

    .badge-3dmap .badge-icon {
      font-size: 13px;
    }

    /* Shortlist Button */
    .btn-shortlist {
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
      width: 2.125rem;
      height: 2.125rem;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(4px);
      color: #64748b;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(0, 0, 0, 0.06);
      cursor: pointer;
      box-shadow: none;
      transition: all 0.15s ease;
      z-index: 2;
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
      padding: 1rem 1.125rem;
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
    .property-title {
      font-size: 0.975rem;
      font-weight: 600;
      color: #0f172a;
      line-height: 1.45;
      min-height: 2.85rem;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      margin: 0;
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
      border-radius: 8px;
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
      border-radius: 8px;
      background: #ffffff;
      color: #059669;
      border: 1px solid #e2e8f0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
      cursor: pointer;
      box-shadow: none;
      flex-shrink: 0;
      transition: all 0.15s ease;
    }

    .btn-action-wa:hover {
      background: #f0fdf4;
      border-color: #86efac;
      color: #047857;
    }

    .btn-action-wa .btn-icon {
      font-size: 18px;
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
  @Input({ required: true }) property!: Property;
  readonly propertyService = inject(PropertyService);
  readonly authService = inject(AuthService);
  readonly userBehaviorService = inject(UserBehaviorService);

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
      target.src = 'property-placeholder.svg';
    }
  }
}
