import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/_core/hooks/useAuth";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { trpc } from "@/lib/trpc";
import {
  LayoutDashboard,
  Bot,
  Globe,
  BarChart3,
  MessageSquare,
  Code2,
  Bell,
  CreditCard,
  LogOut,
  Menu,
  ChevronRight,
  Sun,
  Moon,
  Lock,
  Users2,
  Users,
  Zap,
  ShieldCheck,
  UserCircle,
  BookOpen,
  RefreshCw,
  Rocket,
  GraduationCap,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { LynxLogo } from "@/components/LynxLogo";

// ─── Nav item definition ──────────────────────────────────────────────────────

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  exact?: boolean;
  featureKey?: "chatbot" | "scanner" | "snippet" | "seoAnalysis" | "conversations" | "notifications" | "whitelabelClients";
  requiredPlan?: "embedded" | "whitelabel";
}

type NavSection = { title: string; items: NavItem[] };

const navSections: NavSection[] = [
  {
    title: "General",
    items: [
      { href: "/dashboard",           icon: LayoutDashboard, label: "Overview",        exact: true },
      { href: "/dashboard/chatbot",   icon: Bot,             label: "Chatbot",         featureKey: "chatbot" },
      { href: "/dashboard/training",  icon: GraduationCap,   label: "Training" },
      { href: "/dashboard/snippet",   icon: Code2,           label: "Install Snippet", featureKey: "snippet" },
    ],
  },
  {
    title: "SEO",
    items: [
      { href: "/dashboard/scanner",   icon: Globe,           label: "Site Scanner",    featureKey: "scanner" },
      { href: "/dashboard/seo",       icon: BarChart3,       label: "SEO Analysis",    featureKey: "seoAnalysis",   requiredPlan: "embedded" },
    ],
  },
  {
    title: "Visitantes",
    items: [
      { href: "/dashboard/conversations", icon: MessageSquare, label: "Conversations", featureKey: "conversations", requiredPlan: "embedded" },
      { href: "/dashboard/leads",         icon: Users,         label: "Leads",         featureKey: "conversations" },
      { href: "/dashboard/notifications", icon: Bell,          label: "Notifications", featureKey: "notifications", requiredPlan: "embedded" },
    ],
  },
  {
    title: "White-Label",
    items: [
      { href: "/dashboard/clients",   icon: Users2,          label: "My Clients",       featureKey: "whitelabelClients", requiredPlan: "whitelabel" },
      { href: "/dashboard/web-setup", icon: Rocket,          label: "Get Your Website", requiredPlan: "whitelabel" },
    ],
  },
  {
    title: "Cuenta",
    items: [
      { href: "/dashboard/billing",   icon: CreditCard,      label: "Billing" },
    ],
  },
];

// ─── Upgrade badge labels ─────────────────────────────────────────────────────

const PLAN_UPGRADE_LABEL: Record<string, string> = {
  embedded: "Embedded+",
  whitelabel: "White-Label",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface DashboardShellProps {
  children: React.ReactNode;
  title?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardShell({ children, title }: DashboardShellProps) {
  const [location, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, isAuthenticated, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const planFeatures = usePlanFeatures();
  const utils = trpc.useUtils();
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => window.location.href = "/",
  });

  // ─── Persist last dashboard route ─────────────────────────────────────────
  useEffect(() => {
    if (location.startsWith("/dashboard")) {
      localStorage.setItem("lynx-last-route", location);
    }
  }, [location]);


  // Hide the floating chat widget while inside the dashboard, restore on unmount
  useEffect(() => {
    type LynxAPI = { hide: () => void; show: () => void };
    const w = () => (window as unknown as { LynxAI?: LynxAPI }).LynxAI;
    const tryHide = () => { const api = w(); if (api?.hide) { api.hide(); return true; } return false; };
    if (!tryHide()) {
      const t = setTimeout(tryHide, 1500);
      return () => { clearTimeout(t); w()?.show(); };
    }
    return () => { w()?.show(); };
  }, []);
  // ─── Refresh button state ─────────────────────────────────────────────────
  const [isRefreshing, setIsRefreshing] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await utils.invalidate();
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  }, [utils, isRefreshing]);

  // MUST be before any conditional returns (Rules of Hooks)
  const { data: onboardingProgress } = trpc.onboarding.get.useQuery(undefined, {
    enabled: isAuthenticated && location.startsWith("/dashboard"),
    refetchOnWindowFocus: false,
    retry: false,
  });

  useEffect(() => {
    if (
      isAuthenticated &&
      location === "/dashboard" &&
      onboardingProgress !== undefined &&
      !onboardingProgress.completedAt
    ) {
      navigate("/dashboard/onboarding");
    }
  }, [isAuthenticated, location, onboardingProgress, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center animate-pulse">
            <LynxLogo className="h-8 w-auto object-contain" />
          </div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-sm px-6">
          <div className="flex items-center justify-center mx-auto mb-6">
            <LynxLogo className="h-10 w-auto object-contain" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Access your dashboard</h1>
          <p className="text-muted-foreground text-sm mb-8">
            Sign in to manage your Lynx AI chatbot and view your analytics.
          </p>
          <Button
            className="lynx-gradient text-white border-0 w-full font-semibold"
            onClick={() => navigate("/login")}
          >
            Sign in
          </Button>
          <Link href="/">
            <Button variant="ghost" className="w-full mt-3 text-muted-foreground">
              Back to home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isActivePath = (href: string, exact?: boolean) => {
    if (exact) return location === href;
    return location.startsWith(href) && href !== "/dashboard";
  };

  // Check if a nav item is accessible for the current plan
  const isLocked = (item: NavItem): boolean => {
    if (!item.featureKey) return false;
    return !(planFeatures as unknown as Record<string, boolean>)[item.featureKey];
  };

  const handleLockedClick = (item: NavItem) => {
    // Navigate to billing with a hint
    navigate("/dashboard/billing");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-border/40">
        <Link href="/">
          <div className="cursor-pointer">
            <LynxLogo className="h-8 w-auto object-contain" />
          </div>
        </Link>
      </div>

      {/* Plan badge */}
      {!planFeatures.loading && (
        <div className="px-4 py-2.5 border-b border-border/40">
          <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${planFeatures.planBg}`}>
            <Zap className={`w-3 h-3 ${planFeatures.planColor}`} />
            <span className={`text-xs font-semibold ${planFeatures.planColor}`}>
              {planFeatures.planLabel}
            </span>
            {!planFeatures.isActive && (
              <span className="text-xs text-muted-foreground ml-auto">Free tier</span>
            )}
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {/* Admin section — only for admins */}
        {user?.role === "admin" && (
          <>
            <p className="px-3 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              Administración
            </p>
            <Link href="/dashboard/admin">
              <motion.div
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                  location === "/dashboard/admin"
                    ? "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span className="flex-1">Admin Panel</span>
                <Badge className="text-[9px] px-1.5 py-0 h-4 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-0">
                  ADMIN
                </Badge>
              </motion.div>
            </Link>
            <Link href="/dashboard/blog">
              <motion.div
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                  location.startsWith("/dashboard/blog")
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
              >
                <BookOpen className={`w-4 h-4 shrink-0 ${location.startsWith("/dashboard/blog") ? "text-primary" : ""}`} />
                <span className="flex-1">Blog</span>
                {location.startsWith("/dashboard/blog") && <ChevronRight className="w-3 h-3 text-primary" />}
              </motion.div>
            </Link>
          </>
        )}
        {navSections.map((section) => {
          const visibleItems = section.items;
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.title}>
              <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {section.title}
              </p>
              {visibleItems.map((item) => {
          const active = isActivePath(item.href, item.exact);
          const locked = isLocked(item);

          if (locked) {
            // Locked item — greyed out with lock icon and upgrade badge
            return (
              <motion.div
                key={item.href}
                whileHover={{ x: 1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleLockedClick(item)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent/30 transition-all duration-200 group"
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.requiredPlan && (
                  <Badge
                    variant="outline"
                    className="text-[9px] px-1.5 py-0 h-4 border-border/50 text-muted-foreground/60 group-hover:border-primary/40 group-hover:text-primary/70 transition-colors"
                  >
                    {PLAN_UPGRADE_LABEL[item.requiredPlan]}
                  </Badge>
                )}
                <Lock className="w-3 h-3 shrink-0 opacity-40 group-hover:opacity-60" />
              </motion.div>
            );
          }

          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
              >
                <item.icon className={`w-4 h-4 shrink-0 ${active ? "text-primary" : ""}`} />
                <span className="flex-1">{item.label}</span>
                {active && <ChevronRight className="w-3 h-3 text-primary" />}
              </motion.div>
            </Link>
          );
              })}
            </div>
          );
        })}
      </nav>

      {/* Onboarding progress indicator */}
      {onboardingProgress && !onboardingProgress.completedAt && (
        <div className="px-3 pb-2">
          <Link href="/dashboard/onboarding">
            <div
              className="px-3 py-2.5 rounded-xl bg-primary/8 hover:bg-primary/12 border border-primary/20 transition-colors cursor-pointer"
              onClick={() => setSidebarOpen(false)}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-primary">Setup progress</span>
                <span className="text-xs text-primary/70">
                  {[onboardingProgress.step1Done, onboardingProgress.step2Done, onboardingProgress.step3Done].filter(Boolean).length}/3
                </span>
              </div>
              <div className="w-full h-1.5 bg-primary/15 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${([onboardingProgress.step1Done, onboardingProgress.step2Done, onboardingProgress.step3Done].filter(Boolean).length / 3) * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-primary/60 mt-1.5">Click to continue setup</p>
            </div>
          </Link>
        </div>
      )}

      {/* User section */}
      <div className="px-3 py-4 border-t border-border/40 space-y-2">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
        </button>
        <Link href="/dashboard/profile">
          <div
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted/30 hover:bg-accent/50 transition-colors cursor-pointer"
            onClick={() => setSidebarOpen(false)}
          >
            <Avatar className="w-7 h-7">
              <AvatarFallback className="text-xs lynx-gradient text-white">
                {user?.name?.[0]?.toUpperCase() ?? "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{user?.name ?? "User"}</div>
              <div className="text-xs text-muted-foreground truncate">{user?.email ?? ""}</div>
            </div>
            <div className="flex items-center gap-1">
              <UserCircle className="w-3.5 h-3.5 text-muted-foreground/60" />
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); logout.mutate(); }}
                className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col bg-sidebar border-r border-sidebar-border fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="fixed inset-y-0 left-0 w-60 bg-sidebar border-r border-sidebar-border z-50 lg:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 lg:ml-60 flex flex-col h-full overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 h-14 border-b border-border/40 bg-background/80 backdrop-blur-xl flex items-center px-4 sm:px-6 gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1">
            {title && (
              <h1 className="text-sm font-semibold text-foreground">{title}</h1>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Refresh button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Refresh"
              className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 transition-transform duration-500 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
            <Link href="/dashboard/notifications">
              <button className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors relative">
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
              </button>
            </Link>
            <Link href="/dashboard/profile">
              <Avatar className="w-8 h-8 cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all">
                <AvatarFallback className="text-xs lynx-gradient text-white">
                  {user?.name?.[0]?.toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main
          ref={mainRef}
          data-no-pull-refresh
          className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto"
          style={{ overscrollBehavior: "none" }}
        >

          {/* Free plan trial banner */}
          {planFeatures.isFree && !planFeatures.loading && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-4 rounded-xl border px-4 py-3 flex items-center gap-3 ${
                planFeatures.trialExpired
                  ? "bg-red-500/10 border-red-500/30"
                  : planFeatures.trialDaysLeft !== null && planFeatures.trialDaysLeft <= 3
                  ? "bg-orange-500/10 border-orange-500/30"
                  : "bg-blue-500/10 border-blue-500/30"
              }`}
            >
              <Zap className={`w-4 h-4 shrink-0 ${
                planFeatures.trialExpired ? "text-red-500" :
                planFeatures.trialDaysLeft !== null && planFeatures.trialDaysLeft <= 3 ? "text-orange-500" :
                "text-blue-500"
              }`} />
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold ${
                  planFeatures.trialExpired ? "text-red-500" :
                  planFeatures.trialDaysLeft !== null && planFeatures.trialDaysLeft <= 3 ? "text-orange-500" :
                  "text-blue-500"
                }`}>
                  {planFeatures.trialExpired
                    ? "Your free trial has expired — chatbot is now inactive"
                    : planFeatures.trialDaysLeft !== null && planFeatures.trialDaysLeft <= 3
                    ? `Only ${planFeatures.trialDaysLeft} day${planFeatures.trialDaysLeft === 1 ? "" : "s"} left in your free trial`
                    : `Free plan — ${planFeatures.trialDaysLeft} day${planFeatures.trialDaysLeft === 1 ? "" : "s"} of chatbot trial remaining`
                  }
                </p>
                <p className="text-xs text-muted-foreground">
                  {planFeatures.trialExpired
                    ? "Upgrade to reactivate your chatbot and unlock all features."
                    : "Upgrade anytime to keep your chatbot active and unlock all features."}
                </p>
              </div>
              <Link href="/dashboard/billing">
                <Button size="sm" className="lynx-gradient text-white border-0 text-xs shrink-0">
                  Upgrade
                </Button>
              </Link>
            </motion.div>
          )}

          {children}
        </main>
      </div>
    </div>
  );
}
