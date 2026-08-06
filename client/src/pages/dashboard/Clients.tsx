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
  Copy, RefreshCw, Trash2, Pencil, Eye, EyeOff, ExternalLink, X, FileText
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
}

const defaultForm: ClientFormData = {
  name: "",
  siteUrl: "",
  brandName: "AI Assistant",
  brandColor: "#3b82f6",
  welcomeMessage: "Hi! How can I help you?",
};

// ─── Snippet modal ────────────────────────────────────────────────────────────
function SnippetModal({ client, onClose }: { client: { id: number; name: string; apiKey: string; brandColor: string | null; brandName: string | null; welcomeMessage: string | null }; onClose: () => void }) {
  const [showKey, setShowKey] = useState(false);
  const utils = trpc.useUtils();
  const regenerate = trpc.clients.regenerateKey.useMutation({
    onSuccess: (data) => {
      utils.clients.list.invalidate();
      toast.success("API key regenerated successfully");
    },
    onError: () => toast.error("Failed to regenerate key"),
  });

  const snippet = `<script>
  window.LynxAIConfig = {
    apiKey: "${client.apiKey}",
    brandName: "${client.brandName ?? "AI Assistant"}",
    brandColor: "${client.brandColor ?? "#3b82f6"}",
    welcomeMessage: "${client.welcomeMessage ?? "Hi! How can I help you?"}"
  };
</script>
<script src="https://lynxaiassistant.com/widget.js" async></script>`;

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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-primary" />
            Install snippet — {client.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* API Key */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">API Key</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 font-mono text-xs bg-muted/50 rounded-lg px-3 py-2 border border-border/40 truncate">
                {showKey ? client.apiKey : "lx_" + "•".repeat(40)}
              </div>
              <Button variant="ghost" size="icon" className="w-8 h-8 shrink-0" onClick={() => setShowKey(v => !v)}>
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </Button>
              <Button variant="ghost" size="icon" className="w-8 h-8 shrink-0" onClick={copyKey}>
                <Copy className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 shrink-0 text-amber-500 hover:text-amber-400"
                onClick={() => {
                  if (confirm("Regenerate API key? The old key will stop working immediately.")) {
                    regenerate.mutate({ id: client.id });
                  }
                }}
                disabled={regenerate.isPending}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${regenerate.isPending ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Snippet */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Paste before &lt;/body&gt; on every page</Label>
            <div className="relative">
              <pre className="text-xs bg-muted/50 rounded-lg p-3 border border-border/40 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                {snippet}
              </pre>
              <Button
                size="sm"
                className="absolute top-2 right-2 h-7 text-xs gap-1.5"
                onClick={copySnippet}
              >
                <Copy className="w-3 h-3" />Copy
              </Button>
            </div>
          </div>
        </div>

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

  const set = (key: keyof ClientFormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.siteUrl.trim()) return;
    onSave(form);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Client" : "Add New Client"}</DialogTitle>
        </DialogHeader>
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  <Card className="glass-card border-border/40 hover:border-border/70 transition-colors">
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

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
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
