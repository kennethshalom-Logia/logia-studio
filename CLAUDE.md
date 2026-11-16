# Logia Studio

Logia (λόγια) is Ken's Christian content brand for young people in India: short vertical reels that take one hard
faith question, make it funny in the first three seconds, and answer it honestly with receipts on screen.

This repo is the whole studio: the method (skills), the director agent, and the Remotion code that renders the reels.

## How to work here

When Ken gives an idea for a reel, act as the director: run the pipeline below end to end and come back with a
rendered video, not a plan. Use `/reel <idea>` or the `logia-director` agent. Each step has a skill; load it before
doing that step.

| Step | Skill | Output |
| --- | --- | --- |
| 1. Research | `logia-script` | sourced facts, verses, one India anchor |
| 2. Script | `logia-script` | hook options, script, critique, rating, fixed script |
| 3. Voice | `logia-voice` | `public/<reel>/*.mp3`, `src/data/<reel>.json` |
| 4. Design and build | `logia-design` (+ `logia-3d` when 3D helps) | `src/flat/<Reel>.tsx` |
| 4b. Score | `logia-music` | `scripts/make-audio-<reel>.js`, `public/<reel>/mix.wav` |
| 5. Check | `logia-qa` | contact sheets reviewed, fixes applied |
| 6. Render | `logia-qa` | `out/Logia-<REEL>.mp4`, duration verified |

Do not stop between steps to ask permission. Stop only for a decision that is Ken's: a theological claim you cannot
source, a real person's exact words, or spending beyond the normal voice credits for one reel.

## Hard rules (from Ken)

- **40 seconds maximum per reel.** A longer idea becomes Part 1 and Part 2, each with its own hook.
- **Every reel loops.** The last spoken line trails off ("…") and runs grammatically into the first line.
- **Part 2 must link back.** Hook, then a "Previously in Part 1" beat, then a spoken segue before the list begins.
- **The host has no beard.** Curly black hair, glasses, moustache, clean jaw, mustard hoodie. Do not redesign him.
- **Text never leaves its container.** Check every card, label and photo frame in the contact sheet.
- **No black call-to-action boxes** over the ending. If a CTA is wanted, Ken will ask.
- **Voice:** ElevenLabs voice `UwYZo61f8CUbJDbL8gb3` ("Ken"), model `eleven_v4`. No other voice.
- **Music:** score every reel like a top film composer would: one motif, a build under the answer, silence
  before the turn (see `logia-music`). Ken used to ask for this by hand; it is now the default.
- **3D is for sets and props.** The host stays 2D. Ken has rejected every 3D character so far.
- **Receipts.** Every factual claim or verse gets a source card on screen. Paraphrase people unless the exact
  quote has been checked against the source.

## Commands

```bash
npm install                                  # once
npm run dev                                  # Remotion Studio preview
node scripts/vo-seen.js                      # assemble narration (env: VO_DIR, LINES, OUT, WAV, TEMPO, CAP)
node scripts/make-audio-seen.js              # music + SFX mix (env: AUDIO_DATA, AUDIO_OUT)
node scripts/sheet.js <CompId> 1.0,5.2,9 x.png   # contact sheet at those seconds (env: SCALE, COLS)
node scripts/render-hear.js <CompId>         # final render to out/
```

## Map

- `src/flat/World.tsx` — the flat storybook kit: `Shot` (keyframed camera), `Title`, `Receipt`, `XMark`, `Person`, scenery.
- `src/flat/Creator.tsx` — the host character (vector, acting face).
- `src/flat/Seen.tsx` — reference reel ("God left me on seen", full cut + Part 1 + Part 2). Copy its structure.
- `src/Kit.tsx` — fonts, poses, `Captions`.
- `scripts/vo-seen.js` — narration assembler: caps pauses, finds sentence starts, writes timings + mouth envelope.
- `scripts/make-audio-seen.js` — procedural score and sound effects, cued from the narration timings.
- `blender/` — Python scripts that render 3D background plates.
- `docs/` — setup guide, toolkit list, and the worked example.

## Honesty

Report what was checked and what was not. Frames can be inspected; audio cannot be listened to from here, so say
so every time. If a render fails or a number is estimated, say that plainly.
