"""LOGIA MASTER portrait. Ken's updated script (eyes onward, kept as written) with the missing opening reconstructed:
imports, materials (MAT), helpers (uv, curve, bevel_box) and the head, ears, neck and hair the rest refers to.
Run: blender -b --factory-startup -P blender/logia_master.py
"""
import math
import os

import bpy
from mathutils import Vector

# =========================== RECONSTRUCTED OPENING ===========================
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)


def _mat(name, color, rough=0.5, metal=0.0, sss=0.0, emit=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if sss:
        b.inputs["Subsurface Weight"].default_value = sss
        b.inputs["Subsurface Radius"].default_value = (1.0, 0.45, 0.25)
    if emit:
        b.inputs["Emission Color"].default_value = (*color, 1)
        b.inputs["Emission Strength"].default_value = emit
    return m


MAT = {
    "skin": _mat("Skin", (0.60, 0.29, 0.13), 0.5, sss=0.2),
    "skin_hi": _mat("Skin highlight", (0.66, 0.33, 0.15), 0.48, sss=0.2),
    "skin_shadow": _mat("Skin shadow", (0.38, 0.16, 0.07), 0.6, sss=0.1),
    "lip": _mat("Lip", (0.5, 0.2, 0.12), 0.45, sss=0.2),
    "eye_white": _mat("Eye white", (0.92, 0.9, 0.86), 0.2),
    "iris": _mat("Iris", (0.09, 0.045, 0.02), 0.2),
    "pupil": _mat("Pupil", (0.004, 0.004, 0.004), 0.1),
    "glint": _mat("Catchlight", (1, 1, 1), 0.1, emit=3.0),
    "hair": _mat("Hair", (0.011, 0.008, 0.007), 0.42),
    "hair_hi": _mat("Hair highlight", (0.04, 0.03, 0.026), 0.32),
    "glasses": _mat("Glasses satin metal", (0.6, 0.6, 0.62), 0.28, metal=1.0),
    "mouth": _mat("Mouth cavity", (0.1, 0.015, 0.015), 0.6),
    "teeth": _mat("Teeth", (0.93, 0.91, 0.86), 0.3),
    "tongue": _mat("Tongue", (0.72, 0.24, 0.26), 0.4),
    "beard": _mat("Beard", (0.013, 0.009, 0.007), 0.75),
    "beard_hi": _mat("Beard highlight", (0.045, 0.032, 0.025), 0.6),
    "jacket": _mat("Jacket", (0.022, 0.021, 0.025), 0.75),
    "jacket_edge": _mat("Jacket edge", (0.06, 0.06, 0.065), 0.6),
    "shirt": _mat("T-shirt", (0.82, 0.79, 0.74), 0.85),
    "backdrop": _mat("Backdrop", (0.018, 0.013, 0.03), 0.9),
}


def uv(name, loc, scale, material, seg=32, rings=20):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material)
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def curve(name, pts, radius, material, cyclic=False):
    c = bpy.data.curves.new(name, "CURVE")
    c.dimensions = "3D"
    c.bevel_depth = radius
    c.bevel_resolution = 4
    s = c.splines.new("POLY")
    s.points.add(len(pts) - 1)
    for p, co in zip(s.points, pts):
        p.co = (*co, 1)
    s.use_cyclic_u = cyclic
    o = bpy.data.objects.new(name, c)
    bpy.context.collection.objects.link(o)
    c.materials.append(material)
    return o


def bevel_box(name, loc, dims, material, bevel=0.12):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.name = name
    o.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material)
    if bevel:
        b = o.modifiers.new("Rounded edges", "BEVEL")
        b.width = bevel
        b.segments = 4
    o.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
    return o


# Head: a long egg with a soft jaw, sized to the eye/glasses positions used below (face front near y = -0.62).
head = uv("HEAD - main face", (0, 0, 3.55), (0.86, 0.64, 1.16), MAT["skin"], 64, 40)
uv("Jaw and chin", (0, -0.08, 3.05), (0.66, 0.5, 0.42), MAT["skin"], 48, 28)
uv("Cheek L", (0.42, -0.38, 3.32), (0.3, 0.22, 0.26), MAT["skin"])
uv("Cheek R", (-0.42, -0.38, 3.32), (0.3, 0.22, 0.26), MAT["skin"])
uv("Neck", (0, 0.04, 2.3), (0.38, 0.36, 0.7), MAT["skin"])
for side in (-1, 1):
    uv("Ear", (side * 0.84, 0.0, 3.5), (0.17, 0.12, 0.3), MAT["skin"])
    uv("Ear inner", (side * 0.9, -0.08, 3.5), (0.08, 0.04, 0.18), MAT["skin_shadow"])

# Hair: a full crown of loose curls, taller on top and shorter at the sides, like the reference.
uv("Hair cap", (0, 0.06, 4.28), (0.92, 0.72, 0.62), MAT["hair"], 48, 32)
import random
rnd = random.Random(3)
for i in range(70):
    a = rnd.uniform(0, 2 * math.pi)
    up = rnd.uniform(0.15, 1.0)
    x = math.cos(a) * math.cos(up * 1.2) * 0.86
    y = math.sin(a) * math.cos(up * 1.2) * 0.66 + 0.06
    z = 4.18 + math.sin(up * 1.4) * 0.58
    if y < -0.48 and z < 4.32:
        continue
    r = rnd.uniform(0.17, 0.25)
    curl = uv("Hair curl", (x, y, z), (r, r * 0.92, r * 0.85), MAT["hair_hi"] if i % 4 == 0 else MAT["hair"], 20, 12)
    curl.rotation_euler = (rnd.uniform(0, 3), rnd.uniform(0, 3), rnd.uniform(0, 3))
for i in range(9):
    x = -0.62 + i * 0.155
    curl = uv("Fringe curl", (x, -0.5, 4.12 + 0.06 * math.sin(i * 1.7)), (0.16, 0.15, 0.2), MAT["hair_hi"] if i % 3 == 0 else MAT["hair"], 20, 12)
for side in (-1, 1):
    for i in range(3):
        uv("Side hair (short)", (side * 0.8, 0.02, 4.02 - i * 0.14), (0.14, 0.2, 0.14), MAT["hair"], 20, 12)

# =========================== KEN'S SCRIPT (as sent, from the eyes onward) ===========================
for side in (-1,1):
    x=side*.345
    uv("Eye socket soft volume",(x,-.555,3.82),(.315,.115,.225),MAT["skin_hi"])
    uv("Eye white",(x,-.642,3.82),(.275,.105,.175),MAT["eye_white"])
    uv("Iris",(x+.012,-.735,3.805),(.091,.044,.112),MAT["iris"])
    uv("Pupil",(x+.015,-.770,3.805),(.046,.022,.069),MAT["pupil"])
    uv("Eye catchlight",(x-.014,-.791,3.842),(.018,.012,.021),MAT["glint"],20,12)
    curve("Upper eyelid",[(x-.27,-.68,3.85),(x-.13,-.70,3.97),
                           (x+.10,-.70,3.97),(x+.27,-.68,3.85)],.022,MAT["skin_shadow"])
    curve("Thick expressive eyebrow",[(x-.26,-.64,4.08),(x-.12,-.70,4.15),
                                      (x+.08,-.70,4.14),(x+.25,-.63,4.07)],
          .055,MAT["hair"])

# Nose bridge, rounded tip and nostrils.
uv("Nose bridge",(0,-.63,3.58),(.125,.15,.245),MAT["skin_hi"])
uv("Nose tip",(0,-.755,3.47),(.18,.14,.12),MAT["skin"])
for side in (-1,1):
    uv("Nostril",(side*.09,-.86,3.445),(.032,.018,.022),MAT["skin_shadow"],20,12)

# --------------------------- GLASSES -------------------------------
for side in (-1,1):
    cx=side*.345
    pts=[(cx-.285,-.755,3.75),(cx-.285,-.77,3.94),
         (cx-.23,-.77,4.005),(cx+.23,-.77,4.005),
         (cx+.285,-.77,3.94),(cx+.285,-.755,3.75),
         (cx+.23,-.755,3.685),(cx-.23,-.755,3.685)]
    curve("Glasses | silver rectangular rim",pts,.018,MAT["glasses"],True)
    curve("Glasses | side arm",[(cx+side*.28,-.73,3.94),
          (side*.78,-.42,3.95),(side*.95,-.08,3.86)],.018,MAT["glasses"])
curve("Glasses | bridge",[(-.07,-.79,3.965),(0,-.82,3.985),(.07,-.79,3.965)],.022,MAT["glasses"])

# --------------------------- MOUTH / EXPRESSION ---------------------
uv("MOUTH | open cavity",(0,-.625,3.105),(.30,.075,.145),MAT["mouth"])
uv("MOUTH | upper teeth",(0,-.694,3.16),(.235,.025,.045),MAT["teeth"])
uv("MOUTH | tongue",(0,-.695,3.045),(.135,.024,.034),MAT["tongue"])
curve("Smile contour",[(-.30,-.64,3.16),(-.20,-.69,3.08),(0,-.71,3.06),
                       (.20,-.69,3.08),(.30,-.64,3.16)],.023,MAT["beard"])
uv("Lower lip",(0,-.64,2.985),(.17,.035,.04),MAT["lip"])

# --------------------------- MOUSTACHE + BEARD ----------------------
for side in (-1,1):
    uv("Beard sideburn",(side*.70,-.39,3.39),(.105,.11,.31),MAT["beard"])
    curve("Moustache lobe",[(side*.025,-.69,3.28),(side*.12,-.735,3.31),
                             (side*.24,-.70,3.27),(side*.32,-.64,3.24)],
          .047,MAT["beard"])
for side in (-1,1):
    for i in range(25):
        t=i/24
        x=side*(.28+.43*t)
        z=3.22-.24*t
        y=-.63+.09*t
        curve("Beard cheek strand",[(x,y,z),(x-side*.018,y-.012,z-.07)],
              .0075,MAT["beard_hi"] if i%5==0 else MAT["beard"])
for i in range(25):
    x=-.40+i*(.80/24)
    z=2.88+.10*(abs(x)/.40)
    curve("Beard chin strand",[(x,-.55,z),(x+.012,-.60,z+.055)],
          .008,MAT["beard_hi"] if i%6==0 else MAT["beard"])

# --------------------------- CLOTHING -------------------------------
uv("Jacket torso",(0,.13,1.48),(1.02,.55,.94),MAT["jacket"])
uv("T-shirt front",(0,-.38,1.65),(.42,.105,.70),MAT["shirt"])
uv("Crew neck rib",(0,-.42,2.18),(.39,.09,.13),MAT["shirt"])
for side in (-1,1):
    collar=bevel_box("Raised jacket collar",(side*.30,-.48,2.22),(.32,.17,.48),MAT["jacket"],.09)
    collar.rotation_euler[1]=side*math.radians(12)
    uv("Jacket shoulder",(side*.82,.02,1.82),(.43,.48,.43),MAT["jacket"])
    sleeve=uv("Jacket sleeve",(side*.98,.02,1.25),(.27,.33,.62),MAT["jacket"])
    sleeve.rotation_euler[1]=side*math.radians(-8)
curve("Jacket centre seam",[(0,-.49,2.02),(0,-.49,1.55),(0,-.46,.93)],.012,MAT["jacket_edge"])

# --------------------------- BACKDROP / CAMERA / LIGHTS -------------
bevel_box("Studio backdrop",(0,2.4,2.5),(200,.15,200),MAT["backdrop"],0)
bpy.ops.object.camera_add(location=(0,-10.8,3.32))
camera=bpy.context.object
camera.name="CAMERA | Logia master portrait"
target=Vector((0,-.02,2.78))
camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO'
camera.data.ortho_scale=5.75
bpy.context.scene.camera=camera

def area_light(name, location, energy, size, color):
    bpy.ops.object.light_add(type='AREA', location=location)
    l=bpy.context.object
    l.name=name
    l.data.energy=energy
    l.data.shape='DISK'
    l.data.size=size
    l.data.color=color
    l.rotation_euler=(Vector((0,0,3.1))-l.location).to_track_quat('-Z','Y').to_euler()

area_light("KEY | warm large softbox",(-4,-5,7),950,4.5,(1.0,.78,.60))
area_light("FILL | cool softbox",(4,-4,4),550,4.0,(.72,.82,1.0))
area_light("RIM | warm hair separation",(1,2,6),1150,3.0,(1.0,.56,.34))

scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE'  # Blender 5.2 renamed EEVEE Next to BLENDER_EEVEE
scene.render.resolution_x=1200
scene.render.resolution_y=1200
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.image_settings.color_mode='RGBA'
scene.view_settings.view_transform='AgX'
scene.render.film_transparent=False

bpy.ops.object.select_all(action='DESELECT')
head.select_set(True)
bpy.context.view_layer.objects.active=head

print("LOGIA MASTER generated.")

# =========================== SAVE + RENDER ===========================
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(root, "blender", "logia_master.blend"))
scene.eevee.taa_render_samples = 32
scene.render.filepath = os.path.join(root, "out", "stills", "logia-master.png")
bpy.ops.render.render(write_still=True)
print("RENDERED", scene.render.filepath)
