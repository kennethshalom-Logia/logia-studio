"""Every 3D shot of the v4 H.E.A.R. reel, built and rendered in Blender.

Usage: LOGIA_NARR=hear-v4.json blender -b --factory-startup -P blender/shots_v4.py -- <shot> [preview]
Each shot's timing comes from the narration words, so re-running after the voice changes re-syncs everything.
"""
import math
import os
import random
import sys

import bmesh
import bpy
from mathutils import noise, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *  # noqa: E402,F401
import common  # noqa: E402
import hero3d as H  # noqa: E402

R = math.radians
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
SHOT = ARGS[0] if ARGS else "hook"
TAIL = 0.9  # extra seconds so the next shot can dissolve over this one
LAST = common.WORDS[-1]["end"]

# Shot boundaries in narration time.
CUTS = [
    ("hook", 0.0, "because"),
    ("because", "because", "i go to church"),
    ("church", "i go to church", "but no voice"),
    ("nothing", "but no voice", "but what if god"),
    ("whatif", "but what if god", "elijah waited"),
    ("elijah", "elijah waited", "so here's how"),
    ("tiles", "so here's how", "h is for"),
    ("tomb", "h is for", "e is for"),
    ("gallery", "e is for", "god kept his"),
    ("desk", "god kept his", "a is for"),
    ("phone", "a is for", "the sermon that"),
    ("sermon", "the sermon that", "god speaks through"),
    ("people", "god speaks through", "r is for"),
    ("board", "r is for", "he was never"),
    ("dawn", "he was never", None),
]


def at(x):
    return x if isinstance(x, float) else seq(x) - 0.12


def bounds(name):
    for n, a, b in CUTS:
        if n == name:
            s = at(a)
            e = LAST + 2.2 if b is None else at(b)
            return s, e
    raise KeyError(name)


START, END = bounds(SHOT)
LEN = END - START + TAIL


def T(phrase, nth=0):
    """Shot-local time of a narration phrase."""
    return seq(phrase, nth) - START


def words_local():
    return [dict(w, start=w["start"], end=w["end"]) for w in common.WORDS]


# ---------- shared set pieces ----------

def box(name, loc, scl, m, bevel=0.0, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=tuple(R(a) for a in rot))
    o = bpy.context.active_object
    o.name = name
    o.scale = scl
    if bevel:
        b = o.modifiers.new("b", "BEVEL")
        b.width = bevel
        b.segments = 3
    o.data.materials.append(m)
    return o


def image_mat(name, path, emit=0.25):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(path)
    nt.links.new(tex.outputs["Color"], b.inputs["Base Color"])
    nt.links.new(tex.outputs["Color"], b.inputs["Emission Color"])
    b.inputs["Emission Strength"].default_value = emit
    b.inputs["Roughness"].default_value = 0.6
    return m, tex.image


def photo_plane(name, path, loc, height, rot=(90, 0, 0), emit=0.25):
    m, img = image_mat("M_" + name, path, emit)
    aspect = img.size[0] / max(1, img.size[1])
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc, rotation=tuple(R(a) for a in rot))
    p = bpy.context.active_object
    p.name = name
    p.scale = (height * aspect, height, 1)
    p.data.materials.append(m)
    return p


def room(dawn=False):
    sc = bpy.context.scene
    sc.view_settings.view_transform = "AgX"
    world((0.012, 0.014, 0.03) if not dawn else (0.12, 0.08, 0.06), 1.0)
    wall_m = noisy_mat("M_wall", (0.17, 0.19, 0.27) if not dawn else (0.5, 0.42, 0.36), bump=0.15, scale=3, rough=0.8)
    floor_m = noisy_mat("M_floor", (0.16, 0.1, 0.06), bump=0.2, scale=2, rough=0.5)
    bpy.ops.mesh.primitive_plane_add(size=14)
    bpy.context.active_object.data.materials.append(floor_m)
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=60, y_segments=40, size=1)
    for v in bm.verts:
        v.co = Vector((v.co.x * 5, 2.6, (v.co.y + 1) * 1.6))
    win = (-0.2, 1.75, 1.7, 1.5)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if abs(f.calc_center_median().x - win[0]) < win[2] / 2 and abs(f.calc_center_median().z - win[1]) < win[3] / 2], context="FACES")
    me = bpy.data.meshes.new("backwall")
    bm.to_mesh(me)
    bm.free()
    bw = link(bpy.data.objects.new("ENV_backwall", me))
    bw.modifiers.new("t", "SOLIDIFY").thickness = 0.15
    bw.data.materials.append(wall_m)
    bpy.ops.mesh.primitive_plane_add(size=6, location=(-3.2, 0, 1.6), rotation=(0, R(90), 0))
    bpy.context.active_object.data.materials.append(wall_m)
    frame_m = mat("M_frame", (0.05, 0.06, 0.09) if not dawn else (0.85, 0.82, 0.78), rough=0.6)
    for (sx, sz, x, z) in [(1.8, 0.08, win[0], win[1] + 0.75), (1.8, 0.08, win[0], win[1] - 0.75), (0.08, 1.58, win[0] - 0.86, win[1]),
                           (0.08, 1.58, win[0] + 0.86, win[1]), (0.05, 1.5, win[0], win[1]), (1.7, 0.05, win[0], win[1])]:
        box("FX_frame", (x, 2.56, z), (sx, 0.1, sz), frame_m)
    box("FX_sill", (win[0], 2.35, win[1] - 0.82), (2.0, 0.4, 0.06), frame_m)
    if dawn:
        gradient_backdrop("ENV_sky", (1.0, 0.62, 0.3), (0.35, 0.55, 0.9), (0, 12, 3), size=(30, 20), strength=2.5)
        sun = light("LGT_sun", "SPOT", (1.0, 7, 3.6), (R(-70), 0, R(170)), energy=9000, color=(1, 0.72, 0.42), size=0.2)
        sun.data.spot_size = R(45)
        light("LGT_amb", "POINT", (0, -1.5, 2.5), energy=300, color=(1, 0.85, 0.7))
    else:
        gradient_backdrop("ENV_night", (0.05, 0.09, 0.2), (0.01, 0.02, 0.06), (0, 12, 3), size=(30, 20), strength=3.0)
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.45, location=(1.4, 11.5, 4.2))
        bpy.context.active_object.data.materials.append(mat("M_moon", (0.9, 0.93, 1), emit=(0.85, 0.9, 1), strength=6))
    # Rain streaks outside the window (night only).
    if not dawn:
        rain_m = mat("M_rain", (0.6, 0.7, 1), emit=(0.6, 0.7, 1), strength=1.5)
        rnd = random.Random(5)
        for i in range(70):
            x = rnd.uniform(-1.2, 0.8)
            z0 = rnd.uniform(0.9, 3.0)
            box(f"FX_rain{i}", (x, 3.3, z0), (0.006, 0.006, 0.18), rain_m)
            o = bpy.context.active_object
            sp = rnd.uniform(4, 6)
            for k in range(int(LEN) + 2):
                o.location.z = 3.2 - ((z0 + k * sp) % 2.6)
                o.keyframe_insert("location", frame=frame(k))
            for fc in o.animation_data.action.fcurves if hasattr(o.animation_data.action, "fcurves") else []:
                for kp in fc.keyframe_points:
                    kp.interpolation = "LINEAR"
    box("ENV_ceiling", (0, 0, 3.25), (12, 12, 0.1), wall_m)
    light("LGT_facefill", "POINT", (0.4, -2.2, 1.7), energy=60 if not dawn else 120, color=(0.75, 0.82, 1.0) if not dawn else (1, 0.9, 0.8), size=0.6)
    bed_wood = mat("M_bedwood", (0.12, 0.07, 0.04), rough=0.6)
    box("HERO_bed_base", (-2.0, 0.6, 0.22), (2.1, 3.4, 0.44), bed_wood, 0.03)
    box("HERO_mattress", (-2.0, 0.6, 0.55), (2.0, 3.3, 0.3), mat("M_sheet", (0.75, 0.78, 0.85), rough=0.9), 0.12)
    box("HERO_blanket", (-2.0, 0.1, 0.68), (2.06, 2.0, 0.12), mat("M_blanket", (0.15, 0.2, 0.42), rough=0.95), 0.06)
    box("HERO_pillow", (-2.0, 1.9, 0.78), (1.3, 0.55, 0.18), mat("M_pillow", (0.85, 0.87, 0.92), rough=0.9), 0.08)
    box("HERO_stand", (-0.55, 1.7, 0.3), (0.6, 0.5, 0.6), mat("M_stand", (0.1, 0.06, 0.04), rough=0.5), 0.02)


def church(lights_on=True):
    sc = bpy.context.scene
    sc.view_settings.view_transform = "AgX"
    world((0.01, 0.01, 0.02), 1.0)
    bpy.ops.mesh.primitive_plane_add(size=40)
    bpy.context.active_object.data.materials.append(noisy_mat("M_cfloor", (0.18, 0.1, 0.06), bump=0.2, scale=1.2, rough=0.4))
    wall = noisy_mat("M_cwall", (0.09, 0.08, 0.1), bump=0.2, scale=2)
    box("ENV_back", (0, 12, 4), (20, 0.3, 8), wall)
    box("ENV_left", (-6, 4, 4), (0.3, 20, 8), wall)
    box("ENV_right", (6, 4, 4), (0.3, 20, 8), wall)
    glass = [(1.0, 0.3, 0.45), (1.0, 0.75, 0.2), (0.2, 0.7, 1.0), (0.6, 0.4, 1.0)]
    for i, y in enumerate((0, 3.2, 6.4, 9.6)):
        for sx in (-1, 1):
            c = glass[(i + (sx > 0)) % 4]
            box(f"FX_glass{i}{sx}", (5.84 * sx, y, 3.4), (0.05, 1.3, 2.6), mat(f"M_glass{i}{sx}", c, emit=c, strength=2.2 if lights_on else 0.6))
    # Stage and pulpit.
    box("ENV_stage", (0, 9.5, 0.3), (10, 4, 0.6), mat("M_stage", (0.12, 0.07, 0.05), rough=0.5), 0.02)
    box("HERO_pulpit", (0, 8.6, 1.1), (1.0, 0.6, 1.1), mat("M_pulpit", (0.3, 0.17, 0.08), rough=0.5), 0.04)
    box("FX_cross", (0, 11.7, 4.2), (0.25, 0.1, 2.4), mat("M_cross", (1, 0.85, 0.5), emit=(1, 0.8, 0.45), strength=4 if lights_on else 0.5))
    box("FX_crossbar", (0, 11.7, 4.7), (1.3, 0.1, 0.25), mat("M_cross", (1, 0.85, 0.5)))
    pew = mat("M_pew", (0.25, 0.13, 0.06), rough=0.45)
    for row in range(6):
        y = 6.0 - row * 1.4
        for sx in (-1, 1):
            box(f"ENV_pew{row}{sx}", (2.4 * sx, y, 0.45), (3.4, 0.5, 0.12), pew, 0.02)
            box(f"ENV_pewb{row}{sx}", (2.4 * sx, y + 0.3, 0.85), (3.4, 0.1, 0.7), pew, 0.02)
    lights = []
    for i, x in enumerate((-3, 0, 3)):
        l = light(f"LGT_stage{i}", "SPOT", (x, 4, 7), (R(35), 0, 0), energy=2500 if lights_on else 0, color=[(1, 0.8, 0.6), (0.7, 0.8, 1), (1, 0.6, 0.8)][i])
        l.data.spot_size = R(50)
        lights.append(l)
    amb = light("LGT_amb", "POINT", (0, 0, 5), energy=600 if lights_on else 40, color=(1, 0.85, 0.7))
    return lights, amb


def tomb_set():
    world((0.85, 0.5, 0.32), 0.12)
    bpy.context.scene.view_settings.view_transform = "Standard"
    bpy.context.scene.view_settings.look = "None"
    gradient_backdrop("ENV_sky", (1.0, 0.5, 0.18), (0.05, 0.03, 0.12), (0, 45, 14), size=(140, 70), strength=1.2)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=2.6, location=(6.5, 42, 7.5))
    bpy.context.active_object.data.materials.append(mat("M_sun", (1, 0.85, 0.6), emit=(1, 0.86, 0.6), strength=30))
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=80, y_subdivisions=80, size=60)
    g = bpy.context.active_object
    for v in g.data.vertices:
        v.co.z = noise.noise(Vector((v.co.x * 0.25, v.co.y * 0.25, 0))) * 0.2 + max(0, v.co.y - 3) * 0.12
    g.data.materials.append(noisy_mat("M_ground", (0.42, 0.29, 0.18), bump=0.5, scale=7))
    rock_face((0.5, 0.35, 0.22), door_x=-0.9)
    # Open chamber with glowing back wall.
    cbm = bmesh.new()
    bmesh.ops.create_cube(cbm, size=1)
    bmesh.ops.scale(cbm, vec=(3.2, 3.6, 3.4), verts=cbm.verts)
    bmesh.ops.translate(cbm, vec=(-0.9, 4.4, 1.6), verts=cbm.verts)
    cbm.normal_update()
    bmesh.ops.delete(cbm, geom=[f for f in cbm.faces if f.normal.y < -0.9], context="FACES")
    bmesh.ops.reverse_faces(cbm, faces=cbm.faces[:])
    cme = bpy.data.meshes.new("chamber")
    cbm.to_mesh(cme)
    cbm.free()
    ch = link(bpy.data.objects.new("ENV_chamber", cme))
    ch.data.materials.append(noisy_mat("M_chamber", (0.25, 0.17, 0.11), bump=0.6, scale=5))
    bpy.ops.mesh.primitive_plane_add(size=2.6, location=(-0.9, 6.1, 1.4), rotation=(R(90), 0, 0))
    bpy.context.active_object.data.materials.append(mat("M_glow", (1, 0.9, 0.7), emit=(1, 0.88, 0.62), strength=22))
    light("LGT_tomb", "POINT", (-0.9, 3.0, 1.2), energy=2600, color=(1, 0.82, 0.55), size=0.8)
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=1.45, depth=0.55, location=(2.4, 1.75, 1.45), rotation=(R(90), R(-130), 0))
    st = bpy.context.active_object
    st.modifiers.new("bev", "BEVEL").width = 0.14
    st.modifiers.new("smooth", "SUBSURF").levels = 2
    st.data.materials.append(noisy_mat("M_stone", (0.55, 0.43, 0.32), bump=1.3, scale=6))
    light("LGT_sun", "SUN", (0, 0, 10), (R(74), 0, R(150)), energy=6.0, color=(1, 0.68, 0.42))
    light("LGT_fill", "SUN", (0, 0, 10), (R(50), 0, R(-25)), energy=0.5, color=(0.55, 0.62, 1))


def rock_face(color, door_x=-0.9, door_w=1.9, door_h=2.5, W=11.0, Hh=7.0, name="HERO_rock"):
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=90, y_segments=60, size=1)
    for v in bm.verts:
        x, y = v.co.x * W / 2, (v.co.y + 1) * Hh / 2
        n = noise.noise(Vector((x * 0.55, y * 0.55, 1.3))) * 0.5 + noise.noise(Vector((x * 2.1, y * 2.1, 7))) * 0.12
        lean = (y / Hh) ** 1.6 * 2.6 + (abs(x) / (W / 2)) ** 3 * 2.2
        v.co = Vector((x, 2.2 + lean - n, y - 0.05))

    def in_door(c):
        dx = c.x - door_x
        if abs(dx) > door_w / 2:
            return False
        top = door_h - door_w / 2
        return c.z < top or (dx * dx + (c.z - top) ** 2) < (door_w / 2) ** 2
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if in_door(f.calc_center_median())], context="FACES")
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    rock = link(bpy.data.objects.new(name, me))
    rock.modifiers.new("thick", "SOLIDIFY").thickness = 0.5
    rock.modifiers.new("smooth", "SUBSURF").levels = 1
    rock.data.materials.append(noisy_mat("M_" + name, color, bump=1.0, scale=3.5))
    for p in rock.data.polygons:
        p.use_smooth = True
    return rock


def shake(cam, t0, t1, amp=0.05):
    base = cam.location.copy()
    n = int((t1 - t0) * FPS / 2)
    for i in range(n + 1):
        t = t0 + i * 2 / FPS
        k = amp * (1 - i / max(1, n))
        cam.location = base + Vector((random.uniform(-k, k), 0, random.uniform(-k, k)))
        cam.keyframe_insert("location", frame=frame(t))
    cam.location = base
    cam.keyframe_insert("location", frame=frame(t1 + 0.1))


# ---------- shots ----------

def shot_hook():
    sc = new_scene("SHOT_hook", LEN)
    room()
    ken = H.build("ken", "ken", loc=(-1.0, 0.0, 0.26), rot_z=R(-15), phone=True)
    # Sitting on the bed edge, phone in hand, face lit by the screen.
    H.act(ken, [(0, dict(H.POSES["sit"], shR=(10, 70), elR=100, shL=(6, 10), head=(-16, 0, 0), drop=-0.3)),
                (T("god is real") - 0.3, dict(H.POSES["sit"], shR=(10, 64), elR=96, shL=(6, 10), head=(-8, 0, 0), drop=-0.3)),
                (LEN, dict(H.POSES["sit"], shR=(10, 66), elR=98, shL=(6, 12), head=(-12, 0, 0), drop=-0.3))])
    H.feel(ken, [(0, "tired"), (T("god is real"), "sad")])
    H.blinks(ken, 0, LEN)
    H.look(ken, [(0, 0.0, -0.012)])
    H.lipsync(ken, words_local(), t_offset=START, t_to=END)
    light("LGT_phone", "POINT", (-0.95, -0.4, 1.3), energy=45, color=(0.4, 0.75, 1), size=0.05)
    light("LGT_moon", "SPOT", (1.2, 6, 4.2), (R(-62), 0, R(165)), energy=1500, color=(0.6, 0.72, 1.0), size=0.1).data.spot_size = R(40)
    cam = camera("CAM_main", (-0.4, -3.2, 1.3), (90, 0, 10), lens=35)
    key_transform(cam, [(0, (-0.35, -3.5, 1.3), (90, 0, 10), None), (LEN, (-0.6, -2.6, 1.32), (90, 0, 9), None)])
    return [0.3, LEN * 0.6]


def shot_because():
    sc = new_scene("SHOT_because", LEN)
    room()
    ken = H.build("ken", "ken", loc=(-1.0, 0.0, 0.26), rot_z=R(-15), phone=True)
    t_kneel = 1.0
    H.act(ken, [(0, dict(H.POSES["sit"], shR=(10, 66), elR=98, head=(-12, 0, 0), drop=-0.3)),
                (0.6, dict(H.POSES["sit"], shR=(10, 20), elR=40, head=(-20, 0, 0), drop=-0.3)),
                (t_kneel + 0.6, "kneel"), (T("never said") - 0.2, "kneel"), (T("never said") + 0.6, "kneel_up"), (LEN, "kneel_up")])
    H.move(ken, [(0, (-1.0, 0.0, 0.26), -15), (0.6, (-1.0, 0.0, 0.26), -15), (t_kneel + 0.6, (-0.9, -0.6, 0.0), -10), (LEN, (-0.9, -0.6, 0.0), -10)])
    H.feel(ken, [(0, "sad"), (T("never said"), "worried")])
    H.blinks(ken, 0, LEN, seed=4)
    H.lipsync(ken, words_local(), t_offset=START, t_to=END)
    moon = light("LGT_moon", "SPOT", (1.2, 6, 4.2), (R(-62), 0, R(165)), energy=1200, color=(0.6, 0.72, 1.0), size=0.1)
    moon.data.spot_size = R(40)
    key_light(moon, [(0, 1200), (LEN, 4200)])
    cam = camera("CAM_main", (0.2, -4.0, 1.3), (86, 0, 16), lens=32)
    key_transform(cam, [(0, (-0.2, -3.4, 1.3), (88, 0, 12), None), (LEN, (0.4, -4.4, 1.6), (82, 0, 18), None)])
    return [0.3, LEN - 0.8]


def shot_church():
    sc = new_scene("SHOT_church", LEN)
    lights, amb = church(True)
    ken = H.build("ken", "ken", loc=(1.6, 3.2, 0.0), rot_z=R(0))
    t_pray, t_worship = T("i pray"), T("i worship")
    H.act(ken, [(0, "sit"), (t_pray - 0.3, "sit"), (t_pray + 0.3, dict(H.POSES["sit"], shL=(8, 45), elL=110, shR=(8, 45), elR=110, head=(-24, 0, 0), lean=10)),
                (t_worship - 0.3, dict(H.POSES["sit"], shL=(8, 45), elL=110, shR=(8, 45), elR=110, head=(-24, 0, 0), lean=10)),
                (t_worship + 0.4, "worship"), (LEN, "worship")])
    H.move(ken, [(0, (1.6, 3.0, 0.0), 180), (t_worship - 0.2, (1.6, 3.0, 0.0), 180), (t_worship + 0.3, (1.6, 2.9, 0.0), 180)])
    H.feel(ken, [(0, "neutral"), (t_pray, "calm"), (t_worship, "awe")])
    H.blinks(ken, 0, LEN, seed=6)
    # Others in the pews, from behind.
    for i, (x, y, lk) in enumerate([(-2.4, 3.0, "friend"), (-1.2, 1.6, "buddy"), (2.8, 1.6, "mentor"), (-3.0, 4.4, "preacher")]):
        o = H.build(f"p{i}", lk, loc=(x, y, 0), rot_z=R(0), seed=20 + i)
        H.act(o, [(0, "sit"), (t_worship + 0.3, "worship")])
    for i, l in enumerate(lights):
        key_light(l, [(0, 1400), (t_worship, 1400), (t_worship + 0.4, 3600)])
    # Three angles: wide from behind, close on praying hands, low on worship.
    cam = camera("CAM_main", (1.2, -3.0, 2.4), (75, 0, -8), lens=30)
    key_transform(cam, [(0, (2.6, -0.5, 1.6), (84, 0, -22), None), (t_pray - 0.05, (2.4, -0.2, 1.55), (84, 0, -22), None)])
    key_transform(cam, [(t_pray, (2.4, 1.4, 1.25), (86, 0, -32), None), (t_worship - 0.05, (2.3, 1.6, 1.25), (86, 0, -32), None)])
    key_transform(cam, [(t_worship, (1.6, 0.6, 0.6), (104, 0, 0), None), (LEN, (1.6, 0.9, 0.55), (106, 0, 0), None)])
    for fc in cam.animation_data.action.fcurves if hasattr(cam.animation_data.action, "fcurves") else []:
        for kp in fc.keyframe_points:
            kp.interpolation = "CONSTANT" if False else kp.interpolation
    return [0.3, t_pray + 0.4, t_worship + 0.6]


def shot_nothing():
    sc = new_scene("SHOT_nothing", LEN)
    lights, amb = church(True)
    ken = H.build("ken", "ken", loc=(0.0, 1.0, 0.0), rot_z=R(180))
    H.act(ken, [(0, "look_up"), (T("nothing") - 0.2, "look_up"), (T("nothing") + 0.5, "head_down"), (LEN, "head_down")])
    H.feel(ken, [(0, "worried"), (T("nothing"), "sad")])
    H.blinks(ken, 0, LEN, seed=7)
    # Lights go out one by one on each beat.
    beats = [T("no voice"), T("no lightning"), T("nothing")]
    for l, tb in zip(lights, beats):
        key_light(l, [(0, 2500), (tb, 2500), (tb + 0.15, 0)])
    key_light(amb, [(0, 600), (beats[-1], 400), (beats[-1] + 0.3, 30)])
    spot = light("LGT_lone", "SPOT", (0, 1.0, 6), (0, 0, 0), energy=900, color=(0.75, 0.8, 1.0), size=0.2)
    spot.data.spot_size = R(18)
    for o in bpy.data.objects:
        if o.name.startswith("FX_glass") or o.name.startswith("FX_cross"):
            for ms in o.material_slots:
                key_value(emission_input(ms.material), [(0, 2.2), (beats[-1], 2.2), (beats[-1] + 0.3, 0.2)])
    cam = camera("CAM_main", (0, -6, 4.5), (68, 0, 0), lens=28)
    key_transform(cam, [(0, (0, -4.5, 3.4), (70, 0, 0), None), (LEN, (0, -7.5, 5.8), (64, 0, 0), None)])
    return [0.3, LEN - 0.6]


def shot_whatif():
    sc = new_scene("SHOT_whatif", LEN)
    room()
    ken = H.build("ken", "ken", loc=(-0.2, 0.9, 0.0), rot_z=R(180))
    H.act(ken, [(0, "head_down"), (1.0, "look_up"), (LEN, dict(H.POSES["look_up"], head=(18, -8, 0)))])
    H.move(ken, [(0, (-0.2, 1.0, 0.0), 180), (LEN, (-0.2, 1.25, 0.0), 180)])
    H.feel(ken, [(0, "sad"), (1.0, "curious")])
    H.blinks(ken, 0, LEN, seed=8)
    moon = light("LGT_moon", "SPOT", (1.2, 6, 4.2), (R(-62), 0, R(165)), energy=2500, color=(0.6, 0.72, 1.0), size=0.1)
    moon.data.spot_size = R(40)
    key_light(moon, [(0, 2500), (LEN, 6000)])
    warm = light("LGT_warm", "POINT", (-0.2, 2.2, 2.4), energy=0, color=(1, 0.85, 0.6))
    key_light(warm, [(0, 0), (LEN, 120)])
    cam = camera("CAM_main", (0.3, -1.6, 0.9), (98, 0, 6), lens=30)
    key_transform(cam, [(0, (0.4, -1.8, 0.9), (98, 0, 6), None), (LEN, (0.2, -1.1, 0.95), (100, 0, 4), None)])
    return [0.3, LEN - 0.6]


def shot_elijah():
    sc = new_scene("SHOT_elijah", LEN)
    sc.view_settings.view_transform = "AgX"
    world((0.05, 0.06, 0.09), 1.0)
    gradient_backdrop("ENV_sky", (0.25, 0.28, 0.36), (0.03, 0.04, 0.08), (0, 45, 14), size=(140, 70), strength=1.0)
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=60, y_subdivisions=60, size=60)
    g = bpy.context.active_object
    for v in g.data.vertices:
        v.co.z = noise.noise(Vector((v.co.x * 0.3, v.co.y * 0.3, 2))) * 0.3
    g.data.materials.append(noisy_mat("M_mground", (0.2, 0.2, 0.22), bump=0.6, scale=6))
    rock_face((0.28, 0.28, 0.32), door_x=0.6, name="ENV_horeb")
    eli = H.build("eli", "elijah", loc=(0.6, 1.4, 0.0), rot_z=R(180), seed=40)
    t_wind, t_quake, t_fire, t_whisper = T("in the wind"), T("the earthquake"), T("and the fire"), T("in a whisper")
    t_came = T("but god came")
    H.act(eli, [(0, "idle"), (t_wind, dict(H.POSES["idle"], head=(-10, 0, 8), lean=-6)), (t_quake, dict(H.POSES["idle"], shL=(40, 10), shR=(40, 10), head=(-6, 0, 0))),
                (t_fire, dict(H.POSES["idle"], shL=(20, 60), elL=100, shR=(20, 60), elR=100, head=(-16, 0, 0))),
                (t_came, "look_up"), (t_whisper + 0.3, dict(H.POSES["look_up"], shL=(8, 40), elL=110, shR=(8, 40), elR=110, head=(-10, 0, 0))), (LEN, "pray")])
    H.feel(eli, [(0, "neutral"), (t_wind, "worried"), (t_came, "awe"), (t_whisper, "calm")])
    H.blinks(eli, 0, LEN, seed=41)
    # Wind: streaks of dust racing across.
    dust_m = mat("M_dust", (0.75, 0.75, 0.8), emit=(0.7, 0.7, 0.75), strength=0.6)
    rnd = random.Random(9)
    for i in range(40):
        y = rnd.uniform(-2, 2)
        z = rnd.uniform(0.2, 3.5)
        box(f"FX_wind{i}", (-12, y, z), (0.9, 0.01, 0.012), dust_m)
        o = bpy.context.active_object
        o.location.x = -12
        o.keyframe_insert("location", frame=frame(t_wind - 0.2 + rnd.uniform(0, 0.4)))
        o.location.x = 12
        o.keyframe_insert("location", frame=frame(t_quake + rnd.uniform(0, 0.3)))
    # Fire: flickering flame cones and light.
    fire_m = mat("M_fire", (1, 0.45, 0.1), emit=(1, 0.5, 0.12), strength=12)
    flames = []
    for i in range(14):
        x = rnd.uniform(-3, 3)
        bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.25, radius2=0.0, depth=1.0, location=(x, rnd.uniform(-1.5, 0.5), 0.5))
        fl = bpy.context.active_object
        fl.data.materials.append(fire_m)
        flames.append(fl)
        for k in range(int(LEN * FPS / 3) + 1):
            tt = k * 3 / FPS
            on = 1.0 if t_fire - 0.1 <= tt <= t_came - 0.1 else 0.0
            fl.scale = (1, 1, max(0.001, on * (0.7 + 0.6 * abs(math.sin(tt * 11 + i)))))
            fl.keyframe_insert("scale", frame=frame(tt))
    fl_light = light("LGT_fire", "POINT", (0, 0, 1.2), energy=0, color=(1, 0.5, 0.15), size=1)
    key_light(fl_light, [(t_fire - 0.15, 0), (t_fire + 0.1, 3500), (t_came - 0.2, 3500), (t_came + 0.1, 0)])
    # The whisper: a soft gold light from the cave.
    glow = light("LGT_whisper", "POINT", (0.6, 2.8, 1.4), energy=0, color=(1, 0.88, 0.6), size=0.8)
    key_light(glow, [(0, 0), (t_came, 0), (t_whisper + 0.6, 900), (LEN, 1100)])
    storm = light("LGT_storm", "SUN", (0, 0, 10), (R(55), 0, R(20)), energy=1.2, color=(0.7, 0.75, 0.9))
    key_light(storm, [(0, 1.2), (t_came, 1.2), (t_whisper, 0.3)])
    cam = camera("CAM_main", (0.6, -6.5, 1.6), (86, 0, 0), lens=30)
    key_transform(cam, [(0, (0.6, -7.5, 1.7), (86, 0, 0), None), (t_came, (0.6, -6.0, 1.6), (87, 0, 0), None), (LEN, (0.6, -4.2, 1.5), (88, 0, 0), None)])
    shake(cam, t_quake, t_quake + 0.9, 0.08)
    return [t_wind + 0.3, t_fire + 0.5, t_whisper + 0.5]


def shot_tiles():
    sc = new_scene("SHOT_tiles", LEN)
    sc.view_settings.view_transform = "Standard"
    world((0.012, 0.01, 0.025), 1.0)
    bpy.ops.mesh.primitive_plane_add(size=40)
    bpy.context.active_object.data.materials.append(mat("M_floor", (0.01, 0.01, 0.016), rough=0.15, metal=0.4))
    COLORS = {"H": (1.0, 0.70, 0.18), "E": (0.15, 0.78, 1.0), "A": (1.0, 0.26, 0.45), "R": (0.62, 0.42, 1.0)}
    POS = {"H": (-0.72, 2.55), "E": (0.72, 2.55), "A": (-0.72, 1.12), "R": (0.72, 1.12)}
    block_mat = mat("M_block", (0.012, 0.014, 0.03), rough=0.42)
    hear = T("hear him")
    for i, L in enumerate("HEAR"):
        x, z = POS[L]
        root = link(bpy.data.objects.new("RIG_" + L, None))
        b = box("HERO_block_" + L, (0, 0, 0), (1.1, 0.5, 1.1), block_mat, 0.12)
        b.parent = root
        bpy.ops.mesh.primitive_plane_add(size=1, rotation=(R(90), 0, 0))
        rim = bpy.context.active_object
        rim.scale = (1.2, 1.2, 1)
        rim.location = (0, 0.2, 0)
        rm = mat("M_rim_" + L, (0, 0, 0), emit=COLORS[L], strength=0)
        rim.data.materials.append(rm)
        rim.parent = root
        cu = bpy.data.curves.new("txt_" + L, "FONT")
        cu.body = L
        cu.align_x = "CENTER"
        cu.align_y = "CENTER"
        cu.size = 0.95
        cu.extrude = 0.05
        t = link(bpy.data.objects.new("HERO_letter_" + L, cu))
        t.location = (0, -0.29, 0)
        t.rotation_euler = (R(90), 0, 0)
        lm = mat("M_letter_" + L, COLORS[L], emit=COLORS[L], strength=0)
        t.data.materials.append(lm)
        t.parent = root
        g = light("LGT_glow_" + L, "POINT", (0, 0.7, 0), energy=0, color=COLORS[L])
        g.parent = root
        t0 = 0.3 + i * 0.3
        key_transform(root, [(0, (x * 1.6, 9, z + 0.6), (-35, 0, 40 * (1 if x > 0 else -1)), 0.2),
                             (t0, (x * 1.6, 9, z + 0.6), (-35, 0, 40 * (1 if x > 0 else -1)), 0.2),
                             (t0 + 0.45, (x, -0.15, z), (4, 0, 0), 1.05), (t0 + 0.7, (x, 0, z), (0, 0, 0), 1.0)])
        key_value(emission_input(lm), [(t0, 0), (t0 + 0.45, 1.8), (hear, 1.8), (hear + 0.25, 4.5), (hear + 1.0, 2.0)])
        key_value(emission_input(rm), [(t0, 0), (t0 + 0.5, 1.2), (hear, 1.2), (hear + 0.25, 3.5), (hear + 1.0, 1.4)])
        key_light(g, [(t0, 0), (t0 + 0.5, 40), (hear, 40), (hear + 0.25, 140), (hear + 1.0, 50)])
    ken = H.build("ken", "ken", loc=(0, -2.2, 0), rot_z=R(180))
    H.act(ken, [(0, "look_up"), (hear, "look_up"), (hear + 0.4, "open_up"), (LEN, "open_up")])
    H.feel(ken, [(0, "curious"), (hear, "awe")])
    H.blinks(ken, 0, LEN, seed=11)
    light("LGT_key", "SPOT", (2.5, -4, 5), (R(45), 0, R(30)), energy=250, color=(1, 0.92, 0.85))
    light("LGT_fill", "POINT", (-3, -3, 2), energy=80, color=(0.5, 0.6, 1))
    light("LGT_back", "POINT", (0, -1.0, 2.6), energy=120, color=(1, 0.9, 0.7))
    cam = camera("CAM_main", (0.0, -7.6, 1.2), (82, 0, 0), lens=34)
    key_transform(cam, [(0, (0.5, -7.9, 1.0), (82, 0, 3), None), (LEN, (-0.2, -6.6, 1.3), (81, 0, -1), None)])
    return [hear + 0.4]


def shot_tomb():
    sc = new_scene("SHOT_tomb", LEN)
    tomb_set()
    ken = H.build("ken", "ken", loc=(0.6, -3.5, 0.0), rot_z=R(0))
    t_walk_end = min(3.0, LEN * 0.4)
    H.walk(ken, 0, t_walk_end, (0.9, -4.2, 0.0), (0.1, -1.6, 0.0), rz=-10)
    H.act(ken, [(t_walk_end + 0.1, "idle"), (T("empty tomb") - 0.2, "look_up"), (T("eyewitnesses"), "open_up"), (LEN, "open_up")])
    H.feel(ken, [(0, "curious"), (T("empty tomb"), "awe")])
    H.blinks(ken, 0, LEN, seed=12)
    cam = camera("CAM_main", (0.6, -9.5, 1.5), (87, 0, 2), lens=30)
    key_transform(cam, [(0, (0.8, -8.5, 1.3), (88, 0, 3), None), (LEN, (0.1, -6.4, 1.2), (89, 0, 0), None)])
    return [1.0, LEN - 1.0]


def shot_gallery():
    sc = new_scene("SHOT_gallery", LEN)
    sc.view_settings.view_transform = "AgX"
    world((0.02, 0.02, 0.025), 1.0)
    bpy.ops.mesh.primitive_plane_add(size=40)
    bpy.context.active_object.data.materials.append(mat("M_gfloor", (0.05, 0.05, 0.06), rough=0.3))
    box("ENV_gwall", (0, 1.2, 3), (30, 0.2, 6), noisy_mat("M_gwall", (0.08, 0.08, 0.1), bump=0.1, scale=2))
    pub = os.path.join(common.ROOT, "public", "hear")
    pics = [("PIC_caves", "qumran-caves.jpg", -3.2, 2.1, 1.6), ("PIC_cave", "qumran-cave.jpg", 0.4, 2.0, 1.6), ("PIC_isaiah", "isaiah53.jpg", 3.8, 2.0, 2.0),
            ("PIC_strip", "isaiah-strip.jpg", 9.0, 2.0, 1.1)]
    for name, f, x, z, h in pics:
        p = photo_plane(name, os.path.join(pub, f), (x, 1.08, z), h, emit=0.35)
        w = p.scale.x
        box(name + "_frame", (x, 1.1, z), (w + 0.1, 0.04, h + 0.1), mat("M_pframe", (0.6, 0.45, 0.2), metal=0.6, rough=0.3))
        s = light(name + "_spot", "SPOT", (x, -1.2, 4.5), (R(38), 0, 0), energy=800, color=(1, 0.92, 0.8), size=0.15)
        s.data.spot_size = R(35)
    ken = H.build("ken", "ken", loc=(-4.5, -0.9, 0.0), rot_z=R(-90))
    H.walk(ken, 0, LEN, (-4.8, -0.9, 0.0), (7.5, -0.9, 0.0), rz=-90, steps_per_s=1.4)
    H.act(ken, [])
    H.feel(ken, [(0, "curious"), (T("almost word for word"), "awe")])
    H.blinks(ken, 0, LEN, seed=13)
    cam = camera("CAM_main", (-3.2, -4.4, 1.7), (86, 0, 0), lens=32)
    key_transform(cam, [(0, (-3.2, -4.4, 1.7), (86, 0, 0), None), (LEN, (8.2, -4.4, 1.7), (86, 0, 0), None)])
    return [1.0, LEN * 0.5, LEN - 0.8]


def shot_desk():
    sc = new_scene("SHOT_desk", LEN)
    sc.view_settings.view_transform = "Standard"
    world((0.02, 0.03, 0.05), 1.0)
    box("ENV_table", (0, 0.4, 0.75), (1.8, 1.0, 0.06), noisy_mat("M_wood", (0.22, 0.12, 0.06), bump=0.25, scale=1.5, rough=0.55, dark=0.55), 0.01)
    for sx in (-1, 1):
        for sy in (-1, 1):
            box("ENV_leg", (0.8 * sx, 0.4 + 0.42 * sy, 0.37), (0.06, 0.06, 0.74), mat("M_legw", (0.15, 0.08, 0.04)))
    box("ENV_chair", (0, -0.45, 0.45), (0.5, 0.5, 0.06), mat("M_chair", (0.15, 0.08, 0.04)), 0.01)
    bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 4, 4), rotation=(R(90), 0, 0))
    bpy.context.active_object.data.materials.append(noisy_mat("M_wall", (0.06, 0.07, 0.09), bump=0.2, scale=2))
    paper = mat("M_paper", (0.93, 0.88, 0.76), rough=0.7, emit=(1, 0.9, 0.7), strength=0)
    for side in (-1, 1):
        box(f"HERO_page{side}", (0.2 * side, 0.3, 0.8), (0.4, 0.55, 0.02), paper, 0.005, rot=(0, -6 * side, 0))
    ink = mat("M_ink", (0.15, 0.12, 0.1), emit=(1, 0.7, 0.2), strength=0)
    for side in (-1, 1):
        for r in range(9):
            box("FX_line", (0.2 * side, 0.1 + r * 0.05, 0.815 + abs(side) * 0.0), (0.3 - (r % 3) * 0.04, 0.01, 0.002), ink)
    t_read = T("read it out loud")
    key_value(emission_input(ink), [(0, 0.2), (t_read, 0.3), (t_read + 1.0, 3.5), (LEN, 4)])
    key_value(emission_input(paper), [(0, 0.0), (t_read, 0.02), (t_read + 1.2, 0.12)])
    ken = H.build("ken", "ken", loc=(0, -0.6, 0.0), rot_z=R(180))
    H.act(ken, [(0, "read_sit"), (t_read, "read_sit"), (t_read + 0.5, dict(H.POSES["read_sit"], head=(-14, 0, 0))), (LEN, dict(H.POSES["read_sit"], head=(-12, 0, 0)))])
    H.feel(ken, [(0, "calm"), (t_read, "happy")])
    H.blinks(ken, 0, LEN, seed=14)
    H.lipsync(ken, words_local(), t_offset=START, t_from=seq("read it out loud"), t_to=END)
    glow = light("LGT_book", "POINT", (0, 0.3, 1.1), energy=10, color=(1, 0.85, 0.55), size=0.3)
    key_light(glow, [(0, 10), (t_read, 12), (t_read + 1.2, 70)])
    light("LGT_key", "SPOT", (1.2, -1.5, 3.0), (R(35), 0, R(40)), energy=220, color=(1, 0.86, 0.66)).data.spot_size = R(50)
    light("LGT_rim", "POINT", (-1.5, 1.5, 1.8), energy=90, color=(0.35, 0.7, 1.0))
    cam = camera("CAM_main", (0.9, -2.4, 1.6), (78, 0, 22), lens=32)
    key_transform(cam, [(0, (1.0, -2.6, 1.7), (77, 0, 22), None), (LEN, (0.6, -1.9, 1.5), (79, 0, 18), None)])
    return [0.5, LEN - 0.6]


def shot_phone():
    sc = new_scene("SHOT_phone", LEN)
    room()
    ken = H.build("ken", "ken", loc=(-1.0, 0.0, 0.26), rot_z=R(-15), phone=True)
    t_text = T("the friend who")
    H.act(ken, [(0, dict(H.POSES["sit"], shR=(10, 20), elR=40, head=(-20, 0, 0), drop=-0.3)), (t_text - 0.2, dict(H.POSES["sit"], shR=(10, 20), elR=40, head=(-20, 0, 0), drop=-0.3)),
                (t_text + 0.4, dict(H.POSES["sit"], shR=(10, 70), elR=100, head=(-14, 0, 0), drop=-0.3)), (LEN, dict(H.POSES["sit"], shR=(10, 66), elR=98, head=(-10, 0, 0), drop=-0.3))])
    H.feel(ken, [(0, "tired"), (t_text + 0.6, "happy")])
    H.blinks(ken, 0, LEN, seed=15)
    if "screen" in ken:
        key_value(emission_input(ken["screen"].material_slots[0].material), [(0, 0.3), (t_text - 0.1, 0.3), (t_text, 8), (LEN, 5)])
    ph = light("LGT_phone", "POINT", (-0.95, -0.35, 1.25), energy=0, color=(0.4, 0.75, 1), size=0.05)
    key_light(ph, [(0, 2), (t_text - 0.1, 2), (t_text, 60), (LEN, 40)])
    light("LGT_moon", "SPOT", (1.2, 6, 4.2), (R(-62), 0, R(165)), energy=2500, color=(0.6, 0.72, 1.0), size=0.1).data.spot_size = R(40)
    cam = camera("CAM_main", (-0.5, -2.6, 1.35), (90, 0, 10), lens=40)
    key_transform(cam, [(0, (-0.45, -2.8, 1.35), (90, 0, 10), None), (LEN, (-0.7, -2.2, 1.38), (90, 0, 8), None)])
    return [t_text + 0.6]


def shot_sermon():
    sc = new_scene("SHOT_sermon", LEN)
    lights, amb = church(True)
    for l in lights:
        key_light(l, [(0, 700), (LEN, 700)])
    pre = H.build("pre", "preacher", loc=(0, 8.9, 0.6), rot_z=R(180), seed=50)
    H.act(pre, [(0, "preach"), (LEN * 0.4, dict(H.POSES["preach"], shR=(60, 70), elR=30)), (LEN * 0.7, "preach"), (LEN, dict(H.POSES["preach"], shR=(50, 80), elR=10, head=(0, -15, 0)))])
    H.blinks(pre, 0, LEN, seed=51)
    H.lipsync(pre, words_local(), t_offset=START, t_to=END)
    ken = H.build("ken", "ken", loc=(1.6, 3.0, 0.0), rot_z=R(180))
    t_me = T("right at me")
    H.act(ken, [(0, dict(H.POSES["sit"], head=(-12, 0, 0))), (t_me - 0.3, dict(H.POSES["sit"], head=(-12, 0, 0))), (t_me + 0.3, "sit_up"), (LEN, "sit_up")])
    H.feel(ken, [(0, "tired"), (t_me, "awe")])
    H.blinks(ken, 0, LEN, seed=52)
    hit = light("LGT_hit", "SPOT", (1.6, 3.0, 6.0), (0, 0, 0), energy=0, color=(1, 0.88, 0.6), size=0.2)
    hit.data.spot_size = R(16)
    key_light(hit, [(0, 0), (t_me - 0.1, 0), (t_me + 0.3, 2500), (LEN, 2500)])
    key_light(amb, [(0, 400), (t_me, 400), (t_me + 0.3, 150)])
    cam = camera("CAM_main", (1.6, -0.6, 1.3), (88, 0, 0), lens=26)
    key_transform(cam, [(0, (1.9, -0.8, 1.4), (87, 0, 6), None), (t_me - 0.1, (1.8, -0.4, 1.35), (87, 0, 5), None),
                        (t_me + 0.6, (1.75, 1.6, 1.05), (82, 0, 175), None), (LEN, (1.7, 1.75, 1.05), (82, 0, 177), None)])
    return [0.6, t_me + 0.8]


def shot_people():
    sc = new_scene("SHOT_people", LEN)
    lights, amb = church(True)
    for l in lights:
        key_light(l, [(0, 1200), (LEN, 1800)])
    ken = H.build("ken", "ken", loc=(0, -1.0, 0.0), rot_z=R(180))
    H.act(ken, [(0, "head_down"), (1.4, "idle"), (2.4, "open"), (LEN, dict(H.POSES["open"], head=(4, 0, 0)))])
    H.feel(ken, [(0, "sad"), (1.4, "happy")])
    H.blinks(ken, 0, LEN, seed=60)
    friends = [("f1", "friend", (-1.3, -1.6), 140, 0.2, "hand_shoulder"), ("f2", "mentor", (1.3, -1.4), 220, 0.7, "open"), ("f3", "buddy", (-0.8, 0.3), 160, 1.2, "wave"),
               ("f4", "preacher", (0.9, 0.4), 200, 1.6, "idle")]
    for name, lk, (x, y), rz, t0, gesture in friends:
        o = H.build(name, lk, loc=(x * 3, y - 2, 0), rot_z=R(rz), seed=hash(name) % 100)
        H.walk(o, t0, t0 + 1.0, (x * 2.4, y - 1.6, 0), (x, y, 0), rz=rz)
        H.act(o, [(t0 + 1.1, "idle"), (t0 + 1.5, gesture), (LEN, gesture)])
        H.blinks(o, 0, LEN, seed=hash(name) % 50)
    cam = camera("CAM_main", (0, -6.0, 1.6), (86, 0, 0), lens=30)
    key_transform(cam, [(0, (0.4, -5.0, 1.5), (86, 0, 4), None), (LEN, (-0.2, -6.4, 1.7), (85, 0, -2), None)])
    return [0.4, LEN - 0.6]


def shot_board():
    sc = new_scene("SHOT_board", LEN)
    sc.view_settings.view_transform = "Standard"
    world((0.03, 0.02, 0.025), 1.0)
    box("ENV_cork", (0, 0.1, 2.0), (3.4, 0.08, 4.0), noisy_mat("M_cork", (0.45, 0.3, 0.17), bump=0.8, scale=25, rough=0.9), 0.02)
    box("ENV_corkframe", (0, 0.14, 2.0), (3.55, 0.06, 4.15), mat("M_cframe", (0.12, 0.07, 0.04), rough=0.5), 0.02)
    stills = os.path.join(common.ROOT, "out", "stills")
    cards = [("because", -0.9, 3.3, -6), ("phone", 0.85, 2.55, 5), ("sermon", -0.8, 1.6, 4), ("people", 0.8, 0.75, -5)]
    pins = []
    t_red = T("one red thread")
    for i, (shot, x, z, rot) in enumerate(cards):
        path = os.path.join(stills, f"3d-v4-{shot}-0.png")
        root = link(bpy.data.objects.new(f"RIG_card{i}", None))
        root.location = (x, 0.0, z)
        root.rotation_euler = (0, R(rot), 0)
        box(f"HERO_polaroid{i}", (0, 0, 0), (1.0, 0.02, 1.15), mat("M_polaroid", (0.95, 0.93, 0.88), rough=0.8), 0.005).parent = root
        if os.path.exists(path):
            p = photo_plane(f"PIC_card{i}", path, (0, -0.015, 0.08), 0.82, emit=0.4)
            p.scale.x = 0.82 * 0.5625
            p.parent = root
        box(f"FX_pin{i}", (0, -0.03, 0.5), (0.06, 0.06, 0.06), mat("M_pin", (0.8, 0.1, 0.12), rough=0.3)).parent = root
        appear = 0.2 + i * 0.35
        key_transform(root, [(0, (x, -0.6, z), (0, rot + 25, 0), 0.01), (appear, (x, -0.6, z), (0, rot + 25, 0), 0.01), (appear + 0.4, (x, 0.0, z), (0, rot, 0), 1.0)])
        pins.append(Vector((x, -0.06, z + 0.5)))
        # Fingerprint: a glowing gold ring set that fades in on the card.
        fp_m = mat(f"M_fp{i}", (1, 0.75, 0.3), emit=(1, 0.75, 0.3), strength=0)
        for k in range(5):
            bpy.ops.mesh.primitive_torus_add(major_radius=0.05 + k * 0.025, minor_radius=0.006, location=(0.22, -0.03, -0.3), rotation=(R(90), 0, 0))
            ring = bpy.context.active_object
            ring.scale = (0.8, 1, 1)
            ring.data.materials.append(fp_m)
            ring.parent = root
        tf = T("his fingerprints") + i * 0.2
        key_value(emission_input(fp_m), [(0, 0), (tf, 0), (tf + 0.5, 6)])
    # The red thread through the pins, drawn on.
    cu = bpy.data.curves.new("thread", "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = 0.012
    sp = cu.splines.new("BEZIER")
    sp.bezier_points.add(len(pins) - 1)
    for bp, p in zip(sp.bezier_points, pins):
        bp.co = p
        bp.handle_left_type = bp.handle_right_type = "AUTO"
    th = link(bpy.data.objects.new("FX_thread", cu))
    th_m = mat("M_thread", (0.85, 0.05, 0.08), emit=(1, 0.1, 0.12), strength=0.5)
    th.data.materials.append(th_m)
    cu.bevel_factor_end = 0.0
    cu.keyframe_insert("bevel_factor_end", frame=frame(T("look back")))
    cu.bevel_factor_end = 1.0
    cu.keyframe_insert("bevel_factor_end", frame=frame(t_red + 1.2))
    key_value(emission_input(th_m), [(0, 0.5), (t_red, 0.6), (t_red + 0.6, 4.0)])
    light("LGT_key", "SPOT", (1.5, -3.5, 4.5), (R(40), 0, R(20)), energy=900, color=(1, 0.9, 0.78)).data.spot_size = R(55)
    light("LGT_warm", "POINT", (-1.5, -1.5, 1.0), energy=120, color=(1, 0.6, 0.4))
    cam = camera("CAM_main", (0, -4.6, 2.0), (90, 0, 0), lens=30)
    key_transform(cam, [(0, (0.3, -5.2, 2.4), (88, 0, 3), None), (LEN, (-0.1, -4.2, 1.9), (90, 0, -1), None)])
    return [LEN - 0.4]


def shot_dawn():
    sc = new_scene("SHOT_dawn", LEN)
    room(dawn=True)
    ken = H.build("ken", "ken", loc=(-0.2, 0.9, 0.0), rot_z=R(180))
    t_whisper = T("he's been whispering")
    t_ask = T("which letter")
    H.act(ken, [(0, "look_up"), (t_whisper, dict(H.POSES["look_up"], head=(14, 0, 0))), (t_ask - 0.4, "idle"), (t_ask + 0.2, "open"), (LEN, "open")])
    H.move(ken, [(0, (-0.2, 1.25, 0.0), 180), (t_ask - 0.5, (-0.2, 1.25, 0.0), 180), (t_ask + 0.4, (-0.2, 1.1, 0.0), 0), (LEN, (-0.2, 1.1, 0.0), 0)])
    H.feel(ken, [(0, "calm"), (t_whisper, "happy")])
    H.blinks(ken, 0, LEN, seed=70)
    H.lipsync(ken, words_local(), t_offset=START, t_from=seq("which letter"), t_to=END)
    cam = camera("CAM_main", (0.3, -1.6, 0.9), (98, 0, 6), lens=30)
    key_transform(cam, [(0, (0.2, -1.1, 0.95), (100, 0, 4), None), (t_ask - 0.2, (0.3, -1.9, 1.1), (95, 0, 4), None), (LEN, (0.3, -2.3, 1.2), (92, 0, 4), None)])
    return [0.6, LEN - 0.6]


SHOTS = {n: globals()["shot_" + n] for n, _, _ in CUTS}

if __name__ == "__main__":
    stills = SHOTS[SHOT]()
    blend = os.path.join(common.ROOT, "blender", "v4_" + SHOT + ".blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend)
    # Always save one reference still (used on the red-thread board), then the preview stills or the full video.
    render_still(f"v4-{SHOT}-0", stills[0])
    if PREVIEW:
        for i, t in enumerate(stills[1:], 1):
            render_still(f"v4-{SHOT}-{i}", t)
    else:
        render_mp4("v4-" + SHOT)
