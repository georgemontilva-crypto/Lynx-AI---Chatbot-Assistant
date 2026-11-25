import { Link } from "wouter";
import { LynxLogo } from "@/components/LynxLogo";
import { Reveal } from "./fx";

/**
 * Closing invitation + site footer, shared by every public page. Only links
 * that lead somewhere: the old footer listed Documentation, API, Partners and
 * social profiles that did not exist.
 */
const columns = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "/#how-it-works" },
      { label: "What it knows", href: "/#features" },
      { label: "For agencies", href: "/#whitelabel" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Blog", href: "/blog" },
      { label: "Contact", href: "/contact" },
      { label: "Sign in", href: "/login" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/legal/privacy" },
      { label: "Terms", href: "/legal/terms" },
      { label: "Cookies", href: "/legal/cookies" },
      { label: "Refunds", href: "/legal/refunds" },
    ],
  },
];

export default function Footer() {
  return (
    <>
      <section className="relative isolate overflow-hidden border-t border-border">
        <div className="absolute inset-0 -z-10" aria-hidden="true">
          <div className="lx-aurora lx-aurora-a w-[40rem] h-[40rem] -bottom-72 left-[10%]" />
          <div className="lx-aurora lx-aurora-b w-[30rem] h-[30rem] -top-40 right-[5%]" />
          <div className="lx-grid absolute inset-0" />
        </div>
        <Reveal className="mx-auto max-w-[1240px] px-5 sm:px-8 py-24 sm:py-36">
          <h2 className="lx-display text-[clamp(2.25rem,5vw,4rem)] max-w-[16ch]">
            See what it says about <span className="lx-flow">your own site.</span>
          </h2>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/register" className="lx-btn">
              Start free trial
            </Link>
            <Link href="/contact" className="lx-btn-quiet">
              Talk to us first
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">14 days and 50 messages. No card needed.</p>
        </Reveal>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-[1240px] px-5 sm:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-x-8 gap-y-10">
            <div className="col-span-2 md:col-span-1">
              <LynxLogo slot="footer" className="h-8 w-auto object-contain" />
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground max-w-[18rem]">
                The assistant that answers your visitors from what your own site says.
              </p>
            </div>
            {columns.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <h3 className="text-sm font-semibold">{col.title}</h3>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      {l.href.includes("#") ? (
                        <a href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                          {l.label}
                        </a>
                      ) : (
                        <Link href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                          {l.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
          <div className="mt-12 pt-6 border-t border-border flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>© 2026 Lynx AI. All rights reserved.</span>
            <a href="mailto:support@lynxaiassistant.com" className="hover:text-foreground transition-colors">
              support@lynxaiassistant.com
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
