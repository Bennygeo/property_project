import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-why-choose-us',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="max-w-content why-section">
      <!-- Editorial Header Row -->
      <div class="why-head">
        <div>
          <h2 class="why-title">Why Choose Find a Plot</h2>
          <p class="why-sub">
            Unbiased, data-backed plot shortlisting — narrowing many options down to the best few.
          </p>
        </div>
        <a routerLink="/subscriptions" class="why-cta">
          <span>Advisory Packages</span>
          <span class="material-symbols-outlined why-cta-arrow">arrow_forward</span>
        </a>
      </div>

      <!-- 3-Column Editorial Hairline Strip -->
      <div class="why-columns">
        <div class="why-col">
          <span class="material-symbols-outlined why-icon" aria-hidden="true">verified_user</span>
          <h3 class="why-col-title">Legal &amp; Site Verified</h3>
          <p class="why-col-desc">
            RERA/DTCP approvals, Patta &amp; 30-yr EC audited alongside road access, drainage &amp; soil checks.
          </p>
        </div>

        <div class="why-col">
          <span class="material-symbols-outlined why-icon" aria-hidden="true">trending_up</span>
          <h3 class="why-col-title">Location &amp; Growth</h3>
          <p class="why-col-desc">
            Connectivity to highways, transit &amp; schools mapped against upcoming metro &amp; infra corridors.
          </p>
        </div>

        <div class="why-col">
          <span class="material-symbols-outlined why-icon" aria-hidden="true">analytics</span>
          <h3 class="why-col-title">Fair Price &amp; 100-Pt Score</h3>
          <p class="why-col-desc">
            Benchmarked against nearby SRO deeds and ranked objectively so you choose from the best few.
          </p>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .why-section {
      padding-top: 2.25rem;
      padding-bottom: 2.5rem;
      background: #ffffff;
      border-top: 1px solid #e2e8f0;
    }
    @media (min-width: 768px) {
      .why-section {
        padding-top: 3rem;
        padding-bottom: 3.25rem;
      }
    }

    .why-head {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 1.75rem;
    }
    @media (min-width: 768px) {
      .why-head {
        flex-direction: row;
        align-items: flex-end;
        justify-content: space-between;
        margin-bottom: 2.25rem;
      }
    }

    .why-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: #020617;
      letter-spacing: -0.02em;
      margin: 0 0 0.25rem 0;
      line-height: 1.3;
    }
    @media (min-width: 768px) {
      .why-title {
        font-size: 1.45rem;
      }
    }

    .why-sub {
      font-size: 13.5px;
      color: #64748b;
      margin: 0;
      line-height: 1.5;
    }

    .why-cta {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      font-weight: 600;
      color: #0f3b4a;
      text-decoration: none;
      white-space: nowrap;
      width: fit-content;
      border-bottom: 1px solid transparent;
      padding-bottom: 1px;
      transition: border-color 0.15s ease;
    }
    .why-cta:hover {
      border-bottom-color: #0f3b4a;
    }
    .why-cta-arrow {
      font-size: 16px;
      transition: transform 0.15s ease;
    }
    .why-cta:hover .why-cta-arrow {
      transform: translateX(3px);
    }

    /* 3-Column Editorial Strip */
    .why-columns {
      display: grid;
      grid-template-columns: 1fr;
    }
    @media (min-width: 768px) {
      .why-columns {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    .why-col {
      padding: 1.15rem 0;
      border-top: 1px solid #f1f5f9;
    }
    .why-col:first-child {
      padding-top: 0.25rem;
      border-top: none;
    }

    @media (min-width: 768px) {
      .why-col {
        border-top: none;
        border-left: 1px solid #e2e8f0;
        padding: 0.25rem 1.75rem;
      }
      .why-col:first-child {
        border-left: none;
        padding-left: 0;
        padding-top: 0.25rem;
      }
      .why-col:last-child {
        padding-right: 0;
      }
    }

    .why-icon {
      display: block;
      font-size: 20px;
      color: #0f3b4a;
      margin-bottom: 0.65rem;
      font-variation-settings: 'wght' 350;
    }

    .why-col-title {
      font-size: 14px;
      font-weight: 500;
      color: #0f172a;
      letter-spacing: -0.01em;
      margin: 0 0 0.35rem 0;
      line-height: 1.35;
    }

    .why-col-desc {
      font-size: 13px;
      color: #64748b;
      margin: 0;
      line-height: 1.55;
    }
  `]
})
export class WhyChooseUsComponent { }
