import { Link } from "wouter";
import { Check } from "lucide-react";
import { Reveal, useSpotlight } from "./fx";

/**
 * One ruled panel with three columns, so the plans read as a comparison
 * (same rows, side by side) rather than three unrelated cards. Every line
 * here is something the plan actually does today.
 */
const plans = [
  {
    id: "cloud",
    name: "Cloud",
    who: "One site that needs its questions answered.",
    price: "$199",
    features: [
      "500 messages a month",
      "1 website",
      "Re-reads your site every week",
      "Product cards with photo, price and link",
      "Leads captured in conversation",
      "Your own tone and instructions",
    ],
  },
  {
    id: "embedded",
    name: "Embedded",
    who: "A busier site, and you want to see everything.",
    price: "$399",
    features: [
      "2,000 messages a month",
      "1 website",
      "Re-reads your site every day",
      "Full conversation history and ratings",
      "Knowledge base for facts not on your site",
      "Alerts, weekly summary and SEO report",
    ],
  },
  {
    id: "whitelabel",
    name: "White-Label",
    who: "Agencies offering it to their own clients.",
    price: "$499",
    features: [
      "8,000 messages a month for your own site",
      "15 client sites, 6,000 messages each",
      "Your brand, and your own “Powered by” line",
      "Branding and instructions per client",
      "PDF report for each client",
      "Everything in Embedded",
    ],
  },
];

function PlanColumn({ plan }: { plan: (typeof plans)[number] }) {
  const spot = useSpotlight();
  const featured = plan.id === "embedded";
  return (
    <div
      {...spot}
      className={`lx-spot p-6 sm:p-8 flex flex-col bg-card/40 ${featured ? "lx-beam bg-primary/[0.06]" : ""}`}
    >
      <h3 className="lx-heading text-2xl">{plan.name}</h3>
      <p className="mt-1.5 text-[0.9375rem] text-muted-foreground min-h-[3rem]">{plan.who}</p>
      <div className="mt-5 flex items-baseline gap-1.5">
        <span className="lx-display text-5xl">{plan.price}</span>
        <span className="text-sm text-muted-foreground">a month</span>
      </div>
      <Link href="/register" className={`mt-6 ${featured ? "lx-btn" : "lx-btn-quiet"}`}>
        Start free trial
      </Link>
      <ul className="mt-7 space-y-3">
        {plan.features.map((f) => (
          <li key={f} className="flex gap-2.5 text-[0.9375rem] leading-snug">
            <Check className="w-4 h-4 mt-0.5 shrink-0 text-primary" strokeWidth={2.25} />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The three plans side by side. Used on the home page and the pricing page. */
export function PlanPanel() {
  return (
    <Reveal>
      <div className="rounded-xl border border-border grid grid-cols-1 md:grid-cols-3 md:divide-x divide-y md:divide-y-0 divide-border overflow-hidden">
        {plans.map((p) => (
          <PlanColumn key={p.id} plan={p} />
        ))}
      </div>
    </Reveal>
  );
}

export default function Pricing() {
  return (
    <section id="pricing" className="py-20 sm:py-28 border-t border-border scroll-mt-16">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <Reveal className="max-w-[46rem]">
          <h2 className="lx-heading text-[clamp(1.875rem,3.6vw,2.75rem)]">Try it on your own site first.</h2>
          <p className="lx-prose mt-5 text-lg leading-relaxed text-muted-foreground">
            Every account starts free: 14 days and 50 messages, no card. Pick a plan when you&rsquo;ve
            seen it answer your own visitors. Cancel any month.
          </p>
        </Reveal>

        <div className="mt-12 sm:mt-16">
          <PlanPanel />
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          A message is one visitor question and its answer.{" "}
          <Link href="/pricing" className="lx-link text-foreground">
            Compare the plans in detail
          </Link>
        </p>
      </div>
    </section>
  );
}
