// Traces the 2D character image into clean vector art: node scripts/trace-character.js <image>
// Accepts PNG directly; WEBP/JPG are converted to PNG with the local Blender first. Writes public/narrator/logia-2d.svg.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { PNG } = require("pngjs");
const ImageTracer = require("imagetracerjs");

const input = process.argv[2];
if (!input) throw new Error("usage: node scripts/trace-character.js <image>");
const root = path.join(__dirname, "..");
let png = input;
if (!/\.png$/i.test(input)) {
  png = path.join(root, "out", "logia-2d-src.png");
  const py = path.join(root, "out", "convert.py");
  fs.writeFileSync(
    py,
    `import bpy\nimg = bpy.data.images.load(r"${path.resolve(input)}")\nimg.filepath_raw = r"${png}"\nimg.file_format = "PNG"\nimg.save()\nprint("CONVERTED")\n`,
  );
  execFileSync("C:/Program Files/Blender Foundation/Blender 5.2/blender.exe", ["-b", "--factory-startup", "-P", py], { stdio: "pipe" });
}
const img = PNG.sync.read(fs.readFileSync(png));
const imageData = { width: img.width, height: img.height, data: img.data };
const svg = ImageTracer.imagedataToSVG(imageData, {
  numberofcolors: 14,
  colorquantcycles: 4,
  ltres: 1,
  qtres: 1,
  pathomit: 24,
  blurradius: 4,
  blurdelta: 64,
  strokewidth: 0.6,
  linefilter: true,
  roundcoords: 1,
  viewbox: true,
});
const out = path.join(root, "public", "narrator", "logia-2d.svg");
fs.writeFileSync(out, svg);
console.log("TRACED", img.width + "x" + img.height, (svg.length / 1024).toFixed(0) + " KB ->", out);
