import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Plan } from "../../engine";

const fmt = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const reduced = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Adds `.in` when the element scrolls into view (one-shot), for CSS reveal animations. */
export function Reveal({ children, className = "", delay = 0, as: Tag = "div" }: { children: ReactNode; className?: string; delay?: number; as?: "div" | "section" | "li" }) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced() || typeof IntersectionObserver === "undefined") return setShown(true);
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && (setShown(true), io.disconnect()), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref as never} className={`lp-reveal ${shown ? "in" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </Tag>
  );
}

/** Counts up from 0 to `to` once visible. */
export function CountUp({ to, suffix = "", prefix = "" }: { to: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [v, setV] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced() || typeof IntersectionObserver === "undefined") return setV(to);
    let raf = 0;
    const io = new IntersectionObserver((es) => {
      if (!es.some((e) => e.isIntersecting)) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / 1200);
        setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to]);
  return <span ref={ref}>{prefix}{v.toLocaleString("en-IN")}{suffix}</span>;
}

/** Live product preview built from the real engine output for the sample family. */
export function HeroPreview({ plan }: { plan: Plan }) {
  const score = plan.score.total;
  const r = 34, c = 2 * Math.PI * r;
  const t = plan.budget.totals;
  const max = Math.max(t.today, 1);
  const ef = plan.emergency.target ? Math.min(100, Math.round((plan.emergency.existing / plan.emergency.target) * 100)) : 100;
  const rows: [string, number, string][] = [["Today", t.today, "lp-bar-a"], ["Optimised", t.optimised, "lp-bar-b"], ["Bare minimum", t.bareMinimum, "lp-bar-c"]];
  return (
    <div className="lp-preview" aria-label="Preview of a Prospera plan for the sample family">
      <div className="lp-pv-head">
        <span className="muted">Sample family · Bengaluru</span>
      </div>
      <div className="lp-pv-grid">
        <div className="lp-pv-card lp-pv-score">
          <svg viewBox="0 0 80 80" width="92" height="92" aria-hidden="true">
            <circle cx="40" cy="40" r={r} className="lp-ring-bg" />
            <circle cx="40" cy="40" r={r} className="lp-ring-fg" strokeDasharray={c} style={{ strokeDashoffset: c * (1 - score / 100) }} />
          </svg>
          <div><strong className="lp-big">{score}</strong><span className="muted">/100</span><div className="muted lp-small">Money health score</div></div>
        </div>
        <div className="lp-pv-card">
          <div className="lp-small muted">Monthly budget</div>
          {rows.map(([label, v, cls], i) => (
            <div key={label} className="lp-bar-row">
              <span>{label}</span>
              <div className="lp-bar"><i className={cls} style={{ width: `${(v / max) * 100}%`, animationDelay: `${300 + i * 150}ms` }} /></div>
              <b>{fmt(v)}</b>
            </div>
          ))}
        </div>
        <div className="lp-pv-card">
          <div className="lp-small muted">Emergency fund · {plan.emergency.months} months</div>
          <div className="lp-bar lp-bar-lg"><i className="lp-bar-b" style={{ width: `${ef}%`, animationDelay: "700ms" }} /></div>
          <div className="lp-small"><b>{ef}%</b> of {fmt(plan.emergency.target)}</div>
        </div>
      </div>
      <div className="lp-float lp-float-1">Health cover gap {fmt(plan.emergency.insurance.healthGap)}</div>
      <div className="lp-float lp-float-2">Save {fmt(t.today - t.optimised)} more / month</div>
    </div>
  );
}
