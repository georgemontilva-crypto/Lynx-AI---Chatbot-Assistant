import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";

/**
 * Single source of truth for rendering the Lynx logo everywhere in the portal
 * (navbar, footer, admin, auth pages). It swaps the logo image based on the
 * active theme so every logo stays consistent and switches together.
 *
 * If an admin has uploaded a custom menu/footer logo (site settings), that
 * takes precedence over the built-in theme logos.
 *
 * - Default: picks the logo that reads well on the current theme background
 *   (light logo on light bg, dark logo on dark bg).
 * - onDark: force the light/white logo, for panels that always sit on a dark
 *   gradient regardless of theme (e.g. the auth side panel).
 * - slot: which uploaded logo to prefer ("menu" or "footer").
 */
export function LynxLogo({
  className = "h-8 w-auto object-contain",
  onDark = false,
  alt = "Lynx AI",
  slot = "menu",
}: {
  className?: string;
  onDark?: boolean;
  alt?: string;
  slot?: "menu" | "footer";
}) {
  const { theme } = useTheme();
  const { data: settings } = trpc.siteSettings.get.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Custom uploaded logos: pick the light/dark version.
  // - onDark panels always sit on a dark background → use the dark-mode logo.
  // - otherwise follow the active theme.
  const wantDark = onDark || theme === "dark";
  const customMenu = wantDark ? settings?.menuLogoDarkUrl : settings?.menuLogoLightUrl;
  const customFooter = wantDark ? settings?.footerLogoDarkUrl : settings?.footerLogoLightUrl;
  const custom = slot === "footer" ? customFooter : customMenu;

  // "lynx-logo-light.png" is the dark-colored logo (for LIGHT backgrounds).
  // "lynx-logo-dark.png" is the light/white logo (for DARK backgrounds).
  const src = custom
    ? custom
    : onDark
      ? "/brand/lynx-logo-dark.png"
      : theme === "dark"
        ? "/brand/lynx-logo-dark.png"
        : "/brand/lynx-logo-light.png";
  // If the image is missing (no logo uploaded yet and no file in /brand), show
  // the name as text instead of the browser's broken-image icon — a broken
  // logo in the header of every page reads as a broken product.
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    setFailed(false);
    // On a server-rendered page the image can finish failing BEFORE React
    // attaches onError, and the event never reaches us — check the element.
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, [src]);
  if (failed) {
    return (
      <span
        className={`inline-flex items-center lx-heading text-2xl ${
          wantDark ? "text-white" : "text-foreground"
        }`}
      >
        {alt}
      </span>
    );
  }
  return <img ref={imgRef} src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
}

export default LynxLogo;
