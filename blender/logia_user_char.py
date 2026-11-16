"""Ken's Logia character script, completed with the missing setup (imports, scene reset, materials) and a render step.
Run: blender -b --factory-startup -P blender/logia_user_char.py
"""
import math
import os

import bpy
from mathutils import Vector

# ---------- setup that the script assumes ----------
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)


def material(name, color, rough=0.5, metal=0.0, sss=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if sss:
        b.inputs["Subsurface Weight"].default_value = sss
        b.inputs["Subsurface Radius"].default_value = (1.0, 0.45, 0.25)
    return m


skin = material("Skin", (0.62, 0.30, 0.13), rough=0.55, sss=0.15)
skin_hi = material("Skin highlight", (0.70, 0.36, 0.17), rough=0.5, sss=0.15)
hair = material("Hair", (0.012, 0.009, 0.008), rough=0.45)
hair_hi = material("Hair highlight", (0.04, 0.03, 0.026), rough=0.35)
white = material("Eye white", (0.9, 0.88, 0.85), rough=0.2)
iris = material("Iris", (0.06, 0.035, 0.02), rough=0.2)
black = material("Pupil", (0.005, 0.005, 0.005), rough=0.1)
mouthmat = material("Mouth inside", (0.12, 0.02, 0.02), rough=0.6)
tooth = material("Teeth", (0.92, 0.9, 0.85), rough=0.3)
tongue = material("Tongue", (0.7, 0.22, 0.24), rough=0.4)
beard = material("Beard", (0.015, 0.01, 0.008), rough=0.7)
silver = material("Glasses silver", (0.55, 0.55, 0.57), rough=0.25, metal=1.0)
jacket = material("Jacket", (0.025, 0.025, 0.03), rough=0.7)
shirt = material("T-shirt", (0.85, 0.83, 0.78), rough=0.8)
back = material("Backdrop", (0.02, 0.016, 0.035), rough=0.9)

# ---------- Ken's script (unchanged except the engine name for Blender 5.2) ----------

def ball(name, loc, scale, material, seg=32, rings=20):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, location=loc)
    o=bpy.context.object; o.name=name; o.scale=scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material)
    for p in o.data.polygons: p.use_smooth=True
    return o

def line(name, pts, radius, material, cyclic=False):
    c=bpy.data.curves.new(name,"CURVE"); c.dimensions="3D"; c.bevel_depth=radius; c.bevel_resolution=4
    s=c.splines.new("POLY"); s.points.add(len(pts)-1)
    for p,co in zip(s.points,pts): p.co=(*co,1)
    s.use_cyclic_u=cyclic
    o=bpy.data.objects.new(name,c); bpy.context.collection.objects.link(o); c.materials.append(material)
    return o

def box(name, loc, dims, material, bevel=.12):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o=bpy.context.object; o.name=name; o.dimensions=dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material)
    b=o.modifiers.new("Rounded edges","BEVEL"); b.width=bevel; b.segments=4
    o.modifiers.new("Weighted normals","WEIGHTED_NORMAL")
    return o

# Facing -Y; character centerline X=0
head=ball("HEAD - main face",(0,0,3.55),(1.02,.78,1.22),skin,48,32)
ball("Neck",(0,.02,2.35),(.43,.42,.72),skin)
for s in (-1,1):
    ball("Ear",(s*.98,-.015,3.52),(.25,.20,.36),skin)
    ball("Ear inner",(s*1.06,-.19,3.53),(.105,.035,.20),skin_hi)

# Hair cap and chunky curls
ball("Hair cap",(0,.055,4.38),(1.08,.82,.70),hair,48,32)
for i in range(11):
    x=-.83+i*.166; z=4.10+.10*math.sin(i*1.35)
    ball("Fringe curl",(x,-.60,z),(.19,.19,.25),hair_hi if i%3==0 else hair,24,16)
for row,(z,count) in enumerate([(4.58,9),(4.78,7),(4.34,10)]):
    for i in range(count):
        x=-.90+i*1.80/(count-1); y=-.15+.12*math.cos(i*1.8+row)
        ball("Top hair curl",(x,y,z+.045*math.sin(i*2+row)),(.23,.21,.20),hair_hi if (i+row)%4==0 else hair,20,12)
for s in (-1,1):
    for i in range(4):
        ball("Side hair curl",(s*.93,-.02,4.18-i*.18),(.22,.22,.22),hair,20,12)

# Eyes, brows, nose
for s in (-1,1):
    x=s*.43
    ball("Eye white",(x,-.715,3.78),(.32,.105,.235),white)
    ball("Iris",(x+.015,-.812,3.77),(.105,.045,.13),iris)
    ball("Pupil",(x+.018,-.849,3.77),(.052,.025,.075),black)
    line("Thick expressive eyebrow",[(x-.27,-.79,4.08),(x-.10,-.84,4.15),(x+.12,-.84,4.14),(x+.27,-.78,4.08)],.065,beard)
ball("Nose bridge",(0,-.77,3.52),(.16,.18,.30),skin_hi)
ball("Nose tip",(0,-.91,3.43),(.22,.16,.14),skin)
for s in (-1,1): ball("Nostril",(s*.115,-1.015,3.405),(.055,.025,.035),beard,20,12)

# Mouth parts are separate objects for simple animation
ball("MOUTH OPEN - toggle for speech",(0,-.755,3.08),(.34,.085,.18),mouthmat)
ball("Upper teeth",(0,-.835,3.16),(.255,.035,.055),tooth)
ball("Tongue",(0,-.84,3.005),(.16,.025,.045),tongue)
closed=line("MOUTH CLOSED - toggle for pauses",[
    (-.34,-.79,3.12),(-.20,-.82,3.055),(0,-.835,3.04),(.20,-.82,3.055),(.34,-.79,3.12)],.035,beard)
closed.hide_render=True; closed.hide_viewport=True
ball("Lower lip",(0,-.78,2.99),(.20,.045,.055),skin_hi)

# Moustache and beard
for s in (-1,1): ball("Moustache lobe",(s*.19,-.80,3.26),(.22,.10,.085),beard)
ball("Beard chin mass",(0,-.47,2.92),(.76,.38,.39),beard)
ball("Chin skin",(0,-.79,3.00),(.45,.075,.13),skin)
for i in range(17):
    x=-.62+i*.0775; z=2.94+.12*(abs(x)/.62)
    line("Beard texture",[(x,-.805,z),(x+.018,-.81,z+.065)],.012,hair_hi)

# Glasses frames and temples
for s in (-1,1):
    cx=s*.43
    pts=[(cx-.34,-.91,3.78),(cx-.34,-.93,3.99),(cx-.25,-.94,4.055),
         (cx+.25,-.94,4.055),(cx+.34,-.93,3.99),(cx+.34,-.91,3.78),
         (cx+.25,-.91,3.69),(cx-.25,-.91,3.69)]
    line("Glasses lens frame",pts,.025,silver,True)
    line("Glasses temple",[(cx+s*.33,-.90,3.96),(s*.98,-.45,3.98),(s*1.03,-.08,3.90)],.022,silver)
line("Glasses bridge",[(-.10,-.94,3.98),(0,-.99,4.02),(.10,-.94,3.98)],.025,silver)

# Torso and clothing
ball("Jacket torso",(0,.10,1.55),(1.18,.58,1.00),jacket,40,24)
ball("T-shirt",(0,-.43,1.72),(.48,.16,.77),shirt)
for s in (-1,1):
    c=box("Raised jacket collar",(s*.34,-.55,2.24),(.36,.18,.58),jacket,.08)
    c.rotation_euler[1]=s*math.radians(13)
    ball("Shoulder",(s*.91,.02,1.90),(.48,.55,.48),jacket)
    arm=ball("Upper arm",(s*1.05,-.02,1.35),(.28,.32,.72),jacket)
    arm.rotation_euler[1]=s*math.radians(-10)

# Backdrop
box("Backdrop",(0,2.0,2.45),(200,.2,200),back,0)

# Camera and lighting
bpy.ops.object.camera_add(location=(0,-10.8,3.25))
cam=bpy.context.object; cam.name="Camera - Logia portrait"
target=Vector((0,-.05,2.65))
cam.rotation_euler=(target-cam.location).to_track_quat("-Z","Y").to_euler()
cam.data.type="ORTHO"; cam.data.ortho_scale=6.3; bpy.context.scene.camera=cam

def area(name,loc,power,size,color):
    bpy.ops.object.light_add(type="AREA",location=loc)
    l=bpy.context.object; l.name=name; l.data.energy=power; l.data.shape="DISK"; l.data.size=size; l.data.color=color
    l.rotation_euler=(Vector((0,0,3))-l.location).to_track_quat("-Z","Y").to_euler()
area("Key warm softbox",(-4,-6,7),850,5,(1,.78,.58))
area("Fill neutral",(4,-4,4),500,4,(.72,.82,1))
area("Hair rim",(1,2,6),950,3,(1,.55,.28))

scene=bpy.context.scene
scene.render.engine="BLENDER_EEVEE"  # Blender 5.x: EEVEE Next is now just "BLENDER_EEVEE"
scene.render.resolution_x=1080; scene.render.resolution_y=1080; scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.view_settings.view_transform="AgX"
bpy.ops.object.select_all(action="DESELECT")
head.select_set(True); bpy.context.view_layer.objects.active=head

print("LOGIA created. Edit separate objects in the Outliner.")

# ---------- render and save ----------
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(root, "blender", "logia_user_char.blend"))
scene.eevee.taa_render_samples = 32
scene.render.filepath = os.path.join(root, "out", "stills", "logia-user-char.png")
bpy.ops.render.render(write_still=True)
print("RENDERED", scene.render.filepath)
