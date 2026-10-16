import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Property } from '../../../../core/models/property.model';
import { PropertyService } from '../../../../core/services/property.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-property-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <article class="property-card group">
      <!-- Media Frame (Links to Details) -->
      <div class="card-media" [routerLink]="['/property', property.id]">
        <img 
          [src]="property.imageUrl" 
          [alt]="property.title" 
          (error)="onImgError($event)"
          class="card-img">

        <!-- Top Badges Group -->
        <div class="badges-overlay">
          <span class="badge-rera">
            <span class="material-symbols-outlined">check_circle</span>
            {{ property.badges.rera }}
          </span>

          <span class="badge-tag" [class.special-tag]="property.badges.specialTag">
            {{ property.badges.specialTag || property.badges.brokerage }}
          </span>

          <span 
            class="badge-pts" 
            [class.media-unlocked]="property.isMediaUnlocked"
            [routerLink]="property.isMediaUnlocked ? null : '/wallet'"
            (click)="!property.isMediaUnlocked ? $event.stopPropagation() : null"
            [title]="property.isMediaUnlocked ? '4K Media Unlocked' : 'Requires ' + property.mediaPoints + ' Media Points. Click to open Wallet.'">
            <span class="material-symbols-outlined">{{ property.isMediaUnlocked ? 'smart_display' : 'toll' }}</span>
            {{ property.isMediaUnlocked ? '4K Unlocked' : property.mediaPoints + ' Pts 4K' }}
          </span>

          @if (!authService.canViewProperty(property.id)) {
            <span class="badge-guest-locked">
              <span class="material-symbols-outlined">lock</span>
              Sign In to View
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

        <!-- Bottom Dimension Banner -->
        <div class="dimension-banner">
          {{ property.bhkBadge }} • {{ property.sqft }}
        </div>
      </div>

      <!-- Card Content -->
      <div class="card-content">
        <div class="card-info">
          <!-- Price Row -->
          <div class="price-row">
            <div class="main-price">{{ property.price }}</div>
            <div class="unit-price">{{ property.pricePerSqFt }}</div>
          </div>

          <h3 class="property-title" [title]="property.title">
            <a [routerLink]="['/property', property.id]" class="title-link">{{ property.title }}</a>
          </h3>

          <p class="locality-row" [title]="property.locality + ', ' + property.city">
            <span class="material-symbols-outlined text-red">location_on</span>
            <span class="locality-text">{{ property.locality }}, {{ property.city }}</span>
          </p>
        </div>

        <!-- Structured Specifications Strip -->
        <div class="specs-pills-row">
          <div class="spec-pill" [title]="'Configuration: ' + property.bhkBadge">
            <span class="material-symbols-outlined spec-icon">bed</span>
            <span class="spec-val">{{ property.bhkBadge }}</span>
          </div>
          <div class="spec-pill" [title]="'Carpet/Super Area: ' + property.sqft">
            <span class="material-symbols-outlined spec-icon">square_foot</span>
            <span class="spec-val">{{ property.sqft }}</span>
          </div>
          <div class="spec-pill" [title]="'Orientation/View: ' + property.facingOrView">
            <span class="material-symbols-outlined spec-icon">explore</span>
            <span class="spec-val">{{ property.facingOrView }}</span>
          </div>
        </div>

        <!-- Curated Highlights / Description Box -->
        <div class="highlights-box">
          @for (item of getCardHighlights(); track $index) {
            <div class="highlight-item" [title]="item">
              <span class="material-symbols-outlined hl-check">verified</span>
              <span class="hl-desc">{{ item }}</span>
            </div>
          }
        </div>

        <!-- Action Buttons Grid -->
        <div class="actions-grid">
          <a 
            class="btn-card-wa" 
            [href]="property.whatsappUrl || 'https://wa.me/919444100000'" 
            target="_blank" 
            rel="noopener">
            <span class="material-symbols-outlined">chat</span>
            <span>Concierge</span>
          </a>

          <button 
            type="button" 
            class="btn-card-media" 
            [class.unlocked]="property.isMediaUnlocked"
            (click)="propertyService.openMediaModal(property, property.isMediaUnlocked ? 'premium' : 'free')">
            <span class="material-symbols-outlined">{{ property.isMediaUnlocked ? 'smart_display' : 'photo_library' }}</span>
            <span>{{ property.isMediaUnlocked ? 'Watch 4K Tour' : 'Photos & 4K Video' }}</span>
          </button>
        </div>
      </div>
    </article>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .property-card {
      background: #ffffff;
      border-radius: 1rem;
      border: 1px solid var(--hairline-border);
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .property-card:hover {
      border-color: #94a3b8;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
      transform: translateY(-4px);
    }
    .card-media {
      position: relative;
      width: 100%;
      aspect-ratio: 16 / 10;
      overflow: hidden;
      background: #f1f5f9;
      cursor: pointer;
    }
    .card-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .property-card:hover .card-img {
      transform: scale(1.05);
    }
    .badges-overlay {
      position: absolute;
      top: 0.75rem;
      left: 0.75rem;
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
      z-index: 2;
    }
    .badge-rera {
      padding: 0.125rem 0.5rem;
      border-radius: 4px;
      background: #059669;
      color: #ffffff;
      font-weight: 700;
      font-size: 10px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 3px;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.1);
    }
    .badge-rera span {
      font-size: 13px;
    }
    .badge-tag {
      padding: 0.125rem 0.5rem;
      border-radius: 4px;
      background: rgba(15, 23, 42, 0.9);
      color: #ffffff;
      font-weight: 700;
      font-size: 10px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.1);
    }
    .special-tag {
      background: var(--brand-red);
    }
    .badge-pts {
      padding: 0.125rem 0.5rem;
      border-radius: 4px;
      background: #f59e0b;
      color: #020617;
      font-weight: 900;
      font-size: 10px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 3px;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.1);
    }
    .badge-pts span {
      font-size: 12px;
    }
    .badge-pts.media-unlocked {
      background: rgba(16, 185, 129, 0.9);
      color: #ffffff;
      border-color: rgba(16, 185, 129, 0.4);
    }
    .btn-shortlist {
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.9);
      color: var(--text-slate-700);
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      transition: all 0.15s;
      z-index: 2;
    }
    .btn-shortlist:hover {
      background: #ffffff;
      color: var(--brand-red);
      transform: scale(1.08);
    }
    .btn-shortlist.shortlisted {
      color: var(--brand-red);
      background: #ffffff;
    }
    .btn-shortlist span {
      font-size: 19px;
    }
    .dimension-banner {
      position: absolute;
      bottom: 0.75rem;
      left: 0.75rem;
      background: rgba(2, 6, 23, 0.85);
      backdrop-filter: blur(4px);
      color: #ffffff;
      padding: 0.25rem 0.625rem;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      font-family: ui-monospace, monospace;
      z-index: 2;
      max-width: calc(100% - 1.5rem);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .card-content {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      flex: 1;
      gap: 0.875rem;
    }
    .card-info {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .price-row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: 0.125rem;
    }
    .main-price {
      font-size: 1.5rem;
      font-weight: 900;
      color: var(--text-slate-950);
      letter-spacing: -0.02em;
    }
    .unit-price {
      font-size: 12px;
      font-family: ui-monospace, monospace;
      color: var(--text-slate-500);
      font-weight: 600;
    }
    .property-title {
      font-size: 1.0625rem;
      font-weight: 700;
      color: var(--text-slate-950);
      line-height: 1.4;
      min-height: 2.95rem; /* Standardizes exactly 2 lines across all cards */
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      margin: 0;
    }
    .title-link {
      color: inherit;
      text-decoration: none;
      display: block;
      transition: color 0.15s;
    }
    .property-card:hover .title-link, .title-link:hover {
      color: var(--brand-red);
    }
    .locality-row {
      color: var(--text-slate-600);
      font-size: 12px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 4px;
      margin: 0;
    }
    .locality-row span.material-symbols-outlined {
      font-size: 16px;
      flex-shrink: 0;
    }
    .locality-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .text-red {
      color: var(--brand-red);
    }

    /* Structured 3-Column Specifications Strip */
    .specs-pills-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.375rem;
      padding: 0.5rem 0.625rem;
      background: #f8fafc;
      border-radius: 0.5rem;
      border: 1px solid #e2e8f0;
    }
    .spec-pill {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-slate-700);
      min-width: 0;
    }
    .spec-icon {
      font-size: 15px;
      color: var(--text-slate-400);
      flex-shrink: 0;
    }
    .spec-val {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Curated Highlights / Item Description Box */
    .highlights-box {
      min-height: 2.85rem;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 0.375rem;
      padding-top: 0.375rem;
      border-top: 1px solid #f1f5f9;
    }
    .highlight-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--text-slate-600);
      line-height: 1.35;
      min-width: 0;
    }
    .hl-check {
      font-size: 15px;
      color: #059669;
      flex-shrink: 0;
    }
    .hl-desc {
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
      font-weight: 500;
    }

    /* Action Buttons Row */
    .actions-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
      margin-top: auto; /* Pins action buttons to the exact same vertical baseline */
      padding-top: 0.375rem;
    }
    .btn-card-wa {
      height: 40px;
      border-radius: 0.75rem;
      background: #ecfdf5;
      color: #065f46;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      text-decoration: none;
      border: 1px solid #a7f3d0;
      transition: background 0.15s;
    }
    .btn-card-wa:hover {
      background: #d1fae5;
    }
    .btn-card-wa span.material-symbols-outlined {
      font-size: 16px;
    }
    .btn-card-media {
      height: 40px;
      border-radius: 0.75rem;
      background: #020617;
      color: #fbbf24;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      border: 1px solid #1e293b;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-card-media:hover {
      background: #0f172a;
      transform: translateY(-1px);
    }
    .btn-card-media.unlocked {
      background: #065f46;
      color: #ffffff;
      border-color: #065f46;
    }
    .btn-card-media span.material-symbols-outlined {
      font-size: 16px;
    }
    .badge-guest-locked {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      background: linear-gradient(135deg, #78350f 0%, #451a03 100%);
      color: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    }
    .badge-guest-locked span.material-symbols-outlined {
      font-size: 12px;
      color: #fbbf24;
    }
  `]
})
export class PropertyCardComponent {
  @Input({ required: true }) property!: Property;
  readonly propertyService = inject(PropertyService);
  readonly authService = inject(AuthService);

  getCardHighlights(): string[] {
    if (this.property.highlights && this.property.highlights.length > 0) {
      return this.property.highlights.slice(0, 2);
    }
    return [
      this.property.badges.brokerage || '0% Direct Owner SRO Deed',
      this.property.badges.specialTag || 'Clear 30-Year Encumbrance Nil Title'
    ];
  }

  onImgError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target && !target.src.includes('property-placeholder.svg')) {
      target.src = '/property-placeholder.svg';
    }
  }
}
