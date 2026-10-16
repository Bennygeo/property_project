import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PropertyService } from '../../../../core/services/property.service';
import { Property } from '../../../../core/models/property.model';

@Component({
  selector: 'app-new-launches-spotlight',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="max-w-content spotlight-section" id="new-launches">
      <div class="spotlight-card">
        <div class="spotlight-content-row">
          <!-- Left Details & Photo -->
          <div class="spotlight-left">
            <div class="spotlight-img-frame">
              <img 
                src="https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80" 
                (error)="onImgError($event)"
                alt="The Coromandel Courtyard - Kotturpuram Luxury Residences" 
                class="spotlight-img">
            </div>

            <!-- Badges -->
            <div class="spotlight-badges">
              <span class="badge-launch">EXCLUSIVE NEW LAUNCH</span>
              <span class="badge-rera">TN/RERA/1429/2024</span>
              <span class="badge-direct hidden-sm">• Zero Brokerage</span>
              <span class="badge-pts">
                <span class="material-symbols-outlined icon-pts">videocam</span>
                Free Photos • 3 Points for 4K Video Tour
              </span>
            </div>

            <!-- Title & Copy -->
            <h3 class="spotlight-title">The Coromandel Courtyard — Kotturpuram, Chennai</h3>
            <p class="spotlight-description">
              Low-density 3 &amp; 4 BHK garden residences fronting the tranquil Adyar greenway. Sanctioned CMDA layout, physical laser carpet audit completed, handover guaranteed Q3 2026.
            </p>

            <!-- Technical Specification Pills -->
            <div class="specs-pills">
              <span class="pill-spec">2,450 – 3,850 sq.ft</span>
              <span class="pill-rate">₹10,500/sq.ft Pre-Launch Rate</span>
              <span class="pill-spec">12 of 48 Units Allotted</span>
            </div>
          </div>

          <!-- Right Pricing & CTA -->
          <div class="spotlight-right">
            <div class="price-block">
              <span class="price-label">Starting Price Bracket</span>
              <div class="price-val">₹2.85 – 4.10 Cr</div>
              <span class="price-savings">Zero Brokerage Guarantee</span>
            </div>

            <div class="actions-group">
              <a 
                class="btn-wa" 
                href="https://wa.me/919444100000?text=Inquiry%20for%20The%20Coromandel%20Courtyard%20Brochure" 
                target="_blank" 
                rel="noopener">
                <span class="material-symbols-outlined">chat</span>
                WhatsApp
              </a>

              <button 
                class="btn-unlock" 
                type="button" 
                (click)="viewSpotlightMedia()">
                <span class="material-symbols-outlined">smart_display</span>
                Watch 4K Tour (3 Pts)
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .spotlight-section {
      padding-top: 1.5rem;
      padding-bottom: 1.5rem;
      background: #ffffff;
    }
    .spotlight-card {
      background: #ffffff;
      border-radius: 1rem;
      padding: 1.5rem;
      border: 1px solid var(--hairline-border);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    @media (min-width: 640px) {
      .spotlight-card {
        padding: 2rem;
      }
    }
    .spotlight-content-row {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }
    @media (min-width: 1024px) {
      .spotlight-content-row {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
    }
    .spotlight-left {
      max-width: 48rem;
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
    }
    .spotlight-img-frame {
      width: 100%;
      height: 16rem;
      border-radius: 0.75rem;
      overflow: hidden;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      border: 1px solid #f1f5f9;
    }
    @media (min-width: 640px) {
      .spotlight-img-frame {
        height: 18rem;
      }
    }
    .spotlight-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .spotlight-badges {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      flex-wrap: wrap;
    }
    .badge-launch {
      padding: 0.25rem 0.625rem;
      border-radius: 4px;
      background: var(--brand-red);
      color: #ffffff;
      font-weight: 700;
      font-size: 10px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .badge-rera {
      font-size: 12px;
      font-family: ui-monospace, monospace;
      color: #047857;
      font-weight: 700;
      background: #ecfdf5;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid #a7f3d0;
    }
    .badge-direct {
      color: var(--text-slate-500);
      font-size: 12px;
    }
    .badge-pts {
      padding: 2px 8px;
      border-radius: 4px;
      background: #fffbeb;
      border: 1px solid #fcd34d;
      color: #78350f;
      font-family: ui-monospace, monospace;
      font-size: 10px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .icon-pts {
      font-size: 13px;
      color: #b45309;
    }
    .spotlight-title {
      font-size: 1.5rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: var(--text-slate-950);
      line-height: 1.25;
    }
    @media (min-width: 640px) {
      .spotlight-title {
        font-size: 1.875rem;
      }
    }
    .spotlight-description {
      color: var(--text-slate-600);
      font-size: 0.875rem;
      line-height: 1.6;
    }
    .specs-pills {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 12px;
      font-family: ui-monospace, monospace;
      color: var(--text-slate-700);
      flex-wrap: wrap;
      padding-top: 0.25rem;
    }
    .pill-spec {
      background: #f1f5f9;
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      border: 1px solid var(--hairline-border);
      font-weight: 500;
    }
    .pill-rate {
      background: #ecfdf5;
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      border: 1px solid #a7f3d0;
      color: #065f46;
      font-weight: 700;
    }
    .spotlight-right {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      flex-shrink: 0;
    }
    @media (min-width: 640px) and (max-width: 1023px) {
      .spotlight-right {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
    }
    @media (min-width: 1024px) {
      .spotlight-right {
        align-items: flex-end;
        text-align: right;
      }
    }
    .price-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-slate-500);
      display: block;
      margin-bottom: 0.25rem;
    }
    .price-val {
      font-size: 1.875rem;
      font-weight: 900;
      color: var(--text-slate-950);
      letter-spacing: -0.02em;
      line-height: 1.1;
    }
    @media (min-width: 640px) {
      .price-val {
        font-size: 2.25rem;
      }
    }
    .price-savings {
      font-size: 11px;
      font-family: ui-monospace, monospace;
      color: #047857;
      font-weight: 600;
      display: block;
      margin-top: 0.25rem;
    }
    .actions-group {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      width: 100%;
    }
    @media (min-width: 640px) {
      .actions-group {
        width: auto;
      }
    }
    .btn-wa {
      flex: 1;
      height: 44px;
      padding: 0 1rem;
      border-radius: 0.75rem;
      border: 1px solid #6ee7b7;
      background: #ecfdf5;
      color: #064e3b;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      text-decoration: none;
      transition: background 0.15s;
    }
    .btn-wa:hover {
      background: #d1fae5;
    }
    .btn-unlock {
      flex: 1;
      height: 44px;
      padding: 0 1.25rem;
      border-radius: 0.75rem;
      background: #020617;
      color: #fbbf24;
      font-weight: 900;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      border: 1px solid #020617;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-unlock:hover {
      background: #0f172a;
    }
    .btn-unlock:active {
      transform: scale(0.96);
    }
    @media (min-width: 640px) {
      .btn-wa, .btn-unlock {
        flex: none;
      }
    }
    @media (max-width: 640px) {
      .hidden-sm { display: none; }
    }
  `]
})
export class NewLaunchesSpotlightComponent {
  readonly propertyService = inject(PropertyService);

  private readonly spotlightMockProperty: Property = {
    id: 'spotlight-coromandel',
    title: 'The Coromandel Courtyard — Kotturpuram, Chennai',
    propertyType: 'Independent Villas',
    locality: 'Kotturpuram',
    city: 'Chennai',
    cityKey: 'chennai',
    price: '₹2.85 – 4.10 Cr',
    pricePerSqFt: '₹10,500/sq.ft Pre-Launch Rate',
    sqft: '2,450 – 3,850 sq.ft',
    bhkBadge: '3 & 4 BHK Garden Residences',
    facingOrView: 'Adyar Greenway Facing',
    imageUrl: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80',
    badges: {
      rera: 'TN/RERA/1429/2024',
      brokerage: 'Zero Brokerage',
      points: 3
    },
    highlights: ['Low-density 3 & 4 BHK', 'Laser Carpet Audit Done', 'Handover Q3 2026'],
    mediaPoints: 3,
    isMediaUnlocked: false,
    isShortlisted: false,
    freePhotos: [
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'
    ],
    premiumMedia: [
      {
        id: 'spot-v1',
        type: 'video',
        title: '4K Architectural Walkthrough • The Coromandel Courtyard',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80',
        duration: '4:20 min',
        tag: 'Cinematic 4K Courtyard Tour'
      },
      {
        id: 'spot-v2',
        type: 'video',
        title: 'Adyar Greenway Aerial Drone Survey',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
        duration: '2:15 min',
        tag: 'Riverfront Drone Survey'
      }
    ],
    whatsappUrl: 'https://wa.me/919444100000?text=Inquiry%20for%20The%20Coromandel%20Courtyard%20Brochure'
  };

  viewSpotlightMedia(): void {
    this.propertyService.openMediaModal(this.spotlightMockProperty, 'premium');
  }

  onImgError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target && !target.src.includes('property-placeholder.svg')) {
      target.src = '/property-placeholder.svg';
    }
  }
}
