---
name: logia-music
description: How to score a Logia reel like a world-class film composer and producer: one motif, an emotional arc that follows the script, a build that lifts under the answer, silence before the turn, and sound design on every hit. Load before writing or changing any reel's music and sound cue.
---

# Scoring a Logia reel

Ken's standing brief: *make the music like Hans Zimmer, like the number one producer in the world, music that
captivates people.* That is about approach, not about imitating anyone's tracks. What makes that kind of score
work, and what to do here:

## The principles

1. **One motif, not a playlist.** Pick three or four notes and a pulse. Everything in the reel is that idea
   growing: stated quietly in the hook, withheld in the doubt, inverted in the lament, full in the answer. A
   viewer should be able to hum the reel.
2. **A pulse that never quite stops.** A steady eighth-note ostinato under the answer section, each bar a little
   louder and brighter than the last. The lift is felt more than heard.
3. **Low end with weight.** A sustained low note under the problem. A sub hit on every title, drop and stamp.
4. **Silence is the loudest cue.** Cut everything for a breath before the turn and before the last line. The
   music's return is the emotion.
5. **Harmony tells the story.** Minor and unresolved while the question is open (D minor, B♭, a held fifth with
   no third). Resolve to the major only when the answer is said out loud, and stay there.
6. **Comedy is timing.** Jokes get dry plucks, a "choir of angels" that cuts dead, a hollow clunk and crickets on
   "Nothing". Never score a joke with a joke sound that lands late.
7. **Leave the voice alone.** Nothing melodic in the voice's range while he is speaking; the mix ducks
   automatically, but a busy melody still fights the words.
8. **End on the loop.** The last sound is the same sound as the first (the "Seen" tick), so the reel rejoins itself.

## How it is made here

`scripts/make-audio-<reel>.js` is a small synthesiser plus a cue sheet. It reads the narration timings, so music
moves with the edit. Copy `make-audio-seen.js`, keep the instruments and the mix section, rewrite the cue.

Instruments available:

- `pad(notes, start, dur, {gain, atk, rel, harm, bright})` — strings/choir/organ depending on `harm` and `bright`
- `piano(note, start)`, `stac(note, start)` — melody and plucked ostinato
- `boom`, `clunk`, `whoosh`, `ding`, `buzz`, `shimmer`, `pages`, `steps`, `roomtone`, `rain`, `wind`, `rumble`,
  `fire`, `heartbeat` — sound design
- Notes are MIDI numbers; `S("lineId")` and `At("lineId", "word")` give times; `END` is the end of narration.

Write the cue in script order with one comment per scene saying what the music is doing emotionally. The
reference cue for "God left me on seen": night drone and one deadpan piano note → plucks and clunks for the
failed prayers → sudden bright choir on "O Heavenly Father", cut dead → harp in D for David turning to D minor on
the lament → bare B♭ for Mother Teresa, warming to F at sunrise → notification dings and a riser into the turn →
D minor–B♭–F–C ostinato building through the four points with a hit on each number → G to D major on "It's him",
held to the end → the tick again.

## Arc template for a 40-second reel

| Seconds | Script | Music |
| --- | --- | --- |
| 0–2 | hook | one sound from the metaphor, a low drone, the motif once |
| 2–9 | escalation | dry, rhythmic, a hit on each beat of the rule of three |
| 9–28 | receipts | the motif in a new colour for each person; minor for the cost, a small lift for the "so what" |
| turn | one line | everything stops, then a riser |
| answer | list or payoff | ostinato builds bar by bar, sub hit on each point |
| payoff | hook resolved | major chord, wide and high, held |
| loop | trailing line | strip back to the opening sound |

## Before calling it done

- Does the first second have a sound that makes someone look up?
- Is there exactly one moment of near silence?
- Does the major chord arrive on the answer word, not before?
- Is every on-screen hit (drop, stamp, cut) matched by a sound within two frames?
- Peak printed by the script is normal up to about 1.5; the mix soft-clips. If it prints much higher, lower gains.

## Limits, said plainly

This is a synthesised score: pads, plucks, piano and percussion, with reverb. It can be shaped like a film cue but
it will not sound like a recorded orchestra. The agent cannot listen to it, so Ken must. If a reel needs real
orchestral or vocal texture, the options are a licensed track or an AI music generator through a connector; neither
has been used or tested in this studio yet, and either would need its own licence check.
