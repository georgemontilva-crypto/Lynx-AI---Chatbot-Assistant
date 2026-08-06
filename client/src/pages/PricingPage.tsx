import { motion } from "framer-motion";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  Cloud,
  Code2,
  Building2,
  Zap,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Shield,
  CreditCard,
  HeadphonesIcon,
} from "lucide-react";
import { useState } from "react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const plans = [
  {
    id: "cloud",
    icon: Cloud,
    name: "Lynx Cloud AI",
    tagline: "Runs entirely in the cloud — nothing to install on your site.",
    price: "$199",
    period: "/mo",
    note: "1 website · Cancel anytime",
    popular: false,
    iconColor: "text-blue-400",
    iconBg: "bg-blue-500/10",
    accentColor: "blue",
    features: [
      "100% cloud-hosted AI",
      "Learns your website automatically",
      "Automatic weekly re-scan",
      "New content visible after next scan",
      "24/7 AI support",
      "API connection",
      "Lead capture form",
      "Analytics dashboard",
    ],
    cta: "Get started with Cloud",
    ctaHref: "/register",
  },
  {
    id: "embedded",
    icon: Code2,
    name: "Lynx Embedded AI",
    tagline: "Installed directly on your site — learns every corner of it.",
    price: "$399",
    period: "/mo",
    note: "1 website · Cancel anytime",
    popular: true,
    iconColor: "text-violet-400",
    iconBg: "bg-violet-500/10",
    accentColor: "violet",
    features: [
      "Everything in Lynx Cloud AI",
      "Installs directly via single installation API",
      "Learns from every page on your site",
      "On-demand sync from your dashboard",
      "Automatic re-scan every 24 hours",
      "Spontaneous proactive support",
      "Custom branding & colors",
      "Priority support",
    ],
    cta: "Get started with Embedded",
    ctaHref: "/register",
  },
  {
    id: "whitelabel",
    icon: Building2,
    name: "Lynx White-Label",
    tagline: "One chatbot, your brand. Install it on all your clients' sites.",
    price: "$499",
    period: "/mo",
    note: "Up to 15 client sites · Cancel anytime",
    popular: false,
    iconColor: "text-yellow-400",
    iconBg: "bg-yellow-500/10",
    accentColor: "yellow",
    features: [
      "Everything in Lynx Embedded AI",
      "Full white-label — your brand, your colors, your domain",
      "1 chatbot configured by you, installed on up to 15 client sites",
      "Client management dashboard with per-site analytics",
      "Generate & download PDF reports per client",
      "Priority support & dedicated account manager",
      "Full API access",
      "Client expansion packs available",
    ],
    cta: "Get started with White-Label",
    ctaHref: "/register",
  },
];

// Feature comparison table
const comparisonFeatures = [
  { feature: "AI-powered chatbot", cloud: true, embedded: true, whitelabel: true },
  { feature: "Automatic site scanning", cloud: true, embedded: true, whitelabel: true },
  { feature: "Lead capture & CRM", cloud: true, embedded: true, whitelabel: true },
  { feature: "Analytics dashboard", cloud: true, embedded: true, whitelabel: true },
  { feature: "API access", cloud: true, embedded: true, whitelabel: true },
  { feature: "Re-scan frequency", cloud: "Weekly", embedded: "Daily", whitelabel: "Daily" },
  { feature: "Messages per month", cloud: "500", embedded: "2,000", whitelabel: "8,000" },
  { feature: "Client sites (1 bot installed on each)", cloud: "—", embedded: "—", whitelabel: "Up to 15" },
  { feature: "Custom branding", cloud: false, embedded: true, whitelabel: true },
  { feature: "On-demand sync", cloud: false, embedded: true, whitelabel: true },
  { feature: "Proactive support messages", cloud: false, embedded: true, whitelabel: true },
  { feature: "White-label (your brand)", cloud: false, embedded: false, whitelabel: true },
  { feature: "Client management dashboard", cloud: false, embedded: false, whitelabel: true },
  { feature: "PDF reports per client", cloud: false, embedded: false, whitelabel: true },
  { feature: "Dedicated account manager", cloud: false, embedded: false, whitelabel: true },
  { feature: "Reseller expansion packs", cloud: false, embedded: false, whitelabel: true },
];

const faqs = [
  {
    q: "¿Puedo cambiar de plan en cualquier momento?",
    a: "Sí, puedes hacer upgrade o downgrade de tu plan en cualquier momento desde tu dashboard. Los cambios se aplican al siguiente ciclo de facturación.",
  },
  {
    q: "¿Hay un período de prueba gratuito?",
    a: "Todos los planes incluyen 14 días de prueba gratuita. No se requiere tarjeta de crédito para comenzar.",
  },
  {
    q: "¿Qué pasa si supero el límite de mensajes?",
    a: "Recibirás una alerta cuando alcances el 80% de tu límite mensual. Si llegas al 100%, el chatbot mostrará un mensaje amigable a los visitantes hasta que se reinicie el contador el próximo mes.",
  },
  {
    q: "¿Cómo funciona el modelo White-Label?",
    a: "Tú configuras un único chatbot con tu marca, colores y personalidad. Luego lo instalas en los sitios web de tus clientes (hasta 15 sitios). Cada cliente recibe el mismo bot, pero con el contexto de su propio sitio escaneado. Tú eres el único que accede al dashboard — tus clientes no necesitan crear cuentas.",
  },
  {
    q: "¿Cómo comparto las métricas con mis clientes?",
    a: "Desde tu dashboard, en la sección de clientes, puedes generar y descargar un reporte PDF profesional por cada cliente. El reporte incluye gráficos de visitas, chats iniciados, leads capturados y tasa de conversión del período que elijas.",
  },
  {
    q: "¿Puedo agregar más sitios al plan White-Label?",
    a: "Sí. El plan base incluye 15 sitios de clientes. Puedes expandir con packs adicionales: +15 sitios ($99/mo), +30 sitios ($179/mo), +60 sitios ($299/mo), o +100 sitios ($449/mo).",
  },
  {
    q: "¿Cómo funciona el escaneo del sitio?",
    a: "Lynx AI escanea automáticamente todas las páginas de tu sitio web y construye una base de conocimiento. El chatbot usa esta información para responder preguntas precisas sobre tus productos, servicios y políticas.",
  },
  {
    q: "¿En qué idiomas funciona el chatbot?",
    a: "Lynx AI soporta múltiples idiomas. El chatbot detecta automáticamente el idioma del visitante y responde en el mismo idioma.",
  },
  {
    q: "¿Puedo cancelar en cualquier momento?",
    a: "Sí, puedes cancelar tu suscripción en cualquier momento sin penalizaciones. Tu acceso continúa hasta el final del período de facturación actual.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="border border-border/50 rounded-xl overflow-hidden cursor-pointer hover:border-primary/30 transition-colors"
      onClick={() => setOpen(!open)}
    >
      <div className="flex items-center justify-between p-5 gap-4">
        <span className="font-medium text-sm">{q}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </div>
      {open && (
        <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border/30 pt-4">
          {a}
        </div>
      )}
    </div>
  );
}

function FeatureCell({ value }: { value: boolean | string }) {
  if (typeof value === "boolean") {
    return value ? (
      <CheckCircle className="w-5 h-5 text-primary mx-auto" />
    ) : (
      <XCircle className="w-5 h-5 text-muted-foreground/30 mx-auto" />
    );
  }
  return <span className="text-sm text-center block text-muted-foreground">{value}</span>;
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-16 text-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <Badge variant="outline" className="mb-6 text-primary border-primary/30 bg-primary/5 px-4 py-1.5">
            Precios transparentes · Sin sorpresas
          </Badge>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6 max-w-3xl mx-auto">
            Elige el plan que{" "}
            <span className="bg-gradient-to-r from-blue-500 to-violet-500 bg-clip-text text-transparent">
              impulsa tu negocio
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Todos los planes incluyen el mismo motor de IA. La diferencia está en cómo se instala, con qué frecuencia aprende y cómo se presenta.
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><Shield className="w-4 h-4 text-green-500" /> 14 días gratis</span>
            <span className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-blue-500" /> Sin tarjeta de crédito</span>
            <span className="flex items-center gap-2"><HeadphonesIcon className="w-4 h-4 text-violet-500" /> Soporte 24/7</span>
          </div>
        </motion.div>
      </section>

      {/* Plans grid */}
      <section className="pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15, duration: 0.6 }}
                className={`relative rounded-2xl p-7 flex flex-col transition-all duration-300 ${
                  plan.popular
                    ? "border-2 border-primary/50 bg-primary/5 shadow-2xl shadow-primary/10"
                    : "border border-border/50 bg-card hover:border-primary/20"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="lynx-gradient text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                      <Zap className="w-3 h-3" />
                      MÁS POPULAR
                    </div>
                  </div>
                )}

                <div className={`w-12 h-12 rounded-xl ${plan.iconBg} flex items-center justify-center mb-5`}>
                  <plan.icon className={`w-6 h-6 ${plan.iconColor}`} />
                </div>

                <h2 className="text-xl font-bold mb-1">{plan.name}</h2>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{plan.tagline}</p>

                <div className="mb-1 flex items-end gap-1">
                  <span className="text-5xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground text-sm mb-2">{plan.period}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-7">{plan.note}</p>

                <div className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2.5">
                      <CheckCircle
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          plan.popular ? "text-primary" : "text-muted-foreground"
                        }`}
                      />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>

                <Link href={plan.ctaHref} className="block w-full">
                  <Button
                    className={`w-full font-semibold group ${
                      plan.popular
                        ? "lynx-gradient text-white border-0 shadow-lg hover:opacity-90"
                        : "bg-secondary hover:bg-secondary/80 text-foreground"
                    }`}
                  >
                    {plan.cta}
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center text-sm text-muted-foreground mt-8"
          >
            Todos los planes incluyen 14 días de prueba gratuita. Sin tarjeta de crédito requerida.
          </motion.p>
        </div>
      </section>

      {/* Comparison table */}
      <section className="py-20 px-4 bg-muted/20">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">Comparación completa de planes</h2>
            <p className="text-muted-foreground">Todo lo que incluye cada plan, sin letra pequeña.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="rounded-2xl border border-border/50 overflow-hidden bg-card"
          >
            {/* Table header */}
            <div className="grid grid-cols-4 bg-muted/50 border-b border-border/50">
              <div className="p-4 font-semibold text-sm">Característica</div>
              <div className="p-4 text-center">
                <div className="font-bold text-sm">Cloud</div>
                <div className="text-xs text-muted-foreground">$199/mo</div>
              </div>
              <div className="p-4 text-center bg-primary/5 border-x border-primary/20">
                <div className="font-bold text-sm text-primary">Embedded</div>
                <div className="text-xs text-primary/70">$399/mo</div>
              </div>
              <div className="p-4 text-center">
                <div className="font-bold text-sm">White-Label</div>
                <div className="text-xs text-muted-foreground">$499/mo</div>
              </div>
            </div>

            {/* Table rows */}
            {comparisonFeatures.map((row, i) => (
              <div
                key={row.feature}
                className={`grid grid-cols-4 border-b border-border/30 last:border-0 ${
                  i % 2 === 0 ? "bg-background" : "bg-muted/10"
                }`}
              >
                <div className="p-4 text-sm font-medium">{row.feature}</div>
                <div className="p-4 flex items-center justify-center">
                  <FeatureCell value={row.cloud} />
                </div>
                <div className="p-4 flex items-center justify-center bg-primary/5 border-x border-primary/10">
                  <FeatureCell value={row.embedded} />
                </div>
                <div className="p-4 flex items-center justify-center">
                  <FeatureCell value={row.whitelabel} />
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">Preguntas frecuentes</h2>
            <p className="text-muted-foreground">Todo lo que necesitas saber antes de empezar.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-3"
          >
            {faqs.map((faq) => (
              <FAQItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-20 px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="max-w-3xl mx-auto text-center"
        >
          <div className="rounded-3xl border border-primary/20 bg-primary/5 p-12">
            <h2 className="text-3xl font-bold mb-4">
              ¿Listo para transformar tu sitio web?
            </h2>
            <p className="text-muted-foreground mb-8 text-lg">
              Únete a cientos de empresas que ya usan Lynx AI para capturar más leads y dar soporte 24/7 a sus visitantes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="lynx-gradient text-white border-0 shadow-lg hover:opacity-90 px-8 font-semibold">
                  Empezar gratis — 14 días
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="/#contact">
                <Button size="lg" variant="outline" className="px-8 font-semibold">
                  Hablar con ventas
                </Button>
              </Link>
            </div>
            <p className="text-xs text-muted-foreground mt-6">Sin tarjeta de crédito · Cancela cuando quieras</p>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
