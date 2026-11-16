---
name: logia-design
description: The Logia visual system for reels built in Remotion: host character, creator-bust framing, safe zones, palette, fonts, cards, camera moves, scene-per-beat rule and the music cue. Load before designing or coding any Logia scene.
---

# Logia design

Reference implementation: `src/flat/Seen.tsx`. Start a new reel by copying its structure, not by inventing one.

## The look

Flat storybook world: cream paper, beige hills, thick ink outlines, flat colour, blank-faced stick extras, and a
camera that never sits still. Canvas 1080×1920, 30 fps.

| Token | Value | Use |
| --- | --- | --- |
| INK | `#1d1a1a` | every outline, 5–8 px |
| CREAM / SAND / HILL | `#f5f0e5` / `#ece1cb` / `#e4d4b6` | day world |
| NIGHT | `#2b3352`, deep `#1a1f33` | bedroom, phone scenes |
| RED | `#d93a3a` | the one keyword in a title, errors, badges |
| GOLD | `#f2c94c` | holy or hopeful keywords, the cross |
| Hoodie | `#f0b541` | host only; nothing else is mustard |
| Chat blue | `#3478f6`, ticks `#34a7f1` | phone UI |

Fonts: Anton for burned-in titles (white, ink stroke, one coloured keyword), Inter 800 for captions, cards and
labels, Playfair italic only for parody "holy" text.

## The host

`Creator` in `src/flat/Creator.tsx`. Curly black hair, glasses, moustache, **clean jaw**, brown skin, mustard hoodie
with the λόγια wordmark. Fully vector so the face acts: `talk`, `smile` (−1…1), `brow` (−1 worried…1 stern),
`wide`, `lid`, `lx`/`ly` pupils, `sweat`. Mouth follows the voice loudness via `talkAt(t)`.

**Creator-bust framing** (`Host` in Seen.tsx): `x=540, y=2140, s=2.0`. Head top lands near y≈910, face centre
near y≈1210. This is the default for any line spoken to camera. Use a full-body `Creator` at `s≈1.2` only for
physical comedy (kneeling, shouting, slumped on the bed).

Give the face a reason on every line: where is he looking, what just changed? A still face for two seconds is a
dead frame.

## Safe zones

- y 90–150, left: part tag only.
- y 170–440: burned-in `Title` (two lines maximum).
- y 440–900: the prop zone, where chat cards, receipts, tiles and objects live.
- y 900–1450: the host's head.
- y 1480–1750: captions (`<Captions top={1480} />`). Nothing important underneath.
- Below 1750 and the right 150 px: platform buttons. Keep clear.

Before rendering, check that no two things occupy the same zone at the same moment.

## One scene per beat, one gag per scene

Each sentence group gets its own `Shot` with its own world, and each world has exactly one visual idea that lands
on a word:

- a thing **drops** (the Bible landing on the "waiting for voice note" bubble, with camera shake)
- a thing **gets stamped or crossed out** (`XMark` on "Seen", "MISSED", "DELETED SCENE" then "KEPT")
- a **count** piles up (three "Seen" pills, four notification badges)
- the **camera crashes in** on his face ("Who told you?!")
- a **line draws itself** through the frame (the red thread)

Time the hit with `At("lineId", "word")`, never a typed number.

## Building blocks (`src/flat/World.tsx`)

- `Shot from to keys shake enter exit` — a scene with a keyframed camera `[time, zoom, centreX, centreY]`.
  Every shot moves: a slow push (1.0 → 1.08) at minimum. Zoom-through transitions are the default cut.
- `Title lines at until size top` — burned-in headline. `[["1", RED], ["his word", "#fff"]]` colours a keyword.
- `Receipt at until head body y rot` — the source card. Every verse and factual claim gets one.
- `XMark`, `Bubble`, `Person`, `Land`, `Cloud`, `CrossMark`, `Phone`.
- Timing helpers: `pr(t, a, b)` progress, `pop`, `boing` (overshoot pop), `posed(t, keyframes)` for body poses.
- In `Seen.tsx`: `ChatCard`, `SeenPill`, `MsgPill`, `Tile`, `Card`, `Snap` (polaroid), `NightRoom`, `Bed`,
  `BigBible`, `Sister`, `David`. Reuse before drawing new ones.

## People and care

Extras are blank-faced stick figures. Real people are drawn the same way, identified by one respectful attribute
(a crown and harp, a white sari with blue borders) and a title card. No caricature faces of real people.

## Text rules

- Any text inside a box must fit with margin at the longest string. Size it for the worst case, then look at it
  in the contact sheet. Ken has flagged overflow as a bug.
- No black call-to-action box over the ending. A part tag and one `Receipt` are the most chrome a frame carries.
- Captions carry the words; titles carry the one phrase worth remembering. Do not put the whole sentence in a title.

## Music and sound

Copy `scripts/make-audio-seen.js` to `scripts/make-audio-<reel>.js` and rewrite only the cue section. It reads the
same timings as the video (`S(id)`, `At(id, word)`), so sound follows any re-time. The pattern:

- a whoosh on every cut, a hit on every stamp or drop, a ding on every notification
- a low pad under the problem, plucks under jokes, a driving ostinato under a list
- silence or a held chord before the turn; resolve to D major on the answer
- music ducks under speech automatically

## Loop

The last shot re-creates the first shot's composition (same world, same host pose) with a fade in, while the loop
line plays, so the final frame cuts cleanly to frame 0.
