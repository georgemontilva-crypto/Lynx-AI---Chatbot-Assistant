import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import Features from "@/components/landing/Features";
import Comparison from "@/components/landing/Comparison";
import WhiteLabel from "@/components/landing/WhiteLabel";
import Pricing from "@/components/landing/Pricing";
import Footer from "@/components/landing/Footer";
import SchemaMarkup from "@/components/landing/SchemaMarkup";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function Home() {
  const [, navigate] = useLocation();
  // Use initialData: null so the query starts as "success" (not loading),
  // which means the landing renders immediately. If the user IS logged in,
  // the query will update and the useEffect will redirect them to the dashboard.
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    initialData: null as any,
  });

  useEffect(() => {
    if (meQuery.data) {
      // Restore last visited dashboard route, or fall back to /dashboard
      const lastRoute = localStorage.getItem("lynx-last-route");
      navigate(lastRoute && lastRoute.startsWith("/dashboard") ? lastRoute : "/dashboard");
    }
  }, [meQuery.data, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SchemaMarkup />
      <Navbar />
      <Hero />
      <HowItWorks />
      <Features />
      <Comparison />
      <WhiteLabel />
      <Pricing />
      <Footer />
    </div>
  );
}
