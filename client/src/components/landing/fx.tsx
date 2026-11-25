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
 * The Lynx core: a slowly turning sphere of points with two orbiting rings.
 *
 * `signal` is the screen-space direction of the capability that just switched
 * on. The side of the sphere facing it flares and a ring ripples out, so the
 * core is seen sending the task rather than just spinning.
 *
 * Canvas 2D, one draw per frame, paused when off-screen or the tab is hidden.
 */
export function LynxCore({
  signal,
  signalKey,
  className = "",
}: {
  signal: [number, number] | null;
  signalKey: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const sig = useRef({ x: 0, y: 0, at: -1e9 });

  useEffect(() => {
    if (!signal) return;
    const len = Math.hypot(signal[0], signal[1]) || 1;
    sig.current = { x: signal[0] / len, y: signal[1] / len, at: performance.now() };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signalKey]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduce = prefersReducedMotion();
    const TAU = Math.PI * 2;
    const small = window.innerWidth < 768;

    // Points spread evenly over a sphere (Fibonacci lattice).
    const N = small ? 1100 : 2200;
    const base = new Float32Array(N * 3);
    const seed = new Float32Array(N);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      base[i * 3] = Math.cos(golden * i) * r;
      base[i * 3 + 1] = y;
      base[i * 3 + 2] = Math.sin(golden * i) * r;
      seed[i] = Math.random() * TAU;
    }
    const rings = [
      { n: 130, rad: 1.3, tiltX: 1.18, tiltZ: 0.38, speed: 0.34 },
      { n: 160, rad: 1.56, tiltX: 1.34, tiltZ: -0.52, speed: -0.2 },
    ];

    // Colour runs top to bottom on screen: cyan, blue, indigo. Pre-built so the
    // draw loop only switches between a few fill styles.
    const STEPS = 24;
    const mix = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
    const ramp = (stops: number[][]) =>
      Array.from({ length: STEPS }, (_, i) => {
        const t = (i / (STEPS - 1)) * (stops.length - 1);
        const k = Math.min(stops.length - 2, Math.floor(t));
        return `rgb(${mix(stops[k], stops[k + 1], t - k).join(",")})`;
      });
    const darkRamp = ramp([[99, 102, 241], [59, 130, 246], [56, 189, 248], [103, 232, 249]]);
    const lightRamp = ramp([[67, 56, 202], [37, 99, 235], [2, 132, 199], [8, 145, 178]]);

    let w = 0, h = 0, dpr = 1;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    };
    resize();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    ro?.observe(canvas);

    // The sphere leans a little toward the pointer.
    let tx = 0, ty = 0, lx = 0, ly = 0;
    const onMove = (e: globalThis.PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      tx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2)));
      ty = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2)));
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    let visible = true;
    const io = typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); })
      : null;
    io?.observe(canvas);

    const CAM = 5;
    const draw = (now: number) => {
      const t = now / 1000;
      const dark = document.documentElement.classList.contains("dark");
      const pal = dark ? darkRamp : lightRamp;
      lx += (tx - lx) * 0.05; ly += (ty - ly) * 0.05;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
      const cx = w / 2, cy = h / 2;
      const R = Math.min(w, h) * 0.25;

      const age = (now - sig.current.at) / 1000;
      const pulse = age >= 0 && age < 1.5 ? Math.sin(Math.min(1, age / 0.35) * Math.PI * 0.5) * Math.max(0, 1 - age / 1.5) : 0;
      const sx0 = sig.current.x, sy0 = sig.current.y;

      // Glow at the centre.
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.5);
      glow.addColorStop(0, dark ? `rgba(125,190,255,${0.42 + pulse * 0.2})` : `rgba(59,130,246,${0.18 + pulse * 0.08})`);
      glow.addColorStop(0.22, dark ? "rgba(59,130,246,0.26)" : "rgba(59,130,246,0.10)");
      glow.addColorStop(0.62, dark ? "rgba(37,99,235,0.09)" : "rgba(59,130,246,0.04)");
      glow.addColorStop(1, "rgba(37,99,235,0)");
      ctx.globalAlpha = 1;
      ctx.fillStyle = glow;
      ctx.fillRect(cx - R * 1.5, cy - R * 1.5, R * 3, R * 3);

      // A lit rim, brightest at the top: reads as a body, not a flat disc of dots.
      const rim = ctx.createLinearGradient(cx, cy - R, cx, cy + R);
      rim.addColorStop(0, dark ? "rgba(125,231,255,0.75)" : "rgba(8,145,178,0.5)");
      rim.addColorStop(0.55, dark ? "rgba(59,130,246,0.22)" : "rgba(37,99,235,0.18)");
      rim.addColorStop(1, "rgba(99,102,241,0.05)");
      ctx.strokeStyle = rim;
      ctx.lineWidth = 1.25;
      ctx.shadowColor = dark ? "rgba(56,189,248,0.9)" : "rgba(37,99,235,0.4)";
      ctx.shadowBlur = 22;
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.035, 0, TAU); ctx.stroke();
      ctx.shadowBlur = 0;

      const rotY = t * 0.2 + lx * 0.7;
      const rotX = 0.3 + ly * 0.45;
      const cY = Math.cos(rotY), sY = Math.sin(rotY), cX = Math.cos(rotX), sX = Math.sin(rotX);

      for (let i = 0; i < N; i++) {
        const bx = base[i * 3], by = base[i * 3 + 1], bz = base[i * 3 + 2];
        // The surface breathes: every point drifts in and out on its own beat.
        const k = 1 + 0.04 * Math.sin(t * 1.4 + seed[i]);
        let x = bx * cY + bz * sY;
        let z = -bx * sY + bz * cY;
        let y = by * cX - z * sX;
        z = by * sX + z * cX;
        // How squarely this point faces the capability being signalled.
        let f = 0;
        if (pulse > 0) {
          const d = x * sx0 + y * sy0;
          if (d > 0.3) f = Math.min(1, (d - 0.3) / 0.55) * pulse;
        }
        const kk = k + f * 0.16;
        x *= kk; y *= kk; z *= kk;
        const persp = CAM / (CAM - z);
        const depth = (z + 1) / 2;
        const px = cx + x * R * persp, py = cy + y * R * persp;
        const size = (0.7 + 1.75 * depth) * persp + f * 1.6;
        ctx.globalAlpha = Math.min(1, 0.14 + 0.86 * depth * depth + f * 0.8);
        const tone = Math.max(0, Math.min(1, (1 - y) / 2 + f * 0.4));
        ctx.fillStyle = pal[Math.round(tone * (STEPS - 1))];
        if (size < 1.5) ctx.fillRect(px - size / 2, py - size / 2, size, size);
        else { ctx.beginPath(); ctx.arc(px, py, size / 2, 0, TAU); ctx.fill(); }
      }

      // Orbiting rings, hidden where they pass behind the sphere.
      for (const ring of rings) {
        const cTX = Math.cos(ring.tiltX + ly * 0.3), sTX = Math.sin(ring.tiltX + ly * 0.3);
        const cTZ = Math.cos(ring.tiltZ + lx * 0.25), sTZ = Math.sin(ring.tiltZ + lx * 0.25);
        for (let j = 0; j < ring.n; j++) {
          const a = (j / ring.n) * TAU + t * ring.speed;
          const x0 = Math.cos(a) * ring.rad, z0 = Math.sin(a) * ring.rad;
          // Tilt about X, then about Z.
          const y1 = -z0 * sTX, z = z0 * cTX;
          const x = x0 * cTZ - y1 * sTZ, y = x0 * sTZ + y1 * cTZ;
          if (z < 0 && x * x + y * y < 1.02) continue;
          const persp = CAM / (CAM - z);
          const depth = Math.max(0, Math.min(1, (z / ring.rad + 1) / 2));
          const lead = j % Math.round(ring.n / 3) === 0; // three brighter "satellites" per ring
          const size = lead ? 4.2 * persp : (0.7 + 0.9 * depth) * persp;
          ctx.globalAlpha = lead ? 0.95 : 0.12 + 0.5 * depth;
          ctx.fillStyle = pal[lead ? STEPS - 1 : Math.round((0.35 + 0.5 * depth) * (STEPS - 1))];
          ctx.beginPath(); ctx.arc(cx + x * R * persp, cy + y * R * persp, size / 2, 0, TAU); ctx.fill();
        }
      }

      // The ripple that leaves the surface when a task is sent.
      if (age >= 0 && age < 1.2) {
        ctx.globalAlpha = (1 - age / 1.2) * 0.55;
        ctx.strokeStyle = pal[STEPS - 1];
        ctx.lineWidth = 1.25;
        ctx.beginPath(); ctx.arc(cx, cy, R * (1.08 + age * 0.85), 0, TAU); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    let raf = 0;
    const loop = (now: number) => {
      if (visible && !document.hidden) draw(now);
      raf = requestAnimationFrame(loop);
    };
    if (reduce) draw(0);
    else raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      ro?.disconnect();
      io?.disconnect();
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
