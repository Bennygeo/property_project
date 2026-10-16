import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Property, PropertyType } from '../../../../core/models/property.model';
import { PropertyService } from '../../../../core/services/property.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { MetroService } from '../../../../core/services/metro.service';
import { TopConciergeBarComponent } from '../../../home/components/top-concierge-bar/top-concierge-bar.component';
import { HeaderComponent } from '../../../home/components/header/header.component';
import { FooterComponent } from '../../../home/components/footer/footer.component';
import { PropertyCardComponent } from '../../../home/components/property-card/property-card.component';
import { PropertyMediaModalComponent } from '../../../home/components/property-media-modal/property-media-modal.component';
import { TopupDialogComponent } from '../../../home/components/topup-dialog/topup-dialog.component';
import { ToastComponent } from '../../../home/components/toast/toast.component';
import { AuthService } from '../../../../core/services/auth.service';

export interface FilterOption {
  value: string;
  label: string;
  icon?: string;
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
    ToastComponent
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

  // Filter Signals
  readonly searchQuery = signal<string>('');
  readonly selectedCity = signal<string>('all');
  readonly selectedType = signal<string>('all');
  readonly selectedBudget = signal<string>('all');
  readonly selectedBhk = signal<string>('all');
  readonly sortBy = signal<string>('featured');
  readonly viewMode = signal<'grid' | 'list'>('grid');

  // Toggle Signals
  readonly reraOnly = signal<boolean>(false);
  readonly cmdaOnly = signal<boolean>(false);
  readonly zeroBrokerageOnly = signal<boolean>(false);
  readonly videoOnly = signal<boolean>(false);
  readonly droneOnly = signal<boolean>(false);
  readonly readyToMoveOnly = signal<boolean>(false);

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

  // Active filter count computation
  readonly activeFilterCount = computed(() => {
    let count = 0;
    if (this.selectedCity() !== 'all') count++;
    if (this.selectedType() !== 'all') count++;
    if (this.selectedBudget() !== 'all') count++;
    if (this.selectedBhk() !== 'all') count++;
    if (this.reraOnly()) count++;
    if (this.cmdaOnly()) count++;
    if (this.zeroBrokerageOnly()) count++;
    if (this.videoOnly()) count++;
    if (this.droneOnly()) count++;
    if (this.readyToMoveOnly()) count++;
    if (this.searchQuery().trim()) count++;
    return count;
  });

  // Filtered & Sorted Properties List
  readonly filteredProperties = computed(() => {
    const all = this.propertyService.allProperties();
    const query = this.searchQuery().toLowerCase().trim();
    const city = this.selectedCity();
    const type = this.selectedType();
    const budget = this.selectedBudget();
    const bhk = this.selectedBhk();
    const rera = this.reraOnly();
    const cmda = this.cmdaOnly();
    const zeroBrok = this.zeroBrokerageOnly();
    const video = this.videoOnly();
    const drone = this.droneOnly();
    const ready = this.readyToMoveOnly();

    const results = all.filter(p => {
      // 1. Omnibox search query
      if (query) {
        const words = query.split(/\s+/).filter(Boolean);
        const highlightsText = (p.highlights || []).join(' ');
        const fullText = `${p.title || ''} ${p.locality || ''} ${p.city || ''} ${p.propertyType || ''} ${p.bhkBadge || ''} ${highlightsText} ${p.facingOrView || ''} ${p.badges?.rera || ''}`.toLowerCase();
        if (!words.every(w => fullText.includes(w))) {
          return false;
        }
      }

      // 2. City Filter
      if (city !== 'all') {
        const cityMatch = p.cityKey === city || 
                          p.city.toLowerCase().includes(city.toLowerCase()) ||
                          (city === 'delhi-ncr' && (p.cityKey === 'delhi-ncr' || p.city.toLowerCase().includes('ncr') || p.city.toLowerCase().includes('delhi')));
        if (!cityMatch) return false;
      }

      // 3. Property Type Filter
      if (type !== 'all') {
        const allowedTypes = type.split(',').map(t => t.trim().toLowerCase());
        const propTypeLower = p.propertyType.toLowerCase();
        const typeMatch = allowedTypes.some(t => propTypeLower.includes(t) || t.includes(propTypeLower));
        if (!typeMatch) return false;
      }

      // 4. Budget Bracket Filter
      if (budget !== 'all') {
        const priceNum = parsePriceToNumber(p.price);
        if (budget === 'under-50l' && priceNum >= 5000000) return false;
        if ((budget === '50l-1cr' || budget === '50l-1.5cr') && (priceNum < 5000000 || priceNum > 15000000)) return false;
        if ((budget === '1cr-2cr' || budget === '1.5cr-3cr') && (priceNum < 10000000 || priceNum > 30000000)) return false;
        if ((budget === '2cr-5cr' || budget === '3cr-5cr') && (priceNum < 20000000 || priceNum > 50000000)) return false;
        if (budget === 'above-5cr' && priceNum <= 50000000) return false;
      }

      // 5. BHK / Plot Filter
      if (bhk !== 'all') {
        if (bhk === 'plot') {
          if (p.propertyType !== 'Gated CMDA Plots' && !p.bhkBadge.toLowerCase().includes('plot')) {
            return false;
          }
        } else if (bhk === '5+') {
          const count = extractBedCount(p.bhkBadge, p.title);
          if (count < 5) return false;
        } else {
          const targetNum = parseInt(bhk, 10);
          const count = extractBedCount(p.bhkBadge, p.title);
          if (count !== targetNum) return false;
        }
      }

      // 6. RERA Approved
      if (rera) {
        const reraText = (p.badges?.rera || '').toLowerCase();
        if (!reraText.includes('rera') && !reraText.includes('approved') && !reraText.includes('sanctioned')) {
          return false;
        }
      }

      // 7. CMDA / DTCP Sanctioned
      if (cmda) {
        const isPlot = p.propertyType === 'Gated CMDA Plots';
        const reraText = (p.badges?.rera || '').toLowerCase();
        const tagText = (p.badges?.specialTag || '').toLowerCase();
        const cmdaMatch = isPlot || reraText.includes('cmda') || reraText.includes('dtcp') || tagText.includes('cmda') || tagText.includes('dtcp') || tagText.includes('patta');
        if (!cmdaMatch) return false;
      }

      // 8. Zero Brokerage
      if (zeroBrok) {
        const brok = (p.badges?.brokerage || '').toLowerCase();
        if (!brok.includes('0%') && !brok.includes('zero')) {
          return false;
        }
      }

      // 9. 4K Video Tour Available
      if (video) {
        const mediaList = p.premiumMedia || [];
        const hasVideo = mediaList.some(m => m && m.type === 'video');
        if (!hasVideo) return false;
      }

      // 10. Drone Survey Available
      if (drone) {
        const mediaList = p.premiumMedia || [];
        const hasDrone = mediaList.some(m => 
          m && (
            (m.tag && (m.tag.toLowerCase().includes('drone') || m.tag.toLowerCase().includes('aerial'))) || 
            (m.title && (m.title.toLowerCase().includes('drone') || m.title.toLowerCase().includes('aerial')))
          )
        );
        if (!hasDrone) return false;
      }

      // 11. Ready to Move / Clear Patta
      if (ready) {
        const highlightsList = p.highlights || [];
        const hasReady = highlightsList.some(h => 
          h && (
            h.toLowerCase().includes('ready') || 
            h.toLowerCase().includes('patta') || 
            h.toLowerCase().includes('immediate')
          )
        ) || (p.title && p.title.toLowerCase().includes('ready'));
        if (!hasReady) return false;
      }

      return true;
    });

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

    return sorted;
  });

  ngOnInit(): void {
    // Fetch live properties from MySQL backend
    this.propertyService.loadPropertiesFromApi();

    // Record current URL for seamless back-navigation from property details
    this.propertyService.setLastSearchUrl(this.router.url);

    // Sync query parameters into component signals
    this.route.queryParams.subscribe(params => {
      if (params['q']) {
        this.searchQuery.set(params['q']);
      }
      if (params['city']) {
        this.selectedCity.set(params['city']);
      }
      if (params['type']) {
        this.selectedType.set(params['type']);
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
      if (params['zero'] === 'true') {
        this.zeroBrokerageOnly.set(true);
      }
      if (params['ready'] === 'true' || params['status'] === 'ready') {
        this.readyToMoveOnly.set(true);
      }
    });
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
  }

  clearSearchQuery(): void {
    this.searchQuery.set('');
  }

  selectAllAssets(): void {
    this.selectedType.set('all');
    this.selectedBudget.set('all');
    this.videoOnly.set(false);
    this.droneOnly.set(false);
  }

  setType(type: string): void {
    this.selectedType.set(type);
  }

  setBudget(budget: string): void {
    this.selectedBudget.set(budget);
  }

  setCity(city: string): void {
    this.selectedCity.set(city);
  }

  setBhk(bhk: string): void {
    this.selectedBhk.set(bhk);
  }

  setSort(sort: string): void {
    this.sortBy.set(sort);
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

  toggleZeroBrokerage(): void {
    this.zeroBrokerageOnly.update(v => !v);
  }

  toggleReadyToMove(): void {
    this.readyToMoveOnly.update(v => !v);
  }

  resetAllFilters(): void {
    this.searchQuery.set('');
    this.selectedCity.set('all');
    this.selectedType.set('all');
    this.selectedBudget.set('all');
    this.selectedBhk.set('all');
    this.reraOnly.set(false);
    this.cmdaOnly.set(false);
    this.zeroBrokerageOnly.set(false);
    this.videoOnly.set(false);
    this.droneOnly.set(false);
    this.readyToMoveOnly.set(false);
    this.sortBy.set('featured');

    this.notificationService.show({
      type: 'info',
      title: 'Filters Reset',
      message: 'All registry search filters have been restored to default.',
      icon: 'restart_alt'
    });
  }

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80';
  }
}