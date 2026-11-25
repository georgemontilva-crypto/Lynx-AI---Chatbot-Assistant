import { Link } from "wouter";
import type { CSSProperties } from "react";
import { Reveal, useSpotlight } from "./fx";

/**
 * For agencies and freelancers reselling the assistant. The panel mirrors the
 * real "My Clients" list: each client site has its own key, its own monthly
 * allowance and its own usage bar.
 */
const clients = [
  { name: "Acme Supplements", site: "acmesupplements.com", used: 1840 },
  { name: "Blue Ridge Outdoors", site: "blueridgeoutdoors.com", used: 4920 },
  { name: "Casa Verde Home", site: "casaverdehome.com", used: 612 },
];
const LIMIT = 6000;

const points = [
  {
    title: "Your name on it, not ours",
    body: "Your logo, colours and assistant name on every client's widget. The “Powered by” line says whatever you want, or nothing at all.",
  },
  {
    title: "Fifteen client sites on one account",
    body: "Each one gets its own key, its own knowledge of its own site, and 6,000 messages a month that nobody else can use up.",
  },
  {
    title: "Tuned per client",
    body: "Give each client's assistant its own tone, instructions and branding, and send them a PDF report of what it did for them.",
  },
  {
    title: "You set the price",
    body: "What you charge your clients is your business. Lynx stays in the background as the engine.",
  },
];

export default function WhiteLabel() {
  const spot = useSpotlight();
  return (
    <section id="whitelabel" className="py-20 sm:py-28 border-t border-border scroll-mt-16">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <Reveal className="max-w-[46rem]">
          <h2 className="lx-heading text-[clamp(1.875rem,3.6vw,2.75rem)]">
            Run an agency? Sell it as your own product.
          </h2>
          <p className="lx-prose mt-5 text-lg leading-relaxed text-muted-foreground">
            The White-Label plan is for people who build or manage sites for others and want to
            offer an assistant without building one.
          </p>
        </Reveal>

        <div className="mt-12 sm:mt-16 grid lg:grid-cols-[1fr_1.05fr] gap-x-16 gap-y-12 items-start">
          <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-9">
            {points.map((p, i) => (
              <Reveal order={i} key={p.title}>
                <dt className="font-semibold text-base">{p.title}</dt>
                <dd className="lx-prose mt-1.5 text-[0.9375rem] leading-relaxed text-muted-foreground">{p.body}</dd>
              </Reveal>
            ))}
          </dl>

          <Reveal order={1}>
          <div {...spot} className="lx-spot rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 h-12 flex items-center justify-between border-b border-border">
              <span className="text-sm font-semibold">Client websites</span>
              <span className="text-xs text-muted-foreground">3 of 15 used</span>
            </div>
            <ul>
              {clients.map((c, i) => {
                const pct = Math.round((c.used / LIMIT) * 100);
                return (
                  <li key={c.name} className={`px-5 py-4 ${i > 0 ? "border-t border-border" : ""}`}>
                    <div className="flex items-baseline justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{c.name}</div>
                        <div className="font-mono text-xs text-muted-foreground truncate">{c.site}</div>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                        {c.used.toLocaleString("en-US")} / {LIMIT.toLocaleString("en-US")}
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden" role="img" aria-label={`${pct}% of monthly messages used`}>
                      {/* The bar grows to its value when the panel scrolls into view. */}
                      <div style={{ width: `${pct}%` }} className="h-full">
                        <div
                          className={`lx-fill h-full rounded-full ${pct >= 80 ? "bg-amber-400" : "bg-primary"}`}
                          style={{ "--d": i + 2 } as CSSProperties}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          </Reveal>
        </div>

        <div className="mt-12">
          <Link href="/pricing" className="lx-btn-quiet">
            See the White-Label plan
          </Link>
        </div>
      </div>
    </section>
  );
}
