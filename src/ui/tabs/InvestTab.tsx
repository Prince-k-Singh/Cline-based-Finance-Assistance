import { ASSETS, HOLDING_TYPES, lakh, postTaxReturn, type Household, type Plan } from "../../engine";
import { Card, Stat } from "../components";
import { Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { MixCompare } from "../Breakdown";

const CAT_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)", "var(--chart-7)", "var(--chart-8)", "var(--chart-9)", "var(--chart-10)"];

export default function InvestTab({ plan, h }: { plan: Plan; h: Household }) {
  const p = plan.portfolio;
  if (p.total === 0)
    return <Card title="Investments"><p className="muted">Add your current holdings on the "Your details" tab to see the analysis.</p></Card>;
  
  // Colour is keyed to the asset type so both donuts use the same colour for the same asset.
  const colorOf = (i: number) => CAT_COLORS[i % CAT_COLORS.length];
  const mixItems = HOLDING_TYPES.map((t, i) => ({ name: ASSETS[t].label, color: colorOf(i), a: p.current[t], b: p.suggested[t] }));

  // Transform projections for AreaChart
  const chartData = [
    { year: 0, Current: p.total, Suggested: p.total },
    ...p.projections.map(pr => ({
      year: pr.years,
      Current: pr.current.base,
      Suggested: pr.suggested.base,
    }))
  ];

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <div className="grid g4">
        <Stat label="Total investments" value={lakh(p.total)} />
        <Stat label="Current mix: post-tax / real" value={`${p.currentPostTaxPct}% / ${p.currentRealPct}%`} sub={`Worst year ≈ ${p.currentWorstYearPct}%`} />
        <Stat label="Suggested mix: post-tax / real" value={`${p.suggestedPostTaxPct}% / ${p.suggestedRealPct}%`} sub={`Worst year ≈ ${p.suggestedWorstYearPct}%`} tone="good" />
        <Stat label="Effort" value="Similar" sub="Index-fund SIPs, set and forget" />
      </div>

      <Card title="Current vs suggested mix (same capital)">
        <MixCompare items={mixItems} aLabel="Current" bLabel="Suggested" />
      </Card>

      <div className="grid g2">
        <Card title="What to move">
          <ul className="clean">{p.moves.length ? p.moves.map((m) => <li key={m}>{m}</li>) : <li>Your mix is already close to the suggestion.</li>}</ul>
          {p.flags.map((f) => <div className="flag" key={f}>{f}</div>)}
        </Card>

        <Card title="Projections (no new money added)">
          <div style={{ height: 250, marginTop: '1rem', marginBottom: '1rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCur" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--muted)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--muted)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSug" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--good)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--good)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                <XAxis dataKey="year" tickFormatter={(y) => `Year ${y}`} stroke="var(--muted)" fontSize={12} tickLine={false} />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip 
                  labelFormatter={(label) => `Year ${label}`}
                  formatter={(value: any) => [lakh(Number(value)), '']}
                  contentStyle={{ backgroundColor: 'var(--card-solid)', borderColor: 'var(--line)', borderRadius: '8px' }}
                />
                <Legend />
                <Area type="monotone" dataKey="Current" stroke="var(--muted)" fillOpacity={1} fill="url(#colorCur)" animationDuration={200} />
                <Area type="monotone" dataKey="Suggested" stroke="var(--good)" strokeWidth={2} fillOpacity={1} fill="url(#colorSug)" animationDuration={200} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="muted" style={{ fontSize: ".8rem" }}>
            Lines represent base scenarios. The suggested mix can fall about {Math.abs(p.suggestedWorstYearPct)}% in a bad year. Higher return comes with that risk.
          </p>
        </Card>
      </div>

      <Card title="Assumptions used">
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead><tr><th>Asset</th><th className="num">Pre-tax</th><th>Tax</th><th className="num">Post-tax (your slab)</th><th className="num">Worst year</th><th>Liquidity</th><th>Effort</th></tr></thead>
            <tbody>
              {HOLDING_TYPES.map((t) => (
                <tr key={t}><td>{ASSETS[t].label}</td><td className="num">{ASSETS[t].preTaxPct}%</td><td>{ASSETS[t].tax}</td><td className="num">{postTaxReturn(t, h.taxSlabPct).toFixed(1)}%</td><td className="num">{ASSETS[t].worstYearPct}%</td><td>{ASSETS[t].liquidity}</td><td>{ASSETS[t].effort}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ fontSize: ".75rem" }}>Assumptions last reviewed on {plan.assumptionsReviewed}. Edit them in <code>src/engine/assumptions.ts</code>.</p>
      </Card>
    </div>
  );
}

