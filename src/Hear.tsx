import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, random, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import {
  ARMS_UP, BottomLogo, Captions, Character, CRIMSON, EndCard, FONTS, FPS, GOLD, GROUND, H, HEAD_DOWN,
  Headline, IDLE, KNEEL, lerp, LOOK_UP, OPEN_HANDS, Pose, posed, prog, REACH, Scene, Stage, useT, Verse,
  Vignette, W, Word, WRITE,
} from "./Kit";
import raw from "./data/hear-raw.json";

/* ---------- Data ---------- */

// Drop the voice-direction tags ("[slower, with weight]") the aligner returned as words.
const WORDS: Word[] = (() => {
  let inTag = false;
  return (raw as { words: (Word & { type?: string })[] }).words.filter((w) => {
    if (w.type && w.type !== "word") return false;
    const opens = w.text.startsWith("[");
    const closes = w.text.endsWith("]");
    if (opens) inTag = true;
    const skip = inTag;
    if (closes) inTag = false;
    return !skip;
  });
})();

export const HEAR_SECONDS = 93;
const END = 88.9;

// Letter colours for the acronym: warm, electric, pink, violet.
export const C = { H: GOLD, E: "#3dd6ff", A: "#ff5c8a", R: "#a98bff" };
export const INK = "#06070d";
const { anton, inter, playfair } = FONTS;

export const backOut = Easing.bezier(0.34, 1.56, 0.64, 1);
export const snap = Easing.bezier(0.16, 1, 0.3, 1);

/* ---------- Gen Z motion pieces ---------- */

/** A tilted, outlined label that pops in with a little overshoot and then floats. */
export const Sticker: React.FC<{
  at: number; x: number; y: number; rot?: number; bg?: string; color?: string; size?: number; children: React.ReactNode; out?: number;
}> = ({ at, x, y, rot = -4, bg = "#fff", color = INK, size = 44, children, out }) => {
  const t = useT();
  const p = prog(t, at, at + 0.38, backOut);
  const o = out !== undefined ? 1 - prog(t, out, out + 0.25) : 1;
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) rotate(${rot + Math.sin(t * 1.3 + x) * 1.2}deg) scale(${p})`,
        fontFamily: inter, fontWeight: 800, fontSize: size, color, background: bg, padding: "14px 28px", borderRadius: 22,
        border: "5px solid #fff", boxShadow: "0 12px 34px rgba(0,0,0,.45)", whiteSpace: "nowrap", opacity: o, letterSpacing: 0.5,
      }}
    >
      {children}
    </div>
  );
};

/** One acronym tile. */
export const Tile: React.FC<{ l: keyof typeof C; size?: number; glow?: number }> = ({ l, size = 200, glow = 1 }) => (
  <div
    style={{
      width: size, height: size, borderRadius: size * 0.22, background: "rgba(10,10,18,.82)", border: `${size * 0.035}px solid ${C[l]}`,
      display: "flex", alignItems: "center", justifyContent: "center", fontFamily: anton, fontSize: size * 0.7, color: C[l],
      boxShadow: `0 0 ${60 * glow}px ${C[l]}88, inset 0 0 ${30 * glow}px ${C[l]}33`, textShadow: `0 0 ${24 * glow}px ${C[l]}aa`,
    }}
  >
    {l}
  </div>
);

/** Big letter badge that sits in the top-left while its section plays. */
export const LetterBadge: React.FC<{ l: keyof typeof C; word: string }> = ({ l, word }) => {
  const t = useT();
  const p = prog(t, 0, 0.5, snap);
  return (
    <AbsoluteFill style={{ paddingTop: 196, paddingLeft: 66 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 22, opacity: p, translate: `${lerp(-60, 0, p)}px 0` }}>
        <Tile l={l} size={120} glow={0.7} />
        <div style={{ fontFamily: anton, fontSize: 64, color: "#fff", letterSpacing: 4, textShadow: "0 4px 18px rgba(0,0,0,.8)" }}>{word}</div>
      </div>
    </AbsoluteFill>
  );
};

/** Photo with a slow Ken Burns move and a soft grade. */
export const Photo: React.FC<{
  src: string; from?: [number, number, number]; to?: [number, number, number]; dur: number; grade?: string; style?: React.CSSProperties;
}> = ({ src, from = [1.1, 0, 0], to = [1.25, 0, 0], dur, grade = "saturate(.85) contrast(1.08) brightness(.8)", style }) => {
  const t = useT();
  const p = prog(t, 0, dur, Easing.inOut(Easing.sin));
  const s = lerp(from[0], to[0], p);
  const x = lerp(from[1], to[1], p);
  const y = lerp(from[2], to[2], p);
  return (
    <AbsoluteFill style={{ overflow: "hidden", ...style }}>
      <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `translate(${x}px, ${y}px) scale(${s})`, filter: grade }} />
    </AbsoluteFill>
  );
};

export const Credit: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: 1300, textAlign: "center", fontFamily: inter, fontWeight: 800, fontSize: 21, color: "#fff", opacity: 0.55 }}>
    {text}
  </div>
);

/** Floating motes, soft and slow so the frame never feels static. */
export const Motes: React.FC<{ c?: string; n?: number; seed?: string; rise?: number }> = ({ c = "#ffe7b0", n = 30, seed = "m", rise = 18 }) => {
  const t = useT();
  return (
    <g>
      {Array.from({ length: n }).map((_, i) => {
        const x = random(`${seed}x${i}`) * W;
        const y = (((random(`${seed}y${i}`) * H - t * rise * (0.4 + random(`${seed}s${i}`))) % H) + H) % H;
        return <circle key={i} cx={x + Math.sin(t * 0.8 + i) * 18} cy={y} r={1.5 + random(`${seed}r${i}`) * 3.5} fill={c} opacity={0.2 + 0.5 * Math.abs(Math.sin(t + i))} />;
      })}
    </g>
  );
};

export const Glow: React.FC<{ cx: number; cy: number; r: number; c: string; o?: number }> = ({ cx, cy, r, c, o = 0.5 }) => (
  <circle cx={cx} cy={cy} r={r} fill={c} opacity={o} style={{ filter: `blur(${r * 0.35}px)` }} />
);

export const Bg: React.FC<{ top: string; bottom: string; id: string }> = ({ top, bottom, id }) => (
  <>
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={top} />
        <stop offset="1" stopColor={bottom} />
      </linearGradient>
    </defs>
    <rect width={W} height={H} fill={`url(#${id})`} />
  </>
);

/** Waveform drawn as a smooth path; amp in px. */
export const Wave: React.FC<{ y: number; amp: number; freq: number; c: string; w?: number; speed?: number; o?: number }> = ({ y, amp, freq, c, w = 6, speed = 3, o = 1 }) => {
  const t = useT();
  const pts = Array.from({ length: 121 }, (_, i) => {
    const x = (i / 120) * W;
    const env = Math.sin((i / 120) * Math.PI);
    return `${x.toFixed(1)},${(y + Math.sin(i * freq + t * speed) * amp * env * (0.7 + 0.3 * Math.sin(i * 0.37 + t))).toFixed(1)}`;
  }).join(" ");
  return <polyline points={pts} fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" opacity={o} style={{ filter: `drop-shadow(0 0 10px ${c})` }} />;
};

export const Fingerprint: React.FC<{ x: number; y: number; s?: number; p?: number; c?: string }> = ({ x, y, s = 1, p = 1, c = GOLD }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} opacity={p} style={{ filter: `drop-shadow(0 0 10px ${c})` }}>
    {Array.from({ length: 7 }).map((_, i) => {
      const r = 12 + i * 9;
      const len = 2 * Math.PI * r;
      return <ellipse key={i} rx={r * 0.78} ry={r} fill="none" stroke={c} strokeWidth={7} strokeLinecap="round" strokeDasharray={`${len * 0.62} ${len}`} strokeDashoffset={len * (1 - p) + i * 9} transform={`rotate(${i * 23 - 30})`} />;
    })}
  </g>
);

export const PRAY: Pose = { ...HEAD_DOWN, ls: -14, le: -118, rs: 14, re: 118 };

/* ---------- Scenes ---------- */

export const SHook = () => {
  const t = useT();
  const rain = Array.from({ length: 70 });
  return (
    <>
      <Stage>
        <Bg id="hk" top="#05060c" bottom="#0c1022" />
        <rect x={250} y={330} width={580} height={620} rx={18} fill="#16213f" />
        <g clipPath="url(#win)">
          <clipPath id="win"><rect x={270} y={350} width={540} height={580} rx={10} /></clipPath>
          <rect x={270} y={350} width={540} height={580} fill="#0d1631" />
          <circle cx={650} cy={470} r={64} fill="#dfe8ff" opacity={0.85} />
          <Glow cx={650} cy={470} r={160} c="#8fb0ff" o={0.35} />
          {rain.map((_, i) => {
            const x = 270 + random(`rx${i}`) * 560;
            const y = 350 + (((random(`ry${i}`) * 600 + t * 900) % 600));
            return <line key={i} x1={x} y1={y} x2={x - 8} y2={y + 34} stroke="#9fb6ff" strokeWidth={2.5} opacity={0.35} />;
          })}
        </g>
        <rect x={536} y={350} width={10} height={580} fill="#16213f" />
        <rect x={270} y={634} width={540} height={10} fill="#16213f" />
        <path d={`M270,930 L810,930 L1040,${GROUND + 200} L40,${GROUND + 200} Z`} fill="#8fb0ff" opacity={0.08} />
        <rect y={GROUND - 40} width={W} height={700} fill="#090b14" />
        <rect x={-40} y={GROUND - 250} width={330} height={220} rx={26} fill="#1b2240" />
        <rect x={-40} y={GROUND - 290} width={300} height={70} rx={26} fill="#e9ecf5" opacity={0.9} />
        <ellipse cx={720} cy={GROUND - 4} rx={60} ry={12} fill="#7fd0ff" opacity={0.25 + 0.1 * Math.sin(t * 3)} style={{ filter: "blur(8px)" }} />
        <rect x={680} y={GROUND - 18} width={84} height={14} rx={5} fill="#0e1424" stroke="#5ab8ff" strokeWidth={2} />
        <Character look="seeker" pose={KNEEL} x={520} t={t} scale={1.08} rim="#8fb0ff" />
        <Motes c="#b9cbff" n={18} seed="hk" rise={8} />
      </Stage>
      <Sticker at={0.15} x={300} y={250} rot={-5} bg={CRIMSON} color="#fff" size={40}>POV: you're still waiting</Sticker>
      {t < 2.05 ? (
        <Headline kinetic lines={["I've prayed", ["for years", GOLD]]} at={0.4} size={132} top={330} />
      ) : (
        <Headline kinetic lines={["God has never", "said a", ["single word", GOLD]]} at={2.1} size={118} top={300} />
      )}
    </>
  );
};

const SRoutine = () => {
  const t = useT();
  const stage = t < 1.2 ? 0 : t < 2.24 ? 1 : 2;
  const items: [string, number][] = [["CHURCH", 0.2], ["PRAY", 1.4], ["WORSHIP", 2.4]];
  return (
    <>
      <Stage>
        {stage === 0 ? (
          <g>
            <Bg id="ch" top="#120a1f" bottom="#08060d" />
            <path d="M330,980 L330,520 Q540,250 750,520 L750,980 Z" fill="#2b1b4a" />
            {[0, 1, 2].map((i) => (
              <path key={i} d={`M${370 + i * 120},960 L${370 + i * 120},600 Q${420 + i * 120},500 ${470 + i * 120},600 L${470 + i * 120},960 Z`} fill={[C.A, GOLD, C.E][i]} opacity={0.55} />
            ))}
            <Glow cx={540} cy={700} r={260} c="#b48cff" o={0.25} />
            {[0, 1].map((r) => <rect key={r} x={60} y={GROUND - 120 + r * 70} width={960} height={36} rx={10} fill="#3a2414" />)}
            <Character look="seeker" pose={IDLE} x={540} t={t} scale={0.95} rim="#b48cff" />
          </g>
        ) : stage === 1 ? (
          <g>
            <Bg id="pr" top="#0b0a08" bottom="#1a120a" />
            <Glow cx={540} cy={820} r={340} c="#ffb24d" o={0.32} />
            <Character look="seeker" pose={PRAY} x={540} t={t} scale={1.12} rim={GOLD} />
          </g>
        ) : (
          <g>
            <Bg id="wo" top="#070513" bottom="#140a26" />
            {[0, 1, 2, 3].map((i) => (
              <path key={i} transform={`rotate(${Math.sin(t * 1.2 + i * 1.6) * 16} ${180 + i * 240} 0)`} d={`M${180 + i * 240},0 L${100 + i * 240},${GROUND} L${260 + i * 240},${GROUND} Z`} fill={[C.E, C.A, GOLD, C.R][i]} opacity={0.16} />
            ))}
            <rect y={GROUND - 40} width={W} height={700} fill="#0d0819" />
            {[150, 330, 750, 930].map((x, i) => <Character key={x} look="shadow" pose={ARMS_UP} x={x} t={t + i} scale={0.74} />)}
            <Character look="seeker" pose={ARMS_UP} x={540} t={t} scale={1.02} rim={C.E} />
          </g>
        )}
      </Stage>
      <AbsoluteFill style={{ paddingTop: 280, alignItems: "center", gap: 22 }}>
        {items.map(([label, at]) => {
          const p = prog(t, at, at + 0.35, backOut);
          return (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 24, background: "rgba(8,8,14,.72)", border: "3px solid rgba(255,255,255,.18)", borderRadius: 28, padding: "18px 40px", width: 600, scale: String(p), opacity: p }}>
              <div style={{ width: 62, height: 62, borderRadius: 18, background: "#3ddc84", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: inter, fontWeight: 800, fontSize: 44, color: INK }}>✓</div>
              <div style={{ fontFamily: anton, fontSize: 84, color: "#fff", letterSpacing: 3 }}>{label}</div>
            </div>
          );
        })}
      </AbsoluteFill>
    </>
  );
};

const SNothing = () => {
  const t = useT();
  const bolt = prog(t, 1.3, 1.65) * (1 - prog(t, 1.75, 2.3));
  const boltPath = "M600,420 L540,640 L610,640 L520,900";
  return (
    <>
      <Stage>
        <Bg id="sk" top="#0a0d16" bottom="#1a1f2e" />
        {[0, 1, 2, 3, 4].map((i) => (
          <ellipse key={i} cx={((i * 260 + t * 30) % 1400) - 160} cy={470 + (i % 2) * 90} rx={260} ry={90} fill="#2a3042" opacity={0.85} />
        ))}
        <path d={boltPath} fill="none" stroke="#e8f0ff" strokeWidth={14} strokeLinejoin="round" strokeDasharray="700" strokeDashoffset={700 * (1 - bolt)} opacity={bolt * 0.9} style={{ filter: "drop-shadow(0 0 16px #9fc3ff)" }} />
        <rect y={GROUND - 40} width={W} height={700} fill="#0b0d13" />
        <Character look="seeker" pose={LOOK_UP} x={540} t={t} scale={0.86} />
      </Stage>
      <AbsoluteFill style={{ paddingTop: 280, alignItems: "center" }}>
        {(
          [["NO VOICE.", 0.15], ["NO LIGHTNING.", 1.4], ["NOTHING.", 2.36]] as [string, number][]
        ).map(([s, at], i) => {
          const p = prog(t, at, at + 0.3, snap);
          const last = i === 2;
          return (
            <div key={s} style={{ fontFamily: anton, fontSize: last ? 170 : 104, lineHeight: 1.08, color: last ? GOLD : "#fff", opacity: p * (last ? 1 : lerp(1, 0.4, prog(t, 2.36, 2.7))), translate: `0 ${lerp(30, 0, p)}px`, textShadow: "0 6px 0 rgba(0,0,0,.5)" }}>
              {s}
            </div>
          );
        })}
      </AbsoluteFill>
      {/* Message left on delivered */}
      <AbsoluteFill style={{ top: 1040, alignItems: "flex-end", paddingRight: 90 }}>
        <div style={{ opacity: prog(t, 0.6, 0.9), translate: `0 ${lerp(30, 0, prog(t, 0.6, 0.9, snap))}px` }}>
          <div style={{ background: "#2f7bff", color: "#fff", fontFamily: inter, fontWeight: 800, fontSize: 40, padding: "20px 30px", borderRadius: "34px 34px 8px 34px" }}>God, are You there?</div>
          <div style={{ textAlign: "right", fontFamily: inter, fontWeight: 800, fontSize: 24, color: "#9aa3b5", marginTop: 8 }}>Delivered</div>
        </div>
      </AbsoluteFill>
    </>
  );
};

const SReal = () => {
  const t = useT();
  const dots = Array.from({ length: 46 });
  return (
    <>
      <Stage>
        <defs>
          <radialGradient id="rv" cx="50%" cy="42%" r="70%"><stop offset="0" stopColor="#1d1430" /><stop offset="1" stopColor={INK} /></radialGradient>
        </defs>
        <rect width={W} height={H} fill="url(#rv)" />
        {dots.map((_, i) => {
          // Points along a question mark path, drifting into place.
          const a = (i / 34) * Math.PI * 1.5 - Math.PI;
          const qx = i < 34 ? 430 + Math.cos(a) * 150 : 430;
          const qy = i < 34 ? 700 + Math.sin(a) * 150 : 880 + (i - 34) * 14;
          const sx = random(`qx${i}`) * W;
          const sy = random(`qy${i}`) * H;
          const p = prog(t, 0.1 + i * 0.012, 1.3 + i * 0.012, snap);
          return <circle key={i} cx={lerp(sx, qx, p)} cy={lerp(sy, qy, p)} r={i === 45 ? 18 : 9} fill={GOLD} opacity={0.9} style={{ filter: "drop-shadow(0 0 8px #ffc94d)" }} />;
        })}
        <rect y={GROUND - 40} width={W} height={700} fill="#07060b" />
        <Character look="seeker" pose={{ ...LOOK_UP, head: -10 }} x={790} t={t} scale={0.9} rim={GOLD} flip />
      </Stage>
      <Headline kinetic lines={["Is He even", ["real?", GOLD]]} at={1.2} size={124} top={250} />
    </>
  );
};

const SAlone = () => {
  const t = useT();
  const cols = 6;
  const rows = 9;
  return (
    <>
      <Stage>
        <rect width={W} height={H} fill="#05060b" />
        <rect x={70} y={220} width={940} height={1060} fill="#0e1120" />
        {Array.from({ length: cols * rows }).map((_, i) => {
          const c = i % cols;
          const r = Math.floor(i / cols);
          const on = prog(t, random(`w${i}`) * 1.4, random(`w${i}`) * 1.4 + 0.2);
          return (
            <g key={i}>
              <rect x={110 + c * 150} y={260 + r * 112} width={110} height={78} rx={6} fill="#ffcf7a" opacity={0.08 + 0.75 * on} />
              {on > 0.5 ? (
                <g transform={`translate(${165 + c * 150} ${334 + r * 112}) scale(0.18)`}>
                  <circle cy={-300} r={60} fill="#3a2a14" />
                  <path d="M-80,-220 Q0,-260 80,-220 L60,0 L-60,0 Z" fill="#3a2a14" />
                </g>
              ) : null}
            </g>
          );
        })}
      </Stage>
      <Sticker at={0.3} x={540} y={1250} rot={3} bg={GOLD} size={52}>you + millions of others</Sticker>
    </>
  );
};

const SElijah = () => {
  const t = useT();
  // Local beats, in seconds from this scene's start (16.75).
  const wind = prog(t, 1.8, 2.2) * (1 - prog(t, 2.6, 3.0));
  const quake = prog(t, 2.65, 2.9) * (1 - prog(t, 3.5, 3.8));
  const fire = prog(t, 3.6, 4.0) * (1 - prog(t, 4.5, 5.0));
  const pose = posed(t, [[0, IDLE], [1.5, LOOK_UP], [4.5, LOOK_UP], [5.3, HEAD_DOWN]]);
  return (
    <>
      <Stage>
        <Bg id="hb" top="#140c0a" bottom="#3a1f14" />
        <path d={`M-100,${GROUND} L180,560 L420,820 L620,420 L1180,${GROUND} Z`} fill="#24130d" />
        <path d={`M560,${GROUND} L640,980 Q700,900 760,980 L800,${GROUND} Z`} fill="#0a0504" />
        {/* wind */}
        {Array.from({ length: 22 }).map((_, i) => {
          const y = 300 + random(`wy${i}`) * 900;
          const x = ((random(`wx${i}`) * W + t * 2400) % (W + 600)) - 300;
          return <line key={i} x1={x} y1={y} x2={x + 260} y2={y - 20} stroke="#e8dccb" strokeWidth={4} strokeLinecap="round" opacity={0.55 * wind} />;
        })}
        {/* earthquake cracks */}
        <path d={`M120,${GROUND - 30} L260,${GROUND - 10} L330,${GROUND + 40} L470,${GROUND + 20} L560,${GROUND + 90}`} fill="none" stroke="#ff8a3d" strokeWidth={8} opacity={quake} style={{ filter: "drop-shadow(0 0 12px #ff6a1a)" }} />
        {/* fire */}
        <g opacity={fire}>
          {Array.from({ length: 9 }).map((_, i) => {
            const x = 80 + i * 115;
            const h = 180 + Math.sin(t * 14 + i * 2) * 50 + random(`f${i}`) * 80;
            return <path key={i} d={`M${x - 55},${GROUND} Q${x - 40},${GROUND - h * 0.6} ${x},${GROUND - h} Q${x + 40},${GROUND - h * 0.6} ${x + 55},${GROUND} Z`} fill={i % 2 ? "#ff7a1a" : "#ffc24d"} opacity={0.85} />;
          })}
          <Glow cx={540} cy={GROUND - 120} r={420} c="#ff6a1a" o={0.35} />
        </g>
        <rect y={GROUND - 40} width={W} height={700} fill="#120806" />
        <Character look="elijah" pose={pose} x={680} t={t} scale={0.95} rim={fire > 0.2 ? "#ff8a3d" : "#e8c9a0"} />
        <Motes c="#ffb47a" n={20} seed="el" rise={30} />
      </Stage>
      <Verse text="Elijah on the mountain" cite="1 KINGS 19:11–12" at={0.1} top={260} />
      <AbsoluteFill style={{ paddingTop: 560, alignItems: "flex-start", paddingLeft: 90, gap: 14 }}>
        {(
          [["WIND", 1.85], ["EARTHQUAKE", 2.7], ["FIRE", 3.65]] as [string, number][]
        ).map(([s, at]) => {
          const p = prog(t, at, at + 0.3, backOut);
          const strike = prog(t, 4.45, 4.8, snap);
          return (
            <div key={s} style={{ position: "relative", fontFamily: anton, fontSize: 96, color: "#fff", opacity: p, scale: String(p), transformOrigin: "left center", textShadow: "0 5px 0 rgba(0,0,0,.5)" }}>
              {s}
              <div style={{ position: "absolute", left: -10, top: "52%", height: 12, width: `${strike * 108}%`, background: CRIMSON, borderRadius: 6 }} />
            </div>
          );
        })}
      </AbsoluteFill>
      {t > 4.45 ? <Sticker at={4.5} x={540} y={1180} rot={-3} bg="#fff" size={46}>God wasn't in any of them</Sticker> : null}
    </>
  );
};

const SWhisper = () => {
  const t = useT();
  const word = "a whisper.";
  return (
    <>
      <Stage>
        <rect width={W} height={H} fill="#030305" />
        <Glow cx={540} cy={760} r={300 + Math.sin(t * 2) * 20} c="#fff1c7" o={0.18 * prog(t, 0, 1)} />
        <path d={`M560,${GROUND} L640,980 Q700,900 760,980 L800,${GROUND} Z`} fill="#fff1c7" opacity={0.06} />
        <Character look="elijah" pose={{ ...HEAD_DOWN, ls: -30, le: -130, rs: 30, re: 130, head: 14 }} x={680} t={t} scale={0.9} rim="#fff1c7" />
        <Motes c="#fff6dc" n={14} seed="wh" rise={6} />
      </Stage>
      <AbsoluteFill style={{ paddingTop: 420, alignItems: "center" }}>
        <div style={{ fontFamily: inter, fontWeight: 800, fontSize: 40, letterSpacing: 10, color: "#fff", opacity: 0.7 * prog(t, 0, 0.4) }}>HE CAME IN</div>
        <div style={{ fontFamily: playfair, fontStyle: "italic", fontSize: 190, color: "#fff6dc", marginTop: 10, textShadow: "0 0 40px rgba(255,236,180,.45)" }}>
          {word.split("").map((ch, i) => (
            <span key={i} style={{ opacity: prog(t, 0.3 + i * 0.045, 0.65 + i * 0.045), filter: `blur(${lerp(10, 0, prog(t, 0.3 + i * 0.045, 0.75 + i * 0.045))}px)` }}>{ch}</span>
          ))}
        </div>
      </AbsoluteFill>
    </>
  );
};

export const SWrongThing = () => {
  const t = useT();
  const sw = prog(t, 2.6, 3.4, snap); // thunder wave gives way to a whisper wave
  const tiles = prog(t, 5.1, 5.6);
  return (
    <>
      <Stage>
        <Bg id="wt" top="#05060c" bottom="#0e0b1c" />
        <Wave y={820} amp={lerp(260, 6, sw)} freq={lerp(0.9, 0.18, sw)} c={sw < 0.5 ? "#ff5c5c" : GOLD} w={lerp(10, 5, sw)} speed={lerp(9, 2, sw)} o={1 - tiles} />
        <Wave y={820} amp={lerp(160, 4, sw)} freq={lerp(1.3, 0.24, sw)} c={sw < 0.5 ? "#ff9a5c" : "#fff1c7"} w={3} speed={lerp(7, 1.5, sw)} o={(1 - tiles) * 0.6} />
      </Stage>
      <AbsoluteFill style={{ top: 1010, alignItems: "center", opacity: 1 - tiles }}>
        <div style={{ fontFamily: inter, fontWeight: 800, fontSize: 34, letterSpacing: 6, color: "#9aa3b5" }}>LISTENING FOR</div>
        <div style={{ position: "relative", height: 130, width: 900 }}>
          <div style={{ position: "absolute", inset: 0, textAlign: "center", fontFamily: anton, fontSize: 116, color: "#ff5c5c", opacity: 1 - sw, translate: `0 ${-40 * sw}px` }}>THUNDER</div>
          <div style={{ position: "absolute", inset: 0, textAlign: "center", fontFamily: playfair, fontStyle: "italic", fontSize: 116, color: GOLD, opacity: sw, translate: `0 ${40 * (1 - sw)}px` }}>a whisper</div>
        </div>
      </AbsoluteFill>
      {t < 5.1 ? (
        t < 2.1 ? (
          <Headline kinetic lines={["The problem", ["isn't silence", GOLD]]} at={0.2} size={124} top={300} />
        ) : (
          <Headline kinetic lines={["We're listening", "for the", ["wrong thing", CRIMSON]]} at={2.15} size={112} top={290} />
        )
      ) : null}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 26, top: -120 }}>
        {(["H", "E", "A", "R"] as const).map((l, i) => {
          const p = prog(t, 5.1 + i * 0.12, 5.5 + i * 0.12, backOut);
          return <div key={l} style={{ scale: String(p), rotate: `${lerp(-30, 0, p)}deg`, opacity: p }}><Tile l={l} size={210} /></div>;
        })}
      </AbsoluteFill>
      <AbsoluteFill style={{ top: 1090, alignItems: "center" }}>
        <div style={{ fontFamily: inter, fontWeight: 800, fontSize: 44, letterSpacing: 8, color: "#fff", opacity: prog(t, 5.5, 5.9) }}>HOW TO HEAR HIM</div>
      </AbsoluteFill>
    </>
  );
};

const SHistory = () => {
  const t = useT();
  const roll = prog(t, 0.2, 2.2, Easing.inOut(Easing.cubic));
  const rays = prog(t, 1.2, 3);
  return (
    <>
      <Stage>
        <Bg id="hs" top="#1b0f2a" bottom="#f0a050" />
        <Glow cx={540} cy={1010} r={420} c="#ffd27a" o={0.5} />
        <g transform={`rotate(${t * 3} 430 960)`} opacity={0.22 * rays}>
          {Array.from({ length: 14 }).map((_, i) => (
            <path key={i} transform={`rotate(${i * (360 / 14)} 430 960)`} d="M430,960 L400,-200 L460,-200 Z" fill="#fff3cc" />
          ))}
        </g>
        <path d={`M-80,${GROUND} L-80,760 Q240,560 620,690 Q900,780 1160,720 L1160,${GROUND} Z`} fill="#3b2418" />
        <ellipse cx={430} cy={1040} rx={150} ry={170} fill="#120804" />
        <ellipse cx={430} cy={1040} rx={150} ry={170} fill="#fff1c7" opacity={0.85 * rays} style={{ filter: "blur(18px)" }} />
        <g transform={`translate(${lerp(430, 700, roll)} 1060) rotate(${roll * 120})`}>
          <circle r={175} fill="#5b4030" />
          <circle r={175} fill="none" stroke="#3a2618" strokeWidth={14} />
          <path d="M-60,-120 L-20,-60 L-40,-10 M40,30 L90,70 M-110,60 L-60,90" stroke="#3a2618" strokeWidth={8} fill="none" strokeLinecap="round" />
          <circle r={175} fill="none" stroke="#7a5a44" strokeWidth={6} strokeDasharray="40 30" opacity={0.6} />
        </g>
        <rect y={GROUND - 40} width={W} height={700} fill="#24150e" />
        <Motes c="#fff1c7" n={24} seed="hs" rise={14} />
      </Stage>
      <LetterBadge l="H" word="HISTORY" />
      {t < 3.7 ? (
        <Headline kinetic lines={["Faith on facts", ["not feelings", GOLD]]} at={1.8} size={104} top={400} />
      ) : t < 7.4 ? (
        <Headline kinetic lines={["An", ["empty tomb", GOLD]]} at={3.8} size={130} top={400} />
      ) : (
        <Headline kinetic lines={["Louder than", ["any voice", GOLD], "from the sky"]} at={7.5} size={104} top={380} />
      )}
      <Sticker at={5.9} x={760} y={1230} rot={4} bg="#fff" size={34} out={9.9}>500+ eyewitnesses · 1 Cor 15:6</Sticker>
    </>
  );
};

const SEveryPage = () => {
  const t = useT();
  const flip = (t * 3) % 1;
  return (
    <>
      <Stage>
        <Bg id="ep" top="#04121a" bottom="#071f2a" />
        <Glow cx={540} cy={900} r={360} c={C.E} o={0.28} />
        <g transform="translate(540 930)">
          <path d="M-360,-220 Q-180,-260 0,-200 L0,200 Q-180,140 -360,180 Z" fill="#f3ead6" />
          <path d="M360,-220 Q180,-260 0,-200 L0,200 Q180,140 360,180 Z" fill="#e9dfc7" />
          <path d={`M0,-200 Q${lerp(180, -180, flip)},${-250 + Math.sin(flip * Math.PI) * -40} ${lerp(360, -360, flip)},-220 L${lerp(360, -360, flip)},180 Q${lerp(180, -180, flip)},140 0,200 Z`} fill="#fffaf0" opacity={0.9} />
          {Array.from({ length: 9 }).map((_, i) => (
            <g key={i}>
              <rect x={-320} y={-160 + i * 36} width={260 - (i % 3) * 30} height={8} rx={4} fill="#8a7b62" opacity={0.5} />
              <rect x={50} y={-160 + i * 36} width={270 - (i % 2) * 40} height={8} rx={4} fill="#8a7b62" opacity={0.5} />
            </g>
          ))}
        </g>
      </Stage>
      <LetterBadge l="E" word="EVERY PAGE" />
    </>
  );
};

const S1947 = () => {
  const t = useT();
  const year = Math.round(lerp(1900, 1947, prog(t, 0, 1.1, Easing.out(Easing.cubic))));
  return (
    <>
      <Photo src="hear/qumran-caves.jpg" dur={3} from={[1.25, 0, 0]} to={[1.45, -60, -20]} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(4,8,14,.75), rgba(4,8,14,.2) 45%, rgba(4,8,14,.85))" }} />
      <AbsoluteFill style={{ paddingTop: 330, alignItems: "center" }}>
        <div style={{ fontFamily: anton, fontSize: 290, color: "#fff", letterSpacing: 6, textShadow: `0 0 50px ${C.E}88, 0 8px 0 rgba(0,0,0,.5)` }}>{year}</div>
      </AbsoluteFill>
      <Sticker at={0.9} x={540} y={760} rot={-3} bg={C.E} size={44}>⌖ Qumran · by the Dead Sea</Sticker>
      <LetterBadge l="E" word="EVERY PAGE" />
      <Credit text="Photo: James Emery / CC BY 2.0" />
    </>
  );
};

const SCave = () => {
  const t = useT();
  return (
    <>
      <Photo src="hear/qumran-cave.jpg" dur={4.2} from={[1.5, 0, 40]} to={[1.9, 60, 80]} />
      {/* On "scrolls", the cave gives way to the Great Isaiah Scroll itself. */}
      <AbsoluteFill style={{ background: "#0b0805", opacity: prog(t, 0.85, 1.35) }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 420, height: 760, overflow: "hidden", opacity: prog(t, 0.85, 1.35), boxShadow: "0 0 80px rgba(0,0,0,.8)" }}>
        <Img
          src={staticFile("hear/isaiah-strip.jpg")}
          style={{ height: 760, width: 760 * (3840 / 648), maxWidth: "none", filter: "sepia(.15) contrast(1.1) brightness(.9)", transform: `translateX(${lerp(-200, -2600, prog(t, 0.85, 4.2, Easing.inOut(Easing.sin)))}px)` }}
        />
      </div>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(4,8,14,.8), transparent 40%, rgba(4,8,14,.85))" }} />
      <Headline kinetic lines={["Shepherds found", ["scrolls", C.E]]} at={0.1} size={112} top={300} />
      {/* Timeline: 1,000 years */}
      <AbsoluteFill style={{ top: 920, alignItems: "center" }}>
        <div style={{ width: 880, opacity: prog(t, 1.3, 1.7), background: "rgba(4,10,18,.78)", borderRadius: 30, padding: "30px 36px", border: `3px solid ${C.E}55` }}>
          <div style={{ fontFamily: anton, fontSize: 70, color: C.E, textAlign: "center" }}>1,000 YEARS OLDER</div>
          <div style={{ position: "relative", height: 70, marginTop: 20 }}>
            <div style={{ position: "absolute", top: 30, left: 20, right: 20, height: 8, background: "rgba(255,255,255,.2)", borderRadius: 4 }} />
            <div style={{ position: "absolute", top: 30, left: 20, width: `${prog(t, 1.6, 2.8, snap) * 95}%`, height: 8, background: C.E, borderRadius: 4, boxShadow: `0 0 16px ${C.E}` }} />
            <div style={{ position: "absolute", top: 18, left: 8, width: 32, height: 32, borderRadius: 16, background: GOLD }} />
            <div style={{ position: "absolute", top: 18, right: 8, width: 32, height: 32, borderRadius: 16, background: "#fff", opacity: prog(t, 2.6, 2.9) }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: inter, fontWeight: 800, fontSize: 30, color: "#fff" }}>
            <span>Scrolls · ~125 BC</span>
            <span style={{ opacity: prog(t, 2.6, 2.9) }}>Oldest copy · ~AD 1000</span>
          </div>
        </div>
      </AbsoluteFill>
      <Credit text={t < 1.1 ? "Photo: Peter van der Sluijs / CC BY-SA 4.0" : "Great Isaiah Scroll (1QIsa) · public domain"} />
    </>
  );
};

const SIsaiah = () => {
  const t = useT();
  const scan = prog(t, 0.5, 2.6, Easing.inOut(Easing.cubic));
  const pct = Math.round(lerp(0, 95, prog(t, 0.9, 2.4, Easing.out(Easing.cubic))));
  return (
    <>
      <Photo src="hear/isaiah53.jpg" dur={4.7} from={[1.15, 0, -60]} to={[1.3, 0, 40]} grade="sepia(.25) contrast(1.1) brightness(.78)" />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(10,6,2,.82), transparent 34%, transparent 60%, rgba(10,6,2,.88))" }} />
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: lerp(500, 1250, scan), height: 6, background: C.E, boxShadow: `0 0 30px 10px ${C.E}88`, opacity: scan > 0 && scan < 1 ? 1 : 0 }} />
      </AbsoluteFill>
      {t < 2.8 ? (
        <Headline kinetic lines={["The words of", ["Isaiah", C.E]]} at={0.05} size={116} top={290} />
      ) : (
        <Headline kinetic lines={["God kept", ["His word", GOLD]]} at={2.85} size={130} top={290} />
      )}
      <AbsoluteFill style={{ top: 1000, alignItems: "center" }}>
        <div style={{ background: "rgba(8,6,4,.82)", borderRadius: 28, padding: "22px 40px", textAlign: "center", opacity: prog(t, 0.9, 1.2), border: `3px solid ${C.E}66` }}>
          <div style={{ fontFamily: anton, fontSize: 108, color: C.E, lineHeight: 1 }}>≈{pct}%</div>
          <div style={{ fontFamily: inter, fontWeight: 800, fontSize: 30, color: "#fff" }}>word-for-word the same</div>
          <div style={{ fontFamily: inter, fontWeight: 800, fontSize: 22, color: "#fff", opacity: 0.6, marginTop: 6 }}>most differences are spelling</div>
        </div>
      </AbsoluteFill>
      <Credit text="Great Isaiah Scroll (1QIsa), Isaiah 53 · public domain" />
    </>
  );
};

const SReadAloud = () => {
  const t = useT();
  return (
    <>
      <Stage>
        <Bg id="ra" top="#0a0c18" bottom="#15100a" />
        <Glow cx={540} cy={960} r={320} c={GOLD} o={0.3} />
        <rect y={GROUND - 40} width={W} height={700} fill="#0d0a08" />
        <Character look="seeker" pose={{ ...WRITE, head: 2, smile: 0.4 }} x={540} t={t} scale={1.1} rim={GOLD} talk={Math.abs(Math.sin(t * 11)) * 0.7} />
        <g transform={`translate(560 ${GROUND - 190})`}>
          <path d="M-90,-10 L0,8 L90,-10 L90,40 L0,58 L-90,40 Z" fill="#f3ead6" />
          <line x1={0} y1={8} x2={0} y2={58} stroke="#a89878" strokeWidth={3} />
          <Glow cx={0} cy={10} r={90} c="#fff1c7" o={0.4} />
        </g>
        {Array.from({ length: 5 }).map((_, i) => {
          const ph = ((t * 0.6 + i / 5) % 1);
          return <path key={i} d={`M${580 + ph * 260},${820 - ph * 120} q20,-30 0,-60`} fill="none" stroke={GOLD} strokeWidth={6} strokeLinecap="round" opacity={(1 - ph) * 0.8} />;
        })}
      </Stage>
      <LetterBadge l="E" word="EVERY PAGE" />
      {t < 2.05 ? (
        <Headline kinetic lines={["Read it", ["out loud", GOLD]]} at={0.1} size={128} top={420} />
      ) : (
        <Headline kinetic lines={["His voice", ["in your mouth", GOLD]]} at={2.1} size={112} top={420} />
      )}
    </>
  );
};

const SText = () => {
  const t = useT();
  const n = prog(t, 0.9, 1.4, backOut);
  return (
    <>
      <Stage>
        <Bg id="tx" top="#1a0812" bottom="#0a0610" />
        <Glow cx={540} cy={900} r={380} c={C.A} o={0.28} />
      </Stage>
      <AbsoluteFill style={{ alignItems: "center", top: 440 }}>
        <div style={{ width: 520, height: 900, borderRadius: 70, background: "linear-gradient(160deg,#2a1a3c,#120a1d)", border: "10px solid #1b1b22", boxShadow: "0 40px 90px rgba(0,0,0,.6)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 60, width: "100%", textAlign: "center", fontFamily: inter, fontWeight: 800, fontSize: 110, color: "#fff" }}>11:47</div>
          <div style={{ position: "absolute", top: 260, left: 22, right: 22, background: "rgba(255,255,255,.88)", borderRadius: 30, padding: "20px 24px", scale: String(n), opacity: n }}>
            <div style={{ fontFamily: inter, fontWeight: 800, fontSize: 22, color: "#6b6b75" }}>MESSAGES · now</div>
            <div style={{ fontFamily: inter, fontWeight: 800, fontSize: 30, color: INK, marginTop: 6 }}>bestie</div>
            <div style={{ fontFamily: inter, fontWeight: 800, fontSize: 28, color: "#22222a", marginTop: 4 }}>randomly thought of you rn. praying for you ♡</div>
          </div>
        </div>
      </AbsoluteFill>
      <LetterBadge l="A" word="AROUND YOU" />
      <Sticker at={1.6} x={760} y={1250} rot={5} bg={C.A} color="#fff" size={40}>perfect timing?</Sticker>
    </>
  );
};

const SSermon = () => {
  const t = useT();
  const arrow = prog(t, 0.6, 1.2, Easing.in(Easing.quad));
  return (
    <>
      <Stage>
        <rect width={W} height={H} fill="#07060a" />
        <path d={`M440,0 L640,0 L780,${GROUND} L300,${GROUND} Z`} fill="#fff1c7" opacity={0.12} />
        <rect x={360} y={GROUND - 260} width={260} height={220} rx={12} fill="#2a1a10" />
        <Character look="preacher" pose={OPEN_HANDS} x={490} ground={GROUND - 210} t={t} scale={0.62} talk={Math.abs(Math.sin(t * 10)) * 0.6} />
        <rect y={GROUND - 40} width={W} height={700} fill="#0b0909" />
        <Character look="seeker" pose={{ ...LOOK_UP, smile: 0.5 }} x={860} t={t} scale={0.8} rim={C.A} />
        <g transform={`translate(${lerp(560, 840, arrow)} ${lerp(900, 1020, arrow)}) rotate(24)`} opacity={arrow < 1 ? 1 : 1 - prog(t, 1.3, 1.6)}>
          <line x1={-90} x2={0} stroke={C.A} strokeWidth={10} strokeLinecap="round" />
          <path d="M0,0 L-30,-18 L-30,18 Z" fill={C.A} />
        </g>
      </Stage>
      <Headline kinetic lines={["The sermon that", ["hit different", C.A]]} at={0.1} size={108} top={330} />
    </>
  );
};

const SPeople = () => {
  const t = useT();
  return (
    <>
      <Stage>
        <Bg id="pp" top="#120a1e" bottom="#1d0d18" />
        <Glow cx={540} cy={1000} r={380} c={C.A} o={0.25} />
        {[0, 1, 2].map((i) => <ellipse key={i} cx={200 + i * 340} cy={420 + (i % 2) * 40} rx={170} ry={60} fill="#2a2238" opacity={lerp(0.9, 0.2, prog(t, 0.6, 1.6))} />)}
        <rect y={GROUND - 40} width={W} height={700} fill="#0e0812" />
        <Character look="friend" pose={{ ...REACH, rs: -70, re: -40 }} x={420} t={t} scale={1} rim={C.A} />
        <Character look="seeker" pose={{ ...IDLE, smile: 1, head: -3 }} x={680} t={t} scale={1} flip rim={C.A} />
      </Stage>
      <AbsoluteFill style={{ paddingTop: 360, alignItems: "center" }}>
        <div style={{ fontFamily: anton, fontSize: 132, whiteSpace: "nowrap", color: "#fff", textShadow: `0 0 40px ${C.A}88`, scale: String(prog(t, 0.1, 0.5, backOut)) }}>
          PEOPLE <span style={{ color: C.A }}>&gt;</span> CLOUDS
        </div>
      </AbsoluteFill>
      <LetterBadge l="A" word="AROUND YOU" />
    </>
  );
};

const SRearview = () => {
  const t = useT();
  const push = prog(t, 3.6, 5.6, Easing.inOut(Easing.cubic));
  const prints = prog(t, 5.8, 6.4);
  const moments: [string, number, number][] = [["that text", 300, 1.6], ["that sermon", 560, 2.2], ["that open door", 800, 2.8]];
  return (
    <>
      <Stage>
        <rect width={W} height={H} fill="#04050a" />
        {/* road ahead, dark */}
        <path d={`M500,880 L580,880 L1000,${H} L80,${H} Z`} fill="#10121a" />
        {Array.from({ length: 6 }).map((_, i) => {
          const ph = (i / 6 + t * 0.4) % 1;
          return <rect key={i} x={536 - ph * 14} y={880 + ph * ph * 1040} width={8 + ph * 28} height={20 + ph * 70} fill="#3a3d48" />;
        })}
        {/* dashboard */}
        <path d={`M0,1260 Q540,1150 1080,1260 L1080,${H} L0,${H} Z`} fill="#0a0b10" />
        {/* mirror */}
        <g transform={`translate(540 ${lerp(400, 820, push)}) scale(${lerp(1, 2.1, push)})`}>
          <rect x={-250} y={-95} width={500} height={190} rx={70} fill="#0c0d12" stroke="#2a2c35" strokeWidth={10} />
          <clipPath id="mir"><rect x={-236} y={-82} width={472} height={164} rx={60} /></clipPath>
          <g clipPath="url(#mir)">
            <rect x={-240} y={-90} width={480} height={180} fill="#2b1a36" />
            <rect x={-240} y={-90} width={480} height={90} fill="#ff9a5c" opacity={0.45} />
            <path d="M-30,-10 L30,-10 L170,90 L-170,90 Z" fill="#ffd27a" opacity={0.85} />
            {moments.map(([, x, at], i) => (
              <circle key={i} cx={-150 + i * 150} cy={30 + (i % 2) * 20} r={14} fill={GOLD} opacity={prog(t, at, at + 0.3)} style={{ filter: "drop-shadow(0 0 6px #ffc94d)" }} />
            ))}
          </g>
        </g>
        <g opacity={prints}>
          <Fingerprint x={250} y={1150} s={1.1} p={prog(t, 5.9, 6.8)} />
          <Fingerprint x={830} y={1120} s={0.9} p={prog(t, 6.1, 7.0)} c={C.R} />
          <Fingerprint x={540} y={1210} s={1.2} p={prog(t, 6.3, 7.2)} />
        </g>
      </Stage>
      <LetterBadge l="R" word="REARVIEW" />
      {push < 0.3
        ? moments.map(([s, x, at], i) => <Sticker key={s} at={at} x={x + 10} y={640 + (i % 2) * 70} rot={i % 2 ? 4 : -4} bg={i === 1 ? C.R : "#fff"} color={i === 1 ? "#fff" : INK} size={34} out={3.6}>{s}</Sticker>)
        : null}
      {t > 4 ? <Headline kinetic lines={["His fingerprints", ["everywhere", GOLD]]} at={4.6} size={108} top={330} /> : <Headline kinetic lines={["Look", ["back", C.R]]} at={4.0} size={150} top={330} />}
    </>
  );
};

const SNoThunder = () => {
  const t = useT();
  return (
    <>
      <Stage>
        <Bg id="nt" top="#0b0e18" bottom="#3a2a3e" />
        {[0, 1, 2, 3].map((i) => <ellipse key={i} cx={((i * 320 + t * 40) % 1500) - 200} cy={480 + (i % 2) * 70} rx={280} ry={90} fill="#262a3c" opacity={0.85 - prog(t, 1.4, 3) * 0.5} />)}
        <Glow cx={540} cy={700} r={300} c="#ffd9a8" o={0.15 + 0.2 * prog(t, 1.5, 3)} />
        <rect y={GROUND - 40} width={W} height={700} fill="#120d16" />
        <Character look="seeker" pose={{ ...LOOK_UP, smile: 0.6, ls: 40, le: 30, rs: -40, re: -30 }} x={540} t={t} scale={1} rim="#ffd9a8" />
        <Motes c="#ffe9c8" n={20} seed="nt" rise={10} />
      </Stage>
      <Headline kinetic lines={["No thunder", ["needed", GOLD]]} at={0.5} size={132} top={330} />
    </>
  );
};

const SFinalHear = () => {
  const t = useT();
  const words: [keyof typeof C, string][] = [["H", "History"], ["E", "Every page"], ["A", "Around you"], ["R", "Rearview"]];
  return (
    <>
      <Stage>
        <defs><radialGradient id="fh" cx="50%" cy="45%" r="70%"><stop offset="0" stopColor="#1f1530" /><stop offset="1" stopColor={INK} /></radialGradient></defs>
        <rect width={W} height={H} fill="url(#fh)" />
        <Motes c={GOLD} n={30} seed="fh" rise={12} />
      </Stage>
      <AbsoluteFill style={{ paddingTop: 300, alignItems: "center", gap: 30 }}>
        {words.map(([l, w], i) => {
          const p = prog(t, 0.1 + i * 0.16, 0.5 + i * 0.16, backOut);
          const hot = t >= 1.35 && t < 2.3;
          return (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 34, width: 760, opacity: p, translate: `${lerp(i % 2 ? 120 : -120, 0, p)}px 0` }}>
              <div style={{ scale: hot ? String(1 + 0.08 * Math.sin((t - 1.35) * 8 + i)) : "1" }}><Tile l={l} size={170} glow={hot ? 1.4 : 0.8} /></div>
              <div style={{ fontFamily: anton, fontSize: 84, color: "#fff", letterSpacing: 2 }}>{w}</div>
            </div>
          );
        })}
      </AbsoluteFill>
    </>
  );
};

export const SWhispering: React.FC<{ center?: (t: number) => React.ReactNode }> = ({ center }) => {
  const t = useT();
  return (
    <>
      <Stage>
        <Bg id="wg" top="#2a1230" bottom="#ffb867" />
        <Glow cx={540} cy={1000} r={360} c="#fff2c9" o={0.6} />
        <rect y={GROUND - 40} width={W} height={700} fill="#2a1520" />
        {center ? center(t) : <Character look="seeker" pose={{ ...IDLE, smile: 1, head: -4 }} x={540} t={t} scale={1.05} rim="#fff2c9" />}
        <Motes c="#fff6dc" n={26} seed="wg" rise={10} />
      </Stage>
      <AbsoluteFill style={{ paddingTop: 330, alignItems: "center" }}>
        <div style={{ fontFamily: inter, fontWeight: 800, fontSize: 44, letterSpacing: 8, color: "#fff", opacity: prog(t, 0, 0.4) }}>HE'S BEEN</div>
        <div style={{ fontFamily: playfair, fontStyle: "italic", fontSize: 170, color: "#fff", textShadow: "0 0 40px rgba(255,236,180,.6)", opacity: prog(t, 0.3, 0.9), filter: `blur(${lerp(10, 0, prog(t, 0.3, 1))}px)` }}>whispering</div>
        <div style={{ fontFamily: anton, fontSize: 90, color: INK, opacity: prog(t, 0.9, 1.3), letterSpacing: 3 }}>THIS WHOLE TIME</div>
      </AbsoluteFill>
    </>
  );
};

export const SCta = () => {
  const t = useT();
  const typed = "HEAR".slice(0, Math.max(0, Math.floor((t - 0.5) / 0.12)));
  const plane = prog(t, 2.2, 3.4, Easing.inOut(Easing.cubic));
  return (
    <>
      <Stage>
        <rect width={W} height={H} fill={INK} />
        <Glow cx={540} cy={900} r={380} c={GOLD} o={0.18} />
      </Stage>
      <AbsoluteFill style={{ paddingTop: 380, alignItems: "center", gap: 40 }}>
        <div style={{ fontFamily: anton, fontSize: 110, color: "#fff" }}>NEEDED THIS?</div>
        <div style={{ width: 820, background: "#15161f", borderRadius: 40, padding: "26px 34px", display: "flex", alignItems: "center", gap: 24, border: "3px solid #2a2c38" }}>
          <div style={{ width: 80, height: 80, borderRadius: 40, background: `linear-gradient(135deg, ${GOLD}, ${C.A})` }} />
          <div style={{ fontFamily: inter, fontWeight: 800, fontSize: 52, color: "#fff", flex: 1 }}>
            {typed}
            <span style={{ opacity: Math.floor(t * 3) % 2 ? 1 : 0, color: GOLD }}>|</span>
          </div>
          <div style={{ fontFamily: inter, fontWeight: 800, fontSize: 40, color: C.E }}>Post</div>
        </div>
        <div style={{ fontFamily: inter, fontWeight: 800, fontSize: 48, color: "#fff", opacity: prog(t, 2, 2.4), marginTop: 60 }}>Send it to a friend who feels far from God</div>
      </AbsoluteFill>
      <Stage>
        <g transform={`translate(${lerp(260, 1200, plane)} ${lerp(1180, 700, plane) - Math.sin(plane * Math.PI) * 120}) rotate(-18) scale(1.5)`} opacity={prog(t, 2, 2.2)}>
          <path d="M-60,0 L60,-40 L20,50 L5,15 Z" fill={GOLD} />
          <path d="M5,15 L60,-40 L-10,20 Z" fill="#c79a39" />
        </g>
      </Stage>
    </>
  );
};

/* ---------- Edit ---------- */

const CUTS = [4.6, 8.2, 11.5, 14.65, 16.75, 23.0, 24.9, 30.85, 41.45, 43.5, 46.4, 50.5, 55.2, 59.65, 63.4, 66.0, 68.8, 76.5, 79.5, 81.8, 84.0];

const Sweeps = () => {
  const t = useT();
  const c = CUTS.find((x) => t >= x && t < x + 0.45);
  if (c === undefined) return null;
  const p = prog(t, c, c + 0.45, Easing.out(Easing.cubic));
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
      <div style={{ position: "absolute", top: -400, left: `${lerp(-60, 130, p)}%`, width: 240, height: 2800, rotate: "18deg", background: "linear-gradient(90deg, transparent, rgba(255,226,160,.4), transparent)", opacity: 1 - p }} />
    </AbsoluteFill>
  );
};

export const Grain = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "overlay", opacity: 0.12 }}>
      <svg width={1080} height={1920}>
        <filter id="hgrain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={f % 60} /><feColorMatrix type="saturate" values="0" /></filter>
        <rect width={1080} height={1920} filter="url(#hgrain)" />
      </svg>
    </AbsoluteFill>
  );
};

export const SeriesPill = () => (
  <AbsoluteFill style={{ alignItems: "flex-end", paddingTop: 170, paddingRight: 66 }}>
    <div style={{ fontFamily: inter, fontWeight: 800, fontSize: 30, color: "#fff", background: CRIMSON, height: 54, lineHeight: "54px", padding: "0 22px", borderRadius: 27, letterSpacing: 2 }}>H.E.A.R.</div>
  </AbsoluteFill>
);

export const Hear: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  // Score sits under the voice and opens up in the gaps and on the letter reveals.
  const musicVol = interpolate(
    t,
    [0, 1, 22.9, 23.4, 24.8, 29.8, 30.9, 31.6, 79.9, 81.0, 83.6, 84.4, END, HEAR_SECONDS],
    [0, 0.42, 0.42, 0.18, 0.42, 0.46, 0.66, 0.46, 0.46, 0.75, 0.6, 0.42, 0.7, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Audio src={staticFile("hear/vo.mp3")} volume={1.25} />
      <Audio src={staticFile("hear/score.wav")} volume={musicVol} />
      <Scene from={0} to={4.6} shots={[[0, 1.06, 0.5, 0.55], [2.1, 1.18, 0.5, 0.6]]} push={0.05}><SHook /></Scene>
      <Scene from={4.6} to={8.2} xf={0.3} push={0.04}><SRoutine /></Scene>
      <Scene from={8.2} to={11.5} xf={0.3} push={0.05} shakes={[[1.55, 6]]}><SNothing /></Scene>
      <Scene from={11.5} to={14.65} xf={0.35} push={0.06}><SReal /></Scene>
      <Scene from={14.65} to={16.75} xf={0.3} push={0.05}><SAlone /></Scene>
      <Scene from={16.75} to={23.0} xf={0.3} push={0.04} shakes={[[2.7, 14], [3.0, 10]]}><SElijah /></Scene>
      <Scene from={23.0} to={24.9} xf={0.5} push={0.03}><SWhisper /></Scene>
      <Scene from={24.9} to={30.85} xf={0.4} push={0.04}><SWrongThing /></Scene>
      <Scene from={30.85} to={41.45} xf={0.3} shots={[[0, 1], [3.8, 1.12, 0.42, 0.55], [7.4, 1]]}><SHistory /></Scene>
      <Scene from={41.45} to={43.5} xf={0.3} push={0.05}><SEveryPage /></Scene>
      <Scene from={43.5} to={46.4} xf={0.3} push={0.03}><S1947 /></Scene>
      <Scene from={46.4} to={50.5} xf={0.35} push={0.03}><SCave /></Scene>
      <Scene from={50.5} to={55.2} xf={0.35} push={0.03}><SIsaiah /></Scene>
      <Scene from={55.2} to={59.65} xf={0.3} push={0.05}><SReadAloud /></Scene>
      <Scene from={59.65} to={63.4} xf={0.3} push={0.05}><SText /></Scene>
      <Scene from={63.4} to={66.0} xf={0.3} push={0.05}><SSermon /></Scene>
      <Scene from={66.0} to={68.8} xf={0.3} push={0.05}><SPeople /></Scene>
      <Scene from={68.8} to={76.5} xf={0.3}><SRearview /></Scene>
      <Scene from={76.5} to={79.5} xf={0.4} push={0.05}><SNoThunder /></Scene>
      <Scene from={79.5} to={81.8} xf={0.3} push={0.04}><SFinalHear /></Scene>
      <Scene from={81.8} to={84.0} xf={0.45} push={0.05}><SWhispering /></Scene>
      <Scene from={84.0} to={END} xf={0.3} push={0.03}><SCta /></Scene>
      <Sequence from={Math.round(END * FPS)}>
        <EndCard logo title="You can HEAR Him" sub="History · Every page · Around you · Rearview" credit="Dead Sea Scroll & Qumran photos via Wikimedia Commons (public domain, CC BY 2.0 James Emery, CC BY-SA 4.0 Peter van der Sluijs)" />
      </Sequence>
      <Sweeps />
      <Vignette />
      <Sequence durationInFrames={Math.round(END * FPS)} layout="none">
        <SeriesPill />
        <BottomLogo />
        <Captions words={WORDS} />
      </Sequence>
      <Grain />
    </AbsoluteFill>
  );
};

/* ---------- 40-second cut, spliced from the same narration ---------- */

/** [source start, source end, silence after] in seconds of the full narration. */
const SEGS: [number, number, number][] = [
  [0.05, 4.62, 0.15], // I've prayed for years... a single word to me.
  [8.38, 11.4, 0.35], // No loud voice. No lightning. Nothing.
  [23.0, 24.95, 0.25], // He came in a whisper.
  [29.1, 30.84, 0.15], // So here's how you HEAR Him.
  [30.86, 32.6, 0.12], // H is for History.
  [34.62, 36.8, 0.15], // It stands on an empty tomb.
  [41.48, 43.48, 0.12], // E is for Every page.
  [44.78, 50.5, 0.15], // In a cave by the Dead Sea... older than any Bible we had.
  [59.64, 63.75, 0.15], // A is for Around you. The friend who texted at the perfect moment.
  [68.92, 70.53, 0.12], // R is for Rearview.
  [72.8, 76.5, 0.2], // But look back at your life... fingerprints everywhere.
  [81.8, 84.03, 0.12], // He's been whispering this whole time.
  [84.06, 84.95, 0.0], // Comment HEAR
];

const PLACED = (() => {
  let at = 0;
  return SEGS.map(([a, b, gap]) => {
    const seg = { src: a, end: b, at };
    at += b - a + gap;
    return seg;
  });
})();
/** Where segment i begins on the short timeline. */
const at = (i: number) => PLACED[i].at;
const SPEECH_END = PLACED[PLACED.length - 1].at + (SEGS[SEGS.length - 1][1] - SEGS[SEGS.length - 1][0]);
const SHORT_END = SPEECH_END + 0.45;
export const HEAR_SHORT_SECONDS = Math.ceil((SHORT_END + 2.6) * 10) / 10;

const SHORT_WORDS: Word[] = PLACED.flatMap(({ src, end, at: t0 }) =>
  WORDS.filter((w) => w.start >= src - 0.01 && w.start < end).map((w) => ({ ...w, start: w.start - src + t0, end: Math.min(w.end, end) - src + t0 })),
);

/** Runs a scene as if it had already been playing for `by` seconds, so its built-in beats land on the spliced words. */
const Shift: React.FC<{ by: number; children: React.ReactNode }> = ({ by, children }) => (
  <Sequence from={-Math.round(by * FPS)}>{children}</Sequence>
);

const SHORT_CUTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(at);

export const HearShort: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const musicVol = interpolate(
    t,
    [0, 0.8, at(2) - 0.1, at(2) + 0.3, at(3) - 0.2, at(3) + 1.0, at(4) + 0.6, at(11) - 0.2, at(11) + 0.4, SHORT_END, HEAR_SHORT_SECONDS],
    [0, 0.42, 0.42, 0.2, 0.42, 0.66, 0.46, 0.46, 0.7, 0.7, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {PLACED.map(({ src, end, at: t0 }, i) => (
        <Sequence key={i} from={Math.round(t0 * FPS)} durationInFrames={Math.round((end - src) * FPS) + 2} layout="none">
          <Audio src={staticFile("hear/vo.mp3")} volume={1.25} trimBefore={Math.round(src * FPS)} trimAfter={Math.round(end * FPS) + 2} />
        </Sequence>
      ))}
      <Audio src={staticFile("hear/score-short.wav")} volume={musicVol} />
      <Scene from={0} to={at(1)} shots={[[0, 1.06, 0.5, 0.55], [2.05, 1.18, 0.5, 0.6]]} push={0.05}><Shift by={0.05}><SHook /></Shift></Scene>
      <Scene from={at(1)} to={at(2)} xf={0.3} push={0.05} shakes={[[1.4, 6]]}><Shift by={0.18}><SNothing /></Shift></Scene>
      <Scene from={at(2)} to={at(3)} xf={0.45} push={0.03}><SWhisper /></Scene>
      <Scene from={at(3)} to={at(4)} xf={0.3} push={0.04}><Shift by={4.2}><SWrongThing /></Shift></Scene>
      <Scene from={at(4)} to={at(5)} xf={0.3} push={0.04}><Shift by={0.01}><SHistory /></Shift></Scene>
      <Scene from={at(5)} to={at(6)} xf={0.25} push={0.06}><Shift by={3.77}><SHistory /></Shift></Scene>
      <Scene from={at(6)} to={at(7)} xf={0.3} push={0.05}><Shift by={0.03}><SEveryPage /></Shift></Scene>
      <Scene from={at(7)} to={at(7) + 1.62} xf={0.3} push={0.03}><Shift by={1.28}><S1947 /></Shift></Scene>
      <Scene from={at(7) + 1.62} to={at(8)} xf={0.3} push={0.03}><SCave /></Scene>
      <Scene from={at(8)} to={at(9)} xf={0.3} push={0.05}><SText /></Scene>
      <Scene from={at(9)} to={at(10)} xf={0.3}><Shift by={0.12}><SRearview /></Shift></Scene>
      <Scene from={at(10)} to={at(11)} xf={0.35}><Shift by={4.0}><SRearview /></Shift></Scene>
      <Scene from={at(11)} to={at(12)} xf={0.4} push={0.05}><SWhispering /></Scene>
      <Scene from={at(12)} to={SHORT_END} xf={0.3} push={0.03}><Shift by={0.06}><SCta /></Shift></Scene>
      <Sequence from={Math.round(SHORT_END * FPS)}>
        <EndCard logo title="You can HEAR Him" sub="History · Every page · Around you · Rearview" credit="Dead Sea Scroll & Qumran photos via Wikimedia Commons (public domain, CC BY 2.0 James Emery, CC BY-SA 4.0 Peter van der Sluijs)" />
      </Sequence>
      <ShortSweeps />
      <Vignette />
      <Sequence durationInFrames={Math.round(SHORT_END * FPS)} layout="none">
        <SeriesPill />
        <BottomLogo />
        <Captions words={SHORT_WORDS} />
      </Sequence>
      <Grain />
    </AbsoluteFill>
  );
};

const ShortSweeps = () => {
  const t = useT();
  const c = SHORT_CUTS.find((x) => t >= x && t < x + 0.45);
  if (c === undefined) return null;
  const p = prog(t, c, c + 0.45, Easing.out(Easing.cubic));
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
      <div style={{ position: "absolute", top: -400, left: `${lerp(-60, 130, p)}%`, width: 240, height: 2800, rotate: "18deg", background: "linear-gradient(90deg, transparent, rgba(255,226,160,.4), transparent)", opacity: 1 - p }} />
    </AbsoluteFill>
  );
};

/** Beat times of the short cut, for the score generator. */
export const SHORT_BEATS = { at: PLACED.map((p) => p.at), speechEnd: SPEECH_END, end: SHORT_END, total: HEAR_SHORT_SECONDS };
