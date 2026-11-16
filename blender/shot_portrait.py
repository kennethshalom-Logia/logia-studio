"""Portrait test of the main character against the reference."""
import math, os, sys
import bpy
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *  # noqa
import hero3d as H

sc = new_scene("TEST_portrait", 1)
sc.view_settings.view_transform = "Standard"
sc.view_settings.look = "None"
world((0.02, 0.018, 0.03), 1.0)
ken = H.build("ken", "ken", loc=(0, 0, 0), rot_z=math.radians(-14))
H.act(ken, [(0, dict(H.POSES["idle"], head=(4, -6, 0)))])
H.feel(ken, [(0, "calm")])
ken["mouth"].scale = (1, 1, 1.0)
k = light("LGT_key", "SUN", (0, 0, 5), (math.radians(55), 0, math.radians(-35)), energy=3.0)
k.data.angle = 0.0
k.data.use_shadow = False
try:
    k.data.shadow_maximum_resolution = 0.0004
except Exception as e:
    print("NORES", e)
bpy.context.scene.eevee.shadow_resolution_scale = 1.0 if hasattr(bpy.context.scene.eevee, "shadow_resolution_scale") else None
light("LGT_fill", "POINT", (-1.5, -1.5, 2), energy=60, size=0.0)
camera("CAM_main", (0.15, -1.35, 1.72), (90, 0, 4), lens=50)
sc.render.resolution_x = 1080
sc.render.resolution_y = 1080
sc.render.resolution_percentage = 100
render_still("portrait", 0)
