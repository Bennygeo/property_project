import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

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
        (mouseleave)="resumeAutoSlide()"
        (click)="onBannerClick($event)">

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
                <div class="banner-eyebrow">
                  <span class="banner-live-dot"></span>
                  <span class="banner-eyebrow-text">DIRECT MANDATE LIQUIDATION</span>
                </div>
                <h2 class="title-200">
                  Immediate Selling <span class="text-accent">Offers</span>
                </h2>
                <p class="desc-200">
                  Direct liquidation mandates from motivated sellers. 100% legal audit by High Court advocates &amp; ready for 48-hr deed registration.
                </p>
                <div class="banner-cta-row">
                  <a routerLink="/search" [queryParams]="{ type: 'Gated CMDA Plots' }" (click)="$event.stopPropagation()" class="btn-banner-action">
                    <span>Explore Verified Deals</span>
                    <span class="material-symbols-outlined cta-arrow">arrow_forward</span>
                  </a>
                </div>
              </div>

              <!-- Right Visual: Extended Plot Showcase Card -->
              <div class="col-property-card">
                <a [routerLink]="['/property', 'prop-grand-crest']" (click)="$event.stopPropagation()" class="banner-property-card" title="Grand Crest Plots - Property Details">
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
                <div class="banner-eyebrow">
                  <span class="banner-live-dot"></span>
                  <span class="banner-eyebrow-text">BELOW CIRCLE RATE DISCOUNTS</span>
                </div>
                <h2 class="title-200">
                  Lesser Than <span class="text-accent">Market Price</span>
                </h2>
                <p class="desc-200">
                  Distress liquidations strictly discounted below government circle rates. High rental yield &amp; bank NOC guaranteed.
                </p>
                <div class="banner-cta-row">
                  <a routerLink="/search" [queryParams]="{ type: 'Commercial Spaces' }" (click)="$event.stopPropagation()" class="btn-banner-action">
                    <span>Explore Distress Deals</span>
                    <span class="material-symbols-outlined cta-arrow">arrow_forward</span>
                  </a>
                </div>
              </div>

              <!-- Right Visual: Extended Flat Showcase Card -->
              <div class="col-property-card">
                <a [routerLink]="['/property', 'prop-marina-horizon']" (click)="$event.stopPropagation()" class="banner-property-card" title="Marina Horizon - Property Details">
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
            (click)="$event.stopPropagation(); setSlide(0)" 
            aria-label="Slide 1"></button>
          <button 
            type="button" 
            class="slide-dot" 
            [class.active]="activeSlide() === 1" 
            (click)="$event.stopPropagation(); setSlide(1)" 
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

    /* Billboard Shell docked directly below header */
    .flash-billboard {
      position: relative;
      border-radius: 3px !important;
      border: 1px solid var(--hairline-border, #e2e8f0);
      border-top: none;
      overflow: hidden;
      min-height: 210px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      color: #ffffff;
      background: #0f172a;
      box-shadow: 0 4px 20px -4px rgba(15, 23, 42, 0.25);
    }

    @media (min-width: 1024px) {
      .flash-billboard {
        height: 210px;
        max-height: 210px;
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

    /* Plot Imagery Layer for Banner Background - Full Image Background */
    .flash-plot-img-layer {
      position: absolute;
      inset: 0;
      background-size: cover;
      background-position: center 45%;
      opacity: 0;
      transform: scale(1.04);
      transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 1.2s ease-out;
      filter: saturate(1.1) contrast(1.05);
    }

    .flash-plot-img-layer.bg-visible {
      opacity: 1;
      transform: scale(1);
    }

    /* Architectural Gradient Scrim for High Contrast & Text Legibility */
    .flash-plot-scrim {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        90deg,
        rgba(15, 59, 74, 0.94) 0%,
        rgba(15, 23, 42, 0.85) 42%,
        rgba(15, 23, 42, 0.55) 75%,
        rgba(2, 6, 23, 0.90) 100%
      );
      pointer-events: none;
    }

    @media (max-width: 1023px) {
      .flash-plot-scrim {
        background: linear-gradient(
          180deg,
          rgba(15, 59, 74, 0.95) 0%,
          rgba(15, 23, 42, 0.88) 50%,
          rgba(2, 6, 23, 0.97) 100%
        );
      }
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

    /* Ambient Subtle Green Glow */
    .flash-gradient-overlay {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 10% 40%, rgba(94, 143, 114, 0.18) 0%, transparent 60%);
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
      gap: 6px;
      min-width: 0;
    }

    .banner-eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--brand-green-subtle, #e5f7ec);
      margin-bottom: 2px;
    }

    .banner-live-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--brand-green, #5e8f72);
      box-shadow: 0 0 0 0 rgba(94, 143, 114, 0.7);
      animation: bannerLivePulse 1.8s infinite;
      display: inline-block;
    }

    @keyframes bannerLivePulse {
      0% {
        box-shadow: 0 0 0 0 rgba(94, 143, 114, 0.7);
      }
      70% {
        box-shadow: 0 0 0 6px rgba(94, 143, 114, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(94, 143, 114, 0);
      }
    }

    .title-200 {
      font-size: 1.5rem;
      font-weight: 500;
      line-height: 1.35;
      letter-spacing: -0.02em;
      color: #ffffff;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
    }
    @media (min-width: 1280px) {
      .title-200 {
        font-size: 1.5rem;
      }
    }

    .text-accent {
      color: var(--brand-sold, #e5f7ec);
    }

    .desc-200 {
      font-size: 13.5px;
      line-height: 1.5;
      color: #e2e8f0;
      letter-spacing: -0.01em;
      margin: 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    }

    .banner-cta-row {
      margin-top: 0.35rem;
    }

    .btn-banner-action {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--brand-booked, #5e8f72);
      /* border: 1px solid var(--brand-green-border, #3d684e); */
      color: #ffffff;
      padding: 0.42rem 0.9rem;
      border-radius: 3px !important;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.02em;
      text-decoration: none;
      transition: all 0.2s ease;
      white-space: nowrap;
      width: fit-content;
    }

    .btn-banner-action:hover {
      background: var(--brand-green-hover, #497259);
      border-color: var(--brand-green-hover, #497259);
      box-shadow: 0 4px 12px rgba(94, 143, 114, 0.35);
      transform: translateY(-1px);
    }

    .btn-banner-action .cta-arrow {
      font-size: 15px;
      transition: transform 0.2s ease;
    }

    .btn-banner-action:hover .cta-arrow {
      transform: translateX(3px);
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
      height: 170px;
      width: 100%;
      max-width: 640px;
      border-radius: 6px 20px 20px 20px;
      overflow: hidden;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      text-decoration: none;
      cursor: pointer;
      position: relative;
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.25s ease, box-shadow 0.25s ease;
      box-sizing: border-box;
    }

    .bpc-img-wrap {
      position: relative;
      width: 100%;
      height: 110px;
      overflow: hidden;
      background: rgba(15, 23, 42, 0.5);
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
      border-radius: 3px !important;
      font-size: 9.5px;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: #ffffff;
      line-height: 1;
    }
    .bpc-badge-plot {
      background: var(--brand-green, #5e8f72);
    }
    .bpc-badge-flat {
      background: rgba(199, 111, 86, 0.95);
    }
    .bpc-badge .bpc-icon {
      font-size: 12px;
    }

    .bpc-tag-verified {
      position: absolute;
      top: 8px;
      right: 8px;
      color: var(--brand-green, #5e8f72);
      display: flex;
    }
    .bpc-tag-verified .material-symbols-outlined {
      font-size: 18px;
    }

    .bpc-tag-discount {
      position: absolute;
      top: 8px;
      right: 8px;
      background: var(--brand-sold, #c76f56);
      color: #ffffff;
      font-size: 9.5px;
      font-weight: 600;
      padding: 3px 7px;
      border-radius: 3px !important;
      letter-spacing: 0.03em;
      line-height: 1;
    }

    .bpc-info {
      padding: 8px 16px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 4px;
      background: rgba(15, 23, 42, 0.88);
      border-top: 1px solid rgba(255, 255, 255, 0.12);
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
      color: #ffffff;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.2;
    }
    .bpc-price {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--brand-green-subtle, #e5f7ec);
      white-space: nowrap;
      line-height: 1.2;
    }

    .bpc-meta-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11.5px;
      color: #cbd5e1;
      line-height: 1.2;
    }
    .bpc-loc {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #cbd5e1;
    }
    .bpc-loc .material-symbols-outlined {
      font-size: 14px;
      color: var(--brand-green, #5e8f72);
    }
    .bpc-sqft {
      font-weight: 600;
      color: #cbd5e1;
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
      background: rgba(255, 255, 255, 0.4);
      border: none;
      padding: 0;
      cursor: pointer;
      transition: all 0.25s ease;
    }

    .slide-dot:hover {
      background: rgba(255, 255, 255, 0.7);
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
      background: rgba(255, 255, 255, 0.15);
      z-index: 3;
      overflow: hidden;
    }

    .flash-progress-bar {
      height: 100%;
      width: 100%;
      background: var(--brand-green, #5e8f72);
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

    /* Mobile adjustments: strictly 120px tall on screens <= 1023px (Web screens >= 1024px unaffected) */
    @media (max-width: 1023px) {
      .flash-billboard {
        height: 120px;
        min-height: 120px;
        max-height: 120px;
        margin-top: 0;
        cursor: pointer;
      }
      .flash-panoramic-body {
        padding: 8px 12px 10px;
        flex-direction: column;
        justify-content: center;
        align-items: stretch;
        gap: 0;
        height: 100%;
        box-sizing: border-box;
      }
      .slides-deck {
        height: 100%;
        min-height: 0;
        display: flex;
        align-items: stretch;
      }
      .slide-content-pane {
        grid-template-columns: 1fr;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 6px;
        position: absolute;
        inset: 0;
        height: 100%;
        width: 100%;
        transform: none !important;
      }
      .slide-content-pane:not(.pane-active) {
        display: none;
      }
      .col-narrative {
        width: 100%;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        gap: 0;
        margin: 0;
      }
      .banner-eyebrow,
      .desc-200,
      .banner-cta-row {
        display: none !important;
      }
      .title-200 {
        font-size: 13.5px;
        font-weight: 600;
        line-height: 1.25;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: #ffffff;
        margin: 0;
        padding-right: 46px; /* Room for slide dots positioned top-right */
      }
      .col-property-card {
        display: flex;
        width: 100%;
        height: 58px;
        margin: 0;
      }
      .banner-property-card {
        height: 58px;
        width: 100%;
        max-width: 100%;
        flex-direction: row;
        align-items: center;
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 6px;
        background: #0d1726;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
        cursor: pointer;
        overflow: hidden;
        box-sizing: border-box;
      }
      .bpc-img-wrap {
        width: 72px;
        height: 100%;
        flex-shrink: 0;
        background: rgba(15, 23, 42, 0.6);
      }
      .bpc-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .bpc-badge,
      .bpc-tag-verified,
      .bpc-tag-discount {
        display: none !important;
      }
      .bpc-info {
        padding: 0 12px 0 10px;
        border-top: none;
        border-left: 1px solid rgba(255, 255, 255, 0.08);
        background: transparent;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 4px;
        flex: 1;
        min-width: 0;
        height: 100%;
      }
      .bpc-title-row {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 8px;
      }
      .bpc-title {
        font-size: 13px;
        font-weight: 700;
        color: #ffffff;
        margin: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        line-height: 1.2;
      }
      .bpc-price {
        font-size: 14px;
        font-weight: 700;
        color: #ffffff;
        white-space: nowrap;
        line-height: 1.2;
        flex-shrink: 0;
      }
      .bpc-meta-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        font-size: 11px;
        line-height: 1.2;
      }
      .bpc-loc {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: #cbd5e1;
        font-size: 11px;
      }
      .bpc-loc .material-symbols-outlined {
        font-size: 13px;
        color: var(--brand-green, #5e8f72);
      }
      .bpc-sqft {
        font-size: 11px;
        font-weight: 500;
        color: #94a3b8;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .banner-slide-dots {
        position: absolute;
        top: 9px;
        right: 12px;
        bottom: auto;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        z-index: 10;
      }
      .slide-dot {
        width: 6px;
        height: 6px;
      }
      .slide-dot.active {
        width: 14px;
      }
    }

    @media (max-width: 480px) {
      .flash-panoramic-body {
        padding: 7px 10px 9px;
      }
      .title-200 {
        font-size: 12.5px;
        padding-right: 42px;
      }
      .col-property-card {
        height: 56px;
      }
      .banner-property-card {
        height: 56px;
      }
      .bpc-img-wrap {
        width: 66px;
      }
      .bpc-title {
        font-size: 12px;
      }
      .bpc-price {
        font-size: 13px;
      }
      .bpc-loc,
      .bpc-sqft {
        font-size: 10.5px;
      }
      .banner-slide-dots {
        top: 8px;
        right: 10px;
      }
    }
  `]
})
export class DealsScrollingBannerComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);

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

  onBannerClick(event?: MouseEvent): void {
    const target = event?.target as HTMLElement;
    if (target?.closest('.slide-dot') || target?.closest('.btn-banner-action')) {
      return;
    }
    const propId = this.activeSlide() === 0 ? 'prop-grand-crest' : 'prop-marina-horizon';
    this.router.navigate(['/property', propId]);
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
