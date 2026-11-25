import { Link } from "wouter";
import { CornerDownRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { LynxLogo } from "@/components/LynxLogo";

/**
 * The left half of the sign-in and sign-up pages (hidden on phones).
 *
 * One statement and one real-looking exchange — the same idea as the home
 * page hero, at rest. The two pages used to carry their own copies of a panel
 * with rotating slogans and a decorative bar chart.
 *
 * If an admin set a custom background in Site branding, it is still honoured.
 */
export default function AuthAside({ statement }: { statement: string }) {
  const { data: siteSettings } = trpc.siteSettings.get.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const custom = siteSettings?.authGradient || "";

  return (
    <aside
      className={`hidden lg:flex lg:w-1/2 flex-col justify-between p-12 xl:p-16 ${
        custom ? "text-white" : "dark bg-[oklch(0.165_0.030_262)] text-[oklch(0.955_0.010_262)] border-r border-border"
      }`}
      style={custom ? { background: custom } : undefined}
    >
      <Link href="/" className="self-start rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
        <LynxLogo onDark className="h-9 w-auto object-contain" />
      </Link>

      <div className="max-w-[30rem]">
        <p className="lx-display text-[clamp(2rem,3.2vw,3rem)]">{statement}</p>

        <div className="mt-10 space-y-2.5 text-sm" aria-hidden="true">
          <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-white/15 px-3.5 py-2.5">
            Can I return it if it doesn&rsquo;t fit?
          </div>
          <div className="w-fit max-w-[90%] rounded-2xl rounded-bl-md bg-white/[0.07] px-3.5 py-2.5 leading-relaxed">
            You can, within 30 days as long as it&rsquo;s unworn. We email you a prepaid label.
          </div>
          <div className={`flex items-center gap-1.5 text-xs ${custom ? "text-white/80" : "text-sight"}`}>
            <CornerDownRight className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>
              From <span className="font-mono">/returns</span>
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-6 text-xs opacity-60">
        <span>© 2026 Lynx AI</span>
        <Link href="/legal/privacy" className="hover:opacity-100">Privacy</Link>
        <Link href="/legal/terms" className="hover:opacity-100">Terms</Link>
      </div>
    </aside>
  );
}
