import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TopConciergeBarComponent } from '../../components/top-concierge-bar/top-concierge-bar.component';
import { HeaderComponent } from '../../components/header/header.component';
import { HeroSearchComponent } from '../../components/hero-search/hero-search.component';
import { EconomyBannerComponent } from '../../components/economy-banner/economy-banner.component';
import { ValuePropsComponent } from '../../components/value-props/value-props.component';
import { CategoryGridComponent } from '../../components/category-grid/category-grid.component';
import { NewLaunchesSpotlightComponent } from '../../components/new-launches-spotlight/new-launches-spotlight.component';
import { FeaturedPropertiesComponent } from '../../components/featured-properties/featured-properties.component';
import { PricingPacksComponent } from '../../components/pricing-packs/pricing-packs.component';
import { WhyChooseUsComponent } from '../../components/why-choose-us/why-choose-us.component';
import { MetroLocalityIndexComponent } from '../../components/metro-locality-index/metro-locality-index.component';
import { FooterComponent } from '../../components/footer/footer.component';
import { PropertyMediaModalComponent } from '../../components/property-media-modal/property-media-modal.component';
import { TopupDialogComponent } from '../../components/topup-dialog/topup-dialog.component';
import { ToastComponent } from '../../components/toast/toast.component';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    CommonModule,
    TopConciergeBarComponent,
    HeaderComponent,
    HeroSearchComponent,
    EconomyBannerComponent,
    ValuePropsComponent,
    CategoryGridComponent,
    NewLaunchesSpotlightComponent,
    FeaturedPropertiesComponent,
    PricingPacksComponent,
    WhyChooseUsComponent,
    MetroLocalityIndexComponent,
    FooterComponent,
    PropertyMediaModalComponent,
    TopupDialogComponent,
    ToastComponent
  ],
  template: `
    <div class="page-wrapper">
      <!-- Top Concierge Bar -->
      <app-top-concierge-bar />

      <!-- Main Sticky Navigation Header -->
      <app-header />

      <main class="page-main">
        <!-- Hero Search Console -->
        <app-hero-search />

        <!-- Pay-Per-Unlock Economy Banner Strip -->
        <app-economy-banner />

        <!-- Value Proposition Badges -->
        <app-value-props />

        <!-- Browse by Architectural Category -->
        <app-category-grid />

        <!-- New Launches Spotlight (The Coromandel Courtyard) -->
        <app-new-launches-spotlight />

        <!-- Featured No-Brokerage Properties Grid -->
        <app-featured-properties />

        <!-- Transparent Pay-Per-View Points & Pricing -->
        <app-pricing-packs />

        <!-- Why Choose Mannidam vs Traditional Brokers -->
        <app-why-choose-us />

        <!-- Pan-India Metros & Locality Price & Rental Yield Index -->
        <app-metro-locality-index />
      </main>

      <!-- Comprehensive Footer -->
      <app-footer />

      <!-- Interactive Modals & Toast -->
      <app-property-media-modal />
      <app-topup-dialog />
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
      position: relative;
    }
    app-hero-search {
      display: block;
      position: relative;
      z-index: 50;
    }
    app-economy-banner {
      display: block;
      position: relative;
      z-index: 1;
    }
  `]
})
export class HomePageComponent {}
