import { readThemePreference, resolveTheme, THEME_STORAGE_KEY } from "@/lib/themePreference";
import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

function getInitialTheme(defaultTheme: Theme, switchable: boolean): Theme {
  if (!switchable || typeof window === "undefined") return defaultTheme;
  const stored = readThemePreference(window.localStorage);
  const systemPrefersDark = typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches;
  return resolveTheme(stored, systemPrefersDark, defaultTheme);
}

export function ThemeProvider({ children, defaultTheme = "light", switchable = false }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme(defaultTheme, switchable));

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
    if (switchable) window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme, switchable]);

  const toggleTheme = () => setTheme(previous => previous === "light" ? "dark" : "light");

  return <ThemeContext.Provider value={{ theme, toggleTheme, switchable }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
