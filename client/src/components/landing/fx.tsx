import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type PointerEvent } from "react";

/**
 * Motion helpers for the public site. All of them are safe on the server (no
 * window access during render) and stand down under prefers-reduced-motion.
 */

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** True once the element has scrolled into view (and stays true). */
export function useInView<T extends Element>(margin = "0px 0px -12% 0px") {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    // Tell the pre-paint script the app is alive (see index.html).
    (window as unknown as { __lxReady?: boolean }).__lxReady = true;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setShown(true); return; }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) { setShown(true); io.disconnect(); }
      },
      { rootMargin: margin, threshold: 0.05 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);
  return { ref, shown };
}

/** Content that rises into place when it enters the viewport. `order` staggers siblings. */
export function Reveal({
  children,
  order = 0,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  order?: number;
  className?: string;
  as?: "div" | "li" | "section";
}) {
  const { ref, shown } = useInView<HTMLElement>();
  const Comp = Tag as "div";
  return (
    <Comp
      ref={ref as never}
      data-shown={shown}
      className={`lx-reveal ${className}`}
      style={{ "--d": order } as CSSProperties}
    >
      {children}
    </Comp>
  );
}

/** Pointer-following glow: spread the returned props on an element with class "lx-spot". */
export function useSpotlight() {
  return {
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
      e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
    },
  };
}

/** Types text out character by character whenever `text` changes. */
export function useTyped(text: string, speed = 18): string {
  const [out, setOut] = useState(text);
  const first = useRef(true);
  useEffect(() => {
    // The server-rendered text stays as it is; only later changes are typed.
    if (first.current) { first.current = false; return; }
    if (prefersReducedMotion()) { setOut(text); return; }
    let i = 0;
    setOut("");
    const t = window.setInterval(() => {
      i += 1;
      setOut(text.slice(0, i));
      if (i >= text.length) window.clearInterval(t);
    }, speed);
    return () => window.clearInterval(t);
  }, [text, speed]);
  return out;
}

/** Counts up to `value` once `active` becomes true. */
export function useCountUp(value: number, active: boolean, duration = 1100): number {
  const [n, setN] = useState(value);
  const done = useRef(false);
  useEffect(() => {
    if (!active || done.current) return;
    done.current = true;
    if (prefersReducedMotion()) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    setN(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, value, duration]);
  return n;
}

/**
 * The hero backdrop: a field of points with a beam sweeping across it. Points
 * the beam passes flare amber ("read") and fade back; points near the pointer
 * glow blue. It is the scan, drawn — not a generic particle effect.
 *
 * Canvas 2D, one draw per frame, paused when off-screen or the tab is hidden.
 */
export function ScanField({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = prefersReducedMotion();
    const GAP = 30;
    let w = 0, h = 0, dpr = 1, raf = 0, running = false;
    let cols = 0, rows = 0;
    let heat = new Float32Array(0);
    const pointer = { x: -9999, y: -9999 };
    const isDark = () => document.documentElement.classList.contains("dark");

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / GAP) + 1; rows = Math.ceil(h / GAP) + 1;
      heat = new Float32Array(cols * rows);
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      const dark = isDark();
      // Beam position: sweeps left to right, then waits a moment off-screen.
      const cycle = 7000;
      const p = (t % cycle) / cycle;
      const beamX = reduce ? -9999 : -200 + p * (w + 900);
      const base = dark ? "148,163,214" : "60,80,140";
      for (let cy = 0; cy < rows; cy++) {
        for (let cx = 0; cx < cols; cx++) {
          const x = cx * GAP + (cy % 2 ? GAP / 2 : 0);
          const y = cy * GAP;
          const i = cy * cols + cx;
          // The beam leans, like light raking across a surface.
          const d = Math.abs(x - (beamX - y * 0.35));
          if (d < 26) heat[i] = 1;
          else heat[i] *= 0.965;
          const dx = x - pointer.x, dy = y - pointer.y;
          const near = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / 150);
          const k = heat[i];
          if (k > 0.03) {
            ctx.fillStyle = `rgba(245,181,68,${Math.min(1, k * 0.95)})`;
            ctx.beginPath(); ctx.arc(x, y, 1.1 + k * 1.5, 0, Math.PI * 2); ctx.fill();
          } else if (near > 0) {
            ctx.fillStyle = `rgba(96,165,250,${0.25 + near * 0.75})`;
            ctx.beginPath(); ctx.arc(x, y, 1.1 + near * 1.6, 0, Math.PI * 2); ctx.fill();
          } else {
            ctx.fillStyle = `rgba(${base},${dark ? 0.2 : 0.28})`;
            ctx.fillRect(x - 0.75, y - 0.75, 1.5, 1.5);
          }
        }
      }
      if (!reduce) {
        // The beam itself: a soft leaning band of light.
        const g = ctx.createLinearGradient(beamX - 90, 0, beamX + 10, 0);
        g.addColorStop(0, "rgba(245,181,68,0)");
        g.addColorStop(1, `rgba(245,181,68,${dark ? 0.1 : 0.14})`);
        ctx.save();
        ctx.transform(1, 0, -0.35, 1, 0, 0);
        ctx.fillStyle = g;
        ctx.fillRect(beamX - 90 + h * 0.35 * 0, 0, 100, h);
        ctx.restore();
      }
    };

    const loop = (t: number) => { draw(t); if (running) raf = requestAnimationFrame(loop); };
    const start = () => { if (running || reduce) return; running = true; raf = requestAnimationFrame(loop); };
    const stop = () => { running = false; cancelAnimationFrame(raf); };

    resize();
    draw(0);
    const ro = new ResizeObserver(() => { resize(); draw(performance.now()); });
    ro.observe(canvas);
    const io = new IntersectionObserver((es) => (es[0]?.isIntersecting ? start() : stop()));
    io.observe(canvas);
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);
    const onMove = (e: globalThis.PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      stop(); ro.disconnect(); io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className={className} />;
}
