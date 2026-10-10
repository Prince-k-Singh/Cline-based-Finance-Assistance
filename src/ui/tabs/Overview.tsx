import { lakh, type Plan } from "../../engine";
import { Progress, Stat } from "../components";
import Section, { SectionToolbar, useSections } from "../Accordion";
import Breakdown from "../Breakdown";

/** Bucket accents for the allocation bar, in waterfall priority order. */
const ALLOC_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];
const PROTECT_BUCKETS = new Set(["Insurance top-up", "Emergency fund"]);
const SECTIONS = ["score", "surplus", "goals", "actions"] as const;

/** Lightweight SVG score ring (no chart library; draws in once with CSS). */
function ScoreRing({ value, tone }: { value: number; tone: string }) {
  const r = 52, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, value));
  return (
    <div className="ring" role="img" aria-label={`Financial health score ${v} out of 100`}>
      <svg viewBox="0 0 120 120" width="132" height="132" aria-hidden="true">
        <circle cx="60" cy="60" r={r} className="ring-bg" />
        <circle cx="60" cy="60" r={r} className="ring-fg" stroke={tone}
          strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} style={{ ["--c" as string]: c }} />
      </svg>
      <div className="ring-txt"><strong>{v}</strong><small>of 100</small></div>
    </div>
  );
}

export default function Overview({ plan, income }: { plan: Plan; income: number }) {
  const { budget, emergency, score, waterfall, fi, actions, debtAdvice } = plan;
  const tone = score.total >= 70 ? "var(--good)" : score.total >= 45 ? "var(--warn)" : "var(--bad)";
  const surplus = Math.max(0, budget.savingsOptimised);
  const allocated = waterfall.reduce((a, w) => a + w.amount, 0);
  const weakest = [...score.parts].sort((a, b) => a.score / a.max - b.score / b.max)[0];
  const spendingToday =
    budget.savingsToday < 0
      ? `Overspending by ${lakh(-budget.savingsToday)}/mo`
      : `Saving ${lakh(budget.savingsToday)}/mo today`;
  const efPct = Math.min(100, Math.round((emergency.existing / Math.max(1, emergency.target)) * 100));
  const { sec, allOpen, toggleAll } = useSections(SECTIONS, ["score", "surplus"], "parivar-plan:open:overview");

  // Colour is keyed to waterfall position so the bar and the numbered list match.
  const allocData = waterfall.map((w, i) => ({ name: w.bucket, value: w.amount, color: ALLOC_COLORS[i % ALLOC_COLORS.length] }));
  const actionCount = actions.d30.length + actions.d90.length + actions.m12.length;

  return (
    <div className="acc-stack">
      <div className="metrics">
        <Stat hero label="Monthly take-home" value={lakh(income)} sub="What lands in the bank each month" />
        <Stat label="Spending today" value={lakh(budget.totals.today)} sub={spendingToday} tone={budget.savingsToday < 0 ? "bad" : undefined} />
        <Stat label="Optimised budget" value={lakh(budget.totals.optimised)} sub={`Frees ${lakh(budget.totals.today - budget.totals.optimised)}/mo`} tone="good" />
        <Stat label="Bare minimum" value={lakh(budget.totals.bareMinimum)} sub="Essentials-only floor" />
      </div>

      <SectionToolbar hint="Tap a section to open or close it." allOpen={allOpen} onToggleAll={toggleAll} />

      <Section title="Financial health score" {...sec("score")}
        summary={<><b className="sum-strong" style={{ color: tone }}>{score.total}/100</b>{weakest && weakest.score < weakest.max ? ` · improve ${weakest.name.toLowerCase()}` : ""}</>}>
        <div className="ov-score">
          <div className="ov-score-side">
            <ScoreRing value={score.total} tone={tone} />
            {weakest && weakest.score < weakest.max && (
              <div className="improve"><strong>Improve next:</strong> {weakest.name}. {weakest.reason}</div>
            )}
          </div>
          <div className="ov-parts">
            {score.parts.map((p) => (
              <div key={p.name} className="ov-part">
                <div className="row" style={{ justifyContent: "space-between", fontSize: ".85rem" }}>
                  <strong>{p.name}</strong><span className="num">{p.score}/{p.max}</span>
                </div>
                <Progress pct={(p.score / p.max) * 100} />
                <div className="muted" style={{ fontSize: ".75rem", marginTop: ".2rem" }}>{p.reason}</div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Where should the surplus go?" {...sec("surplus")}
        summary={surplus > 0 ? `${lakh(surplus)}/mo surplus · ${waterfall.filter((w) => w.amount > 0).length} active steps` : "No surplus yet"}>
        {surplus <= 0 ? (
          <p className="muted" style={{ marginTop: 0 }}>
            There is no monthly surplus on the optimised budget yet. Free up spending in the Budget tab first —
            the allocation below unlocks as surplus appears.
          </p>
        ) : (
          <>
            <Breakdown data={allocData} totalLabel="Available monthly surplus" suffix="/mo" compact />
            <div className="ov-alloc">
              {(["Protect first", "Then grow"] as const).map((group, gi) => (
                <div key={group}>
                  <div className="alloc-group">{group}</div>
                  <ol className="alloc">
                    {waterfall
                      .map((w, i) => ({ w, i }))
                      .filter(({ i }) => (gi === 0 ? i < 2 : i >= 2))
                      .map(({ w, i }) => (
                        <li key={w.bucket}>
                          <span className="n" aria-hidden="true" style={{ background: ALLOC_COLORS[i % ALLOC_COLORS.length], color: "var(--on-brand)" }}>{i + 1}</span>
                          <div className="what">
                            <strong>{w.bucket}</strong>{" "}
                            <span className={`badge ${PROTECT_BUCKETS.has(w.bucket) ? "protect" : "grow"}`}>
                              {PROTECT_BUCKETS.has(w.bucket) ? "Protect" : "Grow"}
                            </span>
                            <div className="note">{w.note}</div>
                          </div>
                          <span className={`amt ${w.amount <= 0 ? "zero" : ""}`}>{w.amount > 0 ? `${lakh(w.amount)}/mo` : "done"}</span>
                        </li>
                      ))}
                  </ol>
                </div>
              ))}
            </div>
            <p className="muted" style={{ fontSize: ".75rem", marginBottom: 0, marginTop: ".75rem" }}>
              All {lakh(allocated)} of the surplus is allocated in priority order. These are suggestions from
              transparent assumptions — not guaranteed returns.
            </p>
          </>
        )}
        {debtAdvice.map((d) => <div key={d} className={`flag ${d.includes("Prepay") ? "" : "info"}`}>{d}</div>)}
        {budget.unaccountedFlag && <div className="flag">{lakh(budget.unaccounted)}/month is unaccounted for: income minus listed expenses and investing. Track it for a month.</div>}
      </Section>

      <Section title="Safety nets & long-term targets" {...sec("goals")}
        summary={`Emergency ${efPct}% · Lifestyle ${plan.lifestyle.fundedPct}% · FI ${lakh(fi.target)}`}>
        <div className="ov-kpis">
          <div className="ov-kpi">
            <div className="label">Emergency fund</div>
            <div className="value">{efPct}% funded</div>
            <Progress pct={efPct} color="var(--good)" />
            <div className="sub">{emergency.months} months · target {lakh(emergency.target)}</div>
          </div>
          <div className="ov-kpi">
            <div className="label">Financial independence number</div>
            <div className="value">{lakh(fi.target)}</div>
            <div className="sub">{fi.message}</div>
          </div>
          <div className="ov-kpi">
            <div className="label">Lifestyle fund</div>
            <div className="value">{plan.lifestyle.fundedPct}% funded</div>
            <Progress pct={plan.lifestyle.fundedPct} color="var(--brand)" />
            <div className="sub">{lakh(plan.lifestyle.affordable)}/mo affordable</div>
          </div>
        </div>
      </Section>

      <Section title="Action checklist" {...sec("actions")}
        summary={actionCount ? `${actions.d30.length} now · ${actions.d90.length} in 90 days · ${actions.m12.length} this year` : "Nothing urgent"}>
        <div className="ov-actions">
          {([["Next 30 days", actions.d30], ["Next 90 days", actions.d90], ["Next 12 months", actions.m12]] as const).map(([t, list]) => (
            <div key={t}>
              <h3>{t}</h3>
              <ul className="clean">{list.length ? list.map((a) => <li key={a}>{a}</li>) : <li className="muted">Nothing urgent.</li>}</ul>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
