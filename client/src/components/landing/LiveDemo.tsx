import { useEffect, useRef, useState } from "react";
import { Backpack, Flame, Shirt, FileText, CornerDownRight } from "lucide-react";
import { Reveal, useInView, useTyped, useSpotlight } from "./fx";

/**
 * The live demo makes one promise literal: an answer never comes from nowhere.
 * On the left is an example store as Lynx sees it — its pages. On the right, a
 * visitor asks something. When the answer lands, the page it was read from
 * lights up.
 */

type SourceId = "products" | "shipping" | "returns";

type Exchange = {
  id: string;
  question: string;
  answer: string;
  source: SourceId;
  /** Product tile to light up and show as a card, if the answer recommends one. */
  product?: "pack" | "jacket" | "stove";
};

const PRODUCTS = {
  pack: { name: "Trail Pack 28L", price: "$89", icon: Backpack },
  jacket: { name: "Ridge Shell Jacket", price: "$149", icon: Shirt },
  stove: { name: "Summit Stove", price: "$64", icon: Flame },
} as const;

const SOURCE_PATH: Record<SourceId, string> = {
  products: "/products",
  shipping: "/shipping",
  returns: "/returns",
};

const EXCHANGES: Exchange[] = [
  {
    id: "ship",
    question: "Do you ship to Canada?",
    answer: "Yes. Orders leave within 2 business days, to Canada and the US, and shipping is free over $100.",
    source: "shipping",
  },
  {
    id: "jacket",
    question: "I need a jacket for wind and rain",
    answer: "The Ridge Shell is the one: fully waterproof, taped seams, and it packs into its own pocket.",
    source: "products",
    product: "jacket",
  },
  {
    id: "return",
    question: "Can I return it if it doesn't fit?",
    answer: "You can, within 30 days as long as it's unworn. We email you a prepaid label.",
    source: "returns",
  },
];

type Phase = "asking" | "thinking" | "answered";

function useStage(start: boolean) {
  // Server render and reduced-motion both show a finished exchange, so the
  // page is complete without any script running.
  const [index, setIndex] = useState(1);
  const [phase, setPhase] = useState<Phase>("answered");
  const auto = useRef(true);
  const timers = useRef<number[]>([]);

  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const play = (i: number, thenContinue: boolean) => {
    clear();
    setIndex(i);
    setPhase("asking");
    timers.current.push(window.setTimeout(() => setPhase("thinking"), 650));
    timers.current.push(window.setTimeout(() => setPhase("answered"), 1750));
    if (thenContinue) {
      timers.current.push(
        window.setTimeout(() => {
          if (auto.current) play((i + 1) % EXCHANGES.length, true);
        }, 7200)
      );
    }
  };

  useEffect(() => {
    if (!start) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    // Start from the first question once the demo scrolls into view.
    timers.current.push(window.setTimeout(() => play(0, true), 700));
    return clear;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start]);

  const choose = (i: number) => {
    auto.current = false; // the visitor took over — stop cycling
    play(i, false);
  };

  return { exchange: EXCHANGES[index], index, phase, choose };
}

function SitePanel({
  lit,
  litProduct,
  scanning,
  scanKey,
}: {
  lit: SourceId | null;
  litProduct: Exchange["product"] | null;
  scanning: boolean;
  scanKey: string;
}) {
  const spot = useSpotlight();
  return (
    <div
      // Re-keyed per question so the beam animation restarts each time.
      key={scanning ? scanKey : "idle"}
      {...spot}
      className={`lx-spot rounded-xl border border-border bg-card/70 backdrop-blur-sm overflow-hidden ${scanning ? "lx-scanning" : ""}`}
    >
      <div className="flex items-center gap-3 px-4 h-11 border-b border-border">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="w-2.5 h-2.5 rounded-full bg-border" />
          <span className="w-2.5 h-2.5 rounded-full bg-border" />
          <span className="w-2.5 h-2.5 rounded-full bg-border" />
        </span>
        <span className="font-mono text-xs text-muted-foreground truncate">northwind-outfitters.com</span>
        <span className="ml-auto text-xs text-muted-foreground hidden sm:block">Example store</span>
      </div>

      <div className="p-4 sm:p-5 space-y-3">
        {/* /products */}
        <div className="lx-read rounded-lg border border-border p-3.5" data-lit={lit === "products"}>
          <PageLabel path="/products" lit={lit === "products"} />
          <div className="mt-3 grid grid-cols-3 gap-2.5">
            {(Object.keys(PRODUCTS) as Array<keyof typeof PRODUCTS>).map((key) => {
              const p = PRODUCTS[key];
              const on = lit === "products" && litProduct === key;
              return (
                <div
                  key={key}
                  className="lx-read rounded-md border border-border/70 p-2.5"
                  data-lit={on}
                >
                  <div className="aspect-[4/3] rounded bg-muted flex items-center justify-center">
                    <p.icon className={`w-6 h-6 ${on ? "text-sight" : "text-muted-foreground"}`} strokeWidth={1.5} />
                  </div>
                  <div className="mt-2 text-xs font-medium leading-tight">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.price}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="lx-read rounded-lg border border-border p-3.5" data-lit={lit === "shipping"}>
            <PageLabel path="/shipping" lit={lit === "shipping"} />
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Orders ship within 2 business days. We deliver to Canada and the US. Free shipping over $100.
            </p>
          </div>
          <div className="lx-read rounded-lg border border-border p-3.5" data-lit={lit === "returns"}>
            <PageLabel path="/returns" lit={lit === "returns"} />
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Return unworn items within 30 days. We send a prepaid label by email.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PageLabel({ path, lit }: { path: string; lit: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <FileText className={`w-3.5 h-3.5 ${lit ? "text-sight" : "text-muted-foreground"}`} strokeWidth={1.75} />
      <span className={`font-mono text-xs ${lit ? "text-sight" : "text-muted-foreground"}`}>{path}</span>
      {lit && <span className="lx-in ml-auto text-[0.6875rem] font-medium text-sight">Read for this answer</span>}
    </div>
  );
}

function ChatPanel({
  exchange,
  index,
  phase,
  choose,
}: {
  exchange: Exchange;
  index: number;
  phase: Phase;
  choose: (i: number) => void;
}) {
  const product = exchange.product ? PRODUCTS[exchange.product] : null;
  return (
    <div className="lx-beam rounded-xl">
    <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col shadow-[0_30px_80px_-30px_oklch(0.55_0.21_258/0.55)]">
      <div className="flex items-center gap-3 px-4 h-11 border-b border-border">
        <span className="w-2 h-2 rounded-full bg-emerald-400" aria-hidden="true" />
        <span className="text-sm font-semibold">Northwind assistant</span>
        <span className="ml-auto text-xs text-muted-foreground">Answers from the site</span>
      </div>

      {/* Fixed height: the exchange changes, the layout never jumps. */}
      <div className="p-4 sm:p-5 flex flex-col gap-3 h-[17.5rem]" aria-live="polite">
        <div key={exchange.id + "-q"} className="lx-in self-end max-w-[85%] rounded-2xl rounded-br-md bg-action text-white px-3.5 py-2.5 text-sm">
          {exchange.question}
        </div>

        {phase === "thinking" && (
          <div className="lx-in self-start rounded-2xl rounded-bl-md bg-muted px-4 py-3.5">
            <span className="lx-typing flex gap-1" aria-label="Typing">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
            </span>
          </div>
        )}

        {phase === "answered" && (
          <div key={exchange.id + "-a"} className="lx-in self-start max-w-[92%] space-y-2.5">
            <div className="rounded-2xl rounded-bl-md bg-muted px-3.5 py-2.5 text-sm leading-relaxed">
              {exchange.answer}
            </div>
            {product && (
              <div className="flex items-center gap-3 rounded-xl border border-border bg-background/60 p-2.5">
                <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center shrink-0">
                  <product.icon className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{product.name}</div>
                  <div className="text-xs text-muted-foreground">{product.price}</div>
                </div>
                <span className="ml-auto text-xs font-semibold text-primary whitespace-nowrap">View product</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs text-sight">
              <CornerDownRight className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>
                From <span className="font-mono">{SOURCE_PATH[exchange.source]}</span>
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border p-3 flex flex-wrap gap-2">
        {EXCHANGES.map((ex, i) => (
          <button
            key={ex.id}
            onClick={() => choose(i)}
            aria-pressed={i === index}
            className={`rounded-full border px-3 py-1.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
              i === index
                ? "border-foreground/40 text-foreground"
                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
            }`}
          >
            {ex.question}
          </button>
        ))}
      </div>
    </div>
    </div>
  );
}

function StatusLine({ exchange, phase }: { exchange: Exchange; phase: Phase }) {
  const text =
    phase === "asking"
      ? "visitor asked a question"
      : phase === "thinking"
        ? "searching 18 pages on northwind-outfitters.com"
        : `answered from ${SOURCE_PATH[exchange.source]}`;
  const typed = useTyped(text, 14);
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-background/60 backdrop-blur px-3.5 h-10 font-mono text-xs overflow-hidden">
      <span className="lx-live shrink-0" aria-hidden="true" />
      <span className="text-muted-foreground shrink-0">lynx</span>
      <span className={`lx-caret truncate ${phase === "answered" ? "text-sight" : "text-foreground"}`}>{typed}</span>
      <span className="ml-auto hidden sm:flex items-center gap-4 text-muted-foreground shrink-0">
        <span>18 pages</span>
        <span>12 products</span>
        <span>2 policies</span>
      </span>
    </div>
  );
}

export default function LiveDemo() {
  const { ref, shown } = useInView<HTMLDivElement>("0px 0px -25% 0px");
  const { exchange, index, phase, choose } = useStage(shown);
  const lit = phase === "answered" ? exchange.source : null;
  const litProduct = phase === "answered" ? exchange.product ?? null : null;

  return (
    <section id="demo" className="py-20 sm:py-28 border-t border-border scroll-mt-16">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <Reveal>
          <h2 className="lx-heading text-[clamp(1.875rem,3.6vw,2.75rem)] max-w-[20ch]">
            Every answer comes from a page on your site.
          </h2>
          <p className="lx-prose mt-5 max-w-[40rem] text-lg leading-relaxed text-muted-foreground">
            This is an example store. Pick a question and watch which page lights up: that is where
            the answer was read from. Lynx only says what your site says, and only links to pages
            that exist on it.
          </p>
        </Reveal>

        <Reveal order={1} className="mt-10 sm:mt-12">
          <div ref={ref}>
            <StatusLine exchange={exchange} phase={phase} />
            {/* On a phone the conversation comes first, so the answer and the page
                it came from are both in view without scrolling between them. */}
            <div className="relative mt-3 grid lg:grid-cols-[1.15fr_1fr] gap-4 lg:gap-8 items-start">
              <div className="order-2 lg:order-1">
                <SitePanel lit={lit} litProduct={litProduct} scanning={phase === "thinking"} scanKey={exchange.id} />
              </div>
              <div className="order-1 lg:order-2">
                <ChatPanel exchange={exchange} index={index} phase={phase} choose={choose} />
              </div>
              {/* Packets crossing from the page to the answer while it is read. */}
              {phase === "thinking" && (
                <div
                  className="hidden lg:flex absolute top-28 left-[53.5%] -translate-x-1/2 w-8 items-center justify-center gap-1 overflow-hidden"
                  aria-hidden="true"
                >
                  <span className="lx-packet w-1.5 h-1.5 rounded-full bg-sight" />
                  <span className="lx-packet w-1.5 h-1.5 rounded-full bg-sight" />
                  <span className="lx-packet w-1.5 h-1.5 rounded-full bg-sight" />
                </div>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
