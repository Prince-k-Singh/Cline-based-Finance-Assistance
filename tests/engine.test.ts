import {
  buildPlan,
  computeBudget,
  computeEmergency,
  computePortfolio,
  emergencyMonths,
  EMPTY_HOUSEHOLD,
  emi,
  planGoal,
  prepayVsInvest,
  SAMPLE_HOUSEHOLD,
  sipForTarget,
  vehicleAffordability,
  type Household,
} from "../src/engine";

const clone = (h: Household): Household => structuredClone(h);

describe("math", () => {
  it("SIP formula reaches the target", () => {
    const m = sipForTarget(100000, 1, 0);
    expect(m).toBeCloseTo(100000 / 12, 5);
    expect(sipForTarget(100000, 1, 12)).toBeLessThan(100000 / 12);
  });
  it("EMI matches a known value", () => {
    // ₹10L, 9.5%, 4 years ≈ ₹25,123
    expect(Math.round(emi(1000000, 9.5, 4))).toBeGreaterThan(25000);
    expect(Math.round(emi(1000000, 9.5, 4))).toBeLessThan(25300);
  });
});

describe("budget", () => {
  it("bare minimum <= optimised <= today for every line", () => {
    const b = computeBudget(SAMPLE_HOUSEHOLD);
    for (const l of b.lines) {
      expect(l.bareMinimum).toBeLessThanOrEqual(l.today + 10);
      expect(l.optimised).toBeLessThanOrEqual(l.today + 10);
    }
    expect(b.totals.bareMinimum).toBeLessThan(b.totals.optimised);
    expect(b.totals.optimised).toBeLessThanOrEqual(b.totals.today);
  });
  it("keeps fixed obligations and zeroes wants in bare minimum", () => {
    const b = computeBudget(SAMPLE_HOUSEHOLD);
    const by = Object.fromEntries(b.lines.map((l) => [l.category, l]));
    expect(by.emis.bareMinimum).toBe(14000);
    expect(by.education.bareMinimum).toBe(8000);
    expect(by.eatingOut.bareMinimum).toBe(0);
    expect(by.festivals.optimised).toBeGreaterThanOrEqual(by.festivals.today * 0.8 - 10);
  });
  it("handles zero income without NaN", () => {
    const b = computeBudget(EMPTY_HOUSEHOLD);
    expect(Number.isFinite(b.totals.today)).toBe(true);
    expect(b.unaccountedFlag).toBe(false);
  });
});

describe("emergency fund", () => {
  it("sample family: single earner, private job, child => 7 months", () => {
    expect(emergencyMonths(SAMPLE_HOUSEHOLD, 0.1).months).toBe(7);
  });
  it("caps at 12 months", () => {
    const h = { ...clone(SAMPLE_HOUSEHOLD), jobType: "self_employed" as const, hasHealthInsurance: false };
    expect(emergencyMonths(h, 0.5).months).toBe(10);
    h.dependentParents = 2;
    expect(emergencyMonths(h, 0.5).months).toBeLessThanOrEqual(12);
  });
  it("target uses bare-minimum cost and gap is non-negative", () => {
    const b = computeBudget(SAMPLE_HOUSEHOLD);
    const e = computeEmergency(SAMPLE_HOUSEHOLD, b);
    expect(e.target).toBeCloseTo(e.months * b.totals.bareMinimum, -3);
    expect(e.gap).toBeGreaterThanOrEqual(0);
  });
  it("negative surplus gives null months-to-fill, not Infinity", () => {
    const h = clone(SAMPLE_HOUSEHOLD);
    h.netMonthlyIncome = 50000;
    h.annualBonus = 0;
    h.holdings.cash = 0; h.holdings.fd = 0;
    const e = computeEmergency(h, computeBudget(h));
    expect(e.monthsToFill).toBeNull();
  });
});

describe("lifestyle & vehicle", () => {
  it("picks vehicle by horizon", () => {
    expect(planGoal({ id: "a", name: "x", costToday: 50000, years: 1 }).vehicle).toMatch(/Liquid/);
    expect(planGoal({ id: "a", name: "x", costToday: 50000, years: 2 }).vehicle).toMatch(/Short-duration/);
    expect(planGoal({ id: "a", name: "x", costToday: 50000, years: 4 }).vehicle).toMatch(/Balanced/);
    expect(planGoal({ id: "a", name: "x", costToday: 50000, years: 8 }).vehicle).toMatch(/Equity/);
  });
  it("inflates goal cost", () => {
    expect(planGoal({ id: "a", name: "x", costToday: 100000, years: 2 }).futureCost).toBe(112400);
  });
  it("20/4/10: ₹9L car on ₹1.2L take-home is over the limit", () => {
    const v = vehicleAffordability(SAMPLE_HOUSEHOLD, 900000, 20000);
    expect(v.affordable).toBe(false);
    expect(v.maxAffordablePrice).toBeLessThan(900000);
    expect(v.downPayment).toBe(180000);
  });
});

describe("portfolio", () => {
  it("keeps capital the same and never moves locked assets", () => {
    const p = computePortfolio(SAMPLE_HOUSEHOLD);
    const s = Object.values(p.suggested).reduce((a, b) => a + b, 0);
    expect(Math.abs(s - p.total)).toBeLessThan(5000);
    expect(p.suggested.retirement).toBe(SAMPLE_HOUSEHOLD.holdings.retirement);
    expect(p.suggested.property).toBe(SAMPLE_HOUSEHOLD.holdings.property);
  });
  it("suggested mix beats current on post-tax return and flags issues", () => {
    const p = computePortfolio(SAMPLE_HOUSEHOLD);
    expect(p.suggestedPostTaxPct).toBeGreaterThan(p.currentPostTaxPct);
    expect(p.flags.join(" ")).toMatch(/Endowment/);
    expect(p.flags.join(" ")).toMatch(/property/);
  });
  it("never moves the emergency fund into equity or gold", () => {
    const p = computePortfolio(SAMPLE_HOUSEHOLD);
    const target = computeEmergency(SAMPLE_HOUSEHOLD, computeBudget(SAMPLE_HOUSEHOLD)).target;
    const safeSuggested = p.suggested.cash + p.suggested.fd + p.suggested.debtFunds;
    expect(safeSuggested).toBeGreaterThanOrEqual(target - 2000);
    expect(p.moves[0]).toMatch(/emergency fund/);
  });
  it("empty portfolio is safe", () => {
    const p = computePortfolio(EMPTY_HOUSEHOLD);
    expect(p.total).toBe(0);
    expect(p.currentPostTaxPct).toBe(0);
  });
  it("prepay vs invest", () => {
    expect(prepayVsInvest(14, 9).better).toBe("prepay");
    expect(prepayVsInvest(8, 9).better).toBe("invest");
  });
});

describe("full plan", () => {
  it("builds for sample family with a sane score and waterfall", () => {
    const plan = buildPlan(SAMPLE_HOUSEHOLD);
    expect(plan.score.total).toBeGreaterThan(0);
    expect(plan.score.total).toBeLessThanOrEqual(100);
    const wf = plan.waterfall.reduce((a, w) => a + w.amount, 0);
    expect(wf).toBeLessThanOrEqual(Math.max(0, plan.budget.savingsOptimised) + 1);
    expect(plan.actions.d30.length).toBeGreaterThan(0);
  });
  it("builds for an empty household without throwing", () => {
    const plan = buildPlan(EMPTY_HOUSEHOLD);
    expect(plan.fi.years === null || plan.fi.years === 0).toBe(true);
  });
  it("flags high-interest debt", () => {
    const h = clone(SAMPLE_HOUSEHOLD);
    h.loans = [{ name: "Personal loan", outstanding: 300000, ratePct: 14, emi: 10000 }];
    expect(buildPlan(h).debtAdvice[0]).toMatch(/Prepay/);
  });
});
