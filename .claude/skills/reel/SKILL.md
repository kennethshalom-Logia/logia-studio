---
name: reel
description: Make a complete Logia reel from one idea. Use as /reel <idea>. Runs research, script, voice, build, checks and render, and returns the finished video.
---

# /reel

The text after `/reel` is Ken's idea. Hand it to the `logia-director` agent's process (see
`.claude/agents/logia-director.md`) and run it yourself in this session: do not ask Ken to confirm each step.

Choose a short lowercase reel id from the idea (for example `seen`, `doubt`, `late`). Use it everywhere:

- `public/<id>/` voice chunks
- `src/data/<id>-lines.json` sentence list, `src/data/<id>.json` timings
- `src/flat/<Id>.tsx` the composition, registered in `src/Root.tsx` as `<Id>`
- `scripts/make-audio-<id>.js` the music cue
- `out/Logia-<ID>-<Title>.mp4` the render (add the name to the map in `scripts/render-hear.js`)

Skills to load along the way: `logia-script`, `logia-voice`, `logia-design`, `logia-music`, `logia-3d`, `logia-qa`.

Finish with the report described in the director file.
