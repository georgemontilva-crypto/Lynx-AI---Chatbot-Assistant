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

  const custom = slot === "footer" ? settings?.footerLogoUrl : settings?.menuLogoUrl;
  // "lynx-logo-light.png" is the dark-colored logo (for LIGHT backgrounds).
  // "lynx-logo-dark.png" is the light/white logo (for DARK backgrounds).
  const src = custom
    ? custom
    : onDark
      ? "/brand/lynx-logo-dark.png"
      : theme === "dark"
        ? "/brand/lynx-logo-dark.png"
        : "/brand/lynx-logo-light.png";
  return <img src={src} alt={alt} className={className} />;
}

export default LynxLogo;
