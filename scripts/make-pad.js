// Synthesizes a quiet, slow ambient bed so the reels don't sit on dead silence.
const fs = require("fs");
const path = require("path");

const rate = 22050;
const seconds = 50;
const chords = [
  [110, 164.81, 261.63],
  [87.31, 130.81, 220],
  [98, 146.83, 246.94],
  [82.41, 123.47, 196],
];
const n = rate * seconds;
const pcm = Buffer.alloc(n * 2);
const fade = rate * 2.5;
const barLen = 8;
for (let i = 0; i < n; i++) {
  const t = i / rate;
  const bar = t / barLen;
  const idx = Math.floor(bar);
  const mix = Math.min(1, (bar - idx) * 4);
  const cur = chords[idx % chords.length];
  const prev = chords[(idx + chords.length - 1) % chords.length];
  let s = 0;
  [[cur, mix], [prev, 1 - mix]].forEach(([notes, g]) => {
    notes.forEach((f, k) => {
      s += g * Math.sin(2 * Math.PI * f * t + k) * (k === 0 ? 0.5 : 0.25);
      s += g * Math.sin(2 * Math.PI * f * 1.003 * t) * 0.12;
    });
  });
  s *= 0.6 + 0.4 * Math.sin(t * 0.7);
  const env = Math.min(1, i / fade, (n - i) / fade);
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s * 0.34 * env)) * 32767), i * 2);
}
const h = Buffer.alloc(44);
h.write("RIFF", 0);
h.writeUInt32LE(36 + pcm.length, 4);
h.write("WAVEfmt ", 8);
h.writeUInt32LE(16, 16);
h.writeUInt16LE(1, 20);
h.writeUInt16LE(1, 22);
h.writeUInt32LE(rate, 24);
h.writeUInt32LE(rate * 2, 28);
h.writeUInt16LE(2, 32);
h.writeUInt16LE(16, 34);
h.write("data", 36);
h.writeUInt32LE(pcm.length, 40);
fs.writeFileSync(path.join(__dirname, "..", "public", "pad.wav"), Buffer.concat([h, pcm]));
