// Synthesizes an original cinematic score for the H.E.A.R. reel, timed to the narration.
// Low cello drone + sparse piano -> heartbeat tension -> whisper drop -> driving ostinato with
// taiko and brass on every letter -> breath -> D major climax on "HEAR God" -> piano tail.
const fs = require("fs");
const path = require("path");

// `node scripts/make-score.js short` writes the 40-second cut's score instead.
const SHORT = process.argv[2] === "short";
// `node scripts/make-score.js v2` writes the v2 score, timed from src/data/hear-v2.json.
const V2 = process.argv[2] === "v2";
const V2B = V2 ? v2Beats() : null;
const SR = 44100;
const DUR = V2 ? V2B.total : SHORT ? 40.6 : 93;

function v2Beats() {
  const words = require("../src/data/hear-v2.json").words.filter((w) => !w.type || w.type === "word");
  let inTag = false;
  const ws = words.filter((w) => { if (w.text.startsWith("[")) inTag = true; const s = inTag; if (w.text.endsWith("]")) inTag = false; return !s; });
  const norm = (s) => s.toLowerCase().replace(/[^a-z']/g, "");
  const seq = (phrase) => {
    const want = phrase.split(" ").map(norm);
    for (let i = 0; i + want.length <= ws.length; i++) if (want.every((w, k) => norm(ws[i + k].text) === w)) return ws[i].start;
    throw new Error("missing " + phrase);
  };
  const last = ws[ws.length - 1].end;
  const end = last + 2.4;
  return {
    because: seq("because"), but: seq("but what if"), wrong: seq("wrong"), heres: seq("here's how"), H: seq("h is for"),
    dead: seq("dead sea"), E: seq("e is for"), A: seq("a is for"), R: seq("r is for"), closed: seq("closed"), red: seq("red thread"),
    fingerprints: seq("his fingerprints"), whisper: seq("he's been whispering"), comment: seq("comment"), end, total: Math.ceil((end + 3.2) * 10) / 10,
  };
}
const N = SR * DUR;
const L = new Float32Array(N);
const R = new Float32Array(N);

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const TAU = Math.PI * 2;
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;

const add = (i, v, pan = 0) => {
  if (i < 0 || i >= N) return;
  L[i] += v * Math.cos((pan + 1) * Math.PI / 4);
  R[i] += v * Math.sin((pan + 1) * Math.PI / 4);
};

/** Sustained, bowed or blown chord. Additive saw-ish tone with a slow swell and ensemble detune. */
function pad(notes, start, dur, { gain = 0.1, atk = 1.5, rel = 2, harm = 7, bright = 1, voices = 3, vib = 0.004 } = {}) {
  const s0 = Math.floor(start * SR);
  const len = Math.floor((dur + rel) * SR);
  notes.forEach((m, ni) => {
    for (let v = 0; v < voices; v++) {
      const det = 1 + (v - (voices - 1) / 2) * 0.0035;
      const f = mtof(m) * det;
      const pan = ((ni / Math.max(1, notes.length - 1)) - 0.5) * 0.8 + (v - 1) * 0.25;
      const ph = Math.random() * TAU;
      for (let k = 0; k < len; k++) {
        const t = k / SR;
        const env = Math.min(1, t / atk) * (t > dur ? Math.max(0, 1 - (t - dur) / rel) : 1);
        if (env <= 0) continue;
        const vb = 1 + vib * Math.sin(TAU * 5.1 * t + v);
        let s = 0;
        for (let h = 1; h <= harm; h++) s += Math.sin(TAU * f * vb * h * t + ph * h) / Math.pow(h, 1.25 / bright);
        add(s0 + k, s * env * gain / voices, pan);
      }
    }
  });
}

/** Short bowed staccato note for the ostinato. */
function stac(m, start, { gain = 0.08, dec = 0.22, pan = 0 } = {}) {
  const s0 = Math.floor(start * SR);
  const len = Math.floor(0.45 * SR);
  const f = mtof(m);
  for (let k = 0; k < len; k++) {
    const t = k / SR;
    const env = Math.min(1, t / 0.012) * Math.exp(-t / dec);
    let s = 0;
    for (let h = 1; h <= 6; h++) s += Math.sin(TAU * f * h * t) / (h * h * 0.6 + 0.4);
    add(s0 + k, s * env * gain, pan);
  }
}

/** Felt piano: struck harmonics with exponential decay and a little inharmonicity. */
function piano(m, start, { gain = 0.16, dec = 2.8, pan = 0 } = {}) {
  const s0 = Math.floor(start * SR);
  const len = Math.floor(dec * 3 * SR);
  const f = mtof(m);
  for (let k = 0; k < len; k++) {
    const t = k / SR;
    const env = Math.min(1, t / 0.004) * Math.exp(-t / dec);
    let s = 0;
    for (let h = 1; h <= 5; h++) s += Math.sin(TAU * f * h * (1 + 0.0004 * h * h) * t) * Math.exp(-t * h * 0.9) / h;
    add(s0 + k, s * env * gain, pan);
  }
}

/** Taiko / low tom: pitch-dropping sine body plus a filtered noise skin. */
function taiko(start, { gain = 0.7, f0 = 120, f1 = 42, dec = 0.7 } = {}) {
  const s0 = Math.floor(start * SR);
  const len = Math.floor(dec * 4 * SR);
  let ph = 0;
  let lp = 0;
  for (let k = 0; k < len; k++) {
    const t = k / SR;
    const f = f1 + (f0 - f1) * Math.exp(-t * 18);
    ph += TAU * f / SR;
    const body = Math.sin(ph) * Math.exp(-t / dec);
    lp += 0.08 * (rnd() - lp);
    const skin = lp * Math.exp(-t / 0.05) * 2.2;
    add(s0 + k, (body + skin) * gain, 0);
  }
}

/** Heartbeat sub pulse. */
function pulse(start, gain = 0.35) {
  const s0 = Math.floor(start * SR);
  const len = Math.floor(0.5 * SR);
  for (let k = 0; k < len; k++) {
    const t = k / SR;
    add(s0 + k, Math.sin(TAU * (48 + 30 * Math.exp(-t * 30)) * t) * Math.exp(-t / 0.16) * gain, 0);
  }
}

/** Noise + rising tone swell into a hit. */
function riser(start, end, gain = 0.18) {
  const s0 = Math.floor(start * SR);
  const len = Math.floor((end - start) * SR);
  let lp = 0;
  let ph = 0;
  for (let k = 0; k < len; k++) {
    const p = k / len;
    const a = 0.01 + p * p * 0.35;
    lp += a * (rnd() - lp);
    ph += TAU * (200 + 1400 * p * p) / SR;
    add(s0 + k, (lp * 0.9 + Math.sin(ph) * 0.15) * p * p * gain, Math.sin(p * 9) * 0.5);
  }
}

/** Airy shimmer for the whisper moment. */
function shimmer(start, dur, gain = 0.05) {
  [81, 88, 93].forEach((m, i) => {
    const s0 = Math.floor(start * SR);
    const len = Math.floor(dur * SR);
    const f = mtof(m);
    for (let k = 0; k < len; k++) {
      const t = k / SR;
      const env = Math.sin(Math.PI * Math.min(1, t / dur));
      add(s0 + k, Math.sin(TAU * f * t) * env * gain * (0.6 + 0.4 * Math.sin(TAU * (0.7 + i * 0.3) * t)), (i - 1) * 0.7);
    }
  });
}

/* ---------- The cue ---------- */

const BEAT = 60 / 70;
const BAR = BEAT * 4;
const CH = {
  Dm: { pad: [50, 53, 57], bass: 38, arp: [62, 65, 69, 74] },
  Bb: { pad: [46, 50, 53], bass: 34, arp: [62, 65, 70, 74] },
  F: { pad: [53, 57, 60], bass: 41, arp: [60, 65, 69, 72] },
  C: { pad: [48, 52, 55], bass: 36, arp: [60, 64, 67, 72] },
  D: { pad: [50, 54, 57, 62], bass: 38, arp: [62, 66, 69, 74] },
  G: { pad: [50, 55, 59], bass: 43, arp: [62, 67, 71, 74] },
};
const PROG = ["Dm", "Bb", "F", "C"];

if (V2) v2Cue();
else if (SHORT) shortCue();
else longCue();

function v2Cue() {
  const b = V2B;
  // Hook: silence, then a lone cello and piano as the room lights up.
  pad([38, 45], 0.6, b.but - 0.6, { gain: 0.1, atk: 3.5, rel: 1.5, harm: 9, bright: 0.8 });
  [62, 65, 69, 64].forEach((m, i) => piano(m, b.because + i * 1.1, { gain: 0.12, pan: (i - 1.5) * 0.3 }));
  // "What if He's not silent?": heartbeat, then calm on "wrong thing".
  for (let t = b.but; t < b.wrong - 0.2; t += BEAT) { pulse(t, 0.26); pulse(t + 0.22, 0.14); }
  shimmer(b.wrong, b.heres - b.wrong + 1.2, 0.04);
  // HEAR reveal: soft swell into the first letter.
  pad([50, 57, 62], b.heres, b.H - b.heres, { gain: 0.07, atk: 1.2, rel: 0.6, harm: 6 });
  riser(b.H - 2.2, b.H, 0.16);
  // Main body: ostinato that grows, a warm hit on each letter.
  const mainEnd = b.whisper - 0.15;
  for (let k = 0; b.H + k * BAR < mainEnd; k++) {
    const t0 = b.H + k * BAR;
    const c = CH[PROG[k % 4]];
    const dur = Math.min(BAR, mainEnd - t0);
    const lift = Math.min(1, k / 6);
    pad(c.pad, t0, dur, { gain: 0.07 + 0.03 * lift, atk: 0.9, rel: 1.4, harm: 8 });
    pad([c.bass], t0, dur, { gain: 0.11, atk: 0.3, rel: 0.8, harm: 10, voices: 2 });
    for (let i = 0; i < 8 && t0 + i * BEAT / 2 < mainEnd; i++) stac(c.arp[[0, 1, 2, 3, 2, 1, 2, 3][i]], t0 + i * BEAT / 2, { gain: 0.04 + 0.03 * lift, pan: i % 2 ? 0.45 : -0.45 });
    if (k >= 2) pad(c.pad.map((m) => m + 12), t0, dur, { gain: 0.025 * lift, atk: 1.2, rel: 1, harm: 5, bright: 1.6 });
    taiko(t0 + BEAT * 2, { gain: 0.14 + 0.1 * lift, f0: 160, f1: 70, dec: 0.4 });
  }
  [b.H, b.E, b.A, b.R].forEach((t) => { taiko(t, { gain: 0.8 }); taiko(t + 0.18, { gain: 0.4 }); pad([38, 45, 50], t, 2.2, { gain: 0.09, atk: 0.06, rel: 2.2, harm: 9, bright: 1.3 }); });
  pad([62, 69], b.red, b.whisper - b.red, { gain: 0.035, atk: 1.5, rel: 1, harm: 3, voices: 2, vib: 0 });
  riser(b.whisper - 2.4, b.whisper, 0.2);
  // Climax on "He's been whispering this whole time".
  taiko(b.whisper, { gain: 1.0 }); taiko(b.whisper + 0.18, { gain: 0.55 }); taiko(b.whisper + 0.5, { gain: 0.75 });
  const cl = b.end - b.whisper;
  pad(CH.D.pad, b.whisper, cl, { gain: 0.14, atk: 0.08, rel: 2.5, harm: 10, bright: 1.5 });
  pad([26, 38], b.whisper, cl, { gain: 0.15, atk: 0.05, rel: 2.5, harm: 10, voices: 2 });
  pad([74, 78, 81], b.whisper, cl, { gain: 0.04, atk: 0.6, rel: 2.5, harm: 3, bright: 2 });
  for (let t = b.whisper, i = 0; t < b.end - 0.3; t += BEAT / 2, i++) stac(CH.D.arp[i % 4], t, { gain: 0.07 * Math.max(0.3, 1 - (t - b.whisper) / cl), pan: i % 2 ? 0.5 : -0.5 });
  // End card.
  taiko(b.end, { gain: 0.5 });
  pad(CH.D.pad, b.end, 2, { gain: 0.09, atk: 0.1, rel: 1.8, harm: 8 });
  piano(62, b.end + 0.3, { gain: 0.14, dec: 3 }); piano(69, b.end + 0.3, { gain: 0.1, dec: 3 }); piano(74, b.end + 0.3, { gain: 0.09, dec: 3 });
}

function shortCue() {
  // Segment starts on the 40s timeline (see SEGS in src/Hear.tsx).
  const A = [0, 4.72, 8.09, 10.29, 12.18, 14.04, 16.37, 18.49, 24.36, 28.62, 30.35, 34.25, 36.6];
  // Intro: drone + piano, heartbeat under "No voice. No lightning. Nothing."
  pad([38, 45], 0, 8.0, { gain: 0.11, atk: 2.5, rel: 1.2, harm: 9, bright: 0.8 });
  [62, 65, 69, 64].forEach((m, i) => piano(m, 0.4 + i * 0.86, { gain: 0.13, pan: (i - 1.5) * 0.3 }));
  for (let t = A[1]; t < 7.9; t += BEAT) { pulse(t, 0.3); pulse(t + 0.22, 0.16); }
  riser(5.6, 8.05, 0.12);
  // Whisper drop.
  shimmer(A[2], 2.6, 0.045);
  piano(69, A[2] + 1.0, { gain: 0.11, dec: 3 });
  // Build to HEAR.
  pad([50, 57], A[3], 2.0, { gain: 0.06, atk: 1.2, rel: 0.4, harm: 6 });
  for (let t = A[3], i = 0; t < A[4] - 0.05; t += BEAT / 4, i++) stac(CH.Dm.arp[i % 4] - 12, t, { gain: 0.04 + 0.05 * ((t - A[3]) / 1.9), pan: i % 2 ? 0.5 : -0.5 });
  riser(A[3], A[4], 0.2);
  // Main section with a hit on every letter.
  const MAIN_END = A[11] - 0.1;
  for (let b = 0; A[4] + b * BAR < MAIN_END; b++) {
    const t0 = A[4] + b * BAR;
    const c = CH[PROG[b % 4]];
    const dur = Math.min(BAR, MAIN_END - t0);
    const lift = Math.min(1, b / 4);
    pad(c.pad, t0, dur, { gain: 0.08 + 0.03 * lift, atk: 0.6, rel: 1.2, harm: 8 });
    pad([c.bass], t0, dur, { gain: 0.12, atk: 0.2, rel: 0.6, harm: 10, voices: 2 });
    for (let i = 0; i < 8 && t0 + i * BEAT / 2 < MAIN_END; i++) stac(c.arp[[0, 1, 2, 3, 2, 1, 2, 3][i]], t0 + i * BEAT / 2, { gain: 0.06 + 0.03 * lift, pan: i % 2 ? 0.45 : -0.45 });
    pulse(t0, 0.25);
    if (b >= 1) pad(c.pad.map((m) => m + 12), t0, dur, { gain: 0.03 * lift, atk: 1, rel: 1, harm: 5, bright: 1.6 });
    taiko(t0 + BEAT * 2, { gain: 0.2 + 0.12 * lift, f0: 160, f1: 70, dec: 0.4 });
  }
  [A[4], A[6], A[8], A[9]].forEach((t) => { taiko(t, { gain: 0.95 }); taiko(t + 0.18, { gain: 0.5 }); pad([38, 45, 50], t, 2, { gain: 0.11, atk: 0.05, rel: 2, harm: 9, bright: 1.4 }); });
  riser(A[10] + 2.2, A[11], 0.22);
  // Climax on "He's been whispering this whole time".
  taiko(A[11], { gain: 1.0 }); taiko(A[11] + 0.18, { gain: 0.6 }); taiko(A[11] + 0.52, { gain: 0.8 });
  pad(CH.D.pad, A[11], 3.0, { gain: 0.15, atk: 0.06, rel: 2.5, harm: 10, bright: 1.5 });
  pad([26, 38], A[11], 3.0, { gain: 0.16, atk: 0.04, rel: 2.5, harm: 10, voices: 2 });
  pad([74, 78, 81], A[11], 3.2, { gain: 0.04, atk: 0.5, rel: 2.5, harm: 3, bright: 2 });
  for (let t = A[11], i = 0; t < A[12]; t += BEAT / 2, i++) stac(CH.D.arp[i % 4], t, { gain: 0.08, pan: i % 2 ? 0.5 : -0.5 });
  // End card.
  taiko(37.95, { gain: 0.55 });
  pad(CH.D.pad, 37.95, 1.8, { gain: 0.1, atk: 0.1, rel: 1.6, harm: 8 });
  piano(62, 38.2, { gain: 0.14, dec: 3 }); piano(69, 38.2, { gain: 0.1, dec: 3 }); piano(74, 38.2, { gain: 0.09, dec: 3 });
}

function longCue() {
// 1. Intro: cello drone + sparse piano motif (0 - 14.6)
pad([38, 45], 0, 22.6, { gain: 0.11, atk: 3, rel: 1.2, harm: 9, bright: 0.8 });
const motif = [62, 65, 69, 64];
for (let r = 0; r < 4; r++) motif.forEach((m, i) => piano(m, 0.6 + r * 5.6 + i * 0.86, { gain: 0.13, pan: (i - 1.5) * 0.3 }));

// 2. Tension: heartbeat + low ostinato (14.6 - 22.9)
for (let t = 14.65; t < 22.8; t += BEAT) { pulse(t, 0.32); pulse(t + 0.22, 0.18); }
for (let t = 16.75, i = 0; t < 22.8; t += BEAT / 2, i++) stac([50, 53, 57, 53][i % 4], t, { gain: 0.05 + 0.04 * ((t - 16.75) / 6), pan: i % 2 ? 0.4 : -0.4 });
riser(19.2, 22.9, 0.14);
taiko(18.64, { gain: 0.35 }); taiko(19.44, { gain: 0.55 }); taiko(20.4, { gain: 0.45 });

// 3. Whisper drop (22.9 - 24.9)
shimmer(22.95, 3.6, 0.045);
piano(69, 23.96, { gain: 0.11, dec: 3.5 });

// 4. Build to HEAR (24.9 - 30.85)
pad([50, 57], 24.9, 6, { gain: 0.06, atk: 4, rel: 0.4, harm: 6 });
for (let t = 25, i = 0; t < 30.8; t += BEAT / 2, i++) stac(CH.Dm.arp[[0, 1, 2, 1][i % 4]] - 12, t, { gain: 0.035 + 0.05 * ((t - 25) / 6), pan: i % 2 ? 0.5 : -0.5 });
riser(27.8, 30.86, 0.2);

// 5. Main section (30.85 - 76.5): ostinato, pads, bass, brass, taiko on each letter.
const MAIN_START = 30.85;
const MAIN_END = 76.4;
const LETTERS = [30.88, 41.52, 59.68, 68.96];
for (let b = 0; MAIN_START + b * BAR < MAIN_END; b++) {
  const t0 = MAIN_START + b * BAR;
  const c = CH[PROG[b % 4]];
  const dur = Math.min(BAR, MAIN_END - t0);
  const lift = Math.min(1, b / 12);
  pad(c.pad, t0, dur, { gain: 0.07 + 0.03 * lift, atk: 0.8, rel: 1.2, harm: 8 });
  pad([c.bass], t0, dur, { gain: 0.12, atk: 0.2, rel: 0.6, harm: 10, voices: 2 });
  for (let i = 0; i < 8 && t0 + i * BEAT / 2 < MAIN_END; i++) {
    stac(c.arp[[0, 1, 2, 3, 2, 1, 2, 3][i]], t0 + i * BEAT / 2, { gain: 0.05 + 0.03 * lift, pan: i % 2 ? 0.45 : -0.45 });
  }
  pulse(t0, 0.25);
  if (b >= 3) pad(c.pad.map((m) => m + 12), t0, dur, { gain: 0.025 * lift, atk: 1.2, rel: 1, harm: 5, bright: 1.6 }); // brass-ish upper layer
  taiko(t0 + BEAT * 2, { gain: 0.18 + 0.12 * lift, f0: 160, f1: 70, dec: 0.4 });
}
LETTERS.forEach((t) => { taiko(t, { gain: 0.95 }); taiko(t + 0.18, { gain: 0.5 }); pad([38, 45, 50], t, 2.4, { gain: 0.11, atk: 0.05, rel: 2.2, harm: 9, bright: 1.4 }); });
pad([62, 69], 59.68, 16.6, { gain: 0.03, atk: 4, rel: 1.5, harm: 3, voices: 2, vib: 0 }); // organ-like sustain

// 6. Breath (76.5 - 80.9): piano + soft pad, riser into the climax.
pad([50, 57, 62], 76.5, 4.3, { gain: 0.06, atk: 1.2, rel: 0.8, harm: 5 });
[62, 65, 69, 64].forEach((m, i) => piano(m, 76.6 + i * 0.75, { gain: 0.13 }));
riser(78.6, 80.92, 0.24);

// 7. Climax on "HEAR God" (80.92 - 84): D major, everything in.
taiko(80.92, { gain: 1.0 }); taiko(81.1, { gain: 0.6 }); taiko(81.44, { gain: 0.8 });
pad(CH.D.pad, 80.92, 3.2, { gain: 0.15, atk: 0.06, rel: 3, harm: 10, bright: 1.5 });
pad([26, 38], 80.92, 3.2, { gain: 0.16, atk: 0.04, rel: 3, harm: 10, voices: 2 });
pad([74, 78, 81], 80.92, 3.4, { gain: 0.04, atk: 0.5, rel: 3, harm: 3, bright: 2 });
for (let t = 80.92, i = 0; t < 84; t += BEAT / 2, i++) stac(CH.D.arp[[0, 1, 2, 3][i % 4]], t, { gain: 0.08, pan: i % 2 ? 0.5 : -0.5 });

// 8. Warm resolve under the CTA (84 - 88.9) and end card (88.9 - 93).
pad([50, 54, 57], 84, 4.9, { gain: 0.07, atk: 1.2, rel: 2, harm: 6 });
pad([43, 50, 55, 59], 86.4, 2.5, { gain: 0.05, atk: 1, rel: 1.5, harm: 6 });
[62, 66, 69, 74].forEach((m, i) => piano(m, 84.6 + i * 0.86, { gain: 0.12 }));
taiko(88.9, { gain: 0.55 });
pad(CH.D.pad, 88.9, 2.4, { gain: 0.1, atk: 0.1, rel: 2.2, harm: 8 });
piano(62, 89.3, { gain: 0.14, dec: 3.5 }); piano(69, 89.3, { gain: 0.1, dec: 3.5 }); piano(74, 89.3, { gain: 0.09, dec: 3.5 });
}

/* ---------- Reverb (Freeverb-style) ---------- */

function reverb(input, offset) {
  const combs = [1557, 1617, 1491, 1422, 1277, 1356, 1188, 1116].map((n) => ({ buf: new Float32Array(n + offset), i: 0, lp: 0 }));
  const aps = [556, 441, 341, 225].map((n) => ({ buf: new Float32Array(n + offset), i: 0 }));
  const out = new Float32Array(N);
  const fb = 0.86;
  const damp = 0.25;
  for (let k = 0; k < N; k++) {
    const x = input[k] * 0.015;
    let s = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.lp = y * (1 - damp) + c.lp * damp;
      c.buf[c.i] = x + c.lp * fb;
      c.i = (c.i + 1) % c.buf.length;
      s += y;
    }
    for (const a of aps) {
      const y = a.buf[a.i];
      a.buf[a.i] = s + y * 0.5;
      a.i = (a.i + 1) % a.buf.length;
      s = y - s;
    }
    out[k] = s;
  }
  return out;
}

const mono = new Float32Array(N);
for (let k = 0; k < N; k++) mono[k] = (L[k] + R[k]) / 2;
const wl = reverb(mono, 0);
const wr = reverb(mono, 23);

let peak = 0;
for (let k = 0; k < N; k++) {
  L[k] = L[k] * 0.8 + wl[k] * 1.1;
  R[k] = R[k] * 0.8 + wr[k] * 1.1;
  peak = Math.max(peak, Math.abs(L[k]), Math.abs(R[k]));
}
const norm = 0.92 / peak;
const pcm = Buffer.alloc(N * 4);
const fadeOut = SR * 2.5;
for (let k = 0; k < N; k++) {
  const env = Math.min(1, (N - k) / fadeOut);
  pcm.writeInt16LE(Math.round(Math.tanh(L[k] * norm * 1.1) * env * 32000), k * 4);
  pcm.writeInt16LE(Math.round(Math.tanh(R[k] * norm * 1.1) * env * 32000), k * 4 + 2);
}
const h = Buffer.alloc(44);
h.write("RIFF", 0);
h.writeUInt32LE(36 + pcm.length, 4);
h.write("WAVEfmt ", 8);
h.writeUInt32LE(16, 16);
h.writeUInt16LE(1, 20);
h.writeUInt16LE(2, 22);
h.writeUInt32LE(SR, 24);
h.writeUInt32LE(SR * 4, 28);
h.writeUInt16LE(4, 32);
h.writeUInt16LE(16, 34);
h.write("data", 36);
h.writeUInt32LE(pcm.length, 40);
fs.writeFileSync(path.join(__dirname, "..", "public", "hear", V2 ? "score-v2.wav" : SHORT ? "score-short.wav" : "score.wav"), Buffer.concat([h, pcm]));
console.log("score written, peak", peak.toFixed(3));
