import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PropertyService } from '../../../../core/services/property.service';
import { WalletService } from '../../../../core/services/wallet.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { PremiumMediaItem } from '../../../../core/models/property.model';
import { SecureVideoPlayerComponent } from '../../../../shared/components/secure-video-player/secure-video-player.component';

@Component({
  selector: 'app-property-media-modal',
  standalone: true,
  imports: [CommonModule, SecureVideoPlayerComponent],
  template: `
    @if (propertyService.activeModalProperty(); as prop) {
      <div class="modal-backdrop" (click)="onBackdropClick($event)">
        <div class="media-dialog">
          <!-- Modal Header -->
          <div class="dialog-header">
            <div class="header-left">
              <div class="badges-row">
                <span class="badge-asset-type">
                  <span class="material-symbols-outlined">apartment</span>
                  {{ prop.propertyType }}
                </span>
                <span class="badge-rera">
                  <span class="material-symbols-outlined">verified</span>
                  {{ prop.badges.rera }}
                </span>
                @if (prop.isMediaUnlocked) {
                  <span class="badge-unlocked">
                    <span class="material-symbols-outlined">check_circle</span>
                    Premium 4K Unlocked
                  </span>
                }
              </div>
              <h3 class="dialog-title">{{ prop.title }}</h3>
              <p class="dialog-loc">
                <span class="material-symbols-outlined text-red">location_on</span>
                {{ prop.locality }}, {{ prop.city }} • <strong class="text-slate-900">{{ prop.price }}</strong> ({{ prop.pricePerSqFt }})
              </p>
            </div>

            <button class="close-btn" (click)="propertyService.closeMediaModal()" aria-label="Close dialog">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <!-- Media Tabs -->
          <div class="media-tabs-bar">
            <button 
              type="button"
              class="media-tab-btn" 
              [class.active]="propertyService.activeMediaTab() === 'free'"
              (click)="propertyService.setMediaTab('free')">
              <span class="material-symbols-outlined">photo_library</span>
              <span>Free Photos ({{ prop.freePhotos?.length || 0 }})</span>
            </button>

            <button 
              type="button"
              class="media-tab-btn" 
              [class.active]="propertyService.activeMediaTab() === 'premium'"
              (click)="propertyService.setMediaTab('premium')">
              <span class="material-symbols-outlined">{{ prop.isMediaUnlocked ? 'smart_display' : 'lock' }}</span>
              <span>Premium 4K Videos &amp; Drone ({{ prop.premiumMedia?.length || 0 }})</span>
              @if (!prop.isMediaUnlocked) {
                <span class="tab-cost-badge">{{ prop.mediaPoints || 50 }} Pts</span>
              }
            </button>
          </div>

          <!-- Tab Content: Free Photos -->
          @if (propertyService.activeMediaTab() === 'free') {
            <div class="tab-content free-photos-pane">
              <!-- Active Featured Photo -->
              <div class="featured-photo-stage">
                <img 
                  [src]="activePhotoUrl() || prop.freePhotos?.[0] || prop.imageUrl || 'hero-bg.jpg'" 
                  [alt]="prop.title" 
                  class="stage-img"
                  loading="lazy"
                  decoding="async">
                <div class="photo-overlay-badge">
                  <span class="material-symbols-outlined">visibility</span>
                  <span>100% Free Architectural View</span>
                </div>
              </div>

              <!-- Thumbnails Grid -->
              @if (prop.freePhotos?.length) {
                <div class="thumbnails-track">
                  @for (photo of prop.freePhotos; track $index) {
                    <button 
                      type="button" 
                      class="thumb-btn" 
                      [class.active]="(activePhotoUrl() || prop.freePhotos[0]) === photo"
                      (click)="setActivePhoto(photo)">
                      <img [src]="photo" [alt]="'Photo ' + ($index + 1)" class="thumb-img" loading="lazy" decoding="async">
                    </button>
                  }
                </div>
              }
            </div>
          }

          <!-- Tab Content: Premium 4K Videos & HD Media -->
          @if (propertyService.activeMediaTab() === 'premium') {
            <div class="tab-content premium-media-pane">
              @if (prop.isMediaUnlocked) {
                <!-- UNLOCKED VIEW: Full Video Player & Media Playlist -->
                @if (prop.premiumMedia?.length) {
                  <div class="unlocked-video-stage">
                    @if (selectedMediaItem()?.type === 'video') {
                      <div class="video-player-box">
                        <app-secure-video-player
                          [videoUrl]="selectedMediaItem()?.url || prop.premiumMedia[0].url"
                          [posterUrl]="selectedMediaItem()?.thumbnailUrl || prop.imageUrl"
                          [title]="selectedMediaItem()?.title || prop.premiumMedia[0].title"
                          [propertyRef]="'REF #' + prop.id"
                          [cloudflareStreamId]="selectedMediaItem()?.cloudflareStreamId || ''">
                        </app-secure-video-player>
                      </div>
                    } @else {
                      <div class="hd-photo-box">
                        <img 
                          [src]="selectedMediaItem()?.url || prop.premiumMedia[0].url" 
                          [alt]="selectedMediaItem()?.title" 
                          class="hd-stage-photo"
                          loading="lazy"
                          decoding="async">
                      </div>
                    }

                    <div class="unlocked-media-info">
                      <div>
                        <h4 class="media-title">{{ selectedMediaItem()?.title || prop.premiumMedia[0].title }}</h4>
                        <p class="media-tag">{{ selectedMediaItem()?.tag || prop.premiumMedia[0].tag }}</p>
                      </div>
                      <span class="badge-lifetime">
                        <span class="material-symbols-outlined">all_inclusive</span>
                        Permanently Unlocked for Your Account
                      </span>
                    </div>

                    <!-- Playlist of Videos & Media -->
                    <div class="media-playlist">
                      <span class="playlist-header">Included Premium Dossier Media ({{ prop.premiumMedia.length }})</span>
                      <div class="playlist-grid">
                        @for (item of prop.premiumMedia; track item.id) {
                          <button 
                            type="button"
                            class="playlist-card"
                            [class.active]="(selectedMediaItem()?.id || prop.premiumMedia[0].id) === item.id"
                            (click)="selectMediaItem(item)">
                            <div class="playlist-thumb-box">
                              <img [src]="item.thumbnailUrl" [alt]="item.title" class="playlist-thumb-img" loading="lazy" decoding="async">
                              <span class="material-symbols-outlined playlist-type-icon">
                                {{ item.type === 'video' ? 'play_arrow' : 'photo' }}
                              </span>
                              @if (item.duration) {
                                <span class="duration-badge">{{ item.duration }}</span>
                              }
                            </div>
                            <div class="playlist-details">
                              <span class="item-name">{{ item.title }}</span>
                              <span class="item-tag">{{ item.tag }}</span>
                            </div>
                          </button>
                        }
                      </div>
                    </div>
                  </div>
                } @else {
                  <div class="empty-media-notice">
                    <span class="material-symbols-outlined empty-icon">videocam</span>
                    <h4>4K Walkthrough Processing</h4>
                    <p>Exclusive drone surveys and interior video dossiers for this property are currently being authenticated by our survey team.</p>
                  </div>
                }
              } @else {
                <!-- LOCKED VIEW: Frosted Blur Preview + Point Unlock Call To Action -->
                <div class="locked-video-preview">
                  <div class="blur-underlay" [style.background-image]="'url(' + (prop.premiumMedia?.[0]?.thumbnailUrl || prop.imageUrl || 'hero-bg.jpg') + ')'"></div>
                  <div class="lock-card-overlay">
                    <div class="lock-icon-circle">
                      <span class="material-symbols-outlined lock-glyph">lock</span>
                    </div>

                    <h4 class="lock-title">Unlock 4K Architectural Walkthrough &amp; Drone Footage</h4>
                    <p class="lock-desc">
                      Experience immersive 4K cinematic interior tours, 360° drone cadastral plot boundaries, and ultra-high resolution blueprints.
                    </p>

                    <!-- Points Required Notice -->
                    <div class="cost-summary-box">
                      <div class="cost-pill">
                        <span class="material-symbols-outlined text-amber">payments</span>
                        <span>Unlock Cost: <strong>{{ prop.mediaPoints }} Points</strong></span>
                      </div>
                      <div class="balance-pill">
                        <span class="material-symbols-outlined text-emerald">account_balance_wallet</span>
                        <span>Your Wallet: <strong>{{ walletService.balance() }} Pts</strong></span>
                      </div>
                    </div>

                    <div class="unlock-actions-row">
                      <button 
                        type="button" 
                        class="btn-primary-unlock" 
                        (click)="propertyService.unlockMedia(prop.id)">
                        <span class="material-symbols-outlined">smart_display</span>
                        <span>Unlock Full 4K Walkthrough ({{ prop.mediaPoints }} Pts)</span>
                      </button>

                      <button 
                        type="button" 
                        class="btn-recharge-trigger" 
                        (click)="onRechargeClick()">
                        <span class="material-symbols-outlined">account_balance_wallet</span>
                        <span>Recharge in Dedicated Wallet</span>
                      </button>
                    </div>

                    <!-- Locked Video Badges -->
                    <div class="locked-features-row">
                      <span class="feature-item">
                        <span class="material-symbols-outlined">videocam</span>
                        4K Ultra-HD Video
                      </span>
                      <span class="feature-item">
                        <span class="material-symbols-outlined">flight</span>
                        Aerial Drone Survey
                      </span>
                      <span class="feature-item">
                        <span class="material-symbols-outlined">all_inclusive</span>
                        Lifetime Access
                      </span>
                    </div>
                  </div>
                </div>
              }
            </div>
          }

          <!-- Footer Actions & Concierge Support -->
          <div class="dialog-footer">
            <div class="footer-specs">
              <span class="spec-pill">{{ prop.sqft }}</span>
              <span class="spec-pill">{{ prop.bhkBadge }}</span>
              <span class="spec-pill">{{ prop.facingOrView }}</span>
            </div>

            <div class="footer-actions">
              <a 
                [href]="prop.whatsappUrl || 'https://wa.me/919444100000'" 
                target="_blank" 
                rel="noopener"
                class="btn-concierge-wa">
                <span class="material-symbols-outlined">chat</span>
                <span>Inquire via Concierge</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .media-dialog {
      background: #ffffff;
      border-radius: 1.25rem;
      border: 1px solid var(--surface-slate-200);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      width: 100%;
      max-width: 820px;
      max-height: 92vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .dialog-header {
      padding: 1.25rem 1.5rem;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      border-bottom: 1px solid var(--surface-slate-100);
      background: #f8fafc;
    }
    .header-left {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }
    .badges-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .badge-asset-type {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.2rem 0.6rem;
      background: #0f172a;
      color: #ffffff;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
    }
    .badge-asset-type span { font-size: 13px; }
    .badge-rera {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.2rem 0.6rem;
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
    }
    .badge-rera span { font-size: 14px; }
    .badge-unlocked {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.2rem 0.6rem;
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
    }
    .badge-unlocked span { font-size: 14px; }
    .dialog-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text-slate-900);
      letter-spacing: -0.02em;
      margin: 0;
    }
    .dialog-loc {
      font-size: 0.875rem;
      color: var(--text-slate-600);
      display: flex;
      align-items: center;
      gap: 0.25rem;
      margin: 0;
    }
    .dialog-loc span.material-symbols-outlined { font-size: 16px; }
    .text-red { color: var(--brand-red); }
    .close-btn {
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 9999px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      color: var(--text-slate-500);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s;
    }
    .close-btn:hover {
      background: #f1f5f9;
      color: var(--text-slate-900);
    }
    /* Tabs Bar */
    .media-tabs-bar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1.5rem;
      background: #ffffff;
      border-bottom: 1px solid var(--hairline-border);
    }
    .media-tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.6rem 1rem;
      border-radius: 9999px;
      border: 1px solid transparent;
      background: transparent;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-slate-600);
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .media-tab-btn:hover {
      background: #f1f5f9;
      color: var(--text-slate-950);
    }
    .media-tab-btn.active {
      background: var(--brand-red-subtle);
      border-color: var(--brand-red-border);
      color: var(--brand-red);
      font-weight: 600;
    }
    .media-tab-btn span.material-symbols-outlined { font-size: 18px; }
    .tab-cost-badge {
      background: var(--brand-red);
      color: #ffffff;
      font-size: 10px;
      font-weight: 600;
      padding: 0.1rem 0.45rem;
      border-radius: 9999px;
      letter-spacing: 0.04em;
    }
    /* Tab Content Area */
    .tab-content {
      padding: 1.25rem 1.5rem;
      overflow-y: auto;
      flex: 1;
    }
    /* Free Photos Pane */
    .free-photos-pane {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .featured-photo-stage {
      width: 100%;
      height: 380px;
      border-radius: 12px;
      overflow: hidden;
      position: relative;
      background: #0f172a;
    }
    .stage-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }
    .photo-overlay-badge {
      position: absolute;
      bottom: 1rem;
      left: 1rem;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(8px);
      color: #ffffff;
      border-radius: 9999px;
      padding: 0.35rem 0.75rem;
      font-size: 12px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
    }
    .photo-overlay-badge span { font-size: 15px; }
    .thumbnails-track {
      display: flex;
      gap: 0.75rem;
      overflow-x: auto;
      padding-bottom: 0.25rem;
    }
    .thumb-btn {
      width: 100px;
      height: 70px;
      border-radius: 8px;
      overflow: hidden;
      border: 2px solid transparent;
      padding: 0;
      background: #0f172a;
      cursor: pointer;
      flex-shrink: 0;
      transition: all 0.2s;
    }
    .thumb-btn.active {
      border-color: var(--brand-red);
      box-shadow: 0 0 0 2px rgba(199, 52, 52, 0.3);
    }
    .thumb-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    /* Premium Media Pane */
    .unlocked-video-stage {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .video-player-box {
      width: 100%;
      height: 380px;
      border-radius: 12px;
      overflow: hidden;
      background: #000000;
    }
    .html5-video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .hd-photo-box {
      width: 100%;
      height: 380px;
      border-radius: 12px;
      overflow: hidden;
      background: #0f172a;
    }
    .hd-stage-photo {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .unlocked-media-info {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--hairline-border);
    }
    .media-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-slate-900);
      margin: 0;
    }
    .media-tag {
      font-size: 12px;
      color: var(--text-slate-500);
      margin: 0.15rem 0 0 0;
    }
    .badge-lifetime {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.3rem 0.65rem;
      border-radius: 9999px;
      background: #ecfdf5;
      color: #047857;
      font-size: 11px;
      font-weight: 600;
      border: 1px solid #a7f3d0;
    }
    .badge-lifetime span { font-size: 14px; }
    .media-playlist {
      margin-top: 0.5rem;
    }
    .playlist-header {
      display: block;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-slate-500);
      margin-bottom: 0.5rem;
    }
    .playlist-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 0.75rem;
    }
    .playlist-card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem;
      border-radius: 8px;
      border: 1px solid var(--hairline-border);
      background: #f8fafc;
      cursor: pointer;
      text-align: left;
      transition: all 0.15s;
    }
    .playlist-card:hover {
      background: #f1f5f9;
      border-color: #cbd5e1;
    }
    .playlist-card.active {
      background: var(--brand-red-subtle);
      border-color: var(--brand-red-border);
    }
    .playlist-thumb-box {
      width: 64px;
      height: 48px;
      border-radius: 6px;
      position: relative;
      overflow: hidden;
      background: #0f172a;
      flex-shrink: 0;
    }
    .playlist-thumb-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0.85;
    }
    .playlist-type-icon {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #ffffff;
      font-size: 20px;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6));
    }
    .duration-badge {
      position: absolute;
      bottom: 2px;
      right: 2px;
      background: rgba(0, 0, 0, 0.75);
      color: #ffffff;
      font-size: 9px;
      padding: 1px 3px;
      border-radius: 3px;
      font-weight: 600;
    }
    .playlist-details {
      min-width: 0;
      display: flex;
      flex-direction: column;
    }
    .item-name {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-slate-900);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .item-tag {
      font-size: 10px;
      color: var(--text-slate-500);
    }

    /* Locked Preview Experience */
    .locked-video-preview {
      width: 100%;
      height: 400px;
      border-radius: 16px;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .blur-underlay {
      position: absolute;
      inset: 0;
      background-size: cover;
      background-position: center;
      filter: blur(12px) brightness(0.4);
      transform: scale(1.08);
    }
    .lock-card-overlay {
      position: relative;
      z-index: 10;
      max-width: 480px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      color: #ffffff;
    }
    .lock-icon-circle {
      width: 3.5rem;
      height: 3.5rem;
      border-radius: 9999px;
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;
      color: #fca5a5;
    }
    .lock-glyph { font-size: 28px; }
    .lock-title {
      font-size: 1.35rem;
      font-weight: 600;
      color: #ffffff;
      letter-spacing: -0.02em;
      margin: 0 0 0.5rem 0;
    }
    .lock-desc {
      font-size: 13px;
      color: #e2e8f0;
      line-height: 1.5;
      margin: 0 0 1.25rem 0;
    }
    .cost-summary-box {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.25rem;
    }
    .cost-pill, .balance-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.35rem 0.75rem;
      border-radius: 9999px;
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.15);
      font-size: 12px;
      color: #f8fafc;
    }
    .text-amber { color: #f59e0b; }
    .text-emerald { color: #10b981; }
    .unlock-actions-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      width: 100%;
      flex-direction: column;
    }
    @media (min-width: 480px) {
      .unlock-actions-row { flex-direction: row; }
    }
    .btn-primary-unlock {
      flex: 1;
      width: 100%;
      padding: 0.85rem 1.25rem;
      border-radius: 10px;
      background: var(--brand-red);
      color: #ffffff;
      font-weight: 600;
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(199, 52, 52, 0.4);
      transition: all 0.15s;
    }
    .btn-primary-unlock:hover {
      background: var(--brand-red-hover);
      transform: translateY(-1px);
    }
    .btn-recharge-trigger {
      padding: 0.85rem 1rem;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: #ffffff;
      font-weight: 600;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      cursor: pointer;
      backdrop-filter: blur(6px);
      transition: all 0.15s;
    }
    .btn-recharge-trigger:hover {
      background: rgba(255, 255, 255, 0.25);
    }
    .locked-features-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-top: 1.25rem;
      font-size: 11px;
      color: #cbd5e1;
    }
    .feature-item {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }
    .feature-item span { font-size: 14px; color: #fca5a5; }

    /* Footer */
    .dialog-footer {
      padding: 1rem 1.5rem;
      background: #f8fafc;
      border-top: 1px solid var(--surface-slate-100);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .footer-specs {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .spec-pill {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-slate-700);
      background: #ffffff;
      border: 1px solid #e2e8f0;
      padding: 0.25rem 0.6rem;
      border-radius: 6px;
    }
    .btn-concierge-wa {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.65rem 1.15rem;
      background: #25d366;
      color: #ffffff;
      font-weight: 600;
      font-size: 13px;
      border-radius: 8px;
      text-decoration: none;
      transition: all 0.15s;
      box-shadow: 0 2px 6px rgba(37, 211, 102, 0.25);
    }
    .btn-concierge-wa:hover {
      background: #1eb855;
      transform: translateY(-1px);
    }

    @media (max-width: 640px) {
      .media-dialog {
        max-height: 94vh;
        border-radius: 1rem;
      }
      .dialog-header {
        padding: 1rem;
      }
      .dialog-title {
        font-size: 1.05rem;
      }
      .media-tabs-bar {
        padding: 0.5rem 0.75rem;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }
      .media-tab-btn {
        padding: 0.5rem 0.75rem;
        font-size: 12px;
        white-space: nowrap;
      }
      .tab-content {
        padding: 0.875rem;
      }
      .featured-photo-stage {
        height: 220px;
      }
      .dialog-footer {
        padding: 0.875rem 1rem;
        flex-direction: column;
        align-items: stretch;
      }
      .btn-concierge-wa {
        width: 100%;
        justify-content: center;
      }
    }
  `]
})
export class PropertyMediaModalComponent {
  readonly propertyService = inject(PropertyService);
  readonly walletService = inject(WalletService);
  readonly notificationService = inject(NotificationService);

  readonly activePhotoUrl = signal<string | null>(null);
  readonly selectedMediaItem = signal<PremiumMediaItem | null>(null);

  setActivePhoto(url: string): void {
    this.activePhotoUrl.set(url);
  }

  selectMediaItem(item: PremiumMediaItem): void {
    this.selectedMediaItem.set(item);
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.propertyService.closeMediaModal();
    }
  }

  onRechargeClick(): void {
    this.propertyService.closeMediaModal();
    this.walletService.navigateToWallet();
  }
}
