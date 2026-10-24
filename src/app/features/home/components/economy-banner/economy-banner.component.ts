import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-economy-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="max-w-content verification-section">
      <!-- Building Art Sitting Directly Above the Below Section (Height 10rem) -->
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

      <!-- Below Section with Rounded TL & TR and Flat Bottom -->
      <div class="verification-card">
        <div class="glow-decor"></div>

        <div class="card-header-row">
          <div class="header-left">
            <div class="header-text-block">
              <h2 class="verification-title">
                Every Plot Drone-Verified &amp; Survey-Backed.
              </h2>
              
              <p class="verification-desc">
                Inspect authentic cadastral boundary demarcation, true approach road widths, and government-sanctioned approvals before visiting in person. Zero encroachment surprises, zero false marketing.
              </p>
            </div>
          </div>

          <div class="header-right">
            <button type="button" (click)="scrollToFeatured()" class="btn-explore" id="explore-verified-btn">
              <span>Explore Verified Plots</span>
              <span class="material-symbols-outlined arrow-icon">south</span>
            </button>
          </div>
        </div>

        <!-- 3 High-Trust Buyer Assurance Pillars -->
        <div class="pillars-grid">
          <div class="pillar-box">
            <div class="pillar-content">
              <div class="pillar-top-row">
                <h3 class="pillar-heading">Exact Cadastral Boundaries</h3>
                <span class="pillar-tag">GPS Demarcated</span>
              </div>
              <p class="pillar-sub">Surveyor-audited boundary stones and physical GPS coordinates with zero encroachment risk.</p>
            </div>
          </div>

          <div class="pillar-box">
            <div class="pillar-content">
              <div class="pillar-top-row">
                <h3 class="pillar-heading">4K Aerial Drone Perspective</h3>
                <span class="pillar-tag">High-Def Video</span>
              </div>
              <p class="pillar-sub">Verify true approach road widths, surrounding topography, and neighborhood developments from above.</p>
            </div>
          </div>

          <div class="pillar-box">
            <div class="pillar-content">
              <div class="pillar-top-row">
                <h3 class="pillar-heading">100% Legal Clearance</h3>
                <span class="pillar-tag">Bank NOC Cleared</span>
              </div>
              <p class="pillar-sub">DTCP &amp; CMDA sanctioned layouts, 30-year encumbrance-free records, and cleared parent deeds.</p>
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

    /* Building Art Sitting Above Below Section */
    .skyline-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      width: 100%;
      margin-bottom: -1px; /* Sits flush right on the top border of the card below */
      position: relative;
      z-index: 2;
    }

    .skyline-label {
      font-size: 10px;
      font-family: ui-monospace, monospace;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: #94a3b8;
      font-weight: 600;
      margin-bottom: 0.65rem;
    }

    .skyline-img-container {
      width: 100%;
      height: 10rem;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      overflow: hidden;
    }
    @media (max-width: 640px) {
      .skyline-img-container {
        height: 6.5rem;
      }
    }

    .skyline-img {
      width: 100%;
      max-width: 50rem;
      height: 10rem;
      object-fit: contain;
      object-position: bottom center;
      opacity: 0.62;
      display: block;
    }
    @media (max-width: 640px) {
      .skyline-img {
        height: 6.5rem;
      }
    }

    /* Below Section Card: Rounded TL & TR, Flat Bottom */
    .verification-card {
      width: 100%;
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
      padding: 1.5rem 1.25rem;
      position: relative;
      overflow: hidden;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      transition: border-color 0.25s ease, box-shadow 0.25s ease;
      border-radius: 16px;
    }
    @media (min-width: 640px) {
      .verification-card {
        padding: 2.25rem 2.5rem;
      }
    }

    .glow-decor {
      position: absolute;
      top: -6rem;
      right: -6rem;
      width: 20rem;
      height: 20rem;
      background: radial-gradient(circle, rgba(185, 28, 28, 0.04) 0%, transparent 70%);
      border-radius: 9999px;
      pointer-events: none;
    }

    .card-header-row {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      align-items: flex-start;
      margin-bottom: 1.75rem;
    }
    @media (min-width: 1024px) {
      .card-header-row {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
    }

    .header-left {
      display: flex;
      align-items: flex-start;
      gap: 1.25rem;
      max-width: 820px;
    }

    .shield-icon-box {
      display: none;
    }
    @media (min-width: 640px) {
      .shield-icon-box {
        display: flex;
        width: 3.25rem;
        height: 3.25rem;
        border-radius: 14px;
        background: #fef2f2;
        border: 1px solid #fee2e2;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        box-shadow: 0 4px 12px rgba(185, 28, 28, 0.08);
      }
    }

    .shield-glyph {
      font-size: 1.85rem;
      color: #b91c1c;
    }

    .header-text-block {
      flex: 1;
    }

    .badges-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.6rem;
      margin-bottom: 0.65rem;
    }

    .badge-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.3rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.68rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      font-family: inherit;
    }

    .badge-primary {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }

    .badge-neutral {
      background: #f8fafc;
      color: #475569;
      border: 1px solid #e2e8f0;
    }

    .badge-icon {
      font-size: 0.95rem;
    }

    .verification-title {
      font-size: 1.45rem;
      font-weight: 600;
      letter-spacing: -0.025em;
      line-height: 1.25;
      color: #0f172a;
      margin: 0 0 0.55rem 0;
    }
    @media (min-width: 640px) {
      .verification-title {
        font-size: 1.5rem;
      }
    }

    .verification-desc {
      font-size: 0.92rem;
      line-height: 1.65;
      color: #475569;
      letter-spacing: -0.01em;
      margin: 0;
      max-width: 720px;
    }

    .header-right {
      flex-shrink: 0;
      width: auto;
    }

    .btn-explore {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.45rem;
      width: auto;
      height: 38px;
      padding: 0 1.25rem;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.02em;
      color: var(--brand-green);
      border: 2px solid var(--brand-green);
      background-color: white;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .btn-explore:hover {
      border-color: var(--brand-green);
      color: var(--brand-green);
      transform: translateY(-1px);
    }
    .btn-explore:active {
      transform: translateY(0);
    }

    .arrow-icon {
      font-size: 16px;
      transition: transform 0.2s ease;
    }
    .btn-explore:hover .arrow-icon {
      transform: translateY(2px);
    }

    /* 3 Pillars Grid */
    .pillars-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.85rem;
      padding-top: 1.5rem;
      border-top: 1px solid #f1f5f9;
    }
    @media (min-width: 768px) {
      .pillars-grid {
        grid-template-columns: repeat(3, 1fr);
        gap: 1.25rem;
      }
    }

    .pillar-box {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1.15rem;
      border-radius: 14px;
      background: #f8fafc;
      border: 1px solid #f1f5f9;
      transition: background 0.2s ease, border-color 0.2s ease;
    }
    .pillar-box:hover {
      background: #f1f5f9;
      border-color: #e2e8f0;
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

    .crimson-icon {
      background: #fef2f2;
      color: #b91c1c;
      border: 1px solid #fee2e2;
    }
    .blue-icon {
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #dbeafe;
    }
    .emerald-icon {
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
    }

    .pillar-content {
      flex: 1;
      min-width: 0;
    }

    .pillar-top-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.35rem;
    }

    .pillar-heading {
      font-size: 0.92rem;
      font-weight: 600;
      color: #0f172a;
      margin: 0;
    }

    .pillar-tag {
      font-size: 0.65rem;
      font-weight: 600;
      color: #64748b;
      background: #ffffff;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
      white-space: nowrap;
    }

    .pillar-sub {
      font-size: 0.82rem;
      line-height: 1.55;
      color: #64748b;
      letter-spacing: -0.005em;
      margin: 0;
    }
  `]
})
export class EconomyBannerComponent {
  scrollToFeatured() {
    const el = document.getElementById('featured-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
