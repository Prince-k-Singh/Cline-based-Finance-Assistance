import fs from "node:fs";
const f = "src/ui/styles.css";
let s = fs.readFileSync(f, "utf8");
const log = [];
const R = (from, to) => { const b = s; s = typeof from === "string" ? s.split(from).join(to) : s.replace(from, to); log.push(`${b === s ? "NO MATCH" : "ok"}  ${String(from).slice(0, 80)}`); };

R(".stat.hero .value { font-size: 2.3rem; background: linear-gradient(90deg, var(--brand), var(--brand-strong)); -webkit-background-clip: text; background-clip: text; color: transparent; }",
  ".stat.hero .value { font-size: 2.3rem; color: var(--ink); }");
R("overflow: hidden; background: var(--input-bg); margin: .55rem 0 .2rem; }", "overflow: hidden; background: var(--track); margin: .55rem 0 .2rem; }");
R(/\.onb-hero-scene \{[\s\S]*?\r?\n\}\r?\n/, "");
R(/\.dollar-float \{[^}]*\}\r?\n\.dollar-glyph \{[\s\S]*?\r?\n\}\r?\n/, "");
R(/\.dollar-stack \{[^}]*\}\r?\n\.dollar-stack \.dollar-back \{[^}]*\}\r?\n\.dollar-shadow \{[\s\S]*?\r?\n\}\r?\n/, "");
R(/@media \(prefers-reduced-motion: reduce\) \{ \.dollar-float, \.dollar-shadow \{ animation: none; \} \}\r?\n/, "");
R(/\.skeleton-hero \{[\s\S]*?\r?\n\}\r?\n/, "");
R(/  \.onb-hero-scene \{[^}]*\}\r?\n  \.dollar-glyph \{[^}]*\}\r?\n/, "");
R("/* ---------- Onboarding (Dollar Hero & Content) ---------- */", "/* ---------- Onboarding (Welcome: intro + form card) ---------- */");
R(/grid-template-columns: 1fr 1fr; \r?\n  gap: 3rem; /, "grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);\r\n  gap: 3rem;");
R(".mc-legend .mc-b { background: linear-gradient(90deg, var(--brand-2), var(--good)); }", ".mc-legend .mc-b { background: var(--good); }");
R("background: linear-gradient(90deg, var(--good), var(--brand-2)); transform-origin: left; }", "background: var(--good); transform-origin: left; }");
R("border-radius: inherit; background: linear-gradient(90deg, var(--good), var(--brand-2));", "border-radius: inherit; background: var(--good);");
R(".bd-list .trk { grid-column: 2 / -1; height: 6px; border-radius: 99px; background: var(--input-bg);", ".bd-list .trk { grid-column: 2 / -1; height: 6px; border-radius: 99px; background: var(--track);");
R(".mc-bars .trk { height: 6px; border-radius: 99px; background: var(--input-bg);", ".mc-bars .trk { height: 6px; border-radius: 99px; background: var(--track);");
R(".ring-bg { fill: none; stroke: var(--input-bg);", ".ring-bg { fill: none; stroke: var(--track);");
R(/\.logo\.brand-rupee \{[\s\S]*?\r?\n\}/, ".logo.brand-rupee { width: 48px; height: 48px; border-radius: 10px; font-size: 1.5rem; }");
R(".hero-points { list-style: none; padding: 0; color: var(--ink); line-height: 2; margin: 0; }",
  ".hero-points { list-style: none; padding: 0; color: var(--ink); margin: 0; display: grid; gap: .6rem; }\r\n.hero-points li { display: flex; align-items: flex-start; gap: .6rem; line-height: 1.5; }\r\n.pt-ic { flex: none; display: inline-grid; place-items: center; width: 22px; height: 22px; border-radius: 6px; background: var(--brand-soft); color: var(--brand); font-size: .8rem; font-weight: 700; }");
R(".onb-intro h1 { font-size: clamp(2.2rem, 5vw, 3.2rem); margin: .75rem 0 .5rem; letter-spacing: -0.03em; line-height: 1; }", ".onb-intro h1 { font-size: clamp(2rem, 4vw, 2.6rem); margin: .75rem 0 .5rem; letter-spacing: -0.02em; line-height: 1.1; }");
R(".onb-card { padding: 1.6rem; box-shadow: var(--shadow); }", ".onb-card { padding: 1.6rem; border-radius: 12px; box-shadow: var(--shadow-hover); }");
fs.writeFileSync(f, s);
fs.writeFileSync("scripts/_css2.log", log.join("\n"));
