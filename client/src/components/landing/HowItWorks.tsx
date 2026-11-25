/**
 * Three steps, shown with the real artifact of each one (the address field,
 * the actual snippet, an answer) instead of icons. The numbers are there
 * because this genuinely is a sequence.
 */
import type { CSSProperties } from "react";
import { Reveal, useInView, useCountUp, useSpotlight } from "./fx";

const steps = [
  {
    title: "Give Lynx your address",
    body: "It reads the whole site the way a careful new employee would: every product, every policy page, the FAQ. It takes about a minute.",
  },
  {
    title: "Paste one line into your site",
    body: "The same line works on Shopify, WordPress, Webflow or a site you built yourself. It loads after your page, so it never slows it down.",
  },
  {
    title: "It starts answering",
    body: "From then on it re-reads your site on its own, so a new product or a changed price is picked up without you touching anything.",
  },
];

function ScanResult() {
  const { ref, shown } = useInView<HTMLDivElement>();
  const pages = useCountUp(18, shown);
  const products = useCountUp(12, shown);
  return (
    <div ref={ref} className="space-y-2.5">
      <div className="flex items-center h-10 rounded-md border border-border bg-background px-3 font-mono text-xs text-foreground">
        https://yourstore.com
      </div>
      {/* The bar is the scan finishing; the counts are what it found. */}
      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <div data-shown={shown} className="lx-fill h-full rounded-full bg-sight" />
      </div>
      <div className="font-mono text-xs text-sight tabular-nums">
        {pages} pages read, {products} products learned
      </div>
    </div>
  );
}

function Artifact({ step }: { step: number }) {
  if (step === 0) return <ScanResult />;
  if (step === 1) {
    return (
      <pre className="rounded-md border border-border bg-background p-3 font-mono text-[0.6875rem] leading-relaxed overflow-x-auto">
        <code>
          <span className="text-muted-foreground">{"<script "}</span>
          <span className="text-primary">src</span>
          <span className="text-muted-foreground">{'="https://www.lynxaiassistant.com/api/widget.js"\n        '}</span>
          <span className="text-primary">data-api-key</span>
          <span className="text-muted-foreground">{'="'}</span>
          <span className="text-sight">lx_…</span>
          <span className="text-muted-foreground">{'" defer></script>'}</span>
        </code>
      </pre>
    );
  }
  return (
    <div className="space-y-2">
      <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-action text-white px-3 py-2 text-xs">
        Is the 28L pack carry-on size?
      </div>
      <div className="w-fit max-w-[90%] rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-xs leading-relaxed">
        It is. At 50 × 30 × 20 cm it fits most airline cabin limits.
      </div>
    </div>
  );
}

function Step({ index, title, body }: { index: number; title: string; body: string }) {
  const spot = useSpotlight();
  return (
    <Reveal as="li" order={index} className="h-full">
      <div {...spot} className="lx-spot h-full flex flex-col rounded-xl border border-border bg-card/60 p-6 transition-colors hover:border-primary/50">
        <div className="flex items-baseline gap-4">
          <span
            className="lx-display text-6xl bg-gradient-to-b from-primary to-primary/10 bg-clip-text text-transparent"
            aria-hidden="true"
          >
            {index + 1}
          </span>
          <h3 className="lx-heading text-xl">{title}</h3>
        </div>
        <p className="lx-prose mt-3 text-[0.9375rem] leading-relaxed text-muted-foreground">{body}</p>
        <div className="mt-auto pt-5">
          <Artifact step={index} />
        </div>
      </div>
    </Reveal>
  );
}

export default function HowItWorks() {
  const line = useInView<HTMLDivElement>();
  return (
    <section id="how-it-works" className="relative py-20 sm:py-28 border-t border-border scroll-mt-16">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <Reveal>
          <h2 className="lx-heading text-[clamp(1.875rem,3.6vw,2.75rem)] max-w-[22ch]">
            Three steps, and one of them is copy and paste.
          </h2>
        </Reveal>

        {/* A line that draws itself across the three steps as they arrive. */}
        <div ref={line.ref} className="mt-12 sm:mt-16 hidden md:block h-px bg-border relative" aria-hidden="true">
          <div
            data-shown={line.shown}
            className="lx-fill absolute inset-0 bg-gradient-to-r from-primary via-sight to-primary"
            style={{ "--d": 1, transitionDuration: "1.8s" } as CSSProperties}
          />
        </div>

        <ol className="mt-12 md:mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
          {steps.map((s, i) => (
            <Step key={s.title} index={i} title={s.title} body={s.body} />
          ))}
        </ol>
      </div>
    </section>
  );
}
