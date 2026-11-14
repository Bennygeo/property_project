import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';
import { environment } from '../../../environments/environment';
import {
  SubscriptionPlan,
  UserSubscription,
  UserEntitlements,
  SubscriptionInvoice,
  EntitlementConsumptionResult
} from '../models/subscription.model';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

const STORAGE_ACTIVE_PLAN_KEY = 'fap_user_active_plan';
const STORAGE_ENTITLEMENTS_KEY = 'fap_user_entitlements';

export const DEFAULT_SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'explorer',
    name: 'Explorer',
    badgeText: 'Free Forever',
    priceInr: 0,
    durationDays: 365,
    projectViewLimit: 2,
    comparisonLimit: 1,
    advisorySessionLimit: 1,
    siteVisitLimit: 0,
    hasLocationReport: false,
    hasDedicatedAdvisor: false,
    hasPriorityAdvisor: false,
    description: 'Ideal for initial discovery of plotted developments, layouts and emerging locations across Tamil Nadu.',
    features: [
      '2 Detailed Project Views',
      '1 Side-by-Side Comparison',
      '1 Intro Advisory Session',
      'Direct SRO Regulatory Checklist',
      'Community Support'
    ],
    sortOrder: 1
  },
  {
    id: 'smart_buyer',
    name: 'Smart Buyer',
    badgeText: 'Most Popular',
    priceInr: 750,
    durationDays: 30,
    projectViewLimit: 5,
    comparisonLimit: 3,
    advisorySessionLimit: 2,
    siteVisitLimit: 0,
    hasLocationReport: true,
    hasDedicatedAdvisor: false,
    hasPriorityAdvisor: false,
    description: 'For active buyers shortlisting plots in high-growth corridors with location intelligence.',
    features: [
      '5 Detailed Project Views',
      '3 Side-by-Side Comparisons',
      '2 Advisory Sessions',
      'Location & Corridor Growth Report',
      'RERA Document Verification Extract',
      'WhatsApp Concierge Desk'
    ],
    sortOrder: 2
  },
  {
    id: 'priority_buyer',
    name: 'Priority Buyer',
    badgeText: 'Best Value',
    priceInr: 7500,
    durationDays: 60,
    projectViewLimit: 25,
    comparisonLimit: 10,
    advisorySessionLimit: 4,
    siteVisitLimit: 1,
    hasLocationReport: true,
    hasDedicatedAdvisor: true,
    hasPriorityAdvisor: false,
    description: 'Comprehensive advisory with dedicated expert and field visit coordination.',
    features: [
      '25 Detailed Project Views',
      '10 Side-by-Side Comparisons',
      '4 Comprehensive Advisory Sessions',
      '1 Chauffeured Physical Site Visit',
      'Dedicated Property Advisor',
      'Patta & Cadastral Verification Dossier',
      'Land Appreciation Intelligence'
    ],
    sortOrder: 3
  },
  {
    id: 'vip_concierge',
    name: 'VIP Concierge',
    badgeText: 'Executive',
    priceInr: 20000,
    durationDays: 90,
    projectViewLimit: 50,
    comparisonLimit: 20,
    advisorySessionLimit: 8,
    siteVisitLimit: 3,
    hasLocationReport: true,
    hasDedicatedAdvisor: true,
    hasPriorityAdvisor: true,
    description: 'White-glove advisory, multiple site visits and legal title clearance for high-net-worth investors.',
    features: [
      '50 Detailed Project Views',
      '20 Side-by-Side Comparisons',
      '8 In-Depth Advisory Sessions',
      '3 Chauffeured Physical Site Visits',
      'Priority Advisory Partner (Direct Line)',
      'Full Legal & SRO Title Check Assistance',
      'Custom Layout & Subdivision Analysis',
      'Negotiation & Booking Escort'
    ],
    sortOrder: 4
  }
];

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  public readonly plans = signal<SubscriptionPlan[]>(DEFAULT_SUBSCRIPTION_PLANS);
  public readonly currentSubscription = signal<UserSubscription | null>(this.loadStoredSubscription());
  public readonly entitlements = signal<UserEntitlements | null>(this.loadStoredEntitlements());
  public readonly unlockedProjectIds = signal<Set<string>>(new Set<string>());
  public readonly invoices = signal<SubscriptionInvoice[]>([]);
  public readonly daysRemaining = signal<number>(0);
  public readonly isLoading = signal<boolean>(false);
  public readonly isProcessingPayment = signal<boolean>(false);

  public readonly activePlanId = computed<string>(() => {
    if (!this.authService.isLoggedIn()) return 'explorer';
    return this.entitlements()?.planId || this.currentSubscription()?.planId || 'explorer';
  });

  public readonly activePlanName = computed<string>(() => {
    const plan = this.plans().find(p => p.id === this.activePlanId());
    return plan ? plan.name : (this.activePlanId() === 'explorer' ? 'Explorer' : 'Member');
  });

  public readonly isPaidSubscriber = computed<boolean>(() => {
    if (!this.authService.isLoggedIn()) return false;
    const pid = this.activePlanId();
    return pid !== 'explorer' && (this.daysRemaining() > 0 || !this.currentSubscription()?.expiresAt);
  });

  constructor() {
    this.fetchPlans().subscribe();
    if (this.authService.isLoggedIn()) {
      this.fetchCurrentSubscription().subscribe();
    } else {
      this.resetToFreeExplorer();
    }

    // Automatically sync when user logs in or logs out
    effect(() => {
      const user = this.authService.currentUser();
      if (user && user.id > 0) {
        this.fetchCurrentSubscription(user.id).subscribe();
      } else {
        this.resetToFreeExplorer();
      }
    });
  }

  public getDefaultExplorerEntitlements(): UserEntitlements {
    return {
      planId: 'explorer',
      planName: 'Explorer',
      projectViewsUsed: 0,
      projectViewLimit: 2,
      projectViewsRemaining: 2,
      comparisonsUsed: 0,
      comparisonLimit: 1,
      comparisonsRemaining: 1,
      advisorySessionsUsed: 0,
      advisorySessionLimit: 1,
      advisorySessionsRemaining: 1,
      siteVisitsUsed: 0,
      siteVisitLimit: 0,
      siteVisitsRemaining: 0,
      hasLocationReport: false,
      hasDedicatedAdvisor: false,
      hasPriorityAdvisor: false,
      expiresAt: null
    };
  }

  public resetToFreeExplorer(): void {
    this.currentSubscription.set(null);
    this.entitlements.set(this.getDefaultExplorerEntitlements());
    this.unlockedProjectIds.set(new Set<string>());
    this.daysRemaining.set(0);
    this.invoices.set([]);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.removeItem(STORAGE_ACTIVE_PLAN_KEY);
        localStorage.removeItem(STORAGE_ENTITLEMENTS_KEY);
      } catch { }
    }
  }

  private loadStoredSubscription(): UserSubscription | null {
    if (!this.authService.isLoggedIn()) return null;
    if (typeof window === 'undefined' || !window.localStorage) return null;
    try {
      const raw = localStorage.getItem(STORAGE_ACTIVE_PLAN_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private loadStoredEntitlements(): UserEntitlements | null {
    const defaultExplorer: UserEntitlements = this.getDefaultExplorerEntitlements();
    if (!this.authService.isLoggedIn()) return defaultExplorer;
    if (typeof window === 'undefined' || !window.localStorage) return defaultExplorer;
    try {
      const raw = localStorage.getItem(STORAGE_ENTITLEMENTS_KEY);
      return raw ? JSON.parse(raw) : defaultExplorer;
    } catch {
      return defaultExplorer;
    }
  }

  private saveStoredSubscription(sub: UserSubscription | null): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      if (sub) {
        localStorage.setItem(STORAGE_ACTIVE_PLAN_KEY, JSON.stringify(sub));
      } else {
        localStorage.removeItem(STORAGE_ACTIVE_PLAN_KEY);
      }
    } catch { }
  }

  private saveStoredEntitlements(ent: UserEntitlements | null): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      if (ent) {
        localStorage.setItem(STORAGE_ENTITLEMENTS_KEY, JSON.stringify(ent));
      } else {
        localStorage.removeItem(STORAGE_ENTITLEMENTS_KEY);
      }
    } catch { }
  }

  private getEffectiveUserId(): number {
    const user = this.authService.currentUser();
    return (user && user.id > 0) ? user.id : 0;
  }

  /**
   * Fetch 4-tier plans from backend
   */
  public fetchPlans(): Observable<SubscriptionPlan[]> {
    const tryGet = (baseUrl: string) =>
      this.http.get<{ success: boolean; data: { plans: SubscriptionPlan[] } }>(baseUrl);

    return tryGet(`${environment.apiUrl}/subscriptions/plans.php`).pipe(
      catchError(() => tryGet('/p_demo_5/backend/api/subscriptions/plans.php')),
      catchError(() => tryGet('/api/subscriptions/plans.php')),
      catchError(() => tryGet(`${environment.apacheApiUrl}/subscriptions/plans.php`)),
      map(res => (res && res.success && res.data?.plans) ? res.data.plans : []),
      tap(planList => {
        if (planList && planList.length > 0) {
          this.plans.set(planList);
        }
      }),
      catchError(err => {
        console.warn('[SubscriptionService] Could not load plans from backend:', err);
        return of([]);
      })
    );
  }

  /**
   * Super Admin: Fetch all plans (active & inactive) with subscription stats
   */
  public fetchAdminPlans(): Observable<SubscriptionPlan[]> {
    const tryGet = (url: string) => this.http.get<{ success: boolean; data: { plans: SubscriptionPlan[] } }>(url);
    return tryGet(`${environment.apiUrl}/admin/subscription-plans.php`).pipe(
      catchError(() => tryGet('/p_demo_5/backend/api/admin/subscription-plans.php')),
      catchError(() => tryGet('/api/admin/subscription-plans.php')),
      catchError(() => tryGet(`${environment.apacheApiUrl}/admin/subscription-plans.php`)),
      map(res => (res && res.success && res.data?.plans) ? res.data.plans : []),
      catchError(err => {
        console.warn('[SubscriptionService] Could not load admin plans:', err);
        return of([]);
      })
    );
  }

  /**
   * Super Admin: Save / Update plan parameters, pricing, and entitlement limits
   */
  public saveAdminPlan(plan: Partial<SubscriptionPlan>): Observable<{ success: boolean; message?: string; data?: any }> {
    const tryPost = (url: string) => this.http.post<{ success: boolean; message?: string; data?: any }>(url, plan);
    return tryPost(`${environment.apiUrl}/admin/subscription-plans.php`).pipe(
      catchError(() => tryPost('/p_demo_5/backend/api/admin/subscription-plans.php')),
      catchError(() => tryPost('/api/admin/subscription-plans.php')),
      catchError(() => tryPost(`${environment.apacheApiUrl}/admin/subscription-plans.php`)),
      tap(res => {
        if (res && res.success) {
          this.fetchPlans().subscribe();
        }
      })
    );
  }

  /**
   * Super Admin: Toggle plan active status
   */
  public toggleAdminPlan(planId: string): Observable<{ success: boolean; message?: string }> {
    const tryDelete = (url: string) => this.http.delete<{ success: boolean; message?: string }>(`${url}?id=${encodeURIComponent(planId)}`);
    return tryDelete(`${environment.apiUrl}/admin/subscription-plans.php`).pipe(
      catchError(() => tryDelete('/p_demo_5/backend/api/admin/subscription-plans.php')),
      catchError(() => tryDelete('/api/admin/subscription-plans.php')),
      catchError(() => tryDelete(`${environment.apacheApiUrl}/admin/subscription-plans.php`)),
      tap(res => {
        if (res && res.success) {
          this.fetchPlans().subscribe();
        }
      })
    );
  }

  /**
   * Fetch current subscription and real-time entitlements
   */
  public fetchCurrentSubscription(userId?: number): Observable<any> {
    if (!this.authService.isLoggedIn()) {
      this.resetToFreeExplorer();
      return of({
        hasActiveSubscription: false,
        subscription: null,
        daysRemaining: 0,
        entitlements: this.getDefaultExplorerEntitlements(),
        unlockedProjectIds: [],
        invoices: []
      });
    }

    const uid = userId || this.getEffectiveUserId();
    if (uid <= 0) {
      this.resetToFreeExplorer();
      return of({
        hasActiveSubscription: false,
        subscription: null,
        daysRemaining: 0,
        entitlements: this.getDefaultExplorerEntitlements(),
        unlockedProjectIds: [],
        invoices: []
      });
    }

    const tryGet = (baseUrl: string) =>
      this.http.get<{
        success: boolean;
        data: {
          hasActiveSubscription: boolean;
          subscription: UserSubscription | null;
          daysRemaining: number;
          entitlements: UserEntitlements;
          unlockedProjectIds: string[];
          invoices: SubscriptionInvoice[];
        }
      }>(`${baseUrl}?userId=${uid}`);

    return tryGet(`${environment.apiUrl}/subscriptions/current.php`).pipe(
      catchError(() => tryGet('/p_demo_5/backend/api/subscriptions/current.php')),
      catchError(() => tryGet('/api/subscriptions/current.php')),
      catchError(() => tryGet(`${environment.apacheApiUrl}/subscriptions/current.php`)),
      map(res => (res && res.success) ? res.data : null),
      tap(data => {
        if (data) {
          this.currentSubscription.set(data.subscription);
          this.saveStoredSubscription(data.subscription);

          this.entitlements.set(data.entitlements);
          this.saveStoredEntitlements(data.entitlements);

          this.daysRemaining.set(data.daysRemaining);
          this.invoices.set(data.invoices || []);

          if (Array.isArray(data.unlockedProjectIds)) {
            this.unlockedProjectIds.set(new Set(data.unlockedProjectIds.map(id => id.trim().toUpperCase())));
          }
        }
      }),
      catchError(err => {
        console.warn('[SubscriptionService] Failed to fetch current subscription:', err);
        return of(null);
      })
    );
  }

  /**
   * Consume entitlement (e.g. project view, comparison, advisory session, site visit)
   */
  public consumeEntitlement(
    action: 'project_view' | 'comparison' | 'advisory_session' | 'site_visit',
    propertyId?: string
  ): Observable<EntitlementConsumptionResult> {
    const uid = this.getEffectiveUserId();
    const payload = {
      userId: uid,
      action,
      propertyId: propertyId ? propertyId.trim() : undefined
    };

    const tryPost = (baseUrl: string) =>
      this.http.post<{ success: boolean; data: EntitlementConsumptionResult; error?: string }>(baseUrl, payload);

    return tryPost(`${environment.apiUrl}/subscriptions/consume-entitlement.php`).pipe(
      catchError(() => tryPost('/p_demo_5/backend/api/subscriptions/consume-entitlement.php')),
      catchError(() => tryPost('/api/subscriptions/consume-entitlement.php')),
      catchError(() => tryPost(`${environment.apacheApiUrl}/subscriptions/consume-entitlement.php`)),
      map(res => {
        if (res && res.success && res.data) {
          return res.data;
        }
        return { allowed: true };
      }),
      tap(res => {
        if (res && res.allowed) {
          if (propertyId && !res.isRepeatView) {
            this.unlockedProjectIds.update(set => {
              const next = new Set(set);
              next.add(propertyId.trim().toUpperCase());
              return next;
            });
          }
          // Update cached entitlements
          this.entitlements.update(ent => {
            if (!ent) return ent;
            if (action === 'project_view' && !res.isRepeatView) {
              const used = res.projectViewsUsed ?? (ent.projectViewsUsed + 1);
              return { ...ent, projectViewsUsed: used, projectViewsRemaining: Math.max(0, ent.projectViewLimit - used) };
            }
            if (action === 'comparison') {
              const used = res.comparisonsUsed ?? (ent.comparisonsUsed + 1);
              return { ...ent, comparisonsUsed: used, comparisonsRemaining: Math.max(0, ent.comparisonLimit - used) };
            }
            if (action === 'advisory_session') {
              const used = res.advisorySessionsUsed ?? (ent.advisorySessionsUsed + 1);
              return { ...ent, advisorySessionsUsed: used, advisorySessionsRemaining: Math.max(0, ent.advisorySessionLimit - used) };
            }
            if (action === 'site_visit') {
              const used = res.siteVisitsUsed ?? (ent.siteVisitsUsed + 1);
              return { ...ent, siteVisitsUsed: used, siteVisitsRemaining: Math.max(0, ent.siteVisitLimit - used) };
            }
            return ent;
          });
          this.saveStoredEntitlements(this.entitlements());
        }
      }),
      catchError(err => {
        const errorData = err?.error?.data || {};
        return of({
          allowed: false,
          limitReached: true,
          upgradeRequired: true,
          message: err?.error?.error || 'Entitlement limit reached'
        });
      })
    );
  }

  /**
   * Check if a property is already unlocked (free repeat view)
   */
  public isProjectUnlocked(propertyId: string): boolean {
    if (!propertyId) return false;
    return this.unlockedProjectIds().has(propertyId.trim().toUpperCase());
  }

  /**
   * Subscribe to a plan using Razorpay Gateway with webhook/HMAC signature verification
   */
  public subscribeToPlan(plan: SubscriptionPlan): void {
    if (!this.authService.isLoggedIn()) {
      this.notificationService.show({
        type: 'info',
        title: 'Sign In Required',
        message: 'Please sign in with your mobile number to activate or upgrade your subscription plan.',
        icon: 'login'
      });
      this.authService.openOtpModal();
      return;
    }

    const uid = this.getEffectiveUserId();
    const user = this.authService.currentUser();
    this.isProcessingPayment.set(true);

    // 1. Create order on backend
    const tryCreateOrder = (baseUrl: string) =>
      this.http.post<{ success: boolean; data: any }>(baseUrl, {
        planId: plan.id,
        userId: uid
      });

    (tryCreateOrder(`${environment.apiUrl}/subscriptions/create-order.php`).pipe(
      catchError(() => tryCreateOrder('/p_demo_5/backend/api/subscriptions/create-order.php')),
      catchError(() => tryCreateOrder('/api/subscriptions/create-order.php')),
      catchError(() => tryCreateOrder(`${environment.apacheApiUrl}/subscriptions/create-order.php`))
    ) as Observable<any>).subscribe({
      next: (res) => {
        if (!res || !res.success || !res.data) {
          this.isProcessingPayment.set(false);
          this.notificationService.show({
            type: 'error',
            title: 'Order Generation Failed',
            message: 'Unable to initiate subscription order with backend.',
            icon: 'error'
          });
          return;
        }

        const orderData = res.data;

        // If free Explorer plan, already activated on backend
        if (orderData.isFreePlan) {
          this.isProcessingPayment.set(false);
          this.fetchCurrentSubscription().subscribe();
          this.notificationService.show({
            type: 'success',
            title: 'Explorer Plan Activated',
            message: 'You now have complimentary access to 2 project dossiers and 1 advisory session.',
            icon: 'verified'
          });
          return;
        }

        // Open Razorpay Checkout Modal
        this.openRazorpayCheckout(plan, orderData, user);
      },
      error: (err) => {
        this.isProcessingPayment.set(false);
        this.notificationService.show({
          type: 'error',
          title: 'Subscription Error',
          message: err?.error?.error || 'Could not start payment session.',
          icon: 'payment'
        });
      }
    });
  }

  /**
   * Verify Razorpay payment and activate plan entitlements
   */
  public verifyPayment(
    plan: SubscriptionPlan,
    paymentId: string,
    orderId: string,
    signature: string
  ): Observable<{ success: boolean; data: any; message: string }> {
    const uid = this.getEffectiveUserId();
    const payload = {
      userId: uid,
      planId: plan.id,
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature
    };

    const tryVerify = (baseUrl: string) =>
      this.http.post<{ success: boolean; data: any; message: string }>(baseUrl, payload);

    return (tryVerify(`${environment.apiUrl}/subscriptions/verify-payment.php`).pipe(
      catchError(() => tryVerify('/p_demo_5/backend/api/subscriptions/verify-payment.php')),
      catchError(() => tryVerify('/api/subscriptions/verify-payment.php')),
      catchError(() => tryVerify(`${environment.apacheApiUrl}/subscriptions/verify-payment.php`)),
      tap((vRes) => {
        if (vRes && vRes.success) {
          if (vRes.data) {
            const d = vRes.data;
            const planRef = this.plans().find(p => p.id === d.planId) || plan;
            const durDays = planRef.durationDays || 30;

            const newSub: UserSubscription = {
              id: d.subscriptionId || Date.now(),
              userId: uid,
              planId: d.planId,
              status: 'active',
              amountPaid: d.amountPaid || planRef.priceInr,
              razorpayPaymentId: d.paymentId,
              razorpayOrderId: orderId,
              startsAt: new Date().toISOString(),
              expiresAt: d.expiresAt || new Date(Date.now() + durDays * 86400000).toISOString(),
              createdAt: new Date().toISOString(),
              planName: d.planName || planRef.name,
              durationDays: durDays
            };
            this.currentSubscription.set(newSub);
            this.saveStoredSubscription(newSub);

            if (d.entitlements) {
              const newEnt: UserEntitlements = {
                planId: d.planId,
                planName: d.planName || planRef.name,
                projectViewsUsed: 0,
                projectViewLimit: d.entitlements.projectViewLimit ?? planRef.projectViewLimit,
                projectViewsRemaining: d.entitlements.projectViewLimit ?? planRef.projectViewLimit,
                comparisonsUsed: 0,
                comparisonLimit: d.entitlements.comparisonLimit ?? planRef.comparisonLimit,
                comparisonsRemaining: d.entitlements.comparisonLimit ?? planRef.comparisonLimit,
                advisorySessionsUsed: 0,
                advisorySessionLimit: d.entitlements.advisorySessionLimit ?? planRef.advisorySessionLimit,
                advisorySessionsRemaining: d.entitlements.advisorySessionLimit ?? planRef.advisorySessionLimit,
                siteVisitsUsed: 0,
                siteVisitLimit: d.entitlements.siteVisitLimit ?? planRef.siteVisitLimit,
                siteVisitsRemaining: d.entitlements.siteVisitLimit ?? planRef.siteVisitLimit,
                hasLocationReport: !!d.entitlements.hasLocationReport,
                hasDedicatedAdvisor: !!d.entitlements.hasDedicatedAdvisor,
                hasPriorityAdvisor: !!d.entitlements.hasPriorityAdvisor,
                expiresAt: d.expiresAt || null
              };
              this.entitlements.set(newEnt);
              this.saveStoredEntitlements(newEnt);
            }
            this.daysRemaining.set(durDays);
          }

          // Complete background sync of invoices & server state
          this.fetchCurrentSubscription().subscribe();
        }
      })
    ) as Observable<any>);
  }

  private openRazorpayCheckout(plan: SubscriptionPlan, orderData: any, user: any): void {
    const uid = this.getEffectiveUserId();
    const keyId = orderData.keyId || 'rzp_test_51MockFindAPlot';
    const amountPaise = orderData.amountPaise || (plan.priceInr * 100);

    const completeVerification = (razorpayPaymentId: string, razorpayOrderId: string, signature: string) => {
      this.verifyPayment(plan, razorpayPaymentId, razorpayOrderId, signature).subscribe({
        next: (vRes) => {
          this.isProcessingPayment.set(false);
          if (vRes && vRes.success) {
            this.notificationService.show({
              type: 'success',
              title: `${plan.name} Subscribed!`,
              message: `Payment verified. GST Invoice ${vRes.data?.invoiceNumber} generated.`,
              icon: 'verified'
            });
          } else {
            this.notificationService.show({
              type: 'warning',
              title: 'Verification Incomplete',
              message: 'Payment received. Awaiting webhook confirmation.',
              icon: 'hourglass_empty'
            });
          }
        },
        error: (err) => {
          this.isProcessingPayment.set(false);
          this.notificationService.show({
            type: 'error',
            title: 'Verification Failed',
            message: err?.error?.error || 'Signature check failed. Contact support.',
            icon: 'gpp_bad'
          });
        }
      });
    };

    if (typeof window !== 'undefined' && window.Razorpay) {
      const options = {
        key: keyId,
        amount: amountPaise,
        currency: 'INR',
        name: 'FindAPlot.in',
        description: `${plan.name} (${plan.durationDays} Days Membership)`,
        image: 'logo.svg',
        order_id: orderData.orderId,
        handler: (response: any) => {
          completeVerification(
            response.razorpay_payment_id,
            response.razorpay_order_id || orderData.orderId,
            response.razorpay_signature || 'sig_test_' + Date.now()
          );
        },
        prefill: {
          name: user?.name || 'Verified Investor',
          email: user?.email || 'investor@findaplot.in',
          contact: user?.phone || '+91 94441 00000'
        },
        theme: {
          color: '#5e8f72' // PRD Theme color
        },
        modal: {
          ondismiss: () => {
            this.isProcessingPayment.set(false);
            this.notificationService.show({
              type: 'info',
              title: 'Checkout Dismissed',
              message: 'Payment cancelled. Your subscription was not activated.',
              icon: 'payment'
            });
          }
        }
      };

      try {
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', () => {
          this.isProcessingPayment.set(false);
        });
        rzp.open();
        return;
      } catch (err) {
        console.warn('Razorpay SDK runtime issue, using sandbox direct simulation:', err);
      }
    }

    // Sandbox / Test fallback simulator (when Razorpay SDK is not injected)
    const mockPaymentId = 'pay_test_' + substr(Math.random().toString(36).substring(2, 10), 0, 10);
    const mockSig = 'sig_test_' + Date.now();
    completeVerification(mockPaymentId, orderData.orderId, mockSig);
  }

  /**
   * Open GST Tax Invoice in new window
   */
  public viewInvoice(invoiceNumber: string): void {
    const url = `${environment.apiUrl}/subscriptions/invoice.php?invoiceNumber=${encodeURIComponent(invoiceNumber)}`;
    window.open(url, '_blank');
  }

  /**
   * Request refund for an invoice
   */
  public requestRefund(invoiceId: number, reason: string): Observable<boolean> {
    const uid = this.getEffectiveUserId();
    const tryPost = (baseUrl: string) =>
      this.http.post<{ success: boolean; message: string }>(baseUrl, {
        userId: uid,
        invoiceId,
        reason
      });

    return (tryPost(`${environment.apiUrl}/subscriptions/refund.php`).pipe(
      catchError(() => tryPost('/p_demo_5/backend/api/subscriptions/refund.php')),
      catchError(() => tryPost('/api/subscriptions/refund.php')),
      catchError(() => tryPost(`${environment.apacheApiUrl}/subscriptions/refund.php`))
    ) as Observable<any>).pipe(
      map(res => !!(res && res.success)),
      tap(ok => {
        if (ok) {
          this.fetchCurrentSubscription().subscribe();
          this.notificationService.show({
            type: 'success',
            title: 'Refund Processed',
            message: 'Your refund has been registered and plan reverted to Explorer.',
            icon: 'currency_exchange'
          });
        }
      })
    );
  }
}

function substr(str: string, start: number, len: number): string {
  return str.substring(start, start + len);
}
