import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun, Menu, X } from "lucide-react";
import { LynxLogo } from "@/components/LynxLogo";

// Helper: navigate to a hash section — works from any page
function useAnchorNav() {
  const [, navigate] = useLocation();
  return (href: string, closeMobile?: () => void) => {
    if (closeMobile) closeMobile();
    if (href.startsWith("#")) {
      // If already on home, just scroll
      if (window.location.pathname === "/") {
        const el = document.getElementById(href.slice(1));
        if (el) el.scrollIntoView({ behavior: "smooth" });
      } else {
        // Navigate to home then scroll after mount
        navigate("/");
        setTimeout(() => {
          const el = document.getElementById(href.slice(1));
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }, 400);
      }
    } else {
      navigate(href);
    }
  };
}

type NavLink = { label: string; href: string };
const navLinks: NavLink[] = [
  { label: "How it works", href: "#how-it-works" },
  { label: "What it knows", href: "#features" },
  { label: "For agencies", href: "#whitelabel" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

const linkClass =
  "px-3 py-2 text-[0.9375rem] text-muted-foreground hover:text-foreground transition-colors rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const goTo = useAnchorNav();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMobile = () => setMobileOpen(false);
  const themeLabel = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-3 sm:px-5 pt-3">
      {/* A floating glass bar: it tightens and gains a border once you scroll. */}
      <div
        data-solid={scrolled || mobileOpen}
        className={`lx-nav-glass mx-auto max-w-[1240px] rounded-2xl border transition-all duration-300 ${
          scrolled || mobileOpen
            ? "bg-background/75 backdrop-blur-xl border-border shadow-[0_10px_40px_-15px_rgba(0,0,0,0.5)]"
            : "bg-transparent border-transparent"
        }`}
      >
      <div className="px-4 sm:px-5">
        <div className={`flex items-center justify-between transition-[height] duration-300 ${scrolled ? "h-14" : "h-16"}`}>
          <Link href="/" className="flex items-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
            <LynxLogo className="h-8 w-auto object-contain" />
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center">
            {navLinks.map((link) =>
              link.href.startsWith("/") ? (
                <Link key={link.href} href={link.href} className={linkClass}>
                  {link.label}
                </Link>
              ) : (
                <button key={link.href} onClick={() => goTo(link.href)} className={linkClass}>
                  {link.label}
                </button>
              )
            )}
          </div>

          <div className="hidden lg:flex items-center gap-2">
            <button
              onClick={toggleTheme}
              aria-label={themeLabel}
              title={themeLabel}
              className="w-9 h-9 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-2 focus-visible:outline-ring"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link href="/login" className={linkClass + " font-medium text-foreground"}>
              Sign in
            </Link>
            <Link href="/register" className="lx-btn !h-10 !px-4 !text-sm">
              Start free trial
            </Link>
          </div>

          {/* Mobile */}
          <div className="flex lg:hidden items-center gap-1">
            <button
              onClick={toggleTheme}
              aria-label={themeLabel}
              className="w-10 h-10 rounded-md flex items-center justify-center text-muted-foreground"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              className="w-10 h-10 rounded-md flex items-center justify-center text-foreground"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-border">
          <div className="lx-in px-4 sm:px-5 py-4 flex flex-col">
            {navLinks.map((link) =>
              link.href.startsWith("/") ? (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeMobile}
                  className="py-3 text-base text-foreground border-b border-border/60"
                >
                  {link.label}
                </Link>
              ) : (
                <button
                  key={link.href}
                  onClick={() => goTo(link.href, closeMobile)}
                  className="py-3 text-base text-foreground border-b border-border/60 text-left"
                >
                  {link.label}
                </button>
              )
            )}
            <div className="pt-5 grid grid-cols-2 gap-3">
              <Link href="/login" onClick={closeMobile} className="lx-btn-quiet">
                Sign in
              </Link>
              <Link href="/register" onClick={closeMobile} className="lx-btn">
                Start free trial
              </Link>
            </div>
          </div>
        </div>
      )}
      </div>
    </nav>
  );
}
