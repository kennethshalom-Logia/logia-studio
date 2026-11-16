// Writes placeholder word timings for the v2 script until the real narration is transcribed.
const fs = require("fs");
const path = require("path");
const text = `I don't think God is real. [long pause] Because I've prayed for years... and He's never said a word to me. [pause] But what if He's not silent? What if we're just listening for the wrong thing? Here's how you HEAR Him. H is for History. The resurrection isn't a feeling. It's documented history, seen by over five hundred eyewitnesses. [pause] And the Dead Sea Scrolls show His Word was preserved, almost word for word, for a thousand years. E is for Every page. "All Scripture is breathed out by God." [pause] Every page is His voice. A is for Around you. God speaks through the people He puts in your life. R is for Rearview. Look back. [pause] Every closed door. Every right person. [pause] One red thread through it all. His fingerprints are everywhere. He's been whispering this whole time. Comment HEAR.`;
let t = 0.3;
const words = [];
for (const tok of text.split(/\s+/)) {
  if (tok === "[long") continue;
  if (tok === "pause]") { t += words.length && text ? 0.6 : 0; continue; }
  if (tok === "[pause]") { t += 0.6; continue; }
  const d = 0.12 + tok.length * 0.03;
  words.push({ text: tok, type: "word", start: +t.toFixed(3), end: +(t + d).toFixed(3) });
  t += d + 0.04 + (/[.?!]["]?$/.test(tok) ? 0.4 : /[,]$|\.\.\.$/.test(tok) ? 0.2 : 0);
}
fs.writeFileSync(path.join(__dirname, "..", "src", "data", "hear-v2.json"), JSON.stringify({ placeholder: true, words }));
console.log("words", words.length, "ends", t.toFixed(2));
