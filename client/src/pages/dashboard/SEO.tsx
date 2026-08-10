import { useRef } from "react";
import { motion } from "framer-motion";
import DashboardShell from "@/components/DashboardShell";
import UpgradeGate from "@/components/UpgradeGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import {
  BarChart3, TrendingUp, AlertTriangle, CheckCircle, XCircle,
  Lightbulb, Globe, Gauge, Smartphone, Search, ExternalLink, ScanLine, History, Download,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { Link } from "wouter";

type Keyword = { keyword: string; count: number; density: number };
type Suggestion = { type: string; priority: string; message: string; page?: string };
type MetaIssue = { page: string; issue: string; severity: string };

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";
  const label = score >= 80 ? "Good" : score >= 60 ? "Needs work" : "Critical";
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/20" />
          <circle cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${(score / 100) * 263.9} 263.9`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold" style={{ color }}>{score}</span>
          <span className="text-xs text-muted-foreground">/ 100</span>
        </div>
      </div>
      <span className="text-xs font-medium mt-1" style={{ color }}>{label}</span>
    </div>
  );
}

function priorityIcon(priority: string, type: string) {
  const p = priority.toLowerCase();
  if (type === "meta" || p === "high") return { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" };
  if (p === "medium") return { icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" };
  return { icon: Lightbulb, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" };
}

function SEOContent() {
  const utils = trpc.useUtils();
  const { data: report, isLoading } = trpc.seo.getReport.useQuery();
  const { data: history = [] } = trpc.seo.getHistory.useQuery();
  const reportRef = useRef<HTMLDivElement | null>(null);
  const downloadSeoPdf = async () => {
    if (!reportRef.current) return;
    const { exportElementToPdf } = await import("@/lib/pdfExport");
    await exportElementToPdf(reportRef.current, "seo-report.pdf", { width: 900 });
  };
  const reAnalyzeMutation = trpc.scanner.scan.useMutation({
    onSuccess: () => {
      utils.seo.getReport.invalidate();
      utils.seo.getHistory.invalidate();
    },
  });

  function handleReAnalyze() {
    if (!report?.siteUrl) return;
    reAnalyzeMutation.mutate({ url: report.siteUrl as string });
  }

  if (isLoading) {
    return (
      <DashboardShell title="SEO Analysis">
        <div className="space-y-5">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)}
        </div>
      </DashboardShell>
    );
  }

  if (!report) {
    return (
      <DashboardShell title="SEO Analysis">
        <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl lynx-gradient flex items-center justify-center mb-4">
            <ScanLine className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No SEO data yet</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Scan your website first to get a full SEO report with keyword analysis, improvement suggestions and more.
          </p>
          <Link href="/dashboard/scanner">
            <Button className="lynx-gradient text-white border-0">
              <Search className="w-4 h-4 mr-2" />Go to Site Scanner
            </Button>
          </Link>
        </div>
      </DashboardShell>
    );
  }

  const keywords: Keyword[] = Array.isArray(report.keywords) ? (report.keywords as Keyword[]) : [];
  const suggestions: Suggestion[] = Array.isArray(report.suggestions) ? (report.suggestions as Suggestion[]) : [];
  const metaIssues: MetaIssue[] = Array.isArray(report.metaIssues) ? (report.metaIssues as MetaIssue[]) : [];
  const topPages = Array.isArray(report.topPages) ? report.topPages as Array<{ url: string; title: string }> : [];
  const seoScore = report.score ?? 0;
  const loadSpeed = (report.loadSpeed as number) ?? 0;
  const mobileScore = (report.mobileScore as number) ?? 0;

  return (
    <DashboardShell title="SEO Analysis">
      <div className="space-y-6" ref={reportRef}>
        {/* Score + quick stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Card className="glass-card border-border/40 md:col-span-1">
              <CardContent className="p-5 flex flex-col items-center justify-center h-full">
                <ScoreRing score={seoScore} />
                <p className="text-xs text-muted-foreground mt-2 text-center">Overall SEO score</p>
                <p className="text-xs text-muted-foreground font-mono mt-1 truncate max-w-full">{report.siteUrl}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 text-xs h-7 px-3 gap-1.5 border-border/50"
                  onClick={handleReAnalyze}
                  disabled={reAnalyzeMutation.isPending}
                >
                  {reAnalyzeMutation.isPending ? (
                    <><span className="w-3 h-3 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />Analyzing...</>
                  ) : (
                    <><ScanLine className="w-3 h-3" />Re-analyze</>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 text-xs h-7 px-3 gap-1.5 border-border/50"
                  onClick={downloadSeoPdf}
                >
                  <Download className="w-3 h-3" />Download PDF
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }} className="md:col-span-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 h-full">
              {[
                { label: "Load speed", value: `${loadSpeed}s`, icon: Gauge, good: loadSpeed < 2.5, goodLabel: "Fast", badLabel: "Slow" },
                { label: "Mobile score", value: `${mobileScore}/100`, icon: Smartphone, good: mobileScore >= 70, goodLabel: "Good", badLabel: "Needs work" },
                { label: "Issues found", value: `${metaIssues.length + suggestions.filter(s => s.priority?.toLowerCase() === "high").length}`, icon: AlertTriangle, good: metaIssues.length === 0, goodLabel: "None", badLabel: "Fix needed" },
              ].map((stat, i) => (
                <Card key={i} className="glass-card border-border/40">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.good ? "bg-emerald-500/10" : "bg-yellow-500/10"}`}>
                      <stat.icon className={`w-5 h-5 ${stat.good ? "text-emerald-400" : "text-yellow-400"}`} />
                    </div>
                    <div>
                      <div className="text-lg font-bold">{stat.value}</div>
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                      <Badge className={`text-xs mt-0.5 px-1.5 py-0 ${stat.good ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"}`}>
                        {stat.good ? stat.goodLabel : stat.badLabel}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Keywords */}
        {keywords.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
            <Card className="glass-card border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Search className="w-4 h-4 text-primary" />Detected keywords
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {keywords.slice(0, 8).map((kw, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-32 text-xs font-medium truncate">{kw.keyword}</div>
                      <div className="flex-1">
                        <Progress value={Math.min((kw.count / (keywords[0]?.count || 1)) * 100, 100)} className="h-1.5" />
                      </div>
                      <div className="text-xs text-muted-foreground w-16 text-right">{kw.count} mentions</div>
                      <div className="text-xs text-muted-foreground w-12 text-right">{kw.density?.toFixed(1)}%</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}>
            <Card className="glass-card border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />Improvement suggestions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {suggestions.map((s, i) => {
                  const { icon: Icon, color, bg, border } = priorityIcon(s.priority, s.type);
                  return (
                    <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${bg} ${border}`}>
                      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs leading-relaxed">{s.message}</p>
                        {s.page && <p className="text-xs text-muted-foreground font-mono mt-1">{s.page}</p>}
                      </div>
                      <Badge className={`text-xs px-1.5 py-0 shrink-0 ${color} ${bg} ${border}`}>{s.priority}</Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Meta issues */}
        {metaIssues.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}>
            <Card className="glass-card border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />Meta tag issues
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {metaIssues.map((issue, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/20 border border-border/30">
                    {issue.severity === "high" ? <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0" />}
                    <span className="text-xs font-mono text-muted-foreground">{issue.page}</span>
                    <span className="text-xs flex-1">{issue.issue}</span>
                    <Badge className={`text-xs px-1.5 py-0 ${issue.severity === "high" ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"}`}>{issue.severity}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Top pages */}
        {topPages.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}>
            <Card className="glass-card border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />Top pages
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {topPages.slice(0, 6).map((page, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/20 border border-border/30">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs text-primary font-bold">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{page.title}</div>
                      <div className="text-xs text-muted-foreground font-mono truncate">{page.url}</div>
                    </div>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* SEO Score History */}
        {history.length >= 2 && (() => {
          // history[0] = newest, history[1] = previous
          const latest = history[0];
          const prev = history[1];
          const scoreDelta = latest.score - prev.score;
          const mobileDelta = (latest.mobileScore ?? 0) - (prev.mobileScore ?? 0);
          const deltaColor = (d: number) => d > 0 ? "text-emerald-500" : d < 0 ? "text-red-500" : "text-muted-foreground";
          const deltaLabel = (d: number) => d > 0 ? `+${d}` : `${d}`;
          return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.5 }}>
            <Card className="glass-card border-border/40">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <History className="w-4 h-4 text-primary" />Score history
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    {/* Delta badges */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">vs last scan:</span>
                      <span className={`text-xs font-semibold ${deltaColor(scoreDelta)}`}>
                        {deltaLabel(scoreDelta)} SEO
                      </span>
                      {latest.mobileScore && prev.mobileScore && (
                        <span className={`text-xs font-semibold ${deltaColor(mobileDelta)}`}>
                          {deltaLabel(mobileDelta)} mobile
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{history.length} scans</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart
                    data={[...history].reverse().map(h => ({
                      date: new Date(h.scannedAt).toLocaleDateString("en", { month: "short", day: "numeric" }),
                      score: h.score,
                      mobile: h.mobileScore,
                    }))}
                    margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                    />
                    <ReferenceLine y={80} stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.4} />
                    <ReferenceLine y={60} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.4} />
                    <Line
                      type="monotone" dataKey="score" name="SEO score"
                      stroke="hsl(var(--primary))" strokeWidth={2}
                      dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 0 }}
                      activeDot={{ r: 6 }}
                    />
                    {history.some(h => h.mobileScore) && (
                      <Line
                        type="monotone" dataKey="mobile" name="Mobile score"
                        stroke="#22c55e" strokeWidth={1.5} strokeDasharray="4 4"
                        dot={{ r: 3, fill: "#22c55e", strokeWidth: 0 }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-4 mt-2 justify-center">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-primary rounded" />
                    <span className="text-xs text-muted-foreground">SEO score</span>
                  </div>
                  {history.some(h => h.mobileScore) && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-0.5 bg-emerald-400 rounded" style={{ borderTop: "2px dashed" }} />
                      <span className="text-xs text-muted-foreground">Mobile score</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-emerald-500/40 rounded" />
                    <span className="text-xs text-muted-foreground">Good ≥80</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          );
        })()}
      </div>
    </DashboardShell>
  );
}

export default function SEO() {
  return (
    <UpgradeGate
      feature="seoAnalysis"
      requiredPlan="embedded"
      title="SEO Analysis"
      description="Get keyword analysis, improvement suggestions, load speed scores, and mobile performance reports. Available on Embedded AI and above."
    >
      <SEOContent />
    </UpgradeGate>
  );
}
