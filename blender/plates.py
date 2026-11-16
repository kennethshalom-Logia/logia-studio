"""3D background plates for the flat Logia reels (cel-shaded sets with ink outlines).

Run:  blender -b --factory-startup -P blender/plates.py -- <name> [<name> ...] [preview]

Coordinate contract with Remotion (src/flat): the reel's "world" is 1080x1920 px. A base camera
frames world [0,1080]x[0,1920]; the floor point (0,0,0) lands at world px (540, 1300), where
characters stand, at ~400 px per metre. Each plate renders a larger world rectangle (so the
Remotion camera can push in and pull out) by widening the sensor and shifting the lens.
Named anchors (window, bed top, table top...) are projected to world px and written to
src/data/plates.json so the 2D overlays sit exactly on the 3D set.
"""
import json
import math
import os
import sys

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from toon import toon_mat, outline  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTDIR = os.path.join(ROOT, "public", "plates")
DATA = os.path.join(ROOT, "src", "data", "plates.json")
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
PREVIEW = "preview" in ARGS
R = math.radians

# Base camera: sees world [0,1080]x[0,1920]; floor origin projects to (540,1300).
CAM_LOC = (0.0, -5.2, 1.2)
CAM_PITCH = 90 - (math.degrees(math.atan2(1.2, 5.2)) - math.degrees(math.atan2(340, 40 / 36 * 1920)))
LENS, SENSOR = 40.0, 36.0


# ---------- scene + helpers ----------

def reset():
    import toon
    toon._ink = None
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.lights, bpy.data.cameras, bpy.data.curves, bpy.data.images):
        for d in list(coll):
            if d.users == 0:
                coll.remove(d)
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_EEVEE"
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "None"
    sc.render.film_transparent = False
    sc.eevee.taa_render_samples = 16 if PREVIEW else 48
    w = bpy.data.worlds.get("W") or bpy.data.worlds.new("W")
    w.use_nodes = True
    nt = w.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputWorld")
    bg = nt.nodes.new("ShaderNodeBackground")
    bg.inputs["Color"].default_value = (0.9, 0.86, 0.78, 1)
    bg.inputs["Strength"].default_value = 0.55
    try:
        sc.eevee.use_raytracing = True
        sc.eevee.ray_tracing_options.resolution_scale = "2"
        sc.eevee.use_shadows = True
        sc.eevee.fast_gi_method = "GLOBAL_ILLUMINATION"
        sc.eevee.use_fast_gi = True
    except Exception:
        pass
    nt.links.new(bg.outputs["Background"], out.inputs["Surface"])
    sc.world = w
    return sc


_mats = {}


def M(color, shade=0.62, emit=1.0):
    """Soft stylised 3D material: Principled, matte, with a touch of emission for glowing parts."""
    key = (tuple(round(c, 3) for c in color), emit)
    if key not in _mats:
        m = bpy.data.materials.new(f"P{len(_mats)}")
        m.use_nodes = True
        b = m.node_tree.nodes["Principled BSDF"]
        b.inputs["Base Color"].default_value = (*color, 1)
        b.inputs["Roughness"].default_value = 0.72
        try:
            b.inputs["Specular IOR Level"].default_value = 0.25
        except Exception:
            pass
        if emit > 1.0:
            b.inputs["Emission Color"].default_value = (*color, 1)
            b.inputs["Emission Strength"].default_value = (emit - 1.0) * 2.5
        _mats[key] = m
    return _mats[key]


def hexc(h, k=1.0):
    h = h.lstrip("#")
    # sRGB -> linear so flat colours match the 2D palette.
    def lin(c):
        c = c / 255
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return tuple(min(1, lin(int(h[i:i + 2], 16)) * k) for i in (0, 2, 4))


def finish_obj(o, color, bevel=0.0, ink=0.012, shade=0.62, emit=1.0, shadow=True):
    o.data.materials.append(M(color, shade, emit))
    if bevel > 0:
        b = o.modifiers.new("bev", "BEVEL")
        b.width = bevel
        b.segments = 3
        b.limit_method = "ANGLE"
    if ink > 0:
        outline(o, ink)
    o.visible_shadow = shadow
    return o


def box(name, size, loc, color, rot=(0, 0, 0), bevel=0.02, ink=0.012, **kw):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=tuple(R(a) for a in rot))
    o = bpy.context.active_object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish_obj(o, color, bevel, ink, **kw)


def cyl(name, r, h, loc, color, rot=(0, 0, 0), verts=32, bevel=0.01, ink=0.012, **kw):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, vertices=verts, location=loc, rotation=tuple(R(a) for a in rot))
    o = bpy.context.active_object
    o.name = name
    bpy.ops.object.shade_smooth()
    return finish_obj(o, color, bevel, ink, **kw)


def ball(name, r, loc, color, scale=(1, 1, 1), ink=0.012, **kw):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=40, ring_count=20)
    o = bpy.context.active_object
    o.name = name
    o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bpy.ops.object.shade_smooth()
    return finish_obj(o, color, 0, ink, **kw)


def plane(name, w, h, loc, color, rot=(0, 0, 0), ink=0.0, **kw):
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc, rotation=tuple(R(a) for a in rot))
    o = bpy.context.active_object
    o.name = name
    o.scale = (w, h, 1)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish_obj(o, color, 0, ink, **kw)


def mesh_from(name, verts, faces, color, ink=0.012, smooth=False, sub=0, **kw):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    if sub:
        s = o.modifiers.new("sub", "SUBSURF")
        s.levels = sub
        s.render_levels = sub
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    return finish_obj(o, color, 0, ink, **kw)


def hill(name, x, y, w, h, d, color, seed=0):
    """A soft rounded hill: a squashed sphere half-buried in the floor."""
    return ball(name, 1, (x, y, -h * 0.15), color, scale=(w, d, h), ink=0.02, shade=0.78)


def sky(c_bottom, c_top, dist=60, strength=1.0):
    """Huge emissive gradient wall behind everything."""
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, dist, 8), rotation=(R(90), 0, 0))
    p = bpy.context.active_object
    p.name = "sky"
    p.scale = (400, 160, 1)
    m = bpy.data.materials.new("sky")
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    em = nt.nodes.new("ShaderNodeEmission")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.5
    ramp.color_ramp.elements[0].color = (*c_bottom, 1)
    ramp.color_ramp.elements[1].position = 0.56
    ramp.color_ramp.elements[1].color = (*c_top, 1)
    nt.links.new(tc.outputs["Generated"], sep.inputs["Vector"])
    nt.links.new(sep.outputs["Y"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], em.inputs["Color"])
    em.inputs["Strength"].default_value = strength
    nt.links.new(em.outputs["Emission"], out.inputs["Surface"])
    p.data.materials.append(m)
    p.visible_shadow = False
    # Anything the plane doesn't cover shows the sky's top colour (camera rays only).
    w = bpy.context.scene.world
    nt2 = w.node_tree
    bg = [n for n in nt2.nodes if n.type == "BACKGROUND"][0]
    out = [n for n in nt2.nodes if n.type == "OUTPUT_WORLD"][0]
    cam_bg = nt2.nodes.new("ShaderNodeBackground")
    cam_bg.inputs["Color"].default_value = (*c_top, 1)
    cam_bg.inputs["Strength"].default_value = 1.0
    lp = nt2.nodes.new("ShaderNodeLightPath")
    mix = nt2.nodes.new("ShaderNodeMixShader")
    nt2.links.new(lp.outputs["Is Camera Ray"], mix.inputs["Fac"])
    nt2.links.new(bg.outputs["Background"], mix.inputs[1])
    nt2.links.new(cam_bg.outputs["Background"], mix.inputs[2])
    nt2.links.new(mix.outputs["Shader"], out.inputs["Surface"])
    return p


def glow(name, loc, r, color, strength=3.0):
    """Emissive disc (window light, lamp bulb, sun)."""
    bpy.ops.mesh.primitive_circle_add(radius=r, fill_type="NGON", location=loc, rotation=(R(90), 0, 0), vertices=48)
    o = bpy.context.active_object
    o.name = name
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (*color, 1)
    em.inputs["Strength"].default_value = strength
    nt.links.new(em.outputs["Emission"], out.inputs["Surface"])
    o.data.materials.append(m)
    o.visible_shadow = False
    return o


def sun(energy, rot, color=(1, 0.95, 0.85), angle=4):
    ld = bpy.data.lights.new("sun", "SUN")
    ld.energy = energy
    ld.color = color
    ld.angle = R(angle)
    o = bpy.data.objects.new("sun", ld)
    bpy.context.scene.collection.objects.link(o)
    o.rotation_euler = tuple(R(a) for a in rot)
    return o


def point(name, loc, energy, color, radius=0.2):
    ld = bpy.data.lights.new(name, "POINT")
    ld.energy = energy
    ld.color = color
    ld.shadow_soft_size = radius
    o = bpy.data.objects.new(name, ld)
    bpy.context.scene.collection.objects.link(o)
    o.location = loc
    return o


def anchor(name, loc):
    e = bpy.data.objects.new("A_" + name, None)
    e.location = loc
    bpy.context.scene.collection.objects.link(e)
    return e


# ---------- camera + output ----------

def base_camera():
    cd = bpy.data.cameras.new("cam")
    cd.lens = LENS
    cd.sensor_fit = "AUTO"
    cd.sensor_width = SENSOR
    cd.clip_end = 500
    o = bpy.data.objects.new("cam", cd)
    bpy.context.scene.collection.objects.link(o)
    o.location = CAM_LOC
    o.rotation_euler = (R(CAM_PITCH), 0, 0)
    sc = bpy.context.scene
    sc.camera = o
    sc.render.resolution_x, sc.render.resolution_y = 1080, 1920
    return o


def project(names):
    """World px of anchors/objects through the base camera (bbox for meshes, point for empties)."""
    sc = bpy.context.scene
    cam = sc.camera
    dg = bpy.context.evaluated_depsgraph_get()
    out = {}
    for o in bpy.data.objects:
        if o.name.startswith("A_") or o.name in names:
            pts = [o.matrix_world.translation] if o.type == "EMPTY" else [o.matrix_world @ Vector(c) for c in o.bound_box]
            px = []
            for p in pts:
                v = world_to_camera_view(sc, cam, p)
                px.append((v.x * 1080, (1 - v.y) * 1920))
            xs, ys = [p[0] for p in px], [p[1] for p in px]
            key = o.name[2:] if o.name.startswith("A_") else o.name
            out[key] = [round(min(xs)), round(min(ys)), round(max(xs)), round(max(ys))] if o.type != "EMPTY" else [round(xs[0]), round(ys[0])]
    return out


def render_plate(name, rect, density):
    """Render world rect [x0,y0,x1,y1] (world px) at `density` image px per world px."""
    sc = bpy.context.scene
    cam = sc.camera
    x0, y0, x1, y1 = rect
    w, h = x1 - x0, y1 - y0
    big = max(w, h)
    cam.data.sensor_width = SENSOR * big / 1920  # AUTO fit: sensor spans the larger dimension
    cam.data.shift_x = ((x0 + x1) / 2 - 540) / big
    cam.data.shift_y = -((y0 + y1) / 2 - 960) / big
    d = density * (0.5 if PREVIEW else 1)
    sc.render.resolution_x = int(w * d)
    sc.render.resolution_y = int(h * d)
    sc.render.resolution_percentage = 100
    os.makedirs(OUTDIR, exist_ok=True)
    path = os.path.join(OUTDIR, f"{name}.jpg")
    sc.render.image_settings.file_format = "JPEG"
    sc.render.image_settings.quality = 90
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    # restore base camera
    cam.data.sensor_width = SENSOR
    cam.data.shift_x = cam.data.shift_y = 0
    print("PLATE", path, sc.render.resolution_x, sc.render.resolution_y)
    return path


def save_meta(name, rect, anchors):
    meta = {}
    if os.path.exists(DATA):
        with open(DATA, encoding="utf-8") as f:
            meta = json.load(f)
    meta[name] = {"src": f"plates/{name}.jpg", "rect": rect, "anchors": anchors}
    with open(DATA, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=1)


# ---------- sets ----------
# Units: metres. x right, y depth (away from camera), z up. Ken stands around y = 0.

CREAM = hexc("#f5f0e5")
INKC = hexc("#1d1a1a")


def floor(color, size=60, y=20):
    return plane("floor", size * 2, size * 2, (0, y, 0), color, shade=0.8)


def bedroom(dawn):
    wall = hexc("#3d4668") if not dawn else hexc("#f1dbb6")
    floor(hexc("#2a3149") if not dawn else hexc("#dcbf8f"))
    box("wall_back", (14, 0.3, 6), (0, 2.6, 3), wall, bevel=0, ink=0)
    box("wall_left", (0.3, 8, 6), (-3.4, -1.0, 3), tuple(c * 0.85 for c in wall), bevel=0, ink=0)
    box("skirting", (14, 0.12, 0.14), (0, 2.42, 0.07), tuple(c * 0.8 for c in wall), bevel=0.01)
    # window on the back wall
    wx, wz = 0.9, 2.25
    box("win_frame", (1.5, 0.16, 1.7), (wx, 2.4, wz), hexc("#2c2a33") if not dawn else hexc("#f8ead0"), bevel=0.02)
    pane = box("win_pane", (1.32, 0.05, 1.52), (wx, 2.33, wz), hexc("#151b33") if not dawn else hexc("#ffe1a1"), bevel=0, ink=0, emit=1.0 if not dawn else 1.6, shade=1.0)
    box("win_mullion_v", (0.06, 0.08, 1.52), (wx, 2.29, wz), hexc("#2c2a33") if not dawn else hexc("#f8ead0"), bevel=0.005)
    box("win_mullion_h", (1.32, 0.08, 0.06), (wx, 2.29, wz), hexc("#2c2a33") if not dawn else hexc("#f8ead0"), bevel=0.005)
    box("win_sill", (1.75, 0.3, 0.08), (wx, 2.25, wz - 0.86), hexc("#4a5272") if not dawn else hexc("#f6e7c9"), bevel=0.02)
    if not dawn:
        glow("moon", (wx + 0.35, 2.27, wz + 0.45), 0.14, (0.96, 0.95, 0.85), 2.5)
        al = bpy.data.lights.new("moonbeam", "AREA")
        al.energy = 220
        al.color = (0.55, 0.65, 1.0)
        al.size = 1.4
        ao = bpy.data.objects.new("moonbeam", al)
        bpy.context.scene.collection.objects.link(ao)
        ao.location = (wx, 3.2, wz + 0.4)
        ao.rotation_euler = (R(-60), 0, 0)
    else:
        glow("sunball", (wx, 2.27, wz - 0.25), 0.3, (1.0, 0.8, 0.35), 3.0)
        al = bpy.data.lights.new("sunbeam", "AREA")
        al.energy = 900
        al.color = (1.0, 0.82, 0.55)
        al.size = 1.4
        ao = bpy.data.objects.new("sunbeam", al)
        bpy.context.scene.collection.objects.link(ao)
        ao.location = (wx, 3.4, wz + 0.6)
        ao.rotation_euler = (R(-62), 0, 0)
    # bed (left), frame + mattress + blanket + pillow
    bx = -1.35
    box("bed_base", (2.3, 1.6, 0.12), (bx, 0.75, 0.07), hexc("#5a4a3e") if not dawn else hexc("#b07a4a"), bevel=0.04)
    box("bed_head", (0.14, 1.6, 0.9), (bx - 1.15, 0.75, 0.45), hexc("#5a4a3e") if not dawn else hexc("#b07a4a"), bevel=0.04)
    box("mattress", (2.2, 1.5, 0.14), (bx, 0.75, 0.2), hexc("#e9e4d8"), bevel=0.06)
    box("blanket", (1.6, 1.56, 0.12), (bx + 0.3, 0.75, 0.28), hexc("#5f7bb5") if not dawn else hexc("#e9a35a"), bevel=0.05)
    box("pillow", (0.5, 0.9, 0.2), (bx - 0.8, 0.85, 0.34), hexc("#f4f0e6"), bevel=0.08)
    anchor("bed_seat", (bx + 0.95, 0.0, 0.25))
    # night stand + lamp (right)
    box("stand", (0.6, 0.5, 0.6), (2.0, 1.3, 0.3), hexc("#4a3d35") if not dawn else hexc("#c48c58"), bevel=0.03)
    cyl("lamp_stem", 0.03, 0.4, (2.0, 1.3, 0.8), INKC, ink=0)
    cyl("lamp_shade", 0.2, 0.28, (2.0, 1.3, 1.1), hexc("#7d7a8c") if not dawn else hexc("#ffe08a"), emit=1.0 if not dawn else 1.5)
    # shelf + books + small cross
    box("shelf", (1.1, 0.25, 0.05), (-0.6, 2.35, 2.3), hexc("#6b5340") if not dawn else hexc("#b07a4a"), bevel=0.01)
    for i, c in enumerate(["#c9504a", "#f2c94c", "#79b38b", "#7f9fd6"]):
        box(f"book{i}", (0.08, 0.2, 0.3 - i * 0.03), (-0.95 + i * 0.1, 2.33, 2.47 - i * 0.015), hexc(c), bevel=0.005, ink=0.006)
    box("cross_v", (0.06, 0.04, 0.4), (-0.35, 2.4, 2.55), hexc("#d9a441"), bevel=0.005, ink=0.006)
    box("cross_h", (0.24, 0.04, 0.06), (-0.35, 2.4, 2.62), hexc("#d9a441"), bevel=0.005, ink=0.006)
    anchor("calendar", (-1.9, 2.42, 2.1))
    # rug
    cyl("rug", 1.3, 0.02, (0.3, 0.2, 0.01), hexc("#8f4a4a") if not dawn else hexc("#d98a6a"), ink=0, bevel=0)
    if not dawn:
        sun(1.2, (60, 0, -30), (0.55, 0.62, 0.95))
        point("lamp", (2.0, 1.3, 1.1), 15, (0.7, 0.75, 1.0))
        point("phone_fill", (0.2, -0.8, 1.3), 20, (0.6, 0.75, 1.0), 0.4)
    else:
        sun(4.0, (55, 0, 35), (1.0, 0.88, 0.7))
        point("lamp", (2.0, 1.3, 1.1), 60, (1.0, 0.8, 0.5))
    return ["win_pane"]


def landscape(dusk=False, tomb=True):
    ground = hexc("#e6d6b6") if not dusk else hexc("#d8c39e")
    floor(ground, size=200, y=60)
    sky(hexc("#f6efe0") if not dusk else hexc("#f1d9b8"), hexc("#bcd6e6") if not dusk else hexc("#8f9cc0"), dist=150)
    hills = [(-14, 30, 14, 5, 6), (6, 38, 18, 7, 8), (26, 34, 14, 5, 6), (-30, 45, 18, 8, 9), (44, 50, 20, 9, 9), (-6, 18, 9, 2.2, 4), (16, 20, 8, 2.6, 4)]
    for i, (x, y, w, h, d) in enumerate(hills):
        hill(f"hill{i}", x, y, w, h, d, hexc(["#e3cfa8", "#dcc49b", "#e6d4b0", "#d6bd92", "#dfc8a0", "#ead9b6", "#e2cda5"][i]))
    # a path and some stones/bushes
    for i in range(14):
        x = -9 + (i * 3.7) % 26
        y = 3 + (i * 2.3) % 14
        ball(f"bush{i}", 0.35 + (i % 3) * 0.12, (x, y, 0.15), hexc(["#9fb37a", "#b5c48a", "#8ea56a"][i % 3]), scale=(1.2, 1, 0.8), ink=0.01)
    for i in range(8):
        ball(f"stone{i}", 0.12 + (i % 2) * 0.08, (-6 + i * 1.9, -0.6 + (i % 3) * 0.5, 0.04), hexc("#cdbb9a"), scale=(1.3, 1, 0.6), ink=0.008)
    if tomb:
        # Garden tomb carved in a rock, door open, round stone rolled aside. Tomb sits at world x≈1640 → 2.75 m.
        tx = 2.75
        ball("tomb_rock", 1.0, (tx, 1.2, 0.0), hexc("#c9b08a"), scale=(1.9, 1.3, 1.45), ink=0.016)
        box("tomb_door", (0.62, 0.3, 0.95), (tx, -0.02, 0.47), hexc("#2c2420"), bevel=0.12, ink=0.01, shade=1.0)
        cyl("tomb_stone", 0.58, 0.22, (tx + 1.2, -0.1, 0.58), hexc("#b39a74"), rot=(90, 0, 0), bevel=0.04)
        anchor("tomb_door", (tx, -0.2, 0.5))
    sun(4.5 if not dusk else 3.0, (58, 0, 40), (1.0, 0.93, 0.8) if not dusk else (1.0, 0.75, 0.6))
    return []


def church_out():
    landscape(tomb=False)
    wallc = hexc("#fbf9f3")
    cx, cy = 0.0, 5.6
    box("ch_body", (3.4, 3.2, 3.2), (cx, cy, 1.6), wallc, bevel=0.02)
    # gable roof
    mesh_from("ch_roof", [(-1.95, cy - 1.75, 3.15), (1.95, cy - 1.75, 3.15), (0, cy - 1.75, 4.6), (-1.95, cy + 1.75, 3.15), (1.95, cy + 1.75, 3.15), (0, cy + 1.75, 4.6)],
              [(0, 1, 2), (3, 5, 4), (0, 3, 4, 1), (0, 2, 5, 3), (1, 4, 5, 2)], hexc("#c9504a"))
    mesh_from("ch_gable", [(-1.7, cy - 1.62, 3.2), (1.7, cy - 1.62, 3.2), (0, cy - 1.62, 4.45)], [(0, 1, 2)], wallc, ink=0)
    box("tower", (1.0, 1.0, 2.0), (cx, cy - 0.6, 5.2), wallc, bevel=0.02)
    mesh_from("spire", [(-0.6, cy - 1.1, 6.2), (0.6, cy - 1.1, 6.2), (0.6, cy - 0.1, 6.2), (-0.6, cy - 0.1, 6.2), (0, cy - 0.6, 7.4)],
              [(0, 1, 4), (1, 2, 4), (2, 3, 4), (3, 0, 4)], hexc("#c9504a"))
    box("spire_cross_v", (0.08, 0.08, 0.6), (cx, cy - 0.6, 7.7), hexc("#f2c94c"), bevel=0.01, ink=0.008)
    box("spire_cross_h", (0.36, 0.08, 0.08), (cx, cy - 0.6, 7.8), hexc("#f2c94c"), bevel=0.01, ink=0.008)
    cyl("rose", 0.42, 0.08, (cx, cy - 1.66, 3.75), hexc("#f2c94c"), rot=(90, 0, 0), emit=1.2)
    box("door", (1.0, 0.12, 1.7), (cx, cy - 1.62, 0.85), hexc("#f0c95f"), bevel=0.05)
    cyl("door_arch", 0.5, 0.12, (cx, cy - 1.62, 1.7), hexc("#f0c95f"), rot=(90, 0, 0), bevel=0.02)
    for sx in (-1.15, 1.15):
        box(f"win{sx}", (0.42, 0.1, 0.9), (cx + sx, cy - 1.62, 1.8), hexc("#bfe0f0"), bevel=0.04, emit=1.1)
    box("steps", (1.6, 0.6, 0.12), (cx, cy - 1.95, 0.06), hexc("#e7dccb"), bevel=0.02)
    anchor("door", (cx, cy - 1.7, 0.0))
    anchor("sign", (2.6, 0.9, 1.1))
    return []


def church_in():
    wall = hexc("#f3e6cf")
    floor(hexc("#c79f6c"))
    box("wall_back", (16, 0.3, 8), (0, 4.0, 4), wall, bevel=0, ink=0)
    box("wall_left", (0.3, 10, 8), (-4.2, 0, 4), tuple(c * 0.86 for c in wall), bevel=0, ink=0)
    box("wall_right", (0.3, 10, 8), (4.2, 0, 4), tuple(c * 0.86 for c in wall), bevel=0, ink=0)
    # arched stained-glass window + cross
    box("sg", (1.2, 0.08, 2.0), (0, 3.82, 3.2), hexc("#9cc8e8"), bevel=0, ink=0.012, emit=1.25)
    cyl("sg_top", 0.6, 0.08, (0, 3.82, 4.2), hexc("#9cc8e8"), rot=(90, 0, 0), emit=1.25)
    box("cross_v", (0.18, 0.12, 1.4), (0, 3.7, 3.1), hexc("#f2c94c"), bevel=0.02, emit=1.3)
    box("cross_h", (0.8, 0.12, 0.18), (0, 3.7, 3.4), hexc("#f2c94c"), bevel=0.02, emit=1.3)
    # stage, pulpit
    box("stage", (6, 2.2, 0.35), (0, 2.8, 0.17), hexc("#a46a3a"), bevel=0.03)
    box("pulpit", (0.8, 0.6, 1.1), (1.6, 2.2, 0.9), hexc("#8a5530"), bevel=0.05)
    anchor("pulpit", (1.6, 2.2, 1.45))
    # pews in rows
    for r in range(3):
        for side in (-1, 1):
            box(f"pew{r}{side}", (2.6, 0.45, 0.45), (side * 1.9, 0.9 + r * 1.0, 0.25), hexc("#b07a4a"), bevel=0.04)
            box(f"pewb{r}{side}", (2.6, 0.12, 0.6), (side * 1.9, 1.1 + r * 1.0, 0.65), hexc("#9a6a3e"), bevel=0.03)
    # hanging lamps
    for x in (-2.2, 2.2):
        cyl(f"lamp{x}", 0.22, 0.3, (x, 2.0, 4.2), hexc("#ffe08a"), emit=2.0)
        cyl(f"cord{x}", 0.01, 2.0, (x, 2.0, 5.3), INKC, ink=0)
    sun(3.0, (50, 0, 20), (1.0, 0.92, 0.8))
    point("glow", (0, 3.0, 3.2), 90, (1.0, 0.85, 0.55), 1.0)
    return []


def radio_room():
    wall = hexc("#efe2c8")
    floor(hexc("#c9a676"))
    box("wall_back", (16, 0.3, 7), (0, 2.4, 3.5), wall, bevel=0, ink=0)
    box("wainscot", (16, 0.32, 1.0), (0, 2.38, 0.5), hexc("#d9c19a"), bevel=0, ink=0.01)
    # table where the radio sits (world x≈700 → 0.4 m), top at world y≈1080
    box("table_top", (2.0, 0.9, 0.08), (0.45, 0.35, 0.78), hexc("#b07a4a"), bevel=0.02)
    for lx in (-0.45, 1.35):
        for ly in (0.0, 0.7):
            box(f"leg{lx}{ly}", (0.07, 0.07, 0.76), (lx, ly, 0.38), hexc("#8a5530"), bevel=0.01)
    anchor("table_top", (0.45, 0.1, 0.82))
    # picture frame + plant
    box("frame", (0.9, 0.06, 0.65), (-1.2, 2.22, 2.1), hexc("#8a5530"), bevel=0.02)
    box("frame_in", (0.72, 0.02, 0.48), (-1.2, 2.18, 2.1), hexc("#a9c7a0"), bevel=0, ink=0.006)
    cyl("pot", 0.2, 0.35, (2.3, 1.4, 0.18), hexc("#c9504a"))
    ball("plant", 0.45, (2.3, 1.4, 0.75), hexc("#79b38b"), scale=(1, 1, 1.2))
    box("lampbox", (0.12, 0.12, 1.6), (-2.4, 1.6, 0.8), INKC, ink=0)
    cyl("floorlamp", 0.32, 0.35, (-2.4, 1.6, 1.7), hexc("#ffe08a"), emit=1.6)
    sun(3.2, (55, 0, 30))
    point("warm", (-2.4, 1.5, 1.7), 80, (1.0, 0.8, 0.5), 0.5)
    return []


def elijah():
    floor(hexc("#b99a6e"), size=200, y=60)
    sky(hexc("#efe2c6"), hexc("#d9c4a0"), dist=150)
    # big rounded mountain with a snowy top, built from soft stacked masses
    ball("mountain", 1.0, (-4, 42, 0.0), hexc("#d4bf9c"), scale=(15, 9, 17), ink=0.05)
    ball("mountain_shoulder", 1.0, (11, 46, 0.0), hexc("#cdb895"), scale=(11, 8, 10), ink=0.05)
    ball("snowcap", 1.0, (-4, 38.5, 13.2), hexc("#f7f3ea"), scale=(6.2, 5, 3.6), ink=0.04)
    hill("hillL", -9, 16, 7, 3, 5, hexc("#c9ae84"))
    hill("hillR", 9, 18, 9, 4, 6, hexc("#d2b98f"))
    # rock outcrop with the cave mouth (cave at world x≈300 → -0.6 m)
    ball("outcrop", 1.0, (-0.9, 1.6, 0.0), hexc("#bfa27a"), scale=(1.8, 1.4, 1.7), ink=0.016)
    ball("cave", 1.0, (-0.75, 0.32, 0.3), hexc("#2a1f18"), scale=(0.62, 0.25, 0.9), ink=0.01, shade=1.0)
    anchor("cave", (-0.75, 0.0, 0.6))
    for i in range(10):
        ball(f"rock{i}", 0.15 + (i % 3) * 0.1, (-4 + i * 1.1, -0.4 + (i % 4) * 0.6, 0.05), hexc("#a98d65"), scale=(1.3, 1, 0.7), ink=0.008)
    sun(4.0, (52, 0, -35), (1.0, 0.9, 0.75))
    return []


def qumran():
    floor(hexc("#c7a46f"), size=200, y=60)
    sky(hexc("#f4e6c8"), hexc("#a9cbe0"), dist=150)
    # the Dead Sea in front/right
    plane("sea", 30, 10, (19, 9, 0.02), hexc("#7fb9c2"), shade=0.9)
    # stepped cliffs with dark cave holes
    for i, (x, y, w, h) in enumerate([(-4, 4, 5, 3.4), (1.5, 5.5, 6, 4.4), (7, 4.5, 5, 3.0), (-9, 6, 6, 4.0)]):
        box(f"cliff{i}", (w, 3, h), (x, y, h / 2), hexc(["#d7b27c", "#cfa86f", "#dbb987", "#c99f66"][i]), bevel=0.4, ink=0.02)
        box(f"cliffcap{i}", (w * 0.8, 2.6, 0.5), (x - 0.2, y + 0.1, h + 0.2), hexc("#e2c08d"), bevel=0.2, ink=0.015)
    ball("cave1", 1.0, (0.55, 3.98, 1.8), hexc("#2c1f15"), scale=(0.5, 0.15, 0.38), ink=0.01, shade=1.0)
    ball("cave2", 1.0, (-3.0, 2.48, 1.2), hexc("#2c1f15"), scale=(0.35, 0.12, 0.26), ink=0.01, shade=1.0)
    anchor("cave", (0.55, 3.8, 1.8))
    for i in range(6):
        ball(f"rock{i}", 0.18 + (i % 3) * 0.08, (-3 + i * 1.5, 0.6 + (i % 2) * 0.8, 0.06), hexc("#b48d58"), scale=(1.3, 1, 0.7), ink=0.008)
    sun(4.5, (50, 0, -30), (1.0, 0.92, 0.78))
    return []


def study():
    wall = hexc("#e9dfcd")
    floor(hexc("#cdb08a"))
    box("wall_back", (16, 0.3, 7), (0, 2.4, 3.5), wall, bevel=0, ink=0)
    # desk at right (world x 560..1120, top y≈1060 → 0.05..1.45 m)
    box("desk_top", (1.6, 0.8, 0.07), (0.85, 0.3, 0.74), hexc("#b07a4a"), bevel=0.02)
    for lx in (0.12, 1.58):
        box(f"dleg{lx}", (0.07, 0.7, 0.72), (lx, 0.3, 0.36), hexc("#8a5530"), bevel=0.01)
    anchor("desk_top", (0.85, 0.05, 0.78))
    box("bench", (0.9, 0.4, 0.22), (-0.35, 0.1, 0.11), hexc("#9a6a3e"), bevel=0.03)
    # window + plant + poster
    box("win", (1.2, 0.1, 1.2), (-1.6, 2.22, 2.0), hexc("#cfe7f2"), bevel=0.02, emit=1.3)
    box("poster", (0.7, 0.05, 0.95), (1.2, 2.22, 2.2), hexc("#f2c94c"), bevel=0.01)
    cyl("mug", 0.07, 0.14, (1.35, 0.35, 0.85), hexc("#c9504a"), ink=0.006)
    sun(3.2, (55, 0, -25))
    return []


def road():
    landscape(tomb=False)
    plane("asphalt", 400, 2.4, (0, 0.6, 0.015), hexc("#5d5a62"), shade=0.9)
    for i in range(-40, 40):
        plane(f"dash{i}", 1.0, 0.1, (i * 2.6, 0.6, 0.02), hexc("#f4f0e6"), shade=1.0)
    for i in range(-14, 14):
        cyl(f"post{i}", 0.04, 0.6, (i * 4.5, 2.2, 0.3), hexc("#8a5530"), ink=0.006)
    return []


def corkboard():
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0.5, 1.2), rotation=(R(92), 0, 0))
    c = bpy.context.active_object
    c.name = "cork"
    c.scale = (30, 30, 1)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    m = toon_mat("cork", hexc("#c49a66"), shade=0.8)
    nt = m.node_tree
    mul = [n for n in nt.nodes if n.type == "MIX"][0]
    vor = nt.nodes.new("ShaderNodeTexVoronoi")
    vor.inputs["Scale"].default_value = 28
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (*hexc("#a97f4f"), 1)
    ramp.color_ramp.elements[1].position = 0.4
    ramp.color_ramp.elements[1].color = (*hexc("#c49a66"), 1)
    nt.links.new(vor.outputs["Distance"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], mul.inputs["B"])
    c.data.materials.append(m)
    point("spot", (0, -1.5, 3.5), 900, (1.0, 0.9, 0.75), 2.0)
    sun(1.5, (40, 0, 0))
    return []


def studio():
    floor(CREAM, size=60)
    sky(CREAM, hexc("#efe6d4"), dist=30)
    for i, (x, y) in enumerate([(-2.2, 3), (2.4, 4), (-3.5, 7), (3.6, 8)]):
        ball(f"blob{i}", 0.6 + i * 0.15, (x, y, 0.3), hexc(["#f2c94c", "#d93a3a", "#79b38b", "#7f9fd6"][i]), scale=(1, 1, 0.8), ink=0.012)
    sun(3.0, (55, 0, 30))
    return []


# name: (builder, rect [x0,y0,x1,y1] in world px, density)
PLATES = {
    "bedroom_night": (lambda: bedroom(False), [-200, -150, 1300, 2050], 1.6),
    "bedroom_dawn": (lambda: bedroom(True), [-200, -150, 1300, 2050], 1.6),
    "hills": (lambda: landscape(), [-1400, -2200, 3500, 3600], 0.62),
    "hills_dusk": (lambda: landscape(dusk=True, tomb=False), [-1100, -1900, 2200, 3700], 0.7),
    "church_out": (church_out, [-250, -200, 1350, 2100], 1.3),
    "church_in": (church_in, [-250, -150, 1350, 2050], 1.5),
    "radio_room": (radio_room, [-250, -150, 1350, 2050], 1.5),
    "elijah": (elijah, [-350, -250, 1450, 2150], 1.4),
    "qumran": (qumran, [-500, -350, 1600, 2300], 1.15),
    "study": (study, [-250, -150, 1350, 2050], 1.4),
    "road": (road, [-1600, 300, 2700, 2000], 1.0),
    "corkboard": (corkboard, [-1300, -1700, 2400, 3600], 0.55),
    "studio": (studio, [-150, -150, 1250, 2100], 1.0),
}


YAW = {"bedroom_night": -16, "bedroom_dawn": -16, "church_in": 14, "radio_room": -12, "study": 12, "church_out": -18, "corkboard": 0}


def build(name):
    reset()
    _mats.clear()
    builder, rect, dens = PLATES[name]
    base_camera()
    named = builder() or []
    yaw = YAW.get(name, 0)
    if yaw:
        piv = bpy.data.objects.new("pivot", None)
        bpy.context.scene.collection.objects.link(piv)
        for o in bpy.data.objects:
            if o.parent is None and o.name not in ("cam", "pivot", "sky", "floor") and o.type != "LIGHT":
                o.parent = piv
        piv.rotation_euler = (0, 0, R(yaw))
    bpy.context.view_layer.update()
    anchors = project(named)
    render_plate(name, rect, dens)
    save_meta(name, rect, anchors)


if __name__ == "__main__":
    names = [a for a in ARGS if a in PLATES] or list(PLATES)
    for n in names:
        build(n)
