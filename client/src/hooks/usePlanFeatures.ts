/**
 * usePlanFeatures
 *
 * Returns which features are available for the current user's plan.
 * Fetches billing status from /api/billing/status (uses the session cookie).
 *
 * Plan hierarchy:  free < cloud < embedded < whitelabel
 *
 * Feature matrix:
 * ┌─────────────────────────────┬──────┬───────┬──────────┬────────────┐
 * │ Feature                     │ Free │ Cloud │ Embedded │ White-Label│
 * ├─────────────────────────────┼──────┼───────┼──────────┼────────────┤
 * │ chatbot (basic config)      │  ✓*  │  ✓    │    ✓     │     ✓      │
 * │ scanner (site scan)         │  1x  │  ✓    │    ✓     │     ✓      │
 * │ snippet (install code)      │  ✓   │  ✓    │    ✓     │     ✓      │
 * │ seo analysis                │  ✗   │  ✗    │    ✓     │     ✓      │
 * │ conversations history       │  ✗   │  ✗    │    ✓     │     ✓      │
 * │ notifications               │  ✗   │  ✗    │    ✓     │     ✓      │
 * │ leads                       │  ✗   │  ✗    │    ✓     │     ✓      │
 * │ whitelabel clients panel    │  ✗   │  ✗    │    ✗     │     ✓      │
 * │ custom branding             │  ✗   │  ✗    │    ✗     │     ✓      │
 * │ analytics (advanced)        │  ✗   │  ✗    │    ✓     │     ✓      │
 * └─────────────────────────────┴──────┴───────┴──────────┴────────────┘
 *
 * Free plan limits:
 *   - 1 site scan only (no re-scans)
 *   - 50 chat messages/month
 *   - Chat disabled after 14 days from signup
 *   - No leads, no SEO analysis, no conversations history
 *   - No weekly auto-scan
 *
 * msg limits:  free=50  cloud=500  embedded=2000  whitelabel=8000 (own site) / 6000 per client site
 */

import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";

export type PlanId = "free" | "cloud" | "embedded" | "whitelabel";

export interface PlanFeatures {
  plan: PlanId;
  isActive: boolean;
  isFree: boolean;
  trialDaysLeft: number | null; // null if not free plan
  trialExpired: boolean;
  msgLimit: number;

  // Feature flags
  chatbot: boolean;
  scanner: boolean;
  canRescan: boolean; // false for free plan after first scan
  snippet: boolean;
  seoAnalysis: boolean;
  conversations: boolean;
  notifications: boolean;
  leads: boolean;
  whitelabelClients: boolean;
  customBranding: boolean;
  advancedAnalytics: boolean;

  // UI helpers
  planLabel: string;
  planColor: string;
  planBg: string;
  loading: boolean;

  // Trigger a manual refetch (e.g. after admin changes plan)
  refresh: () => void;
}

const PLAN_MATRIX: Record<PlanId, Omit<PlanFeatures, "plan" | "isActive" | "isFree" | "trialDaysLeft" | "trialExpired" | "canRescan" | "loading" | "refresh">> = {
  free: {
    msgLimit: 50,
    chatbot: true,
    scanner: true,
    snippet: true,
    seoAnalysis: false,
    conversations: false,
    notifications: false,
    leads: false,
    whitelabelClients: false,
    customBranding: false,
    advancedAnalytics: false,
    planLabel: "Free",
    planColor: "text-slate-500",
    planBg: "bg-slate-500/10",
  },
  cloud: {
    msgLimit: 500,
    chatbot: true,
    scanner: true,
    snippet: true,
    seoAnalysis: false,
    conversations: false,
    notifications: false,
    leads: false,
    whitelabelClients: false,
    customBranding: false,
    advancedAnalytics: false,
    planLabel: "Cloud AI",
    planColor: "text-blue-500",
    planBg: "bg-blue-500/10",
  },
  embedded: {
    msgLimit: 2000,
    chatbot: true,
    scanner: true,
    snippet: true,
    seoAnalysis: true,
    conversations: true,
    notifications: true,
    leads: true,
    whitelabelClients: false,
    customBranding: false,
    advancedAnalytics: true,
    planLabel: "Embedded AI",
    planColor: "text-violet-500",
    planBg: "bg-violet-500/10",
  },
  whitelabel: {
    msgLimit: 8000,
    chatbot: true,
    scanner: true,
    snippet: true,
    seoAnalysis: true,
    conversations: true,
    notifications: true,
    leads: true,
    whitelabelClients: true,
    customBranding: true,
    advancedAnalytics: true,
    planLabel: "White-Label",
    planColor: "text-emerald-500",
    planBg: "bg-emerald-500/10",
  },
};

interface BillingStatusResponse {
  plan: PlanId;
  subscriptionStatus: "active" | "cancelled" | "suspended" | "expired" | "pending" | null;
  createdAt?: string; // ISO string — used to calculate trial days left
}

// Global refresh signal — incrementing this forces all mounted usePlanFeatures hooks to refetch
let _refreshListeners: Array<() => void> = [];

/** Call this after an admin changes a user's plan to force an immediate refetch in all mounted hooks */
export function clearPlanCache() {
  _refreshListeners.forEach((fn) => fn());
}

export function usePlanFeatures(): PlanFeatures {
  const [status, setStatus] = useState<BillingStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchTick, setFetchTick] = useState(0);

  // Admins always get full access — use cached trpc.auth.me (no extra fetch)
  const meQuery = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const isAdmin = meQuery.data?.role === "admin";

  // Register this hook instance as a refresh listener
  useEffect(() => {
    const trigger = () => setFetchTick((t) => t + 1);
    _refreshListeners.push(trigger);
    return () => {
      _refreshListeners = _refreshListeners.filter((fn) => fn !== trigger);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/billing/status", { credentials: "include" });
        if (res.ok) {
          const data = await res.json() as BillingStatusResponse;
          if (!cancelled) setStatus(data);
        }
      } catch {
        // fail open — default to free
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [fetchTick]);

  const refresh = useCallback(() => setFetchTick((t) => t + 1), []);

  const plan: PlanId = status?.plan ?? "free";

  // isActive: true if PayPal subscription is active OR if plan was manually assigned
  const hasPaypalActive = status?.subscriptionStatus === "active";
  const isManualPlan = status !== null && !status.subscriptionStatus && plan !== "free";
  const isActive = hasPaypalActive || isManualPlan;

  // Free plan trial calculation
  const isFree = plan === "free";
  let trialDaysLeft: number | null = null;
  let trialExpired = false;
  if (isFree && status?.createdAt) {
    const daysSinceSignup = (Date.now() - new Date(status.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    trialDaysLeft = Math.max(0, Math.ceil(14 - daysSinceSignup));
    trialExpired = daysSinceSignup > 14;
  }

  // canRescan: free plan users can only scan once (enforced by backend too)
  // We set it to true here; the backend will throw if they try to rescan
  const canRescan = !isFree;

  // Admins always get full whitelabel-level access with no loading flicker
  if (isAdmin) {
    const adminMatrix = PLAN_MATRIX["whitelabel"];
    return {
      plan: "whitelabel",
      isActive: true,
      isFree: false,
      trialDaysLeft: null,
      trialExpired: false,
      canRescan: true,
      loading: false,
      refresh,
      ...adminMatrix,
    };
  }

  const matrix = PLAN_MATRIX[plan];
  return { plan, isActive, isFree, trialDaysLeft, trialExpired, canRescan, loading, refresh, ...matrix };
}
