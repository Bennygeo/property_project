import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  template: `
    <footer class="minimal-footer">
      <div class="max-w-content footer-inner">
        <!-- Main Bar: Brand, Inline Navigation, Contact & Actions -->
        <div class="footer-main-bar">
          <!-- Brand & Compliance Indicator -->
          <div class="brand-block">
            <a routerLink="/" class="brand-link" aria-label="Find a Plot Home">
              <img 
                alt="Find a Plot" 
                class="brand-logo" 
                src="logo_footer.svg">
            </a>
          </div>

          <!-- Central Minimalist Navigation -->
          <nav class="footer-links-inline" aria-label="Footer Navigation">
            <a routerLink="/search" class="footer-link">Properties</a>
            <a routerLink="/post-property" class="footer-link">Post Listing</a>
            <a routerLink="/wallet" class="footer-link">Media Wallet</a>
            <a href="tel:18004197568" class="footer-link phone-link" title="Concierge Desk">
              <span class="material-symbols-outlined icon-xs">call</span>
              <span>1800-419-PLOT</span>
            </a>
          </nav>

          <!-- Back to Top Action -->
          <div class="footer-end-action">
            <button 
              type="button" 
              class="btn-back-top" 
              (click)="scrollToTop()" 
              title="Back to top"
              aria-label="Scroll back to top of page">
              <span>Top</span>
              <span class="material-symbols-outlined icon-sm">arrow_upward</span>
            </button>
          </div>
        </div>

        <!-- Hairline Divider & Sub-row -->
        <div class="footer-legal-bar">
          <div class="legal-left">
            <span class="copyright-notice">© 2025 Find a Plot Marketplace Ltd.</span>
            <span class="dot-divider">·</span>
            <span class="legal-tagline">Architectural Real Estate Registry</span>
          </div>

          <div class="legal-right">
            <a href="#" class="sub-link">Privacy</a>
            <span class="dot-divider">·</span>
            <a href="#" class="sub-link">Terms</a>
            <span class="dot-divider">·</span>
            <a href="#" class="sub-link">RERA Disclosures</a>
            <span class="dot-divider">·</span>
            <a href="#" class="sub-link">Sitemap</a>
          </div>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .minimal-footer {
      width: 100%;
      background-color: var(--brand-teal, #0f3b4a);
      color: #94a3b8;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      font-family: inherit;
    }
    .footer-inner {
      padding-top: 1.5rem;
      padding-bottom: 1.25rem;
    }

    /* Main Horizontal Bar */
    .footer-main-bar {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      align-items: flex-start;
    }
    @media (min-width: 900px) {
      .footer-main-bar {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        gap: 1.5rem;
      }
    }

    /* Brand & Compliance Indicator */
    .brand-block {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .brand-link {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      text-decoration: none;
    }
    .brand-logo {
      height: 70px;
      width: auto;
      max-width: 100%;
      object-fit: contain;
      image-rendering: -webkit-optimize-contrast;
      display: block;
    }
    .brand-titles {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .brand-name {
      font-size: 0.9rem;
      font-weight: 700;
      color: #f8fafc;
      letter-spacing: 0.10em;
      line-height: 1.2;
      display: inline-flex;
      align-items: center;
    }
    .brand-plot-bracket {
      display: inline-block;
      margin-left: 3px;
      padding: 0 4px;
      color: var(--brand-green, #5e8f72);
      background: rgba(94, 143, 114, 0.2);
      border: 1px dashed rgba(94, 143, 114, 0.5);
      border-radius: 3px;
      font-weight: 900;
      letter-spacing: 0.12em;
    }
    .brand-caption {
      font-size: 10px;
      color: #64748b;
      font-weight: 500;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    /* RERA Chip */
    .rera-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.07);
      font-size: 11px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #94a3b8;
    }
    .pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
    }
    .rera-num {
      color: #e2e8f0;
      font-weight: 600;
    }
    .rera-sep {
      color: #475569;
    }
    .rera-authority {
      color: #64748b;
    }

    /* Inline Nav Links */
    .footer-links-inline {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      flex-wrap: wrap;
    }
    .footer-link {
      font-size: 13px;
      font-weight: 500;
      color: #94a3b8;
      text-decoration: none;
      transition: color 0.15s ease, transform 0.15s ease;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .footer-link:hover {
      color: #ffffff;
    }
    .phone-link {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      color: #cbd5e1;
    }
    .icon-xs {
      font-size: 14px;
      color: #64748b;
    }
    .phone-link:hover .icon-xs {
      color: #ffffff;
    }

    /* WhatsApp Pill */
    .wa-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.25);
      color: #34d399;
      font-size: 12px;
      font-weight: 500;
      text-decoration: none;
      transition: all 0.15s ease;
    }
    .wa-badge:hover {
      background: rgba(16, 185, 129, 0.16);
      border-color: rgba(16, 185, 129, 0.45);
      color: #6ee7b7;
    }
    .wa-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #10b981;
    }

    /* Back to Top Action */
    .footer-end-action {
      display: flex;
      align-items: center;
    }
    .btn-back-top {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.09);
      color: #94a3b8;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.18s ease;
    }
    .btn-back-top:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.2);
      color: #ffffff;
      transform: translateY(-1px);
    }
    .icon-sm {
      font-size: 14px;
      transition: transform 0.15s ease;
    }
    .btn-back-top:hover .icon-sm {
      transform: translateY(-2px);
    }

    /* Legal Sub-bar */
    .footer-legal-bar {
      margin-top: 1.25rem;
      padding-top: 1rem;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      font-size: 11px;
      color: #475569;
    }
    @media (min-width: 640px) {
      .footer-legal-bar {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
    }
    .legal-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .copyright-notice {
      color: #64748b;
    }
    .legal-tagline {
      color: #475569;
    }
    .dot-divider {
      color: #334155;
    }

    .legal-right {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      flex-wrap: wrap;
    }
    .sub-link {
      color: #64748b;
      text-decoration: none;
      transition: color 0.15s;
    }
    .sub-link:hover {
      color: #cbd5e1;
    }
  `]
})
export class FooterComponent {
  scrollToTop(): void {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
