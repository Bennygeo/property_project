import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WalletService } from '../../../../core/services/wallet.service';
import { MetroService } from '../../../../core/services/metro.service';
import { PricingPack } from '../../../../core/models/pricing-pack.model';

@Component({
  selector: 'app-topup-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (walletService.isTopupModalOpen()) {
      <div class="modal-backdrop" (click)="onBackdropClick($event)">
        <div class="modal-dialog">
          <div class="dialog-header">
            <div>
              <div class="editorial-tag text-red">ARCHITECTURAL MEDIA POINTS • RAZORPAY</div>
              <h3 class="dialog-title">Recharge Media Points</h3>
              <p class="dialog-subtitle">
                Current Wallet: <strong>{{ walletService.balance() }} Points</strong> • ₹50 per Point (Permanent Validity)
              </p>
            </div>
            <button class="close-btn" (click)="walletService.closeTopupModal()" aria-label="Close dialog">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div class="dialog-body">
            <!-- Payment Processing Banner -->
            @if (walletService.isProcessingPayment()) {
              <div class="payment-processing-banner">
                <span class="spinner"></span>
                <span>Connecting to Razorpay Secure Gateway...</span>
              </div>
            }

            <div class="packs-list">
              @for (pack of metroService.pricingPacks; track pack.id) {
                <div class="pack-card" [class.recommended]="pack.isRecommended">
                  @if (pack.badgeText) {
                    <span class="pack-badge">{{ pack.badgeText }}</span>
                  }
                  <div class="pack-top">
                    <div>
                      <span class="pack-category">{{ pack.category }}</span>
                      <h4 class="pack-name">{{ pack.name }}</h4>
                    </div>
                    <div class="pack-price">
                      <span class="price-val">₹{{ pack.priceInRupees.toLocaleString('en-IN') }}</span>
                      <span class="pts-val">{{ pack.totalPoints }} Points</span>
                    </div>
                  </div>
                  <p class="pack-sub">{{ pack.subtitle }}</p>
                  <button 
                    type="button"
                    class="pack-buy-btn" 
                    [class.btn-primary]="pack.isRecommended"
                    [disabled]="walletService.isProcessingPayment()"
                    (click)="buyPack(pack)">
                    <span class="material-symbols-outlined">payment</span>
                    <span>Pay ₹{{ pack.priceInRupees.toLocaleString('en-IN') }} via Razorpay</span>
                  </button>
                </div>
              }
            </div>

            <!-- Custom Recharge Calculator -->
            <div class="custom-recharge-box">
              <div class="custom-header">
                <span class="material-symbols-outlined text-red">tune</span>
                <span class="custom-title">Custom Amount Recharge</span>
              </div>
              <div class="custom-inputs-row">
                <div class="input-wrap">
                  <label for="custom-amt-input" class="input-label">Enter Amount (₹)</label>
                  <div class="input-field-box">
                    <span class="currency-symbol">₹</span>
                    <input 
                      id="custom-amt-input"
                      type="number" 
                      min="50" 
                      step="50" 
                      class="custom-amt-input"
                      [value]="customRupees()"
                      (input)="onCustomRupeesChange($event)">
                  </div>
                </div>

                <div class="custom-pts-result">
                  <span class="result-label">Points Credited</span>
                  <span class="result-pts">{{ customPoints() }} Pts</span>
                </div>
              </div>

              <button 
                type="button" 
                class="btn-custom-pay"
                [disabled]="walletService.isProcessingPayment() || customRupees() < 50"
                (click)="payCustom()">
                <span class="material-symbols-outlined">bolt</span>
                <span>Pay ₹{{ customRupees() }} for {{ customPoints() }} Pts</span>
              </button>
            </div>

            <div class="dialog-guarantees">
              <div class="g-item">
                <span class="material-symbols-outlined text-emerald">verified</span>
                <span>Razorpay Secured</span>
              </div>
              <div class="g-item">
                <span class="material-symbols-outlined text-emerald">all_inclusive</span>
                <span>Points Never Expire</span>
              </div>
              <div class="g-item">
                <span class="material-symbols-outlined text-emerald">speed</span>
                <span>Instant Wallet Credit</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .dialog-header {
      padding: 1.5rem;
      border-bottom: 1px solid var(--hairline-border);
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      position: relative;
    }
    .text-red {
      color: var(--brand-red);
    }
    .dialog-title {
      font-size: 1.35rem;
      font-weight: 800;
      color: var(--text-slate-950);
      margin-top: 0.25rem;
    }
    .dialog-subtitle {
      font-size: 0.825rem;
      color: var(--text-slate-600);
      margin-top: 0.25rem;
    }
    .dialog-subtitle strong {
      color: var(--text-slate-950);
    }
    .close-btn {
      background: none;
      border: 1px solid var(--hairline-border);
      border-radius: 8px;
      width: 34px;
      height: 34px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-slate-600);
      cursor: pointer;
      transition: all 0.15s;
    }
    .close-btn:hover {
      background: #f1f5f9;
      color: var(--text-slate-950);
    }
    .dialog-body {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .payment-processing-banner {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1d4ed8;
      font-size: 13px;
      font-weight: 700;
    }
    .spinner {
      width: 18px;
      height: 18px;
      border: 2px solid #93c5fd;
      border-top-color: #1d4ed8;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .packs-list {
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
    }
    .pack-card {
      border: 1.5px solid var(--hairline-border);
      border-radius: 0.75rem;
      padding: 1rem 1.25rem;
      position: relative;
      background: #ffffff;
      transition: all 0.2s;
    }
    .pack-card.recommended {
      border-color: var(--brand-red);
      background: #fffafa;
    }
    .pack-badge {
      position: absolute;
      top: -10px;
      right: 16px;
      background: var(--brand-red);
      color: #ffffff;
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.08em;
      padding: 2px 8px;
      border-radius: 9999px;
      text-transform: uppercase;
    }
    .pack-top {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .pack-category {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-slate-500);
    }
    .pack-card.recommended .pack-category {
      color: var(--brand-red);
    }
    .pack-name {
      font-size: 1.05rem;
      font-weight: 800;
      color: var(--text-slate-950);
      margin: 0;
    }
    .pack-price {
      text-align: right;
    }
    .price-val {
      display: block;
      font-size: 1.2rem;
      font-weight: 900;
      color: var(--text-slate-950);
      line-height: 1;
    }
    .pts-val {
      font-size: 11px;
      font-weight: 700;
      color: var(--color-emerald-700);
      font-family: ui-monospace, monospace;
    }
    .pack-sub {
      font-size: 0.775rem;
      color: var(--text-slate-600);
      margin: 0.35rem 0 0.75rem 0;
    }
    .pack-buy-btn {
      width: 100%;
      padding: 0.65rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: all 0.15s;
      background: #f1f5f9;
      color: var(--text-slate-900);
      border: 1px solid var(--hairline-border);
    }
    .pack-buy-btn:hover:not(:disabled) {
      background: #e2e8f0;
    }
    .pack-buy-btn.btn-primary {
      background: var(--brand-red);
      color: #ffffff;
      border-color: var(--brand-red);
    }
    .pack-buy-btn.btn-primary:hover:not(:disabled) {
      background: var(--brand-red-hover);
    }
    .pack-buy-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    /* Custom Recharge Box */
    .custom-recharge-box {
      background: #f8fafc;
      border: 1.5px dashed #cbd5e1;
      border-radius: 0.75rem;
      padding: 1rem 1.25rem;
    }
    .custom-header {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      margin-bottom: 0.75rem;
    }
    .custom-title {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-slate-800);
    }
    .custom-inputs-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 0.75rem;
    }
    .input-wrap {
      flex: 1;
    }
    .input-label {
      display: block;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-slate-500);
      margin-bottom: 0.25rem;
    }
    .input-field-box {
      display: flex;
      align-items: center;
      background: #ffffff;
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      padding: 0.4rem 0.75rem;
    }
    .currency-symbol {
      font-weight: 700;
      color: var(--text-slate-500);
      margin-right: 0.25rem;
    }
    .custom-amt-input {
      border: none;
      outline: none;
      width: 100%;
      font-weight: 800;
      font-size: 15px;
      color: var(--text-slate-900);
    }
    .custom-pts-result {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    .result-label {
      font-size: 10px;
      font-weight: 700;
      color: var(--text-slate-500);
      text-transform: uppercase;
    }
    .result-pts {
      font-size: 1.25rem;
      font-weight: 900;
      color: var(--brand-red);
      font-family: ui-monospace, monospace;
    }
    .btn-custom-pay {
      width: 100%;
      padding: 0.65rem 1rem;
      border-radius: 8px;
      background: #0f172a;
      color: #ffffff;
      font-size: 12px;
      font-weight: 800;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      transition: all 0.15s;
    }
    .btn-custom-pay:hover:not(:disabled) {
      background: #1e293b;
    }
    .btn-custom-pay:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .dialog-guarantees {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
      padding-top: 0.875rem;
      border-top: 1px solid var(--hairline-border);
      font-size: 11px;
      font-weight: 600;
      color: var(--text-slate-600);
      text-align: center;
    }
    .g-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
    }
    .text-emerald {
      color: var(--color-emerald-600);
    }
  `]
})
export class TopupDialogComponent {
  readonly walletService = inject(WalletService);
  readonly metroService = inject(MetroService);

  readonly customRupees = signal<number>(200);
  readonly customPoints = signal<number>(4);

  onCustomRupeesChange(event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    this.customRupees.set(val);
    const pts = Math.max(1, Math.floor(val / 50));
    this.customPoints.set(pts);
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.walletService.closeTopupModal();
    }
  }

  private readonly router = inject(Router);

  buyPack(pack: PricingPack): void {
    this.walletService.closeTopupModal();
    this.router.navigate(['/wallet'], {
      queryParams: {
        rupees: pack.priceInRupees,
        points: pack.totalPoints
      }
    });
  }

  payCustom(): void {
    this.walletService.closeTopupModal();
    this.router.navigate(['/wallet'], {
      queryParams: {
        rupees: this.customRupees(),
        points: this.customPoints()
      }
    });
  }
}

