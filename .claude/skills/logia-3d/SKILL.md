---
name: logia-3d
description: When and how to add 3D to a Logia reel: Blender-rendered background plates and props composited under the 2D host, or lightweight React Three Fiber objects inside Remotion. Load when a scene would land harder with depth, a real camera move through a space, or a hero object.
---

# 3D in Logia reels

Ken wants 3D going forward. He has also rejected every 3D *character* tried so far and stopped a full Blender
cinematic mid-render. So the rule is: **3D for places and objects, 2D for people.** The host and extras stay flat
and are composited on top.

## When 3D earns its place

Use it for at most two or three shots in a reel:

- a place the camera should travel through (a church interior, a street in Kolkata, a bedroom at 2 a.m.)
- a hero object that turns or falls with weight (a Bible, a phone, a door, a scroll)
- a reveal that needs depth (pulling back from one photo to a wall of them)

Do not use it for chat cards, receipts, titles or anything that must stay crisp and readable. If the flat version
already reads in half a second, leave it flat.

## Route A: Blender plates (works in this repo today)

Blender renders still background images ("plates") in a toon look; Remotion pans and zooms across them and draws
the 2D host on top at anchor points exported from the 3D scene.

- `blender/plates.py` builds sets and renders to `public/plates/<name>.jpg`, writing camera-projected anchor points
  to `src/data/plates.json`.
- In a scene: `<PlateImg name="bedroom" />` then place the host with `anchorOf("bedroom", "bedEdge")`
  (both in `src/flat/World.tsx`).
- Look: flat or toon shading, an outline pass (Freestyle or inverted hull) in INK, the Logia palette from
  `logia-design`, soft single key light. It has to sit next to flat SVG without looking like another video.
- Render plates larger than the frame (at least 1.5×) so the Remotion camera can push in without softening.

Run Blender headless: `blender -b --factory-startup -P blender/plates.py -- <set> [<set> ...] [preview]`. If the Blender connector (MCP) is available in
the session, use it to build and inspect the scene interactively, take a viewport screenshot, and only then
render. Blender's own skills (modeling, lighting, cameras, rendering, toon and low-poly styles) are worth loading
for anything beyond boxes and planes.

For moving 3D (a camera flying through a set), render an image sequence from Blender to `public/plates/<name>/`
and play it with Remotion's `<Sequence>` and `<Img>` by frame number. Keep these to two or three seconds; a
1080×1920 sequence at 30 fps renders slowly on a laptop.

## Route B: 3D inside Remotion (not yet installed here)

`@remotion/three` puts a React Three Fiber canvas inside a composition. Good for one object that spins or falls,
lit simply, with no Blender round-trip.

```bash
npm i three @react-three/fiber @remotion/three @types/three
```

Pin `@remotion/three` to the same version as `remotion` in `package.json`. Rules:

- wrap the scene in `<ThreeCanvas width height>` from `@remotion/three`
- drive all motion from `useCurrentFrame()`. Never use R3F's `useFrame()`; it flickers in renders.
- load models with `staticFile()` from `public/`

This route has not been used in a Logia reel yet. The first time, build one test composition and sheet it before
relying on it.

## Compositing checklist

- The 2D host's feet or bust sit on a surface that exists in the plate, at a matching scale.
- A soft contact shadow under anything 2D that touches a 3D floor.
- Plate colours pulled toward the palette; no photoreal textures.
- Captions and titles still pass the safe-zone check over the plate.
- Sheet the shot at three moments. If the host looks pasted on, fall back to the flat version of that scene.

## Cost and honesty

Blender renders take minutes per plate and much longer for sequences. Say in the report which shots are 3D, how
long they took, and whether any were dropped back to flat.
