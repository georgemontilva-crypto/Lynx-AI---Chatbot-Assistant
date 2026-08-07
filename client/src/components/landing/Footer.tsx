import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Twitter, Github, Linkedin, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const faqs = [
  {
    q: "Do I need technical knowledge to install Lynx?",
    a: "No. For the Cloud plan, you just paste one line of code on your site. For Embedded, we use a simple installation API that handles everything automatically.",
  },
  {
    q: "What happens if my site's content changes?",
    a: "Lynx re-scans your site automatically. On the Cloud plan, weekly. On Embedded and White-Label, every 24 hours. You can also force a manual re-scan from the dashboard.",
  },
  {
    q: "Does the chatbot mix my content with other customers' content?",
    a: "Never. Each installation has its own completely isolated knowledge base. Your content is yours alone.",
  },
  {
    q: "What languages does Lynx support?",
    a: "Lynx responds in the language the visitor writes in, with no additional configuration. It supports over 50 languages.",
  },
  {
    q: "Can I customize the chatbot's appearance?",
    a: "Yes. You can change the name, colors, avatar, welcome message and behavior from the dashboard. On the White-Label plan, customization is complete.",
  },
];

export default function Footer() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <>
      {/* FAQ Section */}
      <section className="py-24 bg-background" ref={ref}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              Frequently asked questions
            </h2>
            <p className="text-muted-foreground">Everything you need to know about Lynx AI.</p>
          </motion.div>

          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.08, duration: 0.5, ease: "easeOut" }}
                className="glass-card rounded-xl p-6"
              >
                <h3 className="font-semibold mb-3">{faq.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 section-bg-alt">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.7, ease: "easeOut" }}
            className="text-center max-w-2xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border/60 bg-card/50 text-sm text-muted-foreground mb-8">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Available now — no credit card required
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
              Ready for Lynx to
              <br />
              <span className="lynx-text-gradient">learn your site?</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-10">
              Join hundreds of businesses already using Lynx AI to serve their visitors 24/7 and improve their SEO automatically.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <Button
                  size="lg"
                  className="lynx-gradient text-white border-0 shadow-xl hover:opacity-90 text-base font-semibold px-8 h-12"
                >
                  Start free — 14 days
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="border-border/60 bg-card/30 text-base font-medium px-8 h-12"
                onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
              >
                View plans
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-12 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="mb-4">
                <img
                  src="/brand/lynx-logo-light.png"
                  alt="Lynx AI"
                  className="h-8 w-auto object-contain dark:hidden"
                />
                <img
                  src="/brand/lynx-logo-dark.png"
                  alt="Lynx AI"
                  className="h-8 w-auto object-contain hidden dark:block"
                />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                The intelligent chatbot that truly knows your website.
              </p>
              <div className="flex gap-3">
                {[Twitter, Github, Linkedin].map((Icon, i) => (
                  <button
                    key={i}
                    className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-sm font-semibold mb-4">Product</h4>
              <ul className="space-y-2.5">
                {["Features", "Pricing", "White-Label", "Documentation", "API"].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-sm font-semibold mb-4">Company</h4>
              <ul className="space-y-2.5">
                {["About", "Blog", "Use cases", "Contact", "Partners"].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-sm font-semibold mb-4">Legal</h4>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/legal/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="/legal/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    Terms
                  </Link>
                </li>
                <li>
                  <Link href="/legal/cookies" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    Cookies
                  </Link>
                </li>
                <li>
                  <Link href="/legal/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    GDPR
                  </Link>
                </li>
                <li>
                  <Link href="/legal/refunds" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    Refunds
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border/40 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              © 2026 Lynx AI. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground">
              Built with <Heart className="w-3 h-3 inline text-red-400 fill-red-400 mx-0.5" /> for growing businesses
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
