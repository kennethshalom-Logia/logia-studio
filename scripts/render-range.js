// node scripts/render-range.js <comp> <fromSec> <toSec> <out.mp4>
const path = require("path");
const { bundle } = require("@remotion/bundler");
const { renderMedia, selectComposition } = require("@remotion/renderer");
(async () => {
  const [id, a, b, out] = process.argv.slice(2);
  const root = path.join(__dirname, "..");
  const serveUrl = await bundle({ entryPoint: path.join(root, "src", "index.ts"), publicDir: path.join(root, "public") });
  const composition = await selectComposition({ serveUrl, id });
  await renderMedia({ composition, serveUrl, codec: "h264", crf: 18, audioCodec: "aac", outputLocation: path.join(root, "out", out),
    frameRange: [Math.round(Number(a) * 30), Math.min(composition.durationInFrames - 1, Math.round(Number(b) * 30))] });
  console.log("done", out);
})().catch((e) => { console.error(e); process.exit(1); });
