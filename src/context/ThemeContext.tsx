import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

export type ThemePreference = "system" | "light" | "dark";

interface ThemeContextValue {
  preference: ThemePreference;
  resolvedTheme: "light" | "dark";
  cycleTheme: () => void;
}

const storageKey = "overmindv-theme";
const ThemeContext = createContext<ThemeContextValue | null>(null);

// ThemeProvider применяет системную или выбранную пользователем цветовую тему.
export function ThemeProvider({ children }: PropsWithChildren) {
  const [preference, setPreference] = useState<ThemePreference>(() => {
    const stored = localStorage.getItem(storageKey);

    return stored === "light" || stored === "dark" ? stored : "light";
  });
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">(() =>
    window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark",
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: light)");
    const update = () => setSystemTheme(query.matches ? "light" : "dark");
    query.addEventListener("change", update);

    return () => query.removeEventListener("change", update);
  }, []);

  const resolvedTheme = preference === "system" ? systemTheme : preference;

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  const value = useMemo<ThemeContextValue>(() => ({
    preference,
    resolvedTheme,
    cycleTheme: () => {
      // Каждое нажатие переключает видимую тему: тёмная ↔ светлая.
      const next: ThemePreference = resolvedTheme === "dark" ? "light" : "dark";
      setPreference(next);
      localStorage.setItem(storageKey, next);
    },
  }), [preference, resolvedTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// useTheme возвращает текущую тему и функцию последовательного переключения.
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");

  return context;
}
