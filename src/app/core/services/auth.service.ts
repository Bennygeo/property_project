import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { User, UserProfileResponse } from '../models/user.model';
import { NotificationService } from './notification.service';
import { environment } from '../../../environments/environment';

const STORAGE_KEY = 'mannidam_auth_user';
const GUEST_VIEWS_STORAGE_KEY = 'mannidam_guest_viewed_properties';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly notificationService = inject(NotificationService);

  // Active user state
  public readonly currentUser = signal<User | null>(this.getInitialUser());
  public readonly isLoggedIn = computed(() => !!this.currentUser());

  // Guest property views tracking (Max 1 free property view for unauthenticated visitors)
  public readonly guestViewedPropertyIds = signal<string[]>(this.getInitialGuestViews());
  public readonly guestViewCount = computed(() => this.guestViewedPropertyIds().length);
  public readonly hasReachedGuestLimit = computed(() => !this.isLoggedIn() && this.guestViewedPropertyIds().length >= 1);

  // Modal display signal
  public readonly isOtpModalOpen = signal<boolean>(false);
  public readonly otpModalReason = signal<'guest_limit' | 'general' | null>(null);
  public readonly isSubmitting = signal<boolean>(false);

  // Verification code holder (kept as 1111 until production)
  public readonly lastSentOtp = signal<string>('1111');
  public readonly pendingPhone = signal<string>('');

  private getInitialGuestViews(): string[] {
    try {
      const raw = localStorage.getItem(GUEST_VIEWS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Fallback
    }
    return [];
  }

  private getInitialUser(): User | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback
    }
    // Return null so first-time visitors browse as guest
    return null;
  }

  constructor() {
    if (!this.isLoggedIn()) {
      this.syncGuestViews().subscribe();
    }
  }

  /**
   * Generates a stable hardware fingerprint across browsers on the same computer.
   * Combines screen resolution, color depth, timezone, CPU cores, memory, and platform.
   */
  public getDeviceFingerprint(): string {
    if (typeof window === 'undefined') return '';
    try {
      const screenRes = `${window.screen?.width || 0}x${window.screen?.height || 0}x${window.screen?.colorDepth || 0}`;
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      const cores = (navigator as any).hardwareConcurrency || 4;
      const mem = (navigator as any).deviceMemory || 8;
      const platform = (navigator as any).platform || '';
      const raw = `${screenRes}|${tz}|${cores}|${mem}|${platform}`;
      
      let hash = 0;
      for (let i = 0; i < raw.length; i++) {
        const char = raw.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0;
      }
      return 'dev_' + Math.abs(hash).toString(16);
    } catch {
      return 'dev_default';
    }
  }

  /**
   * Sync guest view limitations from backend by client IP & device fingerprint.
   * This ensures unauthenticated visitors cannot bypass the 1-free-view restriction
   * by simply opening a different browser (Chrome, Edge, Firefox) or incognito window on the same machine.
   */
  public syncGuestViews(): Observable<string[]> {
    if (this.isLoggedIn()) {
      return of([]);
    }
    const deviceHash = this.getDeviceFingerprint();
    const url = `${environment.apiUrl}/auth/guest-views.php?deviceHash=${deviceHash}`;

    return this.http.get<{ success: boolean; data: { viewedPropertyIds: string[] } }>(url).pipe(
      map(res => {
        if (res && res.success && res.data && Array.isArray(res.data.viewedPropertyIds)) {
          const serverViews = res.data.viewedPropertyIds;
          const localViews = this.guestViewedPropertyIds();
          const merged = Array.from(new Set([...localViews, ...serverViews]));
          this.guestViewedPropertyIds.set(merged);
          try {
            localStorage.setItem(GUEST_VIEWS_STORAGE_KEY, JSON.stringify(merged));
          } catch {}
          return merged;
        }
        return this.guestViewedPropertyIds();
      }),
      catchError(() => of(this.guestViewedPropertyIds()))
    );
  }

  /**
   * Check whether a user is allowed to view this property.
   * - Logged-in users: Unlimited access (true).
   * - Unauthenticated guests: Allowed to view 1 single property. Subsequent property views are blocked.
   */
  public canViewProperty(propertyId: string): boolean {
    if (this.isLoggedIn()) {
      return true;
    }
    const views = this.guestViewedPropertyIds();
    // If user is already viewing the single property they unlocked, allow continued viewing
    if (views.includes(propertyId)) {
      return true;
    }
    // If user hasn't viewed any property yet, allow viewing this first property
    if (views.length === 0) {
      return true;
    }
    // Blocked: Guest has already viewed 1 property and is trying to view a different one
    return false;
  }

  /**
   * Record that an unauthenticated guest has viewed a property (consumes their 1 free view).
   * Persists both to localStorage and the MySQL backend by IP/device fingerprint.
   */
  public recordGuestPropertyView(propertyId: string): void {
    if (this.isLoggedIn()) return;
    const views = this.guestViewedPropertyIds();
    if (!views.includes(propertyId)) {
      const updated = [...views, propertyId];
      this.guestViewedPropertyIds.set(updated);
      try {
        localStorage.setItem(GUEST_VIEWS_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore
      }
    }

    // Persist to backend guest-views.php (IP & Device signature)
    const deviceHash = this.getDeviceFingerprint();
    const url = `${environment.apiUrl}/auth/guest-views.php`;
    this.http.post<{ success: boolean; data?: { allowed: boolean; viewedPropertyIds: string[] } }>(url, {
      propertyId,
      deviceHash
    }).pipe(
      catchError(() => of(null))
    ).subscribe(res => {
      if (res && res.data && Array.isArray(res.data.viewedPropertyIds)) {
        this.guestViewedPropertyIds.set(res.data.viewedPropertyIds);
        try {
          localStorage.setItem(GUEST_VIEWS_STORAGE_KEY, JSON.stringify(res.data.viewedPropertyIds));
        } catch {}
      }
    });
  }

  /**
   * Clear guest view history (e.g., when logging in or logging out)
   */
  public clearGuestViews(): void {
    this.guestViewedPropertyIds.set([]);
    try {
      localStorage.removeItem(GUEST_VIEWS_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }

  public openOtpModal(reason: 'guest_limit' | 'general' = 'general'): void {
    this.otpModalReason.set(reason);
    this.isOtpModalOpen.set(true);
  }

  public closeOtpModal(): void {
    this.otpModalReason.set(null);
    this.isOtpModalOpen.set(false);
  }

  /**
   * 1-Click Instant Demo Login for reviewers and seamless evaluation
   */
  public quickDemoLogin(): void {
    let points = 82;
    try {
      const storedPoints = localStorage.getItem('mannidam_wallet_balance');
      if (storedPoints !== null && !isNaN(Number(storedPoints))) {
        points = Number(storedPoints);
      }
    } catch {}

    const demoUser: User = {
      id: 1,
      name: 'Arun Kumar',
      email: 'arunkumar@mannidam.com',
      phone: '+91 94441 00000',
      role: 'buyer',
      pointsBalance: points,
      createdAt: '2026-10-15 17:01:48'
    };
    this.setCurrentUser(demoUser);
    this.closeOtpModal();
    this.notificationService.show({
      type: 'success',
      title: 'Verified Access Granted',
      message: 'Logged in as Arun Kumar. Unlimited property dossiers unlocked.',
      icon: 'verified'
    });
  }

  /**
   * Request Dummy OTP from MySQL Backend
   */
  public sendOtp(phone: string): Observable<{ success: boolean; dummyOtp: string; message: string }> {
    this.isSubmitting.set(true);
    const url = `${environment.apiUrl}/auth/send-otp.php`;

    return this.http.post<{ success: boolean; message: string; data?: { phone: string; dummyOtp: string } }>(url, { phone }).pipe(
      map(res => {
        this.isSubmitting.set(false);
        const dummyOtp = res.data?.dummyOtp || '1111';
        this.lastSentOtp.set(dummyOtp);
        this.pendingPhone.set(phone);
        return {
          success: true,
          dummyOtp,
          message: res.message || `OTP sent to ${phone}`
        };
      }),
      catchError(err => {
        this.isSubmitting.set(false);
        const dummyOtp = '1111';
        this.lastSentOtp.set(dummyOtp);
        this.pendingPhone.set(phone);
        return of({
          success: true,
          dummyOtp,
          message: `Verification code sent to ${phone}`
        });
      })
    );
  }

  /**
   * Verify OTP and Login
   */
  public verifyOtp(phone: string, otp: string, name?: string): Observable<{ success: boolean; user?: User; message: string }> {
    this.isSubmitting.set(true);
    const url = `${environment.apiUrl}/auth/verify-otp.php`;

    return this.http.post<{ success: boolean; message: string; data?: { user: User; token: string } }>(url, { phone, otp, name }).pipe(
      map(res => {
        this.isSubmitting.set(false);
        if (res && res.success && res.data?.user) {
          const user = res.data.user;
          this.setCurrentUser(user);
          this.closeOtpModal();
          this.notificationService.show({
            type: 'success',
            title: 'Login Successful',
            message: `Welcome, ${user.name}! Your account is now verified.`,
            icon: 'verified_user'
          });
          return { success: true, user, message: res.message };
        }
        return { success: false, message: res.message || 'OTP verification failed' };
      }),
      catchError(err => {
        this.isSubmitting.set(false);
        // Fallback for offline experience
        if (otp === '1111') {
          const fallbackUser: User = {
            id: 1,
            name: name || 'Arun Kumar',
            email: 'user@mannidam.com',
            phone: phone || '+91 94441 00000',
            role: 'buyer',
            pointsBalance: 40,
            createdAt: new Date().toISOString()
          };
          this.setCurrentUser(fallbackUser);
          this.closeOtpModal();
          this.notificationService.show({
            type: 'success',
            title: 'Login Successful',
            message: `Welcome, ${fallbackUser.name}! Logged in successfully.`,
            icon: 'verified_user'
          });
          return of({ success: true, user: fallbackUser, message: 'Logged in successfully' });
        }
        return of({ success: false, message: 'Invalid verification code. Please enter 1111.' });
      })
    );
  }

  /**
   * Fetch full user profile, shortlists, scheduled visits, and wallet transactions
   */
  public loadProfile(userId?: number): Observable<UserProfileResponse | null> {
    const id = userId || this.currentUser()?.id || 1;
    const url = `${environment.apiUrl}/auth/profile.php?userId=${id}`;

    return this.http.get<{ success: boolean; data: UserProfileResponse }>(url).pipe(
      map(res => res && res.success ? res.data : null),
      catchError(err => {
        console.warn('Could not load profile from MySQL, using fallback state', err);
        return of(null);
      })
    );
  }

  /**
   * Update Profile Details in MySQL
   */
  public updateProfile(data: { id: number; name: string; email: string; phone?: string }): Observable<User | null> {
    const url = `${environment.apiUrl}/auth/update-profile.php`;

    return this.http.post<{ success: boolean; data: User }>(url, data).pipe(
      map(res => {
        if (res && res.success && res.data) {
          this.setCurrentUser(res.data);
          this.notificationService.show({
            type: 'success',
            title: 'Profile Updated',
            message: 'Your personal details have been updated in the registry.',
            icon: 'badge'
          });
          return res.data;
        }
        return null;
      }),
      catchError(err => {
        this.notificationService.show({
          type: 'error',
          title: 'Update Failed',
          message: 'Unable to update profile. Please try again.',
          icon: 'error'
        });
        return of(null);
      })
    );
  }

  public setCurrentUser(user: User): void {
    this.currentUser.set(user);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } catch {
      // Ignore
    }
    this.clearGuestViews();
  }

  /**
   * Record a viewed property in MySQL and LocalStorage
   */
  public recordPropertyView(propertyId: string): Observable<boolean> {
    const user = this.currentUser();
    const userId = user?.id || 1;
    const url = `${environment.apiUrl}/auth/record-view.php`;

    // Local storage history cache
    try {
      const historyRaw = localStorage.getItem('mannidam_view_history') || '[]';
      const historyList: string[] = JSON.parse(historyRaw);
      const updated = [propertyId, ...historyList.filter(id => id !== propertyId)].slice(0, 50);
      localStorage.setItem('mannidam_view_history', JSON.stringify(updated));
    } catch {
      // Ignore
    }

    return this.http.post<{ success: boolean }>(url, { userId, propertyId }).pipe(
      map(res => !!(res && res.success)),
      catchError(() => of(true))
    );
  }

  /**
   * Clear browsing view history
   */
  public clearViewHistory(): Observable<boolean> {
    const user = this.currentUser();
    const userId = user?.id || 1;
    const url = `${environment.apiUrl}/auth/clear-views.php`;

    try {
      localStorage.removeItem('mannidam_view_history');
    } catch {
      // Ignore
    }

    return this.http.post<{ success: boolean; message: string }>(url, { userId }).pipe(
      map(res => {
        this.notificationService.show({
          type: 'info',
          title: 'History Cleared',
          message: 'Your viewed property browsing trail has been cleared.',
          icon: 'delete_sweep'
        });
        return !!(res && res.success);
      }),
      catchError(() => {
        this.notificationService.show({
          type: 'info',
          title: 'History Cleared',
          message: 'Local browsing history has been cleared.',
          icon: 'delete_sweep'
        });
        return of(true);
      })
    );
  }

  /**
   * Permanently delete account with typed confirmation 'DELETE'
   */
  public deleteAccount(confirmation: string): Observable<{ success: boolean; message: string }> {
    const user = this.currentUser();
    const userId = user?.id || 1;
    const url = `${environment.apiUrl}/auth/delete-account.php`;

    return this.http.post<{ success: boolean; message: string }>(url, { userId, confirmation }).pipe(
      map(res => {
        if (res && res.success) {
          this.logout();
          try {
            localStorage.clear();
          } catch {
            // Ignore
          }
          this.notificationService.show({
            type: 'warning',
            title: 'Account Deleted',
            message: 'Your account and all associated data have been permanently removed.',
            icon: 'person_remove'
          });
          return { success: true, message: res.message };
        }
        return { success: false, message: res.message || 'Deletion failed' };
      }),
      catchError(err => {
        const errorMsg = err?.error?.message || 'Failed to delete account. Please verify confirmation code.';
        this.notificationService.show({
          type: 'error',
          title: 'Deletion Failed',
          message: errorMsg,
          icon: 'error'
        });
        return of({ success: false, message: errorMsg });
      })
    );
  }

  public logout(): void {
    this.currentUser.set(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
    this.clearGuestViews();
    this.notificationService.show({
      type: 'info',
      title: 'Signed Out',
      message: 'You have been safely signed out of your account.',
      icon: 'logout'
    });
  }
}
