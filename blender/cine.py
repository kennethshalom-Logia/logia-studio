"""Cinematic 3D shots for the Logia H.E.A.R. reel (Blender 5.2, EEVEE).

Run one or more shots:   blender -b --factory-startup -P blender/cine.py -- <shot> [<shot>...] [still=<sec>] [preview]
  still=<sec>  render a single frame at that global time to out/stills/cine-<shot>.png (quality gate)
  preview      half resolution, fewer samples
Shots read their timing from src/data/hear-cine.json (the final mix timeline) and render PNG frames to
blender/out/<shot>/ which scripts/encode-cine.js turns into public/cine/<shot>.mp4.

Pipeline (blender-skill-harmonizer): sets from plates.py (modeling/materials) -> puppet rig + props (modeling,
animation) -> per-shot lighting (lighting) -> animated camera with DoF (cameras) -> EEVEE render (rendering)
-> contact-sheet gate (animation-quality-gate).
"""
import json
import math
import os
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import plates as P  # noqa: E402
from toon import outline  # noqa: E402

R = math.radians
ROOT = P.ROOT
TEX = os.path.join(ROOT, "blender", "tex")
FPS = 30
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
PREVIEW = "preview" in ARGS
STILL = next((float(a.split("=")[1]) for a in ARGS if a.startswith("still=")), None)
P.PREVIEW = PREVIEW

with open(os.path.join(ROOT, "src", "data", "hear-cine.json"), encoding="utf-8") as f:
    DATA = json.load(f)
LINES = {l["id"]: l for l in DATA["lines"]}
ENV = DATA["env"]


def S(line_id):
    return LINES[line_id]["start"]


def AT(line_id, word, nth=0):
    import re
    n = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())
    hits = [w for w in LINES[line_id]["words"] if n(w["text"]).startswith(n(word))]
    return (hits[nth] if len(hits) > nth else (hits[-1] if hits else {"start": S(line_id)}))["start"]


class Clock:
    """Maps global reel seconds to this shot's frame numbers (shot starts at frame 1)."""
    def __init__(self, start, end, tail=0.45):
        self.start, self.end = start, end
        self.frames = int(round((end - start + tail) * FPS))

    def f(self, t):
        return 1 + int(round((t - self.start) * FPS))

    def t(self, frame):
        return self.start + (frame - 1) / FPS


# ---------- materials ----------

def mat(color, rough=0.6, emit=0.0, name=None):
    m = bpy.data.materials.new(name or "C")
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    if emit:
        b.inputs["Emission Color"].default_value = (*color, 1)
        b.inputs["Emission Strength"].default_value = emit
    return m


def assign(o, m, ink=0.006):
    o.data.materials.clear()
    o.data.materials.append(m)
    if ink:
        outline(o, ink)
    return o


def capsule(name, r, length, color, parent, ink=0.006):
    """Rounded limb hanging down (-Z) from its parent pivot."""
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1, segments=24, ring_count=12)
    o = bpy.context.active_object
    o.name = name
    o.scale = (r, r, length / 2 + r)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bpy.ops.object.shade_smooth()
    o.parent = parent
    o.location = (0, 0, -length / 2)
    return assign(o, color if isinstance(color, bpy.types.Material) else mat(color), ink)


def empty(name, parent=None, loc=(0, 0, 0)):
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    e.parent = parent
    e.location = loc
    e.rotation_mode = "XYZ"
    return e


_atlas_cache = {}


def atlas(prefix, n, cols):
    """Packs tex/<prefix>_001..n.png into one image grid (cols x rows) and returns (image, cols, rows)."""
    key = (prefix, n, cols)
    if key in _atlas_cache and _atlas_cache[key][0].name in bpy.data.images:
        return _atlas_cache[key]
    import numpy as np
    rows = (n + cols - 1) // cols
    first = bpy.data.images.load(os.path.join(TEX, f"{prefix}_001.png"))
    w, h = first.size
    big = np.zeros((rows * h, cols * w, 4), dtype=np.float32)
    for k in range(n):
        im = first if k == 0 else bpy.data.images.load(os.path.join(TEX, f"{prefix}_{k + 1:03d}.png"))
        px = np.array(im.pixels[:], dtype=np.float32).reshape(h, w, 4)  # bottom-up rows
        c, r = k % cols, k // cols  # r = 0 is the top row of the atlas
        y0 = (rows - 1 - r) * h
        big[y0:y0 + h, c * w:(c + 1) * w] = px
        if k:
            bpy.data.images.remove(im)
    bpy.data.images.remove(first)
    img = bpy.data.images.new(f"atlas_{prefix}", cols * w, rows * h, alpha=True)
    img.pixels.foreach_set(big.ravel())
    img.pack()
    _atlas_cache[key] = (img, cols, rows)
    return _atlas_cache[key]


def atlas_material(name, prefix, n, cols, emit=0.55, unlit=False):
    """Material showing one tile of the atlas; returns (material, mapping_node, cols, rows)."""
    img, cols, rows = atlas(prefix, n, cols)
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1 / cols, 1 / rows, 1)
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = img
    tex.interpolation = "Cubic"
    tex.extension = "CLIP"
    nt.links.new(tc.outputs["UV"], mp.inputs["Vector"])
    nt.links.new(mp.outputs["Vector"], tex.inputs["Vector"])
    if unlit:
        for nd in list(nt.nodes):
            if nd.type in ("BSDF_PRINCIPLED",):
                nt.nodes.remove(nd)
        out = [nd for nd in nt.nodes if nd.type == "OUTPUT_MATERIAL"][0]
        em = nt.nodes.new("ShaderNodeEmission")
        em.inputs["Strength"].default_value = emit
        nt.links.new(tex.outputs["Color"], em.inputs["Color"])
        nt.links.new(em.outputs["Emission"], out.inputs["Surface"])
    else:
        b = nt.nodes["Principled BSDF"]
        nt.links.new(tex.outputs["Color"], b.inputs["Base Color"])
        nt.links.new(tex.outputs["Alpha"], b.inputs["Alpha"])
        nt.links.new(tex.outputs["Color"], b.inputs["Emission Color"])
        b.inputs["Emission Strength"].default_value = emit
        b.inputs["Roughness"].default_value = 0.85
        try:
            m.surface_render_method = "DITHERED"
        except Exception:
            pass
    return m, mp, cols, rows


def key_tile(mp, frame, k, cols, rows):
    """Show tile k (0-based, row-major from the top) from this frame on."""
    c, r = k % cols, k // cols
    sock = mp.inputs["Location"]
    sock.default_value = (c / cols, (rows - 1 - r) / rows, 0)
    sock.keyframe_insert("default_value", frame=frame)


def key_rot(o, frame, deg):
    o.rotation_euler = tuple(R(a) for a in deg)
    o.keyframe_insert("rotation_euler", frame=frame)


def key_loc(o, frame, loc):
    o.location = loc
    o.keyframe_insert("location", frame=frame)


def key_scale(o, frame, s):
    o.scale = (s, s, s) if not isinstance(s, tuple) else s
    o.keyframe_insert("scale", frame=frame)


# ---------- Ken: rounded 3D body + his drawn face on a camera-facing card ----------

POSES = {
    # joint: (x, y, z) degrees. Body faces -Y. Arm X<0 swings forward; arm on +X side moves outward with Y<0.
    "idle": {"shL": (0, -6, 0), "shR": (0, 6, 0), "elL": (-8, 0, 0), "elR": (-8, 0, 0), "hipL": (0, 0, 0), "hipR": (0, 0, 0), "knL": (0, 0, 0), "knR": (0, 0, 0), "spine": (0, 0, 0)},
    "open": {"shL": (-25, -40, 0), "shR": (-25, 40, 0), "elL": (-45, 0, 0), "elR": (-45, 0, 0)},
    "armsup": {"shL": (-10, -150, 0), "shR": (-10, 150, 0), "elL": (-10, 0, 0), "elR": (-10, 0, 0), "spine": (6, 0, 0)},
    "point": {"shR": (-170, 10, 0), "elR": (-5, 0, 0), "shL": (0, -8, 0), "elL": (-10, 0, 0)},
    "phone": {"shL": (-30, 18, 0), "shR": (-30, -18, 0), "elL": (-95, 0, 0), "elR": (-95, 0, 0), "spine": (8, 0, 0)},
    "book": {"shL": (-30, 14, 0), "shR": (-30, -14, 0), "elL": (-80, 0, 0), "elR": (-80, 0, 0)},
    "pray": {"shL": (-40, 14, 0), "shR": (-40, -14, 0), "elL": (-110, 0, 0), "elR": (-110, 0, 0), "spine": (12, 0, 0)},
    "sit": {"hipL": (-90, 0, 0), "hipR": (-90, 0, 0), "knL": (90, 0, 0), "knR": (90, 0, 0)},
    "kneel": {"hipL": (-10, 0, 0), "hipR": (-10, 0, 0), "knL": (100, 0, 0), "knR": (100, 0, 0)},
    "hands_knees": {"shL": (-25, 8, 0), "shR": (-25, -8, 0), "elL": (-40, 0, 0), "elR": (-40, 0, 0), "spine": (10, 0, 0)},
    "reach": {"shR": (-80, 0, 0), "elR": (-20, 0, 0)},
}
JOINTS = ["shL", "shR", "elL", "elR", "hipL", "hipR", "knL", "knR", "spine"]


def pose(*names):
    p = dict(POSES["idle"])
    for n in names:
        p.update(POSES[n])
    return p


class Puppet:
    def __init__(self, name, loc=(0, 0, 0), yaw=0.0, scale=1.0, face=True, look=None):
        self.name = name
        self.root = empty(f"{name}_root", loc=loc)
        self.root.rotation_euler = (0, 0, R(yaw))
        self.root.scale = (scale, scale, scale)
        self.hips = empty(f"{name}_hips", self.root, (0, 0, 0.48))
        jeans, jacket, skin = mat(P.hexc("#2f3a55"), 0.8), mat(P.hexc("#2b2833"), 0.55), mat(P.hexc("#ea8f45"), 0.5)
        shoe = mat(P.hexc("#f6f3ec"), 0.6)
        self.j = {}
        for side, x in (("L", 0.085), ("R", -0.085)):
            hip = empty(f"{name}_hip{side}", self.hips, (x, 0, 0))
            capsule(f"{name}_thigh{side}", 0.06, 0.2, jeans, hip)
            kn = empty(f"{name}_kn{side}", hip, (0, 0, -0.22))
            capsule(f"{name}_shin{side}", 0.052, 0.19, jeans, kn)
            bpy.ops.mesh.primitive_uv_sphere_add(radius=1, segments=20, ring_count=10)
            s = bpy.context.active_object
            s.name = f"{name}_shoe{side}"
            s.scale = (0.065, 0.11, 0.045)
            bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
            bpy.ops.object.shade_smooth()
            s.parent = kn
            s.location = (0, -0.035, -0.235)
            assign(s, shoe)
            self.j[f"hip{side}"], self.j[f"kn{side}"] = hip, kn
        self.spine = empty(f"{name}_spine", self.hips, (0, 0, 0.02))
        self.j["spine"] = self.spine
        bpy.ops.mesh.primitive_cube_add(size=1)
        t = bpy.context.active_object
        t.name = f"{name}_torso"
        t.scale = (0.36, 0.21, 0.46)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        # taper the waist a little, keep the shoulders square
        for v_ in t.data.vertices:
            if v_.co.z < 0:
                v_.co.x *= 0.86
                v_.co.y *= 0.92
        sub = t.modifiers.new("sub", "SUBSURF")
        sub.levels = sub.render_levels = 2
        bpy.ops.object.shade_smooth()
        t.parent = self.spine
        t.location = (0, 0, 0.24)
        assign(t, jacket)
        # collar
        bpy.ops.mesh.primitive_torus_add(major_radius=0.07, minor_radius=0.022, major_segments=24, minor_segments=8)
        col = bpy.context.active_object
        col.name = f"{name}_collar"
        col.parent = self.spine
        col.location = (0, 0, 0.47)
        assign(col, jacket, 0.003)
        # white tee V + zip line on the jacket front
        bpy.ops.mesh.primitive_cone_add(vertices=3, radius1=0.05, depth=0.01, location=(0, 0, 0))
        v = bpy.context.active_object
        v.name = f"{name}_tee"
        v.parent = self.spine
        v.location = (0, -0.112, 0.40)
        v.rotation_euler = (R(90), R(180), 0)
        assign(v, mat(P.hexc("#f4f1ea"), 0.7), 0.003)
        for side, x in (("L", 0.175), ("R", -0.175)):
            sh = empty(f"{name}_sh{side}", self.spine, (x, 0, 0.40))
            capsule(f"{name}_upper{side}", 0.048, 0.17, jacket, sh)
            el = empty(f"{name}_el{side}", sh, (0, 0, -0.19))
            capsule(f"{name}_fore{side}", 0.044, 0.16, jacket, el)
            hand = empty(f"{name}_hand{side}", el, (0, 0, -0.2))
            bpy.ops.mesh.primitive_uv_sphere_add(radius=0.045, segments=16, ring_count=8)
            h = bpy.context.active_object
            h.name = f"{name}_handm{side}"
            bpy.ops.object.shade_smooth()
            h.parent = hand
            assign(h, skin)
            self.j[f"sh{side}"], self.j[f"el{side}"] = sh, el
            setattr(self, f"hand{side}", hand)
        bpy.ops.mesh.primitive_cylinder_add(radius=0.045, depth=0.07, vertices=16)
        n = bpy.context.active_object
        n.name = f"{name}_neck"
        n.parent = self.spine
        n.location = (0, 0, 0.49)
        assign(n, skin)
        self.neck = empty(f"{name}_neckpivot", self.spine, (0, 0, 0.5))
        self.headbase = empty(f"{name}_headbase", self.neck)
        self.head = empty(f"{name}_head", self.headbase)  # tilt / nod lives here
        self.face_node = None
        if face:
            self._face()

    def _face(self):
        w, h = 0.6, 0.6 * 925 / 820
        bpy.ops.mesh.primitive_plane_add(size=1)
        p = bpy.context.active_object
        p.name = f"{self.name}_face"
        p.scale = (w, h, 1)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        p.rotation_euler = (R(90), 0, 0)
        p.parent = self.head
        # neck point of the artwork (560,888 of 820x925) sits on the neck pivot
        p.location = ((410 - 560) / 820 * w * -1 * -1 * -1, -0.03, (888 - 462.5) / 925 * h - 0.02)
        p.location.x = -((560 - 410) / 820) * w
        m, mp, cols, rows = atlas_material(f"{self.name}_faceM", "face", 24, 6)
        self.atlas = (mp, cols, rows)
        p.data.materials.append(m)
        self.face_node = mp
        self.face_plane = p

    def face_to(self, cam):
        c = self.headbase.constraints.new("LOCKED_TRACK")
        c.target = cam
        c.track_axis = "TRACK_NEGATIVE_Y"
        c.lock_axis = "LOCK_Z"

    def set_pose(self, frame, p, ease=True):
        for jn in JOINTS:
            if jn in p:
                key_rot(self.j[jn], frame, p[jn])

    def hold(self, side, obj, loc=(0, 0, -0.05), rot=(0, 0, 0)):
        obj.parent = getattr(self, f"hand{side}")
        obj.location = loc
        obj.rotation_euler = tuple(R(a) for a in rot)

    def lipsync(self, clock, mood=lambda t: (0.0, 0.0), talk=lambda t: True, gain=1.0):
        """Face frame per video frame: talk level from the voice loudness, blinks, mood (droop 0..1, sad 0/1)."""
        if not self.face_node:
            return
        mp, cols, rows = self.atlas
        last = None
        for fr in range(1, clock.frames + 1):
            t = clock.t(fr)
            i = int(round(t * FPS))
            v = (ENV[i] if 0 <= i < len(ENV) else 0) * 0.6 + (ENV[i - 1] if 0 <= i - 1 < len(ENV) else 0) * 0.4
            o = max(0.0, min(0.6, (v - 0.12) * 0.9 * gain)) if talk(t) else 0.0
            ti = min(3, int(round(o / 0.2)))
            droop, sad = mood(t)
            ph = (t + hash(self.name) % 7 * 0.3) % 3.7
            li = 2 if ph < 0.13 else (1 if droop > 0.3 else 0)
            idx = 1 + ti + 4 * li + 12 * (1 if sad else 0)
            if idx != last:
                key_tile(mp, fr, idx - 1, cols, rows)
                last = idx
        constant(self.face_plane.active_material.node_tree, "default_value")
        # talking head bob
        for fr in range(1, clock.frames + 1, 3):
            t = clock.t(fr)
            i = int(round(t * FPS))
            v = ENV[i] if 0 <= i < len(ENV) else 0
            key_rot(self.head, fr, (0, math.sin(t * 1.3) * 2 + (math.sin(t * 7) * 1.6 if v > 0.2 and talk(t) else 0), 0))


def fcurves(id_data):
    ad = id_data.animation_data
    if not ad or not ad.action:
        return []
    a = ad.action
    if hasattr(a, "fcurves"):
        return list(a.fcurves)
    out = []
    for layer in a.layers:
        for strip in layer.strips:
            for cb in getattr(strip, "channelbags", []):
                out.extend(cb.fcurves)
    return out


def constant(id_data, path="frame_offset"):
    for fc in fcurves(id_data):
        if path in fc.data_path:
            for k in fc.keyframe_points:
                k.interpolation = "CONSTANT"


class Extra:
    """Blank-faced extra in the reel's style: rounded body, white head, hair cap; arms can raise."""
    def __init__(self, name, loc, color, hair, yaw=0, scale=1.0, robe=False):
        self.root = empty(f"{name}_root", loc=loc)
        self.root.rotation_euler = (0, 0, R(yaw))
        self.root.scale = (scale, scale, scale)
        body = mat(color, 0.6)
        for side, x in (("L", 0.07), ("R", -0.07)):
            leg = empty(f"{name}_leg{side}", self.root, (x, 0, 0.45))
            capsule(f"{name}_legm{side}", 0.045, 0.4, P.hexc("#2a2733"), leg)
        bpy.ops.mesh.primitive_uv_sphere_add(radius=1, segments=24, ring_count=12)
        t = bpy.context.active_object
        t.name = f"{name}_body"
        t.scale = (0.17, 0.12, 0.27 if not robe else 0.42)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        bpy.ops.object.shade_smooth()
        t.parent = self.root
        t.location = (0, 0, 0.7 if not robe else 0.5)
        assign(t, body)
        self.arms = {}
        for side, x in (("L", 0.17), ("R", -0.17)):
            sh = empty(f"{name}_sh{side}", self.root, (x, 0, 0.88))
            capsule(f"{name}_arm{side}", 0.04, 0.32, body, sh)
            self.arms[side] = sh
        ball = bpy.ops.mesh.primitive_uv_sphere_add(radius=0.15, segments=24, ring_count=12, location=(0, 0, 0))
        hd = bpy.context.active_object
        hd.name = f"{name}_head"
        bpy.ops.object.shade_smooth()
        hd.parent = self.root
        hd.location = (0, 0, 1.12)
        assign(hd, mat(P.hexc("#fbfaf6"), 0.5))
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.158, segments=24, ring_count=12)
        hc = bpy.context.active_object
        hc.name = f"{name}_hair"
        bpy.ops.object.shade_smooth()
        hc.parent = self.root
        hc.location = (0, 0.02, 1.15)
        hc.scale = (1, 1, 0.75)
        bisect_keep_top(hc, 0.0)
        assign(hc, mat(hair, 0.7))


def bisect_keep_top(o, z):
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(o.data)
    geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
    bmesh.ops.bisect_plane(bm, geom=geom, plane_co=(0, 0, z), plane_no=(0, 0, 1), clear_inner=True)
    bm.to_mesh(o.data)
    bm.free()


# ---------- camera, lights, render ----------

def camera(lens=40, fstop=2.8, focus=None):
    cd = bpy.data.cameras.new("CAM-shot")
    cd.lens = lens
    cd.sensor_fit = "AUTO"
    cd.sensor_width = 36
    cd.clip_end = 600
    cd.dof.use_dof = focus is not None
    cd.dof.aperture_fstop = fstop
    if focus is not None:
        cd.dof.focus_object = focus
    cam = bpy.data.objects.new("CAM-shot", cd)
    bpy.context.scene.collection.objects.link(cam)
    tgt = empty("CAM-target")
    c = cam.constraints.new("TRACK_TO")
    c.target = tgt
    c.track_axis = "TRACK_NEGATIVE_Z"
    c.up_axis = "UP_Y"
    bpy.context.scene.camera = cam
    return cam, tgt


def cam_keys(cam, tgt, clock, keys, lens=None):
    """keys: list of (global_time, cam_loc, target_loc[, lens])."""
    for k in keys:
        fr = clock.f(k[0])
        key_loc(cam, fr, k[1])
        key_loc(tgt, fr, k[2])
        if len(k) > 3:
            cam.data.lens = k[3]
            cam.data.keyframe_insert("lens", frame=fr)


def handheld(cam, clock, amp=0.012, rot=0.3):
    """Subtle breathing handheld drift on top of the camera move (noise modifier)."""
    for i, path in enumerate(("location", "location", "location")):
        fc = cam.driver_add(path, i) if False else None
    for fc in fcurves(cam):
        if fc.data_path == "location":
            n = fc.modifiers.new("NOISE")
            n.scale = 40
            n.strength = amp * 2
            n.phase = fc.array_index * 13


def rim(loc, target, energy=300, color=(0.8, 0.88, 1.0), size=1.5):
    ld = bpy.data.lights.new("LGT-rim", "AREA")
    ld.energy = energy
    ld.color = color
    ld.size = size
    o = bpy.data.objects.new("LGT-rim", ld)
    bpy.context.scene.collection.objects.link(o)
    o.location = loc
    d = (Vector(target) - Vector(loc)).normalized()
    o.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    return o


def area(name, loc, target, energy, color, size=1.0):
    o = rim(loc, target, energy, color, size)
    o.name = name
    return o


def volume(density=0.008, color=(1, 0.95, 0.85), size=(14, 14, 7), loc=(0, 2, 3.5)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    v = bpy.context.active_object
    v.name = "VOL-air"
    v.scale = size
    m = bpy.data.materials.new("VOL")
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    vs = nt.nodes.new("ShaderNodeVolumeScatter")
    vs.inputs["Density"].default_value = density
    vs.inputs["Color"].default_value = (*color, 1)
    nt.links.new(vs.outputs["Volume"], out.inputs["Volume"])
    v.data.materials.append(m)
    v.visible_shadow = False
    return v


def render_settings(clock):
    sc = bpy.context.scene
    sc.render.fps = FPS
    sc.frame_start = 1
    sc.frame_end = clock.frames
    sc.render.resolution_x, sc.render.resolution_y = 1080, 1920
    sc.render.resolution_percentage = 50 if PREVIEW else 100
    sc.eevee.taa_render_samples = 12 if PREVIEW else 32
    sc.render.use_motion_blur = True
    sc.render.motion_blur_shutter = 0.45
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "None"
    sc.view_settings.exposure = 0.0
    try:
        sc.eevee.use_volumetric_shadows = True
        sc.eevee.volumetric_tile_size = "8"
        sc.eevee.volumetric_samples = 48
    except Exception:
        pass


def render(name, clock):
    sc = bpy.context.scene
    render_settings(clock)
    if STILL is not None:
        sc.frame_set(clock.f(STILL))
        path = os.path.join(ROOT, "out", "stills", f"cine-{name}.png")
        sc.render.image_settings.file_format = "PNG"
        sc.render.filepath = path
        bpy.ops.render.render(write_still=True)
        print("STILL", path)
        return
    d = os.path.join(ROOT, "blender", "out", name)
    os.makedirs(d, exist_ok=True)
    for fn in os.listdir(d):
        os.remove(os.path.join(d, fn))
    sc.render.image_settings.file_format = "JPEG"
    sc.render.image_settings.quality = 95
    sc.render.filepath = os.path.join(d, "f_")
    bpy.ops.render.render(animation=True)
    with open(os.path.join(d, "meta.json"), "w") as f:
        json.dump({"start": clock.start, "end": clock.end, "frames": clock.frames}, f)
    print("RENDERED", name, clock.frames)


def new_set(builder):
    P.reset()
    P._mats.clear()
    builder()
    # plates' sun/point lights stay; remove the plate camera if any
    for o in list(bpy.data.objects):
        if o.type == "CAMERA":
            bpy.data.objects.remove(o, do_unlink=True)


def phone_obj(screen_state_keys=None, clock=None, glow=1.5):
    """A phone whose screen is an image sequence (screen_001..004)."""
    bpy.ops.mesh.primitive_cube_add(size=1)
    body = bpy.context.active_object
    body.name = "PHONE"
    body.scale = (0.075, 0.009, 0.155)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bv = body.modifiers.new("bev", "BEVEL")
    bv.width = 0.008
    bv.segments = 4
    assign(body, mat(P.hexc("#141217"), 0.35), 0.003)
    bpy.ops.mesh.primitive_plane_add(size=1)
    sc = bpy.context.active_object
    sc.name = "PHONE_screen"
    sc.scale = (0.066, 0.138, 1)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    from mathutils import Matrix
    sc.data.transform(Matrix.Rotation(math.pi, 4, "Z"))
    sc.rotation_euler = (R(90), 0, 0)
    sc.parent = body
    sc.location = (0, -0.0095, 0)
    m, mp, cols, rows = atlas_material("screen", "screen", 4, 4, emit=glow, unlit=True)
    sc.data.materials.append(m)
    if screen_state_keys and clock:
        last = None
        for fr in range(1, clock.frames + 1):
            t = clock.t(fr)
            st = 1
            for at, s_ in screen_state_keys:
                if t >= at:
                    st = s_
            if st != last:
                key_tile(mp, fr, st - 1, cols, rows)
                last = st
        constant(m.node_tree, "default_value")
    ld = bpy.data.lights.new("LGT-phone", "AREA")
    ld.energy = 6
    ld.color = (0.65, 0.8, 1.0)
    ld.size = 0.15
    lo = bpy.data.objects.new("LGT-phone", ld)
    bpy.context.scene.collection.objects.link(lo)
    lo.parent = body
    lo.location = (0, -0.05, 0)
    lo.rotation_euler = (R(90), 0, 0)
    return body


# ---------- shots ----------

SHOTS = {}


def shot(name, start, end):
    def deco(fn):
        SHOTS[name] = (fn, start, end)
        return fn
    return deco


BED_SEAT = (-0.4, -0.05, 0.27)


HOOK_CUT = 2.62  # the POV macro hands over to the reveal just before the voice


def hook_scene(c):
    new_set(lambda: P.bedroom(False))
    ken = Puppet("ken", loc=(BED_SEAT[0], BED_SEAT[1] - 0.06, 0.0), yaw=-8)
    ken.hips.location.z = 0.30
    ken.set_pose(1, pose("sit", "phone"))
    ph = phone_obj([(0.0, 1), (0.6, 2), (1.85, 3), (2.15, 4)], c, glow=2.4)
    ken.hold("R", ph, loc=(0.07, -0.07, -0.05), rot=(0, 0, 0))
    bpy.context.view_layer.update()
    eye = empty("EYE", loc=ken.neck.matrix_world.translation + Vector((0.0, -0.06, 0.30)))
    dt = ph.constraints.new("DAMPED_TRACK")
    dt.target = eye
    dt.track_axis = "TRACK_NEGATIVE_Y"
    area("LGT-moonkey", (1.6, 2.0, 2.4), (BED_SEAT[0], 0, 0.8), 160, (0.55, 0.65, 1.0), 1.2)
    rim((-1.8, 1.6, 1.8), (BED_SEAT[0], 0, 0.9), 120, (0.5, 0.6, 1.0))
    volume(0.008, (0.7, 0.8, 1.0), loc=(0, 1, 2))
    return ken, ph, eye


@shot("hookpov", 0.0, HOOK_CUT)
def shot_hookpov(c):
    ken, ph, eye = hook_scene(c)
    ken.face_plane.hide_render = True
    bpy.context.view_layer.update()
    pw = ph.matrix_world.translation.copy()
    ew = eye.matrix_world.translation.copy()
    cam, tgt = camera(lens=55, fstop=1.6)
    d = (pw - ew)
    # POV over the phone: start a touch wide, drift in on the message as it's sent
    cam_keys(cam, tgt, c, [
        (0.0, ew + d * 0.25 + Vector((0.03, 0, 0.02)), pw, 45),
        (1.9, ew + d * 0.42, pw + Vector((0, 0, 0.01)), 52),
        (c.end + 0.4, ew + d * 0.5, pw + Vector((0, 0, 0.02)), 58),
    ])
    cam.data.dof.focus_object = ph
    # thumb taps: tiny phone jiggle while typing
    for k, t in enumerate([0.7, 0.82, 0.93, 1.06, 1.15, 1.27, 1.36, 1.48, 1.57, 1.66, 1.85]):
        key_loc(ph, c.f(t), (0.07, -0.07, -0.05))
        key_loc(ph, c.f(t) + 1, (0.07, -0.072, -0.052))
        key_loc(ph, c.f(t) + 2, (0.07, -0.07, -0.05))
    render("hookpov", c)


@shot("hook", HOOK_CUT, S("years") - 0.12)
def shot_hook(c):
    ken, ph, eye = hook_scene(c)
    cam, tgt = camera(lens=40, fstop=2.0)
    ken.face_to(cam)
    voice = S("hook")
    # slow push from a low wide on the bed toward his face as he says it
    cam_keys(cam, tgt, c, [
        (c.start, Vector((0.55, -2.7, 0.75)), Vector((BED_SEAT[0], 0.0, 0.95)), 32),
        (voice + 1.3, Vector((0.25, -1.9, 0.95)), Vector((BED_SEAT[0], 0.0, 1.0)), 40),
        (c.end + 0.4, Vector((0.12, -1.6, 1.0)), Vector((BED_SEAT[0], 0.0, 1.02)), 45),
    ])
    cam.data.dof.focus_object = ken.face_plane
    ken.lipsync(c, mood=lambda t: (0.4, 1), talk=lambda t: t >= voice - 0.05)
    render("hook", c)


@shot("years", S("years") - 0.12, S("turn") - 0.15)
def shot_years(c):
    new_set(lambda: P.bedroom(False))
    ken = Puppet("ken", loc=(0.35, 0.15, 0.0), yaw=110)
    ken.hips.location.z = 0.27
    ken.set_pose(1, pose("kneel", "pray"))
    cam, tgt = camera(lens=35, fstop=2.8)
    ken.face_to(cam)
    never = AT("years", "never")
    cam_keys(cam, tgt, c, [
        (c.start, Vector((2.2, -2.2, 1.5)), Vector((0.1, 0.4, 0.6)), 32),
        (never, Vector((1.3, -1.7, 1.0)), Vector((0.2, 0.3, 0.7)), 38),
        (c.end + 0.4, Vector((0.9, -1.2, 0.85)), Vector((0.3, 0.2, 0.75)), 45),
    ])
    cam.data.dof.focus_object = ken.face_plane
    ken.lipsync(c, mood=lambda t: (1.0, 1), talk=lambda t: False)
    area("LGT-moonkey", (1.2, 2.2, 2.4), (0.3, 0, 0.6), 220, (0.55, 0.65, 1.0), 0.8)
    rim((-1.5, 1.5, 1.6), (0.35, 0.15, 0.8), 140, (0.5, 0.6, 1.0))
    volume(0.01, (0.7, 0.8, 1.0), loc=(0, 1, 2))
    render("years", c)


@shot("radio", S("turn") - 0.15, S("how") - 0.15)
def shot_radio(c):
    new_set(P.radio_room)
    # 3D radio on the table
    rx, ry, rz = 0.55, 0.35, 0.82
    body = P.box("radio_body", (0.62, 0.26, 0.38), (rx, ry, rz + 0.19), P.hexc("#c9504a"), bevel=0.06)
    P.cyl("radio_speaker", 0.11, 0.02, (rx - 0.15, ry - 0.135, rz + 0.19), P.hexc("#3a2a22"), rot=(90, 0, 0))
    P.box("radio_dial", (0.24, 0.02, 0.09), (rx + 0.13, ry - 0.135, rz + 0.25), P.hexc("#fbf2d8"), bevel=0.01, emit=1.0)
    needle = P.box("radio_needle", (0.008, 0.012, 0.08), (rx + 0.04, ry - 0.148, rz + 0.25), P.hexc("#d93a3a"), bevel=0, ink=0)
    knob = P.cyl("radio_knob", 0.04, 0.03, (rx + 0.13, ry - 0.145, rz + 0.12), P.hexc("#f2c94c"), rot=(90, 0, 0))
    P.cyl("radio_ant", 0.006, 0.45, (rx - 0.2, ry, rz + 0.55), P.INKC, rot=(0, -30, 0), ink=0)
    glowL = point_glow((rx, ry - 0.3, rz + 0.3), 0)
    ken = Puppet("ken", loc=(-0.45, -0.05, 0.0), yaw=-18)
    ken.set_pose(1, pose("idle"))
    tune = AT("turn", "what", 1)
    wrong = AT("turn", "wrong")
    ken.set_pose(c.f(tune - 0.4), pose("idle"))
    ken.set_pose(c.f(tune), pose("reach"))
    cam, tgt = camera(lens=35, fstop=2.8)
    ken.face_to(cam)
    key_loc(needle, c.f(tune), (rx + 0.04, ry - 0.148, rz + 0.25))
    key_loc(needle, c.f(wrong + 0.3), (rx + 0.2, ry - 0.148, rz + 0.25))
    key_rot(knob, c.f(tune), (90, 0, 0))
    key_rot(knob, c.f(wrong + 0.3), (90, 0, 200))
    glowL.data.energy = 0
    glowL.data.keyframe_insert("energy", frame=c.f(wrong))
    glowL.data.energy = 60
    glowL.data.keyframe_insert("energy", frame=c.f(wrong + 0.6))
    cam_keys(cam, tgt, c, [
        (c.start, Vector((0.2, -2.6, 1.25)), Vector((0.0, 0.2, 0.9)), 32),
        (tune, Vector((0.35, -1.5, 1.1)), Vector((0.25, 0.3, 0.95)), 38),
        (wrong + 0.2, Vector((0.62, -0.75, 1.08)), Vector((rx + 0.1, ry, rz + 0.22)), 50),
        (c.end + 0.4, Vector((0.55, -1.0, 1.15)), Vector((rx, ry, rz + 0.2)), 45),
    ])
    cam.data.dof.focus_object = ken.face_plane
    ken.lipsync(c, mood=lambda t: (0.0, 0 if t > wrong else 1), talk=lambda t: True)
    rim((-1.5, 1.8, 2.0), (-0.45, 0, 1.0), 200, (1.0, 0.85, 0.6))
    render("radio", c)


def point_glow(loc, energy, color=(1.0, 0.8, 0.45)):
    ld = bpy.data.lights.new("LGT-glow", "POINT")
    ld.energy = energy
    ld.color = color
    ld.shadow_soft_size = 0.3
    o = bpy.data.objects.new("LGT-glow", ld)
    bpy.context.scene.collection.objects.link(o)
    o.location = loc
    return o




# ---------- more props ----------

FONT = "C:/Windows/Fonts/impact.ttf"


def text3d(name, body, loc, size, color, extrude=0.04, rot=(90, 0, 0), emit=0.0):
    bpy.ops.object.text_add(location=loc, rotation=tuple(R(a) for a in rot))
    t = bpy.context.active_object
    t.name = name
    t.data.body = body
    try:
        t.data.font = bpy.data.fonts.load(FONT, check_existing=True)
    except Exception:
        pass
    t.data.size = size
    t.data.extrude = extrude
    t.data.align_x = "CENTER"
    t.data.align_y = "CENTER"
    t.data.materials.append(mat(color, 0.4, emit))
    return t


def letter_block(name, ch, loc, color):
    b = P.box(name, (0.62, 0.62, 0.62), (0, 0, 0), color, bevel=0.07, ink=0.012)
    b.location = loc
    t = text3d(name + "_t", ch, (0, -0.315, 0), 0.5, P.hexc("#ffffff"), extrude=0.02)
    t.parent = b
    t.location = (0, -0.33, 0.02)
    return b


def heart_balloon(name, loc):
    root = empty(name, loc=loc)
    pink = mat(P.hexc("#f28fb0"), 0.35)
    for x in (-0.16, 0.16):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.22, location=(x, 0, 0.08))
        s = bpy.context.active_object
        bpy.ops.object.shade_smooth()
        s.parent = root
        assign(s, pink, 0.008)
    bpy.ops.mesh.primitive_cone_add(radius1=0.34, depth=0.42, location=(0, 0, -0.16), rotation=(R(180), 0, 0), vertices=32)
    c = bpy.context.active_object
    bpy.ops.object.shade_smooth()
    c.parent = root
    assign(c, pink, 0.008)
    t = text3d(name + "_lbl", "FEELINGS", (0, -0.24, 0.0), 0.11, P.hexc("#ffffff"), extrude=0.01)
    t.parent = root
    t.location = (0, -0.25, 0.0)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.004, depth=1.2, location=(0, 0, -0.95))
    st = bpy.context.active_object
    st.parent = root
    assign(st, mat(P.INKC), 0)
    return root


def crowd(n, center, r0, r1, seed=1, exclude=0.0):
    """Lots of simple witnesses (linked meshes so it stays light)."""
    import random
    rng = random.Random(seed)
    cols = ["#e3a04d", "#79b38b", "#d9706f", "#7f9fd6", "#9d7ec9", "#f2c94c"]
    bodies = {}
    for c in cols:
        bpy.ops.mesh.primitive_uv_sphere_add(radius=1, segments=12, ring_count=8)
        b = bpy.context.active_object
        b.scale = (0.15, 0.11, 0.3)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        bpy.ops.object.shade_smooth()
        assign(b, mat(P.hexc(c), 0.6), 0.008)
        b.hide_render = True
        bodies[c] = b
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.13, segments=12, ring_count=8)
    head = bpy.context.active_object
    bpy.ops.object.shade_smooth()
    assign(head, mat(P.hexc("#fbfaf6"), 0.5), 0.008)
    head.hide_render = True
    made = 0
    tries = 0
    out = []
    while made < n and tries < n * 20:
        tries += 1
        a = rng.uniform(0, math.tau)
        r = rng.uniform(r0, r1)
        x, y = center[0] + math.cos(a) * r * 1.4, center[1] + abs(math.sin(a)) * r
        if abs(x - center[0]) < exclude and y < center[1] + 1.5:
            continue
        c = cols[made % len(cols)]
        b = bpy.data.objects.new(f"crowd_b{made}", bodies[c].data)
        h = bpy.data.objects.new(f"crowd_h{made}", head.data)
        for o in (b, h):
            bpy.context.scene.collection.objects.link(o)
        b.location = (x, y, 0.3)
        h.location = (x, y, 0.72)
        out.append((b, h))
        made += 1
    return out


def polaroid(name, img_path, loc, rot_z, size=0.55):
    fr = P.box(name, (size, 0.02, size * 1.15), (0, 0, 0), P.hexc("#fffdf7"), bevel=0.01, ink=0.006)
    fr.location = loc
    fr.rotation_euler = (0, R(rot_z), 0)
    bpy.ops.mesh.primitive_plane_add(size=1)
    ph = bpy.context.active_object
    ph.name = name + "_img"
    ph.scale = (size * 0.86, size * 0.86, 1)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    ph.rotation_euler = (R(90), 0, 0)
    ph.parent = fr
    ph.location = (0, -0.016, size * 0.08)
    img = bpy.data.images.load(img_path)
    m = bpy.data.materials.new(name + "_m")
    m.use_nodes = True
    nt = m.node_tree
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = img
    b = nt.nodes["Principled BSDF"]
    nt.links.new(tex.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.7
    ph.data.materials.append(m)
    pin = P.ball(name + "_pin", 0.03, (0, 0, 0), P.hexc("#d93a3a"), ink=0.004)
    pin.parent = fr
    pin.location = (0, -0.03, size * 0.52)
    return fr


def thread_curve(points, name="THREAD"):
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    sp = cu.splines.new("BEZIER")
    sp.bezier_points.add(len(points) - 1)
    for bp, p in zip(sp.bezier_points, points):
        bp.co = p
        bp.handle_left_type = bp.handle_right_type = "AUTO"
    cu.bevel_depth = 0.008
    cu.bevel_resolution = 4
    o = bpy.data.objects.new(name, cu)
    bpy.context.scene.collection.objects.link(o)
    o.data.materials.append(mat(P.hexc("#d93a3a"), 0.4, 0.4))
    return o


def fingerprint(name, loc, size=0.12):
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc, rotation=(R(90), R(-20), 0))
    o = bpy.context.active_object
    o.name = name
    o.scale = (size, size * 1.3, 1)
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    wave = nt.nodes.new("ShaderNodeTexWave")
    wave.wave_type = "RINGS"
    wave.inputs["Scale"].default_value = 3.5
    wave.inputs["Distortion"].default_value = 2.0
    wave.inputs["Detail"].default_value = 1.5
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.45
    ramp.color_ramp.elements[1].position = 0.55
    grad = nt.nodes.new("ShaderNodeTexGradient")
    grad.gradient_type = "SPHERICAL"
    mul = nt.nodes.new("ShaderNodeMath")
    mul.operation = "MULTIPLY"
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (*P.hexc("#c8202f"), 1)
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    mix = nt.nodes.new("ShaderNodeMixShader")
    sep = nt.nodes.new("ShaderNodeVectorMath")
    sep.operation = "SUBTRACT"
    sep.inputs[1].default_value = (0.5, 0.5, 0)
    nt.links.new(tc.outputs["UV"], wave.inputs["Vector"])
    nt.links.new(tc.outputs["UV"], sep.inputs[0])
    nt.links.new(sep.outputs["Vector"], grad.inputs["Vector"])
    nt.links.new(wave.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], mul.inputs[0])
    nt.links.new(grad.outputs["Fac"], mul.inputs[1])
    nt.links.new(mul.outputs["Value"], mix.inputs["Fac"])
    nt.links.new(tr.outputs["BSDF"], mix.inputs[1])
    nt.links.new(em.outputs["Emission"], mix.inputs[2])
    nt.links.new(mix.outputs["Shader"], out.inputs["Surface"])
    try:
        m.surface_render_method = "BLENDED"
    except Exception:
        pass
    o.data.materials.append(m)
    o.visible_shadow = False
    return o


def dust(n, center, spread, clock, color=(1, 0.85, 0.5)):
    import random
    rng = random.Random(7)
    m = mat(color, 0.5, 6.0)
    bpy.ops.mesh.primitive_ico_sphere_add(radius=0.006, subdivisions=1)
    base = bpy.context.active_object
    base.data.materials.append(m)
    base.hide_render = True
    for i in range(n):
        o = bpy.data.objects.new(f"dust{i}", base.data)
        bpy.context.scene.collection.objects.link(o)
        p0 = Vector((center[0] + rng.uniform(-spread, spread), center[1] + rng.uniform(-spread, spread), center[2] + rng.uniform(-spread, spread)))
        drift = Vector((rng.uniform(-0.1, 0.1), rng.uniform(-0.05, 0.05), rng.uniform(0.05, 0.2)))
        key_loc(o, 1, p0)
        key_loc(o, clock.frames, p0 + drift * (clock.frames / FPS))


def lin(id_data):
    for fc in fcurves(id_data):
        for k in fc.keyframe_points:
            k.interpolation = "LINEAR"


def ken_sit_on_bed(c, dawn=True):
    ken = Puppet("ken", loc=(BED_SEAT[0], BED_SEAT[1] - 0.06, 0.0), yaw=-8)
    ken.hips.location.z = 0.30
    return ken


# ---------- remaining shots ----------

@shot("how", S("how") - 0.15, S("h1") - 0.12)
def shot_how(c):
    new_set(lambda: P.landscape(tomb=False))
    ken = Puppet("ken", loc=(0, 0, 0))
    hear = AT("how", "hear")
    ken.set_pose(1, pose("idle"))
    ken.set_pose(c.f(hear - 0.3), pose("idle"))
    ken.set_pose(c.f(hear + 0.1), pose("open"))
    cols = ["#d93a3a", "#f2c94c", "#79b38b", "#7f9fd6"]
    for i, ch in enumerate("HEAR"):
        b = letter_block(f"blk{ch}", ch, ((i - 1.5) * 0.7, -0.75, 0.31), P.hexc(cols[i]))
        land = hear - 0.15 + i * 0.12
        key_loc(b, 1, (b.location.x, -0.75, 6.0))
        key_loc(b, c.f(land - 0.25), (b.location.x, -0.75, 6.0))
        key_loc(b, c.f(land), (b.location.x, -0.75, 0.31))
        key_rot(b, c.f(land - 0.25), (0, (i - 1.5) * 20, 30))
        key_rot(b, c.f(land), (0, 0, 0))
    cam, tgt = camera(lens=35, fstop=4)
    ken.face_to(cam)
    cam_keys(cam, tgt, c, [
        (c.start, Vector((0.2, -1.4, 1.05)), Vector((0, 0, 1.15)), 40),
        (hear, Vector((0.3, -3.6, 1.5)), Vector((0, -0.2, 0.85)), 32),
        (c.end + 0.4, Vector((0.4, -4.2, 1.8)), Vector((0, -0.2, 0.8)), 30),
    ])
    cam.data.dof.focus_object = ken.face_plane
    ken.lipsync(c, mood=lambda t: (0, 0))
    rim((-2, 3, 2.5), (0, 0, 1), 400, (1.0, 0.9, 0.75))
    render("how", c)


@shot("history", S("h1") - 0.12, S("e2") - 0.1)
def shot_history(c):
    new_set(lambda: P.landscape(tomb=True))
    its = AT("h2", "it's")
    seen = AT("h2", "seen")
    bal = heart_balloon("BALLOON", (-0.9, -0.2, 1.05))
    for fr in range(1, c.f(its) + 1, 4):
        key_loc(bal, fr, (-0.9, -0.2, 1.05 + math.sin(fr / FPS * 3.2) * 0.06))
        key_rot(bal, fr, (0, math.sin(fr / FPS * 5.1) * 5, 0))
    key_scale(bal, c.f(its - 0.2), 1.0)
    key_scale(bal, c.f(its - 0.1), 1.25)
    key_scale(bal, c.f(its - 0.05), 0.0)
    ken = Puppet("ken", loc=(-0.9, -0.2, 1.33))
    for fr in range(1, c.f(its - 0.2) + 1, 4):
        key_loc(ken.root, fr, (-0.9, -0.2, 1.33 + math.sin(fr / FPS * 3.2) * 0.06))
    # drop off the popped balloon and land on solid ground by the tomb
    key_loc(ken.root, c.f(its - 0.1), (-0.9, -0.2, 1.36))
    key_loc(ken.root, c.f(its + 0.35), (0.6, -0.3, 0.9))
    key_loc(ken.root, c.f(its + 0.7), (1.9, -0.35, 0.0))
    ken.set_pose(1, pose("idle"))
    ken.set_pose(c.f(its - 0.1), pose("idle"))
    ken.set_pose(c.f(its + 0.2), pose("armsup"))
    ken.set_pose(c.f(its + 0.75), pose("idle"))
    ken.set_pose(c.f(seen + 0.2), pose("open"))
    people = crowd(150, (2.75, 2.6), 3.0, 14.0, exclude=2.2)
    for k, (b_, h_) in enumerate(people):
        at = seen + 0.1 + (k / len(people)) * 1.4
        for o in (b_, h_):
            key_scale(o, 1, 0.0)
            key_scale(o, c.f(at), 0.0)
            key_scale(o, c.f(at + 0.25), 1.0)
    cam, tgt = camera(lens=35, fstop=4)
    ken.face_to(cam)
    cam_keys(cam, tgt, c, [
        (c.start, Vector((-0.3, -3.6, 1.9)), Vector((-0.9, -0.2, 1.75)), 35),
        (its - 0.2, Vector((-0.2, -3.9, 1.85)), Vector((-0.8, -0.2, 1.6)), 35),
        (its + 0.8, Vector((2.0, -3.0, 1.3)), Vector((2.3, 0.4, 0.9)), 35),
        (seen, Vector((2.1, -3.4, 1.5)), Vector((2.4, 0.6, 0.9)), 34),
        (seen + 1.8, Vector((2.6, -9.5, 6.5)), Vector((2.6, 2.5, 0.5)), 30),
        (c.end + 0.4, Vector((2.6, -10.5, 7.2)), Vector((2.6, 2.8, 0.4)), 30),
    ])
    cam.data.dof.focus_object = ken.face_plane
    ken.lipsync(c, mood=lambda t: (0, 0))
    area("LGT-tombglow", (2.75, -0.8, 1.0), (2.75, 1.2, 0.5), 0, (1.0, 0.85, 0.55), 1.0)
    g = bpy.data.objects["LGT-tombglow"].data
    g.keyframe_insert("energy", frame=c.f(its))
    g.energy = 250
    g.keyframe_insert("energy", frame=c.f(its + 0.8))
    rim((-3, 4, 3), (0, 0, 1), 500, (1.0, 0.85, 0.6))
    render("history", c)


@shot("scrolls", S("e2") - 0.1, S("e1") - 0.12)
def shot_scrolls(c):
    new_set(P.qumran)
    a = S("e2")
    scrolls = AT("e2", "scrolls")
    shep = Extra("shep", (-1.2, 0.4, 0), P.hexc("#c9a46c"), P.hexc("#e9e0cf"), yaw=30)
    key_rot(shep.arms["R"], 1, (0, 0, 0))
    key_rot(shep.arms["R"], c.f(a + 0.35), (-150, 20, 0))
    key_rot(shep.arms["R"], c.f(a + 0.6), (-40, 0, 0))
    stone = P.ball("stone", 0.05, (-1.05, 0.3, 1.5), P.hexc("#8a7a66"), ink=0.004)
    cave = Vector((0.55, 3.85, 1.8))
    key_loc(stone, 1, (-1.05, 0.3, 1.5))
    key_loc(stone, c.f(a + 0.6), (-1.05, 0.3, 1.5))
    for k in range(1, 9):
        u = k / 8
        p = Vector((-1.05, 0.3, 1.5)).lerp(cave, u) + Vector((0, 0, math.sin(u * math.pi) * 1.4))
        key_loc(stone, c.f(a + 0.6 + u * 0.7), tuple(p))
    key_scale(stone, c.f(a + 1.3), 1)
    key_scale(stone, c.f(a + 1.35), 0)
    # clay jars inside the cave, lit when we push in
    for k, (dx, h) in enumerate(((-0.2, 0.32), (0.05, 0.4), (0.25, 0.3))):
        P.cyl(f"jar{k}", 0.09, h, (cave.x + dx, cave.y + 0.25, cave.z - 0.35 + h / 2), P.hexc("#c98b52"), bevel=0.03)
    P.point("cavelight", (cave.x, cave.y + 0.1, cave.z), 0, (1.0, 0.8, 0.5), 0.2)
    cl = bpy.data.objects["cavelight"].data
    cl.keyframe_insert("energy", frame=c.f(scrolls - 0.6))
    cl.energy = 40
    cl.keyframe_insert("energy", frame=c.f(scrolls))
    cam, tgt = camera(lens=30, fstop=5.6)
    cam_keys(cam, tgt, c, [
        (c.start, Vector((-2.0, -5.5, 1.5)), Vector((-0.4, 1.6, 1.5)), 26),
        (a + 1.4, Vector((-1.3, -4.2, 1.7)), Vector((0.0, 2.6, 1.6)), 28),
        (scrolls + 0.4, Vector((-0.3, -1.6, 1.9)), Vector((cave.x, cave.y, cave.z)), 34),
        (c.end + 0.4, Vector((-0.1, -1.1, 1.9)), Vector((cave.x, cave.y, cave.z - 0.1)), 34),
    ])
    rim((4, 6, 5), (0, 3, 1), 300, (1.0, 0.9, 0.7))
    render("scrolls", c)


@shot("every", S("e1") - 0.12, S("e3") - 0.1)
def shot_every(c):
    new_set(P.studio)
    P.cyl("pedestal", 0.45, 0.8, (0, 0.4, 0.4), P.hexc("#b07a4a"), bevel=0.02)
    book = empty("BOOK", loc=(0, 0.4, 0.84))
    cover = P.box("cover", (0.9, 0.62, 0.04), (0, 0, 0), P.hexc("#7a2a2a"), bevel=0.01)
    cover.parent = book
    for side in (-1, 1):
        pg = P.box(f"block{side}", (0.42, 0.56, 0.05), (side * 0.22, 0, 0.04), P.hexc("#fffaf0"), bevel=0.01, ink=0.004)
        pg.parent = book
    t0 = c.start + 0.1
    for k in range(7):
        piv = empty(f"pagepiv{k}", book, (0, 0, 0.07 + k * 0.001))
        pg = P.box(f"page{k}", (0.41, 0.55, 0.002), (0.205, 0, 0), P.hexc("#fffdf6"), bevel=0, ink=0.003)
        pg.parent = piv
        st = t0 + k * 0.22
        key_rot(piv, 1, (0, 0, 0))
        key_rot(piv, c.f(st), (0, 0, 0))
        key_rot(piv, c.f(st + 0.45), (0, -178, 0))
    rib = P.box("ribbon", (0.04, 0.02, 0.3), (0, -0.31, -0.1), P.hexc("#d93a3a"), bevel=0, ink=0.003)
    rib.parent = book
    P.point("bookglow", (0, 0.3, 1.3), 30, (1.0, 0.85, 0.55), 0.3)
    cam, tgt = camera(lens=38, fstop=2.8, focus=cover)
    piv = empty("orbit", loc=(0, 0.4, 0.84))
    cam.parent = piv
    cam_keys(cam, tgt, c, [(c.start, Vector((0, -1.9, 0.75)), Vector((0, 0.45, 0.95))), (c.end + 0.4, Vector((0, -1.5, 0.6)), Vector((0, 0.45, 0.92)))])
    key_rot(piv, 1, (0, 0, -25))
    key_rot(piv, c.frames, (0, 0, 15))
    lin(piv)
    render("every", c)


@shot("read", S("e3") - 0.1, S("a1") - 0.12)
def shot_read(c):
    new_set(lambda: P.bedroom(True))
    ken = Puppet("ken", loc=(0.55, 0.7, 0), yaw=-15)
    ken.set_pose(1, pose("book"))
    bk = P.box("rbook", (0.26, 0.18, 0.02), (0, 0, 0), P.hexc("#fffaf0"), bevel=0.005, ink=0.004)
    ken.hold("R", bk, loc=(-0.08, -0.06, -0.02), rot=(-60, 0, 0))
    cam, tgt = camera(lens=40, fstop=2.2)
    ken.face_to(cam)
    every = AT("e3", "every")
    cam_keys(cam, tgt, c, [
        (c.start, Vector((-0.6, -2.2, 1.0)), Vector((0.5, 0.7, 1.1)), 30),
        (every, Vector((0.2, -1.4, 1.2)), Vector((0.55, 0.7, 1.25)), 40),
        (c.end + 0.4, Vector((0.4, -1.1, 1.25)), Vector((0.6, 0.7, 1.28)), 50),
    ])
    cam.data.dof.focus_object = ken.face_plane
    ken.lipsync(c, mood=lambda t: (0.2, 0))
    dust(120, (0.6, 0.6, 1.3), 1.2, c)
    volume(0.014, (1.0, 0.9, 0.7), loc=(0, 1, 2))
    render("read", c)


@shot("friend", S("a1") - 0.12, S("a3") - 0.1)
def shot_friend(c):
    new_set(P.study)
    ken = Puppet("ken", loc=(-0.35, -0.05, 0), yaw=-25)
    ken.hips.location.z = 0.27
    ken.set_pose(1, pose("sit", "hands_knees"))
    buzz = S("a1") + 0.5
    ph = phone_obj([(c.start, 1), (buzz, 2)], c, glow=2.6)
    ph.location = (0.9, 0.3, 0.79)
    ph.rotation_euler = (R(90), 0, R(15))
    for k in range(6):
        key_loc(ph, c.f(buzz) + k * 2, (0.9 + (0.01 if k % 2 else -0.01), 0.3, 0.79))
    key_loc(ph, c.f(buzz) + 12, (0.9, 0.3, 0.79))
    ken.set_pose(c.f(buzz + 0.3), pose("sit", "hands_knees"))
    ken.set_pose(c.f(buzz + 0.7), {**pose("sit"), "spine": (-4, 0, 0)})
    cam, tgt = camera(lens=35, fstop=2.8)
    ken.face_to(cam)
    cam_keys(cam, tgt, c, [
        (c.start, Vector((0.35, -3.2, 1.15)), Vector((0.2, 0.15, 0.8)), 30),
        (buzz, Vector((0.25, -2.7, 1.1)), Vector((0.1, 0.15, 0.82)), 32),
        (c.end + 0.4, Vector((-0.1, -2.3, 1.05)), Vector((-0.2, 0.05, 0.9)), 36),
    ])
    cam.data.dof.focus_object = ken.face_plane
    ken.lipsync(c, mood=lambda t: (0.5 if t < buzz + 0.6 else 0, 1 if t < buzz + 0.6 else 0), talk=lambda t: False)
    rim((-1.5, 1.8, 2.0), (-0.35, 0, 1.0), 200, (1.0, 0.85, 0.6))
    render("friend", c)


@shot("people", S("a3") - 0.1, S("r1") - 0.12)
def shot_people(c):
    new_set(lambda: P.landscape(tomb=False))
    ken = Puppet("ken", loc=(0, 0, 0))
    ken.set_pose(1, pose("idle"))
    people = AT("a3", "people")
    spots = [(-0.75, 0.15, 20, "#e3a04d", "#2a1d14", "R"), (0.75, 0.15, -20, "#d9706f", "#1d1410", "L"), (-1.4, 0.6, 30, "#79b38b", "#6b4a2b", "R"), (1.4, 0.6, -30, "#7f9fd6", "#c7a26a", "L")]
    for k, (x, y, yaw, col, hair, arm) in enumerate(spots):
        e = Extra(f"fr{k}", (x, y, 0), P.hexc(col), P.hexc(hair), yaw=yaw)
        key_rot(e.arms[arm], 1, (0, 0, 0))
        key_rot(e.arms[arm], c.f(people + k * 0.1), (0, 0, 0))
        key_rot(e.arms[arm], c.f(people + 0.4 + k * 0.1), (-20, 70 if arm == "R" else -70, 0))
    cam, tgt = camera(lens=32, fstop=4)
    ken.face_to(cam)
    piv = empty("orbit", loc=(0, 0.2, 0.9))
    cam.parent = piv
    cam_keys(cam, tgt, c, [(c.start, Vector((0, -2.6, 0.4)), Vector((0, 0.2, 0.95)))])
    key_rot(piv, 1, (0, 0, 35))
    key_rot(piv, c.frames, (0, 0, -15))
    cam.data.dof.focus_object = ken.face_plane
    ken.lipsync(c, mood=lambda t: (0, 0), talk=lambda t: False)
    rim((-2, 3, 2.5), (0, 0, 1), 400, (1.0, 0.9, 0.75))
    render("people", c)


@shot("car", S("r1") - 0.12, S("r2") - 0.1)
def shot_car(c):
    new_set(P.road)
    car = empty("CAR", loc=(-3.0, 0.6, 0))
    red = P.hexc("#d94a4a")
    body = P.box("car_body", (2.0, 0.95, 0.45), (0, 0, 0), red, bevel=0.12)
    body.parent = car
    body.location = (0, 0, 0.45)
    ws = P.box("car_windshield", (0.05, 0.86, 0.34), (0, 0, 0), P.hexc("#cfe7f2"), bevel=0.03, ink=0.006)
    ws.parent = car
    ws.location = (0.55, 0, 0.84)
    ws.rotation_euler = (0, R(-20), 0)
    seat = P.box("car_seat", (0.3, 0.8, 0.5), (0, 0, 0), P.hexc("#3b3640"), bevel=0.06)
    seat.parent = car
    seat.location = (-0.25, 0, 0.75)
    wheels = []
    for k, (x, y) in enumerate(((-0.65, -0.45), (0.65, -0.45), (-0.65, 0.45), (0.65, 0.45))):
        w = P.cyl(f"wheel{k}", 0.2, 0.14, (0, 0, 0), P.hexc("#26232a"), rot=(90, 0, 0), bevel=0.02)
        w.parent = car
        w.location = (x, y, 0.2)
        wheels.append(w)
    mirror = P.box("mirror", (0.16, 0.05, 0.11), (0, 0, 0), P.hexc("#2d2a33"), bevel=0.02)
    mirror.parent = car
    mirror.location = (0.62, -0.52, 0.86)
    bpy.ops.mesh.primitive_plane_add(size=1)
    mglass = bpy.context.active_object
    mglass.name = "mirror_glass"
    mglass.scale = (0.13, 0.08, 1)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    mglass.rotation_euler = (R(90), 0, 0)
    mglass.parent = car
    mglass.location = (0.62, -0.552, 0.86)
    mm = bpy.data.materials.new("mirror_img")
    mm.use_nodes = True
    nt = mm.node_tree
    tx = nt.nodes.new("ShaderNodeTexImage")
    tx.image = bpy.data.images.load(os.path.join(ROOT, "public", "plates", "bedroom_night.jpg"))
    bb = nt.nodes["Principled BSDF"]
    nt.links.new(tx.outputs["Color"], bb.inputs["Base Color"])
    nt.links.new(tx.outputs["Color"], bb.inputs["Emission Color"])
    bb.inputs["Emission Strength"].default_value = 0.9
    mglass.data.materials.append(mm)
    # Ken drives: his face in the driver's window
    ken = Puppet("ken", loc=(-0.12, 0.05, 0.42), scale=0.66)
    ken.root.parent = car
    ken.set_pose(1, pose("sit"))
    plate = text3d("plate", "LOGIA", (0, 0, 0), 0.09, P.hexc("#1d1a1a"), extrude=0.005)
    plate.parent = car
    plate.location = (-1.01, 0, 0.4)
    plate.rotation_euler = (R(90), 0, R(-90))
    key_loc(car, 1, (-3.0, 0.6, 0))
    key_loc(car, c.frames, (-3.0 + 7.0 * c.frames / FPS, 0.6, 0))
    lin(car)
    for w in wheels:
        key_rot(w, 1, (90, 0, 0))
        key_rot(w, c.frames, (90, -360 * 5, 0))
        lin(w)
    cam, tgt = camera(lens=32, fstop=2.8)
    ken.face_to(cam)
    track = empty("track")
    track.parent = car
    tgt.parent = car
    cam.parent = car
    r2 = S("r2")
    cam_keys(cam, tgt, c, [
        (c.start, Vector((-0.2, -4.6, 1.15)), Vector((0.1, 0, 0.75)), 30),
        (r2 - 0.8, Vector((0.9, -1.6, 1.0)), Vector((0.62, -0.55, 0.86)), 40),
        (c.end + 0.4, Vector((0.64, -0.75, 0.87)), Vector((0.62, -0.556, 0.86)), 50),
    ])
    cam.data.dof.focus_object = ken.face_plane
    ken.lipsync(c, mood=lambda t: (0, 0), talk=lambda t: False)
    render("car", c)


@shot("thread", S("r2") - 0.1, AT("r2", "everywhere") + 0.95)
def shot_thread(c):
    new_set(P.corkboard)
    imgs = ["bedroom_night", "church_in", "study", "bedroom_dawn", "hills", "qumran", "road", "radio_room", "elijah", "studio"]
    spots = [(-0.9, 1.2, -6), (0.6, 1.5, 5), (-0.4, 0.6, 3), (0.9, 0.5, -4), (0.0, -0.2, 6), (-1.7, 0.3, 4), (1.8, 1.0, -5), (-1.6, 1.8, 3), (1.7, -0.1, 4), (0.2, 2.3, -3)]
    frames = []
    look = S("r2")
    for k, (x, z, r) in enumerate(spots):
        p = polaroid(f"pol{k}", os.path.join(ROOT, "public", "plates", imgs[k] + ".jpg"), (x, 0.42, z + 0.6), r, 0.5)
        frames.append(p)
        appear = look + (k * 0.12 if k < 5 else 0.9 + k * 0.05)
        key_scale(p, 1, 0.0 if k >= 5 else 1.0)
        if k >= 5:
            key_scale(p, c.f(appear), 0.0)
            key_scale(p, c.f(appear + 0.3), 1.0)
    pts = [Vector((x, 0.39, z + 0.6 + 0.26)) for (x, z, r) in spots]
    order = [0, 1, 2, 3, 4]
    th = thread_curve([pts[i] for i in order])
    th.data.bevel_factor_end = 0
    red = AT("r2", "red")
    th.data.keyframe_insert("bevel_factor_end", frame=c.f(red - 0.5))
    th.data.bevel_factor_end = 1
    th.data.keyframe_insert("bevel_factor_end", frame=c.f(red + 1.2))
    ext = thread_curve([pts[i] for i in (4, 5, 7, 9, 6, 8)], "THREAD2")
    ext.data.bevel_factor_end = 0
    every = AT("r2", "everywhere")
    ext.data.keyframe_insert("bevel_factor_end", frame=c.f(every - 0.2))
    ext.data.bevel_factor_end = 1
    ext.data.keyframe_insert("bevel_factor_end", frame=c.f(every + 0.7))
    prints = AT("r2", "fingerprints")
    for k, (x, z, r) in enumerate(spots[:5]):
        fp = fingerprint(f"fp{k}", (x + 0.15, 0.405, z + 0.42), 0.09)
        key_scale(fp, 1, 0.0)
        key_scale(fp, c.f(prints + k * 0.12), 0.0)
        key_scale(fp, c.f(prints + k * 0.12 + 0.12), (0.11, 0.14, 1))
    cam, tgt = camera(lens=40, fstop=2.8)
    cam_keys(cam, tgt, c, [
        (c.start, Vector((-0.8, -1.3, 1.85)), Vector((-0.85, 0.4, 1.85)), 45),
        (AT("r2", "every"), Vector((-0.5, -1.2, 1.6)), Vector((-0.4, 0.4, 1.4)), 45),
        (red, Vector((0.0, -1.9, 1.35)), Vector((0.0, 0.4, 1.25)), 40),
        (prints + 0.5, Vector((0.1, -2.0, 1.3)), Vector((0.1, 0.4, 1.2)), 40),
        (every, Vector((0.0, -2.2, 1.35)), Vector((0.0, 0.4, 1.3)), 38),
        (c.end + 0.4, Vector((0.0, -4.6, 1.6)), Vector((0.0, 0.4, 1.4)), 30),
    ])
    cam.data.dof.focus_object = frames[2]
    render("thread", c)


@shot("dawn", AT("r2", "everywhere") + 0.95, S("cta") - 0.6)
def shot_dawn(c):
    new_set(lambda: P.bedroom(True))
    ken = ken_sit_on_bed(c)
    ken.set_pose(1, pose("sit", "hands_knees"))
    ph = phone_obj([(c.start, 4)], c, glow=1.2)
    ph.location = (BED_SEAT[0] - 0.45, 0.25, 0.36)
    ph.rotation_euler = (R(90), 0, R(10))
    cam, tgt = camera(lens=40, fstop=2.0)
    ken.face_to(cam)
    w = S("end2")
    cam_keys(cam, tgt, c, [
        (c.start, Vector((0.6, -2.6, 1.0)), Vector((BED_SEAT[0], 0, 0.95)), 32),
        (w, Vector((0.35, -1.9, 1.05)), Vector((BED_SEAT[0], 0, 1.0)), 38),
        (c.end + 0.4, Vector((0.1, -1.4, 1.05)), Vector((BED_SEAT[0], 0, 1.02)), 48),
    ])
    cam.data.dof.focus_object = ken.face_plane
    ken.lipsync(c, mood=lambda t: (0.6 if t > w + 0.6 else 0.2, 0), talk=lambda t: t >= w - 0.05)
    dust(150, (0.0, 0.6, 1.4), 1.4, c)
    volume(0.016, (1.0, 0.88, 0.65), loc=(0, 1, 2))
    render("dawn", c)


@shot("cta", S("cta") - 0.6, DATA["total"])
def shot_cta(c):
    new_set(P.studio)
    cols = ["#d93a3a", "#f2c94c", "#79b38b", "#7f9fd6"]
    for i, ch in enumerate("HEAR"):
        b = letter_block(f"blk{ch}", ch, ((i - 1.5) * 0.74, 0.9, 0.31), P.hexc(cols[i]))
        land = c.start + 0.15 + i * 0.12
        key_loc(b, 1, (b.location.x, 0.9, 4.5))
        key_loc(b, c.f(land), (b.location.x, 0.9, 4.5))
        key_loc(b, c.f(land + 0.25), (b.location.x, 0.9, 0.31))
    ken = Puppet("ken", loc=(1.45, 0.35, 0), yaw=-25)
    ken.set_pose(1, pose("point"))
    cam, tgt = camera(lens=35, fstop=4)
    ken.face_to(cam)
    cam_keys(cam, tgt, c, [
        (c.start, Vector((0.25, -5.6, 1.4)), Vector((0.25, 0.6, 0.85)), 30),
        (c.end + 0.4, Vector((0.35, -4.8, 1.25)), Vector((0.3, 0.6, 0.85)), 31),
    ])
    ken.lipsync(c, mood=lambda t: (0, 0))
    rim((-2, 3, 2.5), (0, 0.6, 1), 400, (1.0, 0.9, 0.75))
    render("cta", c)


if __name__ == "__main__":
    names = [a for a in ARGS if a in SHOTS] or list(SHOTS)
    for n in names:
        fn, start, end = SHOTS[n]
        fn(Clock(start, end))
