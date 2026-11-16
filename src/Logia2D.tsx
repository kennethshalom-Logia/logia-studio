import React from "react";
import { AbsoluteFill, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { FPS, Word } from "./Kit";
import raw from "./data/hear-v2.json";

/**
 * Logia main character, animated from Ken's 2D artwork (public/narrator/logia-2d.png, 1254x1254).
 * Overlays drawn in the artwork's style (thick ink outline, flat colours) in the image's own pixel space:
 *  - eyelids that blink and droop with mood, clipped to each eye white
 *  - mouth shapes for speech: closed smile, small open, round, and the original wide grin
 *  - head tilt, bob and breathing around the neck
 * Measured from the art: eye whites L ≈ (500..695, 505..592), R ≈ (772..936, 488..586);
 * mouth interior ≈ (600..859, 700..818), teeth (628..808, 711..746), skin #EA8F45.
 */

const SKIN = "#ea8f45";
const SKIN_SHADE = "#d77a34";
const INK = "#140b08";
const MOUTH = "#2a0c0a";
const TONGUE = "#e07a86";
const TEETH = "#fbf7ee";

export type Shape = "rest" | "A" | "E" | "O" | "M";

/** Mouth shape at narration time vt: cycles open shapes through each spoken word, smile-closed between words. */
export const shapeAt = (words: Word[], vt: number): Shape => {
  const w = words.find((x) => vt >= x.start - 0.02 && vt <= x.end + 0.02);
  if (!w) return "rest";
  const seq: Shape[] = ["E", "A", "O", "A", "M", "E", "A"];
  const k = Math.floor((vt - w.start) / 0.09) + w.text.length;
  return seq[k % seq.length];
};

const EYES = [
  { cx: 597, cy: 549, rx: 100, ry: 46, top: 505 },
  { cx: 854, cy: 537, rx: 84, ry: 52, top: 488 },
];

const Lids: React.FC<{ close: number }> = ({ close }) => (
  <g>
    <defs>
      {EYES.map((e, i) => (
        <clipPath key={i} id={`lg2eye${i}`}>
          <ellipse cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry} />
        </clipPath>
      ))}
    </defs>
    {EYES.map((e, i) => {
      const h = (e.cy + e.ry - e.top) * close;
      if (h < 1) return null;
      const y = e.top + h;
      return (
        <g key={i}>
          <g clipPath={`url(#lg2eye${i})`}>
            <rect x={e.cx - e.rx - 10} y={e.top - 30} width={e.rx * 2 + 20} height={h + 30} fill={SKIN} />
          </g>
          <path d={`M${e.cx - e.rx * 0.98},${y - 4} Q${e.cx},${y + 8} ${e.cx + e.rx * 0.98},${y - 6}`} fill="none" stroke={INK} strokeWidth={11} strokeLinecap="round" clipPath={`url(#lg2eye${i})`} />
        </g>
      );
    })}
  </g>
);

/** Covers the drawn grin with skin and draws the requested mouth shape in the same style. */
const Mouth: React.FC<{ s: Shape; smile: number }> = ({ s, smile }) => {
  if (s === "A") return null; // the artwork's own wide grin
  const cover = (
    <path d="M592,712 C600,690 700,684 760,688 C820,690 868,694 872,714 C876,760 840,826 760,834 C680,840 600,812 592,712 Z" fill={SKIN} />
  );
  const shade = <path d="M612,802 C660,830 760,838 830,800 C800,830 700,842 640,824 Z" fill={SKIN_SHADE} opacity={0.5} />;
  if (s === "rest" || s === "M") {
    const up = s === "M" ? 0 : smile;
    return (
      <g>
        {cover}
        {shade}
        <path d={`M612,${728 - 10 * up} C670,${752 + 14 * up} 790,${748 + 12 * up} 852,${716 - 12 * up}`} fill="none" stroke={INK} strokeWidth={13} strokeLinecap="round" />
        <path d={`M600,${720 - 14 * up} q8,10 18,10 M864,${708 - 14 * up} q-6,12 -16,12`} fill="none" stroke={INK} strokeWidth={8} strokeLinecap="round" opacity={0.8} />
      </g>
    );
  }
  if (s === "O") {
    return (
      <g>
        {cover}
        <ellipse cx={735} cy={752} rx={46} ry={50} fill={MOUTH} stroke={INK} strokeWidth={11} />
        <ellipse cx={735} cy={780} rx={26} ry={14} fill={TONGUE} />
      </g>
    );
  }
  // "E": smaller open smile with top teeth.
  return (
    <g>
      {cover}
      <path d="M624,722 C680,708 790,704 846,714 C836,758 790,786 734,786 C676,786 634,762 624,722 Z" fill={MOUTH} stroke={INK} strokeWidth={11} strokeLinejoin="round" />
      <path d="M636,722 C690,712 784,708 836,716 L832,736 C780,730 690,732 640,740 Z" fill={TEETH} />
      <path d="M690,780 C700,760 770,758 784,778 C760,788 714,790 690,780 Z" fill={TONGUE} />
    </g>
  );
};

export const LogiaCharacter: React.FC<{
  t: number; words?: Word[]; vt?: number; smile?: number; droop?: number; size?: number; x?: number; y?: number; tilt?: number;
}> = ({ t, words, vt, smile = 0.8, droop = 0, size = 1080, x = 0, y = 0, tilt = 0 }) => {
  const s = words && vt !== undefined ? shapeAt(words, vt) : "rest";
  const talking = s !== "rest";
  // Blinks every ~3.6 s (with an occasional double), 0.16 s long.
  const ph = t % 3.6;
  const blink = ph < 0.16 ? Math.sin((ph / 0.16) * Math.PI) : ph > 1.7 && ph < 1.86 && Math.floor(t / 3.6) % 3 === 1 ? Math.sin(((ph - 1.7) / 0.16) * Math.PI) : 0;
  const lid = Math.max(blink, droop);
  // Head life: gentle tilt and bob, more when talking; breathing on the shoulders.
  const rot = tilt + Math.sin(t * 0.9) * 1.2 + (talking ? Math.sin(t * 6.5) * 0.9 : 0);
  const bob = Math.sin(t * 1.8) * 4 + (talking ? Math.abs(Math.sin(t * 7)) * -5 : 0);
  const breathe = 1 + Math.sin(t * 1.6) * 0.006;
  return (
    <svg viewBox="0 0 1254 1254" width={size} height={size} style={{ position: "absolute", left: x, top: y, overflow: "visible" }}>
      <g transform={`translate(0 ${bob}) rotate(${rot} 640 1250) scale(${breathe} ${breathe})`} style={{ transformOrigin: "640px 1250px" }}>
        <image href={staticFile("narrator/logia-2d-cut.png")} width={1254} height={1254} />
        <Lids close={lid} />
        <Mouth s={s} smile={smile} />
      </g>
    </svg>
  );
};

/* ---------- 10 s test: lip-sync to the first lines of the narration ---------- */
const WORDS: Word[] = (raw as { words: Word[] }).words;

export const LogiaTalkTest: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg,#f0b070,#6a7fc0)" }}>
      <Sequence layout="none">
        <Audio src={staticFile("hear/vo2.mp3")} />
      </Sequence>
      <LogiaCharacter t={t} words={WORDS} vt={t} size={1080} x={0} y={420} droop={t > 2.7 && t < 6.3 ? 0.35 : 0} smile={t < 2.6 ? 0.2 : 0.8} />
    </AbsoluteFill>
  );
};
