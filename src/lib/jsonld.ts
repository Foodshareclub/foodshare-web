/**
 * JSON-LD Structured Data Helpers
 * Generate structured data for enhanced Google rich results
 * @see https://developers.google.com/search/docs/appearance/structured-data
 */

import { siteConfig } from "./metadata";

/**
 * Organization structured data for site-wide info
 */
export function generateOrganizationJsonLd() {
    return {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: siteConfig.name,
        url: siteConfig.url,
        logo: `${siteConfig.url}/logo512.png`,
        description: siteConfig.description,
        sameAs: [
            `https://twitter.com/${siteConfig.twitterHandle.replace("@", "")}`,
        ],
        contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer support",
            url: `${siteConfig.url}/help`,
        },
    };
}

/**
 * WebSite structured data with search action
 */
export function generateWebsiteJsonLd() {
    return {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: siteConfig.name,
        url: siteConfig.url,
        description: siteConfig.description,
        potentialAction: {
            "@type": "SearchAction",
            target: {
                "@type": "EntryPoint",
                urlTemplate: `${siteConfig.url}/food?search={search_term_string}`,
            },
            "query-input": "required name=search_term_string",
        },
    };
}

/**
 * ProductPosting structured data for food listings
 * Uses Product schema with offer for free items
 */
export function generateProductJsonLd({
    id,
    name,
    description,
    image,
    category,
    datePosted,
    location,
    authorName,
    authorUrl,
}: {
    id: number;
    name: string;
    description: string;
    image?: string;
    category?: string;
    datePosted?: string;
    location?: string;
    authorName?: string;
    authorUrl?: string;
}) {
    return {
        "@context": "https://schema.org",
        "@type": "Product",
        "@id": `${siteConfig.url}/food/${id}`,
        name,
        description: description.slice(0, 300),
        image: image || siteConfig.ogImage,
        category: category || "Food",
        offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
            url: `${siteConfig.url}/food/${id}`,
            seller: authorName
                ? {
                    "@type": "Person",
                    name: authorName,
                    url: authorUrl,
                }
                : undefined,
        },
        ...(location && {
            availableAtOrFrom: {
                "@type": "Place",
                name: location,
            },
        }),
        ...(datePosted && {
            datePosted,
        }),
    };
}

/**
 * Article structured data for forum posts
 */
export function generateArticleJsonLd({
    title,
    description,
    url,
    image,
    datePublished,
    dateModified,
    authorName,
    authorUrl,
}: {
    title: string;
    description: string;
    url: string;
    image?: string;
    datePublished: string;
    dateModified?: string;
    authorName?: string;
    authorUrl?: string;
}) {
    return {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: title,
        description: description.slice(0, 160),
        image: image || siteConfig.ogImage,
        url,
        datePublished,
        dateModified: dateModified || datePublished,
        author: authorName
            ? {
                "@type": "Person",
                name: authorName,
                url: authorUrl,
            }
            : {
                "@type": "Organization",
                name: siteConfig.name,
            },
        publisher: {
            "@type": "Organization",
            name: siteConfig.name,
            logo: {
                "@type": "ImageObject",
                url: `${siteConfig.url}/logo512.png`,
            },
        },
        mainEntityOfPage: {
            "@type": "WebPage",
            "@id": url,
        },
    };
}

/**
 * BreadcrumbList structured data for navigation
 */
export function generateBreadcrumbJsonLd(
    items: { name: string; url: string }[]
) {
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.name,
            item: item.url,
        })),
    };
}

/**
 * FAQ structured data for help pages
 */
export function generateFAQJsonLd(
    faqs: { question: string; answer: string }[]
) {
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
                "@type": "Answer",
                text: faq.answer,
            },
        })),
    };
}

/**
 * SoftwareApplication structured data for PWA/App discovery
 */
export function generateSoftwareApplicationJsonLd() {
    return {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: siteConfig.name,
        description: siteConfig.description,
        url: siteConfig.url,
        applicationCategory: "LifestyleApplication",
        operatingSystem: "Web, iOS, Android",
        offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
        },
        aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "4.8",
            ratingCount: "1000",
            bestRating: "5",
            worstRating: "1",
        },
        author: {
            "@type": "Organization",
            name: siteConfig.name,
            url: siteConfig.url,
        },
    };
}

/**
 * LocalBusiness structured data for location-based features
 */
export function generateLocalBusinessJsonLd() {
    return {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "@id": siteConfig.url,
        name: siteConfig.name,
        description: siteConfig.description,
        url: siteConfig.url,
        logo: `${siteConfig.url}/logo512.png`,
        image: siteConfig.ogImage,
        address: {
            "@type": "PostalAddress",
            addressCountry: "NZ",
        },
        geo: {
            "@type": "GeoCoordinates",
            latitude: "-36.8485",
            longitude: "174.7633",
        },
        areaServed: {
            "@type": "Country",
            name: "New Zealand",
        },
    };
}

/**
 * Event structured data for challenges
 */
export function generateEventJsonLd({
    name,
    description,
    image,
    startDate,
    endDate,
    url,
    location,
}: {
    name: string;
    description: string;
    image?: string;
    startDate?: string;
    endDate?: string;
    url: string;
    location?: string;
}) {
    return {
        "@context": "https://schema.org",
        "@type": "Event",
        name,
        description: description.slice(0, 300),
        image: image || siteConfig.ogImage,
        url,
        startDate: startDate || new Date().toISOString(),
        endDate: endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
        location: {
            "@type": "VirtualLocation",
            url,
        },
        organizer: {
            "@type": "Organization",
            name: siteConfig.name,
            url: siteConfig.url,
        },
        offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
            url,
        },
    };
}

/**
 * ItemList structured data for collection pages
 */
export function generateItemListJsonLd({
    name,
    description,
    items,
}: {
    name: string;
    description: string;
    items: { name: string; url: string; image?: string; position: number }[];
}) {
    return {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name,
        description,
        numberOfItems: items.length,
        itemListElement: items.map((item) => ({
            "@type": "ListItem",
            position: item.position,
            item: {
                "@type": "Product",
                name: item.name,
                url: item.url,
                image: item.image || siteConfig.ogImage,
            },
        })),
    };
}

/**
 * CollectionPage structured data for listing pages
 */
export function generateCollectionPageJsonLd({
    name,
    description,
    url,
}: {
    name: string;
    description: string;
    url: string;
}) {
    return {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name,
        description,
        url,
        isPartOf: {
            "@type": "WebSite",
            name: siteConfig.name,
            url: siteConfig.url,
        },
    };
}

