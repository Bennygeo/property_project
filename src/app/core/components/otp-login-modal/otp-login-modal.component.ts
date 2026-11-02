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
              <div class="header-badge-row">
                <span class="wa-live-badge">
                  <svg class="wa-badge-icon" viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.16 6.99C8.97 6.99 8.79 7 8.63 7.29C8.44 7.6 7.9 8.1 7.9 9.13C7.9 10.15 8.65 11.14 8.75 11.28C8.86 11.41 10.22 13.5 12.29 14.4C14 15.13 14.35 14.97 14.71 14.94C15.06 14.9 15.86 14.46 16.03 13.99C16.19 13.52 16.19 13.12 16.14 13.04C16.09 12.95 15.96 12.9 15.74 12.79C15.52 12.68 14.44 12.15 14.24 12.08C14.04 12 13.89 11.97 13.74 12.19C13.6 12.41 13.16 12.92 13.03 13.07C12.9 13.22 12.77 13.24 12.55 13.13C12.33 13.02 11.62 12.79 10.77 12.03C10.11 11.44 9.67 10.71 9.54 10.49C9.41 10.27 9.53 10.15 9.64 10.04C9.74 9.94 9.86 9.78 9.97 9.65C10.08 9.52 10.12 9.42 10.19 9.27C10.26 9.13 10.23 9 10.17 8.89C10.12 8.78 9.67 7.67 9.48 7.22C9.3 6.78 9.12 6.84 8.98 6.83C8.85 6.83 8.7 6.83 8.55 6.83" />
                  </svg>
                  <span>1-Click WhatsApp Verification</span>
                </span>
              </div>
              <h2 class="modal-title">
                @if (step() === 'phone') {
                  Sign In with WhatsApp
                } @else {
                  Confirm Verification Code
                }
              </h2>
              <p class="modal-subtitle">
                @if (step() === 'phone') {
                  Instant, secure &amp; 100% free • No SMS waiting
                } @else {
                  Verifying mobile number <strong>+91 {{ phone() }}</strong>
                  <button type="button" class="btn-link-edit" (click)="step.set('phone')">Change</button>
                }
              </p>
            </div>
            <button type="button" class="btn-close" (click)="closeModal()" aria-label="Close dialog">✕</button>
          </div>

          <!-- Minimal Notice if Guest View Limit Reached -->
          @if (authService.otpModalReason() === 'guest_limit' && step() === 'phone') {
            <div class="minimal-notice">
              <span class="material-symbols-outlined notice-icon">lock_open</span>
              <span>Sign in via WhatsApp to unlock unlimited verified property dossiers &amp; drone surveys</span>
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
                  placeholder="Enter 10-digit mobile number"
                  [value]="phone()"
                  (input)="onPhoneInput($event)"
                  autocomplete="tel-national"
                  autofocus
                  required />
              </div>

              <button 
                type="submit" 
                class="btn-whatsapp-primary" 
                [disabled]="phone().length < 10 || authService.isSubmitting()">
                @if (authService.isSubmitting()) {
                  <span class="spinner"></span>
                  <span>Generating Verification Link...</span>
                } @else {
                  <svg class="wa-btn-icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.16 6.99C8.97 6.99 8.79 7 8.63 7.29C8.44 7.6 7.9 8.1 7.9 9.13C7.9 10.15 8.65 11.14 8.75 11.28C8.86 11.41 10.22 13.5 12.29 14.4C14 15.13 14.35 14.97 14.71 14.94C15.06 14.9 15.86 14.46 16.03 13.99C16.19 13.52 16.19 13.12 16.14 13.04C16.09 12.95 15.96 12.9 15.74 12.79C15.52 12.68 14.44 12.15 14.24 12.08C14.04 12 13.89 11.97 13.74 12.19C13.6 12.41 13.16 12.92 13.03 13.07C12.9 13.22 12.77 13.24 12.55 13.13C12.33 13.02 11.62 12.79 10.77 12.03C10.11 11.44 9.67 10.71 9.54 10.49C9.41 10.27 9.53 10.15 9.64 10.04C9.74 9.94 9.86 9.78 9.97 9.65C10.08 9.52 10.12 9.42 10.19 9.27C10.26 9.13 10.23 9 10.17 8.89C10.12 8.78 9.67 7.67 9.48 7.22C9.3 6.78 9.12 6.84 8.98 6.83C8.85 6.83 8.7 6.83 8.55 6.83" />
                  </svg>
                  <span>Continue with WhatsApp</span>
                }
              </button>

              <!-- Instant Demo Bypass for Reviewers -->
              <div class="demo-login-wrap">
                <button type="button" class="btn-demo-quick" (click)="authService.quickDemoLogin()">
                  <span class="material-symbols-outlined demo-bolt">bolt</span>
                  <span>Reviewer Demo Login (Arun Kumar)</span>
                </button>
              </div>
            </form>
          }

          <!-- STEP 2: 1-Click Reverse WhatsApp Verification -->
          @if (step() === 'otp') {
            <div class="wa-step2-container">
              
              <!-- Highlighted WhatsApp Action Card -->
              <div class="wa-action-card">
                <div class="wa-action-badge">STEP 1: SEND ON WHATSAPP</div>
                
                <div class="code-highlight-row">
                  <span class="code-label">Verification Code:</span>
                  <div class="code-token-badge">
                    <span class="code-prefix">AUTH-</span>
                    <strong class="code-num">{{ authService.lastSentOtp() }}</strong>
                  </div>
                  <button type="button" class="btn-copy-code" (click)="copyCode()" [title]="isCopied() ? 'Copied to clipboard' : 'Copy code'">
                    <span class="material-symbols-outlined">{{ isCopied() ? 'check' : 'content_copy' }}</span>
                    <span>{{ isCopied() ? 'Copied' : 'Copy' }}</span>
                  </button>
                </div>

                <!-- 1-Click WhatsApp Button -->
                <a 
                  [href]="authService.pendingWhatsAppUrl()" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  class="btn-open-wa" 
                  (click)="onOpenWhatsApp()">
                  <svg class="wa-btn-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.16 6.99C8.97 6.99 8.79 7 8.63 7.29C8.44 7.6 7.9 8.1 7.9 9.13C7.9 10.15 8.65 11.14 8.75 11.28C8.86 11.41 10.22 13.5 12.29 14.4C14 15.13 14.35 14.97 14.71 14.94C15.06 14.9 15.86 14.46 16.03 13.99C16.19 13.52 16.19 13.12 16.14 13.04C16.09 12.95 15.96 12.9 15.74 12.79C15.52 12.68 14.44 12.15 14.24 12.08C14.04 12 13.89 11.97 13.74 12.19C13.6 12.41 13.16 12.92 13.03 13.07C12.9 13.22 12.77 13.24 12.55 13.13C12.33 13.02 11.62 12.79 10.77 12.03C10.11 11.44 9.67 10.71 9.54 10.49C9.41 10.27 9.53 10.15 9.64 10.04C9.74 9.94 9.86 9.78 9.97 9.65C10.08 9.52 10.12 9.42 10.19 9.27C10.26 9.13 10.23 9 10.17 8.89C10.12 8.78 9.67 7.67 9.48 7.22C9.3 6.78 9.12 6.84 8.98 6.83C8.85 6.83 8.7 6.83 8.55 6.83" />
                  </svg>
                  <span>1-Click Send via WhatsApp</span>
                  <span class="material-symbols-outlined open-icon">open_in_new</span>
                </a>

                <p class="wa-desk-sub">
                  Sends pre-filled code to our verified desk <strong>(+91 94441 00000)</strong>.
                </p>
              </div>

              <!-- Status Notice after clicking WhatsApp -->
              @if (hasSentOnWhatsApp()) {
                <div class="sent-success-banner">
                  <span class="material-symbols-outlined check-icon">check_circle</span>
                  <span>WhatsApp opened! Code pre-filled below. Click Confirm to unlock.</span>
                </div>
              }

              <!-- STEP 2: Code Confirmation & Input -->
              <form (submit)="onVerifyOtp($event)" class="modal-form">
                <div class="confirm-label-row">
                  <span class="confirm-step-badge">STEP 2: CONFIRM CODE</span>
                  <span class="confirm-help">Enter code or click confirm</span>
                </div>

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
                    <span class="countdown-text">Resend link in {{ countdown() }}s</span>
                  } @else {
                    <button type="button" class="btn-resend" (click)="resendOtp()">Generate New WhatsApp Link</button>
                  }
                </div>

                <button 
                  type="submit" 
                  class="btn-primary" 
                  [disabled]="getCombinedOtp().length < 4 || authService.isSubmitting()">
                  @if (authService.isSubmitting()) {
                    <span class="spinner"></span>
                    <span>Verifying Code...</span>
                  } @else {
                    <span class="material-symbols-outlined btn-lock-icon">verified_user</span>
                    <span>I Have Sent the Message — Confirm &amp; Unlock</span>
                  }
                </button>
              </form>
            </div>
          }

          <!-- Minimal Trust Footer -->
          <div class="modal-footer">
            <span class="material-symbols-outlined footer-icon">lock</span>
            <span>Zero API Cost • 100% Free Reverse Verification • 256-Bit Encrypted</span>
          </div>

        </div>
      </div>
    }
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.45);
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
      max-width: 410px;
      box-sizing: border-box;
      box-shadow: 0 24px 48px -12px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(15, 23, 42, 0.08);
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.15rem;
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
    .header-badge-row {
      margin-bottom: 0.35rem;
    }
    .wa-live-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 8px;
      background: #E7F8EE;
      color: #0E8345;
      border: 1px solid #A7F3D0;
      border-radius: 999px;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }
    .wa-badge-icon {
      color: #25D366;
    }
    .modal-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
      letter-spacing: -0.015em;
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
      color: #0E8345;
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
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      color: #94a3b8;
      cursor: pointer;
      transition: all 0.15s;
      flex-shrink: 0;
      font-size: 14px;
    }
    .btn-close:hover {
      background: #f1f5f9;
      color: #0f172a;
    }

    /* Minimal Notice */
    .minimal-notice {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 0.625rem 0.75rem;
      border-radius: 8px;
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      font-size: 0.75rem;
      color: #166534;
      font-weight: 500;
      line-height: 1.4;
    }
    .notice-icon {
      font-size: 16px;
      color: #16a34a;
      flex-shrink: 0;
      margin-top: 1px;
    }

    /* Form & Input */
    .modal-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
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
      border-color: #25D366;
      box-shadow: 0 0 0 3px rgba(37, 211, 102, 0.16);
    }
    .country-code {
      padding: 0 0.875rem;
      font-weight: 700;
      font-size: 0.9375rem;
      color: #334155;
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
      font-size: 1.0625rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      color: #0f172a;
    }
    .phone-input::placeholder {
      font-weight: 400;
      color: #94a3b8;
      font-size: 0.875rem;
      letter-spacing: normal;
    }

    /* Buttons */
    .btn-whatsapp-primary {
      height: 48px;
      border-radius: 0.625rem;
      background: #25D366;
      color: #ffffff;
      font-size: 0.9375rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(37, 211, 102, 0.28);
      transition: all 0.15s ease-in-out;
    }
    .btn-whatsapp-primary:hover:not(:disabled) {
      background: #1EBE5D;
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(37, 211, 102, 0.35);
    }
    .btn-whatsapp-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      box-shadow: none;
    }
    .wa-btn-icon {
      flex-shrink: 0;
    }

    .demo-login-wrap {
      text-align: center;
      margin-top: -0.25rem;
    }
    .btn-demo-quick {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #F1F5F9;
      color: #475569;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 6px 12px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-demo-quick:hover {
      background: #E2E8F0;
      color: #0F172A;
    }
    .demo-bolt {
      font-size: 14px;
      color: #EAB308;
    }

    /* STEP 2 - REVERSE WHATSAPP CARD */
    .wa-step2-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .wa-action-card {
      background: #F8FAFC;
      border: 1.5px solid #CBD5E1;
      border-radius: 0.75rem;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      position: relative;
    }
    .wa-action-badge {
      font-size: 0.625rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      color: #0E8345;
      background: #E7F8EE;
      border: 1px solid #A7F3D0;
      border-radius: 4px;
      padding: 2px 6px;
      align-self: flex-start;
    }
    .code-highlight-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 8px 12px;
    }
    .code-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #64748B;
    }
    .code-token-badge {
      display: inline-flex;
      align-items: baseline;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 1.125rem;
      color: #0F172A;
    }
    .code-prefix {
      color: #94A3B8;
      font-weight: 600;
      font-size: 0.875rem;
    }
    .code-num {
      color: #0E8345;
      font-weight: 800;
      letter-spacing: 0.05em;
    }
    .btn-copy-code {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #F1F5F9;
      border: 1px solid #E2E8F0;
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 0.6875rem;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-copy-code:hover {
      background: #E2E8F0;
      color: #0F172A;
    }
    .btn-copy-code span.material-symbols-outlined {
      font-size: 14px;
    }

    .btn-open-wa {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: #25D366;
      color: #ffffff;
      text-decoration: none;
      height: 44px;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 700;
      box-shadow: 0 4px 12px rgba(37, 211, 102, 0.25);
      transition: all 0.15s ease-in-out;
    }
    .btn-open-wa:hover {
      background: #1EBE5D;
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(37, 211, 102, 0.32);
      color: #ffffff;
    }
    .open-icon {
      font-size: 16px;
      opacity: 0.85;
    }
    .wa-desk-sub {
      font-size: 0.6875rem;
      color: #64748B;
      margin: 0;
      line-height: 1.35;
      text-align: center;
    }

    .sent-success-banner {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      background: #E7F8EE;
      border: 1px solid #86EFAC;
      border-radius: 6px;
      color: #0E8345;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .check-icon {
      font-size: 16px;
      color: #22C55E;
      flex-shrink: 0;
    }

    .confirm-label-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .confirm-step-badge {
      font-size: 0.625rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      color: #334155;
      background: #F1F5F9;
      border: 1px solid #CBD5E1;
      border-radius: 4px;
      padding: 2px 6px;
    }
    .confirm-help {
      font-size: 0.6875rem;
      color: #94A3B8;
    }

    /* Segmented OTP Boxes */
    .otp-boxes-grid {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      margin: 0.15rem 0;
    }
    .otp-box {
      width: 54px;
      height: 54px;
      flex-shrink: 0;
      box-sizing: border-box;
      border-radius: 0.5rem;
      border: 1.5px solid #cbd5e1;
      text-align: center;
      font-size: 1.5rem;
      font-weight: 700;
      color: #0f172a;
      background: #ffffff;
      outline: none;
      transition: all 0.15s ease;
    }
    .otp-box:focus {
      border-color: #25D366;
      box-shadow: 0 0 0 3px rgba(37, 211, 102, 0.18);
    }
    @media (max-width: 400px) {
      .otp-box {
        width: 46px;
        height: 48px;
        font-size: 1.25rem;
      }
      .otp-boxes-grid {
        gap: 0.5rem;
      }
    }

    /* Primary Submit Button */
    .btn-primary {
      height: 46px;
      border-radius: 0.5rem;
      background: #0E8345;
      color: #ffffff;
      font-size: 0.875rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(14, 131, 69, 0.25);
      transition: all 0.15s ease-in-out;
    }
    .btn-primary:hover:not(:disabled) {
      background: #096836;
      transform: translateY(-1px);
    }
    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      box-shadow: none;
    }
    .btn-lock-icon {
      font-size: 18px;
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
      color: #0E8345;
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
      text-align: center;
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
  readonly isCopied = signal<boolean>(false);
  readonly hasSentOnWhatsApp = signal<boolean>(false);

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
        this.hasSentOnWhatsApp.set(false);
        this.otpDigits.set(['', '', '', '']);
        this.startCountdown();
        this.notificationService.show({
          type: 'info',
          title: 'WhatsApp Link Generated',
          message: `Send verification code to +91 94441 00000 to verify +91 ${this.phone()}`,
          icon: 'chat'
        });
        setTimeout(() => {
          const firstBox = this.otpInputs?.first?.nativeElement;
          if (firstBox) firstBox.focus();
        }, 150);
      }
    });
  }

  copyCode(): void {
    const code = this.authService.lastSentOtp();
    const fullText = `AUTH-${code}`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(fullText).then(() => {
        this.isCopied.set(true);
        setTimeout(() => this.isCopied.set(false), 2000);
      }).catch(() => {
        this.fallbackCopy(fullText);
      });
    } else {
      this.fallbackCopy(fullText);
    }
  }

  private fallbackCopy(text: string): void {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    this.isCopied.set(true);
    setTimeout(() => this.isCopied.set(false), 2000);
  }

  onOpenWhatsApp(): void {
    this.hasSentOnWhatsApp.set(true);
    // Auto-populate the 4-digit code so returning user can immediately verify in 1 click
    const code = this.authService.lastSentOtp();
    if (code && code.length === 4) {
      this.otpDigits.set(code.split(''));
    }
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
          title: 'Incorrect Code',
          message: res.message,
          icon: 'lock_reset'
        });
      }
    });
  }

  resendOtp(): void {
    this.authService.sendOtp(this.phone()).subscribe(res => {
      this.otpDigits.set(['', '', '', '']);
      this.hasSentOnWhatsApp.set(false);
      this.startCountdown();
      this.notificationService.show({
        type: 'info',
        title: 'New WhatsApp Link Created',
        message: `New code AUTH-${res.dummyOtp} generated for +91 ${this.phone()}`,
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
    this.hasSentOnWhatsApp.set(false);
    this.isCopied.set(false);
    if (this.timerInterval) clearInterval(this.timerInterval);
  }
}
