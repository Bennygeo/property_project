import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { ListingMode, Property, PropertyType } from '../models/property.model';
import { validateGpsData, annotateInterPropertyProximity } from '../utils/gps-helper';
import { formatPriceIndian, parsePriceToNumber } from '../utils/price-helper';
import { NotificationService } from './notification.service';
import { WalletService } from './wallet.service';
import { enrichPropertyWithMockDetails } from './property-details-mock.helper';
import { MOCK_50_PROPERTIES } from './mock-properties-data';
import { AuthService } from './auth.service';
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
  topLocalities?: string[];
}

export interface DeveloperSummary {
  id?: number;
  name: string;
  rawName?: string;
  slug?: string;
  reraNumber?: string;
  propertyCount: number;
  projectCount: number;
  upcomingProjectsCount?: number;
  districts?: string[];
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  initials?: string;
  corporateOffice?: string;
  establishedYear?: string;
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

function enrichInitialGps(props: Property[]): Property[] {
  return props.map(p => {
    const gpsRes = validateGpsData(p.googleMapsLink, p.latitude, p.longitude, p.locality, p.city);
    const lat = (typeof p.latitude === 'number' && !isNaN(p.latitude)) ? p.latitude : gpsRes.coordinates?.latitude;
    const lng = (typeof p.longitude === 'number' && !isNaN(p.longitude)) ? p.longitude : gpsRes.coordinates?.longitude;
    return {
      ...p,
      price: formatPriceIndian(p.price),
      latitude: lat,
      longitude: lng,
      googleMapsLink: p.googleMapsLink || gpsRes.mapsUrl,
      isGpsValid: true,
      gpsFormatted: gpsRes.formattedText
    };
  });
}

const SHORTLIST_STORAGE_KEY = 'fap_user_shortlists';
const SHORTLIST_DOSSIERS_KEY = 'fap_user_shortlist_dossiers';

function formatShortlistApiToProperty(raw: any): Property {
  const pId = String(raw.id || raw.propertyId || '').trim();
  const rawPrice = raw.price || '0';
  const img = raw.imageUrl || raw.main_image_url || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80';
  return {
    id: pId,
    title: raw.title || 'Verified Plotted Development',
    propertyType: (raw.propertyType || raw.property_type || 'Gated CMDA Plots') as PropertyType,
    locality: raw.locality || raw.locality_name || 'Kanyakumari',
    city: raw.city || raw.city_name || 'Kanyakumari',
    district: raw.district || raw.city || '',
    cityKey: (raw.cityKey || (raw.city ? raw.city.toLowerCase() : 'chennai')),
    price: formatPriceIndian(rawPrice),
    pricePerSqFt: raw.pricePerSqFt || (raw.price_per_sqft ? `₹ ${raw.price_per_sqft}/sq.ft` : '₹ 4,500/sq.ft'),
    sqft: raw.sqft || '800 sq.ft (1.84 Cents)',
    bhkBadge: raw.bhkBadge || raw.bhk_badge || '1.84 Cents Plot',
    facingOrView: raw.facingOrView || raw.facing_or_view || 'East Facing',
    imageUrl: img,
    badges: {
      rera: raw.rera || 'TNRERA Approved',
      brokerage: '0% Brokerage',
      points: 4,
      specialTag: raw.specialTag || 'Cadastral Verified'
    },
    highlights: raw.highlights || ['DTCP / CMDA Approved', 'Clear Title', 'Immediate Registration'],
    mediaPoints: 4,
    isMediaUnlocked: false,
    isShortlisted: true,
    freePhotos: [img],
    premiumMedia: raw.premiumMedia || [],
    whatsappUrl: `https://wa.me/919486140936?text=${encodeURIComponent('Hi Find a Plot, I am inquiring about ' + (raw.title || pId))}`
  };
}

@Injectable({
  providedIn: 'root'
})
export class PropertyService {
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly notificationService = inject(NotificationService);
  private readonly walletService = inject(WalletService);
  private readonly authService = inject(AuthService);
  public readonly isSqlLoaded = signal<boolean>(false);
  public readonly totalApiProperties = signal<number>(0);
  public readonly hasAgriculturalProperties = signal<boolean>(false);
  public readonly businessWhatsAppNumber = signal<string>('919486140936');

  public getBusinessWhatsAppUrl(title?: string, id?: string): string {
    const num = this.businessWhatsAppNumber();
    const cleanNum = num.replace(/[^\d]/g, '');
    const ref = id ? ` (Ref: ${id})` : '';
    const text = encodeURIComponent(`Hi Find a Plot, I am interested in ${title || 'property'}${ref}. Please share verified legal Patta & TNRERA dossier.`);
    return `https://wa.me/${cleanNum}?text=${text}`;
  }
  public readonly isFetchingApi = signal<boolean>(false);
  public readonly suggestedProperties = signal<Property[]>(annotateInterPropertyProximity(enrichInitialGps(MOCK_50_PROPERTIES.slice(0, 8))));
  public readonly hasMoreApiProperties = computed(() => {
    return this._properties().length < this.totalApiProperties();
  });

  // Persistent Shortlists Set (Synchronized with localStorage & MySQL backend)
  public readonly shortlistedPropertyIds = signal<Set<string>>(this.loadShortlistsFromStorage());
  public readonly shortlistedProperties = signal<Property[]>(this.loadShortlistDossiersFromStorage());

  // Master property list initialized with 50+ mock properties directly from database (10L to 3Cr)
  private readonly _properties = signal<Property[]>(enrichInitialGps(MOCK_50_PROPERTIES));

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

  // Computed shortlist count directly derived from persistent shortlisted IDs Set
  public readonly shortlistCount = computed(() => {
    return this.shortlistedPropertyIds().size;
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
        const fullText = `${p.title || ''} ${p.locality || ''} ${p.city || ''} ${p.district || ''} ${p.propertyType || ''} ${p.bhkBadge || ''} ${p.badges?.rera || ''}`.toLowerCase();
        return words.every(w => fullText.includes(w));
      });
    }

    // 2. Category filter pill selection
    if (filter !== 'all') {
      let filtered: Property[] = [];
      if (filter === 'apartments') {
        filtered = all.filter(p => p.propertyType === 'Apartments & Flats');
      } else if (filter === 'plots') {
        filtered = all.filter(p =>
          (p.propertyType === 'Gated CMDA Plots' || p.type === 'plots') &&
          p.land_type?.toLowerCase() !== 'commercial' &&
          p.landType?.toLowerCase() !== 'commercial' &&
          p.propertyType !== 'Commercial Spaces'
        );
      } else if (filter === 'villas') {
        filtered = all.filter(p => p.propertyType === 'Independent Villas' || p.propertyType === 'Luxury Penthouses');
      } else if (filter === 'commercial') {
        filtered = all.filter(p =>
          p.propertyType === 'Commercial Spaces' ||
          p.land_type?.toLowerCase() === 'commercial' ||
          p.landType?.toLowerCase() === 'commercial' ||
          p.masterDetails?.landUse?.toLowerCase() === 'commercial' ||
          p.type?.toLowerCase() === 'commercial' ||
          p.category?.toLowerCase().includes('commercial')
        );
      } else if (filter === 'agricultural') {
        filtered = all.filter(p =>
          p.propertyType === 'Agricultural Lands' ||
          p.land_type?.toLowerCase() === 'agricultural' ||
          p.land_type?.toLowerCase() === 'agriculture' ||
          p.landType?.toLowerCase() === 'agricultural' ||
          p.masterDetails?.landUse?.toLowerCase() === 'agricultural' ||
          p.type?.toLowerCase() === 'agricultural' ||
          p.category?.toLowerCase().includes('agricultural')
        );
      }
      return filtered;
    }

    // 3. Secondary check against hero search bar tabs if category filter is 'all'
    if (heroTab === 'plots') {
      return all.filter(p =>
        (p.propertyType === 'Gated CMDA Plots' || p.type === 'plots') &&
        p.land_type?.toLowerCase() !== 'commercial' &&
        p.landType?.toLowerCase() !== 'commercial' &&
        p.propertyType !== 'Commercial Spaces'
      );
    }
    if (heroTab === 'commercial') {
      return all.filter(p =>
        p.propertyType === 'Commercial Spaces' ||
        p.land_type?.toLowerCase() === 'commercial' ||
        p.landType?.toLowerCase() === 'commercial' ||
        p.masterDetails?.landUse?.toLowerCase() === 'commercial' ||
        p.type?.toLowerCase() === 'commercial' ||
        p.category?.toLowerCase().includes('commercial')
      );
    }
    if (heroTab === 'agricultural') {
      return all.filter(p =>
        p.propertyType === 'Agricultural Lands' ||
        p.land_type?.toLowerCase() === 'agricultural' ||
        p.land_type?.toLowerCase() === 'agriculture' ||
        p.landType?.toLowerCase() === 'agricultural' ||
        p.masterDetails?.landUse?.toLowerCase() === 'agricultural' ||
        p.type?.toLowerCase() === 'agricultural' ||
        p.category?.toLowerCase().includes('agricultural')
      );
    }

    return all;
  });

  setCategoryFilter(filter: string): void {
    this.activeCategoryFilter.set(filter);
  }

  public getActiveUserId(): number {
    try {
      const user = this.authService.currentUser();
      if (user && typeof user.id === 'number' && user.id > 0) {
        return user.id;
      }
    } catch {
      // Fallback
    }
    return 1;
  }

  public isShortlisted(propertyId: string): boolean {
    if (!propertyId) return false;
    const target = propertyId.trim().toUpperCase();
    for (const id of this.shortlistedPropertyIds()) {
      if (id && id.trim().toUpperCase() === target) return true;
    }
    return false;
  }

  private loadShortlistsFromStorage(): Set<string> {
    if (typeof window === 'undefined' || !window.localStorage) {
      return new Set<string>();
    }
    try {
      const raw = localStorage.getItem(SHORTLIST_STORAGE_KEY) || localStorage.getItem('mannidam_user_shortlists');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return new Set<string>(parsed.filter((id: any) => typeof id === 'string' && id.trim().length > 0));
        }
      }
    } catch (err) {
      console.warn('[PropertyService] Error reading shortlists from storage:', err);
    }
    return new Set<string>();
  }

  private saveShortlistsToStorage(ids: Set<string>): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      localStorage.setItem(SHORTLIST_STORAGE_KEY, JSON.stringify(Array.from(ids)));
    } catch (err) {
      console.warn('[PropertyService] Error saving shortlists to storage:', err);
    }
  }

  private loadShortlistDossiersFromStorage(): Property[] {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [];
    }
    try {
      const raw = localStorage.getItem(SHORTLIST_DOSSIERS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map(item => formatShortlistApiToProperty(item));
        }
      }
    } catch (err) {
      console.warn('[PropertyService] Error reading shortlist dossiers from storage:', err);
    }
    return [];
  }

  private saveShortlistDossiersToStorage(props: Property[]): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      localStorage.setItem(SHORTLIST_DOSSIERS_KEY, JSON.stringify(props));
    } catch (err) {
      console.warn('[PropertyService] Error saving shortlist dossiers to storage:', err);
    }
  }

  public getShortlistedPropertiesList(): Property[] {
    const dossiers = this.shortlistedProperties();
    if (dossiers.length > 0) {
      return dossiers;
    }
    const ids = this.shortlistedPropertyIds();
    if (ids.size === 0) return [];
    return this._properties().filter(p => this.isShortlisted(p.id));
  }

  public syncShortlistedStateInProperties(): void {
    this._properties.update(list =>
      list.map(p => ({
        ...p,
        isShortlisted: this.isShortlisted(p.id)
      }))
    );
  }

  /**
   * Fetch user shortlists from backend database.
   * Transmits current local shortlists to backend for cross-validation.
   * If an admin deletes a property from the database, it will be returned in purgedPropertyIds
   * and automatically pruned from both shortlistedPropertyIds and localStorage.
   */
  public fetchShortlistsFromBackend(userId?: number): void {
    const effectiveUserId = (userId && userId > 0) ? userId : this.getActiveUserId();
    const currentLocalIds = Array.from(this.shortlistedPropertyIds());

    const qParams = new URLSearchParams();
    qParams.set('userId', String(effectiveUserId));
    if (currentLocalIds.length > 0) {
      qParams.set('localIds', currentLocalIds.join(','));
    }

    const tryGet = (baseUrl: string) => {
      const sep = baseUrl.includes('?') ? '&' : '?';
      return this.http.get<{
        success: boolean;
        data: { propertyIds: string[]; purgedPropertyIds?: string[]; shortlists?: any[] };
      }>(`${baseUrl}${sep}${qParams.toString()}`);
    };

    (tryGet(environment.apiUrl + '/properties/shortlist.php').pipe(
      catchError(() => tryGet('/p_demo_5/backend/api/properties/shortlist.php')),
      catchError(() => tryGet('/api/properties/shortlist.php')),
      catchError(() => tryGet(environment.apacheApiUrl + '/properties/shortlist.php')),
      catchError(err => {
        console.warn('[Shortlist API] Unable to connect to MySQL shortlist endpoint; retaining local cache.', err);
        return of(null);
      })
    ) as Observable<any>).subscribe((res: any) => {
      if (res && res.success && res.data) {
        const validBackendIds: string[] = Array.isArray(res.data.propertyIds) ? res.data.propertyIds : [];
        const purgedIds: string[] = Array.isArray(res.data.purgedPropertyIds) ? res.data.purgedPropertyIds : [];
        const rawShortlists: any[] = Array.isArray(res.data.shortlists) ? res.data.shortlists : [];

        const updatedSet = new Set<string>(this.shortlistedPropertyIds());

        // 1. Prune any property that was deleted by admin from database
        for (const pid of purgedIds) {
          const upperPid = pid.trim().toUpperCase();
          for (const item of Array.from(updatedSet)) {
            if (item.trim().toUpperCase() === upperPid) {
              updatedSet.delete(item);
            }
          }
        }

        // 2. Add all confirmed valid properties
        for (const vid of validBackendIds) {
          updatedSet.add(vid);
        }

        // 3. Save confirmed active set
        this.shortlistedPropertyIds.set(updatedSet);
        this.saveShortlistsToStorage(updatedSet);
        this.syncShortlistedStateInProperties();

        // 4. Update full shortlist dossiers
        if (rawShortlists.length > 0) {
          const formatted = rawShortlists.map((r: any) => formatShortlistApiToProperty(r));
          this.shortlistedProperties.set(formatted);
          this.saveShortlistDossiersToStorage(formatted);
        } else if (updatedSet.size === 0) {
          this.shortlistedProperties.set([]);
          this.saveShortlistDossiersToStorage([]);
        }
      }
    });
  }

  toggleShortlist(propertyId: string, userId?: number): void {
    if (!propertyId) return;

    const trimmedId = propertyId.trim();
    const effectiveUserId = (userId && userId > 0) ? userId : this.getActiveUserId();
    const currentSet = new Set(this.shortlistedPropertyIds());

    let existingMatch: string | null = null;
    for (const id of currentSet) {
      if (id && id.trim().toUpperCase() === trimmedId.toUpperCase()) {
        existingMatch = id;
        break;
      }
    }

    const nextState = !existingMatch;

    if (nextState) {
      currentSet.add(trimmedId);
      const candidate = this._properties().find(p => p.id === trimmedId) ||
        MOCK_50_PROPERTIES.find(p => p.id === trimmedId);
      if (candidate) {
        const newDossier = { ...candidate, isShortlisted: true };
        const updatedDossiers = [
          newDossier,
          ...this.shortlistedProperties().filter(p => p.id.trim().toUpperCase() !== trimmedId.toUpperCase())
        ];
        this.shortlistedProperties.set(updatedDossiers);
        this.saveShortlistDossiersToStorage(updatedDossiers);
      }
    } else if (existingMatch) {
      currentSet.delete(existingMatch);
      const remainingDossiers = this.shortlistedProperties().filter(
        p => p.id.trim().toUpperCase() !== trimmedId.toUpperCase()
      );
      this.shortlistedProperties.set(remainingDossiers);
      this.saveShortlistDossiersToStorage(remainingDossiers);
    }

    // Optimistically update signals and persistent local storage
    this.shortlistedPropertyIds.set(currentSet);
    this.saveShortlistsToStorage(currentSet);
    this.syncShortlistedStateInProperties();

    // Find property title for user feedback
    const prop = this._properties().find(p => p.id === trimmedId) || MOCK_50_PROPERTIES.find(p => p.id === trimmedId);
    const title = prop?.title || 'Property';

    this.notificationService.show({
      type: 'info',
      title: nextState ? 'Added to Shortlist' : 'Removed from Shortlist',
      message: `${title} has been ${nextState ? 'saved to' : 'removed from'} your shortlisted dossiers.`,
      icon: nextState ? 'favorite' : 'heart_broken'
    });

    // Synchronize with MySQL database endpoint
    const payload = {
      propertyId: trimmedId,
      action: nextState ? 'add' : 'remove',
      userId: effectiveUserId
    };

    const tryPost = (baseUrl: string) =>
      this.http.post<{ success: boolean; data: any }>(baseUrl, payload);

    (tryPost(environment.apiUrl + '/properties/shortlist.php').pipe(
      catchError(() => tryPost('/p_demo_5/backend/api/properties/shortlist.php')),
      catchError(() => tryPost('/api/properties/shortlist.php')),
      catchError(() => tryPost(environment.apacheApiUrl + '/properties/shortlist.php')),
      catchError(err => {
        // If property was deleted from database by admin (404), remove it immediately from shortlisted Set
        if (err?.status === 404) {
          const purged = new Set(this.shortlistedPropertyIds());
          for (const item of Array.from(purged)) {
            if (item.trim().toUpperCase() === trimmedId.toUpperCase()) {
              purged.delete(item);
            }
          }
          this.shortlistedPropertyIds.set(purged);
          this.saveShortlistsToStorage(purged);
          this.syncShortlistedStateInProperties();
        }
        return of(null);
      })
    ) as Observable<any>).subscribe();
  }

  openMediaModal(property: Property, initialTab: 'free' | 'premium' = 'free'): void {
    // Popup disabled per user command: navigate directly to property details page
    if (property && property.id) {
      this.router.navigate(['/property', property.id]);
    }
    this.activeModalProperty.set(null);
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
    this.syncShortlistedStateInProperties();
    this.loadPropertiesFromApi();
    this.fetchShortlistsFromBackend();
  }

  /**
   * Load real-time properties from MySQL PHP Backend with API-level pagination (offset & limit)
   */
  public loadPropertiesFromApi(params?: LoadPropertiesParams): void {
    const offset = params?.offset ?? 0;
    const limit = params?.limit ?? (offset === 0 ? 20 : 8);
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
        if (res.data?.hasAgriculture !== undefined) {
          this.hasAgriculturalProperties.set(Boolean(res.data.hasAgriculture));
        } else {
          const hasAgri = rawList.some((p: any) =>
            p.land_type?.toLowerCase() === 'agricultural' ||
            p.land_type?.toLowerCase() === 'agriculture' ||
            p.landType?.toLowerCase() === 'agricultural' ||
            p.category === 'Agricultural Lands' ||
            p.type === 'agricultural'
          );
          if (hasAgri) {
            this.hasAgriculturalProperties.set(true);
          }
        }

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
            const gpsRes = validateGpsData(
              p.googleMapsLink || p.masterDetails?.googleMapsLink || p.interactiveMapUrl,
              p.latitude,
              p.longitude,
              p.locality,
              p.city
            );
            const fallbackMain = mockImages[globalIdx % mockImages.length];
            const resolvedImg = (p.imageUrl && typeof p.imageUrl === 'string' && p.imageUrl.startsWith('http'))
              ? p.imageUrl
              : fallbackMain;
            const resolvedPhotos = (Array.isArray(p.freePhotos) && p.freePhotos.length > 0 && p.freePhotos[0]?.startsWith('http'))
              ? p.freePhotos
              : [resolvedImg, mockImages[(globalIdx + 1) % mockImages.length], mockImages[(globalIdx + 2) % mockImages.length]];

            const resolvedLat = (typeof p.latitude === 'number' && !isNaN(p.latitude)) ? p.latitude : gpsRes.coordinates?.latitude;
            const resolvedLng = (typeof p.longitude === 'number' && !isNaN(p.longitude)) ? p.longitude : gpsRes.coordinates?.longitude;
            const isGpsValid = (p.isGpsValid === true) || (gpsRes.isValid && (resolvedLat != null || gpsRes.coordinates != null)) || (p.isGpsValid !== false && (resolvedLat != null || gpsRes.coordinates != null));
            const isComm = (
              p.land_type?.toLowerCase() === 'commercial' ||
              p.landType?.toLowerCase() === 'commercial' ||
              p.propertyType === 'Commercial Spaces' ||
              p.category === 'Commercial Spaces' ||
              p.type === 'commercial'
            );
            const isAgri = (
              p.land_type?.toLowerCase() === 'agricultural' ||
              p.land_type?.toLowerCase() === 'agriculture' ||
              p.landType?.toLowerCase() === 'agricultural' ||
              p.propertyType === 'Agricultural Lands' ||
              p.category === 'Agricultural Lands' ||
              p.type === 'agricultural'
            );

            return {
              ...p,
              propertyType: (isComm ? 'Commercial Spaces' : (isAgri ? 'Agricultural Lands' : (p.propertyType || 'Gated CMDA Plots'))) as PropertyType,
              price: formatPriceIndian(p.price),
              isShortlisted: this.isShortlisted(p.id),
              imageUrl: resolvedImg,
              freePhotos: resolvedPhotos,
              isGpsValid: isGpsValid,
              gpsErrorReason: isGpsValid ? undefined : gpsRes.reason,
              gpsFormatted: gpsRes.formattedText,
              latitude: resolvedLat,
              longitude: resolvedLng,
              googleMapsLink: p.googleMapsLink || gpsRes.mapsUrl,
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
              const merged = [...existing, ...newOnly].map(item => ({
                ...item,
                isShortlisted: this.isShortlisted(item.id)
              }));
              return annotateInterPropertyProximity(merged);
            });
          } else {
            this._properties.set(annotateInterPropertyProximity(sanitized.map((item: Property) => ({
              ...item,
              isShortlisted: this.isShortlisted(item.id)
            }))));
          }
        } else if (!append) {
          this._properties.set([]);
        }

        // Process suggested properties returned when total === 0
        const rawSuggested = Array.isArray(res.data?.suggested) ? res.data.suggested : [];
        if (rawSuggested.length > 0) {
          const sanitizedSuggested = rawSuggested.map((p: any, idx: number) => {
            const gpsRes = validateGpsData(
              p.googleMapsLink || p.masterDetails?.googleMapsLink || p.interactiveMapUrl,
              p.latitude,
              p.longitude,
              p.locality,
              p.city
            );
            const fallbackMain = mockImages[idx % mockImages.length];
            const resolvedImg = (p.imageUrl && typeof p.imageUrl === 'string' && p.imageUrl.startsWith('http'))
              ? p.imageUrl
              : fallbackMain;
            const resolvedPhotos = (Array.isArray(p.freePhotos) && p.freePhotos.length > 0 && p.freePhotos[0]?.startsWith('http'))
              ? p.freePhotos
              : [resolvedImg, mockImages[(idx + 1) % mockImages.length], mockImages[(idx + 2) % mockImages.length]];

            const resolvedLat = (typeof p.latitude === 'number' && !isNaN(p.latitude)) ? p.latitude : gpsRes.coordinates?.latitude;
            const resolvedLng = (typeof p.longitude === 'number' && !isNaN(p.longitude)) ? p.longitude : gpsRes.coordinates?.longitude;
            const isGpsValid = (p.isGpsValid === true) || (gpsRes.isValid && (resolvedLat != null || gpsRes.coordinates != null)) || (p.isGpsValid !== false && (resolvedLat != null || gpsRes.coordinates != null));
            const isComm = (
              p.land_type?.toLowerCase() === 'commercial' ||
              p.landType?.toLowerCase() === 'commercial' ||
              p.propertyType === 'Commercial Spaces' ||
              p.category === 'Commercial Spaces' ||
              p.type === 'commercial'
            );
            const isAgri = (
              p.land_type?.toLowerCase() === 'agricultural' ||
              p.land_type?.toLowerCase() === 'agriculture' ||
              p.landType?.toLowerCase() === 'agricultural' ||
              p.propertyType === 'Agricultural Lands' ||
              p.category === 'Agricultural Lands' ||
              p.type === 'agricultural'
            );

            return {
              ...p,
              propertyType: (isComm ? 'Commercial Spaces' : (isAgri ? 'Agricultural Lands' : (p.propertyType || 'Gated CMDA Plots'))) as PropertyType,
              price: formatPriceIndian(p.price),
              isShortlisted: this.isShortlisted(p.id),
              imageUrl: resolvedImg,
              freePhotos: resolvedPhotos,
              isGpsValid: isGpsValid,
              gpsErrorReason: isGpsValid ? undefined : gpsRes.reason,
              gpsFormatted: gpsRes.formattedText,
              latitude: resolvedLat,
              longitude: resolvedLng,
              googleMapsLink: p.googleMapsLink || gpsRes.mapsUrl,
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
      catchError(() => tryGet('/P_demo_5/backend/api/geo/suggest.php')),
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
   * Fetch Google Places Autocomplete suggestions using Google Places API (New) with resilient fallback
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
      catchError(() => tryGet('/P_demo_5/backend/api/geo/places.php')),
      catchError(() => tryGet('/api/geo/places.php')),
      catchError(() => tryGet(environment.apacheApiUrl + '/geo/places.php')),
      catchError(err => {
        return of({ success: false, suggestions: [] });
      })
    ) as Observable<{ success: boolean; suggestions: any[] }>).pipe(
      map(res => {
        if (res && res.success && Array.isArray(res.suggestions) && res.suggestions.length > 0) {
          return res.suggestions;
        }
        return this.getClientFallbackLocalities(q, district);
      })
    );
  }

  /**
   * Client-side fallback localities when backend or external Google API is unreachable
   */
  private getClientFallbackLocalities(query: string, district?: string): any[] {
    const catalog = [
      { label: 'Tambaram', sub: 'South Chennai & Chengalpattu Gateway', district: 'Chengalpattu' },
      { label: 'East Tambaram', sub: 'Residential & Transit Hub', district: 'Chengalpattu' },
      { label: 'West Tambaram', sub: 'Commercial & Bus Terminus Corridor', district: 'Chengalpattu' },
      { label: 'Tambaram Sanatorium', sub: 'GST Road Transit & Health Belt', district: 'Chengalpattu' },
      { label: 'Velachery', sub: 'South Chennai Transit & Retail Hub', district: 'Chennai' },
      { label: 'Porur', sub: 'West Chennai IT & Healthcare Hub', district: 'Chennai' },
      { label: 'Guindy', sub: 'Industrial & Transit Corridor', district: 'Chennai' },
      { label: 'Adyar', sub: 'South Chennai Premium Coastal Locality', district: 'Chennai' },
      { label: 'Besant Nagar', sub: 'Coastal Residential & Beach Belt', district: 'Chennai' },
      { label: 'T. Nagar', sub: 'Commercial & Retail Capital of Chennai', district: 'Chennai' },
      { label: 'Anna Nagar', sub: 'North-West Chennai Prime Residential', district: 'Chennai' },
      { label: 'Mylapore', sub: 'Cultural & Heritage Corridor', district: 'Chennai' },
      { label: 'Alwarpet', sub: 'Central Chennai Luxury Zone', district: 'Chennai' },
      { label: 'Nungambakkam', sub: 'Central Business & Diplomatic Hub', district: 'Chennai' },
      { label: 'Kilpauk', sub: 'Central Chennai Medical & Residential', district: 'Chennai' },
      { label: 'Thiruvanmiyur', sub: 'ECR Starting Junction & Coastal Belt', district: 'Chennai' },
      { label: 'Perungudi', sub: 'OMR IT Corridor & Express Highway', district: 'Chennai' },
      { label: 'Sholinganallur', sub: 'OMR IT Expressway Major Junction', district: 'Chennai' },
      { label: 'Thoraipakkam', sub: 'OMR Radial Road Junction', district: 'Chennai' },
      { label: 'Navalur', sub: 'OMR IT Hub & Marina Mall Corridor', district: 'Chengalpattu' },
      { label: 'Siruseri', sub: 'SIPCOT IT Park & Residential Belt', district: 'Chengalpattu' },
      { label: 'Kelambakkam', sub: 'OMR - Vandalur Link Road Hub', district: 'Chengalpattu' },
      { label: 'Thiruporur', sub: 'OMR Southern Growth Hub', district: 'Chengalpattu' },
      { label: 'Medavakkam', sub: 'Tambaram - Velachery Link Junction', district: 'Chengalpattu' },
      { label: 'Perumbakkam', sub: 'OMR Link Road Growth Corridor', district: 'Chengalpattu' },
      { label: 'Chromepet', sub: 'GST Road Commercial & Transit Hub', district: 'Chengalpattu' },
      { label: 'Pallavaram', sub: 'Airport Proximity & GST Highway', district: 'Chengalpattu' },
      { label: 'Selaiyur', sub: 'Tambaram East Residential Corridor', district: 'Chengalpattu' },
      { label: 'Chitlapakkam', sub: 'Lake View Residential Belt', district: 'Chengalpattu' },
      { label: 'Madambakkam', sub: 'Heritage Temple & Residential Zone', district: 'Chengalpattu' },
      { label: 'Sembakkam', sub: 'Velachery - Tambaram Road Belt', district: 'Chengalpattu' },
      { label: 'Mudichur', sub: 'Tambaram - Sriperumbudur Link Road', district: 'Chengalpattu' },
      { label: 'Perungalathur', sub: 'New Kilambakkam Bus Terminus Gateway', district: 'Chengalpattu' },
      { label: 'Vandalur', sub: 'Zoological Park & Outer Ring Road Interchange', district: 'Chengalpattu' },
      { label: 'Urapakkam', sub: 'GST Road Fast-Growing Residential', district: 'Chengalpattu' },
      { label: 'Guduvanchery', sub: 'GST Road Industrial & Township Hub', district: 'Chengalpattu' },
      { label: 'Maraimalai Nagar', sub: 'Automotive & Industrial Corridor', district: 'Chengalpattu' },
      { label: 'Singaperumal Koil', sub: 'Mahindra World City Belt', district: 'Chengalpattu' },
      { label: 'Chengalpattu Town', sub: 'District Headquarters & Rail Junction', district: 'Chengalpattu' },
      { label: 'Poonamallee', sub: 'Metro Phase 2 Line 4 Western Hub', district: 'Tiruvallur' },
      { label: 'Avadi', sub: 'Western Rail Corridor & Municipal Hub', district: 'Tiruvallur' },
      { label: 'Ambattur', sub: 'Industrial Estate & IT Parks', district: 'Tiruvallur' },
      { label: 'Mogappair', sub: 'West Chennai Premier Residential', district: 'Chennai' },
      { label: 'Maduravoyal', sub: 'Elevated Expressway & Bypass Junction', district: 'Chennai' },
      { label: 'Koyambedu', sub: 'Transit Hub & Metro Interchange', district: 'Chennai' },
      { label: 'Vadapalani', sub: 'Film City, Metro & Hospital Hub', district: 'Chennai' },
      { label: 'Sriperumbudur', sub: 'Automobile & Electronics SEZ Corridor', district: 'Kancheepuram' },
      { label: 'Oragadam', sub: 'Industrial Corridor & SIPCOT Belt', district: 'Kancheepuram' },
      { label: 'Kancheepuram', sub: 'Silk City & Heritage Capital', district: 'Kancheepuram' },
      { label: 'Tiruvallur', sub: 'District Headquarters & Western Hub', district: 'Tiruvallur' },
      { label: 'Coimbatore', sub: 'Manchester of South India • Industrial Hub', district: 'Coimbatore' },
      { label: 'Madurai', sub: 'Cultural Capital & South Central Hub', district: 'Madurai' },
      { label: 'Tiruchirappalli', sub: 'Central Hub & Educational Corridor', district: 'Tiruchirappalli' },
      { label: 'Salem', sub: 'Steel City & Western Express Corridor', district: 'Salem' },
      { label: 'Hosur', sub: 'EV & Industrial Tech Corridor • Krishnagiri', district: 'Krishnagiri' }
    ];

    const qLower = query.toLowerCase();
    const dLower = (district || '').toLowerCase();

    return catalog
      .filter(item => {
        const matchesQuery = item.label.toLowerCase().includes(qLower) || item.sub.toLowerCase().includes(qLower);
        if (!matchesQuery) return false;
        if (dLower && !item.district.toLowerCase().includes(dLower) && !dLower.includes(item.district.toLowerCase())) {
          return item.label.toLowerCase().startsWith(qLower);
        }
        return true;
      })
      .map(item => ({
        placeId: 'loc_' + item.label.toLowerCase().replace(/\s+/g, '_'),
        label: item.label,
        sub: `${item.sub} • ${item.district}`,
        fullText: `${item.label}, ${item.district}, Tamil Nadu, India`,
        types: ['locality', 'political'],
        type: 'google_place',
        icon: 'explore',
        query: item.label
      }))
      .slice(0, 8);
  }

  /**
   * Fetch Google Place Details (exact coordinates and address) by placeId
   */
  public fetchGooglePlaceDetails(placeId: string): Observable<{ latitude?: number; longitude?: number; formattedAddress?: string; displayName?: string } | null> {
    const tryGet = (baseUrl: string) => this.http.get<{ success: boolean; data: any }>(baseUrl + '?action=details&placeId=' + encodeURIComponent(placeId));
    return (tryGet(environment.apiUrl + '/geo/places.php').pipe(
      catchError(() => tryGet('/P_demo_5/backend/api/geo/places.php')),
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
      catchError(() => tryGet('/P_demo_5/backend/api/geo/nearby.php')),
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
      catchError(() => tryGet('/P_demo_5/backend/api/geo/districts.php')),
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
   * Fetch trending high-growth corridors dynamically from database
   */
  public fetchTrendingCorridors(): Observable<any[]> {
    const tryGet = (baseUrl: string) => this.http.get<{ success: boolean; data: { corridors: any[] } }>(baseUrl);
    return (tryGet(environment.apiUrl + '/geo/corridors.php').pipe(
      catchError(() => tryGet('/P_demo_5/backend/api/geo/corridors.php')),
      catchError(() => tryGet('/api/geo/corridors.php')),
      catchError(() => tryGet(environment.apacheApiUrl + '/geo/corridors.php')),
      catchError(() => of({ success: false, data: { corridors: [] } }))
    ) as Observable<{ success: boolean; data: { corridors: any[] } }>).pipe(
      map(res => {
        if (res && res.success && res.data && Array.isArray(res.data.corridors)) {
          return res.data.corridors;
        }
        return [];
      })
    );
  }

  /**
   * Fetch list of all builders/developers from database
   */
  public fetchBuilders(): Observable<DeveloperSummary[]> {
    const tryGet = (baseUrl: string) => this.http.get<{ success: boolean; data: any }>(baseUrl);
    return (tryGet(environment.apiUrl + '/builders/list.php').pipe(
      catchError(() => tryGet('/P_demo_5/backend/api/builders/list.php')),
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
      catchError(() => tryGet('/P_demo_5/backend/api/builders/details.php')),
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
   * Enforces PRD M06 entitlement limits (Free: 2, Smart: 5, Priority: 25, VIP: 50).
   * When limits are exceeded, details below banner are masked and not downloaded from DB.
   */
  public fetchPropertyDetails(id: string, userId?: number, deviceHash?: string): Observable<Property | null> {
    const params = new URLSearchParams();
    params.set('id', id);
    if (userId !== undefined && userId !== null && userId > 0) {
      params.set('userId', String(userId));
    }
    if (deviceHash) {
      params.set('deviceHash', deviceHash);
    }
    const qs = params.toString();

    const proxyUrl = `${environment.apiUrl}/properties/details.php?${qs}`;
    const cliUrl = `${environment.cliApiUrl}/properties/details.php?${qs}`;
    const apacheUrl = `${environment.apacheApiUrl}/properties/details.php?${qs}`;

    console.info(`[XHR API] Requesting property details dossier for ${id} from MySQL: ${proxyUrl}`);
    return this.http.get<{ success: boolean; data: Property }>(proxyUrl).pipe(
      catchError(() => this.http.get<{ success: boolean; data: Property }>(cliUrl)),
      catchError(() => this.http.get<{ success: boolean; data: Property }>(apacheUrl)),
      map(res => {
        if (res && res.success && res.data) {
          const sqlProp = res.data;
          sqlProp.price = formatPriceIndian(sqlProp.price);
          sqlProp.isShortlisted = this.isShortlisted(sqlProp.id);
          return sqlProp;
        }
        return null;
      }),
      tap(sqlProp => {
        if (sqlProp) {
          sqlProp.isShortlisted = this.isShortlisted(sqlProp.id);
          console.info(`[XHR API] Received details dossier from MySQL for ${id}:`, sqlProp);
          this._properties.update(list => {
            const index = list.findIndex(p => p.id === sqlProp.id);
            if (index >= 0) {
              const updated = [...list];
              updated[index] = { ...list[index], ...sqlProp, isShortlisted: this.isShortlisted(sqlProp.id) };
              return updated;
            }
            return [{ ...sqlProp, isShortlisted: this.isShortlisted(sqlProp.id) }, ...list];
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
    const formattedFound = {
      ...found,
      price: formatPriceIndian(found.price),
      isShortlisted: this.isShortlisted(found.id)
    };
    if (formattedFound.floorPlans || formattedFound.villaDetails || formattedFound.apartmentDetails || formattedFound.plotDetails || formattedFound.cadastralAudit) {
      return formattedFound;
    }
    return enrichPropertyWithMockDetails(formattedFound);
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
      catchError(() => tryPost('/P_demo_5/backend/api/properties/create.php')),
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
      catchError(() => tryPost('/P_demo_5/backend/api/properties/upload.php')),
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
      catchError(() => tryGet(`/P_demo_5/backend/api/properties/my-properties.php?user_id=${userId}`)),
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
      catchError(() => tryPost('/P_demo_5/backend/api/admin/bulk-upload.php')),
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
      catchError(() => tryGet('/P_demo_5/backend/api/geo/reverse.php')),
      catchError(() => tryGet('/api/geo/reverse.php')),
      catchError(() => tryGet(`${environment.apacheApiUrl}/geo/reverse.php`)),
      catchError(() => {
        // Direct Nominatim fallback if local backend endpoint fails
        return this.http.get<any>(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`).pipe(
          map(data => {
            if (!data || !data.display_name) return null;
            const addr = data.address || {};
            const loc = addr.suburb || addr.neighbourhood || addr.village || addr.city_district || addr.town || addr.municipality || '';
            const city = addr.city || addr.town || addr.municipality || addr.state_district || addr.county || loc || '';
            const compactTitle = [data.name, loc, city, addr.postcode].filter(Boolean).join(', ');
            return {
              displayName: data.display_name,
              compactTitle: compactTitle || data.display_name,
              name: data.name || loc,
              locality: loc,
              city: city,
              district: addr.state_district || addr.county || addr.district || '',
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
      catchError(() => tryGet('/P_demo_5/backend/api/geo/reverse.php')),
      catchError(() => tryGet('/p_demo_5/backend/api/geo/reverse.php')),
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

