import { Injectable, computed, inject, signal } from '@angular/core';
import { Property } from '../models/property.model';
import { NotificationService } from './notification.service';

export interface CoreDifferenceItem {
  type: 'price' | 'rate' | 'road' | 'area' | 'approval' | 'facing' | 'location';
  title: string;
  summary: string;
  winnerIndex: 0 | 1 | null; // 0 = Left (Property 1), 1 = Right (Property 2), null = neutral
  badgeText: string;
  badgeType: 'advantage' | 'neutral' | 'info';
}

export interface CompareSpecRow {
  category: 'Financials & Value' | 'Land & Dimensions' | 'Legal & Approvals' | 'Location & Accessibility' | 'Media & Verifications';
  label: string;
  icon: string;
  value1: string;
  value2: string;
  isDifferent: boolean;
  advantageIndex?: 0 | 1 | null;
  advantageLabel?: string;
}

export function parseNumericPrice(priceStr: string | undefined): number {
  if (!priceStr) return 0;
  const cleaned = priceStr.replace(/,/g, '').trim();
  const crMatch = cleaned.match(/([\d.]+)\s*Cr/i);
  if (crMatch) return Math.round(parseFloat(crMatch[1]) * 10000000);
  const lMatch = cleaned.match(/([\d.]+)\s*(?:L|Lakh|Lakhs|Lacs)/i);
  if (lMatch) return Math.round(parseFloat(lMatch[1]) * 100000);
  const kMatch = cleaned.match(/([\d.]+)\s*K/i);
  if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1000);
  const numMatch = cleaned.replace(/[^\d.]/g, '');
  const val = parseFloat(numMatch);
  return isNaN(val) ? 0 : Math.round(val);
}

export function parseNumericRate(rateStr: string | undefined): number {
  if (!rateStr) return 0;
  const cleaned = rateStr.replace(/,/g, '').replace(/[^\d.]/g, '');
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : Math.round(val);
}

export function formatPriceLakhsOrCrores(amount: number): string {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  } else if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} Lakhs`;
  } else {
    return `₹${amount.toLocaleString('en-IN')}`;
  }
}

@Injectable({
  providedIn: 'root'
})
export class CompareService {
  private readonly notificationService = inject(NotificationService);

  // Maximum properties to compare is strictly 2
  public readonly MAX_COMPARE_COUNT = 2;

  // Selected properties signal (max length 2)
  private readonly _selectedProperties = signal<Property[]>([]);
  public readonly selectedProperties = this._selectedProperties.asReadonly();

  // Modal open/close state
  public readonly isCompareModalOpen = signal<boolean>(false);

  // Toggle to show only different rows in specs matrix
  public readonly showOnlyDifferences = signal<boolean>(false);

  /**
   * Property 1 (Left column)
   */
  public readonly propertyLeft = computed<Property | null>(() => {
    const list = this._selectedProperties();
    return list.length > 0 ? list[0] : null;
  });

  /**
   * Property 2 (Right column)
   */
  public readonly propertyRight = computed<Property | null>(() => {
    const list = this._selectedProperties();
    return list.length > 1 ? list[1] : null;
  });

  /**
   * Computed Core Differences summary when 2 properties are compared
   */
  public readonly coreDifferences = computed<CoreDifferenceItem[]>(() => {
    const p1 = this.propertyLeft();
    const p2 = this.propertyRight();
    if (!p1 || !p2) return [];

    const diffs: CoreDifferenceItem[] = [];

    // 1. Total Price Difference
    const price1 = parseNumericPrice(p1.price);
    const price2 = parseNumericPrice(p2.price);
    if (price1 > 0 && price2 > 0 && price1 !== price2) {
      const diffAmount = Math.abs(price1 - price2);
      const formattedDiff = formatPriceLakhsOrCrores(diffAmount);
      if (price1 < price2) {
        const pct = Math.round((diffAmount / price2) * 100);
        diffs.push({
          type: 'price',
          title: 'Total Price Savings',
          summary: `Property 1 (Left) is ${formattedDiff} (${pct}%) lower in total purchase price.`,
          winnerIndex: 0,
          badgeText: `Saves ${formattedDiff}`,
          badgeType: 'advantage'
        });
      } else {
        const pct = Math.round((diffAmount / price1) * 100);
        diffs.push({
          type: 'price',
          title: 'Total Price Savings',
          summary: `Property 2 (Right) is ${formattedDiff} (${pct}%) lower in total purchase price.`,
          winnerIndex: 1,
          badgeText: `Saves ${formattedDiff}`,
          badgeType: 'advantage'
        });
      }
    }

    // 2. Price per Sq.Ft Rate Difference
    const rate1 = parseNumericRate(p1.pricePerSqFt);
    const rate2 = parseNumericRate(p2.pricePerSqFt);
    if (rate1 > 0 && rate2 > 0 && rate1 !== rate2) {
      const rateDiff = Math.abs(rate1 - rate2);
      if (rate1 < rate2) {
        diffs.push({
          type: 'rate',
          title: 'Economical Rate per Sq.Ft',
          summary: `Property 1 (Left) offers a better square foot rate by ₹${rateDiff.toLocaleString('en-IN')}/sq.ft.`,
          winnerIndex: 0,
          badgeText: `₹${rateDiff}/sq.ft Lower`,
          badgeType: 'advantage'
        });
      } else {
        diffs.push({
          type: 'rate',
          title: 'Economical Rate per Sq.Ft',
          summary: `Property 2 (Right) offers a better square foot rate by ₹${rateDiff.toLocaleString('en-IN')}/sq.ft.`,
          winnerIndex: 1,
          badgeText: `₹${rateDiff}/sq.ft Lower`,
          badgeType: 'advantage'
        });
      }
    }

    // 3. Road Width Access
    const road1 = p1.roadWidthFt || (p1.plotDetails?.frontageRoadWidth ? parseInt(p1.plotDetails.frontageRoadWidth, 10) : 0);
    const road2 = p2.roadWidthFt || (p2.plotDetails?.frontageRoadWidth ? parseInt(p2.plotDetails.frontageRoadWidth, 10) : 0);
    if (road1 > 0 && road2 > 0 && road1 !== road2) {
      const roadDiff = Math.abs(road1 - road2);
      if (road1 > road2) {
        diffs.push({
          type: 'road',
          title: 'Wider Approach Road',
          summary: `Property 1 (Left) has a wider access road: ${road1} ft vs ${road2} ft (+${roadDiff} ft wider).`,
          winnerIndex: 0,
          badgeText: `${road1} ft Road (+${roadDiff} ft)`,
          badgeType: 'advantage'
        });
      } else {
        diffs.push({
          type: 'road',
          title: 'Wider Approach Road',
          summary: `Property 2 (Right) has a wider access road: ${road2} ft vs ${road1} ft (+${roadDiff} ft wider).`,
          winnerIndex: 1,
          badgeText: `${road2} ft Road (+${roadDiff} ft)`,
          badgeType: 'advantage'
        });
      }
    }

    // 4. Patta Type & Legal Clearance
    const patta1 = (p1.pattaType || p1.plotDetails?.pattaStatus || '').toLowerCase();
    const patta2 = (p2.pattaType || p2.plotDetails?.pattaStatus || '').toLowerCase();
    if (patta1 !== patta2 && (patta1 || patta2)) {
      const isInd1 = patta1.includes('individual');
      const isInd2 = patta2.includes('individual');
      if (isInd1 && !isInd2) {
        diffs.push({
          type: 'approval',
          title: 'Patta Certification',
          summary: `Property 1 has Individual Patta (highest title security deed).`,
          winnerIndex: 0,
          badgeText: 'Individual Patta',
          badgeType: 'advantage'
        });
      } else if (isInd2 && !isInd1) {
        diffs.push({
          type: 'approval',
          title: 'Patta Certification',
          summary: `Property 2 has Individual Patta (highest title security deed).`,
          winnerIndex: 1,
          badgeText: 'Individual Patta',
          badgeType: 'advantage'
        });
      }
    }

    // 5. Approvals (DTCP / CMDA)
    const dtcp1 = (p1.dtcpApproved || '').toLowerCase();
    const dtcp2 = (p2.dtcpApproved || '').toLowerCase();
    const isApproved1 = dtcp1 === 'yes' || dtcp1.includes('approved') || !!p1.badges?.rera;
    const isApproved2 = dtcp2 === 'yes' || dtcp2.includes('approved') || !!p2.badges?.rera;
    if (isApproved1 !== isApproved2) {
      if (isApproved1) {
        diffs.push({
          type: 'approval',
          title: 'Statutory Approval',
          summary: `Property 1 has verified DTCP/CMDA/RERA statutory sanction.`,
          winnerIndex: 0,
          badgeText: 'DTCP/RERA Approved',
          badgeType: 'advantage'
        });
      } else {
        diffs.push({
          type: 'approval',
          title: 'Statutory Approval',
          summary: `Property 2 has verified DTCP/CMDA/RERA statutory sanction.`,
          winnerIndex: 1,
          badgeText: 'DTCP/RERA Approved',
          badgeType: 'advantage'
        });
      }
    }

    // 6. Land Extent / Plot Area
    const sqft1 = p1.plotSizeSqft || parseInt((p1.sqft || '').replace(/[^\d]/g, ''), 10) || 0;
    const sqft2 = p2.plotSizeSqft || parseInt((p2.sqft || '').replace(/[^\d]/g, ''), 10) || 0;
    if (sqft1 > 0 && sqft2 > 0 && Math.abs(sqft1 - sqft2) >= 50) {
      const areaDiff = Math.abs(sqft1 - sqft2);
      if (sqft1 > sqft2) {
        diffs.push({
          type: 'area',
          title: 'Larger Plot / Carpet Area',
          summary: `Property 1 is larger by ${areaDiff.toLocaleString('en-IN')} sq.ft (${sqft1} sq.ft vs ${sqft2} sq.ft).`,
          winnerIndex: 0,
          badgeText: `+${areaDiff} sq.ft More`,
          badgeType: 'advantage'
        });
      } else {
        diffs.push({
          type: 'area',
          title: 'Larger Plot / Carpet Area',
          summary: `Property 2 is larger by ${areaDiff.toLocaleString('en-IN')} sq.ft (${sqft2} sq.ft vs ${sqft1} sq.ft).`,
          winnerIndex: 1,
          badgeText: `+${areaDiff} sq.ft More`,
          badgeType: 'advantage'
        });
      }
    }



    // 8. Facing Orientation
    const facing1 = p1.facing || p1.facingOrView || '';
    const facing2 = p2.facing || p2.facingOrView || '';
    if (facing1 && facing2 && facing1.toLowerCase() !== facing2.toLowerCase()) {
      diffs.push({
        type: 'facing',
        title: 'Facing & Vastu Direction',
        summary: `Property 1 faces ${facing1}, while Property 2 faces ${facing2}.`,
        winnerIndex: null,
        badgeText: `${facing1} vs ${facing2}`,
        badgeType: 'info'
      });
    }

    return diffs;
  });

  /**
   * Computed full specifications matrix with side-by-side values and diff indicators
   */
  public readonly comparisonSpecs = computed<CompareSpecRow[]>(() => {
    const p1 = this.propertyLeft();
    const p2 = this.propertyRight();
    if (!p1 && !p2) return [];

    const rows: CompareSpecRow[] = [];

    const addRow = (
      category: CompareSpecRow['category'],
      label: string,
      icon: string,
      v1Raw: any,
      v2Raw: any,
      advIndex?: 0 | 1 | null,
      advNote?: string
    ) => {
      const str1 = v1Raw !== undefined && v1Raw !== null && v1Raw !== '' ? String(v1Raw).trim() : '—';
      const str2 = v2Raw !== undefined && v2Raw !== null && v2Raw !== '' ? String(v2Raw).trim() : '—';
      const isDiff = str1.toLowerCase() !== str2.toLowerCase();
      rows.push({
        category,
        label,
        icon,
        value1: str1,
        value2: str2,
        isDifferent: isDiff,
        advantageIndex: advIndex,
        advantageLabel: advNote
      });
    };

    // Financials
    const price1 = parseNumericPrice(p1?.price);
    const price2 = parseNumericPrice(p2?.price);
    let priceAdv: 0 | 1 | null = null;
    let priceAdvNote = '';
    if (price1 > 0 && price2 > 0 && price1 !== price2) {
      priceAdv = price1 < price2 ? 0 : 1;
      priceAdvNote = 'Lower Price';
    }
    addRow('Financials & Value', 'Total Price', 'payments', p1?.price, p2?.price, priceAdv, priceAdvNote);

    const rate1 = parseNumericRate(p1?.pricePerSqFt);
    const rate2 = parseNumericRate(p2?.pricePerSqFt);
    let rateAdv: 0 | 1 | null = null;
    let rateAdvNote = '';
    if (rate1 > 0 && rate2 > 0 && rate1 !== rate2) {
      rateAdv = rate1 < rate2 ? 0 : 1;
      rateAdvNote = 'Better Value';
    }
    addRow('Financials & Value', 'Rate / Sq.Ft', 'price_change', p1?.pricePerSqFt, p2?.pricePerSqFt, rateAdv, rateAdvNote);

    addRow('Financials & Value', 'Brokerage', 'percent', p1?.badges?.brokerage || '0% Direct', p2?.badges?.brokerage || '0% Direct');
    addRow('Financials & Value', 'Property Type', 'category', p1?.propertyType, p2?.propertyType);
    addRow('Financials & Value', 'Configuration', 'bed', p1?.bhkBadge, p2?.bhkBadge);

    // Land & Dimensions
    const sqft1 = p1?.plotSizeSqft || parseInt((p1?.sqft || '').replace(/[^\d]/g, ''), 10) || 0;
    const sqft2 = p2?.plotSizeSqft || parseInt((p2?.sqft || '').replace(/[^\d]/g, ''), 10) || 0;
    let areaAdv: 0 | 1 | null = null;
    if (sqft1 > 0 && sqft2 > 0 && sqft1 !== sqft2) {
      areaAdv = sqft1 > sqft2 ? 0 : 1;
    }
    addRow('Land & Dimensions', 'Plot / Area (Sq.Ft)', 'square_foot', p1?.sqft || (p1?.plotSizeSqft ? `${p1.plotSizeSqft} sq.ft` : ''), p2?.sqft || (p2?.plotSizeSqft ? `${p2.plotSizeSqft} sq.ft` : ''), areaAdv, 'Larger Area');
    
    addRow('Land & Dimensions', 'Land Extent (Cents)', 'straighten', p1?.plotSizeCents ? `${p1.plotSizeCents} Cents` : (p1?.masterDetails?.plotSizeCents ? `${p1.masterDetails.plotSizeCents} Cents` : ''), p2?.plotSizeCents ? `${p2.plotSizeCents} Cents` : (p2?.masterDetails?.plotSizeCents ? `${p2.masterDetails.plotSizeCents} Cents` : ''));

    const road1 = p1?.roadWidthFt || (p1?.plotDetails?.frontageRoadWidth ? parseInt(p1.plotDetails.frontageRoadWidth, 10) : 0);
    const road2 = p2?.roadWidthFt || (p2?.plotDetails?.frontageRoadWidth ? parseInt(p2.plotDetails.frontageRoadWidth, 10) : 0);
    let roadAdv: 0 | 1 | null = null;
    if (road1 > 0 && road2 > 0 && road1 !== road2) {
      roadAdv = road1 > road2 ? 0 : 1;
    }
    addRow('Land & Dimensions', 'Access Road Width', 'signpost', road1 ? `${road1} Feet` : '', road2 ? `${road2} Feet` : '', roadAdv, 'Wider Access');

    addRow('Land & Dimensions', 'Facing Direction', 'explore', p1?.facing || p1?.facingOrView, p2?.facing || p2?.facingOrView);

    // Legal & Approvals
    addRow('Legal & Approvals', 'Patta Classification', 'assignment', p1?.pattaType || p1?.plotDetails?.pattaStatus, p2?.pattaType || p2?.plotDetails?.pattaStatus);
    addRow('Legal & Approvals', 'DTCP / CMDA Sanction', 'verified', p1?.dtcpApproved || 'Sanctioned', p2?.dtcpApproved || 'Sanctioned');
    addRow('Legal & Approvals', 'Approval / Sanction No.', 'numbers', p1?.dtcpApprovalNo || p1?.plotDetails?.layoutSanctionNo, p2?.dtcpApprovalNo || p2?.plotDetails?.layoutSanctionNo);
    addRow('Legal & Approvals', 'RERA Registration', 'gavel', p1?.badges?.rera || p1?.plotDetails?.reraLayoutNo || 'Applicable', p2?.badges?.rera || p2?.plotDetails?.reraLayoutNo || 'Applicable');
    addRow('Legal & Approvals', 'Survey Cadastral Audit', 'fact_check', p1?.cadastralAudit?.surveyNumber ? `Survey #${p1.cadastralAudit.surveyNumber}` : 'Verified SRO Deed', p2?.cadastralAudit?.surveyNumber ? `Survey #${p2.cadastralAudit.surveyNumber}` : 'Verified SRO Deed');

    // Location & Accessibility
    addRow('Location & Accessibility', 'Locality / Area', 'location_city', p1?.locality, p2?.locality);
    addRow('Location & Accessibility', 'City / Taluk', 'apartment', `${p1?.city || ''} ${p1?.taluk ? '(' + p1.taluk + ')' : ''}`, `${p2?.city || ''} ${p2?.taluk ? '(' + p2.taluk + ')' : ''}`);
    addRow('Location & Accessibility', 'District & Corridor', 'domain', `${p1?.district || ''} ${p1?.corridor ? '· ' + p1.corridor : ''}`, `${p2?.district || ''} ${p2?.corridor ? '· ' + p2.corridor : ''}`);
    
    // Media & Verifications
    addRow('Media & Verifications', 'Photos & Blueprints', 'photo_library', `${p1?.freePhotos?.length || 4} Photos Available`, `${p2?.freePhotos?.length || 4} Photos Available`);
    addRow('Media & Verifications', 'Promoter / Developer', 'corporate_fare', p1?.developerName || p1?.masterDetails?.developer || p1?.developer?.name || 'Verified Promoter', p2?.developerName || p2?.masterDetails?.developer || p2?.developer?.name || 'Verified Promoter');

    return rows;
  });

  /**
   * Filtered rows according to showOnlyDifferences toggle
   */
  public readonly filteredComparisonSpecs = computed<CompareSpecRow[]>(() => {
    const all = this.comparisonSpecs();
    if (!this.showOnlyDifferences()) {
      return all;
    }
    return all.filter(r => r.isDifferent);
  });

  /**
   * Check if a property is already selected for comparison
   */
  isInCompare(propertyId: string): boolean {
    return this._selectedProperties().some(p => p.id === propertyId);
  }

  /**
   * Toggle comparison for a property:
   * - If already present: remove it
   * - If not present and length < 2: add it
   * - If not present and length >= 2: notify user of max 2 limit
   */
  toggleCompare(property: Property): void {
    const current = this._selectedProperties();
    const existingIndex = current.findIndex(p => p.id === property.id);

    if (existingIndex !== -1) {
      // Remove it
      this.removeProperty(property.id);
      this.notificationService.show({
        type: 'info',
        title: 'Removed from Compare',
        message: `"${property.title}" removed from comparison.`,
        icon: 'compare_arrows'
      });
      return;
    }

    if (current.length >= this.MAX_COMPARE_COUNT) {
      // Limit exceeded (max 2 properties)
      this.notificationService.show({
        type: 'warning',
        title: 'Compare Limit (Max 2)',
        message: 'You can compare a maximum of 2 properties at a time. Remove one from the compare dock to add this one.',
        icon: 'compare_arrows'
      });
      return;
    }

    // Add property
    const updated = [...current, property];
    this._selectedProperties.set(updated);

    if (updated.length === 1) {
      this.notificationService.show({
        type: 'info',
        title: 'Compare Slot 1 Filled',
        message: `Added "${property.title}". Select 1 more property to compare side-by-side.`,
        icon: 'compare_arrows'
      });
    } else if (updated.length === 2) {
      this.notificationService.show({
        type: 'success',
        title: 'Ready to Compare!',
        message: `2 properties selected. Click "Compare Side-by-Side" to view differences.`,
        icon: 'compare_arrows'
      });
    }
  }

  /**
   * Remove a specific property from comparison by ID
   */
  removeProperty(propertyId: string): void {
    const remaining = this._selectedProperties().filter(p => p.id !== propertyId);
    this._selectedProperties.set(remaining);

    if (remaining.length === 0 && this.isCompareModalOpen()) {
      this.closeCompare();
    }
  }

  /**
   * Clear all selected properties
   */
  clearAll(): void {
    this._selectedProperties.set([]);
    this.closeCompare();
    this.notificationService.show({
      type: 'info',
      title: 'Compare Cleared',
      message: 'All properties removed from comparison.',
      icon: 'delete'
    });
  }

  /**
   * Swap left and right properties
   */
  swapProperties(): void {
    const list = this._selectedProperties();
    if (list.length === 2) {
      this._selectedProperties.set([list[1], list[0]]);
    }
  }

  /**
   * Open compare modal
   */
  openCompare(): void {
    if (this._selectedProperties().length > 0) {
      this.isCompareModalOpen.set(true);
    } else {
      this.notificationService.show({
        type: 'info',
        title: 'No Properties Selected',
        message: 'Please pick up to 2 properties to compare.',
        icon: 'compare_arrows'
      });
    }
  }

  /**
   * Close compare modal
   */
  closeCompare(): void {
    this.isCompareModalOpen.set(false);
  }

  /**
   * Toggle "Show Only Differences" filter
   */
  toggleShowOnlyDifferences(): void {
    this.showOnlyDifferences.update(v => !v);
  }
}

