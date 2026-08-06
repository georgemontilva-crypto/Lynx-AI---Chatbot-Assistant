/**
 * TEST PAGE — Payment flow verification ($1/month → Embedded AI plan)
 * DELETE THIS PAGE AND THE /api/billing/create-test-subscription ENDPOINT AFTER TESTING.
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  CheckCircle,
  CreditCard,
  Loader2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Zap,
} from "lucide-react";

export default function TestPayment() {
  const [location, navigate] = useLocation();
  const { user, isAuthenticated, loading } = useAuth();
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const params = new URLSearchParams(location.split("?")[1] ?? "");
  const success = params.get("success") === "1";
  const cancelled = params.get("cancelled") === "1";

  async function handleSubscribe() {
    setSubscribing(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/create-test-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create subscription");
      window.location.href = data.approvalUrl;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setSubscribing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Warning banner */}
      <div className="w-full max-w-md mb-6 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">Test Page — Internal Use Only</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            This page is for payment flow verification. It will be removed after testing is confirmed.
          </p>
        </div>
      </div>

      <div className="w-full max-w-md bg-card border border-border/40 rounded-2xl p-8 shadow-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Payment Flow Test</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Verify the complete PayPal subscription flow
          </p>
        </div>

        {success ? (
          /* Success state */
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-emerald-600 dark:text-emerald-400">Payment Approved!</h2>
            <p className="text-sm text-muted-foreground">
              PayPal approved the subscription. The webhook should fire within a few seconds and update your plan to <strong>Embedded AI</strong>.
            </p>
            <div className="bg-muted rounded-xl p-4 text-left space-y-2 text-sm">
              <p className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" /> Subscription created in PayPal</p>
              <p className="flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /> Waiting for webhook to activate plan...</p>
            </div>
            <Button className="w-full" onClick={() => navigate("/dashboard/billing")}>
              Check Billing Status
            </Button>
          </div>
        ) : cancelled ? (
          /* Cancelled state */
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold">Payment Cancelled</h2>
            <p className="text-sm text-muted-foreground">You cancelled the PayPal flow. You can try again below.</p>
            <Button className="w-full" onClick={handleSubscribe} disabled={subscribing || !isAuthenticated}>
              {subscribing ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Redirecting...</> : "Try Again"}
            </Button>
          </div>
        ) : (
          /* Default state */
          <div className="space-y-6">
            {/* Plan details */}
            <div className="bg-muted/50 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Test Plan</span>
                <Badge variant="secondary">Embedded AI</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Price</span>
                <span className="font-bold text-2xl text-primary">$1<span className="text-sm font-normal text-muted-foreground">/mo</span></span>
              </div>
              <div className="border-t border-border/40 pt-3 space-y-1.5 text-xs text-muted-foreground">
                <p className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Grants Embedded AI plan access</p>
                <p className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Tests full PayPal webhook flow</p>
                <p className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Verifies plan activation in database</p>
              </div>
            </div>

            {/* Auth check */}
            {!isAuthenticated ? (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm text-amber-600 dark:text-amber-400 text-center">
                You must be logged in to test the payment flow.
                <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => navigate("/login")}>
                  Sign in
                </Button>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                Logged in as <strong>{user?.email}</strong> — current plan: <strong>{user?.plan ?? "cloud"}</strong>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
                <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <Button
              className="w-full lynx-gradient text-white border-0 font-semibold"
              size="lg"
              onClick={handleSubscribe}
              disabled={subscribing || !isAuthenticated}
            >
              {subscribing
                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Redirecting to PayPal...</>
                : <><CreditCard className="w-4 h-4 mr-2" /> Subscribe with PayPal — $1/mo</>
              }
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              You will be redirected to PayPal to complete the payment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
