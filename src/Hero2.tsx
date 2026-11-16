import React from "react";
import { AbsoluteFill, Img, random, staticFile } from "remotion";

/**
 * Logia main character — hand-drawn 2D (SVG), matched to public/narrator/ref-3d.webp.
 * 3/4 view turned toward screen-right. Origin at the centre of the face; the head is ~340 wide and ~480 tall with hair.
 * Style: clean dark line art, soft cel shading (one lit tone, one shadow tone, gentle gradients).
 */

export type Viseme2 = "rest" | "A" | "E" | "O" | "M";
export type Mood2 = "neutral" | "smile" | "sad" | "worried" | "curious" | "awe" | "serious" | "calm";

const INK = "#24140e";
const SKIN = "#cf8a58";
const SKIN_LIT = "#e3a273";
const SKIN_SHADE = "#a9673d";
const SKIN_DEEP = "#8a512e";
const HAIR = "#141010";
const HAIR_2 = "#2a1f1c";
const HAIR_HI = "#6a5249";
const BEARD = "#1d130f";
const METAL = "#a9aeb4";
const METAL_DARK = "#4b4f55";

const FACE =
  "M-112,-170 C-132,-150 -142,-110 -144,-60 C-146,0 -140,50 -126,86 C-112,122 -86,148 -52,166 C-24,180 18,182 46,170 C82,152 106,118 120,72 C132,30 138,-30 134,-92 C132,-130 124,-158 108,-176 Z";

/** Swirl strands for the curl clumps, laid out once. */
const CLUMPS = (() => {
  const out: { x: number; y: number; r: number; a: number; s: number }[] = [];
  const rows: [number, number, number, number][] = [
    // [y, x from, x to, count]
    [-322, -120, 110, 5],
    [-290, -178, 150, 7],
    [-250, -200, 168, 8],
    [-210, -206, 172, 8],
    [-172, -200, -120, 2],
    [-170, 120, 160, 1],
    [-130, -196, -150, 2],
    [-88, -188, -160, 1],
  ];
  rows.forEach(([y, x0, x1, n], ri) => {
    for (let i = 0; i < n; i++) {
      const x = n === 1 ? x0 : x0 + ((x1 - x0) * i) / (n - 1);
      out.push({ x: x + (random(`cx${ri}${i}`) - 0.5) * 18, y: y + (random(`cy${ri}${i}`) - 0.5) * 16, r: 38 + random(`cr${ri}${i}`) * 14, a: random(`ca${ri}${i}`) * 360, s: random(`cs${ri}${i}`) > 0.5 ? 1 : -1 });
    }
  });
  return out;
})();

/** A curl clump: a filled lobe with a swirl groove and a soft highlight arc. */
const Clump: React.FC<{ x: number; y: number; r: number; a: number; s: number }> = ({ x, y, r, a, s }) => (
  <g transform={`translate(${x} ${y}) rotate(${a}) scale(${s} 1)`}>
    <path d={`M${-r},0 C${-r},${-r * 0.9} ${r * 0.8},${-r * 1.05} ${r},${-r * 0.1} C${r * 1.1},${r * 0.7} ${-r * 0.2},${r * 1.05} ${-r * 0.7},${r * 0.6} Z`} fill={HAIR} stroke={INK} strokeWidth={3} />
    <path d={`M${-r * 0.55},${r * 0.1} C${-r * 0.55},${-r * 0.5} ${r * 0.5},${-r * 0.55} ${r * 0.55},${0} C${r * 0.55},${r * 0.35} ${-r * 0.1},${r * 0.45} ${-r * 0.15},${r * 0.1}`} fill="none" stroke={HAIR_2} strokeWidth={r * 0.2} strokeLinecap="round" />
    <path d={`M${-r * 0.7},${-r * 0.25} C${-r * 0.5},${-r * 0.75} ${r * 0.2},${-r * 0.82} ${r * 0.55},${-r * 0.5}`} fill="none" stroke={HAIR_HI} strokeWidth={r * 0.09} strokeLinecap="round" opacity={0.75} />
  </g>
);

const Mouth: React.FC<{ v: Viseme2; mood: Mood2 }> = ({ v, mood }) => {
  if (v === "rest" || v === "M") {
    const up = mood === "smile" || mood === "awe" ? 1 : mood === "calm" ? 0.6 : mood === "sad" || mood === "worried" ? -0.7 : 0.15;
    return (
      <g>
        <path d={`M-40,104 C-10,${104 + 18 * up} 40,${102 + 18 * up} 80,96`} fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />
        {up > 0.5 ? <path d="M84,90 q8,4 6,13" fill="none" stroke={SKIN_DEEP} strokeWidth={4} strokeLinecap="round" /> : null}
      </g>
    );
  }
  const open = v === "A" ? 1 : v === "E" ? 0.55 : 0.85;
  const w0 = v === "O" ? -12 : -44;
  const w1 = v === "O" ? 52 : 84;
  const bot = 104 + 60 * open;
  const mid = (w0 + w1) / 2;
  return (
    <g>
      <path d={`M${w0},100 C${w0 + 30},94 ${w1 - 30},90 ${w1},94 C${w1 - 6},${bot - 10} ${mid + 18},${bot} ${mid},${bot} C${mid - 30},${bot} ${w0 + 4},${bot - 18} ${w0},100 Z`} fill="#3a0f0e" stroke={INK} strokeWidth={4.5} strokeLinejoin="round" />
      {v !== "O" ? <path d={`M${w0 + 8},101 C${w0 + 34},96 ${w1 - 30},92 ${w1 - 6},95 L${w1 - 10},112 C${w1 - 36},108 ${w0 + 34},112 ${w0 + 12},117 Z`} fill="#fbf6ec" /> : null}
      <path d={`M${mid - 34},${bot - 4} C${mid - 22},${bot - 30 * open - 6} ${mid + 30},${bot - 30 * open - 8} ${mid + 40},${bot - 6} Z`} fill="#d8707a" />
      <path d={`M${mid - 6},${bot - 22 * open} q2,10 0,16`} stroke="#b45360" strokeWidth={2.5} fill="none" opacity={0.7} />
    </g>
  );
};

export const PolishedHead: React.FC<{ v?: Viseme2; mood?: Mood2; blink?: boolean; look?: number }> = ({ v = "A", mood = "smile", blink = false, look = 0.7 }) => {
  const brow = { neutral: [0, 0], smile: [-4, -2], sad: [-14, 8], worried: [-16, 6], curious: [-10, 8], awe: [-14, -12], serious: [10, 0], calm: [-2, 2] }[mood];
  const lid = blink ? 1 : { neutral: 0.42, smile: 0.5, sad: 0.6, worried: 0.2, curious: 0.25, awe: 0.1, serious: 0.48, calm: 0.55 }[mood];
  const eye = (cx: number, cy: number, rx: number, ry: number, key: string) => (
    <g key={key}>
      <clipPath id={`h2eye${key}`}><ellipse cx={cx} cy={cy} rx={rx} ry={ry} /></clipPath>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#fcf9f2" />
      <g clipPath={`url(#h2eye${key})`}>
        <circle cx={cx + 6 + look * rx * 0.38} cy={cy + 3} r={ry * 0.62} fill="#3a2316" />
        <circle cx={cx + 6 + look * rx * 0.38} cy={cy + 3} r={ry * 0.34} fill="#0e0907" />
        <circle cx={cx + 10 + look * rx * 0.38} cy={cy - 3} r={ry * 0.15} fill="#fff" />
        {/* upper lid */}
        <path d={`M${cx - rx - 4},${cy - ry - 4} L${cx + rx + 4},${cy - ry - 4} L${cx + rx + 4},${cy - ry + 2 * ry * lid} C${cx + rx * 0.3},${cy - ry + 2 * ry * lid - 6} ${cx - rx * 0.5},${cy - ry + 2 * ry * lid - 4} ${cx - rx - 4},${cy - ry + 2 * ry * lid + 2} Z`} fill={SKIN} />
      </g>
      <path d={`M${cx - rx - 2},${cy - ry + 2 * ry * lid + 2} C${cx - rx * 0.5},${cy - ry + 2 * ry * lid - 4} ${cx + rx * 0.3},${cy - ry + 2 * ry * lid - 6} ${cx + rx + 2},${cy - ry + 2 * ry * lid}`} fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" />
      <path d={`M${cx - rx * 0.7},${cy + ry + 2} C${cx - rx * 0.2},${cy + ry + 7} ${cx + rx * 0.4},${cy + ry + 6} ${cx + rx * 0.8},${cy + ry}`} fill="none" stroke={SKIN_SHADE} strokeWidth={3} strokeLinecap="round" opacity={0.8} />
    </g>
  );
  return (
    <g>
      <defs>
        <radialGradient id="h2skinG" cx="32%" cy="30%" r="80%">
          <stop offset="0" stopColor={SKIN_LIT} />
          <stop offset="0.5" stopColor={SKIN} />
          <stop offset="1" stopColor={SKIN_SHADE} />
        </radialGradient>
        <radialGradient id="h2noseG" cx="35%" cy="28%" r="75%">
          <stop offset="0" stopColor="#eeb487" />
          <stop offset="0.6" stopColor={SKIN} />
          <stop offset="1" stopColor={SKIN_SHADE} />
        </radialGradient>
        <pattern id="h2stub" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(18)">
          <rect width="6" height="6" fill="none" />
          <rect x="1" y="0.5" width="1.4" height="3.2" rx="0.7" fill={BEARD} />
          <rect x="4" y="2.5" width="1.3" height="3" rx="0.6" fill={BEARD} />
        </pattern>
        <clipPath id="h2faceClip"><path d={FACE} /></clipPath>
      </defs>

      {/* Hair mass behind the head (silhouette), then clumps */}
      <path d="M-196,-90 C-226,-170 -214,-262 -160,-312 C-104,-362 4,-368 78,-340 C150,-312 196,-250 190,-176 C186,-136 164,-122 140,-130 L120,-176 C40,-190 -60,-188 -122,-166 L-150,-60 C-176,-50 -196,-66 -196,-90 Z" fill={HAIR} stroke={INK} strokeWidth={3} />
      {CLUMPS.map((c, i) => <Clump key={i} {...c} />)}

      {/* Ear (near side, screen-left) */}
      <path d="M-132,-52 C-170,-78 -212,-56 -210,-6 C-208,40 -178,70 -138,58" fill={SKIN} stroke={INK} strokeWidth={4} />
      <path d="M-146,-36 C-176,-48 -192,-26 -190,2 C-188,28 -170,42 -150,38" fill="none" stroke={SKIN_DEEP} strokeWidth={7} strokeLinecap="round" />
      <path d="M-160,-12 C-172,-2 -168,18 -156,22" fill="none" stroke={SKIN_DEEP} strokeWidth={5} strokeLinecap="round" />

      {/* Neck shadow seen behind the jaw */}
      {/* Face */}
      <path d={FACE} fill="url(#h2skinG)" />
      <g clipPath="url(#h2faceClip)">
        {/* Far-side shadow plane and under-cheekbone shadow */}
        <path d="M70,-190 C118,-120 128,-20 104,70 C96,110 80,140 60,170 L180,180 L180,-200 Z" fill={SKIN_SHADE} opacity={0.55} />
        <path d="M-20,30 C10,52 60,52 96,30 C80,60 40,72 -4,64 Z" fill={SKIN_SHADE} opacity={0.25} />
        {/* Stubble beard: jaw band from the ear down around the chin, cheeks and mouth area kept clear */}
        <path d="M-150,-24 C-146,40 -132,80 -110,110 C-80,150 -30,176 20,176 C70,176 108,140 126,80 C132,50 136,10 138,-20 L160,-20 L160,220 L-170,220 L-170,-24 Z
                 M-118,-10 C-112,40 -98,80 -72,108 C-56,124 -40,128 -30,124 C-44,96 -50,70 -50,40 C-50,10 -80,-6 -118,-10 Z" fill="#2a170e" opacity={0.42} fillRule="evenodd" />
        <path d="M-150,-24 C-146,40 -132,80 -110,110 C-80,150 -30,176 20,176 C70,176 108,140 126,80 C132,50 136,10 138,-20 L160,-20 L160,220 L-170,220 L-170,-24 Z
                 M-118,-10 C-112,40 -98,80 -72,108 C-56,124 -40,128 -30,124 C-44,96 -50,70 -50,40 C-50,10 -80,-6 -118,-10 Z" fill="url(#h2stub)" fillRule="evenodd" />
        <path d="M-60,150 C-20,186 50,186 96,140" fill="none" stroke={BEARD} strokeWidth={22} opacity={0.6} />
      </g>
      <path d={FACE} fill="none" stroke={INK} strokeWidth={4.5} />

      {/* Brows: thick, tapered, arched */}
      <path d={`M-132,${-92 + brow[1]} C-110,${-122 + brow[1]} -66,${-128 + brow[0]} -26,${-112 + brow[0]} C-34,${-104 + brow[0]} -70,${-108 + brow[0]} -126,${-80 + brow[1]} Z`} fill={HAIR} stroke={INK} strokeWidth={2} />
      <path d={`M14,${-114 + brow[0]} C46,${-132 + brow[1]} 92,${-128 + brow[1]} 114,${-104 + brow[1]} C92,${-110 + brow[1]} 52,${-112 + brow[1]} 18,${-102 + brow[0]} Z`} fill={HAIR} stroke={INK} strokeWidth={2} />

      {eye(-66, -44, 42, 27, "near")}
      {eye(62, -46, 36, 25, "far")}

      {/* Glasses: thin silver rectangles with depth */}
      <g fill="rgba(225,238,255,.08)">
        <rect x={-132} y={-92} width={122} height={90} rx={16} stroke={METAL_DARK} strokeWidth={9} />
        <rect x={6} y={-94} width={114} height={88} rx={16} stroke={METAL_DARK} strokeWidth={9} />
      </g>
      <g fill="none" stroke={METAL} strokeWidth={5}>
        <rect x={-132} y={-92} width={122} height={90} rx={16} />
        <rect x={6} y={-94} width={114} height={88} rx={16} />
        <path d="M-10,-62 C-4,-70 2,-70 6,-62" />
      </g>
      <path d="M-132,-76 L-184,-60" stroke={METAL_DARK} strokeWidth={8} strokeLinecap="round" />
      <path d="M-132,-76 L-184,-60" stroke={METAL} strokeWidth={4} strokeLinecap="round" />
      <path d="M-120,-86 h30 M18,-88 h26" stroke="#ffffff" strokeWidth={3} strokeLinecap="round" opacity={0.5} />

      {/* Nose: big, rounded, leaning toward screen-right */}
      <path d="M4,-36 C2,-6 -2,14 -6,28 C-12,52 4,66 30,66 C58,66 74,52 70,32 C66,14 48,6 34,4 C28,-14 20,-30 12,-40 Z" fill="url(#h2noseG)" stroke={INK} strokeWidth={4} />
      <path d="M-2,44 C6,58 20,62 30,58" fill="none" stroke={SKIN_DEEP} strokeWidth={4} strokeLinecap="round" />
      <path d="M44,52 q8,6 18,2" fill="none" stroke={SKIN_DEEP} strokeWidth={4} strokeLinecap="round" />
      <ellipse cx={28} cy={22} rx={10} ry={7} fill="#f6c39a" opacity={0.7} />

      {/* Moustache */}
      <path d="M-56,96 C-48,78 -20,70 8,76 C20,70 36,70 46,76 C70,72 92,80 98,96 C80,90 60,90 44,94 C28,90 14,90 4,94 C-16,90 -36,90 -56,96 Z" fill={BEARD} stroke={INK} strokeWidth={2.5} />
      <path d="M-40,90 l3,6 M-26,86 l2,7 M-12,84 l1,8 M30,84 l-1,8 M48,84 l-2,8 M66,86 l-3,7 M82,90 l-3,6" stroke="#3a2a22" strokeWidth={2} />

      <Mouth v={v} mood={mood} />
      {/* Chin patch */}
      <path d="M8,170 C14,158 30,154 42,160 C40,174 30,182 20,182 C12,180 8,176 8,170 Z" fill={BEARD} />

      {/* Fringe clumps over the forehead edge */}
      <Clump x={-96} y={-176} r={40} a={200} s={1} />
      <Clump x={-40} y={-192} r={44} a={150} s={-1} />
      <Clump x={22} y={-196} r={44} a={210} s={1} />
      <Clump x={82} y={-184} r={40} a={170} s={-1} />
    </g>
  );
};

/** Neck, high-collar charcoal zip jacket open over a cream tee. Drawn under the head at the same origin. */
export const Bust: React.FC = () => (
  <g>
    <defs>
      <linearGradient id="h2jacketG" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#37353d" />
        <stop offset="1" stopColor="#141317" />
      </linearGradient>
    </defs>
    {/* Neck */}
    <path d="M-62,130 L-66,236 C-30,252 30,252 70,236 L66,128 Z" fill={SKIN_SHADE} stroke={INK} strokeWidth={4} />
    <path d="M-62,140 C-20,170 30,172 66,150 L66,176 C30,196 -20,194 -62,170 Z" fill={SKIN_DEEP} opacity={0.5} />
    {/* Torso */}
    <path d="M-300,480 C-300,330 -230,270 -130,246 L-60,226 L0,292 L66,226 L140,246 C240,270 310,330 310,480 Z" fill="url(#h2jacketG)" stroke={INK} strokeWidth={4} />
    {/* Tee with crew neck */}
    <path d="M-60,234 C-30,268 40,270 72,234 L60,480 L-50,480 Z" fill="#efe8dc" stroke={INK} strokeWidth={3} />
    <path d="M-60,234 C-30,262 40,264 72,234" fill="none" stroke="#d8cfc0" strokeWidth={10} />
    {/* Stand-up collar wrapping the neck, open at the front */}
    <path d="M-118,150 C-126,214 -100,262 -58,284 L-46,236 C-72,214 -84,188 -82,150 Z" fill="#26252b" stroke={INK} strokeWidth={4} />
    <path d="M118,140 C126,206 104,258 70,282 L58,232 C80,210 88,182 86,140 Z" fill="#2c2b31" stroke={INK} strokeWidth={4} />
    <path d="M-82,150 C-60,140 70,134 86,140" fill="none" stroke={INK} strokeWidth={3} opacity={0.6} />
    {/* Zip edges */}
    <path d="M-52,284 L-44,480" stroke="#5a5862" strokeWidth={5} />
    <path d="M66,282 L58,480" stroke="#5a5862" strokeWidth={5} />
  </g>
);

export const Hero2Test: React.FC = () => (
  <AbsoluteFill style={{ background: "#1b1726", flexDirection: "row" }}>
    <Img src={staticFile("narrator/ref-3d.webp")} style={{ width: 1080, height: 1080 }} />
    <svg viewBox="0 0 1080 1080" width={1080} height={1080}>
      <rect width={1080} height={1080} fill="#1b1726" />
      <g transform="translate(560 520) scale(1.3)">
        <Bust />
        <PolishedHead v="A" mood="smile" look={0.7} />
      </g>
    </svg>
  </AbsoluteFill>
);

export const TraceTest: React.FC = () => (
  <AbsoluteFill style={{ background: "#111", flexDirection: "row" }}>
    <Img src={staticFile("narrator/logia-2d.png")} style={{ width: 1080, height: 1080 }} />
    <Img src={staticFile("narrator/logia-2d.svg")} style={{ width: 1080, height: 1080 }} />
  </AbsoluteFill>
);
