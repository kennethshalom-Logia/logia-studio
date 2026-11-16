"""'Here's how you HEAR Him': four glowing blocks drop in one by one and flare on HEAR."""
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *  # noqa: E402,F401

start = seq("here's how") - 0.15
LEN = seq("h is for") - 0.1 - start + 1.0
hear = seq("hear him") - start
sc = new_scene("SHOT_tiles", LEN)
sc.view_settings.view_transform = "Standard"
sc.view_settings.look = "None"
world((0.012, 0.01, 0.025), 1.0)

bpy.ops.mesh.primitive_plane_add(size=40)
floor = bpy.context.active_object
floor.name = "ENV_floor"
floor.data.materials.append(mat("M_floor", (0.01, 0.01, 0.016), rough=0.15, metal=0.4))

COLORS = {"H": (1.0, 0.70, 0.18), "E": (0.15, 0.78, 1.0), "A": (1.0, 0.26, 0.45), "R": (0.62, 0.42, 1.0)}
POS = {"H": (-0.72, 2.05), "E": (0.72, 2.05), "A": (-0.72, 0.62), "R": (0.72, 0.62)}
block_mat = mat("M_block", (0.012, 0.014, 0.03), rough=0.42)
for i, L in enumerate("HEAR"):
    x, z = POS[L]
    root = link(bpy.data.objects.new("RIG_" + L, None))
    bpy.ops.mesh.primitive_cube_add(size=1)
    b = bpy.context.active_object
    b.name = "HERO_block_" + L
    b.scale = (1.1, 0.5, 1.1)
    bev = b.modifiers.new("bev", "BEVEL")
    bev.width = 0.12
    bev.segments = 5
    b.data.materials.append(block_mat)
    b.parent = root
    bpy.ops.mesh.primitive_plane_add(size=1, rotation=(math.radians(90), 0, 0))
    rim = bpy.context.active_object
    rim.name = "FX_rim_" + L
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
    cu.bevel_depth = 0.008
    t = link(bpy.data.objects.new("HERO_letter_" + L, cu))
    t.location = (0, -0.29, 0)
    t.rotation_euler = (math.radians(90), 0, 0)
    lm = mat("M_letter_" + L, COLORS[L], emit=COLORS[L], strength=0)
    t.data.materials.append(lm)
    t.parent = root
    g = light("LGT_glow_" + L, "POINT", (0, 0.7, 0), energy=0, color=COLORS[L])
    g.parent = root
    # Drop in with a little overshoot, each on its own beat.
    t0 = 0.35 + i * 0.32
    key_transform(root, [
        (0, (x * 1.6, 9, z + 0.6), (-35, 0, 40 * (1 if x > 0 else -1)), 0.2),
        (t0, (x * 1.6, 9, z + 0.6), (-35, 0, 40 * (1 if x > 0 else -1)), 0.2),
        (t0 + 0.45, (x, -0.15, z), (4, 0, -3 * (1 if x > 0 else -1)), 1.05),
        (t0 + 0.7, (x, 0, z), (0, 0, 0), 1.0),
    ])
    flare = hear
    key_value(emission_input(lm), [(t0, 0), (t0 + 0.45, 1.8), (flare, 1.8), (flare + 0.25, 4.5), (flare + 1.0, 2.0)])
    key_value(emission_input(rm), [(t0, 0), (t0 + 0.5, 1.2), (flare, 1.2), (flare + 0.25, 3.5), (flare + 1.0, 1.4)])
    key_light(g, [(t0, 0), (t0 + 0.5, 40), (flare, 40), (flare + 0.25, 120), (flare + 1.0, 50)])

light("LGT_key", "SPOT", (2.5, -4, 5), (math.radians(45), 0, math.radians(30)), energy=250, color=(1, 0.92, 0.85))
light("LGT_fill", "POINT", (-3, -3, 2), energy=80, color=(0.5, 0.6, 1))

cam = camera("CAM_main", (0.0, -6.8, 1.0), (88, 0, 0), lens=36)
key_transform(cam, [(0, (0.5, -7.4, 1.3), (89, 0, 4), None), (LEN, (-0.2, -6.2, 1.45), (88, 0, -1.5), None)])

finish("tiles", [0.5, hear + 0.3, LEN - 0.5])
