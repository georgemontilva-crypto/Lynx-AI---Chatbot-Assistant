import { useState, useEffect } from "react";
import DashboardShell from "@/components/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  Rocket,
  Building2,
  Palette,
  Bot,
  FileText,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Globe,
  Phone,
  Mail,
  Upload,
  Sparkles,
  CreditCard,
  Loader2,
} from "lucide-react";

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, icon: Building2, label: "Your Business",  title: "Tell us about your business",   subtitle: "We'll build your site around your brand." },
  { id: 2, icon: Palette,   label: "Branding",       title: "Your brand colors & assets",    subtitle: "Upload your logo and choose your colors." },
  { id: 3, icon: Bot,       label: "AI Chatbot",     title: "Configure your AI assistant",   subtitle: "Personalize how your chatbot greets visitors." },
  { id: 4, icon: FileText,  label: "Details",        title: "A few more details",            subtitle: "Help us build exactly what you need." },
  { id: 5, icon: CheckCircle2, label: "Review",      title: "Review & submit",               subtitle: "We'll contact you within 24 hours." },
];

// ─── Color picker ─────────────────────────────────────────────────────────────

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-shrink-0">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-12 h-12 rounded-xl cursor-pointer border-2 border-border p-0.5 bg-transparent"
          style={{ colorScheme: "normal" }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground mb-1">{label}</p>
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="#3b82f6"
          className="font-mono text-sm h-9"
          maxLength={7}
        />
      </div>
    </div>
  );
}

// ─── File upload field ────────────────────────────────────────────────────────

function FileUploadField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json() as { url: string };
      onChange(data.url);
      toast.success("File uploaded successfully");
    } catch {
      toast.error("Upload failed. Please paste a URL instead.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <div className="flex gap-2">
        <label className="flex-shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/50 cursor-pointer hover:bg-muted transition-colors text-sm font-medium">
            <Upload className="w-4 h-4" />
            {uploading ? "Uploading…" : "Upload"}
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
        </label>
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Or paste a URL…"
          className="text-sm"
        />
      </div>
      {value && (
        <div className="flex items-center gap-2 mt-1">
          <img src={value} alt="preview" className="w-10 h-10 rounded-lg object-contain border border-border bg-muted" onError={e => (e.currentTarget.style.display = "none")} />
          <span className="text-xs text-muted-foreground truncate max-w-[200px]">{value}</span>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DashboardWebSetup() {
  const [location] = useLocation();
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [requestId, setRequestId] = useState<number | null>(null);
  const [paymentPending, setPaymentPending] = useState(false);
  const [paid, setPaid] = useState(false);

  // Handle PayPal return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const rid = params.get("requestId");
    if (payment === "success" && rid) {
      const numRid = Number(rid);
      setRequestId(numRid);
      setSubmitted(true);
      // Capture the payment
      fetch("/api/billing/capture-web-setup-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orderId: params.get("token"), requestId: numRid }),
      })
        .then(r => r.json())
        .then((d: any) => {
          if (d.success) {
            setPaid(true);
            toast.success("Payment confirmed! We'll start building your site.");
          }
        })
        .catch(() => {});
      window.history.replaceState({}, "", "/dashboard/web-setup");
    } else if (payment === "cancelled") {
      toast.info("Payment was cancelled. You can try again from the review step.");
      window.history.replaceState({}, "", "/dashboard/web-setup");
    }
  }, []);

  // Form state
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [websiteDomain, setWebsiteDomain] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#3b82f6");
  const [secondaryColor, setSecondaryColor] = useState("#1e40af");
  const [logoUrl, setLogoUrl] = useState("");
  const [aiIconUrl, setAiIconUrl] = useState("");
  const [chatbotName, setChatbotName] = useState("");
  const [chatbotWelcome, setChatbotWelcome] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [keyPages, setKeyPages] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  const submitMutation = trpc.webSetup.submit.useMutation({
    onSuccess: (_, vars) => {
      // After submit, proceed to PayPal payment
      // We'll get the requestId from getMyRequest
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: (err) => {
      toast.error(err.message || "Something went wrong. Please try again.");
    },
  });

  const { data: myRequest } = trpc.webSetup.getMyRequest.useQuery(undefined, {
    enabled: submitted,
    refetchInterval: submitted && !requestId ? 1000 : false,
  });

  // Once we have the request ID, store it
  useEffect(() => {
    if (myRequest?.id && !requestId) {
      setRequestId(myRequest.id);
      if (myRequest.paidAt) setPaid(true);
    }
  }, [myRequest, requestId]);

  async function handlePayWithPayPal() {
    if (!requestId) {
      toast.error("Please wait while we save your request…");
      return;
    }
    setPaymentPending(true);
    try {
      const res = await fetch("/api/billing/create-web-setup-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ requestId }),
      });
      const data = await res.json() as { approvalUrl?: string; error?: string };
      if (!res.ok || !data.approvalUrl) {
        toast.error(data.error ?? "Failed to start payment. Please try again.");
        return;
      }
      window.location.href = data.approvalUrl;
    } catch {
      toast.error("Failed to start payment. Please try again.");
    } finally {
      setPaymentPending(false);
    }
  }

  function handleSubmit() {
    if (!businessName.trim()) {
      toast.error("Please enter your business name.");
      setStep(1);
      return;
    }
    submitMutation.mutate({
      businessName: businessName.trim(),
      businessType: businessType.trim() || undefined,
      websiteDomain: websiteDomain.trim() || undefined,
      primaryColor,
      secondaryColor,
      logoUrl: logoUrl.trim() || undefined,
      aiIconUrl: aiIconUrl.trim() || undefined,
      chatbotName: chatbotName.trim() || undefined,
      chatbotWelcome: chatbotWelcome.trim() || undefined,
      targetAudience: targetAudience.trim() || undefined,
      keyPages: keyPages.trim() || undefined,
      additionalNotes: additionalNotes.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
    });
  }

  const currentStep = STEPS[step - 1];
  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  // ── Success screen ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <DashboardShell title="Get Your Website">
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center max-w-sm mx-auto">
          {paid ? (
            <>
              <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-3">Payment confirmed! 🎉</h1>
              <p className="text-muted-foreground text-base leading-relaxed mb-2">
                We received your $199 payment. Our team will start building your site and contact you at <strong>{contactEmail || "your email"}</strong> within 24 hours.
              </p>
            </>
          ) : (
            <>
              <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-6">
                <Rocket className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-3">Almost there!</h1>
              <p className="text-muted-foreground text-base leading-relaxed mb-6">
                Your brief has been saved. Complete the $199 payment to start building your site.
              </p>
              <Button
                className="w-full h-14 text-base bg-[#0070ba] hover:bg-[#005ea6] text-white border-0 rounded-2xl"
                onClick={handlePayWithPayPal}
                disabled={paymentPending || !requestId}
              >
                {paymentPending ? (
                  <span className="flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Redirecting to PayPal…</span>
                ) : !requestId ? (
                  <span className="flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Saving your request…</span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Pay $199 with PayPal
                  </span>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-3">Secure payment via PayPal. No subscription — one-time charge.</p>
            </>
          )}
          <div className="mt-8 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 w-full text-left">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">What happens next</span>
            </div>
            <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
              <li>We review your brief (same day)</li>
              <li>We send you a confirmation + timeline</li>
              <li>We build your site (3–5 business days)</li>
              <li>You review & approve before launch</li>
            </ol>
          </div>
        </div>
      </DashboardShell>
    );
  }

  // ── Step content ────────────────────────────────────────────────────────────
  function renderStepContent() {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Business name <span className="text-red-500">*</span></label>
              <Input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="e.g. Martínez Dental Clinic" className="h-12 text-base" autoFocus />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Type of business</label>
              <Input value={businessType} onChange={e => setBusinessType(e.target.value)} placeholder="e.g. Dental clinic, E-commerce, Restaurant…" className="h-12 text-base" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5"><Globe className="w-4 h-4" /> Desired domain</label>
              <Input value={websiteDomain} onChange={e => setWebsiteDomain(e.target.value)} placeholder="e.g. martinezdental.com" className="h-12 text-base" />
              <p className="text-xs text-muted-foreground">Don't have one yet? We can help you choose one.</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5"><Mail className="w-4 h-4" /> Contact email</label>
              <Input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="you@yourbusiness.com" className="h-12 text-base" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5"><Phone className="w-4 h-4" /> Phone (optional)</label>
              <Input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+1 (555) 000-0000" className="h-12 text-base" />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <ColorField label="Primary color" value={primaryColor} onChange={setPrimaryColor} />
            <ColorField label="Secondary color" value={secondaryColor} onChange={setSecondaryColor} />
            <div className="rounded-xl overflow-hidden border border-border">
              <div className="h-10 flex items-center px-4 gap-2" style={{ background: primaryColor }}>
                <div className="w-3 h-3 rounded-full bg-white/40" />
                <div className="w-3 h-3 rounded-full bg-white/40" />
                <div className="w-3 h-3 rounded-full bg-white/40" />
              </div>
              <div className="p-4 bg-muted/30 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ background: secondaryColor }} />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 rounded-full bg-muted w-3/4" />
                  <div className="h-2 rounded-full bg-muted w-1/2" />
                </div>
              </div>
            </div>
            <FileUploadField
              label="Your logo"
              hint="PNG or SVG with transparent background works best."
              value={logoUrl}
              onChange={setLogoUrl}
            />
            <FileUploadField
              label="AI chatbot icon (optional)"
              hint="The avatar shown on the chat bubble. Leave empty to use the default Lynx AI icon."
              value={aiIconUrl}
              onChange={setAiIconUrl}
            />
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">AI assistant name</label>
              <Input value={chatbotName} onChange={e => setChatbotName(e.target.value)} placeholder="e.g. Sofia, Max, Aria…" className="h-12 text-base" />
              <p className="text-xs text-muted-foreground">This is the name visitors will see in the chat.</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Welcome message</label>
              <Textarea
                value={chatbotWelcome}
                onChange={e => setChatbotWelcome(e.target.value)}
                placeholder="e.g. Hi! I'm Sofia, your virtual assistant. How can I help you today?"
                className="text-base resize-none"
                rows={3}
                maxLength={512}
              />
              <p className="text-xs text-muted-foreground">{chatbotWelcome.length}/512 characters</p>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Target audience</label>
              <Textarea
                value={targetAudience}
                onChange={e => setTargetAudience(e.target.value)}
                placeholder="e.g. Adults 30–55 looking for dental care in Miami, FL…"
                className="text-base resize-none"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Key pages to include</label>
              <Textarea
                value={keyPages}
                onChange={e => setKeyPages(e.target.value)}
                placeholder="e.g. Home, Services, About us, Contact, Book appointment…"
                className="text-base resize-none"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Additional notes</label>
              <Textarea
                value={additionalNotes}
                onChange={e => setAdditionalNotes(e.target.value)}
                placeholder="Anything else we should know? References, special requirements, languages…"
                className="text-base resize-none"
                rows={4}
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground">{additionalNotes.length}/2000 characters</p>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            {/* Summary card */}
            <div className="rounded-2xl border border-border bg-muted/30 divide-y divide-border overflow-hidden">
              {[
                { label: "Business", value: businessName || "—" },
                { label: "Type", value: businessType || "—" },
                { label: "Domain", value: websiteDomain || "—" },
                { label: "Contact email", value: contactEmail || "—" },
                { label: "Phone", value: contactPhone || "—" },
                { label: "AI name", value: chatbotName || "—" },
                { label: "Primary color", value: primaryColor },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start gap-3 px-4 py-3">
                  <span className="text-sm text-muted-foreground w-32 flex-shrink-0">{label}</span>
                  <span className="text-sm font-medium text-foreground break-all">{value}</span>
                </div>
              ))}
            </div>

            {/* Price badge */}
            <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 p-5 text-white text-center">
              <p className="text-sm font-medium opacity-90 mb-1">One-time service fee</p>
              <p className="text-4xl font-bold tracking-tight">$199</p>
              <p className="text-sm opacity-80 mt-1">Our team will invoice you after reviewing your brief.</p>
            </div>

            <p className="text-xs text-muted-foreground text-center leading-relaxed px-2">
              By submitting you agree that we'll contact you to confirm details before charging anything. No payment is collected here.
            </p>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <DashboardShell title="Get Your Website">
      <div className="max-w-lg mx-auto px-4 pb-24 pt-2">

        {/* Hero banner */}
        <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 p-5 mb-6 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">Get your website built</h2>
              <p className="text-sm opacity-85">Professional site + AI chatbot — $199 one-time</p>
            </div>
          </div>
          <div className="flex gap-4 text-sm">
            {["3–5 day delivery", "Mobile-first design", "AI chatbot included"].map(f => (
              <span key={f} className="flex items-center gap-1 opacity-90">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />{f}
              </span>
            ))}
          </div>
        </div>

        {/* Step indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-foreground">Step {step} of {STEPS.length}</span>
            <span className="text-sm text-muted-foreground">{currentStep.label}</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          {/* Step dots */}
          <div className="flex justify-between mt-2">
            {STEPS.map(s => (
              <button
                key={s.id}
                onClick={() => s.id < step && setStep(s.id)}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 text-xs font-bold ${
                  s.id < step
                    ? "bg-blue-500 text-white cursor-pointer"
                    : s.id === step
                    ? "bg-gradient-to-br from-blue-500 to-violet-500 text-white shadow-md scale-110"
                    : "bg-muted text-muted-foreground cursor-default"
                }`}
              >
                {s.id < step ? "✓" : s.id}
              </button>
            ))}
          </div>
        </div>

        {/* Step card */}
        <div className="rounded-2xl border border-border bg-card shadow-sm p-5 mb-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              {(() => { const Icon = currentStep.icon; return <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />; })()}
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-base leading-tight">{currentStep.title}</h3>
              <p className="text-sm text-muted-foreground">{currentStep.subtitle}</p>
            </div>
          </div>
          {renderStepContent()}
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-3">
          {step > 1 && (
            <Button
              variant="outline"
              className="flex-1 h-12 text-base"
              onClick={() => setStep(s => s - 1)}
              disabled={submitMutation.isPending}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          )}
          {step < STEPS.length ? (
            <Button
              className="flex-1 h-12 text-base bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white border-0"
              onClick={() => {
                if (step === 1 && !businessName.trim()) {
                  toast.error("Please enter your business name to continue.");
                  return;
                }
                setStep(s => s + 1);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              Continue <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              className="flex-1 h-12 text-base bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white border-0"
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending ? (
                <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Submitting…</span>
              ) : (
                <span className="flex items-center gap-2"><Rocket className="w-4 h-4" /> Submit request</span>
              )}
            </Button>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
