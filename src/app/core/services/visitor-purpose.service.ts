import { Injectable, signal, inject } from '@angular/core';
import { NotificationService } from './notification.service';

export type VisitorPurposeKey = 'build_home' | 'investment' | 'farm_land' | 'other';

export interface VisitorPurposeOption {
  key: VisitorPurposeKey;
  title: string;
  badge: string;
  tagline: string;
  icon: string;
  themeColor: string;
  lightBg: string;
}

const STORAGE_PURPOSE_KEY = 'mannidam_visitor_purpose';
const STORAGE_PURPOSE_NOTE = 'mannidam_visitor_purpose_note';
const STORAGE_DISMISSED_KEY = 'mannidam_visitor_purpose_dismissed';

@Injectable({
  providedIn: 'root'
})
export class VisitorPurposeService {
  private readonly notificationService = inject(NotificationService);

  readonly options: VisitorPurposeOption[] = [
    {
      key: 'build_home',
      title: 'To Build a Home',
      badge: 'Plots & Custom Homes',
      tagline: 'Verified residential plots, CMDA/DTCP layouts, or land to construct your dream home.',
      icon: 'cottage',
      themeColor: '#b91c1c',
      lightBg: '#fef2f2'
    },
    {
      key: 'investment',
      title: 'Investment',
      badge: 'High Yield & Growth',
      tagline: 'High-appreciation metro corridors, commercial assets, and high-rental yield properties.',
      icon: 'trending_up',
      themeColor: '#d97706',
      lightBg: '#fffbeb'
    },
    {
      key: 'farm_land',
      title: 'Farm Land',
      badge: 'Managed Eco Enclaves',
      tagline: 'Scenic agricultural acreage, managed farmhouse retreats, and green plots with clear titles.',
      icon: 'yard',
      themeColor: '#059669',
      lightBg: '#ecfdf5'
    },
    {
      key: 'other',
      title: 'Other',
      badge: 'Custom Requirements',
      tagline: 'Architectural video scouting, institutional due diligence, or custom property requests.',
      icon: 'interests',
      themeColor: '#7c3aed',
      lightBg: '#f5f3ff'
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
        const val = localStorage.getItem(STORAGE_PURPOSE_KEY);
        if (val && ['build_home', 'investment', 'farm_land', 'other'].includes(val)) {
          return val as VisitorPurposeKey;
        }
      }
    } catch {}
    return null;
  }

  private getStoredNote(): string {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(STORAGE_PURPOSE_NOTE) || '';
      }
    } catch {}
    return '';
  }

  /**
   * Automatically displays the stylish popup on first-time visit
   */
  public checkFirstVisit(): void {
    if (typeof window === 'undefined') return;

    try {
      const storedPurpose = localStorage.getItem(STORAGE_PURPOSE_KEY);
      const dismissed = localStorage.getItem(STORAGE_DISMISSED_KEY);

      if (!storedPurpose && !dismissed) {
        // Subtle entrance delay after initial UI paint
        setTimeout(() => {
          this.isModalOpen.set(true);
        }, 850);
      }
    } catch {}
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
    } catch {}
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
    } catch {}

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
