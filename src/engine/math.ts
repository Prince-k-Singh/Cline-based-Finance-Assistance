export const round = (n: number, step = 1) => Math.round(n / step) * step;
export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
export const safe = (n: unknown) => (typeof n === "number" && Number.isFinite(n) && n > 0 ? n : 0);

/** Monthly SIP needed to reach `target` in `years` at `annualPct`. */
export function sipForTarget(target: number, years: number, annualPct: number): number {
  const n = Math.max(1, Math.round(years * 12));
  const r = annualPct / 100 / 12;
  if (r === 0) return target / n;
  return (target * r) / ((Math.pow(1 + r, n) - 1) * (1 + r));
}

/** Future value of a lump sum. */
export const fv = (pv: number, annualPct: number, years: number) => pv * Math.pow(1 + annualPct / 100, years);

/** Future value of a monthly SIP. */
export function fvSip(monthly: number, annualPct: number, years: number): number {
  const n = Math.round(years * 12);
  const r = annualPct / 100 / 12;
  if (r === 0) return monthly * n;
  return monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
}

/** Standard loan EMI. */
export function emi(principal: number, annualPct: number, years: number): number {
  const n = Math.round(years * 12);
  const r = annualPct / 100 / 12;
  if (principal <= 0) return 0;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

/** Months to accumulate `target` saving `monthly` with no growth; null if never. */
export const monthsTo = (target: number, monthly: number) =>
  target <= 0 ? 0 : monthly > 0 ? Math.ceil(target / monthly) : null;

export const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
export const lakh = (n: number) =>
  Math.abs(n) >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr` : Math.abs(n) >= 1e5 ? `₹${(n / 1e5).toFixed(1)} L` : inr(n);
