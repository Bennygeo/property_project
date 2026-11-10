import { Component, OnInit, inject, signal, computed, HostListener, ViewChild, ElementRef } from '@angular/core';
import { validateGpsData, haversineDistanceKm, findSearchCenterCoordinates, extractCoordinates, annotateInterPropertyProximity, GpsCoordinates } from '../../../../core/utils/gps-helper';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Property, PropertyType } from '../../../../core/models/property.model';
import { PropertyService, DistrictItem, DistrictHubItem, RegionalGroupItem } from '../../../../core/services/property.service';
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

  scrollToTop(): void {
    if (typeof window !== 'undefined') {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth'
      });
      document.documentElement?.scrollTo?.({ top: 0, behavior: 'smooth' });
      document.body?.scrollTo?.({ top: 0, behavior: 'smooth' });
    }
  }

  getDeveloperName(prop: any): string {
    const raw = prop?.developerName ||
      prop?.masterDetails?.developer ||
      prop?.developer?.name ||
      prop?.developer_name ||
      prop?.promoterName ||
      prop?.submittedByName ||
      prop?.builder ||
      '';
    const clean = raw ? raw.replace(/â\x80\x93|â\x80\x94|â/g, '–').trim() : '';
    if (
      clean &&
      clean.toLowerCase() !== 'null' &&
      clean.toLowerCase() !== 'undefined' &&
      clean.toLowerCase() !== 'none' &&
      !clean.toLowerCase().includes('housing board') &&
      !clean.toLowerCase().includes('executive engineer')
    ) {
      return clean;
    }
    return '';
  }

  isRera(p: any): boolean {
    const r = p?.badges?.rera || p?.masterDetails?.reraNumber || p?.plotDetails?.reraLayoutNo || p?.reraNumber || '';
    if (!r) return true;
    const lower = String(r).toLowerCase().trim();
    return !['no', 'none', 'false', '0', 'unapproved'].includes(lower);
  }

  getReraText(p: any): string {
    const r = p?.badges?.rera || p?.masterDetails?.reraNumber || p?.plotDetails?.reraLayoutNo || p?.reraNumber || '';
    return r ? `RERA Approved: ${r}` : 'RERA Approved Layout';
  }

  toggleDistrictDropdown(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const nextState = !this.isDistrictDropdownOpen();
    this.isDistrictDropdownOpen.set(nextState);
    if (nextState) {
      this.isSuggestionsOpen.set(false);
      this.scrollToTop();
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
    if (!target.closest('.district-target-selector') && !target.closest('.district-custom-dropdown')) {
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

  getRegionIcon(regionName: string): string {
    const lower = regionName.toLowerCase();
    if (lower.includes('north')) return 'explore';
    if (lower.includes('west') || lower.includes('kongu')) return 'landscape';
    if (lower.includes('central') || lower.includes('delta')) return 'water_drop';
    if (lower.includes('south')) return 'temple_hindu';
    return 'domain';
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

    if (district) {
      // Focus the search omnibox so user can quickly type or pick from suggestions
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

  // Custom Budget Range Slider Configuration
  readonly MIN_BUDGET_LIMIT = 0;
  readonly MAX_BUDGET_LIMIT = 100000000; // ₹10 Crores
  readonly BUDGET_STEP = 500000; // ₹5 Lakhs step

  readonly customBudgetMin = signal<number>(0);
  readonly customBudgetMax = signal<number>(100000000);
  readonly isCustomBudgetActive = signal<boolean>(false);

  readonly sliderMinPercent = computed<number>(() => {
    const min = this.customBudgetMin();
    return Math.max(0, Math.min(100, (min / this.MAX_BUDGET_LIMIT) * 100));
  });

  readonly sliderWidthPercent = computed<number>(() => {
    const min = this.customBudgetMin();
    const max = this.customBudgetMax();
    const pct = ((max - min) / this.MAX_BUDGET_LIMIT) * 100;
    return Math.max(0, Math.min(100, pct));
  });
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

  // Toggle Signals
  readonly cmdaOnly = signal<boolean>(false);
  readonly directOwnerOnly = signal<boolean>(false);
  readonly videoOnly = signal<boolean>(false);
  readonly droneOnly = signal<boolean>(false);
  readonly readyToMoveOnly = signal<boolean>(false);
  readonly isMobileFilterOpen = signal<boolean>(false);
  readonly isAdVisible = signal<boolean>(false);
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

      // 1. Google Places matches first (geocoded locations, landmarks, verified localities)
      for (const item of googleList) {
        const key = item.label.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          combined.push(item);
        }
      }

      // 2. Database matches (local verified listings, builders, projects)
      for (const item of live) {
        const key = item.label.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          combined.push(item);
        }
      }

      return combined.slice(0, 15);
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
    if (this.selectedBudget() !== 'all' || this.isCustomBudgetActive()) count++;
    if (this.selectedBhk() !== 'all') count++;
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
    const cmda = this.cmdaOnly();
    const directOwner = this.directOwnerOnly();
    const video = this.videoOnly();
    const drone = this.droneOnly();
    const ready = this.readyToMoveOnly();

    // Helper to evaluate facet toggles
    const matchesFacets = (p: Property): boolean => {
      // 1. Budget Bracket Filter (Presets or Custom Range Slider)
      if (this.isCustomBudgetActive() || budget === 'custom') {
        const priceNum = parsePriceToNumber(p.price);
        if (priceNum > 0) {
          const min = this.customBudgetMin();
          const max = this.customBudgetMax();
          if (priceNum < min || (max < this.MAX_BUDGET_LIMIT && priceNum > max)) {
            return false;
          }
        }
      } else if (budget !== 'all') {
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

      // 3. CMDA / DTCP Sanctioned
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

    // Apply Filters
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
      if (params['cmda'] === 'true') {
        this.cmdaOnly.set(true);
      }
      if (params['direct'] === 'true' || params['owner'] === 'true') {
        this.directOwnerOnly.set(true);
      }
      if (params['ready'] === 'true' || params['status'] === 'ready') {
        this.readyToMoveOnly.set(true);
      }
      if (params['focus'] === 'true') {
        setTimeout(() => {
          this.omniboxInputRef?.nativeElement?.focus();
        }, 150);
      }

      // Fetch live properties from MySQL backend with synchronized parameters
      this.fetchFilteredFromApi();
    });
  }

  fetchFilteredFromApi(): void {
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

  onSearchOmniboxClick(event?: Event): void {
    this.scrollToTop();
    const target = event?.target as HTMLElement;
    if (target && !target.closest('.omnibox-gps-btn') && !target.closest('.omnibox-clear-btn') && !target.closest('.tag-loc-remove')) {
      this.omniboxInputRef?.nativeElement?.focus();
    }
  }

  onSearchFocus(): void {
    this.scrollToTop();
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
    this.isCustomBudgetActive.set(false);
    if (budget === 'all') {
      this.customBudgetMin.set(0);
      this.customBudgetMax.set(this.MAX_BUDGET_LIMIT);
    } else if (budget === 'under-50l') {
      this.customBudgetMin.set(0);
      this.customBudgetMax.set(5000000);
    } else if (budget === '50l-1cr') {
      this.customBudgetMin.set(5000000);
      this.customBudgetMax.set(10000000);
    } else if (budget === '1cr-2cr') {
      this.customBudgetMin.set(10000000);
      this.customBudgetMax.set(20000000);
    } else if (budget === '2cr-5cr') {
      this.customBudgetMin.set(20000000);
      this.customBudgetMax.set(50000000);
    } else if (budget === 'above-5cr') {
      this.customBudgetMin.set(50000000);
      this.customBudgetMax.set(this.MAX_BUDGET_LIMIT);
    }
    this.displayedCount.set(20);
    this.fetchFilteredFromApi();
  }

  formatBudgetInr(val: number): string {
    if (val <= 0) return '₹0';
    if (val >= 10000000) {
      const cr = val / 10000000;
      return Number.isInteger(cr) ? `₹${cr} Cr` : `₹${cr.toFixed(1)} Cr`;
    }
    const lk = val / 100000;
    return Number.isInteger(lk) ? `₹${lk}L` : `₹${lk.toFixed(1)}L`;
  }

  onMinSliderChange(event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    const max = this.customBudgetMax();
    const step = this.BUDGET_STEP;
    const newMin = Math.min(val, max - step);
    this.customBudgetMin.set(newMin);
    this.isCustomBudgetActive.set(true);
    this.selectedBudget.set('custom');
    this.displayedCount.set(20);
  }

  onMaxSliderChange(event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    const min = this.customBudgetMin();
    const step = this.BUDGET_STEP;
    const newMax = Math.max(val, min + step);
    this.customBudgetMax.set(newMax);
    this.isCustomBudgetActive.set(true);
    this.selectedBudget.set('custom');
    this.displayedCount.set(20);
  }

  resetCustomBudget(): void {
    this.isCustomBudgetActive.set(false);
    this.selectedBudget.set('all');
    this.customBudgetMin.set(0);
    this.customBudgetMax.set(this.MAX_BUDGET_LIMIT);
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
    this.isCustomBudgetActive.set(false);
    this.customBudgetMin.set(0);
    this.customBudgetMax.set(this.MAX_BUDGET_LIMIT);
    this.selectedBhk.set('all');
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