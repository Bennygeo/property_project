import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-why-choose-us',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="max-w-content why-choose-section">
      <!-- 1. Header & Value Proposition -->
      <div class="why-header-row">
        <div class="why-header-left">
          <div class="eyebrow-pill">
            <span class="material-symbols-outlined text-teal">verified_user</span>
            <span>WHY CHOOSE FINDAPLOT</span>
          </div>
          <h2 class="why-title">Don't Just Buy a Plot. Buy the Right Plot.</h2>
          <div class="header-spectrum-rule" aria-hidden="true"></div>
          <p class="why-lead">
            Finding a plot is easy. Choosing the right one isn't. In any growing locality, there may be 30, 50, or even hundreds of plots that appear attractive. Prices may look similar, marketing promises may sound convincing, and every seller claims their property is the best.
          </p>
          <p class="why-lead-sub">
            <strong>But not every plot offers the same future value.</strong> That's where FindAPlot comes in. We perform detailed, unbiased analysis of every shortlisted plot so you can make an informed investment decision with confidence.
          </p>
        </div>

        <div class="why-header-right">
          <div class="research-highlight-card">
            <div class="research-badge">
              <span class="material-symbols-outlined text-emerald">insights</span>
              <span>DATA-BACKED ADVISORY</span>
            </div>
            <h3 class="research-title">We Do the Research So You Don't Have To</h3>
            <p class="research-desc">
              Buying land requires much more than checking the price. Our advisory team evaluates every critical factor before recommending a plot. Instead of visiting dozens of properties and spending weeks comparing options, you receive a professionally researched shortlist that's based on real data—not sales pitches.
            </p>
            <div class="research-stats-strip">
              <div class="r-stat">
                <span class="r-num">100%</span>
                <span class="r-label">Unbiased Research</span>
              </div>
              <div class="r-stat-sep" aria-hidden="true"></div>
              <div class="r-stat">
                <span class="r-num">0%</span>
                <span class="r-label">Broker Pressure</span>
              </div>
              <div class="r-stat-sep" aria-hidden="true"></div>
              <div class="r-stat">
                <span class="r-num">8+</span>
                <span class="r-label">Audit Parameters</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. "From 50 Plots to the Best Few" Comparison Banner -->
      <div class="curation-banner">
        <div class="curation-content">
          <div class="curation-icon-box">
            <span class="material-symbols-outlined">filter_alt</span>
          </div>
          <div class="curation-text-block">
            <h3 class="curation-heading">From 50 Plots to the Best Few</h3>
            <p class="curation-subtext">
              Imagine entering a location where there are 50 available plots. Instead of asking, <em>"Which plot should I buy?"</em>, we answer: <strong>"These are the 3–5 plots that truly stand out—and here's exactly why."</strong> Our advisors eliminate unsuitable options and highlight the strongest opportunities based on detailed analysis, saving you time and eliminating costly uncertainty.
            </p>
          </div>
        </div>
        <div class="unbiased-chip">
          <span class="material-symbols-outlined text-emerald">shield_check</span>
          <div class="unbiased-text">
            <strong>Independent &amp; Unbiased Advice</strong>
            <span>Unlike traditional brokers, our focus is not on pushing a specific property. Your interests come first.</span>
          </div>
        </div>
      </div>

      <!-- 3. Our Deep Plot Analysis Includes (6 Core Evaluation Pillars) -->
      <div class="section-subheading-row">
        <div>
          <h3 class="subheading-title">Our Deep Plot Analysis Includes</h3>
          <p class="subheading-desc">A rigorous multi-disciplinary evaluation of every shortlisted property before any recommendation.</p>
        </div>
        <span class="subheading-tag">6-DIMENSIONAL AUDIT FRAMEWORK</span>
      </div>

      <div class="analysis-grid">
        <!-- Pillar 1: Location Analysis -->
        <div class="analysis-card">
          <div class="analysis-top">
            <div class="analysis-icon bg-blue">
              <span class="material-symbols-outlined text-blue">share_location</span>
            </div>
            <span class="analysis-outcome-pill bg-blue-tint text-blue">Appreciation Potential</span>
          </div>
          <h4 class="analysis-title">Location Analysis</h4>
          <p class="analysis-summary">
            We evaluate the surrounding neighborhood and future growth potential to identify locations that have stronger appreciation.
          </p>
          <div class="card-draft-hatch" aria-hidden="true"></div>
          <ul class="analysis-list">
            <li><span class="bullet-check">✓</span> Connectivity to highways &amp; major arterial roads</li>
            <li><span class="bullet-check">✓</span> Access to schools, colleges &amp; nearby hospitals</li>
            <li><span class="bullet-check">✓</span> Shopping, commercial areas &amp; public transportation</li>
            <li><span class="bullet-check">✓</span> Metro, bypass, airport &amp; road expansion plans</li>
          </ul>
        </div>

        <!-- Pillar 2: Legal Verification -->
        <div class="analysis-card">
          <div class="analysis-top">
            <div class="analysis-icon bg-emerald">
              <span class="material-symbols-outlined text-emerald">gavel</span>
            </div>
            <span class="analysis-outcome-pill bg-emerald-tint text-emerald">Reduced Legal Risk</span>
          </div>
          <h4 class="analysis-title">Legal Verification</h4>
          <p class="analysis-summary">
            Before recommending a plot, our legal advisory team verifies available statutory records to eliminate legal surprises.
          </p>
          <div class="card-draft-hatch" aria-hidden="true"></div>
          <ul class="analysis-list">
            <li><span class="bullet-check">✓</span> RERA registration (where applicable)</li>
            <li><span class="bullet-check">✓</span> DTCP / CMDA / Local Authority layout approvals</li>
            <li><span class="bullet-check">✓</span> Parent documents &amp; registered Patta details</li>
            <li><span class="bullet-check">✓</span> 30-year Encumbrance status &amp; Survey No. audit</li>
          </ul>
        </div>

        <!-- Pillar 3: Price Comparison -->
        <div class="analysis-card">
          <div class="analysis-top">
            <div class="analysis-icon bg-amber">
              <span class="material-symbols-outlined text-amber">price_check</span>
            </div>
            <span class="analysis-outcome-pill bg-amber-tint text-amber">Fair Market Value</span>
          </div>
          <h4 class="analysis-title">Price Comparison</h4>
          <p class="analysis-summary">
            Not every plot is fairly priced. We compare asking prices against actual registration data to ensure you don't overpay.
          </p>
          <div class="card-draft-hatch" aria-hidden="true"></div>
          <ul class="analysis-list">
            <li><span class="bullet-check">✓</span> Benchmark against nearby registered SRO deeds</li>
            <li><span class="bullet-check">✓</span> Direct comparison with similar plots in the locality</li>
            <li><span class="bullet-check">✓</span> Historical price trends &amp; compound appreciation</li>
            <li><span class="bullet-check">✓</span> Future pricing runway &amp; risk-adjusted valuation</li>
          </ul>
        </div>

        <!-- Pillar 4: Site Evaluation -->
        <div class="analysis-card">
          <div class="analysis-top">
            <div class="analysis-icon bg-purple">
              <span class="material-symbols-outlined text-purple">architecture</span>
            </div>
            <span class="analysis-outcome-pill bg-purple-tint text-purple">Ground Reality Check</span>
          </div>
          <h4 class="analysis-title">Site Evaluation</h4>
          <p class="analysis-summary">
            A plot may look attractive online but have hidden disadvantages. We evaluate practical factors impacting usability and resale.
          </p>
          <div class="card-draft-hatch" aria-hidden="true"></div>
          <ul class="analysis-list">
            <li><span class="bullet-check">✓</span> Physical road width, approach &amp; clear frontage</li>
            <li><span class="bullet-check">✓</span> Plot dimensions, corner advantage &amp; cardinal facing</li>
            <li><span class="bullet-check">✓</span> Elevation, storm water drainage &amp; flood safety</li>
            <li><span class="bullet-check">✓</span> Soil condition, water table &amp; ease of construction</li>
          </ul>
        </div>

        <!-- Pillar 5: Future Growth Potential -->
        <div class="analysis-card">
          <div class="analysis-top">
            <div class="analysis-icon bg-emerald">
              <span class="material-symbols-outlined text-emerald">trending_up</span>
            </div>
            <span class="analysis-outcome-pill bg-emerald-tint text-emerald">Capital Growth Runway</span>
          </div>
          <h4 class="analysis-title">Future Growth Potential</h4>
          <p class="analysis-summary">
            Our team studies master development plans around the locality to identify areas with superior appreciation opportunities.
          </p>
          <div class="card-draft-hatch" aria-hidden="true"></div>
          <ul class="analysis-list">
            <li><span class="bullet-check">✓</span> Upcoming government infra &amp; connectivity corridors</li>
            <li><span class="bullet-check">✓</span> New industrial developments, SEZs &amp; IT corridors</li>
            <li><span class="bullet-check">✓</span> Emerging educational institutions &amp; retail expansion</li>
            <li><span class="bullet-check">✓</span> Inflowing residential demand &amp; institutional capital</li>
          </ul>
        </div>

        <!-- Pillar 6: Investment Score -->
        <div class="analysis-card">
          <div class="analysis-top">
            <div class="analysis-icon bg-blue">
              <span class="material-symbols-outlined text-blue">fact_check</span>
            </div>
            <span class="analysis-outcome-pill bg-blue-tint text-blue">Objective Rating Matrix</span>
          </div>
          <h4 class="analysis-title">Investment Score</h4>
          <p class="analysis-summary">
            Every shortlisted plot receives a comprehensive composite rating based on multiple parameters, making comparison simple and objective.
          </p>
          <div class="card-draft-hatch" aria-hidden="true"></div>
          <ul class="analysis-list">
            <li><span class="bullet-check">✓</span> Legal Safety &amp; Title Clarity index</li>
            <li><span class="bullet-check">✓</span> Location Quality &amp; Multi-modal Accessibility</li>
            <li><span class="bullet-check">✓</span> Price Fairness &amp; Construction Readiness</li>
            <li><span class="bullet-check">✓</span> Livability rating &amp; 5-year Investment Potential</li>
          </ul>
        </div>
      </div>

      <!-- 4. Advisory Packages Designed for Every Buyer -->
      <div class="packages-container">
        <div class="packages-header">
          <div class="packages-header-left">
            <span class="packages-eyebrow">TAILORED EXPERTISE</span>
            <h3 class="packages-title">Advisory Packages Designed for Every Buyer</h3>
            <p class="packages-subtitle">
              Whether you're buying your first plot, investing for appreciation, or planning to build your dream home, our advisory packages provide the exact level of analysis you need.
            </p>
          </div>
          <div class="packages-cta-box">
            <a routerLink="/subscriptions" class="btn-advisory-primary">
              <span>View Advisory Packages</span>
              <span class="material-symbols-outlined">arrow_forward</span>
            </a>
            <a routerLink="/search" class="btn-advisory-secondary">
              <span>Browse Verified Registry</span>
            </a>
          </div>
        </div>

        <div class="services-chips-grid">
          <div class="service-chip">
            <span class="material-symbols-outlined text-teal">checklist</span>
            <span>Plot Shortlisting</span>
          </div>
          <div class="service-chip">
            <span class="material-symbols-outlined text-teal">compare_arrows</span>
            <span>Comparative Analysis</span>
          </div>
          <div class="service-chip">
            <span class="material-symbols-outlined text-teal">policy</span>
            <span>Legal Due Diligence Guidance</span>
          </div>
          <div class="service-chip">
            <span class="material-symbols-outlined text-teal">monitoring</span>
            <span>Location Growth Report</span>
          </div>
          <div class="service-chip">
            <span class="material-symbols-outlined text-teal">payments</span>
            <span>Price Evaluation</span>
          </div>
          <div class="service-chip">
            <span class="material-symbols-outlined text-teal">explore</span>
            <span>Site Assessment</span>
          </div>
          <div class="service-chip">
            <span class="material-symbols-outlined text-teal">star_rate</span>
            <span>Investment Recommendation</span>
          </div>
          <div class="service-chip">
            <span class="material-symbols-outlined text-teal">support_agent</span>
            <span>1-on-1 Expert Consultation</span>
          </div>
        </div>
      </div>

      <!-- 5. Reassurance & Mission Statement Quote Card -->
      <div class="mission-callout-card">
        <div class="mission-icon-quote">
          <span class="material-symbols-outlined text-teal">format_quote</span>
        </div>
        <div class="mission-body">
          <h4 class="mission-heading">Why Thousands of Buyers Need Plot Advisory</h4>
          <p class="mission-quote">
            "Buying land is often a once-in-a-lifetime investment. A wrong decision can lead to legal complications, poor appreciation, or construction challenges. With FindAPlot, you gain the confidence of making your decision based on facts, research, and expert evaluation—not assumptions."
          </p>
          <div class="mission-footer-row">
            <div class="mission-brand">
              <span class="brand-badge-dot"></span>
              <span class="brand-strong">FindAPlot Advisory Intelligence</span>
              <span class="brand-tagline">— Move from confusion to clarity. Don't just buy a plot, buy the right one.</span>
            </div>
            <a routerLink="/subscriptions" class="mission-link">
              <span>Choose Your Advisory Package</span>
              <span class="material-symbols-outlined">arrow_forward</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .why-choose-section {
      padding-top: 2.75rem;
      padding-bottom: 3.5rem;
      background: #ffffff;
      border-top: 1px solid var(--hairline-border, #e2e8f0);
    }
    @media (min-width: 640px) {
      .why-choose-section {
        padding-top: 4.5rem;
        padding-bottom: 4.5rem;
      }
    }

    /* Colors */
    .text-teal { color: var(--brand-teal, #0f3b4a); }
    .text-emerald { color: #059669; }
    .text-blue { color: #0284c7; }
    .text-amber { color: #d97706; }
    .text-purple { color: #7c3aed; }

    .bg-blue { background: #f0f9ff; }
    .bg-emerald { background: #ecfdf5; }
    .bg-amber { background: #fffbeb; }
    .bg-purple { background: #faf5ff; }

    .bg-blue-tint { background: #e0f2fe; }
    .bg-emerald-tint { background: #d1fae5; }
    .bg-amber-tint { background: #fef3c7; }
    .bg-purple-tint { background: #f3e8ff; }

    /* Header Row */
    .why-header-row {
      display: grid;
      grid-template-columns: 1fr;
      gap: 2rem;
      margin-bottom: 2.5rem;
    }
    @media (min-width: 1024px) {
      .why-header-row {
        grid-template-columns: 1.15fr 0.85fr;
        align-items: center;
        gap: 3rem;
      }
    }

    .eyebrow-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--brand-teal, #0f3b4a);
      margin-bottom: 0.75rem;
    }
    .eyebrow-pill span.material-symbols-outlined {
      font-size: 15px;
    }

    .why-title {
      font-size: 1.85rem;
      font-weight: 700;
      color: var(--text-slate-950, #020617);
      letter-spacing: -0.025em;
      line-height: 1.25;
      margin-top: 0.25rem;
    }
    @media (min-width: 640px) {
      .why-title {
        font-size: 2.35rem;
      }
    }

    .header-spectrum-rule {
      height: 3.5px;
      width: 140px;
      border-radius: 2px;
      margin: 1rem 0;
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
      color: var(--text-slate-700, #334155);
      font-size: 15px;
      line-height: 1.7;
      letter-spacing: -0.01em;
      margin-bottom: 0.75rem;
    }
    .why-lead-sub {
      color: var(--text-slate-600, #475569);
      font-size: 14px;
      line-height: 1.65;
    }
    .why-lead-sub strong {
      color: var(--brand-teal, #0f3b4a);
    }

    /* Research Highlight Card */
    .research-highlight-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      position: relative;
    }
    .research-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: #059669;
    }
    .research-badge span.material-symbols-outlined {
      font-size: 16px;
    }
    .research-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text-slate-950, #020617);
      line-height: 1.35;
      margin: 0;
    }
    .research-desc {
      font-size: 13.5px;
      color: var(--text-slate-600, #475569);
      line-height: 1.6;
      margin: 0;
    }

    .research-stats-strip {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 1rem;
      margin-top: 0.5rem;
      border-top: 1px solid #e2e8f0;
    }
    .r-stat {
      display: flex;
      flex-direction: column;
    }
    .r-num {
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--brand-teal, #0f3b4a);
      line-height: 1.1;
    }
    .r-label {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      margin-top: 2px;
    }
    .r-stat-sep {
      width: 1px;
      height: 28px;
      background: #cbd5e1;
    }

    /* 2. Curation Banner */
    .curation-banner {
      background: #0f3b4a;
      border-radius: 6px;
      padding: 1.5rem 1.75rem;
      margin-bottom: 3rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      color: #ffffff;
    }
    @media (min-width: 1024px) {
      .curation-banner {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        padding: 1.75rem 2rem;
      }
    }
    .curation-content {
      display: flex;
      align-items: flex-start;
      gap: 1.25rem;
      flex: 1;
    }
    .curation-icon-box {
      width: 44px;
      height: 44px;
      min-width: 44px;
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #38bdf8;
    }
    .curation-icon-box span {
      font-size: 24px;
    }
    .curation-text-block {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .curation-heading {
      font-size: 1.15rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0;
      letter-spacing: -0.01em;
    }
    .curation-subtext {
      font-size: 13.5px;
      color: #e2e8f0;
      line-height: 1.6;
      margin: 0;
      max-width: 48rem;
    }
    .curation-subtext strong {
      color: #38bdf8;
    }
    .curation-subtext em {
      color: #94a3b8;
      font-style: italic;
    }

    .unbiased-chip {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 6px;
      padding: 0.85rem 1.15rem;
      display: flex;
      align-items: center;
      gap: 10px;
      max-width: 22rem;
    }
    .unbiased-chip span.material-symbols-outlined {
      font-size: 22px;
      color: #34d399;
    }
    .unbiased-text {
      display: flex;
      flex-direction: column;
      font-size: 12px;
      line-height: 1.45;
    }
    .unbiased-text strong {
      color: #ffffff;
      font-weight: 700;
    }
    .unbiased-text span {
      color: #cbd5e1;
    }

    /* Subheading Row */
    .section-subheading-row {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
    }
    @media (min-width: 768px) {
      .section-subheading-row {
        flex-direction: row;
        align-items: flex-end;
        justify-content: space-between;
      }
    }
    .subheading-title {
      font-size: 1.35rem;
      font-weight: 700;
      color: var(--text-slate-950, #020617);
      margin: 0;
      letter-spacing: -0.02em;
    }
    .subheading-desc {
      font-size: 13px;
      color: #64748b;
      margin: 0.25rem 0 0 0;
    }
    .subheading-tag {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      color: #0f3b4a;
      background: #e2e8f0;
      padding: 3px 10px;
      border-radius: 4px;
      align-self: flex-start;
    }

    /* 3. Analysis Grid */
    .analysis-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.25rem;
      margin-bottom: 3.5rem;
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
      padding: 1.35rem;
      display: flex;
      flex-direction: column;
      transition: all 0.2s ease;
    }
    .analysis-card:hover {
      border-color: #cbd5e1;
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);
    }

    .analysis-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.85rem;
    }
    .analysis-icon {
      width: 38px;
      height: 38px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .analysis-icon span {
      font-size: 20px;
    }
    .analysis-outcome-pill {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
      letter-spacing: 0.02em;
    }

    .analysis-title {
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--text-slate-950, #020617);
      margin: 0 0 0.35rem 0;
      line-height: 1.3;
    }
    .analysis-summary {
      font-size: 13px;
      color: #64748b;
      line-height: 1.55;
      margin: 0 0 0.75rem 0;
      flex-grow: 1;
    }

    .card-draft-hatch {
      height: 4px;
      width: 100%;
      margin-bottom: 0.75rem;
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
      gap: 0.45rem;
    }
    .analysis-list li {
      display: flex;
      align-items: flex-start;
      gap: 7px;
      font-size: 12px;
      color: #334155;
      line-height: 1.45;
    }
    .bullet-check {
      color: #059669;
      font-weight: 800;
      font-size: 12px;
    }

    /* 4. Packages Container */
    .packages-container {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 1.75rem;
      margin-bottom: 3rem;
    }
    @media (min-width: 640px) {
      .packages-container {
        padding: 2.25rem;
      }
    }

    .packages-header {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      margin-bottom: 1.75rem;
    }
    @media (min-width: 768px) {
      .packages-header {
        flex-direction: row;
        align-items: flex-end;
        justify-content: space-between;
      }
    }
    .packages-header-left {
      max-width: 44rem;
    }
    .packages-eyebrow {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.08em;
      color: #0f3b4a;
      display: block;
      margin-bottom: 0.35rem;
    }
    .packages-title {
      font-size: 1.35rem;
      font-weight: 700;
      color: var(--text-slate-950, #020617);
      margin: 0;
      letter-spacing: -0.02em;
    }
    .packages-subtitle {
      font-size: 13.5px;
      color: #64748b;
      line-height: 1.6;
      margin: 0.5rem 0 0 0;
    }

    .packages-cta-box {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .btn-advisory-primary {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #0f3b4a;
      color: #ffffff;
      font-size: 13px;
      font-weight: 600;
      padding: 0.65rem 1.15rem;
      border-radius: 4px;
      text-decoration: none;
      transition: background 0.15s ease;
    }
    .btn-advisory-primary:hover {
      background: #164e63;
    }
    .btn-advisory-primary span.material-symbols-outlined {
      font-size: 16px;
    }
    .btn-advisory-secondary {
      display: inline-flex;
      align-items: center;
      background: #ffffff;
      color: #0f3b4a;
      border: 1px solid #cbd5e1;
      font-size: 13px;
      font-weight: 600;
      padding: 0.65rem 1.15rem;
      border-radius: 4px;
      text-decoration: none;
      transition: all 0.15s ease;
    }
    .btn-advisory-secondary:hover {
      background: #f1f5f9;
      border-color: #94a3b8;
    }

    .services-chips-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
    }
    @media (min-width: 640px) {
      .services-chips-grid {
        grid-template-columns: repeat(4, 1fr);
      }
    }
    .service-chip {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 0.75rem 0.85rem;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12.5px;
      font-weight: 600;
      color: #1e293b;
      transition: all 0.15s ease;
    }
    .service-chip:hover {
      border-color: #0f3b4a;
      transform: translateY(-1px);
    }
    .service-chip span.material-symbols-outlined {
      font-size: 18px;
    }

    /* 5. Mission Callout Card */
    .mission-callout-card {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-left: 4px solid #0f3b4a;
      border-radius: 6px;
      padding: 1.5rem 1.75rem;
      display: flex;
      gap: 1.25rem;
    }
    @media (min-width: 640px) {
      .mission-callout-card {
        padding: 2rem 2.25rem;
      }
    }
    .mission-icon-quote {
      width: 44px;
      height: 44px;
      min-width: 44px;
      background: #f1f5f9;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .mission-icon-quote span {
      font-size: 26px;
    }
    .mission-body {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      width: 100%;
    }
    .mission-heading {
      font-size: 1.15rem;
      font-weight: 700;
      color: #0f3b4a;
      margin: 0;
    }
    .mission-quote {
      font-size: 14px;
      line-height: 1.7;
      color: #334155;
      font-style: italic;
      margin: 0;
    }
    .mission-footer-row {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid #f1f5f9;
    }
    @media (min-width: 768px) {
      .mission-footer-row {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
    }
    .mission-brand {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12.5px;
    }
    .brand-badge-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #059669;
    }
    .brand-strong {
      font-weight: 700;
      color: #0f3b4a;
    }
    .brand-tagline {
      color: #64748b;
    }
    .mission-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      font-weight: 700;
      color: #0f3b4a;
      text-decoration: none;
    }
    .mission-link:hover {
      text-decoration: underline;
    }
    .mission-link span.material-symbols-outlined {
      font-size: 16px;
    }
  `]
})
export class WhyChooseUsComponent {}
