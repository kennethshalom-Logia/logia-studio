"""Logia's main character (and supporting cast) as posable 3D 'designer toy' figures.

Each figure is a hierarchy of pivots (empties) with simple meshes parented to them, so poses are just joint
rotations: no skinning. Units are metres; the character stands about 1.6 m tall with a big head.
"""
import math
import random

import bmesh
import bpy
from mathutils import Vector

from common import FPS, frame, link, mat
import toon

R = math.radians


def lin(hex_color):
    """'#rrggbb' -> linear RGB tuple."""
    h = hex_color.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((x / 12.92) if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


_mats = {}


def M(name, hex_color, rough=0.6, metal=0.0, emit=None, strength=0.0):
    key = (name, hex_color, rough)
    if key not in _mats:
        _mats[key] = mat(name, lin(hex_color), rough=rough, metal=metal, emit=lin(emit) if emit else None, strength=strength)
    return _mats[key]


def empty(name, parent=None, loc=(0, 0, 0)):
    e = link(bpy.data.objects.new(name, None))
    e.empty_display_size = 0.05
    if parent:
        e.parent = parent
    e.location = loc
    return e


def _finish(o, parent, m, smooth=True):
    o.parent = parent
    if m:
        o.data.materials.append(m)
    if smooth and o.type == "MESH":
        for p in o.data.polygons:
            p.use_smooth = True
    return o


def sphere(name, parent, loc, scale, m, seg=32):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=seg // 2, radius=1)
    o = bpy.context.active_object
    o.name = name
    o.location = loc
    o.scale = scale
    return _finish(o, parent, m)


def capsule(name, parent, length, radius, m, down=True):
    """A rounded limb from the pivot downwards (-Z) of the given length."""
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=radius, depth=length)
    o = bpy.context.active_object
    o.name = name
    o.location = (0, 0, -length / 2 if down else length / 2)
    _finish(o, parent, m)
    sphere(name + "_cap", parent, (0, 0, -length if down else length), (radius, radius, radius), m, seg=16)
    sphere(name + "_top", parent, (0, 0, 0), (radius, radius, radius), m, seg=16)
    return o


def rbox(name, parent, loc, size, m, bevel=0.04):
    bpy.ops.mesh.primitive_cube_add(size=1)
    o = bpy.context.active_object
    o.name = name
    o.location = loc
    o.scale = size
    b = o.modifiers.new("bev", "BEVEL")
    b.width = bevel
    b.segments = 4
    b.affect = "EDGES"
    return _finish(o, parent, m)


LOOKS = {
    # The Logia main character, from the expression sheet.
    "ken": dict(skin="#e8913f", hair="#120d0b", curls=True, glasses=True, beard="#3b2417", jacket="#1b1b20", tee="#f2efe8",
                pants="#25304a", shoe="#f5f2ec", sole="#ffc94d", hood=False),
    "friend": dict(skin="#8d5a3b", hair="#0d0907", curls=False, glasses=False, beard=None, jacket="#e2a83a", tee="#e2a83a",
                   pants="#2c2a35", shoe="#ffffff", sole="#ff5c8a", hood=True),
    "mentor": dict(skin="#d6a07a", hair="#d8d4cc", curls=False, glasses=True, beard="#d8d4cc", jacket="#3a4150", tee="#c9b48a",
                   pants="#2a2f3a", shoe="#3a2a1c", sole="#3a2a1c", hood=False),
    "preacher": dict(skin="#b8835a", hair="#1d1612", curls=False, glasses=False, beard="#1d1612", jacket="#22252c", tee="#f2efe8",
                     pants="#22252c", shoe="#121212", sole="#121212", hood=False, tie="#b02a3a"),
    "buddy": dict(skin="#c9946a", hair="#4a2f1c", curls=False, glasses=False, beard=None, jacket="#2f8f6b", tee="#2f8f6b",
                  pants="#1d2230", shoe="#ffffff", sole="#3dd6ff", hood=True),
    "elijah": dict(skin="#a8714b", hair="#cfc8bb", curls=False, glasses=False, beard="#cfc8bb", jacket="#7b6448", tee="#7b6448",
                   pants="#6d583e", shoe="#3a2a1a", sole="#3a2a1a", hood=False, robe="#7b6448", longbeard=True),
}


def build(name, look="ken", loc=(0, 0, 0), rot_z=0.0, seed=1, phone=False):
    """Builds a figure and returns a dict of its pivots and animatable parts."""
    L = LOOKS[look]
    rnd = random.Random(seed)
    skin = M("skin_" + look, L["skin"], rough=0.55)
    skin_dark = M("skin_dark_" + look, "#d0803a" if look == "ken" else L["skin"], rough=0.6)
    hair = M("hair_" + look, L["hair"], rough=0.45)
    jacket = M("jacket_" + look, L["jacket"], rough=0.5)
    tee = M("tee_" + look, L["tee"], rough=0.8)
    pants = M("pants_" + look, L["pants"], rough=0.75)
    shoe = M("shoe_" + look, L["shoe"], rough=0.5)
    sole = M("sole_" + look, L["sole"], rough=0.4)
    white = M("eye_white", "#ffffff", rough=0.25)
    black = M("pupil", "#0a0808", rough=0.2)
    mouth_m = M("mouth", "#5a1a14", rough=0.5)
    frame_m = M("glasses", "#2a2420", rough=0.3, metal=0.5)
    lens_m = M("lens", "#cfe6ff", rough=0.05)
    lens_m.node_tree.nodes["Principled BSDF"].inputs["Alpha"].default_value = 0.18
    try:
        lens_m.surface_render_method = "BLENDED"
    except Exception:
        pass

    root = empty(name, loc=loc)
    root.rotation_euler = (0, 0, rot_z)
    hips = empty(name + "_hips", root, (0, 0, 0.74))
    # Legs: hip pivots -> thigh -> knee pivot -> shin -> foot.
    parts = {"root": root, "hips": hips}
    for side, sx in (("L", 1), ("R", -1)):
        hp = empty(f"{name}_hip{side}", hips, (0.11 * sx, 0, 0))
        capsule(f"{name}_thigh{side}", hp, 0.32, 0.078, pants)
        kn = empty(f"{name}_knee{side}", hp, (0, 0, -0.32))
        capsule(f"{name}_shin{side}", kn, 0.3, 0.068, pants)
        ft = empty(f"{name}_foot{side}", kn, (0, 0, -0.34))
        rbox(f"{name}_shoe{side}", ft, (0, -0.05, -0.02), (0.15, 0.27, 0.1), shoe, bevel=0.04)
        rbox(f"{name}_sole{side}", ft, (0, -0.05, -0.075), (0.155, 0.275, 0.025), sole, bevel=0.01)
        parts["hip" + side], parts["knee" + side], parts["foot" + side] = hp, kn, ft
    if L.get("robe"):
        bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=0.34, radius2=0.2, depth=0.82)
        robe = bpy.context.active_object
        robe.name = name + "_robe"
        robe.location = (0, 0, -0.3)
        _finish(robe, hips, M("robe_" + look, L["robe"], rough=0.9))

    spine = empty(name + "_spine", hips, (0, 0, 0.0))
    parts["spine"] = spine
    tor = rbox(name + "_torso", spine, (0, 0, 0.27), (0.44, 0.3, 0.56), jacket, bevel=0.14)
    tor.modifiers["bev"].segments = 6
    rbox(name + "_tee", spine, (0, -0.152, 0.3), (0.12, 0.02, 0.46), tee, bevel=0.01)
    if L.get("tie"):
        rbox(name + "_tie", spine, (0, -0.166, 0.32), (0.04, 0.012, 0.3), M("tie", L["tie"]), bevel=0.005)
    for sx in (1, -1):
        rbox(f"{name}_collar{sx}", spine, (0.075 * sx, -0.07, 0.575), (0.05, 0.14, 0.09), jacket, bevel=0.02)
        rbox(f"{name}_lapel{sx}", spine, (0.07 * sx, -0.16, 0.33), (0.018, 0.012, 0.46), M("lapel", "#3a3a44" if look == "ken" else L["jacket"]), bevel=0.004)
    if L.get("hood"):
        sphere(name + "_hood", spine, (0, 0.1, 0.55), (0.2, 0.13, 0.09), jacket)

    # Arms: shoulder pivot -> upper arm -> elbow pivot -> forearm -> hand.
    for side, sx in (("L", 1), ("R", -1)):
        sh = empty(f"{name}_shoulder{side}", spine, (0.27 * sx, 0, 0.5))
        capsule(f"{name}_upper{side}", sh, 0.27, 0.068, jacket)
        el = empty(f"{name}_elbow{side}", sh, (0, 0, -0.27))
        capsule(f"{name}_fore{side}", el, 0.24, 0.06, jacket)
        hd = empty(f"{name}_hand{side}", el, (0, 0, -0.3))
        sphere(f"{name}_palm{side}", hd, (0, 0, 0), (0.06, 0.05, 0.065), skin)
        parts["shoulder" + side], parts["elbow" + side], parts["hand" + side] = sh, el, hd
        if phone and side == "R":
            rbox(name + "_phone", hd, (0, -0.08, -0.06), (0.1, 0.014, 0.19), M("phone_body", "#101114", rough=0.3), bevel=0.01)
            scr = rbox(name + "_screen", hd, (0, -0.089, -0.06), (0.088, 0.004, 0.17), M("phone_screen", "#6fd0ff", emit="#7fd8ff", strength=4), bevel=0.004)
            parts["screen"] = scr

    # Head on a neck pivot.
    neck = empty(name + "_neck", spine, (0, 0, 0.58))
    parts["neck"] = neck
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.07, depth=0.1)
    nk = bpy.context.active_object
    nk.name = name + "_neckmesh"
    nk.location = (0, 0, 0.04)
    _finish(nk, neck, skin)
    head = empty(name + "_head", neck, (0, 0, 0.08))
    parts["head"] = head
    hz = 0.27  # head centre above the head pivot
    if look == "ken":
        parts.update(toon.build_head(name, head, lin(L["skin"]), lin(L["hair"]), seed=seed))
        toon.toonify(root)
        return parts
    sphere(name + "_skull", head, (0, 0, hz), (0.255, 0.235, 0.29), skin, seg=48)
    sphere(name + "_jaw", head, (0, -0.02, hz - 0.11), (0.22, 0.2, 0.17), skin, seg=32)
    for sx in (1, -1):
        sphere(f"{name}_ear{sx}", head, (0.25 * sx, 0.01, hz - 0.02), (0.04, 0.03, 0.06), skin, seg=16)
    sphere(name + "_nose", head, (0, -0.245, hz - 0.04), (0.035, 0.035, 0.045), skin_dark, seg=16)

    # Beard: a dark shell over the jaw, cut off above the mouth line.
    if L.get("beard"):
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=40, v_segments=24, radius=1)
        for v in bm.verts:
            v.co = Vector((v.co.x * 0.232, v.co.y * 0.213 - 0.02, v.co.z * 0.182 + hz - 0.11))
        # Keep a stubble band along the jaw and the chin; clear the cheeks and the area around the mouth.
        cut = [v for v in bm.verts if v.co.z > hz - 0.075 or v.co.y > 0.05 or (abs(v.co.x) < 0.085 and v.co.z > hz - 0.175)]
        bmesh.ops.delete(bm, geom=cut, context="VERTS")
        me = bpy.data.meshes.new(name + "_beard")
        bm.to_mesh(me)
        bm.free()
        bd = link(bpy.data.objects.new(name + "_beard", me))
        bd.modifiers.new("t", "SOLIDIFY").thickness = 0.012
        _finish(bd, head, M("beard_" + look, L["beard"], rough=0.95))
        bd.scale = (1.0, 1.0, 1.0)
        if L.get("longbeard"):
            sphere(name + "_longbeard", head, (0, -0.15, hz - 0.3), (0.13, 0.08, 0.17), M("beard_" + look, L["beard"], rough=0.9))
        # Moustache.
        sphere(name + "_stache", head, (0, -0.238, hz - 0.1), (0.07, 0.025, 0.018), M("beard_" + look, L["beard"], rough=0.9), seg=16)

    # Mouth: a dark lens whose height animates for speech.
    mouth_piv = empty(name + "_mouth", head, (0, -0.228, hz - 0.135))
    sphere(name + "_mouthmesh", mouth_piv, (0, 0, 0), (0.05, 0.02, 0.022), mouth_m, seg=24)
    sphere(name + "_teeth", mouth_piv, (0, -0.006, 0.01), (0.04, 0.016, 0.008), white, seg=16)
    parts["mouth"] = mouth_piv
    mouth_piv.scale = (1, 1, 0.25)

    # Eyes with pupils on look pivots and eyelids for blinks.
    parts["eyes"], parts["lids"], parts["brows"] = [], [], []
    for side, sx in (("L", 1), ("R", -1)):
        ex = 0.088 * sx
        sphere(f"{name}_eye{side}", head, (ex, -0.205, hz + 0.02), (0.05, 0.035, 0.045), white, seg=24)
        lk = empty(f"{name}_look{side}", head, (ex, -0.235, hz + 0.02))
        sphere(f"{name}_pupil{side}", lk, (0, -0.008, 0), (0.022, 0.012, 0.026), black, seg=16)
        sphere(f"{name}_glint{side}", lk, (0.008, -0.018, 0.01), (0.006, 0.004, 0.006), white, seg=8)
        lid = empty(f"{name}_lid{side}", head, (ex, -0.205, hz + 0.065))
        sphere(f"{name}_lidmesh{side}", lid, (0, 0, -0.025), (0.056, 0.042, 0.03), skin, seg=24)
        lid.scale = (1, 1, 0.15)
        bw = empty(f"{name}_brow{side}", head, (ex, -0.236, hz + 0.105))
        rbox(f"{name}_browmesh{side}", bw, (0, 0, 0), (0.085, 0.025, 0.022), M("brow_" + look, L["hair"] if look != "mentor" else "#bdb8ae"), bevel=0.01)
        parts["eyes"].append(lk)
        parts["lids"].append(lid)
        parts["brows"].append(bw)

    if L.get("glasses"):
        for sx in (1, -1):
            bpy.ops.mesh.primitive_torus_add(major_segments=32, minor_segments=8, major_radius=0.06, minor_radius=0.007)
            fr = bpy.context.active_object
            fr.name = f"{name}_frame{sx}"
            fr.location = (0.09 * sx, -0.258, hz + 0.02)
            fr.rotation_euler = (R(90), 0, 0)
            fr.scale = (1.08, 0.86, 1)
            _finish(fr, head, frame_m)
            bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.06, depth=0.004)
            ln = bpy.context.active_object
            ln.name = f"{name}_lens{sx}"
            ln.location = (0.09 * sx, -0.258, hz + 0.02)
            ln.rotation_euler = (R(90), 0, 0)
            ln.scale = (1.08, 0.86, 1)
            _finish(ln, head, lens_m)
            bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.006, depth=0.24)
            tm = bpy.context.active_object
            tm.name = f"{name}_temple{sx}"
            tm.location = (0.155 * sx, -0.14, hz + 0.03)
            tm.rotation_euler = (R(90), 0, 0)
            _finish(tm, head, frame_m)
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.007, depth=0.06)
        br = bpy.context.active_object
        br.name = name + "_bridge"
        br.location = (0, -0.262, hz + 0.035)
        br.rotation_euler = (0, R(90), 0)
        _finish(br, head, frame_m)

    # Hair.
    if L["curls"]:
        pts = []
        for i in range(150):
            # Points on the upper-back part of an ellipsoid around the skull, a bit bigger than it.
            u = rnd.uniform(0, 2 * math.pi)
            v = rnd.uniform(-0.15, 1.0)
            x = math.cos(u) * math.cos(v * math.pi / 2) * 0.262
            y = math.sin(u) * math.cos(v * math.pi / 2) * 0.245
            z = math.sin(v * math.pi / 2) * 0.2 + hz + 0.1
            if y < -0.1 and z < hz + 0.17:
                continue  # keep the face clear
            pts.append((x, y + 0.02, z))
        for i, p in enumerate(pts):
            r = rnd.uniform(0.042, 0.06)
            sphere(f"{name}_curl{i}", head, p, (r, r, r * 0.95), hair, seg=16)
        for i, x in enumerate((-0.18, -0.12, -0.06, 0.0, 0.06, 0.12, 0.18)):
            r = 0.05
            sphere(f"{name}_fringe{i}", head, (x, -0.19 + abs(x) * 0.25, hz + 0.19 - abs(x) * 0.3), (r, r * 0.9, r), hair, seg=16)
    else:
        sphere(name + "_hair", head, (0, 0.03, hz + 0.08), (0.27, 0.255, 0.25), hair, seg=32)
        sphere(name + "_hairfront", head, (0, -0.12, hz + 0.17), (0.22, 0.12, 0.09), hair, seg=24)
    return parts


# ---------- posing ----------

# A pose: joint rotations in degrees. shoulder (side, forward), elbow bend, hip forward, knee bend, spine lean, head (pitch, yaw, roll).
BASE = dict(shL=(8, 0), shR=(8, 0), elL=0, elR=0, hipL=0, hipR=0, knL=0, knR=0, lean=0, head=(0, 0, 0), drop=0.0)
POSES = {
    "idle": dict(),
    "phone": dict(shR=(10, 55), elR=95, head=(-14, 0, 0), shL=(6, 0)),
    "pray": dict(shL=(8, 40), elL=100, shR=(8, 40), elR=100, head=(-22, 0, 0), lean=6),
    "kneel": dict(hipL=0, hipR=0, knL=-95, knR=-95, drop=-0.3, shL=(10, 40), elL=105, shR=(10, 40), elR=105, head=(-24, 0, 0), lean=8),
    "kneel_up": dict(hipL=0, hipR=0, knL=-95, knR=-95, drop=-0.3, shL=(14, 10), elL=40, shR=(14, 10), elR=40, head=(24, 0, 0), lean=-4),
    "sit": dict(hipL=90, hipR=90, knL=-90, knR=-90, drop=-0.28, shL=(8, 20), elL=60, shR=(8, 20), elR=60),
    "sit_up": dict(hipL=90, hipR=90, knL=-90, knR=-90, drop=-0.28, shL=(8, 8), elL=30, shR=(8, 8), elR=30, head=(18, 0, 0), lean=-5),
    "worship": dict(shL=(150, 10), elL=10, shR=(150, 10), elR=10, head=(22, 0, 0), lean=-4),
    "look_up": dict(head=(26, 0, 0), shL=(14, 0), shR=(14, 0), lean=-3),
    "open": dict(shL=(55, 20), elL=30, shR=(55, 20), elR=30, head=(6, 0, 0)),
    "open_up": dict(shL=(70, 10), elL=10, shR=(70, 10), elR=10, head=(20, 0, 0), lean=-4),
    "read": dict(shL=(10, 60), elL=80, shR=(10, 60), elR=80, head=(-24, 0, 0), lean=6),
    "read_sit": dict(hipL=90, hipR=90, knL=-90, knR=-90, drop=-0.28, shL=(10, 60), elL=80, shR=(10, 60), elR=80, head=(-24, 0, 0), lean=6),
    "head_down": dict(head=(-26, 0, 0), shL=(4, 0), shR=(4, 0), lean=6),
    "preach": dict(shR=(40, 50), elR=70, shL=(20, 30), elL=40, head=(4, 0, 0)),
    "hand_shoulder": dict(shR=(30, 70), elR=10),
    "wave": dict(shR=(160, 0), elR=-20),
}


def pose_values(name):
    p = dict(BASE)
    p.update(POSES[name] if isinstance(name, str) else name)
    return p


def apply_pose(parts, p, t, base_z=0.0):
    f = frame(t)
    def rot(obj, e):
        obj.rotation_euler = tuple(R(a) for a in e)
        obj.keyframe_insert("rotation_euler", frame=f)
    # Shoulders: side raise about Y (sign per side), forward about X.
    # The figure faces -Y, so forward rotations about X are negative.
    rot(parts["shoulderL"], (-p["shL"][1], -p["shL"][0], 0))
    rot(parts["shoulderR"], (-p["shR"][1], p["shR"][0], 0))
    rot(parts["elbowL"], (-p["elL"], 0, 0))
    rot(parts["elbowR"], (-p["elR"], 0, 0))
    rot(parts["hipL"], (-p["hipL"], 0, 0))
    rot(parts["hipR"], (-p["hipR"], 0, 0))
    rot(parts["kneeL"], (-p["knL"], 0, 0))
    rot(parts["kneeR"], (-p["knR"], 0, 0))
    rot(parts["spine"], (p["lean"], 0, 0))
    for s_ in ("L", "R"):
        bend = p["kn" + s_] + p["hip" + s_]
        rot(parts["foot" + s_], (-bend if p["kn" + s_] < -60 and p["hip" + s_] < 30 else 0, 0, 0))
    hp, hy, hr = p["head"]
    rot(parts["head"], (-hp, hr, hy))
    parts["hips"].location.z = 0.74 + p["drop"]
    parts["hips"].keyframe_insert("location", frame=f)


def act(parts, keys):
    """keys: list of (seconds, pose name or dict). Holds are smooth because Blender eases between keys."""
    for t, name in keys:
        apply_pose(parts, pose_values(name), t)


def move(parts, keys):
    """Root moves: list of (seconds, (x, y, z), rot_z_degrees)."""
    for t, loc, rz in keys:
        parts["root"].location = loc
        parts["root"].rotation_euler = (0, 0, R(rz))
        parts["root"].keyframe_insert("location", frame=frame(t))
        parts["root"].keyframe_insert("rotation_euler", frame=frame(t))


def walk(parts, t0, t1, start, end, rz=0.0, steps_per_s=1.8):
    """Walk cycle between two points: swings legs and arms, small bob."""
    n = max(2, int((t1 - t0) * FPS / 3))
    for i in range(n + 1):
        u = i / n
        t = t0 + (t1 - t0) * u
        ph = math.sin((t - t0) * steps_per_s * math.pi)
        p = pose_values(dict(hipL=24 * ph, hipR=-24 * ph, knL=-max(0, -ph) * 35, knR=-max(0, ph) * 35,
                             shL=(8, -22 * ph), shR=(8, 22 * ph), elL=15, elR=15))
        apply_pose(parts, p, t)
        parts["root"].location = tuple(a + (b - a) * u for a, b in zip(start, end))
        parts["root"].location.z = start[2] + abs(ph) * 0.025
        parts["root"].rotation_euler = (0, 0, R(rz))
        parts["root"].keyframe_insert("location", frame=frame(t))
        parts["root"].keyframe_insert("rotation_euler", frame=frame(t))


MOODS = {
    # brow (raise metres, inner-tilt degrees), lid closure 0..1
    "neutral": (0.0, 0, 0.12), "sad": (0.004, 16, 0.4), "worried": (0.012, 20, 0.15), "tired": (-0.004, 6, 0.5),
    "curious": (0.012, -8, 0.05), "happy": (0.01, -4, 0.2), "serious": (-0.01, -14, 0.25), "awe": (0.02, 6, 0.0),
    "calm": (0.0, 4, 0.35),
}


def feel(parts, keys):
    """keys: list of (seconds, mood). Animates brows and resting eyelids."""
    for t, m in keys:
        up, tilt, lid = MOODS[m]
        f = frame(t)
        for i, bw in enumerate(parts["brows"]):
            sx = 1 if i == 0 else -1
            bw.rotation_euler = (0, R(-tilt * sx), 0)
            bw.keyframe_insert("rotation_euler", frame=f)
            bw.delta_location = (0, 0, up)
            bw.keyframe_insert("delta_location", frame=f)
        for lid_obj in parts["lids"]:
            lid_obj.scale = (1, 1, 0.15 + lid * 0.85)
            lid_obj.keyframe_insert("scale", frame=f)
        parts.setdefault("_mood_keys", []).append((t, lid))


def blinks(parts, t0, t1, seed=3):
    rnd = random.Random(seed)
    t = t0 + rnd.uniform(0.6, 2.0)
    mood_keys = sorted(parts.get("_mood_keys", [(0, 0.12)]))
    def rest_lid(tt):
        v = 0.12
        for k, l in mood_keys:
            if k <= tt:
                v = l
        return 0.15 + v * 0.85
    while t < t1 - 0.3:
        for lid_obj in parts["lids"]:
            for dt, s in ((0, rest_lid(t)), (0.06, 1.0), (0.14, rest_lid(t))):
                lid_obj.scale = (1, 1, s)
                lid_obj.keyframe_insert("scale", frame=frame(t + dt))
        t += rnd.uniform(2.4, 4.6)


def look(parts, keys):
    """keys: (seconds, x, z) pupil offsets in metres (x right, z up)."""
    for t, x, z in keys:
        for lk in parts["eyes"]:
            lk.delta_location = (x, 0, z)
            lk.keyframe_insert("delta_location", frame=frame(t))


def lipsync(parts, words, t_offset=0.0, t_from=-1e9, t_to=1e9):
    """Opens the mouth through each spoken word (narration time minus t_offset = shot time)."""
    m = parts["mouth"]
    def key(t, s):
        m.scale = (1 + 0.15 * (s - 0.25), 1, s)
        m.keyframe_insert("scale", frame=frame(t))
    key(0, 0.25)
    for w in words:
        if w["end"] < t_from or w["start"] > t_to:
            continue
        a, b = w["start"] - t_offset, w["end"] - t_offset
        if b <= 0:
            continue
        key(max(0, a - 0.02), 0.25)
        n = max(1, int((b - a) / 0.09))
        for i in range(n):
            tt = a + (i + 0.5) * (b - a) / n
            key(tt, 0.7 + 0.5 * ((i * 7 + len(w["text"])) % 3) / 2)
        key(b + 0.03, 0.25)
