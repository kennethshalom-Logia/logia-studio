import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, random, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import {
  BottomLogo, Captions, Character, EndCard, FONTS, FPS, GOLD, GROUND, H, HEAD_DOWN, IDLE, KNEEL, lerp,
  OPEN_HANDS, Pose, posed, prog, REACH, Scene, Stage, useT, Vignette, W, Word,
} from "./Kit";
import {
  backOut, Bg, C, Credit, Fingerprint, Glow, Grain, INK, LetterBadge, Motes, Photo, SCta, SeriesPill, snap, Sticker, SWhispering, Tile, Wave,
} from "./Hear";
import raw from "./data/hear-v2.json";

const { anton, inter, playfair } = FONTS;

/* ---------- Narration timing: every beat is looked up from the words themselves ---------- */

const DATA = raw as { placeholder?: boolean; words: (Word & { type?: string })[] };
export const V2_PLACEHOLDER = Boolean(DATA.placeholder);

export const WORDS: Word[] = (() => {
  let inTag = false;
  return DATA.words.filter((w) => {
    if (w.type && w.type !== "word") return false;
    if (w.text.startsWith("[")) inTag = true;
    const skip = inTag;
    if (w.text.endsWith("]")) inTag = false;
    return !skip;
  });
})();

const norm = (s: string) => s.toLowerCase().replace(/[^a-z']/g, "").replace(/’/g, "'");
/** Start time of the nth occurrence of a sequence of words, e.g. seq("a is for"). */
const seq = (phrase: string, nth = 0) => {
  const want = phrase.split(" ").map(norm);
  let hits = 0;
  for (let i = 0; i + want.length <= WORDS.length; i++) {
    if (want.every((w, k) => norm(WORDS[i + k].text) === w)) {
      if (hits === nth) return WORDS[i].start;
      hits++;
    }
  }
  throw new Error(`Narration is missing "${phrase}" #${nth}`);
};
const endOf = (phrase: string, nth = 0) => {
  const s = seq(phrase, nth);
  const i = WORDS.findIndex((w) => w.start === s);
  return WORDS[i + phrase.split(" ").length - 1].end;
};

export const B = {
  dont: seq("i don't think"),
  real: seq("real"),
  because: seq("because"),
  prayed: seq("prayed"),
  never: seq("never"),
  word: seq("a word to me") + 0.1,
  but: seq("but what if"),
  silent: seq("silent"),
  wrong: seq("wrong"),
  heres: seq("here's how"),
  hear1: seq("hear him"),
  H: seq("h is for"),
  resurrection: seq("resurrection"),
  documented: seq("documented"),
  eyewitnesses: seq("eyewitnesses"),
  dead: seq("dead sea"),
  scrolls: seq("scrolls"),
  preserved: seq("preserved"),
  thousand: seq("thousand"),
  E: seq("e is for"),
  all: seq("all scripture"),
  everyVoice: seq("every page is"),
  A: seq("a is for"),
  speaks: seq("god speaks"),
  people: seq("people"),
  life: seq("life"),
  R: seq("r is for"),
  look: seq("look back"),
  closed: seq("closed"),
  right: seq("right person"),
  red: seq("red thread"),
  fingerprints: seq("his fingerprints"),
  whisper: seq("he's been whispering"),
  comment: seq("comment"),
  last: endOf("comment hear"),
};
export const END = B.last + 2.4;
export const V2_SECONDS = Math.ceil((END + 3.2) * 10) / 10;

/* ---------- Shared bits ---------- */

export const Shift: React.FC<{ by: number; children: React.ReactNode }> = ({ by, children }) => (
  <Sequence from={-Math.round(by * FPS)}>{children}</Sequence>
);

/** Kinetic headline whose lines each land on their own beat (scene-local seconds). */
export const Beats: React.FC<{ lines: [string, number, string?][]; top: number; size: number; out?: number; font?: "anton" | "playfair" }> = ({ lines, top, size, out, font = "anton" }) => {
  const t = useT();
  const o = out !== undefined ? 1 - prog(t, out, out + 0.5) : 1;
  return (
    <AbsoluteFill style={{ paddingTop: top, alignItems: "center", paddingLeft: 60, paddingRight: 60, opacity: o }}>
      {lines.map(([s, at, color], i) => {
        const p = prog(t, at, at + 0.55, snap);
        return (
          <div key={i} style={{ overflow: "hidden", paddingBottom: 8 }}>
            <div
              style={{
                fontFamily: font === "anton" ? anton : playfair, fontStyle: font === "playfair" ? "italic" : undefined,
                fontSize: size, lineHeight: 1.1, color: color ?? "#fff", textAlign: "center", textTransform: font === "anton" ? "uppercase" : undefined,
                translate: `0 ${lerp(100, 0, p)}%`, filter: `blur(${lerp(8, 0, p)}px)`, letterSpacing: font === "anton" ? lerp(10, 1, p) : 0,
                textShadow: "0 6px 0 rgba(0,0,0,.5), 0 0 40px rgba(0,0,0,.7)",
              }}
            >
              {s}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/* ---------- Scenes ---------- */

/** Hook and "because": one continuous shot of the bedroom, lit up out of darkness. */
export const V2Room: React.FC = () => {
  const t = useT();
  const because = B.because;
  const light = prog(t, 0.6, because + 0.6, Easing.inOut(Easing.cubic));
  const pose = posed(t, [[0, { ...HEAD_DOWN, ls: -10, le: -60, rs: 10, re: 60 }], [because + 0.2, HEAD_DOWN], [because + 1.4, KNEEL]]);
  const rain = Array.from({ length: 60 });
  return (
    <>
      <Stage>
        <Bg id="v2rm" top="#04050a" bottom="#0b0f20" />
        <g opacity={light}>
          <rect x={250} y={330} width={580} height={620} rx={18} fill="#16213f" />
          <clipPath id="v2win"><rect x={270} y={350} width={540} height={580} rx={10} /></clipPath>
          <g clipPath="url(#v2win)">
            <rect x={270} y={350} width={540} height={580} fill="#0d1631" />
            <circle cx={650} cy={470} r={64} fill="#dfe8ff" opacity={0.85} />
            <Glow cx={650} cy={470} r={160} c="#8fb0ff" o={0.35} />
            {rain.map((_, i) => {
              const x = 270 + random(`v2rx${i}`) * 560;
              const y = 350 + ((random(`v2ry${i}`) * 600 + t * 700) % 600);
              return <line key={i} x1={x} y1={y} x2={x - 7} y2={y + 30} stroke="#9fb6ff" strokeWidth={2.5} opacity={0.3} />;
            })}
          </g>
          <rect x={536} y={350} width={10} height={580} fill="#16213f" />
          <rect x={270} y={634} width={540} height={10} fill="#16213f" />
          <path d={`M270,930 L810,930 L1040,${GROUND + 200} L40,${GROUND + 200} Z`} fill="#8fb0ff" opacity={0.08} />
        </g>
        <rect y={GROUND - 40} width={W} height={700} fill="#080a12" />
        <g opacity={light}>
          <rect x={-40} y={GROUND - 250} width={330} height={220} rx={26} fill="#1b2240" />
          <rect x={-40} y={GROUND - 290} width={300} height={70} rx={26} fill="#e9ecf5" opacity={0.85} />
        </g>
        {/* Phone glow is the only light at first. */}
        <Glow cx={560} cy={GROUND - 260} r={120} c="#7fd0ff" o={0.35 * (1 - light * 0.6)} />
        <Character look="seeker" pose={pose} x={540} t={t} scale={1.08} rim={light > 0.3 ? "#8fb0ff" : "#5ab8ff"} />
        <Motes c="#b9cbff" n={16} seed="v2rm" rise={6} />
      </Stage>
      <Beats lines={[["I don't think", B.dont + 0.05], ["God is real.", B.real - 0.25, GOLD]]} top={330} size={140} out={because - 0.3} />
      {t > because - 0.2 ? (
        <Beats lines={[["Because I've prayed", B.prayed - 0.1], ["for years", B.prayed + 0.3, GOLD]]} top={300} size={112} out={B.never - 0.3} />
      ) : null}
      {t > B.never - 0.3 ? <Beats lines={[["…and He's never", B.never - 0.15], ["said a word", B.never + 0.45, GOLD]]} top={300} size={112} /> : null}
      <AbsoluteFill style={{ top: 1040, alignItems: "flex-end", paddingRight: 90, opacity: prog(t, B.word, B.word + 0.5) }}>
        <div style={{ translate: `0 ${lerp(30, 0, prog(t, B.word, B.word + 0.6, snap))}px` }}>
          <div style={{ background: "#2f7bff", color: "#fff", fontFamily: inter, fontWeight: 800, fontSize: 40, padding: "20px 30px", borderRadius: "34px 34px 8px 34px" }}>God, are You there?</div>
          <div style={{ textAlign: "right", fontFamily: inter, fontWeight: 800, fontSize: 24, color: "#9aa3b5", marginTop: 8 }}>Delivered</div>
        </div>
      </AbsoluteFill>
    </>
  );
};

/** "What if He's not silent?" — a thunder wave that calms into a whisper on "wrong thing". */
export const V2Listen: React.FC<{ start: number }> = ({ start }) => {
  const t = useT();
  const swap = B.wrong - start;
  const sw = prog(t, swap - 0.2, swap + 0.9, Easing.inOut(Easing.cubic));
  return (
    <>
      <Stage>
        <Bg id="v2ls" top="#05060c" bottom="#0e0b1c" />
        <Wave y={860} amp={lerp(240, 8, sw)} freq={lerp(0.9, 0.18, sw)} c={sw < 0.5 ? "#ff6b5c" : GOLD} w={lerp(10, 5, sw)} speed={lerp(7, 1.6, sw)} />
        <Wave y={860} amp={lerp(150, 5, sw)} freq={lerp(1.3, 0.24, sw)} c={sw < 0.5 ? "#ff9a5c" : "#fff1c7"} w={3} speed={lerp(6, 1.2, sw)} o={0.6} />
      </Stage>
      <Beats lines={[["What if He's", B.but - start + 0.1], ["not silent?", B.silent - start - 0.2, GOLD]]} top={320} size={124} out={swap - 0.9} />
      {t > swap - 0.9 ? <Beats lines={[["Listening for", swap - 0.8], ["the wrong thing", swap - 0.1, "#ff6b5c"]]} top={320} size={112} /> : null}
      <AbsoluteFill style={{ top: 1060, alignItems: "center" }}>
        <div style={{ position: "relative", height: 130, width: 900 }}>
          <div style={{ position: "absolute", inset: 0, textAlign: "center", fontFamily: anton, fontSize: 104, color: "#ff6b5c", opacity: 1 - sw }}>THUNDER</div>
          <div style={{ position: "absolute", inset: 0, textAlign: "center", fontFamily: playfair, fontStyle: "italic", fontSize: 110, color: GOLD, opacity: sw }}>a whisper</div>
        </div>
      </AbsoluteFill>
    </>
  );
};

/** The four tiles arrive one at a time and hold. */
export const V2Tiles: React.FC<{ start: number }> = ({ start }) => {
  const t = useT();
  const at = B.heres - start;
  return (
    <>
      <Stage>
        <defs><radialGradient id="v2tl" cx="50%" cy="45%" r="70%"><stop offset="0" stopColor="#1f1530" /><stop offset="1" stopColor={INK} /></radialGradient></defs>
        <rect width={W} height={H} fill="url(#v2tl)" />
        <Motes c={GOLD} n={26} seed="v2tl" rise={10} />
      </Stage>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 26, top: -100 }}>
        {(["H", "E", "A", "R"] as const).map((l, i) => {
          const p = prog(t, at + 0.2 + i * 0.22, at + 0.75 + i * 0.22, backOut);
          return <div key={l} style={{ scale: String(p), opacity: p, translate: `0 ${lerp(60, 0, p)}px` }}><Tile l={l} size={210} glow={0.6 + 0.6 * prog(t, B.hear1 - start, B.hear1 - start + 0.4)} /></div>;
        })}
      </AbsoluteFill>
      <AbsoluteFill style={{ top: 1100, alignItems: "center" }}>
        <div style={{ fontFamily: inter, fontWeight: 800, fontSize: 46, letterSpacing: 10, color: "#fff", opacity: prog(t, B.hear1 - start, B.hear1 - start + 0.5) }}>HOW TO HEAR HIM</div>
      </AbsoluteFill>
    </>
  );
};

/** H: the empty tomb as documented history. */
export const V2Tomb: React.FC<{ start: number }> = ({ start }) => {
  const t = useT();
  const roll = prog(t, 0.3, 2.6, Easing.inOut(Easing.cubic));
  const rays = prog(t, 1.4, 3.4);
  const r = (x: number) => x - start;
  return (
    <>
      <Stage>
        <Bg id="v2tb" top="#1b0f2a" bottom="#f0a050" />
        <Glow cx={540} cy={1010} r={420} c="#ffd27a" o={0.5} />
        <g transform={`rotate(${t * 2.5} 430 960)`} opacity={0.22 * rays}>
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
        </g>
        <rect y={GROUND - 40} width={W} height={700} fill="#24150e" />
        <Motes c="#fff1c7" n={24} seed="v2tb" rise={12} />
      </Stage>
      <LetterBadge l="H" word="HISTORY" />
      <Beats lines={[["Not a feeling.", r(B.resurrection) + 0.4]]} top={420} size={116} out={r(B.documented) - 0.35} />
      {t > r(B.documented) - 0.4 ? <Beats lines={[["Documented", r(B.documented) - 0.2], ["history", r(B.documented) + 0.35, GOLD]]} top={400} size={128} /> : null}
      <Sticker at={r(B.eyewitnesses) - 0.1} x={720} y={1230} rot={4} bg="#fff" size={36}>500+ eyewitnesses · 1 Cor 15:6</Sticker>
    </>
  );
};

/** H, continued: the Dead Sea Scrolls carried that Word through history. */
export const V2Scrolls: React.FC<{ start: number }> = ({ start }) => {
  const t = useT();
  const r = (x: number) => x - start;
  const strip = prog(t, r(B.scrolls), r(B.scrolls) + 0.8);
  const pan = prog(t, r(B.scrolls), r(B.thousand) + 2, Easing.inOut(Easing.sin));
  const pct = Math.round(lerp(0, 95, prog(t, r(B.preserved), r(B.preserved) + 1.4, Easing.out(Easing.cubic))));
  return (
    <>
      <Photo src="hear/qumran-cave.jpg" dur={r(B.thousand) + 2} from={[1.4, 0, 40]} to={[1.7, 50, 70]} />
      <AbsoluteFill style={{ background: "#0b0805", opacity: strip }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 440, height: 720, overflow: "hidden", opacity: strip, boxShadow: "0 0 80px rgba(0,0,0,.8)" }}>
        <Img src={staticFile("hear/isaiah-strip.jpg")} style={{ height: 720, width: 720 * (3840 / 648), maxWidth: "none", filter: "sepia(.15) contrast(1.1) brightness(.9)", transform: `translateX(${lerp(-150, -2500, pan)}px)` }} />
      </div>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(4,8,14,.85), transparent 32%, transparent 62%, rgba(4,8,14,.9))" }} />
      <LetterBadge l="H" word="HISTORY" />
      <Beats lines={[["The Dead Sea", 0.15], ["Scrolls", r(B.scrolls) - 0.1, C.E]]} top={330} size={112} />
      <Sticker at={0.5} x={540} y={760} rot={-3} bg={C.E} size={38} out={r(B.scrolls) + 0.3}>Found 1947 · Qumran</Sticker>
      <AbsoluteFill style={{ top: 960, alignItems: "center" }}>
        <div style={{ width: 860, opacity: prog(t, r(B.preserved) - 0.1, r(B.preserved) + 0.4), background: "rgba(6,8,12,.86)", borderRadius: 30, padding: "24px 34px", border: `3px solid ${C.E}66`, textAlign: "center" }}>
          <div style={{ fontFamily: anton, fontSize: 92, color: C.E, lineHeight: 1 }}>≈{pct}% the same</div>
          <div style={{ fontFamily: inter, fontWeight: 800, fontSize: 28, color: "#fff", marginTop: 8 }}>as copies made 1,000 years later</div>
          <div style={{ height: 10, borderRadius: 5, background: "rgba(255,255,255,.18)", marginTop: 18, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${prog(t, r(B.thousand) - 0.2, r(B.thousand) + 1.2, snap) * 100}%`, background: C.E, boxShadow: `0 0 14px ${C.E}` }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: inter, fontWeight: 800, fontSize: 24, color: "#fff", opacity: 0.8, marginTop: 8 }}>
            <span>~125 BC</span><span>~AD 1000</span>
          </div>
        </div>
      </AbsoluteFill>
      <Credit text={t < r(B.scrolls) + 0.4 ? "Photo: Peter van der Sluijs / CC BY-SA 4.0" : "Great Isaiah Scroll (1QIsa) · public domain"} />
    </>
  );
};

/** E: every page of the Bible, with the verse that says so. */
export const V2Page: React.FC<{ start: number }> = ({ start }) => {
  const t = useT();
  const r = (x: number) => x - start;
  const glow = prog(t, r(B.all), r(B.all) + 1.5);
  return (
    <>
      <Stage>
        <Bg id="v2pg" top="#04121a" bottom="#081c26" />
        <Glow cx={540} cy={1000} r={380} c={C.E} o={0.22 + 0.2 * glow} />
        <g transform={`translate(540 1040) scale(${1 + 0.04 * prog(t, 0, 6)})`}>
          <path d="M-380,-230 Q-190,-270 0,-210 L0,210 Q-190,150 -380,190 Z" fill="#f3ead6" />
          <path d="M380,-230 Q190,-270 0,-210 L0,210 Q190,150 380,190 Z" fill="#e9dfc7" />
          {Array.from({ length: 10 }).map((_, i) => {
            const lit = prog(t, r(B.all) + i * 0.12, r(B.all) + 0.5 + i * 0.12);
            return (
              <g key={i}>
                <rect x={-340} y={-170 + i * 34} width={270 - (i % 3) * 30} height={8} rx={4} fill={lit > 0.5 ? GOLD : "#8a7b62"} opacity={0.5 + 0.5 * lit} />
                <rect x={50} y={-170 + i * 34} width={280 - (i % 2) * 40} height={8} rx={4} fill={lit > 0.5 ? GOLD : "#8a7b62"} opacity={0.5 + 0.5 * lit} />
              </g>
            );
          })}
          <Glow cx={0} cy={-40} r={260} c="#fff1c7" o={0.35 * glow} />
        </g>
        <Motes c="#e8f6ff" n={22} seed="v2pg" rise={12} />
      </Stage>
      <LetterBadge l="E" word="EVERY PAGE" />
      <AbsoluteFill style={{ paddingTop: 360, alignItems: "center", paddingLeft: 80, paddingRight: 80 }}>
        <div style={{ opacity: prog(t, r(B.all) - 0.2, r(B.all) + 0.5), translate: `0 ${lerp(30, 0, prog(t, r(B.all) - 0.2, r(B.all) + 0.7, snap))}px`, background: "rgba(4,10,16,.72)", borderRadius: 30, padding: "34px 40px", textAlign: "center", border: `2px solid ${C.E}44` }}>
          <div style={{ fontFamily: playfair, fontStyle: "italic", fontSize: 64, lineHeight: 1.2, color: "#fff6dc" }}>“All Scripture is breathed out by God.”</div>
          <div style={{ fontFamily: inter, fontWeight: 800, fontSize: 32, color: C.E, marginTop: 16, letterSpacing: 3 }}>2 TIMOTHY 3:16</div>
        </div>
      </AbsoluteFill>
      {t > r(B.everyVoice) - 0.3 ? <Beats lines={[["Every page is", r(B.everyVoice)], ["His voice", r(B.everyVoice) + 0.5, GOLD]]} top={760} size={96} /> : null}
    </>
  );
};

/** A: the people He puts around you, arriving one by one. */
export const V2People: React.FC<{ start: number; center?: (t: number) => React.ReactNode }> = ({ start, center }) => {
  const t = useT();
  const r = (x: number) => x - start;
  const ring: { look: "friend" | "guide" | "preacher" | "buddy"; x: number; s: number; at: number; msg: string; flip?: boolean; pose: Pose }[] = [
    { look: "friend", x: 150, s: 0.78, at: r(B.speaks) + 0.2, msg: "praying for you", pose: { ...REACH, rs: -60, re: -30 } },
    { look: "guide", x: 320, s: 0.7, at: r(B.speaks) + 0.7, msg: "I've been there", pose: OPEN_HANDS },
    { look: "preacher", x: 765, s: 0.7, at: r(B.people) - 0.1, msg: "you're not alone", flip: true, pose: OPEN_HANDS },
    { look: "buddy", x: 935, s: 0.78, at: r(B.people) + 0.4, msg: "I'm here", flip: true, pose: { ...REACH, rs: -60, re: -30 } },
  ];
  return (
    <>
      <Stage>
        <Bg id="v2pp" top="#160a1f" bottom="#1d0d18" />
        <Glow cx={540} cy={1000} r={420} c={C.A} o={0.22 + 0.15 * prog(t, r(B.life) - 0.3, r(B.life) + 0.6)} />
        {ring.map((p, i) => {
          const k = prog(t, p.at, p.at + 0.6, snap);
          return <line key={`l${i}`} x1={p.x} y1={GROUND - 260 * p.s} x2={540} y2={GROUND - 250} stroke={C.A} strokeWidth={3} strokeDasharray="10 12" opacity={0.5 * k} />;
        })}
        <rect y={GROUND - 40} width={W} height={700} fill="#0e0812" />
        {ring.map((p, i) => {
          const k = prog(t, p.at, p.at + 0.6, snap);
          return (
            <g key={i} opacity={k} transform={`translate(0 ${lerp(40, 0, k)})`}>
              <Character look={p.look} pose={p.pose} x={p.x} t={t + i} scale={p.s} flip={p.flip} rim={C.A} />
            </g>
          );
        })}
        {center ? center(t) : <Character look="seeker" pose={posed(t, [[0, HEAD_DOWN], [r(B.people), { ...IDLE, smile: 1, head: -3 }]])} x={540} t={t} scale={0.95} rim={C.A} />}
      </Stage>
      <LetterBadge l="A" word="AROUND YOU" />
      {ring.map((p, i) => (
        <Sticker key={p.msg} at={p.at + 0.25} x={p.x + (p.x < 540 ? 40 : -40)} y={610 + (i % 2) * 80} rot={i % 2 ? 4 : -4} bg={i % 2 ? C.A : "#fff"} color={i % 2 ? "#fff" : INK} size={30}>{p.msg}</Sticker>
      ))}
      {center ? null : <Beats lines={[["The people", r(B.people) - 0.1], ["He puts in your life", r(B.people) + 0.35, C.A]]} top={330} size={96} />}
    </>
  );
};

/** R, part 1: the rearview mirror, "look back". */
export const V2Mirror: React.FC<{ start: number; end: number }> = ({ start, end }) => {
  const t = useT();
  const r = (x: number) => x - start;
  const push = prog(t, r(B.look) + 0.4, end - start, Easing.inOut(Easing.cubic));
  return (
    <>
      <Stage>
        <rect width={W} height={H} fill="#04050a" />
        <path d={`M500,880 L580,880 L1000,${H} L80,${H} Z`} fill="#10121a" />
        {Array.from({ length: 6 }).map((_, i) => {
          const ph = (i / 6 + t * 0.35) % 1;
          return <rect key={i} x={536 - ph * 14} y={880 + ph * ph * 1040} width={8 + ph * 28} height={20 + ph * 70} fill="#3a3d48" />;
        })}
        <path d={`M0,1260 Q540,1150 1080,1260 L1080,${H} L0,${H} Z`} fill="#0a0b10" />
        <g transform={`translate(540 ${lerp(430, 900, push)}) scale(${lerp(1, 4.5, push)})`}>
          <rect x={-250} y={-95} width={500} height={190} rx={70} fill="#0c0d12" stroke="#2a2c35" strokeWidth={10} />
          <clipPath id="v2mir"><rect x={-236} y={-82} width={472} height={164} rx={60} /></clipPath>
          <g clipPath="url(#v2mir)">
            <rect x={-240} y={-90} width={480} height={180} fill="#2b1a36" />
            <rect x={-240} y={-90} width={480} height={90} fill="#ff9a5c" opacity={0.45} />
            <path d="M-30,-10 L30,-10 L170,90 L-170,90 Z" fill="#ffd27a" opacity={0.85} />
            <path d="M-200,40 C-100,-20 0,80 100,10 S220,40 240,0" fill="none" stroke="#e0263a" strokeWidth={5} strokeDasharray="600" strokeDashoffset={600 * (1 - prog(t, r(B.look), r(B.look) + 1.4))} />
          </g>
        </g>
      </Stage>
      <LetterBadge l="R" word="REARVIEW" />
      <Beats lines={[["Look", r(B.look) - 0.1], ["back.", r(B.look) + 0.25, C.R]]} top={1250} size={130} out={end - start - 0.5} />
    </>
  );
};

/** R, part 2: moments of a life on a board, tied together by one red thread, each marked with a fingerprint. */
export const V2Thread: React.FC<{ start: number }> = ({ start }) => {
  const t = useT();
  const r = (x: number) => x - start;
  const cards: { x: number; y: number; rot: number; label: string; at: number; icon: React.ReactNode }[] = [
    { x: 300, y: 560, rot: -6, label: "the closed door", at: r(B.closed), icon: <g><rect x={-50} y={-70} width={100} height={140} rx={6} fill="#5b3a22" /><circle cx={30} r={7} fill={GOLD} /></g> },
    { x: 780, y: 760, rot: 5, label: "the right person", at: r(B.right), icon: <g fill="#e2b04a"><circle cx={-28} cy={-34} r={24} /><circle cx={28} cy={-34} r={24} fill="#8fb0ff" /><path d="M-60,50 Q-28,-10 4,50 Z" /><path d="M-4,50 Q28,-10 60,50 Z" fill="#8fb0ff" /></g> },
    { x: 290, y: 930, rot: 4, label: "the hard season", at: r(B.right) + 0.9, icon: <g><ellipse cx={0} cy={-20} rx={60} ry={30} fill="#5d6577" /><path d="M-30,20 L-40,50 M0,20 L-10,50 M30,20 L20,50" stroke="#8fb0ff" strokeWidth={6} /></g> },
    { x: 560, y: 1200, rot: -5, label: "today", at: r(B.red) - 0.2, icon: <g><circle cy={20} r={40} fill="#ffc94d" /><rect x={-70} y={20} width={140} height={50} fill="#2a1520" /></g> },
  ];
  const threadP = prog(t, r(B.closed) - 0.2, r(B.red) + 1.0, Easing.inOut(Easing.sin));
  const d = "M140,420 C260,480 260,560 300,600 S700,660 780,800 S360,860 290,970 S480,1120 560,1220 S700,1330 760,1300";
  const printsAt = r(B.fingerprints);
  return (
    <>
      <Stage>
        <Bg id="v2th" top="#120c10" bottom="#1d1418" />
        <Glow cx={540} cy={880} r={460} c="#ff4a5a" o={0.12 + 0.1 * prog(t, r(B.red), r(B.red) + 1)} />
        {cards.map((c, i) => {
          const k = prog(t, c.at - 0.2, c.at + 0.5, backOut);
          return (
            <g key={i} transform={`translate(${c.x} ${c.y}) rotate(${c.rot}) scale(${k})`} opacity={Math.min(1, k * 1.5)}>
              <rect x={-150} y={-150} width={300} height={330} rx={10} fill="#f4efe4" style={{ filter: "drop-shadow(0 18px 24px rgba(0,0,0,.5))" }} />
              <rect x={-130} y={-130} width={260} height={230} rx={4} fill="#1c1a24" />
              <g transform="translate(0 -15)">{c.icon}</g>
              <circle cx={0} cy={-148} r={9} fill="#c42a3a" />
              <g opacity={prog(t, printsAt + i * 0.18, printsAt + 0.6 + i * 0.18)}>
                <Fingerprint x={95} y={60} s={0.75} p={prog(t, printsAt + i * 0.18, printsAt + 1.1 + i * 0.18)} c="#c9973a" />
              </g>
            </g>
          );
        })}
        <path d={d} fill="none" stroke="#e0263a" strokeWidth={7} strokeLinecap="round" strokeDasharray="3200" strokeDashoffset={3200 * (1 - threadP)} style={{ filter: `drop-shadow(0 0 ${6 + 10 * prog(t, r(B.red), r(B.red) + 0.8)}px #ff3a4a)` }} />
      </Stage>
      <AbsoluteFill>
        {cards.map((c, i) => {
          const k = prog(t, c.at, c.at + 0.5);
          return (
            <div key={i} style={{ position: "absolute", left: c.x - 150, top: c.y + 108, width: 300, textAlign: "center", rotate: `${c.rot}deg`, fontFamily: inter, fontWeight: 800, fontSize: 28, color: "#2a2228", opacity: k }}>
              {c.label}
            </div>
          );
        })}
      </AbsoluteFill>
      <LetterBadge l="R" word="REARVIEW" />
      {t < printsAt - 0.3 ? (
        <Beats lines={[["One red thread", r(B.red) - 0.05, "#ff4a5a"]]} top={330} size={100} out={printsAt - 0.5} />
      ) : (
        <Beats lines={[["His fingerprints", printsAt - 0.1], ["everywhere", printsAt + 0.4, GOLD]]} top={300} size={100} />
      )}
    </>
  );
};

/* ---------- Edit ---------- */

export const HearV2: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const musicVol = interpolate(
    t,
    [0, 1.5, B.heres - 0.3, B.H - 0.1, B.H + 0.8, B.whisper - 0.3, B.whisper + 0.5, END, V2_SECONDS],
    [0, 0.38, 0.4, 0.62, 0.44, 0.44, 0.66, 0.66, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const mirrorEnd = B.closed - 0.15;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {V2_PLACEHOLDER ? null : <Audio src={staticFile("hear/vo2.mp3")} volume={1.25} />}
      {V2_PLACEHOLDER ? null : <Audio src={staticFile("hear/score-v2.wav")} volume={musicVol} />}
      <Scene from={0} to={B.but - 0.2} shots={[[0, 1.02, 0.5, 0.55]]} push={0.07}><V2Room /></Scene>
      <Scene from={B.but - 0.2} to={B.heres - 0.15} xf={0.8} push={0.04}><V2Listen start={B.but - 0.2} /></Scene>
      <Scene from={B.heres - 0.15} to={B.H - 0.1} xf={0.7} push={0.03}><V2Tiles start={B.heres - 0.15} /></Scene>
      <Scene from={B.H - 0.1} to={B.dead - 0.2} xf={0.7} push={0.04}><V2Tomb start={B.H - 0.1} /></Scene>
      <Scene from={B.dead - 0.2} to={B.E - 0.1} xf={0.8} push={0.03}><V2Scrolls start={B.dead - 0.2} /></Scene>
      <Scene from={B.E - 0.1} to={B.A - 0.1} xf={0.8} push={0.03}><V2Page start={B.E - 0.1} /></Scene>
      <Scene from={B.A - 0.1} to={B.R - 0.1} xf={0.8} push={0.03}><V2People start={B.A - 0.1} /></Scene>
      <Scene from={B.R - 0.1} to={mirrorEnd} xf={0.8}><V2Mirror start={B.R - 0.1} end={mirrorEnd} /></Scene>
      <Scene from={mirrorEnd} to={B.whisper - 0.15} xf={0.6} push={0.04}><V2Thread start={mirrorEnd} /></Scene>
      <Scene from={B.whisper - 0.15} to={B.comment - 0.1} xf={0.9} push={0.04}><SWhispering /></Scene>
      <Scene from={B.comment - 0.1} to={END} xf={0.7} push={0.02}><Shift by={0.2}><SCta /></Shift></Scene>
      <Sequence from={Math.round(END * FPS)}>
        <EndCard logo title="You can HEAR Him" sub="History · Every page · Around you · Rearview" credit="Dead Sea Scroll & Qumran photos via Wikimedia Commons (public domain, CC BY-SA 4.0 Peter van der Sluijs)" />
      </Sequence>
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
