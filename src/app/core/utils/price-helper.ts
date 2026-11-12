/**
 * Indian Currency & Real Estate Price Formatter
 * Converts numerical prices into human-readable Lakhs and Crores.
 * Displays clean starting price format: e.g. "Starting ₹ 47.70 L"
 */

export function parsePriceToNumber(priceStr: string | number | undefined | null): number {
  if (priceStr === undefined || priceStr === null || priceStr === '') return 0;
  if (typeof priceStr === 'number') return isNaN(priceStr) ? 0 : priceStr;

  const clean = String(priceStr).replace(/starting/gi, '').replace(/[₹,]/g, '').trim().toLowerCase();
  if (clean.includes('cr') || clean.includes('crore')) {
    const num = parseFloat(clean.replace(/cr|crore/g, '').trim());
    return isNaN(num) ? 0 : num * 10000000;
  }
  if (clean.includes('lakh') || clean.includes('lac') || clean.includes('l')) {
    const num = parseFloat(clean.replace(/lakh|lac|l/g, '').trim());
    return isNaN(num) ? 0 : num * 100000;
  }
  if (clean.includes('k')) {
    const num = parseFloat(clean.replace(/k/g, '').trim());
    return isNaN(num) ? 0 : num * 1000;
  }
  const direct = parseFloat(clean);
  return isNaN(direct) ? 0 : direct;
}

export function formatPriceIndian(price: string | number | undefined | null): string {
  if (price === undefined || price === null || price === '') return 'Price on Request';
  const str = String(price).trim();
  if (!str) return 'Price on Request';

  // If already formatted with Cr / Crore / Lakhs / Lakh / Lac / L
  if (/(?:cr|crore|lakh|lac|\bL\b)/i.test(str)) {
    if (/^starting\s+/i.test(str)) {
      const rest = str.replace(/^starting\s+/i, '').replace(/^[?₹]\s*/, '').trim();
      return `Starting ₹ ${rest}`;
    }
    const clean = str.replace(/^[?₹]\s*/, '').trim();
    return `Starting ₹ ${clean}`;
  }

  // Extract raw digits
  const cleanStr = str.replace(/starting/gi, '').replace(/[₹,\s]/g, '');
  const num = parseFloat(cleanStr);
  if (isNaN(num) || num <= 0) return str;

  // >= 1 Crore (10,000,000)
  if (num >= 10000000) {
    const cr = num / 10000000;
    const formatted = cr.toFixed(2).replace(/\.00$/, '');
    return `Starting ₹ ${formatted} Cr`;
  }

  // >= 1 Lakh (100,000)
  if (num >= 100000) {
    const lakhs = num / 100000;
    const formatted = lakhs.toFixed(2).replace(/\.00$/, '');
    return `Starting ₹ ${formatted} L`;
  }

    // Under 1 Lakh: If a sqft rate (e.g. 3200 - 8459) was accidentally passed directly as price,
    // compute the starting total price for an 800 sq.ft minimum plot so it never shows broken ₹ 6 / ₹ 4.2
    if (num >= 1000 && num < 100000) {
      const totalEst = num * 800;
      const lakhs = totalEst / 100000;
      const formatted = lakhs.toFixed(2).replace(/\.00$/, '');
      return `Starting ₹ ${formatted} L`;
    }

    return `₹ ${num.toLocaleString('en-IN')}`;
  }
