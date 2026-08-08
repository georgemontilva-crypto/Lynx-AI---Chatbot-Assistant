import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, Zap, MessageSquare, BarChart3, Globe } from "lucide-react";
import { LynxLogo } from "@/components/LynxLogo";

const LYNX_FEATURES = [
  {
    icon: MessageSquare,
    title: "Conversations that feel human",
    desc: "Your AI consultant greets, qualifies, and recommends — with real personality, not canned replies.",
  },
  {
    icon: BarChart3,
    title: "Know your traffic, not just chats",
    desc: "See real visits, most-viewed pages, and captured leads — all in one live dashboard.",
  },
  {
    icon: Globe,
    title: "Works on any website",
    desc: "One lightweight snippet. Loads on Shopify, WordPress, or custom sites without touching your code.",
  },
  {
    icon: Zap,
    title: "Trained on your business",
    desc: "Feed it your catalog and voice — it recommends the right product with the exact link, every time.",
  },
];

export default function Login() {
  const [, navigate] = useLocation();
  const { data: user, isLoading: authLoading } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [featureIdx, setFeatureIdx] = useState(0);
  const { data: siteSettings } = trpc.siteSettings.get.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const authGradient = siteSettings?.authGradient || "";

  // Rotate through Lynx features with a smooth fade
  useEffect(() => {
    const t = setInterval(() => {
      setFeatureIdx((i) => (i + 1) % LYNX_FEATURES.length);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/dashboard");
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Login failed. Please try again.");
        return;
      }

      window.location.href = "/dashboard";
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex lg:w-1/2 lynx-auth-gradient flex-col justify-between p-12 relative overflow-hidden"
        style={authGradient ? { background: authGradient } : undefined}
      >
        {/* Grid pattern (like the home page) */}
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        {/* Soft glow accents */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-white/5 blur-3xl" />

        <div className="relative z-10">
          <Link href="/">
            <LynxLogo onDark className="h-9 w-auto object-contain" />
          </Link>
        </div>

        {/* Rotating feature with smooth fade */}
        <div className="relative z-10">
          <div className="min-h-[180px]">
            {LYNX_FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="transition-all duration-700 ease-out"
                  style={{
                    opacity: i === featureIdx ? 1 : 0,
                    transform: i === featureIdx ? "translateY(0)" : "translateY(12px)",
                    position: i === featureIdx ? "relative" : "absolute",
                    pointerEvents: i === featureIdx ? "auto" : "none",
                  }}
                >
                  <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center mb-5">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-white text-2xl font-bold mb-3 leading-tight">{f.title}</h2>
                  <p className="text-white/80 text-base leading-relaxed max-w-md">{f.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Mini animated bar chart accent */}
          <div className="flex items-end gap-1.5 h-12 mt-8">
            {[40, 65, 45, 80, 55, 90, 70, 100, 60, 85].map((h, i) => (
              <div
                key={i}
                className="w-2.5 rounded-t bg-white/30"
                style={{
                  height: `${h}%`,
                  animation: `lynxBarPulse 2.4s ease-in-out ${i * 0.12}s infinite`,
                }}
              />
            ))}
          </div>

          {/* Progress dots */}
          <div className="flex gap-2 mt-6">
            {LYNX_FEATURES.map((_, i) => (
              <div
                key={i}
                className="h-1.5 rounded-full transition-all duration-500"
                style={{
                  width: i === featureIdx ? "28px" : "8px",
                  background: i === featureIdx ? "white" : "rgba(255,255,255,0.35)",
                }}
              />
            ))}
          </div>
        </div>

        <div className="relative z-10 flex gap-6 text-white/50 text-xs">
          <span>© 2026 Lynx AI</span>
          <Link href="/legal/privacy" className="hover:text-white/80 transition-colors">
            Privacy
          </Link>
          <Link href="/legal/terms" className="hover:text-white/80 transition-colors">
            Terms
          </Link>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <Link href="/">
            <LynxLogo className="h-8 w-auto object-contain" />
          </Link>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight mb-1">Welcome back</h1>
            <p className="text-muted-foreground text-sm">Sign in to your Lynx AI account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-blue-500 hover:text-blue-600 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full lynx-gradient text-white border-0 h-11 font-semibold"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{" "}
            <Link
              href="/register"
              className="text-blue-500 hover:text-blue-600 font-medium transition-colors"
            >
              Create one free
            </Link>
          </p>

          <div className="mt-8 pt-6 border-t border-border/50 text-center">
            <p className="text-xs text-muted-foreground">
              By signing in, you agree to our{" "}
              <Link
                href="/legal/terms"
                className="hover:text-foreground transition-colors underline underline-offset-2"
              >
                Terms
              </Link>{" "}
              and{" "}
              <Link
                href="/legal/privacy"
                className="hover:text-foreground transition-colors underline underline-offset-2"
              >
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
