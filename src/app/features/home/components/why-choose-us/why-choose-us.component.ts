import { Component } from '@angular/core';

@Component({
  selector: 'app-why-choose-us',
  standalone: true,
  template: `
    <section class="max-w-content why-choose-section">
      <div class="why-header-row">
        <div>
          <h2 class="why-title">Why Choose Find a Plot</h2>
          <p class="why-subtitle">
            Experience high-resolution drone tours, verified title deeds, and complete architectural dossiers before your site visit.
          </p>
        </div>
      </div>

      <!-- 4 Comparison Pillars Matrix -->
      <div class="pillars-grid">
        <!-- Pillar 1 -->
        <div class="pillar-card">
          <div class="pillar-body">
            <h3 class="pillar-name">Drone Tours &amp; Media Points</h3>
            <p class="pillar-text">
              Recharge micro-points from ₹100 via Razorpay. Browse standard photos free and unlock 4K video and drone walkthroughs permanently with full clarity.
            </p>
          </div>
        </div>

        <!-- Pillar 2 -->
        <div class="pillar-card">
          <div class="pillar-body">
            <h3 class="pillar-name">100% Guaranteed Deed Verification</h3>
            <p class="pillar-text">
              Concierge-guided inquiries backed by survey-verified Patta, Chitta, and 30-year Encumbrance certificates authenticated by legal specialists prior to display.
            </p>
          </div>
        </div>

        <!-- Pillar 3 -->
        <div class="pillar-card">
          <div class="pillar-body">
            <h3 class="pillar-name">Permanent Lifetime Access</h3>
            <p class="pillar-text">
              Points recharged through Razorpay never expire. Once you unlock a property's 4K walkthrough videos and drone surveys, they remain permanently viewable on your account.
            </p>
          </div>
        </div>

        <!-- Pillar 4 -->
        <div class="pillar-card">
          <div class="pillar-body">
            <h3 class="pillar-name">No Expiry Guarantee</h3>
            <p class="pillar-text">
              Points purchased never expire and can be used across Chennai, Bengaluru, Mumbai, and Hyderabad. Search seamlessly at your own pace.
            </p>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .why-choose-section {
      padding-top: 2.25rem;
      padding-bottom: 2.25rem;
      background: #ffffff;
      border-top: 1px solid var(--hairline-border);
    }
    @media (min-width: 640px) {
      .why-choose-section {
        padding-top: 4rem;
        padding-bottom: 4rem;
      }
    }
    .why-header-row {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-bottom: 1.75rem;
    }
    @media (min-width: 768px) {
      .why-header-row {
        flex-direction: row;
        align-items: flex-end;
        justify-content: space-between;
        gap: 1.5rem;
        margin-bottom: 1rem;
      }
    }
    .text-red { color: var(--brand-red); }
    .text-emerald { color: #047857; }
    .text-blue { color: #1e40af; }
    .text-amber { color: #92400e; }
    .bg-red { background: #fee2e2; }
    .bg-blue { background: #dbeafe; }
    .bg-amber { background: #fef3c7; }
    .bg-emerald { background: #d1fae5; }
    .why-title {
      font-size: 1.45rem;
      font-weight: 600;
      color: var(--text-slate-950);
      letter-spacing: -0.02em;
      margin-top: 0.25rem;
    }
    @media (min-width: 640px) {
      .why-title {
        font-size: 1.5rem;
      }
    }
    .why-subtitle {
      color: var(--text-slate-600);
      font-size: 0.95rem;
      margin-top: 0.5rem;
      max-width: 38rem;
      line-height: 1.6;
      letter-spacing: -0.01em;
    }
    .guarantee-badge {
      padding: 0.75rem 1rem;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 0.75rem;
      color: #064e3b;
      font-size: 12px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .guarantee-badge span.material-symbols-outlined {
      font-size: 20px;
    }
    .pillars-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }
    @media (min-width: 768px) {
      .pillars-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    @media (min-width: 1024px) {
      .pillars-grid {
        grid-template-columns: repeat(4, 1fr);
      }
    }
    .pillar-card {
      padding: 1.25rem 1rem;
      border-radius: 1rem;
      border: 1px solid #eff5fd;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    @media (min-width: 640px) {
      .pillar-card {
        padding: 1.5rem;
      }
    }
    .pillar-body {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .pillar-icon {
      width: 3rem;
      height: 3rem;
      border-radius: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .pillar-icon span {
      font-size: 26px;
    }
    .pillar-name {
      font-size: 1rem;
      font-weight: 500;
      color: var(--text-slate-950);
      line-height: 1.35;
    }
    .pillar-text {
      font-size: 13px;
      color: var(--text-slate-600);
      line-height: 1.65;
      letter-spacing: -0.005em;
    }
    .pillar-footer {
      margin-top: 1.5rem;
      padding-top: 1rem;
      border-top: 1px solid #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
      font-family: ui-monospace, monospace;
    }
    .footer-label {
      color: var(--text-slate-500);
      font-weight: 600;
    }
    .footer-pill {
      font-weight: 600;
      padding: 0.125rem 0.5rem;
      border-radius: 4px;
    }
    .emerald-pill {
      background: #ecfdf5;
      color: #047857;
    }
    .slate-pill {
      background: #f1f5f9;
      color: var(--text-slate-950);
    }
  `]
})
export class WhyChooseUsComponent { }
