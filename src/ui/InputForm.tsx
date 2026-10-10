import { ASSETS, CATEGORY_META, EXPENSE_CATEGORIES, HOLDING_TYPES, lakh, type Household } from "../engine";
import { NumField } from "./components";
import ListEditor from "./ListEditor";
import Section, { SectionToolbar, useSections } from "./Accordion";

type Props = { h: Household; set: (h: Household) => void };

const SECTIONS = ["family", "income", "expenses", "holdings", "goals"] as const;
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

export default function InputForm({ h, set }: Props) {
  const up = <K extends keyof Household>(k: K, v: Household[K]) => set({ ...h, [k]: v });
  const { sec, allOpen, toggleAll } = useSections(SECTIONS, ["family"], "prospera:open:form");

  const expTotal = EXPENSE_CATEGORIES.reduce((a, c) => a + (h.expenses[c] || 0), 0);
  const holdTotal = HOLDING_TYPES.reduce((a, t) => a + (h.holdings[t] || 0), 0);

  return (
    <div className="acc-stack">
      <SectionToolbar hint="Tap a section to edit. Your plan updates as you type." allOpen={allOpen} onToggleAll={toggleAll} />

      <Section title="Family profile" {...sec("family")}
        summary={`${plural(h.adults, "adult")} · ${h.children} ${h.children === 1 ? "child" : "children"} · ${h.cityTier === "metro" ? "Metro" : h.cityTier === "large" ? "Large city" : "Smaller city"}`}>
        <div className="form-grid">
          <label className="f">Family name<input value={h.name ?? ""} onChange={(e) => up("name", e.target.value)} /></label>
          <NumField label="Your age" value={h.age} step={1} onChange={(n) => up("age", Math.min(80, Math.max(18, n)))} />
          <label className="f">City
            <select value={h.cityTier} onChange={(e) => up("cityTier", e.target.value as Household["cityTier"])}>
              <option value="metro">Metro (Mumbai, Delhi, Bengaluru…)</option>
              <option value="large">Large city (Pune, Jaipur, Kochi…)</option>
              <option value="small">Smaller city / town</option>
            </select>
          </label>
          <label className="f">Earners
            <select value={h.earners} onChange={(e) => up("earners", Number(e.target.value) as 1 | 2)}>
              <option value={1}>1 earner</option><option value={2}>2 earners</option>
            </select>
          </label>
          <label className="f">Main job type
            <select value={h.jobType} onChange={(e) => up("jobType", e.target.value as Household["jobType"])}>
              <option value="government">Government / PSU</option>
              <option value="private">Private sector</option>
              <option value="self_employed">Self-employed / variable</option>
            </select>
          </label>
          <NumField label="Adults" value={h.adults} step={1} onChange={(n) => up("adults", Math.max(1, n))} />
          <NumField label="Children" value={h.children} step={1} onChange={(n) => up("children", n)} />
          <NumField label="Dependent parents" value={h.dependentParents} step={1} onChange={(n) => up("dependentParents", n)} />
          <label className="f">Risk appetite
            <select value={h.riskAppetite} onChange={(e) => up("riskAppetite", e.target.value as Household["riskAppetite"])}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
            </select>
          </label>
        </div>
      </Section>

      <Section title="Income, savings & insurance" {...sec("income")}
        summary={`${lakh(h.netMonthlyIncome)}/mo take-home · investing ${lakh(h.monthlyInvesting)}/mo`}>
        <div className="form-grid">
          <NumField label="Monthly take-home" suffix="₹" value={h.netMonthlyIncome} onChange={(n) => up("netMonthlyIncome", n)} />
          {h.earners === 2 && <NumField label="Primary earner take-home" suffix="₹" value={h.primaryEarnerIncome ?? 0} onChange={(n) => up("primaryEarnerIncome", n)} />}
          <NumField label="Annual bonus" suffix="₹" value={h.annualBonus} step={5000} onChange={(n) => up("annualBonus", n)} />
          <NumField label="Investing now / month" suffix="₹" value={h.monthlyInvesting} onChange={(n) => up("monthlyInvesting", n)} />
          <label className="f">Income-tax slab
            <select value={h.taxSlabPct} onChange={(e) => up("taxSlabPct", Number(e.target.value))}>
              {[0, 5, 10, 15, 20, 30].map((s) => <option key={s} value={s}>{s}%</option>)}
            </select>
          </label>
          <label className="f">Health insurance?
            <select value={h.hasHealthInsurance ? "y" : "n"} onChange={(e) => up("hasHealthInsurance", e.target.value === "y")}>
              <option value="y">Yes</option><option value="n">No</option>
            </select>
          </label>
          <NumField label="Health cover" suffix="₹" value={h.healthCover} step={100000} onChange={(n) => up("healthCover", n)} />
          <NumField label="Term life cover" suffix="₹" value={h.termCover} step={500000} onChange={(n) => up("termCover", n)} />
        </div>
      </Section>

      <Section title="Monthly expenses (₹)" {...sec("expenses")}
        summary={`${lakh(expTotal)}/mo across ${EXPENSE_CATEGORIES.length} categories`}>
        <div className="form-grid">
          {EXPENSE_CATEGORIES.map((c) => (
            <NumField key={c} label={CATEGORY_META[c].label} value={h.expenses[c]} onChange={(n) => up("expenses", { ...h.expenses, [c]: n })} />
          ))}
        </div>
      </Section>

      <Section title="Current holdings & loans (₹)" {...sec("holdings")}
        summary={`${lakh(holdTotal)} saved · ${plural(h.loans.length, "loan")}`}>
        <div className="form-grid">
          {HOLDING_TYPES.map((t) => (
            <NumField key={t} label={ASSETS[t].label} value={h.holdings[t]} step={10000} onChange={(n) => up("holdings", { ...h.holdings, [t]: n })} />
          ))}
        </div>
        <h3 className="acc-sub">Loans</h3>
        <ListEditor
          rows={h.loans}
          empty={{ name: "Loan", outstanding: 0, ratePct: 10, emi: 0 }}
          onChange={(loans) => up("loans", loans)}
          cols={[{ key: "name", label: "Name", type: "text" }, { key: "outstanding", label: "Outstanding ₹" }, { key: "ratePct", label: "Rate %" }, { key: "emi", label: "EMI ₹" }]}
        />
      </Section>

      <Section title="Lifestyle goals (vehicle, furniture, holiday…)" {...sec("goals")}
        summary={h.goals.length ? plural(h.goals.length, "goal") : "None yet"}>
        <ListEditor
          rows={h.goals}
          empty={{ id: "", name: "New goal", costToday: 50000, years: 2 }}
          onChange={(goals) => up("goals", goals.map((g, i) => ({ ...g, id: g.id || `g${Date.now()}${i}` })))}
          cols={[{ key: "name", label: "Goal", type: "text" }, { key: "costToday", label: "Price today ₹" }, { key: "years", label: "Years away" }]}
        />
      </Section>
    </div>
  );
}
