import React from "react";
import { AbsoluteFill, Easing, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { Captions, FPS, Word } from "../Kit";
import data from "../data/hear-cine.json";
import shotsJson from "../data/cine-shots.json";
import { GOLDF, INK, Paper, Photo, pr, Receipt, RED, SoftVignette, Title } from "./World";

/**
 * H.E.A.R. — cinematic 3D cut. Every shot is a Blender render (blender/cine.py): real sets, real camera moves,
 * Ken's drawn face on a 3D body. Remotion adds only the type layer (titles, scripture cards, captions, tagline)
 * and the final mix (scripts/mix-cine.js). Sound marks only section changes.
 */

type Line = { id: string; start: number; end: number; words: Word[] };
const LINES = data.lines as Line[];
const L = (id: string) => LINES.find((l) => l.id === id)!;
const S = (id: string) => L(id).start;
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const At = (id: string, w: string, nth = 0) => {
  const hits = L(id).words.filter((x) => norm(x.text).startsWith(norm(w)));
  return (hits[nth] ?? hits[hits.length - 1])?.start ?? S(id);
};
const WORDS: Word[] = LINES.filter((l) => l.id !== "end1").flatMap((l) => l.words.map((w, i) => ({ ...w, brk: i === l.words.length - 1 || /[.?!,…]$/.test(w.text) || undefined })));
type ShotMeta = { name: string; start: number; end: number; frames: number };
const SHOTS = shotsJson as ShotMeta[];
export const CINE_SECONDS = data.total;

/** Section changes get a zoom-through (scale + blur) and a soft whoosh; everything else is a clean cut. */
const SECTION = new Set(["how", "history", "every", "friend", "car", "dawn", "cta"]);

const ShotClip: React.FC<{ s: ShotMeta; next?: ShotMeta }> = ({ s, next }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const len = s.end - s.start;
  const zin = SECTION.has(s.name) ? pr(t, 0, 0.32, Easing.bezier(0.16, 1, 0.3, 1)) : 1;
  const zout = next && SECTION.has(next.name) ? pr(t, len - 0.05, len + 0.25, Easing.in(Easing.cubic)) : 0;
  const scale = interpolate(zin, [0, 1], [1.18, 1]) * interpolate(zout, [0, 1], [1, 1.25]);
  const blur = (1 - zin) * 16 + zout * 18;
  const fadeIn = s.name === "dawn" ? pr(t, 0, 0.6) : 1;
  return (
    <AbsoluteFill style={{ transform: `scale(${scale})`, filter: blur > 0.3 ? `blur(${blur}px)` : undefined, opacity: fadeIn * (1 - zout * 0.85) }}>
      <OffthreadVideo src={staticFile(`cine/${s.name}.mp4`)} muted />
    </AbsoluteFill>
  );
};

const Whoosh: React.FC<{ at: number; vol?: number }> = ({ at, vol = 0.22 }) => (
  <Sequence from={Math.max(0, Math.round((at - 0.42) * FPS))} layout="none">
    <Audio src={staticFile("sfx/whoosh.wav")} volume={vol} />
  </Sequence>
);

/** Text bubble for the friend's message (screen space). */
const TextBubble: React.FC<{ at: number; until: number }> = ({ at, until }) => {
  const t = useCurrentFrame() / FPS;
  if (t < at || t > until + 0.3) return null;
  const p = pr(t, at, at + 0.35, Easing.bezier(0.16, 1, 0.3, 1)) * (1 - pr(t, until, until + 0.3));
  return (
    <AbsoluteFill style={{ alignItems: "center", top: 520 }}>
      <div style={{ transform: `scale(${p})`, background: "#fff", border: `8px solid ${INK}`, borderRadius: 56, padding: "26px 40px", boxShadow: `0 10px 0 ${INK}`, width: 760 }}>
        <div style={{ fontFamily: "Inter", fontWeight: 800, fontSize: 30, color: "#8d8471", letterSpacing: 2 }}>JOSH · now</div>
        <div style={{ fontFamily: "Inter", fontWeight: 800, fontSize: 46, color: INK, lineHeight: 1.2 }}>Been praying for you today. You good?</div>
      </div>
    </AbsoluteFill>
  );
};

/** "A thousand years older" timeline card over the cave shot. */
const TimelineCard: React.FC<{ at: number; until: number }> = ({ at, until }) => {
  const t = useCurrentFrame() / FPS;
  if (t < at || t > until + 0.3) return null;
  const p = pr(t, at, at + 0.4, Easing.bezier(0.16, 1, 0.3, 1)) * (1 - pr(t, until, until + 0.3));
  const g = pr(t, at + 0.2, at + 1.0);
  return (
    <AbsoluteFill style={{ alignItems: "center", top: 1080 }}>
      <div style={{ transform: `scale(${p})`, background: "#fffdf7", border: `7px solid ${INK}`, borderRadius: 30, boxShadow: `0 10px 0 ${INK}`, width: 860, padding: "26px 34px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "Anton", fontSize: 44, color: INK }}>
          <span>c. 125 BC</span><span>c. AD 930</span>
        </div>
        <div style={{ position: "relative", height: 26, margin: "10px 0" }}>
          <div style={{ position: "absolute", top: 10, left: 0, right: 0, height: 6, background: "#d8cfbd", borderRadius: 3 }} />
          <div style={{ position: "absolute", top: 8, left: 0, width: `${g * 100}%`, height: 10, background: RED, borderRadius: 5 }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "Inter", fontWeight: 800, fontSize: 28, color: "#6d6556" }}>
          <span>Isaiah Scroll (Dead Sea)</span><span>oldest copy we had</span>
        </div>
        <div style={{ textAlign: "center", fontFamily: "Anton", fontSize: 64, color: RED, marginTop: 6 }}>1,000 YEARS OLDER</div>
      </div>
    </AbsoluteFill>
  );
};

export const HearCine: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const seen = At("h2", "seen");
  const its = At("h2", "it's");
  const scrolls = At("e2", "scrolls");
  const thousand = At("e2", "thousand");
  const ctaStart = SHOTS.find((s) => s.name === "cta")?.start ?? S("cta") - 0.6;
  const loopAt = data.total - 0.45;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Sequence layout="none"><Audio src={staticFile("hear8/mix.wav")} /></Sequence>

      {SHOTS.map((s, i) => (
        <Sequence key={s.name} from={Math.round(s.start * FPS)} durationInFrames={Math.round((s.end - s.start + 0.3) * FPS)} name={s.name}>
          <ShotClip s={s} next={SHOTS[i + 1]} />
        </Sequence>
      ))}
      {SHOTS.filter((s) => SECTION.has(s.name)).map((s) => <Whoosh key={s.name} at={s.start} vol={s.name === "dawn" ? 0.12 : 0.22} />)}
      {/* loop: the last beat returns to the first frame of the phone */}
      <Sequence from={Math.round(loopAt * FPS)} name="loop">
        <AbsoluteFill style={{ opacity: pr(t, loopAt, loopAt + 0.25) }}>
          <OffthreadVideo src={staticFile("cine/hookpov.mp4")} muted />
        </AbsoluteFill>
      </Sequence>

      {/* grade: soft vignette + fine grain over the renders */}
      <SoftVignette k={0.28} color="10,6,2" />
      <Paper opacity={0.045} />

      {/* type layer */}
      <Title lines={["If God is real,", "why is He", ["so quiet?", RED]]} at={0.15} until={S("years") - 0.2} size={118} top={190} />
      <Title lines={["Listening for", "the", ["wrong thing?", RED]]} at={At("turn", "what", 1)} until={S("how") - 0.3} size={112} top={190} />
      <Title lines={[[["H", RED], ["is for", "#fff"]], "history"]} at={S("h1")} until={its - 0.1} size={120} top={190} />
      <Receipt at={seen + 0.3} until={S("e2") - 0.2} head="1 Corinthians 15:6" body="Seen by 500+ people at once." y={230} rot={2} />
      <Sequence from={Math.round((scrolls + 0.5) * FPS)} durationInFrames={Math.round((thousand - scrolls - 0.8) * FPS)} name="scroll photo">
        <AbsoluteFill>
          <svg width={1080} height={1920}>
            <Photo src="hear/isaiah-strip.jpg" x={540} y={560} w={820} h={320} rot={-2} p={pr(t, scrolls + 0.5, scrolls + 0.9, Easing.bezier(0.16, 1, 0.3, 1))} />
          </svg>
        </AbsoluteFill>
      </Sequence>
      <Receipt at={scrolls + 0.9} until={thousand - 0.4} head="Great Isaiah Scroll" body="Qumran Cave 1 · c. 125 BC" y={980} rot={-2} dark />
      <TimelineCard at={thousand - 0.3} until={S("e1") - 0.25} />
      <Title lines={[[["E", GOLDF], ["is for", "#fff"]], "every page"]} at={S("e1")} until={S("e3") - 0.1} size={112} top={190} />
      <Receipt at={S("e3") + 0.1} until={At("e3", "every") - 0.1} head="2 Timothy 3:16" body="All Scripture is breathed out by God." y={230} />
      <Receipt at={At("e3", "voice") - 0.3} until={S("a1") - 0.2} head="Romans 10:17" body="Faith comes from hearing." y={230} rot={2} />
      <Title lines={[[["A", "#79b38b"], ["is for", "#fff"]], "around you"]} at={S("a1")} until={S("a1") + 1.4} size={112} top={190} />
      <TextBubble at={S("a1") + 0.6} until={S("a3") - 0.2} />
      <Title lines={[[["R", "#7f9fd6"], ["is for", "#fff"]], "rearview"]} at={S("r1")} until={S("r2") - 0.15} size={120} top={190} />
      <Receipt at={At("r2", "fingerprints") - 0.1} until={At("r2", "everywhere") + 0.8} head="Romans 8:28" body="In all things God works for good." y={230} rot={-2} />
      {/* the new tagline, held big over the ending */}
      <Title lines={["God is", ["actively", GOLDF], "speaking", "to you"]} at={L("end2").end + 0.25} until={loopAt - 0.1} size={120} top={180} />
      <Receipt at={ctaStart + 0.7} until={loopAt - 0.1} head="Which letter did you need today?" body="Comment H · E · A · R" y={1420} w={760} rot={-1} dark />

      {t < ctaStart ? <Captions words={WORDS} top={1480} /> : null}
    </AbsoluteFill>
  );
};
