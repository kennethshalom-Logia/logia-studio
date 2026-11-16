// Usage: node scripts/stills.js Part1:60,180 Part2:90
const path = require("path");
const { bundle } = require("@remotion/bundler");
const { renderStill, selectComposition } = require("@remotion/renderer");

(async () => {
  const root = path.join(__dirname, "..");
  const serveUrl = await bundle({ entryPoint: path.join(root, "src", "index.ts"), publicDir: path.join(root, "public") });
  for (const arg of process.argv.slice(2)) {
    const [id, list] = arg.split(":");
    const composition = await selectComposition({ serveUrl, id });
    for (const f of list.split(",")) {
      const output = path.join(root, "out", "stills", `${id}-${f.padStart(4, "0")}.jpg`);
      await renderStill({ composition, serveUrl, output, frame: Number(f), scale: Number(process.env.SCALE || 0.3), imageFormat: "jpeg", jpegQuality: 75 });
      console.log(output);
    }
  }
})().catch((e) => { console.error(e); process.exit(1); });
