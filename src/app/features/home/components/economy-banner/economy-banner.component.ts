import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-economy-banner',
  standalone: true,
  imports: [CommonModule],
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

      <!-- Main 100% RERA Registered Assurance Container -->
      <div class="verification-card">
        <div class="glow-decor"></div>

        <!-- 100% RERA Registered Trust Strip -->
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

    /* Card Shell - Clean border without dropshadow */
    .verification-card {
      position: relative;
      border-radius: 1.25rem 1.25rem 0 0;
      border: 1px solid #e2e8f0;
      border-bottom: none;
      background: #ffffff;
      padding: 2.25rem;
      box-shadow: none;
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

    /* 100% RERA Registered Trust Strip */
    .rera-trust-strip {
      text-align: center;
      max-width: 52rem;
      margin: 0 auto;
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
      box-shadow: none;
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
      box-shadow: none;
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
  `]
})
export class EconomyBannerComponent {}
