import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Property } from '../models/property.model';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

export interface BrowsingRecord {
  propertyId: string;
  title: string;
  propertyType: string;
  price: string;
  priceInr: number;
  locality: string;
  city: string;
  imageUrl?: string;
  actionType: 'view' | 'shortlist' | 'brochure' | 'site_visit';
  viewedAt: string;
}

export interface UserMindsetAnalytics {
  userPhone: string;
  totalViewed: number;
  plotsCount: number;
  flatsCount: number;
  plotsPercentage: number;
  flatsPercentage: number;
  minPrice: number;
  maxPrice: number;
  priceRange: string;
  avgPrice: number;
  avgPriceFormatted: string;
  topLocalities: string[];
  mindsetBrief: string;
  buyerArchetype: string;
  urgency: string;
  recommendation: string;
  lastActive: string;
  recentViews: any[];
}

const STORAGE_PHONE_KEY = 'mannidam_active_buyer_phone';
const STORAGE_HISTORY_KEY = 'mannidam_buyer_browsing_history';

export function parsePriceToINR(priceStr: string): number {
  if (!priceStr) return 0;
  const clean = priceStr.replace(/₹|,|\s/g, '').toLowerCase();
  if (clean.includes('cr')) {
    const num = parseFloat(clean.replace('cr', '').trim());
    return isNaN(num) ? 0 : Math.round(num * 10000000);
  }
  if (clean.includes('lakh') || clean.includes('l')) {
    const num = parseFloat(clean.replace(/lakhs|lakh|l/g, '').trim());
    return isNaN(num) ? 0 : Math.round(num * 100000);
  }
  const direct = parseFloat(clean);
  return isNaN(direct) ? 0 : Math.round(direct);
}

export function formatINR(val: number): string {
  if (val >= 10000000) {
    const cr = (val / 10000000).toFixed(2).replace(/\.00$/, '');
    return `${cr} Cr`;
  }
  if (val >= 100000) {
    const lakh = (val / 100000).toFixed(1).replace(/\.0$/, '');
    return `${lakh} Lakhs`;
  }
  return `₹${val.toLocaleString('en-IN')}`;
}

@Injectable({
  providedIn: 'root'
})
export class UserBehaviorService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  // Authentication & Logged-In User Reactive Signals
  public readonly currentUser = computed(() => this.authService.currentUser());
  public readonly isLoggedIn = computed(() => this.authService.isLoggedIn());

  // Active phone number (synchronizes with logged in user or guest session)
  public readonly activeUserPhone = signal<string>(this.getInitialPhone());

  // Formatted User Display Identifier
  public readonly displayIdentifier = computed<string>(() => {
    const user = this.currentUser();
    if (user) {
      return user.phone ? user.phone.trim() : (user.name || 'Verified User');
    }
    const phone = this.activeUserPhone();
    return phone && phone !== 'Guest Visitor' ? phone : 'Guest Visitor';
  });

  public readonly displayFullTitle = computed<string>(() => {
    const user = this.currentUser();
    if (user) {
      return `${user.name} (${user.phone})`;
    }
    return this.activeUserPhone();
  });

  // Browsing history
  public readonly browsingHistory = signal<BrowsingRecord[]>(this.getInitialHistory());

  // Mindset Drawer / Modal visibility
  public readonly isMindsetDrawerOpen = signal<boolean>(false);

  // Live Backend Synchronized Data
  public readonly backendMindsetData = signal<UserMindsetAnalytics | null>(null);

  // Unique properties viewed
  public readonly uniqueViewedCount = computed(() => {
    const map = new Set(this.browsingHistory().map(r => r.propertyId));
    return map.size;
  });

  // Plots count
  public readonly plotsCount = computed(() => {
    return this.browsingHistory().filter(r => 
      r.propertyType.toLowerCase().includes('plot')
    ).length;
  });

  // Flats count
  public readonly flatsCount = computed(() => {
    return this.browsingHistory().filter(r => 
      r.propertyType.toLowerCase().includes('flat') || 
      r.propertyType.toLowerCase().includes('apartment')
    ).length;
  });

  // Total classified items
  public readonly classifiedTotal = computed(() => {
    return this.plotsCount() + this.flatsCount();
  });

  // Percentage of interest towards plots
  public readonly plotsPercentage = computed(() => {
    const total = this.classifiedTotal();
    if (total === 0) return 0;
    return Math.round((this.plotsCount() / total) * 100);
  });

  // Percentage of interest towards flats
  public readonly flatsPercentage = computed(() => {
    const total = this.classifiedTotal();
    if (total === 0) return 0;
    return Math.round((this.flatsCount() / total) * 100);
  });

  // Price range (min and max)
  public readonly priceRange = computed<{ min: number; max: number; text: string }>(() => {
    const history = this.browsingHistory();
    if (history.length === 0) {
      return { min: 0, max: 0, text: 'No browsing activity yet' };
    }
    const prices = history.map(r => r.priceInr).filter(p => p > 0);
    if (prices.length === 0) {
      return { min: 0, max: 0, text: '₹0' };
    }
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return {
      min,
      max,
      text: `${formatINR(min)} to ${formatINR(max)}`
    };
  });

  // Top localities explored
  public readonly topLocalities = computed<string[]>(() => {
    const counts: { [loc: string]: number } = {};
    for (const r of this.browsingHistory()) {
      if (r.locality) {
        counts[r.locality] = (counts[r.locality] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0])
      .slice(0, 3);
  });

  // Buyer Archetype Classification
  public readonly buyerArchetype = computed<string>(() => {
    const pCount = this.plotsCount();
    const fCount = this.flatsCount();
    const range = this.priceRange();

    if (pCount === 0 && fCount === 0) return 'First-Time Explorer';
    if (pCount > fCount) {
      if (range.max >= 10000000) return 'High-Net-Worth Land Investor';
      return 'Strategic Land & Wealth Investor';
    }
    if (fCount > pCount) {
      if (range.max >= 15000000) return 'Luxury Urban Homebuyer';
      return 'Ready Residential Home Seeker';
    }
    return 'Dual Comparative Explorer (Plot ROI vs Flat Occupancy)';
  });

  // Synthesized Natural Language Mindset Brief (Matches user's prompt specification)
  public readonly mindsetBrief = computed<string>(() => {
    const user = this.currentUser();
    const phone = this.activeUserPhone();
    const isGuest = !user && (phone === 'Guest Visitor');
    const userLabel = user 
      ? `${user.name} (${user.phone})`
      : (isGuest ? 'Guest user' : `${phone} user`);

    const pCount = this.plotsCount();
    const fCount = this.flatsCount();
    const pPct = this.plotsPercentage();
    const fPct = this.flatsPercentage();
    const range = this.priceRange();
    const topLoc = this.topLocalities();
    const locSnippet = topLoc.length > 0 ? ` around ${topLoc.join(', ')}` : '';

    if (pCount === 0 && fCount === 0) {
      return `${userLabel} visited our site. As properties are browsed through flats and plots, live mindset intelligence will synthesize the buying persona here.`;
    }

    if (pCount > fCount) {
      return `${userLabel} viewed between ${range.text}. He viewed ${pCount} plot${pCount === 1 ? '' : 's'} and ${fCount} flat${fCount === 1 ? '' : 's'}, so the ${pPct}% of interest is towards plots and optionally viewed flats.${locSnippet ? ' Strong preference for land acquisition' + locSnippet + '.' : ''}`;
    } else if (fCount > pCount) {
      return `${userLabel} viewed between ${range.text}. He viewed ${fCount} flat${fCount === 1 ? '' : 's'} and ${pCount} plot${pCount === 1 ? '' : 's'}, so the ${fPct}% of interest is towards flats and optionally viewed plots.${locSnippet ? ' Focus on ready residential apartments' + locSnippet + '.' : ''}`;
    } else {
      return `${userLabel} viewed between ${range.text}. He viewed ${pCount} plot${pCount === 1 ? '' : 's'} and ${fCount} flat${fCount === 1 ? '' : 's'}, showing balanced 50% interest between plots and apartments${locSnippet}.`;
    }
  });

  // Actionable Recommendation for Sales Broker / AI Assistant
  public readonly recommendedAction = computed<string>(() => {
    const pCount = this.plotsCount();
    const fCount = this.flatsCount();
    const range = this.priceRange();
    const topLoc = this.topLocalities();
    const locStr = topLoc.length > 0 ? topLoc.join(' / ') : 'Chennai Growth Corridors';

    if (pCount > fCount) {
      return `Pitch CMDA/DTCP registered gated residential plots in ${locStr} within ${range.text} with clear Revenue Patta and immediate registration.`;
    } else if (fCount > pCount) {
      return `Present verified 2BHK/3BHK ready-to-move apartment complexes in ${locStr} within ${range.text} with zero brokerage and bank pre-approval.`;
    } else {
      return `Share a comparative capital appreciation dossier comparing plot land yield vs apartment rental yields in ${locStr}.`;
    }
  });

  constructor() {
    // Automatically synchronize tracked mindset identity with the logged-in user
    effect(() => {
      const user = this.authService.currentUser();
      if (user && user.phone) {
        const clean = user.phone.trim();
        this.activeUserPhone.set(clean);
        this.fetchBackendMindset(clean);
      } else {
        const stored = localStorage.getItem(STORAGE_PHONE_KEY);
        if (stored && stored !== '9486140936' && stored !== 'Guest Visitor') {
          this.activeUserPhone.set(stored);
          this.fetchBackendMindset(stored);
        } else {
          this.activeUserPhone.set('Guest Visitor');
        }
      }
    }, { allowSignalWrites: true });
  }

  private getInitialPhone(): string {
    const user = this.authService.currentUser();
    if (user && user.phone) return user.phone.trim();
    try {
      const stored = localStorage.getItem(STORAGE_PHONE_KEY);
      if (stored && stored !== '9486140936') return stored;
    } catch {}
    return 'Guest Visitor';
  }

  private getInitialHistory(): BrowsingRecord[] {
    try {
      const raw = localStorage.getItem(STORAGE_HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  }

  private persistLocally(): void {
    try {
      localStorage.setItem(STORAGE_PHONE_KEY, this.activeUserPhone());
      localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(this.browsingHistory()));
    } catch {}
  }

  /**
   * Set or change active tracked phone number
   */
  public setUserPhone(newPhone: string): void {
    const clean = newPhone.trim();
    if (!clean) return;
    this.activeUserPhone.set(clean);
    this.persistLocally();
    this.fetchBackendMindset(clean);
  }

  /**
   * Open or close Mindset drawer
   */
  public toggleMindsetDrawer(): void {
    this.isMindsetDrawerOpen.update(v => !v);
  }

  public openMindsetDrawer(): void {
    this.isMindsetDrawerOpen.set(true);
  }

  public closeMindsetDrawer(): void {
    this.isMindsetDrawerOpen.set(false);
  }

  /**
   * Track a property browsing view
   */
  public trackPropertyView(property: Property, actionType: 'view' | 'shortlist' | 'brochure' | 'site_visit' = 'view'): void {
    if (!property || !property.id) return;

    const record: BrowsingRecord = {
      propertyId: property.id,
      title: property.title,
      propertyType: property.propertyType,
      price: property.price,
      priceInr: parsePriceToINR(property.price),
      locality: property.locality,
      city: property.city,
      imageUrl: property.imageUrl,
      actionType,
      viewedAt: new Date().toISOString()
    };

    // Prepend to browsing history (avoid immediate duplicate on top)
    this.browsingHistory.update(list => {
      const filtered = list.filter(r => r.propertyId !== property.id);
      return [record, ...filtered].slice(0, 30);
    });

    this.persistLocally();

    // Sync to MySQL Backend via POST /api/analytics/track.php
    const user = this.authService.currentUser();
    const phoneToTrack = user?.phone?.trim() 
      || (this.activeUserPhone() !== 'Guest Visitor' ? this.activeUserPhone() : 'guest_' + this.authService.getDeviceFingerprint());

    const payload = {
      phone: phoneToTrack,
      propertyId: property.id,
      propertyTitle: property.title,
      propertyType: property.propertyType,
      price: property.price,
      locality: property.locality,
      city: property.city,
      actionType
    };

    this.http.post<any>(`${environment.apiUrl}/analytics/track.php`, payload).pipe(
      catchError(() => this.http.post<any>('http://localhost:8000/api/analytics/track.php', payload)),
      catchError(() => of(null))
    ).subscribe();
  }

  /**
   * Fetch aggregate user mindset brief from backend MySQL database
   */
  public fetchBackendMindset(phone: string = this.activeUserPhone()): void {
    const url = `${environment.apiUrl}/analytics/user-mindset.php?phone=${encodeURIComponent(phone)}`;
    const cliUrl = `http://localhost:8000/api/analytics/user-mindset.php?phone=${encodeURIComponent(phone)}`;

    this.http.get<{ success: boolean; data: UserMindsetAnalytics }>(url).pipe(
      catchError(() => this.http.get<{ success: boolean; data: UserMindsetAnalytics }>(cliUrl)),
      tap(res => {
        if (res && res.success && res.data) {
          this.backendMindsetData.set(res.data);
        }
      }),
      catchError(() => of(null))
    ).subscribe();
  }

  /**
   * Simulate user scenario:
   * Exactly matches prompt: 4 plots + 1 flat between 20L - 40L for 9486140936 (80% Plots)
   */
  public simulateUserPromptScenario(openDrawer: boolean = true): void {
    this.activeUserPhone.set('9486140936');
    const mockViews: BrowsingRecord[] = [
      {
        propertyId: 'prop-plot-05',
        title: 'Vandalur Hillview Residential Plot',
        propertyType: 'Gated CMDA Plots',
        price: '₹ 22.0 Lakhs',
        priceInr: 2200000,
        locality: 'Vandalur',
        city: 'Chennai',
        imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
        actionType: 'view',
        viewedAt: new Date(Date.now() - 1000 * 60 * 20).toISOString()
      },
      {
        propertyId: 'prop-plot-06',
        title: 'Avadi North Gated Avenue Plot',
        propertyType: 'Gated CMDA Plots',
        price: '₹ 24.5 Lakhs',
        priceInr: 2450000,
        locality: 'Avadi',
        city: 'Chennai',
        imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
        actionType: 'view',
        viewedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString()
      },
      {
        propertyId: 'prop-plot-08',
        title: 'Tambaram West CMDA Sanctioned Plot',
        propertyType: 'Gated CMDA Plots',
        price: '₹ 31.0 Lakhs',
        priceInr: 3100000,
        locality: 'Tambaram',
        city: 'Chennai',
        imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
        actionType: 'view',
        viewedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString()
      },
      {
        propertyId: 'prop-plot-09',
        title: 'Perungalathur Grand Vista Plot',
        propertyType: 'Gated CMDA Plots',
        price: '₹ 35.0 Lakhs',
        priceInr: 3500000,
        locality: 'Perungalathur',
        city: 'Chennai',
        imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
        actionType: 'view',
        viewedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString()
      },
      {
        propertyId: 'prop-flat-29',
        title: 'Tambaram Comfort Heights 2BHK Flat',
        propertyType: 'Apartments & Flats',
        price: '₹ 33.5 Lakhs',
        priceInr: 3350000,
        locality: 'Tambaram',
        city: 'Chennai',
        imageUrl: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
        actionType: 'view',
        viewedAt: new Date().toISOString()
      }
    ];

    this.browsingHistory.set(mockViews);
    this.persistLocally();
    if (openDrawer) this.isMindsetDrawerOpen.set(true);
  }

  /**
   * Simulate flat dominant buyer: 4 flats + 1 plot (80% Flats)
   */
  public simulateFlatDominantScenario(): void {
    this.activeUserPhone.set('9840123456');
    const mockViews: BrowsingRecord[] = [
      {
        propertyId: 'prop-flat-28',
        title: 'Avadi Metro Greens 2BHK Flat',
        propertyType: 'Apartments & Flats',
        price: '₹ 28.0 Lakhs',
        priceInr: 2800000,
        locality: 'Avadi',
        city: 'Chennai',
        imageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
        actionType: 'view',
        viewedAt: new Date(Date.now() - 1000 * 60 * 20).toISOString()
      },
      {
        propertyId: 'prop-flat-29',
        title: 'Tambaram Comfort Heights 2BHK Flat',
        propertyType: 'Apartments & Flats',
        price: '₹ 33.5 Lakhs',
        priceInr: 3350000,
        locality: 'Tambaram',
        city: 'Chennai',
        imageUrl: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
        actionType: 'view',
        viewedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString()
      },
      {
        propertyId: 'prop-flat-30',
        title: 'Poonamallee High-Rise 2BHK Apartment',
        propertyType: 'Apartments & Flats',
        price: '₹ 38.0 Lakhs',
        priceInr: 3800000,
        locality: 'Poonamallee',
        city: 'Chennai',
        imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
        actionType: 'view',
        viewedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString()
      },
      {
        propertyId: 'prop-flat-31',
        title: 'Chromepet Balcony Haven 2BHK Flat',
        propertyType: 'Apartments & Flats',
        price: '₹ 43.5 Lakhs',
        priceInr: 4350000,
        locality: 'Chromepet',
        city: 'Chennai',
        imageUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
        actionType: 'view',
        viewedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString()
      },
      {
        propertyId: 'prop-plot-08',
        title: 'Tambaram West CMDA Sanctioned Plot',
        propertyType: 'Gated CMDA Plots',
        price: '₹ 31.0 Lakhs',
        priceInr: 3100000,
        locality: 'Tambaram',
        city: 'Chennai',
        imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
        actionType: 'view',
        viewedAt: new Date().toISOString()
      }
    ];

    this.browsingHistory.set(mockViews);
    this.persistLocally();
    this.isMindsetDrawerOpen.set(true);
  }

  /**
   * Reset browsing history
   */
  public clearHistory(): void {
    const currentPhone = this.activeUserPhone();
    this.browsingHistory.set([]);
    this.persistLocally();

    if (currentPhone) {
      this.http.post<any>(`${environment.apiUrl}/analytics/clear.php`, { phone: currentPhone })
        .pipe(catchError(() => of(null)))
        .subscribe();
    }
  }
}
