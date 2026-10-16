import { Component, inject, signal, ElementRef, ViewChildren, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-otp-login-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (authService.isOtpModalOpen()) {
      <div class="modal-backdrop" (click)="closeModal()">
        <div class="modal-container" (click)="$event.stopPropagation()">
          <!-- Modal Header -->
          <div class="modal-header">
            <div class="header-branding">
              <div class="icon-badge">
                <span class="material-symbols-outlined">shield_person</span>
              </div>
              <div>
                <h3 class="modal-title">Investor &amp; Buyer Sign In</h3>
                <p class="modal-subtitle">One-Time Password (OTP) Secured Registry Access</p>
              </div>
            </div>
            <button type="button" class="btn-close" (click)="closeModal()" aria-label="Close dialog">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <!-- STEP 1: Phone Entry -->
          @if (step() === 'phone') {
            <form (submit)="onSendOtp($event)" class="modal-body">
              @if (authService.otpModalReason() === 'guest_limit') {
                <div class="limit-alert">
                  <div class="limit-alert-icon-box">
                    <span class="material-symbols-outlined alert-icon text-amber">lock</span>
                  </div>
                  <div class="limit-alert-content">
                    <strong class="limit-title">Free Guest Preview Limit Reached (1/1)</strong>
                    <p class="limit-sub">You have viewed 1 free property dossier without signing in. To continue exploring verified properties, floor plans, and seller contacts, please sign in or use 1-Click Demo Login below.</p>
                  </div>
                </div>
              } @else {
                <div class="info-alert">
                  <span class="material-symbols-outlined alert-icon">info</span>
                  <span>Enter your mobile number to receive a 4-digit verification code. Standard no-brokerage access is free.</span>
                </div>
              }

              <!-- Phone Input Field -->
              <div class="input-group">
                <label for="phone-input" class="input-label">Mobile Number</label>
                <div class="phone-input-wrapper">
                  <div class="country-pill">
                    <span class="flag-icon">🇮🇳</span>
                    <span class="dial-code">+91</span>
                  </div>
                  <input 
                    id="phone-input"
                    type="tel"
                    inputmode="numeric"
                    maxlength="10"
                    class="phone-field"
                    placeholder="94441 00000"
                    [value]="phone()"
                    (input)="onPhoneInput($event)"
                    autocomplete="tel-national"
                    required>
                </div>
              </div>

              <!-- Optional Name Field for Registration -->
              <div class="input-group">
                <label for="name-input" class="input-label">Full Name <span class="text-muted">(Optional for first-time buyers)</span></label>
                <div class="standard-input-wrapper">
                  <span class="material-symbols-outlined input-leading-icon">person</span>
                  <input 
                    id="name-input"
                    type="text"
                    class="standard-field"
                    placeholder="e.g. Ramesh Sundaram"
                    [value]="name()"
                    (input)="name.set($any($event.target).value)">
                </div>
              </div>

              <!-- Demo Auto-Fill Quick Chip -->
              <div class="demo-chip-row">
                <span class="demo-label">Demo Quick Fill:</span>
                <button type="button" class="demo-chip" (click)="autoFillDemoPhone()">
                  <span class="material-symbols-outlined">bolt</span>
                  <span>+91 94441 00000</span>
                </button>
              </div>

              <!-- Submit CTA -->
              <button 
                type="submit" 
                class="btn-primary-cta" 
                [disabled]="phone().length < 10 || authService.isSubmitting()">
                @if (authService.isSubmitting()) {
                  <span class="spinner"></span>
                  <span>Sending OTP...</span>
                } @else {
                  <span>Send Verification Code</span>
                  <span class="material-symbols-outlined">arrow_forward</span>
                }
              </button>

              <!-- Instant 1-Click Demo Login for Quick Verification -->
              <div class="instant-login-row">
                <div class="instant-divider">
                  <span class="instant-divider-text">OR INSTANT EVALUATION</span>
                </div>
                <button 
                  type="button" 
                  class="btn-instant-demo" 
                  (click)="quickDemoLogin()">
                  <span class="material-symbols-outlined instant-bolt">electric_bolt</span>
                  <span>⚡ 1-Click Instant Investor Demo Login</span>
                </button>
              </div>
            </form>
          }

          <!-- STEP 2: Segmented OTP Entry -->
          @if (step() === 'otp') {
            <form (submit)="onVerifyOtp($event)" class="modal-body">
              <div class="otp-banner">
                <div class="banner-top">
                  <span class="material-symbols-outlined text-emerald">sms</span>
                  <span class="banner-title">Code Sent to +91 {{ phone() }}</span>
                </div>
                <button type="button" class="link-change-phone" (click)="step.set('phone')">
                  Edit Number
                </button>
              </div>

              <!-- Demo OTP Notification Box -->
              <div class="demo-otp-box">
                <div class="demo-otp-left">
                  <span class="material-symbols-outlined text-amber">key</span>
                  <div>
                    <div class="demo-otp-title">Demo Testing Mode Active</div>
                    <div class="demo-otp-sub">Your dummy verification code is: <strong>{{ authService.lastSentOtp() }}</strong></div>
                  </div>
                </div>
                <button type="button" class="btn-autofill-otp" (click)="autoFillOtp()">
                  Auto-Fill {{ authService.lastSentOtp() }}
                </button>
              </div>

              <!-- Segmented 4-Digit Inputs -->
              <div class="input-group">
                <label class="input-label text-center">Enter 4-Digit Code</label>
                <div class="otp-boxes-row">
                  <input 
                    #otpBox0 
                    type="text" 
                    inputmode="numeric" 
                    maxlength="1" 
                    class="otp-digit-box"
                    [value]="otpDigits()[0]" 
                    (input)="onDigitInput(0, $event)"
                    (keydown)="onDigitKeydown(0, $event)"
                    autocomplete="one-time-code">
                  <input 
                    #otpBox1 
                    type="text" 
                    inputmode="numeric" 
                    maxlength="1" 
                    class="otp-digit-box"
                    [value]="otpDigits()[1]" 
                    (input)="onDigitInput(1, $event)"
                    (keydown)="onDigitKeydown(1, $event)">
                  <input 
                    #otpBox2 
                    type="text" 
                    inputmode="numeric" 
                    maxlength="1" 
                    class="otp-digit-box"
                    [value]="otpDigits()[2]" 
                    (input)="onDigitInput(2, $event)"
                    (keydown)="onDigitKeydown(2, $event)">
                  <input 
                    #otpBox3 
                    type="text" 
                    inputmode="numeric" 
                    maxlength="1" 
                    class="otp-digit-box"
                    [value]="otpDigits()[3]" 
                    (input)="onDigitInput(3, $event)"
                    (keydown)="onDigitKeydown(3, $event)">
                </div>
              </div>

              <!-- Countdown Timer & Resend -->
              <div class="resend-row">
                @if (countdown() > 0) {
                  <span class="countdown-text">Resend code in <strong>{{ countdown() }}s</strong></span>
                } @else {
                  <button type="button" class="btn-resend" (click)="resendOtp()">
                    <span class="material-symbols-outlined">replay</span>
                    <span>Resend OTP Code</span>
                  </button>
                }
              </div>

              <!-- Verify CTA -->
              <button 
                type="submit" 
                class="btn-primary-cta"
                [disabled]="getCombinedOtp().length < 4 || authService.isSubmitting()">
                @if (authService.isSubmitting()) {
                  <span class="spinner"></span>
                  <span>Verifying...</span>
                } @else {
                  <span class="material-symbols-outlined">verified</span>
                  <span>Verify &amp; Sign In</span>
                }
              </button>
            </form>
          }

          <!-- Footer Trust Markers -->
          <div class="modal-footer">
            <span class="material-symbols-outlined trust-icon">lock</span>
            <span>256-Bit SSL Encrypted • Zero Spam • No Broker Calls</span>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.7);
      backdrop-filter: blur(6px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .modal-container {
      background: #ffffff;
      border-radius: 1.25rem;
      width: 100%;
      max-width: 460px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      border: 1px solid rgba(226, 232, 240, 0.8);
      overflow: hidden;
      animation: scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes scaleUp {
      from { transform: scale(0.96) translateY(8px); opacity: 0; }
      to { transform: scale(1) translateY(0); opacity: 1; }
    }
    .modal-header {
      padding: 1.5rem 1.75rem 1.25rem;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      border-bottom: 1px solid #f1f5f9;
      background: #fafafa;
    }
    .header-branding {
      display: flex;
      align-items: center;
      gap: 0.875rem;
    }
    .icon-badge {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: #fee2e2;
      color: var(--brand-red);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .icon-badge span {
      font-size: 24px;
    }
    .modal-title {
      font-size: 1.125rem;
      font-weight: 800;
      color: var(--text-slate-950);
      letter-spacing: -0.01em;
    }
    .modal-subtitle {
      font-size: 12px;
      color: var(--text-slate-500);
      margin-top: 2px;
    }
    .btn-close {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      color: var(--text-slate-400);
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-close:hover {
      background: #e2e8f0;
      color: var(--text-slate-700);
    }
    .modal-body {
      padding: 1.5rem 1.75rem;
      display: flex;
      flex-direction: column;
      gap: 1.125rem;
    }
    .info-alert {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 0.75rem;
      border-radius: 0.5rem;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      font-size: 12px;
      color: #166534;
      line-height: 1.4;
    }
    .alert-icon {
      font-size: 18px;
      color: #16a34a;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .input-group {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }
    .input-label {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-slate-700);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .text-muted {
      text-transform: none;
      font-weight: 400;
      color: var(--text-slate-400);
    }
    .phone-input-wrapper {
      display: flex;
      align-items: center;
      border: 1.5px solid #cbd5e1;
      border-radius: 0.75rem;
      background: #ffffff;
      overflow: hidden;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .phone-input-wrapper:focus-within {
      border-color: var(--brand-red);
      box-shadow: 0 0 0 3px rgba(199, 52, 52, 0.12);
    }
    .country-pill {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0 0.875rem;
      height: 48px;
      background: #f8fafc;
      border-right: 1px solid #e2e8f0;
      font-weight: 700;
      font-size: 13px;
      color: var(--text-slate-700);
    }
    .flag-icon {
      font-size: 16px;
    }
    .phone-field {
      flex: 1;
      height: 48px;
      border: none;
      outline: none;
      padding: 0 1rem;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: var(--text-slate-900);
    }
    .phone-field::placeholder {
      font-weight: 400;
      color: #94a3b8;
    }
    .standard-input-wrapper {
      display: flex;
      align-items: center;
      border: 1.5px solid #cbd5e1;
      border-radius: 0.75rem;
      background: #ffffff;
      padding: 0 0.875rem;
      height: 44px;
      gap: 0.5rem;
    }
    .standard-input-wrapper:focus-within {
      border-color: var(--brand-red);
      box-shadow: 0 0 0 3px rgba(199, 52, 52, 0.12);
    }
    .input-leading-icon {
      font-size: 20px;
      color: #94a3b8;
    }
    .standard-field {
      flex: 1;
      border: none;
      outline: none;
      font-size: 14px;
      color: var(--text-slate-900);
    }
    .demo-chip-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 12px;
    }
    .demo-label {
      color: var(--text-slate-500);
    }
    .demo-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 0.25rem 0.625rem;
      border-radius: 9999px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      color: var(--text-slate-700);
      font-weight: 600;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .demo-chip:hover {
      background: #e2e8f0;
      border-color: #94a3b8;
      color: var(--brand-red);
    }
    .demo-chip span.material-symbols-outlined {
      font-size: 14px;
      color: #f59e0b;
    }
    .btn-primary-cta {
      height: 48px;
      border-radius: 0.75rem;
      background: var(--brand-red);
      color: #ffffff;
      font-size: 14px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 6px -1px rgba(199, 52, 52, 0.25);
      transition: all 0.2s;
    }
    .btn-primary-cta:hover:not(:disabled) {
      background: #b91c1c;
      transform: translateY(-1px);
      box-shadow: 0 8px 12px -2px rgba(199, 52, 52, 0.35);
    }
    .btn-primary-cta:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
    .btn-primary-cta span.material-symbols-outlined {
      font-size: 18px;
    }
    .otp-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      border-radius: 0.75rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
    }
    .banner-top {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-slate-800);
    }
    .text-emerald {
      color: #059669;
    }
    .text-amber {
      color: #d97706;
    }
    .link-change-phone {
      background: none;
      border: none;
      color: var(--brand-red);
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      text-decoration: underline;
    }
    .demo-otp-box {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border-radius: 0.75rem;
      background: #fffbeb;
      border: 1px solid #fde68a;
    }
    .demo-otp-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .demo-otp-left span {
      font-size: 22px;
    }
    .demo-otp-title {
      font-size: 12px;
      font-weight: 700;
      color: #92400e;
    }
    .demo-otp-sub {
      font-size: 11px;
      color: #b45309;
      margin-top: 1px;
    }
    .btn-autofill-otp {
      padding: 0.375rem 0.75rem;
      border-radius: 6px;
      background: #f59e0b;
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      border: none;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.15s;
    }
    .btn-autofill-otp:hover {
      background: #d97706;
    }
    .otp-boxes-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.875rem;
      margin-top: 0.25rem;
    }
    .otp-digit-box {
      width: 56px;
      height: 60px;
      border-radius: 0.75rem;
      border: 2px solid #cbd5e1;
      text-align: center;
      font-size: 24px;
      font-weight: 900;
      color: var(--text-slate-900);
      background: #ffffff;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .otp-digit-box:focus {
      border-color: var(--brand-red);
      box-shadow: 0 0 0 3px rgba(199, 52, 52, 0.15);
    }
    .resend-row {
      text-align: center;
      font-size: 12px;
    }
    .countdown-text {
      color: var(--text-slate-500);
    }
    .btn-resend {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: none;
      border: none;
      color: var(--brand-red);
      font-weight: 700;
      font-size: 12px;
      cursor: pointer;
    }
    .btn-resend span {
      font-size: 16px;
    }
    .modal-footer {
      padding: 0.875rem 1.75rem;
      background: #f8fafc;
      border-top: 1px solid #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      font-size: 11px;
      color: var(--text-slate-500);
      font-weight: 500;
    }
    .trust-icon {
      font-size: 14px;
      color: #059669;
    }
    /* Limit Alert Styling */
    .limit-alert {
      display: flex;
      gap: 0.875rem;
      align-items: flex-start;
      background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
      border: 1px solid #fde68a;
      border-radius: 12px;
      padding: 1rem 1.125rem;
      box-shadow: 0 2px 8px rgba(245, 158, 11, 0.08);
    }
    .limit-alert-icon-box {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: #fef08a;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .limit-title {
      display: block;
      font-size: 13px;
      font-weight: 700;
      color: #78350f;
      margin-bottom: 2px;
    }
    .limit-sub {
      font-size: 12px;
      line-height: 1.5;
      color: #92400e;
      margin: 0;
    }

    /* Instant 1-Click Login Styling */
    .instant-login-row {
      margin-top: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .instant-divider {
      position: relative;
      text-align: center;
    }
    .instant-divider::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 1px;
      background: #e2e8f0;
    }
    .instant-divider-text {
      position: relative;
      background: #ffffff;
      padding: 0 10px;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.06em;
      color: #94a3b8;
    }
    .btn-instant-demo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      width: 100%;
      padding: 0.875rem 1.25rem;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #ffffff;
      border: 1px solid #334155;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .btn-instant-demo:hover {
      background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(15, 23, 42, 0.22);
    }
    .instant-bolt {
      color: #f59e0b;
      font-size: 18px;
    }
    .spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: #ffffff;
      animation: spin 0.6s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class OtpLoginModalComponent {
  readonly authService = inject(AuthService);
  readonly notificationService = inject(NotificationService);

  @ViewChildren('otpBox0, otpBox1, otpBox2, otpBox3') otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  readonly step = signal<'phone' | 'otp'>('phone');
  readonly phone = signal<string>('9444100000');
  readonly name = signal<string>('Demo Investor');
  readonly otpDigits = signal<string[]>(['', '', '', '']);
  readonly countdown = signal<number>(30);

  quickDemoLogin(): void {
    this.authService.quickDemoLogin();
    this.resetOtpForm();
  }

  private timerInterval: any = null;

  closeModal(): void {
    this.authService.closeOtpModal();
    this.resetOtpForm();
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const clean = input.value.replace(/\D/g, '').slice(0, 10);
    this.phone.set(clean);
  }

  autoFillDemoPhone(): void {
    this.phone.set('9444100000');
    this.name.set('Demo Real Estate Investor');
  }

  onSendOtp(event: Event): void {
    event.preventDefault();
    if (this.phone().length < 10) return;

    this.authService.sendOtp(this.phone()).subscribe(res => {
      if (res.success) {
        this.step.set('otp');
        this.otpDigits.set(['', '', '', '']);
        this.startCountdown();
        this.notificationService.show({
          type: 'info',
          title: 'Verification Code Sent',
          message: `Demo OTP: ${res.dummyOtp} sent to +91 ${this.phone()}`,
          icon: 'sms'
        });
        setTimeout(() => {
          const firstBox = this.otpInputs?.first?.nativeElement;
          if (firstBox) firstBox.focus();
        }, 150);
      }
    });
  }

  onDigitInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const val = input.value.replace(/\D/g, '').slice(-1);

    const current = [...this.otpDigits()];
    current[index] = val;
    this.otpDigits.set(current);

    if (val && index < 3) {
      const inputsArray = this.otpInputs.toArray();
      inputsArray[index + 1]?.nativeElement.focus();
    }

    if (this.getCombinedOtp().length === 4) {
      this.submitVerification();
    }
  }

  onDigitKeydown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !this.otpDigits()[index] && index > 0) {
      const inputsArray = this.otpInputs.toArray();
      inputsArray[index - 1]?.nativeElement.focus();
    }
  }

  autoFillOtp(): void {
    const dummy = this.authService.lastSentOtp();
    const digits = dummy.padEnd(4, '0').slice(0, 4).split('');
    this.otpDigits.set(digits);
    this.submitVerification();
  }

  getCombinedOtp(): string {
    return this.otpDigits().join('');
  }

  onVerifyOtp(event: Event): void {
    event.preventDefault();
    this.submitVerification();
  }

  private submitVerification(): void {
    const code = this.getCombinedOtp();
    if (code.length < 4) return;

    this.authService.verifyOtp(this.phone(), code, this.name()).subscribe(res => {
      if (res.success) {
        this.resetOtpForm();
      } else {
        this.notificationService.show({
          type: 'error',
          title: 'Incorrect OTP Code',
          message: res.message,
          icon: 'lock_reset'
        });
      }
    });
  }

  resendOtp(): void {
    this.authService.sendOtp(this.phone()).subscribe(res => {
      this.otpDigits.set(['', '', '', '']);
      this.startCountdown();
      this.notificationService.show({
        type: 'info',
        title: 'New Code Sent',
        message: `Use demo code: ${res.dummyOtp}`,
        icon: 'autorenew'
      });
    });
  }

  private startCountdown(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.countdown.set(30);
    this.timerInterval = setInterval(() => {
      const curr = this.countdown();
      if (curr <= 1) {
        clearInterval(this.timerInterval);
        this.countdown.set(0);
      } else {
        this.countdown.set(curr - 1);
      }
    }, 1000);
  }

  private resetOtpForm(): void {
    this.step.set('phone');
    this.otpDigits.set(['', '', '', '']);
    if (this.timerInterval) clearInterval(this.timerInterval);
  }
}
