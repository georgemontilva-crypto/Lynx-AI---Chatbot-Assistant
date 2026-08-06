/**
 * UpgradeGate
 *
 * Renders a full-page upgrade prompt when the current plan doesn't include
 * the requested feature. Wrap any page or section with this component.
 *
 * Usage:
 *   <UpgradeGate feature="seoAnalysis" requiredPlan="embedded" title="SEO Analysis">
 *     <ActualPageContent />
 *   </UpgradeGate>
 */

import { motion } from "framer-motion";
import { Link } from "wouter";
import { Lock, Zap, CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePlanFeatures, type PlanId } from "@/hooks/usePlanFeatures";

// ─── Plan upgrade info ────────────────────────────────────────────────────────

const PLAN_INFO: Record<PlanId, { label: string; price: string; color: string; bg: string; features: string[] }> = {
  free: {
    label: "Free",
    price: "Free",
    color: "text-slate-500",
    bg: "bg-slate-500/10",
    features: ["1 site scan", "50 messages/month", "14-day chatbot trial", "Basic chatbot config"],
  },
  cloud: {
    label: "Cloud AI",
    price: "$199/mo",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    features: ["500 messages/month", "1 website", "AI trained on your site", "Lead capture"],
  },
  embedded: {
    label: "Embedded AI",
    price: "$399/mo",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    features: ["2,000 messages/month", "SEO analysis", "Conversation history", "Notifications", "Advanced analytics"],
  },
  whitelabel: {
    label: "White-Label",
    price: "$499/mo",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    features: ["8,000 msg/month own site", "6,000 msg/month per client", "15 client websites (base plan)", "Custom branding & logo", "My Clients panel", "Expand with client packs"],
  },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface UpgradeGateProps {
  /** Feature key from PlanFeatures to check */
  feature: keyof ReturnType<typeof usePlanFeatures>;
  /** Minimum plan required */
  requiredPlan: PlanId;
  /** Page title shown in the gate */
  title: string;
  /** Short description of what this feature does */
  description?: string;
  children: React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function UpgradeGate({ feature, requiredPlan, title, description, children }: UpgradeGateProps) {
  const planFeatures = usePlanFeatures();

  // While loading, render children (avoid flash of gate)
  if (planFeatures.loading) return <>{children}</>;

  const hasAccess = planFeatures[feature as keyof typeof planFeatures] as boolean;

  if (hasAccess) return <>{children}</>;

  const info = PLAN_INFO[requiredPlan];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4"
    >
      {/* Lock icon */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className={`w-16 h-16 rounded-2xl ${info.bg} flex items-center justify-center mb-6`}
      >
        <Lock className={`w-7 h-7 ${info.color}`} />
      </motion.div>

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
      >
        <Badge variant="outline" className={`mb-3 ${info.color} border-current/30 text-xs`}>
          <Zap className="w-3 h-3 mr-1" />
          {info.label} feature
        </Badge>
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-8">
          {description ?? `${title} is available on the ${info.label} plan and above. Upgrade to unlock this feature.`}
        </p>
      </motion.div>

      {/* Plan card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className={`w-full max-w-xs rounded-2xl border ${info.bg} border-current/20 p-5 mb-6`}
        style={{ borderColor: "currentColor" }}
      >
        <div className="flex items-center justify-between mb-4">
          <span className={`font-bold text-base ${info.color}`}>{info.label}</span>
          <span className={`text-sm font-semibold ${info.color}`}>{info.price}</span>
        </div>
        <ul className="space-y-2 text-left">
          {info.features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              {f}
            </li>
          ))}
        </ul>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <Link href="/dashboard/billing">
          <Button className="lynx-gradient text-white border-0 font-semibold">
            Upgrade to {info.label}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="outline">Back to Overview</Button>
        </Link>
      </motion.div>

      <p className="text-xs text-muted-foreground mt-6">
        Current plan: <span className={`font-semibold ${planFeatures.planColor}`}>{planFeatures.planLabel}</span>
      </p>
    </motion.div>
  );
}
