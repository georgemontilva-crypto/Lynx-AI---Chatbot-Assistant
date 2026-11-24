/**
 * SchemaMarkup — JSON-LD structured data for Google rich results
 * Includes: Organization, SoftwareApplication, FAQPage, BreadcrumbList
 */
import { faqs } from "./Faq";

export default function SchemaMarkup() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Lynx AI",
    "url": "https://lynxaiassistant.com",
    "logo": "https://lynxaiassistant.com/brand/lynx-logo-dark.png",
    "description": "Lynx AI is an AI chatbot platform that scans your website and answers your visitors 24/7 with accurate replies based on your own content.",
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
    "description": "AI chatbot that scans your website, learns your content and answers your visitors 24/7. Captures leads, improves SEO and increases conversions.",
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
      "Automatic website scanning",
      "24/7 answers based on your content",
      "Built-in lead capture",
      "Automatic SEO analysis",
      "Multilingual support",
      "Full chatbot customization",
      "Real-time analytics dashboard",
      "White-Label option for agencies"
    ]
  };

  // Built from the same list the page shows: FAQ markup has to match the
  // visible questions, and two hand-kept copies had already drifted apart.
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map((f) => ({
      "@type": "Question",
      "name": f.q,
      "acceptedAnswer": { "@type": "Answer", "text": f.a },
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
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
