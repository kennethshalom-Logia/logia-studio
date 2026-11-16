// Narration for the flat H.E.A.R. reel, line by line, in Ken's cloned voice from the local VoiceStudio.
//   node scripts/vo-flat.js          generate missing lines (if VoiceStudio is up), then assemble
//   node scripts/vo-flat.js --redo hook,end2   regenerate those lines
// Writes public/hear5/<id>.wav per line, public/hear5/vo.wav (all lines with their gaps)
// and src/data/hear-flat.json: line timings, caption words and a per-frame loudness envelope for the mouth.
// Lines without audio yet get estimated timings, so the edit can be built before the voice exists.
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
// Env: VO_DIR (public/<dir>), VO_LINES (src/data/<file>), VO_OUT (src/data/<file>), VO_SOURCE=eleven (use downloaded <id>.mp3, never call VoiceStudio)
const VO_DIR = process.env.VO_DIR || "hear5";
const DIR = path.join(ROOT, "public", VO_DIR);
const LINES = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "data", process.env.VO_LINES || "hear-flat-lines.json"), "utf8"));
const OUT_JSON = process.env.VO_OUT || "hear-flat.json";
const ELEVEN = process.env.VO_SOURCE === "eleven";
const clean = (s) => s.replace(/\[[^\]]*\]\s*/g, "").replace(/\s+/g, " ").trim();
const { execFileSync } = require("child_process");
const mp3ToWav = (id) => {
  const mp3 = path.join(DIR, id + ".mp3"), wav = path.join(DIR, id + ".wav");
  if (fs.existsSync(mp3) && (!fs.existsSync(wav) || fs.statSync(wav).mtimeMs < fs.statSync(mp3).mtimeMs)) {
    execFileSync("npx", ["remotion", "ffmpeg", "-y", "-loglevel", "error", "-i", mp3, "-ar", "24000", "-ac", "1", "-c:a", "pcm_s16le", wav], { cwd: ROOT, stdio: "inherit", shell: true });
  }
};
const VOICE = "3ee4d4c4"; // VoiceStudio profile "Ken" (clone)
const API = "http://127.0.0.1:3900";
const FPS = 30;
const LEAD = 0.25; // silence before the first word

fs.mkdirSync(DIR, { recursive: true });
const redo = (process.argv.find((a) => a.startsWith("--redo")) ? process.argv[process.argv.indexOf("--redo") + 1] || "" : "").split(",").filter(Boolean);

const readWav = (file) => {
  const b = fs.readFileSync(file);
  let o = 12, rate = 24000, ch = 1, bits = 16, data = null;
  while (o < b.length - 8) {
    const id = b.toString("ascii", o, o + 4);
    const size = b.readUInt32LE(o + 4);
    if (id === "fmt ") { ch = b.readUInt16LE(o + 10); rate = b.readUInt32LE(o + 12); bits = b.readUInt16LE(o + 22); }
    if (id === "data") { data = b.subarray(o + 8, o + 8 + size); break; }
    o += 8 + size + (size % 2);
  }
  if (bits !== 16) throw new Error(`${file}: expected 16-bit PCM`);
  const n = Math.floor(data.length / 2 / ch);
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let v = 0;
    for (let c = 0; c < ch; c++) v += data.readInt16LE((i * ch + c) * 2);
    s[i] = v / ch / 32768;
  }
  return { rate, s };
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

/** Trims leading/trailing silence; returns the speech part. */
const trim = ({ rate, s }) => {
  const win = Math.round(rate * 0.02);
  const rms = [];
  for (let i = 0; i + win <= s.length; i += win) {
    let e = 0;
    for (let j = i; j < i + win; j++) e += s[j] * s[j];
    rms.push(Math.sqrt(e / win));
  }
  const peak = Math.max(...rms);
  const on = rms.map((r) => r > peak * 0.06);
  const a = Math.max(0, on.indexOf(true) - 2);
  const b = Math.min(rms.length, on.lastIndexOf(true) + 4);
  return s.subarray(a * win, b * win);
};

const syl = (w) => {
  const clean = w.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (/^\d/.test(clean)) return clean.length + 1;
  return Math.max(1, (clean.match(/[aeiouy]+/g) || []).length);
};

/** Spreads the caption words over the spoken span: by syllables, with pauses after punctuation. */
const spreadWords = (cap, start, dur) => {
  const toks = cap.split(/\s+/).filter(Boolean);
  const weights = toks.map((w) => 0.6 + syl(w) + (/[.?!]$/.test(w) ? 1.6 : /(,|\.\.\.)$/.test(w) ? 1.0 : 0));
  const total = weights.reduce((a, b) => a + b, 0);
  let t = start;
  return toks.map((text, i) => {
    const span = (weights[i] / total) * dur;
    const pause = /[.?!]$/.test(text) ? 1.6 : /(,|\.\.\.)$/.test(text) ? 1.0 : 0;
    const speak = span * ((weights[i] - pause) / weights[i]);
    const w = { text: text.replace(/\.\.\.$/, "…"), start: +t.toFixed(3), end: +(t + speak).toFixed(3) };
    t += span;
    return w;
  });
};

const estimate = (say) => say.split(/\s+/).reduce((a, w) => a + 0.1 + syl(w) * 0.16 + (/[.?!]$/.test(w) ? 0.35 : /(,|\.\.\.)$/.test(w) ? 0.25 : 0.03), 0);

async function up() {
  try {
    const r = await fetch(`${API}/health`, { signal: AbortSignal.timeout(4000) });
    return r.ok;
  } catch { return false; }
}

async function generate(line) {
  const body = { model: "omnivoice", input: line.say, voice: VOICE, response_format: "wav", speed: line.speed ?? 1 };
  if (line.instructions) body.instructions = line.instructions;
  const r = await fetch(`${API}/v1/audio/speech`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(600000) });
  if (!r.ok) throw new Error(`${line.id}: HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
  fs.writeFileSync(path.join(DIR, `${line.id}.wav`), Buffer.from(await r.arrayBuffer()));
}

(async () => {
  if (ELEVEN) LINES.forEach((l) => mp3ToWav(l.id));
  const online = ELEVEN ? false : await up();
  console.log("VoiceStudio", online ? "up" : "DOWN (estimating missing lines)");
  for (const line of LINES) {
    const f = path.join(DIR, `${line.id}.wav`);
    if (online && (!fs.existsSync(f) || redo.includes(line.id))) {
      const t0 = Date.now();
      await generate(line);
      console.log("voiced", line.id, ((Date.now() - t0) / 1000).toFixed(1) + "s");
    }
  }
  const RATE = 24000;
  let t = LEAD;
  const out = [];
  const pcm = [new Float32Array(Math.round(LEAD * RATE))];
  let real = 0;
  for (const line of LINES) {
    const f = path.join(DIR, `${line.id}.wav`);
    let dur;
    if (fs.existsSync(f)) {
      const w = readWav(f);
      if (w.rate !== RATE) throw new Error(`${line.id}: rate ${w.rate}`);
      const sp = trim(w);
      pcm.push(sp);
      dur = sp.length / RATE;
      real++;
    } else {
      dur = estimate(clean(line.say)) * 0.85;
      pcm.push(new Float32Array(Math.round(dur * RATE)));
    }
    out.push({ id: line.id, start: +t.toFixed(3), end: +(t + dur).toFixed(3), words: spreadWords(clean(line.cap || line.say), t, dur) });
    t += dur + line.gap;
    pcm.push(new Float32Array(Math.round(line.gap * RATE)));
  }
  const all = new Float32Array(pcm.reduce((a, p) => a + p.length, 0));
  let o = 0;
  for (const p of pcm) { all.set(p, o); o += p.length; }
  // Gentle normalisation to about -1 dBFS peak.
  let peak = 0;
  for (const v of all) peak = Math.max(peak, Math.abs(v));
  if (peak > 0) for (let i = 0; i < all.length; i++) all[i] *= 0.89 / peak;
  writeWav(path.join(DIR, "vo.wav"), all, RATE);
  // Per-frame loudness (0..1) for the mouth.
  const per = RATE / FPS;
  const env = [];
  for (let i = 0; i * per < all.length; i++) {
    let e = 0;
    const a = Math.floor(i * per), b = Math.min(all.length, Math.floor((i + 1) * per));
    for (let j = a; j < b; j++) e += all[j] * all[j];
    env.push(Math.sqrt(e / Math.max(1, b - a)));
  }
  const top = [...env].sort((a, b) => a - b)[Math.floor(env.length * 0.97)] || 1;
  const envOut = env.map((v) => +Math.min(1, v / top).toFixed(2));
  fs.writeFileSync(path.join(ROOT, "src", "data", OUT_JSON), JSON.stringify({ voiced: real, of: LINES.length, total: +t.toFixed(3), lines: out, env: real ? envOut : [] }));
  console.log(`assembled ${real}/${LINES.length} voiced lines, total ${t.toFixed(1)}s`);
})().catch((e) => { console.error(e); process.exit(1); });
