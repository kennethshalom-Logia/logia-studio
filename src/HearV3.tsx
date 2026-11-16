import React from "react";
import { AbsoluteFill, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { BottomLogo, Captions, EndCard, FPS, lerp, prog, Scene, useT, Vignette } from "./Kit";
import { C, Grain, LetterBadge, SCta, SeriesPill, snap, Sticker } from "./Hear";
import { FONTS, GOLD } from "./Kit";
import {
  B, Beats, END, Shift, V2_PLACEHOLDER, V2_SECONDS, V2Listen, V2Mirror, V2People, V2Scrolls, V2Thread, WORDS,
} from "./HearV2";
import { LogiaCharacter } from "./Logia2D";

/** Logia, framed close and anchored to the bottom of the frame like a person in shot. */
const Ken: React.FC<{ t: number; vt: number; smile?: number; droop?: number; tilt?: number }> = ({ t, vt, smile = 0.8, droop = 0, tilt = 0 }) => (
  <LogiaCharacter t={t} words={WORDS} vt={vt} smile={smile} droop={droop} tilt={tilt} size={1290} x={-105} y={650} />
);

/** Scenes where Logia is on screen: captions move to the top so they never cover his face. */
const KEN_SCENES: [number, number][] = [[0, B.but - 0.2], [B.A - 0.1, B.R - 0.1], [B.whisper - 0.15, B.comment - 0.1]];
const inKen = (t: number) => KEN_SCENES.some(([a, b]) => t >= a && t < b);

/* The H.E.A.R. reel hosted by the Logia narrator, over Blender-rendered 3D sets. */

export const V3_SECONDS = V2_SECONDS;

/** A Blender-rendered shot filling the frame. */
const Shot: React.FC<{ src: string }> = ({ src }) => (
  <AbsoluteFill>
    <OffthreadVideo src={staticFile(`3d/${src}.mp4`)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
  </AbsoluteFill>
);

/** Hook: the 3D bedroom, lit by a phone, then moonlight on "Because". */
const V3Room: React.FC = () => {
  const t = useT();
  const because = B.because;
  return (
    <>
      <Shot src="room" />
      <Ken t={t} vt={t} smile={t < B.real ? 0.1 : 0.0} droop={t < because ? 0.15 : t < B.never ? 0.45 : 0.3} tilt={t > because ? -4 : 0} />
      <AbsoluteFill style={{ top: 600, alignItems: "flex-end", paddingRight: 40, opacity: prog(t, B.word, B.word + 0.5) }}>
        <div style={{ translate: `0 ${lerp(30, 0, prog(t, B.word, B.word + 0.6, snap))}px` }}>
          <div style={{ background: "#2f7bff", color: "#fff", fontFamily: FONTS.inter, fontWeight: 800, fontSize: 40, padding: "20px 30px", borderRadius: "34px 34px 8px 34px" }}>God, are You there?</div>
          <div style={{ textAlign: "right", fontFamily: FONTS.inter, fontWeight: 800, fontSize: 24, color: "#9aa3b5", marginTop: 8 }}>Delivered</div>
        </div>
      </AbsoluteFill>
    </>
  );
};

/** H.E.A.R. blocks fly in (Blender). */
const V3Tiles: React.FC<{ start: number }> = ({ start }) => {
  const t = useT();
  return (
    <>
      <Shot src="tiles" />
      <AbsoluteFill style={{ top: 1250, alignItems: "center" }}>
        <div style={{ fontFamily: FONTS.inter, fontWeight: 800, fontSize: 44, letterSpacing: 10, color: "#fff", opacity: prog(t, B.hear1 - start, B.hear1 - start + 0.5) }}>HOW TO HEAR HIM</div>
      </AbsoluteFill>
    </>
  );
};

/** H: the stone rolls away (Blender), with the history beats on top. */
const V3Tomb: React.FC<{ start: number }> = ({ start }) => {
  const t = useT();
  const r = (x: number) => x - start;
  return (
    <>
      <Shot src="tomb" />
      <LetterBadge l="H" word="HISTORY" />
      <Beats lines={[["Not a feeling.", r(B.resurrection) + 0.4]]} top={330} size={116} out={r(B.documented) - 0.35} />
      {t > r(B.documented) - 0.4 ? <Beats lines={[["Documented", r(B.documented) - 0.2], ["history", r(B.documented) + 0.35, GOLD]]} top={310} size={128} /> : null}
      <Sticker at={r(B.eyewitnesses) - 0.1} x={400} y={1180} rot={-3} bg="#fff" size={36}>500+ eyewitnesses · 1 Cor 15:6</Sticker>
    </>
  );
};

/** E: the Bible (Blender) with the verse. */
const V3Bible: React.FC<{ start: number }> = ({ start }) => {
  const t = useT();
  const r = (x: number) => x - start;
  return (
    <>
      <Shot src="bible" />
      <LetterBadge l="E" word="EVERY PAGE" />
      <AbsoluteFill style={{ paddingTop: 330, alignItems: "center", paddingLeft: 80, paddingRight: 80 }}>
        <div style={{ opacity: prog(t, r(B.all) - 0.2, r(B.all) + 0.5), translate: `0 ${lerp(30, 0, prog(t, r(B.all) - 0.2, r(B.all) + 0.7, snap))}px`, background: "rgba(4,10,16,.72)", borderRadius: 30, padding: "30px 40px", textAlign: "center", border: `2px solid ${C.E}44` }}>
          <div style={{ fontFamily: FONTS.playfair, fontStyle: "italic", fontSize: 62, lineHeight: 1.2, color: "#fff6dc" }}>“All Scripture is breathed out by God.”</div>
          <div style={{ fontFamily: FONTS.inter, fontWeight: 800, fontSize: 32, color: C.E, marginTop: 14, letterSpacing: 3 }}>2 TIMOTHY 3:16</div>
        </div>
      </AbsoluteFill>
    </>
  );
};

const KenAwareLogo: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  return inKen(t) ? null : <BottomLogo />;
};

/** Ken in a scene that starts at narration time 'start' (lip-synced to the narration). */
const KenAt: React.FC<{ start: number; smile?: number }> = ({ start, smile = 0.8 }) => {
  const t = useT();
  return <Ken t={t} vt={t + start} smile={smile} />;
};

/** Ending: warm dawn light behind Ken as he says "He's been whispering this whole time." */
const V3Dawn: React.FC<{ start: number }> = ({ start }) => {
  const t = useT();
  return (
    <>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, #2a1230 0%, #8a3d4a 38%, #ffb867 78%, #ffd9a0 100%)" }} />
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 62%, rgba(255,242,201,.75), transparent 45%)", opacity: prog(t, 0, 1.2) }} />
      <Ken t={t} vt={t + start} smile={1} tilt={-2} />
    </>
  );
};

export const HearV3: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const musicVol = interpolate(
    t,
    [0, 1.5, B.heres - 0.3, B.H - 0.1, B.H + 0.8, B.whisper - 0.3, B.whisper + 0.5, END, V3_SECONDS],
    [0, 0.38, 0.4, 0.62, 0.44, 0.44, 0.66, 0.66, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const mirrorEnd = B.closed - 0.15;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {V2_PLACEHOLDER ? null : <Audio src={staticFile("hear/vo2.mp3")} volume={1.25} />}
      <Audio src={staticFile("hear/score-v2.wav")} volume={V2_PLACEHOLDER ? Math.min(1, musicVol * 1.6) : musicVol} />
      <Scene from={0} to={B.but - 0.2} push={0.02}><V3Room /></Scene>
      <Scene from={B.but - 0.2} to={B.heres - 0.15} xf={0.8} push={0.04}><V2Listen start={B.but - 0.2} /></Scene>
      <Scene from={B.heres - 0.15} to={B.H - 0.1} xf={0.7} push={0.02}><V3Tiles start={B.heres - 0.15} /></Scene>
      <Scene from={B.H - 0.1} to={B.dead - 0.2} xf={0.7} push={0.04}><V3Tomb start={B.H - 0.1} /></Scene>
      <Scene from={B.dead - 0.2} to={B.E - 0.1} xf={0.8} push={0.03}><V2Scrolls start={B.dead - 0.2} /></Scene>
      <Scene from={B.E - 0.1} to={B.A - 0.1} xf={0.8} push={0.03}><V3Bible start={B.E - 0.1} /></Scene>
      <Scene from={B.A - 0.1} to={B.R - 0.1} xf={0.8} push={0.03}><V2People start={B.A - 0.1} center={() => null} /><Shift by={0}><KenAt start={B.A - 0.1} smile={0.9} /></Shift></Scene>
      <Scene from={B.R - 0.1} to={mirrorEnd} xf={0.8}><V2Mirror start={B.R - 0.1} end={mirrorEnd} /></Scene>
      <Scene from={mirrorEnd} to={B.whisper - 0.15} xf={0.6} push={0.04}><V2Thread start={mirrorEnd} /></Scene>
      <Scene from={B.whisper - 0.15} to={B.comment - 0.1} xf={0.9} push={0.04}><V3Dawn start={B.whisper - 0.15} /></Scene>
      <Scene from={B.comment - 0.1} to={END} xf={0.7} push={0.02}><Shift by={0.2}><SCta /></Shift></Scene>
      <Sequence from={Math.round(END * FPS)}>
        <EndCard logo title="You can HEAR Him" sub="History · Every page · Around you · Rearview" credit="Dead Sea Scroll & Qumran photos via Wikimedia Commons (public domain, CC BY-SA 4.0 Peter van der Sluijs)" />
      </Sequence>
      <Vignette />
      <Sequence durationInFrames={Math.round(END * FPS)} layout="none">
        <SeriesPill />
        <KenAwareLogo />
        <Captions words={WORDS.filter((w) => inKen(w.start))} top={330} />
        <Captions words={WORDS.filter((w) => !inKen(w.start))} />
      </Sequence>
      <Grain />
    </AbsoluteFill>
  );
};

// Keep the letter colours referenced for future sets.
export const V3_COLORS = C;
