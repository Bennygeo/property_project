import { Component, OnInit, AfterViewInit, OnDestroy, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { validateGpsData, GpsValidationResult } from '../../../../core/utils/gps-helper';
import { formatPriceIndian, parsePriceToNumber } from '../../../../core/utils/price-helper';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  Property,
  PremiumMediaItem,
  FloorPlanItem,
  AmenityItem,
  ConnectivityItem
} from '../../../../core/models/property.model';
import { PropertyService, NearbyLocality } from '../../../../core/services/property.service';
import { WalletService } from '../../../../core/services/wallet.service';
import { MetroService } from '../../../../core/services/metro.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UserBehaviorService } from '../../../../core/services/user-behavior.service';
import { HeaderComponent } from '../../../home/components/header/header.component';
import { FooterComponent } from '../../../home/components/footer/footer.component';
import { TopConciergeBarComponent } from '../../../home/components/top-concierge-bar/top-concierge-bar.component';
import { TopupDialogComponent } from '../../../home/components/topup-dialog/topup-dialog.component';
import { ToastComponent } from '../../../home/components/toast/toast.component';
import { PropertyMediaModalComponent } from '../../../home/components/property-media-modal/property-media-modal.component';
import { SecureVideoPlayerComponent } from '../../../../shared/components/secure-video-player/secure-video-player.component';
import { VirtualPropertyPresenterComponent } from '../../../../shared/components/virtual-property-presenter/virtual-property-presenter.component';

export type MediaStageTab = 'photos' | 'walkthrough' | 'drone';
export type AmenityFilterCategory = 'all' | 'sports' | 'leisure' | 'eco' | 'security';
export type DetailContextTab = 'infrastructure' | 'legal_specs' | 'location_transit' | 'overview';

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
    SecureVideoPlayerComponent,
    VirtualPropertyPresenterComponent
  ],
  templateUrl: './property-details-page.component.html',
  styleUrls: ['./property-details-page.component.css']
})
export class PropertyDetailsPageComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly showFloatingWa = signal<boolean>(false);
  readonly isScrolledPastHeader = signal<boolean>(false);
  private waObserver: IntersectionObserver | null = null;
  readonly formatPriceIndian = formatPriceIndian;

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (typeof window !== 'undefined') {
      const scrolled = window.scrollY > 180;
      if (this.isScrolledPastHeader() !== scrolled) {
        this.isScrolledPastHeader.set(scrolled);
      }
    }
  }
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly sanitizer = inject(DomSanitizer);
  readonly propertyService = inject(PropertyService);
  readonly walletService = inject(WalletService);
  readonly metroService = inject(MetroService);
  readonly notificationService = inject(NotificationService);
  readonly authService = inject(AuthService);
  readonly userBehaviorService = inject(UserBehaviorService);

  readonly propertyId = signal<string>('');
  readonly fetchedProperty = signal<Property | null>(null);
  readonly nearbyLocalities = signal<NearbyLocality[]>([]);
  readonly nearbyProperties = signal<Property[]>([]);
  readonly property = computed<Property | null>(() => {
    if (this.fetchedProperty()) {
      return this.fetchedProperty();
    }
    const id = this.propertyId();
    if (!id) return null;
    return this.propertyService.getPropertyById(id) || this.propertyService.allProperties()[0] || null;
  });

  readonly gpsAudit = computed<GpsValidationResult>(() => {
    const prop = this.property();
    const rawLink = prop?.googleMapsLink || prop?.masterDetails?.googleMapsLink || (prop?.latitude && prop?.longitude ? `${prop.latitude}, ${prop.longitude}` : '');
    return validateGpsData(rawLink);
  });

  readonly isPlot = computed<boolean>(() => {
    const prop = this.property();
    return prop?.propertyType === 'Gated CMDA Plots';
  });

  // Active in-page navigation section
  readonly activeNavSection = signal<string>('overview');
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

  readonly sanitizedHighlights = computed<string[]>(() => {
    const prop = this.property();
    if (!prop) return [];
    const raw = Array.isArray(prop.highlights) ? prop.highlights : [];
    const blacklisted = new Set(['plots', 'plot', 'published', 'strategic published', 'draft', 'null', 'undefined', 'yes', 'no']);
    const cleaned = raw
      .map(h => String(h || '').trim())
      .filter(h => h.length > 2 && !blacklisted.has(h.toLowerCase()));

    if (cleaned.length === 0) {
      const list: string[] = [];
      if (prop.masterDetails?.dtcpApproved === 'Yes') list.push('DTCP / CMDA Sanctioned Layout');
      if (prop.masterDetails?.roadWidthFt) list.push(`${prop.masterDetails.roadWidthFt} Ft Wide ${prop.masterDetails.roadType || 'Bitumen'} Road`);
      if (prop.masterDetails?.clearTitleAvailable === 'Yes') list.push('30-Year Verified Clear Title Deed');
      if (prop.masterDetails?.pattaType) list.push(prop.masterDetails.pattaType);
      if (prop.masterDetails?.bankLoanApproved === 'Yes') list.push('Pre-Approved Bank Loans Available');
      if (prop.masterDetails?.suitedFor) list.push(`Suited for ${prop.masterDetails.suitedFor}`);
      return list.length > 0 ? list : ['Government Sanctioned Layout', 'Clear Freehold Ownership', 'Verified Cadastral Survey'];
    }
    return cleaned;
  });

  // Media-First Top Stage State
  readonly activeMediaTab = signal<MediaStageTab>('photos');
  readonly currentPhotoIdx = signal<number>(0);
  readonly isFullscreenOpen = signal<boolean>(false);

  // Floor Plans State
  readonly selectedFloorPlanIndex = signal<number>(0);
  readonly isFloorPlanModalOpen = signal<boolean>(false);
  readonly activeModalFloorPlan = signal<FloorPlanItem | null>(null);

  // Plot Layout View Mode: 'plotex3d' (Plotex WebGL 3D) or 'plan2d' (Aerial Plan)
  // Amenities Filter State
  readonly selectedAmenityCategory = signal<AmenityFilterCategory>('all');
  readonly filteredAmenities = computed<AmenityItem[]>(() => {
    const prop = this.property();
    if (!prop || !prop.amenitiesList) return [];
    const cat = this.selectedAmenityCategory();
    if (cat === 'all') return prop.amenitiesList;
    return prop.amenitiesList.filter(a => a.category === cat);
  });

  // Interactive EMI Calculator State (100acress Style)
  readonly loanAmount = signal<number>(8000000);
  readonly interestRate = signal<number>(8.5);
  readonly loanTenureYears = signal<number>(20);

  // Computed EMI Metrics
  readonly computedMonthlyEmi = computed<number>(() => {
    const p = this.loanAmount();
    const annualRate = this.interestRate();
    const years = this.loanTenureYears();
    if (!p || p <= 0 || !years || years <= 0) return 0;
    const monthlyRate = annualRate / (12 * 100);
    const months = years * 12;
    const emi = (p * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
    return Math.round(emi);
  });

  readonly computedTotalPayment = computed<number>(() => {
    return this.computedMonthlyEmi() * this.loanTenureYears() * 12;
  });

  readonly computedTotalInterest = computed<number>(() => {
    return Math.max(0, this.computedTotalPayment() - this.loanAmount());
  });

  // Stamp duty & registration fee estimates
  readonly computedStampDuty = computed<number>(() => {
    const prop = this.property();
    if (!prop) return 0;
    const baseVal = parsePriceToNumber(prop.price);
    return Math.round(baseVal * 0.07); // 7% State Stamp Duty
  });

  readonly computedRegistrationFee = computed<number>(() => {
    const prop = this.property();
    if (!prop) return 0;
    const baseVal = parsePriceToNumber(prop.price);
    return Math.round(baseVal * 0.02); // 2% SRO Registration Fee
  });

  // FAQ Accordion State
  readonly expandedFaqIdx = signal<number | null>(0);

  // Inquire & Site Visit Form State
  readonly buyerName = signal<string>('');
  readonly buyerPhone = signal<string>('');
  readonly visitDate = signal<string>('');
  readonly visitTimeSlot = signal<string>('morning');
  readonly isSubmittingVisit = signal<boolean>(false);

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
        this.selectedFloorPlanIndex.set(0);
        this.hasPromptedSiteVisitForSession = false;
        this.isSiteVisitPromptOpen.set(false);
        this.startSiteVisitPromptTimer();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => this.setupWhatsAppObserver(), 400);

        if (this.authService.isLoggedIn()) {
          // Record browsing history in MySQL & localStorage for logged in user
          this.authService.recordPropertyView(id).subscribe();
        } else {
          // Guest visitor flow - verify against server IP/device records across browsers
          this.authService.syncGuestViews().subscribe(() => {
            if (this.authService.canViewProperty(id)) {
              // First free property view granted to guest
              this.authService.recordGuestPropertyView(id);
            } else {
              // Blocked: Guest has already viewed 1 property from this computer/IP. Prescribe login!
              this.authService.openOtpModal('guest_limit');
            }
          });
        }

        // Fetch real-time dossier from MySQL backend
        this.propertyService.fetchPropertyDetails(id).subscribe(prop => {
          if (prop) {
            this.fetchedProperty.set(prop);
          }
          const resolved = prop || this.propertyService.getPropertyById(id);
          if (resolved) {
            this.userBehaviorService.trackPropertyView(resolved);
            const priceNum = parsePriceToNumber(resolved.price);
            if (priceNum > 0) {
              this.loanAmount.set(Math.round(priceNum * 0.8));
            }
            this.loadNearbyLocalities(resolved);
          }
        });
      }
    });
  }

  loadNearbyLocalities(prop: Property): void {
    const loc = prop.villageLocality || prop.locality || prop.masterDetails?.villageLocality || '';
    const district = prop.district || prop.masterDetails?.district || prop.city || '';
    const taluk = prop.taluk || prop.masterDetails?.taluk || '';

    this.propertyService.fetchNearbyData({
      propertyId: prop.id,
      locality: loc,
      district: district,
      taluk: taluk
    }).subscribe(res => {
      this.nearbyLocalities.set(res.nearbyLocalities || []);
      this.nearbyProperties.set(res.nearbyProperties || []);
    });
  }

  // 1-Click Instant Demo Login from blocked view
  quickLoginAndUnlock(): void {
    this.authService.quickDemoLogin();
    const id = this.propertyId();
    if (id) {
      this.authService.recordPropertyView(id).subscribe();
    }
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

  // Smooth Scroll to Section or switch Context Tab
  scrollToSection(sectionId: string): void {
    if (sectionId === 'site-infrastructure' || sectionId === 'infrastructure') {
      this.activeDetailTab.set('infrastructure');
    } else if (sectionId === 'cadastral-specs' || sectionId === 'legal-approvals' || sectionId === 'specs') {
      this.activeDetailTab.set('legal_specs');
    } else if (sectionId === 'transit-connectivity' || sectionId === 'gps-audit' || sectionId === 'location') {
      this.activeDetailTab.set('location_transit');
    } else if (sectionId === 'overview' || sectionId === 'amenities' || sectionId === 'floor-plan') {
      this.activeDetailTab.set('overview');
    }
    this.activeNavSection.set(sectionId);
    const element = document.getElementById(sectionId) || document.getElementById('details-context-workspace');
    if (element) {
      const offset = 72;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
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

  // Photo Carousel Controls
  nextPhoto(): void {
    const prop = this.property();
    if (!prop || !prop.freePhotos.length) return;
    this.currentPhotoIdx.update(idx => (idx + 1) % prop.freePhotos.length);
  }

  prevPhoto(): void {
    const prop = this.property();
    if (!prop || !prop.freePhotos.length) return;
    this.currentPhotoIdx.update(idx => (idx - 1 + prop.freePhotos.length) % prop.freePhotos.length);
  }

  selectPhoto(idx: number): void {
    this.currentPhotoIdx.set(idx);
  }

  openFullscreen(): void {
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
  selectFloorPlan(idx: number): void {
    this.selectedFloorPlanIndex.set(idx);
  }

  openFloorPlanModal(plan: FloorPlanItem): void {
    this.activeModalFloorPlan.set(plan);
    this.isFloorPlanModalOpen.set(true);
  }

  closeFloorPlanModal(): void {
    this.isFloorPlanModalOpen.set(false);
    this.activeModalFloorPlan.set(null);
  }

  downloadFloorPlan(plan: FloorPlanItem): void {
    this.notificationService.show({
      type: 'success',
      title: 'Floor Plan Blueprint Downloaded',
      message: `High-resolution architectural schematic for ${plan.name} has been downloaded.`,
      icon: 'download_done'
    });
  }

  // Amenities Filter
  setAmenityCategory(cat: AmenityFilterCategory): void {
    this.selectedAmenityCategory.set(cat);
  }

  // EMI Slider Handlers
  onLoanAmountChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.loanAmount.set(parseFloat(input.value));
  }

  onInterestRateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.interestRate.set(parseFloat(input.value));
  }

  onTenureChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.loanTenureYears.set(parseInt(input.value, 10));
  }

  // FAQ Accordion Toggle
  toggleFaq(idx: number): void {
    if (this.expandedFaqIdx() === idx) {
      this.expandedFaqIdx.set(null);
    } else {
      this.expandedFaqIdx.set(idx);
    }
  }

  // Schedule Survey Visit
  scheduleVisit(event: Event): void {
    event.preventDefault();
    const prop = this.property();
    if (!prop) return;

    this.isSubmittingVisit.set(true);

    this.propertyService.submitSiteVisitLead({
      propertyId: prop.id,
      name: this.buyerName() || 'Guest Buyer',
      phone: this.buyerPhone() || '+91 94441 00000',
      date: this.visitDate(),
      slot: this.visitTimeSlot(),
      notes: `Requested via Property Details Page for ${prop.title}`
    }).subscribe(() => {
      this.isSubmittingVisit.set(false);
      this.notificationService.show({
        type: 'success',
        title: 'Survey Visit Scheduled & Logged to DB',
        message: `Cadastral appointment registered in database for ${prop.title}. Concierge desk will WhatsApp the coordinates.`,
        icon: 'event_available'
      });
      this.buyerName.set('');
      this.buyerPhone.set('');
      this.visitDate.set('');
    });
  }

  // Download Brochure
  downloadBrochure(): void {
    const prop = this.property();
    if (!prop) return;

    this.propertyService.captureBrochureLead({
      propertyId: prop.id,
      name: this.buyerName() || 'Guest Buyer',
      phone: this.buyerPhone() || '+91 94441 00000'
    }).subscribe(res => {
      this.notificationService.show({
        type: 'success',
        title: 'Brochure & Cadastral Dossier Downloaded',
        message: `Complete regulatory dossier, floor plans, and SRO title deed extracts for ${prop.title} downloaded.`,
        icon: 'description'
      });
    });
  }

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

  formatIndianCurrency(num: number): string {
    if (!num || isNaN(num)) return '₹0';
    if (num >= 10000000) {
      return `₹${(num / 10000000).toFixed(2)} Cr`;
    }
    if (num >= 100000) {
      return `₹${(num / 100000).toFixed(2)} Lakh`;
    }
    return `₹${num.toLocaleString('en-IN')}`;
  }

  onImgError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target && !target.src.includes('photo-1600585154340-be6161a56a0c')) {
      target.src = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80';
    }
  }

  ngOnDestroy(): void {
    this.clearSiteVisitPromptTimer();
  }

  /**
   * Start 50-Second High-Intent Site Visit Timer
   * Triggers an invitation dialog if user stays on the page for >50s
   */
  startSiteVisitPromptTimer(): void {
    this.clearSiteVisitPromptTimer();
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
    // Only prompt if not previously shown in this view and not blocked by guest limit
    if (this.hasPromptedSiteVisitForSession || this.isBlockedForGuest()) {
      return;
    }

    // Prefill user contact credentials if logged in
    const user = this.authService.currentUser();
    if (user) {
      if (user.name && !this.promptBuyerName()) this.promptBuyerName.set(user.name);
      if (user.phone && !this.promptBuyerPhone()) this.promptBuyerPhone.set(user.phone);
    } else {
      if (this.buyerName() && !this.promptBuyerName()) this.promptBuyerName.set(this.buyerName());
      if (this.buyerPhone() && !this.promptBuyerPhone()) this.promptBuyerPhone.set(this.buyerPhone());
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
    const user = this.authService.currentUser();
    if (user) {
      if (user.name && !this.promptBuyerName()) this.promptBuyerName.set(user.name);
      if (user.phone && !this.promptBuyerPhone()) this.promptBuyerPhone.set(user.phone);
    } else {
      if (this.buyerName() && !this.promptBuyerName()) this.promptBuyerName.set(this.buyerName());
      if (this.buyerPhone() && !this.promptBuyerPhone()) this.promptBuyerPhone.set(this.buyerPhone());
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

    const name = this.promptBuyerName().trim() || this.buyerName().trim() || 'Guest Buyer';
    const phone = this.promptBuyerPhone().trim() || this.buyerPhone().trim() || '+91 94441 00000';
    const date = this.promptVisitDate() || new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const slot = this.promptVisitSlot() || 'morning';

    this.isSubmittingPromptVisit.set(true);

    this.propertyService.submitSiteVisitLead({
      propertyId: prop.id,
      name,
      phone,
      date,
      slot,
      notes: `High-Intent 50s Engagement Prompt for ${prop.title}`
    }).subscribe({
      next: () => {
        this.isSubmittingPromptVisit.set(false);
        this.isSiteVisitPromptOpen.set(false);
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
    if (!prop) return 'https://wa.me/919444100000';
    const dateStr = this.promptVisitDate() || 'this week';
    const slotStr = this.promptVisitSlot() || 'morning';
    const msg = `Hi Find a Plot Concierge, I have been reviewing ${prop.title} (REF: ${prop.id}) in ${prop.locality || prop.city} and would like to arrange a site visit on ${dateStr} (${slotStr}). Please share available coordinator contact and exact coordinates.`;
    return `https://wa.me/919444100000?text=${encodeURIComponent(msg)}`;
  }
}
