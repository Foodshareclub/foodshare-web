/**
 * JSON-LD Structured Data Helpers
 * Generate structured data for enhanced Google rich results
 * @see https://developers.google.com/search/docs/appearance/structured-data
 */

import { siteConfig } from "./metadata";

/**
 * Safely stringify JSON-LD to prevent XSS and DOM parsing issues
 * Escapes </script> tags and other problematic sequences
 */
export function safeJsonLdStringify(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

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
    sameAs: [`https://twitter.com/${siteConfig.twitterHandle.replace("@", "")}`],
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
 * Person structured data for user profiles
 * Enables rich profile cards in Google search results
 * @see https://developers.google.com/search/docs/appearance/structured-data/profile-page
 */
export function generatePersonJsonLd({
  id: _id,
  name,
  description,
  image,
  url,
  memberSince,
  sameAs,
}: {
  id: string;
  name: string;
  description?: string;
  image?: string;
  url: string;
  memberSince?: string;
  sameAs?: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": url,
    name,
    ...(description && { description: description.slice(0, 160) }),
    image: image || `${siteConfig.url}/default-avatar.png`,
    url,
    memberOf: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
    },
    ...(memberSince && { memberSince }),
    ...(sameAs && sameAs.length > 0 && { sameAs }),
  };
}

/**
 * Calculate aggregate rating from five_star/four_star counts
 * @param fiveStar - Count of 5-star reviews
 * @param fourStar - Count of 4-star reviews
 * @returns Aggregate rating object or null if no reviews
 */
export function calculateAggregateRating(
  fiveStar: number | null,
  fourStar: number | null
): { ratingValue: number; reviewCount: number } | null {
  const five = fiveStar || 0;
  const four = fourStar || 0;
  const totalReviews = five + four;

  if (totalReviews === 0) return null;

  // Weighted average: (5*five + 4*four) / total
  const ratingValue = (5 * five + 4 * four) / totalReviews;

  return {
    ratingValue: Math.round(ratingValue * 10) / 10,
    reviewCount: totalReviews,
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
  aggregateRating,
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
  aggregateRating?: { ratingValue: number; reviewCount: number };
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
    ...(aggregateRating &&
      aggregateRating.reviewCount > 0 && {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: aggregateRating.ratingValue.toFixed(1),
          reviewCount: aggregateRating.reviewCount.toString(),
          bestRating: "5",
          worstRating: "1",
        },
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
export function generateBreadcrumbJsonLd(items: { name: string; url: string }[]) {
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
export function generateFAQJsonLd(faqs: { question: string; answer: string }[]) {
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
 * @param rating - Optional dynamic rating data (defaults to 4.8/100 if not provided)
 */
export function generateSoftwareApplicationJsonLd(rating?: {
  ratingValue: string;
  ratingCount: string;
}) {
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
      ratingValue: rating?.ratingValue || "4.8",
      ratingCount: rating?.ratingCount || "100",
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
  location: _location,
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

/**
 * Recipe structured data for food items
 * Enables rich recipe cards in Google search and AI answers
 * @see https://developers.google.com/search/docs/appearance/structured-data/recipe
 */
export function generateRecipeJsonLd({
  id,
  name,
  description,
  image,
  authorName,
  authorUrl,
  prepTime,
  ingredients,
  instructions,
  category,
  cuisine,
  nutrition,
  datePublished,
}: {
  id: number;
  name: string;
  description: string;
  image?: string;
  authorName?: string;
  authorUrl?: string;
  prepTime?: string;
  ingredients?: string[];
  instructions?: string[];
  category?: string;
  cuisine?: string;
  nutrition?: { calories?: string };
  datePublished?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Recipe",
    "@id": `${siteConfig.url}/food/${id}#recipe`,
    name,
    description: description.slice(0, 300),
    image: image || siteConfig.ogImage,
    author: {
      "@type": "Person",
      name: authorName || "FoodShare Community",
      ...(authorUrl && { url: authorUrl }),
    },
    datePublished: datePublished || new Date().toISOString(),
    prepTime: prepTime || "PT5M",
    recipeCategory: category || "Shared Food",
    recipeCuisine: cuisine || "Various",
    recipeIngredient: ingredients || [description.slice(0, 100)],
    recipeInstructions: (instructions || ["Contact the sharer to arrange pickup"]).map(
      (text, index) => ({
        "@type": "HowToStep",
        position: index + 1,
        text,
      })
    ),
    ...(nutrition?.calories && {
      nutrition: {
        "@type": "NutritionInformation",
        calories: nutrition.calories,
      },
    }),
  };
}

/**
 * HowTo structured data for guide and help pages
 * Enables step-by-step rich results and voice search answers
 * @see https://developers.google.com/search/docs/appearance/structured-data/how-to
 */
export function generateHowToJsonLd({
  name,
  description,
  steps,
  totalTime,
  image,
  url,
}: {
  name: string;
  description: string;
  steps: { name: string; text: string; image?: string; url?: string }[];
  totalTime?: string;
  image?: string;
  url?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    image: image || siteConfig.ogImage,
    totalTime: totalTime || "PT10M",
    ...(url && { url }),
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
      ...(step.image && { image: step.image }),
      ...(step.url && { url: step.url }),
    })),
  };
}

/**
 * SpeakableSpecification structured data for voice search optimization
 * Indicates which content is suitable for text-to-speech by voice assistants
 * @see https://developers.google.com/search/docs/appearance/structured-data/speakable
 */
export function generateSpeakableJsonLd({
  url,
  cssSelector,
  headline,
  datePublished,
}: {
  url: string;
  cssSelector: string[];
  headline?: string;
  datePublished?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    url,
    ...(headline && { headline }),
    ...(datePublished && { datePublished }),
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector,
    },
  };
}

/**
 * OfferCatalog structured data for category listing pages
 * Enables rich product collection results in search
 * @see https://developers.google.com/search/docs/appearance/structured-data/product
 */
export function generateOfferCatalogJsonLd({
  name,
  description,
  url,
  itemCount,
  category,
}: {
  name: string;
  description: string;
  url: string;
  itemCount: number;
  category?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "OfferCatalog",
    name,
    description,
    url,
    numberOfItems: itemCount,
    ...(category && { category }),
    itemListElement: {
      "@type": "AggregateOffer",
      lowPrice: "0",
      highPrice: "0",
      priceCurrency: "USD",
      offerCount: itemCount,
      availability: "https://schema.org/InStock",
    },
  };
}
