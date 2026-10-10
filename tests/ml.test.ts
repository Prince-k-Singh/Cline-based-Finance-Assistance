import {
  analyseMarket,
  analyseSeries,
  ewmaVolAnnual,
  forecastMonth,
  logTrend,
  maxDrawdown,
  robustZ,
  SAMPLE_HOUSEHOLD,
  type MarketSnapshot,
  type MonthRecord,
  type Series,
} from "../src/engine";

const DAY = 86400;
const T0 = 1_760_000_000;
/** Build a synthetic daily series with a given annual drift and optional final crash. */
function series(symbol: string, start: number, annualPct: number, days = 260, crashPct = 0): Series {
  const daily = Math.pow(1 + annualPct / 100, 1 / 365);
  const points = Array.from({ length: days }, (_, i) => ({
    t: T0 + i * DAY * (365 / days),
    close: start * Math.pow(daily, i * (365 / days)) * (1 + 0.004 * Math.sin(i)),
  }));
  if (crashPct) for (let i = days - 20; i < days; i++) points[i].close *= 1 - crashPct / 100;
  return { symbol, label: symbol, currency: "INR", points };
}

describe("market analytics", () => {
  it("recovers trend slope from a log-linear series", () => {
    const t = logTrend(series("X", 100, 12).points)!;
    expect(t.slopePct).toBeGreaterThan(10);
    expect(t.slopePct).toBeLessThan(14);
    expect(t.r2).toBeGreaterThan(0.9);
  });
  it("computes drawdown and EWMA volatility", () => {
    expect(maxDrawdown([100, 120, 90, 130])).toBeCloseTo(-25, 5);
    const v = ewmaVolAnnual(series("X", 100, 10).points.map((p) => p.close))!;
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(200);
  });
  it("labels a 15% crash as a correction", () => {
    const s = analyseSeries(series("^NSEI", 20000, 12, 260, 15));
    expect(s.regime).toBe("correction");
    expect(s.drawdownFromHighPct!).toBeLessThan(-10);
  });
  it("labels steady growth as an uptrend", () => {
    expect(["uptrend", "strong-uptrend"]).toContain(analyseSeries(series("^NSEI", 20000, 14)).regime);
  });
});

describe("personalised market insights", () => {
  const snap = (over: Partial<MarketSnapshot> = {}): MarketSnapshot => ({
    fetchedAt: new Date().toISOString(), source: "live",
    nifty: series("^NSEI", 22000, 12, 260, 15),
    gold: series("GC=F", 2400, 25),
    usdinr: series("INR=X", 84, 3),
    cpi: [{ year: "2025", valuePct: 7.5 }],
    notes: [], ...over,
  });
  it("warns about idle cash when real return is negative, with a rupee impact", () => {
    const a = analyseMarket(SAMPLE_HOUSEHOLD, snap());
    const cash = a.insights.find((i) => i.id === "cash-real")!;
    expect(a.realCashReturnPct).toBeLessThan(0);
    expect(cash.severity).toBe("warning");
    expect(cash.impactRupees!).toBeGreaterThan(0);
  });
  it("detects a correction opportunity for the sample family", () => {
    const ids = analyseMarket(SAMPLE_HOUSEHOLD, snap()).insights.map((i) => i.id);
    expect(ids).toContain("eq-correction");
    expect(ids).not.toContain("gold-rebalance"); // sample gold is ~11%, under the 15% trigger
  });
  it("suggests a gold rebalance when gold is over-allocated after a rally", () => {
    const h = structuredClone(SAMPLE_HOUSEHOLD);
    h.holdings.gold = 1200000; // ~28% of investments
    const g = analyseMarket(h, snap()).insights.find((i) => i.id === "gold-rebalance")!;
    expect(g.severity).toBe("opportunity");
    expect(g.impactRupees!).toBeGreaterThan(0);
  });
  it("works with no live data (fallback) without throwing", () => {
    const a = analyseMarket(SAMPLE_HOUSEHOLD, { fetchedAt: new Date().toISOString(), source: "fallback", notes: [] });
    expect(a.signals.length).toBe(0);
    expect(a.latestCpiPct).toBeNull();
    expect(a.insights.length).toBeGreaterThan(0);
  });
});

describe("predictive spending", () => {
  const hist: MonthRecord[] = ["2026-06", "2026-07", "2026-08", "2026-09"].map((m) => ({ month: m, expenses: { ...SAMPLE_HOUSEHOLD.expenses, eatingOut: 5000 } }));
  it("robust z-score flags outliers but not normal values", () => {
    expect(robustZ(5100, [5000, 4800, 5200, 5000])!).toBeLessThan(1);
    expect(robustZ(12000, [5000, 4800, 5200, 5000])!).toBeGreaterThan(3);
    expect(robustZ(100, [1, 2])).toBeNull();
  });
  it("projects mid-month overspend in eating out and raises an alert", () => {
    const partial = Object.fromEntries(Object.keys(SAMPLE_HOUSEHOLD.expenses).map((k) => [k, 0])) as typeof SAMPLE_HOUSEHOLD.expenses;
    partial.eatingOut = 4500;
    const f = forecastMonth(SAMPLE_HOUSEHOLD, partial, "2026-10", 12, hist);
    const eo = f.categories.find((c) => c.category === "eatingOut")!;
    expect(eo.projected).toBeGreaterThan(eo.budget);
    expect(eo.status).not.toBe("ok");
    expect(f.alerts.join(" ")).toMatch(/Eating out/);
    expect(f.historyMonths).toBe(4);
  });
  it("fixed EMIs project to baseline, not pace", () => {
    const partial = { ...SAMPLE_HOUSEHOLD.expenses, emis: 14000 };
    const f = forecastMonth(SAMPLE_HOUSEHOLD, partial, "2026-10", 5, hist);
    expect(f.categories.find((c) => c.category === "emis")!.projected).toBe(14000);
  });
});
