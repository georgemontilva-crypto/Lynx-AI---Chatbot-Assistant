import { useState, useEffect } from "react";
import DashboardShell from "@/components/DashboardShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  CreditCard,
  CheckCircle,
  Zap,
  Globe,
  Building2,
  AlertTriangle,
  ExternalLink,
  XCircle,
  RefreshCw,
  Shield,
} from "lucide-react";
import { useLocation } from "wouter";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BillingStatus {
  plan: "cloud" | "embedded" | "whitelabel";
  subscriptionId: string | null;
  subscriptionStatus: "active" | "cancelled" | "suspended" | "expired" | "pending" | null;
  subscriptionPlanId: string | null;
  nextBillingDate: string | null;
}

// ─── Plan definitions ─────────────────────────────────────────────────────────

const PLANS = [
  {
    id: "cloud",
    name: "Cloud AI",
    price: "$199",
    period: "/mo",
    icon: Globe,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    ringColor: "ring-blue-500/40",
    description: "Perfect for small businesses and personal websites.",
    features: [
      "500 messages/month",
      "1 website",
      "AI trained on your site content",
      "Lead capture",
      "Email support",
    ],
  },
  {
    id: "embedded",
    name: "Embedded AI",
    price: "$399",
    period: "/mo",
    icon: Zap,
    color: "text-violet-500",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/30",
    ringColor: "ring-violet-500/40",
    popular: true,
    description: "For growing businesses that need more capacity.",
    features: [
      "2,000 messages/month",
      "1 website",
      "Priority AI responses",
      "SEO analysis",
      "Conversation analytics",
      "Priority support",
    ],
  },
  {
    id: "whitelabel",
    name: "White-Label",
    price: "$499",
    period: "/mo",
    icon: Building2,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    ringColor: "ring-emerald-500/40",
    description: "One chatbot, your brand. Install it on all your clients' sites.",
    features: [
      "8,000 messages/month",
      "1 chatbot configured by you, installed on up to 15 client sites",
      "Full white-label — your brand, your colors, your domain",
      "Client management dashboard with per-site analytics",
      "Generate & download PDF reports per client",
      "Expand with client packs (+$99-$449/mo)",
      "Priority support & dedicated account manager",
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Billing() {
  const [location] = useLocation();
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [subscribingPlan, setSubscribingPlan] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Parse URL params for success/cancelled feedback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "1") {
      window.history.replaceState({}, "", "/dashboard/billing");
      // Poll PayPal directly to confirm the subscription is ACTIVE
      // (webhook may be delayed or not configured yet)
      verifyAndActivateSubscription();
    }
    if (params.get("cancelled") === "1") {
      toast.info("Subscription setup was cancelled.");
      window.history.replaceState({}, "", "/dashboard/billing");
    }
  }, []);

  async function verifyAndActivateSubscription(attempt = 1) {
    const maxAttempts = 8;
    const delayMs = attempt <= 3 ? 3000 : 5000; // 3s first 3 tries, then 5s

    try {
      const res = await fetch("/api/billing/verify-subscription", {
        method: "POST",
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json() as { activated: boolean; plan?: string; status?: string };
        if (data.activated) {
          toast.success("🎉 Subscription activated! Welcome to Lynx AI.", { duration: 6000 });
          await fetchBillingStatus();
          return;
        }
        // Still pending — retry
        if (attempt < maxAttempts) {
          setTimeout(() => verifyAndActivateSubscription(attempt + 1), delayMs);
        } else {
          // After all retries, just refresh status and show a softer message
          toast.info("Payment received. Your plan will activate shortly — refresh the page in a moment.", { duration: 8000 });
          await fetchBillingStatus();
        }
      } else {
        // Fallback: just reload status
        await fetchBillingStatus();
        toast.success("Payment received! Your plan is being activated.", { duration: 5000 });
      }
    } catch {
      await fetchBillingStatus();
    }
  }

  // Load billing status
  useEffect(() => {
    fetchBillingStatus();
  }, []);

  async function fetchBillingStatus() {
    setLoadingStatus(true);
    try {
      const res = await fetch("/api/billing/status", { credentials: "include" });
      if (res.ok) {
        const data = await res.json() as BillingStatus;
        setBillingStatus(data);
      }
    } catch {
      toast.error("Failed to load billing status");
    } finally {
      setLoadingStatus(false);
    }
  }

  async function handleSubscribe(planId: string) {
    setSubscribingPlan(planId);
    try {
      const res = await fetch("/api/billing/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan: planId }),
      });

      if (!res.ok) {
        const err = await res.json() as { error?: string };
        toast.error(err.error ?? "Failed to create subscription");
        return;
      }

      const data = await res.json() as { approvalUrl: string };
      // Redirect to PayPal approval page
      window.location.href = data.approvalUrl;
    } catch {
      toast.error("Failed to start subscription. Please try again.");
    } finally {
      setSubscribingPlan(null);
    }
  }

  async function handleCancel() {
    if (!confirm("Are you sure you want to cancel your subscription? Your chatbot will continue working until the end of the billing period.")) return;

    setCancelling(true);
    try {
      const res = await fetch("/api/billing/cancel", {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json() as { error?: string };
        toast.error(err.error ?? "Failed to cancel subscription");
        return;
      }

      toast.success("Subscription cancelled. Your chatbot will remain active until the end of the billing period.");
      await fetchBillingStatus();
    } catch {
      toast.error("Failed to cancel subscription. Please try again.");
    } finally {
      setCancelling(false);
    }
  }

  const currentPlan = billingStatus?.plan ?? "cloud";
  const isActive = billingStatus?.subscriptionStatus === "active";
  const isPending = billingStatus?.subscriptionStatus === "pending";
  const isCancelled = billingStatus?.subscriptionStatus === "cancelled";
  const hasSubscription = !!billingStatus?.subscriptionId;
  // Plan asignado manualmente por admin (sin suscripción PayPal)
  const isManualPlan = billingStatus !== null && !billingStatus.subscriptionStatus && currentPlan !== "cloud";

  return (
    <DashboardShell title="Billing">
      <div className="max-w-4xl mx-auto space-y-6 pb-10">

        {/* Current plan status */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Card className="glass-card border-border/40">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <CreditCard className="w-4.5 h-4.5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-base">Current Subscription</h2>
                  <p className="text-xs text-muted-foreground">Manage your Lynx AI plan</p>
                </div>
                <div className="ml-auto">
                  <Button variant="ghost" size="sm" onClick={fetchBillingStatus} disabled={loadingStatus}>
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingStatus ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>

              {loadingStatus ? (
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-64" />
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold capitalize">
                        {currentPlan === "whitelabel" ? "White-Label" : currentPlan === "cloud" ? "Cloud AI" : "Embedded AI"}
                      </span>
                      {isActive && (
                        <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" /> Active
                        </Badge>
                      )}
                      {isPending && (
                        <Badge className="bg-yellow-500/15 text-yellow-600 border-yellow-500/30 text-xs">
                          Pending
                        </Badge>
                      )}
                      {isCancelled && (
                        <Badge className="bg-red-500/15 text-red-600 border-red-500/30 text-xs">
                          <XCircle className="w-3 h-3 mr-1" /> Cancelled
                        </Badge>
                      )}
                      {isManualPlan && (
                        <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 text-xs">
                          <Shield className="w-3 h-3 mr-1" /> Plan activo
                        </Badge>
                      )}
                      {!hasSubscription && !isManualPlan && (
                        <Badge variant="outline" className="text-xs">Free tier</Badge>
                      )}
                    </div>
                    {billingStatus?.nextBillingDate && isActive && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Next billing: {new Date(billingStatus.nextBillingDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </p>
                    )}
                    {billingStatus?.subscriptionId && (
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                        ID: {billingStatus.subscriptionId}
                      </p>
                    )}
                  </div>

                  {isActive && (
                    <div className="ml-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancel}
                        disabled={cancelling}
                        className="text-red-500 border-red-500/30 hover:bg-red-500/10"
                      >
                        {cancelling ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-2" /> : <XCircle className="w-3.5 h-3.5 mr-2" />}
                        Cancel Subscription
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Plan cards */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            {isActive ? "Upgrade or change plan" : "Choose a plan"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANS.map((plan, i) => {
              const Icon = plan.icon;
              const isCurrentPlan = plan.id === currentPlan && (isActive || isManualPlan);
              const isLoading = subscribingPlan === plan.id;

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                >
                  <Card className={`glass-card h-full flex flex-col relative ${
                    isCurrentPlan
                      ? `border-primary/40 ring-1 ring-primary/20`
                      : "border-border/40"
                  } ${plan.popular && !isCurrentPlan ? "border-violet-500/30" : ""}`}>
                    {plan.popular && !isCurrentPlan && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-violet-500 text-white text-xs px-3">Most Popular</Badge>
                      </div>
                    )}
                    {isCurrentPlan && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground text-xs px-3">
                          <CheckCircle className="w-3 h-3 mr-1" /> Current Plan
                        </Badge>
                      </div>
                    )}
                    <CardContent className="p-5 flex flex-col h-full">
                      <div className={`w-10 h-10 rounded-xl ${plan.bgColor} flex items-center justify-center mb-4`}>
                        <Icon className={`w-5 h-5 ${plan.color}`} />
                      </div>

                      <div className="mb-3">
                        <h3 className="font-bold text-base">{plan.name}</h3>
                        <div className="flex items-baseline gap-0.5 mt-1">
                          <span className="text-2xl font-bold">{plan.price}</span>
                          <span className="text-sm text-muted-foreground">{plan.period}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                      </div>

                      <ul className="space-y-1.5 mb-5 flex-1">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>

                      <Button
                        className={`w-full ${isCurrentPlan ? "opacity-60 cursor-not-allowed" : ""}`}
                        variant={isCurrentPlan ? "outline" : "default"}
                        disabled={isCurrentPlan || isLoading || !!subscribingPlan}
                        onClick={() => !isCurrentPlan && handleSubscribe(plan.id)}
                      >
                        {isLoading ? (
                          <><RefreshCw className="w-3.5 h-3.5 animate-spin mr-2" /> Redirecting...</>
                        ) : isCurrentPlan ? (
                          "Current Plan"
                        ) : (
                          <><ExternalLink className="w-3.5 h-3.5 mr-2" /> Subscribe with PayPal</>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Client Expansion Packs — only shown for White-Label users */}
        {currentPlan === "whitelabel" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4 }}>
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Client Expansion Packs
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Your White-Label plan includes <strong>15 client slots</strong>. Need more? Add expansion packs — each pack adds independent client slots billed monthly alongside your base plan.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { name: "Starter Pack", clients: 15, price: "$99", color: "text-sky-500", bg: "bg-sky-500/10", border: "border-sky-500/20", perClient: "$6.60" },
                { name: "Growth Pack", clients: 30, price: "$179", color: "text-violet-500", bg: "bg-violet-500/10", border: "border-violet-500/20", perClient: "$5.97" },
                { name: "Agency Pack", clients: 60, price: "$299", color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20", perClient: "$4.98", popular: true },
                { name: "Enterprise Pack", clients: 100, price: "$449", color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20", perClient: "$4.49" },
              ].map((pack, i) => (
                <motion.div key={pack.name} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 + i * 0.06 }}>
                  <Card className={`glass-card relative ${pack.border} border`}>
                    {pack.popular && (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                        <Badge className="bg-amber-500 text-white text-xs px-2 py-0.5">Best Value</Badge>
                      </div>
                    )}
                    <CardContent className="p-4">
                      <div className={`text-xs font-semibold ${pack.color} mb-1`}>{pack.name}</div>
                      <div className="flex items-baseline gap-0.5 mb-0.5">
                        <span className="text-xl font-bold">{pack.price}</span>
                        <span className="text-xs text-muted-foreground">/mo</span>
                      </div>
                      <div className="text-xs text-muted-foreground mb-3">
                        <span className="font-semibold text-foreground">+{pack.clients} clients</span> · {pack.perClient}/client
                      </div>
                      <div className="text-xs text-muted-foreground mb-3 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                          6,000 msg/month each
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                          Independent counters
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                          Custom branding per client
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className={`w-full text-xs ${pack.bg} ${pack.color} border ${pack.border} hover:opacity-80`}
                        variant="outline"
                        onClick={() => toast.info("Client pack purchasing coming soon! Contact support to add slots now.")}
                      >
                        Add Pack
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Packs are added to your monthly invoice. You can stack multiple packs. Contact support to purchase.
            </p>
          </motion.div>
        )}

        {/* Security note */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
            <Shield className="w-3.5 h-3.5" />
            <span>Payments are processed securely by PayPal. We never store your card details.</span>
          </div>
        </motion.div>

        {/* Usage alert */}
        {isCancelled && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                Your subscription is cancelled. Your chatbot will stop responding when the current billing period ends. Subscribe again to keep it running.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </DashboardShell>
  );
}
