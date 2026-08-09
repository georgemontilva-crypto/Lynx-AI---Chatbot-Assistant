import { Toaster } from "@/components/ui/sonner";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import { useSeoMeta } from "./hooks/useSeoMeta";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import DashboardOverview from "./pages/dashboard/Overview";
import DashboardChatbot from "./pages/dashboard/ChatbotConfig";
import DashboardScanner from "./pages/dashboard/Scanner";
import DashboardSEO from "./pages/dashboard/SEO";
import DashboardConversations from "./pages/dashboard/Conversations";
import DashboardTraining from "./pages/dashboard/Training";
import DashboardSnippet from "./pages/dashboard/Snippet";
import DashboardNotifications from "./pages/dashboard/Notifications";
import DashboardBilling from "./pages/dashboard/Billing";
import DashboardClients from "@/pages/dashboard/Clients";
import DashboardAdmin from "@/pages/dashboard/Admin";
import DashboardOnboarding from "@/pages/dashboard/Onboarding";
import DashboardProfile from "@/pages/dashboard/Profile";
import DashboardLeads from "@/pages/dashboard/Leads";
import BlogPage from "@/pages/BlogPage";
import BlogPostPage from "@/pages/BlogPostPage";
import PricingPage from "@/pages/PricingPage";
import ContactPage from "@/pages/ContactPage";
import DashboardBlog from "@/pages/dashboard/Blog";
import DashboardWebSetup from "@/pages/dashboard/WebSetup";
import ClientReport from "@/pages/dashboard/ClientReport";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Terms from "@/pages/legal/Terms";
import Privacy from "@/pages/legal/Privacy";
import Cookies from "@/pages/legal/Cookies";
import Refunds from "@/pages/legal/Refunds";
import TestPayment from "@/pages/TestPayment";

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
    const color = theme === "dark" ? "#0d0f14" : "#ffffff";
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
      <ThemeProvider defaultTheme="light" switchable>
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
