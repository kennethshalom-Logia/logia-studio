// Score + sound design for the "God left me on seen" reel, timed from src/data/seen.json.
// Writes public/seen/mix.wav (no voice). The music bus ducks under the narration.
const fs = require("fs");
const path = require("path");

const SR = 44100;
const TAU = Math.PI * 2;
const data = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "src", "data", process.env.AUDIO_DATA || "seen.json"), "utf8"));
const WORDS = data.lines.flatMap((l) => l.words);
const S = (id) => data.lines.find((l) => l.id === id).start;
const norm = (x) => x.toLowerCase().replace(/[^a-z0-9]/g, "");
const At = (id, w, nth = 0) => {
  const hits = data.lines.find((l) => l.id === id).words.filter((x) => norm(x.text).startsWith(norm(w)));
  return (hits[nth] || hits[hits.length - 1]).start;
};
const END = data.total;
const TOTAL = data.total + 1.0;
const N = Math.ceil(TOTAL * SR);
const music = [new Float32Array(N), new Float32Array(N)];
const sfx = [new Float32Array(N), new Float32Array(N)];
let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

const put = (bus, i, v, pan = 0) => {
  if (i < 0 || i >= N) return;
  bus[0][i] += v * Math.cos((pan + 1) * Math.PI / 4);
  bus[1][i] += v * Math.sin((pan + 1) * Math.PI / 4);
};

/* ---------- instruments (music bus) ---------- */
function pad(notes, start, dur, { gain = 0.1, atk = 1.5, rel = 2, harm = 7, voices = 3, bright = 1 } = {}) {
  const s0 = Math.floor(start * SR);
  const len = Math.floor((dur + rel) * SR);
  notes.forEach((m, ni) => {
    for (let v = 0; v < voices; v++) {
      const f = mtof(m) * (1 + (v - (voices - 1) / 2) * 0.0035);
      const pan = (ni / Math.max(1, notes.length - 1) - 0.5) * 0.8 + (v - 1) * 0.25;
      const ph = Math.random() * TAU;
      for (let k = 0; k < len; k += 1) {
        const t = k / SR;
        const env = Math.min(1, t / atk) * (t > dur ? Math.max(0, 1 - (t - dur) / rel) : 1);
        if (env <= 0) continue;
        let s = 0;
        for (let h = 1; h <= harm; h++) s += Math.sin(TAU * f * h * t + ph * h) / Math.pow(h, 1.25 / bright);
        put(music, s0 + k, s * env * gain / voices, pan);
      }
    }
  });
}
function piano(m, start, { gain = 0.14, dec = 2.8, pan = 0 } = {}) {
  const s0 = Math.floor(start * SR);
  const f = mtof(m);
  for (let k = 0; k < dec * 3 * SR; k++) {
    const t = k / SR;
    let s = 0;
    for (let h = 1; h <= 5; h++) s += Math.sin(TAU * f * h * (1 + 0.0004 * h * h) * t) * Math.exp(-t * h * 0.9) / h;
    put(music, s0 + k, s * Math.min(1, t / 0.004) * Math.exp(-t / dec) * gain, pan);
  }
}
function stac(m, start, { gain = 0.06, pan = 0 } = {}) {
  const s0 = Math.floor(start * SR);
  const f = mtof(m);
  for (let k = 0; k < 0.45 * SR; k++) {
    const t = k / SR;
    let s = 0;
    for (let h = 1; h <= 6; h++) s += Math.sin(TAU * f * h * t) / (h * h * 0.6 + 0.4);
    put(music, s0 + k, s * Math.min(1, t / 0.012) * Math.exp(-t / 0.22) * gain, pan);
  }
}

/* ---------- sound effects (sfx bus) ---------- */
function boom(t0, gain = 0.8) {
  const s0 = Math.floor(t0 * SR);
  let ph = 0, lp = 0;
  for (let k = 0; k < 2.2 * SR; k++) {
    const t = k / SR;
    ph += TAU * (34 + 70 * Math.exp(-t * 14)) / SR;
    lp += 0.06 * (rnd() - lp);
    put(sfx, s0 + k, (Math.sin(ph) * Math.exp(-t / 0.7) + lp * Math.exp(-t / 0.04) * 2) * gain);
  }
}
function whoosh(t0, dur = 0.7, gain = 0.25) {
  const s0 = Math.floor((t0 - dur * 0.6) * SR);
  const len = Math.floor(dur * SR);
  let lp = 0;
  for (let k = 0; k < len; k++) {
    const p = k / len;
    const a = 0.02 + 0.3 * Math.sin(Math.PI * p);
    lp += a * (rnd() - lp);
    put(sfx, s0 + k, lp * Math.sin(Math.PI * p) ** 2 * gain, (p - 0.5) * 1.6);
  }
}
function rain(t0, t1, gain = 0.06) {
  let lp = 0, hp = 0;
  for (let i = Math.floor(t0 * SR); i < Math.min(N, t1 * SR); i++) {
    const t = i / SR;
    const env = Math.min(1, (t - t0) / 0.8, (t1 - t) / 0.8);
    const x = rnd();
    lp += 0.25 * (x - lp);
    hp = x - lp;
    let s = (lp * 0.5 + hp * 0.25) * gain * env;
    if (Math.random() < 0.0009) s += (Math.random() * 0.4) * gain * 3;  // droplets
    put(sfx, i, s, Math.sin(i * 0.0001) * 0.4);
  }
}
function buzz(t0, gain = 0.3) {
  for (let p = 0; p < 2; p++) {
    const s0 = Math.floor((t0 + p * 0.5) * SR);
    for (let k = 0; k < 0.32 * SR; k++) {
      const t = k / SR;
      const sq = Math.sign(Math.sin(TAU * 160 * t)) * 0.5 + Math.sin(TAU * 80 * t) * 0.5;
      put(sfx, s0 + k, sq * gain * Math.min(1, t / 0.02, (0.32 - t) / 0.03) * 0.5);
    }
  }
}
function ding(t0, gain = 0.18) {
  [[1318.5, 0], [1760, 0.12]].forEach(([f, d]) => {
    const s0 = Math.floor((t0 + d) * SR);
    for (let k = 0; k < 1.2 * SR; k++) {
      const t = k / SR;
      put(sfx, s0 + k, Math.sin(TAU * f * t) * Math.exp(-t / 0.35) * gain, 0.2);
    }
  });
}
function heartbeat(t0, t1, gain = 0.35) {
  for (let t = t0; t < t1; t += 0.86) {
    [0, 0.22].forEach((d, j) => {
      const s0 = Math.floor((t + d) * SR);
      for (let k = 0; k < 0.4 * SR; k++) {
        const tt = k / SR;
        put(sfx, s0 + k, Math.sin(TAU * (46 + 30 * Math.exp(-tt * 30)) * tt) * Math.exp(-tt / 0.13) * gain * (j ? 0.6 : 1));
      }
    });
  }
}
function clunk(t0, gain = 0.4) {
  const s0 = Math.floor(t0 * SR);
  let lp = 0;
  for (let k = 0; k < 0.5 * SR; k++) {
    const t = k / SR;
    lp += 0.2 * (rnd() - lp);
    put(sfx, s0 + k, (lp * Math.exp(-t / 0.01) * 3 + Math.sin(TAU * 70 * t) * Math.exp(-t / 0.12)) * gain);
  }
}
function wind(t0, t1, gain = 0.25) {
  let lp = 0;
  for (let i = Math.floor(t0 * SR); i < Math.min(N, t1 * SR); i++) {
    const t = i / SR;
    const env = Math.min(1, (t - t0) / 0.3, (t1 - t) / 0.4);
    const a = 0.01 + 0.04 * (0.5 + 0.5 * Math.sin(t * 5));
    lp += a * (rnd() - lp);
    put(sfx, i, lp * 6 * gain * env, Math.sin(t * 3) * 0.8);
  }
}
function rumble(t0, t1, gain = 0.5) {
  let lp = 0;
  for (let i = Math.floor(t0 * SR); i < Math.min(N, t1 * SR); i++) {
    const t = i / SR;
    const env = Math.min(1, (t - t0) / 0.1, (t1 - t) / 0.5);
    lp += 0.004 * (rnd() - lp);
    put(sfx, i, (lp * 30 + Math.sin(TAU * 31 * t) * 0.3) * gain * env);
  }
}
function fire(t0, t1, gain = 0.2) {
  let lp = 0;
  for (let i = Math.floor(t0 * SR); i < Math.min(N, t1 * SR); i++) {
    const t = i / SR;
    const env = Math.min(1, (t - t0) / 0.2, (t1 - t) / 0.3);
    lp += 0.05 * (rnd() - lp);
    let s = lp * 2;
    if (Math.random() < 0.002) s += rnd() * 2;
    put(sfx, i, s * gain * env, rnd() * 0.5);
  }
}
function shimmer(t0, dur, gain = 0.05) {
  [81, 88, 93, 100].forEach((m, i) => {
    const s0 = Math.floor(t0 * SR);
    const f = mtof(m);
    for (let k = 0; k < dur * SR; k++) {
      const t = k / SR;
      put(music, s0 + k, Math.sin(TAU * f * t) * Math.sin(Math.PI * t / dur) * gain * (0.6 + 0.4 * Math.sin(TAU * (0.7 + i * 0.3) * t)), (i - 1.5) * 0.5);
    }
  });
}
function grind(t0, t1, gain = 0.4) {
  let lp = 0;
  for (let i = Math.floor(t0 * SR); i < Math.min(N, t1 * SR); i++) {
    const t = i / SR;
    const env = Math.min(1, (t - t0) / 0.2, (t1 - t) / 0.3);
    lp += 0.02 * (rnd() - lp);
    put(sfx, i, lp * 8 * gain * env * (0.7 + 0.3 * Math.sin(t * 23)));
  }
}
function pages(t0, n = 3, gain = 0.25) {
  for (let j = 0; j < n; j++) {
    const s0 = Math.floor((t0 + j * 0.18) * SR);
    let lp = 0;
    for (let k = 0; k < 0.16 * SR; k++) {
      const t = k / SR;
      const x = rnd();
      lp += 0.5 * (x - lp);
      put(sfx, s0 + k, (x - lp) * Math.sin(Math.PI * t / 0.16) * gain, j % 2 ? 0.3 : -0.3);
    }
  }
}
function steps(t0, t1, rate = 1.8, gain = 0.25) {
  for (let t = t0; t < t1; t += 1 / rate) {
    const s0 = Math.floor(t * SR);
    let lp = 0;
    for (let k = 0; k < 0.12 * SR; k++) {
      const tt = k / SR;
      lp += 0.1 * (rnd() - lp);
      put(sfx, s0 + k, (lp * 3 + Math.sin(TAU * 90 * tt) * 0.3) * Math.exp(-tt / 0.03) * gain);
    }
  }
}
function roomtone(t0, t1, gain = 0.03) {
  let lp = 0;
  for (let i = Math.floor(t0 * SR); i < Math.min(N, t1 * SR); i++) {
    lp += 0.01 * (rnd() - lp);
    const t = i / SR;
    put(sfx, i, (lp * 4 + Math.sin(TAU * 110 * t) * 0.05) * gain * Math.min(1, (t - t0) / 0.6, (t1 - t) / 0.6));
  }
}

/* ---------- the cue ---------- */
const E = (id) => data.lines.find((l) => l.id === id).end;
const has = (id) => data.lines.some((l) => l.id === id);
const BEAT = 60 / 84;
const BAR = BEAT * 4;
const CH = { Dm: [50, 53, 57], Bb: [46, 50, 53], F: [53, 57, 60], C: [48, 52, 55], D: [50, 54, 57, 62], G: [43, 50, 55], A: [45, 52, 57] };
const ARP = { Dm: [62, 65, 69, 74], Bb: [62, 65, 70, 74], F: [60, 65, 69, 72], C: [60, 64, 67, 72], D: [62, 66, 69, 74], G: [62, 67, 71, 74], A: [61, 64, 69, 73] };
const crickets = (t0, n = 4, gain = 0.05) => {
  for (let k = 0; k < n; k++) [0, 0.07, 0.14].forEach((d) => {
    const s0 = Math.floor((t0 + k * 0.42 + d) * SR);
    for (let j = 0; j < 0.05 * SR; j++) put(sfx, s0 + j, Math.sin(TAU * 4300 * j / SR) * Math.sin(Math.PI * j / (0.05 * SR)) * gain, 0.5);
  });
};
const cuts = ["p1", "e1", "d1", "t1", "c1", "x1", "r1", "u1", "o1", "w1", "h1", "f1", "z1"].filter(has).map((id) => S(id) - 0.12);
cuts.forEach((c) => whoosh(c + 0.05, 0.55, 0.15));

if (has("p1")) {
// Hook: the "Seen" tick, a low night drone, a deadpan piano note.
ding(0.5, 0.1);
pad([38, 45], 0.05, has("e1") ? S("e1") : S("d1"), { gain: 0.07, atk: 1.2, rel: 1.2, harm: 8, bright: 0.8 });
piano(62, 0.1, { gain: 0.1 }); piano(57, 1.15, { gain: 0.08 });
// Praying: plucks under each attempt, a hollow clunk + crickets on every "Nothing".
[62, 65, 69].forEach((m, i) => stac(m, S("p1") + i * 0.2, { gain: 0.06, pan: -0.3 }));
clunk(S("n1"), 0.4); crickets(S("n1") + 0.15, 1);
boom(S("p2"), 0.45);
[65, 69, 72, 77].forEach((m, i) => stac(m, S("p2") + i * 0.14, { gain: 0.07, pan: 0.3 }));
clunk(S("n2"), 0.4); crickets(S("n2") + 0.15, 1);
[57, 60].forEach((m, i) => stac(m, S("p3") + 0.2 + i * 0.5, { gain: 0.05 }));
// "O Heavenly Father": a sudden choir of angels, cut dead.
pad([62, 66, 69, 74, 78], S("ohf") - 0.05, E("ohf") - S("ohf") - 0.1, { gain: 0.13, atk: 0.12, rel: 0.12, harm: 6, bright: 1.6 });
pad([38, 50], S("ohf") - 0.05, E("ohf") - S("ohf") - 0.1, { gain: 0.1, atk: 0.1, rel: 0.12, harm: 8, voices: 2 });
shimmer(S("ohf"), E("ohf") - S("ohf"), 0.05);
clunk(S("n3"), 0.5); crickets(S("n3") + 0.2, 2, 0.06);
// Either / or: a sneaky walking pluck.
if (has("e1")) for (let k = 0, x = S("e1"); x < S("d1") - 0.4; k++, x += BEAT / 2) stac([50, 57, 53, 57, 48, 55, 52, 55][k % 8] + 12, x, { gain: 0.045, pan: k % 2 ? 0.4 : -0.4 });
if (has("e2")) clunk(S("e2") + 0.1, 0.25);
if (has("meet")) [0, 0.16].forEach((d) => ding(At("meet", "two") + d, 0.07));
// David: a harp, then it turns minor for the lament, then a "kept" chord.
[62, 66, 69, 74, 78, 74, 69, 66, 62, 66, 69, 74].forEach((m, i) => stac(m, S("d1") + i * 0.2, { gain: 0.07, pan: Math.sin(i) * 0.5 }));
pad(CH.D, S("d1"), S("d3") - S("d1"), { gain: 0.06, atk: 0.5, rel: 0.8, harm: 5 });
pad(CH.Dm, S("d3"), S("d6") - S("d3"), { gain: 0.08, atk: 0.8, rel: 1, harm: 7 });
[74, 72, 69, 65].forEach((m, i) => piano(m, S("d4") + i * 0.62, { gain: 0.1 }));
pages(S("d3"), 3, 0.2);
clunk(At("d6", "deleted") + 0.5, 0.4);
pad(CH.F, S("d7"), S("t1") - S("d7"), { gain: 0.08, atk: 0.3, rel: 0.8, harm: 7, bright: 1.2 });
ding(At("d7", "kept"), 0.1);
// Mother Teresa: still and bare, then dawn.
pad(CH.Bb, S("t1"), S("t4") - S("t1"), { gain: 0.07, atk: 1, rel: 1, harm: 6 });
pad([34], S("t1"), S("t5") - S("t1"), { gain: 0.08, atk: 1, rel: 1, harm: 8, voices: 2 });
[70, 65, 62].forEach((m, i) => piano(m, S("t3") + i * 0.9, { gain: 0.09 }));
pages(At("t3", "private"), 3, 0.18);
pad(CH.Dm, S("t4"), S("t5") - S("t4"), { gain: 0.08, atk: 0.4, rel: 0.6, harm: 7 });
boom(At("t4", "forty"), 0.5);
pad(CH.F, S("t5"), S("c1") - S("t5"), { gain: 0.09, atk: 0.5, rel: 1, harm: 8, bright: 1.3 });
[65, 69, 72, 77].forEach((m, i) => piano(m, S("t5") + i * 0.35, { gain: 0.09 }));
// Good company: warm and settled.
pad(CH.C, S("c1"), S("c2") - S("c1"), { gain: 0.08, atk: 0.4, rel: 0.8, harm: 7 });
pad(CH.F, S("c2"), (has("u1") ? S("u1") : S("x1")) - S("c2"), { gain: 0.1, atk: 0.3, rel: 1, harm: 8, bright: 1.3 });
boom(At("c2", "very"), 0.35);
}
if (has("x1")) {
  // Part 1 cliffhanger: the chat wakes up, a riser into "part two", then the tick that loops into the hook.
  pad([38, 45, 50], S("x1"), END - S("x1"), { gain: 0.08, atk: 0.6, rel: 1, harm: 8 });
  [0, 0.25, 0.5].forEach((d, i) => ding(S("x2") + 0.15 + d, 0.08 + i * 0.01));
  whoosh(S("x3") + 0.1, 1.0, 0.22);
  boom(S("x3") + 0.05, 0.6);
  piano(62, S("x4") + 0.1, { gain: 0.09 });
  ding(S("x4") + 1.2, 0.08);
}
if (has("g1")) {
  // Part 2 hook: four notifications, then the thud of having missed them all.
  pad([38, 45], 0.05, has("u1") ? S("u1") : S("o1"), { gain: 0.07, atk: 1, rel: 1.2, harm: 8, bright: 0.8 });
  ding(0.35, 0.1);
  [0, 0.2, 0.4, 0.6].forEach((d, i) => ding(S("g2") + d, 0.08 + i * 0.012));
  clunk(S("g3") + 0.2, 0.5); boom(S("g3") + 0.2, 0.4);
  [57, 60, 62, 57].forEach((m, i) => stac(m + 12, S("r1") + i * 0.36, { gain: 0.05, pan: i % 2 ? 0.4 : -0.4 }));
  if (has("r3")) { ding(S("r2") + 0.1, 0.09); [0, 0.1, 0.2, 0.3].forEach((d) => clunk(S("r3") + d, 0.22)); } else clunk(E("r2") - 0.5, 0.3);
}
if (has("o1")) {
// The turn: silence, notification dings, then the drop into the list.
if (has("u1")) {
[0, 0.22, 0.44, 0.66].forEach((d, i) => ding(S("u2") + 0.1 + d, 0.09 + i * 0.01));
whoosh(At("u3", "not") + 0.3, 0.9, 0.2);
clunk(At("u3", "not") + 0.2, 0.4);
[0, 0.12, 0.24, 0.36].forEach((d) => clunk(At("u3", "not") + 0.3 + d, 0.2));
}
// The four inboxes: a driving ostinato, a hit on each number.
const mainStart = S("o1") - 0.1, mainEnd = S("f6") - 0.2;
const PROG = ["Dm", "Bb", "F", "C"];
for (let k = 0; mainStart + k * BAR < mainEnd; k++) {
  const t0 = mainStart + k * BAR;
  const c = PROG[k % 4];
  const dur = Math.min(BAR, mainEnd - t0);
  const lift = Math.min(1, k / 6);
  pad(CH[c], t0, dur, { gain: 0.055 + 0.03 * lift, atk: 0.7, rel: 1.2, harm: 8 });
  pad([CH[c][0] - 12], t0, dur, { gain: 0.09, atk: 0.3, rel: 0.7, harm: 10, voices: 2 });
  for (let i = 0; i < 8 && t0 + i * BEAT / 2 < mainEnd; i++) stac(ARP[c][[0, 1, 2, 3, 2, 1, 2, 3][i]], t0 + i * BEAT / 2, { gain: 0.03 + 0.03 * lift, pan: i % 2 ? 0.45 : -0.45 });
}
["o1", "w1", "h1", "f1"].forEach((id) => boom(S(id), 0.65));
const land = At("o3", "whole") - 0.05;
whoosh(land, 0.5, 0.25); boom(land, 0.9); clunk(land, 0.6);
ding(land + 0.5, 0.1);
buzz(At("w2", "called") - 0.1, 0.3); buzz(At("w2", "called") + 0.9, 0.22);
clunk(At("w3", "network") + 0.35, 0.4);
roomtone(S("h1"), S("f1"), 0.05);
boom(S("h3") - 0.05, 0.6); clunk(S("h3") + 0.05, 0.4);
["f3", "f4", "f5"].forEach((id) => { clunk(S(id) - 0.08, 0.3); pages(S(id) - 0.1, 1, 0.2); });
whoosh(S("f6") + 0.7, 1.4, 0.2);
shimmer(S("f6"), E("f7") - S("f6") + 0.6, 0.05);
// Resolution: it lands on D major for "It's him" and stays there.
pad(CH.G, S("f6"), S("f7") - S("f6"), { gain: 0.09, atk: 0.5, rel: 0.6, harm: 8, bright: 1.2 });
const res = S("f7") - 0.05;
boom(res, 0.5);
pad(CH.D, res, END - res, { gain: 0.11, atk: 0.3, rel: 1.5, harm: 9, bright: 1.4 });
pad([26, 38], res, END - res, { gain: 0.09, atk: 0.4, rel: 1.5, harm: 10, voices: 2 });
const zz = has("z1") ? S("z1") : S("z2");
pad([74, 78, 81], zz, END - zz, { gain: 0.03, atk: 1, rel: 1, harm: 3, bright: 2 });
[62, 66, 69, 74].forEach((m, i) => piano(m, zz + i * 0.5, { gain: 0.09 }));
clunk(At("z2", "seen") + 0.1, 0.35);
[0, 0.14, 0.28, 0.42].forEach((d, i) => ding(At("z3", "wrong") + 0.1 + d, 0.06 + i * 0.01));
// Loop: the "Seen" tick again, so the end runs into the start.
const lp = has("y2") ? S("y2") : S("z4");
ding(lp + 0.9, 0.08);
piano(62, lp + 0.1, { gain: 0.09 });
}

/* ---------- reverb, ducking, mix ---------- */
function reverb(input, offset) {
  const combs = [1557, 1617, 1491, 1422, 1277, 1356, 1188, 1116].map((n) => ({ buf: new Float32Array(n + offset), i: 0, lp: 0 }));
  const aps = [556, 441, 341, 225].map((n) => ({ buf: new Float32Array(n + offset), i: 0 }));
  const out = new Float32Array(N);
  for (let k = 0; k < N; k++) {
    const x = input[k] * 0.015;
    let s = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.lp = y * 0.75 + c.lp * 0.25;
      c.buf[c.i] = x + c.lp * 0.86;
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
for (let k = 0; k < N; k++) mono[k] = (music[0][k] + music[1][k] + (sfx[0][k] + sfx[1][k]) * 0.4) / 2;
const wl = reverb(mono, 0);
const wr = reverb(mono, 23);
// Duck the music under speech (attack 60 ms, release 400 ms).
const duck = new Float32Array(N);
let g = 1;
const speaking = (tt) => WORDS.some((w) => tt >= w.start - 0.05 && tt <= w.end + 0.1);
for (let k = 0; k < N; k += 441) {
  const target = speaking(k / SR) ? 0.55 : 1;
  for (let j = 0; j < 441 && k + j < N; j++) {
    g += (target - g) * (target < g ? 0.0004 : 0.00006);
    duck[k + j] = g;
  }
}
let peak = 0;
const L = new Float32Array(N), Rr = new Float32Array(N);
for (let k = 0; k < N; k++) {
  L[k] = (music[0][k] * 0.85 + wl[k] * 1.0) * duck[k] + sfx[0][k];
  Rr[k] = (music[1][k] * 0.85 + wr[k] * 1.0) * duck[k] + sfx[1][k];
  peak = Math.max(peak, Math.abs(L[k]), Math.abs(Rr[k]));
}
const normk = 0.85 / peak;
const pcm = Buffer.alloc(N * 4);
for (let k = 0; k < N; k++) {
  const env = Math.min(1, (N - k) / (SR * 1.2));
  pcm.writeInt16LE(Math.round(Math.tanh(L[k] * normk * 1.1) * env * 32000), k * 4);
  pcm.writeInt16LE(Math.round(Math.tanh(Rr[k] * normk * 1.1) * env * 32000), k * 4 + 2);
}
const h = Buffer.alloc(44);
h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVEfmt ", 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22);
h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
fs.writeFileSync(path.join(__dirname, "..", "public", ...(process.env.AUDIO_OUT || "seen/mix.wav").split("/")), Buffer.concat([h, pcm]));
console.log("mix written", TOTAL.toFixed(1) + "s", "peak", peak.toFixed(2));
