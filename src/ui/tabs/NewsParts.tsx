import { useRef, useState } from "react";
import type { NewsArticle, Quote } from "../types";

/** "12 min ago", "5 h ago", "2 days ago", or a date for older items. */
export function timeAgo(iso: string | null, now = Date.now()): string {
  if (!iso) return "";
  const m = Math.max(0, Math.round((now - Date.parse(iso)) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d < 7 ? `${d} day${d > 1 ? "s" : ""} ago` : new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: n >= 10000 ? 0 : 2, maximumFractionDigits: 2 });
const signed = (n: number, d = 2) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d })}`;

/** Tiny SVG line chart of recent closes. */
export function Spark({ data, up }: { data: number[]; up: boolean }) {
  if (data.length < 2) return null;
  const w = 72, h = 26, min = Math.min(...data), max = Math.max(...data), span = max - min || 1;
  const pts = data.map((v, i) => `${((i / (data.length - 1)) * w).toFixed(1)},${(h - 2 - ((v - min) / span) * (h - 4)).toFixed(1)}`).join(" ");
  return (
    <svg className={`li-spark ${up ? "up" : "down"}`} viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true">
      <polyline points={`0,${h} ${pts} ${w},${h}`} className="fill" />
      <polyline points={pts} className="line" />
    </svg>
  );
}

/** Horizontal market strip (scrolls sideways; arrow buttons on desktop). */
export function Ticker({ quotes }: { quotes: Quote[] | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const nudge = (dir: number) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: "smooth" });
  return (
    <div className="li-ticker card" aria-label="Market prices">
      <button type="button" className="li-tick-arrow" onClick={() => nudge(-1)} aria-label="Scroll prices left">‹</button>
      <div className="li-tick-track" ref={ref}>
        {quotes === null
          ? Array.from({ length: 5 }, (_, i) => <div key={i} className="li-tick skel" />)
          : quotes.map((q) => {
              const up = q.change >= 0;
              return (
                <div key={q.symbol} className="li-tick" title={`${q.label}${q.unit ? ` (${q.unit})` : ""}: change since previous close`}>
                  <span className="li-tick-badge">{q.short}</span>
                  <div className="li-tick-body">
                    <div className="li-tick-top"><b>{q.label}</b><span className="li-tick-px">{fmt(q.price)}</span></div>
                    <div className={`li-tick-chg ${up ? "up" : "down"}`}>
                      {up ? "▲" : "▼"} {signed(q.change, q.price >= 10000 ? 0 : 2)} ({signed(q.changePct)}%)
                    </div>
                  </div>
                  <Spark data={q.spark} up={up} />
                </div>
              );
            })}
      </div>
      <button type="button" className="li-tick-arrow" onClick={() => nudge(1)} aria-label="Scroll prices right">›</button>
    </div>
  );
}

/** Lazy image with a branded placeholder if the publisher's image is missing or fails. */
export function NewsImg({ a, className }: { a: NewsArticle; className: string }) {
  const [bad, setBad] = useState(false);
  const [ready, setReady] = useState(false);
  return (
    <div className={`li-img ${className}${ready ? " ready" : ""}`}>
      {a.image && !bad ? (
        <img src={a.image} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onLoad={() => setReady(true)} onError={() => setBad(true)} />
      ) : (
        <span className={`li-img-ph t-${a.topic}`} aria-hidden="true">{a.source.split(" ").map((w) => w[0]).join("")}</span>
      )}
    </div>
  );
}

export const Meta = ({ a }: { a: NewsArticle }) => (
  <div className="li-meta"><span className="li-src">{a.source}</span>{a.publishedAt && <> · <time dateTime={a.publishedAt}>{timeAgo(a.publishedAt)}</time></>}</div>
);

const ext = { target: "_blank", rel: "noopener noreferrer" } as const;

/** Lead story: big image, big headline, summary, then a "Related" list. */
export function LeadStory({ a, related, big }: { a: NewsArticle; related: NewsArticle[]; big?: boolean }) {
  return (
    <article className={`li-lead${big ? " big" : ""}`}>
      <a href={a.link} {...ext} className="li-lead-link">
        <NewsImg a={a} className={big ? "r-hero" : "r-wide"} />
        <h3 className="li-lead-h">{a.title}</h3>
      </a>
      {a.summary && <p className="li-sum">{a.summary}</p>}
      <Meta a={a} />
      {related.length > 0 && (
        <div className="li-related">
          <div className="li-rule"><span>Related</span></div>
          <ul>
            {related.map((r) => (
              <li key={r.id}><a href={r.link} {...ext}>{r.title}</a></li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

/** Compact card for the "Other top stories" grid. */
export function StoryCard({ a, i }: { a: NewsArticle; i: number }) {
  return (
    <a href={a.link} {...ext} className="li-card" style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}>
      <NewsImg a={a} className="r-card" />
      <div className="li-card-body">
        <h4>{a.title}</h4>
        <Meta a={a} />
      </div>
    </a>
  );
}
