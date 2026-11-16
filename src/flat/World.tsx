import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, random, Sequence, staticFile, useCurrentFrame } from "remotion";
import { FONTS, FPS, H, IDLE, lerp, Pose, W } from "../Kit";

/**
 * Flat "storybook" world for Logia reels: cream paper, beige hills, thick ink outlines, flat colour,
 * blank-faced stick people, and Ken (his own drawn head on a stick body) as the main character.
 * Every scene is a world drawn in SVG and filmed by a keyframed camera that pushes in, pulls out and pans.
 */

export const INK = "#1d1a1a";
export const CREAM = "#f5f0e5";
export const SAND = "#ece1cb";
export const HILL = "#e4d4b6";
export const HILL_LINE = "#cbb391";
export const RED = "#d93a3a";
export const GOLDF = "#f2c94c";
export const SKY_NIGHT = "#2b3352";
export const SKIN = "#ea8f45";

const ease = Easing.bezier(0.45, 0, 0.2, 1);
const snap = Easing.bezier(0.16, 1, 0.3, 1);
export const pr = (t: number, a: number, b: number, e = ease) =>
  b <= a ? (t >= b ? 1 : 0) : interpolate(t, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: e });
export const pop = (t: number, a: number, d = 0.35) => pr(t, a, a + d, snap);
/** Overshooting pop-in 0 → 1.08 → 1. */
export const boing = (t: number, a: number, d = 0.45) => {
  const p = pr(t, a, a + d, Easing.linear);
  if (p <= 0) return 0;
  return 1 + Math.sin(p * Math.PI * 1.5) * 0.12 * (1 - p) - (1 - Easing.out(Easing.cubic)(p));
};

/* ---------- time ---------- */

/** Global time in seconds, valid inside a Shot (which offsets frames). */
const TimeCtx = React.createContext(0);
export const useGT = () => {
  const off = React.useContext(TimeCtx);
  return off + useCurrentFrame() / FPS;
};

/* ---------- camera ---------- */

/** Camera keyframe: [time (global s), zoom, centre x, centre y] in world coordinates. */
export type Key = [number, number, number, number];

const camAt = (keys: Key[], t: number) => {
  if (t <= keys[0][0]) return keys[0];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t <= b[0]) {
      const p = pr(t, a[0], b[0]);
      // Zoom interpolates in log space so push-ins feel even.
      return [t, Math.exp(lerp(Math.log(a[1]), Math.log(b[1]), p)), lerp(a[2], b[2], p), lerp(a[3], b[3], p)] as Key;
    }
  }
  return keys[keys.length - 1];
};

/**
 * One shot of the edit, from `from` to `to` (global seconds). Enters by zooming through from a blur,
 * leaves by zooming on into a blur under the next shot: the "zoom-through" transition.
 * `keys` move the camera across the world; `shake` adds impacts [time, strength].
 */
export const Shot: React.FC<{
  from: number; to: number; keys: Key[]; children: React.ReactNode; bg?: string;
  enter?: "zoom" | "cut" | "fade"; exit?: "zoom" | "cut" | "fade"; shake?: [number, number, number?][]; worldW?: number; worldH?: number;
}> = ({ from, to, keys, children, bg = CREAM, enter = "zoom", exit = "zoom", shake = [], worldW = W, worldH = H }) => {
  const tail = exit === "cut" ? 0 : 0.32;
  const a = Math.round(from * FPS);
  const b = Math.round((to + tail) * FPS);
  return (
    <Sequence from={a} durationInFrames={Math.max(1, b - a)} name={`shot ${from.toFixed(1)}`}>
      <TimeCtx.Provider value={a / FPS}>
        <ShotInner from={a / FPS} to={to} keys={keys} bg={bg} enter={enter} exit={exit} shake={shake} worldW={worldW} worldH={worldH}>
          {children}
        </ShotInner>
      </TimeCtx.Provider>
    </Sequence>
  );
};

const ShotInner: React.FC<{
  from: number; to: number; keys: Key[]; bg: string; enter: string; exit: string; shake: [number, number, number?][];
  worldW: number; worldH: number; children: React.ReactNode;
}> = ({ from, to, keys, bg, enter, exit, shake, children }) => {
  const t = useGT();
  const [, z, cx, cy] = camAt(keys, t);
  const inP = enter === "zoom" ? pr(t, from, from + 0.34, snap) : enter === "fade" ? pr(t, from, from + 0.4) : 1;
  const outP = exit === "zoom" ? pr(t, to, to + 0.3, Easing.in(Easing.cubic)) : exit === "fade" ? pr(t, to, to + 0.32) : 0;
  let zoomFx = 1;
  if (enter === "zoom") zoomFx *= lerp(0.72, 1, inP);
  if (exit === "zoom") zoomFx *= lerp(1, 1.9, outP);
  let sx = 0, sy = 0;
  shake.forEach(([at, amp, dur = 0.5]) => {
    const d = t - at;
    if (d >= 0 && d < dur) {
      const k = amp * (1 - d / dur);
      sx += Math.sin(t * 93) * k;
      sy += Math.cos(t * 71) * k;
    }
  });
  const blur = enter === "zoom" ? (1 - inP) * 18 : 0;
  const blurOut = exit === "zoom" ? outP * 22 : 0;
  const opacity = (enter === "cut" ? 1 : inP) * (1 - outP * (exit === "zoom" ? 0.9 : 1));
  const Z = z * zoomFx;
  return (
    <AbsoluteFill style={{ opacity, filter: blur + blurOut > 0.3 ? `blur(${blur + blurOut}px)` : undefined, background: bg }}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <g transform={`translate(${W / 2 + sx} ${H / 2 + sy}) scale(${Z}) translate(${-cx} ${-cy})`}>{children}</g>
      </svg>
    </AbsoluteFill>
  );
};

/* ---------- paper texture and frame overlays ---------- */

export const Paper: React.FC<{ tint?: string; opacity?: number }> = ({ tint = "#8a6a3a", opacity = 0.05 }) => (
  <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "multiply", opacity }}>
    <svg width={W} height={H}>
      <filter id="paperN">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={4} />
        <feColorMatrix values={`0 0 0 0 ${parseInt(tint.slice(1, 3), 16) / 255} 0 0 0 0 ${parseInt(tint.slice(3, 5), 16) / 255} 0 0 0 0 ${parseInt(tint.slice(5, 7), 16) / 255} 0 0 0 1 0`} />
      </filter>
      <rect width={W} height={H} filter="url(#paperN)" />
    </svg>
  </AbsoluteFill>
);

export const SoftVignette: React.FC<{ k?: number; color?: string }> = ({ k = 0.18, color = "40,24,8" }) => (
  <AbsoluteFill style={{ pointerEvents: "none", background: `radial-gradient(ellipse at 50% 46%, transparent 58%, rgba(${color},${k}) 100%)` }} />
);

/* ---------- text ---------- */

/** The big burned-in title (like a cover line): white Anton with an ink outline, keywords coloured. */
export const Title: React.FC<{
  lines: (string | [string, string] | [string, string][])[]; at: number; until?: number; size?: number; top?: number;
}> = ({ lines, at, until = 1e9, size = 112, top = 250 }) => {
  const t = useGT();
  if (t < at - 0.01 || t > until + 0.25) return null;
  const out = pr(t, until, until + 0.25);
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: top, opacity: 1 - out }}>
      {lines.map((line, i) => {
        const segs: [string, string][] = typeof line === "string" ? [[line, "#fff"]] : Array.isArray(line[0]) ? (line as [string, string][]) : [line as [string, string]];
        const p = boing(t, at + i * 0.09, 0.42);
        return (
          <div
            key={i}
            style={{
              fontFamily: FONTS.anton, fontSize: size, lineHeight: 1.04, textTransform: "uppercase", letterSpacing: 1,
              WebkitTextStroke: `${size * 0.11}px ${INK}`, paintOrder: "stroke fill", textAlign: "center",
              transform: `scale(${Math.max(0, p)}) rotate(${(1 - Math.min(1, p)) * -4}deg)`, opacity: Math.min(1, p * 3),
              filter: "drop-shadow(0 8px 0 rgba(29,26,26,.18))",
            }}
          >
            {segs.map(([text, color], k) => <span key={k} style={{ color, marginLeft: k ? size * 0.22 : 0 }}>{text}</span>)}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/** A sticker-style "receipt" card: source + fact, pops in and tilts slightly. */
export const Receipt: React.FC<{ at: number; until?: number; head: string; body: string; x?: number; y?: number; rot?: number; w?: number; dark?: boolean }> = ({
  at, until = 1e9, head, body, x = 540, y = 560, rot = -2, w = 640, dark,
}) => {
  const t = useGT();
  if (t < at || t > until + 0.3) return null;
  const p = boing(t, at, 0.5) * (1 - pr(t, until, until + 0.3));
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute", left: x - w / 2, top: y, width: w, padding: "22px 30px 26px",
          background: dark ? "#1d1a1a" : "#fffdf7", border: `6px solid ${INK}`, borderRadius: 26,
          boxShadow: `0 10px 0 ${INK}`, transform: `scale(${Math.max(0, p)}) rotate(${rot}deg)`, textAlign: "center",
        }}
      >
        <div style={{ fontFamily: FONTS.inter, fontWeight: 800, fontSize: 30, letterSpacing: 3, color: RED, textTransform: "uppercase" }}>{head}</div>
        <div style={{ fontFamily: FONTS.inter, fontWeight: 800, fontSize: 44, lineHeight: 1.18, color: dark ? "#fff" : INK, marginTop: 6 }}>{body}</div>
      </div>
    </AbsoluteFill>
  );
};

/** Big red X stamp (in world coordinates). */
export const XMark: React.FC<{ x: number; y: number; s?: number; at: number }> = ({ x, y, s = 1, at }) => {
  const t = useGT();
  const p = pr(t, at, at + 0.16, snap);
  const q = pr(t, at + 0.08, at + 0.24, snap);
  if (p <= 0) return null;
  const k = lerp(1.6, 1, p);
  return (
    <g transform={`translate(${x} ${y}) scale(${s * k}) rotate(-6)`}>
      <path d="M-90,-90 L90,90" stroke={INK} strokeWidth={50} strokeLinecap="round" opacity={p} />
      <path d="M-90,-90 L90,90" stroke={RED} strokeWidth={34} strokeLinecap="round" opacity={p} />
      {q > 0 ? (
        <g opacity={q}>
          <path d="M90,-90 L-90,90" stroke={INK} strokeWidth={50} strokeLinecap="round" />
          <path d="M90,-90 L-90,90" stroke={RED} strokeWidth={34} strokeLinecap="round" />
        </g>
      ) : null}
    </g>
  );
};

/** Text placed in the world (signs, labels). */
export const WText: React.FC<{ x: number; y: number; size: number; children: React.ReactNode; color?: string; anchor?: "start" | "middle" | "end"; font?: "anton" | "inter"; stroke?: number; rot?: number; opacity?: number }> = ({
  x, y, size, children, color = INK, anchor = "middle", font = "inter", stroke = 0, rot = 0, opacity = 1,
}) => (
  <text
    x={x} y={y} fontSize={size} fill={color} textAnchor={anchor} opacity={opacity}
    fontFamily={font === "anton" ? FONTS.anton : FONTS.inter} fontWeight={font === "anton" ? 400 : 800}
    stroke={stroke ? INK : undefined} strokeWidth={stroke || undefined} paintOrder="stroke fill" strokeLinejoin="round"
    transform={rot ? `rotate(${rot} ${x} ${y})` : undefined}
  >
    {children}
  </text>
);

/* ---------- scenery ---------- */

/** Cream sky, two rolling outlined hills and a sandy floor from y = floor. */
export const Land: React.FC<{ x0?: number; x1?: number; floor?: number; sky?: string; hill?: string; ground?: string; line?: string }> = ({
  x0 = -1200, x1 = 2400, floor = 1300, sky = CREAM, hill = HILL, ground = SAND, line = HILL_LINE,
}) => {
  const span = x1 - x0;
  const hills = Array.from({ length: Math.ceil(span / 900) + 1 }).map((_, i) => {
    const x = x0 + i * 900;
    return `M${x},${floor - 60} Q${x + 220},${floor - 330 - (i % 2) * 70} ${x + 450},${floor - 170} Q${x + 680},${floor - 30} ${x + 900},${floor - 60}`;
  });
  return (
    <g>
      <rect x={x0} y={-3000} width={span} height={3000 + floor} fill={sky} />
      {hills.map((d, i) => (
        <path key={i} d={`${d} L${x0 + i * 900 + 900},${floor} L${x0 + i * 900},${floor} Z`} fill={hill} stroke={line} strokeWidth={4} />
      ))}
      <rect x={x0} y={floor - 70} width={span} height={70} fill={hill} />
      <path d={`M${x0},${floor - 70} H${x1}`} stroke={line} strokeWidth={4} />
      <rect x={x0} y={floor} width={span} height={3000} fill={ground} />
      <path d={`M${x0},${floor} H${x1}`} stroke={INK} strokeWidth={5} />
    </g>
  );
};

/** Little ink cloud. */
export const Cloud: React.FC<{ x: number; y: number; s?: number; fill?: string; t?: number }> = ({ x, y, s = 1, fill = "#fff", t = 0 }) => (
  <g transform={`translate(${x + Math.sin(t * 0.4 + x) * 8} ${y}) scale(${s})`}>
    <path d="M-120,30 Q-140,-20 -90,-30 Q-80,-80 -20,-70 Q20,-110 70,-60 Q130,-60 120,0 Q140,40 90,40 L-100,40 Q-130,40 -120,30 Z" fill={fill} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
  </g>
);

export const CrossMark: React.FC<{ x: number; y: number; s?: number; fill?: string; glow?: number }> = ({ x, y, s = 1, fill = GOLDF, glow = 0 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    {glow > 0 ? <circle r={160} fill="url(#warmGlow)" opacity={glow} /> : null}
    <path d="M-16,-90 h32 v52 h42 v32 h-42 v96 h-32 v-96 h-42 v-32 h42 Z" fill={fill} stroke={INK} strokeWidth={7} strokeLinejoin="round" />
  </g>
);

export const Defs: React.FC = () => (
  <defs>
    <radialGradient id="warmGlow">
      <stop offset="0" stopColor="#fff3c4" stopOpacity={1} />
      <stop offset="0.5" stopColor="#ffd774" stopOpacity={0.45} />
      <stop offset="1" stopColor="#ffd774" stopOpacity={0} />
    </radialGradient>
    <radialGradient id="phoneGlow">
      <stop offset="0" stopColor="#bfe0ff" stopOpacity={0.75} />
      <stop offset="1" stopColor="#bfe0ff" stopOpacity={0} />
    </radialGradient>
    <radialGradient id="lampGlow">
      <stop offset="0" stopColor="#ffe6a8" stopOpacity={0.9} />
      <stop offset="1" stopColor="#ffe6a8" stopOpacity={0} />
    </radialGradient>
  </defs>
);

/** Speech bubble in world coordinates; tail points to (tx, ty). */
export const Bubble: React.FC<{ x: number; y: number; w: number; h: number; tx: number; ty: number; children?: React.ReactNode; p?: number; fill?: string }> = ({
  x, y, w, h, tx, ty, children, p = 1, fill = "#fff",
}) => {
  if (p <= 0) return null;
  const bx = x + w * 0.3;
  return (
    <g transform={`translate(${tx} ${ty}) scale(${p}) translate(${-tx} ${-ty})`}>
      <path d={`M${bx - 24},${y + h - 4} L${tx},${ty} L${bx + 34},${y + h - 4} Z`} fill={fill} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
      <rect x={x} y={y} width={w} height={h} rx={h / 2.4} fill={fill} stroke={INK} strokeWidth={6} />
      <path d={`M${bx - 20},${y + h - 6} L${bx + 30},${y + h - 6}`} stroke={fill} strokeWidth={9} />
      {children}
    </g>
  );
};

/* ---------- people ---------- */

type Limbs = { thigh: number; shin: number; upper: number; fore: number };
const LEN: Limbs = { thigh: 86, shin: 86, upper: 76, fore: 72 };

const Stick: React.FC<{ x: number; y: number; a: number; b: number; l1: number; l2: number; w: number; c?: string; end?: React.ReactNode }> = ({
  x, y, a, b, l1, l2, w, c = INK, end,
}) => (
  <g transform={`translate(${x} ${y}) rotate(${a})`}>
    <line y2={l1} stroke={c} strokeWidth={w} strokeLinecap="round" />
    <g transform={`translate(0 ${l1}) rotate(${b})`}>
      <line y2={l2} stroke={c} strokeWidth={w} strokeLinecap="round" />
      <g transform={`translate(0 ${l2})`}>{end}</g>
    </g>
  </g>
);

const shoe = (c: string) => <ellipse cx={12} cy={4} rx={24} ry={12} fill={c} stroke={INK} strokeWidth={5} />;
const hand = (c: string) => <circle r={15} fill={c} stroke={INK} strokeWidth={5} />;

/** Where a hand ends up, relative to its shoulder, for a pose. */
const handOffset = (a: number, b: number) => {
  const r = (d: number) => (d * Math.PI) / 180;
  const ux = -Math.sin(r(a)) * LEN.upper, uy = Math.cos(r(a)) * LEN.upper;
  const fx = -Math.sin(r(a + b)) * (LEN.fore + 6), fy = Math.cos(r(a + b)) * (LEN.fore + 6);
  return [ux + fx, uy + fy];
};

export const SIT: Pose = { ...IDLE, lh: -90, lk: 90, rh: -82, rk: 84, drop: 86 };

/** Blank-faced stick person, the extras of the world. */
export const Person: React.FC<{
  x: number; y: number; s?: number; pose?: Pose; t: number; body?: string; hair?: string; flip?: boolean; seed?: number;
  halo?: boolean; beard?: string; robe?: boolean; tie?: string; cap?: string; sweat?: boolean; hold?: React.ReactNode;
}> = ({ x, y, s = 1, pose = IDLE, t, body = "#7fa7d9", hair = "#3a2a1e", flip, seed = 1, halo, beard, robe, tie, cap, sweat, hold }) => {
  const breathe = Math.sin(t * 2 + seed) * 2;
  const hipY = -(LEN.thigh + LEN.shin) + pose.drop;
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <ellipse cy={6} rx={70} ry={11} fill={INK} opacity={0.12} />
      <g transform={`translate(0 ${hipY})`}>
        <Stick x={-14} y={0} a={pose.lh} b={pose.lk} l1={LEN.thigh} l2={LEN.shin} w={12} end={shoe(INK)} />
        <Stick x={14} y={0} a={pose.rh} b={pose.rk} l1={LEN.thigh} l2={LEN.shin} w={12} end={shoe(INK)} />
        <g transform={`rotate(${pose.torso}) translate(0 ${breathe})`}>
          <Stick x={-46} y={-130} a={pose.ls} b={pose.le} l1={LEN.upper} l2={LEN.fore} w={11} end={hand("#fbfaf6")} />
          {robe ? (
            <path d="M-56,-150 Q0,-170 56,-150 L84,40 Q0,58 -84,40 Z" fill={body} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
          ) : (
            <path d="M-56,-150 Q0,-170 56,-150 Q66,-60 58,8 Q0,22 -58,8 Q-66,-60 -56,-150 Z" fill={body} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
          )}
          {tie ? <path d="M0,-150 L-10,-128 L0,-40 L10,-128 Z" fill={tie} stroke={INK} strokeWidth={4} strokeLinejoin="round" /> : null}
          <Stick x={46} y={-130} a={pose.rs} b={pose.re} l1={LEN.upper} l2={LEN.fore} w={11} end={<g>{hand("#fbfaf6")}{hold}</g>} />
          <g transform={`translate(0 -158) rotate(${pose.head})`}>
            <circle cy={-52} r={50} fill="#fbfaf6" stroke={INK} strokeWidth={7} />
            <path d="M-50,-50 Q-52,-108 0,-106 Q52,-108 50,-50 Q34,-74 0,-72 Q-34,-74 -50,-50 Z" fill={hair} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
            {beard ? <path d="M-44,-34 Q-40,8 0,10 Q40,8 44,-34 Q20,-14 0,-16 Q-20,-14 -44,-34 Z" fill={beard} stroke={INK} strokeWidth={5} /> : null}
            {cap ? <path d="M-52,-62 Q-50,-112 0,-110 Q50,-112 52,-62 Z M40,-66 L92,-60 L90,-50 L40,-56 Z" fill={cap} stroke={INK} strokeWidth={6} strokeLinejoin="round" /> : null}
            {halo ? <ellipse cy={-128} rx={52} ry={12} fill="none" stroke={GOLDF} strokeWidth={10} /> : null}
            {sweat ? <path d={`M62,${-70 + ((t * 40) % 30)} q8,14 0,20 q-8,-6 0,-20 Z`} fill="#8fd0ff" stroke={INK} strokeWidth={3} /> : null}
          </g>
        </g>
      </g>
    </g>
  );
};

/* ---------- Ken: his drawn head on a stick body ---------- */

const HEAD_W = 820, HEAD_H = 925;
const HEAD_ANCHOR = [560, 888]; // neck point in ken-head.png
const HS = 0.3; // head scale
// Measured in the source artwork (logia-2d-cut.png); ken-head.png is that image shifted by (-190, -20).
const EYES = [
  { cx: 597, cy: 549, rx: 100, ry: 46, top: 505 },
  { cx: 854, cy: 537, rx: 84, ry: 52, top: 488 },
];
const MOUTH = "#2a0c0a", TONGUE = "#e07a86", TEETH = "#fbf7ee", SKIN_SHADE = "#d77a34";

export const KenFace: React.FC<{ open: number; smile: number; lid: number; uid: string }> = ({ open, smile, lid, uid }) => {
  const o = Math.max(0, Math.min(1, open));
  const by = 722 + 62 * o; // lower lip
  return (
    <g transform="translate(-190 -20)">
      <defs>
        {EYES.map((e, i) => (
          <clipPath key={i} id={`${uid}e${i}`}>
            <ellipse cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry} />
          </clipPath>
        ))}
        <clipPath id={`${uid}m`}>
          <path d={`M624,722 C680,708 790,704 846,714 C838,${714 + 46 * o} 792,${by} 734,${by} C676,${by} 632,${722 + 38 * o} 624,722 Z`} />
        </clipPath>
      </defs>
      {/* Cover the drawn grin, then draw this frame's mouth in the same ink style. */}
      <path d="M592,712 C600,690 700,684 760,688 C820,690 868,694 872,714 C876,760 840,826 760,834 C680,840 600,812 592,712 Z" fill={SKIN} />
      <path d="M612,802 C660,830 760,838 830,800 C800,830 700,842 640,824 Z" fill={SKIN_SHADE} opacity={0.5} />
      {o < 0.06 ? (
        <g>
          <path d={`M616,${726 - 10 * smile} C670,${750 + 14 * smile} 790,${746 + 12 * smile} 850,${716 - 12 * smile}`} fill="none" stroke={INK} strokeWidth={13} strokeLinecap="round" />
          {smile > 0.2 ? <path d={`M604,${718 - 14 * smile} q8,10 18,10 M862,${706 - 14 * smile} q-6,12 -16,12`} fill="none" stroke={INK} strokeWidth={8} strokeLinecap="round" opacity={0.8} /> : null}
        </g>
      ) : (
        <g>
          <path d={`M624,722 C680,708 790,704 846,714 C838,${714 + 46 * o} 792,${by} 734,${by} C676,${by} 632,${722 + 38 * o} 624,722 Z`} fill={MOUTH} />
          <g clipPath={`url(#${uid}m)`}>
            <rect x={600} y={700} width={260} height={24 + 6 * o} fill={TEETH} />
            <ellipse cx={734} cy={by + 8} rx={60} ry={10 + 22 * o} fill={TONGUE} />
          </g>
          <path d={`M624,722 C680,708 790,704 846,714 C838,${714 + 46 * o} 792,${by} 734,${by} C676,${by} 632,${722 + 38 * o} 624,722 Z`} fill="none" stroke={INK} strokeWidth={11} strokeLinejoin="round" />
        </g>
      )}
      {EYES.map((e, i) => {
        const h = (e.cy + e.ry - e.top) * lid;
        if (h < 1) return null;
        const yy = e.top + h;
        return (
          <g key={i} clipPath={`url(#${uid}e${i})`}>
            <rect x={e.cx - e.rx - 10} y={e.top - 30} width={e.rx * 2 + 20} height={h + 30} fill={SKIN} />
            <path d={`M${e.cx - e.rx},${yy - 4} Q${e.cx},${yy + 8} ${e.cx + e.rx},${yy - 6}`} fill="none" stroke={INK} strokeWidth={11} strokeLinecap="round" />
          </g>
        );
      })}
    </g>
  );
};

export type KenProps = {
  x: number; y: number; s?: number; pose?: Pose; t: number; talk?: number; smile?: number; droop?: number; flip?: boolean;
  hold?: "phone" | "bible" | "phoneGlow" | null; jacket?: string; uid?: string; glow?: number; look?: number;
};

/** Ken. `talk` 0..1 opens the mouth a little; `droop` makes the lids heavy; `look` turns the head (degrees). */
export const Ken: React.FC<KenProps> = ({
  x, y, s = 1, pose = IDLE, t, talk = 0, smile = 0.6, droop = 0, flip, hold = null, jacket = "#2b2833", uid = "ken", look = 0,
}) => {
  const breathe = Math.sin(t * 1.9) * 2.2;
  const ph = t % 3.7;
  const blink = ph < 0.15 ? Math.sin((ph / 0.15) * Math.PI) : 0;
  const lid = Math.max(blink, droop);
  const hipY = -(LEN.thigh + LEN.shin) + pose.drop;
  const shY = -168;
  const headRot = pose.head + look + Math.sin(t * 1.1) * 1.5 + talk * Math.sin(t * 9) * 1.6;
  const nod = talk > 0.1 ? Math.abs(Math.sin(t * 6.5)) * -3 : 0;
  const [hx, hy] = handOffset(pose.rs, pose.re);
  const held =
    hold === "phone" || hold === "phoneGlow" ? (
      <g transform={`translate(${46 + hx} ${shY + hy}) rotate(-12)`}>
        {hold === "phoneGlow" ? <circle r={170} fill="url(#phoneGlow)" /> : null}
        <rect x={-22} y={-40} width={44} height={78} rx={9} fill="#16141a" stroke={INK} strokeWidth={5} />
        <rect x={-16} y={-33} width={32} height={60} rx={5} fill={hold === "phoneGlow" ? "#d6ecff" : "#3b4a66"} />
      </g>
    ) : hold === "bible" ? (
      <g transform={`translate(${46 + hx} ${shY + hy}) rotate(-8)`}>
        <path d="M-70,-30 Q-35,-44 0,-30 Q35,-44 70,-30 L70,34 Q35,22 0,34 Q-35,22 -70,34 Z" fill="#fffaf0" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
        <path d="M0,-30 V34" stroke={INK} strokeWidth={5} />
        <path d="M-56,-14 h40 M-56,0 h44 M-56,14 h36 M14,-14 h42 M14,0 h38 M14,14 h44" stroke="#9a8b70" strokeWidth={4} />
      </g>
    ) : null;
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <ellipse cy={6} rx={78} ry={12} fill={INK} opacity={0.13} />
      <g transform={`translate(0 ${hipY})`}>
        <Stick x={-16} y={0} a={pose.lh} b={pose.lk} l1={LEN.thigh} l2={LEN.shin} w={15} c="#2f3a55" end={shoe("#f6f3ec")} />
        <Stick x={16} y={0} a={pose.rh} b={pose.rk} l1={LEN.thigh} l2={LEN.shin} w={15} c="#2f3a55" end={shoe("#f6f3ec")} />
        <g transform={`rotate(${pose.torso}) translate(0 ${breathe * 0.5})`}>
          <Stick x={-46} y={shY + 14} a={pose.ls} b={pose.le} l1={LEN.upper} l2={LEN.fore} w={14} c={INK} end={hand(SKIN)} />
          {/* Jacket over a white tee, like his artwork. */}
          <path d="M-58,-170 Q0,-186 58,-170 Q70,-80 60,10 Q0,26 -60,10 Q-70,-80 -58,-170 Z" fill={jacket} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
          <path d="M-18,-176 L0,-118 L18,-176 Z" fill="#f4f1ea" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <path d="M0,-118 V8" stroke="#15131a" strokeWidth={4} />
          <path d="M-22,-178 L-6,-150 M22,-178 L6,-150" stroke="#46424f" strokeWidth={6} strokeLinecap="round" />
          <Stick x={46} y={shY + 14} a={pose.rs} b={pose.re} l1={LEN.upper} l2={LEN.fore} w={14} c={INK} end={hand(SKIN)} />
          {held}
          <rect x={-15} y={-196} width={30} height={30} rx={8} fill={SKIN} stroke={INK} strokeWidth={5} />
          <g transform={`translate(0 ${-182 + breathe * 0.3 + nod}) rotate(${headRot})`}>
            <g transform={`scale(${HS}) translate(${-HEAD_ANCHOR[0]} ${-HEAD_ANCHOR[1]})`}>
              <image href={staticFile("narrator/ken-head.png")} width={HEAD_W} height={HEAD_H} />
              <KenFace open={talk} smile={smile} lid={lid} uid={uid} />
            </g>
          </g>
        </g>
      </g>
    </g>
  );
};

/* ---------- objects ---------- */

export const Phone: React.FC<{ x: number; y: number; s?: number; rot?: number; children?: React.ReactNode; dark?: boolean }> = ({ x, y, s = 1, rot = 0, children, dark }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <rect x={-170} y={-340} width={340} height={680} rx={48} fill="#141217" stroke={INK} strokeWidth={10} />
    <rect x={-152} y={-318} width={304} height={636} rx={34} fill={dark ? "#0f1420" : "#f7f8fb"} />
    <rect x={-46} y={-312} width={92} height={20} rx={10} fill="#141217" />
    {children}
  </g>
);

export const LogoPlate: React.FC<{ x: number; y: number; w: number; opacity?: number }> = ({ x, y, w, opacity = 1 }) => (
  <image href={staticFile("logia-wordmark-white.svg")} x={x - w / 2} y={y - (w * 205) / 525 / 2} width={w} height={(w * 205) / 525} opacity={opacity} />
);

export const Gt = React.createContext(0);

/** Loads a still photo as a world-space picture with an ink frame. */
export const Photo: React.FC<{ src: string; x: number; y: number; w: number; h: number; rot?: number; p?: number }> = ({ src, x, y, w, h, rot = 0, p = 1 }) => {
  if (p <= 0) return null;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${p})`}>
      <rect x={-w / 2 - 16} y={-h / 2 - 16} width={w + 32} height={h + 70} fill="#fffdf7" stroke={INK} strokeWidth={6} />
      <image href={staticFile(src)} x={-w / 2} y={-h / 2} width={w} height={h} preserveAspectRatio="xMidYMid slice" />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} fill="none" stroke={INK} strokeWidth={3} />
    </g>
  );
};

export const rnd = (k: string) => random(k);
export { Img };

/* ---------- 3D background plates (rendered in Blender by blender/plates.py) ---------- */
import PLATES from "../data/plates.json";
type PlateMeta = { src: string; rect: number[]; anchors: Record<string, number[]> };
export const plateMeta = (name: string) => (PLATES as Record<string, PlateMeta>)[name];
/** Anchor point (world px) projected from the 3D set; bboxes return their centre-bottom. */
export const anchorOf = (name: string, key: string): [number, number] => {
  const a = plateMeta(name)?.anchors[key];
  if (!a) return [540, 1300];
  return a.length === 2 ? [a[0], a[1]] : [(a[0] + a[2]) / 2, a[3]];
};
export const PlateImg: React.FC<{ name: string; dx?: number; dy?: number; opacity?: number; blur?: number }> = ({ name, dx = 0, dy = 0, opacity = 1, blur = 0 }) => {
  const m = plateMeta(name);
  if (!m) return null;
  const [x0, y0, x1, y1] = m.rect;
  const id = `pb${name}${blur}`;
  return (
    <g opacity={opacity}>
      {blur ? (
        <defs>
          <filter id={id} x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation={blur} /></filter>
        </defs>
      ) : null}
      <image href={staticFile(m.src)} x={x0 + dx} y={y0 + dy} width={x1 - x0} height={y1 - y0} preserveAspectRatio="none" filter={blur ? `url(#${id})` : undefined} />
    </g>
  );
};
