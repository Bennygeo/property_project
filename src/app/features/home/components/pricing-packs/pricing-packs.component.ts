import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MetroService } from '../../../../core/services/metro.service';
import { WalletService } from '../../../../core/services/wallet.service';
import { PricingPack } from '../../../../core/models/pricing-pack.model';

@Component({
  selector: 'app-pricing-packs',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="pricing-section" id="pricing">
      <div class="max-w-content">
        <!-- Title & Subtitle -->
        <div class="pricing-header">
          <span class="editorial-tag text-red">ARCHITECTURAL MEDIA POINTS • RAZORPAY</span>
          <h2 class="pricing-title">Points for 4K Video Walkthroughs &amp; Drone Surveys</h2>
          <p class="pricing-sub">
            Standard photos are free for all visitors. Buy media points via Razorpay to unlock cinematic 4K interior tours, 360° drone boundary surveys, and architectural footage. Points never expire.
          </p>
        </div>

        <!-- 4 Pricing Cards Grid -->
        <div class="packs-grid">
          @for (pack of metroService.pricingPacks; track pack.id) {
            <div class="pricing-card" [class.featured]="pack.isRecommended">
              @if (pack.badgeText) {
                <div class="featured-badge">{{ pack.badgeText }}</div>
              }

              <div>
                <div class="pack-meta-row">
                  <span class="pack-cat" [class.text-red]="pack.isRecommended">{{ pack.category }}</span>
                  <span class="pack-pts-pill" [class.pts-red]="pack.isRecommended">
                    {{ pack.bonusPoints ? '+' + pack.bonusPoints + ' Bonus Pts' : pack.totalPoints + ' Points' }}
                  </span>
                </div>

                <h3 class="pack-title">{{ pack.name }}</h3>
                <p class="pack-subtext">{{ pack.subtitle }}</p>

                <div class="price-box">
                  <div class="price-row">
                    <span class="price-figure">₹{{ pack.priceInRupees.toLocaleString('en-IN') }}</span>
                    <span class="price-frequency">/ one-time</span>
                  </div>
                  <span class="price-rate" [class.text-emerald]="pack.isRecommended">
                    {{ pack.unlockEstimate }}
                  </span>
                </div>

                <ul class="features-list">
                  @for (feat of pack.features; track feat; let first = $first) {
                    <li class="feature-item" [class.highlight]="pack.isRecommended && first">
                      <span class="material-symbols-outlined" [class.text-red]="pack.isRecommended && first" [class.text-emerald]="!(pack.isRecommended && first)">
                        {{ pack.isRecommended && first ? 'verified' : 'check_circle' }}
                      </span>
                      <span>{{ feat }}</span>
                    </li>
                  }
                </ul>
              </div>

              <div class="card-action">
                <button 
                  type="button" 
                  class="btn-buy-pack" 
                  [class.btn-featured]="pack.isRecommended"
                  (click)="onBuyPack(pack)">
                  <span class="material-symbols-outlined">payment</span>
                  <span>{{ pack.ctaText }}</span>
                </button>
              </div>
            </div>
          }

          <!-- Custom Amount Card -->
          <div class="pricing-card">
            <div>
              <div class="pack-meta-row">
                <span class="pack-cat">FLEXIBLE TOP-UP</span>
                <span class="pack-pts-pill">Custom Points</span>
              </div>

              <h3 class="pack-title">Custom Amount</h3>
              <p class="pack-subtext">Choose your exact point requirement. Perfect for specific property inspections.</p>

              <div class="price-box">
                <div class="price-row">
                  <span class="price-figure">₹50</span>
                  <span class="price-frequency">/ per point</span>
                </div>
                <span class="price-rate text-emerald">
                  Flexible • Auto Bonus on 20+ Pts
                </span>
              </div>

              <ul class="features-list">
                <li class="feature-item">
                  <span class="material-symbols-outlined text-emerald">check_circle</span>
                  <span>Enter any points (1 Pt = ₹50)</span>
                </li>
                <li class="feature-item">
                  <span class="material-symbols-outlined text-emerald">check_circle</span>
                  <span>Razorpay Instant Verification</span>
                </li>
                <li class="feature-item">
                  <span class="material-symbols-outlined text-emerald">check_circle</span>
                  <span>Direct Owner WhatsApp Chat Access</span>
                </li>
                <li class="feature-item">
                  <span class="material-symbols-outlined text-emerald">check_circle</span>
                  <span>Points Never Expire • Lifetime Validity</span>
                </li>
              </ul>
            </div>

            <div class="card-action">
              <button 
                type="button" 
                class="btn-buy-pack" 
                (click)="onBuyCustom()">
                <span class="material-symbols-outlined">tune</span>
                <span>Choose Custom Amount</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Trust Badges Strip -->
        <div class="trust-strip">
          <div class="trust-item">
            <span class="material-symbols-outlined text-emerald">verified_user</span>
            <span>Razorpay 100% Secure Checkout (UPI, Cards, NetBanking)</span>
          </div>
          <div class="trust-item">
            <span class="material-symbols-outlined text-emerald">all_inclusive</span>
            <span>Permanent Access: Unlocked 4K videos never expire</span>
          </div>
          <div class="trust-item">
            <span class="material-symbols-outlined text-emerald">speed</span>
            <span>Instant Unlocking: Watch walkthroughs immediately</span>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .pricing-section {
      padding-top: 2.25rem;
      padding-bottom: 2.25rem;
      background: #f8fafc;
      border-top: 1px solid var(--hairline-border);
      border-bottom: 1px solid var(--hairline-border);
    }
    @media (min-width: 640px) {
      .pricing-section {
        padding-top: 4rem;
        padding-bottom: 4rem;
      }
    }
    .pricing-header {
      text-align: center;
      max-width: 48rem;
      margin-left: auto;
      margin-right: auto;
      margin-bottom: 1.75rem;
    }
    @media (min-width: 640px) {
      .pricing-header {
        margin-bottom: 3rem;
      }
    }
    .text-red {
      color: var(--brand-red);
    }
    .text-emerald {
      color: #047857;
    }
    .pricing-title {
      font-size: 1.45rem;
      font-weight: 600;
      color: var(--text-slate-950);
      letter-spacing: -0.02em;
      margin-top: 0.25rem;
    }
    @media (min-width: 640px) {
      .pricing-title {
        font-size: 2.25rem;
      }
    }
    .pricing-sub {
      color: var(--text-slate-600);
      font-size: 0.85rem;
      margin-top: 0.5rem;
      line-height: 1.5;
    }
    @media (min-width: 640px) {
      .pricing-sub {
        font-size: 1rem;
        line-height: 1.6;
      }
    }
    .packs-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.25rem;
      align-items: stretch;
    }
    @media (min-width: 640px) {
      .packs-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 1.5rem;
      }
    }
    @media (min-width: 1100px) {
      .packs-grid {
        grid-template-columns: repeat(4, 1fr);
      }
    }
    .pricing-card {
      background: #ffffff;
      border-radius: 1rem;
      padding: 1.25rem 1rem;
      border: 2px solid var(--hairline-border);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
      transition: all 0.2s;
    }
    .pricing-card:hover {
      border-color: #94a3b8;
    }
    .pricing-card.featured {
      border-color: var(--brand-red);
      box-shadow: 0 20px 25px -5px rgba(199, 52, 52, 0.12), 0 10px 10px -5px rgba(199, 52, 52, 0.04);
    }
    .featured-badge {
      position: absolute;
      top: -14px;
      left: 50%;
      transform: translateX(-50%);
      padding: 0.25rem 1rem;
      border-radius: 9999px;
      background: var(--brand-red);
      color: #ffffff;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      white-space: nowrap;
    }
    .pack-meta-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.75rem;
      margin-top: 0.25rem;
    }
    .pack-cat {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-slate-500);
    }
    .pack-pts-pill {
      padding: 0.125rem 0.625rem;
      border-radius: 9999px;
      background: #f1f5f9;
      color: var(--text-slate-700);
      font-family: ui-monospace, monospace;
      font-size: 11px;
      font-weight: 600;
    }
    .pts-red {
      background: #fee2e2;
      color: var(--brand-red);
      font-weight: 900;
    }
    .pack-title {
      font-size: 1.25rem;
      font-weight: 900;
      color: var(--text-slate-950);
    }
    .pack-subtext {
      font-size: 12px;
      color: var(--text-slate-600);
      margin-top: 0.25rem;
      line-height: 1.4;
    }
    .price-box {
      margin-top: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .price-row {
      display: flex;
      align-items: baseline;
      gap: 4px;
    }
    .price-figure {
      font-size: 2rem;
      font-weight: 900;
      color: var(--text-slate-950);
      line-height: 1;
    }
    @media (min-width: 640px) {
      .price-figure {
        font-size: 2.25rem;
      }
    }
    .price-frequency {
      font-size: 12px;
      font-family: ui-monospace, monospace;
      color: var(--text-slate-500);
    }
    .price-rate {
      font-size: 12px;
      font-family: ui-monospace, monospace;
      color: var(--text-slate-600);
      font-weight: 600;
      display: block;
      margin-top: 0.25rem;
    }
    .features-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
      font-size: 12px;
      color: var(--text-slate-700);
      padding-top: 1rem;
      border-top: 1px solid #f1f5f9;
    }
    .feature-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .feature-item.highlight {
      font-weight: 600;
    }
    .feature-item span.material-symbols-outlined {
      font-size: 18px;
      flex-shrink: 0;
    }
    .card-action {
      margin-top: 2rem;
    }
    .btn-buy-pack {
      width: 100%;
      padding: 0.875rem 1rem;
      border-radius: 0.75rem;
      background: #f1f5f9;
      color: var(--text-slate-900);
      font-weight: 600;
      font-size: 12px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      border: none;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-buy-pack:hover {
      background: #e2e8f0;
    }
    .btn-featured {
      background: var(--brand-red);
      color: #ffffff;
      font-weight: 900;
      box-shadow: 0 4px 6px -1px rgba(199, 52, 52, 0.25);
    }
    .btn-featured:hover {
      background: var(--brand-red-hover);
      box-shadow: 0 10px 15px -3px rgba(199, 52, 52, 0.35);
    }
    .trust-strip {
      margin-top: 2.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--hairline-border);
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
      text-align: center;
    }
    @media (min-width: 768px) {
      .trust-strip {
        grid-template-columns: repeat(3, 1fr);
      }
    }
    .trust-item {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-slate-700);
    }
    .trust-item span.material-symbols-outlined {
      font-size: 20px;
    }
  `]
})
export class PricingPacksComponent {
  readonly metroService = inject(MetroService);
  readonly walletService = inject(WalletService);
  private readonly router = inject(Router);

  onBuyPack(pack: PricingPack): void {
    this.router.navigate(['/wallet'], {
      queryParams: {
        rupees: pack.priceInRupees,
        points: pack.totalPoints
      }
    });
  }

  onBuyCustom(): void {
    this.router.navigate(['/wallet'], {
      queryParams: {
        custom: 'true'
      }
    });
  }
}
