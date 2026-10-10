// One-off mechanical restyle of src/ui/styles.css (deleted after use).
import { readFileSync, writeFileSync } from "node:fs";
const file = new URL("../src/ui/styles.css", import.meta.url);
let css = readFileSync(file, "utf8");
const count = (re) => (css.match(re) || []).length;
const log = [];
const sub = (label, re, rep) => { const n = count(re); css = css.replace(re, rep); log.push(`${label}: ${n}`); };

// 1. Serif is reserved for the landing headline; everything else uses the interface font.
const deco = "barGrow|bdIn|bdRow|btFade|liIn|ringIn|lpGrow|lpRing|lpFloat|lpShine|lpSweep|lpPulse|lpMarquee|drift|dollarFloat|dollarShadow|draw|pulse";
// Second pass: unused keyframes (single-line and multi-line), CRLF-safe.
sub("single-line keyframes", new RegExp(`@keyframes (?:${deco}) \\{[^\\r\\n]*\\}\\r?\\n`, "g"), "");
sub("multi-line keyframes", new RegExp(`@keyframes (?:${deco}) \\{\\r?\\n(?:[^\\r\\n]*\\r?\\n)*?\\}\\r?\\n`, "g"), "");
sub("empty rules", /^[^\r\n{}]+\{\s*\}\r?\n/gm, "");
writeFileSync(file, css, "utf8");
console.log(log.join("\n"));
