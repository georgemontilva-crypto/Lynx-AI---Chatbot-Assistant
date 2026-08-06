import { motion } from "framer-motion";
import DashboardShell from "@/components/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from "recharts";
import {
  Users, MousePointerClick, MessageSquare, TrendingUp,
  ArrowUpRight, Globe, Bot, Star, ScanLine, AlertTriangle,
  BarChart2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[200px] gap-2 text-center">
      <BarChart2 className="w-8 h-8 text-muted-foreground/30" />
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export default function Overview() {
  const { data: chatbot, isLoading: chatbotLoading } = trpc.chatbotConfig.get.useQuery();
  const { data: rawConversations, isLoading: convsLoading } = trpc.conversations.list.useQuery();
  const { data: seoReport, isLoading: seoLoading } = trpc.seo.getReport.useQuery();
  const { data: rawNotifications } = trpc.notifications.list.useQuery();
  const { data: analyticsData, isLoading: analyticsLoading } = trpc.analytics.weekly.useQuery();

  const conversations = rawConversations ?? [];
  const notifications = rawNotifications ?? [];
  const visitData = analyticsData?.visits ?? [];
  const clickData = analyticsData?.clicks ?? [];

  const hasVisitData = visitData.some((d) => d.visits > 0 || d.chats > 0);
  const hasClickData = clickData.length > 0;

  const totalChats = conversations.length;
  const leads = conversations.filter((c: any) => c.isLead).length;
  const ratedConvs = conversations.filter((c: any) => c.satisfactionRating);
  const avgRating = ratedConvs.length > 0
    ? (ratedConvs.reduce((sum: number, c: any) => sum + (c.satisfactionRating ?? 0), 0) / ratedConvs.length).toFixed(1)
    : "—";
  const unreadNotifs = notifications.filter((n: any) => !n.isRead).length;

  const isLoading = chatbotLoading || convsLoading || seoLoading;

  const kpis = [
    { title: "Total chats", value: isLoading ? "—" : totalChats.toString(), change: "+0%", positive: true, icon: MessageSquare, color: "text-blue-400", bg: "bg-blue-500/10" },
    { title: "Leads captured", value: isLoading ? "—" : leads.toString(), change: "+0%", positive: true, icon: Users, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { title: "Avg. rating", value: isLoading ? "—" : (avgRating === "0.0" ? "—" : avgRating === "—" ? "—" : `${avgRating}/5`), change: "", positive: true, icon: Star, color: "text-yellow-400", bg: "bg-yellow-500/10" },
    { title: "SEO score", value: isLoading ? "—" : (seoReport ? `${seoReport.score}/100` : "—"), change: "", positive: (seoReport?.score ?? 0) >= 70, icon: TrendingUp, color: "text-violet-400", bg: "bg-violet-500/10" },
  ];

  return (
    <DashboardShell title="Overview">
      <div className="space-y-6">
        {/* Setup prompt if no chatbot yet */}
        {!chatbotLoading && !chatbot && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-primary/5 border border-primary/20">
              <div className="w-10 h-10 rounded-xl lynx-gradient flex items-center justify-center shrink-0">
                <ScanLine className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Get started with Lynx AI</p>
                <p className="text-xs text-muted-foreground">Scan your website to train your chatbot and unlock all features.</p>
              </div>
              <Link href="/dashboard/scanner">
                <Button size="sm" className="lynx-gradient text-white border-0 shrink-0">Scan my site</Button>
              </Link>
            </div>
          </motion.div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, duration: 0.5 }}>
              <Card className="glass-card border-border/40">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-9 h-9 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                      <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                    </div>
                    {kpi.change && (
                      <span className={`text-xs flex items-center gap-0.5 ${kpi.positive ? "text-emerald-400" : "text-red-400"}`}>
                        <ArrowUpRight className="w-3 h-3" />{kpi.change}
                      </span>
                    )}
                  </div>
                  {isLoading ? (
                    <Skeleton className="h-7 w-16 mb-1" />
                  ) : (
                    <div className="text-2xl font-bold">{kpi.value}</div>
                  )}
                  <div className="text-xs text-muted-foreground">{kpi.title}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Visits + Chats area chart */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }} className="lg:col-span-2">
            <Card className="glass-card border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />Visits & chats this week
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <Skeleton className="h-[200px] w-full rounded-xl" />
                ) : !hasVisitData ? (
                  <EmptyChart label="No visit data yet. Install the Lynx AI snippet on your site to start tracking." />
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={visitData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradVisits" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradChats" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: 12 }} />
                      <Area type="monotone" dataKey="visits" stroke="#3b82f6" strokeWidth={2} fill="url(#gradVisits)" name="Visits" />
                      <Area type="monotone" dataKey="chats" stroke="#8b5cf6" strokeWidth={2} fill="url(#gradChats)" name="Chats" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Clicks by page */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}>
            <Card className="glass-card border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <MousePointerClick className="w-4 h-4 text-primary" />Clicks by page
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <Skeleton className="h-[200px] w-full rounded-xl" />
                ) : !hasClickData ? (
                  <EmptyChart label="No click data yet. Data will appear as visitors interact with your chatbot." />
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={clickData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="page" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: 12 }} />
                      <Bar dataKey="clicks" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Clicks" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Bottom row: chatbot status + recent notifications */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Chatbot status */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}>
            <Card className="glass-card border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary" />Chatbot status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {chatbotLoading ? (
                  <Skeleton className="h-16 w-full rounded-xl" />
                ) : chatbot ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{chatbot.name ?? "Lynx AI"}</span>
                      <Badge className={`text-xs ${chatbot.isActive ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-muted/30 text-muted-foreground"}`}>
                        {chatbot.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {chatbot.siteUrl && (
                      <div className="text-xs text-muted-foreground font-mono truncate">{chatbot.siteUrl}</div>
                    )}
                    {chatbot.siteContext ? (
                      <div className="text-xs text-muted-foreground bg-muted/20 rounded-lg p-2 line-clamp-3">{chatbot.siteContext.slice(0, 120)}...</div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No site context yet. Scan your site to train the chatbot.</p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">No chatbot configured yet.</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent notifications */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.5 }}>
            <Card className="glass-card border-border/40">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-primary" />Recent alerts
                  </CardTitle>
                  {unreadNotifs > 0 && (
                    <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">{unreadNotifs} new</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {notifications.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No alerts yet. They will appear here when leads are captured or issues are found.</p>
                ) : (
                  <div className="space-y-2">
                    {(notifications as any[]).slice(0, 4).map((n: any) => (
                      <div key={n.id} className={`flex items-start gap-2 p-2 rounded-lg ${!n.isRead ? "bg-primary/5" : ""}`}>
                        <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-primary" style={{ opacity: n.isRead ? 0.2 : 1 }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{n.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                        </div>
                      </div>
                    ))}
                    <Link href="/dashboard/notifications">
                      <button className="text-xs text-primary hover:underline mt-1">View all notifications</button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </DashboardShell>
  );
}
