import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { safeFetchText } from "./_core/ssrfGuard";
import { checkTestChatRateLimit } from "./_core/testChatRateLimit";
import { notifyOwner } from "./_core/notification";
import {
  getChatbotByUserId,
  upsertChatbot,
  updateChatbotSiteContext,
  ensureChatbotApiKey,
  saveSeoReport,
  getLatestSeoReport,
  saveConversation,
  getConversationsByChatbot,
  saveNotification,
  getNotificationsByUser,
  markNotificationRead,
  PLAN_LIMITS,
  usageOf,
  getAllUsers,
  updateUserPlan,
  toggleUserBan,
  updateUserRole,
  getAdminStats,
  getWeeklyAnalytics,
  getClicksByPage,
  getOnboardingProgress,
  upsertOnboardingProgress,
  updateUserName,
  getDb,
  getPublishedBlogPosts,
  getBlogPostBySlug,
  getAllBlogPostsAdmin,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  publishBlogPost,
  countPublishedBlogPosts,
} from "./db";
import { conversations, clients, chatbots, analyticsEvents, seoHistory, webSetupRequests, siteSettings } from "../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { randomBytes } from "crypto";

// ─── SEO analysis engine (module-level so client reports can reuse it) ───────
type SeoCheck = { id: string; label: string; status: "pass" | "warn" | "fail"; detail: string };
type SeoCategory = { key: string; label: string; score: number; weight: number };

// ─── Real Lighthouse metrics via Google PageSpeed Insights API ───────────────
// This is the SAME Lighthouse engine GTmetrix runs, executed on Google's
// servers — it renders the page in Chrome and measures real Web Vitals
// (LCP, TBT, CLS) plus the official Performance score. Free API; an optional
// PAGESPEED_API_KEY env raises the quota.
type PageSpeedResult = {
  performanceScore: number;          // 0-100, official Lighthouse score
  lcpMs: number | null;              // Largest Contentful Paint
  tbtMs: number | null;              // Total Blocking Time
  cls: number | null;                // Cumulative Layout Shift
  fcpMs: number | null;              // First Contentful Paint
  speedIndexMs: number | null;
  lighthouseVersion: string;
} | null;

async function fetchPageSpeed(url: string, timeoutMs = 45000): Promise<PageSpeedResult> {
  try {
    const key = process.env.PAGESPEED_API_KEY;
    const api = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
    api.searchParams.set("url", url);
    api.searchParams.set("strategy", "mobile");
    api.searchParams.set("category", "performance");
    if (key) api.searchParams.set("key", key);
    const res = await fetch(api.href, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return null;
    const j = await res.json() as {
      lighthouseResult?: {
        lighthouseVersion?: string;
        categories?: { performance?: { score?: number } };
        audits?: Record<string, { numericValue?: number }>;
      };
    };
    const lr = j.lighthouseResult;
    if (!lr?.categories?.performance) return null;
    const a = lr.audits ?? {};
    const num = (id: string) => (typeof a[id]?.numericValue === "number" ? a[id]!.numericValue! : null);
    return {
      performanceScore: Math.round((lr.categories.performance.score ?? 0) * 100),
      lcpMs: num("largest-contentful-paint"),
      tbtMs: num("total-blocking-time"),
      cls: a["cumulative-layout-shift"]?.numericValue ?? null,
      fcpMs: num("first-contentful-paint"),
      speedIndexMs: num("speed-index"),
      lighthouseVersion: lr.lighthouseVersion ?? "12",
    };
  } catch { return null; }
}

async function measureHttp(url: string): Promise<{
  ttfbMs: number; totalMs: number; htmlKB: number; compressed: string;
  cacheControl: string; hsts: boolean; redirected: boolean; finalUrl: string; https: boolean;
} | null> {
  try {
    const t0 = Date.now();
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LynxSEO/1.0)", "Accept-Encoding": "gzip, br" },
    });
    const ttfbMs = Date.now() - t0; // fetch resolves when headers arrive ≈ TTFB
    const buf = await res.arrayBuffer();
    const totalMs = Date.now() - t0;
    return {
      ttfbMs, totalMs,
      htmlKB: Math.round(buf.byteLength / 1024),
      compressed: (res.headers.get("content-encoding") ?? "").toLowerCase(),
      cacheControl: res.headers.get("cache-control") ?? "",
      hsts: Boolean(res.headers.get("strict-transport-security")),
      redirected: res.redirected,
      finalUrl: res.url,
      https: res.url.startsWith("https://"),
    };
  } catch { return null; }
}

function computeSeoBreakdown(
  raw: string,
  meas: Awaited<ReturnType<typeof measureHttp>>,
  firstSampleMs: number,
  sitemapFound: boolean,
  pageUrl: string,
  psi?: PageSpeedResult,
): {
  score: number; categories: SeoCategory[]; checks: SeoCheck[];
  source: "lighthouse" | "estimated";
  webVitals: { lcpMs: number | null; tbtMs: number | null; cls: number | null; fcpMs: number | null; lighthouseVersion: string } | null;
} {
  const checks: SeoCheck[] = [];
  const add = (id: string, label: string, status: SeoCheck["status"], detail: string, arr: number[], pts: number, max: number) => {
    checks.push({ id, label, status, detail });
    arr[0] += pts; arr[1] += max;
  };

  // ── PERFORMANCE (measured) ──
  const perf: [number, number] = [0, 0];
  const ttfb = meas ? Math.min(meas.ttfbMs, firstSampleMs > 0 ? firstSampleMs : meas.ttfbMs) : firstSampleMs; // best of 2 samples (GTmetrix-style)
  if (ttfb > 0) {
    const st = ttfb <= 500 ? "pass" : ttfb <= 1200 ? "warn" : "fail";
    add("ttfb", "Server response time (TTFB)", st, `${ttfb} ms (good ≤ 500 ms)`, perf, st === "pass" ? 25 : st === "warn" ? 14 : 4, 25);
  }
  if (meas) {
    const kb = meas.htmlKB;
    const stSize = kb <= 100 ? "pass" : kb <= 300 ? "warn" : "fail";
    add("htmlsize", "HTML document size", stSize, `${kb} KB (good ≤ 100 KB)`, perf, stSize === "pass" ? 15 : stSize === "warn" ? 9 : 3, 15);
    const stComp = meas.compressed.includes("br") || meas.compressed.includes("gzip") ? "pass" : "fail";
    add("compression", "Text compression (gzip/brotli)", stComp, meas.compressed ? `Enabled (${meas.compressed})` : "Not detected — enable gzip or brotli", perf, stComp === "pass" ? 15 : 0, 15);
    const stCache = /max-age=[1-9]/.test(meas.cacheControl) ? "pass" : "warn";
    add("cache", "HTML cache headers", stCache, meas.cacheControl || "No cache-control header", perf, stCache === "pass" ? 10 : 5, 10);
  }
  const scriptCount = (raw.match(/<script[^>]+src=/gi) ?? []).length;
  const stScripts = scriptCount <= 8 ? "pass" : scriptCount <= 15 ? "warn" : "fail";
  add("scripts", "External scripts", stScripts, `${scriptCount} scripts (good ≤ 8)`, perf, stScripts === "pass" ? 12 : stScripts === "warn" ? 7 : 2, 12);
  const cssCount = (raw.match(/<link[^>]+rel=["']stylesheet["']/gi) ?? []).length;
  const stCss = cssCount <= 4 ? "pass" : cssCount <= 8 ? "warn" : "fail";
  add("css", "External stylesheets", stCss, `${cssCount} stylesheets (good ≤ 4)`, perf, stCss === "pass" ? 8 : stCss === "warn" ? 5 : 1, 8);
  const imgsAll = (raw.match(/<img/gi) ?? []).length;
  const imgsLazy = (raw.match(/<img[^>]+loading=["']lazy["']/gi) ?? []).length;
  if (imgsAll > 3) {
    const lazyRatio = imgsLazy / imgsAll;
    const stLazy = lazyRatio >= 0.5 ? "pass" : lazyRatio > 0 ? "warn" : "fail";
    add("lazy", "Image lazy loading", stLazy, `${imgsLazy}/${imgsAll} images lazy-loaded`, perf, stLazy === "pass" ? 8 : stLazy === "warn" ? 4 : 0, 8);
  }
  const imgsDim = (raw.match(/<img[^>]+width=/gi) ?? []).length;
  if (imgsAll > 3) {
    const dimRatio = imgsDim / imgsAll;
    const stDim = dimRatio >= 0.7 ? "pass" : dimRatio >= 0.3 ? "warn" : "fail";
    add("imgdim", "Image dimensions set (prevents layout shift)", stDim, `${imgsDim}/${imgsAll} images have width/height`, perf, stDim === "pass" ? 7 : stDim === "warn" ? 4 : 0, 7);
  }

  // ── SEO ──
  const seo: [number, number] = [0, 0];
  const titleTxt = raw.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? "";
  const stTitle = titleTxt.length >= 30 && titleTxt.length <= 60 ? "pass" : titleTxt.length > 0 ? "warn" : "fail";
  add("title", "Title tag", stTitle, titleTxt ? `${titleTxt.length} chars (ideal 30–60)` : "Missing", seo, stTitle === "pass" ? 18 : stTitle === "warn" ? 12 : 0, 18);
  const descTxt = raw.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1]
    ?? raw.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i)?.[1] ?? "";
  const stDesc = descTxt.length >= 70 && descTxt.length <= 160 ? "pass" : descTxt.length > 0 ? "warn" : "fail";
  add("metadesc", "Meta description", stDesc, descTxt ? `${descTxt.length} chars (ideal 70–160)` : "Missing", seo, stDesc === "pass" ? 18 : stDesc === "warn" ? 12 : 0, 18);
  const h1Count = (raw.match(/<h1[\s>]/gi) ?? []).length;
  const stH1 = h1Count === 1 ? "pass" : h1Count > 1 ? "warn" : "fail";
  add("h1", "Single H1 heading", stH1, h1Count === 1 ? "Exactly one H1" : h1Count > 1 ? `${h1Count} H1 tags (should be 1)` : "No H1 found", seo, stH1 === "pass" ? 12 : stH1 === "warn" ? 7 : 0, 12);
  const hasCanonical = /<link[^>]+rel=["']canonical["']/i.test(raw);
  add("canonical", "Canonical URL", hasCanonical ? "pass" : "warn", hasCanonical ? "Present" : "Missing — helps prevent duplicate content", seo, hasCanonical ? 10 : 0, 10);
  add("sitemap", "XML sitemap", sitemapFound ? "pass" : "warn", sitemapFound ? "Found" : "Not found — add one so crawlers discover all pages", seo, sitemapFound ? 12 : 0, 12);
  const hasLang = /<html[^>]+lang=/i.test(raw);
  add("lang", "Language attribute", hasLang ? "pass" : "warn", hasLang ? "Present on <html>" : "Missing lang attribute", seo, hasLang ? 6 : 0, 6);
  const imgsAlt = (raw.match(/<img[^>]+alt=["'][^"']+["']/gi) ?? []).length;
  const altRatio = imgsAll > 0 ? imgsAlt / imgsAll : 1;
  const stAlt = altRatio >= 0.9 ? "pass" : altRatio >= 0.5 ? "warn" : "fail";
  add("alt", "Image alt text", stAlt, imgsAll > 0 ? `${imgsAlt}/${imgsAll} images have alt` : "No images", seo, Math.round(altRatio * 14), 14);
  const hasFavicon = /<link[^>]+rel=["'][^"']*icon[^"']*["']/i.test(raw);
  add("favicon", "Favicon", hasFavicon ? "pass" : "warn", hasFavicon ? "Present" : "Missing", seo, hasFavicon ? 4 : 0, 4);
  const internalLinks = (raw.match(/<a[^>]+href=["'](\/[^"']*|#[^"']*)["']/gi) ?? []).length;
  const stLinks = internalLinks >= 5 ? "pass" : internalLinks > 0 ? "warn" : "fail";
  add("links", "Internal links", stLinks, `${internalLinks} internal links (good ≥ 5)`, seo, stLinks === "pass" ? 6 : stLinks === "warn" ? 3 : 0, 6);

  // ── SOCIAL ──
  const social: [number, number] = [0, 0];
  const hasOgT = /<meta[^>]+property=["']og:title["']/i.test(raw);
  const hasOgD = /<meta[^>]+property=["']og:description["']/i.test(raw);
  const hasOgI = /<meta[^>]+property=["']og:image["']/i.test(raw);
  const hasTw = /<meta[^>]+name=["']twitter:card["']/i.test(raw);
  add("og", "Open Graph tags", hasOgT && hasOgD ? "pass" : hasOgT || hasOgD ? "warn" : "fail", `og:title ${hasOgT ? "✓" : "✗"}, og:description ${hasOgD ? "✓" : "✗"}`, social, (hasOgT ? 20 : 0) + (hasOgD ? 20 : 0), 40);
  add("ogimage", "Social share image (og:image)", hasOgI ? "pass" : "warn", hasOgI ? "Present" : "Missing — links look plain when shared", social, hasOgI ? 40 : 0, 40);
  add("twitter", "Twitter card", hasTw ? "pass" : "warn", hasTw ? "Present" : "Missing", social, hasTw ? 20 : 0, 20);

  // ── STRUCTURE ──
  const struct: [number, number] = [0, 0];
  let jsonLdValid = 0; let jsonLdTotal = 0;
  for (const m of Array.from(raw.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi))) {
    jsonLdTotal++;
    try { JSON.parse(m[1]); jsonLdValid++; } catch { /* invalid */ }
  }
  const stLd = jsonLdValid > 0 ? "pass" : jsonLdTotal > 0 ? "warn" : "fail";
  add("jsonld", "Structured data (JSON-LD)", stLd, jsonLdTotal > 0 ? `${jsonLdValid}/${jsonLdTotal} blocks valid` : "None found", struct, stLd === "pass" ? 40 : stLd === "warn" ? 15 : 0, 40);
  const hasViewportC = /<meta[^>]+name=["']viewport["']/i.test(raw);
  add("viewport", "Mobile viewport", hasViewportC ? "pass" : "fail", hasViewportC ? "Present" : "Missing — page won't scale on phones", struct, hasViewportC ? 30 : 0, 30);
  const hasCharset = /<meta[^>]+charset=/i.test(raw);
  add("charset", "Character encoding", hasCharset ? "pass" : "warn", hasCharset ? "Declared" : "Missing charset", struct, hasCharset ? 15 : 0, 15);
  const hasResponsiveImg = /srcset=|<picture/i.test(raw);
  add("srcset", "Responsive images (srcset)", hasResponsiveImg ? "pass" : "warn", hasResponsiveImg ? "In use" : "Not detected", struct, hasResponsiveImg ? 15 : 0, 15);

  // ── SECURITY ──
  const sec: [number, number] = [0, 0];
  const isHttps = meas ? meas.https : pageUrl.startsWith("https://");
  add("https", "HTTPS", isHttps ? "pass" : "fail", isHttps ? "Secure connection" : "Site not served over HTTPS", sec, isHttps ? 50 : 0, 50);
  if (meas) add("hsts", "HTTP Strict Transport Security", meas.hsts ? "pass" : "warn", meas.hsts ? "HSTS enabled" : "No HSTS header", sec, meas.hsts ? 25 : 0, 25);
  const mixed = isHttps && /(?:src|href)=["']http:\/\//i.test(raw);
  add("mixed", "No mixed content", mixed ? "warn" : "pass", mixed ? "Some resources load over http://" : "All resources secure", sec, mixed ? 5 : 25, 25);

  // ── Weighted total ──
  const pct = (a: [number, number]) => (a[1] > 0 ? Math.round((a[0] / a[1]) * 100) : 100);
  const categories: SeoCategory[] = [
    { key: "performance", label: "Performance", score: pct(perf), weight: 30 },
    { key: "seo", label: "SEO", score: pct(seo), weight: 35 },
    { key: "social", label: "Social", score: pct(social), weight: 10 },
    { key: "structure", label: "Structure", score: pct(struct), weight: 15 },
    { key: "security", label: "Security", score: pct(sec), weight: 10 },
  ];

  // ── Real Lighthouse override ──
  // When Google PageSpeed (the same Lighthouse engine GTmetrix runs) responded,
  // the Performance category uses ITS official score, and the real Web Vitals
  // become graded checks with Google's official thresholds.
  let vitalsSource: "lighthouse" | "estimated" = "estimated";
  if (psi) {
    vitalsSource = "lighthouse";
    const perfCat = categories.find((c) => c.key === "performance");
    if (perfCat) perfCat.score = psi.performanceScore;
    const vitalChecks: SeoCheck[] = [];
    if (psi.lcpMs != null) {
      const s = psi.lcpMs <= 2500 ? "pass" : psi.lcpMs <= 4000 ? "warn" : "fail";
      vitalChecks.push({ id: "lcp", label: "Largest Contentful Paint (LCP)", status: s, detail: `${(psi.lcpMs / 1000).toFixed(1)} s (good \u2264 2.5 s)` });
    }
    if (psi.tbtMs != null) {
      const s = psi.tbtMs <= 200 ? "pass" : psi.tbtMs <= 600 ? "warn" : "fail";
      vitalChecks.push({ id: "tbt", label: "Total Blocking Time (TBT)", status: s, detail: `${Math.round(psi.tbtMs)} ms (good \u2264 200 ms)` });
    }
    if (psi.cls != null) {
      const s = psi.cls <= 0.1 ? "pass" : psi.cls <= 0.25 ? "warn" : "fail";
      vitalChecks.push({ id: "cls", label: "Cumulative Layout Shift (CLS)", status: s, detail: `${psi.cls.toFixed(2)} (good \u2264 0.10)` });
    }
    if (psi.fcpMs != null) {
      const s = psi.fcpMs <= 1800 ? "pass" : psi.fcpMs <= 3000 ? "warn" : "fail";
      vitalChecks.push({ id: "fcp", label: "First Contentful Paint (FCP)", status: s, detail: `${(psi.fcpMs / 1000).toFixed(1)} s (good \u2264 1.8 s)` });
    }
    checks.unshift(...vitalChecks);
  }
  let total = Math.round(categories.reduce((s, c) => s + c.score * (c.weight / 100), 0));
  // Critical override: a noindex page is invisible to search engines.
  if (/<meta[^>]+name=["']robots["'][^>]*noindex/i.test(raw)) {
    total = Math.min(total, 25);
    checks.unshift({ id: "noindex", label: "Page is set to noindex", status: "fail", detail: "Search engines are told NOT to index this page — score capped at 25" });
  }
  return {
    score: total, categories, checks,
    source: vitalsSource,
    webVitals: psi ? { lcpMs: psi.lcpMs, tbtMs: psi.tbtMs, cls: psi.cls, fcpMs: psi.fcpMs, lighthouseVersion: psi.lighthouseVersion } : null,
  };
}




// ─── Training helpers ────────────────────────────────────────────────────────
export function trainingLimitsForPlan(plan: string) {
  switch (plan) {
    case "whitelabel":
      return { instructionsEnabled: true, knowledgeEnabled: true, maxInstructionsChars: 4000, maxKnowledgeEntries: 50 };
    case "embedded":
      return { instructionsEnabled: true, knowledgeEnabled: true, maxInstructionsChars: 2000, maxKnowledgeEntries: 20 };
    case "cloud":
      return { instructionsEnabled: true, knowledgeEnabled: false, maxInstructionsChars: 1000, maxKnowledgeEntries: 0 };
    default: // free
      return { instructionsEnabled: false, knowledgeEnabled: false, maxInstructionsChars: 0, maxKnowledgeEntries: 0 };
  }
}

export function parseKnowledgeBase(raw: unknown): Array<{ title: string; content: string }> {
  let value = raw;
  if (typeof value === "string") {
    try { value = JSON.parse(value); } catch { return []; }
  }
  if (!Array.isArray(value)) return [];
  return value
    .filter((e): e is { title: string; content: string } =>
      !!e && typeof e === "object" && typeof (e as { title?: unknown }).title === "string" && typeof (e as { content?: unknown }).content === "string")
    .slice(0, 100);
}

export function buildTrainingPromptSection(chatbot: { customInstructions?: string | null; knowledgeBase?: unknown }): string {
  const parts: string[] = [];
  const instructions = (chatbot.customInstructions ?? "").trim();
  if (instructions) {
    parts.push(`=== OWNER INSTRUCTIONS (follow these with top priority) ===\n${instructions}`);
  }
  const kb = parseKnowledgeBase(chatbot.knowledgeBase);
  if (kb.length > 0) {
    const entries = kb.map(e => `- ${e.title}: ${e.content}`).join("\n");
    parts.push(`=== KNOWLEDGE BASE (authoritative answers provided by the site owner) ===\n${entries}`);
  }
  return parts.length > 0 ? `\n\n${parts.join("\n\n")}` : "";
}

/**
 * Fetch many pages in parallel under a wall-clock deadline.
 *
 * WHY: crawling used to run one page at a time with an 8s timeout each. On a
 * White-Label plan (up to 59 pages) the worst case ran past 8 MINUTES, so the
 * edge proxy cut the connection and returned an HTML error page — which the
 * tRPC client reports as "Unable to transform response from server". Bounded
 * concurrency plus a hard deadline keeps every scan inside the proxy window;
 * whatever was read by then is kept, and the rest is simply skipped.
 */
async function crawlPages<T>(
  links: string[],
  handler: (url: string, html: string) => T | void,
  opts: { deadline: number; concurrency?: number; timeoutMs?: number; onFail?: (url: string) => void }
): Promise<void> {
  const concurrency = opts.concurrency ?? 6;
  const timeoutMs = opts.timeoutMs ?? 6000;
  let cursor = 0;
  const worker = async () => {
    while (cursor < links.length) {
      if (Date.now() > opts.deadline) return;
      const link = links[cursor++];
      try {
        const { text } = await safeFetchText(link, { timeoutMs });
        handler(link, text);
      } catch {
        opts.onFail?.(link);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, links.length) }, worker));
}

// ─── Site-scan helpers (module level so BOTH the owner scan and the
// per-client scan use exactly the same crawling and learning logic) ─────────
// ─── Helper: extract products from JSON-LD Product schema ─────────────
interface ProductEntry { name: string; price?: string; description?: string; url?: string; image?: string; }

/**
 * Add a product to the catalog, merging duplicates.
 *
 * The same item legitimately arrives from up to three sources — JSON-LD on the
 * home page, a collection page, and the store's JSON API — often with slightly
 * different names ("BPC-157" vs "BPC-157 10mg"). Deduping on an exact name
 * match therefore inflated the count (25 entries for a 15-product store) and
 * fed the assistant the same product several times.
 *
 * Identity is the product PAGE (canonical URL) when we have one, since that is
 * what actually distinguishes items; the normalized name is the fallback. On a
 * merge we keep the richest data: a name from one source, an image from another.
 */
function upsertProduct(list: ProductEntry[], incoming: ProductEntry): void {
  const normName = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const normUrl = (u?: string) => {
    if (!u) return "";
    try {
      const parsed = new URL(u);
      return (parsed.origin + parsed.pathname).replace(/\/+$/, "").toLowerCase();
    } catch { return ""; }
  };
  const inUrl = normUrl(incoming.url);
  const inName = normName(incoming.name);
  const existing = list.find((e) => {
    const eUrl = normUrl(e.url);
    if (inUrl && eUrl) return eUrl === inUrl;
    return normName(e.name) === inName;
  });
  if (!existing) {
    list.push(incoming);
    return;
  }
  // Merge: prefer the longer name (usually the one carrying the dosage) and
  // fill in any field the first source was missing.
  if (incoming.name.length > existing.name.length) existing.name = incoming.name;
  if (!existing.price && incoming.price) existing.price = incoming.price;
  if (!existing.image && incoming.image) existing.image = incoming.image;
  if (!existing.description && incoming.description) existing.description = incoming.description;
  if (!existing.url && incoming.url) existing.url = incoming.url;
}
/**
 * Second pass: for products that still have no photo, open their own page and
 * pull one. Store APIs and collection pages frequently omit images even when
 * the product page has a perfectly good one, and a card without a photo is the
 * difference between a catalog that looks designed and one that looks broken.
 * Bounded by the same crawl deadline, so it can never extend a scan.
 */
async function hydrateMissingImages(products: ProductEntry[], deadline: number): Promise<number> {
  const needy = products.filter(p => !p.image && p.url).slice(0, 60);
  if (!needy.length) return 0;
  let filled = 0;
  await crawlPages(needy.map(p => p.url as string), (link, html) => {
    const target = products.find(p => p.url === link);
    if (target && !target.image) {
      const img = extractPageImage(html, link);
      if (img) { target.image = img; filled++; }
    }
  }, { deadline, concurrency: 6, timeoutMs: 5000 });
  return filled;
}

/**
 * Best photo for a product page, when the structured data has none.
 *
 * Custom-built stores (not Shopify/Woo) often publish JSON-LD without an
 * "image" field, which left product cards with no photo. Nearly every product
 * page still exposes one through Open Graph — that is what social previews and
 * WhatsApp thumbnails use — with a real <img> as the last resort.
 */
function extractPageImage(html: string, baseUrl: string): string | undefined {
  const abs = (u?: string) => {
    if (!u) return undefined;
    const clean = u.trim();
    if (!clean || clean.startsWith("data:")) return undefined;
    try { return new URL(clean, baseUrl).href; } catch { return undefined; }
  };
  const og = html.match(/<meta[^>]+property=["']og:image(?::url)?["'][^>]*content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image(?::url)?["']/i)?.[1];
  if (og) return abs(og);
  const tw = html.match(/<meta[^>]+name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i)?.[1];
  if (tw) return abs(tw);
  // Fall back to the first plausible content image, skipping logos/icons/pixels
  for (const m of Array.from(html.matchAll(/<img[^>]+(?:data-src|srcset|src)=["']([^"'\s]+)/gi))) {
    const candidate = m[1];
    if (/logo|icon|favicon|sprite|placeholder|avatar|badge|\.svg(\?|$)/i.test(candidate)) continue;
    const resolved = abs(candidate);
    if (resolved) return resolved;
  }
  return undefined;
}

function extractProductsFromHtml(html: string, baseUrl: string): ProductEntry[] {
  const products: ProductEntry[] = [];
  // 1. JSON-LD Product schema (most reliable — Shopify, WooCommerce, etc.)
  const ldMatches = Array.from(html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi));
  for (const m of ldMatches) {
    try {
      const obj = JSON.parse(m[1]);
      const items = Array.isArray(obj) ? obj : (obj["@graph"] ?? [obj]);
      for (const item of items) {
        if (item["@type"] === "Product") {
          const price = item.offers?.price ?? item.offers?.[0]?.price ?? item.offers?.lowPrice;
          const currency = item.offers?.priceCurrency ?? item.offers?.[0]?.priceCurrency ?? "";
          const url = item.offers?.url ?? item.offers?.[0]?.url ?? item.url ?? "";
          const img = typeof item.image === "string" ? item.image
            : Array.isArray(item.image) ? item.image[0]
            : item.image?.url;
          products.push({
            name: String(item.name ?? "").trim().slice(0, 120),
            price: price ? `${price}${currency ? " " + currency : ""}` : undefined,
            description: String(item.description ?? "").trim().slice(0, 200) || undefined,
            // Resolved after the loop: falling back to the page URL is only
            // correct on a single-product page. On a collection page it gave
            // every item the SAME url, and dedupe-by-url then collapsed the
            // whole catalog into one entry (0-1 products detected).
            url: url ? new URL(url, baseUrl).href : undefined,
            image: img ? new URL(String(img), baseUrl).href : extractPageImage(html, baseUrl),
          });
        }
      }
    } catch { /* malformed JSON-LD */ }
  }
  // 2. Shopify product JSON endpoint (if available in page source as __st or window.ShopifyAnalytics)
  const shopifyProductMatch = html.match(/"product":\s*\{[^}]*"title":\s*"([^"]+)"[^}]*"price":\s*(\d+)/g);
  if (shopifyProductMatch && products.length === 0) {
    for (const match of shopifyProductMatch.slice(0, 10)) {
      const title = match.match(/"title":\s*"([^"]+)"/);
      const price = match.match(/"price":\s*(\d+)/);
      if (title?.[1]) {
        products.push({
          name: title[1].trim().slice(0, 120),
          price: price?.[1] ? `${(parseInt(price[1]) / 100).toFixed(2)}` : undefined,
        });
      }
    }
  }
  // A page holding exactly one Product IS that product's page — safe to use as
  // its link. On listing pages we instead look for the anchor whose text or
  // href matches the product name, so each item keeps its own real URL.
  if (products.length === 1 && !products[0].url) {
    products[0].url = baseUrl;
    if (!products[0].image) products[0].image = extractPageImage(html, baseUrl);
  } else if (products.length > 1) {
    const anchors = Array.from(html.matchAll(/<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]{0,160}?)<\/a>/gi))
      .map(m => ({ href: m[1], text: m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() }));
    const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    for (const prod of products) {
      if (prod.url || !prod.name) continue;
      const target = norm(prod.name);
      if (!target) continue;
      const hit = anchors.find(a => norm(a.text) === target)
        ?? anchors.find(a => a.text && (norm(a.text).includes(target) || target.includes(norm(a.text))))
        ?? anchors.find(a => norm(decodeURIComponent(a.href)).includes(target));
      if (hit) {
        try { prod.url = new URL(hit.href, baseUrl).href; } catch { /* bad href */ }
      }
    }
  }
  return products.slice(0, 200); // max 200 products
}

// ─── Helper: find product/catalog page links ──────────────────────────
function findProductPageLinks(html: string, baseUrl: string): string[] {
  const base = new URL(baseUrl);
  // Keep in sync with the sitemap classifier: a store that calls its catalog
  // /compounds (or /item, /produkt…) was invisible to the home-page crawler,
  // so its catalog page was never read and zero products were detected.
  const productPatterns = [
    /\/products?\b/i, /\/tienda\b/i, /\/shop\b/i, /\/catalog(?:o|ue)?\b/i,
    /\/store\b/i, /\/collection/i, /\/categoria/i, /\/category/i,
    /\/compounds?\b/i, /\/item\b/i, /\/produkt/i, /\/merch\b/i,
  ];
  const seen = new Set<string>();
  const links: string[] = [];
  const hrefMatches = Array.from(html.matchAll(/href=["']([^"'#?]+)["']/gi));
  for (const m of hrefMatches) {
    try {
      const href = new URL(m[1], baseUrl);
      if (href.hostname !== base.hostname) continue;
      const path = href.pathname;
      if (seen.has(path)) continue;
      if (productPatterns.some(p => p.test(path))) {
        seen.add(path);
        links.push(href.href);
        if (links.length >= 15) break;
      }
    } catch { /* invalid URL */ }
  }
  return links;
}

/**
 * Every internal page linked from this HTML, minus the obvious noise.
 *
 * WHY: link discovery used to keep only URLs whose path matched a hardcoded
 * word list (/products, /shop, /collection…). A store that names its catalog
 * anything else — /compounds, /formulas, /lineup — was invisible, and the scan
 * reported zero products. Reading every internal link instead means discovery
 * no longer depends on guessing the owner's naming; the word lists are now only
 * used to PRIORITIZE what gets read first, not to decide what exists.
 */
function findAllInternalLinks(html: string, baseUrl: string): string[] {
  const base = new URL(baseUrl);
  // Files and account/checkout routes: never useful as knowledge, and some
  // (cart, logout) have side effects or infinite variations.
  const skip = /\.(jpg|jpeg|png|gif|webp|svg|ico|css|js|pdf|zip|mp4|woff2?)$|\/(cart|checkout|account|login|signin|signup|register|logout|wp-admin|wp-login|admin)\b/i;
  const seen = new Set<string>();
  const links: string[] = [];
  for (const m of Array.from(html.matchAll(/href=["']([^"'#]+)["']/gi))) {
    try {
      const href = new URL(m[1], baseUrl);
      if (href.hostname !== base.hostname) continue;
      if (href.protocol !== "http:" && href.protocol !== "https:") continue;
      const path = href.pathname.replace(/\/+$/, "") || "/";
      if (path === "/" || seen.has(path) || skip.test(path)) continue;
      seen.add(path);
      links.push(href.origin + path);
      if (links.length >= 150) break;
    } catch { /* invalid href */ }
  }
  return links;
}

// ─── Helper: find informational page links (FAQ, about, policies…) ────
/**
 * Label an informational page by what visitors actually ask about, so the
 * assistant can find "the returns policy" instead of grepping raw text.
 */
function classifyInfoPage(path: string, title = ""): string {
  const hay = `${path} ${title}`.toLowerCase();
  if (/faq|preguntas|help|ayuda|support|soporte/.test(hay)) return "FAQ";
  if (/shipping|envio|env\u00edo|delivery|entrega/.test(hay)) return "SHIPPING";
  if (/return|devoluc|refund|reembolso|exchange/.test(hay)) return "RETURNS";
  if (/privacy|privacidad/.test(hay)) return "PRIVACY POLICY";
  if (/terms|terminos|t\u00e9rminos|conditions|legal/.test(hay)) return "TERMS";
  if (/contact|contacto/.test(hay)) return "CONTACT";
  if (/about|nosotros|quienes|qui\u00e9nes|story|mission/.test(hay)) return "ABOUT";
  if (/pricing|precios|plans|planes/.test(hay)) return "PRICING";
  if (/service|servicio/.test(hay)) return "SERVICES";
  return "PAGE";
}

function findInfoPageLinks(html: string, baseUrl: string): string[] {
  const base = new URL(baseUrl);
  const infoPatterns = [
    /faq/i, /preguntas/i, /about/i, /nosotros/i, /quienes/i,
    /contact/i, /contacto/i, /shipping/i, /envio/i, /delivery/i,
    /returns?/i, /devolucion/i, /refund/i, /reembolso/i,
    /policy|policies/i, /politica/i, /terms/i, /terminos/i,
    /privacy/i, /privacidad/i, /help|ayuda/i, /support|soporte/i,
    /pricing|precios/i, /services?|servicios?/i,
  ];
  const seen = new Set<string>();
  const links: string[] = [];
  const hrefMatches = Array.from(html.matchAll(/href=["']([^"'#?]+)["']/gi));
  for (const m of hrefMatches) {
    try {
      const href = new URL(m[1], baseUrl);
      if (href.hostname !== base.hostname) continue;
      const path = href.pathname;
      if (path === "/" || seen.has(path)) continue;
      if (infoPatterns.some(pt => pt.test(path))) {
        seen.add(path);
        links.push(href.href);
        if (links.length >= 25) break;
      }
    } catch { /* invalid URL */ }
  }
  return links;
}

// ─── Helper: strip HTML to readable text ──────────────────────────────
function htmlToText(raw: string, maxChars: number): string {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, maxChars);
}

// ─── Helper: fetch sitemap.xml and return real page URLs ──────────────
// Works even on JS/SPA sites (the sitemap is static XML), so it's the
// most reliable way to discover every real page a crawler-fetch misses.
async function fetchSitemapUrls(siteUrl: string): Promise<string[]> {
  const base = new URL(siteUrl);
  const candidates = [
    `${base.origin}/sitemap.xml`,
    `${base.origin}/sitemap_index.xml`,
    `${base.origin}/sitemap-index.xml`,
  ];
  const found = new Set<string>();
  const sitemapsToRead: string[] = [];
  // 1. Try robots.txt for a Sitemap: directive first
  try {
    const { text: robots } = await safeFetchText(`${base.origin}/robots.txt`, { timeoutMs: 6000 });
    for (const m of Array.from(robots.matchAll(/sitemap:\s*(\S+)/gi))) {
      if (m[1]) sitemapsToRead.push(m[1].trim());
    }
  } catch { /* no robots.txt */ }
  if (sitemapsToRead.length === 0) sitemapsToRead.push(...candidates);

  let sitemapsRead = 0;
  const queue = [...sitemapsToRead];
  while (queue.length && sitemapsRead < 6 && found.size < 300) {
    const sm = queue.shift()!;
    sitemapsRead++;
    try {
      const { text: xml } = await safeFetchText(sm, { timeoutMs: 7000 });
      // A sitemap index points to more sitemaps; a urlset lists pages.
      const isIndex = /<sitemapindex/i.test(xml);
      const locs = Array.from(xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)).map(m => m[1]);
      for (const loc of locs) {
        if (isIndex) {
          if (queue.length < 10) queue.push(loc);
        } else {
          try {
            const u = new URL(loc);
            if (u.hostname === base.hostname) found.add(u.href);
          } catch { /* skip */ }
        }
        if (found.size >= 300) break;
      }
    } catch { /* sitemap missing */ }
  }
  return Array.from(found);
}

// ─── Helper: pull a full product catalog from store JSON endpoints ────
// Shopify (/products.json) and WooCommerce (Store API) expose the whole
// catalog as JSON even when the storefront is JS-rendered. This is what
// makes "does it sell products?" answerable without manual training.
async function fetchStoreCatalog(siteUrl: string): Promise<ProductEntry[]> {
  const base = new URL(siteUrl);
  const out: ProductEntry[] = [];
  // Shopify — paginate a couple of pages for large catalogs
  for (let page = 1; page <= 3 && out.length < 200; page++) {
    try {
      const url = `${base.origin}/products.json?limit=250&page=${page}`;
      const { text: pj } = await safeFetchText(url, { timeoutMs: 8000 });
      const parsed = JSON.parse(pj);
      if (!Array.isArray(parsed.products) || parsed.products.length === 0) break;
      for (const sp of parsed.products) {
        const handle = sp.handle ? `${base.origin}/products/${sp.handle}` : undefined;
        const variant = Array.isArray(sp.variants) ? sp.variants[0] : undefined;
        const price = variant?.price ? `${variant.price}` : undefined;
        const name = String(sp.title ?? "").trim().slice(0, 120);
        if (name) {
          const spImg = Array.isArray(sp.images) && sp.images[0]?.src ? String(sp.images[0].src) : undefined;
          upsertProduct(out, {
            name, price,
            description: String(sp.body_html ?? "").replace(/<[^>]+>/g, "").trim().slice(0, 200) || undefined,
            url: handle, image: spImg,
          });
        }
        if (out.length >= 200) break;
      }
    } catch { break; /* not Shopify or blocked */ }
  }
  // WooCommerce Store API (public, no auth) — many WP shops expose this
  if (out.length === 0) {
    for (let page = 1; page <= 3 && out.length < 200; page++) {
      try {
        const url = `${base.origin}/wp-json/wc/store/v1/products?per_page=100&page=${page}`;
        const { text: wj } = await safeFetchText(url, { timeoutMs: 8000 });
        const arr = JSON.parse(wj);
        if (!Array.isArray(arr) || arr.length === 0) break;
        for (const wp of arr) {
          const name = String(wp.name ?? "").trim().slice(0, 120);
          const price = wp.prices?.price
            ? `${(parseInt(wp.prices.price) / Math.pow(10, wp.prices.currency_minor_unit ?? 2)).toFixed(2)} ${wp.prices.currency_code ?? ""}`.trim()
            : undefined;
          if (name) {
            upsertProduct(out, {
              name, price,
              description: String(wp.short_description ?? wp.description ?? "").replace(/<[^>]+>/g, "").trim().slice(0, 200) || undefined,
              url: wp.permalink ?? undefined,
              image: Array.isArray(wp.images) && wp.images[0]?.src ? String(wp.images[0].src) : undefined,
            });
          }
          if (out.length >= 200) break;
        }
      } catch { break; /* not WooCommerce */ }
    }
  }
  return out;
}



/**
 * Crawl a website and build the knowledge base the assistant answers from:
 * product catalog (with URLs + images), labeled policy/info pages, and a map of
 * the site's visible sections. Used for the owner's own site AND for every
 * client site added under White-Label, so a client's bot learns identically.
 * Returns the assembled context; the caller decides which chatbot to store it on.
 */
export async function buildSiteKnowledge(
  siteUrl: string,
  budgetPages = 80,
  crawlMs = 45000
): Promise<{ context: string; products: number; pagesRead: string[]; indexed: number }> {
  const deadline = Date.now() + crawlMs;
  const products: ProductEntry[] = [];
  const pageExtracts: { path: string; text: string; title: string; kind: string }[] = [];
  const pageIndex: { path: string; kind: string; title: string }[] = [];
  const pagesRead: string[] = [];
  const addToIndex = (u: string, kind: string, title = "") => {
    try {
      const path = new URL(u).pathname;
      if (!pageIndex.some(p => p.path === path)) pageIndex.push({ path, kind, title: title.slice(0, 70) });
    } catch { /* skip */ }
  };

  const { text: rawHome } = await safeFetchText(siteUrl);
  pagesRead.push("/");
  addToIndex(siteUrl, "home", rawHome.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? "");

  for (const p of extractProductsFromHtml(rawHome, siteUrl)) products.push(p);
  try {
    for (const p of await fetchStoreCatalog(siteUrl)) {
      upsertProduct(products, p);
    }
  } catch { /* no store API */ }

  let sitemapUrls: string[] = [];
  try { sitemapUrls = await fetchSitemapUrls(siteUrl); } catch { /* none */ }
  const productRe = /\/products?\b|\/tienda\b|\/shop\b|\/catalog(?:o)?\b|\/store\b|\/collection|\/categoria|\/category|\/compounds?\b|\/item\b/i;
  const infoRe = /faq|preguntas|about|nosotros|quienes|contact|contacto|shipping|envio|delivery|returns?|devolucion|refund|reembolso|policy|policies|politica|terms|terminos|privacy|privacidad|help|ayuda|support|soporte|pricing|precios|services?|servicios?/i;
  for (const u of sitemapUrls.slice(0, 300)) {
    let path = "";
    try { path = new URL(u).pathname; } catch { continue; }
    addToIndex(u, productRe.test(path) ? "product" : infoRe.test(path) ? "info" : "page");
  }

  const allInternal = findAllInternalLinks(rawHome, siteUrl);
  const productLinks = Array.from(new Set([
    ...sitemapUrls.filter(u => { try { return productRe.test(new URL(u).pathname); } catch { return false; } }),
    ...findProductPageLinks(rawHome, siteUrl),
    ...allInternal,
  ]));
  await crawlPages(productLinks.slice(0, budgetPages), (link, html) => {
    if (products.length >= 200) return;
    const found = extractProductsFromHtml(html, link);
    for (const p of found) upsertProduct(products, p);
    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? "";
    const path = new URL(link).pathname;
    if (found.length === 0) {
      // No products here — it's an informational page. Let CONTENT decide what
      // a page is instead of its URL, so a policy page named anything at all
      // still gets learned rather than silently discarded.
      const text = htmlToText(html, 2500);
      if (text.length > 100) {
        pageExtracts.push({ path, text, title, kind: classifyInfoPage(path, title) });
        addToIndex(link, "info", title);
      } else {
        addToIndex(link, "page", title);
      }
    } else {
      addToIndex(link, "product", title);
    }
    pagesRead.push(path);
  }, { deadline });

  const readPaths = new Set(pagesRead);
  const infoLinks = Array.from(new Set([
    ...sitemapUrls.filter(u => { try { return infoRe.test(new URL(u).pathname); } catch { return false; } }),
    ...findInfoPageLinks(rawHome, siteUrl),
    ...allInternal.filter(u => { try { return !readPaths.has(new URL(u).pathname); } catch { return false; } }),
  ]));
  await crawlPages(infoLinks.slice(0, budgetPages), (link, html) => {
    const text = htmlToText(html, 2500);
    if (text.length <= 100) return;
    const path = new URL(link).pathname;
    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? "";
    pageExtracts.push({ path, text, title, kind: classifyInfoPage(path, title) });
    addToIndex(link, "info", title);
    pagesRead.push(path);
  }, { deadline });

  await hydrateMissingImages(products, deadline);

  // Same budgeted assembly as the owner scan: highest-value section first, and
  // a byte-aware final cut (MySQL TEXT is 65,535 BYTES, not characters).
  const clip = (t: string, max: number) => (t.length > max ? t.slice(0, max) + "\n… (truncated)" : t);
  const catalogSection = products.length > 0
    ? `=== PRODUCT CATALOG (${products.length} products detected) ===\n` + products.map((p, i) => {
        let line = `${i + 1}. ${p.name}`;
        if (p.price) line += ` | Price: ${p.price}`;
        if (p.description) line += ` | ${p.description}`;
        if (p.url) line += ` | URL: ${p.url}`;
        if (p.image) line += ` | IMG: ${p.image}`;
        return line;
      }).join("\n")
    : "";
  const infoSection = pageExtracts.length > 0
    ? pageExtracts.map(pg => `=== ${pg.kind} | ${pg.path}${pg.title ? ` | ${pg.title}` : ""} ===\n${pg.text}`).join("\n\n")
    : "";
  const mapSection = pageIndex.length > 0
    ? `=== SITE MAP (visible pages — only ever link to URLs from this list or the catalog) ===\n` +
      pageIndex.slice(0, 120).map(pg => `${pg.kind.toUpperCase().padEnd(7)} ${pg.path}${pg.title ? ` — ${pg.title}` : ""}`).join("\n")
    : "";
  const sellsProducts = products.length > 0 || /\/products?\b|\/shop\b|\/tienda\b|\/store\b|\/collection|add-to-cart|shopify|woocommerce/i.test(rawHome);

  let context = [
    `=== BUSINESS OVERVIEW ===\nSite: ${siteUrl}\nSells products online: ${sellsProducts ? "YES" : "not detected"}\nProducts found: ${products.length}\nPages read: ${pagesRead.length}`,
    clip(catalogSection, 26000),
    clip(infoSection, 20000),
    clip(mapSection, 4000),
    clip(htmlToText(rawHome, 4000), 4000),
  ].filter(Boolean).join("\n\n");
  if (Buffer.byteLength(context, "utf8") > 60000) {
    const buf = Buffer.from(context, "utf8").subarray(0, 60000);
    context = new TextDecoder("utf-8", { fatal: false }).decode(buf).replace(/\uFFFD+$/, "");
  }
  return { context, products: products.length, pagesRead, indexed: pageIndex.length };
}

export const appRouter = router({
  system: systemRouter,

  // ─── Site branding settings (global, admin-only writes) ─────────────────────
  siteSettings: router({
    // Public read: the portal (navbar, footer, favicon, auth panel) needs these
    // even before login, so anyone can read the current branding.
    get: publicProcedure.query(async () => {
      const db = await getDb();
      const defaults = {
        faviconUrl: "",
        menuLogoLightUrl: "",
        menuLogoDarkUrl: "",
        footerLogoLightUrl: "",
        footerLogoDarkUrl: "",
        authGradient: "",
      };
      if (!db) return defaults;
      try {
        const rows = await db.select().from(siteSettings);
        const map: Record<string, string> = {};
        for (const r of rows) map[r.settingKey] = r.settingValue ?? "";
        return { ...defaults, ...map };
      } catch {
        return defaults;
      }
    }),
    // Admin-only write: upsert one or more branding keys.
    save: adminProcedure
      .input(z.object({
        faviconUrl: z.string().max(1024).optional(),
        menuLogoLightUrl: z.string().max(1024).optional(),
        menuLogoDarkUrl: z.string().max(1024).optional(),
        footerLogoLightUrl: z.string().max(1024).optional(),
        footerLogoDarkUrl: z.string().max(1024).optional(),
        authGradient: z.string().max(512).optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { sql } = await import("drizzle-orm");
        for (const [key, value] of Object.entries(input)) {
          if (value === undefined) continue;
          // Upsert by unique settingKey
          await db.insert(siteSettings)
            .values({ settingKey: key, settingValue: value })
            .onDuplicateKeyUpdate({ set: { settingValue: value, updatedAt: sql`now()` } });
        }
        return { success: true } as const;
      }),
  }),

  // ─── Auth ──────────────────────────────────────────────────────────────────
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Chatbot config ────────────────────────────────────────────────────────
  chatbotConfig: router({
    // The canonical origin the widget script should be loaded from, so the
    // install snippet is stable regardless of which URL the dashboard is open on.
    widgetOrigin: protectedProcedure.query(async () => {
      return { origin: process.env.CANONICAL_ORIGIN?.replace(/\/+$/, "") || null };
    }),

    get: protectedProcedure.query(async ({ ctx }) => {
      const chatbot = await getChatbotByUserId(ctx.user.id);
      if (!chatbot) return null;
      // Ensure the chatbot has an API key (for existing chatbots created before this feature)
      if (!chatbot.apiKey) {
        await ensureChatbotApiKey(chatbot.id);
        const updated = await getChatbotByUserId(ctx.user.id);
        return updated ?? null;
      }
      return chatbot;
    }),
    save: protectedProcedure
      .input(z.object({
        // Allow an empty name — an empty name is a valid choice that makes the
        // widget show the full logo (with the brand baked in) instead of icon+text.
        name: z.string().max(128).optional(),
        primaryColor: z.string().optional(),
        secondaryColor: z.string().optional(),
        welcomeMessage: z.string().max(512).optional(),
        placeholder: z.string().max(256).optional(),
        position: z.enum(["bottom-right", "bottom-left"]).optional(),
        autoOpen: z.boolean().optional(),
        autoOpenDelay: z.number().int().min(0).max(60).optional(),
        language: z.string().max(8).optional(),
        isActive: z.boolean().optional(),
        // White-Label only: custom avatar/icon URL (can be a relative /manus-storage/... path)
        avatarUrl: z.string().nullable().optional(),
        // White-Label only: separate icon for the closed floating button (optional)
        buttonIconUrl: z.string().nullable().optional(),
        buttonColor: z.string().max(32).nullable().optional(),
        // Small legal/branding text shown under the chat input (e.g. "For educational purposes only")
        disclaimer: z.string().max(300).nullable().optional(),
        // White-Label only: rename or remove the "Powered by" badge.
        // NOTE: no .min(1) — an empty string is the legitimate way to hide it.
        poweredByText: z.string().max(64).nullable().optional(),
        poweredByUrl: z.string().max(255).nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Only default the name when it wasn't provided at all. An explicit empty
        // string is a valid choice (show the full logo) and must be preserved.
        const nameValue = input.name === undefined ? "Lynx AI" : input.name;
        // The badge is a White-Label feature: silently drop it on other plans so
        // a crafted request can't strip the branding.
        const data = { ...input };
        if ((ctx.user.plan ?? "cloud") !== "whitelabel") {
          delete data.poweredByText;
          delete data.poweredByUrl;
        }
        const chatbot = await upsertChatbot({ userId: ctx.user.id, ...data, name: nameValue });
        return chatbot;
      }),
    usage: protectedProcedure.query(async ({ ctx }) => {
      // getChatbotByUserId excludes client chatbots, so this is always the
      // reseller's OWN bot → the main allowance (8,000 on White-Label).
      const chatbot = await getChatbotByUserId(ctx.user.id);
      const plan = ctx.user.plan ?? "cloud";
      const limit = PLAN_LIMITS[plan] ?? 500;
      if (!chatbot) return { used: 0, limit, plan, resetAt: null };

      // Check if counter needs reset (new month)
      const now = new Date();
      const resetAt = chatbot.messagesResetAt ? new Date(chatbot.messagesResetAt) : new Date(0);
      const isNewMonth =
        now.getFullYear() !== resetAt.getFullYear() ||
        now.getMonth() !== resetAt.getMonth();

      const used = isNewMonth ? 0 : (chatbot.messagesThisMonth ?? 0);
      return { used, limit, plan, resetAt: chatbot.messagesResetAt };
    }),
  }),

  // ─── Site scanner ──────────────────────────────────────────────────────────
  scanner: router({
    scan: protectedProcedure
      .input(z.object({ url: z.string().url() }))
      .mutation(async ({ ctx, input }) => {
        // ─── Free plan: only 1 scan allowed ──────────────────────────────────
        if (ctx.user.plan === "free") {
          const existingChatbot = await getChatbotByUserId(ctx.user.id);
          if (existingChatbot?.lastScannedAt) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "FREE_PLAN_SCAN_LIMIT: Your free plan allows only 1 site scan. Upgrade to continue scanning.",
            });
          }
        }
        // ─── Per-plan crawl budget (total pages incl. home) ───────────────────
        // Hard wall-clock budget for the whole crawl. The edge proxy drops the
        // connection well before a minute-long request finishes, so we stop
        // crawling in time and answer with whatever we managed to read.
        const CRAWL_MS = 45000;
        const crawlDeadline = Date.now() + CRAWL_MS;

        // Page budgets. These were sized for the old one-page-at-a-time crawler;
        // with 6 parallel fetches inside a 45s window there is room for ~135-270
        // pages, so the budget — not the clock — was the limit on how much of a
        // site got learned. Raised accordingly; the deadline still protects the
        // request, so a slow site simply reads fewer pages instead of timing out.
        const crawlBudget =
          ctx.user.plan === "whitelabel" ? 120 :
          ctx.user.plan === "embedded" ? 60 :
          ctx.user.plan === "cloud" ? 25 : 6;

        // 1. Fetch HTML from the target URL via server-side request
        let htmlContent = "";
        let seoContext = "";
        let allProducts: ProductEntry[] = [];
        // Index of the site's visible pages (path + kind + title). Lets the
        // assistant answer "what sections do you have" and stops it inventing URLs.
        const sitePageIndex: { path: string; kind: string; title: string }[] = [];
        const addToIndex = (u: string, kind: string, title = "") => {
          try {
            const path = new URL(u).pathname;
            if (path === "/" && kind !== "home") return;
            if (!sitePageIndex.some(p => p.path === path)) sitePageIndex.push({ path, kind, title: title.slice(0, 70) });
          } catch { /* skip unparseable */ }
        };
        let rawHome = "";                    // raw home HTML kept for scoring
        let measuredLoadSpeed = 0;           // seconds, real fetch timing
        let realMobileScore = 0;             // heuristic from real HTML signals
        const pageExtracts: Array<{ path: string; text: string; title?: string; kind?: string }> = [];

        // ── Scan diagnostics: an honest, user-facing report of what we read,
        // what we couldn't, and any warnings — so the user can trust the result
        // and fix their own site if something is missing. ──
        const scanReport = {
          homeReadable: false,          // did the home page fetch return real content?
          sitemapFound: false,          // did we find a sitemap.xml?
          sitemapUrlCount: 0,           // how many URLs the sitemap listed
          storeCatalogFound: false,     // did a Shopify/Woo JSON catalog respond?
          productsFromHome: 0,          // products found in the home page markup
          productsFromCatalogPages: 0,  // products found while crawling catalog pages
          productsFromStoreApi: 0,      // products returned by the Shopify/Woo API
          productsWithImage: 0,         // how many ended up with a usable photo
          pagesRead: [] as string[],    // paths we actually read content from
          pagesFailed: [] as string[],  // paths that failed to load
          warnings: [] as string[],     // human-readable notes for the user
        };
        // Launch the real Lighthouse run (Google PageSpeed) in PARALLEL with the
        // crawl — it takes 15-40s and we await it right before scoring.
        const psiPromise = fetchPageSpeed(input.url);
        try {
          const fetchStart = Date.now();
          const { text: raw } = await safeFetchText(input.url);
          measuredLoadSpeed = Math.round(((Date.now() - fetchStart) / 1000) * 100) / 100;
          rawHome = raw;
          scanReport.homeReadable = raw.replace(/<[^>]+>/g, "").trim().length > 200;
          scanReport.pagesRead.push("/");
          addToIndex(input.url, "home", "");

          // ── Real mobile signals (heuristic, but from actual HTML) ──────────
          const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(raw);
          const hasSrcset = /srcset=|<picture/i.test(raw);
          realMobileScore = Math.min(100, 30 + (hasViewport ? 50 : 0) + (hasSrcset ? 20 : 0));

          // Extract technical SEO context BEFORE stripping tags
          const metaDesc = raw.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["'][^>]*/i)?.[1]
            ?? raw.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i)?.[1];
          const title = raw.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
          const h1Tags = Array.from(raw.matchAll(/<h1[^>]*>([^<]+)<\/h1>/gi)).map(m => m[1].trim()).slice(0, 3);
          const h2Tags = Array.from(raw.matchAll(/<h2[^>]*>([^<]+)<\/h2>/gi)).map(m => m[1].trim()).slice(0, 5);
          const hasJsonLd = /<script[^>]+type=["']application\/ld\+json["']/i.test(raw);
          const jsonLdTypes: string[] = [];
          const ldMatches = Array.from(raw.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi));
          for (const m of ldMatches) {
            try { const t = JSON.parse(m[1]); if (t["@type"]) jsonLdTypes.push(t["@type"]); } catch {}
          }
          const ogTitle = raw.match(/<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']*)["'][^>]*/i)?.[1];
          const ogDesc = raw.match(/<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']*)["'][^>]*/i)?.[1];
          const canonical = raw.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']*)["'][^>]*/i)?.[1];
          const imgCount = (raw.match(/<img/gi) ?? []).length;
          const imgWithAlt = (raw.match(/<img[^>]+alt=["'][^"']+["'][^>]*/gi) ?? []).length;
          const robotsMeta = raw.match(/<meta[^>]+name=["']robots["'][^>]*content=["']([^"']*)["'][^>]*/i)?.[1];

          seoContext = [
            `=== TECHNICAL SEO CONTEXT (already present in the HTML) ===`,
            `Title tag: ${title ?? "MISSING"}`,
            `Meta description: ${metaDesc ? `"${metaDesc.slice(0, 120)}"` : "MISSING"}`,
            `H1 tags (${h1Tags.length}): ${h1Tags.length ? h1Tags.join(" | ") : "NONE FOUND"}`,
            `H2 tags (${h2Tags.length}): ${h2Tags.length ? h2Tags.slice(0, 3).join(" | ") : "NONE FOUND"}`,
            `JSON-LD structured data: ${hasJsonLd ? `PRESENT (types: ${jsonLdTypes.join(", ") || "unknown"})` : "MISSING"}`,
            `Open Graph tags: ${ogTitle ? `PRESENT (og:title="${ogTitle.slice(0,60)}")` : "MISSING"}`,
            `Canonical URL: ${canonical ?? "MISSING"}`,
            `Robots meta: ${robotsMeta ?? "not set"}`,
            `Images: ${imgCount} total, ${imgWithAlt} with alt text, ${imgCount - imgWithAlt} missing alt`,
            `=== IMPORTANT: Do NOT suggest fixes for items already marked as PRESENT above ===`,
          ].join("\n");

          // Extract products from home page
          allProducts = extractProductsFromHtml(raw, input.url);
          scanReport.productsFromHome = allProducts.length;

          // ── Store JSON catalog (Shopify/WooCommerce) — the reliable path ───
          // This works even on JS-rendered stores, so the assistant always knows
          // the real products/prices/links without any manual training.
          try {
            const storeCatalog = await fetchStoreCatalog(input.url);
            if (storeCatalog.length > 0) scanReport.storeCatalogFound = true;
            scanReport.productsFromStoreApi = storeCatalog.length;
            for (const p of storeCatalog) {
              upsertProduct(allProducts, p);
            }
          } catch { /* no store API */ }

          // ── Discover ALL real pages via sitemap.xml (JS-proof) ────────────
          // Home-page <a> links miss most pages on SPA sites; the sitemap lists
          // every real URL. We classify them into product vs info pages.
          let sitemapUrls: string[] = [];
          try { sitemapUrls = await fetchSitemapUrls(input.url); } catch { /* none */ }
          scanReport.sitemapFound = sitemapUrls.length > 0;
          scanReport.sitemapUrlCount = sitemapUrls.length;
          const productPatternsRe = /\/products?\b|\/tienda\b|\/shop\b|\/catalog(?:o)?\b|\/store\b|\/collection|\/categoria|\/category|\/compounds?\b|\/item\b/i;
          const infoPatternsRe = /faq|preguntas|about|nosotros|quienes|contact|contacto|shipping|envio|delivery|returns?|devolucion|refund|reembolso|policy|policies|politica|terms|terminos|privacy|privacidad|help|ayuda|support|soporte|pricing|precios|services?|servicios?/i;
          const sitemapProductPages = sitemapUrls.filter(u => productPatternsRe.test(new URL(u).pathname));
          const sitemapInfoPages = sitemapUrls.filter(u => infoPatternsRe.test(new URL(u).pathname));
          // Index every discovered URL, not just the ones we have budget to read
          for (const u of sitemapUrls.slice(0, 300)) {
            const path = (() => { try { return new URL(u).pathname; } catch { return ""; } })();
            if (!path) continue;
            addToIndex(u, productPatternsRe.test(path) ? "product" : infoPatternsRe.test(path) ? "info" : "page");
          }

          // Always crawl product/catalog pages to build a fuller catalog.
          // Product-heavy sites list items across many collection pages, so we
          // crawl several and also try Shopify's /products.json when present.
          {
            // Prefer sitemap-discovered product pages (works on JS sites),
            // falling back to home-page links.
            const homeLinks = findProductPageLinks(raw, input.url);
            // Known catalog-looking URLs first, then EVERY other internal link:
            // discovery no longer depends on the site using words we recognize.
            const allInternal = findAllInternalLinks(raw, input.url);
            const productPageLinks = Array.from(new Set([...sitemapProductPages, ...homeLinks, ...allInternal]));
            const catalogBudget =
              ctx.user.plan === "whitelabel" ? 100 :
              ctx.user.plan === "embedded" ? 50 :
              ctx.user.plan === "cloud" ? 20 : 4;
            await crawlPages(productPageLinks.slice(0, catalogBudget), (link, pageHtml) => {
              if (allProducts.length >= 200) return;
              const found = extractProductsFromHtml(pageHtml, link);
              for (const p of found) upsertProduct(allProducts, p);
              const pageTitle = pageHtml.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? "";
              const path = new URL(link).pathname;
              if (found.length === 0) {
                // Not a product page after all — keep its text as an info page
                // so nothing read is thrown away just because of its URL.
                const text = htmlToText(pageHtml, 2500);
                if (text.length > 100) {
                  pageExtracts.push({ path, text, title: pageTitle, kind: classifyInfoPage(path, pageTitle) });
                  addToIndex(link, "info", pageTitle);
                } else {
                  addToIndex(link, "page", pageTitle);
                }
              } else {
                addToIndex(link, "product", pageTitle);
              }
              scanReport.pagesRead.push(path);
            }, {
              deadline: crawlDeadline,
              onFail: (link) => { try { scanReport.pagesFailed.push(new URL(link).pathname); } catch { /* bad url */ } },
            });
          }

          // ── Crawl informational pages (FAQ, about, policies, shipping…) ────
          // These are the pages visitors ask about most; budget is plan-based.
          // Merge sitemap-discovered info pages with home-page links.
          const homeInfoLinks = findInfoPageLinks(raw, input.url);
          // Same idea: recognized info pages first, then anything else internal
          // that the catalog pass did not already read.
          const alreadyRead = new Set(scanReport.pagesRead);
          const otherInternal = findAllInternalLinks(raw, input.url)
            .filter(u => { try { return !alreadyRead.has(new URL(u).pathname); } catch { return false; } });
          const infoLinks = Array.from(new Set([...sitemapInfoPages, ...homeInfoLinks, ...otherInternal]));
          const remainingBudget = Math.max(0, crawlBudget - 1); // home already fetched
          await crawlPages(infoLinks.slice(0, remainingBudget), (link, pageHtml) => {
            const text = htmlToText(pageHtml, 2500);
            if (text.length <= 100) return;
            const path = new URL(link).pathname;
            const pageTitle = pageHtml.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? "";
            pageExtracts.push({ path, text, title: pageTitle, kind: classifyInfoPage(path, pageTitle) });
            addToIndex(link, "info", pageTitle);
            scanReport.pagesRead.push(path);
          }, {
            deadline: crawlDeadline,
            onFail: (link) => { try { scanReport.pagesFailed.push(new URL(link).pathname); } catch { /* bad url */ } },
          });

          htmlContent = htmlToText(raw, 5000);
        } catch (err) {
          console.warn("[Scanner] Could not fetch URL:", err);
          htmlContent = `Site at ${input.url} (content could not be fetched, analyze based on URL structure)`;
          seoContext = "(HTML not accessible — analyze based on URL structure only)";
          scanReport.warnings.push("We could not read the site's homepage. Check that the URL is correct and the site is online and publicly accessible.");
        }

        // ── Build human-readable warnings from what we found (or didn't) ──────
        if (scanReport.homeReadable && !scanReport.sitemapFound) {
          scanReport.warnings.push("No sitemap.xml was found. We read the pages linked from the homepage, but a sitemap helps discover ALL your pages. Consider adding one (most platforms generate it automatically).");
        }
        if (scanReport.homeReadable && scanReport.pagesRead.length <= 1 && !scanReport.storeCatalogFound) {
          scanReport.warnings.push("We could only read the homepage. If your site loads its content with JavaScript, other pages may not be readable by an automated reader — make sure you have a sitemap and regular internal links.");
        }
        if (Date.now() > crawlDeadline) {
          scanReport.warnings.push("The scan hit its time limit, so some pages were not read. Everything we did read was saved — run the scan again to pick up more.");
        }
        if (scanReport.pagesFailed.length > 0) {
          scanReport.warnings.push(`Some pages could not be read (${scanReport.pagesFailed.length}): ${scanReport.pagesFailed.slice(0, 5).join(", ")}${scanReport.pagesFailed.length > 5 ? "\u2026" : ""}.`);
        }

        // ── GTmetrix-style SEO/performance report ────────────────────────────
        // Numbers come from REAL measurements (HTTP timing, headers, bytes) and
        // graded checks — never from the LLM. Weighted category scores like
        // Lighthouse: Performance 30, SEO 35, Social 10, Structure 15, Security 10.
        const httpMeasure = rawHome ? await measureHttp(input.url) : null;
        // Lighthouse can take 45s on its own. Never let it push the request past
        // the proxy window: if it is not back in time, score without it.
        const psiResult = rawHome
          ? await Promise.race([
              psiPromise,
              new Promise<null>((resolve) => setTimeout(() => resolve(null), Math.max(2000, crawlDeadline + 15000 - Date.now()))),
            ])
          : null;
        const seoBreakdown = rawHome
          ? computeSeoBreakdown(rawHome, httpMeasure, Math.round(measuredLoadSpeed * 1000), scanReport.sitemapFound, input.url, psiResult)
          : null;
        const realSeoScore = seoBreakdown?.score ?? 0;

        // ── Real top pages from widget analytics (page_view events, 30 days) ─
        let realTopPages: Array<{ url: string; title: string; visits: number; bounceRate: number }> = [];
        try {
          const dbA = await getDb();
          if (dbA) {
            const { sql: sqlOp, eq: eqA, and: andA, gte: gteA } = await import("drizzle-orm");
            const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const existingBot = await getChatbotByUserId(ctx.user.id);
            if (!existingBot) throw new Error("no chatbot yet");
            const rows = await dbA
              .select({ pageUrl: analyticsEvents.pageUrl, visits: sqlOp<number>`COUNT(*)` })
              .from(analyticsEvents)
              .where(andA(
                eqA(analyticsEvents.chatbotId, existingBot.id),
                eqA(analyticsEvents.eventType, "page_view"),
                gteA(analyticsEvents.createdAt, since),
              ))
              .groupBy(analyticsEvents.pageUrl)
              .orderBy(sqlOp`COUNT(*) DESC`)
              .limit(6);
            realTopPages = rows
              .filter(r => r.pageUrl)
              .map(r => {
                let path = r.pageUrl as string;
                try { path = new URL(r.pageUrl as string).pathname; } catch { /* keep raw */ }
                return { url: path, title: path === "/" ? "Homepage" : path, visits: Number(r.visits), bounceRate: 0 };
              });
          }
        } catch { /* analytics optional */ }

        // 2. Ask LLM to analyze the site
        const prompt = `You are an expert SEO and web content analyst. Analyze the following website and return a structured JSON report.

URL: ${input.url}

${seoContext}

Page text content (truncated):
${htmlContent}

Return ONLY valid JSON matching this exact schema:
{
  "summary": "2-3 sentence description of what the site is about",
  "topics": ["topic1", "topic2", "topic3", "topic4", "topic5"],
  "keywords": [
    {"keyword": "example keyword", "count": 12, "density": 1.8}
  ],
  "seoScore": 72,
  "suggestions": [
    {"type": "meta", "priority": "high", "message": "Add meta descriptions to 3 pages", "page": "/products"},
    {"type": "content", "priority": "medium", "message": "Improve heading structure on homepage"}
  ],
  "topPages": [
    {"url": "/", "title": "Homepage", "visits": 0, "bounceRate": 0}
  ],
  "metaIssues": [
    {"page": "/contact", "issue": "Missing meta description", "severity": "high"}
  ],
  "loadSpeed": 2.4,
  "mobileScore": 78,
  "pagesEstimate": 12,
  "productsEstimate": 0,
  "policiesEstimate": 1,
  "blogEstimate": 0,
  "languages": ["English"]
}`;

        const response = await invokeLLM({
          model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5",
          messages: [{ role: "user", content: prompt }],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "site_analysis",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  summary: { type: "string" },
                  topics: { type: "array", items: { type: "string" } },
                  keywords: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        keyword: { type: "string" },
                        count: { type: "number" },
                        density: { type: "number" },
                      },
                      required: ["keyword", "count", "density"],
                      additionalProperties: false,
                    },
                  },
                  seoScore: { type: "number" },
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string" },
                        priority: { type: "string" },
                        message: { type: "string" },
                        page: { type: "string" },
                      },
                      required: ["type", "priority", "message", "page"],
                      additionalProperties: false,
                    },
                  },
                  topPages: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        url: { type: "string" },
                        title: { type: "string" },
                        visits: { type: "number" },
                        bounceRate: { type: "number" },
                      },
                      required: ["url", "title", "visits", "bounceRate"],
                      additionalProperties: false,
                    },
                  },
                  metaIssues: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        page: { type: "string" },
                        issue: { type: "string" },
                        severity: { type: "string" },
                      },
                      required: ["page", "issue", "severity"],
                      additionalProperties: false,
                    },
                  },
                  loadSpeed: { type: "number" },
                  mobileScore: { type: "number" },
                  pagesEstimate: { type: "number" },
                  productsEstimate: { type: "number" },
                  policiesEstimate: { type: "number" },
                  blogEstimate: { type: "number" },
                  languages: { type: "array", items: { type: "string" } },
                },
                required: ["summary", "topics", "keywords", "seoScore", "suggestions", "topPages", "metaIssues", "loadSpeed", "mobileScore", "pagesEstimate", "productsEstimate", "policiesEstimate", "blogEstimate", "languages"],
                additionalProperties: false,
              },
            },
          },
        });

        const rawContent = response.choices[0]?.message?.content;
        const analysis = typeof rawContent === "string" ? JSON.parse(rawContent) : {};

        // 3. Get or create chatbot for this user
        let chatbot = await getChatbotByUserId(ctx.user.id);
        if (!chatbot) {
          chatbot = await upsertChatbot({ userId: ctx.user.id, name: "Lynx AI" });
        }

        scanReport.productsFromCatalogPages = Math.max(
          0,
          allProducts.length - scanReport.productsFromHome - scanReport.productsFromStoreApi
        );

        // Fill in any product photo the catalog sources did not provide
        await hydrateMissingImages(allProducts, crawlDeadline);
        scanReport.productsWithImage = allProducts.filter(p => p.image).length;

        if (allProducts.length === 0 && scanReport.homeReadable) {
          scanReport.warnings.push("No products were detected. If this site sells online, its catalog is probably rendered by JavaScript or uses a layout we could not read — check that product pages expose structured data (JSON-LD) or an og:image, and that a sitemap.xml lists them.");
        } else if (allProducts.length > 0 && scanReport.productsWithImage === 0) {
          scanReport.warnings.push("Products were found but none had a usable photo, so product cards in the chat will show a placeholder. Adding an og:image tag to each product page fixes this.");
        }

        // 4. Build product catalog section for chatbot context
        let productCatalogSection = "";
        if (allProducts.length > 0) {
          const productLines = allProducts.map((p, i) => {
            let line = `${i + 1}. ${p.name}`;
            if (p.price) line += ` | Price: ${p.price}`;
            if (p.description) line += ` | ${p.description}`;
            if (p.url) line += ` | URL: ${p.url}`;
            if (p.image) line += ` | IMG: ${p.image}`;
            return line;
          });
          productCatalogSection = `\n\n=== PRODUCT CATALOG (${allProducts.length} products detected) ===\n${productLines.join("\n")}`;
        }

        // 4. Save site context to chatbot (includes product catalog + info pages)
        const infoPagesSection = pageExtracts.length > 0
          ? pageExtracts.map(pg => `=== ${(pg as { kind?: string }).kind ?? "PAGE"} | ${pg.path}${(pg as { title?: string }).title ? ` | ${(pg as { title?: string }).title}` : ""} ===\n${pg.text}`).join("\n\n")
          : "";
        // Explicit business-type signal so the assistant always knows whether
        // this business sells products — even if the catalog came back thin.
        const sellsProducts = allProducts.length > 0 || /\/products?\b|\/shop\b|\/tienda\b|\/store\b|\/collection|add-to-cart|shopify|woocommerce/i.test(rawHome);
        const businessSignal = [
          `=== BUSINESS OVERVIEW ===`,
          `Sells products online: ${sellsProducts ? "YES" : "not detected"}`,
          allProducts.length > 0
            ? `Products found in scan: ${allProducts.length}`
            : (sellsProducts ? `Products found in scan: 0 (store detected but catalog not machine-readable — tell the visitor products exist and point them to the shop page)` : ``),
          `Pages scanned: ${1 + pageExtracts.length + (allProducts.length > 0 ? 1 : 0)}`,
        ].filter(Boolean).join("\n");

        // ── Assemble the knowledge base under an explicit budget ─────────────
        // MySQL TEXT holds 65,535 BYTES (not chars). The old code appended
        // everything and cut the tail, so on content-rich sites the PRODUCT
        // CATALOG — the most valuable section, and the last one — was silently
        // truncated away: the assistant looked like it had "learned nothing".
        // Now each section gets its own budget, highest value first, and the
        // final cut is byte-aware.
        const BUDGET_TOTAL = 60000;
        const budgets = {
          catalog: 26000,   // products with URL + image: what powers the cards
          info: 20000,      // policies, shipping, returns, FAQ, about
          sitemap: 4000,    // what sections exist, so it never invents pages
          home: 4000,
        };
        const clip = (t: string, max: number) => (t.length > max ? t.slice(0, max) + "\n… (truncated)" : t);

        // A map of the site's visible sections, so the assistant knows what
        // exists even for pages it did not read in full — and never invents a URL.
        const siteMapSection = sitePageIndex.length > 0
          ? `=== SITE MAP (visible pages — only ever link to URLs from this list or the catalog) ===\n` +
            sitePageIndex.slice(0, 120).map(pg => `${pg.kind.toUpperCase().padEnd(7)} ${pg.path}${pg.title ? ` — ${pg.title}` : ""}`).join("\n")
          : "";

        const sections = [
          analysis.summary,
          `Topics: ${(analysis.topics ?? []).join(", ")}`,
          businessSignal,
          clip(productCatalogSection, budgets.catalog),
          clip(infoPagesSection, budgets.info),
          clip(siteMapSection, budgets.sitemap),
          clip(htmlContent, budgets.home),
        ].filter(Boolean);

        let siteContextText = sections.join("\n\n");
        // Byte-aware final cut: accented content makes chars ≠ bytes, and going
        // over the column limit truncates mid-word (or errors in strict mode).
        if (Buffer.byteLength(siteContextText, "utf8") > BUDGET_TOTAL) {
          const buf = Buffer.from(siteContextText, "utf8").subarray(0, BUDGET_TOTAL);
          siteContextText = new TextDecoder("utf-8", { fatal: false }).decode(buf).replace(/\uFFFD+$/, "");
        }
        await updateChatbotSiteContext(chatbot.id, input.url, siteContextText);

        // 5. Save SEO report
        // Real, measured metrics override anything the LLM estimated
        const finalScore = realSeoScore > 0 ? realSeoScore : (analysis.seoScore ?? 0);
        const finalTopPages = realTopPages.length > 0 ? realTopPages : [];
        await saveSeoReport({
          chatbotId: chatbot.id,
          siteUrl: input.url,
          score: finalScore,
          keywords: analysis.keywords ?? [],
          suggestions: analysis.suggestions ?? [],
          topPages: finalTopPages,
          metaIssues: [
            // Real measured checks first (warn/fail) — these are facts, not LLM opinion
            ...(seoBreakdown?.checks ?? [])
              .filter((c) => c.status !== "pass")
              .map((c) => ({ page: "/", issue: `${c.label}: ${c.detail}`, severity: c.status === "fail" ? "high" : "medium" })),
            ...(analysis.metaIssues ?? []),
          ].slice(0, 20),
          loadSpeed: measuredLoadSpeed,
          mobileScore: realMobileScore,
        });

        // 6. Save to seo_history for trend tracking
        try {
          const dbH = await getDb();
          if (dbH) {
            await dbH.insert(seoHistory).values({
              userId: ctx.user.id,
              chatbotId: chatbot.id,
              siteUrl: input.url,
              score: finalScore,
              loadSpeed: measuredLoadSpeed || null,
              mobileScore: realMobileScore || null,
              issuesCount: (analysis.suggestions ?? []).filter((s: { priority: string }) => s.priority === "high").length,
            });
          }
        } catch (_) { /* non-critical */ }

        // 7. Save scan_complete notification
        await saveNotification({
          userId: ctx.user.id,
          type: "scan_complete",
          title: "Site scan completed",
          message: `${input.url} was scanned successfully. SEO score: ${finalScore}/100.`,
          metadata: { url: input.url, score: finalScore },
        });

        return {
          ...analysis,
          seoScore: finalScore,
          // GTmetrix-style breakdown: weighted category scores + graded checks,
          // all from real measurements (HTTP timing/headers/HTML analysis).
          seoBreakdown,
          loadSpeed: measuredLoadSpeed,
          mobileScore: realMobileScore,
          topPages: finalTopPages,
          pagesCrawled: 1 + pageExtracts.length,
          chatbotId: chatbot.id,
          productsFound: allProducts.length,
          products: allProducts.slice(0, 10),
          // Honest read report so the user sees exactly what was scanned.
          scanReport: {
            homeReadable: scanReport.homeReadable,
            sitemapFound: scanReport.sitemapFound,
            sitemapUrlCount: scanReport.sitemapUrlCount,
            storeCatalogFound: scanReport.storeCatalogFound,
            productsFromHome: scanReport.productsFromHome,
            productsFromCatalogPages: scanReport.productsFromCatalogPages,
            productsFromStoreApi: scanReport.productsFromStoreApi,
            productsWithImage: scanReport.productsWithImage,
            pagesRead: scanReport.pagesRead,
            pagesReadCount: scanReport.pagesRead.length,
            pagesFailed: scanReport.pagesFailed,
            warnings: scanReport.warnings,
          },
        };
      }),

    getLastReport: protectedProcedure.query(async ({ ctx }) => {
      const chatbot = await getChatbotByUserId(ctx.user.id);
      if (!chatbot) return null;
      return await getLatestSeoReport(chatbot.id) ?? null;
    }),
  }),


  // ─── Training (custom instructions + knowledge base, plan-gated) ───────────
  training: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const chatbot = await getChatbotByUserId(ctx.user.id);
      const limits = trainingLimitsForPlan(ctx.user.plan);
      if (!chatbot) return { customInstructions: "", knowledgeBase: [], limits };
      return {
        customInstructions: chatbot.customInstructions ?? "",
        knowledgeBase: parseKnowledgeBase(chatbot.knowledgeBase),
        limits,
      };
    }),

    update: protectedProcedure
      .input(z.object({
        customInstructions: z.string().max(4000).optional(),
        knowledgeBase: z.array(z.object({
          title: z.string().min(1).max(120),
          content: z.string().min(1).max(2000),
        })).max(100).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const limits = trainingLimitsForPlan(ctx.user.plan);
        if (!limits.instructionsEnabled) {
          throw new TRPCError({ code: "FORBIDDEN", message: "FREE_PLAN_NO_TRAINING: Upgrade your plan to train your chatbot." });
        }
        if (input.knowledgeBase !== undefined) {
          if (!limits.knowledgeEnabled) {
            throw new TRPCError({ code: "FORBIDDEN", message: "PLAN_NO_KNOWLEDGE_BASE: Your plan does not include the knowledge base. Upgrade to add entries." });
          }
          if (input.knowledgeBase.length > limits.maxKnowledgeEntries) {
            throw new TRPCError({ code: "BAD_REQUEST", message: `KNOWLEDGE_LIMIT: Your plan allows up to ${limits.maxKnowledgeEntries} knowledge entries.` });
          }
        }
        if (input.customInstructions !== undefined && input.customInstructions.length > limits.maxInstructionsChars) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `INSTRUCTIONS_LIMIT: Your plan allows up to ${limits.maxInstructionsChars} characters of instructions.` });
        }

        const chatbot = await getChatbotByUserId(ctx.user.id);
        if (!chatbot) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Create your chatbot first." });
        }

        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        const { eq: eqOp } = await import("drizzle-orm");
        await db.update(chatbots).set({
          ...(input.customInstructions !== undefined ? { customInstructions: input.customInstructions } : {}),
          ...(input.knowledgeBase !== undefined ? { knowledgeBase: input.knowledgeBase as never } : {}),
        }).where(eqOp(chatbots.id, chatbot.id));

        return { saved: true };
      }),
  }),

  // ─── Chatbot AI chat ───────────────────────────────────────────────────────
  chatbot: router({
    chat: protectedProcedure
      .input(z.object({
        message: z.string().min(1).max(2000),
        siteContext: z.string().optional(),
        chatbotName: z.string().optional(),
        history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).max(20).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        checkTestChatRateLimit(ctx.user.id);
        // Include the user's real training (instructions + knowledge base) so
        // the dashboard test chat behaves exactly like the live widget.
        const ownChatbot = await getChatbotByUserId(ctx.user.id);
        const trainingSection = ownChatbot ? buildTrainingPromptSection(ownChatbot) : "";
        const effectiveContext = input.siteContext ?? ownChatbot?.siteContext ?? "";
        const systemPrompt = `You are ${input.chatbotName ?? ownChatbot?.name ?? "Lynx AI"}, an intelligent AI assistant installed on a website.
Your mission is to help visitors with questions about the site, its products, policies and services.
Always respond concisely, in a friendly and helpful manner. If you don't know something, say so honestly.${trainingSection}
${effectiveContext ? `\n\nSite context:\n${effectiveContext}` : ""}`;
        const messages = [
          { role: "system" as const, content: systemPrompt },
          ...(input.history ?? []).map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
          { role: "user" as const, content: input.message },
        ];
        const response = await invokeLLM({ model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5", messages });
        const reply = response.choices[0]?.message?.content ?? "Sorry, I could not process your request.";
        return { reply };
      }),

    saveConversation: publicProcedure
      .input(z.object({
        chatbotId: z.number().int(),
        visitorId: z.string().optional(),
        messages: z.array(z.object({ role: z.string(), content: z.string(), timestamp: z.number() })),
        satisfactionRating: z.number().int().min(1).max(5).optional(),
        isLead: z.boolean().optional(),
        leadEmail: z.string().email().optional(),
        leadName: z.string().optional(),
        pageUrl: z.string().optional(),
        duration: z.number().int().optional(),
      }))
      .mutation(async ({ input }) => {
        await saveConversation(input);
        return { saved: true };
      }),
  }),

  // ─── Conversations ─────────────────────────────────────────────────────────
  conversations: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const chatbot = await getChatbotByUserId(ctx.user.id);
      if (!chatbot) return [];
      return await getConversationsByChatbot(chatbot.id);
    }),
  }),

  // ─── Leads ─────────────────────────────────────────────────────────────────
  leads: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      // Free plan: no access to leads
      if (ctx.user.plan === "free") {
        throw new TRPCError({ code: "FORBIDDEN", message: "FREE_PLAN_NO_LEADS: Upgrade your plan to access leads." });
      }
      const chatbot = await getChatbotByUserId(ctx.user.id);
      if (!chatbot) return [];
      const db = await getDb();
      if (!db) return [];
      const { desc, eq, and, or, isNotNull } = await import("drizzle-orm");
      const rows = await db
        .select({
          id: conversations.id,
          leadName: conversations.leadName,
          leadEmail: conversations.leadEmail,
          leadCompany: conversations.leadCompany,
          pageUrl: conversations.pageUrl,
          satisfactionRating: conversations.satisfactionRating,
          createdAt: conversations.createdAt,
        })
        .from(conversations)
        .where(and(
          eq(conversations.chatbotId, chatbot.id),
          or(eq(conversations.isLead, true), isNotNull(conversations.leadEmail)),
        ))
        .orderBy(desc(conversations.createdAt));
      return rows;
    }),

    getTranscript: protectedProcedure
      .input(z.object({ conversationId: z.number().int() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.plan === "free") {
          throw new TRPCError({ code: "FORBIDDEN", message: "FREE_PLAN_NO_LEADS: Upgrade your plan to access leads." });
        }
        const chatbot = await getChatbotByUserId(ctx.user.id);
        if (!chatbot) return { messages: [] };
        const db = await getDb();
        if (!db) return { messages: [] };
        const { eq: eqT, and: andT } = await import("drizzle-orm");
        const rows = await db
          .select({ messages: conversations.messages })
          .from(conversations)
          // Ownership check: the conversation must belong to THIS user's chatbot
          .where(andT(eqT(conversations.id, input.conversationId), eqT(conversations.chatbotId, chatbot.id)))
          .limit(1);
        let msgs: Array<{ role: string; content: string; timestamp: number }> = [];
        const rawMsgs = rows[0]?.messages;
        if (Array.isArray(rawMsgs)) msgs = rawMsgs;
        else if (typeof rawMsgs === "string") {
          try { const parsed = JSON.parse(rawMsgs); if (Array.isArray(parsed)) msgs = parsed; } catch { /* corrupt */ }
        }
        return { messages: msgs };
      }),
  }),

  // ─── SEO ───────────────────────────────────────────────────────────────────
  seo: router({
    getReport: protectedProcedure.query(async ({ ctx }) => {
      const chatbot = await getChatbotByUserId(ctx.user.id);
      if (!chatbot) return null;
      return await getLatestSeoReport(chatbot.id) ?? null;
    }),
    getHistory: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const { eq: eqOp, desc: descOp } = await import("drizzle-orm");
      return db
        .select()
        .from(seoHistory)
        .where(eqOp(seoHistory.userId, ctx.user.id))
        .orderBy(descOp(seoHistory.scannedAt))
        .limit(20);
    }),
  }),

  // ─── Contact form ────────────────────────────────────────────────────────────
  contact: router({
    send: publicProcedure
      .input(z.object({
        name: z.string().min(1).max(128),
        email: z.string().email(),
        company: z.string().max(128).optional(),
        plan: z.enum(["basic", "pro", "white-label", "other"]).optional(),
        message: z.string().min(10).max(2000),
      }))
      .mutation(async ({ input }) => {
        const sent = await notifyOwner({
          title: `New contact from ${input.name}`,
          content: `Name: ${input.name}\nEmail: ${input.email}${input.company ? `\nCompany: ${input.company}` : ""}${input.plan ? `\nInterested in: ${input.plan}` : ""}\n\nMessage:\n${input.message}\n\n---\nReply to: support@lynxaiassistant.com`,
        });
        return { sent };
      }),
  }),

  // ─── Admin ─────────────────────────────────────────────────────────────
  admin: router({
    stats: adminProcedure.query(async () => {
      return await getAdminStats();
    }),
    listUsers: adminProcedure
      .input(z.object({ limit: z.number().optional(), offset: z.number().optional(), search: z.string().optional() }))
      .query(async ({ input }) => {
        return await getAllUsers(input);
      }),
    updatePlan: adminProcedure
      .input(z.object({ userId: z.number().int(), plan: z.enum(["free", "cloud", "embedded", "whitelabel"]) }))
      .mutation(async ({ input }) => {
        await updateUserPlan(input.userId, input.plan);
        return { ok: true };
      }),
    toggleBan: adminProcedure
      .input(z.object({ userId: z.number().int(), banned: z.boolean() }))
      .mutation(async ({ input }) => {
        await toggleUserBan(input.userId, input.banned);
        return { ok: true };
      }),
    updateRole: adminProcedure
      .input(z.object({ userId: z.number().int(), role: z.enum(["user", "admin"]) }))
      .mutation(async ({ input }) => {
        await updateUserRole(input.userId, input.role);
        return { ok: true };
      }),
  }),

  // ─── Analytics ───────────────────────────────────────────────────────────
  analytics: router({
    weekly: protectedProcedure.query(async ({ ctx }) => {
      const chatbot = await getChatbotByUserId(ctx.user.id);
      if (!chatbot) return { visits: [], clicks: [] };
      const [visits, clicks] = await Promise.all([
        getWeeklyAnalytics(chatbot.id),
        getClicksByPage(chatbot.id),
      ]);
      return { visits, clicks };
    }),
  }),

  // ─── Notifications ─────────────────────────────────────────────────────────
  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getNotificationsByUser(ctx.user.id);
    }),
    markRead: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ input }) => {
        await markNotificationRead(input.id);
        return { ok: true };
      }),
    notifyNewLead: protectedProcedure
      .input(z.object({ email: z.string().email(), page: z.string(), message: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        await saveNotification({
          userId: ctx.user.id,
          type: "new_lead",
          title: "New lead captured",
          message: `${input.email} left their contact from ${input.page}${input.message ? ` — "${input.message}"` : ""}`,
          metadata: { email: input.email, page: input.page },
        });
        const sent = await notifyOwner({
          title: "New lead captured by Lynx AI",
          content: `Email: ${input.email}\nPage: ${input.page}${input.message ? `\nMessage: ${input.message}` : ""}`,
        });
        return { sent };
      }),
    notifyLowRating: protectedProcedure
      .input(z.object({ rating: z.number(), page: z.string(), visitorId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await saveNotification({
          userId: ctx.user.id,
          type: "low_rating",
          title: `Low rating received: ${input.rating}/5`,
          message: `Visitor ${input.visitorId} rated the conversation ${input.rating} stars on ${input.page}`,
          metadata: { rating: input.rating, page: input.page },
        });
        const sent = await notifyOwner({
          title: `Low rating received: ${input.rating}/5`,
          content: `Visitor: ${input.visitorId}\nPage: ${input.page}\nRating: ${input.rating} stars`,
        });
        return { sent };
      }),
    notifySEOIssue: protectedProcedure
      .input(z.object({ issue: z.string(), page: z.string().optional(), severity: z.enum(["high", "medium", "low"]) }))
      .mutation(async ({ ctx, input }) => {
        await saveNotification({
          userId: ctx.user.id,
          type: "seo_issue",
          title: `SEO issue ${input.severity === "high" ? "critical" : "detected"}`,
          message: `${input.issue}${input.page ? ` — Page: ${input.page}` : ""}`,
          metadata: { issue: input.issue, page: input.page, severity: input.severity },
        });
        const sent = await notifyOwner({
          title: `SEO issue ${input.severity === "high" ? "critical" : "detected"}`,
          content: `Issue: ${input.issue}${input.page ? `\nPage: ${input.page}` : ""}`,
        });
        return { sent };
      }),
  }),

  // ─── Onboarding ─────────────────────────────────────────────────────────────────────────────
  onboarding: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const progress = await getOnboardingProgress(ctx.user.id);
      return progress ?? { step1Done: false, step2Done: false, step3Done: false, completedAt: null };
    }),
    update: protectedProcedure
      .input(z.object({
        step1Done: z.boolean().optional(),
        step2Done: z.boolean().optional(),
        step3Done: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const current = await getOnboardingProgress(ctx.user.id);
        const newData = {
          step1Done: input.step1Done ?? current?.step1Done ?? false,
          step2Done: input.step2Done ?? current?.step2Done ?? false,
          step3Done: input.step3Done ?? current?.step3Done ?? false,
        };
        const allDone = newData.step1Done && newData.step2Done && newData.step3Done;
        await upsertOnboardingProgress(ctx.user.id, {
          ...newData,
          completedAt: allDone && !current?.completedAt ? new Date() : (current?.completedAt ?? null),
        });
        return { ...newData, completedAt: allDone ? new Date() : null };
      }),
    skip: protectedProcedure.mutation(async ({ ctx }) => {
      await upsertOnboardingProgress(ctx.user.id, {
        step1Done: true, step2Done: true, step3Done: true,
        completedAt: new Date(),
      });
      return { skipped: true };
    }),
  }),

  // ─── User profile ────────────────────────────────────────────────────────────────────────────────
  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const { getUserById } = await import("./db");
      const user = await getUserById(ctx.user.id);
      if (!user) throw new Error("User not found");
      return {
        id: user.id,
        name: user.name ?? "",
        email: user.email ?? "",
        emailVerified: user.emailVerified,
        loginMethod: user.loginMethod ?? "email",
        plan: user.plan,
        createdAt: user.createdAt,
      };
    }),
    updateName: protectedProcedure
      .input(z.object({ name: z.string().min(1).max(128) }))
      .mutation(async ({ ctx, input }) => {
        await updateUserName(ctx.user.id, input.name.trim());
        return { success: true };
      }),
    changePassword: protectedProcedure
      .input(z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8).max(128),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getUserById, updatePassword } = await import("./db");
        const bcrypt = await import("bcryptjs");
        const user = await getUserById(ctx.user.id);
        if (!user) throw new Error("User not found");
        if (!user.passwordHash) {
          throw new Error("This account uses social login and does not have a password");
        }
        const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
        if (!valid) throw new Error("Current password is incorrect");
        const hash = await bcrypt.hash(input.newPassword, 12);
        await updatePassword(ctx.user.id, hash);
        return { success: true };
      }),
    resendVerification: protectedProcedure.mutation(async ({ ctx }) => {
      const { getUserById } = await import("./db");
      const { sendVerificationEmail } = await import("./email");
      const { randomBytes } = await import("crypto");
      const { getDb } = await import("./db");
      const { users } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const user = await getUserById(ctx.user.id);
      if (!user) throw new Error("User not found");
      if (user.emailVerified) return { alreadyVerified: true };
      const token = randomBytes(32).toString("hex");
      const db = await getDb();
      if (db) {
        await db.update(users).set({ verificationToken: token }).where(eq(users.id, ctx.user.id));
      }
      await sendVerificationEmail(user.email ?? "", user.name ?? "", token, "https://lynxaiassistant.com");
      return { sent: true };
    }),

    // ── Push notification preferences ────────────────────────────────────────
    getPushPrefs: protectedProcedure.query(async ({ ctx }) => {
      const { getUserById } = await import("./db");
      const user = await getUserById(ctx.user.id);
      if (!user) throw new Error("User not found");
      // Default: all enabled
      return {
        newLead: user.pushPrefs?.newLead ?? true,
        lowRating: user.pushPrefs?.lowRating ?? true,
        usageLimit: user.pushPrefs?.usageLimit ?? true,
      };
    }),
    updatePushPrefs: protectedProcedure
      .input(z.object({
        newLead: z.boolean(),
        lowRating: z.boolean(),
        usageLimit: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const { users } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        await db.update(users).set({ pushPrefs: input }).where(eq(users.id, ctx.user.id));
        return { success: true };
      }),
    }),

  // ─── Blog ──────────────────────────────────────────────────────────────────────────────
  blog: router({
    list: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(50).default(20), offset: z.number().min(0).default(0) }).optional())
      .query(async ({ input }) => {
        const { limit = 20, offset = 0 } = input ?? {};
        return getPublishedBlogPosts(limit, offset);
      }),

    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        return getBlogPostBySlug(input.slug);
      }),

    // Admin procedures
    adminList: adminProcedure
      .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }).optional())
      .query(async ({ input }) => {
        const { limit = 50, offset = 0 } = input ?? {};
        return getAllBlogPostsAdmin(limit, offset);
      }),

    generate: adminProcedure
      .input(z.object({
        topic: z.string().min(3).max(200),
        tone: z.enum(["professional", "friendly", "persuasive"]).default("friendly"),
        language: z.enum(["es", "en", "pt", "fr", "de", "it"]).default("es"),
      }))
      .mutation(async ({ input }) => {
        const langNames: Record<string, string> = {
          es: "Spanish", en: "English", pt: "Portuguese",
          fr: "French", de: "German", it: "Italian",
        };
        const langName = langNames[input.language] ?? "Spanish";
        const toneDesc = input.tone === "professional" ? "professional and authoritative"
          : input.tone === "persuasive" ? "persuasive and sales-oriented, guiding the reader toward trying Lynx AI"
          : "warm, friendly and approachable";
        const prompt = `You are a senior content writer for Lynx AI, an AI chatbot platform for businesses.
Write a complete, original blog article in ${langName} about: "${input.topic}".
Tone: ${toneDesc}.
Return ONLY a JSON object (no markdown fences) with this exact shape:
{
  "title": "compelling article title",
  "slug": "url-friendly-slug",
  "excerpt": "1-2 sentence summary under 160 characters",
  "category": "a short category name",
  "tags": ["tag1", "tag2", "tag3"],
  "readingTimeMinutes": estimated_number,
  "content": "full article body as clean semantic HTML using <h2>, <h3>, <p>, <ul>, <li>, <strong>, <blockquote> tags. 600-900 words. Start with an <h2>. End with a call to action mentioning Lynx AI."
}`;
        const response = await invokeLLM({
          model: "claude-haiku-4-5",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 4000,
          responseFormat: {
            type: "json_schema",
            json_schema: {
              name: "blog_article",
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  slug: { type: "string" },
                  excerpt: { type: "string" },
                  category: { type: "string" },
                  tags: { type: "array", items: { type: "string" } },
                  readingTimeMinutes: { type: "number" },
                  content: { type: "string" },
                },
                required: ["title", "slug", "excerpt", "category", "tags", "content"],
              },
            },
          },
        });
        const raw = response.choices[0]?.message?.content;
        const text = typeof raw === "string" ? raw : "";
        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(text);
        } catch {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI_PARSE_ERROR: The AI response could not be parsed. Try again." });
        }
        return {
          title: String(parsed.title ?? ""),
          slug: String(parsed.slug ?? "").toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-"),
          excerpt: String(parsed.excerpt ?? ""),
          category: String(parsed.category ?? ""),
          tags: Array.isArray(parsed.tags) ? (parsed.tags as string[]).join(", ") : "",
          readingTimeMinutes: Number(parsed.readingTimeMinutes) || 6,
          content: String(parsed.content ?? ""),
        };
      }),

    create: adminProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        slug: z.string().min(1).max(255),
        excerpt: z.string().max(500).optional(),
        content: z.string(),
        category: z.string().max(100).optional(),
        tags: z.array(z.string()).optional(),
        author: z.string().max(100).optional(),
        readingTimeMinutes: z.number().optional(),
        status: z.enum(["draft", "published"]).default("draft"),
        coverImageUrl: z.string().max(1024).optional(),
      }))
      .mutation(async ({ input }) => {
        const slug = input.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
        const data = {
          ...input,
          slug,
          tags: input.tags ? JSON.stringify(input.tags) : null,
          publishedAt: input.status === "published" ? new Date() : null,
        };
        return createBlogPost(data as any);
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        slug: z.string().min(1).max(255).optional(),
        excerpt: z.string().max(500).optional(),
        content: z.string().optional(),
        category: z.string().max(100).optional(),
        tags: z.array(z.string()).optional(),
        author: z.string().max(100).optional(),
        readingTimeMinutes: z.number().optional(),
        status: z.enum(["draft", "published"]).optional(),
        coverImageUrl: z.string().max(1024).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, tags, status, ...rest } = input;
        const data: Record<string, unknown> = { ...rest };
        if (tags !== undefined) data.tags = JSON.stringify(tags);
        if (status !== undefined) {
          data.status = status;
          if (status === "published") data.publishedAt = new Date();
        }
        return updateBlogPost(id, data as any);
      }),

    publish: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await publishBlogPost(input.id);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteBlogPost(input.id);
        return { success: true };
      }),

    count: publicProcedure.query(async () => {
      return countPublishedBlogPosts();
    }),
  }),

  // ─── Clients (White-Label) ────────────────────────────────────────────────
  clients: router({
    // Run the real SEO analysis engine against a client's website, so the
    // white-label report (and its PDF) includes a graded SEO section.
    seoAnalyze: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { eq: eqOp, and: andOp } = await import("drizzle-orm");
        const [client] = await db.select().from(clients)
          .where(andOp(eqOp(clients.id, input.clientId), eqOp(clients.userId, ctx.user.id)))
          .limit(1);
        if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
        let url = client.siteUrl.trim();
        if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
        // Basic SSRF guard: block private/localhost targets
        try {
          const h = new URL(url).hostname;
          if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.)/i.test(h) || h === "::1") {
            throw new Error("blocked");
          }
        } catch { throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid site URL" }); }
        // 25s cap: the whole request must finish under the proxy timeout (~30s)
        const clientPsiPromise = fetchPageSpeed(url, 25000);
        const t0 = Date.now();
        let raw = "";
        try {
          const res = await fetch(url, {
            redirect: "follow",
            signal: AbortSignal.timeout(12000),
            headers: { "User-Agent": "Mozilla/5.0 (compatible; LynxSEO/1.0)" },
          });
          raw = await res.text();
        } catch { /* unreachable site → breakdown null below */ }
        const firstMs = Date.now() - t0;
        if (!raw) return { siteUrl: url, breakdown: null, error: "Could not read the client's website" };
        const meas = await measureHttp(url);
        // Sitemap check for the client's site (quick best-effort)
        let sitemapFound = false;
        try {
          const smRes = await fetch(new URL("/sitemap.xml", url).href, { signal: AbortSignal.timeout(6000) });
          sitemapFound = smRes.ok && /<(urlset|sitemapindex)/i.test(await smRes.text());
        } catch { /* none */ }
        const clientPsi = await clientPsiPromise;
        const breakdown = computeSeoBreakdown(raw, meas, firstMs, sitemapFound, url, clientPsi);
        return { siteUrl: url, breakdown, error: null };
      }),
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const { eq: eqOp, desc: descOp } = await import("drizzle-orm");
      const rows = await db.select().from(clients).where(eqOp(clients.userId, ctx.user.id)).orderBy(descOp(clients.createdAt));
      // Enrich each client with its linked chatbot's logo so the edit form can
      // show/change the chat branding per client.
      const bots = await db.select().from(chatbots).where(eqOp(chatbots.userId, ctx.user.id));
      const logoByKey = new Map(bots.map((b) => [b.apiKey, (b as { avatarUrl?: string | null }).avatarUrl ?? null]));
      const badgeByKey = new Map(bots.map((b) => [b.apiKey, {
        poweredByText: (b as { poweredByText?: string | null }).poweredByText ?? null,
        poweredByUrl: (b as { poweredByUrl?: string | null }).poweredByUrl ?? null,
      }]));
      // Each resold chatbot has its OWN monthly allowance (whitelabel_client),
      // separate from the reseller's own chatbot — no shared pool.
      const usageByKey = new Map(bots.map((b) => [b.apiKey, usageOf(b, ctx.user.plan ?? "cloud")]));
      // Learning status per client, so the reseller can see whether the bot
      // actually knows the site yet (and how much it learned).
      const knowledgeByKey = new Map(bots.map((b) => {
        const ctxText = (b as { siteContext?: string | null }).siteContext ?? "";
        const m = ctxText.match(/PRODUCT CATALOG \((\d+) products/);
        return [b.apiKey, {
          lastScannedAt: (b as { lastScannedAt?: Date | null }).lastScannedAt ?? null,
          knowledgeChars: ctxText.length,
          productsLearned: m ? Number(m[1]) : 0,
        }];
      }));
      const botLinked = new Set(bots.map((b) => b.apiKey));
      return rows.map((r) => ({
        ...r,
        logoUrl: logoByKey.get(r.apiKey) ?? null,
        ...(badgeByKey.get(r.apiKey) ?? { poweredByText: null, poweredByUrl: null }),
        usage: usageByKey.get(r.apiKey) ?? { used: 0, limit: 0 },
        ...(knowledgeByKey.get(r.apiKey) ?? { lastScannedAt: null, knowledgeChars: 0, productsLearned: 0 }),
        // false → the client row has no chatbot behind its API key (would 403)
        hasChatbot: botLinked.has(r.apiKey),
      }));
    }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(256),
        siteUrl: z.string().url(),
        brandName: z.string().max(128).optional(),
        brandColor: z.string().max(16).optional(),
        welcomeMessage: z.string().max(512).optional(),
        logoUrl: z.string().nullable().optional(),
        poweredByText: z.string().max(64).nullable().optional(),
        poweredByUrl: z.string().max(255).nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        if (ctx.user.plan !== "whitelabel") {
          throw new TRPCError({ code: "FORBIDDEN", message: "White-Label plan required to add clients" });
        }
        const { eq: eqOp, desc: descOp } = await import("drizzle-orm");
        const existing = await db.select().from(clients).where(eqOp(clients.userId, ctx.user.id));
        const maxSlots = 15 + (ctx.user.clientSlots ?? 0);
        if (existing.length >= maxSlots) {
          throw new TRPCError({ code: "FORBIDDEN", message: `Client limit reached (${maxSlots}). Purchase expansion packs from Billing.` });
        }
        const apiKey = "lx_" + randomBytes(24).toString("hex");
        await db.insert(clients).values({
          userId: ctx.user.id,
          name: input.name,
          siteUrl: input.siteUrl,
          apiKey,
          brandName: input.brandName ?? "AI Assistant",
          brandColor: input.brandColor ?? "#3b82f6",
          welcomeMessage: input.welcomeMessage ?? "Hi! How can I help you?",
        });

        // Create the client's OWN chatbot in the chatbots table, sharing the same
        // apiKey, so the widget (which looks up chatbots by apiKey) works for the
        // client's site. Marked isClientChatbot=true for the 6,000 msg/mo limit.
        // This is what makes the reseller flow actually functional end-to-end.
        await db.insert(chatbots).values({
          userId: ctx.user.id,
          apiKey,
          name: input.brandName ?? input.name ?? "AI Assistant",
          isClientChatbot: true,
          primaryColor: input.brandColor ?? "#3b82f6",
          avatarUrl: input.logoUrl ?? null,
          poweredByText: input.poweredByText ?? null,
          poweredByUrl: input.poweredByUrl ?? null,
          welcomeMessage: input.welcomeMessage ?? "Hi! How can I help you?",
          siteUrl: input.siteUrl,
          isActive: true,
        });

        const [newClient] = await db.select().from(clients).where(eqOp(clients.apiKey, apiKey)).limit(1);

        // Learn the client's site right away, in the background: crawling takes
        // 20-40s and the reseller shouldn't wait on the "Add client" button.
        // Until it finishes, the bot answers from general knowledge only.
        void buildSiteKnowledge(input.siteUrl, 80)
          .then((k) => db.update(chatbots)
            .set({ siteContext: k.context, siteUrl: input.siteUrl, lastScannedAt: new Date(), updatedAt: new Date() })
            .where(eqOp(chatbots.apiKey, apiKey)))
          .catch((e) => console.warn("[Clients] initial site scan failed:", e));

        return newClient;
      }),

    /**
     * Re-learn a client's website on demand (new products, changed policies).
     * Writes to the CLIENT's chatbot — never the reseller's own.
     */
    scanSite: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        if (ctx.user.plan !== "whitelabel") {
          throw new TRPCError({ code: "FORBIDDEN", message: "White-Label plan required." });
        }
        const { eq: eqOp, and: andOp } = await import("drizzle-orm");
        const [client] = await db.select().from(clients)
          .where(andOp(eqOp(clients.id, input.id), eqOp(clients.userId, ctx.user.id))).limit(1);
        if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Client not found." });

        const knowledge = await buildSiteKnowledge(client.siteUrl, 80);
        await db.update(chatbots)
          .set({ siteContext: knowledge.context, siteUrl: client.siteUrl, lastScannedAt: new Date(), updatedAt: new Date() })
          .where(eqOp(chatbots.apiKey, client.apiKey));
        return { products: knowledge.products, pagesRead: knowledge.pagesRead.length, indexed: knowledge.indexed };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number().int(),
        name: z.string().min(1).max(256).optional(),
        siteUrl: z.string().url().optional(),
        brandName: z.string().max(128).optional(),
        brandColor: z.string().max(16).optional(),
        welcomeMessage: z.string().max(512).optional(),
        logoUrl: z.string().nullable().optional(),
        poweredByText: z.string().max(64).nullable().optional(),
        poweredByUrl: z.string().max(255).nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { eq: eqOp } = await import("drizzle-orm");
        const { id, logoUrl, poweredByText, poweredByUrl, ...data } = input;
        const [existing] = await db.select().from(clients).where(eqOp(clients.id, id)).limit(1);
        if (!existing || existing.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        if (Object.keys(data).length) {
          await db.update(clients).set(data).where(eqOp(clients.id, id));
        }
        // ── Sync the linked chatbot ──
        // The widget reads branding from the CHATBOT (same apiKey), so brand
        // changes must propagate there or the client's chat never updates.
        const botSync: Record<string, unknown> = {};
        if (input.brandName !== undefined) botSync.name = input.brandName;
        if (input.brandColor !== undefined) botSync.primaryColor = input.brandColor;
        if (input.welcomeMessage !== undefined) botSync.welcomeMessage = input.welcomeMessage;
        if (logoUrl !== undefined) botSync.avatarUrl = logoUrl;
        if (poweredByText !== undefined) botSync.poweredByText = poweredByText;
        if (poweredByUrl !== undefined) botSync.poweredByUrl = poweredByUrl;
        // A changed website means the old knowledge is stale — re-learn it.
        if (data.siteUrl) {
          const newUrl = data.siteUrl;
          void buildSiteKnowledge(newUrl, 80)
            .then((k) => db.update(chatbots)
              .set({ siteContext: k.context, siteUrl: newUrl, lastScannedAt: new Date(), updatedAt: new Date() })
              .where(eqOp(chatbots.apiKey, existing.apiKey)))
            .catch((e) => console.warn("[Clients] re-scan after URL change failed:", e));
        }
        if (Object.keys(botSync).length) {
          await db.update(chatbots).set(botSync).where(eqOp(chatbots.apiKey, existing.apiKey));
        }
        const [updated] = await db.select().from(clients).where(eqOp(clients.id, id)).limit(1);
        return updated;
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { eq: eqOp } = await import("drizzle-orm");
        const [existing] = await db.select().from(clients).where(eqOp(clients.id, input.id)).limit(1);
        if (!existing || existing.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        // ── 72-hour lock ──
        // A client website cannot be removed during the first 72 hours after
        // being added (the disclaimer shown when adding a client states this).
        const LOCK_MS = 72 * 60 * 60 * 1000;
        const createdAt = existing.createdAt ? new Date(existing.createdAt).getTime() : 0;
        const elapsed = Date.now() - createdAt;
        if (createdAt > 0 && elapsed < LOCK_MS) {
          const hoursLeft = Math.ceil((LOCK_MS - elapsed) / (60 * 60 * 1000));
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `This client cannot be removed yet: ${hoursLeft}h remain of the 72-hour period since it was added.`,
          });
        }
        // Remove the linked chatbot (same apiKey) too, so no orphan remains
        await db.delete(chatbots).where(eqOp(chatbots.apiKey, existing.apiKey));
        await db.delete(clients).where(eqOp(clients.id, input.id));
        return { ok: true };
      }),
    regenerateKey: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { eq: eqOp } = await import("drizzle-orm");
        const [existing] = await db.select().from(clients).where(eqOp(clients.id, input.id)).limit(1);
        if (!existing || existing.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        const newKey = "lx_" + randomBytes(24).toString("hex");
        // Update the key in BOTH tables so the widget keeps resolving
        await db.update(chatbots).set({ apiKey: newKey }).where(eqOp(chatbots.apiKey, existing.apiKey));
        await db.update(clients).set({ apiKey: newKey }).where(eqOp(clients.id, input.id));
        return { apiKey: newKey };
      }),

    // Returns analytics data for a specific client to generate a PDF report
    reportData: protectedProcedure
      .input(z.object({
        id: z.number().int(),
        // Optional date range (defaults to last 30 days)
        fromDate: z.string().optional(), // ISO date string
        toDate: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { eq: eqOp, and: andOp, gte, lte, sql: sqlOp, count, desc: descOp } = await import("drizzle-orm");

        // Verify ownership
        const [client] = await db.select().from(clients).where(eqOp(clients.id, input.id)).limit(1);
        if (!client || client.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        // Find the chatbot linked to this client's apiKey
        const [chatbot] = await db.select().from(chatbots).where(eqOp(chatbots.apiKey, client.apiKey)).limit(1);

        // Date range
        const toDate = input.toDate ? new Date(input.toDate) : new Date();
        const fromDate = input.fromDate ? new Date(input.fromDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        if (!chatbot) {
          // No chatbot installed yet — return empty report
          return {
            client: { id: client.id, name: client.name, siteUrl: client.siteUrl, brandName: client.brandName, brandColor: client.brandColor },
            period: { from: fromDate.toISOString(), to: toDate.toISOString() },
            totals: { pageViews: 0, chatOpens: 0, messagesSent: 0, leadsCaptures: 0 },
            conversionRate: 0,
            dailyData: [],
            topPages: [],
            leads: [],
          };
        }

        const chatbotId = chatbot.id;

        // Totals
        const eventsInRange = await db.select({
          eventType: analyticsEvents.eventType,
          cnt: count(),
        })
          .from(analyticsEvents)
          .where(andOp(
            eqOp(analyticsEvents.chatbotId, chatbotId),
            gte(analyticsEvents.createdAt, fromDate),
            lte(analyticsEvents.createdAt, toDate),
          ))
          .groupBy(analyticsEvents.eventType);

        const totals = { pageViews: 0, chatOpens: 0, messagesSent: 0, leadsCaptures: 0 };
        for (const row of eventsInRange) {
          if (row.eventType === "page_view") totals.pageViews = Number(row.cnt);
          if (row.eventType === "chat_open") totals.chatOpens = Number(row.cnt);
          if (row.eventType === "message_sent") totals.messagesSent = Number(row.cnt);
          if (row.eventType === "lead_captured") totals.leadsCaptures = Number(row.cnt);
        }

        const conversionRate = totals.pageViews > 0
          ? Math.round((totals.chatOpens / totals.pageViews) * 100 * 10) / 10
          : 0;

        // Daily breakdown (page_view + chat_open per day)
        const dailyRaw = await db.select({
          day: sqlOp<string>`DATE(${analyticsEvents.createdAt})`,
          eventType: analyticsEvents.eventType,
          cnt: count(),
        })
          .from(analyticsEvents)
          .where(andOp(
            eqOp(analyticsEvents.chatbotId, chatbotId),
            gte(analyticsEvents.createdAt, fromDate),
            lte(analyticsEvents.createdAt, toDate),
          ))
          .groupBy(sqlOp`DATE(${analyticsEvents.createdAt})`, analyticsEvents.eventType)
          .orderBy(sqlOp`DATE(${analyticsEvents.createdAt})`);

        // Merge into daily map
        const dayMap: Record<string, { day: string; pageViews: number; chatOpens: number }> = {};
        for (const row of dailyRaw) {
          if (!dayMap[row.day]) dayMap[row.day] = { day: row.day, pageViews: 0, chatOpens: 0 };
          if (row.eventType === "page_view") dayMap[row.day].pageViews = Number(row.cnt);
          if (row.eventType === "chat_open") dayMap[row.day].chatOpens = Number(row.cnt);
        }
        const dailyData = Object.values(dayMap);

        // Top pages
        const topPagesRaw = await db.select({
          pageUrl: analyticsEvents.pageUrl,
          cnt: count(),
        })
          .from(analyticsEvents)
          .where(andOp(
            eqOp(analyticsEvents.chatbotId, chatbotId),
            eqOp(analyticsEvents.eventType, "page_view"),
            gte(analyticsEvents.createdAt, fromDate),
            lte(analyticsEvents.createdAt, toDate),
          ))
          .groupBy(analyticsEvents.pageUrl)
          .orderBy(descOp(count()))
          .limit(5);

        const topPages = topPagesRaw.map(r => ({ url: r.pageUrl ?? "(unknown)", views: Number(r.cnt) }));

        // Recent leads
        const leadsRaw = await db.select({
          leadName: conversations.leadName,
          leadEmail: conversations.leadEmail,
          leadCompany: conversations.leadCompany,
          createdAt: conversations.createdAt,
        })
          .from(conversations)
          .where(andOp(
            eqOp(conversations.chatbotId, chatbotId),
            eqOp(conversations.isLead, true),
            gte(conversations.createdAt, fromDate),
            lte(conversations.createdAt, toDate),
          ))
          .orderBy(descOp(conversations.createdAt))
          .limit(20);

        return {
          client: { id: client.id, name: client.name, siteUrl: client.siteUrl, brandName: client.brandName, brandColor: client.brandColor },
          period: { from: fromDate.toISOString(), to: toDate.toISOString() },
          totals,
          conversionRate,
          dailyData,
          topPages,
          leads: leadsRaw,
        };
      }),
  }),

  // ─── Web Setup Service ($199) ────────────────────────────────────────────────────────────
  webSetup: router({
    submit: protectedProcedure
      .input(z.object({
        businessName: z.string().min(1).max(256),
        businessType: z.string().max(128).optional(),
        websiteDomain: z.string().max(256).optional(),
        primaryColor: z.string().max(16).optional(),
        secondaryColor: z.string().max(16).optional(),
        logoUrl: z.string().url().optional().or(z.literal("")),
        aiIconUrl: z.string().url().optional().or(z.literal("")),
        chatbotName: z.string().max(128).optional(),
        chatbotWelcome: z.string().max(512).optional(),
        targetAudience: z.string().max(1000).optional(),
        keyPages: z.string().max(1000).optional(),
        additionalNotes: z.string().max(2000).optional(),
        contactEmail: z.string().email().optional().or(z.literal("")),
        contactPhone: z.string().max(64).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { webSetupRequests } = await import("../drizzle/schema");
        const { sendWebSetupRequestEmail } = await import("./email");
        // Save to DB
        await db.insert(webSetupRequests).values({
          userId: ctx.user.id,
          ...input,
          logoUrl: input.logoUrl || null,
          aiIconUrl: input.aiIconUrl || null,
          contactEmail: input.contactEmail || null,
        });
        // Push notification to owner
        notifyOwner({
          title: "🚀 New Web Setup Request — $199",
          content: `${input.businessName} (${input.contactEmail ?? "no email"}) just submitted a website setup request. Check the admin panel.`,
        }).catch((e: unknown) => console.error("[WebSetup] Push error:", e));
        // Send notification email to sales team
        sendWebSetupRequestEmail({
          userId: ctx.user.id,
          userName: ctx.user.name ?? "Unknown",
          userEmail: ctx.user.email ?? "unknown",
          ...input,
          logoUrl: input.logoUrl || undefined,
          aiIconUrl: input.aiIconUrl || undefined,
          contactEmail: input.contactEmail || undefined,
        }).catch((e: unknown) => console.error("[WebSetup] Email error:", e));
        return { success: true };
      }),

    getMyRequest: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return null;
      const { eq: eqOp, desc: descOp } = await import("drizzle-orm");
      const [req] = await db
        .select()
        .from(webSetupRequests)
        .where(eqOp(webSetupRequests.userId, ctx.user.id))
        .orderBy(descOp(webSetupRequests.createdAt))
        .limit(1);
      return req ?? null;
    }),

    // Admin: list all requests
    adminList: adminProcedure
      .input(z.object({ limit: z.number().min(1).max(200).default(100), offset: z.number().min(0).default(0) }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const { desc: descOp } = await import("drizzle-orm");
        const { limit = 100, offset = 0 } = input ?? {};
        return db.select().from(webSetupRequests).orderBy(descOp(webSetupRequests.createdAt)).limit(limit).offset(offset);
      }),

    // Admin: update status
    adminUpdateStatus: adminProcedure
      .input(z.object({
        id: z.number().int(),
        status: z.enum(["pending", "in_progress", "delivered", "cancelled"]),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { eq: eqOp } = await import("drizzle-orm");
        await db.update(webSetupRequests).set({ status: input.status }).where(eqOp(webSetupRequests.id, input.id));
        return { success: true };
      }),
  }),
});
export type AppRouter = typeof appRouter;

