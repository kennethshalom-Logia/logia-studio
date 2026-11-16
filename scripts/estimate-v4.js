// Placeholder word timings for the v4 (story) script until the real narration is aligned.
const fs = require("fs");
const path = require("path");
const text = `I don't think God is real. [p] Because I've prayed for years... and He's never said a single word to me. [p] I go to church. I pray. I worship. But no voice. No lightning. Nothing. [P] But what if God isn't silent... what if I was listening for the wrong thing? [p] Elijah waited for God in the wind... the earthquake... and the fire. But God came... in a whisper. [p] So here's how you HEAR Him. [p] H is for History. My faith doesn't stand on a feeling. It stands on an empty tomb, seen by over five hundred eyewitnesses. [p] E is for Every page. In nineteen forty-seven, scrolls found by the Dead Sea showed Isaiah, copied almost word for word, a thousand years older than any copy we had. God kept His word. Read it out loud, and you're hearing His voice. [p] A is for Around you. The friend who texted at the perfect moment. The sermon that felt aimed right at me. God speaks through people... more than clouds. [p] R is for Rearview. Look back... and you'll see one red thread through it all. His fingerprints. Everywhere. [p] He was never silent. He's been whispering this whole time. [p] Which letter did you need today? Comment H, E, A, or R.`;
let t = 0.2;
const words = [];
for (const tok of text.split(/\s+/)) {
  if (tok === "[p]") { t += 0.45; continue; }
  if (tok === "[P]") { t += 0.9; continue; }
  const syl = Math.max(1, (tok.toLowerCase().replace(/[^a-z]/g, "").match(/[aeiouy]+/g) || []).length);
  const d = 0.1 + syl * 0.13;
  words.push({ text: tok, type: "word", start: +t.toFixed(3), end: +(t + d).toFixed(3) });
  t += d + 0.04 + (/[.?!]$/.test(tok) ? 0.35 : /[,]$|\.\.\.$/.test(tok) ? 0.22 : 0);
}
fs.writeFileSync(path.join(__dirname, "..", "src", "data", "hear-v4.json"), JSON.stringify({ placeholder: true, words }));
console.log("words", words.length, "ends", t.toFixed(1));
