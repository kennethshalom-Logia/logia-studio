import React from "react";
import { AbsoluteFill, Easing, interpolate, random, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import {
  ANGRY, ARMS_CROSSED, ARMS_UP, BottomLogo, Branding, Captions, Character, CRIMSON, CrossShape, Desk,
  Door, EndCard, FPS, Gate, GOLD, GROUND, HEAD_DOWN, Headline, Hill, Hourglass, IDLE,
  lerp, Library, LogoMark, LOOK_UP, OPEN_HANDS, posed, prog, REACH, Ruins, Scene, SHRUG, Stage,
  Pose, talkAt, useT, Verse, Vignette, Void, walking, Word, WRITE,
} from "./Kit";
import part1 from "./data/part1.json";
import part2 from "./data/part2.json";
import part3 from "./data/part3.json";
import fullVo from "./data/full.json";
import part1V4 from "./data/part1-v4.json";
import part2V3 from "./data/part2-v3.json";
import part2V4 from "./data/part2-v4.json";
import part3V2 from "./data/part3-v2.json";
import part3V4 from "./data/part3-v4.json";
import part3V5 from "./data/part3-v5.json";
import part3R from "./data/part3r.json";

const words = (raw: unknown): Word[] => {
  const list = (Array.isArray(raw) ? raw : (raw as { words: Word[] }).words) as (Word & { type?: string })[];
  return list.filter((w) => !w.type || w.type === "word");
};
const W1 = words(part1);
const W2 = words(part2);
const W3 = words(part3);

const Shell: React.FC<{ audio: string; w: Word[]; part: number; end: number; logo?: boolean; noPad?: boolean; children: React.ReactNode }> = ({
  audio, w, part, end, logo, noPad, children,
}) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Audio src={staticFile(audio)} />
      {noPad ? null : (
        <Audio
          src={staticFile("pad.wav")}
          volume={interpolate(f, [0, 20, end * FPS - 30, end * FPS], [0, 0.32, 0.32, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}
        />
      )}
      {children}
      <Vignette />
      <Sequence durationInFrames={Math.round(end * FPS)} layout="none">
        <Branding part={part} logo={logo} />
        {logo ? <BottomLogo /> : null}
        <Captions words={w} />
      </Sequence>
    </AbsoluteFill>
  );
};

/* ---------- PART 1: could he be forgiven? ---------- */

const P1Hook = () => {
  const t = useT();
  const x = lerp(-120, 540, prog(t, 0, 2.2));
  const pose = walking(LOOK_UP, t, 1 - prog(t, 1.9, 2.3));
  return (
    <>
      <Stage>
        <Library t={t} />
        <Character look="eli" pose={pose} x={x} t={t} scale={1.12} />
      </Stage>
      <Headline lines={["Is Hitler", ["in heaven?", GOLD]]} size={168} top={330} />
    </>
  );
};

const P1NoWay = () => {
  const t = useT();
  const pose = posed(t, [[0, LOOK_UP], [0.5, ARMS_CROSSED]]);
  return (
    <>
      <Stage>
        <Library t={t + 3} />
        <Character look="eli" pose={{ ...pose, head: Math.sin(t * 7) * 7 * prog(t, 1.1, 1.3) }} x={540} t={t} scale={1.2} />
      </Stage>
      <Headline lines={[["No way.", CRIMSON]]} at={1.2} size={210} top={350} />
    </>
  );
};

const P1Gate = () => {
  const t = useT();
  const closed = prog(t, 5.0, 5.7);
  const x = lerp(160, 540, prog(t, 0, 3.4));
  const walk = 1 - prog(t, 3.1, 3.5);
  const pose = walking(posed(t, [[0, IDLE], [3.4, REACH], [5.2, REACH], [5.8, SHRUG]]), t, walk);
  const jolt = closed > 0 && closed < 1 ? Math.sin(t * 60) * 6 : 0;
  return (
    <>
      <Stage>
        <Hill t={t} rise={0.4} cross={0} />
        <g transform={`translate(${jolt} 0)`}><Gate x={540} y={GROUND - 30} closed={closed} /></g>
        <Character look="eli" pose={pose} x={x} t={t} scale={0.9} />
      </Stage>
      <Headline lines={["Heaven is for", ["good people?", GOLD]]} at={1.6} size={118} top={270} />
    </>
  );
};

const P1Paul = () => {
  const t = useT();
  const fall = prog(t, 2.5, 3.2);
  const x = lerp(-80, 480, prog(t, 0, 2.3));
  const pose = walking(posed(t, [[0, { ...IDLE, rs: -120, re: -40, brow: 1 }], [2.5, { ...IDLE, rs: -120, re: -40, brow: 1 }], [3.2, WRITE]]), t, 1 - prog(t, 2.2, 2.6), 2.4);
  const beam = prog(t, 2.6, 3.4);
  return (
    <>
      <Stage>
        {t < 2.7 ? <Ruins t={t} glow={0.5} /> : <Void t={t} tint="#6a4a12" seed="p" />}
        {beam > 0 ? <path d={`M400,0 L580,0 L${680 + 100},${GROUND + 60} L${180},${GROUND + 60} Z`} fill={GOLD} opacity={0.26 * beam} /> : null}
        <Character look="paul" pose={pose} x={x} t={t} scale={1.1} rim={fall > 0.5 ? GOLD : undefined} />
      </Stage>
      {t < 2.6 ? <Headline lines={["Paul hunted", ["Christians", CRIMSON]]} size={130} top={290} /> : null}
      {t >= 3.0 ? <Verse text="“Christ came to save sinners, of whom I am the foremost.”" cite="1 TIMOTHY 1:15" at={3.0} /> : null}
    </>
  );
};

const P1Cross = () => {
  const t = useT();
  const rise = prog(t, 0, 2);
  const pose = posed(t, [[0, HEAD_DOWN], [2.4, LOOK_UP], [4.6, OPEN_HANDS]]);
  return (
    <>
      <Stage>
        <Hill t={t} rise={rise} cross={rise} />
        <Character look="eli" pose={pose} x={540} t={t} scale={0.95} rim="#ffd98a" />
      </Stage>
      <Headline lines={["No sin", ["outruns the cross", GOLD]]} at={4.4} size={112} top={270} />
    </>
  );
};

const P1Split = () => {
  const t = useT();
  const walk = prog(t, 3.2, 6.2);
  return (
    <>
      <Stage>
        <Void t={t} tint={t > 3.6 ? "#4a1a0a" : "#26324f"} seed="s" />
        <Character look="hitler" pose={walking(IDLE, t, walk > 0 ? 1 : 0)} x={lerp(540, 1240, walk)} t={t} rim="#ff8a3d" scale={1.05} />
      </Stage>
      {t < 3.8 ? (
        <Headline lines={["Forgivable", ["≠", CRIMSON], ["Forgiven", GOLD]]} size={150} top={270} />
      ) : (
        <Headline lines={["His", ["last day?", CRIMSON]]} at={3.9} size={170} top={320} />
      )}
    </>
  );
};


/* ---------- PART 2: what he did with it ---------- */

const P2Hook = () => {
  const t = useT();
  return (
    <>
      <Stage>
        <Void t={t} tint="#3b220c" seed="d" />
        <Desk x={460} t={t} />
        <Character look="hitler" pose={{ ...IDLE, rs: -34, re: -46, ls: 8, le: -12, head: 10 + Math.sin(t * 5) * 1.5, torso: 6 }} x={400} t={t} rim="#ffb45e" scale={1.05} />
      </Stage>
      <Headline lines={["His", ["final words", GOLD]]} size={170} top={300} />
    </>
  );
};

const P2Berlin = () => {
  const t = useT();
  const s = prog(t, 0.1, 0.45);
  return (
    <>
      <Stage>
        <Ruins t={t} />
        <Character look="hitler" pose={HEAD_DOWN} x={760} t={t} scale={0.55} rim="#ff8a3d" ground={GROUND - 6} />
      </Stage>
      <Headline lines={["April 29", ["1945", GOLD]]} size={190 * lerp(0.9, 1, s)} top={290} />
    </>
  );
};

const Testament: React.FC<{ t: number; at1: number; at2: number }> = ({ t, at1, at2 }) => {
  const row = (label: string, at: number) => {
    const p = prog(t, at, at + 0.3);
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 30, opacity: p, fontFamily: "Georgia, serif", fontSize: 78, color: "#20160d" }}>
        <div style={{ width: 78, height: 78, border: "7px solid #20160d", borderRadius: 8, flexShrink: 0 }} />
        <div style={{ position: "relative" }}>
          {label}
          <div style={{ position: "absolute", left: 0, top: "54%", height: 8, background: CRIMSON, width: `${prog(t, at + 0.3, at + 0.6) * 100}%` }} />
        </div>
      </div>
    );
  };
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 310 }}>
      <div style={{ background: "#efe4c6", padding: "60px 56px", width: 860, rotate: "-1.5deg", boxShadow: "0 30px 90px rgba(0,0,0,.8)", display: "flex", flexDirection: "column", gap: 42 }}>
        <div style={{ fontFamily: "Georgia, serif", fontSize: 44, letterSpacing: 7, color: "#5b4a30", textAlign: "center" }}>LAST TESTAMENT</div>
        {row("Confession", at1)}
        {row("Repentance", at2)}
      </div>
    </AbsoluteFill>
  );
};

const P2Paper = () => {
  const t = useT();
  return (
    <>
      <Stage><Void t={t} tint="#3b1a0a" seed="pa" /></Stage>
      <Testament t={t} at1={0.1} at2={1.4} />
    </>
  );
};

const P2Blame: React.FC<{ at?: number }> = ({ at = 5.2 }) => {
  const t = useT();
  const grow = prog(t, 0, 6);
  return (
    <>
      <Stage>
        <Ruins t={t + 6} glow={0.6} />
        <Character look="hitler" pose={{ ...IDLE, ls: 5, rs: -5, le: -4, re: 4, head: 4 }} x={540} t={t} scale={lerp(1.0, 1.42, grow)} rim={CRIMSON} shadow={false} />
      </Stage>
      <Headline lines={[["Without mercy", CRIMSON]]} at={at} size={130} top={300} />
    </>
  );
};

const P2Door = () => {
  const t = useT();
  const open = prog(t, 3.8, 5.1);
  const guideTalk = talkAt(W2, t + 23);
  const turn = prog(t, 6.4, 8.2);
  const pose = walking(HEAD_DOWN, t, turn > 0 ? 1 : 0);
  return (
    <>
      <Stage>
        <Hill t={t} rise={0.15} cross={0} />
        <rect width={1080} height={1920} fill="#120808" opacity={0.48} />
        <Door x={760} open={open} />
        {t < 4 ? <Character look="guide" pose={posed(t, [[0, IDLE], [0.5, OPEN_HANDS]])} x={290} t={t} talk={guideTalk} scale={1.0} /> : null}
        {t >= 4 ? <Character look="hitler" pose={pose} x={lerp(470, -180, turn)} t={t} rim="#ff8a3d" scale={0.95} /> : null}
      </Stage>
      {t < 3.9 ? <Verse text="“Unless you repent, you will all likewise perish.”" cite="LUKE 13:3" at={0.2} /> : null}
      {t >= 4.2 ? <Headline lines={["Offered.", ["Never forced.", GOLD]]} at={4.3} size={124} top={280} /> : null}
    </>
  );
};

const P2Hour = () => {
  const t = useT();
  return (
    <>
      <Stage>
        <Void t={t} tint="#21304e" seed="h" />
        <Hourglass x={540} y={830} p={prog(t, 0, 6.4)} s={1.25} />
      </Stage>
      <Headline lines={["Only", ["God knows", GOLD]]} at={2.9} size={140} top={260} />
    </>
  );
};

const P2Tease = () => {
  const t = useT();
  return (
    <>
      <Stage>
        <Library t={t + 9} />
        <Character look="eli" pose={posed(t, [[0, IDLE], [0.8, ARMS_CROSSED]])} x={540} t={t} scale={1.15} />
      </Stage>
      <Headline lines={["Nobody wants", ["to hear this", CRIMSON]]} at={0.5} size={124} top={290} />
    </>
  );
};

export const Part2: React.FC = () => (
  <Shell audio="part2.mp3" w={W2} part={2} end={42.2} logo>
    <Scene from={0} to={5.6}><P2Hook /></Scene>
    <Scene from={5.6} to={13.3}><P2Berlin /></Scene>
    <Scene from={13.3} to={16.1}><P2Paper /></Scene>
    <Scene from={16.1} to={23.0}><P2Blame /></Scene>
    <Scene from={23.0} to={31.9}><P2Door /></Scene>
    <Scene from={31.9} to={38.9}><P2Hour /></Scene>
    <Scene from={38.9} to={42.2}><P2Tease /></Scene>
    <Sequence from={Math.round(42.2 * FPS)}><EndCard logo title="Part 3: the twist" sub="Follow so you don't miss it" /></Sequence>
  </Shell>
);

/* ---------- PART 3: how grace works, and the invitation ---------- */

const Vase: React.FC<{ x: number; t: number; at: number }> = ({ x, t, at }) => {
  const top = GROUND - 250;
  const fall = prog(t, at - 0.3, at, Easing.in(Easing.quad));
  const wobble = t < at - 0.3 ? Math.sin(t * 16) * prog(t, at - 1, at - 0.3) * 7 : 0;
  const burst = prog(t, at, at + 0.7, Easing.out(Easing.cubic));
  return (
    <g>
      <rect x={x - 90} y={top} width={180} height={250} rx={8} fill="#2a2f45" />
      <rect x={x - 112} y={top - 18} width={224} height={26} rx={6} fill="#3a4060" />
      {t < at ? (
        <g transform={`translate(${x + fall * 150} ${top - 18 + fall * 268}) rotate(${wobble + fall * 70})`}>
          <path d="M-60,0 Q-140,-120 -80,-230 Q-50,-270 -56,-320 L56,-320 Q50,-270 80,-230 Q140,-120 60,0 Z" fill="#e8b84d" />
          <path d="M-98,-120 Q0,-90 98,-120 L92,-82 Q0,-52 -92,-82 Z" fill="#a8232f" />
        </g>
      ) : (
        Array.from({ length: 11 }).map((_, i) => {
          const dir = (i - 5) * 60 + (random(`sx${i}`) - 0.5) * 40;
          const px = x + 150 + dir * burst;
          const py = GROUND - 14 - random(`sy${i}`) * 26 - Math.sin(burst * Math.PI) * (130 + random(`sh${i}`) * 170);
          const size = 22 + random(`ss${i}`) * 34;
          return (
            <path
              key={i}
              transform={`translate(${px} ${py}) rotate(${random(`sr${i}`) * 300 * burst})`}
              d={`M${-size},${size * 0.5} L${-size * 0.2},${-size} L${size},${size * 0.2} Z`}
              fill={i % 3 === 0 ? "#a8232f" : "#e8b84d"}
            />
          );
        })
      )}
    </g>
  );
};

const Bill: React.FC<{ t: number; at: number; stamp?: number; y?: number; s?: number }> = ({ t, at, stamp = 99, y = 530, s = 1 }) => {
  const open = prog(t, at, at + 0.5, Easing.out(Easing.cubic));
  const hit = prog(t, stamp, stamp + 0.16, Easing.out(Easing.cubic));
  return (
    <g transform={`translate(540 ${y}) scale(${s}) rotate(-2)`} opacity={open}>
      <g transform={`translate(0 ${lerp(-40, 0, open)})`}>
        <rect x={-270} y={0} width={540} height={lerp(30, 340, open)} rx={8} fill="#efe4c6" />
        <text y={92} textAnchor="middle" fontFamily="Anton" fontSize={76} fill="#20160d">YOU OWE</text>
        <rect x={-210} y={118} width={420} height={6} fill="#20160d" />
        <text y={230} textAnchor="middle" fontFamily="Anton" fontSize={92} fill={CRIMSON} opacity={1 - hit}>EVERYTHING</text>
        <text y={290} textAnchor="middle" fontFamily="Georgia, serif" fontSize={34} fill="#5b4a30" opacity={1 - hit}>more than you will ever have</text>
      </g>
      {hit > 0 ? (
        <g transform={`translate(0 215) rotate(-9) scale(${lerp(2.2, 1, hit)})`} opacity={hit}>
          <rect x={-200} y={-92} width={400} height={170} rx={14} fill="none" stroke="#1f7a45" strokeWidth={14} />
          <text y={48} textAnchor="middle" fontFamily="Anton" fontSize={132} fill="#1f7a45">PAID</text>
        </g>
      ) : null}
    </g>
  );
};

const Gift: React.FC<{ x: number; y: number; s?: number; glow?: number }> = ({ x, y, s = 1, glow = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <circle r={190} fill={GOLD} opacity={0.34 * glow} style={{ filter: "blur(34px)" }} />
    <rect x={-85} y={-70} width={170} height={140} rx={8} fill={CRIMSON} />
    <rect x={-98} y={-96} width={196} height={42} rx={8} fill="#ef4154" />
    <rect x={-16} y={-96} width={32} height={166} fill={GOLD} />
    <path d="M0,-96 C-70,-170 -100,-100 0,-96 C100,-100 70,-170 0,-96 Z" fill={GOLD} />
  </g>
);

const P3Hook = () => {
  const t = useT();
  return (
    <>
      <Stage>
        <Library t={t} />
        <Character look="eli" pose={posed(t, [[0, ARMS_CROSSED], [2.0, ARMS_CROSSED], [3.0, HEAD_DOWN]])} x={lerp(540, 320, prog(t, 2.2, 2.8))} t={t} scale={1.05} />
        {t >= 2.6 ? <Character look="hitler" pose={HEAD_DOWN} x={lerp(1240, 780, prog(t, 2.6, 3.4))} t={t} scale={0.82} /> : null}
      </Stage>
      {t < 2.1 ? (
        <Headline lines={["Nobody wants", ["to hear this", CRIMSON]]} size={128} top={290} />
      ) : (
        <Headline lines={["You need the", "same grace", ["Hitler needed", GOLD]]} at={2.1} size={112} top={270} />
      )}
    </>
  );
};

const P3Question = () => {
  const t = useT();
  return (
    <>
      <Stage>
        <Void t={t} tint="#21304e" seed="q" />
        <Character look="eli" pose={posed(t, [[0, HEAD_DOWN], [0.5, SHRUG]])} x={540} t={t} scale={1.15} />
      </Stage>
      <Headline lines={["What is", ["grace?", GOLD]]} size={170} top={290} />
    </>
  );
};

const P3Broke = () => {
  const t = useT();
  const pose = posed(t, [[0, IDLE], [0.5, REACH], [0.95, REACH], [1.3, SHRUG], [3.2, SHRUG], [3.8, HEAD_DOWN]]);
  return (
    <>
      <Stage>
        <Void t={t} tint="#3a0a12" seed="b" />
        {t > 2.8 ? <Bill t={t} at={2.8} y={545} s={0.82} /> : null}
        <Vase x={700} t={t} at={1.05} />
        <Character look="eli" pose={pose} x={lerp(300, 330, prog(t, 0, 0.7))} t={t} scale={0.92} />
      </Stage>
      {t < 2.7 ? <Headline lines={["You broke", ["something huge", CRIMSON]]} at={1.1} size={118} top={280} /> : null}
    </>
  );
};

const P3Pays = () => {
  const t = useT();
  const arrive = prog(t, 0, 1.7);
  const talk = talkAt(W3, t + 13.5);
  const guide = walking(posed(t, [[0, IDLE], [1.7, IDLE], [2.3, OPEN_HANDS], [3.1, OPEN_HANDS], [3.4, { ...IDLE, ls: 118, le: 10, rs: -14, smile: 0.6 }], [4.6, OPEN_HANDS]]), t, 1 - prog(t, 1.5, 1.9));
  const eli = posed(t, [[0, HEAD_DOWN], [1.7, HEAD_DOWN], [2.3, LOOK_UP], [4.3, { ...OPEN_HANDS, smile: 0.8 }]]);
  return (
    <>
      <Stage>
        <Void t={t} tint={t > 3.4 ? "#3b5b34" : "#3a0a12"} seed="pay" />
        <Bill t={t} at={-1} stamp={3.4} y={545} s={0.82} />
        <Character look="eli" pose={eli} x={290} t={t} scale={0.92} />
        <Character look="guide" pose={guide} x={lerp(1240, 760, arrive)} t={t} talk={talk} scale={0.92} seed={3} rim={GOLD} />
      </Stage>
      {t >= 2.2 ? <Headline lines={["“I'll pay", ["for it”", GOLD]]} at={2.2} size={104} top={280} /> : null}
    </>
  );
};

const P3Cross = () => {
  const t = useT();
  const rise = prog(t, 1.6, 3.4);
  return (
    <>
      <Stage>
        <Hill t={t} rise={rise} cross={prog(t, 2.2, 3.4)} />
        <Character look="eli" pose={posed(t, [[0, HEAD_DOWN], [2.6, LOOK_UP]])} x={540} t={t} scale={0.9} rim="#ffd98a" />
      </Stage>
      {t < 1.5 ? <Headline lines={["That's", ["grace", GOLD]]} size={170} top={280} /> : null}
      {t >= 1.5 && t < 2.7 ? <Headline lines={[["We broke it", CRIMSON]]} at={1.6} size={132} top={290} /> : null}
      {t >= 2.7 ? <Headline lines={["Jesus", ["paid for it", GOLD]]} at={2.7} size={124} top={270} /> : null}
    </>
  );
};

const P3Gift = () => {
  const t = useT();
  const take = prog(t, 4.9, 5.6);
  const eli = walking(posed(t, [[0, ARMS_CROSSED], [2.0, ARMS_CROSSED], [2.6, IDLE], [3.8, IDLE], [4.3, { ...OPEN_HANDS, smile: 1 }]]), t, prog(t, 2.3, 2.5) * (1 - prog(t, 3.5, 3.8)));
  const eliX = lerp(250, 400, prog(t, 2.4, 3.7));
  const giftX = lerp(590, 455, take);
  return (
    <>
      <Stage>
        <Void t={t} tint="#6a4a12" seed="g" />
        <Character look="guide" pose={posed(t, [[0, OPEN_HANDS]])} x={790} t={t} scale={0.96} seed={3} rim={GOLD} />
        <Character look="eli" pose={eli} x={eliX} t={t} scale={0.96} />
        <Gift x={giftX} y={GROUND - 310 - Math.sin(t * 3) * 8} s={0.72} />
      </Stage>
      {t < 1.5 ? <Headline lines={["You can't", ["earn it", CRIMSON]]} at={0.1} size={140} top={280} /> : null}
      {t >= 1.5 && t < 3.7 ? <Headline lines={["It's", ["a gift", GOLD]]} at={1.6} size={160} top={280} /> : null}
      {t >= 3.7 ? <Headline lines={["Open your hands", ["and take it", GOLD]]} at={3.8} size={108} top={280} /> : null}
    </>
  );
};

const P3Refuse: React.FC<{ split?: number }> = ({ split = 4.5 }) => {
  const t = useT();
  const away = prog(t, split * 0.49, split * 1.47);
  return (
    <>
      <Stage>
        <Void t={t} tint="#26324f" seed="r" />
        <Gift x={740} y={GROUND - 70} s={0.9} glow={lerp(1, 0.55, away)} />
        <Character look="hitler" pose={walking(HEAD_DOWN, t, away > 0 && away < 1 ? 1 : 0)} x={lerp(560, -220, away)} t={t} rim="#ff8a3d" scale={1.0} />
      </Stage>
      {t < split ? (
        <Headline lines={["God never", ["forces it", GOLD]]} at={0.2} size={140} top={280} />
      ) : (
        <Headline lines={["The gift can", ["be refused", CRIMSON]]} at={split + 0.1} size={124} top={280} />
      )}
    </>
  );
};

const P3Held = () => {
  const t = useT();
  return (
    <>
      <Stage>
        <Void t={t} tint="#6a4a12" seed="h3" />
        <Character look="guide" pose={OPEN_HANDS} x={540} t={t} scale={1.0} seed={3} rim={GOLD} />
        <Gift x={540} y={GROUND - 250 - Math.sin(t * 3) * 8} s={0.95} />
      </Stage>
      <Verse text="“The free gift of God is eternal life in Christ Jesus our Lord.”" cite="ROMANS 6:23" at={0.1} top={250} />
    </>
  );
};

const P3Prayer = () => {
  const t = useT();
  const pose = posed(t, [[0, IDLE], [1.1, HEAD_DOWN], [4.1, HEAD_DOWN], [4.6, LOOK_UP], [5.8, LOOK_UP], [6.4, { ...OPEN_HANDS, smile: 1, head: -6 }]]);
  const rise = prog(t, 1, 6.5);
  return (
    <>
      <Stage>
        <Hill t={t} rise={rise} cross={rise} />
        <rect width={1080} height={1920} fill="#0c0508" opacity={lerp(0.55, 0, rise)} />
        <Character look="eli" pose={pose} x={540} t={t} scale={0.95} rim={rise > 0.5 ? "#ffd98a" : undefined} />
      </Stage>
      {t < 2.3 ? <Headline lines={["Tell", ["Him", GOLD]]} size={170} top={280} /> : null}
      {t >= 2.3 && t < 4.2 ? <Headline lines={["“I'm sorry.", ["I can't pay.”", CRIMSON]]} at={2.3} size={118} top={280} /> : null}
      {t >= 4.2 && t < 5.9 ? <Headline lines={["“Thank you", ["for paying”", GOLD]]} at={4.2} size={118} top={280} /> : null}
      {t >= 5.9 ? <Headline lines={[["“I'm yours”", GOLD]]} at={5.9} size={150} top={300} /> : null}
    </>
  );
};

const P3Invite = () => {
  const t = useT();
  return (
    <>
      <Stage>
        <Hill t={t} />
        <Gift x={540} y={GROUND - 140 - Math.sin(t * 3) * 8} s={1.25} />
      </Stage>
      {t < 1.45 ? (
        <Headline lines={["The", ["invitation", GOLD]]} size={150} top={280} />
      ) : (
        <Headline lines={["Will you", ["take it?", GOLD]]} at={1.45} size={170} top={280} />
      )}
    </>
  );
};

export const Part3: React.FC = () => (
  <Shell audio="part3.mp3" w={W3} part={3} end={50} logo>
    <Scene from={0} to={5.0}><P3Hook /></Scene>
    <Scene from={5.0} to={6.9}><P3Question /></Scene>
    <Scene from={6.9} to={13.5}><P3Broke /></Scene>
    <Scene from={13.5} to={19.2}><P3Pays /></Scene>
    <Scene from={19.2} to={24.4}><P3Cross /></Scene>
    <Scene from={24.4} to={30.3}><P3Gift /></Scene>
    <Scene from={30.3} to={37.1}><P3Refuse /></Scene>
    <Scene from={37.1} to={39.7}><P3Held /></Scene>
    <Scene from={39.7} to={47.0}><P3Prayer /></Scene>
    <Scene from={47.0} to={50.0}><P3Invite /></Scene>
    <Sequence from={50 * FPS}><EndCard logo title="Grace is a gift" sub="Prayed this? Tell someone today. Follow Logia." /></Sequence>
  </Shell>
);

/* ---------- FULL: all three parts as one video ---------- */

const P2_AT = 36;
const P3_AT = 74.9;
const FULL_END = 124.9;

const shift = (w: Word[], by: number, until = Infinity) =>
  w.filter((x) => x.start < until).map((x) => ({ ...x, start: x.start + by, end: x.end + by }));
const WF = [...shift(W1, 0, P2_AT), ...shift(W2, P2_AT, P3_AT - P2_AT), ...shift(W3, P3_AT)];

// Chapter markers and retention prompts, in the slot clear of Instagram's top controls.
type Cue = [number, number, string, string];
const CUES: Cue[] = [
  [0, 3.5, "STAY TILL THE END", CRIMSON],
  [3.5, 29, "1/3 THE QUESTION", "#2a2f45"],
  [29, 36, "WAIT FOR IT", CRIMSON],
  [36, 68, "2/3 HIS LAST DAY", "#2a2f45"],
  [68, P3_AT, "THE TWIST IS NEXT", CRIMSON],
  [P3_AT, 99.3, "3/3 THE GIFT", "#2a2f45"],
  [99.3, 105.2, "SAVE THIS", "#1f7a45"],
  [105.2, 121.9, "3/3 THE GIFT", "#2a2f45"],
  [121.9, FULL_END, "SEND THIS TO A FRIEND", "#1f7a45"],
];

const FullHud: React.FC<{ cues: Cue[]; end: number }> = ({ cues, end }) => {
  const t = useT();
  const cue = cues.find(([a, b]) => t >= a && t < b);
  const pop = cue ? prog(t, cue[0], cue[0] + 0.25, Easing.out(Easing.back(2))) : 0;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 148, left: 66, right: 66, height: 8, borderRadius: 4, background: "rgba(255,255,255,.22)" }}>
        <div style={{ height: "100%", borderRadius: 4, background: GOLD, width: `${Math.min(1, t / end) * 100}%` }} />
      </div>
      <div style={{ position: "absolute", top: 170, left: 66 }}>
        <LogoMark width={190} style={{ marginTop: -14, filter: "drop-shadow(0 2px 10px rgba(0,0,0,.9))" }} />
      </div>
      {cue ? (
        <div style={{ position: "absolute", top: 170, right: 66, fontFamily: "Inter", fontWeight: 800, fontSize: 32, color: "#fff", background: cue[3], height: 54, lineHeight: "54px", padding: "0 22px", borderRadius: 27, scale: String(pop) }}>
          {cue[2]}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export const Full: React.FC = () => {
  const f = useCurrentFrame();
  const endF = FULL_END * FPS;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Audio src={staticFile("part1.mp3")} />
      <Sequence from={P2_AT * FPS} durationInFrames={Math.round((P3_AT - P2_AT) * FPS)} layout="none"><Audio src={staticFile("part2.mp3")} /></Sequence>
      <Sequence from={Math.round(P3_AT * FPS)} layout="none"><Audio src={staticFile("part3.mp3")} /></Sequence>
      <Audio
        src={staticFile("pad.wav")}
        loop
        volume={interpolate(f, [0, 20, endF - 30, endF], [0, 0.32, 0.32, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
      />
      <Scene from={0} to={3.5}><P1Hook /></Scene>
      <Scene from={3.5} to={6.0}><P1NoWay /></Scene>
      <Scene from={6.0} to={13.7}><P1Gate /></Scene>
      <Scene from={13.7} to={21.8}><P1Paul /></Scene>
      <Scene from={21.8} to={29.0}><P1Cross /></Scene>
      <Scene from={29.0} to={36.0}><P1Split /></Scene>
      <Scene from={P2_AT} to={P2_AT + 5.6}><P2Hook /></Scene>
      <Scene from={P2_AT + 5.6} to={P2_AT + 13.3}><P2Berlin /></Scene>
      <Scene from={P2_AT + 13.3} to={P2_AT + 16.1}><P2Paper /></Scene>
      <Scene from={P2_AT + 16.1} to={P2_AT + 23.0}><P2Blame /></Scene>
      <Scene from={P2_AT + 23.0} to={P2_AT + 31.9}><P2Door /></Scene>
      <Scene from={P2_AT + 31.9} to={P3_AT}><P2Hour /></Scene>
      <Scene from={P3_AT} to={P3_AT + 5.0}><P3Hook /></Scene>
      <Scene from={P3_AT + 5.0} to={P3_AT + 6.9}><P3Question /></Scene>
      <Scene from={P3_AT + 6.9} to={P3_AT + 13.5}><P3Broke /></Scene>
      <Scene from={P3_AT + 13.5} to={P3_AT + 19.2}><P3Pays /></Scene>
      <Scene from={P3_AT + 19.2} to={P3_AT + 24.4}><P3Cross /></Scene>
      <Scene from={P3_AT + 24.4} to={P3_AT + 30.3}><P3Gift /></Scene>
      <Scene from={P3_AT + 30.3} to={P3_AT + 37.1}><P3Refuse /></Scene>
      <Scene from={P3_AT + 37.1} to={P3_AT + 39.7}><P3Held /></Scene>
      <Scene from={P3_AT + 39.7} to={P3_AT + 47.0}><P3Prayer /></Scene>
      <Scene from={P3_AT + 47.0} to={FULL_END}><P3Invite /></Scene>
      <Vignette />
      <Sequence durationInFrames={Math.round(endF)} layout="none">
        <FullHud cues={CUES} end={FULL_END} />
        <Captions words={WF} />
      </Sequence>
      <Sequence from={Math.round(endF)}><EndCard logo title="Grace is a gift" sub="Prayed this? Tell someone today. Follow Logia." /></Sequence>
    </AbsoluteFill>
  );
};

/* ---------- SHORT: the single video, on its own tighter voiceover ---------- */

const SHORT_END = 106.6;
const WS = words(fullVo);

const SHORT_CUES: Cue[] = [
  [0, 8.6, "STAY TILL THE END", CRIMSON],
  [8.6, 33.8, "1/3 THE QUESTION", "#2a2f45"],
  [33.8, 36.4, "WAIT FOR IT", CRIMSON],
  [36.4, 52.2, "2/3 HIS LAST DAY", "#2a2f45"],
  [52.2, 59.2, "THE TWIST IS NEXT", CRIMSON],
  [59.2, 81.1, "3/3 THE GIFT", "#2a2f45"],
  [81.1, 87.0, "SAVE THIS", "#1f7a45"],
  [87.0, 100.5, "3/3 THE GIFT", "#2a2f45"],
  [100.5, SHORT_END, "SEND THIS TO A FRIEND", "#1f7a45"],
];

const SStay = () => {
  const t = useT();
  return (
    <>
      <Stage>
        <Library t={t + 3} />
        <Character look="eli" pose={posed(t, [[0, ARMS_CROSSED], [1.6, ARMS_CROSSED], [2.3, LOOK_UP]])} x={540} t={t} scale={1.15} />
      </Stage>
      {t < 1.6 ? (
        <Headline lines={["Stay till", ["the end", GOLD]]} size={160} top={290} />
      ) : (
        <Headline lines={["This changes", "what you believe", ["about yourself", GOLD]]} at={1.6} size={106} top={270} />
      )}
    </>
  );
};

const SClose = () => {
  const t = useT();
  return (
    <>
      <Stage>
        <Hill t={t} />
        <Gift x={540} y={GROUND - 140 - Math.sin(t * 3) * 8} s={1.25} />
      </Stage>
      {t < 3.2 ? <Headline lines={["The real", ["question", GOLD]]} size={150} top={280} /> : null}
      {t >= 3.2 && t < 4.5 ? <Headline lines={[["It's this", "#fff"]]} at={3.2} size={160} top={300} /> : null}
      {t >= 4.5 ? <Headline lines={["Will you", ["take it?", GOLD]]} at={4.5} size={170} top={280} /> : null}
    </>
  );
};

export const FullShort: React.FC = () => {
  const f = useCurrentFrame();
  const endF = Math.round(SHORT_END * FPS);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Audio src={staticFile("full.mp3")} />
      <Audio
        src={staticFile("pad.wav")}
        loop
        volume={interpolate(f, [0, 20, endF - 30, endF], [0, 0.32, 0.32, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
      />
      <Scene from={0} to={1.8}><P1Hook /></Scene>
      <Scene from={1.8} to={4.3}><P1NoWay /></Scene>
      <Scene from={4.3} to={8.6}><SStay /></Scene>
      <Scene from={8.6} to={16.4}><P1Gate /></Scene>
      <Scene from={16.4} to={23.45}><P1Paul /></Scene>
      <Scene from={23.45} to={30.1}><P1Cross /></Scene>
      <Scene from={30.1} to={36.4}><P1Split /></Scene>
      <Scene from={36.4} to={40.1}><P2Hook /></Scene>
      <Scene from={40.1} to={42.7}><P2Paper /></Scene>
      <Scene from={42.7} to={48.3}><P2Blame at={4.4} /></Scene>
      <Scene from={48.3} to={52.2}><P2Door /></Scene>
      <Scene from={52.2} to={59.2}><P2Hour /></Scene>
      <Scene from={59.2} to={64.1}><P3Hook /></Scene>
      <Scene from={64.1} to={65.9}><P3Question /></Scene>
      <Scene from={65.9} to={70.6}><P3Broke /></Scene>
      <Scene from={70.6} to={76.0}><P3Pays /></Scene>
      <Scene from={76.0} to={81.1}><P3Cross /></Scene>
      <Scene from={81.1} to={87.0}><P3Gift /></Scene>
      <Scene from={87.0} to={90.6}><P3Refuse split={1.8} /></Scene>
      <Scene from={90.6} to={93.3}><P3Held /></Scene>
      <Scene from={93.3} to={100.5}><P3Prayer /></Scene>
      <Scene from={100.5} to={SHORT_END}><SClose /></Scene>
      <Vignette />
      <Sequence durationInFrames={endF} layout="none">
        <FullHud cues={SHORT_CUES} end={SHORT_END} />
        <Captions words={WS} />
      </Sequence>
      <Sequence from={endF}><EndCard logo title="Grace is a gift" sub="Prayed this? Tell someone today. Follow Logia." /></Sequence>
    </AbsoluteFill>
  );
};

/* ---------- PART 1, rebuilt on the supplied script ---------- */

const W1N = words(part1V4);

const ScaledGate: React.FC<{ closed: number; jolt?: number }> = ({ closed, jolt = 0 }) => (
  <g transform={`translate(${540 + jolt} ${GROUND - 20}) scale(0.72)`}>
    <Gate x={0} y={0} closed={closed} />
  </g>
);

const N1Hook = () => {
  const t = useT();
  const x = lerp(-120, 300, prog(t, 0, 2));
  return (
    <>
      <Stage>
        <Hill t={t} rise={0.4} cross={0} />
        <ScaledGate closed={0} />
        <Character look="hitler" pose={walking(posed(t, [[0, IDLE], [2, IDLE], [2.6, LOOK_UP]]), t, 1 - prog(t, 1.8, 2.2))} x={x} t={t} scale={0.85} />
      </Stage>
      <Headline lines={["Is Hitler", ["in heaven?", GOLD]]} at={0.3} size={140} top={280} />
    </>
  );
};

// A wall of "NO" behind him, so the gut reaction fills the room.
const NoWall: React.FC<{ t: number; on: number }> = ({ t, on }) => (
  <g opacity={on * 0.3}>
    {Array.from({ length: 11 }).map((_, i) => (
      <text
        key={i}
        x={(i % 2 ? -1 : 1) * (t * 90 + 100) - 300}
        y={150 + i * 130}
        fontFamily="Anton"
        fontSize={118}
        fill={CRIMSON}
        letterSpacing={18}
      >
        {"NO NO NO NO NO NO NO NO NO NO"}
      </text>
    ))}
  </g>
);

const N1No = () => {
  const t = useT();
  const pose = posed(t, [[0, LOOK_UP], [0.6, ARMS_CROSSED]]);
  return (
    <>
      <Stage>
        <Library t={t + 3} />
        <NoWall t={t} on={prog(t, 1.02, 1.1)} />
        <Character look="eli" pose={{ ...pose, head: Math.sin(t * 7) * 7 * prog(t, 1.02, 1.2) * (1 - prog(t, 1.9, 2.2)) }} x={540} t={t} scale={1.2} />
      </Stage>
      <Headline lines={[["No.", CRIMSON]]} at={1.02} size={260} top={290} />
    </>
  );
};

/* One person, then the camera pulls back and back until they are lost in the crowd. */
const CROWD_RINGS = 44;
const CROWD_TONES = ["#d8d0c2", "#a89f92", "#7f786e"];
const CROWD: string[][] = (() => {
  const rings: string[][] = Array.from({ length: CROWD_RINGS }, () => CROWD_TONES.map(() => ""));
  for (let r = -36; r <= 36; r++) {
    for (let c = -30; c <= 30; c++) {
      if (r === 0 && c === 0) continue;
      const x = 540 + c * 24 + (r % 2 ? 12 : 0);
      const y = 900 + r * 34;
      const ring = Math.min(CROWD_RINGS - 1, Math.floor((Math.hypot(x - 540, y - 900) / 1400) * CROWD_RINGS));
      const tone = Math.floor(random(`cr${r}.${c}`) * CROWD_TONES.length);
      rings[ring][tone] += `M${x - 6},${y + 16}Q${x - 7},${y - 2} ${x},${y - 3}Q${x + 7},${y - 2} ${x + 6},${y + 16}ZM${x + 4.6},${y - 9}a4.6,4.6 0 1,1 -9.2,0a4.6,4.6 0 1,1 9.2,0Z`;
    }
  }
  return rings;
})();

const Crowd: React.FC<{ scale: number; reveal: number }> = ({ scale, reveal }) => (
  <g transform={`translate(540 960) scale(${scale}) translate(-540 -900)`}>
    {CROWD.map((tones, i) => {
      const o = Math.max(0, Math.min(1, reveal * CROWD_RINGS - i));
      return o > 0 ? (
        <g key={i} opacity={o}>
          {tones.map((d, k) => (d ? <path key={k} d={d} fill={CROWD_TONES[k]} /> : null))}
        </g>
      ) : null;
    })}
    <path d="M534,916Q533,898 540,897Q547,898 546,916ZM544.6,891a4.6,4.6 0 1,1 -9.2,0a4.6,4.6 0 1,1 9.2,0Z" fill="#fff" />
  </g>
);

const CrowdBackdrop = () => (
  <>
    <rect width={1080} height={1920} fill="#07070a" />
    <ellipse cx={540} cy={1000} rx={760} ry={1000} fill="#39343a" opacity={0.5} style={{ filter: "blur(90px)" }} />
  </>
);

// Kept sober and without the stick figure: this beat is the victims', not a joke.
const N1Number = () => {
  const t = useT();
  const pull = prog(t, 0.9, 4.6, Easing.inOut(Easing.cubic));
  const scale = 16 * Math.pow(1 / 16, pull);
  const hit = prog(t, 4.6, 4.9, Easing.out(Easing.cubic));
  const n = Math.round(6000000 * prog(t, 1.55, 4.6, Easing.in(Easing.cubic)));
  return (
    <>
      <Stage>
        <CrowdBackdrop />
        <Crowd scale={scale} reveal={lerp(0.02, 1, Math.pow(pull, 1.5))} />
      </Stage>
      {t >= 1.55 ? (
        <AbsoluteFill style={{ alignItems: "center", paddingTop: 300 }}>
          <div style={{ fontFamily: "Anton", fontSize: 176, color: n >= 6000000 ? GOLD : "#fff", fontVariantNumeric: "tabular-nums", letterSpacing: 2, scale: String(lerp(1.16, 1, hit)), textShadow: "0 6px 0 rgba(0,0,0,.6), 0 0 54px rgba(0,0,0,.95)" }}>
            {n.toLocaleString("en-US")}
          </div>
        </AbsoluteFill>
      ) : null}
    </>
  );
};

const N1Fair = () => {
  const t = useT();
  const talk = talkAt(W1N, t + 13.42);
  return (
    <>
      <Stage>
        <Void t={t} tint="#5c1016" seed="nf" />
        <Character look="eli" pose={posed(t, [[0, IDLE], [0.4, ANGRY], [2.9, ANGRY], [3.4, HEAD_DOWN]])} x={320} t={t} scale={1.0} />
        <Character look="guide" pose={posed(t, [[0, IDLE], [1.3, OPEN_HANDS]])} x={760} t={t} talk={talk} scale={1.0} seed={3} />
      </Stage>
      {t < 2.89 ? (
        <Headline lines={[["It isn't fair", CRIMSON]]} at={0.15} size={134} top={300} />
      ) : (
        <Headline lines={["Grace", ["isn't fair", GOLD]]} at={2.89} size={160} top={270} />
      )}
    </>
  );
};

const NOT_LINES: [number, string, string][] = [
  [6.63, "Not Hitler", "#fff"],
  [7.55, "Not his victims", "#fff"],
  [8.87, "Not you", "#fff"],
  [9.78, "Not me", GOLD],
];

const N1Nobody = () => {
  const t = useT();
  const closed = prog(t, 5.31, 5.6);
  const jolt = closed > 0 && closed < 1 ? Math.sin(t * 60) * 6 : 0;
  const walk = 1 - prog(t, 3.6, 4.0);
  const victims = t >= 7.55 && t < 8.87;
  return (
    <>
      <Stage>
        {victims ? (
          <>
            <CrowdBackdrop />
            <Crowd scale={lerp(1.5, 1.35, prog(t, 7.55, 8.87))} reveal={1} />
          </>
        ) : (
          <>
            <Hill t={t + 4} rise={0.4} cross={0} />
            <ScaledGate closed={closed} jolt={jolt} />
            <Character look="hitler" pose={walking(HEAD_DOWN, t, walk)} x={lerp(-100, 190, prog(t, 0, 3.8))} t={t} scale={0.72} />
            <Character look="eli" pose={walking(posed(t, [[0, IDLE], [5.9, IDLE], [6.5, SHRUG]]), t, walk)} x={lerp(1180, 900, prog(t, 0, 3.8))} t={t} scale={0.72} flip />
          </>
        )}
      </Stage>
      {t < 6.55 ? <Headline lines={["Fair means", ["you get what", GOLD], ["you earned", GOLD]]} at={0.15} size={112} top={270} /> : null}
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 262 }}>
        {NOT_LINES.map(([at, text, color]) => {
          const p = prog(t, at, at + 0.15);
          return t >= at ? (
            <div key={text} style={{ fontFamily: "Anton", fontSize: 92, lineHeight: 1.12, color, textTransform: "uppercase", opacity: p, scale: String(lerp(1.3, 1, p)), textShadow: "0 6px 0 rgba(0,0,0,.55), 0 0 44px rgba(0,0,0,.75)" }}>
              {text}
            </div>
          ) : null;
        })}
      </AbsoluteFill>
    </>
  );
};

const N1Forgiven = () => {
  const t = useT();
  const open = prog(t, 6.3, 6.8);
  const cross = prog(t, 3.6, 3.95);
  return (
    <>
      <Stage>
        <Hill t={t + 8} rise={lerp(0.4, 1, open)} cross={0} />
        <ScaledGate closed={1 - open} />
        <Character look="eli" pose={posed(t, [[0, HEAD_DOWN], [6.3, HEAD_DOWN], [6.8, { ...LOOK_UP, smile: 1 }]])} x={830} t={t} scale={0.78} flip />
      </Stage>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 280 }}>
        {t >= 2.55 ? (
          <div style={{ position: "relative", fontFamily: "Anton", fontSize: 130, color: "#fff", textTransform: "uppercase", lineHeight: 1.1, textShadow: "0 6px 0 rgba(0,0,0,.55)", opacity: lerp(1, 0.55, open) }}>
            Good enough
            <div style={{ position: "absolute", left: -10, top: "52%", height: 12, background: CRIMSON, width: `${cross * 104}%` }} />
          </div>
        ) : null}
        {t >= 6.3 ? <div style={{ fontFamily: "Anton", fontSize: 150, color: GOLD, textTransform: "uppercase", lineHeight: 1.1, opacity: open, scale: String(lerp(1.3, 1, open)), textShadow: "0 6px 0 rgba(0,0,0,.55)" }}>Forgiven</div> : null}
      </AbsoluteFill>
    </>
  );
};

const N1Paul = () => {
  const t = useT();
  const fall = prog(t, 5.69, 6.3);
  const x = lerp(170, 480, prog(t, 0, 2.4));
  const pose = walking(posed(t, [[0, { ...IDLE, rs: -120, re: -40, brow: 1 }], [5.69, { ...IDLE, rs: -120, re: -40, brow: 1 }], [6.3, WRITE]]), t, 1 - prog(t, 2.2, 2.6), 2.4);
  return (
    <>
      <Stage>
        <Ruins t={t} glow={0.5} />
        {fall > 0 ? <path d={`M400,0 L580,0 L${780},${GROUND + 60} L${180},${GROUND + 60} Z`} fill={GOLD} opacity={0.26 * fall} /> : null}
        <Character look="paul" pose={pose} x={x} t={t} scale={1.1} rim={fall > 0.5 ? GOLD : undefined} />
      </Stage>
      {t >= 2.41 && t < 3.92 ? <Headline lines={["He hunted", ["Christians", CRIMSON]]} at={2.41} size={130} top={290} /> : null}
      {t >= 3.92 ? (
        <>
          <Headline lines={["He voted for", ["their deaths", CRIMSON]]} at={3.92} size={116} top={280} />
          <AbsoluteFill style={{ alignItems: "center", paddingTop: 556 }}>
            <div style={{ fontFamily: "Inter", fontWeight: 800, fontSize: 38, color: GOLD, letterSpacing: 2, opacity: prog(t, 4.1, 4.4), textShadow: "0 2px 10px rgba(0,0,0,.9)" }}>ACTS 26:10</div>
          </AbsoluteFill>
        </>
      ) : null}
    </>
  );
};

const N1Verse = () => {
  const t = useT();
  return (
    <>
      <Stage>
        <Void t={t} tint="#6a4a12" seed="nv" />
        <Character look="paul" pose={WRITE} x={540} t={t} scale={1.1} rim={GOLD} />
      </Stage>
      <Verse text="“Christ Jesus came into the world to save sinners, of whom I am the foremost.”" cite="1 TIMOTHY 1:15, ESV" at={0.1} top={250} />
    </>
  );
};

const N1Yes = () => {
  const t = useT();
  const rise = prog(t, 0, 1.3);
  return (
    <>
      <Stage>
        <Hill t={t} rise={rise} cross={rise} />
        <Character look="hitler" pose={posed(t, [[0, HEAD_DOWN], [1.3, LOOK_UP]])} x={800} t={t} scale={0.72} />
      </Stage>
      {t < 3.22 ? (
        <Headline lines={["The cross is", ["big enough", GOLD]]} at={0.9} size={118} top={270} />
      ) : (
        <Headline lines={["Forgivable", ["≠", CRIMSON], ["Forgiven", GOLD]]} at={3.22} size={112} top={250} />
      )}
    </>
  );
};

const N1Taken = () => {
  const t = useT();
  return (
    <>
      <Stage>
        <Void t={t} tint="#26324f" seed="nt" />
        <Gift x={720} y={GROUND - 70} s={0.9} />
        <Character look="hitler" pose={posed(t, [[0, IDLE], [2.23, IDLE], [2.8, HEAD_DOWN]])} x={340} t={t} scale={0.9} rim="#ff8a3d" />
      </Stage>
      {t < 2.23 ? (
        <Headline lines={["It has to", ["be taken", GOLD]]} at={0.15} size={140} top={280} />
      ) : (
        <Headline lines={["Did he", ["take it?", CRIMSON]]} at={2.23} size={150} top={280} />
      )}
    </>
  );
};

const N1Wrote = () => {
  const t = useT();
  return (
    <>
      <Stage>
        <Void t={t} tint="#3b220c" seed="nw" />
        <Desk x={460} t={t} />
        <Character look="hitler" pose={{ ...IDLE, rs: -34, re: -46, ls: 8, le: -12, head: 10 + Math.sin(t * 5) * 1.5, torso: 6 }} x={400} t={t} rim="#ffb45e" scale={0.92} />
      </Stage>
      {t >= 1.32 ? <Headline lines={["He wrote", ["it down", GOLD]]} at={1.32} size={150} top={280} /> : null}
    </>
  );
};

export const Part1: React.FC = () => (
  <Shell audio="part1-mix.mp3" w={W1N} part={1} end={60.95} logo noPad>
    <Scene from={0} to={4.85} cut shots={[[0, 1], [1.28, 1.4, 0.3, 0.47], [3.35, 1]]}><N1Hook /></Scene>
    <Scene from={4.85} to={7.85} enter="whip" shots={[[0, 1], [1.02, 1.28, 0.5, 0.5], [1.72, 1.08, 0.5, 0.55]]} shakes={[[1.02, 22]]}><N1No /></Scene>
    <Scene from={7.85} to={13.42} cut push={0} shakes={[[4.6, 26]]}><N1Number /></Scene>
    <Scene from={13.42} to={18.2} enter="flash" shots={[[0, 1.38, 0.3, 0.56], [1.34, 1.38, 0.7, 0.56], [2.89, 1]]}><N1Fair /></Scene>
    <Scene from={18.2} to={28.88} enter="whip" shots={[[0, 1], [1.71, 1.22, 0.5, 0.58], [3.59, 1], [5.31, 1.18, 0.5, 0.56], [6.63, 1.55, 0.18, 0.56], [7.55, 1], [8.87, 1.55, 0.83, 0.56], [9.78, 1]]} shakes={[[5.31, 24], [9.78, 18]]}><N1Nobody /></Scene>
    <Scene from={28.88} to={36.0} cut push={0.03} shots={[[0, 1], [3.9, 1.16, 0.5, 0.56], [6.3, 1]]}><N1Forgiven /></Scene>
    <Scene from={36.0} to={42.95} enter="whip" shots={[[0, 1], [2.41, 1.4, 0.45, 0.56], [3.92, 1.55, 0.45, 0.46], [5.69, 1, 0.45, 0.5]]} shakes={[[3.92, 18]]}><N1Paul /></Scene>
    <Scene from={42.95} to={48.58} cut push={0.14}><N1Verse /></Scene>
    <Scene from={48.58} to={54.85} enter="flash" shots={[[0, 1], [2.36, 1.3, 0.74, 0.46], [3.22, 1]]}><N1Yes /></Scene>
    <Scene from={54.85} to={58.38} enter="whip" shots={[[0, 1], [2.23, 1.3, 0.31, 0.44]]}><N1Taken /></Scene>
    <Scene from={58.38} to={60.95} cut shots={[[0, 1], [1.32, 1.3, 0.4, 0.4]]}><N1Wrote /></Scene>
    <Sequence from={Math.round(60.95 * FPS)}><EndCard logo title="Part 2: his final words" sub="Follow so you don't miss it" /></Sequence>
  </Shell>
);

/* ---------- PART 2, short remake: fewer, longer shots so each line can land ---------- */

const W2N = words(part2V3);

const WRITING = { ...IDLE, rs: -34, re: -46, ls: 8, le: -12, torso: 6 };

const Q2Hook = () => {
  const t = useT();
  return (
    <>
      <Stage>
        <Void t={t} tint="#3b220c" seed="q2d" />
        <Desk x={460} t={t} />
        <Character look="hitler" pose={{ ...WRITING, head: 10 + Math.sin(t * 5) * 1.5 }} x={400} t={t} rim="#ffb45e" scale={1.0} />
      </Stage>
      {t >= 1.66 ? <Headline kinetic lines={["His", ["final words", GOLD]]} at={1.66} size={160} top={300} /> : null}
    </>
  );
};

const Q2Berlin = () => {
  const t = useT();
  const s = prog(t, 0.1, 0.45);
  const blast = (at: number) => Math.max(0, 1 - Math.abs(t - at - 0.12) / 0.35);
  return (
    <>
      <Stage>
        <Ruins t={t} glow={1 + blast(3.0) + blast(4.2)} />
        <rect width={1080} height={1920} fill="#ff7a2a" opacity={0.22 * (blast(3.0) + blast(4.2))} />
        <Character look="hitler" pose={HEAD_DOWN} x={760} t={t} scale={0.55} rim="#ff8a3d" ground={GROUND - 6} />
      </Stage>
      <Headline kinetic lines={["April 29", [String(Math.round(lerp(1939, 1945, prog(t, 0.15, 1.1, Easing.out(Easing.cubic))))), GOLD]]} size={190 * lerp(0.9, 1, s)} top={290} />
      {t >= 3.0 ? (
        <AbsoluteFill style={{ alignItems: "center", paddingTop: 720 }}>
          <div style={{ fontFamily: "Inter", fontWeight: 800, fontSize: 54, letterSpacing: 10, color: "#fff", opacity: prog(t, 3.0, 3.3), textShadow: "0 3px 16px rgba(0,0,0,.95)" }}>BERLIN IS FALLING</div>
        </AbsoluteFill>
      ) : null}
    </>
  );
};

const Q2Paper = () => {
  const t = useT();
  return (
    <>
      <Stage><Void t={t} tint="#3b1a0a" seed="q2p" /></Stage>
      <Testament t={t} at1={0.16} at2={1.58} />
      <ImpactRing t={t} at={0.5} y={560} />
      <ImpactRing t={t} at={1.92} y={680} />
    </>
  );
};

const Q2Blame = () => {
  const t = useT();
  const point = { ...IDLE, rs: -50, re: -8, ls: 10, brow: 1, head: -3, torso: -3 };
  return (
    <>
      <Stage>
        <Ruins t={t + 6} glow={0.6} />
        <Character look="hitler" pose={posed(t, [[0, IDLE], [0.35, point]])} x={360} t={t} scale={1.0} rim={CRIMSON} />
      </Stage>
      <Headline kinetic lines={["He blamed", ["everyone else", CRIMSON]]} at={0.15} size={128} top={290} />
    </>
  );
};

// No stick figure here: his words about the Jewish people are not played for laughs.
const TypedPage: React.FC<{ t: number; mark: number }> = ({ t, mark }) => (
  <AbsoluteFill style={{ alignItems: "center", paddingTop: 640 }}>
    <div style={{ background: "#e6dcc0", padding: "54px 56px", width: 820, rotate: "1deg", boxShadow: "0 30px 90px rgba(0,0,0,.85)", display: "flex", flexDirection: "column", gap: 26, opacity: 0.92 }}>
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} style={{ position: "relative", height: 18, width: `${[96, 88, 93, 70, 91, 97, 84, 90, 62][i]}%`, background: "#5d5241", opacity: 0.55, borderRadius: 4 }}>
          {i === 5 ? <div style={{ position: "absolute", left: 0, top: -6, height: 30, background: CRIMSON, opacity: 0.9, borderRadius: 4, width: `${mark * 100}%` }} /> : null}
        </div>
      ))}
    </div>
  </AbsoluteFill>
);

const Q2Mercy = () => {
  const t = useT();
  return (
    <>
      <Stage>
        <rect width={1080} height={1920} fill="#08060a" />
        <ellipse cx={540} cy={1000} rx={700} ry={900} fill="#3a0d12" opacity={0.6} style={{ filter: "blur(90px)" }} />
      </Stage>
      <TypedPage t={t} mark={prog(t, 1.1, 2.6)} />
      {t >= 3.52 ? <Headline kinetic lines={[["Without mercy", CRIMSON]]} at={3.52} size={150} top={300} /> : null}
      {/* The pause after this line: the picture sinks to black before "Jesus said". */}
      <AbsoluteFill style={{ background: "#000", opacity: prog(t, 5.3, 7.8) }} />
    </>
  );
};

const Q2Jesus = () => {
  const t = useT();
  return (
    <>
      <Stage>
        <Void t={t} tint="#6a4a12" seed="q2j" />
      </Stage>
      <Verse text="“Unless you repent, you will all likewise perish.”" cite="JESUS · LUKE 13:3" at={0.05} top={520} />
      <AbsoluteFill style={{ background: "#000", opacity: 1 - prog(t, 0, 1.0) }} />
    </>
  );
};

const Q2Door = () => {
  const t = useT();
  const open = prog(t, 0.1, 1.3);
  return (
    <>
      <Stage>
        <Hill t={t} rise={0.15} cross={0} />
        <rect width={1080} height={1920} fill="#120808" opacity={0.48} />
        <Door x={700} open={open} />
        <Character look="hitler" pose={HEAD_DOWN} x={290} t={t} rim="#ff8a3d" scale={0.9} />
      </Stage>
      <Headline kinetic lines={["Offered", ["to everyone", GOLD]]} at={0.2} size={124} top={280} />
      {t >= 2.29 ? (
        <AbsoluteFill style={{ alignItems: "center", paddingTop: 560 }}>
          <div style={{ fontFamily: "Anton", fontSize: 110, color: "#fff", textTransform: "uppercase", opacity: prog(t, 2.29, 2.5), textShadow: "0 6px 0 rgba(0,0,0,.55), 0 0 44px rgba(0,0,0,.75)" }}>Never forced</div>
        </AbsoluteFill>
      ) : null}
    </>
  );
};

const Q2Hour = () => {
  const t = useT();
  return (
    <>
      <Stage>
        <Void t={t} tint="#21304e" seed="q2h" />
        <Hourglass x={540} y={860} p={prog(t, 0, 4.3)} s={1.25} />
      </Stage>
      {t < 2.79 ? (
        <Headline kinetic lines={["His final", ["hour", GOLD]]} at={0.1} size={140} top={260} />
      ) : (
        <Headline kinetic lines={["Only", ["God knows", GOLD]]} at={2.79} size={140} top={260} />
      )}
    </>
  );
};

const Q2Evidence = () => {
  const t = useT();
  return (
    <>
      <Stage><Void t={t} tint="#3b1a0a" seed="q2e" /></Stage>
      <Testament t={t} at1={-1} at2={-1} />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 900 }}>
        <div style={{ fontFamily: "Anton", fontSize: 104, color: "#fff", textTransform: "uppercase", textAlign: "center", lineHeight: 1.1, opacity: prog(t, 0.8, 1.1), textShadow: "0 6px 0 rgba(0,0,0,.55), 0 0 44px rgba(0,0,0,.85)" }}>
          The evidence
          <div style={{ color: CRIMSON }}>points one way</div>
        </div>
      </AbsoluteFill>
    </>
  );
};

const ImpactRing: React.FC<{ t: number; at: number; y: number }> = ({ t, at, y }) => {
  const p = prog(t, at, at + 0.7, Easing.out(Easing.cubic));
  if (p <= 0 || p >= 1) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width={1080} height={1920}>
        <circle cx={540} cy={y} r={lerp(40, 620, p)} fill="none" stroke={CRIMSON} strokeWidth={lerp(26, 2, p)} opacity={1 - p} />
        <circle cx={540} cy={y} r={lerp(20, 380, p)} fill="none" stroke="#ffd2d2" strokeWidth={lerp(10, 1, p)} opacity={(1 - p) * 0.6} />
      </svg>
    </AbsoluteFill>
  );
};

const Q2NoRepent = () => {
  const t = useT();
  return (
    <>
      <Stage>
        <Void t={t} tint="#4a0d14" seed="q2n" />
        <Character look="hitler" pose={HEAD_DOWN} x={540} t={t} rim={CRIMSON} scale={1.05} />
      </Stage>
      <Headline kinetic lines={["If Hitler", ["didn't repent…", CRIMSON]]} at={0.35} size={124} top={280} />
    </>
  );
};

const Q2Grace = () => {
  const t = useT();
  return (
    <>
      <Stage>
        <Void t={t} tint="#6a4a12" seed="q2g" />
        <g opacity={0.35} transform={`rotate(${t * 8} 540 1060)`}>
          {Array.from({ length: 12 }).map((_, i) => (
            <path key={i} transform={`rotate(${i * 30} 540 1060)`} d="M540,1060 L505,-300 L575,-300 Z" fill="#fff0c0" />
          ))}
        </g>
        <Gift x={540} y={GROUND - 200 - Math.sin(t * 3) * 8} s={lerp(0.8, 1.05, prog(t, 0, 0.6, Easing.out(Easing.back(1.6))))} />
      </Stage>
      <Headline kinetic lines={["But grace", ["is free", GOLD]]} at={0.3} size={150} top={280} />
    </>
  );
};

const Q2Gate = () => {
  const t = useT();
  return (
    <>
      <Stage>
        <Hill t={t + 2} rise={lerp(0.4, 0.6, Math.sin(t * 2.4) * 0.5 + 0.5)} cross={0} />
        <ScaledGate closed={0.55} />
        <Character look="hitler" pose={posed(t, [[0, IDLE], [0.6, LOOK_UP]])} x={300} t={t} scale={0.85} />
      </Stage>
      <Headline kinetic lines={["Does Hitler get", ["to go to heaven?", GOLD]]} at={0.05} size={112} top={270} />
    </>
  );
};

const Q2Part3 = () => {
  const t = useT();
  const p = prog(t, 0.05, 0.6, Easing.out(Easing.back(1.4)));
  const line = prog(t, 0.35, 0.9, Easing.out(Easing.cubic));
  return (
    <>
      <Stage>
        <rect width={1080} height={1920} fill="#07050a" />
        <g opacity={0.22} transform={`rotate(${t * 10} 540 900)`}>
          {Array.from({ length: 14 }).map((_, i) => (
            <path key={i} transform={`rotate(${i * (360 / 14)} 540 900)`} d="M540,900 L500,-500 L580,-500 Z" fill={GOLD} />
          ))}
        </g>
        <circle cx={540} cy={900} r={lerp(120, 260, p)} fill={GOLD} opacity={0.18} style={{ filter: "blur(60px)" }} />
      </Stage>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingBottom: 220 }}>
        <div style={{ fontFamily: "Inter", fontWeight: 800, fontSize: 44, letterSpacing: 12, color: "#fff", opacity: prog(t, 0, 0.3) }}>FIND OUT IN</div>
        <div style={{ fontFamily: "Anton", fontSize: 260, color: GOLD, lineHeight: 1.05, scale: String(lerp(1.6, 1, p)), opacity: Math.min(1, p * 1.5), textShadow: `0 0 60px ${GOLD}88, 0 8px 0 rgba(0,0,0,.6)` }}>PART 3</div>
        <div style={{ height: 8, width: lerp(0, 640, line), background: GOLD, borderRadius: 4, boxShadow: `0 0 24px ${GOLD}` }} />
        <div style={{ fontFamily: "Inter", fontWeight: 800, fontSize: 46, color: "#fff", marginTop: 28, letterSpacing: 2, opacity: prog(t, 0.6, 0.9), textTransform: "uppercase" }}>How grace really works</div>
      </AbsoluteFill>
    </>
  );
};

const Part2Body = () => (
  <>
    <Scene from={0} to={4.2} cut push={0.06} shots={[[0, 1], [1.66, 1.2, 0.42, 0.44]]}><Q2Hook /></Scene>
    <Scene from={4.2} to={9.5} enter="whip" push={0.05} shakes={[[3.0, 16], [4.2, 22]]}><Q2Berlin /></Scene>
    <Scene from={9.5} to={12.8} cut push={0.08} shakes={[[0.16, 10], [1.58, 14]]}><Q2Paper /></Scene>
    <Scene from={12.8} to={14.69} cut push={0.06}><Q2Blame /></Scene>
    <Scene from={14.69} to={22.58} cut push={0.1}><Q2Mercy /></Scene>
    <Scene from={22.58} to={26.6} cut push={0.05}><Q2Jesus /></Scene>
    <Scene from={26.6} to={31.1} enter="flash" push={0.05}><Q2Door /></Scene>
    <Scene from={31.1} to={35.4} cut push={0.06}><Q2Hour /></Scene>
    <Scene from={35.4} to={37.97} cut push={0.08}><Q2Evidence /></Scene>
    <Scene from={37.97} to={40.6} cut push={0.07}><Q2NoRepent /></Scene>
    <Scene from={40.6} to={42.38} cut push={0.06}><Q2Grace /></Scene>
    <Scene from={42.38} to={45.05} cut push={0.08}><Q2Gate /></Scene>
    <Scene from={45.05} to={47.0} enter="flash" push={0.04}><Q2Part3 /></Scene>
    <Sequence from={Math.round(47.0 * FPS)}><EndCard logo title="Part 3: How grace really works" sub="Follow so you don't miss it" /></Sequence>
  </>
);

export const Part2V2: React.FC = () => (
  <Shell audio="part2-mix.mp3" w={W2N} part={2} end={47.0} logo noPad>
    <Part2Body />
  </Shell>
);

/* Part 2 with a recap of Part 1's question in front, so it plays as a continuation. */

const W2F = words(part2V4);
const RECAP = 9.58;

const Q2Recap = () => {
  const t = useT();
  return (
    <>
      <AbsoluteFill style={{ filter: `sepia(0.45) saturate(0.75) contrast(1.05) drop-shadow(${8 * (1 - prog(t, 0, 0.5))}px 0 0 rgba(255,40,40,.55)) drop-shadow(${-8 * (1 - prog(t, 0, 0.5))}px 0 0 rgba(40,190,255,.55))`, translate: `${Math.sin(t * 90) * 14 * (1 - prog(t, 0, 0.5))}px 0px` }}>
        <N1Hook />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "repeating-linear-gradient(0deg, rgba(0,0,0,.16) 0px, rgba(0,0,0,.16) 2px, transparent 2px, transparent 6px)", pointerEvents: "none" }} />
      <AbsoluteFill style={{ paddingTop: 172, paddingLeft: 66 }}>
        <div style={{ alignSelf: "flex-start", fontFamily: "Inter", fontWeight: 800, fontSize: 32, color: "#fff", background: "rgba(0,0,0,.6)", border: "2px solid rgba(255,255,255,.7)", height: 54, lineHeight: "50px", padding: "0 20px", borderRadius: 27, opacity: prog(t, 0.1, 0.4) }}>
          ◀◀ PART 1
        </div>
      </AbsoluteFill>
    </>
  );
};

const Q2DidHe = () => {
  const t = useT();
  return (
    <>
      <Stage>
        <Void t={t} tint="#5c1016" seed="q2dh" />
      </Stage>
      {t < 0.97 ? (
        <Headline kinetic lines={["So…"]} at={0.06} size={200} top={560} />
      ) : (
        <Headline kinetic lines={["Did he", ["repent?", CRIMSON]]} at={0.97} size={190} top={480} />
      )}
    </>
  );
};

const Grain = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "overlay", opacity: 0.16 }}>
      <svg width={1080} height={1920}>
        <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={f % 60} /><feColorMatrix type="saturate" values="0" /></filter>
        <rect width={1080} height={1920} filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};

const CutSweeps: React.FC<{ at: number[] }> = ({ at }) => {
  const t = useT();
  const c = at.find((x) => t >= x && t < x + 0.4);
  if (c === undefined) return null;
  const p = prog(t, c, c + 0.4, Easing.out(Easing.cubic));
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
      <div style={{ position: "absolute", top: -400, left: `${lerp(-60, 130, p)}%`, width: 260, height: 2800, rotate: "18deg", background: "linear-gradient(90deg, transparent, rgba(255,226,160,.55), transparent)", opacity: 1 - p }} />
    </AbsoluteFill>
  );
};

const P2_CUTS = [7.15, ...[4.2, 9.5, 12.8, 14.69, 26.6, 31.1, 35.4, 37.97, 40.6, 42.38, 45.05].map((x) => x + 9.58)];

export const Part2V3: React.FC = () => (
  <Shell audio="part2-full.wav" w={W2F} part={2} end={RECAP + 47.0} logo noPad>
    <Scene from={0} to={7.15} enter="whip" shots={[[0, 1], [1.97, 1.2, 0.3, 0.47], [5.32, 1]]}><Q2Recap /></Scene>
    <Scene from={7.15} to={RECAP} cut push={0.1}><Q2DidHe /></Scene>
    <Sequence from={Math.round(RECAP * FPS)}>
      <Part2Body />
    </Sequence>
    <CutSweeps at={P2_CUTS} />
    <Grain />
  </Shell>
);

/* ---------- PART 3, short remake: same pacing rules as the new Part 2 ---------- */

const W3N = words(part3V2);

const R3Hook = () => {
  const t = useT();
  return (
    <>
      <Stage>
        <Library t={t} />
        <Character look="eli" pose={posed(t, [[0, ARMS_CROSSED], [1.9, ARMS_CROSSED], [2.8, HEAD_DOWN]])} x={lerp(540, 320, prog(t, 2.0, 2.6))} t={t} scale={1.05} />
        {t >= 2.4 ? <Character look="hitler" pose={HEAD_DOWN} x={lerp(1240, 780, prog(t, 2.4, 3.2))} t={t} scale={0.82} /> : null}
      </Stage>
      {t < 1.9 ? (
        <Headline kinetic lines={["Nobody wants", ["to hear this", CRIMSON]]} at={0.1} size={128} top={290} />
      ) : (
        <Headline kinetic lines={["You need the", "same grace", ["Hitler needed", GOLD]]} at={1.9} size={112} top={270} />
      )}
    </>
  );
};

const R3Question = () => {
  const t = useT();
  return (
    <>
      <Stage>
        <Void t={t} tint="#21304e" seed="r3q" />
        <Character look="eli" pose={posed(t, [[0, HEAD_DOWN], [0.5, SHRUG]])} x={540} t={t} scale={1.15} />
      </Stage>
      <Headline kinetic lines={["What is", ["grace?", GOLD]]} at={0.05} size={170} top={290} />
    </>
  );
};

const R3Broke = () => {
  const t = useT();
  const pose = posed(t, [[0, IDLE], [0.45, REACH], [0.85, REACH], [1.2, SHRUG], [3.4, SHRUG], [4.0, HEAD_DOWN]]);
  return (
    <>
      <Stage>
        <Void t={t} tint="#3a0a12" seed="r3b" />
        {t > 2.5 ? <Bill t={t} at={2.5} y={545} s={0.82} /> : null}
        <Vase x={700} t={t} at={0.9} />
        <Character look="eli" pose={pose} x={lerp(300, 330, prog(t, 0, 0.7))} t={t} scale={0.92} />
      </Stage>
      <ImpactRing t={t} at={0.95} y={1150} />
      {t < 2.4 ? <Headline kinetic lines={["You broke", ["something huge", CRIMSON]]} at={0.95} size={118} top={280} /> : null}
    </>
  );
};

const R3Pays: React.FC<{ w?: Word[]; off?: number }> = ({ w = W3N, off = 12.05 }) => {
  const t = useT();
  const arrive = prog(t, 0, 1.6);
  const talk = talkAt(w, t + off);
  const guide = walking(posed(t, [[0, IDLE], [1.6, IDLE], [2.1, OPEN_HANDS], [2.9, OPEN_HANDS], [3.2, { ...IDLE, ls: 118, le: 10, rs: -14, smile: 0.6 }], [4.4, OPEN_HANDS]]), t, 1 - prog(t, 1.4, 1.8));
  const eli = posed(t, [[0, HEAD_DOWN], [1.9, HEAD_DOWN], [2.4, LOOK_UP], [4.0, { ...OPEN_HANDS, smile: 0.8 }]]);
  return (
    <>
      <Stage>
        <Void t={t} tint={t > 3.14 ? "#3b5b34" : "#3a0a12"} seed="r3p" />
        <Bill t={t} at={-1} stamp={3.14} y={545} s={0.82} />
        <Character look="eli" pose={eli} x={290} t={t} scale={0.92} />
        <Character look="guide" pose={guide} x={lerp(1240, 760, arrive)} t={t} talk={talk} scale={0.92} seed={3} rim={GOLD} />
      </Stage>
      <ImpactRing t={t} at={3.14} y={700} />
      {t >= 2.04 ? <Headline kinetic lines={["“I'll pay for it”"]} at={2.04} size={88} top={250} /> : null}
    </>
  );
};

const R3Cross = () => {
  const t = useT();
  const rise = prog(t, 1.5, 3.4);
  return (
    <>
      <Stage>
        <Hill t={t} rise={rise} cross={prog(t, 2.2, 3.6)} />
        <Character look="eli" pose={posed(t, [[0, HEAD_DOWN], [2.5, LOOK_UP]])} x={540} t={t} scale={0.9} rim="#ffd98a" />
      </Stage>
      {t < 1.54 ? <Headline kinetic lines={["That's", ["grace", GOLD]]} at={0.05} size={170} top={280} /> : null}
      {t >= 1.54 && t < 2.46 ? <Headline kinetic lines={[["We broke it", CRIMSON]]} at={1.54} size={132} top={290} /> : null}
      {t >= 2.46 ? <Headline kinetic lines={["Jesus", ["paid for it", GOLD]]} at={2.46} size={124} top={270} /> : null}
    </>
  );
};

const R3Gift = () => {
  const t = useT();
  const take = prog(t, 4.75, 5.4);
  const eli = walking(posed(t, [[0, ARMS_CROSSED], [2.2, ARMS_CROSSED], [2.7, IDLE], [3.5, IDLE], [3.9, { ...OPEN_HANDS, smile: 1 }]]), t, prog(t, 2.3, 2.5) * (1 - prog(t, 3.4, 3.7)));
  const eliX = lerp(250, 400, prog(t, 2.35, 3.6));
  const giftX = lerp(590, 455, take);
  return (
    <>
      <Stage>
        <Void t={t} tint="#6a4a12" seed="r3g" />
        <Character look="guide" pose={posed(t, [[0, OPEN_HANDS]])} x={790} t={t} scale={0.96} seed={3} rim={GOLD} />
        <Character look="eli" pose={eli} x={eliX} t={t} scale={0.96} />
        <Gift x={giftX} y={GROUND - 310 - Math.sin(t * 3) * 8} s={0.72} />
      </Stage>
      {t < 0.93 ? <Headline kinetic lines={["You can't", ["earn it", CRIMSON]]} at={0.05} size={140} top={280} /> : null}
      {t >= 0.93 && t < 3.58 ? <Headline kinetic lines={["It's", ["a gift", GOLD]]} at={0.93} size={160} top={280} /> : null}
      {t >= 3.58 ? <Headline kinetic lines={["Open your hands", ["and take it", GOLD]]} at={3.58} size={108} top={280} /> : null}
    </>
  );
};

const R3Refuse = () => {
  const t = useT();
  const away = prog(t, 4.4, 6.3);
  return (
    <>
      <Stage>
        <Void t={t} tint="#26324f" seed="r3r" />
        <Gift x={740} y={GROUND - 70} s={0.9} glow={lerp(1, 0.55, away)} />
        <Character look="hitler" pose={walking(HEAD_DOWN, t, away > 0 && away < 1 ? 1 : 0)} x={lerp(560, -220, away)} t={t} rim="#ff8a3d" scale={1.0} />
      </Stage>
      {t < 1.8 ? <Headline kinetic lines={["God never", ["forces it", GOLD]]} at={0.05} size={140} top={280} /> : null}
      {t >= 1.8 && t < 4.21 ? <Headline kinetic lines={["That's", ["Hitler's story", CRIMSON]]} at={1.8} size={130} top={280} /> : null}
      {t >= 4.21 ? <Headline kinetic lines={["The gift can", ["be refused", CRIMSON]]} at={4.21} size={124} top={280} /> : null}
    </>
  );
};

const R3Held = () => {
  const t = useT();
  return (
    <>
      <Stage>
        <Void t={t} tint="#6a4a12" seed="r3h" />
        <Character look="guide" pose={OPEN_HANDS} x={540} t={t} scale={1.0} seed={3} rim={GOLD} />
        <Gift x={540} y={GROUND - 250 - Math.sin(t * 3) * 8} s={0.95} />
      </Stage>
      <Headline kinetic lines={["Held out", ["to you", GOLD]]} at={0.9} size={150} top={280} />
    </>
  );
};

const R3Prayer = () => {
  const t = useT();
  const pose = posed(t, [[0, IDLE], [0.6, HEAD_DOWN], [4.0, HEAD_DOWN], [4.5, LOOK_UP], [5.6, LOOK_UP], [6.2, { ...OPEN_HANDS, smile: 1, head: -6 }]]);
  const rise = prog(t, 0.5, 6.4);
  return (
    <>
      <Stage>
        <Hill t={t} rise={rise} cross={rise} />
        <rect width={1080} height={1920} fill="#0c0508" opacity={lerp(0.55, 0, rise)} />
        <Character look="eli" pose={pose} x={540} t={t} scale={0.95} rim={rise > 0.5 ? "#ffd98a" : undefined} />
      </Stage>
      {t < 0.85 ? <Headline kinetic lines={["Tell", ["Him", GOLD]]} at={0.05} size={170} top={280} /> : null}
      {t >= 0.85 && t < 4.09 ? <Headline kinetic lines={["“I'm sorry.", ["I can't pay.”", CRIMSON]]} at={0.85} size={118} top={280} /> : null}
      {t >= 4.09 && t < 5.75 ? <Headline kinetic lines={["“Thank you", ["for paying”", GOLD]]} at={4.09} size={118} top={280} /> : null}
      {t >= 5.75 ? <Headline kinetic lines={[["“I'm yours”", GOLD]]} at={5.75} size={150} top={300} /> : null}
    </>
  );
};

const R3Invite = () => {
  const t = useT();
  return (
    <>
      <Stage>
        <Hill t={t} />
        <Gift x={540} y={GROUND - 140 - Math.sin(t * 3) * 8} s={1.25} />
      </Stage>
      <Headline kinetic lines={["Will you", ["take it?", GOLD]]} at={0.1} size={170} top={280} />
    </>
  );
};

const Part3Body = () => (
  <>
    <Scene from={0} to={4.75} cut push={0.05} shots={[[0, 1], [3.34, 1.12, 0.5, 0.5]]}><R3Hook /></Scene>
    <Scene from={4.75} to={6.75} cut push={0.06}><R3Question /></Scene>
    <Scene from={6.75} to={12.05} cut push={0.05} shakes={[[0.9, 14]]}><R3Broke /></Scene>
    <Scene from={12.05} to={17.42} cut push={0.05} shakes={[[3.14, 12]]}><R3Pays /></Scene>
    <Scene from={17.42} to={22.57} enter="flash" push={0.06}><R3Cross /></Scene>
    <Scene from={22.57} to={28.49} cut push={0.05}><R3Gift /></Scene>
    <Scene from={28.49} to={35.16} cut push={0.05}><R3Refuse /></Scene>
    <Scene from={35.16} to={37.94} cut push={0.06}><R3Held /></Scene>
    <Scene from={37.94} to={45.65} cut push={0.08}><R3Prayer /></Scene>
    <Scene from={45.65} to={48.4} cut push={0.1}><R3Invite /></Scene>
    <Sequence from={Math.round(48.4 * FPS)}><EndCard logo title="Grace is a gift" sub="Prayed this? Tell someone today. Follow Logia." /></Sequence>
  </>
);

export const Part3V2: React.FC = () => (
  <Shell audio="part3-mix.mp3" w={W3N} part={3} end={48.4} logo noPad>
    <Part3Body />
  </Shell>
);


/* Part 3 emphasis scenes: each key line gets its own picture, and the picture changes on the word that matters. */

// "You're not Hitler. But 'better than Hitler' was never the standard." Goes in once that line is recorded.
export const R3Standard: React.FC<{ butAt: number; neverAt: number }> = ({ butAt, neverAt }) => {
  const t = useT();
  const grow = prog(t, 0.2, 1.0, Easing.out(Easing.cubic));
  const you = prog(t, butAt, butAt + 0.7, Easing.out(Easing.cubic));
  const rise = prog(t, neverAt - 0.2, neverAt + 1.2, Easing.inOut(Easing.cubic));
  const line = prog(t, neverAt + 0.5, neverAt + 1.2, Easing.out(Easing.cubic));
  const bar = (x: number, h: number, fill: string, label: string, p: number) => (
    <g>
      <rect x={x - 90} y={GROUND - h * p} width={180} height={h * p} rx={14} fill={fill} />
      <text x={x} y={GROUND + 70} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={44} letterSpacing={6} fill="#fff" opacity={p}>{label}</text>
    </g>
  );
  return (
    <>
      <Stage>
        <g transform={`translate(0 ${lerp(0, 760, rise)})`}>
          <rect y={-1200} width={1080} height={3200} fill="#0b0a12" />
          <circle cx={540} cy={-560} r={420} fill={GOLD} opacity={0.12 * line} style={{ filter: "blur(80px)" }} />
          {/* God's standard: far above both bars. */}
          <rect x={lerp(540, 60, line)} y={-560} width={lerp(0, 960, line)} height={10} rx={5} fill={GOLD} style={{ filter: `drop-shadow(0 0 18px ${GOLD})` }} />
          <text x={540} y={-600} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={40} letterSpacing={8} fill={GOLD} opacity={line}>GOD'S STANDARD: PERFECT</text>
          <rect y={GROUND} width={1080} height={700} fill="#060509" />
          {bar(350, 220, "#5c1016", "HITLER", grow)}
          {bar(730, 470, "#e9e3d6", "YOU", you)}
        </g>
      </Stage>
      {t < neverAt ? (
        <Headline kinetic lines={["You're not", ["Hitler", CRIMSON]]} at={0.15} size={140} top={280} />
      ) : (
        <Headline kinetic lines={["“Better than Hitler”", ["was never", GOLD], ["the standard", GOLD]]} at={neverAt + 0.1} size={104} top={280} />
      )}
    </>
  );
};

// "You can't EARN it. Because it's a gift. You just turn to Him, open your hands, and take it."
const R3EarnGift: React.FC<{ giftAt: number; turnAt: number; openAt: number; takeAt: number }> = ({ giftAt, turnAt, openAt, takeAt }) => {
  const t = useT();
  const slash = prog(t, 0.5, 0.85, Easing.out(Easing.cubic));
  const burst = prog(t, giftAt, giftAt + 0.9, Easing.out(Easing.cubic));
  const dark = 1 - prog(t, giftAt - 0.1, giftAt + 0.5);
  const take = prog(t, takeAt + 0.1, takeAt + 0.7);
  const walk = prog(t, turnAt, turnAt + 1.2);
  const eli = walking(posed(t, [[0, ARMS_CROSSED], [turnAt, ARMS_CROSSED], [turnAt + 0.4, IDLE], [openAt, IDLE], [openAt + 0.4, { ...OPEN_HANDS, smile: 1 }]]), t, walk > 0 && walk < 1 ? 1 : 0);
  return (
    <>
      <Stage>
        <Void t={t} tint="#6a4a12" seed="r3e" />
        <g opacity={0.45 * burst} transform={`rotate(${t * 9} 590 ${GROUND - 330})`}>
          {Array.from({ length: 16 }).map((_, n) => (
            <path key={n} transform={`rotate(${n * 22.5} 590 ${GROUND - 330})`} d={`M590,${GROUND - 330} L560,-300 L620,-300 Z`} fill="#fff0c0" />
          ))}
        </g>
        {Array.from({ length: 26 }).map((_, n) => {
          const a = random(`sp${n}`) * Math.PI * 2;
          const d = burst * (180 + random(`sd${n}`) * 360);
          return <circle key={n} cx={590 + Math.cos(a) * d} cy={GROUND - 330 + Math.sin(a) * d} r={4 + random(`sr${n}`) * 6} fill={GOLD} opacity={burst * (1 - burst) * 3} />;
        })}
        <Character look="guide" pose={OPEN_HANDS} x={790} t={t} scale={0.96} seed={3} rim={GOLD} />
        <Character look="eli" pose={eli} x={lerp(250, 400, walk)} t={t} scale={0.96} />
        <Gift x={lerp(590, 455, take)} y={GROUND - 310 - Math.sin(t * 3) * 8} s={0.72 * lerp(1, 1.18, burst * (1 - prog(t, giftAt + 0.9, giftAt + 1.6)))} />
        <rect width={1080} height={1920} fill="#000" opacity={0.55 * dark} />
      </Stage>
      {t < giftAt ? (
        <AbsoluteFill style={{ alignItems: "center", paddingTop: 300 }}>
          <div style={{ fontFamily: "Inter", fontWeight: 800, fontSize: 56, letterSpacing: 10, color: "#fff", opacity: prog(t, 0.05, 0.35) }}>YOU CAN'T</div>
          <div style={{ position: "relative", fontFamily: "Anton", fontSize: 230, color: "#fff", lineHeight: 1.05, opacity: prog(t, 0.1, 0.4), textShadow: "0 8px 0 rgba(0,0,0,.6)" }}>
            EARN
            <div style={{ position: "absolute", left: -20, top: "48%", height: 22, width: `${slash * 112}%`, background: CRIMSON, rotate: "-6deg", boxShadow: `0 0 24px ${CRIMSON}` }} />
          </div>
          <div style={{ fontFamily: "Inter", fontWeight: 800, fontSize: 56, letterSpacing: 10, color: "#fff", opacity: prog(t, 0.05, 0.35) }}>IT</div>
        </AbsoluteFill>
      ) : t < openAt ? (
        <Headline kinetic lines={["It's", ["a gift", GOLD]]} at={giftAt} size={190} top={280} />
      ) : (
        <Headline kinetic lines={["Open your hands", ["and take it", GOLD]]} at={openAt} size={108} top={280} />
      )}
    </>
  );
};

// "God never FORCES it. That's why we told Hitler's story. The gift... can be refused."
const R3Refused: React.FC<{ storyAt: number; refuseAt: number }> = ({ storyAt, refuseAt }) => {
  const t = useT();
  const away = prog(t, refuseAt + 0.2, refuseAt + 3.0, Easing.inOut(Easing.cubic));
  const grey = prog(t, refuseAt, refuseAt + 2.4);
  const breathe = 1 + 0.04 * Math.sin(t * 2.2);
  return (
    <>
      <AbsoluteFill style={{ filter: `grayscale(${grey}) brightness(${lerp(1, 0.7, grey)})` }}>
        <Stage>
          <Void t={t} tint="#26324f" seed="r3f" />
          <Gift x={740} y={GROUND - 70} s={0.9 * (t < refuseAt ? breathe : 1)} glow={lerp(1, 0.35, grey)} />
          <Character look="hitler" pose={walking(HEAD_DOWN, t, away > 0 && away < 1 ? 1 : 0)} x={lerp(560, 60, away)} t={t} rim="#ff8a3d" scale={1.0} />
        </Stage>
      </AbsoluteFill>
      {t < storyAt ? (
        <AbsoluteFill style={{ alignItems: "center", paddingTop: 290 }}>
          <div style={{ fontFamily: "Inter", fontWeight: 800, fontSize: 52, letterSpacing: 10, color: "#fff", opacity: prog(t, 0.05, 0.4) }}>GOD NEVER</div>
          <div style={{ fontFamily: "Anton", fontSize: 200, color: GOLD, lineHeight: 1.05, letterSpacing: lerp(30, 4, prog(t, 0.1, 1.4)), opacity: prog(t, 0.1, 0.6), textShadow: `0 0 50px ${GOLD}66, 0 8px 0 rgba(0,0,0,.6)` }}>FORCES</div>
          <div style={{ fontFamily: "Inter", fontWeight: 800, fontSize: 52, letterSpacing: 10, color: "#fff", opacity: prog(t, 0.05, 0.4) }}>IT</div>
        </AbsoluteFill>
      ) : t < refuseAt ? (
        <Headline kinetic lines={["That's why we told", ["Hitler's story", CRIMSON]]} at={storyAt} size={112} top={280} />
      ) : (
        <AbsoluteFill style={{ alignItems: "center", paddingTop: 300 }}>
          <div style={{ fontFamily: "Anton", fontSize: 128, color: "#fff", lineHeight: 1.1, opacity: prog(t, refuseAt, refuseAt + 0.5), textTransform: "uppercase" }}>The gift</div>
          <div style={{ fontFamily: "Anton", fontSize: 150, color: CRIMSON, lineHeight: 1.1, opacity: prog(t, refuseAt + 0.7, refuseAt + 1.4), filter: `blur(${lerp(8, 0, prog(t, refuseAt + 0.7, refuseAt + 1.4))}px)`, textTransform: "uppercase" }}>can be refused</div>
        </AbsoluteFill>
      )}
    </>
  );
};

/* Part 3 opening on Part 2's question, so it plays as the answer to it. */

const W3F = words(part3V5);
const W3B = words(part3V4);
const RECAP3 = 11.53;

const Rewound: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => {
  const t = useT();
  const k = 1 - prog(t, 0, 0.5);
  return (
    <>
      <AbsoluteFill style={{ filter: `sepia(0.45) saturate(0.75) contrast(1.05) drop-shadow(${8 * k}px 0 0 rgba(255,40,40,.55)) drop-shadow(${-8 * k}px 0 0 rgba(40,190,255,.55))`, translate: `${Math.sin(t * 90) * 14 * k}px 0px` }}>
        {children}
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "repeating-linear-gradient(0deg, rgba(0,0,0,.16) 0px, rgba(0,0,0,.16) 2px, transparent 2px, transparent 6px)", pointerEvents: "none" }} />
      <AbsoluteFill style={{ paddingTop: 172, paddingLeft: 66 }}>
        <div style={{ alignSelf: "flex-start", fontFamily: "Inter", fontWeight: 800, fontSize: 32, color: "#fff", background: "rgba(0,0,0,.6)", border: "2px solid rgba(255,255,255,.7)", height: 54, lineHeight: "50px", padding: "0 20px", borderRadius: 27, opacity: prog(t, 0.1, 0.4) }}>
          ◀◀ {label}
        </div>
      </AbsoluteFill>
    </>
  );
};

const Q3HowTitle = () => {
  const t = useT();
  const line = prog(t, 0.5, 1.1, Easing.out(Easing.cubic));
  return (
    <>
      <Stage>
        <rect width={1080} height={1920} fill="#07050a" />
        <g opacity={0.2} transform={`rotate(${t * 8} 540 900)`}>
          {Array.from({ length: 14 }).map((_, n) => (
            <path key={n} transform={`rotate(${n * (360 / 14)} 540 900)`} d="M540,900 L500,-500 L580,-500 Z" fill={GOLD} />
          ))}
        </g>
        <circle cx={540} cy={900} r={lerp(140, 280, prog(t, 0, 1.2))} fill={GOLD} opacity={0.16} style={{ filter: "blur(60px)" }} />
      </Stage>
      <Headline kinetic lines={["How grace", ["really works", GOLD]]} at={1.1} size={150} top={640} />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 1010 }}>
        <div style={{ height: 8, width: lerp(0, 640, line), background: GOLD, borderRadius: 4, boxShadow: `0 0 24px ${GOLD}` }} />
      </AbsoluteFill>
    </>
  );
};


/* Part 3 body after the rework: the two replaced lines are out, the key lines have room and their own pictures. */
const Part3BodyB = () => (
  <>
    <Scene from={0} to={2.1} xf={0.5} push={0.06}><R3Question /></Scene>
    <Scene from={2.1} to={7.4} xf={0.45} push={0.05} shakes={[[0.9, 14]]}><R3Broke /></Scene>
    <Scene from={7.4} to={12.77} xf={0.45} push={0.05} shakes={[[3.14, 12]]}><R3Pays w={W3B} off={7.4} /></Scene>
    <Scene from={12.77} to={17.92} xf={0.5} push={0.06}><R3Cross /></Scene>
    <Scene from={17.92} to={24.64} xf={0.45} push={0.06}><R3EarnGift giftAt={1.38} turnAt={3.09} openAt={4.38} takeAt={5.66} /></Scene>
    <Scene from={24.64} to={29.91} xf={0.6} push={0.07}><R3Refused storyAt={2.31} refuseAt={2.31} /></Scene>
    <Scene from={29.91} to={32.69} xf={0.6} push={0.06}><R3Held /></Scene>
    <Scene from={32.69} to={40.4} xf={0.5} push={0.08}><R3Prayer /></Scene>
    <Scene from={40.4} to={43.15} xf={0.5} push={0.1}><R3Invite /></Scene>
    <Sequence from={Math.round(43.15 * FPS)}><EndCard logo title="Grace is a gift" sub="Prayed this? Tell someone today. Follow Logia." /></Sequence>
  </>
);

const P3B_CUTS = [4.1, 5.7, 7.45];

export const Part3V3: React.FC = () => (
  <Shell audio="part3-full.wav" w={W3F} part={3} end={RECAP3 + 43.15} logo noPad>
    <Scene from={0} to={4.1} enter="whip" push={0.05}><Rewound label="PART 2"><Q2NoRepent /></Rewound></Scene>
    <Scene from={4.1} to={5.7} xf={0.4} push={0.05}><Rewound label="PART 2"><Q2Grace /></Rewound></Scene>
    <Scene from={5.7} to={7.45} xf={0.4} push={0.06}><Rewound label="PART 2"><Q2Gate /></Rewound></Scene>
    <Scene from={7.45} to={RECAP3} xf={0.6} push={0.05}><Q3HowTitle /></Scene>
    <Sequence from={Math.round(RECAP3 * FPS)}>
      <Part3BodyB />
    </Sequence>
    <CutSweeps at={P3B_CUTS} />
    <Grain />
  </Shell>
);

/* ---------- PART 3 (remade): what true repentance looks like ---------- */

const W3R = words(part3R);

const mixPose = (a: Pose, b: Pose, k: number): Pose => {
  const out = {} as Pose;
  (Object.keys(a) as (keyof Pose)[]).forEach((key) => { out[key] = lerp(a[key], b[key], k); });
  return out;
};

const R4Party = () => {
  const t = useT();
  const k = (Math.sin(t * 9) + 1) / 2;
  const beams = ["#ff3d7f", "#3dd6ff", "#ffd23d", "#9b5cff"];
  return (
    <>
      <Stage>
        <rect width={1080} height={1920} fill="#0b0612" />
        {beams.map((c, i) => (
          <path key={i} transform={`rotate(${Math.sin(t * 1.6 + i * 1.7) * 28} ${200 + i * 230} 0)`} d={`M${200 + i * 230},0 L${120 + i * 230},${GROUND} L${280 + i * 230},${GROUND} Z`} fill={c} opacity={0.22} />
        ))}
        <rect y={GROUND - 40} width={1080} height={700} fill="#140b1d" />
        {[140, 290, 790, 940].map((x, i) => (
          <Character key={x} look="shadow" pose={mixPose(IDLE, ARMS_UP, (Math.sin(t * 9 + i) + 1) / 2)} x={x} t={t} scale={0.78} />
        ))}
        <Character look="eli" pose={mixPose({ ...IDLE, smile: 1 }, ARMS_UP, k)} x={540} t={t} scale={1.05} />
      </Stage>
      <Headline kinetic lines={["Live however", ["you want", GOLD]]} at={0.1} size={140} top={280} />
    </>
  );
};

const R4Deathbed = () => {
  const t = useT();
  const beat = (x: number) => {
    const ph = (x + t * 260) % 260;
    return ph > 120 && ph < 140 ? -70 : ph > 140 && ph < 150 ? 40 : 0;
  };
  const pts = Array.from({ length: 60 }, (_, i) => `${640 + i * 6},${760 + beat(i * 6)}`).join(" ");
  return (
    <>
      <Stage>
        <rect width={1080} height={1920} fill="#07090d" />
        <ellipse cx={540} cy={1080} rx={520} ry={360} fill="#2a3c48" opacity={0.45} style={{ filter: "blur(70px)" }} />
        <rect x={610} y={680} width={380} height={170} rx={16} fill="#0b1410" stroke="#2f6b4a" strokeWidth={6} />
        <polyline points={pts} fill="none" stroke="#4dff9a" strokeWidth={5} style={{ filter: "drop-shadow(0 0 8px #4dff9a)" }} />
        <rect x={120} y={GROUND - 210} width={840} height={70} rx={14} fill="#d9dee6" />
        <rect x={120} y={GROUND - 150} width={840} height={150} rx={10} fill="#3d4a57" />
        <ellipse cx={240} cy={GROUND - 225} rx={95} ry={38} fill="#f2f4f7" />
        <g transform={`rotate(-90 540 ${GROUND - 220})`}>
          <Character look="eli" pose={{ ...HEAD_DOWN, head: 0 }} x={540} ground={GROUND - 220 + 300} t={t} scale={0.8} shadow={false} />
        </g>
      </Stage>
      <Headline kinetic lines={["Say sorry at", ["the last second", CRIMSON]]} at={0.1} size={118} top={280} />
    </>
  );
};

const R4GetIn = () => {
  const t = useT();
  const x = lerp(-80, 330, prog(t, 0, 1.6));
  return (
    <>
      <Stage>
        <Hill t={t} rise={0.5} cross={0} />
        <ScaledGate closed={0.5} />
        <Character look="eli" pose={walking(LOOK_UP, t, 1 - prog(t, 1.4, 1.7), 2.8)} x={x} t={t} scale={0.82} />
      </Stage>
      <Headline kinetic lines={["And still", ["get in?", GOLD]]} at={0.1} size={170} top={280} />
    </>
  );
};

const R4You = () => {
  const t = useT();
  return (
    <>
      <Stage>
        <Library t={t + 9} />
        <Character look="eli" pose={{ ...IDLE, brow: 0.3 }} x={540} t={t} scale={1.15} />
      </Stage>
      <Headline kinetic lines={["The real answer", ["is about you", GOLD]]} at={0.15} size={120} top={280} />
    </>
  );
};

const R4Password = () => {
  const t = useT();
  const typed = "SORRY".slice(0, Math.floor(prog(t, 0.25, 1.1) * 5.99));
  const deny = prog(t, 1.35, 1.6);
  const shake = deny > 0 && deny < 1 ? Math.sin(t * 70) * 14 : 0;
  return (
    <>
      <Stage>
        <rect width={1080} height={1920} fill="#0a0b12" />
        <ellipse cx={540} cy={900} rx={600} ry={500} fill={GOLD} opacity={0.08} style={{ filter: "blur(80px)" }} />
      </Stage>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingBottom: 200 }}>
        <div style={{ translate: `${shake}px 0px`, width: 820, background: "#151724", borderRadius: 36, padding: "56px 60px", border: `4px solid ${deny > 0.5 ? CRIMSON : "#2c3046"}`, boxShadow: deny > 0.5 ? `0 0 60px ${CRIMSON}66` : "0 30px 90px rgba(0,0,0,.7)" }}>
          <div style={{ fontFamily: "Inter", fontWeight: 800, fontSize: 40, letterSpacing: 8, color: GOLD, textAlign: "center" }}>HEAVEN</div>
          <div style={{ fontFamily: "Inter", fontWeight: 800, fontSize: 30, letterSpacing: 4, color: "#8e93ad", marginTop: 40 }}>PASSWORD</div>
          <div style={{ marginTop: 14, height: 110, borderRadius: 18, background: "#0c0d16", border: "3px solid #2c3046", display: "flex", alignItems: "center", paddingLeft: 30, fontFamily: "Inter", fontWeight: 800, fontSize: 64, letterSpacing: 14, color: "#fff" }}>
            {typed}
            <span style={{ opacity: Math.floor(t * 3) % 2 ? 1 : 0, color: GOLD }}>|</span>
          </div>
          <div style={{ marginTop: 34, fontFamily: "Inter", fontWeight: 800, fontSize: 46, color: CRIMSON, textAlign: "center", opacity: deny }}>✕ NOT A PASSWORD</div>
        </div>
      </AbsoluteFill>
    </>
  );
};

const R4Verse = () => {
  const t = useT();
  return (
    <>
      <Stage><Void t={t} tint="#6a4a12" seed="r4v" /></Stage>
      <Verse text="“Not everyone who says to me, ‘Lord, Lord,’ will enter the kingdom of heaven.”" cite="JESUS · MATTHEW 7:21" at={0.1} top={480} />
    </>
  );
};

const R4Real = () => {
  const t = useT();
  return (
    <>
      <Stage><Void t={t} tint="#3b220c" seed="r4r" /></Stage>
      <Headline kinetic lines={["What does", ["real", GOLD], "repentance", "look like?"]} at={0.1} size={130} top={420} />
    </>
  );
};

const R4NotYou = () => {
  const t = useT();
  const beam = prog(t, 0.9, 1.7);
  return (
    <>
      <Stage>
        <Void t={t} tint="#21304e" seed="r4n" />
        <path d={`M420,0 L660,0 L820,${GROUND + 40} L260,${GROUND + 40} Z`} fill={GOLD} opacity={0.22 * beam} />
        <Character look="eli" pose={posed(t, [[0, HEAD_DOWN], [1.0, HEAD_DOWN], [1.6, LOOK_UP]])} x={540} t={t} scale={1.1} rim={beam > 0.5 ? GOLD : undefined} />
      </Stage>
      <Headline kinetic lines={["It doesn't start", ["with you", CRIMSON]]} at={0.1} size={124} top={280} />
    </>
  );
};

const R4Grace: React.FC<{ kindAt: number }> = ({ kindAt }) => {
  const t = useT();
  const p = prog(t, 0, 0.7, Easing.out(Easing.back(1.4)));
  return (
    <>
      <Stage>
        <rect width={1080} height={1920} fill="#0b0805" />
        <g opacity={0.3} transform={`rotate(${t * 9} 540 960)`}>
          {Array.from({ length: 16 }).map((_, i) => (
            <path key={i} transform={`rotate(${i * 22.5} 540 960)`} d="M540,960 L505,-400 L575,-400 Z" fill="#fff0c0" />
          ))}
        </g>
        <circle cx={540} cy={960} r={lerp(120, 300, p)} fill={GOLD} opacity={0.22} style={{ filter: "blur(60px)" }} />
      </Stage>
      {t < kindAt ? (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingBottom: 160 }}>
          <div style={{ fontFamily: "Inter", fontWeight: 800, fontSize: 52, letterSpacing: 10, color: "#fff", opacity: prog(t, 0, 0.3) }}>IT STARTS WITH</div>
          <div style={{ fontFamily: "Anton", fontSize: 280, color: GOLD, lineHeight: 1.05, scale: String(lerp(1.5, 1, p)), opacity: Math.min(1, p * 1.5), textShadow: `0 0 70px ${GOLD}99, 0 8px 0 rgba(0,0,0,.6)` }}>GRACE</div>
        </AbsoluteFill>
      ) : (
        <>
          <Headline kinetic lines={["God's kindness", ["leads you to", GOLD], ["repentance", GOLD]]} at={kindAt} size={118} top={520} />
          <AbsoluteFill style={{ alignItems: "center", paddingTop: 960 }}>
            <div style={{ fontFamily: "Inter", fontWeight: 800, fontSize: 40, letterSpacing: 4, color: GOLD, opacity: prog(t, kindAt + 0.4, kindAt + 0.8) }}>ROMANS 2:4</div>
          </AbsoluteFill>
        </>
      )}
    </>
  );
};

const Coins: React.FC<{ x: number; y: number; n: number; s?: number }> = ({ x, y, n, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    {Array.from({ length: n }).map((_, i) => (
      <g key={i} transform={`translate(${(i % 3) * 64 - 64} ${-Math.floor(i / 3) * 22})`}>
        <ellipse cx={0} cy={0} rx={34} ry={12} fill="#b8861f" />
        <ellipse cx={0} cy={-6} rx={34} ry={12} fill={GOLD} />
      </g>
    ))}
  </g>
);

const R4Zach = () => {
  const t = useT();
  return (
    <>
      <Stage>
        <Void t={t} tint="#3b1446" seed="r4z" />
        <Coins x={760} y={GROUND - 10} n={18} />
        <Character look="zach" pose={posed(t, [[0, IDLE], [0.6, { ...IDLE, rs: -60, re: -40, brow: 0.6, smile: 0.4 }]])} x={420} t={t} scale={0.9} />
      </Stage>
      <Headline kinetic lines={["Zacchaeus", ["cheated people", CRIMSON], "for a living"]} at={0.1} size={110} top={270} />
    </>
  );
};

const R4House = () => {
  const t = useT();
  const open = prog(t, 0.3, 1.1);
  return (
    <>
      <Stage>
        <Void t={t} tint="#3b220c" seed="r4h" />
        <g transform={`translate(700 ${GROUND})`}>
          <rect x={-230} y={-560} width={460} height={560} fill="#5a3a24" />
          <path d="M-280,-560 L0,-760 L280,-560 Z" fill="#3c2617" />
          <rect x={-90} y={-330} width={180} height={330} fill="#fff1c4" opacity={open} />
          <rect x={-90} y={-330} width={180 * (1 - open)} height={330} fill="#2b1a10" />
          <ellipse cx={0} cy={-160} rx={260} ry={300} fill={GOLD} opacity={0.18 * open} style={{ filter: "blur(40px)" }} />
        </g>
        <Character look="jesus" pose={OPEN_HANDS} x={700} t={t} scale={0.82} rim={GOLD} />
        <Character look="zach" pose={posed(t, [[0, HEAD_DOWN], [1.4, LOOK_UP]])} x={300} t={t} scale={0.78} />
      </Stage>
      <Headline kinetic lines={["Jesus came", ["before", GOLD], "he changed a thing"]} at={0.2} size={108} top={270} />
    </>
  );
};

const R4AndThen = () => (
    <>
      <Stage><rect width={1080} height={1920} fill="#07050a" /></Stage>
      <Headline kinetic lines={[["And then?", GOLD]]} at={0.03} size={200} top={760} />
    </>
);

const R4Coins: React.FC<{ fourAt: number }> = ({ fourAt }) => {
  const t = useT();
  const give = prog(t, 0.4, 1.4, Easing.inOut(Easing.cubic));
  const four = prog(t, fourAt, fourAt + 0.5, Easing.out(Easing.back(1.6)));
  return (
    <>
      <Stage>
        <Void t={t} tint="#5a3c10" seed="r4c" />
        <Coins x={lerp(760, 300, give)} y={GROUND - 10} n={9} />
        <Coins x={760} y={GROUND - 10} n={9} />
        <text x={300} y={GROUND - 150} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={40} letterSpacing={6} fill="#fff" opacity={give}>THE POOR</text>
        <Character look="zach" pose={{ ...OPEN_HANDS, smile: 1 }} x={540} t={t} scale={0.85} />
      </Stage>
      {t < fourAt ? (
        <Headline kinetic lines={["He gave", ["half", GOLD], "to the poor"]} at={0.1} size={120} top={270} />
      ) : (
        <AbsoluteFill style={{ alignItems: "center", paddingTop: 250 }}>
          <div style={{ fontFamily: "Inter", fontWeight: 800, fontSize: 48, letterSpacing: 8, color: "#fff", opacity: prog(t, fourAt, fourAt + 0.3) }}>PAID BACK</div>
          <div style={{ fontFamily: "Anton", fontSize: 260, color: GOLD, lineHeight: 1, scale: String(lerp(1.6, 1, four)), opacity: Math.min(1, four * 1.4), textShadow: `0 0 60px ${GOLD}88` }}>4×</div>
        </AbsoluteFill>
      )}
    </>
  );
};

const R4Turn: React.FC<{ magicAt: number; turnAt: number; awayAt: number }> = ({ magicAt, turnAt, awayAt }) => {
  const t = useT();
  const goingAway = t < turnAt;
  const x = goingAway ? lerp(420, 760, prog(t, 0, turnAt)) : lerp(760, 300, prog(t, awayAt - 0.2, awayAt + 2.6));
  const walk = goingAway ? 1 : t > awayAt - 0.2 && t < awayAt + 2.6 ? 1 : 0;
  const glow = goingAway ? 0.5 : lerp(0.5, 1, prog(t, turnAt, turnAt + 1.5));
  return (
    <>
      <Stage>
        <rect width={1080} height={1920} fill="#050407" />
        <defs>
          <linearGradient id="turnSide" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#5a3c10" />
            <stop offset="0.55" stopColor="#120c08" />
            <stop offset="1" stopColor="#030203" />
          </linearGradient>
        </defs>
        <rect width={1080} height={1920} fill="url(#turnSide)" />
        <circle cx={60} cy={820} r={420} fill={GOLD} opacity={0.3 * glow} style={{ filter: "blur(90px)" }} />
        <CrossShape x={110} y={GROUND} s={0.75} glow={glow} />
        <rect y={GROUND - 40} width={1080} height={700} fill="#09070a" />
        <Character look="eli" pose={walking(goingAway ? HEAD_DOWN : LOOK_UP, t, walk)} x={x} t={t} scale={0.95} flip={!goingAway} rim={goingAway ? undefined : GOLD} />
      </Stage>
      {t < magicAt ? (
        <Headline kinetic lines={["That's", ["repentance", GOLD]]} at={0.1} size={150} top={280} />
      ) : t < turnAt ? (
        <Headline kinetic lines={["Not a", ["magic word", CRIMSON]]} at={magicAt} size={150} top={280} />
      ) : t < awayAt ? (
        <Headline kinetic lines={[["A turn", GOLD]]} at={turnAt} size={230} top={300} />
      ) : (
        <Headline kinetic lines={["Away from sin", ["toward Him", GOLD]]} at={awayAt} size={130} top={280} />
      )}
    </>
  );
};

const R4Clock: React.FC<{ realAt: number }> = ({ realAt }) => {
  const t = useT();
  const sec = Math.floor(t * 2) / 2;
  return (
    <>
      <Stage>
        <rect width={1080} height={1920} fill="#08080c" />
        <g transform="translate(540 980)">
          <circle r={330} fill="#12131b" stroke="#c9b27a" strokeWidth={14} />
          {Array.from({ length: 60 }).map((_, i) => (
            <rect key={i} x={-3} y={-310} width={6} height={i % 5 ? 18 : 40} fill="#c9b27a" transform={`rotate(${i * 6})`} />
          ))}
          <rect x={-9} y={-190} width={18} height={200} rx={9} fill="#f2ead6" transform={`rotate(${-0.5 + 359.5})`} />
          <rect x={-6} y={-270} width={12} height={280} rx={6} fill="#f2ead6" transform={`rotate(${354})`} />
          <rect x={-3} y={-290} width={6} height={320} fill={CRIMSON} transform={`rotate(${300 + sec * 6})`} />
          <circle r={18} fill={CRIMSON} />
        </g>
      </Stage>
      {t < realAt ? (
        <Headline kinetic lines={["Here's what", ["nobody expects", GOLD]]} at={0.1} size={120} top={260} />
      ) : (
        <Headline kinetic lines={["A last-second turn", ["can be real", GOLD]]} at={realAt} size={112} top={260} />
      )}
    </>
  );
};

const R4Crosses: React.FC<{ rememberAt: number }> = ({ rememberAt }) => {
  const t = useT();
  return (
    <>
      <Stage>
        <rect width={1080} height={1920} fill="#14060a" />
        <ellipse cx={540} cy={1000} rx={700} ry={600} fill="#7b1626" opacity={0.5} style={{ filter: "blur(90px)" }} />
        <path d={`M-60,1260 Q260,950 540,940 Q820,950 1140,1260 L1140,1920 L-60,1920 Z`} fill="#0a0406" />
        <CrossShape x={540} y={980} s={1.0} glow={0.6} c="#050203" />
        <CrossShape x={230} y={1070} s={0.72} glow={0} c="#050203" />
        <CrossShape x={850} y={1070} s={0.72} glow={0} c="#050203" />
      </Stage>
      {t < rememberAt ? (
        <Headline kinetic lines={["A dying criminal", ["admitted his guilt", CRIMSON]]} at={0.1} size={110} top={270} />
      ) : (
        <AbsoluteFill style={{ alignItems: "center", paddingTop: 300, paddingLeft: 80, paddingRight: 80 }}>
          <div style={{ fontFamily: "Playfair Display", fontStyle: "italic", fontWeight: 600, fontSize: 96, color: "#fff6dc", textAlign: "center", opacity: prog(t, rememberAt, rememberAt + 0.5), textShadow: "0 4px 24px rgba(0,0,0,.9)" }}>“Jesus, remember me.”</div>
          <div style={{ fontFamily: "Inter", fontWeight: 800, fontSize: 36, color: GOLD, letterSpacing: 3, marginTop: 18, opacity: prog(t, rememberAt + 0.4, rememberAt + 0.8) }}>LUKE 23:42</div>
        </AbsoluteFill>
      )}
    </>
  );
};

const R4Paradise = () => {
  const t = useT();
  // Dawn breaks over "And Jesus said", and "TODAY" lands on the spoken word.
  const dawn = prog(t, 0, 1.4, Easing.out(Easing.cubic));
  const p = prog(t, 1.12, 1.7, Easing.out(Easing.cubic));
  return (
    <>
      <Stage>
        <rect width={1080} height={1920} fill="#1c0f05" />
        <circle cx={540} cy={1000} r={lerp(80, 1300, dawn)} fill="#ffe7b0" opacity={0.85} style={{ filter: "blur(40px)" }} />
        <g opacity={0.4} transform={`rotate(${t * 6} 540 1000)`}>
          {Array.from({ length: 18 }).map((_, i) => (
            <path key={i} transform={`rotate(${i * 20} 540 1000)`} d="M540,1000 L510,-400 L570,-400 Z" fill="#fff" />
          ))}
        </g>
        <rect y={1330} width={1080} height={320} fill="#1c0f05" opacity={0.82} style={{ filter: "blur(16px)" }} />
      </Stage>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 520 }}>
        <div style={{ fontFamily: "Anton", fontSize: 270, color: "#5a2d00", lineHeight: 1, scale: String(lerp(1.4, 1, p)), opacity: p }}>TODAY</div>
        <div style={{ fontFamily: "Playfair Display", fontStyle: "italic", fontWeight: 600, fontSize: 72, color: "#3a1d00", textAlign: "center", marginTop: 20, paddingLeft: 80, paddingRight: 80, opacity: prog(t, 1.9, 2.4) }}>you will be with me in paradise.</div>
        <div style={{ fontFamily: "Inter", fontWeight: 800, fontSize: 36, color: "#5a2d00", letterSpacing: 3, marginTop: 18, opacity: prog(t, 2.4, 2.8) }}>LUKE 23:43</div>
      </AbsoluteFill>
    </>
  );
};

const R4Hitler: React.FC<{ onlyAt: number; turnAt: number }> = ({ onlyAt, turnAt }) => {
  const t = useT();
  return (
    <>
      <Stage>
        <Hill t={t + 3} rise={0.7} cross={0} />
        <ScaledGate closed={0.3} />
        <Character look="hitler" pose={posed(t, [[0, IDLE], [0.8, LOOK_UP], [turnAt, LOOK_UP], [turnAt + 0.6, HEAD_DOWN]])} x={330} t={t} scale={0.85} />
      </Stage>
      {t < onlyAt ? (
        <Headline kinetic lines={["Grace was big enough", ["for Hitler", GOLD]]} at={0.1} size={104} top={270} />
      ) : t < turnAt ? (
        <Headline kinetic lines={["The only", ["question was…", GOLD]]} at={onlyAt} size={130} top={270} />
      ) : (
        <Headline kinetic lines={["Would he", ["turn?", CRIMSON]]} at={turnAt} size={180} top={260} />
      )}
    </>
  );
};

const R4Offer: React.FC<{ takeAt: number }> = ({ takeAt }) => {
  const t = useT();
  return (
    <>
      <Stage>
        <Void t={t} tint="#6a4a12" seed="r4o" />
        <g opacity={0.3} transform={`rotate(${t * 7} 540 ${GROUND - 260})`}>
          {Array.from({ length: 14 }).map((_, i) => (
            <path key={i} transform={`rotate(${i * (360 / 14)} 540 ${GROUND - 260})`} d={`M540,${GROUND - 260} L510,-300 L570,-300 Z`} fill="#fff0c0" />
          ))}
        </g>
        <Character look="guide" pose={OPEN_HANDS} x={540} t={t} scale={1.0} seed={3} rim={GOLD} />
        <Gift x={540} y={GROUND - 250 - Math.sin(t * 3) * 8} s={1.0} />
      </Stage>
      {t < takeAt ? (
        <Headline kinetic lines={["Held out", ["to you", GOLD]]} at={0.1} size={160} top={280} />
      ) : (
        <Headline kinetic lines={["Will you", ["take it?", GOLD]]} at={takeAt} size={170} top={280} />
      )}
    </>
  );
};

// Scene changes, all on the score's beat; used for the light sweep and the beat hits in the mix.
const P3R_CUTS = [2, 5, 7, 9, 12, 14, 18, 20, 22, 27, 29, 32, 33, 38, 45, 51, 57, 61, 66];

export const Part3R: React.FC = () => (
  <Shell audio="part3r-full.wav" w={W3R} part={3} end={71} logo noPad>
    <Scene from={0} to={2} cut push={0.08}><R4Party /></Scene>
    <Scene from={2} to={5} cut push={0.08} shakes={[[0, 10]]}><R4Deathbed /></Scene>
    <Scene from={5} to={7} cut push={0.08} shakes={[[0, 12]]}><R4GetIn /></Scene>
    <Scene from={7} to={9} xf={0.3} push={0.05}><Rewound label="PART 2"><Q2Gate /></Rewound></Scene>
    <Scene from={9} to={12} xf={0.3} shots={[[0, 1], [1.8, 1.22, 0.5, 0.42]]}><R4You /></Scene>
    <Scene from={12} to={14} xf={0.3} push={0.04}><R4Password /></Scene>
    <Scene from={14} to={18} xf={0.35} push={0.05}><R4Verse /></Scene>
    <Scene from={18} to={20} xf={0.3} push={0.06}><R4Real /></Scene>
    <Scene from={20} to={22} xf={0.3} push={0.05}><R4NotYou /></Scene>
    <Scene from={22} to={27} xf={0.3} push={0.05}><R4Grace kindAt={1.9} /></Scene>
    <Scene from={27} to={29} xf={0.3} push={0.05}><R4Zach /></Scene>
    <Scene from={29} to={32} xf={0.3} push={0.05}><R4House /></Scene>
    <Scene from={32} to={33} cut push={0.1}><R4AndThen /></Scene>
    <Scene from={33} to={38} xf={0.25} push={0.05}><R4Coins fourAt={2.77} /></Scene>
    <Scene from={38} to={45} xf={0.3} push={0.04}><R4Turn magicAt={1.94} turnAt={3.35} awayAt={4.41} /></Scene>
    <Scene from={45} to={51} xf={0.35} push={0.06}><R4Clock realAt={2.52} /></Scene>
    <Scene from={51} to={57} xf={0.4} push={0.06}><R4Crosses rememberAt={4.07} /></Scene>
    <Scene from={57} to={61} xf={0.2} push={0.05}><R4Paradise /></Scene>
    <Scene from={61} to={66} xf={0.4} push={0.06}><R4Hitler onlyAt={1.9} turnAt={3.37} /></Scene>
    <Scene from={66} to={71} xf={0.4} push={0.08}><R4Offer takeAt={3.11} /></Scene>
    <Sequence from={Math.round(71 * FPS)}><EndCard logo title="Grace is a gift" sub="Prayed this? Tell someone today. Follow Logia." /></Sequence>
    <CutSweeps at={P3R_CUTS} />
    <Grain />
  </Shell>
);
