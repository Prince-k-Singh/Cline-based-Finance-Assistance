import { useEffect, useRef, useState, type CSSProperties } from "react";
import { inr, lakh, type BudgetLine, type Plan } from "../../engine";
import { Stat } from "../components";
import Section, { SectionToolbar, useSections } from "../Accordion";
import Breakdown from "../Breakdown";

/** 12 distinct hues (readable on dark and light) so no two visible categories share a colour. */
const CAT_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)", "var(--chart-7)", "var(--chart-8)", "var(--chart-9)", "var(--chart-10)", "var(--chart-11)", "var(--chart-12)"];
const BUFFER_COLOR = "var(--chart-other)";
const SECTIONS = ["spend", "savings", "detail"] as const;

type View = "today" | "optimised" | "bareMinimum";
type Kind = BudgetLine["kind"];
const VIEWS: { id: View; label: string; total: string }[] = [
  { id: "today", label: "Today", total: "Spending today" },
  { id: "optimised", label: "Optimised", total: "Optimised spending" },
  { id: "bareMinimum", label: "Bare minimum", total: "Bare-minimum spending" },
];
const KINDS: { id: Kind; label: string; plural: string; hint: string; color: string }[] = [
  { id: "fixed", label: "Fixed", plural: "Fixed commitments", hint: "Fees, medicines, insurance, EMIs", color: "var(--brand-2)" },
  { id: "need", label: "Need", plural: "Flexible needs", hint: "Rent, groceries, bills, transport", color: "var(--good)" },
  { id: "want", label: "Want", plural: "Wants", hint: "Dining out, shopping, travel, OTT", color: "var(--chart-3)" },
];
const kindMeta = (k: Kind) => KINDS.find((x) => x.id === k)!;

/** Smoothly counts a number to its new value (rAF, ~0.6s ease-out). Instant under reduced motion. */
function useTween(target: number, ms = 600) {
  const [v, setV] = useState(target);
  const cur = useRef(target);
  useEffect(() => {
    const start = cur.current;
    const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (start === target || reduce) { cur.current = target; setV(target); return; }
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, Math.max(0, (t - t0) / ms));
      const next = k >= 1 ? target : start + (target - start) * (1 - Math.pow(1 - k, 3));
      cur.current = next;
      setV(next);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}
const Tween = ({ value }: { value: number }) => <>{lakh(useTween(value))}</>;

/** Pill switch with a sliding indicator. */
function Segmented<T extends string>({ options, value, onChange, label }: {
  options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; label: string;
}) {
  const idx = Math.max(0, options.findIndex((o) => o.id === value));
  return (
    <div className="seg" role="group" aria-label={label} style={{ "--n": options.length, "--i": idx } as CSSProperties}>
      <span className="seg-ind" aria-hidden="true" />
      {options.map((o) => (
        <button key={o.id} type="button" className={o.id === value ? "on" : ""} aria-pressed={o.id === value} onClick={() => onChange(o.id)}>{o.label}</button>
      ))}
    </div>
  );
}

export default function BudgetTab({ plan }: { plan: Plan }) {
  const b = plan.budget;
  const [view, setView] = useState<View>("today");
  const [filter, setFilter] = useState<Kind | "all">("all");
  const { sec, allOpen, toggleAll } = useSections(SECTIONS, ["spend", "savings"], "parivar-plan:open:budget");

  const income = b.savingsToday + b.totals.today; // engine: savingsToday = income − today's spending
  const viewTotal = b.totals[view];
  const viewMeta = VIEWS.find((v) => v.id === view)!;
  const left = income - viewTotal;

  // Colour follows the category's rank in today's spending, so it stays put when switching views.
  const rank = [...b.lines].sort((x, y) => y.today - x.today).map((l) => l.label);
  const colorOf = (label: string) => CAT_COLORS[Math.max(0, rank.indexOf(label)) % CAT_COLORS.length];

  const spendingData = b.lines
    .filter((l) => l[view] > 0)
    .map((l) => ({ name: l.label, value: l[view], color: colorOf(l.label) }));
  if (view === "bareMinimum" && b.contingency > 0)
    spendingData.push({ name: "Safety buffer (5%)", value: b.contingency, color: BUFFER_COLOR });

  // Kind totals exclude the contingency buffer (it isn't a spending category).
  const kindTotal = (k: Kind) => b.lines.filter((l) => l.kind === k).reduce((a, l) => a + l[view], 0);
  const wantsCap = (income * b.wantsCapPct) / 100;

  const savings = b.lines
    .map((l) => ({ ...l, save: l.today - l.optimised }))
    .filter((l) => l.save > 0)
    .sort((x, y) => y.save - x.save);
  const totalSaved = b.totals.today - b.totals.optimised;
  const maxSave = Math.max(1, ...savings.map((s) => s.save));

  const counts: Record<Kind, number> = { fixed: 0, need: 0, want: 0 };
  b.lines.forEach((l) => { counts[l.kind] += 1; });
  const shownLines = filter === "all" ? b.lines : b.lines.filter((l) => l.kind === filter);
  const rangeMax = Math.max(1, ...b.lines.map((l) => l.today));
  const sub = (k: View) => shownLines.reduce((a, l) => a + l[k], 0);
  const pctOfIncome = (v: number) => (income > 0 ? Math.round((v / income) * 100) : 0);

  return (
    <div className="acc-stack bt">
      <div className="metrics">
        <Stat hero label="Spending today" value={lakh(b.totals.today)}
          sub={income > 0 ? `${pctOfIncome(b.totals.today)}% of your ${lakh(income)} take-home` : "Add your income on “Your details”"} />
        <Stat label="Optimised budget" value={lakh(b.totals.optimised)} tone="good"
          sub={totalSaved > 0 ? `Frees ${lakh(totalSaved)}/mo` : "Already lean"} />
        <Stat label="Bare minimum" value={lakh(b.totals.bareMinimum)} sub="Essentials + 5% safety buffer" />
        <Stat label="Monthly surplus" value={lakh(b.savingsOptimised)} tone={b.savingsOptimised < 0 ? "bad" : "good"}
          sub={`On the optimised budget · today ${lakh(b.savingsToday)}`} />
      </div>

      <SectionToolbar hint="Tap a section to open or close it." allOpen={allOpen} onToggleAll={toggleAll} />

      <Section title="Spending breakdown" {...sec("spend")}
        summary={<>{lakh(b.totals.today)} today → <b className="sum-strong good">{lakh(b.totals.optimised)}</b> optimised</>}>
        <div className="bt-toolbar">
          <Segmented label="Budget level" options={VIEWS} value={view} onChange={setView} />
          <span className="muted bt-hint">Hover or tap a category to highlight it.</span>
        </div>
        <div className="bt-spend">
          <div className="bt-main">
            <Breakdown data={spendingData} totalLabel={viewMeta.total} suffix="/mo" />
          </div>

          <aside className="bt-side" aria-label="How the spending splits">
            <div className="bt-side-h">How it splits · {viewMeta.label.toLowerCase()}</div>
            {KINDS.map((k) => {
              const v = kindTotal(k.id);
              const base = income > 0 ? income : viewTotal;
              const share = base > 0 ? (v / base) * 100 : 0;
              const overCap = k.id === "want" && income > 0 && v > wantsCap + 1;
              return (
                <div className="bt-kind" key={k.id} style={{ "--k": k.color } as CSSProperties}>
                  <div className="bt-kind-top">
                    <span className="bt-kind-name"><i aria-hidden="true" />{k.plural}</span>
                    <strong className="bt-kind-val"><Tween value={v} /></strong>
                  </div>
                  <div className="bt-kind-bar" aria-hidden="true">
                    <em style={{ transform: `scaleX(${Math.min(100, share) / 100})` }} />
                    {k.id === "want" && income > 0 && <b className="cap" style={{ left: `${Math.min(100, b.wantsCapPct)}%` }} />}
                  </div>
                  <div className="bt-kind-sub">
                    <span>{k.hint}</span>
                    <span className={overCap ? "warn" : ""}>
                      {Math.round(share)}%{income > 0 ? " of income" : ""}
                      {k.id === "want" && income > 0 ? ` · cap ${b.wantsCapPct}%` : ""}
                    </span>
                  </div>
                </div>
              );
            })}
            {income > 0 && (
              <div className={`bt-left${left < 0 ? " neg" : ""}`}>
                <span>Left over each month</span>
                <strong><Tween value={left} />/mo</strong>
                {view !== "today" && b.totals.today - viewTotal > 0 && (
                  <small><Tween value={b.totals.today - viewTotal} /> more than today</small>
                )}
              </div>
            )}
          </aside>
        </div>
      </Section>

      <Section title="Where the savings come from" {...sec("savings")}
        summary={savings.length ? <>Frees <b className="sum-strong good">{lakh(totalSaved)}/mo</b> across {savings.length} {savings.length === 1 ? "category" : "categories"}</> : "Nothing to trim"}>
        {savings.length === 0 ? (
          <div className="bt-empty">Your spending is already at the optimised level. Nothing to trim right now.</div>
        ) : (
          <>
            <p className="muted bt-lead">
              Same life, just leaner: wants are scaled towards {b.wantsCapPct}% of income and flexible needs are trimmed
              towards a sensible floor. Fixed commitments are never cut.
            </p>
            <ol className="bt-saves">
              {savings.map((s, i) => {
                const k = kindMeta(s.kind);
                const cut = s.today > 0 ? Math.round((s.save / s.today) * 100) : 0;
                return (
                  <li key={s.category} style={{ "--i": i, "--k": k.color } as CSSProperties}>
                    <div className="bt-save-top">
                      <span className="bt-save-name">{s.label}</span>
                      <span className={`tag ${s.kind}`}>{k.label}</span>
                    </div>
                    <div className="bt-save-amt">
                      <strong className="good">−{lakh(s.save)}</strong><span className="muted">/mo · {cut}% less</span>
                    </div>
                    <div className="bt-save-bar" aria-hidden="true"><em style={{ transform: `scaleX(${s.save / maxSave})` }} /></div>
                    <div className="bt-save-from">{inr(s.today)} → {inr(s.optimised)}</div>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </Section>

      <Section title="Category detail (₹ per month)" {...sec("detail")}
        summary={`${b.lines.length} categories · ${counts.fixed} fixed · ${counts.need} needs · ${counts.want} wants`}>
        <div className="bt-toolbar">
          <div className="row" role="group" aria-label="Filter categories">
            <button type="button" className={`chip ${filter === "all" ? "active" : ""}`} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>All <b>{b.lines.length}</b></button>
            {KINDS.map((k) => (
              <button key={k.id} type="button" className={`chip ${filter === k.id ? "active" : ""}`} aria-pressed={filter === k.id} onClick={() => setFilter(k.id)}>
                {k.plural} <b>{counts[k.id]}</b>
              </button>
            ))}
          </div>
          <div className="bt-legend" aria-hidden="true">
            <span><i className="t" />Today</span><span><i className="o" />Optimised</span><span><i className="m" />Bare minimum</span>
          </div>
        </div>
        <div className="bt-table-wrap">
          <table className="bt-table">
            <thead>
              <tr><th>Category</th><th>Type</th><th className="bt-range-c">Range</th><th className="num">Today</th><th className="num">Optimised</th><th className="num">Bare min.</th><th className="num">Save</th></tr>
            </thead>
            <tbody key={filter}>
              {shownLines.map((l, i) => {
                const k = kindMeta(l.kind);
                return (
                  <tr key={l.category} className={l.today === 0 ? "zero" : ""} style={{ "--i": i } as CSSProperties}>
                    <td className="bt-cat">{l.label}</td>
                    <td><span className={`tag ${l.kind}`}>{k.label}</span></td>
                    <td className="bt-range-c">
                      <span className="bt-range" aria-hidden="true">
                        <i className="t" style={{ transform: `scaleX(${l.today / rangeMax})` }} />
                        <i className="o" style={{ transform: `scaleX(${l.optimised / rangeMax})` }} />
                        <i className="m" style={{ transform: `scaleX(${l.bareMinimum / rangeMax})` }} />
                      </span>
                    </td>
                    <td className="num">{inr(l.today)}</td>
                    <td className="num">{inr(l.optimised)}</td>
                    <td className="num">{inr(l.bareMinimum)}</td>
                    <td className={`num ${l.today - l.optimised > 0 ? "good" : "muted"}`}>{l.today - l.optimised > 0 ? inr(l.today - l.optimised) : "–"}</td>
                  </tr>
                );
              })}
              {filter === "all" && (
                <tr className="bt-buffer" style={{ "--i": shownLines.length } as CSSProperties}>
                  <td>Safety buffer (5% of bare minimum)</td><td /><td className="bt-range-c" /><td className="num">–</td><td className="num">–</td><td className="num">{inr(b.contingency)}</td><td />
                </tr>
              )}
            </tbody>
            <tfoot>
              {filter === "all" ? (
                <>
                  <tr><td>Total</td><td /><td className="bt-range-c" /><td className="num">{inr(b.totals.today)}</td><td className="num">{inr(b.totals.optimised)}</td><td className="num">{inr(b.totals.bareMinimum)}</td><td className="num good">{inr(totalSaved)}</td></tr>
                  <tr className="bt-surplus"><td>Monthly surplus</td><td /><td className="bt-range-c" /><td className={`num ${b.savingsToday < 0 ? "bad" : ""}`}>{inr(b.savingsToday)}</td><td className={`num ${b.savingsOptimised < 0 ? "bad" : ""}`}>{inr(b.savingsOptimised)}</td><td className="num muted">–</td><td /></tr>
                </>
              ) : (
                <tr><td>Subtotal · {kindMeta(filter).plural.toLowerCase()}</td><td /><td className="bt-range-c" /><td className="num">{inr(sub("today"))}</td><td className="num">{inr(sub("optimised"))}</td><td className="num">{inr(sub("bareMinimum"))}</td><td className="num good">{sub("today") - sub("optimised") > 0 ? inr(sub("today") - sub("optimised")) : "–"}</td></tr>
              )}
            </tfoot>
          </table>
        </div>
        {b.unaccountedFlag && <div className="flag">Unaccounted money: {lakh(b.unaccounted)}/month. Use the Import statement tab to find where it goes.</div>}
      </Section>
    </div>
  );
}

