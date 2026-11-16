"""E is for Every page: an open Bible on a table, pages turning, warm light rising from it."""
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *  # noqa: E402,F401

start = seq("e is for") - 0.1
LEN = seq("a is for") - 0.1 - start + 1.0
glow_at = seq("all scripture") - start
sc = new_scene("SHOT_bible", LEN)
sc.view_settings.view_transform = "Standard"
sc.view_settings.look = "None"
world((0.02, 0.03, 0.05), 1.0)

# Table and a dim room behind.
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, -0.06))
table = bpy.context.active_object
table.name = "ENV_table"
table.scale = (6, 4, 0.12)
table.data.materials.append(noisy_mat("M_wood", (0.22, 0.12, 0.06), bump=0.25, scale=1.5, rough=0.55, dark=0.55))
bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 6, 4), rotation=(math.radians(90), 0, 0))
wall = bpy.context.active_object
wall.name = "ENV_wall"
wall.data.materials.append(noisy_mat("M_wall", (0.06, 0.07, 0.09), bump=0.2, scale=2))


def page_surface(name, side, lift=0.0, curl=0.0):
    """A gently curved page as a subdivided plane. side=-1 left, +1 right."""
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=24, y_segments=8, size=1)
    for v in bm.verts:
        u = (v.co.x + 1) / 2  # 0 at spine .. 1 at edge
        x = side * u * 1.05
        z = 0.12 + math.sin(u * math.pi) * 0.06 - u * 0.03 + lift + curl * u * u
        v.co = Vector((x, v.co.y * 0.72, z))
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = link(bpy.data.objects.new(name, me))
    for p in o.data.polygons:
        p.use_smooth = True
    return o


paper = mat("M_paper", (0.93, 0.88, 0.76), rough=0.7, emit=(1, 0.9, 0.7), strength=0)
cover = mat("M_cover", (0.25, 0.05, 0.05), rough=0.45)
book = link(bpy.data.objects.new("RIG_book", None))
for side in (-1, 1):
    for k in range(6):
        p = page_surface(f"HERO_page_{side}_{k}", side, lift=-k * 0.012)
        p.data.materials.append(paper)
        p.parent = book
    bpy.ops.mesh.primitive_cube_add(size=1, location=(side * 0.55, 0, 0.03))
    c = bpy.context.active_object
    c.name = f"HERO_cover_{side}"
    c.scale = (1.14, 1.5, 0.04)
    c.data.materials.append(cover)
    c.parent = book

# Text lines on both pages (thin dark strips) that light up gold.
ink = mat("M_ink", (0.15, 0.12, 0.1), rough=0.8, emit=(1, 0.7, 0.2), strength=0)
for side in (-1, 1):
    for r in range(11):
        bpy.ops.mesh.primitive_plane_add(size=1)
        ln = bpy.context.active_object
        ln.name = f"FX_line_{side}_{r}"
        u = 0.55
        ln.location = (side * u, -0.55 + r * 0.105, 0.19 + math.sin(u * math.pi) * 0.06 - 0.03 * u + 0.004)
        ln.scale = (0.72 - (r % 3) * 0.08, 0.018, 1)
        ln.data.materials.append(ink)
        ln.parent = book
key_value(emission_input(ink), [(0, 0), (glow_at - 0.1, 0), (glow_at + 1.2, 3.5), (LEN, 4)])
key_value(emission_input(paper), [(0, 0.0), (glow_at, 0.0), (glow_at + 1.5, 0.1), (LEN, 0.12)])

# Turning pages: three pages lift from the right and fall to the left.
for n in range(3):
    pg = page_surface(f"FX_turn_{n}", 1, lift=0.01, curl=0.05)
    pg.data.materials.append(paper)
    pivot = link(bpy.data.objects.new(f"RIG_turn_{n}", None))
    pivot.parent = book
    pg.parent = pivot
    t0 = 0.3 + n * 0.55
    key_transform(pivot, [(0, None, (0, 0, 0), None), (t0, None, (0, 0, 0), None), (t0 + 0.7, None, (0, -178, 0), None)])

book.rotation_euler = (0, 0, math.radians(-8))
glow = light("LGT_book", "POINT", (0, 0, 0.9), energy=0, color=(1, 0.85, 0.55), size=0.5)
key_light(glow, [(0, 6), (glow_at, 8), (glow_at + 1.4, 45), (LEN, 50)])
light("LGT_key", "SPOT", (1.5, -1.5, 4), (math.radians(30), 0, math.radians(40)), energy=110, color=(1, 0.86, 0.66)).data.spot_size = math.radians(50)
light("LGT_rim", "POINT", (-2.5, 2.5, 1.5), energy=120, color=(0.35, 0.7, 1.0))

cam = camera("CAM_main", (0, -2.6, 2.6), (48, 0, 0), lens=32)
key_transform(cam, [(0, (0.35, -3.6, 3.5), (45, 0, 6), None), (LEN, (-0.1, -2.9, 2.9), (47, 0, -2), None)])

finish("bible", [0.6, glow_at + 1.5, LEN - 0.4])
