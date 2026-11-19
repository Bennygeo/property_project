import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TopConciergeBarComponent } from '../../components/top-concierge-bar/top-concierge-bar.component';
import { HeaderComponent } from '../../components/header/header.component';
import { HeroSearchComponent } from '../../components/hero-search/hero-search.component';
import { RecentSitesComponent } from '../../components/recent-sites/recent-sites.component';
import { FeaturedPropertiesComponent } from '../../components/featured-properties/featured-properties.component';
import { HomeDevelopersComponent } from '../../components/home-developers/home-developers.component';
import { WhyChooseUsComponent } from '../../components/why-choose-us/why-choose-us.component';
import { FooterComponent } from '../../components/footer/footer.component';
import { PropertyMediaModalComponent } from '../../components/property-media-modal/property-media-modal.component';
import { TopupDialogComponent } from '../../components/topup-dialog/topup-dialog.component';
import { ToastComponent } from '../../components/toast/toast.component';
import { AiChatModalComponent } from '../../components/ai-chat-modal/ai-chat-modal.component';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    CommonModule,
    TopConciergeBarComponent,
    HeaderComponent,
    HeroSearchComponent,
    RecentSitesComponent,
    FeaturedPropertiesComponent,
    HomeDevelopersComponent,
    WhyChooseUsComponent,
    FooterComponent,
    PropertyMediaModalComponent,
    TopupDialogComponent,
    ToastComponent,
    AiChatModalComponent
  ],
  template: `
    <div class="page-wrapper">
      <!-- Top Concierge Bar -->
      <app-top-concierge-bar />

      <!-- Main Sticky Navigation Header -->
      <app-header />

      <main class="page-main">
        <!-- Hero Search Console (Above-the-fold critical render) -->
        <app-hero-search />

        <!-- Recently Added Sites (Deferred until viewport approach) -->
        @defer (on viewport) {
          <app-recent-sites />
        } @placeholder {
          <div class="section-lazy-placeholder" style="min-height: 260px;"></div>
        }

        <!-- Discover Developers Row -->
        @defer (on viewport) {
          <app-home-developers />
        } @placeholder {
          <div class="section-lazy-placeholder" style="min-height: 130px;"></div>
        }

        <!-- Featured Verified Properties Grid -->
        @defer (on viewport) {
          <app-featured-properties />
        } @placeholder {
          <div class="section-lazy-placeholder" style="min-height: 380px;"></div>
        }

        <!-- Why Choose Find a Plot vs Traditional Brokers -->
        @defer (on viewport) {
          <app-why-choose-us />
        } @placeholder {
          <div class="section-lazy-placeholder" style="min-height: 300px;"></div>
        }
      </main>

      <!-- Comprehensive Footer -->
      @defer (on viewport) {
        <app-footer />
      } @placeholder {
        <div class="section-lazy-placeholder" style="min-height: 280px;"></div>
      }

      <!-- Interactive Modals (Loaded during browser idle time) -->
      @defer (on idle) {
        <app-property-media-modal />
        <app-topup-dialog />
        <app-ai-chat-modal />
      }

      <!-- Active Feedback Toasts -->
      <app-toast />
    </div>
  `,
  styles: [`
    .page-wrapper {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background-color: #ffffff;
      width: 100%;
    }
    .page-main {
      flex: 1;
      width: 100%;
      background-color: #ffffff;
    }
    app-hero-search {
      display: block;
      position: relative;
      z-index: 10;
    }
    app-featured-properties {
      display: block;
      position: relative;
      z-index: 1;
      width: 100%;
    }
    app-home-developers {
      display: block;
      position: relative;
      z-index: 1;
      width: 100%;
    }
    app-why-choose-us {
      display: block;
      position: relative;
      z-index: 1;
      width: 100%;
    }
    .section-lazy-placeholder {
      width: 100%;
      background: transparent;
    }
  `]
})
export class HomePageComponent { }
