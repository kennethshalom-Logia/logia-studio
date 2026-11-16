import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { FONTS, GOLD, Word } from "./Kit";

/**
 * Logia's host and narrator, drawn from the character expression sheet (public/narrator/sheet.webp, 1536x1024).
 * Each expression is a window onto the sheet: [left, top, width, height] in sheet pixels, cropped above its label.
 */
export const EXPRESSIONS = {
  // Every window is the same 184x230 so the head stays the same size when the expression changes.
  neutral: [281, 44, 184, 230],
  talkA: [541, 44, 184, 230],
  talkB: [799, 44, 184, 230],
  talkC: [1057, 44, 184, 230],
  happy: [1313, 44, 184, 230],
  excited: [281, 386, 184, 230],
  curious: [541, 386, 184, 230],
  confused: [799, 386, 184, 230],
  surprised: [1057, 386, 184, 230],
  skeptical: [1313, 386, 184, 230],
  concerned: [256, 704, 184, 230],
  serious: [466, 704, 184, 230],
  frustrated: [675, 704, 184, 230],
  worried: [884, 704, 184, 230],
  aha: [1104, 704, 184, 230],
  calm: [1332, 704, 184, 230],
} as const;
export type Expr = keyof typeof EXPRESSIONS;

const SHEET_W = 1536;
const SHEET_H = 1024;

/** Draws one expression filling a box of the given width, keeping the crop's aspect ratio. */
export const Face: React.FC<{ expr: Expr; width: number; style?: React.CSSProperties }> = ({ expr, width, style }) => {
  const [x, y, w, h] = EXPRESSIONS[expr];
  const s = width / w;
  return (
    <div style={{ width, height: h * s, overflow: "hidden", position: "relative", ...style }}>
      <Img
        src={staticFile("narrator/sheet.webp")}
        style={{ position: "absolute", left: -x * s, top: -y * s, width: SHEET_W * s, height: SHEET_H * s, maxWidth: "none" }}
      />
    </div>
  );
};

/** Which face to show at time t: the scene's mood when silent, cycling mouth shapes while a word is being spoken. */
export const lipSync = (words: Word[], t: number, mood: Expr): Expr => {
  const w = words.find((x) => t >= x.start - 0.02 && t <= x.end + 0.02);
  if (!w) return mood;
  // Hold each mouth shape for ~3 frames so it reads as speech, not flicker.
  const k = Math.floor((t - w.start) * 11) + Math.round(w.start * 7);
  return (["talkA", "talkB", "talkA", "neutral", "talkB", "talkC"] as const)[k % 6];
};

export const GridTest: React.FC = () => (
  <AbsoluteFill style={{ background: "#111", flexDirection: "row", flexWrap: "wrap", gap: 12, padding: 20 }}>
    {(Object.keys(EXPRESSIONS) as Expr[]).map((e) => (
      <div key={e} style={{ color: GOLD, fontFamily: FONTS.inter, fontSize: 22 }}>
        <Face expr={e} width={240} style={{ outline: "2px solid #444" }} />
        {e}
      </div>
    ))}
  </AbsoluteFill>
);

/** Mood keyframes: [seconds, expression]; the latest one at or before t wins. */
export type Moods = [number, Expr][];
export const moodAt = (moods: Moods, t: number): Expr => moods.reduce<Expr>((m, [at, e]) => (t >= at ? e : m), moods[0][1]);

/**
 * The narrator in a rounded "facecam" card with a gold edge. Talks (mouth shapes) whenever a narration word is
 * playing, otherwise holds the mood. `t` is narration time, so it stays in sync whatever Sequence it sits in.
 */
export const NarratorCam: React.FC<{
  words: Word[]; t: number; moods: Moods; width: number; x: number; y: number; enter?: number; exit?: number; tilt?: number;
}> = ({ words, t, moods, width, x, y, enter = 1, exit = 0, tilt = 0 }) => {
  const mood = moodAt(moods, t);
  const talking = words.some((w) => t >= w.start - 0.02 && t <= w.end + 0.02);
  // Talk only with neutral-ish moods; strong expressions (aha, worried...) show their own face.
  const speakable = ["neutral", "serious", "calm", "skeptical", "concerned", "curious", "happy", "excited"].includes(mood);
  const expr = talking && speakable ? lipSync(words, t, mood) : mood;
  const bob = Math.sin(t * 2.2) * 6 + (talking ? Math.sin(t * 9) * 2 : 0);
  const s = 0.86 + 0.14 * enter;
  return (
    <div
      style={{
        position: "absolute", left: x, top: y + bob + (1 - enter) * 60, width, transform: `rotate(${tilt}deg) scale(${s})`, transformOrigin: "50% 100%",
        opacity: enter * (1 - exit), borderRadius: width * 0.09, overflow: "hidden", border: `${Math.max(4, width * 0.012)}px solid ${GOLD}`,
        boxShadow: `0 24px 60px rgba(0,0,0,.65), 0 0 40px ${GOLD}44`, background: "#141414",
      }}
    >
      <Face expr={expr} width={width} />
    </div>
  );
};
