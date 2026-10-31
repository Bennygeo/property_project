import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-economy-banner',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="max-w-content verification-section">
      <!-- Building Art Sitting Flush Above Below Section -->
      <div class="skyline-wrapper">
        <div class="skyline-img-container">
          <img 
            alt="Sanctioned Structural & Cadastral Registry Skyline" 
            class="skyline-img" 
            src="skyline.svg"
            loading="lazy"
            decoding="async">
        </div>
      </div>

      <!-- Main Trust & Buy-Sell Container -->
      <div class="verification-card">
        <div class="glow-decor"></div>

        <!-- 1. 100% RERA Registered Assurance Banner Strip -->
        <div class="rera-trust-strip">
          <div class="rera-badge-pill">
            <span class="material-symbols-outlined rera-shield-icon">verified_user</span>
            <span>100% RERA REGISTERED</span>
          </div>

          <div class="rera-main-text">
            <h2 class="rera-headline">Every Plot We Post is RERA Registered</h2>
            <p class="rera-desc">
              We strictly list government-sanctioned, RERA-approved layouts and verified direct deeds. We do not undertake unapproved sites, guaranteeing complete legal title clearance and zero encroachment risks.
            </p>
          </div>

          <div class="rera-badges-row">
            <div class="rera-badge-chip">
              <span class="material-symbols-outlined">check_circle</span>
              <span>TNRERA Registered</span>
            </div>
            <div class="rera-badge-chip">
              <span class="material-symbols-outlined">check_circle</span>
              <span>CMDA &amp; DTCP Sanctioned</span>
            </div>
            <div class="rera-badge-chip">
              <span class="material-symbols-outlined">check_circle</span>
              <span>Clear Patta &amp; Title</span>
            </div>
            <div class="rera-badge-chip rera-highlight-chip">
              <span class="material-symbols-outlined">shield</span>
              <span>Zero Unapproved Sites</span>
            </div>
          </div>
        </div>

        <div class="section-divider"></div>

        <!-- 2. Dual Buy & Sell Options (For Buyers & Sellers) -->
        <div class="portals-dual-grid">
          
          <!-- PORTAL 1: FOR BUYERS -->
          <div class="portal-card buyer-portal">
            <div class="portal-top">
              <div class="portal-icon-wrap buyer-icon-wrap">
                <span class="material-symbols-outlined">search</span>
              </div>
              <span class="portal-role-tag buyer-tag">FOR BUYERS</span>
            </div>

            <div class="portal-content">
              <h3 class="portal-title">Looking to Buy a Property?</h3>
              <p class="portal-sub">
                Explore pre-screened, 100% RERA-approved residential plots, luxury villas, and gated layouts across prime growth corridors.
              </p>

              <div class="portal-perks-list">
                <div class="portal-perk">
                  <span class="material-symbols-outlined perk-check">check</span>
                  <span>Survey-verified boundary stones &amp; road widths</span>
                </div>
                <div class="portal-perk">
                  <span class="material-symbols-outlined perk-check">check</span>
                  <span>Direct developer &amp; owner pricing with full transparency</span>
                </div>
                <div class="portal-perk">
                  <span class="material-symbols-outlined perk-check">check</span>
                  <span>Free site visit booking with on-ground assistance</span>
                </div>
              </div>
            </div>

            <div class="portal-action-row">
              <a routerLink="/search" class="btn-portal btn-buyer-portal" id="home-view-properties-btn">
                <span>View All Properties</span>
                <span class="material-symbols-outlined">arrow_forward</span>
              </a>
            </div>
          </div>

          <!-- PORTAL 2: FOR SELLERS -->
          <div class="portal-card seller-portal">
            <div class="portal-top">
              <div class="portal-icon-wrap seller-icon-wrap">
                <span class="material-symbols-outlined">add_home_work</span>
              </div>
              <span class="portal-role-tag seller-tag">FOR SELLERS &amp; BUILDERS</span>
            </div>

            <div class="portal-content">
              <h3 class="portal-title">Looking to Sell Your Property?</h3>
              <p class="portal-sub">
                Post your RERA-sanctioned plot or property on Tamil Nadu's dedicated real estate registry. Connect directly with serious buyers.
              </p>

              <div class="portal-perks-list">
                <div class="portal-perk">
                  <span class="material-symbols-outlined perk-check">check</span>
                  <span>Free listing for genuine property owners &amp; developers</span>
                </div>
                <div class="portal-perk">
                  <span class="material-symbols-outlined perk-check">check</span>
                  <span>Direct buyer inquiries without intermediary delays</span>
                </div>
                <div class="portal-perk">
                  <span class="material-symbols-outlined perk-check">check</span>
                  <span>High-intent visibility across verified NRI &amp; investor networks</span>
                </div>
              </div>
            </div>

            <div class="portal-action-row">
              <a routerLink="/post-property" class="btn-portal btn-seller-portal" id="home-post-property-btn">
                <span>Post Your Property</span>
                <span class="material-symbols-outlined">arrow_forward</span>
              </a>
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

    .verification-section {
      margin-top: 1.5rem;
      margin-bottom: 2.5rem;
      position: relative;
      z-index: 1;
    }
    @media (max-width: 640px) {
      .verification-section {
        margin-top: 1rem;
        margin-bottom: 1.75rem;
      }
    }

    /* Skyline Art */
    .skyline-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      width: 100%;
      margin-bottom: -1px;
      position: relative;
      z-index: 2;
    }

    .skyline-img-container {
      width: 100%;
      height: 7.5rem;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      overflow: hidden;
    }
    @media (max-width: 640px) {
      .skyline-img-container {
        height: 5rem;
      }
    }

    .skyline-img {
      width: 100%;
      max-width: 48rem;
      height: 7.5rem;
      object-fit: contain;
      object-position: bottom center;
      opacity: 0.65;
      display: block;
    }
    @media (max-width: 640px) {
      .skyline-img {
        height: 5rem;
      }
    }

    /* Card Shell */
    .verification-card {
      position: relative;
      border-radius: 1.25rem 1.25rem 0 0;
      border: 1px solid #e2e8f0;
      border-bottom: none;
      background: #ffffff;
      padding: 2.25rem;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.05);
      overflow: hidden;
    }
    @media (max-width: 768px) {
      .verification-card {
        padding: 1.5rem 1rem;
        border-radius: 1rem 1rem 0 0;
      }
    }

    .glow-decor {
      position: absolute;
      top: 0;
      right: 0;
      width: 400px;
      height: 250px;
      background: radial-gradient(ellipse at top right, rgba(16, 185, 129, 0.08) 0%, transparent 70%);
      pointer-events: none;
    }

    /* 1. 100% RERA Registered Trust Strip */
    .rera-trust-strip {
      text-align: center;
      max-width: 52rem;
      margin: 0 auto 2rem;
    }

    .rera-badge-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.35rem 0.95rem;
      border-radius: 9999px;
      background: #ecfdf5;
      color: #065f46;
      border: 1.5px solid #a7f3d0;
      font-size: 11.5px;
      font-weight: 800;
      letter-spacing: 0.05em;
      margin-bottom: 0.85rem;
      box-shadow: 0 2px 6px rgba(16, 185, 129, 0.1);
    }

    .rera-shield-icon {
      font-size: 16px;
      color: #059669;
    }

    .rera-headline {
      font-size: clamp(1.4rem, 2.5vw, 1.85rem);
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
      margin: 0 0 0.65rem 0;
      line-height: 1.25;
    }

    .rera-desc {
      font-size: 0.95rem;
      color: #475569;
      line-height: 1.6;
      margin: 0 0 1.25rem 0;
    }

    .rera-badges-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .rera-badge-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.4rem 0.85rem;
      border-radius: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      font-size: 12.5px;
      font-weight: 600;
      color: #334155;
    }

    .rera-badge-chip .material-symbols-outlined {
      font-size: 16px;
      color: #059669;
    }

    .rera-highlight-chip {
      background: #f0fdf4;
      border-color: #bbf7d0;
      color: #166534;
      font-weight: 700;
    }

    .section-divider {
      height: 1px;
      background: linear-gradient(90deg, transparent 0%, #e2e8f0 50%, transparent 100%);
      margin: 0.5rem 0 2.25rem 0;
    }

    /* 2. Dual Buy & Sell Options */
    .portals-dual-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.75rem;
    }
    @media (max-width: 768px) {
      .portals-dual-grid {
        grid-template-columns: 1fr;
        gap: 1.25rem;
      }
    }

    .portal-card {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border-radius: 1rem;
      padding: 1.75rem;
      border: 1.5px solid #e2e8f0;
      background: #ffffff;
      transition: all 0.25s ease;
      position: relative;
    }

    .buyer-portal {
      border-color: #cbd5e1;
      background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
    }
    .buyer-portal:hover {
      border-color: var(--brand-red, #b91c1c);
      box-shadow: 0 12px 28px -6px rgba(185, 28, 28, 0.12);
      transform: translateY(-2px);
    }

    .seller-portal {
      border-color: #a7f3d0;
      background: linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%);
    }
    .seller-portal:hover {
      border-color: #059669;
      box-shadow: 0 12px 28px -6px rgba(5, 150, 105, 0.15);
      transform: translateY(-2px);
    }

    .portal-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.15rem;
    }

    .portal-icon-wrap {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
    }

    .buyer-icon-wrap {
      background: #fee2e2;
      color: #b91c1c;
      border: 1px solid #fecaca;
    }

    .seller-icon-wrap {
      background: #dcfce7;
      color: #059669;
      border: 1px solid #bbf7d0;
    }

    .portal-role-tag {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.05em;
      padding: 0.25rem 0.65rem;
      border-radius: 6px;
    }

    .buyer-tag {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #e2e8f0;
    }

    .seller-tag {
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }

    .portal-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.01em;
      margin: 0 0 0.5rem 0;
    }

    .portal-desc {
      font-size: 0.88rem;
      line-height: 1.55;
      color: #64748b;
      margin: 0 0 1.25rem 0;
    }

    .portal-perks-list {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      margin-bottom: 1.75rem;
    }

    .portal-perk {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      font-size: 12.5px;
      color: #334155;
      font-weight: 500;
      line-height: 1.4;
    }

    .perk-check {
      font-size: 16px;
      color: #059669;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .portal-action-row {
      margin-top: auto;
    }

    .btn-portal {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      width: 100%;
      padding: 0.75rem 1.25rem;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 700;
      text-decoration: none;
      transition: all 0.2s ease;
      cursor: pointer;
      border: none;
    }

    .btn-buyer-portal {
      background: #0f172a;
      color: #ffffff;
    }
    .btn-buyer-portal:hover {
      background: #1e293b;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);
    }

    .btn-seller-portal {
      background: #059669;
      color: #ffffff;
    }
    .btn-seller-portal:hover {
      background: #047857;
      box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);
    }

    .btn-portal .material-symbols-outlined {
      font-size: 18px;
      transition: transform 0.2s ease;
    }
    .btn-portal:hover .material-symbols-outlined {
      transform: translateX(3px);
    }
  `]
})
export class EconomyBannerComponent {}
