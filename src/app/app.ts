import { Component, signal, inject, Injector, OnInit } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter, take } from 'rxjs/operators';
import { OtpLoginModalComponent } from './core/components/otp-login-modal/otp-login-modal.component';
import { VisitorIntentModalComponent } from './core/components/visitor-intent-modal/visitor-intent-modal.component';
import { DistrictSelectorModalComponent } from './core/components/district-selector-modal/district-selector-modal.component';
import { PropertyCompareDockComponent } from './shared/components/property-compare/property-compare-dock/property-compare-dock.component';
import { PropertyCompareModalComponent } from './shared/components/property-compare/property-compare-modal/property-compare-modal.component';

@Component({
  imports: [
    RouterOutlet,
    OtpLoginModalComponent,
    VisitorIntentModalComponent,
    DistrictSelectorModalComponent,
    PropertyCompareDockComponent,
    PropertyCompareModalComponent
  ],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App implements OnInit {
  protected readonly title = signal('property-registry');
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

  ngOnInit(): void {
    // When the initial route finishes loading and activates its component view
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      take(1)
    ).subscribe(() => {
      // Allow browser paint frame to render the routed component before smoothly fading out
      requestAnimationFrame(() => {
        setTimeout(() => {
          this.dismissPreloader();
          // Defer plans, properties list and wallet packages until strictly after the initial rendering
          this.schedulePostRenderSync();
        }, 80);
      });
    });
  }

  private dismissPreloader(): void {
    if (typeof document === 'undefined') return;
    const preloader = document.getElementById('app-preloader');
    if (preloader && !preloader.classList.contains('fap-fade-out')) {
      preloader.classList.add('fap-fade-out');
      setTimeout(() => {
        try {
          preloader.remove();
        } catch (e) { }
      }, 400);
    }
  }

  /**
   * Background sync for plans, property list and wallet packages strictly scheduled
   * after the initial view has completely rendered and settled.
   * Uses dynamic imports so these services are NOT bundled into the initial main.js chunk.
   */
  private schedulePostRenderSync(): void {
    const runSync = async () => {
      try {
        const [{ PropertyService }, { SubscriptionService }, { WalletService }] = await Promise.all([
          import('./core/services/property.service'),
          import('./core/services/subscription.service'),
          import('./core/services/wallet.service')
        ]);

        try {
          const propertyService = this.injector.get(PropertyService);
          if (propertyService.allProperties().length === 0 && !propertyService.isSqlLoaded() && !propertyService.isFetchingApi()) {
            propertyService.loadPropertiesFromApi();
          }
        } catch (e) {
          console.warn('[PostRenderSync] Property list sync deferred:', e);
        }

        try {
          this.injector.get(SubscriptionService).fetchPlans().subscribe();
        } catch (e) {
          console.warn('[PostRenderSync] Plans sync deferred:', e);
        }

        try {
          this.injector.get(WalletService).loadPackagesFromApi();
        } catch (e) {
          console.warn('[PostRenderSync] Wallet packages sync deferred:', e);
        }
      } catch (e) {
        console.warn('[PostRenderSync] Failed loading deferred services:', e);
      }
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(runSync, { timeout: 3000 });
    } else {
      setTimeout(runSync, 1200);
    }
  }
}
