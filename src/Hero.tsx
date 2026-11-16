import React from "react";
import { GOLD, GROUND, Pose, Word } from "./Kit";

/**
 * Logia's main character, drawn as a rigged vector figure from the expression sheet:
 * big curly black hair, rectangular glasses, moustache and short beard, black high-collar jacket over a white tee,
 * dark jeans, white sneakers with gold soles. Thick ink outlines to match the sheet's comic style.
 */

export type Mood = "neutral" | "sad" | "worried" | "curious" | "happy" | "serious" | "surprised" | "calm";
type Viseme = "rest" | "A" | "E" | "O" | "M";

const INK = "#1a1210";
const SKIN = "#f0a052";
const SKIN_SHADE = "#d9833c";
const HAIR = "#141010";
const JACKET = "#1d1d22";
const JACKET_HI = "#33333c";
const JEANS = "#26304a";
const OUT = 6;

/** Mouth shape for narration time vt: cycles through open shapes while a word plays, rests between words. */
export const visemeAt = (words: Word[], vt: number): Viseme => {
  const w = words.find((x) => vt >= x.start && vt <= x.end);
  if (!w) return "rest";
  const shapes: Viseme[] = ["A", "E", "O", "A", "M", "E"];
  const k = Math.floor((vt - w.start) / 0.085) + w.text.length;
  return shapes[k % shapes.length];
};

const Mouth: React.FC<{ v: Viseme; mood: Mood }> = ({ v, mood }) => {
  if (v === "rest" || v === "M") {
    const curve = mood === "happy" ? 9 : mood === "calm" ? 5 : mood === "sad" || mood === "worried" ? -6 : mood === "surprised" ? 0 : 1;
    if (mood === "surprised" && v === "rest") return <ellipse cx={0} cy={0} rx={8} ry={10} fill="#5a1a14" stroke={INK} strokeWidth={4} />;
    return <path d={`M-16,0 Q0,${curve} 16,0`} fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />;
  }
  const open = v === "A" ? [18, 15] : v === "E" ? [20, 8] : [10, 13];
  const [rx, ry] = open;
  return (
    <g>
      <path d={`M${-rx},-2 Q0,${-ry * 0.25} ${rx},-2 Q${rx * 0.8},${ry} 0,${ry} Q${-rx * 0.8},${ry} ${-rx},-2 Z`} fill="#5a1a14" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
      {v !== "O" ? <path d={`M${-rx + 4},0 Q0,${-ry * 0.15} ${rx - 4},0 L${rx - 6},4 Q0,5 ${-rx + 6},4 Z`} fill="#fff" /> : null}
      <ellipse cx={0} cy={ry * 0.7} rx={rx * 0.45} ry={ry * 0.22} fill="#e0707a" />
    </g>
  );
};

/** The head, drawn around the chin at (0,0). */
export const HeroHead: React.FC<{ mood: Mood; v: Viseme; blink: boolean; look: number; tilt: number }> = ({ mood, v, blink, look, tilt }) => {
  // Brow shape per mood: inner end and outer end heights.
  const brow = {
    neutral: [0, 0], calm: [-1, 1], happy: [-4, -2], sad: [-10, 4], worried: [-12, 2], curious: [-6, 4],
    serious: [7, -1], surprised: [-12, -10],
  }[mood];
  const lid = mood === "calm" || mood === "sad" ? 0.45 : mood === "serious" ? 0.3 : 0;
  const eyeR = mood === "surprised" ? 7.5 : 6;
  const curls: [number, number, number][] = [
    [-70, -150, 30], [-50, -185, 32], [-15, -200, 34], [22, -198, 33], [56, -182, 31], [76, -148, 28],
    [-82, -112, 24], [84, -110, 24], [-30, -170, 26], [30, -168, 26], [0, -178, 26], [-62, -128, 22], [62, -126, 22],
  ];
  return (
    <g transform={`rotate(${tilt})`}>
      {/* Hair volume behind the face */}
      <g stroke={INK} strokeWidth={OUT}>
        {curls.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill={HAIR} />)}
      </g>
      <g fill={HAIR}>{curls.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r - OUT / 2} />)}</g>
      {/* Ears */}
      <g stroke={INK} strokeWidth={OUT} fill={SKIN}>
        <ellipse cx={-66} cy={-92} rx={14} ry={19} />
        <ellipse cx={66} cy={-92} rx={14} ry={19} />
      </g>
      <path d="M-68,-100 q6,6 0,16 M68,-100 q-6,6 0,16" stroke={SKIN_SHADE} strokeWidth={4} fill="none" strokeLinecap="round" />
      {/* Face: slightly square jaw */}
      <path d="M-62,-130 Q-64,-40 -36,-14 Q0,10 36,-14 Q64,-40 62,-130 Q60,-160 0,-162 Q-60,-160 -62,-130 Z" fill={SKIN} stroke={INK} strokeWidth={OUT} />
      <path d="M30,-150 Q62,-120 54,-60 Q46,-24 20,-8 Q48,-40 50,-90 Q52,-130 30,-150 Z" fill={SKIN_SHADE} opacity={0.55} />
      {/* Beard and stubble along the jaw */}
      {/* Stubble band along the jaw, leaving the mouth area clear, plus a chin beard. */}
      <path d="M-61,-88 Q-62,-38 -36,-14 Q0,10 36,-14 Q62,-38 61,-88 Q54,-46 32,-26 Q0,-10 -32,-26 Q-54,-46 -61,-88 Z" fill="#2a1a12" opacity={0.75} />
      <path d="M-12,-20 Q0,-16 12,-20 L9,-4 Q0,2 -9,-4 Z" fill="#2a1a12" />
      {/* Fringe curls over the forehead */}
      <g stroke={INK} strokeWidth={5} fill={HAIR}>
        <circle cx={-34} cy={-158} r={20} />
        <circle cx={-6} cy={-164} r={21} />
        <circle cx={24} cy={-160} r={20} />
        <circle cx={48} cy={-148} r={16} />
        <circle cx={-54} cy={-144} r={15} />
      </g>
      <path d="M-40,-165 q8,-6 12,4 M-8,-172 q8,-6 12,4 M20,-168 q8,-6 12,4" stroke="#3a2c26" strokeWidth={3} fill="none" strokeLinecap="round" />
      {/* Eyes */}
      {[-27, 27].map((x) => (
        <g key={x} transform={`translate(${x} -100)`}>
          {blink ? (
            <path d="M-12,0 Q0,5 12,0" stroke={INK} strokeWidth={4} fill="none" strokeLinecap="round" />
          ) : (
            <g>
              <ellipse rx={13} ry={11} fill="#fff" stroke={INK} strokeWidth={2.5} />
              <circle cx={look * 5} cy={1} r={eyeR} fill={INK} />
              <circle cx={look * 5 + 2.5} cy={-2} r={2} fill="#fff" />
              {lid > 0 ? <path d={`M-14,-12 L14,-12 L14,${-12 + 22 * lid} Q0,${-8 + 22 * lid} -14,${-12 + 22 * lid} Z`} fill={SKIN} stroke={INK} strokeWidth={2.5} /> : null}
            </g>
          )}
        </g>
      ))}
      {/* Glasses */}
      <g fill="rgba(255,255,255,.14)" stroke="#2d2622" strokeWidth={5}>
        <rect x={-50} y={-118} width={44} height={34} rx={9} />
        <rect x={6} y={-118} width={44} height={34} rx={9} />
      </g>
      <path d="M-6,-104 Q0,-110 6,-104 M-50,-108 L-64,-102 M50,-108 L64,-102" stroke="#2d2622" strokeWidth={5} fill="none" strokeLinecap="round" />
      <path d="M-44,-112 l8,-2 M12,-112 l8,-2" stroke="#fff" strokeWidth={3} opacity={0.7} strokeLinecap="round" />
      {/* Brows */}
      <path d={`M-50,${-126 + brow[1]} Q-34,${-134 + (brow[0] + brow[1]) / 2} -12,${-126 + brow[0]}`} stroke={INK} strokeWidth={8} fill="none" strokeLinecap="round" />
      <path d={`M50,${-126 + brow[1]} Q34,${-134 + (brow[0] + brow[1]) / 2} 12,${-126 + brow[0]}`} stroke={INK} strokeWidth={8} fill="none" strokeLinecap="round" />
      {/* Nose */}
      <path d="M-2,-86 Q-10,-66 -2,-62 Q6,-60 10,-64" stroke={SKIN_SHADE} strokeWidth={4} fill="none" strokeLinecap="round" />
      {/* Moustache */}
      <path d="M-24,-50 Q-12,-60 0,-54 Q12,-60 24,-50 Q12,-48 0,-50 Q-12,-48 -24,-50 Z" fill="#2a1a12" stroke={INK} strokeWidth={2} />
      <g transform="translate(0 -38)"><Mouth v={v} mood={mood} /></g>
    </g>
  );
};

/** Limb drawn as an inked stroke: a dark under-stroke then the colour on top. */
const Limb: React.FC<{ x: number; y: number; a: number; b: number; l1: number; l2: number; w: number; c: string; end: (l: number) => React.ReactNode }> = ({
  x, y, a, b, l1, l2, w, c, end,
}) => (
  <g transform={`translate(${x} ${y}) rotate(${a})`}>
    <line y2={l1} stroke={INK} strokeWidth={w + OUT * 2} strokeLinecap="round" />
    <line y2={l1} stroke={c} strokeWidth={w} strokeLinecap="round" />
    <g transform={`translate(0 ${l1}) rotate(${b})`}>
      <line y2={l2} stroke={INK} strokeWidth={w * 0.9 + OUT * 2} strokeLinecap="round" />
      <line y2={l2} stroke={c} strokeWidth={w * 0.9} strokeLinecap="round" />
      <circle r={w * 0.45} fill={c} />
      {end(l2)}
    </g>
  </g>
);

export const Hero: React.FC<{
  pose: Pose; x: number; t: number; mood?: Mood; scale?: number; ground?: number; flip?: boolean;
  /** Narration words and narration time: when given he lip-syncs. */
  words?: Word[]; vt?: number; look?: number; phone?: boolean; rim?: string; shadow?: boolean;
}> = ({ pose, x, t, mood = "neutral", scale = 1, ground = GROUND, flip, words, vt, look = 0, phone, rim, shadow = true }) => {
  const v = words && vt !== undefined ? visemeAt(words, vt) : "rest";
  const talking = v !== "rest";
  const breathe = Math.sin(t * 2.1) * 2.5;
  const blink = (t % 3.7) < 0.12 || (t % 5.3) > 5.18;
  const nod = talking ? Math.sin(t * 7) * 2 : 0;
  const y = ground - 210 * scale + pose.drop * scale;
  const hand = (l: number) => <circle cy={l + 8} r={15} fill={SKIN} stroke={INK} strokeWidth={4} />;
  const phoneHand = (l: number) => (
    <g>
      <rect x={-14} y={l - 6} width={28} height={46} rx={6} fill="#111" stroke={INK} strokeWidth={3} />
      <rect x={-10} y={l - 2} width={20} height={36} rx={3} fill="#6fd0ff" />
      <circle cy={l + 8} r={15} fill={SKIN} stroke={INK} strokeWidth={4} />
    </g>
  );
  const foot = (l: number) => (
    <g>
      <ellipse cx={10} cy={l + 10} rx={30} ry={15} fill="#f4f1ea" stroke={INK} strokeWidth={4} />
      <rect x={-18} y={l + 18} width={58} height={7} rx={3} fill={GOLD} stroke={INK} strokeWidth={2} />
    </g>
  );
  return (
    <g>
      {shadow ? <ellipse cx={x} cy={ground + 8} rx={120 * scale} ry={16 * scale} fill="#000" opacity={0.4} /> : null}
      <g transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`} style={rim ? { filter: `drop-shadow(0 0 10px ${rim})` } : undefined}>
        <Limb x={-24} y={0} a={pose.lh} b={pose.lk} l1={100} l2={105} w={40} c={JEANS} end={foot} />
        <Limb x={24} y={0} a={pose.rh} b={pose.rk} l1={100} l2={105} w={40} c={JEANS} end={foot} />
        <g transform={`rotate(${pose.torso}) translate(0 ${breathe * 0.5})`}>
          <Limb x={-60} y={-150} a={pose.ls} b={pose.le} l1={80} l2={80} w={34} c={JACKET} end={hand} />
          {/* Torso: jacket open over a white tee */}
          <path d="M-66,-168 Q0,-186 66,-168 L54,14 Q0,26 -54,14 Z" fill={JACKET} stroke={INK} strokeWidth={OUT} strokeLinejoin="round" />
          <path d="M-20,-176 L20,-176 L14,10 L-14,10 Z" fill="#f4f1ea" />
          <path d="M-20,-176 L-14,10 M20,-176 L14,10" stroke={INK} strokeWidth={4} />
          <path d="M-58,-160 Q-40,-80 -50,8" stroke={JACKET_HI} strokeWidth={5} fill="none" />
          {/* High collar */}
          <path d="M-34,-196 L-26,-170 L-20,-176 L-24,-200 Z M34,-196 L26,-170 L20,-176 L24,-200 Z" fill={JACKET} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <Limb x={60} y={-150} a={pose.rs} b={pose.re} l1={80} l2={80} w={34} c={JACKET} end={phone ? phoneHand : hand} />
          {/* Neck and head */}
          <rect x={-15} y={-210} width={30} height={30} fill={SKIN} stroke={INK} strokeWidth={4} />
          <g transform={`translate(0 -196) rotate(${pose.head + nod}) translate(0 ${breathe * 0.25})`}>
            <g transform="scale(1.38)"><HeroHead mood={mood} v={v} blink={blink} look={look} tilt={0} /></g>
          </g>
        </g>
      </g>
    </g>
  );
};

import { AbsoluteFill } from "remotion";
import { ARMS_UP, IDLE, KNEEL, LOOK_UP, OPEN_HANDS, Stage } from "./Kit";

/** Review sheet: poses and moods side by side. */
export const HeroTest: React.FC = () => {
  const t = 1.3;
  const cells: [Pose, Mood, string, boolean?][] = [
    [IDLE, "neutral", "idle"], [OPEN_HANDS, "happy", "talk A"], [{ ...IDLE, rs: -40, re: -110 }, "serious", "phone", true],
    [KNEEL, "sad", "kneel"], [LOOK_UP, "worried", "look up"], [ARMS_UP, "happy", "praise"],
  ];
  return (
    <AbsoluteFill style={{ background: "#2a2a36" }}>
      <Stage>
        {cells.map(([p, m, , ph], i) => (
          <g key={i} transform={`translate(${(i % 3) * 360 - 360} ${Math.floor(i / 3) * 900 - 380})`}>
            <Hero pose={p} mood={m} x={540} t={t + i} scale={0.75} phone={ph} words={i === 1 ? [{ text: "hi", start: 0, end: 9 }] : undefined} vt={0.05} />
          </g>
        ))}
      </Stage>
    </AbsoluteFill>
  );
};
