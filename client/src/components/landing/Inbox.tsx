import { UserPlus, Star, AlertTriangle, ScanLine } from "lucide-react";

/**
 * What the owner sees on their side. The panel reproduces the real
 * Notifications inbox from the dashboard, with the kinds of entries it
 * actually produces — no invented metrics.
 */
const entries = [
  {
    icon: UserPlus,
    tone: "text-emerald-400",
    title: "New lead via Northwind assistant",
    body: "Dana Whitfield, dana@whitfield.co",
    time: "4 minutes ago",
  },
  {
    icon: ScanLine,
    tone: "text-primary",
    title: "Site scan completed",
    body: "18 pages read, 12 products learned. SEO score: 81/100.",
    time: "Today, 6:00 AM",
  },
  {
    icon: Star,
    tone: "text-yellow-400",
    title: "Low rating on Northwind assistant",
    body: "A visitor rated their conversation 2 stars. Open the transcript to see what went wrong.",
    time: "Yesterday",
  },
  {
    icon: AlertTriangle,
    tone: "text-red-400",
    title: "2 critical SEO issues found",
    body: "Open Graph tags, structured data",
    time: "Yesterday",
  },
];

const points = [
  {
    title: "Every conversation, word for word",
    body: "Read the full transcript behind any visitor, and see how they rated it.",
  },
  {
    title: "Leads with their story attached",
    body: "When a visitor leaves a name and email, you get them together with everything they asked.",
  },
  {
    title: "Told when it matters",
    body: "An email or push for a new lead, a bad rating or when you're near your message limit. Each alert has its own switch.",
  },
  {
    title: "A weekly summary, if you want one",
    body: "Monday morning: last week's conversations, leads, ratings and visits in one email.",
  },
];

export default function Inbox() {
  return (
    <section className="py-20 sm:py-28 border-t border-border">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <div className="grid lg:grid-cols-2 gap-x-16 gap-y-12 items-start">
          <div>
            <h2 className="lx-heading text-[clamp(2rem,4.4vw,3.25rem)] max-w-[16ch]">
              Nothing it says happens behind your back.
            </h2>
            <ul className="mt-10 space-y-7">
              {points.map((p) => (
                <li key={p.title} className="border-l-2 border-border pl-5">
                  <h3 className="font-semibold text-base">{p.title}</h3>
                  <p className="lx-prose mt-1.5 text-[0.9375rem] leading-relaxed text-muted-foreground max-w-[30rem]">
                    {p.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 h-12 flex items-center border-b border-border">
              <span className="text-sm font-semibold">Notifications</span>
              <span className="ml-2 rounded-full bg-primary/15 text-primary text-xs font-medium px-2 py-0.5">2 new</span>
            </div>
            <ul>
              {entries.map((e, i) => (
                <li key={e.title} className={`flex gap-3.5 px-5 py-4 ${i > 0 ? "border-t border-border" : ""}`}>
                  <span className="mt-0.5 w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <e.icon className={`w-4 h-4 ${e.tone}`} strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{e.title}</div>
                    <div className="mt-0.5 text-[0.8125rem] leading-relaxed text-muted-foreground">{e.body}</div>
                    <div className="mt-1.5 text-xs text-muted-foreground/70">{e.time}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
