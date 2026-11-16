// Final mix for the cinematic 3D H.E.A.R. reel, rebuilt from the approved stems:
//   voice  = public/hear7/vo2.wav (the ElevenLabs narration of Logia-HEAR-Final-HQ)
//   score  = public/hear/score-v2.wav
// Changes vs the approved mix: a 2.6 s cold-open hook (phone buzz, typing, send, "Delivered", silence) before the voice;
// music ducks under every word; no loud end swell; a 0.6 s held silence before "He's been whispering this whole time."
// Writes public/hear8/mix.wav and src/data/hear-cine.json (line/word timings + mouth envelope on the new timeline).
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const SR = 44100, FPS = 30, TAU = Math.PI * 2;
const HOOK = 2.6, GAP = 0.6;

const readWav = (file) => {
  const b = fs.readFileSync(file);
  let o = 12, rate = 0, ch = 1, data = null;
  while (o < b.length - 8) {
    const id = b.toString("ascii", o, o + 4), size = b.readUInt32LE(o + 4);
    if (id === "fmt ") { ch = b.readUInt16LE(o + 10); rate = b.readUInt32LE(o + 12); }
    if (id === "data") { data = b.subarray(o + 8, o + 8 + size); break; }
    o += 8 + size + (size % 2);
  }
  const n = Math.floor(data.length / 2 / ch);
  const L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    L[i] = data.readInt16LE(i * ch * 2) / 32768;
    R[i] = data.readInt16LE((i * ch + (ch > 1 ? 1 : 0)) * 2) / 32768;
  }
  return { rate, L, R, dur: n / rate };
};
const sample = (w, t, ch = "L") => {
  const x = t * w.rate, i = Math.floor(x), f = x - i, a = w[ch];
  if (i < 0 || i + 1 >= a.length) return 0;
  return a[i] * (1 - f) + a[i + 1] * f;
};

const vo = readWav(path.join(ROOT, "public", "hear7", "vo2.wav"));
const score = readWav(path.join(ROOT, "public", "hear", "score-v2.wav"));
const v2 = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "data", "hear-3d.json"), "utf8"));
const OFF = v2.offset || 0; // voice offset inside the original mix
const whisperWord = v2.lines.find((l) => l.id === "end2").start; // original-mix time
const GAP_AT = whisperWord - 0.12; // where the silence is inserted (original-mix time)
const map = (t0) => t0 + HOOK + (t0 >= GAP_AT ? GAP : 0); // original-mix time -> new time
const unmap = (t) => { const u = t - HOOK; if (u < GAP_AT) return u; if (u < GAP_AT + GAP) return null; return u - GAP; };

const TOTAL = map(v2.total) + 0.4;
const N = Math.ceil(TOTAL * SR);
const L = new Float32Array(N), R = new Float32Array(N);

// voice
const voiceAt = new Float32Array(N);
for (let i = 0; i < N; i++) {
  const u = unmap(i / SR);
  if (u === null) continue;
  voiceAt[i] = sample(vo, u - OFF) * 1.05;
}
// music with sidechain ducking from the voice
const words = v2.lines.flatMap((l) => l.words).map((w) => [map(w.start), map(w.end)]);
const speaking = (t) => words.some(([a, b]) => t >= a - 0.06 && t <= b + 0.12);
const tWhisper = map(whisperWord), tEndVO = map(v2.lines[v2.lines.length - 1].words.slice(-1)[0].end);
let g = 0;
for (let k = 0; k < N; k += 441) {
  const t = k / SR;
  let target = speaking(t) ? 0.17 : 0.3;
  if (t < HOOK) target = 0.0;                                  // cold open: no score, only the room
  if (t >= tWhisper - GAP - 0.1 && t < tWhisper) target = 0.03; // held breath before the whisper
  if (t >= tWhisper && t < tEndVO) target = Math.min(target, 0.2); // no swell over the payoff
  if (t >= tEndVO + 0.3) target = 0.26 * Math.max(0, 1 - (t - tEndVO - 0.3) / (TOTAL - tEndVO - 0.3));
  for (let j = 0; j < 441 && k + j < N; j++) {
    g += (target - g) * (target < g ? 0.0009 : 0.00012);
    const u = unmap((k + j) / SR);
    if (u === null) continue;
    L[k + j] += sample(score, u, "L") * g;
    R[k + j] += sample(score, u, "R") * g;
  }
}
for (let i = 0; i < N; i++) { L[i] += voiceAt[i]; R[i] += voiceAt[i]; }

// cold-open sound design
let seed = 3; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const put = (i, v, pan = 0) => { if (i >= 0 && i < N) { L[i] += v * (1 - pan) ; R[i] += v * (1 + pan); } };
{ // room tone + soft rain from the start, fading under the voice
  let lp = 0;
  for (let i = 0; i < Math.min(N, (HOOK + 6) * SR); i++) {
    const t = i / SR;
    lp += 0.2 * (rnd() - lp);
    const env = Math.min(1, t / 0.4) * (t < HOOK + 2 ? 1 : Math.max(0, 1 - (t - HOOK - 2) / 4));
    put(i, (lp * 0.5 + (rnd() - lp) * 0.2) * 0.05 * env);
  }
}
const buzz = (t0) => { for (let p = 0; p < 2; p++) { const s0 = Math.floor((t0 + p * 0.28) * SR); for (let k = 0; k < 0.2 * SR; k++) { const t = k / SR; put(s0 + k, (Math.sign(Math.sin(TAU * 150 * t)) * 0.4 + Math.sin(TAU * 75 * t) * 0.6) * 0.16 * Math.min(1, t / 0.01, (0.2 - t) / 0.02)); } } };
const tap = (t0, pan) => { const s0 = Math.floor(t0 * SR); let lp = 0; for (let k = 0; k < 0.04 * SR; k++) { const t = k / SR; lp += 0.5 * (rnd() - lp); put(s0 + k, ((rnd() - lp) * 0.6 + Math.sin(TAU * 2400 * t) * 0.15) * Math.exp(-t / 0.008) * 0.35, pan); } };
const sent = (t0) => { const s0 = Math.floor(t0 * SR); for (let k = 0; k < 0.35 * SR; k++) { const t = k / SR; const f = 600 + 1400 * (t / 0.35); put(s0 + k, Math.sin(TAU * f * t) * Math.exp(-t / 0.12) * 0.12, 0.2); } };
const tick = (t0) => { const s0 = Math.floor(t0 * SR); for (let k = 0; k < 0.12 * SR; k++) { const t = k / SR; put(s0 + k, Math.sin(TAU * 1800 * t) * Math.exp(-t / 0.02) * 0.08); } };
buzz(0.15);
[0.7, 0.82, 0.93, 1.06, 1.15, 1.27, 1.36, 1.48, 1.57, 1.66].forEach((t, i) => tap(t, (i % 3 - 1) * 0.15));
sent(1.85);
tick(2.2);
// low heartbeat in the held silence of the hook
for (const t0 of [2.25, 2.47]) { const s0 = Math.floor(t0 * SR); for (let k = 0; k < 0.3 * SR; k++) { const t = k / SR; put(s0 + k, Math.sin(TAU * (48 + 25 * Math.exp(-t * 30)) * t) * Math.exp(-t / 0.1) * 0.22); } }

// master: gentle limiter, normalise to -1 dBFS
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const k = 0.89 / peak;
const pcm = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  const fade = Math.min(1, (N - i) / (SR * 0.3));
  pcm.writeInt16LE(Math.round(Math.tanh(L[i] * k * 1.05) * 32000 * fade), i * 4);
  pcm.writeInt16LE(Math.round(Math.tanh(R[i] * k * 1.05) * 32000 * fade), i * 4 + 2);
}
const h = Buffer.alloc(44);
h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVEfmt ", 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22);
h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
fs.mkdirSync(path.join(ROOT, "public", "hear8"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "public", "hear8", "mix.wav"), Buffer.concat([h, pcm]));

// timings on the new timeline
const lines = v2.lines.map((l) => ({ ...l, start: +map(l.start).toFixed(3), end: +map(l.end).toFixed(3), words: l.words.map((w) => ({ ...w, start: +map(w.start).toFixed(3), end: +map(w.end).toFixed(3) })) }));
const env = [];
for (let f = 0; f < Math.ceil(TOTAL * FPS); f++) {
  const u = unmap(f / FPS);
  env.push(u === null ? 0 : v2.env[Math.round(u * FPS)] ?? 0);
}
fs.writeFileSync(path.join(ROOT, "src", "data", "hear-cine.json"), JSON.stringify({ hook: HOOK, gap: GAP, total: +TOTAL.toFixed(3), lines, env }));
console.log("mix", TOTAL.toFixed(2) + "s", "peak", peak.toFixed(2), lines.map((l) => `${l.id}@${l.start}`).join(" "));
