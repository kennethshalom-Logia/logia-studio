import React from "react";
import { staticFile } from "remotion";
import { IDLE, Pose } from "../Kit";
import { INK } from "./World";

/**
 * The Logia host: a fully drawn, easy-to-read creator character. Big head, curly black hair, glasses,
 * moustache and a clean jaw (no beard), warm brown skin, mustard hoodie. Everything is vector, so the face can act:
 * brows, eye size, pupils, lids and the mouth are all driven per frame.
 */

export const C_SKIN = "#c98b5b";
export const C_SKIN_SHADE = "#b0743f";
export const C_HAIR = "#1c1a21";
export const C_HOODIE = "#f0b541";
export const C_HOODIE_D = "#d6982a";
export const C_JEANS = "#34406a";

const LEN = { thigh: 86, shin: 86, upper: 78, fore: 72 };

const Limb: React.FC<{ x: number; y: number; a: number; b: number; l1: number; l2: number; w: number; c: string; end?: React.ReactNode }> = ({
  x, y, a, b, l1, l2, w, c, end,
}) => (
  <g transform={`translate(${x} ${y}) rotate(${a})`}>
    <line y2={l1} stroke={INK} strokeWidth={w + 10} strokeLinecap="round" />
    <g transform={`translate(0 ${l1}) rotate(${b})`}>
      <line y2={l2} stroke={INK} strokeWidth={w + 10} strokeLinecap="round" />
      <line y2={l2} stroke={c} strokeWidth={w} strokeLinecap="round" />
      <g transform={`translate(0 ${l2})`}>{end}</g>
    </g>
    <line y2={l1} stroke={c} strokeWidth={w} strokeLinecap="round" />
  </g>
);

const handAt = (a: number, b: number) => {
  const r = (d: number) => (d * Math.PI) / 180;
  return [-Math.sin(r(a)) * LEN.upper - Math.sin(r(a + b)) * (LEN.fore + 8), Math.cos(r(a)) * LEN.upper + Math.cos(r(a + b)) * (LEN.fore + 8)];
};

export type Face = {
  /** mouth open 0..1 */ talk?: number;
  /** -1 frown .. 1 smile */ smile?: number;
  /** -1 worried .. 1 stern */ brow?: number;
  /** 0 normal .. 1 shocked */ wide?: number;
  /** 0 open .. 1 closed */ lid?: number;
  /** pupil direction -1..1 */ lx?: number; ly?: number;
  sweat?: boolean;
};

const BACK: [number, number, number][] = [[-80, -150, 40], [-94, -112, 28], [80, -150, 40], [94, -112, 28], [-52, -196, 42], [0, -212, 46], [52, -196, 42]];
const FRONT: [number, number, number][] = [[-60, -178, 26], [-22, -188, 30], [18, -188, 30], [58, -178, 26], [-84, -154, 19], [84, -154, 19]];

const Curls: React.FC<{ list: [number, number, number][] }> = ({ list }) => (
  <g>
    {list.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill={C_HAIR} stroke={INK} strokeWidth={12} />)}
    {list.map(([x, y, r], i) => <circle key={"f" + i} cx={x} cy={y} r={r} fill={C_HAIR} />)}
    {list.map(([x, y, r], i) => <path key={"h" + i} d={`M${x - r * 0.5},${y - r * 0.25} q${r * 0.4},${-r * 0.5} ${r * 0.9},${-r * 0.1}`} fill="none" stroke="#3d3a48" strokeWidth={4} strokeLinecap="round" />)}
  </g>
);

/** Head, drawn with the neck joint at (0,0). */
export const CreatorHead: React.FC<Face & { t: number }> = ({ talk = 0, smile = 0.3, brow = 0, wide = 0, lid = 0, lx = 0, ly = 0, sweat, t }) => {
  const o = Math.max(0, Math.min(1, talk));
  const ey = -112;
  const ry = 15 * (1 + 0.4 * wide) * (1 - Math.min(1, lid));
  const browY = -146 - wide * 10;
  const my = -46;
  return (
    <g>
      <Curls list={BACK} />
      <circle cx={-90} cy={-102} r={20} fill={C_SKIN} stroke={INK} strokeWidth={6} />
      <circle cx={90} cy={-102} r={20} fill={C_SKIN} stroke={INK} strokeWidth={6} />
      <path d="M-84,-150 Q-90,-44 -42,-16 Q0,-2 42,-16 Q90,-44 84,-150 Q80,-204 0,-204 Q-80,-204 -84,-150 Z" fill={C_SKIN} stroke={INK} strokeWidth={7} strokeLinejoin="round" />
      <path d="M-60,-40 Q0,-8 60,-40 Q30,-12 0,-10 Q-30,-12 -60,-40 Z" fill={C_SKIN_SHADE} opacity={0.35} />
      <Curls list={FRONT} />
      {/* brows */}
      {[-1, 1].map((k) => (
        <path
          key={k}
          d={`M${k * 66},${browY + brow * -5} Q${k * 42},${browY - 9} ${k * 18},${browY + brow * 9}`}
          fill="none" stroke={C_HAIR} strokeWidth={11} strokeLinecap="round"
        />
      ))}
      {/* eyes */}
      {[-1, 1].map((k) => (
        <g key={k}>
          {ry > 2.5 ? (
            <g>
              <ellipse cx={k * 42} cy={ey} rx={19} ry={ry} fill="#fff" stroke={INK} strokeWidth={4} />
              <circle cx={k * 42 + lx * 9} cy={ey + ly * 6} r={Math.min(8.5 - wide * 2, ry - 1)} fill={INK} />
            </g>
          ) : (
            <path d={`M${k * 42 - 18},${ey} Q${k * 42},${ey + 8} ${k * 42 + 18},${ey}`} fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" />
          )}
        </g>
      ))}
      {/* glasses */}
      <g fill="rgba(255,255,255,0.14)" stroke={INK} strokeWidth={7} strokeLinejoin="round">
        <rect x={-76} y={ey - 28} width={68} height={56} rx={18} />
        <rect x={8} y={ey - 28} width={68} height={56} rx={18} />
        <path d={`M-8,${ey - 4} Q0,${ey - 12} 8,${ey - 4}`} fill="none" />
        <path d={`M-76,${ey - 8} L-92,${ey - 14} M76,${ey - 8} L92,${ey - 14}`} fill="none" />
      </g>
      <path d="M-2,-98 q12,20 -4,24" fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />
      {/* moustache, no beard */}
      <path d="M-36,-60 Q-18,-78 0,-68 Q18,-78 36,-60 Q18,-62 0,-60 Q-18,-62 -36,-60 Z" fill={C_HAIR} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
      {/* mouth */}
      {o < 0.07 ? (
        <path d={`M-24,${my - 6 * smile} Q0,${my + 18 * smile} 24,${my - 6 * smile}`} fill="none" stroke={INK} strokeWidth={7} strokeLinecap="round" />
      ) : (
        <g>
          <path d={`M-23,${my - 6} Q0,${my - 10 - 4 * smile} 23,${my - 6} Q21,${my - 6 + 40 * o} 0,${my - 4 + 42 * o} Q-21,${my - 6 + 40 * o} -23,${my - 6} Z`} fill="#3a0f10" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
          <rect x={-13} y={my - 8} width={26} height={Math.min(8, 30 * o)} rx={3} fill="#fbf7ee" />
          {o > 0.3 ? <ellipse cx={0} cy={my - 8 + 38 * o} rx={11} ry={7 * o} fill="#e07a86" /> : null}
        </g>
      )}
      {sweat ? <path d={`M104,${-176 + ((t * 46) % 34)} q10,16 0,24 q-10,-8 0,-24 Z`} fill="#8fd0ff" stroke={INK} strokeWidth={4} /> : null}
    </g>
  );
};

export type CreatorProps = Face & {
  x: number; y: number; s?: number; pose?: Pose; t: number; flip?: boolean; tilt?: number;
  hold?: "phone" | "phoneGlow" | "bible" | null; logo?: boolean;
};

export const Creator: React.FC<CreatorProps> = ({ x, y, s = 1, pose = IDLE, t, flip, tilt = 0, hold = null, logo = true, ...face }) => {
  const breathe = Math.sin(t * 1.9) * 2.2;
  const ph = (t + 1.3) % 3.4;
  const blink = ph < 0.14 ? Math.sin((ph / 0.14) * Math.PI) : 0;
  const talk = face.talk ?? 0;
  const hipY = -(LEN.thigh + LEN.shin) + pose.drop;
  const shY = -150;
  const headRot = pose.head + tilt + Math.sin(t * 1.1) * 1.4 + talk * Math.sin(t * 9) * 1.8;
  const nod = talk > 0.1 ? Math.abs(Math.sin(t * 6.5)) * -3 : 0;
  const [hx, hy] = handAt(pose.rs, pose.re);
  const hand = <circle r={17} fill={C_SKIN} stroke={INK} strokeWidth={5} />;
  const shoe = <ellipse cx={14} cy={4} rx={28} ry={14} fill="#f8f5ee" stroke={INK} strokeWidth={5} />;
  const held =
    hold === "phone" || hold === "phoneGlow" ? (
      <g transform={`translate(${52 + hx} ${shY + hy}) rotate(-10)`}>
        {hold === "phoneGlow" ? <circle r={150} fill="url(#phoneGlow)" /> : null}
        <rect x={-30} y={-66} width={60} height={104} rx={12} fill="#16141a" stroke={INK} strokeWidth={5} />
        <rect x={-23} y={-58} width={46} height={84} rx={7} fill={hold === "phoneGlow" ? "#d6ecff" : "#4a5a7c"} />
      </g>
    ) : hold === "bible" ? (
      <g transform={`translate(${52 + hx} ${shY + hy}) rotate(-8)`}>
        <rect x={-46} y={-64} width={92} height={120} rx={8} fill="#7a3b2e" stroke={INK} strokeWidth={6} />
        <path d="M0,-40 V8 M-18,-22 H18" stroke="#f2c94c" strokeWidth={8} strokeLinecap="round" />
      </g>
    ) : null;
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <ellipse cy={6} rx={90} ry={13} fill={INK} opacity={0.13} />
      <g transform={`translate(0 ${hipY})`}>
        <Limb x={-20} y={0} a={pose.lh} b={pose.lk} l1={LEN.thigh} l2={LEN.shin} w={20} c={C_JEANS} end={shoe} />
        <Limb x={20} y={0} a={pose.rh} b={pose.rk} l1={LEN.thigh} l2={LEN.shin} w={20} c={C_JEANS} end={shoe} />
        <g transform={`rotate(${pose.torso}) translate(0 ${breathe * 0.5})`}>
          <Limb x={-52} y={shY} a={pose.ls} b={pose.le} l1={LEN.upper} l2={LEN.fore} w={20} c={C_HOODIE} end={hand} />
          <path d="M-66,-170 Q0,-236 66,-170 Q40,-146 0,-146 Q-40,-146 -66,-170 Z" fill={C_HOODIE_D} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
          <path d="M-64,-172 Q0,-190 64,-172 Q76,-80 66,12 Q0,28 -66,12 Q-76,-80 -64,-172 Z" fill={C_HOODIE} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
          <path d="M-36,-32 L36,-32 L46,8 Q0,18 -46,8 Z" fill={C_HOODIE_D} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <path d="M-14,-170 L-16,-112 M14,-170 L16,-112" stroke="#fff8e6" strokeWidth={5} strokeLinecap="round" />
          {logo ? <image href={staticFile("logia-wordmark-white.svg")} x={-40} y={-98} width={80} height={(80 * 205) / 525} transform={flip ? "scale(-1 1)" : undefined} /> : null}
          <Limb x={52} y={shY} a={pose.rs} b={pose.re} l1={LEN.upper} l2={LEN.fore} w={20} c={C_HOODIE} end={hand} />
          {held}
          <rect x={-17} y={-200} width={34} height={34} rx={9} fill={C_SKIN} stroke={INK} strokeWidth={5} />
          <g transform={`translate(0 ${-186 + breathe * 0.3 + nod}) rotate(${headRot})`}>
            <CreatorHead {...face} lid={Math.max(blink, face.lid ?? 0)} t={t} />
          </g>
        </g>
      </g>
    </g>
  );
};
