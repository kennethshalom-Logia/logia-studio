---
name: logia-voice
description: How Logia narration is generated with ElevenLabs and assembled into timed audio: voice id, emotion tags, chunking, download, pause tightening, sentence timing fixes, and hitting the 40-second cap. Load before generating or re-timing any Logia voiceover.
---

# Logia voice

## The voice

- Voice id `UwYZo61f8CUbJDbL8gb3` (named "Ken" in the ElevenLabs workspace), model `eleven_v4`.
- This is the only approved voice. A local clone was tried and rejected.
- Needs the ElevenLabs connector. If it is not connected, stop and say so; do not substitute another voice.

## Generating

1. Split the script into **chunks of one scene each** (2–7 short sentences). Shorter chunks give better timing;
   one chunk per scene keeps the performance connected.
2. For each chunk call `creative_generate_speech` with `generations_count: 1`, the voice id, `eleven_v4`, and the
   same `flow_id` for the whole reel.
3. Direct the performance with tags in square brackets before each sentence:
   `[deadpan, dry] God left me on seen.` · `[deep, booming, pompous preacher voice] O Heavenly Father!` ·
   `[warm, steady]` · `[amused, trailing off as if about to continue] So the next time you think...`
   Give every sentence its own tag; change tag where the emotion changes. End loop lines with `...`.
4. Read the result with `creative_get_flow_run_status`, then download the `content_url` with curl to
   `public/<reel>/<chunk>.mp3`. You can start the next chunk while downloading the previous one.
5. Each chunk costs roughly 25 credits per second of audio. A 40-second reel is about 1,000 credits. Report the total.

Never regenerate a chunk just to retry; each call is charged. Regenerate only when the line changes.

## Sentence list

`src/data/<reel>-lines.json` is an array of chunks:

```json
{ "id": "pray", "gap": 0.2, "sents": [["p1", "I prayed."], ["n1", "Nothing."]], "pick": [1, 2], "drop": [3] }
```

- `sents`: `[id, caption text]` per sentence. Scenes refer to these ids, so name them once and keep them.
- `gap`: silence after the chunk (0.2 normally, 0.15 on the last).
- `pick` (optional): which detected pauses are the sentence boundaries, when the automatic choice is wrong.
- `drop` (optional): sentence indexes to cut out of the audio. This is how a reel is trimmed without re-recording.

## Assembling

```bash
VO_DIR=<reel> LINES=<reel>-lines.json OUT=<reel>.json WAV=vo.wav TEMPO=1.1 CAP=0.2 GAPS=1 node scripts/vo-seen.js
```

It converts each mp3, speeds it by `TEMPO`, shortens every pause longer than `CAP` seconds, finds where each
sentence starts, and writes `public/<reel>/vo.wav` plus `src/data/<reel>.json` (line and word timings, per-frame
loudness for the host's mouth).

**Read what it prints.** Each chunk line shows the sentence edges; `GAPS=1` also lists every pause with its
original length. A boundary is wrong when a short sentence gets an implausible duration, typically because the
voice paused after "One:" or "Four:". Fix it by adding `pick` with the right pause indexes and re-running. Then
print the lines with their start and end and sanity-read them once.

## Hitting 40 seconds

Standard settings are `TEMPO=1.1 CAP=0.2`. Do not go faster than 1.12; it starts to sound rushed.
If the total is over 39.8 seconds, cut words, in this order: a repeated idea, a transition sentence, the weaker of
two examples. Use `drop` when the sentence is cleanly separable; otherwise rewrite and re-record that one chunk.

## What cannot be checked here

The audio cannot be listened to from the agent side. Timing, loudness envelope and duration can be measured; tone
and pronunciation cannot. Always tell Ken to listen before posting, and name any line that was newly recorded.
