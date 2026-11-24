import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme?: () => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

// Only an EXPLICIT choice is remembered. The old key ("lynx-theme") was written
// on every page load with whatever the default happened to be, so it recorded
// defaults as if they were decisions — and would have pinned every returning
// visitor to the previous default forever. A new key starts clean.
const STORAGE_KEY = "lynx-theme-choice";

function getStoredTheme(defaultTheme: Theme): Theme {
  // Only called client-side (inside useEffect), so localStorage is safe
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored === "dark" || stored === "light") return stored;
  } catch { /* storage blocked — fall through */ }
  return defaultTheme;
}

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  switchable = false,
}: ThemeProviderProps) {
  // Always start with defaultTheme on both server and client to avoid
  // hydration mismatch. A stored choice is applied in the effect below.
  const [theme, setTheme] = useState<Theme>(defaultTheme);

  useEffect(() => {
    setTheme(switchable ? getStoredTheme(defaultTheme) : defaultTheme);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run only once on mount

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = switchable
    ? () => {
        setTheme(prev => {
          const next = prev === "light" ? "dark" : "light";
          try { localStorage.setItem(STORAGE_KEY, next); } catch { /* storage blocked */ }
          return next;
        });
      }
    : undefined;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, switchable }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
