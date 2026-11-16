import React from "react";
import { AbsoluteFill, interpolateColors, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { ARMS_UP, Captions, FPS, HEAD_DOWN, IDLE, KNEEL, lerp, LOOK_UP, OPEN_HANDS, Pose, POINT_UP, posed, walking, Word } from "../Kit";
import data from "../data/hear-3d.json";
import {
  anchorOf, boing, Bubble, Cloud, CREAM, CrossMark, Defs, GOLDF, INK, Key, Ken, LogoPlate, Paper, Person, Phone, Photo, PlateImg, pop, pr,
  Receipt, RED, Shot, SIT, SoftVignette, Title, useGT, WText, XMark,
} from "./World";

/* ---------- timing from the narration ---------- */

type Line = { id: string; start: number; end: number; words: Word[] };
const LINES = data.lines as Line[];
const ENV = (data.env ?? []) as number[];
const L = (id: string) => {
  const l = LINES.find((x) => x.id === id);
  if (!l) throw new Error("no line " + id);
  return l;
};
const S = (id: string) => L(id).start;
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
/** Start of the first word in line `id` beginning with `w` (nth match). */
const At = (id: string, w: string, nth = 0) => {
  const hits = L(id).words.filter((x) => norm(x.text).startsWith(norm(w)));
  const hit = hits[nth] ?? hits[hits.length - 1];
  return hit ? hit.start : L(id).start;
};
const WORDS: Word[] = LINES.flatMap((l) => l.words.map((w, i) => ({ ...w, brk: i === l.words.length - 1 || /[.?!,…]$/.test(w.text) || undefined })));
export const H3D_SECONDS = data.total;

/** Mouth openness for Ken from the voice's loudness ("a little": never wider than ~60%). */
const talkAt = (t: number) => {
  if (ENV.length) {
    const i = Math.floor(t * FPS);
    const v = ((ENV[i] ?? 0) + (ENV[i - 1] ?? 0) * 0.6 + (ENV[i + 1] ?? 0) * 0.4) / 2;
    return Math.max(0, Math.min(0.62, (v - 0.12) * 0.9));
  }
  const on = WORDS.some((w) => t >= w.start && t <= w.end);
  return on ? 0.18 + 0.34 * Math.abs(Math.sin(t * 13)) : 0;
};

const cl = (a: string, b: string, p: number) => interpolateColors(p, [0, 1], [a, b]);

/* ---------- sets ---------- */

/** Ken's bedroom (3D set). dawn 0 = 2 a.m. rain, 1 = warm morning; the night plate fades out over the dawn one. */
const WINB = [793, 248, 1205, 729];
const Bedroom: React.FC<{ t: number; dawn: number; calendar?: number }> = ({ t, dawn, calendar }) => {
  const [wx0, wy0, wx1, wy1] = WINB;
  const [calx, caly] = anchorOf("bedroom_night", "calendar");
  return (
    <g>
      {dawn > 0 ? <PlateImg name="bedroom_dawn" /> : null}
      {dawn < 1 ? <PlateImg name="bedroom_night" opacity={1 - dawn} /> : null}
      {dawn < 1 ? (
        <g opacity={1 - dawn} clipPath="url(#winClip)">
          <defs><clipPath id="winClip"><rect x={wx0 + 18} y={wy0 + 18} width={wx1 - wx0 - 36} height={wy1 - wy0 - 36} /></clipPath></defs>
          {Array.from({ length: 26 }).map((_, i) => {
            const x = wx0 + ((i * 53) % (wx1 - wx0));
            const y = wy0 + ((t * 700 + i * 97) % (wy1 - wy0 + 60)) - 40;
            return <line key={i} x1={x} y1={y} x2={x - 9} y2={y + 38} stroke="#9fb4e0" strokeWidth={3} opacity={0.75} />;
          })}
        </g>
      ) : null}
      {calendar !== undefined ? (
        <g transform={`translate(${calx} ${caly}) scale(0.85)`}>
          <rect x={-70} y={-80} width={140} height={160} rx={10} fill="#fbf8f0" stroke={INK} strokeWidth={6} />
          <rect x={-70} y={-80} width={140} height={44} rx={10} fill={RED} stroke={INK} strokeWidth={6} />
          <WText x={0} y={40} size={52} font="anton">{String(Math.floor(calendar))}</WText>
          {calendar % 1 > 0.05 ? (
            <g transform={`translate(${(calendar % 1) * 160} ${-(calendar % 1) * 120}) rotate(${(calendar % 1) * 70})`} opacity={1 - (calendar % 1)}>
              <rect x={-60} y={-26} width={120} height={100} fill="#fbf8f0" stroke={INK} strokeWidth={5} />
            </g>
          ) : null}
        </g>
      ) : null}
    </g>
  );
};

/** The phone screen: "God, are You there?" then "Delivered" (never "Read"). */
const ChatPhone: React.FC<{ t: number; at: number; x?: number; y?: number; s?: number; seen?: number }> = ({ t, at, x = 540, y = 1060, s = 1.2, seen = 0 }) => {
  const send = pop(t, at, 0.3);
  const del = pr(t, at + 0.55, at + 0.75);
  return (
    <Phone x={x} y={y} s={s} dark>
      <circle cx={0} cy={-230} r={34} fill="#2e3550" stroke="#4b5578" strokeWidth={3} />
      <WText x={0} y={-218} size={34} color="#e9ecf5" font="anton">G</WText>
      <WText x={0} y={-168} size={26} color="#e9ecf5">God</WText>
      <path d="M-150,-140 H150" stroke="#262c40" strokeWidth={3} />
      {send > 0 ? (
        <g transform={`translate(130 30) scale(${send}) translate(-130 -30)`}>
          <rect x={-120} y={-10} width={252} height={78} rx={34} fill="#3478f6" />
          <WText x={6} y={40} size={30} color="#fff">God, are You there?</WText>
        </g>
      ) : null}
      <WText x={128} y={102} size={22} color="#8d94aa" anchor="end" opacity={del * (1 - seen)}>Delivered</WText>
      {seen > 0 ? <WText x={128} y={102} size={22} color="#ffcf5a" anchor="end" opacity={seen}>Read</WText> : null}
      {/* typing field */}
      <rect x={-130} y={250} width={260} height={48} rx={24} fill="#1d2335" stroke="#2f3650" strokeWidth={3} />
    </Phone>
  );
};

const [SEAT_X, SEAT_Y] = ((a: [number, number]) => [a[0] + 10, a[1] + 82])(anchorOf("bedroom_night", "bed_seat"));
const SIT_PHONE: Pose = { ...SIT, ls: -40, le: -78, rs: -28, re: -96, head: 9 };
const SIT_STILL: Pose = { ...SIT, ls: -12, le: -60, rs: -14, re: -60, head: 2 };
const PRAY: Pose = { ...KNEEL, ls: -40, le: -118, rs: -22, re: -122, head: 12, torso: 6 };
const WALK: Pose = { ...IDLE };
const HOLD_BIBLE: Pose = { ...IDLE, rs: -28, re: -88, ls: -20, le: -98, head: 4 };
const SIT_DESK: Pose = { ...SIT, rs: -48, re: -40, ls: -40, le: -50, head: 10 };

/* ---------- scenes (each fills one Shot) ---------- */

const PhoneOpen: React.FC = () => {
  const t = useGT();
  return (
    <g>
      <Defs />
      <rect x={-2000} y={-2000} width={5000} height={6000} fill="#1a1f33" />
      <PlateImg name="bedroom_night" opacity={0.55} blur={14} />
      {Array.from({ length: 40 }).map((_, i) => {
        const x = -200 + ((i * 113) % 1500);
        const y = ((t * 900 + i * 211) % 2400) - 200;
        return <line key={i} x1={x} y1={y} x2={x - 12} y2={y + 50} stroke="#4c5a85" strokeWidth={4} opacity={0.55} />;
      })}
      <circle cx={540} cy={1060} r={700} fill="url(#phoneGlow)" opacity={0.5} />
      <ChatPhone t={t} at={0.05} />
    </g>
  );
};

const HookRoom: React.FC = () => {
  const t = useGT();
  const sigh = pr(t, At("years", "years"), At("years", "years") + 0.5);
  return (
    <g>
      <Defs />
      <Bedroom t={t} dawn={0} />
      <Ken x={SEAT_X} y={SEAT_Y} t={t} pose={SIT_PHONE} hold="phoneGlow" talk={talkAt(t) * 0.8} smile={-0.4} droop={0.25 + sigh * 0.2} uid="k1" />
    </g>
  );
};

const Years: React.FC = () => {
  const t = useGT();
  const a = S("years");
  const cal = 2019 + Math.min(7, Math.max(0, (t - a) * 2.4));
  const never = At("years", "never");
  const thought = pop(t, a + 0.3, 0.4) * (1 - pr(t, never + 0.6, never + 1.0));
  return (
    <g>
      <Defs />
      <Bedroom t={t} dawn={0} calendar={cal} />
      <Ken x={640} y={1290} t={t} pose={PRAY} flip droop={1} smile={-0.2} uid="k2" />
      <Bubble x={360} y={420} w={300} h={150} tx={690} ty={760} p={thought}>
        <WText x={510} y={520} size={90} font="anton" color="#b9b2a4">. . .</WText>
      </Bubble>
    </g>
  );
};

const ChurchOut: React.FC = () => {
  const t = useGT();
  const a = S("church");
  const walk = pr(t, a - 0.2, a + 1.25, (x) => x);
  return (
    <g>
      <Defs />
      <PlateImg name="church_out" />
      <Cloud x={160} y={260} s={0.7} t={t} />
      {/* sign with the wordmark */}
      <g transform="translate(200 1130) scale(0.9)">
        <rect x={-10} y={40} width={20} height={140} fill={INK} />
        <rect x={-120} y={-70} width={240} height={130} rx={12} fill="#24302a" stroke={INK} strokeWidth={8} />
        <WText x={0} y={-22} size={30} color="#f2c94c" font="anton">SUNDAY 10AM</WText>
        <LogoPlate x={0} y={18} w={150} />
      </g>
      <Person x={980} y={1312} t={t} flip body="#9d7ec9" hair="#5a3d2a" pose={IDLE} seed={2} />
      <Ken x={lerp(-80, 640, walk)} y={lerp(1360, 1250, walk)} t={t} pose={walking(WALK, t, walk < 1 ? 1 : 0)} smile={0.1} droop={0.15} uid="k3" s={0.9} />
    </g>
  );
};

const Pews: React.FC<{ x: number; y: number; n?: number }> = ({ x, y, n = 1 }) => (
  <g>
    {Array.from({ length: n }).map((_, i) => (
      <g key={i} transform={`translate(${x + i * 0} ${y + i * 140})`}>
        <rect x={-420} y={-40} width={840} height={64} rx={10} fill="#b07a4a" stroke={INK} strokeWidth={7} />
        <rect x={-400} y={24} width={24} height={60} fill={INK} />
        <rect x={376} y={24} width={24} height={60} fill={INK} />
      </g>
    ))}
  </g>
);

const ChurchIn: React.FC = () => {
  const t = useGT();
  const pray = At("church", "pray");
  const worship = At("church", "worship");
  const up = pr(t, worship - 0.15, worship + 0.35);
  const kenPose = posed(t, [[pray, { ...HEAD_DOWN, ls: -32, le: -70, rs: -36, re: -66, head: 12 }], [worship - 0.15, { ...HEAD_DOWN, ls: -32, le: -70, rs: -36, re: -66, head: 12 }], [worship + 0.35, ARMS_UP]]);
  const crowd = (k: number) => posed(t, [[worship, IDLE], [worship + 0.4 + k * 0.08, ARMS_UP]]);
  return (
    <g>
      <Defs />
      <PlateImg name="church_in" />
      <circle cx={540} cy={560} r={300} fill="url(#warmGlow)" opacity={0.15 + up * 0.45} />
      {/* worship crowd */}
      {[-60, 230, 900, 1140].map((x, k) => (
        <Person key={k} x={x} y={1330} t={t} s={0.95} pose={crowd(k)} body={["#e3a04d", "#79b38b", "#d9706f", "#7f9fd6"][k]} hair={["#2a1d14", "#6b4a2b", "#1d1410", "#c7a26a"][k]} seed={k} />
      ))}
      <Ken x={560} y={1330} t={t} pose={kenPose} droop={lerp(1, 0.55, up)} smile={lerp(-0.2, 0.2, up)} uid="k4" />
    </g>
  );
};

const Nothing: React.FC = () => {
  const t = useGT();
  const v = At("nothing", "voice");
  const lt = At("nothing", "lightning");
  const no = At("nothing", "nothing");
  const bolt = pop(t, lt - 0.15, 0.2);
  return (
    <g>
      <Defs />
      <PlateImg name="hills_dusk" />
      <Cloud x={300} y={420} s={1.4} t={t} fill="#f7f4ee" />
      <Cloud x={860} y={560} s={1.0} t={t} fill="#f7f4ee" />
      <Cloud x={-1200} y={300} s={1.2} t={t} fill="#f7f4ee" />
      <Cloud x={2100} y={260} s={1.3} t={t} fill="#f7f4ee" />
      {/* no voice: an empty speech bubble from the sky */}
      <Bubble x={150} y={560} w={330} h={160} tx={420} ty={780} p={pop(t, v - 0.2, 0.3)} />
      <XMark x={315} y={640} s={0.6} at={v + 0.35} />
      {/* no lightning */}
      {bolt > 0 ? (
        <g transform={`translate(860 520) scale(${bolt})`}>
          <path d="M-10,-40 L-60,90 L-10,90 L-40,210 L70,40 L15,40 L45,-40 Z" fill={GOLDF} stroke={INK} strokeWidth={8} strokeLinejoin="round" />
        </g>
      ) : null}
      <XMark x={860} y={640} s={0.6} at={lt + 0.35} />
      <Ken x={540} y={1300} t={t} pose={LOOK_UP} look={-8} droop={0.2} smile={-0.3} uid="k5" s={0.8} />
      {/* crickets */}
      <WText x={1400} y={1240} size={44} color="#9b8a6a" opacity={pr(t, no + 0.3, no + 0.8)} rot={-6}>chirp…</WText>
      <WText x={-280} y={1200} size={36} color="#9b8a6a" opacity={pr(t, no + 0.6, no + 1.1)} rot={5}>chirp</WText>
    </g>
  );
};

const Radio: React.FC = () => {
  const t = useGT();
  const wrong = At("turn", "wrong");
  const tuneA = At("turn", "what", 1) - 0.1;
  const tune = pr(t, tuneA, wrong + 0.3);
  const music = pr(t, wrong + 0.2, wrong + 0.8);
  const knob = tune * 260;
  return (
    <g>
      <Defs />
      <PlateImg name="radio_room" />
      {/* radio */}
      <g transform={`translate(${anchorOf("radio_room", "table_top")[0]} ${anchorOf("radio_room", "table_top")[1] - 112}) scale(0.75)`}>
        {music > 0 ? <circle r={330} fill="url(#warmGlow)" opacity={music * 0.8} /> : null}
        <rect x={-250} y={-150} width={500} height={300} rx={40} fill="#c9504a" stroke={INK} strokeWidth={9} />
        <circle cx={-120} cy={10} r={90} fill="#3a2a22" stroke={INK} strokeWidth={7} />
        {[...Array(5)].map((_, i) => <path key={i} d={`M-190,${-50 + i * 26} H-50`} stroke="#5a463b" strokeWidth={6} />)}
        <rect x={10} y={-90} width={200} height={70} rx={10} fill="#fbf2d8" stroke={INK} strokeWidth={6} />
        {[...Array(9)].map((_, i) => <path key={i} d={`M${28 + i * 20},-80 v${i % 2 ? 14 : 24}`} stroke={INK} strokeWidth={3} />)}
        <path d={`M${40 + tune * 130 + Math.sin(t * 30) * (1 - tune) * 3},-86 v62`} stroke={RED} strokeWidth={6} />
        <g transform={`translate(110 60) rotate(${knob})`}>
          <circle r={44} fill="#f2c94c" stroke={INK} strokeWidth={7} />
          <path d="M0,-40 V-12" stroke={INK} strokeWidth={8} strokeLinecap="round" />
        </g>
        <LogoPlate x={-120} y={120} w={120} />
        <path d="M-160,-150 L-80,-250" stroke={INK} strokeWidth={8} strokeLinecap="round" />
        {/* static */}
        {music < 1 ? (
          <g opacity={1 - music}>
            {[0, 1, 2].map((k) => (
              <path key={k} d={`M${-260 - k * 60},${-200 + k * 50} l-30,20 l20,10 l-30,24`} fill="none" stroke={INK} strokeWidth={6} opacity={(Math.sin(t * 20 + k) + 1) / 2} />
            ))}
            <WText x={-330} y={-250} size={58} font="anton" color="#8a7b66" rot={-10}>KSSHHH</WText>
          </g>
        ) : null}
        {/* music notes */}
        {[0, 1, 2, 3].map((k) => {
          const p = ((t - wrong - 0.3) * 0.6 + k * 0.25) % 1;
          if (music <= 0 || p < 0) return null;
          return (
            <g key={k} transform={`translate(${-80 + k * 70 + Math.sin(t * 2 + k) * 20} ${-200 - p * 420})`} opacity={music * (1 - p)}>
              <path d="M0,0 v-60 l40,-12 v56" fill="none" stroke={INK} strokeWidth={8} />
              <ellipse cx={-8} cy={2} rx={16} ry={12} fill={INK} />
              <ellipse cx={32} cy={-14} rx={16} ry={12} fill={INK} />
            </g>
          );
        })}
      </g>
      <Ken x={330} y={1300} t={t} pose={posed(t, [[S("turn"), IDLE], [tuneA, { ...IDLE, rs: -62, re: -58, head: 6 }]])} talk={talkAt(t) * 0.9} smile={lerp(0, 0.6, music)} look={6} uid="k6" />
    </g>
  );
};

const Elijah: React.FC = () => {
  const t = useGT();
  const wind = At("elijah1", "wind");
  const quake = At("elijah1", "earthquake");
  const fire = At("elijah1", "fire");
  const whisper = At("elijah2", "whisper");
  const came = At("elijah2", "he", 0);
  const windAmt = pr(t, wind - 0.3, wind + 0.2) * (1 - pr(t, quake - 0.2, quake + 0.3));
  const fireAmt = pr(t, fire - 0.1, fire + 0.4) * (1 - pr(t, S("elijah2"), S("elijah2") + 0.6));
  const calm = pr(t, came - 0.2, whisper + 0.4);
  const crack = pr(t, quake, quake + 0.4);
  const sway = Math.sin(t * 9) * 6 * windAmt;
  const elPose = posed(t, [[0, { ...IDLE, head: 4 }], [whisper - 0.2, { ...IDLE, head: 4 }], [whisper + 0.5, { ...IDLE, rs: -150, re: -60, head: 14, torso: 4 }]]);
  return (
    <g>
      <Defs />
      <PlateImg name="elijah" />
      {calm > 0 ? <circle cx={700} cy={1000} r={900} fill="url(#warmGlow)" opacity={calm * 0.7} /> : null}
      {/* earthquake crack */}
      {crack > 0 ? <path d={`M760,1300 l-40,${60 * crack} l50,${50 * crack} l-30,${80 * crack} l40,${70 * crack}`} fill="none" stroke={INK} strokeWidth={10} strokeLinejoin="round" /> : null}
      {/* wind */}
      {windAmt > 0
        ? Array.from({ length: 12 }).map((_, i) => {
          const x = ((t * 1800 + i * 260) % 2600) - 700;
          const y = 500 + ((i * 137) % 760);
          return <path key={i} d={`M${x},${y} q120,-30 240,0 q60,16 30,40`} fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" opacity={windAmt * 0.6} />;
        })
        : null}
      {/* fire */}
      {fireAmt > 0
        ? Array.from({ length: 9 }).map((_, i) => {
          const x = 540 + i * 110 - 60;
          const h = (120 + ((i * 47) % 90)) * (0.85 + 0.15 * Math.sin(t * 14 + i)) * fireAmt;
          return (
            <g key={i}>
              <path d={`M${x - 46},1300 Q${x - 50},${1300 - h * 0.6} ${x},${1300 - h} Q${x + 50},${1300 - h * 0.6} ${x + 46},1300 Z`} fill="#f08a3c" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
              <path d={`M${x - 22},1300 Q${x - 22},${1300 - h * 0.35} ${x},${1300 - h * 0.6} Q${x + 22},${1300 - h * 0.35} ${x + 22},1300 Z`} fill="#f9d45c" />
            </g>
          );
        })
        : null}
      {/* the whisper: a soft line drifting to him */}
      {calm > 0 ? (
        <path
          d={`M1300,700 C1100,${660 + Math.sin(t * 2) * 30} 900,${840 + Math.sin(t * 2.4) * 30} 660,900`}
          fill="none" stroke="#e0a83a" strokeWidth={8} strokeLinecap="round" strokeDasharray="18 22" strokeDashoffset={-t * 60} opacity={calm}
        />
      ) : null}
      <g transform={`rotate(${sway * 0.3} 560 1300)`}>
        <Person x={560} y={1300} t={t} pose={elPose} body="#8b6b4a" hair="#d8d2c6" beard="#d8d2c6" robe s={1.05} seed={5} />
      </g>
    </g>
  );
};

const Badges: React.FC = () => {
  const t = useGT();
  const a = S("elijah2");
  const any = At("elijah2", "any");
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width={1080} height={1920}>
        {[0, 1, 2].map((i) => {
          const p = boing(t, a + i * 0.12, 0.4) * (1 - pr(t, At("elijah2", "he") - 0.1, At("elijah2", "he") + 0.2));
          if (p <= 0) return null;
          const x = 250 + i * 290;
          return (
            <g key={i} transform={`translate(${x} 470) scale(${p})`}>
              <circle r={110} fill="#fffdf7" stroke={INK} strokeWidth={8} />
              {i === 0 ? <path d="M-60,-20 q60,-30 110,0 q30,20 -10,30 M-70,20 q50,-20 100,0" fill="none" stroke={INK} strokeWidth={10} strokeLinecap="round" /> : null}
              {i === 1 ? <path d="M-60,-50 l40,40 l-30,20 l50,50 M20,-60 l-10,40 l40,20 l-20,50" fill="none" stroke={INK} strokeWidth={10} strokeLinejoin="round" /> : null}
              {i === 2 ? <path d="M0,-70 Q60,-10 40,40 Q20,70 0,70 Q-20,70 -40,40 Q-60,-10 0,-70 Z" fill="#f08a3c" stroke={INK} strokeWidth={8} /> : null}
              <XMark x={0} y={0} s={0.55} at={any + i * 0.18} />
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

const HearTiles: React.FC<{ t: number; at: number; y?: number; x?: number; s?: number; lit?: number }> = ({ t, at, y = 560, x = 540, s = 1, lit = -1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    {["H", "E", "A", "R"].map((c, i) => {
      const p = boing(t, at + i * 0.12, 0.42);
      if (p <= 0) return null;
      const on = lit === -1 || lit === i;
      return (
        <g key={c} transform={`translate(${(i - 1.5) * 220} 0) scale(${p}) rotate(${(i % 2 ? 3 : -3) * (1 - Math.min(1, p))})`}>
          <rect x={-95} y={-95} width={190} height={190} rx={28} fill={on ? (i === 0 ? RED : i === 1 ? GOLDF : i === 2 ? "#79b38b" : "#7f9fd6") : "#e6dcc8"} stroke={INK} strokeWidth={9} />
          <rect x={-95} y={70} width={190} height={25} rx={10} fill={INK} opacity={0.15} />
          <WText x={0} y={50} size={150} font="anton" color={on ? "#fff" : "#c9bda6"} stroke={on ? 14 : 0}>{c}</WText>
        </g>
      );
    })}
  </g>
);

const HowScene: React.FC = () => {
  const t = useGT();
  const hear = At("how", "hear");
  return (
    <g>
      <Defs />
      <PlateImg name="hills" />
      <Cloud x={150} y={300} s={0.6} t={t} />
      <HearTiles t={t} at={hear - 0.25} y={470} s={0.9} />
      <Ken x={540} y={1300} t={t} pose={posed(t, [[S("how"), IDLE], [hear, OPEN_HANDS]])} talk={talkAt(t)} smile={0.8} uid="k7" />
    </g>
  );
};

/** H: standing on a feeling (a wobbly heart balloon) vs. on the empty tomb. */
const TOMB = anchorOf("hills", "tomb_door");
const History: React.FC = () => {
  const t = useGT();
  const stands = At("h2", "it's");
  const seen = At("h2", "seen");
  const jump = pr(t, stands - 0.25, stands + 0.45);
  const popB = t > stands - 0.2;
  const bob = Math.sin(t * 3.2) * 18;
  const wob = Math.sin(t * 5.1) * 5;
  const kx = lerp(380, TOMB[0] - 230, jump);
  const ky = lerp(1010 + bob, 1300, jump) - Math.sin(jump * Math.PI) * 300;
  const crowd = pr(t, seen - 0.2, seen + 1.4);
  return (
    <g>
      <Defs />
      <PlateImg name="hills" />
      <Cloud x={300} y={380} s={0.8} t={t} />
      <Cloud x={1900} y={330} s={0.7} t={t} />
      {/* the feeling balloon */}
      {!popB ? (
        <g transform={`translate(380 ${1120 + bob}) rotate(${wob})`}>
          <path d="M0,40 C-130,-40 -110,-170 0,-100 C110,-170 130,-40 0,40 Z" fill="#f28fb0" stroke={INK} strokeWidth={8} transform="translate(0 30) scale(1.2)" />
          <WText x={0} y={20} size={40} font="anton" color="#fff" stroke={7}>FEELINGS</WText>
          <path d={`M0,90 Q20,180 -10,300`} stroke={INK} strokeWidth={4} fill="none" />
        </g>
      ) : (
        <g opacity={1 - pr(t, stands - 0.2, stands + 0.3)}>
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const d = pr(t, stands - 0.2, stands + 0.4) * 160;
            const a = (i / 6) * Math.PI * 2;
            return <path key={i} d={`M${380 + Math.cos(a) * d},${1100 + Math.sin(a) * d} l30,10 l-14,26 Z`} fill="#f28fb0" stroke={INK} strokeWidth={5} />;
          })}
          <WText x={380} y={1060} size={70} font="anton" color={RED} stroke={8}>POP!</WText>
        </g>
      )}
      <circle cx={TOMB[0]} cy={TOMB[1] - 120} r={300} fill="url(#warmGlow)" opacity={0.55 * jump} />
      {/* 500+ eyewitnesses on the hills */}
      {crowd > 0
        ? Array.from({ length: 140 }).map((_, i) => {
          const ang = (i * 137.5) % 360;
          const r = 700 + ((i * 53) % 900);
          const x = 1640 + Math.cos((ang * Math.PI) / 180) * r * 1.4;
          const y = 1280 + ((i * 29) % 260) - 40;
          const show = pr(crowd, i / 140 - 0.05, i / 140 + 0.05);
          if (show <= 0 || Math.abs(x - 1640) < 380) return null;
          const c = ["#e3a04d", "#79b38b", "#d9706f", "#7f9fd6", "#9d7ec9"][i % 5];
          return (
            <g key={i} transform={`translate(${x} ${y}) scale(${0.45 * show})`}>
              <path d="M-26,0 Q-30,-70 0,-74 Q30,-70 26,0 Z" fill={c} stroke={INK} strokeWidth={6} />
              <circle cy={-100} r={28} fill="#fbfaf6" stroke={INK} strokeWidth={6} />
            </g>
          );
        })
        : null}
      <Ken x={kx} y={ky} t={t} pose={jump > 0 && jump < 1 ? ARMS_UP : IDLE} smile={lerp(0.2, 0.9, jump)} talk={talkAt(t) * 0.7} uid="k8" s={0.8} />
    </g>
  );
};

/** E: the 1947 cave and the scroll. */
const CAVE = anchorOf("qumran", "cave");
const Qumran: React.FC = () => {
  const t = useGT();
  const a = S("e2");
  const scrolls = At("e2", "scrolls");
  const throwP = pr(t, a + 0.1, a + 0.9);
  const clink = a + 0.9;
  return (
    <g>
      <Defs />
      <PlateImg name="qumran" />
      {/* shepherd + goat */}
      <Person x={260} y={1300} t={t} pose={posed(t, [[a, IDLE], [a + 0.4, { ...IDLE, rs: -150, re: 20 }], [a + 0.7, { ...IDLE, rs: -60, re: -10 }]])} body="#c9a46c" hair="#2a1d14" cap="#e9e0cf" seed={8} s={0.9} />
      <g transform="translate(-10 1290)">
        <ellipse rx={70} ry={40} cy={-60} fill="#f6f2ea" stroke={INK} strokeWidth={6} />
        <circle cx={-70} cy={-90} r={26} fill="#f6f2ea" stroke={INK} strokeWidth={6} />
        <path d="M-40,-24 v30 M40,-24 v30" stroke={INK} strokeWidth={8} />
      </g>
      {throwP > 0 && throwP < 1 ? <circle cx={lerp(330, CAVE[0], throwP)} cy={lerp(1040, CAVE[1], throwP) - Math.sin(throwP * Math.PI) * 300} r={16} fill="#8a7a66" stroke={INK} strokeWidth={4} /> : null}
      <WText x={900} y={760} size={70} font="anton" color={RED} stroke={8} opacity={pr(t, clink, clink + 0.1) * (1 - pr(t, clink + 0.8, clink + 1.1))} rot={-8}>CLINK!</WText>
      <WText x={420} y={500} size={150} font="anton" color="#fff" stroke={14} opacity={pop(t, a + 0.05, 0.3)}>1947</WText>
      {/* the scroll photo, at "scrolls" */}
      <Photo src="hear/isaiah-strip.jpg" x={760} y={600} w={760} h={300} rot={-3} p={boing(t, scrolls, 0.5)} />
    </g>
  );
};

/** E: a thousand years older — a timeline. */
const Timeline: React.FC = () => {
  const t = useGT();
  const thousand = At("e2", "thousand");
  const grow = pr(t, thousand - 0.1, thousand + 1.0);
  return (
    <g>
      <Defs />
      <PlateImg name="hills" />
      <path d="M80,1000 H1000" stroke={INK} strokeWidth={10} strokeLinecap="round" />
      {[[180, "c. 125 BC", "Isaiah Scroll\n(Dead Sea)", GOLDF], [900, "c. AD 930", "Oldest copy\nwe had", "#d9d0bd"]].map(([x, d, lab, c], i) => (
        <g key={i} transform={`translate(${x} 1000) scale(${boing(t, S("e2") + 0.15 + i * 0.25, 0.4)})`}>
          <circle r={36} fill={c as string} stroke={INK} strokeWidth={8} />
          <WText x={0} y={-70} size={44} font="anton">{d as string}</WText>
          {(lab as string).split("\n").map((ln, k) => <WText key={k} x={0} y={100 + k * 46} size={36}>{ln}</WText>)}
        </g>
      ))}
      <path d={`M180,920 Q540,${900 - 240 * grow} ${lerp(180, 900, grow)},920`} fill="none" stroke={RED} strokeWidth={10} strokeLinecap="round" strokeDasharray="1 0" opacity={grow > 0 ? 1 : 0} />
      <WText x={540} y={680} size={110} font="anton" color={RED} stroke={12} opacity={pr(t, thousand + 0.4, thousand + 0.7)}>1,000 YEARS</WText>
      <Photo src="hear/isaiah53.jpg" x={540} y={1300} w={460} h={300} rot={2} p={boing(t, thousand + 0.8, 0.5)} />
    </g>
  );
};

const ReadAloud: React.FC = () => {
  const t = useGT();
  const read = At("e3", "every");
  const voice = At("e3", "voice");
  const words = ["“Fear not”", "“I am with you”", "“Come to Me”", "“Peace”", "“You are Mine”"];
  return (
    <g>
      <Defs />
      <Bedroom t={t} dawn={1} />
      <Ken x={540} y={1300} t={t} pose={HOLD_BIBLE} hold="bible" talk={talkAt(t)} smile={0.7} uid="k9" look={10} />
      {t > read
        ? words.map((w, i) => {
          const p = ((t - read) * 0.35 + i * 0.2) % 1;
          const x = 640 + Math.sin(i * 2.1 + t) * 180;
          const y = 880 - p * 520;
          return <WText key={i} x={x} y={y} size={46} font="anton" color="#c9822a" stroke={0} opacity={Math.sin(p * Math.PI) * pr(t, read, read + 0.4)}>{w}</WText>;
        })
        : null}
      <circle cx={600} cy={880} r={380} fill="url(#warmGlow)" opacity={0.5 * pr(t, voice - 0.4, voice + 0.4)} />
    </g>
  );
};

const EveryPage: React.FC = () => {
  const t = useGT();
  const a = S("e1");
  return (
    <g>
      <Defs />
      <PlateImg name="hills" />
      <g transform="translate(540 980)">
        <circle r={520} fill="url(#warmGlow)" opacity={0.55} />
        <path d="M-420,-160 Q-210,-230 0,-160 Q210,-230 420,-160 L420,220 Q210,150 0,220 Q-210,150 -420,220 Z" fill="#fffaf0" stroke={INK} strokeWidth={10} strokeLinejoin="round" />
        <path d="M0,-160 V220" stroke={INK} strokeWidth={8} />
        {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M-360,${-90 + i * 52} h300 M60,${-90 + i * 52} h300`} stroke="#b4a688" strokeWidth={8} />)}
        {/* flipping pages */}
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const p = pr(t, a + i * 0.22, a + i * 0.22 + 0.4);
          if (p <= 0 || p >= 1) return null;
          const sx = Math.cos(p * Math.PI);
          return <path key={i} d={`M0,-160 Q${210 * sx},${-230} ${420 * sx},-160 L${420 * sx},220 Q${210 * sx},150 0,220 Z`} fill="#fffdf6" stroke={INK} strokeWidth={6} />;
        })}
        <path d="M-40,220 v120 l40,-30 l40,30 v-120" fill={RED} stroke={INK} strokeWidth={6} />
      </g>
    </g>
  );
};

/** A: the text from a friend. */
const DESK = anchorOf("study", "desk_top");
const FriendText: React.FC = () => {
  const t = useGT();
  const friend = At("a2", "god");
  const buzz = t > friend - 0.3 && t < friend + 0.4 ? Math.sin(t * 90) * 8 : 0;
  const msg = pop(t, friend + 0.1, 0.35);
  const smile = pr(t, friend + 0.6, friend + 1.2);
  return (
    <g>
      <Defs />
      <PlateImg name="study" />
      <g transform={`translate(${DESK[0] - 40 + buzz} ${DESK[1] - 10}) rotate(-6)`}>
        <rect x={-60} y={-22} width={120} height={30} rx={10} fill="#16141a" stroke={INK} strokeWidth={5} />
        {buzz ? <path d="M-80,-40 l-20,-20 M80,-40 l20,-20 M0,-50 v-26" stroke={INK} strokeWidth={6} strokeLinecap="round" /> : null}
      </g>
      <Ken x={400} y={1300} t={t} pose={posed(t, [[0, SIT_DESK], [friend + 0.3, SIT_DESK], [friend + 0.7, { ...SIT_DESK, head: -4 }]])} droop={lerp(0.45, 0.05, smile)} smile={lerp(-0.4, 0.9, smile)} uid="k10" />
      {/* the message, big */}
      {msg > 0 ? (
        <g transform={`translate(560 560) scale(${msg})`}>
          <rect x={-400} y={-120} width={800} height={240} rx={60} fill="#fff" stroke={INK} strokeWidth={9} />
          <path d="M-300,110 l-40,70 l90,-60" fill="#fff" stroke={INK} strokeWidth={9} strokeLinejoin="round" />
          <path d="M-300,104 l60,0" stroke="#fff" strokeWidth={14} />
          <WText x={-350} y={-50} size={34} color="#8d8471" anchor="start">JOSH</WText>
          <WText x={-350} y={14} size={46} anchor="start">Been praying for you today.</WText>
          <WText x={-350} y={78} size={46} anchor="start">You good?</WText>
        </g>
      ) : null}
    </g>
  );
};

/** A: the sermon aimed at him. */
const PULPIT = anchorOf("church_in", "pulpit");
const Sermon: React.FC = () => {
  const t = useGT();
  const sermon = At("a2", "sermon");
  const me = At("a2", "me");
  const arrow = pr(t, sermon + 0.2, me);
  const hit = t > me - 0.05;
  return (
    <g>
      <Defs />
      <PlateImg name="church_in" />
      {/* preacher beside the pulpit */}
      <Person x={PULPIT[0] - 150} y={PULPIT[1] + 250} s={0.72} t={t} pose={posed(t, [[0, IDLE], [sermon, { ...IDLE, rs: -100, re: -10 }]])} body="#2d3140" hair="#3b2a1e" tie={RED} seed={3} flip />
      {/* dashed arrow to Ken */}
      {arrow > 0 ? (
        <path d={`M${PULPIT[0] - 110},${PULPIT[1] + 60} Q480,640 ${lerp(PULPIT[0] - 110, 300, arrow)},${lerp(PULPIT[1] + 60, 900, arrow)}`} fill="none" stroke={RED} strokeWidth={10} strokeDasharray="26 18" strokeLinecap="round" />
      ) : null}
      {hit ? (
        <g transform={`translate(300 860) scale(${boing(t, me, 0.4)})`}>
          <circle r={70} fill="none" stroke={RED} strokeWidth={9} />
          <circle r={30} fill="none" stroke={RED} strokeWidth={9} />
          <WText x={110} y={-60} size={110} font="anton" color={RED} stroke={10}>!</WText>
        </g>
      ) : null}
      <Ken x={300} y={1340} t={t} pose={hit ? LOOK_UP : HEAD_DOWN} droop={hit ? 0 : 0.5} smile={hit ? 0.1 : -0.2} uid="k11" s={0.95} look={hit ? -6 : 4} />
    </g>
  );
};

const People: React.FC = () => {
  const t = useGT();
  const a = S("a3");
  const clouds = At("a3", "life");
  return (
    <g>
      <Defs />
      <PlateImg name="hills" />
      <g opacity={1 - pr(t, clouds, clouds + 0.6) * 0.6}>
        <Cloud x={540} y={420} s={1.2} t={t} fill="#f2efe8" />
        <WText x={540} y={440} size={90} font="anton" color="#c8bfae">?</WText>
      </g>
      {[[-80, "#e3a04d", "#2a1d14"], [200, "#79b38b", "#6b4a2b"], [880, "#d9706f", "#1d1410"], [1160, "#7f9fd6", "#c7a26a"]].map(([x, b, h], k) => (
        <Person key={k} x={x as number} y={1310} t={t} body={b as string} hair={h as string} seed={k} pose={posed(t, [[a + k * 0.12, IDLE], [a + k * 0.12 + 0.4, k < 2 ? { ...IDLE, rs: -70, re: -30 } : { ...IDLE, ls: 70, le: 30 }]])} flip={k >= 2} />
      ))}
      <Ken x={540} y={1310} t={t} pose={IDLE} talk={talkAt(t) * 0.8} smile={0.95} uid="k12" />
    </g>
  );
};

/** R: driving, eyes on the rearview mirror. */
const Car: React.FC = () => {
  const t = useGT();
  const roll = Math.min(1500, Math.max(0, t - S("r1") + 0.3) * 650);
  return (
    <g>
      <Defs />
      <rect x={-3000} y={-2000} width={8000} height={6000} fill="#bcd6e6" />
      <PlateImg name="road" dx={-roll + 700} />
      <g transform={`translate(540 ${1132 + Math.sin(t * 18) * 3})`}>
        <path d="M-420,90 L-420,-30 Q-400,-80 -330,-90 L-200,-200 Q-150,-240 -60,-240 L160,-240 Q240,-240 290,-180 L360,-90 Q430,-80 440,-20 L440,90 Z" fill="#d94a4a" stroke={INK} strokeWidth={10} strokeLinejoin="round" />
        <path d="M-170,-90 L-120,-200 L40,-200 L40,-90 Z M70,-90 L70,-200 L180,-200 Q230,-200 280,-90 Z" fill="#cfe7f2" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
        {/* Ken at the wheel */}
        <g transform="translate(170 -96)">
          <image href={staticFile("narrator/ken-head.png")} x={-52} y={-100} width={104} height={117} />
        </g>
        {/* rearview mirror */}
        <g transform="translate(-30 -186)">
          <rect x={-46} y={-16} width={92} height={36} rx={14} fill="#2d2a33" stroke={INK} strokeWidth={5} />
          <rect x={-38} y={-9} width={76} height={22} rx={9} fill="#ffd774" />
          <path d="M-30,2 Q0,-12 30,4" stroke={RED} strokeWidth={4} fill="none" />
        </g>
        <rect x={-380} y={40} width={110} height={40} rx={8} fill="#fff" stroke={INK} strokeWidth={5} />
        <WText x={-325} y={72} size={28} font="anton">LOGIA</WText>
        {[-250, 270].map((x, i) => (
          <g key={i} transform={`translate(${x} 96) rotate(${(t * 360) % 360})`}>
            <circle r={78} fill="#26232a" stroke={INK} strokeWidth={8} />
            <circle r={30} fill="#cfcac0" stroke={INK} strokeWidth={6} />
            <path d="M0,-30 V30 M-30,0 H30" stroke={INK} strokeWidth={5} />
          </g>
        ))}
      </g>
    </g>
  );
};

/** R: the board of moments joined by one red thread, with fingerprints. */
const Thread: React.FC = () => {
  const t = useGT();
  const look = S("r2");
  const red = At("r2", "red");
  const prints = At("r2", "fingerprints");
  const every = At("r2", "everywhere");
  const pins: [number, number, string][] = [
    [240, 640, "prayer"], [800, 760, "church"], [300, 1180, "text"], [820, 1300, "bible"], [520, 1700, "tomb"],
    [-400, 900, "a"], [1500, 600, "b"], [-500, 1500, "c"], [1550, 1500, "d"], [540, 200, "e"],
  ];
  const draw = pr(t, red - 0.4, red + 1.6);
  const path = "M240,640 C500,560 700,600 800,760 S420,1000 300,1180 S700,1220 820,1300 S540,1560 520,1700";
  const far = pr(t, every - 0.2, every + 0.8);
  const ext = "M520,1700 C300,1900 -600,1700 -500,1500 S-700,1000 -400,900 S100,300 540,200 S1600,300 1500,600 S1700,1300 1550,1500";
  return (
    <g>
      <Defs />
      <rect x={-2000} y={-2000} width={6000} height={6000} fill="#c49a66" />
      <PlateImg name="corkboard" />
      {pins.map(([x, y, kind], i) => {
        const p = boing(t, look + (i < 5 ? i * 0.15 : 0.2), 0.45);
        if (p <= 0) return null;
        return (
          <g key={i} transform={`translate(${x} ${y}) rotate(${((i * 37) % 9) - 4}) scale(${p})`}>
            <rect x={-150} y={-130} width={300} height={290} fill="#fffdf7" stroke={INK} strokeWidth={7} />
            <rect x={-126} y={-106} width={252} height={200} fill={["#3a4363", "#f3e6cf", "#e9dfcd", "#f3dfbd", "#ecd9b2"][i % 5]} stroke={INK} strokeWidth={4} />
            {kind === "prayer" ? <Person x={0} y={80} t={0} s={0.42} pose={PRAY} body="#2b2833" hair={INK} /> : null}
            {kind === "church" ? <CrossMark x={0} y={10} s={0.7} /> : null}
            {kind === "text" ? <g><rect x={-90} y={-40} width={180} height={70} rx={30} fill="#fff" stroke={INK} strokeWidth={5} /><WText x={0} y={8} size={30}>praying 4 u</WText></g> : null}
            {kind === "bible" ? <path d="M-90,-40 Q-45,-60 0,-40 Q45,-60 90,-40 L90,50 Q45,34 0,50 Q-45,34 -90,50 Z" fill="#fff" stroke={INK} strokeWidth={6} /> : null}
            {kind === "tomb" ? <g><path d="M-90,90 Q-90,-40 0,-40 Q90,-40 90,90 Z" fill="#c9b08a" stroke={INK} strokeWidth={6} /><path d="M-30,90 V40 Q0,10 30,40 V90 Z" fill="#2c2420" /></g> : null}
            {kind.length === 1 ? <circle cx={0} cy={0} r={50} fill={["#e3a04d", "#79b38b", "#d9706f", "#7f9fd6", "#9d7ec9"][i % 5]} stroke={INK} strokeWidth={5} /> : null}
            <circle cx={0} cy={-130} r={16} fill={RED} stroke={INK} strokeWidth={5} />
            {/* fingerprint */}
            {t > prints + (i % 5) * 0.12 ? (
              <g transform={`translate(90 110) scale(${boing(t, prints + (i % 5) * 0.12, 0.35)}) rotate(-20)`} opacity={0.85}>
                {[14, 24, 34, 44].map((r) => <ellipse key={r} rx={r * 0.8} ry={r} fill="none" stroke={RED} strokeWidth={5} />)}
              </g>
            ) : null}
          </g>
        );
      })}
      <path d={path} fill="none" stroke={RED} strokeWidth={10} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
      {far > 0 ? <path d={ext} fill="none" stroke={RED} strokeWidth={10} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - far} /> : null}
    </g>
  );
};

const Dawn: React.FC = () => {
  const t = useGT();
  const w = S("end2");
  const peace = pr(t, w - 0.3, w + 1.0);
  return (
    <g>
      <Defs />
      <Bedroom t={t} dawn={pr(t, S("end1") - 0.2, S("end1") + 1.4)} />
      {/* light rays */}
      <g opacity={0.35 * peace}>
        {[0, 1, 2, 3].map((i) => <path key={i} d={`M${700 + i * 50},560 L${200 + i * 160},1300 L${300 + i * 160},1300 Z`} fill="#fff1c2" />)}
      </g>
      <Ken x={SEAT_X} y={SEAT_Y} t={t} pose={posed(t, [[0, SIT_STILL], [w, SIT_STILL], [w + 0.8, { ...SIT_STILL, head: -6 }]])} talk={talkAt(t) * 0.75} smile={lerp(0.4, 1, peace)} droop={peace * 0.75} uid="k13" />
    </g>
  );
};

const CTA: React.FC = () => {
  const t = useGT();
  const a = S("cta");
  const items: [string, string, string][] = [["H", "History", RED], ["E", "Every page", GOLDF], ["A", "Around you", "#79b38b"], ["R", "Rearview", "#7f9fd6"]];
  return (
    <g>
      <Defs />
      <rect x={-2000} y={-2000} width={6000} height={6000} fill={CREAM} />
      <PlateImg name="studio" />
      {items.map(([c, w, col], i) => {
        const p = boing(t, a - 0.6 + i * 0.12, 0.45);
        if (p <= 0) return null;
        const x = i % 2 ? 790 : 290;
        const y = i < 2 ? 760 : 1110;
        return (
          <g key={c} transform={`translate(${x} ${y}) scale(${p})`}>
            <rect x={-230} y={-150} width={460} height={300} rx={36} fill="#fffdf7" stroke={INK} strokeWidth={9} />
            <rect x={-200} y={-120} width={160} height={160} rx={24} fill={col} stroke={INK} strokeWidth={8} />
            <WText x={-120} y={14} size={130} font="anton" color="#fff" stroke={12}>{c}</WText>
            <WText x={-20} y={-20} size={44} font="anton" anchor="start">{w.split(" ")[0].toUpperCase()}</WText>
            <WText x={-20} y={34} size={44} font="anton" anchor="start">{(w.split(" ")[1] ?? "").toUpperCase()}</WText>
            <WText x={0} y={118} size={30} color="#8d8471">{["the empty tomb", "His word, kept", "people He sends", "His red thread"][i]}</WText>
          </g>
        );
      })}
      <Ken x={860} y={1830} t={t} pose={POINT_UP} talk={talkAt(t)} smile={0.9} uid="k14" s={0.68} />
    </g>
  );
};

/* ---------- the edit ---------- */

/** A sound effect at a global time. */
const Sfx: React.FC<{ at: number; name: string; vol?: number }> = ({ at, name, vol = 1 }) =>
  at < 0 ? null : (
    <Sequence from={Math.max(0, Math.round(at * FPS))} layout="none" name={`sfx ${name}`}>
      <Audio src={staticFile(`sfx/${name}.wav`)} volume={vol} />
    </Sequence>
  );

const ShotBg: React.FC<{ from: number; to: number; keys: Key[]; children: React.ReactNode; enter?: "zoom" | "cut" | "fade"; exit?: "zoom" | "cut" | "fade"; shake?: [number, number, number?][]; bg?: string }> = (p) => {
  const moves = p.keys.slice(0, -1).map((k, n) => [k[0], p.keys[n + 1][0], Math.abs(Math.log(p.keys[n + 1][1] / k[1])) + Math.hypot(p.keys[n + 1][2] - k[2], p.keys[n + 1][3] - k[3]) / 900] as const)
    .filter(([a, b, amt]) => amt > 0.12 && b - a > 0.2 && b - a < 2.5);
  return (
    <>
      <Shot {...p} />
      {p.from > 0.05 && p.enter !== "cut" ? <Sfx at={p.from - 0.42} name="whoosh" vol={p.enter === "fade" ? 0.22 : 0.38} /> : null}
      {moves.map(([a, b, amt], n) => <Sfx key={n} at={a - 0.05} name="swish" vol={Math.min(0.38, 0.14 + amt * 0.25) * Math.min(1, (b - a) / 0.6 + 0.4)} />)}
      {(p.shake ?? []).map(([at, amp], n) => <Sfx key={"h" + n} at={at} name="hit" vol={Math.min(0.9, amp / 30)} />)}
    </>
  );
};

export const Hear3D: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const T = {
    years: S("years") - 0.12, turn: S("turn") - 0.15, how: S("how") - 0.15, h: S("h1") - 0.12, e2: S("e2") - 0.1,
    thousand: At("e2", "thousand") - 0.5, e: S("e1") - 0.12, e3: S("e3") - 0.1, a: S("a1") - 0.12, a3: S("a3") - 0.1,
    r: S("r1") - 0.12, r2: S("r2") - 0.1, end: S("end1") - 0.2, cta: S("cta") - 0.6, loop: data.total - 0.62,
  };
  const its = At("h2", "it's");
  const seen = At("h2", "seen");
  const hookOut = 1.35;
  const TX = anchorOf("hills", "tomb_door")[0] - 60;
  return (
    <AbsoluteFill style={{ background: CREAM }}>
      {/* The audio of the approved cut (voice + score), untouched. */}
      <Sequence layout="none"><Audio src={staticFile("hear7/final.wav")} /></Sequence>

      {/* 1. Hook: the unanswered text, then the room at 2 a.m. */}
      <ShotBg from={0} to={hookOut} keys={[[0, 1.0, 540, 1000], [hookOut, 1.18, 560, 1030]]} enter="cut" bg="#1a1f33"><PhoneOpen /></ShotBg>
      <ShotBg from={hookOut} to={T.years} keys={[[hookOut, 2.0, 470, 900], [T.years, 1.15, 480, 960]]} bg="#3a4363"><HookRoom /></ShotBg>
      {/* 2. Years of prayer. */}
      <ShotBg from={T.years} to={T.turn} keys={[[T.years, 1.0, 560, 960], [At("years", "never"), 1.2, 600, 940], [T.turn, 1.45, 640, 920]]} bg="#3a4363"><Years /></ShotBg>
      {/* 3. The turn: the radio was on the wrong station. */}
      <ShotBg from={T.turn} to={T.how} keys={[[T.turn, 1.0, 560, 980], [At("turn", "what", 1), 1.3, 540, 1010], [At("turn", "wrong") + 0.2, 1.4, 560, 1000], [T.how, 1.35, 560, 1010]]}><Radio /></ShotBg>
      {/* 4. Here's how you HEAR Him. */}
      <ShotBg from={T.how} to={T.h} keys={[[T.how, 1.6, 540, 820], [At("how", "hear"), 1.0, 540, 940], [T.h, 1.0, 540, 940]]}><HowScene /></ShotBg>
      {/* 5. H: a feeling vs. documented history, the tomb, 500+ witnesses. */}
      <ShotBg from={T.h} to={T.e2} keys={[[T.h, 0.95, 400, 980], [its - 0.3, 1.0, 420, 990], [its + 0.5, 1.0, TX, 940], [seen, 1.0, TX, 960], [seen + 1.5, 0.42, TX, 1000], [T.e2, 0.4, TX, 1000]]}><History /></ShotBg>
      {/* 6. The Dead Sea Scrolls: preserved for a thousand years. */}
      <ShotBg from={T.e2} to={T.thousand} keys={[[T.e2, 0.75, 500, 960], [At("e2", "dead") - 0.2, 0.9, 600, 940], [At("e2", "scrolls") + 0.2, 1.0, 700, 820], [T.thousand, 1.05, 700, 800]]}><Qumran /></ShotBg>
      <ShotBg from={T.thousand} to={T.e} keys={[[T.thousand, 1.2, 540, 980], [T.e, 0.95, 540, 1000]]}><Timeline /></ShotBg>
      {/* 7. E: Every page. */}
      <ShotBg from={T.e} to={T.e3} keys={[[T.e, 1.25, 540, 980], [T.e3, 0.95, 540, 980]]}><EveryPage /></ShotBg>
      <ShotBg from={T.e3} to={T.a} keys={[[T.e3, 1.5, 560, 820], [At("e3", "every"), 1.15, 560, 900], [T.a, 1.0, 560, 940]]}><ReadAloud /></ShotBg>
      {/* 8. A: Around you — the text that came at the right time, then the people around him. */}
      <ShotBg from={T.a} to={T.a3} keys={[[T.a, 0.95, 640, 960], [At("a2", "god"), 1.15, 600, 880], [T.a3, 1.2, 600, 860]]}><FriendText /></ShotBg>
      <ShotBg from={T.a3} to={T.r} keys={[[T.a3, 1.5, 540, 960], [At("a3", "people") + 0.2, 0.82, 540, 980], [T.r, 0.8, 540, 980]]}><People /></ShotBg>
      {/* 9. R: Rearview — into the mirror, onto the board of moments and the red thread. */}
      <ShotBg from={T.r} to={T.r2} keys={[[T.r, 0.85, 540, 960], [T.r2 - 0.3, 3.4, 512, 948], [T.r2, 4.6, 510, 946]]}><Car /></ShotBg>
      <ShotBg
        from={T.r2} to={T.end}
        keys={[[T.r2, 1.4, 520, 900], [At("r2", "every"), 1.2, 400, 820], [At("r2", "every", 1), 1.2, 700, 1100], [At("r2", "red"), 1.0, 540, 980], [At("r2", "fingerprints") + 0.3, 1.05, 540, 1000], [At("r2", "everywhere"), 1.0, 540, 1000], [At("r2", "everywhere") + 0.9, 0.45, 540, 1050], [T.end, 0.44, 540, 1050]]}
        bg="#c49a66"
      >
        <Thread />
      </ShotBg>
      {/* 10. The same room, now dawn: the whisper. */}
      <ShotBg from={T.end} to={T.cta} keys={[[T.end, 1.0, 520, 960], [S("end2") + 0.6, 1.3, 470, 900], [T.cta, 1.5, 460, 870]]} enter="fade" bg="#f3dfbd"><Dawn /></ShotBg>
      {/* 11. The save card, then back into the phone: the loop. */}
      <ShotBg from={T.cta} to={T.loop} keys={[[T.cta, 0.9, 540, 1080], [T.loop, 1.0, 540, 1080]]}><CTA /></ShotBg>
      <ShotBg from={T.loop} to={H3D_SECONDS + 1} keys={[[T.loop, 1.0, 540, 1000]]} bg="#1a1f33"><PhoneOpen /></ShotBg>

      {/* screen-space titles and receipts */}
      <Title lines={["If God is real,", "why is He", ["so quiet?", RED]]} at={0.1} until={T.years - 0.1} size={118} top={200} />
      <Title lines={["Listening for", "the", ["wrong thing?", RED]]} at={At("turn", "what", 1)} until={T.how - 0.2} size={112} top={200} />
      <Title lines={[[["H", RED], ["is for", "#fff"]], "history"]} at={S("h1")} until={seen - 0.1} size={120} top={200} />
      <Receipt at={seen + 0.3} until={T.e2 - 0.1} head="1 Corinthians 15:6" body="Seen by 500+ people at once." y={240} rot={2} />
      <Receipt at={At("e2", "scrolls") + 0.7} until={T.thousand - 0.05} head="Great Isaiah Scroll" body="Qumran Cave 1 · c. 125 BC" y={1190} rot={-2} dark />
      <Title lines={[[["E", GOLDF], ["is for", "#fff"]], "every page"]} at={S("e1")} until={T.e3} size={112} top={200} />
      <Receipt at={S("e3") + 0.1} until={At("e3", "every") - 0.1} head="2 Timothy 3:16" body="All Scripture is breathed out by God." y={250} />
      <Receipt at={At("e3", "voice") - 0.3} until={T.a - 0.1} head="Romans 10:17" body="Faith comes from hearing." y={250} rot={2} />
      <Title lines={[[["A", "#79b38b"], ["is for", "#fff"]], "around you"]} at={S("a1")} until={At("a2", "god") + 0.1} size={112} top={200} />
      <Title lines={[[["R", "#7f9fd6"], ["is for", "#fff"]], "rearview"]} at={S("r1")} until={T.r2} size={120} top={200} />
      <Receipt at={At("r2", "fingerprints") - 0.1} until={T.end - 0.1} head="Romans 8:28" body="In all things God works for good." y={250} rot={-2} />
      <Title lines={["He was never", ["silent", GOLDF]]} at={S("end1") - 0.1} until={T.cta - 0.1} size={124} top={210} />
      <Title lines={["Which letter did", "you need", ["today?", RED]]} at={T.cta + 0.1} until={T.loop - 0.05} size={104} top={200} />
      <Receipt at={S("cta") + 0.1} until={T.loop - 0.05} head="Comment below" body="H · E · A · R" y={1400} x={390} w={520} rot={-2} dark />

      {/* motion sounds, layered lightly over the approved mix */}
      {[0.1, At("turn", "what", 1), S("h1"), S("e1"), S("a1"), S("r1"), S("end1") - 0.1, T.cta + 0.1].map((x, n) => <Sfx key={"tp" + n} at={x} name="pop" vol={0.3} />)}
      {[seen + 0.3, At("e2", "scrolls") + 0.7, S("e3") + 0.1, At("e3", "voice") - 0.3, At("r2", "fingerprints") - 0.1, S("cta") + 0.1].map((x, n) => <Sfx key={"rp" + n} at={x} name="pop" vol={0.25} />)}
      {[S("h1"), S("e1"), S("a1"), S("r1")].map((x, n) => <Sfx key={"lh" + n} at={x - 0.02} name="hit" vol={0.35} />)}
      <Sfx at={At("how", "hear") - 1.1} name="riser" vol={0.25} />
      <Sfx at={At("h2", "it's") - 0.15} name="tick" vol={0.4} />
      <Paper />
      <SoftVignette />
      {t < T.cta ? <Captions words={WORDS} top={1480} /> : null}
    </AbsoluteFill>
  );
};
