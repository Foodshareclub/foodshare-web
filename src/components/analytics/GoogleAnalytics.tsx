'use client';

import Script from 'next/script';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export function GoogleAnalytics() {
    if (!GA_MEASUREMENT_ID) {
        return null;
    }

    return (
        <>
            <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
                strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
                {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            page_title: document.title,
            page_location: window.location.href,
          });
        `}
            </Script>
        </>
    );
}

/**
 * Track page views - call from useEffect in page components or layout
 */
export function trackPageView(url: string, title?: string) {
    if (!GA_MEASUREMENT_ID || typeof window === 'undefined') return;

    window.gtag?.('config', GA_MEASUREMENT_ID, {
        page_path: url,
        page_title: title || document.title,
    });
}

/**
 * Track custom events
 */
export function trackEvent(
    action: string,
    category: string,
    label?: string,
    value?: number
) {
    if (!GA_MEASUREMENT_ID || typeof window === 'undefined') return;

    window.gtag?.('event', action, {
        event_category: category,
        event_label: label,
        value: value,
    });
}

/**
 * Track Web Vitals to GA4
 */
export function trackWebVital(name: string, value: number, id: string, rating: string) {
    if (!GA_MEASUREMENT_ID || typeof window === 'undefined') return;

    window.gtag?.('event', name, {
        value: Math.round(name === 'CLS' ? value * 1000 : value),
        event_category: 'Web Vitals',
        event_label: id,
        metric_rating: rating,
        non_interaction: true,
    });
}

// Extend Window interface for gtag
declare global {
    interface Window {
        gtag?: (...args: unknown[]) => void;
        dataLayer?: unknown[];
    }
}
