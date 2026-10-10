import type { CheckIn, Expenses, StatementTxn } from "../engine";

export interface StatementResponse {
  transactions: StatementTxn[];
  summary: {
    expenses: Expenses;
    monthlyIncome: number;
    monthlyInvesting: number;
    unaccounted: number;
    unknownExamples: StatementTxn[];
    recurring: string[];
  };
  aiUsed: boolean;
}

/** Shapes returned by GET /api/news (see server/news.ts). */
export type NewsTopic = "markets" | "money" | "economy";
export interface NewsArticle {
  id: string;
  title: string;
  link: string;
  summary: string;
  image: string | null;
  source: string;
  topic: NewsTopic;
  publishedAt: string | null;
}
export interface Quote {
  symbol: string;
  label: string;
  short: string;
  price: number;
  change: number;
  changePct: number;
  currency: string;
  unit?: string;
  spark: number[];
}
export interface NewsFeed {
  fetchedAt: string;
  source: "live" | "cache" | "fallback";
  articles: NewsArticle[];
  quotes: Quote[];
  notes: string[];
}

export interface CheckInRecord extends CheckIn {
  note: string;
  createdAt: string;
}
