import { useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import DashboardShell from "@/components/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Download, ArrowLeft, Globe, MessageSquare, Users, TrendingUp, Eye, Calendar,
} from "lucide-react";
import { toast } from "sonner";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDay(day: string) {
  return new Date(day + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── PDF Generator (shared helper with native print fallback) ────────────────

async function downloadPDF(reportRef: React.RefObject<HTMLDivElement | null>, clientName: string) {
  const element = reportRef.current;
  if (!element) return;
  const { exportElementToPdf } = await import("@/lib/pdfExport");
  await exportElementToPdf(
    element,
    `${clientName.replace(/\s+/g, "-").toLowerCase()}-report.pdf`,
    { width: 720, background: "#0f172a" },
  );
}

// ─── Report Content (printable) ───────────────────────────────────────────────

type SeoAnalysis = {
  siteUrl: string;
  breakdown: {
    score: number;
    categories: Array<{ key: string; label: string; score: number; weight: number }>;
    checks: Array<{ id: string; label: string; status: "pass" | "warn" | "fail"; detail: string }>;
  } | null;
  error: string | null;
} | null;

function ReportContent({ data, reportRef, seo, seoLoading }: {
  seo: SeoAnalysis;
  seoLoading: boolean;
  data: {
    client: { id: number; name: string; siteUrl: string | null; brandName: string | null; brandColor: string | null };
    period: { from: string; to: string };
    totals: { pageViews: number; chatOpens: number; messagesSent: number; leadsCaptures: number };
    conversionRate: number;
    dailyData: Array<{ day: string; pageViews: number; chatOpens: number }>;
    topPages: Array<{ url: string; views: number }>;
    leads: Array<{ leadName: string | null; leadEmail: string | null; leadCompany: string | null; createdAt: Date }>;
  };
  reportRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { client, period, totals, conversionRate, dailyData, topPages, leads } = data;
  const accentColor = client.brandColor ?? "#3b82f6";

  const kpis = [
    { label: "Page Views", value: totals.pageViews.toLocaleString(), icon: Eye, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Chat Opens", value: totals.chatOpens.toLocaleString(), icon: MessageSquare, color: "text-violet-400", bg: "bg-violet-500/10" },
    { label: "Messages Sent", value: totals.messagesSent.toLocaleString(), icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Leads Captured", value: totals.leadsCaptures.toLocaleString(), icon: Users, color: "text-amber-400", bg: "bg-amber-500/10" },
  ];

  return (
    <div ref={reportRef} className="bg-slate-900 text-white p-5 sm:p-8 rounded-2xl space-y-8">
      {/* Header with brand accent band */}
      <div className="relative border-b border-white/10 pb-6">
        <div
          className="absolute -top-5 sm:-top-8 -left-5 sm:-left-8 -right-5 sm:-right-8 h-1.5 rounded-t-2xl"
          style={{ background: `linear-gradient(90deg, ${accentColor}, transparent)` }}
        />
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
              style={{ backgroundColor: accentColor }}
            >
              {client.name[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold truncate">{client.name}</h1>
              <p className="text-sm text-slate-400 truncate">{client.siteUrl}</p>
            </div>
          </div>
          <Badge className="bg-white/10 text-white border-white/20 text-xs">
            AI Chatbot Performance Report
          </Badge>
        </div>
        <div className="text-left sm:text-right flex sm:block items-center gap-2">
          <div className="text-sm text-slate-400">Period</div>
          <div className="font-semibold">{formatDate(period.from)}</div>
          <div className="text-slate-400 text-sm">to</div>
          <div className="font-semibold">{formatDate(period.to)}</div>
        </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Summary</h2>
        {totals.pageViews + totals.chatOpens + totals.messagesSent + totals.leadsCaptures === 0 && (
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 mb-4">
            <p className="text-[11px] text-amber-300 leading-relaxed">
              No visitor activity recorded in this period. These metrics come from the chat widget
              installed on the site — they fill in automatically once the snippet is live and visitors
              start browsing. The SEO analysis below is independent and available right away.
            </p>
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className={`w-8 h-8 rounded-lg ${kpi.bg} flex items-center justify-center mb-3`}>
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <div className="text-xs text-slate-400 mt-0.5">{kpi.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 bg-white/5 rounded-xl p-4 border border-white/10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-green-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-green-400">{conversionRate}%</div>
            <div className="text-xs text-slate-400">Chat Conversion Rate (visitors who opened the chat)</div>
          </div>
        </div>
      </div>

      {/* Daily Chart */}
      {dailyData.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Daily Activity</h2>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dailyData.map(d => ({ ...d, day: formatDay(d.day) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff" }}
                />
                <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
                <Line type="monotone" dataKey="pageViews" name="Page Views" stroke="#60a5fa" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="chatOpens" name="Chat Opens" stroke="#a78bfa" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top Pages */}
      {topPages.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Top Pages</h2>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={topPages.map(p => ({ ...p, url: p.url.replace(/^https?:\/\/[^/]+/, "").slice(0, 30) || "/" }))} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis type="category" dataKey="url" tick={{ fill: "#94a3b8", fontSize: 10 }} width={120} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff" }}
                />
                <Bar dataKey="views" name="Views" fill="#60a5fa" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Leads Table */}
      {leads.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Leads Captured ({leads.length})
          </h2>
          <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-3 text-slate-400 font-medium">Name</th>
                  <th className="text-left p-3 text-slate-400 font-medium">Email</th>
                  <th className="text-left p-3 text-slate-400 font-medium hidden sm:table-cell">Company</th>
                  <th className="text-left p-3 text-slate-400 font-medium hidden sm:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, i) => (
                  <tr key={i} className="border-b border-white/5 last:border-0">
                    <td className="p-3">{lead.leadName ?? "—"}</td>
                    <td className="p-3 text-blue-400">{lead.leadEmail ?? "—"}</td>
                    <td className="p-3 text-slate-400 hidden sm:table-cell">{lead.leadCompany ?? "—"}</td>
                    <td className="p-3 text-slate-400 hidden sm:table-cell">
                      {new Date(lead.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* Website SEO Analysis — real measured checks, included in the PDF */}
      {(seo?.breakdown || seoLoading) && (
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Website SEO Analysis</h2>
          {seoLoading && !seo?.breakdown ? (
            <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-sm text-slate-400">
              Analyzing {"the client's"} website…
            </div>
          ) : seo?.breakdown ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="w-16 h-16 rounded-full border-4 flex items-center justify-center flex-shrink-0"
                  style={{ borderColor: seo.breakdown.score >= 80 ? "#34d399" : seo.breakdown.score >= 60 ? "#fbbf24" : "#f87171" }}>
                  <span className="text-xl font-bold">{seo.breakdown.score}</span>
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm">Overall SEO score</div>
                  <div className="text-xs text-slate-400 truncate">{seo.siteUrl}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {seo.breakdown.categories.map((cat) => {
                  const grade = cat.score >= 90 ? "A" : cat.score >= 80 ? "B" : cat.score >= 70 ? "C" : cat.score >= 60 ? "D" : "F";
                  const color = cat.score >= 80 ? "text-emerald-400" : cat.score >= 60 ? "text-amber-400" : "text-red-400";
                  return (
                    <div key={cat.key} className="bg-white/5 rounded-xl p-3 border border-white/10 text-center">
                      <div className={`text-lg font-bold ${color}`}>{grade}</div>
                      <div className="text-[11px] font-medium">{cat.label}</div>
                      <div className="text-[10px] text-slate-500">{cat.score}/100</div>
                    </div>
                  );
                })}
              </div>
              {seo.breakdown.checks.filter((c) => c.status !== "pass").length > 0 && (
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="text-xs font-semibold text-slate-300 mb-2">Top opportunities</div>
                  <div className="space-y-1.5">
                    {seo.breakdown.checks.filter((c) => c.status !== "pass").slice(0, 6).map((c) => (
                      <div key={c.id} className="flex items-start gap-2 text-xs">
                        <span className={`flex-shrink-0 font-bold ${c.status === "fail" ? "text-red-400" : "text-amber-400"}`}>
                          {c.status === "fail" ? "\u2715" : "\u26A0"}
                        </span>
                        <span className="text-slate-300">{c.label}</span>
                        <span className="text-slate-500 ml-auto text-right">{c.detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-white/10 pt-4 flex items-center justify-between text-xs text-slate-500">
        <span>Generated by Lynx AI · lynxaiassistant.com</span>
        <span>{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientReport() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const clientId = parseInt(params.id ?? "0", 10);
  const reportRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const { data, isLoading, error } = trpc.clients.reportData.useQuery(
    { id: clientId },
    { enabled: !!clientId && !isNaN(clientId) }
  );
  // SEO analysis of the client's own website — included in the printed PDF.
  // IMPORTANT: enabled only after reportData arrives, so this slow query
  // (Lighthouse can take 20-40s) travels in its OWN request and never holds
  // the report data hostage inside a shared HTTP batch.
  const { data: seoData, isLoading: seoLoading } = trpc.clients.seoAnalyze.useQuery(
    { clientId },
    { enabled: !!clientId && !isNaN(clientId) && !!data, staleTime: 10 * 60 * 1000, retry: 1 }
  );

  async function handleDownload() {
    if (!data) return;
    setDownloading(true);
    await downloadPDF(reportRef, data.client.name);
    setDownloading(false);
  }

  return (
    <DashboardShell title="Client Report">
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Top bar */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              onClick={() => navigate("/dashboard/clients")}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Clients
            </Button>
            {data && (
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: data.client.brandColor ?? "#3b82f6" }}
                >
                  {data.client.name[0]?.toUpperCase()}
                </div>
                <span className="font-semibold text-sm">{data.client.name}</span>
              </div>
            )}
          </div>
          <Button
            className="lynx-gradient text-white border-0 gap-2"
            onClick={handleDownload}
            disabled={!data || downloading}
          >
            <Download className="w-4 h-4" />
            {downloading ? "Generating..." : "Download PDF"}
          </Button>
        </motion.div>

        {/* Period info */}
        {data && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>Report period: <strong className="text-foreground">{formatDate(data.period.from)}</strong> — <strong className="text-foreground">{formatDate(data.period.to)}</strong></span>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <Card className="glass-card border-border/40">
            <CardContent className="p-8 space-y-4">
              <Skeleton className="h-8 w-48" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
              </div>
              <Skeleton className="h-48 rounded-xl" />
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && (
          <Card className="glass-card border-destructive/30">
            <CardContent className="p-8 text-center">
              <p className="text-destructive">Failed to load report data. Please try again.</p>
            </CardContent>
          </Card>
        )}

        {/* Report */}
        {data && !isLoading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <ReportContent data={data} reportRef={reportRef} seo={seoData ?? null} seoLoading={seoLoading} />
          </motion.div>
        )}

        {/* No data notice */}
        {data && !isLoading && data.totals.pageViews === 0 && (
          <Card className="glass-card border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-4 flex items-start gap-3">
              <Globe className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-400">No data yet for this client</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Make sure the widget snippet is installed on <strong>{data.client.siteUrl}</strong> and visitors have started interacting with it.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardShell>
  );
}
