export interface PricingPack {
  id: string;
  name: string;
  category: string;
  points: number;
  bonusPoints?: number;
  totalPoints: number;
  priceInRupees: number;
  pricePerPoint: string;
  subtitle: string;
  unlockEstimate: string;
  features: string[];
  isRecommended?: boolean;
  badgeText?: string;
  ctaText: string;
}
