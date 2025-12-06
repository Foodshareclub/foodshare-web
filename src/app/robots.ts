import { MetadataRoute } from "next";
import { siteConfig } from "@/lib/metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/food", "/map", "/food/", "/forum", "/forum/"],
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
        ],
      },
      {
        userAgent: "Googlebot",
        allow: ["/", "/food", "/map", "/food/", "/profile/", "/forum", "/forum/"],
        disallow: [
          "/api/",
          "/admin/",
          "/profile/edit",
          "/settings/",
          "/auth/",
          "/food/new",
          "/food/*/edit",
          "/forum/new",
        ],
      },
    ],
    sitemap: [
      `${siteConfig.url}/sitemap.xml`,
      `${siteConfig.url}/forum/feed.xml`,
    ],
  };
}
