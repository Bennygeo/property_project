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
          <div class="eyebrow-pill">
            <span>WHY CHOOSE FINDAPLOT</span>
          </div>
          <h2 class="why-title">Don't Just Buy a Plot. Buy the Right Plot.</h2>
          <div class="header-spectrum-rule" aria-hidden="true"></div>
          <p class="why-lead">
            Finding a plot is easy—choosing the right one isn't. Instead of weeks of site visits and sales pitches, our unbiased advisory team narrows many options down to the top few plots backed by real data.
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
            <span class="analysis-pill bg-blue-tint text-blue">Appreciation</span>
          </div>
          <p class="analysis-summary">Neighborhood &amp; connectivity check.</p>
          <div class="card-draft-hatch" aria-hidden="true"></div>
          <ul class="analysis-list">
            <li><span class="check-arrow">→</span> Highways, schools &amp; hospitals</li>
            <li><span class="check-arrow">→</span> Transit &amp; commercial hubs</li>
            <li><span class="check-arrow">→</span> Metro, bypass &amp; airport plans</li>
          </ul>
        </div>

        <!-- Card 2: Legal Verification -->
        <div class="analysis-card">
          <div class="analysis-top">
            <h3 class="analysis-title">Legal Verification</h3>
            <span class="analysis-pill bg-emerald-tint text-emerald">Zero Risk</span>
          </div>
          <p class="analysis-summary">Statutory &amp; title due diligence.</p>
          <div class="card-draft-hatch" aria-hidden="true"></div>
          <ul class="analysis-list">
            <li><span class="check-arrow">→</span> RERA &amp; DTCP / CMDA approvals</li>
            <li><span class="check-arrow">→</span> Parent deeds &amp; Patta check</li>
            <li><span class="check-arrow">→</span> 30-yr EC &amp; Survey No. audit</li>
          </ul>
        </div>

        <!-- Card 3: Price Comparison -->
        <div class="analysis-card">
          <div class="analysis-top">
            <h3 class="analysis-title">Price Comparison</h3>
            <span class="analysis-pill bg-amber-tint text-amber">Fair Value</span>
          </div>
          <p class="analysis-summary">True market value benchmarking.</p>
          <div class="card-draft-hatch" aria-hidden="true"></div>
          <ul class="analysis-list">
            <li><span class="check-arrow">→</span> Nearby SRO deed benchmarks</li>
            <li><span class="check-arrow">→</span> Similar plot price comparison</li>
            <li><span class="check-arrow">→</span> Historical &amp; future price trends</li>
          </ul>
        </div>

        <!-- Card 4: Site Evaluation -->
        <div class="analysis-card">
          <div class="analysis-top">
            <h3 class="analysis-title">Site Evaluation</h3>
            <span class="analysis-pill bg-purple-tint text-purple">Ground Check</span>
          </div>
          <p class="analysis-summary">On-site buildability &amp; risk check.</p>
          <div class="card-draft-hatch" aria-hidden="true"></div>
          <ul class="analysis-list">
            <li><span class="check-arrow">→</span> Road width, access &amp; dimensions</li>
            <li><span class="check-arrow">→</span> Corner, facing &amp; elevation</li>
            <li><span class="check-arrow">→</span> Drainage, flood &amp; soil check</li>
          </ul>
        </div>

        <!-- Card 5: Future Growth -->
        <div class="analysis-card">
          <div class="analysis-top">
            <h3 class="analysis-title">Future Growth</h3>
            <span class="analysis-pill bg-emerald-tint text-emerald">Capital Gains</span>
          </div>
          <p class="analysis-summary">Macro-development &amp; demand study.</p>
          <div class="card-draft-hatch" aria-hidden="true"></div>
          <ul class="analysis-list">
            <li><span class="check-arrow">→</span> Govt. infra &amp; IT / industrial parks</li>
            <li><span class="check-arrow">→</span> Schools &amp; commercial expansion</li>
            <li><span class="check-arrow">→</span> Residential demand &amp; investments</li>
          </ul>
        </div>

        <!-- Card 6: Investment Score -->
        <div class="analysis-card">
          <div class="analysis-top">
            <h3 class="analysis-title">Investment Score</h3>
            <span class="analysis-pill bg-blue-tint text-blue">100-Pt Rating</span>
          </div>
          <p class="analysis-summary">Objective multi-parameter scorecard.</p>
          <div class="card-draft-hatch" aria-hidden="true"></div>
          <ul class="analysis-list">
            <li><span class="check-arrow">→</span> Legal safety &amp; location quality</li>
            <li><span class="check-arrow">→</span> Price fairness &amp; accessibility</li>
            <li><span class="check-arrow">→</span> Readiness, livability &amp; ROI</li>
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

    /* Colors */
    .text-teal { color: var(--brand-teal, #0f3b4a); }
    .text-emerald { color: #059669; }
    .text-blue { color: #0284c7; }
    .text-amber { color: #d97706; }
    .text-purple { color: #7c3aed; }

    .bg-blue-tint { background: #e0f2fe; }
    .bg-emerald-tint { background: #d1fae5; }
    .bg-amber-tint { background: #fef3c7; }
    .bg-purple-tint { background: #f3e8ff; }

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
      font-size: 13.5px;
      font-weight: 700;
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
      font-size: 1.15rem;
      font-weight: 800;
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
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 1.15rem 1.25rem;
      display: flex;
      flex-direction: column;
      transition: all 0.2s ease;
    }
    .analysis-card:hover {
      border-color: #cbd5e1;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
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
      font-size: 1.025rem;
      font-weight: 700;
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
      font-weight: 700;
      font-size: 13px;
    }

    /* 3. Compact Bottom Advisory Strip */
    .advisory-strip {
      background: #0f3b4a;
      border-radius: 6px;
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      color: #ffffff;
    }
    @media (min-width: 1024px) {
      .advisory-strip {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        padding: 1.35rem 1.75rem;
      }
    }
    .advisory-strip-content {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .advisory-strip-title {
      font-size: 1.05rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0;
      letter-spacing: -0.01em;
    }
    .advisory-strip-tags {
      font-size: 12.5px;
      color: #cbd5e1;
      margin: 0;
      line-height: 1.5;
    }
    .advisory-strip-tags span {
      font-weight: 600;
      color: #e2e8f0;
    }

    .btn-advisory-primary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: #ffffff;
      color: #0f3b4a;
      font-size: 13px;
      font-weight: 700;
      padding: 0.65rem 1.25rem;
      border-radius: 4px;
      text-decoration: none;
      white-space: nowrap;
      transition: background 0.15s ease;
    }
    .btn-advisory-primary:hover {
      background: #f1f5f9;
    }
  `]
})
export class WhyChooseUsComponent {}
