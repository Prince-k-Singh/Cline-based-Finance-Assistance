import fs from "node:fs";
const css = fs.readFileSync("src/ui/styles.css", "utf8");
const lines = css.split(/\r?\n/);
const out = [];
const defined = new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]));
const used = new Set([...css.matchAll(/var\((--[\w-]+)/g)].map(m => m[1]));
out.push("UNDEFINED VARS: " + [...used].filter(v => !defined.has(v)).join(", "));
const pats = [/gradient\(/, /backdrop-filter/, /rgba\((232|240|245|212|120)/, /#f[0-9a-f]{2,5}\b/i, /#e8590c|#d4a017|#a87400/i, /filter:\s*(blur|drop-shadow)/, /text-shadow/, /animation:/, /@keyframes/, /\.aurora|ambient/];
lines.forEach((l, i) => { if (pats.some(p => p.test(l))) out.push(`${i + 1}: ${l.trim().slice(0, 220)}`); });
// TSX hard-coded colors
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(d + "/" + e.name) : [d + "/" + e.name]);
for (const f of walk("src/ui").filter(f => /\.tsx?$/.test(f))) {
  fs.readFileSync(f, "utf8").split(/\r?\n/).forEach((l, i) => {
    if (/#[0-9a-fA-F]{3,8}\b|rgba?\(|gradient|Ambient|DollarHero|aurora/.test(l)) out.push(`${f}:${i + 1}: ${l.trim().slice(0, 200)}`);
  });
}
fs.writeFileSync("scripts/_audit.txt", out.join("\n"));
