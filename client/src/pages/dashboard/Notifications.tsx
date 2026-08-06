import { useState } from "react";
import { motion } from "framer-motion";
import DashboardShell from "@/components/DashboardShell";
import UpgradeGate from "@/components/UpgradeGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Bell, UserPlus, Star, AlertTriangle, CheckCircle, Clock, Settings, Inbox, ScanLine } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type NotifRow = {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
};

const typeConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  new_lead: { icon: UserPlus, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  low_rating: { icon: Star, color: "text-yellow-400", bg: "bg-yellow-500/10" },
  seo_issue: { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10" },
  scan_complete: { icon: ScanLine, color: "text-blue-400", bg: "bg-blue-500/10" },
  default: { icon: Bell, color: "text-primary", bg: "bg-primary/10" },
};

function timeAgo(date: Date) {
  try { return formatDistanceToNow(date, { addSuffix: true }); } catch { return "recently"; }
}

function NotificationsContent() {
  const [alertConfig, setAlertConfig] = useState({
    newLead: true,
    lowRating: true,
    seoIssue: true,
    scanComplete: true,
    weeklyReport: false,
  });

  const { data: rawNotifications, isLoading } = trpc.notifications.list.useQuery();
  const utils = trpc.useUtils();

  const markReadMutation = trpc.notifications.markRead.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  });

  const notifications: NotifRow[] = (rawNotifications ?? []) as NotifRow[];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markRead = (id: number) => markReadMutation.mutate({ id });
  const markAllRead = () => notifications.filter((n) => !n.isRead).forEach((n) => markRead(n.id));

  return (
    <DashboardShell title="Notifications">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Notifications list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">Notifications</h2>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                Mark all as read
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
            </div>
          ) : notifications.length === 0 ? (
            <div className="glass-card rounded-2xl p-10 text-center">
              <Inbox className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No notifications yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Notifications appear here when leads are captured, ratings are received or SEO issues are found.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notif, i) => {
                const tc = typeConfig[notif.type] ?? typeConfig.default;
                return (
                  <motion.div key={notif.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.3 }}
                    onClick={() => !notif.isRead && markRead(notif.id)}
                    className={`p-4 rounded-xl cursor-pointer transition-all duration-200 border ${notif.isRead ? "glass-card border-border/30 opacity-60" : "glass-card border-border/40 hover:border-primary/20"}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg ${tc.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                        <tc.icon className={`w-4 h-4 ${tc.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{notif.title}</span>
                          {!notif.isRead && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{notif.message}</p>
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />{timeAgo(notif.createdAt)}
                        </div>
                      </div>
                      {notif.isRead && <CheckCircle className="w-4 h-4 text-muted-foreground/40 shrink-0" />}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Alert settings */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 0.5 }}>
          <Card className="glass-card border-border/40 sticky top-20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" />Alert preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "newLead", label: "New lead captured", desc: "When a visitor leaves their email", icon: UserPlus, color: "text-emerald-400" },
                { key: "lowRating", label: "Low rating received", desc: "When you receive 1 or 2 stars", icon: Star, color: "text-yellow-400" },
                { key: "seoIssue", label: "Critical SEO issue", desc: "When a high-priority issue is found", icon: AlertTriangle, color: "text-red-400" },
                { key: "scanComplete", label: "Scan completed", desc: "When a site re-scan finishes", icon: ScanLine, color: "text-blue-400" },
                { key: "weeklyReport", label: "Weekly report", desc: "Summary of metrics every Monday", icon: CheckCircle, color: "text-violet-400" },
              ].map((item) => (
                <div key={item.key} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-muted/30 flex items-center justify-center shrink-0 mt-0.5">
                    <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </div>
                  <Switch checked={alertConfig[item.key as keyof typeof alertConfig]} onCheckedChange={(v) => setAlertConfig({ ...alertConfig, [item.key]: v })} className="shrink-0" />
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardShell>
  );
}

export default function Notifications() {
  return (
    <UpgradeGate
      feature="notifications"
      requiredPlan="embedded"
      title="Notifications"
      description="Get instant alerts for new leads, low ratings, SEO issues, and weekly reports. Available on Embedded AI and above."
    >
      <NotificationsContent />
    </UpgradeGate>
  );
}
