import { Component, OnInit, inject, signal, computed, HostListener, ViewChild, ElementRef } from '@angular/core';
import { validateGpsData, haversineDistanceKm, findSearchCenterCoordinates, extractCoordinates, annotateInterPropertyProximity, GpsCoordinates } from '../../../../core/utils/gps-helper';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Property, PropertyType } from '../../../../core/models/property.model';
import { PropertyService, NearbyLocality, DistrictItem, DistrictHubItem, RegionalGroupItem, ReverseGeocodeResult } from '../../../../core/services/property.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { MetroService } from '../../../../core/services/metro.service';
import { TopConciergeBarComponent } from '../../../home/components/top-concierge-bar/top-concierge-bar.component';
import { HeaderComponent } from '../../../home/components/header/header.component';
import { FooterComponent } from '../../../home/components/footer/footer.component';
import { PropertyCardComponent } from '../../../home/components/property-card/property-card.component';
import { PropertyMediaModalComponent } from '../../../home/components/property-media-modal/property-media-modal.component';
import { TopupDialogComponent } from '../../../home/components/topup-dialog/topup-dialog.component';
import { ToastComponent } from '../../../home/components/toast/toast.component';
import { AiChatModalComponent } from '../../../home/components/ai-chat-modal/ai-chat-modal.component';
import { AuthService } from '../../../../core/services/auth.service';
import { MOCK_50_PROPERTIES } from '../../../../core/services/mock-properties-data';

export interface FilterOption {
  value: string;
  label: string;
  icon?: string;
}

export interface SearchSuggestion {
  label: string;
  sub: string;
  type: 'locality' | 'project' | 'developer' | 'corridor' | 'city' | 'google_place';
  icon: string;
  query: string;
  placeId?: string;
  fullText?: string;
}

function parsePriceToNumber(priceStr: string): number {
  if (!priceStr) return 0;
  const clean = priceStr.replace(/₹|,/g, '').trim().toLowerCase();
  if (clean.includes('cr')) {
    const num = parseFloat(clean.replace('cr', '').trim());
    return isNaN(num) ? 0 : num * 10000000;
  }
  if (clean.includes('lakh') || clean.includes('l')) {
    const num = parseFloat(clean.replace(/lakh|l/g, '').trim());
    return isNaN(num) ? 0 : num * 100000;
  }
  const direct = parseFloat(clean);
  return isNaN(direct) ? 0 : direct;
}

function parseRateToNumber(rateStr: string): number {
  if (!rateStr) return 0;
  const num = parseFloat(rateStr.replace(/[^0-9.]/g, ''));
  return isNaN(num) ? 0 : num;
}

function extractBedCount(bhkBadge: string, title: string): number {
  const match = (bhkBadge + ' ' + title).match(/(\d+)\s*(?:bed|bhk)/i);
  return match ? parseInt(match[1], 10) : 0;
}

@Component({
  selector: 'app-search-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    TopConciergeBarComponent,
    HeaderComponent,
    FooterComponent,
    PropertyCardComponent,
    PropertyMediaModalComponent,
    TopupDialogComponent,
    ToastComponent,
    AiChatModalComponent
  ],
  templateUrl: './search-page.component.html',
  styleUrls: ['./search-page.component.css']
})
export class SearchPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly propertyService = inject(PropertyService);
  readonly notificationService = inject(NotificationService);
  readonly metroService = inject(MetroService);
  readonly authService = inject(AuthService);

  // Target District Selection Signal (Dynamically loaded from MySQL Database)
  readonly selectedDistrict = signal<string>('');
  readonly districtsList = signal<DistrictItem[]>([]);
  readonly mainHubs = signal<DistrictHubItem[]>([]);
  readonly regionalGroups = signal<RegionalGroupItem[]>([]);
  readonly isDistrictDropdownOpen = signal<boolean>(false);
  readonly districtSearchQuery = signal<string>('');

  readonly totalDistrictsCount = computed(() => {
    return this.districtsList().length || 37;
  });

  readonly totalAllPropertiesCount = computed(() => {
    return this.propertyService.totalApiProperties() || 1896;
  });

  readonly filteredMainHubs = computed(() => {
    const q = this.districtSearchQuery().trim().toLowerCase();
    const hubs = this.mainHubs();
    if (!q) return hubs;
    return hubs.filter(h => h.name.toLowerCase().includes(q));
  });

  readonly filteredRegionalGroups = computed(() => {
    const q = this.districtSearchQuery().trim().toLowerCase();
    const groups = this.regionalGroups();
    if (!q) return groups;
    return groups
      .map(g => ({
        regionName: g.regionName,
        districts: g.districts.filter(d => d.name.toLowerCase().includes(q))
      }))
      .filter(g => g.districts.length > 0);
  });

  toggleDistrictDropdown(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const nextState = !this.isDistrictDropdownOpen();
    this.isDistrictDropdownOpen.set(nextState);
    if (nextState) {
      this.isSuggestionsOpen.set(false);
    }
  }

  clearDistrictSelection(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.onDistrictChange('');
    this.isDistrictDropdownOpen.set(false);
  }

  onSelectDistrictOption(districtName: string): void {
    this.isDistrictDropdownOpen.set(false);
    this.districtSearchQuery.set('');
    this.onDistrictChange(districtName);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.district-target-selector')) {
      this.isDistrictDropdownOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.isDistrictDropdownOpen.set(false);
    this.isSuggestionsOpen.set(false);
  }

  @ViewChild('omniboxInput') omniboxInputRef?: ElementRef<HTMLInputElement>;

  getDistrictLocalityHint(district: string): string {
    const found = this.districtsList().find(d => d.name.toLowerCase() === district.toLowerCase());
    if (found && found.topLocalities && found.topLocalities.length > 0) {
      return found.topLocalities.join(', ');
    }
    return 'localities or layouts';
  }

  onDistrictChange(district: string): void {
    this.selectedDistrict.set(district);
    const trimmed = this.rawSearchInput().trim();

    // 1. Target suggestions specifically to this district/region
    this.propertyService.fetchSuggestions(trimmed, district).subscribe(res => {
      this.liveDbSuggestions.set(res);
      if (district) {
        this.isSuggestionsOpen.set(true);
      }
    });

    if (trimmed.length >= 2) {
      this.propertyService.fetchGooglePlaces(trimmed, district).subscribe(places => {
        this.googlePlacesSuggestions.set(places);
      });
    }

    // 2. Load contextual nearby localities preview for this district (without querying properties)
    if (district) {
      this.propertyService.fetchNearbyData({ district }).subscribe(res => {
        if (res.nearbyLocalities && res.nearbyLocalities.length > 0) {
          this.nearbyLocalities.set(res.nearbyLocalities);
          this.nearbyContextLabel.set(`Popular Localities in ${district}`);
        }
      });

      // 3. User Experience: Focus the search omnibox so user can quickly type or pick from suggestions
      setTimeout(() => {
        this.omniboxInputRef?.nativeElement?.focus();
      }, 60);
    } else {
      // If district was cleared (e.g. clicking clear or picking "All Districts & Regions"), refresh query results
      this.displayedCount.set(20);
      this.fetchFilteredFromApi();
      this.syncUrlParams();
    }
  }

  // Multi-Level Locality / Area Tag Signals (NoBroker Style)
  readonly selectedLocalities = signal<string[]>([]);
  readonly rawSearchInput = signal<string>('');
  readonly liveDbSuggestions = signal<SearchSuggestion[]>([]);
  readonly googlePlacesSuggestions = signal<SearchSuggestion[]>([]);

  // Nearby Locality Areas Signals
  readonly nearbyLocalities = signal<NearbyLocality[]>([]);
  readonly nearbyProperties = signal<Property[]>([]);
  readonly nearbyContextLabel = signal<string>('Nearby Locality Areas');

  readonly currentSearchLocalityName = computed<string>(() => {
    const locs = this.selectedLocalities();
    if (locs.length > 0) return locs[0];
    const dist = this.selectedDistrict();
    if (dist) return dist;
    const q = this.searchQuery().trim();
    if (q) return q;
    const city = this.selectedCity();
    if (city !== 'all') return city.toUpperCase();
    return 'your searched area';
  });

  // Filter Signals
  readonly searchQuery = signal<string>('');
  readonly selectedCity = signal<string>('all');
  readonly selectedType = signal<string>('all');
  readonly selectedDeveloper = signal<string>('all');
  readonly selectedBudget = signal<string>('all');
  readonly selectedBhk = signal<string>('all');
  readonly sortBy = signal<string>('featured');
  readonly viewMode = signal<'grid' | 'list'>('grid');

  // Master Builders from Database
  readonly buildersList = signal<{ name: string; propertyCount: number }[]>([]);
  readonly builderSearchQuery = signal<string>('');
  readonly isBuilderListExpanded = signal<boolean>(false);

  readonly totalAllBuildersProperties = computed<number>(() => {
    const list = this.buildersList();
    if (list && list.length > 0) {
      const sum = list.reduce((acc, b) => acc + (b.propertyCount || 0), 0);
      if (sum > 0) return sum;
    }
    const apiTotal = this.propertyService.totalApiProperties();
    if (apiTotal > 0 && this.selectedDeveloper() === 'all' && !this.searchQuery() && this.selectedLocalities().length === 0) {
      return apiTotal;
    }
    return 1896;
  });

  readonly filteredBuilders = computed(() => {
    const q = this.builderSearchQuery().trim().toLowerCase();
    const list = this.buildersList();
    if (!q) return list;
    return list.filter(b => b.name.toLowerCase().includes(q));
  });

  readonly displayedBuilders = computed(() => {
    const list = this.filteredBuilders();
    if (this.isBuilderListExpanded() || this.builderSearchQuery().trim()) {
      return list;
    }
    return list.slice(0, 8);
  });

  // Infinite Scroll & GPS Radius Search Signals (Initially show 20, load 10 on scroll)
  // 99acres / NoBroker Live Suggestions & Omnibox Signals
  readonly isSuggestionsOpen = signal<boolean>(false);
  private searchDebounceTimer: any = null;

  readonly displayedCount = signal<number>(20);
  readonly isRadiusExtendedSearch = signal<boolean>(false);
  readonly radiusSearchLocationName = signal<string>('');
  readonly radiusFoundCount = signal<number>(0);

  // Live User GPS / Nearby < 5km Signals
  readonly isGeolocationAvailable = signal<boolean>(false);
  readonly isLocatingUser = signal<boolean>(false);
  readonly isNearbyGpsActive = signal<boolean>(false);
  readonly userCoordinates = signal<GpsCoordinates | null>(null);
  readonly isNearbyProcessing = signal<boolean>(false);

  // Address Confirmation Modal State (Option 3 - Reverse Geocoding)
  readonly isLocationConfirmModalOpen = signal<boolean>(false);
  readonly detectedAddress = signal<ReverseGeocodeResult | null>(null);
  readonly pendingCoords = signal<GpsCoordinates | null>(null);
  readonly manualAddressInput = signal<string>('');
  readonly addressSearchSuggestions = signal<ReverseGeocodeResult[]>([]);
  readonly isAddressSearching = signal<boolean>(false);
  private addressSearchDebounceTimer: any = null;

  readonly isNearbyLoading = computed<boolean>(() => {
    return this.isLocatingUser() || this.isNearbyProcessing() || (this.isNearbyGpsActive() && this.propertyService.isFetchingApi());
  });

  checkGeolocationSupport(): void {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      if ('permissions' in navigator && (navigator as any).permissions && (navigator as any).permissions.query) {
        (navigator as any).permissions.query({ name: 'geolocation' }).then((status: any) => {
          if (status.state === 'denied') {
            this.isGeolocationAvailable.set(false);
          } else {
            this.isGeolocationAvailable.set(true);
          }
          status.onchange = () => {
            const allowed = status.state !== 'denied';
            this.isGeolocationAvailable.set(allowed);
            if (!allowed && this.isNearbyGpsActive()) {
              this.clearNearbyGps();
            }
          };
        }).catch(() => {
          this.isGeolocationAvailable.set(true);
        });
      } else {
        this.isGeolocationAvailable.set(true);
      }
    } else {
      this.isGeolocationAvailable.set(false);
    }
  }

  triggerNearbySearch(): void {
    if (this.isNearbyGpsActive()) {
      this.clearNearbyGps();
      return;
    }

    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      this.notificationService.show({
        type: 'error',
        title: 'GPS Unavailable',
        message: 'Geolocation is not supported by your browser or machine.',
        icon: 'location_off'
      });
      return;
    }

    // 1. Immediately clear other search boxes, target area dropdown, and filters
    this.rawSearchInput.set('');
    this.searchQuery.set('');
    this.selectedLocalities.set([]);
    this.selectedDistrict.set('');
    this.selectedCity.set('all');
    this.selectedType.set('all');
    this.selectedDeveloper.set('all');
    this.selectedBudget.set('all');
    this.selectedBhk.set('all');
    this.reraOnly.set(false);
    this.cmdaOnly.set(false);
    this.directOwnerOnly.set(false);
    this.videoOnly.set(false);
    this.droneOnly.set(false);
    this.readyToMoveOnly.set(false);
    this.sortBy.set('featured');
    this.isDistrictDropdownOpen.set(false);
    this.isSuggestionsOpen.set(false);
    this.liveDbSuggestions.set([]);
    this.googlePlacesSuggestions.set([]);
    this.builderSearchQuery.set('');

    // Clear URL parameters
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true
    });

    // 2. Start locating user
    this.isLocatingUser.set(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: GpsCoordinates = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        };
        this.pendingCoords.set(coords);

        // Reverse geocode via OpenStreetMap Nominatim proxy API
        this.propertyService.reverseGeocode(coords.latitude, coords.longitude).subscribe({
          next: (res) => {
            this.isLocatingUser.set(false);
            const addressData: ReverseGeocodeResult = res || {
              displayName: `Detected coordinates: ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
              compactTitle: `Coordinates (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`,
              locality: 'Current Coordinates',
              city: 'Tamil Nadu',
              latitude: coords.latitude,
              longitude: coords.longitude
            };
            this.detectedAddress.set(addressData);
            this.manualAddressInput.set(addressData.compactTitle || addressData.displayName || '');
            this.addressSearchSuggestions.set([]);
            this.isLocationConfirmModalOpen.set(true);
          },
          error: () => {
            this.isLocatingUser.set(false);
            const fallback: ReverseGeocodeResult = {
              displayName: `Detected Location (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`,
              compactTitle: `Coordinates (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`,
              locality: 'Current Location',
              city: 'Tamil Nadu',
              latitude: coords.latitude,
              longitude: coords.longitude
            };
            this.detectedAddress.set(fallback);
            this.manualAddressInput.set(fallback.compactTitle);
            this.addressSearchSuggestions.set([]);
            this.isLocationConfirmModalOpen.set(true);
          }
        });
      },
      (err) => {
        this.isLocatingUser.set(false);
        this.isNearbyProcessing.set(false);
        let errorMsg = 'Unable to retrieve your current location.';
        if (err.code === err.PERMISSION_DENIED) {
          errorMsg = 'Location permission was denied. Please allow location permissions in your browser.';
          this.isGeolocationAvailable.set(false);
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          errorMsg = 'Location position is unavailable on this device.';
        } else if (err.code === err.TIMEOUT) {
          errorMsg = 'Location detection timed out. Please try again.';
        }
        this.notificationService.show({
          type: 'warning',
          title: 'Location Request Failed',
          message: errorMsg,
          icon: 'location_disabled'
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }

  onManualAddressInput(val: string): void {
    this.manualAddressInput.set(val);
    if (this.addressSearchDebounceTimer) {
      clearTimeout(this.addressSearchDebounceTimer);
    }
    if (!val || val.trim().length < 2) {
      this.addressSearchSuggestions.set([]);
      this.isAddressSearching.set(false);
      return;
    }
    this.isAddressSearching.set(true);
    this.addressSearchDebounceTimer = setTimeout(() => {
      this.propertyService.searchGeocode(val.trim()).subscribe({
        next: (results) => {
          this.addressSearchSuggestions.set(results);
          this.isAddressSearching.set(false);
        },
        error: () => {
          this.addressSearchSuggestions.set([]);
          this.isAddressSearching.set(false);
        }
      });
    }, 350);
  }

  selectAddressSuggestion(suggestion: ReverseGeocodeResult): void {
    this.detectedAddress.set(suggestion);
    this.manualAddressInput.set(suggestion.compactTitle || suggestion.displayName);
    this.pendingCoords.set({
      latitude: suggestion.latitude,
      longitude: suggestion.longitude
    });
    this.addressSearchSuggestions.set([]);
  }

  confirmLocationAndProceed(): void {
    const coords = this.pendingCoords();
    if (!coords) return;
    this.isLocationConfirmModalOpen.set(false);
    this.userCoordinates.set(coords);
    this.isNearbyGpsActive.set(true);
    this.isNearbyProcessing.set(true);
    this.displayedCount.set(20);

    // Load actual nearby properties within 5km from MySQL backend
    this.propertyService.loadPropertiesFromApi({
      offset: 0,
      limit: 50,
      append: false,
      lat: coords.latitude,
      lng: coords.longitude,
      radius: 5
    });

    setTimeout(() => {
      this.isNearbyProcessing.set(false);
    }, 500);

    const loc = this.detectedAddress()?.locality || this.detectedAddress()?.city || 'selected coordinates';
    this.notificationService.show({
      type: 'success',
      title: 'Location Confirmed',
      message: `Verified your address at ${loc}. Showing properties near you.`,
      icon: 'near_me'
    });
  }

  cancelLocationConfirm(): void {
    this.isLocationConfirmModalOpen.set(false);
    this.pendingCoords.set(null);
    this.detectedAddress.set(null);
    this.addressSearchSuggestions.set([]);
  }

  clearNearbyGps(): void {
    this.isNearbyGpsActive.set(false);
    this.userCoordinates.set(null);
    this.pendingCoords.set(null);
    this.detectedAddress.set(null);
    this.displayedCount.set(20);
    this.fetchFilteredFromApi();
    this.notificationService.show({
      type: 'info',
      title: 'Nearby Search Exited',
      message: 'Restored standard regional catalog view.',
      icon: 'explore'
    });
  }

  // Toggle Signals
  readonly reraOnly = signal<boolean>(false);
  readonly cmdaOnly = signal<boolean>(false);
  readonly directOwnerOnly = signal<boolean>(false);
  readonly videoOnly = signal<boolean>(false);
  readonly droneOnly = signal<boolean>(false);
  readonly readyToMoveOnly = signal<boolean>(false);
  readonly isMobileFilterOpen = signal<boolean>(false);
  readonly isAdVisible = signal<boolean>(true);
  readonly adPosition = signal<'left' | 'right'>('right');

  // Filter Presets & Choices
  readonly cities: FilterOption[] = [
    { value: 'all', label: 'All Metros', icon: 'public' },
    { value: 'chennai', label: 'Chennai', icon: 'location_city' },
    { value: 'bengaluru', label: 'Bengaluru', icon: 'apartment' },
    { value: 'hyderabad', label: 'Hyderabad', icon: 'domain' },
    { value: 'mumbai', label: 'Mumbai', icon: 'location_city' },
    { value: 'delhi-ncr', label: 'Delhi-NCR', icon: 'corporate_fare' }
  ];

  readonly propertyTypes: FilterOption[] = [
    { value: 'all', label: 'All Classifications', icon: 'apps' },
    { value: 'Apartments & Flats', label: 'Apartments & Flats', icon: 'apartment' },
    { value: 'Independent Villas', label: 'Independent Villas', icon: 'villa' },
    { value: 'Luxury Penthouses', label: 'Luxury Penthouses', icon: 'balcony' },
    { value: 'Gated CMDA Plots', label: 'Gated CMDA Plots', icon: 'terrain' },
    { value: 'Commercial Spaces', label: 'Commercial Spaces', icon: 'domain' }
  ];

  readonly budgetOptions: FilterOption[] = [
    { value: 'all', label: 'Any Budget' },
    { value: 'under-50l', label: 'Under ₹50L' },
    { value: '50l-1cr', label: '₹50L – 1 Cr' },
    { value: '1cr-2cr', label: '₹1 Cr – 2 Cr' },
    { value: '2cr-5cr', label: '₹2 Cr – 5 Cr' },
    { value: 'above-5cr', label: '₹5 Cr+' }
  ];

  readonly bhkOptions: FilterOption[] = [
    { value: 'all', label: 'All BHK' },
    { value: '1', label: '1 BHK' },
    { value: '2', label: '2 BHK' },
    { value: '3', label: '3 BHK' },
    { value: '4', label: '4 BHK' },
    { value: '5+', label: '5+ BHK' },
    { value: 'plot', label: 'Plots' }
  ];

  // 99acres / NoBroker Live Categorized Suggestions + Google Places API
  readonly searchSuggestions = computed<SearchSuggestion[]>(() => {
    const input = this.rawSearchInput().trim();
    const googleList = this.googlePlacesSuggestions();
    const live = this.liveDbSuggestions();

    // If Google Places returned results, combine database matches + Google Places
    if (googleList.length > 0 || live.length > 0) {
      const combined: SearchSuggestion[] = [];
      const seen = new Set<string>();

      // 1. Database matches first (local verified listings)
      for (const item of live) {
        const key = item.label.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          combined.push(item);
        }
      }

      // 2. Google Places matches (geocoded locations, landmarks, localities)
      for (const item of googleList) {
        const key = item.label.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          combined.push(item);
        }
      }

      return combined.slice(0, 12);
    }

    if (input.length > 0 && input.length < 2) {
      return [
        {
          label: 'Keep typing...',
          sub: 'Searching verified database & Google Places',
          type: 'locality',
          icon: 'edit_note',
          query: ''
        }
      ];
    }

    // Default popular suggestions when typing hasn't yielded or input is empty
    return [
      { label: 'Porur', sub: 'Locality in Chennai', type: 'locality', icon: 'location_on', query: 'Porur' },
      { label: 'Ramapuram', sub: 'Locality in Chennai', type: 'locality', icon: 'location_on', query: 'Ramapuram' },
      { label: 'Coimbatore', sub: 'District / City Jurisdiction', type: 'city', icon: 'location_city', query: 'Coimbatore' },
      { label: 'Hosur', sub: 'IT & Industrial Hub • Krishnagiri', type: 'locality', icon: 'location_on', query: 'Hosur' },
      { label: 'Gated CMDA Plots', sub: 'Verified Layout Classification', type: 'project', icon: 'terrain', query: 'Gated CMDA Plots' },
      { label: 'Chennai–Bengaluru Highway (NH48)', sub: 'High Growth Corridor', type: 'corridor', icon: 'add_road', query: 'Chennai–Bengaluru Highway' }
    ];
  });

  // Active filter count computation
  readonly activeFilterCount = computed(() => {
    let count = 0;
    if (this.selectedCity() !== 'all') count++;
    if (this.selectedType() !== 'all') count++;
    if (this.selectedDeveloper() !== 'all') count++;
    count += this.selectedLocalities().length;
    if (this.selectedBudget() !== 'all') count++;
    if (this.selectedBhk() !== 'all') count++;
    if (this.reraOnly()) count++;
    if (this.cmdaOnly()) count++;
    if (this.directOwnerOnly()) count++;
    if (this.videoOnly()) count++;
    if (this.droneOnly()) count++;
    if (this.readyToMoveOnly()) count++;
    if (this.searchQuery().trim()) count++;
    return count;
  });

  // Filtered & Sorted Properties List (100% MySQL Database Driven - No Local String Search)
  readonly filteredProperties = computed(() => {
    const all = this.propertyService.allProperties();
    const budget = this.selectedBudget();
    const bhk = this.selectedBhk();
    const rera = this.reraOnly();
    const cmda = this.cmdaOnly();
    const directOwner = this.directOwnerOnly();
    const video = this.videoOnly();
    const drone = this.droneOnly();
    const ready = this.readyToMoveOnly();

    // Helper to evaluate facet toggles
    const matchesFacets = (p: Property): boolean => {
      // 1. Budget Bracket Filter
      if (budget !== 'all') {
        const priceNum = parsePriceToNumber(p.price);
        if (budget === 'under-50l' && priceNum >= 5000000) return false;
        if ((budget === '50l-1cr' || budget === '50l-1.5cr') && (priceNum < 5000000 || priceNum > 15000000)) return false;
        if (budget === '1cr-2cr' && (priceNum < 10000000 || priceNum > 20000000)) return false;
        if (budget === '1.5cr-3cr' && (priceNum < 15000000 || priceNum > 30000000)) return false;
        if ((budget === '2cr-5cr' || budget === '3cr-5cr') && (priceNum < 20000000 || priceNum > 50000000)) return false;
        if (budget === 'above-5cr' && priceNum <= 50000000) return false;
      }

      // 2. BHK / Plot Filter
      if (bhk !== 'all') {
        if (bhk === 'plot') {
          if (p.propertyType !== 'Gated CMDA Plots' && !p.bhkBadge.toLowerCase().includes('plot')) return false;
        } else if (bhk === '5+') {
          if (extractBedCount(p.bhkBadge, p.title) < 5) return false;
        } else {
          if (extractBedCount(p.bhkBadge, p.title) !== parseInt(bhk, 10)) return false;
        }
      }

      // 3. RERA Approved
      if (rera) {
        const reraText = (p.badges?.rera || '').toLowerCase();
        if (!reraText.includes('rera') && !reraText.includes('approved') && !reraText.includes('sanctioned')) return false;
      }

      // 4. CMDA / DTCP Sanctioned
      if (cmda) {
        const isPlot = p.propertyType === 'Gated CMDA Plots';
        const reraText = (p.badges?.rera || '').toLowerCase();
        const tagText = (p.badges?.specialTag || '').toLowerCase();
        const cmdaMatch = isPlot || reraText.includes('cmda') || reraText.includes('dtcp') || tagText.includes('cmda') || tagText.includes('dtcp') || tagText.includes('patta');
        if (!cmdaMatch) return false;
      }

      // 5. Direct Owner
      if (directOwner) {
        const brok = (p.badges?.brokerage || '').toLowerCase();
        if (!brok.includes('owner') && !brok.includes('direct')) return false;
      }

      // 6. 4K Video Tour Available
      if (video) {
        if (!(p.premiumMedia || []).some(m => m && m.type === 'video')) return false;
      }

      // 7. Drone Survey Available
      if (drone) {
        if (!(p.premiumMedia || []).some(m => m && (
          (m.tag && (m.tag.toLowerCase().includes('drone') || m.tag.toLowerCase().includes('aerial'))) || 
          (m.title && (m.title.toLowerCase().includes('drone') || m.title.toLowerCase().includes('aerial')))
        ))) return false;
      }

      // 8. Ready to Move / Clear Patta
      if (ready) {
        const highlightsList = p.highlights || [];
        const hasReady = highlightsList.some(h => 
          h && (h.toLowerCase().includes('ready') || h.toLowerCase().includes('patta') || h.toLowerCase().includes('immediate'))
        ) || (p.title && p.title.toLowerCase().includes('ready'));
        if (!hasReady) return false;
      }

      return true;
    };

    // --- CASE 1: Nearby GPS 5km Radius Mode Active ---
    if (this.isNearbyGpsActive() && this.userCoordinates()) {
      const userCoords = this.userCoordinates()!;
      const validGpsList: Property[] = [];

      for (const p of all) {
        // Strictly exclude properties without valid GPS coordinates
        let coords: GpsCoordinates | null = (p.latitude && p.longitude)
          ? { latitude: p.latitude, longitude: p.longitude }
          : null;

        if (!coords) {
          const rawLink = p.googleMapsLink || (p.masterDetails && p.masterDetails.googleMapsLink) || p.interactiveMapUrl;
          const validation = validateGpsData(rawLink);
          if (validation.isValid && validation.coordinates) {
            coords = validation.coordinates;
          }
        }

        if (!coords) {
          continue; // EXCLUDE invalid GPS
        }

        const distance = (p.distanceKm !== undefined && p.distanceKm !== null)
          ? p.distanceKm
          : haversineDistanceKm(userCoords, coords);

        if (matchesFacets(p)) {
          validGpsList.push({
            ...p,
            isGpsValid: true,
            latitude: coords.latitude,
            longitude: coords.longitude,
            distanceKm: distance,
            isClosestProximity: distance <= 5.0
          });
        }
      }

      // Sort by closest distance first
      validGpsList.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));

      const within5km = validGpsList.filter(p => (p.distanceKm || 0) <= 5.0);
      if (within5km.length > 0) {
        return within5km;
      } else {
        // Fallback: automatically show the nearest available properties with distance labels
        return validGpsList;
      }
    }

    // --- CASE 2: Standard Search / Filter Mode ---
    const results = all.filter(p => matchesFacets(p));

    // Apply Sorting
    const sort = this.sortBy();
    const sorted = [...results];

    if (sort === 'price-asc') {
      sorted.sort((a, b) => parsePriceToNumber(a.price) - parsePriceToNumber(b.price));
    } else if (sort === 'price-desc') {
      sorted.sort((a, b) => parsePriceToNumber(b.price) - parsePriceToNumber(a.price));
    } else if (sort === 'rate-asc') {
      sorted.sort((a, b) => parseRateToNumber(a.pricePerSqFt) - parseRateToNumber(b.pricePerSqFt));
    } else if (sort === 'rate-desc') {
      sorted.sort((a, b) => parseRateToNumber(b.pricePerSqFt) - parseRateToNumber(a.pricePerSqFt));
    }

    if (sorted.length > 0) {
      return annotateInterPropertyProximity(sorted, all);
    }

    return [];
  });

  readonly isGpsAutoExpanded = computed<boolean>(() => {
    if (!this.isNearbyGpsActive() || !this.userCoordinates()) return false;
    const props = this.filteredProperties();
    if (props.length === 0) return false;
    return (props[0].distanceKm ?? 0) > 5.0;
  });

  readonly nearby5kmCount = computed<number>(() => {
    if (!this.isNearbyGpsActive() || !this.userCoordinates()) return 0;
    return this.filteredProperties().filter(p => (p.distanceKm ?? 0) <= 5.0).length;
  });

  // Suggested Properties when exact search returns 0 matching results
  readonly suggestedProperties = computed<Property[]>(() => {
    // 1. If backend API provided suggested properties from MySQL
    const apiSuggested = this.propertyService.suggestedProperties();
    if (apiSuggested && apiSuggested.length > 0) {
      return apiSuggested;
    }

    // 2. Proximity-based recommendation if user searched a known location / corridor
    const query = this.searchQuery().toLowerCase().trim();
    const locs = this.selectedLocalities();
    const city = this.selectedCity();
    const searchTarget = query || (locs.length > 0 ? locs[0] : '') || (city !== 'all' ? city : '');
    const all = this.propertyService.allProperties();

    if (searchTarget && all.length > 0) {
      const centerCoords = findSearchCenterCoordinates(searchTarget);
      if (centerCoords) {
        const radiusMatches: Property[] = [];
        for (const p of all) {
          const rawLink = p.googleMapsLink || (p.latitude && p.longitude ? `${p.latitude},${p.longitude}` : '');
          const pCoords = extractCoordinates(rawLink);
          if (pCoords) {
            const distKm = haversineDistanceKm(centerCoords, pCoords);
            if (distKm <= 15.0) {
              radiusMatches.push({
                ...p,
                distanceKm: Math.round(distKm * 10) / 10,
                isRadiusSuggestion: true,
                isClosestProximity: distKm <= 5.0,
                isSuggested: true
              });
            }
          }
        }
        if (radiusMatches.length > 0) {
          radiusMatches.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
          return annotateInterPropertyProximity(radiusMatches, all);
        }
      }
    }

    // 3. Fallback to curated mock properties with DTCP / RERA clearance
    return annotateInterPropertyProximity(MOCK_50_PROPERTIES.slice(0, 8));
  });

  // Displayed properties slice for infinite scroll expansion (no pagination)
  readonly displayedProperties = computed(() => {
    return this.filteredProperties();
  });

  readonly hasMore = computed<boolean>(() => {
    return this.propertyService.hasMoreApiProperties();
  });

  readonly remainingCount = computed<number>(() => {
    return Math.max(0, this.filteredProperties().length - this.displayedCount());
  });

  private isScrollThrottled = false;

  loadMore(): void {
    if (this.propertyService.hasMoreApiProperties() && !this.propertyService.isFetchingApi()) {
      if (this.isNearbyGpsActive() && this.userCoordinates()) {
        const coords = this.userCoordinates()!;
        this.propertyService.loadNextBatch(20, {
          lat: coords.latitude,
          lng: coords.longitude,
          radius: 5
        });
        return;
      }

      const locs = this.selectedLocalities();
      const q = this.searchQuery().trim();
      const city = (q && this.selectedCity() === 'all') ? undefined : (this.selectedCity() !== 'all' ? this.selectedCity() : undefined);

      this.propertyService.loadNextBatch(20, {
        q: q || undefined,
        localities: locs.length > 0 ? locs : undefined,
        cityKey: city,
        propertyType: this.selectedType() !== 'all' ? this.selectedType() : undefined,
        developer: this.selectedDeveloper() !== 'all' ? this.selectedDeveloper() : undefined,
        sort: this.sortBy()
      });
    }
  }

  // Smooth Window Scroll Listener for Infinite Scroll Expansion (Loads next 10 properties on scroll)
  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (!this.propertyService.hasMoreApiProperties() || this.propertyService.isFetchingApi() || this.isScrollThrottled) return;
    const scrollPosition = window.innerHeight + window.scrollY;
    const threshold = document.documentElement.scrollHeight - 700;
    if (scrollPosition >= threshold) {
      this.isScrollThrottled = true;
      this.loadMore();
      setTimeout(() => {
        this.isScrollThrottled = false;
      }, 400);
    }
  };

  ngOnInit(): void {
    // Record current URL for seamless back-navigation from property details
    this.propertyService.setLastSearchUrl(this.router.url);

    // Detect browser/device geolocation capabilities
    this.checkGeolocationSupport();

    // Load available districts from MySQL database
    this.propertyService.fetchDistricts().subscribe(res => {
      this.districtsList.set(res.allDistricts || []);
      this.mainHubs.set(res.mainHubs || []);
      this.regionalGroups.set(res.regionalGroups || []);
    });

    // Load master builders list from MySQL database
    this.propertyService.fetchBuilders().subscribe(builders => {
      this.buildersList.set(builders);
    });

    // Sync query parameters into component signals and trigger API query
    this.route.queryParams.subscribe(params => {
      if (params['district']) {
        this.selectedDistrict.set(params['district']);
      }
      if (params['localities']) {
        const arr = (params['localities'] as string).split(',').map(s => s.trim()).filter(Boolean);
        this.selectedLocalities.set(arr);
      } else {
        this.selectedLocalities.set([]);
      }
      if (params['q'] !== undefined) {
        this.searchQuery.set(params['q'] || '');
        this.rawSearchInput.set(params['q'] || '');
      }
      if (params['city']) {
        this.selectedCity.set(params['city']);
      }
      if (params['type']) {
        this.selectedType.set(params['type']);
      }
      if (params['developer']) {
        this.selectedDeveloper.set(params['developer']);
      }
      if (params['budget']) {
        this.selectedBudget.set(params['budget']);
      }
      if (params['bhk']) {
        this.selectedBhk.set(params['bhk']);
      }
      if (params['sort']) {
        this.sortBy.set(params['sort']);
      }
      if (params['video'] === 'true') {
        this.videoOnly.set(true);
      }
      if (params['drone'] === 'true') {
        this.droneOnly.set(true);
      }
      if (params['rera'] === 'true') {
        this.reraOnly.set(true);
      }
      if (params['cmda'] === 'true') {
        this.cmdaOnly.set(true);
      }
      if (params['direct'] === 'true' || params['owner'] === 'true') {
        this.directOwnerOnly.set(true);
      }
      if (params['ready'] === 'true' || params['status'] === 'ready') {
        this.readyToMoveOnly.set(true);
      }

      // Fetch live properties from MySQL backend with synchronized parameters
      this.fetchFilteredFromApi();
    });
  }

  fetchFilteredFromApi(): void {
    if (this.isNearbyGpsActive() && this.userCoordinates()) {
      const coords = this.userCoordinates()!;
      this.propertyService.loadPropertiesFromApi({
        offset: 0,
        limit: 50,
        append: false,
        lat: coords.latitude,
        lng: coords.longitude,
        radius: 5
      });
      return;
    }

    const q = this.searchQuery().trim();
    // When text search is active, query across all cities in DB unless a city chip was explicitly clicked
    const city = (q && this.selectedCity() === 'all') ? undefined : (this.selectedCity() !== 'all' ? this.selectedCity() : undefined);
    const district = this.selectedDistrict() || undefined;

    const locs = this.selectedLocalities();
    this.propertyService.loadPropertiesFromApi({
      offset: 0,
      limit: 20,
      append: false,
      q: q || undefined,
      localities: locs.length > 0 ? locs : undefined,
      cityKey: city,
      district: district,
      propertyType: this.selectedType() !== 'all' ? this.selectedType() : undefined,
      developer: this.selectedDeveloper() !== 'all' ? this.selectedDeveloper() : undefined,
      sort: this.sortBy()
    });

    this.loadNearbyLocalities();
  }

  loadNearbyLocalities(): void {
    const locs = this.selectedLocalities();
    const q = this.searchQuery().trim();
    const city = this.selectedCity() !== 'all' ? this.selectedCity() : undefined;
    const district = this.selectedDistrict() || undefined;

    const targetLoc = locs.length > 0 ? locs[0] : (q || undefined);

    if (targetLoc) {
      this.nearbyContextLabel.set(`Nearby Locality Areas around "${targetLoc}"`);
    } else if (district) {
      this.nearbyContextLabel.set(`Prominent Locality Areas in ${district.toUpperCase()}`);
    } else if (city) {
      this.nearbyContextLabel.set(`Prominent Locality Areas in ${city.toUpperCase()}`);
    } else {
      this.nearbyContextLabel.set('Explore Nearby Locality Areas');
    }

    this.propertyService.fetchNearbyData({
      locality: targetLoc,
      city: city,
      district: district
    }).subscribe(res => {
      this.nearbyLocalities.set(res.nearbyLocalities);
      this.nearbyProperties.set(res.nearbyProperties);
    });
  }

  selectNearbyLocality(loc: NearbyLocality): void {
    this.addLocalityTag(loc.name);
  }

  syncUrlParams(): void {
    const locs = this.selectedLocalities();
    const q = this.searchQuery().trim();
    const dist = this.selectedDistrict();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { 
        district: dist || null,
        localities: locs.length > 0 ? locs.join(',') : null,
        q: q ? q : null
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  onSearchInput(value: string): void {
    this.rawSearchInput.set(value);
    this.isSuggestionsOpen.set(true);

    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    this.searchDebounceTimer = setTimeout(() => {
      const trimmed = value.trim();
      const dist = this.selectedDistrict();

      // 1. Google Places API query (triggers at >= 2 characters, biased to selected district)
      if (trimmed.length >= 2) {
        this.propertyService.fetchGooglePlaces(trimmed, dist).subscribe(places => {
          this.googlePlacesSuggestions.set(places);
        });
      } else {
        this.googlePlacesSuggestions.set([]);
      }

      // 2. Database suggestions (triggers from 1 character if district targeted, else 2 chars)
      const minChars = dist ? 1 : 2;
      if (trimmed.length >= minChars || (trimmed.length === 0 && dist)) {
        this.propertyService.fetchSuggestions(trimmed, dist).subscribe(res => {
          this.liveDbSuggestions.set(res);
        });
      }

      if (trimmed.length >= 3) {
        this.searchQuery.set(trimmed);
        this.displayedCount.set(20);
        this.fetchFilteredFromApi();
      } else {
        if (trimmed.length === 0 && this.searchQuery()) {
          this.searchQuery.set('');
          this.displayedCount.set(20);
          this.fetchFilteredFromApi();
        }
      }
    }, 220);
  }

  onSearchFocus(): void {
    this.isSuggestionsOpen.set(true);
    const trimmed = this.rawSearchInput().trim();
    const dist = this.selectedDistrict();

    // Fetch district-targeted suggestions even if search query is empty
    this.propertyService.fetchSuggestions(trimmed, dist).subscribe(res => {
      this.liveDbSuggestions.set(res);
    });

    if (trimmed.length >= 2) {
      this.propertyService.fetchGooglePlaces(trimmed, dist).subscribe(places => {
        this.googlePlacesSuggestions.set(places);
      });
    }
  }

  onSearchBlur(): void {
    setTimeout(() => {
      this.isSuggestionsOpen.set(false);
    }, 280);
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      const val = this.rawSearchInput().trim();
      if (val) {
        this.addLocalityTag(val);
      }
    } else if (event.key === 'Backspace' && !this.rawSearchInput() && this.selectedLocalities().length > 0) {
      // Remove last tag on backspace when input is empty
      const locs = [...this.selectedLocalities()];
      locs.pop();
      this.selectedLocalities.set(locs);
      this.displayedCount.set(20);
      this.syncUrlParams();
      this.fetchFilteredFromApi();
    }
  }

  addLocalityTag(tag: string): void {
    const clean = tag.trim();
    if (!clean) return;
    const current = this.selectedLocalities();
    if (!current.some(item => item.toLowerCase() === clean.toLowerCase())) {
      this.selectedLocalities.set([...current, clean]);
    }
    this.rawSearchInput.set('');
    this.searchQuery.set('');
    this.isSuggestionsOpen.set(false);
    this.displayedCount.set(20);
    this.syncUrlParams();
    this.fetchFilteredFromApi();
  }

  removeLocalityTag(index: number): void {
    const updated = this.selectedLocalities().filter((_, i) => i !== index);
    this.selectedLocalities.set(updated);
    this.displayedCount.set(20);
    this.syncUrlParams();
    this.fetchFilteredFromApi();
  }

  selectSuggestion(item: SearchSuggestion): void {
    if (!item.query) return;
    this.addLocalityTag(item.query);
  }

  clearSearchQuery(): void {
    this.rawSearchInput.set('');
    this.searchQuery.set('');
    this.selectedLocalities.set([]);
    this.isSuggestionsOpen.set(false);
    this.googlePlacesSuggestions.set([]);
    this.liveDbSuggestions.set([]);
    this.isNearbyGpsActive.set(false);
    this.userCoordinates.set(null);
    this.displayedCount.set(20);
    this.syncUrlParams();
    this.fetchFilteredFromApi();
  }

  selectAllAssets(): void {
    this.selectedType.set('all');
    this.selectedBudget.set('all');
    this.videoOnly.set(false);
    this.droneOnly.set(false);
  }

  setType(type: string): void {
    this.selectedType.set(type);
    this.displayedCount.set(20);
    this.fetchFilteredFromApi();
  }

  setBudget(budget: string): void {
    this.selectedBudget.set(budget);
    this.displayedCount.set(20);
    this.fetchFilteredFromApi();
  }

  setCity(city: string): void {
    this.selectedCity.set(city);
    this.displayedCount.set(20);
    this.fetchFilteredFromApi();
  }

  setBhk(bhk: string): void {
    this.selectedBhk.set(bhk);
    this.displayedCount.set(20);
    this.fetchFilteredFromApi();
  }

  setSort(sort: string): void {
    this.sortBy.set(sort);
    this.displayedCount.set(20);
    this.fetchFilteredFromApi();
  }

  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode.set(mode);
  }

  toggleVideoOnly(): void {
    this.videoOnly.update(v => !v);
  }

  toggleDroneOnly(): void {
    this.droneOnly.update(v => !v);
  }

  toggleRera(): void {
    this.reraOnly.update(v => !v);
  }

  toggleCmda(): void {
    this.cmdaOnly.update(v => !v);
  }

  toggleDirectOwner(): void {
    this.directOwnerOnly.update(v => !v);
  }

  toggleReadyToMove(): void {
    this.readyToMoveOnly.update(v => !v);
  }

  toggleMobileFilter(): void {
    this.isMobileFilterOpen.update(v => !v);
  }

  setDeveloper(dev: string): void {
    const next = this.selectedDeveloper() === dev ? 'all' : dev;
    this.selectedDeveloper.set(next);
    this.displayedCount.set(20);

    // Clear search box inputs before applying developer filter
    this.rawSearchInput.set('');
    this.searchQuery.set('');
    this.selectedLocalities.set([]);
    this.isSuggestionsOpen.set(false);
    this.liveDbSuggestions.set([]);
    this.builderSearchQuery.set('');

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        developer: next !== 'all' ? next : null,
        q: null,
        localities: null
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
    this.fetchFilteredFromApi();
  }

  toggleBuilderExpand(): void {
    this.isBuilderListExpanded.update(v => !v);
  }

  onBuilderSearch(val: string): void {
    this.builderSearchQuery.set(val);
  }

  resetAllFilters(): void {
    this.searchQuery.set('');
    this.selectedDistrict.set('');
    this.selectedCity.set('all');
    this.selectedType.set('all');
    this.selectedDeveloper.set('all');
    this.selectedLocalities.set([]);
    this.rawSearchInput.set('');
    this.builderSearchQuery.set('');
    this.selectedBudget.set('all');
    this.selectedBhk.set('all');
    this.reraOnly.set(false);
    this.cmdaOnly.set(false);
    this.directOwnerOnly.set(false);
    this.videoOnly.set(false);
    this.droneOnly.set(false);
    this.readyToMoveOnly.set(false);
    this.sortBy.set('featured');
    this.displayedCount.set(20);
    this.fetchFilteredFromApi();

    this.notificationService.show({
      type: 'info',
      title: 'Filters Reset',
      message: 'All registry search filters have been restored to default.',
      icon: 'restart_alt'
    });
  }

  toggleAdPosition(): void {
    this.adPosition.update(pos => pos === 'right' ? 'left' : 'right');
    this.notificationService.show({
      type: 'info',
      title: 'Ad Position Updated',
      message: `Sponsored showcase moved to the ${this.adPosition()} side.`,
      icon: 'swap_horiz'
    });
  }

  dismissAd(): void {
    this.isAdVisible.set(false);
  }

  openSponsoredProject(): void {
    const plot = this.propertyService.properties().find(p => p.propertyType === 'Gated CMDA Plots') || this.propertyService.properties()[0];
    if (plot) {
      this.propertyService.openMediaModal(plot, 'premium');
    }
  }

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'property-placeholder.svg';
  }
}