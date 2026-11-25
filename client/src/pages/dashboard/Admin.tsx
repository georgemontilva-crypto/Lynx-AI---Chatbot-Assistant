import { useEffect, useState } from "react";
import { SiteBrandingCard } from "@/components/dashboard/SiteBrandingCard";
import DashboardShell from "@/components/DashboardShell";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { clearPlanCache } from "@/hooks/usePlanFeatures";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Users, CreditCard, MessageSquare, ShieldAlert,
  Search, Ban, CheckCircle, Crown, RefreshCw,
  Rocket, Globe, Phone, Mail, ExternalLink, DollarSign, Calendar,
  Receipt, Loader2, AlertTriangle,
} from "lucide-react";

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  cloud:       { label: "Cloud AI",    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  embedded:    { label: "Embedded AI", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  whitelabel:  { label: "White-Label", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  free:        { label: "Free",        color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
};

export default function Admin() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  // Live PayPal lookup for one user, on demand. The local row only reflects
  // what webhooks delivered, so this is how you tell a real charge from a
  // stale "active".
  const [payPalUserId, setPayPalUserId] = useState<number | null>(null);
  const payPalQuery = trpc.admin.subscriptionDetails.useQuery(
    { userId: payPalUserId ?? 0 },
    { enabled: payPalUserId !== null, retry: false }
  );
  // Charging the outstanding balance moves money, so it takes two clicks: the
  // second one names the exact amount.
  const [confirmingCharge, setConfirmingCharge] = useState(false);
  const chargeOutstanding = trpc.admin.chargeOutstanding.useMutation({
    onSettled: () => {
      setConfirmingCharge(false);
      payPalQuery.refetch();
    },
  });
  // Cancelling cannot be undone, so it also takes two clicks.
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const cancelNow = trpc.admin.cancelSubscriptionNow.useMutation({
    onSettled: () => {
      setConfirmingCancel(false);
      payPalQuery.refetch();
      utils.admin.listUsers.invalidate();
    },
  });
  useEffect(() => {
    setConfirmingCharge(false);
    setConfirmingCancel(false);
    chargeOutstanding.reset();
    cancelNow.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payPalUserId]);

  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [newPlan, setNewPlan] = useState<string>("");

  // Redirect if not admin
  if (user && user.role !== "admin") {
    navigate("/dashboard");
    return null;
  }

  const utils = trpc.useUtils();

  const { data: stats, isLoading: statsLoading } = trpc.admin.stats.useQuery();
  const { data: webSetupData, isLoading: webSetupLoading } = trpc.webSetup.adminList.useQuery();
  const updateWebSetupStatusMutation = trpc.webSetup.adminUpdateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      utils.webSetup.adminList.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const { data: usersData, isLoading: usersLoading } = trpc.admin.listUsers.useQuery({
    limit: 100,
    search: search || undefined,
  });

  const updatePlanMutation = trpc.admin.updatePlan.useMutation({
    onSuccess: () => {
      toast.success("Plan updated successfully");
      utils.admin.listUsers.invalidate();
      utils.admin.stats.invalidate();
      clearPlanCache(); // Force immediate refetch of plan features for current user
      setPlanDialogOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  // Extra White-Label client slots (how a sold client pack gets applied).
  const [extraSlots, setExtraSlots] = useState("0");
  const setSlotsMutation = trpc.admin.setClientSlots.useMutation({
    onSuccess: () => utils.admin.listUsers.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  const toggleBanMutation = trpc.admin.toggleBan.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.banned ? "User banned" : "User unbanned");
      utils.admin.listUsers.invalidate();
      utils.admin.stats.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateRoleMutation = trpc.admin.updateRole.useMutation({
    onSuccess: () => {
      toast.success("Role updated");
      utils.admin.listUsers.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const statCards = [
    { label: "Total Users",          value: stats?.totalUsers ?? 0,            icon: Users,         color: "text-blue-500",  format: "number" },
    { label: "Active Subscriptions", value: stats?.activeSubscriptions ?? 0,  icon: CreditCard,    color: "text-green-500", format: "number" },
    { label: "Monthly Revenue",      value: stats?.mrr ?? 0,                   icon: DollarSign,    color: "text-emerald-500", format: "currency" },
    { label: "New (7 days)",         value: stats?.recentSignups ?? 0,         icon: MessageSquare, color: "text-purple-500", format: "number" },
  ];

  return (
    <DashboardShell title="Admin Panel">
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Crown className="w-6 h-6 text-yellow-500" />
            Admin Panel
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage all Lynx AI users, plans, and activity
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            utils.admin.stats.invalidate();
            utils.admin.listUsers.invalidate();
            utils.webSetup.adminList.invalidate();
            toast.success("Data refreshed");
          }}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Portal branding */}
      <SiteBrandingCard />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                {statsLoading ? (
                  <Skeleton className="h-6 w-12" />
                ) : (
                  <p className="text-2xl font-bold">
                    {s.format === "currency"
                      ? `$${s.value.toLocaleString()}`
                      : s.value.toLocaleString()}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Plan distribution */}
      {stats && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Plan Distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {Object.entries(stats.planBreakdown ?? {}).map(([plan, count]) => {
              const p = PLAN_LABELS[plan] ?? { label: plan, color: "bg-gray-100 text-gray-600" };
              return (
                <div key={plan} className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 ${p.color}`}>
                  <span>{p.label}</span>
                  <span className="font-bold">{count as number}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Users table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>Users</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                className="pl-9 h-8 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {usersLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Messages</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Next Renewal</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(usersData?.users ?? []).map((u: any) => {
                    const planInfo = PLAN_LABELS[u.plan ?? "free"] ?? PLAN_LABELS.free;
                    return (
                      <TableRow key={u.id} className={u.isBanned ? "opacity-50" : ""}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {(u.name ?? u.email ?? "?")[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium leading-none">{u.name ?? "—"}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{u.email ?? u.openId}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${planInfo.color}`}>
                            {planInfo.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.role === "admin" ? "default" : "secondary"} className="text-xs">
                            {u.role ?? "user"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {(u.messagesThisMonth ?? 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {u.isBanned ? (
                            <span className="flex items-center gap-1 text-xs text-red-500">
                              <Ban className="w-3 h-3" /> Banned
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-green-500">
                              <CheckCircle className="w-3 h-3" /> Active
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {u.nextBillingDate ? (
                            <span className="flex items-center gap-1 text-blue-500">
                              <Calendar className="w-3 h-3" />
                              {new Date(u.nextBillingDate).toLocaleDateString()}
                            </span>
                          ) : u.plan !== "free" ? (
                            <span className="text-muted-foreground">—</span>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Change plan */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                setSelectedUser(u);
                                setNewPlan(u.plan ?? "free");
                                setExtraSlots(String(u.clientSlots ?? 0));
                                setPlanDialogOpen(true);
                              }}
                            >
                              <CreditCard className="w-3 h-3 mr-1" />
                              Plan
                            </Button>
                            {/* Live PayPal status */}
                            {u.subscriptionId && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-blue-400 hover:text-blue-300"
                                onClick={() => setPayPalUserId(u.id)}
                                title="Check the real subscription status in PayPal"
                              >
                                {payPalUserId === u.id && payPalQuery.isFetching
                                  ? <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  : <Receipt className="w-3 h-3 mr-1" />}
                                PayPal
                              </Button>
                            )}
                            {/* Toggle role */}
                            {u.id !== user?.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() =>
                                  updateRoleMutation.mutate({
                                    userId: u.id,
                                    role: u.role === "admin" ? "user" : "admin",
                                  })
                                }
                              >
                                <Crown className="w-3 h-3 mr-1" />
                                {u.role === "admin" ? "Demote" : "Promote"}
                              </Button>
                            )}
                            {/* Ban/Unban */}
                            {u.id !== user?.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-7 text-xs ${u.isBanned ? "text-green-600" : "text-red-600"}`}
                                onClick={() =>
                                  toggleBanMutation.mutate({ userId: u.id, banned: !u.isBanned })
                                }
                              >
                                <Ban className="w-3 h-3 mr-1" />
                                {u.isBanned ? "Unban" : "Ban"}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(usersData?.users ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No users found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Web Setup Requests */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Rocket className="w-5 h-5 text-violet-500" />
              Web Setup Requests
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => utils.webSetup.adminList.invalidate()}>
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {webSetupLoading ? (
            <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : !webSetupData?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Rocket className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No web setup requests yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business</TableHead>
                    <TableHead className="hidden md:table-cell">Contact</TableHead>
                    <TableHead className="hidden lg:table-cell">Domain</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webSetupData.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{req.businessName}</p>
                          {req.businessType && <p className="text-xs text-muted-foreground">{req.businessType}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="space-y-0.5">
                          {req.contactEmail && (
                            <a href={`mailto:${req.contactEmail}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                              <Mail className="w-3 h-3" />{req.contactEmail}
                            </a>
                          )}
                          {req.contactPhone && (
                            <p className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="w-3 h-3" />{req.contactPhone}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {req.websiteDomain ? (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Globe className="w-3 h-3" />{req.websiteDomain}
                          </span>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {({
                          pending:     <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">Pending</span>,
                          in_progress: <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">In Progress</span>,
                          delivered:   <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">Delivered</span>,
                          cancelled:   <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">Cancelled</span>,
                        } as Record<string, React.ReactNode>)[req.status]}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={req.status}
                          onValueChange={(val) =>
                            updateWebSetupStatusMutation.mutate({ id: req.id, status: val as any })
                          }
                        >
                          <SelectTrigger className="h-7 text-xs w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change Plan Dialog */}
      {/* Live PayPal subscription state, plus the one action that charges: the outstanding balance */}
      <Dialog open={payPalUserId !== null} onOpenChange={(o) => !o && setPayPalUserId(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto [&>*]:min-w-0 break-words">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Receipt className="w-4 h-4 text-blue-400" />
              Subscription status in PayPal
            </DialogTitle>
          </DialogHeader>

          {payPalQuery.isFetching && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Checking with PayPal…
            </p>
          )}

          {payPalQuery.error && (
            <div className="rounded-xl border border-red-400/30 bg-red-400/10 p-3">
              <p className="text-xs text-red-400">{payPalQuery.error.message}</p>
            </div>
          )}

          {payPalQuery.data && !payPalQuery.isFetching && (
            cancelNow.data?.cancelled ? (
              <p className="text-xs text-emerald-400 leading-relaxed py-2">
                {cancelNow.data.subscriptionId} was cancelled in PayPal. The account is now on the Free plan and can
                subscribe again from its Billing page.
              </p>
            ) : payPalQuery.data.hasSubscription === false ? (
              <p className="text-sm text-muted-foreground">
                This user has no PayPal subscription on file — their plan was set manually, so nothing is charged automatically.
              </p>
            ) : (
              <div className="space-y-3">
                {/* The headline: what PayPal says right now */}
                <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">PayPal says</span>
                    <span className={`text-sm font-semibold ${
                      payPalQuery.data.status === "ACTIVE" ? "text-emerald-400"
                        : payPalQuery.data.status === "SUSPENDED" ? "text-amber-400"
                        : "text-red-400"
                    }`}>
                      {payPalQuery.data.status}
                    </span>
                  </div>
                  {payPalQuery.data.pausedForNonPayment ? (
                    <p className="text-[11px] text-amber-400 mt-2 flex items-start gap-1.5">
                      <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                      Lynx paused this account: its payment is more than 3 days late. It resumes by itself as soon as
                      PayPal collects the payment.
                    </p>
                  ) : payPalQuery.data.localStatus &&
                    payPalQuery.data.status.toLowerCase() !== payPalQuery.data.localStatus && (
                    <p className="text-[11px] text-amber-400 mt-2 flex items-start gap-1.5">
                      <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                      Your dashboard says "{payPalQuery.data.localStatus}" — the webhook never updated it.
                    </p>
                  )}
                </div>

                <div className="space-y-1.5 text-xs">
                  {[
                    ["Last payment", payPalQuery.data.lastPaymentTime
                      ? `${new Date(payPalQuery.data.lastPaymentTime).toLocaleDateString()}${payPalQuery.data.lastPaymentAmount ? ` · ${payPalQuery.data.lastPaymentAmount}` : ""}`
                      : "No payment recorded"],
                    ["Next charge", payPalQuery.data.nextBillingTime
                      ? new Date(payPalQuery.data.nextBillingTime).toLocaleDateString()
                      : "Not scheduled"],
                    ["Outstanding balance", payPalQuery.data.outstandingBalance ?? "—"],
                    ["Failed payments", payPalQuery.data.failedPaymentsCount != null
                      ? String(payPalQuery.data.failedPaymentsCount) : "—"],
                    ["Last failure", payPalQuery.data.lastFailedTime
                      ? new Date(payPalQuery.data.lastFailedTime).toLocaleDateString() : "—"],
                    ["Subscription ID", payPalQuery.data.subscriptionId ?? "—"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-start justify-between gap-3 py-1 border-b border-border/20 last:border-0">
                      <span className="text-muted-foreground shrink-0">{label}</span>
                      <span className="font-mono text-[11px] text-right break-all">{value}</span>
                    </div>
                  ))}
                </div>

                {payPalQuery.data.statusChangeNote && (
                  <p className="text-[11px] text-muted-foreground">
                    PayPal note: {payPalQuery.data.statusChangeNote}
                  </p>
                )}

                {(payPalQuery.data.failedPaymentsCount ?? 0) > 0 && (
                  <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3">
                    <p className="text-[11px] text-amber-400 leading-relaxed">
                      A charge was declined. PayPal retries by itself every 5 days, twice per billing period. If the
                      customer has fixed their payment method, you can charge the outstanding balance now instead of
                      waiting.
                    </p>
                  </div>
                )}

                {/* Due date passed, but PayPal has not turned it into a balance yet */}
                {payPalQuery.data.nextBillingTime &&
                  new Date(payPalQuery.data.nextBillingTime).getTime() < Date.now() &&
                  !(Number.parseFloat(payPalQuery.data.outstandingValue ?? "0") > 0) && (
                  <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3">
                    <p className="text-[11px] text-amber-400 leading-relaxed">
                      The charge due on {new Date(payPalQuery.data.nextBillingTime).toLocaleDateString()} has not gone
                      through, and PayPal has not recorded it as an outstanding balance yet. PayPal retries a failed
                      charge every 5 days, twice, before adding it to the balance — until then there is nothing to
                      charge from here. The customer can settle it sooner by updating the payment method in their own
                      PayPal account.
                    </p>
                  </div>
                )}

                {/* Send the charge again: collect the outstanding balance now */}
                {payPalQuery.data.outstandingValue && Number.parseFloat(payPalQuery.data.outstandingValue) > 0 && (
                  <div className="rounded-xl border border-border/40 bg-muted/20 p-3 space-y-2.5">
                    <p className="text-xs leading-relaxed">
                      This customer owes <span className="font-semibold">{payPalQuery.data.outstandingBalance}</span>.
                      Charging it asks PayPal to collect that amount from the payment method on their subscription.
                    </p>
                    {!confirmingCharge ? (
                      <Button size="sm" onClick={() => { chargeOutstanding.reset(); setConfirmingCharge(true); }}>
                        Charge {payPalQuery.data.outstandingBalance} now
                      </Button>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          disabled={chargeOutstanding.isPending}
                          onClick={() =>
                            payPalUserId !== null &&
                            chargeOutstanding.mutate({
                              userId: payPalUserId,
                              confirmAmount: (payPalQuery.data as { outstandingBalance?: string } | undefined)?.outstandingBalance ?? "",
                            })
                          }
                        >
                          {chargeOutstanding.isPending ? (
                            <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Charging…</>
                          ) : (
                            <>Confirm: charge {payPalQuery.data.outstandingBalance}</>
                          )}
                        </Button>
                        <Button size="sm" variant="outline" disabled={chargeOutstanding.isPending} onClick={() => setConfirmingCharge(false)}>
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {chargeOutstanding.data?.charged === true && (
                  <p className="text-xs text-emerald-400 leading-relaxed">
                    {chargeOutstanding.data.pending ? "PayPal accepted the charge of " : "Charged "}
                    {chargeOutstanding.data.amount}
                    {chargeOutstanding.data.pending ? " and is still processing it." : "."}
                    {chargeOutstanding.data.reactivated ? " The subscription was reactivated." : ""}
                    {" "}PayPal now says {chargeOutstanding.data.subscriptionStatus}.
                  </p>
                )}
                {chargeOutstanding.data?.charged === false && (
                  <p className="text-xs text-red-400 leading-relaxed">
                    PayPal did not complete the charge of {chargeOutstanding.data.amount}: {chargeOutstanding.data.reason}{" "}
                    Nothing was collected. The customer has to update the payment method in their own PayPal account;
                    then charge again.
                  </p>
                )}
                {chargeOutstanding.error && (
                  <p className="text-xs text-red-400 leading-relaxed">{chargeOutstanding.error.message}</p>
                )}

                {/* Cancel the subscription now, so the customer can subscribe again */}
                {payPalQuery.data.status !== "CANCELLED" && payPalQuery.data.status !== "EXPIRED" && (
                  <div className="rounded-xl border border-border/40 p-3 space-y-2.5">
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Cancel this subscription in PayPal right away. PayPal stops trying to charge it, the account goes
                      back to the Free plan, and the customer can subscribe again from their Billing page.
                    </p>
                    {!confirmingCancel ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-400"
                        onClick={() => { cancelNow.reset(); setConfirmingCancel(true); }}
                      >
                        Cancel subscription now
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-red-400">
                          This cannot be undone. {payPalQuery.data.subscriptionId} will be cancelled for good.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            className="bg-red-600 hover:bg-red-600/90 text-white"
                            disabled={cancelNow.isPending}
                            onClick={() =>
                              payPalUserId !== null &&
                              cancelNow.mutate({
                                userId: payPalUserId,
                                confirmSubscriptionId:
                                  (payPalQuery.data as { subscriptionId?: string } | undefined)?.subscriptionId ?? "",
                              })
                            }
                          >
                            {cancelNow.isPending ? (
                              <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Cancelling…</>
                            ) : (
                              <>Yes, cancel it</>
                            )}
                          </Button>
                          <Button size="sm" variant="outline" disabled={cancelNow.isPending} onClick={() => setConfirmingCancel(false)}>
                            Keep it
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {cancelNow.error && (
                  <p className="text-xs text-red-400 leading-relaxed">{cancelNow.error.message}</p>
                )}
              </div>
            )
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayPalUserId(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Changing plan for <strong>{selectedUser?.name ?? selectedUser?.email}</strong>
            </p>
            <Select value={newPlan} onValueChange={setNewPlan}>
              <SelectTrigger>
                <SelectValue placeholder="Select plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free trial — 50 msg/mo</SelectItem>
                <SelectItem value="cloud">Cloud AI — 500 msg/mo</SelectItem>
                <SelectItem value="embedded">Embedded AI — 2,000 msg/mo</SelectItem>
                <SelectItem value="whitelabel">White-Label — 8,000 msg/mo + 15 clients</SelectItem>
              </SelectContent>
            </Select>
            {newPlan === "whitelabel" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Extra client slots</label>
                <input
                  type="number"
                  min={0}
                  max={1000}
                  value={extraSlots}
                  onChange={(e) => setExtraSlots(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  On top of the 15 included. Set this when the account buys a client pack
                  (e.g. 15, 30, 60 or 100). Total allowed: {15 + (Number(extraSlots) || 0)} client sites.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (newPlan === "whitelabel") {
                  setSlotsMutation.mutate({
                    userId: selectedUser.id,
                    clientSlots: Math.max(0, Math.min(1000, Math.floor(Number(extraSlots) || 0))),
                  });
                }
                updatePlanMutation.mutate({ userId: selectedUser.id, plan: newPlan as any });
              }}
              disabled={updatePlanMutation.isPending}
            >
              {updatePlanMutation.isPending ? "Saving..." : "Save Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </DashboardShell>
  );
}
