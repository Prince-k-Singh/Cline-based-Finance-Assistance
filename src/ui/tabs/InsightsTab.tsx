import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { lakh, type Household, type MarketAnalysis } from "../../engine";
import { api } from "../api";
import Section, { SectionToolbar, useSections } from "../Accordion";
import Markdown from "../Markdown";
import type { NewsArticle, NewsFeed, NewsTopic } from "../types";
import { LeadStory, StoryCard, Ticker, timeAgo } from "./NewsParts";
import SpendingPredictor from "./SpendingPredictor";

const SEV = { warning: { icon: "⚠️", cls: "" }, opportunity: { icon: "💡", cls: "info" }, info: { icon: "ℹ️", cls: "info" } } as const;
const LANGS = ["English", "Hindi", "Bengali", "Assamese", "Tamil", "Telugu", "Marathi", "Gujarati", "Kannada"];
const TOPICS: [NewsTopic | "all", string][] = [["all", "Top stories"], ["markets", "Markets"], ["money", "Personal finance"], ["economy", "Economy"]];
const SECTIONS = ["impact", "brief", "predict"] as const;
/** While the API is still booting (dev: ~20s), retry a few times instead of giving up. */
const RETRY_MS = [2000, 4000, 6000, 8000, 10000];
const GRID_FIRST = 9;

/** Fetch with automatic retries on failure; returns data, error and a reload function. */
function useRetrying<T>(load: (force: boolean) => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const run = useRef(0);
  const reload = useCallback(async (force = false) => {
    const id = ++run.current;
    setBusy(true); setErr("");
    for (let attempt = 0; ; attempt++) {
      try {
        const d = await load(force);
        if (id === run.current) { setData(d); setBusy(false); }
        return;
      } catch (e) {
        if (id !== run.current) return;
        if (attempt >= RETRY_MS.length) { setErr((e as Error).message); setBusy(false); return; }
        await new Promise((r) => setTimeout(r, RETRY_MS[attempt]));
        if (id !== run.current) return;
      }
    }
  }, [load]);
  useEffect(() => { void reload(); return () => { run.current++; }; }, [reload]);
  return { data, err, busy, reload };
}

/** Pick a lead story (prefer one with a photo) and up to 3 related headlines on the same topic. */
function pickLead(pool: NewsArticle[], used: Set<string>, avoidTopic?: NewsTopic) {
  const free = pool.filter((a) => !used.has(a.id));
  const lead = free.find((a) => a.image && a.topic !== avoidTopic) ?? free.find((a) => a.image) ?? free[0];
  if (!lead) return null;
  used.add(lead.id);
  const related = free.filter((a) => a.id !== lead.id && a.topic === lead.topic).slice(0, 3);
  related.forEach((r) => used.add(r.id));
  return { lead, related };
}

const sourceLabel = (s: "live" | "cache" | "fallback") => (s === "live" ? "Live" : s === "cache" ? "Updated" : "Offline");

export default function InsightsTab({ h, aiOn }: { h: Household; aiOn: boolean }) {
  const loadNews = useCallback((force: boolean) => api.news(force), []);
  const loadMkt = useCallback((force: boolean) => api.market(h, force), [h]);
  const news = useRetrying<NewsFeed>(loadNews);
  const mkt = useRetrying<MarketAnalysis>(loadMkt);
  const [market, setMarket] = useState<MarketAnalysis | null>(null);
  useEffect(() => { if (mkt.data) setMarket(mkt.data); }, [mkt.data]);

  const [topic, setTopic] = useState<NewsTopic | "all">("all");
  const [more, setMore] = useState(false);
  const [brief, setBrief] = useState<{ text: string | null; tools: string[]; error?: string } | null>(null);
  const [briefing, setBriefing] = useState(false);
  const [lang, setLang] = useState("English");
  const { sec, allOpen, toggleAll } = useSections(SECTIONS, ["impact"], "parivar-plan:open:insights");
  const impactRef = useRef<HTMLDivElement>(null);

  const refreshAll = () => { void news.reload(true); void mkt.reload(true); };
  const openImpact = () => {
    const s = sec("impact");
    if (!s.open) s.onToggle();
    impactRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const runBrief = async () => {
    setBriefing(true);
    try {
      const r = await api.briefing(h, lang);
      setBrief({ text: r.briefing, tools: r.toolCalls, error: r.error });
      setMarket(r.analysis);
    } catch (e) {
      setBrief({ text: null, tools: [], error: (e as Error).message });
    } finally { setBriefing(false); }
  };

  // Lay out the front page: two lead stories (different topics when possible) + a grid.
  const layout = useMemo(() => {
    const all = news.data?.articles ?? [];
    const pool = topic === "all" ? all : all.filter((a) => a.topic === topic);
    const used = new Set<string>();
    const first = pickLead(pool, used);
    const second = pickLead(pool, used, topic === "all" ? first?.lead.topic : undefined);
    return { first, second, rest: pool.filter((a) => !used.has(a.id)), count: pool.length };
  }, [news.data, topic]);
  useEffect(() => setMore(false), [topic]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: news.data?.articles.length ?? 0 };
    news.data?.articles.forEach((a) => { c[a.topic] = (c[a.topic] ?? 0) + 1; });
    return c;
  }, [news.data]);

  const nifty = market?.signals.find((s) => s.symbol === "^NSEI");
  const topInsights = market?.insights.slice(0, 3) ?? [];
  const busy = news.busy || mkt.busy;
  const waking = busy && !news.data && !market;

  return (
    <div className="li">
      <Ticker quotes={news.data ? news.data.quotes : news.err ? [] : null} />

      <div className="li-bar">
        <div className="li-topics" role="tablist" aria-label="News topics">
          {TOPICS.map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={topic === id} className={`chip${topic === id ? " active" : ""}`} onClick={() => setTopic(id)}>
              {label}{news.data && <b>{counts[id] ?? 0}</b>}
            </button>
          ))}
        </div>
        <div className="li-status">
          {news.data && <span className="li-live"><i className={news.data.source === "live" ? "on" : ""} />{sourceLabel(news.data.source)} · {timeAgo(news.data.fetchedAt)}</span>}
          <button type="button" className="btn li-refresh" disabled={busy} onClick={refreshAll} aria-label="Refresh news and prices">
            <span className={busy ? "spin" : ""} aria-hidden="true">↻</span> {busy ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {waking && <div className="li-wake" role="status">Connecting to the Prospera server… news and prices will appear in a moment.</div>}
      {news.err && !news.data && (
        <div className="flag">
          Couldn't load the news ({news.err}). The page needs the local API server: run <code>npm run dev</code> (not just <code>vite</code>), wait for "Parivar Plan API on http://localhost:8787", then press Refresh.
        </div>
      )}

      <div className="li-front">
        <div className="li-main">
          <div className="li-leads">
            {!news.data && !news.err && <><div className="li-lead skel-lead" /><div className="li-lead skel-lead" /></>}
            {layout.first && <LeadStory a={layout.first.lead} related={layout.first.related} big />}
            {layout.second && <LeadStory a={layout.second.lead} related={layout.second.related} />}
            {news.data && layout.count === 0 && <p className="muted">No stories in this topic right now.</p>}
          </div>

          {layout.rest.length > 0 && (
            <section className="li-more" aria-label="Other top stories">
              <div className="li-rule big"><span>Other top stories</span></div>
              <div className="li-grid">
                {layout.rest.slice(0, more ? 60 : GRID_FIRST).map((a, i) => <StoryCard key={a.id} a={a} i={i} />)}
              </div>
              {layout.rest.length > GRID_FIRST && (
                <button type="button" className="btn li-moreBtn" onClick={() => setMore((m) => !m)}>
                  {more ? "Show fewer" : `Show ${layout.rest.length - GRID_FIRST} more stories`}
                </button>
              )}
            </section>
          )}
        </div>

        <aside className="li-side" aria-label="Your money today">
          <h3 className="li-side-h">Your money today</h3>
          {!market && !mkt.err && Array.from({ length: 4 }, (_, i) => <div key={i} className="li-rate skel" />)}
          {mkt.err && !market && <p className="muted li-side-err">Live numbers unavailable: {mkt.err}</p>}
          {market && (
            <>
              <div className="li-rate">
                <div className="li-rate-v">{market.latestCpiPct !== null ? `${market.latestCpiPct}%` : "–"}</div><i />
                <div className="li-rate-t">India CPI inflation{market.cpiYear ? ` (${market.cpiYear})` : ""}</div>
                <div className="li-rate-s">Your plan assumes {market.assumedInflationPct}%</div>
              </div>
              <div className="li-rate">
                <div className={`li-rate-v${nifty && (nifty.ret1yPct ?? 0) < 0 ? " bad" : " good"}`}>{nifty?.ret1yPct != null ? `${nifty.ret1yPct > 0 ? "+" : ""}${nifty.ret1yPct}%` : "–"}</div><i />
                <div className="li-rate-t">Nifty 50 over 1 year</div>
                <div className="li-rate-s">{nifty ? `${nifty.regime.replace("-", " ")} · ${nifty.drawdownFromHighPct ?? "–"}% from high` : "unavailable"}</div>
              </div>
              <div className="li-rate">
                <div className="li-rate-v">{market.goldInrRet1yPct !== null ? `${market.goldInrRet1yPct > 0 ? "+" : ""}${market.goldInrRet1yPct}%` : "–"}</div><i />
                <div className="li-rate-t">Gold in ₹ over 1 year</div>
              </div>
              <div className="li-rate">
                <div className={`li-rate-v${market.realCashReturnPct < 0 ? " bad" : ""}`}>{market.realCashReturnPct}% / {market.realFdReturnPct}%</div><i />
                <div className="li-rate-t">Your real return: savings / FD</div>
                <div className="li-rate-s">after your tax slab and inflation</div>
              </div>
              <button type="button" className="li-side-link" onClick={openImpact}>See what this means for you →</button>
            </>
          )}
        </aside>
      </div>

      <div className="acc-stack li-acc">
        <SectionToolbar hint="Your personalised analysis, below the headlines." allOpen={allOpen} onToggleAll={toggleAll} />

        <div ref={impactRef} className="li-anchor">
          <Section title="What it means for your money" {...sec("impact")}
            summary={market ? <><b className="sum-strong">{market.insights.length}</b> insight{market.insights.length === 1 ? "" : "s"}{topInsights[0] ? ` · ${topInsights[0].title}` : ""}</> : mkt.err ? "unavailable" : "loading…"}>
            {mkt.err && !market && <div className="flag">Could not load market analysis: {mkt.err}</div>}
            {!market && !mkt.err && <p className="muted">Fetching live data…</p>}
            {market && (
              <>
                <div className="li-insights">
                  {market.insights.map((i, k) => (
                    <div key={i.id} className={`flag li-insight ${SEV[i.severity].cls}`} style={{ animationDelay: `${k * 60}ms` }}>
                      <strong>{SEV[i.severity].icon} {i.title}</strong>
                      {i.impactRupees ? <span className="pill" style={{ marginLeft: ".5rem" }}>≈ {lakh(i.impactRupees)}</span> : null}
                      <div style={{ marginTop: ".25rem" }}>{i.detail}</div>
                    </div>
                  ))}
                </div>
                <p className="muted li-fine">
                  {sourceLabel(market.source)} · {new Date(market.asOf).toLocaleString("en-IN")}. {market.notes.join(" ")} Signals: EWMA volatility (λ=0.94), log-linear trend regression, 200-day z-score, drawdown.
                </p>
              </>
            )}
          </Section>
        </div>

        <Section title="AI Macro-Analyst briefing" {...sec("brief")}
          summary={<span className={`pill ${aiOn ? "on" : "off"}`}>{aiOn ? "Cline SDK agent" : "AI off"}</span>}>
          <p className="muted" style={{ marginTop: 0, fontSize: ".85rem" }}>
            A Cline SDK agent reads the live market analysis and your plan through tools, then writes a personal briefing. It can only quote numbers those tools return.
          </p>
          <div className="row">
            <select style={{ width: 160 }} value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Briefing language">{LANGS.map((l) => <option key={l}>{l}</option>)}</select>
            <button className="btn primary" disabled={!aiOn || briefing} onClick={runBrief}>{briefing ? "Analysing…" : "Generate my briefing"}</button>
          </div>
          {brief?.error && <div className="flag">AI briefing failed: {brief.error}</div>}
          {brief?.text && (
            <div className="msg assistant" style={{ maxWidth: "100%", marginTop: ".75rem" }}>
              <Markdown text={brief.text} />
              <div className="tools">🔧 tools used: {brief.tools.join(", ")}</div>
            </div>
          )}
        </Section>

        <Section title="Mid-month spending predictor" {...sec("predict")} summary="Warns you before you overspend">
          <SpendingPredictor h={h} embedded />
        </Section>

        {news.data && (
          <p className="muted li-fine">
            Headlines from Mint, The Economic Times and Business Standard; prices from Yahoo Finance. Stories open on the publisher's site. Gold ₹/10g is the international price converted at today's rupee rate, before import duty and GST.
            {news.data.notes.length > 0 && ` ${news.data.notes.join(" ")}`}
          </p>
        )}
      </div>
    </div>
  );
}
