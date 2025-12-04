import { MetadataRoute } from "next";
import { siteConfig } from "@/lib/metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/food", "/map", "/food/"],
        disallow: [
          "/api/",
          "/admin/",
          "/profile/edit",
          "/settings/",
          "/auth/",
          "/_next/",
          "/food/new",
          "/food/*/edit",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: ["/", "/food", "/map", "/food/", "/profile/"],
        disallow: [
          "/api/",
          "/admin/",
          "/profile/edit",
          "/settings/",
          "/auth/",
          "/food/new",
          "/food/*/edit",
        ],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
