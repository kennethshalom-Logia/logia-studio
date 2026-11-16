// Encodes blender/out/<shot>/f_####.jpg into public/cine/<shot>.mp4 and writes src/data/cine-shots.json.
// node scripts/encode-cine.js [shot ...]
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "blender", "out");
const OUT = path.join(ROOT, "public", "cine");
fs.mkdirSync(OUT, { recursive: true });
const want = process.argv.slice(2);
const shots = fs.readdirSync(SRC).filter((d) => fs.existsSync(path.join(SRC, d, "meta.json")) && (!want.length || want.includes(d)));
for (const s of shots) {
  execFileSync("npx", ["remotion", "ffmpeg", "-y", "-loglevel", "error", "-framerate", "30", "-start_number", "1", "-i", path.join(SRC, s, "f_%04d.jpg"),
    "-c:v", "libx264", "-preset", "slow", "-crf", "14", "-pix_fmt", "yuv420p", path.join(OUT, `${s}.mp4`)], { cwd: ROOT, stdio: "inherit", shell: true });
  console.log("encoded", s);
}
const all = fs.readdirSync(SRC).filter((d) => fs.existsSync(path.join(SRC, d, "meta.json"))).map((d) => ({ name: d, ...JSON.parse(fs.readFileSync(path.join(SRC, d, "meta.json"), "utf8")) }));
all.sort((a, b) => a.start - b.start);
fs.writeFileSync(path.join(ROOT, "src", "data", "cine-shots.json"), JSON.stringify(all, null, 1));
console.log("shots", all.map((s) => `${s.name}@${s.start.toFixed(2)}`).join(" "));
