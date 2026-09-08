export type ThemePreference = "light" | "dark";
export const THEME_STORAGE_KEY = "civicresolve-theme";

export function readThemePreference(storage: Pick<Storage, "getItem">) {
  const stored = storage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : null;
}

export function resolveTheme(preference: ThemePreference | null, systemPrefersDark: boolean, fallback: ThemePreference = "light"): ThemePreference {
  return preference || (systemPrefersDark ? "dark" : fallback);
}
