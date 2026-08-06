import { useEffect } from "react";
import Navbar from "@/components/landing/Navbar";
import Contact from "@/components/landing/Contact";
import Footer from "@/components/landing/Footer";

export default function ContactPage() {
  useEffect(() => {
    // Update page title and meta for SEO
    document.title = "Contact Us | Lynx AI — AI Chatbot for Your Website";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "Get in touch with the Lynx AI team. Have questions about our AI chatbot plans, White-Label reseller program, or need help getting started? We're here to help."
      );
    }
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute("href", "https://lynxaiassistant.com/contact");
    }
    return () => {
      document.title = "Lynx AI — AI Chatbot That Truly Knows Your Website";
      if (metaDesc) {
        metaDesc.setAttribute(
          "content",
          "Lynx AI scans your website and gives every visitor instant, accurate answers — 24/7. No manual training. No hallucinations. Just results."
        );
      }
      if (canonical) {
        canonical.setAttribute("href", "https://lynxaiassistant.com/");
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      {/* Spacer for fixed navbar */}
      <div className="pt-16" />
      {/* Breadcrumb for SEO */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl pt-8 pb-0">
        <nav className="flex items-center gap-2 text-xs text-muted-foreground" aria-label="Breadcrumb">
          <a href="/" className="hover:text-foreground transition-colors">Home</a>
          <span>/</span>
          <span className="text-foreground font-medium">Contact</span>
        </nav>
      </div>
      <Contact />
      <Footer />
    </div>
  );
}
