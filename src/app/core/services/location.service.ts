import { Injectable, inject, signal, computed } from '@angular/core';
import { PropertyService, ReverseGeocodeResult } from './property.service';
import { NotificationService } from './notification.service';

export interface TamilNaduDistrict {
  id: string;
  name: string;
  altNames?: string[];
  region: 'Northern' | 'Western' | 'Central' | 'Southern' | 'Cauvery Delta';
  isPopular?: boolean;
}

export const TAMIL_NADU_DISTRICTS: TamilNaduDistrict[] = [
  // Popular Major Real Estate Hubs
  { id: 'chennai', name: 'Chennai', region: 'Northern', isPopular: true },
  { id: 'coimbatore', name: 'Coimbatore', region: 'Western', isPopular: true },
  { id: 'madurai', name: 'Madurai', region: 'Southern', isPopular: true },
  { id: 'tiruchirappalli', name: 'Tiruchirappalli', altNames: ['Trichy'], region: 'Central', isPopular: true },
  { id: 'salem', name: 'Salem', region: 'Western', isPopular: true },
  { id: 'chengalpattu', name: 'Chengalpattu', region: 'Northern', isPopular: true },
  { id: 'kanchipuram', name: 'Kanchipuram', region: 'Northern', isPopular: true },
  { id: 'tiruvallur', name: 'Tiruvallur', region: 'Northern', isPopular: true },
  { id: 'dharmapuri', name: 'Dharmapuri', region: 'Western', isPopular: true },
  { id: 'tiruppur', name: 'Tiruppur', region: 'Western', isPopular: true },
  { id: 'erode', name: 'Erode', region: 'Western', isPopular: true },
  { id: 'vellore', name: 'Vellore', region: 'Northern', isPopular: true },
  { id: 'tirunelveli', name: 'Tirunelveli', region: 'Southern', isPopular: true },
  { id: 'thanjavur', name: 'Thanjavur', region: 'Cauvery Delta', isPopular: true },

  // All Remaining Districts of Tamil Nadu (Total 38 Districts)
  { id: 'ariyalur', name: 'Ariyalur', region: 'Cauvery Delta' },
  { id: 'cuddalore', name: 'Cuddalore', region: 'Northern' },
  { id: 'dindigul', name: 'Dindigul', region: 'Southern' },
  { id: 'kallakurichi', name: 'Kallakurichi', region: 'Northern' },
  { id: 'kanyakumari', name: 'Kanyakumari', region: 'Southern' },
  { id: 'karur', name: 'Karur', region: 'Central' },
  { id: 'krishnagiri', name: 'Krishnagiri', region: 'Western' },
  { id: 'mayiladuthurai', name: 'Mayiladuthurai', region: 'Cauvery Delta' },
  { id: 'nagapattinam', name: 'Nagapattinam', region: 'Cauvery Delta' },
  { id: 'namakkal', name: 'Namakkal', region: 'Western' },
  { id: 'nilgiris', name: 'Nilgiris', altNames: ['Ooty', 'Udhagamandalam'], region: 'Western' },
  { id: 'perambalur', name: 'Perambalur', region: 'Central' },
  { id: 'pudukkottai', name: 'Pudukkottai', region: 'Central' },
  { id: 'ramanathapuram', name: 'Ramanathapuram', region: 'Southern' },
  { id: 'ranipet', name: 'Ranipet', region: 'Northern' },
  { id: 'sivaganga', name: 'Sivaganga', region: 'Southern' },
  { id: 'tenkasi', name: 'Tenkasi', region: 'Southern' },
  { id: 'theni', name: 'Theni', region: 'Southern' },
  { id: 'thoothukudi', name: 'Thoothukudi', altNames: ['Tuticorin'], region: 'Southern' },
  { id: 'tirupathur', name: 'Tirupathur', region: 'Northern' },
  { id: 'tiruvannamalai', name: 'Tiruvannamalai', region: 'Northern' },
  { id: 'tiruvarur', name: 'Tiruvarur', region: 'Cauvery Delta' },
  { id: 'viluppuram', name: 'Viluppuram', region: 'Northern' },
  { id: 'virudhunagar', name: 'Virudhunagar', region: 'Southern' },
];

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private propertyService = inject(PropertyService);
  private notificationService = inject(NotificationService);

  private readonly STORAGE_KEY = 'fap_user_district';
  private readonly STORAGE_SOURCE_KEY = 'fap_user_location_source';

  /** All 38 Tamil Nadu districts list */
  readonly districts = TAMIL_NADU_DISTRICTS;

  /** Popular districts for one-tap quick chips */
  readonly popularDistricts = computed(() => this.districts.filter(d => d.isPopular));

  /** Currently selected Tamil Nadu district */
  readonly selectedDistrict = signal<string>(this.getStoredDistrict());

  /** Additional granular detected locality/suburb if resolved from GPS (e.g. Adyar, Saravanampatti) */
  readonly detectedLocality = signal<string | null>(null);

  /** Detection in progress flag */
  readonly isDetecting = signal<boolean>(false);

  /** Location access denied or blocked by user */
  readonly isBlocked = signal<boolean>(false);

  /** District selector modal open/close state */
  readonly isModalOpen = signal<boolean>(false);

  /** Filter query in the district selection dialog */
  readonly searchQuery = signal<string>('');

  /** Filtered districts list based on typeahead query */
  readonly filteredDistricts = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return this.districts;
    return this.districts.filter(d => {
      const matchName = d.name.toLowerCase().includes(q);
      const matchAlt = d.altNames?.some(alt => alt.toLowerCase().includes(q));
      const matchRegion = d.region.toLowerCase().includes(q);
      return matchName || matchAlt || matchRegion;
    });
  });

  constructor() {
    // If no district is stored yet, auto-attempt gentle geolocation detection on load
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (!saved) {
        // First-time visit: attempt detection gently. If blocked, prompt modal.
        this.detectLocation({ autoPromptOnBlock: true, silentOnSuccess: true });
      } else {
        // Check if browser permission is already denied
        this.checkPermissionStatus();
      }
    }
  }

  private getStoredDistrict(): string {
    if (typeof window === 'undefined') return 'Chennai';
    try {
      return localStorage.getItem(this.STORAGE_KEY) || 'Chennai';
    } catch {
      return 'Chennai';
    }
  }

  /**
   * Check browser permission status if supported
   */
  async checkPermissionStatus(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.permissions) return;
    try {
      const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      if (status.state === 'denied') {
        this.isBlocked.set(true);
      }
      status.onchange = () => {
        if (status.state === 'denied') {
          this.isBlocked.set(true);
        } else if (status.state === 'granted') {
          this.isBlocked.set(false);
        }
      };
    } catch {
      // Permission API not supported for geolocation in some browsers
    }
  }

  /**
   * Detect user location using browser Geolocation API and reverse geocode to Tamil Nadu
   */
  detectLocation(options: { autoPromptOnBlock?: boolean; silentOnSuccess?: boolean } = {}): void {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      this.isBlocked.set(true);
      if (options.autoPromptOnBlock) {
        this.openDistrictModal();
      }
      return;
    }

    this.isDetecting.set(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        this.isBlocked.set(false);

        // Reverse geocode via PropertyService
        this.propertyService.reverseGeocode(latitude, longitude).subscribe({
          next: (res: ReverseGeocodeResult | null) => {
            this.isDetecting.set(false);
            if (res) {
              const matchedDistrict = this.matchToTamilNaduDistrict(res);
              if (matchedDistrict) {
                this.setDistrict(matchedDistrict.name, 'gps');
                if (res.locality && res.locality !== matchedDistrict.name) {
                  this.detectedLocality.set(res.locality);
                }
                if (!options.silentOnSuccess) {
                  this.notificationService.show({
                    type: 'success',
                    title: 'Location Detected',
                    message: `${matchedDistrict.name}, Tamil Nadu`,
                    icon: 'location_on'
                  }, 4000);
                }
                this.closeDistrictModal();
              } else {
                // Location is outside Tamil Nadu or not matched
                if (!options.silentOnSuccess) {
                  this.notificationService.show({
                    type: 'info',
                    title: 'Tamil Nadu Region',
                    message: 'Find a Plot currently operates in Tamil Nadu. Please select your district.',
                    icon: 'map'
                  }, 5000);
                }
                this.openDistrictModal();
              }
            } else {
              // Geocode returned null
              if (!options.silentOnSuccess) {
                this.notificationService.show({
                  type: 'info',
                  title: 'Select District',
                  message: 'Please choose your district from Tamil Nadu.',
                  icon: 'explore'
                }, 4000);
              }
              this.openDistrictModal();
            }
          },
          error: () => {
            this.isDetecting.set(false);
            this.openDistrictModal();
          }
        });
      },
      (error) => {
        this.isDetecting.set(false);
        // Error code 1 = PERMISSION_DENIED
        if (error.code === 1 || error.code === error.PERMISSION_DENIED) {
          this.isBlocked.set(true);
        }

        if (options.autoPromptOnBlock || !options.silentOnSuccess) {
          this.openDistrictModal();
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 9000,
        maximumAge: 120000
      }
    );
  }

  /**
   * Matches reverse geocode result to one of the 38 Tamil Nadu districts
   */
  private matchToTamilNaduDistrict(res: ReverseGeocodeResult): TamilNaduDistrict | null {
    const rawState = (res.state || '').toLowerCase();
    const rawDistrict = (res.district || '').toLowerCase();
    const rawCity = (res.city || '').toLowerCase();
    const rawLocality = (res.locality || '').toLowerCase();
    const rawDisplay = (res.displayName || '').toLowerCase();

    // Check against all districts
    for (const d of this.districts) {
      const dName = d.name.toLowerCase();
      const dId = d.id.toLowerCase();
      const altNames = (d.altNames || []).map(a => a.toLowerCase());

      const namesToCheck = [dName, dId, ...altNames];

      for (const name of namesToCheck) {
        if (
          rawDistrict.includes(name) ||
          rawCity.includes(name) ||
          rawLocality.includes(name) ||
          rawDisplay.includes(name)
        ) {
          return d;
        }
      }
    }

    // If state is Tamil Nadu or TN, default to Chennai or closest
    if (rawState.includes('tamil') || rawState.includes('tn')) {
      return this.districts[0]; // Chennai
    }

    return null;
  }

  /**
   * Manually select a Tamil Nadu district
   */
  setDistrict(districtName: string, source: 'manual' | 'gps' = 'manual'): void {
    const matched = this.districts.find(
      d => d.name.toLowerCase() === districtName.toLowerCase() ||
           d.altNames?.some(a => a.toLowerCase() === districtName.toLowerCase())
    );

    const name = matched ? matched.name : districtName;
    this.selectedDistrict.set(name);

    if (source === 'manual') {
      this.detectedLocality.set(null);
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.STORAGE_KEY, name);
        localStorage.setItem(this.STORAGE_SOURCE_KEY, source);
      } catch (err) {
        console.warn('Could not persist district to localStorage', err);
      }
    }

    this.closeDistrictModal();
  }

  openDistrictModal(): void {
    this.searchQuery.set('');
    this.isModalOpen.set(true);
  }

  closeDistrictModal(): void {
    this.isModalOpen.set(false);
    this.searchQuery.set('');
  }

  setSearchQuery(query: string): void {
    this.searchQuery.set(query);
  }
}
