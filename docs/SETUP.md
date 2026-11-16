# Setup: from a fresh machine to your first reel

Follow these once per computer. Windows is assumed (that is what the studio was built on); Mac steps are the same
apart from installers.

## 1. Install the basics

| What | Why | Get it |
| --- | --- | --- |
| Node.js 22 or newer | runs Remotion and the scripts | https://nodejs.org |
| Git | version control | https://git-scm.com |
| GitHub CLI | sign in and push | https://cli.github.com |
| Claude Code (desktop app or CLI) | the agent | https://claude.com/claude-code |
| Blender 4.x | 3D plates and props | https://www.blender.org/download |
| uv | runs the Blender connector | https://docs.astral.sh/uv |

After installing Blender, add its folder to PATH so `blender --version` works in a terminal. On the machine this
was built on, Blender was not on PATH; the 3D scripts need it.

## 2. Get the repo

```bash
gh auth login
```

```bash
gh repo clone kennethshalom-Logia/logia-studio
```

```bash
cd logia-studio && npm install
```

## 3. Connect the services inside Claude

Open the repo folder in Claude Code, then in the app's connector settings:

1. **ElevenLabs** — required. The voice `UwYZo61f8CUbJDbL8gb3` ("Ken") lives in your ElevenLabs workspace, so sign
   in with the same ElevenLabs account. Without it the agent cannot record narration.
2. **Blender** — for 3D. Install the Blender connector, open Blender, enable its add-on, and keep Blender running
   while the agent works on 3D shots. (Community alternative: `claude mcp add blender uvx blender-mcp` plus the
   add-on from github.com/ahujasid/blender-mcp. It is third-party, not made by Blender.)
3. **Web search** — on by default; used for research.

Optional: the official Remotion plugin for Claude Code, which adds Remotion's own best-practice skills. See
https://remotion.dev/docs/ai/claude-code-plugin for the current install commands.

## 4. Check that it works

```bash
npm run dev
```

Remotion Studio opens in the browser. Pick `Seen1` or `Seen2` and press play. The voice and music for these two
reels are rebuilt from the mp3 chunks in `public/seen/`:

```bash
npm run seen:audio
```

Then render one:

```bash
node scripts/render-hear.js Seen1
```

The file appears in `out/`.

## 5. Make a reel

In Claude Code, in this folder, type your idea after `/reel`:

```
/reel Why does God feel closer to everyone else at youth camp than to me?
```

The agent researches, writes and critiques the script, records the voice, builds and checks the scenes, renders,
and reports back with the file. Expect 20–40 minutes and roughly 1,000 ElevenLabs credits for a 40-second reel.

When you give notes ("too long", "that card is ugly", "add a segue"), it applies them and writes the lasting ones
into the rules so the next reel starts from there.

## 6. What is not in the repo

- `node_modules/`, `out/` (rendered videos) and Blender render output: rebuilt locally.
- Generated `.wav` files: rebuilt by the scripts from the mp3 chunks.
- Audio for the older reels (HEAR, Hitler in Heaven): kept only on the original machine. Their code is here, but
  they will not render elsewhere until that audio is copied into `public/`.
- No API keys. ElevenLabs and Blender are reached through Claude's connectors, which hold their own sign-ins.

## Licences to know about

- **Remotion** is free for individuals and small teams; companies above its size threshold need a paid licence.
  Read https://remotion.dev/license before Logia grows into one.
- **ElevenLabs** output can be used commercially only on a paid plan.
- **Blender** is free for any use.
