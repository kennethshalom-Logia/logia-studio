// One-shot sound effects for motion: node scripts/make-sfx.js → public/sfx/*.wav
// whoosh (zoom-through cut), swish (camera move), hit (impact/bass), pop (title/card pops), riser (build), tick (stamp)
const fs = require("fs");
const path = require("path");

const SR = 44100;
const TAU = Math.PI * 2;
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const out = path.join(__dirname, "..", "public", "sfx");
fs.mkdirSync(out, { recursive: true });

function write(name, L, R = L) {
  let peak = 0;
  for (let i = 0; i < L.length; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const k = peak > 0 ? 0.9 / peak : 1;
  const pcm = Buffer.alloc(L.length * 4);
  for (let i = 0; i < L.length; i++) {
    pcm.writeInt16LE(Math.round(Math.tanh(L[i] * k) * 32000), i * 4);
    pcm.writeInt16LE(Math.round(Math.tanh(R[i] * k) * 32000), i * 4 + 2);
  }
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVEfmt ", 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
  fs.writeFileSync(path.join(out, name + ".wav"), Buffer.concat([h, pcm]));
}

const buf = (s) => [new Float32Array(Math.ceil(s * SR)), new Float32Array(Math.ceil(s * SR))];

// Zoom-through: filtered noise sweeping up then down, panned across, with a low thump at the peak.
{
  const d = 0.7, [L, R] = buf(d);
  let lp = 0, ph = 0;
  for (let i = 0; i < L.length; i++) {
    const p = i / L.length;
    const env = Math.pow(Math.sin(Math.PI * Math.min(1, p / 0.75)), 2) * (p > 0.75 ? Math.max(0, 1 - (p - 0.75) / 0.25) : 1);
    lp += (0.02 + 0.35 * Math.sin(Math.PI * p)) * (rnd() - lp);
    ph += TAU * (55 + 40 * p) / SR;
    const th = p > 0.55 ? Math.sin(ph) * Math.exp(-(p - 0.55) * 18) * 0.8 : 0;
    const pan = (p - 0.5) * 1.4;
    L[i] = (lp * env) * (1 - pan) * 0.9 + th;
    R[i] = (lp * env) * (1 + pan) * 0.9 + th;
  }
  write("whoosh", L, R);
}
// Camera move: a softer, shorter air swish.
{
  const d = 0.45, [L, R] = buf(d);
  let lp = 0;
  for (let i = 0; i < L.length; i++) {
    const p = i / L.length;
    const env = Math.pow(Math.sin(Math.PI * p), 3);
    lp += (0.04 + 0.2 * p) * (rnd() - lp);
    L[i] = lp * env * (1.2 - p);
    R[i] = lp * env * (0.4 + p);
  }
  write("swish", L, R);
}
// Impact: sub drop + click.
{
  const d = 1.4, [L, R] = buf(d);
  let ph = 0, lp = 0;
  for (let i = 0; i < L.length; i++) {
    const t = i / SR;
    ph += TAU * (38 + 90 * Math.exp(-t * 16)) / SR;
    lp += 0.08 * (rnd() - lp);
    const v = Math.sin(ph) * Math.exp(-t / 0.5) + lp * Math.exp(-t / 0.025) * 2.5;
    L[i] = R[i] = v;
  }
  write("hit", L, R);
}
// Pop: a short bubbly blip for titles/cards.
{
  const d = 0.18, [L, R] = buf(d);
  for (let i = 0; i < L.length; i++) {
    const t = i / SR;
    const f = 520 + 900 * Math.exp(-t * 40);
    const v = Math.sin(TAU * f * t) * Math.exp(-t / 0.05);
    L[i] = R[i] = v;
  }
  write("pop", L, R);
}
// Stamp tick: woody knock for X stamps and pins.
{
  const d = 0.25, [L, R] = buf(d);
  let lp = 0;
  for (let i = 0; i < L.length; i++) {
    const t = i / SR;
    lp += 0.3 * (rnd() - lp);
    const v = (Math.sin(TAU * 180 * t) * 0.8 + lp) * Math.exp(-t / 0.035);
    L[i] = R[i] = v;
  }
  write("tick", L, R);
}
// Riser: rising noise + tone into a cut.
{
  const d = 1.2, [L, R] = buf(d);
  let lp = 0, ph = 0;
  for (let i = 0; i < L.length; i++) {
    const p = i / L.length;
    lp += (0.01 + 0.4 * p * p) * (rnd() - lp);
    ph += TAU * (200 + 900 * p * p) / SR;
    const v = (lp * 0.8 + Math.sin(ph) * 0.15) * p * p;
    L[i] = v * (1 - p * 0.3);
    R[i] = v * (0.7 + p * 0.3);
  }
  write("riser", L, R);
}
console.log("sfx written to", out);
