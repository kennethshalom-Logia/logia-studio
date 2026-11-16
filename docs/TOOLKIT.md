# Toolkit: what the studio uses and what is worth adding

Status is as of 16 November 2026 on the machine the studio was built on.

## In use

| Tool | Job | Status |
| --- | --- | --- |
| [Remotion](https://remotion.dev) | video is React code; every frame is deterministic | installed, all reels rendered with it |
| ElevenLabs (Claude connector) | narration in the "Ken" voice, `eleven_v4` | connected and used |
| ffmpeg (bundled with Remotion) | audio conversion, tempo, frame grabs | used via `npx remotion ffmpeg` |
| Node scripts in `scripts/` | narration assembly, procedural music and SFX, contact sheets, renders | written for this studio |
| [Blender](https://www.blender.org) | 3D background plates (`blender/plates.py`) | scripts exist from earlier reels; not run for the "Seen" reels; `blender` was not on PATH |

## Skills in this repo (the method)

| Skill | What it holds |
| --- | --- |
| `reel` | the one-command entry point |
| `logia-script` | research, metaphor, hooks, structure, word budget, two-parters, critique-rate-fix |
| `logia-voice` | voice id, tags, chunking, assembly, trimming to 40 s |
| `logia-design` | palette, host, framing, safe zones, building blocks, music cue |
| `logia-music` | scoring like a film composer: motif, arc, build, silence, sound design |
| `logia-3d` | when 3D earns its place, Blender plates, React Three Fiber route |
| `logia-qa` | contact sheets, overflow and overlap checks, loop, render verification, report |

## Worth adding from outside

| Addition | Why | Notes |
| --- | --- | --- |
| [Remotion's Claude Code plugin / agent skills](https://remotion.dev/docs/ai/claude-code-plugin) | Remotion's own rules for animation, audio, captions, 3D | official; install commands are on that page. A `remotion-best-practices` skill was already available in the build session. |
| [`@remotion/three`](https://remotion.dev/docs/three) + React Three Fiber | simple 3D objects inside a composition without a Blender round-trip | not installed yet; drive motion from `useCurrentFrame()`, never `useFrame()` |
| Blender connector (MCP) | lets the agent build and inspect scenes in a running Blender | a Blender connector was configured in the build session but not exercised. The widely used community one is [ahujasid/blender-mcp](https://github.com/ahujasid/blender-mcp) (third-party). |
| Blender skill packs (modeling, lighting, cameras, toon and low-poly styles) | better sets and props | present in the build session's skill list; none were needed for the flat reels |
| Local Whisper | word-accurate caption timing from the real audio | already used in the GMILC recap project; here, word timings are estimated between detected pauses, which is close but not exact |
| [Remotion `template-three`](https://github.com/remotion-dev/template-three) | reference for the R3F route | starter project to copy patterns from |

## Deliberately not used

- **AI video generators** for the main picture. They cannot hold the host, the palette or readable text from shot to
  shot, and a reel that is code can be re-timed in seconds when a line changes.
- **Stock music.** The procedural score follows the narration timings exactly and has no licence to track.
- **A second voice.** One voice is the brand.

## What a repo cannot carry

The method is here in writing. The model that follows it is whichever Claude model the session runs on. A stronger
model will make better jokes and catch more in the contact sheets; a weaker one will still follow the steps, the
budget and the rules. Prefer the most capable model available for the script step in particular.
