import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NotificationService } from './notification.service';
import { environment } from '../../../environments/environment';

export type VisitorPurposeKey =
  | 'build_home'
  | 'investment'
  | 'premium_plots'
  | 'growth_locations'
  | 'budget_plots'
  | 'large_land'
  | 'exploring';

export interface VisitorPurposeOption {
  key: VisitorPurposeKey;
  title: string;
  badge: string;
  tagline: string;
  icon: string;
  themeColor: string;
  lightBg: string;
}

const STORAGE_PURPOSE_KEY = 'findaplot_visitor_purpose';
const STORAGE_PURPOSE_NOTE = 'findaplot_visitor_purpose_note';
const STORAGE_DISMISSED_KEY = 'findaplot_visitor_purpose_dismissed';

@Injectable({
  providedIn: 'root'
})
export class VisitorPurposeService {
  private readonly notificationService = inject(NotificationService);
  private readonly http = inject(HttpClient);

  readonly options: VisitorPurposeOption[] = [
    {
      key: 'build_home',
      title: 'Build a home.',
      badge: 'Ready to Build',
      tagline: 'Verified plots and CMDA / DTCP layouts ready for immediate home construction.',
      icon: 'cottage',
      themeColor: '#5e8f72',
      lightBg: '#e5f7ec'
    },
    {
      key: 'investment',
      title: 'Long-term investment.',
      badge: 'High Growth',
      tagline: 'High-appreciation plotted developments and emerging strategic corridors.',
      icon: 'trending_up',
      themeColor: '#0f3b4a',
      lightBg: '#e8f3f6'
    },
    {
      key: 'premium_plots',
      title: 'Premium residential plots.',
      badge: 'Gated Luxury',
      tagline: 'Curated gated communities with clubhouse, wide roads, and elite amenities.',
      icon: 'workspace_premium',
      themeColor: '#5e8f72',
      lightBg: '#e5f7ec'
    },
    {
      key: 'growth_locations',
      title: 'Emerging growth locations.',
      badge: 'Future Hubs',
      tagline: 'Investment pockets near proposed metro corridors, expressways, and industrial corridors.',
      icon: 'share_location',
      themeColor: '#0f3b4a',
      lightBg: '#e8f3f6'
    },
    {
      key: 'budget_plots',
      title: 'Budget-friendly plots.',
      badge: 'Affordable Entry',
      tagline: 'Clear-title approved plots under ₹25–35 Lakhs with high return potential.',
      icon: 'savings',
      themeColor: '#5e8f72',
      lightBg: '#e5f7ec'
    },
    {
      key: 'large_land',
      title: 'Larger land investments.',
      badge: 'Acreage & Estates',
      tagline: 'Multi-ground parcels and agricultural/estate acreage for long-term land banking.',
      icon: 'terrain',
      themeColor: '#0f3b4a',
      lightBg: '#e8f3f6'
    },
    {
      key: 'exploring',
      title: 'Exploring',
      badge: 'Market Discovery',
      tagline: 'Browsing verified plotted developments and market intelligence without immediate commitment.',
      icon: 'travel_explore',
      themeColor: '#5e8f72',
      lightBg: '#e5f7ec'
    }
  ];

  // Modal Visibility State
  readonly isModalOpen = signal<boolean>(false);

  // Current Selected Purpose State
  readonly currentPurpose = signal<VisitorPurposeKey | null>(this.getStoredPurpose());
  readonly currentNote = signal<string>(this.getStoredNote());

  constructor() {
    this.checkFirstVisit();
  }

  private getStoredPurpose(): VisitorPurposeKey | null {
    try {
      if (typeof localStorage !== 'undefined') {
        const val = localStorage.getItem(STORAGE_PURPOSE_KEY) || localStorage.getItem('mannidam_visitor_purpose');
        const validKeys: VisitorPurposeKey[] = [
          'build_home',
          'investment',
          'premium_plots',
          'growth_locations',
          'budget_plots',
          'large_land',
          'exploring'
        ];
        if (val && (validKeys as string[]).includes(val)) {
          return val as VisitorPurposeKey;
        }
      }
    } catch { }
    return null;
  }

  private getStoredNote(): string {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(STORAGE_PURPOSE_NOTE) || localStorage.getItem('mannidam_visitor_purpose_note') || '';
      }
    } catch { }
    return '';
  }

  /**
   * Automatically displays the stylish popup on first-time visit (including localhost)
   */
  public checkFirstVisit(): void {
    if (typeof window === 'undefined') return;

    try {
      const storedPurpose = localStorage.getItem(STORAGE_PURPOSE_KEY) || localStorage.getItem('mannidam_visitor_purpose');
      const dismissed = localStorage.getItem(STORAGE_DISMISSED_KEY) || localStorage.getItem('mannidam_visitor_purpose_dismissed');

        // Check if user is logged in
        const authUserStr = localStorage.getItem('findaplot_auth_user') || localStorage.getItem('mannidam_auth_user');
        if (authUserStr) {
          try {
            const user = JSON.parse(authUserStr);
            if (user) {
              this.checkOnLogin(user, false);
              return;
            }
          } catch { }
        }

        // First-time guest visit: prompt if not previously set or dismissed
        if (!storedPurpose && !dismissed && !(typeof navigator !== 'undefined' && navigator.webdriver)) {
          setTimeout(() => {
            this.isModalOpen.set(true);
          }, 850);
        }
      } catch { }
    }

  /**
   * Prompts user with "What is your primary goal?" modal on first login or if unselected
   */
  public checkOnLogin(user: any, isExplicitFirstLogin = false): void {
    if (typeof window === 'undefined' || !user) return;

    // Staff/admin roles use operational portals, skip buyer goal onboarding
    const adminRoles = [
      'admin',
      'super_admin',
      'co_admin',
      'sales_executive',
      'property_advisor',
      'operations_executive',
      'finance_admin',
      'content_gis_admin'
    ];
    if (adminRoles.includes(user.role)) return;

    const userId = user.id;
    const userPurposeKey = `fap_user_${userId}_visitor_purpose`;
    const userDismissedKey = `fap_user_${userId}_visitor_purpose_dismissed`;

    // 1. If user already has a saved primary goal:
    const existingGoal = user.primaryGoal || (typeof localStorage !== 'undefined' ? localStorage.getItem(userPurposeKey) : null);
    if (existingGoal) {
      this.currentPurpose.set(existingGoal as VisitorPurposeKey);
      try {
        localStorage.setItem(STORAGE_PURPOSE_KEY, existingGoal);
      } catch { }
      return;
    }

    // 2. If it is first login OR this user has not chosen their primary goal yet:
    const userDismissed = typeof localStorage !== 'undefined' ? localStorage.getItem(userDismissedKey) : null;
    if (isExplicitFirstLogin || !userDismissed) {
      setTimeout(() => {
        this.isModalOpen.set(true);
      }, 700);
    }
  }

  public openModal(): void {
    this.isModalOpen.set(true);
  }

  public closeModal(): void {
    this.isModalOpen.set(false);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_DISMISSED_KEY, 'true');

        // Also mark dismissed for logged-in user session
        const authUserStr = localStorage.getItem('findaplot_auth_user') || localStorage.getItem('mannidam_auth_user');
        if (authUserStr) {
          try {
            const user = JSON.parse(authUserStr);
            if (user?.id) {
              localStorage.setItem(`fap_user_${user.id}_visitor_purpose_dismissed`, 'true');
            }
          } catch { }
        }
      }
    } catch { }
  }

  public savePurpose(key: VisitorPurposeKey, note?: string): void {
    this.currentPurpose.set(key);
    if (note !== undefined) {
      this.currentNote.set(note);
    }

    let loggedInUserId: number | null = null;
    let loggedInPhone: string | null = null;

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_PURPOSE_KEY, key);
        if (note) {
          localStorage.setItem(STORAGE_PURPOSE_NOTE, note);
        }
        localStorage.setItem(STORAGE_DISMISSED_KEY, 'true');

        // Check if user is logged in
        const authUserStr = localStorage.getItem('findaplot_auth_user') || localStorage.getItem('mannidam_auth_user');
        if (authUserStr) {
          try {
            const user = JSON.parse(authUserStr);
            if (user?.id) {
              loggedInUserId = Number(user.id);
              loggedInPhone = user.phone || null;
              localStorage.setItem(`fap_user_${user.id}_visitor_purpose`, key);
              localStorage.setItem(`fap_user_${user.id}_visitor_purpose_dismissed`, 'true');
              user.primaryGoal = key;
              localStorage.setItem('findaplot_auth_user', JSON.stringify(user));
            }
          } catch { }
        }
      }
    } catch { }

    // Persist to MySQL backend if user is identified or phone is available
    if (loggedInUserId || loggedInPhone) {
      this.http.post(`${environment.apiUrl}/auth/save-purpose.php`, {
        userId: loggedInUserId,
        phone: loggedInPhone,
        purpose: key,
        note: note || ''
      }).subscribe({
        error: () => {
          // Non-fatal, local storage is already set
        }
      });
    }

    this.isModalOpen.set(false);

    const chosenOption = this.options.find(o => o.key === key);
    const title = chosenOption ? chosenOption.title : 'Personalized Scouting';

    this.notificationService.show({
      type: 'success',
      title: `Welcome! Curating for ${title}`,
      message: `We've personalized your verified listings and architectural video walkthroughs.`,
      icon: chosenOption?.icon || 'check_circle'
    });
  }

  public getSelectedOption(): VisitorPurposeOption | undefined {
    const key = this.currentPurpose();
    return this.options.find(o => o.key === key);
  }
}
