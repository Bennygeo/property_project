import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SubscriptionService, DEFAULT_SUBSCRIPTION_PLANS } from '../../../../core/services/subscription.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SubscriptionPlan, SubscriptionInvoice, UserEntitlements } from '../../../../core/models/subscription.model';
import { HeaderComponent } from '../../../home/components/header/header.component';
import { FooterComponent } from '../../../home/components/footer/footer.component';
import { TopConciergeBarComponent } from '../../../home/components/top-concierge-bar/top-concierge-bar.component';
import { ToastComponent } from '../../../home/components/toast/toast.component';

@Component({
  selector: 'app-subscription-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    HeaderComponent,
    FooterComponent,
    TopConciergeBarComponent,
    ToastComponent
  ],
  templateUrl: './subscription-page.component.html',
  styleUrls: ['./subscription-page.component.css']
})
export class SubscriptionPageComponent implements OnInit {
  readonly subscriptionService = inject(SubscriptionService);
  readonly authService = inject(AuthService);
  readonly notificationService = inject(NotificationService);

  readonly defaultPlans = DEFAULT_SUBSCRIPTION_PLANS;
  readonly expandedFaqIndex = signal<number | null>(0);
  readonly selectedInvoiceForRefund = signal<SubscriptionInvoice | null>(null);
  readonly isRefundModalOpen = signal<boolean>(false);
  readonly refundReason = signal<string>('Not satisfied with project discovery');
  readonly isSubmittingRefund = signal<boolean>(false);

  readonly plans = computed<SubscriptionPlan[]>(() => {
    const p = this.subscriptionService.plans();
    return (p && p.length > 0) ? p : this.defaultPlans;
  });

  readonly entitlements = computed<UserEntitlements>(() => {
    return this.subscriptionService.entitlements() || {
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
  });

  readonly currentSub = computed(() => this.subscriptionService.currentSubscription());
  readonly activePlanId = computed(() => this.subscriptionService.activePlanId());
  readonly invoices = computed(() => this.subscriptionService.invoices());

  readonly faqs = [
    {
      q: 'Do repeated visits to the same project burn additional credits?',
      a: 'No. Our entitlement engine tracks unique project IDs in your private portfolio. Once you unlock a project dossier, you can revisit it as many times as you want without burning any additional credits.'
    },
    {
      q: 'How does the physical site visit credit work?',
      a: 'Priority Buyer (1 visit) and VIP Concierge (3 visits) plans include chauffeured physical site visits. Our field desk assigns a dedicated coordinator who shares live GPS pickup coordinates and escorts you across the layout boundary.'
    },
    {
      q: 'Are payments secure and inclusive of GST?',
      a: 'Yes. All payments are processed through Razorpay with HMAC SHA-256 cryptographic signature verification. Every transaction generates an automated statutory GST tax invoice (SAC 998313) available for instant PDF download.'
    },
    {
      q: 'Can I upgrade my plan midway?',
      a: 'Yes. When you upgrade, your entitlements are immediately upgraded to the higher tier limits with fresh quotas, and your previous plan is smoothly transitioned.'
    }
  ];

  ngOnInit(): void {
    this.subscriptionService.fetchPlans().subscribe();
    this.subscriptionService.fetchCurrentSubscription().subscribe();
  }

  toggleFaq(index: number): void {
    if (this.expandedFaqIndex() === index) {
      this.expandedFaqIndex.set(null);
    } else {
      this.expandedFaqIndex.set(index);
    }
  }

  onSubscribe(plan: SubscriptionPlan): void {
    if (!this.authService.isLoggedIn()) {
      this.notificationService.show({
        type: 'info',
        title: 'Sign In Required',
        message: 'Please sign in or enter your mobile number to link your membership.',
        icon: 'login'
      });
      this.authService.openOtpModal('general');
      return;
    }

    if (this.activePlanId() === plan.id) {
      this.notificationService.show({
        type: 'info',
        title: 'Current Plan Active',
        message: `You are already subscribed to the ${plan.name} plan.`,
        icon: 'verified'
      });
      return;
    }

    this.subscriptionService.subscribeToPlan(plan);
  }

  downloadInvoice(invoiceNumber: string): void {
    this.subscriptionService.viewInvoice(invoiceNumber);
  }

  openRefundModal(inv: SubscriptionInvoice): void {
    this.selectedInvoiceForRefund.set(inv);
    this.isRefundModalOpen.set(true);
  }

  closeRefundModal(): void {
    this.isRefundModalOpen.set(false);
    this.selectedInvoiceForRefund.set(null);
  }

  submitRefund(): void {
    const inv = this.selectedInvoiceForRefund();
    if (!inv) return;

    this.isSubmittingRefund.set(true);
    this.subscriptionService.requestRefund(inv.id, this.refundReason()).subscribe({
      next: () => {
        this.isSubmittingRefund.set(false);
        this.closeRefundModal();
      },
      error: () => {
        this.isSubmittingRefund.set(false);
      }
    });
  }

  formatPrice(num: any): string {
    const val = Number(num);
    if (isNaN(val) || val <= 0) return 'Free';
    return `₹${val.toLocaleString('en-IN')}`;
  }

  calculatePercentage(used: any, limit: any): number {
    const u = Number(used) || 0;
    const l = Number(limit) || 0;
    if (l <= 0) return 0;
    return Math.min(100, Math.round((u / l) * 100));
  }
}

