import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardShell from "@/components/DashboardShell";
import UpgradeGate from "@/components/UpgradeGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Users2, Globe, Code2, Plus, ArrowRight, CheckCircle, Zap,
  Copy, RefreshCw, Trash2, Pencil, Eye, EyeOff, ExternalLink, X, FileText,
  Gauge, Loader2, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ClientFormData {
  name: string;
  siteUrl: string;
  brandName: string;
  brandColor: string;
  welcomeMessage: string;
  logoUrl?: string | null;
}

const defaultForm: ClientFormData = {
  name: "",
  siteUrl: "",
  brandName: "AI Assistant",
  brandColor: "#3b82f6",
  welcomeMessage: "Hi! How can I help you?",
  logoUrl: null,
};

// ─── Snippet modal ────────────────────────────────────────────────────────────
function SnippetModal({ client, onClose }: { client: { id: number; name: string; apiKey: string; brandColor: string | null; brandName: string | null; welcomeMessage: string | null }; onClose: () => void }) {
  const [showKey, setShowKey] = useState(false);
  const [tab, setTab] = useState<"install" | "link" | "page">("install");
  const utils = trpc.useUtils();
  const regenerate = trpc.clients.regenerateKey.useMutation({
    onSuccess: (data) => {
      utils.clients.list.invalidate();
      toast.success("API key regenerated successfully");
    },
    onError: () => toast.error("Failed to regenerate key"),
  });

  // Canonical origin from the server (falls back to the current URL, forcing www
  // on the legacy apex so snippets/links never point at the old Manus server).
  const { data: originData } = trpc.chatbotConfig.widgetOrigin.useQuery();
  const siteOrigin =
    originData?.origin ??
    (typeof window !== "undefined"
      ? window.location.origin.replace("://lynxaiassistant.com", "://www.lynxaiassistant.com")
      : "https://www.lynxaiassistant.com");

  // Modern loader snippet — brand name/colors come from the dashboard config,
  // so one line is all the client's site needs.
  const snippet = `<script src="${siteOrigin}/api/widget.js" data-api-key="${client.apiKey}" defer></script>`;
  const chatLink = `${siteOrigin}/chat/${client.apiKey}`;
  const copyChatLink = () => {
    navigator.clipboard.writeText(chatLink);
    toast.success("Chat link copied");
  };

  // Branded chat page: a standalone HTML file the client hosts on their own
  // domain (e.g. as /chat). It embeds the full-screen chat in an iframe, so
  // the visitor's address bar shows the CLIENT's domain — the masked link.
  const downloadChatPage = () => {
    const brand = (client.brandName ?? "Chat").replace(/</g, "");
    const color = client.brandColor ?? "#3b82f6";
    const html = [
      "<!DOCTYPE html>",
      '<html lang="en">',
      "<head>",
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
      `<title>${brand} — Chat</title>`,
      `<meta name="theme-color" content="${color}">`,
      "<style>",
      "html,body{margin:0;padding:0;height:100%;background:#f5f6f8;}",
      ".w{position:fixed;inset:0;}",
      "iframe{width:100%;height:100%;border:0;display:block;}",
      ".ld{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#f5f6f8;transition:opacity .3s;pointer-events:none;}",
      `.sp{width:36px;height:36px;border:3px solid rgba(0,0,0,.08);border-top-color:${color};border-radius:50%;animation:r 1s linear infinite;}`,
      "@keyframes r{to{transform:rotate(360deg)}}",
      "</style>",
      "</head>",
      "<body>",
      '<div class="w">',
      '<div class="ld" id="ld"><div class="sp"></div></div>',
      `<iframe src="${chatLink}" allow="clipboard-write" title="${brand} chat" onload="var l=document.getElementById(&quot;ld&quot;);l.style.opacity=&quot;0&quot;;setTimeout(function(){l.remove()},350)"></iframe>`,
      "</div>",
      "</body>",
      "</html>",
    ].join("\n");
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "chat.html";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Branded chat page downloaded");
  };

  const copySnippet = () => {
    navigator.clipboard.writeText(snippet);
    toast.success("Snippet copied to clipboard");
  };

  const copyKey = () => {
    navigator.clipboard.writeText(client.apiKey);
    toast.success("API key copied");
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-lg max-h-[85dvh] overflow-y-auto overflow-x-hidden p-4 sm:p-6 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm sm:text-base pr-6">
            <Code2 className="w-4 h-4 text-primary shrink-0" />
            <span className="truncate">Install snippet — {client.name}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Tabs — one purpose per tab so nothing hides under the scroll */}
        <div className="flex gap-1 rounded-xl bg-muted/40 p-1">
          {([
            { id: "install" as const, label: "Install", Icon: Code2 },
            { id: "link" as const, label: "Chat link", Icon: ExternalLink },
            { id: "page" as const, label: "Branded page", Icon: FileText },
          ]).map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-medium transition-colors ${
                tab === id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>

        {tab === "install" && (
          <div className="space-y-4">
            {/* API Key */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">API Key</Label>
              <div className="font-mono text-xs bg-muted/50 rounded-lg px-3 py-2 border border-border/40 truncate max-w-full">
                {showKey ? client.apiKey : "lx_" + "\u2022".repeat(24)}
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => setShowKey(v => !v)}>
                  {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showKey ? "Hide" : "Show"}
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={copyKey}>
                  <Copy className="w-3.5 h-3.5" />Copy key
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5 text-amber-500 hover:text-amber-400"
                  onClick={() => {
                    if (confirm("Regenerate API key? The old key will stop working immediately.")) {
                      regenerate.mutate({ id: client.id });
                    }
                  }}
                  disabled={regenerate.isPending}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${regenerate.isPending ? "animate-spin" : ""}`} />
                  Regenerate
                </Button>
              </div>
            </div>

            <Separator />

            {/* Snippet */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Paste before &lt;/body&gt; on every page</Label>
              <pre className="text-xs bg-muted/50 rounded-lg p-3 border border-border/40 whitespace-pre-wrap break-all [overflow-wrap:anywhere] w-full max-w-full leading-relaxed max-h-40 overflow-y-auto">
                {snippet}
              </pre>
              <Button size="sm" className="h-8 text-xs gap-1.5 w-full sm:w-auto mt-2" onClick={copySnippet}>
                <Copy className="w-3 h-3" />Copy snippet
              </Button>
            </div>
          </div>
        )}

        {tab === "link" && (
          <div className="space-y-2">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Direct link to this client's chat in full screen — great for support links, social bios or a "Talk to us" button.
            </p>
            <div className="flex items-center gap-2 w-full max-w-full overflow-hidden">
              <div className="flex-1 min-w-0 font-mono text-[11px] bg-muted/50 rounded-lg px-3 py-2 border border-border/40 truncate" title={chatLink}>
                {chatLink}
              </div>
              <Button size="icon" variant="outline" className="w-9 h-9 shrink-0" onClick={copyChatLink} title="Copy link">
                <Copy className="w-3.5 h-3.5" />
              </Button>
              <Button size="icon" variant="outline" className="w-9 h-9 shrink-0" onClick={() => window.open(chatLink, "_blank")} title="Open">
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}

        {tab === "page" && (
          <div className="space-y-2">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Download a ready-made HTML page with the chat embedded. Upload it to the client's
              own website (e.g. as <span className="font-mono">/chat</span>) — visitors will see the
              client's domain in the address bar, with their brand name and colors. No mention of Lynx.
            </p>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 w-full sm:w-auto" onClick={downloadChatPage}>
              <FileText className="w-3 h-3" />Download chat page (HTML)
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add / Edit modal ─────────────────────────────────────────────────────────
function ClientFormModal({
  initial,
  onClose,
  onSave,
  isPending,
}: {
  initial?: ClientFormData & { id?: number };
  onClose: () => void;
  onSave: (data: ClientFormData) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState<ClientFormData>(initial ?? defaultForm);
  const isEdit = !!initial?.id;
  const [uploadingLogo, setUploadingLogo] = useState(false);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error("Upload failed");
      const data = (await res.json()) as { url: string };
      setForm((f) => ({ ...f, logoUrl: data.url }));
      toast.success("Logo uploaded");
    } catch {
      toast.error("Logo upload failed");
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  }

  const set = (key: keyof ClientFormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.siteUrl.trim()) return;
    onSave(form);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md max-h-[85dvh] overflow-y-auto overflow-x-hidden p-4 sm:p-6 rounded-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Client" : "Add New Client"}</DialogTitle>
        </DialogHeader>
        {!isEdit && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-500 leading-relaxed">
              When you add a website as a client, <span className="font-semibold">it cannot be removed for 72 hours</span> from the moment it is added.
            </p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <div>
              <Label htmlFor="name" className="text-xs">Client name *</Label>
              <Input id="name" value={form.name} onChange={set("name")} placeholder="Acme Corp" className="mt-1" required />
            </div>
            <div>
              <Label htmlFor="siteUrl" className="text-xs">Website URL *</Label>
              <Input id="siteUrl" value={form.siteUrl} onChange={set("siteUrl")} placeholder="https://acme.com" type="url" className="mt-1" required />
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Chatbot Branding</p>
            <div>
              <Label htmlFor="brandName" className="text-xs">Chatbot name</Label>
              <Input id="brandName" value={form.brandName} onChange={set("brandName")} placeholder="AI Assistant" className="mt-1" />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Label className="text-xs">Chat logo</Label>
                <div className="flex items-center gap-3 flex-wrap mt-1 mb-3">
                  <div className="w-12 h-12 rounded-full border border-border/40 bg-muted/30 overflow-hidden flex items-center justify-center shrink-0">
                    {form.logoUrl ? (
                      <img src={form.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Users2 className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border/40 bg-muted/30 text-xs hover:border-primary/40 transition-colors">
                      {uploadingLogo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      {uploadingLogo ? "Uploading..." : form.logoUrl ? "Change logo" : "Upload logo"}
                    </span>
                  </label>
                  {form.logoUrl && (
                    <button type="button" className="text-xs text-muted-foreground hover:text-destructive" onClick={() => setForm((f) => ({ ...f, logoUrl: null }))}>
                      Remove
                    </button>
                  )}
                  <p className="basis-full text-[11px] text-muted-foreground">Shown in the chat header and on the floating button of this client's widget.</p>
                </div>
                <Label htmlFor="brandColor" className="text-xs">Brand color</Label>
                <Input id="brandColor" value={form.brandColor} onChange={set("brandColor")} placeholder="#3b82f6" className="mt-1 font-mono text-xs" />
              </div>
              <div className="mt-5">
                <input
                  type="color"
                  value={form.brandColor}
                  onChange={e => setForm(f => ({ ...f, brandColor: e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-border/40 cursor-pointer bg-transparent"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="welcomeMessage" className="text-xs">Welcome message</Label>
              <Input id="welcomeMessage" value={form.welcomeMessage} onChange={set("welcomeMessage")} placeholder="Hi! How can I help you?" className="mt-1" />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="lynx-gradient text-white border-0" disabled={isPending}>
              {isPending ? "Saving..." : isEdit ? "Save changes" : "Add client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main content ─────────────────────────────────────────────────────────────
function ClientsContent() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editClient, setEditClient] = useState<(ClientFormData & { id: number }) | null>(null);
  const [snippetClient, setSnippetClient] = useState<{ id: number; name: string; apiKey: string; brandColor: string | null; brandName: string | null; welcomeMessage: string | null } | null>(null);
  const [, navigate] = useLocation();

  const utils = trpc.useUtils();
  const { data: clientList = [], isLoading } = trpc.clients.list.useQuery();

  const createMutation = trpc.clients.create.useMutation({
    onSuccess: () => {
      utils.clients.list.invalidate();
      setShowAddModal(false);
      toast.success("Client added successfully! API key generated.");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.clients.update.useMutation({
    onSuccess: () => {
      utils.clients.list.invalidate();
      setEditClient(null);
      toast.success("Client updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.clients.delete.useMutation({
    onSuccess: () => {
      utils.clients.list.invalidate();
      toast.success("Client removed");
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Per-client SEO analysis state ──
  // Runs the same real engine (Lighthouse via PageSpeed + measured checks)
  // used by the client report, on demand from the list.
  type SeoRun =
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "done"; score: number; source: "lighthouse" | "estimated"; categories: Array<{ key: string; label: string; score: number; weight: number }> };
  const [seoRuns, setSeoRuns] = useState<Record<number, SeoRun>>({});
  // Mobile: tapping a client card expands its action buttons (with labels)
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const runSeoAnalysis = async (clientId: number) => {
    setSeoRuns((s) => ({ ...s, [clientId]: { status: "loading" } }));
    try {
      await utils.clients.seoAnalyze.invalidate({ clientId });
      const res = await utils.clients.seoAnalyze.fetch({ clientId });
      if (!res.breakdown) {
        setSeoRuns((s) => ({ ...s, [clientId]: { status: "error", message: res.error ?? "Could not analyze the site" } }));
        return;
      }
      setSeoRuns((s) => ({
        ...s,
        [clientId]: {
          status: "done",
          score: res.breakdown!.score,
          source: (res.breakdown as { source?: "lighthouse" | "estimated" }).source ?? "estimated",
          categories: res.breakdown!.categories,
        },
      }));
    } catch (e) {
      setSeoRuns((s) => ({ ...s, [clientId]: { status: "error", message: e instanceof Error ? e.message : "Analysis failed" } }));
    }
  };

  const maxSlots = 15;

  return (
    <DashboardShell title="My Clients">
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-xs">
                <Zap className="w-3 h-3 mr-1" />White-Label
              </Badge>
            </div>
            <h2 className="text-xl font-bold">Client Websites</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Manage up to {maxSlots} client websites. Need more? Add expansion packs from Billing.
            </p>
          </div>
          <Button
            className="lynx-gradient text-white border-0 shrink-0"
            onClick={() => setShowAddModal(true)}
            disabled={clientList.length >= maxSlots}
          >
            <Plus className="w-4 h-4 mr-2" />Add Client
          </Button>
        </motion.div>

        {/* Stats row */}
        <div className="flex sm:grid sm:grid-cols-3 gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
          {[
            { label: "Active clients", value: `${clientList.length} / ${maxSlots}`, icon: Users2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Total chatbots", value: String(clientList.length), icon: Globe, color: "text-blue-400", bg: "bg-blue-500/10" },
            { label: "API keys issued", value: String(clientList.length), icon: Code2, color: "text-violet-400", bg: "bg-violet-500/10" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="min-w-[220px] shrink-0 sm:min-w-0 sm:shrink snap-start"
            >
              <Card className="glass-card border-border/40">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div>
                    <div className="text-xl font-bold">{stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Client list or empty state */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <Card key={i} className="glass-card border-border/40">
                <CardContent className="p-4">
                  <div className="h-14 bg-muted/30 rounded-lg animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : clientList.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="glass-card border-border/40">
              <CardContent className="py-16 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-5">
                  <Users2 className="w-7 h-7 text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No clients yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm mb-6">
                  Add your first client website. Your chatbot will be installed there — each site gets its own API key and you can generate a PDF report with their metrics at any time.
                </p>
                <div className="w-full max-w-md text-left space-y-3 mb-8">
                  {[
                    "Add the client's website URL and name",
                    "A unique API key is generated automatically",
                    "Give the client their install snippet — done in 2 minutes",
                    "Generate PDF reports with their analytics anytime",
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle className="w-3 h-3 text-emerald-400" />
                      </div>
                      <span className="text-sm text-muted-foreground">{step}</span>
                    </div>
                  ))}
                </div>
                <Button className="lynx-gradient text-white border-0" onClick={() => setShowAddModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />Add First Client
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {clientList.map((client, i) => (
                <motion.div
                  key={client.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.06, duration: 0.3 }}
                >
                  <Card
                    className="glass-card border-border/40 hover:border-border/70 transition-colors sm:cursor-default cursor-pointer active:scale-[0.995]"
                    onClick={() => setExpandedId((cur) => (cur === client.id ? null : client.id))}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Color dot */}
                        <div
                          className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-white font-bold text-sm"
                          style={{ backgroundColor: client.brandColor ?? "#3b82f6" }}
                        >
                          {client.name[0]?.toUpperCase()}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm truncate">{client.name}</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-emerald-500/30 text-emerald-400">
                              Active
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Globe className="w-3 h-3 text-muted-foreground shrink-0" />
                            <a
                              href={client.siteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-muted-foreground hover:text-foreground truncate transition-colors"
                            >
                              {client.siteUrl}
                            </a>
                            <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Bot: <span className="text-foreground/70">{client.brandName}</span>
                            {" · "}
                            <span className="font-mono">lx_••••••••</span>
                          </p>
                        </div>

                        {/* Actions (desktop; on mobile they appear when tapping the card) */}
                        <div className="hidden sm:flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs gap-1.5 text-amber-400 hover:text-amber-300"
                            onClick={() => runSeoAnalysis(client.id)}
                            disabled={seoRuns[client.id]?.status === "loading"}
                            title="Run SEO analysis for this site"
                          >
                            {seoRuns[client.id]?.status === "loading"
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Gauge className="w-3.5 h-3.5" />}
                            <span className="hidden sm:inline">SEO</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs gap-1.5 text-emerald-400 hover:text-emerald-300"
                            onClick={() => navigate(`/dashboard/clients/${client.id}/report`)}
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Report</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs gap-1.5 text-primary hover:text-primary"
                            onClick={() => setSnippetClient(client)}
                          >
                            <Code2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Snippet</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8"
                            onClick={() => setEditClient({
                              id: client.id,
                              name: client.name,
                              siteUrl: client.siteUrl,
                              brandName: client.brandName ?? "AI Assistant",
                              brandColor: client.brandColor ?? "#3b82f6",
                              welcomeMessage: client.welcomeMessage ?? "Hi! How can I help you?",
                              logoUrl: (client as { logoUrl?: string | null }).logoUrl ?? null,
                            })}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm(`Remove ${client.name}? This cannot be undone.`)) {
                                deleteMutation.mutate({ id: client.id });
                              }
                            }}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Mobile action panel — appears when the card is tapped */}
                      {expandedId === client.id && (
                        <div className="sm:hidden mt-3 grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 text-amber-400"
                            onClick={() => runSeoAnalysis(client.id)}
                            disabled={seoRuns[client.id]?.status === "loading"}>
                            {seoRuns[client.id]?.status === "loading" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Gauge className="w-3.5 h-3.5" />}
                            SEO analysis
                          </Button>
                          <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 text-emerald-400"
                            onClick={() => navigate(`/dashboard/clients/${client.id}/report`)}>
                            <FileText className="w-3.5 h-3.5" />Report
                          </Button>
                          <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 text-primary"
                            onClick={() => setSnippetClient(client)}>
                            <Code2 className="w-3.5 h-3.5" />Snippet
                          </Button>
                          <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5"
                            onClick={() => setEditClient({
                              id: client.id,
                              name: client.name,
                              siteUrl: client.siteUrl,
                              brandName: client.brandName ?? "AI Assistant",
                              brandColor: client.brandColor ?? "#3b82f6",
                              welcomeMessage: client.welcomeMessage ?? "Hi! How can I help you?",
                              logoUrl: (client as { logoUrl?: string | null }).logoUrl ?? null,
                            })}>
                            <Pencil className="w-3.5 h-3.5" />Edit
                          </Button>
                          <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 text-destructive col-span-2"
                            onClick={() => {
                              if (confirm(`Remove ${client.name}? This cannot be undone.`)) {
                                deleteMutation.mutate({ id: client.id });
                              }
                            }}
                            disabled={deleteMutation.isPending}>
                            <Trash2 className="w-3.5 h-3.5" />Delete client
                          </Button>
                        </div>
                      )}

                      {/* SEO analysis panel — loading / result / error */}
                      {seoRuns[client.id] && (
                        <div className="mt-3 rounded-xl border border-border/40 bg-muted/20 p-3" onClick={(e) => e.stopPropagation()}>
                          {seoRuns[client.id].status === "loading" && (
                            <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                              <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
                              <span>Analyzing SEO of <span className="font-medium text-foreground/80">{client.siteUrl}</span>… (Lighthouse takes 20-40 s)</span>
                            </div>
                          )}
                          {seoRuns[client.id].status === "error" && (
                            <div className="flex items-center gap-2.5 text-xs flex-wrap">
                              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                              <span className="text-red-400">{(seoRuns[client.id] as { message: string }).message}</span>
                              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 ml-auto" onClick={() => runSeoAnalysis(client.id)}>
                                <RefreshCw className="w-3 h-3" />Retry
                              </Button>
                            </div>
                          )}
                          {seoRuns[client.id].status === "done" && (() => {
                            const run = seoRuns[client.id] as Extract<SeoRun, { status: "done" }>;
                            const scoreColor = run.score >= 80 ? "text-emerald-400 border-emerald-400" : run.score >= 60 ? "text-amber-400 border-amber-400" : "text-red-400 border-red-400";
                            return (
                              <div className="space-y-2.5">
                                <div className="flex items-center gap-3 flex-wrap">
                                  <div className={`w-11 h-11 rounded-full border-2 flex items-center justify-center shrink-0 ${scoreColor}`}>
                                    <span className="text-sm font-bold">{run.score}</span>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-xs font-semibold">SEO score</div>
                                    <div className="text-[10px] text-muted-foreground">
                                      {run.source === "lighthouse" ? "Measured with Google Lighthouse" : "Estimated (Lighthouse unavailable)"}
                                    </div>
                                  </div>
                                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 shrink-0" onClick={() => runSeoAnalysis(client.id)} title="Run the analysis again">
                                    <RefreshCw className="w-3 h-3" />Re-analyze
                                  </Button>
                                </div>
                                <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                                  {run.categories.map((cat) => {
                                    const g = cat.score >= 90 ? "A" : cat.score >= 80 ? "B" : cat.score >= 70 ? "C" : cat.score >= 60 ? "D" : "F";
                                    const c = cat.score >= 80 ? "text-emerald-400" : cat.score >= 60 ? "text-amber-400" : "text-red-400";
                                    return (
                                      <div key={cat.key} className="rounded-lg border border-border/40 bg-muted/30 px-2 py-1 text-center shrink-0">
                                        <span className={`text-xs font-bold ${c}`}>{g}</span>
                                        <span className="text-[9px] text-muted-foreground ml-1">{cat.label}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* White-label guide */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <Card className="glass-card border-emerald-500/20 bg-emerald-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                <Zap className="w-4 h-4" />White-Label Guide
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                As a White-Label subscriber, you configure one chatbot with your brand and install it on your clients' websites. Each site gets its own API key. Use the Report button to generate a professional PDF with analytics and leads for any client.
              </p>
              <Link href="/dashboard/billing">
                <Button variant="ghost" size="sm" className="text-emerald-400 hover:text-emerald-300 px-0 mt-1">
                  View your plan details <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <ClientFormModal
          onClose={() => setShowAddModal(false)}
          onSave={(data) => createMutation.mutate(data)}
          isPending={createMutation.isPending}
        />
      )}
      {editClient && (
        <ClientFormModal
          initial={editClient}
          onClose={() => setEditClient(null)}
          onSave={(data) => updateMutation.mutate({ id: editClient.id, ...data })}
          isPending={updateMutation.isPending}
        />
      )}
      {snippetClient && (
        <SnippetModal client={snippetClient} onClose={() => setSnippetClient(null)} />
      )}
    </DashboardShell>
  );
}

export default function Clients() {
  return (
    <UpgradeGate
      feature="whitelabelClients"
      requiredPlan="whitelabel"
      title="My Clients"
      description="Manage up to 15 client websites (base plan), each with their own chatbot, API key, and custom branding. Expand with client packs from Billing. Exclusive to the White-Label plan."
    >
      <ClientsContent />
    </UpgradeGate>
  );
}
