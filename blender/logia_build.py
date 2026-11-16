"""LOGIA — master 3D character build (Blender 5.2, run headless or from the Scripting tab).

Built from Ken's materials + proportion guide (face centre Z=3.58, cheek width 1.58, jaw width 1.05, eyes at X=±0.345 Z=3.82,
nose tip Z=3.47, mouth Z=3.105, chin Z=2.83; character faces -Y; metres).

The face is ONE continuous mesh, shaped with falloff 'sculpt brushes' applied to a dense base (eye sockets, brow ridge,
cheekbones, nose, lips, mouth opening, jaw, chin), then smoothed. Hair is spiral curl locks (tapered curves) over a scalp
volume; brows are tapered strokes; beard is a stubble shell plus strands; jacket is a modelled shell with an open front
and a stand-up collar. The rig (armature, shape keys, drivers, actions) is added in rig stage (see RIG section).

Usage:  blender -b --factory-startup -P blender/logia_build.py -- [preview|final]
"""
import math
import os
import random
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
FINAL = "final" in ARGS
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STILLS = os.path.join(ROOT, "out", "stills")
random.seed(42)

for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)
for c in list(bpy.data.collections):
    bpy.data.collections.remove(c)


# ---------------------------------------------------------------------------- materials (Ken's palette)
def make_mat(name, color, rough=.55, metallic=0.0, subsurface=0.0, emit=0.0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bs = m.node_tree.nodes.get("Principled BSDF")
    bs.inputs["Base Color"].default_value = (*color, 1)
    bs.inputs["Roughness"].default_value = rough
    bs.inputs["Metallic"].default_value = metallic
    bs.inputs["Subsurface Weight"].default_value = subsurface
    bs.inputs["Subsurface Radius"].default_value = (1.0, 0.42, 0.25)
    if emit:
        bs.inputs["Emission Color"].default_value = (*color, 1)
        bs.inputs["Emission Strength"].default_value = emit
    return m


M = {
    "skin": make_mat("Skin | warm medium Indian brown", (.49, .235, .145), .5, 0, .12),
    "skin_hi": make_mat("Skin | warm highlight", (.62, .325, .215), .55, 0, .08),
    "skin_shadow": make_mat("Skin | crease shadow", (.28, .105, .065), .8),
    "hair": make_mat("Hair | espresso black", (.012, .009, .009), .5),
    "hair_mid": make_mat("Hair | deep brown", (.03, .02, .018), .45),
    "hair_hi": make_mat("Hair | warm strand glints", (.105, .061, .045), .45),
    "beard": make_mat("Beard | dark brown", (.025, .016, .015), .8),
    "beard_hi": make_mat("Beard | subtle strands", (.095, .055, .041), .82),
    "brow": make_mat("Eyebrows | dark", (.018, .012, .012), .78),
    "eye_white": make_mat("Eyes | warm ivory", (.92, .89, .82), .3),
    "iris": make_mat("Iris | dark chestnut", (.085, .041, .020), .25),
    "pupil": make_mat("Pupils", (.004, .003, .003), .2),
    "cornea": make_mat("Cornea", (1, 1, 1), .02),
    "glasses": make_mat("Glasses | brushed silver", (.52, .56, .60), .23, .9),
    "lens": make_mat("Glasses | lens", (.95, .97, 1.0), .03),
    "mouth": make_mat("Mouth interior", (.075, .006, .014), .82),
    "teeth": make_mat("Teeth | ivory", (.97, .93, .84), .3),
    "tongue": make_mat("Tongue | muted rose", (.56, .105, .15), .48, 0, .1),
    "lip": make_mat("Lip | natural warm", (.47, .19, .13), .5, 0, .12),
    "jacket": make_mat("Jacket | charcoal", (.035, .036, .048), .82),
    "jacket_edge": make_mat("Jacket seam", (.105, .10, .11), .75),
    "shirt": make_mat("T-shirt | warm ivory", (.84, .81, .74), .86),
    "background": make_mat("Backdrop | charcoal plum", (.022, .019, .030), .9),
}
for k in ("cornea", "lens"):
    b = M[k].node_tree.nodes["Principled BSDF"]
    b.inputs["Alpha"].default_value = 0.08 if k == "lens" else 0.15
    try:
        M[k].surface_render_method = "BLENDED"
    except Exception:
        pass


def stubble(name, skin_c, hair_c):
    """Skin with dense fine dark stubble dots (Voronoi), used for the beard shell."""
    m = make_mat(name, skin_c, .75)
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    vor = nt.nodes.new("ShaderNodeTexVoronoi")
    vor.inputs["Scale"].default_value = 420
    mix_noise = nt.nodes.new("ShaderNodeTexNoise")
    mix_noise.inputs["Scale"].default_value = 30
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = (*hair_c, 1)
    ramp.color_ramp.elements[1].position = 0.62
    ramp.color_ramp.elements[1].color = (*hair_c, 0)
    nt.links.new(vor.outputs["Distance"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], b.inputs["Base Color"])
    nt.links.new(ramp.outputs["Alpha"], b.inputs["Alpha"])
    try:
        m.surface_render_method = "DITHERED"
    except Exception:
        pass
    return m


M["stubble"] = stubble("Beard | stubble", (.49, .235, .145), (.02, .013, .012))


# ---------------------------------------------------------------------------- helpers
def link(obj, coll=None):
    (coll or bpy.context.scene.collection).objects.link(obj)
    return obj


def collection(name):
    c = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(c)
    return c


C_HEAD = collection("LOGIA | Head")
C_HAIR = collection("LOGIA | Hair")
C_BODY = collection("LOGIA | Clothing")
C_SET = collection("LOGIA | Studio")


def mesh_obj(name, bm, mat, coll, smooth=True):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = link(bpy.data.objects.new(name, me), coll)
    o.data.materials.append(mat)
    if smooth:
        for p in o.data.polygons:
            p.use_smooth = True
    return o


def tapered_curve(name, pts, r0, r1, mat, coll, res=4, cyclic=False):
    """A bezier tube that tapers from r0 to r1 (for brows, curls, beard strands, moustache)."""
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = 1.0
    cu.bevel_resolution = res
    cu.use_fill_caps = True
    sp = cu.splines.new("BEZIER")
    sp.bezier_points.add(len(pts) - 1)
    n = len(pts)
    for i, (bp, p) in enumerate(zip(sp.bezier_points, pts)):
        bp.co = p
        bp.handle_left_type = bp.handle_right_type = "AUTO"
        u = i / max(1, n - 1)
        bp.radius = r0 + (r1 - r0) * u
    sp.use_cyclic_u = cyclic
    o = link(bpy.data.objects.new(name, cu), coll)
    cu.materials.append(mat)
    return o


def falloff(d, r):
    """Smooth sculpt-brush falloff: 1 at the centre, 0 at radius r."""
    if d >= r:
        return 0.0
    x = d / r
    return (1 - x * x) ** 2


def brush(bm, centre, radii, offset, strength=1.0):
    """Moves vertices near 'centre' (ellipsoidal radii) by 'offset' scaled by falloff — a sculpt Grab brush."""
    c = Vector(centre)
    off = Vector(offset)
    for v in bm.verts:
        d = Vector(((v.co.x - c.x) / radii[0], (v.co.y - c.y) / radii[1], (v.co.z - c.z) / radii[2])).length
        w = falloff(d, 1.0) * strength
        if w > 0:
            v.co += off * w


def inflate(bm, centre, radii, amount):
    """Pushes vertices outward from the head's centre axis near 'centre' — a sculpt Inflate brush."""
    c = Vector(centre)
    for v in bm.verts:
        d = Vector(((v.co.x - c.x) / radii[0], (v.co.y - c.y) / radii[1], (v.co.z - c.z) / radii[2])).length
        w = falloff(d, 1.0)
        if w > 0:
            n = Vector((v.co.x, v.co.y, 0)).normalized()
            v.co += n * amount * w


# ---------------------------------------------------------------------------- HEAD (one sculpted mesh)
FACE_Z, EYE_X, EYE_Z, NOSE_Z, MOUTH_Z, CHIN_Z = 3.58, .345, 3.82, 3.47, 3.105, 2.83


def build_head():
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=128, v_segments=80, radius=1.0)
    for v in bm.verts:
        x, y, z = v.co
        # Base egg: taller than wide, flatter at the back of the face.
        v.co = Vector((x * .84, y * .70, z * .88 + 3.6))
    for v in bm.verts:
        z = v.co.z
        # Jaw taper: narrow toward the chin (cheek width 1.58 -> jaw 1.05 -> soft rounded chin).
        if z < 3.45:
            t = min(1.0, (3.45 - z) / (3.45 - CHIN_Z))
            v.co.x *= 1 - .36 * t ** 1.3
            v.co.y *= 1 - .18 * t ** 1.5
        # Flatten the back of the skull a touch, round the crown.
        if v.co.y > .2:
            v.co.y *= .95
    # Face plane: bring the front of the face slightly forward and flatter.
    brush(bm, (0, -.7, 3.55), (.75, .5, .8), (0, -.05, 0))
    # Brow ridge and forehead.
    for s in (-1, 1):
        brush(bm, (s * .33, -.62, 4.04), (.3, .2, .14), (0, -.045, .0))
    # Eye sockets (push in), cheekbones (out), temples (in).
    for s in (-1, 1):
        brush(bm, (s * EYE_X, -.62, EYE_Z), (.24, .22, .16), (0, .09, 0))
        brush(bm, (s * .52, -.5, 3.56), (.24, .25, .2), (s * .03, -.05, 0))
        brush(bm, (s * .72, -.15, 3.95), (.2, .3, .25), (-s * .03, 0, 0))
    # Nose: bridge then a rounded tip pulled out of the face, nostril wings.
    brush(bm, (0, -.66, 3.68), (.09, .2, .17), (0, -.1, 0))
    brush(bm, (0, -.68, NOSE_Z), (.15, .25, .13), (0, -.24, -.01))
    brush(bm, (0, -.86, NOSE_Z + .02), (.11, .12, .09), (0, -.06, .0))
    for s in (-1, 1):
        brush(bm, (s * .12, -.72, NOSE_Z - .02), (.08, .14, .07), (s * .03, -.07, 0))
    # Philtrum, upper and lower lips, mouth corners, chin.
    brush(bm, (0, -.66, 3.25), (.12, .2, .08), (0, -.02, 0))
    brush(bm, (0, -.66, MOUTH_Z + .055), (.26, .2, .05), (0, -.05, 0))
    brush(bm, (0, -.64, MOUTH_Z - .06), (.22, .2, .055), (0, -.055, 0))
    for s in (-1, 1):
        brush(bm, (s * .29, -.6, MOUTH_Z + .01), (.07, .2, .07), (0, .03, .01))
    brush(bm, (0, -.55, 2.93), (.24, .25, .12), (0, -.07, -.02))
    # Mouth opening: a slit along the lip line, its rim turned inward to give the lips thickness.
    slit = [f for f in bm.faces if abs(f.calc_center_median().x) < .27 * math.sqrt(max(0, 1 - ((f.calc_center_median().z - MOUTH_Z) / .03) ** 2)) and abs(f.calc_center_median().z - MOUTH_Z) < .03 and f.calc_center_median().y < -.3]
    edges_before = set()
    bmesh.ops.delete(bm, geom=slit, context="FACES")
    rim = [e for e in bm.edges if e.is_boundary]
    ext = bmesh.ops.extrude_edge_only(bm, edges=rim)
    new_verts = [g for g in ext["geom"] if isinstance(g, bmesh.types.BMVert)]
    for v in new_verts:
        v.co.y += .09
        v.co.z += (MOUTH_Z - v.co.z) * .3
    o = mesh_obj("LOGIA | Face (sculpted)", bm, M["skin"], C_HEAD)
    sub = o.modifiers.new("Subdivision", "SUBSURF")
    sub.levels = 1
    sub.render_levels = 2
    sm = o.modifiers.new("Relax", "CORRECTIVE_SMOOTH")
    sm.factor = .5
    sm.iterations = 4
    return o


face = build_head()

# Neck: a tapered tube merging under the jaw.
bm = bmesh.new()
bmesh.ops.create_cone(bm, cap_ends=False, segments=48, radius1=.4, radius2=.35, depth=.8)
for v in bm.verts:
    v.co.z += 2.75
    v.co.y += .05
neck = mesh_obj("LOGIA | Neck", bm, M["skin"], C_HEAD)
neck.modifiers.new("Subdivision", "SUBSURF").levels = 1

# Ears: a flattened shell with a rim, an inner bowl and a lobe.
for s in (-1, 1):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=20, radius=1.0)
    for v in bm.verts:
        x, y, z = v.co
        z2 = z * .31
        v.co = Vector((x * .1 + s * (.82 + .05 * (1 - abs(z))), y * .17 + .02, z2 + 3.62))
    brush(bm, (s * .86, -.03, 3.64), (.06, .12, .18), (s * -.035, 0, 0))   # inner bowl
    brush(bm, (s * .82, 0, 3.36), (.06, .08, .07), (0, -.01, -.03))       # lobe
    ear = mesh_obj(f"LOGIA | Ear {'L' if s > 0 else 'R'}", bm, M["skin"], C_HEAD)
    ear.modifiers.new("Subdivision", "SUBSURF").levels = 1
    ear.rotation_euler = (0, 0, math.radians(-14 * s))

# Eyes: sclera, iris disc, pupil, cornea bulge; eyelids as partial shells that can rotate to blink.
EYE_PARTS = {}
for s, side in ((1, "L"), (-1, "R")):
    cx, cy, cz = s * EYE_X, -.56, EYE_Z
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=48, v_segments=32, radius=.165)
    for v in bm.verts:
        v.co = Vector((v.co.x * 1.18, v.co.y, v.co.z * .95)) + Vector((cx, cy, cz))
    eye = mesh_obj(f"LOGIA | Eye {side}", bm, M["eye_white"], C_HEAD)
    bm = bmesh.new()
    bmesh.ops.create_circle(bm, cap_ends=True, segments=48, radius=.072)
    for v in bm.verts:
        v.co = Vector((v.co.x + cx + .012, cy - .16, v.co.y * 1.05 + cz - .01))
    iris = mesh_obj(f"LOGIA | Iris {side}", bm, M["iris"], C_HEAD)
    bm = bmesh.new()
    bmesh.ops.create_circle(bm, cap_ends=True, segments=32, radius=.034)
    for v in bm.verts:
        v.co = Vector((v.co.x + cx + .014, cy - .165, v.co.y * 1.05 + cz - .01))
    pupil = mesh_obj(f"LOGIA | Pupil {side}", bm, M["pupil"], C_HEAD)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=.012, location=(cx - .02, cy - .172, cz + .035))
    glint = bpy.context.object
    glint.name = f"LOGIA | Catchlight {side}"
    glint.data.materials.append(make_mat("Catchlight", (1, 1, 1), .1, emit=4))
    # Upper lid: the top cap of a slightly larger sphere, pivoting about the eye centre for blinks.
    pivot = link(bpy.data.objects.new(f"LOGIA | Lid pivot {side}", None), C_HEAD)
    pivot.location = (cx, cy, cz)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=48, v_segments=32, radius=.178)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -.02 or v.co.y > .08], context="VERTS")
    for v in bm.verts:
        v.co = Vector((v.co.x * 1.2, v.co.y, v.co.z))
    lid = mesh_obj(f"LOGIA | Upper lid {side}", bm, M["skin"], C_HEAD)
    lid.parent = pivot
    lid.modifiers.new("Thickness", "SOLIDIFY").thickness = .012
    pivot.rotation_euler = (math.radians(-12), 0, 0)  # relaxed, half-lidded rest like the reference
    # Lash line along the lid edge.
    pts = [Vector((math.cos(a) * .2, -math.sin(a) * .17, -.0)) for a in [math.radians(x) for x in range(20, 161, 20)]]
    lash = tapered_curve(f"LOGIA | Lash line {side}", [(p.x, p.y, p.z) for p in pts], .008, .008, M["brow"], C_HEAD)
    lash.parent = pivot
    # Lower lid crease.
    tapered_curve(f"LOGIA | Lower lid {side}", [(cx - .17, cy - .1, cz - .1), (cx, cy - .15, cz - .14), (cx + .17, cy - .1, cz - .1)], .006, .006, M["skin_shadow"], C_HEAD)
    EYE_PARTS[side] = dict(eye=eye, iris=iris, pupil=pupil, pivot=pivot, lid=lid)

# Eyebrows: thick, tapered, arched strokes (Ken's "thick expressive eyebrow" path).
for s, side in ((1, "L"), (-1, "R")):
    x = s * EYE_X
    pts = [(x - s * .27, -.66, 4.06), (x - s * .12, -.72, 4.13), (x + s * .08, -.72, 4.13), (x + s * .27, -.64, 4.06)]
    if s < 0:
        pts = list(reversed(pts))
    tapered_curve(f"LOGIA | Eyebrow {side}", pts, .055, .022, M["brow"], C_HEAD)

# Mouth interior: a dark cavity behind the lips, upper teeth arc, tongue.
bm = bmesh.new()
bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=20, radius=1)
for v in bm.verts:
    v.co = Vector((v.co.x * .27, v.co.y * .14 - .47, v.co.z * .12 + MOUTH_Z - .02))
mesh_obj("LOGIA | Mouth cavity", bm, M["mouth"], C_HEAD)
bm = bmesh.new()
bmesh.ops.create_uvsphere(bm, u_segments=40, v_segments=12, radius=1)
bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.y > .3], context="VERTS")
for v in bm.verts:
    v.co = Vector((v.co.x * .22, v.co.y * .09 - .53, v.co.z * .035 + MOUTH_Z + .015))
mesh_obj("LOGIA | Upper teeth", bm, M["teeth"], C_HEAD)
bm = bmesh.new()
bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=12, radius=1)
for v in bm.verts:
    v.co = Vector((v.co.x * .14, v.co.y * .12 - .5, v.co.z * .035 + MOUTH_Z - .05))
mesh_obj("LOGIA | Tongue", bm, M["tongue"], C_HEAD)

# ---------------------------------------------------------------------------- GLASSES
def rrect(cx, cz, w, h, r, y, n=6):
    pts = []
    for (x, z, a0) in [(cx + w / 2 - r, cz + h / 2 - r, 0), (cx - w / 2 + r, cz + h / 2 - r, 90), (cx - w / 2 + r, cz - h / 2 + r, 180), (cx + w / 2 - r, cz - h / 2 + r, 270)]:
        for i in range(n + 1):
            a = math.radians(a0 + 90 * i / n)
            pts.append((x + math.cos(a) * r, y - .02 * abs(math.cos(a)), z + math.sin(a) * r))
    return pts


for s, side in ((1, "L"), (-1, "R")):
    cx = s * EYE_X
    cu = bpy.data.curves.new(f"Glasses rim {side}", "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = .016
    cu.bevel_resolution = 3
    sp = cu.splines.new("POLY")
    pts = rrect(cx, EYE_Z - .02, .58, .38, .07, -.785)
    sp.points.add(len(pts) - 1)
    for p, c in zip(sp.points, pts):
        p.co = (*c, 1)
    sp.use_cyclic_u = True
    o = link(bpy.data.objects.new(f"LOGIA | Glasses rim {side}", cu), C_HEAD)
    cu.materials.append(M["glasses"])
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=1)
    for v in bm.verts:
        v.co = Vector((v.co.x * .27 + cx, -.78, v.co.y * .17 + EYE_Z - .02))
    mesh_obj(f"LOGIA | Glasses lens {side}", bm, M["lens"], C_HEAD)
    tapered_curve(f"LOGIA | Glasses arm {side}", [(cx + s * .29, -.775, EYE_Z + .08), (s * .8, -.45, EYE_Z + .08), (s * .87, -.05, EYE_Z + .0), (s * .86, .12, EYE_Z - .12)], .013, .013, M["glasses"], C_HEAD)
tapered_curve("LOGIA | Glasses bridge", [(-.06, -.8, EYE_Z + .06), (0, -.82, EYE_Z + .085), (.06, -.8, EYE_Z + .06)], .015, .015, M["glasses"], C_HEAD)

# ---------------------------------------------------------------------------- BEARD + MOUSTACHE
# Stubble shell: the lower face region of the sculpted face, offset outward, with the stubble material.
fbm = bmesh.new()
fbm.from_mesh(face.data)
keep = []
for v in fbm.verts:
    x, y, z = v.co
    in_beard = (z < 3.3 and y < .25) and not (abs(x) < .3 and MOUTH_Z - .09 < z < 3.3 and y < -.4)
    in_burns = (abs(x) > .58 and 3.3 <= z < 3.72 and -.35 < y < .2)
    if not (in_beard or in_burns) or z < 2.78:
        keep.append(v)
bmesh.ops.delete(fbm, geom=keep, context="VERTS")
fbm.normal_update()
for v in fbm.verts:
    v.co += v.normal * .014
beard = mesh_obj("LOGIA | Beard stubble", fbm, M["stubble"], C_HEAD)
beard.modifiers.new("Subdivision", "SUBSURF").levels = 1
# Short beard strands along the jawline for a soft edge.
for i in range(0):
    a = random.uniform(-1, 1)
    x = a * .52
    z = 2.86 + .28 * abs(a) ** 1.6 + random.uniform(-.03, .05)
    y = -.48 + .3 * abs(a) ** 2
    d = Vector((x * .1, -.03, -.06)).normalized() * random.uniform(.04, .07)
    tapered_curve("LOGIA | Beard strand", [(x, y, z), (x + d.x, y + d.y, z + d.z)], .006, .002, M["beard_hi"] if i % 6 == 0 else M["beard"], C_HEAD, res=1)
# Chin patch under the lower lip.
tapered_curve("LOGIA | Soul patch", [(-.04, -.69, MOUTH_Z - .13), (0, -.7, MOUTH_Z - .17), (.04, -.69, MOUTH_Z - .13)], .03, .03, M["beard"], C_HEAD)
# Moustache: two thick, gently swept lobes meeting under the nose.
for s in (-1, 1):
    tapered_curve(f"LOGIA | Moustache {'L' if s > 0 else 'R'}", [(s * .015, -.8, 3.25), (s * .11, -.79, 3.24), (s * .22, -.74, 3.21), (s * .32, -.66, 3.15)], .062, .026, M["beard"], C_HEAD)

# ---------------------------------------------------------------------------- HAIR
# Scalp volume under the curls, then spiral curl locks over the crown and sides, a few swept over the forehead.
bm = bmesh.new()
bmesh.ops.create_uvsphere(bm, u_segments=64, v_segments=40, radius=1)
bmesh.ops.delete(bm, geom=[v for v in bm.verts if (v.co.z < -.35 and v.co.y < .3) or v.co.z < -.75 or (v.co.y < -.55 and v.co.z < .45)], context="VERTS")
for v in bm.verts:
    v.co = Vector((v.co.x * .88, v.co.y * .78 + .05, v.co.z * .66 + 3.82))
scalp = mesh_obj("LOGIA | Hair volume", bm, M["hair"], C_HAIR)


def curl_lock(i, root, normal, length, radius, turns, thick):
    """A spiral ringlet: a helix around a path that leaves the scalp along its normal and sweeps back."""
    n = Vector(normal).normalized()
    side = n.cross(Vector((0, 0, 1)))
    if side.length < 1e-3:
        side = Vector((1, 0, 0))
    side.normalize()
    up = side.cross(n).normalized()
    pts = []
    steps = 16
    sweep = Vector((0, .25, -.15))
    for k in range(steps + 1):
        u = k / steps
        a = u * turns * 2 * math.pi + i
        r = radius * (1 - .35 * u)
        p = Vector(root) + n * (length * u) + sweep * (length * u * u) + side * (math.cos(a) * r) + up * (math.sin(a) * r)
        pts.append(tuple(p))
    mat = M["hair_mid"] if i % 6 == 0 else M["hair"]
    return tapered_curve(f"LOGIA | Curl {i:03d}", pts, thick, thick * .45, mat, C_HAIR, res=3)


k = 0
for ring, (count, elev) in enumerate([(22, -.18), (24, .05), (24, .26), (22, .46), (16, .64), (10, .8), (4, .94)]):
    for j in range(count):
        az = (j / count) * 2 * math.pi + ring * .37
        ce = math.cos(elev * math.pi / 2)
        root = Vector((math.cos(az) * ce * .82, math.sin(az) * ce * .72 + .04, math.sin(elev * math.pi / 2) * .58 + 3.98))
        front = math.sin(az) < -.55
        if front and elev < .3:
            continue  # keep the forehead clear except for the fringe below
        normal = (root - Vector((0, .05, 3.7)))
        curl_lock(k, root, normal, random.uniform(.16, .22) * (0.6 if abs(math.cos(az)) > .75 and elev < .3 else 1.0), random.uniform(.13, .17), random.uniform(.85, 1.15), random.uniform(.08, .1))
        k += 1
# Fringe: a few locks falling forward over the forehead hairline.
for j, x in enumerate((-.42, -.24, -.06, .12, .3, .46)):
    root = Vector((x, -.5, 4.24 - abs(x) * .2))
    curl_lock(k, root, (x * .4, -.7, .55), .22, .075, 1.5, .05)
    k += 1

# ---------------------------------------------------------------------------- CLOTHING
# Torso: a lathed jacket body with shoulders, open at the front over the tee.
bm = bmesh.new()
prof = [(.0, .62), (.25, .78), (.6, 1.02), (.85, 1.05), (1.15, .98), (1.45, .78), (1.7, .5), (1.8, .44)]
segs = 64
rings = []
for (z, r) in prof:
    ring = []
    for i in range(segs):
        a = 2 * math.pi * i / segs
        ring.append(bm.verts.new((math.cos(a) * r * 1.12, math.sin(a) * r * .62 + .08, z + .78)))
    rings.append(ring)
for a, b_ in zip(rings, rings[1:]):
    for i in range(segs):
        j = (i + 1) % segs
        bm.faces.new((a[i], a[j], b_[j], b_[i]))
# Open the front (around -Y, angle 270°) from the chest up.
front = [f for f in bm.faces if f.calc_center_median().y < -.35 and abs(f.calc_center_median().x) < .2 and f.calc_center_median().z > 1.35]
bmesh.ops.delete(bm, geom=front, context="FACES")
jacket = mesh_obj("LOGIA | Jacket", bm, M["jacket"], C_BODY)
jacket.modifiers.new("Thickness", "SOLIDIFY").thickness = .05
jacket.modifiers.new("Subdivision", "SUBSURF").levels = 2
# Stand-up collar: a band around the neck, open at the front.
bm = bmesh.new()
for i in range(41):
    a = math.radians(-60 + 300 * i / 40) - math.pi / 2 + math.radians(30)
    for h, rr in ((0, .52), (.42, .48)):
        bm.verts.new((math.cos(a) * rr, math.sin(a) * rr * .88 + .04, 2.42 + h))
bm.verts.ensure_lookup_table()
for i in range(40):
    v = bm.verts
    bm.faces.new((v[2 * i], v[2 * i + 2], v[2 * i + 3], v[2 * i + 1]))
collar = mesh_obj("LOGIA | Jacket collar", bm, M["jacket"], C_BODY)
collar.modifiers.new("Thickness", "SOLIDIFY").thickness = .06
collar.modifiers.new("Subdivision", "SUBSURF").levels = 2
# Zip edges.
for s in (-1, 1):
    tapered_curve(f"LOGIA | Zip edge {'L' if s > 0 else 'R'}", [(s * .19, -.66, 1.45), (s * .2, -.66, 2.0), (s * .23, -.52, 2.42), (s * .2, -.46, 2.82)], .012, .012, M["jacket_edge"], C_BODY)
# Tee: chest panel with a crew neck.
bm = bmesh.new()
bmesh.ops.create_uvsphere(bm, u_segments=48, v_segments=24, radius=1)
for v in bm.verts:
    v.co = Vector((v.co.x * .34, v.co.y * .07 - .44, v.co.z * .5 + 2.15))
mesh_obj("LOGIA | T-shirt", bm, M["shirt"], C_BODY)
bpy.ops.mesh.primitive_torus_add(major_radius=.33, minor_radius=.04, location=(0, -.12, 2.62), rotation=(math.radians(14), 0, 0))
tee_neck = bpy.context.object
tee_neck.name = "LOGIA | T-shirt neckband"
tee_neck.scale = (1, .85, 1)
tee_neck.data.materials.append(M["shirt"])

# ---------------------------------------------------------------------------- STUDIO
bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 3.2, 2.5), rotation=(math.radians(90), 0, 0))
bg = bpy.context.object
bg.name = "LOGIA | Backdrop"
bg.data.materials.append(M["background"])
for o in (bg,):
    for c in o.users_collection:
        c.objects.unlink(o)
    C_SET.objects.link(o)


def area_light(name, location, energy, size, color, target=(0, 0, 3.4)):
    ld = bpy.data.lights.new(name, "AREA")
    ld.energy = energy
    ld.shape = "DISK"
    ld.size = size
    ld.color = color
    o = link(bpy.data.objects.new(name, ld), C_SET)
    o.location = location
    o.rotation_euler = (Vector(target) - Vector(location)).to_track_quat("-Z", "Y").to_euler()
    return o


area_light("KEY | warm large softbox", (-4, -5, 7), 1100, 4.5, (1.0, .8, .62))
area_light("FILL | cool softbox", (4.5, -4, 4), 450, 4.0, (.72, .82, 1.0))
area_light("RIM | warm hair separation", (1.5, 3, 6), 900, 3.0, (1.0, .78, .62), (0, 0, 4.2))
area_light("RIM | cool left edge", (-3.5, 2.5, 4.5), 700, 2.5, (.6, .7, 1.0), (0, 0, 3.5))

sc = bpy.context.scene
sc.render.engine = "BLENDER_EEVEE"
sc.render.resolution_x = 1200
sc.render.resolution_y = 1200
sc.render.resolution_percentage = 100 if FINAL else 50
sc.eevee.taa_render_samples = 48 if FINAL else 16
sc.view_settings.view_transform = "AgX"
try:
    sc.view_settings.look = "AgX - Medium High Contrast"
except Exception:
    pass
world = bpy.data.worlds.new("LOGIA studio")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (.01, .008, .015, 1)
sc.world = world


def cam(name, loc, target, ortho=None, lens=85):
    cd = bpy.data.cameras.new(name)
    o = link(bpy.data.objects.new(name, cd), C_SET)
    o.location = loc
    o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    if ortho:
        cd.type = "ORTHO"
        cd.ortho_scale = ortho
    else:
        cd.lens = lens
    return o


CAMS = {
    "hero": cam("CAMERA | Hero 3/4", (3.4, -8.6, 3.55), (0, 0, 3.25), lens=85),
    "front": cam("CAMERA | Front", (0, -10.8, 3.3), (0, 0, 3.3), ortho=4.6),
    "side": cam("CAMERA | Side", (10.8, 0, 3.3), (0, 0, 3.3), ortho=4.6),
}


def render(cam_key, name):
    sc.camera = CAMS[cam_key]
    sc.render.filepath = os.path.join(STILLS, name + ".png")
    sc.render.image_settings.file_format = "PNG"
    bpy.ops.render.render(write_still=True)
    print("RENDERED", sc.render.filepath)


if __name__ == "__main__" or True:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "blender", "Logia_Master.blend"))
    render("hero", "logia-hero")
    render("front", "logia-front")
    render("side", "logia-side")
