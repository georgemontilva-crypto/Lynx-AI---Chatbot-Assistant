import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
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
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "White-Label", href: "#whitelabel" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const goTo = useAnchorNav();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMobile = () => setMobileOpen(false);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-lg shadow-black/10"
          : "bg-transparent"
      }`}
      style={{ animation: "navSlideDown 0.6s cubic-bezier(0.23,1,0.32,1) both" }}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/">
            <motion.div
              className="flex items-center cursor-pointer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <LynxLogo className="h-9 w-auto object-contain" />
            </motion.div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) =>
              link.href.startsWith("/") ? (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 rounded-lg hover:bg-accent/50"
                >
                  {link.label}
                </Link>
              ) : (
                <button
                  key={link.href}
                  onClick={() => goTo(link.href)}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 rounded-lg hover:bg-accent/50"
                >
                  {link.label}
                </button>
              )
            )}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all duration-200"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-sm">
                Sign in
              </Button>
            </Link>
            <Link href="/register">
              <Button
                size="sm"
                className="lynx-gradient text-white border-0 shadow-lg hover:opacity-90 transition-opacity text-sm font-medium"
              >
                Get started free
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="md:hidden bg-background/95 backdrop-blur-xl border-b border-border/50 overflow-hidden"
          >
            <div className="container px-4 py-4 flex flex-col gap-1">
              {navLinks.map((link) =>
                link.href.startsWith("/") ? (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeMobile}
                    className="px-4 py-3 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    {link.label}
                  </Link>
                ) : (
                  <button
                    key={link.href}
                    onClick={() => goTo(link.href, closeMobile)}
                    className="px-4 py-3 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent/50 transition-colors text-left"
                  >
                    {link.label}
                  </button>
                )
              )}
              <div className="pt-3 flex flex-col gap-2">
                <Link href="/login" onClick={closeMobile}>
                  <Button variant="ghost" size="sm" className="w-full justify-center">
                    Sign in
                  </Button>
                </Link>
                <Link href="/register" onClick={closeMobile}>
                  <Button
                    size="sm"
                    className="w-full lynx-gradient text-white border-0"
                  >
                    Get started free
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
