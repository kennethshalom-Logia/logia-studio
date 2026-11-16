"""Turnaround test of the 3D cast."""
import math, os, sys
import bpy
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *  # noqa
import hero3d as H

sc = new_scene("TEST_hero", 1)
sc.view_settings.view_transform = "AgX"
world((0.05, 0.05, 0.08), 1.0)
bpy.ops.mesh.primitive_plane_add(size=30)
bpy.context.active_object.data.materials.append(mat("M_floor", (0.08, 0.08, 0.1), rough=0.6))
ken = H.build("ken", "ken", loc=(0, 0, 0), phone=False)
H.act(ken, [(0, "open")]); H.feel(ken, [(0, "happy")])
k2 = H.build("ken2", "ken", loc=(-1.0, 0.6, 0), rot_z=math.radians(-35), seed=2)
H.act(k2, [(0, "kneel")]); H.feel(k2, [(0, "sad")])
k3 = H.build("ken3", "ken", loc=(1.0, 0.6, 0), rot_z=math.radians(30), seed=3, phone=True)
H.act(k3, [(0, "phone")]); H.feel(k3, [(0, "serious")])
for i, lk in enumerate(["friend", "preacher", "elijah"]):
    c = H.build("c" + lk, lk, loc=(-1.2 + i * 1.2, 2.2, 0), seed=10 + i)
    H.act(c, [(0, "idle")])
light("LGT_key", "SUN", (0, 0, 5), (math.radians(50), 0, math.radians(30)), energy=3.0, color=(1, 0.95, 0.9))
light("LGT_fill", "POINT", (-2, -2, 2), energy=150, color=(0.6, 0.7, 1))
light("LGT_rim", "POINT", (1.5, 2.5, 2.5), energy=250, color=(1, 0.8, 0.6))
camera("CAM_main", (0, -3.0, 1.6), (86, 0, 0), lens=40)
sc.render.resolution_percentage = 50
render_still("herotest", 0)
