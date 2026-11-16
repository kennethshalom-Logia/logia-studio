// Score + sound design for the flat H.E.A.R. reel, timed from src/data/hear-flat.json.
// Writes public/hear5/mix-flat.wav (no voice). The music bus ducks under the narration.
const fs = require("fs");
const path = require("path");

const SR = 44100;
const TAU = Math.PI * 2;
const data = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "src", "data", process.env.AUDIO_DATA || "hear-flat.json"), "utf8"));
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
const t = {
  years: S("years"), church: S("church"), pray: At("church", "pray"), worship: At("church", "worship"), nothing: S("nothing"),
  noVoice: At("nothing", "voice"), noLight: At("nothing", "lightning"), noth: At("nothing", "nothing"), turn: S("turn"), wrong: At("turn", "wrong"),
  tune: At("turn", "what", 1), elijah: S("elijah1"), wind: At("elijah1", "wind"), quake: At("elijah1", "earthquake"), fire: At("elijah1", "fire"),
  any: At("elijah2", "any"), came: At("elijah2", "he"), whisper: At("elijah2", "whisper"), how: S("how"), hear: At("how", "hear"),
  H: S("h1"), stands: At("h2", "stands"), seen: At("h2", "seen"), E: S("e1"), e2: S("e2"), scrolls: At("e2", "scrolls"), thousand: At("e2", "1,000"),
  kept: S("e3"), read: At("e3", "read"), A: S("a1"), friend: At("a2", "friend"), sermon: At("a2", "sermon"), me: At("a2", "me"), speaks: S("a3"),
  R: S("r1"), look: S("r2"), red: At("r2", "red"), prints: At("r2", "fingerprints"), every: At("r2", "everywhere"),
  never: S("end1"), whispering: S("end2"), ask: S("cta"),
};
// Every zoom-through cut gets a whoosh (the edit's shot starts).
const cuts = [1.35, t.years, t.church, t.pray, t.nothing, t.turn, t.elijah, t.how, t.H, t.E, t.e2, t.thousand - 0.4, t.kept, t.A, t.sermon, t.speaks, t.R, t.look, t.ask - 0.5, END];
if (!process.env.NO_CUT_WHOOSH) cuts.forEach((c) => whoosh(c + 0.05, 0.55, 0.16));
const BEAT = 60 / 72;
const BAR = BEAT * 4;
const CH = { Dm: [50, 53, 57], Bb: [46, 50, 53], F: [53, 57, 60], C: [48, 52, 55], D: [50, 54, 57, 62], G: [50, 55, 59] };
const ARP = { Dm: [62, 65, 69, 74], Bb: [62, 65, 70, 74], F: [60, 65, 69, 72], C: [60, 64, 67, 72], D: [62, 66, 69, 74] };
const PROG = ["Dm", "Bb", "F", "C"];

// Hook: phone send swoosh, rain, a low drone, sparse piano, heartbeat under the years of prayer.
ding(0.15, 0.08);
rain(0, t.church, 0.07);
pad([38, 45], 0.1, t.church, { gain: 0.09, atk: 2.2, rel: 1.5, harm: 9, bright: 0.8 });
[62, 65, 69, 64].forEach((m, i) => piano(m, 0.6 + i * 1.1, { gain: 0.1 }));
heartbeat(t.years + 0.6, t.church - 0.3, 0.26);
pages(t.years + 0.5, 6, 0.12);
// Church: steps, room tone, a warm organ-ish pad, then hollow clunks on "no voice / no lightning / nothing".
steps(t.church, t.pray - 0.2, 1.9, 0.16);
roomtone(t.pray, t.nothing, 0.05);
pad([50, 57, 62], t.pray, t.nothing - t.pray, { gain: 0.06, atk: 0.6, rel: 1.0, harm: 4, voices: 2 });
[t.noVoice + 0.35, t.noLight + 0.35, t.noth].forEach((x) => clunk(x, 0.45));
// Crickets after "nothing".
for (let k = 0; k < 6; k++) [0, 0.07, 0.14].forEach((d) => {
  const s0 = Math.floor((t.noth + 0.4 + k * 0.45 + d) * SR);
  for (let j = 0; j < 0.05 * SR; j++) put(sfx, s0 + j, Math.sin(TAU * 4300 * j / SR) * Math.sin(Math.PI * j / (0.05 * SR)) * 0.05, 0.5);
});
// Radio: static, then the dial lands on music.
fire(t.turn + 0.2, t.wrong + 0.3, 0.12);
[69, 72, 74, 76, 74].forEach((m, i) => stac(m, t.wrong + 0.35 + i * 0.22, { gain: 0.06, pan: 0.3 }));
pad([45, 52, 57], t.turn, t.elijah - t.turn, { gain: 0.05, atk: 2, rel: 1, harm: 5 });
// Elijah: wind, quake, fire, three hits on the X's, then a hush and shimmer.
wind(t.wind - 0.3, t.quake + 0.3, 0.3);
rumble(t.quake - 0.05, t.fire + 0.2, 0.55);
fire(t.fire - 0.1, S("elijah2") + 0.4, 0.25);
[0, 0.18, 0.36].forEach((d) => clunk(t.any + d, 0.3));
shimmer(t.came, t.how - t.came + 0.6, 0.05);
// HEAR reveal: four thumps.
[0, 0.12, 0.24, 0.36].forEach((d) => clunk(t.hear - 0.1 + d, 0.35));
boom(t.hear + 0.3, 0.5);
// Main body: a driving ostinato from H to the end of R, a boom on each letter.
const mainEnd = t.never - 0.25;
for (let k = 0; t.H + k * BAR < mainEnd; k++) {
  const t0 = t.H + k * BAR;
  const c = PROG[k % 4];
  const dur = Math.min(BAR, mainEnd - t0);
  const lift = Math.min(1, k / 8);
  pad(CH[c], t0, dur, { gain: 0.06 + 0.03 * lift, atk: 0.9, rel: 1.4, harm: 8 });
  pad([CH[c][0] - 12], t0, dur, { gain: 0.1, atk: 0.3, rel: 0.8, harm: 10, voices: 2 });
  for (let i = 0; i < 8 && t0 + i * BEAT / 2 < mainEnd; i++) stac(ARP[c][[0, 1, 2, 3, 2, 1, 2, 3][i]], t0 + i * BEAT / 2, { gain: 0.03 + 0.03 * lift, pan: i % 2 ? 0.45 : -0.45 });
}
[t.H, t.E, t.A, t.R].forEach((x) => boom(x, 0.7));
clunk(t.stands - 0.15, 0.35); boom(t.stands + 0.4, 0.4);
steps(t.seen, t.seen + 1.8, 5, 0.06);
pages(t.E + 0.1, 6, 0.22);
clunk(t.e2 + 0.9, 0.3); ding(t.e2 + 0.9, 0.06);
boom(t.thousand + 0.4, 0.45);
pages(t.read - 0.3, 3, 0.2);
buzz(t.friend - 0.3, 0.3); ding(t.friend + 0.15, 0.15);
roomtone(t.sermon, t.speaks, 0.05);
boom(t.me, 0.5);
// Rearview: engine hum, then the thread and the fingerprints.
rumble(t.R, t.look, 0.18);
pad([62, 69], t.look, t.never - t.look, { gain: 0.04, atk: 1.5, rel: 1, harm: 3, voices: 2 });
whoosh(t.red + 0.6, 1.4, 0.16);
[0, 0.12, 0.24, 0.36, 0.48].forEach((d) => clunk(t.prints + d, 0.16));
shimmer(t.prints, 2.2, 0.04);
// Resolution: everything stops before "He was never silent", a full breath of silence before the whisper.
const cl = END - t.never;
pad(CH.D, t.never + 0.1, t.whispering - t.never - 0.9, { gain: 0.1, atk: 0.4, rel: 0.6, harm: 9, bright: 1.4 });
boom(t.never + 0.05, 0.45);
pad(CH.D, t.whispering, END - t.whispering, { gain: 0.11, atk: 0.8, rel: 2.5, harm: 9, bright: 1.4 });
pad([26, 38], t.whispering, END - t.whispering, { gain: 0.1, atk: 0.5, rel: 2.5, harm: 10, voices: 2 });
pad([74, 78, 81], t.whispering, END - t.whispering, { gain: 0.035, atk: 1.2, rel: 2, harm: 3, bright: 2 });
[62, 66, 69, 74].forEach((m, i) => piano(m, t.ask + i * 0.5, { gain: 0.09 }));
rain(END - 0.2, TOTAL, 0.06);

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
fs.writeFileSync(path.join(__dirname, "..", "public", ...(process.env.AUDIO_OUT || "hear5/mix-flat.wav").split("/")), Buffer.concat([h, pcm]));
console.log("mix written", TOTAL.toFixed(1) + "s", "peak", peak.toFixed(2));
