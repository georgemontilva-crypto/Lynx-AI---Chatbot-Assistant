import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Globe, Brain, MessageSquare } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Globe,
    title: "Lynx scans your website",
    description:
      "It reads your products, pages, policies and documents — exactly as a visitor would see them.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    number: "02",
    icon: Brain,
    title: "It learns your environment",
    description:
      "Every page becomes something Lynx truly understands — not a script, not a guess.",
    color: "from-violet-500 to-purple-500",
  },
  {
    number: "03",
    icon: MessageSquare,
    title: "Visitors get real answers",
    description:
      "On the next scheduled scan, any new content becomes something Lynx can speak to.",
    color: "from-cyan-500 to-teal-500",
  },
];

export default function HowItWorks() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="how-it-works" className="py-24 section-bg-alt" ref={ref}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center mb-16"
        >
          <p className="text-sm font-medium text-primary uppercase tracking-widest mb-4">
            How it works
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
            From your website to a working assistant
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            No manual training, no rewriting content — Lynx builds its own knowledge from what's already on your site.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.15, duration: 0.6, ease: "easeOut" }}
              className="glass-card rounded-2xl p-6 hover:border-primary/30 transition-all duration-300 group"
            >
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}
              >
                <span className="text-white text-sm font-bold">{step.number}</span>
              </div>
              <step.icon className="w-5 h-5 text-muted-foreground mb-3" />
              <h3 className="text-lg font-semibold mb-3">{step.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>

        <div className="hidden md:flex items-center justify-center mt-8 gap-0">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>
      </div>
    </section>
  );
}
