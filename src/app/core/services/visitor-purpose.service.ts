import { Injectable, signal, inject } from '@angular/core';
import { NotificationService } from './notification.service';

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
   * Automatically displays the stylish popup on first-time visit
   */
  public checkFirstVisit(): void {
    if (typeof window === 'undefined') return;

    try {
      const storedPurpose = localStorage.getItem(STORAGE_PURPOSE_KEY) || localStorage.getItem('mannidam_visitor_purpose');
      const dismissed = localStorage.getItem(STORAGE_DISMISSED_KEY) || localStorage.getItem('mannidam_visitor_purpose_dismissed');

      if (!storedPurpose && !dismissed) {
        // Subtle entrance delay after initial UI paint
        setTimeout(() => {
          this.isModalOpen.set(true);
        }, 850);
      }
    } catch { }
  }

  public openModal(): void {
    this.isModalOpen.set(true);
  }

  public closeModal(): void {
    this.isModalOpen.set(false);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_DISMISSED_KEY, 'true');
      }
    } catch { }
  }

  public savePurpose(key: VisitorPurposeKey, note?: string): void {
    this.currentPurpose.set(key);
    if (note !== undefined) {
      this.currentNote.set(note);
    }

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_PURPOSE_KEY, key);
        if (note) {
          localStorage.setItem(STORAGE_PURPOSE_NOTE, note);
        }
        localStorage.setItem(STORAGE_DISMISSED_KEY, 'true');
      }
    } catch { }

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
