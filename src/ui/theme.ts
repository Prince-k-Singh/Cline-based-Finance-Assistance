/** Dark/light theme handling. Theme is a user choice stored in localStorage;
 *  first visit falls back to the OS preference. */
export type Theme = "dark" | "light";
const KEY = "parivar-plan:theme:v1";

export function loadTheme(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch { /* storage unavailable */ }
  try {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function saveTheme(t: Theme) {
  try { localStorage.setItem(KEY, t); } catch { /* ignore */ }
}

export function applyTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
}
