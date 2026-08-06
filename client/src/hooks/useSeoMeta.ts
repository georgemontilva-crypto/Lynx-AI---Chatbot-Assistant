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
      "Lynx AI escanea tu sitio web, aprende tu contenido y atiende a tus visitantes 24/7 con respuestas precisas. Aumenta conversiones, captura leads y mejora tu SEO automáticamente.",
    canonical: `${BASE_URL}/`,
  },
  "/pricing": {
    title: "Precios de Lynx AI — Planes Cloud, Embedded y White-Label",
    description:
      "Elige el plan que se adapta a tu negocio. Desde $199/mes para sitios individuales hasta soluciones White-Label para agencias. Sin contratos, cancela cuando quieras.",
    canonical: `${BASE_URL}/pricing`,
  },
  "/blog": {
    title: "Blog de Lynx AI — Recursos, Guías y Casos de Uso de Chatbots con IA",
    description:
      "Aprende cómo usar chatbots de IA para aumentar conversiones, capturar leads y mejorar la atención al cliente. Guías prácticas, casos de estudio y novedades de Lynx AI.",
    canonical: `${BASE_URL}/blog`,
  },
  "/contact": {
    title: "Contacto — Lynx AI | Habla con nuestro equipo",
    description:
      "¿Tienes preguntas sobre Lynx AI? Contáctanos para una demo personalizada, soporte técnico o información sobre planes White-Label para tu agencia.",
    canonical: `${BASE_URL}/contact`,
  },
  "/login": {
    title: "Iniciar sesión — Lynx AI",
    description: "Accede a tu dashboard de Lynx AI para gestionar tu chatbot, ver leads y analizar conversaciones.",
    canonical: `${BASE_URL}/login`,
  },
  "/register": {
    title: "Crear cuenta gratis — Lynx AI",
    description:
      "Empieza gratis con Lynx AI. Crea tu chatbot inteligente en minutos, sin necesidad de programación ni entrenamiento manual.",
    canonical: `${BASE_URL}/register`,
  },
  "/legal/terms": {
    title: "Términos de Servicio — Lynx AI",
    description: "Lee los términos y condiciones de uso de la plataforma Lynx AI.",
    canonical: `${BASE_URL}/legal/terms`,
  },
  "/legal/privacy": {
    title: "Política de Privacidad — Lynx AI",
    description:
      "Conoce cómo Lynx AI recopila, usa y protege tus datos personales de acuerdo con el RGPD y las leyes de privacidad aplicables.",
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
