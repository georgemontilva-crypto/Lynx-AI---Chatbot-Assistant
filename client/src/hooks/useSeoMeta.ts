import { useEffect } from "react";
import { useLocation } from "wouter";

interface SeoMeta {
  title: string;
  description: string;
  canonical?: string;
}

const BASE_URL = "https://lynxaiassistant.com";

const SEO_MAP: Record<string, SeoMeta> = {
  "/": {
    title: "Lynx AI — Chatbot Inteligente para tu Sitio Web | IA que conoce tu negocio",
    description:
      "Lynx AI scans your website, learns your content and answers your visitors 24/7 with accurate replies. Increase conversions, capture leads and improve your SEO automatically.",
    canonical: `${BASE_URL}/`,
  },
  "/pricing": {
    title: "Precios de Lynx AI — Planes Cloud, Embedded y White-Label",
    description:
      "Elige el plan que se adapta a tu negocio. Desde $199/mes para sitios individuales hasta soluciones White-Label para agencias. Sin contratos, cancela cuando quieras.",
    canonical: `${BASE_URL}/pricing`,
  },
  "/blog": {
    title: "Lynx AI Blog — AI Chatbot Resources, Guides and Use Cases",
    description:
      "Learn how to use AI chatbots to increase conversions, capture leads and improve customer support. Practical guides, case studies and Lynx AI news.",
    canonical: `${BASE_URL}/blog`,
  },
  "/contact": {
    title: "Contacto — Lynx AI | Habla con nuestro equipo",
    description:
      "Questions about Lynx AI? Get in touch for a personalized demo, technical support or details on White-Label plans for your agency.",
    canonical: `${BASE_URL}/contact`,
  },
  "/login": {
    title: "Sign in — Lynx AI",
    description: "Accede a tu dashboard de Lynx AI para gestionar tu chatbot, ver leads y analizar conversaciones.",
    canonical: `${BASE_URL}/login`,
  },
  "/register": {
    title: "Crear cuenta gratis — Lynx AI",
    description:
      "Get started free with Lynx AI. Build your intelligent chatbot in minutes — no coding and no manual training required.",
    canonical: `${BASE_URL}/register`,
  },
  "/legal/terms": {
    title: "Terms of Service — Lynx AI",
    description: "Read the terms and conditions for using the Lynx AI platform.",
    canonical: `${BASE_URL}/legal/terms`,
  },
  "/legal/privacy": {
    title: "Privacy Policy — Lynx AI",
    description:
      "Learn how Lynx AI collects, uses and protects your personal data in line with GDPR and applicable privacy laws.",
    canonical: `${BASE_URL}/legal/privacy`,
  },
};

function setMeta(name: string, content: string, property = false) {
  const attr = property ? "property" : "name";
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export function useSeoMeta() {
  const [location] = useLocation();

  useEffect(() => {
    // For blog post pages, use a generic fallback (the post page sets its own title)
    const isBlogPost = location.startsWith("/blog/") && location !== "/blog";
    const meta = SEO_MAP[location] ?? (isBlogPost ? null : SEO_MAP["/"]);
    if (!meta) return;

    document.title = meta.title;
    setMeta("description", meta.description);
    setMeta("og:title", meta.title, true);
    setMeta("og:description", meta.description, true);
    setMeta("twitter:title", meta.title);
    setMeta("twitter:description", meta.description);

    if (meta.canonical) {
      setCanonical(meta.canonical);
      setMeta("og:url", meta.canonical, true);
    }
  }, [location]);
}
