import { Component, OnInit, AfterViewInit, OnDestroy, inject, signal, computed, effect, HostListener, NgZone } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { formatPriceIndian } from '../../../../core/utils/price-helper';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  Property,
  PremiumMediaItem
} from '../../../../core/models/property.model';
import { PropertyService } from '../../../../core/services/property.service';
import { WalletService } from '../../../../core/services/wallet.service';
import { SubscriptionService } from '../../../../core/services/subscription.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UserBehaviorService } from '../../../../core/services/user-behavior.service';
import { CompareService } from '../../../../core/services/compare.service';
import { WorkspaceService } from '../../../../core/services/workspace.service';
import { HeaderComponent } from '../../../home/components/header/header.component';
import { FooterComponent } from '../../../home/components/footer/footer.component';
import { TopConciergeBarComponent } from '../../../home/components/top-concierge-bar/top-concierge-bar.component';
import { TopupDialogComponent } from '../../../home/components/topup-dialog/topup-dialog.component';
import { ToastComponent } from '../../../home/components/toast/toast.component';
import { PropertyMediaModalComponent } from '../../../home/components/property-media-modal/property-media-modal.component';
import { SecureVideoPlayerComponent } from '../../../../shared/components/secure-video-player/secure-video-player.component';

export type MediaStageTab = 'photos' | 'walkthrough' | 'drone';
export type DetailContextTab = 'infrastructure' | 'legal_specs' | 'location_transit';

@Component({
  selector: 'app-property-details-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    TopConciergeBarComponent,
    HeaderComponent,
    FooterComponent,
    TopupDialogComponent,
    ToastComponent,
    PropertyMediaModalComponent,
    SecureVideoPlayerComponent
  ],
  templateUrl: './property-details-page.component.html',
  styleUrls: ['./property-details-page.component.scss']
})
export class PropertyDetailsPageComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly showFloatingWa = signal<boolean>(false);
  readonly isScrolledPastHeader = signal<boolean>(false);
  private waObserver: IntersectionObserver | null = null;
  readonly formatPriceIndian = formatPriceIndian;
  private readonly ngZone = inject(NgZone);
  private readonly boundScrollHandler = (): void => {
    if (typeof window !== 'undefined') {
      const scrolled = window.scrollY > 180;
      if (this.isScrolledPastHeader() !== scrolled) {
        this.ngZone.run(() => this.isScrolledPastHeader.set(scrolled));
      }
    }
  };
  private readonly scrollListenerInit = (() => {
    if (typeof window !== 'undefined') {
      this.ngZone.runOutsideAngular(() => {
        window.addEventListener('scroll', this.boundScrollHandler, { passive: true });
      });
    }
  })();
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  readonly propertyService = inject(PropertyService);
  readonly walletService = inject(WalletService);
  readonly subscriptionService = inject(SubscriptionService);
  readonly notificationService = inject(NotificationService);
  readonly authService = inject(AuthService);
  readonly userBehaviorService = inject(UserBehaviorService);
  readonly compareService = inject(CompareService);
  readonly workspaceService = inject(WorkspaceService);

  readonly isEntitlementExhausted = signal<boolean>(false);

  readonly isViewRestricted = computed<boolean>(() => {
    return !!this.property()?.isViewRestricted || this.isEntitlementExhausted();
  });
  readonly projectViewsUsed = computed<number>(() => {
    return this.property()?.projectViewsUsed ?? this.subscriptionService.entitlements()?.projectViewsUsed ?? 2;
  });
  readonly projectViewLimit = computed<number>(() => {
    return this.property()?.projectViewLimit ?? this.subscriptionService.entitlements()?.projectViewLimit ?? 2;
  });

  readonly propertyId = signal<string>('');
  readonly fetchedProperty = signal<Property | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly property = computed<Property | null>(() => {
    let p = this.fetchedProperty();
    if (!p) {
      const id = this.propertyId();
      if (!id) return null;
      p = this.propertyService.getPropertyById(id) || null;
    }
    if (!p) return null;
    return {
      ...p,
      isShortlisted: this.propertyService.isShortlisted(p.id)
    };
  });

  readonly activeDetailTab = signal<DetailContextTab>('infrastructure');

  setDetailTab(tab: DetailContextTab): void {
    this.activeDetailTab.set(tab);
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      setTimeout(() => {
        const workspaceEl = document.getElementById('details-context-workspace');
        if (workspaceEl) {
          const headerEl = document.querySelector('app-header');
          const headerHeight = headerEl ? headerEl.getBoundingClientRect().height : 64;
          const offset = headerHeight + 8;
          const bodyRect = document.body.getBoundingClientRect().top;
          const elementRect = workspaceEl.getBoundingClientRect().top;
          const elementPosition = elementRect - bodyRect;
          const offsetPosition = Math.max(0, elementPosition - offset);
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      }, 15);
    }
  }

  cleanInfraText(val: string | null | undefined, fallback: string): string {
    if (!val) return fallback;
    const trimmed = String(val).trim();
    if (trimmed.toUpperCase() === 'NULL' || trimmed.toUpperCase() === 'UNDEFINED' || !isNaN(Number(trimmed))) {
      return fallback;
    }
    return trimmed;
  }


  // Media-First Top Stage State
  readonly activeMediaTab = signal<MediaStageTab>('photos');
  readonly currentPhotoIdx = signal<number>(0);
  readonly isFullscreenOpen = signal<boolean>(false);
  readonly isPhotoUpgradePromptOpen = signal<boolean>(false);

  readonly totalPhotoCount = computed<number>(() => {
    const p = this.property();
    if (!p) return 0;
    return Math.max(p.totalPhotoCount || 0, p.freePhotos?.length || 0, p.imageUrl ? 1 : 0);
  });

  readonly additionalPhotosCount = computed<number>(() => Math.max(0, this.totalPhotoCount() - 1));

  readonly lockedPhotoSlots = computed<number[]>(() => {
    const extra = this.additionalPhotosCount();
    return Array.from({ length: Math.min(extra, 6) }, (_, i) => i + 1);
  });

  readonly displayedPhotoUrl = computed<string>(() => {
    const p = this.property();
    if (!p) return '';
    if (this.isViewRestricted()) {
      return p.freePhotos?.[0] || p.imageUrl;
    }
    return p.freePhotos?.[this.currentPhotoIdx()] || p.imageUrl;
  });

  // 50-Second High-Intent Site Visit Prompt State
  private siteVisitPromptTimer: any = null;
  private hasPromptedSiteVisitForSession = false;
  readonly isSiteVisitPromptOpen = signal<boolean>(false);
  readonly promptVisitDate = signal<string>('');
  readonly promptVisitSlot = signal<string>('morning');
  readonly promptBuyerName = signal<string>('');
  readonly promptBuyerPhone = signal<string>('');
  readonly isSubmittingPromptVisit = signal<boolean>(false);
  readonly minVisitDate = computed<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  setQuickDate(preset: 'tomorrow' | 'weekend'): void {
    const now = new Date();
    if (preset === 'tomorrow') {
      const tomorrow = new Date(Date.now() + 86400000);
      this.promptVisitDate.set(tomorrow.toISOString().split('T')[0]);
    } else if (preset === 'weekend') {
      const day = now.getDay();
      const daysToSaturday = (6 - day + 7) % 7 || 7;
      const saturday = new Date(now.getTime() + daysToSaturday * 86400000);
      this.promptVisitDate.set(saturday.toISOString().split('T')[0]);
    }
  }

  isQuickDate(preset: 'tomorrow' | 'weekend'): boolean {
    const cur = this.promptVisitDate();
    if (!cur) return false;
    const now = new Date();
    if (preset === 'tomorrow') {
      const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      return cur === tomorrowStr;
    }
    if (preset === 'weekend') {
      const day = now.getDay();
      const daysToSaturday = (6 - day + 7) % 7 || 7;
      const satStr = new Date(now.getTime() + daysToSaturday * 86400000).toISOString().split('T')[0];
      const sunStr = new Date(now.getTime() + (daysToSaturday + 1) * 86400000).toISOString().split('T')[0];
      return cur === satStr || cur === sunStr;
    }
    return false;
  }

  // Similar Properties in same City/Corridor
  readonly similarProperties = computed<Property[]>(() => {
    const current = this.property();
    if (!current) return [];
    return this.propertyService.allProperties()
      .filter(p => p.id !== current.id && (p.cityKey === current.cityKey || p.propertyType === current.propertyType))
      .slice(0, 3);
  });

  // Guest Single View Limitation Signals
  readonly isBlockedForGuest = computed<boolean>(() => {
    const id = this.propertyId();
    if (!id) return false;
    return !this.authService.canViewProperty(id);
  });

  readonly isFirstGuestPreview = computed<boolean>(() => {
    const id = this.propertyId();
    if (!id || this.authService.isLoggedIn()) return false;
    const views = this.authService.guestViewedPropertyIds();
    return views.includes(id) && views.length === 1;
  });

  constructor() {
    // When user completes OTP login while on a restricted property, immediately reload to unlock
    effect(() => {
      const user = this.authService.currentUser();
      const currentId = this.propertyId();
      if (user && currentId && (this.isEntitlementExhausted() || !this.fetchedProperty() || this.fetchedProperty()?.isViewRestricted)) {
        this.loadProperty(currentId);
      }
    });
  }

  ngAfterViewInit(): void {
    this.setupWhatsAppObserver();
  }

  private setupWhatsAppObserver(): void {
    if (typeof window === 'undefined') return;

    if (this.waObserver) {
      this.waObserver.disconnect();
      this.waObserver = null;
    }

    if (typeof IntersectionObserver === 'undefined') {
      this.showFloatingWa.set(true);
      return;
    }

    const checkAndObserve = (attempts = 0) => {
      const target = document.querySelector('.hanu-realtor-card .btn-contact-wa') || document.querySelector('.btn-contact-wa');
      if (target) {
        this.waObserver = new IntersectionObserver((entries) => {
          for (const entry of entries) {
            this.showFloatingWa.set(!entry.isIntersecting);
          }
        }, {
          root: null,
          threshold: 0
        });
        this.waObserver.observe(target);
      } else if (attempts < 6) {
        setTimeout(() => checkAndObserve(attempts + 1), 300);
      }
    };

    checkAndObserve();
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.propertyId.set(id);
        this.currentPhotoIdx.set(0);
        this.isPhotoUpgradePromptOpen.set(false);
        this.hasPromptedSiteVisitForSession = false;
        this.isSiteVisitPromptOpen.set(false);
        this.clearSiteVisitPromptTimer();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => this.setupWhatsAppObserver(), 400);

        this.loadProperty(id);
      }
    });
  }

  private loadProperty(id: string): void {
    const currentUser = this.authService.currentUser();
    const userId = currentUser ? currentUser.id : undefined;
    const deviceHash = this.authService.getDeviceFingerprint();

    if (this.authService.isLoggedIn()) {
      // Record browsing history in MySQL & localStorage for logged in user
      this.authService.recordPropertyView(id).subscribe();
    } else {
      // Guest visitor flow - sync device view count
      this.authService.syncGuestViews().subscribe();
      // If guest has already viewed another property, immediately insist they sign in
      if (!this.authService.canViewProperty(id)) {
        setTimeout(() => {
          this.authService.openOtpModal('guest_limit');
        }, 150);
      }
    }

    // Pre-flight check: Verify quota limit BEFORE downloading details.php from DB
    this.isLoading.set(true);
    this.propertyService.checkProjectViewLimit(id, userId, deviceHash).subscribe({
      next: (limitCheck) => {
        if (!limitCheck.canDownload) {
          // User has reached quota limit! DO NOT download details.php from DB
          this.isLoading.set(false);
          this.isEntitlementExhausted.set(true);
          this.currentPhotoIdx.set(0);
          this.isPhotoUpgradePromptOpen.set(false);
          this.clearSiteVisitPromptTimer();
          this.isSiteVisitPromptOpen.set(false);

          // Construct basic property for display (title, price, 1st photo only + total count)
          const basic = (limitCheck as any).basicProperty;
          const cached = this.propertyService.getPropertyById(id);
          const base = basic || cached;
          if (base) {
            const firstPhoto = basic?.freePhotos?.[0] || basic?.imageUrl || cached?.freePhotos?.[0] || cached?.imageUrl || '';
            const totalPhotos = Math.max(
              basic?.totalPhotoCount || 0,
              cached?.totalPhotoCount || 0,
              cached?.freePhotos?.length || 0,
              firstPhoto ? 1 : 0
            );
            const restrictedProp: Property = {
              ...base,
              imageUrl: firstPhoto || base.imageUrl,
              freePhotos: firstPhoto ? [firstPhoto] : [],
              totalPhotoCount: totalPhotos,
              isViewRestricted: true,
              isMasked: true,
              activePlanName: limitCheck.activePlanName,
              activePlanId: limitCheck.activePlanId,
              projectViewsUsed: limitCheck.projectViewsUsed,
              projectViewLimit: limitCheck.projectViewLimit,
              upgradeMessage: limitCheck.upgradeMessage,
              isShortlisted: this.propertyService.isShortlisted(base.id)
            };
            this.fetchedProperty.set(restrictedProp);
            this.userBehaviorService.trackPropertyView(restrictedProp);
          }

          // Insist guest to login via OTP modal immediately
          if (!this.authService.isLoggedIn()) {
            setTimeout(() => {
              this.authService.openOtpModal('guest_limit');
            }, 150);
          }
          return;
        }

        // Quota check passed: download comprehensive details from details.php
        this.propertyService.fetchPropertyDetails(id, userId, deviceHash).subscribe({
          next: (prop) => {
            this.isLoading.set(false);
            if (prop) {
              this.fetchedProperty.set(prop);
              this.currentPhotoIdx.set(0);
              this.isPhotoUpgradePromptOpen.set(false);
              if (prop.isViewRestricted) {
                this.isEntitlementExhausted.set(true);
                this.clearSiteVisitPromptTimer();
                this.isSiteVisitPromptOpen.set(false);
                if (!this.authService.isLoggedIn()) {
                  setTimeout(() => {
                    this.authService.openOtpModal('guest_limit');
                  }, 150);
                }
              } else {
                this.isEntitlementExhausted.set(false);
                if (!this.authService.isLoggedIn()) {
                  this.authService.recordGuestPropertyView(id);
                }
                this.startSiteVisitPromptTimer();
              }
            }
            const resolved = prop || this.propertyService.getPropertyById(id);
            if (resolved) {
              this.userBehaviorService.trackPropertyView(resolved);
            }
          },
          error: () => {
            this.isLoading.set(false);
          }
        });
      },
      error: () => {
        // Fallback if check endpoint fails: attempt regular fetch
        this.propertyService.fetchPropertyDetails(id, userId, deviceHash).subscribe({
          next: (prop) => {
            this.isLoading.set(false);
            if (prop) {
              this.fetchedProperty.set(prop);
              this.currentPhotoIdx.set(0);
              this.isPhotoUpgradePromptOpen.set(false);
              if (prop.isViewRestricted) {
                this.isEntitlementExhausted.set(true);
                this.clearSiteVisitPromptTimer();
                this.isSiteVisitPromptOpen.set(false);
                if (!this.authService.isLoggedIn()) {
                  setTimeout(() => {
                    this.authService.openOtpModal('guest_limit');
                  }, 150);
                }
              } else {
                this.isEntitlementExhausted.set(false);
                if (!this.authService.isLoggedIn()) {
                  this.authService.recordGuestPropertyView(id);
                }
                this.startSiteVisitPromptTimer();
              }
            }
          },
          error: () => {
            this.isLoading.set(false);
          }
        });
      }
    });
  }

  // Prescribe login explicitly via OTP modal
  promptLogin(): void {
    this.authService.openOtpModal('guest_limit');
  }

  // State-Preserving Back Navigation
  goBack(): void {
    const lastUrl = this.propertyService.lastSearchUrl();
    if (lastUrl && lastUrl.includes('/search')) {
      this.router.navigateByUrl(lastUrl);
    } else {
      this.location.back();
    }
  }

  // Media Tab Selection
  setMediaTab(tab: MediaStageTab): void {
    this.activeMediaTab.set(tab);
    if (typeof window !== 'undefined' && typeof document !== 'undefined' && window.innerWidth <= 768) {
      setTimeout(() => {
        const mediaEl = document.querySelector('.hanu-media-card');
        if (mediaEl) {
          const headerEl = document.querySelector('app-header');
          const headerHeight = headerEl ? headerEl.getBoundingClientRect().height : 64;
          const bodyRect = document.body.getBoundingClientRect().top;
          const elementRect = mediaEl.getBoundingClientRect().top;
          const offsetPosition = Math.max(0, elementRect - bodyRect - (headerHeight + 8));
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      }, 15);
    }
  }

  // Photo Carousel & Upgrade Prompt Controls
  openPhotoUpgradePrompt(): void {
    this.isPhotoUpgradePromptOpen.set(true);
  }

  closePhotoUpgradePrompt(): void {
    this.isPhotoUpgradePromptOpen.set(false);
    this.currentPhotoIdx.set(0);
  }

  nextPhoto(): void {
    if (this.isViewRestricted()) {
      this.openPhotoUpgradePrompt();
      return;
    }
    const prop = this.property();
    if (!prop || !prop.freePhotos.length) return;
    this.currentPhotoIdx.update(idx => (idx + 1) % prop.freePhotos.length);
  }

  prevPhoto(): void {
    if (this.isViewRestricted()) {
      this.openPhotoUpgradePrompt();
      return;
    }
    const prop = this.property();
    if (!prop || !prop.freePhotos.length) return;
    this.currentPhotoIdx.update(idx => (idx - 1 + prop.freePhotos.length) % prop.freePhotos.length);
  }

  selectPhoto(idx: number): void {
    if (this.isViewRestricted()) {
      if (idx === 0) {
        this.closePhotoUpgradePrompt();
      } else {
        this.openPhotoUpgradePrompt();
      }
      return;
    }
    this.currentPhotoIdx.set(idx);
  }

  openFullscreen(): void {
    if (this.isViewRestricted() && this.isPhotoUpgradePromptOpen()) {
      return;
    }
    this.isFullscreenOpen.set(true);
  }

  closeFullscreen(): void {
    this.isFullscreenOpen.set(false);
  }

  // 4K Video Tour and Drone Media Getters
  getWalkthroughVideo(): PremiumMediaItem | null {
    const prop = this.property();
    if (!prop) return null;
    const found = prop.premiumMedia.find(m => m.type === 'video' && !m.tag.toLowerCase().includes('drone'));
    return found || prop.premiumMedia.find(m => m.type === 'video') || null;
  }

  getDroneVideo(): PremiumMediaItem | null {
    const prop = this.property();
    if (!prop) return null;
    const found = prop.premiumMedia.find(m => m.tag.toLowerCase().includes('drone') || m.title.toLowerCase().includes('drone'));
    return found || prop.premiumMedia.find(m => m.type === 'video') || null;
  }

  // Unlock Media Action
  unlockMedia(): void {
    const prop = this.property();
    if (!prop) return;

    if (this.walletService.balance() < prop.mediaPoints) {
      this.notificationService.show({
        type: 'warning',
        title: 'Insufficient Points',
        message: `You need ${prop.mediaPoints} points to unlock 4K walkthrough & drone footage. You currently have ${this.walletService.balance()} pts.`,
        icon: 'toll'
      });
      this.walletService.openTopupModal();
      return;
    }

    const success = this.propertyService.unlockMedia(prop.id);
    if (success) {
      this.notificationService.show({
        type: 'success',
        title: '4K Walkthrough & Drone Unlocked!',
        message: `Full cinematic 4K video walkthrough and aerial survey are now available permanently for ${prop.title}.`,
        icon: 'smart_display'
      });
    }
  }

  // Floor Plan Selection & Lightbox
  // Share Property Link
  shareProperty(): void {
    const prop = this.property();
    if (!prop) return;

    if (navigator.share) {
      navigator.share({
        title: prop.title,
        text: `Check out ${prop.title} in ${prop.locality}, ${prop.city} on Find a Plot Verified Registry.`,
        url: window.location.href
      }).catch(() => { });
    } else {
      navigator.clipboard.writeText(window.location.href);
      this.notificationService.show({
        type: 'info',
        title: 'Link Copied to Clipboard',
        message: 'Share this verified property dossier with family or co-investors.',
        icon: 'content_copy'
      });
    }
  }

  onImgError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target && !target.src.includes('photo-1600585154340-be6161a56a0c')) {
      target.src = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80';
    }
  }

  ngOnDestroy(): void {
    this.clearSiteVisitPromptTimer();
    this.waObserver?.disconnect();
    if (typeof window !== 'undefined') {
      window.removeEventListener('scroll', this.boundScrollHandler);
    }
  }

  /**
   * Start 50-Second High-Intent Site Visit Timer
   * Triggers an invitation dialog if user stays on the page for >50s,
   * provided the user is not restricted by membership quota or guest limit.
   */
  startSiteVisitPromptTimer(): void {
    this.clearSiteVisitPromptTimer();
    // Do not schedule site visit prompt if user reached quota or view is restricted
    if (this.isViewRestricted() || this.isEntitlementExhausted() || this.isBlockedForGuest() || this.property()?.isViewRestricted) {
      return;
    }
    this.siteVisitPromptTimer = setTimeout(() => {
      this.checkAndTriggerSiteVisitPrompt();
    }, 50000); // 50 seconds
  }

  clearSiteVisitPromptTimer(): void {
    if (this.siteVisitPromptTimer) {
      clearTimeout(this.siteVisitPromptTimer);
      this.siteVisitPromptTimer = null;
    }
  }

  checkAndTriggerSiteVisitPrompt(): void {
    // Only prompt if not previously shown in this view and not blocked by guest limit or membership quota
    if (
      this.hasPromptedSiteVisitForSession ||
      this.isBlockedForGuest() ||
      this.isViewRestricted() ||
      this.isEntitlementExhausted() ||
      this.property()?.isViewRestricted
    ) {
      return;
    }

    // Prefill user contact credentials if logged in
    const user = this.authService.currentUser();
    if (user) {
      if (user.name && !this.promptBuyerName()) this.promptBuyerName.set(user.name);
      if (user.phone && !this.promptBuyerPhone()) this.promptBuyerPhone.set(user.phone);
    }

    // Default visit date to tomorrow
    if (!this.promptVisitDate()) {
      const tomorrow = new Date(Date.now() + 86400000);
      this.promptVisitDate.set(tomorrow.toISOString().split('T')[0]);
    }

    this.hasPromptedSiteVisitForSession = true;
    this.isSiteVisitPromptOpen.set(true);
  }

  closeSiteVisitPrompt(): void {
    this.isSiteVisitPromptOpen.set(false);
  }

  openSiteVisitModal(): void {
    if (this.isViewRestricted() || this.isEntitlementExhausted() || this.isBlockedForGuest() || this.property()?.isViewRestricted) {
      this.notificationService.show({
        type: 'warning',
        title: 'Membership Quota Reached',
        message: 'You have reached your membership view quota. Please upgrade your membership plan to schedule site visits.',
        icon: 'lock'
      });
      return;
    }

    const user = this.authService.currentUser();
    if (user) {
      if (user.name && !this.promptBuyerName()) this.promptBuyerName.set(user.name);
      if (user.phone && !this.promptBuyerPhone()) this.promptBuyerPhone.set(user.phone);
    }
    if (!this.promptVisitDate()) {
      const tomorrow = new Date(Date.now() + 86400000);
      this.promptVisitDate.set(tomorrow.toISOString().split('T')[0]);
    }
    this.isSiteVisitPromptOpen.set(true);
  }

  submitPromptSiteVisit(event?: Event): void {
    if (event) event.preventDefault();
    const prop = this.property();
    if (!prop) return;

    const name = this.promptBuyerName().trim() || 'Guest Buyer';
    const phone = this.promptBuyerPhone().trim() || '+91 94441 00000';
    const date = this.promptVisitDate() || new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const slot = this.promptVisitSlot() || 'morning';

    this.isSubmittingPromptVisit.set(true);

    const currentUid = this.authService.currentUser()?.id;
    this.propertyService.submitSiteVisitLead({
      propertyId: prop.id,
      name,
      phone,
      userId: currentUid,
      date,
      slot,
      notes: `High-Intent 50s Engagement Prompt for ${prop.title}`
    }).subscribe({
      next: () => {
        this.isSubmittingPromptVisit.set(false);
        this.isSiteVisitPromptOpen.set(false);
        if (currentUid) {
          this.workspaceService.fetchUserWorkspace(currentUid).subscribe();
        }
        this.notificationService.show({
          type: 'success',
          title: 'Free Site Visit Scheduled!',
          message: `Your visit for ${prop.title} has been scheduled for ${date} (${slot.toUpperCase()}). Our field desk will contact you with GPS pickup coordinates.`,
          icon: 'event_available'
        });
      },
      error: () => {
        this.isSubmittingPromptVisit.set(false);
        this.isSiteVisitPromptOpen.set(false);
        if (currentUid) {
          this.workspaceService.fetchUserWorkspace(currentUid).subscribe();
        }
        this.notificationService.show({
          type: 'success',
          title: 'Site Visit Request Logged',
          message: `Your visit request for ${prop.title} has been registered. Our field desk will coordinate with you.`,
          icon: 'event_available'
        });
      }
    });
  }

  getPromptWhatsAppUrl(): string {
    const prop = this.property();
    if (!prop) return 'https://wa.me/919486140936';
    const dateStr = this.promptVisitDate() || 'this week';
    const slotStr = this.promptVisitSlot() || 'morning';
    const msg = `Hi Find a Plot Concierge, I have been reviewing ${prop.title} (REF: ${prop.id}) in ${prop.locality || prop.city} and would like to arrange a site visit on ${dateStr} (${slotStr}). Please share available coordinator contact and exact coordinates.`;
    return `https://wa.me/919486140936?text=${encodeURIComponent(msg)}`;
  }
}
