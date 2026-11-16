// Narration for the "God left me on seen" reel. The voice is generated chunk by chunk with ElevenLabs
// (public/seen/<chunk>.mp3). This script converts, tightens long pauses, finds where each sentence starts
// from the pauses in the audio, and writes public/seen/vo.wav + src/data/seen.json (sentence + word timings,
// per-frame loudness for the mouth).   node scripts/vo-seen.js   (env TEMPO=1.06 to speed the voice up)
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const DIR = path.join(ROOT, "public", process.env.VO_DIR || "seen");
const CHUNKS = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "data", process.env.LINES || "seen-lines.json"), "utf8"));
const TEMPO = +(process.env.TEMPO || 1.08);
const RATE = 24000, FPS = 30, LEAD = 0.2;
const CAP = +(process.env.CAP || 0.26); // longest pause kept inside a chunk (s)

const readWav = (file) => {
  const b = fs.readFileSync(file);
  let o = 12, data = null;
  while (o < b.length - 8) {
    const id = b.toString("ascii", o, o + 4);
    const size = b.readUInt32LE(o + 4);
    if (id === "data") { data = b.subarray(o + 8, Math.min(b.length, o + 8 + size)); break; }
    o += 8 + size + (size % 2);
  }
  const n = Math.floor(data.length / 2);
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) s[i] = data.readInt16LE(i * 2) / 32768;
  return s;
};
const writeWav = (file, s, rate) => {
  const b = Buffer.alloc(44 + s.length * 2);
  b.write("RIFF", 0); b.writeUInt32LE(36 + s.length * 2, 4); b.write("WAVE", 8);
  b.write("fmt ", 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write("data", 36); b.writeUInt32LE(s.length * 2, 40);
  for (let i = 0; i < s.length; i++) b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(s[i] * 32767))), 44 + i * 2);
  fs.writeFileSync(file, b);
};

const syl = (w) => {
  const c = w.toLowerCase().replace(/[^a-z0-9]/g, "");
  return Math.max(1, (c.match(/[aeiouy]+/g) || []).length);
};
const weight = (text) => text.split(/\s+/).filter(Boolean).reduce((a, w) => a + 0.6 + syl(w), 0);
const spreadWords = (cap, start, dur) => {
  const toks = cap.split(/\s+/).filter(Boolean);
  const ws = toks.map((w) => 0.6 + syl(w) + (/[,:]$/.test(w) ? 0.8 : 0));
  const total = ws.reduce((a, b) => a + b, 0);
  let t = start;
  return toks.map((text, i) => {
    const span = (ws[i] / total) * dur;
    const w = { text, start: +t.toFixed(3), end: +(t + span * 0.92).toFixed(3) };
    t += span;
    return w;
  });
};

/** Speech of one chunk with pauses capped; returns samples + the pauses (time in the new audio, original length). */
const tighten = (s) => {
  const win = Math.round(RATE * 0.01);
  const n = Math.floor(s.length / win);
  const rms = new Float32Array(n);
  let peak = 0;
  for (let i = 0; i < n; i++) {
    let e = 0;
    for (let j = i * win; j < (i + 1) * win; j++) e += s[j] * s[j];
    rms[i] = Math.sqrt(e / win);
    peak = Math.max(peak, rms[i]);
  }
  const loud = Array.from(rms, (r) => r > peak * 0.045);
  const first = Math.max(0, loud.indexOf(true) - 2), last = Math.min(n, loud.lastIndexOf(true) + 5);
  const parts = [], gaps = [];
  let i = first, outLen = 0, segStart = first;
  while (i < last) {
    if (!loud[i]) {
      let j = i;
      while (j < last && !loud[j]) j++;
      const len = (j - i) * 0.01;
      if (len >= 0.1) {
        const keep = Math.min(len, CAP);
        const keepWin = Math.round(keep / 0.01);
        const a = i + Math.floor(keepWin / 2), b = j - Math.ceil(keepWin / 2);
        // keep [segStart, a) then jump to b
        parts.push(s.subarray(segStart * win, a * win));
        outLen += (a - segStart) * win;
        gaps.push({ at: outLen / RATE - keep / 2, mid: outLen / RATE, orig: len, keep });
        segStart = b;
      }
      i = j;
    } else i++;
  }
  parts.push(s.subarray(segStart * win, last * win));
  outLen += (last - segStart) * win;
  const out = new Float32Array(outLen);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  // short fades at the joins are unnecessary: cuts fall in silence
  return { out, gaps };
};

const toWav = (id) => {
  const mp3 = path.join(DIR, id + ".mp3"), wav = path.join(DIR, id + ".wav");
  const filters = TEMPO !== 1 ? ["-filter:a", `atempo=${TEMPO}`] : [];
  execFileSync("npx", ["remotion", "ffmpeg", "-y", "-loglevel", "error", "-i", `"${mp3}"`, ...filters, "-ar", String(RATE), "-ac", "1", "-c:a", "pcm_s16le", `"${wav}"`], { cwd: ROOT, stdio: "inherit", shell: true });
  return wav;
};

let t = LEAD;
const pcm = [new Float32Array(Math.round(LEAD * RATE))];
const lines = [];
for (const ch of CHUNKS) {
  let { out, gaps } = tighten(readWav(toWav(ch.id)));
  let dur = out.length / RATE;
  // Choose which pauses are the sentence boundaries: near where the syllable count expects them, favouring long pauses.
  const ws = ch.sents.map(([, text]) => weight(text) + 1.2);
  const bounds = [];
  let from = 0, gi = 0;
  for (let k = 0; k < ch.sents.length - 1; k++) {
    const rest = ws.slice(k).reduce((a, b) => a + b, 0);
    const expect = from + ((dur - from) * ws[k]) / rest;
    let best = -1, bestScore = 1e9;
    const need = ch.sents.length - 1 - k; // boundaries still to place, including this one
    for (let g = gi; g <= gaps.length - need; g++) {
      const score = Math.abs(gaps[g].mid - expect) - 1.1 * Math.min(gaps[g].orig, 0.9);
      if (score < bestScore) { bestScore = score; best = g; }
    }
    if (best < 0) { bounds.push(expect); from = expect; continue; }
    bounds.push(gaps[best].mid);
    from = gaps[best].mid;
    gi = best + 1;
  }
  if (ch.pick) { bounds.length = 0; ch.pick.forEach((g) => bounds.push(gaps[g].mid)); }
  let edges = [0, ...bounds, dur];
  if (ch.drop) {
    // Remove whole sentences: keep the audio between the pauses around every other sentence.
    const segs = [], keptSents = [], newEdges = [0];
    let len = 0;
    ch.sents.forEach((sent, k) => {
      if (ch.drop.includes(k)) return;
      const seg = out.subarray(Math.round(edges[k] * RATE), Math.round(edges[k + 1] * RATE));
      segs.push(seg);
      len += seg.length;
      newEdges.push(len / RATE);
      keptSents.push(sent);
    });
    out = new Float32Array(len);
    let oo = 0;
    for (const g of segs) { out.set(g, oo); oo += g.length; }
    dur = len / RATE;
    edges = newEdges;
    ch.sents = keptSents;
  }
  if (ch.keep) {
    // Drop the sentences after the first `keep`: cut the audio in the pause before the next one.
    dur = edges[ch.keep] - 0.02;
    out = out.subarray(0, Math.round(dur * RATE));
    edges = [...edges.slice(0, ch.keep), dur];
    ch.sents = ch.sents.slice(0, ch.keep);
  }
  ch.sents.forEach(([id, text], k) => {
    const a = edges[k] + (k ? 0.06 : 0), b = edges[k + 1] - (k < ch.sents.length - 1 ? 0.08 : 0);
    lines.push({ id, chunk: ch.id, start: +(t + a).toFixed(3), end: +(t + b).toFixed(3), words: spreadWords(text, t + a, Math.max(0.1, b - a)) });
  });
  if (process.env.GAPS) console.log("   gaps", gaps.map((g, i) => `${i}:${g.mid.toFixed(2)}(${g.orig.toFixed(2)})`).join(" "));
  console.log(ch.id.padEnd(8), dur.toFixed(2) + "s", edges.map((e) => e.toFixed(2)).join(" | "), `(${gaps.length} pauses)`);
  pcm.push(out);
  t += dur + ch.gap;
  pcm.push(new Float32Array(Math.round(ch.gap * RATE)));
}
const all = new Float32Array(pcm.reduce((a, p) => a + p.length, 0));
let o = 0;
for (const p of pcm) { all.set(p, o); o += p.length; }
let peak = 0;
for (const v of all) peak = Math.max(peak, Math.abs(v));
for (let i = 0; i < all.length; i++) all[i] *= 0.89 / peak;
writeWav(path.join(DIR, process.env.WAV || "vo.wav"), all, RATE);
const per = RATE / FPS, env = [];
for (let i = 0; i * per < all.length; i++) {
  let e = 0;
  const a = Math.floor(i * per), b = Math.min(all.length, Math.floor((i + 1) * per));
  for (let j = a; j < b; j++) e += all[j] * all[j];
  env.push(Math.sqrt(e / Math.max(1, b - a)));
}
const top = [...env].sort((a, b) => a - b)[Math.floor(env.length * 0.97)] || 1;
fs.writeFileSync(path.join(ROOT, "src", "data", process.env.OUT || "seen.json"), JSON.stringify({ total: +t.toFixed(3), lines, env: env.map((v) => +Math.min(1, v / top).toFixed(2)) }));
console.log("total", t.toFixed(2) + "s");
