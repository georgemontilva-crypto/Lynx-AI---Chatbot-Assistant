import { Toaster } from "@/components/ui/sonner";
import { Suspense, lazy, useEffect, useState } from "react";
import type { ComponentType, JSX } from "react";
import { trpc } from "@/lib/trpc";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import { useSeoMeta } from "./hooks/useSeoMeta";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import BlogPage from "@/pages/BlogPage";
import BlogPostPage from "@/pages/BlogPostPage";
import PricingPage from "@/pages/PricingPage";
import ContactPage from "@/pages/ContactPage";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Terms from "@/pages/legal/Terms";
import Privacy from "@/pages/legal/Privacy";
import Cookies from "@/pages/legal/Cookies";
import Refunds from "@/pages/legal/Refunds";

/**
 * Pages behind the login are loaded on demand. They used to ship inside the
 * one bundle every visitor downloaded, charts and all — about 1.7 MB of
 * JavaScript before the landing page became interactive on a phone.
 *
 * They render only after mount: the server sends the same small placeholder
 * the browser first paints, so hydration always matches.
 */
function PageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background" role="status" aria-label="Loading">
      <span className="w-6 h-6 rounded-full border-2 border-border border-t-primary animate-spin" />
    </div>
  );
}
function lazyPage<P extends object>(load: () => Promise<{ default: ComponentType<P> }>) {
  const Page = lazy(load);
  return function LazyPage(props: P) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return <PageLoading />;
    return (
      <Suspense fallback={<PageLoading />}>
        <Page {...(props as P & JSX.IntrinsicAttributes)} />
      </Suspense>
    );
  };
}

const DashboardOverview = lazyPage(() => import("./pages/dashboard/Overview"));
const DashboardChatbot = lazyPage(() => import("./pages/dashboard/ChatbotConfig"));
const DashboardScanner = lazyPage(() => import("./pages/dashboard/Scanner"));
const DashboardSEO = lazyPage(() => import("./pages/dashboard/SEO"));
const DashboardConversations = lazyPage(() => import("./pages/dashboard/Conversations"));
const DashboardTraining = lazyPage(() => import("./pages/dashboard/Training"));
const DashboardSnippet = lazyPage(() => import("./pages/dashboard/Snippet"));
const DashboardNotifications = lazyPage(() => import("./pages/dashboard/Notifications"));
const DashboardBilling = lazyPage(() => import("./pages/dashboard/Billing"));
const DashboardClients = lazyPage(() => import("@/pages/dashboard/Clients"));
const DashboardAdmin = lazyPage(() => import("@/pages/dashboard/Admin"));
const DashboardOnboarding = lazyPage(() => import("@/pages/dashboard/Onboarding"));
const DashboardProfile = lazyPage(() => import("@/pages/dashboard/Profile"));
const DashboardLeads = lazyPage(() => import("@/pages/dashboard/Leads"));
const DashboardBlog = lazyPage(() => import("@/pages/dashboard/Blog"));
const DashboardWebSetup = lazyPage(() => import("@/pages/dashboard/WebSetup"));
const ClientReport = lazyPage(() => import("@/pages/dashboard/ClientReport"));
const TestPayment = lazyPage(() => import("@/pages/TestPayment"));

function Router() {
  useSeoMeta();
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={DashboardOverview} />
      <Route path="/dashboard/chatbot" component={DashboardChatbot} />
      <Route path="/dashboard/scanner" component={DashboardScanner} />
      <Route path="/dashboard/training" component={DashboardTraining} />
      <Route path="/dashboard/seo" component={DashboardSEO} />
      <Route path="/dashboard/conversations" component={DashboardConversations} />
      <Route path="/dashboard/snippet" component={DashboardSnippet} />
      <Route path="/dashboard/notifications" component={DashboardNotifications} />
      <Route path="/dashboard/billing" component={DashboardBilling} />
      <Route path="/dashboard/clients" component={DashboardClients} />
      <Route path="/dashboard/clients/:id/report" component={ClientReport} />
      <Route path="/dashboard/admin" component={DashboardAdmin} />
      <Route path="/dashboard/profile" component={DashboardProfile} />
      <Route path="/dashboard/leads" component={DashboardLeads} />
      <Route path="/dashboard/onboarding" component={DashboardOnboarding} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/legal/terms" component={Terms} />
      <Route path="/legal/privacy" component={Privacy} />
      <Route path="/legal/cookies" component={Cookies} />
      <Route path="/legal/refunds" component={Refunds} />
      <Route path="/test-payment" component={TestPayment} />
      <Route path="/blog" component={BlogPage} />
      <Route path="/blog/:slug" component={BlogPostPage} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/dashboard/blog" component={DashboardBlog} />
      <Route path="/dashboard/web-setup" component={DashboardWebSetup} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

// Keeps the browser/status-bar color in sync with the active theme so the
// site feels like a native app on mobile (no mismatched chrome color).
function DynamicThemeColor() {
  const { theme } = useTheme();
  useEffect(() => {
    if (typeof document === "undefined") return;
    const color = theme === "dark" ? "#080f1a" : "#ffffff";
    let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = color;
  }, [theme]);
  return null;
}

function DynamicFavicon() {
  const { data } = trpc.siteSettings.get.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  useEffect(() => {
    const url = data?.faviconUrl;
    if (!url || typeof document === "undefined") return;
    // Remove ALL existing icon links (index.html ships two: 16x16 and 32x32),
    // otherwise the browser may keep using one of the old ones.
    const existing = document.querySelectorAll<HTMLLinkElement>(
      'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]'
    );
    existing.forEach((el) => el.parentNode?.removeChild(el));
    // Add a single fresh icon link. A cache-busting query helps the browser
    // pick up the change without a hard refresh.
    const link = document.createElement("link");
    link.rel = "icon";
    link.href = url + (url.includes("?") ? "&" : "?") + "v=" + Date.now();
    document.head.appendChild(link);
  }, [data?.faviconUrl]);
  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster />
          <DynamicThemeColor />
          <DynamicFavicon />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
