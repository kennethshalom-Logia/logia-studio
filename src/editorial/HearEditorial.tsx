import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadSerif } from "@remotion/google-fonts/InstrumentSerif";
import data from "../data/hear-3d.json";

/**
 * H.E.A.R. in the editorial motion-graphics style (Rivinity "positioning" reel):
 * the narration itself is the kinetic type, word by word; warm-grey paper for the story, near-black with glowing
 * line art for the idea; black-and-white photo cutouts with depth of field; macro text with a highlighter;
 * big high-contrast serif moments. Audio = the approved Logia-HEAR-Final-HQ track, untouched.
 */

const sans = loadInter("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] }).fontFamily;
const serif = loadSerif("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;
const serifI = loadSerif("italic", { weights: ["400"], subsets: ["latin"] }).fontFamily;

const FPS = 30;
const W = 1080;
const H = 1920;
const INKC = "#2a2926";
const PAPER = "#cfccc5";
const NIGHT = "#0c0d11";
const HL = "#f3e23a";
const RED = "#e0313b";

type Word = { text: string; start: number; end: number };
type Line = { id: string; start: number; end: number; words: Word[] };
const LINES = (data as { lines: Line[] }).lines.filter((l) => l.id !== "end1");
const ALL: Word[] = LINES.flatMap((l) => l.words);
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
/** Start time of the nth word matching w (searching from time `after`). */
const T = (w: string, after = 0) => ALL.find((x) => x.start >= after - 0.01 && norm(x.text) === norm(w))?.start ?? after;
export const EDITORIAL_SECONDS = (data as { total: number }).total;

const ease = Easing.bezier(0.25, 0.1, 0.25, 1);
const out3 = Easing.bezier(0.16, 1, 0.3, 1);
const pr = (t: number, a: number, b: number, e = ease) => (b <= a ? (t >= b ? 1 : 0) : interpolate(t, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: e }));
const useT = () => useCurrentFrame() / FPS;

/* ---------- backgrounds ---------- */

const Paper: React.FC<{ tint?: string; center?: string }> = ({ tint = PAPER, center = "#dedbd4" }) => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, ${center} 0%, ${tint} 62%, #b9b6af 100%)` }} />
);
const Night: React.FC = () => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 46%, #1b1d24 0%, ${NIGHT} 58%, #050507 100%)` }} />
);
const Grain: React.FC<{ o?: number }> = ({ o = 0.07 }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: o, mixBlendMode: "overlay", pointerEvents: "none" }}>
      <svg width={W} height={H}>
        <filter id="g">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={f % 8} />
          <feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 1.4 0" />
        </filter>
        <rect width={W} height={H} filter="url(#g)" />
      </svg>
    </AbsoluteFill>
  );
};

/** A scene that dissolves in and out through a soft blur, with a slow push. */
const Scene: React.FC<{ from: number; to: number; children: React.ReactNode; bg: "paper" | "night" | "dawn"; push?: number; fadeIn?: number; fadeOut?: number }> = ({
  from, to, children, bg, push = 0.045, fadeIn = 0.35, fadeOut = 0.35,
}) => (
  <Sequence from={Math.round(from * FPS)} durationInFrames={Math.round((to - from + fadeOut) * FPS)} name={`${bg} ${from.toFixed(1)}`}>
    <SceneInner from={from} to={to} bg={bg} push={push} fadeIn={fadeIn} fadeOut={fadeOut}>{children}</SceneInner>
  </Sequence>
);
const GT = React.createContext(0);
const useG = () => React.useContext(GT) + useT();
const SceneInner: React.FC<{ from: number; to: number; children: React.ReactNode; bg: string; push: number; fadeIn: number; fadeOut: number }> = ({ from, to, children, bg, push, fadeIn, fadeOut }) => {
  const t = useT();
  const len = to - from;
  const a = fadeIn ? pr(t, 0, fadeIn) : 1;
  const b = pr(t, len, len + fadeOut);
  const vis = a * (1 - b);
  const blur = (1 - a) * 14 + b * 16;
  return (
    <GT.Provider value={from}>
      <AbsoluteFill style={{ opacity: vis }}>
        {bg === "paper" ? <Paper /> : bg === "dawn" ? <Paper tint="#ddd3c3" center="#efe7da" /> : <Night />}
        <AbsoluteFill style={{ transform: `scale(${1 + push * (t / len)})`, filter: blur > 0.3 ? `blur(${blur}px)` : undefined }}>{children}</AbsoluteFill>
      </AbsoluteFill>
    </GT.Provider>
  );
};

/* ---------- kinetic type ---------- */

type Emph = Record<string, React.CSSProperties>;
/** The narration words between [from, to) appear one by one exactly as they are spoken: blur → sharp, rising. */
const Phrase: React.FC<{
  from: number; to: number; top: number; size?: number; color?: string; weight?: number; emph?: Emph; out?: number;
  maxW?: number; left?: number; align?: "center" | "left"; lh?: number; spacing?: number;
}> = ({ from, to, top, size = 78, color = INKC, weight = 500, emph = {}, out = 1e9, maxW = 900, left, align = "center", lh = 1.12, spacing = -1.5 }) => {
  const t = useG();
  const ws = ALL.filter((w) => w.start >= from - 0.01 && w.start < to);
  const gone = pr(t, out, out + 0.3);
  if (gone >= 1) return null;
  return (
    <AbsoluteFill style={{ top, left: left ?? (W - maxW) / 2, width: maxW, height: "auto", display: "block", opacity: 1 - gone, filter: gone > 0 ? `blur(${gone * 10}px)` : undefined }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: align === "center" ? "center" : "flex-start", columnGap: size * 0.26, rowGap: 0 }}>
        {ws.map((w, i) => {
          const p = pr(t, w.start - 0.06, w.start + 0.32, out3);
          const key = norm(w.text);
          const st = emph[key] ?? {};
          const isSerif = Boolean((st as Record<string, unknown>)["--serif"]);
          return (
            <span
              key={i}
              style={{
                fontFamily: sans, fontWeight: weight, fontSize: size, lineHeight: lh, color, letterSpacing: spacing,
                opacity: p, filter: p < 1 ? `blur(${(1 - p) * 9}px)` : undefined, transform: `translateY(${(1 - p) * 18}px)`,
                display: "inline-block", ...st, ...(isSerif ? { fontSize: size * 1.22 } : {}),
              }}
            >
              {w.text.replace(/\.\.\.$/, "…")}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
const serifEm = (color?: string): React.CSSProperties => ({ fontFamily: serifI, fontWeight: 400, letterSpacing: 0, lineHeight: 0.95, color, ["--serif" as string]: 1 });

/** Big serif display text that rises out of a mask. */
const Mask: React.FC<{ at: number; children: React.ReactNode; top: number; size: number; color?: string; italic?: boolean; out?: number; blur?: number; opacity?: number }> = ({
  at, children, top, size, color = INKC, italic, out = 1e9, blur = 0, opacity = 1,
}) => {
  const t = useG();
  const p = pr(t, at, at + 0.7, out3);
  const g = pr(t, out, out + 0.35);
  if (p <= 0 || g >= 1) return null;
  return (
    <AbsoluteFill style={{ top, height: size * 1.15, alignItems: "center", overflow: "hidden", opacity: (1 - g) * opacity }}>
      <div style={{ fontFamily: italic ? serifI : serif, fontSize: size, lineHeight: 1, color, transform: `translateY(${(1 - p) * size * 0.9}px)`, filter: blur || g ? `blur(${blur + g * 10}px)` : undefined, whiteSpace: "nowrap" }}>
        {children}
      </div>
    </AbsoluteFill>
  );
};

const Small: React.FC<{ at: number; out?: number; top: number; children: React.ReactNode; color?: string; size?: number; spacing?: number }> = ({ at, out = 1e9, top, children, color = INKC, size = 30, spacing = 6 }) => {
  const t = useG();
  const p = pr(t, at, at + 0.5) * (1 - pr(t, out, out + 0.3));
  if (p <= 0) return null;
  return (
    <AbsoluteFill style={{ top, height: 60, alignItems: "center" }}>
      <div style={{ fontFamily: sans, fontWeight: 500, fontSize: size, letterSpacing: spacing, textTransform: "uppercase", color, opacity: p * 0.75 }}>{children}</div>
    </AbsoluteFill>
  );
};

/* ---------- glow line art ---------- */

const Glow: React.FC<{ children: React.ReactNode; color?: string; strength?: number }> = ({ children, color = "#ffffff", strength = 1 }) => (
  <AbsoluteFill style={{ filter: `drop-shadow(0 0 ${6 * strength}px ${color}) drop-shadow(0 0 ${18 * strength}px ${color}aa)` }}>
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>{children}</svg>
  </AbsoluteFill>
);
/** Stroke that draws itself between at and at+dur. */
const Draw: React.FC<{ d: string; at: number; dur?: number; color?: string; w?: number; out?: number }> = ({ d, at, dur = 0.8, color = "#fff", w = 5, out = 1e9 }) => {
  const t = useG();
  const p = pr(t, at, at + dur, ease);
  const g = pr(t, out, out + 0.35);
  if (p <= 0 || g >= 1) return null;
  return <path d={d} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} opacity={1 - g} />;
};
const circleD = (cx: number, cy: number, r: number) => `M${cx},${cy - r} a${r},${r} 0 1,1 0,${2 * r} a${r},${r} 0 1,1 0,${-2 * r}`;
const roundRectD = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x + r} Q${x},${y + h} ${x},${y + h - r} V${y + r} Q${x},${y} ${x + r},${y} Z`;

/* ---------- props ---------- */

/** A black-and-white photo cutout with a soft shadow and a focus pull. */
const PhotoCut: React.FC<{ src: string; at: number; x: number; y: number; w: number; h: number; rot?: number; focusAt?: number; out?: number; circle?: boolean; drift?: number }> = ({
  src, at, x, y, w, h, rot = 0, focusAt, out = 1e9, circle, drift = 30,
}) => {
  const t = useG();
  const p = pr(t, at, at + 0.8, out3);
  const g = pr(t, out, out + 0.35);
  if (p <= 0 || g >= 1) return null;
  const blur = focusAt !== undefined ? 7 * (1 - pr(t, focusAt - 0.2, focusAt + 0.4)) : 0;
  return (
    <div
      style={{
        position: "absolute", left: x, top: y + (1 - p) * 60 - (t - at) * drift * 0.2, width: w, height: h,
        transform: `rotate(${rot}deg) scale(${0.94 + 0.06 * p})`, opacity: p * (1 - g), filter: `blur(${blur + g * 10}px) drop-shadow(0 30px 40px rgba(0,0,0,.35))`,
        borderRadius: circle ? "50%" : 6, overflow: "hidden",
      }}
    >
      <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(1) contrast(1.12) brightness(1.02)" }} />
    </div>
  );
};

/** A phone cutout showing the unanswered message. */
const PhoneCut: React.FC<{ at: number; out: number }> = ({ at, out }) => {
  const t = useG();
  const p = pr(t, at, at + 0.7, out3) * (1 - pr(t, out, out + 0.35));
  if (p <= 0) return null;
  const sent = pr(t, at + 0.2, at + 0.5, out3);
  const del = pr(t, at + 0.9, at + 1.2);
  return (
    <div style={{ position: "absolute", left: 70, top: 170 - (1 - p) * 40, width: 360, height: 720, transform: `rotate(-14deg)`, opacity: p, filter: "drop-shadow(0 34px 40px rgba(0,0,0,.35))" }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 54, background: "linear-gradient(145deg,#3a3a3c,#111)", padding: 14 }}>
        <div style={{ width: "100%", height: "100%", borderRadius: 42, background: "#f3f2ef", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 58, width: "100%", textAlign: "center", fontFamily: sans, fontWeight: 600, fontSize: 24, color: "#333" }}>God</div>
          <div style={{ position: "absolute", top: 104, left: 30, right: 30, height: 2, background: "#ddd" }} />
          <div style={{ position: "absolute", top: 300, right: 22, transform: `scale(${sent})`, transformOrigin: "right center", background: "#8d8d92", color: "#fff", fontFamily: sans, fontWeight: 500, fontSize: 25, padding: "14px 20px", borderRadius: 26 }}>
            God, are You there?
          </div>
          <div style={{ position: "absolute", top: 368, right: 30, fontFamily: sans, fontSize: 18, color: "#777", opacity: del }}>Delivered</div>
        </div>
      </div>
    </div>
  );
};

/** Macro shot of printed text, with depth of field and a highlighter sweep over one phrase. */
const Macro: React.FC<{ at: number; out: number; lines: string[]; hiLine: number; hiFrom: string; hiTo: string; hiAt: number; hiDur: number; page?: string; ink?: string; dark?: boolean }> = ({
  at, out, lines, hiLine, hiFrom, hiTo, hiAt, hiDur, page = "#e9e5dc", ink = "#26241f", dark,
}) => {
  const t = useG();
  const p = pr(t, at, at + 0.6) * (1 - pr(t, out, out + 0.35));
  if (p <= 0) return null;
  const hl = pr(t, hiAt, hiAt + hiDur, Easing.linear);
  return (
    <AbsoluteFill style={{ opacity: p, perspective: 1400 }}>
      <div style={{ position: "absolute", left: -120, top: 360 - (t - at) * 14, width: 1320, transform: "rotateX(26deg) rotateZ(-7deg)", transformOrigin: "50% 50%", background: page, padding: "50px 70px", boxShadow: dark ? "0 0 120px rgba(0,0,0,.6)" : undefined }}>
        {lines.map((ln, i) => {
          const d = Math.abs(i - hiLine);
          const b = Math.min(10, d * d * 0.9);
          if (i !== hiLine) return <div key={i} style={{ fontFamily: serif, fontSize: 62, lineHeight: 1.32, color: ink, filter: b > 0.4 ? `blur(${b}px)` : undefined, whiteSpace: "nowrap" }}>{ln}</div>;
          const a = ln.indexOf(hiFrom), z = ln.indexOf(hiTo) + hiTo.length;
          return (
            <div key={i} style={{ fontFamily: serif, fontSize: 62, lineHeight: 1.32, color: ink, whiteSpace: "nowrap" }}>
              {ln.slice(0, a)}
              <span style={{ background: `linear-gradient(90deg, ${HL} ${hl * 100}%, transparent ${hl * 100}%)`, padding: "0 4px" }}>{ln.slice(a, z)}</span>
              {ln.slice(z)}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/** Masked rolling year counter ("2019" → "2026"). */
const YearRoll: React.FC<{ at: number; to: number; out: number; top: number }> = ({ at, to, out, top }) => {
  const t = useG();
  const p = pr(t, at, at + 0.5, out3) * (1 - pr(t, out, out + 0.3));
  if (p <= 0) return null;
  const yv = 2019 + Math.min(7, Math.max(0, (t - at) / (to - at)) * 7);
  const n = Math.floor(yv);
  const frac = yv - n;
  return (
    <AbsoluteFill style={{ top, height: 230, alignItems: "center", opacity: p }}>
      <div style={{ display: "flex", fontFamily: sans, fontWeight: 700, fontSize: 200, color: INKC, letterSpacing: -8, lineHeight: 1 }}>
        <span>20</span>
        <span style={{ display: "inline-block", height: 200, overflow: "hidden", position: "relative", width: 230 }}>
          <span style={{ position: "absolute", left: 0, top: -frac * 200 }}>{String(n % 100).padStart(2, "0")}</span>
          <span style={{ position: "absolute", left: 0, top: (1 - frac) * 200 }}>{String((n + 1) % 100).padStart(2, "0")}</span>
        </span>
      </div>
    </AbsoluteFill>
  );
};

/** Grid of 500 dots filling in: the eyewitnesses. */
const Witnesses: React.FC<{ at: number; out: number }> = ({ at, out }) => {
  const t = useG();
  const g = 1 - pr(t, out, out + 0.35);
  if (t < at || g <= 0) return null;
  const n = 500, cols = 25;
  const fill = pr(t, at, at + 1.6, Easing.linear);
  return (
    <AbsoluteFill style={{ opacity: g }}>
      <svg width={W} height={H}>
        {Array.from({ length: n }).map((_, i) => {
          const c = i % cols, r = Math.floor(i / cols);
          const on = i / n < fill;
          return <circle key={i} cx={180 + c * 30} cy={720 + r * 30} r={on ? 7 : 3} fill={INKC} opacity={on ? 0.85 : 0.15} />;
        })}
      </svg>
    </AbsoluteFill>
  );
};

/** Checklist row with a box that ticks. */
const Check: React.FC<{ label: string; at: number; tick: number; top: number }> = ({ label, at, tick, top }) => {
  const t = useG();
  const p = pr(t, at, at + 0.5, out3);
  const k = pr(t, tick, tick + 0.25);
  if (p <= 0) return null;
  return (
    <div style={{ position: "absolute", top, left: 0, width: W, display: "flex", justifyContent: "center", alignItems: "center", gap: 34, opacity: p }}>
      <div style={{ width: 430, textAlign: "right", fontFamily: sans, fontWeight: 500, fontSize: 50, color: "#fff", filter: `blur(${(1 - k) * 6}px)`, opacity: 0.55 + 0.45 * k }}>{label}</div>
      <svg width={74} height={74} style={{ filter: "drop-shadow(0 0 6px #fff)" }}>
        <rect x={5} y={5} width={64} height={64} rx={10} fill="none" stroke="#fff" strokeWidth={5} />
        <path d="M18,38 l12,12 l26,-28" fill="none" stroke="#fff" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - k} />
      </svg>
    </div>
  );
};

const Watermark: React.FC = () => {
  const t = useT();
  // dark on paper scenes, light on night scenes
  const paper = (t < 7.0) || (t >= 13.4 && t < 27.35) || (t >= 48.95 && t < 51.25);
  return (
    <AbsoluteFill style={{ top: 1745, height: 60, alignItems: "center" }}>
      <Img src={staticFile("logia-wordmark-white.svg")} style={{ width: 120, opacity: 0.5, filter: paper ? "invert(1)" : undefined }} />
    </AbsoluteFill>
  );
};

/* ---------- the edit ---------- */

export const HearEditorial: React.FC = () => {
  const years = T("years...");
  const whatIf2 = T("what", 9);
  const hearW = T("hear", 12);
  const documented = T("documented");
  const seen = T("seen");
  const scrolls = T("scrolls");
  const almost = T("almost");
  const thousand = T("thousand");
  const allW = T("\"all");
  const every1 = T("every", 32);
  const godSpeaks = T("god", 36);
  const people = T("people");
  const look = T("look");
  const closed = T("closed");
  const right = T("right");
  const red = T("red");
  const prints = T("fingerprints");
  const whisper = T("whispering");
  const comment = T("comment");

  return (
    <AbsoluteFill style={{ background: NIGHT }}>
      <Sequence layout="none"><Audio src={staticFile("hear7/final.wav")} /></Sequence>

      {/* 1. Hook — the unanswered message */}
      <Scene from={0} to={2.62} bg="paper" fadeIn={0}>
        <PhoneCut at={0.0} out={2.4} />
        <Phrase from={0} to={2} top={1010} size={96} weight={600} emph={{ real: serifEm() }} />
      </Scene>

      {/* 2. Years of prayer */}
      <Scene from={2.62} to={7.0} bg="paper">
        <Phrase from={2.7} to={4.8} top={430} size={60} weight={500} />
        <YearRoll at={years - 0.2} to={years + 1.0} out={4.75} top={760} />
        <Mask at={4.75} top={330} size={1150} italic color="#2a292633" blur={3}>7</Mask>
        <Phrase from={4.8} to={6.6} top={860} size={84} weight={600} emph={{ never: serifEm() }} />
      </Scene>

      {/* 3. The turn — listening */}
      <Scene from={7.0} to={11.62} bg="night">
        <Phrase from={7.1} to={9.0} top={560} size={78} color="#f2f1ee" weight={500} out={whatIf2 - 0.25} emph={{ silent: serifEm("#fff") }} />
        <Glow>
          <Draw d={circleD(540, 900, 150)} at={whatIf2 - 0.3} dur={0.9} />
          {[0, 1, 2].map((k) => {
            const r = 220 + k * 90;
            return <Draw key={k} d={`M${540 - r * 0.7},${900 - r * 0.7} A${r},${r} 0 0,1 ${540 + r * 0.7},${900 - r * 0.7}`} at={whatIf2 + 0.2 + k * 0.25} dur={0.6} w={3} />;
          })}
        </Glow>
        <Phrase from={9.3} to={11.4} top={1180} size={64} color="#f2f1ee" weight={500} emph={{ wrong: serifEm("#fff"), "thing": serifEm("#fff") }} />
      </Scene>

      {/* 4. Here's how you HEAR Him */}
      <Scene from={11.62} to={13.42} bg="night">
        <Phrase from={11.7} to={13} top={620} size={72} color="#f2f1ee" weight={500} emph={{ hear: { fontWeight: 700 } }} />
        <Glow>
          {[0, 1, 2, 3].map((k) => <Draw key={k} d={roundRectD(150 + k * 200, 880, 170, 170, 18)} at={hearW + k * 0.1} dur={0.45} />)}
        </Glow>
        {["H", "E", "A", "R"].map((c, k) => <BoxLetter key={c} c={c} at={hearW + 0.15 + k * 0.1} x={150 + k * 200} y={880} />)}
      </Scene>

      {/* 5. H — History */}
      <Scene from={13.42} to={21.72} bg="paper">
        <Mask at={13.5} top={300} size={520} out={15.2}>H</Mask>
        <Phrase from={13.8} to={15} top={880} size={64} weight={500} out={15.2} emph={{ history: serifEm() }} />
        <Macro
          at={15.25} out={18.85} hiLine={3} hiFrom="documented" hiTo="history" hiAt={documented - 0.05} hiDur={0.9}
          lines={[
            "and was buried, and on the third day he was",
            "raised. Historians across the field agree the",
            "tomb was found empty and that his followers",
            "were convinced: documented history, not myth,",
            "recorded within years by eyewitnesses who",
            "suffered rather than deny what they had seen.",
            "Paul lists them by name; many were still alive.",
          ]}
        />
        <Phrase from={15.3} to={17.2} top={300} size={70} weight={600} out={18.85} emph={{ feeling: serifEm() }} />
        <Phrase from={17.25} to={18.9} top={1430} size={70} weight={600} out={18.85} />
        <Mask at={seen - 0.1} top={330} size={300} italic>500+</Mask>
        <Witnesses at={seen + 0.2} out={21.5} />
        <Phrase from={18.95} to={21.5} top={1360} size={62} weight={500} emph={{ eyewitnesses: serifEm() }} />
        <Small at={seen + 0.8} top={1560} spacing={5}>1 Corinthians 15:6</Small>
      </Scene>

      {/* 6. The Dead Sea Scrolls */}
      <Scene from={21.72} to={27.35} bg="paper">
        <PhotoCut src="hear/isaiah-strip.jpg" at={21.8} x={40} y={760} w={1000} h={400} rot={-3} focusAt={scrolls} out={almost - 0.15} />
        <Phrase from={21.8} to={24.6} top={300} size={64} weight={500} out={almost - 0.15} emph={{ scrolls: serifEm(), word: serifEm() }} />
        <Small at={scrolls + 0.6} out={almost - 0.15} top={1230} spacing={5}>Great Isaiah Scroll · c. 125 BC</Small>
        <PhotoCut src="hear/qumran-cave.jpg" at={almost - 0.1} x={190} y={640} w={700} h={700} circle out={27.2} />
        <Mask at={thousand - 0.05} top={860} size={210} italic color="#ffffff">1,000 years</Mask>
        <Phrase from={almost - 0.05} to={27.3} top={1440} size={60} weight={500} />
        <Small at={almost + 0.4} out={27.2} top={540} spacing={8}>Qumran · 1947</Small>
      </Scene>

      {/* 7. E — Every page */}
      <Scene from={27.35} to={34.55} bg="night">
        <Glow><Draw d={roundRectD(390, 470, 300, 300, 26)} at={27.45} dur={0.5} out={29.45} /></Glow>
        <Mask at={27.55} top={505} size={230} color="#fff" out={29.45}>E</Mask>
        <Phrase from={27.6} to={29.2} top={860} size={66} color="#f2f1ee" out={29.45} emph={{ every: serifEm("#fff"), page: serifEm("#fff") }} />
        <Macro
          at={29.5} out={32.35} hiLine={3} hiFrom="All Scripture" hiTo="by God" hiAt={allW} hiDur={2.0} page="#e8e2d3" dark
          lines={[
            "and that from childhood you have known the",
            "sacred writings, which are able to make you",
            "wise for salvation through faith in Christ.",
            "All Scripture is breathed out by God and",
            "profitable for teaching, for reproof, for",
            "correction, and for training in righteousness,",
          ]}
        />
        <Small at={29.9} out={32.35} top={1560} color="#ffffff" spacing={5}>2 Timothy 3:16</Small>
        <Phrase from={every1 - 0.05} to={34.3} top={820} size={92} color="#f2f1ee" weight={600} emph={{ his: serifEm("#fff"), voice: serifEm("#fff") }} />
      </Scene>

      {/* 8. A — Around you */}
      <Scene from={34.55} to={39.05} bg="night">
        <Glow><Draw d={roundRectD(390, 330, 300, 300, 26)} at={34.62} dur={0.5} out={36.3} /></Glow>
        <Mask at={34.7} top={365} size={230} color="#fff" out={36.3}>A</Mask>
        <Phrase from={34.7} to={36.3} top={720} size={66} color="#f2f1ee" out={36.3} emph={{ around: serifEm("#fff") }} />
        <Glow strength={people < 0 ? 1 : 1}>
          <Draw d={circleD(440, 900, 170)} at={godSpeaks} dur={0.7} />
          <Draw d={circleD(640, 900, 170)} at={godSpeaks + 0.15} dur={0.7} />
          <Draw d={circleD(540, 1060, 170)} at={godSpeaks + 0.3} dur={0.7} />
          {[[400, 860], [680, 860], [540, 1110]].map(([x, y], k) => (
            <g key={k}>
              <Draw d={circleD(x, y - 30, 22)} at={people + k * 0.12} dur={0.35} w={4} />
              <Draw d={`M${x - 40},${y + 40} Q${x},${y - 10} ${x + 40},${y + 40}`} at={people + 0.1 + k * 0.12} dur={0.35} w={4} />
            </g>
          ))}
        </Glow>
        <Phrase from={36.4} to={38.9} top={1340} size={62} color="#f2f1ee" emph={{ people: serifEm("#fff") }} />
      </Scene>

      {/* 9. R — Rearview: the line that ties it together */}
      <Scene from={39.05} to={48.95} bg="night" push={0.03}>
        <Glow><Draw d={roundRectD(390, 330, 300, 300, 26)} at={39.12} dur={0.5} out={40.95} /></Glow>
        <Mask at={39.2} top={365} size={230} color="#fff" out={40.95}>R</Mask>
        <Phrase from={39.2} to={40.9} top={720} size={66} color="#f2f1ee" out={40.95} emph={{ rearview: serifEm("#fff") }} />
        <Glow>
          {/* mirror */}
          <Draw d={roundRectD(330, 930, 420, 160, 70)} at={40.1} dur={0.7} out={42.0} />
        </Glow>
        <Phrase from={look - 0.05} to={41.9} top={1160} size={74} color="#f2f1ee" out={42.05} />
        {/* the travelling line: door, person, then everything turns red */}
        <Glow color={t2c(red)}>
          <ThreadLine closed={closed} right={right} red={red} />
        </Glow>
        <Phrase from={closed - 0.6} to={43.4} top={1150} left={70} maxW={520} align="left" size={52} color="#f2f1ee" out={red - 0.3} />
        <Phrase from={right - 0.6} to={44.9} top={630} left={500} maxW={520} align="left" size={52} color="#f2f1ee" out={red - 0.3} />
        <Phrase from={red - 0.45} to={46.9} top={1400} size={64} color="#f2f1ee" out={prints - 0.2} emph={{ red: serifEm(RED), thread: serifEm(RED) }} />
        <Glow color={RED}>
          {[0, 1, 2, 3, 4, 5].map((k) => {
            const rx = 50 + k * 34, ry = 70 + k * 40;
            return <Draw key={k} d={`M${540 - rx},${940 + ry * 0.35} C${540 - rx},${940 - ry} ${540 + rx},${940 - ry} ${540 + rx},${940 + ry * 0.35}`} at={prints + k * 0.1} dur={0.5} color={RED} w={5} />;
          })}
        </Glow>
        <Phrase from={prints - 0.25} to={48.6} top={1320} size={70} color="#f2f1ee" weight={600} emph={{ everywhere: serifEm(RED) }} />
      </Scene>

      {/* 10. The whisper — soft dawn paper, quiet type */}
      <Scene from={48.95} to={51.3} bg="dawn" fadeIn={0.6}>
        <Glow color="#f6d9a0" strength={0.6}>
          <Draw d={circleD(540, 900, 220)} at={whisper - 0.3} dur={1.4} color="#c9a467" w={3} />
        </Glow>
        <Phrase from={49.1} to={51} top={860} size={58} weight={400} color="#5b5246" spacing={1} emph={{ whispering: serifEm("#5b5246") }} />
      </Scene>

      {/* 11. Tagline + comment checklist */}
      <Scene from={51.3} to={EDITORIAL_SECONDS} bg="night" fadeOut={0.01}>
        <TaglineBlock at={51.4} />
        <Mask at={comment - 0.05} top={760} size={96} color="#fff">Comment “HEAR”</Mask>
        <Check label="History" at={comment + 0.5} tick={comment + 1.4} top={930} />
        <Check label="Every page" at={comment + 0.65} tick={comment + 1.9} top={1030} />
        <Check label="Around you" at={comment + 0.8} tick={comment + 2.4} top={1130} />
        <Check label="Rearview" at={comment + 0.95} tick={comment + 2.9} top={1230} />
        <Small at={comment + 3.3} top={1350} color="#ffffff" size={34} spacing={1}>to get the H.E.A.R. checklist</Small>
      </Scene>

      <Watermark />
      <Grain />
    </AbsoluteFill>
  );
};

const t2c = (_: number) => "#ffffff";

/** A serif letter rising inside a 170px glowing box at (x, y). */
const BoxLetter: React.FC<{ c: string; at: number; x: number; y: number }> = ({ c, at, x, y }) => {
  const t = useG();
  const p = pr(t, at, at + 0.5, out3);
  if (p <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 170, height: 170, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: serif, fontSize: 130, lineHeight: 1, color: "#fff", transform: `translateY(${(1 - p) * 140}px)`, textShadow: "0 0 14px rgba(255,255,255,.6)" }}>{c}</div>
    </div>
  );
};

/** The white line that travels through a door and a person, then turns into one red thread. */
const ThreadLine: React.FC<{ closed: number; right: number; red: number }> = ({ closed, right, red }) => {
  const t = useG();
  const rd = pr(t, red - 0.2, red + 0.4);
  const col = rd > 0.5 ? RED : "#fff";
  const door = roundRectD(180, 980, 150, 240, 8);
  const head = circleD(820, 470, 34);
  const body = `M760,600 Q820,520 880,600`;
  const path = "M-20,1320 C120,1300 160,1240 255,1220 C420,1180 380,860 600,760 C700,715 760,640 820,610 C930,560 1000,700 1120,640";
  return (
    <g>
      <Draw d={door} at={closed - 0.5} dur={0.6} color={col} w={4} />
      <Draw d="M300,1100 h-14" at={closed - 0.1} dur={0.2} color={col} w={5} />
      <Draw d={head} at={right - 0.5} dur={0.4} color={col} w={4} />
      <Draw d={body} at={right - 0.3} dur={0.4} color={col} w={4} />
      <Draw d={path} at={closed - 0.9} dur={(right + 0.4) - (closed - 0.9)} color={col} w={rd > 0.5 ? 7 : 4} />
    </g>
  );
};

/** "God is actively speaking to you." */
const TaglineBlock: React.FC<{ at: number }> = ({ at }) => {
  const t = useG();
  const p = pr(t, at, at + 0.7, out3);
  if (p <= 0) return null;
  const words: [string, boolean][] = [["God", false], ["is", false], ["actively", true], ["speaking", false], ["to you.", false]];
  return (
    <AbsoluteFill style={{ top: 330, alignItems: "center" }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: 22, width: 900 }}>
        {words.map(([w, it], i) => {
          const q = pr(t, at + i * 0.12, at + i * 0.12 + 0.45, out3);
          return (
            <span key={i} style={{ fontFamily: it ? serifI : sans, fontWeight: it ? 400 : 600, fontSize: it ? 104 : 86, color: it ? "#f6d9a0" : "#fff", lineHeight: 1.15, letterSpacing: it ? 0 : -2, opacity: q, filter: q < 1 ? `blur(${(1 - q) * 9}px)` : undefined, transform: `translateY(${(1 - q) * 18}px)` }}>{w}</span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
