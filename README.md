# Logia Studio

Short faith reels for young people in India, made as code. Give the agent one idea; it researches, writes,
records, builds, checks and renders a vertical video of 40 seconds or less.

```
/reel Why doesn't God answer when I pray?
```

## What is here

- **`CLAUDE.md`** — the studio's rules. Claude reads it automatically.
- **`.claude/agents/logia-director.md`** — the director agent.
- **`.claude/skills/`** — the method, one playbook per craft: script, voice, design, music, 3D, quality checks, and `/reel`.
- **`src/`** — Remotion compositions. `src/flat/Seen.tsx` is the reference reel; `src/flat/Creator.tsx` is the host.
- **`scripts/`** — narration assembly, music and sound, contact sheets, rendering.
- **`blender/`** — Python scripts for 3D background plates.
- **`docs/SETUP.md`** — step-by-step setup. **`docs/TOOLKIT.md`** — tools and add-ons. **`docs/reels/seen.md`** — worked example.

## Quick start

```bash
npm install
```

```bash
npm run seen:audio
```

```bash
npm run dev
```

Full instructions, including the ElevenLabs and Blender connections, are in [docs/SETUP.md](docs/SETUP.md).

## Licence

Private. Remotion has its own licence terms for companies: https://remotion.dev/license
