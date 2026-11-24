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

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Do I need technical skills to install Lynx AI?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No. On the Cloud plan you just paste one line of code into your site. On the Embedded plan, a simple install API handles everything automatically."
        }
      },
      {
        "@type": "Question",
        "name": "What happens when my site content changes?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Lynx re-scans your site automatically — weekly on Cloud, every 24 hours on Embedded and White-Label. You can also trigger a manual re-scan from the dashboard."
        }
      },
      {
        "@type": "Question",
        "name": "Does the chatbot mix my content with other customers’ content?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Never. Each installation has its own fully isolated knowledge base. Your content stays yours alone."
        }
      },
      {
        "@type": "Question",
        "name": "What languages does Lynx AI support?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Lynx replies in the language the visitor writes in, with no extra setup. It supports over 50 languages."
        }
      },
      {
        "@type": "Question",
        "name": "Can I customize how the chatbot looks?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. Name, colors, avatar, welcome message and behaviour are all editable from the dashboard. On the White-Label plan, branding is fully yours."
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
