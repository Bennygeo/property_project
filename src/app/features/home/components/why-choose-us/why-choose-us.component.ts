import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-why-choose-us',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="max-w-content why-choose-section">
      <!-- 1. Compact Header Row -->
      <div class="why-header-row">
        <div class="why-header-left">
          <h2 class="why-title">Why Choose Find a Plot</h2>
          <div class="header-spectrum-rule" aria-hidden="true"></div>
          <p class="why-lead">
            <strong class="why-lead-bold">Finding a plot is easy—choosing the right one isn't.</strong> Instead of weeks of site visits and sales pitches, our unbiased advisory team narrows many options down to the top few plots backed by real data.
          </p>
        </div>

        <div class="why-header-right">
          <div class="compact-summary-box">
            <div class="summary-heading">
              <span>From Many Plots to the Best Few</span>
            </div>
            <div class="summary-metrics">
              <div class="s-metric">
                <span class="s-val">Many → Few</span>
                <span class="s-lbl">Curated Shortlist</span>
              </div>
              <div class="s-sep" aria-hidden="true"></div>
              <div class="s-metric">
                <span class="s-val">100%</span>
                <span class="s-lbl">Unbiased Research</span>
              </div>
              <div class="s-sep" aria-hidden="true"></div>
              <div class="s-metric">
                <span class="s-val">8-Point</span>
                <span class="s-lbl">Investment Score</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. 6 Core Analysis Cards (3x2 on desktop) -->
      <div class="analysis-grid">
        <!-- Card 1: Location Analysis -->
        <div class="analysis-card">
          <div class="analysis-top">
            <h3 class="analysis-title">Location Analysis</h3>
            <span class="analysis-pill pill-theme-teal">Appreciation</span>
          </div>
          <p class="analysis-summary">Neighborhood &amp; connectivity check.</p>
          <div class="card-draft-hatch" aria-hidden="true"></div>
          <ul class="analysis-list">
            <li><svg class="check-arrow" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 6h9M6.5 2L10.5 6l-4 4"/></svg> Highways, schools &amp; hospitals</li>
            <li><svg class="check-arrow" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 6h9M6.5 2L10.5 6l-4 4"/></svg> Transit &amp; commercial hubs</li>
            <li><svg class="check-arrow" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 6h9M6.5 2L10.5 6l-4 4"/></svg> Metro, bypass &amp; airport plans</li>
          </ul>
        </div>

        <!-- Card 2: Legal Verification -->
        <div class="analysis-card">
          <div class="analysis-top">
            <h3 class="analysis-title">Legal Verification</h3>
            <span class="analysis-pill pill-theme-green">Zero Risk</span>
          </div>
          <p class="analysis-summary">Statutory &amp; title due diligence.</p>
          <div class="card-draft-hatch" aria-hidden="true"></div>
          <ul class="analysis-list">
            <li><svg class="check-arrow" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 6h9M6.5 2L10.5 6l-4 4"/></svg> RERA &amp; DTCP / CMDA approvals</li>
            <li><svg class="check-arrow" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 6h9M6.5 2L10.5 6l-4 4"/></svg> Parent deeds &amp; Patta check</li>
            <li><svg class="check-arrow" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 6h9M6.5 2L10.5 6l-4 4"/></svg> 30-yr EC &amp; Survey No. audit</li>
          </ul>
        </div>

        <!-- Card 3: Price Comparison -->
        <div class="analysis-card">
          <div class="analysis-top">
            <h3 class="analysis-title">Price Comparison</h3>
            <span class="analysis-pill pill-theme-booked">Fair Value</span>
          </div>
          <p class="analysis-summary">True market value benchmarking.</p>
          <div class="card-draft-hatch" aria-hidden="true"></div>
          <ul class="analysis-list">
            <li><svg class="check-arrow" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 6h9M6.5 2L10.5 6l-4 4"/></svg> Nearby SRO deed benchmarks</li>
            <li><svg class="check-arrow" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 6h9M6.5 2L10.5 6l-4 4"/></svg> Similar plot price comparison</li>
            <li><svg class="check-arrow" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 6h9M6.5 2L10.5 6l-4 4"/></svg> Historical &amp; future price trends</li>
          </ul>
        </div>

        <!-- Card 4: Site Evaluation -->
        <div class="analysis-card">
          <div class="analysis-top">
            <h3 class="analysis-title">Site Evaluation</h3>
            <span class="analysis-pill pill-theme-sold">Ground Check</span>
          </div>
          <p class="analysis-summary">On-site buildability &amp; risk check.</p>
          <div class="card-draft-hatch" aria-hidden="true"></div>
          <ul class="analysis-list">
            <li><svg class="check-arrow" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 6h9M6.5 2L10.5 6l-4 4"/></svg> Road width, access &amp; dimensions</li>
            <li><svg class="check-arrow" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 6h9M6.5 2L10.5 6l-4 4"/></svg> Corner, facing &amp; elevation</li>
            <li><svg class="check-arrow" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 6h9M6.5 2L10.5 6l-4 4"/></svg> Drainage, flood &amp; soil check</li>
          </ul>
        </div>

        <!-- Card 5: Future Growth -->
        <div class="analysis-card">
          <div class="analysis-top">
            <h3 class="analysis-title">Future Growth</h3>
            <span class="analysis-pill pill-theme-green">Capital Gains</span>
          </div>
          <p class="analysis-summary">Macro-development &amp; demand study.</p>
          <div class="card-draft-hatch" aria-hidden="true"></div>
          <ul class="analysis-list">
            <li><svg class="check-arrow" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 6h9M6.5 2L10.5 6l-4 4"/></svg> Govt. infra &amp; IT / industrial parks</li>
            <li><svg class="check-arrow" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 6h9M6.5 2L10.5 6l-4 4"/></svg> Schools &amp; commercial expansion</li>
            <li><svg class="check-arrow" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 6h9M6.5 2L10.5 6l-4 4"/></svg> Residential demand &amp; investments</li>
          </ul>
        </div>

        <!-- Card 6: Investment Score -->
        <div class="analysis-card">
          <div class="analysis-top">
            <h3 class="analysis-title">Investment Score</h3>
            <span class="analysis-pill pill-theme-teal">100-Pt Rating</span>
          </div>
          <p class="analysis-summary">Objective multi-parameter scorecard.</p>
          <div class="card-draft-hatch" aria-hidden="true"></div>
          <ul class="analysis-list">
            <li><svg class="check-arrow" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 6h9M6.5 2L10.5 6l-4 4"/></svg> Legal safety &amp; location quality</li>
            <li><svg class="check-arrow" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 6h9M6.5 2L10.5 6l-4 4"/></svg> Price fairness &amp; accessibility</li>
            <li><svg class="check-arrow" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 6h9M6.5 2L10.5 6l-4 4"/></svg> Readiness, livability &amp; ROI</li>
          </ul>
        </div>
      </div>

      <!-- 3. Compact Bottom Advisory Strip -->
      <div class="advisory-strip">
        <div class="advisory-strip-content">
          <h3 class="advisory-strip-title">Move from Confusion to Clarity — Independent Advice for Every Buyer</h3>
          <p class="advisory-strip-tags">
            <span>Plot Shortlisting</span> •
            <span>Comparative Analysis</span> •
            <span>Legal Guidance</span> •
            <span>Growth Report</span> •
            <span>Price &amp; Site Evaluation</span> •
            <span>1-on-1 Consultation</span>
          </p>
        </div>
        <a routerLink="/subscriptions" class="btn-advisory-primary">
          <span>Explore Advisory Packages</span>
          <span class="material-symbols-outlined btn-arrow">arrow_forward</span>
        </a>
      </div>
    </section>
  `,
  styles: [`
    .why-choose-section {
      padding-top: 2.5rem;
      padding-bottom: 3rem;
      background: #ffffff;
      border-top: 1px solid var(--hairline-border, #e2e8f0);
    }
    @media (min-width: 640px) {
      .why-choose-section {
        padding-top: 3.5rem;
        padding-bottom: 3.75rem;
      }
    }

    /* Theme-Derived Pill Badges (Architectural Design System Tokens) */
    .pill-theme-teal {
      background: #e4eff3;
      color: var(--brand-teal, #0f3b4a);
      border: 1px solid rgba(15, 59, 74, 0.18);
    }
    .pill-theme-green {
      background: var(--brand-green-subtle, #e5f7ec);
      color: var(--brand-green-dark, #2c4938);
      border: 1px solid rgba(94, 143, 114, 0.25);
    }
    .pill-theme-booked {
      background: #f7f0dc;
      color: #6e5719;
      border: 1px solid rgba(213, 179, 87, 0.25);
    }
    .pill-theme-sold {
      background: #fcece8;
      color: #7b3422;
      border: 1px solid rgba(199, 111, 86, 0.22);
    }

    /* 1. Header Row */
    .why-header-row {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    @media (min-width: 1024px) {
      .why-header-row {
        grid-template-columns: 1.25fr 0.75fr;
        align-items: center;
        gap: 2.5rem;
      }
    }

    .eyebrow-pill {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--brand-teal, #0f3b4a);
      margin-bottom: 0.65rem;
    }

    .why-title {
      font-size: 1.65rem;
      font-weight: 700;
      color: var(--text-slate-950, #020617);
      letter-spacing: -0.025em;
      line-height: 1.25;
      margin: 0;
    }
    @media (min-width: 640px) {
      .why-title {
        font-size: 2rem;
      }
    }

    .header-spectrum-rule {
      height: 3.5px;
      width: 140px;
      border-radius: 2px;
      margin: 0.85rem 0;
      background: linear-gradient(
        90deg,
        #dc3522 0%, #dc3522 16.66%,
        #f59e0b 16.66%, #f59e0b 33.33%,
        #84cc16 33.33%, #84cc16 50%,
        #0ea5e9 50%, #0ea5e9 66.66%,
        #94a3b8 66.66%, #94a3b8 83.33%,
        #0f3b4a 83.33%, #0f3b4a 100%
      );
    }

    .why-lead {
      color: var(--text-slate-600, #475569);
      font-size: 14.5px;
      line-height: 1.65;
      letter-spacing: -0.01em;
      margin: 0;
      max-width: 44rem;
    }
    .why-lead-bold {
      color: var(--text-slate-950, #020617);
      font-weight: 600;
    }

    /* Compact Summary Box */
    .compact-summary-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 1.25rem 1.35rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }
    .summary-heading {
      font-size: 13px;
      font-weight: 500;
      color: var(--brand-teal, #0f3b4a);
    }
    .summary-metrics {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 0.75rem;
      border-top: 1px solid #e2e8f0;
      gap: 0.5rem;
    }
    .s-metric {
      display: flex;
      flex-direction: column;
    }
    .s-val {
      font-size: 1rem;
      font-weight: 500;
      color: var(--brand-teal, #0f3b4a);
      line-height: 1.15;
    }
    .s-lbl {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      margin-top: 2px;
    }
    .s-sep {
      width: 1px;
      height: 26px;
      background: #cbd5e1;
    }

    /* 2. Analysis Grid (6 Cards) */
    .analysis-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.15rem;
      margin-bottom: 2rem;
    }
    @media (min-width: 640px) {
      .analysis-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    @media (min-width: 1024px) {
      .analysis-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    .analysis-card {
      background: #ffffff;
      border: 1px solid #f5f5f5;
      border-radius: 6px;
      padding: 1.15rem 1.25rem;
      display: flex;
      flex-direction: column;
    }

    .analysis-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.4rem;
    }
    .analysis-pill {
      font-size: 10.5px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
      letter-spacing: 0.02em;
      white-space: nowrap;
    }

    .analysis-title {
      font-size: 1rem;
      font-weight: 500;
      color: var(--text-slate-950, #020617);
      margin: 0;
      line-height: 1.3;
    }
    .analysis-summary {
      font-size: 13px;
      color: #64748b;
      line-height: 1.45;
      margin: 0 0 0.65rem 0;
    }

    .card-draft-hatch {
      height: 4px;
      width: 100%;
      margin-bottom: 0.65rem;
      background: repeating-linear-gradient(
        45deg,
        #e2e8f0,
        #e2e8f0 3px,
        transparent 3px,
        transparent 7px
      );
      opacity: 0.85;
    }

    .analysis-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .analysis-list li {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      font-size: 12.5px;
      color: #334155;
      line-height: 1.4;
    }
    .check-arrow {
      color: var(--brand-teal, #0f3b4a);
      width: 11px;
      height: 11px;
      min-width: 11px;
      margin-top: 3px;
      flex-shrink: 0;
      display: inline-block;
    }

    /* 3. Compact Bottom Advisory Strip (Architectural Signature Asymmetric Radius) */
    .advisory-strip {
      background: var(--brand-teal);
      border-radius: 6px 20px 20px 20px !important;
      padding: 1.5rem 1.75rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      color: #ffffff;
      position: relative;
      overflow: hidden;
    }
    @media (min-width: 1024px) {
      .advisory-strip {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        padding: 1.75rem 2.25rem;
      }
    }
    .advisory-strip::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
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
    .advisory-strip-content {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .advisory-strip-title {
      font-size: 1rem;
      font-weight: 500;
      color: #ffffff;
      margin: 0;
      letter-spacing: -0.01em;
    }
    .advisory-strip-tags {
      font-size: 12px;
      color: white;
      margin: 0;
      line-height: 1.5;
    }
    .advisory-strip-tags span {
      font-weight: 500;
      color: #e2e8f0;
    }

    .btn-advisory-primary {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: #ffffff;
      color: #0f3b4a;
      font-size: 14px;
      font-weight: 600;
      padding: 0.55rem 1.2rem;
      border-radius: 6px 14px 14px 14px !important;
      text-decoration: none;
      white-space: nowrap;
    }
    .btn-advisory-primary .btn-arrow {
      font-size: 18px;
      transition: transform 0.2s ease;
    }
    .btn-advisory-primary:hover .btn-arrow {
      transform: translateX(3px);
    }
  `]
})
export class WhyChooseUsComponent { }
