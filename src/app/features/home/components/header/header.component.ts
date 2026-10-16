import { Component, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { WalletService } from '../../../../core/services/wallet.service';
import { PropertyService } from '../../../../core/services/property.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="main-header">
      <div class="max-w-content header-inner">
        <!-- Brand & City Switcher -->
        <div class="header-brand-group">
          <a class="brand-link" routerLink="/">
            <img 
              alt="Mannidam Real Estate Marketplace Logo" 
              class="brand-logo" 
              src="/logo.svg">
            <div class="brand-text">
              <span class="editorial-tag brand-name">MANNIDAM</span>
              <span class="brand-tagline">Registry &amp; No-Brokerage</span>
            </div>
          </a>

          <!-- City Selector (Google Material Dropdown Combobox) -->
          <div 
            class="mat-dropdown-container header-city-dropdown"
            [class.is-open]="isCityDropdownOpen()"
            (click)="$event.stopPropagation()">
            <div 
              class="city-selector-box mat-dropdown-trigger"
              role="combobox"
              [attr.aria-expanded]="isCityDropdownOpen()"
              aria-haspopup="listbox"
              aria-label="Select City Jurisdiction"
              tabindex="0"
              (click)="toggleCityDropdown()"
              (keydown.enter)="toggleCityDropdown()"
              (keydown.space)="toggleCityDropdown(); $event.preventDefault()">
              <span class="material-symbols-outlined text-red loc-icon">location_on</span>
              <span class="city-selected-name">{{ getSelectedCityLabel() }}</span>
              <span class="material-symbols-outlined expand-icon" [class.rotated]="isCityDropdownOpen()">expand_more</span>
            </div>

            @if (isCityDropdownOpen()) {
              <div class="mat-dropdown-panel header-city-panel" role="listbox" aria-label="City Options">
                <div class="mat-dropdown-panel-inner">
                  @for (city of cities; track city.value) {
                    <div 
                      class="mat-dropdown-item"
                      role="option"
                      [attr.aria-selected]="propertyService.selectedCity() === city.value"
                      [class.selected]="propertyService.selectedCity() === city.value"
                      (click)="selectCity(city.value)">
                      <div class="item-left">
                        <span class="material-symbols-outlined item-icon">apartment</span>
                        <div class="item-text-group">
                          <span class="item-label">{{ city.label }}</span>
                          <span class="item-sub">{{ city.sub }}</span>
                        </div>
                      </div>
                      @if (propertyService.selectedCity() === city.value) {
                        <span class="material-symbols-outlined item-check">check</span>
                      }
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Navigation Links -->
        <nav class="nav-links">
          <a 
            class="nav-link" 
            [class.active]="propertyService.activeTab() === 'buy'" 
            (click)="setTab('buy')">Buy</a>
          <a class="nav-link" routerLink="/search" [queryParams]="{ type: 'Gated CMDA Plots' }">Plots &amp; Land</a>
          <a class="nav-link" routerLink="/search" [queryParams]="{ type: 'Commercial Spaces' }">Commercial</a>
          <a class="nav-link hot-link" routerLink="/search">
            Search Registry
            <span class="badge-hot">LIVE</span>
          </a>
        </nav>

        <!-- Right Actions -->
        <div class="header-actions">
          <!-- Interactive Points Wallet Balance Pill -->
          <a 
            routerLink="/wallet" 
            (click)="walletService.navigateToWallet()" 
            class="wallet-pill-wrapper" 
            title="Click to view full Wallet &amp; Payment Options" 
            style="text-decoration: none; color: inherit; display: inline-block; cursor: pointer;">
            <div class="wallet-pill">
              <span class="coin-icon">🪙</span>
              <div class="wallet-details">
                <div class="wallet-top-line">
                  <span class="pts-number">{{ walletService.balance() }} Pts</span>
                  <span class="topup-btn">+ TOP UP</span>
                </div>
                <span class="wallet-rate">2 Pts = ₹100</span>
              </div>
            </div>

            <!-- Hover Tooltip -->
            <div class="wallet-tooltip">
              <div class="tooltip-header">
                <span>Media Points Wallet</span>
                <span>{{ walletService.balance() }} Points Available</span>
              </div>
              <p class="tooltip-body">
                2 Pts = ₹100 • 10 Pts = ₹500 via Razorpay. Click anywhere on this button to open dedicated wallet recharge &amp; payment options.
              </p>
              <div class="tooltip-footer">
                ✓ Click to open Media Wallet &amp; Payments →
              </div>
            </div>
          </a>

          <!-- Shortlist Counter -->
          <a class="shortlist-btn" href="#featured-section">
            <span class="material-symbols-outlined text-red">favorite_border</span>
            <span class="hidden-sm">Shortlist</span>
            <span class="shortlist-count">{{ propertyService.shortlistCount() }}</span>
          </a>

          <!-- Post Property FREE CTA -->
          <button class="post-property-btn" (click)="onPostPropertyClick()">
            <span>Post Property</span>
            <span class="badge-free">FREE</span>
          </button>

          <!-- Account / User Menu Dropdown -->
          @if (authService.isLoggedIn()) {
            <div class="user-menu-wrapper" (click)="$event.stopPropagation()">
              <button 
                class="user-profile-btn" 
                aria-label="User Account Menu" 
                (click)="toggleUserMenu()">
                <div class="user-avatar-mini">
                  {{ getUserInitials() }}
                </div>
                <div class="user-btn-details">
                  <span class="user-btn-name">{{ getFirstName() }}</span>
                  <span class="user-btn-role">Investor</span>
                </div>
                <span class="material-symbols-outlined user-expand-icon" [class.rotated]="isUserMenuOpen()">expand_more</span>
              </button>

              @if (isUserMenuOpen()) {
                <div class="user-dropdown-panel">
                  <div class="user-dropdown-header">
                    <div class="dd-name">{{ authService.currentUser()?.name }}</div>
                    <div class="dd-phone">{{ authService.currentUser()?.phone }}</div>
                    <div class="dd-points" (click)="walletService.navigateToWallet(); isUserMenuOpen.set(false)" style="cursor: pointer;" title="Open Dedicated Wallet">
                      <span class="coin-icon">🪙</span>
                      <span>{{ walletService.balance() }} Media Points (Click for Wallet)</span>
                    </div>
                  </div>

                  <div class="user-dropdown-body">
                    <a routerLink="/admin" class="dropdown-item" (click)="isUserMenuOpen.set(false)">
                      <span class="material-symbols-outlined text-purple">admin_panel_settings</span>
                      <span>Admin Review Portal (Maker-Checker)</span>
                    </a>
                    <a routerLink="/wallet" class="dropdown-item" (click)="isUserMenuOpen.set(false)">
                      <span class="material-symbols-outlined text-amber">account_balance_wallet</span>
                      <span>Media Wallet &amp; Payments</span>
                    </a>
                    <a routerLink="/profile" class="dropdown-item" (click)="isUserMenuOpen.set(false)">
                      <span class="material-symbols-outlined">dashboard</span>
                      <span>Investor Dashboard</span>
                    </a>
                    <a routerLink="/profile" class="dropdown-item" (click)="isUserMenuOpen.set(false)">
                      <span class="material-symbols-outlined">favorite</span>
                      <span>Saved Shortlists ({{ propertyService.shortlistCount() }})</span>
                    </a>
                    <a routerLink="/profile" class="dropdown-item" (click)="isUserMenuOpen.set(false)">
                      <span class="material-symbols-outlined">event_available</span>
                      <span>Scheduled Site Visits</span>
                    </a>
                    <div class="dropdown-divider"></div>
                    <button type="button" class="dropdown-item text-red" (click)="onSignOut()">
                      <span class="material-symbols-outlined">logout</span>
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              }
            </div>
          } @else {
            <button class="signin-btn" (click)="authService.openOtpModal()">
              <span class="material-symbols-outlined">login</span>
              <span>Sign In</span>
            </button>
          }
        </div>
      </div>
    </header>
  `,
  styles: [`
    .main-header {
      position: sticky;
      top: 0;
      z-index: 50;
      width: 100%;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(8px);
      border-bottom: 1px solid var(--hairline-border);
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
    }
    .header-inner {
      height: 80px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.5rem;
    }
    .header-brand-group {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      flex-shrink: 0;
    }
    .brand-link {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      text-decoration: none;
      color: inherit;
    }
    .brand-logo {
      height: 36px;
      width: auto;
      object-fit: contain;
    }
    .brand-text {
      display: flex;
      flex-direction: column;
    }
    .brand-name {
      color: var(--text-slate-950);
      letter-spacing: 0.2em;
      font-size: 13px;
      font-weight: 900;
      line-height: 1.1;
    }
    .brand-tagline {
      font-size: 10px;
      color: var(--text-slate-500);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      line-height: 1.2;
    }
    .header-city-dropdown {
      display: none;
      position: relative;
      width: auto;
    }
    @media (min-width: 768px) {
      .header-city-dropdown {
        display: block;
      }
    }
    .header-city-panel {
      min-width: 250px;
      left: 0;
      top: calc(100% + 6px);
    }
    .city-selected-name {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-slate-800);
      white-space: nowrap;
      user-select: none;
    }
    .city-selector-box {
      display: flex;
      align-items: center;
      background: #ffffff;
      border: 1.5px solid #cbd5e1;
      border-radius: 10px;
      padding: 0.375rem 0.625rem;
      gap: 6px;
      position: relative;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
      cursor: pointer;
    }
    .city-selector-box:hover {
      background: #f8fafc;
      border-color: #64748b;
    }
    .header-city-dropdown.is-open .city-selector-box {
      background: #ffffff;
      border-color: var(--brand-red);
      box-shadow: 0 0 0 3px rgba(199, 52, 52, 0.15);
    }
    .loc-icon {
      font-size: 18px;
      margin-right: 2px;
      color: var(--brand-red);
      transition: transform 0.2s ease;
    }
    .header-city-dropdown.is-open .loc-icon {
      transform: scale(1.1);
    }
    .expand-icon {
      font-size: 18px;
      color: var(--text-slate-500);
      transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), color 0.15s ease;
    }
    .expand-icon.rotated {
      transform: rotate(180deg);
      color: var(--brand-red);
    }
    .text-red {
      color: var(--brand-red);
    }
    .nav-links {
      display: none;
      align-items: center;
      gap: 1.5rem;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.01em;
      color: var(--text-slate-700);
      white-space: nowrap;
      flex-shrink: 0;
    }
    @media (min-width: 1024px) {
      .nav-links {
        display: flex;
      }
    }
    .nav-link {
      text-decoration: none;
      color: inherit;
      padding-bottom: 4px;
      border-bottom: 2px solid transparent;
      transition: all 0.15s;
      cursor: pointer;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
    }
    .nav-link:hover {
      color: var(--text-slate-950);
    }
    .nav-link.active {
      color: var(--brand-red);
      font-weight: 700;
      border-bottom-color: var(--brand-red);
    }
    .hot-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .badge-hot {
      padding: 2px 6px;
      font-size: 9px;
      font-weight: 900;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      background: #fef3c7;
      color: #92400e;
      border-radius: 4px;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-shrink: 0;
    }
    @media (min-width: 640px) {
      .header-actions {
        gap: 1rem;
      }
    }
    .wallet-pill-wrapper {
      position: relative;
      cursor: pointer;
    }
    .wallet-pill {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem 0.75rem;
      border-radius: 9999px;
      background: #fffbeb;
      border: 1px solid #fde68a;
      transition: all 0.15s;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    }
    .wallet-pill-wrapper:hover .wallet-pill {
      background: #fef3c7;
      border-color: #fcd34d;
    }
    .coin-icon {
      font-size: 16px;
      line-height: 1;
    }
    .wallet-details {
      display: flex;
      flex-direction: column;
      line-height: 1;
    }
    .wallet-top-line {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .pts-number {
      font-size: 12px;
      font-weight: 900;
      color: #451a03;
    }
    .topup-btn {
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      background: #f59e0b;
      color: #ffffff;
      border: none;
      cursor: pointer;
      transition: background 0.15s;
    }
    .topup-btn:hover {
      background: #d97706;
    }
    .wallet-rate {
      display: none;
      font-size: 9px;
      font-family: ui-monospace, monospace;
      color: #92400e;
      font-weight: 600;
      margin-top: 2px;
    }
    @media (min-width: 640px) {
      .wallet-rate {
        display: inline;
      }
    }
    .wallet-tooltip {
      position: absolute;
      right: 0;
      top: 100%;
      margin-top: 8px;
      display: none;
      flex-direction: column;
      width: 240px;
      padding: 0.75rem;
      border-radius: 0.75rem;
      background: #020617;
      color: #ffffff;
      font-size: 12px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4);
      border: 1px solid #1e293b;
      z-index: 100;
      pointer-events: none;
    }
    .wallet-pill-wrapper:hover .wallet-tooltip {
      display: flex;
    }
    .tooltip-header {
      display: flex;
      justify-content: space-between;
      font-weight: 700;
      color: #fbbf24;
      margin-bottom: 4px;
    }
    .tooltip-body {
      font-size: 11px;
      color: #cbd5e1;
      line-height: 1.4;
    }
    .tooltip-footer {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid #1e293b;
      font-size: 10px;
      color: #34d399;
      font-family: ui-monospace, monospace;
    }
    .shortlist-btn {
      display: none;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-slate-700);
      padding: 0.5rem 0.625rem;
      border-radius: 8px;
      text-decoration: none;
      transition: all 0.15s;
    }
    @media (min-width: 640px) {
      .shortlist-btn {
        display: inline-flex;
      }
    }
    .shortlist-btn:hover {
      background: #f1f5f9;
      color: var(--text-slate-950);
    }
    .shortlist-count {
      padding: 1px 6px;
      background: #e2e8f0;
      color: #0f172a;
      font-size: 10px;
      font-weight: 800;
      border-radius: 9999px;
    }
    .post-property-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 0.625rem 1rem;
      border-radius: 8px;
      color: #ffffff;
      font-weight: 700;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: #0f172a;
      border: none;
      cursor: pointer;
      transition: all 0.15s;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    }
    .post-property-btn:hover {
      background: #020617;
    }
    .badge-free {
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 900;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      background: #10b981;
      color: #ffffff;
    }
    .signin-btn {
      height: 40px;
      padding: 0 1rem;
      border-radius: 8px;
      border: 1px solid var(--hairline-border);
      background: #f8fafc;
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 13px;
      font-weight: 700;
      color: var(--text-slate-800);
      cursor: pointer;
      transition: all 0.15s;
    }
    .signin-btn:hover {
      background: #fee2e2;
      border-color: #fca5a5;
      color: var(--brand-red);
    }
    .signin-btn span.material-symbols-outlined {
      font-size: 18px;
    }

    /* User Profile Pill & Dropdown */
    .user-menu-wrapper {
      position: relative;
    }
    .user-profile-btn {
      height: 42px;
      padding: 0 0.75rem 0 0.375rem;
      border-radius: 9999px;
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      transition: all 0.15s;
    }
    .user-profile-btn:hover {
      border-color: var(--brand-red);
      background: #fffafa;
    }
    .user-avatar-mini {
      width: 32px;
      height: 32px;
      border-radius: 9999px;
      background: linear-gradient(135deg, #b91c1c, #450a0a);
      color: #ffffff;
      font-size: 12px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .user-btn-details {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      line-height: 1.15;
    }
    .user-btn-name {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-slate-900);
      max-width: 90px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .user-btn-role {
      font-size: 10px;
      color: #059669;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .user-expand-icon {
      font-size: 16px;
      color: var(--text-slate-400);
      transition: transform 0.2s;
    }
    .user-expand-icon.rotated {
      transform: rotate(180deg);
    }
    .user-dropdown-panel {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 260px;
      background: #ffffff;
      border-radius: 1rem;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      border: 1px solid #e2e8f0;
      overflow: hidden;
      z-index: 100;
      animation: ddFadeIn 0.15s ease-out;
    }
    @keyframes ddFadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .user-dropdown-header {
      padding: 1rem;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }
    .dd-name {
      font-size: 14px;
      font-weight: 800;
      color: var(--text-slate-950);
    }
    .dd-phone {
      font-size: 12px;
      color: var(--text-slate-500);
      margin-top: 2px;
    }
    .dd-points {
      margin-top: 0.5rem;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 0.25rem 0.5rem;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      color: #92400e;
    }
    .user-dropdown-body {
      padding: 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 0.625rem 0.75rem;
      border-radius: 0.5rem;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-slate-700);
      text-decoration: none;
      background: none;
      border: none;
      width: 100%;
      text-align: left;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }
    .dropdown-item:hover {
      background: #f1f5f9;
      color: var(--text-slate-950);
    }
    .dropdown-item.text-red {
      color: #b91c1c;
    }
    .dropdown-item.text-red:hover {
      background: #fee2e2;
    }
    .dropdown-item span.material-symbols-outlined {
      font-size: 18px;
    }
    .dropdown-divider {
      height: 1px;
      background: #f1f5f9;
      margin: 0.25rem 0;
    }
    @media (max-width: 640px) {
      .hidden-sm { display: none; }
    }
  `]
})
export class HeaderComponent {
  private readonly router = inject(Router);
  readonly walletService = inject(WalletService);
  readonly propertyService = inject(PropertyService);
  readonly notificationService = inject(NotificationService);

  readonly isCityDropdownOpen = signal<boolean>(false);

  readonly cities = [
    { value: 'chennai', label: 'Chennai (HQ)', sub: 'CMDA Jurisdiction' },
    { value: 'bengaluru', label: 'Bengaluru', sub: 'BDA / BMRDA Jurisdiction' },
    { value: 'hyderabad', label: 'Hyderabad', sub: 'HMDA Jurisdiction' },
    { value: 'mumbai', label: 'Mumbai', sub: 'MMRDA Jurisdiction' },
    { value: 'delhi-ncr', label: 'Delhi NCR', sub: 'DDA / NOIDA Jurisdiction' }
  ];

  toggleCityDropdown(): void {
    this.isCityDropdownOpen.update(v => !v);
  }

  selectCity(cityKey: string): void {
    this.propertyService.selectedCity.set(cityKey);
    this.isCityDropdownOpen.set(false);
    this.notificationService.show({
      type: 'info',
      title: 'City Switched',
      message: `Active cadastral jurisdiction switched to ${cityKey.toUpperCase()}.`,
      icon: 'location_city'
    });
  }

  getSelectedCityLabel(): string {
    const found = this.cities.find(c => c.value === this.propertyService.selectedCity());
    return found ? found.label : 'Chennai (HQ)';
  }

  readonly authService = inject(AuthService);
  readonly isUserMenuOpen = signal<boolean>(false);

  toggleUserMenu(): void {
    this.isUserMenuOpen.update(v => !v);
  }

  getUserInitials(): string {
    const name = this.authService.currentUser()?.name || 'Investor';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  getFirstName(): string {
    const name = this.authService.currentUser()?.name || 'Investor';
    return name.split(' ')[0];
  }

  onSignOut(): void {
    this.isUserMenuOpen.set(false);
    this.authService.logout();
    this.router.navigate(['/']);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.isCityDropdownOpen.set(false);
    this.isUserMenuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.isCityDropdownOpen.set(false);
    this.isUserMenuOpen.set(false);
  }

  setTab(tab: 'buy' | 'rent'): void {
    this.propertyService.activeTab.set(tab);
    this.router.navigate(['/search'], { queryParams: { mode: tab } });
  }

  onPostPropertyClick(): void {
    this.router.navigate(['/post-property']);
  }

  onAccountClick(): void {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/profile']);
    } else {
      this.authService.openOtpModal();
    }
  }
}
