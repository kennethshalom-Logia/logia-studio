// Builds src/data/hear-3d.json for the 3D edit from the earlier H.E.A.R. narration (hear-v2.json word timings,
// public/hear/vo2.mp3 voice) whose final mixed audio is public/hear7/final.wav. Also checks the voice's offset in the mix.
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const FPS = 30;

const readWav = (file) => {
  const b = fs.readFileSync(file);
  let o = 12, rate = 0, ch = 1, data = null;
  while (o < b.length - 8) {
    const id = b.toString("ascii", o, o + 4), size = b.readUInt32LE(o + 4);
    if (id === "fmt ") { ch = b.readUInt16LE(o + 10); rate = b.readUInt32LE(o + 12); }
    if (id === "data") { data = b.subarray(o + 8, o + 8 + size); break; }
    o += 8 + size + (size % 2);
  }
  const n = Math.floor(data.length / 2 / ch), s = new Float32Array(n);
  for (let i = 0; i < n; i++) { let v = 0; for (let c = 0; c < ch; c++) v += data.readInt16LE((i * ch + c) * 2); s[i] = v / ch / 32768; }
  return { rate, s };
};
const env = ({ rate, s }, step) => {
  const per = rate * step, out = [];
  for (let i = 0; (i + 1) * per <= s.length; i++) {
    let e = 0;
    for (let j = Math.floor(i * per); j < Math.floor((i + 1) * per); j++) e += s[j] * s[j];
    out.push(Math.sqrt(e / per));
  }
  return out;
};

const vo = readWav(path.join(ROOT, "public", "hear7", "vo2.wav"));
const mix = readWav(path.join(ROOT, "public", "hear7", "final.wav"));
// Offset of the voice inside the mix (10 ms resolution, ±1 s).
const a = env(vo, 0.01), b = env(mix, 0.01);
let best = 0, bestK = 0;
for (let k = -100; k <= 100; k++) {
  let c = 0;
  for (let i = 0; i < 2000; i++) { const j = i + k; if (j >= 0 && j < b.length) c += a[i] * b[j]; }
  if (c > best) { best = c; bestK = k; }
}
const OFF = bestK / 100;
console.log("voice offset in final mix:", OFF.toFixed(2), "s");

const raw = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "data", "hear-v2.json"), "utf8")).words.filter((w) => !w.type || w.type === "word");
const words = raw.map((w) => ({ text: w.text, start: +(w.start + OFF).toFixed(3), end: +(w.end + OFF).toFixed(3) }));
// Lines: [id, first word index]. Ids match the scenes in src/flat/Hear3D.tsx.
const firstIdx = (text, from = 0) => { const i = words.findIndex((w, k) => k >= from && w.text.replace(/[^\w']/g, "").toLowerCase() === text); if (i < 0) throw new Error(text); return i; };
const cuts = [];
let at = 0;
const mark = (id, text) => { at = firstIdx(text, at); cuts.push([id, at]); };
mark("hook", "i"); mark("years", "because"); mark("turn", "but"); mark("how", "here's"); mark("h1", "h"); mark("h2", "the");
mark("e2", "and"); mark("e1", "e"); mark("e3", "all"); mark("a1", "a"); mark("a2", "god"); mark("a3", "the");
mark("r1", "r"); mark("r2", "look"); mark("end2", "he's"); mark("cta", "comment");
const lines = cuts.map(([id, i], n) => {
  const j = n + 1 < cuts.length ? cuts[n + 1][1] : words.length;
  const ws = words.slice(i, j);
  return { id, start: ws[0].start, end: ws[ws.length - 1].end, words: ws };
});
// end1 ("He was never silent" title) shares the whisper line's start.
lines.splice(lines.findIndex((l) => l.id === "end2"), 0, { ...lines.find((l) => l.id === "end2"), id: "end1" });
const vEnv = env(vo, 1 / FPS);
const top = [...vEnv].sort((x, y) => x - y)[Math.floor(vEnv.length * 0.97)] || 1;
const shift = Math.round(OFF * FPS);
const envOut = Array.from({ length: Math.ceil(mix.s.length / mix.rate * FPS) }, (_, i) => +Math.min(1, (vEnv[i - shift] ?? 0) / top).toFixed(2));
const total = +(mix.s.length / mix.rate).toFixed(3);
fs.writeFileSync(path.join(ROOT, "src", "data", "hear-3d.json"), JSON.stringify({ source: "Logia-HEAR-Final-HQ.mp4", offset: OFF, total, lines, env: envOut }));
console.log("lines", lines.map((l) => `${l.id}@${l.start}`).join(" "), "total", total);
