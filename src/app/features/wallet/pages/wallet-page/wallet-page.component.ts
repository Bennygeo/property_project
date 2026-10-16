import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { WalletService, RechargeOption } from '../../../../core/services/wallet.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { HeaderComponent } from '../../../home/components/header/header.component';
import { FooterComponent } from '../../../home/components/footer/footer.component';
import { TopConciergeBarComponent } from '../../../home/components/top-concierge-bar/top-concierge-bar.component';
import { ToastComponent } from '../../../home/components/toast/toast.component';
import { WalletDashboardData, WalletLedgerItem } from '../../../../core/models/user.model';

export type PaymentMethodType = 'upi' | 'card' | 'netbanking';
export type TransactionFilterType = 'all' | 'credit_purchase' | 'debit_unlock';

@Component({
  selector: 'app-wallet-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    HeaderComponent,
    FooterComponent,
    TopConciergeBarComponent,
    ToastComponent
  ],
  templateUrl: './wallet-page.component.html',
  styleUrls: ['./wallet-page.component.css']
})
export class WalletPageComponent implements OnInit {
  readonly walletService = inject(WalletService);
  readonly authService = inject(AuthService);
  readonly notificationService = inject(NotificationService);
  readonly router = inject(Router);
  readonly route = inject(ActivatedRoute);

  // Loading States
  readonly isLoading = signal<boolean>(true);
  readonly isRecharging = signal<boolean>(false);

  // Transactions & Summary Data from MySQL
  readonly walletData = signal<WalletDashboardData | null>(null);

  // Selected Package or Custom Top-up
  readonly isCustomMode = signal<boolean>(false);
  readonly selectedPackage = signal<RechargeOption | null>(null);
  readonly customPoints = signal<number>(20);

  // Payment Selection
  readonly selectedPaymentMethod = signal<PaymentMethodType>('upi');
  readonly upiId = signal<string>('investor@okhdfcbank');
  readonly enableGstInvoice = signal<boolean>(false);
  readonly gstNumber = signal<string>('');

  // Transactions Filter
  readonly activeTxnTab = signal<TransactionFilterType>('all');

  // Receipt Modal State
  readonly activeReceipt = signal<WalletLedgerItem | null>(null);
  readonly isReceiptModalOpen = signal<boolean>(false);

  // Computed Values for Checkout Breakdown
  readonly currentPoints = computed<number>(() => {
    if (this.isCustomMode()) {
      return Math.max(2, this.customPoints());
    }
    return this.selectedPackage()?.points || 20;
  });

  readonly currentBonus = computed<number>(() => {
    if (this.isCustomMode()) {
      const pts = this.customPoints();
      if (pts >= 100) return 15;
      if (pts >= 40) return 5;
      if (pts >= 20) return 2;
      return 0;
    }
    return this.selectedPackage()?.bonus || 0;
  });

  readonly totalPointsToCredit = computed<number>(() => {
    return this.currentPoints() + this.currentBonus();
  });

  readonly currentAmountRupees = computed<number>(() => {
    if (this.isCustomMode()) {
      return this.customPoints() * 50;
    }
    return this.selectedPackage()?.rupees || 1000;
  });

  readonly estimatedWalkthroughs = computed<number>(() => {
    return Math.floor(this.totalPointsToCredit() / 2);
  });

  // Filtered Transaction List
  readonly filteredTransactions = computed<WalletLedgerItem[]>(() => {
    const list = this.walletData()?.transactions || [];
    const filter = this.activeTxnTab();
    if (filter === 'all') return list;
    return list.filter(t => t.transactionType === filter);
  });

  ngOnInit(): void {
    // Ensure the page always starts at the top and never retains previous scroll position
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    }

    // 1. Check for query parameters passed from pricing cards (e.g. ?rupees=1000 or ?points=22 or ?custom=true)
    const isCustom = this.route.snapshot.queryParamMap.get('custom') === 'true';
    const queryRupees = Number(this.route.snapshot.queryParamMap.get('rupees'));
    const queryPoints = Number(this.route.snapshot.queryParamMap.get('points'));

    if (isCustom) {
      this.switchToCustom();
    } else {
      let matchedPkg: RechargeOption | undefined;
      if (queryRupees) {
        matchedPkg = this.walletService.rechargeOptions.find(p => p.rupees === queryRupees);
      }
      if (!matchedPkg && queryPoints) {
        matchedPkg = this.walletService.rechargeOptions.find(p => p.points === queryPoints);
      }

      const defaultPkg = matchedPkg || this.walletService.rechargeOptions.find(p => p.popular) || this.walletService.rechargeOptions[0];
      if (defaultPkg) {
        this.selectPackage(defaultPkg);
      }
    }

    this.loadWalletData();
  }

  loadWalletData(): void {
    this.isLoading.set(true);
    const userId = this.authService.currentUser()?.id || 1;

    this.walletService.fetchTransactions(userId).subscribe(data => {
      this.isLoading.set(false);
      if (data) {
        this.walletData.set(data);
      }
    });
  }

  selectPackage(pkg: RechargeOption): void {
    this.isCustomMode.set(false);
    this.selectedPackage.set(pkg);
  }

  switchToCustom(): void {
    this.isCustomMode.set(true);
    this.selectedPackage.set(null);
  }

  updateCustomPoints(points: number): void {
    const valid = Math.max(2, Math.min(500, Math.round(points || 2)));
    this.customPoints.set(valid);
  }

  stepCustomPoints(step: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.isCustomMode.set(true);
    this.selectedPackage.set(null);
    this.updateCustomPoints(this.customPoints() + step);
  }

  setCustomPointsFromCard(points: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.isCustomMode.set(true);
    this.selectedPackage.set(null);
    this.updateCustomPoints(points);
  }

  // Razorpay Demo Modal Controls
  readonly isRazorpayModalOpen = signal<boolean>(false);
  readonly activeRazorpayTab = signal<'upi' | 'card' | 'netbanking'>('upi');
  readonly selectedBank = signal<string>('HDFC Bank');
  readonly testUpiId = signal<string>('success@razorpay');
  readonly testCardNumber = signal<string>('4000 0000 0000 0002');
  readonly testCardExpiry = signal<string>('12/28');
  readonly testCardCvv = signal<string>('123');
  readonly isProcessingRazorpay = signal<boolean>(false);

  setRazorpayTab(tab: 'upi' | 'card' | 'netbanking'): void {
    this.activeRazorpayTab.set(tab);
  }

  selectBank(bank: string): void {
    this.selectedBank.set(bank);
  }

  openRazorpayCheckout(): void {
    this.isRazorpayModalOpen.set(true);
  }

  closeRazorpayCheckout(): void {
    this.isRazorpayModalOpen.set(false);
    this.isProcessingRazorpay.set(false);
  }

  // Handle successful test payment authorization
  confirmRazorpayPayment(): void {
    const points = this.currentPoints();
    const bonus = this.currentBonus();
    const amount = this.currentAmountRupees();
    const user = this.authService.currentUser();
    const userId = user?.id || 1;

    this.isProcessingRazorpay.set(true);

    // Generate standard Razorpay payment ID format
    const randomSuffix = Math.random().toString(36).substring(2, 10).toUpperCase();
    const paymentId = `pay_rzp_test_${Date.now().toString().slice(-6)}${randomSuffix}`;

    setTimeout(() => {
      this.executeBackendRecharge(points, bonus, amount, paymentId, userId);
      this.closeRazorpayCheckout();
    }, 700);
  }

  // Handle simulated payment failure
  simulateFailure(): void {
    this.isProcessingRazorpay.set(true);
    setTimeout(() => {
      this.isProcessingRazorpay.set(false);
      this.closeRazorpayCheckout();
      this.notificationService.show({
        type: 'error',
        title: 'Payment Declined',
        message: 'Razorpay Demo: Transaction was declined by the test bank simulator.',
        icon: 'credit_card_off'
      });
    }, 600);
  }

  // Process recharge via Razorpay modal
  processRecharge(): void {
    this.openRazorpayCheckout();
  }

  private executeBackendRecharge(points: number, bonus: number, amount: number, paymentId: string, userId: number): void {
    this.walletService.rechargeWallet(points, bonus, amount, 'Razorpay Gateway (Demo Account)', paymentId, userId).subscribe(result => {
      this.isRecharging.set(false);
      this.isProcessingRazorpay.set(false);
      if (result) {
        this.loadWalletData();
        const simulatedItem: WalletLedgerItem = {
          id: result.transactionId,
          transactionType: 'credit_purchase',
          points: result.totalPointsCredited,
          amountRupees: result.amountRupees,
          razorpayPaymentId: paymentId,
          description: `Wallet Recharge: ${points} Pts` + (bonus > 0 ? ` + ${bonus} Bonus Pts` : '') + ` via Razorpay (Demo Mode)`,
          status: 'success',
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
        };
        this.openReceipt(simulatedItem);
      }
    });
  }

  openReceipt(txn: WalletLedgerItem): void {
    this.activeReceipt.set(txn);
    this.isReceiptModalOpen.set(true);
  }

  closeReceipt(): void {
    this.isReceiptModalOpen.set(false);
    this.activeReceipt.set(null);
  }

  printReceipt(): void {
    window.print();
  }
}
