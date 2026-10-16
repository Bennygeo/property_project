import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import {
  AdminPropertyItem,
  AdminStats,
  AdminPersona,
  PostPropertyPayload,
  ReviewDecisionPayload
} from '../models/admin.model';
import { NotificationService } from './notification.service';
import { environment } from '../../../environments/environment';
import { PlotDetails } from '../models/property.model';
import { SubdividedPlot } from '../models/subdivided-plot.model';

export interface AdminFinancialSummary {
  totalRevenueRupees: number;
  razorpayRevenueRupees: number;
  otherRevenueRupees: number;
  razorpayPercentage: number;
  otherPercentage: number;
  totalPointsCredited: number;
  razorpayPoints: number;
  otherPoints: number;
  totalOrdersCount: number;
  razorpayOrdersCount: number;
  otherOrdersCount: number;
  averageOrderValue: number;
  uniqueInvestorsCount: number;
}

export interface AdminChannelItem {
  name: string;
  isRazorpay: boolean;
  count: number;
  amountRupees: number;
  points: number;
  percentage: number;
  badgeTheme: string;
}

export interface AdminFinancialTransaction {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  userPhone: string;
  userRole: string;
  transactionType: string;
  points: number;
  amountRupees: number;
  paymentMethod: string;
  isRazorpay: boolean;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  description: string;
  status: string;
  createdAt: string;
  formattedDate: string;
}

export interface AdminFinancialData {
  summary: AdminFinancialSummary;
  channels: AdminChannelItem[];
  transactions: AdminFinancialTransaction[];
  filterMeta?: {
    gateway: string;
    status: string;
    timeframe: string;
    totalRows: number;
  };
}

export const ADMIN_PERSONAS: AdminPersona[] = [
  {
    id: 101,
    name: 'Ezhil',
    role: 'admin',
    title: 'Photography & Marketing',
    avatarInitials: 'EZ',
    email: 'ezhil@mannidam.com',
    department: 'Media Production & Visual Marketing',
    responsibility: 'Photography and marketing'
  },
  {
    id: 102,
    name: 'Ram',
    role: 'co_admin',
    title: 'Marketing, Broker Relations & Site Promotion',
    avatarInitials: 'RA',
    email: 'ram@mannidam.com',
    department: 'Broker Network & Site Promotion',
    responsibility: 'Marketing and site promotion'
  },
  {
    id: 103,
    name: 'Benny',
    role: 'admin',
    title: 'Web Development & Online Customer Handling',
    avatarInitials: 'BE',
    email: 'benny@mannidam.com',
    department: 'Technology & Online Customer Operations',
    responsibility: 'Web development and online customer handling'
  }
];

const ADMIN_STORAGE_KEY = 'mannidam_admin_session';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly notificationService = inject(NotificationService);

  // Authenticated Admin User
  readonly currentAdmin = signal<AdminPersona | null>(this.getStoredAdminSession());
  readonly isAuthenticated = computed<boolean>(() => !!this.currentAdmin());

  // Active Admin Persona Switcher for Maker-Checker testing
  readonly activePersona = signal<AdminPersona>(this.currentAdmin() || ADMIN_PERSONAS[0]);

  // Data state
  readonly properties = signal<AdminPropertyItem[]>([]);
  readonly stats = signal<AdminStats>({
    total: 0,
    pendingUserReviews: 0,
    pendingPeerReviews: 0,
    published: 0,
    rejected: 0
  });

  readonly financialData = signal<AdminFinancialData | null>(null);
  readonly isFinancialLoading = signal<boolean>(false);

  readonly isLoading = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly currentFilter = signal<string>('all');
  readonly currentSearch = signal<string>('');

  constructor() {
    this.loadAdminData();
    this.loadFinancials();
  }

  private getStoredAdminSession(): AdminPersona | null {
    try {
      const stored = localStorage.getItem(ADMIN_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    return null;
  }

  // Admin Login via Backend API
  login(loginId: string, password: string): Observable<{ success: boolean; message?: string }> {
    this.isLoading.set(true);
    const body = { email: loginId, password };
    const tryLogin = (url: string) => this.http.post<{ success: boolean; data: { admin: any }; message: string }>(url, body);

    return tryLogin(`${environment.apiUrl}/admin/login.php`).pipe(
      catchError(() => tryLogin('/api/admin/login.php')),
      catchError(() => tryLogin('/demo1/backend/api/admin/login.php')),
      catchError(() => tryLogin('/demo1/api/admin/login.php')),
      catchError(() => tryLogin('http://localhost:8000/api/admin/login.php')),
      catchError(() => tryLogin('http://localhost/the-property-project/backend/api/admin/login.php')),
      map(res => {
        this.isLoading.set(false);
        if (res && res.success && res.data?.admin) {
          const admData: AdminPersona = {
            id: res.data.admin.id,
            name: res.data.admin.name,
            role: res.data.admin.role,
            title: res.data.admin.title,
            avatarInitials: res.data.admin.avatarInitials,
            email: res.data.admin.email
          };
          this.currentAdmin.set(admData);
          this.activePersona.set(admData);
          localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(admData));
          this.notificationService.show({
            type: 'success',
            title: 'Administrative Access Granted',
            message: res.message || `Welcome back, ${admData.name}.`,
            icon: 'verified_user'
          });
          this.loadAdminData();
          return { success: true };
        }
        return { success: false, message: 'Invalid credentials' };
      }),
      catchError(err => {
        this.isLoading.set(false);
        const msg = err?.error?.error || 'Invalid credentials or unauthorized access';
        this.notificationService.show({
          type: 'error',
          title: 'Access Denied',
          message: msg,
          icon: 'gavel'
        });
        return of({ success: false, message: msg });
      })
    );
  }

  // Admin Logout
  logout(): void {
    this.currentAdmin.set(null);
    this.activePersona.set(ADMIN_PERSONAS[0]);
    localStorage.removeItem(ADMIN_STORAGE_KEY);
    this.notificationService.show({
      type: 'info',
      title: 'Signed Out',
      message: 'Administrative session ended securely.',
      icon: 'logout'
    });
  }

  // Switch persona between Lead Admin and Co-Admin
  switchPersona(personaId: number): void {
    const found = ADMIN_PERSONAS.find(p => p.id === personaId) || ADMIN_PERSONAS[0];
    this.activePersona.set(found);
    this.notificationService.show({
      type: 'info',
      title: 'Admin Switched',
      message: `Active session is now: ${found.name} (${found.title})`,
      icon: 'admin_panel_settings'
    });
  }

  // Fetch properties and metrics from backend
  loadAdminData(status = this.currentFilter(), search = this.currentSearch()): void {
    this.isLoading.set(true);
    this.currentFilter.set(status);
    this.currentSearch.set(search);

    const params: Record<string, string> = {};
    if (status && status !== 'all') params['status'] = status;
    if (search) params['q'] = search;

    const tryGet = (url: string) => this.http.get<{ success: boolean; data: { stats: AdminStats; properties: AdminPropertyItem[] } }>(
      url,
      { params }
    );

    tryGet(`${environment.apiUrl}/admin/properties.php`).pipe(
      catchError(() => tryGet('/api/admin/properties.php')),
      catchError(() => tryGet('/demo1/backend/api/admin/properties.php')),
      catchError(() => tryGet('/demo1/api/admin/properties.php')),
      catchError(() => tryGet('http://localhost:8000/api/admin/properties.php')),
      catchError(() => tryGet('http://localhost/the-property-project/backend/api/admin/properties.php')),
      catchError(err => {
        console.error('Error fetching admin data:', err);
        return of(null);
      })
    ).subscribe(res => {
      this.isLoading.set(false);
      if (res && res.success && res.data) {
        this.stats.set(res.data.stats);
        this.properties.set(res.data.properties);
      }
    });
  }

  // Check if current active admin is allowed to approve a property under Maker-Checker rule
  canApprove(prop: AdminPropertyItem): { allowed: boolean; reason?: string } {
    const active = this.activePersona();

    // If already published
    if (prop.status === 'published') {
      return { allowed: false, reason: 'Already published' };
    }

    // Four-Eyes / Maker-Checker enforcement:
    // If submitted by an admin/co-admin, the author CANNOT approve their own submission
    const isSubmittedByAdmin = prop.submittedByRole === 'admin' || prop.submittedByRole === 'co_admin';
    const isSameAuthor = prop.submittedByUserId === active.id;

    if (isSubmittedByAdmin && isSameAuthor) {
      return {
        allowed: false,
        reason: `Maker-Checker Rule: You submitted this listing (${active.name}). A Co-Admin must independently review and approve this property before it can be published.`
      };
    }

    return { allowed: true };
  }

  // Post a new property (attributing to current active admin)
  postProperty(data: Omit<PostPropertyPayload, 'authorId' | 'authorName' | 'authorRole'>): Observable<boolean> {
    this.isSubmitting.set(true);
    const active = this.activePersona();

    const payload: PostPropertyPayload = {
      ...data,
      authorId: active.id,
      authorName: active.name,
      authorRole: active.role
    };

    const tryPost = (url: string) => this.http.post<{ success: boolean; data: any; message: string }>(
      url,
      payload
    );

    const isNetworkOrNotFound = (err: any) => err?.status === 0 || err?.status === 404;

    return tryPost(`${environment.apiUrl}/admin/properties.php`).pipe(
      catchError(err => isNetworkOrNotFound(err) ? tryPost('/api/admin/properties.php') : throwError(() => err)),
      catchError(err => isNetworkOrNotFound(err) ? tryPost('http://localhost:8000/api/admin/properties.php') : throwError(() => err)),
      map(res => {
        this.isSubmitting.set(false);
        if (res && res.success) {
          this.notificationService.show({
            type: 'success',
            title: 'Property Submitted',
            message: `Listing created by ${active.name}. Sent for Co-Admin peer approval.`,
            icon: 'verified_user'
          });
          this.loadAdminData();
          return true;
        }
        return false;
      }),
      catchError(err => {
        this.isSubmitting.set(false);
        const errMsg = err?.error?.error || err?.message || 'Failed to submit property';
        this.notificationService.show({
          type: 'error',
          title: 'Submission Failed',
          message: errMsg,
          icon: 'error'
        });
        return of(false);
      })
    );
  }

  // Save or update plot factsheet and subdivided partitioned plots
  savePlotDetails(propertyId: string, plotFactsheet: PlotDetails, subdividedPlots: SubdividedPlot[]): Observable<boolean> {
    this.isSubmitting.set(true);
    const payload = {
      action: 'save_plot_details',
      propertyId,
      plotFactsheet,
      subdividedPlots
    };

    const trySave = (url: string) => this.http.post<{ success: boolean; data: any; message: string }>(
      url,
      payload
    );

    const isNetworkOrNotFound = (err: any) => err?.status === 0 || err?.status === 404;

    return trySave(`${environment.apiUrl}/admin/properties.php`).pipe(
      catchError(err => isNetworkOrNotFound(err) ? trySave('/api/admin/properties.php') : throwError(() => err)),
      catchError(err => isNetworkOrNotFound(err) ? trySave('http://localhost:8000/api/admin/properties.php') : throwError(() => err)),
      map(res => {
        this.isSubmitting.set(false);
        if (res && res.success) {
          this.notificationService.show({
            type: 'success',
            title: 'Plot Masterplan Saved',
            message: `Cadastral factsheet & ${subdividedPlots.length} partitioned parcels synced to database.`,
            icon: 'check_circle'
          });
          return true;
        }
        return false;
      }),
      catchError(err => {
        this.isSubmitting.set(false);
        const errMsg = err?.error?.error || err?.message || 'Failed to save plot details';
        this.notificationService.show({
          type: 'error',
          title: 'Save Failed',
          message: errMsg,
          icon: 'error'
        });
        return of(false);
      })
    );
  }

  // Submit review decision (approve, reject, or revision request)
  submitReview(propertyId: string, action: 'approve' | 'reject' | 'request_revision', notes?: string): Observable<boolean> {
    this.isSubmitting.set(true);
    const active = this.activePersona();

    const payload: ReviewDecisionPayload = {
      propertyId,
      reviewerId: active.id,
      reviewerName: active.name,
      action,
      notes
    };

    const tryReview = (url: string) => this.http.post<{ success: boolean; data: any; message: string }>(
      url,
      payload
    );

    const isNetworkOrNotFound = (err: any) => err?.status === 0 || err?.status === 404;

    return tryReview(`${environment.apiUrl}/admin/review.php`).pipe(
      catchError(err => isNetworkOrNotFound(err) ? tryReview('/api/admin/review.php') : throwError(() => err)),
      catchError(err => isNetworkOrNotFound(err) ? tryReview('http://localhost:8000/api/admin/review.php') : throwError(() => err)),
      map(res => {
        this.isSubmitting.set(false);
        if (res && res.success) {
          const title = action === 'approve' ? 'Property Published!' : action === 'reject' ? 'Listing Rejected' : 'Revision Requested';
          this.notificationService.show({
            type: action === 'approve' ? 'success' : action === 'reject' ? 'error' : 'warning',
            title,
            message: res.message || `Decision recorded by ${active.name}`,
            icon: action === 'approve' ? 'check_circle' : 'gavel'
          });
          this.loadAdminData();
          return true;
        }
        return false;
      }),
      catchError(err => {
        this.isSubmitting.set(false);
        const errMsg = err?.error?.error || err?.message || 'Failed to record review decision';
        this.notificationService.show({
          type: 'error',
          title: 'Review Blocked',
          message: errMsg,
          icon: 'shield'
        });
        return of(false);
      })
    );
  }

  // Fetch full admin profile with personal and co-admin audit logs
  fetchAdminProfile(adminId: number, filterOtherAdminId?: number): Observable<any | null> {
    const params: Record<string, string> = { admin_id: String(adminId) };
    if (filterOtherAdminId) {
      params['other_admin_id'] = String(filterOtherAdminId);
    }

    const tryProfile = (url: string) => this.http.get<{ success: boolean; data: any }>(url, { params });

    return tryProfile(`${environment.apiUrl}/admin/profile.php`).pipe(
      catchError(() => tryProfile('/api/admin/profile.php')),
      catchError(() => tryProfile('/demo1/backend/api/admin/profile.php')),
      catchError(() => tryProfile('/demo1/api/admin/profile.php')),
      catchError(() => tryProfile('http://localhost:8000/api/admin/profile.php')),
      catchError(() => tryProfile('http://localhost/the-property-project/backend/api/admin/profile.php')),
      map(res => (res && res.success && res.data) ? res.data : null),
      catchError(err => {
        console.error('Error fetching admin profile:', err);
        return of(null);
      })
    );
  }

  // Load financial credit ledger and Razorpay vs others metrics
  loadFinancials(gateway = 'all', status = 'all', timeframe = 'all', search = ''): void {
    this.isFinancialLoading.set(true);
    const params: Record<string, string> = {};
    if (gateway && gateway !== 'all') params['gateway'] = gateway;
    if (status && status !== 'all') params['status'] = status;
    if (timeframe && timeframe !== 'all') params['timeframe'] = timeframe;
    if (search) params['q'] = search;

    const tryGet = (url: string) => this.http.get<{ success: boolean; data: AdminFinancialData }>(url, { params });

    tryGet(`${environment.apiUrl}/admin/financials.php`).pipe(
      catchError(() => tryGet('/api/admin/financials.php')),
      catchError(() => tryGet('/demo1/backend/api/admin/financials.php')),
      catchError(() => tryGet('/demo1/api/admin/financials.php')),
      catchError(() => tryGet('http://localhost:8000/api/admin/financials.php')),
      catchError(() => tryGet('http://localhost/the-property-project/backend/api/admin/financials.php')),
      catchError(err => {
        console.error('Error fetching admin financials:', err);
        return of(null);
      })
    ).subscribe(res => {
      this.isFinancialLoading.set(false);
      if (res && res.success && res.data) {
        this.financialData.set(res.data);
      }
    });
  }

  // Issue manual credit adjustment
  submitManualCredit(payload: {
    userId: number;
    points: number;
    amountRupees: number;
    paymentMethod: string;
    notes?: string;
  }): Observable<boolean> {
    this.isSubmitting.set(true);
    const active = this.activePersona();
    const body = {
      ...payload,
      adminId: active.id,
      adminName: active.name
    };

    const tryPost = (url: string) => this.http.post<{ success: boolean; message: string; data: any }>(url, body);

    return tryPost(`${environment.apiUrl}/admin/financials.php`).pipe(
      catchError(() => tryPost('/api/admin/financials.php')),
      catchError(() => tryPost('/demo1/backend/api/admin/financials.php')),
      catchError(() => tryPost('/demo1/api/admin/financials.php')),
      catchError(() => tryPost('http://localhost:8000/api/admin/financials.php')),
      catchError(() => tryPost('http://localhost/the-property-project/backend/api/admin/financials.php')),
      map(res => {
        this.isSubmitting.set(false);
        if (res && res.success) {
          this.notificationService.show({
            type: 'success',
            title: 'Credit Adjustment Approved',
            message: res.message || `Points credited successfully by ${active.name}`,
            icon: 'account_balance_wallet'
          });
          this.loadFinancials();
          return true;
        }
        return false;
      }),
      catchError(err => {
        this.isSubmitting.set(false);
        const msg = err?.error?.error || 'Failed to process credit adjustment';
        this.notificationService.show({
          type: 'error',
          title: 'Adjustment Failed',
          message: msg,
          icon: 'error'
        });
        return of(false);
      })
    );
  }
}
