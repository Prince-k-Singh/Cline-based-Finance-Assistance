export type CityTier = "metro" | "large" | "small";
export type JobType = "government" | "private" | "self_employed";
export type RiskAppetite = "low" | "medium" | "high";

export const EXPENSE_CATEGORIES = [
  "housing",
  "food",
  "utilities",
  "transport",
  "education",
  "healthcare",
  "insurance",
  "emis",
  "phoneInternet",
  "clothingHousehold",
  "domesticHelp",
  "eatingOut",
  "entertainment",
  "shopping",
  "subscriptions",
  "travel",
  "festivals",
  "miscellaneous",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type Expenses = Record<ExpenseCategory, number>;

export const HOLDING_TYPES = [
  "cash",
  "fd",
  "debtFunds",
  "gold",
  "property",
  "equityFunds",
  "stocks",
  "retirement",
  "endowment",
] as const;
export type HoldingType = (typeof HOLDING_TYPES)[number];
export type Holdings = Record<HoldingType, number>;

export interface Goal {
  id: string;
  name: string;
  costToday: number;
  years: number;
}

export interface Loan {
  name: string;
  outstanding: number;
  ratePct: number;
  emi: number;
}

export interface Household {
  name?: string;
  age: number;
  cityTier: CityTier;
  earners: 1 | 2;
  jobType: JobType;
  adults: number;
  children: number;
  dependentParents: number;
  netMonthlyIncome: number;
  /** Income of the primary earner (used for job-loss runway). Defaults to full income. */
  primaryEarnerIncome?: number;
  annualBonus: number;
  monthlyInvesting: number;
  riskAppetite: RiskAppetite;
  hasHealthInsurance: boolean;
  healthCover: number;
  termCover: number;
  taxSlabPct: number;
  expenses: Expenses;
  holdings: Holdings;
  goals: Goal[];
  loans: Loan[];
}

export interface BudgetLine {
  category: ExpenseCategory;
  label: string;
  kind: "fixed" | "need" | "want";
  today: number;
  optimised: number;
  bareMinimum: number;
}

export interface BudgetResult {
  lines: BudgetLine[];
  totals: { today: number; optimised: number; bareMinimum: number };
  contingency: number;
  unaccounted: number;
  unaccountedFlag: boolean;
  savingsToday: number;
  savingsOptimised: number;
  wantsCapPct: number;
  emiRatio: number;
}

export interface EmergencyResult {
  months: number;
  reasons: string[];
  monthlyBase: number;
  target: number;
  existing: number;
  gap: number;
  monthsToFill: number | null;
  monthlyContribution: number;
  holding: { savingsAccount: number; liquidOrFd: number };
  runway: { scenario: string; monthlySpend: number; months: number | null }[];
  insurance: {
    termRecommended: number;
    termHave: number;
    termGap: number;
    healthRecommended: number;
    healthHave: number;
    healthGap: number;
  };
}

export interface GoalPlan extends Goal {
  futureCost: number;
  vehicle: string;
  expectedReturnPct: number;
  monthlyNeeded: number;
}

export interface LifestyleResult {
  goals: GoalPlan[];
  totalNeeded: number;
  affordable: number;
  fundedPct: number;
  suggestion: string | null;
  canBuy: { item: string; cost: number; months: number | null }[];
}

export interface VehicleResult {
  price: number;
  downPayment: number;
  loan: number;
  emi: number;
  monthlyRunningCost: number;
  totalMonthly: number;
  limit: number;
  affordable: boolean;
  monthsToSaveDown: number | null;
  maxAffordablePrice: number;
  notes: string[];
}

export interface PortfolioResult {
  total: number;
  current: Record<HoldingType, number>;
  suggested: Record<HoldingType, number>;
  currentPostTaxPct: number;
  currentRealPct: number;
  suggestedPostTaxPct: number;
  suggestedRealPct: number;
  suggestedWorstYearPct: number;
  currentWorstYearPct: number;
  moves: string[];
  flags: string[];
  projections: {
    years: number;
    current: { low: number; base: number; high: number };
    suggested: { low: number; base: number; high: number };
  }[];
}

export interface ScorePart {
  name: string;
  score: number;
  max: number;
  reason: string;
}

export interface WaterfallStep {
  bucket: string;
  amount: number;
  note: string;
}

export interface Plan {
  generatedAt: string;
  assumptionsReviewed: string;
  budget: BudgetResult;
  emergency: EmergencyResult;
  lifestyle: LifestyleResult;
  portfolio: PortfolioResult;
  score: { total: number; parts: ScorePart[] };
  waterfall: WaterfallStep[];
  debtAdvice: string[];
  fi: { target: number; years: number | null; message: string };
  actions: { d30: string[]; d90: string[]; m12: string[] };
}
