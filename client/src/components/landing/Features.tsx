import { motion, AnimatePresence } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import {
  Search,
  RefreshCw,
  Lock,
  Globe,
  Zap,
  Code2,
  MessageSquare,
  CheckCircle,
  Send,
  ArrowRight,
} from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Learns your environment",
    description:
      "Lynx scans your real site content — products, pages, policies — and builds its own understanding of your business.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: RefreshCw,
    title: "Scheduled re-scans",
    description:
      "New content becomes visible to Lynx on its next scan — weekly on Cloud, every 24 hours on Embedded and White-Label.",
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
  },
  {
    icon: Lock,
    title: "Private and isolated",
    description:
      "Your content never mixes with anyone else's — each installation has its own completely separate knowledge base.",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    icon: Globe,
    title: "Speaks the visitor's language",
    description:
      "Lynx replies in the language the visitor writes in — no configuration needed.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Zap,
    title: "Spontaneous proactive support",
    description:
      "On Embedded and White-Label, Lynx doesn't just wait to be asked — it reaches out when it can help.",
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
  },
  {
    icon: Code2,
    title: "API connection, no code from you",
    description:
      "Connect via a simple installation API — Lynx handles the rest from the cloud.",
    color: "text-pink-500",
    bg: "bg-pink-500/10",
  },
];

// ─── Typing dots ───────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-[3px] px-3 py-2.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-gray-400"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// ─── Chat sequence ─────────────────────────────────────────────────────────
type Msg =
  | { type: "center"; text: string }
  | { type: "user"; text: string }
  | { type: "bot"; text: string; link?: string }
  | { type: "typing" };

const SEQUENCE: { msg: Msg; at: number }[] = [
  { msg: { type: "center", text: "I know your catalog and policies, ask me anything." }, at: 300 },
  { msg: { type: "user",   text: "Do you have this in size S?" },                        at: 1800 },
  { msg: { type: "typing" },                                                              at: 2500 },
  { msg: { type: "bot",    text: "Yes — I found 2 size S units in stock for that exact product. Here's the page:", link: "View product" }, at: 4000 },
  { msg: { type: "user",   text: "Do you ship to Canada?" },                             at: 6000 },
  { msg: { type: "typing" },                                                              at: 6700 },
  { msg: { type: "bot",    text: "Yes. Standard shipping to Canada takes 5–8 business days. Full details here:", link: "View shipping policy" }, at: 8200 },
];
const LOOP_MS = 11500;

function AnimatedChat() {
  const [visible, setVisible] = useState<number[]>([]);
  const [showTyping, setShowTyping] = useState(false);
  const cycleRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cycle = ++cycleRef.current;
    const timers: ReturnType<typeof setTimeout>[] = [];

    function run() {
      setVisible([]);
      setShowTyping(false);

      SEQUENCE.forEach(({ msg, at }, idx) => {
        timers.push(
          setTimeout(() => {
            if (cycleRef.current !== cycle) return;
            if (msg.type === "typing") {
              setShowTyping(true);
            } else {
              setShowTyping(false);
              setVisible((prev) => [...prev, idx]);
              // scroll to bottom
              requestAnimationFrame(() => {
                if (scrollRef.current) {
                  scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
              });
            }
          }, at)
        );
      });

      timers.push(setTimeout(() => { if (cycleRef.current === cycle) run(); }, LOOP_MS));
    }

    run();
    return () => { cycleRef.current++; timers.forEach(clearTimeout); };
  }, []);

  const displayed = SEQUENCE.filter((_, i) => visible.includes(i) && SEQUENCE[i].msg.type !== "typing");

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-hidden px-4 py-3 space-y-2.5"
      style={{ scrollbarWidth: "none" }}
    >
      <AnimatePresence>
        {displayed.map(({ msg }, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={msg.type === "user" ? "flex justify-end" : ""}
          >
            {msg.type === "center" && (
              <p className="text-xs text-gray-400 text-center py-1">{msg.text}</p>
            )}
            {msg.type === "user" && (
              <div className="lynx-gradient rounded-2xl rounded-tr-sm px-3.5 py-2 text-xs text-white max-w-[78%] shadow-sm">
                {msg.text}
              </div>
            )}
            {msg.type === "bot" && (
              <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs text-gray-800 max-w-[85%] shadow-sm">
                <p className="leading-relaxed">{msg.text}</p>
                {msg.link && (
                  <button className="mt-2 lynx-gradient text-white text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1 font-medium">
                    {msg.link}
                    <ArrowRight className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            )}
          </motion.div>
        ))}
        {showTyping && (
          <motion.div
            key="typing"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-gray-100 rounded-2xl rounded-tl-sm w-fit shadow-sm"
          >
            <TypingDots />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────
export default function Features() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="features" className="py-24 bg-background" ref={ref}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center mb-16"
        >
          <p className="text-sm font-medium text-primary uppercase tracking-widest mb-4">
            Under the hood
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
            Built to be accurate, current, and secure
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            The same engine across all plans — the difference is where it lives and how often it re-scans.
          </p>
        </motion.div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.6, ease: "easeOut" }}
              className="rounded-2xl border border-border bg-card p-6 hover:border-primary/30 transition-all duration-300 group hover:shadow-lg hover:shadow-primary/5"
            >
              <div className={`w-11 h-11 rounded-xl ${feature.bg} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className={`w-5 h-5 ${feature.color}`} />
              </div>
              <h3 className="text-base font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Personalized attention — split layout */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.6, duration: 0.7, ease: "easeOut" }}
          className="mt-24 grid grid-cols-1 lg:grid-cols-2 gap-14 items-center"
        >
          {/* Left copy */}
          <div>
            <h3 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6 leading-tight">
              Personalized support, built from your own content
            </h3>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Lynx doesn't improvise. Every answer is grounded in what it scanned from your site — so responses stay accurate even as your catalog changes.
            </p>
            <div className="space-y-4">
              {[
                "Understands your real products, pages, and policies",
                "Speaks the language the visitor writes in",
                "Reaches out proactively, not just when asked",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: fixed-height chat widget */}
          <div className="relative">
            {/* Outer card — fixed height, no grow */}
            <div
              className="rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-white flex flex-col"
              style={{ height: 420 }}
            >
              {/* Header */}
              <div className="lynx-gradient px-5 py-3.5 flex items-center gap-3 shrink-0">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="text-white font-semibold text-sm">Lynx</div>
                  <div className="text-white/75 text-xs flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                    AI Assistant · online
                  </div>
                </div>
              </div>

              {/* Scrollable messages — fills remaining space */}
              <AnimatedChat />

              {/* Input bar */}
              <div className="px-4 pb-4 pt-2 bg-white shrink-0 border-t border-gray-100">
                <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3.5 py-2.5">
                  <span className="text-xs text-gray-400 flex-1">Ask about sizes, shipping, returns...</span>
                  <div className="w-7 h-7 rounded-full lynx-gradient flex items-center justify-center shrink-0">
                    <Send className="w-3 h-3 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Subtle glow */}
            <div
              className="absolute inset-0 rounded-2xl -z-10 opacity-30"
              style={{ boxShadow: "0 0 60px oklch(0.55 0.20 240 / 0.25)" }}
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
