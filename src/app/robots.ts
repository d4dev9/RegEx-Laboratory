import type { MetadataRoute } from "next";

const DISALLOWED = ["/api/", "/auth/", "/signin"];

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOWED,
      },
    ],
    ...(base ? { sitemap: `${base}/sitemap.xml` } : {}),
  };
}