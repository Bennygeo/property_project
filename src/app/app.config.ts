import { ApplicationConfig, ErrorHandler, Injectable, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withInMemoryScrolling, withPreloading, PreloadingStrategy, Route } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { Observable, of, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { routes } from './app.routes';

/**
 * Selective delayed preloading strategy:
 * - Never preloads heavy admin/portal/developer bundles (2+ MB)
 * - Only preloads high-traffic buyer routes marked with data: { preload: true }
 * - Waits 5s after bootstrap so initial mobile FCP, LCP, SI, and TBT remain untouched
 */
@Injectable({ providedIn: 'root' })
export class SelectivePreloadingStrategy implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<any>): Observable<any> {
    if (route.data && route.data['preload']) {
      return timer(5000).pipe(switchMap(() => load()));
    }
    return of(null);
  }
}

@Injectable()
export class GlobalChunkErrorHandler implements ErrorHandler {
  handleError(error: any): void {
    const errorText = error?.message || (typeof error === 'string' ? error : error?.toString() || '');
    const isChunkLoadFailed = /Failed to fetch dynamically imported module|Loading chunk [\w-]+ failed/i.test(errorText);

    if (isChunkLoadFailed) {
      const storageKey = 'last_chunk_reload_time';
      const lastReload = parseInt(sessionStorage.getItem(storageKey) || '0', 10);
      const now = Date.now();
      // Auto-reload to fetch the latest deployed build if not reloaded in the last 10 seconds
      if (now - lastReload > 10000) {
        sessionStorage.setItem(storageKey, now.toString());
        window.location.reload();
        return;
      }
    }
    console.error(error);
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'top',
        anchorScrolling: 'enabled'
      }),
      withPreloading(SelectivePreloadingStrategy)
    ),
    provideHttpClient(),
    { provide: ErrorHandler, useClass: GlobalChunkErrorHandler }
  ]
};
