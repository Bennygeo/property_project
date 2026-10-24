import { Component, inject, signal, HostListener, OnInit, OnDestroy } from '@angular/core';
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
  host: {
    '[class.drawer-open]': 'isMobileMenuOpen()'
  },
  template: `
    <header class="main-header" [class.is-scrolled]="isScrolled()">
      <div class="max-w-content header-inner">
        <!-- Brand & City Switcher -->
        <div class="header-brand-group">
          <a class="brand-link" routerLink="/">
            <img 
              alt="Find a Plot Real Estate Marketplace Logo" 
              class="brand-logo" 
              src="logo.svg">
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
          <a class="nav-link" routerLink="/search" [queryParams]="{ type: 'Gated CMDA Plots' }">Plots &amp; Land</a>
          <a class="nav-link" routerLink="/search" [queryParams]="{ type: 'Commercial Spaces' }">Commercial</a>
          <a class="nav-link" routerLink="/search">Search Registry</a>
        </nav>

        <!-- Right Actions -->
        <div class="header-actions">
          <!-- Minimalistic Points View -->
          <a 
            routerLink="/wallet" 
            (click)="walletService.navigateToWallet()" 
            class="minimal-points-pill" 
            title="Media Points Balance: {{ walletService.balance() }} (Click for Wallet)">
            <span class="material-symbols-outlined points-glyph">token</span>
            <span class="points-val">{{ walletService.balance() }}</span>
            <span class="points-lbl">Pts</span>
          </a>

          <!-- Shortlist Counter -->
          <a class="shortlist-btn" href="#featured-section" title="Saved Properties">
            <span class="material-symbols-outlined text-red">favorite_border</span>
            <span class="hidden-sm">Shortlist</span>
            <span class="shortlist-count">{{ propertyService.shortlistCount() }}</span>
          </a>

          <!-- Post Property CTA (Desktop Only) -->
          <button class="post-property-btn desktop-only-btn" (click)="onPostPropertyClick()">
            <span class="material-symbols-outlined">add_home</span>
            <span>POST PROPERTY</span>
            <span class="badge-free">FREE</span>
          </button>

          <!-- Account / User Menu Dropdown (Desktop Only) -->
          @if (authService.isLoggedIn()) {
            <div class="user-menu-wrapper desktop-only-user" (click)="$event.stopPropagation()">
              <button 
                class="user-profile-btn" 
                aria-label="User Account Menu" 
                (click)="toggleUserMenu()">
                <div class="user-avatar-mini" aria-hidden="true">
                  <span class="material-symbols-outlined avatar-gender-icon">{{ getUserGenderIcon() }}</span>
                </div>
                <div class="user-btn-details">
                  <span class="user-btn-name">{{ getFirstName() }}</span>
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
                      <span>My Dashboard</span>
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
            <button class="signin-btn desktop-only-signin" (click)="authService.openOtpModal()">
              <span class="material-symbols-outlined">login</span>
              <span>Sign In</span>
            </button>
          }

          <!-- Mobile Menu Hamburger Button -->
          <button 
            type="button" 
            class="mobile-menu-btn" 
            [class.is-active]="isMobileMenuOpen()"
            (click)="toggleMobileMenu(); $event.stopPropagation()"
            aria-label="Toggle navigation menu">
            <span class="material-symbols-outlined">{{ isMobileMenuOpen() ? 'close' : 'menu' }}</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Mobile Navigation Drawer (mounted outside header to prevent backdrop-filter trap) -->
    @if (isMobileMenuOpen()) {
      <div class="mobile-drawer-backdrop" (click)="closeMobileMenu()">
        <div class="mobile-drawer-panel" (click)="$event.stopPropagation()">
            <!-- Drawer Header -->
            <div class="drawer-header">
              <div class="drawer-brand">
                <img src="logo.svg" alt="Find a Plot Logo" class="drawer-logo">
              </div>
              <button type="button" class="drawer-close-btn" (click)="closeMobileMenu()" aria-label="Close menu">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>

            <div class="drawer-scroll-body">
              <!-- User / Auth Banner inside Drawer -->
              @if (authService.isLoggedIn()) {
                <div class="drawer-user-card">
                  <div class="drawer-user-avatar">
                    <span class="material-symbols-outlined">{{ getUserGenderIcon() }}</span>
                  </div>
                  <div class="drawer-user-info">
                    <span class="drawer-user-name">{{ authService.currentUser()?.name }}</span>
                    <span class="drawer-user-role">{{ authService.currentUser()?.phone }}</span>
                    <div class="drawer-user-pts" (click)="walletService.navigateToWallet(); closeMobileMenu()">
                    </div>
                  </div>
                </div>
              } @else {
                <button type="button" class="drawer-btn-signin" (click)="authService.openOtpModal(); closeMobileMenu()">
                  <span class="material-symbols-outlined">login</span>
                  <span>Sign In</span>
                </button>
              }

              <!-- City Jurisdiction Picker in Drawer -->
              <div class="drawer-section">
                <span class="drawer-section-title">Cadastral Jurisdiction</span>
                <div class="drawer-cities-list">
                  @for (city of cities; track city.value) {
                    <button 
                      type="button" 
                      class="drawer-city-chip" 
                      [class.active]="propertyService.selectedCity() === city.value"
                      (click)="selectCity(city.value); closeMobileMenu()">
                      <div class="city-texts">
                        <span class="city-title">{{ city.label }}</span>
                        <span class="city-sub">{{ city.sub }}</span>
                      </div>
                      @if (propertyService.selectedCity() === city.value) {
                        <span class="material-symbols-outlined check-icon">check</span>
                      }
                    </button>
                  }
                </div>
              </div>

              <!-- Main Navigation Links in Drawer -->
              <div class="drawer-section">
                <span class="drawer-section-title">Explore Registry</span>
                <nav class="drawer-nav">
                  <a class="drawer-nav-item" routerLink="/" (click)="closeMobileMenu()">
                    <span class="material-symbols-outlined">home</span>
                    <span>Home Registry</span>
                  </a>
                  <a class="drawer-nav-item" routerLink="/search" (click)="closeMobileMenu()">
                    <span class="material-symbols-outlined text-red">search</span>
                    <span>Search Verified Registry</span>
                  </a>
                  <a class="drawer-nav-item" (click)="setTab('buy'); closeMobileMenu()">
                    <span class="material-symbols-outlined">apartment</span>
                    <span>Buy Apartments &amp; Flats</span>
                  </a>
                  <a class="drawer-nav-item" routerLink="/search" [queryParams]="{ type: 'Gated CMDA Plots' }" (click)="closeMobileMenu()">
                    <span class="material-symbols-outlined">terrain</span>
                    <span>Plots &amp; Land (CMDA)</span>
                  </a>
                  <a class="drawer-nav-item" routerLink="/search" [queryParams]="{ type: 'Commercial Spaces' }" (click)="closeMobileMenu()">
                    <span class="material-symbols-outlined">domain</span>
                    <span>Commercial Spaces</span>
                  </a>
                  <a class="drawer-nav-item" routerLink="/wallet" (click)="closeMobileMenu()">
                    <span class="material-symbols-outlined text-amber">account_balance_wallet</span>
                    <span>Media Points Wallet</span>
                    <span class="pts-badge">{{ walletService.balance() }} Pts</span>
                  </a>
                  <a class="drawer-nav-item" href="#featured-section" (click)="closeMobileMenu()">
                    <span class="material-symbols-outlined text-red">favorite</span>
                    <span>Saved Shortlists</span>
                    <span class="pts-badge">{{ propertyService.shortlistCount() }}</span>
                  </a>
                  @if (authService.isLoggedIn()) {
                    <a class="drawer-nav-item" routerLink="/profile" (click)="closeMobileMenu()">
                      <span class="material-symbols-outlined">dashboard</span>
                      <span>My Dashboard</span>
                    </a>
                    <a class="drawer-nav-item" routerLink="/admin" (click)="closeMobileMenu()">
                      <span class="material-symbols-outlined text-purple">admin_panel_settings</span>
                      <span>Compliance Portal</span>
                    </a>
                  }
                </nav>
              </div>

              <!-- Post Property FREE CTA Card -->
              <div class="drawer-post-card">
                <div class="post-card-texts">
                  <div class="post-card-tag">DIRECT OWNER PLATFORM</div>
                  <div class="post-card-title">List Property with Verified Title</div>
                </div>
                <button type="button" class="btn-drawer-post" (click)="onPostPropertyClick(); closeMobileMenu()">
                  <span class="material-symbols-outlined">add_home</span>
                  <span>Post Property</span>
                  <span class="badge-free">FREE</span>
                </button>
              </div>

              <!-- Sign Out (if logged in) -->
              @if (authService.isLoggedIn()) {
                <div class="drawer-signout-row">
                  <button type="button" class="btn-drawer-signout" (click)="onSignOut(); closeMobileMenu()">
                    <span class="material-symbols-outlined">logout</span>
                    <span>Sign Out</span>
                  </button>
                </div>
              }
            </div>
          </div>
        </div>
      }
  `,
  styles: [`
    :host {
      display: block;
      position: sticky;
      top: 0;
      z-index: 1000;
      width: 100%;
    }
    :host.drawer-open {
      z-index: 999999 !important;
    }
    .main-header {
      position: relative;
      z-index: 1000;
      width: 100%;
      background: #ffffff;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--hairline-border);
      box-shadow: none;
      transition: border-color 0.25s ease, box-shadow 0.25s ease;
    }
    .main-header.is-scrolled {
      background: #ffffff;
      border-bottom-color: #cbd5e1;
      box-shadow: 0 4px 14px -2px rgba(15, 23, 42, 0.06);
    }
    .header-inner {
      height: 62px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }
    @media (min-width: 768px) {
      .header-inner {
        height: 68px;
        gap: 1.5rem;
      }
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
      letter-spacing: 0.12em;
      font-size: 13px;
      font-weight: 900;
      line-height: 1.1;
      display: inline-flex;
      align-items: center;
    }
    .brand-plot-bracket {
      display: inline-block;
      margin-left: 3px;
      padding: 0 4px;
      color: var(--brand-green, #5e8f72);
      background: rgba(94, 143, 114, 0.12);
      border: 1px dashed rgba(94, 143, 114, 0.4);
      border-radius: 3px;
      font-weight: 900;
      letter-spacing: 0.12em;
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
      z-index: 1200;
    }
    .city-selected-name {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-slate-800);
      white-space: nowrap;
      user-select: none;
    }
    .city-selector-box {
      display: flex;
      align-items: center;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 9999px;
      padding: 0.35rem 0.75rem;
      gap: 5px;
      position: relative;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      cursor: pointer;
    }
    .city-selector-box:hover {
      background: #f1f5f9;
      border-color: #cbd5e1;
    }
    .header-city-dropdown.is-open .city-selector-box {
      background: #ffffff;
      border-color: var(--brand-red);
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
      font-weight: 600;
      border-bottom-color: var(--brand-red);
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-shrink: 0;
    }
    @media (min-width: 640px) {
      .header-actions {
        gap: 0.85rem;
      }
    }
    @media (max-width: 640px) {
      .header-inner {
        height: 58px;
        gap: 0.5rem;
      }
      .brand-logo {
        height: 30px;
      }
      .brand-name {
        font-size: 11.5px;
        letter-spacing: 0.15em;
      }
      .header-actions {
        gap: 0.45rem;
      }
      .minimal-points-pill {
        padding: 0.3rem 0.55rem;
      }
      .points-lbl {
        display: none;
      }
      .signin-btn {
        height: 36px;
        padding: 0 0.65rem;
        font-size: 12px;
      }
    }
    @media (max-width: 440px) {
      .brand-tagline {
        display: none;
      }
      .signin-btn span:not(.material-symbols-outlined) {
        display: none;
      }
      .signin-btn {
        padding: 0 0.5rem;
      }
    }

    /* Minimalistic Points Pill */
    .minimal-points-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 0.35rem 0.75rem;
      border-radius: 9999px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      color: #0f172a;
      text-decoration: none;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .minimal-points-pill:hover {
      background: #f1f5f9;
      border-color: #cbd5e1;
      transform: translateY(-1px);
    }
    .points-glyph {
      font-size: 16px;
      color: var(--brand-red);
    }
    .points-val {
      font-size: 12.5px;
      font-weight: 600;
      color: #0f172a;
    }
    .points-lbl {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
    }

    /* Shortlist Button */
    .shortlist-btn {
      display: none;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-slate-700);
      padding: 0.4rem 0.65rem;
      border-radius: 9999px;
      text-decoration: none;
      border: 1px solid transparent;
      transition: all 0.15s ease;
    }
    @media (min-width: 640px) {
      .shortlist-btn {
        display: inline-flex;
      }
    }
    .shortlist-btn:hover {
      background: #f8fafc;
      border-color: #e2e8f0;
      color: var(--text-slate-950);
    }
    .shortlist-count {
      padding: 1px 6px;
      background: #e2e8f0;
      color: #0f172a;
      font-size: 10px;
      font-weight: 600;
      border-radius: 9999px;
    }

    /* Post Property CTA Button */
    .post-property-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.45rem;
      height: 38px;
      padding: 0 0.875rem;
      border-radius: 6px;
      color: #ffffff;
      font-weight: 700;
      font-size: 11.5px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      background: var(--brand-green, #5e8f72);
      border: none;
      outline: none;
      cursor: pointer;
    }
    .post-property-btn .material-symbols-outlined {
      font-size: 18px;
      line-height: 1;
    }
    .post-property-btn:hover {
      background: var(--brand-green, #5e8f72);
      transform: translateY(-1px);
    }
    .post-property-btn:active {
      transform: translateY(0);
    }
    .badge-free {
      background: #ffffff;
      color: var(--brand-green, #5e8f72);
      font-size: 10px;
      font-weight: 700;
      line-height: 1;
      padding: 2.5px 7px;
      border-radius: 9999px;
      letter-spacing: 0.04em;
      display: inline-flex;
      align-items: center;
      transition: transform 0.15s ease;
    }
    .post-property-btn:hover .badge-free {
      transform: scale(1.05);
    }
    .signin-btn {
      height: 38px;
      padding: 0 1.25rem;
      border-radius: 9999px;
      border: 1.5px solid var(--brand-red);
      background: #ffffff;
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 13px;
      font-weight: 600;
      color: var(--brand-red);
      cursor: pointer;
      transition: all 0.15s;
    }
    .signin-btn:hover {
      background: #fef2f2;
      border-color: var(--brand-red-hover);
      color: var(--brand-red-hover);
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
      background: #eeeeee;
      color: #0c0c0cff;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .avatar-gender-icon {
      font-size: 20px;
      line-height: 1;
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
      font-size: 13px;
      font-weight: 600;
      color: var(--text-slate-900);
      max-width: 100px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
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
      z-index: 1200;
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
      font-weight: 600;
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
      font-weight: 600;
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
      font-weight: normal;
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

    .desktop-only-btn {
      display: none !important;
    }
    @media (min-width: 768px) {
      .desktop-only-btn {
        display: inline-flex !important;
      }
    }
    .desktop-only-user, .desktop-only-signin {
      display: none !important;
    }
    @media (min-width: 640px) {
      .desktop-only-user, .desktop-only-signin {
        display: inline-flex !important;
      }
    }
    .mobile-menu-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 10px;
      border: 1.5px solid #cbd5e1;
      background: #f8fafc;
      color: var(--text-slate-800);
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .mobile-menu-btn:hover, .mobile-menu-btn.is-active {
      background: #fef2f2;
      border-color: var(--brand-red);
      color: var(--brand-red);
    }
    @media (min-width: 1024px) {
      .mobile-menu-btn {
        display: none !important;
      }
    }

    /* Mobile Drawer */
    .mobile-drawer-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100vw;
      height: 100vh;
      height: 100dvh;
      background: rgba(2, 6, 23, 0.65);
      z-index: 99999;
      display: flex;
      justify-content: flex-end;
      animation: fadeInDrawer 0.2s ease-out;
      touch-action: pan-y;
    }
    .mobile-drawer-panel {
      position: relative;
      width: 86vw;
      max-width: 340px;
      height: 100vh;
      height: 100dvh;
      background: #ffffff;
      box-shadow: none !important;
      border-left: 1px solid #cbd5e1;
      display: flex;
      flex-direction: column;
      animation: slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 100000;
      overflow: hidden;
      border-radius: 9px 0 0 9px;
      font-family: var(--font-sans);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
    }
    @keyframes fadeInDrawer {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideInRight {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }
    .drawer-header {
      padding: 1rem 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;
      flex-shrink: 0;
    }
    .drawer-brand {
      display: flex;
      align-items: center;
      gap: 0.625rem;
    }
    .drawer-logo {
      height: 28px;
      width: auto;
    }
    .drawer-brand-name {
      font-family: var(--font-sans);
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.15em;
      color: var(--text-slate-950);
      -webkit-font-smoothing: antialiased;
    }
    .drawer-close-btn {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: var(--text-slate-600);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s;
    }
    .drawer-close-btn:hover {
      background: #fee2e2;
      border-color: #fca5a5;
      color: var(--brand-red);
    }
    .drawer-scroll-body {
      padding: 1rem 1.25rem 2rem;
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .drawer-user-card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.875rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
    }
    .drawer-user-avatar {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: #eeeeee;
      color: #303030ff;
      font-weight: 600;
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .drawer-user-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .drawer-user-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-slate-950);
    }
    .drawer-user-role {
      font-size: 11px;
      color: var(--text-slate-500);
    }
    .drawer-user-pts {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 10px;
      font-weight: 600;
      color: #92400e;
      background: #fef3c7;
      padding: 1px 6px;
      border-radius: 4px;
      margin-top: 2px;
      width: fit-content;
      cursor: pointer;
    }
    .drawer-btn-signin {
      font-family: var(--font-sans);
      width: 100%;
      height: 42px;
      border-radius: 9999px;
      background: #ffffff;
      color: var(--brand-red);
      font-size: 13px;
      font-weight: 600;
      border: 1.5px solid var(--brand-red);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      cursor: pointer;
      transition: all 0.15s ease;
      -webkit-font-smoothing: antialiased;
    }
    .drawer-btn-signin:hover {
      background: #fef2f2;
      border-color: var(--brand-red-hover);
      color: var(--brand-red-hover);
    }
    .drawer-section {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      font-family: var(--font-sans);
    }
    .drawer-section-title {
      font-family: var(--font-sans);
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-slate-400);
      -webkit-font-smoothing: antialiased;
    }
    .drawer-cities-list {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      font-family: var(--font-sans);
    }
    .drawer-city-chip {
      font-family: var(--font-sans);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 0.875rem;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      cursor: pointer;
      text-align: left;
      transition: all 0.15s;
    }
    .drawer-city-chip.active {
      border-color: var(--brand-red);
      background: #fffafa;
    }
    .drawer-city-chip .city-icon {
      font-size: 16px;
      color: var(--brand-red);
    }
    .city-texts {
      display: flex;
      flex-direction: column;
      flex: 1;
      font-family: var(--font-sans);
    }
    .city-title {
      font-family: var(--font-sans);
      font-size: 13px;
      font-weight: 600;
      color: var(--text-slate-900);
      -webkit-font-smoothing: antialiased;
    }
    .city-sub {
      font-family: var(--font-sans);
      font-size: 11px;
      color: var(--text-slate-500);
      -webkit-font-smoothing: antialiased;
    }
    .check-icon {
      font-size: 16px;
      color: var(--brand-red);
      margin-left: auto;
    }
    .drawer-nav {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      font-family: var(--font-sans);
    }
    .drawer-nav-item {
      font-family: var(--font-sans);
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.625rem 0.75rem;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-slate-800);
      letter-spacing: 0.01em;
      text-decoration: none;
      cursor: pointer;
      transition: background 0.15s;
      -webkit-font-smoothing: antialiased;
      font-weight: normal;
    }
    .drawer-nav-item:hover {
      background: #f1f5f9;
      color: var(--text-slate-950);
    }
    .drawer-nav-item span.material-symbols-outlined {
      font-size: 18px;
      color: var(--text-slate-500);
    }
    .pts-badge {
      margin-left: auto;
      font-size: 10px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 9999px;
      background: #f1f5f9;
      color: var(--text-slate-700);
      font-family: ui-monospace, monospace;
    }
    .drawer-post-card {
      padding: 0.875rem;
      border-radius: 10px;
      background: var(--brand-teal);
      color: #ffffff;
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
    }
    .post-card-tag {
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 0.1em;
      color: #34d399;
      text-transform: uppercase;
    }
    .post-card-title {
      font-size: 13px;
      font-weight: 600;
      color: #ffffff;
    }
    .post-card-sub {
      font-size: 11px;
      color: #94a3b8;
      line-height: 1.35;
    }
    .btn-drawer-post {
      height: 36px;
      border-radius: 6px;
      background: var(--brand-red);
      color: #ffffff;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      cursor: pointer;
    }
    .drawer-help-box {
      padding: 0.75rem;
      border-radius: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }
    .drawer-help-title {
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 0.08em;
      color: var(--text-slate-400);
      margin-bottom: 2px;
    }
    .drawer-help-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-slate-700);
      text-decoration: none;
    }
    .drawer-signout-row {
      padding-top: 0.5rem;
      border-top: 1px solid #e2e8f0;
    }
    .btn-drawer-signout {
      width: 100%;
      height: 36px;
      border-radius: 8px;
      border: 1px solid #fee2e2;
      background: #fff5f5;
      color: var(--brand-sold);
      font-size: 12px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      cursor: pointer;
    }
    @media (max-width: 1023px) {
      .main-header {
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
        box-shadow: none !important;
      }
      .main-header.is-scrolled {
        box-shadow: none !important;
      }
      .mobile-menu-btn {
        box-shadow: none !important;
      }
      .city-selector-box {
        box-shadow: none !important;
      }
    }
    @media (max-width: 480px) {
      .brand-tagline { display: none; }
      .brand-name { font-size: 12px; }
      .brand-logo { height: 30px; }
      .wallet-pill { padding: 0.25rem 0.5rem; gap: 0.35rem; }
      .pts-number { font-size: 11px; }
      .topup-btn { padding: 1px 4px; font-size: 9px; }
    }
    @media (max-width: 640px) {
      .hidden-sm { display: none; }
    }
  `]
})
export class HeaderComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  readonly walletService = inject(WalletService);
  readonly propertyService = inject(PropertyService);
  readonly notificationService = inject(NotificationService);

  readonly isCityDropdownOpen = signal<boolean>(false);
  readonly isMobileMenuOpen = signal<boolean>(false);
  readonly isScrolled = signal<boolean>(false);

  ngOnInit(): void {
    this.checkScroll();
    this.router.events.subscribe(() => {
      if (this.isMobileMenuOpen()) {
        this.closeMobileMenu();
      }
    });
  }

  ngOnDestroy(): void {
    this.setBodyScroll(true);
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.checkScroll();
  }

  private checkScroll(): void {
    if (typeof window !== 'undefined') {
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      this.isScrolled.set(scrollY > 15);
    }
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update(v => {
      const next = !v;
      this.setBodyScroll(!next);
      return next;
    });
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
    this.setBodyScroll(true);
  }

  private setBodyScroll(enableScroll: boolean): void {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = enableScroll ? '' : 'hidden';
      document.documentElement.style.overflow = enableScroll ? '' : 'hidden';
    }
  }

  readonly cities = [
    { value: 'chennai', label: 'Chennai (HQ)', sub: 'CMDA Jurisdiction' }
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

  getUserGenderIcon(): string {
    const user = this.authService.currentUser();
    const gender = (user as any)?.gender;
    if (gender === 'female') return 'woman';
    if (gender === 'male') return 'man';
    const name = (user?.name || '').toLowerCase();
    // Feminine names or keywords
    if (/anita|priya|lakshmi|deepa|kavitha|pooja|swetha|sneha|divya|sharmila|shreya|radha|geetha|female|she|her|woman/i.test(name)) {
      return 'woman';
    }
    if (/arun|kumar|rahul|raj|vijay|suresh|ramesh|karthik|ajay|male|he|his|man/i.test(name)) {
      return 'man';
    }
    return 'person';
  }

  getUserInitials(): string {
    const name = this.authService.currentUser()?.name || 'User';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  getFirstName(): string {
    const name = this.authService.currentUser()?.name || 'User';
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
    this.closeMobileMenu();
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
