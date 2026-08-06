import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Play,
  Zap,
  MessageSquare,
  TrendingUp,
  ShieldCheck,
  Search,
  Send,
} from "lucide-react";
import { Link } from "wouter";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.7, ease: "easeOut" as const },
  }),
};

const floatingCard = {
  hidden: { opacity: 0, scale: 0.8, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { delay: 0.8 + i * 0.15, duration: 0.6, ease: "easeOut" as const },
  }),
};

// Static chat widget — all messages visible at once, no animation loop
function StaticChat() {
  return (
    <div className="p-3 space-y-2.5 bg-white" style={{ minHeight: 168 }}>
      {/* Center hint */}
      <p className="text-xs text-gray-400 text-center py-1">
        I know your catalog and policies, ask me anything.
      </p>
      {/* User message */}
      <div className="flex justify-end">
        <div className="lynx-gradient rounded-2xl rounded-tr-sm px-3.5 py-2 text-xs text-white max-w-[78%] shadow-sm">
          Do you have this in size S?
        </div>
      </div>
      {/* Bot reply */}
      <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs text-gray-800 max-w-[85%] shadow-sm">
        <p className="leading-relaxed">Yes — I found 2 size S units in stock for that exact product. Here's the page:</p>
        <button className="mt-2 lynx-gradient text-white text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1 font-medium">
          View product <ArrowRight className="w-2.5 h-2.5" />
        </button>
      </div>
      {/* User message */}
      <div className="flex justify-end">
        <div className="lynx-gradient rounded-2xl rounded-tr-sm px-3.5 py-2 text-xs text-white max-w-[78%] shadow-sm">
          Do you ship to Canada?
        </div>
      </div>
      {/* Bot reply */}
      <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs text-gray-800 max-w-[85%] shadow-sm">
        <p className="leading-relaxed">Yes. Standard shipping to Canada takes 5–8 business days. Full details here:</p>
        <button className="mt-2 lynx-gradient text-white text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1 font-medium">
          View shipping policy <ArrowRight className="w-2.5 h-2.5" />
        </button>
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden hero-bg pt-16">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, oklch(0.55 0.22 260), transparent 70%)",
            filter: "blur(60px)",
          }}
          animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full opacity-15"
          style={{
            background: "radial-gradient(circle, oklch(0.65 0.18 200), transparent 70%)",
            filter: "blur(60px)",
          }}
          animate={{ x: [0, -25, 0], y: [0, 25, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
        <motion.div
          className="absolute top-1/2 right-1/3 w-64 h-64 rounded-full opacity-10"
          style={{
            background: "radial-gradient(circle, oklch(0.72 0.16 240), transparent 70%)",
            filter: "blur(50px)",
          }}
          animate={{ x: [0, 20, 0], y: [0, 30, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(oklch(0.65 0.18 240) 1px, transparent 1px), linear-gradient(90deg, oklch(0.65 0.18 240) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl relative z-10">
        <div className="text-center max-w-5xl mx-auto">
          {/* Badge */}
          <motion.div
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border/60 bg-card/50 backdrop-blur-sm text-sm text-muted-foreground mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Cloud AI that reads your entire website
            <Zap className="w-3.5 h-3.5 text-primary" />
          </motion.div>

          {/* Headline */}
          <motion.h1
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-6"
          >
            An AI that truly
            <br />
            <span className="lynx-text-gradient">knows your website</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Lynx scans your site, learns your real products, pages and policies, and gives every visitor personalized, accurate answers — day or night, with no manual training.
          </motion.p>

          {/* CTAs */}
          <motion.div
            custom={3}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <Link href="/register">
              <Button
                size="lg"
                className="lynx-gradient text-white border-0 shadow-xl hover:opacity-90 transition-all duration-200 text-base font-semibold px-8 h-12 group"
              >
                See plans — from $199/mo
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="border-border/60 bg-card/30 backdrop-blur-sm hover:bg-card/60 text-base font-medium px-8 h-12 gap-2"
              onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
            >
              <Play className="w-4 h-4 fill-current" />
              How it works
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            custom={4}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-3 gap-6 max-w-lg mx-auto mb-16"
          >
            {[
              { value: "< 2s", label: "Response time" },
              { value: "24/7", label: "Availability" },
              { value: "100%", label: "Site context" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold lynx-text-gradient">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>

          {/* Floating UI Preview */}
          <div className="relative max-w-4xl mx-auto overflow-hidden sm:overflow-visible">
            {/* Main chat preview */}
            <motion.div
              initial={{ opacity: 0, y: 60, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
              className="glass-card rounded-2xl p-1 shadow-2xl"
            >
              {/* Browser chrome */}
              <div className="bg-card/80 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400/70" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400/70" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400/70" />
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="bg-muted/50 rounded-md h-6 flex items-center px-3">
                      <span className="text-xs text-muted-foreground">mitienda.com</span>
                    </div>
                  </div>
                </div>
                {/* Website content mockup */}
                <div className="relative h-64 sm:h-80 bg-gradient-to-br from-muted/20 to-muted/5 p-6 overflow-hidden">
                  {/* Fake website content */}
                  <div className="space-y-3 opacity-40">
                    <div className="h-8 bg-muted/60 rounded-lg w-2/3" />
                    <div className="h-4 bg-muted/40 rounded w-full" />
                    <div className="h-4 bg-muted/40 rounded w-5/6" />
                    <div className="h-4 bg-muted/40 rounded w-4/5" />
                    <div className="flex gap-3 mt-4">
                      <div className="h-24 w-24 bg-muted/50 rounded-xl" />
                      <div className="h-24 w-24 bg-muted/50 rounded-xl" />
                      <div className="h-24 w-24 bg-muted/50 rounded-xl" />
                    </div>
                  </div>

                  {/* Lynx Chat Widget */}
                  <motion.div
                    className="absolute bottom-4 right-4 w-72 glass-card rounded-2xl shadow-2xl overflow-hidden"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    {/* Chat header */}
                    <div className="lynx-gradient px-4 py-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                        <MessageSquare className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="text-white text-sm font-semibold">Lynx</div>
                        <div className="text-white/70 text-xs flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                          AI Assistant · online
                        </div>
                      </div>
                    </div>

                    {/* Static chat messages */}
                    <StaticChat />

                    {/* Input */}
                    <div className="px-3 pb-3 bg-card/90">
                      <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2">
                        <span className="text-xs text-muted-foreground flex-1">Ask about sizes, shipping, returns...</span>
                        <div className="w-6 h-6 rounded-full lynx-gradient flex items-center justify-center flex-shrink-0">
                          <Send className="w-3 h-3 text-white" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>

            {/* Floating stat cards */}
            <motion.div
              custom={0}
              variants={floatingCard}
              initial="hidden"
              animate="visible"
              className="absolute -left-4 sm:-left-16 top-1/3 glass-card rounded-xl p-3 shadow-xl hidden sm:flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="text-xs font-semibold">+34% conversion</div>
                <div className="text-xs text-muted-foreground">vs. last month</div>
              </div>
            </motion.div>

            <motion.div
              custom={1}
              variants={floatingCard}
              initial="hidden"
              animate="visible"
              className="absolute -right-4 sm:-right-16 top-1/4 glass-card rounded-xl p-3 shadow-xl hidden sm:flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="text-xs font-semibold">100% private</div>
                <div className="text-xs text-muted-foreground">Your content only</div>
              </div>
            </motion.div>

            <motion.div
              custom={2}
              variants={floatingCard}
              initial="hidden"
              animate="visible"
              className="absolute -left-4 sm:-left-12 bottom-8 glass-card rounded-xl p-3 shadow-xl hidden sm:flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Search className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <div className="text-xs font-semibold">SEO improved</div>
                <div className="text-xs text-muted-foreground">Automatic suggestions</div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
}
