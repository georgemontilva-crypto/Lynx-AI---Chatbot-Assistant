import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { BarChart3, Languages, MessageCircle, Search, Shirt, ShoppingBag, UserPlus } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { LynxCore, useTyped } from "./fx";

/**
 * The hero shows what Lynx is: one intelligence that learned the site, doing
 * several jobs on it. The core in the middle sends a signal to one job at a
 * time; that card switches on and the line under the headline names it. The
 * three move together, so it reads as one system rather than six features.
 */

type Capability = {
  id: string;
  label: string;
  /** Completes "So it can …" under the headline. */
  phrase: string;
  icon: typeof MessageCircle;
  /** Position inside the 712 × 600 stage (tablet and up). */
  x: number;
  y: number;
  body: ReactNode;
};

const CARD_H = 136;

const CAPS: Capability[] = [
  {
    id: "answer",
    label: "Answers visitors",
    phrase: "answer every visitor.",
    icon: MessageCircle,
    x: 32, y: 24,
    body: (
      <div className="flex flex-col gap-1.5">
        <span className="lx-step self-end rounded-xl rounded-br-sm bg-action text-white px-2.5 py-1" style={{ "--s": 0 } as CSSProperties}>
          Do you ship to Canada?
        </span>
        <span className="lx-step self-start rounded-xl rounded-bl-sm bg-muted px-2.5 py-1" style={{ "--s": 1 } as CSSProperties}>
          Yes, in 2 business days.
        </span>
      </div>
    ),
  },
  {
    id: "recommend",
    label: "Recommends products",
    phrase: "recommend your products.",
    icon: ShoppingBag,
    x: 0, y: 232,
    body: (
      <div className="lx-step flex items-center gap-2.5 rounded-lg border border-border bg-background/50 p-2" style={{ "--s": 0 } as CSSProperties}>
        <span className="w-9 h-9 rounded-md bg-muted hidden md:flex items-center justify-center shrink-0">
          <Shirt className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
        </span>
        <span className="min-w-0">
          <span className="block font-semibold text-foreground truncate">Ridge Shell Jacket</span>
          <span className="block text-muted-foreground">$149 · View product</span>
        </span>
      </div>
    ),
  },
  {
    id: "lead",
    label: "Captures leads",
    phrase: "capture your leads.",
    icon: UserPlus,
    x: 32, y: 440,
    body: (
      <div className="lx-step flex items-center gap-2.5 rounded-lg border border-border bg-background/50 p-2" style={{ "--s": 0 } as CSSProperties}>
        <span className="relative w-9 h-9 rounded-full bg-primary/15 text-primary hidden md:flex items-center justify-center shrink-0 font-semibold">
          M
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-card" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block font-semibold text-foreground truncate">Maria G. <span className="font-normal text-emerald-500">· new</span></span>
          <span className="block text-muted-foreground truncate">maria@example.com</span>
        </span>
      </div>
    ),
  },
  {
    id: "language",
    label: "Speaks their language",
    phrase: "reply in their language.",
    icon: Languages,
    x: 468, y: 24,
    body: (
      <div className="flex flex-col gap-1.5" lang="es">
        <span className="lx-step self-end rounded-xl rounded-br-sm bg-action text-white px-2.5 py-1" style={{ "--s": 0 } as CSSProperties}>
          ¿Envían a Canadá?
        </span>
        <span className="lx-step self-start rounded-xl rounded-bl-sm bg-muted px-2.5 py-1" style={{ "--s": 1 } as CSSProperties}>
          Sí, en 2 días hábiles.
        </span>
      </div>
    ),
  },
  {
    id: "seo",
    label: "Checks your SEO",
    phrase: "check your SEO.",
    icon: Search,
    x: 500, y: 232,
    body: (
      <div className="flex items-center gap-3">
        <span className="relative w-11 h-11 shrink-0">
          <svg viewBox="0 0 44 44" className="w-11 h-11 -rotate-90" aria-hidden="true">
            <circle cx="22" cy="22" r="18" fill="none" strokeWidth="4" className="stroke-border" />
            <circle cx="22" cy="22" r="18" fill="none" strokeWidth="4" strokeLinecap="round" pathLength={100} className="lx-ring stroke-sight" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[0.8125rem] font-bold text-foreground">86</span>
        </span>
        <span className="min-w-0">
          <span className="lx-step block font-semibold text-foreground" style={{ "--s": 0 } as CSSProperties}>2 things to fix</span>
          <span className="lx-step block text-muted-foreground" style={{ "--s": 1 } as CSSProperties}>No meta description</span>
        </span>
      </div>
    ),
  },
  {
    id: "report",
    label: "Reports back",
    phrase: "report back every week.",
    icon: BarChart3,
    x: 468, y: 440,
    body: (
      <div className="flex items-end gap-3">
        <span className="flex items-end gap-1 h-11" aria-hidden="true">
          {[38, 55, 46, 72, 60, 88, 100].map((v, i) => (
            <span key={i} className="lx-bar w-2 rounded-sm bg-primary/70 last:bg-sight" style={{ height: `${v}%`, "--s": i } as CSSProperties} />
          ))}
        </span>
        <span className="min-w-0 pb-0.5">
          <span className="block font-semibold text-foreground">This week</span>
          <span className="block text-muted-foreground">Every Monday</span>
        </span>
      </div>
    ),
  },
];

// Left and right take turns, so the eye is drawn across the core each time.
const ORDER = [0, 3, 1, 4, 2, 5];
const STAGE = { w: 712, h: 600 };
const CARD_W = 212;
const CENTER = { x: STAGE.w / 2, y: STAGE.h / 2 };
const CORE_R = 146; // where the wires leave the sphere

/** The point on a card's inner edge that its wire reaches. */
function anchor(c: Capability) {
  return { x: c.x + (c.x < CENTER.x ? CARD_W : 0), y: c.y + CARD_H / 2 };
}

/** A straight wire from the sphere's edge to the card. */
function wire(c: Capability): string {
  const a = anchor(c);
  const dx = a.x - CENTER.x, dy = a.y - CENTER.y;
  const len = Math.hypot(dx, dy);
  const sx = CENTER.x + (dx / len) * CORE_R, sy = CENTER.y + (dy / len) * CORE_R;
  return `M${sx.toFixed(1)} ${sy.toFixed(1)} L${a.x} ${a.y}`;
}
const WIRES = CAPS.map(wire);

function useCycle() {
  const [active, setActive] = useState(0);
  const [tick, setTick] = useState(0);
  const paused = useRef(false);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let step = 0;
    const id = window.setInterval(() => {
      if (paused.current || document.hidden) return;
      step = (step + 1) % ORDER.length;
      setActive(ORDER[step]);
      setTick((n) => n + 1);
    }, 3400);
    return () => window.clearInterval(id);
  }, []);

  const hold = (i: number) => {
    paused.current = true;
    setActive((cur) => {
      if (cur !== i) setTick((n) => n + 1);
      return i;
    });
  };
  const release = () => { paused.current = false; };
  return { active, tick, hold, release };
}

/**
 * The stage is drawn at a fixed 712 × 600 and scaled to the room it has, so
 * the cards, wires and core keep their exact relationship at every width.
 * Below 768px the stage is not used at all (the cards become a grid).
 */
function useStageFit() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      if (window.innerWidth < 768) { el.style.removeProperty("--k"); return; }
      const byWidth = el.clientWidth / STAGE.w;
      // Beside the headline, keep the whole stage on the first screen.
      const byHeight = window.innerWidth >= 1280 ? (window.innerHeight - 170) / STAGE.h : 1;
      el.style.setProperty("--k", Math.max(0.7, Math.min(1, byWidth, byHeight)).toFixed(4));
    };
    fit();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : null;
    ro?.observe(el);
    window.addEventListener("resize", fit);
    return () => { ro?.disconnect(); window.removeEventListener("resize", fit); };
  }, []);
  return ref;
}

/**
 * The typed phrase lives in its own component: it updates on every keystroke,
 * and kept inside Hero that meant re-rendering the whole stage (six cards, the
 * wires, the canvas wrapper) about forty times a second while it typed.
 */
function TypedPhrase({ text }: { text: string }) {
  const typed = useTyped(text, 24);
  return <span className="lx-caret text-foreground">{typed}</span>;
}

export default function Hero() {
  const fitRef = useStageFit();
  const { active, tick, hold, release } = useCycle();
  const cap = CAPS[active];

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

  const signal: [number, number] = [anchor(cap).x - CENTER.x, anchor(cap).y - CENTER.y];

  return (
    <section className="lx-hero relative isolate overflow-hidden pt-24 sm:pt-32 pb-14 sm:pb-20">
      {/* Backdrop: drifting light and a faint grid. */}
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <div className="lx-aurora lx-aurora-a w-[42rem] h-[42rem] -top-64 -left-40" />
        <div className="lx-aurora lx-aurora-b w-[34rem] h-[34rem] top-24 right-[4%]" />
        <div className="lx-aurora lx-aurora-c w-[30rem] h-[30rem] top-[22rem] right-[26%]" />
        <div className="lx-grid absolute inset-0" />
      </div>

      <div className="mx-auto max-w-[1300px] px-5 sm:px-8">
        <div className="grid grid-cols-[minmax(0,1fr)] xl:grid-cols-[minmax(30rem,1fr)_minmax(0,712px)] gap-x-4 gap-y-6 md:gap-y-10 items-center">
          {/* Stacked on tablets, the copy is centred over the stage. */}
          <div className="md:max-xl:text-center">
            <div className="lx-rise inline-flex items-center gap-2.5 rounded-full border border-border bg-background/60 backdrop-blur px-3.5 py-1.5 text-sm text-muted-foreground" style={{ "--i": -4 } as CSSProperties}>
              <span className="lx-live" aria-hidden="true" />
              One AI, trained on your own site
            </div>

            <h1 className="lx-display mt-6 text-[clamp(1.875rem,9.4vw,4rem)] xl:text-[3.25rem] 2xl:text-[3.5rem]">
              <span className="block">
                {["An", "AI", "that", "truly"].map((w, i) => (
                  <span key={w}>
                    <span className="lx-word" style={{ "--i": i } as CSSProperties}>{w}</span>{" "}
                  </span>
                ))}
              </span>
              {/* One gradient across the whole line, so it reads as a single sweep. */}
              <span className="block lx-flow" style={{ "--i": 4 } as CSSProperties}>
                knows your website
              </span>
            </h1>

            {/* Names the job the core is doing right now. */}
            {/* On phones the phrase sits on its own line, so the hero keeps one
                height while it types instead of jumping between one line and two. */}
            <p className="lx-rise mt-4 sm:mt-5 font-[family-name:var(--font-display)] font-bold tracking-tight text-lg sm:text-2xl" style={{ "--i": 1 } as CSSProperties}>
              <span className="text-muted-foreground">So it can </span>
              <span className="block sm:inline min-h-[1.6em] sm:min-h-0"><TypedPhrase text={cap.phrase} /></span>
            </p>

            <p className="lx-rise lx-prose mt-5 max-w-[34rem] md:max-xl:mx-auto text-base sm:text-lg leading-relaxed text-muted-foreground" style={{ "--i": 2 } as CSSProperties}>
              Lynx reads every page of your site, then puts what it learned to work around the
              clock: answering visitors, recommending products, collecting leads and checking your
              SEO. One line of code to install, nothing to script.
            </p>
            <div className="lx-rise mt-8 flex flex-wrap items-center md:max-xl:justify-center gap-3" style={{ "--i": 3 } as CSSProperties}>
              <Link href="/register" className="lx-btn">
                Start free trial
              </Link>
              {liveChat ? (
                <button onClick={openLiveChat} className="lx-btn-quiet bg-background/40 backdrop-blur">
                  Ask our assistant a question
                </button>
              ) : (
                <a href="#demo" className="lx-btn-quiet bg-background/40 backdrop-blur">
                  Watch it answer
                </a>
              )}
            </div>
            <p className="lx-rise mt-4 text-sm text-muted-foreground" style={{ "--i": 4 } as CSSProperties}>
              14 days and 50 messages on your own site. No card needed.
            </p>
          </div>

          {/* The stage: the core, and the jobs it runs. */}
          <div ref={fitRef} className="lx-orbit-fit lx-rise" style={{ "--i": 3 } as CSSProperties}>
          <div className="lx-orbit">
            <div className="lx-orbit-core">
              <LynxCore signal={signal} signalKey={tick} className="w-full h-full" />
            </div>

            <svg className="lx-orbit-lines" viewBox={`0 0 ${STAGE.w} ${STAGE.h}`} fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="lx-line" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="var(--primary)" />
                  <stop offset="1" stopColor="var(--sight)" />
                </linearGradient>
              </defs>
              {CAPS.map((c, i) => (
                <g key={c.id}>
                  <path d={WIRES[i]} className="lx-wire" data-active={i === active} />
                  <circle cx={anchor(c).x} cy={anchor(c).y} r="3" className="lx-node" data-active={i === active} />
                  {i === active && <path key={tick} d={WIRES[i]} pathLength={100} className="lx-signal" />}
                </g>
              ))}
            </svg>

            <ul className="lx-orbit-cards">
              {CAPS.map((c, i) => {
                const on = i === active;
                return (
                  <li
                    key={c.id}
                    className="lx-cap-float"
                    style={{ "--x": `${c.x}px`, "--y": `${c.y}px`, "--f": i } as CSSProperties}
                    onPointerEnter={() => hold(i)}
                    onPointerLeave={release}
                  >
                    <div className="lx-cap" data-active={on}>
                      <div className="flex items-center gap-2">
                        <span className="lx-cap-icon">
                          <c.icon className="w-3.5 h-3.5" strokeWidth={2} />
                        </span>
                        <span className="text-[0.8125rem] font-semibold leading-tight">{c.label}</span>
                      </div>
                      {/* Re-keyed when it switches on, so its contents play in. */}
                      <div key={on ? `on-${tick}` : "off"} className={`mt-3 text-xs leading-snug ${on ? "lx-cap-play" : ""}`}>
                        {c.body}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="lx-orbit-note">Shown with an example store.</p>
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}
