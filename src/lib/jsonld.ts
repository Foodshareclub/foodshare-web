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
