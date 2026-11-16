// Renders the H.E.A.R. reel in high quality: node scripts/render-hear.js
const path = require("path");
const { bundle } = require("@remotion/bundler");
const { renderMedia, selectComposition } = require("@remotion/renderer");

(async () => {
  const root = path.join(__dirname, "..");
  const serveUrl = await bundle({ entryPoint: path.join(root, "src", "index.ts"), publicDir: path.join(root, "public") });
  const composition = await selectComposition({ serveUrl, id: process.argv[2] || "Hear" });
  const outputLocation = path.join(root, "out", ({ HearShort: "Logia-HEAR-40s-HQ.mp4", HearV3: "Logia-HEAR-v3-preview.mp4", HearFlat: "Logia-HEAR-Ken-Story.mp4", Hear3D: "Logia-HEAR-3D.mp4", HearEditorial: "Logia-HEAR-Editorial.mp4", Seen: "Logia-SEEN-God-Left-Me-On-Seen.mp4", Seen1: "Logia-SEEN-Part1-God-Left-Me-On-Seen.mp4", Seen2: "Logia-SEEN-Part2-God-Texted-Me-Back.mp4" }[process.argv[2]] || "Logia-HEAR-HQ.mp4"));
  let last = -1;
  await renderMedia({
    composition, serveUrl, codec: "h264", crf: 15, x264Preset: "slow", pixelFormat: "yuv420p",
    audioCodec: "aac", audioBitrate: "320k", outputLocation,
    onProgress: ({ progress }) => {
      const p = Math.floor(progress * 10);
      if (p !== last) { last = p; console.log(`${p * 10}%`); }
    },
  });
  console.log("done", outputLocation);
})().catch((e) => { console.error(e); process.exit(1); });
