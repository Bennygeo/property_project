import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PropertyService } from '../../../../core/services/property.service';
import { Property } from '../../../../core/models/property.model';

@Component({
  selector: 'app-new-launches-spotlight',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="max-w-content deals-section" id="exclusive-deals">
      
      <!-- Top Section Header -->
      <div class="deals-header">
        <div class="deals-badge-pill">
          <span class="live-dot"></span>
          <span>CURATED DIRECT SELLER MANDATES</span>
        </div>
        <h2 class="deals-heading">Immediate Selling &amp; Below-Market Price Deals</h2>
        <p class="deals-subtext">
          Direct distress sales and high-urgency owner liquidations. 100% title audited with verified SRO records, offering 15% to 28% instant equity below prevailing locality market rates.
        </p>
      </div>

      <!-- Dual Showcase Cards Grid -->
      <div class="deals-grid">
        
        <!-- CARD 1: Immediate Selling Offer -->
        <article class="deal-card deal-urgent">
          <!-- Top Urgency Ribbon -->
          <div class="card-ribbon ribbon-urgent">
            <div class="ribbon-left">
              <span class="material-symbols-outlined ribbon-icon">electric_bolt</span>
              <strong>IMMEDIATE SELLING OFFER</strong>
            </div>
            <span class="ribbon-tag">Relocating Owner • 48-Hr Registration SLA</span>
          </div>

          <!-- Property Media Frame -->
          <div class="card-media-wrap">
            <img 
              src="https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80" 
              (error)="onImgError($event)"
              alt="The Azure Horizon Beach Villa — Immediate Sale" 
              class="deal-img"
              loading="lazy"
              decoding="async">
            <div class="media-overlay-chips">
              <span class="chip-glass chip-hot">
                <span class="material-symbols-outlined icon-chip">local_fire_department</span>
                48-Hour Fast Close
              </span>
              <span class="chip-glass chip-verified">
                <span class="material-symbols-outlined icon-chip">verified</span>
                Nil-Encumbrance 2026
              </span>
            </div>
            <div class="media-bottom-badge">
              <span class="material-symbols-outlined icon-cam">videocam</span>
              <span>Drone Surveyed • 4K Tour Available</span>
            </div>
          </div>

          <!-- Deal Content -->
          <div class="deal-body">
            <div class="deal-category-row">
              <span class="badge-cat">Beachside Villa Mandate</span>
              <span class="badge-rera">TN/RERA/0894/2024</span>
              <span class="badge-status">Immediate Handover</span>
            </div>

            <h3 class="deal-title">The Azure Horizon Luxury Villa — ECR Golden Beach</h3>
            <p class="deal-specs-line">
              <span class="material-symbols-outlined spec-icon">holiday_village</span>
              <span>4 BHK Triplex • 3,650 sq.ft • Private Plunge Pool &amp; Sea Terrace</span>
            </p>

            <p class="deal-narrative">
              Seller relocating overseas by month-end. Fully furnished luxury villa with Italian marble, German fixtures, and clean patta. Ready for instant registration with all legal dues cleared.
            </p>

            <!-- Price Analysis Matrix -->
            <div class="price-matrix">
              <div class="price-col">
                <span class="label-struck">Regular Valuation</span>
                <span class="val-struck">₹2.65 Cr</span>
              </div>
              <div class="price-arrow">&rarr;</div>
              <div class="price-col primary-price">
                <span class="label-urgent">Immediate Selling Price</span>
                <span class="val-urgent">₹1.95 Cr</span>
              </div>
              <div class="savings-badge">
                <span class="savings-pct">SAVE ₹70 LAKHS</span>
                <span class="savings-sub">26% Below Market</span>
              </div>
            </div>

            <!-- Metric Highlights -->
            <div class="metrics-row">
              <span class="metric-pill">₹5,340/sq.ft (Market: ₹7,260)</span>
              <span class="metric-pill">Ready to Occupy</span>
              <span class="metric-pill highlight-pill">0% Brokerage</span>
            </div>

            <!-- Call to Actions -->
            <div class="deal-actions">
              <a 
                class="btn-deal-wa" 
                href="https://wa.me/919444100000?text=I%20am%20interested%20in%20the%20Immediate%20Selling%20Offer%20for%20The%20Azure%20Horizon%20Villa%20(₹1.95%20Cr)" 
                target="_blank" 
                rel="noopener">
                <span class="material-symbols-outlined">chat</span>
                <span>WhatsApp Seller Desk</span>
              </a>

              <button 
                class="btn-deal-tour" 
                type="button" 
                (click)="viewPropertyMedia(immediateSaleProperty)">
                <span class="material-symbols-outlined">smart_display</span>
                <span>4K Video Tour (3 Pts)</span>
              </button>
            </div>
          </div>
        </article>

        <!-- CARD 2: Lesser Than Market Price -->
        <article class="deal-card deal-discount">
          <!-- Top Discount Ribbon -->
          <div class="card-ribbon ribbon-discount">
            <div class="ribbon-left">
              <span class="material-symbols-outlined ribbon-icon">trending_down</span>
              <strong>LESSER THAN MARKET PRICE</strong>
            </div>
            <span class="ribbon-tag">24% Below Guidance Value • High Rental Yield</span>
          </div>

          <!-- Property Media Frame -->
          <div class="card-media-wrap">
            <img 
              src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80" 
              (error)="onImgError($event)"
              alt="The Pinnacle Sky Residences — Below Market Deal" 
              class="deal-img"
              loading="lazy"
              decoding="async">
            <div class="media-overlay-chips">
              <span class="chip-glass chip-emerald">
                <span class="material-symbols-outlined icon-chip">arrow_downward</span>
                ₹2,200/sq.ft Below Locality Avg
              </span>
              <span class="chip-glass chip-blue">
                <span class="material-symbols-outlined icon-chip">percent</span>
                7.2% Annual Yield
              </span>
            </div>
            <div class="media-bottom-badge">
              <span class="material-symbols-outlined icon-cam">videocam</span>
              <span>Architectural 4K Walkthrough Active</span>
            </div>
          </div>

          <!-- Deal Content -->
          <div class="deal-body">
            <div class="deal-category-row">
              <span class="badge-cat">Pre-Leased Tech Penthouse</span>
              <span class="badge-rera">TN/RERA/1429/2024</span>
              <span class="badge-status-green">Instant Equity</span>
            </div>

            <h3 class="deal-title">The Pinnacle Sky Suite — OMR Tech Expressway</h3>
            <p class="deal-specs-line">
              <span class="material-symbols-outlined spec-icon">apartment</span>
              <span>3.5 BHK Sky Corner • 2,180 sq.ft • Unobstructed Lake &amp; City Vista</span>
            </p>

            <p class="deal-narrative">
              Motivated institutional liquidation priced strictly below prevailing CMDA &amp; SRO benchmark rate. Pre-leased to corporate CXO yielding ₹85,000/month or available for vacant possession.
            </p>

            <!-- Price Analysis Matrix -->
            <div class="price-matrix">
              <div class="price-col">
                <span class="label-struck">Prevailing Market Rate</span>
                <span class="val-struck">₹1.75 Cr</span>
              </div>
              <div class="price-arrow">&rarr;</div>
              <div class="price-col primary-price">
                <span class="label-discount">Distress Deal Price</span>
                <span class="val-discount">₹1.33 Cr</span>
              </div>
              <div class="savings-badge badge-green">
                <span class="savings-pct">+₹42 LAKHS EQUITY</span>
                <span class="savings-sub">₹6,100/sq.ft Flat</span>
              </div>
            </div>

            <!-- Metric Highlights -->
            <div class="metrics-row">
              <span class="metric-pill">Market: ₹8,020/sq.ft</span>
              <span class="metric-pill">₹85K/Mo Rental Income</span>
              <span class="metric-pill highlight-pill">Bank NOC Ready</span>
            </div>

            <!-- Call to Actions -->
            <div class="deal-actions">
              <a 
                class="btn-deal-wa" 
                href="https://wa.me/919444100000?text=I%20am%20interested%20in%20the%20Below%20Market%20Price%20Deal%20for%20The%20Pinnacle%20Sky%20Suite%20(₹1.33%20Cr)" 
                target="_blank" 
                rel="noopener">
                <span class="material-symbols-outlined">chat</span>
                <span>WhatsApp Deal Officer</span>
              </a>

              <button 
                class="btn-deal-tour" 
                type="button" 
                (click)="viewPropertyMedia(lesserMarketProperty)">
                <span class="material-symbols-outlined">smart_display</span>
                <span>4K Video Tour (3 Pts)</span>
              </button>
            </div>
          </div>
        </article>

      </div>

      <!-- Trust Guarantees & View All Banner Strip -->
      <div class="deals-trust-strip">
        <div class="trust-perks">
          <div class="trust-item">
            <span class="material-symbols-outlined trust-icon text-emerald">gavel</span>
            <span>100% Encumbrance-Free Title Guaranteed</span>
          </div>
          <div class="trust-item">
            <span class="material-symbols-outlined trust-icon text-amber">bolt</span>
            <span>48-Hour Deed Registration Readiness</span>
          </div>
          <div class="trust-item">
            <span class="material-symbols-outlined trust-icon text-blue">verified_user</span>
            <span>Direct Seller Mandates • Zero Brokerage</span>
          </div>
        </div>

        <a routerLink="/search" class="btn-browse-all">
          <span>Explore All 14 Immediate Liquidation Deals</span>
          <span class="material-symbols-outlined">arrow_forward</span>
        </a>
      </div>

    </section>
  `,
  styles: [`
    .deals-section {
      padding: 2.5rem 1rem;
      background: #ffffff;
    }
    @media (min-width: 640px) {
      .deals-section {
        padding: 3rem 1.5rem;
      }
    }

    /* Section Header */
    .deals-header {
      text-align: center;
      max-width: 760px;
      margin: 0 auto 2.25rem;
    }
    .deals-badge-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 14px;
      border-radius: 9999px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #b91c1c;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.05em;
      margin-bottom: 0.75rem;
    }
    .live-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #ef4444;
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.25);
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(0.85); }
    }
    .deals-heading {
      font-size: 1.5rem;
      font-weight: 600;
      color: #0f172a;
      letter-spacing: -0.02em;
      margin-bottom: 0.625rem;
      line-height: 1.25;
    }
    @media (min-width: 768px) {
      .deals-heading {
        font-size: 2.125rem;
      }
    }
    .deals-subtext {
      font-size: 0.9375rem;
      color: #64748b;
      line-height: 1.55;
      margin: 0;
    }

    /* Grid of 2 Cards */
    .deals-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }
    @media (min-width: 1024px) {
      .deals-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 1.75rem;
      }
    }

    /* Card Wrapper */
    .deal-card {
      background: #ffffff;
      border-radius: 1.25rem;
      border: 1.5px solid #e2e8f0;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.06), 0 4px 6px -2px rgba(15, 23, 42, 0.02);
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      flex-direction: column;
    }
    .deal-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 20px 35px -8px rgba(15, 23, 42, 0.12), 0 8px 12px -4px rgba(15, 23, 42, 0.05);
    }
    .deal-urgent {
      border-top: 4px solid #ef4444;
    }
    .deal-discount {
      border-top: 4px solid #10b981;
    }

    /* Card Top Ribbon */
    .card-ribbon {
      padding: 0.75rem 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      font-size: 11.5px;
      flex-wrap: wrap;
    }
    .ribbon-urgent {
      background: linear-gradient(135deg, #fff1f2 0%, #fee2e2 100%);
      border-bottom: 1px solid #fecdd3;
      color: #9f1239;
    }
    .ribbon-discount {
      background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
      border-bottom: 1px solid #a7f3d0;
      color: #065f46;
    }
    .ribbon-left {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
      letter-spacing: 0.03em;
    }
    .ribbon-icon {
      font-size: 17px;
    }
    .ribbon-tag {
      font-weight: 600;
      opacity: 0.9;
    }

    /* Media Frame */
    .card-media-wrap {
      position: relative;
      height: 220px;
      background: #0f172a;
      overflow: hidden;
    }
    @media (min-width: 640px) {
      .card-media-wrap {
        height: 250px;
      }
    }
    .deal-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.4s ease;
    }
    .deal-card:hover .deal-img {
      transform: scale(1.03);
    }
    .media-overlay-chips {
      position: absolute;
      top: 12px;
      left: 12px;
      right: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      pointer-events: none;
    }
    .chip-glass {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
      backdrop-filter: blur(6px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
    .chip-hot {
      background: rgba(239, 68, 68, 0.92);
      color: #ffffff;
    }
    .chip-verified {
      background: rgba(15, 23, 42, 0.85);
      color: #f8fafc;
      border: 1px solid rgba(255, 255, 255, 0.15);
    }
    .chip-emerald {
      background: rgba(16, 185, 129, 0.92);
      color: #ffffff;
    }
    .chip-blue {
      background: rgba(30, 58, 138, 0.88);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    .icon-chip {
      font-size: 14px;
    }
    .media-bottom-badge {
      position: absolute;
      bottom: 12px;
      left: 12px;
      display: flex;
      align-items: center;
      gap: 5px;
      background: rgba(15, 23, 42, 0.8);
      backdrop-filter: blur(4px);
      padding: 4px 10px;
      border-radius: 6px;
      color: #ffffff;
      font-size: 11px;
      font-weight: 600;
    }
    .icon-cam {
      font-size: 15px;
      color: #38bdf8;
    }

    /* Deal Body */
    .deal-body {
      padding: 1.35rem 1.5rem 1.5rem;
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .deal-category-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 0.625rem;
    }
    .badge-cat {
      font-size: 11px;
      font-weight: 600;
      color: #0f172a;
      background: #f1f5f9;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .badge-rera {
      font-size: 10.5px;
      font-weight: 600;
      color: #0284c7;
      background: #e0f2fe;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .badge-status {
      font-size: 10.5px;
      font-weight: 600;
      color: #b91c1c;
      background: #fee2e2;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .badge-status-green {
      font-size: 10.5px;
      font-weight: 600;
      color: #047857;
      background: #d1fae5;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .deal-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: #0f172a;
      letter-spacing: -0.015em;
      margin-bottom: 0.35rem;
      line-height: 1.3;
    }
    .deal-specs-line {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12.5px;
      font-weight: 600;
      color: #475569;
      margin-bottom: 0.75rem;
    }
    .spec-icon {
      font-size: 18px;
      color: #64748b;
    }
    .deal-narrative {
      font-size: 12.5px;
      color: #64748b;
      line-height: 1.5;
      margin-bottom: 1.125rem;
      flex: 1;
    }

    /* Price Analysis Matrix */
    .price-matrix {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      padding: 0.875rem 1rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }
    .price-col {
      display: flex;
      flex-direction: column;
    }
    .label-struck {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      color: #94a3b8;
      letter-spacing: 0.04em;
    }
    .val-struck {
      font-size: 13.5px;
      font-weight: 600;
      color: #94a3b8;
      text-decoration: line-through;
    }
    .price-arrow {
      font-size: 18px;
      color: #cbd5e1;
      font-weight: 900;
    }
    .label-urgent {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      color: #ef4444;
      letter-spacing: 0.04em;
    }
    .val-urgent {
      font-size: 1.35rem;
      font-weight: 900;
      color: #b91c1c;
      letter-spacing: -0.02em;
    }
    .label-discount {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      color: #10b981;
      letter-spacing: 0.04em;
    }
    .val-discount {
      font-size: 1.35rem;
      font-weight: 900;
      color: #047857;
      letter-spacing: -0.02em;
    }
    .savings-badge {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      background: #fee2e2;
      border: 1px solid #fecaca;
      padding: 4px 8px;
      border-radius: 6px;
    }
    .badge-green {
      background: #d1fae5;
      border-color: #a7f3d0;
    }
    .savings-pct {
      font-size: 11px;
      font-weight: 900;
      color: #991b1b;
    }
    .badge-green .savings-pct {
      color: #065f46;
    }
    .savings-sub {
      font-size: 9.5px;
      font-weight: 600;
      color: #b91c1c;
    }
    .badge-green .savings-sub {
      color: #047857;
    }

    /* Metric Pills */
    .metrics-row {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 1.125rem;
    }
    .metric-pill {
      font-size: 11px;
      font-weight: 600;
      color: #475569;
      background: #f1f5f9;
      padding: 3px 9px;
      border-radius: 6px;
    }
    .highlight-pill {
      background: #fef3c7;
      color: #92400e;
      font-weight: 600;
    }

    /* Actions */
    .deal-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }
    .btn-deal-wa {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 0.75rem 0.875rem;
      border-radius: 0.625rem;
      background: #25d366;
      color: #ffffff;
      font-size: 12.5px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.15s ease;
      box-shadow: 0 2px 6px rgba(37, 211, 102, 0.25);
    }
    .btn-deal-wa:hover {
      background: #20bd5a;
      transform: translateY(-1px);
    }
    .btn-deal-wa span.material-symbols-outlined {
      font-size: 17px;
    }
    .btn-deal-tour {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 0.75rem 0.875rem;
      border-radius: 0.625rem;
      background: #0f172a;
      color: #ffffff;
      border: 1px solid #334155;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-deal-tour:hover {
      background: #1e293b;
      transform: translateY(-1px);
    }
    .btn-deal-tour span.material-symbols-outlined {
      font-size: 17px;
      color: #f59e0b;
    }

    /* Bottom Trust & Navigation Strip */
    .deals-trust-strip {
      margin-top: 2rem;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      border-radius: 1rem;
      padding: 1.125rem 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.25rem;
      flex-wrap: wrap;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.25);
    }
    .trust-perks {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      flex-wrap: wrap;
    }
    .trust-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      font-weight: 600;
      color: #e2e8f0;
    }
    .trust-icon {
      font-size: 18px;
    }
    .text-emerald { color: #34d399; }
    .text-amber { color: #fbbf24; }
    .text-blue { color: #60a5fa; }
    .btn-browse-all {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #ffffff;
      color: #0f172a;
      font-size: 12.5px;
      font-weight: 600;
      padding: 0.625rem 1.125rem;
      border-radius: 0.5rem;
      text-decoration: none;
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .btn-browse-all:hover {
      background: #f1f5f9;
      transform: translateX(2px);
    }
    .btn-browse-all span.material-symbols-outlined {
      font-size: 16px;
      color: #b91c1c;
    }

    @media (max-width: 640px) {
      .deal-actions {
        grid-template-columns: 1fr;
      }
      .deals-trust-strip {
        flex-direction: column;
        align-items: stretch;
      }
      .btn-browse-all {
        justify-content: center;
      }
    }
  `]
})
export class NewLaunchesSpotlightComponent {
  readonly propertyService = inject(PropertyService);

  readonly immediateSaleProperty: Property = {
    id: 'spotlight-immediate-azure',
    title: 'The Azure Horizon Luxury Villa — ECR Golden Beach',
    propertyType: 'Independent Villas',
    locality: 'ECR Golden Beach',
    city: 'Chennai',
    cityKey: 'chennai',
    price: '₹1.95 Cr',
    pricePerSqFt: '₹5,340/sq.ft Immediate Offer',
    sqft: '3,650 sq.ft',
    bhkBadge: '4 BHK Luxury Triplex',
    facingOrView: 'Sea Breeze & Private Pool',
    imageUrl: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80',
    badges: {
      rera: 'TN/RERA/0894/2024',
      brokerage: 'Immediate Mandate',
      points: 3
    },
    highlights: ['48-Hour Registration SLA', 'Save ₹70 Lakhs (26% Off)', 'Fully Furnished Triplex', 'Nil-Encumbrance 2026'],
    mediaPoints: 3,
    isMediaUnlocked: false,
    isShortlisted: false,
    freePhotos: [
      'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80'
    ],
    premiumMedia: [
      {
        id: 'azure-v1',
        type: 'video',
        title: '4K Architectural Walkthrough • The Azure Horizon Beach Villa',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80',
        duration: '3:45 min',
        tag: 'Cinematic 4K Villa Tour'
      },
      {
        id: 'azure-v2',
        type: 'video',
        title: 'ECR Coastline Drone Survey & Patta Map',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
        duration: '2:10 min',
        tag: 'Aerial Beach Survey'
      }
    ],
    whatsappUrl: 'https://wa.me/919444100000?text=I%20am%20interested%20in%20the%20Immediate%20Selling%20Offer%20for%20The%20Azure%20Horizon%20Villa%20(₹1.95%20Cr)'
  };

  readonly lesserMarketProperty: Property = {
    id: 'spotlight-discount-pinnacle',
    title: 'The Pinnacle Sky Suite — OMR Tech Expressway',
    propertyType: 'Luxury Penthouses',
    locality: 'OMR Tech Corridor',
    city: 'Chennai',
    cityKey: 'chennai',
    price: '₹1.33 Cr',
    pricePerSqFt: '₹6,100/sq.ft Below Market',
    sqft: '2,180 sq.ft',
    bhkBadge: '3.5 BHK Sky Corner Suite',
    facingOrView: 'Lake & Cityline Panoramic View',
    imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
    badges: {
      rera: 'TN/RERA/1429/2024',
      brokerage: 'Instant Equity Deal',
      points: 3
    },
    highlights: ['24% Below Guidance Value', 'Pre-Leased ₹85,000/Mo Option', '+₹42 Lakhs Equity Margin', 'Bank NOC Ready'],
    mediaPoints: 3,
    isMediaUnlocked: false,
    isShortlisted: false,
    freePhotos: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80'
    ],
    premiumMedia: [
      {
        id: 'pinnacle-v1',
        type: 'video',
        title: '4K Sky Suite Architectural Tour • The Pinnacle',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
        duration: '4:10 min',
        tag: 'Skyline 4K Tour'
      }
    ],
    whatsappUrl: 'https://wa.me/919444100000?text=I%20am%20interested%20in%20the%20Below%20Market%20Price%20Deal%20for%20The%20Pinnacle%20Sky%20Suite%20(₹1.33%20Cr)'
  };

  viewPropertyMedia(prop: Property): void {
    this.propertyService.openMediaModal(prop, 'premium');
  }

  onImgError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target && !target.src.includes('property-placeholder.svg')) {
      target.src = 'property-placeholder.svg';
    }
  }
}
