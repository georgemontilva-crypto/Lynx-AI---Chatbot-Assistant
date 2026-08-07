/**
 * SchemaMarkup — JSON-LD structured data for Google rich results
 * Includes: Organization, SoftwareApplication, FAQPage, BreadcrumbList
 */
export default function SchemaMarkup() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Lynx AI",
    "url": "https://lynxaiassistant.com",
    "logo": "https://lynxaiassistant.com/brand/lynx-logo-dark.png",
    "description": "Lynx AI es una plataforma de chatbot inteligente que escanea tu sitio web y atiende a tus visitantes 24/7 con respuestas precisas basadas en tu contenido.",
    "contactPoint": {
      "@type": "ContactPoint",
      "email": "support@lynxaiassistant.com",
      "contactType": "customer support",
      "availableLanguage": ["Spanish", "English"]
    },
    "sameAs": [
      "https://lynxaiassistant.com"
    ]
  };

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Lynx AI",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "url": "https://lynxaiassistant.com",
    "description": "Chatbot inteligente con IA que escanea tu sitio web, aprende tu contenido y atiende a tus visitantes 24/7. Captura leads, mejora el SEO y aumenta conversiones.",
    "offers": [
      {
        "@type": "Offer",
        "name": "Cloud",
        "price": "199",
        "priceCurrency": "USD",
        "priceSpecification": {
          "@type": "UnitPriceSpecification",
          "price": "199",
          "priceCurrency": "USD",
          "unitText": "MONTH"
        }
      },
      {
        "@type": "Offer",
        "name": "Embedded",
        "price": "399",
        "priceCurrency": "USD",
        "priceSpecification": {
          "@type": "UnitPriceSpecification",
          "price": "399",
          "priceCurrency": "USD",
          "unitText": "MONTH"
        }
      },
      {
        "@type": "Offer",
        "name": "White-Label",
        "price": "499",
        "priceCurrency": "USD",
        "priceSpecification": {
          "@type": "UnitPriceSpecification",
          "price": "499",
          "priceCurrency": "USD",
          "unitText": "MONTH"
        }
      }
    ],
    "featureList": [
      "Escaneo automático del sitio web",
      "Respuestas 24/7 basadas en tu contenido",
      "Captura de leads integrada",
      "Análisis SEO automático",
      "Soporte multilingüe (50+ idiomas)",
      "Personalización completa del chatbot",
      "Panel de analytics en tiempo real",
      "Opción White-Label para agencias"
    ]
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "¿Necesito conocimientos técnicos para instalar Lynx AI?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No. Para el plan Cloud solo pegas una línea de código en tu sitio. Para el plan Embedded, usamos una API de instalación simple que lo hace todo automáticamente."
        }
      },
      {
        "@type": "Question",
        "name": "¿Qué pasa si el contenido de mi sitio cambia?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Lynx re-escanea tu sitio automáticamente. En el plan Cloud, semanalmente. En Embedded y White-Label, cada 24 horas. También puedes forzar un re-escaneo manual desde el dashboard."
        }
      },
      {
        "@type": "Question",
        "name": "¿El chatbot mezcla mi contenido con el de otros clientes?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Nunca. Cada instalación tiene su propia base de conocimiento completamente aislada. Tu contenido es solo tuyo."
        }
      },
      {
        "@type": "Question",
        "name": "¿Qué idiomas soporta Lynx AI?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Lynx responde en el idioma en que escribe el visitante, sin configuración adicional. Soporta más de 50 idiomas."
        }
      },
      {
        "@type": "Question",
        "name": "¿Puedo personalizar la apariencia del chatbot?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Sí. Puedes cambiar el nombre, colores, avatar, mensaje de bienvenida y comportamiento desde el dashboard. En el plan White-Label, la personalización es completa."
        }
      }
    ]
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Inicio",
        "item": "https://lynxaiassistant.com/"
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </>
  );
}
