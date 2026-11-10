export interface SubscriptionPlan {
  id: string;
  name: string;
  badgeText?: string | null;
  priceInr: number;
  durationDays: number;
  projectViewLimit: number;
  comparisonLimit: number;
  advisorySessionLimit: number;
  siteVisitLimit: number;
  hasLocationReport: boolean;
  hasDedicatedAdvisor: boolean;
  hasPriorityAdvisor: boolean;
  description: string;
  features: string[];
  sortOrder: number;
}

export interface UserSubscription {
  id: number;
  userId: number;
  planId: string;
  status: 'active' | 'expired' | 'cancelled' | 'upgraded';
  amountPaid: number;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  startsAt: string;
  expiresAt: string;
  createdAt: string;
  planName?: string;
  badgeText?: string;
  durationDays?: number;
}

export interface UserEntitlements {
  planId: string;
  planName: string;
  projectViewsUsed: number;
  projectViewLimit: number;
  projectViewsRemaining: number;
  comparisonsUsed: number;
  comparisonLimit: number;
  comparisonsRemaining: number;
  advisorySessionsUsed: number;
  advisorySessionLimit: number;
  advisorySessionsRemaining: number;
  siteVisitsUsed: number;
  siteVisitLimit: number;
  siteVisitsRemaining: number;
  hasLocationReport: boolean;
  hasDedicatedAdvisor: boolean;
  hasPriorityAdvisor: boolean;
  expiresAt?: string | null;
}

export interface SubscriptionInvoice {
  id: number;
  invoiceNumber: string;
  planId: string;
  planName: string;
  baseAmount: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
  sacCode: string;
  gstin: string;
  paymentMethod: string;
  paymentId?: string;
  status: 'paid' | 'refunded' | 'void';
  createdAt: string;
}

export interface EntitlementConsumptionResult {
  allowed: boolean;
  isRepeatView?: boolean;
  creditsBurned?: number;
  projectViewsUsed?: number;
  projectViewLimit?: number;
  projectViewsRemaining?: number;
  comparisonsUsed?: number;
  comparisonLimit?: number;
  comparisonsRemaining?: number;
  advisorySessionsUsed?: number;
  advisorySessionLimit?: number;
  advisorySessionsRemaining?: number;
  siteVisitsUsed?: number;
  siteVisitLimit?: number;
  siteVisitsRemaining?: number;
  limitReached?: boolean;
  upgradeRequired?: boolean;
  message?: string;
}

