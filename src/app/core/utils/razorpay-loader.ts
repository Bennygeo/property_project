/**
 * Utility to dynamically load the official Razorpay Checkout SDK on-demand.
 * This prevents blocking initial page render and saves ~1.4s on initial FCP.
 */
export function loadRazorpaySdk(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return Promise.resolve(false);
  }

  // Already available in global scope
  if ((window as any).Razorpay) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const existing = document.querySelector('script[src*="checkout.razorpay.com"]') as HTMLScriptElement;
    if (existing) {
      if ((window as any).Razorpay) {
        resolve(true);
      } else {
        existing.addEventListener('load', () => resolve(true), { once: true });
        existing.addEventListener('error', () => resolve(false), { once: true });
      }
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn('[RazorpayLoader] Failed to download Razorpay checkout SDK');
      resolve(false);
    };

    document.head.appendChild(script);
  });
}
