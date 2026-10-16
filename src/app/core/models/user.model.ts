export type UserRole = 'buyer' | 'seller' | 'developer' | 'admin';

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  pointsBalance: number;
  createdAt: string;
}

export interface ScheduledVisit {
  id: number;
  propertyId: string;
  propertyTitle: string;
  locality?: string;
  city?: string;
  price?: string;
  imageUrl?: string;
  leadType: 'site_visit' | 'brochure_download' | 'whatsapp_concierge' | 'callback_request';
  contactName: string;
  contactPhone: string;
  preferredDate?: string;
  visitSlot?: string;
  notes?: string;
  status: 'new' | 'contacted' | 'scheduled' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface UnlockedMediaItem {
  id: number;
  propertyId: string;
  propertyTitle: string;
  locality?: string;
  city?: string;
  price?: string;
  imageUrl?: string;
  propertyType?: string;
  pointsSpent: number;
  unlockedAt: string;
}

export interface WalletLedgerItem {
  id: number;
  transactionType: 'credit_purchase' | 'debit_unlock' | 'bonus_credit';
  points: number;
  amountRupees: number;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  description: string;
  status: 'pending' | 'success' | 'failed';
  createdAt: string;
}

export interface ShortlistedItem {
  id: number;
  propertyId: string;
  title: string;
  locality: string;
  city: string;
  price: string;
  pricePerSqFt: string;
  sqft: string;
  bhkBadge: string;
  facingOrView: string;
  imageUrl: string;
  propertyType: string;
  savedAt: string;
}

export interface ViewHistoryItem {
  id: number;
  propertyId: string;
  title: string;
  locality: string;
  city: string;
  price: string;
  pricePerSqFt: string;
  sqft: string;
  bhkBadge: string;
  facingOrView: string;
  imageUrl: string;
  propertyType: string;
  viewedAt: string;
}

export interface BrochureDownloadItem {
  id: number;
  propertyId: string;
  propertyTitle: string;
  locality?: string;
  city?: string;
  price?: string;
  imageUrl?: string;
  contactName: string;
  contactPhone: string;
  createdAt: string;
}

export interface UserProfileResponse {
  user: User;
  visits: ScheduledVisit[];
  brochures: BrochureDownloadItem[];
  unlocks: UnlockedMediaItem[];
  transactions: WalletLedgerItem[];
  shortlists: ShortlistedItem[];
  viewHistory: ViewHistoryItem[];
  summary: {
    pointsBalance: number;
    visitsCount: number;
    brochuresCount: number;
    unlocksCount: number;
    shortlistsCount: number;
    viewsCount: number;
  };
}

export interface WalletDashboardData {
  balance: number;
  balanceRupeesValue: number;
  totalSpentRupees: number;
  totalPointsPurchased: number;
  totalPointsUnlocked: number;
  unlockedToursCount: number;
  transactions: WalletLedgerItem[];
}

export interface RechargeResult {
  transactionId: number;
  userId: number;
  pointsPurchased: number;
  bonusPoints: number;
  totalPointsCredited: number;
  amountRupees: number;
  previousBalance: number;
  newBalance: number;
  paymentMethod: string;
  razorpayPaymentId: string;
  timestamp: string;
}

