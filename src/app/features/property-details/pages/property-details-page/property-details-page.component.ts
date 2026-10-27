import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { 
  Property, 
  PremiumMediaItem, 
  FloorPlanItem, 
  AmenityItem, 
  ConnectivityItem 
} from '../../../../core/models/property.model';
import { PropertyService } from '../../../../core/services/property.service';
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
import { InteractivePlotLayoutComponent } from '../../../../shared/components/interactive-plot-layout/interactive-plot-layout.component';
import { PlotexViewerComponent } from '../../../../shared/components/plotex-viewer/plotex-viewer.component';
import { SecureVideoPlayerComponent } from '../../../../shared/components/secure-video-player/secure-video-player.component';

export type MediaStageTab = 'photos' | 'walkthrough' | 'drone' | '3dmap';
export type AmenityFilterCategory = 'all' | 'sports' | 'leisure' | 'eco' | 'security';

function parsePriceToNumber(priceStr: string): number {
  if (!priceStr) return 0;
  const clean = priceStr.replace(/₹|,/g, '').trim().toLowerCase();
  if (clean.includes('cr')) {
    const num = parseFloat(clean.replace('cr', '').trim());
    return isNaN(num) ? 0 : num * 10000000;
  }
  if (clean.includes('lakh') || clean.includes('l')) {
    const num = parseFloat(clean.replace(/lakh|l/g, '').trim());
    return isNaN(num) ? 0 : num * 100000;
  }
  const direct = parseFloat(clean);
  return isNaN(direct) ? 0 : direct;
}

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
    InteractivePlotLayoutComponent,
    PlotexViewerComponent,
    SecureVideoPlayerComponent
  ],
  templateUrl: './property-details-page.component.html',
  styleUrls: ['./property-details-page.component.css']
})
export class PropertyDetailsPageComponent implements OnInit {
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
  readonly property = computed<Property | null>(() => {
    const id = this.propertyId();
    if (!id) return null;
    return this.propertyService.getPropertyById(id) || this.propertyService.allProperties()[0] || null;
  });

  readonly sanitizedInteractiveMapUrl = computed<SafeResourceUrl | null>(() => {
    const url = this.property()?.interactiveMapUrl;
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });

  readonly isPlot = computed<boolean>(() => {
    const prop = this.property();
    return prop?.propertyType === 'Gated CMDA Plots';
  });

  // Active in-page navigation section
  readonly activeNavSection = signal<string>('overview');

  // Media-First Top Stage State
  readonly activeMediaTab = signal<MediaStageTab>('photos');
  readonly currentPhotoIdx = signal<number>(0);
  readonly isFullscreenOpen = signal<boolean>(false);

  // Floor Plans State
  readonly selectedFloorPlanIndex = signal<number>(0);
  readonly isFloorPlanModalOpen = signal<boolean>(false);
  readonly activeModalFloorPlan = signal<FloorPlanItem | null>(null);

  // Plot Layout View Mode: 'plotex3d' (Plotex WebGL 3D) or 'plan2d' (Aerial Plan)
  readonly plotViewMode = signal<'plotex3d' | 'plan2d'>('plotex3d');

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

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.propertyId.set(id);
        this.currentPhotoIdx.set(0);
        this.selectedFloorPlanIndex.set(0);
        window.scrollTo({ top: 0, behavior: 'smooth' });

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
          const resolved = prop || this.propertyService.getPropertyById(id);
          if (resolved) {
            this.userBehaviorService.trackPropertyView(resolved);
            const priceNum = parsePriceToNumber(resolved.price);
            if (priceNum > 0) {
              this.loanAmount.set(Math.round(priceNum * 0.8));
            }
          }
        });
      }
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

  // Smooth Scroll to Section
  scrollToSection(sectionId: string): void {
    this.activeNavSection.set(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 64;
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
      }).catch(() => {});
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
}
