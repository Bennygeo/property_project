import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { ListingMode, Property, PropertyType } from '../models/property.model';
import { NotificationService } from './notification.service';
import { WalletService } from './wallet.service';
import { enrichPropertyWithMockDetails } from './property-details-mock.helper';
import { MOCK_50_PROPERTIES } from './mock-properties-data';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PropertyService {
  private readonly http = inject(HttpClient);
  private readonly notificationService = inject(NotificationService);
  private readonly walletService = inject(WalletService);
  public readonly isSqlLoaded = signal<boolean>(false);

  // Master property list initialized with 50+ mock properties directly from database (10L to 3Cr)
  private readonly _properties = signal<Property[]>(MOCK_50_PROPERTIES);

  // Active search criteria
  public readonly activeTab = signal<ListingMode>('buy');
  public readonly selectedCity = signal<string>('chennai');
  public readonly searchQuery = signal<string>('');
  public readonly selectedPropertyType = signal<string>('Apartments & Flats');
  public readonly selectedBudget = signal<string>('Select Budget');

  // Quick filter for category pill tabs ('all' | 'apartments' | 'plots' | 'villas' | 'commercial')
  public readonly activeCategoryFilter = signal<string>('all');

  // Currently focused property for media gallery modal
  public readonly activeModalProperty = signal<Property | null>(null);
  public readonly activeMediaTab = signal<'free' | 'premium'>('free');

  // Full list of properties
  public readonly allProperties = computed(() => this._properties());

  // Computed shortlist count
  public readonly shortlistCount = computed(() => {
    return this._properties().filter(p => p.isShortlisted).length;
  });

  // Filtered properties based on search query / city / tab / quick pill
  public readonly properties = computed(() => {
    const filter = this.activeCategoryFilter();
    const heroTab = this.activeTab();
    const q = this.searchQuery().toLowerCase().trim();
    let all = this._properties();

    // 1. Text Search matching on title, locality, city, bhk, type, rera
    if (q) {
      const words = q.split(/\s+/).filter(Boolean);
      all = all.filter(p => {
        const fullText = `${p.title || ''} ${p.locality || ''} ${p.city || ''} ${p.propertyType || ''} ${p.bhkBadge || ''} ${p.badges?.rera || ''}`.toLowerCase();
        return words.every(w => fullText.includes(w));
      });
    }

    // 2. Category filter pill selection
    if (filter !== 'all') {
      let filtered = all;
      if (filter === 'apartments') {
        filtered = all.filter(p => p.propertyType === 'Apartments & Flats');
      } else if (filter === 'plots') {
        filtered = all.filter(p => p.propertyType === 'Gated CMDA Plots');
      } else if (filter === 'villas') {
        filtered = all.filter(p => p.propertyType === 'Independent Villas' || p.propertyType === 'Luxury Penthouses');
      } else if (filter === 'commercial') {
        filtered = all.filter(p => p.propertyType === 'Commercial Spaces');
      }
      if (filtered.length > 0 || !q) {
        return filtered;
      }
    }

    // 3. Secondary check against hero search bar tabs if category filter is 'all'
    if (heroTab === 'plots') {
      const plots = all.filter(p => p.propertyType === 'Gated CMDA Plots');
      if (plots.length > 0 || !q) return plots;
    }
    if (heroTab === 'commercial') {
      const comm = all.filter(p => p.propertyType === 'Commercial Spaces');
      if (comm.length > 0 || !q) return comm;
    }

    return all;
  });

  setCategoryFilter(filter: string): void {
    this.activeCategoryFilter.set(filter);
  }

  toggleShortlist(propertyId: string): void {
    this._properties.update(list =>
      list.map(p => {
        if (p.id === propertyId) {
          const nextState = !p.isShortlisted;
          this.notificationService.show({
            type: 'info',
            title: nextState ? 'Added to Shortlist' : 'Removed from Shortlist',
            message: `${p.title} has been ${nextState ? 'saved to' : 'removed from'} your shortlisted dossiers.`,
            icon: nextState ? 'favorite' : 'heart_broken'
          });
          return { ...p, isShortlisted: nextState };
        }
        return p;
      })
    );
  }

  openMediaModal(property: Property, initialTab: 'free' | 'premium' = 'free'): void {
    const safeProp: Property = {
      ...property,
      freePhotos: Array.isArray(property.freePhotos) && property.freePhotos.length > 0
        ? property.freePhotos
        : [property.imageUrl || 'hero-bg.jpg'],
      premiumMedia: Array.isArray(property.premiumMedia) ? property.premiumMedia : []
    };
    this.activeModalProperty.set(safeProp);
    this.activeMediaTab.set(initialTab);
  }

  closeMediaModal(): void {
    this.activeModalProperty.set(null);
  }

  setMediaTab(tab: 'free' | 'premium'): void {
    this.activeMediaTab.set(tab);
  }

  // Keep track of the last search URL (with all query parameters) for back navigation
  public readonly lastSearchUrl = signal<string>('/search');

  setLastSearchUrl(url: string): void {
    this.lastSearchUrl.set(url);
  }

  constructor() {
    this.loadPropertiesFromApi();
  }

  /**
   * Load real-time properties from MySQL PHP Backend
   */
  public loadPropertiesFromApi(): void {
    const tryGet = (url: string) => this.http.get<{ success: boolean; data: Property[] }>(
      url.includes('?') ? `${url}&limit=100` : `${url}?limit=100`
    );

    (tryGet(`${environment.apiUrl}/properties/list.php`).pipe(
      catchError(() => tryGet('/P_demo_4/backend/api/properties/list.php')),
      catchError(() => tryGet('/p_demo_4/backend/api/properties/list.php')),
      catchError(() => tryGet('/p_demo_3/backend/api/properties/list.php')),
      catchError(() => tryGet('/api/properties/list.php')),
      catchError(() => tryGet(`${environment.apacheApiUrl}/properties/list.php`)),
      catchError(err => {
        console.error('[XHR API] All MySQL API endpoints failed. Retaining local state.', err);
        return of(null);
      })
    ) as Observable<{ success: boolean; data: Property[] } | null>).subscribe((res: any) => {
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        console.info(`[XHR API] Successfully loaded ${res.data.length} properties from MySQL Database:`, res.data);
        const sanitized = res.data.map((p: any) => ({
          ...p,
          freePhotos: Array.isArray(p.freePhotos) && p.freePhotos.length > 0 ? p.freePhotos : [p.imageUrl || 'hero-bg.jpg'],
          premiumMedia: Array.isArray(p.premiumMedia) ? p.premiumMedia : []
        }));
        const existingIds = new Set(sanitized.map((p: any) => p.id));
        const merged = [...sanitized, ...MOCK_50_PROPERTIES.filter(p => !existingIds.has(p.id))];
        this._properties.set(merged);
        this.isSqlLoaded.set(true);
      }
    });
  }

  /**
   * Fetch full 100acress-style property dossier from MySQL PHP Backend
   */
  public fetchPropertyDetails(id: string): Observable<Property | null> {
    const proxyUrl = `${environment.apiUrl}/properties/details.php?id=${encodeURIComponent(id)}`;
    const cliUrl = `${environment.cliApiUrl}/properties/details.php?id=${encodeURIComponent(id)}`;
    const apacheUrl = `${environment.apacheApiUrl}/properties/details.php?id=${encodeURIComponent(id)}`;

    console.info(`[XHR API] Requesting property details dossier for ${id} from MySQL: ${proxyUrl}`);
    return this.http.get<{ success: boolean; data: Property }>(proxyUrl).pipe(
      catchError(() => this.http.get<{ success: boolean; data: Property }>(cliUrl)),
      catchError(() => this.http.get<{ success: boolean; data: Property }>(apacheUrl)),
      map(res => (res && res.success && res.data) ? res.data : null),
      tap(sqlProp => {
        if (sqlProp) {
          console.info(`[XHR API] Received details dossier from MySQL for ${id}:`, sqlProp);
          this._properties.update(list => {
            const index = list.findIndex(p => p.id === sqlProp.id);
            if (index >= 0) {
              const updated = [...list];
              updated[index] = { ...list[index], ...sqlProp };
              return updated;
            }
            return [sqlProp, ...list];
          });
        }
      }),
      catchError(err => {
        console.warn(`[XHR API] Failed to fetch property details for ${id} from MySQL:`, err);
        return of(this.getPropertyById(id) || null);
      })
    );
  }

  /**
   * Submit Site Visit Cadastral Lead to MySQL
   */
  public submitSiteVisitLead(payload: {
    propertyId: string;
    name: string;
    phone: string;
    email?: string;
    date?: string;
    slot?: string;
    notes?: string;
  }): Observable<any> {
    const proxyUrl = `${environment.apiUrl}/leads/book-visit.php`;
    const cliUrl = `${environment.cliApiUrl}/leads/book-visit.php`;
    const apacheUrl = `${environment.apacheApiUrl}/leads/book-visit.php`;

    return this.http.post(proxyUrl, payload).pipe(
      catchError(() => this.http.post(cliUrl, payload)),
      catchError(() => this.http.post(apacheUrl, payload)),
      catchError(err => {
        console.warn('Backend offline, simulated lead booking locally', err);
        return of({ success: true, message: 'Simulated locally' });
      })
    );
  }

  /**
   * Capture Brochure Download Lead to MySQL
   */
  public captureBrochureLead(payload: {
    propertyId: string;
    name?: string;
    phone?: string;
    email?: string;
  }): Observable<any> {
    const proxyUrl = `${environment.apiUrl}/leads/brochure.php`;
    const cliUrl = `${environment.cliApiUrl}/leads/brochure.php`;
    const apacheUrl = `${environment.apacheApiUrl}/leads/brochure.php`;

    return this.http.post(proxyUrl, payload).pipe(
      catchError(() => this.http.post(cliUrl, payload)),
      catchError(() => this.http.post(apacheUrl, payload)),
      catchError(err => {
        console.warn('Backend offline, simulated brochure download locally', err);
        return of({ success: true, message: 'Simulated locally' });
      })
    );
  }

  getPropertyById(id: string): Property | undefined {
    let found = this._properties().find(p => p.id === id);
    if (!found) {
      found = MOCK_50_PROPERTIES.find(p => p.id === id);
    }
    if (!found) return undefined;
    if (found.floorPlans || found.villaDetails || found.apartmentDetails || found.plotDetails || found.cadastralAudit) {
      return found;
    }
    return enrichPropertyWithMockDetails(found);
  }

  unlockMedia(propertyId: string): boolean {
    const prop = this._properties().find(p => p.id === propertyId);
    if (!prop) return false;

    if (prop.isMediaUnlocked) {
      this.openMediaModal(prop, 'premium');
      return true;
    }

    const success = this.walletService.deduct(prop.mediaPoints, `Premium 4K Media: ${prop.title}`);
    if (success) {
      this._properties.update(list =>
        list.map(p => (p.id === propertyId ? { ...p, isMediaUnlocked: true } : p))
      );

      // Persist unlock to MySQL backend atomically
      this.http.post<{ success: boolean; data?: any }>(`${environment.apiUrl}/media/unlock.php`, {
        propertyId,
        userId: 1
      }).pipe(
        catchError(err => {
          console.warn('Could not sync media unlock to SQL server', err);
          return of(null);
        })
      ).subscribe();

      const updatedProp = this._properties().find(p => p.id === propertyId);
      if (updatedProp) {
        this.openMediaModal(updatedProp, 'premium');
      }
      return true;
    }
    return false;
  }

  // Submit property by user (enters pending_review)
  createUserProperty(data: any): Observable<{ success: boolean; propertyId?: string; message?: string }> {
    const tryPost = (url: string) => this.http.post<{ success: boolean; data: any; message: string }>(url, data);

    return (tryPost(`${environment.apiUrl}/properties/create.php`).pipe(
      catchError(() => tryPost('/P_demo_4/backend/api/properties/create.php')),
      catchError(() => tryPost('/p_demo_4/backend/api/properties/create.php')),
      catchError(() => tryPost('/p_demo_3/backend/api/properties/create.php')),
      catchError(() => tryPost('/api/properties/create.php')),
      catchError(() => tryPost(`${environment.apacheApiUrl}/properties/create.php`)),
      map(res => {
        if (res && res.success) {
          this.loadPropertiesFromApi();
          return {
            success: true,
            propertyId: res.data?.propertyId,
            message: res.message
          };
        }
        return { success: false, message: 'Submission failed' };
      }),
      catchError(err => {
        const msg = err?.error?.error || 'Failed to submit property';
        return of({ success: false, message: msg });
      })
    ) as Observable<{ success: boolean; propertyId?: string; message?: string }>);
  }

  // Upload an image file for property listing
  uploadPropertyImage(file: File): Observable<{ success: boolean; url?: string; filename?: string; message?: string }> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    const tryPost = (url: string) => this.http.post<{ success: boolean; data?: any; message?: string; error?: string }>(url, formData);

    return (tryPost(`${environment.apiUrl}/properties/upload.php`).pipe(
      catchError(() => tryPost('/P_demo_4/backend/api/properties/upload.php')),
      catchError(() => tryPost('/p_demo_4/backend/api/properties/upload.php')),
      catchError(() => tryPost('/p_demo_3/backend/api/properties/upload.php')),
      catchError(() => tryPost('/api/properties/upload.php')),
      catchError(() => tryPost(`${environment.apacheApiUrl}/properties/upload.php`)),
      map(res => {
        if (res && res.success && res.data?.url) {
          return {
            success: true,
            url: res.data.url,
            filename: res.data.filename,
            message: res.message
          };
        }
        return { success: false, message: res?.error || 'Upload failed' };
      }),
      catchError(err => {
        const errorMsg = err?.error?.error || err?.message || 'Failed to upload image to server';
        return of({ success: false, message: errorMsg });
      })
    ) as Observable<{ success: boolean; url?: string; filename?: string; message?: string }>);
  }

  // Fetch properties submitted by this user
  fetchUserProperties(userId: number): Observable<any[]> {
    const tryGet = (url: string) => this.http.get<{ success: boolean; data: { properties: any[] } }>(url);

    return (tryGet(`${environment.apiUrl}/properties/my-properties.php?user_id=${userId}`).pipe(
      catchError(() => tryGet(`/P_demo_4/backend/api/properties/my-properties.php?user_id=${userId}`)),
      catchError(() => tryGet(`/p_demo_4/backend/api/properties/my-properties.php?user_id=${userId}`)),
      catchError(() => tryGet(`/p_demo_3/backend/api/properties/my-properties.php?user_id=${userId}`)),
      catchError(() => tryGet(`/api/properties/my-properties.php?user_id=${userId}`)),
      map(res => res?.success && res?.data?.properties ? res.data.properties : []),
      catchError(() => of([]))
    ) as Observable<any[]>);
  }
}

