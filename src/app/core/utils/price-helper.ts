/**
 * Indian Currency & Real Estate Price Formatter
 * Converts numerical prices into human-readable Lakhs and Crores.
 * e.g. "3,896,000" or 3896000 -> "₹ 38.96 Lakhs"
 * e.g. "15,000,000" or 15000000 -> "₹ 1.50 Cr"
 * e.g. "₹5.40 Cr" -> "₹ 5.40 Cr" (already formatted, preserved cleanly)
 */

export function parsePriceToNumber(priceStr: string | number | undefined | null): number {
  if (priceStr === undefined || priceStr === null || priceStr === '') return 0;
  if (typeof priceStr === 'number') return isNaN(priceStr) ? 0 : priceStr;

  const clean = String(priceStr).replace(/[₹,]/g, '').trim().toLowerCase();
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

  // If already formatted with Cr / Crore / Lakhs / Lakh / Lac / L, standardize ₹ prefix
  if (/(?:cr|crore|lakh|lac|\bL\b)/i.test(str)) {
    const clean = str.replace(/^[?₹]\s*/, '').trim();
    return `₹ ${clean}`;
  }

  // Extract raw digits
  const cleanStr = str.replace(/[₹,\s]/g, '');
  const num = parseFloat(cleanStr);
  if (isNaN(num) || num <= 0) return str;

  // >= 1 Crore (10,000,000)
  if (num >= 10000000) {
    const cr = num / 10000000;
    const formatted = cr.toFixed(2).replace(/\.00$/, '');
    return `₹ ${formatted} Cr`;
  }

  // >= 1 Lakh (100,000)
  if (num >= 100000) {
    const lakhs = num / 100000;
    const formatted = lakhs.toFixed(2).replace(/\.00$/, '');
    return `₹ ${formatted} Lakhs`;
  }

  // >= 1 Thousand (1,000)
  if (num >= 1000) {
    const k = num / 1000;
    const formatted = k.toFixed(1).replace(/\.0$/, '');
    return `₹ ${formatted} K`;
  }

  return `₹ ${num.toLocaleString('en-IN')}`;
}

