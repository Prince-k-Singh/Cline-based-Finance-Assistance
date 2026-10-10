import type { ReactNode } from "react";
import { inr, lakh } from "../engine";

export const Card = ({ title, children, extra }: { title?: ReactNode; children: ReactNode; extra?: ReactNode }) => (
  <div className="card">
    {(title || extra) && (
      <div className="row" style={{ justifyContent: "space-between", marginBottom: ".5rem" }}>
        {title && <h2 style={{ margin: 0 }}>{title}</h2>}
        {extra}
      </div>
    )}
    {children}
  </div>
);

export const Stat = ({ label, value, sub, tone, hero }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "good" | "bad" | "warn"; hero?: boolean }) => (
  <div className={`card stat${hero ? " hero" : ""}`}>
    <div className="label">{label}</div>
    <div className={`value ${tone ?? ""}`}>{value}</div>
    {sub && <div className="sub">{sub}</div>}
  </div>
);

export const Money = ({ v, short }: { v: number; short?: boolean }) => <>{short ? lakh(v) : inr(v)}</>;

export function NumField({ label, value, onChange, step = 500, suffix }: { label: string; value: number; onChange: (n: number) => void; step?: number; suffix?: string }) {
  return (
    <label className="f">
      {label}
      {suffix ? ` (${suffix})` : ""}
      <input type="number" min={0} step={step} value={Number.isFinite(value) ? value : 0} onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))} />
    </label>
  );
}

export function Progress({ pct, color }: { pct: number; color?: string }) {
  return (
    <div className="bar">
      <span style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }} />
    </div>
  );
}

/** Horizontal bars comparing a few values (pure CSS chart). */
export function HBars({ rows }: { rows: { label: string; value: number; color?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="hbars">
      {rows.map((r) => (
        <div className="hbar" key={r.label}>
          <span className="muted">{r.label}</span>
          <div className="bar" style={{ height: 14 }}>
            <span style={{ width: `${(r.value / max) * 100}%`, background: r.color ?? "var(--brand-2)" }} />
          </div>
          <span className="num" style={{ textAlign: "right" }}>{lakh(r.value)}</span>
        </div>
      ))}
    </div>
  );
}

export const PALETTE = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)", "var(--chart-7)", "var(--chart-8)", "var(--chart-9)"];

export function StackBar({ parts }: { parts: { label: string; value: number }[] }) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  const shown = parts.filter((p) => p.value > 0);
  return (
    <div>
      <div className="stack">
        {shown.map((p) => (
          <span key={p.label} title={`${p.label}: ${lakh(p.value)}`} style={{ width: `${(p.value / total) * 100}%`, background: PALETTE[parts.indexOf(p) % PALETTE.length] }} />
        ))}
      </div>
      <div className="legend">
        {shown.map((p) => (
          <span key={p.label}>
            <i style={{ background: PALETTE[parts.indexOf(p) % PALETTE.length] }} />
            {p.label} {Math.round((p.value / total) * 100)}%
          </span>
        ))}
      </div>
    </div>
  );
}
