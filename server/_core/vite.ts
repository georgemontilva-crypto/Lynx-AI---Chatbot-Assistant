import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import superjson from "superjson";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";
import { buildSsrPrefetch } from "./ssrCaller";
import type { HeadMeta } from "../../client/src/ssr/prefetch";

// ── Canonical origin & site name (set via env vars in production) ──────────
const CANONICAL_ORIGIN = process.env.CANONICAL_ORIGIN ?? "https://lynxaiassistant.com";
const SITE_NAME = process.env.SITE_NAME ?? "Lynx AI";
const OG_LOCALE = process.env.OG_LOCALE ?? "es_ES";

if (process.env.NODE_ENV === "production" && (!CANONICAL_ORIGIN || !SITE_NAME)) {
  if (!CANONICAL_ORIGIN)
    console.warn("[SSR] CANONICAL_ORIGIN is not set — canonical/og:url tags will be omitted");
  if (!SITE_NAME)
    console.warn("[SSR] SITE_NAME is not set — og:site_name will be omitted");
}

// ── HTML escaping ──────────────────────────────────────────────────────────
const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const clampText = (s: string, max: number) => {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.lastIndexOf(" ", max);
  if (cut > max * 0.6) return t.slice(0, cut) + "…";
  return Array.from(t).slice(0, max).join("") + "…";
};

const metaText = (s: string, max: number) =>
  clampText(s.replace(/[#*_`~]+/g, ""), max);

// ── Build <head> tags from HeadMeta ───────────────────────────────────────
function buildHeadTags(head: HeadMeta): string {
  const title = escapeHtml(clampText(head.title, 70) || SITE_NAME);
  const desc = escapeHtml(metaText(head.description, 200));
  const url =
    head.canonicalPath && CANONICAL_ORIGIN
      ? escapeHtml(CANONICAL_ORIGIN + head.canonicalPath)
      : "";
  // Absolutize relative /manus-storage/... og:image URLs
  const img = head.ogImage?.startsWith("//")
    ? "https:" + head.ogImage
    : head.ogImage?.startsWith("/")
      ? CANONICAL_ORIGIN
        ? CANONICAL_ORIGIN + head.ogImage
        : undefined
      : head.ogImage;

  const tags = [
    `<title>${title}</title>`,
    `<meta name="description" content="${desc}" />`,
    `<meta property="og:type" content="${head.ogType ?? "website"}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${desc}" />`,
    `<meta property="og:locale" content="${escapeHtml(head.locale ?? OG_LOCALE)}" />`,
    `<meta name="twitter:card" content="${img ? "summary_large_image" : "summary"}" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${desc}" />`,
  ];

  if (SITE_NAME) tags.push(`<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />`);

  if (img) {
    tags.push(`<meta property="og:image" content="${escapeHtml(img)}" />`);
    tags.push(`<meta name="twitter:image" content="${escapeHtml(img)}" />`);
    if (head.ogImageWidth) tags.push(`<meta property="og:image:width" content="${head.ogImageWidth}" />`);
    if (head.ogImageHeight) tags.push(`<meta property="og:image:height" content="${head.ogImageHeight}" />`);
    if (head.ogImageAlt) tags.push(`<meta property="og:image:alt" content="${escapeHtml(head.ogImageAlt)}" />`);
  }

  if (head.ogType === "article") {
    if (head.publishedTime)
      tags.push(`<meta property="article:published_time" content="${escapeHtml(head.publishedTime)}" />`);
    if (head.modifiedTime)
      tags.push(`<meta property="article:modified_time" content="${escapeHtml(head.modifiedTime)}" />`);
  }

  if (url) {
    tags.push(`<meta property="og:url" content="${url}" />`);
    tags.push(`<link rel="canonical" href="${url}" />`);
  }

  if (head.notFound || head.noindex) {
    tags.push(`<meta name="robots" content="noindex, follow" />`);
  } else {
    tags.push(`<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />`);
  }

  return tags.join("\n    ");
}

// ── Compose final HTML ─────────────────────────────────────────────────────
// ── Lynx widget on Lynx's own site (dogfooding) ─────────────────────────────
// When SITE_WIDGET_API_KEY is set, the chat bubble appears on every PUBLIC
// page of this site, powered by that chatbot — so the owner can train it in
// /dashboard/training and see the result live on the landing.
//
// If SITE_WIDGET_API_KEY is NOT set, we fall back to the admin's own chatbot
// so the owner just personalizes it in Chatbot Config and it shows up here.
// The lookup is async (DB), so we cache the resolved key in memory and refresh
// it periodically, keeping siteWidgetTag() synchronous.
let _cachedSiteKey: string | null = null;
let _cachedSiteKeyAt = 0;
const SITE_KEY_TTL_MS = 5 * 60 * 1000;

async function refreshSiteKey(): Promise<void> {
  try {
    const { getSiteChatbotApiKey } = await import("../db");
    _cachedSiteKey = await getSiteChatbotApiKey();
    _cachedSiteKeyAt = Date.now();
  } catch {
    // keep whatever we had
  }
}

function siteWidgetTag(url: string): string {
  // Never on the app itself — only on public marketing pages
  if (url.startsWith("/dashboard") || url.startsWith("/login") || url.startsWith("/register") || url.startsWith("/api")) return "";
  // Kick off a refresh if the cache is stale (fire-and-forget; this render uses
  // the current cached value, the next render gets the fresh one).
  if (Date.now() - _cachedSiteKeyAt > SITE_KEY_TTL_MS) void refreshSiteKey();
  const key = _cachedSiteKey || process.env.SITE_WIDGET_API_KEY;
  if (!key) return "";
  return `<script src="/api/widget.js" data-api-key="${key.replace(/"/g, "")}" defer></script>`;
}

function composeHtml(
  template: string,
  appHtml: string,
  head: HeadMeta,
  dehydratedState: unknown,
  url = ""
): string {
  const esc = (s: string) => s.replace(/</g, "\\u003c");
  const headTags = buildHeadTags(head);
  const stateScript = `<script>window.__RQ_STATE__ = ${esc(JSON.stringify(superjson.serialize(dehydratedState)))}</script>${siteWidgetTag(url)}`;
  // Inject state BEFORE appHtml (app content may contain literal "</body>")
  return template
    .replace("</body>", () => `${stateScript}</body>`)
    .replace("<!--app-head-->", () => headTags)
    .replace("<!--app-html-->", () => appHtml);
}

// ── Dev server (Vite middleware mode) ─────────────────────────────────────
export async function setupVite(app: Express, server: Server) {
  void refreshSiteKey(); // warm the site-widget key cache on boot
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      // Retarget the nanoid cache-buster to the new entry point
      template = template.replace(
        `src="/src/entry-client.tsx"`,
        `src="/src/entry-client.tsx?v=${nanoid()}"`
      );
      // transformIndexHtml applies %VITE_*% env replacement and lets plugins
      // inject their scripts (debug collector, manus-runtime) — required.
      template = await vite.transformIndexHtml(url, template);
      // Dev-only blocking CSS so the SSR'd first paint is styled
      template = template.replace(
        "</head>",
        `<link rel="stylesheet" href="/src/index.css?direct" data-ssr-dev-css></head>`
      );

      const { render } = await vite.ssrLoadModule("/src/entry-server.tsx");
      const prefetch = await buildSsrPrefetch(req, res);
      const { html, dehydratedState, head } = await render(url, prefetch);

      res
        .status(head.notFound ? 404 : 200)
        .set("Cache-Control", "no-cache")
        .type("html")
        .end(composeHtml(template, html, head, dehydratedState, url));
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      console.error("[SSR] dev render failed:", e);
      next(e); // surface the error (Vite overlay) instead of hiding it
    }
  });
}

// ── Production static serving ──────────────────────────────────────────────
export function serveStatic(app: Express) {
  void refreshSiteKey(); // warm the site-widget key cache on boot
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  // Redirect /index.html → / so the raw template is never served
  app.use((req, res, next) => {
    if (req.path === "/index.html") return res.redirect(301, "/");
    // 301-normalize trailing slashes (prevents duplicate-content indexing)
    if (req.path !== "/" && /\/+$/.test(req.path)) {
      const query = req.originalUrl.slice(req.path.length);
      const target = (req.path.replace(/\/+$/, "") || "/").replace(/^\/\/+/, "/");
      return res.redirect(301, target + query);
    }
    next();
  });

  // Static assets with long-term caching (Vite hashes JS/CSS names)
  // redirect:false is REQUIRED — serve-static's default directory 301 would
  // ping-pong with the trailing-slash 301 above into an infinite loop.
  app.use(
    express.static(distPath, {
      index: false,
      redirect: false,
      maxAge: "1y",
      etag: true,
      lastModified: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        }
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("X-Frame-Options", "SAMEORIGIN");
        res.setHeader("X-XSS-Protection", "1; mode=block");
        res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
      },
    })
  );

  const templatePath = path.resolve(distPath, "index.html");
  const serverEntryPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "server-ssr", "entry-server.js")
      : path.resolve(import.meta.dirname, "server-ssr", "entry-server.js");

  // SSR catch-all: every HTML request goes through renderToString
  app.use("*", async (req, res) => {
    try {
      const template = await fs.promises.readFile(templatePath, "utf-8");
      // Dynamic import keeps the path unbundled (esbuild leaves variable-path
      // imports alone) so the SSR bundle is loaded at runtime, not build time.
      const { render } = await import(serverEntryPath);
      const prefetch = await buildSsrPrefetch(req, res);
      const { html, dehydratedState, head } = await render(req.originalUrl, prefetch);
      res
        .status(head.notFound ? 404 : 200)
        .set("Cache-Control", "no-cache")
        .type("html")
        .end(composeHtml(template, html, head, dehydratedState, req.originalUrl));
    } catch (e) {
      // Alert on this log line in monitoring: invisible to human QA but
      // crawlers get a degraded page (no title/description/canonical).
      console.error("[SSR] render failed, serving shell:", e);
      try {
        const template = await fs.promises.readFile(templatePath, "utf-8");
        const fallbackHead = buildHeadTags({
          title: SITE_NAME,
          description:
            "Lynx AI escanea tu sitio web, aprende tu contenido y atiende a tus visitantes 24/7.",
        });
        res
          .status(200)
          .set("Cache-Control", "no-cache")
          .type("html")
          .end(
            template
              .replace("<!--app-head-->", () => fallbackHead)
              .replace("<!--app-html-->", () => "")
          );
      } catch {
        res.status(500).send("Internal Server Error");
      }
    }
  });
}
