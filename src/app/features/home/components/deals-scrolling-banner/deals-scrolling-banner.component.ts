import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export type BannerBgMode = 'plots' | 'flats' | 'alternating' | 'gradient';

@Component({
  selector: 'app-deals-scrolling-banner',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="max-w-content flash-banner-section" aria-label="Exclusive Verified Deals">
      <div 
        class="flash-billboard" 
        (mouseenter)="pauseAutoSlide()" 
        (mouseleave)="resumeAutoSlide()">

        <!-- Backdrop: Plots Imagery with Cinematic Dark Scrim (Toggleable via bgMode) -->
        <div class="flash-backdrop-wrapper">
          @if (bgMode() !== 'gradient') {
            <!-- Slide 0 Image Layer -->
            <div 
              class="flash-plot-img-layer" 
              [class.bg-visible]="activeSlide() === 0"
              [style.background-image]="bgImagesLoaded() ? ('url(' + getSlideBg(0) + ')') : 'none'"
              role="presentation">
            </div>

            <!-- Slide 1 Image Layer -->
            <div 
              class="flash-plot-img-layer" 
              [class.bg-visible]="activeSlide() === 1"
              [style.background-image]="bgImagesLoaded() ? ('url(' + getSlideBg(1) + ')') : 'none'"
              role="presentation">
            </div>

            <!-- Dark Scrim Gradient for Crisp Text Legibility -->
            <div class="flash-plot-scrim"></div>
          } @else {
            <!-- Original Pure Gradient Layers (Instant Revert Point) -->
            <div 
              class="flash-gradient-layer gradient-slide-0" 
              [class.bg-visible]="activeSlide() === 0"
              role="presentation">
              <div class="ambient-glow glow-1"></div>
              <div class="ambient-glow glow-2"></div>
            </div>
            <div 
              class="flash-gradient-layer gradient-slide-1" 
              [class.bg-visible]="activeSlide() === 1"
              role="presentation">
              <div class="ambient-glow glow-3"></div>
              <div class="ambient-glow glow-4"></div>
            </div>
          }

          <div class="flash-gradient-overlay"></div>
        </div>

        <!-- Panoramic Full-Width 200px Content Body -->
        <div class="flash-panoramic-body">

          <!-- Left & Center Deck: Fills 100% available space with smooth slide transitions -->
          <div class="slides-deck">

            <!-- SLIDE 1: Immediate Selling Offer -->
            <div 
              class="slide-content-pane" 
              [class.pane-active]="activeSlide() === 0"
              [class.pane-prev]="activeSlide() === 1">
              
              <!-- Left Narrative Block -->
              <div class="col-narrative">
                <h2 class="title-200">
                  Immediate Selling <span class="text-accent">Offers</span>
                </h2>
                <p class="desc-200">
                  Direct liquidation mandates from motivated sellers. 100% legal audit by High Court advocates &amp; ready for 48-hr deed registration.
                </p>
              </div>

              <!-- Right Visual: Extended Plot Showcase Card -->
              <div class="col-property-card">
                <a routerLink="/search" [queryParams]="{ type: 'Gated CMDA Plots' }" class="banner-property-card" title="Explore Verified CMDA Plots">
                  <div class="bpc-img-wrap">
                    <img [src]="plotImage" alt="CMDA Demarcated Villa Plot" class="bpc-img" loading="lazy" decoding="async" />
                    <span class="bpc-badge bpc-badge-plot">
                      <span class="material-symbols-outlined bpc-icon">terrain</span>
                      <span>CMDA PLOT</span>
                    </span>
                    <span class="bpc-tag-verified" title="Survey Audited">
                      <span class="material-symbols-outlined">verified</span>
                    </span>
                  </div>
                  <div class="bpc-info">
                    <div class="bpc-title-row">
                      <h4 class="bpc-title">Grand Crest Plots</h4>
                      <span class="bpc-price">₹42 L</span>
                    </div>
                    <div class="bpc-meta-row">
                      <span class="bpc-loc">
                        <span class="material-symbols-outlined">location_on</span>
                        Vandalur, Chennai
                      </span>
                      <span class="bpc-sqft">1,800 sq.ft</span>
                    </div>
                  </div>
                </a>
              </div>

            </div>

            <!-- SLIDE 2: Lesser Than Market Price -->
            <div 
              class="slide-content-pane" 
              [class.pane-active]="activeSlide() === 1"
              [class.pane-prev]="activeSlide() === 0">
              
              <!-- Left Narrative Block -->
              <div class="col-narrative">
                <h2 class="title-200">
                  Lesser Than <span class="text-accent">Market Price</span>
                </h2>
                <p class="desc-200">
                  Distress liquidations strictly discounted below government circle rates. High rental yield &amp; bank NOC guaranteed.
                </p>
              </div>

              <!-- Right Visual: Extended Flat Showcase Card -->
              <div class="col-property-card">
                <a routerLink="/search" [queryParams]="{ type: 'Commercial Spaces' }" class="banner-property-card" title="Explore Verified Distress Flats">
                  <div class="bpc-img-wrap">
                    <img [src]="flatImage" alt="Luxury Modern Residential Flat" class="bpc-img" loading="lazy" decoding="async" />
                    <span class="bpc-badge bpc-badge-flat">
                      <span class="material-symbols-outlined bpc-icon">apartment</span>
                      <span>3 BHK FLAT</span>
                    </span>
                    <span class="bpc-tag-discount">-28% SRO</span>
                  </div>
                  <div class="bpc-info">
                    <div class="bpc-title-row">
                      <h4 class="bpc-title">Marina Horizon</h4>
                      <span class="bpc-price">₹1.15 Cr</span>
                    </div>
                    <div class="bpc-meta-row">
                      <span class="bpc-loc">
                        <span class="material-symbols-outlined">location_on</span>
                        OMR, Chennai
                      </span>
                      <span class="bpc-sqft">1,650 sq.ft</span>
                    </div>
                  </div>
                </a>
              </div>

            </div>

          </div>

        </div>

        <!-- Subtle Minimalist Slide Indicators -->
        <div class="banner-slide-dots" role="tablist" aria-label="Slide Selector">
          <button 
            type="button" 
            class="slide-dot" 
            [class.active]="activeSlide() === 0" 
            (click)="setSlide(0)" 
            aria-label="Slide 1"></button>
          <button 
            type="button" 
            class="slide-dot" 
            [class.active]="activeSlide() === 1" 
            (click)="setSlide(1)" 
            aria-label="Slide 2"></button>
        </div>

        <!-- Bottom 2px Auto-timer Progress Track -->
        <div class="flash-progress-track">
          @for (s of [activeSlide()]; track s) {
            <div 
              class="flash-progress-bar" 
              [class.is-paused]="isPaused()">
            </div>
          }
        </div>

      </div>
    </section>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      margin: 0;
      padding: 0;
    }
    .flash-banner-section {
      width: 100%;
      margin-top: -1px;
      margin-bottom: 1.25rem;
      position: relative;
      z-index: 20;
    }
    @media (max-width: 640px) {
      .flash-banner-section {
        margin-bottom: 1rem;
      }
    }

    /* 200px Height Billboard Shell docked directly below header */
    .flash-billboard {
      position: relative;
      border-radius: 0 0 1rem 1rem;
      border: 1px solid #e2e8f0;
      border-top: none;
      overflow: hidden;
      min-height: 200px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      color: #0f172a;
      background: #ffffff;
    }

    @media (min-width: 1024px) {
      .flash-billboard {
        height: 200px;
        max-height: 200px;
      }
    }

    /* Backdrop Effects Background */
    .flash-backdrop-wrapper {
      position: absolute;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      overflow: hidden;
    }

    /* Plot Imagery Layer for Banner Background */
    .flash-plot-img-layer {
      position: absolute;
      inset: 0;
      background-size: cover;
      background-position: center 45%;
      opacity: 0;
      transform: scale(1.04);
      transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 1.2s ease-out;
      filter: saturate(1.15) contrast(1.05);
    }

    .flash-plot-img-layer.bg-visible {
      opacity: 0.16;
      transform: scale(1);
    }

    /* Light Translucent Scrim for Crisp Text Legibility */
    .flash-plot-scrim {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        90deg,
        rgba(255, 255, 255, 0.96) 0%,
        rgba(255, 255, 255, 0.88) 45%,
        rgba(248, 250, 252, 0.80) 75%,
        rgba(255, 255, 255, 0.95) 100%
      );
      pointer-events: none;
    }

    .flash-gradient-layer {
      position: absolute;
      inset: 0;
      opacity: 0;
      transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .flash-gradient-layer.bg-visible {
      opacity: 1;
    }

    /* Slide 0: Subtle Warm Crimson & Alabaster Gradient */
    .gradient-slide-0 {
      background: linear-gradient(135deg, #fff5f5 0%, #fff8f6 45%, #f8fafc 100%);
    }

    /* Slide 1: Subtle Fresh Emerald/Sky & Slate Gradient */
    .gradient-slide-1 {
      background: linear-gradient(135deg, #f0fdf4 0%, #f0f9ff 45%, #f8fafc 100%);
    }

    /* Ambient Gradient Highlights */
    .ambient-glow {
      position: absolute;
      border-radius: 9999px;
      filter: blur(60px);
      pointer-events: none;
    }

    .glow-1 {
      top: -30%;
      left: 5%;
      width: 440px;
      height: 260px;
      background: radial-gradient(circle, rgba(239, 68, 68, 0.12) 0%, rgba(254, 202, 202, 0.05) 60%, transparent 80%);
    }

    .glow-2 {
      bottom: -40%;
      right: 15%;
      width: 460px;
      height: 280px;
      background: radial-gradient(circle, rgba(245, 158, 11, 0.10) 0%, rgba(254, 226, 226, 0.04) 60%, transparent 80%);
    }

    .glow-3 {
      top: -30%;
      left: 8%;
      width: 440px;
      height: 260px;
      background: radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, rgba(167, 243, 208, 0.05) 60%, transparent 80%);
    }

    .glow-4 {
      bottom: -40%;
      right: 15%;
      width: 460px;
      height: 280px;
      background: radial-gradient(circle, rgba(6, 182, 212, 0.10) 0%, rgba(186, 230, 253, 0.04) 60%, transparent 80%);
    }

    .flash-gradient-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.7) 0%, transparent 40%, rgba(241, 245, 249, 0.4) 100%);
      pointer-events: none;
    }

    /* Panoramic 200px Main Body */
    .flash-panoramic-body {
      position: relative;
      z-index: 2;
      flex: 1;
      display: flex;
      align-items: center;
      width: 100%;
      height: 100%;
      padding: 1.25rem 2rem;
      box-sizing: border-box;
      gap: 1.5rem;
    }

    /* Slides Deck */
    .slides-deck {
      position: relative;
      flex: 1;
      height: 100%;
      min-width: 0;
      display: flex;
      align-items: center;
    }

    .slide-content-pane {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr);
      gap: 2rem;
      align-items: center;
      opacity: 0;
      visibility: hidden;
      transform: translate3d(24px, 0, 0);
      transition: opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1), transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.45s;
      pointer-events: none;
    }

    .slide-content-pane.pane-active {
      opacity: 1;
      visibility: visible;
      transform: translate3d(0, 0, 0);
      pointer-events: auto;
    }

    .slide-content-pane.pane-prev {
      transform: translate3d(-24px, 0, 0);
    }

    /* Left Narrative Column */
    .col-narrative {
      display: flex;
      flex-direction: column;
      gap: 5px;
      min-width: 0;
    }

    .eyebrow-pill-wrap {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .pill-mini {
      background: var(--brand-green, #5e8f72);
      color: #ffffff;
      font-size: 9.5px;
      font-weight: 600;
      letter-spacing: 0.05em;
      padding: 3px 8px;
      border-radius: 9999px;
    }

    .tag-mini {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
    }

    .title-200 {
      font-size: 1.5rem;
      font-weight: 600;
      line-height: 1.6;
      letter-spacing: -0.03em;
      color: #0f172a;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    @media (min-width: 1280px) {
      .title-200 {
        font-size: 1.5rem;
      }
    }

    .text-accent {
      color: var(--brand-green, #5e8f72);
    }

    .desc-200 {
      font-size: 14px;
      line-height: 1.55;
      color: #475569;
      letter-spacing: -0.01em;
      margin: 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* Right Visual: Extended Property Showcase Card */
    .col-property-card {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      height: 100%;
      width: 100%;
      min-width: 0;
    }

    .banner-property-card {
      display: flex;
      flex-direction: column;
      height: 160px;
      width: 100%;
      max-width: 640px;
      border-radius: 12px;
      overflow: hidden;
      background: #ffffff;
      /* border: 1px solid #e2e8f0; */
      /* box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06); */
      text-decoration: none;
      cursor: pointer;
      position: relative;
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease, box-shadow 0.2s ease;
      box-sizing: border-box;
    }
    .banner-property-card:hover {
      transform: translateY(-2px);
      border-color: #cbd5e1;
      box-shadow: 0 8px 22px rgba(15, 23, 42, 0.1);
    }

    .bpc-img-wrap {
      position: relative;
      width: 100%;
      height: 114px;
      overflow: hidden;
      background: #f1f5f9;
    }
    .bpc-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 0.4s ease;
    }
    .banner-property-card:hover .bpc-img {
      transform: scale(1.03);
    }

    .bpc-badge {
      position: absolute;
      top: 8px;
      left: 8px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: 5px;
      font-size: 9.5px;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: #ffffff;
      line-height: 1;
    }
    .bpc-badge-plot {
      background: rgba(16, 185, 129, 0.95);
    }
    .bpc-badge-flat {
      background: rgba(220, 38, 38, 0.95);
    }
    .bpc-badge .bpc-icon {
      font-size: 12px;
    }

    .bpc-tag-verified {
      position: absolute;
      top: 8px;
      right: 8px;
      color: #0284c7;
      display: flex;
    }
    .bpc-tag-verified .material-symbols-outlined {
      font-size: 18px;
    }

    .bpc-tag-discount {
      position: absolute;
      top: 8px;
      right: 8px;
      background: #dc2626;
      color: #ffffff;
      font-size: 9.5px;
      font-weight: 600;
      padding: 3px 7px;
      border-radius: 5px;
      letter-spacing: 0.03em;
      line-height: 1;
    }

    .bpc-info {
      padding: 8px 16px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 4px;
      background: #ffffff;
      border-top: 1px solid #f1f5f9;
      flex: 1;
    }

    .bpc-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .bpc-title {
      font-size: 13.5px;
      font-weight: 600;
      color: #0f172a;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.2;
    }
    .bpc-price {
      font-size: 13.5px;
      font-weight: 600;
      color: #059669;
      white-space: nowrap;
      line-height: 1.2;
    }

    .bpc-meta-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11.5px;
      color: #64748b;
      line-height: 1.2;
    }
    .bpc-loc {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .bpc-loc .material-symbols-outlined {
      font-size: 14px;
      color: var(--brand-green, #5e8f72);
    }
    .bpc-sqft {
      font-weight: 600;
      color: #475569;
    }

    /* Subtle Minimalist Slide Dots */
    .banner-slide-dots {
      position: absolute;
      bottom: 10px;
      right: 1.5rem;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      z-index: 4;
    }

    .slide-dot {
      width: 7px;
      height: 7px;
      border-radius: 9999px;
      background: #cbd5e1;
      border: none;
      padding: 0;
      cursor: pointer;
      transition: all 0.25s ease;
    }

    .slide-dot:hover {
      background: #94a3b8;
    }

    .slide-dot.active {
      background: var(--brand-green, #5e8f72);
      width: 18px;
    }

    /* Bottom Progress Bar (2px) */
    .flash-progress-track {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: #e2e8f0;
      z-index: 3;
      overflow: hidden;
    }

    .flash-progress-bar {
      height: 100%;
      width: 100%;
      background: #c76f56;
      transform-origin: left;
      transform: scaleX(0);
      animation: flashTimer 6s linear forwards;
      animation-play-state: running;
    }

    .flash-progress-bar.is-paused {
      animation-play-state: paused;
    }

    @keyframes flashTimer {
      0% { transform: scaleX(0); }
      100% { transform: scaleX(1); }
    }

    /* Mobile adjustments (Web screens >= 1024px unaffected) */
    @media (max-width: 1023px) {
      .flash-billboard {
        min-height: auto;
        margin-top: -20px;
      }
      .flash-panoramic-body {
        padding: 1rem 1rem 1.25rem;
        flex-direction: column;
        align-items: stretch;
      }
      .slides-deck {
        min-height: auto;
      }
      .slide-content-pane {
        grid-template-columns: 1fr;
        gap: 0.75rem;
        position: relative;
        transform: none !important;
      }
      .slide-content-pane:not(.pane-active) {
        display: none;
      }
      .col-narrative {
        width: 100%;
      }
      .title-200 {
        font-size: 1.25rem;
        white-space: normal;
        line-height: 1.3;
        overflow: visible;
        text-overflow: clip;
      }
      .desc-200 {
        font-size: 13px;
        line-height: 1.5;
        margin-top: 0.25rem;
      }
      .col-property-card {
        display: flex;
        width: 100%;
        margin-top: 0.25rem;
      }
      .banner-property-card {
        height: 64px;
        max-width: 100%;
        flex-direction: row;
        align-items: center;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        box-shadow: 0 2px 6px rgba(15, 23, 42, 0.04);
      }
      .bpc-img-wrap {
        width: 80px;
        height: 100%;
        flex-shrink: 0;
      }
      .bpc-badge,
      .bpc-tag-verified,
      .bpc-tag-discount {
        display: none;
      }
      .bpc-info {
        padding: 6px 12px;
        border-top: none;
        border-left: 1px solid #f1f5f9;
        justify-content: center;
      }
      .bpc-title {
        font-size: 12.5px;
      }
      .bpc-price {
        font-size: 13px;
      }
      .bpc-meta-row {
        font-size: 11px;
      }
      .banner-slide-dots {
        bottom: 8px;
        right: 1rem;
      }
    }

    @media (max-width: 480px) {
      .flash-panoramic-body {
        padding: 0.875rem 0.875rem 1.15rem;
      }
      .title-200 {
        font-size: 1.15rem;
      }
      .desc-200 {
        font-size: 12px;
        -webkit-line-clamp: 2;
      }
      .banner-property-card {
        height: 58px;
      }
      .bpc-img-wrap {
        width: 70px;
      }
    }
  `]
})
export class DealsScrollingBannerComponent implements OnInit, OnDestroy {
  readonly activeSlide = signal<number>(0);

  /**
   * REVERT POINT & MODE SWITCHER:
   * - 'plots': Real demarcated residential land plot layout
   * - 'flats': Luxury modern residential flat / apartment building
   * - 'alternating': Slide 0 = Plot, Slide 1 = Flat
   * - 'gradient': (INSTANT REVERT) Pure dark gradient glow background
   */
  readonly bgMode = signal<BannerBgMode>('alternating');

  // Curated photographic assets in public folder
  readonly plotImage = 'plot-banner.jpg';
  readonly flatImage = 'flat-banner.jpg';
  readonly bgImagesLoaded = signal<boolean>(false);

  getSlideBg(slideIdx: number): string {
    const mode = this.bgMode();
    if (mode === 'plots') return this.plotImage;
    if (mode === 'flats') return this.flatImage;
    return slideIdx === 0 ? this.plotImage : this.flatImage;
  }

  setBgMode(mode: BannerBgMode): void {
    this.bgMode.set(mode);
  }

  readonly isPaused = signal<boolean>(false);

  readonly SLIDE_DURATION = 6000;
  private remainingTime = 6000;
  private slideStartTime = 0;
  private slideTimer: any = null;

  ngOnInit(): void {
    this.startSlideTimer(this.SLIDE_DURATION);
    // Defer photographic backdrop so critical text content paints immediately
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        this.bgImagesLoaded.set(true);
      }, 100);
    }
  }

  ngOnDestroy(): void {
    this.clearSlideTimer();
  }

  setSlide(index: number): void {
    if (this.activeSlide() === index) return;
    this.activeSlide.set(index);
    if (this.isPaused()) {
      this.remainingTime = this.SLIDE_DURATION;
      this.slideStartTime = Date.now();
    } else {
      this.startSlideTimer(this.SLIDE_DURATION);
    }
  }

  nextSlide(): void {
    this.activeSlide.update(curr => (curr === 0 ? 1 : 0));
    this.startSlideTimer(this.SLIDE_DURATION);
  }

  prevSlide(): void {
    this.activeSlide.update(curr => (curr === 0 ? 1 : 0));
    this.startSlideTimer(this.SLIDE_DURATION);
  }

  pauseAutoSlide(): void {
    if (this.isPaused()) return;
    this.isPaused.set(true);
    this.clearSlideTimer();
    const elapsed = Date.now() - this.slideStartTime;
    this.remainingTime = Math.max(0, this.remainingTime - elapsed);
  }

  resumeAutoSlide(): void {
    if (!this.isPaused()) return;
    this.isPaused.set(false);
    if (this.remainingTime <= 0) {
      this.nextSlide();
    } else {
      this.slideStartTime = Date.now();
      this.slideTimer = setTimeout(() => {
        this.nextSlide();
      }, this.remainingTime);
    }
  }

  private startSlideTimer(duration: number): void {
    this.clearSlideTimer();
    this.remainingTime = duration;
    this.slideStartTime = Date.now();
    this.slideTimer = setTimeout(() => {
      this.nextSlide();
    }, duration);
  }

  private clearSlideTimer(): void {
    if (this.slideTimer) {
      clearTimeout(this.slideTimer);
      this.slideTimer = null;
    }
  }
}
