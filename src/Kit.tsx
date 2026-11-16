import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  random,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { HITLER_FACE } from "./data/hitler-face";
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";

export const FPS = 30;
export const W = 1080;
export const H = 1920;
export const GROUND = 1290;

const anton = loadAnton("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;
const inter = loadInter("normal", { weights: ["800"], subsets: ["latin", "latin-ext"] }).fontFamily;
const playfair = loadPlayfair("italic", { weights: ["600"], subsets: ["latin"] }).fontFamily;

export const FONTS = { anton, inter, playfair };

export const GOLD = "#ffc94d";
export const CRIMSON = "#d42a3a";

const smooth = Easing.bezier(0.45, 0, 0.2, 1);
const snap = Easing.bezier(0.16, 1, 0.3, 1);

export const useT = () => useCurrentFrame() / FPS;

export const prog = (t: number, a: number, b: number, ease = smooth) =>
  interpolate(t, [a, b], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });

export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

/* ---------- Poses ---------- */

export type Pose = {
  ls: number; // left shoulder (screen left), positive raises outward
  le: number;
  rs: number; // right shoulder, negative raises outward
  re: number;
  lh: number;
  lk: number;
  rh: number;
  rk: number;
  torso: number;
  head: number;
  drop: number; // lowers the whole body, for kneeling
  brow: number; // positive = angry
  smile: number;
};

export const IDLE: Pose = {
  ls: 8, le: -8, rs: -8, re: 8, lh: 4, lk: 0, rh: -4, rk: 0,
  torso: 0, head: 0, drop: 0, brow: 0, smile: 0,
};
export const LOOK_UP: Pose = { ...IDLE, head: -6, torso: -2, ls: 14, rs: -14 };
export const ARMS_CROSSED: Pose = { ...IDLE, ls: -18, le: -112, rs: 18, re: 112, brow: 0.7 };
export const POINT_UP: Pose = { ...IDLE, rs: -158, re: -8, ls: 10 };
export const OPEN_HANDS: Pose = { ...IDLE, ls: 52, le: 62, rs: -52, re: -62 };
export const SHRUG: Pose = { ...IDLE, ls: 38, le: 105, rs: -38, re: -105, head: 5 };
export const ANGRY: Pose = { ...IDLE, ls: 62, le: 28, rs: -62, re: -28, brow: 1, torso: 2 };
export const HEAD_DOWN: Pose = { ...IDLE, head: 10, torso: 3, ls: 4, rs: -4 };
export const REACH: Pose = { ...IDLE, rs: -118, re: -10, ls: 14, head: -3, smile: 0.6 };
export const ARMS_UP: Pose = { ...IDLE, ls: 148, le: 12, rs: -148, re: -12, head: -8, smile: 1 };
export const KNEEL: Pose = {
  ...IDLE, lh: 62, lk: -118, rh: -62, rk: 118, drop: 92,
  torso: 4, head: 14, ls: 22, le: -82, rs: -22, re: 82,
};
export const WRITE: Pose = { ...KNEEL, rs: -62, re: 72, ls: 42, le: 62, head: 18 };

/** Interpolate between pose keyframes given as [seconds, pose]. */
export const posed = (t: number, kfs: [number, Pose][]): Pose => {
  if (t <= kfs[0][0]) return kfs[0][1];
  for (let i = 0; i < kfs.length - 1; i++) {
    const [a, pa] = kfs[i];
    const [b, pb] = kfs[i + 1];
    if (t <= b) {
      const p = prog(t, a, b);
      const out = {} as Pose;
      (Object.keys(pa) as (keyof Pose)[]).forEach((k) => {
        out[k] = lerp(pa[k], pb[k], p);
      });
      return out;
    }
  }
  return kfs[kfs.length - 1][1];
};

/** Adds a walk cycle on top of any pose. */
export const walking = (pose: Pose, t: number, amt = 1, rate = 1.9): Pose => {
  const s = Math.sin(t * Math.PI * 2 * rate);
  const c = Math.cos(t * Math.PI * 2 * rate);
  return {
    ...pose,
    lh: lerp(pose.lh, 26 * s, amt),
    rh: lerp(pose.rh, -26 * s, amt),
    lk: lerp(pose.lk, -Math.max(0, -c) * 44, amt),
    rk: lerp(pose.rk, -Math.max(0, c) * 44, amt),
    ls: pose.ls - 20 * s * amt,
    rs: pose.rs + 20 * s * amt,
  };
};

/* ---------- Rigged character ---------- */

type Look = {
  skin: string; top: string; top2: string; leg: string; shoe: string; hair: string;
  face: boolean; hood?: boolean; beard?: string; coat?: boolean; robe?: boolean;
  scarf?: string; bald?: boolean;
  /** Upgraded rendering: soft form shading, sneaker soles, hoodie pocket, cheeks. */
  shade?: boolean; sole?: string; pocket?: boolean; blush?: boolean;
};

export const LOOKS: Record<string, Look> = {
  eli: {
    skin: "#c98a5e", top: "#c0222f", top2: "#8e1622", leg: "#22304f", shoe: "#f2efe8",
    hair: "#1a1310", face: true, hood: true,
  },
  guide: {
    skin: "#d9a47f", top: "#343a48", top2: "#242833", leg: "#242833", shoe: "#15120f",
    hair: "#d4d0c8", beard: "#d4d0c8", face: true, coat: true, scarf: GOLD,
  },
  paul: {
    skin: "#b9825a", top: "#b39463", top2: "#8f7649", leg: "#b39463", shoe: "#4a3622",
    hair: "#2a1c12", beard: "#2a1c12", face: true, robe: true,
  },
  shadow: {
    skin: "#07070b", top: "#07070b", top2: "#07070b", leg: "#07070b", shoe: "#07070b",
    hair: "#07070b", face: false,
  },
  hitler: {
    skin: "#f4f1e8", top: "#f4f1e8", top2: "#f4f1e8", leg: "#f4f1e8", shoe: "#f4f1e8",
    hair: "#f4f1e8", face: false,
  },
  prisoner: {
    skin: "#23262c", top: "#23262c", top2: "#1b1d22", leg: "#1b1d22", shoe: "#101114",
    hair: "#101114", face: false,
  },
  zach: {
    skin: "#b98258", top: "#6b2c7a", top2: "#4b1d57", leg: "#4b1d57", shoe: "#3a2618",
    hair: "#1d140e", beard: "#1d140e", face: true, robe: true, scarf: GOLD,
  },
  jesus: {
    skin: "#c08a5e", top: "#f2ede2", top2: "#ddd3c0", leg: "#f2ede2", shoe: "#5b3d24",
    hair: "#3a2414", beard: "#3a2414", face: true, robe: true, scarf: "#a8323e",
  },
  seeker: {
    skin: "#b97a50", top: "#27325c", top2: "#1b2444", leg: "#141a2e", shoe: "#f4f1ea",
    hair: "#120c09", face: true, hood: true, shade: true, sole: GOLD, pocket: true, blush: true,
  },
  friend: {
    skin: "#8d5a3b", top: "#e2b04a", top2: "#b8892f", leg: "#2c2a35", shoe: "#ffffff",
    hair: "#0d0907", face: true, shade: true, sole: "#ff5c8a", blush: true,
  },
  elijah: {
    skin: "#a8714b", top: "#7b6448", top2: "#5c4932", leg: "#7b6448", shoe: "#3a2a1a",
    hair: "#cfc8bb", beard: "#cfc8bb", face: true, robe: true, scarf: "#3b2c1e", shade: true,
  },
  buddy: {
    skin: "#d6a07a", top: "#2f8f6b", top2: "#226b50", leg: "#1d2230", shoe: "#ffffff",
    hair: "#5a3a22", face: true, hood: true, shade: true, sole: "#3dd6ff", blush: true,
  },
  preacher: {
    skin: "#c48d63", top: "#1d1f26", top2: "#14161b", leg: "#14161b", shoe: "#0b0b0d",
    hair: "#2a2018", face: true, coat: true, scarf: CRIMSON, shade: true,
  },
};

const Limb: React.FC<{
  x: number; y: number; a: number; b: number; l1: number; l2: number;
  w: number; c: string; end: (l: number) => React.ReactNode;
}> = ({ x, y, a, b, l1, l2, w, c, end }) => (
  <g transform={`translate(${x} ${y}) rotate(${a})`}>
    <line x2={0} y2={l1} stroke={c} strokeWidth={w} strokeLinecap="round" />
    <g transform={`translate(0 ${l1}) rotate(${b})`}>
      <line x2={0} y2={l2} stroke={c} strokeWidth={w * 0.86} strokeLinecap="round" />
      {end(l2)}
    </g>
  </g>
);

export const Character: React.FC<{
  look: keyof typeof LOOKS;
  pose: Pose;
  x: number;
  scale?: number;
  ground?: number;
  flip?: boolean;
  talk?: number;
  rim?: string;
  seed?: number;
  t: number;
  shadow?: boolean;
}> = ({ look, pose, x, scale = 1, ground = GROUND, flip, talk = 0, rim, seed = 1, t, shadow = true }) => {
  const L = LOOKS[look];
  const breathe = Math.sin(t * 2.1 + seed) * 2.4;
  const blink = (t + seed * 0.7) % 3.4 < 0.11;
  const y = ground - 195 * scale + pose.drop * scale;
  const hand = (l: number) => <circle cy={l + 6} r={15} fill={L.skin} />;
  const foot = (l: number) => (
    <g>
      <ellipse cx={flip ? -10 : 10} cy={l + 8} rx={26} ry={13} fill={L.shoe} />
      {L.sole ? <rect x={-16} y={l + 15} width={52} height={6} rx={3} fill={L.sole} transform={flip ? "scale(-1 1)" : undefined} /> : null}
    </g>
  );
  const shadeId = `sh${look}`;
  if (look === "hitler") {
    const stickEnd = () => null;
    return (
      <g>
        {shadow ? <ellipse cx={x} cy={ground + 6} rx={90 * scale} ry={14 * scale} fill="#000" opacity={0.42} /> : null}
        <g
          transform={`translate(${x} ${y}) scale(${scale})`}
          style={rim ? { filter: `drop-shadow(0 0 9px ${rim}) drop-shadow(0 0 2px ${rim})` } : undefined}
        >
          <Limb x={0} y={0} a={pose.lh + 9} b={pose.lk} l1={95} l2={100} w={16} c={L.leg} end={stickEnd} />
          <Limb x={0} y={0} a={pose.rh - 9} b={pose.rk} l1={95} l2={100} w={16} c={L.leg} end={stickEnd} />
          <g transform={`rotate(${pose.torso}) translate(0 ${breathe * 0.5})`}>
            <line y1={0} y2={-170} stroke={L.top} strokeWidth={16} strokeLinecap="round" />
            <Limb x={0} y={-140} a={pose.ls + 24} b={pose.le} l1={82} l2={82} w={15} c={L.top} end={stickEnd} />
            <Limb x={0} y={-140} a={pose.rs - 24} b={pose.re} l1={82} l2={82} w={15} c={L.top} end={stickEnd} />
            <g transform={`translate(0 -170) rotate(${pose.head + Math.sin(t * 3.4 + seed) * 4}) translate(0 -92)`}>
              <clipPath id="hitlerFace"><ellipse rx={90} ry={112} /></clipPath>
              <ellipse rx={95} ry={117} fill={L.top} />
              <image href={HITLER_FACE} x={-123} y={-126} width={247} height={254} clipPath="url(#hitlerFace)" preserveAspectRatio="none" />
            </g>
          </g>
        </g>
      </g>
    );
  }
  return (
    <g>
      {shadow ? (
        <ellipse cx={x} cy={ground + 6} rx={120 * scale} ry={16 * scale} fill="#000" opacity={0.42} />
      ) : null}
      <g
        transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`}
        style={rim ? { filter: `drop-shadow(0 0 9px ${rim}) drop-shadow(0 0 2px ${rim})` } : undefined}
      >
        <Limb x={-24} y={0} a={pose.lh} b={pose.lk} l1={95} l2={100} w={38} c={L.leg} end={foot} />
        <Limb x={24} y={0} a={pose.rh} b={pose.rk} l1={95} l2={100} w={38} c={L.leg} end={foot} />
        <g transform={`rotate(${pose.torso}) translate(0 ${breathe * 0.5})`}>
          {L.robe ? <path d="M-54,-40 L54,-40 L84,162 Q0,178 -84,162 Z" fill={L.top2} /> : null}
          {L.coat ? <path d="M-52,-30 L52,-30 L66,128 L-66,128 Z" fill={L.top2} /> : null}
          <Limb x={-58} y={-158} a={pose.ls} b={pose.le} l1={82} l2={82} w={32} c={L.top2} end={hand} />
          {L.hood ? <ellipse cy={-182} rx={66} ry={36} fill={L.top2} /> : null}
          <path d="M-62,-172 Q0,-192 62,-172 L48,12 Q0,24 -48,12 Z" fill={L.top} />
          {L.shade ? (
            <g>
              <defs>
                <linearGradient id={shadeId} x1="0" y1="0" x2="1" y2="0.3">
                  <stop offset="0" stopColor="#fff" stopOpacity={0.16} />
                  <stop offset="0.45" stopColor="#fff" stopOpacity={0} />
                  <stop offset="1" stopColor="#000" stopOpacity={0.38} />
                </linearGradient>
              </defs>
              <path d="M-62,-172 Q0,-192 62,-172 L48,12 Q0,24 -48,12 Z" fill={`url(#${shadeId})`} />
              {L.robe ? <path d="M-54,-40 L54,-40 L84,162 Q0,178 -84,162 Z" fill={`url(#${shadeId})`} opacity={0.8} /> : null}
            </g>
          ) : null}
          {L.pocket ? <path d="M-34,-60 L34,-60 L42,-14 L-42,-14 Z" fill={L.top2} opacity={0.9} /> : null}
          {L.hood ? (
            <g>
              <path d="M-32,-46 L32,-46 L40,-6 L-40,-6 Z" fill={L.top2} />
              <path d="M-13,-170 L-16,-124 M13,-170 L16,-124" stroke="#f2efe8" strokeWidth={5} strokeLinecap="round" />
            </g>
          ) : null}
          {L.scarf ? <path d="M-34,-182 Q0,-158 34,-182 L24,-148 L14,-82 L-8,-82 L-2,-148 Z" fill={L.scarf} /> : null}
          <Limb x={58} y={-158} a={pose.rs} b={pose.re} l1={82} l2={82} w={32} c={L.top2} end={hand} />
          <g transform={`translate(0 -192) rotate(${pose.head}) translate(0 ${breathe * 0.3})`}>
            <rect x={-16} y={-22} width={32} height={30} fill={L.skin} rx={10} />
            <ellipse cy={-62} rx={52} ry={58} fill={L.skin} />
            {L.shade ? <ellipse cx={14} cy={-56} rx={40} ry={52} fill="#000" opacity={0.12} /> : null}
            {L.blush ? (
              <g fill="#ff7a7a" opacity={0.28}>
                <ellipse cx={-30} cy={-42} rx={10} ry={6} />
                <ellipse cx={30} cy={-42} rx={10} ry={6} />
              </g>
            ) : null}
            <path d="M-54,-66 Q-58,-126 0,-126 Q58,-126 54,-66 Q30,-96 0,-92 Q-30,-96 -54,-66 Z" fill={L.hair} />
            {L.beard ? <path d="M-50,-52 Q-46,6 0,10 Q46,6 50,-52 Q24,-24 0,-26 Q-24,-24 -50,-52 Z" fill={L.beard} /> : null}
            {L.face ? (
              <g>
                {blink ? (
                  <path d="M-30,-62 h18 M12,-62 h18" stroke="#120d0a" strokeWidth={5} strokeLinecap="round" />
                ) : (
                  <g fill="#120d0a">
                    <ellipse cx={-21} cy={-62} rx={7.5} ry={9.5} />
                    <ellipse cx={21} cy={-62} rx={7.5} ry={9.5} />
                    <circle cx={-18.5} cy={-65} r={2.4} fill="#fff" />
                    <circle cx={23.5} cy={-65} r={2.4} fill="#fff" />
                  </g>
                )}
                <g stroke={look === "guide" ? L.hair : "#120d0a"} strokeWidth={6} strokeLinecap="round">
                  <line x1={-32} x2={-11} y1={-81 - 3 * pose.brow} y2={-81 + 7 * pose.brow} />
                  <line x1={32} x2={11} y1={-81 - 3 * pose.brow} y2={-81 + 7 * pose.brow} />
                </g>
                {talk > 0.05 ? (
                  <ellipse cy={-28} rx={12} ry={2 + talk * 11} fill="#3b1512" />
                ) : (
                  <path
                    d={`M-13,-30 Q0,${-30 + 10 * pose.smile - 5 * pose.brow} 13,-30`}
                    fill="none"
                    stroke={look === "guide" ? "#6b3a30" : "#3b1512"}
                    strokeWidth={5}
                    strokeLinecap="round"
                  />
                )}
              </g>
            ) : null}
          </g>
        </g>
      </g>
    </g>
  );
};

/** Mouth openness from the voiceover's word timings. Time is voiceover seconds. */
export const talkAt = (words: Word[], t: number) => {
  const on = words.some((w) => t >= w.start && t <= w.end);
  return on ? 0.45 + 0.55 * Math.abs(Math.sin(t * 13)) : 0;
};

/* ---------- Backgrounds (layered for parallax) ---------- */

const Dust: React.FC<{ t: number; n?: number; c: string; rise?: number; seed?: string }> = ({
  t, n = 34, c, rise = 22, seed = "d",
}) => (
  <g>
    {Array.from({ length: n }).map((_, i) => {
      const x = random(`${seed}x${i}`) * W;
      const y0 = random(`${seed}y${i}`) * H;
      const r = 1.5 + random(`${seed}r${i}`) * 4;
      const sp = 0.4 + random(`${seed}s${i}`);
      const y = ((y0 - t * rise * sp) % H + H) % H;
      return (
        <circle
          key={i}
          cx={x + Math.sin(t * sp + i) * 22}
          cy={y}
          r={r}
          fill={c}
          opacity={0.25 + 0.55 * Math.abs(Math.sin(t * sp * 1.4 + i))}
        />
      );
    })}
  </g>
);

const Layer: React.FC<{ d: number; t: number; drift: number; children: React.ReactNode }> = ({
  d, t, drift, children,
}) => <g transform={`translate(${-t * drift * d} 0)`}>{children}</g>;

const Floor: React.FC<{ from: string; to: string }> = ({ from, to }) => {
  const id = `f${from.slice(1)}${to.slice(1)}`;
  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      <rect y={GROUND - 40} width={W} height={H} fill={`url(#${id})`} />
    </g>
  );
};

const Sky: React.FC<{ stops: [number, string][]; id: string }> = ({ stops, id }) => (
  <g>
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        {stops.map(([o, c]) => (
          <stop key={o} offset={o} stopColor={c} />
        ))}
      </linearGradient>
    </defs>
    <rect width={W} height={H} fill={`url(#${id})`} />
  </g>
);

export const Library: React.FC<{ t: number }> = ({ t }) => {
  const shelf = (key: string, x: number, w: number, top: number, bottom: number, tone: number) => {
    const rows: React.ReactNode[] = [];
    for (let row = 0, y = top; y < bottom; row++, y += 118) {
      let cx = x + 8;
      let i = 0;
      while (cx < x + w - 14) {
        const bw = 14 + random(`${key}w${row}${i}`) * 22;
        const bh = 62 + random(`${key}h${row}${i}`) * 38;
        const hue = random(`${key}c${row}${i}`);
        const col = hue < 0.5 ? "#1f2d57" : hue < 0.8 ? "#5b1b2a" : "#3a3320";
        rows.push(<rect key={`${row}-${i}`} x={cx} y={y + 104 - bh} width={bw} height={bh} fill={col} opacity={tone} rx={2} />);
        cx += bw + 3;
        i++;
      }
      rows.push(<rect key={`b${row}`} x={x} y={y + 104} width={w} height={14} fill="#0a0f24" />);
    }
    return <g key={key}>{rows}</g>;
  };
  return (
    <g>
      <Sky id="lib" stops={[[0, "#050919"], [0.55, "#0e1a3f"], [1, "#0a1022"]]} />
      <Layer d={0.4} t={t} drift={7}>
        <rect x={440} y={0} width={280} height={GROUND} fill="#7fa4ff" opacity={0.08} />
        <circle cx={580} cy={330} r={120} fill="#cfe0ff" opacity={0.75} />
        <circle cx={580} cy={330} r={250} fill="#9cbcff" opacity={0.12} />
        {shelf("back1", -60, 320, 120, GROUND - 40, 0.5)}
        {shelf("back2", 880, 320, 120, GROUND - 40, 0.5)}
      </Layer>
      <Layer d={1} t={t} drift={7}>
        {shelf("front1", -130, 300, 40, GROUND - 40, 0.95)}
        {shelf("front2", 980, 300, 40, GROUND - 40, 0.95)}
      </Layer>
      <Floor from="#141d3b" to="#050814" />
      <path d={`M430,${GROUND - 40} L650,${GROUND - 40} L860,${GROUND + 60} L220,${GROUND + 60} Z`} fill={GOLD} opacity={0.14} />
      <Dust t={t} c="#bcd2ff" />
    </g>
  );
};

export const Ruins: React.FC<{ t: number; glow?: number }> = ({ t, glow = 1 }) => {
  const skyline = (key: string, base: number, tall: number, fill: string) => {
    let x = -160;
    let d = `M-160,${GROUND}`;
    let i = 0;
    while (x < W + 300) {
      const w = 80 + random(`${key}w${i}`) * 130;
      const h = base + random(`${key}h${i}`) * tall;
      const j1 = random(`${key}a${i}`) * 90;
      const j2 = random(`${key}b${i}`) * 70;
      d += ` L${x},${GROUND - h + j1} L${x + w * 0.3},${GROUND - h} L${x + w * 0.5},${GROUND - h + j2} L${x + w * 0.8},${GROUND - h + j1 * 0.4} L${x + w},${GROUND - h + j2 + 40}`;
      x += w;
      i++;
    }
    d += ` L${x},${GROUND} Z`;
    return <path d={d} fill={fill} />;
  };
  return (
    <g>
      <Sky id="rui" stops={[[0, "#120808"], [0.32, "#47130d"], [0.6, "#c2481a"], [0.72, "#ee8a2c"], [1, "#2a0d08"]]} />
      <circle cx={640} cy={760} r={190} fill="#ffc77a" opacity={0.35 * glow} />
      <Layer d={0.25} t={t} drift={12}>{skyline("far", 240, 240, "#6d2415")}</Layer>
      <Layer d={0.55} t={t} drift={12}>{skyline("mid", 150, 280, "#34110c")}</Layer>
      <Layer d={1} t={t} drift={12}>{skyline("near", 40, 190, "#130807")}</Layer>
      <Floor from="#150a08" to="#050303" />
      <Dust t={t} c="#ffb066" rise={64} n={60} seed="emb" />
    </g>
  );
};

export const Cell: React.FC<{ t: number; warm?: number }> = ({ t, warm = 0 }) => {
  const stones: React.ReactNode[] = [];
  for (let r = 0; r < 16; r++) {
    for (let c = -1; c < 7; c++) {
      const x = c * 190 + (r % 2 ? 95 : 0);
      const y = r * 80;
      const v = random(`st${r}${c}`);
      stones.push(<rect key={`${r}-${c}`} x={x + 3} y={y + 3} width={184} height={74} rx={7} fill={v > 0.5 ? "#23272f" : "#1c2027"} />);
    }
  }
  const beam = interpolate(warm, [0, 1], [0.13, 0.42]);
  return (
    <g>
      <rect width={W} height={H} fill="#0e1014" />
      <Layer d={0.5} t={t} drift={5}>{stones}</Layer>
      <rect x={420} y={230} width={240} height={230} rx={8} fill="#c6d3e6" opacity={interpolate(warm, [0, 1], [0.32, 0.9])} />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={452 + i * 56} y={224} width={15} height={242} fill="#090a0d" />
      ))}
      <Floor from="#1b1e24" to="#07080a" />
      <path d={`M430,460 L650,460 L920,${GROUND + 120} L170,${GROUND + 120} Z`} fill={GOLD} opacity={beam} />
      <Dust t={t} c="#e6edf8" n={26} rise={10} />
    </g>
  );
};

export const CrossShape: React.FC<{ x: number; y: number; s?: number; glow?: number; c?: string }> = ({
  x, y, s = 1, glow = 1, c = "#160b08",
}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <circle cy={-160} r={270} fill={GOLD} opacity={0.22 * glow} style={{ filter: "blur(30px)" }} />
    <circle cy={-160} r={150} fill="#fff1c7" opacity={0.3 * glow} style={{ filter: "blur(24px)" }} />
    <rect x={-20} y={-430} width={40} height={430} rx={5} fill={c} />
    <rect x={-130} y={-320} width={260} height={38} rx={5} fill={c} />
  </g>
);

export const Hill: React.FC<{ t: number; rise?: number; cross?: number }> = ({ t, rise = 1, cross = 1 }) => (
  <g>
    <Sky id="hil" stops={[[0, "#25051a"], [0.3, "#7b1626"], [0.5, "#df5a2e"], [0.63, "#ffc261"], [1, "#ffdf9c"]]} />
    <g transform={`rotate(${t * 2} 540 800)`} opacity={0.2 * rise}>
      {Array.from({ length: 14 }).map((_, i) => (
        <path key={i} transform={`rotate(${i * (360 / 14)} 540 800)`} d="M540,800 L500,-500 L580,-500 Z" fill="#fff0c0" />
      ))}
    </g>
    <circle cx={540} cy={800} r={lerp(130, 220, rise)} fill="#fff4cf" opacity={0.92} />
    <Layer d={0.3} t={t} drift={7}>
      <path d={`M-200,1000 Q240,830 620,950 T1400,900 L1400,${GROUND} L-200,${GROUND} Z`} fill="#7a2a22" />
    </Layer>
    <path d={`M-60,1110 Q260,870 540,860 Q820,870 1140,1110 L1140,1300 L-60,1300 Z`} fill="#2c0f10" />
    <g opacity={cross}><CrossShape x={540} y={872} s={1.05} glow={rise} /></g>
    <Floor from="#1c0a0b" to="#080304" />
    <Dust t={t} c="#fff0c0" n={28} rise={16} seed="hd" />
  </g>
);

export const Void: React.FC<{ t: number; tint?: string; seed?: string }> = ({ t, tint = "#3a0a12", seed = "v" }) => (
  <g>
    <defs>
      <radialGradient id={`v${seed}`} cx="50%" cy="40%" r="70%">
        <stop offset="0" stopColor={tint} />
        <stop offset="1" stopColor="#040306" />
      </radialGradient>
    </defs>
    <rect width={W} height={H} fill={`url(#v${seed})`} />
    <Floor from="#0b0709" to="#030204" />
    <path d={`M360,0 L720,0 L920,${GROUND + 40} L160,${GROUND + 40} Z`} fill="#fff" opacity={0.05} />
    <Dust t={t} c="#ffd6c8" n={22} rise={14} seed={seed} />
  </g>
);

export const Gate: React.FC<{ x: number; y: number; closed: number; open?: boolean }> = ({ x, y, closed }) => {
  const halfW = 190;
  const shut = lerp(0.14, 1, closed);
  const bars = (dir: number) => (
    <g transform={`translate(${dir * 192} 0) scale(${dir * -shut} 1)`}>
      {Array.from({ length: 6 }).map((_, i) => (
        <rect key={i} x={i * 32} y={-520} width={12} height={520} fill="#fff2c9" rx={5} />
      ))}
      <rect x={0} y={-400} width={190} height={12} fill="#fff2c9" />
      <rect x={0} y={-120} width={190} height={12} fill="#fff2c9" />
    </g>
  );
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cy={-290} rx={380} ry={430} fill={GOLD} opacity={0.2} style={{ filter: "blur(40px)" }} />
      <rect x={-halfW} y={-520} width={halfW * 2} height={520} fill="#fff7dc" opacity={0.86} />
      {bars(1)}
      {bars(-1)}
      <rect x={-232} y={-566} width={44} height={566} fill="#d6a437" rx={6} />
      <rect x={188} y={-566} width={44} height={566} fill="#d6a437" rx={6} />
      <path d="M-240,-560 Q0,-720 240,-560 Z" fill="#d6a437" />
    </g>
  );
};

export const Desk: React.FC<{ x: number; t: number }> = ({ x, t }) => {
  const flick = 0.85 + Math.sin(t * 17) * 0.05 + Math.sin(t * 7) * 0.05;
  return (
    <g transform={`translate(${x} ${GROUND})`}>
      <ellipse cx={200} cy={-250} rx={320} ry={260} fill="#ffcf7a" opacity={0.2 * flick} style={{ filter: "blur(40px)" }} />
      <rect x={-250} y={-180} width={560} height={26} rx={4} fill="#22140c" />
      <rect x={-230} y={-154} width={26} height={154} fill="#170d07" />
      <rect x={260} y={-154} width={26} height={154} fill="#170d07" />
      <rect x={-40} y={-190} width={150} height={10} fill="#efe5cc" transform="rotate(-2)" />
      <rect x={228} y={-300} width={10} height={122} fill="#3a2b1a" />
      <path d="M180,-300 L286,-300 L262,-344 L204,-344 Z" fill="#1e3a26" />
      <circle cx={233} cy={-290} r={13} fill="#fff1c4" opacity={flick} />
    </g>
  );
};

export const Door: React.FC<{ x: number; open: number }> = ({ x, open }) => (
  <g transform={`translate(${x} ${GROUND})`}>
    <ellipse cy={-280} rx={260} ry={340} fill={GOLD} opacity={0.34 * open} style={{ filter: "blur(36px)" }} />
    <rect x={-122} y={-540} width={244} height={540} fill="#fff4cf" />
    <g transform={`translate(-122 0) scale(${lerp(1, 0.18, open)} 1)`}>
      <rect y={-540} width={244} height={540} fill="#4b2a18" />
      <rect x={24} y={-510} width={196} height={210} fill="#3b2012" rx={4} />
      <rect x={24} y={-260} width={196} height={230} fill="#3b2012" rx={4} />
    </g>
    <path d="M-140,0 L-140,-558 L140,-558 L140,0" fill="none" stroke="#1d110b" strokeWidth={30} />
  </g>
);

export const Hourglass: React.FC<{ x: number; y: number; p: number; s?: number }> = ({ x, y, p, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-110,-190 L110,-190 Q110,-70 12,0 Q110,70 110,190 L-110,190 Q-110,70 -12,0 Q-110,-70 -110,-190 Z" fill="#fff" opacity={0.12} stroke="#f3e7c6" strokeWidth={7} />
    <clipPath id="hgT"><path d="M-104,-184 L104,-184 Q104,-70 9,0 L-9,0 Q-104,-70 -104,-184 Z" /></clipPath>
    <clipPath id="hgB"><path d="M-9,0 L9,0 Q104,70 104,184 L-104,184 Q-104,70 -9,0 Z" /></clipPath>
    <rect clipPath="url(#hgT)" x={-110} y={lerp(-140, 0, p)} width={220} height={200} fill={GOLD} />
    <rect clipPath="url(#hgB)" x={-110} y={lerp(184, 50, p)} width={220} height={200} fill={GOLD} />
    <rect x={-2.5} y={0} width={5} height={186} fill={GOLD} opacity={p < 0.98 ? 1 : 0} />
    <rect x={-132} y={-206} width={264} height={22} rx={6} fill="#c79a39" />
    <rect x={-132} y={184} width={264} height={22} rx={6} fill="#c79a39" />
  </g>
);

/* ---------- Text ---------- */

const CamContext = React.createContext<{ zoom: number; x: number; y: number } | null>(null);

export const Stage: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const cam = React.useContext(CamContext);
  const style: React.CSSProperties = { position: "absolute", inset: 0 };
  if (cam) {
    style.transformOrigin = "0 0";
    style.transform = `translate(${cam.x}px, ${cam.y}px) scale(${cam.zoom})`;
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={style}>
      {children}
    </svg>
  );
};

/** A framing inside a scene: [seconds, zoom, focus x, focus y], focus as a fraction of the frame. */
export type Shot = [number, number, number?, number?];

/**
 * One beat of the edit: fades in and out with a slow camera push, or with `cut`, `enter` or `shots` hard-cuts between framings.
 * With `xf` (seconds) the scene instead dissolves in over the previous one, which plays on underneath for that long,
 * and any change of framing glides rather than cuts.
 */
export const Scene: React.FC<{
  from: number; to: number; children: React.ReactNode; push?: number;
  cut?: boolean; enter?: "whip" | "flash"; shots?: Shot[]; shakes?: [number, number][]; xf?: number;
}> = ({ from, to, children, push = 0.05, cut, enter, shots, shakes, xf }) => {
  const a = Math.round(from * FPS);
  const b = Math.round(to * FPS);
  const tail = xf ? Math.round(0.7 * FPS) : 0;
  return (
    <Sequence from={a} durationInFrames={b - a + tail} name={`${from}-${to}`}>
      {cut || enter || shots || xf ? (
        <CutInner frames={b - a} push={push} enter={enter} shots={shots ?? [[0, 1]]} shakes={shakes ?? []} xf={xf}>{children}</CutInner>
      ) : (
        <SceneInner frames={b - a} push={push}>{children}</SceneInner>
      )}
    </Sequence>
  );
};

const SceneInner: React.FC<{ frames: number; push: number; children: React.ReactNode }> = ({ frames, push, children }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 5, frames - 5, frames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ opacity: o, scale: String(interpolate(f, [0, frames], [1, 1 + push])), transformOrigin: "50% 58%" }}>
      {children}
    </AbsoluteFill>
  );
};

const CutInner: React.FC<{
  frames: number; push: number; enter?: "whip" | "flash"; shots: Shot[]; shakes: [number, number][]; xf?: number; children: React.ReactNode;
}> = ({ frames, push, enter, shots, shakes, xf, children }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const i = shots.reduce((acc, s, n) => (t >= s[0] ? n : acc), 0);
  const [at, base, fx = 0.5, fy = 0.5] = shots[i];
  let zoom: number, fxx: number, fyy: number;
  if (xf && i > 0) {
    // Glide from the previous framing to this one.
    const [, pBase, pfx = 0.5, pfy = 0.5] = shots[i - 1];
    const g = prog(t - at, 0, 0.6);
    zoom = lerp(pBase, base, g);
    fxx = lerp(pfx, fx, g);
    fyy = lerp(pfy, fy, g);
  } else {
    // Each framing lands with a quick settle, then keeps drifting in so no shot sits still.
    zoom = base * (1 + (i > 0 ? 0.05 * (1 - prog(t - at, 0, 0.14, snap)) : 0));
    fxx = fx;
    fyy = fy;
  }
  // Fade in over the previous scene, and fade out quickly under the next one so their text never doubles up.
  const dissolve = xf ? prog(f, 0, xf * FPS) * (1 - prog(f, frames, frames + 0.3 * FPS)) : 1;
  zoom *= (1 + push * (f / frames)) * (xf ? lerp(1.04, 1, dissolve) : 1);
  const clamp = (v: number, size: number) => Math.min(0, Math.max(size - size * zoom, v));
  let x = clamp(W / 2 - fxx * W * zoom, W);
  let y = clamp(H / 2 - fyy * H * zoom, H);
  shakes.forEach(([sAt, amp]) => {
    const d = t - sAt;
    if (d >= 0 && d < 0.4) {
      const k = amp * (1 - d / 0.4);
      x += Math.sin(f * 2.3) * k;
      y += Math.cos(f * 3.1) * k;
    }
  });
  const whip = enter === "whip" ? 1 - prog(f, 0, 5, snap) : 0;
  const flash = enter === "flash" ? 1 - prog(f, 0, 5) : 0;
  return (
    <AbsoluteFill style={{ translate: `${whip * W}px 0px`, opacity: dissolve, filter: whip > 0.01 ? `blur(${whip * 26}px)` : dissolve < 0.99 ? `blur(${(1 - dissolve) * 8}px)` : undefined }}>
      <CamContext.Provider value={{ zoom, x, y }}>{children}</CamContext.Provider>
      {flash > 0 ? <AbsoluteFill style={{ background: "#fff", opacity: flash * 0.9 }} /> : null}
    </AbsoluteFill>
  );
};

/** Hook / beat text in the reserved upper slot, below Instagram's top controls. */
export const Headline: React.FC<{
  lines: (string | [string, string])[];
  at?: number; size?: number; top?: number; kinetic?: boolean;
}> = ({ lines, at = 0, size = 128, top = 260, kinetic }) => {
  const t = useT();
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: top, paddingLeft: 70, paddingRight: 70 }}>
      {lines.map((line, i) => {
        const [text, color] = Array.isArray(line) ? line : [line, "#fff"];
        const p = prog(t, at + i * 0.13, at + i * 0.13 + 0.28, snap);
        if (kinetic) {
          // Each line rises out of a mask, sharpening and tightening as it lands, then keeps a slow drift.
          const q = prog(t, at + i * 0.11, at + i * 0.11 + 0.42, snap);
          return (
            <div key={i} style={{ overflow: "hidden", paddingBottom: 10, marginBottom: -10 }}>
              <div
                style={{
                  fontFamily: anton,
                  fontSize: size,
                  lineHeight: 1.1,
                  color,
                  textAlign: "center",
                  textTransform: "uppercase",
                  letterSpacing: lerp(16, 1, q),
                  translate: `0 ${lerp(105, 0, q)}%`,
                  filter: `blur(${lerp(10, 0, q)}px)`,
                  scale: String(1 + 0.03 * prog(t, at + 0.4, at + 3.4)),
                  textShadow: color === "#fff" ? "0 6px 0 rgba(0,0,0,.55), 0 0 44px rgba(0,0,0,.75)" : `0 6px 0 rgba(0,0,0,.55), 0 0 36px ${color}66`,
                }}
              >
                {text}
              </div>
            </div>
          );
        }
        return (
          <div
            key={i}
            style={{
              fontFamily: anton,
              fontSize: size,
              lineHeight: 1.1,
              color,
              textAlign: "center",
              textTransform: "uppercase",
              letterSpacing: 1,
              opacity: p,
              scale: String(lerp(1.28, 1, p)),
              textShadow: "0 6px 0 rgba(0,0,0,.55), 0 0 44px rgba(0,0,0,.75)",
            }}
          >
            {text}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export const Verse: React.FC<{ text: string; cite: string; at?: number; top?: number }> = ({ text, cite, at = 0, top = 280 }) => {
  const t = useT();
  const p = prog(t, at, at + 0.5, snap);
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: top, paddingLeft: 90, paddingRight: 90 }}>
      <div style={{ opacity: p, translate: `0 ${lerp(24, 0, p)}px`, textAlign: "center", background: "rgba(5,4,8,.62)", borderRadius: 28, padding: "38px 44px" }}>
        <div style={{ fontFamily: playfair, fontSize: 66, lineHeight: 1.2, color: "#fff6dc" }}>{text}</div>
        <div style={{ fontFamily: inter, fontWeight: 800, fontSize: 34, color: GOLD, marginTop: 20, letterSpacing: 2 }}>{cite}</div>
      </div>
    </AbsoluteFill>
  );
};

export type Word = { text: string; start: number; end: number; brk?: boolean };

const chunk = (words: Word[]) => {
  const out: Word[][] = [];
  let cur: Word[] = [];
  const phrased = words.some((w) => w.brk);
  words.forEach((w, i) => {
    cur.push(w);
    const next = words[i + 1];
    const stop = phrased ? w.brk : /[.?!:,]$/.test(w.text) || (next && next.start - w.end > 0.35) || cur.length >= 4;
    if (stop) {
      out.push(cur);
      cur = [];
    }
  });
  if (cur.length) out.push(cur);
  return out;
};

/** Word-by-word captions, in a slot clear of the Reels buttons and description. */
export const Captions: React.FC<{ words: Word[]; top?: number }> = ({ words, top = 1345 }) => {
  const t = useT();
  const chunks = React.useMemo(() => chunk(words), [words]);
  const cur = chunks.find((c, i) => {
    const last = c[c.length - 1].end + 0.6;
    const end = chunks[i + 1] ? Math.min(chunks[i + 1][0].start, last + 0.4) : last;
    return t >= c[0].start - 0.03 && t < end;
  });
  if (!cur) return null;
  return (
    <AbsoluteFill style={{ top, height: 270, justifyContent: "center", alignItems: "center", paddingLeft: 80, paddingRight: 150 }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "4px 20px", maxWidth: 850 }}>
        {cur.map((w, i) => {
          const live = t >= w.start - 0.02;
          const now = t >= w.start - 0.02 && t <= w.end + 0.04;
          const pop = prog(t, w.start - 0.02, w.start + 0.1, snap);
          return (
            <span
              key={i}
              style={{
                fontFamily: inter,
                fontWeight: 800,
                fontSize: 74,
                lineHeight: 1.14,
                textTransform: "uppercase",
                color: now ? GOLD : "#fff",
                opacity: live ? 1 : 0.32,
                scale: String(live ? lerp(1.06, 1, pop) : 1),
                WebkitTextStroke: "3px rgba(0,0,0,.92)",
                paintOrder: "stroke fill",
                textShadow: "0 5px 18px rgba(0,0,0,.85)",
              }}
            >
              {w.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/** The real λόγια calligraphy wordmark, in white for dark scenes. */
export const LogoMark: React.FC<{ width: number; style?: React.CSSProperties }> = ({ width, style }) => (
  <Img src={staticFile("logia-wordmark-white.svg")} style={{ width, height: width * (205 / 525), ...style }} />
);

export const Branding: React.FC<{ part: number; logo?: boolean }> = ({ part, logo }) => (
  <AbsoluteFill style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 170, paddingLeft: 66, paddingRight: 66, height: 240 }}>
    {logo ? (
      <div />
    ) : (
      <div style={{ fontFamily: anton, fontSize: 46, color: "#fff", letterSpacing: 7, textShadow: "0 2px 12px rgba(0,0,0,.9)" }}>LOGIA</div>
    )}
    <div style={{ fontFamily: inter, fontWeight: 800, fontSize: 32, color: "#fff", background: CRIMSON, height: 54, lineHeight: "54px", padding: "0 22px", borderRadius: 27 }}>
      PART {part}/3
    </div>
  </AbsoluteFill>
);

export const BottomLogo: React.FC = () => (
  <AbsoluteFill style={{ alignItems: "center", top: 1622 }}>
    <LogoMark width={170} style={{ filter: "drop-shadow(0 2px 10px rgba(0,0,0,.9))" }} />
  </AbsoluteFill>
);

export const Vignette: React.FC = () => (
  <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 52%, rgba(0,0,0,.62) 100%)", pointerEvents: "none" }} />
);

export const EndCard: React.FC<{ title: string; sub: string; logo?: boolean; credit?: string }> = ({ title, sub, logo, credit }) => {
  const creditLine = credit ?? (logo ? "Photo: Bundesarchiv, Bild 183-H1216-0500-002 / CC-BY-SA 3.0" : "");
  const t = useT();
  const p = prog(t, 0, 0.4, snap);
  return (
    <AbsoluteFill style={{ background: "#07050a", alignItems: "center", justifyContent: "center", gap: 28, padding: 90 }}>
      {logo ? (
        <LogoMark width={720} style={{ opacity: p, scale: String(lerp(1.15, 1, p)), marginBottom: 30 }} />
      ) : (
        <div style={{ fontFamily: anton, fontSize: 170, letterSpacing: 18, color: "#fff", opacity: p, scale: String(lerp(1.15, 1, p)) }}>LOGIA</div>
      )}
      <div style={{ fontFamily: inter, fontWeight: 800, fontSize: 56, color: GOLD, textAlign: "center", textTransform: "uppercase", opacity: p }}>{title}</div>
      <div style={{ fontFamily: inter, fontWeight: 800, fontSize: 40, color: "#fff", textAlign: "center", opacity: p * 0.8 }}>{sub}</div>
      {creditLine ? (
        <div style={{ position: "absolute", bottom: 330, fontFamily: inter, fontWeight: 800, fontSize: 22, color: "#fff", opacity: 0.55, textAlign: "center", padding: "0 80px" }}>
          {creditLine}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
