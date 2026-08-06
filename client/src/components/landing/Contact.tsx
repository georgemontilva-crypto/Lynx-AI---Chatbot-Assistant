import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Mail,
  MessageSquare,
  Headphones,
  Send,
  CheckCircle,
  Building,
  User,
  ChevronDown,
} from "lucide-react";

const contactInfo = [
  {
    icon: Mail,
    label: "Email",
    value: "support@lynxaiassistant.com",
    href: "mailto:support@lynxaiassistant.com",
  },
  {
    icon: MessageSquare,
    label: "Live chat",
    value: "Available in the dashboard",
    href: null,
  },
  {
    icon: Headphones,
    label: "Response time",
    value: "Within 24 hours",
    href: null,
  },
];

export default function Contact() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    plan: "" as "basic" | "pro" | "white-label" | "other" | "",
    message: "",
  });
  const [sent, setSent] = useState(false);

  const sendContact = trpc.contact.send.useMutation({
    onSuccess: () => {
      setSent(true);
      toast.success("Message sent! We'll get back to you within 24 hours.");
    },
    onError: (err) => {
      toast.error("Failed to send message. Please try again or email us directly.");
      console.error(err);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Please fill in all required fields.");
      return;
    }
    sendContact.mutate({
      name: form.name,
      email: form.email,
      company: form.company || undefined,
      plan: form.plan || undefined,
      message: form.message,
    });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <section id="contact" className="py-24 bg-background" ref={ref}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
            <Mail className="w-3.5 h-3.5" />
            Get in touch
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Talk to our team
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Have questions about Lynx AI? Want to explore the White-Label plan?
            We're here to help you find the right solution for your business.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          {/* Left: Contact info */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="lg:col-span-2 space-y-6"
          >
            <motion.div variants={itemVariants}>
              <h3 className="text-xl font-semibold mb-2">Contact information</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Reach out via email or fill in the form and we'll respond as quickly as possible.
              </p>
            </motion.div>

            <div className="space-y-4">
              {contactInfo.map((item) => (
                <motion.div
                  key={item.label}
                  variants={itemVariants}
                  className="flex items-start gap-4 p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-colors duration-200"
                >
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <item.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
                      {item.label}
                    </p>
                    {item.href ? (
                      <a
                        href={item.href}
                        className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                      >
                        {item.value}
                      </a>
                    ) : (
                      <p className="text-sm font-medium text-foreground">{item.value}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* White-Label note */}
            <motion.div
              variants={itemVariants}
              className="p-5 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20"
            >
              <p className="text-sm font-semibold mb-2">White-Label inquiries</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Interested in reselling Lynx AI under your own brand with up to 15 websites?
                Mention it in the form and our team will send you a tailored proposal.
              </p>
            </motion.div>
          </motion.div>

          {/* Right: Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="lg:col-span-3"
          >
            {sent ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center py-16 px-8">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6"
                  >
                    <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </motion.div>
                  <h3 className="text-2xl font-bold mb-3">Message sent!</h3>
                  <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-6">
                    Thank you for reaching out. Our team will get back to you at{" "}
                    <strong>{form.email}</strong> within 24 hours.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSent(false);
                      setForm({ name: "", email: "", company: "", plan: "", message: "" });
                    }}
                  >
                    Send another message
                  </Button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="bg-card border border-border/50 rounded-3xl p-8 space-y-5 shadow-sm"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Full name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="John Smith"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="pl-9 rounded-xl border-border/60 focus:border-primary/50"
                        required
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Email address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="john@company.com"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="pl-9 rounded-xl border-border/60 focus:border-primary/50"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Company */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Company
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Acme Inc."
                        value={form.company}
                        onChange={(e) => setForm({ ...form, company: e.target.value })}
                        className="pl-9 rounded-xl border-border/60 focus:border-primary/50"
                      />
                    </div>
                  </div>

                  {/* Plan interest */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Interested in
                    </label>
                    <div className="relative">
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <select
                        value={form.plan}
                        onChange={(e) => setForm({ ...form, plan: e.target.value as typeof form.plan })}
                        className="w-full h-10 pl-3 pr-9 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:border-primary/50 appearance-none text-foreground"
                      >
                        <option value="">Select a plan...</option>
                        <option value="basic">Basic — $199/mo</option>
                        <option value="pro">Pro — $399/mo</option>
                        <option value="white-label">White-Label — $499/mo</option>
                        <option value="other">Other / General inquiry</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Message */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    placeholder="Tell us about your project, website, or any questions you have about Lynx AI..."
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="rounded-xl border-border/60 focus:border-primary/50 min-h-[140px] resize-none"
                    required
                  />
                </div>

                {/* Button + note — stacked, centered */}
                <div className="flex flex-col items-center gap-2 pt-1">
                  <Button
                    type="submit"
                    disabled={sendContact.isPending}
                    className="w-full lynx-gradient text-white border-0 font-semibold rounded-xl px-6 gap-2"
                  >
                    {sendContact.isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send message
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    We'll reply to{" "}
                    <span className="font-medium">support@lynxaiassistant.com</span>
                  </p>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
