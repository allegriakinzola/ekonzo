import type { MetadataRoute } from "next";

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  process.env.BETTER_AUTH_URL?.replace(/\/$/, "") ||
  "https://ekonzo.cd";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/dashboard", "/kyc", "/portfolio", "/profile", "/products"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
