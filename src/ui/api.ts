import { SAMPLE_HOUSEHOLD, type Household } from "../engine";

const KEY = "prospera:household:v1";

export function loadHousehold(): Household {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...structuredClone(SAMPLE_HOUSEHOLD), ...JSON.parse(raw) };
  } catch {
    /* ignore corrupt storage */
  }
  return structuredClone(SAMPLE_HOUSEHOLD);
}

export function saveHousehold(h: Household) {
  localStorage.setItem(KEY, JSON.stringify(h));
}

const STAGE_KEY = "prospera:stage:v1";
export type Stage = "landing" | "welcome" | "setup" | "app";

export function loadStage(): Stage {
  const s = localStorage.getItem(STAGE_KEY);
  return s === "welcome" || s === "setup" || s === "app" ? s : "landing";
}

export function saveStage(s: Stage) {
  localStorage.setItem(STAGE_KEY, s);
}

export function resetAll() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(STAGE_KEY);
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `Request failed (${r.status})`);
  return data as T;
}

export const api = {
  health: async () => {
    try {
      const r = await fetch("/api/health");
      return (await r.json()) as { ok: boolean; ai: boolean; provider: string | null; model: string | null };
    } catch {
      return { ok: false, ai: false, provider: null, model: null };
    }
  },
  chat: (household: Household, question: string, history: { role: string; content: string }[], language?: string) =>
    post<{ answer: string; toolCalls: { tool: string; input: unknown }[] }>("/api/chat", { household, question, history, language }),
  statement: (text: string, months: number) => post<import("./types").StatementResponse>("/api/statement", { text, months }),
  checkin: (household: Household, actual: Household["expenses"], month: string, emergencySaved: number) =>
    post<import("./types").CheckInRecord>("/api/checkin", { household, actual, month, emergencySaved }),
  checkins: async () => (await fetch("/api/checkins")).json() as Promise<import("./types").CheckInRecord[]>,
  news: async (force = false) => {
    const r = await fetch(`/api/news${force ? "?force=1" : ""}`);
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `Request failed (${r.status})`);
    return data as import("./types").NewsFeed;
  },
  market: (household: Household, force = false) => post<import("../engine").MarketAnalysis>("/api/market", { household, force }),
  briefing: (household: Household, language?: string) =>
    post<{ analysis: import("../engine").MarketAnalysis; briefing: string | null; toolCalls: string[]; error?: string }>("/api/market/briefing", { household, language }),
  forecast: (household: Household, partial: Household["expenses"], month: string, day: number) =>
    post<import("../engine").SpendingForecast>("/api/forecast", { household, partial, month, day }),
  history: async () => (await fetch("/api/history")).json() as Promise<import("../engine").MonthRecord[]>,
  saveHistory: (month: string, expenses: Household["expenses"]) => post<import("../engine").MonthRecord[]>("/api/history", { month, expenses }),
};
