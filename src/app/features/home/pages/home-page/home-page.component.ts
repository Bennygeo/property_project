import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TopConciergeBarComponent } from '../../components/top-concierge-bar/top-concierge-bar.component';
import { HeaderComponent } from '../../components/header/header.component';
import { HeroSearchComponent } from '../../components/hero-search/hero-search.component';
import { EconomyBannerComponent } from '../../components/economy-banner/economy-banner.component';
import { ValuePropsComponent } from '../../components/value-props/value-props.component';
import { CategoryGridComponent } from '../../components/category-grid/category-grid.component';
import { FeaturedPropertiesComponent } from '../../components/featured-properties/featured-properties.component';
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
    EconomyBannerComponent,
    FeaturedPropertiesComponent,
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
        <!-- Hero Search Console (Search-Section Background starts flush below header, containing header banner, intent strip & search console) -->
        <app-hero-search />

        <!-- Buyer Assurance & Verification Banner Strip -->
        <app-economy-banner />

        <!-- Featured Verified Properties Grid -->
        <app-featured-properties />

        <!-- Why Choose Find a Plot vs Traditional Brokers -->
        <app-why-choose-us />
      </main>

      <!-- Comprehensive Footer -->
      <app-footer />

      <!-- Interactive Modals & Toast -->
      <app-property-media-modal />
      <app-topup-dialog />
      <app-toast />
      <app-ai-chat-modal />
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
      position: relative;
      z-index: 1;
    }
    app-hero-search {
      display: block;
      position: relative;
      z-index: 10;
    }
    app-economy-banner {
      display: block;
      position: relative;
      z-index: 1;
    }
    app-featured-properties {
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
  `]
})
export class HomePageComponent { }
