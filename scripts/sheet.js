// Contact sheet of a composition at given seconds: node scripts/sheet.js HearFlat 0.5,2,5 [out.png]
const path = require("path");
const fs = require("fs");
const { PNG } = require("pngjs");
const { bundle } = require("@remotion/bundler");
const { renderStill, selectComposition } = require("@remotion/renderer");

(async () => {
  const root = path.join(__dirname, "..");
  const [id, list, outName] = process.argv.slice(2);
  const secs = list.split(",").map(Number);
  const serveUrl = await bundle({ entryPoint: path.join(root, "src", "index.ts"), publicDir: path.join(root, "public") });
  const composition = await selectComposition({ serveUrl, id });
  const scale = Number(process.env.SCALE || 0.2);
  const tiles = [];
  for (const s of secs) {
    const frame = Math.min(composition.durationInFrames - 1, Math.round(s * composition.fps));
    const output = path.join(root, "out", "stills", `sheet-${frame}.png`);
    await renderStill({ composition, serveUrl, output, frame, scale, imageFormat: "png" });
    tiles.push(PNG.sync.read(fs.readFileSync(output)));
  }
  const cols = Number(process.env.COLS || 6);
  const tw = tiles[0].width, th = tiles[0].height, gap = 6;
  const rows = Math.ceil(tiles.length / cols);
  const sheet = new PNG({ width: cols * (tw + gap), height: rows * (th + gap) });
  sheet.data.fill(255);
  tiles.forEach((tile, i) => {
    const ox = (i % cols) * (tw + gap), oy = Math.floor(i / cols) * (th + gap);
    PNG.bitblt(tile, sheet, 0, 0, tw, th, ox, oy);
  });
  const out = path.join(root, "out", "stills", outName || `${id}-sheet.png`);
  fs.writeFileSync(out, PNG.sync.write(sheet));
  console.log(out, secs.join(" "));
})().catch((e) => { console.error(e); process.exit(1); });
