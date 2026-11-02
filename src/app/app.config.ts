import { ApplicationConfig, ErrorHandler, Injectable, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { routes } from './app.routes';

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
      })
    ),
    provideHttpClient(),
    { provide: ErrorHandler, useClass: GlobalChunkErrorHandler }
  ]
};
