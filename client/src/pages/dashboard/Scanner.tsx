import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardShell from "@/components/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  Globe, Search, CheckCircle, AlertCircle, Loader2,
  FileText, ShoppingBag, BookOpen, Shield, RefreshCw,
  Zap, Clock, TrendingUp, Gauge,
} from "lucide-react";

type ScanStatus = "idle" | "scanning" | "complete" | "error";

const scanSteps = [
  { label: "Connecting to site", icon: Globe },
  { label: "Discovering pages and structure", icon: Search },
  { label: "Reading product content", icon: ShoppingBag },
  { label: "Analyzing policies and documents", icon: FileText },
  { label: "Processing blog and articles", icon: BookOpen },
  { label: "Verifying security and accessibility", icon: Shield },
  { label: "Training AI model", icon: Zap },
];

type ScanResult = {
  summary: string;
  topics: string[];
  keywords: Array<{ keyword: string; count: number; density: number }>;
  seoScore: number;
  suggestions: Array<{ type: string; priority: string; message: string; page?: string }>;
  pagesEstimate: number;
  productsEstimate: number;
  policiesEstimate: number;
  blogEstimate: number;
  languages: string[];
  loadSpeed: number;
  mobileScore: number;
  productsFound?: number;
  products?: Array<{ name: string; price?: string; description?: string; url?: string }>;
  scanReport?: {
    homeReadable: boolean;
    sitemapFound: boolean;
    sitemapUrlCount: number;
    storeCatalogFound: boolean;
    pagesRead: string[];
    pagesReadCount: number;
    pagesFailed: string[];
    warnings: string[];
  };
  seoBreakdown?: {
    score: number;
    categories: Array<{ key: string; label: string; score: number; weight: number }>;
    checks: Array<{ id: string; label: string; status: "pass" | "warn" | "fail"; detail: string }>;
    source?: "lighthouse" | "estimated";
    webVitals?: { lcpMs: number | null; tbtMs: number | null; cls: number | null; fcpMs: number | null; lighthouseVersion: string } | null;
  } | null;
};

export default function Scanner() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [result, setResult] = useState<ScanResult | null>(null);

  const scanMutation = trpc.scanner.scan.useMutation({
    onSuccess: (data) => {
      setResult(data as ScanResult);
      setStatus("complete");
      setProgress(100);
      setCompletedSteps(scanSteps.map((_, i) => i));
      toast.success("Scan complete! Lynx AI now knows your site.");
    },
    onError: (err) => {
      setStatus("error");
      toast.error(`Scan failed: ${err.message}`);
    },
  });

  const handleScan = async () => {
    if (!url) { toast.error("Please enter a valid URL"); return; }
    const fullUrl = url.startsWith("http") ? url : `https://${url}`;

    setStatus("scanning");
    setProgress(0);
    setCurrentStep(0);
    setCompletedSteps([]);
    setResult(null);

    // Animate steps while the real request runs in parallel
    const stepDuration = 1400;
    for (let i = 0; i < scanSteps.length - 1; i++) {
      await new Promise((r) => setTimeout(r, stepDuration));
      setCurrentStep(i + 1);
      setCompletedSteps((prev) => [...prev, i]);
      setProgress(Math.round(((i + 1) / scanSteps.length) * 85));
    }

    // Fire the real backend call
    scanMutation.mutate({ url: fullUrl });
  };

  const priorityColor = (p: string) => {
    if (p === "high") return "bg-red-500/10 text-red-400 border-red-500/20";
    if (p === "medium") return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
    return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  };

  return (
    <DashboardShell title="Site Scanner">
      <div className="space-y-6 max-w-4xl">
        {/* URL Input */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Card className="glass-card border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                Scan a website
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter your website URL and Lynx AI will scan it completely — learning your content, products, policies and structure to answer visitor questions accurately.
              </p>
              <div className="flex gap-3">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Website URL</Label>
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleScan()}
                    placeholder="https://yoursite.com"
                    className="bg-muted/30 border-border/40 text-sm"
                    disabled={status === "scanning"}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleScan}
                    disabled={status === "scanning" || !url}
                    className="lynx-gradient text-white border-0 font-semibold"
                  >
                    {status === "scanning" ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scanning...</>
                    ) : (
                      <><Search className="w-4 h-4 mr-2" />Start scan</>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Scanning progress */}
        <AnimatePresence>
          {(status === "scanning" || status === "complete") && (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}
            >
              <Card className="glass-card border-border/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    {status === "scanning" ? (
                      <><Loader2 className="w-4 h-4 text-primary animate-spin" />Scanning your site...</>
                    ) : (
                      <><CheckCircle className="w-4 h-4 text-emerald-400" />Scan completed</>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Scan progress</span><span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    {scanSteps.map((step, i) => {
                      const isCompleted = completedSteps.includes(i);
                      const isCurrent = currentStep === i && status === "scanning";
                      const isPending = !isCompleted && !isCurrent;
                      return (
                        <motion.div key={i} initial={{ opacity: 0.4 }} animate={{ opacity: isPending ? 0.4 : 1 }} className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${isCompleted ? "bg-emerald-500/20" : isCurrent ? "bg-primary/20" : "bg-muted/30"}`}>
                            {isCompleted ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : isCurrent ? <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" /> : <step.icon className="w-3.5 h-3.5 text-muted-foreground" />}
                          </div>
                          <span className={`text-sm transition-colors ${isCompleted ? "text-foreground" : isCurrent ? "text-primary" : "text-muted-foreground"}`}>{step.label}</span>
                        </motion.div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Real results */}
        <AnimatePresence>
          {status === "complete" && result && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }} className="space-y-4">
              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Pages found", value: result.pagesEstimate, icon: FileText, color: "text-blue-400", bg: "bg-blue-500/10" },
                  { label: "Products detected", value: result.productsEstimate, icon: ShoppingBag, color: "text-violet-400", bg: "bg-violet-500/10" },
                  { label: "Policies read", value: result.policiesEstimate, icon: Shield, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                  { label: "Blog articles", value: result.blogEstimate, icon: BookOpen, color: "text-cyan-400", bg: "bg-cyan-500/10" },
                ].map((stat) => (
                  <Card key={stat.label} className="glass-card border-border/40">
                    <CardContent className="p-4">
                      <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
                        <stat.icon className={`w-4 h-4 ${stat.color}`} />
                      </div>
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* SEO Score + Speed */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="glass-card border-border/40">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{result.seoScore}<span className="text-sm text-muted-foreground">/100</span></div>
                      <div className="text-xs text-muted-foreground">SEO Score</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-card border-border/40">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <Gauge className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{result.loadSpeed}s</div>
                      <div className="text-xs text-muted-foreground">Load speed</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-card border-border/40">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                      <Globe className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{result.mobileScore}<span className="text-sm text-muted-foreground">/100</span></div>
                      <div className="text-xs text-muted-foreground">Mobile score</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Summary */}
              <Card className="glass-card border-border/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />Site summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{result.summary}</p>
                </CardContent>
              </Card>

              {/* SEO breakdown — GTmetrix-style graded categories + checks */}
              {result.seoBreakdown && (
                <Card className="glass-card border-border/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />Desglose del puntaje SEO
                      <span className="ml-auto text-lg font-bold">{result.seoBreakdown.score}<span className="text-xs text-muted-foreground font-normal">/100</span></span>
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {result.seoBreakdown.source === "lighthouse"
                        ? `Performance medido con Google Lighthouse ${result.seoBreakdown.webVitals?.lighthouseVersion ?? ""} (el mismo motor de GTmetrix/PageSpeed)`
                        : "Performance estimado por mediciones HTTP (Lighthouse no disponible para esta URL)"}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {result.seoBreakdown.webVitals && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { label: "LCP", value: result.seoBreakdown.webVitals.lcpMs != null ? `${(result.seoBreakdown.webVitals.lcpMs / 1000).toFixed(1)}s` : "—", ok: (result.seoBreakdown.webVitals.lcpMs ?? 0) <= 2500, mid: (result.seoBreakdown.webVitals.lcpMs ?? 0) <= 4000 },
                          { label: "TBT", value: result.seoBreakdown.webVitals.tbtMs != null ? `${Math.round(result.seoBreakdown.webVitals.tbtMs)}ms` : "—", ok: (result.seoBreakdown.webVitals.tbtMs ?? 0) <= 200, mid: (result.seoBreakdown.webVitals.tbtMs ?? 0) <= 600 },
                          { label: "CLS", value: result.seoBreakdown.webVitals.cls != null ? result.seoBreakdown.webVitals.cls.toFixed(2) : "—", ok: (result.seoBreakdown.webVitals.cls ?? 0) <= 0.1, mid: (result.seoBreakdown.webVitals.cls ?? 0) <= 0.25 },
                          { label: "FCP", value: result.seoBreakdown.webVitals.fcpMs != null ? `${(result.seoBreakdown.webVitals.fcpMs / 1000).toFixed(1)}s` : "—", ok: (result.seoBreakdown.webVitals.fcpMs ?? 0) <= 1800, mid: (result.seoBreakdown.webVitals.fcpMs ?? 0) <= 3000 },
                        ].map((v) => (
                          <div key={v.label} className="rounded-xl border border-border/40 bg-muted/20 p-2.5 text-center">
                            <div className={`text-base font-bold ${v.ok ? "text-emerald-400" : v.mid ? "text-amber-400" : "text-red-400"}`}>{v.value}</div>
                            <div className="text-[10px] text-muted-foreground font-medium">{v.label}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {result.seoBreakdown.categories.map((cat) => {
                        const grade = cat.score >= 90 ? "A" : cat.score >= 80 ? "B" : cat.score >= 70 ? "C" : cat.score >= 60 ? "D" : "F";
                        const color = cat.score >= 80 ? "text-emerald-400" : cat.score >= 60 ? "text-amber-400" : "text-red-400";
                        return (
                          <div key={cat.key} className="rounded-xl border border-border/40 bg-muted/20 p-2.5 text-center">
                            <div className={`text-xl font-bold ${color}`}>{grade}</div>
                            <div className="text-[11px] font-medium mt-0.5">{cat.label}</div>
                            <div className="text-[10px] text-muted-foreground">{cat.score}/100 · {cat.weight}%</div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="space-y-1.5">
                      {result.seoBreakdown.checks.map((c) => (
                        <div key={c.id} className="flex items-start gap-2 text-xs rounded-lg border border-border/30 bg-muted/10 px-2.5 py-1.5">
                          <span className={`flex-shrink-0 mt-0.5 font-bold ${c.status === "pass" ? "text-emerald-400" : c.status === "warn" ? "text-amber-400" : "text-red-400"}`}>
                            {c.status === "pass" ? "✓" : c.status === "warn" ? "⚠" : "✕"}
                          </span>
                          <span className="font-medium">{c.label}</span>
                          <span className="text-muted-foreground ml-auto text-right">{c.detail}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Read report — honest account of what was scanned */}
              {result.scanReport && (
                <Card className="glass-card border-border/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />Reporte de lectura
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <span className={`text-xs px-2 py-1 rounded-lg border ${result.scanReport.homeReadable ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-400" : "border-red-400/40 bg-red-400/10 text-red-400"}`}>
                        {result.scanReport.homeReadable ? "✓ Home page read" : "✕ Home page unreadable"}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-lg border ${result.scanReport.sitemapFound ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-400" : "border-amber-400/40 bg-amber-400/10 text-amber-400"}`}>
                        {result.scanReport.sitemapFound ? `✓ Sitemap encontrado (${result.scanReport.sitemapUrlCount} URLs)` : "⚠ Sin sitemap"}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-lg border ${result.scanReport.storeCatalogFound ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-400" : "border-border/40 bg-muted/20 text-muted-foreground"}`}>
                        {result.scanReport.storeCatalogFound ? "✓ Store catalog detected" : "No catalog auto-detected"}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-lg border border-blue-400/40 bg-blue-400/10 text-blue-400">
                        {result.scanReport.pagesReadCount} page(s) read
                      </span>
                    </div>

                    {result.scanReport.pagesRead.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-foreground mb-1">Pages read:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {result.scanReport.pagesRead.map((p, i) => (
                            <span key={i} className="text-[11px] px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground font-mono">{p}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {result.scanReport.warnings.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        {result.scanReport.warnings.map((w, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-amber-300/90 bg-amber-400/5 border border-amber-400/20 rounded-lg p-2">
                            <span className="flex-shrink-0 mt-0.5">⚠</span>
                            <span>{w}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Topics learned */}
              <Card className="glass-card border-border/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />Topics Lynx now knows
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {result.topics.map((topic) => (
                      <span key={topic} className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">{topic}</span>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />Just scanned</div>
                    <div className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" />Languages: {result.languages.join(", ")}</div>
                  </div>
                </CardContent>
              </Card>

              {/* Product catalog */}
              {result.products && result.products.length > 0 && (
                <Card className="glass-card border-border/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-violet-400" />
                      Products detected ({result.productsFound ?? result.products.length})
                      <span className="ml-auto text-xs font-normal text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />Chatbot trained
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {result.products.slice(0, 8).map((p, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 border border-border/30">
                        <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0 mt-0.5">
                          <ShoppingBag className="w-3.5 h-3.5 text-violet-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
                          {p.price && <p className="text-xs text-emerald-400 mt-0.5">{p.price}</p>}
                          {p.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{p.description}</p>}
                        </div>
                        {p.url && (
                          <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline shrink-0 mt-0.5">View</a>
                        )}
                      </div>
                    ))}
                    {(result.productsFound ?? 0) > 8 && (
                      <p className="text-xs text-muted-foreground text-center pt-1">+{(result.productsFound ?? 0) - 8} more products saved to chatbot context</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* SEO Suggestions */}
              {result.suggestions.length > 0 && (
                <Card className="glass-card border-border/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-400" />SEO suggestions ({result.suggestions.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {result.suggestions.map((s, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 border border-border/30">
                        <Badge className={`text-xs shrink-0 mt-0.5 border ${priorityColor(s.priority)}`}>{s.priority}</Badge>
                        <div>
                          <p className="text-xs text-foreground">{s.message}</p>
                          {s.page && <p className="text-xs text-muted-foreground mt-0.5">{s.page}</p>}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Top keywords */}
              {result.keywords.length > 0 && (
                <Card className="glass-card border-border/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Search className="w-4 h-4 text-primary" />Top keywords detected
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {result.keywords.slice(0, 8).map((kw) => (
                        <div key={kw.keyword} className="flex items-center justify-between">
                          <span className="text-xs text-foreground">{kw.keyword}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-1.5 bg-muted/40 rounded-full overflow-hidden">
                              <div className="h-full rounded-full lynx-gradient" style={{ width: `${Math.min(100, kw.density * 20)}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground w-12 text-right">{kw.count}x</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button variant="outline" className="border-border/40" onClick={() => { setStatus("idle"); setUrl(""); setProgress(0); setCompletedSteps([]); setResult(null); }}>
                <RefreshCw className="w-4 h-4 mr-2" />Scan another site
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error state */}
        {status === "error" && (
          <Card className="glass-card border-red-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-400">Scan failed</p>
                <p className="text-xs text-muted-foreground mt-0.5">Could not reach the site or an error occurred. Check the URL and try again.</p>
              </div>
              <Button variant="outline" size="sm" className="ml-auto border-border/40" onClick={() => setStatus("idle")}>Retry</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardShell>
  );
}
