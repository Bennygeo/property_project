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
        <!-- Top Left Badges: RERA Approved & No Brokerage -->
        <div class="card-top-left-badges">
          @if (isReraRegistered) {
            <img 
              src="assets/badge/rera_approved_60x60.png" 
              alt="RERA Approved" 
              class="card-badge-rera" 
              [title]="reraDisplayName ? 'RERA Approved: ' + reraDisplayName : 'RERA Approved Layout'"
              loading="lazy">
          }

          <img 
            src="assets/badge/no-brokerage.png" 
            alt="0% Brokerage" 
            class="card-badge-no-brokerage" 
            title="0% Brokerage"
            loading="lazy">
        </div>

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



          @if (property.isMediaUnlocked) {
            <span class="badge-tour">
              <span>4K Unlocked</span>
            </span>
          }
        </div>

        <!-- Top Action Buttons (WhatsApp Message & Shortlist) -->
        <div class="card-top-actions">
          <a 
            class="btn-card-wa" 
            [href]="property.whatsappUrl || 'https://wa.me/919444100000'" 
            target="_blank" 
            rel="noopener"
            (click)="$event.stopPropagation()"
            title="Message on WhatsApp"
            aria-label="Message on WhatsApp">
            <span class="material-symbols-outlined">chat</span>
          </a>

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

          </a>
        }

        <!-- Address of the Plot -->
        <p class="plot-address-row" [title]="plotAddress">
          <span class="material-symbols-outlined loc-icon">place</span>
          <span class="plot-address-text">{{ plotAddress }}</span>
        </p>


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
      border-radius: 6px 20px 20px 20px !important;
      border: 1px solid #eeeeee;
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
      box-shadow: none !important;
      cursor: pointer;
      transition: border-color 0.2s ease;
    }

    .property-card:hover {
      border-color: rgba(15, 59, 74, 0.3);
    }

    /* Media Frame - 3px Top Radius */
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
      border-radius: 6px 20px 0 0 !important;
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
      border-radius: 6px 20px 0 0 !important;
    }

    .property-card:hover .card-img {
      transform: scale(1.03);
    }

    /* Top Left Badges: RERA Approved & No Brokerage */
    .card-top-left-badges {
      position: absolute;
      top: 0.65rem;
      left: 0.65rem;
      display: flex;
      align-items: center;
      gap: 0.45rem;
      z-index: 3;
    }

    .card-badge-rera {
      width: 52px;
      height: 52px;
      object-fit: contain;
      background: rgba(255, 255, 255, 0.6);
      border-radius: 0;
      padding: 3px;
      box-sizing: border-box;
      transition: transform 0.15s ease;
      cursor: pointer;
      display: block;
    }


    .card-badge-no-brokerage {
        height: 52px;
        width: auto;
        /* max-width: 85px; */
        object-fit: contain;
        /* filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.45)); */
        transition: transform 0.15s ease;
        cursor: pointer;
        display: block;
        background: #ffffff77;
        padding: 3px;
    }
    /* Badges Overlay (Bottom-left of image) */
    .badges-overlay {
      position: absolute;
      bottom: 0.75rem;
      left: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.375rem;
      flex-wrap: wrap;
      max-width: calc(100% - 1.5rem);
      z-index: 2;
    }

    .badge-in-compare {
      background: var(--brand-teal, #0f3b4a);
      color: #ffffff;
      font-size: 11px;
      font-weight: 600;
      padding: 3px 7px;
      border-radius: 3px;
      display: inline-flex;
      align-items: center;
    }

    .badge-verified {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 7px;
      border-radius: 3px;
      background: var(--brand-green, #5e8f72);
      color: #ffffff;
      font-size: 11px;
      font-weight: 600;
    }

    .badge-tour {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 7px;
      border-radius: 3px;
      background: var(--brand-green, #5e8f72);
      color: #ffffff;
      font-size: 11px;
      font-weight: 600;
    }

    /* Top Action Buttons - Transparent, Zero Box */
    .card-top-actions {
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.45rem;
      z-index: 2;
    }

    .btn-card-wa {
      width: 2rem;
      height: 2rem;
      background: transparent;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      cursor: pointer;
      box-shadow: none;
      /* filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.7)); */
      transition: transform 0.05s ease, color 0.05s ease;
      text-decoration: none;
    }

    .btn-card-wa:hover {
      transform: scale(1.15);
      color: #25d366;
    }

    .btn-card-wa span {
      font-size: 21px;
    }

    .btn-shortlist {
      position: relative;
      width: 2rem;
      height: 2rem;
      background: transparent;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      cursor: pointer;
      box-shadow: none;
      /* filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.7)); */
      transition: transform 0.01s ease;
    }

    .btn-shortlist:hover {
      transform: scale(1.15);
      color: #ffffff;
    }

    .btn-shortlist.shortlisted {
      color: #ef4444;
    }

    .btn-shortlist span {
      font-size: 24px;
    }

    .btn-card-compare {
      width: 2rem;
      height: 2rem;
      background: transparent;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      cursor: pointer;
      box-shadow: none;
      filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.7));
      transition: transform 0.15s ease;
    }

    .btn-card-compare:hover {
      transform: scale(1.15);
    }

    .btn-card-compare.comparing {
      color: #38bdf8;
    }

    .btn-card-compare span {
      font-size: 22px;
    }

    /* Card Content - Clean, Zero Inner Boxes, Uniform 14px Font Size */
    .card-content {
      padding: 0.85rem;
      display: flex;
      flex-direction: column;
      flex: 1;
      gap: 0.45rem;
      font-size: 14px;
      line-height: 1.4;
    }

    /* RERA Row - Clean Text, Zero Inner Box */
    .card-rera-row {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 14px;
      font-weight: 400;
      color: #047857;
      background: none !important;
      border: none !important;
      padding: 0 !important;
      margin: 0;
      width: fit-content;
    }

    .card-rera-icon {
      font-size: 16px;
      color: #059669;
    }

    .card-rera-text {
      font-size: 13px;
      font-weight: 400;
      letter-spacing: 0.02em;
    }

    /* Title - Bold Property Name, 14px Font Size */
    .property-title {
      font-size: 13px;
      font-weight: 600;
      color: #0f172a;
      line-height: 1.35;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      margin: 0;
    }

    .title-link {
      font-size: 13px;
      font-weight: 500;
      color: inherit;
      text-decoration: none;
      transition: color 0.15s ease;
    }

    .property-card:hover .title-link,
    .title-link:hover {
      color: var(--brand-green, #5e8f72);
    }

    /* Price Row - Bold Price, 14px Font Size */
    .price-row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 0.5rem;
      margin: 0;
    }

    .main-price {
      font-size: 13px;
      font-weight: 500;
      color: #0f172a;
    }

    .unit-price {
      font-size: 14px;
      font-weight: 500;
      color: #484d53ff;
    }

    /* Builder Row - Clean Text, Zero Inner Box, 14px Font Size */
    .card-builder-row {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 14px;
      font-weight: 400;
      color: #64748b;
      background: none !important;
      border: none !important;
      padding: 0 !important;
      margin: 0;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      text-decoration: none;
      cursor: pointer;
    }

    .card-builder-icon {
      font-size: 16px;
      flex-shrink: 0;
      color: #64748b;
    }

    .card-builder-text {
      font-size: 14px;
      font-weight: 400;
      color: #64748b;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    /* Plot Address Row - Clean Text, Zero Inner Box, 14px Font Size */
    .plot-address-row,
    .locality-row {
      color: #64748b;
      font-size: 14px;
      font-weight: 400;
      display: flex;
      align-items: center;
      gap: 5px;
      margin: 0;
      overflow: hidden;
    }

    .loc-icon {
      font-size: 16px;
      color: #94a3b8;
      flex-shrink: 0;
    }

    .plot-address-text,
    .locality-text {
      font-size: 12px;
      font-weight: 400;
      color: #64748b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `]
})
export class PropertyCardComponent {
  get plotAddress(): string {
    const p = this.property;
    if (!p) return '';

    // Check if backend already sent a pre-computed plotAddress
    if ((p as any).plotAddress && !['1, 1', '1', ''].includes(String((p as any).plotAddress).trim())) {
      return (p as any).plotAddress;
    }

    const m = p.masterDetails;

    // 1. Extract Plot No
    let plotNo = (m?.plotNo || (p as any).plotNo || '').trim();
    if (!plotNo || plotNo === '1') {
      if (p.title) {
        const match = p.title.match(/Plot\s*(?:No\.?|Number|#)?\s*([A-Za-z0-9\/-]+)/i);
        if (match) {
          plotNo = match[1].trim();
        }
      }
    }

    // 2. Extract Project / Layout Name
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
      if (s.toLowerCase().includes('facing')) return false;
      return true;
    };

    // 3. Locality / Village (Priority: locality_name from DB)
    const village = [(p as any).locality_name, p.locality, m?.villageLocality, p.villageLocality, (p as any).areaLocation]
      .find(v => isValidLoc(v));

    // 4. Taluk
    const taluk = [m?.taluk, p.taluk]
      .find(t => isValidLoc(t));

    // 5. District / City (Priority: city_name from DB)
    let district = [(p as any).city_name, p.city, m?.district, p.district]
      .find(d => isValidLoc(d));

    // 6. Pincode
    const rawPin = String(m?.pincode || p.pincode || '').trim();
    const pin = /^\d{6}$/.test(rawPin) ? rawPin : '';

    const parts: string[] = [];
    if (plotNo) {
      parts.push(`Plot ${plotNo}`);
    }
    if (projectName && !parts.includes(projectName)) {
      parts.push(projectName);
    }
    if (village && !parts.some(x => x.toLowerCase() === village.toLowerCase())) {
      parts.push(village);
    }
    if (taluk && !parts.some(x => x.toLowerCase() === taluk.toLowerCase()) && taluk !== village) {
      parts.push(taluk);
    }
    if (district && !parts.some(x => x.toLowerCase() === district.toLowerCase())) {
      parts.push(district);
    } else if (!district && (!village || village.toLowerCase() !== 'chennai')) {
      parts.push('Chennai');
    }
    if (pin && parts.length > 0) {
      parts[parts.length - 1] = `${parts[parts.length - 1]} - ${pin}`;
    }

    return parts.length > 0 ? parts.join(', ') : 'Chennai, Tamil Nadu';
  }

  get reraDisplayName(): string {
    return this.property?.badges?.rera ||
      this.property?.masterDetails?.reraNumber ||
      (this.property as any)?.reraNumber ||
      '';
  }

  get isReraRegistered(): boolean {
    const r = this.reraDisplayName;
    if (!r) return true;
    const lower = r.toLowerCase().trim();
    return !['no', 'none', 'false', '0', 'unapproved'].includes(lower);
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
    const clean = raw ? raw.replace(/[–—]/g, '-').trim() : '';
    if (clean && clean.toLowerCase() !== 'null' && clean.toLowerCase() !== 'undefined' && clean.toLowerCase() !== 'none') {
      return clean;
    }
    return '';
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
