import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-economy-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="max-w-content verification-section">
      <!-- Building Art Sitting Flush Above Line -->
      <div class="skyline-wrapper">
        <div class="skyline-img-container">
          <img 
            alt="Sanctioned Structural & Cadastral Registry Skyline" 
            class="skyline-img" 
            src="skyline.svg"
            loading="lazy"
            decoding="async">
        </div>
      </div>

      <!-- Architectural Planar Baseline Frame (Zero Border Radius, Zero Dropshadow) -->
      <div class="verification-card">
        <div class="glow-decor"></div>
      </div>
    </section>
  `,
  styles: [`
    :host {
      display: block;
      position: relative;
      z-index: 1;
    }

    .verification-section {
      margin-top: 1.5rem;
      margin-bottom: 2rem;
      position: relative;
      z-index: 1;
    }
    @media (max-width: 640px) {
      .verification-section {
        margin-top: 1rem;
        margin-bottom: 1.5rem;
      }
    }

    /* Skyline Art Sitting Flush Above Line */
    .skyline-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      width: 100%;
      margin-bottom: -1px;
      position: relative;
      z-index: 2;
    }

    .skyline-img-container {
      width: 100%;
      height: 7.5rem;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      overflow: hidden;
    }
    @media (max-width: 640px) {
      .skyline-img-container {
        height: 5rem;
      }
    }

    .skyline-img {
      width: 100%;
      max-width: 58rem;
      height: 7.5rem;
      object-fit: contain;
      object-position: bottom center;
      opacity: 0.75;
      display: block;
    }
    @media (max-width: 640px) {
      .skyline-img {
        height: 5rem;
      }
    }

    /* Planar Line Frame - Strictly Zero Border Radius and Zero Dropshadow */
    .verification-card {
      position: relative;
      max-width: 58rem;
      margin: 0 auto;
      border-radius: 0;
      border: 1px solid #e2e8f0;
      border-bottom: none;
      background: #ffffff;
      height: 1.25rem;
      box-shadow: none;
      overflow: hidden;
    }
    @media (max-width: 768px) {
      .verification-card {
        border-radius: 0;
        height: 0.85rem;
      }
    }

    .glow-decor {
      position: absolute;
      top: 0;
      right: 0;
      width: 400px;
      height: 100%;
      background: radial-gradient(ellipse at top right, rgba(16, 185, 129, 0.08) 0%, transparent 70%);
      pointer-events: none;
    }
  `]
})
export class EconomyBannerComponent { }
