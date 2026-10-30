import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { ListingMode, Property, PropertyType } from '../models/property.model';
import { validateGpsData, annotateInterPropertyProximity } from '../utils/gps-helper';
import { NotificationService } from './notification.service';
import { WalletService } from './wallet.service';
import { enrichPropertyWithMockDetails } from './property-details-mock.helper';
import { MOCK_50_PROPERTIES } from './mock-properties-data';
import { environment } from '../../../environments/environment';

export interface NearbyLocality {
  name: string;
  city: string;
  taluk: string;
  district: string;
  propertyCount: number;
  minPrice: string;
  distanceTag: string;
  isSameTaluk?: boolean;
}

export interface NearbyDataResult {
  targetLocality?: string;
  targetDistrict?: string;
  targetTaluk?: string;
  targetCity?: string;
  nearbyLocalities: NearbyLocality[];
  nearbyProperties: Property[];
}

export interface DistrictItem {
  name: string;
  propertyCount: number;
  topLocalities?: string[];
  isMainHub?: boolean;
  region?: string;
}

export interface DistrictHubItem {
  name: string;
  propertyCount: number;
  isMainHub: boolean;
  region: string;
}

export interface RegionalGroupItem {
  regionName: string;
  districts: DistrictHubItem[];
}

export interface DistrictsResponse {
  success: boolean;
  mainHubs: DistrictHubItem[];
  regionalGroups: RegionalGroupItem[];
  allDistricts: DistrictHubItem[];
}

export interface LoadPropertiesParams {
  offset?: number;
  limit?: number;
  append?: boolean;
  q?: string;
  localities?: string[];
  cityKey?: string;
  district?: string;
  propertyType?: string;
  developer?: string;
  mode?: string;
  sort?: string;
  lat?: number;
  lng?: number;
  radius?: number;
}

export interface ReverseGeocodeResult {
  displayName: string;
  compactTitle: string;
  name?: string;
  road?: string;
  locality: string;
  city: string;
  district?: string;
  state?: string;
  postcode?: string;
  latitude: number;
  longitude: number;
}

@Injectable({
  providedIn: 'root'
})
export class PropertyService {
  private readonly http = inject(HttpClient);
  private readonly notificationService = inject(NotificationService);
  private readonly walletService = inject(WalletService);
  public readonly isSqlLoaded = signal<boolean>(false);
  public readonly totalApiProperties = signal<number>(0);
  public readonly isFetchingApi = signal<boolean>(false);
  public readonly suggestedProperties = signal<Property[]>(annotateInterPropertyProximity(MOCK_50_PROPERTIES.slice(0, 8)));
  public readonly hasMoreApiProperties = computed(() => {
    return this._properties().length < this.totalApiProperties();
  });

  // Master property list initialized with 50+ mock properties directly from database (10L to 3Cr)
  private readonly _properties = signal<Property[]>(MOCK_50_PROPERTIES);

  // Active search criteria
  public readonly activeTab = signal<ListingMode>('buy');
  public readonly selectedCity = signal<string>('all');
  public readonly searchQuery = signal<string>('');
  public readonly selectedPropertyType = signal<string>('all');
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
   * Load real-time properties from MySQL PHP Backend with API-level pagination (offset & limit)
   */
  public loadPropertiesFromApi(params?: LoadPropertiesParams): void {
    const offset = params?.offset ?? 0;
    const limit = params?.limit ?? (offset === 0 ? 20 : 10);
    const append = params?.append ?? (offset > 0);

    const qParams = new URLSearchParams();
    qParams.set('limit', String(limit));
    qParams.set('offset', String(offset));
    if (params?.q) qParams.set('q', params.q.trim());
    if (params?.localities && params.localities.length > 0) {
      qParams.set('localities', params.localities.join(','));
    }
    if (params?.cityKey && params.cityKey !== 'all') qParams.set('cityKey', params.cityKey.trim());
    if (params?.district && params.district !== 'all') qParams.set('district', params.district.trim());
    if (params?.propertyType && params.propertyType !== 'all') qParams.set('propertyType', params.propertyType.trim());
    if (params?.developer && params.developer !== 'all') qParams.set('developer', params.developer.trim());
    if (params?.mode && params.mode !== 'all') qParams.set('mode', params.mode.trim());
    if (params?.sort) qParams.set('sort', params.sort.trim());
    if (params?.lat !== undefined && params?.lng !== undefined) {
      qParams.set('lat', String(params.lat));
      qParams.set('lng', String(params.lng));
      if (params.radius !== undefined) {
        qParams.set('radius', String(params.radius));
      }
    }

    const qs = qParams.toString();
    this.isFetchingApi.set(true);

    const tryGet = (baseUrl: string) => {
      const sep = baseUrl.includes('?') ? '&' : '?';
      return this.http.get<{ success: boolean; data: any }>(baseUrl + sep + qs);
    };

    (tryGet(environment.apiUrl + '/properties/list.php').pipe(
      catchError(() => tryGet('/P_demo_4/backend/api/properties/list.php')),
      catchError(() => tryGet('/p_demo_4/backend/api/properties/list.php')),
      catchError(() => tryGet('/p_demo_3/backend/api/properties/list.php')),
      catchError(() => tryGet('/api/properties/list.php')),
      catchError(() => tryGet(environment.apacheApiUrl + '/properties/list.php')),
      catchError(err => {
        console.error('[XHR API] All MySQL API endpoints failed. Retaining local state.', err);
        this.isFetchingApi.set(false);
        return of(null);
      })
    ) as Observable<{ success: boolean; data: any } | null>).subscribe((res: any) => {
      this.isFetchingApi.set(false);
      if (res && res.success) {
        const rawList = Array.isArray(res.data) 
          ? res.data 
          : (Array.isArray(res.data?.properties) ? res.data.properties : []);
        const total = typeof res.data?.total === 'number' ? res.data.total : rawList.length;
        this.totalApiProperties.set(total);

        const mockImages = [
          'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
          'https://www.gobroker.co.in/uploads/amenities_image/banner27.png',
          'https://images.unsplash.com/photo-1500076656116-558758c991c1?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1524813686514-a57563d77d61?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1592595896551-12b371d546d5?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80'
        ];

        if (rawList.length > 0 || !append) {

          const sanitized = rawList.map((p: any, idx: number) => {
            const globalIdx = offset + idx;
            const gpsRes = validateGpsData(p.googleMapsLink || p.masterDetails?.googleMapsLink || p.interactiveMapUrl);
            const fallbackMain = mockImages[globalIdx % mockImages.length];
            const resolvedImg = (p.imageUrl && typeof p.imageUrl === 'string' && p.imageUrl.startsWith('http')) 
              ? p.imageUrl 
              : fallbackMain;
            const resolvedPhotos = (Array.isArray(p.freePhotos) && p.freePhotos.length > 0 && p.freePhotos[0]?.startsWith('http'))
              ? p.freePhotos
              : [resolvedImg, mockImages[(globalIdx + 1) % mockImages.length], mockImages[(globalIdx + 2) % mockImages.length]];

            return {
              ...p,
              imageUrl: resolvedImg,
              freePhotos: resolvedPhotos,
              isGpsValid: p.isGpsValid !== undefined ? p.isGpsValid : gpsRes.isValid,
              gpsErrorReason: gpsRes.reason,
              gpsFormatted: gpsRes.formattedText,
              latitude: p.latitude !== undefined && p.latitude !== null ? p.latitude : gpsRes.coordinates?.latitude,
              longitude: p.longitude !== undefined && p.longitude !== null ? p.longitude : gpsRes.coordinates?.longitude,
              distanceKm: p.distanceKm !== undefined ? p.distanceKm : undefined,
              isClosestProximity: p.isClosestProximity !== undefined ? p.isClosestProximity : ((p.distanceKm !== undefined && p.distanceKm <= 5.0) ? true : undefined),
              premiumMedia: Array.isArray(p.premiumMedia) && p.premiumMedia.length > 0 ? p.premiumMedia : [
                {
                  id: 'v-' + p.id,
                  type: 'video',
                  title: '4K Architectural Walkthrough',
                  url: 'https://www.w3schools.com/html/mov_bbb.mp4',
                  thumbnailUrl: resolvedImg,
                  duration: '02:30 min',
                  tag: '4K Video Tour'
                },
                {
                  id: 'v-' + p.id + '-drone',
                  type: 'drone',
                  title: '360° Drone Aerial Survey',
                  url: 'https://iframe.videodelivery.net/5d5ba37ff33a0b8d5d3c3763b71e5e85',
                  thumbnailUrl: resolvedPhotos[1] || resolvedImg,
                  duration: '03:10 min',
                  tag: 'Drone Survey'
                }
              ]
            };
          });

          if (append) {
            this._properties.update(existing => {
              const existingIds = new Set(existing.map(p => p.id));
              const newOnly = sanitized.filter((p: Property) => !existingIds.has(p.id));
              const merged = [...existing, ...newOnly];
              return annotateInterPropertyProximity(merged);
            });
          } else {
            this._properties.set(annotateInterPropertyProximity(sanitized));
          }
        } else if (!append) {
          this._properties.set([]);
        }

        // Process suggested properties returned when total === 0
        const rawSuggested = Array.isArray(res.data?.suggested) ? res.data.suggested : [];
        if (rawSuggested.length > 0) {
          const sanitizedSuggested = rawSuggested.map((p: any, idx: number) => {
            const gpsRes = validateGpsData(p.googleMapsLink || p.masterDetails?.googleMapsLink || p.interactiveMapUrl);
            const fallbackMain = mockImages[idx % mockImages.length];
            const resolvedImg = (p.imageUrl && typeof p.imageUrl === 'string' && p.imageUrl.startsWith('http')) 
              ? p.imageUrl 
              : fallbackMain;
            const resolvedPhotos = (Array.isArray(p.freePhotos) && p.freePhotos.length > 0 && p.freePhotos[0]?.startsWith('http'))
              ? p.freePhotos
              : [resolvedImg, mockImages[(idx + 1) % mockImages.length], mockImages[(idx + 2) % mockImages.length]];

            return {
              ...p,
              imageUrl: resolvedImg,
              freePhotos: resolvedPhotos,
              isGpsValid: p.isGpsValid !== undefined ? p.isGpsValid : gpsRes.isValid,
              gpsErrorReason: gpsRes.reason,
              gpsFormatted: gpsRes.formattedText,
              latitude: p.latitude !== undefined && p.latitude !== null ? p.latitude : gpsRes.coordinates?.latitude,
              longitude: p.longitude !== undefined && p.longitude !== null ? p.longitude : gpsRes.coordinates?.longitude,
              distanceKm: p.distanceKm !== undefined ? p.distanceKm : undefined,
              isClosestProximity: p.isClosestProximity !== undefined ? p.isClosestProximity : ((p.distanceKm !== undefined && p.distanceKm <= 5.0) ? true : undefined),
              isSuggested: true
            };
          });
          this.suggestedProperties.set(annotateInterPropertyProximity(sanitizedSuggested));
        } else if (total === 0) {
          this.suggestedProperties.set(annotateInterPropertyProximity(MOCK_50_PROPERTIES.slice(0, 8)));
        }

        this.isSqlLoaded.set(true);
      }
    });
  }

  /**
   * Fetch live clean suggestions from MySQL database, targeted by selected district
   */
  public fetchSuggestions(query: string, district?: string): Observable<any[]> {
    const q = query.trim();
    let qs = 'q=' + encodeURIComponent(q);
    if (district && district.trim()) {
      qs += '&district=' + encodeURIComponent(district.trim());
    }
    const tryGet = (baseUrl: string) => this.http.get<{ success: boolean; data: any }>(baseUrl + '?' + qs);
    return (tryGet(environment.apiUrl + '/geo/suggest.php').pipe(
      catchError(() => tryGet('/P_demo_4/backend/api/geo/suggest.php')),
      catchError(() => tryGet('/p_demo_4/backend/api/geo/suggest.php')),
      catchError(() => tryGet('/api/geo/suggest.php')),
      catchError(() => tryGet(environment.apacheApiUrl + '/geo/suggest.php')),
      catchError(err => {
        return of({ success: false, data: { suggestions: [] } });
      })
    ) as Observable<{ success: boolean; data: any }>).pipe(
      map(res => {
        if (res && res.success && res.data && Array.isArray(res.data.suggestions)) {
          return res.data.suggestions;
        }
        return [];
      })
    );
  }

  /**
   * Fetch Google Places Autocomplete suggestions using Google Places API (New)
   */
  public fetchGooglePlaces(query: string, district?: string): Observable<any[]> {
    const q = query.trim();
    if (q.length < 2) return of([]);
    let qs = 'action=autocomplete&input=' + encodeURIComponent(q);
    if (district && district.trim()) {
      qs += '&district=' + encodeURIComponent(district.trim());
    }
    const tryGet = (baseUrl: string) => this.http.get<{ success: boolean; suggestions: any[] }>(baseUrl + '?' + qs);
    return (tryGet(environment.apiUrl + '/geo/places.php').pipe(
      catchError(() => tryGet('/P_demo_4/backend/api/geo/places.php')),
      catchError(() => tryGet('/p_demo_4/backend/api/geo/places.php')),
      catchError(() => tryGet('/api/geo/places.php')),
      catchError(() => tryGet(environment.apacheApiUrl + '/geo/places.php')),
      catchError(err => {
        return of({ success: false, suggestions: [] });
      })
    ) as Observable<{ success: boolean; suggestions: any[] }>).pipe(
      map(res => {
        if (res && res.success && Array.isArray(res.suggestions)) {
          return res.suggestions;
        }
        return [];
      })
    );
  }

  /**
   * Fetch Google Place Details (exact coordinates and address) by placeId
   */
  public fetchGooglePlaceDetails(placeId: string): Observable<{ latitude?: number; longitude?: number; formattedAddress?: string; displayName?: string } | null> {
    const tryGet = (baseUrl: string) => this.http.get<{ success: boolean; data: any }>(baseUrl + '?action=details&placeId=' + encodeURIComponent(placeId));
    return (tryGet(environment.apiUrl + '/geo/places.php').pipe(
      catchError(() => tryGet('/P_demo_4/backend/api/geo/places.php')),
      catchError(() => tryGet('/p_demo_4/backend/api/geo/places.php')),
      catchError(() => tryGet('/api/geo/places.php')),
      catchError(() => tryGet(environment.apacheApiUrl + '/geo/places.php')),
      catchError(() => of({ success: false, data: null }))
    ) as Observable<{ success: boolean; data: any }>).pipe(
      map(res => (res && res.success && res.data) ? res.data : null)
    );
  }

  /**
   * Fetch nearby locality areas and nearby properties based on current locality, taluk, district or property
   */
  public fetchNearbyData(params?: { locality?: string; district?: string; taluk?: string; city?: string; propertyId?: string }): Observable<NearbyDataResult> {
    const qParams = new URLSearchParams();
    if (params?.locality) qParams.set('locality', params.locality);
    if (params?.district) qParams.set('district', params.district);
    if (params?.taluk) qParams.set('taluk', params.taluk);
    if (params?.city) qParams.set('city', params.city);
    if (params?.propertyId) qParams.set('propertyId', params.propertyId);

    const qs = qParams.toString();
    const tryGet = (baseUrl: string) => this.http.get<{ success: boolean; targetLocality?: string; targetDistrict?: string; targetTaluk?: string; targetCity?: string; nearbyLocalities: NearbyLocality[]; nearbyProperties?: Property[] }>(baseUrl + (qs ? '?' + qs : ''));

    return (tryGet(environment.apiUrl + '/geo/nearby.php').pipe(
      catchError(() => tryGet('/P_demo_4/backend/api/geo/nearby.php')),
      catchError(() => tryGet('/p_demo_4/backend/api/geo/nearby.php')),
      catchError(() => tryGet('/api/geo/nearby.php')),
      catchError(() => tryGet(environment.apacheApiUrl + '/geo/nearby.php')),
      catchError(err => of({ success: false, nearbyLocalities: [], nearbyProperties: [] }))
    ) as Observable<{ success: boolean; targetLocality?: string; targetDistrict?: string; targetTaluk?: string; targetCity?: string; nearbyLocalities: NearbyLocality[]; nearbyProperties?: Property[] }>).pipe(
      map(res => {
        if (res && res.success) {
          const locs = Array.isArray(res.nearbyLocalities) ? res.nearbyLocalities : [];
          const props = Array.isArray(res.nearbyProperties) ? res.nearbyProperties : [];
          return {
            targetLocality: res.targetLocality,
            targetDistrict: res.targetDistrict,
            targetTaluk: res.targetTaluk,
            targetCity: res.targetCity,
            nearbyLocalities: locs,
            nearbyProperties: annotateInterPropertyProximity(props)
          };
        }
        return { nearbyLocalities: [], nearbyProperties: [] };
      })
    );
  }

  /**
   * Fetch nearby locality areas based on current locality, taluk, district or property
   */
  public fetchNearbyLocalities(params?: { locality?: string; district?: string; taluk?: string; city?: string; propertyId?: string }): Observable<NearbyLocality[]> {
    return this.fetchNearbyData(params).pipe(
      map(res => res.nearbyLocalities)
    );
  }

  /**
   * Fetch available districts and regional groupings directly from database
   */
  public fetchDistricts(): Observable<DistrictsResponse> {
    const tryGet = (baseUrl: string) => this.http.get<DistrictsResponse>(baseUrl);
    return (tryGet(environment.apiUrl + '/geo/districts.php').pipe(
      catchError(() => tryGet('/P_demo_4/backend/api/geo/districts.php')),
      catchError(() => tryGet('/p_demo_4/backend/api/geo/districts.php')),
      catchError(() => tryGet('/api/geo/districts.php')),
      catchError(() => tryGet(environment.apacheApiUrl + '/geo/districts.php')),
      catchError(() => of({ success: false, mainHubs: [], regionalGroups: [], allDistricts: [] }))
    ) as Observable<DistrictsResponse>).pipe(
      map(res => {
        if (res && res.success) {
          return {
            success: true,
            mainHubs: Array.isArray(res.mainHubs) ? res.mainHubs : [],
            regionalGroups: Array.isArray(res.regionalGroups) ? res.regionalGroups : [],
            allDistricts: Array.isArray(res.allDistricts) ? res.allDistricts : []
          };
        }
        return { success: false, mainHubs: [], regionalGroups: [], allDistricts: [] };
      })
    );
  }

  /**
   * Fetch list of all builders/developers from database
   */
  public fetchBuilders(): Observable<{ name: string; propertyCount: number }[]> {
    const tryGet = (baseUrl: string) => this.http.get<{ success: boolean; data: any }>(baseUrl);
    return (tryGet(environment.apiUrl + '/builders/list.php').pipe(
      catchError(() => tryGet('/P_demo_4/backend/api/builders/list.php')),
      catchError(() => tryGet('/p_demo_4/backend/api/builders/list.php')),
      catchError(() => tryGet('/api/builders/list.php')),
      catchError(() => tryGet(environment.apacheApiUrl + '/builders/list.php')),
      catchError(err => {
        console.error('[Builders API] Failed to fetch builders:', err);
        return of({ success: false, data: { builders: [] } });
      })
    ) as Observable<{ success: boolean; data: any }>).pipe(
      map(res => {
        if (res && res.success && res.data && Array.isArray(res.data.builders)) {
          return res.data.builders;
        }
        return [];
      })
    );
  }

  /**
   * Fetch comprehensive builder profile, master project portfolio, and all properties
   */
  public fetchBuilderDetails(name: string): Observable<{
    developer: any;
    projects: any[];
    properties: Property[];
  } | null> {
    const q = encodeURIComponent(name.trim());
    const tryGet = (baseUrl: string) => this.http.get<{ success: boolean; data: any }>(baseUrl + '?name=' + q);
    return (tryGet(environment.apiUrl + '/builders/details.php').pipe(
      catchError(() => tryGet('/P_demo_4/backend/api/builders/details.php')),
      catchError(() => tryGet('/p_demo_4/backend/api/builders/details.php')),
      catchError(() => tryGet('/api/builders/details.php')),
      catchError(() => tryGet(environment.apacheApiUrl + '/builders/details.php')),
      catchError(err => {
        console.error('[Builder Details API] Failed to fetch builder:', err);
        return of({ success: false, data: null });
      })
    ) as Observable<{ success: boolean; data: any }>).pipe(
      map(res => {
        if (res && res.success && res.data) {
          return res.data;
        }
        return null;
      })
    );
  }

  /**
   * Load next paginated batch from API (default 10 properties)
   */
  public loadNextBatch(limit: number = 10, extraParams?: Partial<LoadPropertiesParams>): void {
    if (this.isFetchingApi() || !this.hasMoreApiProperties()) {
      return;
    }
    const currentOffset = this._properties().length;
    this.loadPropertiesFromApi({
      offset: currentOffset,
      limit: limit,
      append: true,
      ...extraParams
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

  bulkUploadProperties(rows: any[], clearExisting: boolean): Observable<{ success: boolean; message: string; importedCount?: number }> {
    const payload = {
      action: 'import',
      clearExisting,
      properties: rows
    };
    const tryPost = (url: string) => this.http.post<{ success: boolean; data: any; message: string }>(url, payload);

    return tryPost(`${environment.apiUrl}/admin/bulk-upload.php`).pipe(
      catchError(() => tryPost('/P_demo_4/backend/api/admin/bulk-upload.php')),
      catchError(() => tryPost('/p_demo_4/backend/api/admin/bulk-upload.php')),
      catchError(() => tryPost('/p_demo_3/backend/api/admin/bulk-upload.php')),
      catchError(() => tryPost('/api/admin/bulk-upload.php')),
      catchError(() => tryPost(`${environment.apacheApiUrl}/admin/bulk-upload.php`)),
      map(res => {
        if (res && res.success) {
          this.loadPropertiesFromApi();
          return {
            success: true,
            importedCount: res.data?.importedCount || rows.length,
            message: res.message || 'Properties imported successfully'
          };
        }
        return { success: false, message: res?.message || 'Bulk upload failed' };
      })
    );
  }

  clearAllProperties(): Observable<{ success: boolean; message: string }> {
    const payload = { action: 'clear_all' };
    const tryPost = (url: string) => this.http.post<{ success: boolean; message: string }>(url, payload);

    return tryPost(`${environment.apiUrl}/admin/bulk-upload.php`).pipe(
      catchError(() => tryPost('/P_demo_4/backend/api/admin/bulk-upload.php')),
      catchError(() => tryPost('/p_demo_4/backend/api/admin/bulk-upload.php')),
      catchError(() => tryPost('/p_demo_3/backend/api/admin/bulk-upload.php')),
      catchError(() => tryPost('/api/admin/bulk-upload.php')),
      catchError(() => tryPost(`${environment.apacheApiUrl}/admin/bulk-upload.php`)),
      tap(res => {
        if (res && res.success) {
          this._properties.set([]);
        }
      })
    );
  }

  /**
   * Reverse geocodes GPS coordinates into human-readable address with locality & city
   */
  reverseGeocode(lat: number, lon: number): Observable<ReverseGeocodeResult | null> {
    const qs = `lat=${lat}&lon=${lon}`;
    const tryGet = (baseUrl: string) => this.http.get<{ success: boolean; data: ReverseGeocodeResult }>(`${baseUrl}?${qs}`);

    return tryGet(`${environment.apiUrl}/geo/reverse.php`).pipe(
      catchError(() => tryGet('/P_demo_4/backend/api/geo/reverse.php')),
      catchError(() => tryGet('/p_demo_4/backend/api/geo/reverse.php')),
      catchError(() => tryGet('/p_demo_3/backend/api/geo/reverse.php')),
      catchError(() => tryGet('/api/geo/reverse.php')),
      catchError(() => tryGet(`${environment.apacheApiUrl}/geo/reverse.php`)),
      catchError(() => {
        // Direct Nominatim fallback if local backend endpoint fails
        return this.http.get<any>(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`).pipe(
          map(data => {
            if (!data || !data.display_name) return null;
            const addr = data.address || {};
            const loc = addr.suburb || addr.neighbourhood || addr.village || addr.city_district || addr.town || '';
            const city = addr.city || addr.town || addr.state_district || 'Chennai';
            const compactTitle = [data.name, loc, city, addr.postcode].filter(Boolean).join(', ');
            return {
              displayName: data.display_name,
              compactTitle: compactTitle || data.display_name,
              name: data.name || loc,
              locality: loc,
              city: city,
              district: addr.state_district || '',
              state: addr.state || 'Tamil Nadu',
              postcode: addr.postcode || '',
              latitude: lat,
              longitude: lon
            } as ReverseGeocodeResult;
          }),
          catchError(() => of(null))
        );
      }),
      map(res => {
        if (res && (res as any).success && (res as any).data) {
          return (res as any).data as ReverseGeocodeResult;
        }
        return (res as ReverseGeocodeResult) || null;
      })
    );
  }

  /**
   * Searches locations for user address autocomplete / manual locality selection
   */
  searchGeocode(query: string): Observable<ReverseGeocodeResult[]> {
    if (!query || query.trim().length < 2) return of([]);
    const qs = `action=search&q=${encodeURIComponent(query.trim())}`;
    const tryGet = (baseUrl: string) => this.http.get<{ success: boolean; results: ReverseGeocodeResult[] }>(`${baseUrl}?${qs}`);

    return tryGet(`${environment.apiUrl}/geo/reverse.php`).pipe(
      catchError(() => tryGet('/P_demo_4/backend/api/geo/reverse.php')),
      catchError(() => tryGet('/p_demo_4/backend/api/geo/reverse.php')),
      catchError(() => tryGet('/p_demo_3/backend/api/geo/reverse.php')),
      catchError(() => tryGet('/api/geo/reverse.php')),
      catchError(() => tryGet(`${environment.apacheApiUrl}/geo/reverse.php`)),
      catchError(() => {
        return this.http.get<any[]>(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query.trim() + ', Tamil Nadu, India')}&format=json&addressdetails=1&limit=5`).pipe(
          map(items => {
            if (!Array.isArray(items)) return [];
            return items.map(item => {
              const addr = item.address || {};
              const loc = addr.suburb || addr.neighbourhood || addr.city || addr.town || '';
              return {
                displayName: item.display_name || '',
                compactTitle: [item.name, loc, addr.city || addr.town, addr.postcode].filter(Boolean).join(', '),
                name: item.name || loc,
                locality: loc,
                city: addr.city || addr.town || '',
                district: addr.state_district || '',
                postcode: addr.postcode || '',
                latitude: parseFloat(item.lat),
                longitude: parseFloat(item.lon)
              } as ReverseGeocodeResult;
            });
          }),
          catchError(() => of([]))
        );
      }),
      map(res => {
        if (res && (res as any).success && Array.isArray((res as any).results)) {
          return (res as any).results as ReverseGeocodeResult[];
        }
        if (Array.isArray(res)) return res as ReverseGeocodeResult[];
        return [];
      })
    );
  }
}

