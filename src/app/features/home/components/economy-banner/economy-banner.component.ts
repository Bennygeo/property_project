import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { WalletService } from '../../../../core/services/wallet.service';

@Component({
  selector: 'app-economy-banner',
  standalone: true,
  imports: [RouterModule],
  template: `
    <section class="max-w-content economy-section">
      <div class="economy-card">
        <!-- Ambient Glow Elements -->
        <div class="glow-top-right"></div>
        <div class="glow-bottom-left"></div>

        <div class="economy-header-row">
          <div class="header-left">
            <div class="token-icon-box">
              <span class="material-symbols-outlined token-glyph">videocam</span>
            </div>
            
            <div class="header-text-block">
              <div class="badges-row">
                <span class="badge-pill badge-exclusive">
                  <span class="material-symbols-outlined badge-icon">verified</span>
                  FREE PHOTOS FOR ALL • 4K TOURS ON POINTS
                </span>
                <span class="badge-pill badge-subtle">
                  <span class="material-symbols-outlined badge-icon">payments</span>
                  Recharge via Razorpay • From ₹100
                </span>
              </div>
              
              <h2 class="economy-title">
                <span>Architectural Media Economy:</span>
                <span class="rate-highlight">2 Pts for ₹100 • 10 Pts for ₹500</span>
              </h2>
              
              <p class="economy-desc">
                Browse standard property photos 100% free. Unlock cinematic 4K interior walkthroughs, drone boundary surveys, and ultra-HD architectural stills with micro-points.
              </p>
            </div>
          </div>

          <div class="header-right">
            <a routerLink="/wallet" class="btn-explore">
              <span>Wallet &amp; Recharge</span>
              <span class="material-symbols-outlined arrow-icon">arrow_forward</span>
            </a>
          </div>
        </div>

        <!-- 3 Economy Pillars -->
        <div class="economy-pillars-grid">
          <div class="pillar-box">
            <div class="pillar-icon-box amber-pill-icon">₹50</div>
            <div class="pillar-content">
              <div class="pillar-heading">
                <span class="stat-highlight">₹50</span>
                <span class="stat-unit">/ Media Point</span>
              </div>
              <div class="pillar-sub">₹100 (2 pts), ₹500 (10 pts), ₹1,000 &amp; ₹5,000 packs</div>
            </div>
          </div>

          <div class="pillar-box">
            <div class="pillar-icon-box emerald-pill-icon">
              <span class="material-symbols-outlined">smart_display</span>
            </div>
            <div class="pillar-content">
              <div class="pillar-heading">
                <span class="stat-highlight">1–3 Pts</span>
                <span class="stat-unit">/ Property</span>
              </div>
              <div class="pillar-sub">1 pt for plots • 2 pts for flats • 3 pts for luxury villas</div>
            </div>
          </div>

          <div class="pillar-box">
            <div class="pillar-icon-box white-pill-icon">
              <span class="material-symbols-outlined">all_inclusive</span>
            </div>
            <div class="pillar-content">
              <div class="pillar-heading">
                <span class="stat-highlight">Permanent</span>
                <span class="stat-unit">Lifetime Access</span>
              </div>
              <div class="pillar-sub">Once unlocked, 4K video tours remain forever available</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    :host {
      display: block;
      position: relative;
      z-index: 1;
    }

    .economy-section {
      margin-top: 1.5rem;
      margin-bottom: 2rem;
      position: relative;
      z-index: 1;
    }

    .economy-card {
      width: 100%;
      border-radius: 16px;
      padding: 2rem 2.25rem;
      position: relative;
      overflow: hidden;
      color: #ffffff;
      background: linear-gradient(135deg, rgb(127, 29, 29) 0%, rgb(199, 52, 52) 50%, rgb(185, 28, 28) 100%);
      box-shadow: 0 25px 50px -12px rgba(127, 29, 29, 0.35);
      border: 1px solid rgba(254, 202, 202, 0.3);
    }

    .glow-top-right {
      position: absolute;
      top: -6rem;
      right: -6rem;
      width: 24rem;
      height: 24rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 9999px;
      filter: blur(48px);
      pointer-events: none;
    }

    .glow-bottom-left {
      position: absolute;
      bottom: -6rem;
      left: -6rem;
      width: 24rem;
      height: 24rem;
      background: rgba(251, 191, 36, 0.1);
      border-radius: 9999px;
      filter: blur(48px);
      pointer-events: none;
    }

    .economy-header-row {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding-bottom: 1.75rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    }

    @media (min-width: 1024px) {
      .economy-header-row {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
    }

    .header-left {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    @media (min-width: 640px) {
      .header-left {
        flex-direction: row;
        align-items: flex-start;
      }
    }

    .token-icon-box {
      width: 3.5rem;
      height: 3.5rem;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.18);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 8px 16px -4px rgba(0, 0, 0, 0.15);
      backdrop-filter: blur(6px);
    }

    .token-glyph {
      font-size: 28px;
    }

    .header-text-block {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .badges-row {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      flex-wrap: wrap;
      margin-bottom: 0.25rem;
    }

    .badge-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.3rem 0.75rem;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
    }

    .badge-exclusive {
      background: #ffffff;
      color: var(--brand-red, #c73434);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
    }

    .badge-subtle {
      background: rgba(0, 0, 0, 0.22);
      border: 1px solid rgba(255, 255, 255, 0.25);
      color: #ffffff;
    }

    .badge-icon {
      font-size: 14px;
    }

    .economy-title {
      font-size: 1.5rem;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.02em;
      line-height: 1.25;
      display: flex;
      align-items: center;
      gap: 0.65rem;
      flex-wrap: wrap;
      margin: 0;
    }

    @media (min-width: 640px) {
      .economy-title {
        font-size: 1.85rem;
      }
    }

    .rate-highlight {
      font-size: 0.95rem;
      font-weight: 700;
      color: #fde68a;
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid rgba(253, 230, 138, 0.35);
      padding: 0.2rem 0.7rem;
      border-radius: 8px;
      letter-spacing: normal;
    }

    .economy-desc {
      color: #fee2e2;
      font-size: 0.92rem;
      margin: 0.4rem 0 0 0;
      max-width: 44rem;
      font-weight: 400;
      line-height: 1.6;
    }

    .header-right {
      flex-shrink: 0;
      width: 100%;
    }

    @media (min-width: 1024px) {
      .header-right {
        width: auto;
      }
    }

    .btn-explore {
      width: 100%;
      padding: 0.85rem 1.6rem;
      border-radius: 10px;
      background: #ffffff;
      color: var(--text-slate-950, #020617);
      font-weight: 800;
      font-size: 13px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.6rem;
      text-decoration: none;
      cursor: pointer;
      border: none;
      box-shadow: 0 10px 20px -3px rgba(0, 0, 0, 0.2);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .btn-explore:hover {
      background: #f8fafc;
      transform: translateY(-2px);
      box-shadow: 0 14px 24px -4px rgba(0, 0, 0, 0.3);
    }

    .btn-explore:hover .arrow-icon {
      transform: translateX(3px);
    }

    .arrow-icon {
      font-size: 18px;
      color: var(--brand-red, #c73434);
      transition: transform 0.2s ease;
    }

    /* 3 Economy Pillars */
    .economy-pillars-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.25rem;
      padding-top: 1.5rem;
      position: relative;
      z-index: 10;
    }

    @media (min-width: 640px) {
      .economy-pillars-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    .pillar-box {
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.22);
      border-radius: 12px;
      padding: 1.25rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      backdrop-filter: blur(8px);
      transition: all 0.2s ease;
    }

    .pillar-box:hover {
      background: rgba(255, 255, 255, 0.18);
      border-color: rgba(255, 255, 255, 0.4);
      transform: translateY(-2px);
    }

    .pillar-icon-box {
      width: 2.75rem;
      height: 2.75rem;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .amber-pill-icon {
      background: #fbbf24;
      color: #020617;
      font-weight: 900;
      font-size: 1rem;
      border: 1px solid #fde68a;
    }

    .emerald-pill-icon {
      background: #34d399;
      color: #020617;
      border: 1px solid #a7f3d0;
    }

    .emerald-pill-icon .material-symbols-outlined {
      font-size: 22px;
    }

    .white-pill-icon {
      background: #ffffff;
      color: var(--brand-red, #c73434);
      border: 1px solid #ffffff;
    }

    .white-pill-icon .material-symbols-outlined {
      font-size: 22px;
    }

    .pillar-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .pillar-heading {
      display: flex;
      align-items: baseline;
      gap: 6px;
    }

    .stat-highlight {
      font-size: 1.15rem;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.01em;
    }

    .stat-unit {
      font-size: 0.82rem;
      font-weight: 600;
      color: #fecaca;
    }

    .pillar-sub {
      font-size: 0.8rem;
      color: #fee2e2;
      line-height: 1.35;
    }
  `]
})
export class EconomyBannerComponent {
  readonly walletService = inject(WalletService);
}
