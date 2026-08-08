import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
import { LynxLogo } from "@/components/LynxLogo";
import {
  Globe,
  Code2,
  MessageSquare,
  CheckCircle,
  ArrowRight,
  SkipForward,
  Loader2,
  Copy,
  Check,
} from "lucide-react";

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS = [
  {
    id: 1,
    icon: Globe,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    title: "Scan your website",
    subtitle: "Lynx AI learns your site's content to answer questions accurately.",
    description: "Enter your website URL and we'll analyze it automatically.",
  },
  {
    id: 2,
    icon: Code2,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    title: "Install the snippet",
    subtitle: "Add one line of code to your site to activate the chatbot.",
    description: "Copy the code and paste it just before the </body> tag on every page.",
  },
  {
    id: 3,
    icon: MessageSquare,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    title: "Test your chatbot",
    subtitle: "Send a test message to confirm everything is working.",
    description: "Your chatbot is ready. Try it out right here.",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Onboarding() {
  const [, navigate] = useLocation();
  const { theme } = useTheme();
  const [currentStep, setCurrentStep] = useState(1);
  const [siteUrl, setSiteUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanDone, setScanDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const [testMessage, setTestMessage] = useState("");
  const [testReply, setTestReply] = useState("");
  const [testing, setTesting] = useState(false);
  const [testDone, setTestDone] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { data: progress } = trpc.onboarding.get.useQuery();
  const { data: chatbotData } = trpc.chatbotConfig.get.useQuery();
  const updateMutation = trpc.onboarding.update.useMutation();
  const skipMutation = trpc.onboarding.skip.useMutation({
    onSuccess: () => navigate("/dashboard"),
  });
  const scanMutation = trpc.scanner.scan.useMutation({
    onSuccess: async () => {
      setScanDone(true);
      await updateMutation.mutateAsync({ step1Done: true });
      utils.chatbotConfig.get.invalidate();
      toast.success("Site scanned successfully!");
    },
    onError: (e) => toast.error(e.message),
  });
  const chatMutation = trpc.chatbot.chat.useMutation({
    onSuccess: (data) => {
      setTestReply(typeof data.reply === "string" ? data.reply : String(data.reply));
      setTestDone(true);
    },
    onError: () => toast.error("Error testing the chatbot"),
  });

  // Restore progress from DB
  useEffect(() => {
    if (!progress) return;
    if (progress.completedAt) { navigate("/dashboard"); return; }
    if (progress.step2Done) { setCurrentStep(3); setScanDone(true); }
    else if (progress.step1Done) { setCurrentStep(2); setScanDone(true); }
  }, [progress]);

  // Get API key from chatbot
  useEffect(() => {
    if (chatbotData?.apiKey) setApiKey(chatbotData.apiKey);
  }, [chatbotData]);

  const snippetCode = apiKey
    ? `<script src="https://lynxaiassistant.com/widget.js" data-key="${apiKey}" async></script>`
    : `<script src="https://lynxaiassistant.com/widget.js" data-key="YOUR_API_KEY" async></script>`;

  async function handleScan() {
    if (!siteUrl) return;
    setScanning(true);
    try {
      await scanMutation.mutateAsync({ url: siteUrl });
    } finally {
      setScanning(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(snippetCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSnippetDone() {
    await updateMutation.mutateAsync({ step2Done: true });
    setCurrentStep(3);
  }

  async function handleTest() {
    if (!testMessage.trim()) return;
    setTesting(true);
    try {
      await chatMutation.mutateAsync({
        message: testMessage,
        siteContext: chatbotData?.siteContext ?? undefined,
        chatbotName: chatbotData?.name ?? "Lynx AI",
      });
    } finally {
      setTesting(false);
    }
  }

  async function handleFinish() {
    await updateMutation.mutateAsync({ step3Done: true });
    toast.success("Setup complete! Welcome to Lynx AI.");
    navigate("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8">
        <LynxLogo className="h-9 object-contain" />
      </div>

      {/* Progress stepper */}
      <div className="w-full max-w-lg mb-8">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((step, i) => {
            const done = currentStep > step.id;
            const active = currentStep === step.id;
            return (
              <div key={step.id} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  done ? "bg-primary text-primary-foreground" :
                  active ? "bg-primary/20 text-primary border-2 border-primary" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {done ? <CheckCircle className="w-4 h-4" /> : step.id}
                </div>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 h-0.5 w-24 sm:w-40 bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: done ? "100%" : "0%" }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Step {currentStep} of {STEPS.length}
        </p>
      </div>

      {/* Step card */}
      <div className="w-full max-w-lg">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="bg-card border border-border/40 rounded-2xl p-8 shadow-lg"
          >
            {/* Step header */}
            {(() => {
              const step = STEPS[currentStep - 1];
              const Icon = step.icon;
              return (
                <div className="flex items-start gap-4 mb-6">
                  <div className={`w-12 h-12 rounded-xl ${step.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-6 h-6 ${step.color}`} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{step.title}</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">{step.subtitle}</p>
                  </div>
                </div>
              );
            })()}

            {/* Step 1: Scan */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{STEPS[0].description}</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://yourcompany.com"
                    value={siteUrl}
                    onChange={(e) => setSiteUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !scanning && handleScan()}
                    disabled={scanning || scanDone}
                  />
                  <Button onClick={handleScan} disabled={!siteUrl || scanning || scanDone}>
                    {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : "Scan"}
                  </Button>
                </div>
                {scanDone && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-emerald-600 text-sm bg-emerald-500/10 rounded-lg p-3"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Site scanned! Your chatbot now knows your content.
                  </motion.div>
                )}
                <Button
                  className="w-full mt-2"
                  disabled={!scanDone}
                  onClick={() => setCurrentStep(2)}
                >
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Step 2: Install snippet */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{STEPS[1].description}</p>
                <div className="relative bg-muted rounded-lg p-4 font-mono text-xs break-all">
                  {snippetCode}
                  <button
                    onClick={handleCopy}
                    className="absolute top-2 right-2 p-1.5 rounded-md hover:bg-background transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Paste this code just before the <code className="bg-muted px-1 rounded">&lt;/body&gt;</code> closing tag on every page where you want the chatbot.
                </p>
                <Button className="w-full" onClick={handleSnippetDone}>
                  I've installed it <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Step 3: Test chatbot */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{STEPS[2].description}</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ask a test question..."
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !testing && handleTest()}
                    disabled={testing}
                  />
                  <Button onClick={handleTest} disabled={!testMessage.trim() || testing}>
                    {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send"}
                  </Button>
                </div>
                {testReply && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-muted rounded-lg p-4 text-sm"
                  >
                    <p className="text-xs text-muted-foreground mb-1 font-medium">Chatbot reply:</p>
                    <p>{testReply}</p>
                  </motion.div>
                )}
                <Button
                  className="w-full mt-2"
                  disabled={!testDone}
                  onClick={handleFinish}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Done! Go to dashboard
                </Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Skip button */}
        <div className="mt-4 text-center">
          <button
            onClick={() => skipMutation.mutate()}
            disabled={skipMutation.isPending}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 mx-auto"
          >
            <SkipForward className="w-3 h-3" />
            Skip initial setup
          </button>
        </div>
      </div>
    </div>
  );
}
