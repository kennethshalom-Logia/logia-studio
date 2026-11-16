// node scripts/qa.js a.png b.png ...  (files in out/stills) -> out/stills/qa-sheet.jpg
const path = require("path"), fs = require("fs");
const { bundle } = require("@remotion/bundler");
const { renderStill, selectComposition } = require("@remotion/renderer");
(async () => {
  const root = path.join(__dirname, "..");
  const files = process.argv.slice(2);
  for (const f of files) fs.copyFileSync(path.join(root, "out", "stills", f), path.join(root, "public", "qa", f));
  const serveUrl = await bundle({ entryPoint: path.join(root, "src", "index.ts"), publicDir: path.join(root, "public") });
  const inputProps = { files };
  const composition = await selectComposition({ serveUrl, id: "QASheet", inputProps });
  const out = path.join(root, "out", "stills", "qa-sheet.jpg");
  await renderStill({ composition, serveUrl, inputProps, output: out, scale: 0.6, imageFormat: "jpeg", jpegQuality: 80 });
  console.log(out);
})().catch((e) => { console.error(e); process.exit(1); });
