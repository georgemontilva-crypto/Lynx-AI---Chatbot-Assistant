import { useState, useEffect } from "react";
import DashboardShell from "@/components/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  User,
  Mail,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  ShieldCheck,
  Bell,
  BellOff,
  BellRing,
  UserPlus,
  Star,
  BarChart3,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { usePushNotifications } from "@/hooks/usePushNotifications";

// ─── Push Notifications Card ─────────────────────────────────────────────────

const PREF_EVENTS = [
  {
    key: "newLead" as const,
    icon: UserPlus,
    label: "New lead captured",
    description: "When a visitor submits their contact info via the chat widget.",
  },
  {
    key: "lowRating" as const,
    icon: Star,
    label: "Low satisfaction rating",
    description: "When a visitor rates the chatbot 1 or 2 stars.",
  },
  {
    key: "usageLimit" as const,
    icon: BarChart3,
    label: "Usage limit warning (80%)",
    description: "When your chatbot reaches 80% of the monthly message quota.",
  },
];

function PushNotificationsCard() {
  const utils = trpc.useUtils();
  const { status, isSupported, isSubscribed, subscribe, unsubscribe } = usePushNotifications();
  const { data: prefs, isLoading: prefsLoading } = trpc.profile.getPushPrefs.useQuery(
    undefined,
    { enabled: isSubscribed }
  );

  // Local optimistic state for toggles
  const [localPrefs, setLocalPrefs] = useState<{ newLead: boolean; lowRating: boolean; usageLimit: boolean } | null>(null);
  useEffect(() => {
    if (prefs) setLocalPrefs(prefs);
  }, [prefs]);

  const updatePrefs = trpc.profile.updatePushPrefs.useMutation({
    onSuccess: () => utils.profile.getPushPrefs.invalidate(),
    onError: () => {
      // Rollback on error
      if (prefs) setLocalPrefs(prefs);
      toast.error("Failed to update notification preferences");
    },
  });

  const handleToggleSubscription = async () => {
    if (isSubscribed) {
      const ok = await unsubscribe();
      if (ok) toast.success("Push notifications disabled");
      else toast.error("Failed to disable push notifications");
    } else {
      const ok = await subscribe();
      if (ok) toast.success("Push notifications enabled!");
      else if (status === "denied") {
        toast.error("Notifications blocked. Please allow them in your browser settings.");
      } else {
        toast.error("Failed to enable push notifications");
      }
    }
  };

  const handlePrefToggle = (key: "newLead" | "lowRating" | "usageLimit", value: boolean) => {
    const current = localPrefs ?? { newLead: true, lowRating: true, usageLimit: true };
    const updated = { ...current, [key]: value };
    setLocalPrefs(updated); // optimistic
    updatePrefs.mutate(updated);
  };

  if (!isSupported) return null;

  const displayPrefs = localPrefs ?? { newLead: true, lowRating: true, usageLimit: true };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BellRing className="w-4 h-4" /> Push Notifications
        </CardTitle>
        <CardDescription>
          Receive instant browser alerts — even when the dashboard is closed. Choose which events trigger a notification.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Master enable/disable toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border">
          <div className="space-y-0.5">
            {isSubscribed ? (
              <p className="text-sm font-medium flex items-center gap-1.5 text-emerald-600">
                <Bell className="w-4 h-4" /> Notifications are enabled
              </p>
            ) : status === "denied" ? (
              <p className="text-sm font-medium flex items-center gap-1.5 text-red-500">
                <BellOff className="w-4 h-4" /> Blocked by browser settings
              </p>
            ) : (
              <p className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground">
                <BellOff className="w-4 h-4" /> Notifications are disabled
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {status === "denied"
                ? "Allow notifications in your browser settings to enable this feature."
                : isSubscribed
                ? "Receiving alerts on this device."
                : "Enable to receive alerts on this device."}
            </p>
          </div>
          <Button
            variant={isSubscribed ? "outline" : "default"}
            size="sm"
            onClick={handleToggleSubscription}
            disabled={status === "loading" || status === "denied"}
            className="shrink-0 ml-4"
          >
            {status === "loading" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isSubscribed ? (
              <><BellOff className="w-4 h-4 mr-1.5" /> Disable</>
            ) : (
              <><Bell className="w-4 h-4 mr-1.5" /> Enable</>
            )}
          </Button>
        </div>

        {/* Granular preferences — only shown when subscribed */}
        {isSubscribed && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Alert types</p>
            {PREF_EVENTS.map(({ key, icon: Icon, label, description }) => (
              <div
                key={key}
                className="flex items-center justify-between py-2.5 px-3 rounded-md hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <Icon className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium leading-none">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                  </div>
                </div>
                <Switch
                  checked={displayPrefs[key]}
                  onCheckedChange={(v) => handlePrefToggle(key, v)}
                  disabled={prefsLoading || updatePrefs.isPending}
                  className="ml-4 shrink-0"
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Profile() {
  const utils = trpc.useUtils();
  const { data: profile, isLoading } = trpc.profile.get.useQuery();

  // ── Update name ─────────────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [nameEdited, setNameEdited] = useState(false);

  const updateName = trpc.profile.updateName.useMutation({
    onSuccess: () => {
      toast.success("Name updated successfully");
      utils.profile.get.invalidate();
      utils.auth.me.invalidate();
      setNameEdited(false);
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Change password ──────────────────────────────────────────────────────────
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const changePassword = trpc.profile.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Password changed successfully");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Resend verification ──────────────────────────────────────────────────────
  const resendVerification = trpc.profile.resendVerification.useMutation({
    onSuccess: (data) => {
      if (data.alreadyVerified) {
        toast.info("Your email is already verified");
      } else {
        toast.success("Verification email sent — check your inbox");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    updateName.mutate({ name: trimmed });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) {
      toast.error("New passwords do not match");
      return;
    }
    if (newPw.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    changePassword.mutate({ currentPassword: currentPw, newPassword: newPw });
  };

  const planLabel: Record<string, string> = {
    cloud: "Cloud AI",
    embedded: "Embedded AI",
    whitelabel: "White-Label AI",
  };

  if (isLoading) {
    return (
      <DashboardShell title="My Profile">
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="My Profile">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* ── Profile header ─────────────────────────────────────────────────── */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarFallback className="text-xl lynx-gradient text-white">
                  {profile?.name?.[0]?.toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-lg font-semibold">{profile?.name ?? "—"}</h2>
                <p className="text-sm text-muted-foreground">{profile?.email ?? "—"}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge variant="secondary" className="text-xs">
                    {planLabel[profile?.plan ?? "cloud"] ?? profile?.plan}
                  </Badge>
                  {profile?.emailVerified ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-600">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-amber-600">
                      <AlertCircle className="w-3.5 h-3.5" /> Email not verified
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Update name ─────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="w-4 h-4" /> Display Name
            </CardTitle>
            <CardDescription>Update the name shown in your dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleNameSubmit} className="flex gap-3">
              <div className="flex-1">
                <Input
                  placeholder={profile?.name ?? "Your name"}
                  value={nameEdited ? name : (profile?.name ?? "")}
                  onChange={(e) => { setName(e.target.value); setNameEdited(true); }}
                />
              </div>
              <Button
                type="submit"
                disabled={updateName.isPending || !nameEdited || !name.trim()}
                className="shrink-0"
              >
                {updateName.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <><Save className="w-4 h-4 mr-1.5" /> Save</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* ── Email & verification ─────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="w-4 h-4" /> Email Address
            </CardTitle>
            <CardDescription>Your login email. Contact support to change it.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Input value={profile?.email ?? ""} readOnly className="bg-muted/40 cursor-not-allowed" />
              {profile?.emailVerified ? (
                <Badge className="shrink-0 bg-emerald-100 text-emerald-700 border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Verified
                </Badge>
              ) : (
                <Badge variant="outline" className="shrink-0 border-amber-300 text-amber-700">
                  <AlertCircle className="w-3.5 h-3.5 mr-1" /> Unverified
                </Badge>
              )}
            </div>
            {!profile?.emailVerified && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => resendVerification.mutate()}
                disabled={resendVerification.isPending}
              >
                {resendVerification.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <ShieldCheck className="w-4 h-4 mr-2" />
                )}
                Resend verification email
              </Button>
            )}
          </CardContent>
        </Card>

        {/* ── Change password ─────────────────────────────────────────────────── */}
        {profile?.loginMethod === "email" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lock className="w-4 h-4" /> Change Password
              </CardTitle>
              <CardDescription>Choose a strong password of at least 8 characters.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="current-pw">Current password</Label>
                  <Input
                    id="current-pw"
                    type="password"
                    placeholder="••••••••"
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>
                <Separator />
                <div className="space-y-1.5">
                  <Label htmlFor="new-pw">New password</Label>
                  <Input
                    id="new-pw"
                    type="password"
                    placeholder="Min. 8 characters"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-pw">Confirm new password</Label>
                  <Input
                    id="confirm-pw"
                    type="password"
                    placeholder="Repeat new password"
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={changePassword.isPending || !currentPw || !newPw || !confirmPw}
                  className="w-full mt-1"
                >
                  {changePassword.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Changing password…</>
                  ) : (
                    <><Lock className="w-4 h-4 mr-2" /> Change password</>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ── Push notifications ───────────────────────────────────────────────── */}
        <PushNotificationsCard />

        {/* ── Account info ─────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Member since</span>
              <span>{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current plan</span>
              <span className="font-medium">{planLabel[profile?.plan ?? "cloud"] ?? profile?.plan}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Login method</span>
              <span className="capitalize">{profile?.loginMethod ?? "email"}</span>
            </div>
          </CardContent>
        </Card>

      </div>
    </DashboardShell>
  );
}
