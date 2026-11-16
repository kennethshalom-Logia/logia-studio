const path = require("path");
const { bundle } = require("@remotion/bundler");
const { renderMedia, selectComposition } = require("@remotion/renderer");

(async () => {
  const root = path.join(__dirname, "..");
  const serveUrl = await bundle({ entryPoint: path.join(root, "src", "index.ts"), publicDir: path.join(root, "public") });
  for (const id of ["Part1", "Part2", "Part3"]) {
    const composition = await selectComposition({ serveUrl, id });
    const outputLocation = path.join(root, "out", `Logia-Hitler-in-Heaven-${id}.mp4`);
    await renderMedia({ composition, serveUrl, codec: "h264", crf: 19, audioCodec: "aac", outputLocation });
    console.log("done", outputLocation);
  }
})().catch((e) => { console.error(e); process.exit(1); });
