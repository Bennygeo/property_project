import { Component } from '@angular/core';

@Component({
  selector: 'app-why-choose-us',
  standalone: true,
  template: `
    <section class="max-w-content why-choose-section">
      <div class="why-header-row">
        <div>
          <h2 class="why-title">Why Choose Find a Plot</h2>
          <div class="header-spectrum-rule" aria-hidden="true"></div>
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
            <div class="pillar-draft-hatch" aria-hidden="true"></div>
            <p class="pillar-text">
              Recharge micro-points from ₹100 via Razorpay. Browse standard photos free and unlock 4K video and drone walkthroughs permanently with full clarity.
            </p>
            <div class="pillar-checklist">
              <div class="check-item"><span class="check-arrow">→</span> Standard photos free</div>
              <div class="check-item"><span class="check-arrow">→</span> 4K aerial drone walkthroughs</div>
              <div class="check-item"><span class="check-arrow">→</span> Micro-points from ₹100</div>
            </div>
          </div>
        </div>

        <!-- Pillar 2 -->
        <div class="pillar-card">
          <div class="pillar-body">
            <h3 class="pillar-name">100% Guaranteed Deed Verification</h3>
            <div class="pillar-draft-hatch" aria-hidden="true"></div>
            <p class="pillar-text">
              Concierge-guided inquiries backed by survey-verified Patta, Chitta, and 30-year Encumbrance certificates authenticated by legal specialists prior to display.
            </p>
            <div class="pillar-checklist">
              <div class="check-item"><span class="check-arrow">→</span> Survey-verified Patta &amp; Chitta</div>
              <div class="check-item"><span class="check-arrow">→</span> 30-year Encumbrance check</div>
              <div class="check-item"><span class="check-arrow">→</span> Legal specialist authenticated</div>
            </div>
          </div>
        </div>

        <!-- Pillar 3 -->
        <div class="pillar-card">
          <div class="pillar-body">
            <h3 class="pillar-name">Permanent Lifetime Access</h3>
            <div class="pillar-draft-hatch" aria-hidden="true"></div>
            <p class="pillar-text">
              Points recharged through Razorpay never expire. Once you unlock a property's 4K walkthrough videos and drone surveys, they remain permanently viewable on your account.
            </p>
            <div class="pillar-checklist">
              <div class="check-item"><span class="check-arrow">→</span> Zero points expiration</div>
              <div class="check-item"><span class="check-arrow">→</span> Permanent account unlock</div>
              <div class="check-item"><span class="check-arrow">→</span> High-definition downloads</div>
            </div>
          </div>
        </div>

        <!-- Pillar 4 -->
        <div class="pillar-card">
          <div class="pillar-body">
            <h3 class="pillar-name">No Expiry Guarantee</h3>
            <div class="pillar-draft-hatch" aria-hidden="true"></div>
            <p class="pillar-text">
              Points purchased never expire and can be used across Chennai, Bengaluru, Mumbai, and Hyderabad. Search seamlessly at your own pace.
            </p>
            <div class="pillar-checklist">
              <div class="check-item"><span class="check-arrow">→</span> Multi-city wallet balance</div>
              <div class="check-item"><span class="check-arrow">→</span> Chennai, BLR, HYD, MUM</div>
              <div class="check-item"><span class="check-arrow">→</span> Zero broker commission</div>
            </div>
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
    .text-emerald { color: var(--brand-green, #5e8f72); }
    .text-blue { color: var(--brand-teal, #0f3b4a); }
    .text-amber { color: var(--brand-booked, #d5b357); }
    .bg-red { background: #fbf0ee; }
    .bg-blue { background: #eef3f5; }
    .bg-amber { background: #faf5e6; }
    .bg-emerald { background: #eef5f1; }
    .why-title {
      font-size: 1.5rem;
      font-weight: 500;
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
      font-size: 14px;
      margin-top: 0.5rem;
      max-width: 38rem;
      line-height: 1.6;
      letter-spacing: -0.01em;
    }
    .guarantee-badge {
      padding: 0.75rem 1rem;
      background: #eef5f1;
      border: 1px solid rgba(94, 143, 114, 0.35);
      border-radius: 0.75rem;
      color: #0f3b4a;
      font-size: 12px;
      font-weight: 500;
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
    .header-spectrum-rule {
      height: 3.5px;
      width: 140px;
      border-radius: 2px;
      margin: 0;
      background: linear-gradient(
        90deg,
        #dc3522 0%, #dc3522 16.66%,
        #f59e0b 16.66%, #f59e0b 33.33%,
        #84cc16 33.33%, #84cc16 50%,
        #0ea5e9 50%, #0ea5e9 66.66%,
        #94a3b8 66.66%, #94a3b8 83.33%,
        #334155 83.33%, #334155 100%
      );
    }

    .pillar-card {
      padding: 1.25rem 1.15rem;
      border-radius: 6px 20px 20px 20px !important;
      border: 1px solid #eeeeee;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: all 0.25s ease;
    }
    .pillar-card:hover {
      border-color: #cbd5e1;
      box-shadow: 0 6px 20px rgba(15, 23, 42, 0.04);
      transform: translateY(-2px);
    }

    .pillar-draft-hatch {
      height: 5px;
      width: 100%;
      margin: 6px 0 10px 0;
      background: repeating-linear-gradient(
        45deg,
        #e2e8f0,
        #e2e8f0 3px,
        transparent 3px,
        transparent 7px
      );
      opacity: 0.85;
    }

    .pillar-checklist {
      margin-top: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
      padding-top: 0.75rem;
      border-top: 1px solid #f1f5f9;
    }
    .check-item {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 12px;
      color: var(--text-slate-700, #334155);
      font-weight: 500;
      padding-bottom: 0.35rem;
      border-bottom: 1px solid #f8fafc;
    }
    .check-item:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .check-arrow {
      color: var(--brand-teal, #0f3b4a);
      font-weight: 700;
      font-size: 13px;
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
      font-size: 14px;
      font-weight: 500;
      color: var(--text-slate-950);
      line-height: 1.35;
    }
    .pillar-text {
      font-size: 14px;
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
      background: #eef5f1;
      color: var(--brand-green, #5e8f72);
    }
    .slate-pill {
      background: #f1f5f9;
      color: var(--text-slate-950);
    }
  `]
})
export class WhyChooseUsComponent { }
