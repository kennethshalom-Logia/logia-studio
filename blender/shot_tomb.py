"""H is for History: the stone rolls away from the tomb at sunrise and light pours out."""
import math
import os
import random
import sys

import bmesh
import bpy
from mathutils import noise, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *  # noqa: E402,F401

start = seq("h is for") - 0.1
LEN = seq("dead sea") - 0.2 - start + 1.0
sc = new_scene("SHOT_tomb", LEN)
random.seed(4)

# Sky: dawn gradient behind everything, plus a low sun.
gradient_backdrop("ENV_sky", (1.0, 0.5, 0.18), (0.05, 0.03, 0.12), (0, 45, 14), size=(140, 70), strength=1.2)
world((0.85, 0.5, 0.32), 0.12)
bpy.context.scene.view_settings.view_transform = "Standard"
bpy.context.scene.view_settings.look = "None"
bpy.ops.mesh.primitive_uv_sphere_add(radius=2.6, location=(6.5, 42, 7.5))
sun = bpy.context.active_object
sun.name = "FX_sun"
sun.data.materials.append(mat("M_sun", (1, 0.85, 0.6), emit=(1, 0.86, 0.6), strength=30))

# Ground with a slight rise toward the hill.
bpy.ops.mesh.primitive_grid_add(x_subdivisions=80, y_subdivisions=80, size=60)
ground = bpy.context.active_object
ground.name = "ENV_ground"
for v in ground.data.vertices:
    v.co.z = noise.noise(Vector((v.co.x * 0.25, v.co.y * 0.25, 0))) * 0.25 + max(0, v.co.y - 3) * 0.12
ground.data.materials.append(noisy_mat("M_ground", (0.42, 0.29, 0.18), bump=0.5, scale=7))
ground.modifiers.new("smooth", "SUBSURF").levels = 1

# Rock face: a displaced grid with an arched doorway removed, given thickness.
bm = bmesh.new()
bmesh.ops.create_grid(bm, x_segments=90, y_segments=60, size=1)
W, Hh = 11.0, 7.0
door_x, door_w, door_h = -0.9, 1.9, 2.5
for v in bm.verts:
    x, y = v.co.x * W / 2, (v.co.y + 1) * Hh / 2
    n = noise.noise(Vector((x * 0.55, y * 0.55, 1.3))) * 0.5 + noise.noise(Vector((x * 2.1, y * 2.1, 7))) * 0.12
    # Hill shape: the face leans back toward the top and edges.
    lean = (y / Hh) ** 1.6 * 2.6 + (abs(x) / (W / 2)) ** 3 * 2.2
    v.co = Vector((x, 2.2 + lean - n, y - 0.05))
def in_door(c):
    dx = c.x - door_x
    if abs(dx) > door_w / 2:
        return False
    top = door_h - door_w / 2
    return c.z < top or (dx * dx + (c.z - top) ** 2) < (door_w / 2) ** 2
bmesh.ops.delete(bm, geom=[f for f in bm.faces if in_door(f.calc_center_median())], context="FACES")
rock_me = bpy.data.meshes.new("rock")
bm.to_mesh(rock_me)
bm.free()
rock = link(bpy.data.objects.new("HERO_rock", rock_me))
rock.modifiers.new("thick", "SOLIDIFY").thickness = 0.5
rock.modifiers.new("smooth", "SUBSURF").levels = 1
rock.data.materials.append(noisy_mat("M_rock", (0.5, 0.35, 0.22), bump=1.0, scale=3.5))
for p in rock.data.polygons:
    p.use_smooth = True

# Inside the tomb: a dark chamber with a glowing back wall (light of the resurrection).
# Open-fronted chamber: a box with its front face removed and normals pointing inward.
cbm = bmesh.new()
bmesh.ops.create_cube(cbm, size=1)
bmesh.ops.scale(cbm, vec=(3.2, 3.6, 3.4), verts=cbm.verts)
bmesh.ops.translate(cbm, vec=(door_x, 4.4, 1.6), verts=cbm.verts)
cbm.normal_update()
bmesh.ops.delete(cbm, geom=[f for f in cbm.faces if f.normal.y < -0.9], context="FACES")
bmesh.ops.reverse_faces(cbm, faces=cbm.faces[:])
cme = bpy.data.meshes.new("chamber")
cbm.to_mesh(cme)
cbm.free()
cham = link(bpy.data.objects.new("ENV_chamber", cme))
cham.data.materials.append(noisy_mat("M_chamber", (0.25, 0.17, 0.11), bump=0.6, scale=5))
bpy.ops.mesh.primitive_plane_add(size=2.6, location=(door_x, 6.1, 1.4), rotation=(math.radians(90), 0, 0))
glow = bpy.context.active_object
glow.name = "FX_glow"
gm = mat("M_glow", (1, 0.9, 0.7), emit=(1, 0.88, 0.62), strength=0)
glow.data.materials.append(gm)
inner = light("LGT_tomb", "POINT", (door_x, 3.0, 1.2), energy=0, color=(1, 0.82, 0.55), size=0.8)

# The stone: a thick disc that rolls from across the doorway to the right.
bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=1.45, depth=0.55, rotation=(math.radians(90), 0, 0))
stone = bpy.context.active_object
stone.name = "HERO_stone"
stone.modifiers.new("bev", "BEVEL").width = 0.14
d = stone.modifiers.new("detail", "DISPLACE")
tex = bpy.data.textures.new("T_stone", "CLOUDS")
tex.noise_scale = 0.35
d.texture = tex
d.strength = 0.08
stone.modifiers.new("smooth", "SUBSURF").levels = 2
stone.data.materials.append(noisy_mat("M_stone", (0.55, 0.43, 0.32), bump=1.3, scale=6))
for p in stone.data.polygons:
    p.use_smooth = True
x0, x1 = door_x, door_x + 3.3
roll0, roll1 = 0.35, 2.7
key_transform(stone, [
    (0, (x0, 1.85, 1.45), (90, 0, 0), None),
    (roll0, (x0, 1.85, 1.45), (90, 0, 0), None),
    # Rolling: travel distance / radius radians about the disc axis.
    (roll1, (x1, 1.75, 1.45), (90, -math.degrees((x1 - x0) / 1.45), 0), None),
])

# Light floods out as the doorway opens.
key_value(emission_input(gm), [(0, 0), (roll0 + 0.3, 2), (roll1, 26), (LEN, 30)])
key_light(inner, [(0, 0), (roll0 + 0.2, 150), (roll1, 2600), (LEN, 3000)])

# Sun key and a cool fill.
light("LGT_sun", "SUN", (0, 0, 10), (math.radians(74), 0, math.radians(150)), energy=6.0, color=(1, 0.68, 0.42))
light("LGT_fill", "SUN", (0, 0, 10), (math.radians(50), 0, math.radians(-25)), energy=0.5, color=(0.55, 0.62, 1))

# Scattered pebbles for scale.
for i in range(26):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=random.uniform(0.05, 0.22),
                                          location=(random.uniform(-4, 4), random.uniform(-2, 1.8), 0.02))
    pb = bpy.context.active_object
    pb.scale.z = 0.6
    pb.data.materials.append(bpy.data.materials["M_stone"])

cam = camera("CAM_main", (0.6, -9.5, 1.5), (87, 0, 2), lens=30)
key_transform(cam, [(0, (0.6, -9.5, 1.5), (87, 0, 2), None), (LEN, (0.1, -7.6, 1.35), (88.5, 0, 0), None)])

finish("tomb", [0.2, 1.5, 3.5])
