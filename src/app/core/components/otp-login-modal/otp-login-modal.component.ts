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
        <div class="modal-card" (click)="$event.stopPropagation()">
          
          <!-- Modal Header -->
          <div class="modal-header">
            <div>
              <h2 class="modal-title">Sign In</h2>
              <p class="modal-subtitle">
                @if (step() === 'phone') {
                  Enter your mobile number to continue
                } @else {
                  Code sent to <strong>+91 {{ phone() }}</strong>
                  <button type="button" class="btn-link-edit" (click)="step.set('phone')">Edit</button>
                }
              </p>
            </div>
            <button type="button" class="btn-close" (click)="closeModal()" aria-label="Close dialog">✕</button>
          </div>

          <!-- Minimal Notice if Guest View Limit Reached -->
          @if (authService.otpModalReason() === 'guest_limit' && step() === 'phone') {
            <div class="minimal-notice">
              <span>Sign in to unlock full verified property details</span>
            </div>
          }

          <!-- STEP 1: Phone Entry -->
          @if (step() === 'phone') {
            <form (submit)="onSendOtp($event)" class="modal-form">
              <div class="phone-input-wrap">
                <span class="country-code">+91</span>
                <input 
                  id="phone-input"
                  type="tel"
                  inputmode="numeric"
                  maxlength="10"
                  class="phone-input"
                  placeholder="Enter 10-digit number"
                  [value]="phone()"
                  (input)="onPhoneInput($event)"
                  autocomplete="tel-national"
                  autofocus
                  required />
              </div>

              <button 
                type="submit" 
                class="btn-primary" 
                [disabled]="phone().length < 10 || authService.isSubmitting()">
                @if (authService.isSubmitting()) {
                  <span class="spinner"></span>
                  <span>Sending code...</span>
                } @else {
                  <span>Continue</span>
                }
              </button>
            </form>
          }

          <!-- STEP 2: 4-Digit OTP Entry -->
          @if (step() === 'otp') {
            <form (submit)="onVerifyOtp($event)" class="modal-form">
              <div class="otp-boxes-grid">
                <input 
                  #otpBox0 
                  type="text" 
                  inputmode="numeric" 
                  maxlength="1" 
                  class="otp-box"
                  [value]="otpDigits()[0]" 
                  (input)="onDigitInput(0, $event)"
                  (keydown)="onDigitKeydown(0, $event)"
                  autocomplete="one-time-code">
                <input 
                  #otpBox1 
                  type="text" 
                  inputmode="numeric" 
                  maxlength="1" 
                  class="otp-box"
                  [value]="otpDigits()[1]" 
                  (input)="onDigitInput(1, $event)"
                  (keydown)="onDigitKeydown(1, $event)">
                <input 
                  #otpBox2 
                  type="text" 
                  inputmode="numeric" 
                  maxlength="1" 
                  class="otp-box"
                  [value]="otpDigits()[2]" 
                  (input)="onDigitInput(2, $event)"
                  (keydown)="onDigitKeydown(2, $event)">
                <input 
                  #otpBox3 
                  type="text" 
                  inputmode="numeric" 
                  maxlength="1" 
                  class="otp-box"
                  [value]="otpDigits()[3]" 
                  (input)="onDigitInput(3, $event)"
                  (keydown)="onDigitKeydown(3, $event)">
              </div>

              <div class="resend-row">
                @if (countdown() > 0) {
                  <span class="countdown-text">Resend code in {{ countdown() }}s</span>
                } @else {
                  <button type="button" class="btn-resend" (click)="resendOtp()">Resend Code</button>
                }
              </div>

              <button 
                type="submit" 
                class="btn-primary" 
                [disabled]="getCombinedOtp().length < 4 || authService.isSubmitting()">
                @if (authService.isSubmitting()) {
                  <span class="spinner"></span>
                  <span>Verifying...</span>
                } @else {
                  <span>Verify &amp; Continue</span>
                }
              </button>
            </form>
          }

          <!-- Minimal Trust Footer -->
          <div class="modal-footer">
            <span>256-Bit Encrypted • Secure Access</span>
          </div>

        </div>
      </div>
    }
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.4);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      animation: fadeIn 0.15s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal-card {
      background: #ffffff;
      border-radius: 1rem;
      width: 100%;
      max-width: 390px;
      box-sizing: border-box;
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      animation: scaleUp 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .modal-card * {
      box-sizing: border-box;
    }
    @keyframes scaleUp {
      from { transform: scale(0.97) translateY(6px); opacity: 0; }
      to { transform: scale(1) translateY(0); opacity: 1; }
    }

    /* Header */
    .modal-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
    }
    .modal-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: #0f172a;
      margin: 0;
      letter-spacing: -0.01em;
    }
    .modal-subtitle {
      font-size: 0.8125rem;
      color: #64748b;
      margin-top: 0.25rem;
      margin-bottom: 0;
      line-height: 1.4;
    }
    .btn-link-edit {
      background: none;
      border: none;
      color: var(--brand-green, #5e8f72);
      font-weight: 600;
      font-size: 0.8125rem;
      cursor: pointer;
      margin-left: 0.35rem;
      text-decoration: underline;
      padding: 0;
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
      color: #94a3b8;
      cursor: pointer;
      transition: all 0.15s;
      flex-shrink: 0;
    }
    .btn-close:hover {
      background: #f1f5f9;
      color: #0f172a;
    }
    .btn-close span {
      font-size: 20px;
    }

    /* Minimalist Alert */
    .minimal-notice {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 0.75rem;
      border-radius: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      font-size: 0.75rem;
      color: #475569;
      font-weight: 500;
    }
    .notice-icon {
      font-size: 16px;
      color: #f59e0b;
      flex-shrink: 0;
    }

    /* Form & Input */
    .modal-form {
      display: flex;
      flex-direction: column;
      gap: 1.125rem;
    }
    .phone-input-wrap {
      display: flex;
      align-items: center;
      border: 1.5px solid #cbd5e1;
      border-radius: 0.625rem;
      background: #ffffff;
      height: 48px;
      overflow: hidden;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .phone-input-wrap:focus-within {
      border-color: var(--brand-green, #5e8f72);
      box-shadow: 0 0 0 3px rgba(199, 52, 52, 0.12);
    }
    .country-code {
      padding: 0 0.875rem;
      font-weight: 600;
      font-size: 0.9375rem;
      color: #475569;
      background: #f8fafc;
      height: 100%;
      display: flex;
      align-items: center;
      border-right: 1px solid #e2e8f0;
    }
    .phone-input {
      flex: 1;
      height: 100%;
      border: none;
      outline: none;
      padding: 0 0.875rem;
      font-size: 1rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      color: #0f172a;
    }
    .phone-input::placeholder {
      font-weight: 400;
      color: #94a3b8;
      font-size: 0.875rem;
      letter-spacing: normal;
    }

    /* Primary Button */
    .btn-primary {
      height: 46px;
      border-radius: 0.625rem;
      background: var(--brand-green, #5e8f72);
      color: #ffffff;
      font-size: 0.875rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      border: none;
      cursor: pointer;
      transition: all 0.15s ease-in-out;
    }
    .btn-primary:hover:not(:disabled) {
      background: #5e8f72;
      transform: translateY(-1px);
    }
    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Segmented OTP Boxes */
    .otp-boxes-grid {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      margin: 0.25rem 0;
    }
    .otp-box {
      width: 54px;
      height: 56px;
      flex-shrink: 0;
      box-sizing: border-box;
      border-radius: 0.625rem;
      border: 1.5px solid #cbd5e1;
      text-align: center;
      font-size: 1.5rem;
      font-weight: 600;
      color: #0f172a;
      background: #ffffff;
      outline: none;
      transition: all 0.15s ease;
    }
    .otp-box:focus {
      border-color: var(--brand-green, #5e8f72);
      box-shadow: 0 0 0 3px rgba(199, 52, 52, 0.12);
    }
    @media (max-width: 400px) {
      .otp-box {
        width: 48px;
        height: 50px;
        font-size: 1.25rem;
      }
      .otp-boxes-grid {
        gap: 0.5rem;
      }
    }

    /* Resend text */
    .resend-row {
      text-align: center;
      font-size: 0.75rem;
    }
    .countdown-text {
      color: #64748b;
    }
    .btn-resend {
      background: none;
      border: none;
      color: var(--brand-green, #5e8f72);
      font-weight: 600;
      font-size: 0.75rem;
      cursor: pointer;
      padding: 0;
      text-decoration: underline;
    }

    /* Minimal Footer */
    .modal-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      font-size: 0.6875rem;
      color: #94a3b8;
      padding-top: 0.5rem;
      border-top: 1px solid #f1f5f9;
    }
    .footer-icon {
      font-size: 13px;
      color: #10b981;
    }

    .spinner {
      width: 16px;
      height: 16px;
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
  readonly phone = signal<string>('');
  readonly otpDigits = signal<string[]>(['', '', '', '']);
  readonly countdown = signal<number>(30);

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
          message: `Verification code sent to +91 ${this.phone()}`,
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

    this.authService.verifyOtp(this.phone(), code).subscribe(res => {
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
        message: `A new verification code has been sent to +91 ${this.phone()}`,
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
