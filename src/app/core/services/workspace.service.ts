import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';
import {
  UserWorkspaceData,
  AdminWorkspaceOverview,
  SiteVisitItem,
  AdvisoryConsultationItem,
  SavedSearchItem,
  PlotBookingItem
} from '../models/workspace.model';

@Injectable({
  providedIn: 'root'
})
export class WorkspaceService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);

  public readonly userWorkspace = signal<UserWorkspaceData | null>(null);
  public readonly adminOverview = signal<AdminWorkspaceOverview | null>(null);
  public readonly isLoading = signal<boolean>(false);

  private getEffectiveUserId(): number {
    const user = this.authService.currentUser();
    return (user && user.id > 0) ? user.id : 1;
  }

  /**
   * Load user workspace data (Membership, Visits, Consultations, Saved Searches, Bookings)
   */
  public fetchUserWorkspace(userId?: number): Observable<UserWorkspaceData | null> {
    const uid = userId || this.getEffectiveUserId();
    this.isLoading.set(true);

    const tryGet = (url: string) =>
      this.http.get<{ success: boolean; data: UserWorkspaceData }>(`${url}?userId=${uid}`);

    return tryGet(`${environment.apiUrl}/workspace/user-workspace.php`).pipe(
      catchError(() => tryGet('/p_demo_5/backend/api/workspace/user-workspace.php')),
      catchError(() => tryGet('/api/workspace/user-workspace.php')),
      catchError(() => tryGet(`${environment.apacheApiUrl}/workspace/user-workspace.php`)),
      map(res => (res && res.success && res.data) ? res.data : null),
      tap(data => {
        this.isLoading.set(false);
        if (data) {
          this.userWorkspace.set(data);
        }
      }),
      catchError(() => {
        this.isLoading.set(false);
        return of(null);
      })
    );
  }

  /**
   * Load admin workspace overview for all users
   */
  public fetchAdminWorkspaces(): Observable<AdminWorkspaceOverview | null> {
    this.isLoading.set(true);
    const tryGet = (url: string) =>
      this.http.get<{ success: boolean; data: AdminWorkspaceOverview }>(url);

    return tryGet(`${environment.apiUrl}/workspace/admin-manage.php`).pipe(
      catchError(() => tryGet('/p_demo_5/backend/api/workspace/admin-manage.php')),
      catchError(() => tryGet('/api/workspace/admin-manage.php')),
      catchError(() => tryGet(`${environment.apacheApiUrl}/workspace/admin-manage.php`)),
      map(res => (res && res.success && res.data) ? res.data : null),
      tap(data => {
        this.isLoading.set(false);
        if (data) {
          this.adminOverview.set(data);
        }
      }),
      catchError(() => {
        this.isLoading.set(false);
        return of(null);
      })
    );
  }

  /**
   * Admin updates a site visit assignment & status
   */
  public updateSiteVisit(payload: {
    visitId: number;
    status: string;
    executiveName?: string;
    executivePhone?: string;
    pickupLocation?: string;
    adminNotes?: string;
  }): Observable<boolean> {
    const tryPost = (url: string) =>
      this.http.post<{ success: boolean; message: string }>(url, {
        action: 'update_site_visit',
        ...payload
      });

    return tryPost(`${environment.apiUrl}/workspace/admin-manage.php`).pipe(
      catchError(() => tryPost('/p_demo_5/backend/api/workspace/admin-manage.php')),
      catchError(() => tryPost('/api/workspace/admin-manage.php')),
      map(res => !!(res && res.success)),
      tap(success => {
        if (success) {
          this.notificationService.show({
            type: 'success',
            title: 'Site Visit Updated',
            message: 'Executive assigned and status updated in buyer workspace.',
            icon: 'event_available'
          });
          this.fetchAdminWorkspaces().subscribe();
          this.fetchUserWorkspace().subscribe();
        }
      })
    );
  }

  /**
   * Admin adds consultation notes & recommendation dossier
   */
  public addConsultation(payload: {
    userId: number;
    advisorName: string;
    advisorRole: string;
    notes: string;
    recommendations?: any[];
    dossierPdf?: string;
  }): Observable<boolean> {
    const tryPost = (url: string) =>
      this.http.post<{ success: boolean; message: string }>(url, {
        action: 'add_consultation',
        ...payload
      });

    return tryPost(`${environment.apiUrl}/workspace/admin-manage.php`).pipe(
      catchError(() => tryPost('/p_demo_5/backend/api/workspace/admin-manage.php')),
      catchError(() => tryPost('/api/workspace/admin-manage.php')),
      map(res => !!(res && res.success)),
      tap(success => {
        if (success) {
          this.notificationService.show({
            type: 'success',
            title: 'Consultation Logged',
            message: 'Advisory summary and recommendations added to buyer dossier.',
            icon: 'support_agent'
          });
          this.fetchAdminWorkspaces().subscribe();
          this.fetchUserWorkspace().subscribe();
        }
      })
    );
  }

  /**
   * Admin updates plot booking workflow status
   */
  public updateBookingStatus(payload: {
    bookingId: number;
    status: string;
    legalOfficer?: string;
    notes?: string;
    targetRegistrationDate?: string;
  }): Observable<boolean> {
    const tryPost = (url: string) =>
      this.http.post<{ success: boolean; message: string }>(url, {
        action: 'update_booking_status',
        ...payload
      });

    return tryPost(`${environment.apiUrl}/workspace/admin-manage.php`).pipe(
      catchError(() => tryPost('/p_demo_5/backend/api/workspace/admin-manage.php')),
      catchError(() => tryPost('/api/workspace/admin-manage.php')),
      map(res => !!(res && res.success)),
      tap(success => {
        if (success) {
          this.notificationService.show({
            type: 'success',
            title: 'Booking Tracker Updated',
            message: `Plot registration status updated to: ${payload.status.replace(/_/g, ' ').toUpperCase()}`,
            icon: 'verified'
          });
          this.fetchAdminWorkspaces().subscribe();
          this.fetchUserWorkspace().subscribe();
        }
      })
    );
  }

  /**
   * Admin triggers simulated instant alert for saved search
   */
  public triggerSearchAlert(searchId: number): Observable<boolean> {
    const tryPost = (url: string) =>
      this.http.post<{ success: boolean; message: string }>(url, {
        action: 'trigger_search_alert',
        searchId
      });

    return tryPost(`${environment.apiUrl}/workspace/admin-manage.php`).pipe(
      catchError(() => tryPost('/p_demo_5/backend/api/workspace/admin-manage.php')),
      catchError(() => tryPost('/api/workspace/admin-manage.php')),
      map(res => !!(res && res.success)),
      tap(success => {
        if (success) {
          this.notificationService.show({
            type: 'info',
            title: 'Alert Dispatched',
            message: 'Simulated WhatsApp & Email alert sent with matching plot listings.',
            icon: 'notifications_active'
          });
          this.fetchAdminWorkspaces().subscribe();
          this.fetchUserWorkspace().subscribe();
        }
      })
    );
  }

  /**
   * Admin adjusts entitlement credits
   */
  public adjustEntitlements(payload: {
    userId: number;
    addViews: number;
    addComparisons: number;
    addAdvisory: number;
    addVisits: number;
  }): Observable<boolean> {
    const tryPost = (url: string) =>
      this.http.post<{ success: boolean; message: string }>(url, {
        action: 'adjust_entitlements',
        ...payload
      });

    return tryPost(`${environment.apiUrl}/workspace/admin-manage.php`).pipe(
      catchError(() => tryPost('/p_demo_5/backend/api/workspace/admin-manage.php')),
      catchError(() => tryPost('/api/workspace/admin-manage.php')),
      map(res => !!(res && res.success)),
      tap(success => {
        if (success) {
          this.notificationService.show({
            type: 'success',
            title: 'Credits Adjusted',
            message: 'Buyer entitlement credits adjusted successfully.',
            icon: 'add_circle'
          });
          this.fetchAdminWorkspaces().subscribe();
          this.fetchUserWorkspace().subscribe();
        }
      })
    );
  }
}

