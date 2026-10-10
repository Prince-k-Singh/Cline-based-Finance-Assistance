import type { Household } from "./types";

/** Demo persona from the brief: Rohit, 34, Bengaluru. */
export const SAMPLE_HOUSEHOLD: Household = {
  name: "Rohit (sample family)",
  age: 34,
  cityTier: "metro",
  earners: 1,
  jobType: "private",
  adults: 2,
  children: 1,
  dependentParents: 0,
  netMonthlyIncome: 120000,
  annualBonus: 100000,
  monthlyInvesting: 8000,
  riskAppetite: "medium",
  hasHealthInsurance: true,
  healthCover: 500000,
  termCover: 5000000,
  taxSlabPct: 20,
  expenses: {
    housing: 26000, food: 15000, utilities: 4000, transport: 5000, education: 8000, healthcare: 2000,
    insurance: 4000, emis: 14000, phoneInternet: 1500, clothingHousehold: 4000, domesticHelp: 4000,
    eatingOut: 6000, entertainment: 2500, shopping: 5000, subscriptions: 1000, travel: 3000, festivals: 2000,
    miscellaneous: 2000,
  },
  holdings: {
    cash: 250000, fd: 300000, debtFunds: 0, gold: 400000, property: 1500000, equityFunds: 150000,
    stocks: 50000, retirement: 600000, endowment: 300000,
  },
  goals: [
    { id: "g1", name: "Sofa set", costToday: 60000, years: 1 },
    { id: "g2", name: "Family trip to Kerala", costToday: 120000, years: 2 },
    { id: "g3", name: "Car down-payment", costToday: 200000, years: 3 },
  ],
  loans: [{ name: "Car loan", outstanding: 400000, ratePct: 9.5, emi: 14000 }],
};

export const EMPTY_HOUSEHOLD: Household = {
  ...SAMPLE_HOUSEHOLD,
  name: "",
  netMonthlyIncome: 0,
  annualBonus: 0,
  monthlyInvesting: 0,
  healthCover: 0,
  termCover: 0,
  expenses: Object.fromEntries(Object.keys(SAMPLE_HOUSEHOLD.expenses).map((k) => [k, 0])) as Household["expenses"],
  holdings: Object.fromEntries(Object.keys(SAMPLE_HOUSEHOLD.holdings).map((k) => [k, 0])) as Household["holdings"],
  goals: [],
  loans: [],
};
