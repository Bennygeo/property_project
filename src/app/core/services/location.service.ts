import { Injectable, inject, signal, computed, NgZone } from '@angular/core';
import { PropertyService, ReverseGeocodeResult } from './property.service';
import { NotificationService } from './notification.service';

export interface TamilNaduDistrict {
  id: string;
  name: string;
  lat: number;
  lon: number;
  altNames?: string[];
  region: 'Northern' | 'Western' | 'Central' | 'Southern' | 'Cauvery Delta';
  isPopular?: boolean;
}

export const TAMIL_NADU_DISTRICTS: TamilNaduDistrict[] = [
  // Popular Major Real Estate Hubs
  { id: 'chennai', name: 'Chennai', lat: 13.0827, lon: 80.2707, altNames: ['Madras'], region: 'Northern', isPopular: true },
  { id: 'coimbatore', name: 'Coimbatore', lat: 11.0168, lon: 76.9558, altNames: ['Kovai', 'Pollachi'], region: 'Western', isPopular: true },
  { id: 'madurai', name: 'Madurai', lat: 9.9252, lon: 78.1198, altNames: ['Usilampatti', 'Melur'], region: 'Southern', isPopular: true },
  { id: 'tiruchirappalli', name: 'Tiruchirappalli', lat: 10.7905, lon: 78.7047, altNames: ['Trichy', 'Tiruchirapalli', 'Tiruchi', 'Tiruchchirappalli', 'Srirangam'], region: 'Central', isPopular: true },
  { id: 'salem', name: 'Salem', lat: 11.6643, lon: 78.1460, altNames: ['Attur', 'Mettur'], region: 'Western', isPopular: true },
  { id: 'chengalpattu', name: 'Chengalpattu', lat: 12.6819, lon: 79.9888, altNames: ['Chengalpet', 'Chingleput', 'Tambaram', 'Pallavaram', 'Chromepet', 'Maraimalai Nagar'], region: 'Northern', isPopular: true },
  { id: 'kanchipuram', name: 'Kanchipuram', lat: 12.8342, lon: 79.7036, altNames: ['Kancheepuram', 'Conjeevaram', 'Sriperumbudur'], region: 'Northern', isPopular: true },
  { id: 'tiruvallur', name: 'Tiruvallur', lat: 13.1434, lon: 79.9079, altNames: ['Thiruvallur', 'Avadi', 'Poonamallee', 'Ponneri', 'Gummidipoondi'], region: 'Northern', isPopular: true },
  { id: 'dharmapuri', name: 'Dharmapuri', lat: 12.1211, lon: 78.1582, altNames: ['Harur', 'Palacode'], region: 'Western', isPopular: true },
  { id: 'tiruppur', name: 'Tiruppur', lat: 11.1085, lon: 77.3411, altNames: ['Tirupur', 'Avinashi', 'Dharapuram', 'Udumalaipettai'], region: 'Western', isPopular: true },
  { id: 'erode', name: 'Erode', lat: 11.3410, lon: 77.7172, altNames: ['Perundurai', 'Gobichettipalayam', 'Bhavani'], region: 'Western', isPopular: true },
  { id: 'vellore', name: 'Vellore', lat: 12.9165, lon: 79.1325, altNames: ['Katpadi', 'Gudiyatham'], region: 'Northern', isPopular: true },
  { id: 'tirunelveli', name: 'Tirunelveli', lat: 8.7139, lon: 77.7567, altNames: ['Nellai', 'Thirunelveli', 'Palayamkottai', 'Ambasamudram'], region: 'Southern', isPopular: true },
  { id: 'thanjavur', name: 'Thanjavur', lat: 10.7870, lon: 79.1378, altNames: ['Tanjore', 'Kumbakonam', 'Pattukkottai'], region: 'Cauvery Delta', isPopular: true },
  { 
    id: 'kanyakumari', 
    name: 'Kanyakumari', 
    lat: 8.0883, 
    lon: 77.5385, 
    altNames: [
      'Kanniyakumari', 
      'Kanyakumari District', 
      'Nagercoil', 
      'Agastheeswaram', 
      'Agastheswaram', 
      'Cape Comorin', 
      'Padmanabhapuram', 
      'Colachel', 
      'Kuzhithurai', 
      'Thuckalay', 
      'Marthandam', 
      'Killiyoor', 
      'Vilavancode', 
      'Thovalai', 
      'Kalkulam'
    ], 
    region: 'Southern', 
    isPopular: true 
  },

  // Remaining 23 Districts of Tamil Nadu (Total 38 Districts)
  { id: 'ariyalur', name: 'Ariyalur', lat: 11.1401, lon: 79.0786, altNames: ['Jayankondam'], region: 'Cauvery Delta' },
  { id: 'cuddalore', name: 'Cuddalore', lat: 11.7480, lon: 79.7714, altNames: ['Chidambaram', 'Panruti', 'Vridhachalam', 'Neyveli'], region: 'Northern' },
  { id: 'dindigul', name: 'Dindigul', lat: 10.3673, lon: 77.9803, altNames: ['Palani', 'Kodaikanal', 'Oddanchatram'], region: 'Southern' },
  { id: 'kallakurichi', name: 'Kallakurichi', lat: 11.7384, lon: 78.9639, altNames: ['Kallakkurichi', 'Sankarapuram', 'Ulundurpet'], region: 'Northern' },
  { id: 'karur', name: 'Karur', lat: 10.9601, lon: 78.0766, altNames: ['Kulithalai'], region: 'Central' },
  { id: 'krishnagiri', name: 'Krishnagiri', lat: 12.5186, lon: 78.2137, altNames: ['Hosur', 'Pochampalli', 'Denkanikottai'], region: 'Western' },
  { id: 'mayiladuthurai', name: 'Mayiladuthurai', lat: 11.1075, lon: 79.6524, altNames: ['Mayuram', 'Mayavaram', 'Sirkazhi', 'Tharangambadi'], region: 'Cauvery Delta' },
  { id: 'nagapattinam', name: 'Nagapattinam', lat: 10.7672, lon: 79.8449, altNames: ['Nagai', 'Nagapatnam', 'Velankanni', 'Vedaranyam'], region: 'Cauvery Delta' },
  { id: 'namakkal', name: 'Namakkal', lat: 11.2189, lon: 78.1674, altNames: ['Rasipuram', 'Tiruchengode', 'Paramathi Velur'], region: 'Western' },
  { id: 'nilgiris', name: 'Nilgiris', lat: 11.4102, lon: 76.6950, altNames: ['The Nilgiris', 'Ooty', 'Udhagamandalam', 'Coonoor', 'Kotagiri', 'Gudalur'], region: 'Western' },
  { id: 'perambalur', name: 'Perambalur', lat: 11.2342, lon: 78.8820, region: 'Central' },
  { id: 'pudukkottai', name: 'Pudukkottai', lat: 10.3833, lon: 78.8001, altNames: ['Pudukottai', 'Aranthangi'], region: 'Central' },
  { id: 'ramanathapuram', name: 'Ramanathapuram', lat: 9.3639, lon: 78.8395, altNames: ['Ramnad', 'Rameswaram', 'Paramakudi', 'Kilakarai'], region: 'Southern' },
  { id: 'ranipet', name: 'Ranipet', lat: 12.9274, lon: 79.3330, altNames: ['Arcot', 'Walajapet', 'Arakkonam', 'Sholinghur'], region: 'Northern' },
  { id: 'sivaganga', name: 'Sivaganga', lat: 9.8433, lon: 78.4809, altNames: ['Sivagangai', 'Karaikudi', 'Devakottai', 'Manamadurai'], region: 'Southern' },
  { id: 'tenkasi', name: 'Tenkasi', lat: 8.9594, lon: 77.3150, altNames: ['Courtallam', 'Sankarankovil', 'Kadayanallur'], region: 'Southern' },
  { id: 'theni', name: 'Theni', lat: 10.0104, lon: 77.4768, altNames: ['Periyakulam', 'Bodinayakanur', 'Cumbum', 'Uthamapalayam'], region: 'Southern' },
  { id: 'thoothukudi', name: 'Thoothukudi', lat: 8.7642, lon: 78.1348, altNames: ['Tuticorin', 'Thoothukkudi', 'Kovilpatti', 'Tiruchendur', 'Kayalpattinam'], region: 'Southern' },
  { id: 'tirupathur', name: 'Tirupathur', lat: 12.4925, lon: 78.5678, altNames: ['Tirupattur', 'Thirupattur', 'Thirupathur', 'Vaniyambadi', 'Ambur', 'Natrampalli'], region: 'Northern' },
  { id: 'tiruvannamalai', name: 'Tiruvannamalai', lat: 12.2253, lon: 79.0747, altNames: ['Thiruvannamalai', 'Arani', 'Polur', 'Chengam', 'Cheyyar'], region: 'Northern' },
  { id: 'tiruvarur', name: 'Tiruvarur', lat: 10.7725, lon: 79.6365, altNames: ['Thiruvarur', 'Mannargudi', 'Thiruthuraipoondi'], region: 'Cauvery Delta' },
  { id: 'viluppuram', name: 'Viluppuram', lat: 11.9401, lon: 79.4861, altNames: ['Villupuram', 'Tindivanam', 'Gingee', 'Vanur'], region: 'Northern' },
  { id: 'virudhunagar', name: 'Virudhunagar', lat: 9.5872, lon: 77.9514, altNames: ['Sivakasi', 'Rajapalayam', 'Aruppukkottai', 'Srivilliputhur', 'Sattur'], region: 'Southern' },
];

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private propertyService = inject(PropertyService);
  private notificationService = inject(NotificationService);
  private ngZone = inject(NgZone);

  private readonly STORAGE_KEY = 'fap_user_district';
  private readonly STORAGE_SOURCE_KEY = 'fap_user_location_source';
  private readonly STORAGE_MANUAL_FLAG = 'fap_user_district_manual';

  /** All 38 Tamil Nadu districts list */
  readonly districts = TAMIL_NADU_DISTRICTS;

  /** Popular districts for one-tap quick chips */
  readonly popularDistricts = computed(() => this.districts.filter(d => d.isPopular));

  /** Currently selected Tamil Nadu district */
  readonly selectedDistrict = signal<string>(this.getStoredDistrict());

  /** Increments every time setDistrict() is called so search bars re-sync when header district changes */
  readonly districtChangeRevision = signal<number>(0);

  /** Additional granular detected locality/suburb if resolved from GPS (e.g. Nagercoil, Adyar) */
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
    if (typeof window !== 'undefined') {
      const isManual = localStorage.getItem(this.STORAGE_MANUAL_FLAG) === 'true';
      // If user has not explicitly locked a district manually from the dropdown,
      // run GPS detection so their true physical location (e.g. Kanyakumari) is detected.
      if (!isManual) {
        this.detectLocation({ autoPromptOnBlock: false, silentOnSuccess: true });
      }
      this.checkPermissionStatus();
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
      this.ngZone.run(() => {
        if (status.state === 'denied') {
          this.isBlocked.set(true);
        } else if (status.state === 'granted') {
          this.isBlocked.set(false);
        }
      });

      status.onchange = () => {
        this.ngZone.run(() => {
          if (status.state === 'denied') {
            this.isBlocked.set(true);
          } else if (status.state === 'granted') {
            this.isBlocked.set(false);
            const isManual = localStorage.getItem(this.STORAGE_MANUAL_FLAG) === 'true';
            if (!isManual) {
              // Browser permission was just granted! Immediately detect GPS location without refresh
              this.detectLocation({ autoPromptOnBlock: false, silentOnSuccess: false });
            }
          }
        });
      };
    } catch {
      // Permission API not supported for geolocation in some browsers
    }
  }

  /**
   * Calculates great-circle distance between two GPS coordinates in kilometers
   */
  getHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's mean radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Mathematically finds the nearest Tamil Nadu district to the given GPS coordinates
   */
  findNearestDistrict(lat: number, lon: number): TamilNaduDistrict {
    let nearest = this.districts[0];
    let minDistance = Infinity;

    for (const d of this.districts) {
      const dist = this.getHaversineDistanceKm(lat, lon, d.lat, d.lon);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = d;
      }
    }

    return nearest;
  }

  /**
   * Detect user location using browser Geolocation API and reverse geocode to Tamil Nadu
   */
  detectLocation(options: { autoPromptOnBlock?: boolean; silentOnSuccess?: boolean } = {}): void {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      this.ngZone.run(() => {
        this.isBlocked.set(true);
        if (options.autoPromptOnBlock) {
          this.openDistrictModal();
        }
      });
      return;
    }

    this.isDetecting.set(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.ngZone.run(() => {
          const { latitude, longitude } = position.coords;
          this.isBlocked.set(false);

          // 1. Instantly determine and set nearest Tamil Nadu district (0ms mathematical resolution!)
          const nearest = this.findNearestDistrict(latitude, longitude);
          this.setDistrict(nearest.name, 'gps');
          this.isDetecting.set(false);

          if (!options.silentOnSuccess) {
            this.notificationService.show({
              type: 'success',
              title: 'Location Detected',
              message: `${nearest.name}, Tamil Nadu`,
              icon: 'location_on'
            }, 4000);
          }
          this.closeDistrictModal();

          // 2. In background, refine granular locality (e.g. Nagercoil, Adyar) via reverse geocode
          this.propertyService.reverseGeocode(latitude, longitude).subscribe({
            next: (res: ReverseGeocodeResult | null) => {
              this.ngZone.run(() => {
                if (res) {
                  const matchedDistrict = this.matchToTamilNaduDistrict(res, latitude, longitude);
                  if (matchedDistrict && matchedDistrict.name !== nearest.name) {
                    this.setDistrict(matchedDistrict.name, 'gps');
                  }
                  const locality = res.locality || res.city;
                  if (locality && locality.toLowerCase() !== (matchedDistrict?.name || nearest.name).toLowerCase()) {
                    this.detectedLocality.set(locality);
                  }
                }
              });
            },
            error: () => {
              // Nearest district is already active and set
            }
          });
        });
      },
      (error) => {
        this.ngZone.run(() => {
          this.isDetecting.set(false);
          // Error code 1 = PERMISSION_DENIED
          if (error.code === 1 || error.code === error.PERMISSION_DENIED) {
            this.isBlocked.set(true);
          }

          if (options.autoPromptOnBlock || !options.silentOnSuccess) {
            this.openDistrictModal();
          }
        });
      },
      {
        enableHighAccuracy: false,
        timeout: 20000,
        maximumAge: 300000
      }
    );
  }

  /**
   * Matches reverse geocode result to one of the 38 Tamil Nadu districts.
   * Uses both text parsing (including dual spellings like Kanniyakumari / Kanyakumari / Nagercoil)
   * and GPS distance verification.
   */
  private matchToTamilNaduDistrict(
    res: ReverseGeocodeResult, 
    lat?: number, 
    lon?: number
  ): TamilNaduDistrict | null {
    const rawDistrict = (res.district || '').toLowerCase();
    const rawCity = (res.city || '').toLowerCase();
    const rawLocality = (res.locality || '').toLowerCase();
    const rawDisplay = (res.displayName || '').toLowerCase();
    const rawState = (res.state || '').toLowerCase();

    // 1. Text matching against district name and comprehensive aliases
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

    // 2. If coordinates are provided, find closest Tamil Nadu district by GPS distance
    if (lat !== undefined && lon !== undefined) {
      const nearest = this.findNearestDistrict(lat, lon);
      const distKm = this.getHaversineDistanceKm(lat, lon, nearest.lat, nearest.lon);
      // If within 180 km of a TN district center, or state indicates Tamil Nadu / India
      if (distKm <= 180 || rawState.includes('tamil') || rawState.includes('tn') || rawDisplay.includes('tamil nadu')) {
        return nearest;
      }
    }

    // 3. Fallback: if state is Tamil Nadu, return nearest district to coordinates
    if (lat !== undefined && lon !== undefined) {
      return this.findNearestDistrict(lat, lon);
    }

    return null;
  }

  /**
   * Select a Tamil Nadu district (manual or via GPS)
   */
  setDistrict(districtName: string, source: 'manual' | 'gps' = 'manual'): void {
    this.ngZone.run(() => {
      const matched = this.districts.find(
        d => d.name.toLowerCase() === districtName.toLowerCase() ||
          d.altNames?.some(a => a.toLowerCase() === districtName.toLowerCase())
      );

      const name = matched ? matched.name : districtName;
      this.selectedDistrict.set(name);
      this.districtChangeRevision.update(n => n + 1);

      if (source === 'manual') {
        this.detectedLocality.set(null);
      }

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(this.STORAGE_KEY, name);
          localStorage.setItem(this.STORAGE_SOURCE_KEY, source);
          if (source === 'manual') {
            localStorage.setItem(this.STORAGE_MANUAL_FLAG, 'true');
          } else {
            localStorage.removeItem(this.STORAGE_MANUAL_FLAG);
          }
        } catch (err) {
          console.warn('Could not persist district to localStorage', err);
        }
      }

      this.closeDistrictModal();
    });
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
