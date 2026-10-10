import type { CityTier, ExpenseCategory, HoldingType } from "./types";

/**
 * Every assumption the engine uses lives here so it can be audited and updated
 * without touching calculation code. Values are indicative, NOT advice.
 */
export const ASSUMPTIONS_REVIEWED = "2026-10-10";

export const INFLATION_PCT = 6;
export const GOAL_INFLATION_PCT = 6;
export const CONTINGENCY_PCT = 5;
export const FI_MULTIPLE = 30;
export const HIGH_INTEREST_DEBT_PCT = 11;
export const TERM_COVER_MULTIPLE = 12;

export interface AssetAssumption {
  label: string;
  preTaxPct: number;
  /** "slab" = taxed at income slab, "ltcg" = ~10% effective drag on gains, "none" = tax free */
  tax: "slab" | "ltcg" | "none";
  worstYearPct: number;
  liquidity: "high" | "medium" | "low" | "locked";
  effort: "low" | "medium" | "high";
}

export const ASSETS: Record<HoldingType, AssetAssumption> = {
  cash: { label: "Cash / savings a/c", preTaxPct: 3, tax: "slab", worstYearPct: 0, liquidity: "high", effort: "low" },
  fd: { label: "FDs / RDs", preTaxPct: 6.6, tax: "slab", worstYearPct: 0, liquidity: "medium", effort: "low" },
  debtFunds: { label: "Debt / arbitrage funds", preTaxPct: 7, tax: "slab", worstYearPct: -2, liquidity: "high", effort: "low" },
  gold: { label: "Gold / gold ETF", preTaxPct: 8, tax: "ltcg", worstYearPct: -20, liquidity: "medium", effort: "low" },
  property: { label: "Investment property / land", preTaxPct: 7, tax: "ltcg", worstYearPct: -15, liquidity: "low", effort: "high" },
  equityFunds: { label: "Equity index / flexi-cap funds", preTaxPct: 11, tax: "ltcg", worstYearPct: -35, liquidity: "high", effort: "low" },
  stocks: { label: "Direct stocks", preTaxPct: 10, tax: "ltcg", worstYearPct: -45, liquidity: "high", effort: "high" },
  retirement: { label: "EPF / PPF / NPS", preTaxPct: 8, tax: "none", worstYearPct: -5, liquidity: "locked", effort: "low" },
  endowment: { label: "Endowment / money-back policies", preTaxPct: 5, tax: "none", worstYearPct: 0, liquidity: "locked", effort: "low" },
};

export const LTCG_DRAG_PCT = 10;

/** Monthly per-adult benchmarks (₹) for flexible needs, by city tier. */
export const BENCHMARKS: Record<CityTier, { food: number; utilities: number; transport: number; phoneInternet: number; clothingHousehold: number; rent: number; domesticHelp: number }> = {
  metro: { food: 5500, utilities: 1300, transport: 2200, phoneInternet: 600, clothingHousehold: 1200, rent: 22000, domesticHelp: 6000 },
  large: { food: 4500, utilities: 1000, transport: 1700, phoneInternet: 500, clothingHousehold: 1000, rent: 15000, domesticHelp: 4500 },
  small: { food: 3800, utilities: 800, transport: 1200, phoneInternet: 450, clothingHousehold: 800, rent: 9000, domesticHelp: 3000 },
};

export const HEALTH_COVER_RECOMMENDED: Record<CityTier, number> = {
  metro: 1500000,
  large: 1000000,
  small: 700000,
};

export const CATEGORY_META: Record<ExpenseCategory, { label: string; kind: "fixed" | "need" | "want"; minKeepShare?: number }> = {
  housing: { label: "Rent / home EMI", kind: "need" },
  food: { label: "Groceries & food", kind: "need" },
  utilities: { label: "Electricity, water, gas", kind: "need" },
  transport: { label: "Transport to work/school", kind: "need" },
  education: { label: "School / college fees", kind: "fixed" },
  healthcare: { label: "Medicines & doctor", kind: "fixed" },
  insurance: { label: "Insurance premiums", kind: "fixed" },
  emis: { label: "Other loan EMIs", kind: "fixed" },
  phoneInternet: { label: "Phone & internet", kind: "need" },
  clothingHousehold: { label: "Clothing & household essentials", kind: "need" },
  domesticHelp: { label: "Domestic help / childcare", kind: "need" },
  eatingOut: { label: "Eating out & ordering in", kind: "want", minKeepShare: 0.5 },
  entertainment: { label: "Entertainment", kind: "want", minKeepShare: 0.5 },
  shopping: { label: "Shopping", kind: "want", minKeepShare: 0.4 },
  subscriptions: { label: "Subscriptions / OTT", kind: "want", minKeepShare: 0.5 },
  travel: { label: "Travel & holidays", kind: "want", minKeepShare: 0.5 },
  festivals: { label: "Festivals, gifts, social", kind: "want", minKeepShare: 0.8 },
  miscellaneous: { label: "Miscellaneous", kind: "want", minKeepShare: 0.5 },
};

export const OPTIMISED_NEED_MULTIPLE = 1.4;
export const WANTS_CAP_PCT = 25;
export const WANTS_CAP_HIGH_EMI_PCT = 18;
export const CHILD_FOOD_WEIGHT = 0.7;

/** Lifestyle fund vehicles by horizon. */
export const GOAL_VEHICLES = [
  { maxYears: 1, vehicle: "Liquid fund or short FD", returnPct: 6.5 },
  { maxYears: 3, vehicle: "Short-duration debt or arbitrage fund", returnPct: 7 },
  { maxYears: 5, vehicle: "Balanced-advantage fund", returnPct: 9 },
  { maxYears: Infinity, vehicle: "Equity index fund SIP", returnPct: 11 },
];

export const LIFESTYLE_SHARE_OF_SURPLUS = 0.25;

export const LIFESTYLE_ITEMS = [
  { item: "Refrigerator", cost: 35000 },
  { item: "Laptop", cost: 60000 },
  { item: "Sofa set", cost: 50000 },
  { item: "Domestic family holiday", cost: 80000 },
  { item: "Two-wheeler", cost: 110000 },
  { item: "International trip", cost: 250000 },
  { item: "Home renovation", cost: 300000 },
  { item: "Car down-payment (20%)", cost: 180000 },
];

export const VEHICLE = {
  downPct: 20,
  maxLoanYears: 4,
  loanRatePct: 9.5,
  runningCostPctOfPricePerYear: 8,
  maxPctOfGrossIncome: 10,
  grossToNetFactor: 1.25,
};

export const GOLD_TARGET_PCT = 7;
