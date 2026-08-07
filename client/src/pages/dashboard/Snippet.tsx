import { useState } from "react";
import { motion } from "framer-motion";
import DashboardShell from "@/components/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Code2, Copy, CheckCircle, Globe, Zap, BookOpen, Terminal, RefreshCw, ExternalLink, Info, BarChart3, AlertTriangle } from "lucide-react";

const steps = [
  { step: "01", title: "Copy the code", desc: "Select your preferred installation method and copy the snippet." },
  { step: "02", title: "Paste it in your site", desc: "Insert the code before the closing </body> tag in your HTML." },
  { step: "03", title: "Verify installation", desc: "Visit your site — the Lynx AI widget should appear automatically." },
];

type Tab = "html" | "react" | "wordpress";

function buildSnippets(apiKey: string, siteOrigin: string) {
  const widgetSrc = `${siteOrigin}/api/widget.js`;

  const html = `<!-- Lynx AI Chat Widget -->
<script
  src="${widgetSrc}"
  data-api-key="${apiKey}"
  async
></script>
<!-- End Lynx AI Widget -->`;

  const react = `// Install: no npm package needed — just load the script once.
// In your index.html (or _document.tsx for Next.js):

<script
  src="${widgetSrc}"
  data-api-key="${apiKey}"
  async
></script>

// Or load it programmatically in a useEffect:
useEffect(() => {
  const s = document.createElement('script');
  s.src = '${widgetSrc}';
  s.setAttribute('data-api-key', '${apiKey}');
  s.async = true;
  document.body.appendChild(s);
}, []);`;

  const wordpress = `<?php
// Add this to your theme's functions.php file:
function lynxai_widget() {
  echo '<script src="${widgetSrc}" data-api-key="${apiKey}" async></script>';
}
add_action('wp_footer', 'lynxai_widget');
?>

// Or paste this in Appearance > Theme Editor > footer.php
// just before </body>:
<script
  src="${widgetSrc}"
  data-api-key="${apiKey}"
  async
></script>`;

  return { html, react, wordpress };
}

export default function Snippet() {
  const [copied, setCopied] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("html");

  const { data: chatbot, isLoading } = trpc.chatbotConfig.get.useQuery();
  const { data: usage, isLoading: usageLoading } = trpc.chatbotConfig.usage.useQuery();
  const { data: originData } = trpc.chatbotConfig.widgetOrigin.useQuery();

  // Use the real apiKey from the database
  const apiKey = chatbot?.apiKey ?? null;
  const chatbotName = chatbot?.name ?? "Lynx AI";

  // Determine the current site origin for the widget URL
  // Prefer the server-configured canonical origin; fall back to the current URL
  const siteOrigin = originData?.origin ?? window.location.origin;
  const snippets = buildSnippets(apiKey ?? "YOUR_API_KEY", siteOrigin);

  const codeMap: Record<Tab, string> = {
    html: snippets.html,
    react: snippets.react,
    wordpress: snippets.wordpress,
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(codeMap[activeTab]);
    setCopied(true);
    toast.success("Code copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyKey = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    toast.success("API key copied");
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <DashboardShell title="Installation snippet">
      <div className="max-w-6xl">
        {/* API Key — full width */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Card className="glass-card border-border/40">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl lynx-gradient flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Your API key</div>
                  <div className="text-xs text-muted-foreground">Unique identifier for your Lynx AI chatbot</div>
                </div>
              </div>
              {isLoading ? (
                <Skeleton className="h-10 w-full rounded-xl" />
              ) : !chatbot ? (
                <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3">
                  <RefreshCw className="w-4 h-4 text-yellow-400 shrink-0" />
                  <p className="text-xs text-yellow-400">
                    Configure your chatbot first to generate your API key. Go to <strong>Chatbot Config</strong> to get started.
                  </p>
                </div>
              ) : !apiKey ? (
                <div className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3">
                  <Info className="w-4 h-4 text-blue-400 shrink-0" />
                  <p className="text-xs text-blue-400">
                    Generating your API key... Please refresh the page in a moment.
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-muted/30 rounded-xl px-4 py-3 border border-border/40">
                  <code className="text-xs font-mono text-primary flex-1 truncate">{apiKey}</code>
                  <button onClick={handleCopyKey} className="text-muted-foreground hover:text-foreground transition-colors ml-2 shrink-0">
                    {copiedKey ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Steps */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {steps.map((s, i) => (
            <Card key={i} className="glass-card border-border/40">
              <CardContent className="p-4">
                <div className="text-2xl font-bold lynx-text-gradient mb-2">{s.step}</div>
                <div className="font-semibold text-sm mb-1">{s.title}</div>
                <div className="text-xs text-muted-foreground leading-relaxed">{s.desc}</div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Two-column: code (left) + usage/verify (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Code snippet */}
        <motion.div className="lg:col-span-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
          <Card className="glass-card border-border/40">
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-primary" />Installation code
                </CardTitle>
                <Button size="sm" onClick={handleCopy} disabled={!chatbot || !apiKey}
                  className={`h-8 text-xs transition-all ${copied ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "lynx-gradient text-white border-0"}`}>
                  {copied ? <><CheckCircle className="w-3.5 h-3.5 mr-1.5" />Copied!</> : <><Copy className="w-3.5 h-3.5 mr-1.5" />Copy</>}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {/* Tabs */}
              <div className="flex gap-1 mb-4 bg-muted/30 p-1 rounded-xl w-fit">
                {[
                  { id: "html" as Tab, label: "HTML", icon: Globe },
                  { id: "react" as Tab, label: "React / Next.js", icon: Terminal },
                  { id: "wordpress" as Tab, label: "WordPress", icon: BookOpen },
                ].map((tab) => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === tab.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                    <tab.icon className="w-3 h-3" />{tab.label}
                  </button>
                ))}
              </div>
              {/* Code block */}
              <div className="relative bg-muted/20 rounded-xl border border-border/40 overflow-hidden">
                <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border/30 bg-muted/20">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/60" />
                  <span className="text-xs text-muted-foreground ml-2 font-mono">
                    {activeTab === "html" ? "index.html" : activeTab === "react" ? "App.tsx" : "functions.php"}
                  </span>
                </div>
                <pre className="p-4 text-xs font-mono text-muted-foreground overflow-x-auto leading-relaxed whitespace-pre-wrap">
                  <code>{isLoading ? "Loading your API key..." : codeMap[activeTab]}</code>
                </pre>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Right column: preview + usage + verify */}
        <div className="space-y-6">
        {/* Widget preview */}
        {apiKey && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.5 }}>
            <Card className="glass-card border-border/40">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <ExternalLink className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="font-semibold text-sm">Live preview</div>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  The Lynx AI widget is already installed on this page as a demo. Look for the chat button in the bottom-right corner of this screen.
                </p>
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <p className="text-xs text-emerald-400">
                    Your widget is active and responding with <strong>Claude</strong>. It uses your training and last site scan to answer visitor questions.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Monthly usage */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, duration: 0.5 }}>
          <Card className="glass-card border-border/40">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Monthly usage</div>
                  <div className="text-xs text-muted-foreground">
                    {usage ? `${usage.plan.charAt(0).toUpperCase() + usage.plan.slice(1)} plan — resets each calendar month` : "Loading..."}
                  </div>
                </div>
              </div>
              {usageLoading ? (
                <Skeleton className="h-8 w-full rounded-xl" />
              ) : usage ? (
                <>
                  <div className="flex items-end justify-between mb-2">
                    <span className="text-2xl font-bold tabular-nums">
                      {usage.used.toLocaleString()}
                      <span className="text-sm font-normal text-muted-foreground ml-1">/ {usage.limit.toLocaleString()} messages</span>
                    </span>
                    <span className={`text-xs font-medium ${
                      usage.used / usage.limit >= 0.9 ? "text-red-400" :
                      usage.used / usage.limit >= 0.7 ? "text-yellow-400" : "text-emerald-400"
                    }`}>
                      {Math.round((usage.used / usage.limit) * 100)}% used
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted/40 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        usage.used / usage.limit >= 0.9 ? "bg-red-500" :
                        usage.used / usage.limit >= 0.7 ? "bg-yellow-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(100, Math.round((usage.used / usage.limit) * 100))}%` }}
                    />
                  </div>
                  {usage.used / usage.limit >= 0.8 && (
                    <div className="flex items-center gap-2 mt-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                      <p className="text-xs text-yellow-400">
                        You're approaching your monthly limit. Consider upgrading your plan.
                      </p>
                    </div>
                  )}
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    {[
                      { plan: "Cloud", limit: "500 msg/mo", color: "text-blue-400" },
                      { plan: "Embedded", limit: "2,000 msg/mo", color: "text-violet-400" },
                      { plan: "White-Label", limit: "8K own · 6K/client", color: "text-emerald-400" },
                    ].map((p) => (
                      <div key={p.plan} className={`rounded-lg bg-muted/20 border border-border/30 px-2 py-2 ${
                        usage.plan.toLowerCase() === p.plan.toLowerCase().replace("-", "").replace(" ", "") ||
                        (usage.plan === "whitelabel" && p.plan === "White-Label") ||
                        (usage.plan === "cloud" && p.plan === "Cloud") ||
                        (usage.plan === "embedded" && p.plan === "Embedded")
                          ? "ring-1 ring-primary/40" : ""
                      }`}>
                        <div className={`text-xs font-semibold ${p.color}`}>{p.plan}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{p.limit}</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>
        </motion.div>

        {/* Verification */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}>
          <Card className="glass-card border-border/40">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="font-semibold text-sm">Verify installation</div>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Once the widget is installed, visit your website. If the chatbot appears in the corner of the screen, the installation was successful. The widget automatically loads your chatbot's name, colors, and welcome message from your configuration.
              </p>
              <Button variant="outline" size="sm" className="border-border/40 text-xs"
                onClick={() => toast.info("Open your site in a new tab and look for the Lynx AI widget in the bottom corner.")}>
                <Globe className="w-3.5 h-3.5 mr-1.5" />How to verify
              </Button>
            </CardContent>
          </Card>
        </motion.div>
        </div>
        </div>
      </div>
    </DashboardShell>
  );
}
