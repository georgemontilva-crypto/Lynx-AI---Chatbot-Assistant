import type { Express, Request, Response } from "express";
import { getPublishedBlogPosts } from "./db";

const BASE_URL = "https://lynxaiassistant.com";

// Static public pages with their priorities and change frequencies
const publicPages = [
  { url: "/",               priority: "1.0", changefreq: "weekly" },
  { url: "/pricing",        priority: "0.9", changefreq: "monthly" },
  { url: "/blog",           priority: "0.8", changefreq: "weekly" },
  { url: "/contact",        priority: "0.7", changefreq: "monthly" },
  { url: "/register",       priority: "0.9", changefreq: "monthly" },
  { url: "/login",          priority: "0.7", changefreq: "monthly" },
  { url: "/legal/terms",    priority: "0.3", changefreq: "yearly" },
  { url: "/legal/privacy",  priority: "0.3", changefreq: "yearly" },
  { url: "/legal/cookies",  priority: "0.3", changefreq: "yearly" },
  { url: "/legal/refunds",  priority: "0.3", changefreq: "yearly" },
];

export function registerSeoRoutes(app: Express) {
  // ── Sitemap XML (dynamic — includes blog posts) ──────────────────────────
  app.get("/sitemap.xml", async (_req: Request, res: Response) => {
    const lastmod = new Date().toISOString().split("T")[0];

    // Static pages
    const staticUrls = publicPages
      .map(
        (page) => `
  <url>
    <loc>${BASE_URL}${page.url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
      )
      .join("");

    // Dynamic blog posts
    let blogUrls = "";
    try {
      const posts = await getPublishedBlogPosts(200, 0);
      blogUrls = posts
        .map((post) => {
          const postDate = post.publishedAt
            ? new Date(post.publishedAt).toISOString().split("T")[0]
            : lastmod;
          return `
  <url>
    <loc>${BASE_URL}/blog/${post.slug}</loc>
    <lastmod>${postDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
        })
        .join("");
    } catch {
      // If DB is unavailable, just skip blog posts
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${staticUrls}${blogUrls}
</urlset>`;

    res.set("Content-Type", "application/xml; charset=utf-8");
    res.set("Cache-Control", "public, max-age=3600"); // 1h cache (blog updates weekly)
    res.send(xml);
  });

  // ── Robots.txt (dynamic, overrides static file in production) ──────────
  app.get("/robots.txt", (_req: Request, res: Response) => {
    const content = `User-agent: *
Allow: /
Disallow: /dashboard/
Disallow: /api/
Disallow: /test-payment

Sitemap: ${BASE_URL}/sitemap.xml

Crawl-delay: 10
`;
    res.set("Content-Type", "text/plain; charset=utf-8");
    res.set("Cache-Control", "public, max-age=86400");
    res.send(content);
  });
}
