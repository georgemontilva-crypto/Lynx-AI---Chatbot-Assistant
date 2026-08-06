import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, Cloud, Code2, Building2, Zap } from "lucide-react";
import { Link } from "wouter";

const plans = [
  {
    id: "cloud",
    icon: Cloud,
    name: "Lynx Cloud AI",
    tagline: "Runs entirely in the cloud — nothing to install on your site.",
    price: "$199",
    period: "/mo",
    note: "1 website · Cancel anytime",
    popular: false,
    iconColor: "text-blue-400",
    iconBg: "bg-blue-500/10",
    features: [
      "100% cloud-hosted AI",
      "Learns your website automatically",
      "Automatic weekly re-scan",
      "New content visible after next scan",
      "24/7 support",
      "API connection",
    ],
    cta: "Get started with Cloud",
  },
  {
    id: "embedded",
    icon: Code2,
    name: "Lynx Embedded AI",
    tagline: "Installed directly on your site — learns every corner of it.",
    price: "$399",
    period: "/mo",
    note: "1 website · Cancel anytime",
    popular: true,
    iconColor: "text-violet-400",
    iconBg: "bg-violet-500/10",
    features: [
      "Everything in Lynx Cloud AI",
      "Installs directly via single installation API",
      "Learns from every page on your site",
      "On-demand sync from your dashboard",
      "Automatic re-scan every 24 hours",
      "Spontaneous proactive support",
    ],
    cta: "Get started with Embedded",
  },
  {
    id: "whitelabel",
    icon: Building2,
    name: "Lynx White-Label",
    tagline: "Your brand, your AI. Built for agencies and resellers.",
    price: "$499",
    period: "/mo",
    note: "Up to 15 websites · Cancel anytime",
    popular: false,
    iconColor: "text-yellow-400",
    iconBg: "bg-yellow-500/10",
    features: [
      "Everything in Lynx Embedded AI",
      "Full white-label — your name, your look",
      "Dashboard to manage up to 15 client websites",
      "24h re-scan + proactive support per site",
      "Priority support & dedicated account manager",
      "Full API access for all 15 integrations",
    ],
    cta: "Get started with White-Label",
  },
];

export default function Pricing() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="pricing" className="py-24 section-bg-alt" ref={ref}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center mb-16"
        >
          <p className="text-sm font-medium text-primary uppercase tracking-widest mb-4">
            Pricing
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
            Three ways to use Lynx
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            All plans include the same AI engine. The difference is where it lives and how it's branded.
          </p>
        </motion.div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.15, duration: 0.6, ease: "easeOut" }}
              className={`relative rounded-2xl p-6 flex flex-col transition-all duration-300 ${
                plan.popular
                  ? "border-2 border-primary/50 bg-primary/5 shadow-2xl shadow-primary/10"
                  : "glass-card hover:border-primary/20"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="lynx-gradient text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                    <Zap className="w-3 h-3" />
                    MOST POPULAR
                  </div>
                </div>
              )}

              <div className={`w-11 h-11 rounded-xl ${plan.iconBg} flex items-center justify-center mb-5`}>
                <plan.icon className={`w-5 h-5 ${plan.iconColor}`} />
              </div>

              <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
              <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{plan.tagline}</p>

              <div className="mb-1">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground text-sm">{plan.period}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-6">{plan.note}</p>

              <div className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-2.5">
                    <CheckCircle
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        plan.popular ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>

              <Link href="/register" className="block w-full">
                <Button
                  className={`w-full font-semibold ${
                    plan.popular
                      ? "lynx-gradient text-white border-0 shadow-lg hover:opacity-90"
                      : "bg-secondary hover:bg-secondary/80 text-foreground"
                  }`}
                >
                  {plan.cta}
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="text-center text-sm text-muted-foreground mt-10"
        >
          All plans include a 14-day trial. No credit card required to get started.
        </motion.p>
      </div>
    </section>
  );
}
