import React from "react";
import { AbsoluteFill, Sequence, staticFile } from "remotion";
import { Audio } from "@remotion/media";
import { Captions, FONTS, FPS, HEAD_DOWN, IDLE, KNEEL, lerp, OPEN_HANDS, Pose, POINT_UP, posed, SHRUG, Word } from "../Kit";
import data from "../data/seen.json";
import data1 from "../data/seen1.json";
import data2 from "../data/seen2.json";
import { Creator, Face } from "./Creator";
import {
  boing, Bubble, Cloud, CREAM, CrossMark, Defs, GOLDF, INK, Land, Paper, Person, pop, pr, Receipt, RED, Shot, SIT, SoftVignette, Title, useGT, WText, XMark,
} from "./World";

/* "God left me on seen": the Logia reel on God's silence. Timing comes from the narration (scripts/vo-seen.js). */

type Line = { id: string; start: number; end: number; words: Word[] };
type Data = { total: number; lines: Line[]; env: number[] };
let LINES = data.lines as Line[];
let ENV = (data.env ?? []) as number[];
let WORDS: Word[] = [];
let TOTAL = 0;
/** Selects which narration (full cut, part 1 or part 2) every timing helper reads. Called first by each composition. */
const use = (d: Data) => {
  LINES = d.lines;
  ENV = d.env ?? [];
  WORDS = LINES.flatMap((l) => l.words.map((w, i) => ({ ...w, brk: i === l.words.length - 1 || /[.?!,:…]$/.test(w.text) || undefined })));
  TOTAL = d.total + 0.2;
};
use(data as Data);
const L = (id: string) => {
  const l = LINES.find((x) => x.id === id);
  if (!l) throw new Error("no line " + id);
  return l;
};
const has = (id: string) => LINES.some((x) => x.id === id);
/** Lines a shorter cut may leave out, with the moment to use instead. */
const FALLBACK: Record<string, () => number> = { f2: () => L("f1").end - 0.25 };
const S = (id: string): number => (!has(id) && FALLBACK[id] ? FALLBACK[id]() : L(id).start);
const E = (id: string) => L(id).end;
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const At = (id: string, w: string) => {
  const hit = L(id).words.find((x) => norm(x.text).startsWith(norm(w)));
  if (!hit) throw new Error(`no word ${w} in ${id}`);
  return hit.start;
};
export const SEEN_SECONDS = data.total + 0.2;
export const SEEN1_SECONDS = data1.total + 0.2;
export const SEEN2_SECONDS = data2.total + 0.2;

const talkAt = (t: number) => {
  const i = Math.floor(t * FPS);
  const v = ((ENV[i] ?? 0) + (ENV[i - 1] ?? 0) * 0.6 + (ENV[i + 1] ?? 0) * 0.4) / 2;
  return Math.max(0, Math.min(0.8, (v - 0.1) * 1.15));
};
const mix = lerp;
const BLUE = "#34a7f1";
const NIGHT = "#2b3352";

/* ---------- host framing: a creator talking to camera, bust in the lower half ---------- */

const PHONE: Pose = { ...IDLE, rs: -50, re: -100, ls: 6, le: -8, head: 5 };
const PRAY_K: Pose = { ...KNEEL, ls: 20, le: -140, rs: -20, re: 140, head: 10, torso: 3 };
const LOUD: Pose = { ...IDLE, ls: 100, le: 134, rs: -100, re: -134, head: -8, torso: -2 };
const ASIDE: Pose = { ...IDLE, ls: 96, le: 138, rs: -6, re: 6, head: 6, torso: 5 };
const PREACH: Pose = { ...POINT_UP, ls: 24, le: -128, head: -6, torso: -2 };

const Host: React.FC<Face & { pose?: Pose; hold?: "phone" | "phoneGlow" | "bible" | null; x?: number; y?: number; s?: number; tilt?: number; quiet?: boolean }> = ({
  pose = IDLE, hold = null, x = 540, y = 2140, s = 2.0, quiet, ...face
}) => {
  const t = useGT();
  return <Creator x={x} y={y} s={s} t={t} pose={pose} hold={hold} talk={quiet ? 0 : talkAt(t)} {...face} />;
};

/* ---------- reusable drawings ---------- */

const Ticks: React.FC<{ x: number; y: number; c?: string; s?: number }> = ({ x, y, c = BLUE, s = 1 }) => (
  <path d="M0,0 l9,9 l17,-20 M13,2 l7,7 l17,-20" transform={`translate(${x} ${y}) scale(${s})`} fill="none" stroke={c} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
);

/** The chat with God: one sent message, "Seen", and a typing bubble that gives up. u = seconds since it appeared. */
const ChatCard: React.FC<{ u: number; x?: number; y?: number; s?: number; seenAt?: number; typing?: [number, number]; dim?: number; strike?: number }> = ({
  u, x = 540, y = 470, s = 1, seenAt = 0.45, typing, dim = 0, strike,
}) => {
  const seen = pop(u, seenAt, 0.25);
  const ty = typing ? pop(u, typing[0], 0.2) * (1 - pr(u, typing[1], typing[1] + 0.18)) : 0;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={1 - dim}>
      <rect x={-350} y={10} width={700} height={330} rx={38} fill={INK} />
      <rect x={-350} y={0} width={700} height={330} rx={38} fill="#fffdf7" stroke={INK} strokeWidth={7} />
      <path d="M-350,96 H350" stroke="#e5ded0" strokeWidth={4} />
      <circle cx={-290} cy={50} r={30} fill={GOLDF} stroke={INK} strokeWidth={5} />
      <WText x={-290} y={64} size={36} font="anton">G</WText>
      <WText x={-244} y={46} size={38} anchor="start">God</WText>
      <WText x={-244} y={78} size={24} anchor="start" color="#3aa35c">online</WText>
      <rect x={10} y={122} width={310} height={84} rx={40} fill="#3478f6" stroke={INK} strokeWidth={5} />
      <WText x={165} y={178} size={38} color="#fff">Hello God??</WText>
      {seen > 0 ? (
        <g transform={`translate(250 244) scale(${seen}) translate(-250 -244)`}>
          <WText x={258} y={256} size={32} anchor="end" color={BLUE}>Seen</WText>
          <Ticks x={270} y={244} />
        </g>
      ) : null}
      {ty > 0 ? (
        <g transform={`translate(-250 260) scale(${ty}) translate(250 -260)`}>
          <rect x={-320} y={224} width={150} height={72} rx={34} fill="#e9e6df" stroke={INK} strokeWidth={5} />
          {[0, 1, 2].map((i) => <circle key={i} cx={-276 + i * 32} cy={260 - Math.max(0, Math.sin(u * 9 - i * 0.9)) * 9} r={9} fill="#8c877d" />)}
        </g>
      ) : null}
      {strike !== undefined ? <XMark x={236} y={250} s={0.42} at={strike} /> : null}
    </g>
  );
};

const NightRoom: React.FC<{ floor?: number }> = ({ floor = 1400 }) => {
  const t = useGT();
  return (
    <g>
      <rect x={-2000} y={-2500} width={5000} height={2500 + floor} fill={NIGHT} />
      {Array.from({ length: 14 }).map((_, i) => <rect key={i} x={-1200 + i * 260} y={-2500} width={6} height={2500 + floor} fill="#333c60" />)}
      <rect x={-2000} y={floor} width={5000} height={2600} fill="#222a45" />
      <path d={`M-2000,${floor} H3000`} stroke={INK} strokeWidth={6} />
      {/* window with moon */}
      <rect x={90} y={floor - 560} width={230} height={290} rx={12} fill="#151b33" stroke={INK} strokeWidth={9} />
      <circle cx={250} cy={floor - 480} r={34} fill="#f4f0d8" stroke={INK} strokeWidth={5} />
      <path d={`M205,${floor - 560} V${floor - 270} M90,${floor - 415} H320`} stroke={INK} strokeWidth={8} />
      {/* fairy lights */}
      <path d={`M-200,${floor - 720} Q200,${floor - 640} 540,${floor - 700} Q900,${floor - 760} 1300,${floor - 690}`} fill="none" stroke={INK} strokeWidth={4} />
      {Array.from({ length: 11 }).map((_, i) => {
        const x = -120 + i * 130;
        const y = floor - 690 + Math.sin(i * 1.3) * 22;
        return <circle key={i} cx={x} cy={y} r={11} fill={i % 2 ? "#ffd774" : "#ff9d7a"} stroke={INK} strokeWidth={4} opacity={0.75 + 0.25 * Math.sin(t * 3 + i)} />;
      })}
    </g>
  );
};

const Bed: React.FC<{ x: number; floor: number }> = ({ x, floor }) => (
  <g transform={`translate(${x} ${floor})`}>
    <rect x={-330} y={-250} width={44} height={250} rx={10} fill="#6a503e" stroke={INK} strokeWidth={7} />
    <rect x={-310} y={-126} width={640} height={84} rx={18} fill="#566596" stroke={INK} strokeWidth={7} />
    <path d="M-210,-126 Q40,-150 330,-112 L330,-70 Q60,-76 -210,-56 Z" fill="#6f8bc8" stroke={INK} strokeWidth={6} />
    <rect x={-280} y={-170} width={150} height={56} rx={24} fill="#f4f0e6" stroke={INK} strokeWidth={6} />
    <rect x={-300} y={-44} width={28} height={44} fill={INK} />
    <rect x={294} y={-44} width={28} height={44} fill={INK} />
  </g>
);

const SeenPill: React.FC<{ y: number; at: number; n: number }> = ({ y, at, n }) => {
  const t = useGT();
  const p = boing(t, at, 0.4);
  if (p <= 0) return null;
  return (
    <g transform={`translate(540 ${y}) scale(${p}) rotate(${n % 2 ? 1.5 : -1.5})`}>
      <rect x={-270} y={-34} width={540} height={84} rx={42} fill={INK} />
      <rect x={-270} y={-42} width={540} height={84} rx={42} fill="#fffdf7" stroke={INK} strokeWidth={6} />
      <circle cx={-222} cy={0} r={26} fill={GOLDF} stroke={INK} strokeWidth={5} />
      <WText x={-222} y={12} size={30} font="anton">G</WText>
      <WText x={-180} y={13} size={36} anchor="start">God</WText>
      <WText x={170} y={13} size={36} anchor="end" color={BLUE}>Seen</WText>
      <Ticks x={186} y={0} />
    </g>
  );
};

const Tile: React.FC<{ x: number; y: number; p: number; label: string; icon: "book" | "people" | "mic" | "thread"; badge?: number; check?: number }> = ({ x, y, p, label, icon, badge = 0, check = 0 }) => {
  if (p <= 0) return null;
  return (
    <g transform={`translate(${x} ${y}) scale(${p})`}>
      <rect x={-98} y={-90} width={196} height={200} rx={34} fill={INK} />
      <rect x={-98} y={-100} width={196} height={200} rx={34} fill="#fffdf7" stroke={INK} strokeWidth={7} />
      <g transform="translate(0 -30)">
        {icon === "book" ? (
          <g>
            <rect x={-38} y={-44} width={76} height={92} rx={8} fill="#7a3b2e" stroke={INK} strokeWidth={6} />
            <path d="M0,-28 V16 M-16,-12 H16" stroke={GOLDF} strokeWidth={8} strokeLinecap="round" />
          </g>
        ) : icon === "people" ? (
          <g>
            <circle cx={-22} cy={-20} r={22} fill="#7fa7d9" stroke={INK} strokeWidth={6} />
            <circle cx={24} cy={-20} r={22} fill="#e59a6b" stroke={INK} strokeWidth={6} />
            <path d="M-56,46 Q-22,-10 12,46 Z M-10,46 Q24,-10 58,46 Z" fill="#fffdf7" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
          </g>
        ) : icon === "mic" ? (
          <g>
            <rect x={-20} y={-50} width={40} height={66} rx={20} fill="#9d7ec9" stroke={INK} strokeWidth={6} />
            <path d="M-34,-2 Q-34,34 0,34 Q34,34 34,-2 M0,34 V50 M-22,50 H22" fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" />
          </g>
        ) : (
          <g>
            <rect x={-30} y={-46} width={60} height={92} rx={10} fill="#e9d9b8" stroke={INK} strokeWidth={6} />
            <path d="M-30,-22 H30 M-30,-4 H30 M-30,14 H30" stroke={RED} strokeWidth={10} />
            <path d="M30,22 q26,10 16,34 q-8,18 -34,10" fill="none" stroke={RED} strokeWidth={6} strokeLinecap="round" />
          </g>
        )}
      </g>
      <WText x={0} y={76} size={25} color={INK}>{label}</WText>
      {badge > 0 && check <= 0 ? (
        <g transform={`translate(86 -92) scale(${badge})`}>
          <circle r={30} fill={RED} stroke={INK} strokeWidth={6} />
          <WText x={0} y={13} size={36} color="#fff">1</WText>
        </g>
      ) : null}
      {check > 0 ? (
        <g transform={`translate(86 -92) scale(${check})`}>
          <circle r={30} fill="#3aa35c" stroke={INK} strokeWidth={6} />
          <path d="M-13,1 l9,10 l17,-20" fill="none" stroke="#fff" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ) : null}
    </g>
  );
};
const TILES: { label: string; icon: "book" | "people" | "mic" | "thread" }[] = [
  { label: "HIS WORD", icon: "book" }, { label: "PEOPLE", icon: "people" }, { label: "SERMON", icon: "mic" }, { label: "YOUR STORY", icon: "thread" },
];

const Card: React.FC<{ x: number; y: number; w: number; h: number; p: number; rot?: number; fill?: string; children?: React.ReactNode }> = ({ x, y, w, h, p, rot = 0, fill = "#fffdf7", children }) =>
  p <= 0 ? null : (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${p})`}>
      <rect x={-w / 2} y={-h / 2 + 10} width={w} height={h} rx={30} fill={INK} />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={30} fill={fill} stroke={INK} strokeWidth={7} />
      {children}
    </g>
  );

/** A veiled sister in a white sari with blue borders (blank-faced like every extra in this world). */
const Sister: React.FC<{ x: number; y: number; s?: number; bob?: number }> = ({ x, y, s = 1, bob = 0 }) => (
  <g transform={`translate(${x} ${y + bob}) scale(${s})`}>
    <ellipse cy={6} rx={84} ry={12} fill={INK} opacity={0.12} />
    <path d="M-50,-250 Q0,-272 50,-250 L82,0 Q0,16 -82,0 Z" fill="#fbfaf6" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
    <path d="M-76,-44 Q0,-30 76,-44 M-78,-28 Q0,-14 78,-28 M-80,-12 Q0,2 80,-12" fill="none" stroke="#2f62c9" strokeWidth={6} />
    <circle cx={0} cy={-300} r={46} fill="#fbfaf6" stroke={INK} strokeWidth={6} />
    <path d="M-58,-292 Q-60,-366 0,-366 Q60,-366 58,-292 L70,-216 Q40,-236 36,-290 Q32,-334 0,-334 Q-32,-334 -36,-290 Q-40,-236 -70,-216 Z" fill="#fbfaf6" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
    <path d="M-49,-296 Q-50,-356 0,-356 Q50,-356 49,-296 M-43,-298 Q-43,-346 0,-346 Q43,-346 43,-298" fill="none" stroke="#2f62c9" strokeWidth={5} />
    <circle cx={0} cy={-186} r={17} fill="#fbfaf6" stroke={INK} strokeWidth={5} />
  </g>
);

const David: React.FC<{ x: number; y: number; s?: number; pose?: Pose; harp?: boolean }> = ({ x, y, s = 1, pose = IDLE, harp = true }) => {
  const t = useGT();
  const top = y - s * (172 - pose.drop + 158 + 100);
  return (
    <g>
      <Person x={x} y={y} s={s} t={t} pose={pose} body="#7a5cc0" hair="#5a3d2a" beard="#5a3d2a" robe />
      <path d={`M-40,0 L-40,-34 L-20,-14 L0,-40 L20,-14 L40,-34 L40,0 Z`} transform={`translate(${x + pose.head * 1.5 * s} ${top}) scale(${s})`} fill={GOLDF} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
      {harp ? (
        <g transform={`translate(${x + 150 * s} ${y}) scale(${s})`}>
          <path d="M-50,0 L-50,-250 Q40,-290 70,-180 Q40,-120 -20,0 Z" fill="none" stroke={INK} strokeWidth={26} strokeLinejoin="round" />
          <path d="M-50,0 L-50,-250 Q40,-290 70,-180 Q40,-120 -20,0 Z" fill="none" stroke="#d9a441" strokeWidth={14} strokeLinejoin="round" />
          {[-30, -12, 6, 24, 42].map((dx, i) => <line key={i} x1={dx} y1={-236 + i * 14} x2={dx} y2={-30 - i * 22} stroke={INK} strokeWidth={3} transform={`translate(${Math.sin(t * 30 + i) * 1.2} 0)`} />)}
        </g>
      ) : null}
    </g>
  );
};

/* ---------- scenes ---------- */

/** Hook (and the last beat, so the reel loops): the unanswered chat. */
const Hook: React.FC<{ from: number }> = ({ from }) => {
  const t = useGT();
  const u = t - from;
  const look = pr(u, 1.05, 1.3);
  return (
    <g>
      <Defs />
      <NightRoom floor={1500} />
      <ChatCard u={u + 0.2} seenAt={0.55} typing={[0.95, 1.45]} />
      <Host pose={PHONE} hold="phoneGlow" lx={mix(0.9, 0, look)} ly={mix(0.7, 0, look)} lid={0.28} brow={mix(-0.5, 0.3, look)} smile={-0.6} />
    </g>
  );
};

const Praying: React.FC = () => {
  const t = useGT();
  const floor = 1420;
  const pose = posed(t, [
    [S("p2") - 0.2, PRAY_K], [S("p2") + 0.08, LOUD], [E("p2") + 0.1, LOUD], [S("n2") + 0.25, SHRUG],
    [S("p3") - 0.1, SHRUG], [S("p3") + 0.2, ASIDE], [S("ohf") - 0.2, ASIDE], [S("ohf") + 0.1, PREACH], [S("n3") - 0.05, PREACH], [S("n3") + 0.3, HEAD_DOWN],
  ]);
  const loud = t >= S("p2") && t < S("n2");
  const preach = pr(t, S("ohf") - 0.1, S("ohf") + 0.15) * (1 - pr(t, S("n3") - 0.05, S("n3") + 0.1));
  const face: Face =
    t < S("n1") ? { lid: 1, smile: 0.1 }
    : t < S("p2") ? { ly: -0.9, brow: -0.6, smile: -0.3 }
    : loud ? { wide: 1, brow: -0.4 }
    : t < S("p3") ? { ly: -0.7, brow: -0.8, smile: -0.5 }
    : t < S("ohf") - 0.1 ? { lx: 0.5, brow: 0.5, smile: 0.5, lid: 0.2 }
    : t < S("n3") ? { brow: 1, lid: 0.45, smile: -0.2, ly: -0.5 }
    : { lid: 0.4, smile: -0.7, brow: -0.2 };
  const shout = loud ? boing(t, S("p2"), 0.3) : 0;
  return (
    <g>
      <Defs />
      <NightRoom floor={floor} />
      <Bed x={130} floor={floor} />
      {preach > 0 ? (
        <g opacity={preach}>
          <path d={`M440,-300 L640,-300 L880,${floor} L260,${floor} Z`} fill="#fff3c4" opacity={0.3} />
          <ellipse cx={590} cy={floor + 4} rx={320} ry={34} fill="#fff3c4" opacity={0.35} />
          <ellipse cx={590} cy={640} rx={92} ry={20} fill="none" stroke={GOLDF} strokeWidth={12} />
          <text x={590} y={560} textAnchor="middle" fontFamily={FONTS.playfair} fontStyle="italic" fontWeight={700} fontSize={78} fill="#ffe9a8" stroke={INK} strokeWidth={8} paintOrder="stroke fill">O Heavenly Father</text>
        </g>
      ) : null}
      <Creator x={590} y={floor} s={1.2} t={t} pose={pose} talk={loud ? Math.max(0.75, talkAt(t)) : talkAt(t) * (preach > 0.5 ? 1.25 : 1)} {...face} />
      {shout > 0 ? (
        <g transform={`translate(${590 + Math.sin(t * 60) * 6} 560) scale(${shout}) rotate(-5)`}>
          <WText x={0} y={0} size={170} font="anton" color={RED} stroke={18}>GOD?!</WText>
          {[-1, 1].map((k) => <path key={k} d={`M${k * 290},-110 l${k * 70},-34 M${k * 300},-50 l${k * 84},0 M${k * 290},10 l${k * 70},34`} stroke="#fff" strokeWidth={10} strokeLinecap="round" />)}
        </g>
      ) : null}
      <SeenPill y={236} at={S("n1")} n={0} />
      <SeenPill y={330} at={S("n2")} n={1} />
      <SeenPill y={424} at={S("n3")} n={2} />
    </g>
  );
};

const Either: React.FC = () => {
  const t = useGT();
  const a = boing(t, At("e1", "god") - 0.1, 0.4);
  const b = boing(t, S("e2"), 0.4);
  const away = pr(t, S("meet") - 0.05, S("meet") + 0.35);
  const two = At("meet", "two");
  const look = t < S("e2") ? -0.75 * Math.min(1, a) : t < S("meet") ? 0.75 : 0;
  const pose = posed(t, [[S("e2") - 0.2, IDLE], [S("e2") + 0.15, SHRUG], [S("meet") - 0.1, SHRUG], [S("meet") + 0.25, { ...POINT_UP, head: -2 }]]);
  return (
    <g>
      <Defs />
      <Land floor={1640} />
      <Cloud x={160} y={250} s={0.7} t={t} />
      <Cloud x={930} y={330} s={0.55} t={t} />
      <g transform={`translate(0 ${-away * 1100})`}>
        <Card x={290} y={610} w={430} h={340} p={a} rot={-3}>
          <WText x={0} y={-112} size={30} color={RED}>OPTION A</WText>
          <WText x={0} y={30} size={112} font="anton" color="#cfc6b4">404</WText>
          <WText x={0} y={90} size={40}>God not found</WText>
          <WText x={0} y={134} size={28} color="#8c877d">(isn't real)</WText>
        </Card>
        <Card x={790} y={610} w={430} h={340} p={b} rot={3}>
          <WText x={0} y={-112} size={30} color={RED}>OPTION B</WText>
          <circle cx={0} cy={-22} r={58} fill={GOLDF} stroke={INK} strokeWidth={6} />
          <WText x={0} y={2} size={66} font="anton">G</WText>
          <circle cx={0} cy={-22} r={74} fill="none" stroke={RED} strokeWidth={14} />
          <path d="M-52,-74 L52,30" stroke={RED} strokeWidth={14} strokeLinecap="round" />
          <WText x={0} y={112} size={38}>blocked my number</WText>
        </Card>
      </g>
      {[0, 1].map((i) => {
        const p = boing(t, two + i * 0.16, 0.4);
        return (
          <Card key={i} x={i ? 770 : 310} y={600} w={360} h={380} p={p} rot={i ? 4 : -4} fill={i ? "#dfe9f3" : "#f6e7c3"}>
            <circle cx={0} cy={-50} r={64} fill="#fbfaf6" stroke={INK} strokeWidth={7} />
            <path d="M-110,150 Q-100,20 0,20 Q100,20 110,150 Z" fill="#fbfaf6" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
            <WText x={0} y={-26} size={90} font="anton" color={RED}>?</WText>
          </Card>
        );
      })}
      <Host pose={pose} lx={look} brow={t < S("meet") ? -0.5 : 0.2} smile={t < S("meet") ? -0.3 : 0.7} />
    </g>
  );
};

const DavidScene: React.FC = () => {
  const t = useGT();
  const floor = 1420;
  const sad = pr(t, S("d3") - 0.1, S("d3") + 0.5);
  const pose = posed(t, [[S("d3") - 0.1, { ...IDLE, rs: -64, re: -30, ls: 20, head: -2 }], [S("d3") + 0.5, { ...KNEEL, head: 16, ls: 10, le: -40, rs: -10, re: 40 }]]);
  const list = boing(t, S("d2") - 0.05, 0.4) * (1 - pr(t, S("d3") - 0.1, S("d3") + 0.15));
  const scroll = pr(t, S("d3"), S("d3") + 0.45);
  const stamp = boing(t, At("d6", "deleted") - 0.05, 0.35) * (1 - pr(t, S("d7"), S("d7") + 0.2));
  const kept = boing(t, At("d7", "kept"), 0.45);
  return (
    <g>
      <Defs />
      <Land floor={floor} sky="#f8ebc8" hill="#ecd49c" ground="#e6cd94" line="#cfae6a" />
      <circle cx={880} cy={330} r={90} fill="#ffd774" stroke={INK} strokeWidth={6} />
      <David x={250} y={floor} s={1.3} pose={pose} harp={sad < 0.5} />
      {sad < 0.4 ? [0, 1, 2].map((i) => {
        const k = ((t * 0.7 + i * 0.33) % 1);
        return <WText key={i} x={470 + i * 40 + Math.sin(k * 6 + i) * 20} y={1050 - k * 300} size={70} font="anton" color={INK} opacity={Math.sin(k * Math.PI)}>♪</WText>;
      }) : null}
      <Card x={730} y={690} w={540} h={400} p={list} rot={2}>
        <WText x={-230} y={-130} size={30} anchor="start" color={RED}>TOP WORSHIP HITS</WText>
        <WText x={-230} y={-74} size={56} anchor="start" font="anton">PSALMS</WText>
        {["Psalm 23", "Psalm 51", "Psalm 103"].map((n, i) => (
          <g key={n} transform={`translate(0 ${-10 + i * 62})`}>
            <path d="M-226,-16 L-200,0 L-226,16 Z" fill={INK} />
            <WText x={-180} y={12} size={36} anchor="start">{n}</WText>
            <WText x={230} y={12} size={28} anchor="end" color="#8c877d">David</WText>
          </g>
        ))}
      </Card>
      {scroll > 0 ? (
        <g transform={`translate(720 780) rotate(-2)`}>
          <g transform={`scale(1 ${scroll})`}>
            <rect x={-290} y={-250} width={580} height={500} fill="#fbf1d6" stroke={INK} strokeWidth={7} />
          </g>
          <rect x={-320} y={-250 * scroll - 28} width={640} height={50} rx={25} fill="#e2c890" stroke={INK} strokeWidth={7} />
          <rect x={-320} y={250 * scroll - 22} width={640} height={50} rx={25} fill="#e2c890" stroke={INK} strokeWidth={7} />
          <g opacity={pr(t, S("d4") - 0.05, S("d4") + 0.2)}>
            <WText x={0} y={-80} size={86} font="anton">HOW LONG,</WText>
            <WText x={0} y={10} size={86} font="anton" color={RED}>LORD?</WText>
          </g>
          <g opacity={pr(t, S("d5") - 0.05, S("d5") + 0.2)}>
            <WText x={0} y={100} size={44}>Will you forget me</WText>
            <WText x={0} y={156} size={44}>forever?</WText>
          </g>
          {stamp > 0 ? (
            <g transform={`translate(20 -10) rotate(-12) scale(${stamp})`}>
              <rect x={-250} y={-58} width={500} height={116} rx={14} fill="rgba(255,253,247,0.92)" stroke={RED} strokeWidth={10} />
              <WText x={0} y={26} size={72} font="anton" color={RED}>DELETED SCENE</WText>
            </g>
          ) : null}
          {stamp > 0 ? <XMark x={20} y={-10} s={1.1} at={At("d6", "deleted") + 0.55} /> : null}
          {kept > 0 ? (
            <g transform={`translate(150 -230) rotate(8) scale(${kept})`}>
              <rect x={-170} y={-50} width={340} height={100} rx={50} fill="#3aa35c" stroke={INK} strokeWidth={7} />
              <WText x={-14} y={22} size={58} font="anton" color="#fff">KEPT</WText>
              <path d="M84,-2 l12,13 l24,-28" fill="none" stroke="#fff" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
            </g>
          ) : null}
        </g>
      ) : null}
    </g>
  );
};

const Bridge: React.FC<{ x: number; y: number; c?: string }> = ({ x, y, c = "#93a6c2" }) => (
  <g transform={`translate(${x} ${y})`} fill="none" stroke={c} strokeLinecap="round" strokeLinejoin="round">
    <path d="M-700,0 H700" strokeWidth={16} />
    <path d="M-620,0 L-300,-250 Q0,-70 300,-250 L620,0" strokeWidth={12} />
    <path d="M-300,-250 V40 M300,-250 V40" strokeWidth={18} />
    {[-520, -440, -370, -220, -140, -60, 60, 140, 220, 370, 440, 520].map((dx) => {
      const ax = Math.abs(dx);
      const top = ax > 300 ? -250 * (1 - (ax - 300) / 320) : -70 - 180 * Math.pow(ax / 300, 2);
      return <path key={dx} d={`M${dx},0 V${top}`} strokeWidth={6} />;
    })}
  </g>
);

const TeresaScene: React.FC = () => {
  const t = useGT();
  const floor = 1420;
  const dawn = pr(t, S("t5") - 0.2, S("t5") + 1.2);
  const walk = pr(t, S("t5"), E("t5") + 0.4);
  const letters = boing(t, At("t3", "private") - 0.1, 0.4) * (1 - pr(t, S("t5") - 0.2, S("t5")));
  const quiet = pop(t, At("t3", "absent") - 0.2, 0.3) * (1 - pr(t, S("t4") - 0.25, S("t4") - 0.1));
  return (
    <g>
      <Defs />
      <rect x={-2000} y={-2500} width={5000} height={2500 + floor} fill="#dbe6f2" />
      <rect x={-2000} y={-2500} width={5000} height={2500 + floor} fill="#ffe2ad" opacity={dawn} />
      <circle cx={760} cy={lerp(1330, 880, dawn)} r={110} fill="#ffc94d" stroke={INK} strokeWidth={6} opacity={dawn} />
      <Bridge x={540} y={1210} c={dawn > 0.5 ? "#b98a5a" : "#93a6c2"} />
      <rect x={-2000} y={1210} width={5000} height={floor - 1210} fill={dawn > 0.5 ? "#f0cf9a" : "#c3d2e4"} />
      <path d="M-2000,1210 H3000" stroke="#8fa3bd" strokeWidth={4} />
      <rect x={-2000} y={floor} width={5000} height={2600} fill={dawn > 0.5 ? "#e6c48c" : "#b9c8dc"} />
      <path d={`M-2000,${floor} H3000`} stroke={INK} strokeWidth={6} />
      {/* city sign */}
      <g transform={`translate(900 880) scale(${boing(t, S("t2") - 0.05, 0.4)})`}>
        <rect x={-8} y={50} width={16} height={490} fill={INK} />
        <rect x={-150} y={-50} width={300} height={104} rx={12} fill="#24543c" stroke={INK} strokeWidth={7} />
        <WText x={0} y={22} size={58} font="anton" color="#fff">KOLKATA</WText>
      </g>
      {walk > 0 ? <Person x={900} y={floor} s={1.05} t={t} pose={SIT} body="#c98d5a" hair="#3a2a1e" flip /> : null}
      {walk > 0 ? <Person x={1010} y={floor} s={0.85} t={t} pose={SIT} body="#8fb38b" hair="#3a2a1e" flip seed={3} /> : null}
      <Sister x={lerp(300, 620, walk)} y={floor} s={1.75} bob={walk > 0 && walk < 1 ? Math.abs(Math.sin(t * 9)) * -10 : 0} />
      <Bubble x={380} y={520} w={250} h={130} tx={370} ty={770} p={quiet}>
        <WText x={505} y={612} size={84} font="anton" color="#b9b2a4">. . .</WText>
      </Bubble>
      {letters > 0 ? (
        <g transform={`translate(740 1240) scale(${letters})`}>
          {[-10, 6, -3].map((r, i) => (
            <g key={i} transform={`translate(${i * 14 - 14} ${-i * 34}) rotate(${r})`}>
              <rect x={-150} y={-90} width={300} height={180} rx={10} fill="#fffdf7" stroke={INK} strokeWidth={6} />
              {i === 2 ? (
                <g stroke="#9a8b70" strokeWidth={5} strokeLinecap="round">
                  <path d="M-116,-50 h170 M-116,-22 h232 M-116,6 h210 M-116,34 h120" />
                </g>
              ) : <path d="M-150,-90 L0,10 L150,-90" fill="none" stroke={INK} strokeWidth={5} />}
            </g>
          ))}
        </g>
      ) : null}
    </g>
  );
};

const Company: React.FC = () => {
  const t = useGT();
  const floor = 1420;
  const hug = pr(t, S("c2") - 0.2, S("c2") + 0.3);
  const pose = posed(t, [[S("c2") - 0.2, { ...IDLE, head: 2 }], [S("c2") + 0.3, OPEN_HANDS]]);
  return (
    <g>
      <Defs />
      <Land floor={floor} />
      <Cloud x={200} y={420} s={0.7} t={t} />
      <Cloud x={900} y={520} s={0.55} t={t} />
      <David x={200} y={floor} s={1.2} harp={false} pose={{ ...IDLE, rs: -30 - hug * 40, re: -20 }} />
      <Sister x={880} y={floor} s={1.6} />
      <Creator x={540} y={floor} s={1.25} t={t} pose={pose} talk={talkAt(t)} smile={mix(0, 1, hug)} brow={mix(-0.4, 0, hug)} />
    </g>
  );
};

const Turn: React.FC = () => {
  const t = useGT();
  const rep = S("u2");
  const not = At("u3", "not") - 0.05;
  const up = pr(t, not, not + 0.4);
  const badge = [[150, 420], [930, 470], [130, 770], [950, 740]];
  return (
    <g>
      <Defs />
      <rect x={-2000} y={-2500} width={5000} height={6000} fill="#1a1f33" />
      <circle cx={540} cy={640} r={640} fill="url(#phoneGlow)" opacity={0.35} />
      <ChatCard u={3} y={lerp(450, 236, up)} s={lerp(1, 0.84, up)} dim={up * 0.45} strike={not + 0.25} />
      {badge.map(([x, y], i) => {
        const p = boing(t, rep + 0.1 + i * 0.22, 0.35) * (1 - up);
        return p > 0 ? (
          <g key={i} transform={`translate(${x} ${y}) scale(${p}) rotate(${Math.sin(t * 14 + i) * 8})`}>
            <circle r={46} fill={RED} stroke={INK} strokeWidth={7} />
            <WText x={0} y={19} size={54} color="#fff">1</WText>
          </g>
        ) : null;
      })}
      {TILES.map((tile, i) => <Tile key={i} x={177 + i * 242} y={690} p={boing(t, not + 0.3 + i * 0.12, 0.4)} badge={1} {...tile} />)}
      <Host pose={posed(t, [[rep - 0.1, { ...IDLE, head: 3 }], [rep + 0.25, { ...POINT_UP, head: -3 }], [not, { ...POINT_UP, head: -3 }], [not + 0.3, SHRUG]])} wide={pr(t, rep, rep + 0.2) * 0.8} smile={0.6} brow={-0.3} />
    </g>
  );
};

const BigBible: React.FC<{ x: number; y: number; s?: number; rot?: number }> = ({ x, y, s = 1, rot = 0 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <rect x={-250} y={-176} width={520} height={372} rx={22} fill={INK} />
    <rect x={-236} y={-170} width={500} height={350} rx={16} fill="#fbf7ee" stroke={INK} strokeWidth={7} />
    <path d="M250,-150 V160 M240,-150 V160 M230,-150 V160" stroke="#cfc6b4" strokeWidth={4} />
    <rect x={-260} y={-190} width={490} height={372} rx={20} fill="#7a3b2e" stroke={INK} strokeWidth={8} />
    <rect x={-236} y={-166} width={442} height={324} rx={12} fill="none" stroke="#f2c94c" strokeWidth={5} />
    <path d="M-150,-110 V40 M-200,-60 H-100" stroke="#f2c94c" strokeWidth={22} strokeLinecap="round" />
    <WText x={60} y={-30} size={76} font="anton" color="#f2c94c">HOLY</WText>
    <WText x={60} y={56} size={76} font="anton" color="#f2c94c">BIBLE</WText>
    <path d="M150,182 v70 l-20,-18 l-20,18 v-70" fill={RED} stroke={INK} strokeWidth={5} strokeLinejoin="round" />
  </g>
);

export const BIBLE_LAND = () => At("o3", "whole") - 0.05;

const One: React.FC = () => {
  const t = useGT();
  const note = boing(t, At("o2", "voice") - 0.35, 0.4);
  const land = BIBLE_LAND();
  const fall = pr(t, land - 0.28, land, (x) => x * x);
  const squash = t > land ? Math.exp(-(t - land) * 9) * Math.sin((t - land) * 30) * 0.08 : 0;
  const hit = pr(t, land, land + 0.15);
  const done = boing(t, land + 0.45, 0.4);
  return (
    <g>
      <Defs />
      <Land floor={1640} />
      <Cloud x={930} y={300} s={0.6} t={t} />
      {note > 0 ? (
        <g transform={`translate(540 650) scale(${note * (1 - hit * 0.15)})`}>
          <rect x={-310} y={-66} width={620} height={150} rx={70} fill={INK} />
          <rect x={-310} y={-76} width={620} height={150} rx={70} fill="#e9e6df" stroke={INK} strokeWidth={7} />
          <circle cx={-240} cy={0} r={42} fill="#fffdf7" stroke={INK} strokeWidth={6} />
          <path d="M-252,-20 L-218,0 L-252,20 Z" fill="#b9b2a4" />
          {Array.from({ length: 20 }).map((_, i) => <rect key={i} x={-176 + i * 20} y={-4 - (8 + ((i * 37) % 30)) / 2} width={10} height={8 + ((i * 37) % 30)} rx={5} fill="#b9b2a4" />)}
          <WText x={270} y={12} size={34} anchor="end" color="#8c877d">0:00</WText>
          <WText x={0} y={130} size={36} color="#8c877d">{"waiting for voice note" + ".".repeat(1 + (Math.floor(t * 3) % 3))}</WText>
        </g>
      ) : null}
      {t > land - 0.28 ? (
        <g transform={`translate(540 ${lerp(-500, 610, fall)}) scale(${1 + squash} ${1 - squash})`}>
          <BigBible x={0} y={0} rot={lerp(-14, -4, fall)} />
        </g>
      ) : null}
      {done > 0 ? (
        <g transform={`translate(770 380) rotate(8) scale(${done})`}>
          <rect x={-170} y={-44} width={340} height={96} rx={48} fill={INK} />
          <rect x={-170} y={-52} width={340} height={96} rx={48} fill="#fffdf7" stroke={INK} strokeWidth={6} />
          <WText x={-20} y={10} size={40} color={BLUE}>Delivered</WText>
          <Ticks x={100} y={-2} />
        </g>
      ) : null}
      <Host pose={PHONE} hold="phone" lx={mix(0.9, 0, hit)} ly={mix(0.6, -0.8, hit)} lid={mix(0.35, 0, hit)} wide={hit * (1 - pr(t, land + 0.7, land + 1.1))} brow={-0.3} smile={mix(-0.4, 0.8, pr(t, land + 0.6, land + 1))} />
    </g>
  );
};

const Two: React.FC = () => {
  const t = useGT();
  const floor = 1420;
  const call = At("w2", "called") - 0.1;
  const ring = boing(t, call, 0.4);
  const lift = pr(t, call + 0.1, call + 0.6);
  const luck = boing(t, At("w3", "network") - 0.1, 0.4);
  const pose: Pose = { ...SIT, ls: 4, le: -30, rs: -8, re: -50, head: mix(18, -4, lift), torso: mix(10, 2, lift) };
  return (
    <g>
      <Defs />
      <NightRoom floor={floor} />
      <Bed x={330} floor={floor} />
      <Creator x={540} y={floor} s={1.25} t={t} pose={pose} talk={talkAt(t) * 0.5} brow={mix(-1, -0.1, lift)} smile={mix(-0.9, 0.5, lift)} lid={mix(0.5, 0, lift)} ly={mix(0.8, -0.6, lift)} lx={0.3} />
      {/* phone on the bed, buzzing */}
      <g transform={`translate(760 ${floor - 150}) rotate(${ring > 0 ? Math.sin(t * 50) * 4 : 0})`}>
        {ring > 0 ? <circle r={150} fill="url(#phoneGlow)" /> : null}
        <rect x={-34} y={-58} width={68} height={116} rx={12} fill="#16141a" stroke={INK} strokeWidth={5} />
        <rect x={-27} y={-50} width={54} height={98} rx={7} fill={ring > 0 ? "#bfe8c8" : "#3b4a66"} />
      </g>
      {ring > 0 ? (
        <g transform={`translate(540 600) scale(${ring})`}>
          {[0, 1].map((i) => {
            const k = (t * 1.1 + i * 0.5) % 1;
            return <circle key={i} cx={-210} cy={0} r={70 + k * 70} fill="none" stroke="#7be08f" strokeWidth={8} opacity={1 - k} />;
          })}
          <rect x={-330} y={-130} width={660} height={290} rx={44} fill="#0c0f1a" />
          <rect x={-330} y={-142} width={660} height={290} rx={44} fill="#1d2335" stroke={INK} strokeWidth={7} />
          <circle cx={-210} cy={0} r={70} fill="#7fa7d9" stroke={INK} strokeWidth={7} />
          <circle cx={-232} cy={-10} r={8} fill={INK} /><circle cx={-188} cy={-10} r={8} fill={INK} />
          <path d="M-236,18 Q-210,42 -184,18" fill="none" stroke={INK} strokeWidth={7} strokeLinecap="round" />
          <WText x={-110} y={-36} size={34} anchor="start" color="#8d94aa">incoming call</WText>
          <WText x={-110} y={30} size={70} anchor="start" font="anton" color="#fff">RAHUL</WText>
          <WText x={-110} y={86} size={34} anchor="start" color="#7be08f">“bro, you okay?”</WText>
          <circle cx={250} cy={-56} r={40} fill="#3aa35c" stroke={INK} strokeWidth={6} />
          <path d="M232,-66 q18,28 36,0" fill="none" stroke="#fff" strokeWidth={9} strokeLinecap="round" />
          <circle cx={250} cy={52} r={40} fill={RED} stroke={INK} strokeWidth={6} />
          <path d="M232,60 q18,-22 36,0" fill="none" stroke="#fff" strokeWidth={9} strokeLinecap="round" />
        </g>
      ) : null}
      {luck > 0 ? (
        <g transform={`translate(870 980) scale(${luck}) rotate(4)`}>
          <rect x={-130} y={-110} width={260} height={230} rx={30} fill={INK} />
          <rect x={-130} y={-120} width={260} height={230} rx={30} fill="#fffdf7" stroke={INK} strokeWidth={7} />
          {[0, 1, 2, 3].map((i) => <rect key={i} x={-78 + i * 42} y={30 - i * 30} width={28} height={30 + i * 30} rx={6} fill="#3aa35c" stroke={INK} strokeWidth={5} />)}
          <WText x={0} y={96} size={30}>network luck</WText>
          <XMark x={0} y={-4} s={0.8} at={At("w3", "network") + 0.35} />
        </g>
      ) : null}
    </g>
  );
};

const Three: React.FC = () => {
  const t = useGT();
  const say = boing(t, S("h2") - 0.1, 0.4);
  const who = S("h3") - 0.1;
  const dart = t > At("h2", "looked") && t < who ? Math.sign(Math.sin(t * 8)) * 0.9 : 0;
  const shock = pr(t, S("h2"), S("h2") + 0.3);
  return (
    <g>
      <Defs />
      <rect x={-2000} y={-2500} width={5000} height={6000} fill="#f3e6cf" />
      <path d="M740,760 V430 Q860,290 980,430 V760 Z" fill="#9cc8e8" stroke={INK} strokeWidth={9} />
      <path d="M860,340 V760 M740,580 H980" stroke={INK} strokeWidth={6} />
      <CrossMark x={860} y={560} s={0.7} glow={0.5} />
      <rect x={-2000} y={1040} width={5000} height={3000} fill="#d8b98d" />
      <path d="M-2000,1040 H3000" stroke={INK} strokeWidth={6} />
      {/* pastor at the pulpit */}
      <Person x={230} y={1040} s={1.15} t={t} pose={{ ...IDLE, rs: -100, re: -14, ls: 20, le: -70 }} body="#3d4a6b" hair="#2a2222" tie={RED} />
      <path d="M110,1040 L130,800 H330 L350,1040 Z" fill="#a8703f" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
      <CrossMark x={230} y={930} s={0.45} />
      <Bubble x={300} y={300} w={640} h={190} tx={300} ty={610} p={say}>
        <WText x={620} y={380} size={40}>“Someone here has been</WText>
        <WText x={620} y={436} size={40}>avoiding God all week…”</WText>
      </Bubble>
      {/* pew + neighbours */}
      <Person x={110} y={2200} s={1.8} t={t} body="#9d7ec9" hair="#5a3d2a" seed={2} />
      <Person x={970} y={2200} s={1.8} t={t} body="#79b38b" hair="#3a2a1e" seed={5} />
      <rect x={-100} y={1760} width={1280} height={90} rx={14} fill="#b07a4a" stroke={INK} strokeWidth={8} />
      <Host quiet={t < who} talk={t >= who ? talkAt(t) : 0} lx={dart} wide={shock} brow={-0.7} smile={-0.4} sweat={shock > 0.5} pose={{ ...IDLE, ls: -6, rs: 6, head: dart * 5 }} />
    </g>
  );
};

const THREAD = "M930,1470 C930,1240 340,1200 340,1000 L340,440 C340,250 740,330 740,160 L740,-260 C740,-450 340,-380 340,-540 L340,-960 C340,-1150 540,-1100 540,-1290";

const Snap: React.FC<{ x: number; y: number; rot: number; at: number; label: string; children: React.ReactNode }> = ({ x, y, rot, at, label, children }) => {
  const t = useGT();
  const p = boing(t, at, 0.45);
  if (p <= 0) return null;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${p})`}>
      <rect x={-230} y={-222} width={460} height={540} rx={10} fill={INK} />
      <rect x={-230} y={-236} width={460} height={540} rx={10} fill="#fffdf7" stroke={INK} strokeWidth={7} />
      <rect x={-200} y={-206} width={400} height={400} fill="#e9eef5" stroke={INK} strokeWidth={5} />
      <g>{children}</g>
      <WText x={0} y={264} size={32}>{label}</WText>
    </g>
  );
};

const Four: React.FC = () => {
  const t = useGT();
  const thread = interp(t, [[S("f2"), 0], [S("f3") + 0.2, 0.2], [S("f4") + 0.2, 0.48], [S("f5") + 0.2, 0.76], [S("f6") + 1.1, 1]]);
  const glow = pr(t, S("f6") + 0.8, S("f7") + 0.3);
  return (
    <g>
      <Defs />
      <rect x={-3000} y={-4000} width={7000} height={8000} fill="#f4e9d2" />
      {Array.from({ length: 30 }).map((_, i) => <path key={i} d={`M-3000,${-2600 + i * 180} H4000`} stroke="#eadcc0" strokeWidth={4} />)}
      <rect x={-3000} y={1900} width={7000} height={3000} fill="#ece1cb" />
      <path d="M-3000,1900 H4000" stroke={INK} strokeWidth={6} />
      {/* the thread */}
      <path d={THREAD} fill="none" stroke={INK} strokeWidth={22} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - thread} />
      <path d={THREAD} fill="none" stroke={RED} strokeWidth={12} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - thread} />
      <Snap x={340} y={560} rot={-4} at={S("f3") - 0.1} label="the door that closed">
        <rect x={-90} y={-170} width={180} height={340} rx={6} fill="#b07a4a" stroke={INK} strokeWidth={7} />
        <circle cx={56} cy={10} r={12} fill={GOLDF} stroke={INK} strokeWidth={4} />
        <rect x={-74} y={-90} width={148} height={64} rx={8} fill={RED} stroke={INK} strokeWidth={5} />
        <WText x={0} y={-44} size={38} font="anton" color="#fff">CLOSED</WText>
      </Snap>
      <Snap x={740} y={-60} rot={4} at={S("f4") - 0.1} label="the person who appeared">
        <Person x={-70} y={180} s={0.72} t={t} body="#7fa7d9" hair="#3a2a1e" />
        <Person x={84} y={180} s={0.72} t={t} body="#e59a6b" hair="#5a3d2a" pose={{ ...IDLE, ls: 150, le: 20 + Math.sin(t * 9) * 16 }} flip seed={4} />
      </Snap>
      <Snap x={340} y={-760} rot={-3} at={S("f5") - 0.1} label="the thing you survived">
        <path d="M-130,-60 Q-150,-110 -100,-120 Q-90,-170 -30,-160 Q10,-200 60,-150 Q120,-150 110,-90 Q130,-50 80,-50 L-110,-50 Q-140,-50 -130,-60 Z" fill="#6b7896" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
        <path d="M-10,-44 L-40,20 L-6,14 L-30,80" fill="none" stroke={GOLDF} strokeWidth={12} strokeLinejoin="round" strokeLinecap="round" />
        {Array.from({ length: 9 }).map((_, i) => <line key={i} x1={-150 + i * 38} y1={-30 + ((t * 300 + i * 50) % 160)} x2={-158 + i * 38} y2={0 + ((t * 300 + i * 50) % 160)} stroke="#7f9fd6" strokeWidth={5} />)}
        <Person x={70} y={184} s={0.6} t={t} body="#79b38b" hair="#3a2a1e" pose={{ ...IDLE, ls: 150, le: 10, rs: -150, re: -10 }} />
      </Snap>
      <g transform="translate(540 -1420)">
        <circle r={520} fill="url(#warmGlow)" opacity={glow} />
        <CrossMark x={0} y={0} s={2.1} glow={glow} />
      </g>
      <Creator x={760} y={1900} s={1.2} t={t} pose={{ ...PHONE, head: -14, torso: -3 }} hold="phone" talk={talkAt(t) * 0.6} ly={-1} smile={0.3} wide={0.3} />
    </g>
  );
};

const interp = (t: number, keys: [number, number][]) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) if (t <= keys[i + 1][0]) return lerp(keys[i][1], keys[i + 1][1], pr(t, keys[i][0], keys[i + 1][0]));
  return keys[keys.length - 1][1];
};

const Ending: React.FC = () => {
  const t = useGT();
  const chat = boing(t, S("z2") - 0.15, 0.4);
  const strike = At("z2", "seen");
  const inbox = S("z3");
  return (
    <g>
      <Defs />
      <Land floor={1640} sky="#fbeed0" hill="#f0d9a8" ground="#ead2a0" line="#d6b678" />
      <circle cx={540} cy={900} r={760} fill="url(#warmGlow)" opacity={0.55} />
      <Cloud x={150} y={300} s={0.6} t={t} />
      {chat > 0 ? <g transform={`translate(540 460) scale(${chat}) translate(-540 -460)`}><ChatCard u={3} y={375} s={0.8} strike={strike} dim={pr(t, inbox, inbox + 0.3) * 0.4} /></g> : null}
      {TILES.map((tile, i) => <Tile key={i} x={177 + i * 242} y={765} p={boing(t, inbox + i * 0.1, 0.4)} check={boing(t, At("z3", "wrong") + 0.1 + i * 0.14, 0.35)} {...tile} />)}
      <Host pose={posed(t, [[S("z2") - 0.2, { ...IDLE, head: 2 }], [S("z2") + 0.2, OPEN_HANDS], [inbox, OPEN_HANDS], [inbox + 0.3, { ...POINT_UP, head: -3 }]])} smile={0.9} brow={-0.1} />
    </g>
  );
};

/* ---------- the edit ---------- */

export const Seen: React.FC = () => {
  use(data as Data);
  const T = {
    pray: S("p1") - 0.1, either: S("e1") - 0.12, david: S("d1") - 0.14, teresa: S("t1") - 0.14, company: S("c1") - 0.12, turn: S("u1") - 0.14,
    one: S("o1") - 0.14, two: S("w1") - 0.12, three: S("h1") - 0.14, four: S("f1") - 0.14, end: S("z1") - 0.16, loop: S("z4") - 0.12,
  };
  const land = BIBLE_LAND();
  const who = S("h3") - 0.1;
  return (
    <AbsoluteFill style={{ background: CREAM }}>
      <Sequence layout="none"><Audio src={staticFile("seen/vo.wav")} /></Sequence>
      <Sequence layout="none"><Audio src={staticFile("seen/mix.wav")} volume={0.9} /></Sequence>

      <Shot from={0} to={T.pray} keys={[[0, 1.12, 540, 900], [0.5, 1.0, 540, 960], [T.pray, 1.07, 540, 960]]} enter="cut" bg={NIGHT}><Hook from={0} /></Shot>
      <Shot
        from={T.pray} to={T.either} bg={NIGHT}
        keys={[[T.pray, 1.25, 560, 1050], [S("n1"), 1.0, 540, 960], [S("p2"), 1.0, 540, 960], [S("p2") + 0.12, 1.12, 560, 940], [S("n2") + 0.1, 1.0, 540, 960], [S("p3"), 1.0, 540, 960], [S("p3") + 0.3, 1.4, 590, 1000], [S("ohf") - 0.1, 1.42, 590, 1000], [S("ohf") + 0.2, 1.0, 540, 960], [S("n3"), 1.06, 540, 960], [T.either, 1.1, 540, 960]]}
        shake={[[S("p2"), 14, 0.7]]}
      >
        <Praying />
      </Shot>
      <Shot from={T.either} to={T.david} keys={[[T.either, 1.0, 540, 960], [S("meet"), 1.06, 540, 960], [T.david, 1.1, 540, 940]]}><Either /></Shot>
      <Shot from={T.david} to={T.teresa} bg="#f8ebc8" keys={[[T.david, 1.3, 330, 1060], [S("d2") + 0.2, 1.0, 540, 960], [S("d3"), 1.0, 540, 960], [S("d4"), 1.14, 640, 900], [S("d6"), 1.2, 680, 860], [T.teresa, 1.24, 690, 850]]}><DavidScene /></Shot>
      <Shot from={T.teresa} to={T.company} bg="#dbe6f2" keys={[[T.teresa, 1.3, 330, 1060], [S("t2"), 1.0, 540, 960], [S("t3"), 1.0, 540, 960], [S("t4"), 1.1, 480, 1000], [S("t5"), 1.0, 540, 960], [T.company, 1.08, 620, 980]]}><TeresaScene /></Shot>
      <Shot from={T.company} to={T.turn} keys={[[T.company, 1.0, 540, 960], [S("c2"), 1.05, 540, 980], [T.turn, 1.16, 540, 1000]]}><Company /></Shot>
      <Shot from={T.turn} to={T.one} bg="#1a1f33" keys={[[T.turn, 1.08, 540, 980], [S("u2"), 1.0, 540, 960], [T.one, 1.06, 540, 940]]}><Turn /></Shot>
      <Shot from={T.one} to={T.two} keys={[[T.one, 1.0, 540, 960], [land - 0.1, 1.05, 540, 950], [land + 0.1, 1.0, 540, 960], [T.two, 1.06, 540, 950]]} shake={[[land, 24, 0.6]]}><One /></Shot>
      <Shot from={T.two} to={T.three} bg={NIGHT} keys={[[T.two, 1.2, 540, 1050], [S("w2"), 1.0, 540, 960], [T.three, 1.08, 560, 960]]}><Two /></Shot>
      <Shot from={T.three} to={T.four} bg="#f3e6cf" keys={[[T.three, 1.0, 540, 960], [who - 0.05, 1.04, 540, 960], [who + 0.14, 1.36, 540, 1150], [T.four, 1.42, 540, 1150]]} shake={[[who + 0.1, 10, 0.4]]}><Three /></Shot>
      <Shot
        from={T.four} to={T.end} bg="#f4e9d2"
        keys={[[T.four, 1.0, 540, 1330], [S("f2"), 1.0, 540, 1330], [S("f3"), 1.2, 400, 540], [S("f4") - 0.25, 1.2, 400, 540], [S("f4") + 0.15, 1.2, 680, -60], [S("f5") - 0.25, 1.2, 680, -60], [S("f5") + 0.15, 1.2, 400, -760], [S("f6"), 1.2, 400, -760], [S("f6") + 1.0, 0.42, 540, 110], [S("f7") - 0.1, 0.44, 540, 80], [S("f7") + 0.35, 1.1, 540, -1540], [T.end, 1.16, 540, -1560]]}
      >
        <Four />
      </Shot>
      <Shot from={T.end} to={T.loop} bg="#fbeed0" keys={[[T.end, 1.08, 540, 980], [S("z2"), 1.0, 540, 960], [T.loop, 1.05, 540, 960]]} exit="fade"><Ending /></Shot>
      <Shot from={T.loop} to={SEEN_SECONDS + 1} bg={NIGHT} keys={[[T.loop, 1.0, 540, 960], [SEEN_SECONDS, 1.12, 540, 900]]} enter="fade" exit="cut"><Hook from={T.loop - 1.3} /></Shot>

      {/* burned-in titles and receipts */}
      <Title lines={["God left me", [["on", "#fff"], ["seen", RED]]]} at={0.06} until={T.pray - 0.15} size={128} top={170} />
      <Title lines={[["David", GOLDF]]} at={S("d1")} until={S("d2") + 0.2} size={170} top={230} />
      <Receipt at={S("d5") + 0.3} until={S("d6") - 0.05} head="Psalm 13:1" body="Written by David. Still in your Bible." y={210} rot={2} />
      <Title lines={["Mother", ["Teresa", "#7fb2f0"]]} at={S("t1")} until={S("t3") - 0.1} size={140} top={220} />
      <Receipt at={At("t3", "private")} until={S("t4") - 0.15} head="Her private letters" body="Published 2007 · Come Be My Light" y={230} rot={-2} />
      <Title lines={[["40+", RED], "years"]} at={At("t4", "forty") - 0.15} until={S("t5") - 0.05} size={190} top={220} />
      <Title lines={["Still", ["showed up", GOLDF]]} at={At("t5", "showed") - 0.1} until={T.company - 0.15} size={128} top={230} />
      <Receipt at={At("c1", "silence")} until={S("c2") - 0.1} head="The silence" body="≠ you're doing it wrong" y={300} rot={-2} />
      <Title lines={["Very good", ["company", GOLDF]]} at={At("c2", "very") - 0.1} until={T.turn - 0.15} size={136} top={250} />
      <Title lines={[[["1", RED], ["his word", "#fff"]]]} at={S("o1")} until={S("o2") - 0.05} size={150} top={230} />
      <Title lines={[[["2", RED], ["people", "#fff"]]]} at={S("w1")} until={S("w2") + 0.1} size={150} top={220} />
      <Title lines={[[["3", RED], ["that sermon", "#fff"]]]} at={S("h1")} until={S("h2") - 0.1} size={130} top={150} />
      <Title lines={["Who told", ["you?!", RED]]} at={who + 0.1} until={T.four - 0.15} size={170} top={190} />
      <Title lines={[[["4", RED], ["scroll up", "#fff"]]]} at={S("f1")} until={S("f3") - 0.2} size={150} top={230} />
      <Title lines={[["It's Him", GOLDF]]} at={S("f7")} until={T.end - 0.15} size={170} top={330} />
      <Receipt at={S("z1") + 0.2} until={S("z2") - 0.2} head="Acts 17:27" body="He is not far from any one of us." y={420} rot={-2} />
      <Receipt at={S("z2") + 0.35} until={T.loop - 0.05} head="Want 7 Psalms for the quiet nights?" body="Comment “THREAD”" y={110} w={720} rot={-2} dark />

      <Paper />
      <SoftVignette />
      <Captions words={WORDS} top={1480} />
    </AbsoluteFill>
  );
};

/* ================= the two-part cut ================= */

const PartTag: React.FC<{ n: number; until?: number }> = ({ n, until = 1e9 }) => useGT() > until ? null : (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <div style={{ position: "absolute", top: 92, left: 56, padding: "8px 24px", background: INK, color: "#fff", borderRadius: 30, fontFamily: FONTS.inter, fontWeight: 800, fontSize: 30, letterSpacing: 3 }}>
      PART {n} <span style={{ color: GOLDF }}>/ 2</span>
    </div>
  </AbsoluteFill>
);

/** Part 1 cliffhanger: the dead chat suddenly shows "typing…". */
const Tease: React.FC = () => {
  const t = useGT();
  const rep = S("x2");
  const two = S("x3") - 0.05;
  const badge = [[150, 560], [935, 600], [130, 880], [950, 860]];
  return (
    <g>
      <Defs />
      <rect x={-2000} y={-2500} width={5000} height={6000} fill="#1a1f33" />
      <circle cx={540} cy={700} r={640} fill="url(#phoneGlow)" opacity={0.2 + 0.25 * pr(t, rep, rep + 0.4)} />
      <ChatCard u={t - rep + 10} y={570} typing={[10.05, 99]} />
      {badge.map(([x, y], i) => {
        const p = boing(t, rep + 0.25 + i * 0.2, 0.35);
        return p > 0 ? (
          <g key={i} transform={`translate(${x} ${y}) scale(${p}) rotate(${Math.sin(t * 14 + i) * 8})`}>
            <circle r={44} fill={RED} stroke={INK} strokeWidth={7} />
            <WText x={0} y={19} size={52} color="#fff">1</WText>
          </g>
        ) : null;
      })}
      <Host
        pose={posed(t, [[rep - 0.1, { ...IDLE, head: 3 }], [rep + 0.2, SHRUG], [two - 0.1, SHRUG], [two + 0.2, { ...POINT_UP, head: -3 }]])}
        wide={pr(t, rep, rep + 0.2) * (1 - pr(t, two, two + 0.3)) * 0.9} smile={0.7} brow={-0.3}
      />
    </g>
  );
};

const MsgPill: React.FC<{ y: number; p: number; missed: number; n: number }> = ({ y, p, missed, n }) =>
  p <= 0 ? null : (
    <g transform={`translate(540 ${y}) scale(${p}) rotate(${n % 2 ? 1.5 : -1.5})`}>
      <rect x={-300} y={-34} width={600} height={84} rx={42} fill={INK} />
      <rect x={-300} y={-42} width={600} height={84} rx={42} fill="#fffdf7" stroke={INK} strokeWidth={6} />
      <circle cx={-252} cy={0} r={26} fill={GOLDF} stroke={INK} strokeWidth={5} />
      <WText x={-252} y={12} size={30} font="anton">G</WText>
      <WText x={-210} y={13} size={36} anchor="start">God</WText>
      <WText x={200} y={13} size={34} anchor="end" color="#3aa35c" opacity={1 - missed * 0.75}>New message</WText>
      <circle cx={250} cy={0} r={24} fill={RED} stroke={INK} strokeWidth={5} />
      <WText x={250} y={12} size={30} color="#fff">1</WText>
      {missed > 0 ? (
        <g transform={`translate(60 0) rotate(-6) scale(${missed})`}>
          <rect x={-120} y={-32} width={240} height={64} rx={10} fill="rgba(255,253,247,0.94)" stroke={RED} strokeWidth={7} />
          <WText x={0} y={16} size={44} font="anton" color={RED}>MISSED</WText>
        </g>
      ) : null}
    </g>
  );

/** Part 2 hook (and its last beat, so it loops): four replies from God, all missed. */
const Hook2: React.FC<{ from: number }> = ({ from }) => {
  const t = useGT();
  const u = t - from;
  const four = S("g2") - 0.05, miss = S("g3") + 0.25;
  const m = pr(u, miss, miss + 0.25);
  return (
    <g>
      <Defs />
      <NightRoom floor={1500} />
      <circle cx={540} cy={640} r={560} fill="url(#phoneGlow)" opacity={0.3} />
      {[0, 1, 2, 3].map((i) => <MsgPill key={i} n={i} y={530 + i * 100} p={boing(u, four + i * 0.2, 0.35)} missed={boing(u, miss + i * 0.1, 0.3)} />)}
      <Host pose={PHONE} hold="phoneGlow" wide={0.8 * (1 - m)} smile={mix(0.9, -0.7, m)} brow={mix(-0.2, -1, m)} lid={m * 0.35} lx={mix(0.7, 0, m)} ly={mix(0.4, 0, m)} />
    </g>
  );
};

/** Part 2 recap of part 1, in one breath. */
const Recap: React.FC = () => {
  const t = useGT();
  const turn = pr(t, S("r2") - 0.05, S("r2") + 0.25);
  const four = S("r3") - 0.1;
  const up = pr(t, four - 0.25, four + 0.1);
  return (
    <g>
      <Defs />
      <NightRoom floor={1500} />
      <circle cx={540} cy={640} r={600} fill="url(#phoneGlow)" opacity={0.3 * turn} />
      <ChatCard u={t - S("r2") + 10} y={lerp(520, 300, up)} s={lerp(1, 0.84, up)} typing={[10.05, 99]} dim={up * 0.35} />
      {TILES.map((tile, i) => <Tile key={i} x={177 + i * 242} y={740} p={boing(t, four + i * 0.1, 0.4)} badge={1} {...tile} />)}
      <Host
        pose={posed(t, [[S("r2") - 0.15, { ...IDLE, head: 3 }], [S("r2") + 0.15, SHRUG], [four - 0.1, SHRUG], [four + 0.2, { ...POINT_UP, head: -3 }]])}
        lid={0.3 * (1 - turn)} smile={mix(-0.6, 0.8, turn)} brow={-0.3} wide={turn * 0.7 * (1 - pr(t, four, four + 0.3))}
      />
    </g>
  );
};

export const SeenPart1: React.FC = () => {
  use(data1 as Data);
  const T = {
    pray: S("p1") - 0.1, david: S("d1") - 0.14, teresa: S("t1") - 0.14, company: S("c1") - 0.12,
    tease: S("x1") - 0.14, loop: S("x4") - 0.12,
  };
  const two = S("x3") - 0.05;
  return (
    <AbsoluteFill style={{ background: CREAM }}>
      <Sequence layout="none"><Audio src={staticFile("seen/vo1.wav")} /></Sequence>
      <Sequence layout="none"><Audio src={staticFile("seen/mix1.wav")} volume={0.9} /></Sequence>

      <Shot from={0} to={T.pray} keys={[[0, 1.12, 540, 900], [0.5, 1.0, 540, 960], [T.pray, 1.07, 540, 960]]} enter="cut" bg={NIGHT}><Hook from={0} /></Shot>
      <Shot
        from={T.pray} to={T.david} bg={NIGHT}
        keys={[[T.pray, 1.25, 560, 1050], [S("n1"), 1.0, 540, 960], [S("p2"), 1.0, 540, 960], [S("p2") + 0.12, 1.12, 560, 940], [S("n2") + 0.1, 1.0, 540, 960], [S("p3"), 1.0, 540, 960], [S("p3") + 0.3, 1.4, 590, 1000], [S("ohf") - 0.1, 1.42, 590, 1000], [S("ohf") + 0.2, 1.0, 540, 960], [S("n3"), 1.06, 540, 960], [T.david, 1.1, 540, 960]]}
        shake={[[S("p2"), 14, 0.7]]}
      >
        <Praying />
      </Shot>
      <Shot from={T.david} to={T.teresa} bg="#f8ebc8" keys={[[T.david, 1.3, 330, 1060], [S("d2") + 0.2, 1.0, 540, 960], [S("d3"), 1.0, 540, 960], [S("d4"), 1.14, 640, 900], [S("d6"), 1.2, 680, 860], [T.teresa, 1.24, 690, 850]]}><DavidScene /></Shot>
      <Shot from={T.teresa} to={T.company} bg="#dbe6f2" keys={[[T.teresa, 1.3, 330, 1060], [S("t2"), 1.0, 540, 960], [S("t3"), 1.0, 540, 960], [S("t4"), 1.1, 480, 1000], [S("t5"), 1.0, 540, 960], [T.company, 1.08, 620, 980]]}><TeresaScene /></Shot>
      <Shot from={T.company} to={T.tease} keys={[[T.company, 1.0, 540, 960], [S("c2"), 1.05, 540, 980], [T.tease, 1.16, 540, 1000]]}><Company /></Shot>
      <Shot from={T.tease} to={T.loop} bg="#1a1f33" keys={[[T.tease, 1.1, 540, 1000], [S("x2"), 1.0, 540, 960], [two, 1.0, 540, 960], [two + 0.25, 1.08, 540, 940], [T.loop, 1.1, 540, 940]]} shake={[[two + 0.05, 10, 0.4]]} exit="fade"><Tease /></Shot>
      <Shot from={T.loop} to={TOTAL + 1} bg={NIGHT} keys={[[T.loop, 1.0, 540, 960], [TOTAL, 1.12, 540, 900]]} enter="fade" exit="cut"><Hook from={T.loop - 1.3} /></Shot>

      <Title lines={["God left me", [["on", "#fff"], ["seen", RED]]]} at={0.06} until={T.pray - 0.15} size={128} top={170} />
      <Title lines={[["David", GOLDF]]} at={S("d1")} until={S("d2") + 0.2} size={170} top={230} />
      <Receipt at={S("d5") + 0.3} until={S("d6") - 0.05} head="Psalm 13:1" body="Written by David. Still in your Bible." y={210} rot={2} />
      <Title lines={["Mother", ["Teresa", "#7fb2f0"]]} at={S("t1")} until={S("t3") - 0.1} size={140} top={220} />
      <Receipt at={At("t3", "private")} until={S("t4") - 0.15} head="Her private letters" body="Published 2007 · Come Be My Light" y={230} rot={-2} />
      <Title lines={[["40+", RED], "years"]} at={At("t4", "forty") - 0.15} until={S("t5") - 0.05} size={190} top={220} />
      <Title lines={["Still", ["showed up", GOLDF]]} at={At("t5", "showed") - 0.1} until={T.company - 0.15} size={128} top={230} />
      <Receipt at={At("c1", "silence")} until={S("c2") - 0.1} head="The silence" body="≠ you're doing it wrong" y={300} rot={-2} />
      <Title lines={["Very good", ["company", GOLDF]]} at={At("c2", "very") - 0.1} until={T.tease - 0.15} size={136} top={250} />
      <Title lines={["God was", ["replying", GOLDF]]} at={S("x2")} until={two - 0.12} size={136} top={170} />
      <Title lines={[["Part 2", RED]]} at={two} until={T.loop - 0.05} size={180} top={140} />
      <Receipt at={two + 0.35} until={T.loop - 0.05} head="Where He was replying" body="Follow for Part 2" y={372} w={600} rot={-2} dark />

      <PartTag n={1} />
      <Paper />
      <SoftVignette />
      <Captions words={WORDS} top={1480} />
    </AbsoluteFill>
  );
};

export const SeenPart2: React.FC = () => {
  use(data2 as Data);
  const T = {
    recap: S("r1") - 0.12, one: S("o1") - 0.14, two: S("w1") - 0.12, three: S("h1") - 0.14, four: S("f1") - 0.14,
    end: S("z2") - 0.3, loop: S("y2") - 0.12,
  };
  const land = BIBLE_LAND();
  const who = S("h3") - 0.1;
  return (
    <AbsoluteFill style={{ background: CREAM }}>
      <Sequence layout="none"><Audio src={staticFile("seen/vo2.wav")} /></Sequence>
      <Sequence layout="none"><Audio src={staticFile("seen/mix2.wav")} volume={0.9} /></Sequence>

      <Shot from={0} to={T.recap} keys={[[0, 1.12, 540, 900], [0.5, 1.0, 540, 960], [S("g3"), 1.0, 540, 960], [S("g3") + 0.3, 1.05, 540, 930], [T.recap, 1.07, 540, 930]]} enter="cut" bg={NIGHT} shake={[[S("g3") + 0.25, 8, 0.4]]}><Hook2 from={0} /></Shot>
      <Shot from={T.recap} to={T.one} bg={NIGHT} keys={[[T.recap, 1.0, 540, 960], [T.one, 1.08, 540, 950]]}><Recap /></Shot>
      <Shot from={T.one} to={T.two} keys={[[T.one, 1.0, 540, 960], [land - 0.1, 1.05, 540, 950], [land + 0.1, 1.0, 540, 960], [T.two, 1.06, 540, 950]]} shake={[[land, 24, 0.6]]}><One /></Shot>
      <Shot from={T.two} to={T.three} bg={NIGHT} keys={[[T.two, 1.2, 540, 1050], [S("w2"), 1.0, 540, 960], [T.three, 1.08, 560, 960]]}><Two /></Shot>
      <Shot from={T.three} to={T.four} bg="#f3e6cf" keys={[[T.three, 1.0, 540, 960], [who - 0.05, 1.04, 540, 960], [who + 0.14, 1.36, 540, 1150], [T.four, 1.42, 540, 1150]]} shake={[[who + 0.1, 10, 0.4]]}><Three /></Shot>
      <Shot
        from={T.four} to={T.end} bg="#f4e9d2"
        keys={[[T.four, 1.0, 540, 1330], [S("f2"), 1.0, 540, 1330], [S("f3"), 1.2, 400, 540], [S("f4") - 0.25, 1.2, 400, 540], [S("f4") + 0.15, 1.2, 680, -60], [S("f5") - 0.25, 1.2, 680, -60], [S("f5") + 0.15, 1.2, 400, -760], [S("f6"), 1.2, 400, -760], [S("f6") + 1.0, 0.42, 540, 110], [S("f7") - 0.1, 0.44, 540, 80], [S("f7") + 0.35, 1.1, 540, -1540], [T.end, 1.16, 540, -1560]]}
      >
        <Four />
      </Shot>
      <Shot from={T.end} to={T.loop} bg="#fbeed0" keys={[[T.end, 1.08, 540, 980], [S("z2") + 0.2, 1.0, 540, 960], [T.loop, 1.05, 540, 960]]} exit="fade"><Ending /></Shot>
      <Shot from={T.loop} to={TOTAL + 1} bg={NIGHT} keys={[[T.loop, 1.0, 540, 960], [TOTAL, 1.12, 540, 900]]} enter="fade" exit="cut"><Hook2 from={T.loop + 0.2} /></Shot>

      <Title lines={["God texted", ["me back", RED]]} at={0.06} until={T.recap - 0.15} size={128} top={170} />
      <Receipt at={S("r1") + 0.1} until={S("r2") - 0.1} head="Previously in Part 1" body="God left me on seen" y={250} w={560} rot={-2} dark />
      <Title lines={["He was", ["talking", GOLDF]]} at={S("r2") + 0.05} until={S("r3") - 0.6} size={128} top={170} />
      <Title lines={[[["1", RED], ["his word", "#fff"]]]} at={S("o1")} until={S("o2") - 0.05} size={150} top={230} />
      <Title lines={[[["2", RED], ["people", "#fff"]]]} at={S("w1")} until={S("w2") + 0.1} size={150} top={220} />
      <Title lines={[[["3", RED], ["that sermon", "#fff"]]]} at={S("h1")} until={S("h2") - 0.1} size={130} top={150} />
      <Title lines={["Who told", ["you?!", RED]]} at={who + 0.1} until={T.four - 0.15} size={170} top={190} />
      <Title lines={[[["4", RED], ["scroll up", "#fff"]]]} at={S("f1")} until={S("f3") - 0.2} size={150} top={230} />
      <Title lines={[["It's Him", GOLDF]]} at={S("f7")} until={T.end - 0.15} size={170} top={330} />
      <Receipt at={S("z2") + 0.3} until={T.loop - 0.05} head="Acts 17:27" body="He is not far from any one of us." y={92} rot={-2} />

      <PartTag n={2} until={S("z2") + 0.3} />
      <Paper />
      <SoftVignette />
      <Captions words={WORDS} top={1480} />
    </AbsoluteFill>
  );
};
