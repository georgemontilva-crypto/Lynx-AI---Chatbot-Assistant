import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Backpack, Flame, Shirt, FileText, CornerDownRight } from "lucide-react";
import type { CSSProperties } from "react";
import { ScanField, useTyped, useSpotlight } from "./fx";

/**
 * The hero makes the product's one promise literal: an answer never comes from
 * nowhere. On the left is an example store as Lynx sees it — its pages. On the
 * right, a visitor asks something. When the answer lands, the page it was read
 * from lights up in amber ("sight"), the only place that colour is used.
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

function useStage() {
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
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    // Let the page settle, then start from the first question.
    timers.current.push(window.setTimeout(() => play(0, true), 2600));
    return clear;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

const HEADLINE_1 = ["Your", "site", "already", "has", "the", "answers."];
const HEADLINE_2 = ["Lynx", "gives", "them", "to", "every", "visitor."];

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

export default function Hero() {
  const { exchange, index, phase, choose } = useStage();
  const lit = phase === "answered" ? exchange.source : null;
  const litProduct = phase === "answered" ? exchange.product ?? null : null;

  // The real assistant runs on this page as the floating bubble. Offer it by
  // name only once we know it actually loaded.
  const [liveChat, setLiveChat] = useState(false);
  useEffect(() => {
    let tries = 0;
    const check = () => {
      if ((window as unknown as { LynxAI?: { open?: () => void } }).LynxAI?.open) {
        setLiveChat(true);
        return;
      }
      if (++tries < 10) timer = window.setTimeout(check, 600);
    };
    let timer = window.setTimeout(check, 400);
    return () => window.clearTimeout(timer);
  }, []);
  const openLiveChat = () => (window as unknown as { LynxAI?: { open?: () => void } }).LynxAI?.open?.();

  return (
    <section className="relative isolate overflow-hidden pt-24 sm:pt-32 pb-16 sm:pb-24">
      {/* Backdrop: drifting light, a faint grid, and the scan field. */}
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <div className="lx-aurora lx-aurora-a w-[42rem] h-[42rem] -top-64 -left-40" />
        <div className="lx-aurora lx-aurora-b w-[36rem] h-[36rem] top-10 right-[-12rem]" />
        <div className="lx-aurora lx-aurora-c w-[28rem] h-[28rem] top-[30rem] left-[35%]" />
        <div className="lx-grid absolute inset-0" />
        <ScanField className="absolute inset-0 w-full h-full [mask-image:linear-gradient(to_bottom,#000_55%,transparent)]" />
      </div>

      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <div>
          <div className="lx-rise inline-flex items-center gap-2.5 rounded-full border border-border bg-background/60 backdrop-blur px-3.5 py-1.5 text-sm text-muted-foreground" style={{ "--i": -4 } as CSSProperties}>
            <span className="lx-live" aria-hidden="true" />
            Reads your whole site. Answers from it.
          </div>

          <h1 className="lx-display mt-6 text-[clamp(2.25rem,5vw,4rem)]">
            <span className="block">
              {HEADLINE_1.map((w, i) => (
                <span key={w + i}>
                  <span className="lx-word" style={{ "--i": i } as CSSProperties}>{w}</span>{" "}
                </span>
              ))}
            </span>
            {/* One gradient across the whole line, so it reads as a single sweep. */}
            <span className="block lx-flow" style={{ "--i": HEADLINE_1.length } as CSSProperties}>
              {HEADLINE_2.join(" ")}
            </span>
          </h1>
          <p className="lx-rise lx-prose mt-6 sm:mt-8 max-w-[38rem] text-lg sm:text-xl leading-relaxed text-muted-foreground" style={{ "--i": 2 } as CSSProperties}>
            Lynx reads your products, prices and policies, then answers each visitor in your
            store&rsquo;s own words, at any hour and in their language. Nothing to script, no
            flows to build.
          </p>
          <div className="lx-rise mt-8 flex flex-wrap items-center gap-3" style={{ "--i": 3 } as CSSProperties}>
            <Link href="/register" className="lx-btn">
              Start free trial
            </Link>
            {liveChat ? (
              <button onClick={openLiveChat} className="lx-btn-quiet bg-background/40 backdrop-blur">
                Ask our assistant a question
              </button>
            ) : (
              <a href="#how-it-works" className="lx-btn-quiet bg-background/40 backdrop-blur">
                See how it works
              </a>
            )}
          </div>
          <p className="lx-rise mt-4 text-sm text-muted-foreground" style={{ "--i": 4 } as CSSProperties}>
            14 days and 50 messages on your own site. No card needed.
          </p>
        </div>

        {/* The stage */}
        <div className="lx-rise mt-12 sm:mt-14" style={{ "--i": 6 } as CSSProperties}>
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
        <p className="mt-4 text-sm text-muted-foreground max-w-[44rem]">
          An example store. The page that lights up is the one the answer was read from. Lynx only
          says what your site says, and only links to pages that exist on it.
        </p>
      </div>
    </section>
  );
}
