import { motion, AnimatePresence, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { Lightbulb } from "lucide-react";

const metrics = [
  {
    label: "Average first response time",
    before: 15,
    after: 98,
    beforeLabel: "4+ hours",
    afterLabel: "< 2 sec",
  },
  {
    label: "Questions answered outside business hours",
    before: 0,
    after: 100,
    beforeLabel: "0%",
    afterLabel: "100%",
  },
  {
    label: "Answers reflecting your current catalog",
    before: 30,
    after: 85,
    beforeLabel: "Manual",
    afterLabel: "Automatic",
  },
];

// ─── Data sets ────────────────────────────────────────────────────────────────
const weekData = [
  { topic: "Wholesale pricing questions", count: 38, width: 90 },
  { topic: "Size availability inquiries", count: 24, width: 60 },
  { topic: "International shipping", count: 17, width: 42 },
];
const monthData = [
  { topic: "Return & refund policy", count: 142, width: 95 },
  { topic: "Wholesale pricing questions", count: 118, width: 78 },
  { topic: "Size availability inquiries", count: 89, width: 59 },
];

const weekSuggestions = [
  { text: "18 visitors asked about wholesale pricing this week, but there's no dedicated page — consider adding one." },
  { text: '"Track my order" appears daily but isn\'t in your main navigation — a shortcut could reduce repeated questions.' },
  { text: "Your returns page has a high load time — optimizing it could improve your SEO by 12%." },
];
const monthSuggestions = [
  { text: "142 return-related questions last month — adding a self-service returns portal could cut support volume by ~40%." },
  { text: "Wholesale inquiries are up 3× this month — a dedicated landing page could convert them directly." },
  { text: "Your checkout page bounce rate is 34% — simplifying the flow could recover significant lost revenue." },
];

// ─── TrendingCard ──────────────────────────────────────────────────────────────
function TrendingCard({ isInView }: { isInView: boolean }) {
  const [period, setPeriod] = useState<"week" | "month">("week");
  const data = period === "week" ? weekData : monthData;

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-sm">Trending with your visitors</h3>
        <div className="flex gap-1">
          {(["week", "month"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${
                period === p
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={period}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="space-y-4"
        >
          {data.map((item, i) => (
            <div key={item.topic}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">{item.topic}</span>
                <span className="text-xs text-muted-foreground font-mono">{item.count} mentions</span>
              </div>
              <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "linear-gradient(90deg, oklch(0.55 0.22 260), oklch(0.65 0.18 240))" }}
                  initial={{ width: 0 }}
                  animate={isInView ? { width: `${item.width}%` } : { width: 0 }}
                  transition={{ delay: i * 0.12, duration: 0.9, ease: "easeOut" }}
                />
              </div>
            </div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── SuggestionsCard ──────────────────────────────────────────────────────────
function SuggestionsCard({ isInView }: { isInView: boolean }) {
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [visibleCount, setVisibleCount] = useState(0);
  const suggestions = period === "week" ? weekSuggestions : monthSuggestions;

  // Reset and replay notification entrance whenever period or inView changes
  useEffect(() => {
    if (!isInView) return;
    setVisibleCount(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    suggestions.forEach((_, i) => {
      timers.push(setTimeout(() => setVisibleCount(i + 1), 600 + i * 900));
    });
    return () => timers.forEach(clearTimeout);
  }, [period, isInView]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-sm">Lynx suggestions</h3>
        <div className="flex gap-1">
          {(["week", "month"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${
                period === p
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <AnimatePresence>
          {suggestions.slice(0, visibleCount).map((s, i) => (
            <motion.div
              key={`${period}-${i}`}
              initial={{ opacity: 0, x: 24, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="flex items-start gap-3 p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/10"
            >
              <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <Lightbulb className="w-3.5 h-3.5 text-yellow-400" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{s.text}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function Comparison() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-24 section-bg-alt" ref={ref}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center mb-16"
        >
          <p className="text-sm font-medium text-primary uppercase tracking-widest mb-4">
            Why it matters
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
            What changes when Lynx learns your site
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A typical store, before and after switching support to Lynx.
          </p>
        </motion.div>

        {/* Comparison card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2, duration: 0.7, ease: "easeOut" }}
          className="glass-card rounded-2xl p-8 max-w-3xl mx-auto"
        >
          <div className="space-y-8">
            {metrics.map((metric, i) => (
              <div key={metric.label}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">{metric.label}</span>
                  <span className="text-sm font-mono font-medium text-muted-foreground">
                    {metric.beforeLabel} vs {metric.afterLabel}
                  </span>
                </div>
                <div className="mb-2">
                  <div className="h-2 bg-muted/40 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-muted-foreground/30"
                      initial={{ width: 0 }}
                      animate={isInView ? { width: `${metric.before}%` } : { width: 0 }}
                      transition={{ delay: 0.4 + i * 0.15, duration: 1, ease: "easeOut" }}
                    />
                  </div>
                </div>
                <div>
                  <div className="h-2 bg-muted/40 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background: "linear-gradient(90deg, oklch(0.55 0.22 260), oklch(0.65 0.18 240), oklch(0.72 0.16 200))",
                      }}
                      initial={{ width: 0 }}
                      animate={isInView ? { width: `${metric.after}%` } : { width: 0 }}
                      transition={{ delay: 0.5 + i * 0.15, duration: 1.2, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-6 mt-8 pt-6 border-t border-border/40">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
              <span className="text-xs text-muted-foreground">Without Lynx</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  background: "linear-gradient(90deg, oklch(0.55 0.22 260), oklch(0.65 0.18 240))",
                }}
              />
              <span className="text-xs text-muted-foreground">With Lynx</span>
            </div>
          </div>
        </motion.div>

        {/* Beyond Chat section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.4, duration: 0.7, ease: "easeOut" }}
          className="mt-20 text-center mb-12"
        >
          <p className="text-sm font-medium text-primary uppercase tracking-widest mb-4">
            Beyond chat
          </p>
          <h3 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
            A generative AI that also observes and suggests
          </h3>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Lynx doesn't just answer visitors — it pays attention to what they ask and turns that into ideas for your site.
          </p>
        </motion.div>

        {/* Analytics preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.5, duration: 0.7, ease: "easeOut" }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl mx-auto"
        >
          {/* Trending topics */}
          <TrendingCard isInView={isInView} />

          {/* Suggestions */}
          <SuggestionsCard isInView={isInView} />
        </motion.div>
      </div>
    </section>
  );
}
