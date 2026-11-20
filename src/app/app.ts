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
  protected readonly shouldLoadModals = signal<boolean>(false);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

  ngOnInit(): void {
    // Load global modals immediately on first user interaction or after 5s idle (zero TBT during initial load)
    if (typeof window !== 'undefined') {
      const triggerModals = () => {
        if (!this.shouldLoadModals()) {
          this.shouldLoadModals.set(true);
        }
      };
      window.addEventListener('pointerdown', triggerModals, { once: true, passive: true });
      window.addEventListener('keydown', triggerModals, { once: true, passive: true });
      setTimeout(triggerModals, 5000);
    }

    // Dismiss preloader immediately when the initial route activates so Hero LCP paints on frame 0
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      take(1)
    ).subscribe(() => {
      this.dismissPreloader();
      // Defer background API sync strictly after initial paint & TBT window settles
      this.schedulePostRenderSync();
    });
  }

  private dismissPreloader(): void {
    if (typeof document === 'undefined') return;
    const preloader = document.getElementById('app-preloader');
    if (preloader) {
      try {
        preloader.remove();
      } catch (e) { }
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
          const currentPath = typeof window !== 'undefined' ? window.location.pathname.toLowerCase() : '';
          const isListingRoute = currentPath === '/' || currentPath.endsWith('/p_demo_5/') || currentPath.includes('/search');
          if (!isListingRoute && propertyService.allProperties().length === 0 && !propertyService.isSqlLoaded() && !propertyService.isFetchingApi()) {
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

    if (typeof window !== 'undefined') {
      setTimeout(() => {
        if ('requestIdleCallback' in window) {
          (window as any).requestIdleCallback(runSync, { timeout: 3000 });
        } else {
          runSync();
        }
      }, 4500);
    }
  }
}
