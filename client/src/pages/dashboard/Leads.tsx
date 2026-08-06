import { useState } from "react";
import { motion } from "framer-motion";
import DashboardShell from "@/components/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Users, Search, Download, Mail, Star, Calendar, Globe, Building2 } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

type LeadRow = {
  id: number;
  leadName: string | null;
  leadEmail: string | null;
  leadCompany: string | null;
  pageUrl: string | null;
  satisfactionRating: number | null;
  createdAt: Date;
};

function timeAgo(date: Date) {
  try { return formatDistanceToNow(date, { addSuffix: true }); } catch { return "recently"; }
}

function exportCsv(leads: LeadRow[]) {
  const header = ["Name", "Email", "Company", "Page", "Rating", "Date"];
  const rows = leads.map((l) => [
    l.leadName ?? "",
    l.leadEmail ?? "",
    l.leadCompany ?? "",
    l.pageUrl ?? "",
    l.satisfactionRating ? String(l.satisfactionRating) : "",
    format(new Date(l.createdAt), "yyyy-MM-dd HH:mm"),
  ]);
  const csv = [header, ...rows].map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `leads-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function LeadsContent() {
  const [search, setSearch] = useState("");

  const { data: rawLeads, isLoading } = trpc.leads.list.useQuery();
  const leads: LeadRow[] = (rawLeads ?? []) as LeadRow[];

  const filtered = leads.filter((l) => {
    const q = search.toLowerCase();
    return (
      (l.leadName ?? "").toLowerCase().includes(q) ||
      (l.leadEmail ?? "").toLowerCase().includes(q) ||
      (l.leadCompany ?? "").toLowerCase().includes(q) ||
      (l.pageUrl ?? "").toLowerCase().includes(q)
    );
  });

  const totalLeads = leads.length;
  const withRating = leads.filter((l) => l.satisfactionRating).length;
  const avgRating = withRating > 0
    ? (leads.reduce((s, l) => s + (l.satisfactionRating ?? 0), 0) / withRating).toFixed(1)
    : "—";

  return (
    <DashboardShell title="Leads">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="glass-card border-border/40">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{totalLeads}</div>
                <div className="text-xs text-muted-foreground">Total leads</div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card border-border/40">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{leads.filter((l) => l.leadEmail).length}</div>
                <div className="text-xs text-muted-foreground">With email</div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card border-border/40">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center shrink-0">
                <Star className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{avgRating}</div>
                <div className="text-xs text-muted-foreground">Avg. rating</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card className="glass-card border-border/40">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Subscriber list
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search leads..."
                    className="pl-9 bg-muted/30 border-border/40 text-sm h-8 w-52"
                  />
                </div>
                {leads.length > 0 && (
                  <Button size="sm" variant="outline" className="h-8 text-xs border-border/40" onClick={() => exportCsv(filtered)}>
                    <Download className="w-3.5 h-3.5 mr-1" />
                    Export CSV
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {leads.length === 0
                    ? "No leads yet. When visitors share their name and email in the widget, they'll appear here."
                    : "No leads match your search."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Nombre</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Email</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">Empresa</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Página</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">Rating</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((lead, i) => (
                      <motion.tr
                        key={lead.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04, duration: 0.25 }}
                        className="border-b border-border/20 hover:bg-muted/20 transition-colors"
                      >
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-semibold text-primary">
                              {(lead.leadName ?? "?")[0].toUpperCase()}
                            </div>
                            <span className="font-medium truncate max-w-[120px]">{lead.leadName ?? "—"}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <a href={`mailto:${lead.leadEmail}`} className="text-primary hover:underline truncate block max-w-[180px]">
                            {lead.leadEmail ?? "—"}
                          </a>
                        </td>
                        <td className="py-2.5 px-3 hidden lg:table-cell">
                          {lead.leadCompany ? (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Building2 className="w-3 h-3 shrink-0" />
                              <span className="truncate max-w-[140px]">{lead.leadCompany}</span>
                            </div>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="py-2.5 px-3 hidden md:table-cell">
                          {lead.pageUrl ? (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Globe className="w-3 h-3 shrink-0" />
                              <span className="truncate max-w-[160px]">{lead.pageUrl.replace(/^https?:\/\//, "")}</span>
                            </div>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="py-2.5 px-3 hidden sm:table-cell">
                          {lead.satisfactionRating ? (
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: 5 }).map((_, j) => (
                                <Star key={j} className={`w-3 h-3 ${j < (lead.satisfactionRating ?? 0) ? "text-yellow-400 fill-yellow-400" : "text-muted/20"}`} />
                              ))}
                            </div>
                          ) : <Badge className="bg-muted/30 text-muted-foreground border-0 text-xs px-1.5 py-0">Sin rating</Badge>}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3 shrink-0" />
                            <span title={format(new Date(lead.createdAt), "PPpp")}>{timeAgo(new Date(lead.createdAt))}</span>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}

export default function Leads() {
  return <LeadsContent />;
}
