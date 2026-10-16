import { Component } from '@angular/core';

@Component({
  selector: 'app-value-props',
  standalone: true,
  template: `
    <section class="max-w-content value-props-section">
      <div class="props-grid">
        <div class="prop-item">
          <div class="prop-icon-box bg-red">
            <span class="material-symbols-outlined text-red">savings</span>
          </div>
          <div>
            <div class="prop-title">₹140 Cr+ Saved</div>
            <div class="prop-sub">Monthly Zero-Brokerage Savings</div>
          </div>
        </div>

        <div class="prop-item">
          <div class="prop-icon-box bg-emerald">
            <span class="material-symbols-outlined text-emerald">verified</span>
          </div>
          <div>
            <div class="prop-title">100% RERA Verified</div>
            <div class="prop-sub">30-Year Encumbrance &amp; Patta Cleared</div>
          </div>
        </div>

        <div class="prop-item">
          <div class="prop-icon-box bg-amber">
            <span class="material-symbols-outlined text-amber">smart_display</span>
          </div>
          <div>
            <div class="prop-title">4K Walkthrough Videos</div>
            <div class="prop-sub">Free Photos • 4K Tours via Razorpay</div>
          </div>
        </div>

        <div class="prop-item">
          <div class="prop-icon-box bg-purple">
            <span class="material-symbols-outlined text-purple">gavel</span>
          </div>
          <div>
            <div class="prop-title">Free Legal Concierge</div>
            <div class="prop-sub">Drafting &amp; SRO Registration Support</div>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .value-props-section {
      margin-top: 1rem;
      margin-bottom: 2rem;
      position: relative;
      z-index: 10;
    }
    .props-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
      padding: 1.25rem;
      background: #ffffff;
      border: 1px solid var(--hairline-border);
      border-radius: 1rem;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
    }
    @media (min-width: 640px) {
      .props-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    @media (min-width: 1024px) {
      .props-grid {
        grid-template-columns: repeat(4, 1fr);
      }
    }
    .prop-item {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      padding: 0.75rem;
      border-radius: 0.75rem;
      background: #f8fafc;
      border: 1px solid #f1f5f9;
      transition: all 0.15s;
    }
    .prop-item:hover {
      background: #ffffff;
      border-color: var(--hairline-border);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .prop-icon-box {
      width: 3rem;
      height: 3rem;
      border-radius: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .prop-icon-box span {
      font-size: 26px;
    }
    .bg-red { background: #fee2e2; }
    .text-red { color: var(--brand-red); }
    .bg-emerald { background: #d1fae5; }
    .text-emerald { color: #047857; }
    .bg-amber { background: #fef3c7; }
    .text-amber { color: #92400e; }
    .bg-purple { background: #f3e8ff; }
    .text-purple { color: #7e22ce; }
    .prop-title {
      font-size: 0.875rem;
      font-weight: 700;
      color: var(--text-slate-950);
    }
    .prop-sub {
      font-size: 0.75rem;
      color: var(--text-slate-600);
      font-weight: 500;
      margin-top: 1px;
    }
  `]
})
export class ValuePropsComponent {}
