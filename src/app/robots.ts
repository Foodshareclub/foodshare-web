import { MetadataRoute } from "next";
import { siteConfig } from "@/lib/metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/food", "/map", "/food/", "/forum", "/forum/", "/challenge", "/help", "/terms", "/privacy"],
        disallow: [
          "/api/",
          "/admin/",
          "/profile/edit",
          "/settings/",
          "/auth/",
          "/_next/",
          "/food/new",
          "/food/*/edit",
          "/forum/new",
          "/chat",
          "/user-listings",
          "/maintenance",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: ["/", "/food", "/map", "/food/", "/profile/", "/forum", "/forum/", "/challenge"],
        disallow: [
          "/api/",
          "/admin/",
          "/profile/edit",
          "/settings/",
          "/auth/",
          "/food/new",
          "/food/*/edit",
          "/forum/new",
          "/chat",
          "/user-listings",
        ],
      },
      // Social media crawlers - allow all public content
      {
        userAgent: "Twitterbot",
        allow: ["/"],
      },
      {
        userAgent: "facebookexternalhit",
        allow: ["/"],
      },
      {
        userAgent: "LinkedInBot",
        allow: ["/"],
      },
      {
        userAgent: "WhatsApp",
        allow: ["/"],
      },
      {
        userAgent: "TelegramBot",
        allow: ["/"],
      },
      // AI crawlers - restrict access
      {
        userAgent: "GPTBot",
        disallow: ["/"],
      },
      {
        userAgent: "ChatGPT-User",
        disallow: ["/"],
      },
      {
        userAgent: "CCBot",
        disallow: ["/"],
      },
      {
        userAgent: "anthropic-ai",
        disallow: ["/"],
      },
    ],
    sitemap: [
      `${siteConfig.url}/sitemap.xml`,
      `${siteConfig.url}/forum/feed.xml`,
    ],
    host: siteConfig.url,
  };
}
