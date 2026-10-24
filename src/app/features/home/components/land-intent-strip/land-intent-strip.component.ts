import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AiChatService } from '../../../../core/services/ai-chat.service';

export interface BuyerDemandItem {
  id: string;
  category: string;
  badge: string;
  title: string;
  locality: string;
  city: string;
  budgetRange: string;
  timeline: string;
  specs: string;
  verifiedBuyer: string;
}

@Component({
  selector: 'app-land-intent-strip',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="minimal-gateway-wrap" aria-label="Direct Registry Quick Navigation">
      <div class="max-w-content gateway-container">

        <!-- Sleek 3-Segment Architectural Bar -->
        <nav class="minimal-segments-bar" aria-label="Quick Actions">

          <!-- Segment 1: List Property -->
          <a 
            routerLink="/post-property" 
            class="segment-item group" 
            id="min-intent-list"
            title="List your property - Direct owner listing, 100% free">
            <div class="segment-body">
              <div class="segment-top-row">
                <span class="segment-title">List Property</span>
                <span class="material-symbols-outlined segment-arrow" aria-hidden="true">arrow_forward</span>
              </div>
              <span class="segment-sub">Direct owner listing · 100% Free</span>
            </div>
          </a>

          <!-- Segment 2: Buyer Demands -->
          <div 
            class="segment-item group cursor-pointer" 
            id="min-intent-demands"
            (click)="openBuyerRequests()"
            role="button"
            tabindex="0"
            (keydown.enter)="openBuyerRequests()"
            (keydown.space)="openBuyerRequests(); $event.preventDefault()"
            title="View verified buyer requirements and active demands">
            <div class="segment-body">
              <div class="segment-top-row">
                <span class="segment-title">Buyer Demands</span>
                <span class="material-symbols-outlined segment-arrow" aria-hidden="true">arrow_forward</span>
              </div>
              <span class="segment-sub">Active investor &amp; buyer requests</span>
            </div>
          </div>

          <!-- Segment 3: Explore Plots -->
          <a 
            routerLink="/search" 
            [queryParams]="{ type: 'Gated CMDA Plots' }" 
            class="segment-item group" 
            id="min-intent-explore"
            title="Browse verified survey-audited plots">
            <div class="segment-body">
              <div class="segment-top-row">
                <span class="segment-title">Explore Plots</span>
                <span class="material-symbols-outlined segment-arrow" aria-hidden="true">arrow_forward</span>
              </div>
              <span class="segment-sub">Survey-verified cadastral deeds</span>
            </div>
          </a>

          <!-- Segment 4: AI Chat -->
          <div 
            class="segment-item group segment-ai cursor-pointer" 
            id="min-intent-ai-chat"
            (click)="aiService.openChat()"
            role="button"
            tabindex="0"
            (keydown.enter)="aiService.openChat()"
            (keydown.space)="aiService.openChat(); $event.preventDefault()"
            title="Ask AI Concierge to search plots or list your land">
            <div class="segment-body">
              <div class="segment-top-row">
                <span class="segment-title ai-title-wrap">
                  <span class="material-symbols-outlined ai-sparkle" aria-hidden="true">auto_awesome</span>
                  <span>AI Chat</span>
                </span>
                <span class="material-symbols-outlined segment-arrow" aria-hidden="true">arrow_forward</span>
              </div>
              <span class="segment-sub">Ask AI to search or list land</span>
            </div>
          </div>

        </nav>

      </div>
    </div>

    <!-- Minimalist Buyer Demands Modal -->
    @if (isBuyerRequestsModalOpen()) {
      <div class="modal-backdrop" (click)="closeBuyerRequests()">
        <div class="modal-dialog-box" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-labelledby="modal-demands-title">
          
          <!-- Modal Header -->
          <div class="modal-header">
            <div class="header-titles">
              <div class="modal-badge-row">
                <span class="live-pulse-dot"></span>
                <span class="modal-badge-text">ACTIVE INVESTOR DEMAND</span>
              </div>
              <h3 id="modal-demands-title" class="modal-title">Live Buyer Requirements</h3>
              <p class="modal-sub">
                Pre-screened buyers looking for plots and acreage with immediate registration timelines.
              </p>
            </div>

            <button 
              type="button" 
              class="btn-close-modal" 
              (click)="closeBuyerRequests()" 
              aria-label="Close dialog">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <!-- Demands List Body -->
          <div class="demands-scroll-body">
            @for (item of buyerDemands; track item.id) {
              <div class="demand-item-card">
                <div class="demand-card-top">
                  <div class="demand-category-tag">
                    <span class="material-symbols-outlined tag-icon">verified</span>
                    <span>{{ item.category }}</span>
                  </div>
                  <span class="demand-timeline-pill">{{ item.timeline }}</span>
                </div>

                <div class="demand-main-info">
                  <h4 class="demand-title">{{ item.title }}</h4>
                  <div class="demand-location-row">
                    <span class="material-symbols-outlined loc-pin">location_on</span>
                    <span>{{ item.locality }}, {{ item.city }}</span>
                  </div>
                </div>

                <div class="demand-specs-block">
                  <div class="spec-col">
                    <span class="spec-label">Target Budget</span>
                    <span class="spec-value price-highlight">{{ item.budgetRange }}</span>
                  </div>
                  <div class="spec-col">
                    <span class="spec-label">Area / Size</span>
                    <span class="spec-value">{{ item.specs }}</span>
                  </div>
                  <div class="spec-col">
                    <span class="spec-label">Buyer Verification</span>
                    <span class="spec-value">{{ item.verifiedBuyer }}</span>
                  </div>
                </div>

                <div class="demand-card-footer">
                  <span class="demand-note">Zero broker fee on direct owner transactions</span>
                  <a 
                    routerLink="/post-property" 
                    (click)="closeBuyerRequests()" 
                    class="btn-match-property">
                    <span>Match My Property</span>
                    <span class="material-symbols-outlined btn-arrow">arrow_forward</span>
                  </a>
                </div>
              </div>
            }
          </div>

          <!-- Modal Footer CTA -->
          <div class="modal-footer-bar">
            <div class="footer-left-info">
              <span class="material-symbols-outlined lock-icon">security</span>
              <span>All inquiries undergo title deed verification before sharing contact details.</span>
            </div>
            <div class="footer-actions">
              <a 
                routerLink="/search" 
                [queryParams]="{ type: 'Gated CMDA Plots' }" 
                (click)="closeBuyerRequests()" 
                class="btn-secondary-link">
                Browse Registry
              </a>
              <a 
                routerLink="/post-property" 
                (click)="closeBuyerRequests()" 
                class="btn-primary-post">
                List Property Free
              </a>
            </div>
          </div>

        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      position: relative;
      z-index: 20;
    }

    .minimal-gateway-wrap {
      width: 100%;
      margin-bottom: 1.5rem;
      position: relative;
      z-index: 15;
      margin-top: 4rem;
    }

    .max-w-content {
      max-width: 1140px;
      margin: 0 auto;
      padding: 0 1rem;
    }

    .gateway-container {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    /* 1. Minimal Single-Line Guarantee Bar */
    .minimal-guarantee-line {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 1.25rem;
      flex-wrap: wrap;
      margin-bottom: 0.85rem;
      font-size: 12.5px;
      color: var(--text-slate-600, #475569);
      user-select: none;
    }

    .guarantee-point {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
      letter-spacing: -0.01em;
      color: var(--text-slate-700, #334155);
    }

    .bullet-dot {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background-color: var(--brand-green, #5e8f72);
    }

    .point-sep {
      color: var(--text-slate-300, #cbd5e1);
      font-size: 11px;
    }

    /* 2. Sleek 4-Segment Architectural Bar with AI Concierge */
    .minimal-segments-bar {
      width: 100%;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      background-color: #ffffff;
      border: 1px solid var(--hairline-border, #e2e8f0);
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
      overflow: hidden;
    }

    .segment-item {
      display: block;
      padding: 0.95rem 1.3rem;
      background-color: #ffffff;
      text-decoration: none;
      position: relative;
      cursor: pointer;
      user-select: none;
      transition: background-color 0.15s ease;
    }

    .segment-item:not(:last-child) {
      border-right: 1px solid var(--hairline-border, #e2e8f0);
    }

    .segment-item:hover {
      background-color: var(--surface-slate-50, #f8fafc);
    }

    .segment-ai {
      background: linear-gradient(180deg, #ffffff 0%, #fffbfb 100%);
    }

    .ai-title-wrap {
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }

    .ai-sparkle {
      font-size: 16px;
      color: var(--brand-green, #5e8f72);
    }

    .segment-body {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .segment-top-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .segment-title {
      font-family: var(--font-sans, 'Montserrat', sans-serif);
      font-size: 15px;
      font-weight: 700;
      color: var(--text-slate-900, #0f172a);
      letter-spacing: -0.015em;
      transition: color 0.15s ease;
    }

    .segment-item:hover .segment-title {
      color: var(--brand-green, #5e8f72);
    }

    .segment-arrow {
      font-size: 16px;
      color: var(--text-slate-400, #94a3b8);
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), color 0.15s ease;
      flex-shrink: 0;
    }

    .segment-item:hover .segment-arrow {
      color: var(--brand-green, #5e8f72);
      transform: translateX(3px);
    }

    .segment-sub {
      font-family: var(--font-sans, 'Montserrat', sans-serif);
      font-size: 12px;
      color: var(--text-slate-500, #64748b);
      font-weight: 400;
      line-height: 1.35;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Responsive Design */
    @media (max-width: 960px) {
      .minimal-segments-bar {
        grid-template-columns: repeat(2, 1fr);
        border-radius: 12px;
      }

      .segment-item:nth-child(2) {
        border-right: none;
      }

      .segment-item:nth-child(-n+2) {
        border-bottom: 1px solid var(--hairline-border, #e2e8f0);
      }
    }

    @media (max-width: 600px) {
      .minimal-segments-bar {
        grid-template-columns: 1fr;
        border-radius: 10px;
      }

      .segment-item:not(:last-child) {
        border-right: none;
        border-bottom: 1px solid var(--hairline-border, #e2e8f0);
      }

      .segment-item {
        padding: 0.85rem 1.15rem;
      }
    }

    /* ========================================================= */
    /* MODAL: LIVE BUYER DEMANDS                                 */
    /* ========================================================= */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1000;
      background-color: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.25rem;
      animation: fadeIn 0.2s ease-out;
    }

    .modal-dialog-box {
      width: 100%;
      max-width: 760px;
      max-height: 86vh;
      background-color: #ffffff;
      border-radius: 16px;
      box-shadow: 0 20px 50px -10px rgba(15, 23, 42, 0.25);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      border: 1px solid var(--hairline-border, #e2e8f0);
    }

    .modal-header {
      padding: 1.35rem 1.6rem 1.15rem;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      border-bottom: 1px solid var(--hairline-border, #e2e8f0);
      background-color: #ffffff;
    }

    .modal-badge-row {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
    }

    .live-pulse-dot {
      width: 7px;
      height: 7px;
      background-color: var(--brand-green, #5e8f72);
      border-radius: 50%;
      box-shadow: 0 0 0 3px rgba(199, 52, 52, 0.18);
    }

    .modal-badge-text {
      font-size: 10.5px;
      font-weight: 800;
      letter-spacing: 0.08em;
      color: var(--brand-green, #5e8f72);
    }

    .modal-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-slate-950, #020617);
      margin: 0;
      letter-spacing: -0.015em;
    }

    .modal-sub {
      font-size: 13px;
      color: var(--text-slate-500, #64748b);
      margin: 3px 0 0;
      line-height: 1.4;
    }

    .btn-close-modal {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 1px solid var(--hairline-border, #e2e8f0);
      background: var(--surface-slate-50, #f8fafc);
      color: var(--text-slate-500, #64748b);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }

    .btn-close-modal:hover {
      background: var(--brand-red-subtle, #fef2f2);
      color: var(--brand-green, #5e8f72);
      border-color: var(--brand-red-border, #fecaca);
    }

    .btn-close-modal .material-symbols-outlined {
      font-size: 17px;
    }

    /* Scroll Body */
    .demands-scroll-body {
      padding: 1.25rem 1.6rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      background-color: var(--surface-slate-50, #f8fafc);
    }

    .demand-item-card {
      background: #ffffff;
      border: 1px solid var(--hairline-border, #e2e8f0);
      border-radius: 12px;
      padding: 1.15rem 1.35rem;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }

    .demand-item-card:hover {
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);
      transform: translateY(-1px);
    }

    .demand-card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }

    .demand-category-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 700;
      color: var(--brand-green, #5e8f72);
      background: var(--brand-red-subtle, #fef2f2);
      padding: 2px 8px;
      border-radius: 9999px;
      border: 1px solid var(--brand-red-border, #fecaca);
    }

    .tag-icon {
      font-size: 13px;
    }

    .demand-timeline-pill {
      font-size: 11px;
      font-weight: 600;
      color: #92400e;
      background: #fef3c7;
      padding: 2px 8px;
      border-radius: 9999px;
    }

    .demand-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-slate-900, #0f172a);
      margin: 0 0 3px;
      letter-spacing: -0.01em;
    }

    .demand-location-row {
      display: flex;
      align-items: center;
      gap: 3px;
      font-size: 12.5px;
      color: var(--text-slate-500, #64748b);
    }

    .loc-pin {
      font-size: 15px;
      color: var(--brand-green, #5e8f72);
    }

    .demand-specs-block {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
      background: var(--surface-slate-50, #f8fafc);
      border-radius: 8px;
      padding: 0.65rem 0.85rem;
      margin: 0.75rem 0;
      border: 1px solid var(--hairline-border, #e2e8f0);
    }

    .spec-col {
      display: flex;
      flex-direction: column;
    }

    .spec-label {
      font-size: 10.5px;
      color: var(--text-slate-500, #64748b);
      font-weight: 500;
    }

    .spec-value {
      font-size: 13px;
      font-weight: 700;
      color: var(--text-slate-800, #1e293b);
      margin-top: 1px;
    }

    .price-highlight {
      color: var(--brand-green, #5e8f72);
    }

    .demand-card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding-top: 0.35rem;
    }

    .demand-note {
      font-size: 11.5px;
      color: var(--text-slate-400, #94a3b8);
    }

    .btn-match-property {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      font-weight: 700;
      color: #ffffff;
      background: var(--brand-green, #5e8f72);
      padding: 6px 13px;
      border-radius: 9999px;
      text-decoration: none;
      transition: all 0.15s ease;
    }

    .btn-match-property:hover {
      background: var(--brand-green-hover, #497259);
      transform: translateY(-1px);
    }

    .btn-arrow {
      font-size: 14px;
    }

    /* Modal Footer */
    .modal-footer-bar {
      padding: 1rem 1.6rem;
      background: #ffffff;
      border-top: 1px solid var(--hairline-border, #e2e8f0);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .footer-left-info {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      color: var(--text-slate-500, #64748b);
    }

    .lock-icon {
      font-size: 15px;
      color: var(--brand-green, #5e8f72);
    }

    .footer-actions {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .btn-secondary-link {
      padding: 6px 14px;
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text-slate-700, #334155);
      text-decoration: none;
      border: 1px solid var(--hairline-border, #e2e8f0);
      border-radius: 9999px;
      transition: background 0.15s ease;
    }

    .btn-secondary-link:hover {
      background: var(--surface-slate-100, #f1f5f9);
      color: var(--text-slate-900, #0f172a);
    }

    .btn-primary-post {
      padding: 6px 16px;
      font-size: 12.5px;
      font-weight: 700;
      color: #ffffff;
      background: var(--brand-green, #5e8f72);
      text-decoration: none;
      border-radius: 9999px;
      transition: all 0.15s ease;
    }

    .btn-primary-post:hover {
      background: var(--brand-green-hover, #497259);
      transform: translateY(-1px);
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes scaleUp {
      from { opacity: 0; transform: scale(0.97) translateY(6px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    @media (max-width: 640px) {
      .modal-dialog-box {
        max-height: 94vh;
        border-radius: 14px;
      }
      .modal-header, .demands-scroll-body, .modal-footer-bar {
        padding-left: 1.15rem;
        padding-right: 1.15rem;
      }
      .demand-specs-block {
        grid-template-columns: 1fr 1fr;
      }
      .demand-card-footer {
        flex-direction: column;
        align-items: flex-start;
      }
      .btn-match-property {
        width: 100%;
        justify-content: center;
      }
      .footer-actions {
        width: 100%;
        flex-direction: column;
      }
      .btn-secondary-link, .btn-primary-post {
        width: 100%;
        text-align: center;
      }
    }
  `]
})
export class LandIntentStripComponent {
  private readonly router = inject(Router);
  readonly aiService = inject(AiChatService);

  readonly isBuyerRequestsModalOpen = signal<boolean>(false);

  readonly buyerDemands: BuyerDemandItem[] = [
    {
      id: 'bd-1',
      category: 'Gated Villa Plot',
      badge: 'Immediate Buyer',
      title: 'CMDA / DTCP Demarcated Villa Plot (1,800 – 2,400 sq.ft)',
      locality: 'Vandalur – Guduvanchery Corridor',
      city: 'Chennai',
      budgetRange: '₹42 L – ₹60 L',
      timeline: 'Registration in 30 Days',
      specs: 'Min 30ft Blacktop Road',
      verifiedBuyer: 'Self-Funded Investor'
    },
    {
      id: 'bd-2',
      category: 'Agricultural & Farm Land',
      badge: 'Direct Search',
      title: 'Fertile Agro Acreage / Managed Farm Retreat (1 to 3 Acres)',
      locality: 'Chengalpattu – Madurantakam Road',
      city: 'Chennai / Suburbs',
      budgetRange: '₹75 L – ₹1.40 Cr',
      timeline: 'Ready with 50% Advance',
      specs: 'Clear Patta & Water Source',
      verifiedBuyer: 'High Net-Worth Family'
    },
    {
      id: 'bd-3',
      category: 'Commercial Highway Land',
      badge: 'Institutional Buyer',
      title: 'Main Arterial Road-Facing Land for Warehouse / Showroom',
      locality: 'OMR – Navalur – Kelambakkam',
      city: 'Chennai',
      budgetRange: '₹2.50 Cr – ₹6.00 Cr',
      timeline: 'Quick 45-Day Close',
      specs: 'Min 60ft Road Width',
      verifiedBuyer: 'Corporate Logistics Group'
    },
    {
      id: 'bd-4',
      category: 'Luxury Residential Plot',
      badge: 'Escrow Ready',
      title: 'Corner East/North Facing Villa Plot in Gated Community',
      locality: 'Jubilee Hills / Kokapet Ridge',
      city: 'Hyderabad',
      budgetRange: '₹3.80 Cr – ₹5.50 Cr',
      timeline: 'Pre-Approved Private Bank Loan',
      specs: '400 – 600 sq.yards',
      verifiedBuyer: 'Senior Tech Executive'
    }
  ];

  openBuyerRequests(): void {
    this.isBuyerRequestsModalOpen.set(true);
  }

  closeBuyerRequests(): void {
    this.isBuyerRequestsModalOpen.set(false);
  }
}
