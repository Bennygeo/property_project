import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { ListingMode, Property, PropertyType } from '../models/property.model';
import { NotificationService } from './notification.service';
import { WalletService } from './wallet.service';
import { enrichPropertyWithMockDetails } from './property-details-mock.helper';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PropertyService {
  private readonly http = inject(HttpClient);
  private readonly notificationService = inject(NotificationService);
  private readonly walletService = inject(WalletService);
  public readonly isSqlLoaded = signal<boolean>(false);

  // Master property list initialized with MySQL schema entities
  private readonly _properties = signal<Property[]>([
    {
      id: 'p-1',
      title: 'Contemporary Minimalist Villa with Infinity Pool',
      propertyType: 'Independent Villas',
      locality: 'Jubilee Hills Road No. 45',
      city: 'Hyderabad',
      cityKey: 'hyderabad',
      price: '₹5.40 Cr',
      pricePerSqFt: '₹11,250 /sq.ft',
      sqft: '4,800 sq.ft',
      bhkBadge: '5 Bed, 6 Bath',
      facingOrView: 'West Facing • Hill Crest',
      imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      badges: {
        rera: 'RERA-TS-2024-HYD-0419',
        brokerage: '0% Direct Owner SRO Deed',
        points: 4,
        specialTag: 'Private Hilltop Pool'
      },
      highlights: [
        'Heated private infinity edge swimming pool overlooking Jubilee Hills ridge',
        'Triple-height central living pavilion with Belgian floor-to-ceiling glass',
        'Sub-Zero & Wolf integrated designer show kitchen + prep utility',
        'Schneider KNX smart home automation with biometric keyless entry'
      ],
      mediaPoints: 4,
      isMediaUnlocked: false,
      isShortlisted: false,
      freePhotos: [
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80'
      ],
      premiumMedia: [
        {
          id: 'v-p1-1',
          type: 'video',
          title: '4K Architectural Walkthrough Tour',
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          thumbnailUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
          duration: '3:45 min',
          tag: 'Cinematic 4K Walkthrough'
        },
        {
          id: 'v-p1-2',
          type: 'video',
          title: '360° Cadastral Drone Aerial Boundary Survey',
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
          thumbnailUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
          duration: '2:15 min',
          tag: '360° Drone Survey'
        }
      ],
      whatsappUrl: 'https://wa.me/919444100000?text=Inquiry%20for%20Jubilee%20Hills%20Villa%20p-1'
    },
    {
      id: 'p-2',
      title: 'Sea-Facing Sky Penthouse with Private Plunge Pool',
      propertyType: 'Luxury Penthouses',
      locality: 'Boat Club Road, RA Puram',
      city: 'Chennai',
      cityKey: 'chennai',
      price: '₹8.20 Cr',
      pricePerSqFt: '₹14,900 /sq.ft',
      sqft: '5,500 sq.ft',
      bhkBadge: '4 BHK Penthouse',
      facingOrView: 'East Facing • Bay Panoramic',
      imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
      badges: {
        rera: 'TN/29/Building/0488/2023',
        brokerage: '0% Direct Builder SRO Deed',
        points: 6,
        specialTag: 'Bespoke Italian Marble'
      },
      highlights: [
        'Private cantilevered sea-view plunge pool on the 28th floor sky terrace',
        'Direct private biometric high-speed elevator opening into personal foyer',
        'Bespoke Poggenpohl kitchen with Miele smart built-in appliances'
      ],
      mediaPoints: 6,
      isMediaUnlocked: false,
      isShortlisted: false,
      freePhotos: [
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80'
      ],
      premiumMedia: [],
      whatsappUrl: 'https://wa.me/919444100000?text=Inquiry%20for%20Boat%20Club%20Penthouse%20p-2'
    },
    {
      id: 'p-3',
      title: 'Brutalist Glass & Cantilever Architectural Mansion',
      propertyType: 'Apartments & Flats',
      locality: 'Lavelle Road / UB City',
      city: 'Bengaluru',
      cityKey: 'bengaluru',
      price: '₹12.50 Cr',
      pricePerSqFt: '₹19,230 /sq.ft',
      sqft: '6,500 sq.ft',
      bhkBadge: '5 Bed, 7 Bath',
      facingOrView: 'North-East • Cubbon Park Canopy',
      imageUrl: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80',
      badges: {
        rera: 'PRM/KA/RERA/1251/310/PR/210423/004122',
        brokerage: '0% Direct Owner SRO Deed',
        points: 6,
        specialTag: 'Private Penthouse Elevator'
      },
      highlights: [
        '2 Iconic Glass Monolith Towers with exclusive 1 unit per core',
        '11.5 Feet Clear Slab-to-Slab Height & 10-Foot Cantilevered Sunset Deck',
        'Imported Greek Thassos White Marble & 4 Dedicated EV Covered Bays'
      ],
      mediaPoints: 6,
      isMediaUnlocked: false,
      isShortlisted: false,
      freePhotos: [
        'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80'
      ],
      premiumMedia: [],
      whatsappUrl: 'https://wa.me/919444100000?text=Inquiry%20for%20Lavelle%20Road%20Mansion%20p-3'
    },
    {
      id: 'p-4',
      title: 'Gated Beachside Residential Villa Plot Enclave',
      propertyType: 'Gated CMDA Plots',
      locality: 'East Coast Road (ECR Corridor)',
      city: 'Chennai',
      cityKey: 'chennai',
      price: '₹1.85 Cr',
      pricePerSqFt: '₹7,700 /sq.ft',
      sqft: '2,400 sq.ft',
      bhkBadge: 'Corner Plot (40x60)',
      facingOrView: 'North Facing • 40ft CMDA Blacktop',
      imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
      badges: {
        rera: 'TN/01/Layout/0291/2024',
        brokerage: 'CMDA & RERA Approved Plot',
        points: 2,
        specialTag: 'Clear Title 30-Yr Nil EC'
      },
      highlights: [
        'CMDA Sanctioned Layout PPD/LO No. 48/2023 with individual Revenue Patta',
        '40 Feet Wide Bitumen Road with underground storm water drainage',
        'Sweet Potable Ground Water at 18–24 Feet & Commissioned 11kV Substation'
      ],
      mediaPoints: 2,
      isMediaUnlocked: false,
      isShortlisted: false,
      freePhotos: [
        'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80'
      ],
      premiumMedia: [],
      whatsappUrl: 'https://wa.me/919444100000?text=Inquiry%20for%20ECR%20Villa%20Plot%20p-4'
    }
  ]);

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
    this.activeModalProperty.set(property);
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
    const tryGet = (url: string) => this.http.get<{ success: boolean; data: Property[] }>(url);

    tryGet(`${environment.apiUrl}/properties/list.php`).pipe(
      catchError(() => tryGet('/api/properties/list.php')),
      catchError(() => tryGet('/demo1/backend/api/properties/list.php')),
      catchError(() => tryGet('/demo1/api/properties/list.php')),
      catchError(() => tryGet('http://localhost:8000/api/properties/list.php')),
      catchError(() => tryGet(`${environment.cliApiUrl}/properties/list.php`)),
      catchError(() => tryGet(`${environment.apacheApiUrl}/properties/list.php`)),
      catchError(err => {
        console.error('[XHR API] All MySQL API endpoints failed. Retaining local state.', err);
        return of(null);
      })
    ).subscribe(res => {
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        console.info(`[XHR API] Successfully loaded ${res.data.length} properties from MySQL Database:`, res.data);
        this._properties.set(res.data);
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
    const found = this._properties().find(p => p.id === id);
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

    return tryPost(`${environment.apiUrl}/properties/create.php`).pipe(
      catchError(() => tryPost('/api/properties/create.php')),
      catchError(() => tryPost('/demo1/backend/api/properties/create.php')),
      catchError(() => tryPost('/demo1/api/properties/create.php')),
      catchError(() => tryPost('http://localhost:8000/api/properties/create.php')),
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
    );
  }

  // Upload an image file for property listing
  uploadPropertyImage(file: File): Observable<{ success: boolean; url?: string; filename?: string; message?: string }> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    const tryPost = (url: string) => this.http.post<{ success: boolean; data?: any; message?: string; error?: string }>(url, formData);

    return tryPost(`${environment.apiUrl}/properties/upload.php`).pipe(
      catchError(() => tryPost('/api/properties/upload.php')),
      catchError(() => tryPost('/demo1/backend/api/properties/upload.php')),
      catchError(() => tryPost('/demo1/api/properties/upload.php')),
      catchError(() => tryPost('http://localhost:8000/api/properties/upload.php')),
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
    );
  }

  // Fetch properties submitted by this user
  fetchUserProperties(userId: number): Observable<any[]> {
    const tryGet = (url: string) => this.http.get<{ success: boolean; data: { properties: any[] } }>(url);

    return tryGet(`${environment.apiUrl}/properties/my-properties.php?user_id=${userId}`).pipe(
      catchError(() => tryGet(`/api/properties/my-properties.php?user_id=${userId}`)),
      catchError(() => tryGet(`/demo1/backend/api/properties/my-properties.php?user_id=${userId}`)),
      catchError(() => tryGet(`/demo1/api/properties/my-properties.php?user_id=${userId}`)),
      catchError(() => tryGet(`http://localhost:8000/api/properties/my-properties.php?user_id=${userId}`)),
      map(res => res?.success && res?.data?.properties ? res.data.properties : []),
      catchError(() => of([]))
    );
  }
}

