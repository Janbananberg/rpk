import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { API_BASE, fetchSiteTheme, saveSiteTheme } from "./components/api";

export type ThemeId = "standard" | "jul";

export interface ThemeOption {
  id: ThemeId;
  label: string;
  description: string;
  /** Colors for the preview swatch in the admin view. */
  swatch: [string, string, string];
}

export const THEMES: ThemeOption[] = [
  { id: "standard", label: "Standard", description: "LKAB:s mörka tema", swatch: ["#0a1a26", "#99ccff", "#1c3344"] },
  { id: "jul", label: "Jul", description: "Granskog, guld och snöfall", swatch: ["#0b1a14", "#f2c14e", "#c8363f"] },
];

const STORAGE_KEY = "rpk-theme";

function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((t) => t.id === value);
}

function readStoredTheme(): ThemeId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isThemeId(stored)) return stored;
  } catch {}
  return "standard";
}

function applyTheme(theme: ThemeId) {
  // The theme overrides color tokens via [data-season] in styles/seasons.css.
  document.documentElement.setAttribute("data-season", theme);
}

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: "standard", setTheme: async () => {} });

/**
 * The chosen theme lives in the backend so the admin picks it for everyone. It is also cached in
 * localStorage, which makes it apply instantly on load — and is the only storage while there is
 * no backend.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(readStoredTheme);

  useEffect(() => applyTheme(theme), [theme]);

  useEffect(() => {
    if (!API_BASE) return;
    fetchSiteTheme().then((remote) => {
      if (!isThemeId(remote)) return;
      setThemeState(remote);
      try { localStorage.setItem(STORAGE_KEY, remote); } catch {}
    });
  }, []);

  const setTheme = useCallback(async (next: ThemeId) => {
    setThemeState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch {}
    if (API_BASE) await saveSiteTheme(next);
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
