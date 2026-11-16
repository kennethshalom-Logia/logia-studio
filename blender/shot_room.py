"""Hook: a dark bedroom at night. Only a phone glows at first; moonlight fills the room on 'Because'."""
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *  # noqa: E402,F401

LEN = seq("but what if") - 0.2 + 1.0
because = seq("because")
sc = new_scene("SHOT_room", LEN)
sc.view_settings.view_transform = "Standard"
sc.view_settings.look = "None"
world((0.01, 0.012, 0.025), 1.0)

wall_m = noisy_mat("M_wall", (0.16, 0.18, 0.26), bump=0.15, scale=3, rough=0.8)
floor_m = noisy_mat("M_floor", (0.16, 0.1, 0.06), bump=0.2, scale=2, rough=0.5)

# Floor and walls; the back wall has a window opening.
bpy.ops.mesh.primitive_plane_add(size=12)
bpy.context.active_object.data.materials.append(floor_m)
bm = bmesh.new()
bmesh.ops.create_grid(bm, x_segments=60, y_segments=40, size=1)
for v in bm.verts:
    v.co = Vector((v.co.x * 5, 2.6, (v.co.y + 1) * 1.6))
win = (-0.2, 1.75, 1.7, 1.5)  # centre x, centre z, width, height
bmesh.ops.delete(bm, geom=[f for f in bm.faces if abs(f.calc_center_median().x - win[0]) < win[2] / 2 and abs(f.calc_center_median().z - win[1]) < win[3] / 2], context="FACES")
me = bpy.data.meshes.new("backwall")
bm.to_mesh(me)
bm.free()
bw = link(bpy.data.objects.new("ENV_backwall", me))
bw.modifiers.new("t", "SOLIDIFY").thickness = 0.15
bw.data.materials.append(wall_m)
bpy.ops.mesh.primitive_plane_add(size=6, location=(-3.2, 0, 1.6), rotation=(0, math.radians(90), 0))
bpy.context.active_object.data.materials.append(wall_m)

# Window frame and the night outside with a moon.
frame_m = mat("M_frame", (0.05, 0.06, 0.09), rough=0.6)
for (sx, sz, x, z) in [(1.8, 0.08, win[0], win[1] + 0.75), (1.8, 0.08, win[0], win[1] - 0.75), (0.08, 1.58, win[0] - 0.86, win[1]),
                       (0.08, 1.58, win[0] + 0.86, win[1]), (0.05, 1.5, win[0], win[1]), (1.7, 0.05, win[0], win[1])]:
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, 2.56, z))
    f = bpy.context.active_object
    f.scale = (sx, 0.1, sz)
    f.data.materials.append(frame_m)
bpy.ops.mesh.primitive_cube_add(size=1, location=(win[0], 2.35, win[1] - 0.82))
sill = bpy.context.active_object
sill.scale = (2.0, 0.4, 0.06)
sill.data.materials.append(frame_m)
gradient_backdrop("ENV_night", (0.05, 0.09, 0.2), (0.01, 0.02, 0.06), (0, 12, 3), size=(30, 20), strength=3.0)
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.45, location=(1.4, 11.5, 4.2))
moon = bpy.context.active_object
moon.data.materials.append(mat("M_moon", (0.9, 0.93, 1), emit=(0.85, 0.9, 1), strength=6))

# Moonlight through the window, rising on "Because".
moonlight = light("LGT_moon", "SPOT", (1.2, 6, 4.2), (math.radians(-62), 0, math.radians(165)), energy=0, color=(0.6, 0.72, 1.0), size=0.1)
moonlight.data.spot_size = math.radians(40)
key_light(moonlight, [(0, 0), (0.6, 150), (because, 600), (because + 1.4, 4200), (LEN, 4500)])
amb = light("LGT_amb", "POINT", (0, -1.5, 2.5), energy=0, color=(0.45, 0.55, 1))
key_light(amb, [(0, 0), (because, 20), (because + 1.4, 160), (LEN, 170)])

# Bed against the left wall.
def box(name, loc, scl, m, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = scl
    if bevel:
        bv = o.modifiers.new("b", "BEVEL")
        bv.width = bevel
        bv.segments = 4
    o.data.materials.append(m)
    return o

box("HERO_bed_base", (-2.0, 0.6, 0.22), (2.1, 3.4, 0.44), mat("M_bedwood", (0.12, 0.07, 0.04), rough=0.6), 0.03)
box("HERO_mattress", (-2.0, 0.6, 0.55), (2.0, 3.3, 0.3), mat("M_sheet", (0.75, 0.78, 0.85), rough=0.9), 0.12)
box("HERO_blanket", (-2.0, 0.1, 0.68), (2.06, 2.0, 0.12), mat("M_blanket", (0.15, 0.2, 0.42), rough=0.95), 0.06)
box("HERO_pillow", (-2.0, 1.9, 0.78), (1.3, 0.55, 0.18), mat("M_pillow", (0.85, 0.87, 0.92), rough=0.9), 0.08)
# Nightstand with the phone that is the only light at first.
box("HERO_stand", (-0.55, 1.7, 0.3), (0.6, 0.5, 0.6), mat("M_stand", (0.1, 0.06, 0.04), rough=0.5), 0.02)
box("HERO_phone", (-0.55, 1.62, 0.61), (0.16, 0.3, 0.015), mat("M_phone", (0.02, 0.02, 0.03), rough=0.3), 0.01)
scr = box("FX_screen", (-0.55, 1.62, 0.62), (0.14, 0.27, 0.004), mat("M_screen", (0.3, 0.7, 1), emit=(0.35, 0.75, 1), strength=6))
phone_light = light("LGT_phone", "POINT", (-0.55, 1.5, 0.9), energy=25, color=(0.4, 0.75, 1), size=0.1)

cam = camera("CAM_main", (0.4, -4.6, 1.4), (84, 0, 8), lens=30)
key_transform(cam, [(0, (0.6, -4.9, 1.35), (84, 0, 9), None), (LEN, (0.15, -3.7, 1.45), (83, 0, 5), None)])

finish("room", [0.3, because + 1.6, LEN - 0.3])
