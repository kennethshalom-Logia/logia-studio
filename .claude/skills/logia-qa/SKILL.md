---
name: logia-qa
description: The checks every Logia reel passes before Ken sees it: contact sheets, overlap and text-overflow review, duration cap, loop check, render verification, and the final report. Load before rendering and before reporting.
---

# Checking a Logia reel

Nothing is reported as done until these have been run and looked at.

## 1. Contact sheets

```bash
SCALE=0.4 COLS=4 node scripts/sheet.js <CompId> 0.4,2.2,3.6,... out-name.png
```

Pick times from the narration timings so that **every scene appears at least twice**: once just after it starts
and once on its gag. Add the first and last half-second of the reel. Open the sheet and look at every tile.

For each tile ask:

- Do any two elements overlap that should not (card over title, receipt over chat, tag over card)?
- Does any text leave its box, photo frame or the screen edge?
- Is the host's face doing something that matches the caption?
- Is the gag visible at this moment, or did it fire too early or late?
- Is anything important under the captions (y 1480–1750) or the platform buttons?
- Is there a tile where nothing is happening?

Fix, re-sheet only the affected times, repeat until clean. Small fixes are position, size and timing numbers; do
not redesign a scene to fix an overlap.

## 2. Length

`src/data/<reel>.json` → `total`. The composition is `total + 0.2` seconds. It must be **under 40.0**. Check
before building scenes and again after any voice change.

## 3. Loop

Compare the last frame and frame 0 in a sheet. Same world, same framing, host in the same place. The loop line's
caption should still be on screen at the end.

## 4. Render and verify

```bash
node scripts/render-hear.js <CompId>
npx remotion ffprobe -v error -show_entries stream=codec_name,width,height,duration -of csv=p=0 out/<file>.mp4
```

Expect h264 1080×1920 and an aac audio stream of the same duration. Pull one frame from the finished file with
ffmpeg near the end and look at it: it should match the sheet.

Renders take several minutes. Run them in the background and wait for completion rather than polling.

## 5. Report

Lead with the file and its length. Then, briefly:

- the critique and ratings from the script step
- what was cut to fit, and what was invented (names, bubble text)
- sources for every factual claim
- which shots are 3D
- voice credits spent
- **what was not verified**: the audio is never listened to from the agent side, so say so, and name any newly
  recorded lines. If a quote was paraphrased from memory, say that too.

## 6. Learn

If Ken corrects something that would apply to the next reel, write it into `CLAUDE.md` (hard rules) or the
matching skill in the same session.
