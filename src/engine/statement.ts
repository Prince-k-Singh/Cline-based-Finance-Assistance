import { EXPENSE_CATEGORIES, type ExpenseCategory, type Expenses } from "./types";

export interface StatementTxn {
  date: string;
  description: string;
  amount: number; // positive = money out
  category: ExpenseCategory | "income" | "investment" | "transfer" | "unknown";
  recurring?: boolean;
}

const RULES: [RegExp, StatementTxn["category"]][] = [
  [/salary|sal cr|payroll|interest cr|refund|cashback/i, "income"],
  [/\bsip\b|mutual fund|zerodha|groww|kuvera|coin|ppf|nps|rd inst/i, "investment"],
  [/rent|landlord|nobroker|society|maintenance/i, "housing"],
  [/bigbasket|blinkit|zepto|dmart|grocer|kirana|reliance fresh|more retail|milk|vegetable|instamart/i, "food"],
  [/swiggy|zomato|restaurant|cafe|domino|pizza|kfc|mcdonald|starbucks|eatsure/i, "eatingOut"],
  [/bescom|electric|power|water|gas|indane|bharat gas|hp gas|mahanagar|tata power|adani elec/i, "utilities"],
  [/uber|ola|rapido|metro|petrol|fuel|hpcl|bpcl|iocl|fastag|parking|irctc local|bus/i, "transport"],
  [/school|college|tuition|byju|fees|vedantu|unacademy/i, "education"],
  [/pharma|apollo|medplus|1mg|netmeds|hospital|clinic|diagnostic|doctor|lab/i, "healthcare"],
  [/lic|insurance|premium|hdfc life|icici pru|star health|policybazaar|acko|digit/i, "insurance"],
  [/emi|loan|bajaj fin|home credit|nach/i, "emis"],
  [/airtel|jio|vodafone|\bvi\b|bsnl|act fibernet|broadband|recharge/i, "phoneInternet"],
  [/netflix|prime|hotstar|spotify|youtube premium|sonyliv|zee5|subscription|apple\.com/i, "subscriptions"],
  [/maid|cook|nanny|daycare|creche|driver salary/i, "domesticHelp"],
  [/pvr|inox|bookmyshow|gaming|steam/i, "entertainment"],
  [/amazon|flipkart|myntra|ajio|nykaa|meesho|mall|lifestyle|westside|decathlon/i, "shopping"],
  [/makemytrip|goibibo|airline|indigo|vistara|air india|hotel|oyo|airbnb|irctc/i, "travel"],
  [/gift|diwali|wedding|puja|donation|temple|festival/i, "festivals"],
  [/clothing|tailor|laundry|hardware|household|urban company|plumber|electrician/i, "clothingHousehold"],
  [/self transfer|own a\/c|to self/i, "transfer"],
];

export function categoriseDescription(desc: string): StatementTxn["category"] {
  for (const [re, cat] of RULES) if (re.test(desc)) return cat;
  return "unknown";
}

const parseAmount = (s: string) => Number(s.replace(/[₹,\s]|INR|Rs\.?/gi, "")) || 0;

/** Parses CSV-ish bank / UPI / card statement text: date, description, debit[, credit]. */
const splitCells = (line: string) =>
  (line.includes("\t") ? line.split("\t") : line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)).map((c) => c.replace(/^"|"$/g, "").trim());

export function parseStatement(text: string): StatementTxn[] {
  const out: StatementTxn[] = [];
  let creditCol = -1;
  let debitCol = -1;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (/^(txn\s*)?date\b/i.test(line)) {
      const head = splitCells(line).map((c) => c.toLowerCase());
      creditCol = head.findIndex((c) => /credit|deposit|cr\b/.test(c));
      debitCol = head.findIndex((c) => /debit|withdraw|dr\b/.test(c));
      continue;
    }
    const clean = splitCells(line);
    // Header-aware debit/credit columns
    if (creditCol >= 0 && debitCol >= 0) {
      const dr = parseAmount(clean[debitCol] ?? "");
      const cr = parseAmount(clean[creditCol] ?? "");
      const amount = dr > 0 ? dr : -cr;
      if (amount === 0) continue;
      const desc = clean.find((c, i) => i !== debitCol && i !== creditCol && c.length > 1 && !/^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}$/.test(c)) ?? "Unknown";
      let category = categoriseDescription(desc);
      if (amount < 0 && category !== "transfer") category = "income";
      out.push({ date: clean.find((c) => /\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}/.test(c)) ?? "", description: desc, amount, category });
      continue;
    }
    const dateIdx = clean.findIndex((c) => /\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}/.test(c));
    const nums = clean.map((c, i) => ({ i, v: /^-?[₹Rs. ]*[\d,]+(\.\d+)?\s*(CR|DR)?$/i.test(c) ? c : null })).filter((x) => x.v !== null);
    if (nums.length === 0) continue;
    const descIdx = clean.findIndex((c, i) => i !== dateIdx && !nums.some((n) => n.i === i) && c.length > 1);
    const desc = descIdx >= 0 ? clean[descIdx] : "Unknown";
    let amount = parseAmount(nums[0].v!);
    if (/CR$/i.test(nums[0].v!)) amount = -Math.abs(amount);
    // debit, credit columns: if first is empty/zero and second has value, it's a credit
    if (nums.length >= 2 && amount === 0) amount = -parseAmount(nums[1].v!);
    if (amount === 0) continue;
    let category = categoriseDescription(desc);
    if (amount < 0 && category === "unknown") category = "income";
    out.push({ date: dateIdx >= 0 ? clean[dateIdx] : "", description: desc, amount, category });
  }
  markRecurring(out);
  return out;
}

function markRecurring(txns: StatementTxn[]) {
  const key = (t: StatementTxn) => t.description.toLowerCase().replace(/[^a-z]/g, "").slice(0, 12);
  const counts = new Map<string, number>();
  txns.forEach((t) => counts.set(key(t), (counts.get(key(t)) ?? 0) + 1));
  txns.forEach((t) => (t.recurring = (counts.get(key(t)) ?? 0) >= 2 && t.amount > 0));
}

/** Rolls transactions into a monthly-average expense form. */
export function summariseStatement(txns: StatementTxn[], months = 1) {
  const m = Math.max(1, months);
  const expenses = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c, 0])) as Expenses;
  let unknown = 0, income = 0, investing = 0;
  for (const t of txns) {
    if (t.category === "income") income += -t.amount;
    else if (t.category === "investment") investing += t.amount;
    else if (t.category === "transfer") continue;
    else if (t.category === "unknown") unknown += Math.max(0, t.amount);
    else if (t.amount > 0) expenses[t.category] += t.amount;
  }
  (Object.keys(expenses) as ExpenseCategory[]).forEach((k) => (expenses[k] = Math.round(expenses[k] / m)));
  return {
    expenses,
    monthlyIncome: Math.round(income / m),
    monthlyInvesting: Math.round(investing / m),
    unaccounted: Math.round(unknown / m),
    unknownExamples: txns.filter((t) => t.category === "unknown").slice(0, 5),
    recurring: txns.filter((t) => t.recurring).map((t) => t.description).filter((d, i, a) => a.indexOf(d) === i),
  };
}
