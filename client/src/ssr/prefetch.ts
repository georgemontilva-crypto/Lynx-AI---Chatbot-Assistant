import type { QueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
// Value import of @trpc/server is safe HERE ONLY: this file is imported by the
// server entry graph (entry-server.tsx / ssrCaller), never by entry-client.
import { TRPCError } from "@trpc/server";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";
import { trpc } from "@/lib/trpc";

export type HeadMeta = {
  title: string;
  description: string;
  /** "article" for detail pages, "website" for lists/home */
  ogType?: "website" | "article";
  /** share image URL; relative /manus-storage/... paths are fine */
  ogImage?: string;
  ogImageWidth?: number;
  ogImageHeight?: number;
  ogImageAlt?: string;
  /** ISO 8601; article pages only */
  publishedTime?: string;
  modifiedTime?: string;
  /** path only (e.g. "/blog/foo"); composeHtml prepends the canonical origin */
  canonicalPath?: string;
  /** og-style locale (e.g. "en_US") */
  locale?: string;
  /** 200 but not indexable: auth-gated shells, internal pages */
  noindex?: boolean;
  /** slug missed / unknown route → server responds 404 + noindex */
  notFound?: boolean;
};

type RO = inferRouterOutputs<AppRouter>;

// Allowlist: only procedures listed here are reachable from SSR prefetch
export type SsrPrefetch = {
  blogList: () => Promise<RO["blog"]["list"]>;
  blogBySlug: (slug: string) => Promise<RO["blog"]["getBySlug"]>;
};

async function seed(qc: QueryClient, key: unknown, data: unknown) {
  qc.setQueryData(key as any, data);
}

// Site constants — keep in sync with vite.ts SITE_NAME and CANONICAL_ORIGIN env vars
const SITE = "Lynx AI";
const CANONICAL_ORIGIN = "https://lynxaiassistant.com";
const OG_IMAGE = "/brand/og-image.png";
const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;
const OG_IMAGE_ALT = "Lynx AI — Chatbot inteligente para sitios web";
const OG_LOCALE = "en_US";

const DEFAULT_DESC =
  "Lynx AI scans your website, learns your content and answers your visitors 24/7 with accurate replies. Increase conversions, capture leads and improve your SEO automatically.";

export async function prefetchForPath(
  url: string,
  qc: QueryClient,
  p: SsrPrefetch
): Promise<HeadMeta> {
  // Decode path before matching (mirrors wouter's decodeURI behavior)
  let pathOnly = url.split("?")[0];
  try {
    pathOnly = decodeURI(pathOnly);
  } catch {
    /* malformed: use raw */
  }
  const clean = pathOnly.replace(/\/+$/, "") || "/";

  // ── Home ──────────────────────────────────────────────────────────────────
  if (clean === "/") {
    return {
      title: `${SITE} — Chatbot Inteligente para tu Sitio Web | IA que conoce tu negocio`,
      description: DEFAULT_DESC,
      ogType: "website",
      ogImage: OG_IMAGE,
      ogImageWidth: OG_IMAGE_WIDTH,
      ogImageHeight: OG_IMAGE_HEIGHT,
      ogImageAlt: OG_IMAGE_ALT,
      locale: OG_LOCALE,
      canonicalPath: "/",
    };
  }

  // ── Pricing ───────────────────────────────────────────────────────────────
  if (clean === "/pricing") {
    return {
      title: `Precios de ${SITE} — Planes Cloud, Embedded y White-Label`,
      description:
        "Elige el plan que se adapta a tu negocio. Desde $199/mes para sitios individuales hasta soluciones White-Label para agencias. Sin contratos, cancela cuando quieras.",
      ogType: "website",
      ogImage: OG_IMAGE,
      ogImageWidth: OG_IMAGE_WIDTH,
      ogImageHeight: OG_IMAGE_HEIGHT,
      ogImageAlt: OG_IMAGE_ALT,
      locale: OG_LOCALE,
      canonicalPath: "/pricing",
    };
  }

  // ── Blog index ────────────────────────────────────────────────────────────
  if (clean === "/blog") {
    const posts = await p.blogList();
    await seed(
      qc,
      getQueryKey(trpc.blog.list, { limit: 20 }, "query"),
      posts
    );
    return {
      title: `${SITE} Blog — AI Chatbot Resources, Guides and Use Cases`,
      description:
        "Learn how to use AI chatbots to increase conversions, capture leads and improve customer support. Practical guides, case studies and Lynx AI news.",
      ogType: "website",
      ogImage: OG_IMAGE,
      ogImageWidth: OG_IMAGE_WIDTH,
      ogImageHeight: OG_IMAGE_HEIGHT,
      ogImageAlt: OG_IMAGE_ALT,
      locale: OG_LOCALE,
      canonicalPath: "/blog",
    };
  }

  // ── Blog post detail ──────────────────────────────────────────────────────
  const blogMatch = clean.match(/^\/blog\/([^/]+)$/);
  if (blogMatch) {
    const slug = blogMatch[1];
    let post: RO["blog"]["getBySlug"] | null = null;
    try {
      post = await p.blogBySlug(slug);
    } catch (e) {
      if (e instanceof TRPCError && e.code === "NOT_FOUND") {
        return { title: SITE, description: DEFAULT_DESC, notFound: true };
      }
      throw e;
    }
    if (!post) {
      return { title: SITE, description: DEFAULT_DESC, notFound: true };
    }
    await seed(
      qc,
      getQueryKey(trpc.blog.getBySlug, { slug }, "query"),
      post
    );
    const title = post.title ? `${post.title} · ${SITE}` : SITE;
    const description = post.excerpt ?? DEFAULT_DESC;
    return {
      title,
      description,
      ogType: "article",
      ogImage: post.coverImageUrl ?? OG_IMAGE,
      ogImageWidth: post.coverImageUrl ? undefined : OG_IMAGE_WIDTH,
      ogImageHeight: post.coverImageUrl ? undefined : OG_IMAGE_HEIGHT,
      ogImageAlt: post.title ?? OG_IMAGE_ALT,
      publishedTime: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
      locale: OG_LOCALE,
      canonicalPath: `/blog/${slug}`,
    };
  }

  // ── Contact ───────────────────────────────────────────────────────────────
  if (clean === "/contact") {
    return {
      title: `Contacto — ${SITE} | Habla con nuestro equipo`,
      description:
        "Questions about Lynx AI? Get in touch for a personalized demo, technical support or details on White-Label plans for your agency.",
      ogType: "website",
      locale: OG_LOCALE,
      canonicalPath: "/contact",
    };
  }

  // ── Legal pages ───────────────────────────────────────────────────────────
  if (clean === "/legal/terms") {
    return {
      title: `Terms of Service — ${SITE}`,
      description: `Read the terms and conditions for using the ${SITE} platform.`,
      canonicalPath: "/legal/terms",
    };
  }
  if (clean === "/legal/privacy") {
    return {
      title: `Privacy Policy — ${SITE}`,
      description:
        `Learn how ${SITE} collects, uses and protects your personal data in line with GDPR and applicable privacy laws.`,
      canonicalPath: "/legal/privacy",
    };
  }
  if (clean === "/legal/cookies") {
    return {
      title: `Cookie Policy — ${SITE}`,
      description: `How cookies are used on the ${SITE} platform.`,
      canonicalPath: "/legal/cookies",
    };
  }
  if (clean === "/legal/refunds") {
    return {
      title: `Refund Policy — ${SITE}`,
      description: `Our refund and cancellation policy at ${SITE}.`,
      canonicalPath: "/legal/refunds",
    };
  }

  // ── Auth pages (200 + noindex) ────────────────────────────────────────────
  if (
    clean === "/login" ||
    clean === "/register" ||
    clean === "/forgot-password" ||
    clean === "/reset-password"
  ) {
    return { title: SITE, description: DEFAULT_DESC, noindex: true };
  }

  // ── Auth-gated dashboard routes (200 + noindex) ───────────────────────────
  if (clean === "/dashboard" || clean.startsWith("/dashboard/")) {
    return { title: SITE, description: DEFAULT_DESC, noindex: true };
  }

  // ── Test payment (noindex) ────────────────────────────────────────────────
  if (clean === "/test-payment") {
    return { title: SITE, description: DEFAULT_DESC, noindex: true };
  }

  // ── Explicit 404 page ─────────────────────────────────────────────────────
  if (clean === "/404") {
    return { title: `Page not found — ${SITE}`, description: DEFAULT_DESC, notFound: true };
  }

  // ── Unknown routes → real 404 ─────────────────────────────────────────────
  return { title: SITE, description: DEFAULT_DESC, notFound: true };
}
