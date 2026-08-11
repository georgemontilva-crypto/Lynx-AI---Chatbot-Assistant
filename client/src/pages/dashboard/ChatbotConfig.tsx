import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import DashboardShell from "@/components/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { Bot, Palette, MessageSquare, Settings2, Save, Eye, AlignLeft, AlignRight, Loader2, Upload, X, ImageIcon, Crown } from "lucide-react";

const DEFAULT_CONFIG = {
  name: "Lynx AI",
  welcomeMessage: "Hi! How can I help you today?",
  placeholder: "Ask me anything...",
  disclaimer: "",
  poweredByText: null as string | null,
  poweredByUrl: "",
  primaryColor: "#3b82f6",
  secondaryColor: "#1e40af",
  position: "bottom-right" as "bottom-right" | "bottom-left",
  autoOpen: false,
  autoOpenDelay: 5,
  language: "en",
  isActive: true,
  avatarUrl: null as string | null,
  buttonIconUrl: null as string | null,
  buttonColor: "#111827",
};

export default function ChatbotConfig() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [isDirty, setIsDirty] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingButton, setUploadingButton] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { customBranding } = usePlanFeatures();

  // Load existing config from DB
  const { data: existing, isLoading } = trpc.chatbotConfig.get.useQuery();
  const utils = trpc.useUtils();

  const saveMutation = trpc.chatbotConfig.save.useMutation({
    onSuccess: () => {
      toast.success("Configuration saved successfully");
      setIsDirty(false);
      utils.chatbotConfig.get.invalidate();
    },
    onError: (err) => {
      toast.error(`Failed to save: ${err.message}`);
    },
  });

  // Populate form when data loads
  useEffect(() => {
    if (existing) {
      setConfig({
        name: existing.name ?? DEFAULT_CONFIG.name,
        welcomeMessage: existing.welcomeMessage ?? DEFAULT_CONFIG.welcomeMessage,
        placeholder: existing.placeholder ?? DEFAULT_CONFIG.placeholder,
        disclaimer: existing.disclaimer ?? "",
        poweredByText: (existing as { poweredByText?: string | null }).poweredByText ?? null,
        poweredByUrl: (existing as { poweredByUrl?: string | null }).poweredByUrl ?? "",
        primaryColor: existing.primaryColor ?? DEFAULT_CONFIG.primaryColor,
        secondaryColor: existing.secondaryColor ?? DEFAULT_CONFIG.secondaryColor,
        position: (existing.position as "bottom-right" | "bottom-left") ?? DEFAULT_CONFIG.position,
        autoOpen: existing.autoOpen ?? DEFAULT_CONFIG.autoOpen,
        autoOpenDelay: existing.autoOpenDelay ?? DEFAULT_CONFIG.autoOpenDelay,
        language: existing.language ?? DEFAULT_CONFIG.language,
        isActive: existing.isActive ?? DEFAULT_CONFIG.isActive,
        avatarUrl: existing.avatarUrl ?? null,
        buttonIconUrl: (existing as { buttonIconUrl?: string | null }).buttonIconUrl ?? null,
        buttonColor: (existing as { buttonColor?: string | null }).buttonColor ?? DEFAULT_CONFIG.buttonColor,
      });
    }
  }, [existing]);

  const update = <K extends keyof typeof config>(key: K, value: (typeof config)[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleSave = () => {
    saveMutation.mutate({
      name: config.name,
      welcomeMessage: config.welcomeMessage,
      placeholder: config.placeholder,
      disclaimer: config.disclaimer || null,
      // null = keep the default Lynx badge; "" = hide it; text = custom.
      poweredByText: config.poweredByText,
      poweredByUrl: config.poweredByUrl || null,
      primaryColor: config.primaryColor,
      secondaryColor: config.secondaryColor,
      position: config.position,
      autoOpen: config.autoOpen,
      autoOpenDelay: config.autoOpenDelay,
      language: config.language,
      isActive: config.isActive,
      avatarUrl: config.avatarUrl,
      buttonIconUrl: config.buttonIconUrl,
      buttonColor: config.buttonColor,
    });
  };

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json() as { url: string };
      update("avatarUrl", data.url);
      toast.success("Icon uploaded successfully");
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleButtonIconUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingButton(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json() as { url: string };
      update("buttonIconUrl", data.url);
      toast.success("Button icon uploaded");
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploadingButton(false);
      e.currentTarget.value = "";
    }
  }

  if (isLoading) {
    return (
      <DashboardShell title="Chatbot Configuration">
        <div className="space-y-5 max-w-4xl">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Chatbot Configuration">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Config panels */}
        <div className="xl:col-span-2 space-y-5">
          {/* Identity */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Card className="glass-card border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary" />Chatbot identity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Chatbot name</Label>
                    <Input value={config.name} onChange={(e) => update("name", e.target.value)} className="bg-muted/30 border-border/40 text-sm" placeholder="Lynx AI" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Default language</Label>
                    <Select value={config.language} onValueChange={(v) => update("language", v)}>
                      <SelectTrigger className="bg-muted/30 border-border/40 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="pt">Português</SelectItem>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="de">Deutsch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Welcome message</Label>
                  <Textarea value={config.welcomeMessage} onChange={(e) => update("welcomeMessage", e.target.value)} className="bg-muted/30 border-border/40 text-sm resize-none" rows={2} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Input placeholder</Label>
                  <Input value={config.placeholder} onChange={(e) => update("placeholder", e.target.value)} className="bg-muted/30 border-border/40 text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Bot native language</Label>
                  <select
                    value={config.language}
                    onChange={(e) => update("language", e.target.value)}
                    className="w-full h-10 rounded-lg bg-muted/30 border border-border/40 text-sm px-3"
                  >
                    <option value="en">English (default)</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="pt">Portuguese</option>
                    <option value="it">Italian</option>
                  </select>
                  <p className="text-[11px] text-muted-foreground">The bot opens and defaults to this language, and adapts if the visitor writes in another one.</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Disclaimer (small text under the chat)</Label>
                  <Textarea
                    value={config.disclaimer}
                    onChange={(e) => update("disclaimer", e.target.value)}
                    className="bg-muted/30 border-border/40 text-sm resize-none"
                    rows={2}
                    maxLength={300}
                    placeholder="Ej: For educational purposes only — not medical advice."
                  />
                  <p className="text-[11px] text-muted-foreground">Shown in small print under the widget's message box. Leave it empty to show nothing.</p>
                </div>
                {/* "Powered by" badge — White-Label only */}
                <div className="space-y-2 pt-2 border-t border-border/40">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Label className="text-xs">"Powered by" badge</Label>
                    {!customBranding && <Badge variant="outline" className="text-[10px] gap-1"><Crown className="w-3 h-3" />White-Label</Badge>}
                  </div>
                  <Input
                    value={config.poweredByText ?? "Lynx AI"}
                    disabled={!customBranding}
                    onChange={(e) => update("poweredByText", e.target.value)}
                    className="bg-muted/30 border-border/40 text-sm"
                    maxLength={64}
                    placeholder="Leave empty to remove the badge"
                  />
                  <Input
                    value={config.poweredByUrl}
                    disabled={!customBranding || !(config.poweredByText ?? "Lynx AI").trim()}
                    onChange={(e) => update("poweredByUrl", e.target.value)}
                    className="bg-muted/30 border-border/40 text-sm"
                    maxLength={255}
                    placeholder="Link (optional) — https://yourbrand.com"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {customBranding
                      ? "Shown at the bottom of the chat. Clear the field to remove it completely."
                      : "Upgrade to White-Label to rename or remove this badge."}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Appearance */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}>
            <Card className="glass-card border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Palette className="w-4 h-4 text-primary" />Appearance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Primary color</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={config.primaryColor} onChange={(e) => update("primaryColor", e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border border-border/40 bg-transparent" />
                      <Input value={config.primaryColor} onChange={(e) => update("primaryColor", e.target.value)} className="bg-muted/30 border-border/40 text-sm font-mono" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Secondary color</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={config.secondaryColor} onChange={(e) => update("secondaryColor", e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border border-border/40 bg-transparent" />
                      <Input value={config.secondaryColor} onChange={(e) => update("secondaryColor", e.target.value)} className="bg-muted/30 border-border/40 text-sm font-mono" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Widget position</Label>
                  <div className="flex gap-3">
                    {[
                      { value: "bottom-right", label: "Right", icon: AlignRight },
                      { value: "bottom-left", label: "Left", icon: AlignLeft },
                    ].map((pos) => (
                      <button key={pos.value} onClick={() => update("position", pos.value as "bottom-right" | "bottom-left")}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm border transition-all ${config.position === pos.value ? "border-primary/50 bg-primary/10 text-primary" : "border-border/40 text-muted-foreground hover:border-primary/20"}`}>
                        <pos.icon className="w-4 h-4" />{pos.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Icon — White-Label only */}
                {customBranding ? (
                  <div className="space-y-2 pt-2 border-t border-border/30">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Header logo</Label>
                      <Badge variant="outline" className="text-emerald-400 border-emerald-400/40 bg-emerald-400/10 text-[10px] px-1.5 py-0 h-4">
                        <Crown className="w-2.5 h-2.5 mr-1" />White-Label
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Logo shown at the top of the open chat, next to the name. Tip: leave the "Chatbot name" field empty to show a full logo (with the name built in), like the menu logo.
                    </p>
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Current icon preview — circular, fills the space */}
                      <div className="w-14 h-14 rounded-full border border-border/40 bg-muted/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {config.avatarUrl ? (
                          <img src={config.avatarUrl} alt="Custom icon" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
                        )}
                      </div>
                      <div className="flex flex-col gap-2 flex-1">
                        <div className="flex gap-2 flex-wrap">
                          <label className="cursor-pointer">
                            <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border/40 bg-muted/30 text-sm font-medium transition-colors hover:bg-muted/60 ${uploadingAvatar ? "opacity-50 pointer-events-none" : ""}`}>
                              {uploadingAvatar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                              {uploadingAvatar ? "Uploading…" : "Upload image"}
                            </div>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleAvatarUpload}
                              disabled={uploadingAvatar}
                            />
                          </label>
                          {config.avatarUrl && (
                            <button
                              onClick={() => update("avatarUrl", null)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border/40 bg-muted/30 text-sm text-muted-foreground transition-colors hover:text-destructive hover:border-destructive/40"
                            >
                              <X className="w-3.5 h-3.5" />Remove
                            </button>
                          )}
                        </div>
                        {config.avatarUrl && (
                          <p className="text-xs text-muted-foreground truncate max-w-full min-w-0">{config.avatarUrl}</p>
                        )}
                      </div>
                    </div>

                    {/* Button icon — the closed floating bubble */}
                    <div className="pt-3 mt-1 border-t border-border/20">
                      <Label className="text-xs">Button icon (closed bubble)</Label>
                      <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                        Icon on the floating button when the chat is closed. Leave empty to use the default dark chat icon.
                      </p>
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="w-14 h-14 rounded-full border border-border/40 bg-neutral-900 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {config.buttonIconUrl ? (
                            <img src={config.buttonIconUrl} alt="Button icon" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                          ) : (
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e5e7eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                          )}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <label className="cursor-pointer">
                            <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border/40 bg-muted/30 text-sm font-medium transition-colors hover:bg-muted/60 ${uploadingButton ? "opacity-50 pointer-events-none" : ""}`}>
                              {uploadingButton ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                              {uploadingButton ? "Uploading…" : "Upload image"}
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleButtonIconUpload}
                              disabled={uploadingButton}
                            />
                          </label>
                          {config.buttonIconUrl && (
                            <button
                              onClick={() => update("buttonIconUrl", null)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border/40 bg-muted/30 text-sm text-muted-foreground transition-colors hover:text-destructive hover:border-destructive/40"
                            >
                              <X className="w-3.5 h-3.5" />Remove
                            </button>
                          )}
                        </div>
                      {/* Button color — used when there is no button icon */}
                      <div className="mt-3">
                        <Label className="text-xs">Button color{config.buttonIconUrl ? " (hidden while a button icon is set)" : ""}</Label>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <input
                            type="color"
                            value={/^#[0-9a-fA-F]{6}$/.test(config.buttonColor) ? config.buttonColor : "#111827"}
                            onChange={(e) => update("buttonColor", e.target.value)}
                            className="w-10 h-10 rounded-lg cursor-pointer border border-border/40 bg-transparent"
                          />
                          <Input
                            value={config.buttonColor}
                            onChange={(e) => update("buttonColor", e.target.value)}
                            placeholder="#111827"
                            className="bg-muted/30 border-border/40 text-sm font-mono flex-1 min-w-[110px] max-w-[160px]"
                          />
                          <div
                            className="w-10 h-10 rounded-full border border-border/40 flex items-center justify-center shrink-0"
                            style={{ background: config.buttonColor }}
                            title="Preview"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ mixBlendMode: "difference" }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1.5">The floating chat bubble uses this color when no button icon is uploaded. The icon adjusts to stay readable.</p>
                      </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-border/30">
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/20 border border-border/30">
                      <Crown className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium">Custom icon — White-Label plan</p>
                        <p className="text-xs text-muted-foreground">Upgrade to White-Label to replace the Lynx AI logo with your own brand icon.</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Behavior */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
            <Card className="glass-card border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-primary" />Behavior
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Auto-open</div>
                    <div className="text-xs text-muted-foreground">Open the chat automatically when visitors arrive</div>
                  </div>
                  <Switch checked={config.autoOpen} onCheckedChange={(v) => update("autoOpen", v)} />
                </div>
                {config.autoOpen && (
                  <div className="space-y-2">
                    <Label className="text-xs">Delay before opening: {config.autoOpenDelay}s</Label>
                    <Slider value={[config.autoOpenDelay]} onValueChange={([v]) => update("autoOpenDelay", v)} min={1} max={30} step={1} className="w-full" />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Active</div>
                    <div className="text-xs text-muted-foreground">Enable or disable the chatbot on your site</div>
                  </div>
                  <Switch checked={config.isActive} onCheckedChange={(v) => update("isActive", v)} />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <Button onClick={handleSave} disabled={saveMutation.isPending || !isDirty} className="lynx-gradient text-white border-0 font-semibold w-full sm:w-auto">
            {saveMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save configuration</>}
          </Button>
          {!isDirty && existing && (
            <p className="text-xs text-muted-foreground">All changes saved.</p>
          )}
        </div>

        {/* Live Preview */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 0.5 }} className="xl:col-span-1">
          <div className="sticky top-20">
            <Card className="glass-card border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />Live preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative bg-muted/20 rounded-xl h-80 overflow-hidden">
                  {/* Fake website bg */}
                  <div className="absolute inset-0 p-4 space-y-2 opacity-30">
                    <div className="h-6 bg-muted/60 rounded w-3/4" />
                    <div className="h-3 bg-muted/40 rounded w-full" />
                    <div className="h-3 bg-muted/40 rounded w-5/6" />
                    <div className="h-3 bg-muted/40 rounded w-4/6" />
                  </div>
                  {/* Chat widget preview */}
                  <div
                    className={`absolute bottom-3 ${config.position === "bottom-right" ? "right-3" : "left-3"} w-52 rounded-2xl overflow-hidden shadow-2xl`}
                    style={{ border: `1px solid ${config.primaryColor}30` }}
                  >
                    <div className="px-3 py-2.5 flex items-center gap-2" style={{ background: `linear-gradient(135deg, ${config.primaryColor}, ${config.secondaryColor})` }}>
                      {/* Avatar circle */}
                      <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {config.avatarUrl ? (
                          <img src={config.avatarUrl} alt="icon" className="w-full h-full object-cover rounded-full" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                        ) : (
                          <MessageSquare className="w-3 h-3 text-white/80" />
                        )}
                      </div>
                      {/* Bot name + status */}
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-xs font-bold truncate">{config.name || "Lynx AI"}</div>
                        <div className="text-white/70 text-[10px] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />Online
                        </div>
                      </div>
                    </div>
                    <div className="p-2.5 bg-card/90 space-y-2">
                      <div className="bg-muted/50 rounded-lg rounded-tl-sm px-2.5 py-1.5 text-xs">
                        {config.welcomeMessage || "Hi! How can I help you?"}
                      </div>
                    </div>
                    <div className="px-2.5 pb-2.5 bg-card/90">
                      <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-2 py-1.5">
                        <span className="text-xs text-muted-foreground flex-1 truncate">{config.placeholder}</span>
                        <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${config.primaryColor}, ${config.secondaryColor})` }}>
                          <MessageSquare className="w-2.5 h-2.5 text-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3 text-center">Preview updates in real time as you edit</p>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </DashboardShell>
  );
}
