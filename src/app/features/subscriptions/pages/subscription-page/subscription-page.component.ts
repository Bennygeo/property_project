import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
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
  readonly route = inject(ActivatedRoute);

  readonly defaultPlans = DEFAULT_SUBSCRIPTION_PLANS;
  readonly expandedFaqIndex = signal<number | null>(0);
  readonly selectedInvoiceForRefund = signal<SubscriptionInvoice | null>(null);
  readonly isRefundModalOpen = signal<boolean>(false);
  readonly refundReason = signal<string>('Not satisfied with project discovery');
  readonly isSubmittingRefund = signal<boolean>(false);

  // Razorpay Payment Gateway Demo Modal Signals
  readonly isRazorpayModalOpen = signal<boolean>(false);
  readonly selectedPlanForCheckout = signal<SubscriptionPlan | null>(null);
  readonly activeRazorpayTab = signal<'upi' | 'card' | 'netbanking'>('upi');
  readonly selectedBank = signal<string>('HDFC Bank');
  readonly testUpiId = signal<string>('success@razorpay');
  readonly testCardNumber = signal<string>('4000 0000 0000 0002');
  readonly testCardExpiry = signal<string>('12/28');
  readonly testCardCvv = signal<string>('123');
  readonly isProcessingRazorpay = signal<boolean>(false);

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

    // Check for plan query param from other pages
    this.route.queryParams.subscribe(params => {
      const planQuery = params['plan'];
      if (planQuery) {
        setTimeout(() => {
          const found = this.plans().find(p => p.id === planQuery || p.id.toLowerCase() === planQuery.toLowerCase());
          if (found && found.id !== this.activePlanId()) {
            this.onSubscribe(found);
          }
        }, 300);
      }
    });
  }

  toggleFaq(index: number): void {
    if (this.expandedFaqIndex() === index) {
      this.expandedFaqIndex.set(null);
    } else {
      this.expandedFaqIndex.set(index);
    }
  }

  onSubscribe(plan: SubscriptionPlan): void {
    if (this.activePlanId() === plan.id) {
      this.notificationService.show({
        type: 'info',
        title: 'Current Plan Active',
        message: `You are already subscribed to the ${plan.name} plan.`,
        icon: 'verified'
      });
      return;
    }

    // Free Explorer plan activates immediately
    if (plan.priceInr <= 0) {
      this.subscriptionService.subscribeToPlan(plan);
      return;
    }

    // Paid Plan: Launch Razorpay Payment Gateway with Demo Credentials
    this.openRazorpayCheckout(plan);
  }

  openRazorpayCheckout(plan: SubscriptionPlan): void {
    this.selectedPlanForCheckout.set(plan);
    this.activeRazorpayTab.set('upi');
    this.isRazorpayModalOpen.set(true);
  }

  closeRazorpayCheckout(): void {
    this.isRazorpayModalOpen.set(false);
    this.isProcessingRazorpay.set(false);
    this.selectedPlanForCheckout.set(null);
  }

  setRazorpayTab(tab: 'upi' | 'card' | 'netbanking'): void {
    this.activeRazorpayTab.set(tab);
  }

  selectBank(bank: string): void {
    this.selectedBank.set(bank);
  }

  confirmRazorpayPayment(): void {
    const plan = this.selectedPlanForCheckout();
    if (!plan) return;

    this.isProcessingRazorpay.set(true);

    // Generate standard Razorpay test payment ID and test signature
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const paymentId = `pay_rzp_test_${Date.now().toString().slice(-6)}${randomSuffix}`;
    const orderId = `order_test_${Date.now().toString().slice(-8)}`;
    const signature = `sig_test_${Date.now()}`;

    this.subscriptionService.verifyPayment(plan, paymentId, orderId, signature).subscribe({
      next: (res) => {
        this.isProcessingRazorpay.set(false);
        this.closeRazorpayCheckout();

        if (res && res.success) {
          this.subscriptionService.fetchCurrentSubscription();
          this.notificationService.show({
            type: 'success',
            title: `🎉 ${plan.name} Subscribed!`,
            message: `Razorpay payment authorized successfully. GST Invoice ${res.data?.invoiceNumber || ''} generated.`,
            icon: 'verified'
          });

          // Navigate/scroll smoothly back to top of the page
          if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        } else {
          this.notificationService.show({
            type: 'warning',
            title: 'Payment Awaiting Settlement',
            message: 'Transaction captured on Razorpay. Entitlements are syncing.',
            icon: 'hourglass_empty'
          });
        }
      },
      error: (err) => {
        this.isProcessingRazorpay.set(false);
        this.notificationService.show({
          type: 'error',
          title: 'Verification Failed',
          message: err?.error?.error || 'Could not verify payment signature.',
          icon: 'gpp_bad'
        });
      }
    });
  }

  simulateFailure(): void {
    this.isProcessingRazorpay.set(true);
    setTimeout(() => {
      this.isProcessingRazorpay.set(false);
      this.closeRazorpayCheckout();
      this.notificationService.show({
        type: 'error',
        title: 'Payment Declined',
        message: 'Razorpay Sandbox: Transaction was declined by the simulated bank gateway.',
        icon: 'credit_card_off'
      });
    }, 600);
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

