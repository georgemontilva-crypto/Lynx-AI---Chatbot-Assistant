import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Palette, Users, DollarSign, Plus, X } from "lucide-react";

const benefits = [
  {
    icon: Palette,
    title: "Your brand, not ours",
    description:
      "Rename it, redesign it, put your own logo on the widget and dashboard your clients see. Nobody sees \"Lynx\" — they see your product.",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
  },
  {
    icon: Users,
    title: "One dashboard per client",
    description:
      "Connect each client's site, hand them their widget key, and oversee them all from one place — instead of managing separate installations by hand.",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    icon: DollarSign,
    title: "You set the price",
    description:
      "What you charge each client is entirely yours — Lynx runs silently in the background as your infrastructure.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
];

const clients = [
  { name: "Acme Supplements", type: "Embedded AI · Active", color: "bg-orange-500" },
  { name: "Blue Ridge Outdoors", type: "Cloud AI · Active", color: "bg-blue-500" },
  { name: "Casa Verde Home", type: "Embedded AI · Active", color: "bg-teal-500" },
];

export default function WhiteLabel() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="whitelabel" className="py-24 bg-background" ref={ref}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center mb-16"
        >
          <p className="text-sm font-medium text-primary uppercase tracking-widest mb-4">
            White-Label
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
            Sell Lynx under your own name
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Built for agencies, freelance developers and consultants who want to offer an AI assistant to their own clients — without building one from scratch.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Benefits */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.7, ease: "easeOut" }}
            className="space-y-6"
          >
            {benefits.map((benefit, i) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.3 + i * 0.1, duration: 0.6, ease: "easeOut" }}
                className="flex gap-4"
              >
                <div className={`w-11 h-11 rounded-xl ${benefit.bg} flex items-center justify-center shrink-0`}>
                  <benefit.icon className={`w-5 h-5 ${benefit.color}`} />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{benefit.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Client dashboard preview */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.3, duration: 0.7, ease: "easeOut" }}
          >
            <div className="glass-card rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm font-medium">Your clients</span>
              </div>

              <div className="space-y-3">
                {clients.map((client, i) => (
                  <motion.div
                    key={client.name}
                    initial={{ opacity: 0, x: 20 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.5 + i * 0.1, duration: 0.5, ease: "easeOut" }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors group"
                  >
                    <div className={`w-9 h-9 rounded-lg ${client.color} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                      {client.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{client.name}</div>
                      <div className="text-xs text-muted-foreground">{client.type}</div>
                    </div>
                    <button className="w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </motion.div>
                ))}
              </div>

              <motion.button
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : {}}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="w-full mt-4 py-3 rounded-xl border border-dashed border-border/60 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                + Add new client
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
