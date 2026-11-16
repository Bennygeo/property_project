import { Injectable } from '@angular/core';

export type ReraRegistrationType = 'Layout' | 'Building' | 'Project' | 'Regularisation' | 'Exempt' | 'UnderProcess' | 'Other';

export interface ReraValidationResult {
  isValid: boolean;
  canonicalRera: string;
  rawInput: string;
  stateCode: string;
  stateName: string;
  authority: string;
  registrationType: ReraRegistrationType;
  districtCode?: string;
  regNumber?: string;
  year?: number;
  message: string;
  warning?: string;
  badgeText: string;
  verificationPortalUrl?: string;
  isExemptOrUnderProcess: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ReraValidationService {

  // Official State RERA Authority metadata
  private readonly STATE_AUTHORITIES: Record<string, { name: string; authority: string; portalUrl: string }> = {
    TN: {
      name: 'Tamil Nadu',
      authority: 'Tamil Nadu Real Estate Regulatory Authority (TNRERA)',
      portalUrl: 'https://www.rera.tn.gov.in/registration_project_register.php'
    },
    KA: {
      name: 'Karnataka',
      authority: 'Karnataka Real Estate Regulatory Authority (K-RERA)',
      portalUrl: 'https://rera.karnataka.gov.in'
    },
    MH: {
      name: 'Maharashtra',
      authority: 'Maharashtra Real Estate Regulatory Authority (MahaRERA)',
      portalUrl: 'https://maharera.mahaonline.gov.in'
    },
    TS: {
      name: 'Telangana',
      authority: 'Telangana State Real Estate Regulatory Authority (TSRERA)',
      portalUrl: 'https://rerait.telangana.gov.in'
    },
    AP: {
      name: 'Andhra Pradesh',
      authority: 'Andhra Pradesh Real Estate Regulatory Authority (APRERA)',
      portalUrl: 'https://rera.ap.gov.in'
    },
    KL: {
      name: 'Kerala',
      authority: 'Kerala Real Estate Regulatory Authority (K-RERA)',
      portalUrl: 'https://rera.kerala.gov.in'
    }
  };

  /**
   * Cleans and auto-formats user input into canonical format.
   * e.g., "tn/29/layout/0123/2025" -> "TN/29/Layout/0123/2025"
   * e.g., "tnrera/29/building/811/2026" -> "TN/29/Building/0811/2026"
   */
  format(input: string): string {
    if (!input) return '';
    let cleaned = input.trim();

    // Standardize slashes and hyphens
    cleaned = cleaned.replace(/\\/g, '/').replace(/-+/g, '-').replace(/\s+/g, ' ');

    // Normalize TN prefix
    cleaned = cleaned.replace(/^TNRERA\//i, 'TN/')
                     .replace(/^TN-RERA\//i, 'TN/')
                     .replace(/^TNRERA\s+/i, 'TN/');

    // Normalize type segments
    cleaned = cleaned.replace(/\/layout\//i, '/Layout/')
                     .replace(/\/building\//i, '/Building/')
                     .replace(/\/project\//i, '/Project/')
                     .replace(/\/regularisation-layout\//i, '/Regularisation-Layout/')
                     .replace(/\/regularization-layout\//i, '/Regularisation-Layout/');

    // Uppercase state code if starting with 2 letters
    if (/^[a-zA-Z]{2}\//.test(cleaned)) {
      cleaned = cleaned.substring(0, 2).toUpperCase() + cleaned.substring(2);
    }

    return cleaned;
  }

  /**
   * Validates a RERA registration reference string.
   * Supports:
   * 1. TNRERA layout format: TN/{01-38}/Layout/{1-6 digits}/{2017-2030}
   * 2. TNRERA building format: TN/{01-38}/Building/{1-6 digits}/{2017-2030}
   * 3. TNRERA regularisation format: TN/{01-38}/Regularisation-Layout/{1-6 digits}/{2017-2030}
   * 4. TNRERA short: TNRERA/LAYOUT/{digits}/{year} or TNRERA/{digits}/{year}
   * 5. Other States: KA, MH, TS, AP, KL
   * 6. Valid exemptions / pending process (e.g., "Applied / Under Process", "CMDA / DTCP Sanctioned Pre-RERA")
   */
  validate(rawInput: string | undefined | null, propertyType?: string, required = false): ReraValidationResult {
    const raw = (rawInput || '').trim();

    // Handle Empty Input
    if (!raw) {
      if (required || this.isReraStrictlyRequired(propertyType)) {
        return {
          isValid: false,
          canonicalRera: '',
          rawInput: '',
          stateCode: 'TN',
          stateName: 'Tamil Nadu',
          authority: this.STATE_AUTHORITIES['TN'].authority,
          registrationType: 'Other',
          message: 'RERA Registration Number is required for statutory land marketing and buyer protection.',
          warning: 'Layouts and multi-unit buildings must possess statutory RERA sanction.',
          badgeText: 'RERA Required',
          isExemptOrUnderProcess: false
        };
      }
      return {
        isValid: true,
        canonicalRera: '',
        rawInput: '',
        stateCode: 'TN',
        stateName: 'Tamil Nadu',
        authority: this.STATE_AUTHORITIES['TN'].authority,
        registrationType: 'Other',
        message: 'No RERA number specified (Optional / Not Entered).',
        badgeText: 'Unspecified',
        isExemptOrUnderProcess: false
      };
    }

    const formatted = this.format(raw);

    // 1. Check for Legitimate Exemption / In-Progress Declarations
    const exemptMatch = this.checkExemptOrUnderProcess(formatted);
    if (exemptMatch) {
      return exemptMatch;
    }

    // 2. Validate Standard TNRERA Format
    // e.g. TN/29/Layout/0123/2025 or TN/01/Building/0811/2026 or TN/33/Regularisation-Layout/4521/2024
    const tnStandardRegex = /^TN\/(\d{1,2})\/(Layout|Building|Project|Regularisation-Layout|Regularization-Layout)\/(\d{1,6})\/(\d{4})$/i;
    const tnMatch = formatted.match(tnStandardRegex);

    if (tnMatch) {
      const distCode = tnMatch[1].padStart(2, '0');
      const rawType = tnMatch[2];
      const serial = tnMatch[3].padStart(4, '0');
      const year = parseInt(tnMatch[4], 10);

      const normalizedType = this.normalizeRegType(rawType);
      const canonical = `TN/${distCode}/${normalizedType}/${serial}/${year}`;

      const currentYear = new Date().getFullYear();
      if (year < 2017 || year > currentYear + 2) {
        return {
          isValid: false,
          canonicalRera: canonical,
          rawInput: raw,
          stateCode: 'TN',
          stateName: 'Tamil Nadu',
          authority: this.STATE_AUTHORITIES['TN'].authority,
          registrationType: normalizedType,
          districtCode: distCode,
          regNumber: serial,
          year,
          message: `Invalid registration year (${year}). RERA registrations in Tamil Nadu were enacted in 2017 (2017 - ${currentYear + 1}).`,
          badgeText: 'Invalid Year',
          verificationPortalUrl: this.STATE_AUTHORITIES['TN'].portalUrl,
          isExemptOrUnderProcess: false
        };
      }

      const distNum = parseInt(distCode, 10);
      if (distNum < 1 || distNum > 38) {
        return {
          isValid: false,
          canonicalRera: canonical,
          rawInput: raw,
          stateCode: 'TN',
          stateName: 'Tamil Nadu',
          authority: this.STATE_AUTHORITIES['TN'].authority,
          registrationType: normalizedType,
          districtCode: distCode,
          regNumber: serial,
          year,
          message: `District code ${distCode} is out of range. Tamil Nadu districts are numbered 01 to 38.`,
          badgeText: 'Invalid District',
          verificationPortalUrl: this.STATE_AUTHORITIES['TN'].portalUrl,
          isExemptOrUnderProcess: false
        };
      }

      return {
        isValid: true,
        canonicalRera: canonical,
        rawInput: raw,
        stateCode: 'TN',
        stateName: 'Tamil Nadu',
        authority: this.STATE_AUTHORITIES['TN'].authority,
        registrationType: normalizedType,
        districtCode: distCode,
        regNumber: serial,
        year,
        message: `Verified TNRERA ${normalizedType} registration format (${canonical}).`,
        badgeText: `TNRERA ${normalizedType} Registered`,
        verificationPortalUrl: this.STATE_AUTHORITIES['TN'].portalUrl,
        isExemptOrUnderProcess: false
      };
    }

    // 3. Check TNRERA Short / Legacy Pattern (e.g., TNRERA/LAYOUT/0123/2024 or TNRERA/123/2023)
    const tnShortRegex = /^(?:TN\/|TNRERA\/)?(?:(Layout|Building|Project)\/)?(\d{1,6})\/(\d{4})$/i;
    const tnShortMatch = formatted.match(tnShortRegex);
    if (tnShortMatch && (formatted.toUpperCase().startsWith('TN') || formatted.toUpperCase().includes('RERA'))) {
      const rawType = tnShortMatch[1] || (propertyType?.toLowerCase().includes('plot') ? 'Layout' : 'Building');
      const normalizedType = this.normalizeRegType(rawType);
      const serial = tnShortMatch[2].padStart(4, '0');
      const year = parseInt(tnShortMatch[3], 10);
      const canonical = `TN/29/${normalizedType}/${serial}/${year}`;

      return {
        isValid: true,
        canonicalRera: canonical,
        rawInput: raw,
        stateCode: 'TN',
        stateName: 'Tamil Nadu',
        authority: this.STATE_AUTHORITIES['TN'].authority,
        registrationType: normalizedType,
        regNumber: serial,
        year,
        message: `TNRERA format recognized. Standardized to canonical form: ${canonical}.`,
        badgeText: `TNRERA ${normalizedType} Approved`,
        verificationPortalUrl: this.STATE_AUTHORITIES['TN'].portalUrl,
        isExemptOrUnderProcess: false
      };
    }

    // 4. Check Karnataka K-RERA Format (e.g. PRM/KA/RERA/1251/310/PR/171015/000412 or KA-RERA/XXXX)
    if (/^(PRM\/KA\/RERA|KA-RERA|KA\/RERA)/i.test(formatted)) {
      return {
        isValid: true,
        canonicalRera: formatted.toUpperCase(),
        rawInput: raw,
        stateCode: 'KA',
        stateName: 'Karnataka',
        authority: this.STATE_AUTHORITIES['KA'].authority,
        registrationType: 'Project',
        message: `Recognized Karnataka K-RERA registered project reference.`,
        badgeText: 'K-RERA Registered',
        verificationPortalUrl: this.STATE_AUTHORITIES['KA'].portalUrl,
        isExemptOrUnderProcess: false
      };
    }

    // 5. Check Maharashtra MahaRERA (12-digit number starting with P5 e.g. P51800012345)
    if (/^P\d{11}$/i.test(formatted) || /^MAHARERA/i.test(formatted)) {
      return {
        isValid: true,
        canonicalRera: formatted.toUpperCase(),
        rawInput: raw,
        stateCode: 'MH',
        stateName: 'Maharashtra',
        authority: this.STATE_AUTHORITIES['MH'].authority,
        registrationType: 'Project',
        message: `Recognized Maharashtra MahaRERA project license number.`,
        badgeText: 'MahaRERA Registered',
        verificationPortalUrl: this.STATE_AUTHORITIES['MH'].portalUrl,
        isExemptOrUnderProcess: false
      };
    }

    // 6. Check Telangana / Andhra Pradesh RERA (e.g. P02400001234)
    if (/^(P024|P025|TSRERA|APRERA)/i.test(formatted)) {
      const state = formatted.toUpperCase().includes('TS') || formatted.startsWith('P024') ? 'TS' : 'AP';
      return {
        isValid: true,
        canonicalRera: formatted.toUpperCase(),
        rawInput: raw,
        stateCode: state,
        stateName: this.STATE_AUTHORITIES[state].name,
        authority: this.STATE_AUTHORITIES[state].authority,
        registrationType: 'Project',
        message: `Recognized ${this.STATE_AUTHORITIES[state].name} RERA project reference.`,
        badgeText: `${state}-RERA Registered`,
        verificationPortalUrl: this.STATE_AUTHORITIES[state].portalUrl,
        isExemptOrUnderProcess: false
      };
    }

    // 7. General format failure
    return {
      isValid: false,
      canonicalRera: formatted,
      rawInput: raw,
      stateCode: 'TN',
      stateName: 'Tamil Nadu',
      authority: this.STATE_AUTHORITIES['TN'].authority,
      registrationType: 'Other',
      message: `Invalid RERA format. Official TNRERA format is: TN/{DistrictCode}/{Layout|Building}/{RegNo}/{Year} (e.g. TN/29/Layout/0123/2025).`,
      warning: 'Please confirm the registered number from the official sanction deed or enter "Applied - Under Process" if pending.',
      badgeText: 'Invalid RERA Format',
      verificationPortalUrl: this.STATE_AUTHORITIES['TN'].portalUrl,
      isExemptOrUnderProcess: false
    };
  }

  /**
   * Identifies legitimate exemption claims or in-progress applications.
   */
  private checkExemptOrUnderProcess(input: string): ReraValidationResult | null {
    const lower = input.toLowerCase();

    // Applied / In Progress
    if (
      lower.includes('applied') ||
      lower.includes('under process') ||
      lower.includes('in progress') ||
      lower.includes('pending')
    ) {
      return {
        isValid: true,
        canonicalRera: 'Applied (Under Statutory Process)',
        rawInput: input,
        stateCode: 'TN',
        stateName: 'Tamil Nadu',
        authority: this.STATE_AUTHORITIES['TN'].authority,
        registrationType: 'UnderProcess',
        message: 'RERA application submitted and under statutory verification with authority.',
        warning: 'Marketing allowed subject to submission of receipt acknowledgment.',
        badgeText: 'RERA Under Process',
        verificationPortalUrl: this.STATE_AUTHORITIES['TN'].portalUrl,
        isExemptOrUnderProcess: true
      };
    }

    // Exemption (e.g. plot layout sanctioned prior to May 2017 or layout area < 500 sq.m / < 8 plots)
    if (
      lower.includes('exempt') ||
      lower.includes('pre-rera') ||
      lower.includes('regularised') ||
      lower.includes('sub-500') ||
      lower.includes('patta only')
    ) {
      return {
        isValid: true,
        canonicalRera: 'Exempted from RERA (Pre-2017 / Sub-threshold)',
        rawInput: input,
        stateCode: 'TN',
        stateName: 'Tamil Nadu',
        authority: this.STATE_AUTHORITIES['TN'].authority,
        registrationType: 'Exempt',
        message: 'Layout is legally exempt from RERA registration under Section 3(2) of the RERA Act (Pre-RERA sanction or < 500 sq.m / < 8 plots).',
        badgeText: 'RERA Exempt',
        isExemptOrUnderProcess: true
      };
    }

    return null;
  }

  /**
   * Helper to normalize registration type enum
   */
  private normalizeRegType(rawType: string): ReraRegistrationType {
    const t = (rawType || '').toLowerCase();
    if (t.includes('layout') && !t.includes('regularis') && !t.includes('regulariz')) return 'Layout';
    if (t.includes('building')) return 'Building';
    if (t.includes('regularis') || t.includes('regulariz')) return 'Regularisation';
    if (t.includes('project')) return 'Project';
    return 'Other';
  }

  /**
   * Returns whether RERA registration is strictly required by statutory law for this property category.
   */
  isReraStrictlyRequired(propertyType?: string): boolean {
    if (!propertyType) return false;
    const pt = propertyType.toLowerCase();
    // Gated layout plots, developer projects, apartments require RERA
    return pt.includes('plot') || pt.includes('apartment') || pt.includes('flat') || pt.includes('villa');
  }

  /**
   * Formats a quick sample RERA reference for placeholder guides.
   */
  getSampleRera(propertyType?: string, districtCode = '29'): string {
    const year = new Date().getFullYear();
    const isPlot = !propertyType || propertyType.toLowerCase().includes('plot');
    const type = isPlot ? 'Layout' : 'Building';
    return `TN/${districtCode}/${type}/0123/${year}`;
  }
}
