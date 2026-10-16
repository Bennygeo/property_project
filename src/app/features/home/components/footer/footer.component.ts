import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  template: `
    <footer class="main-footer">
      <div class="max-w-content footer-inner">
        <!-- Top Footer Row: Brand & Accreditations -->
        <div class="footer-top-row">
          <div class="footer-brand">
            <img 
              alt="Mannidam Logo" 
              class="footer-logo" 
              src="/logo.svg">
            <div>
              <div class="footer-title">MANNIDAM</div>
              <div class="footer-subtitle">Architectural Real Estate Registry • Zero Brokerage Marketplace</div>
            </div>
          </div>

          <div class="footer-top-actions">
            <div class="rera-pill">
              <span class="text-emerald font-bold">TN/RERA/A/00142/2023</span> • MahaRERA: A51900021334
            </div>
            <a class="btn-post-free" href="#">Post Property FREE</a>
          </div>
        </div>

        <!-- 5-Column Sitemap Links Grid -->
        <div class="footer-links-grid">
          <!-- Col 1 -->
          <div class="link-col">
            <h4 class="col-heading">Primary Metros</h4>
            <ul class="col-list">
              <li><a href="#">Properties in Chennai</a></li>
              <li><a href="#">Flats in Bengaluru</a></li>
              <li><a href="#">Villas in Hyderabad</a></li>
              <li><a href="#">Commercial in Mumbai</a></li>
              <li><a href="#">Plots in Delhi NCR</a></li>
              <li><a href="#">Beachfront in ECR</a></li>
            </ul>
          </div>

          <!-- Col 2 -->
          <div class="link-col">
            <h4 class="col-heading">Property Types</h4>
            <ul class="col-list">
              <li><a href="#">Luxury Penthouses</a></li>
              <li><a href="#">Gated Community Villas</a></li>
              <li><a href="#">CMDA Sanctioned Plots</a></li>
              <li><a href="#">Zero Brokerage Rentals</a></li>
              <li><a href="#">Grade-A IT Parks</a></li>
              <li><a href="#">Commercial Retail SCO</a></li>
            </ul>
          </div>

          <!-- Col 3 -->
          <div class="link-col">
            <h4 class="col-heading">Points &amp; Services</h4>
            <ul class="col-list">
              <li><a href="#pricing">Buy Point Packs</a></li>
              <li><a href="#">Online Rental Agreement</a></li>
              <li><a href="#">30-Yr Legal Title Check</a></li>
              <li><a href="#">Laser Carpet Area Audit</a></li>
              <li><a href="#">Sub-Registrar SRO Assistance</a></li>
              <li><a href="#">Property Valuation Tool</a></li>
            </ul>
          </div>

          <!-- Col 4 -->
          <div class="link-col">
            <h4 class="col-heading">The Bhūmi Protocol</h4>
            <ul class="col-list">
              <li><a href="#">Cadastral Clearing Rules</a></li>
              <li><a href="#">RERA Disclosures</a></li>
              <li><a href="#">Encumbrance Certificate Guide</a></li>
              <li><a href="#">Patta &amp; Chitta Verification</a></li>
              <li><a href="#">Point Refund Guarantee</a></li>
              <li><a href="#">Privacy &amp; Masked Numbers</a></li>
            </ul>
          </div>

          <!-- Col 5: Concierge Desk -->
          <div class="link-col concierge-col">
            <h4 class="col-heading">Concierge Desk</h4>
            <p class="concierge-desc">
              Direct cadastral inquiry &amp; title verification desk:
            </p>
            <div class="toll-number">1800-419-MANNIDAM</div>
            <div class="hours-text">Toll-Free, Mon–Sun (9 AM – 9 PM IST)</div>
            <div class="wa-box">
              <a 
                class="wa-footer-link" 
                href="https://wa.me/919444100000" 
                target="_blank" 
                rel="noopener">
                <span class="material-symbols-outlined">chat</span>
                <span>WhatsApp Registry</span>
              </a>
            </div>
          </div>
        </div>

        <!-- Bottom Copyright Row -->
        <div class="footer-bottom-row">
          <div class="copyright-text">
            © 2025 Mannidam Real Estate Marketplace Ltd. Registered under TN RERA &amp; CMDA. All rights reserved.
          </div>
          <div class="legal-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Exchange</a>
            <a href="#">Sitemap</a>
          </div>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .main-footer {
      width: 100%;
      background-color: #020617;
      color: #cbd5e1;
      border-top: 1px solid #1e293b;
    }
    .footer-inner {
      padding-top: 4rem;
      padding-bottom: 4rem;
    }
    .footer-top-row {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding-bottom: 3rem;
      border-bottom: 1px solid #1e293b;
    }
    @media (min-width: 1024px) {
      .footer-top-row {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
    }
    .footer-brand {
      display: flex;
      align-items: center;
      gap: 0.875rem;
    }
    .footer-logo {
      height: 36px;
      width: auto;
      object-fit: contain;
    }
    .footer-title {
      font-size: 1.125rem;
      font-weight: 900;
      color: #ffffff;
      letter-spacing: 0.15em;
    }
    .footer-subtitle {
      font-size: 12px;
      color: #94a3b8;
      font-weight: 600;
    }
    .footer-top-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .rera-pill {
      padding: 0.5rem 1rem;
      border-radius: 0.75rem;
      background: #0f172a;
      border: 1px solid #1e293b;
      font-size: 12px;
      font-family: ui-monospace, monospace;
      color: #cbd5e1;
    }
    .text-emerald {
      color: #34d399;
    }
    .font-bold {
      font-weight: 700;
    }
    .btn-post-free {
      padding: 0.5rem 1rem;
      border-radius: 0.75rem;
      background: var(--brand-red);
      color: #ffffff;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      text-decoration: none;
      transition: background 0.15s;
    }
    .btn-post-free:hover {
      background: var(--brand-red-hover);
    }
    .footer-links-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 2rem;
      padding-top: 3rem;
      padding-bottom: 3rem;
      border-bottom: 1px solid #1e293b;
      font-size: 12px;
    }
    @media (min-width: 768px) {
      .footer-links-grid {
        grid-template-columns: repeat(4, 1fr);
      }
    }
    @media (min-width: 1024px) {
      .footer-links-grid {
        grid-template-columns: repeat(5, 1fr);
      }
    }
    .link-col {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .col-heading {
      font-weight: 700;
      color: #ffffff;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-size: 11px;
    }
    .col-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .col-list a {
      color: #94a3b8;
      text-decoration: none;
      font-weight: 500;
      transition: color 0.15s;
    }
    .col-list a:hover {
      color: #ffffff;
    }
    .concierge-col {
      grid-column: span 2;
    }
    @media (min-width: 1024px) {
      .concierge-col {
        grid-column: span 1;
      }
    }
    .concierge-desc {
      color: #94a3b8;
      line-height: 1.5;
    }
    .toll-number {
      font-family: ui-monospace, monospace;
      color: #ffffff;
      font-weight: 800;
      font-size: 14px;
    }
    .hours-text {
      color: #94a3b8;
      font-size: 11px;
    }
    .wa-box {
      margin-top: 0.5rem;
    }
    .wa-footer-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 0.375rem 0.75rem;
      border-radius: 8px;
      background: rgba(16, 185, 129, 0.2);
      color: #6ee7b7;
      border: 1px solid rgba(16, 185, 129, 0.3);
      font-size: 12px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.15s;
    }
    .wa-footer-link:hover {
      background: rgba(16, 185, 129, 0.3);
    }
    .wa-footer-link span.material-symbols-outlined {
      font-size: 16px;
    }
    .footer-bottom-row {
      padding-top: 2rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      font-size: 12px;
      color: #64748b;
    }
    @media (min-width: 640px) {
      .footer-bottom-row {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
    }
    .legal-links {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      font-weight: 500;
    }
    .legal-links a {
      color: #64748b;
      text-decoration: none;
      transition: color 0.15s;
    }
    .legal-links a:hover {
      color: #ffffff;
    }
  `]
})
export class FooterComponent {}
