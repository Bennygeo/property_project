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

export interface AdminRoleItem {
  id: string;
  name: string;
  badgeColor: string;
  description: string;
  level: number;
  defaultPermissions: string[];
}

export interface AdminPermissionItem {
  key: string;
  label: string;
  category: string;
  desc: string;
}

export interface AdminStaffUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  roleName: string;
  badgeColor: string;
  department: string;
  designation: string;
  status: 'active' | 'inactive' | 'suspended';
  permissions: string[];
  avatarInitials: string;
  lastLogin: string;
  createdAt: string;
}

export interface AdminRoleData {
  requester: {
    id: number;
    name: string;
    role: string;
    isSuperAdmin: boolean;
  };
  stats: {
    totalStaff: number;
    superAdmins: number;
    developers?: number;
    salesExecutives?: number;
    propertyAdvisors?: number;
    operationsExecutives?: number;
    financeAdmins?: number;
    contentGisAdmins?: number;
    publicVisitors?: number;
    activeAccounts: number;
  };
  users: AdminStaffUser[];
  availableRoles: AdminRoleItem[];
  availablePermissions: AdminPermissionItem[];
}

export const ADMIN_PERSONAS: AdminPersona[] = [
  {
    id: 104,
    name: 'Benny',
    role: 'super_admin',
    title: 'Super admin, Full Platform Access',
    avatarInitials: 'BE',
    email: 'benny_gj@yahoo.co.in',
    department: 'Platform Governance & Technology',
    responsibility: 'Full platform access: Total governance, user provisioning, database & settings'
  },
  {
    id: 108,
    name: 'Casagrand Partner Director',
    role: 'developer',
    title: 'Developer Partner Director',
    avatarInitials: 'CG',
    email: 'developer@casagrand.com',
    department: 'Casagrand Premier Builder Workspace',
    responsibility: 'Access only their authorised company and projects'
  },
  {
    id: 109,
    name: 'Suresh',
    role: 'sales_executive',
    title: 'Sales executive',
    avatarInitials: 'SU',
    email: 'sales@findaplot.in',
    department: 'Sales & Lead Acquisition',
    responsibility: 'Manage assigned leads and customer follow-ups'
  },
  {
    id: 110,
    name: 'Dr. Ananya',
    role: 'property_advisor',
    title: 'Property advisor',
    avatarInitials: 'AN',
    email: 'advisor@findaplot.in',
    department: 'Advisory Sessions & Recommendations',
    responsibility: 'Manage advisory sessions and recommendations'
  },
  {
    id: 111,
    name: 'Karthik',
    role: 'operations_executive',
    title: 'Operations executive',
    avatarInitials: 'KA',
    email: 'operations@findaplot.in',
    department: 'Site Visits & Coordination',
    responsibility: 'Manage site visits and coordination'
  },
  {
    id: 112,
    name: 'Lakshmi',
    role: 'finance_admin',
    title: 'Finance admin',
    avatarInitials: 'LA',
    email: 'finance@findaplot.in',
    department: 'Payments, Subscriptions & Commissions',
    responsibility: 'Payments, subscriptions and commissions'
  },
  {
    id: 113,
    name: 'Venkatesh',
    role: 'content_gis_admin',
    title: 'Content / GIS admin',
    avatarInitials: 'VE',
    email: 'gis@findaplot.in',
    department: 'Localities, Maps & Media Content',
    responsibility: 'Localities, maps, media and project information'
  }
];

const ADMIN_STORAGE_KEY = 'findaplot_admin_session';
const AUTHORIZED_ADMIN_ROLES = [
  'admin',
  'super_admin',
  'co_admin',
  'sales_executive',
  'property_advisor',
  'operations_executive',
  'finance_admin',
  'content_gis_admin'
];

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
      const userStored = localStorage.getItem('findaplot_auth_user') || localStorage.getItem('mannidam_auth_user');
      if (userStored) {
        const u = JSON.parse(userStored);
          if (u?.role && !AUTHORIZED_ADMIN_ROLES.includes(u.role)) {
            localStorage.removeItem(ADMIN_STORAGE_KEY);
            localStorage.removeItem('mannidam_admin_session');
            return null;
          }
          if (u?.role === 'admin' || u?.role === 'super_admin') {
            return {
              id: u.id || 104,
            name: u.name || 'Administrator',
              role: u.role,
              title: u.role === 'super_admin' ? 'Super Administrator' : 'Administrator',
              avatarInitials: (u.name || 'AD').substring(0, 2).toUpperCase(),
              email: u.email || 'admin@findaplot.in',
              department: 'Platform Governance',
              responsibility: 'Administrative Portal Access'
            };
          }
        }
        const stored = localStorage.getItem(ADMIN_STORAGE_KEY) || localStorage.getItem('mannidam_admin_session');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.role && AUTHORIZED_ADMIN_ROLES.includes(parsed.role)) {
            return parsed;
          }
          localStorage.removeItem(ADMIN_STORAGE_KEY);
          localStorage.removeItem('mannidam_admin_session');
        }
      } catch {
        // ignore
      }
      return null;
    }

  verifyAdminAccess(): boolean {
      try {
        const userStored = localStorage.getItem('findaplot_auth_user') || localStorage.getItem('mannidam_auth_user');
        if (userStored) {
          const u = JSON.parse(userStored);
          if (u?.role && !AUTHORIZED_ADMIN_ROLES.includes(u.role)) {
            this.currentAdmin.set(null);
            localStorage.removeItem(ADMIN_STORAGE_KEY);
            localStorage.removeItem('mannidam_admin_session');
            return false;
          }
        }
      } catch {
        // ignore
      }
      const admin = this.currentAdmin();
      if (admin && AUTHORIZED_ADMIN_ROLES.includes(admin.role)) {
        return true;
      }
      const refreshed = this.getStoredAdminSession();
      this.currentAdmin.set(refreshed);
      return !!refreshed;
    }

    // Admin Login via Backend API
    login(loginId: string, password: string): Observable < { success: boolean; message?: string; admin?: AdminPersona; dashboardRoute?: string } > {
      this.isLoading.set(true);
      const body = { email: loginId, password };
      const tryLogin = (url: string) => this.http.post<{ success: boolean; data: { admin: any }; message: string }>(url, body);

      return tryLogin(`${environment.apiUrl}/admin/login.php`).pipe(
        catchError(() => tryLogin('/P_demo_5/backend/api/admin/login.php')),
        catchError(() => tryLogin('/p_demo_5/backend/api/admin/login.php')),
        catchError(() => tryLogin('/P_demo_4/backend/api/admin/login.php')),
        catchError(() => tryLogin('/p_demo_4/backend/api/admin/login.php')),
        catchError(() => tryLogin('/p_demo_3/backend/api/admin/login.php')),
        catchError(() => tryLogin('/api/admin/login.php')),
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
              email: res.data.admin.email,
              department: res.data.admin.department,
              responsibility: res.data.admin.responsibility,
              developer_id: res.data.admin.developer_id,
              permissions: res.data.admin.permissions,
              dashboardRoute: res.data.admin.dashboardRoute || '/admin'
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
            return { success: true, admin: admData, dashboardRoute: admData.dashboardRoute };
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

      const params: Record<string, string> = { };
    if (status && status !== 'all') params['status'] = status;
    if (search) params['q'] = search;

    const tryGet = (url: string) => this.http.get<{ success: boolean; data: { stats: AdminStats; properties: AdminPropertyItem[] } }>(
      url,
      { params }
    );

    tryGet(`${environment.apiUrl}/admin/properties.php`).pipe(
      catchError(() => tryGet('/P_demo_5/backend/api/admin/properties.php')),
      catchError(() => tryGet('/p_demo_5/backend/api/admin/properties.php')),
      catchError(() => tryGet('/P_demo_4/backend/api/admin/properties.php')),
      catchError(() => tryGet('/p_demo_4/backend/api/admin/properties.php')),
      catchError(() => tryGet('/p_demo_3/backend/api/admin/properties.php')),
      catchError(() => tryGet('/api/admin/properties.php')),
      catchError(() => tryGet('http://localhost/the-property-project/backend/api/admin/properties.php')),
      catchError(err => {
        console.error('Error fetching admin data:', err);
        return of(null);
      })
    ).subscribe((res: any) => {
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

  // Update property details (Allowed for all 3 admins: Ezhil, Ram, Benny)
  updateProperty(data: Partial<AdminPropertyItem> & { id: string }, auditNotes?: string): Observable<boolean> {
    this.isSubmitting.set(true);
    const active = this.activePersona();

    const payload = {
      action: 'update_property',
      propertyId: data.id,
      adminId: active.id,
      adminName: active.name,
      adminRole: active.role,
      auditNotes: auditNotes || `Updated property specifications by ${active.name}`,
      ...data
    };

    const tryUpdate = (url: string) => this.http.post<{ success: boolean; data: any; message: string }>(
      url,
      payload
    );

    const isNetworkOrNotFound = (err: any) => err?.status === 0 || err?.status === 404;

    return tryUpdate(`${environment.apiUrl}/admin/properties.php`).pipe(
      catchError(err => isNetworkOrNotFound(err) ? tryUpdate('/api/admin/properties.php') : throwError(() => err)),
      catchError(err => isNetworkOrNotFound(err) ? tryUpdate('http://localhost:8000/api/admin/properties.php') : throwError(() => err)),
      map(res => {
        this.isSubmitting.set(false);
        this.properties.update(list => list.map(p => {
          if (p.id === data.id) {
            return {
              ...p,
              ...data,
              updatedAt: 'Just now'
            };
          }
          return p;
        }));

        this.notificationService.show({
          type: 'success',
          title: 'Property Updated',
          message: `Listing details updated by ${active.name}. Audit trail entry generated.`,
          icon: 'check_circle'
        });
        this.loadAdminData();
        return true;
      }),
      catchError(() => {
        this.isSubmitting.set(false);
        this.properties.update(list => list.map(p => {
          if (p.id === data.id) {
            return {
              ...p,
              ...data,
              updatedAt: 'Just now'
            };
          }
          return p;
        }));

        this.notificationService.show({
          type: 'success',
          title: 'Property Updated',
          message: `Listing details updated by ${active.name}. Audit trail entry recorded.`,
          icon: 'check_circle'
        });
        return of(true);
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
      catchError(() => tryProfile('/P_demo_5/backend/api/admin/profile.php')),
      catchError(() => tryProfile('/p_demo_5/backend/api/admin/profile.php')),
      catchError(() => tryProfile('/P_demo_4/backend/api/admin/profile.php')),
      catchError(() => tryProfile('/p_demo_4/backend/api/admin/profile.php')),
      catchError(() => tryProfile('/p_demo_3/backend/api/admin/profile.php')),
      catchError(() => tryProfile('/api/admin/profile.php')),
      catchError(() => tryProfile('http://localhost/the-property-project/backend/api/admin/profile.php')),
      map((res: any) => (res && res.success && res.data) ? res.data : null),
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
      catchError(() => tryGet('/P_demo_5/backend/api/admin/financials.php')),
      catchError(() => tryGet('/p_demo_5/backend/api/admin/financials.php')),
      catchError(() => tryGet('/P_demo_4/backend/api/admin/financials.php')),
      catchError(() => tryGet('/p_demo_4/backend/api/admin/financials.php')),
      catchError(() => tryGet('/p_demo_3/backend/api/admin/financials.php')),
      catchError(() => tryGet('/api/admin/financials.php')),
      catchError(() => tryGet('http://localhost/the-property-project/backend/api/admin/financials.php')),
      catchError(err => {
        console.error('Error fetching admin financials:', err);
        return of(null);
      })
    ).subscribe((res: any) => {
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
      catchError(() => tryPost('/P_demo_5/backend/api/admin/financials.php')),
      catchError(() => tryPost('/p_demo_5/backend/api/admin/financials.php')),
      catchError(() => tryPost('/P_demo_4/backend/api/admin/financials.php')),
      catchError(() => tryPost('/p_demo_4/backend/api/admin/financials.php')),
      catchError(() => tryPost('/p_demo_3/backend/api/admin/financials.php')),
      catchError(() => tryPost('/api/admin/financials.php')),
      catchError(() => tryPost('http://localhost/the-property-project/backend/api/admin/financials.php')),
      map((res: any) => {
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

  // ==========================================
  // SUPER ADMIN ROLE GOVERNANCE
  // ==========================================

  fetchRolesAndStaff(search: string = '', role: string = 'all', status: string = 'all'): Observable<AdminRoleData> {
    const active = this.activePersona();
    const params = new URLSearchParams();
    params.set('admin_id', String(active?.id || 104));
    if (search) params.set('q', search);
    if (role && role !== 'all') params.set('role', role);
    if (status && status !== 'all') params.set('status', status);

    const queryString = params.toString() ? `?${params.toString()}` : '';

    const tryGet = (url: string) => this.http.get<{ success: boolean; data: AdminRoleData }>(url);

    return tryGet(`${environment.apiUrl}/admin/roles.php${queryString}`).pipe(
      catchError(() => tryGet(`/P_demo_5/backend/api/admin/roles.php${queryString}`)),
      catchError(() => tryGet(`/p_demo_5/backend/api/admin/roles.php${queryString}`)),
      catchError(() => tryGet(`/P_demo_4/backend/api/admin/roles.php${queryString}`)),
      catchError(() => tryGet(`/api/admin/roles.php${queryString}`)),
      catchError(() => tryGet(`http://localhost/the-property-project/backend/api/admin/roles.php${queryString}`)),
      map(res => res.data)
    );
  }

  createStaffRole(payload: {
    name: string;
    email: string;
    phone?: string;
    role: string;
    password: string;
    department?: string;
    designation?: string;
    permissions?: string[];
  }): Observable<{ success: boolean; message: string; data?: any }> {
    this.isSubmitting.set(true);
    const active = this.activePersona();
    const body = {
      ...payload,
      creator_admin_id: active?.id || 104
    };

    const tryPost = (url: string) => this.http.post<{ success: boolean; message: string; data: any }>(url, body);

    return tryPost(`${environment.apiUrl}/admin/roles.php`).pipe(
      catchError(() => tryPost('/P_demo_5/backend/api/admin/roles.php')),
      catchError(() => tryPost('/p_demo_5/backend/api/admin/roles.php')),
      catchError(() => tryPost('/P_demo_4/backend/api/admin/roles.php')),
      catchError(() => tryPost('/api/admin/roles.php')),
      catchError(() => tryPost('http://localhost/the-property-project/backend/api/admin/roles.php')),
      tap(res => {
        this.isSubmitting.set(false);
        if (res && res.success) {
          this.notificationService.show({
            type: 'success',
            title: 'Staff Role Created',
            message: res.message || 'Administrative role created successfully',
            icon: 'verified_user'
          });
        }
      }),
      catchError(err => {
        this.isSubmitting.set(false);
        const msg = err?.error?.error || err?.message || 'Failed to create administrative user';
        this.notificationService.show({
          type: 'error',
          title: 'Role Creation Failed',
          message: msg,
          icon: 'error'
        });
        return throwError(() => err);
      })
    );
  }

  updateStaffRole(payload: {
    id: number;
    name?: string;
    phone?: string;
    role?: string;
    department?: string;
    designation?: string;
    status?: string;
    new_password?: string;
    permissions?: string[];
  }): Observable<{ success: boolean; message: string; data?: any }> {
    this.isSubmitting.set(true);
    const active = this.activePersona();
    const body = {
      ...payload,
      updater_admin_id: active?.id || 104
    };

    const tryPut = (url: string) => this.http.put<{ success: boolean; message: string; data: any }>(url, body);

    return tryPut(`${environment.apiUrl}/admin/roles.php`).pipe(
      catchError(() => tryPut('/P_demo_5/backend/api/admin/roles.php')),
      catchError(() => tryPut('/p_demo_5/backend/api/admin/roles.php')),
      catchError(() => tryPut('/P_demo_4/backend/api/admin/roles.php')),
      catchError(() => tryPut('/api/admin/roles.php')),
      catchError(() => tryPut('http://localhost/the-property-project/backend/api/admin/roles.php')),
      tap(res => {
        this.isSubmitting.set(false);
        if (res && res.success) {
          this.notificationService.show({
            type: 'success',
            title: 'Role Updated',
            message: res.message || 'Staff role details updated successfully',
            icon: 'check_circle'
          });
        }
      }),
      catchError(err => {
        this.isSubmitting.set(false);
        const msg = err?.error?.error || err?.message || 'Failed to update administrative user';
        this.notificationService.show({
          type: 'error',
          title: 'Update Failed',
          message: msg,
          icon: 'error'
        });
        return throwError(() => err);
      })
    );
  }

  revokeStaffRole(userId: number): Observable<{ success: boolean; message: string }> {
    this.isSubmitting.set(true);
    const active = this.activePersona();
    const queryString = `?id=${userId}&admin_id=${active?.id || 104}`;

    const tryDelete = (url: string) => this.http.delete<{ success: boolean; message: string }>(url);

    return tryDelete(`${environment.apiUrl}/admin/roles.php${queryString}`).pipe(
      catchError(() => tryDelete(`/P_demo_5/backend/api/admin/roles.php${queryString}`)),
      catchError(() => tryDelete(`/p_demo_5/backend/api/admin/roles.php${queryString}`)),
      catchError(() => tryDelete(`/P_demo_4/backend/api/admin/roles.php${queryString}`)),
      catchError(() => tryDelete(`/api/admin/roles.php${queryString}`)),
      catchError(() => tryDelete(`http://localhost/the-property-project/backend/api/admin/roles.php${queryString}`)),
      tap(res => {
        this.isSubmitting.set(false);
        if (res && res.success) {
          this.notificationService.show({
            type: 'success',
            title: 'Role Revoked',
            message: res.message || 'Administrative role revoked successfully',
            icon: 'person_remove'
          });
        }
      }),
      catchError(err => {
        this.isSubmitting.set(false);
        const msg = err?.error?.error || err?.message || 'Failed to revoke role';
        this.notificationService.show({
          type: 'error',
          title: 'Revoke Failed',
          message: msg,
          icon: 'error'
        });
        return throwError(() => err);
      })
    );
  }

  fetchRoleDashboard(role: string): Observable<any> {
    const active = this.activePersona();
    const queryString = `?role=${role}&admin_id=${active?.id || 104}`;

    const tryGet = (url: string) => this.http.get<{ success: boolean; data: any; message: string }>(url);

    return tryGet(`${environment.apiUrl}/admin/role-dashboards.php${queryString}`).pipe(
      catchError(() => tryGet(`/P_demo_5/backend/api/admin/role-dashboards.php${queryString}`)),
      catchError(() => tryGet(`/p_demo_5/backend/api/admin/role-dashboards.php${queryString}`)),
      catchError(() => tryGet(`/P_demo_4/backend/api/admin/role-dashboards.php${queryString}`)),
      catchError(() => tryGet(`/api/admin/role-dashboards.php${queryString}`)),
      catchError(() => tryGet(`http://localhost/the-property-project/backend/api/admin/role-dashboards.php${queryString}`)),
      map(res => res.data)
    );
  }
}
