import { GOAL_INFLATION_PCT, GOAL_VEHICLES, LIFESTYLE_ITEMS, LIFESTYLE_SHARE_OF_SURPLUS, VEHICLE } from "./assumptions";
import { emi, fv, monthsTo, round, safe, sipForTarget } from "./math";
import type { Goal, GoalPlan, Household, LifestyleResult, VehicleResult } from "./types";

export function vehicleForHorizon(years: number) {
  return GOAL_VEHICLES.find((v) => years <= v.maxYears) ?? GOAL_VEHICLES[GOAL_VEHICLES.length - 1];
}

export function planGoal(goal: Goal, inflationPct = GOAL_INFLATION_PCT): GoalPlan {
  const years = Math.max(0.25, safe(goal.years));
  const v = vehicleForHorizon(years);
  const futureCost = round(fv(safe(goal.costToday), inflationPct, years), 100);
  return {
    ...goal,
    futureCost,
    vehicle: v.vehicle,
    expectedReturnPct: v.returnPct,
    monthlyNeeded: round(sipForTarget(futureCost, years, v.returnPct), 100),
  };
}

/** `surplusAfterEmergency` = monthly surplus left after the emergency-fund contribution. */
export function computeLifestyle(h: Household, surplusAfterEmergency: number): LifestyleResult {
  const affordable = round(Math.max(0, surplusAfterEmergency) * (h.goals.length ? 0.5 : LIFESTYLE_SHARE_OF_SURPLUS), 100);
  const goals = h.goals.filter((g) => safe(g.costToday) > 0).map((g) => planGoal(g));
  const totalNeeded = goals.reduce((a, g) => a + g.monthlyNeeded, 0);
  const fundedPct = totalNeeded === 0 ? 100 : Math.min(100, Math.round((affordable / totalNeeded) * 100));
  let suggestion: string | null = null;
  if (goals.length === 0) {
    suggestion = `No goals entered. Set aside about ₹${affordable.toLocaleString("en-IN")} a month (25% of the surplus after the emergency fund) as a lifestyle fund.`;
  } else if (fundedPct < 100) {
    suggestion = `Goals need ₹${totalNeeded.toLocaleString("en-IN")}/month but about ₹${affordable.toLocaleString("en-IN")} is affordable (${fundedPct}% funded). Extend timelines or trim goal sizes.`;
  }
  const canBuy = LIFESTYLE_ITEMS.map((it) => ({ ...it, months: monthsTo(it.cost, affordable) }));
  return { goals, totalNeeded, affordable, fundedPct, suggestion, canBuy };
}

/** 20/4/10 vehicle affordability check. */
export function vehicleAffordability(h: Household, price: number, monthlySaving: number): VehicleResult {
  const p = safe(price);
  const downPayment = round((p * VEHICLE.downPct) / 100, 1000);
  const loan = p - downPayment;
  const e = round(emi(loan, VEHICLE.loanRatePct, VEHICLE.maxLoanYears), 100);
  const running = round((p * VEHICLE.runningCostPctOfPricePerYear) / 100 / 12, 100);
  const grossMonthly = safe(h.netMonthlyIncome) * VEHICLE.grossToNetFactor;
  const limit = round((grossMonthly * VEHICLE.maxPctOfGrossIncome) / 100, 100);
  const totalMonthly = e + running;
  // price such that emi + running == limit (linear in price)
  const perRupee = emi(1 - VEHICLE.downPct / 100, VEHICLE.loanRatePct, VEHICLE.maxLoanYears) + VEHICLE.runningCostPctOfPricePerYear / 100 / 12;
  const maxAffordablePrice = round(limit / perRupee, 10000);
  const affordable = totalMonthly <= limit;
  const notes = [
    `20% down payment: ₹${downPayment.toLocaleString("en-IN")}`,
    `Loan of ₹${loan.toLocaleString("en-IN")} over ${VEHICLE.maxLoanYears} years at ${VEHICLE.loanRatePct}%: EMI ₹${e.toLocaleString("en-IN")}`,
    `Fuel, insurance, upkeep ≈ ₹${running.toLocaleString("en-IN")}/month`,
    `10% of gross income limit: ₹${limit.toLocaleString("en-IN")}/month`,
    affordable ? "Within the 20/4/10 rule." : `Over the limit. A vehicle around ₹${maxAffordablePrice.toLocaleString("en-IN")} fits the rule.`,
  ];
  return {
    price: p, downPayment, loan, emi: e, monthlyRunningCost: running, totalMonthly, limit, affordable,
    // Emergency savings are not touched for the down payment, so it is saved fresh.
    monthsToSaveDown: monthsTo(downPayment, monthlySaving),
    maxAffordablePrice, notes,
  };
}
