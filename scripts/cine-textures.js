// Renders face frames and phone screens used as textures by blender/cine.py.
const path = require("path");
const fs = require("fs");
const { bundle } = require("@remotion/bundler");
const { renderStill, selectComposition } = require("@remotion/renderer");
(async () => {
  const root = path.join(__dirname, "..");
  const out = path.join(root, "blender", "tex");
  fs.mkdirSync(out, { recursive: true });
  const serveUrl = await bundle({ entryPoint: path.join(root, "src", "index.ts"), publicDir: path.join(root, "public") });
  for (const [id, n, name] of [["KenFaceFrame", 24, "face"], ["PhoneScreen", 4, "screen"]]) {
    const composition = await selectComposition({ serveUrl, id });
    for (let f = 0; f < n; f++) {
      await renderStill({ composition, serveUrl, frame: f, output: path.join(out, `${name}_${String(f + 1).padStart(3, "0")}.png`), imageFormat: "png" });
    }
    console.log(id, n);
  }
})().catch((e) => { console.error(e); process.exit(1); });
