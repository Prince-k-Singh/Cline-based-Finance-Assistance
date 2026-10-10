import { useMemo, useState, type CSSProperties } from "react";
import { lakh } from "../engine";

export type Slice = { name: string; value: number; color: string };

const TOP = 7;                 // rows shown before the tail folds into "Other"
const OTHER = "__other__";
const OTHER_COLOR = "var(--chart-other)";

type Row = Slice & { key: string; pct: number; tail: boolean };

/**
 * Interactive part-of-whole chart (replaces the canvas pie/donut).
 * Plain DOM + CSS transitions: no animation loop, so it costs nothing when idle.
 * - Stacked bar shows the share of every item; the ranked list shows exact amounts.
 * - Hover / focus a row or bar segment to highlight it; click to pin it.
 * - Changing the data (e.g. Today → Optimised) animates widths smoothly.
 */
export default function Breakdown({ data, totalLabel = "Total", compact = false, suffix = "" }: {
  data: Slice[]; totalLabel?: string; compact?: boolean; suffix?: string;
}) {
  const { rows, total, fold } = useMemo(() => {
    const sorted = data.filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
    const sum = sorted.reduce((a, d) => a + d.value, 0);
    const folds = sorted.length > TOP + 1;
    const out: Row[] = sorted.map((d, i) => ({
      ...d, key: d.name, pct: sum ? (d.value / sum) * 100 : 0,
      tail: folds && i >= TOP, color: folds && i >= TOP ? OTHER_COLOR : d.color,
    }));
    return { rows: out, total: sum, fold: folds };
  }, [data]);

  const [hover, setHover] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const tail = rows.filter((r) => r.tail);
  const otherRow: Row | null = fold ? {
    key: OTHER, name: `Other (${tail.length} items)`, color: OTHER_COLOR, tail: true,
    value: tail.reduce((a, r) => a + r.value, 0), pct: tail.reduce((a, r) => a + r.pct, 0),
  } : null;
  const listed = !fold || showAll ? rows : [...rows.filter((r) => !r.tail), otherRow!];
  const listMax = Math.max(1, ...listed.map((r) => r.value));

  const find = (k: string | null) => (k === OTHER ? otherRow : rows.find((r) => r.key === k) ?? null);
  // A pinned item can vanish when data changes (e.g. Today → Optimised); ignore stale keys.
  const curRow = find(hover) ?? find(pinned);
  const cur = curRow ? curRow.key : null;
  const lit = (r: Row) => cur === null || cur === r.key || (cur === OTHER && r.tail);
  const togglePin = (key: string) => setPinned((p) => (p === key ? null : key));

  if (!rows.length) return <p className="muted" style={{ margin: 0 }}>Nothing to show yet.</p>;

  const hoverProps = (key: string) => ({
    onPointerEnter: () => setHover(key), onPointerLeave: () => setHover(null),
    onFocus: () => setHover(key), onBlur: () => setHover(null),
  });

  return (
    <div className={`bd${compact ? " compact" : ""}${cur ? " has-focus" : ""}`}>
      <div className="bd-head" aria-live="polite">
        <span className="bd-label">{curRow ? curRow.name : totalLabel}</span>
        <strong className="bd-val">{lakh(curRow ? curRow.value : total)}{suffix}</strong>
        <span className="bd-pct">{curRow ? `${curRow.pct.toFixed(1)}% of ${lakh(total)}` : `${rows.length} item${rows.length === 1 ? "" : "s"}`}</span>
      </div>

      <div className="bd-bar" role="img" aria-label={rows.map((r) => `${r.name} ${r.pct.toFixed(0)}%`).join(", ")}>
        {listed.map((r) => (
          <span key={r.key} className={lit(r) ? "" : "dim"} style={{ flexGrow: r.value, background: r.color }}
            title={`${r.name}: ${lakh(r.value)} (${r.pct.toFixed(1)}%)`}
            onPointerEnter={() => setHover(r.key)} onPointerLeave={() => setHover(null)}
            onClick={() => togglePin(r.key)} />
        ))}
      </div>

      {compact ? (
        <ul className="bd-chips">
          {listed.map((r) => (
            <li key={r.key}>
              <button type="button" className={pinned === r.key ? "on" : ""} aria-pressed={pinned === r.key}
                onClick={() => togglePin(r.key)} {...hoverProps(r.key)}>
                <i style={{ background: r.color }} />{r.name}<b>{r.pct.toFixed(0)}%</b>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="bd-list">
          {listed.map((r, i) => (
            <li key={r.key} style={{ "--i": i } as CSSProperties}>
              <button type="button" className={`${pinned === r.key ? "on" : ""}${lit(r) ? "" : " dim"}`}
                aria-pressed={r.key === OTHER ? undefined : pinned === r.key}
                onClick={() => (r.key === OTHER ? (setShowAll(true), setHover(null)) : togglePin(r.key))} {...hoverProps(r.key)}>
                <i className="sw" style={{ background: r.color }} />
                <span className="nm">{r.name}</span>
                <span className="amt">{lakh(r.value)}{suffix}</span>
                <span className="pc">{r.pct.toFixed(0)}%</span>
                <span className="trk" aria-hidden="true">
                  <em style={{ transform: `scaleX(${r.value / listMax})`, background: r.color }} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {!compact && fold && showAll && (
        <button type="button" className="linkbtn bd-more" onClick={() => setShowAll(false)}>Show fewer</button>
      )}
    </div>
  );
}

/**
 * Side-by-side comparison of two mixes of the same total (e.g. current vs suggested portfolio).
 * Two aligned stacked bars show the overall shape; per-item rows show both amounts and the change.
 */
export function MixCompare({ items, aLabel, bLabel }: {
  items: { name: string; color: string; a: number; b: number }[]; aLabel: string; bLabel: string;
}) {
  const shown = items.filter((r) => r.a > 0 || r.b > 0).sort((x, y) => Math.max(y.a, y.b) - Math.max(x.a, x.b));
  const totA = shown.reduce((s, r) => s + r.a, 0), totB = shown.reduce((s, r) => s + r.b, 0);
  const max = Math.max(1, ...shown.map((r) => Math.max(r.a, r.b)));
  const [hover, setHover] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const cur = shown.some((r) => r.name === hover) ? hover : shown.some((r) => r.name === pinned) ? pinned : null;
  const pct = (v: number, t: number) => (t ? Math.round((v / t) * 100) : 0);
  if (!shown.length) return <p className="muted" style={{ margin: 0 }}>Nothing to show yet.</p>;

  const bar = (key: "a" | "b", label: string, tot: number) => (
    <div className="mc-stack">
      <span className="mc-lab">{label}</span>
      <div className="bd-bar" role="img" aria-label={`${label}: ${shown.filter((r) => r[key] > 0).map((r) => `${r.name} ${pct(r[key], tot)}%`).join(", ")}`}>
        {shown.map((r) => (
          <span key={r.name} className={cur === null || cur === r.name ? "" : "dim"} style={{ flexGrow: r[key], background: r.color }}
            title={`${r.name}: ${lakh(r[key])} (${pct(r[key], tot)}%)`}
            onPointerEnter={() => setHover(r.name)} onPointerLeave={() => setHover(null)}
            onClick={() => setPinned((p) => (p === r.name ? null : r.name))} />
        ))}
      </div>
    </div>
  );

  return (
    <div className={`mc${cur ? " has-focus" : ""}`}>
      {bar("a", aLabel, totA)}
      {bar("b", bLabel, totB)}
      <div className="mc-legend" aria-hidden="true">
        <span><i className="mc-a" />{aLabel}</span><span><i className="mc-b" />{bLabel}</span>
      </div>
      <ul className="mc-list">
        {shown.map((r) => {
          const d = r.b - r.a;
          return (
            <li key={r.name}>
              <button type="button" className={`${pinned === r.name ? "on" : ""}${cur === null || cur === r.name ? "" : " dim"}`}
                aria-pressed={pinned === r.name}
                onClick={() => setPinned((p) => (p === r.name ? null : r.name))}
                onPointerEnter={() => setHover(r.name)} onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(r.name)} onBlur={() => setHover(null)}>
                <span className="nm"><i className="sw" style={{ background: r.color }} />{r.name}</span>
                <span className={`delta ${d > 0 ? "up" : d < 0 ? "down" : ""}`}>
                  {d === 0 ? "no change" : `${d > 0 ? "+" : "−"}${lakh(Math.abs(d))}`}
                </span>
                <span className="mc-bars">
                  <span className="trk"><em className="mc-a" style={{ transform: `scaleX(${r.a / max})` }} /></span>
                  <span className="v">{lakh(r.a)} · {pct(r.a, totA)}%</span>
                  <span className="trk"><em style={{ transform: `scaleX(${r.b / max})`, background: r.color }} /></span>
                  <span className="v">{lakh(r.b)} · {pct(r.b, totB)}%</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
